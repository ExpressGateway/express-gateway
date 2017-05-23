let should = require('should');
let config = require('../config.models.js');
let getCredentialService = require('../../src/credentials/credential.service.js');
let db = require('../../src/db')(config.redis.host, config.redis.port);

describe('Scope tests', function () {
  let credentialService = getCredentialService(config);

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

  it('should insert a scope', function (done) {
    credentialService
    .insertScopes('someScope')
    .then(function(res) {
      should.exist(res);
      res.should.eql(true);
      done();
    })
    .catch(function(err) {
      should.not.exist(err);
      done();
    })
  });

  it('should insert multiple scopes', function (done) {
    credentialService
    .insertScopes(['someScope1', 'someScope2'])
    .then(function(res) {
      should.exist(res);
      res.should.eql(true);
      done();
    })
    .catch(function(err) {
      should.not.exist(err);
      done();
    })
  });

  it('should not insert scope that already exists', function (done) {
    credentialService
    .insertScopes(['someScope1'])
    .then(function(res) {
      should.not.exist(res);
      done();
    })
    .catch(function(err) {
      should.exist(err);
      done();
    })
  });

  it('should not insert a scope which is not a string', function (done) {
    credentialService
    .insertScopes({})
    .then(function(res) {
      should.not.exist(res);
      done();
    })
    .catch(function(err) {
      should.exist(err);
      done();
    })
  });

  it('should not insert a scope which is null', function (done) {
    credentialService
    .insertScopes(null)
    .then(function(res) {
      should.not.exist(res);
      done();
    })
    .catch(function(err) {
      should.exist(err);
      done();
    })
  });

  it('should check if scope exists and reply with positive if it does', function (done) {
    credentialService
    .existsScope('someScope')
    .then(function(res) {
      should.exist(res);
      res.should.eql(true);
      done();
    })
    .catch(function(err) {
      should.not.exist(err);
      done();
    })
  });

  it('should check if scope exists and reply with negative if it does not', function (done) {
    credentialService
    .existsScope('someInvalidScope')
    .then(function(res) {
      should.exist(res);
      res.should.eql(false);
      done();
    })
    .catch(function(err) {
      should.not.exist(err);
      done();
    })
  });

  it('should get all scopes', function (done) {
    credentialService
    .getAllScopes()
    .then(function(res) {
      should.exist(res);
      res.should.containEql('someScope');
      res.should.containEql('someScope1');
      res.should.containEql('someScope2');
      done();
    })
    .catch(function(err) {
      console.log(err)
      should.not.exist(err);
      done();
    })
  });

  it('should remove a scope', function (done) {
    credentialService
    .removeScopes('someScope')
    .then(function(res) {
      should.exist(res);
      res.should.eql(true);
      done();
    })
    .catch(function(err) {
      should.not.exist(err);
      done();
    })
  });

  it('removed scope should no longer exist', function (done) {
    credentialService
    .existsScope('someScope')
    .then(function(res) {
      should.exist(res);
      res.should.eql(false);
      done();
    })
    .catch(function(err) {
      should.not.exist(err);
      done();
    })
  });
});