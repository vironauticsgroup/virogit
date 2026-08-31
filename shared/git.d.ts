import type { RunFn } from './gh';

export interface GitLib {
  getGlobalConfig(key: string): Promise<string | null>;
  setGlobalConfig(key: string, value: string): Promise<void>;
}

export function createGitLib(run: RunFn): GitLib;
