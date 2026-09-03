import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { Role } from "../entities";

export type CustomerJwtPayload = {
  sub: number;
  customerId: number;
  role: Role.CUSTOMER;
  phoneNumber?: string;
};

export type CustomerRequest = Request & { user?: CustomerJwtPayload };

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomerRequest>();
    const authorization = request.headers.authorization;
    const bearerToken = authorization
      ? /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
      : undefined;
    const token = bearerToken ?? request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException("Customer authentication is required.");
    }

    try {
      const payload = await this.jwt.verifyAsync<CustomerJwtPayload>(token);
      const customerId = Number(payload.customerId);

      if (
        payload.role !== Role.CUSTOMER ||
        !Number.isSafeInteger(customerId) ||
        customerId < 1 ||
        Number(payload.sub) !== customerId
      ) {
        throw new UnauthorizedException("A valid customer session is required.");
      }

      request.user = { ...payload, customerId };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Your customer session is invalid or expired.");
    }
  }
}
