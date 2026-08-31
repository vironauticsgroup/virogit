const { run } = require('./exec');
const { createGitLib, expandHome } = require('./core');

const { getGlobalConfig, setGlobalConfig } = createGitLib(run);

module.exports = {
  getGlobalConfig,
  setGlobalConfig,
  expandHome,
};
