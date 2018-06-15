const { createLogger, format, transports } = require('winston');
const { combine } = format;
// TODO: rm LOG_LEVEL and LOG_LEVEL_xxx env vars and configure it system config;
// system config will provide env vars support

const logFormat = combine(
  format.colorize(),
  format.timestamp(),
  format.align(),
  format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

module.exports = {
  gateway: createLogger({
    level: process.env.LOG_LEVEL_GATEWAY || process.env.LOG_LEVEL || 'warn',
    transports: [new transports.Console({})],
    format: logFormat
  }),
  policy: createLogger({
    level: process.env.LOG_LEVEL_POLICY || process.env.LOG_LEVEL || 'warn',
    transports: [new transports.Console({})],
    format: logFormat
  }),
  test: createLogger({
    level: process.env.LOG_LEVEL_TEST || process.env.LOG_LEVEL || 'warn',
    transports: [new transports.Console({})],
    format: logFormat
  }),
  config: createLogger({
    level: process.env.LOG_LEVEL_CONFIG || process.env.LOG_LEVEL || 'warn',
    transports: [new transports.Console({})],
    format: logFormat
  }),
  db: createLogger({
    level: process.env.LOG_LEVEL_DB || process.env.LOG_LEVEL || 'warn',
    transports: [new transports.Console({})],
    format: logFormat
  }),
  admin: createLogger({
    level: process.env.LOG_LEVEL_ADMIN || process.env.LOG_LEVEL || 'warn',
    transports: [new transports.Console({})],
    format: logFormat
  }),
  plugins: createLogger({
    level: process.env.LOG_LEVEL_PLUGINS || process.env.LOG_LEVEL || 'warn',
    transports: [new transports.Console({})],
    format: logFormat
  })
};
