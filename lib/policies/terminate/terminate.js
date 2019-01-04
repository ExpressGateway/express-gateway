module.exports = (params) =>
  (req, res, next) => {
    if (req.accepts('json')) {
      res.status(params.statusCode).send({ message: params.message });
    } else {
      res.status(params.statusCode).send(params.message);
    }
  };
