let mock = require('mock-require');
mock('redis', require('fakeredis'));

let should = require('should');
let Promise = require('bluebird');
let _ = require('lodash');
let config = require('../../src/config');
let services = require('../../src/services');
let tokenService = services.token;
let db = require('../../src/db')();

describe('Token tests', function () {
  describe('Save, Find and Get Token tests', function () {
    let newToken, tokenFromDb, newTokenWithScopes, tokenFromDbWithScopes;
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

    it('should save a token', function (done) {
      newToken = {
        consumerId: '1234',
        authType: 'oauth'
      };
      tokenService.save(newToken)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        tokenFromDb = token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should find a token', function (done) {
      tokenService.find(newToken)
      .then((token) => {
        token.should.eql(tokenFromDb);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get a token', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'consumerId', 'createdAt', 'expiresAt'];
      let [ id, _tokenDecrypted ] = tokenFromDb.split('|');

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

    it('should not create a new token if one exists and is not expired', function (done) {
      tokenService.findOrSave(newToken)
      .then((token) => {
        token.should.eql(tokenFromDb);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should save a token with scopes', function (done) {
      newTokenWithScopes = {
        consumerId: '1234',
        authType: 'oauth',
        scopes: ['scope1', 'scope2', 'scope3']
      };
      tokenService.save(newTokenWithScopes)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        tokenFromDbWithScopes = token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should find a token with scopes', function (done) {
      // changing the order of scopes array
      newTokenWithScopes.scopes = ['scope3', 'scope2', 'scope1'];

      tokenService.find(newTokenWithScopes)
      .then((token) => {
        token.should.eql(tokenFromDbWithScopes);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get a token with scopes', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'consumerId', 'createdAt', 'expiresAt', 'scopes'];
      let [ id, _tokenDecrypted ] = tokenFromDbWithScopes.split('|');

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

    it('should not create a new token with scopes if one exists and is not expired', function (done) {
      tokenService.findOrSave(newTokenWithScopes)
      .then((token) => {
        token.should.eql(tokenFromDbWithScopes);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Archive Token tests', function () {
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

    it('should save a token', function (done) {
      newToken = {
        consumerId: '1234',
        authType: 'oauth'
      };
      tokenService.save(newToken)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        expiredToken = token;
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not find an expired token if not using the includeExpired flag', function (done) {
      tokenService.find(newToken)
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

    it('should create a new token if one is expired', function (done) {
      tokenService.findOrSave(newToken)
      .then((token) => {
        token.should.not.eql(expiredToken);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should find an expired token with includeExpired flag', function (done) {
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

    it('should find an expired token with includeExpired flag', function (done) {
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

  describe('Get Tokens By Consumer', function () {
    let originalSystemConfig, tokenObjs;

    before(function (done) {
      originalSystemConfig = config.systemConfig;
      config.systemConfig.access_tokens.timeToExpiry = 0;

      tokenObjs = [
        {
          consumerId: '1234',
          authType: 'oauth',
          prop: '1'
        },
        {
          consumerId: '1234',
          authType: 'oauth',
          prop: '2'
        },
        {
          consumerId: '1234',
          authType: 'oauth',
          prop: '3'
        },
        {
          consumerId: '1234',
          authType: 'oauth',
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
            .then((res) => {
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
      config.systemConfig.access_tokens.timeToExpiry = originalSystemConfig.access_tokens.timeToExpiry;
      done();
    });

    it('should get active tokens by consumer', function (done) {
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

    it('should get active and expired tokens by consumer if provided includeExpired flag', function (done) {
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
