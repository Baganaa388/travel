/* ==========================================================================
   home.js — нүүр хуудас. Аяллын карт + Монгол улсын нутгаар цомог.
   ========================================================================== */
import { getTours } from '../core/api.js';
import { onLang } from '../core/i18n.js';
import { boot, reveal } from '../core/ui.js';
import { initGallery } from '../features/gallery.js';
import { poster } from './tour-common.js';

async function main() {
  await boot();

  const grid = document.querySelector('#tourGrid');
  if (grid) {
    try {
      const tours = await getTours();
      onLang((lang) => {
        grid.replaceChildren(...tours.slice(0, 3).map((t) => poster(t, lang)));
      });
    } catch {
      const p = document.createElement('p');
      p.className = 'state';
      p.textContent = 'Аяллуудыг ачаалж чадсангүй';
      grid.replaceChildren(p);
    }
  }

  await initGallery(document, { strip: true });
  reveal();
}

main();
