const findUser = require('./findUser');
const findApplication = require('./findApplication');

module.exports = function findConsumer (id) {
  return findUser(id)
    .then(user => {
      if (user) {
        return user;
      }
      return findApplication(id);
    });
};
