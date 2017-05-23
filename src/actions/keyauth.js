'use strict';

const passport = require('passport');
const LocalAPIKeyStrategy = require('passport-localapikey').Strategy;
const logger = require('../log').gateway;

function createKeyauthMiddleware() {

	passport.use(new LocalAPIKeyStrategy((keyauth, done) => {
		done(null, keyauth);
	}));

  return function keyauthMiddleware(req, res, next) {
		logger.debug('key authenticating');
		passport.authenticate('localapikey', (err, user, info) => {
			if (err) {
				return next(err);
			}
			if (!user) {
				logger.debug('key authentication failed: ${info.message}');
				res.status(401).send({
					error: {
						name: 'Unauthorized',
						message: info.message,
						status: 401,
						statusCode: 401
					}
				});
				return;
			}
			return next();
		})(req, res, next);
	};
}

module.exports = {
  keyauth: createKeyauthMiddleware
};
