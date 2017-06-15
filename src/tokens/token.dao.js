'use strict';

let {getDb} = require('../db');
let Promise = require('bluebird');
let tokenDao, db, tokenDbConfig;

module.exports = function (config) {
  if (tokenDao) {
    return tokenDao;
  }

  db = getDb();
  tokenDbConfig = config.tokens.redis;

  function save(token) {
    // key for the token hash table
    let redisTokenKey = tokenDbConfig.tokenHashPrefix.concat(':', token.id);

    // key for the consumer-tokens hash table
    let consumerTokensHashKey = tokenDbConfig.consumerTokensHashPrefix.concat(':', token.consumerId);

    return db
    .multi()
    .hmset(redisTokenKey, token)
    .hset(consumerTokensHashKey, token.id, token.expiresAt)
    .execAsync()
    .return(token.id.concat(':', token.tokenEncrypted));
  }

  function find(tokenObj) {
    return db.hgetallAsync(tokenDbConfig.consumerTokensHashPrefix.concat(':', tokenObj.consumerId))
    .then((tokenIds) => {
      let tokenPromises, activeTokenIds, foundToken;
      let expiredTokenIds = [];

      if (!tokenIds || Object.keys(tokenIds).length === 0) {
        return null;
      }

      activeTokenIds = Object.keys(tokenIds).filter((key) => {
        if (tokenIds[key] <= Date.now()) {
          expiredTokenIds.push(key);
          return false;
        }
        return true;
      });

      tokenPromises = activeTokenIds.map((id) => {
        return db.hgetallAsync(tokenDbConfig.tokenHashPrefix.concat(':', id))
        .then((token) => {
          let isEqual;

          if (!token) {
            return Promise.reject(new Error());
          }

          isEqual = Object.keys(tokenObj).every((key) => tokenObj[key] === token[key]);
          return isEqual ? token : Promise.reject(new Error());
        });
      });

      return Promise.some(tokenPromises, 1)
      .spread((token) => {
        foundToken = token;
      })
      .catch(() => null)
      .then(() => {
        let removeExpiredTokensPromises = [];

        if (expiredTokenIds.length === 0) {
          return;
        }

        expiredTokenIds.forEach((id) => {
          removeExpiredTokensPromises.push(db.delAsync(tokenDbConfig.tokenHashPrefix.concat(':', id)));
          removeExpiredTokensPromises.push(db.hdelAsync(tokenDbConfig.consumerTokensHashPrefix.concat(':', tokenObj.consumerId), id));
        });

        return Promise.all(removeExpiredTokensPromises);
      })
      .then(() => foundToken);
    });
  }

  function get (tokenId) {
    return db.hgetallAsync(tokenDbConfig.tokenHashPrefix.concat(':', tokenId))
    .then(token => {
      if (!token) {
        return null;
      }

      if (token.expiresAt < Date.now()) {
        return db.delAsync(tokenDbConfig.tokenHashPrefix.concat(':', tokenId))
        .return(null);
      }

      return token;
    });
  }

  tokenDao = {
    save,
    find,
    get
  };

  return tokenDao;
};
