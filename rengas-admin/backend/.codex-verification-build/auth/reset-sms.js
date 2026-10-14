"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSmsMode = resetSmsMode;
exports.deliverResetOtp = deliverResetOtp;
const common_1 = require("@nestjs/common");
function resetSmsMode() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN &&
        (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID))
        return "twilio";
    if (process.env.NODE_ENV === "development")
        return "development";
    throw new common_1.ServiceUnavailableException("Password reset SMS is currently unavailable. Please contact the store.");
}
async function deliverResetOtp(phoneNumber, otp, purpose = "password reset") {
    if (resetSmsMode() === "development")
        return { developmentOtp: otp };
    let digits = phoneNumber.replace(/\D/g, "");
    if (digits.startsWith("00"))
        digits = digits.slice(2);
    else if (digits.startsWith("0")) {
        const country = process.env.SMS_DEFAULT_COUNTRY_CODE?.replace(/\D/g, "");
        if (!country)
            throw new common_1.BadRequestException("Please contact the store to configure the SMS country code.");
        digits = country + digits.replace(/^0+/, "");
    }
    if (!/^[1-9]\d{7,14}$/.test(digits))
        throw new common_1.BadRequestException("The registered phone number is not valid for SMS.");
    const account = process.env.TWILIO_ACCOUNT_SID;
    const body = new URLSearchParams({
        To: "+" + digits,
        Body: "RENGAS BORONG " + purpose + " code: " + otp + ". Expires in 5 minutes. Do not share this code.",
    });
    if (process.env.TWILIO_MESSAGING_SERVICE_SID)
        body.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
    else
        body.set("From", process.env.TWILIO_FROM_NUMBER);
    try {
        const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(account) + "/Messages.json", {
            method: "POST",
            headers: {
                Authorization: "Basic " + Buffer.from(account + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
            throw new Error("SMS provider rejected the request");
    }
    catch {
        throw new common_1.ServiceUnavailableException("Unable to send the reset code. Please try again later or contact the store.");
    }
    return {};
}
//# sourceMappingURL=reset-sms.js.map