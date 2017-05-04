module.exports = function(params, options) {
  options.policies.register("plugin-policy", (policyParams) => {
    return (req, res) => {
      res.json({
        result: 'plugin-policy',
        policyParams,
        conditional: req.conditionWasHere,
        hostname: req.hostname,
        url: req.url
      })
    }
  });

  options.conditionals.register({
    name: 'plugin-conditional',
    handler: (req) => {
      req.conditionWasHere = true;
      return true;
    }
  });
  options.app.use('/testing', (req, res) => {
    res.json({ plugin: true })
  })
}