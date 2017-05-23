let should = require('should');
let config = require('../config.models.js');
let getCredentialService = require('../../src/credentials/credential.service.js');
let db = require('../../src/db')(config.redis.host, config.redis.port);


describe('Authentication tests', function () {
  let _credentialService;
  let originalCredentialConfig = config.credentials;
  let username = 'someUser';
  let _credential;

  before(function(done) {
    config.credentials.oauth = {
      passwordKey: 'secret',
      autoGeneratePassword: true,
      properties: { 
        scopes: { isRequired: false },
        someProperty: { isRequired: true, isMutable: false },
        otherProperty: { defaultValue: 'someDefaultValue' }
      }
    };

    _credentialService = getCredentialService(config);

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

  after(function(done) {
    config.credentials = originalCredentialConfig;
    done();
  });

  it('should authenticate user', function (done) {
    _credential = {
      secret: 'password',
      scopes: [ 'someScope1', 'someScope2', 'someScope3' ],
      someProperty: 'propVal',
    };

    _credentialService.insertScopes([ 'someScope1', 'someScope2', 'someScope3' ])
    .then(() => {
      _credentialService
      .insertCredential(username, 'oauth', _credential)
      .then(function(res) {
        should.exist(res);
        _credentialService.authenticate(username, _credential.secret, 'oauth')
        .then(authResponse => {
          should.exist(authResponse);
          authResponse.should.eql(true);
          done();
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });
  });

  it('should not authenticate invalid user with credentials', function (done) {
    _credentialService.authenticate('invalidUsername', _credential.secret, 'oauth')
    .then(authResponse => {
      should.exist(authResponse);
      authResponse.should.eql(false);
      done();
    })
    .catch(function(err) {
      should.not.exist(err);
      done();
    });
  });

  it('should not authenticate valid user with invalid credentials', function (done) {
    _credentialService.authenticate(username, 'invalidSecret', 'oauth')
    .then(authResponse => {
      should.exist(authResponse);
      authResponse.should.eql(false);
      done();
    })
    .catch(function(err) {
      should.not.exist(err);
      done();
    });
  });
});