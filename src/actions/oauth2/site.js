'use strict';

const passport = require('passport');

module.exports.loginForm = (request, response) => response.render(__dirname + '/views/login');

module.exports.login = passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' });

module.exports.logout = (request, response) => {
  request.logout();
  response.redirect('/');
};
