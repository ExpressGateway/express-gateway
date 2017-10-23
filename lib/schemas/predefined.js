const configSchema = {
  $id: 'http://express-gateway.io/schemas/config.json',
  gateway: {
    serviceEndpoint: {type: 'string'}
  }
};

const definitionsSchema = {
  $id: 'http://express-gateway.io/schemas/defs.json',
  definitions: {
    jscode: {type: 'string'},
    condition: {
      type: 'object',
      properties: {
        name: {
          type: 'string'
        }
      },
      required: ['name']
    }
  }
};

module.exports = [
  configSchema,
  definitionsSchema
];
