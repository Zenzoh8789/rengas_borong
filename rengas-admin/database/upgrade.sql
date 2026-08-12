USE rengas_admin;

-- Create notifications table if it does not exist.
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  type ENUM(
    'INFO',
    'SUCCESS',
    'WARNING'
  ) DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure the default design settings row exists.
INSERT IGNORE INTO design_settings (id)
VALUES (1);

-- Ensure required default categories exist.
INSERT IGNORE INTO categories (name)
VALUES
  ('OTHERS'),
  ('FRONTEND'),
  ('BACKEND');

-- Allow long image paths and hosted image URLs.
ALTER TABLE products
MODIFY image_url VARCHAR(1000) NULL;

-- Convert old 127.0.0.1 image URLs into relative URLs.
UPDATE products
SET image_url = SUBSTRING(
  image_url,
  LOCATE('/uploads/', image_url)
)
WHERE image_url LIKE
  'http://127.0.0.1:%/uploads/%';

-- Convert old localhost image URLs into relative URLs.
UPDATE products
SET image_url = SUBSTRING(
  image_url,
  LOCATE('/uploads/', image_url)
)
WHERE image_url LIKE
  'http://localhost:%/uploads/%';

-- Display updated image URLs for verification.
SELECT
  id,
  code,
  description,
  image_url
FROM products
WHERE image_url IS NOT NULL
ORDER BY id
LIMIT 100;