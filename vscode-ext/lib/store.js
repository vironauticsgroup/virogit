const vscode = require('vscode');
const { createStore } = require('./core');

// Same file the `virogit` CLI reads/writes, so profiles created here show up in `virogit list`,
// and vice versa.
const store = createStore({
  onWarning: (message) => vscode.window.showWarningMessage(message),
});

module.exports = {
  listProfiles: store.listProfiles,
  getProfileByName: store.getProfile,
  upsertProfile: store.upsertProfile,
  removeProfileByName: store.removeProfile,
  getActiveProfileName: store.getActiveProfileName,
  setActiveProfileName: store.setActiveProfileName,
  onChange: store.onChange,
  watch: store.watch,
};
