import type { RunFn } from './gh';

export function normalizeKey(raw: string): string;
export function findLocalKeysMatchingRemote(remoteKeys: string[]): string[];

export interface SshLib {
  generateSshKey(keyPath: string, comment: string): Promise<void>;
  loadSshKey(sshKeyPath: string): Promise<void>;
  listLoadedKeys(): Promise<string[]>;
}

export function createSshLib(run: RunFn): SshLib;
