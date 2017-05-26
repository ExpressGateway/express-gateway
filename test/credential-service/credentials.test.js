let should = require('should');
let config = require('../config.models.js');
let getCredentialService = require('../../src/credentials/credential.service.js');
let db = require('../../src/db')(config.redis.host, config.redis.port);

describe('Credential service tests', function () {
  describe('Credential tests', function () {
    let _credentialService, credential;
    let originalCredentialConfig = config.credentials;
    let username = 'someUser';

    before(function(done) {
      config.credentials.oauth = {
        passwordKey: 'secret',
        autoGeneratePassword: true,
        properties: { 
          scopes: { isRequired: false, isMutable: true, defaultVal: null }
        }
      };

      config.credentials.basicAuth = {
        passwordKey: 'password',
        autoGeneratePassword: true,
        properties: {
          scopes:   { isRequired: false, isMutable: true, userDefined: true }
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

    it('should insert a credential', function (done) {
      let _credential = {
        secret: 'password'
      };

      _credentialService
      .insertCredential(username, 'oauth', _credential)
      .then(function(newCredential) {
        should.exist(newCredential);
        credential = Object.assign(newCredential, _credential);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      })
    });

    it('should not insert a credential that already exists', function (done) {
      let _credential = {
        secret: 'password'
      };

      _credentialService
      .insertCredential(username, 'oauth', _credential)
      .then(function(newCredential) {
        should.not.exist(newCredential);
        done();
      })
      .catch(function(err) {
        should.exist(err);
        done();
      })
    });

    it('should insert a credential without password specified if autoGeneratePassword is set to true', function (done) {
      let _credential = {};

      _credentialService
      .insertCredential('someUsername', 'oauth', _credential)
      .then(function(newCredential) {
        should.exist(newCredential);
        should.exist(newCredential.secret);
        newCredential.secret.length.should.greaterThanOrEqual(10);
        done();
      })
      .catch(function(err) {
        console.log(err)
        should.not.exist(err);
        done();
      })
    });

    it('should insert a credential with id but different type that already exists', function (done) {
      let _credential = {
        password: 'password'
      };

      _credentialService
      .insertCredential(username, 'basicAuth', _credential)
      .then(function(newCredential) {
        should.exist(newCredential);
        newCredential.isActive.should.eql(true);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      })
    });

    it('should get a credential', function (done) {
      _credentialService
      .getCredential(username, 'oauth')
      .then(function(cred) {
        should.exist(cred);
        should.not.exist(cred.secret);
        credential.isActive.should.eql(true);
        done();
      })
      .catch(function(err) {
        console.log(err)
        should.not.exist(err);
        done();
      })
    });

    it('should deactivate a credential', function (done) {
      _credentialService
      .deactivateCredential(username, 'oauth')
      .then(function(res) {
        should.exist(res);
        res.should.eql(true);
        
        _credentialService
        .getCredential(username, 'oauth')
        .then(function(cred) {
          should.exist(cred);
          should.not.exist(cred.secret);
          cred.isActive.should.eql('false');
          done();
        });
      })
      .catch(function(err) {
        console.log(err)
        should.not.exist(err);
        done();
      });
    });

    it('should reactivate a credential', function (done) {
      _credentialService
      .activateCredential(username, 'oauth')
      .then(function(res) {
        should.exist(res);
        res.should.eql(true);
        
        _credentialService
        .getCredential(username, 'oauth')
        .then(function(cred) {
          should.exist(cred);
          should.not.exist(cred.secret);
          cred.isActive.should.eql('true');
          done();
        });
      })
      .catch(function(err) {
        console.log(err)
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Credential Property tests', function () {
    let _credentialService;
    let originalCredentialConfig = config.credentials;
    let username = 'someUser';
    let _credential = {
      secret: 'password',
      scopes: 'someScope',
      someProperty: 'propVal',
    };

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

    it('should not insert a credential with scopes if the scopes are not defined', function (done) {
      _credentialService
      .insertCredential(username, 'oauth', _credential)
      .then(function(newCredential) {
        should.not.exist(newCredential);
        done();
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('one or more scopes don\'t exist');
        done();
      })
    });

    it('should insert a credential with scopes if the scopes are defined', function (done) {
      _credentialService.insertScopes('someScope')
      .then(() => {
        _credentialService
        .insertCredential(username, 'oauth', _credential)
        .then(function(newCredential) {
          should.exist(newCredential);
          newCredential.isActive.should.eql(true);
          newCredential.scopes.should.exist;
          newCredential.scopes.should.eql(['someScope']);
          newCredential.someProperty.should.eql('propVal');
          newCredential.otherProperty.should.eql('someDefaultValue');
          should.not.exist(newCredential.secret);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        });
      });
    });

    it('should add scopes to existing credential if the scopes are defined', function (done) {
      _credentialService.insertScopes([ 'someScope1', 'someScope2', 'someScope3', 'someOtherOne' ])
      .then(() => {
        _credentialService
        .addScopesToCredential(username, 'oauth', [ 'someScope1', 'someScope2', 'someScope3', 'someOtherOne' ])
        .then(function(res) {
          res.should.eql(true);

          _credentialService
          .getCredential(username, 'oauth')
          .then(function(cred) {
            should.exist(cred);
            should.exist(cred.scopes);
            cred.scopes.should.containEql(_credential.scopes);
            cred.scopes.should.containEql('someScope1');
            cred.scopes.should.containEql('someScope2');
            cred.scopes.should.containEql('someScope3');
            cred.scopes.should.containEql('someOtherOne');
            cred.isActive.should.eql('true');
            done();
          });
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        });
      });
    });

    it('should remove scopes from existing credential', function (done) {
      _credentialService
      .removeScopesFromCredential(username, 'oauth', [ 'someScope2', 'someScope3' ])
      .then(function(res) {
        res.should.eql(true);

        _credentialService
        .getCredential(username, 'oauth')
        .then(function(cred) {
          should.exist(cred);
          should.exist(cred.scopes);
          cred.scopes.should.containEql(_credential.scopes);
          cred.scopes.should.containEql('someScope1');
          cred.scopes.should.not.containEql('someScope2');
          cred.scopes.should.not.containEql('someScope3');
          cred.isActive.should.eql('true');
          done();
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should remove scopes from credential if the scope is deleted', function (done) {
      _credentialService
      .removeScopes(['someScope1', 'someScope'])
      .then(function(res) {
        res.should.eql(true);

        _credentialService
        .getCredential(username, 'oauth')
        .then(function(cred) {
          should.exist(cred);
          should.exist(cred.scopes);
          cred.scopes.should.containEql('someOtherOne');
          cred.scopes.should.not.containEql('someScope1');
          cred.scopes.should.not.containEql('someScope');
          cred.isActive.should.eql('true');
          done();
        });
      })
      .catch(function(err) {
        console.log(err)
        should.not.exist(err);
        done();
      });
    });

    it('should not add scopes to existing credential if the scopes are not defined', function (done) {
      _credentialService
      .addScopesToCredential(username, 'oauth', 'undefinedScope')
      .then(function(res) {
        should.not.exist(res);
        done();
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('one or more scopes don\'t exist');
        done();
      });
    });

    it('should use default property if not defined', function (done) {
      let username2 = 'otherUser'
      let cred = {
        secret: 'password',
        scopes: 'someOtherOne',
        someProperty: 'propVal',
      };

      _credentialService
      .insertCredential(username2, 'oauth', cred)
      .then(function(newCredential) {
        should.exist(newCredential);
        newCredential.isActive.should.eql(true);
        newCredential.scopes.should.exist;
        newCredential.scopes.should.eql(['someOtherOne']);
        newCredential.someProperty.should.eql('propVal');
        should.not.exist(newCredential.secret);
        newCredential.otherProperty.should.eql('someDefaultValue');
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not create credential if a required property is not passed in', function (done) {
      let username3 = 'anotherUser'
      let cred = {
        secret: 'password',
        scopes: 'someScope',
      };

      _credentialService
      .insertCredential(username3, 'oauth', cred)
      .then(function(newCredential) {
        should.not.exist(newCredential);
        done();
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('someProperty is required');
        done();
      });
    });

    it('should not update credential with an update to an immutable property', function (done) {
      _credentialService
      .updateCredential(username, 'oauth', { someProperty: 'something' })
      .then(function(newCredential) {
        should.not.exist(newCredential);
        done();
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('someProperty is immutable');
        done();
      });
    });

    it('should not update credential when no properties are specified', function (done) {
      _credentialService
      .updateCredential(username, 'oauth', {})
      .then(function(newCredential) {
        should.not.exist(newCredential);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
});