require('util.promisify/shim')(); // NOTE: shim for native node 8.0 uril.promisify

const util = require('util');
const crypto = require('crypto');

const config = require('../config');

let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (err) {
  // this is fallback when no prebuilt image is available and build is not possible
  // Example: docker image with linux 32bit without build tools
  bcrypt = require('bcryptjs');
}
const compareAsync = util.promisify(bcrypt.compare);
const hashAsync = util.promisify(bcrypt.hash);

function appendCreatedAt (obj) {
  Object.assign(obj, {
    createdAt: (new Date()).toString()
  });
}

function appendUpdatedAt (obj) {
  Object.assign(obj, {
    updatedAt: (new Date()).toString()
  });
}

function encrypt (text) {
  const {algorithm, cipherKey} = config.systemConfig.crypto;
  const cipher = crypto.createCipher(algorithm, cipherKey);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt (password) {
  const {algorithm, cipherKey} = config.systemConfig.crypto;
  const decipher = crypto.createDecipher(algorithm, cipherKey);
  return decipher.update(password, 'hex', 'utf8') + decipher.final('utf8');
}

function compareSaltAndHashed (password, hash) {
  return (!password || !hash) ? null : compareAsync(password, hash);
}

function saltAndHash (password) {
  if (!password || typeof password !== 'string') {
    return Promise.reject(new Error('invalid arguments'));
  }

  return bcrypt
    .genSalt(config.systemConfig.crypto.saltRounds)
    .then((salt) => hashAsync(password, salt))
    .catch(() => Promise.reject(new Error('password hash failed'))); // TODO: replace with server error
}

module.exports = {
  appendCreatedAt,
  appendUpdatedAt,
  encrypt,
  decrypt,
  compareSaltAndHashed,
  saltAndHash
};
