'use strict';

const oauth2orize = require('oauth2orize');
const passport = require('passport');
const login = require('connect-ensure-login');
const path = require('path');

let services = require('../../services/index');
let tokenService = services.token;
let authCodeService = services.authorizationCode;
let authService = services.auth;

// Create OAuth 2.0 server
const server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated. To complete the transaction, the
// user must authenticate and approve the authorization request. Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session. Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

server.serializeClient((consumer, done) => done(null, consumer));

server.deserializeClient((consumer, done) => {
  let id = consumer.id;

  return authService.validateConsumer(id)
  .then(foundConsumer => {
    if (!foundConsumer) return done(null, false);
    return done(null, consumer);
  })
  .catch(err => done(err));
});

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources. It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes. The callback takes the `client` requesting
// authorization, the `redirectUri` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application. The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(oauth2orize.grant.code((consumer, redirectUri, user, ares, done) => {
  let code = {
    consumerId: consumer.id,
    redirectUri: redirectUri,
    userId: user.id
  };

  if (consumer.authorizedScopes) code.scopes = consumer.authorizedScopes;

  return authCodeService.save(code)
  .then((codeObj) => {
    return done(null, codeObj.id);
  })
  .catch(err => done(err));
}));

// Grant implicit authorization. The callback takes the `client` requesting
// authorization, the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application. The application issues a token, which is bound to these
// values.

server.grant(oauth2orize.grant.token((consumer, authenticatedUser, ares, done) => {
  let tokenCriteria = {
    consumerId: consumer.id,
    authenticatedUserId: authenticatedUser.id,
    redirectUri: consumer.redirectUri,
    authType: 'oauth2'
  };

  if (consumer.authorizedScopes) tokenCriteria.scopes = consumer.authorizedScopes;

  return tokenService.findOrSave(tokenCriteria)
  .then(token => {
    return done(null, token.access_token);
  })
  .catch(err => done(err));
}));

// Exchange authorization codes for access tokens. The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.

server.exchange(oauth2orize.exchange.code((consumer, code, redirectUri, done) => {
  let codeCriteria = {
    id: code,
    consumerId: consumer.id,
    redirectUri: redirectUri
  };

  authCodeService.find(codeCriteria)
  .then(codeObj => {
    if (!codeObj) {
      return done(null, false);
    }

    let tokenCriteria = {
      consumerId: consumer.id,
      authenticatedUserId: codeObj.userId,
      authType: 'oauth2'
    };

    if (codeObj.scopes) tokenCriteria.scopes = codeObj.scopes;

    return tokenService.findOrSave(tokenCriteria, { includeRefreshToken: true })
    .then(token => {
      return done(null, token.access_token, token.refresh_token);
    });
  })
  .catch(err => done(err));
}));

// Exchange user id and password for access tokens. The callback accepts the
// `client`, which is exchanging the user's name and password from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the user who authorized the code.

server.exchange(oauth2orize.exchange.password((consumer, username, password, scopes, done) => {
  // Validate the consumer
  return authService.validateConsumer(consumer.id)
  .then(consumer => {
    if (!consumer) return done(null, false);

    return authService.authenticateCredential(username, password, 'oauth2')
    .then(user => {
      let scopeAuthorizationPromise;

      if (!user) return done(null, false);

      if (scopes) {
        scopeAuthorizationPromise = authService.authorizeCredential(consumer.id, 'oauth2', scopes);
      } else scopeAuthorizationPromise = Promise.resolve(true);

      return scopeAuthorizationPromise
      .then(authorized => {
        if (!authorized) return done(null, false);

        let tokenCriteria = {
          consumerId: consumer.id,
          authenticatedUser: user.id
        };

        if (scopes) tokenCriteria.scopes = scopes;

        return tokenService.findOrSave(tokenCriteria, { includeRefreshToken: true })
        .then(token => {
          return done(null, token.access_token, token.refresh_token);
        });
      });
    })
    .catch(err => done(err));
  });
}));

// Exchange the client id and password/secret for an access token. The callback accepts the
// `client`, which is exchanging the client's id and password/secret from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the client who authorized the code.

server.exchange(oauth2orize.exchange.clientCredentials((consumer, scopes, done) => {
  // Validate the client
  return authService.validateConsumer(consumer.id)
    .then(consumer => {
      let scopeAuthorizationPromise;

      if (!consumer) return done(null, false);

      if (scopes) {
        scopeAuthorizationPromise = authService.authorizeCredential(consumer.id, 'oauth2', scopes);
      } else scopeAuthorizationPromise = Promise.resolve(true);

      return scopeAuthorizationPromise
      .then(authorized => {
        if (!authorized) return done(null, false);

        let tokenCriteria = {
          consumerId: consumer.id,
          authType: 'oauth2'
        };

        if (scopes) tokenCriteria.scopes = scopes;

        return tokenService.findOrSave(tokenCriteria)
        .then(token => {
          return done(null, token.access_token);
        });
      });
    })
    .catch(err => done(err));
}));

// Exchange Refresh Token
server.exchange(oauth2orize.exchange.refreshToken(function (consumer, refreshToken, done) {
  return authService.validateConsumer(consumer.id)
    .then(consumer => {
      if (!consumer) {
        return done(null, false);
      }

      return tokenService.getTokenObject(refreshToken)
        .then(tokenObj => {
          if (!tokenObj) {
            return done(null, false);
          }

          return tokenService.findOrSave(tokenObj)
            .then(token => {
              return done(null, token.access_token);
            });
        });
    });
}));

// User authorization endpoint.
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request. In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary accross
// implementations. Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction. It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization). We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.

module.exports.authorization = [
  login.ensureLoggedIn(),
  server.authorization((areq, done) => {
    return authService.validateConsumer(areq.clientID)
    .then(consumer => {
      if (!consumer || consumer.redirectUri !== areq.redirectURI) return done(null, false);

      if (!areq.scope) {
        return done(null, consumer, areq.redirectURI);
      }

      return authService.authorizeCredential(areq.clientID, 'oauth2', areq.scope)
      .then(authorized => {
        if (!authorized) {
          return done(null, false);
        }

        consumer.authorizedScopes = areq.scope;

        return done(null, consumer, areq.redirectURI);
      });
    });
  }),
  (request, response) => {
    response.set('transaction_id', request.oauth2.transactionID);
    response.render(path.join(__dirname, 'views/dialog'), { transactionId: request.oauth2.transactionID, user: request.user, client: request.oauth2.client });
  }
];

// User decision endpoint.
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application. Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.

exports.decision = [
  login.ensureLoggedIn(),
  server.decision()
];

// Token endpoint.
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens. Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request. Clients must
// authenticate when making requests to this endpoint.

exports.token = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  server.token(),
  server.errorHandler()
];
