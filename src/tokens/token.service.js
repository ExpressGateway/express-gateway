// var model = {
//   id: {
//     created_at: 'Date',
//     expries_at: 'Date',
//     userId: 'user',
//     applicationId: 'app',
//     scopes: '',
//     access_token: ''
//   }
// }

'use strict';

let getTokenDao = require('./token.dao.js');
let utils = require('../utils');
let uuid = require('node-uuid');
let tokenService, tokenDao;

module.exports = function(config) {
  tokenDao = getTokenDao(config);

  function save(tokenObj) {
    let id = uuid.v4().replace(new RegExp('-', 'g'), '');
    let token = uuid.v4().replace(new RegExp('-', 'g'), '');
    let baseTokenProps = {
      id,
      tokenEncrypted: utils.encrypt(token, config.crypto),
      expiresAt: Date.now() + config.tokens.timeToExpiry
    }
    let tokenProps = Object.assign(baseTokenProps, tokenObj);

    utils.appendCreatedAt(tokenProps);

    if (tokenProps.scopes && Array.isArray(tokenProps.scopes)) {
      tokenProps.scopes = JSON.stringify(tokenProps.scopes.sort());
    }
    
    return tokenDao.save(tokenProps)
    .then(() => id.concat('|', token));
  }

  function findOrSave(tokenObj) {
    return find(tokenObj)
    .then(token => {
      return token ? token : save(tokenObj);
    });
  }

  function find(tokenObj) {
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
    })
  }

  function get(tokenId) {
    return tokenDao.get(tokenId)
    .then(token => {
      if (!token) {
        return null;
      }

      if (token.scopes) {
        token.scopes = JSON.parse(token.scopes);
      }

      token.tokenDecrypted = utils.decrypt(token.tokenEncrypted, config.crypto);
      delete token.tokenEncrypted;

      return token;
    })
  }

  function formToken(tokenObj) {
    return tokenObj.id.concat('|', utils.decrypt(tokenObj.tokenEncrypted, config.crypto))
  }

  tokenService = {
    findOrSave,
    find,
    save,
    get
  };

  return tokenService;
}