const assert = require("node:assert/strict");
const { test } = require("node:test");
const { validateEnvironment } = require("../dist/config/env.validation");
const settings = {
  DB_HOST: "127.0.0.1",
  DB_PORT: "3307",
  DB_USER: "rengas",
  DB_PASSWORD: "root",
  DB_NAME: "rengas_admin",
  JWT_SECRET: "test-only-jwt-key-with-more-than-32-characters",
};

test("explicit development accepts default DB passwords on loopback only", () => {
  for (const DB_HOST of ["127.0.0.1", "localhost", "::1"]) {
    assert.equal(
      validateEnvironment({ ...settings, NODE_ENV: "development", DB_HOST })
        .DB_PASSWORD,
      "root",
    );
  }
});

test("production and unspecified or other modes reject default DB passwords", () => {
  for (const NODE_ENV of [
    "production",
    undefined,
    "test",
    "staging",
    "developmnt",
  ]) {
    assert.throws(
      () => validateEnvironment({ ...settings, NODE_ENV }),
      /DB_PASSWORD must not/,
    );
  }
});

test("development with a remote DB retains password validation", () => {
  for (const DB_HOST of [
    "db.example.com",
    "192.168.1.10",
    "localhost.example.com",
    "mysql",
  ]) {
    assert.throws(
      () =>
        validateEnvironment({ ...settings, NODE_ENV: "development", DB_HOST }),
      /DB_PASSWORD must not/,
    );
  }
});

test("production accepts a nondefault DB password", () => {
  assert.equal(
    validateEnvironment({
      ...settings,
      NODE_ENV: "production",
      DB_PASSWORD: "test-only-nondefault-db-value",
    }).DB_PORT,
    "3307",
  );
});

test("development still requires a nonempty password and valid port", () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...settings,
        NODE_ENV: "development",
        DB_PASSWORD: "",
      }),
    /Missing required/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...settings,
        NODE_ENV: "development",
        DB_PORT: "0",
      }),
    /DB_PORT/,
  );
});

test("JWT checks remain active in local development", () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...settings,
        NODE_ENV: "development",
        JWT_SECRET: "short",
      }),
    /at least 32/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...settings,
        NODE_ENV: "development",
        JWT_SECRET: "replace-with-at-least-32-random-characters",
      }),
    /JWT_SECRET must not/,
  );
});
