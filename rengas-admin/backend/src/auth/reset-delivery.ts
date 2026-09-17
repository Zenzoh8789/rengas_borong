import { ServiceUnavailableException } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { deliverResetOtp, resetSmsMode } from "./reset-sms";

export type ResetDelivery = "email" | "sms" | "development";
export function isResetTestAccount(phoneNumber: string): boolean {
  if (process.env.PASSWORD_RESET_TEST_MODE !== "true") return false;
  const phone = phoneNumber.replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(phone)) return false;
  return (process.env.PASSWORD_RESET_TEST_PHONES || "").split(",")
    .map(value => value.trim())
    .filter(value => /^\+?[0-9 ()-]{8,40}$/.test(value))
    .some(value => value.replace(/\D/g, "") === phone);
}

export function resetDeliveryMode(phoneNumber = ""): ResetDelivery {
  if (isResetTestAccount(phoneNumber)) return "development";
  const provider = process.env.PASSWORD_RESET_DELIVERY?.trim() || "email";
  if (provider === "sms") return resetSmsMode() === "development" ? "development" : "sms";
  if (provider !== "email") throw new ServiceUnavailableException("Password recovery is not configured. Please contact the store.");
  const configured = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"].every(name => process.env[name]?.trim());
  if (configured) {
    if (![465, 587].includes(Number(process.env.SMTP_PORT || "465"))) throw new ServiceUnavailableException("Password recovery email configuration is invalid. Please contact the store.");
    return "email";
  }
  if (process.env.NODE_ENV === "development") return "development";
  throw new ServiceUnavailableException("Password recovery email is not configured. Please contact the store.");
}
export async function deliverPasswordReset(
  mode: ResetDelivery, phoneNumber: string, email: string | null | undefined, otp: string,
): Promise<{ delivery: ResetDelivery; developmentOtp?: string }> {
  if (mode === "development") {
    if (process.env.NODE_ENV !== "development" && !isResetTestAccount(phoneNumber)) throw new ServiceUnavailableException("Test codes are disabled.");
    return { delivery: mode, developmentOtp: otp };
  }
  if (mode === "sms") {
    await deliverResetOtp(phoneNumber, otp);
    return { delivery: mode };
  }
  if (!email || !/^[^\s@,;<>\r\n]+@[^\s@,;<>\r\n]+\.[^\s@,;<>\r\n]+$/.test(email)) {
    throw new ServiceUnavailableException("A registered email address is required.");
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
      from: { name: "RENGAS BORONG", address: process.env.SMTP_FROM! },
      to: { address: email, name: "" },
      subject: "Your RENGAS BORONG password reset code",
      text: "Your password reset code is: " + otp + "\n\nIt expires in 5 minutes. Do not share this code.\nIf you did not request a password reset, ignore this email.",
    });
    if (!result.accepted?.length || result.rejected?.length) throw new Error("Email not accepted");
  } catch {
    throw new ServiceUnavailableException("Unable to send the reset email. Please try again later or contact the store.");
  } finally { transport.close(); }
  return { delivery: mode };
}
