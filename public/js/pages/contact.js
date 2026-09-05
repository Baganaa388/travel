/* ==========================================================================
   contact.js — Холбоо барих: сувгийн картууд, Улаанбаатарын цаг,
   бэлэн мессеж (хуулах), гурван аялал.
   ========================================================================== */
import { onLang, getLang } from '../core/i18n.js';
import { boot, reveal, CHANNELS } from '../core/ui.js';

const LABEL = {
  kakao: { mn: 'KakaoTalk', en: 'KakaoTalk', kr: '카카오톡' },
  instagram: { mn: 'Instagram', en: 'Instagram', kr: '인스타그램' },
  naver: { mn: 'Naver блог', en: 'Naver blog', kr: '네이버 블로그' },
  phone: { mn: 'Утас', en: 'Phone', kr: '전화' },
  email: { mn: 'И-мэйл', en: 'Email', kr: '이메일' },
};
const GO = {
  kakao: { mn: 'Чат нээх', en: 'Open the chat', kr: '채팅 열기' },
  instagram: { mn: 'Мессеж бичих', en: 'Send a message', kr: '메시지 보내기' },
  naver: { mn: 'Блог руу орох', en: 'Open the blog', kr: '블로그 열기' },
  phone: { mn: 'Залгах', en: 'Call', kr: '전화하기' },
  email: { mn: 'Мэйл бичих', en: 'Write an email', kr: '이메일 보내기' },
};
/* Өөрсдийн статик дүрс — хэрэглэгчийн оролт биш тул innerHTML-ээр тавьж болно */
const ICON = {
  kakao:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.2 4.6 6.6l-1 3.9c-.1.3.3.6.6.4l4.5-3c.4 0 .9.1 1.3.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>',
  instagram:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm4.5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm5-3.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/></svg>',
  naver:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h5.2l5.6 8.4V3H20v18h-5.2L9.2 12.6V21H4z"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3h3l1.7 4.4-2.2 1.6a12 12 0 0 0 5.9 5.9l1.6-2.2L21 14.4v3a3 3 0 0 1-3.2 3A16.5 16.5 0 0 1 3 6.2 3 3 0 0 1 6.6 3z"/></svg>',
  email:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 3.2V17h16V8.2l-8 5.3-8-5.3zM5.4 7l6.6 4.4L18.6 7H5.4z"/></svg>',
};

const TEMPLATE = {
  mn: 'Сайн байна уу, Dream Spark!\nБид [сар]-д ойролцоогоор [хэдэн өдөр], [хэдүүлээ] явахаар төлөвлөж байна.\n[Говь / Хөвсгөл / Тэрэлж] сонирхож байна.\nХуваарийн санал илгээж өгнө үү.',
  en: 'Hello Dream Spark!\nWe are planning to travel in [month], for about [days], [number] of us.\nWe are interested in [Gobi / Khövsgöl / Terelj].\nCould you send us a plan?',
  kr: '안녕하세요, 드림스파크!\n[월]에 [며칠] 정도, [인원]명이 여행을 계획하고 있습니다.\n[고비 / 홉스골 / 테를지]에 관심 있습니다.\n일정 제안 부탁드립니다.',
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/* ---- Улаанбаатарын цаг (UTC+8) ---------------------------------------- */
function startClock() {
  const t = document.querySelector('#ubTime');
  const d = document.querySelector('#ubDate');
  if (!t) return;
  const LOCALE = { en: 'en-GB', kr: 'ko-KR' };
  const MN_DAYS = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];
  const tick = () => {
    const now = new Date();
    const lang = getLang();
    t.textContent = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ulaanbaatar', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now);
    if (d) {
      if (lang === 'mn') {
        // Хөтчүүдэд монгол огнооны мэдээлэл ихэвчлэн байдаггүй тул гараар бүтээнэ
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Ulaanbaatar', weekday: 'short', day: 'numeric', month: 'numeric',
        }).formatToParts(now);
        const get = (t) => parts.find((p) => p.type === t)?.value || '';
        const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        d.textContent = `${MN_DAYS[dow] || ''}, ${get('month')}-р сарын ${get('day')}`;
      } else {
        d.textContent = new Intl.DateTimeFormat(LOCALE[lang] || 'en-GB', {
          timeZone: 'Asia/Ulaanbaatar', weekday: 'short', day: 'numeric', month: 'short',
        }).format(now);
      }
    }
  };
  tick();
  setInterval(tick, 15000);
  onLang(tick);
}

(async () => {
  const settings = await boot();
  const c = settings.contact || {};
  startClock();

  /* ---- Сувгууд ---------------------------------------------------------- */
  const box = document.querySelector('#ctChan');
  if (box) {
    const items = CHANNELS.map((ch) => ({ ...ch, value: (c[ch.key] || '').trim() })).filter(
      (x) => x.value
    );
    onLang((lang) => {
      const frag = document.createDocumentFragment();
      for (const it of items) {
        const a = el('a', `c-${it.key}`);
        a.href = it.href(it.value);
        if (/^https?:/.test(a.href)) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        const mark = el('span', 'mark');
        mark.innerHTML = ICON[it.key] || '';
        const txt = el('span');
        txt.append(el('b', null, LABEL[it.key]?.[lang] || it.label));
        txt.append(el('span', 'handle', it.shown ? it.shown(it.value) : it.value));
        a.append(mark, txt, el('span', 'go', GO[it.key]?.[lang] || ''));
        frag.append(a);
      }
      if (!items.length) frag.append(el('p', 'state', 'Холбоо барих суваг тохируулаагүй байна'));
      box.replaceChildren(frag);
    });
  }

  /* ---- Бэлэн мессеж ----------------------------------------------------- */
  const tpl = document.querySelector('#tplText');
  const copyBtn = document.querySelector('#tplCopy');
  const done = document.querySelector('#tplDone');
  if (tpl) {
    onLang((lang) => {
      tpl.value = TEMPLATE[lang] || TEMPLATE.mn;
      done?.classList.remove('show');
    });
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(tpl.value);
      } catch {
        tpl.select();
        document.execCommand?.('copy');
      }
      done?.classList.add('show');
      setTimeout(() => done?.classList.remove('show'), 2400);
    });
  }

  reveal();
})();
