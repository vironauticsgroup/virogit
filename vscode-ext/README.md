# virogit (VS Code extension)

Switch between GitHub accounts from inside VS Code — a sidebar panel and a status bar shortcut, instead of typing commands. Shares the exact same profiles as the [CLI](../cli/README.md), stored at `~/.virogit/config.json`, so setting up an account in one place makes it available in the other.

## What it does

- **Sidebar panel** — click the virogit icon in the Activity Bar (left edge of the window) to open a list of your profiles: name, commit identity, SSH key, GitHub username. From there:
  - **Switch** — click a profile's "Switch" button to make it active.
  - **+ (top right)** or **"Add your first profile"** — opens a form to add a new one. It offers two ways in:
    - **Sign in with GitHub** — opens a terminal running `gh auth login --web`; once you're signed in, virogit finds an SSH key already on that account or offers to generate and upload one, then asks just for the profile's name and confirms the commit name/email (pre-filled from your GitHub profile). Requires [`gh`](https://cli.github.com/) installed.
    - **Enter details manually** — the plain form: name, commit name/email, SSH key (type a path or Browse for the file), GitHub username.
  - **Edit** — reopens that same form pre-filled, to update a profile's details (manual entry only — signing in again is for adding a new account, not editing one).
  - **🗑 (trash icon)** — removes a profile, after a confirmation.
- **Status bar item** (bottom left) showing the active profile, e.g. `👤 work` — click it for a quick-switch menu without opening the sidebar.
- All the same actions are also in the Command Palette (`Ctrl+Shift+P` → type "virogit"): `virogit: Switch Profile`, `virogit: Add Profile` (asks web vs. manual), `virogit: Add Profile (Sign in with GitHub)`, `virogit: Remove Profile`, `virogit: Show Current Profile`.

Switching (from either the sidebar, the status bar, or a command) sets `git config --global user.name`/`user.email`, loads that profile's SSH key into `ssh-agent` (`ssh-add -D` then `ssh-add <key>`), and switches the `gh` CLI's active account (`gh auth switch`) — exactly the same three steps the CLI's `virogit switch` performs, so switching from anywhere has the same effect. The SSH and `gh` steps each warn (rather than abort) if they fail, so a missing `ssh-agent` or an unauthenticated `gh` account never blocks the commit-identity switch.

## Status

Implemented: sidebar panel (add/edit/remove/switch with a real UI, not just dialogs), status bar quick-switch, command palette, browser sign-in for adding profiles (mirroring the CLI's `--web`), git identity + SSH key + `gh` CLI account switching, storage shared live with the CLI (a file watcher picks up profiles or an active-profile change made by the CLI, or another VS Code window, without needing this extension to write first).

The CLI and this extension share their core logic (config storage, SSH key matching/generation, `gh` API calls) via `../shared/`, so a fix in one applies to both.

## Requirements

- `git` on `PATH`.
- `ssh-add` on `PATH` and a running `ssh-agent` (see the [CLI README](../cli/README.md#requirements) for how to start it per OS) — if the agent isn't running, switching still updates your commit identity and shows a warning for the SSH step instead of failing outright.
- [`gh`](https://cli.github.com/) on `PATH` and signed in, for the `gh` CLI account step of switching (as well as for `--web` sign-in) — same requirement as the CLI's `virogit switch`. Missing or unauthenticated `gh` only produces a warning, not a failure.

## Project layout

```
vscode-ext/
  extension.js         entry point: status bar item, commands, registers the sidebar
  sidebarProvider.js    the sidebar's webview: renders the UI, handles its messages
  lib/store.js          binds ~/.virogit/config.json's shared store (same file the CLI uses)
  lib/git.js             git config helpers, bound to the shared core
  lib/switcher.js        applyProfile() — the actual "switch" logic, shared by every entry point
  lib/exec.js             small process-running helpers (commandExists, etc.)
  lib/ssh.js              SSH key matching/generation/loading, bound to the shared core
  lib/gh.js               gh CLI calls, incl. running `gh auth login` in a visible terminal
  lib/addWeb.js           orchestrates the whole --web sign-in flow, shared by the sidebar and command palette
  lib/core/               resolves ../../shared/ (the code shared with the CLI) — the real
                          directory in a monorepo checkout, or a copy bundled into the .vsix
                          at package time (see scripts/copy-shared.js)
  media/                 sidebar's icon, CSS, and client-side JS
```

## Running it locally

Package it into a `.vsix` and install it:

```bash
npx @vscode/vsce package
code --install-extension virogit-0.1.0.vsix
```

Or for active development, open this `vscode-ext/` folder in VS Code and press `F5` to launch an Extension Development Host with it loaded.

## Why a separate extension, not just the terminal

If you switch accounts often between projects open in VS Code, a sidebar you can see and click is faster than opening a terminal and remembering the right command — and it keeps the active account visible at a glance while you work.
