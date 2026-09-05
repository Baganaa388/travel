/* Бидний тухай — аяллын картуудыг API-аас дүүргэнэ. */
import { getTours } from '../core/api.js';
import { onLang } from '../core/i18n.js';
import { boot, reveal } from '../core/ui.js';
import { poster } from './tour-common.js';

(async () => {
  await boot();

  const grid = document.querySelector('#tourGrid');
  if (grid) {
    try {
      const tours = await getTours();
      onLang((lang) => {
        grid.replaceChildren(...tours.map((t) => poster(t, lang)));
      });
    } catch {
      const p = document.createElement('p');
      p.className = 'state';
      p.textContent = 'Аяллуудыг ачаалж чадсангүй';
      grid.replaceChildren(p);
    }
  }

  reveal();
})();
