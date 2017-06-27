let mock = require('mock-require');
mock('redis', require('fakeredis'));

let should = require('should');
let _ = require('lodash');
let services = require('../../lib/services');
let authCodeService = services.authorizationCode;
let db = require('../../lib/db')();

describe('Authorization Code Tests', function () {
  let newCode, codeFromDb;

  before(function () {
    return db.flushdbAsync();
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
      _.omit(code, [ 'id', 'createdAt' ]).should.deepEqual(newCode);
      codeFromDb = code;
      done();
    })
    .catch(function (err) {
      should.not.exist(err);
      done();
    });
  });

  it('should find a code', function (done) {
    let criteria = Object.assign(newCode, { id: codeFromDb.id });

    authCodeService.find(criteria)
    .then((code) => {
      codeFromDb.should.deepEqual(code);
      done();
    })
    .catch(function (err) {
      should.not.exist(err);
      done();
    });
  });

  it('should not find a code the second time', function (done) {
    let criteria = Object.assign(newCode, { id: codeFromDb.id });

    authCodeService.find(criteria)
    .then((code) => {
      should.not.exist(code);
      done();
    })
    .catch(function (err) {
      should.not.exist(err);
      done();
    });
  });
});
