# virogit

Switch between GitHub accounts on one computer — in one step instead of three manual ones:

- your git commit identity (`user.name` / `user.email`)
- which SSH key `git push`/`git pull` uses
- which account the [`gh`](https://cli.github.com/) CLI acts as

You save each GitHub account as a named **profile** once, then switch between profiles whenever you need to work as a different account.

## Two parts

| Part | Status | What it is |
|---|---|---|
| [`cli/`](cli/README.md) | ✅ Working | A command-line tool: `virogit add`, `virogit switch`, `virogit list`, etc. |
| [`vscode-ext/`](vscode-ext/README.md) | ✅ Working | A VS Code extension: switch profiles from a status bar click, using the same profiles the CLI saves (`~/.virogit/config.json`). Switches git identity, SSH key, and the `gh` CLI account — same three steps as the CLI. |

See [`cli/README.md`](cli/README.md) or [`vscode-ext/README.md`](vscode-ext/README.md) for install steps and every command.

## Known limitations

Switching profiles also clears the cached GitHub HTTPS credential (Windows Credential Manager / macOS Keychain / libsecret) whenever the GitHub username actually changes, so `git push`/`git pull` over HTTPS don't silently keep using the account you just switched away from. A few things this doesn't cover:

- **Only tracks accounts changed through virogit.** If you sign into a different GitHub account through something else on the same machine — `gh auth login` directly, GitHub Desktop, an IDE's GitHub extension — virogit has no way to know. It compares against the profile it last switched to, so it can miss a credential that changed outside of it, and the old "pushed as the wrong account" symptom can come back.
- **Per git install, not per machine.** Windows and WSL (or any two separate git installs) each keep their own credential store. Clearing the Windows one from `virogit switch` does nothing for a WSL shell's git, and vice versa.
- **Only targets `github.com`.** GitHub Enterprise or other hosts aren't covered.
- **First switch after install/reset always re-prompts on push**, even if the right account happens to already be cached, since virogit has no prior state yet to compare against.

Bottom line: this fixes the common case of switching accounts only through `virogit switch`/`use` on one git install. It's not a guarantee against every way GitHub credentials can get out of sync on a machine.

## Example

```bash
# Sign in to a GitHub account in your browser — virogit sets up the SSH key for you
virogit add work --web

# Start using it: sets your commit name/email, loads its SSH key, switches the gh CLI
virogit switch work
```
