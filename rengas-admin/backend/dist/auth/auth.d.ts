import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { Role, User } from '../entities';
declare class LoginDto {
    username: string;
    password: string;
    role: Role;
}
export declare class AuthService {
    private users;
    private jwt;
    constructor(users: Repository<User>, jwt: JwtService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            username: string;
            role: Role;
        };
    }>;
}
export declare class AuthController {
    private auth;
    private jwt;
    constructor(auth: AuthService, jwt: JwtService);
    login(dto: LoginDto, response: Response): Promise<{
        user: {
            username: string;
            role: Role;
        };
    }>;
    me(request: Request): Promise<any>;
    logout(response: Response): {
        success: boolean;
    };
}
export {};
