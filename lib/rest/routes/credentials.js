
const express = require('express');
const credentialSrv = require('../../services').credential;
const usersSrv = require('../../services').user;
const appsSrv = require('../../services').application;

module.exports = function () {
  const router = express.Router();
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

  router.put('/:type/:id/status', function (req, res, next) {
    const {id, type} = req.params;
    const status = req.body.status;

    credentialSrv.getCredential(id, type)
      .then(cred => {
        if (!cred) {
          return res.status(404).send('credential not found: ' + id);
        } else {
          if (cred.isActive === status) {
            return res.json({status: cred.isActive ? 'Active' : 'Inactive'});
          }
        }
        if (status === true) {
          return credentialSrv.activateCredential(id, type)
          .then(status => {
            res.json({status: 'Activated'});
          });
        } else {
          return credentialSrv.deactivateCredential(id, type)
          .then(status => {
            res.json({status: 'Deactivated'});
          });
        }
      })

      .catch(err => next(err));
  });

  router.put('/:type/:id/scopes/:scope', function (req, res, next) {
    const {id, type, scope} = req.params;

    credentialSrv.addScopesToCredential(id, type, scope)
    .then(success => {
      res.status(204).send();
    })
    .catch(err => {
      next(err); // TODO: identify cred not found and send 404
    });
  });
  router.delete('/:type/:id/scopes/:scope', function (req, res, next) {
    const {id, type, scope} = req.params;
    credentialSrv.removeScopesFromCredential(id, type, scope)
    .then(success => {
      res.status(204).send();
    })
    .catch(err => {
      next(err); // TODO: identify cred not found and send 404
    });
  });
  router.put('/:type/:id/scopes', function (req, res, next) {
    // set entire scopes array for cred
    const {id, type} = req.params;
    credentialSrv.setScopesForCredential(id, type, req.body.scopes)
    .then(success => {
      res.status(204).send();
    })
    .catch(err => {
      next(err); // TODO: identify cred not found and send 404
    });
  });
  router.get('/:type/:id', function (req, res, next) {
    const {id, type} = req.params;
    credentialSrv.getCredential(id, type)
    .then(cred => {
      res.json(cred);
    })
    .catch(err => {
      next(err); // TODO: identify cred not found and send 404
    });
  });

  router.get('/:consumerId', function (req, res, next) {
    const {params, query} = req;
    let include;
    try {
      include = query.include
        .split(',')
        .map(value => value.trim().toLowerCase())
        .filter(value => !!value);
    } catch (err) {
      include = [];
    }
    credentialSrv
      .getCredentials(params.consumerId, {
        include
      })
      .then(credentials => res.json({credentials}))
      .catch(next);
  });

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
