const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('./lib/store');
const gitlib = require('./lib/git');
const switcher = require('./lib/switcher');
const addWeb = require('./lib/addWeb');

function getNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}

class VirogitSidebarProvider {
  static viewType = 'virogit.sidebar';

  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    store.onChange(() => this.postProfiles());
    // Picks up changes made outside this extension instance (the CLI, or another VS Code window).
    store.watch(() => this.postProfiles());
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        vscode.window.showErrorMessage(`virogit: ${error.message || error}`);
      }
    });
  }

  async handleMessage(message) {
    switch (message.type) {
      case 'ready':
        this.postProfiles();
        break;

      case 'startWebLogin': {
        try {
          const profile = await addWeb.addProfileViaWeb();
          if (this.view) this.view.webview.postMessage({ type: profile ? 'saved' : 'webLoginCancelled' });
        } catch (error) {
          vscode.window.showErrorMessage(`virogit: ${error.message || error}`);
          if (this.view) this.view.webview.postMessage({ type: 'webLoginFailed' });
        }
        break;
      }

      case 'switch': {
        const profile = store.getProfileByName(message.name);
        if (profile) await switcher.applyProfile(profile);
        break;
      }

      case 'remove': {
        const removed = store.removeProfileByName(message.name);
        if (removed) vscode.window.showInformationMessage(`Removed profile "${message.name}".`);
        break;
      }

      case 'browseSshKey': {
        const sshDir = path.join(os.homedir(), '.ssh');
        const uris = await vscode.window.showOpenDialog({
          canSelectMany: false,
          defaultUri: vscode.Uri.file(fs.existsSync(sshDir) ? sshDir : os.homedir()),
          openLabel: 'Select private key',
          title: 'Select SSH private key (the file WITHOUT the .pub extension)',
        });
        if (uris && uris[0] && this.view) {
          this.view.webview.postMessage({ type: 'sshKeyPicked', path: uris[0].fsPath });
        }
        break;
      }

      case 'save': {
        const p = message.profile;
        const errors = this.validateProfile(p);
        if (Object.keys(errors).length > 0) {
          if (this.view) this.view.webview.postMessage({ type: 'saveErrors', errors });
          return;
        }

        const name = p.name.trim();
        const originalName = message.originalName || null;
        const collidesWithOther = name !== originalName && Boolean(store.getProfileByName(name));
        if (collidesWithOther) {
          const overwrite = await vscode.window.showWarningMessage(
            `A profile named "${name}" already exists. Overwrite it?`,
            { modal: true },
            'Overwrite'
          );
          if (overwrite !== 'Overwrite') {
            if (this.view) this.view.webview.postMessage({ type: 'saveCancelled' });
            return;
          }
        }

        store.upsertProfile({
          name,
          gitName: p.gitName.trim(),
          gitEmail: p.gitEmail.trim(),
          sshKeyPath: p.sshKeyPath.trim(),
          githubUsername: p.githubUsername.trim(),
        });
        if (this.view) this.view.webview.postMessage({ type: 'saved' });
        break;
      }
    }
  }

  validateProfile(p) {
    const errors = {};
    if (!p.name || !p.name.trim()) errors.name = 'Please enter a name.';
    if (!p.gitName || !p.gitName.trim()) errors.gitName = 'Please enter a name.';
    if (!p.gitEmail || !/\S+@\S+\.\S+/.test(p.gitEmail)) errors.gitEmail = "That doesn't look like a valid email.";
    if (!p.sshKeyPath || !fs.existsSync(gitlib.expandHome(p.sshKeyPath.trim()))) {
      errors.sshKeyPath = "Can't find a file at that path.";
    }
    if (!p.githubUsername || !p.githubUsername.trim()) errors.githubUsername = 'Please enter a username.';
    return errors;
  }

  postProfiles() {
    if (!this.view) return;
    this.view.webview.postMessage({
      type: 'profiles',
      profiles: store.listProfiles(),
      active: store.getActiveProfileName(),
    });
  }

  getHtml(webview) {
    const nonce = getNonce();
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css'));
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js'));
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="stylesheet" href="${cssUri}">
<title>virogit</title>
</head>
<body>
<div id="app">
  <div class="header">
    <h1>Profiles</h1>
    <button id="addBtn" class="icon-btn" aria-label="Add profile"></button>
  </div>

  <div id="empty">
    <div class="empty-icon"></div>
    <div>No profiles yet</div>
    <button id="emptyAddBtn" class="primary">Add your first profile</button>
  </div>

  <div id="list"></div>

  <div id="form">
    <h2 id="formTitle">Add profile</h2>

    <button id="webLoginBtn" class="primary">Sign in with GitHub</button>
    <div class="or-divider" id="orDivider">or enter details manually</div>

    <div class="field">
      <label for="f-name">Profile name</label>
      <input id="f-name" type="text" placeholder="work">
      <div class="error" id="e-name"></div>
    </div>

    <div class="field">
      <label for="f-gitName">Name to show on commits</label>
      <input id="f-gitName" type="text" placeholder="Jane Doe">
      <div class="error" id="e-gitName"></div>
    </div>

    <div class="field">
      <label for="f-gitEmail">Email to show on commits</label>
      <input id="f-gitEmail" type="text" placeholder="jane@company.com">
      <div class="error" id="e-gitEmail"></div>
    </div>

    <div class="field">
      <label for="f-sshKeyPath">SSH private key (not the .pub file)</label>
      <div class="field-row">
        <input id="f-sshKeyPath" type="text" placeholder="~/.ssh/id_ed25519_work">
        <button id="browseBtn" class="ghost">Browse…</button>
      </div>
      <div class="error" id="e-sshKeyPath"></div>
    </div>

    <div class="field">
      <label for="f-githubUsername">GitHub username</label>
      <input id="f-githubUsername" type="text" placeholder="octocat">
      <div class="error" id="e-githubUsername"></div>
    </div>

    <div class="form-actions">
      <button id="saveBtn" class="primary">Save</button>
      <button id="cancelBtn" class="ghost">Cancel</button>
    </div>
  </div>
</div>
<script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }
}

module.exports = { VirogitSidebarProvider };
