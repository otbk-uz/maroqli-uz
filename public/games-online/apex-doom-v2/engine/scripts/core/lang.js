// ============================================================
//  🌐 TIL TIZIMI  v2  (uz / ru / en)
// ------------------------------------------------------------
//  ⚠ NEGA DOM AYLANMA, `data-i18n` ATRIBUTLARI EMAS:
//    interfeysning katta qismi JS bilan yasaladi (inspektor, hitbox,
//    tugma panellari, timeline). Har bir yaratilgan elementga qo'lda
//    `data-i18n` qo'yish yuzlab joyni tahrirlashni talab qilardi va
//    bitta qo'shilmagan joy tarjimasiz qolardi.
//    Shuning uchun bu yerda LUG'AT + DOM aylanma ishlatiladi: matn
//    tugunlari va `title` / `placeholder` / `aria-label` atributlari
//    lug'atdan qidiriladi.
//
//  ⚠ ASL MATN SAQLANADI (`__i18n` WeakMap va `dataset.i18nOrig`).
//    Aks holda uz → ru → en almashtirilganda tarjimaning tarjimasi
//    qidirilardi va matn buzilib ketardi.
//
//  ⚠ MutationObserver: JS yasagan yangi panellar ham avtomatik
//    tarjima qilinadi. O'zimiz kiritgan o'zgarishlarni qayta
//    tarjima qilmaslik uchun `_busy` qulfi bor.
// ============================================================

const LANGS = {
  uz: { code:'UZ', label:"O'zbek"  },
  ru: { code:'RU', label:'Русский' },
  en: { code:'EN', label:'English' },
};

// ── Lug'at: uz → { ru, en } ─────────────────────────────────
//   Kalit — interfeysdagi O'ZBEK matni (asl holat).
const DICT = {
  // Yuqori panel
  'Til':               ['Язык','Language'],
  'Saqlash':           ['Сохранить','Save'],
  'Yuklash':           ['Загрузить','Load'],
  'Bekor':             ['Отмена','Undo'],
  'Qayta':             ['Повтор','Redo'],
  'Screenshot':        ['Снимок','Screenshot'],
  'Fullscreen':        ['Полный экран','Fullscreen'],
  'Import GLB/GLTF':   ['Импорт GLB/GLTF','Import GLB/GLTF'],
  'Import':            ['Импорт','Import'],
  'Export':            ['Экспорт','Export'],
  // Menyu
  'SAHNA':             ['СЦЕНА','SCENE'],
  'MODULLAR':          ['МОДУЛИ','MODULES'],
  'KENGAYTMALAR':      ['РАСШИРЕНИЯ','EXTENSIONS'],
  'Skybox':            ['Небо','Skybox'],
  'Tuman':             ['Туман','Fog'],
  'Fon Rasm':          ['Фон','Background'],
  'Yorug\'lik':        ['Освещение','Lighting'],
  'Zarrachalar':       ['Частицы','Particles'],
  'Ovoz Tizimi':       ['Звук','Audio'],
  'Blender Anim':      ['Blender анимация','Blender anim'],
  // Panellar
  'IERARXIYA':         ['ИЕРАРХИЯ','HIERARCHY'],
  'ASSETLAR':          ['АКТИВЫ','ASSETS'],
  'INSPEKTOR':         ['ИНСПЕКТОР','INSPECTOR'],
  'ICHIGA QOSHISH':    ['ВЛОЖИТЬ','NEST'],
  'CANVAS':            ['ХОЛСТ','CANVAS'],
  'KONSOL':            ['КОНСОЛЬ','CONSOLE'],
  'TIMELINE':          ['ТАЙМЛАЙН','TIMELINE'],
  'Qidirish...':       ['Поиск...','Search...'],
  'Obyektni tanlang':  ['Выберите объект','Select an object'],
  'Tanlang':           ['Выберите','Select'],
  // Assetlar
  'Shakl':             ['Формы','Shapes'],
  'Entity':            ['Сущности','Entity'],
  'Prefab':            ['Префаб','Prefab'],
  'Model':             ['Модель','Model'],
  'Addons':            ['Дополнения','Addons'],
  'HARAKATLANUVCHI ENTITYLAR': ['ПОДВИЖНЫЕ СУЩНОСТИ','MOVING ENTITIES'],
  'SAQLANGAN PREFABLAR':       ['СОХРАНЁННЫЕ ПРЕФАБЫ','SAVED PREFABS'],
  'GLB / GLTF MODELLAR':       ['МОДЕЛИ GLB / GLTF','GLB / GLTF MODELS'],
  'Oyinchi':           ['Игрок','Player'],
  'Mashina':           ['Машина','Car'],
  'Hayvon':            ['Животное','Animal'],
  'Buyum':             ['Предмет','Item'],
  'Yo\'l (Path)':      ['Путь (Path)','Path'],
  'Matn bloki':        ['Текстовый блок','Text block'],
  'Kamera':            ['Камера','Camera'],
  'Prefab saqlash':    ['Сохранить префаб','Save prefab'],
  'GLB / GLTF Yuklash':['Загрузить GLB / GLTF','Load GLB / GLTF'],
  // Timeline
  'Hammasi':           ['Все','All'],
  'Kes':               ['Резать','Cut'],
  'Easing:':           ['Плавность:','Easing:'],
  'Smooth':            ['Плавно','Smooth'],
  'Linear':            ['Линейно','Linear'],
  'Bounce':            ['Отскок','Bounce'],
  'Elastic':           ['Упруго','Elastic'],
  'Back':              ['Назад','Back'],
  'Anim':              ['Анимация','Anim'],
  'Video':             ['Видео','Video'],
  'EASING':            ['ПЛАВНОСТЬ','EASING'],
  'TANGENT':           ['КАСАТЕЛЬНАЯ','TANGENT'],
  'Auto':              ['Авто','Auto'],
  'KO\'RINISH':        ['ВИДИМОСТЬ','VISIBILITY'],
  'Ko\'rinadi':        ['Видимый','Visible'],
  'Ko\'rinmaydi':      ['Скрытый','Hidden'],
  'O\'chirish':        ['Удалить','Delete'],
  'OVOZ KEYFRAME':     ['ЗВУКОВОЙ КЛЮЧ','SOUND KEYFRAME'],
  'Ovoz':              ['Звук','Sound'],
  'Hajm':              ['Громкость','Volume'],
  'Makoniy':           ['Пространственный','Spatial'],
  'EGRI CHIZIQ MUHARRIR': ['РЕДАКТОР КРИВЫХ','CURVE EDITOR'],
  // Holat qatori
  'Fizika:':           ['Физика:','Physics:'],
  'Snap:':             ['Привязка:','Snap:'],
  'Vaqt:':             ['Время:','Time:'],
  'Perspektiv':        ['Перспектива','Perspective'],
  // Tugmalar / title
  'Tanlash':           ['Выделение','Select'],
  'Ko\'chirish':       ['Перемещение','Move'],
  'Aylantirish':       ['Вращение','Rotate'],
  'O\'lchamni o\'zgartirish': ['Масштаб','Scale'],
  'Fizika':            ['Физика','Physics'],
  'Audio':             ['Звук','Audio'],
  'FPS kamera':        ['FPS камера','FPS camera'],
  'To\'liq ekran (F11)': ['Полный экран (F11)','Fullscreen (F11)'],
  'Yopish':            ['Закрыть','Close'],
  'Nusxalash (Ctrl+D)':  ['Дублировать (Ctrl+D)','Duplicate (Ctrl+D)'],
  'O\'chirish (Del)':    ['Удалить (Del)','Delete (Del)'],
  'Papka yaratish (Ctrl+F)': ['Создать папку (Ctrl+F)','New folder (Ctrl+F)'],
  'Papka qo\'shish':   ['Добавить папку','Add folder'],
  'Nusxalash':         ['Дублировать','Duplicate'],
  'Hammasini tanlash': ['Выбрать всё','Select all'],
  'Hammasini ochish':  ['Раскрыть всё','Expand all'],
  'Hammasini yopish':  ['Свернуть всё','Collapse all'],
  'Bolalarni ochish':  ['Раскрыть дочерние','Expand children'],
  'Bolalarni yopish':  ['Свернуть дочерние','Collapse children'],
  'Barcha keyframe':   ['Все ключи','All keyframes'],
  'Qo\'shimcha vositalar': ['Дополнительно','More tools'],
  'Collider ko\'rsat (C)': ['Показать коллайдер (C)','Show collider (C)'],
  'Filtrlar / Rang grading': ['Фильтры / Цветокоррекция','Filters / Color grading'],
  'HUD/Canvas muharrir': ['Редактор HUD/Canvas','HUD/Canvas editor'],
  'Tortib o\'lchov o\'zgartir': ['Потяните, чтобы изменить размер','Drag to resize'],
  'ZIP yoki JSON fayldan import': ['Импорт из ZIP или JSON','Import from ZIP or JSON'],
  'Bekor qilindi':     ['Отменено','Undone'],
};

// ── Holat ───────────────────────────────────────────────────
let currentLang = 'uz';
try { currentLang = localStorage.getItem('apex_lang') || 'uz'; } catch (e) {}
if (!LANGS[currentLang]) currentLang = 'uz';

// Asl (o'zbek) matnlar shu yerda saqlanadi — tarjimaning tarjimasi
// qidirilmasligi uchun.
const _orig = new WeakMap();
let _busy = false;

/** Lug'atdan tarjima. Topilmasa asl matn qaytadi. */
function tr(text, code) {
  const key = String(text).trim();
  if (!key) return text;
  if (code === 'uz') return key;
  const row = DICT[key];
  if (!row) return key;
  return (code === 'ru' ? row[0] : row[1]) || key;
}

const ATTRS = ['title', 'placeholder', 'aria-label'];

/** Bitta elementni (va bolalarini) tarjima qiladi. */
function _walk(root, code) {
  // Matn tugunlari
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      const tag = p.nodeName;
      // ⚠ SCRIPT/STYLE ichiga tegmaymiz — kodni tarjima qilib
      //   sahifani buzib qo'yardi. Konsol jurnali ham tegilmaydi:
      //   u vaqt belgisi bilan yozilgan tarix, qayta yozib bo'lmaydi.
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
      // ⚠ Konsol jurnaliga tegilmaydi: u vaqt belgisi bilan yozilgan
      //   TARIX. Qayta tarjima qilinsa o'tgan yozuvlar o'zgarib ketardi
      //   va yangi til bilan eski yozuv chalkashardi. Element id si —
      //   `console-body` (engine.js:6).
      if (p.closest && p.closest('#console-body')) return NodeFilter.FILTER_REJECT;
      return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  for (let n = it.nextNode(); n; n = it.nextNode()) nodes.push(n);
  for (const n of nodes) {
    if (!_orig.has(n)) _orig.set(n, n.nodeValue);
    const base = _orig.get(n);
    const key = base.trim();
    const out = tr(key, code);
    if (out !== key) n.nodeValue = base.replace(key, out);
    else n.nodeValue = base;
  }

  // Atributlar
  const els = root.querySelectorAll ? root.querySelectorAll('*') : [];
  const list = root.nodeType === 1 ? [root, ...els] : [...els];
  for (const el of list) {
    for (const a of ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      const store = '__i18n_' + a;
      if (el[store] === undefined) el[store] = el.getAttribute(a);
      const base = el[store];
      const out = tr(base, code);
      if (out !== base) el.setAttribute(a, out);
      else el.setAttribute(a, base);
    }
  }
}

/** Butun interfeysni tarjima qiladi. */
function apply(code) {
  if (!LANGS[code]) return false;
  currentLang = code;
  try { localStorage.setItem('apex_lang', code); } catch (e) {}
  _busy = true;
  try { _walk(document.body, code); } finally { _busy = false; }
  document.documentElement.setAttribute('lang', code);
  if (typeof log === 'function') log(`Til: ${LANGS[code].label}`, 'lok');
  return true;
}

/** Yangi yasalgan qismni tarjima qilish (tashqi chaqiruv uchun). */
function refresh(root) {
  if (currentLang === 'uz') return;
  _busy = true;
  try { _walk(root || document.body, currentLang); } finally { _busy = false; }
}

// ── JS yasagan panellar avtomatik tarjima qilinadi ──────────
//  ⚠ Inspektor, hitbox, timeline panellari har safar QAYTA
//    yasaladi — bir marta tarjima qilish yetarli emas.
function _observe() {
  if (!window.MutationObserver || !document.body) return;
  let pending = null;
  const mo = new MutationObserver(muts => {
    if (_busy || currentLang === 'uz') return;
    const roots = [];
    for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) roots.push(n);
    if (!roots.length) return;
    // Debounce — panel bir kadrda o'nlab element qo'shishi mumkin
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      _busy = true;
      try { for (const r of roots) if (r.isConnected) _walk(r, currentLang); }
      finally { _busy = false; }
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

// ── Menyu ───────────────────────────────────────────────────
window.showLangMenu = function (btn) {
  const old = document.getElementById('lang-menu-popup');
  if (old) { old.remove(); return; }

  const popup = document.createElement('div');
  popup.id = 'lang-menu-popup';
  const r = btn.getBoundingClientRect();
  popup.style.cssText =
    `position:fixed;top:${r.bottom + 4}px;left:${r.left}px;background:var(--panel2);` +
    'border:1px solid var(--border);border-radius:var(--r);padding:3px 0;z-index:9999;' +
    'box-shadow:0 6px 20px rgba(0,0,0,.6);font-family:\'Share Tech Mono\',monospace;min-width:150px';

  for (const [code, lang] of Object.entries(LANGS)) {
    const on = currentLang === code;
    const item = document.createElement('div');
    item.style.cssText =
      'padding:6px 12px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:8px;' +
      `color:${on ? 'var(--accent)' : 'var(--text)'}`;
    // ⚠ Bayroq EMOJISI ishlatilmaydi — interfeys ikonkalarga o'tkazilgan.
    //   Ikki harfli kod aniqroq va har platformada bir xil ko'rinadi
    //   (bayroq emojilari Windows da umuman chizilmaydi).
    const tag = document.createElement('span');
    tag.textContent = lang.code;
    tag.style.cssText =
      'font-size:9px;letter-spacing:.5px;padding:1px 4px;border-radius:var(--r);' +
      `border:1px solid ${on ? 'var(--accent)' : 'var(--border)'};` +
      `color:${on ? 'var(--accent)' : 'var(--muted)'};flex-shrink:0`;
    item.appendChild(tag);
    item.appendChild(document.createTextNode(lang.label));
    if (on) {
      const ck = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ck.setAttribute('class', 'ic');
      ck.style.marginLeft = 'auto';
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#i-check');
      ck.appendChild(use);
      item.appendChild(ck);
    }
    item.onmouseenter = () => { item.style.background = 'var(--hover)'; };
    item.onmouseleave = () => { item.style.background = ''; };
    item.onclick = () => { apply(code); popup.remove(); };
    popup.appendChild(item);
  }

  document.body.appendChild(popup);
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 50);
};

// ── Ishga tushish ───────────────────────────────────────────
//  ⚠ Tanlangan til DARHOL qo'llanadi. Ilgari `localStorage` dan
//    o'qilardi-yu, hech qachon ishlatilmasdi — sahifani qayta
//    ochganda interfeys yana o'zbekcha bo'lib qolardi.
function _init() {
  _observe();
  if (currentLang !== 'uz') apply(currentLang);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
else setTimeout(_init, 0);

window.LangSystem = {
  LANGS, DICT, tr, apply, refresh,
  current: () => currentLang,
  /** Lug'atga yangi yozuv qo'shish (kengaytmalar uchun). */
  extend(map) { Object.assign(DICT, map); refresh(); },
};


// ============================================================
//  ⚠ `log()` SHU FAYLDA e'lon qilingan va butun loyiha uni
//    ishlatadi — pastda saqlab qolindi. Olib tashlansa yuzlab
//    joyda `log is not defined` chiqardi.
// ============================================================

function log(msg, type = 'lg') {
  // ⚠ HIMOYALANGAN: `consoleEl` — `engine.js` dagi `const`. Agar `log()`
  //   engine.js yuklanishidan OLDIN chaqirilsa (masalan shu fayldagi til
  //   tiklanishi), `const` TDZ da bo'lib ReferenceError chiqarardi va
  //   butun ishga tushish uzilardi. `log()` loyihada yuzlab joyda
  //   ishlatiladi — u hech qachon yiqilmasligi kerak.
  let box = null;
  try { box = consoleEl; } catch (e) { box = null; }
  if (!box && typeof document !== 'undefined' && document.getElementById) {
    box = document.getElementById('console-body');
  }
  if (!box || !box.appendChild) {
    if (typeof console !== 'undefined') console.log('[apex]', String(msg).replace(/<[^>]*>/g, ''));
    return;
  }
  const t = new Date().toLocaleTimeString('uz', { hour12: false });
  const d = document.createElement('div');
  d.className = type;
  d.innerHTML = `<span class="lt">[${t}]</span>${msg}`;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}
