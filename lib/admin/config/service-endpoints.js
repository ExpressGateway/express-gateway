module.exports = function (client) {
  const baseUrl = `service-endpoints/`;
  return {
    create (name, endpointConfig) {
      return client
        .post(baseUrl + name)
        .send(endpointConfig)
        .then(res => res.body);
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
