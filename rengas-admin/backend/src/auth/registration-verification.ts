import { BadRequestException, UnauthorizedException, ServiceUnavailableException } from "@nestjs/common";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { deliverResetOtp } from "./reset-sms";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
type Challenge = { hash: string; expires: number; sent: number; attempts: number; tokenHash?: string };

// Temporary verification only: no customer is created until the full form is submitted.
// Single-process store; challenges expire and must be requested again after a restart.
export class RegistrationVerification {
  private readonly challenges = new Map<string, Challenge>();

  async send(phone: string) {
    if (!/^[1-9]\d{7,14}$/.test(phone)) throw new BadRequestException("Enter a valid international phone number.");
    const now = Date.now();
    for (const [key, entry] of this.challenges) if (entry.expires <= now) this.challenges.delete(key);
    if (this.challenges.get(phone) && now - this.challenges.get(phone)!.sent < 60000) {
      throw new BadRequestException("Please wait one minute before requesting another code.");
    }
    if (this.challenges.size >= 10000) throw new ServiceUnavailableException("Please try again shortly.");
    const otp = String(randomInt(100000, 1000000));
    const challenge: Challenge = { hash: digest(otp), expires: now + 5 * 60000, sent: now, attempts: 0 };
    this.challenges.set(phone, challenge);
    try {
      const delivery = await deliverResetOtp(phone, otp, "registration");
      return {
        message: delivery.developmentOtp ? "Local test mode: no SMS was sent. Use the test code below." : "Verification code sent by SMS.",
        delivery: delivery.developmentOtp ? "development" : "sms",
        ...delivery,
      };
    } catch (error) {
      if (this.challenges.get(phone) === challenge) this.challenges.delete(phone);
      throw error;
    }
  }

  verify(phone: string, otp: string) {
    const challenge = this.challenges.get(phone);
    if (!challenge || challenge.tokenHash || challenge.expires <= Date.now() || challenge.attempts >= 5) {
      if (challenge && !challenge.tokenHash) this.challenges.delete(phone);
      throw new UnauthorizedException("Code expired or unavailable. Request a new verification code.");
    }
    challenge.attempts += 1;
    if (!/^\d{6}$/.test(otp) || challenge.hash !== digest(otp)) throw new UnauthorizedException("Verification code is incorrect.");
    const verificationToken = randomBytes(32).toString("hex");
    challenge.tokenHash = digest(verificationToken);
    challenge.expires = Date.now() + 15 * 60000;
    challenge.hash = "";
    return { verificationToken };
  }

  consume(phone: string, token: string) {
    const challenge = this.challenges.get(phone);
    if (!challenge?.tokenHash || challenge.expires <= Date.now() || challenge.tokenHash !== digest(token)) {
      throw new UnauthorizedException("Phone verification expired. Verify your phone number again.");
    }
    this.challenges.delete(phone);
  }
}
