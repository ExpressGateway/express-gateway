const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'List all credentials for Consumer (User or App)',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list -c 7498d1a9-7f90-4438-a9b7-0ba4c6022353`)
          .string(['c'])
          .describe('c', 'Consumer ID: can be User ID or username or app ID')
          .alias('c', 'consumerId').nargs('c', 1)
          .group(['c'], 'Options:')
    });
  }

  prompting () {
    return this.admin.credentials.list(this.argv.consumerId)
      .then(data => {
        const credentials = data.credentials;
        if (!credentials || !credentials.length) {
          this.log.error(`Consumer ${this.argv.consumerId} has no credentials`);
        } else {
          credentials.forEach(app => {
            if (this.argv.q) {
              this.stdout(app.id);
            } else {
              this.stdout(JSON.stringify(app, null, 2));
            }
          });
        };
      })
      .catch(err => {
        this.log.error(err.message);
      });
  }
};
