/* ============================================================================
   build.mjs — public/ болон admin/-г dist/ рүү бэлтгэнэ.
     · CSS, JS — esbuild-ээр minify (ES module хэвээр)
     · HTML — сэтгэгдэл, илүү зайг цэвэрлэнэ
     · Зураг, фонт — хуулна
   Production:  NODE_ENV=production SERVE_DIR=dist node server/index.js
   ============================================================================ */
import { build } from 'esbuild';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');

async function walk(dir, base = dir, acc = []) {
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    if ((await stat(p)).isDirectory()) await walk(p, base, acc);
    else acc.push(path.relative(base, p).replace(/\\/g, '/'));
  }
  return acc;
}

/** HTML-ийг зөөлөн шахна — <pre>, скриптийн агуулгыг хөндөхгүй. */
function minifyHtml(src) {
  return src
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/\n\s*\n+/g, '\n')
    .replace(/^\s+/gm, '')
    .trim();
}

async function processDir(srcDir, outDir) {
  const files = await walk(srcDir);
  let css = 0;
  let js = 0;
  let html = 0;
  let copied = 0;

  for (const rel of files) {
    const from = path.join(srcDir, rel);
    const to = path.join(outDir, rel);
    await mkdir(path.dirname(to), { recursive: true });

    if (rel.endsWith('.css')) {
      const r = await build({
        entryPoints: [from],
        bundle: false,
        minify: true,
        loader: { '.css': 'css' },
        write: false,
      });
      await writeFile(to, r.outputFiles[0].text);
      css++;
    } else if (rel.endsWith('.js')) {
      const r = await build({
        entryPoints: [from],
        bundle: false,
        minify: true,
        format: 'esm',
        target: 'es2022',
        write: false,
      });
      await writeFile(to, r.outputFiles[0].text);
      js++;
    } else if (rel.endsWith('.html')) {
      await writeFile(to, minifyHtml(await readFile(from, 'utf8')));
      html++;
    } else {
      await cp(from, to);
      copied++;
    }
  }
  return { css, js, html, copied };
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const pub = await processDir(path.join(ROOT, 'public'), OUT);
const adm = await processDir(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));

console.log(`✓ public → dist   CSS ${pub.css} · JS ${pub.js} · HTML ${pub.html} · бусад ${pub.copied}`);
console.log(`✓ admin  → dist/admin   CSS ${adm.css} · JS ${adm.js} · HTML ${adm.html} · бусад ${adm.copied}`);
console.log(`\nProduction:  NODE_ENV=production SERVE_DIR=dist node server/index.js`);
