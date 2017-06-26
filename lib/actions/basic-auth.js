'use strict';

const passport = require('passport');

function basicAuth () {
  return passport.authenticate('basic', { session: false });
}

module.exports = {
  'basic-auth': basicAuth
};
