const express = require('express');

module.exports = function ({config}) {
  let router = express.Router();
  router.put('/:name', function (req, res, next) {
    let isUpdate;
    config.update(json => {
      isUpdate = req.params.name in json.serviceEndpoints;
      json.serviceEndpoints[req.params.name] = req.body;
      return json;
    })
    .then(() => res.status(isUpdate ? 204 : 201).send())
    .catch(next);
  });
  router.get('/:name', function (req, res, next) {
    res.json(config.gatewayConfig.serviceEndpoints[req.params.name]);
  });
  router.get('/', function (req, res, next) {
    res.json(config.gatewayConfig.serviceEndpoints);
  });
  router.delete('/:name', function (req, res, next) {
    config.update(json => {
      delete json.serviceEndpoints[req.params.name];
      return json;
    })
    .then(() => res.status(204).send())
    .catch(next);
  });
  return router;
};
