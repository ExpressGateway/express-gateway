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
      extendedErrors: {
        type: 'boolean',
        default: false,
        description: 'Value istructing the gateway to return the extended Schema Validation errors or a generic Unprocessable Entity'
      }
    },
    required: ['schema', 'extendedErrors']
  },
  handler: config => {
    const validator = schemas.register(String(), String(), config.schema);
    return req => {
      const { isValid, error } = validator(req.body);
      logger.warn(error);
      return isValid;
    };
  },
  middlewares: [express.json(), express.urlencoded({ extended: false })]
};
