const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
require('reflect-metadata');
const { FeaturesService } = require('../dist/features/features');
const { uploadedDesignFile } = require('../dist/features/design-files');

test('design file lifecycle and existing orphan cleanup', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rengas-design-'));
  const oldDir = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = dir;
  let record = { id: 1, topBannerUrl: '/uploads/100-1.jpg', productPhotoUrl: '', footerImageUrl: '' };
  let products = [];
  let failSave = false;
  const service = new FeaturesService({ create: x => x, save: async x => x },
    { find: async () => products },
    { findOneBy: async () => ({ ...record }), find: async () => [record], upsert: async body => {
      if (failSave) throw new Error('database unavailable');
      record = { ...record, ...body };
    } });
  const put = name => fs.writeFile(path.join(dir, name), 'test');
  const exists = async name => { try { await fs.access(path.join(dir, name)); return true; } catch { return false; } };
  try {
    await put('100-1.jpg');
    failSave = true;
    await assert.rejects(service.saveDesign({ topBannerUrl: '' }));
    assert.equal(await exists('100-1.jpg'), true);
    failSave = false;
    await put('100-2.jpg');
    await service.saveDesign({ topBannerUrl: '/uploads/100-2.jpg' });
    assert.equal(await exists('100-1.jpg'), false);
    assert.equal(await exists('100-2.jpg'), true);
    products = [{ imageUrl: 'https://rengatrading.in/uploads/100-2.jpg' }];
    await service.saveDesign({ topBannerUrl: '' });
    assert.equal(await exists('100-2.jpg'), true);
    products = [];
    record.footerImageUrl = '/uploads/100-2.jpg';
    assert.equal(await service.removeUnusedDesignFile('/uploads/100-2.jpg'), false);
    record.footerImageUrl = '';
    assert.equal(await service.removeUnusedDesignFile('/uploads/100-2.jpg', true), true);
    assert.equal(await exists('100-2.jpg'), true);
    await service.removeUnusedDesignFile('/uploads/100-2.jpg');
    assert.equal(await exists('100-2.jpg'), false);
    // A missing old file is harmless.
    await service.removeUnusedDesignFile('/uploads/100-2.jpg');
    await put('100-3.jpg');
    record.topBannerUrl = '/uploads/100-3.jpg';
    await service.saveDesign({ topBannerUrl: '' });
    assert.equal(await exists('100-3.jpg'), false);
    await put('100-4.jpg'); await put('100-5.jpg');
    record.topBannerUrl = '/uploads/100-4.jpg'; record.productPhotoUrl = '/uploads/100-5.jpg';
    await service.saveDesign({ topBannerUrl: '', productPhotoUrl: '' });
    assert.equal(await exists('100-4.jpg'), false);
    assert.equal(await exists('100-5.jpg'), false);
    assert.equal(record.topBannerUrl, ''); assert.equal(record.productPhotoUrl, '');
  } finally {
    if (oldDir === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = oldDir;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('cleanup only accepts uploader-generated filenames at upload root', () => {
  for (const value of ['/uploads/../secret.jpg', '/uploads/products/100-1.jpg', 'https://example.com/uploads/100-1.jpg', '/uploads/logo.jpg', '/uploads/100-1.jpg/extra']) {
    assert.equal(uploadedDesignFile(value), null);
  }
  assert.equal(uploadedDesignFile('/uploads/100-1.jpg'), '100-1.jpg');
});


 test('shared image aliases retain the file despite letter case, encoding or URL query', async () => {
  const service = new FeaturesService({}, {find: async()=>[{imageUrl:'https://rengatrading.in/UPLOADS/%31%30%30-2.JPG?v=3'}]}, {find: async()=>[]});
  assert.equal(await service.removeUnusedDesignFile('/uploads/100-2.jpg',true),false);
 });
