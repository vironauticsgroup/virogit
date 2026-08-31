const vscode = require('vscode');
const store = require('./store');
const gitlib = require('./git');
const gh = require('./gh');

/** Sets commit identity, loads the SSH key, and switches the gh CLI account — mirroring the CLI's `virogit switch`. */
async function applyProfile(profile) {
  const warnings = [];

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Switching to "${profile.name}"...` },
    async () => {
      await gitlib.setGlobalConfig('user.name', profile.gitName);
      await gitlib.setGlobalConfig('user.email', profile.gitEmail);

      try {
        await gitlib.loadSshKeyIntoAgent(profile.sshKeyPath);
      } catch (error) {
        warnings.push(`SSH key: ${error.message}`);
      }

      try {
        await gh.switchGhAccount(profile.githubUsername);
      } catch (error) {
        warnings.push(`gh CLI account: ${error.message}`);
      }

      store.setActiveProfileName(profile.name);
    }
  );

  if (warnings.length > 0) {
    vscode.window.showWarningMessage(
      `Switched commit identity to "${profile.name}" (${profile.gitName} <${profile.gitEmail}>), but: ${warnings.join('; ')}`
    );
  } else {
    vscode.window.showInformationMessage(
      `Switched to "${profile.name}" — ${profile.gitName} <${profile.gitEmail}>, SSH key loaded, gh CLI account switched.`
    );
  }
}

module.exports = { applyProfile };
