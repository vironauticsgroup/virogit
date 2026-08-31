const fs = require('fs');
const os = require('os');
const path = require('path');

/** "ssh-ed25519 AAAA... comment" -> "ssh-ed25519 AAAA..." (drops the comment so local and remote forms compare equal). */
function normalizeKey(raw) {
  return raw.trim().split(/\s+/).slice(0, 2).join(' ');
}

const sshDir = path.join(os.homedir(), '.ssh');

/** Local private key paths under ~/.ssh whose public half matches one of the given "type base64" remote keys. */
function findLocalKeysMatchingRemote(remoteKeys) {
  const normalizedRemote = new Set(remoteKeys.map(normalizeKey));
  let entries;
  try {
    entries = fs.readdirSync(sshDir);
  } catch {
    return [];
  }

  const matches = [];
  for (const entry of entries) {
    if (!entry.endsWith('.pub')) continue;
    const pubPath = path.join(sshDir, entry);
    let content;
    try {
      content = fs.readFileSync(pubPath, 'utf-8');
    } catch {
      continue;
    }
    if (normalizedRemote.has(normalizeKey(content))) {
      matches.push(pubPath.slice(0, -'.pub'.length));
    }
  }
  return matches;
}

function agentNotRunningHint() {
  return process.platform === 'win32'
    ? 'ssh-agent is not running. Start it with: Start-Service ssh-agent (as admin, one-time: Set-Service ssh-agent -StartupType Automatic), or in Git Bash: eval "$(ssh-agent -s)"'
    : 'ssh-agent is not running. Start it with: eval "$(ssh-agent -s)"';
}

function isAgentConnectionError(stderr) {
  return /could not open a connection|agent refused/i.test(stderr);
}

/** Builds the ssh-keygen/ssh-add-backed operations using the caller's own process-runner (execa for the CLI, execFile for the extension). */
function createSshLib(run) {
  async function generateSshKey(keyPath, comment) {
    if (fs.existsSync(keyPath) || fs.existsSync(`${keyPath}.pub`)) {
      throw new Error(
        `A key already exists at "${keyPath}" (maybe left over from an earlier attempt). Delete it, or pick a different profile name, and try again.`
      );
    }
    const result = await run('ssh-keygen', ['-t', 'ed25519', '-f', keyPath, '-N', '', '-C', comment, '-q']);
    if (!result.ok) {
      throw new Error(`Couldn't create an SSH key at "${keyPath}": ${result.stderr}`);
    }
  }

  /** Clears the agent (ssh-add -D) and loads exactly this key, so switching never leaves a stale key loaded. */
  async function loadSshKey(sshKeyPath) {
    const clear = await run('ssh-add', ['-D']);
    if (!clear.ok) {
      const hint = isAgentConnectionError(clear.stderr) ? agentNotRunningHint() : clear.stderr;
      throw new Error(`Couldn't reset the SSH agent: ${hint}`);
    }
    const add = await run('ssh-add', [sshKeyPath]);
    if (!add.ok) {
      throw new Error(`Couldn't load the SSH key "${sshKeyPath}" into the agent: ${add.stderr}`);
    }
  }

  async function listLoadedKeys() {
    const result = await run('ssh-add', ['-l']);
    if (!result.ok || !result.stdout) return [];
    return result.stdout.split('\n').filter(Boolean);
  }

  return { generateSshKey, loadSshKey, listLoadedKeys };
}

module.exports = { normalizeKey, findLocalKeysMatchingRemote, createSshLib };
