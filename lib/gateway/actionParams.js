const log = require('../logger').policy;
class ActionParams {
}

// TODO: this may be not the best way,
// but it seems to be the only one to allow reuse this code in plugins without requiring SDK
ActionParams.prototype.getCommonAuthCallback = function (req, res, next) {
  return (err, user, info) => {
    // passThrough allows auth to fail
    // (hoping that next auth policy will be able to do auth)
    if (!user && this.passThrough) {
      res.set('eg-consumer-id', 'anonymous');
      log.debug('auth passThrough enabled, continuing pipeline', err, info);
      return next();
    }

    if (err) {
      return next(err);
    }

    if (user) {
      req.logIn(user, this, (err) => {
        if (req.egContext.consumer.id) {
          req.headers['eg-consumer-id'] = req.egContext.consumer.id;
        };

        next(err);
      });
    } else if (info && info.unauthorized) {
      res.sendStatus(403);
    } else {
      res.sendStatus(401);
    }
  };
};
module.exports = ActionParams;
