const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const yeoman = require('yeoman-environment');

exports.bootstrap = (eg, adapter) => {
  const env = yeoman.createEnv();

  env.eg = eg;

  if (adapter) {
    env.adapter = adapter;
  }

  let program = yargs;

  const generatorsPath = path.join(__dirname, 'generators');

  const prefix = 'express-gateway';

  let commands = [];
  let subCommands = {};

  const dirs = fs
    .readdirSync(generatorsPath)
    .filter(dir => {
      if (dir[0] === '.') {
        return false;
      }

      const stat = fs.statSync(path.join(generatorsPath, dir));
      return stat.isDirectory();
    });

  dirs.forEach(dir => {
    const directoryPath = path.join(generatorsPath, dir);

    const files = fs
      .readdirSync(directoryPath)
      .filter(file => {
        if (file[0] === '.') {
          return false;
        }

        const stat = fs.statSync(path.join(directoryPath, file));
        return stat.isFile();
      });

    files.forEach(file => {
      if (file === 'index.js') {
        const namespace = `${prefix}:${dir}`;
        commands.push({ namespace: namespace, path: directoryPath });
        env.register(directoryPath, namespace);
        return;
      }

      const filePath = path.join(directoryPath, file);
      const namespace = `${prefix}:${dir}:${file.slice(0, -3)}`;

      if (!subCommands.hasOwnProperty(dir)) {
        subCommands[dir] = [];
      }

      subCommands[dir].push({
        namespace: namespace,
        path: filePath
      });

      env.register(filePath, namespace);
    });
  });

  const commandAliases = {};
  // Ex: {
  //       'user': 'users',
  //       'users': 'users'
  //     }
  commands.forEach(command => {
    const generator = env.create(command.namespace);

    let aliases = generator._configuration.command;
    if (!Array.isArray(aliases)) {
      aliases = [aliases];
    }

    aliases = aliases.map(alias => {
      return alias.split(/\s/)[0];
    });

    const original = aliases[0];
    const rest = aliases.splice(1);

    commandAliases[original] = original;

    rest.forEach(a => {
      commandAliases[a] = original;
    });

    program.command(generator._configuration);
  });

  const subCommandAliases = {};
  // Ex: {
  //       'users': {
  //         'rm': 'remove',
  //         'remove: 'remove'
  //       }
  //     }
  Object.keys(subCommands).forEach(key => {
    const subCommandArray = subCommands[key];

    subCommandAliases[key] = {};

    subCommandArray.forEach(s => {
      const generator = env.create(s.namespace);

      let aliases = generator._configuration.command;

      if (!Array.isArray(aliases)) {
        aliases = [aliases];
      }

      aliases = aliases.map(alias => {
        return alias.split(/\s/)[0];
      });

      const original = aliases[0];
      const rest = aliases.splice(1);

      subCommandAliases[key][original] = original;

      rest.forEach(a => {
        subCommandAliases[key][a] = original;
      });
    });
  });

  env.commandAliases = [commandAliases, subCommandAliases];

  program
    .usage('Usage: $0 <command> [options]')
    .demandCommand()
    .recommendCommands()
    .strict()
    .alias('h', 'help')
    .help()
    .version()
    .global('version', false)
    .wrap(Math.min(90, yargs.terminalWidth()));

  return { program, env };
};
