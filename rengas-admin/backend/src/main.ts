import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser = require("cookie-parser");
import { join } from "path";
import { AppModule } from "./app.module";
import { getUploadDirectory } from "./storage";

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());

  app.useStaticAssets(getUploadDirectory(), {
    prefix: "/uploads/",
    maxAge: "30d",
    immutable: true,
  });

  app.useStaticAssets(join(process.cwd(), "dist", "public"));

  app.setGlobalPrefix("api");

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://rengatrading.in",
    "https://www.rengatrading.in",
    "https://order.rengatrading.in",
  ];

  app.enableCors({
    origin: allowedOrigins,
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

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port, "0.0.0.0");

  console.log(`RENGAS API running on port ${port}`);
}

bootstrap().catch((error) => {
  console.error("Failed to start RENGAS API:", error);
  process.exit(1);
});