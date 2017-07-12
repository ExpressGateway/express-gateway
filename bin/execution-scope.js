const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const findUp = require('find-up');

exports.executeInScope = env => {
  let rootPath = findUp.sync('.yo-rc.json', {
    cwd: env.cwd
  });

  rootPath = rootPath ? path.dirname(rootPath) : env.cwd;

  if (!rootPath) {
    return;
  }

  if (!process.env.EG_CONFIG_DIR) {
    process.env.EG_CONFIG_DIR = path.join(rootPath, 'config');
  }

  const localBin = path.join(rootPath, 'node_modules', '.bin', 'eg');

  // intercept CLI command and forward to local installation
  if (!process.env.EG_LOCAL_EXEC && fs.existsSync(localBin)) {
    const childEnv = process.env;
    childEnv.EG_LOCAL_EXEC = true;

    try {
      execFileSync(localBin, process.argv.slice(2), {
        cwd: env.cwd,
        env: childEnv,
        stdio: 'inherit'
      });
    } catch (err) {
      process.exit(err.status);
    }

    process.exit();
  }
};
