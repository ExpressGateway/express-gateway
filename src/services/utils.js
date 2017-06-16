'user strict';

module.exports = {
  appendCreatedAt,
  appendUpdatedAt,
  encrypt,
  decrypt,
  compareSaltAndHashed,
  saltAndHash
};

let crypto = require('crypto');
let Promise = require('bluebird');
let bcrypt = Promise.promisifyAll(require('bcrypt'));
let cryptoConfig = require('../config/config.system.js').crypto;

function appendCreatedAt (obj) {
  obj['createdAt'] = String(new Date());
}

function appendUpdatedAt (obj) {
  obj['updatedAt'] = String(new Date());
}

function encrypt (text) {
  let cipher = crypto.createCipher(cryptoConfig.algorithm, cryptoConfig.cipherKey);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt (password) {
  let decipher = crypto.createDecipher(cryptoConfig.algorithm, cryptoConfig.cipherKey);
  return decipher.update(password, 'hex', 'utf8') + decipher.final('utf8');
}

function compareSaltAndHashed (password, hash) {
  if (!password || !hash) {
    return null;
  }
  return bcrypt.compareAsync(password, hash);
}

function saltAndHash (password) {
  if (!password || typeof password !== 'string') {
    return Promise.reject(new Error('invalid arguments'));
  }
  return bcrypt.genSalt(cryptoConfig.saltRounds)
  .then(function (salt) {
    return bcrypt.hashAsync(password, salt);
  })
  .catch(() => Promise.reject(new Error('password hash failed'))); // TODO: replace with server error
}
