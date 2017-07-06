
const express = require('express');
const applicationsSrv = require('../../services').application;

module.exports = function (app) {
  let router = express.Router();

  router.post('/', function (req, res, next) {
    let userId = req.body.userId;
    delete req.body.userId;
    applicationsSrv.insert(req.body, userId).then(app => {
      res.json(app);
    }).catch(err => next(err));
  });
  router.get('/', function (req, res, next) {
    applicationsSrv.findAll().then(apps => {
      res.json(apps);
    }).catch(err => next(err));
  });
  router.get('/:id', function (req, res, next) {
    applicationsSrv.get(req.params.id)
      .then(app => {
        if (!app) return res.status(404).send('app not found: ' + req.params.id);
        res.json(app);
      }).catch(err => next(err));
  });
  router.put('/:id/status', function (req, res, next) {
    let prevStatus;
    applicationsSrv.get(req.params.id)
      .then(app => {
        if (!app) {
          return res.status(404).send('app not found: ' + req.params.id);
        } else {
          prevStatus = app.isActive;
          if (prevStatus === req.body.status) {
            return res.json({status: prevStatus ? 'active' : 'inactive'});
          }
        }
        if (req.body.status === true) {
          return applicationsSrv.activate(app.id)
          .then(status => {
            res.json({status: 'activated'});
          });
        } else {
          return applicationsSrv.deactivate(app.id)
          .then(status => {
            res.json({status: 'deactivated'});
          });
        }
      })

      .catch(err => next(err));
  });
  router.put('/:id', function (req, res, next) {
    applicationsSrv.get(req.params.id)
      .then(app => {
        if (!app) return res.status(404).send('app not found: ' + req.params.id);
        return applicationsSrv.update(app.id, req.body);
      })
      .then(status => {
        return applicationsSrv.get(req.params.id);
      })
      .then(updatedapp => {
        res.json(updatedapp);
      })
      .catch(err => next(err));
  });
  router.delete('/:id', function (req, res, next) {
    applicationsSrv.get(req.params.id)
      .then(app => {
        if (!app) return res.status(404).send('app not found: ' + req.params.id);
        return applicationsSrv.remove(app.id);
      })
      .then(removedapp => {
        res.json(removedapp);
      })
      .catch(err => { next(err); });
  });
  return router;
};
