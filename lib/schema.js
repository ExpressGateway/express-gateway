const Ajv = require('ajv');
const ajv = new Ajv();

function compileSchema (schema) {
  return ajv.compile(schema);
}

module.exports = {
  compileSchema
};
