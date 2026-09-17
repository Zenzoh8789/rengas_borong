const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const mysql = require("mysql2/promise");

const columns = {
  reset_otp_hash: "VARCHAR(255) NULL",
  reset_otp_expires_at: "DATETIME NULL",
  reset_otp_attempts: "TINYINT UNSIGNED NOT NULL DEFAULT 0",
  reset_token_hash: "VARCHAR(64) NULL",
  reset_token_expires_at: "DATETIME NULL",
};
const indexName = "idx_customers_reset_token_hash";

function loadEnvironment() {
  const paths = [
    process.env.ENV_FILE && path.resolve(process.env.ENV_FILE),
    path.resolve("backend/.env"),
    path.resolve(".env"),
  ].filter(Boolean);
  const env = { ...process.env };
  for (const file of paths) {
    if (!fs.existsSync(file)) continue;
    for (const [name, value] of Object.entries(parseEnv(fs.readFileSync(file, "utf8")))) {
      if (env[name] === undefined) env[name] = value;
    }
  }
  return env;
}

async function inspect(db) {
  const [rows] = await db.query("SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'");
  if (!rows.length) throw new Error("customers table not found in the selected database; no changes made.");
  const existing = new Set(rows.map(row => row.name));
  const [indexes] = await db.query("SELECT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'");
  return {
    missingColumns: Object.keys(columns).filter(name => !existing.has(name)),
    missingIndex: !indexes.some(row => row.name === indexName),
  };
}

async function migrate(db, apply = false) {
  const before = await inspect(db);
  if (!apply) return before;
  // Add only absent columns. No existing column, row, or password is modified.
  if (before.missingColumns.length) {
    await db.query("ALTER TABLE customers " + before.missingColumns.map(name => "ADD COLUMN " + name + " " + columns[name]).join(", "));
  }
  if (before.missingIndex) await db.query("CREATE INDEX " + indexName + " ON customers (reset_token_hash)");
  const after = await inspect(db);
  if (after.missingColumns.length || after.missingIndex) throw new Error("Password-reset schema verification failed.");
  return { ...after, addedColumns: before.missingColumns, addedIndex: before.missingIndex };
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply && !process.argv.includes("--check")) throw new Error("Use --check to inspect or --apply to add the missing reset columns.");
  const env = loadEnvironment();
  for (const name of ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
    if (!env[name]) throw new Error("Missing " + name);
  }
  const db = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME, connectTimeout: 10000,
  });
  try {
    console.log("Password-reset schema " + (apply ? "repair" : "check") + ":", env.DB_HOST + ":" + env.DB_PORT + "/" + env.DB_NAME);
    console.log(JSON.stringify(await migrate(db, apply), null, 2));
  } finally { await db.end(); }
}
if (require.main === module) main().catch(error => {
  console.error("Schema repair failed:", error.code || error.message);
  process.exitCode = 1;
});
module.exports = { columns, migrate, loadEnvironment };
