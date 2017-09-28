module.exports = function (client) {
  const baseUrl = `api-endpoints/`;
  return {
    create (name, endpointConfig) {
      return client
        .put(baseUrl + name)
        .send(endpointConfig)
        .then(res => res.body);
    },
    update (name, endpointConfig) {
      return this.create(name, endpointConfig);
    },
    remove (name) {
      return client
        .del(baseUrl + name)
        .then(res => res.body);
    },
    info (name) {
      return client
        .get(baseUrl + name)
        .then(res => res.body);
    },
    list () {
      return client
        .get(baseUrl)
        .then(res => res.body);
    }

  };
};
