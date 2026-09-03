import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { Role } from "../entities";
import { ROLES_KEY } from "./roles.decorator";

type AdminJwtPayload = {
  sub: number;
  username?: string;
  role: Role;
};

type AuthenticatedRequest = Request & { user?: AdminJwtPayload };

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Authentication is required.");
    }

    try {
      const payload = await this.jwt.verifyAsync<AdminJwtPayload>(token);
      const allowedRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [Role.ADMIN, Role.ORDER_ADMIN];

      if (!allowedRoles.includes(payload.role)) {
        throw new ForbiddenException("Your role cannot perform this action.");
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException("Your session is invalid or expired.");
    }
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;
    const bearerToken = authorization
      ? /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
      : undefined;
    return bearerToken ?? request.cookies?.access_token;
  }
}
