const {test} = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const {resetDeliveryMode, deliverPasswordReset, isResetTestAccount} = require("../dist/auth/reset-delivery");
const {AuthService} = require("../dist/auth/auth");

test("live demo reset requires explicit enablement and a matching test phone", async () => {
  const names=["NODE_ENV","PASSWORD_RESET_TEST_MODE","PASSWORD_RESET_TEST_PHONES","PASSWORD_RESET_DELIVERY","SMTP_HOST","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"];
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try {
    for(const name of names) delete process.env[name];
    process.env.NODE_ENV="production";
    process.env.PASSWORD_RESET_TEST_PHONES="60123456789";
    assert.equal(isResetTestAccount("60123456789"),false);
    process.env.PASSWORD_RESET_TEST_MODE="true";
    assert.equal(isResetTestAccount("+60 123456789"),true);
    assert.equal(isResetTestAccount("60123456788"),false);
    assert.equal(resetDeliveryMode("60123456789"),"development");
    assert.throws(()=>resetDeliveryMode("60123456788"),/not configured/);
    await assert.rejects(deliverPasswordReset("development","60123456788",null,"123456"),/Test codes are disabled/);

    const row={id:1,phoneNumber:"60123456789",email:null,passwordHash:bcrypt.hashSync("OldPassword1",4)};
    const repo={
      createQueryBuilder() {
        let params;
        return {addSelect(){return this;},where(sql,p){params=p;return this;},
          async getOne(){return (params.tokenHash ? row.resetTokenHash===params.tokenHash : row.phoneNumber===params.phoneNumber) ? {...row}:null;}};
      },
      async save(value){Object.assign(row,value);return value;},
      async update(criteria,value){if(criteria.resetTokenHash!==row.resetTokenHash)return {affected:0};Object.assign(row,value);return {affected:1};},
    };
    const auth=new AuthService({},repo,{signAsync:async()=>"session"});
    const result=await auth.requestCustomerPasswordReset("+60 123456789");
    assert.match(result.developmentOtp,/^\d{6}$/);
    assert.equal(result.delivery,"development");
    const {resetToken}=await auth.verifyCustomerPasswordResetOtp(row.phoneNumber,result.developmentOtp);
    await auth.resetCustomerPassword(resetToken,"NewPassword2");
    assert.equal((await auth.customerPasswordLogin(row.phoneNumber,"NewPassword2")).accessToken,"session");
    await assert.rejects(auth.customerPasswordLogin(row.phoneNumber,"OldPassword1"));
    await assert.rejects(auth.resetCustomerPassword(resetToken,"AnotherPassword3"));
    process.env.PASSWORD_RESET_TEST_PHONES="*";
    assert.equal(isResetTestAccount(row.phoneNumber),false);
    process.env.PASSWORD_RESET_TEST_PHONES="";
    assert.equal(isResetTestAccount(row.phoneNumber),false);
    process.env.PASSWORD_RESET_TEST_PHONES=row.phoneNumber;
    process.env.PASSWORD_RESET_TEST_MODE="false";
    assert.throws(()=>resetDeliveryMode(row.phoneNumber),/not configured/);
  } finally {
    for(const name of names) {
      if(previous[name]===undefined)delete process.env[name];
      else process.env[name]=previous[name];
    }
  }
});
