let mock = require('mock-require');
mock('redis', require('fakeredis'));

let should = require('should');
let _ = require('lodash');
let credentialModelConfig = require('../../src/config/models/credentials');
let userModelConfig = require('../../src/config/models/users');
let services = require('../../src/services');
let credentialService = services.credential;
let userService = services.user;
let tokenService = services.token;
let authService = services.auth;
let db = require('../../src/db')();

describe('Auth tests', function () {
  let user, userFromDb;
  let originalModelConfig = credentialModelConfig;
  let _credential;
  let originalUserModelConfig;

  before(function (done) {
    credentialModelConfig.oauth = {
      passwordKey: 'secret',
      autoGeneratePassword: true,
      properties: {
        scopes: { isRequired: false }
      }
    };

    originalUserModelConfig = userModelConfig.properties;
    userModelConfig.properties = {
      firstname: {isRequired: true, isMutable: true},
      lastname: {isRequired: true, isMutable: true},
      email: {isRequired: false, isMutable: true}
    };

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
    credentialModelConfig.oauth = originalModelConfig.oauth;
    userModelConfig.properties = originalUserModelConfig;
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
        consumerId: userFromDb.id,
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
        let expectedTokenProps = [ 'consumerId', 'expiresAt', 'id', 'scopes', 'createdAt', 'authType', 'tokenDecrypted' ];
        let expectedConsumerProps = [ 'type', 'createdAt', 'email', 'firstname', 'id', 'isActive', 'lastname', 'updatedAt', 'username' ];

        let expectedResponse = {
          token: {
            consumerId: userFromDb.id,
            authType: 'oauth',
            tokenDecrypted: tokenDecrypted,
            id: tokenId,
            scopes: [ 'someScope1', 'someScope2', 'someScope3' ]
          },
          consumer: {
            id: userFromDb.id,
            type: 'user',
            email: 'irfan@eg.com',
            firstname: 'irfan',
            isActive: true,
            lastname: 'baqui',
            username: 'irfanbaqui'
          }
        };

        should.exist(authResponse);
        Object.keys(authResponse.token).sort().should.eql(expectedTokenProps.sort());
        Object.keys(authResponse.consumer).sort().should.eql(expectedConsumerProps.sort());
        should.deepEqual(_.omit(authResponse.token, ['expiresAt', 'createdAt']), expectedResponse.token);
        should.deepEqual(_.omit(authResponse.consumer, ['updatedAt', 'createdAt']), expectedResponse.consumer);
        done();
      })
      .catch(function (err) {
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
