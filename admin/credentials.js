module.exports = function (client) {
  const baseUrl = '/credentials/';
  return {
    create (consumerId, type, credential) {
      return client
        .post(baseUrl)
        .send({ credential, consumerId, type })
        .then(res => res.body);
    },

    deactivate (credentialId, type) {
      validate(credentialId, type);
      return client
        .put(`${baseUrl}${encodeURIComponent(type)}/${encodeURIComponent(credentialId)}/status`)
        .send({ status: false })
        .then(res => res.body);
    },

    activate (credentialId, type) {
      validate(credentialId, type);
      return client
        .put(`${baseUrl}${encodeURIComponent(type)}/${encodeURIComponent(credentialId)}/status`)
        .send({ status: true })
        .then(res => res.body);
    },

    info (credentialId, type) {
      validate(credentialId, type);
      return client
        .get(baseUrl + `${type}/${credentialId}`)
        .then(res => res.body);
    },

    list (consumerId = '') {
      return client
        .get(`${baseUrl}${encodeURIComponent(consumerId)}`)
        .then(res => res.body);
    },

    addScope (credentialId, type, scope) {
      validate(credentialId, type);
      return client
        .put(`${baseUrl}${encodeURIComponent(type)}/${encodeURIComponent(credentialId)}/scopes/${scope}`)
        .then(res => res.body);
    },

    removeScope (credentialId, type, scope) {
      validate(credentialId, type);
      return client
        .del(`${baseUrl}${encodeURIComponent(type)}/${encodeURIComponent(credentialId)}/scopes/${scope}`)
        .then(res => res.body);
    },

    setScopes (credentialId, type, scopes) {
      validate(credentialId, type);
      return client
        .put(`${baseUrl}${encodeURIComponent(type)}/${encodeURIComponent(credentialId)}/scopes/`)
        .send({ scopes })
        .then(res => res.body);
    }
  };

  function validate (credentialId, type) {
    if (!credentialId) throw new Error('Credential Id is required');
    if (!type) throw new Error('Type is required');
  }
};
