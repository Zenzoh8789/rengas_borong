const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
require('reflect-metadata');
const { CrudService } = require('../dist/products/crud');
const { FeaturesService } = require('../dist/features/features');

test('Edit Product saves replacement before deleting old uploads and preserves shared files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rengas-product-'));
  const previousDir = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = dir;
  let record = { id: 1, code: 'P', description: 'Product', imageUrl: '/uploads/100-1.jpg' };
  let otherProducts = [];
  let design = {};
  let fail = false;
  const repo = { findOneByOrFail: async () => ({ ...record }), find: async () => [record, ...otherProducts], save: async value => {
    if (fail) throw new Error('save failed'); record = { ...value }; return record;
  } };
  const notifications = { create: x => x, save: async x => x };
  const features = new FeaturesService(notifications, repo, { find: async () => [design] });
  const service = new CrudService(repo, { findOneByOrFail: async () => ({ id: 1 }) }, {}, {}, {}, notifications, features);
  const save = imageUrl => service.updateProduct(1, { code: 'P', description: 'Product', categoryId: 1, uom: 'BOX', price: 1, imageUrl });
  const exists = async file => { try { await fs.access(path.join(dir, file)); return true; } catch { return false; } };
  try {
    await fs.mkdir(path.join(dir, 'products'));
    for (const file of ['100-1.jpg', '100-2.jpg', 'products/P-100-1.png']) await fs.writeFile(path.join(dir, file), 'image');
    fail = true;
    await assert.rejects(save('/uploads/100-2.jpg'));
    assert.equal(await exists('100-1.jpg'), true);
    fail = false;
    await save('/uploads/100-2.jpg');
    assert.equal(record.imageUrl, '/uploads/100-2.jpg');
    assert.equal(await exists('100-1.jpg'), false);
    assert.equal(await exists('100-2.jpg'), true);
    otherProducts = [{ imageUrl: '/uploads/100-2.jpg' }];
    await save('/uploads/products/P-100-1.png');
    assert.equal(await exists('100-2.jpg'), true);
    await save('/uploads/100-2.jpg');
    assert.equal(await exists('products/P-100-1.png'), false);
    otherProducts = [];
    design = { topBannerUrl: '/uploads/100-2.jpg' };
    await save(null);
    assert.equal(await exists('100-2.jpg'), true);
  } finally {
    if (previousDir === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = previousDir;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
