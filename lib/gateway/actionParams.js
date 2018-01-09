const log = require('../logger').policy;
class ActionParams {
}

// TODO: this may be not the best way,
// but it seems to be the only one to allow reuse this code in plugins without requiring SDK
ActionParams.prototype.getCommonAuthCallback = function (req, res, next) {
  return (err, user, info) => {
    // passThrough allows auth to fail
    // (hoping that next auth policy will be able to do auth)
    if (!user && (this.passThrough)) {
      log.debug('auth passThrough enabled, continuing pipeline', err, info);
      return next();
    }

    if (err) {
      return next(err);
    }
    if (user) {
      req.logIn(user, this, (err) => next(err));
    } else if (info && info.unauthorized) { // user is not authorized
      res.status(403);
      res.send('Forbidden');
    } else {
      res.status(401);
      res.send('Unauthorized');
    }
  };
};
module.exports = ActionParams;
