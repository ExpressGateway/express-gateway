const logger = require('../lib/log').test;
before(() => {
  process.on('unhandledRejection', (reason, p) => {
    logger.error('Unhandled Rejection at:', p, 'reason:', reason);
  });
})
;
