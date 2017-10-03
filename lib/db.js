const logger = require('./logger').db;
const redisCommands = require('redis-commands');
require('util.promisify/shim')(); // NOTE: shim for native node 8.0 uril.promisify
const util = require('util');
let db;

module.exports = function () {
  if (db) {
    return db;
  }
  const config = require('./config');
  const redisOptions = config.systemConfig.db && config.systemConfig.db.redis;

  // special mode, will emulate all redis commands.
  // designed for demo and test scenarious to avoid having real Redis instance
  const emulate = process.argv[2] === 'emulate' || redisOptions.emulate;

  const redis = require(emulate ? 'fakeredis' : 'redis');
  promisify(redis.RedisClient.prototype, redisCommands.list);
  promisify(redis.Multi.prototype, ['exec', 'execAtomic']);

  function promisify (obj, methods) {
    methods.forEach((method) => {
      if (obj[method]) {
        obj[method + 'Async'] = util.promisify(obj[method]);
      }
    });
  }

  db = redis.createClient(redisOptions);

  db.on('ready', function () {
    logger.debug('Redis is ready');
  });

  db.on('error', function (err) {
    logger.error('Error in Redis: ', err);
  });

  return db;
};
