module.exports = {
  policy: require('./forward-headers'),
  schema: {
    type: 'object',
    properties: {
      headersPrefix: {
        type: ['string']
      },
      headersMap: {
        type: ['object']
      }
    }
  }
};
