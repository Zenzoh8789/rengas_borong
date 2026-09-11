const assert = require('node:assert/strict');
const { test } = require('node:test');
require('reflect-metadata');
const { StoreService, StoreController } = require('../dist/store/store');

const category = { id: 1, name: 'BARBER PRODUCTS' };
const product = (id, code, description, price, extra = {}) => ({
  id, code, description, price, category, uom: 'BOX',
  imageUrl: null, catalogueEnabled: true, ...extra,
});
const serviceFor = rows => new StoreService({ find: async () => rows }, {}, {}, {});

test('separate pack sizes retain their own detail ID, SKU, price and order ID', async () => {
  const rows = [
    product(9204, 'AGW5', "AGAL VILAKU WHITE (S) 500'S", '75.00'),
    product(9203, 'AGKU001', "AGAL VILAKU WHITE (S) 800'S", '120.00'),
  ];
  const cards = await new StoreController(serviceFor(rows)).products();
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map(p => p.code), ['AGW5', 'AGKU001']);
  assert.deepEqual(cards.map(p => p.name), rows.map(p => p.description));
  assert.deepEqual(cards.map(p => p.uoms[0].price), [75, 120]);
  for (const card of cards) {
    assert.equal(card.uoms.length, 1);
    assert.equal(card.id, card.uoms[0].productId);
    assert.equal(card.id, card.uoms[0].id);
    assert.equal(card.uoms[0].name, 'BOX');
    assert.equal(card.uoms[0].pack, `BOX • ${card.code}`);
  }
});

test('identical names and prices with different SKUs remain separate', async () => {
  const cards = await serviceFor([
    product(9660, '18FRR', '18 FEET (ROSE)', 34),
    product(9661, '18RO', '18 FEET (ROSE)', 34),
  ]).listProducts();
  assert.equal(cards.length, 2);
  assert.equal(new Set(cards.map(p => p.id)).size, 2);
});

test('category counts retain all 2551 rows, including repeated names and packs', async () => {
  const totals = [34, 244, 1519, 363, 208, 116, 67];
  const names = ['BARBER PRODUCTS', 'CANNED FOOD', 'COFFEE/TEA/MALT',
    'DAIRY PRODUCTS', 'FLOUR & SUGAR', 'FRESH PRODUCE', 'HYGIENE'];
  let id = 0;
  const rows = totals.flatMap((count, index) => Array.from({ length: count }, (_, n) =>
    product(++id, `SKU-${id}`, `SAME BASE NAME ${n + 1}KG`, '12.50', {
      category: { id: index + 1, name: names[index] },
    })));
  const cards = await serviceFor(rows).listProducts();
  assert.equal(cards.length, 2551);
  assert.equal(new Set(cards.map(p => p.id)).size, 2551);
  assert.deepEqual(names.map(name => cards.filter(p => p.category.name === name).length), totals);
});

test('preserves category, per-SKU images, zero price and PDF-only inclusion behavior', async () => {
  const rows = [
    product(1, '0013', 'SAME NAME 1KG', 0, { catalogueEnabled: false, imageUrl: '/uploads/one.png' }),
    product(2, '0014', 'SAME NAME 2KG', 10, { imageUrl: null }),
  ];
  const cards = await serviceFor(rows).listProducts();
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map(p => p.imageUrl), ['/uploads/one.png', null]);
  assert.equal(cards[0].uoms[0].price, 0);
  assert.equal(cards[0].category.name, 'BARBER PRODUCTS');
  assert.deepEqual(await serviceFor([]).listProducts(), []);
});
