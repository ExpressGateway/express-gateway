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
    list (params) {
      let results = [];

      const fetchNext = (res, queryParams = {}) => {
        results = results.concat(res.body.users);
        if (res.body.nextKey !== 0) {
          return client
            .get(baseUrl)
            .query(Object.assign(queryParams, { start: res.body.nextKey }))
            .then(res => fetchNext(res, queryParams));
        }
        return { users: results };
      };

      return client
        .get(baseUrl)
        .query(params)
        .then(res => fetchNext(res, params));
    },

    remove (id) {
      return client
        .del(`${baseUrl}${encodeURIComponent(id)}`)
        .then(res => res.body);
    }

  };
};
