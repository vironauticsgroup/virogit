import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import prompts from "prompts";
import { getProfile, upsertProfile, type Profile } from "../config.js";
import { commandExists } from "../lib/exec.js";
import {
  addSshKeyToGithub,
  getGhProfile,
  isMissingPublicKeyScopeError,
  listRemoteSshKeys,
  refreshPublicKeyScope,
  webLogin,
} from "../lib/gh.js";
import { findLocalKeysMatchingRemote, generateSshKey } from "../lib/ssh.js";

export interface AddOptions {
  gitName?: string;
  gitEmail?: string;
  sshKey?: string;
  githubUsername?: string;
  web?: boolean;
}

function resolveHome(path: string): string {
  return path.startsWith("~")
    ? path.replace("~", process.env.HOME ?? process.env.USERPROFILE ?? "~")
    : path;
}

function onCancel(): never {
  console.log("Cancelled. Nothing was saved.");
  process.exit(1);
}

function printSavedMessage(name: string): void {
  console.log("");
  console.log(`Saved profile "${name}".`);
  console.log(`Run "virogit switch ${name}" to start using it.`);
}

/** Runs a gh API call; if it fails because the token lacks admin:public_key, grants that scope and retries once. */
async function withPublicKeyScope<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Error && isMissingPublicKeyScopeError(error.message)) {
      await refreshPublicKeyScope();
      return await action();
    }
    throw error;
  }
}

export async function addCommand(
  name: string | undefined,
  options: AddOptions = {}
): Promise<void> {
  if (options.web) {
    try {
      await addCommandWeb(name);
    } catch (error) {
      console.error("");
      console.error(`Couldn't finish setting up this profile: ${(error as Error).message}`);
      process.exitCode = 1;
    }
    return;
  }

  const questions: prompts.PromptObject[] = [];

  if (!name) {
    questions.push({
      type: "text",
      name: "name",
      message: 'What should this profile be called? (e.g. "work", "personal")',
      validate: (v: string) => (v.trim().length > 0 ? true : "Please enter a name."),
    });
  }

  const existing = name ? getProfile(name) : undefined;

  if (!options.gitName) {
    questions.push({
      type: "text",
      name: "gitName",
      message: 'Name to show on commits (e.g. "Jane Doe"):',
      initial: existing?.gitName,
      validate: (v: string) => (v.trim().length > 0 ? true : "Please enter a name."),
    });
  }
  if (!options.gitEmail) {
    questions.push({
      type: "text",
      name: "gitEmail",
      message: 'Email to show on commits (e.g. "jane@company.com"):',
      initial: existing?.gitEmail,
      validate: (v: string) => (/\S+@\S+\.\S+/.test(v) ? true : "That doesn't look like a valid email address."),
    });
  }
  if (!options.sshKey) {
    questions.push({
      type: "text",
      name: "sshKeyPath",
      message: "Path to the SSH PRIVATE key for this account (not the .pub file), e.g. ~/.ssh/id_ed25519_work:",
      initial: existing?.sshKeyPath,
      validate: (v: string) =>
        existsSync(resolveHome(v)) ? true : `Can't find a file at "${v}". Check the path and try again.`,
    });
  }
  if (!options.githubUsername) {
    questions.push({
      type: "text",
      name: "githubUsername",
      message: 'GitHub username for this account (lets "virogit switch" also switch the gh CLI):',
      initial: existing?.githubUsername,
      validate: (v: string) => (v.trim().length > 0 ? true : "Please enter a username."),
    });
  }

  const answers = questions.length > 0 ? await prompts(questions, { onCancel }) : {};

  if (options.sshKey && !existsSync(resolveHome(options.sshKey))) {
    console.error(`Can't find a file at "${options.sshKey}". Check the path and try again.`);
    process.exitCode = 1;
    return;
  }
  if (options.gitEmail && !/\S+@\S+\.\S+/.test(options.gitEmail)) {
    console.error(`"${options.gitEmail}" doesn't look like a valid email address.`);
    process.exitCode = 1;
    return;
  }

  const profile: Profile = {
    name: name ?? answers.name,
    gitName: options.gitName ?? answers.gitName,
    gitEmail: options.gitEmail ?? answers.gitEmail,
    sshKeyPath: options.sshKey ?? answers.sshKeyPath,
    githubUsername: options.githubUsername ?? answers.githubUsername,
  };

  upsertProfile(profile);
  printSavedMessage(profile.name);
}

/**
 * `virogit add <name> --web`: signs in via `gh auth login --web` (browser + device code),
 * then auto-detects (or generates and uploads) the SSH key for this profile so the user
 * never has to locate or paste a key path themselves.
 */
async function addCommandWeb(name: string | undefined): Promise<void> {
  if (!(await commandExists("gh"))) {
    console.error('GitHub CLI ("gh") is required for --web sign-in, but it isn\'t installed.');
    console.error("Install it from https://cli.github.com/ (Windows: winget install --id GitHub.cli),");
    console.error("then run this command again.");
    process.exitCode = 1;
    return;
  }

  console.log(`Setting up ${name ? `"${name}"` : "this profile"} using your browser...`);
  console.log("");
  console.log("GitHub's sign-in tool (gh) will ask a few questions right here in the terminal:");
  console.log('  - "How would you like to authenticate?"  ->  choose "Login with a web browser"');
  console.log("  - It shows a one-time code and opens your browser  ->  paste the code there and approve access");
  console.log('  - "Upload your SSH public key to your GitHub account?"  ->  choose "Skip"');
  console.log("     (virogit sets up a fresh key made just for this profile in the next step, so this one isn't needed)");
  console.log("");

  await webLogin();

  const ghProfile = await getGhProfile();
  console.log("");
  console.log(`Signed in to GitHub as ${ghProfile.login}.`);

  const remoteKeys = await withPublicKeyScope(() => listRemoteSshKeys());
  const localMatches = findLocalKeysMatchingRemote(remoteKeys);

  let sshKeyPath: string;
  if (localMatches.length === 1) {
    sshKeyPath = localMatches[0];
    console.log(`Found an SSH key already linked to ${ghProfile.login}'s GitHub account — using it:`);
    console.log(`  ${sshKeyPath}`);
  } else if (localMatches.length > 1) {
    const choice = await prompts(
      {
        type: "select",
        name: "path",
        message: `Found more than one local SSH key linked to ${ghProfile.login}'s GitHub account. Which one should this profile use?`,
        choices: localMatches.map((p) => ({ title: p, value: p })),
      },
      { onCancel }
    );
    sshKeyPath = choice.path;
  } else {
    const { generate } = await prompts(
      {
        type: "confirm",
        name: "generate",
        message: `${ghProfile.login} doesn't have a dedicated SSH key yet. Create one now and add it to that GitHub account?`,
        initial: true,
      },
      { onCancel }
    );

    if (generate) {
      const label = name ?? ghProfile.login;
      const keyPath = join(homedir(), ".ssh", `id_ed25519_${label}`);
      await generateSshKey(keyPath, `virogit-${label}`);
      await withPublicKeyScope(() => addSshKeyToGithub(`${keyPath}.pub`, `virogit-${label}`));
      sshKeyPath = keyPath;
      console.log(`Created a new SSH key and added it to ${ghProfile.login}'s GitHub account:`);
      console.log(`  ${keyPath}`);
    } else {
      const manual = await prompts(
        {
          type: "text",
          name: "sshKeyPath",
          message: "Path to the SSH private key to use for this profile:",
          validate: (v: string) =>
            existsSync(resolveHome(v)) ? true : `Can't find a file at "${v}". Check the path and try again.`,
        },
        { onCancel }
      );
      sshKeyPath = manual.sshKeyPath;
    }
  }

  console.log("");
  const questions: prompts.PromptObject[] = [];
  if (!name) {
    questions.push({
      type: "text",
      name: "name",
      message: 'What should this profile be called? (e.g. "work", "personal")',
      initial: ghProfile.login,
      validate: (v: string) => (v.trim().length > 0 ? true : "Please enter a name."),
    });
  }
  questions.push(
    {
      type: "text",
      name: "gitName",
      message: "Name to show on your commits (from your GitHub profile — edit if you'd like):",
      initial: ghProfile.name ?? ghProfile.login,
      validate: (v: string) => (v.trim().length > 0 ? true : "Please enter a name."),
    },
    {
      type: "text",
      name: "gitEmail",
      message: ghProfile.email
        ? "Email to show on your commits (from your GitHub profile — edit if you'd like):"
        : "Email to show on your commits (your GitHub email is private, so this uses GitHub's no-reply address — edit if you'd like):",
      initial: ghProfile.email ?? `${ghProfile.login}@users.noreply.github.com`,
      validate: (v: string) => (/\S+@\S+\.\S+/.test(v) ? true : "That doesn't look like a valid email address."),
    }
  );

  const answers = await prompts(questions, { onCancel });

  const profile: Profile = {
    name: name ?? answers.name,
    gitName: answers.gitName,
    gitEmail: answers.gitEmail,
    sshKeyPath,
    githubUsername: ghProfile.login,
  };

  upsertProfile(profile);
  printSavedMessage(profile.name);
}
