"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isResetTestAccount = isResetTestAccount;
exports.resetDeliveryMode = resetDeliveryMode;
exports.deliverPasswordReset = deliverPasswordReset;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
const reset_sms_1 = require("./reset-sms");
function isResetTestAccount(phoneNumber) {
    if (process.env.PASSWORD_RESET_TEST_MODE !== "true")
        return false;
    const phone = phoneNumber.replace(/\D/g, "");
    if (!/^\d{8,15}$/.test(phone))
        return false;
    return (process.env.PASSWORD_RESET_TEST_PHONES || "").split(",")
        .map(value => value.trim())
        .filter(value => /^\+?[0-9 ()-]{8,40}$/.test(value))
        .some(value => value.replace(/\D/g, "") === phone);
}
function resetDeliveryMode(phoneNumber = "") {
    if (isResetTestAccount(phoneNumber))
        return "development";
    const provider = process.env.PASSWORD_RESET_DELIVERY?.trim() || "email";
    if (provider === "sms")
        return (0, reset_sms_1.resetSmsMode)() === "development" ? "development" : "sms";
    if (provider !== "email")
        throw new common_1.ServiceUnavailableException("Password recovery is not configured. Please contact the store.");
    const configured = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"].every(name => process.env[name]?.trim());
    if (configured) {
        if (![465, 587].includes(Number(process.env.SMTP_PORT || "465")))
            throw new common_1.ServiceUnavailableException("Password recovery email configuration is invalid. Please contact the store.");
        return "email";
    }
    if (process.env.NODE_ENV === "development")
        return "development";
    throw new common_1.ServiceUnavailableException("Password recovery email is not configured. Please contact the store.");
}
async function deliverPasswordReset(mode, phoneNumber, email, otp) {
    if (mode === "development") {
        if (process.env.NODE_ENV !== "development" && !isResetTestAccount(phoneNumber))
            throw new common_1.ServiceUnavailableException("Test codes are disabled.");
        return { delivery: mode, developmentOtp: otp };
    }
    if (mode === "sms") {
        await (0, reset_sms_1.deliverResetOtp)(phoneNumber, otp);
        return { delivery: mode };
    }
    if (!email || !/^[^\s@,;<>\r\n]+@[^\s@,;<>\r\n]+\.[^\s@,;<>\r\n]+$/.test(email)) {
        throw new common_1.ServiceUnavailableException("A registered email address is required.");
    }
    const port = Number(process.env.SMTP_PORT || "465");
    const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, dnsTimeout: 10000,
        disableFileAccess: true, disableUrlAccess: true,
    });
    try {
        const result = await transport.sendMail({
            from: { name: "RENGAS BORONG", address: process.env.SMTP_FROM },
            to: { address: email, name: "" },
            subject: "Your RENGAS BORONG password reset code",
            text: "Your password reset code is: " + otp + "\n\nIt expires in 5 minutes. Do not share this code.\nIf you did not request a password reset, ignore this email.",
        });
        if (!result.accepted?.length || result.rejected?.length)
            throw new Error("Email not accepted");
    }
    catch {
        throw new common_1.ServiceUnavailableException("Unable to send the reset email. Please try again later or contact the store.");
    }
    finally {
        transport.close();
    }
    return { delivery: mode };
}
//# sourceMappingURL=reset-delivery.js.map