const vscode = require('vscode');
const { run } = require('./exec');
const { createGhLib, isMissingPublicKeyScopeError } = require('./core');

const { getGhProfile, listRemoteSshKeys, addSshKeyToGithub, switchGhAccount, getActiveGhAccount } = createGhLib(run);

/**
 * Runs a gh command as a real, visible VS Code terminal (device-code auth needs a TTY the
 * user can see and interact with — same reason the CLI runs `gh auth login` with stdio
 * inherited into the user's own terminal instead of trying to capture it).
 *
 * Resolves whenever the terminal closes, regardless of its reported exit code:
 * `Terminal.exitStatus.code` is frequently `undefined` even on a clean exit (a known VS Code
 * limitation, more pronounced on Windows/ConPTY), so treating a missing code as failure would
 * misreport a successful sign-in as "closed before finishing." The real success/failure signal
 * is the gh API call each caller makes right after (getGhProfile, or the retried scope-gated
 * action after a refresh), which already produces a clear, specific error if it didn't work.
 */
function runInTerminal(name, shellPath, shellArgs) {
  return new Promise((resolve) => {
    const terminal = vscode.window.createTerminal({ name, shellPath, shellArgs });
    terminal.show();

    const disposable = vscode.window.onDidCloseTerminal((closed) => {
      if (closed !== terminal) return;
      disposable.dispose();
      resolve();
    });
  });
}

async function webLoginInTerminal(hostname = 'github.com') {
  await runInTerminal('virogit: GitHub sign-in', 'gh', [
    'auth',
    'login',
    '--hostname',
    hostname,
    '--git-protocol',
    'ssh',
    '--web',
    '--scopes',
    'admin:public_key',
  ]);
}

async function refreshPublicKeyScopeInTerminal(hostname = 'github.com') {
  await runInTerminal('virogit: grant SSH key permission', 'gh', [
    'auth',
    'refresh',
    '-h',
    hostname,
    '-s',
    'admin:public_key',
  ]);
}

module.exports = {
  webLoginInTerminal,
  refreshPublicKeyScopeInTerminal,
  isMissingPublicKeyScopeError,
  getGhProfile,
  listRemoteSshKeys,
  addSshKeyToGithub,
  switchGhAccount,
  getActiveGhAccount,
};
