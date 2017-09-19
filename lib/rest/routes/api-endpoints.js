const express = require('express');

module.exports = function ({config}) {
  let router = express.Router();
  router.put('/:name', function (req, res, next) {
    config.update(json => {
      json.apiEndpoints[req.params.name] = req.body;
      return json;
    })
    .then(() => {
      res.json({status: 'ok'});
    })
    .catch(next);
  });
  router.get('/:name', function (req, res, next) {
    res.json(config.gatewayConfig.apiEndpoints[req.params.name]);
  });
  router.get('/', function (req, res, next) {
    res.json(config.gatewayConfig.apiEndpoints);
  });
  router.delete('/:name', function (req, res, next) {
    config.update(json => {
      delete json.apiEndpoints[req.params.name];
      return json;
    })
    .then(() => res.status(204).send())
    .catch(next);
  });
  return router;
};
