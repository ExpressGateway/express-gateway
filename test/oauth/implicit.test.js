const session = require('supertest-session');
const should = require('should');
const url = require('url');
const qs = require('querystring');
const app = require('./bootstrap');

const services = require('../../lib/services');
const { createOAuthScenario } = require('./testUtils');
const tokenService = services.token;

describe('Functional Test Implicit grant', function () {
  let fromDbApp, fromDbUser;

  before(() => createOAuthScenario().then(([user, app]) => { fromDbUser = user; fromDbApp = app; }));

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
            username: fromDbUser.username,
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
                  .query({ transaction_id: res.headers.transaction_id })
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
                        [token.id, token.tokenDecrypted].should.eql(params.access_token.split('|'));
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
            username: fromDbUser.username,
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
                  .query({ transaction_id: res.headers.transaction_id })
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
                        token.scopes.should.eql(['someScope']);
                        [token.id, token.tokenDecrypted].should.eql(params.access_token.split('|'));
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
            username: fromDbUser.username,
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
              .end(done);
          });
      });
  });
});
