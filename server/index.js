import 'dotenv/config';
import { createApp } from './app.js';
import { purgeExpired } from './lib/session.js';

const PORT = Number(process.env.PORT || 8000);

if (process.env.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET) {
    console.warn('[анхаар] SESSION_SECRET тохируулаагүй байна.');
  }
  if (process.env.COOKIE_SECURE !== '1') {
    console.warn('[анхаар] Production-д COOKIE_SECURE=1 байх ёстой.');
  }
}

purgeExpired();
setInterval(purgeExpired, 60 * 60 * 1000).unref();

const app = createApp();
app.listen(PORT, () => {
  console.log(`\n  Dream Spark Travel`);
  console.log(`  Сайт   → http://localhost:${PORT}`);
  console.log(`  Admin  → http://localhost:${PORT}/admin`);
  console.log('');
});
