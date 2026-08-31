import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Profile {
  name: string;
  gitName: string;
  gitEmail: string;
  sshKeyPath: string;
  githubUsername: string;
}

interface StoreShape {
  profiles: Profile[];
  activeProfile: string | null;
}

const configDir = join(homedir(), ".virogit");
const configPath = join(configDir, "config.json");

function ensureConfigDir(): void {
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

function load(): StoreShape {
  if (!existsSync(configPath)) {
    return { profiles: [], activeProfile: null };
  }
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as StoreShape;
}

function save(store: StoreShape): void {
  ensureConfigDir();
  writeFileSync(configPath, JSON.stringify(store, null, 2) + "\n", "utf-8");
}

export function listProfiles(): Profile[] {
  return load().profiles;
}

export function getProfile(name: string): Profile | undefined {
  return load().profiles.find((p) => p.name === name);
}

export function upsertProfile(profile: Profile): void {
  const store = load();
  const index = store.profiles.findIndex((p) => p.name === profile.name);
  if (index === -1) {
    store.profiles.push(profile);
  } else {
    store.profiles[index] = profile;
  }
  save(store);
}

export function removeProfile(name: string): boolean {
  const store = load();
  const index = store.profiles.findIndex((p) => p.name === name);
  if (index === -1) return false;
  store.profiles.splice(index, 1);
  if (store.activeProfile === name) {
    store.activeProfile = null;
  }
  save(store);
  return true;
}

export function getActiveProfileName(): string | null {
  return load().activeProfile;
}

export function setActiveProfileName(name: string | null): void {
  const store = load();
  store.activeProfile = name;
  save(store);
}

export function getConfigPath(): string {
  return configPath;
}
