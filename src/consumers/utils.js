'user strict';

let Promise = require('bluebird');
let bcrypt = Promise.promisifyAll(require('bcrypt'));

module.exports = {
  appendCreatedAt: appendCreatedAt,
  appendUpdatedAt: appendUpdatedAt,
  saltAndHash: saltAndHash,
  compareSaltAndHashed: compareSaltAndHashed
}

function appendCreatedAt(obj) {
  obj['createdAt'] = String(new Date());
}

function appendUpdatedAt(obj) {
  obj['updatedAt'] = String(new Date());
}

function saltAndHash(password, saltRounds) {
  if (!password || !saltRounds) {
    return Promise.reject(new Error('invalid arguments'));
  }
  return bcrypt.genSalt(saltRounds)
  .then(function(salt) {
    return bcrypt.hashAsync(password, salt);
  })
  .catch(function() {
    return Promise.reject(new Error('password hash failed'));
  })
}

function compareSaltAndHashed(password, hash) {
  if (!password || !hash) {
    return null;
  }
  return bcrypt.compareAsync(password, hash);
}