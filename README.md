# Dream Spark Travel

Монголын нутгийн аялалын компанийн **хоёр хэлт (KR анхдагч / EN)**, **бүрэн динамик** вэбсайт.
Гурван хуудастай: **Нүүр · Аялал · Зургийн цомог**. Бүх агуулга, бичвэр, зураг, холбоос admin
самбараас удирдагдана. Захиалгын маягт байхгүй — зочин баруун доод булангийн **Instagram** товчоор
шууд холбогдоно.

- Сайт: `http://localhost:8000`
- Admin: `http://localhost:8000/admin`

---

## Онцлог

**Нийтийн тал**

- **Хоёр хэл** — KR (анхдагч) / EN. Сонголтыг localStorage-д санана. Монгол хэл байхгүй.
- **Нүүр** — зөвхөн дэлгэц дүүрэн зураг + «YOUR JOURNEY / YOUR STORY» + «투어 보기» товч.
  Зураг, уриа, товчны бичвэр admin-аас солигдоно.
- **Аялал** — дээр нь ангиллын сонголт (전체 / 중부 몽골 / 고비사막 …). Ангилал бүр доошоо цувна, дотор нь
  **хоногийн багц** дөрвөлжин карт (зураг, «4박5일» тэмдэг, нэр). Карт дээр дарахад **тусдаа хуудас**
  `/tours/<slug>` нээгдэнэ: нүүр зураг, хоног, дараа нь өдөр бүр дарааллаар — зургууд (lightbox),
  зам/цаг, гол үйл ажиллагаа, цэгэн жагсаалт. Агуулга нь компанийн PDF танилцуулгаас (4박5일, 고비 6박7일).
- **Зургийн цомог** — зураг бүр **аймгийн хэлбэрээр** таслагдан газрын зураг дотор байрлана
  (21 аймаг + Улаанбаатар, `js/data/aimags.js`, geoBoundaries CC BY 4.0). Нутгийн нэр дээр дарахад
  бусад нутаг бүдгэрнэ; доор нь нутаг бүрийн тор, дарахад lightbox.
- **Instagram — яг одоо холбогдох** — баруун доод буланд байнга лугшдаг хөвөгч товч, дарахад
  Instagram руу шууд үсэрнэ. Холбоос, бичвэр admin-аас.
- **Хөл** — хар дэвсгэр, цагаан бичвэр: компанийн нэр · IG / Naver blog icon · «대표: · 사업자등록번호: ·
  관광사업등록번호:» · 회사주소: · 대표번호: | 이메일: · © мөр зүүн доор. Хоосон талбар харагдахгүй.
- Гар утсанд бүрэн зохицсон, гар, товчлуураар удирдах боломжтой.

**Admin (`/admin`)**

- Хяналт — тоо, англи орчуулга дутуу аяллууд, цомгийн нутгийн харьцаа
- Аялал — **ангилал** (нэр KR/EN, зураг) → **багц** (нэр, хоног, товч тайлбар, картын зураг) → **өдрүүд**
  (газрын нэр, дэд гарчиг, зам/цаг, гол үйл ажиллагаа, цэгэн жагсаалт, олон зураг). Slug, дараалал
  бичихгүй: сервер өөрөө үүсгэнэ, ↑↓ товчоор эрэмбэлнэ.
- Зургийн цомог — байршуулах, засах, нуух, дараалал
- Тохиргоо — лого, брэнд нэр, нүүрний зураг ба бичвэр, цэсний нэр, цомгийн гарчиг, Instagram/Naver,
  хөвөгч товчны бичвэр, хөлийн бүх мэдээлэл (KR/EN)

---

## Ажиллуулах

### 1. Шаардлага
Node.js **18+** (24 дээр туршсан), npm.

### 2. Суулгах
```bash
npm install
```

### 3. Тохиргоо
```bash
cp .env.example .env
```
`.env`-ийг нээж бөглөнө:

| Түлхүүр | Тайлбар |
|---|---|
| `SESSION_SECRET` | Урт санамсаргүй утга. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Анхны admin. **АНХААР:** нууц үгэнд `#` эсвэл хоосон зай байвал заавал хашилтанд бич — эс бөгөөс dotenv `#`-ээс хойшхийг тайрна. Ж: `ADMIN_PASSWORD="Aa1#strong"` |
| `COOKIE_SECURE` | Production-д заавал `1` (зөвхөн HTTPS) |

> `.env` өөрчилсний дараа серверийг **дахин эхлүүл** — `node --watch` нь `.env`-г дахин уншдаггүй.

### 4. Өгөгдлийн сан
```bash
npm run db:migrate   # хүснэгтүүд (хуучин v6/v7 схемийг агуулга алдалгүй шилжүүлнэ)
npm run db:seed      # 2 ангилал, 2 багц (12 өдөр), 30 зураг, тохиргоо, admin — байгааг дарж бичихгүй
```
Шинээр эхлэх бол: `npm run db:reset`

### 5. Ажиллуулах
```bash
npm start      # эсвэл npm run dev — өөрчлөлтөд автомат reload
```

---

## npm script

| Команд | Үүрэг |
|---|---|
| `npm start` | Сервер |
| `npm run dev` | `node --watch` — автомат reload |
| `npm run build` | `dist/` рүү minify (CSS, JS, HTML) |
| `npm run db:migrate` | Схем (идэмпотент, хуучин схемийг шилжүүлнэ) |
| `npm run db:seed` | Анхны агуулга (идэмпотент — ангилал/аялал slug-аар шинэчлэгдэнэ) |
| `npm run db:reset` | Бүгдийг устгаад дахин үүсгэх |
| `npm run db:admin` | Admin нууц үгийг `.env`-тэй тааруулах (бусад өгөгдөлд хүрэхгүй) |
| `npm test` | node:test — 43 тест |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `node scripts/images.mjs` | Зургийг 1400px болгож, `gallery/thumbs` (560px), `tours/thumbs` (800px) үүсгэх. ⚠️ Дахин ажиллуулбал JPEG дахин шахагдана — зөвхөн шинэ зураг нэмэхэд |

---

## Бүтэц

```
server/
  app.js            Express — API + цэвэр URL (/, /tours, /tours/:slug, /gallery; хуучин замууд 301)
  index.js          Эхлүүлэгч
  db/               schema.sql · migrate · seed · seed-data.json
  lib/              password (scrypt) · session · serialize
  middleware/       security (CSP, rate limit) · auth (CSRF) · validate (zod) · error
  routes/           tours (ангилал + аялал) · gallery · settings  +  admin/*
public/
  index.html · tours.html · tour.html (/tours/<slug>) · gallery.html · 404.html
  css/              base · layout (толгой, хөл, Instagram товч) · home · tour · gallery
  js/core/          i18n (KR/EN) · api · ui (тохиргоог хуудсанд тавина)
  js/features/      gallery · lightbox
  js/pages/         home · tours (chip + карт) · tour (багцын хуудас) · gallery · basic
  images/           gallery (+ thumbs) · tours (+ thumbs, PDF-ээс) · site/logo.jpg
  assets/fonts/     Open Sans (Ө/Ү дэмжсэн subset — fallback)
admin/              login.html · index.html · css · js
tests/              api · admin · pages
scripts/            build.mjs · images.mjs
```

---

## Архитектур

- **Backend** — Express 5 + `better-sqlite3`. Бүх query параметртэй. Оролтыг zod-оор шалгана;
  API зөвхөн зөвшөөрсөн талбарыг буцаана (`lib/serialize.js`).
- **Өгөгдөл** — `tour_categories` → `tours` (багц: title/duration/summary ×2 хэл, cover) → `tour_days`
  (day_no, images JSON, title/place/meta/summary/body ×2 хэл), `gallery`, `settings` (`site`, `footer`).
- **Frontend** — vanilla ES module. DOM-д бичвэрийг зөвхөн `textContent`-ээр тавина.
- **i18n** — статик бичвэр `data-en` attribute-аар (KR нь DOM-ын анхны утга); тохиргооны бичвэр
  `data-t="hero.line1"` гэх мэт элементэд `ui.js` тавина; динамик агуулга API-аас `{kr, en}`
  хэлбэрээр ирж `pick()`-ээр сонгогдоно. Хэл солиход `langchange` event цацагдана.
- **Үсэг** — Oswald (латин гарчиг, нүүрний уриа), Golos Text (EN бичвэр, брэнд),
  Noto Sans KR (солонгос горимд бүх бичвэр, гарчиг).
- **Аюулгүй байдал** — helmet CSP (`script-src 'self'`, inline script байхгүй), httpOnly сесс
  cookie, бичих хүсэлт бүрд CSRF токен, scrypt нууц үг, нэвтрэлтэд rate limit,
  байршуулсан файлын нэрийг сервер өгнө.

---

## Production

```bash
npm run build
NODE_ENV=production COOKIE_SECURE=1 SERVE_DIR=dist node server/index.js
```

Тогтвортой дискэнд хадгалах ёстой:

- `server/data/app.db` — өгөгдлийн сан
- `server/uploads/` — admin-аас байршуулсан зураг

---

## Анхаарах

- **Хөлийн утас, и-мэйл, 사업자등록번호, 관광사업등록번호 хоосон** — компани нийтлээгүй тул зохиомол утга оруулаагүй.
  Admin → Тохиргоо → Хөл хэсэгт бөглөнө.
- **Аяллын зайн тоо** PDF-ээс авсан; 쳉헤르 온천 (120km) ба 고비 6일차 테를지 (320km) хоёрын тоо
  PDF-д бүрэн уншигдаагүй тул тооцоолсон утга — admin-аас шалгаж засна.
- **Цомгийн зураг нь Wikimedia Commons-ынх** (`public/images/gallery/CREDITS.json`). Аяллын зураг
  компанийн PDF-ээс.
- **Дэлгэцийн зураг авахдаа** headless Chrome-д `--window-size=500,…` хүртэл нарийсгаж болно;
  хэл солихын тулд localStorage `ds_lang` = `en` тавина.
