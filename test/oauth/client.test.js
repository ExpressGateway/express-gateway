const session = require('supertest-session');
const should = require('should');

const app = require('./bootstrap');
const checkTokenResponse = require('./checkTokenResponse');
const services = require('../../lib/services');
const db = require('../../lib/db');

const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;
const tokenService = services.token;

describe('Functional Test Client Credentials grant', function () {
  let fromDbUser1, fromDbApp;

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

  before(() =>
    db.flushdb()
      .then(() => Promise.all([userService.insert(user1), userService.insert(user2)]))
      .then(([_fromDbUser1, _fromDbUser2]) => {
        should.exist(_fromDbUser1);
        should.exist(_fromDbUser2);

        fromDbUser1 = _fromDbUser1;

        const app1 = {
          name: 'irfan_app',
          redirectUri: 'https://some.host.com/some/route'
        };

        return applicationService.insert(app1, fromDbUser1.id);
      })
      .then(_fromDbApp => {
        should.exist(_fromDbApp);
        fromDbApp = _fromDbApp;

        return credentialService.insertScopes(['someScope']);
      })
      .then(() => Promise.all([
        credentialService.insertCredential(fromDbUser1.id, 'basic-auth', { password: 'user-secret' }),
        credentialService.insertCredential(fromDbApp.id, 'oauth2', { secret: 'app-secret', scopes: ['someScope'] })
      ]))
      .then(([userRes, appRes]) => {
        should.exist(userRes);
        should.exist(appRes);
      })
  );

  it('should grant access token for requests without scopes', function (done) {
    const request = session(app);

    request
      .post('/oauth2/token')
      .send({
        grant_type: 'client_credentials',
        client_id: fromDbApp.id,
        client_secret: 'app-secret'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        checkTokenResponse(res.body);
        done();
      });
  });

  it('should grant access token for requests with authorized scopes', function (done) {
    const request = session(app);

    request
      .post('/oauth2/token')
      .send({
        grant_type: 'client_credentials',
        client_id: fromDbApp.id,
        client_secret: 'app-secret',
        scope: 'someScope'
      })
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
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

  it('should not grant access token for requests with unauthorized scopes', function (done) {
    const request = session(app);

    request
      .post('/oauth2/token')
      .send({
        grant_type: 'client_credentials',
        client_id: fromDbApp.id,
        client_secret: 'app-secret',
        scope: 'someScope unauthorizedScope'
      })
      .expect(401)
      .end(done);
  });
});
