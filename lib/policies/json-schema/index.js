const jsonParser = require('express').json();
const urlEncoded = require('express').urlencoded({ extended: true });
const schemas = require('../../schemas');

module.exports = {
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
  policy: params => {
    schemas.register(String(), String(), params.schema);

    return (req, res, next) => {
      jsonParser(req, res, (err) => {
        if (err) return next(err);

        urlEncoded(req, res, (err) => {
          if (err) return next(err);

          const { isValid, error } = schemas.validate(params.schema.$id, req.body);

          if (isValid) {
            return next();
          }

          if (params.extendedErrors) {
            return res.status(422).send(error);
          }

          return res.sendStatus(422);
        });
      });
    };
  }
};
