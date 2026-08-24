import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser = require("cookie-parser");
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());

  app.useStaticAssets(join(__dirname, "..", "uploads"), {
    prefix: "/uploads/",
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

  const port = Number(process.env.PORT || 3002);

  await app.listen(port);

  console.log(`RENGAS API running on http://localhost:${port}`);
}

bootstrap();