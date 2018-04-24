const express = require('express');
const userSrv = require('../../services').user;
const applicationsSrv = require('../../services').application;

module.exports = function () {
  const router = express.Router();

  router.get('/', function (req, res, next) {
    applicationsSrv.findAll(req.query)
      .then(apps => res.json(apps))
      .catch(next);
  });

  router.post('/', function (req, res, next) {
    const userId = req.body.userId;
    delete req.body.userId;

    userSrv.findByUsernameOrId(userId)
      .then((user) => {
        if (!user) {
          throw new Error('The specified user does not exist');
        };

        return applicationsSrv.insert(req.body, user.id);
      })
      .then(app => res.json(app))
      .catch(err => {
        if (err.message.indexOf('exist') >= 0) {
          res.status(409).send(err.message);
        } else {
          next(err);
        }
      });
  });

  router.get('/:id', function (req, res, next) {
    applicationsSrv.findByNameOrId(req.params.id)
      .then(app => {
        if (!app) return res.status(404).send(`Application not found: ${req.params.id}`);
        res.json(app);
      }).catch(next);
  });

  router.put('/:id', function (req, res, next) {
    applicationsSrv.findByNameOrId(req.params.id)
      .then(app => {
        if (!app) return res.status(404).send(`Application not found: ${req.params.id}`);
        return applicationsSrv.update(app.id, req.body);
      })
      .then(status => {
        return applicationsSrv.findByNameOrId(req.params.id);
      })
      .then(updatedapp => {
        res.json(updatedapp);
      })
      .catch(next);
  });

  router.delete('/:id', function (req, res, next) {
    applicationsSrv.findByNameOrId(req.params.id)
      .then(app => {
        if (!app) return res.status(404).send(`Application not found: ${req.params.id}`);
        return applicationsSrv.remove(app.id)
          .then(() => res.status(204).send());
      })
      .catch(next);
  });

  router.put('/:id/status', function (req, res, next) {
    let prevStatus;
    applicationsSrv.findByNameOrId(req.params.id)
      .then(app => {
        if (!app) {
          return res.status(404).send(`Application not found: ${req.params.id}`);
        } else {
          prevStatus = app.isActive;
          if (prevStatus === req.body.status) {
            return res.json({ status: prevStatus ? 'Active' : 'Inactive' });
          }
        }
        if (req.body.status === true) {
          return applicationsSrv.activate(app.id)
            .then(status => {
              res.json({ status: 'Activated' });
            });
        } else {
          return applicationsSrv.deactivate(app.id)
            .then(status => res.json({ status: 'Deactivated' }));
        }
      })

      .catch(next);
  });

  return router;
};
