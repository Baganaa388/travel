/* ==========================================================================
   tours.js — аяллын жагсаалт: гурван карт. Онцлох мөчүүд жагсаалтын API-д
   хамт ирдэг тул нэг л хүсэлт хийнэ.
   ========================================================================== */
import { getTours } from '../core/api.js';
import { pick, onLang } from '../core/i18n.js';
import { boot, reveal } from '../core/ui.js';
import { months, customLabel, daysLabel, regionName } from './tour-common.js';

const L = {
  more: { mn: 'Дэлгэрэнгүй', en: 'See the tour', kr: '자세히 보기' },
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function card(t, i, lang) {
  const art = el('article', 'tc rv');
  art.id = t.slug;
  art.dataset.region = t.regionKey;
  const href = `/tour/${t.slug}`;

  const shot = el('a', 'tc-shot');
  shot.href = href;
  shot.tabIndex = -1;
  shot.setAttribute('aria-hidden', 'true');
  const img = el('img');
  img.src = t.coverThumb || t.cover;
  img.alt = '';
  img.loading = i === 0 ? 'eager' : 'lazy';
  img.decoding = 'async';
  shot.append(img, el('span', 'rtag', regionName(t.regionKey, lang)));

  const body = el('div', 'tc-body');
  body.append(el('p', 'tc-area', pick(t.area, lang)));
  const h = el('h2', 'h2');
  const ha = el('a', null, pick(t.title, lang));
  ha.href = href;
  h.append(ha);
  body.append(h, el('p', 'tc-sum', pick(t.summary, lang)));

  if (t.highlights?.length) {
    const ul = el('ul', 'tc-high');
    for (const x of t.highlights.slice(0, 4)) ul.append(el('li', null, pick(x.text, lang)));
    body.append(ul);
  }

  const foot = el('div', 'tc-foot');
  const meta = el('div', 'tc-meta');
  meta.append(el('span', null, t.days > 0 ? daysLabel(t.days, lang) : customLabel(lang)));
  meta.append(el('span', null, months(t.seasonFrom, t.seasonTo, lang)));
  const go = el('a', 'btn btn-pine', L.more[lang]);
  go.href = href;
  foot.append(meta, go);
  body.append(foot);

  art.append(shot, body);
  return art;
}

async function main() {
  await boot();
  const list = document.querySelector('#tourList');
  if (!list) return;

  let tours = [];
  try {
    tours = await getTours();
  } catch {
    list.replaceChildren(el('p', 'state', 'Аяллуудыг ачаалж чадсангүй'));
    return;
  }

  onLang((lang) => {
    list.replaceChildren(...tours.map((t, i) => card(t, i, lang)));
    reveal(list);
  });
  reveal();

  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
}

main();
