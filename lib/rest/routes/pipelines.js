
const express = require('express');

module.exports = function ({config}) {
  let router = express.Router();
  router.put('/:name', function (req, res, next) {
    config.updateGently(json => {
      json.pipelines[req.params.name] = req.body;
      return json;
    })
    .then((json) => {
      res.json({status: 'ok'});
    })
    .catch(next);
  });
  router.get('/:name', function (req, res, next) {
    let ep = config.gatewayConfig.pipelines[req.params.name];
    res.json(ep);
  });
  router.get('/', function (req, res, next) {
    res.json(config.gatewayConfig.pipelines);
  });
  router.delete('/:name', function (req, res, next) {
    config.updateGently(json => {
      delete json.pipelines[req.params.name];
      return json;
    })
    .then((json) => {
      res.json({status: 'ok'});
    })
    .catch(next);
  });
  return router;
};
