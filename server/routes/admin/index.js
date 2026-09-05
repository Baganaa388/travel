/* Admin API-г нэгтгэнэ. /login-ээс бусад бүх зам нэвтрэлт + CSRF шаардана. */
import { Router } from 'express';
import { requireAuth, requireCsrf } from '../../middleware/auth.js';
import { adminWriteLimiter } from '../../middleware/security.js';
import auth from './auth.js';
import stats from './stats.js';
import tours from './tours.js';
import gallery from './gallery.js';
import settings from './settings.js';
import upload from './upload.js';

const router = Router();

// Нэвтрэлт (login нь нээлттэй, бусад нь дотроо хамгаалагдсан)
router.use(auth);

// Эндээс цааш бүгд хамгаалагдсан
router.use(requireAuth, requireCsrf, adminWriteLimiter);
router.use(stats);
router.use(tours);
router.use(gallery);
router.use(settings);
router.use(upload);

export default router;
