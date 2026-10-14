export declare function resetSmsMode(): "twilio" | "development";
export declare function deliverResetOtp(phoneNumber: string, otp: string, purpose?: "password reset" | "registration"): Promise<{
    developmentOtp: string;
} | {
    developmentOtp?: undefined;
}>;
