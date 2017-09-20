module.exports = function (client) {
  let baseUrl = 'policies/';
  return {
    activate (name) {
      return client
        .put(baseUrl + name)
        .then(res => res.body);
    },

    deactivate (name) {
      return client
        .put(baseUrl + name)
        .then(res => res.body);
    },

    list () {
      return client
        .get(baseUrl)
        .then(res => res.body);
    }
  };
};
