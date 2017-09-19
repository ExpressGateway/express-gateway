require('util.promisify/shim')(); // NOTE: shim for native node 8.0 uril.promisify

const util = require('util');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../config');

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

async function saltAndHash (password) {
  if (!password || typeof password !== 'string') {
    throw new Error('invalid arguments');
  }
  let hash;
  try {
    const salt = await bcrypt.genSalt(config.systemConfig.crypto.saltRounds);
    hash = await hashAsync(password, salt);
  } catch (err) {
    throw new Error('password hash failed'); // TODO: replace with server error
  }
  return hash;
}

// NOTE: need to resolve all promises otherwise we get UnhandledPromiseRejectionWarning
async function resolveSome (promises = []) {
  let result;
  for (const promise of promises) {
    try {
      const value = await promise;
      if (value && typeof result === 'undefined') {
        result = value;
      }
    } catch (err) {
      //
    }
  }
  if (!result) {
    throw new Error('no promise has been resolved');
  }
  return result;
}

module.exports = {
  appendCreatedAt,
  appendUpdatedAt,
  encrypt,
  decrypt,
  compareSaltAndHashed,
  saltAndHash,
  resolveSome
};
