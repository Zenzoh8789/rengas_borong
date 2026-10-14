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
exports.CustomerAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const entities_1 = require("../entities");
let CustomerAuthGuard = class CustomerAuthGuard {
    jwt;
    constructor(jwt) {
        this.jwt = jwt;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers.authorization;
        const bearerToken = authorization
            ? /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
            : undefined;
        const token = bearerToken ?? request.cookies?.access_token;
        if (!token) {
            throw new common_1.UnauthorizedException("Customer authentication is required.");
        }
        try {
            const payload = await this.jwt.verifyAsync(token);
            const customerId = Number(payload.customerId);
            if (payload.role !== entities_1.Role.CUSTOMER ||
                !Number.isSafeInteger(customerId) ||
                customerId < 1 ||
                Number(payload.sub) !== customerId) {
                throw new common_1.UnauthorizedException("A valid customer session is required.");
            }
            request.user = { ...payload, customerId };
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            throw new common_1.UnauthorizedException("Your customer session is invalid or expired.");
        }
    }
};
exports.CustomerAuthGuard = CustomerAuthGuard;
exports.CustomerAuthGuard = CustomerAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], CustomerAuthGuard);
//# sourceMappingURL=customer-auth.guard.js.map