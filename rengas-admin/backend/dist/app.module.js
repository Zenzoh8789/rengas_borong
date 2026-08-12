"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const auth_1 = require("./auth/auth");
const crud_1 = require("./products/crud");
const entities_1 = require("./entities");
const uploads_1 = require("./uploads/uploads");
const features_1 = require("./features/features");
const catalogue_1 = require("./catalogue/catalogue");
const store_1 = require("./store/store");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env", }),
            typeorm_1.TypeOrmModule.forRoot({
                type: "mysql",
                host: process.env.DB_HOST || "localhost",
                port: +(process.env.DB_PORT || 3307),
                username: process.env.DB_USER || "root",
                password: process.env.DB_PASSWORD || "root",
                database: process.env.DB_NAME || "rengas_admin",
                entities: [
                    entities_1.User,
                    entities_1.Category,
                    entities_1.Product,
                    entities_1.Customer,
                    entities_1.Order,
                    entities_1.OrderItem,
                    entities_1.Notification,
                    entities_1.DesignSetting,
                ],
                synchronize: false,
            }),
            typeorm_1.TypeOrmModule.forFeature([
                entities_1.User,
                entities_1.Category,
                entities_1.Product,
                entities_1.Customer,
                entities_1.Order,
                entities_1.OrderItem,
                entities_1.Notification,
                entities_1.DesignSetting,
            ]),
            jwt_1.JwtModule.register({
                global: true,
                secret: process.env.JWT_SECRET || "dev-secret",
                signOptions: { expiresIn: "8h" },
            }),
        ],
        controllers: [
            auth_1.AuthController,
            crud_1.CrudController,
            uploads_1.UploadsController,
            features_1.FeaturesController,
            catalogue_1.CatalogueController,
            store_1.StoreController,
        ],
        providers: [
            auth_1.AuthService,
            crud_1.CrudService,
            features_1.FeaturesService,
            catalogue_1.CatalogueService,
            store_1.StoreService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map