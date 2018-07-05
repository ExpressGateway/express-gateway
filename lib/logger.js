const { createLogger, format, transports } = require('winston');
const { combine, colorize, label, printf, splat } = format;
// TODO: rm LOG_LEVEL and LOG_LEVEL_xxx env vars and configure it system config;
// system config will provide env vars support

const logFormat = (loggerLabel) => combine(
  splat(),
  colorize(),
  label({ label: loggerLabel }),
  printf(info => `${info.label} ${info.level}: ${info.message}`)
);

const createLoggerWithLabel = (label) => createLogger({
  level: process.env.LOG_LEVEL_GATEWAY || process.env.LOG_LEVEL || 'warn',
  transports: [new transports.Console({})],
  format: logFormat(label)
});

module.exports = {
  gateway: createLoggerWithLabel('[EG:gateway]'),
  policy: createLoggerWithLabel('[EG:policy]'),
  config: createLoggerWithLabel('[EG:config]'),
  db: createLoggerWithLabel('[EG:db]'),
  admin: createLoggerWithLabel('[EG:admin]'),
  plugins: createLoggerWithLabel('[EG:plugins]'),
  createLoggerWithLabel
};
