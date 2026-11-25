const { sync: spawnSync } = require('cross-spawn');
const os = require('os');
const fs = require('fs');
const path = require('path');
const findUp = require('find-up');

exports.executeInScope = env => {
  let rootPath = findUp.sync('.yo-rc.json', {
    cwd: env.cwd
  });

  rootPath = rootPath ? path.dirname(rootPath) : env.cwd;

  if (!rootPath) {
    return false;
  }

  const configPath = path.join(rootPath, 'config');

  if (!fs.existsSync(configPath)) {
    return false;
  }

  if (!process.env.EG_CONFIG_DIR) {
    process.env.EG_CONFIG_DIR = configPath;
  }

  const binDirectory = path.join(rootPath, 'node_modules', '.bin');
  const egFile = os.platform() === 'win32' ? 'eg.cmd' : 'eg';
  const localBin = path.join(binDirectory, egFile);

  // intercept CLI command and forward to local installation
  if (!process.env.EG_LOCAL_EXEC && fs.existsSync(localBin)) {
    const result = spawnSync(localBin, process.argv.slice(2), {
      cwd: env.cwd,
      env: { ...process.env, EG_LOCAL_EXEC: 'true' },
      stdio: 'inherit'
    });
    if (result.error) throw result.error;
    process.exitCode = result.status === null ? 1 : result.status;
    return true;
  }

  return false;
};
