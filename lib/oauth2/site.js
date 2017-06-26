'use strict';

const passport = require('passport');
const path = require('path');

module.exports.loginForm = (request, response) => response.render(path.join(__dirname, 'views/login'));

module.exports.login = passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' });

module.exports.logout = (request, response) => {
  request.logout();
  response.redirect('/');
};
