module.exports = {
  policy: require('./oauth2'),
  routes: require('./oauth2-routes'),
  schema: {
    passThrough: { type: 'boolean' }
  }
};
