let should = require('should');
let config = require('./config.models.js');
let getTokenService = require('../src/tokens/token.service.js');
let tokenService = getTokenService(config);
let db = require('../src/db').getDb();


describe('Token tests', function () {
  describe('Save, Find and Get Token tests', function () {
    let newToken, tokenFromDb, newTokenWithScopes, tokenFromDbWithScopes;
    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should save a token', function (done) {
      newToken = {
        username: 'someUsername',
        authType: 'oauth'
      }
      tokenService.save(newToken)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        tokenFromDb = token;
        done();
      })
      .catch(function(err) {
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
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get a token', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'username', 'createdAt', 'expiresAt'];
      let [ id, _tokenDecrypted ] = tokenFromDb.split('|');

      tokenService.get(id)
      .then((tokenObj) => {
        tokenFields.forEach(field => {
          should.exist(tokenObj[field]);
        });

        tokenObj.tokenDecrypted.should.eql(_tokenDecrypted);
        tokenObj.username.should.eql(newToken.username);
        done();
      })
      .catch(function(err) {
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
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should save a token with scopes', function (done) {
      newTokenWithScopes = {
        username: 'someUsername',
        authType: 'oauth',
        scopes: ['scope1', 'scope2', 'scope3']
      }
      tokenService.save(newTokenWithScopes)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        tokenFromDbWithScopes = token;
        done();
      })
      .catch(function(err) {
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
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get a token with scopes', function (done) {
      let tokenFields = ['id', 'tokenDecrypted', 'username', 'createdAt', 'expiresAt', 'scopes'];
      let [ id, _tokenDecrypted ] = tokenFromDbWithScopes.split('|');

      tokenService.get(id)
      .then((tokenObj) => {
        tokenFields.forEach(field => {
          should.exist(tokenObj[field]);
        });

        tokenObj.tokenDecrypted.should.eql(_tokenDecrypted);
        tokenObj.scopes.should.eql(newTokenWithScopes.scopes);
        tokenObj.username.should.eql(newTokenWithScopes.username);
        done();
      })
      .catch(function(err) {
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
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Delete Token tests', function () {
    let newToken, expiredToken;
    let tokenService, originalTokenConfig;

    before(function(done) {
      originalTokenConfig = config.tokens;
      config.tokens.timeToExpiry = 0;
      tokenService = getTokenService(config);

      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    after((done) => {
      tokenService.tokens = originalTokenConfig;
      done();
    });

    it('should save a token', function (done) {
      newToken = {
        username: 'someUsername',
        authType: 'oauth'
      }
      tokenService.save(newToken)
      .then((token) => {
        should.exist(token);
        token.length.should.be.greaterThan(15);
        expiredToken = token;
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not find an expired token', function (done) {
      tokenService.find(newToken)
      .then((token) => {
        should.not.exist(token);
        should.equal(token, null);
        done();
      })
      .catch(function(err) {
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
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should delete an expired token', function (done) {
      tokenService.get(expiredToken)
      .then((token) => {
        should.not.exist(token);
        should.equal(token, null);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
});