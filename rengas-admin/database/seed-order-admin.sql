USE rengas_admin;

INSERT INTO users (username, password_hash, role)
VALUES (
  'orderadmin',
  '$2b$12$Hr5jDsLXuBfVlqnvKG5eJOvciM0kHQyC.zurbYT.nx5ICEhXDMr3e',
  'ORDER_ADMIN'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role);
