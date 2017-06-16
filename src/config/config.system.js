'use strict';

module.exports = {
  db: {
    redis: {
      host: 'localhost',
      port: 5555
    }
  },
  crypto: {
    cipherKey: 'sensitiveKey',
    algorithm: 'aes256',
    saltRounds: 10
  },
  access_tokens: {
    timeToExpiry: 7200000 // 2 hours
  },
  authorization_codes: {
    timeToExpiry: 300000 // 5 minutes
  }
};
