const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');
const should = require('should');
// eslint-disable-next-line no-unused-vars
const Config = require('../../lib/config');
const schema = require('../../lib/schemas');

describe('EG templates schema validation', () => {
  ['basic', 'getting-started'].forEach((template) => {
    const basePath = path.join(__dirname, '../../bin/generators/gateway/templates', template, 'config');
    ['gateway.config', 'system.config'].forEach((config) => {
      it(`${template} should pass the JSON schema validation for ${config}`, () => {
        should(schema.validate(`http://express-gateway.io/models/${config}.json`,
          jsYaml.load(fs.readFileSync(path.join(basePath, `${config}.yml`)))).isValid).be.true();
      });
    });
  });
});
