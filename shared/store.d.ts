export interface Profile {
  name: string;
  gitName: string;
  gitEmail: string;
  sshKeyPath: string;
  githubUsername: string;
}

export interface StoreOptions {
  /** Defaults to ~/.virogit/config.json */
  configPath?: string;
  /** Called with a human-readable message when the store recovers from a problem (e.g. corrupted JSON) instead of throwing. */
  onWarning?: (message: string) => void;
}

export interface StoreApi {
  listProfiles(): Profile[];
  getProfile(name: string): Profile | undefined;
  upsertProfile(profile: Profile): void;
  removeProfile(name: string): boolean;
  getActiveProfileName(): string | null;
  setActiveProfileName(name: string | null): void;
  getConfigPath(): string;
  onChange(callback: () => void): () => void;
  watch(callback: () => void): () => void;
}

export function createStore(options?: StoreOptions): StoreApi;
