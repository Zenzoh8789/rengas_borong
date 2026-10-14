export declare class RegistrationVerification {
    private readonly challenges;
    send(phone: string): Promise<{
        developmentOtp: string;
        message: string;
        delivery: string;
    } | {
        developmentOtp?: undefined;
        message: string;
        delivery: string;
    }>;
    verify(phone: string, otp: string): {
        verificationToken: string;
    };
    consume(phone: string, token: string): void;
}
