
const express = require('express');
const tokenSrv = require('../../services').token;

module.exports = function () {
  const router = express.Router();

  router.delete('/:token', function (req, res, next) {
    tokenSrv.revoke(req.params.token)
      .then(status => {
        if (!status) {
          return res.status(404).send('token not found: ' + req.params.token);
        }
        res.json(status);
      })
      .catch(err => { next(err); });
  });

  return router;
};
