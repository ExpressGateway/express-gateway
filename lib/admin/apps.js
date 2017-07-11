let request = require('superagent');
module.exports = function (adminConfig) {
  let baseUrl = adminConfig.baseUrl + 'apps/';
  return {
    create (userId, app) {
      app.userId = userId;
      return request
        .post(baseUrl)
        .send(app)
        .then(res => res.body);
    },
    update (appId, app) {
      return request
        .put(baseUrl + appId)
        .send(app)
        .then(res => res.body);
    },
    activate (id) {
      return request
        .put(baseUrl + id + '/status')
        .send({status: true})
        .then(res => res.body);
    },

    deactivate (id) {
      return request
        .put(baseUrl + id + '/status')
        .send({status: false})
        .then(res => res.body);
    },

    info (id) {
      return request
        .get(baseUrl + id)
        .then(res => res.body);
    },
    list () { // TODO: add pagination
      return request
        .get(baseUrl)
          .then(res => res.body);
    },

    remove (id) {
      return request
        .del(baseUrl + id)
        .then(res => res.body);
    }

  };
};
