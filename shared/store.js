const fs = require('fs');
const os = require('os');
const path = require('path');
const { acquireLock } = require('./lock');

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.virogit');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, 'config.json');

function noop() {}

/**
 * Creates a profile store bound to a config file (defaults to ~/.virogit/config.json, the
 * file both the CLI and the VS Code extension read/write, so profiles created in one show up
 * in the other). Every write is guarded by a lock file so two processes writing at once can't
 * silently drop each other's change, and a corrupted config file is backed up and replaced
 * with an empty store instead of throwing.
 */
function createStore(options = {}) {
  const configPath = options.configPath || DEFAULT_CONFIG_PATH;
  const configDir = path.dirname(configPath);
  const lockPath = `${configPath}.lock`;
  const onWarning = options.onWarning || noop;

  const changeListeners = new Set();
  const watchListeners = new Set();
  let watcher = null;
  let watchTimer = null;

  function notifyChange() {
    for (const callback of changeListeners) callback();
  }

  function ensureConfigDir() {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  function load() {
    if (!fs.existsSync(configPath)) {
      return { profiles: [], activeProfile: null };
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    try {
      return JSON.parse(raw);
    } catch {
      const backupPath = `${configPath}.corrupted-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      try {
        fs.renameSync(configPath, backupPath);
        onWarning(
          `virogit: "${configPath}" wasn't valid JSON, so it's been backed up to "${backupPath}" and virogit is starting from an empty profile list.`
        );
      } catch (error) {
        onWarning(
          `virogit: "${configPath}" wasn't valid JSON and couldn't be backed up (${error.message}). Starting from an empty profile list.`
        );
      }
      return { profiles: [], activeProfile: null };
    }
  }

  function save(store) {
    ensureConfigDir();
    const release = acquireLock(lockPath);
    try {
      fs.writeFileSync(configPath, JSON.stringify(store, null, 2) + '\n', 'utf-8');
    } finally {
      release();
    }
    notifyChange();
  }

  function listProfiles() {
    return load().profiles;
  }

  function getProfile(name) {
    return load().profiles.find((p) => p.name === name);
  }

  function upsertProfile(profile) {
    const store = load();
    const index = store.profiles.findIndex((p) => p.name === profile.name);
    if (index === -1) {
      store.profiles.push(profile);
    } else {
      store.profiles[index] = profile;
    }
    save(store);
  }

  function removeProfile(name) {
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

  function getActiveProfileName() {
    return load().activeProfile;
  }

  function setActiveProfileName(name) {
    const store = load();
    store.activeProfile = name;
    save(store);
  }

  function getConfigPath() {
    return configPath;
  }

  /** Subscribe to changes made through THIS store instance's own writes. Returns an unsubscribe function. */
  function onChange(callback) {
    changeListeners.add(callback);
    return () => changeListeners.delete(callback);
  }

  function ensureWatcher() {
    if (watcher) return;
    try {
      ensureConfigDir();
      watcher = fs.watch(configDir, { persistent: false }, (_eventType, filename) => {
        if (filename && filename !== path.basename(configPath)) return;
        clearTimeout(watchTimer);
        watchTimer = setTimeout(() => {
          for (const callback of watchListeners) callback();
        }, 100);
      });
    } catch {
      // Best-effort: some filesystems/platforms don't support fs.watch reliably. Callers that
      // never call watch() (e.g. the one-shot CLI) never hit this path at all.
    }
  }

  /**
   * Subscribe to changes made to the config file by ANY process (another VS Code window, or
   * the CLI in a terminal), not just this store instance's own writes. Debounced ~100ms since
   * a single write can fire more than one fs event. Returns an unsubscribe function.
   */
  function watch(callback) {
    ensureWatcher();
    watchListeners.add(callback);
    return () => {
      watchListeners.delete(callback);
      if (watchListeners.size === 0 && watcher) {
        watcher.close();
        watcher = null;
      }
    };
  }

  return {
    listProfiles,
    getProfile,
    upsertProfile,
    removeProfile,
    getActiveProfileName,
    setActiveProfileName,
    getConfigPath,
    onChange,
    watch,
  };
}

module.exports = { createStore };
