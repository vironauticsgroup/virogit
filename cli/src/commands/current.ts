import { getActiveProfileName, getProfile } from "../config.js";
import { getGlobalGitIdentity } from "../lib/git.js";

export async function currentCommand(): Promise<void> {
  const activeName = getActiveProfileName();
  const identity = await getGlobalGitIdentity();

  if (!activeName) {
    console.log("No profile is active yet.");
    console.log(`Git is currently set to commit as: ${identity.name} <${identity.email}>`);
    console.log('Run "virogit switch <name>" to activate a saved profile.');
    return;
  }

  console.log(`Active profile: ${activeName}`);
  console.log(`Git is currently set to commit as: ${identity.name} <${identity.email}>`);

  const profile = getProfile(activeName);
  if (profile && (profile.gitName !== identity.name || profile.gitEmail !== identity.email)) {
    console.log("");
    console.log(
      `Note: this doesn't match what "${activeName}" has saved (${profile.gitName} <${profile.gitEmail}>).`
    );
    console.log(`Something outside virogit changed your git config. Run "virogit switch ${activeName}" to reapply it.`);
  }
}
