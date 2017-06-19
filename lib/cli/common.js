module.exports = yargs => yargs
  .string(['system-config', 'gateway-config'])
  .describe('system-config', 'Path to a system configuration file')
  .describe('gateway-config', 'Path to a gateway configuration file')
  .nargs('system-config', 1)
  .nargs('gateway-config', 1)
  .group(['system-config', 'gateway-config'], 'Configure:')
  .help('h');
