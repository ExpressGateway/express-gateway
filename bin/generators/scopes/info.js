const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info [options] <scope>',
      desc: 'Show details for a single application',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info [options] <scope>`)
          .group(['h'], 'Options:')
    });
  }

  prompting () {
    const argv = this.argv;

    return request
      .get(this.adminApiBaseUrl + '/scopes/' + argv.scope)
      .then(res => {
        let scope = res.body.scope;
        if (scope) {
          this.log(scope);
        }

        this.eg.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        this.eg.exit();
      });
  }
};
