const { run } = require('./exec');
const { createSshLib, findLocalKeysMatchingRemote, normalizeKey, expandHome } = require('./core');

const sshLib = createSshLib(run);

/** Loads a key into ssh-agent — the same mechanism the virogit CLI uses, so switching from
 * either the CLI or this extension has the same effect on which key git uses. */
function loadSshKeyIntoAgent(sshKeyPath) {
  return sshLib.loadSshKey(expandHome(sshKeyPath));
}

module.exports = {
  normalizeKey,
  findLocalKeysMatchingRemote,
  generateSshKey: sshLib.generateSshKey,
  loadSshKeyIntoAgent,
};
