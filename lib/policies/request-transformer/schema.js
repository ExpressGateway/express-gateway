module.exports = {
  $id: 'http://express-gateway.io/schemas/policies/request-transformer.json',
  type: 'object',
  definitions: {
    addRemove: {
      type: 'object',
      properties: {
        add: {
          type: 'object',
          additionalProperties: {
            type: ['string', 'number']
          },
          minProperties: 1
        },
        remove: {
          type: ['array'],
          items: {
            type: 'string'
          }
        }
      },
      anyOf: [{ required: ['add'] }, { required: ['remove'] }]
    }
  },
  properties: {
    headers: { '$ref': '#/definitions/addRemove' },
    body: { '$ref': '#/definitions/addRemove' }
  },
  anyOf: [{ required: ['headers'] }, { required: ['body'] }]
};
