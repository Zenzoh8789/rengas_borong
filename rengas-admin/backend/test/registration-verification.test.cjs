const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RegistrationVerification } = require('../dist/auth/registration-verification');
const { AuthService } = require('../dist/auth/auth');
test('new registration verification and rejected attempts', async () => {
  const previous = process.env.NODE_ENV;
  const saved = {};
  for (const key of ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','TWILIO_MESSAGING_SERVICE_SID']) { saved[key] = process.env[key]; delete process.env[key]; }
  process.env.NODE_ENV = 'development';
  try {
    const service = new RegistrationVerification();
    const first = await service.send('60123456789');
    assert.match(first.developmentOtp, /^\d{6}$/);
    await assert.rejects(service.send('60123456789'), /one minute/);
    assert.throws(() => service.verify('60123456789', first.developmentOtp === '111111' ? '222222' : '111111'), /incorrect/);
    const verified = service.verify('60123456789', first.developmentOtp);
    assert.throws(() => service.verify('60123456789', first.developmentOtp));
    assert.throws(() => service.consume('919999999999', verified.verificationToken));
    service.consume('60123456789', verified.verificationToken);
    assert.throws(() => service.consume('60123456789', verified.verificationToken));
    const limited = await service.send('60123456780');
    const wrong = limited.developmentOtp === '111111' ? '222222' : '111111';
    for (let i=0;i<5;i++) assert.throws(() => service.verify('60123456780',wrong));
    assert.throws(() => service.verify('60123456780',limited.developmentOtp));
    const expired = await service.send('60123456781');
    service.challenges.get('60123456781').expires = 0;
    assert.throws(() => service.verify('60123456781',expired.developmentOtp));
    const rows = [];
    const repo = { findOne: async ({where}) => rows.find(row => row.phoneNumber === where.phoneNumber) || null,
      create: row => row, save: async row => { rows.push({...row,id:1}); return {...row,id:1}; } };
    const auth = new AuthService({},repo,{});
    const code = await auth.sendRegistrationOtp('+60123456782');
    assert.equal(rows.length,0);
    const proof = auth.verifyRegistrationOtp('+60123456782',code.developmentOtp);
    const dto = {phoneNumber:'+60123456782',whatsappNumber:'+60123456782',email:'test@example.com',tinNumber:'TEST',fullName:'Test',businessName:'Test Shop',address:'Test Address',password:'TestPassword123',verificationToken:proof.verificationToken};
    const result = await auth.customerSignup(dto);
    assert.ok(result.customer.phoneVerifiedAt);
    await assert.rejects(auth.sendRegistrationOtp(dto.phoneNumber),/already registered/);
    process.env.NODE_ENV='production';
    await assert.rejects(new RegistrationVerification().send('60123456783'),/unavailable/);
  } finally {
    if(previous===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=previous;
    for (const [key,value] of Object.entries(saved)) { if(value===undefined) delete process.env[key]; else process.env[key]=value; }
  }
});
