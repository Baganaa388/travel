/* ==========================================================================
   ui.js — бүх хуудсанд нийтлэг: толгой, цэс, илрэх хөдөлгөөн, холбоо барих
   ========================================================================== */
import { getSettings } from './api.js';
import { initLang, onLang, pick } from './i18n.js';

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

/** Холбоо барих сувгуудын нэр, хаяг. Хоосон талбарыг хуудаснаас хасна. */
export const CHANNELS = [
  { key: 'kakao', label: 'KakaoTalk', href: (v) => v },
  { key: 'instagram', label: 'Instagram', href: (v) => v, shown: () => '@dreamspark_travel' },
  { key: 'naver', label: 'Naver Blog', href: (v) => v, shown: () => 'blog.naver.com' },
  { key: 'phone', label: 'Утас', href: (v) => `tel:${v.replace(/\s+/g, '')}` },
  { key: 'email', label: 'И-мэйл', href: (v) => `mailto:${v}` },
];

function fillContact(settings) {
  const c = settings.contact || {};

  for (const ch of CHANNELS) {
    const value = (c[ch.key] || '').trim();
    for (const el of document.querySelectorAll(`[data-c="${ch.key}"]`)) {
      if (!value) {
        el.remove();
        continue;
      }
      el.textContent = ch.shown ? ch.shown(value) : value;
      if (el.tagName === 'A') {
        el.href = ch.href(value);
        if (/^https?:/.test(el.href)) {
          el.target = '_blank';
          el.rel = 'noopener';
        }
      }
    }
  }

  if (c.logo) {
    for (const el of document.querySelectorAll('[data-c="logo"]')) el.src = c.logo;
  }

  onLang(() => {
    for (const el of document.querySelectorAll('[data-c="address"]')) {
      el.textContent = pick(c.address);
    }
    for (const el of document.querySelectorAll('[data-c="hours"]')) {
      el.textContent = pick(c.hours);
    }
  });

  for (const el of document.querySelectorAll('[data-year]')) {
    el.textContent = String(new Date().getFullYear());
  }
}

/* ---- Эхлүүлэх ----------------------------------------------------------- */
export async function boot() {
  initLang();
  header();
  reveal();
  const s = await loadSettings();
  fillContact(s);
  return s;
}
