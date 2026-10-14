"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationVerification = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const reset_sms_1 = require("./reset-sms");
const digest = (value) => (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
class RegistrationVerification {
    challenges = new Map();
    async send(phone) {
        if (!/^[1-9]\d{7,14}$/.test(phone))
            throw new common_1.BadRequestException("Enter a valid international phone number.");
        const now = Date.now();
        for (const [key, entry] of this.challenges)
            if (entry.expires <= now)
                this.challenges.delete(key);
        if (this.challenges.get(phone) && now - this.challenges.get(phone).sent < 60000) {
            throw new common_1.BadRequestException("Please wait one minute before requesting another code.");
        }
        if (this.challenges.size >= 10000)
            throw new common_1.ServiceUnavailableException("Please try again shortly.");
        const otp = String((0, node_crypto_1.randomInt)(100000, 1000000));
        const challenge = { hash: digest(otp), expires: now + 5 * 60000, sent: now, attempts: 0 };
        this.challenges.set(phone, challenge);
        try {
            const delivery = await (0, reset_sms_1.deliverResetOtp)(phone, otp, "registration");
            return {
                message: delivery.developmentOtp ? "Local test mode: no SMS was sent. Use the test code below." : "Verification code sent by SMS.",
                delivery: delivery.developmentOtp ? "development" : "sms",
                ...delivery,
            };
        }
        catch (error) {
            if (this.challenges.get(phone) === challenge)
                this.challenges.delete(phone);
            throw error;
        }
    }
    verify(phone, otp) {
        const challenge = this.challenges.get(phone);
        if (!challenge || challenge.tokenHash || challenge.expires <= Date.now() || challenge.attempts >= 5) {
            if (challenge && !challenge.tokenHash)
                this.challenges.delete(phone);
            throw new common_1.UnauthorizedException("Code expired or unavailable. Request a new verification code.");
        }
        challenge.attempts += 1;
        if (!/^\d{6}$/.test(otp) || challenge.hash !== digest(otp))
            throw new common_1.UnauthorizedException("Verification code is incorrect.");
        const verificationToken = (0, node_crypto_1.randomBytes)(32).toString("hex");
        challenge.tokenHash = digest(verificationToken);
        challenge.expires = Date.now() + 15 * 60000;
        challenge.hash = "";
        return { verificationToken };
    }
    consume(phone, token) {
        const challenge = this.challenges.get(phone);
        if (!challenge?.tokenHash || challenge.expires <= Date.now() || challenge.tokenHash !== digest(token)) {
            throw new common_1.UnauthorizedException("Phone verification expired. Verify your phone number again.");
        }
        this.challenges.delete(phone);
    }
}
exports.RegistrationVerification = RegistrationVerification;
//# sourceMappingURL=registration-verification.js.map