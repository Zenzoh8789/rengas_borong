-- Rengas Admin: customer forgot-password support.
-- Run once against the rengas_admin database before using the new endpoints.

USE rengas_admin;

ALTER TABLE customers
  ADD COLUMN reset_otp_hash VARCHAR(255) NULL,
  ADD COLUMN reset_otp_expires_at DATETIME NULL,
  ADD COLUMN reset_otp_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN reset_token_hash VARCHAR(64) NULL,
  ADD COLUMN reset_token_expires_at DATETIME NULL;

CREATE INDEX idx_customers_reset_token_hash
  ON customers (reset_token_hash);
