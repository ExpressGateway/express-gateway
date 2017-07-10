
const express = require('express');
const credentialSrv = require('../../services').credential;
const usersSrv = require('../../services').user;
const appsSrv = require('../../services').application;

module.exports = function (app) {
  let router = express.Router();

  router.post('/', function (req, res, next) {
    findConsumer(req.body.consumerId)
      .then(consumer => {
        if (!consumer) {
          return res.status(422).json(new Error('Consumer Not Found: id:' + req.body.consumerId));
        }

        return credentialSrv.insertCredential(req.body.consumerId, req.body.type, req.body.credential)
         .then(data => {
           res.json(data);
         });
      })
     .catch(err => {
       if (!res.headersSent) { // no need to send error if 422 sent
         next(err);
       }
     });
  });
  // router.get('/', function (req, res, next) {
  //   credentialSrv.getAllScopes().then(scopes => {
  //     res.json({scopes});
  //   }).catch(err => next(err));
  // });
  // router.get('/:scope', function (req, res, next) { // check exist
  //   credentialSrv.existsScope(req.params.scope)
  //     .then(status => {
  //       if (!status) {
  //         return res.status(404).send('scope not found: ' + req.params.scope);
  //       }
  //       res.json({scope: req.params.scope});
  //     }).catch(err => next(err));
  // });
  // router.put('/:scope', function (req, res, next) {
  //   res.send(501, 'scope update not implemented');
  // });
  // router.delete('/:scope', function (req, res, next) {
  //   credentialSrv.removeScopes(req.params.scope)
  //     .then(status => {
  //       if (!status) {
  //         return res.status(404).send('scope not found: ' + req.params.scope);
  //       }
  //       res.json(status);
  //     })
  //     .catch(err => { next(err); });
  // });
  return router;
};

function findConsumer (id) {
  return usersSrv
    .find(id)
    .then(user => {
      if (user) {
        return user;
      }
      return usersSrv.get(id);
    })
    .then(user => {
      if (user) {
        return user;
      }
      return appsSrv.get(id);
    });
}
