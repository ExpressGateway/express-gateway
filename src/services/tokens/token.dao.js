'use strict';

let Promise = require('bluebird');
let db = require('../../db')();
let config = require('../../config');

let dao = {};

const tokenNamespace = 'token';
const consumerTokensPrefix = 'consumer-tokens';
const consumerTokensExpiredPrefix = 'consumer-tokens-expired';

dao.save = function (token) {
  // key for the token hash table
  let redisTokenKey = config.systemConfig.db.redis.namespace.concat('-', tokenNamespace).concat(':', token.id);

  // key for the consumer-tokens hash table
  let consumerTokensHashKey = config.systemConfig.db.redis.namespace.concat('-', consumerTokensPrefix).concat(':', token.consumerId);

  return db
  .multi()
  .hmset(redisTokenKey, token)
  .hset(consumerTokensHashKey, token.id, token.expiresAt)
  .execAsync()
  .return(token.id.concat(':', token.tokenEncrypted));
};

dao.find = function (tokenObj) {
  let foundToken;

  return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', consumerTokensPrefix).concat(':', tokenObj.consumerId))
  .then((tokenIds) => {
    let tokenPromises, activeTokenIds, getTokenPromise;
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
      return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', tokenNamespace).concat(':', id))
      .then((token) => {
        let isEqual;

        if (!token) {
          return Promise.reject(new Error());
        }

        isEqual = Object.keys(tokenObj).every((key) => tokenObj[key] === token[key]);
        return isEqual ? token : Promise.reject(new Error());
      });
    });

    if (tokenPromises.length === 0) {
      getTokenPromise = Promise.resolve(null);
    } else getTokenPromise = Promise.some(tokenPromises, 1);

    return getTokenPromise
    .then((token) => {
      foundToken = token[0];
    })
    .catch(() => null)
    .then(() => {
      let tokenTransaction = db.multi();

      if (expiredTokenIds.length === 0) {
        return;
      }

      expiredTokenIds.forEach((id) => {
        tokenTransaction = tokenTransaction.hset(config.systemConfig.db.redis.namespace.concat('-', tokenNamespace).concat(':', id), 'archived', 'true');
        tokenTransaction = tokenTransaction.hdel(config.systemConfig.db.redis.namespace.concat('-', consumerTokensPrefix).concat(':', tokenObj.consumerId), id);
        tokenTransaction = tokenTransaction.hset(config.systemConfig.db.redis.namespace.concat('-', consumerTokensExpiredPrefix).concat(':', tokenObj.consumerId), id, 'true');
      });

      return tokenTransaction.execAsync();
    })
    .then(() => foundToken);
  });
};

dao.get = function (tokenId, options) {
  options = options || {};

  return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', tokenNamespace).concat(':', tokenId))
  .then(token => {
    if (!token) {
      return null;
    }

    if (token.expiresAt > Date.now()) {
      return token;
    }

    if (token.archived) {
      if (options.includeExpired) {
        return token;
      } else return null;
    }

    return db
      .multi()
      .hset(config.systemConfig.db.redis.namespace.concat('-', tokenNamespace).concat(':', token.id), 'archived', 'true')
      .hdel(config.systemConfig.db.redis.namespace.concat('-', consumerTokensPrefix).concat(':', token.consumerId), token.id)
      .hset(config.systemConfig.db.redis.namespace.concat('-', consumerTokensExpiredPrefix).concat(':', token.consumerId), token.id, 'true')
      .execAsync()
      .then(() => {
        if (options.includeExpired) {
          return token;
        } else return null;
      });
  });
};

dao.getTokensByConsumer = function (id, options) {
  options = options || {};

  let getIds = db.multi().hgetall(config.systemConfig.db.redis.namespace.concat('-', consumerTokensPrefix).concat(':', id));

  if (options.includeExpired) {
    getIds = getIds.hgetall(config.systemConfig.db.redis.namespace.concat('-', consumerTokensExpiredPrefix).concat(':', id));
  }

  return getIds
    .execAsync()
    .then((tokensArr) => {
      let tokens = tokensArr[0];
      let expiredTokens = tokensArr[1];

      let tokenPromises = [];

      if (!tokens && !expiredTokens) {
        return null;
      }

      tokens = Object.keys(tokens || {});
      expiredTokens = Object.keys(expiredTokens || {});

      tokens.concat(expiredTokens).forEach(tokenId => {
        return tokenPromises.push(this.get(tokenId, options));
      });

      return Promise.all(tokenPromises)
        .then(results => {
          return results.filter(r => !!r);
        });
    });
};

module.exports = dao;
