const applicationsSrv = require('../../services').application;

module.exports = function findApplication (id) {
  return applicationsSrv
    .get(id)
    .then((application) => {
      if (application) {
        return application;
      }

      return applicationsSrv.find(id);
    });
};
