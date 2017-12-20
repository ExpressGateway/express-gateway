module.exports = (params) =>
  (req, res, next) =>
    res.status(params.statusCode).send(params.message);
