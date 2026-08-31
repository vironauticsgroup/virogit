export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export type RunFn = (command: string, args: string[]) => Promise<RunResult>;

export interface GhProfile {
  login: string;
  name: string | null;
  email: string | null;
}

export function isMissingPublicKeyScopeError(message: string): boolean;

export interface GhLib {
  getGhProfile(): Promise<GhProfile>;
  listRemoteSshKeys(): Promise<string[]>;
  addSshKeyToGithub(pubKeyPath: string, title: string): Promise<void>;
  switchGhAccount(username: string, hostname?: string): Promise<void>;
  getActiveGhAccount(hostname?: string): Promise<string | null>;
}

export function createGhLib(run: RunFn): GhLib;
