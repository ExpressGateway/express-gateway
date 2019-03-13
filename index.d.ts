import * as express from "express";
import { EventEmitter } from "events";
import { JSONSchema7 } from "json-schema";

declare module "express" {
  export interface Request {
    egContext: unknown
  }
}

declare namespace ExpressGateway {

  type Policy = {
    name: string,
    policy(actionParams): express.RequestHandler,
    schema?: JSONSchema7
  }

  type Condition = {
    name: string,
    handler(req: express.Request, conditionConfig: unknown): boolean,
    schema?: JSONSchema7
  }

  type PluginContext = {
    registerPolicy(policy: Policy): void,
    registerCondition(condition: Condition): void,
    registerGatewayRoute(gatewayRoutesDeclaration: (gatewayExpressApp: express.Application) => void): void,
    registerAdminRoute(adminRoutesDeclaration: (adminExpressApp: express.Application) => void): void,
    registerCLIExtension(cliExtension: unknown): void,
    eventBus: EventEmitter
  }

  export type Plugin = {
    version?: string,
    policies?: string[],
    init(context: PluginContext): void,
    schema?: JSONSchema7
  }
}
