const minimatch = require('minimatch');

module.exports = [
  {
    name: 'always',
    handler: () => true,
    schema: {}
  }, {
    // Not sure if anyone would ever use this in real life, but it is a
    // "legitimate" condition, and is useful during tests.
    name: 'never',
    handler: () => false,
    schema: {}
  }, {
    name: 'allOf',
    handler: (req, actionConfig) => actionConfig.conditions.every(subItem => req.matchEGCondition(subItem)),
    schema: {
      $id: 'http://express-gateway.io/schemas/allOf.json',
      type: 'object',
      properties: {
        conditions: {
          type: 'array',
          items: { $ref: 'defs.json#/definitions/condition' }
        }
      },
      required: ['conditions']
    }
  }, {
    name: 'oneOf',
    handler: (req, actionConfig) => actionConfig.conditions.some(subItem => req.matchEGCondition(subItem)),
    schema: {
      $id: 'http://express-gateway.io/schemas/oneOf.json',
      type: 'object',
      properties: {
        conditions: {
          type: 'array',
          items: { $ref: 'defs.json#/definitions/condition' }
        }
      },
      required: ['conditions']
    }
  }, {
    name: 'not',
    handler: (req, actionConfig) => !req.matchEGCondition(actionConfig.condition),
    schema: {
      $id: 'http://express-gateway.io/schemas/not.json',
      type: 'object',
      properties: {
        condition: { $ref: 'defs.json#/definitions/condition' }
      },
      required: ['condition']
    }
  }, {
    name: 'pathMatch',
    handler: (req, actionConfig) => req.url.match(new RegExp(actionConfig.pattern)) !== null,
    schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string'
        }
      },
      required: ['pattern']
    }
  }, {
    name: 'pathExact',
    handler: (req, actionConfig) => req.url === actionConfig.path,
    schema: {
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
      type: 'object',
      properties: {
        methods: {
          type: ['string', 'array'],
          items: { type: 'string' }
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
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'unauthenticated',
    handler: (req, conditionConfig) => req.isUnauthenticated(),
    schema: {
      type: 'object',
      properties: {}
    }
  }
];
