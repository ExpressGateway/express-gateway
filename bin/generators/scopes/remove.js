const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['remove [options] <scope..>', 'rm'],
      desc: 'Remove a scope',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} remove [options] <scope..>`)
          .group(['h'], 'Options:')
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
        request
          .del(this.adminApiBaseUrl + '/scopes/' + scope)
          .then(res => {
            let app = res.body;
            removalsCompleted++;

            if (app) {
              if (!argv.q) {
                this.log.ok(`Removed ${scope}`);
              } else {
                this.log(app.id);
              }
            }

            if (removalsCompleted === removalCount) {
              this.eg.exit();
              if (errors.length === 0) {
                resolve();
              } else {
                reject(errors);
              }
            }
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
  }
};
