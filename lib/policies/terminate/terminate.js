module.exports = (params) =>
  (req, res, next) => {
    let payload;
    if (req.accepts('json')) {
      payload = { message: params.message };
    } else {
      payload = params.message;
    }
    res.status(params.statusCode).send(payload);
  };
