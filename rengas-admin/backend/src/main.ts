import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  ExpressAdapter,
  NestExpressApplication,
} from "@nestjs/platform-express";
import cookieParser = require("cookie-parser");
import express = require("express");
import { createServer } from "http";
import { join } from "path";
import { AppModule } from "./app.module";
import { getUploadDirectory } from "./storage";

const expressApp = express();
const server = createServer(expressApp);
const port = Number(process.env.PORT) || 3000;

// Listen immediately so Hostinger detects the server within 3 seconds.
server.listen(port, "0.0.0.0", () => {
  console.log(`HTTP server listening on port ${port}`);
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.use(cookieParser());

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
      transform: true,
    }),
  );

  // The HTTP server is already listening.
  await app.init();

  console.log("RENGAS API initialized successfully");
}

bootstrap().catch((error) => {
  console.error("Failed to initialize RENGAS API:", error);

  server.close(() => {
    process.exit(1);
  });
});