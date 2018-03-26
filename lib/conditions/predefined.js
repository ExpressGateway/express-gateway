const minimatch = require('minimatch');

module.exports = [
  {
    name: 'always',
    handler: () => true,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/always.json'
    }
  }, {
    // Not sure if anyone would ever use this in real life, but it is a
    // "legitimate" condition, and is useful during tests.
    name: 'never',
    handler: () => false,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/never.json'
    }
  }, {
    name: 'allOf',
    handler: (req, actionConfig) => actionConfig.conditions.every(subItem => req.matchEGCondition(subItem)),
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
    handler: (req, actionConfig) => actionConfig.conditions.some(subItem => req.matchEGCondition(subItem)),
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
    handler: (req, actionConfig) => !req.matchEGCondition(actionConfig.condition),
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
    handler: (req, actionConfig) => req.url.match(new RegExp(actionConfig.pattern)) !== null,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/pathMatch.json',
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          format: 'regex'
        }
      },
      required: ['pattern']
    }
  }, {
    name: 'pathExact',
    handler: (req, actionConfig) => req.url === actionConfig.path,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/pathExact.json',
      type: 'object',
      properties: {
        path: {
          type: 'string'
        }
      },
      required: ['path']
    }
  }, {
    name: 'method',
    handler: (req, actionConfig) => {
      if (Array.isArray(actionConfig.methods)) {
        return actionConfig.methods.includes(req.method);
      } else {
        return req.method === actionConfig.methods;
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
          }]
        }
      },
      required: ['methods']
    }
  }, {
    name: 'hostMatch',
    handler: (req, actionConfig) => {
      if (req.headers.host) {
        return minimatch(req.headers.host, actionConfig.pattern);
      }
      return false;
    },
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/hostMatch.json',
      type: 'object',
      properties: {
        pattern: {
          type: 'string'
        }
      },
      required: ['pattern']
    }
  }, {
    name: 'expression',
    handler: (req, conditionConfig) => req.egContext.match(conditionConfig.expression),
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/expression.json',
      type: 'object',
      properties: {
        expression: {
          type: 'string'
        }
      },
      required: ['expression']
    }
  },
  {
    name: 'authenticated',
    handler: (req, conditionConfig) => req.isAuthenticated(),
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/authenticated.json'
    }
  },
  {
    name: 'anonymous',
    handler: (req, conditionConfig) => req.isUnauthenticated(),
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/anonymous.json'
    }
  },
  {
    name: 'tlsClientAuthenticated',
    handler: (req, conditionConfig) => req.client.authorized,
    schema: {
      $id: 'http://express-gateway.io/schemas/conditions/tlsClientAuthenticated.json'
    }
  }

];
