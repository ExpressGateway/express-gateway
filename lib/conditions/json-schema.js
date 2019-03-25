const express = require('express');
const schemas = require('../schemas');
const logger = require('../logger').gateway;

module.exports = {
  name: 'json-schema',
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/json-schema.json',
    type: 'object',
    properties: {
      schema: {
        type: 'object',
        description: 'Json schema to validate against.',
        examples: ['{"type":"string"}']
      },
      logErrors: {
        type: 'boolean',
        default: false,
        description: 'Value istructing the gateway to report the errors on the logger or not'
      }
    },
    required: ['schema', 'logErrors']
  },
  handler: config => {
    const validator = schemas.register(String(), String(), config.schema);
    if (config.logErrors) {
      return req => {
        const { isValid, error } = validator(req.body);
        logger.warn(error);
        return isValid;
      };
    }

    return req => validator(req.body).isValid;
  },
  middlewares: [express.json(), express.urlencoded({ extended: false })]
};
