-- Select your application database in phpMyAdmin first.
-- Safe to rerun: adds missing reset columns only; preserves existing data.
SELECT DATABASE() AS selected_database;

SET @reset_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'reset_otp_hash') = 0, 'ALTER TABLE customers ADD COLUMN reset_otp_hash VARCHAR(255) NULL', 'SELECT 1');
PREPARE reset_stmt FROM @reset_ddl;
EXECUTE reset_stmt;
DEALLOCATE PREPARE reset_stmt;

SET @reset_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'reset_otp_expires_at') = 0, 'ALTER TABLE customers ADD COLUMN reset_otp_expires_at DATETIME NULL', 'SELECT 1');
PREPARE reset_stmt FROM @reset_ddl;
EXECUTE reset_stmt;
DEALLOCATE PREPARE reset_stmt;

SET @reset_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'reset_otp_attempts') = 0, 'ALTER TABLE customers ADD COLUMN reset_otp_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE reset_stmt FROM @reset_ddl;
EXECUTE reset_stmt;
DEALLOCATE PREPARE reset_stmt;

SET @reset_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'reset_token_hash') = 0, 'ALTER TABLE customers ADD COLUMN reset_token_hash VARCHAR(64) NULL', 'SELECT 1');
PREPARE reset_stmt FROM @reset_ddl;
EXECUTE reset_stmt;
DEALLOCATE PREPARE reset_stmt;

SET @reset_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'reset_token_expires_at') = 0, 'ALTER TABLE customers ADD COLUMN reset_token_expires_at DATETIME NULL', 'SELECT 1');
PREPARE reset_stmt FROM @reset_ddl;
EXECUTE reset_stmt;
DEALLOCATE PREPARE reset_stmt;

SET @reset_ddl = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND INDEX_NAME = 'idx_customers_reset_token_hash') = 0, 'CREATE INDEX idx_customers_reset_token_hash ON customers (reset_token_hash)', 'SELECT 1');
PREPARE reset_stmt FROM @reset_ddl;
EXECUTE reset_stmt;
DEALLOCATE PREPARE reset_stmt;

SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME IN ('reset_otp_hash','reset_otp_expires_at','reset_otp_attempts','reset_token_hash','reset_token_expires_at');
