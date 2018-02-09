module.exports = function (client) {
  const baseUrl = '/schemas/';
  return {
    list (param = '') {
      let url = baseUrl;

      if (param) {
        url += encodeURIComponent(param);
      }

      return client
        .get(url)
        .then(res => res.body);
    }
  };
};
