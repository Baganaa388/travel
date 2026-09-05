/* ============================================================================
   images.mjs — зургийн хэмжээг тохируулна.
     · public/images/gallery/*.jpg  → дээд тал нь 1400px, q72 (lightbox, нүүрний зураг)
     · public/images/gallery/thumbs → 560px жижиг хувилбар (тор, овоолго, эхний зураг)
     · public/images/tours/*.jpg    → дээд тал нь 1400px, q74 (дэлгэрэнгүйн толгой)
     · public/images/tours/thumbs   → 800px (карт, жагсаалт)
   Ажиллуулах:  node scripts/images.mjs
   ============================================================================ */
import sharp from 'sharp';
import { readdir, mkdir, stat, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GALLERY = path.join(ROOT, 'public', 'images', 'gallery');
const THUMBS = path.join(GALLERY, 'thumbs');
const TOURS = path.join(ROOT, 'public', 'images', 'tours');
const TOUR_THUMBS = path.join(TOURS, 'thumbs');

const isJpg = (f) => /\.(jpe?g|png)$/i.test(f);
const kb = (n) => `${Math.round(n / 1024)} kB`;

async function shrink(dir, { width, quality, label }) {
  let saved = 0;
  let count = 0;
  for (const file of (await readdir(dir)).filter(isJpg)) {
    const src = path.join(dir, file);
    const tmp = path.join(dir, `.tmp-${file}`);
    const before = (await stat(src)).size;
    try {
      await sharp(src)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toFile(tmp);
      const after = (await stat(tmp)).size;
      if (after < before) {
        await unlink(src);
        await rename(tmp, src.replace(/\.png$/i, '.jpg'));
        saved += before - after;
      } else {
        await unlink(tmp);
      }
      count++;
    } catch (e) {
      console.error(`  ! ${file}: ${e.message}`);
      await unlink(tmp).catch(() => {});
    }
  }
  console.log(`· ${label}: ${count} файл, ${kb(saved)} хэмнэв`);
}

async function thumbs(srcDir, outDir, { width, quality, label }) {
  await mkdir(outDir, { recursive: true });
  let count = 0;
  let total = 0;
  for (const file of (await readdir(srcDir)).filter(isJpg)) {
    const out = path.join(outDir, file.replace(/.png$/i, '.jpg'));
    await sharp(path.join(srcDir, file))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toFile(out);
    total += (await stat(out)).size;
    count++;
  }
  console.log(`· ${label}: ${count} файл, нийт ${kb(total)}`);
}

console.log('Зураг боловсруулж байна…');
await shrink(GALLERY, { width: 1400, quality: 72, label: 'gallery' });
await shrink(TOURS, { width: 1400, quality: 74, label: 'tours' });
await thumbs(GALLERY, THUMBS, { width: 560, quality: 68, label: 'gallery/thumbs' });
await thumbs(TOURS, TOUR_THUMBS, { width: 800, quality: 72, label: 'tours/thumbs' });
console.log('✓ Дууслаа');
