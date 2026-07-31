import { Body, Controller, Get, Injectable, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role, User } from '../entities';

class LoginDto {
  @IsString() username:string;
  @IsString() @MinLength(4) password:string;
  @IsEnum(Role) role:Role;
}
@Injectable() export class AuthService {
  constructor(@InjectRepository(User) private users:Repository<User>,private jwt:JwtService){}
  async login(dto:LoginDto){
    const user=await this.users.findOne({where:{username:dto.username,role:dto.role}});
    if(!user || !(await bcrypt.compare(dto.password,user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    return {accessToken:await this.jwt.signAsync({sub:user.id,username:user.username,role:user.role}),user:{username:user.username,role:user.role}};
  }
}
@Controller('auth') export class AuthController {
  constructor(private auth:AuthService,private jwt:JwtService){}
  @Post('login') async login(@Body() dto:LoginDto,@Res({passthrough:true}) response:Response){
    const result=await this.auth.login(dto);
    response.cookie('access_token',result.accessToken,{httpOnly:true,secure:false,sameSite:'lax',maxAge:28800000,path:'/'});
    return {user:result.user};
  }
  @Get('me') async me(@Req() request:Request){
    const token=request.cookies?.access_token;
    if(!token) return {authenticated:false,role:null};
    try{return await this.jwt.verifyAsync(token)}catch{throw new UnauthorizedException('Session expired')}
  }
  @Post('logout') logout(@Res({passthrough:true}) response:Response){
    response.clearCookie('access_token',{httpOnly:true,secure:false,sameSite:'lax',path:'/'});
    return {success:true};
  }
}
