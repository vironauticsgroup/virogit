import { execa, type Options } from "execa";

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export async function run(
  command: string,
  args: string[],
  options: Options = {}
): Promise<RunResult> {
  try {
    const result = await execa(command, args, { ...options, reject: false });
    return {
      ok: result.exitCode === 0,
      stdout: typeof result.stdout === "string" ? result.stdout.trim() : "",
      stderr: typeof result.stderr === "string" ? result.stderr.trim() : "",
    };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function commandExists(command: string): Promise<boolean> {
  const probe = process.platform === "win32" ? "where" : "which";
  const result = await run(probe, [command]);
  return result.ok;
}

export async function runInteractive(command: string, args: string[]): Promise<boolean> {
  try {
    const result = await execa(command, args, { stdio: "inherit", reject: false });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
