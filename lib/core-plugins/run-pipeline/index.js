module.exports = {
  version: '1.7.0',
  init: function (pluginContext) {
    console.log('run-pipeline init');
    pluginContext.registerPolicy({
      name: 'run-pipeline',
      policy: (actionParams) => {
        return (req, res, next) => {
          console.log('execute ', actionParams.name);
          const router = pluginContext.services.pipelines.getPipelineRouter(actionParams.name);
          return router(req, res, next);
        };
      }
    });
  },
  policies: ['run-pipeline']};
