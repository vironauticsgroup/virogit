import { removeProfile } from "../config.js";

export function removeCommand(name: string): void {
  const removed = removeProfile(name);
  if (!removed) {
    console.error(`No profile named "${name}". Run "virogit list" to see what's saved.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Removed profile "${name}".`);
  console.log("This only deletes virogit's saved record — your git config, SSH key, and GitHub account are untouched.");
}
