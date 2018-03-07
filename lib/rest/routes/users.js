const express = require('express');
const usersSrv = require('../../services').user;
const logger = require('../../logger').admin;

module.exports = function () {
  const router = express.Router();

  router.get('/', function (req, res, next) {
    usersSrv.findAll(req.query).then(users => {
      res.json(users);
    }).catch(next);
  });

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

  router.get('/:id', function (req, res, next) {
    usersSrv.findByUsernameOrId(req.params.id)
      .then(user => {
        if (!user) return res.status(404).send('User not found: ' + req.params.id);
        res.json(user);
      }).catch(next);
  });

  router.put('/:id', function (req, res, next) {
    usersSrv.findByUsernameOrId(req.params.id)
      .then(user => {
        if (!user) return res.status(404).send('User not found: ' + req.params.id);
        return usersSrv.update(user.id, req.body);
      })
      .then(status => {
        return usersSrv.findByUsernameOrId(req.params.id);
      })
      .then(updatedUser => {
        res.json(updatedUser);
      })
      .catch(next);
  });

  router.delete('/:id', function (req, res, next) {
    usersSrv.findByUsernameOrId(req.params.id)
      .then(user => {
        if (!user) {
          return res.status(404).send('User not found: ' + req.params.id);
        }
        return usersSrv.remove(user.id)
          .then(() => {
            res.status(204).send();
          });
      })
      .catch(next);
  });

  router.put('/:id/status', function (req, res, next) {
    let prevStatus;
    usersSrv.findByUsernameOrId(req.params.id)
      .then(user => {
        if (!user) {
          return res.status(404).send('user not found: ' + req.params.id);
        } else {
          prevStatus = user.isActive;
          if (prevStatus === req.body.status) {
            return res.json({ status: prevStatus ? 'Active' : 'Inactive' });
          }
        }
        if (req.body.status === true) {
          return usersSrv.activate(user.id)
            .then(status => {
              res.json({ status: 'Activated' });
            });
        } else {
          return usersSrv.deactivate(user.id)
            .then(status => {
              res.json({ status: 'Deactivated' });
            });
        }
      })
      .catch(next);
  });

  return router;
};
