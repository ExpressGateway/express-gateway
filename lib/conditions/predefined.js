const minimatch = require('minimatch');
const jsonSchema = require('./json-schema');

const grabArray = config => {
  const { conditions } = require('./index');
  return config.conditions.map(config => conditions[config.name](config));
};

const grabSingle = config => {
  const { conditions } = require('./index');
  return conditions[config.name](config);
};

module.exports = [
  {
    name: 'base',
    type: 'internal',
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/base.json',
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the condition to apply to the current CA pair'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'always',
    handler: () => () => true,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/always.json'
    }
  }, {
    // Not sure if anyone would ever use this in real life, but it is a
    // "legitimate" condition, and is useful during tests.
    name: 'never',
    handler: () => () => false,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/never.json'
    }
  }, {
    name: 'allOf',
    handler: config => {
      const cfg = grabArray(config);
      return req => cfg.every(c => c(req));
    },
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/allOf.json',
      type: 'object',
      properties: {
        conditions: {
          type: 'array',
          items: { $ref: 'base.json' }
        }
      },
      required: ['conditions']
    }
  }, {
    name: 'oneOf',
    handler: config => {
      const cfg = grabArray(config);
      return req => cfg.some(c => c(req));
    },
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/oneOf.json',
      type: 'object',
      properties: {
        conditions: {
          type: 'array',
          items: { $ref: 'base.json' }
        }
      },
      required: ['conditions']
    }
  }, {
    name: 'not',
    handler: config => {
      const cfg = grabSingle(config.condition);
      return req => !cfg(req);
    },
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/not.json',
      type: 'object',
      properties: {
        condition: { $ref: 'base.json' }
      },
      required: ['condition']
    }
  }, {
    name: 'pathMatch',
    handler: config => req => req.url.match(new RegExp(config.pattern)) !== null,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/pathMatch.json',
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          format: 'regex',
          description: 'RegExp to match against the req.url property'
        }
      },
      required: ['pattern']
    }
  }, {
    name: 'pathExact',
    handler: config => req => req.url === config.path,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/pathExact.json',
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to match against the req.url property'
        }
      },
      required: ['path']
    }
  }, {
    name: 'method',
    handler: config => req => {
      if (Array.isArray(config.methods)) {
        return config.methods.includes(req.method);
      } else {
        return req.method === config.methods;
      }
    },
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/method.json',
      definitions: {
        httpMethod: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
        }
      },
      type: 'object',
      properties: {
        methods: {
          anyOf: [{ $ref: '#/definitions/httpMethod' }, {
            type: 'array',
            items: { $ref: '#/definitions/httpMethod' }
          }],
          description: 'HTTP Method to match against'
        }
      },
      required: ['methods']
    }
  }, {
    name: 'hostMatch',
    handler: config => req => {
      if (req.headers.host) {
        return minimatch(req.headers.host, config.pattern);
      }
      return false;
    },
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/hostMatch.json',
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Pattern to match against the HOST header in the current HTTP Request'
        }
      },
      required: ['pattern']
    }
  }, {
    name: 'expression',
    handler: config => req => req.egContext.match(config.expression),
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/expression.json',
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Javascript Expression to execute with the current egContext object'
        }
      },
      required: ['expression']
    }
  },
  {
    name: 'authenticated',
    handler: () => req => req.isAuthenticated(),
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/authenticated.json'
    }
  },
  {
    name: 'anonymous',
    handler: () => req => req.isUnauthenticated(),
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/anonymous.json'
    }
  },
  {
    name: 'tlsClientAuthenticated',
    handler: () => req => req.client.authorized,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/tlsClientAuthenticated.json'
    }
  },
  jsonSchema
];
