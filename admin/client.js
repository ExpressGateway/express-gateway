const superagent = require('superagent');
const superagentPrefix = require('superagent-prefix');

module.exports = ({ baseUrl, headers = {} }) =>
  superagent
    .agent()
    .use(superagentPrefix(baseUrl))
    .set(headers);
