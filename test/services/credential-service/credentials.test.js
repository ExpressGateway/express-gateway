const mock = require('mock-require');
mock('redis', require('fakeredis'));

const should = require('should');
const config = require('../../../lib/config');
const services = require('../../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const db = require('../../../lib/db')();

describe('Credential service tests', function () {
  describe('Credential tests', function () {
    let credential;
    const originalModelConfig = config.models.credentials;
    const username = 'someUser';

    before(function (done) {
      config.models.credentials.oauth2 = {
        passwordKey: 'secret',
        autoGeneratePassword: true,
        properties: {
          scopes: { isRequired: false, isMutable: true, defaultVal: null }
        }
      };

      config.models.credentials['basic-auth'] = {
        passwordKey: 'password',
        autoGeneratePassword: true,
        properties: {
          scopes: { isRequired: false, isMutable: true, userDefined: true }
        }
      };

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

    after(function (done) {
      config.models.credentials = originalModelConfig;
      done();
    });

    it('should insert a credential', function (done) {
      const _credential = {
        secret: 'password'
      };

      credentialService
        .insertCredential(username, 'oauth2', _credential)
        .then(function (newCredential) {
          should.exist(newCredential);
          credential = Object.assign(newCredential, _credential);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should not insert a credential that already exists', function (done) {
      const _credential = {
        secret: 'password'
      };

      credentialService
        .insertCredential(username, 'oauth2', _credential)
        .then(function (newCredential) {
          should.not.exist(newCredential);
          done();
        })
        .catch(function (err) {
          should.exist(err);
          done();
        });
    });

    it('should insert a credential without password specified if autoGeneratePassword is set to true', function (done) {
      const _credential = {};

      credentialService
        .insertCredential('someUsername', 'oauth2', _credential)
        .then(function (newCredential) {
          should.exist(newCredential);
          should.exist(newCredential.secret);
          newCredential.secret.length.should.greaterThanOrEqual(10);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should insert a credential with id but different type that already exists', function (done) {
      const _credential = {
        password: 'password'
      };

      credentialService
        .insertCredential(username, 'basic-auth', _credential)
        .then(function (newCredential) {
          should.exist(newCredential);
          newCredential.isActive.should.eql(true);
          done();
        })
        .catch(done);
    });

    it('should get a credential', function (done) {
      credentialService
        .getCredential(username, 'oauth2')
        .then(function (cred) {
          should.exist(cred);
          should.not.exist(cred.secret);
          credential.isActive.should.eql(true);
          done();
        })
        .catch(done);
    });

    it('should deactivate a credential', function (done) {
      credentialService
        .deactivateCredential(username, 'oauth2')
        .then(function (res) {
          credentialService
            .getCredential(username, 'oauth2')
            .then(function (cred) {
              should.exist(cred);
              should.not.exist(cred.secret);
              cred.isActive.should.eql(false);
              done();
            });
        })
        .catch(done);
    });

    it('should reactivate a credential', function (done) {
      credentialService
        .activateCredential(username, 'oauth2')
        .then(function (res) {
          should.exist(res);

          credentialService
            .getCredential(username, 'oauth2')
            .then(function (cred) {
              should.exist(cred);
              should.not.exist(cred.secret);
              cred.isActive.should.eql(true);
              done();
            });
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });
  });

  describe('Credential Cascade Delete tests', function () {
    let user;
    const originalModelConfig = config.models.credentials;

    before(function (done) {
      config.models.credentials.oauth2 = {
        passwordKey: 'secret',
        autoGeneratePassword: true,
        properties: {
          scopes: { isRequired: false, isMutable: true, defaultVal: null }
        }
      };

      config.models.credentials['basic-auth'] = {
        passwordKey: 'password',
        autoGeneratePassword: true,
        properties: {
          scopes: { isRequired: false, isMutable: true, userDefined: true }
        }
      };

      user = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      db.flushdbAsync()
        .then(function (didSucceed) {
          if (!didSucceed) {
            console.log('Failed to flush the database');
          }
          userService
            .insert(user)
            .then(function (newUser) {
              should.exist(newUser);
              user = newUser;
              credentialService.insertCredential(user.username, 'oauth2')
                .then((oauthCred) => {
                  should.exist(oauthCred.secret);
                  credentialService.insertCredential(user.username, 'basic-auth')
                    .then((basicAuthCred) => {
                      should.exist(basicAuthCred.password);
                      done();
                    });
                });
            });
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    after(function (done) {
      config.models.credentials = originalModelConfig;
      done();
    });

    it('should delete all credentials associated with a user when user is deleted', function (done) {
      Promise.all([credentialService.getCredential(user.username, 'oauth2'),
        credentialService.getCredential(user.username, 'basic-auth')])
        .then(([oauthRes, basicAuthRes]) => {
          should.exist(oauthRes); // Check to confirm the credentials exist
          should.exist(basicAuthRes);
          return userService.remove(user.id)
            .then(res => {
              should.exist(res);
              return Promise.all([credentialService.getCredential(user.username, 'oauth2'),
                credentialService.getCredential(user.username, 'basic-auth')])
                .then(([oauthResAfterDelete, basicAuthResAfterDelete]) => {
                  should.not.exist(oauthResAfterDelete);
                  should.not.exist(basicAuthResAfterDelete);
                  done();
                });
            });
        });
    });

    it('should delete a credential', function (done) {
      credentialService.insertCredential(user.username, 'oauth2')
        .then(res => {
          credentialService.removeCredential(user.username, 'oauth2')
            .then(deleted => {
              credentialService.getCredential(user.username, 'oauth2')
                .then(resAfterDelete => {
                  done();
                });
            });
        });
    });
  });

  describe('Credential Property tests', function () {
    const originalModelConfig = config.models.credentials;
    const username = 'someUser';
    const _credential = {
      secret: 'password',
      scopes: 'someScope',
      someProperty: 'propVal'
    };

    before(function (done) {
      config.models.credentials.oauth2 = {
        passwordKey: 'secret',
        autoGeneratePassword: true,
        properties: {
          scopes: { isRequired: false },
          someProperty: { isRequired: true, isMutable: false },
          otherProperty: { defaultValue: 'someDefaultValue' }
        }
      };

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

    after(function (done) {
      config.models.credentials = originalModelConfig;
      done();
    });

    it('should not insert a credential with scopes if the scopes are not defined', function (done) {
      credentialService
        .insertCredential(username, 'oauth2', _credential)
        .then(function (newCredential) {
          should.not.exist(newCredential);
          done();
        })
        .catch(function (err) {
          should.exist(err);
          err.message.should.eql('one or more scopes don\'t exist');
          done();
        });
    });

    it('should insert a credential with scopes if the scopes are defined', function (done) {
      credentialService.insertScopes('someScope')
        .then(() => {
          credentialService
            .insertCredential(username, 'oauth2', _credential)
            .then(function (newCredential) {
              should.exist(newCredential);
              newCredential.isActive.should.eql(true);
              should.exist(newCredential.scopes);
              newCredential.scopes.should.eql(['someScope']);
              newCredential.someProperty.should.eql('propVal');
              newCredential.otherProperty.should.eql('someDefaultValue');
              should.not.exist(newCredential.secret);
              done();
            })
            .catch(function (err) {
              should.not.exist(err);
              done();
            });
        });
    });

    it('should add scopes to existing credential if the scopes are defined', function (done) {
      credentialService.insertScopes(['someScope1', 'someScope2', 'someScope3', 'someOtherOne'])
        .then(() => {
          credentialService
            .addScopesToCredential(username, 'oauth2', ['someScope1', 'someScope2', 'someScope3', 'someOtherOne'])
            .then(function (res) {
              credentialService
                .getCredential(username, 'oauth2')
                .then(function (cred) {
                  should.exist(cred);
                  should.exist(cred.scopes);
                  cred.scopes.should.containEql(_credential.scopes);
                  cred.scopes.should.containEql('someScope1');
                  cred.scopes.should.containEql('someScope2');
                  cred.scopes.should.containEql('someScope3');
                  cred.scopes.should.containEql('someOtherOne');
                  cred.isActive.should.eql(true);
                  done();
                });
            })
            .catch(function (err) {
              should.not.exist(err);
              done();
            });
        });
    });

    it('should remove scopes from existing credential', function (done) {
      credentialService
        .removeScopesFromCredential(username, 'oauth2', ['someScope2', 'someScope3'])
        .then(function (res) {
          credentialService
            .getCredential(username, 'oauth2')
            .then(function (cred) {
              should.exist(cred);
              should.exist(cred.scopes);
              cred.scopes.should.containEql(_credential.scopes);
              cred.scopes.should.containEql('someScope1');
              cred.scopes.should.not.containEql('someScope2');
              cred.scopes.should.not.containEql('someScope3');
              cred.isActive.should.eql(true);
              done();
            });
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should remove scopes from credential if the scope is deleted', function (done) {
      credentialService
        .removeScopes(['someScope1', 'someScope'])
        .then(function (res) {
          credentialService
            .getCredential(username, 'oauth2')
            .then(function (cred) {
              should.exist(cred);
              should.exist(cred.scopes);
              cred.scopes.should.containEql('someOtherOne');
              cred.scopes.should.not.containEql('someScope1');
              cred.scopes.should.not.containEql('someScope');
              cred.isActive.should.eql(true);
              done();
            });
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should not add scopes to existing credential if the scopes are not defined', function (done) {
      credentialService
        .addScopesToCredential(username, 'oauth2', 'undefinedScope')
        .then(function (res) {
          should.not.exist(res);
          done();
        })
        .catch(function (err) {
          should.exist(err);
          err.message.should.eql('one or more scopes don\'t exist');
          done();
        });
    });

    it('should use default property if not defined', function (done) {
      const username2 = 'otherUser';
      const cred = {
        secret: 'password',
        scopes: 'someOtherOne',
        someProperty: 'propVal'
      };

      credentialService
        .insertCredential(username2, 'oauth2', cred)
        .then(function (newCredential) {
          should.exist(newCredential);
          newCredential.isActive.should.eql(true);
          should.exist(newCredential.scopes);
          newCredential.scopes.should.eql(['someOtherOne']);
          newCredential.someProperty.should.eql('propVal');
          should.not.exist(newCredential.secret);
          newCredential.otherProperty.should.eql('someDefaultValue');
          done();
        })
        .catch(done);
    });

    it('should not create credential if a required property is not passed in', function (done) {
      const username3 = 'anotherUser';
      const cred = {
        secret: 'password',
        scopes: 'someScope'
      };

      credentialService
        .insertCredential(username3, 'oauth2', cred)
        .then(function () {
          throw new Error('test failed');
        })
        .catch(function (err) {
          should.exist(err);
          err.message.should.eql('someProperty is required');
          credentialService.getCredential(username3, 'oauth2')
            .then(credential => {
              should.not.exist(credential);
              done();
            })
            .catch(err => {
              should.not.exist(err);
              done();
            });
        });
    });

    it('should not update credential with an update to an immutable property', function (done) {
      credentialService
        .updateCredential(username, 'oauth2', { someProperty: 'something' })
        .then(function () {
          throw new Error('test failed');
        })
        .catch(function (err) {
          should.exist(err);
          err.message.should.eql('someProperty is immutable');
          credentialService.getCredential(username, 'oauth2')
            .then(credential => {
              should.exist(credential);
              done();
            });
        });
    });

    it('should not update credential when no properties are specified', function (done) {
      credentialService
        .updateCredential(username, 'oauth2', {})
        .then(function (newCredential) {
          should.not.exist(newCredential);
          credentialService.getCredential(username, 'oauth2')
            .then(credential => {
              should.exist(credential);
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
