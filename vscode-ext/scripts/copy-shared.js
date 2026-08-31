#!/usr/bin/env node
// Copies the repo-root shared/ core module into vscode-ext/lib/core/bundled/ (gitignored) so
// it ships inside the packaged .vsix, since only files under vscode-ext/ are included when
// `vsce package`/`vsce publish` collect files. Runs automatically via vscode:prepublish; can
// also be run manually (npm run build:core) for a standalone vscode-ext checkout without a
// sibling shared/ directory two levels up (the case lib/core/index.js otherwise resolves
// directly against, with no copy needed, when developing from the full monorepo).
const fs = require("fs");
const path = require("path");

const sharedSrc = path.join(__dirname, "..", "..", "shared");
const bundledDest = path.join(__dirname, "..", "lib", "core", "bundled");

fs.mkdirSync(bundledDest, { recursive: true });
for (const entry of fs.readdirSync(sharedSrc)) {
  const srcPath = path.join(sharedSrc, entry);
  if (fs.statSync(srcPath).isDirectory()) continue;
  if (!/\.(js|d\.ts|json)$/.test(entry)) continue;
  fs.copyFileSync(srcPath, path.join(bundledDest, entry));
}
