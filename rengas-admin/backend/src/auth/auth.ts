import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { MoreThan, Repository } from "typeorm";
import { deliverPasswordReset, resetDeliveryMode } from "./reset-delivery";
import { Customer, Role, User } from "../entities";
import { CustomerAuthGuard } from "./customer-auth.guard";
import type { CustomerRequest } from "./customer-auth.guard";

class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsEnum(Role)
  role: Role;
}

class CustomerSignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  businessName: string;

  @IsString()
  @Matches(/^\+?[0-9\s()-]{8,40}$/)
  whatsappNumber: string;

  @IsString()
  @Matches(/^\+?[0-9\s()-]{8,40}$/)
  phoneNumber: string;

  @IsEmail()
  @MaxLength(190)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tinNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

class SendCustomerOtpDto {
  @IsString()
  @Matches(/^\+?[0-9\s()-]{8,40}$/)
  phoneNumber: string;
}

class CustomerPasswordLoginDto extends SendCustomerOtpDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

class VerifyCustomerOtpDto extends SendCustomerOtpDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp: string;
}

class ResetCustomerOtpDto extends SendCustomerOtpDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp: string;
}

class ResetCustomerPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @MaxLength(128)
  resetToken: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

class UpdateCustomerProfileDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName: string;

  @IsString() @IsNotEmpty() @MaxLength(180)
  businessName: string;

  @IsString() @Matches(/^\+?[0-9\s()-]{8,40}$/)
  whatsappNumber: string;

  @IsString() @Matches(/^\+?[0-9\s()-]{8,40}$/)
  phoneNumber: string;

  @IsString() @ValidateIf((_, value) => value !== "") @IsEmail() @MaxLength(190)
  email: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  tinNumber: string;

  @IsString() @IsNotEmpty() @MaxLength(500)
  address: string;
}

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const customerResponse = (customer: Customer) => ({
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,

    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,

    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { username: dto.username.trim(), role: dto.role },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
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

  async customerSignup(dto: CustomerSignupDto) {
    const phoneNumber = normalizePhone(dto.phoneNumber);
    const whatsappNumber = normalizePhone(dto.whatsappNumber);
    const email = dto.email.trim().toLowerCase();
    const tinNumber = dto.tinNumber.trim();

    const duplicate = await this.customers.findOne({
      where: [{ phoneNumber }, { email }, { tinNumber }],
    });

    if (duplicate) {
      throw new ConflictException(
        "Phone number, email, or TIN number is already registered.",
      );
    }

    const customer = this.customers.create({
      name: dto.fullName.trim(),
      companyName: dto.businessName.trim(),
      whatsappNumber,
      phoneNumber,
      email,
      tinNumber,
      address: dto.address.trim(),
      passwordHash: await bcrypt.hash(dto.password, 12),
      phoneVerifiedAt: null,
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

  async sendCustomerOtp(rawPhoneNumber: string) {
    if (process.env.NODE_ENV === "production") {
      throw new ServiceUnavailableException("SMS sign-in is not available yet. Please sign in with your password.");
    }
    const phoneNumber = normalizePhone(rawPhoneNumber);
    const customer = await this.customers
      .createQueryBuilder("customer")
      .addSelect("customer.passwordHash")
      .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
      .getOne();

    if (!customer || !customer.passwordHash) {
      throw new BadRequestException(
        "No registered account was found for this phone number.",
      );
    }

    const otp = String(randomInt(100000, 1000000));
    customer.otpHash = await bcrypt.hash(otp, 10);
    customer.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    customer.otpAttempts = 0;
    await this.customers.save(customer);

    // TODO: send `otp` through your SMS provider here.
    return {
      message: "OTP sent to your phone number.",
      ...(process.env.NODE_ENV !== "production"
        ? { developmentOtp: otp }
        : {}),
    };
  }

  async customerPasswordLogin(rawPhoneNumber: string, password: string) {
    const phoneNumber = normalizePhone(rawPhoneNumber);
    const customer = await this.customers
      .createQueryBuilder("customer")
      .addSelect("customer.passwordHash")
      .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
      .getOne();

    if (
      !customer?.passwordHash ||
      !(await bcrypt.compare(password, customer.passwordHash))
    ) {
      throw new UnauthorizedException("Invalid phone number or password.");
    }

    return {
      accessToken: await this.jwt.signAsync({
        sub: customer.id,
        role: Role.CUSTOMER,
        customerId: customer.id,
        phoneNumber: customer.phoneNumber,
      }),
      customer: customerResponse(customer),
    };
  }

  async customerProfile(customerId: number) {
    const customer = await this.customers.findOne({
      where: { id: customerId },
    });
    return customer ? customerResponse(customer) : null;
  }

  async updateCustomerProfile(customerId: number, dto: UpdateCustomerProfileDto) {
    const customer = await this.customers.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException("Customer account was not found.");

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
      throw new ConflictException("Phone number, email, or TIN number is already registered.");
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

  async requestCustomerPasswordReset(rawPhoneNumber: string) {
    const mode = resetDeliveryMode(rawPhoneNumber);
    const phoneNumber = normalizePhone(rawPhoneNumber);
    const customer = await this.customers
      .createQueryBuilder("customer")
      .addSelect("customer.passwordHash")
      .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
      .getOne();

    // Keep the public response generic so the endpoint does not reveal whether
    // a phone number is registered. In development, return the OTP to make the
    // local flow testable; production sends to the registered contact only.
    const message = mode === "email" ? "If the account has a registered email, a reset code has been sent. Check your inbox and spam folder." : "If an account exists, a password reset code has been sent.";
    if (!customer || !customer.passwordHash || (mode === "email" && !customer.email)) {
      return { message, delivery: mode };
    }

    const otp = String(randomInt(100000, 1000000));
    customer.resetOtpHash = await bcrypt.hash(otp, 10);
    customer.resetOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    customer.resetOtpAttempts = 0;
    customer.resetTokenHash = null;
    customer.resetTokenExpiresAt = null;
    await this.customers.save(customer);

    try {
      const delivery = await deliverPasswordReset(mode, phoneNumber, customer.email, otp);
      return {
        message: delivery.developmentOtp
          ? "Reset code created for testing. No message was sent."
          : message,
        ...delivery,
      };
    } catch (error) {
      await this.clearCustomerPasswordReset(customer);
      throw error;
    }
  }

  async verifyCustomerPasswordResetOtp(rawPhoneNumber: string, otp: string) {
    const phoneNumber = normalizePhone(rawPhoneNumber);
    const customer = await this.customers
      .createQueryBuilder("customer")
      .addSelect("customer.resetOtpHash")
      .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
      .getOne();

    if (!customer?.resetOtpHash || !customer.resetOtpExpiresAt) {
      throw new UnauthorizedException("Request a new password reset OTP.");
    }

    if (customer.resetOtpExpiresAt.getTime() < Date.now()) {
      await this.clearCustomerPasswordReset(customer);
      throw new UnauthorizedException("Password reset OTP has expired. Request a new OTP.");
    }

    if (customer.resetOtpAttempts >= 5) {
      await this.clearCustomerPasswordReset(customer);
      throw new UnauthorizedException("Too many attempts. Request a new OTP.");
    }

    const valid = await bcrypt.compare(otp, customer.resetOtpHash);
    if (!valid) {
      customer.resetOtpAttempts += 1;
      await this.customers.save(customer);
      throw new UnauthorizedException("OTP is incorrect.");
    }

    const resetToken = randomBytes(32).toString("hex");
    customer.resetTokenHash = createHash("sha256").update(resetToken).digest("hex");
    customer.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.clearCustomerResetOtp(customer);

    return {
      message: "OTP verified. You may now set a new password.",
      resetToken,
      expiresInSeconds: 10 * 60,
    };
  }

  async resetCustomerPassword(resetToken: string, newPassword: string) {
    const tokenHash = createHash("sha256").update(resetToken).digest("hex");
    const customer = await this.customers
      .createQueryBuilder("customer")
      .addSelect("customer.passwordHash")
      .addSelect("customer.resetTokenHash")
      .where("customer.resetTokenHash = :tokenHash", { tokenHash })
      .getOne();

    if (!customer?.resetTokenHash || !customer.resetTokenExpiresAt) {
      throw new UnauthorizedException("Password reset token is invalid or expired.");
    }

    if (customer.resetTokenExpiresAt.getTime() < Date.now()) {
      await this.clearCustomerPasswordReset(customer);
      throw new UnauthorizedException("Password reset token is invalid or expired.");
    }

    if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) {
      throw new BadRequestException("Password must be at least 8 characters and no more than 72 UTF-8 bytes.");
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    // Consume the token in the same database update as the password change.
    const result = await this.customers.update(
      { id: customer.id, resetTokenHash: tokenHash, resetTokenExpiresAt: MoreThan(new Date()) },
      {
        passwordHash,
        resetOtpHash: null, resetOtpExpiresAt: null, resetOtpAttempts: 0,
        resetTokenHash: null, resetTokenExpiresAt: null,
        otpHash: null, otpExpiresAt: null, otpAttempts: 0,
      },
    );
    if (result.affected !== 1) {
      throw new UnauthorizedException("Password reset token is invalid or expired. Request a new OTP.");
    }

    return { message: "Password has been reset successfully." };
  }

  private async clearCustomerResetOtp(customer: Customer) {
    customer.resetOtpHash = null;
    customer.resetOtpExpiresAt = null;
    customer.resetOtpAttempts = 0;
    await this.customers.save(customer);
  }

  private async clearCustomerPasswordReset(customer: Customer) {
    customer.resetOtpHash = null;
    customer.resetOtpExpiresAt = null;
    customer.resetOtpAttempts = 0;
    customer.resetTokenHash = null;
    customer.resetTokenExpiresAt = null;
    await this.customers.save(customer);
  }

  async verifyCustomerOtp(rawPhoneNumber: string, otp: string) {
    const phoneNumber = normalizePhone(rawPhoneNumber);
    const customer = await this.customers
      .createQueryBuilder("customer")
      .addSelect("customer.otpHash")
      .addSelect("customer.passwordHash")
      .where("customer.phoneNumber = :phoneNumber", { phoneNumber })
      .getOne();

    if (!customer?.otpHash || !customer.otpExpiresAt) {
      throw new UnauthorizedException("Request a new OTP.");
    }

    if (customer.otpExpiresAt.getTime() < Date.now()) {
      await this.clearCustomerOtp(customer);
      throw new UnauthorizedException("OTP has expired. Request a new OTP.");
    }

    if (customer.otpAttempts >= 5) {
      await this.clearCustomerOtp(customer);
      throw new UnauthorizedException("Too many attempts. Request a new OTP.");
    }

    const valid = await bcrypt.compare(otp, customer.otpHash);
    if (!valid) {
      customer.otpAttempts += 1;
      await this.customers.save(customer);
      throw new UnauthorizedException("OTP is incorrect.");
    }

    customer.phoneVerifiedAt ||= new Date();
    await this.clearCustomerOtp(customer);

    return {
      accessToken: await this.jwt.signAsync({
        sub: customer.id,
        role: Role.CUSTOMER,
        customerId: customer.id,
        phoneNumber: customer.phoneNumber,
      }),
      customer: customerResponse(customer),
    };
  }

  private async clearCustomerOtp(customer: Customer) {
    customer.otpHash = null;
    customer.otpExpiresAt = null;
    customer.otpAttempts = 0;
    await this.customers.save(customer);
  }
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  private setAccessCookie(response: Response, accessToken: string, cookieName = "access_token") {
    response.cookie(cookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 28_800_000,
      path: "/",
    });
  }

  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setAccessCookie(response, result.accessToken, "admin_access_token");
    return { user: result.user };
  }

  @Post("customer/signup")
  customerSignup(@Body() dto: CustomerSignupDto) {
    return this.auth.customerSignup(dto);
  }

  @Post("customer/send-otp")
  sendCustomerOtp(@Body() dto: SendCustomerOtpDto) {
    return this.auth.sendCustomerOtp(dto.phoneNumber);
  }

  @Post("customer/login")
  async customerPasswordLogin(
    @Body() dto: CustomerPasswordLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.customerPasswordLogin(
      dto.phoneNumber,
      dto.password,
    );
    this.setAccessCookie(response, result.accessToken);
    return result;
  }

  @Post("customer/forgot-password")
  requestCustomerPasswordReset(@Body() dto: SendCustomerOtpDto) {
    return this.auth.requestCustomerPasswordReset(dto.phoneNumber);
  }

  @Post("customer/verify-reset-otp")
  verifyCustomerPasswordResetOtp(@Body() dto: ResetCustomerOtpDto) {
    return this.auth.verifyCustomerPasswordResetOtp(dto.phoneNumber, dto.otp);
  }

  @Post("customer/reset-password")
  resetCustomerPassword(@Body() dto: ResetCustomerPasswordDto) {
    return this.auth.resetCustomerPassword(dto.resetToken, dto.newPassword);
  }

  @Post("customer/verify-otp")
  async verifyCustomerOtp(
    @Body() dto: VerifyCustomerOtpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.verifyCustomerOtp(dto.phoneNumber, dto.otp);
    this.setAccessCookie(response, result.accessToken);
    return result;
  }

  @Patch("customer/profile")
  @UseGuards(CustomerAuthGuard)
  updateCustomerProfile(
    @Req() request: CustomerRequest,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.auth.updateCustomerProfile(request.user!.customerId, dto);
  }

  @Get("me")
  async me(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Customer apps use their explicit bearer token. Admin sessions use a
    // separate cookie so customer login cannot replace the admin session.
    const authorization = request.headers.authorization;
    const token = authorization !== undefined
      ? /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
      : request.cookies?.admin_access_token;
    if (!token) return { authenticated: false, role: null };

    let user: { role: Role; customerId?: number; sub?: number; username?: string };
    try {
      user = await this.jwt.verifyAsync(token);
    } catch {
      if (authorization === undefined) this.clearAccessCookie(response);
      return { authenticated: false, role: null };
    }
    if (user.role === Role.CUSTOMER) {
      const id = Number(user.customerId);
      if (!Number.isSafeInteger(id) || id < 1 || Number(user.sub) !== id) {
        return { authenticated: false, role: null };
      }
      // Database failures propagate as server errors, not invalid sessions.
      const customer = await this.auth.customerProfile(id);
      if (!customer) return { authenticated: false, role: null };
      return { authenticated: true, username: null, customerId: id, role: user.role, customer };
    }
    if (![Role.ADMIN, Role.ORDER_ADMIN].includes(user.role)) {
      return { authenticated: false, role: null };
    }
    return { authenticated: true, username: user.username || null, customerId: null, role: user.role, customer: null };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    this.clearAccessCookie(response);
    return { success: true };
  }

  private clearAccessCookie(response: Response) {
    response.clearCookie("admin_access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
}
