const Ajv = require('ajv');
const ajv = new Ajv();

const buildKey = (type, name) => `${type}:${name}`;

const registered = {};

function register (type, name, schema) {
  let compiled;
  if (schema && typeof schema === 'object') {
    compiled = ajv.compile(schema);
  } else {
    schema = {};
    compiled = () => true;  // empty validator
  }

  registered[buildKey(type, name)] = {
    type,
    name,
    schema,
    compiled
  };

  return (data) => validate(type, name, data);
}

function validate (type, name, data) {
  const key = buildKey(type, name);
  let isValid = false;
  if (registered[key]) {
    const compiled = registered[key].compiled;
    isValid = compiled(data);
    if (!isValid) {
      // TODO: add validation error class
      throw new Error(JSON.stringify(compiled.errors));
    }
  }

  return isValid;
}

function find (type = null, name = null) {
  let items = [];
  if (type && name) {
    const item = registered[buildKey(type, name)];
    if (item) {
      items.push(item);
    }
  } else if (type) {
    items = Object.values(registered).filter(item => item.type === type);
  } else {
    items = Object.values(registered);
  }

  return items.map(({type, name, schema}) => ({
    type,
    name,
    schema
  }));
}

module.exports = {
  register,
  validate,
  find
};
