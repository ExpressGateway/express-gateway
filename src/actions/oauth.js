'use strict';

const passport = require('passport');

function oauth () {
  return passport.authenticate('bearer');
}

module.exports = {
  oauth
};
