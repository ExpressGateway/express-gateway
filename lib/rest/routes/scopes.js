
const express = require('express');
const credentialSrv = require('../../services').credential;

module.exports = function () {
  const router = express.Router();

  router.post('/', function (req, res, next) {
    const scope = req.body.scope || req.body.scopes;
    credentialSrv.insertScopes(scope).then(status => {
      res.status(201).send();
      // the only reason it fails - validation for dupes
      // advanced logic requires implementation of error processing in services
    }).catch(err => {
      if (err.message.indexOf('exist') >= 0) {
        res.status(409).send(err.message);
      } else (next(err));
    });
  });
  router.get('/', function (req, res, next) {
    credentialSrv.getAllScopes().then(scopes => {
      res.json({scopes});
    }).catch(err => next(err));
  });
  router.get('/:scope', function (req, res, next) { // check exist
    credentialSrv.existsScope(req.params.scope)
      .then(status => {
        if (!status) {
          return res.status(404).send('scope not found: ' + req.params.scope);
        }
        res.json({scope: req.params.scope});
      }).catch(err => next(err));
  });
  router.put('/:scope', function (req, res, next) {
    credentialSrv.insertScopes([req.params.scope]).then(status => {
      res.status(201).send();
    }).catch(err => {
      if (err.message.indexOf('exist') >= 0) {
        res.status(409).send(err.message);
      } else (next(err));
    });
  });
  router.delete('/:scope', function (req, res, next) {
    credentialSrv.removeScopes(req.params.scope)
      .then(status => {
        if (!status) {
          return res.status(404).send('scope not found: ' + req.params.scope);
        }
        res.status(204).send();
      })
      .catch(err => { next(err); });
  });
  return router;
};
