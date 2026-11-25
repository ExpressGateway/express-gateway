'use strict';

const passport = require('passport');
const path = require('path');

module.exports.loginForm = (request, response) => response.render(path.join(__dirname, 'views/login'));

module.exports.login = (request, response, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) return next(err);
    if (!user) return response.redirect('/login');

    const returnTo = request.session.returnTo;
    request.logIn(user, err => {
      if (err) return next(err);
      response.redirect(returnTo || '/');
    });
  })(request, response, next);
};

module.exports.logout = (request, response, next) => {
  request.logout(err => {
    if (err) return next(err);
    response.redirect('/');
  });
};
