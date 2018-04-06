const express = require('express');
const credentialSrv = require('../../services').credential;
const findConsumer = require('../utils/findConsumer');

module.exports = function () {
  const router = express.Router();

  router.post('/', function (req, res, next) {
    findConsumer(req.body.consumerId)
      .then(consumer => {
        if (!consumer) {
          return res.status(422).send(`No consumer found with id: ${req.body.consumerId}`);
        }

        return credentialSrv
          .insertCredential(consumer.id, req.body.type, req.body.credential)
          .then((data) => res.json(data));
      })
      .catch(next);
  });

  router.get('/:type/:id', function (req, res, next) {
    const { id, type } = req.params;
    credentialSrv.getCredential(id, type)
      .then(cred => res.json(cred))
      .catch(next);
  });

  router.put('/:type/:id/status', function (req, res, next) {
    const { id, type } = req.params;
    const status = req.body.status;

    credentialSrv.getCredential(id, type)
      .then(cred => {
        if (!cred) {
          return res.status(404).send(`No credential found with id: ${id}`);
        } else {
          if (cred.isActive === status) {
            return res.json({ status: cred.isActive ? 'Active' : 'Inactive' });
          }
        }
        if (status === true) {
          return credentialSrv
            .activateCredential(id, type)
            .then(status => res.json({ status: 'Activated' }));
        } else {
          return credentialSrv
            .deactivateCredential(id, type)
            .then(status => res.json({ status: 'Deactivated' }));
        }
      }).catch(next);
  });

  router.put('/:type/:id/scopes/:scope', function (req, res, next) {
    const { id, type, scope } = req.params;

    credentialSrv
      .addScopesToCredential(id, type, [scope])
      .then(success => res.status(204).send())
      .catch(next);
  });

  router.delete('/:type/:id/scopes/:scope', function (req, res, next) {
    const { id, type, scope } = req.params;
    credentialSrv.removeScopesFromCredential(id, type, [scope])
      .then(success => res.status(204).send())
      .catch(next);
  });

  router.put('/:type/:id/scopes', function (req, res, next) {
    // set entire scopes array for cred
    const { id, type } = req.params;
    credentialSrv.setScopesForCredential(id, type, req.body.scopes)
      .then(success => res.status(204).send())
      .catch(next);
  });

  router.get('/:consumerId', function (req, res, next) {
    findConsumer(req.params.consumerId)
      .then((consumer) => {
        if (!consumer) {
          return res.status(404).json(new Error('Consumer Not Found: id:' + req.body.consumerId));
        }

        return credentialSrv
          .getCredentials(consumer.id)
          .then(credentials => res.json({ credentials }));
      }).catch(next);
  });

  return router;
};
