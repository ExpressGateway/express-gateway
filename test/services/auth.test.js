const should = require('should');
const services = require('../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const tokenService = services.token;
const authService = services.auth;
const db = require('../../lib/db');

describe('Auth tests', function () {
  let user, userFromDb;
  let _credential;

  before(() => {
    return db.flushdb()
      .then(() => {
        user = {
          username: 'irfanbaqui',
          firstname: 'irfan',
          lastname: 'baqui',
          email: 'irfan@eg.com'
        };

        _credential = {
          secret: 'password',
          scopes: ['someScope1', 'someScope2', 'someScope3']
        };

        return userService.insert(user);
      })
      .then(_user => {
        should.exist(_user);
        userFromDb = _user;
        return credentialService.insertScopes(['someScope1', 'someScope2', 'someScope3']);
      })
      .then(() => {
        return credentialService.insertCredential(userFromDb.id, 'oauth2', _credential);
      })
      .then((res) => should.exist(res));
  });

  describe('Credential Auth', () => {
    it('should authenticate user', () => {
      return authService.authenticateCredential(user.username, _credential.secret, 'oauth2')
        .then(authResponse => {
          const expectedResponse = Object.assign({
            type: 'user',
            id: userFromDb.id,
            username: user.username,
            isActive: true
          }, userFromDb);
          should.exist(authResponse);
          should.deepEqual(authResponse, expectedResponse);
        });
    });

    it('should not authenticate invalid user with credentials', () => {
      return authService.authenticateCredential('invalidUsername', _credential.secret, 'oauth2')
        .then(authResponse => {
          should.exist(authResponse);
          authResponse.should.eql(false);
        });
    });

    it('should not authenticate valid user with invalid credentials', () => {
      return authService.authenticateCredential(userFromDb.id, 'invalidSecret', 'oauth2')
        .then(authResponse => {
          should.exist(authResponse);
          authResponse.should.eql(false);
        });
    });

    it('should authorize Credential with scopes', () => {
      return authService.authorizeCredential(userFromDb.id, 'oauth2', ['someScope1', 'someScope2'])
        .then((authResponse) => {
          should.exist(authResponse);
          authResponse.should.eql(true);
        });
    });

    it('should not authorize Credential with invalid scopes', () => {
      return authService.authorizeCredential(userFromDb.id, 'oauth2', ['otherScope', 'someScope2'])
        .then((authResponse) => {
          should.exist(authResponse);
          authResponse.should.eql(false);
        });
    });

    it('should not authorize Credential that is inActive', () => {
      return credentialService
        .deactivateCredential(userFromDb.id, 'oauth2')
        .then(function (res) {
          should.exist(res);
          res.should.eql(true);
        })
        .then(() => authService.authorizeCredential(userFromDb.id, 'oauth2', ['otherScope', 'someScope2']))
        .then((authResponse) => {
          should.exist(authResponse);
          authResponse.should.eql(false);

          // reset credential back to active status
          return credentialService
            .activateCredential(userFromDb.id, 'oauth2')
            .then(function (res) {
              should.exist(res);
              res.should.eql(true);
            });
        });
    });
  });

  describe('Token Auth', () => {
    let userAccessToken, tokenId, tokenDecrypted;
    before(() => {
      const tokenObj = {
        consumerId: userFromDb.id,
        authType: 'oauth2',
        scopes: ['someScope1', 'someScope2', 'someScope3']
      };

      return tokenService.save(tokenObj)
        .then((token) => {
          should.exist(token.access_token);
          userAccessToken = token.access_token;
          [tokenId, tokenDecrypted] = token.access_token.split('|');
        });
    });

    it('should authenticate token', () => {
      return authService.authenticateToken(userAccessToken, 'oauth2')
        .then(authResponse => {
          const expectedTokenProps = ['consumerId', 'expiresAt', 'id', 'scopes', 'createdAt', 'authType', 'tokenDecrypted'];
          const expectedConsumerProps = ['type', 'createdAt', 'email', 'firstname', 'id', 'isActive', 'lastname', 'updatedAt', 'username'];

          const expectedResponse = {
            token: {
              consumerId: userFromDb.id,
              authType: 'oauth2',
              tokenDecrypted: tokenDecrypted,
              id: tokenId,
              scopes: ['someScope1', 'someScope2', 'someScope3']
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
          should(authResponse.token).have.properties(expectedTokenProps);
          should(authResponse.consumer).have.properties(expectedConsumerProps);
          delete authResponse.token.expiresAt;
          delete authResponse.token.createdAt;
          delete authResponse.consumer.createdAt;
          delete authResponse.consumer.updatedAt;
          should.deepEqual(authResponse.token, expectedResponse.token);
          should.deepEqual(authResponse.consumer, expectedResponse.consumer);
        });
    });

    it('should not authenticate invalid token', () => {
      authService.authenticateToken('invalidToken', 'oauth2')
        .then(authResponse => {
          should.exist(authResponse);
          authResponse.should.eql(false);
        });
    });

    it('should authorize Token', () => {
      authService.authorizeToken(userAccessToken, 'oauth2', ['someScope1', 'someScope2'])
        .then((authResponse) => {
          should.exist(authResponse);
          authResponse.should.eql(true);
        });
    });

    it('should not authorize Token with invalid scopes', () => {
      authService.authorizeToken(userAccessToken, 'oauth2', ['otherScope', 'someScope2'])
        .then((authResponse) => {
          should.exist(authResponse);
          authResponse.should.eql(false);
        });
    });
  });
});
