const superagent = require('superagent');

module.exports = (options) => {
  return (token, tokenTypeHint) => {
    const data = { token };

    if (tokenTypeHint) {
      data.token_type_hint = tokenTypeHint;
    }

    return superagent
      .post(options.endpoint)
      .set('authorization', options.authorization_value)
      .type('form')
      .send(data)
      .then(res => {
        if (res.body.active === true) {
          return res.body;
        }

        throw new Error('Token not active');
      });
  };
};
