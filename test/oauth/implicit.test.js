const mock = require('mock-require');
mock('redis', require('fakeredis'));

const session = require('supertest-session');
const should = require('should');
const url = require('url');
const qs = require('querystring');
const app = require('./bootstrap');

const config = require('../../lib/config');
const services = require('../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;
const tokenService = services.token;
const db = require('../../lib/db')();

describe('Functional Test Implicit grant', function () {
  let originalAppConfig, originalCredentialConfig, originalUserConfig;
  let fromDbUser1, fromDbApp;

  before(function (done) {
    originalAppConfig = config.models.applications;
    originalCredentialConfig = config.models.credentials;
    originalUserConfig = config.models.users;

    config.models.applications.properties = {
      name: { isRequired: true, isMutable: true },
      redirectUri: { isRequired: true, isMutable: true }
    };

    config.models.credentials.oauth2 = {
      passwordKey: 'secret',
      properties: { scopes: { isRequired: false } }
    };

    config.models.credentials['basic-auth'] = {
      passwordKey: 'password',
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
      const user1 = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      const user2 = {
        username: 'somejoe',
        firstname: 'joe',
        lastname: 'smith',
        email: 'joe@eg.com'
      };

      Promise.all([userService.insert(user1), userService.insert(user2)])
      .then(([_fromDbUser1, _fromDbUser2]) => {
        should.exist(_fromDbUser1);
        should.exist(_fromDbUser2);

        fromDbUser1 = _fromDbUser1;

        const app1 = {
          name: 'irfan_app',
          redirectUri: 'https://some.host.com/some/route'
        };

        applicationService.insert(app1, fromDbUser1.id)
        .then(_fromDbApp => {
          should.exist(_fromDbApp);
          fromDbApp = _fromDbApp;

          return credentialService.insertScopes('someScope')
          .then(() => {
            return Promise.all([ credentialService.insertCredential(fromDbUser1.username, 'basic-auth', { password: 'user-secret' }),
              credentialService.insertCredential(fromDbApp.id, 'oauth2', { secret: 'app-secret', scopes: ['someScope'] }) ])
              .then(([userRes, appRes]) => {
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
    config.models.credentials.oauth2 = originalCredentialConfig.oauth;
    config.models.users.properties = originalUserConfig.properties;
    done();
  });

  it('should grant access token when requesting without scopes', function (done) {
    const request = session(app);
    request
      .get('/oauth2/authorize')
      .query({
        redirect_uri: fromDbApp.redirectUri,
        response_type: 'token',
        client_id: fromDbApp.id
      })
      .redirects(1)
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        res.redirects.length.should.equal(1);
        res.redirects[0].should.containEql('/login');
        request
        .post('/login')
        .query({
          username: 'irfanbaqui',
          password: 'user-secret'
        })
        .expect(302)
        .end(function (err, res) {
          should.not.exist(err);
          should.exist(res.headers.location);
          res.headers.location.should.containEql('/oauth2/authorize');
          request
          .get('/oauth2/authorize')
          .query({
            redirect_uri: fromDbApp.redirectUri,
            response_type: 'token',
            client_id: fromDbApp.id
          })
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            request
            .post('/oauth2/authorize/decision')
            .query({
              transaction_id: res.headers.transaction_id
            })
            .expect(302)
            .end(function (err, res) {
              should.not.exist(err);
              should.exist(res.headers.location);
              res.headers.location.should.containEql(fromDbApp.redirectUri);
              const params = qs.parse(url.parse(res.headers.location).hash.slice(1));
              should.exist(params.access_token);
              should.exist(params.token_type);

              tokenService.get(params.access_token)
              .then(token => {
                should.exist(token);
                should.not.exist(token.scopes);
                [ token.id, token.tokenDecrypted ].should.eql(params.access_token.split('|'));
                done();
              });
            });
          });
        });
      });
  });

  it('should grant access token with requesting with scopes and scopes are authorized', function (done) {
    const request = session(app);
    request
      .get('/oauth2/authorize')
      .query({
        redirect_uri: fromDbApp.redirectUri,
        response_type: 'token',
        client_id: fromDbApp.id
      })
      .redirects(1)
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        res.redirects.length.should.equal(1);
        res.redirects[0].should.containEql('/login');
        request
        .post('/login')
        .query({
          username: 'irfanbaqui',
          password: 'user-secret'
        })
        .expect(302)
        .end(function (err, res) {
          should.not.exist(err);
          should.exist(res.headers.location);
          res.headers.location.should.containEql('/oauth2/authorize');
          request
          .get('/oauth2/authorize')
          .query({
            redirect_uri: fromDbApp.redirectUri,
            response_type: 'token',
            client_id: fromDbApp.id,
            scope: 'someScope'
          })
          .expect(200)
          .end(function (err, res) {
            should.not.exist(err);
            request
            .post('/oauth2/authorize/decision')
            .query({
              transaction_id: res.headers.transaction_id
            })
            .expect(302)
            .end(function (err, res) {
              should.not.exist(err);
              should.exist(res.headers.location);
              res.headers.location.should.containEql(fromDbApp.redirectUri);
              const params = qs.parse(url.parse(res.headers.location).hash.slice(1));
              should.exist(params.access_token);
              should.exist(params.token_type);
              tokenService.get(params.access_token)
              .then(token => {
                should.exist(token);
                token.scopes.should.eql([ 'someScope' ]);
                [ token.id, token.tokenDecrypted ].should.eql(params.access_token.split('|'));
                done();
              });
            });
          });
        });
      });
  });

  it('should not grant access token with requesting with scopes and scopes are unauthorized', function (done) {
    const request = session(app);
    request
      .get('/oauth2/authorize')
      .query({
        redirect_uri: fromDbApp.redirectUri,
        response_type: 'token',
        client_id: fromDbApp.id
      })
      .redirects(1)
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        res.redirects.length.should.equal(1);
        res.redirects[0].should.containEql('/login');
        request
        .post('/login')
        .query({
          username: 'irfanbaqui',
          password: 'user-secret'
        })
        .expect(302)
        .end(function (err, res) {
          should.not.exist(err);
          should.exist(res.headers.location);
          res.headers.location.should.containEql('/oauth2/authorize');
          request
          .get('/oauth2/authorize')
          .query({
            redirect_uri: fromDbApp.redirectUri,
            response_type: 'token',
            client_id: fromDbApp.id,
            scope: 'someScope, someUnauthorizedScope'
          })
          .expect(403)
          .end(function (err) {
            should.not.exist(err);
            done();
          });
        });
      });
  });
});
