const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function repair(env, connect = mysql.createConnection) {
  if (env.NODE_ENV !== 'development' || !['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST)) {
    throw new Error('Demo account repair requires NODE_ENV=development and a loopback DB_HOST.');
  }
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
    if (!env[key]?.trim()) throw new Error(`Missing ${key} in backend/.env`);
  }
  const db = await connect({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME, connectTimeout: 5000 });
  try {
    await db.beginTransaction();
    for (const [username, password, role] of [
      ['admin', 'admin123', 'ADMIN'], ['orderadmin', 'orderadmin123', 'ORDER_ADMIN'],
    ]) {
      const hash = await bcrypt.hash(password, 12);
      await db.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = ?, role = ?', [username, hash, role, hash, role]);
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  if (!process.argv.includes('--local-demo')) {
    console.error('This resets admin and orderadmin to the documented local demo passwords. Run npm run accounts:repair -- --local-demo for an explicitly local development database.');
    process.exitCode = 1;
  } else {
    const backend = path.resolve(__dirname, '..');
    const read = (file) => fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {};
    const env = { ...read(path.join(backend, '..', '.env')), ...read(path.join(backend, '.env')), ...process.env };
    repair(env).then(() => console.log('Local Admin and Order Admin accounts repaired. Products, customers and orders were preserved.'))
      .catch(error => { console.error('Account repair failed:', error.code || error.message); process.exitCode = 1; });
  }
}
module.exports = { repair };
