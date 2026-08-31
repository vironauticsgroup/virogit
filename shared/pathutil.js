const os = require('os');

/** "~/.ssh/id_ed25519" -> "/home/jane/.ssh/id_ed25519" (leaves non-tilde paths untouched). */
function expandHome(rawPath) {
  if (rawPath === '~') return os.homedir();
  if (rawPath.startsWith('~/') || rawPath.startsWith('~\\')) {
    return os.homedir() + rawPath.slice(1);
  }
  return rawPath;
}

module.exports = { expandHome };
