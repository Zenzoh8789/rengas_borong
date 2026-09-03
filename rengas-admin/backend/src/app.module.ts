import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController, AuthService } from "./auth/auth";
import { AdminAuthGuard } from "./auth/admin-auth.guard";
import { CustomerAuthGuard } from "./auth/customer-auth.guard";
import { CrudController, CrudService } from "./products/crud";
import {
  Category,
  Customer,
  DesignSetting,
  Notification,
  Order,
  OrderItem,
  Product,
  User,
} from "./entities";
import { UploadsController } from "./uploads/uploads";
import { FeaturesController, FeaturesService } from "./features/features";
import { CatalogueController, CatalogueService } from "./catalogue/catalogue";
import { StoreController, StoreService } from "./store/store";
import { validateEnvironment } from "./config/env.validation";
import { getEnvironmentFilePaths } from "./config/env.paths";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvironmentFilePaths(),
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRoot({
      type: "mysql",
      host: process.env.DB_HOST as string,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER as string,
      password: process.env.DB_PASSWORD as string,
      database: process.env.DB_NAME as string,
      entities: [
        User,
        Category,
        Product,
        Customer,
        Order,
        OrderItem,
        Notification,
        DesignSetting,
      ],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([
      User,
      Category,
      Product,
      Customer,
      Order,
      OrderItem,
      Notification,
      DesignSetting,
    ]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET as string,
      signOptions: { expiresIn: "8h" },
    }),
  ],
  controllers: [
    AuthController,
    CrudController,
    UploadsController,
    FeaturesController,
    CatalogueController,
    StoreController,  
  ],
  providers: [
    AuthService,
    CrudService,
    FeaturesService,
    CatalogueService,
    StoreService,
    AdminAuthGuard,
    CustomerAuthGuard,
  ],
})
export class AppModule {}
