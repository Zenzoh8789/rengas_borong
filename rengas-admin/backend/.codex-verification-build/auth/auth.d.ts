import { JwtService } from "@nestjs/jwt";
import { Request, Response } from "express";
import { Repository } from "typeorm";
import { Customer, Role, User } from "../entities";
import type { CustomerRequest } from "./customer-auth.guard";
declare class LoginDto {
    username: string;
    password: string;
    role: Role;
}
declare class CustomerSignupDto {
    verificationToken?: string;
    fullName: string;
    businessName: string;
    whatsappNumber: string;
    phoneNumber: string;
    email: string;
    tinNumber: string;
    address: string;
    password: string;
}
declare class SendCustomerOtpDto {
    phoneNumber: string;
}
declare class CustomerPasswordLoginDto extends SendCustomerOtpDto {
    password: string;
}
declare class VerifyCustomerOtpDto extends SendCustomerOtpDto {
    otp: string;
}
declare class ResetCustomerOtpDto extends SendCustomerOtpDto {
    otp: string;
}
declare class ResetCustomerPasswordDto {
    resetToken: string;
    newPassword: string;
}
declare class UpdateCustomerProfileDto {
    fullName: string;
    businessName: string;
    whatsappNumber: string;
    phoneNumber: string;
    email: string;
    tinNumber: string;
    address: string;
}
export declare class AuthService {
    private readonly users;
    private readonly customers;
    private readonly jwt;
    private readonly registration;
    sendRegistrationOtp(rawPhoneNumber: string): Promise<{
        developmentOtp: string;
        message: string;
        delivery: string;
    } | {
        developmentOtp?: undefined;
        message: string;
        delivery: string;
    }>;
    verifyRegistrationOtp(rawPhoneNumber: string, otp: string): {
        verificationToken: string;
    };
    constructor(users: Repository<User>, customers: Repository<Customer>, jwt: JwtService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            username: string;
            role: Role;
        };
    }>;
    customerSignup(dto: CustomerSignupDto): Promise<{
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    }>;
    sendCustomerOtp(rawPhoneNumber: string): Promise<{
        developmentOtp?: string;
        message: string;
    }>;
    customerPasswordLogin(rawPhoneNumber: string, password: string): Promise<{
        accessToken: string;
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    }>;
    customerProfile(customerId: number): Promise<{
        id: number;
        fullName: string;
        businessName: string;
        whatsappNumber: string;
        phoneNumber: string;
        email: string;
        tinNumber: string;
        address: string;
        phoneVerifiedAt: Date;
    }>;
    updateCustomerProfile(customerId: number, dto: UpdateCustomerProfileDto): Promise<{
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    }>;
    requestCustomerPasswordReset(rawPhoneNumber: string): Promise<{
        delivery: import("./reset-delivery").ResetDelivery;
        developmentOtp?: string;
        message: string;
    }>;
    verifyCustomerPasswordResetOtp(rawPhoneNumber: string, otp: string): Promise<{
        message: string;
        resetToken: string;
        expiresInSeconds: number;
    }>;
    resetCustomerPassword(resetToken: string, newPassword: string): Promise<{
        message: string;
    }>;
    private clearCustomerResetOtp;
    private clearCustomerPasswordReset;
    verifyCustomerOtp(rawPhoneNumber: string, otp: string): Promise<{
        accessToken: string;
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    }>;
    private clearCustomerOtp;
}
export declare class AuthController {
    private readonly auth;
    private readonly jwt;
    constructor(auth: AuthService, jwt: JwtService);
    private setAccessCookie;
    login(dto: LoginDto, response: Response): Promise<{
        user: {
            username: string;
            role: Role;
        };
    }>;
    customerSignup(dto: CustomerSignupDto): Promise<{
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    }>;
    sendCustomerOtp(dto: SendCustomerOtpDto): Promise<{
        developmentOtp?: string;
        message: string;
    }>;
    sendRegistrationOtp(dto: SendCustomerOtpDto): Promise<{
        developmentOtp: string;
        message: string;
        delivery: string;
    } | {
        developmentOtp?: undefined;
        message: string;
        delivery: string;
    }>;
    verifyRegistrationOtp(dto: VerifyCustomerOtpDto): {
        verificationToken: string;
    };
    customerPasswordLogin(dto: CustomerPasswordLoginDto, response: Response): Promise<{
        accessToken: string;
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    }>;
    requestCustomerPasswordReset(dto: SendCustomerOtpDto): Promise<{
        delivery: import("./reset-delivery").ResetDelivery;
        developmentOtp?: string;
        message: string;
    }>;
    verifyCustomerPasswordResetOtp(dto: ResetCustomerOtpDto): Promise<{
        message: string;
        resetToken: string;
        expiresInSeconds: number;
    }>;
    resetCustomerPassword(dto: ResetCustomerPasswordDto): Promise<{
        message: string;
    }>;
    verifyCustomerOtp(dto: VerifyCustomerOtpDto, response: Response): Promise<{
        accessToken: string;
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    }>;
    updateCustomerProfile(request: CustomerRequest, dto: UpdateCustomerProfileDto): Promise<{
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    }>;
    me(request: Request, response: Response): Promise<{
        authenticated: boolean;
        role: any;
        username?: undefined;
        customerId?: undefined;
        customer?: undefined;
    } | {
        authenticated: boolean;
        username: any;
        customerId: number;
        role: Role.CUSTOMER;
        customer: {
            id: number;
            fullName: string;
            businessName: string;
            whatsappNumber: string;
            phoneNumber: string;
            email: string;
            tinNumber: string;
            address: string;
            phoneVerifiedAt: Date;
        };
    } | {
        authenticated: boolean;
        username: string;
        customerId: any;
        role: Role.ADMIN | Role.ORDER_ADMIN;
        customer: any;
    }>;
    logout(response: Response): {
        success: boolean;
    };
    private clearAccessCookie;
}
export {};
