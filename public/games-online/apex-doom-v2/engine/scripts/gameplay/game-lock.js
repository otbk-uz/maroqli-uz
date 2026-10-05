// ============================================================
//  🔒 GAME LOCK — eksport qilingan o'yinda REDAKTORNI o'chirish
//
//  ⚠ NEGA KERAK: `game-zip.js` o'yinni qurganda redaktorning BUTUN
//    DOM'i va BARCHA skriptlarini olib ketadi — UI faqat CSS bilan
//    yashiriladi (`#topbar{display:none}`). Sabab hujjatlashtirilgan:
//    dvigatel `$('inspector-content')`, `$('fps-d')` kabi o'nlab
//    elementga murojaat qiladi, ularni o'chirsak TypeError bo'lardi.
//
//    Lekin skriptlar TIRIK qoladi. Natijada o'yinchi:
//
//      • ⎋ Esc bossa — `keyboard.js:8` `$('play-btn').click()` qiladi
//        va o'yin TO'XTAYDI. Ekranda yashirin redaktor qoladi:
//        orbit kamera, o'yinchi yo'q, HUD yo'q — "o'yin buzildi".
//      • ⇧ Shift+klik — `orbit-controls.js` obyektni multi-select
//        qiladi, ko'k qobiq chiqadi.
//      • Ctrl+Z / Delete — sahnani tahrirlaydi.
//
//  ── ⚠ ASOSIY QAROR: KALITNI emas, AMALNI bloklaymiz ──────────
//    Birinchi o'yim `keydown` da Esc ni yutib yuborish edi. Bu NOTO'G'RI:
//    Esc o'yinning O'ZIDA ham ishlatiladi —
//        `pc-block.js:933`     ekrandan chiqish
//        `start-finish.js:436` intro roligini o'tkazib yuborish
//    Ularni ham o'ldirardik.
//
//    Shuning uchun `#play-btn` ning bosilishi o'ralади: o'yin ketayotgan
//    bo'lsa TO'XTATIB BO'LMAYDI. Esc klavishi o'z ishini qilaveradi,
//    lekin uning `play-btn.click()` ga borgan yo'li berk. Bitta qorovul —
//    Esc, F5 va kelajakda qo'shiladigan har qanday yo'l uchun.
//
//  ⚠ Bu modul REDAKTORDA hech nima qilmaydi: `enable()` ni faqat
//    o'yin boot skripti chaqiradi.
// ============================================================

const GameLock = (() => {
  'use strict';

  let _on = false;
  const _noop = function () {};

  const isGame = () => _on;
  const _cv = () => document.getElementById('three-canvas');

  // ── 1) O'yin TO'XTATIB bo'lmaydi ────────────────────────────
  //  `keyboard.js` (Esc/F5), toolbar tugmasi, skript — hammasi shu
  //  yagona tugmaga boradi. Yo'lni shu yerda kesamiz.
  function _lockPlayButton() {
    const pb = document.getElementById('play-btn');
    if (!pb || pb._apexLocked) return false;
    const orig = pb.onclick;
    pb.onclick = function (e) {
      // ⛔ O'yin ketayotgan bo'lsa — to'xtatish YO'Q.
      //    (Boshlashga ruxsat: boot aynan shu tugma bilan boshlaydi,
      //     ya'ni qorovul o'rnatilish TARTIBIGA bog'liq emas.)
      let playing = false;
      try { playing = !!(typeof isPlaying !== 'undefined' ? isPlaying : window.isPlaying); } catch (er) {}
      if (playing) { if (e) { e.preventDefault(); e.stopPropagation(); } return false; }
      return orig ? orig.call(this, e) : undefined;
    };
    pb._apexLocked = true;
    return true;
  }

  // ── 2) Tanlash / gizmo — butunlay o'chadi ───────────────────
  //  ⚠ `orbit-controls.js` kanvasga ANONIM listener qo'yadi —
  //    `removeEventListener` bilan olib bo'lmaydi. Shuning uchun
  //    hodisa kanvasgacha YETIB BORMAYDI: `window` dagi capture
  //    fazasi element listener'idan OLDIN ishlaydi.
  function _blockSelection() {
    const stop = (e) => {
      const cv = _cv();
      if (!cv || e.target !== cv) return;      // HUD / iframe bosishlariga tegmaymiz
      e.stopPropagation();
    };
    // `click` — tanlov; `mousedown/pointerdown` — gizmo tortish boshlanishi;
    // `dblclick` — fokus; `contextmenu` — kontekst menyu.
    for (const ev of ['click', 'mousedown', 'pointerdown', 'dblclick', 'contextmenu']) {
      window.addEventListener(ev, stop, true);
    }
    // Ikkinchi qavat: funksiyalarning o'zi ham jim tursin (skript yoki
    // tizim ichidan chaqirilsa). Top-level `function foo(){}` — bu
    // `window.foo`, ya'ni ustiga yozsak hamma joyda shu yangisi ishlaydi.
    for (const fn of ['selectObject', 'addToMultiSelect', 'clearMultiSelect',
                      'selectLight', 'updateGizmo', 'multiDelete', 'deleteSel',
                      'duplicateSel', 'multiGroup']) {
      try { if (typeof window[fn] === 'function') window[fn] = _noop; } catch (er) {}
    }

    // ── REDAKTOR OYNALARI ─────────────────────────────────────
    //  ⚠ Bular `document.body.appendChild(...)` bilan ochiladi, ya'ni
    //    `#main` ning ICHIDA emas — o'yin CSS'i (`#main > *:not(#center-col)`)
    //    ularni YASHIRMAYDI. Ochilib qolsa o'yin ustida osilib turadi va
    //    yopib bo'lmaydi (tugmalari yuqorida jim qilingan).
    //
    //    Asosiy himoya — eksportda toza `index.html` dan nusxa olish
    //    (`game-zip.js`). Bu esa RUNTIME qavati: biror skript yoki
    //    klavish ularni chaqirsa ham, oyna ochilmaydi.
    for (const fn of ['openMapSave', 'openMapLoad', 'saveScene', 'loadScene_ui',
                      'openGameExportMenu', 'exportGameZip', 'showFogPanel',
                      'showSoundPanel', 'openPrefabPanel', 'showHierCtx']) {
      try { if (typeof window[fn] === 'function') window[fn] = _noop; } catch (er) {}
    }
    try { if (window.MapLibrary && typeof MapLibrary.open === 'function') MapLibrary.open = _noop; } catch (er) {}
    try { if (window.SoundSystem && typeof SoundSystem.showPanel === 'function') SoundSystem.showPanel = _noop; } catch (er) {}
    // Qolgan ko'k qobiqni tozalaymiz
    try { if (typeof clearMultiOutlines === 'function') clearMultiOutlines(); } catch (er) {}
    try {
      if (typeof outlineMesh !== 'undefined' && outlineMesh && outlineMesh.parent) {
        outlineMesh.parent.remove(outlineMesh);
      }
    } catch (er) {}
  }

  // ── 3) Redaktor tugmalari ───────────────────────────────────
  //  ⚠ FAQAT modifikatorli va o'chiruvchi kombinatsiyalar. Harflarga
  //    TEGILMAYDI: o'yin `WASD`, `E` (interact), `G` (throw), `F`
  //    (nitro) ni ishlatadi. `Escape` ham TEGILMAYDI — u PC blokdan
  //    chiqish va intro o'tkazish uchun kerak (yuqoridagi izohga qarang).
  function _blockEditorKeys() {
    window.addEventListener('keydown', (e) => {
      const t = e.target;
      const tag = t && t.tagName;
      // Matn kiritish joyida — tegmaymiz (PC blok formasi, chat va h.k.)
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const code = e.code;
      const blocked =
        (ctrl && ['KeyS', 'KeyZ', 'KeyY', 'KeyD', 'KeyA', 'KeyC', 'KeyV'].indexOf(code) >= 0) ||
        code === 'Delete' || code === 'Backspace';
      if (!blocked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  }

  // ── 4) Sichqoncha qulfini qaytarish ─────────────────────────
  //  Esc bosilganda BRAUZER pointer lock'ni bo'shatadi — buni
  //  to'xtatib bo'lmaydi (xavfsizlik cheklovi, hech bir sayt buni
  //  bekor qila olmaydi). Shuning uchun kanvasga bosilganda qaytadan
  //  qulflaymiz: o'yinchi uchun Esc → bosish → o'yin davom etadi.
  function _relockPointer() {
    window.addEventListener('click', (e) => {
      const cv = _cv();
      if (!cv || e.target !== cv) return;
      if (document.pointerLockElement) return;
      if (window._pcCursorFree) return;          // PC blok ekranida kursor kerak
      try { cv.requestPointerLock(); } catch (er) {}
    }, true);
  }

  // ── 5) 🔊 OVOZNI BIRINCHI HARAKATDA YOQISH ──────────────────
  //  ⚠ MUAMMO: ovoz redaktorda yuqoridagi 🔊 tugma bilan yoqilardi
  //    (`toggleAudio`). O'yinda esa topbar `display:none` — ya'ni
  //    o'sha tugma YO'Q va `audioCtx` hech qachon yaratilmasdi.
  //    Natijada Sound Block, tugma ovozi, Key-Sound — hammasi jim.
  //
  //  ⚠ Nega o'zi yoqilmaydi: brauzer `AudioContext` ni FOYDALANUVCHI
  //    HARAKATIsiz ishga tushirishga ruxsat bermaydi (autoplay siyosati).
  //    Boot `play-btn` ni DASTUR bilan bosadi — bu harakat hisoblanmaydi.
  //    Shuning uchun birinchi haqiqiy bosish/klavishni kutamiz.
  //
  //  `SoundSystem._ensure()` — bitta chaqiruv hammasini qiladi:
  //  `audioCtx` yaratadi, `audioEnabled` ni yoqadi, to'xtatilgan
  //  bo'lsa davom ettiradi va protsedural ovozlarni generatsiya qiladi.
  function _audioOnGesture() {
    const go = () => {
      try {
        if (window.SoundSystem && typeof SoundSystem._ensure === 'function') {
          SoundSystem._ensure();
        } else if (typeof window.toggleAudio === 'function') {
          window.toggleAudio();
        }
      } catch (er) { /* ovoz yo'q — o'yin baribir ishlaydi */ }
      window.removeEventListener('pointerdown', go, true);
      window.removeEventListener('keydown', go, true);
    };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
  }

  /**
   * O'yin rejimini qulflaydi. Faqat eksport qilingan o'yin boot'i chaqiradi.
   * @returns {boolean} qulflandimi (ikkinchi chaqiruv `false`)
   */
  function enable() {
    if (_on) return false;
    _on = true;
    window.APEX_GAME = true;                     // manba fayllardagi qorovullar shuni o'qiydi
    try { document.documentElement.classList.add('apex-game'); } catch (er) {}
    _lockPlayButton();
    _blockSelection();
    _blockEditorKeys();
    _relockPointer();
    _audioOnGesture();
    // Play tugmasi hali DOM'da bo'lmasa — keyinroq yana urinamiz
    if (!document.getElementById('play-btn')) {
      setTimeout(_lockPlayButton, 300);
      setTimeout(_lockPlayButton, 1200);
    }
    return true;
  }

  return { enable, isGame, _lockPlayButton };
})();

window.GameLock = GameLock;
