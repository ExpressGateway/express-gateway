'use strict';

let tokenDao = require('./token.dao.js');
let utils = require('../utils');
let Promise = require('bluebird');
let uuid = require('node-uuid');
let config = require('../../config');

let s = {};

s.save = function (tokenObj, options) {
  let rt, at;
  options = options || {};

  if (!tokenObj.consumerId) {
    return Promise.reject(new Error('invalid token args'));
  }

  if (options.refreshTokenOnly) {
    let rt = createInternalToken(tokenObj, newUuid(), newUuid(), 'refresh_token');

    return tokenDao.save(rt, { type: 'refresh_token' })
      .then(() => {
        return { refresh_token: formExternalToken(rt) };
      });
  }

  at = createInternalToken(tokenObj, newUuid(), newUuid(), 'access_token');
  let tokenSavePromises = [ tokenDao.save(at) ];

  if (options.includeRefreshToken) {
    rt = createInternalToken(tokenObj, newUuid(), newUuid(), 'refresh_token');
    tokenSavePromises.push(tokenDao.save(rt, { type: 'refresh_token' }));
  }

  return Promise.all(tokenSavePromises)
    .then(() => {
      return {
        access_token: formExternalToken(at),
        refresh_token: formExternalToken(rt)
      };
    });
};

s.findOrSave = function (tokenObj, options) {
  options = options || {};

  return this.find(tokenObj, options)
  .then(tokens => {
    if (tokens.access_token) {
      if (options.includeRefreshToken && !tokens.refresh_token) {
        return this.save(tokenObj, { refreshTokenOnly: true })
          .then(rt => {
            tokens.refresh_token = rt.refresh_token;
            return tokens;
          });
      } else return tokens;
    }

    if (tokens.refresh_token) {
      return this.save(tokenObj)
        .then(at => {
          tokens.access_token = at.access_token;
          return tokens;
        });
    }

    return this.save(tokenObj, options);
  });
};

s.find = function (tokenObj, options) {
  options = options || {};
  let tokenQueryCriteria = Object.assign({}, tokenObj);

  if (tokenQueryCriteria.scopes && Array.isArray(tokenQueryCriteria.scopes)) {
    tokenQueryCriteria.scopes = JSON.stringify(tokenQueryCriteria.scopes.sort());
  }

  let findQueries = [ tokenDao.find(tokenQueryCriteria) ];

  if (options.includeRefreshToken) {
    findQueries.push(tokenDao.find(tokenQueryCriteria, { type: 'refresh_token' }));
  }

  return Promise.all(findQueries)
    .spread((accessToken, refreshToken) => {
      return {
        access_token: formExternalToken(accessToken),
        refresh_token: formExternalToken(refreshToken)
      };
    });
};

s.get = function (_token, options) {
  options = options || {};
  let tokenId = _token.split('|')[0];

  return tokenDao.get(tokenId, options)
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

s.getTokenObject = function (refreshToken) {
  return this.get(refreshToken, { type: 'refresh_token' })
    .then(rtObj => {
      if (!rtObj) {
        return null;
      }

      let tokenObj = Object.assign({}, rtObj);
      delete tokenObj.createdAt;
      delete tokenObj.updatedAt;
      delete tokenObj.expiresAt;
      delete tokenObj.tokenDecrypted;
      delete tokenObj.id;

      return tokenObj;
    });
};

s.getTokensByConsumer = function (id, options) {
  return tokenDao.getTokensByConsumer(id, options);
};

function createInternalToken (criteria, id, token, type) {
  let timeToExpiry;

  if (type === 'access_token') {
    timeToExpiry = config.systemConfig.access_tokens.timeToExpiry;
  } else timeToExpiry = config.systemConfig.refresh_tokens.timeToExpiry;

  let internalTokenObj = Object.assign({
    id,
    tokenEncrypted: utils.encrypt(token),
    expiresAt: Date.now() + timeToExpiry
  }, criteria);

  if (internalTokenObj.scopes && Array.isArray(internalTokenObj.scopes)) {
    internalTokenObj.scopes = JSON.stringify(internalTokenObj.scopes.sort());
  }

  utils.appendCreatedAt(internalTokenObj);
  return internalTokenObj;
}

function formExternalToken (tokenObj) {
  if (!tokenObj) return null;
  return tokenObj.id.concat('|', utils.decrypt(tokenObj.tokenEncrypted));
}

function newUuid () {
  return uuid.v4().replace(new RegExp('-', 'g'), '');
}

module.exports = s;
