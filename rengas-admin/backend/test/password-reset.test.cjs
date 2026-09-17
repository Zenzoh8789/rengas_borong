const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { AuthService } = require("../dist/auth/auth");
const { deliverResetOtp } = require("../dist/auth/reset-sms");

function fixture() {
  const row = { id: 1, phoneNumber: "60123456789", passwordHash: bcrypt.hashSync("OldPassword1", 4) };
  const repo = {
    createQueryBuilder() {
      let params;
      return {
        addSelect() { return this; },
        where(sql, value) { params = value; return this; },
        async getOne() {
          const matches = params.tokenHash ? row.resetTokenHash === params.tokenHash : row.phoneNumber === params.phoneNumber;
          return matches ? { ...row } : null;
        },
      };
    },
    async save(value) { Object.assign(row, value); return value; },
    async update(criteria, value) {
      if (criteria.id !== row.id || criteria.resetTokenHash !== row.resetTokenHash ||
          !row.resetTokenExpiresAt || row.resetTokenExpiresAt <= new Date()) return { affected: 0 };
      Object.assign(row, value);
      return { affected: 1 };
    },
  };
  return { row, auth: new AuthService({}, repo, { signAsync: async () => "signed-session" }) };
}

test("password reset lifecycle and SMS failure paths", async (t) => {
  const names = ["PASSWORD_RESET_DELIVERY", "NODE_ENV", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "TWILIO_MESSAGING_SERVICE_SID"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const oldFetch = global.fetch;
  for (const name of names) delete process.env[name];
  process.env.NODE_ENV = "development";
  process.env.PASSWORD_RESET_DELIVERY = "sms";
  try {
    await t.test("verified reset changes login password and rejects reused token and OTP", async () => {
      const { row, auth } = fixture();
      const { developmentOtp } = await auth.requestCustomerPasswordReset("+60 123456789");
      assert.match(developmentOtp, /^\d{6}$/);
      const { resetToken } = await auth.verifyCustomerPasswordResetOtp(row.phoneNumber, developmentOtp);
      await assert.rejects(auth.verifyCustomerPasswordResetOtp(row.phoneNumber, developmentOtp));
      await auth.resetCustomerPassword(resetToken, "NewPassword2");
      assert.equal((await auth.customerPasswordLogin(row.phoneNumber, "NewPassword2")).accessToken, "signed-session");
      await assert.rejects(auth.customerPasswordLogin(row.phoneNumber, "OldPassword1"));
      await assert.rejects(auth.resetCustomerPassword(resetToken, "AnotherPassword3"));
      assert.equal(row.resetTokenHash, null);
    });
    await t.test("wrong, expired and exhausted OTPs cannot reset the password", async () => {
      const { row, auth } = fixture();
      const { developmentOtp } = await auth.requestCustomerPasswordReset(row.phoneNumber);
      const wrong = developmentOtp === "111111" ? "222222" : "111111";
      for (let i = 0; i < 5; i++) await assert.rejects(auth.verifyCustomerPasswordResetOtp(row.phoneNumber, wrong));
      await assert.rejects(auth.verifyCustomerPasswordResetOtp(row.phoneNumber, developmentOtp), /Too many attempts/);
      const next = await auth.requestCustomerPasswordReset(row.phoneNumber);
      row.resetOtpExpiresAt = new Date(0);
      await assert.rejects(auth.verifyCustomerPasswordResetOtp(row.phoneNumber, next.developmentOtp), /expired/);
      assert.ok(await bcrypt.compare("OldPassword1", row.passwordHash));
    });
    await t.test("resend invalidates prior code; expired tokens and short passwords fail", async () => {
      const { row, auth } = fixture();
      const first = await auth.requestCustomerPasswordReset(row.phoneNumber);
      const token = await auth.verifyCustomerPasswordResetOtp(row.phoneNumber, first.developmentOtp);
      const next = await auth.requestCustomerPasswordReset(row.phoneNumber);
      await assert.rejects(auth.resetCustomerPassword(token.resetToken, "NewPassword2"));
      const nextToken = await auth.verifyCustomerPasswordResetOtp(row.phoneNumber, next.developmentOtp);
      await assert.rejects(auth.resetCustomerPassword(nextToken.resetToken, "short"));
      row.resetTokenExpiresAt = new Date(0);
      await assert.rejects(auth.resetCustomerPassword(nextToken.resetToken, "NewPassword2"), /expired/);
    });
    await t.test("concurrent submissions consume the token only once", async () => {
      const { row, auth } = fixture();
      const otp = await auth.requestCustomerPasswordReset(row.phoneNumber);
      const { resetToken } = await auth.verifyCustomerPasswordResetOtp(row.phoneNumber, otp.developmentOtp);
      const results = await Promise.allSettled([
        auth.resetCustomerPassword(resetToken, "NewPassword2"),
        auth.resetCustomerPassword(resetToken, "OtherPassword3"),
      ]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    });
    await t.test("production requires SMS configuration and never exposes the OTP", async () => {
      process.env.NODE_ENV = "production";
      const { row, auth } = fixture();
      await assert.rejects(auth.requestCustomerPasswordReset(row.phoneNumber), /currently unavailable/);
      await assert.rejects(auth.requestCustomerPasswordReset("99999999"), /currently unavailable/);
      process.env.TWILIO_ACCOUNT_SID = "ACtest";
      process.env.TWILIO_AUTH_TOKEN = "test-only";
      process.env.TWILIO_FROM_NUMBER = "+15005550006";
      global.fetch = async (url, init) => {
        assert.ok(url.startsWith("https://api.twilio.com/"));
        const body = new URLSearchParams(init.body);
        assert.equal(body.get("To"), "+" + row.phoneNumber);
        assert.match(body.get("Body"), /\d{6}/);
        return { ok: true };
      };
      const result = await auth.requestCustomerPasswordReset(row.phoneNumber);
      assert.equal(result.developmentOtp, undefined);
      global.fetch = async () => ({ ok: false });
      await assert.rejects(auth.requestCustomerPasswordReset(row.phoneNumber), /Unable to send/);
      assert.equal(row.resetOtpHash, null);
      global.fetch = async () => { throw new Error("network error"); };
      await assert.rejects(deliverResetOtp(row.phoneNumber, "123456"), /Unable to send/);
    });
  } finally {
    global.fetch = oldFetch;
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
