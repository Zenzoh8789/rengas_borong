-- Run once against the rengas_admin database before starting the updated API.
-- Existing legacy statuses become ACCEPTED so no orders are lost.

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'VIEW', 'MODIFIED', 'PRINTED',
    'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED'
  ) NOT NULL DEFAULT 'ACCEPTED';

UPDATE orders
SET status = 'ACCEPTED'
WHERE status IN ('VIEW', 'MODIFIED', 'PRINTED');

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'ACCEPTED', 'PACKED', 'SHIPPED', 'DELIVERED'
  ) NOT NULL DEFAULT 'ACCEPTED';
