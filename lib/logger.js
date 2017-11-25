const winston = require('winston');
// TODO: rm LOG_LEVEL and LOG_LEVEL_xxx env vars and configure it system config;
// system config will provide env vars support
winston.loggers.add('EG:gateway', {
  console: {
    level: process.env.LOG_LEVEL_GATEWAY || process.env.LOG_LEVEL || 'warn',
    colorize: true,
    label: 'EG:gateway'
  }
});
winston.loggers.add('EG:policy', {
  console: {
    level: process.env.LOG_LEVEL_POLICY || process.env.LOG_LEVEL || 'warn',
    colorize: true,
    label: 'EG:policy'
  }
});
winston.loggers.add('EG:admin', {
  console: {
    level: process.env.LOG_LEVEL_ADMIN || process.env.LOG_LEVEL || 'warn',
    colorize: true,
    label: 'EG:admin'
  }
});
winston.loggers.add('EG:test', {
  console: {
    level: process.env.LOG_LEVEL_TEST || process.env.LOG_LEVEL || 'warn',
    colorize: true,
    label: 'EG:test'
  }
});
winston.loggers.add('EG:config', {
  console: {
    level: process.env.LOG_LEVEL_CONFIG || process.env.LOG_LEVEL || 'warn',
    colorize: true,
    label: 'EG:config'
  }
});
winston.loggers.add('EG:db', {
  console: {
    level: process.env.LOG_LEVEL_DB || process.env.LOG_LEVEL || 'warn',
    colorize: true,
    label: 'EG:db'
  }
});
winston.loggers.add('EG:plugins', {
  console: {
    level: process.env.LOG_LEVEL_PLUGINS || process.env.LOG_LEVEL || 'warn',
    colorize: true,
    label: 'EG:plugins'
  }
});

winston.level = process.env.LOG_LEVEL || 'warn';
module.exports = {
  gateway: winston.loggers.get('EG:gateway'),
  policy: winston.loggers.get('EG:policy'),
  test: winston.loggers.get('EG:test'),
  config: winston.loggers.get('EG:config'),
  db: winston.loggers.get('EG:db'),
  admin: winston.loggers.get('EG:admin'),
  plugins: winston.loggers.get('EG:plugins')
};
