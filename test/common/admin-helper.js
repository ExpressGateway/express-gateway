const rest = require('../../lib/rest');
const adminClient = require('express-gateway-admin-api-client');
module.exports = function () {
  return {
    start ({config} = {}) {
      return rest({config}).then((srv) => {
        this.adminSrv = srv;
        const srvInfo = srv.address();
        this.admin = adminClient({
          baseUrl: `http://${srvInfo.address}:${srvInfo.port}`
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
