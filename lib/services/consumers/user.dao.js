const db = require('../../db');
const config = require('../../config');

const dao = {};
const userNamespace = 'user';
const usernameNamespace = 'username';

dao.insert = function (user) {
  // key for the user hash table
  const redisUserKey = config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', user.id);

  // name for the user's username set
  const redisUsernameSetKey = config.systemConfig.db.redis.namespace.concat('-', usernameNamespace).concat(':', user.username);
  return db
    .multi()
    .hmset(redisUserKey, user)
    .sadd(redisUsernameSetKey, user.id)
    .exec()
    .then(res => res.every(val => val));
};

dao.getUserById = function (userId) {
  return db.hgetall(config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', userId))
    .then(function (user) {
      if (!user || !Object.keys(user).length) {
        return false;
      }
      return user;
    });
};

dao.findAll = function(query, returnSet) {
  returnSet = returnSet ? returnSet : [];
  const startFrom = query.start || 0;
  const key = config.systemConfig.db.redis.namespace
    .concat('-', userNamespace)
    .concat(':');
  return db.scan(startFrom, 'MATCH', key + '*', 'COUNT', '100').then(resp => {
    const nextKey = resp[0];
    const userKeys = resp[1];
    userKeys.forEach(function(key, i) {
      returnSet.push(key);
    });
    if (!userKeys || (userKeys.length === 0 && nextKey === 0))
      return Promise.resolve({ users: [], nextKey: nextKey });
    if (nextKey === '0') {
      const promises = returnSet.map(key => db.hgetall(key));
      return Promise.all(promises).then(users => {
        return {
          users,
          nextKey
        };
      });
    }
    query.start = nextKey;
    return this.findAll(query, returnSet);
  });
};

dao.find = function (username) {
  return db.smembers(config.systemConfig.db.redis.namespace.concat('-', usernameNamespace).concat(':', username))
    .then(function (Ids) {
      if (Ids && Ids.length !== 0) {
        return Ids[0];
      } else return false;
    });
};

dao.update = function (userId, props) {
  // key for the user in redis
  const redisUserKey = config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', userId);
  return db
    .hmset(redisUserKey, props)
    .then(res => !!res);
};

dao.activate = function (id) {
  return db.hmset(config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', id), 'isActive', 'true', 'updatedAt', String(new Date()));
};

dao.deactivate = function (id) {
  return db.hmset(config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', id), 'isActive', 'false', 'updatedAt', String(new Date()));
};

dao.remove = function (userId) {
  return this.getUserById(userId)
    .then(function (user) {
      if (!user) {
        return false;
      }
      return db
        .multi()
        .del(config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', userId))
        .srem(config.systemConfig.db.redis.namespace.concat('-', usernameNamespace).concat(':', user.username), userId)
        .exec()
        .then(replies => replies.every(res => res));
    });
};

module.exports = dao;
