/* Admin нууц үгийг .env-тэй тааруулна. Зөвхөн admin_users-д хүрнэ. */
import 'dotenv/config';
import { db } from './index.js';
import { hashPassword } from '../lib/password.js';

const username = (process.env.ADMIN_USERNAME || 'admin').trim();
const password = process.env.ADMIN_PASSWORD || '';

if (!password) {
  console.error('! ADMIN_PASSWORD хоосон байна. .env-д бөглөнө үү.');
  process.exit(1);
}

const hash = hashPassword(password);
const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);

if (existing) {
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  console.log(`✓ «${username}»-ийн нууц үгийг шинэчлэв (бүх сесс хаагдав)`);
} else {
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`✓ Admin «${username}» үүсгэв`);
}
