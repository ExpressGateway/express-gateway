let session = require('supertest-session');
let should = require('should');
let app = require('./bootstrap');
let Promise = require('bluebird');

let config = require('../config.models.js');
let db = require('../../src/db').getDb();

let credentialService, userService, applicationService;

describe('Functional Test Client Password grant', function () {
  let originalAppConfig, originalOauthConfig;
  let fromDbUser1, fromDbApp;

  before(function (done) {
    originalAppConfig = config.applications;
    originalOauthConfig = config.credentials.types.oauth;

    config.applications.properties = {
      name: { isRequired: true, isMutable: true },
      redirectUri: { isRequired: true, isMutable: true }
    };

    config.credentials.types.oauth = {
      passwordKey: 'secret',
      properties: {
        scopes: { isRequired: false }
      }
    };

    credentialService = require('../../src/credentials/credential.service.js')(config);
    userService = require('../../src/consumers/user.service.js')(config);
    applicationService = require('../../src/consumers/application.service.js')(config);

    db.flushdbAsync()
    .then(function (didSucceed) {
      if (!didSucceed) {
        console.log('Failed to flush the database');
      }
      let user1 = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      let user2 = {
        username: 'somejoe',
        firstname: 'joe',
        lastname: 'smith',
        email: 'joe@eg.com'
      };

      return Promise.all([userService.insert(user1), userService.insert(user2)])
      .spread((_fromDbUser1, _fromDbUser2) => {
        should.exist(_fromDbUser1);
        should.exist(_fromDbUser2);

        fromDbUser1 = _fromDbUser1;

        let app1 = {
          name: 'irfan_app',
          redirectUri: 'https://some.host.com/some/route'
        };

        applicationService.insert(app1, fromDbUser1.id)
        .then(_fromDbApp => {
          should.exist(_fromDbApp);
          fromDbApp = _fromDbApp;

          credentialService.insertScopes('someScope')
          .then(() => {
            Promise.all([ credentialService.insertCredential(fromDbUser1.username, 'oauth', { secret: 'user-secret' }),
            credentialService.insertCredential(fromDbApp.id, 'oauth', { secret: 'app-secret', scopes: [ 'someScope' ] }) ])
            .spread((userRes, appRes) => {
              should.exist(userRes);
              should.exist(appRes);
              done();
            });
          });
        });
      });
    })
    .catch(function (err) {
      should.not.exist(err);
      done();
    });
  });

  after((done) => {
    config.applications = originalAppConfig;
    config.credentials.types.oauth = originalOauthConfig;
    done();
  });

  it('should grant access token when no scopes are specified', function (done) {
    let request = session(app);
    let credentials = Buffer.from(fromDbApp.id.concat(':app-secret')).toString('base64');

    request
    .post('/oauth2/token')
    .set('Authorization', 'basic ' + credentials)
    .set('content-type', 'application/x-www-form-urlencoded')
    .type('form')
    .send({
      grant_type: 'password',
      username: 'irfanbaqui',
      password: 'user-secret'
    })
    .expect(200)
    .end(function (err, res) {
      should.not.exist(err);
      let token = res.body;
      should.exist(token);
      should.exist(token.access_token);
      token.token_type.should.equal('Bearer');
      done();
    });
  });

  it('should grant access token with authorized scopes', function (done) {
    let request = session(app);
    let credentials = new Buffer(fromDbApp.id.concat(':app-secret')).toString('base64');

    request
    .post('/oauth2/token')
    .set('Authorization','basic ' + credentials)
    .set('content-type', 'application/x-www-form-urlencoded')
    .type('form')
    .send({
      grant_type: 'password',
      username: 'irfanbaqui',
      password: 'user-secret',
      scope: 'someScope'
    })
    .expect(200)
    .end(function (err, res) {
      should.not.exist(err);
      let token = res.body;
      should.exist(token);
      should.exist(token.access_token);
      token.token_type.should.equal('Bearer');
      done();
    });
  });

  it('should not grant access token with unauthorized scopes', function (done) {
    let request = session(app);
    let credentials = new Buffer(fromDbApp.id.concat(':app-secret')).toString('base64');

    request
    .post('/oauth2/token')
    .set('Authorization','basic ' + credentials)
    .set('content-type', 'application/x-www-form-urlencoded')
    .type('form')
    .send({
      grant_type: 'password',
      username: 'irfanbaqui',
      password: 'user-secret',
      scope: 'someScope unauthorizedScope'
    })
    .expect(401)
    .end(function (err) {
      should.not.exist(err);
      done();
    });
  });
});
