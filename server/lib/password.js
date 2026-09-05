/* scrypt — гадаад сангүй нууц үгийн hash. Формат: scrypt$N$r$p$salt$hash */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384;
const r = 8;
const p = 1;
const KEYLEN = 64;

export function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(plain), salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, sN, sr, sp, saltHex, hashHex] = parts;
  let expected;
  try {
    expected = Buffer.from(hashHex, 'hex');
    const salt = Buffer.from(saltHex, 'hex');
    const actual = scryptSync(String(plain), salt, expected.length, {
      N: Number(sN),
      r: Number(sr),
      p: Number(sp),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
