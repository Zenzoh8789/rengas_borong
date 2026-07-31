import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController, AuthService } from './auth/auth';
import { CrudController, CrudService } from './products/crud';
import { Category, Customer, DesignSetting, Notification, Order, OrderItem, Product, User } from './entities';
import { UploadsController } from './uploads/uploads';
import { FeaturesController, FeaturesService } from './features/features';
import { CatalogueController, CatalogueService } from './catalogue/catalogue';

@Module({
  imports:[
    ConfigModule.forRoot({isGlobal:true}),
    TypeOrmModule.forRoot({type:'mysql',host:process.env.DB_HOST||'localhost',port:+(process.env.DB_PORT||3307),username:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'root',database:process.env.DB_NAME||'rengas_admin',entities:[User,Category,Product,Customer,Order,OrderItem,Notification,DesignSetting],synchronize:false}),
    TypeOrmModule.forFeature([User,Category,Product,Customer,Order,OrderItem,Notification,DesignSetting]),
    JwtModule.register({global:true,secret:process.env.JWT_SECRET||'dev-secret',signOptions:{expiresIn:'8h'}})
  ],
  controllers:[AuthController,CrudController,UploadsController,FeaturesController,CatalogueController],
  providers:[AuthService,CrudService,FeaturesService,CatalogueService]
})
export class AppModule{}
