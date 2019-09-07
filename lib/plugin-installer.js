const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const util = require('util');
const YAWN = require('yawn-yaml/cjs');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

class PluginInstaller {
  constructor (options) {
    options = options || {};
    this.packageName = options.packageName || null;
    this.pluginManifest = options.pluginManifest || null;
    this.config = options.config;
  }

  static get PACKAGE_PREFIX () {
    return 'express-gateway-plugin-';
  }

  static create (options) {
    return new PluginInstaller(options);
  }

  runNPMInstallation ({ packageSpecifier, cwd, env }) {
    return new Promise((resolve, reject) => {
      // manually spawn npm
      // use --parseable flag to get tab-delimited output
      // forward sterr to process.stderr
      // capture stdout to get package name

      let pluginPath = null;

      const installArgs = [
        'install', packageSpecifier,
        '--cache-min', 24 * 60 * 60,
        '--parseable',
        '--save'
      ];

      const installOpts = {
        cwd: cwd || process.cwd(),
        env: env || process.env,
        stdio: ['ignore', 'pipe', 'inherit']
      };

      const npmCommand = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
      const npmInstall = spawn(npmCommand, installArgs, installOpts);

      npmInstall.on('error', _ => {
        reject(new Error('Cannot install', packageSpecifier));
      });

      const bufs = [];
      let len = 0;
      npmInstall.stdout.on('readable', () => {
        const buf = npmInstall.stdout.read();

        if (buf) {
          bufs.push(buf);
          len += buf.length;
        }
      });

      npmInstall.stdout.on('end', () => {
        const lines = Buffer.concat(bufs, len)
          .toString()
          .trim()
          .split('\n');

        const line = lines[lines.length - 1];

        if (line.indexOf('\t') > -1) {
          // npm >= 5
          const output = lines[lines.length - 1].split('\t');

          if (output.length < 4) {
            reject(new Error('Cannot parse npm output while installing plugin.'));
            return;
          }

          this.packageName = output[1];
          pluginPath = path.join(cwd, output[3]);
        } else {
          // npm < 5
          this.packageName = path.basename(line);
          pluginPath = line;
        }
      });

      npmInstall.on('exit', () => {
        if (pluginPath) {
          this.pluginManifest = require(pluginPath);

          resolve({
            packageName: this.packageName,
            pluginManifest: this.pluginManifest
          });
        }
      });
    });
  }

  get existingPluginOptions () {
    const config = this.config || require('./config');
    const systemConfig = config.systemConfig;

    const name = this.pluginKey;

    const existingPluginOptions =
      systemConfig.plugins && systemConfig.plugins[name]
        ? systemConfig.plugins[name] : {};

    return existingPluginOptions;
  }

  get pluginKey () {
    let name = this.pluginManifest.name || this.packageName;

    if (!this.pluginManifest.name &&
      this.packageName.startsWith(PluginInstaller.PACKAGE_PREFIX)) {
      name = this.packageName.substr(PluginInstaller.PACKAGE_PREFIX.length);
    }

    return name;
  }

  updateConfigurationFiles ({
    pluginOptions,
    enablePlugin,
    addPoliciesToWhitelist
  }) {
    // WARNING (kevinswiber): Updating YAML while maintaining presentation
    // style is not easy.  We're using the YAWN library here, which has
    // a decent approach given the current state of available YAML parsers,
    // but it's far from perfect.  Take a look at existing YAWN issues
    // before making any optimizations.  If any section of this code looks
    // ugly or inefficient, it may be that way for a reason (or maybe not).
    //
    // ¯\_(ツ)_/¯
    //
    // https://github.com/mohsen1/yawn-yaml/issues

    if (!this.pluginManifest) {
      return Promise.reject(
        new Error('Configuration files require a plugin manifest.'));
    }

    let name = this.pluginManifest.name || this.packageName;

    if (!this.pluginManifest.name &&
      this.packageName.startsWith(PluginInstaller.PACKAGE_PREFIX)) {
      name = this.packageName.substr(PluginInstaller.PACKAGE_PREFIX.length);
    }

    const maybeWriteSystemConfig = () => {
      if (enablePlugin) {
        return this._generateSystemConfigData(name, pluginOptions)
          .then(({ systemConfigPath, output }) =>
            writeFile(systemConfigPath, output));
      }

      return Promise.resolve();
    };

    const maybeWriteGatewayConfig = () => {
      if (addPoliciesToWhitelist) {
        const policyNames = this.pluginManifest.policies || [];

        return this._generateGatewayConfigData(policyNames)
          .then(({ gatewayConfigPath, output }) =>
            writeFile(gatewayConfigPath, output));
      }

      return Promise.resolve();
    };

    return maybeWriteSystemConfig()
      .then(maybeWriteGatewayConfig);
  }

  _updateYAML (obj, yawn) {
    yawn.json = obj;
    return yawn.json;
  }

  _generateSystemConfigData (name, pluginOptions) {
    const config = this.config || require('./config');
    const isJSON = config.systemConfigPath.toLowerCase().endsWith('.json');
    const isYAML = !isJSON;

    return readFile(config.systemConfigPath)
      .then(systemConfig => {
        // YAML-specific variables
        let yawn = null;
        let oldLength = null;

        let obj = null;

        if (isYAML) {
          yawn = new YAWN(systemConfig.toString());
          obj = Object.assign({}, yawn.json);

          oldLength = obj.plugins ? null : yawn.yaml.length;
        } else {
          obj = JSON.parse(systemConfig.toString());
        }

        let plugins = obj.plugins || {};

        if (!plugins.hasOwnProperty(name)) {
          plugins[name] = {};
        }

        plugins[name].package = this.packageName;
        obj.plugins = plugins;

        if (isYAML) {
          obj = this._updateYAML(obj, yawn);
        }

        if (pluginOptions) {
          // YAWN needs to be updated by smallest atomic unit
          Object.keys(pluginOptions).forEach(key => {
            plugins[name][key] = pluginOptions[key];
            obj.plugins = plugins;

            if (isYAML) {
              obj = this._updateYAML(obj, yawn);
              plugins = obj.plugins;
            }
          });
        }

        if (isYAML && oldLength) {
          // add a line break before inserting a new plugins mapping
          yawn.yaml = yawn.yaml.substr(0, oldLength - 1) + os.EOL + yawn.yaml.substr(oldLength - 1);
        }

        const output = isYAML ? yawn.yaml.trim() : JSON.stringify(obj, null, 2);

        return {
          systemConfigPath: config.systemConfigPath,
          output
        };
      });
  }

  _generateGatewayConfigData (policyNames) {
    const config = this.config || require('./config');
    const isJSON =
      config.gatewayConfigPath.toLowerCase().endsWith('.json');
    const isYAML = !isJSON;

    return readFile(config.gatewayConfigPath)
      .then(gatewayConfig => {
        // YAML-specific variable
        let yawn = null;

        let obj = null;

        if (isYAML) {
          yawn = new YAWN(gatewayConfig.toString());
          obj = Object.assign({}, yawn.json);
        } else {
          obj = JSON.parse(gatewayConfig.toString());
        }

        const policies = obj.policies || [];

        // YAWN reverses arrays.  ¯\_(ツ)_/¯
        const correctedPolicyNames = isYAML ? policyNames.reverse() : policyNames;

        correctedPolicyNames.forEach(policy => {
          if (policies.indexOf(policy) === -1) {
            policies.push(policy);
          }
        });

        obj.policies = policies;

        if (isYAML) {
          yawn.json = obj;
        }

        const output = isYAML ? yawn.yaml.trim() : JSON.stringify(obj, null, 2);

        return {
          gatewayConfigPath: config.gatewayConfigPath,
          output
        };
      });
  }
}

module.exports = PluginInstaller;
