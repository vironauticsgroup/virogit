#!/usr/bin/env node
// Copies the repo-root shared/ core module into cli/src/shared/ (gitignored) before every
// build/dev run, so tsc's `allowJs` passthrough-copies it into cli/dist/shared/ alongside the
// compiled TS output. Also seeds dist/shared/package.json directly, since tsc's allowJs emit
// only copies .js/.ts files, not package.json — and that file is what marks the dist/shared/
// subtree as CommonJS, overriding cli/package.json's "type": "module" for just that folder.
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");
const sharedSrc = path.join(repoRoot, "shared");
const sharedDest = path.join(__dirname, "..", "src", "shared");
const distSharedDir = path.join(__dirname, "..", "dist", "shared");

function copyFile(srcPath, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
}

function syncDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    if (fs.statSync(srcPath).isDirectory()) continue;
    if (!/\.(js|d\.ts|json)$/.test(entry)) continue;
    copyFile(srcPath, path.join(destDir, entry));
  }
}

syncDir(sharedSrc, sharedDest);
copyFile(path.join(sharedSrc, "package.json"), path.join(distSharedDir, "package.json"));
