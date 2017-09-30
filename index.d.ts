import express = require("express");

declare global {
  namespace Express {
    export interface Request {
      egContext: any
    }
  }

  namespace ExpressGateway {
    interface Policy {
      name: string,
      policy(actionParams): express.RequestHandler
    }

    interface Condition {
      name: string,
      handler(req: express.Request, conditionConfig): boolean
    }

    interface PluginContext {
      registerPolicy(policy: Policy): void,
      registerCondition(condition: Condition): void,
      registerGatewayRoute(gatewayRoutesDeclaration: Function): void,
      registerAdminRoute(adminRoutesDeclaration: Function): void,
      registerCLIExtension(cliExtension): void
    }

    export interface Plugin {
      version: string,
      policies: Array<string>,
      init(context: PluginContext): void
    }
  }
}

