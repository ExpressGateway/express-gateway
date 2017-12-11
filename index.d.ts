import express = require("express");
import { EventEmitter } from "events";
import { JSONSchema6 } from "json-schema";

declare global {
  namespace Express {
    export interface Request {
      egContext: any
    }
  }

  namespace ExpressGateway {
    interface Policy {
      name: string,
      policy(actionParams): express.RequestHandler,
      schema?: JSONSchema6
    }

    interface Condition {
      name: string,
      handler(req: express.Request, conditionConfig): boolean,
      schema?: JSONSchema6
    }

    interface PluginContext {
      registerPolicy(policy: Policy): void,
      registerCondition(condition: Condition): void,
      registerGatewayRoute(gatewayRoutesDeclaration: (gatewayExpressApp: express.Application) => void): void,
      registerAdminRoute(adminRoutesDeclaration: (adminExpressApp: express.Application) => void): void,
      registerCLIExtension(cliExtension): void,
      eventBus: EventEmitter
    }

    export interface Plugin {
      version?: string,
      policies?: Array<string>,
      init(context: PluginContext): void,
      schema?: JSONSchema6
    }
  }
}

