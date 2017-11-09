module.exports = function (params) {
  params.statusCode = Number(params.statusCode) || 400;
  params.message = params.message || 'Terminated';
  return function (req, res, next) {
    return res.status(params.statusCode).send(params.message);
  };
};
