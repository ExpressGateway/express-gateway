const session = require('supertest-session');
const should = require('should');
const url = require('url');
const qs = require('querystring');

const app = require('./bootstrap');
const db = require('../../lib/db');
const services = require('../../lib/services');
const checkTokenResponse = require('./checkTokenResponse');

const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;
const tokenService = services.token;

describe('Functional Test Authorization Code grant', function () {
  let fromDbUser1, fromDbApp, refreshToken;

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

  const app1 = {
    name: 'irfan_app',
    redirectUri: 'https://some.host.com/some/route'
  };

  before(() =>
    db.flushdb()
      .then(() => Promise.all([userService.insert(user1), userService.insert(user2)]))
      .then(([_fromDbUser1, _fromDbUser2]) => {
        should.exist(_fromDbUser1);
        should.exist(_fromDbUser2);

        fromDbUser1 = _fromDbUser1;
        return applicationService.insert(app1, fromDbUser1.id);
      })
      .then(_fromDbApp => {
        should.exist(_fromDbApp);
        fromDbApp = _fromDbApp;

        return credentialService.insertScopes(['someScope']);
      }).then(() =>
        Promise.all([
          credentialService.insertCredential(fromDbUser1.id, 'basic-auth', { password: 'user-secret' }),
          credentialService.insertCredential(fromDbApp.id, 'oauth2', { secret: 'app-secret', scopes: ['someScope'] })
        ])
      ).then(([userRes, appRes]) => {
        should.exist(userRes);
        should.exist(appRes);
      }));

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
              .end(done);
          });
      });
  });
});
