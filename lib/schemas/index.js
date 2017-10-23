const Ajv = require('ajv');
const predefined = require('./predefined');

const ajv = new Ajv({
  schemas: predefined
});

const buildKey = (type, name) => `${type}:${name}`;

const registeredKeys = [];

function register (type, name, schema) {
  const key = buildKey(type, name);
  /*
    This piece of code is checking that the schema isn't already registered.
    This is not optimal and it's happening because the testing helpers aren't
    removing the schemas when we're shutting down the gateway. Hopefully we'll
    get back to this once we'll have a better story for programmatic startup/shutdown
  */
  if (schema && registeredKeys.findIndex(keys => keys.key === key) === -1) {
    ajv.addSchema(schema, key);
    registeredKeys.push({ type, name, key });
  }

  return (data) => validate(type, name, data);
}

function validate (type, name, data) {
  const key = buildKey(type, name);
  const compiled = ajv.getSchema(key);
  if (compiled) {
    const isValid = compiled(data);
    return { isValid, error: ajv.errorsText(compiled.errors) };
  }

  return { isValid: true };
}

function find (type = null, name = null) {
  if (type && name) {
    const item = ajv.getSchema(buildKey(type, name));
    if (item) {
      return [{ type, name, schema: item.schema }];
    }
  } else {
    return registeredKeys
      .filter(item => !type || item.type === type)
      .map(key => ({ key: key.type, type: key.name, schema: ajv.getSchema(key.key).schema }));
  }
}

module.exports = {
  register,
  validate,
  find
};
