const mock = require('mock-require');
mock('redis', require('fakeredis'));

const should = require('should');
const _ = require('lodash');
const services = require('../../lib/services');
const authCodeService = services.authorizationCode;
const db = require('../../lib/db')();

describe('Authorization Code Tests', function () {
  let newCode, codeFromDb;

  before(function (done) {
    db.flushdbAsync()
    .then(function (didSucceed) {
      if (!didSucceed) {
        console.log('Failed to flush the database');
      }
      done();
    })
    .catch(done);
  });

  it('should save a code', function (done) {
    newCode = {
      consumerId: 'clientId',
      userId: 'userId',
      redirectUri: 'redirectUri',
      scopes: [ 'scope1', 'scope2' ]
    };

    authCodeService.save(newCode)
    .then((code) => {
      should.exist(code);
      should.exist(code.id);
      code.id.length.should.be.greaterThan(15);
      should.ok(new Date(code.expiresAt) > Date.now());
      _.omit(code, [ 'id', 'createdAt', 'expiresAt' ]).should.deepEqual(newCode);
      codeFromDb = code;
      done();
    })
    .catch(done);
  });

  it('should find a code', function (done) {
    const criteria = Object.assign(newCode, { id: codeFromDb.id });

    authCodeService.find(criteria)
    .then((code) => {
      codeFromDb.should.deepEqual(code);
      done();
    })
    .catch(done);
  });

  it('should not find a code the second time', function (done) {
    const criteria = Object.assign(newCode, { id: codeFromDb.id });

    authCodeService.find(criteria)
    .then((code) => {
      should.not.exist(code);
      done();
    })
    .catch(done);
  });
});
