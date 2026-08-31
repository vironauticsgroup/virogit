import { getActiveProfileName, listProfiles } from "../config.js";

export function listCommand(): void {
  const profiles = listProfiles();
  const active = getActiveProfileName();

  if (profiles.length === 0) {
    console.log("No profiles yet.");
    console.log('Run "virogit add <name>" to create one, or "virogit add <name> --web" to set one up via your browser.');
    return;
  }

  console.log("(* marks the profile currently in use)");
  console.log("");

  for (const profile of profiles) {
    const isActive = profile.name === active;
    const marker = isActive ? "*" : " ";
    console.log(`${marker} ${profile.name}${isActive ? "  (active)" : ""}`);
    console.log(`    commits as: ${profile.gitName} <${profile.gitEmail}>`);
    console.log(`    ssh key:    ${profile.sshKeyPath}`);
    console.log(`    gh account: ${profile.githubUsername}`);
  }
}
