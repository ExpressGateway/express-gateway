const chalk = require('chalk');
const path = require('path');
const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.name = null;
    this.directory = null;
    this.type = null;

    this.configureCommand({
      command: 'create [options]',
      description: 'Create a gateway',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} create [options]`)
          .option('n', {
            alias: 'name',
            describe: 'Name of the gateway',
            demandOption: false,
            type: 'string',
          })
          .option('t', {
            alias: 'type',
            describe: 'Type of gateway template to generate',
            demandOption: false,
            type: 'string'
          })
          .option('d', {
            alias: 'dir',
            describe: 'Directory where the gateway will be installed',
            demandOption: false,
            choices: ['basic', undefined]
          })
          .group(['n', 'd', 't'], 'Options:')
    });
  }

  prompting () {
    if (this.argv.type) {
      this.type = this.argv.type;
    }

    if (this.argv.name) {
      this.name = this.argv.name
    }

    if (this.argv.directory) {
      this.directory = this.argv.directory;
    }

    const questions = [];

    const nameQuestion = {
      type: 'string',
      name: 'name',
      message: 'What\'s the name of your gateway?',
      validate: input => !!input
    };

    const directoryQuestion = {
        type: 'string',
        name: 'directory',
        message: 'Where would you like to install your gateway?',
    };

    const typeQuestion = {
        type: 'list',
        name: 'type',
        message: 'What type of gateway do you want to create?',
        choices: [
          {
            name: 'Basic Gateway Configuration',
            value: 'basic'
          }
        ]
    };

    return Promise.resolve()
      .then(() => {
        if (!this.name) {
          return this.prompt([nameQuestion])
            .then(props => {
              this.name = props.name;
            });
        }
      })
      .then(() => {
        if (!this.directory) {
          directoryQuestion.default =
            path.relative(process.cwd(), this.name);

          return this.prompt([directoryQuestion])
            .then(props => {
              this.directory = props.directory;
            });
        }
      })
      .then(() => {
        if (!this.type) {
          return this.prompt([typeQuestion])
            .then(props => {
              this.type = props.type;
            });
        }
      });
  }

  writing () {
    this.sourceRoot(path.join(this.sourceRoot(), this.type));
    this.destinationRoot(this.directory);

    let packageJSON = this.fs.readJSON(this.templatePath('./package.json'));
    packageJSON.name = this.name;

    this.fs.writeJSON(this.destinationPath('./package.json'), packageJSON);
    this.fs.writeJSON(this.destinationPath('./.yo-rc.json'), {});
    this.fs.copy(this.templatePath('server.js'), this.destinationPath('server.js'));
    this.fs.copy(this.templatePath('config'), this.destinationPath('config'));
  }

  install () {
    // TODO: Before going live, switch out the NPM install package name.
    // this.npmInstall(['express-gateway'], { save: true });
    this.npmInstall(['git+ssh://git@github.com:ExpressGateway/express-gateway.git'], { save: true });
  }

  end () {
    const relativePath = path.relative(process.cwd(), this.directory);

    console.log('');
    console.log(`To start ${chalk.green(this.name)}, run the following commands:`);
    console.log(`    cd ${relativePath} && npm start`);
  }
};
