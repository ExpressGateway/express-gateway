'use strict';

const winston = require('winston');

const colorize = process.env.LOG_COLORIZE !== 'false';
const timestamp = process.env.LOG_TIMESTAMP === 'true';

winston.loggers.add('EG:log-policy', {
  console: {
    level: process.env.LOG_LEVEL_LOG_POLICY || process.env.LOG_LEVEL || 'error',
    colorize,
    timestamp,
    label: 'EG:log-policy'
  }
});

module.exports = winston.loggers.get('EG:log-policy');
