let request = require('superagent');
module.exports = function (adminConfig) {
  let host = adminConfig.hostname || 'localhost';
  let port = adminConfig.port || 9876;
  let baseUrl = `http://${host}:${port}/credentials/`;
  return {
    create (consumerId, type, credential) {
      return request
        .post(baseUrl)
        .send({credential, consumerId, type})
        .then(res => res.body);
    },
    remove (credentialId) {
      return request
        .del(baseUrl + credentialId)
        .then(res => res.body);
    },
    info (credentialId) {
      return request
        .get(baseUrl + credentialId)
        .then(res => res.body);
    }
  };
};
