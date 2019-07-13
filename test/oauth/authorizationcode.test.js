const session = require('supertest-session');
const should = require('should');
const url = require('url');
const qs = require('querystring');

const app = require('./bootstrap');
const services = require('../../lib/services');
const { checkTokenResponse, createOAuthScenario } = require('./testUtils');

const tokenService = services.token;

describe('Functional Test Authorization Code grant', function () {
  let fromDbApp, fromDbUser, refreshToken;

  before(() => createOAuthScenario().then(([user, app]) => { fromDbUser = user; fromDbApp = app; }));

  it('should grant access token if requesting without scopes', function (done) {
    const request = session(app);
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
                    const params = qs.parse(url.parse(res.headers.location).search.slice(1));
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
                        if (err) return done(err);
                        checkTokenResponse(res.body);
                        done();
                      });
                  });
              });
          });
      });
  });

  it('should grant access token if requesting with scopes and scopes are authorized', function (done) {
    const request = session(app);
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
                    const params = qs.parse(url.parse(res.headers.location).search.slice(1));
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
                        if (err) return done(err);
                        checkTokenResponse(res.body, ['refresh_token']);
                        refreshToken = res.body.refresh_token;
                        tokenService.get(res.body.access_token)
                          .then(token => {
                            should.exist(token);
                            token.scopes.should.eql(['someScope']);
                            [token.id, token.tokenDecrypted].should.eql(res.body.access_token.split('|'));
                            done();
                          });
                      });
                  });
              });
          });
      });
  });

  it('should grant access token in exchange of refresh token', function (done) {
    const request = session(app);

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
        if (err) return done(err);
        checkTokenResponse(res.body);
        tokenService.get(res.body.access_token)
          .then(token => {
            should.exist(token);
            token.scopes.should.eql(['someScope']);
            [token.id, token.tokenDecrypted].should.eql(res.body.access_token.split('|'));
            done();
          });
      });
  });

  it('should not grant access token if consumer is not authorized to requested scopes', function (done) {
    const request = session(app);
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
                response_type: 'code',
                client_id: fromDbApp.id,
                scope: 'someScope, unauthorizedScope'
              })
              .expect(403)
              .end(done);
          });
      });
  });

  it('should not grant access token if code is expired', function (done) {
    const config = require('../../lib/config');
    config.systemConfig.authorizationCodes.timeToExpiry = 0;
    const request = session(app);
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
                    const params = qs.parse(url.parse(res.headers.location).search.slice(1));
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
                      .expect(403)
                      .end(function (err, res) {
                        if (err) return done(err);
                        done();
                      });
                  });
              });
          });
      });
  });
});
