let should = require('should');
let config = require('../config.models.js');
let getCredentialService = require('../../src/credentials/credential.service.js');
let getUserService = require('../../src/consumers/user.service.js');
let getTokenService = require('../../src/tokens/token.service.js');
let getAuthService = require('../../src/auth.js');
let _ = require('lodash');
let db = require('../../src/db').getDb();

describe('Auth tests', function () {
  let credentialService, tokenService, authService, userService, user, userFromDb;
  let originalCredentialConfig = config.credentials;
  let _credential;

  before(function (done) {
    config.credentials.oauth = {
      passwordKey: 'secret',
      autoGeneratePassword: true,
      properties: {
        scopes: { isRequired: false }
      }
    };

    credentialService = getCredentialService(config);
    userService = getUserService(config);
    tokenService = getTokenService(config);
    authService = getAuthService(config);

    db.flushdbAsync()
    .then(function (didSucceed) {
      if (!didSucceed) {
        console.log('Failed to flush the database');
      }

      user = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      _credential = {
        secret: 'password',
        scopes: [ 'someScope1', 'someScope2', 'someScope3' ]
      };

      userService
      .insert(user)
      .then(_user => {
        should.exist(_user);
        userFromDb = _user;
        return credentialService.insertScopes([ 'someScope1', 'someScope2', 'someScope3' ]);
      })
      .then(() => {
        return credentialService.insertCredential(user.username, 'oauth', _credential)
        .then(function (res) {
          should.exist(res);
          done();
        });
      });
    })
    .catch(function (err) {
      should.not.exist(err);
      done();
    });
  });

  after(function (done) {
    config.credentials = originalCredentialConfig;
    done();
  });

  describe('Credential Auth', function () {
    it('should authenticate user', function (done) {
      authService.authenticateCredential(user.username, _credential.secret, 'oauth')
      .then(authResponse => {
        let expectedResponse = Object.assign({
          type: 'user',
          id: userFromDb.id,
          username: user.username,
          isActive: true
        }, userFromDb);
        should.exist(authResponse);
        should.deepEqual(authResponse, expectedResponse);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not authenticate invalid user with credentials', function (done) {
      authService.authenticateCredential('invalidUsername', _credential.secret, 'oauth')
      .then(authResponse => {
        should.exist(authResponse);
        authResponse.should.eql(false);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not authenticate valid user with invalid credentials', function (done) {
      authService.authenticateCredential(user.username, 'invalidSecret', 'oauth')
      .then(authResponse => {
        should.exist(authResponse);
        authResponse.should.eql(false);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should authorize Credential with scopes', function (done) {
      authService.authorizeCredential(user.username, 'oauth', [ 'someScope1', 'someScope2' ])
      .then((authResponse) => {
        should.exist(authResponse);
        authResponse.should.eql(true);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not authorize Credential with invalid scopes', function (done) {
      authService.authorizeCredential(user.username, 'oauth', [ 'otherScope', 'someScope2' ])
      .then((authResponse) => {
        should.exist(authResponse);
        authResponse.should.eql(false);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not authorize Credential that is inActive', function (done) {
      credentialService
      .deactivateCredential(user.username, 'oauth')
      .then(function (res) {
        should.exist(res);
        res.should.eql(true);
      })
      .then(() => {
        authService.authorizeCredential(user.username, 'oauth', [ 'otherScope', 'someScope2' ])
        .then((authResponse) => {
          should.exist(authResponse);
          authResponse.should.eql(false);

          // reset credential back to active status
          credentialService
          .activateCredential(user.username, 'oauth')
          .then(function (res) {
            should.exist(res);
            res.should.eql(true);
            done();
          });
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });

  describe('Token Auth', function () {
    let userToken, tokenId, tokenDecrypted;
    before(function (done) {
      let tokenObj = {
        username: user.username,
        authType: 'oauth',
        scopes: [ 'someScope1', 'someScope2', 'someScope3' ]
      };

      tokenService.save(tokenObj)
      .then((token) => {
        should.exist(token);
        userToken = token;
        [tokenId, tokenDecrypted] = token.split('|');
        done();
      });
    });

    it('should authenticate token', function (done) {
      authService.authenticateToken(userToken, 'oauth')
      .then(authResponse => {
        let expectedTokenProps = [ 'username', 'expiresAt', 'id', 'scopes', 'createdAt', 'authType', 'tokenDecrypted' ];

        let expectedResponse = {
          username: user.username,
          authType: 'oauth',
          tokenDecrypted: tokenDecrypted,
          id: tokenId,
          scopes: [ 'someScope1', 'someScope2', 'someScope3' ]
        };

        should.exist(authResponse);
        Object.keys(authResponse).sort().should.eql(expectedTokenProps.sort());
        should.deepEqual(_.omit(authResponse, ['expiresAt', 'createdAt']), expectedResponse);
        done();
      })
      .catch(function (err) {
        console.log(err);
        should.not.exist(err);
        done();
      });
    });

    it('should not authenticate invalid token', function (done) {
      authService.authenticateToken('invalidToken', 'oauth')
      .then(authResponse => {
        should.exist(authResponse);
        authResponse.should.eql(false);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should authorize Token', function (done) {
      authService.authorizeToken(userToken, 'oauth', [ 'someScope1', 'someScope2' ])
      .then((authResponse) => {
        should.exist(authResponse);
        authResponse.should.eql(true);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not authorize Token with invalid scopes', function (done) {
      authService.authorizeToken(userToken, 'oauth', [ 'otherScope', 'someScope2' ])
      .then((authResponse) => {
        should.exist(authResponse);
        authResponse.should.eql(false);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });
});
