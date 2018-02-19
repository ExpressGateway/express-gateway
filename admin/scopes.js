module.exports = function (client) {
  const baseUrl = '/scopes/';
  return {
    create (scope) {
      return client
        .post(baseUrl)
        .send({ scope })
        .then(res => res.body);
    },
    remove (scope) {
      return client
        .del(`${baseUrl}${encodeURIComponent(scope)}`)
        .then(res => res.body);
    },
    info (scope) {
      return client
        .get(`${baseUrl}${encodeURIComponent(scope)}`)
        .then(res => res.body);
    },
    list () {
      return client
        .get(baseUrl)
        .then(res => res.body);
    }

  };
};
