module.exports = {
  express: (actionParams) => {
    let pkg = require(actionParams.middlewareName);

    // pkg can be of following forms:
    // 1) raw: (req,res,next) => {}    /// using noMiddlewareParams
    // 2) with params: (params) => (req,res,next) => {}      /// see middlewareParams
    // 3) with constructor: you need call 2) as new pkg(params)   /// useConstructor
    // 4) middleware is not entire module but a property: ///configure middlewareProperty
    if (actionParams.middlewareProperty) {
      pkg = pkg[actionParams.middlewareProperty];
    }

    if (actionParams.noMiddlewareParams) {
      return pkg;
    }

    if (actionParams.useConstructor) {
      // eslint-disable-next-line
      return new pkg(actionParams.middlewareParams);
    }
    return pkg(actionParams.middlewareParams);
  }
};
