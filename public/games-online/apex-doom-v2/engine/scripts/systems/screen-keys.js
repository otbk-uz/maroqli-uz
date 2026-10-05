// ============================================================
//  ⌨🖥 SCREEN KEYS — klavishni EKRANGA chiqarish
// ------------------------------------------------------------
//  Klaviatura muharririda tugmani bosib → "🖥 Ekranga chiqarish"
//  desangiz, o'sha klavish ekranda tugma bo'lib paydo bo'ladi.
//  Uni bosish FIZIK klavishni bosish bilan AYNAN bir xil ishlaydi.
//
//  ── NEGA SINTETIK HODISA, NEGA `fpsKeys` YETARLI EMAS ────────
//  Loyihada klavish uch xil yo'l bilan o'qiladi:
//    1. `fpsKeys[code]`         — yurish, 🔊 ovoz bloki, 🔘 tugma
//    2. `PlayerController.keys` — o'yinchi kontrolleri
//    3. `document` keydown/up   — 🔫 gravitatsiya quroli, 🎬 animatsiya,
//                                 🚗 mashina, 🔢 MiniPad
//  Faqat `fpsKeys` ga yozsak, uchinchi guruh HECH NARSA sezmaydi:
//  ekrandagi E qulfni ochmasdi, blok ko'tarmasdi. Shuning uchun
//  uchalasi ham to'ldiriladi — `keybindings.js` dagi "alternativ
//  klavish" mexanizmi bilan AYNAN bir xil.
//
//  ⚠ `_altSynthetic` markeri MAJBURIY: `keybindings.js` sintetik
//    hodisani ko'rsa qayta ishlamaydi. Marker qo'yilmasa alternativ
//    klavish mantig'i uni yana tarqatib, cheksiz tsikl bo'lardi.
//
//  ── KOORDINATALAR ───────────────────────────────────────────
//  `x`, `y` — FOIZda (0…100), ya'ni ekran o'lchami o'zgarsa tugma
//  o'z joyida qoladi. Piksel ishlatsak 4K monitorda bir joyda,
//  telefonda butunlay boshqa joyda chiqardi.
//  `z` — chuqurlik (`z-index`): qaysi tugma qaysinisining ustida.
// ============================================================
window.ScreenKeys = (function () {
  'use strict';

  const ROOT_ID = 'apex-skeys';
  const CSS_ID  = 'apex-skeys-css';

  //  ⚠ Ro'yxat `window` da: sahna saqlash uni `serialize()` orqali
  //    oladi va `SystemRegistry` tizimni o'zi topadi (qo'lda ro'yxat yo'q).
  let _keys   = [];
  let _idC    = 0;
  let _editing = null;     // muharrirda tanlangan tugma id si

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);
  const _hasDoc  = () => typeof document !== 'undefined' && !!document.body;

  // ============================================================
  //  📐 STANDART TUGMA
  // ------------------------------------------------------------
  //  ⚠ Ekran O'RTASIDA (50/50) paydo bo'ladi — foydalanuvchi aynan
  //    shuni so'radi. Chekkada paydo bo'lsa yangi tugma boshqasining
  //    tagida qolib, "chiqmadi" bo'lib ko'rinardi.
  // ============================================================
  function _def(code, label) {
    return {
      id:     ++_idC,
      code:   code || 'KeyW',
      label:  (label != null) ? label : _lbl(code || 'KeyW'),
      x: 50, y: 50, z: 10,          // % , % , z-index
      w: 56, h: 56,                 // px
      radius: 10,
      bg:     'rgba(10,16,24,.72)',
      fg:     '#d8dee6',
      border: 'rgba(255,255,255,.22)',
      fontSize: 15,
      opacity: 1,
      css:    '',                   // qo'shimcha CSS (dizayner yozadi)
      hold:   true,                 // bosib turilsa — bosilgan holatda qoladi
      showInEdit: false,            // muharrirda ham ko'rinsinmi
      // 🎛 AllKey zonasi shu maydonlarni o'zgartiradi
      rot:    0,                    // burilish (daraja)
      vis:    true,                 // ko'rinadimi — timeline yashira oladi
    };
  }

  /** `KeyW` → `W`, `ArrowUp` → `↑` */
  function _lbl(code) {
    const M = {
      Space: 'SPACE', Enter: '↵', Escape: 'Esc', Tab: 'Tab', Backspace: '⌫',
      CapsLock: 'Caps', ShiftLeft: 'Shift', ShiftRight: 'Shift',
      ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt',
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    };
    if (M[code]) return M[code];
    return String(code || '').replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, '');
  }

  const list  = () => _keys;
  const find  = (id) => _keys.find(k => k.id === id) || null;
  const byCode = (code) => _keys.filter(k => k.code === code);

  /** Shu klavish allaqachon ekrandami? */
  const hasCode = (code) => _keys.some(k => k.code === code);

  function add(code, label) {
    const k = _def(code, label);
    _keys.push(k);
    _editing = k.id;
    render();
    _log(`🖥 [${k.label}] ekranga chiqarildi`, 'lok');
    return k;
  }

  function remove(id) {
    const i = _keys.findIndex(k => k.id === id);
    if (i < 0) return false;
    const k = _keys[i];
    //  ⚠ O'chirishdan OLDIN klavishni qo'yib yuboramiz. Aks holda
    //    tugma bosilgan holda o'chirilsa, `fpsKeys[code]` MANGU
    //    `true` bo'lib qolardi va o'yinchi to'xtovsiz yurardi.
    _up(k);
    _keys.splice(i, 1);
    if (_editing === id) _editing = _keys.length ? _keys[_keys.length - 1].id : null;
    render();
    return true;
  }

  function set(id, prop, val) {
    const k = find(id);
    if (!k) return false;
    //  ⚠ Kod almashsa eskisini qo'yib yuborish SHART — aks holda
    //    eski klavish bosilgan holatda osilib qolardi.
    if (prop === 'code' && k.code !== val) _up(k);
    k[prop] = val;
    render();
    return true;
  }

  const editing    = () => _editing;
  const setEditing = (id) => { _editing = id; render(); };

  // ============================================================
  //  ⌨ BOSISH — fizik klavish bilan AYNAN bir xil
  // ------------------------------------------------------------
  //  Uchala yo'l ham to'ldiriladi (yuqoridagi izohga qarang).
  //  ⚠ `_down` / `_up` IDEMPOTENT: bir necha marta chaqirilsa ham
  //    zarar yo'q. Sichqoncha tugma ustidan chiqib ketsa `mouseleave`
  //    ham, `mouseup` ham keladi — ikki marta qo'yib yuborish
  //    normal holat.
  // ============================================================
  function _syn(type, code, repeat) {
    if (typeof KeyboardEvent === 'undefined' || typeof document === 'undefined') return;
    try {
      const e = new KeyboardEvent(type, {
        code, key: code, bubbles: true, cancelable: true, repeat: !!repeat,
      });
      //  ⚠ MARKER. `keybindings.js` sintetik hodisani ko'rsa qayta
      //    tarqatmaydi — busiz alternativ-klavish mantig'i cheksiz
      //    tsiklga tushardi.
      e._altSynthetic = true;
      e._screenKey    = true;
      document.dispatchEvent(e);
    } catch (err) { /* eski brauzerda KeyboardEvent konstruktori cheklangan */ }
  }

  function _down(k) {
    if (!k || k._on) return;
    k._on = true;
    const c = k.code;
    //  ⚠ FIZIK holatni AVVAL eslab qolamiz. Pastda `_physKeys` ga
    //    o'zimiz ham qo'shamiz, ya'ni qo'yib yuborishda \"fizik klavish
    //    bosiqmi?\" degan savolga `_physKeys` ORQALI javob berib
    //    bo'lmaydi — u yerda BIZNING izimiz turadi. Busiz tugma
    //    hech qachon qo'yib yuborilmasdi va o'yinchi to'xtovsiz
    //    yurardi. (Test aynan shuni ushladi.)
    k._physWas = !!(window._physKeys && window._physKeys.has && window._physKeys.has(c));
    if (typeof window.fpsKeys === 'object' && window.fpsKeys) window.fpsKeys[c] = true;
    if (window.PlayerController && window.PlayerController.keys) window.PlayerController.keys[c] = true;
    //  ⚠ `_physKeys` — `camera-modes.js` dagi bosilgan klavishlar
    //    to'plami. Alternativ klavish mantig'i holatni shundan qayta
    //    hisoblaydi; qo'shmasak, boshqa klavish qo'yib yuborilganda
    //    bizniki ham o'chib ketardi.
    try { if (window._physKeys && window._physKeys.add) window._physKeys.add(c); } catch (e) {}
    _syn('keydown', c, false);
    render();
  }

  function _up(k) {
    if (!k || !k._on) return;
    k._on = false;
    const c = k.code;
    //  ⚠ Fizik klavish HAM bosilgan bo'lsa holatni O'CHIRMAYMIZ:
    //    o'yinchi W ni ushlab turib ekrandagi W ni bossa va qo'yib
    //    yuborsa, yurish to'xtab qolardi.
    //    Javob `_physWas` dan olinadi — `_physKeys` dan EMAS, chunki
    //    u yerda bizning o'z izimiz ham bor (yuqoridagi izohga qarang).
    const physDown = !!k._physWas;
    if (!physDown) {
      try { if (window._physKeys && window._physKeys.delete) window._physKeys.delete(c); } catch (e) {}
      if (typeof window.fpsKeys === 'object' && window.fpsKeys) window.fpsKeys[c] = false;
      if (window.PlayerController && window.PlayerController.keys) window.PlayerController.keys[c] = false;
    }
    k._physWas = false;
    _syn('keyup', c, false);
    render();
  }

  /** Bosib-qo'yib yuborish (hold o'chiq bo'lsa). */
  function tap(id) {
    const k = find(id); if (!k) return;
    _down(k);
    setTimeout(() => _up(k), 90);
  }

  /** Hamma tugmani qo'yib yuboradi (⏹ Stop, sahna almashuvi). */
  function releaseAll() { for (const k of _keys) _up(k); }

  // ============================================================
  //  🎨 CHIZISH
  // ============================================================
  function _style() {
    if (!_hasDoc() || document.getElementById(CSS_ID)) return;
    const s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = `
#${ROOT_ID}{ position:absolute; inset:0; pointer-events:none; z-index:56;
  font-family:'Share Tech Mono',monospace; overflow:hidden }
#${ROOT_ID} .sk{ position:absolute; display:flex; align-items:center; justify-content:center;
  pointer-events:auto; cursor:pointer; user-select:none; -webkit-user-select:none;
  transform:translate(-50%,-50%); transition:transform .06s, box-shadow .12s, background .12s;
  backdrop-filter:blur(3px); text-align:center; line-height:1; box-sizing:border-box }
#${ROOT_ID} .sk:active,#${ROOT_ID} .sk.on{ transform:translate(-50%,-50%) scale(.93) }
#${ROOT_ID} .sk.sel{ outline:2px dashed var(--accent3); outline-offset:3px }
#${ROOT_ID} .sk.ghost{ opacity:.45 }`;
    document.head.appendChild(s);
  }

  function _host() {
    return document.getElementById('cvp') || document.body;
  }

  // ============================================================
  //  👁 MUHARRIRDA KO'RSATISH — tepa menyudan boshqariladi
  // ------------------------------------------------------------
  //  ⚠ Bu KO'RINISH sozlamasi, sahna mazmuni EMAS: saqlanmaydi va
  //    ▶ Play ga ta'sir qilmaydi. O'yinda tugmalar baribir kerak,
  //    yashirsak o'yinchi ularni bosolmasdi.
  //  ⚠ Suyak gizmosi bilan bir xil naqsh — dizayner sahnani tozalab
  //    ko'rmoqchi bo'lganda tugmalar ko'rinishni to'sib turardi.
  let _showInEditor = true;
  const editorVisible = () => _showInEditor;
  function setEditorVisible(v) {
    _showInEditor = !!v;
    //  ⚠ Yashirishdan OLDIN hamma tugma qo'yib yuboriladi: bosilgan
    //    holatda yashirilsa `fpsKeys` da `true` bo'lib qolib, kamera
    //    o'z-o'zidan yurib ketardi.
    if (!_showInEditor) releaseAll();
    render();
    return _showInEditor;
  }
  const toggleEditorVisible = () => setEditorVisible(!_showInEditor);

  function render() {
    if (!_hasDoc()) return;
    _style();
    let r = document.getElementById(ROOT_ID);
    const playing = _playing();
    //  ⚠ Muharrirda tugmalar KO'RINADI (joylashtirish uchun), lekin
    //    BOSILMAYDI — aks holda dizayner tugmani surmoqchi bo'lganda
    //    o'yinchi yurib ketardi.
    //
    //  ⚠ XATO BOR EDI: bu yerda `k.showInEdit || _editing === k.id`
    //    filtri turardi. `showInEdit` standarti `false`, `_editing`
    //    esa BITTA tugma — ya'ni muharrirda FAQAT oxirgi chiqarilgan
    //    tugma ko'rinardi. W ni chiqarib, keyin D ni chiqarsangiz W
    //    g'oyib bo'lardi va joylashtirib bo'lmasdi.
    //
    //    Filtr `👁 Tugmalar` tepa tugmasi qo'shilgunga qadar
    //    ma'noli edi (ekranni to'sib qo'ymasin). Endi ko'rinishni
    //    o'sha tugma boshqaradi, bu filtr esa faqat zarar keltiradi.
    //  ⚠ `vis: false` — ⏱ timeline yashirgan tugma. FAQAT ▶ Play da
    //    hisobga olinadi: muharrirda ham yashirsak dizayner uni
    //    qaytadan ko'rsatolmasdi (tanlash uchun ko'rinishi kerak).
    const visible = (!playing && !_showInEditor)
      ? []
      : (playing ? _keys.filter(k => k.vis !== false) : _keys.slice());
    if (!visible.length) { if (r) r.remove(); return; }
    if (!r) { r = document.createElement('div'); r.id = ROOT_ID; _host().appendChild(r); }
    r.innerHTML = '';
    for (const k of visible) {
      const d = document.createElement('div');
      d.className = 'sk' + (k._on ? ' on' : '') + (!playing ? ' ghost' : '') +
                    (!playing && _editing === k.id ? ' sel' : '');
      d.dataset.skId = String(k.id);
      d.style.cssText =
        `left:${_num(k.x, 50)}%;top:${_num(k.y, 50)}%;z-index:${_num(k.z, 10)};` +
        `width:${_num(k.w, 56)}px;height:${_num(k.h, 56)}px;` +
        `border-radius:${_num(k.radius, 10)}px;background:${k.bg || 'rgba(10,16,24,.72)'};` +
        `color:${k.fg || '#d8dee6'};border:1px solid ${k.border || 'rgba(255,255,255,.22)'};` +
        `font-size:${_num(k.fontSize, 15)}px;opacity:${_num(k.opacity, 1)};` +
        //  ⚠ Burilish `translate` BILAN BIRGA yoziladi. Alohida
        //    `rotate(…)` yozsak u oldingi `transform` ni butunlay
        //    almashtirib, tugma markazlashuvi buzilardi (chapga–tepaga
        //    50% siljish yo'qolib, joyi o'zgarib ketardi).
        (_num(k.rot, 0) ? `transform:translate(-50%,-50%) rotate(${_num(k.rot, 0)}deg);` : '') +
        (k.css || '');
      d.textContent = k.label != null ? k.label : _lbl(k.code);
      d.title = `${k.label} → ${k.code}`;
      if (playing) _bind(d, k);
      else d.addEventListener('mousedown', (e) => {
        e.preventDefault(); e.stopPropagation();
        setEditing(k.id);
        if (typeof updateInspector === 'function') updateInspector();
      });
      r.appendChild(d);
    }
  }

  function _num(v, dflt) {
    const n = Number(v);
    return (isFinite(n)) ? n : dflt;
  }

  function _bind(el, k) {
    //  ⚠ `down` ham himoyalangan — `up` bilan bir xil sabab.
    const down = (e) => {
      try { if (e && e.preventDefault) e.preventDefault(); } catch (err) {}
      try { if (e && e.stopPropagation) e.stopPropagation(); } catch (err) {}
      if (k.hold === false) tap(k.id); else _down(k);
    };
    //  ⚠ `e` bo'lmasligi yoki to'liq bo'lmasligi MUMKIN: `mouseleave`,
    //    `touchcancel` va boshqa tizimlar tomonidan qo'lda chaqirilishi
    //    ham bor. Himoyasiz `e.stopPropagation()` shu yerda yiqilib,
    //    klavish BOSILGAN holatda osilib qolardi — o'yinchi to'xtovsiz
    //    yurardi va sababi ko'rinmasdi.
    const up = (e) => {
      try { if (e && e.stopPropagation) e.stopPropagation(); } catch (err) {}
      if (k.hold !== false) _up(k);
    };
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
    //  📱 Sensorli ekran — `passive:false` bo'lmasa `preventDefault`
    //    ishlamaydi va sahifa siljib ketadi.
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('touchcancel', up);
  }

  // ============================================================
  //  🔁 Play / Stop
  // ============================================================
  let _was = false;
  function update() {
    const p = _playing();
    if (p === _was) return;
    _was = p;
    //  ⚠ Holat almashganda hamma tugma qo'yib yuboriladi: ⏹ Stop
    //    paytida bosilgan tugma `fpsKeys` da `true` bo'lib qolsa,
    //    muharrirda kamera o'z-o'zidan yurib ketardi.
    releaseAll();
    //  ⚠ ⏱ Timeline nazorati ham tugaydi: aks holda animatsiya
    //    oxirgi kadr holatida QOTIB qolib, muharrirda tugma yashirin
    //    yoki qiyshaygan bo'lib turardi.
    render();
  }

  // ============================================================
  //  💾 Saqlash
  // ------------------------------------------------------------
  //  ⚠ `_on` — runtime (bosilganmi). Saqlanmaydi: aks holda sahna
  //    "tugma bosilgan" holatda yuklanardi.
  // ============================================================
  const SKIP = { _on: 1, _physWas: 1 };
  function serialize() {
    return { keys: _keys.map(k => {
      const o = {};
      for (const p in k) if (!SKIP[p]) o[p] = k[p];
      return o;
    }) };
  }

  function restore(data) {
    releaseAll();
    _keys = [];
    _idC = 0;
    const arr = (data && Array.isArray(data.keys)) ? data.keys : [];
    for (const raw of arr) {
      //  ⚠ Standart bilan BIRLASHTIRAMIZ: eski sahnalarda yangi
      //    maydonlar (`radius`, `opacity`, `hold`) yo'q va ular
      //    `undefined` bo'lib chizishni buzardi.
      const k = Object.assign(_def(raw.code, raw.label), raw);
      k.id = ++_idC;
      delete k._on;
      _keys.push(k);
    }
    _editing = _keys.length ? _keys[0].id : null;
    render();
  }

  function reset() { releaseAll(); _keys = []; _idC = 0; _editing = null; render(); }

  return {
    list, find, byCode, hasCode, add, remove, set,
    editing, setEditing, tap, releaseAll, render, update, reset,
    editorVisible, setEditorVisible, toggleEditorVisible,
    serialize, restore,
    _def, _lbl,          // testlar uchun
  };
})();
