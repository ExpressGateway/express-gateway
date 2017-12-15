const usersSrv = require('../../services').user;

module.exports = function findConsumer (id) {
  return usersSrv
    .find(id)
    .then(user => {
      if (user) {
        return user;
      }
      return usersSrv.get(id);
    });
};
