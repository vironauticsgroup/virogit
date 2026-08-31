import { run } from "./exec.js";
import { createSshLib, findLocalKeysMatchingRemote, normalizeKey } from "../shared/ssh.js";

export { findLocalKeysMatchingRemote, normalizeKey };
export const { generateSshKey, loadSshKey, listLoadedKeys } = createSshLib(run);
