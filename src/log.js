const winston = require('winston');
winston.loggers.add('EG:gateway', {
  console: {
    level: process.env.LOG_LEVEL_GATEWAY || process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'EG:gateway'
  }
});
winston.loggers.add('EG:policy', {
  console: {
    level: process.env.LOG_LEVEL_POLICY || process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'EG:policy'
  }
});
winston.loggers.add('EG:test', {
  console: {
    level: process.env.LOG_LEVEL_TEST || process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'EG:test'
  }
});
winston.loggers.add('EG:config', {
  console: {
    level: process.env.LOG_LEVEL_CONFIG || process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'EG:config'
  }
});
winston.loggers.add('EG:log-policy', {
  console: {
    level: process.env.LOG_LEVEL_LOG_POLICY || process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'EG:log-policy'
  }
});
winston.level = process.env.LOG_LEVEL || 'error';
module.exports = {
  gateway: winston.loggers.get('EG:gateway'),
  policy: winston.loggers.get('EG:policy'),
  test: winston.loggers.get('EG:test'),
  config: winston.loggers.get('EG:config'),
  logPolicy: winston.loggers.get('EG:log-policy')
}