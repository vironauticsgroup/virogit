import { createStore, type Profile, type StoreApi } from "../shared/store.js";

export type { Profile, StoreApi };

const store: StoreApi = createStore({ onWarning: (message) => console.warn(message) });

export const {
  listProfiles,
  getProfile,
  upsertProfile,
  removeProfile,
  getActiveProfileName,
  setActiveProfileName,
  getConfigPath,
} = store;
