const logger = require('./logger').db;
const config = require('./config');
const fs = require('fs');
const redisOptions = config.systemConfig.db && config.systemConfig.db.redis;

// special mode, will emulate all redis commands.
// designed for demo and test scenarious to avoid having real Redis instance
let emulate = process.argv[2] === 'emulate' || redisOptions.emulate;

if (process.env.EG_DB_EMULATE) {
  emulate = !!parseInt(process.env.EG_DB_EMULATE);
}

if (redisOptions.tls) {
  if (redisOptions.tls.keyFile) {
    redisOptions.tls.key = fs.readFileSync(redisOptions.tls.keyFile);
  };

  if (redisOptions.tls.certFile) {
    redisOptions.tls.cert = fs.readFileSync(redisOptions.tls.certFile);
  }

  if (redisOptions.tls.caFile) {
    redisOptions.tls.ca = fs.readFileSync(redisOptions.tls.caFile);
  }
}

const Redis = require(emulate ? 'ioredis-mock' : 'ioredis');
const db = new Redis(redisOptions);

// TODO: ALERT: this is temporary fix before transformers will land into ioredis-mock
db.prepareHMSET = function (hashKey, obj) {
  const result = [];
  let pos = 0;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[pos] = key;
      result[pos + 1] = obj[key];
    }
    pos += 2;
  }
  return [hashKey].concat(result);
};

db.on('ready', function () {
  logger.debug('Redis is ready');
});

db.on('error', function (err) {
  logger.error('Error in Redis: ', err);
});

module.exports = db;
