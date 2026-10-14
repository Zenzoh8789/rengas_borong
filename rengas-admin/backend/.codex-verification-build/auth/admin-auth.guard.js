"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const core_1 = require("@nestjs/core");
const entities_1 = require("../entities");
const roles_decorator_1 = require("./roles.decorator");
let AdminAuthGuard = class AdminAuthGuard {
    jwt;
    reflector;
    constructor(jwt, reflector) {
        this.jwt = jwt;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);
        if (!token) {
            throw new common_1.UnauthorizedException("Authentication is required.");
        }
        try {
            const payload = await this.jwt.verifyAsync(token);
            const allowedRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) ?? [entities_1.Role.ADMIN, entities_1.Role.ORDER_ADMIN];
            if (!allowedRoles.includes(payload.role)) {
                throw new common_1.ForbiddenException("Your role cannot perform this action.");
            }
            request.user = payload;
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException ||
                error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.UnauthorizedException("Your session is invalid or expired.");
        }
    }
    extractToken(request) {
        const authorization = request.headers.authorization;
        const bearerToken = authorization
            ? /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
            : undefined;
        return bearerToken ?? request.cookies?.admin_access_token;
    }
};
exports.AdminAuthGuard = AdminAuthGuard;
exports.AdminAuthGuard = AdminAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        core_1.Reflector])
], AdminAuthGuard);
//# sourceMappingURL=admin-auth.guard.js.map