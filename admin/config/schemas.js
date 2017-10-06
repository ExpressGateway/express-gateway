module.exports = function (client) {
  const baseUrl = 'schemas/';
  return {
    list (type = '', name = '') {
      let url = baseUrl;
      if (type) {
        url += `/${type}`;
      }
      if (name) {
        url += `/${name}`;
      }
      return client
        .get(url)
        .then(res => res.body);
    }
  };
};
