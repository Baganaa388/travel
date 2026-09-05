/* Express апп — API + цэвэр URL-тай статик хуудсууд. */
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { securityHeaders, publicLimiter } from './middleware/security.js';
import { loadSession } from './middleware/auth.js';
import { errorHandler, apiNotFound } from './middleware/error.js';
import { UPLOAD_DIR } from './routes/admin/upload.js';

import toursRoutes from './routes/tours.js';
import galleryRoutes from './routes/gallery.js';
import settingsRoutes from './routes/settings.js';
import adminRoutes from './routes/admin/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const SERVE_DIR = path.join(ROOT, process.env.SERVE_DIR || 'public');
const ADMIN_DIR = existsSync(path.join(SERVE_DIR, 'admin'))
  ? path.join(SERVE_DIR, 'admin')
  : path.join(ROOT, 'admin');

/** Нийтийн хуудасны зам → файл */
const PAGES = {
  '/': 'index.html',
  '/tours': 'tours.html',
  '/gallery': 'gallery.html',
  '/about': 'about.html',
  '/contact': 'contact.html',
};

/** Admin SPA-ийн замууд */
const ADMIN_PAGES = ['/admin', '/admin/dashboard', '/admin/tours', '/admin/gallery', '/admin/settings'];

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeaders());
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(loadSession);

  // ── API ──────────────────────────────────────────────────────────────────
  app.use('/api', publicLimiter, toursRoutes, galleryRoutes, settingsRoutes);
  app.use('/api/admin', adminRoutes);
  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use('/api', apiNotFound);

  // ── Байршуулсан зураг ────────────────────────────────────────────────────
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      maxAge: '30d',
      immutable: true,
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    })
  );

  // ── .html → цэвэр зам руу 301 ────────────────────────────────────────────
  app.get(/^\/(.+)\.html$/, (req, res, next) => {
    const name = req.params[0];
    if (name.startsWith('admin/')) return next();
    res.redirect(301, name === 'index' ? '/' : `/${name}`);
  });

  // ── Хуучин зам → шинэ зам ────────────────────────────────────────────────
  app.get('/chat', (req, res) => res.redirect(301, '/contact'));

  // ── Статик ───────────────────────────────────────────────────────────────
  app.use(
    express.static(SERVE_DIR, {
      index: false,
      extensions: false,
      dotfiles: 'ignore',
      setHeaders(res, filePath) {
        if (/\.(woff2|jpg|jpeg|png|webp|avif|svg|ico)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=2592000');
        } else if (/\.(css|js)$/i.test(filePath)) {
          res.setHeader(
            'Cache-Control',
            process.env.NODE_ENV === 'production' ? 'public, max-age=3600' : 'no-cache'
          );
        }
      },
    })
  );
  app.use('/admin', express.static(ADMIN_DIR, { index: false, extensions: false }));

  // ── Хуудсууд ─────────────────────────────────────────────────────────────
  for (const [route, file] of Object.entries(PAGES)) {
    app.get(route, (req, res) => res.sendFile(path.join(SERVE_DIR, file)));
  }
  app.get('/tour/:slug', (req, res) => res.sendFile(path.join(SERVE_DIR, 'tour.html')));

  app.get('/admin/login', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'login.html')));
  for (const route of ADMIN_PAGES) {
    app.get(route, (req, res) => res.sendFile(path.join(ADMIN_DIR, 'index.html')));
  }
  app.get('/admin/tours/:id', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'index.html')));

  // ── 404 + алдаа ──────────────────────────────────────────────────────────
  app.use((req, res) => res.status(404).sendFile(path.join(SERVE_DIR, '404.html')));
  app.use(errorHandler);

  return app;
}
