// ============================================================
//  🖼 HUD — sozlanadigan ekran panellari
// ------------------------------------------------------------
//  ❤️ Jon, 🚗 mashina tablosi va istalgan boshqa yozuv — HTML va CSS
//  bilan. Dizayner ko'rinishni to'liq boshqaradi.
//
//  ── STANDART: ODDIY SON ─────────────────────────────────────
//  ⚠ Jon paneli standart holatda shunchaki `100` — fon YO'Q, ramka
//    YO'Q. Ilgari HUD qattiq yozilgan chiziq va ranglar bilan
//    kelardi va dizayner uni o'zgartira olmasdi. Endi bo'sh varaq:
//    kerak bo'lsa CSS yoziladi.
//
//  ── O'RIN TUTUVCHILAR ───────────────────────────────────────
//      {hp} {hpMax} {hp%}     — ❤️ jon
//      {n}  {n:Nom}           — 🔢 NoScript soni (faol yoki nomli slot)
//      {random} {random:1-56} — 🎲 tasodifiy son
//      {speed} {gear} {rpm}   — 🚗 mashina tablosi
//      {score} {time} {fps}   — o'yin holati
//
//  ⚠ Ular HAR KADR qayta hisoblanadi. `{random}` esa har kadr yangi
//    son beradi — bu ataylab: "aylanayotgan raqam" effekti uchun.
//
//  ── KO'RSATISH / YASHIRISH ──────────────────────────────────
//  🎯 Hitbox va 🔘 tugma orqali boshqariladi:
//      HudSystem.show('Jon') · hide() · toggle() · setHtml()
//
//  ⚠ NEGA HTML, NEGA CANVAS EMAS: `<canvas>` da matn chizish uchun
//    shrift, o'lcham va joylashuvni qo'lda hisoblash kerak. HTML/CSS
//    da esa dizayner bilgan narsalar ishlaydi: `flex`, `grid`,
//    `border-radius`, `text-shadow`, animatsiya. Va u DOM ustida
//    turadi, ya'ni WebGL kadriga aralashmaydi.
// ============================================================
window.HudSystem = (function () {
  'use strict';

  const ROOT = 'apex-hud';
  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);
  const _hasDoc  = () => typeof document !== 'undefined' && !!document.body;

  //  9 ta burchak/chekka — foizda, ya'ni ekran o'lchami o'zgarsa
  //  panel o'z joyida qoladi.
  const POS = {
    'top-left':      'top:12px;left:14px',
    'top-center':    'top:12px;left:50%;transform:translateX(-50%)',
    'top-right':     'top:12px;right:14px',
    'mid-left':      'top:50%;left:14px;transform:translateY(-50%)',
    'center':        'top:50%;left:50%;transform:translate(-50%,-50%)',
    'mid-right':     'top:50%;right:14px;transform:translateY(-50%)',
    'bottom-left':   'bottom:12px;left:14px',
    'bottom-center': 'bottom:12px;left:50%;transform:translateX(-50%)',
    'bottom-right':  'bottom:12px;right:14px',
    'free':          '',            // x/y foizda
  };

  let _idC = 0;

  function newPanel(name, html) {
    return {
      id:   ++_idC,
      name: name || ('Panel ' + _idC),
      on:   true,                    // ekranda ko'rinsinmi
      //  ⚠ Standart \u2014 ODDIY SON. Fon ham, ramka ham yo'q.
      html: (html != null) ? html : '{hp}',
      css:  '',
      pos:  'top-left',
      x: 50, y: 50,                  // `pos: 'free'` uchun (foizda)
      scale: 1,
      //  \u26a0 `_` SIZ nomlangan \u2014 hammasi sahna bilan saqlanadi.
    };
  }

  /** Sozlama — `SystemRegistry` orqali sahna bilan saqlanadi. */
  const cfg = { panels: [] };

  const list = () => cfg.panels;
  const find = (idOrName) => cfg.panels.find(p =>
    p.id === idOrName || String(p.name).toLowerCase() === String(idOrName).toLowerCase()) || null;

  function add(name, html) {
    const p = newPanel(name, html);
    cfg.panels.push(p);
    render();
    return p;
  }

  function remove(idOrName) {
    const p = find(idOrName);
    if (!p) return false;
    cfg.panels.splice(cfg.panels.indexOf(p), 1);
    //  \u26a0 DOM elementi ham o'chadi \u2014 aks holda panel ro'yxatdan
    //    ketgan bo'lsa ham ekranda qolib turardi.
    if (_hasDoc()) { const e = document.getElementById(ROOT + '-' + p.id); if (e) e.remove(); }
    render();
    return true;
  }

  function set(idOrName, prop, val) {
    const p = find(idOrName);
    if (!p) return false;
    p[prop] = val;
    render();
    return true;
  }

  // ── 🎯 Hitbox / 🔘 tugma uchun ──────────────────────────────
  const show   = (n) => set(n, 'on', true);
  const hide   = (n) => set(n, 'on', false);
  const toggle = (n) => { const p = find(n); return p ? set(n, 'on', !p.on) : false; };
  const setHtml = (n, h) => set(n, 'html', String(h == null ? '' : h));

  // ============================================================
  //  🔤 O'RIN TUTUVCHILAR
  // ------------------------------------------------------------
  //  ⚠ Har biri `try` ichida: tizim yo'q bo'lsa (eksport qilingan
  //    o'yinda ba'zi tizimlar bo'lmasligi mumkin) panel butunlay
  //    chizilmay qolmasin — o'rin tutuvchi shunchaki bo'sh qoladi.
  // ============================================================
  function _hp() {
    try { return Math.max(0, Math.round(gameState.health)); } catch (e) { return 0; }
  }
  function _hpMax() {
    try { return (playerSettings && playerSettings.maxHealth) || 100; } catch (e) { return 100; }
  }
  function _ns(slotName) {
    try {
      if (!window.NoScriptSystem) return '';
      if (!slotName) return NoScriptSystem.value();
      const s = NoScriptSystem.slots().find(x =>
        String(x.name).toLowerCase() === String(slotName).toLowerCase());
      return s ? NoScriptSystem.value(s.id) : '';
    } catch (e) { return ''; }
  }
  //  ⚠ Oraliq CHEKLANMAGAN: `{random:1-56}` shunchaki MISOL.
  //    Istalgan son ishlaydi — `{random:1-1000000}` ham.
  //
  //  ⚠ MANFIY son uchun NAQSH kerak. Ilgari `split('-')` edi va
  //    `{random:-10-10}` ni `['', '10', '10']` ga bo'lib, natija
  //    0…10 chiqardi — manfiy qism jimgina yo'qolardi.
  const _RANGE = /^\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)\s*$|^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/;

  function _rand(range) {
    let a = 0, b = 100;
    const m = range ? String(range).match(_RANGE) : null;
    if (m) {
      //  Ikki yozuv qo'llab-quvvatlanadi: `1-56` va `-10..10`.
      //  ⚠ Ikkinchisi manfiy son uchun ANIQROQ: `-10--5` chalkash,
      //    `-10..-5` esa o'qiladi.
      a = parseFloat(m[1] !== undefined ? m[1] : m[3]);
      b = parseFloat(m[2] !== undefined ? m[2] : m[4]);
    }
    if (!isFinite(a)) a = 0;
    if (!isFinite(b)) b = a;
    if (a > b) { const t = a; a = b; b = t; }
    return Math.floor(a + Math.random() * (b - a + 1));
  }
  function _car(what) {
    try {
      //  ⚠ `window.activeCar` VA global `activeCar` — ikkalasi ham
      //    tekshiriladi. Dvigatelda u oddiy global o'zgaruvchi bo'lib
      //    e'lon qilingan va `window` da ko'rinmasligi mumkin; faqat
      //    `window.` ni qarasak 🚗 tablo hech qachon to'lmasdi.
      const c = window.activeCar ||
                ((typeof activeCar !== 'undefined') ? activeCar : null);
      if (!c || !c.userData) return '';
      const ud = c.userData;
      if (what === 'speed') return Math.abs(Math.round((ud.speed || 0) * 3.6));
      if (what === 'gear')  return ud.gear != null ? ud.gear : '';
      if (what === 'rpm')   return Math.round(Math.abs(ud.speed || 0) * 240);
      return '';
    } catch (e) { return ''; }
  }

  // ============================================================
  //  📖 RO'YXAT — 🎨 Canvas muharririda ko'rsatiladi
  // ------------------------------------------------------------
  //  ⚠ YAGONA MANBA. Ro'yxatni panelda qo'lda yozsak, yangi o'rin
  //    tutuvchi qo'shilganda uni ikki joyda yangilash kerak bo'lardi
  //    va biri albatta unutilardi — dizayner mavjud imkoniyatni
  //    umuman bilmay qolardi.
  //
  //  ⚠ `resolve()` bilan bir tartibda turadi: argumentlilari OLDIN.
  //    Kim yangi tutuvchi qo'shsa, ikkalasiga ham qo'shadi — ular
  //    yonma-yon turgani buni eslatib turadi.
  const TOKENS = [
    { tag: '{hp}',           desc: "o'yinchining hozirgi joni" },
    { tag: '{hpMax}',        desc: "eng ko'p jon (standart 100)" },
    { tag: '{hp%}',          desc: 'jon foizda — shkala kengligi uchun' },
    { tag: '{n}',            desc: '🔢 NoScript soni — faol slot' },
    { tag: '{n:Nom}',        desc: '🔢 nomli slot: {n:Tanga}' },
    { tag: '{random}',       desc: 'tasodifiy son 0…100 — har kadr yangi' },
    { tag: '{random:1-56}',  desc: 'oraliqdan tasodifiy son — chegara yo\'q' },
    { tag: '{random:-5..5}', desc: 'manfiy oraliq uchun `..` yozuvi' },
    { tag: '{speed}',        desc: '🚗 mashina tezligi, km/h' },
    { tag: '{gear}',         desc: '🚗 uzatma (peredacha)' },
    { tag: '{rpm}',          desc: '🚗 dvigatel aylanishi' },
    { tag: '{score}',        desc: "o'yin hisobi" },
    { tag: '{time}',         desc: "o'yin vaqti, soniya" },
    { tag: '{fps}',          desc: 'kadr chastotasi' },
    //  🏆 Xonadagi natijalar — eng ko'p balldan pastga.
    { tag: '{mp-score}',       desc: '🏆 ro\'yxat: nom va ball' },
    { tag: '{mp-score-off-n}', desc: '🏆 faqat nomlar (ball ko\'rinmaydi)' },
    { tag: '{mp-score-on-n}',  desc: '🏆 faqat ballar (nom ko\'rinmaydi)' },
    { tag: '{mp-score:10}',    desc: '🏆 eng balandi 10 tasi (son — xohlagancha)' },
    { tag: '{mp-me}',          desc: 'mening o\'rnim: 1, 2, 3…' },
    { tag: '{mp-count}',       desc: 'xonadagi o\'yinchilar soni' },
  ];

  // ============================================================
  //  🏆 XONADAGI NATIJALAR
  // ------------------------------------------------------------
  //  ⚠ TARTIB har doim bir xil: eng ko'p balldan pastga. Manfiy
  //    ball ham to'g'ri joylashadi — 20 ball 10 dan yuqori, −5 esa
  //    eng pastda.
  //
  //  ⚠ OFFLINE bo'lsa BO'SH qaytadi, xato emas. Yakka o'yinda
  //    ro'yxat ma'nosiz va \"ulanmagansiz\" degan yozuv ekranda
  //    turib qolardi.
  //
  //  ⚠ Uch xil ko'rinish bir MANBADAN: tartib bir joyda
  //    hisoblanadi. Uchta alohida funksiya yozsak biri
  //    tuzatilib, ikkinchisi boshqacha tartiblab qolardi.
  // ============================================================
  function _mpRows() {
    try {
      const M = window.MultiplayerSystem;
      //  ⚠ `isOn()` SHART: ulanish yo'q bo'lsa eski ro'yxat
      //    ekranda qolib turardi.
      if (!M || !M.isOn || !M.isOn() || !M.scores) return [];
      return M.scores();       // allaqachon tartiblangan
    } catch (e) { return []; }
  }

  /**
   * @param {string} mode  'both' | 'off' | 'on'
   * @param {number} [top] nechtasini ko'rsatish (0 = hammasi)
   *
   * ⚠ `:N` — ENG BALANDLARI. Ro'yxat allaqachon tartiblangan,
   *   shu bois birinchi N ta olinadi. O'yinchining balli tushsa
   *   u ro'yxatdan CHIQADI va o'rniga keyingisi keladi —
   *   bu o'z-o'zidan shunday bo'ladi, alohida mantiq kerak emas.
   */
  function _mpScore(mode, top) {
    let rows = _mpRows();
    if (!rows.length) return '';
    //  ⚠ Chegara CHEKLANADI: `{mp-score:99999}` da butun ro'yxat
    //    chizilib, ekranni to'ldirardi.
    const n = Math.max(0, Math.min(100, +top || 0));
    if (n > 0) rows = rows.slice(0, n);
    const esc = (v) => String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return rows.map((r, i) => {
      const n = esc(r.name || ('Player ' + r.id));
      //  ⚠ `mp-score-off-n` — sonlar O'CHIQ, ya'ni faqat nomlar.
      //    Tartib BARIBIR ballga qarab: o'yinchi kim oldinda
      //    ekanini ko'radi, lekin raqamni emas.
      if (mode === 'off') return n;
      if (mode === 'on')  return String(r.score);
      return n + ': ' + r.score;
    }).join('<br>');
  }

  /** Matndagi o'rin tutuvchilarni almashtiradi. */
  function resolve(txt) {
    let s = String(txt == null ? '' : txt);
    //  \u26a0 Argumentlilari OLDIN: `{n}` naqshi `{n:Jon}` ni ham
    //    ushlab, ": Jon}" qoldig'ini qoldirardi.
    s = s.replace(/\{n:([^}]+)\}/g, (_, nm) => _ns(nm.trim()));
    //  ⚠ `[^}]*` — YULDUZ, plyus emas: `{random:}` (bo'sh oraliq) ham
    //    almashtirilishi kerak. Ilgari u xom matn bo'lib ekranda
    //    turardi va dizayner sababini topolmasdi.
    s = s.replace(/\{random:([^}]*)\}/g, (_, r) => _rand(r.trim()));
    s = s.replace(/\{hp%\}/g, () => {
      const m = _hpMax() || 1;
      return Math.round(_hp() / m * 100);
    });
    s = s.replace(/\{hpMax\}/g, () => _hpMax());
    s = s.replace(/\{hp\}/g, () => _hp());
    s = s.replace(/\{n\}/g, () => _ns(null));
    s = s.replace(/\{random\}/g, () => _rand(null));
    s = s.replace(/\{speed\}/g, () => _car('speed'));
    s = s.replace(/\{gear\}/g,  () => _car('gear'));
    s = s.replace(/\{rpm\}/g,   () => _car('rpm'));
    s = s.replace(/\{score\}/g, () => { try { return gameState.score || 0; } catch (e) { return 0; } });
    s = s.replace(/\{time\}/g,  () => { try { return (gameState.time || 0).toFixed(1); } catch (e) { return '0.0'; } });
    s = s.replace(/\{fps\}/g,   () => { try { return window._apexFps || ''; } catch (e) { return ''; } });
    //  🏆 UZUNROQ NOM OLDIN: `{mp-score}` naqshi
    //    `{mp-score-off-n}` ni ham ushlab, \"-off-n}\" qoldig'ini
    //    qoldirardi — bu xato `{n}` bilan allaqachon bir marta
    //    bo'lgan.
    //  ⚠ ARGUMENTLI shakl OLDIN: `{mp-score}` naqshi
    //    `{mp-score:10}` ni ham ushlab, \":10}\" qoldig'ini
    //    qoldirardi. Bu tuzoq `{n}` va `{mp-score-off-n}` bilan
    //    allaqachon IKKI marta bo'lgan.
    s = s.replace(/\{mp-score-off-n:(\d+)\}/g, (_, k) => _mpScore('off', +k));
    s = s.replace(/\{mp-score-on-n:(\d+)\}/g,  (_, k) => _mpScore('on', +k));
    s = s.replace(/\{mp-score:(\d+)\}/g,       (_, k) => _mpScore('both', +k));
    s = s.replace(/\{mp-score-off-n\}/g, () => _mpScore('off'));
    s = s.replace(/\{mp-score-on-n\}/g,  () => _mpScore('on'));
    s = s.replace(/\{mp-score\}/g,       () => _mpScore('both'));
    s = s.replace(/\{mp-count\}/g,       () => String(_mpRows().length));
    s = s.replace(/\{mp-me\}/g, () => {
      try {
        const M = window.MultiplayerSystem;
        if (!M || !M.isOn || !M.isOn()) return '';
        const me = M.myId();
        const i = _mpRows().findIndex(r => r.id === me);
        //  ⚠ Topilmasa BO'SH: 0 qaytarsak \"0-o'rin\" bo'lib
        //    ko'rinardi va o'yinchi chalkashardi.
        return i < 0 ? '' : String(i + 1);
      } catch (e) { return ''; }
    });
    return s;
  }

  // ============================================================
  //  🎨 Chizish
  // ============================================================
  function _root() {
    let r = document.getElementById(ROOT);
    if (!r) {
      r = document.createElement('div');
      r.id = ROOT;
      //  \u26a0 `pointer-events:none` \u2014 HUD sichqonchani TO'SMASLIGI kerak,
      //    aks holda uning ostidagi sahnani bosib bo'lmasdi.
      r.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:57;overflow:hidden';
      (document.getElementById('cvp') || document.body).appendChild(r);
    }
    return r;
  }

  function render() {
    if (!_hasDoc()) return;
    const playing = _playing();
    //  \u26a0 HUD faqat \u25b6 Play da. Muharrirda u sahnani to'sib turardi
    //    va dizayner obyektlarni tanlashda xalaqit berardi.
    if (!playing) {
      const r = document.getElementById(ROOT);
      if (r) r.remove();
      return;
    }
    const root = _root();
    const seen = {};
    for (const p of cfg.panels) {
      const key = ROOT + '-' + p.id;
      seen[key] = 1;
      let el = document.getElementById(key);
      if (!p.on) { if (el) el.style.display = 'none'; continue; }
      if (!el) {
        el = document.createElement('div');
        el.id = key;
        el.className = 'apex-hud-panel';
        root.appendChild(el);
      }
      el.style.display = '';
      const base = 'position:absolute;pointer-events:none;' +
                   "font-family:'Share Tech Mono',monospace;" +
                   `transform-origin:top left;`;
      const place = (p.pos === 'free')
        ? `left:${_num(p.x, 50)}%;top:${_num(p.y, 50)}%;`
        : (POS[p.pos] || POS['top-left']) + ';';
      //  \u26a0 Dizayner CSS si OXIRIDA \u2014 yuqoridagilarni ustidan yozadi.
      el.style.cssText = base + place + (p.css || '');
      if (_num(p.scale, 1) !== 1) {
        el.style.transform = (el.style.transform || '') + ` scale(${_num(p.scale, 1)})`;
      }
      const html = resolve(p.html);
      //  \u26a0 Faqat O'ZGARGANDA yozamiz: har kadr `innerHTML` yozish
      //    brauzerni qayta tahlil qilishga majbur qiladi va HUD
      //    animatsiyalari uzilib turardi.
      if (el._lastHtml !== html) { el.innerHTML = html; el._lastHtml = html; }
    }
    //  \u26a0 O'chirilgan panel ekranda QOLIB KETMASIN.
    try {
      const all = root.querySelectorAll && root.querySelectorAll('.apex-hud-panel');
      if (all) for (const e of all) if (!seen[e.id]) e.remove();
    } catch (e) {}
  }

  function _num(v, d) { const n = Number(v); return isFinite(n) ? n : d; }

  // ============================================================
  //  🔁 Kadr
  // ============================================================
  let _was = false;
  function update() {
    const p = _playing();
    if (p !== _was) {
      _was = p;
      //  \u26a0 \u25b6 Play boshlanganda standart panellar yaratiladi \u2014 faqat
      //    dizayner hech narsa qo'shmagan bo'lsa. Aks holda uning
      //    panellari ustiga standartlar qo'shilib ketardi.
      //  ⚠ AVTOMATIK PANEL YARATILMAYDI. Ilgari ▶ Play da \"Jon\"
      //    paneli o'zi paydo bo'lardi — va u 🎨 CANVAS bilan
      //    IKKI XIL joyda bir xil ishni qilardi. Dizayner canvas
      //    yaratib \"ishlamayapti\" deb o'ylardi, chunki ekranda
      //    boshqa tizimning paneli turardi.
      //    Endi HUD — faqat 🔤 o'rin tutuvchilar kutubxonasi;
      //    ko'rinishni 🎨 Canvas qiladi.
      render();
      return;
    }
    if (p) render();
  }

  /** Standart panellar \u2014 bo'sh sahnada. */
  function _defaults() {
    //  \u26a0 Jon \u2014 SHUNCHAKI `100`. Fon ham, ramka ham yo'q: dizayner
    //    o'zi xohlagan ko'rinishni yozadi.
    add('Jon', '{hp}');
    _log('\U0001f5bc HUD: "Jon" paneli yaratildi \u2014 \u2699\ufe0f Sozlamalar \u2192 \U0001f5bc HUD', 'lok');
  }

  // ============================================================
  //  💾 Saqlash
  // ============================================================
  function serialize() { return { panels: JSON.parse(JSON.stringify(cfg.panels)) }; }
  function restore(d) {
    cfg.panels = [];
    _idC = 0;
    const arr = (d && Array.isArray(d.panels)) ? d.panels : [];
    for (const raw of arr) {
      //  \u26a0 Standart bilan BIRLASHTIRAMIZ: eski sahnalarda yangi
      //    maydonlar (`scale`, `x`, `y`) yo'q va ular `undefined`
      //    bo'lib chizishni buzardi.
      const p = Object.assign(newPanel(raw.name, raw.html), raw);
      p.id = ++_idC;
      cfg.panels.push(p);
    }
    render();
  }
  function reset() { cfg.panels = []; _idC = 0; render(); }

  return { POS, TOKENS, cfg, list, find, add, remove, set, newPanel,
           _mpScore, _mpRows,
           show, hide, toggle, setHtml, resolve, render, update,
           serialize, restore, reset };
})();
