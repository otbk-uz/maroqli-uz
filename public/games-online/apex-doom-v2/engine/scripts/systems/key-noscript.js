// ============================================================
//  ⌨🔢 KEY → NOSCRIPT — klavishga son amali biriktirish
// ------------------------------------------------------------
//  ⌨ Klaviatura muharririda istalgan klavishga 🔢 NoScript raqami
//  ustida amal (+ − × ÷) biriktiriladi.
//
//  ── UCH REJIM ────────────────────────────────────────────────
//    🖱 Bosish (click) — klavish bosilganda BIR MARTA amal bajariladi.
//         "E bosilsa +10"
//
//    ⏳ Tomchi (drip) — BIR bosishda oqim boshlanadi va klavish
//         qo'yib yuborilsa ham davom etadi:
//         "dur soniya davomida, har `every` soniyada `step` ta"
//         Misol: 30 · 5 · 2 → 30 soniya davomida har 5 soniyada +2.
//
//    🖐 Bosma (hold) — FAQAT klavish bosib turilganda ishlaydi.
//         Qo'yib yuborilsa TO'XTAYDI.
//         Foydalanuvchi misoli: 100 · 10 · 1 →
//         100 soniyaning har 10 soniyasida 1 son beradi.
//
//  ── ISHLASH TARTIBI ──────────────────────────────────────────
//    Standart  — har bosishda ishlaydi.
//    Bir marta — butun o'yin davomida FAQAT bir marta.
//
//  ⚠ NEGA `fpsKeys` SO'ROVI, NEGA HODISA EMAS: ⌨🖥 ekran tugmalari
//    ham, alternativ klavishlar ham `fpsKeys` ni to'ldiradi.
//    `keydown` tinglasak ekrandagi tugma bilan bosilgan W bu yerda
//    ishlamasdi — ikki xil xulq paydo bo'lardi. So'rov ikkalasini
//    ham bir xil ko'radi.
//
//  ⚠ NEGA O'Z OQIMI, NEGA `NoScriptSystem.startDrip` EMAS: u OBYEKTGA
//    bog'langan (`stopDrip(obj)` obyekt bo'yicha qidiradi) va bir
//    obyektda bitta oqim bo'ladi. Klavishlar obyekt emas; ikki
//    klavish bir vaqtda oqim berishi normal holat.
// ============================================================
window.KeyNoScript = (function () {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);

  /** Har klavish uchun sozlama. `window._kbNoScript` bilan bir xil obyekt. */
  function _map() {
    if (!window._kbNoScript) window._kbNoScript = {};
    return window._kbNoScript;
  }

  const OPS  = ['+', '-', '×', '÷'];
  const MODES = { click: 1, drip: 1, hold: 1 };

  function defaults(code) {
    return {
      code:  code || '',
      op:    '+',
      value: 10,
      mode:  'click',      // click | drip | hold
      // ⏳/🖐 oqim: `dur` soniya davomida, har `every` soniyada `step` ta
      dur:   30,
      every: 5,
      step:  1,
      once:  false,        // ishlash tartibi: false = standart, true = bir marta
      // 🎰 Qaysi hisoblagich slotiga ta'sir qiladi.
      //  ⚠ `null` — \"faol slot\", tanlanmagan holat. Busiz klavish
      //    amallari HAR DOIM birinchi slotga tushardi va ko'p slotlik
      //    yarim ishlagan bo'lardi: blok va tugma slotni tanlaydi,
      //    klavish esa yo'q.
      slot:  null,
      // ── 🎲 TASODIFIY SON ──────────────────────────────────
      //  Yoqilsa `value` / `step` o'rniga `rndMin`…`rndMax` oralig'idan
      //  tasodifiy BUTUN son olinadi.
      //  ⚠ UCHALA rejimda ham ishlaydi:
      //    🖱 Bosish — har bosishda yangi son
      //    ⏳ Tomchi  — har ulushda yangi son
      //    🖐 Bosma   — har ulushda yangi son
      //  Ya'ni \"1 dan 56 gacha\" + \"100 soniyaning har 10 soniyasida\"
      //  birga ishlaydi — har 10 soniyada boshqa son keladi.
      rnd:    false,
      rndMin: 1,
      rndMax: 56,
    };
  }

  /** Klavishga amal biriktirish (mavjudi ustiga yoziladi). */
  function set(code, data) {
    if (!code) return null;
    const m = _map();
    m[code] = Object.assign(defaults(code), m[code] || {}, data || {});
    //  ⚠ Rejim ro'yxatda bo'lmasa `click` ga tushadi. Buzuq faylda
    //    noma'lum rejim `update()` da hech bir shoxga tushmay,
    //    klavish jimgina ishlamasdi.
    if (!MODES[m[code].mode]) m[code].mode = 'click';
    return m[code];
  }

  function get(code)   { return _map()[code] || null; }
  function remove(code) {
    stopFlow(code);
    delete _map()[code];
  }
  function list() { return Object.keys(_map()); }

  // ── Faol oqimlar (runtime — saqlanmaydi) ────────────────────
  const _flows = [];
  const flowCount = () => _flows.length;

  function startFlow(code, d, holdOnly) {
    const every = Math.max(0.05, Number(d.every) || 1);
    const dur   = Math.max(0, Number(d.dur) || 0);
    const step  = Number(d.step) || 0;
    //  ⚠ 🎲 Tasodif yoqilgan bo'lsa `step` ahamiyatsiz — miqdor
    //    oraliqdan olinadi. Buni hisobga olmasak \"1…56 tasodifiy\"
    //    sozlamasi `step: 0` tufayli jimgina ishlamasdi.
    if (!dur || (!step && !d.rnd)) {
      _log(`⚠ [${_lbl(code)}] oqim boshlanmadi: davomiylik yoki son nol`, 'lw');
      return false;
    }
    //  ⚠ Bir xil klavish QAYTA bosilsa eskisi TO'XTAYDI. Aks holda
    //    o'nta bosish o'nta oqim yasab, raqam nazoratdan chiqardi
    //    (🔘 tugmadagi tomchi bilan bir xil qoida).
    stopFlow(code);
    //  ⚠ Slot oqim BOSHLANGANDA eslab qolinadi: ijro paytida
    //    sozlama o'zgarsa ham ketayotgan oqim o'z slotida tugaydi.
    //  ⚠ `d` ning O'ZI saqlanadi (havola emas, kerakli maydonlar):
    //    har ulushda `_amount()` qayta chaqiriladi va yangi tasodifiy
    //    son beradi.
    _flows.push({ code, left: dur, t: 0, every, step, op: d.op || '+',
                  hold: !!holdOnly, slot: d.slot == null ? undefined : d.slot,
                  rnd: !!d.rnd, rndMin: d.rndMin, rndMax: d.rndMax });
    return true;
  }

  function stopFlow(code) {
    for (let i = _flows.length - 1; i >= 0; i--) if (_flows[i].code === code) _flows.splice(i, 1);
  }

  function stopAll() { _flows.length = 0; }

  function _lbl(code) {
    return String(code || '').replace(/^Key/, '').replace(/^Digit/, '');
  }

  // ============================================================
  //  🎲 Miqdor: aniq son yoki tasodifiy
  // ------------------------------------------------------------
  //  ⚠ `NoScriptSystem.randOne` QAYTA ISHLATILADI, o'z generatorimiz
  //    yozilmaydi. U butun son beradi va chegaralarni teskari
  //    yozilgan bo'lsa ham (56…1) to'g'rilaydi — ikkinchi nusxa
  //    yozsak, biri tuzatilib ikkinchisi eskicha qolib ketardi.
  //
  //  ⚠ HAR CHAQIRUVDA yangi son: oqim rejimida har ulush boshqa
  //    bo'lishi kerak. Bir marta hisoblab keshlasak \"tasodifiy\"
  //    butun oqim davomida bitta songa aylanardi.
  function _amount(d, fallback) {
    if (!d || !d.rnd) return fallback;
    const N = window.NoScriptSystem;
    if (!N || !N.randOne) return fallback;
    return N.randOne({ min: d.rndMin, max: d.rndMax });
  }

  /** Amalni bajaradi. */
  function _fire(code, d, why) {
    if (!window.NoScriptSystem) return false;
    const amt = _amount(d, d.value);
    NoScriptSystem.apply(d.op || '+', amt,
                         (why || ('⌨ ' + _lbl(code))) + (d.rnd ? ' 🎲' : ''),
                         d.slot == null ? undefined : d.slot);
    return true;
  }

  // ============================================================
  //  🔁 Kadr
  // ============================================================
  const _down = {};          // klavish holati (oldingi kadr)
  let _was = false;

  function update(delta) {
    const p = _playing();
    if (p !== _was) {
      _was = p;
      //  ⚠ ▶/⏹ o'tishida hamma narsa tozalanadi: oqim muharrirda
      //    davom etsa raqam o'z-o'zidan o'zgarib turardi.
      stopAll();
      for (const k in _down) delete _down[k];
      if (p) for (const c of list()) { const d = get(c); if (d) d._done = false; }
      return;
    }
    if (!p) return;

    const dt = Math.min(0.1, delta || 0.016);
    const keys = (typeof fpsKeys !== 'undefined' && fpsKeys) ? fpsKeys : null;

    for (const code of list()) {
      const d = get(code);
      if (!d || d.enabled === false) continue;
      const held  = !!(keys && keys[code]);
      const press = held && !_down[code];
      const rel   = !held && _down[code];
      _down[code] = held;

      //  ⚠ \"Bir marta\" TEKSHIRUVI bosishdan oldin: qulf ochilgan
      //    bo'lsa oqim ham qayta boshlanmasligi kerak.
      if (press) {
        if (d.once && d._done) continue;
        d._done = true;
        if (d.mode === 'click')      _fire(code, d);
        else if (d.mode === 'drip')  startFlow(code, d, false);
        else if (d.mode === 'hold')  startFlow(code, d, true);
      }
      //  🖐 Bosma — qo'yib yuborilsa TO'XTAYDI. ⏳ Tomchi esa davom
      //    etadi, shuning uchun `hold` bayrog'i tekshiriladi.
      if (rel) {
        for (const f of _flows) if (f.code === code && f.hold) { stopFlow(code); break; }
      }
    }

    // ── Oqimlarni yuritish ────────────────────────────────────
    for (let i = _flows.length - 1; i >= 0; i--) {
      const f = _flows[i];
      f.left -= dt;
      f.t    += dt;
      //  ⚠ `while`, `if` EMAS: kadr uzun bo'lsa (yuklash, lag) bir
      //    necha qadam o'tkazib yuborilmasin.
      while (f.t >= f.every) {
        f.t -= f.every;
        if (window.NoScriptSystem) {
          //  🎲 Har ulushda YANGI tasodifiy son — shuning uchun
          //    `_amount()` shu yerda chaqiriladi, oqim boshlanganda emas.
          const amt = Math.abs(_amount(f, f.step));
          NoScriptSystem.apply(f.op, amt,
            '⌨ ' + _lbl(f.code) + (f.hold ? ' 🖐' : ' ⏳') + (f.rnd ? ' 🎲' : ''),
            f.slot);
        }
      }
      if (f.left <= 0) _flows.splice(i, 1);
    }
  }

  // ============================================================
  //  💾 Saqlash
  // ------------------------------------------------------------
  //  ⚠ `_done` — o'yin borishi, sahna emas. Saqlansa \"bir marta\"
  //    klavishi qayta yuklangandan keyin ham ishlamay qolardi.
  // ============================================================
  function serialize() {
    const out = {};
    for (const c of list()) {
      const d = get(c); if (!d) continue;
      const o = {};
      for (const k in d) if (k[0] !== '_') o[k] = d[k];
      out[c] = o;
    }
    return { keys: out };
  }

  function restore(data) {
    stopAll();
    const m = _map();
    for (const k in m) delete m[k];
    const src = (data && data.keys) || {};
    for (const c in src) set(c, src[c]);
  }

  function reset() { stopAll(); const m = _map(); for (const k in m) delete m[k]; }

  return { set, get, remove, list, defaults, update, serialize, restore, reset,
           startFlow, stopFlow, stopAll, flowCount, OPS, MODES, _lbl };
})();
