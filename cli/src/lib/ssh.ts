import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { run } from "./exec.js";

function agentNotRunningHint(): string {
  return process.platform === "win32"
    ? 'ssh-agent is not running. Start it with: Start-Service ssh-agent (as admin, one-time: Set-Service ssh-agent -StartupType Automatic), or in Git Bash: eval "$(ssh-agent -s)"'
    : 'ssh-agent is not running. Start it with: eval "$(ssh-agent -s)"';
}

function isAgentConnectionError(stderr: string): boolean {
  return /could not open a connection|agent refused/i.test(stderr);
}

export async function loadSshKey(sshKeyPath: string): Promise<void> {
  const clear = await run("ssh-add", ["-D"]);
  if (!clear.ok) {
    const hint = isAgentConnectionError(clear.stderr) ? agentNotRunningHint() : clear.stderr;
    throw new Error(`Couldn't reset the SSH agent: ${hint}`);
  }
  const add = await run("ssh-add", [sshKeyPath]);
  if (!add.ok) {
    throw new Error(`Couldn't load the SSH key "${sshKeyPath}" into the agent: ${add.stderr}`);
  }
}

export async function listLoadedKeys(): Promise<string[]> {
  const result = await run("ssh-add", ["-l"]);
  if (!result.ok || !result.stdout) return [];
  return result.stdout.split("\n").filter(Boolean);
}

/** "ssh-ed25519 AAAA... comment" -> "ssh-ed25519 AAAA..." (drops the comment so local and remote forms compare equal). */
function normalizeKey(raw: string): string {
  return raw.trim().split(/\s+/).slice(0, 2).join(" ");
}

const sshDir = join(homedir(), ".ssh");

/** Local private key paths under ~/.ssh whose public half matches one of the given "type base64" remote keys. */
export function findLocalKeysMatchingRemote(remoteKeys: string[]): string[] {
  const normalizedRemote = new Set(remoteKeys.map(normalizeKey));
  let entries: string[];
  try {
    entries = readdirSync(sshDir);
  } catch {
    return [];
  }

  const matches: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".pub")) continue;
    const pubPath = join(sshDir, entry);
    let content: string;
    try {
      content = readFileSync(pubPath, "utf-8");
    } catch {
      continue;
    }
    if (normalizedRemote.has(normalizeKey(content))) {
      matches.push(pubPath.slice(0, -".pub".length));
    }
  }
  return matches;
}

export async function generateSshKey(keyPath: string, comment: string): Promise<void> {
  if (existsSync(keyPath) || existsSync(`${keyPath}.pub`)) {
    throw new Error(
      `A key already exists at "${keyPath}" (maybe left over from an earlier attempt). Delete it, or pick a different profile name, and try again.`
    );
  }
  const result = await run("ssh-keygen", ["-t", "ed25519", "-f", keyPath, "-N", "", "-C", comment, "-q"]);
  if (!result.ok) {
    throw new Error(`Couldn't create an SSH key at "${keyPath}": ${result.stderr}`);
  }
}
