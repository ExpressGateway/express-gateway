const express = require('express');

module.exports = function ({ config }) {
  const router = express.Router();

  router.get('/', function (req, res) {
    res.json(config.gatewayConfig.serviceEndpoints);
  });

  router.get('/:name', function (req, res) {
    const entity = config.gatewayConfig.serviceEndpoints[req.params.name];
    if (!entity) {
      return res.status(404).send();
    }
    res.json(entity);
  });

  router.put('/:name', function (req, res, next) {
    let isUpdate;
    config.updateGatewayConfig(json => {
      json.serviceEndpoints = json.serviceEndpoints || {};
      isUpdate = req.params.name in json.serviceEndpoints;
      json.serviceEndpoints[req.params.name] = req.body;
      return json;
    })
      .then(() => res.status(isUpdate ? 204 : 201).send())
      .catch(next);
  });

  router.delete('/:name', function (req, res, next) {
    if (!config.gatewayConfig.serviceEndpoints[req.params.name]) {
      return res.status(404).send();
    }
    config.updateGatewayConfig(json => {
      json.serviceEndpoints = json.serviceEndpoints || {};
      delete json.serviceEndpoints[req.params.name];
      return json;
    })
      .then(() => res.status(204).send())
      .catch(next);
  });

  return router;
};
