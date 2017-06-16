module.exports = (pluginManifest) => {
  // pluginManifest {
  //  consumerManagement {
  //    userSrv, appSrv, credentialSrv, authSrv, tokensSrv
  //  }
  //  registerPolicy(policyName, (policyManifest)=> {see below details})
  //  logger
  //  gatewayConfig (processed gatewa.config.yaml file)
  //  pluginParams - parameters provided for this plugin in system.config.yaml
  //  ConfigurationError
  //  events:
  //    - gateway:willMount  // will execute before EG loads pipelines
  //    - gateway:didMount  // will execute after EG have loaded pipelines
  // }

  pluginManifest.on('gateway:willMount', (mainApp) => {
    // mainApp.use(xml-to-json-middleware())
    // place to register body parsers, request converters etc.
  });
  pluginManifest.on('gateway:didMount', (mainApp) => {
    // mainApp.use(my-final-error-handler(err,req,res,next)=>{})
  });
  pluginManifest.registerPolicy('simple-logger', (policyManifest) => {
    // pluginManifest {
    //  registerAction(actionName, actionParams=> express-middleware)
    //  registerCondition(conditionName, (req, conditionParams)=> {handler code})
    //  events:
    //    - pipeline:willMount  // will execute before EG loads current pipeline where policy is called
    //    - pipeline:didMount  // will execute after EG have loaded current pipeline where policy is called
    // }
    policyManifest.registerCondition('pathExact', (req, actionConfig) => {
      return req.url === actionConfig.path;
    });

    policyManifest.registerAction('log', (params) => {
      if (!params || !params.message) {
        throw new pluginManifest.ConfigurationError('Log middleware requires "message" param');
      }

      return (req, res, next) => {
        try {
          pluginManifest.logger.info(req.egContext.evaluateAsTemplateString(params.message));
        } catch (e) {
          pluginManifest.logger.error('failed to build log message; ' + e.message);
        }
        next();
      };
    });

    policyManifest.on('pipeline:willMount', (pipelineRouter) => {
      // pipelineRouter.use(some express-middleware)
      // pipelineRouter.get('/logs', routeHandler)
      // pipelineRouter.get('/oauth/authorize', routeHandler) // feature requested by Irfan
    });
    policyManifest.on('pipeline:didMount', (pipelineRouter) => {
      // pipelineRouter.use(pipeline specific error handler)
    });
  });
};
