const express = require('express');

module.exports = function ({config}) {
  let router = express.Router();
  router.put('/:name', function (req, res, next) {
    config.update(json => {
      json.policies = json.policies || [];
      if (json.policies.indexOf(req.params.name) === -1) {
        json.policies.push(req.params.name);
      }
      return json;
    })
    .then(() => {
      res.json({status: 'ok'});
    })
    .catch(next);
  });
  router.get('/', function (req, res) {
    res.json(config.gatewayConfig.policies);
  });
  router.delete('/:name', function (req, res, next) {
    config.update(json => {
      json.policies = json.policies || [];
      let index = json.policies.indexOf(req.params.name);
      if (index >= 0) {
        json.policies.splice(index, 1);
      }
      return json;
    })
    .then(() => res.status(204).send())
    .catch(next);
  });
  return router;
};
