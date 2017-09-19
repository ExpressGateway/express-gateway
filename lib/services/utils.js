require('util.promisify/shim')(); // NOTE: shim for native node 8.0 uril.promisify

const util = require('util');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../config');

const compareAsync = util.promisify(bcrypt, bcrypt.compare);
const hashAsync = util.promisify(bcrypt, bcrypt.hash);

function appendCreatedAt (obj) {
  obj['createdAt'] = String(new Date());
}

function appendUpdatedAt (obj) {
  obj['updatedAt'] = String(new Date());
}

function encrypt (text) {
  let cipher = crypto.createCipher(config.systemConfig.crypto.algorithm, config.systemConfig.crypto.cipherKey);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt (password) {
  let decipher = crypto.createDecipher(config.systemConfig.crypto.algorithm, config.systemConfig.crypto.cipherKey);
  return decipher.update(password, 'hex', 'utf8') + decipher.final('utf8');
}

function compareSaltAndHashed (password, hash) {
  if (!password || !hash) {
    return null;
  }
  return compareAsync(password, hash);
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

module.exports = {
  appendCreatedAt,
  appendUpdatedAt,
  encrypt,
  decrypt,
  compareSaltAndHashed,
  saltAndHash
};
