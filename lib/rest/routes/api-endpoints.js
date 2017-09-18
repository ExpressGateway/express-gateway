
const express = require('express');

module.exports = function ({config}) {
  let router = express.Router();
  router.put('/:name', function (req, res, next) {
    config.updateGently(json => {
      json.apiEndpoints[req.params.name] = req.body;
      return json;
    })
    .then((json) => {
      res.json({status: 'ok'});
    })
    .catch(next);
  });
  router.get('/:name', function (req, res, next) {
    let ep = config.gatewayConfig.apiEndpoints[req.params.name];
    res.json(ep);
  });
  router.get('/', function (req, res, next) {
    res.json(config.gatewayConfig.apiEndpoints);
  });
  router.delete('/:name', function (req, res, next) {
    config.updateGently(json => {
      delete json.apiEndpoints[req.params.name];
      return json;
    })
    .then((json) => {
      res.json({status: 'ok'});
    })
    .catch(next);
  });
  return router;
};
