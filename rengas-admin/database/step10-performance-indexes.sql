-- Run once on an existing database. The checks make this safe to run again.
SET @schema_name = DATABASE();

SET @has_order_date_index = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'orders'
    AND index_name = 'idx_orders_order_date'
);
SET @order_date_sql = IF(
  @has_order_date_index = 0,
  'CREATE INDEX idx_orders_order_date ON orders (order_date)',
  'SELECT ''idx_orders_order_date already exists'''
);
PREPARE order_date_statement FROM @order_date_sql;
EXECUTE order_date_statement;
DEALLOCATE PREPARE order_date_statement;

SET @has_customer_date_index = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = @schema_name
    AND table_name = 'orders'
    AND index_name = 'idx_orders_customer_date'
);
SET @customer_date_sql = IF(
  @has_customer_date_index = 0,
  'CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date)',
  'SELECT ''idx_orders_customer_date already exists'''
);
PREPARE customer_date_statement FROM @customer_date_sql;
EXECUTE customer_date_statement;
DEALLOCATE PREPARE customer_date_statement;
