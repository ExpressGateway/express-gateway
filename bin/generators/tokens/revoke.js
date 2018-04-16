const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'revoke [options] <tokens..>',
      desc: 'revokes an oauth2 token',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} revoke [options] <tokens..>`)
          .positional('tokens', { type: 'array' })
    });
  }

  prompting () {
    const argv = this.argv;
    return Promise.all(argv.tokens.map(token => {
      return this.admin.tokens.revoke(token)
        .then(res => {
          if (argv.q) {
            this.stdout(token);
          } else {
            this.log.ok(`Access token has been revoked: ${token}`);
          }
        })
        .catch(err => {
          this.log.error(err.message);
        });
    }));
  }
};
