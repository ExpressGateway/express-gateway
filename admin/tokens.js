module.exports = function (client) {
  const baseUrl = '/tokens/';
  return {
    revoke (token) {
      return client
        .del(`${baseUrl}${encodeURIComponent(token)}`)
        .then(res => res.body);
    }
  };
};
