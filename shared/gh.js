/** True when a gh API error is specifically GitHub's "missing admin:public_key scope" 404. */
function isMissingPublicKeyScopeError(message) {
  return /admin:public_key/i.test(message);
}

/** Builds the non-interactive `gh` wrappers using the caller's own process-runner. Interactive
 * flows (`gh auth login`, `gh auth refresh`) need a real TTY/terminal and stay package-specific. */
function createGhLib(run) {
  async function getGhProfile() {
    const result = await run('gh', ['api', 'user', '--jq', '{login,name,email}']);
    if (!result.ok) {
      throw new Error(`Couldn't read your GitHub profile: ${result.stderr}`);
    }
    return JSON.parse(result.stdout);
  }

  /** Public keys currently attached to the authenticated GitHub account, as raw "type base64" strings. */
  async function listRemoteSshKeys() {
    const result = await run('gh', ['api', 'user/keys', '--jq', '.[].key']);
    if (!result.ok) {
      throw new Error(`Couldn't check which SSH keys are already on your GitHub account: ${result.stderr}`);
    }
    if (!result.stdout) return [];
    return result.stdout.split('\n').filter(Boolean);
  }

  async function addSshKeyToGithub(pubKeyPath, title) {
    const result = await run('gh', ['ssh-key', 'add', pubKeyPath, '--title', title]);
    if (!result.ok) {
      throw new Error(`Couldn't upload the SSH key to GitHub: ${result.stderr}`);
    }
  }

  async function switchGhAccount(username, hostname = 'github.com') {
    const result = await run('gh', ['auth', 'switch', '--hostname', hostname, '--user', username]);
    if (!result.ok) {
      throw new Error(`Couldn't switch the gh CLI to "${username}": ${result.stderr}`);
    }
  }

  async function getActiveGhAccount(hostname = 'github.com') {
    const result = await run('gh', ['auth', 'status', '--hostname', hostname]);
    const text = `${result.stdout}\n${result.stderr}`;
    const match = text.match(/Logged in to [^\s]+ account (\S+)/);
    return match ? match[1] : null;
  }

  return { getGhProfile, listRemoteSshKeys, addSshKeyToGithub, switchGhAccount, getActiveGhAccount };
}

module.exports = { isMissingPublicKeyScopeError, createGhLib };
