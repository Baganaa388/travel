/* ==========================================================================
   admin.js — удирдлагын самбар (цэвэр URL, History API)
   Хэсгүүд: Хяналт · Аялал (ангилал + аялал) · Зургийн цомог · Тохиргоо (сайт + хөл)
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

const thumbOf = (src) =>
  src
    .replace('/images/gallery/', '/images/gallery/thumbs/')
    .replace('/images/tours/', '/images/tours/thumbs/');

/* ---- Зургийн хэмжээ ------------------------------------------------------
   Санал болгох хэмжээ (сайт дээр яг таарч харагдана) + байршуулсан зургийн
   жинхэнэ хэмжээ. Харьцаа нь зөрвөл анхааруулна.                            */
export const SIZE = {
  card: { w: 1200, h: 1500, text: '1200×1500px (4:5 босоо)' },
  day: { w: 1600, h: 1200, text: '1600×1200px (4:3 хэвтээ)' },
  hero: { w: 2000, h: 1125, text: '2000×1125px (16:9 хэвтээ)' },
  photo: { w: 1600, h: 1200, text: '1600×1200px (4:3 хэвтээ)' },
  logo: { w: 512, h: 512, text: '512×512px (дөрвөлжин)' },
};

/** Зургийн хэмжээг rec-тэй харьцуулж бичвэр + төлөв буцаана. */
function sizeCheck(w, h, rec) {
  if (!w || !h) return { text: 'хэмжээ тодорхойгүй', kind: 'bad' };
  const text = `${w}×${h}px`;
  if (!rec) return { text, kind: '' };
  const off = Math.abs(w / h - rec.w / rec.h) / (rec.w / rec.h);
  if (off > 0.12) return { text: `${text} · харьцаа таарахгүй`, kind: 'bad' };
  if (w < rec.w * 0.7) return { text: `${text} · жижиг байна`, kind: 'bad' };
  return { text: `${text} · таарч байна`, kind: 'ok' };
}

/** Санал болгох хэмжээ + жинхэнэ хэмжээг харуулах мөр. `read(img)`-ээр шинэчилнэ. */
function sizeRow(rec) {
  const dim = el('span', { class: 'dim' });
  const node = el(
    'div',
    { class: 'sizes' },
    rec && el('span', { class: 'rec', text: `Санал болгох хэмжээ: ${rec.text}` }),
    dim
  );
  return {
    node,
    clear: () => {
      dim.className = 'dim';
      dim.textContent = '';
    },
    fail: () => {
      dim.className = 'dim bad';
      dim.textContent = 'Зураг ачаалагдсангүй';
    },
    read: (img) => {
      const r = sizeCheck(img.naturalWidth, img.naturalHeight, rec);
      dim.className = `dim ${r.kind}`;
      dim.textContent = r.text;
    },
  };
}

function thumbImg(src, alt = '') {
  return el('img', {
    src: thumbOf(src),
    alt,
    loading: 'lazy',
    onerror: (e) => {
      e.target.onerror = null;
      e.target.src = src;
    },
  });
}

/** Сайтад байгаа зургуудаас (цомог + аяллын зураг) сонгох цонх. Замыг буцаана. */
async function pickImage() {
  let items = [];
  try {
    const [{ photos }, { tours }] = await Promise.all([api('/gallery'), api('/tours')]);
    const seen = new Set();
    for (const t of tours) {
      if (!t.cover || seen.has(t.cover)) continue;
      seen.add(t.cover);
      items.push({ src: t.cover, label: t.title_kr });
    }
    for (const p of photos) {
      if (seen.has(p.image)) continue;
      seen.add(p.image);
      items.push({ src: p.image, label: p.place_kr || p.image.split('/').pop() });
    }
  } catch (err) {
    toast(err.message, 'err');
    return null;
  }
  return new Promise((resolve) => {
    const m = $('#modal');
    $('#modalTitle').textContent = 'Зураг сонгох';
    $('#modalText').textContent = `${items.length} зураг. Дарж сонгоно уу.`;
    $('#modalYes').hidden = true;
    $('#modalCard').classList.add('wide');

    const grid = el(
      'div',
      { class: 'pick-grid' },
      items.map((p) =>
        el(
          'button',
          {
            type: 'button',
            onclick: () => {
              closeModal();
              resolve(p.src);
            },
          },
          thumbImg(p.src),
          el('span', { text: p.label })
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

async function uploadFile(f) {
  const fd = new FormData();
  fd.append('file', f);
  const { url } = await api('/upload', { method: 'POST', form: fd });
  return url;
}

function dropZone(box, onFiles) {
  for (const ev of ['dragenter', 'dragover']) {
    box.addEventListener(ev, (e) => {
      e.preventDefault();
      box.classList.add('drag');
    });
  }
  for (const ev of ['dragleave', 'dragend'])
    box.addEventListener(ev, () => box.classList.remove('drag'));
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.classList.remove('drag');
    onFiles([...(e.dataTransfer?.files || [])]);
  });
}

/* ---- Зургийн талбар (нэг зураг) ---------------------------------------- */
function imageField(label, name, value = '', rec = null) {
  const input = el('input', {
    type: 'text',
    name,
    value,
    placeholder: '/images/… эсвэл /uploads/…',
  });

  const sizes = sizeRow(rec);
  const prevBox = el('div', { class: 'prev' });
  const paint = () => {
    const v = input.value.trim();
    sizes.clear();
    if (!v) {
      prevBox.replaceChildren(el('span', { class: 'none', text: 'Зураг алга' }));
      return;
    }
    const img = el('img', {
      onload: () => sizes.read(img),
      onerror: () => sizes.fail(),
      src: v,
      alt: '',
    });
    prevBox.replaceChildren(img);
  };
  input.addEventListener('input', paint);

  const file = el('input', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp,image/avif',
    hidden: true,
  });
  async function upload(f) {
    if (!f) return;
    try {
      input.value = await uploadFile(f);
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
    el(
      'button',
      { class: 'btn btn-pine btn-sm', type: 'button', onclick: () => file.click() },
      'Компьютерээс байршуулах'
    ),
    el(
      'button',
      {
        class: 'btn btn-line btn-sm',
        type: 'button',
        onclick: async () => {
          const url = await pickImage();
          if (url) {
            input.value = url;
            paint();
          }
        },
      },
      'Сайтаас сонгох'
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
      sizes.node,
      el('span', {
        class: 'hint',
        text: 'Зургаа энд чирж оруулж болно · JPG, PNG, WebP · 6 МБ хүртэл',
      })
    ),
    file
  );
  dropZone(box, (files) => upload(files[0]));
  paint();
  return el('div', { class: 'field' }, el('span', { text: label }), box);
}

/* ---- Олон зургийн талбар (аяллын зургууд) ------------------------------ */
/** Буцаасан элемент дээр `.values()` дуудвал замуудын массив өгнө. */
function imagesField(label, values = [], rec = null) {
  let list = [...values];
  const rows = el('div', { class: 'imgs' });

  /** Мөр бүрийн жинхэнэ хэмжээг эх зурагнаас нь уншина. */
  const rowSize = (src) => {
    const dim = el('span', { class: 'dim' });
    if (!src) return dim;
    const probe = new Image();
    probe.onload = () => {
      const r = sizeCheck(probe.naturalWidth, probe.naturalHeight, rec);
      dim.className = `dim ${r.kind}`;
      dim.textContent = r.text;
    };
    probe.onerror = () => {
      dim.className = 'dim bad';
      dim.textContent = 'Зураг алга';
    };
    probe.src = src;
    return dim;
  };

  const paint = () => {
    rows.replaceChildren(
      ...list.map((src, i) =>
        el(
          'div',
          { class: 'imgs-row' },
          el('div', { class: 'prev' }, thumbImg(src)),
          el('input', {
            type: 'text',
            value: src,
            oninput: (e) => {
              list[i] = e.target.value.trim();
            },
          }),
          rowSize(src),
          el('span', { class: 'mono', text: i === 0 ? 'Нүүр' : '' }),
          el(
            'button',
            {
              class: 'btn btn-line btn-sm',
              type: 'button',
              title: 'Дээш',
              disabled: i === 0,
              onclick: () => {
                [list[i - 1], list[i]] = [list[i], list[i - 1]];
                paint();
              },
            },
            '↑'
          ),
          el(
            'button',
            {
              class: 'btn btn-line btn-sm',
              type: 'button',
              title: 'Доош',
              disabled: i === list.length - 1,
              onclick: () => {
                [list[i + 1], list[i]] = [list[i], list[i + 1]];
                paint();
              },
            },
            '↓'
          ),
          el(
            'button',
            {
              class: 'btn btn-danger btn-sm',
              type: 'button',
              onclick: () => {
                list.splice(i, 1);
                paint();
              },
            },
            'Хасах'
          )
        )
      ),
      ...(list.length ? [] : [el('p', { class: 'empty', text: 'Зураг алга' })])
    );
  };

  const file = el('input', {
    type: 'file',
    multiple: true,
    accept: 'image/jpeg,image/png,image/webp,image/avif',
    hidden: true,
  });
  async function upload(files) {
    for (const f of files) {
      try {
        list.push(await uploadFile(f));
        paint();
      } catch (err) {
        toast(err.message, 'err');
      }
    }
    file.value = '';
    if (files.length) toast('Зураг байршууллаа');
  }
  file.addEventListener('change', () => upload([...(file.files || [])]));

  const ops = el(
    'div',
    { class: 'ops' },
    el(
      'button',
      { class: 'btn btn-pine btn-sm', type: 'button', onclick: () => file.click() },
      'Компьютерээс байршуулах'
    ),
    el(
      'button',
      {
        class: 'btn btn-line btn-sm',
        type: 'button',
        onclick: async () => {
          const url = await pickImage();
          if (url) {
            list.push(url);
            paint();
          }
        },
      },
      'Сайтаас сонгох'
    ),
    el(
      'button',
      {
        class: 'btn btn-line btn-sm',
        type: 'button',
        onclick: () => {
          list.push('');
          paint();
          rows.querySelector('.imgs-row:last-child input')?.focus();
        },
      },
      'Замаар нэмэх'
    )
  );

  const box = el(
    'div',
    { class: 'imgfield imgfield-multi' },
    el(
      'div',
      { class: 'if-side' },
      ops,
      rows,
      el('span', {
        class: 'hint',
        text:
          'Эхний зураг нь карт дээр харагдана · олон зураг чирж оруулж болно' +
          (rec ? ` · санал болгох хэмжээ: ${rec.text}` : ''),
      })
    ),
    file
  );
  dropZone(box, upload);
  paint();
  const wrap = el('div', { class: 'field' }, el('span', { text: label }), box);
  wrap.values = () => list.map((s) => s.trim()).filter(Boolean);
  return wrap;
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
    options.map((o) =>
      el('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)
    )
  );

/** Хоёр хэлний талбар (KR / EN). row нь {x_kr, x_en} эсвэл {kr, en}. */
function i18nFields(labelBase, prefix, row, kind = 'input', rows = 4) {
  const make = (suffix) => {
    const v = row?.[`${prefix}_${suffix}`] ?? row?.[suffix] ?? '';
    return kind === 'textarea'
      ? textarea(`${prefix}_${suffix}`, v, { rows })
      : input(`${prefix}_${suffix}`, v);
  };
  return el(
    'div',
    { class: 'row row-2' },
    field(`${labelBase} · KR`, make('kr')),
    field(`${labelBase} · EN`, make('en'))
  );
}

const val = (form, name) => form.elements[name]?.value.trim() ?? '';
const num = (form, name, d = 0) => {
  const n = Number(form.elements[name]?.value);
  return Number.isFinite(n) ? n : d;
};
const i18nOf = (form, prefix) => ({ kr: val(form, `${prefix}_kr`), en: val(form, `${prefix}_en`) });

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

const statusChip = (on) =>
  el('span', { class: `chip ${on ? 'chip-on' : 'chip-off'}`, text: on ? 'Идэвхтэй' : 'Нуусан' });

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
    { k: 'Ангилал', v: stats.categoriesActive, s: `нийт ${stats.categories}` },
    { k: 'Аялал (багц)', v: stats.toursActive, s: `нийт ${stats.tours} · ${stats.days} өдөр` },
    { k: 'Харагдах зураг', v: stats.photosActive, s: `нийт ${stats.photos}` },
    { k: 'Англи орчуулга дутуу', v: missing.length, s: 'аялал', warn: missing.length > 0 },
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
    el('div', { class: 'card-h' }, el('h2', { text: 'Цомгийн зураг — нутгаар' })),
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
              el(
                'tr',
                {},
                ['Аялал', 'Дутуу', ''].map((h) => el('th', { text: h }))
              )
            ),
            el(
              'tbody',
              {},
              missing.map((t) =>
                el(
                  'tr',
                  {},
                  el('td', {}, el('strong', { text: t.title_kr })),
                  el('td', {}, el('span', { class: 'chip chip-new', text: 'EN' })),
                  el(
                    'td',
                    { class: 'act' },
                    el('a', { class: 'btn btn-line btn-sm', href: `/admin/tours/${t.id}` }, 'Нөхөх')
                  )
                )
              )
            )
          )
        : el('p', { class: 'empty', text: 'Бүх аялал хоёр хэлээр бүрэн' })
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
            el(
              'tbody',
              {},
              recent.map((t) =>
                el(
                  'tr',
                  {},
                  el('td', {}, el('strong', { text: t.title_kr })),
                  el('td', { class: 'mono', text: t.updated_at }),
                  el(
                    'td',
                    { class: 'act' },
                    el('a', { class: 'btn btn-line btn-sm', href: `/admin/tours/${t.id}` }, 'Засах')
                  )
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
      el(
        'div',
        { class: 'tools' },
        el(
          'a',
          { class: 'btn btn-line', href: '/', target: '_blank', rel: 'noopener' },
          'Сайтыг харах'
        )
      )
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
   2. Аялал — ангилал → хоногийн багц (карт, өөрийн хуудастай) → өдрүүд
   Slug, дараалал зэргийг admin бичихгүй: сервер өөрөө үүсгэнэ, ↑↓ товчоор эрэмбэлнэ.
   ========================================================================== */
const statusOptions = [
  { value: '1', label: 'Идэвхтэй' },
  { value: '0', label: 'Нуусан' },
];

async function reorder(path, ids) {
  await api(path, { method: 'POST', body: { order: ids } });
  route();
}

function moveButtons(ids, i, path) {
  const swap = (j) => {
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    return reorder(path, next);
  };
  return [
    el(
      'button',
      {
        class: 'btn btn-line btn-sm',
        type: 'button',
        title: 'Дээш',
        disabled: i === 0,
        onclick: () => swap(i - 1),
      },
      '↑'
    ),
    ' ',
    el(
      'button',
      {
        class: 'btn btn-line btn-sm',
        type: 'button',
        title: 'Доош',
        disabled: i === ids.length - 1,
        onclick: () => swap(i + 1),
      },
      '↓'
    ),
  ];
}

async function viewTours() {
  const [{ categories }, { tours }] = await Promise.all([api('/categories'), api('/tours')]);
  const catIds = categories.map((c) => c.id);

  const tourRow = (t, i, ids) =>
    el(
      'tr',
      {},
      el(
        'td',
        {},
        t.cover
          ? el('img', { class: 'thumb', src: thumbOf(t.cover), alt: '', loading: 'lazy' })
          : el('span', { class: 'mono', text: '—' })
      ),
      el(
        'td',
        {},
        el('strong', { text: t.title_kr }),
        el('div', { class: 'mono', text: t.title_en || '' })
      ),
      el('td', { text: t.duration_kr || '—' }),
      el('td', { class: 'n', text: `${t.days_count} өдөр` }),
      el('td', {}, statusChip(t.is_active)),
      el(
        'td',
        { class: 'act' },
        ...moveButtons(ids, i, '/tours/reorder'),
        ' ',
        el('a', { class: 'btn btn-line btn-sm', href: `/admin/tours/${t.id}` }, 'Засах'),
        ' ',
        el(
          'a',
          {
            class: 'btn btn-line btn-sm',
            href: `/tours/${t.slug}`,
            target: '_blank',
            rel: 'noopener',
          },
          'Сайтад'
        ),
        ' ',
        el(
          'button',
          {
            class: 'btn btn-danger btn-sm',
            type: 'button',
            onclick: async () => {
              if (
                !(await confirmDialog(
                  'Аялал устгах',
                  `«${t.title_kr}» болон бүх өдрийг нь устгах уу?`
                ))
              )
                return;
              await api(`/tours/${t.id}`, { method: 'DELETE' });
              toast('Устгалаа');
              route();
            },
          },
          'Устгах'
        )
      )
    );

  const catCard = (c, ci) => {
    const list = tours.filter((t) => t.category_id === c.id);
    const ids = list.map((t) => t.id);
    return el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-h' },
        el(
          'div',
          {},
          el('h2', {}, c.name_kr, ' ', el('span', { class: 'mono', text: c.name_en || '' })),
          el('span', { class: 'mono', text: `${list.length} аялал` }),
          ' ',
          statusChip(c.is_active)
        ),
        el(
          'div',
          { class: 'tools' },
          ...moveButtons(catIds, ci, '/categories/reorder'),
          el(
            'a',
            { class: 'btn btn-pine btn-sm', href: `/admin/tours/new?cat=${c.id}` },
            'Аялал нэмэх'
          ),
          el(
            'a',
            { class: 'btn btn-line btn-sm', href: `/admin/categories/${c.id}` },
            'Ангилал засах'
          ),
          el(
            'button',
            {
              class: 'btn btn-danger btn-sm',
              type: 'button',
              onclick: async () => {
                if (
                  !(await confirmDialog(
                    'Ангилал устгах',
                    `«${c.name_kr}» болон доторх ${list.length} аяллыг устгах уу?`
                  ))
                )
                  return;
                await api(`/categories/${c.id}`, { method: 'DELETE' });
                toast('Устгалаа');
                route();
              },
            },
            'Устгах'
          )
        )
      ),
      el(
        'div',
        { class: 'card-b' },
        list.length
          ? el(
              'table',
              { class: 'tbl' },
              el(
                'thead',
                {},
                el(
                  'tr',
                  {},
                  ['', 'Нэр', 'Хоног', 'Өдөр', 'Төлөв', ''].map((h) => el('th', { text: h }))
                )
              ),
              el(
                'tbody',
                {},
                list.map((t, i) => tourRow(t, i, ids))
              )
            )
          : el('p', { class: 'empty', text: 'Энэ ангилалд аялал алга — «Аялал нэмэх» дарна уу' })
      )
    );
  };

  view.replaceChildren(
    el(
      'div',
      { class: 'head' },
      el('h1', { text: 'Аялал' }),
      el(
        'div',
        { class: 'tools' },
        el('a', { class: 'btn btn-pine', href: '/admin/categories/new' }, 'Шинэ ангилал')
      )
    ),
    ...(categories.length
      ? categories.map(catCard)
      : [el('p', { class: 'empty', text: 'Ангилал алга — эхлээд ангилал үүсгэнэ үү' })])
  );
}

/* ---- Ангилал засах ------------------------------------------------------ */
async function viewCategoryEdit(id) {
  const isNew = id === 'new';
  const cat = isNew ? null : (await api(`/categories/${id}`)).category;
  const g = (k, d = '') => cat?.[k] ?? d;

  const form = el(
    'form',
    {},
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-h' },
        el(
          'div',
          {},
          el('h2', { text: 'Ангилал' }),
          el('span', { class: 'mono', text: 'Ж: 중부 몽골, 고비사막, 홉스골' })
        )
      ),
      el(
        'div',
        { class: 'card-b' },
        i18nFields('Нэр', 'name', cat),
        field('Төлөв', select('isActive', statusOptions, String(g('is_active', 1))))
      )
    ),
    el(
      'div',
      { class: 'card' },
      el('div', { class: 'card-h' }, el('div', {}, el('h2', { text: 'Зураг (заавал биш)' }))),
      el('div', { class: 'card-b' }, imageField('Ангиллын зураг', 'cover', g('cover'), SIZE.card))
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
    const payload = {
      isActive: val(form, 'isActive') === '1',
      cover: val(form, 'cover'),
      nameKr: val(form, 'name_kr'),
      nameEn: val(form, 'name_en'),
    };
    try {
      if (isNew) await api('/categories', { method: 'POST', body: payload });
      else await api(`/categories/${id}`, { method: 'PUT', body: payload });
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
      el('h1', { text: isNew ? 'Шинэ ангилал' : `Ангилал — ${g('name_kr')}` }),
      el(
        'div',
        { class: 'tools' },
        el('a', { class: 'btn btn-line', href: '/admin/tours' }, 'Жагсаалт')
      )
    ),
    form
  );
}

/* ---- Өдрийн блок (багцын засварт) -------------------------------------- */
function dayBlock(d = {}) {
  const images = imagesField('Зургууд', d.images ?? [], SIZE.day);
  const box = el(
    'div',
    { class: 'day-box' },
    el(
      'div',
      { class: 'day-head' },
      el('b', { class: 'day-no', text: '' }),
      el(
        'div',
        { class: 'tools' },
        el(
          'button',
          {
            class: 'btn btn-line btn-sm',
            type: 'button',
            title: 'Дээш',
            onclick: () => {
              box.previousElementSibling?.before(box);
              renumber(box.parentElement);
            },
          },
          '↑'
        ),
        el(
          'button',
          {
            class: 'btn btn-line btn-sm',
            type: 'button',
            title: 'Доош',
            onclick: () => {
              box.nextElementSibling?.after(box);
              renumber(box.parentElement);
            },
          },
          '↓'
        ),
        el(
          'button',
          {
            class: 'btn btn-danger btn-sm',
            type: 'button',
            onclick: async () => {
              if (
                !(await confirmDialog(
                  'Өдөр хасах',
                  'Энэ өдрийг хасах уу? (Хадгалах дарахад л батлагдана)',
                  'Хасах'
                ))
              )
                return;
              const parent = box.parentElement;
              box.remove();
              renumber(parent);
            },
          },
          'Хасах'
        )
      )
    ),
    i18nFields('Газрын нэр', 'title', d),
    i18nFields('Дэд гарчиг (аймаг, тайлбар)', 'place', d),
    i18nFields('Зам, цаг (ж: 약 350km / 6-7시간 이동)', 'meta', d),
    i18nFields('Гол үйл ажиллагаа (нэг мөр)', 'summary', d),
    i18nFields('Дэлгэрэнгүй (мөр бүр = нэг цэг)', 'body', d, 'textarea', 5),
    images
  );
  box.read = () => ({
    images: images.values(),
    titleKr: blockVal(box, 'title_kr'),
    titleEn: blockVal(box, 'title_en'),
    placeKr: blockVal(box, 'place_kr'),
    placeEn: blockVal(box, 'place_en'),
    metaKr: blockVal(box, 'meta_kr'),
    metaEn: blockVal(box, 'meta_en'),
    summaryKr: blockVal(box, 'summary_kr'),
    summaryEn: blockVal(box, 'summary_en'),
    bodyKr: blockVal(box, 'body_kr'),
    bodyEn: blockVal(box, 'body_en'),
  });
  return box;
}

function renumber(list) {
  if (!list) return;
  [...list.children].forEach((b, i) => {
    const n = b.querySelector('.day-no');
    if (n) n.textContent = `${i + 1}일차`;
  });
}

/** Блок дотор нэрээр утга унших (form.elements биш — блок нь form биш). */
function blockVal(root, name) {
  return root.querySelector(`[name="${name}"]`)?.value.trim() ?? '';
}

/* ---- Багц засах ---------------------------------------------------------- */
async function viewTourEdit(id) {
  const isNew = id === 'new';
  const [{ categories }, tour] = await Promise.all([
    api('/categories'),
    isNew ? null : api(`/tours/${id}`).then((d) => d.tour),
  ]);
  const g = (k, d = '') => tour?.[k] ?? d;
  const presetCat = new URLSearchParams(location.search).get('cat');
  const catOptions = categories.map((c) => ({ value: c.id, label: c.name_kr }));

  const daysBox = el('div', { class: 'days' });
  for (const d of tour?.days ?? []) daysBox.append(dayBlock(d));
  renumber(daysBox);
  const addDay = () => {
    daysBox.append(dayBlock());
    renumber(daysBox);
    daysBox.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const form = el(
    'form',
    {},
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-h' },
        el(
          'div',
          {},
          el('h2', { text: 'Багц' }),
          el('span', { class: 'mono', text: 'Карт дээр: зураг, хоног, нэр' })
        )
      ),
      el(
        'div',
        { class: 'card-b' },
        el(
          'div',
          { class: 'row row-2' },
          field(
            'Ангилал',
            select('categoryId', catOptions, g('category_id', presetCat || catOptions[0]?.value))
          ),
          field('Төлөв', select('isActive', statusOptions, String(g('is_active', 1))))
        ),
        i18nFields('Нэр', 'title', tour),
        i18nFields('Хоног (ж: 4박5일 / 4 nights · 5 days)', 'duration', tour),
        i18nFields('Товч тайлбар (нэг мөр, заавал биш)', 'summary', tour),
        i18nFields('Аяллын мэдээлэл — 투어 안내 (мөр бүр = нэг цэг)', 'info', tour, 'textarea', 7),
        imageField(
          'Картын зураг (хоосон бол 1-р өдрийн эхний зураг)',
          'cover',
          g('cover'),
          SIZE.card
        ),
        el('p', {
          class: 'note',
          text:
            'Аяллын хуудасны дээд талын ар дэвсгэр зураг эндээс биш — Тохиргоо → «Аяллын ' +
            'хуудасны ар дэвсгэр»-ээс тавина, тэр нь бүх аялалд нэг ижил байна.',
        })
      )
    ),
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-h' },
        el(
          'div',
          {},
          el('h2', { text: 'Өдрүүд' }),
          el('span', { class: 'mono', text: 'Аяллын хуудсан дээр дарааллаар гарна' })
        ),
        el(
          'button',
          { class: 'btn btn-line btn-sm', type: 'button', onclick: addDay },
          'Өдөр нэмэх'
        )
      ),
      el(
        'div',
        { class: 'card-b' },
        daysBox,
        el(
          'div',
          { style: { marginTop: '12px' } },
          el(
            'button',
            { class: 'btn btn-line btn-sm', type: 'button', onclick: addDay },
            'Өдөр нэмэх'
          )
        )
      )
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
    const payload = {
      categoryId: num(form, 'categoryId'),
      isActive: val(form, 'isActive') === '1',
      cover: val(form, 'cover'),
      titleKr: blockVal(form.querySelector('.card'), 'title_kr'),
      titleEn: blockVal(form.querySelector('.card'), 'title_en'),
      durationKr: blockVal(form.querySelector('.card'), 'duration_kr'),
      durationEn: blockVal(form.querySelector('.card'), 'duration_en'),
      summaryKr: blockVal(form.querySelector('.card'), 'summary_kr'),
      summaryEn: blockVal(form.querySelector('.card'), 'summary_en'),
      infoKr: blockVal(form.querySelector('.card'), 'info_kr'),
      infoEn: blockVal(form.querySelector('.card'), 'info_en'),
      days: [...daysBox.children].map((b) => b.read()),
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
      el('h1', { text: isNew ? 'Шинэ аялал' : `Засах — ${g('title_kr')}` }),
      el(
        'div',
        { class: 'tools' },
        el('a', { class: 'btn btn-line', href: '/admin/tours' }, 'Жагсаалт')
      )
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
      imageField('Зураг', 'image', p?.image ?? '', SIZE.photo),
      el(
        'div',
        { class: 'row row-3' },
        field('Нутаг', select('regionKey', regionOptions(), p?.region_key ?? 'other')),
        field(
          'Дараалал',
          input('sortOrder', String(p?.sort_order ?? photos.length), { type: 'number', min: 0 })
        ),
        field(
          'Төлөв',
          select(
            'isActive',
            [
              { value: '1', label: 'Харагдана' },
              { value: '0', label: 'Нуусан' },
            ],
            String(p?.is_active ?? 1)
          )
        )
      ),
      i18nFields('Газрын нэр', 'place', p),
      i18nFields('Тайлбар', 'caption', p),
      field('Зохиогч / лиценз', input('credit', p?.credit ?? '')),
      el(
        'div',
        { style: { display: 'flex', gap: '9px', flexWrap: 'wrap' } },
        el('button', { class: 'btn btn-pine', type: 'submit' }, isNew ? 'Нэмэх' : 'Хадгалах'),
        el(
          'button',
          { class: 'btn btn-line', type: 'button', onclick: () => (editor.hidden = true) },
          'Хаах'
        )
      )
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        image: val(form, 'image'),
        sortOrder: num(form, 'sortOrder'),
        isActive: val(form, 'isActive') === '1',
        regionKey: val(form, 'regionKey'),
        placeKr: val(form, 'place_kr'),
        placeEn: val(form, 'place_en'),
        captionKr: val(form, 'caption_kr'),
        captionEn: val(form, 'caption_en'),
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

  const toggle = (p) =>
    api(`/gallery/${p.id}`, {
      method: 'PUT',
      body: {
        image: p.image,
        sortOrder: p.sort_order,
        isActive: !p.is_active,
        regionKey: p.region_key,
        placeKr: p.place_kr,
        placeEn: p.place_en,
        captionKr: p.caption_kr,
        captionEn: p.caption_en,
        credit: p.credit,
      },
    });

  const grid = el(
    'div',
    { class: 'gal' },
    photos.map((p) =>
      el(
        'figure',
        { class: p.is_active ? '' : 'off' },
        thumbImg(p.image, p.place_kr || ''),
        el(
          'figcaption',
          {},
          el('b', { text: p.place_kr || p.image.split('/').pop() }),
          el('span', { class: 'mono', text: REGION_LABEL[p.region_key] || p.region_key }),
          el(
            'div',
            { class: 'ops' },
            el(
              'button',
              { class: 'btn btn-line btn-sm', type: 'button', onclick: () => openEditor(p) },
              'Засах'
            ),
            el(
              'button',
              {
                class: 'btn btn-line btn-sm',
                type: 'button',
                onclick: async () => {
                  await toggle(p);
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
                  if (!(await confirmDialog('Зураг устгах', 'Энэ зургийг цомгоос устгах уу?')))
                    return;
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
      el(
        'div',
        { class: 'tools' },
        el(
          'button',
          { class: 'btn btn-pine', type: 'button', onclick: () => openEditor(null) },
          'Зураг нэмэх'
        )
      )
    ),
    editor,
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-b' },
        photos.length ? grid : el('p', { class: 'empty', text: 'Зураг алга' })
      )
    )
  );
}

/** Хөлийн шошго: түлхүүр → [admin гарчиг, анхдагч KR/EN] */
const FOOTER_LABELS = {
  ceo: ['Захирал', { kr: '대표', en: 'CEO' }],
  regNo: ['Бүртгэлийн дугаар', { kr: '사업자등록번호', en: 'Business reg. no.' }],
  licenseNo: [
    'Аялал жуулчлалын бүртгэл',
    { kr: '관광사업등록번호', en: 'Tourism business reg. no.' },
  ],
  address: ['Хаяг', { kr: '회사주소', en: 'Address' }],
  phone: ['Утас', { kr: '대표번호', en: 'Company number' }],
  email: ['И-мэйл', { kr: '이메일', en: 'Email' }],
  extra: ['Нэмэлт талбар (이메일-ийн ард)', { kr: '', en: '' }],
};

/* ==========================================================================
   4. Тохиргоо — сайтын бүх бичвэр, зураг, холбоос
   ========================================================================== */
async function viewSettings() {
  const { settings } = await api('/settings');
  const s = settings?.site || {};
  const f = settings?.footer || {};
  const hero = s.hero || {};
  const nav = s.nav || {};

  const card = (title, note, ...body) =>
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'card-h' },
        el('div', {}, el('h2', { text: title }), note && el('span', { class: 'mono', text: note }))
      ),
      el('div', { class: 'card-b' }, body)
    );

  const form = el(
    'form',
    {},
    card(
      'Лого ба брэнд',
      'Толгой, favicon',
      imageField('Логоны зураг', 'logo', s.logo ?? '', SIZE.logo),
      field('Брэндийн нэр (толгойд)', input('brand', s.brand ?? '', { placeholder: 'Dream Spark' }))
    ),

    card(
      'Нүүр хуудас',
      'Дэлгэц дүүрэн зураг, уриа, товч',
      imageField('Нүүрний зураг', 'heroImage', hero.image ?? '', SIZE.hero),
      i18nFields('Уриа — 1-р мөр', 'line1', hero.line1),
      i18nFields('Уриа — 2-р мөр (шар)', 'line2', hero.line2),
      i18nFields('Уриаг тайлбарлах өгүүлбэр (доор нь)', 'tagline', hero.tagline),
      i18nFields('Товчны бичвэр', 'button', hero.button)
    ),

    card(
      'Аяллын хуудасны ар дэвсгэр',
      'Бүх аялалд нэг ижил зураг',
      el('p', {
        class: 'note',
        text:
          'Аялал бүрийн хуудасны дээд талын том зураг (гарчгийн ар дэвсгэр). Энд нэг зураг ' +
          'тавихад БҮХ аяллын хуудсанд ижил гарна. Хоосон орхивол аялал бүр өөрийн ' +
          '«Картын зураг»-аа ар дэвсгэр болгож харуулна.',
      }),
      imageField('Ар дэвсгэр зураг (бүх аялалд)', 'tourHero', s.tourHero ?? '', SIZE.hero)
    ),

    card(
      'Цэс ба гарчиг',
      '',
      i18nFields('Цэс — Нүүр', 'navHome', nav.home),
      i18nFields('Цэс — Аялал', 'navTours', nav.tours),
      i18nFields('Цэс — Цомог', 'navGallery', nav.gallery),
      i18nFields('Цомгийн хуудасны гарчиг', 'galleryTitle', s.galleryTitle)
    ),

    card(
      'Холбоос',
      'Instagram нь баруун доод булангийн хөвөгч товч болон хөлд гарна',
      el(
        'div',
        { class: 'row row-2' },
        field(
          'Instagram',
          input('instagram', s.instagram ?? '', { placeholder: 'https://www.instagram.com/…' })
        ),
        field(
          'Naver блог',
          input('naver', s.naver ?? '', { placeholder: 'https://blog.naver.com/…' })
        )
      ),
      i18nFields('Хөвөгч товчны бичвэр', 'instaLabel', s.instaLabel)
    ),

    card(
      'Хөл (footer)',
      'Хоосон талбар сайтад харагдахгүй',
      i18nFields('Компанийн нэр', 'company', f.company),
      el(
        'div',
        { class: 'row row-2' },
        field('Захирал (대표)', input('ceo', f.ceo ?? '')),
        field('Бүртгэлийн дугаар (사업자등록번호)', input('regNo', f.regNo ?? ''))
      ),
      i18nFields('Хаяг (회사주소)', 'address', f.address),
      el(
        'div',
        { class: 'row row-2' },
        field(
          'Компанийн утас (대표번호)',
          input('phone', f.phone ?? '', { placeholder: '+976 …' })
        ),
        field('И-мэйл', input('email', f.email ?? ''))
      ),
      field(
        'Нэмэлт талбар — утга (шошгыг доор «Хөлийн шошго»-д бичнэ)',
        input('extra', f.extra ?? '')
      ),
      i18nFields('© мөр ({year} = одоогийн он)', 'copyright', f.copyright)
    ),

    card(
      'Хөлийн шошго',
      'Талбар бүрийн өмнөх нэр — KR / EN',
      ...Object.entries(FOOTER_LABELS).map(([key, [title, def]]) =>
        i18nFields(
          title,
          `label_${key}`,
          (f.labels || {})[key]?.kr || (f.labels || {})[key]?.en ? f.labels[key] : def
        )
      )
    ),

    el(
      'div',
      { style: { display: 'flex', gap: '9px', flexWrap: 'wrap' } },
      el('button', { class: 'btn btn-pine', type: 'submit' }, 'Хадгалах')
    )
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const site = {
      logo: val(form, 'logo'),
      brand: val(form, 'brand'),
      instagram: val(form, 'instagram'),
      naver: val(form, 'naver'),
      nav: {
        home: i18nOf(form, 'navHome'),
        tours: i18nOf(form, 'navTours'),
        gallery: i18nOf(form, 'navGallery'),
      },
      hero: {
        image: val(form, 'heroImage'),
        line1: i18nOf(form, 'line1'),
        line2: i18nOf(form, 'line2'),
        tagline: i18nOf(form, 'tagline'),
        button: i18nOf(form, 'button'),
      },
      instaLabel: i18nOf(form, 'instaLabel'),
      galleryTitle: i18nOf(form, 'galleryTitle'),
      tourHero: val(form, 'tourHero'),
    };
    const footer = {
      company: i18nOf(form, 'company'),
      ceo: val(form, 'ceo'),
      regNo: val(form, 'regNo'),
      licenseNo: val(form, 'licenseNo'),
      address: i18nOf(form, 'address'),
      phone: val(form, 'phone'),
      email: val(form, 'email'),
      extra: val(form, 'extra'),
      copyright: i18nOf(form, 'copyright'),
      labels: Object.fromEntries(
        Object.keys(FOOTER_LABELS).map((k) => [k, i18nOf(form, `label_${k}`)])
      ),
    };
    try {
      await api('/settings/site', { method: 'PUT', body: { value: site } });
      await api('/settings/footer', { method: 'PUT', body: { value: footer } });
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
    a.classList.toggle(
      'on',
      a.dataset.view === section || (section === 'categories' && a.dataset.view === 'tours')
    );
  }

  view.replaceChildren(el('p', { class: 'empty', text: 'Ачаалж байна…' }));
  try {
    if (section === 'tours') await (param ? viewTourEdit(param) : viewTours());
    else if (section === 'categories') await (param ? viewCategoryEdit(param) : viewTours());
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
