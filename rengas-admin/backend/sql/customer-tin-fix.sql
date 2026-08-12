-- Rengas Admin: customer TIN schema check and repair
-- Run this script against the database configured by backend/.env.

SET @database_name = DATABASE();
SET @tin_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'customers'
    AND COLUMN_NAME = 'tin_number'
);

SET @add_tin_sql = IF(
  @tin_column_exists = 0,
  'ALTER TABLE customers ADD COLUMN tin_number VARCHAR(60) NULL AFTER address',
  'SELECT ''customers.tin_number already exists'' AS result'
);

PREPARE add_tin_statement FROM @add_tin_sql;
EXECUTE add_tin_statement;
DEALLOCATE PREPARE add_tin_statement;

-- Normalize empty strings so the application consistently displays missing values.
UPDATE customers
SET tin_number = NULL
WHERE TRIM(COALESCE(tin_number, '')) = '';

-- Show every customer and the exact TIN value currently stored in MySQL.
SELECT
  id,
  name,
  address,
  tin_number,
  phone_number,
  whatsapp_number
FROM customers
ORDER BY id;

-- Example for correcting one existing customer. Replace the values before running.
-- UPDATE customers SET tin_number = 'YOUR-TIN-NUMBER' WHERE id = 1;

-- Check only customers that still need a TIN.
SELECT id, name, phone_number
FROM customers
WHERE tin_number IS NULL OR TRIM(tin_number) = ''
ORDER BY id;
