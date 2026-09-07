/* home.js — нүүр хуудас: зураг + хөл. Гүйлгэхэд нүүрний зураг зөөлөн хоцорч хөдөлнө. */
import { boot } from '../core/ui.js';

boot();

const img = document.querySelector('.hero-img img');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (img && !reduce) {
  let ticking = false;
  const move = () => {
    img.style.setProperty('--py', `${Math.min(window.scrollY, window.innerHeight) * 0.28}px`);
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(move);
      }
    },
    { passive: true }
  );
}
