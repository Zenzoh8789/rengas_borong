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
const node_crypto_1 = require("node:crypto");
const typeorm_2 = require("typeorm");
const reset_delivery_1 = require("./reset-delivery");
const entities_1 = require("../entities");
const customer_auth_guard_1 = require("./customer-auth.guard");
const registration_verification_1 = require("./registration-verification");
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
class CustomerSignupDto {
    verificationToken;
    fullName;
    businessName;
    whatsappNumber;
    phoneNumber;
    email;
    tinNumber;
    address;
    password;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-f0-9]{64}$/),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "verificationToken", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(180),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "businessName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+?[0-9\s()-]{8,40}$/),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "whatsappNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+?[0-9\s()-]{8,40}$/),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(190),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "tinNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(72),
    __metadata("design:type", String)
], CustomerSignupDto.prototype, "password", void 0);
class SendCustomerOtpDto {
    phoneNumber;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+?[0-9\s()-]{8,40}$/),
    __metadata("design:type", String)
], SendCustomerOtpDto.prototype, "phoneNumber", void 0);
class CustomerPasswordLoginDto extends SendCustomerOtpDto {
    password;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(72),
    __metadata("design:type", String)
], CustomerPasswordLoginDto.prototype, "password", void 0);
class VerifyCustomerOtpDto extends SendCustomerOtpDto {
    otp;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^\d{6}$/),
    __metadata("design:type", String)
], VerifyCustomerOtpDto.prototype, "otp", void 0);
class ResetCustomerOtpDto extends SendCustomerOtpDto {
    otp;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^\d{6}$/),
    __metadata("design:type", String)
], ResetCustomerOtpDto.prototype, "otp", void 0);
class ResetCustomerPasswordDto {
    resetToken;
    newPassword;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(32),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], ResetCustomerPasswordDto.prototype, "resetToken", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(72),
    __metadata("design:type", String)
], ResetCustomerPasswordDto.prototype, "newPassword", void 0);
class UpdateCustomerProfileDto {
    fullName;
    businessName;
    whatsappNumber;
    phoneNumber;
    email;
    tinNumber;
    address;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], UpdateCustomerProfileDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(180),
    __metadata("design:type", String)
], UpdateCustomerProfileDto.prototype, "businessName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+?[0-9\s()-]{8,40}$/),
    __metadata("design:type", String)
], UpdateCustomerProfileDto.prototype, "whatsappNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+?[0-9\s()-]{8,40}$/),
    __metadata("design:type", String)
], UpdateCustomerProfileDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== ""),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(190),
    __metadata("design:type", String)
], UpdateCustomerProfileDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateCustomerProfileDto.prototype, "tinNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateCustomerProfileDto.prototype, "address", void 0);
const normalizePhone = (value) => value.replace(/\D/g, "");
const customerResponse = (customer) => ({
    id: customer.id,
    fullName: customer.name,
    businessName: customer.companyName || "",
    whatsappNumber: customer.whatsappNumber || "",
    phoneNumber: customer.phoneNumber || "",
    email: customer.email || "",
    tinNumber: customer.tinNumber || "",
    address: customer.address || "",
    phoneVerifiedAt: customer.phoneVerifiedAt || null,
});
let AuthService = class AuthService {
    users;
    customers;
    jwt;
    registration = new registration_verification_1.RegistrationVerification();
    async sendRegistrationOtp(rawPhoneNumber) {
        const phoneNumber = normalizePhone(rawPhoneNumber);
        if (await this.customers.findOne({ where: { phoneNumber } })) {
            throw new common_1.ConflictException("This phone number is already registered. Please sign in.");
        }
        return this.registration.send(phoneNumber);
    }
    verifyRegistrationOtp(rawPhoneNumber, otp) {
        return this.registration.verify(normalizePhone(rawPhoneNumber), otp);
    }
    constructor(users, customers, jwt) {
        this.users = users;
        this.customers = customers;
        this.jwt = jwt;
    }
    async login(dto) {
        const user = await this.users.findOne({
            where: { username: dto.username.trim(), role: dto.role },
        });
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        return {
            accessToken: await this.jwt.signAsync({
                sub: user.id,
                username: user.username,
                role: user.role,
            }),
            user: { username: user.username, role: user.role },
        };
    }
    async customerSignup(dto) {
        const phoneNumber = normalizePhone(dto.phoneNumber);
        const whatsappNumber = normalizePhone(dto.whatsappNumber);
        const email = dto.email.trim().toLowerCase();
        const tinNumber = dto.tinNumber.trim();
        const duplicate = await this.customers.findOne({
            where: [{ phoneNumber }, { email }, { tinNumber }],
        });
        if (duplicate) {
            throw new common_1.ConflictException("Phone number, email, or TIN number is already registered.");
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        if (dto.verificationToken)
            this.registration.consume(phoneNumber, dto.verificationToken);
        const customer = this.customers.create({
            name: dto.fullName.trim(),
            companyName: dto.businessName.trim(),
            whatsappNumber,
            phoneNumber,
            email,
            tinNumber,
            address: dto.address.trim(),
            passwordHash,
            phoneVerifiedAt: dto.verificationToken ? new Date() : null,
            otpHash: null,
            otpExpiresAt: null,
            otpAttempts: 0,
            resetOtpHash: null,
            resetOtpExpiresAt: null,
            resetOtpAttempts: 0,
            resetTokenHash: null,
            resetTokenExpiresAt: null,
        });
        const savedCustomer = await this.customers.save(customer);
        return { customer: customerResponse(savedCustomer) };
    }
    async sendCustomerOtp(rawPhoneNumber) {
        if (process.env.NODE_ENV === "production") {
            throw new common_1.ServiceUnavailableException("SMS sign-in is not available yet. Please sign in with your password.");
        }
        const phoneNumber = normalizePhone(rawPhoneNumber);
        const customer = await this.customers
            .createQueryBuilder("customer")
            .addSelect("customer.passwordHash")
            .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
            .getOne();
        if (!customer || !customer.passwordHash) {
            throw new common_1.BadRequestException("No registered account was found for this phone number.");
        }
        const otp = String((0, node_crypto_1.randomInt)(100000, 1000000));
        customer.otpHash = await bcrypt.hash(otp, 10);
        customer.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        customer.otpAttempts = 0;
        await this.customers.save(customer);
        return {
            message: "OTP sent to your phone number.",
            ...(process.env.NODE_ENV !== "production"
                ? { developmentOtp: otp }
                : {}),
        };
    }
    async customerPasswordLogin(rawPhoneNumber, password) {
        const phoneNumber = normalizePhone(rawPhoneNumber);
        const customer = await this.customers
            .createQueryBuilder("customer")
            .addSelect("customer.passwordHash")
            .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
            .getOne();
        if (!customer?.passwordHash ||
            !(await bcrypt.compare(password, customer.passwordHash))) {
            throw new common_1.UnauthorizedException("Invalid phone number or password.");
        }
        return {
            accessToken: await this.jwt.signAsync({
                sub: customer.id,
                role: entities_1.Role.CUSTOMER,
                customerId: customer.id,
                phoneNumber: customer.phoneNumber,
            }),
            customer: customerResponse(customer),
        };
    }
    async customerProfile(customerId) {
        const customer = await this.customers.findOne({
            where: { id: customerId },
        });
        return customer ? customerResponse(customer) : null;
    }
    async updateCustomerProfile(customerId, dto) {
        const customer = await this.customers.findOne({ where: { id: customerId } });
        if (!customer)
            throw new common_1.NotFoundException("Customer account was not found.");
        const phoneNumber = normalizePhone(dto.phoneNumber);
        const whatsappNumber = normalizePhone(dto.whatsappNumber);
        const email = dto.email.trim().toLowerCase();
        const tinNumber = dto.tinNumber.trim();
        const duplicate = await this.customers.findOne({
            where: [
                { phoneNumber },
                ...(email ? [{ email }] : []),
                { tinNumber },
            ],
        });
        if (duplicate && duplicate.id !== customerId) {
            throw new common_1.ConflictException("Phone number, email, or TIN number is already registered.");
        }
        customer.name = dto.fullName.trim();
        customer.companyName = dto.businessName.trim();
        customer.whatsappNumber = whatsappNumber;
        customer.phoneNumber = phoneNumber;
        customer.email = email || null;
        customer.tinNumber = tinNumber;
        customer.address = dto.address.trim();
        const savedCustomer = await this.customers.save(customer);
        return { customer: customerResponse(savedCustomer) };
    }
    async requestCustomerPasswordReset(rawPhoneNumber) {
        const mode = (0, reset_delivery_1.resetDeliveryMode)(rawPhoneNumber);
        const phoneNumber = normalizePhone(rawPhoneNumber);
        const customer = await this.customers
            .createQueryBuilder("customer")
            .addSelect("customer.passwordHash")
            .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
            .getOne();
        const message = mode === "email" ? "If the account has a registered email, a reset code has been sent. Check your inbox and spam folder." : "If an account exists, a password reset code has been sent.";
        if (!customer || !customer.passwordHash || (mode === "email" && !customer.email)) {
            return { message, delivery: mode };
        }
        const otp = String((0, node_crypto_1.randomInt)(100000, 1000000));
        customer.resetOtpHash = await bcrypt.hash(otp, 10);
        customer.resetOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        customer.resetOtpAttempts = 0;
        customer.resetTokenHash = null;
        customer.resetTokenExpiresAt = null;
        await this.customers.save(customer);
        try {
            const delivery = await (0, reset_delivery_1.deliverPasswordReset)(mode, phoneNumber, customer.email, otp);
            return {
                message: delivery.developmentOtp
                    ? "Reset code created for testing. No message was sent."
                    : message,
                ...delivery,
            };
        }
        catch (error) {
            await this.clearCustomerPasswordReset(customer);
            throw error;
        }
    }
    async verifyCustomerPasswordResetOtp(rawPhoneNumber, otp) {
        const phoneNumber = normalizePhone(rawPhoneNumber);
        const customer = await this.customers
            .createQueryBuilder("customer")
            .addSelect("customer.resetOtpHash")
            .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
            .getOne();
        if (!customer?.resetOtpHash || !customer.resetOtpExpiresAt) {
            throw new common_1.UnauthorizedException("Request a new password reset OTP.");
        }
        if (customer.resetOtpExpiresAt.getTime() < Date.now()) {
            await this.clearCustomerPasswordReset(customer);
            throw new common_1.UnauthorizedException("Password reset OTP has expired. Request a new OTP.");
        }
        if (customer.resetOtpAttempts >= 5) {
            await this.clearCustomerPasswordReset(customer);
            throw new common_1.UnauthorizedException("Too many attempts. Request a new OTP.");
        }
        const valid = await bcrypt.compare(otp, customer.resetOtpHash);
        if (!valid) {
            customer.resetOtpAttempts += 1;
            await this.customers.save(customer);
            throw new common_1.UnauthorizedException("OTP is incorrect.");
        }
        const resetToken = (0, node_crypto_1.randomBytes)(32).toString("hex");
        customer.resetTokenHash = (0, node_crypto_1.createHash)("sha256").update(resetToken).digest("hex");
        customer.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.clearCustomerResetOtp(customer);
        return {
            message: "OTP verified. You may now set a new password.",
            resetToken,
            expiresInSeconds: 10 * 60,
        };
    }
    async resetCustomerPassword(resetToken, newPassword) {
        const tokenHash = (0, node_crypto_1.createHash)("sha256").update(resetToken).digest("hex");
        const customer = await this.customers
            .createQueryBuilder("customer")
            .addSelect("customer.passwordHash")
            .addSelect("customer.resetTokenHash")
            .where("customer.resetTokenHash = :tokenHash", { tokenHash })
            .getOne();
        if (!customer?.resetTokenHash || !customer.resetTokenExpiresAt) {
            throw new common_1.UnauthorizedException("Password reset token is invalid or expired.");
        }
        if (customer.resetTokenExpiresAt.getTime() < Date.now()) {
            await this.clearCustomerPasswordReset(customer);
            throw new common_1.UnauthorizedException("Password reset token is invalid or expired.");
        }
        if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) {
            throw new common_1.BadRequestException("Password must be at least 8 characters and no more than 72 UTF-8 bytes.");
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        const result = await this.customers.update({ id: customer.id, resetTokenHash: tokenHash, resetTokenExpiresAt: (0, typeorm_2.MoreThan)(new Date()) }, {
            passwordHash,
            resetOtpHash: null, resetOtpExpiresAt: null, resetOtpAttempts: 0,
            resetTokenHash: null, resetTokenExpiresAt: null,
            otpHash: null, otpExpiresAt: null, otpAttempts: 0,
        });
        if (result.affected !== 1) {
            throw new common_1.UnauthorizedException("Password reset token is invalid or expired. Request a new OTP.");
        }
        return { message: "Password has been reset successfully." };
    }
    async clearCustomerResetOtp(customer) {
        customer.resetOtpHash = null;
        customer.resetOtpExpiresAt = null;
        customer.resetOtpAttempts = 0;
        await this.customers.save(customer);
    }
    async clearCustomerPasswordReset(customer) {
        customer.resetOtpHash = null;
        customer.resetOtpExpiresAt = null;
        customer.resetOtpAttempts = 0;
        customer.resetTokenHash = null;
        customer.resetTokenExpiresAt = null;
        await this.customers.save(customer);
    }
    async verifyCustomerOtp(rawPhoneNumber, otp) {
        const phoneNumber = normalizePhone(rawPhoneNumber);
        const customer = await this.customers
            .createQueryBuilder("customer")
            .addSelect("customer.otpHash")
            .addSelect("customer.passwordHash")
            .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
            .getOne();
        if (!customer?.otpHash || !customer.otpExpiresAt) {
            throw new common_1.UnauthorizedException("Request a new OTP.");
        }
        if (customer.otpExpiresAt.getTime() < Date.now()) {
            await this.clearCustomerOtp(customer);
            throw new common_1.UnauthorizedException("OTP has expired. Request a new OTP.");
        }
        if (customer.otpAttempts >= 5) {
            await this.clearCustomerOtp(customer);
            throw new common_1.UnauthorizedException("Too many attempts. Request a new OTP.");
        }
        const valid = await bcrypt.compare(otp, customer.otpHash);
        if (!valid) {
            customer.otpAttempts += 1;
            await this.customers.save(customer);
            throw new common_1.UnauthorizedException("OTP is incorrect.");
        }
        customer.phoneVerifiedAt ||= new Date();
        await this.clearCustomerOtp(customer);
        return {
            accessToken: await this.jwt.signAsync({
                sub: customer.id,
                role: entities_1.Role.CUSTOMER,
                customerId: customer.id,
                phoneNumber: customer.phoneNumber,
            }),
            customer: customerResponse(customer),
        };
    }
    async clearCustomerOtp(customer) {
        customer.otpHash = null;
        customer.otpExpiresAt = null;
        customer.otpAttempts = 0;
        await this.customers.save(customer);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
let AuthController = class AuthController {
    auth;
    jwt;
    constructor(auth, jwt) {
        this.auth = auth;
        this.jwt = jwt;
    }
    setAccessCookie(response, accessToken, cookieName = "access_token") {
        response.cookie(cookieName, accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 28_800_000,
            path: "/",
        });
    }
    async login(dto, response) {
        const result = await this.auth.login(dto);
        this.setAccessCookie(response, result.accessToken, "admin_access_token");
        return { user: result.user };
    }
    customerSignup(dto) {
        return this.auth.customerSignup(dto);
    }
    sendCustomerOtp(dto) {
        return this.auth.sendCustomerOtp(dto.phoneNumber);
    }
    sendRegistrationOtp(dto) {
        return this.auth.sendRegistrationOtp(dto.phoneNumber);
    }
    verifyRegistrationOtp(dto) {
        return this.auth.verifyRegistrationOtp(dto.phoneNumber, dto.otp);
    }
    async customerPasswordLogin(dto, response) {
        const result = await this.auth.customerPasswordLogin(dto.phoneNumber, dto.password);
        this.setAccessCookie(response, result.accessToken);
        return result;
    }
    requestCustomerPasswordReset(dto) {
        return this.auth.requestCustomerPasswordReset(dto.phoneNumber);
    }
    verifyCustomerPasswordResetOtp(dto) {
        return this.auth.verifyCustomerPasswordResetOtp(dto.phoneNumber, dto.otp);
    }
    resetCustomerPassword(dto) {
        return this.auth.resetCustomerPassword(dto.resetToken, dto.newPassword);
    }
    async verifyCustomerOtp(dto, response) {
        const result = await this.auth.verifyCustomerOtp(dto.phoneNumber, dto.otp);
        this.setAccessCookie(response, result.accessToken);
        return result;
    }
    updateCustomerProfile(request, dto) {
        return this.auth.updateCustomerProfile(request.user.customerId, dto);
    }
    async me(request, response) {
        const authorization = request.headers.authorization;
        const token = authorization !== undefined
            ? /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
            : request.cookies?.admin_access_token;
        if (!token)
            return { authenticated: false, role: null };
        let user;
        try {
            user = await this.jwt.verifyAsync(token);
        }
        catch {
            if (authorization === undefined)
                this.clearAccessCookie(response);
            return { authenticated: false, role: null };
        }
        if (user.role === entities_1.Role.CUSTOMER) {
            const id = Number(user.customerId);
            if (!Number.isSafeInteger(id) || id < 1 || Number(user.sub) !== id) {
                return { authenticated: false, role: null };
            }
            const customer = await this.auth.customerProfile(id);
            if (!customer)
                return { authenticated: false, role: null };
            return { authenticated: true, username: null, customerId: id, role: user.role, customer };
        }
        if (![entities_1.Role.ADMIN, entities_1.Role.ORDER_ADMIN].includes(user.role)) {
            return { authenticated: false, role: null };
        }
        return { authenticated: true, username: user.username || null, customerId: null, role: user.role, customer: null };
    }
    logout(response) {
        this.clearAccessCookie(response);
        return { success: true };
    }
    clearAccessCookie(response) {
        response.clearCookie("admin_access_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });
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
    (0, common_1.Post)("customer/signup"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CustomerSignupDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "customerSignup", null);
__decorate([
    (0, common_1.Post)("customer/send-otp"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendCustomerOtpDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "sendCustomerOtp", null);
__decorate([
    (0, common_1.Post)("customer/registration/send-otp"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendCustomerOtpDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "sendRegistrationOtp", null);
__decorate([
    (0, common_1.Post)("customer/registration/verify-otp"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyCustomerOtpDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verifyRegistrationOtp", null);
__decorate([
    (0, common_1.Post)("customer/login"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CustomerPasswordLoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "customerPasswordLogin", null);
__decorate([
    (0, common_1.Post)("customer/forgot-password"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendCustomerOtpDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "requestCustomerPasswordReset", null);
__decorate([
    (0, common_1.Post)("customer/verify-reset-otp"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ResetCustomerOtpDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verifyCustomerPasswordResetOtp", null);
__decorate([
    (0, common_1.Post)("customer/reset-password"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ResetCustomerPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resetCustomerPassword", null);
__decorate([
    (0, common_1.Post)("customer/verify-otp"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyCustomerOtpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyCustomerOtp", null);
__decorate([
    (0, common_1.Patch)("customer/profile"),
    (0, common_1.UseGuards)(customer_auth_guard_1.CustomerAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateCustomerProfileDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updateCustomerProfile", null);
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