'use strict';

const winston = require('winston');

winston.loggers.add('EG:log-policy', {
  console: {
    level: process.env.LOG_LEVEL_LOG_POLICY || process.env.LOG_LEVEL || 'error',
    colorize: true,
    label: 'EG:log-policy'
  }
});

module.exports = winston.loggers.get('EG:log-policy');
