const vscode = require('vscode');
const os = require('os');
const path = require('path');
const store = require('./store');
const gh = require('./gh');
const ssh = require('./ssh');
const exec = require('./exec');

/** Runs a gh API call; if it fails because the token lacks admin:public_key, grants that scope (via a terminal) and retries once. */
async function withPublicKeyScope(action) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Error && gh.isMissingPublicKeyScopeError(error.message)) {
      vscode.window.showInformationMessage(
        'GitHub needs one more permission to manage SSH keys on this account. A terminal will open — just approve it.'
      );
      await gh.refreshPublicKeyScopeInTerminal();
      return await action();
    }
    throw error;
  }
}

/**
 * Signs in via `gh auth login --web` (in a real terminal, since device-code auth needs a
 * TTY), then finds or creates the SSH key for that account, then asks for the remaining
 * profile fields. Mirrors the CLI's `virogit add <name> --web`. Returns the saved profile,
 * or null if the user cancelled partway through.
 */
async function addProfileViaWeb() {
  if (!(await exec.commandExists('gh'))) {
    throw new Error('GitHub CLI ("gh") is required for this. Install it from https://cli.github.com/, then try again.');
  }

  vscode.window.showInformationMessage(
    'A terminal will open to sign in to GitHub. If it asks to upload an SSH public key, choose "Skip" — virogit sets one up for you next.'
  );

  await gh.webLoginInTerminal();

  const ghProfile = await gh.getGhProfile();

  const remoteKeys = await withPublicKeyScope(() => gh.listRemoteSshKeys());
  const localMatches = ssh.findLocalKeysMatchingRemote(remoteKeys);

  let sshKeyPath;
  if (localMatches.length === 1) {
    sshKeyPath = localMatches[0];
    vscode.window.showInformationMessage(`Found an SSH key already linked to ${ghProfile.login}'s GitHub account — using it.`);
  } else if (localMatches.length > 1) {
    const picked = await vscode.window.showQuickPick(
      localMatches.map((p) => ({ label: p })),
      { placeHolder: `Found more than one local key linked to ${ghProfile.login}'s GitHub account. Which one should this profile use?` }
    );
    if (!picked) return null;
    sshKeyPath = picked.label;
  } else {
    const choice = await vscode.window.showInformationMessage(
      `${ghProfile.login} doesn't have a dedicated SSH key yet. Create one now and add it to that GitHub account?`,
      { modal: true },
      'Create key'
    );
    if (choice !== 'Create key') return null;

    const label = ghProfile.login;
    const keyPath = path.join(os.homedir(), '.ssh', `id_ed25519_${label}`);
    await ssh.generateSshKey(keyPath, `virogit-${label}`);
    await withPublicKeyScope(() => gh.addSshKeyToGithub(`${keyPath}.pub`, `virogit-${label}`));
    sshKeyPath = keyPath;
    vscode.window.showInformationMessage(`Created a new SSH key and added it to ${ghProfile.login}'s GitHub account.`);
  }

  const name = await vscode.window.showInputBox({
    prompt: 'What should this profile be called? (e.g. "work", "personal")',
    value: ghProfile.login,
    validateInput: (v) => (v.trim() ? undefined : 'Please enter a name.'),
  });
  if (!name) return null;

  const gitName = await vscode.window.showInputBox({
    prompt: "Name to show on your commits (from your GitHub profile — edit if you'd like)",
    value: ghProfile.name || ghProfile.login,
    validateInput: (v) => (v.trim() ? undefined : 'Please enter a name.'),
  });
  if (!gitName) return null;

  const gitEmail = await vscode.window.showInputBox({
    prompt: ghProfile.email
      ? "Email to show on your commits (from your GitHub profile — edit if you'd like)"
      : "Email to show on your commits (your GitHub email is private, so this uses GitHub's no-reply address — edit if you'd like)",
    value: ghProfile.email || `${ghProfile.login}@users.noreply.github.com`,
    validateInput: (v) => (/\S+@\S+\.\S+/.test(v) ? undefined : 'Enter a valid email address.'),
  });
  if (!gitEmail) return null;

  const profile = {
    name: name.trim(),
    gitName: gitName.trim(),
    gitEmail: gitEmail.trim(),
    sshKeyPath,
    githubUsername: ghProfile.login,
  };
  store.upsertProfile(profile);
  vscode.window.showInformationMessage(`Saved profile "${profile.name}".`);
  return profile;
}

module.exports = { addProfileViaWeb };
