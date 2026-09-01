/** Builds `git config --global` get/set using the caller's own process-runner. */
function createGitLib(run) {
  async function getGlobalConfig(key) {
    const result = await run('git', ['config', '--global', key]);
    return result.ok ? result.stdout : null;
  }

  async function setGlobalConfig(key, value) {
    const result = await run('git', ['config', '--global', key, value]);
    if (!result.ok) {
      throw new Error(`Couldn't set git config "${key}": ${result.stderr}`);
    }
  }

  /**
   * Clears whatever git's HTTPS credential helper (Windows Credential Manager, macOS Keychain,
   * libsecret, gh, ...) has cached for this host, by sending it a `git credential reject`. Without
   * this, switching profiles doesn't change anything for HTTPS remotes: the helper is keyed by
   * host only (not by account), so it silently keeps authenticating as whichever account was
   * cached last, causing pushes to fail with a 403 for the wrong user even though virogit says
   * the switch succeeded. After this runs, the next HTTPS push/pull to the host prompts a fresh
   * sign-in instead of reusing the stale credential.
   */
  async function clearCachedCredential(host = 'github.com', protocol = 'https') {
    const input = `protocol=${protocol}\nhost=${host}\n\n`;
    const result = await run('git', ['credential', 'reject'], { input });
    if (!result.ok) {
      throw new Error(`Couldn't clear the cached ${protocol} credential for ${host}: ${result.stderr}`);
    }
  }

  return { getGlobalConfig, setGlobalConfig, clearCachedCredential };
}

module.exports = { createGitLib };
