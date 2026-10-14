"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cookieParser = require("cookie-parser");
const express = require("express");
const path_1 = require("path");
const storage_1 = require("./storage");
const expressApp = express();
const port = Number(process.env.PORT) || 3000;
let ready = false;
expressApp.use((req, res, next) => {
    if (ready)
        return next();
    res.setHeader("Retry-After", "3");
    res.status(503).json({ message: "Application is starting. Please retry shortly." });
});
const server = expressApp.listen(port, "0.0.0.0");
server.on("error", error => { console.error("Unable to bind server:", error); process.exit(1); });
async function bootstrap() {
    const { NestFactory } = await Promise.resolve().then(() => require("@nestjs/core"));
    const { ExpressAdapter } = await Promise.resolve().then(() => require("@nestjs/platform-express"));
    const { ValidationPipe } = await Promise.resolve().then(() => require("@nestjs/common"));
    const { AppModule } = await Promise.resolve().then(() => require("./app.module"));
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.use(cookieParser());
    app.enableShutdownHooks();
    app.useStaticAssets((0, storage_1.getUploadDirectory)(), {
        prefix: "/uploads/",
        maxAge: "30d",
        immutable: true,
    });
    app.useStaticAssets((0, path_1.join)(process.cwd(), "dist", "public"));
    app.setGlobalPrefix("api");
    app.enableCors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "https://72.61.113.192",
            "https://rengasborong.my",
            "https://www.rengasborong.my",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transform: true,
        stopAtFirstError: true,
    }));
    await app.init();
    ready = true;
    for (const signal of ["SIGTERM", "SIGINT"]) {
        process.once(signal, () => { ready = false; server.close(); });
    }
    console.log(`RENGAS API initialized successfully on port ${port}`);
}
bootstrap().catch((error) => {
    console.error("Failed to initialize RENGAS API:", error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map