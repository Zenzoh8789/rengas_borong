const {test} = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const {resetDeliveryMode, deliverPasswordReset} = require("../dist/auth/reset-delivery");
const {AuthService} = require("../dist/auth/auth");
const bcrypt = require("bcrypt");

test("email recovery delivers only to the stored email and supports password sign-in", async () => {
  const names = ["NODE_ENV","PASSWORD_RESET_DELIVERY","SMTP_HOST","SMTP_PORT","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const original = nodemailer.createTransport;
  const sent = [];
  let fail = false;
  const row = {id: 1, phoneNumber: "9944897180", email: "customer@example.com", passwordHash: bcrypt.hashSync("OldPassword1",4)};
  const repo = {
    createQueryBuilder() {
      let params;
      return {
        addSelect() {return this;},
        where(sql, p) {params=p; return this;},
        async getOne() {return (params.tokenHash ? params.tokenHash === row.resetTokenHash : params.phoneNumber === row.phoneNumber) ? {...row} : null;},
      };
    },
    async save(value) {Object.assign(row,value);return value;},
    async update(criteria,value) {
      if (row.resetTokenHash !== criteria.resetTokenHash) return {affected:0};
      Object.assign(row,value);return {affected:1};
    },
  };
  const auth = new AuthService({}, repo, {signAsync:async()=>"session"});
  try {
    Object.assign(process.env, {NODE_ENV:"production",PASSWORD_RESET_DELIVERY:"email",SMTP_HOST:"smtp.example.com",SMTP_PORT:"465",SMTP_USER:"sender@example.com",SMTP_PASSWORD:"test-only",SMTP_FROM:"sender@example.com"});
    nodemailer.createTransport = options => {
      assert.equal(options.secure,true);
      assert.equal(options.requireTLS,true);
      assert.equal(options.auth.pass,"test-only");
      return {
        async sendMail(message) {
          if (fail) throw new Error("private provider detail");
          sent.push(message);
          return {accepted:[message.to.address],rejected:[]};
        },
        close() {},
      };
    };
    assert.equal(resetDeliveryMode(),"email");
    const response = await auth.requestCustomerPasswordReset(row.phoneNumber);
    assert.equal(response.delivery,"email");
    assert.equal(response.developmentOtp,undefined);
    assert.equal(sent[0].to.address,row.email);
    assert.equal(sent[0].from.address,"sender@example.com");
    const code = sent[0].text.match(/\b\d{6}\b/)[0];
    assert.ok(await bcrypt.compare(code,row.resetOtpHash));
    const {resetToken} = await auth.verifyCustomerPasswordResetOtp(row.phoneNumber,code);
    await auth.resetCustomerPassword(resetToken,"NewPassword2");
    assert.equal((await auth.customerPasswordLogin(row.phoneNumber,"NewPassword2")).accessToken,"session");
    await assert.rejects(auth.customerPasswordLogin(row.phoneNumber,"OldPassword1"));
    const unknown = await auth.requestCustomerPasswordReset("00000000");
    assert.equal(unknown.message,response.message);
    assert.equal(sent.length,1);
    row.email=null;
    const missing = await auth.requestCustomerPasswordReset(row.phoneNumber);
    assert.equal(missing.message,response.message);
    assert.equal(sent.length,1);
    row.email="customer@example.com";
    fail=true;
    await assert.rejects(auth.requestCustomerPasswordReset(row.phoneNumber), /Unable to send the reset email/);
    assert.equal(row.resetOtpHash,null);
    await assert.rejects(deliverPasswordReset("development",row.phoneNumber,row.email,"123456"),/Test codes are disabled/);
    delete process.env.SMTP_PASSWORD;
    assert.throws(resetDeliveryMode,/not configured/);
    process.env.NODE_ENV="development";
    assert.equal(resetDeliveryMode(),"development");
  } finally {
    nodemailer.createTransport=original;
    for (const name of names) {
      if(previous[name]===undefined) delete process.env[name];
      else process.env[name]=previous[name];
    }
  }
});
