const logger = require('../lib/logger').test;
before(() => {
  process.on('unhandledRejection', (reason, p) => {
    logger.error('Unhandled Rejection at:', p, 'reason:', reason);
  });
})
;
