import { run } from "./exec.js";
import { createGitLib } from "../shared/git.js";

export const { getGlobalConfig, setGlobalConfig, clearCachedCredential } = createGitLib(run);

export async function setGlobalGitIdentity(name: string, email: string): Promise<void> {
  try {
    await setGlobalConfig("user.name", name);
  } catch (error) {
    throw new Error(`Couldn't set your commit name in git: ${(error as Error).message}`);
  }
  try {
    await setGlobalConfig("user.email", email);
  } catch (error) {
    throw new Error(`Couldn't set your commit email in git: ${(error as Error).message}`);
  }
}

export async function getGlobalGitIdentity(): Promise<{ name: string; email: string }> {
  const [name, email] = await Promise.all([getGlobalConfig("user.name"), getGlobalConfig("user.email")]);
  return { name: name ?? "", email: email ?? "" };
}
