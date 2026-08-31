import { run } from "./exec.js";

export async function setGlobalGitIdentity(name: string, email: string): Promise<void> {
  const nameResult = await run("git", ["config", "--global", "user.name", name]);
  if (!nameResult.ok) {
    throw new Error(`Couldn't set your commit name in git: ${nameResult.stderr}`);
  }
  const emailResult = await run("git", ["config", "--global", "user.email", email]);
  if (!emailResult.ok) {
    throw new Error(`Couldn't set your commit email in git: ${emailResult.stderr}`);
  }
}

export async function getGlobalGitIdentity(): Promise<{ name: string; email: string }> {
  const name = await run("git", ["config", "--global", "user.name"]);
  const email = await run("git", ["config", "--global", "user.email"]);
  return { name: name.stdout, email: email.stdout };
}
