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
    deactivate (credentialId, type) {
      validate(credentialId, type);
      return request
        .put(baseUrl + type + '/' + credentialId + '/status')
        .send({status: false})
        .then(res => res.body);
    },
    activate (credentialId, type) {
      validate(credentialId, type);
      return request
        .put(baseUrl + type + '/' + credentialId + '/status')
        .send({status: true})
        .then(res => res.body);
    },
    info (credentialId, type) {
      validate(credentialId, type);
      return request
        .get(baseUrl + `${type}/${credentialId}`)
        .then(res => res.body);
    },
    addScope (credentialId, type, scope) {
      validate(credentialId, type);
      return request
        .put(`${baseUrl}${type}/${credentialId}/scopes/${scope}`)
        .then(res => res.body);
    },
    removeScope (credentialId, type, scope) {
      validate(credentialId, type);
      return request
        .del(`${baseUrl}${type}/${credentialId}/scopes/${scope}`)
        .then(res => res.body);
    },
    setScopes (credentialId, type, scopes) {
      validate(credentialId, type);
      return request
        .put(`${baseUrl}${type}/${credentialId}/scopes/`)
        .send({scopes})
        .then(res => res.body);
    }

  };
  function validate (credentialId, type) {
    if (!credentialId) throw new Error('Credential Id is required');
    if (!type) throw new Error('Type is required');
  }
};
