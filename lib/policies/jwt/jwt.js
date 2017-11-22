const fs = require('fs');
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const extractors = require('./extractors');
const { credential } = require('../../services');

module.exports = function (params) {
  const secret = params.secretFile ? fs.readFileSync(params.secretFile) : params.secret;

  passport.use(new JWTStrategy({
    secretOrKey: secret,
    jwtFromRequest: extractors[params.jwtExtractor](params.jwtExtractorField),
    audience: params.audience,
    issuer: params.issuer
  }, (jwtPayload, done) => {
    // Verify that there's something in the payload.

    if (!jwtPayload) {
      return done(null, false);
    }

    // Verify the credential is existing
    credential.getCredential(jwtPayload.iss, 'jwt')
      .then((credential) => {
        if (!credential) {
          return done(null, false);
        }

        return done(null, jwtPayload);
      });
  }));

  return function (req, res, next) {
    params.session = false;
    passport.authenticate('jwt', params, params.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
