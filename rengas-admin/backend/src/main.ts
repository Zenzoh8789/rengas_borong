import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  ExpressAdapter,
  NestExpressApplication,
} from "@nestjs/platform-express";
import cookieParser = require("cookie-parser");
import express = require("express");
import { join } from "path";
import { AppModule } from "./app.module";
import { getUploadDirectory } from "./storage";

const expressApp = express();
const port = Number(process.env.PORT) || 3000;

async function bootstrap() {
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

  // Nest initializes all modules (including the database) before opening the
  // socket, so deployment health checks cannot receive a false success.
  await app.listen(port, "0.0.0.0");
  console.log(`RENGAS API initialized successfully on port ${port}`);
}

bootstrap().catch((error) => {
  console.error("Failed to initialize RENGAS API:", error);
  process.exit(1);
});
