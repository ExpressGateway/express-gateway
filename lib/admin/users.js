module.exports = function (client) {
  let baseUrl = `users/`;
  return {
    create (user) {
      return client
        .post(baseUrl)
        .send(user)
        .then(res => res.body);
    },
    update (id, user) {
      return client
        .put(baseUrl + id)
        .send(user)
        .then(res => res.body);
    },
    activate (id) {
      return client
        .put(baseUrl + id + '/status')
        .send({status: true})
        .then(res => res.body);
    },

    deactivate (id) {
      return client
        .put(baseUrl + id + '/status')
        .send({status: false})
        .then(res => res.body);
    },

    info (id) {
      return client
        .get(baseUrl + id)
        .then(res => res.body);
    },
    list () { // TODO: add pagination
      return client
        .get(baseUrl)
         .then(res => {
           return res.body;
         });
    },

    remove (id) {
      return client
        .del(baseUrl + id)
        .then(res => res.body);
    }

  };
};
