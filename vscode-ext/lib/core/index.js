// Resolves the shared/ core module from two possible locations:
//  - dev (F5 Extension Development Host, running straight off a monorepo checkout): the real
//    repo-root shared/ two levels up, used directly — always current, nothing to generate.
//  - packaged (installed .vsix): lib/core/bundled/, populated at package time by
//    scripts/copy-shared.js (wired to the vscode:prepublish npm hook), since only files inside
//    vscode-ext/ ship in the .vsix and there's no sibling shared/ on the target machine.
const fs = require('fs');
const path = require('path');

const monorepoShared = path.join(__dirname, '..', '..', '..', 'shared', 'index.js');
const bundledShared = path.join(__dirname, 'bundled', 'index.js');

if (fs.existsSync(monorepoShared)) {
  module.exports = require(monorepoShared);
} else if (fs.existsSync(bundledShared)) {
  module.exports = require(bundledShared);
} else {
  throw new Error(
    'virogit: shared core modules not found. If developing from a standalone vscode-ext checkout, ' +
      'run "npm run build:core" first (or open the full virogit monorepo and use F5).'
  );
}
