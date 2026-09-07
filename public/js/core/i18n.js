/* ==========================================================================
   i18n.js — KR (анхдагч) / EN
   Статик бичвэр: элемент дээр data-en="…" (KR нь DOM-ийн анхны утга).
   Динамик бичвэр: API-аас {kr,en} ирнэ → pick() ашиглана.
   Хэл солиход `langchange` event цацна.
   ========================================================================== */

const LANGS = ['kr', 'en'];
const KEY = 'ds_lang';
const HTML_LANG = { kr: 'ko', en: 'en' };

let current = 'kr';

/** Хадгалсан сонголт байвал түүнийг, үгүй бол солонгос. */
function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* localStorage хаалттай байж болно */
  }
  return 'kr';
}

let nodes = [];
let phNodes = [];

function collect() {
  nodes = Array.from(document.querySelectorAll('[data-en]'));
  phNodes = Array.from(document.querySelectorAll('[data-en-ph]'));
  for (const el of nodes) {
    if (!el._kr) el._kr = Array.from(el.childNodes).map((n) => n.cloneNode(true));
  }
  for (const el of phNodes) {
    if (el._krPh === undefined) el._krPh = el.getAttribute('placeholder') || '';
  }
}

/** Зөвхөн ӨӨРСДИЙН бичсэн статик attribute-д ашиглана (хэрэглэгчийн оролт биш). */
function frag(html) {
  return document.createRange().createContextualFragment(html);
}

function paint(lang) {
  for (const el of nodes) {
    if (lang === 'kr') {
      el.replaceChildren(...el._kr.map((n) => n.cloneNode(true)));
    } else {
      const v = el.getAttribute(`data-${lang}`);
      if (v != null) el.replaceChildren(frag(v));
    }
  }
  for (const el of phNodes) {
    if (lang === 'kr') el.setAttribute('placeholder', el._krPh);
    else {
      const v = el.getAttribute(`data-${lang}-ph`);
      if (v != null) el.setAttribute('placeholder', v);
    }
  }
  document.documentElement.setAttribute('lang', HTML_LANG[lang]);
  for (const b of document.querySelectorAll('.lang button[data-lang]')) {
    const on = b.getAttribute('data-lang') === lang;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

export function getLang() {
  return current;
}

/** API-аас ирсэн {kr,en} объектоос идэвхтэй хэлийг сонгоно. */
export function pick(obj, lang = current) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.kr || obj.en || '';
}

export function setLang(lang, { silent = false } = {}) {
  if (!LANGS.includes(lang)) lang = 'kr';
  current = lang;
  collect();
  paint(lang);
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* алгасна */
  }
  if (!silent) window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

/** Хэл солигдоход дуудагдана. Дуудахад нэг удаа шууд ажиллана. */
export function onLang(fn) {
  fn(current);
  window.addEventListener('langchange', () => fn(current));
}

/** Шинээр DOM нэмсний дараа орчуулгыг дахин хэрэглэнэ. */
export function refresh() {
  collect();
  paint(current);
}

export function initLang() {
  current = detect();
  collect();
  paint(current);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang button[data-lang]');
    if (btn) setLang(btn.getAttribute('data-lang'));
  });
}
