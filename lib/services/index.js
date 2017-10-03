'use strict';

const s = {};

s.authorizationCode = require('./authorization-codes/authorization-code.service.js');
s.user = require('./consumers/user.service.js');
s.application = require('./consumers/application.service.js');
s.credential = require('./credentials/credential.service.js');
s.token = require('./tokens/token.service.js');
s.auth = require('./auth.js');

module.exports = s;
