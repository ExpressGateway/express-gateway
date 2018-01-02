const userService = require('../../services/consumers/user.service');
const appService = require('../../services/consumers/application.service');

module.exports = function findConsumer (id) {
  return userService.findByUsernameOrId(id)
    .then(user => {
      if (user) {
        return user;
      }
      return appService.findByNameOrId(id);
    });
};
