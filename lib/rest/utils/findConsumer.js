const findUser = require('./findUser');
const appsSrv = require('../../services').application;

module.exports = function findConsumer (id) {
  return findUser(id)
    .then(user => {
      if (user) {
        return user;
      }
      return appsSrv.get(id);
    });
};
