const rest = require('../../lib/rest');
const adminClient = require('../../admin');
module.exports = function () {
  return {
    start ({ config } = {}) {
      return rest({ config }).then((srv) => {
        this.adminSrv = srv;
        const srvInfo = srv.address();
        const host = srvInfo.family === 'IPv6' ? `[${srvInfo.address}]` : srvInfo.address;
        this.admin = adminClient({
          baseUrl: `http://${host}:${srvInfo.port}`
        });
        return this.adminSrv;
      });
    },
    stop () {
      this.adminSrv && this.adminSrv.close();
      return this.reset();
    },
    reset () {
      const db = require('../../lib/db');
      return db.flushdb();
    }
  };
};
