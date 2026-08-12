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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const class_validator_1 = require("class-validator");
const bcrypt = require("bcrypt");
const typeorm_2 = require("typeorm");
const entities_1 = require("../entities");
class LoginDto {
    username;
    password;
    role;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(4),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(entities_1.Role),
    __metadata("design:type", String)
], LoginDto.prototype, "role", void 0);
let AuthService = class AuthService {
    users;
    jwt;
    constructor(users, jwt) {
        this.users = users;
        this.jwt = jwt;
    }
    async login(dto) {
        const user = await this.users.findOne({
            where: { username: dto.username, role: dto.role },
        });
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
            throw new common_1.UnauthorizedException("Invalid credentials");
        return {
            accessToken: await this.jwt.signAsync({
                sub: user.id,
                username: user.username,
                role: user.role,
            }),
            user: { username: user.username, role: user.role },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
let AuthController = class AuthController {
    auth;
    jwt;
    constructor(auth, jwt) {
        this.auth = auth;
        this.jwt = jwt;
    }
    async login(dto, response) {
        const result = await this.auth.login(dto);
        response.cookie("access_token", result.accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 28800000,
            path: "/",
        });
        return { user: result.user };
    }
    async me(request, response) {
        const token = request.cookies?.access_token;
        if (!token) {
            return {
                authenticated: false,
                role: null,
            };
        }
        try {
            const user = await this.jwt.verifyAsync(token);
            return {
                authenticated: true,
                username: user.username,
                role: user.role,
            };
        }
        catch {
            response.clearCookie("access_token", {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                path: "/",
            });
            return {
                authenticated: false,
                role: null,
            };
        }
    }
    logout(response) {
        response.clearCookie("access_token", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
        });
        return { success: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)("me"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)("logout"),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [AuthService,
        jwt_1.JwtService])
], AuthController);
//# sourceMappingURL=auth.js.map