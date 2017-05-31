'user strict';

module.exports = {
  appendCreatedAt,
  appendUpdatedAt,
  encrypt,
  decrypt
}

let crypto = require('crypto');

function appendCreatedAt(obj) {
  obj['createdAt'] = String(new Date());
}

function appendUpdatedAt(obj) {
  obj['updatedAt'] = String(new Date());
}

function encrypt(text, cryptoConfig) {
  let cipher = crypto.createCipher(cryptoConfig.algorithm, cryptoConfig.cipherKey);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(password, cryptoConfig) {
  let decipher = crypto.createDecipher(cryptoConfig.algorithm, cryptoConfig.cipherKey);
  return decipher.update(password, 'hex', 'utf8') + decipher.final('utf8');
}