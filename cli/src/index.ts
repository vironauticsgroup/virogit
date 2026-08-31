#!/usr/bin/env node
import { Command } from "commander";
import { addCommand, type AddOptions } from "./commands/add.js";
import { listCommand } from "./commands/list.js";
import { removeCommand } from "./commands/remove.js";
import { switchCommand } from "./commands/switch.js";
import { currentCommand } from "./commands/current.js";

const program = new Command();

program
  .name("virogit")
  .description(
    "Switch between GitHub accounts on this computer: your commit name/email, your SSH key, and your gh CLI login — all at once."
  )
  .version("0.1.0")
  .addHelpText(
    "after",
    `
Quick start:
  virogit add work --web     Sign in to a GitHub account in your browser; virogit sets up its SSH key for you
  virogit add personal       Set up a profile by answering a few questions
  virogit list               See every profile you've saved
  virogit switch work        Start using the "work" profile everywhere
  virogit current            Check which profile is active right now
`
  );

program
  .command("add [name]")
  .description("Save a GitHub account as a profile (name, commit identity, SSH key)")
  .option("--git-name <name>", "name to show on commits for this profile")
  .option("--git-email <email>", "email to show on commits for this profile")
  .option("--ssh-key <path>", "path to the SSH private key for this account (not the .pub file)")
  .option("--github-username <username>", "GitHub username, so \"virogit switch\" can also switch the gh CLI")
  .option(
    "--web",
    "sign in to GitHub in your browser and let virogit find or create the SSH key for you"
  )
  .action(async (name: string | undefined, options: AddOptions) => {
    await addCommand(name, options);
  });

program
  .command("list")
  .alias("ls")
  .description("Show every saved profile (the active one is marked)")
  .action(() => {
    listCommand();
  });

program
  .command("remove <name>")
  .alias("rm")
  .description("Delete a saved profile (does not touch git config, SSH keys, or GitHub)")
  .action((name: string) => {
    removeCommand(name);
  });

program
  .command("switch <name>")
  .alias("use")
  .description(
    "Start using a profile: sets your commit name/email, loads its SSH key, and switches the gh CLI account"
  )
  .option("--no-ssh", "don't touch the SSH agent")
  .option("--no-gh", "don't switch the gh CLI account")
  .action(async (name: string, options: { ssh: boolean; gh: boolean }) => {
    await switchCommand(name, options);
  });

program
  .command("current")
  .description("Show which profile is active and what git is currently set to")
  .action(async () => {
    await currentCommand();
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(`Error: ${(error as Error).message}`);
  process.exitCode = 1;
}
