require('./registerStrategy')();
const passport = require('passport');

module.exports = function (actionParams) {
  return function (req, res, next) {
    actionParams.session = false;
    passport.authenticate('basic', actionParams, actionParams.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
