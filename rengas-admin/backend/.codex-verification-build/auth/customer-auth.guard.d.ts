import { CanActivate, ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { Role } from "../entities";
export type CustomerJwtPayload = {
    sub: number;
    customerId: number;
    role: Role.CUSTOMER;
    phoneNumber?: string;
};
export type CustomerRequest = Request & {
    user?: CustomerJwtPayload;
};
export declare class CustomerAuthGuard implements CanActivate {
    private readonly jwt;
    constructor(jwt: JwtService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
