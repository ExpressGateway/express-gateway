let request = require('superagent');
module.exports = function (sdkConfig) {
  let host = sdkConfig.hostname || 'localhost';
  let port = sdkConfig.port || 9876;
  let baseUrl = `http://${host}:${port}/users/`;
  return {
    create (user) {
      return request
        .post(baseUrl)
        .send(user)
        .then(res => res.body);
    },
    update (id, user) {
      return request
        .put(baseUrl + id)
        .send(user)
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
         .then(res => {
           return res.body;
         });
    },

    remove (id) {
      return request
        .del(baseUrl + id)
        .then(res => res.body);
    }

  };
};
