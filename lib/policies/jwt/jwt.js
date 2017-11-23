const fs = require('fs');
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const extractors = require('./extractors');
const services = require('../../services');

module.exports = function (params) {
  const secret = params.secretFile ? fs.readFileSync(params.secretFile) : params.secret;
  const extractor = extractors[params.jwtExtractor](params.jwtExtractorField);

  passport.use(new JWTStrategy({
    secretOrKey: secret,
    jwtFromRequest: extractor,
    audience: params.audience,
    issuer: params.issuer
  }, (jwtPayload, done) => {
    if (!jwtPayload || !jwtPayload.iss) {
      return done(null, false);
    }

    services.credential.getCredential(jwtPayload.iss, 'jwt')
      .then(credential => {
        if (!credential || !credential.isActive) {
          return false;
        }
        return credential.consumerId;
      })
      .then(services.auth.validateConsumer)
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
