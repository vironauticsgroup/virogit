const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('./lib/store');
const gitlib = require('./lib/git');
const switcher = require('./lib/switcher');
const addWeb = require('./lib/addWeb');
const { VirogitSidebarProvider } = require('./sidebarProvider');

/** @type {vscode.StatusBarItem} */
let statusBarItem;

function updateStatusBar() {
  const active = store.getActiveProfileName();
  const profile = active ? store.getProfileByName(active) : undefined;

  if (profile) {
    statusBarItem.text = `$(account) ${profile.name}`;
    statusBarItem.tooltip = new vscode.MarkdownString(
      `**Commits as:** ${profile.gitName} <${profile.gitEmail}>\n\n` +
        `**SSH key:** ${profile.sshKeyPath}\n\n` +
        `**gh account:** ${profile.githubUsername}\n\n` +
        `Click to switch profile.`
    );
  } else {
    statusBarItem.text = '$(account) No virogit profile';
    statusBarItem.tooltip = 'Click to pick or create a GitHub account profile';
  }
  statusBarItem.show();
}

// ---- command-palette flows (status bar click reuses switchProfileFlow) ----

async function pickSshKeyPath() {
  const choice = await vscode.window.showQuickPick(
    [
      { label: '$(folder-opened) Browse for SSH private key file...', action: 'browse' },
      { label: '$(edit) Enter path manually', action: 'manual' },
    ],
    { placeHolder: 'SSH private key for this profile (not the .pub file) — required' }
  );
  if (!choice) return undefined;

  if (choice.action === 'browse') {
    const sshDir = path.join(os.homedir(), '.ssh');
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      defaultUri: vscode.Uri.file(fs.existsSync(sshDir) ? sshDir : os.homedir()),
      openLabel: 'Select private key',
      title: 'Select SSH private key (the file WITHOUT the .pub extension)',
    });
    return uris && uris[0] ? uris[0].fsPath : undefined;
  }

  return vscode.window.showInputBox({
    prompt: 'Path to the SSH private key (e.g. ~/.ssh/id_ed25519_work)',
    placeHolder: '~/.ssh/id_ed25519_work',
    validateInput: (v) =>
      fs.existsSync(gitlib.expandHome(v.trim())) ? undefined : `Can't find a file at "${v}"`,
  });
}

async function addProfileFlow() {
  const existingNames = new Set(store.listProfiles().map((p) => p.name));

  const name = await vscode.window.showInputBox({
    prompt: 'What should this profile be called? (e.g. "work", "personal")',
    placeHolder: 'work',
    validateInput: (v) => (v.trim() ? undefined : 'Please enter a name.'),
  });
  if (!name) return;

  if (existingNames.has(name.trim())) {
    const overwrite = await vscode.window.showWarningMessage(
      `A profile named "${name}" already exists. Overwrite it?`,
      { modal: true },
      'Overwrite'
    );
    if (overwrite !== 'Overwrite') return;
  }

  const gitName = await vscode.window.showInputBox({
    prompt: `Name to show on commits for "${name}"`,
    placeHolder: 'Jane Doe',
    validateInput: (v) => (v.trim() ? undefined : 'Please enter a name.'),
  });
  if (!gitName) return;

  const gitEmail = await vscode.window.showInputBox({
    prompt: `Email to show on commits for "${name}"`,
    placeHolder: 'jane@company.com',
    validateInput: (v) => (/\S+@\S+\.\S+/.test(v) ? undefined : 'Enter a valid email address.'),
  });
  if (!gitEmail) return;

  const sshKeyPath = await pickSshKeyPath();
  if (!sshKeyPath) return;

  const githubUsername = await vscode.window.showInputBox({
    prompt: `GitHub username for "${name}" (lets the virogit CLI's "switch" also switch the gh CLI)`,
    placeHolder: 'octocat',
    validateInput: (v) => (v.trim() ? undefined : 'Please enter a username.'),
  });
  if (!githubUsername) return;

  const profile = {
    name: name.trim(),
    gitName: gitName.trim(),
    gitEmail: gitEmail.trim(),
    sshKeyPath: sshKeyPath.trim(),
    githubUsername: githubUsername.trim(),
  };
  store.upsertProfile(profile);

  const switchNow = await vscode.window.showInformationMessage(`Profile "${name}" saved.`, 'Switch to it now');
  if (switchNow) {
    await switcher.applyProfile(profile);
  }
}

async function addProfileViaWebFlow() {
  try {
    await addWeb.addProfileViaWeb();
  } catch (error) {
    vscode.window.showErrorMessage(`virogit: ${error.message || error}`);
  }
}

/** Entry point for "Add a profile": offers browser sign-in first, manual entry as a fallback. */
async function addProfileEntryFlow() {
  const choice = await vscode.window.showQuickPick(
    [
      {
        label: '$(github) Sign in with GitHub (recommended)',
        description: "Opens your browser; finds or creates the account's SSH key for you",
        action: 'web',
      },
      { label: '$(edit) Enter details manually', action: 'manual' },
    ],
    { placeHolder: 'How do you want to add this profile?' }
  );
  if (!choice) return;

  if (choice.action === 'web') {
    await addProfileViaWebFlow();
  } else {
    await addProfileFlow();
  }
}

async function switchProfileFlow() {
  const profiles = store.listProfiles();
  if (profiles.length === 0) {
    const create = await vscode.window.showInformationMessage('No profiles saved yet.', 'Add a profile');
    if (create) await addProfileEntryFlow();
    return;
  }

  const activeName = store.getActiveProfileName();
  const items = profiles.map((p) => ({
    label: `${p.name === activeName ? '$(check) ' : ''}${p.name}`,
    description: `${p.gitName} <${p.gitEmail}>`,
    detail: `SSH key: ${p.sshKeyPath}`,
    profile: p,
  }));
  items.push({ label: '$(add) Add new profile...', profile: null });

  const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Switch to which profile?' });
  if (!picked) return;

  if (!picked.profile) {
    await addProfileEntryFlow();
    return;
  }

  await switcher.applyProfile(picked.profile);
}

async function removeProfileFlow() {
  const profiles = store.listProfiles();
  if (profiles.length === 0) {
    vscode.window.showInformationMessage('No profiles saved yet.');
    return;
  }

  const items = profiles.map((p) => ({
    label: p.name,
    description: `${p.gitName} <${p.gitEmail}>`,
    profile: p,
  }));
  const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Remove which profile?' });
  if (!picked) return;

  const confirm = await vscode.window.showWarningMessage(
    `Remove profile "${picked.profile.name}"? This only deletes the saved record — your git config, SSH key, and GitHub account are untouched.`,
    { modal: true },
    'Remove'
  );
  if (confirm !== 'Remove') return;

  store.removeProfileByName(picked.profile.name);
  vscode.window.showInformationMessage(`Removed profile "${picked.profile.name}".`);
}

async function showCurrentFlow() {
  const activeName = store.getActiveProfileName();
  const [liveName, liveEmail] = await Promise.all([
    gitlib.getGlobalConfig('user.name'),
    gitlib.getGlobalConfig('user.email'),
  ]);

  if (!activeName) {
    vscode.window.showInformationMessage(
      [
        'No profile is active yet.',
        '',
        `Git is currently set to commit as: ${liveName || '(not set)'} <${liveEmail || '(not set)'}>`,
      ].join('\n'),
      { modal: true }
    );
    return;
  }

  const profile = store.getProfileByName(activeName);
  const lines = [
    `Active profile: ${activeName}`,
    '',
    `Git is currently set to commit as: ${liveName || '(not set)'} <${liveEmail || '(not set)'}>`,
  ];

  if (profile && (profile.gitName !== liveName || profile.gitEmail !== liveEmail)) {
    lines.push('', `Note: this doesn't match what "${activeName}" has saved (${profile.gitName} <${profile.gitEmail}>).`);
    lines.push('Something outside virogit changed your git config.');
  }

  vscode.window.showInformationMessage(lines.join('\n'), { modal: true });
}

// ---- lifecycle ----

function activate(context) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'virogit.switch';
  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(store.onChange(updateStatusBar));
  // Picks up changes made outside this extension instance — the CLI in a terminal, or another
  // VS Code window — so the status bar and sidebar don't go stale until this extension writes.
  context.subscriptions.push(store.watch(updateStatusBar));

  const sidebarProvider = new VirogitSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VirogitSidebarProvider.viewType, sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('virogit.switch', switchProfileFlow),
    vscode.commands.registerCommand('virogit.add', addProfileEntryFlow),
    vscode.commands.registerCommand('virogit.addWeb', addProfileViaWebFlow),
    vscode.commands.registerCommand('virogit.remove', removeProfileFlow),
    vscode.commands.registerCommand('virogit.current', showCurrentFlow)
  );

  updateStatusBar();
}

function deactivate() {}

module.exports = { activate, deactivate };
