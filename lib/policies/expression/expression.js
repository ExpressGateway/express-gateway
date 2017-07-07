'use strict';

module.exports = (actionParams) => (req, res, next) => {
  req.egContext.run(actionParams.jscode);
  next();
};
