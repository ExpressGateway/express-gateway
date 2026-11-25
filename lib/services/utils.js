const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const config = require('../config');

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

function legacyCipherOptions () {
  const { algorithm, cipherKey } = config.systemConfig.crypto;
  const { keyLength, ivLength = 0 } = crypto.getCipherInfo(algorithm);
  const length = keyLength + ivLength;
  const password = Buffer.from(cipherKey);
  const blocks = [];
  let previous = Buffer.alloc(0);

  // Match the unsalted EVP_BytesToKey derivation used for existing tokens.
  for (let size = 0; size < length; size += previous.length) {
    previous = crypto.createHash('md5').update(previous).update(password).digest();
    blocks.push(previous);
  }

  const material = Buffer.concat(blocks, length);
  return [algorithm, material.subarray(0, keyLength), ivLength ? material.subarray(keyLength) : null];
}

function encrypt (text) {
  const cipher = crypto.createCipheriv(...legacyCipherOptions());
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt (password) {
  const decipher = crypto.createDecipheriv(...legacyCipherOptions());
  return decipher.update(password, 'hex', 'utf8') + decipher.final('utf8');
}

function compareSaltAndHashed (password, hash) {
  return (!password || !hash) ? null : bcrypt.compare(password, hash);
}

function saltAndHash (password) {
  if (!password || typeof password !== 'string') {
    return Promise.reject(new Error('invalid arguments'));
  }

  return bcrypt
    .genSalt(config.systemConfig.crypto.saltRounds)
    .then((salt) => bcrypt.hash(password, salt));
}

module.exports = {
  appendCreatedAt,
  appendUpdatedAt,
  encrypt,
  decrypt,
  compareSaltAndHashed,
  saltAndHash
};
