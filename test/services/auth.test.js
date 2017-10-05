const mock = require('mock-require');
mock('redis', require('fakeredis'));

const should = require('should');
const _ = require('lodash');
const credentialModelConfig = require('../../lib/config/models/credentials');
const userModelConfig = require('../../lib/config/models/users');
const services = require('../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const tokenService = services.token;
const authService = services.auth;
const db = require('../../lib/db')();

describe('Auth tests', function () {
  let user, userFromDb;
  const originalModelConfig = credentialModelConfig;
  let _credential;
  let originalUserModelConfig;

  before(function (done) {
    credentialModelConfig.oauth2 = {
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
        return credentialService.insertCredential(user.username, 'oauth2', _credential)
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
    credentialModelConfig.oauth2 = originalModelConfig.oauth2;
    userModelConfig.properties = originalUserModelConfig;
    done();
  });

  describe('Credential Auth', function () {
    it('should authenticate user', function (done) {
      authService.authenticateCredential(user.username, _credential.secret, 'oauth2')
      .then(authResponse => {
        const expectedResponse = Object.assign({
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
      authService.authenticateCredential('invalidUsername', _credential.secret, 'oauth2')
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
      authService.authenticateCredential(user.username, 'invalidSecret', 'oauth2')
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
      authService.authorizeCredential(user.username, 'oauth2', [ 'someScope1', 'someScope2' ])
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
      authService.authorizeCredential(user.username, 'oauth2', [ 'otherScope', 'someScope2' ])
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
      .deactivateCredential(user.username, 'oauth2')
      .then(function (res) {
        should.exist(res);
        res.should.eql(true);
      })
      .then(() => {
        authService.authorizeCredential(user.username, 'oauth2', [ 'otherScope', 'someScope2' ])
        .then((authResponse) => {
          should.exist(authResponse);
          authResponse.should.eql(false);

          // reset credential back to active status
          credentialService
          .activateCredential(user.username, 'oauth2')
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
    let userAccessToken, tokenId, tokenDecrypted;
    before(function (done) {
      const tokenObj = {
        consumerId: userFromDb.id,
        authType: 'oauth2',
        scopes: [ 'someScope1', 'someScope2', 'someScope3' ]
      };

      tokenService.save(tokenObj)
      .then((token) => {
        should.exist(token.access_token);
        userAccessToken = token.access_token;
        [tokenId, tokenDecrypted] = token.access_token.split('|');
        done();
      });
    });

    it('should authenticate token', function (done) {
      authService.authenticateToken(userAccessToken, 'oauth2')
      .then(authResponse => {
        const expectedTokenProps = [ 'consumerId', 'expiresAt', 'id', 'scopes', 'createdAt', 'authType', 'tokenDecrypted' ];
        const expectedConsumerProps = [ 'type', 'createdAt', 'email', 'firstname', 'id', 'isActive', 'lastname', 'updatedAt', 'username' ];

        const expectedResponse = {
          token: {
            consumerId: userFromDb.id,
            authType: 'oauth2',
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
      authService.authenticateToken('invalidToken', 'oauth2')
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
      authService.authorizeToken(userAccessToken, 'oauth2', [ 'someScope1', 'someScope2' ])
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
      authService.authorizeToken(userAccessToken, 'oauth2', [ 'otherScope', 'someScope2' ])
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
