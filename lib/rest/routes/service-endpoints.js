
const express = require('express');

module.exports = function ({config}) {
  let router = express.Router();
  router.put('/:name', function (req, res, next) {
    config.updateGently(json => {
      json.serviceEndpoints[req.params.name] = req.body;
      return json;
    })
    .then(() => {
      res.json({status: 'ok'});
    })
    .catch(next);
  });
  router.get('/:name', function (req, res, next) {
    let ep = config.gatewayConfig.serviceEndpoints[req.params.name];
    res.json(ep);
  });
  router.get('/', function (req, res, next) {
    res.json(config.gatewayConfig.serviceEndpoints);
  });
  router.delete('/:name', function (req, res, next) {
    config.updateGently(json => {
      delete json.serviceEndpoints[req.params.name];
      return json;
    })
    .then(() => {
      res.json({status: 'ok'});
    })
    .catch(next);
  });
  return router;
};
