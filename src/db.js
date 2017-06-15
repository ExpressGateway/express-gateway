let redis = require('redis');
let Promise = require('bluebird'); // TODO: use util.promisify instead
const logger = require('./log').db;
const systemConfig = require('./config-loader').getSystemConfig();

let db;

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

module.exports = {
  getDb: function () {
    // TODO: for now it is singleton, in future make it possible to reload
    if (db) {
      return db;
    }

    let redisOptions = systemConfig.db && systemConfig.db.redis;
    db = redis.createClient(redisOptions);

    db.on('ready', function () {
      logger.debug('Redis is ready');
    });

    db.on('error', function (err) {
      logger.error('Error in Redis: ', err);
    });

    return db;
  }
};
