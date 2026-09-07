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

  if (document.body.classList.contains('hd-over')) {
    const onScroll = () =>
      document.body.classList.toggle('hd-solid', window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
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
  if (has(s.brand))
    for (const el of document.querySelectorAll('[data-c="brand"]')) el.textContent = s.brand;

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
  setText(document.querySelector('[data-t="hero.button"]'), hero.button);
  setText(document.querySelector('[data-t="galleryTitle"]'), s.galleryTitle);

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
  setText(document.querySelector('[data-t="ft.company"]'), f.company);
  setText(document.querySelector('[data-t="ft.company2"]'), f.company);
  setText(document.querySelector('[data-t="ft.address"]'), f.address);

  const plain = { ceo: f.ceo, regNo: f.regNo, phone: f.phone, email: f.email };
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

/* ---- Эхлүүлэх ----------------------------------------------------------- */
export async function boot() {
  initLang();
  header();
  reveal();
  const s = await loadSettings();
  fillSite(s.site);
  fillFooter(s.footer);
  refresh();
  onLang(() => {
    document.title = document.querySelector('[data-title]')?.textContent || document.title;
  });
  return s;
}

export { pick };
