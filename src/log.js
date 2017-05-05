const winston = require('winston');
winston.loggers.add('EG:gateway', {
  console: {
    level: process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'category one'
  }
});
winston.loggers.add('EG:policy', {
  console: {
    level: process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'category one'
  }
});
winston.loggers.add('EG:test', {
  console: {
    level: process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'category one'
  }
});
winston.loggers.add('EG:config', {
  console: {
    level: process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'category one'
  }
});
winston.level = process.env.LOG_LEVEL || 'error';
module.exports = {
  gateway: winston.loggers.get('EG:gateway'),
  policy: winston.loggers.get('EG:policy'),
  test: winston.loggers.get('EG:test'),
  config: winston.loggers.get('EG:config')
}