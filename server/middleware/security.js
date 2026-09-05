/* Helmet + CSP + rate limit. Inline <script> хэрэглэхгүй тул script-src нь 'self'. */
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        // Google Fonts stylesheet + локал CSS
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        // CSS custom property-г style attribute-аар өгдөг (ж: style="--v:80%")
        styleSrcAttr: ["'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

const limiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Тестийн үед хязгаарыг алгасна (олон нэвтрэлт хийдэг)
    skip: () => process.env.NODE_ENV === 'test',
    handler: (req, res) => res.status(429).json({ error: message }),
  });

/** Нийтийн API — уншилтад чөлөөтэй. */
export const publicLimiter = limiter(60_000, 240, 'Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу.');

/** Чат бичих — spam-аас хамгаална. */
export const chatLimiter = limiter(60_000, 20, 'Хэт олон мессеж. Минут хүлээгээд дахин илгээнэ үү.');

/** Нэвтрэх — brute force-оос хамгаална. */
export const loginLimiter = limiter(15 * 60_000, 10, 'Хэт олон оролдлого. 15 минутын дараа дахин оролдоно уу.');

/** Admin бичих үйлдэл. */
export const adminWriteLimiter = limiter(60_000, 120, 'Хэт олон хүсэлт.');
