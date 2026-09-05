/* gallery хуудасны эхлүүлэгч */
import { boot, reveal } from '../core/ui.js';
import { initGallery } from '../features/gallery.js';

(async () => {
  await boot();
  await initGallery();
  reveal();
})();
