
const express = require('express');
const YAWN = require('yawn-yaml/cjs');
const fs = require('fs');

module.exports = function ({config}) {
  let router = express.Router();
  router.put('/:name', function (req, res, next) {
    fs.readFile(config.gatewayConfigPath, 'utf8', (err, data) => {
      if (err) {
        return next(err);
      }
      let yawn = new YAWN(data);
      yawn.json.apiEndpoints[req.params.name] = req.body;
      fs.writeFile(config.gatewayConfigPath, yawn.yaml, (err) => {
        if (err) {
          return next(err);
        }
        res.json({status: 'ok'});
      });
    });
  });
  router.get('/:name', function (req, res, next) {
    let ep = config.gatewayConfig.apiEndpoints[req.params.name];
    console.log(ep);
    res.json(ep);
  });
  router.get('/', function (req, res, next) {
    res.json(config.gatewayConfig.apiEndpoints);
  });
  router.delete('/:name', function (req, res, next) {
    fs.readFile(config.gatewayConfigPath, 'utf8', (err, data) => {
      if (err) {
        return next(err);
      }
      let yawn = new YAWN(data);
      delete yawn.json.apiEndpoints[req.params.name];
      fs.writeFile(config.gatewayConfigPath, yawn.yaml, (err) => {
        if (err) {
          return next(err);
        }
        res.json({status: 'ok'});
      });
    });
  });
  return router;
};
