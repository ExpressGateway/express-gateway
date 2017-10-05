const express = require('express');

module.exports = function ({config}) {
  const router = express.Router();
  router.put('/:name', function (req, res, next) {
    let isUpdate;
    config.updateGatewayConfig(json => {
      json.apiEndpoints = json.apiEndpoints || {};
      isUpdate = req.params.name in json.apiEndpoints;
      json.apiEndpoints[req.params.name] = req.body;
      return json;
    })
    .then(() => res.status(isUpdate ? 204 : 201).send())
    .catch(next);
  });
  router.get('/:name', function (req, res) {
    const entity = config.gatewayConfig.apiEndpoints[req.params.name];
    if (!entity) {
      return res.status(404).send();
    }
    res.json(entity);
  });
  router.get('/', function (req, res) {
    res.json(config.gatewayConfig.apiEndpoints);
  });
  router.delete('/:name', function (req, res, next) {
    if (!config.gatewayConfig.apiEndpoints[req.params.name]) {
      return res.status(404).send();
    }
    config.updateGatewayConfig(json => {
      json.apiEndpoints = json.apiEndpoints || {};
      delete json.apiEndpoints[req.params.name];
      return json;
    })
    .then(() => res.status(204).send())
    .catch(next);
  });
  return router;
};
