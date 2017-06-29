let mock = require('mock-require');
mock('redis', require('fakeredis'));

let session = require('supertest-session');
let should = require('should');
let app = require('./bootstrap');
let Promise = require('bluebird');

let config = require('../../lib/config');
let services = require('../../lib/services');
let credentialService = services.credential;
let userService = services.user;
let applicationService = services.application;
let tokenService = services.token;
let db = require('../../lib/db')();

describe('Functional Test Client Password grant', function () {
  let originalAppConfig, originalCredentialConfig, originalUserConfig;
  let fromDbUser1, fromDbApp, refreshToken;

  before(function (done) {
    originalAppConfig = config.models.applications;
    originalCredentialConfig = config.models.credentials;
    originalUserConfig = config.models.users;

    config.models.applications.properties = {
      name: { isRequired: true, isMutable: true },
      redirectUri: { isRequired: true, isMutable: true }
    };

    config.models.credentials.oauth = {
      passwordKey: 'secret',
      properties: { scopes: { isRequired: false } }
    };

    config.models.users.properties = {
      firstname: {isRequired: true, isMutable: true},
      lastname: {isRequired: true, isMutable: true},
      email: {isRequired: false, isMutable: true}
    };

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
    config.models.applications.properties = originalAppConfig.properties;
    config.models.credentials.oauth = originalCredentialConfig.oauth;
    config.models.users.properties = originalUserConfig.properties;
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
    let credentials = Buffer.from(fromDbApp.id.concat(':app-secret')).toString('base64');

    request
    .post('/oauth2/token')
    .set('Authorization', 'basic ' + credentials)
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
      should.exist(token.refresh_token);
      token.token_type.should.equal('Bearer');
      refreshToken = token.refresh_token;

      tokenService.get(token.access_token)
        .then(fromDbToken => {
          should.exist(fromDbToken);
          fromDbToken.scopes.should.eql([ 'someScope' ]);
          [ fromDbToken.id, fromDbToken.tokenDecrypted ].should.eql(token.access_token.split('|'));
          done();
        });
    });
  });

  it('should grant access token in exchange of refresh token', function (done) {
    let request = session(app);

    request
      .post('/oauth2/token')
      .set('Content-Type', 'application/json')
      .send({
        grant_type: 'refresh_token',
        client_id: fromDbApp.id,
        client_secret: 'app-secret',
        refresh_token: refreshToken
      })
      .expect(200)
      .end((err, res) => {
        should.not.exist(err);
        should.exist(res.body.access_token);
        res.body.access_token.length.should.be.greaterThan(15);
        should.exist(res.body.token_type);
        res.body.token_type.should.eql('Bearer');
        tokenService.get(res.body.access_token)
          .then(token => {
            should.exist(token);
            token.scopes.should.eql([ 'someScope' ]);
            [ token.id, token.tokenDecrypted ].should.eql(res.body.access_token.split('|'));
            done();
          });
      });
  });

  it('should not grant access token with unauthorized scopes', function (done) {
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
