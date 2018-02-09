const superagent = require('superagent');
const superagentPrefix = require('superagent-prefix');

module.exports = ({ baseUrl, verbose, headers }) => {
  const agent = superagent
    .agent()
    .use(superagentPrefix(baseUrl));

  if (headers) {
    agent.set(headers);
  }

  if (verbose) {
    agent.use(require('superagent-logger'));
  }

  return agent;
};
