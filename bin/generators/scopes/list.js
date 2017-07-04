const eg = require('../../eg');
const request = require('superagent');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'list scopes',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list`)
          .string('p')
          .group(['no-color', 'h'], 'Options:')
    });
  }

  initializing () {
  }

  prompting () {
    return request
            .get(this.adminApiBaseUrl + '/scopes')
            .then(res => {
              let scopes = res.body && res.body.scopes;
              this.log(scopes);
              this.eg.exit();
            })
            .catch(err => {
              this.log.error(err.message);
              this.eg.exit();
            });
  }
};
