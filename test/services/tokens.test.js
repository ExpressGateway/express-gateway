let mock = require('mock-require');
mock('redis', require('fakeredis'));

let should = require('should');
let Promise = require('bluebird');
let _ = require('lodash');
let config = require('../../lib/config');
let services = require('../../lib/services');
let tokenService = services.token;
let db = require('../../lib/db')();

describe('Access Token tests', function () {
  describe('Save, Find and Get Access Token tests', function () {
    let newToken, accessTokenFromDb, newTokenWithScopes, accessTokenFromDbWithScopes;
    before(function (done) {
      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should save an access token', function (done) {
      newToken = {
        consumerId: '1234',
        authType: 'oauth2'
      };
      tokenService.save(newToken)
      .then((token) => {
        should.exist(token);
        token.access_token.length.should.be.greaterThan(15);
        accessTokenFromDb = token.access_token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should find an access token', function (done) {
      tokenService.find(newToken)
      .then((token) => {
        token.access_token.should.eql(accessTokenFromDb);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get an access token', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'consumerId', 'createdAt', 'expiresAt'];
      let [ id, _tokenDecrypted ] = accessTokenFromDb.split('|');

      tokenService.get(id)
      .then((tokenObj) => {
        tokenFields.forEach(field => {
          should.exist(tokenObj[field]);
        });

        tokenObj.tokenDecrypted.should.eql(_tokenDecrypted);
        tokenObj.consumerId.should.eql(newToken.consumerId);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not create a new access token if one exists and is not expired', function (done) {
      tokenService.findOrSave(newToken)
      .then((token) => {
        token.access_token.should.eql(accessTokenFromDb);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should save an access token with scopes', function (done) {
      newTokenWithScopes = {
        consumerId: '1234',
        authType: 'oauth2',
        scopes: ['scope1', 'scope2', 'scope3']
      };
      tokenService.save(newTokenWithScopes)
      .then((token) => {
        should.exist(token);
        token.access_token.length.should.be.greaterThan(15);
        accessTokenFromDbWithScopes = token.access_token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should find an access token with scopes', function (done) {
      // changing the order of scopes array
      newTokenWithScopes.scopes = ['scope3', 'scope2', 'scope1'];

      tokenService.find(newTokenWithScopes)
      .then((token) => {
        token.access_token.should.eql(accessTokenFromDbWithScopes);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get an access token with scopes', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'consumerId', 'createdAt', 'expiresAt', 'scopes'];
      let [ id, _tokenDecrypted ] = accessTokenFromDbWithScopes.split('|');

      tokenService.get(id)
      .then((tokenObj) => {
        tokenFields.forEach(field => {
          should.exist(tokenObj[field]);
        });

        tokenObj.tokenDecrypted.should.eql(_tokenDecrypted);
        tokenObj.scopes.should.eql(newTokenWithScopes.scopes);
        tokenObj.consumerId.should.eql(newTokenWithScopes.consumerId);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not create a new access token with scopes if one exists and is not expired', function (done) {
      tokenService.findOrSave(newTokenWithScopes)
      .then((token) => {
        token.access_token.should.eql(accessTokenFromDbWithScopes);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Archive Access Token tests', function () {
    let newToken, expiredToken, originalSystemConfig;

    before(function (done) {
      originalSystemConfig = config.systemConfig;
      config.systemConfig.access_tokens.timeToExpiry = 0;

      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    after((done) => {
      config.systemConfig.access_tokens.timeToExpiry = originalSystemConfig.access_tokens.timeToExpiry;
      done();
    });

    it('should save an access token', function (done) {
      newToken = {
        consumerId: '1234',
        authType: 'oauth2'
      };
      tokenService.save(newToken)
      .then((token) => {
        should.exist(token);
        token.access_token.length.should.be.greaterThan(15);
        expiredToken = token.access_token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not get an expired access token if not using the includeExpired flag', function (done) {
      tokenService.get(expiredToken)
      .then((token) => {
        should.not.exist(token);
        should.equal(token, null);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should create a new access token if one is expired', function (done) {
      tokenService.findOrSave(newToken)
      .then((token) => {
        token.access_token.should.not.eql(expiredToken);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get an expired access token with includeExpired flag', function (done) {
      tokenService.get(expiredToken, { includeExpired: true })
      .then((token) => {
        should.exist(token);
        token.id.should.eql(expiredToken.split('|')[0]);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Get Access Tokens By Consumer', function () {
    let originalSystemConfig, tokenObjs;

    before(function (done) {
      originalSystemConfig = config.systemConfig;
      config.systemConfig.access_tokens.timeToExpiry = 0;

      tokenObjs = [
        {
          consumerId: '1234',
          authType: 'oauth2',
          prop: '1'
        },
        {
          consumerId: '1234',
          authType: 'oauth2',
          prop: '2'
        },
        {
          consumerId: '1234',
          authType: 'oauth2',
          prop: '3'
        },
        {
          consumerId: '1234',
          authType: 'oauth2',
          prop: '4'
        }
      ];

      db.flushdbAsync()
        .then(function (didSucceed) {
          if (!didSucceed) {
            console.log('Failed to flush the database');
          }

          let expiredTokenPromises = [];

          tokenObjs.forEach(tokenObj => {
            expiredTokenPromises.push(tokenService.findOrSave(tokenObj));
          });

          Promise.all(expiredTokenPromises)
            .then(() => {
              config.systemConfig.access_tokens.timeToExpiry = 20000000;

              let activeTokenPromises = [];

              tokenObjs.forEach(tokenObj => {
                activeTokenPromises.push(tokenService.findOrSave(tokenObj));
              });

              Promise.all(activeTokenPromises)
                .then(res => {
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

    after((done) => {
      config.systemConfig = originalSystemConfig;
      done();
    });

    it('should get active access tokens by consumer', function (done) {
      tokenService.getTokensByConsumer('1234')
        .then((tokens) => {
          should.exist(tokens);
          tokens.length.should.eql(tokenObjs.length);
          tokens.forEach(tokenObj => {
            tokenObj.prop.should.be.oneOf(_.map(tokenObjs, 'prop'));
          });
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should get active and expired access tokens by consumer if provided includeExpired flag', function (done) {
      tokenService.getTokensByConsumer('1234', { includeExpired: true })
        .then((tokens) => {
          should.exist(tokens);
          tokens.length.should.eql(tokenObjs.length * 2);
          tokens.forEach(tokenObj => {
            tokenObj.prop.should.be.oneOf(_.map(tokenObjs, 'prop'));
          });
          _.map(tokens, 'archived').filter(val => val).length.should.eql(4);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });
  });
});

describe('Refresh Token tests', function () {
  describe('Save, Find and Get Refresh Token tests', function () {
    let newToken, tokensFromDb, newTokenWithScopes, tokensFromDbWithScopes;
    before(function (done) {
      db.flushdbAsync()
        .then(function (didSucceed) {
          if (!didSucceed) {
            console.log('Failed to flush the database');
          }
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should save a refresh token along with access token', function (done) {
      newToken = {
        consumerId: '1234',
        authType: 'oauth2'
      };
      tokenService.save(newToken, { includeRefreshToken: true })
        .then((token) => {
          should.exist(token);
          should.exist(token.access_token);
          should.exist(token.refresh_token);
          token.access_token.length.should.be.greaterThan(15);
          token.refresh_token.length.should.be.greaterThan(15);
          tokensFromDb = token;
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should find a refresh token along with access token', function (done) {
      tokenService.find(newToken, { includeRefreshToken: true })
        .then((token) => {
          token.should.eql(tokensFromDb);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should get refresh token\'s original token Obj', function (done) {
      tokenService.getTokenObject(tokensFromDb.refresh_token)
        .then((tokenObj) => {
          tokenObj.should.eql(newToken);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should get a refresh token', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'consumerId', 'createdAt', 'expiresAt'];
      let [ id, _tokenDecrypted ] = tokensFromDb.refresh_token.split('|');

      tokenService.get(id, { type: 'refresh_token' })
        .then((tokenObj) => {
          tokenFields.forEach(field => {
            should.exist(tokenObj[field]);
          });

          tokenObj.tokenDecrypted.should.eql(_tokenDecrypted);
          tokenObj.consumerId.should.eql(newToken.consumerId);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should not create a new refresh token if one exists and is not expired', function (done) {
      tokenService.findOrSave(newToken, { includeRefreshToken: true })
        .then((token) => {
          token.should.eql(tokensFromDb);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should save a refresh token with scopes, along with an access token', function (done) {
      newTokenWithScopes = {
        consumerId: '1234',
        authType: 'oauth2',
        scopes: ['scope1', 'scope2', 'scope3']
      };
      tokenService.save(newTokenWithScopes, { includeRefreshToken: true })
        .then((token) => {
          should.exist(token);
          token.access_token.length.should.be.greaterThan(15);
          token.refresh_token.length.should.be.greaterThan(15);
          tokensFromDbWithScopes = token;
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should find a refresh token with scopes', function (done) {
      // changing the order of scopes array
      newTokenWithScopes.scopes = ['scope3', 'scope2', 'scope1'];

      tokenService.find(newTokenWithScopes, { includeRefreshToken: true })
        .then((token) => {
          token.should.eql(tokensFromDbWithScopes);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should get a refresh token with scopes', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'consumerId', 'createdAt', 'expiresAt', 'scopes'];
      let [ id, _tokenDecrypted ] = tokensFromDbWithScopes.refresh_token.split('|');

      tokenService.get(id, { type: 'refresh_token' })
        .then((tokenObj) => {
          tokenFields.forEach(field => {
            should.exist(tokenObj[field]);
          });

          tokenObj.tokenDecrypted.should.eql(_tokenDecrypted);
          tokenObj.scopes.should.eql(newTokenWithScopes.scopes);
          tokenObj.consumerId.should.eql(newTokenWithScopes.consumerId);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should not create a new refresh token with scopes if one exists and is not expired', function (done) {
      tokenService.findOrSave(newTokenWithScopes, { includeRefreshToken: true })
        .then((token) => {
          token.should.eql(tokensFromDbWithScopes);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });
  });

  describe('Archive Refresh Token tests', function () {
    let newToken, expiredToken, originalSystemConfig, activeRefreshToken;

    before(function (done) {
      originalSystemConfig = config.systemConfig;
      config.systemConfig.access_tokens.timeToExpiry = 0;
      config.systemConfig.refresh_tokens.timeToExpiry = 0;

      db.flushdbAsync()
        .then(function (didSucceed) {
          if (!didSucceed) {
            console.log('Failed to flush the database');
          }
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    after((done) => {
      config.systemConfig = originalSystemConfig;
      done();
    });

    it('should save a refresh token', function (done) {
      newToken = {
        consumerId: '1234',
        authType: 'oauth2'
      };
      tokenService.save(newToken, { includeRefreshToken: true })
        .then((token) => {
          should.exist(token);
          token.access_token.length.should.be.greaterThan(15);
          token.refresh_token.length.should.be.greaterThan(15);
          expiredToken = token;
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should not find an expired refresh token if not using the includeExpired flag', function (done) {
      tokenService.find(newToken, { includeRefreshToken: true })
        .then((token) => {
          should.not.exist(token.access_token);
          should.not.exist(token.refresh_token);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should create a new refresh token if one is expired', function (done) {
      config.systemConfig.refresh_tokens.timeToExpiry = 9999999;
      tokenService.findOrSave(newToken, { includeRefreshToken: true })
        .then((token) => {
          token.should.not.eql(expiredToken);
          token.refresh_token.should.not.eql(expiredToken.refresh_token);
          activeRefreshToken = token.refresh_token;
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should not create a new refresh token if one is not expired, even if the access token is expired', function (done) {
      tokenService.findOrSave(newToken, { includeRefreshToken: true })
        .then((token) => {
          token.access_token.should.not.eql(expiredToken.access_token);
          token.refresh_token.should.eql(activeRefreshToken);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should create a new refresh token if one does not exist, even if the access token is exists', function (done) {
      let tokenObj = {
        consumerId: '555555',
        authType: 'oauth2'
      };
      let accessToken;
      config.systemConfig.access_tokens.timeToExpiry = 9999999;

      tokenService.findOrSave(tokenObj)
        .then((token) => {
          should.exist(token.access_token);
          should.not.exist(token.refresh_token);
          accessToken = token.access_token;

          tokenService.findOrSave(tokenObj, { includeRefreshToken: true })
            .then((token) => {
              token.access_token.should.eql(accessToken);
              should.exist(token.refresh_token);
              done();
            });
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should find an expired refresh token with includeExpired flag', function (done) {
      tokenService.get(expiredToken.refresh_token, { includeExpired: true, type: 'refresh_token' })
        .then((token) => {
          should.exist(token);
          token.id.should.eql(expiredToken.refresh_token.split('|')[0]);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });
  });

  describe('Get Refresh Tokens By Consumer', function () {
    let originalSystemConfig, tokenObjs;

    before(function (done) {
      originalSystemConfig = config.systemConfig;
      config.systemConfig.refresh_tokens.timeToExpiry = 0;
      // config.systemConfig.access_tokens.timeToExpiry = 0;

      tokenObjs = [
        {
          consumerId: '1234',
          authType: 'oauth2',
          prop: '1'
        },
        {
          consumerId: '1234',
          authType: 'oauth2',
          prop: '2'
        },
        {
          consumerId: '1234',
          authType: 'oauth2',
          prop: '3'
        },
        {
          consumerId: '1234',
          authType: 'oauth2',
          prop: '4'
        }
      ];

      db.flushdbAsync()
        .then(function (didSucceed) {
          if (!didSucceed) {
            console.log('Failed to flush the database');
          }

          let expiredTokenPromises = [];

          tokenObjs.forEach(tokenObj => {
            expiredTokenPromises.push(tokenService.findOrSave(tokenObj, { includeRefreshToken: true }));
          });

          Promise.all(expiredTokenPromises)
            .then(() => {
              config.systemConfig.refresh_tokens.timeToExpiry = 20000000;
              // config.systemConfig.access_tokens.timeToExpiry = 20000000;

              let activeTokenPromises = [];

              tokenObjs.forEach(tokenObj => {
                activeTokenPromises.push(tokenService.findOrSave(tokenObj, { includeRefreshToken: true }));
              });

              Promise.all(activeTokenPromises)
                .then(res => {
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

    after((done) => {
      config.systemConfig = originalSystemConfig;
      done();
    });

    it('should get active tokens by consumer', function (done) {
      tokenService.getTokensByConsumer('1234', { type: 'refresh_token' })
        .then((tokens) => {
          should.exist(tokens);
          tokens.length.should.eql(tokenObjs.length);
          tokens.forEach(tokenObj => {
            tokenObj.prop.should.be.oneOf(_.map(tokenObjs, 'prop'));
          });
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should get active and expired tokens by consumer if provided includeExpired flag', function (done) {
      tokenService.getTokensByConsumer('1234', { includeExpired: true, type: 'refresh_token' })
        .then((tokens) => {
          should.exist(tokens);
          tokens.length.should.eql(tokenObjs.length * 2);
          tokens.forEach(tokenObj => {
            tokenObj.prop.should.be.oneOf(_.map(tokenObjs, 'prop'));
          });
          _.map(tokens, 'archived').filter(val => val).length.should.eql(4);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });
  });
});
