const eg = require('../../eg');

const filtersTable = {
  active: (consumer) => consumer.isActive,
  archived: (consumer) => !filtersTable.active(consumer)
};

const filterTypes = Object.keys(filtersTable);

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'List Consumer (User or App) credentials',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list -c 7498d1a9-7f90-4438-a9b7-0ba4c6022353`)
          .group(['c', 'f'], 'Options:')
          .string('c').alias('c', 'consumerId').nargs('c', 1).required('c')
          .describe('c', 'Consumer ID: can be User ID or username or app ID')

          .array('f')
          .describe('f', 'List of credential state (active, archived), default: active')
          .alias('f', 'filter')
          .default('f', ['active'])
          .coerce('f', (filters) =>
            filters.map((filter) => {
              if (filterTypes.indexOf(filter) === -1) {
                throw new Error(`Unrecognised filter type: ${filter}`);
              }
              return filtersTable[filter];
            })
          )
    });
  }

  prompting () {
    const { consumerId, filter } = this.argv;
    return this.admin.credentials.list(consumerId)
      .then(data => {
        const { credentials } = data;

        if (!credentials || !credentials.length) {
          this.log.error(`Consumer ${consumerId} has no credentials`);
          return;
        }

        const filteredCredentials = [];

        filter.forEach(f => { filteredCredentials.push(...credentials.filter(f)); });

        filteredCredentials.forEach(credential => {
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
