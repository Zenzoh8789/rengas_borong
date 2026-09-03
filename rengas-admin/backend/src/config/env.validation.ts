const REQUIRED_VARIABLES = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
] as const;

const UNSAFE_VALUES = new Set([
  "root",
  "password",
  "changeme",
  "dev-secret",
  "replace-with-a-strong-password",
  "replace-with-at-least-32-random-characters",
]);

export function validateEnvironment(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_VARIABLES.filter(
    (name) => typeof input[name] !== "string" || !String(input[name]).trim(),
  );

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const databasePort = Number(input.DB_PORT);
  if (!Number.isSafeInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
  }

  const databasePassword = String(input.DB_PASSWORD).trim();
  const jwtSecret = String(input.JWT_SECRET).trim();

  if (UNSAFE_VALUES.has(databasePassword.toLowerCase())) {
    throw new Error("DB_PASSWORD must not use a default or placeholder value.");
  }

  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  if (UNSAFE_VALUES.has(jwtSecret.toLowerCase())) {
    throw new Error("JWT_SECRET must not use a default or placeholder value.");
  }

  return {
    ...input,
    DB_HOST: String(input.DB_HOST).trim(),
    DB_PORT: String(databasePort),
    DB_USER: String(input.DB_USER).trim(),
    DB_PASSWORD: databasePassword,
    DB_NAME: String(input.DB_NAME).trim(),
    JWT_SECRET: jwtSecret,
  };
}
