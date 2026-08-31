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

  return { getGlobalConfig, setGlobalConfig };
}

module.exports = { createGitLib };
