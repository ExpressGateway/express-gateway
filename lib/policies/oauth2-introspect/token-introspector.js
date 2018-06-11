const superagent = require('superagent');

module.exports = (options) => {
  const authorization = options.access_token
    ? `Bearer ${options.access_token}`
    : `Basic ${Buffer.from(`${options.client_id}:${options.client_secret}`).toString('base64')}`;

  return (token, tokenTypeHint) => {
    const data = { token };

    if (tokenTypeHint) {
      data.token_type_hint = tokenTypeHint;
    }

    return superagent
      .post(options.endpoint)
      .set('authorization', authorization)
      .type('form')
      .send(data)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Server error ${res.statusType} ${res.status} \n${res.text}`);
        }

        if (res.body.active === true) {
          return res.body;
        }

        throw new Error('Token not active');
      });
  };
};
