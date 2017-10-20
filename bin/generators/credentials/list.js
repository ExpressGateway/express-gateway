const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor(args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'List Consumer (User or App) credentials',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list -c 7498d1a9-7f90-4438-a9b7-0ba4c6022353`)
          .string(['c', 'f'])
          .describe('c', 'Consumer ID: can be User ID or username or app ID')
          .describe('f', 'Comma separated list of credential state (active, archived), default: active')
          .alias('c', 'consumerId').nargs('c', 1).required('c')
          .alias('f', 'filter')
          .group(['c', 'i'], 'Options:')
    });
  }

  prompting() {
    const { consumerId, filter } = this.argv;

    return this.admin.credentials.list(consumerId, filter)
      .then(data => {
        const credentials = { data };
        if (!credentials || !credentials.length) {
          this.log.error(`Consumer ${consumerId} has no credentials`);
          return;
        }
        credentials.forEach(credential => {
          if (this.argv.q) {
            this.stdout(credential.id);
          } else {
            this.stdout(JSON.stringify(credential, null, 2));
          }
        });
      })
      .catch(err => this.log.error(err.message));
  }
};
