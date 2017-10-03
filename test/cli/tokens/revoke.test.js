const assert = require('assert');
const request = require('supertest');
const app = require('../../oauth/bootstrap');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:tokens:revoke';
const idGen = require('uuid-base62');
const authService = require('../../../lib/services').auth;

describe('eg tokens revoke', () => {
  let program, env, user, accessToken;
  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    return adminHelper.admin.users.create({
      username: idGen.v4(),
      firstname: 'f',
      lastname: 'l'
    })
    .then(createdUser => {
      user = createdUser;
      return adminHelper.admin.credentials.create(user.username, 'oauth2', {secret: 'test'});
    })
    .then(createdCred => {
      // cred = createdCred;
      return request(app)
        .post('/oauth2/token')
        .set('Authorization', 'basic ' + (Buffer.from(user.username + ':test').toString('base64')))
        .set('content-type', 'application/x-www-form-urlencoded')
        .type('form')
        .send({
          grant_type: 'password',
          username: user.username,
          password: 'test'
        })
        .expect(200);
    })
    .then(res => {
      const token = res.body;
      assert.ok(token);
      assert.ok(token.access_token);
      accessToken = token.access_token;
      assert.equal(token.token_type, 'Bearer');
      return authService.authenticateToken(accessToken);
    })
    .then(res => {
      assert.equal(res.consumer.username, user.username);
    });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('revokes token', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.ok = message => {
          output = message;
        };
        generator.log.error = message => {
          done(new Error(message));
        };
      });

      generator.once('end', () => {
        assert.equal(output, 'Access token has been revoked: ' + accessToken);
        return authService.authenticateToken(accessToken).then(r => {
          assert.ok(!r); // authentication failed
          done();
        }).catch(done);
      });
    });

    env.argv = program.parse(`tokens revoke ` + accessToken);
  });
  it('revokes token -q', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.stdout = message => {
          output = message;
        };
        generator.log.error = message => {
          done(new Error(message));
        };
      });

      generator.once('end', () => {
        assert.equal(output, accessToken);
        return authService.authenticateToken(accessToken).then(r => {
          assert.ok(!r); // authentication failed
          done();
        }).catch(done);
      });
    });

    env.argv = program.parse(`tokens revoke -q ` + accessToken);
  });
});
