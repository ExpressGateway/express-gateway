const fs = require('fs');
const uuid = require('uuid/v4');
const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const extractors = require('./extractors');
const services = require('../../services');

module.exports = function (params) {
  const strategyName = `jwt-${uuid()}`;
  const secretOrKey = params.secretOrPublicKeyFile ? fs.readFileSync(params.secretOrPublicKeyFile) : params.secretOrPublicKey;
  const extractor = extractors[params.jwtExtractor](params.jwtExtractorField);

  passport.use(strategyName, new JWTStrategy({
    secretOrKey,
    jwtFromRequest: extractor,
    audience: params.audience,
    issuer: params.issuer,
    algorithms: params.algorithms
  }, (jwtPayload, done) => {
    if (!jwtPayload) {
      return done(null, false);
    }

    if (!params.checkCredentialExistence) {
      return done(null, jwtPayload);
    }

    if (!jwtPayload.sub) {
      return done(null, false);
    }

    services.credential.getCredential(jwtPayload.sub, 'jwt')
      .then(credential => {
        if (!credential || !credential.isActive) {
          throw new Error('CREDENTIAL_NOT_FOUND');
        }
        return credential.consumerId;
      })
      .then(services.auth.validateConsumer)
      .then((consumer) => {
        if (!consumer) {
          return done(null, false);
        }

        return done(null, consumer);
      }).catch((err) => {
        if (err.message === 'CREDENTIAL_NOT_FOUND') {
          return done(null, false);
        }
        return done(err);
      });
  }));

  params.session = false;
  return function (req, res, next) {
    passport.authenticate(strategyName, params, params.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
