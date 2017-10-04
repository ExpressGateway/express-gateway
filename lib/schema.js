const Ajv = require('ajv');
const ajv = new Ajv();

function createSchemaValidation (schema) {
  let validate;
  if (schema && typeof schema === 'object') {
    validate = ajv.compile(schema);
  } else {
    validate = () => true;  // empty validator
  }

  return (data) => {
    const isValid = validate(data);

    if (!isValid) {
      // TODO: add validation error class
      throw new Error(JSON.stringify(validate.errors));
    }

    return isValid;
  };
}

module.exports = {
  createSchemaValidation
};
