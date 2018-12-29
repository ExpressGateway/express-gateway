module.exports = function (client) {
  const baseUrl = '/users/';
  return {
    create (user) {
      return client
        .post(baseUrl)
        .send(user)
        .then(res => res.body);
    },
    update (id, user) {
      return client
        .put(`${baseUrl}${encodeURIComponent(id)}`)
        .send(user)
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
    list (params = {}) {
      let results = [];

      const fetchNext = (res) => {
        results = results.concat(res.body.users);
        if (params.all && res.body.nextKey !== 0) {
          return client
            .get(baseUrl)
            .query({ start: res.body.nextKey, count: params.count })
            .then(fetchNext);
        }
        return { users: results, nextKey: res.body.nextKey };
      };

      return client
        .get(baseUrl)
        .query(params)
        .then(fetchNext);
    },

    remove (id) {
      return client
        .del(`${baseUrl}${encodeURIComponent(id)}`)
        .then(res => res.body);
    }

  };
};
