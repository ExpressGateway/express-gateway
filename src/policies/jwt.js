'use strict';

const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const debug = require('debug')('gateway:oauth2');

function createJwtMiddleware(params) {
  let jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeader(),
    issuer: params.issuer,
    audience: params.audience,
    secretOrKey: params.key,
    algorithms: params.algorithms
  };

  passport.use(new JwtStrategy(jwtOptions, (jwt, done) => {
    done(null, jwt);
  }));
  return function jwtMiddleware(req, res, next) {
    debug('authenticating with JWT token');
    passport.authenticate('jwt', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        debug(`authentication failed: ${info.message}`);
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
  jwt: createJwtMiddleware
};
