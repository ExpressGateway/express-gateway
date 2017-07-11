
let Promise = require('bluebird');
const logger = require('./logger').db;
let config = require('./config');
let db;

module.exports = function () {
  if (db) {
    return db;
  }
  let redisOptions = config.systemConfig.db && config.systemConfig.db.redis;

  // special mode, will emulate all redis commands.
  // designed for demo and test scenarious to avoid having real Redis instance
  let emulate = process.argv[2] === 'emulate' || redisOptions.emulate;

  let redis = require(emulate ? 'fakeredis' : 'redis');
  Promise.promisifyAll(redis.RedisClient.prototype);
  Promise.promisifyAll(redis.Multi.prototype);
  db = redis.createClient(redisOptions);

  db.on('ready', function () {
    logger.debug('Redis is ready');
  });

  db.on('error', function (err) {
    logger.error('Error in Redis: ', err);
  });

  return db;
};
