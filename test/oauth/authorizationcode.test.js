let session = require('supertest-session');
let should = require('should');
let url = require('url');
let qs = require('querystring');
let app = require('./bootstrap');
let request = session(app);

describe.skip('Functional Test Authorization Code grant', function () {
  it('should grant authorization code and access token', function (done) {
    request
      .get('/oauth2/authorize')
      .query({
        redirect_uri: 'https://localhost:443/callback',
        response_type: 'code',
        client_id: 'abc123',
        client_secret: 'ssh-secret'
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
          username: 'bob',
          password: 'secret'
        })
        .expect(302)
        .end(function (err, res) {
          should.not.exist(err);
          should.exist(res.headers.location);
          res.headers.location.should.containEql('/oauth2/authorize');
          request
          .get('/oauth2/authorize')
          .query({
            redirect_uri: 'https://localhost:443/callback',
            response_type: 'code',
            client_id: 'abc123',
            client_secret: 'ssh-secret'
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
              res.headers.location.should.containEql('https://localhost:443/callback');
              let params = qs.parse(url.parse(res.headers.location).search.slice(1));
              should.exist(params.code);
              request
              .post('/oauth2/token')
              .send({
                grant_type: 'authorization_code',
                redirect_uri: 'https://localhost:443/callback',
                client_id: 'abc123',
                client_secret: 'ssh-secret',
                code: params.code
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
        });
      });
    });
  });
});