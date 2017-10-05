const express = require('express');
const schemas = require('../../schemas');

module.exports = function () {
  const router = express.Router();
  router.get('/:type?/:name?', function (req, res) {
    const {type, name} = req.params;
    res.json({
      query: {type, name},
      schemas: schemas.find(type, name)
    });
  });
  return router;
};
