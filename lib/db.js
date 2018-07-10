const logger = require('./logger').db;
const config = require('./config');
const fs = require('fs');
const redisOptions = config.systemConfig.db && config.systemConfig.db.redis;

// special mode, will emulate all redis commands.
// designed for demo and test scenarious to avoid having real Redis instance
const emulate = process.argv[2] === 'emulate' || redisOptions.emulate;

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

db.on('ready', () => { logger.debug('Redis is ready'); });
db.on('error', err => { logger.error(`Error in Redis: ${err}`); });

module.exports = db;
