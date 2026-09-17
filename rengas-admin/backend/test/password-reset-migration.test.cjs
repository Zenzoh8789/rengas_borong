const { test } = require("node:test");
const assert = require("node:assert/strict");
const { columns, migrate } = require("../scripts/migrate-password-reset.cjs");

function database(initial = [], indexed = false) {
  const names = new Set(["id", ...initial]);
  let hasIndex = indexed;
  const writes = [];
  return {
    writes,
    async query(sql) {
      if (sql.includes("information_schema.COLUMNS")) return [[...names].map(name => ({ name }))];
      if (sql.includes("information_schema.STATISTICS")) return [hasIndex ? [{ name: "idx_customers_reset_token_hash" }] : []];
      writes.push(sql);
      if (sql.startsWith("ALTER TABLE")) for (const name of Object.keys(columns)) {
        if (sql.includes("ADD COLUMN " + name + " ")) {
          assert.ok(!names.has(name), "must not add existing column");
          names.add(name);
        }
      }
      if (sql.startsWith("CREATE INDEX")) { assert.equal(hasIndex, false); hasIndex = true; }
      return [{}];
    },
  };
}
test("check reports missing fields without changing the database", async () => {
  const db = database();
  const result = await migrate(db);
  assert.deepEqual(result.missingColumns, Object.keys(columns));
  assert.equal(db.writes.length, 0);
});
test("repair adds all missing columns and rerun makes no changes", async () => {
  const db = database();
  const result = await migrate(db, true);
  assert.equal(result.addedColumns.length, 5);
  assert.equal(db.writes.length, 2);
  await migrate(db, true);
  assert.equal(db.writes.length, 2);
  assert.ok(db.writes.every(sql => !/DROP|DELETE|UPDATE|TRUNCATE/.test(sql)));
});
test("partial migration preserves already present columns", async () => {
  const db = database(["reset_otp_hash", "reset_token_hash"], true);
  const result = await migrate(db, true);
  assert.equal(result.addedColumns.length, 3);
  assert.equal(db.writes.length, 1);
});
test("wrong database with no customers table fails before writing", async () => {
  await assert.rejects(migrate({ query: async () => [[]] }, true), /customers table not found/);
});
