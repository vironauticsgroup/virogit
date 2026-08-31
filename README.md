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

## Example

```bash
# Sign in to a GitHub account in your browser — virogit sets up the SSH key for you
virogit add work --web

# Start using it: sets your commit name/email, loads its SSH key, switches the gh CLI
virogit switch work
```
