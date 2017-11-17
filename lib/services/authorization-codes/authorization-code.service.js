const authCodeDao = require('./authorization-code.dao.js');
const utils = require('../utils');
const uuidv4 = require('uuid/v4');
const config = require('../../config');

const s = {};

s.save = function (criteria) {
  if (!criteria || !criteria.consumerId || !criteria.userId) {
    return Promise.reject(new Error('Invalid arguments'));
  }

  let originalScopes;
  const code = {
    id: uuidv4().replace(new RegExp('-', 'g'), ''),
    consumerId: criteria.consumerId,
    userId: criteria.userId,
    expiresAt: Date.now() + config.systemConfig.authorizationCodes.timeToExpiry
  };

  if (criteria.redirectUri) code.redirectUri = criteria.redirectUri;

  if (criteria.scopes) code.scopes = criteria.scopes;

  if (code.scopes && Array.isArray(code.scopes)) {
    originalScopes = code.scopes;
    code.scopes = JSON.stringify(code.scopes.sort());
  }

  utils.appendCreatedAt(code);

  return authCodeDao.save(code)
    .then((res) => {
      if (!res) {
        return Promise.reject(new Error('Failed to create an authorization code'));
      }

      if (code.scopes) {
        return Object.assign(code, { scopes: originalScopes });
      } else return code;
    });
};

s.find = function (criteria) {
  const codeQueryCriteria = Object.assign({}, criteria);

  if (codeQueryCriteria.scopes && Array.isArray(codeQueryCriteria.scopes)) {
    codeQueryCriteria.scopes = JSON.stringify(codeQueryCriteria.scopes.sort());
  }

  return authCodeDao.find(codeQueryCriteria)
    .then((code) => {
      if (!code) {
        return null;
      }

      if (code.scopes) {
        code.scopes = JSON.parse(code.scopes);
      }

      return authCodeDao.remove(code.id) // authorization codes are one time use only
        .then(() => code);
    });
};

module.exports = s;
