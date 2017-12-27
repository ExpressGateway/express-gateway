const { validate } = require('../../../lib/schemas');

module.exports = (schema) => (req, res, next) => {
  const { isValid, error } = validate(schema, req.body);

  if (isValid) {
    return next();
  }

  return res.status(500).send(error);
};
