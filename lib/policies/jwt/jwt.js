const fs = require('fs');
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const extractors = require('./extractors');
const { auth } = require('../../services');

module.exports = function (params) {
  const secret = params.secretFile ? fs.readFileSync(params.secretFile) : params.secret;

  passport.use(new JWTStrategy({
    secretOrKey: secret,
    jwtFromRequest: extractors[params.jwtExtractor](params.jwtExtractorField),
    audience: params.audience,
    issuer: params.issuer
  }, (jwtPayload, done) => {
    if (!jwtPayload) {
      return done(null, false);
    }

    auth.authenticateCredential(jwtPayload.iss, params.secret, 'jwt')
      .then((consumer) => {
        if (!consumer) {
          return done(null, false);
        }

        return done(null, consumer);
      }).catch(done);
  }));

  return function (req, res, next) {
    params.session = false;
    passport.authenticate('jwt', params, params.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
