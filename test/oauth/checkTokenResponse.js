const should = require('should');

module.exports = (response, additionalProps = []) => {
  should(response).have.properties('access_token', 'expires_in', ...additionalProps);
  should(response.token_type).be.eql('Bearer');
};
