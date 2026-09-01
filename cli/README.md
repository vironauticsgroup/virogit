# virogit (CLI)

Switch between GitHub accounts on one computer — in one command instead of three manual steps:

- your git commit identity (`user.name` / `user.email`)
- which SSH key gets used for `git push`/`git pull`
- which account the [`gh`](https://cli.github.com/) CLI acts as

You save each GitHub account as a named **profile**, then run `virogit switch <name>` whenever you want to work as that account.

## Install

```bash
npm install
npm run build
npm link   # exposes `virogit` as a global command
```

## Quick start

```bash
# Easiest: sign in to a GitHub account in your browser — virogit finds or
# creates the right SSH key for you, no manual key handling needed
virogit add work --web

# Or set up a profile by answering a few questions
virogit add personal

# See what you've saved
virogit list

# Start using a profile everywhere (git commits, git push/pull, gh commands)
virogit switch work

# Check what's active right now
virogit current
```

## Every command

There are 5 commands. Two of them have a short alias — both forms do exactly the same thing.

| Command | Alias | What it does |
|---|---|---|
| `virogit add [name]` | — | Save a GitHub account as a new profile, or update an existing one |
| `virogit list` | `virogit ls` | Show every saved profile |
| `virogit switch <name>` | `virogit use <name>` | Start using a profile (commit identity + SSH key + `gh` account) |
| `virogit current` | — | Show which profile is active right now |
| `virogit remove <name>` | `virogit rm <name>` | Delete a saved profile |

Every command also supports `--help`, e.g. `virogit add --help`.

---

### `virogit add [name]`
Saves a GitHub account as a profile. If you don't pass `[name]`, or leave out any of the values below, you'll be prompted for them instead.

```bash
virogit add work --web
virogit add personal --git-name "Jane Doe" --git-email jane@personal.com \
  --ssh-key ~/.ssh/id_ed25519_personal --github-username janedoe
virogit add                # prompts for everything, including the name
```

| Flag | What it's for |
|---|---|
| `--web` | Sign in to GitHub in your browser (`gh auth login --web`); virogit then finds an SSH key already on that account, or generates and uploads a new one — you never type a key path. Requires [`gh`](https://cli.github.com/) to be installed. |
| `--git-name <name>` | Name to show on commits made under this profile |
| `--git-email <email>` | Email to show on commits made under this profile |
| `--ssh-key <path>` | Path to the SSH **private** key for this account (not the `.pub` file) |
| `--github-username <username>` | GitHub username, so `virogit switch` can also switch the `gh` CLI to this account |

**Using `--web`:** after you run `virogit add <name> --web`, `gh`'s own sign-in flow takes over your terminal for a moment. Here's what it asks and what to pick:

1. *"How would you like to authenticate?"* → choose **Login with a web browser**.
2. It prints a one-time code and opens your browser → paste the code there and approve access.
3. *"Upload your SSH public key to your GitHub account?"* → choose **Skip**. virogit handles SSH key setup itself in the next step, so this is redundant — and picking an existing key here can conflict with a different profile that already uses it.

After that, virogit checks the account for a matching local key; if none exists it offers to generate and upload a fresh one dedicated to that profile.

### `virogit list` / `virogit ls`
Shows every saved profile — name, commit identity, SSH key path, and GitHub username — and marks which one is currently active.

```bash
virogit list
virogit ls        # same thing
```

### `virogit switch <name>` / `virogit use <name>`
Makes `<name>` the active profile. `switch` and `use` are identical — pick whichever reads better to you.

```bash
virogit switch work
virogit use work          # same thing
virogit switch work --no-gh    # skip the gh CLI step
virogit switch work --no-ssh   # skip the SSH agent step
```

What it does, in order:
1. Sets `git config --global user.name` / `user.email`.
2. Reloads the SSH agent with just this profile's key (`ssh-add -D` then `ssh-add <key>`) — skip with `--no-ssh`.
3. Runs `gh auth switch` so `gh pr`, `gh issue`, etc. act as this account — skip with `--no-gh`.
4. If the GitHub username actually changed from the profile you were last on, clears the cached `github.com` HTTPS credential (Windows Credential Manager / macOS Keychain / libsecret) so `git push`/`git pull` over HTTPS don't keep authenticating as the account you just switched away from — you'll get one fresh sign-in prompt the next time you push/pull. Switching back to an account you're already using skips this, so it costs you nothing.

Steps 2–4 are best-effort: if `ssh-agent`/`gh` isn't available, or the credential can't be cleared, `switch` prints a warning for that step and continues rather than failing the whole command.

**Limitation:** step 4 only knows about accounts switched through virogit itself. If you sign into a different GitHub account through something else on this machine (`gh auth login` directly, GitHub Desktop, an IDE extension), virogit won't detect that, and the wrong-account-cached symptom can reappear. It also only clears the credential store for the git install you ran `virogit switch` from — a separate WSL git install, for example, keeps its own cache untouched.

### `virogit current`
Shows which profile is active and what git is actually set to right now, and flags it if the two have drifted apart (e.g. something outside virogit changed your git config).

```bash
virogit current
```

### `virogit remove <name>` / `virogit rm <name>`
Deletes a saved profile. This only removes virogit's own record — it does not touch your git config, delete the SSH key, or affect the GitHub account itself.

```bash
virogit remove work
virogit rm work           # same thing
```

## Where things are stored

Profiles live in `~/.virogit/config.json`. Removing a profile or uninstalling virogit never deletes your actual SSH keys or GitHub account data.

## Requirements

- `git` on `PATH` — required for every command.
- `ssh-add` on `PATH` and a running `ssh-agent` — required for the SSH-switching step in `virogit switch` (and for key detection in `--web`).
  - Windows: `Start-Service ssh-agent` (one-time as admin: `Set-Service ssh-agent -StartupType Automatic`), or in Git Bash: `eval "$(ssh-agent -s)"`.
  - macOS/Linux: `eval "$(ssh-agent -s)"` if not already running.
- [`gh`](https://cli.github.com/) on `PATH` — required for `--web` sign-in and for the `gh auth switch` step in `virogit switch`.
