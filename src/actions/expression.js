module.exports = {
  expression: (actionParams) => (req, res, next) => {
    req.egContext.run(actionParams.jscode);
    next();
  }
};
