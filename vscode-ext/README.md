# virogit (VS Code extension)

> **Status: not built yet.** This file describes what the extension is meant to do. Nothing in this folder is implemented yet — the working part of virogit today is the [CLI](../cli/README.md).

## What it will do

Right now, switching GitHub accounts on this computer means running commands in a terminal (see the [CLI](../cli/README.md)). This extension's job is to let you do the same thing without leaving VS Code — pick an account from a menu instead of typing commands.

Planned:

- **Status bar item** showing which GitHub profile is currently active (e.g. `⇄ work`).
- **Click it (or run a command) to switch profiles** — picks a profile from a list, same as `virogit switch <name>` in the CLI.
- **A view to add, edit, and remove profiles** without touching a terminal, including the "sign in with your browser" flow the CLI supports.
- Uses the **same profiles** the CLI saves (`~/.virogit/config.json`), so setting up an account in one place makes it available in the other.

## Why a separate extension, not just a terminal

Some people switch accounts many times a day between different projects open in VS Code. A status bar item you can see and click is faster than opening a terminal and remembering the right command — and it makes the currently active account visible at a glance.

## Relationship to the CLI

The [`cli/`](../cli/README.md) folder has the real, working implementation of account-switching (git identity + SSH key + `gh` CLI auth). This extension is a thin UI on top of that same logic — it is not a separate way of switching accounts, just a more convenient way to trigger it from inside VS Code.
