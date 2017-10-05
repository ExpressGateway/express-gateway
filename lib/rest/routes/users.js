
const express = require('express');
const usersSrv = require('../../services').user;
const logger = require('../../logger').admin;

module.exports = function () {
  const router = express.Router();

  router.post('/', function (req, res, next) {
    usersSrv.insert(req.body).then(user => {
      res.json(user);
    }).catch(err => {
      logger.warn('User creation failed', err);
      if (err.message.indexOf('exists') >= 0) {
        res.status(409).send(err.message);
      } else {
        next(err);
      }
    });
  });
  router.get('/', function (req, res, next) {
    usersSrv.findAll(req.query).then(users => {
      res.json(users);
    }).catch(err => next(err));
  });
  router.get('/:id', function (req, res, next) {
    findByIdOrUsername(req.params.id)
      .then(user => {
        if (!user) return res.status(404).send('User not found: ' + req.params.id);
        res.json(user);
      }).catch(err => next(err));
  });
  router.put('/:id/status', function (req, res, next) {
    let prevStatus;
    findByIdOrUsername(req.params.id)
      .then(user => {
        if (!user) {
          return res.status(404).send('user not found: ' + req.params.id);
        } else {
          prevStatus = user.isActive;
          if (prevStatus === req.body.status) {
            return res.json({status: prevStatus ? 'Active' : 'Inactive'});
          }
        }
        if (req.body.status === true) {
          return usersSrv.activate(user.id)
          .then(status => {
            res.json({status: 'Activated'});
          });
        } else {
          return usersSrv.deactivate(user.id)
          .then(status => {
            res.json({status: 'Deactivated'});
          });
        }
      })
      .catch(err => next(err));
  });
  router.put('/:id', function (req, res, next) {
    findByIdOrUsername(req.params.id)
      .then(user => {
        if (!user) return res.status(404).send('User not found: ' + req.params.id);
        return usersSrv.update(user.id, req.body);
      })
      .then(status => {
        return findByIdOrUsername(req.params.id);
      })
      .then(updatedUser => {
        res.json(updatedUser);
      })
      .catch(err => next(err));
  });
  router.delete('/:id', function (req, res, next) {
    findByIdOrUsername(req.params.id)
      .then(user => {
        if (!user) {
          return res.status(404).send('User not found: ' + req.params.id);
        }
        return usersSrv.remove(user.id)
          .then(() => {
            res.status(204).send();
          });
      })
      .catch(err => { next(err); });
  });
  return router;
};
function findByIdOrUsername (id) {
  return usersSrv
    .find(id)
    .then(user => {
      if (!user) {
        return usersSrv.get(id);
      }

      return user;
    });
}
