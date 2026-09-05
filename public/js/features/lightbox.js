/* ==========================================================================
   lightbox.js — зураг томруулж харах. Гар, товчлуур, шүргэлтээр удирдана.
   Бичвэрийг зөвхөн textContent-ээр тавина (XSS-ээс сэргийлнэ).
   ========================================================================== */
import { pick, onLang } from '../core/i18n.js';

let el = null;
let list = [];
let idx = 0;
let lastFocus = null;

function build() {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'lb';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <button class="lb-close" type="button" aria-label="Хаах">&times;</button>
    <button class="lb-prev" type="button" aria-label="Өмнөх">&#8249;</button>
    <button class="lb-next" type="button" aria-label="Дараах">&#8250;</button>
    <figure class="lb-fig">
      <img alt="">
      <figcaption class="lb-cap">
        <b></b><span class="credit"></span><p></p>
      </figcaption>
    </figure>
    <div class="lb-count"></div>`;
  document.body.appendChild(el);

  el.querySelector('.lb-close').addEventListener('click', close);
  el.querySelector('.lb-prev').addEventListener('click', () => step(-1));
  el.querySelector('.lb-next').addEventListener('click', () => step(1));
  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!el.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  // Шүргэлтээр гүйлгэх
  let x0 = null;
  el.addEventListener('touchstart', (e) => {
    x0 = e.changedTouches[0].clientX;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 55) step(dx > 0 ? -1 : 1);
    x0 = null;
  }, { passive: true });

  onLang(() => {
    if (el.classList.contains('open')) render();
  });
  return el;
}

function render() {
  const p = list[idx];
  if (!p) return;
  const img = el.querySelector('img');
  img.src = p.image;
  img.alt = pick(p.place) || 'Монголын гэрэл зураг';
  el.querySelector('.lb-cap b').textContent = pick(p.place);
  el.querySelector('.lb-cap p').textContent = pick(p.caption);
  el.querySelector('.lb-cap .credit').textContent = p.credit || '';
  el.querySelector('.lb-count').textContent = `${idx + 1} / ${list.length}`;
  const many = list.length > 1;
  el.querySelector('.lb-prev').hidden = !many;
  el.querySelector('.lb-next').hidden = !many;
}

function step(d) {
  if (!list.length) return;
  idx = (idx + d + list.length) % list.length;
  render();
}

export function close() {
  if (!el) return;
  el.classList.remove('open');
  document.body.classList.remove('lb-open');
  lastFocus?.focus?.();
}

/** Нээх. photos — {image, place, caption, credit} массив. */
export function open(photos, startIndex = 0) {
  build();
  list = photos || [];
  idx = Math.max(0, Math.min(startIndex, list.length - 1));
  lastFocus = document.activeElement;
  render();
  el.classList.add('open');
  document.body.classList.add('lb-open');
  el.querySelector('.lb-close').focus();
}
