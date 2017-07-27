module.exports = function (client) {
  let baseUrl = `tokens/`;
  return {
    revoke (token) {
      return client
        .del(baseUrl + token)
        .then(res => res.body);
    }
  };
};
