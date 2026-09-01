import { getActiveProfileName, getProfile, setActiveProfileName } from "../config.js";
import { clearCachedCredential, setGlobalGitIdentity } from "../lib/git.js";
import { expandHome } from "../lib/path.js";
import { loadSshKey } from "../lib/ssh.js";
import { switchGhAccount } from "../lib/gh.js";

export interface SwitchOptions {
  ssh: boolean;
  gh: boolean;
}

export async function switchCommand(name: string, options: SwitchOptions): Promise<void> {
  const profile = getProfile(name);
  if (!profile) {
    console.error(
      `No profile named "${name}". Run "virogit list" to see what's saved, or "virogit add ${name}" to create it.`
    );
    process.exitCode = 1;
    return;
  }

  const previousActiveName = getActiveProfileName();
  const previousProfile = previousActiveName ? getProfile(previousActiveName) : undefined;

  console.log(`Switching to "${profile.name}"...`);
  console.log("");

  await setGlobalGitIdentity(profile.gitName, profile.gitEmail);
  console.log(`  Commit identity  ->  ${profile.gitName} <${profile.gitEmail}>`);
  console.log("                        (every future git commit will use this name and email)");

  if (options.ssh) {
    try {
      await loadSshKey(expandHome(profile.sshKeyPath));
      console.log(`  SSH key          ->  ${profile.sshKeyPath}`);
      console.log("                        (loaded into ssh-agent; used when git talks to GitHub over SSH)");
    } catch (error) {
      console.warn(`  SSH key          ->  skipped: ${(error as Error).message}`);
    }
  } else {
    console.log("  SSH key          ->  skipped (--no-ssh)");
  }

  if (options.gh) {
    try {
      await switchGhAccount(profile.githubUsername);
      console.log(`  gh CLI account   ->  ${profile.githubUsername}`);
      console.log('                        (used by "gh pr", "gh issue", and other gh commands)');
    } catch (error) {
      console.warn(`  gh CLI account   ->  skipped: ${(error as Error).message}`);
    }
  } else {
    console.log("  gh CLI account   ->  skipped (--no-gh)");
  }

  const accountChanged = !previousProfile || previousProfile.githubUsername !== profile.githubUsername;
  if (accountChanged) {
    try {
      await clearCachedCredential("github.com");
      console.log("  HTTPS credential ->  cleared");
      console.log('                        (git will ask you to sign in again next time it talks to github.com over HTTPS,');
      console.log(`                        so it doesn't keep using ${previousProfile?.githubUsername ?? "the previous account"})`);
    } catch (error) {
      console.warn(`  HTTPS credential ->  skipped: ${(error as Error).message}`);
    }
  } else {
    console.log("  HTTPS credential ->  unchanged (already using this account)");
  }

  setActiveProfileName(profile.name);
  console.log("");
  console.log(`Done. You're now using "${profile.name}".`);
}
