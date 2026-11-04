import "reflect-metadata";
import { Controller, Get, Inject, Module, type DynamicModule } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { APP_FILTER } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { Auth } from "./auth.ts";
import { CONFIG, type Config } from "./config.ts";
import { ConnectController } from "./connect.controller.ts";
import { ConsoleAuth } from "./console-auth.ts";
import { ConsoleController } from "./console.controller.ts";
import { ConnectorController } from "./connector.controller.ts";
import { Db } from "./db.ts";
import { AllErrors } from "./errors.ts";
import { Hub } from "./hub.ts";
import { hashToken } from "./secrets.ts";
import { Platform } from "./platform.ts";
import { PublicController } from "./public.controller.ts";
import { Webhooks } from "./webhooks.ts";

@Controller()
class HealthController {
  constructor(@Inject(Db) private db: Db) {}
  @Get("healthz") health() { return { ok: true }; }
  @Get("readyz") async ready() { await this.db.query("SELECT 1"); return { ok: true }; }
}

@Module({})
export class AppModule {
  static forConfig(config: Config): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, PublicController, ConnectorController, ConnectController, ConsoleController],
      providers: [
        { provide: CONFIG, useValue: config },
        { provide: APP_FILTER, useClass: AllErrors },
        { provide: Db, useFactory: (c: Config) => new Db(c), inject: [CONFIG] },
        { provide: Webhooks, useFactory: (d: Db, c: Config) => new Webhooks(d, c), inject: [Db, CONFIG] },
        { provide: Hub, useFactory: (d: Db, c: Config) => new Hub(d, c), inject: [Db, CONFIG] },
        { provide: Platform, useFactory: (d: Db, h: Hub, w: Webhooks, c: Config) => new Platform(d, h, w, c), inject: [Db, Hub, Webhooks, CONFIG] },
        { provide: Auth, useFactory: (d: Db) => new Auth(d), inject: [Db] },
        { provide: ConsoleAuth, useFactory: (d: Db) => new ConsoleAuth(d), inject: [Db] },
      ],
    };
  }
}

export async function createApp(config: Config): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forConfig(config), { bodyParser: false, abortOnError: false, logger: ["error", "warn"] });
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: true, directives: { "script-src": ["'self'", "'unsafe-inline'"], "style-src": ["'self'", "'unsafe-inline'"], "upgrade-insecure-requests": null } },
  }));
  // Behind the bundled Caddy proxy; needed for correct client details if rate limits are added.
  app.set("trust proxy", 1);
  // Only an enrolled connector may send a large body, and it is checked before any parsing happens.
  const db = app.get(Db);
  app.use("/connector/v1/connections", (req: Request, res: Response, next: NextFunction) => {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
    const deny = () => res.status(401).json({ error: { code: "unauthorized", message: "This connector is not enrolled." } });
    if (!token) return void deny();
    db.one("SELECT 1 FROM installation WHERE device_secret_hash = $1", [hashToken(token)]).then((row) => (row ? next() : deny()), next);
  }, express.json({ limit: "100mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.enableShutdownHooks();
  await app.init();
  await app.get(Hub).attach(app.getHttpServer());
  return app;
}
