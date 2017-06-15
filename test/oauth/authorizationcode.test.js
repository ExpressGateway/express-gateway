let session = require('supertest-session');
let should = require('should');
let url = require('url');
let qs = require('querystring');
let app = require('./bootstrap');
let Promise = require('bluebird');

let config = require('../config.models.js');
let db = require('../../src/db').getDb();

let credentialService, userService, applicationService, tokenService;

describe('Functional Test Authorization Code grant', function () {
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
      properties: { scopes: { isRequired: false } }
    };

    credentialService = require('../../src/credentials/credential.service.js')(config);
    userService = require('../../src/consumers/user.service.js')(config);
    applicationService = require('../../src/consumers/application.service.js')(config);
    tokenService = require('../../src/tokens/token.service.js')(config);

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

      Promise.all([userService.insert(user1), userService.insert(user2)])
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

          return credentialService.insertScopes('someScope')
          .then(() => {
            return Promise.all([ credentialService.insertCredential(fromDbUser1.username, 'oauth', { secret: 'user-secret' }),
              credentialService.insertCredential(fromDbApp.id, 'oauth', { secret: 'app-secret', scopes: ['someScope'] }) ])
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

  it('should grant access token if requesting without scopes', function (done) {
    let request = session(app);
    request
      .get('/oauth2/authorize')
      .query({
        redirect_uri: fromDbApp.redirectUri,
        response_type: 'code',
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
            response_type: 'code',
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
              let params = qs.parse(url.parse(res.headers.location).search.slice(1));
              should.exist(params.code);
              request
              .post('/oauth2/token')
              .send({
                grant_type: 'authorization_code',
                redirect_uri: fromDbApp.redirectUri,
                client_id: fromDbApp.id,
                client_secret: 'app-secret',
                code: params.code
              })
              .expect(200)
              .end(function (err, res) {
                should.not.exist(err);
                should.exist(res.body.access_token);
                res.body.access_token.length.should.be.greaterThan(15);
                should.exist(res.body.token_type);
                res.body.token_type.should.eql('Bearer');
                done();
              });
            });
          });
        });
      });
  });

  it('should grant access token if requesting with scopes and scopes are authorized', function (done) {
    let request = session(app);
    request
      .get('/oauth2/authorize')
      .query({
        redirect_uri: fromDbApp.redirectUri,
        response_type: 'code',
        client_id: fromDbApp.id,
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
            response_type: 'code',
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
              let params = qs.parse(url.parse(res.headers.location).search.slice(1));
              should.exist(params.code);
              request
              .post('/oauth2/token')
              .send({
                grant_type: 'authorization_code',
                redirect_uri: fromDbApp.redirectUri,
                client_id: fromDbApp.id,
                client_secret: 'app-secret',
                code: params.code
              })
              .expect(200)
              .end(function (err, res) {
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
          });
        });
      });
  });

  it('should not grant access token if consumer is not authorized to requested scopes', function (done) {
    let request = session(app);
    request
      .get('/oauth2/authorize')
      .query({
        redirect_uri: fromDbApp.redirectUri,
        response_type: 'code',
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
            response_type: 'code',
            client_id: fromDbApp.id,
            scope: 'someScope, unauthorizedScope'
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
