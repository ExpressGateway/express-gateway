let admin = require('../../lib/admin');
let adminSdk = require('../../lib/sdk');
module.exports = function () {
  return {
    start () {
      return admin().then((srv) => {
        this.adminSrv = srv;
        let srvInfo = srv.address();
        this.sdk = adminSdk({
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
