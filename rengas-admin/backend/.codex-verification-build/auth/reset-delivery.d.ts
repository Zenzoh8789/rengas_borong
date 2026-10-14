export type ResetDelivery = "email" | "sms" | "development";
export declare function isResetTestAccount(phoneNumber: string): boolean;
export declare function resetDeliveryMode(phoneNumber?: string): ResetDelivery;
export declare function deliverPasswordReset(mode: ResetDelivery, phoneNumber: string, email: string | null | undefined, otp: string): Promise<{
    delivery: ResetDelivery;
    developmentOtp?: string;
}>;
