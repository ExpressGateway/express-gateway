let redis = require('redis');
let Promise = require('bluebird');
const logger = require('./log').db;
let config = require('./config');

let db;

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

module.exports = function () {
  if (db) {
    return db;
  }

  let redisOptions = config.systemConfig.db && config.systemConfig.db.redis;
  db = redis.createClient(redisOptions);

  db.on('ready', function () {
    logger.debug('Redis is ready');
  });

  db.on('error', function (err) {
    logger.error('Error in Redis: ', err);
  });

  return db;
};
