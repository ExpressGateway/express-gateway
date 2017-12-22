const should = require('should');
const config = require('../../../lib/config');
const services = require('../../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const db = require('../../../lib/db');

describe('Credential service tests', () => {
  describe('Credential tests', () => {
    let credential;
    const username = 'someUser';

    before(() => db.flushdb());

    it('should insert a credential', () => {
      const _credential = {
        secret: 'password'
      };

      return credentialService
        .insertCredential(username, 'oauth2', _credential)
        .then((newCredential) => {
          should.exist(newCredential);
          credential = Object.assign(newCredential, _credential);
        });
    });

    it('should not insert a credential that already exists', () => {
      const _credential = {
        secret: 'password'
      };

      return should(credentialService.insertCredential(username, 'oauth2', _credential))
        .be.rejected();
    });

    it('should insert a credential without password specified if autoGeneratePassword is set to true', () => {
      const _credential = {};

      return credentialService
        .insertCredential('someUsername', 'oauth2', _credential)
        .then((newCredential) => {
          should.exist(newCredential);
          should.exist(newCredential.secret);
          should(newCredential.secret.length).greaterThanOrEqual(10);
        });
    });

    it('should insert a credential with id but different type that already exists', () => {
      const _credential = {
        password: 'password'
      };

      return credentialService
        .insertCredential(username, 'basic-auth', _credential)
        .then((newCredential) => {
          should.exist(newCredential);
          newCredential.isActive.should.eql(true);
        });
    });

    it('should get a credential', () => {
      return credentialService
        .getCredential(username, 'oauth2')
        .then((cred) => {
          should.exist(cred);
          should.not.exist(cred.secret);
          credential.isActive.should.eql(true);
        });
    });

    it('should deactivate a credential', () => {
      return credentialService
        .deactivateCredential(username, 'oauth2')
        .then(() => credentialService.getCredential(username, 'oauth2'))
        .then((cred) => {
          should.exist(cred);
          should.not.exist(cred.secret);
          cred.isActive.should.eql(false);
        });
    });

    it('should reactivate a credential', () => {
      return credentialService
        .activateCredential(username, 'oauth2')
        .then((res) => {
          should.exist(res);

          return credentialService.getCredential(username, 'oauth2');
        })
        .then((cred) => {
          should.exist(cred);
          should.not.exist(cred.secret);
          cred.isActive.should.eql(true);
        });
    });
  });

  describe('Credential Cascade Delete tests', () => {
    let user;

    before(() => {
      user = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      return db.flushdb()
        .then(() => userService.insert(user))
        .then((newUser) => {
          user = newUser;
          return Promise.all([
            credentialService.insertCredential(user.id, 'oauth2').then((oauthCred) => should.exist(oauthCred.secret)),
            credentialService.insertCredential(user.id, 'basic-auth').then((basicAuthCred) => should.exist(basicAuthCred.password))
          ]);
        });
    });

    it('should delete all credentials associated with a user when user is deleted', () => {
      return Promise.all([
        credentialService.getCredential(user.id, 'oauth2'),
        credentialService.getCredential(user.id, 'basic-auth')
      ])
        .then(([oauthRes, basicAuthRes]) => {
          should.exist(oauthRes); // Check to confirm the credentials exist
          should.exist(basicAuthRes);
          return userService.remove(user.id);
        })
        .then(res => {
          should.exist(res);
          return Promise.all([
            credentialService.getCredential(user.id, 'oauth2'),
            credentialService.getCredential(user.id, 'basic-auth')
          ]);
        })
        .then(([oauthResAfterDelete, basicAuthResAfterDelete]) => {
          should.not.exist(oauthResAfterDelete);
          should.not.exist(basicAuthResAfterDelete);
        });
    });

    it('should delete a credential', () => {
      return credentialService.insertCredential(user.id, 'oauth2').then(res => {
        should.exist(res);
        return credentialService.removeCredential(user.id, 'oauth2');
      }).then(deleted => {
        should(deleted).be.equal(1);
        return credentialService.getCredential(user.id, 'oauth2');
      }).then(resAfterDelete => should.not.exist(resAfterDelete));
    });
  });

  describe('Credential Property tests', () => {
    const originalModelConfig = config.models.credentials;
    const username = 'someUser';
    const _credential = {
      secret: 'password',
      scopes: 'someScope',
      someProperty: 'propVal'
    };

    before(() => {
      config.models.credentials.oauth2 = {
        passwordKey: 'secret',
        autoGeneratePassword: true,
        type: 'object',
        properties: {
          scopes: { type: 'string' },
          someProperty: { type: 'string' },
          otherProperty: { type: 'string', default: 'someDefaultValue' }
        },
        required: ['someProperty']
      };

      return db.flushdb();
    });

    after(() => {
      config.models.credentials = originalModelConfig;
    });

    it('should not insert a credential with scopes if the scopes are not defined', () => {
      return should(credentialService.insertCredential(username, 'oauth2', _credential))
        .be.rejectedWith('one or more scopes don\'t exist');
    });

    it('should insert a credential with scopes if the scopes are defined', () => {
      return credentialService.insertScopes('someScope')
        .then(() => credentialService.insertCredential(username, 'oauth2', _credential))
        .then((newCredential) => {
          should.exist(newCredential);
          should.exist(newCredential.scopes);
          should.not.exist(newCredential.secret);

          should(newCredential.isActive).eql(true);
          should(newCredential.scopes).eql(['someScope']);
          should(newCredential.someProperty).eql('propVal');
        });
    });

    it('should add scopes to existing credential if the scopes are defined', () => {
      return credentialService.insertScopes(['someScope1', 'someScope2', 'someScope3', 'someOtherOne'])
        .then(() => credentialService.addScopesToCredential(username, 'oauth2', ['someScope1', 'someScope2', 'someScope3', 'someOtherOne']))
        .then((res) => {
          credentialService
            .getCredential(username, 'oauth2')
            .then((cred) => {
              should.exist(cred);
              should.exist(cred.scopes);
              cred.isActive.should.eql(true);
              cred.scopes.should.containEql(_credential.scopes);
              cred.scopes.should.containEql('someScope1');
              cred.scopes.should.containEql('someScope2');
              cred.scopes.should.containEql('someScope3');
              cred.scopes.should.containEql('someOtherOne');
            });
        });
    });

    it('should remove scopes from existing credential', () => {
      return credentialService
        .removeScopesFromCredential(username, 'oauth2', ['someScope2', 'someScope3'])
        .then(() => credentialService.getCredential(username, 'oauth2'))
        .then((cred) => {
          should.exist(cred);
          should.exist(cred.scopes);
          cred.scopes.should.containEql(_credential.scopes);
          cred.scopes.should.containEql('someScope1');
          cred.scopes.should.not.containEql('someScope2');
          cred.scopes.should.not.containEql('someScope3');
          cred.isActive.should.eql(true);
        });
    });

    it('should remove scopes from credential if the scope is deleted', () => {
      return credentialService.removeScopes(['someScope1', 'someScope'])
        .then(() => credentialService.getCredential(username, 'oauth2'))
        .then((cred) => {
          should.exist(cred);
          should.exist(cred.scopes);
          cred.scopes.should.containEql('someOtherOne');
          cred.scopes.should.not.containEql('someScope1');
          cred.scopes.should.not.containEql('someScope');
          cred.isActive.should.eql(true);
        });
    });

    it('should not add scopes to existing credential if the scopes are not defined', () => {
      return should(credentialService.addScopesToCredential(username, 'oauth2', 'undefinedScope'))
        .be.rejectedWith('one or more scopes don\'t exist');
    });

    it('should use default property if not defined', () => {
      const username2 = 'otherUser';
      const cred = {
        secret: 'password',
        scopes: 'someOtherOne',
        someProperty: 'propVal'
      };

      return credentialService
        .insertCredential(username2, 'oauth2', cred)
        .then((newCredential) => {
          should.exist(newCredential);
          newCredential.isActive.should.eql(true);
          should.exist(newCredential.scopes);
          newCredential.scopes.should.eql(['someOtherOne']);
          newCredential.someProperty.should.eql('propVal');
          should.not.exist(newCredential.secret);
          newCredential.otherProperty.should.eql('someDefaultValue');
        });
    });

    it('should not create credential if a required property is not passed in', () => {
      const username3 = 'anotherUser';
      const cred = {
        secret: 'password',
        scopes: 'someScope'
      };

      return should(credentialService
        .insertCredential(username3, 'oauth2', cred))
        .be.rejectedWith('data should have required property \'.someProperty\'')
        .then(() => credentialService.getCredential(username3, 'oauth2'))
        .then(credential => should.not.exist(credential));
    });

    it('should not update credential when no properties are specified', () => {
      return credentialService
        .updateCredential(username, 'oauth2', {})
        .then((newCredential) => {
          should.not.exist(newCredential);
          return credentialService.getCredential(username, 'oauth2');
        })
        .then(credential => {
          should.exist(credential);
        });
    });
  });
});
