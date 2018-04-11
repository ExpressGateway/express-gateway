module.exports = function (client) {
  const baseUrl = '/apps/';
  return {
    create (userId, app) {
      app.userId = userId;
      return client
        .post(baseUrl)
        .send(app)
        .then(res => res.body);
    },
    update (appId, app) {
      return client
        .put(`${baseUrl}${encodeURIComponent(appId)}`)
        .send(app)
        .then(res => res.body);
    },
    activate (id) {
      return client
        .put(`${baseUrl}${encodeURIComponent(id)}/status`)
        .send({ status: true })
        .then(res => res.body);
    },

    deactivate (id) {
      return client
        .put(`${baseUrl}${encodeURIComponent(id)}/status`)
        .send({ status: false })
        .then(res => res.body);
    },

    info (id) {
      return client
        .get(`${baseUrl}${encodeURIComponent(id)}`)
        .then(res => res.body);
    },

    list (params) {
      return client
        .get(baseUrl)
        .query(params)
        .then(res => res.body);
    },

    remove (id) {
      return client
        .del(`${baseUrl}${encodeURIComponent(id)}`)
        .then(res => res.body);
    }

  };
};
