const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'create [options] <scope..>',
      desc: 'Create a scope',
      builder: yargs =>
        yargs
        .usage(`Usage: $0 ${process.argv[2]} create [options] <scope..>`)
        .example(`$0 ${process.argv[2]} create scope_name`)
        .group(['h'], 'Options:')
        .check((args, opts) => {
          return true;
        })
    });
  }

  prompting () {
    const argv = this.argv;
    const scopes = Array.isArray(argv.scope)
      ? argv.scope
      : [argv.scope];

    return new Promise((resolve, reject) => {
      const removalCount = scopes.length;
      let removalsCompleted = 0;

      let errors = [];
      scopes.forEach((scope) => {
        return request
          .post(this.adminApiBaseUrl + '/scopes')
          .send({
            scope: argv.scope
          })
          .then(res => {
            removalsCompleted++;
            this.log.ok(`Created scope ${scope}`);
            if (removalsCompleted === removalCount) {
              this.eg.exit();
              if (errors.length === 0) {
                resolve();
              } else {
                reject(errors);
              }
            }
            return res.body;
          })
          .catch(err => {
            removalsCompleted++;
            this.log.error(err.message);
            errors.push(err);
            if (removalsCompleted === removalCount) {
              this.eg.exit();
              reject(errors);
            }
          });
      });
    });
  };
};
