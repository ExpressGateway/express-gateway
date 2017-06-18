'use strict';

let tokenDao = require('./token.dao.js');
let utils = require('../utils');
let uuid = require('node-uuid');
let config = require('../../config');

let s = {};

s.save = function (tokenObj) {
  if (!tokenObj.consumerId) {
    return Promise.reject(new Error('invalid token args'));
  }

  let id = uuid.v4().replace(new RegExp('-', 'g'), '');
  let token = uuid.v4().replace(new RegExp('-', 'g'), '');

  let baseTokenProps = {
    id,
    tokenEncrypted: utils.encrypt(token),
    expiresAt: Date.now() + config.systemConfig.access_tokens.timeToExpiry
  };

  let tokenProps = Object.assign(baseTokenProps, tokenObj);

  utils.appendCreatedAt(tokenProps);

  if (tokenProps.scopes && Array.isArray(tokenProps.scopes)) {
    tokenProps.scopes = JSON.stringify(tokenProps.scopes.sort());
  }

  return tokenDao.save(tokenProps)
  .then(() => id.concat('|', token));
};

s.findOrSave = function (tokenObj) {
  return this.find(tokenObj)
  .then(token => {
    return token || this.save(tokenObj);
  });
};

s.find = function (tokenObj) {
  let tokenQueryCriteria = Object.assign({}, tokenObj);

  if (tokenQueryCriteria.scopes && Array.isArray(tokenQueryCriteria.scopes)) {
    tokenQueryCriteria.scopes = JSON.stringify(tokenQueryCriteria.scopes.sort());
  }

  return tokenDao.find(tokenQueryCriteria)
  .then((token) => {
    if (!token) {
      return null;
    }
    return formToken(token);
  });
};

s.get = function (_token) {
  let tokenId = _token.split('|')[0];

  return tokenDao.get(tokenId)
  .then(token => {
    if (!token) {
      return null;
    }

    if (token.scopes) {
      token.scopes = JSON.parse(token.scopes);
    }

    token.tokenDecrypted = utils.decrypt(token.tokenEncrypted);
    delete token.tokenEncrypted;

    return token;
  });
};

function formToken (tokenObj) {
  return tokenObj.id.concat('|', utils.decrypt(tokenObj.tokenEncrypted));
}

module.exports = s;
