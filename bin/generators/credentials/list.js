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
          .boolean(['a'])
          .describe('c', 'Consumer ID: can be User ID or username or app ID')
          .describe('a', 'List all activated and deactivated credentials')
          .alias('c', 'consumerId').nargs('c', 1)
          .alias('a', 'all')
          .group(['c', 'a'], 'Options:')
    });
  }

  prompting () {
    const {consumerId, all} = this.argv;
    return this.admin.credentials.list(consumerId, all)
      .then(data => {
        const credentials = data.credentials;
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
      .catch(err => {
        this.log.error(err.message);
      });
  }
};
