const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
require('reflect-metadata');
const { ValidationPipe } = require('@nestjs/common');
const { UpdateDesignDto } = require('../dist/features/design.dto');
const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/api/design-settings.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const context = { exports: {} };
vm.runInNewContext(output.outputText, context);
const project = value => JSON.parse(JSON.stringify(context.exports.designImages(value)));
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true, transform: true, stopAtFirstError: true });
const validate = value => pipe.transform(value, { type: 'body', metatype: UpdateDesignDto });

test('loaded record reproduces rejection; projected save passes strict API validation', async () => {
  const record = { id: 1, topBannerUrl: '/uploads/banner.png', productPhotoUrl: '/uploads/product.webp', footerImageUrl: null, updatedAt: '2026-09-15T10:00:00Z' };
  await assert.rejects(validate(record), error => error.getStatus() === 400 && error.getResponse().message.includes('property id should not exist'));
  const payload = project(record);
  assert.deepEqual(payload, { topBannerUrl: record.topBannerUrl, productPhotoUrl: record.productPhotoUrl });
  await validate(payload);
});

test('new, replaced and removed images pass validation', async () => {
  for (const record of [null, { topBannerUrl: null, productPhotoUrl: null }, { topBannerUrl: 'https://example.com/banner.jpg', productPhotoUrl: '/uploads/new.png' }, { topBannerUrl: '', productPhotoUrl: '/uploads/keep.png' }, { topBannerUrl: '', productPhotoUrl: '' }]) {
    await validate(project(record));
  }
  assert.deepEqual(project(null), { topBannerUrl: '', productPhotoUrl: '' });
});

test('invalid image paths remain rejected', async () => {
  await assert.rejects(validate(project({ topBannerUrl: 'javascript:alert(1)' })), error => error.getStatus() === 400);
});
