let rest = require('../../lib/rest');
let adminClient = require('../../lib/admin');
module.exports = function () {
  return {
    start () {
      return rest().then((srv) => {
        this.adminSrv = srv;
        let srvInfo = srv.address();
        this.admin = adminClient({
          hostname: srvInfo.address,
          port: srvInfo.port
        });
        return this.adminSrv;
      });
    },
    stop () {
      this.adminSrv && this.adminSrv.close();
      return this.reset();
    },
    reset () {
      const db = require('../../lib/db')();
      return db.flushdbAsync();
    }
  };
};
