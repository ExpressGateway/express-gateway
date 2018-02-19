module.exports = function (client) {
  const baseUrl = '/service-endpoints/';
  return {
    create (name, endpointConfig) {
      return client
        .put(`${baseUrl}${encodeURIComponent(name)}`)
        .send(endpointConfig)
        .then(res => res.body);
    },
    update (name, endpointConfig) {
      return this.create(name, endpointConfig);
    },
    remove (name) {
      return client
        .del(`${baseUrl}${encodeURIComponent(name)}`)
        .then(res => res.body);
    },
    info (name) {
      return client
        .get(`${baseUrl}${encodeURIComponent(name)}`)
        .then(res => res.body);
    },
    list () {
      return client
        .get(baseUrl)
        .then(res => res.body);
    }

  };
};
