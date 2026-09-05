/* ==========================================================================
   admin.js — удирдлагын самбар (цэвэр URL, History API)
   Бүх бичвэрийг textContent-ээр байрлуулна. Бичих хүсэлт бүр CSRF токентой.
   ========================================================================== */

/* ---- Туслах ------------------------------------------------------------- */
export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) n.style.setProperty(p, val);
        else n.style[p] = val;
      }
    } else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#view');

let csrf = '';

/* ---- API ---------------------------------------------------------------- */
async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (method !== 'GET') headers['x-csrf-token'] = csrf;
  if (body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`/api/admin${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (res.status === 401) {
    location.href = '/admin/login';
    throw new Error('Нэвтрэх шаардлагатай');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || `Алдаа (${res.status})`);
    err.details = data?.details;
    throw err;
  }
  return data;
}

/* ---- Toast -------------------------------------------------------------- */
function toast(text, kind = '') {
  const box = $('#toast');
  const d = el('div', { class: kind, text });
  box.append(d);
  setTimeout(() => {
    d.style.opacity = '0';
    d.style.transition = 'opacity .3s';
    setTimeout(() => d.remove(), 320);
  }, 3200);
}

/* ---- Цонх --------------------------------------------------------------- */
function closeModal() {
  const m = $('#modal');
  m.classList.remove('open');
  $('#modalCard').classList.remove('wide');
  $('#modalBody').replaceChildren();
  $('#modalYes').hidden = false;
  $('#modalYes').onclick = null;
  $('#modalNo').onclick = null;
}

function confirmDialog(title, text, okLabel = 'Устгах') {
  return new Promise((resolve) => {
    const m = $('#modal');
    $('#modalTitle').textContent = title;
    $('#modalText').textContent = text;
    $('#modalYes').textContent = okLabel;
    $('#modalYes').hidden = false;
    m.classList.add('open');
    const done = (v) => {
      closeModal();
      resolve(v);
    };
    $('#modalYes').onclick = () => done(true);
    $('#modalNo').onclick = () => done(false);
    m.onclick = (e) => {
      if (e.target === m) done(false);
    };
  });
}

/** Цомгоос зураг сонгох цонх. Сонгосон зургийн замыг буцаана. */
async function pickFromGallery() {
  let photos = [];
  try {
    photos = (await api('/gallery')).photos;
  } catch (err) {
    toast(err.message, 'err');
    return null;
  }
  return new Promise((resolve) => {
    const m = $('#modal');
    $('#modalTitle').textContent = 'Цомгоос зураг сонгох';
    $('#modalText').textContent = `${photos.length} зураг. Дарж сонгоно уу.`;
    $('#modalYes').hidden = true;
    $('#modalCard').classList.add('wide');

    const grid = el(
      'div',
      { class: 'pick-grid' },
      photos.map((p) =>
        el(
          'button',
          {
            type: 'button',
            onclick: () => {
              closeModal();
              resolve(p.image);
            },
          },
          el('img', {
            src: p.image.replace('/images/gallery/', '/images/gallery/thumbs/'),
            alt: '',
            loading: 'lazy',
            onerror: (e) => {
              e.target.onerror = null;
              e.target.src = p.image;
            },
          }),
          el('span', { text: p.place_mn || p.image.split('/').pop() })
        )
      )
    );
    $('#modalBody').replaceChildren(grid);
    m.classList.add('open');

    const cancel = () => {
      closeModal();
      resolve(null);
    };
    $('#modalNo').onclick = cancel;
    m.onclick = (e) => {
      if (e.target === m) cancel();
    };
  });
}

/* ---- Зургийн талбар ----------------------------------------------------- */
/** Зураг сонгох/байршуулах бүрэн хэсэг. form.elements[name]-аар утга нь уншигдана. */
function imageField(label, name, value = '') {
  const input = el('input', { type: 'text', name, value, placeholder: '/images/… эсвэл /uploads/…' });

  const prevBox = el('div', { class: 'prev' });
  const paint = () => {
    const v = input.value.trim();
    prevBox.replaceChildren(
      v
        ? el('img', { src: v, alt: '' })
        : el('span', { class: 'none', text: 'Зураг алга' })
    );
  };
  input.addEventListener('input', paint);

  const file = el('input', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp,image/avif',
    hidden: true,
  });

  async function upload(f) {
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    box.classList.remove('drag');
    try {
      const { url } = await api('/upload', { method: 'POST', form: fd });
      input.value = url;
      paint();
      toast('Зураг байршууллаа');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      file.value = '';
    }
  }
  file.addEventListener('change', () => upload(file.files?.[0]));

  const ops = el(
    'div',
    { class: 'ops' },
    el('button', { class: 'btn btn-pine btn-sm', type: 'button', onclick: () => file.click() },
      'Компьютерээс байршуулах'),
    el(
      'button',
      {
        class: 'btn btn-line btn-sm',
        type: 'button',
        onclick: async () => {
          const url = await pickFromGallery();
          if (url) {
            input.value = url;
            paint();
          }
        },
      },
      'Цомгоос сонгох'
    ),
    el(
      'button',
      {
        class: 'btn btn-line btn-sm',
        type: 'button',
        onclick: () => {
          input.value = '';
          paint();
        },
      },
      'Хоосон болгох'
    )
  );

  const box = el(
    'div',
    { class: 'imgfield' },
    prevBox,
    el(
      'div',
      { class: 'if-side' },
      ops,
      input,
      el('span', { class: 'hint', text: 'Зургаа энд чирж оруулж болно · JPG, PNG, WebP · 6 МБ хүртэл' })
    ),
    file
  );

  for (const ev of ['dragenter', 'dragover']) {
    box.addEventListener(ev, (e) => {
      e.preventDefault();
      box.classList.add('drag');
    });
  }
  for (const ev of ['dragleave', 'dragend']) {
    box.addEventListener(ev, () => box.classList.remove('drag'));
  }
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    upload(e.dataTransfer?.files?.[0]);
  });

  paint();
  return el('div', { class: 'field' }, el('span', { text: label }), box);
}

/* ---- Хэлбэрийн туслах --------------------------------------------------- */
function field(label, node, hint) {
  return el(
    'label',
    { class: 'field' },
    el('span', { text: label }),
    node,
    hint && el('span', { class: 'msg', text: hint })
  );
}
const input = (name, value = '', props = {}) => el('input', { name, value: value ?? '', ...props });
const textarea = (name, value = '', props = {}) => {
  const t = el('textarea', { name, ...props });
  t.value = value ?? '';
  return t;
};
const select = (name, options, value) =>
  el(
    'select',
    { name },
    options.map((o) => el('option', { value: o.value, selected: o.value === value }, o.label))
  );

/** Гурван хэлний талбар (MN/EN/KR) */
function i18nFields(labelBase, prefix, row, kind = 'input') {
  const make = (suffix) => {
    const v = row?.[`${prefix}_${suffix}`] ?? row?.[suffix] ?? '';
    return kind === 'textarea'
      ? textarea(`${prefix}_${suffix}`, v, { rows: 4 })
      : input(`${prefix}_${suffix}`, v);
  };
  return el(
    'div',
    { class: 'row row-3' },
    field(`${labelBase} · MN`, make('mn')),
    field(`${labelBase} · EN`, make('en')),
    field(`${labelBase} · KR`, make('kr'))
  );
}

const val = (form, name) => form.elements[name]?.value.trim() ?? '';
const num = (form, name, d = 0) => {
  const n = Number(form.elements[name]?.value);
  return Number.isFinite(n) ? n : d;
};

function showErrors(form, details) {
  for (const f of form.querySelectorAll('.field.err')) {
    f.classList.remove('err');
    f.querySelector('.msg')?.remove();
  }
  if (!details) return;
  for (const [key, msg] of Object.entries(details)) {
    const node = form.querySelector(`[name="${CSS.escape(key)}"]`);
    const wrap = node?.closest('.field');
    if (!wrap) continue;
    wrap.classList.add('err');
    wrap.append(el('span', { class: 'msg', text: msg }));
  }
}

const REGION_LABEL = { gobi: 'Говь', khuvsgul: 'Хөвсгөл', tuv: 'Төв нутаг', other: 'Бусад' };
const REGION_COLOR = { gobi: '#D9930F', khuvsgul: '#20463A', tuv: '#8FBBAA', other: '#B9C6C0' };
const regionOptions = () =>
  Object.entries(REGION_LABEL).map(([value, label]) => ({ value, label }));

/* ==========================================================================
   1. Хяналтын самбар
   ========================================================================== */
function countUp(node, to) {
  const dur = 700;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    node.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function viewDashboard() {
  const { stats, byRegion, missing, recent } = await api('/stats');

  const cards = [
    { k: 'Идэвхтэй аялал', v: stats.toursActive, s: `нийт ${stats.tours}` },
    { k: 'Харагдах зураг', v: stats.photosActive, s: `нийт ${stats.photos}` },
    { k: 'Онцлох мөч', v: stats.highlights, s: 'аяллуудад' },
    { k: 'Орчуулга дутуу', v: missing.length, s: 'аялал', warn: missing.length > 0 },
  ];

  const statsBox = el(
    'div',
    { class: 'stats' },
    cards.map((c) =>
      el(
        'div',
        { class: `stat${c.warn ? ' warn' : ''}` },
        el('div', { class: 'k', text: c.k }),
        el('div', { class: 'v', text: '0' }),
        el('div', { class: 's', text: c.s })
      )
    )
  );

  /* Зургийн бүсийн харьцаа */
  const total = byRegion.reduce((a, b) => a + b.n, 0) || 1;
  let acc = 0;
  const slices = byRegion
    .map((r) => {
      const from = (acc / total) * 100;
      acc += r.n;
      return `${REGION_COLOR[r.k] || '#B9C6C0'} ${from}% ${(acc / total) * 100}%`;
    })
    .join(',');

  const donut = el(
    'div',
    { class: 'card' },
    el('div', { class: 'card-h' }, el('h2', { text: 'Зураг — нутгаар' })),
    el(
      'div',
      { class: 'card-b' },
      byRegion.length
        ? el(
            'div',
            { class: 'donut' },
            el('div', { class: 'ring', style: { '--slices': slices } }),
            el(
              'div',
              { class: 'keys' },
              byRegion.map((r) =>
                el(
                  'div',
                  {},
                  el('i', { style: { background: REGION_COLOR[r.k] || '#B9C6C0' } }),
                  el('span', { text: REGION_LABEL[r.k] || r.k }),
                  el('b', { text: String(r.n) })
                )
              )
            )
          )
        : el('p', { class: 'empty', text: 'Өгөгдөл алга' })
    )
  );

  const todo = el(
    'div',
    { class: 'card' },
    el('div', { class: 'card-h' }, el('h2', { text: 'Анхаарах зүйл' })),
    el(
      'div',
      { class: 'card-b' },
      missing.length
        ? el(
            'table',
            { class: 'tbl' },
            el(
              'thead',
              {},
              el('tr', {}, ['Аялал', 'Дутуу хэл', ''].map((h) => el('th', { text: h })))
            ),
            el(
              'tbody',
              {},
              missing.map((t) =>
                el(
                  'tr',
                  {},
                  el('td', {}, el('strong', { text: t.title_mn })),
                  el(
                    'td',
                    {},
                    t.en_gap && el('span', { class: 'chip chip-new', text: 'EN' }),
                    ' ',
                    t.kr_gap && el('span', { class: 'chip chip-new', text: 'KR' })
                  ),
                  el(
                    'td',
                    { class: 'act' },
                    el('a', { class: 'btn btn-line btn-sm', href: `/admin/tours/${t.id}` }, 'Нөхөх')
                  )
                )
              )
            )
          )
        : el('p', { class: 'empty', text: 'Бүх аялал гурван хэлээр бүрэн' })
    )
  );

  const recentCard = el(
    'div',
    { class: 'card' },
    el('div', { class: 'card-h' }, el('h2', { text: 'Сүүлд засварласан' })),
    el(
      'div',
      { class: 'card-b' },
      recent.length
        ? el(
            'table',
            { class: 'tbl' },
            el('tbody', {},
              recent.map((t) =>
                el(
                  'tr',
                  {},
                  el('td', {}, el('strong', { text: t.title_mn })),
                  el('td', { class: 'mono', text: t.updated_at }),
                  el('td', { class: 'act' },
                    el('a', { class: 'btn btn-line btn-sm', href: `/admin/tours/${t.id}` }, 'Засах'))
                )
              )
            )
          )
        : el('p', { class: 'empty', text: 'Аялал алга' })
    )
  );

  view.replaceChildren(
    el(
      'div',
      { class: 'head' },
      el('h1', { text: 'Хяналтын самбар' }),
      el('div', { class: 'tools' },
        el('a', { class: 'btn btn-line', href: '/', target: '_blank', rel: 'noopener' }, 'Сайтыг харах'))
    ),
    statsBox,
    el('div', { style: { height: '16px' } }),
    todo,
    donut,
    recentCard
  );

  statsBox.querySelectorAll('.v').forEach((n, i) => countUp(n, cards[i].v));
}

/* ==========================================================================
   2. Аялал
   ========================================================================== */
async function viewTours() {
  const { tours } = await api('/tours');

  const rows = tours.map((t) =>
    el(
      'tr',
      {},
      el('td', {},
        t.cover
          ? el('img', { class: 'thumb', src: t.cover, alt: '', loading: 'lazy' })
          : el('span', { class: 'mono', text: '—' })),
      el('td', {}, el('strong', { text: t.title_mn })),
      el('td', { class: 'mono', text: t.slug }),
      el('td', { text: REGION_LABEL[t.region_key] || t.region_key }),
      el('td', {}, el('span', {
        class: `chip ${t.is_active ? 'chip-on' : 'chip-off'}`,
        text: t.is_active ? 'Идэвхтэй' : 'Нуусан',
      })),
      el(
        'td',
        { class: 'act' },
        el('a', { class: 'btn btn-line btn-sm', href: `/admin/tours/${t.id}` }, 'Засах'),
        ' ',
        el(
          'button',
          {
            class: 'btn btn-danger btn-sm',
            type: 'button',
            onclick: async () => {
              if (!(await confirmDialog('Аялал устгах', `«${t.title_mn}» устгах уу?`))) return;
              await api(`/tours/${t.id}`, { method: 'DELETE' });
              toast('Устгалаа');
              route();
            },
          },
          'Устгах'
        )
      )
    )
  );

  view.replaceChildren(
    el(
      'div',
      { class: 'head' },
      el('h1', { text: 'Аялал' }),
      el('div', { class: 'tools' }, el('a', { class: 'btn btn-pine', href: '/admin/tours/new' }, 'Шинэ аялал'))
    ),
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-b' },
        tours.length
          ? el(
              'table',
              { class: 'tbl' },
              el('thead', {},
                el('tr', {}, ['', 'Нэр', 'Slug', 'Нутаг', 'Төлөв', ''].map((h) => el('th', { text: h })))),
              el('tbody', {}, rows)
            )
          : el('p', { class: 'empty', text: 'Аялал алга' })
      )
    )
  );
}

function lineRow(x = {}) {
  const row = el(
    'div',
    { class: 'line-row' },
    el(
      'div',
      { class: 'row row-3' },
      field('MN', input('textMn', x.text_mn ?? x.textMn ?? '')),
      field('EN', input('textEn', x.text_en ?? x.textEn ?? '')),
      field('KR', input('textKr', x.text_kr ?? x.textKr ?? ''))
    ),
    el('button', { class: 'btn btn-line btn-sm', type: 'button', onclick: () => row.remove() }, 'Хасах')
  );
  return row;
}

function dayRow(d = {}, i = 0) {
  const row = el(
    'div',
    { class: 'day-row' },
    el('div', { class: 'no', text: String(i + 1) }),
    el(
      'div',
      { class: 'fields' },
      field('Маршрут MN', input('routeMn', d.route_mn ?? d.routeMn ?? '')),
      field('Хонох MN', input('sleepMn', d.sleep_mn ?? d.sleepMn ?? '')),
      field('км', input('km', String(d.km ?? 0), { type: 'number', min: 0, max: 3000 })),
      el(
        'button',
        {
          class: 'btn btn-line btn-sm drop',
          type: 'button',
          onclick: () => {
            const box = row.parentElement;
            row.remove();
            [...box.children].forEach((r, n) => (r.querySelector('.no').textContent = String(n + 1)));
          },
        },
        'Хасах'
      ),
      el('div', { class: 'row row-2', style: { gridColumn: '1 / -1' } },
        field('Маршрут EN', input('routeEn', d.route_en ?? d.routeEn ?? '')),
        field('Маршрут KR', input('routeKr', d.route_kr ?? d.routeKr ?? ''))),
      el('div', { class: 'row row-2', style: { gridColumn: '1 / -1' } },
        field('Хонох EN', input('sleepEn', d.sleep_en ?? d.sleepEn ?? '')),
        field('Хонох KR', input('sleepKr', d.sleep_kr ?? d.sleepKr ?? '')))
    )
  );
  return row;
}

async function viewTourEdit(id) {
  const isNew = id === 'new';
  const tour = isNew ? null : (await api(`/tours/${id}`)).tour;
  const g = (k, d = '') => tour?.[k] ?? d;

  const daysBox = el('div', { class: 'days' });
  for (const [i, d] of (tour?.itinerary ?? []).entries()) daysBox.append(dayRow(d, i));

  const highBox = el('div', { class: 'lines' });
  const inBox = el('div', { class: 'lines' });
  const outBox = el('div', { class: 'lines' });
  for (const x of tour?.includes ?? []) {
    if (x.kind === 'high') highBox.append(lineRow(x));
    else if (x.kind === 'out') outBox.append(lineRow(x));
    else inBox.append(lineRow(x));
  }

  const listCard = (title, box, note) =>
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-h' },
        el('div', {}, el('h2', { text: title }), note && el('span', { class: 'mono', text: note })),
        el('button', { class: 'btn btn-line btn-sm', type: 'button', onclick: () => box.append(lineRow()) },
          'Мөр нэмэх')
      ),
      el('div', { class: 'card-b' }, box)
    );

  const form = el(
    'form',
    { id: 'tourForm' },

    el(
      'div',
      { class: 'card' },
      el('div', { class: 'card-h' }, el('h2', { text: 'Нүүр зураг' })),
      el('div', { class: 'card-b' }, imageField('Аяллын нүүр зураг', 'cover', g('cover')))
    ),

    el(
      'div',
      { class: 'card' },
      el('div', { class: 'card-h' }, el('h2', { text: 'Үндсэн мэдээлэл' })),
      el(
        'div',
        { class: 'card-b' },
        el(
          'div',
          { class: 'row row-3' },
          field('Slug (URL)', input('slug', g('slug'), { required: true, pattern: '[a-z0-9-]+' })),
          field('Нутаг', select('regionKey', regionOptions(), g('region_key', 'other'))),
          field('Дараалал', input('sortOrder', String(g('sort_order', 0)), { type: 'number', min: 0 }))
        ),
        i18nFields('Гарчиг', 'title', tour),
        i18nFields('Дэд гарчиг', 'area', tour),
        i18nFields('Товч', 'summary', tour, 'textarea'),
        i18nFields('Дэлгэрэнгүй', 'body', tour, 'textarea'),
        el(
          'div',
          { class: 'row row-3' },
          field('Төлөв', select('isActive',
            [{ value: '1', label: 'Идэвхтэй' }, { value: '0', label: 'Нуусан' }],
            String(g('is_active', 1)))),
          field('Улирал эхлэх (сар)', input('seasonFrom', String(g('season_from', 5)), { type: 'number', min: 1, max: 12 })),
          field('Улирал дуусах (сар)', input('seasonTo', String(g('season_to', 9)), { type: 'number', min: 1, max: 12 }))
        ),
        el(
          'div',
          { class: 'row row-3' },
          field('Хоног (0 = тохиролцоно)', input('days', String(g('days', 0)), { type: 'number', min: 0, max: 60 })),
          field('Нийт км (0 = харуулахгүй)', input('kmTotal', String(g('km_total', 0)), { type: 'number', min: 0 })),
          field('Бүлэг (0 = тохиролцоно)', el('div', { class: 'row row-2' },
            input('groupMin', String(g('group_min', 0)), { type: 'number', min: 0, max: 50 }),
            input('groupMax', String(g('group_max', 0)), { type: 'number', min: 0, max: 50 })))
        )
      )
    ),

    listCard('Онцлох мөчүүд', highBox, 'Хуудсан дээр дугаарласан жагсаалт болно'),
    listCard('Багтсан', inBox),
    listCard('Багтаагүй', outBox),

    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-h' },
        el('div', {},
          el('h2', { text: 'Өдрийн хуваарь' }),
          el('span', { class: 'mono', text: 'Заавал биш — бөглөвөл хуудсанд хүснэгт, график гарна' })),
        el('button', { class: 'btn btn-line btn-sm', type: 'button',
          onclick: () => daysBox.append(dayRow({}, daysBox.children.length)) }, 'Өдөр нэмэх')
      ),
      el('div', { class: 'card-b' }, daysBox)
    ),

    el(
      'div',
      { style: { display: 'flex', gap: '9px', marginTop: '16px', flexWrap: 'wrap' } },
      el('button', { class: 'btn btn-pine', type: 'submit' }, isNew ? 'Үүсгэх' : 'Хадгалах'),
      el('a', { class: 'btn btn-line', href: '/admin/tours' }, 'Болих')
    )
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rows = (box, kind) =>
      [...box.children].map((r) => ({
        kind,
        textMn: r.querySelector('[name=textMn]').value.trim(),
        textEn: r.querySelector('[name=textEn]').value.trim(),
        textKr: r.querySelector('[name=textKr]').value.trim(),
      }));

    const payload = {
      slug: val(form, 'slug'),
      sortOrder: num(form, 'sortOrder'),
      isActive: val(form, 'isActive') === '1',
      cover: val(form, 'cover'),
      regionKey: val(form, 'regionKey'),
      titleMn: val(form, 'title_mn'),
      titleEn: val(form, 'title_en'),
      titleKr: val(form, 'title_kr'),
      areaMn: val(form, 'area_mn'),
      areaEn: val(form, 'area_en'),
      areaKr: val(form, 'area_kr'),
      summaryMn: val(form, 'summary_mn'),
      summaryEn: val(form, 'summary_en'),
      summaryKr: val(form, 'summary_kr'),
      bodyMn: val(form, 'body_mn'),
      bodyEn: val(form, 'body_en'),
      bodyKr: val(form, 'body_kr'),
      days: num(form, 'days'),
      kmTotal: num(form, 'kmTotal'),
      groupMin: num(form, 'groupMin'),
      groupMax: num(form, 'groupMax'),
      seasonFrom: num(form, 'seasonFrom', 5),
      seasonTo: num(form, 'seasonTo', 9),
      itinerary: [...daysBox.children].map((r, i) => ({
        dayNo: i + 1,
        routeMn: r.querySelector('[name=routeMn]').value.trim(),
        routeEn: r.querySelector('[name=routeEn]').value.trim(),
        routeKr: r.querySelector('[name=routeKr]').value.trim(),
        sleepMn: r.querySelector('[name=sleepMn]').value.trim(),
        sleepEn: r.querySelector('[name=sleepEn]').value.trim(),
        sleepKr: r.querySelector('[name=sleepKr]').value.trim(),
        km: Number(r.querySelector('[name=km]').value) || 0,
      })),
      includes: [...rows(highBox, 'high'), ...rows(inBox, 'in'), ...rows(outBox, 'out')],
    };

    try {
      if (isNew) await api('/tours', { method: 'POST', body: payload });
      else await api(`/tours/${id}`, { method: 'PUT', body: payload });
      toast('Хадгаллаа');
      go('/admin/tours');
    } catch (err) {
      showErrors(form, err.details);
      toast(err.message, 'err');
    }
  });

  view.replaceChildren(
    el(
      'div',
      { class: 'head' },
      el('h1', { text: isNew ? 'Шинэ аялал' : `Засах — ${g('title_mn')}` }),
      el('div', { class: 'tools' }, el('a', { class: 'btn btn-line', href: '/admin/tours' }, 'Жагсаалт'))
    ),
    form
  );
}

/* ==========================================================================
   3. Зургийн цомог
   ========================================================================== */
async function viewGallery() {
  const { photos } = await api('/gallery');
  const editor = el('div', { class: 'card', hidden: true });

  function openEditor(p) {
    const isNew = !p;
    const form = el(
      'form',
      {},
      imageField('Зураг', 'image', p?.image ?? ''),
      el(
        'div',
        { class: 'row row-3' },
        field('Нутаг', select('regionKey', regionOptions(), p?.region_key ?? 'other')),
        field('Дараалал', input('sortOrder', String(p?.sort_order ?? photos.length), { type: 'number', min: 0 })),
        field('Төлөв', select('isActive',
          [{ value: '1', label: 'Харагдана' }, { value: '0', label: 'Нуусан' }],
          String(p?.is_active ?? 1)))
      ),
      i18nFields('Газрын нэр', 'place', p),
      i18nFields('Тайлбар', 'caption', p),
      field('Зохиогч / лиценз', input('credit', p?.credit ?? '')),
      el(
        'div',
        { style: { display: 'flex', gap: '9px', flexWrap: 'wrap' } },
        el('button', { class: 'btn btn-pine', type: 'submit' }, isNew ? 'Нэмэх' : 'Хадгалах'),
        el('button', { class: 'btn btn-line', type: 'button', onclick: () => (editor.hidden = true) }, 'Хаах')
      )
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        image: val(form, 'image'),
        sortOrder: num(form, 'sortOrder'),
        isActive: val(form, 'isActive') === '1',
        regionKey: val(form, 'regionKey'),
        placeMn: val(form, 'place_mn'),
        placeEn: val(form, 'place_en'),
        placeKr: val(form, 'place_kr'),
        captionMn: val(form, 'caption_mn'),
        captionEn: val(form, 'caption_en'),
        captionKr: val(form, 'caption_kr'),
        credit: val(form, 'credit'),
      };
      try {
        if (isNew) await api('/gallery', { method: 'POST', body: payload });
        else await api(`/gallery/${p.id}`, { method: 'PUT', body: payload });
        toast('Хадгаллаа');
        route();
      } catch (err) {
        showErrors(form, err.details);
        toast(err.message, 'err');
      }
    });

    editor.replaceChildren(
      el('div', { class: 'card-h' }, el('h2', { text: isNew ? 'Зураг нэмэх' : 'Зураг засах' })),
      el('div', { class: 'card-b' }, form)
    );
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const grid = el(
    'div',
    { class: 'gal' },
    photos.map((p) =>
      el(
        'figure',
        { class: p.is_active ? '' : 'off' },
        el('img', {
          src: p.image.replace('/images/gallery/', '/images/gallery/thumbs/'),
          alt: p.place_mn || '',
          loading: 'lazy',
          onerror: (e) => {
            e.target.onerror = null;
            e.target.src = p.image;
          },
        }),
        el(
          'figcaption',
          {},
          el('b', { text: p.place_mn || p.image.split('/').pop() }),
          el('span', { class: 'mono', text: REGION_LABEL[p.region_key] || p.region_key }),
          el(
            'div',
            { class: 'ops' },
            el('button', { class: 'btn btn-line btn-sm', type: 'button', onclick: () => openEditor(p) }, 'Засах'),
            el(
              'button',
              {
                class: 'btn btn-line btn-sm',
                type: 'button',
                onclick: async () => {
                  await api(`/gallery/${p.id}`, {
                    method: 'PUT',
                    body: {
                      image: p.image, sortOrder: p.sort_order, isActive: !p.is_active,
                      regionKey: p.region_key,
                      placeMn: p.place_mn, placeEn: p.place_en, placeKr: p.place_kr,
                      captionMn: p.caption_mn, captionEn: p.caption_en, captionKr: p.caption_kr,
                      credit: p.credit,
                    },
                  });
                  route();
                },
              },
              p.is_active ? 'Нуух' : 'Харуулах'
            ),
            el(
              'button',
              {
                class: 'btn btn-danger btn-sm',
                type: 'button',
                onclick: async () => {
                  if (!(await confirmDialog('Зураг устгах', 'Энэ зургийг цомгоос устгах уу?'))) return;
                  await api(`/gallery/${p.id}`, { method: 'DELETE' });
                  toast('Устгалаа');
                  route();
                },
              },
              'Устгах'
            )
          )
        )
      )
    )
  );

  view.replaceChildren(
    el(
      'div',
      { class: 'head' },
      el('h1', { text: 'Зургийн цомог' }),
      el('div', { class: 'tools' },
        el('button', { class: 'btn btn-pine', type: 'button', onclick: () => openEditor(null) }, 'Зураг нэмэх'))
    ),
    editor,
    el('div', { class: 'card' },
      el('div', { class: 'card-b' }, photos.length ? grid : el('p', { class: 'empty', text: 'Зураг алга' })))
  );
}

/* ==========================================================================
   4. Тохиргоо — зөвхөн холбоо барих + лого
   ========================================================================== */
async function viewSettings() {
  const { settings } = await api('/settings');
  const c = settings?.contact || {};

  const i18nGroup = (label, prefix, obj) =>
    el(
      'div',
      { class: 'row row-3' },
      field(`${label} · MN`, input(`${prefix}Mn`, obj?.mn ?? '')),
      field(`${label} · EN`, input(`${prefix}En`, obj?.en ?? '')),
      field(`${label} · KR`, input(`${prefix}Kr`, obj?.kr ?? ''))
    );
  const i18nOf = (form, prefix) => ({
    mn: val(form, `${prefix}Mn`),
    en: val(form, `${prefix}En`),
    kr: val(form, `${prefix}Kr`),
  });

  const form = el(
    'form',
    {},
    el(
      'div',
      { class: 'card' },
      el('div', { class: 'card-h' },
        el('div', {},
          el('h2', { text: 'Лого' }),
          el('span', { class: 'mono', text: 'Толгой, хөл, favicon-д ашиглана' }))),
      el('div', { class: 'card-b' }, imageField('Логоны зураг', 'logo', c.logo ?? ''))
    ),

    el(
      'div',
      { class: 'card' },
      el('div', { class: 'card-h' },
        el('div', {},
          el('h2', { text: 'Холбоо барих' }),
          el('span', { class: 'mono', text: 'Хоосон талбар нь сайтад огт харагдахгүй' }))),
      el(
        'div',
        { class: 'card-b' },
        el('div', { class: 'row row-2' },
          field('KakaoTalk сувгийн холбоос', input('kakao', c.kakao ?? '', { placeholder: 'https://pf.kakao.com/…' })),
          field('Instagram', input('instagram', c.instagram ?? ''))),
        el('div', { class: 'row row-2' },
          field('Naver блог', input('naver', c.naver ?? '')),
          field('Утас', input('phone', c.phone ?? '', { placeholder: '+976 …' }))),
        field('И-мэйл', input('email', c.email ?? '')),
        i18nGroup('Хаяг', 'address', c.address),
        i18nGroup('Ажлын цаг', 'hours', c.hours)
      )
    ),

    el('div', { style: { display: 'flex', gap: '9px', flexWrap: 'wrap' } },
      el('button', { class: 'btn btn-pine', type: 'submit' }, 'Хадгалах'))
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/settings/contact', {
        method: 'PUT',
        body: {
          value: {
            phone: val(form, 'phone'),
            email: val(form, 'email'),
            kakao: val(form, 'kakao'),
            instagram: val(form, 'instagram'),
            naver: val(form, 'naver'),
            logo: val(form, 'logo'),
            address: i18nOf(form, 'address'),
            hours: i18nOf(form, 'hours'),
          },
        },
      });
      toast('Хадгаллаа');
    } catch (err) {
      showErrors(form, err.details);
      toast(err.message, 'err');
    }
  });

  view.replaceChildren(el('div', { class: 'head' }, el('h1', { text: 'Тохиргоо' })), form);
}

/* ==========================================================================
   Router
   ========================================================================== */
function go(path) {
  history.pushState({}, '', path);
  route();
}

async function route() {
  const parts = location.pathname.split('/').filter(Boolean); // ['admin', ...]
  const section = parts[1] || 'dashboard';
  const param = parts[2];

  for (const a of document.querySelectorAll('#sideNav a')) {
    a.classList.toggle('on', a.dataset.view === section);
  }

  view.replaceChildren(el('p', { class: 'empty', text: 'Ачаалж байна…' }));
  try {
    if (section === 'tours') await (param ? viewTourEdit(param) : viewTours());
    else if (section === 'gallery') await viewGallery();
    else if (section === 'settings') await viewSettings();
    else await viewDashboard();
  } catch (err) {
    view.replaceChildren(el('div', { class: 'alert alert-err', text: err.message }));
  }
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="/admin/"]');
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  go(a.getAttribute('href'));
});
window.addEventListener('popstate', route);

$('#logout').addEventListener('click', async () => {
  try {
    await api('/logout', { method: 'POST' });
  } catch {
    /* алгасна */
  }
  location.href = '/admin/login';
});

/* ---- Эхлүүлэх ----------------------------------------------------------- */
(async () => {
  try {
    const me = await fetch('/api/admin/me', { credentials: 'same-origin' });
    if (!me.ok) throw new Error('unauth');
    const data = await me.json();
    csrf = data.csrf;
    $('#who').textContent = data.user.username;
  } catch {
    location.href = '/admin/login';
    return;
  }
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    history.replaceState({}, '', '/admin/dashboard');
  }
  route();
})();
