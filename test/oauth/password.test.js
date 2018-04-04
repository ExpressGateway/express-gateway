const session = require('supertest-session');
const should = require('should');

const app = require('./bootstrap');
const services = require('../../lib/services');
const { checkTokenResponse, createOAuthScenario } = require('./testUtils');

const tokenService = services.token;

describe('Functional Test Client Password grant', function () {
  let fromDbApp, refreshToken;

  before(() => createOAuthScenario().then(([user, app]) => { fromDbApp = app; }));

  it('should grant access token when no scopes are specified', function (done) {
    const request = session(app);
    const credentials = Buffer.from(fromDbApp.id.concat(':app-secret')).toString('base64');

    request
      .post('/oauth2/token')
      .set('Authorization', `basic ${credentials}`)
      .set('content-type', 'application/x-www-form-urlencoded')
      .type('form')
      .send({
        grant_type: 'password',
        username: 'irfanbaqui',
        password: 'user-secret'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        checkTokenResponse(res.body);
        done();
      });
  });

  it('should grant access token with authorized scopes', function (done) {
    const request = session(app);
    const credentials = Buffer.from(fromDbApp.id.concat(':app-secret')).toString('base64');

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
        if (err) return done(err);
        checkTokenResponse(res.body, ['refresh_token']);
        refreshToken = res.body.refresh_token;

        tokenService.get(res.body.access_token)
          .then(fromDbToken => {
            should.exist(fromDbToken);
            fromDbToken.scopes.should.eql(['someScope']);
            [fromDbToken.id, fromDbToken.tokenDecrypted].should.eql(res.body.access_token.split('|'));
            done();
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
        if (done) return done(err);
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

  it('should not grant access token with unauthorized scopes', function (done) {
    const request = session(app);
    const credentials = Buffer.from(fromDbApp.id.concat(':app-secret')).toString('base64');

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
      .end(done);
  });
});
