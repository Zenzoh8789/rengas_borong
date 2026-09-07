

import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser = require("cookie-parser");
import express = require("express");
import { join } from "path";

import { getUploadDirectory } from "./storage";

const expressApp = express();
const port = Number(process.env.PORT) || 3000;

let ready = false;
expressApp.use((req, res, next) => {
  if (ready) return next();
  res.setHeader("Retry-After", "3");
  res.status(503).json({ message: "Application is starting. Please retry shortly." });
});
const server = expressApp.listen(port, "0.0.0.0");
server.on("error", error => { console.error("Unable to bind server:", error); process.exit(1); });

async function bootstrap() {
  const { NestFactory } = await import("@nestjs/core");
  const { ExpressAdapter } = await import("@nestjs/platform-express");
  const { ValidationPipe } = await import("@nestjs/common");
  const { AppModule } = await import("./app.module");
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.use(cookieParser());
  app.enableShutdownHooks();

  app.useStaticAssets(getUploadDirectory(), {
    prefix: "/uploads/",
    maxAge: "30d",
    immutable: true,
  });

  app.useStaticAssets(join(process.cwd(), "dist", "public"));

  app.setGlobalPrefix("api");

  app.enableCors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://rengatrading.in",
      "https://www.rengatrading.in",
      "https://order.rengatrading.in",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  await app.init();
  ready = true;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => { ready = false; server.close(); });
  }
  console.log(`RENGAS API initialized successfully on port ${port}`);
}

bootstrap().catch((error) => {
  console.error("Failed to initialize RENGAS API:", error);
  process.exit(1);
});
