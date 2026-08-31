import { run } from "./exec.js";
import { runInteractive } from "./exec.js";
import { createGhLib, isMissingPublicKeyScopeError, type GhProfile } from "../shared/gh.js";

export type { GhProfile };
export { isMissingPublicKeyScopeError };

export const { getGhProfile, listRemoteSshKeys, addSshKeyToGithub, switchGhAccount, getActiveGhAccount } =
  createGhLib(run);

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
