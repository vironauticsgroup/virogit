# virogit

Switch between GitHub accounts on one computer — in one step instead of three manual ones:

- your git commit identity (`user.name` / `user.email`)
- which SSH key `git push`/`git pull` uses
- which account the [`gh`](https://cli.github.com/) CLI acts as

You save each GitHub account as a named **profile** once, then switch between profiles whenever you need to work as a different account.

## Two parts

| Part | Status | What it is |
|---|---|---|
| [`cli/`](cli/README.md) | ✅ Working | A command-line tool: `virogit add`, `virogit switch`, `virogit list`, etc. Use this today. |
| [`vscode-ext/`](vscode-ext/README.md) | 🚧 Planned, not built yet | A VS Code extension that will let you switch profiles from a status bar menu instead of a terminal, using the same profiles the CLI saves. |

Start with the CLI — see [`cli/README.md`](cli/README.md) for install steps and every command.

## Example

```bash
# Sign in to a GitHub account in your browser — virogit sets up the SSH key for you
virogit add work --web

# Start using it: sets your commit name/email, loads its SSH key, switches the gh CLI
virogit switch work
```
