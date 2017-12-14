const session = require('supertest-session');
const should = require('should');
const app = require('./bootstrap');
const services = require('../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;
const tokenService = services.token;
const db = require('../../lib/db');

describe('Functional Test Client Credentials grant', function () {
  let user, application;

  before(function (done) {
    db.flushdb()
      .then(() => {
        const user1 = {
          username: 'irfanbaqui',
          firstname: 'irfan',
          lastname: 'baqui',
          email: 'irfan@eg.com'
        };

        userService.insert(user1)
          .then(_user => {
            should.exist(_user);
            user = _user;

            const app1 = {
              name: 'irfan_app',
              redirectUri: 'https://some.host.com/some/route'
            };

            applicationService.insert(app1, user.id)
              .then(_app => {
                should.exist(_app);
                application = _app;

                return credentialService.insertScopes('someScope')
                  .then(() => {
                    credentialService.insertCredential(application.id, 'oauth2', { secret: 'app-secret', scopes: ['someScope'] })
                      .then(res => {
                        should.exist(res);
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

  it('should grant access token for requests without scopes', function (done) {
    const request = session(app);

    request
      .post('/oauth2/token')
      .send({
        grant_type: 'client_credentials',
        client_id: application.id,
        client_secret: 'app-secret'
      })
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        const token = res.body;
        should.exist(token);
        should.exist(token.access_token);
        token.token_type.should.equal('Bearer');
        done();
      });
  });

  it('should grant access token for requests with authorized scopes', function (done) {
    const request = session(app);

    request
      .post('/oauth2/token')
      .send({
        grant_type: 'client_credentials',
        client_id: application.id,
        client_secret: 'app-secret',
        scope: 'someScope'
      })
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        const token = res.body;
        should.exist(token);
        should.exist(token.access_token);
        token.token_type.should.equal('Bearer');
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
        client_id: application.id,
        client_secret: 'app-secret',
        scope: 'someScope unauthorizedScope'
      })
      .expect(401)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });
});
