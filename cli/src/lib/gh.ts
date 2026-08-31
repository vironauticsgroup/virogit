import { run, runInteractive } from "./exec.js";

export interface GhProfile {
  login: string;
  name: string | null;
  email: string | null;
}

/**
 * Runs `gh auth login` with stdio inherited so the user sees the device
 * code, browser prompt, and gh's own "generate an SSH key?" prompt directly.
 *
 * Requests the `admin:public_key` scope up front so virogit's own SSH-key
 * lookup/upload calls (listRemoteSshKeys, addSshKeyToGithub) work even when
 * the user skips gh's own key-upload offer, which is what we tell them to do.
 */
export async function webLogin(hostname = "github.com"): Promise<void> {
  const ok = await runInteractive("gh", [
    "auth",
    "login",
    "--hostname",
    hostname,
    "--git-protocol",
    "ssh",
    "--web",
    "--scopes",
    "admin:public_key",
  ]);
  if (!ok) {
    throw new Error("GitHub sign-in didn't finish. Run the command again to retry.");
  }
}

/** True when a gh API error is specifically GitHub's "missing admin:public_key scope" 404. */
export function isMissingPublicKeyScopeError(message: string): boolean {
  return /admin:public_key/i.test(message);
}

/**
 * Interactively grants the `admin:public_key` scope to an existing gh login (opens the
 * browser again). Used as a fallback for accounts authenticated before virogit requested
 * the scope up front, or any other case where the scope is missing.
 */
export async function refreshPublicKeyScope(hostname = "github.com"): Promise<void> {
  console.log("");
  console.log("GitHub needs one more permission to manage SSH keys on this account (admin:public_key).");
  console.log("Your browser will open again — just approve it.");
  const ok = await runInteractive("gh", ["auth", "refresh", "-h", hostname, "-s", "admin:public_key"]);
  if (!ok) {
    throw new Error("Couldn't get permission to manage SSH keys on GitHub. Run the command again to retry.");
  }
}

export async function getGhProfile(): Promise<GhProfile> {
  const result = await run("gh", ["api", "user", "--jq", "{login,name,email}"]);
  if (!result.ok) {
    throw new Error(`Couldn't read your GitHub profile: ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as GhProfile;
}

/** Public keys currently attached to the authenticated GitHub account, as raw "type base64" strings. */
export async function listRemoteSshKeys(): Promise<string[]> {
  const result = await run("gh", ["api", "user/keys", "--jq", ".[].key"]);
  if (!result.ok) {
    throw new Error(`Couldn't check which SSH keys are already on your GitHub account: ${result.stderr}`);
  }
  if (!result.stdout) return [];
  return result.stdout.split("\n").filter(Boolean);
}

export async function addSshKeyToGithub(pubKeyPath: string, title: string): Promise<void> {
  const result = await run("gh", ["ssh-key", "add", pubKeyPath, "--title", title]);
  if (!result.ok) {
    throw new Error(`Couldn't upload the SSH key to GitHub: ${result.stderr}`);
  }
}

export async function switchGhAccount(username: string, hostname = "github.com"): Promise<void> {
  const result = await run("gh", ["auth", "switch", "--hostname", hostname, "--user", username]);
  if (!result.ok) {
    throw new Error(`Couldn't switch the gh CLI to "${username}": ${result.stderr}`);
  }
}

export async function getActiveGhAccount(hostname = "github.com"): Promise<string | null> {
  const result = await run("gh", ["auth", "status", "--hostname", hostname]);
  const text = `${result.stdout}\n${result.stderr}`;
  const match = text.match(/Logged in to [^\s]+ account (\S+)/);
  return match ? match[1] : null;
}
