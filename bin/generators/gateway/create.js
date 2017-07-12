const chalk = require('chalk');
const path = require('path');
const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.type = null;

    this.configureCommand({
      command: 'create <name> [options]',
      description: 'Create a gateway',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} create [options]`)
          .option('t', {
            alias: 'type',
            describe: 'Type of gateway template to generate',
            demandOption: false,
            choices: ['basic', undefined]
          })
          .group('t', 'Options:')
    });
  }

  prompting () {
    if (this.argv.type) {
      this.type = this.argv.type;
      return;
    }

    const questions = [
      {
        type: 'list',
        name: 'type',
        message: 'What type of gateway do you want to create?',
        choices: [
          {
            name: 'Basic Gateway Configuration',
            value: 'basic'
          }
        ]
      }
    ];

    return this.prompt(questions)
      .then(props => {
        this.type = props.type;
      });
  }

  writing () {
    this.sourceRoot(path.join(this.sourceRoot(), this.type));
    this.destinationRoot(this.argv.name);

    let packageJSON = this.fs.readJSON(this.templatePath('./package.json'));
    packageJSON.name = this.argv.name;

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
    console.log('');
    console.log(`To start ${chalk.green(this.argv.name)}, run the following commands:`);
    console.log(`    cd ${this.argv.name} && npm start`);
  }
};
