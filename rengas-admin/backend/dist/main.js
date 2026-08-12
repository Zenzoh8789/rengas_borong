"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const cookieParser = require("cookie-parser");
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use(cookieParser());
    app.useStaticAssets((0, path_1.join)(process.cwd(), "uploads"), {
        prefix: "/uploads/",
    });
    app.setGlobalPrefix("api");
    const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ];
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    const port = Number(process.env.PORT || 3002);
    await app.listen(port);
    console.log(`RENGAS API running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map