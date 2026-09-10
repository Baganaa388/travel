/* ==========================================================================
   ui.js — бүх хуудсанд нийтлэг: толгой, цэс, илрэх хөдөлгөөн, тохиргоо
   (лого, брэнд, цэсний нэр, нүүрний бичвэр, хөл, Instagram товч).
   Бүх бичвэрийг textContent-ээр тавина.
   ========================================================================== */
import { getSettings } from './api.js';
import { initLang, onLang, pick, refresh } from './i18n.js';

/* ---- Толгой ------------------------------------------------------------- */
function header() {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const here = location.pathname.replace(/\/$/, '') || '/';
  for (const a of document.querySelectorAll('#nav a[href]')) {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === here || (href !== '/' && here.startsWith(href))) a.classList.add('on');
  }
}

/* ---- Илрэх хөдөлгөөн ---------------------------------------------------- */
export function reveal(root = document) {
  const items = root.querySelectorAll('.rv:not(.in), .rv-stg:not(.in)');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  items.forEach((el) => io.observe(el));
}

/* ---- Тохиргоо ----------------------------------------------------------- */
let settingsCache = null;

export async function loadSettings() {
  if (!settingsCache) settingsCache = await getSettings().catch(() => ({}));
  return settingsCache;
}

const has = (v) => typeof v === 'string' && v.trim() !== '';
const hasText = (o) => o && (has(o.kr) || has(o.en));

/** data-t="hero.line1" гэх мэт элементэд {kr,en} бичвэрийг data-en attribute-аар тавина. */
function setText(el, obj, fallback = '') {
  if (!el) return;
  if (!hasText(obj)) {
    if (fallback) el.textContent = fallback;
    return;
  }
  el.textContent = obj.kr || obj.en;
  el.setAttribute('data-en', obj.en || obj.kr);
  delete el._kr;
}

function fillSite(site) {
  const s = site || {};

  if (has(s.logo)) for (const el of document.querySelectorAll('[data-c="logo"]')) el.src = s.logo;
  const brand = typeof s.brand === 'string' ? { kr: '드림스파크', en: s.brand } : s.brand;
  for (const el of document.querySelectorAll('[data-t="brand"]')) setText(el, brand);

  const nav = s.nav || {};
  for (const key of ['home', 'tours', 'gallery']) {
    for (const el of document.querySelectorAll(`[data-t="nav.${key}"]`)) setText(el, nav[key]);
  }

  const hero = s.hero || {};
  const heroImg = document.querySelector('[data-c="hero"]');
  if (heroImg && has(hero.image) && heroImg.getAttribute('src') !== hero.image)
    heroImg.src = hero.image;
  setText(document.querySelector('[data-t="hero.line1"]'), hero.line1);
  setText(document.querySelector('[data-t="hero.line2"]'), hero.line2);
  setText(document.querySelector('[data-t="hero.tagline"]'), hero.tagline);
  setText(document.querySelector('[data-t="hero.button"]'), hero.button);

  // Instagram — хөвөгч товч + хөлийн icon
  const ig = has(s.instagram) ? s.instagram : '';
  for (const el of document.querySelectorAll('[data-c="instagram"]')) {
    if (!ig) el.remove();
    else el.href = ig;
  }
  setText(document.querySelector('[data-t="instaLabel"]'), s.instaLabel);
  for (const el of document.querySelectorAll('[data-c="naver"]')) {
    if (!has(s.naver)) el.remove();
    else el.href = s.naver;
  }
}

function fillFooter(footer) {
  const f = footer || {};
  setText(document.querySelector('[data-t="ft.company2"]'), f.company);
  // Шошго (대표, 회사주소 …) — тохиргооноос, хоосон бол HTML-ийн анхны утга
  const labels = f.labels || {};
  for (const el of document.querySelectorAll('[data-l]')) setText(el, labels[el.dataset.l]);
  setText(document.querySelector('[data-t="ft.address"]'), f.address);

  const clean = (v) => (typeof v === 'string' ? v.replace(/^[\s:：]+/, '').trim() : '');
  const plain = {
    ceo: clean(f.ceo),
    regNo: clean(f.regNo),
    licenseNo: clean(f.licenseNo),
    phone: clean(f.phone),
    email: clean(f.email),
    extra: clean(f.extra),
  };
  for (const [key, value] of Object.entries(plain)) {
    const el = document.querySelector(`[data-c="ft.${key}"]`);
    if (!el) continue;
    if (!has(value)) {
      el.closest('[data-row]')?.remove() || el.remove();
      continue;
    }
    el.textContent = value;
    if (key === 'phone' && el.tagName === 'A') el.href = `tel:${value.replace(/[^\d+]/g, '')}`;
    if (key === 'email' && el.tagName === 'A') el.href = `mailto:${value}`;
  }
  if (!hasText(f.address)) document.querySelector('[data-row="address"]')?.remove();

  const year = String(new Date().getFullYear());
  const copy = document.querySelector('[data-t="ft.copyright"]');
  if (copy && hasText(f.copyright)) {
    const sub = (v) => (v || '').replace('{year}', year);
    setText(copy, { kr: sub(f.copyright.kr), en: sub(f.copyright.en) });
  }
  for (const el of document.querySelectorAll('[data-year]')) el.textContent = year;

  // Хоосон хэвээр үлдсэн мөрүүд (зөвхөн тусгаарлагч) — устгана
  for (const row of document.querySelectorAll('.ft-row')) {
    if (!row.querySelector('[data-c],[data-t]')) row.remove();
  }
}

/* ---- Хөлийг багтаах -----------------------------------------------------
   Хөлийн загвар бүх төхөөрөмж дээр яг ижил: мөр бүр нэг мөрөндөө, «|»
   тусгаарлагчтай. Өргөнд багтахгүй бол бүх мөрийг ижил хувиар жижигрүүлнэ. */
const FT_BASE = 13.333; // 10pt

const widestRow = (rows) => {
  let widest = 0;
  for (const row of rows.children) {
    let w = 0;
    for (const kid of row.children) w += kid.getBoundingClientRect().width;
    widest = Math.max(widest, Math.ceil(w), row.scrollWidth);
  }
  return widest;
};

export function fitFooter() {
  const rows = document.querySelector('.ft-rows');
  const ft = rows?.closest('.ft');
  if (!rows || !ft || !rows.children.length) return;
  const avail = rows.clientWidth;
  if (!avail) return;
  // Жижиг хэмжээнд үсгийн өргөн яг шугаман биш тул хэдэн удаа нарийвчилна.
  let size = FT_BASE;
  ft.style.setProperty('--ft-fs', `${size}px`);
  for (let i = 0; i < 4; i++) {
    const widest = widestRow(rows);
    if (widest <= avail) break;
    size = Math.max(6, (size * avail) / widest - 0.05);
    ft.style.setProperty('--ft-fs', `${size.toFixed(2)}px`);
  }
}

function watchFooter() {
  const rows = document.querySelector('.ft-rows');
  if (!rows) return;
  let queued = 0;
  const run = () => {
    queued = 0;
    fitFooter();
  };
  const soon = () => {
    if (!queued) queued = setTimeout(run, 16);
  };
  window.addEventListener('resize', soon);
  window.addEventListener('langchange', soon);
  // Үсгийн фонт сүүлд ачаалагдвал өргөн өөрчлөгддөг тул дахин хэмжинэ.
  document.fonts?.ready.then(soon).catch(() => {});
  document.fonts?.addEventListener?.('loadingdone', soon);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(soon);
    ro.observe(rows);
    for (const row of rows.children) ro.observe(row);
  }
  soon();
}

/* ---- Эхлүүлэх ----------------------------------------------------------- */
export async function boot() {
  initLang();
  header();
  reveal();
  const s = await loadSettings();
  fillSite(s.site);
  fillFooter(s.footer);
  refresh();
  watchFooter();
  onLang(() => {
    document.title = document.querySelector('[data-title]')?.textContent || document.title;
  });
  return s;
}

export { pick };
