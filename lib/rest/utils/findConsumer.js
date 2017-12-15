const usersSrv = require('../../services').user;
const appsSrv = require('../../services').application;

module.exports = function findConsumer (id) {
  return usersSrv
    .find(id)
    .then(user => {
      if (user) {
        return user;
      }
      return usersSrv.get(id);
    })
    .then(user => {
      if (user) {
        return user;
      }
      return appsSrv.get(id);
    });
};
