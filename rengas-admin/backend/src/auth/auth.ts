import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Post,
  Req,
  Res,
  UnauthorizedException,
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
} from "class-validator";
import { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import { Repository } from "typeorm";
import { Customer, Role, User } from "../entities";

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
    });

    const savedCustomer = await this.customers.save(customer);
    return { customer: customerResponse(savedCustomer) };
  }

  async sendCustomerOtp(rawPhoneNumber: string) {
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

  private setAccessCookie(response: Response, accessToken: string) {
    response.cookie("access_token", accessToken, {
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
    this.setAccessCookie(response, result.accessToken);
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

  @Post("customer/verify-otp")
  async verifyCustomerOtp(
    @Body() dto: VerifyCustomerOtpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.verifyCustomerOtp(dto.phoneNumber, dto.otp);
    this.setAccessCookie(response, result.accessToken);
    return result;
  }

  @Get("me")
  async me(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Customer and admin sites can share a cookie on localhost. Prefer the
    // explicit token sent by the customer app; never fall back if it is invalid.
    const authorization = request.headers.authorization;
    const token = authorization !== undefined
      ? /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
      : request.cookies?.access_token;
    if (!token) return { authenticated: false, role: null };

    try {
      const user = await this.jwt.verifyAsync(token);
      const customer = user.role === Role.CUSTOMER && user.customerId
        ? await this.auth.customerProfile(Number(user.customerId))
        : null;
      return {
        authenticated: true,
        username: user.username || null,
        customerId: user.customerId || null,
        role: user.role,
        customer,
      };
    } catch {
      if (authorization === undefined) this.clearAccessCookie(response);
      return { authenticated: false, role: null };
    }
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    this.clearAccessCookie(response);
    return { success: true };
  }

  private clearAccessCookie(response: Response) {
    response.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
}
