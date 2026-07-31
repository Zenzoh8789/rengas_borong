USE rengas_admin;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  type ENUM('INFO','SUCCESS','WARNING') DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO design_settings(id) VALUES (1);
INSERT IGNORE INTO categories(name) VALUES ('OTHERS'),('FRONTEND'),('BACKEND');

-- Bulk product ZIP images use the existing products.image_url column.
-- Increase its size safely for longer hosted or generated image URLs.
ALTER TABLE products MODIFY image_url VARCHAR(1000) NULL;
