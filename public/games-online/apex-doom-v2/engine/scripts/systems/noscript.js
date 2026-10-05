// ============================================================
//  🔢 NoScript — KODSIZ EVENT TIZIMI  v1.0  (build 58.45)
// ------------------------------------------------------------
//  Dizayner JavaScript yozmasdan gameplay mantiq quradi:
//
//      🔘 Tugma / 🎯 Hitbox  →  ± son  →  🔢 Raqam
//                                          ↓
//                                  🧊 NoScript Blok
//                                          ↓
//                                  shart bajarildimi?
//                                    ↓          ↓
//                                Slot 1      Slot 2
//                                  ↓            ↓
//                            🎬 animatsiya + 🔊 musiqa
//
//  ── ⚠ NEGA RAQAM MARKAZDA TURADI ────────────────────────────
//    Har bir tugma \"eshikni ochsin\" desa, o'nta tugma o'nta joyni
//    bilishi kerak bo'lardi. Raqam esa BITTA umumiy holat: tugma
//    faqat unga qo'shadi, blok esa faqat undan o'qiydi. Ikkalasi
//    bir-birini bilmaydi — shuning uchun ularni istagancha
//    ko'paytirish mumkin.
//
//  ── ⚠ NEGA \"BIR MARTA\" STANDART ─────────────────────────────
//    `>=` sharti bir marta bajarilgach DOIM rost bo'lib qoladi.
//    Har kadr tekshirilsa eshik sekundiga 60 marta ochilardi va
//    musiqa shovqinga aylanardi. Shuning uchun slot otilgach
//    yopiladi; \"Qayta\" ni dizayner ATAYLAB yoqadi.
//
//  ── ⚠ NEGA `fired` SAQLANMAYDI ──────────────────────────────
//    U — o'yin borishi, sahna emas. Saqlansa, o'yinni qayta
//    boshlaganда eshik allaqachon \"ochilgan\" hisoblanardi.
//    Shuning uchun ▶ Play boshida nolga tushadi.
// ============================================================

window.NoScriptSystem = (() => {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _objs = () => (typeof objects !== 'undefined' ? objects : []);
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);

  const OPS   = ['+', '-'];
  const CONDS = ['==', '>=', '<=', '>', '<'];

  // ============================================================
  //  🎰 SLOTLAR — har biri MUSTAQIL hisoblagich
  // ------------------------------------------------------------
  //  ⚠ Ilgari BUTUN dvigatelda BITTA raqam bor edi (`_num`). Ya'ni
  //    "tanga" va "jon" ni ayrim yuritib bo'lmasdi: ikkalasi bitta
  //    hisoblagichga tushardi. Bu v1.0 ning eng qattiq chegarasi edi.
  //
  //  Endi slotlar ro'yxati. Har slotning O'Z qiymati, O'Z ekran
  //  yozuvi va O'Z chegaralari bor. 🧊 Blok, 🔘 tugma va 🎯 hitbox
  //  qaysi slotga tegishli ekanini o'zi belgilaydi — slotning
  //  shkalasi FAQAT o'z bloklariga ta'sir qiladi.
  //
  //  ⚠ NOM CHALKASHUVI: 🧊 blok ichida ham `ns.slots` bor — ular
  //    SHARTLAR (">=100 bo'lsa eshik ochilsin"). Bular boshqa narsa.
  //    Chalkashmaslik uchun blok o'z hisoblagichini `ns.slotId`
  //    orqali ko'rsatadi, `ns.slots` esa avvalgidek shartlar ro'yxati.
  // ============================================================
  let _slotIdC = 0;

  function newSlot(name) {
    return {
      id:      ++_slotIdC,
      name:    name || ('Slot ' + (_slotIdC)),
      start:   0,
      // ⚠ Chegaralar MAJBURIY EMAS. `useMin`/`useMax` o'chiq bo'lsa
      //   raqam erkin o'sadi va kamayadi.
      useMax:  false, max: 100,
      useMin:  false, min: 0,
      ui:      true,                    // 🖥 ekranda ko'rsatilsinmi
      text:    'COLLECTED: {n}',        // {n} — qiymat
      pos:     'top-left',
      color:   'var(--accent3)',
      size:    22,
    };
  }

  /** Sozlamalar — sahna bilan saqlanadi. */
  const cfg = {
    slots: [ newSlot('Slot 1') ],
    // ── Ishlash tartibi ───────────────────────────────────────
    //  'all' — hamma slot BIRDANIGA ishlaydi (har biri mustaqil)
    //  'seq' — GALMA-GAL: bir vaqtda faqat bittasi faol
    mode: 'all',
    // ── Galma-gal rejimida keyingisiga qanday o'tiladi ────────
    //  'zero'   — faol slot NOLGA tushsa
    //  'target' — foydalanuvchi kiritgan songa YETSA
    seqRule:   'zero',
    seqTarget: 100,
    loop:      true,      // oxirgisidan keyin birinchisiga qaytsinmi
  };

  //  🔢 Joriy qiymatlar: { slotId: son } (runtime — saqlanmaydi)
  let _vals = {};
  let _active = 0;        // galma-gal rejimida faol slot INDEKSI
  let _dirty = true;

  // ── Slot topish ─────────────────────────────────────────────
  const slots = () => (Array.isArray(cfg.slots) && cfg.slots.length ? cfg.slots : (cfg.slots = [newSlot('Slot 1')]));

  /** Indeks bo'yicha xavfsiz slot. */
  function slotAt(i) {
    const a = slots();
    return a[Math.max(0, Math.min(a.length - 1, i | 0))];
  }

  /** Galma-gal rejimida FAOL slot; 'all' rejimida birinchisi. */
  function activeSlot() { return slotAt(cfg.mode === 'seq' ? _active : 0); }

  /**
   * `id` bo'yicha slot. Topilmasa — FAOL slot.
   * ⚠ Zaxira MAJBURIY: dizayner slotni o'chirsa, unga bog'langan
   *   bloklar `null` olib jimgina ishlamay qolardi. Endi ular faol
   *   slotga tushadi va sabab jurnalga yoziladi.
   */
  function slotById(id, why) {
    if (id == null) return activeSlot();
    const s = slots().find(x => x.id === id);
    if (s) return s;
    if (why && !_missWarn[id]) {
      _missWarn[id] = 1;
      _log(`⚠ ${why}: "${id}" slot topilmadi — faol slotga yo'naltirildi`, 'lw');
    }
    return activeSlot();
  }
  const _missWarn = {};

  /** Slot QATNASHYAPTIMI (galma-gal rejimida faqat faol slot). */
  function slotLive(s) {
    if (!s) return false;
    if (cfg.mode !== 'seq') return true;
    return s.id === activeSlot().id;
  }

  const value = (id) => {
    const s = slotById(id);
    const v = _vals[s.id];
    return (typeof v === 'number' && isFinite(v)) ? v : 0;
  };

  // ── Slot boshqaruvi (inspektor chaqiradi) ───────────────────
  function addSlot(name) {
    const s = newSlot(name);
    //  ⚠ Yangi slot ekranda eskisi USTIGA tushmasin: joylashuvni
    //    navbat bilan almashtiramiz. Aks holda ikkinchi
    //    "COLLECTED: 0" birinchisining ostida ko'rinmay qolardi.
    const P = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center'];
    s.pos = P[(slots().length) % P.length];
    slots().push(s);
    _vals[s.id] = Number(s.start) || 0;
    _dirty = true;
    _log(`🎰 "${s.name}" slot qo'shildi (jami ${slots().length})`, 'lok');
    return s;
  }

  function removeSlot(id) {
    const a = slots();
    //  ⚠ OXIRGI slotni o'chirib bo'lmaydi: hisoblagichsiz butun
    //    tizim ma'nosini yo'qotadi va bloklar "yo'q slot" ga
    //    bog'lanib qolardi.
    if (a.length <= 1) { _log('⚠ Oxirgi slotni o\'chirib bo\'lmaydi', 'lw'); return false; }
    const i = a.findIndex(s => s.id === id);
    if (i < 0) return false;
    const nm = a[i].name;
    a.splice(i, 1);
    delete _vals[id];
    if (_active >= a.length) _active = 0;
    //  ⚠ Unga bog'langan bloklar/tugmalar BIRINCHI slotga ko'chadi.
    //    Jimgina qoldirsak ular ishlamay qolardi va sabab
    //    ko'rinmasdi.
    let moved = 0;
    for (const o of _objs()) {
      const ud = o.userData; if (!ud) continue;
      if (ud.ns && ud.ns.slotId === id) { ud.ns.slotId = a[0].id; moved++; }
      if (ud.noscript && ud.noscript.slot === id) { ud.noscript.slot = a[0].id; moved++; }
    }
    _dirty = true;
    _log(`🎰 "${nm}" o'chirildi${moved ? ` — ${moved} ta obyekt "${a[0].name}" ga ko'chdi` : ''}`, 'lok');
    return true;
  }

  function setSlot(id, prop, val) {
    const s = slots().find(x => x.id === id);
    if (!s) return false;
    s[prop] = val;
    //  ⚠ `start` o'zgarsa ⏹ Stop holatida qiymat ham yangilanadi —
    //    aks holda dizayner "boshlang'ich 50" deb yozsa ham ekranda
    //    eski son turardi va sozlama ishlamayotgandek ko'rinardi.
    if (prop === 'start' && !_playing()) _vals[s.id] = Number(val) || 0;
    _dirty = true;
    return true;
  }

  // ============================================================
  //  🔢 Raqam
  // ============================================================
  /**
   * @param {number} v  yangi qiymat
   * @param {string} why  konsol uchun sabab
   * @param {number} [id] qaysi slot (yo'q bo'lsa — faol slot)
   */
  function set(v, why, id) {
    let n = Number(v);
    if (!isFinite(n)) return value(id);
    const s = slotById(id, why);
    // ⚠ GALMA-GAL: navbati kelmagan slotga tegilmaydi. Aks holda
    //   "2-bosqich" hisoblagichi 1-bosqich davomida ham to'lib
    //   ketardi va o'yin mantiqi buzilardi.
    if (!slotLive(s)) return value(s.id);
    // ── Chegaralar ──
    //  ⚠ Qirqish SET ning ichida: tugma, hitbox, drip, panel va
    //    timeline — hammasi shu yerdan o'tadi. Har chaqiruvchida
    //    alohida tekshirsak bittasi albatta unutilardi.
    //  ⚠ Chegara SLOTNIKI, umumiy emas — "slotning shkalasi faqat
    //    o'z bloklariga ishlaydi" degani shu.
    if (s.useMax && n > s.max) n = s.max;
    if (s.useMin && n < s.min) n = s.min;
    const old = value(s.id);
    _vals[s.id] = n;
    _dirty = true;
    if (old !== n) {
      _log(`🔢 [${s.name}] ${old} → ${n}${why ? '  (' + why + ')' : ''}`, 'lok');
      checkAll();
      _seqCheck(s);
    }
    return n;
  }

  // ============================================================
  //  🔁 GALMA-GAL — keyingi slotga o'tish
  // ------------------------------------------------------------
  //  Ikki usul (foydalanuvchi so'ragan):
  //    'zero'   — faol slot NOLGA tushsa keyingisiga o'tadi
  //    'target' — kiritilgan songa YETSA o'tadi
  //
  //  ⚠ Faqat FAOL slot tekshiriladi: boshqalari `slotLive()` da
  //    allaqachon to'silgan, ya'ni qiymati o'zgarmaydi.
  //
  //  ⚠ O'tish `set()` ICHIDAN chaqiriladi, ya'ni `checkAll()` dan
  //    KEYIN. Aks holda slot almashib bo'lgach shartlar yangi
  //    slotning qiymati bilan tekshirilib, eski slotning bloklari
  //    hech qachon ishlamasdi.
  // ============================================================
  function _seqCheck(s) {
    if (cfg.mode !== 'seq' || !s) return false;
    if (s.id !== activeSlot().id) return false;
    const v = value(s.id);
    const rule = cfg.seqRule || 'zero';
    const hit = (rule === 'zero') ? (v <= 0)
                                  : (v >= (Number(cfg.seqTarget) || 0));
    if (!hit) return false;
    return nextSlot('avtomatik');
  }

  /** Keyingi slotga o'tadi. @returns {boolean} o'tildimi */
  function nextSlot(why) {
    const a = slots();
    if (a.length < 2) return false;
    const from = a[_active];
    if (_active + 1 >= a.length) {
      //  ⚠ Oxirgisi: `loop` o'chiq bo'lsa TO'XTAYMIZ, aylanmaymiz.
      //    Aks holda "oxirgi bosqich" tugagach o'yin birinchisiga
      //    qaytib, cheksiz aylanardi.
      if (!cfg.loop) { _log(`🎰 "${from.name}" — oxirgi slot, navbat tugadi`, 'lok'); return false; }
      _active = 0;
    } else _active++;
    const to = a[_active];
    _dirty = true;
    _log(`🎰 "${from.name}" → "${to.name}"${why ? '  (' + why + ')' : ''}`, 'lok');
    //  ⚠ Yangi slot shartlari DARHOL tekshiriladi: uning qiymati
    //    allaqachon shartni qanoatlantirayotgan bo'lishi mumkin
    //    (masalan "<= 0" va boshlang'ich 0).
    checkAll();
    return true;
  }

  // ============================================================
  //  ➕ AMALLAR: + − × ÷
  // ------------------------------------------------------------
  //  ⚠ Ilgari faqat `+` va `−` bor edi: `op === '-' ? −a : +a`.
  //    Ya'ni istalgan boshqa belgi jimgina QO'SHISHGA aylanardi —
  //    dizayner `×` yozsa, raqam ko'paymasdan qo'shilardi va sabab
  //    ko'rinmasdi.
  //
  //  ⚠ NOLGA BO'LISH: matematik natija `Infinity`, u esa `set()`
  //    dagi chegara tekshiruvlaridan o'tib, raqamni buzardi va HUD
  //    da `Infinity` ko'rinardi. Bo'luvchi nol bo'lsa amal
  //    O'TKAZIB YUBORILADI va jurnalga yoziladi — jim yutmaymiz.
  // ============================================================
  function apply(op, amount, why, id) {
    const a = Number(amount) || 0;
    const s = slotById(id, why);
    if (!slotLive(s)) return value(s.id);
    const cur = value(s.id);
    let v;
    switch (op) {
      case '-': v = cur - a; break;
      case '*':
      case '×': v = cur * a; break;
      case '/':
      case '÷':
        if (a === 0) {
          _log(`⚠ ${why || 'amal'}: nolga bo'lish — o'tkazib yuborildi`, 'lw');
          return cur;
        }
        v = cur / a; break;
      default:  v = cur + a; break;      // '+' va noma'lum belgilar
    }
    if (!isFinite(v)) {
      _log(`⚠ ${why || 'amal'}: natija son emas — o'tkazib yuborildi`, 'lw');
      return cur;
    }
    return set(v, why, s.id);
  }

  function reset() {
    _vals = {};
    for (const s of slots()) {
      let n = Number(s.start) || 0;
      // ⚠ Boshlang'ich qiymat ham chegaraga bo'ysunadi
      if (s.useMax && n > s.max) n = s.max;
      if (s.useMin && n < s.min) n = s.min;
      _vals[s.id] = n;
    }
    //  ⚠ Galma-gal rejimi HAR DOIM birinchi slotdan boshlanadi.
    //    Aks holda o'yinni qayta boshlagan o'yinchi o'rtadagi
    //    bosqichdan davom etardi.
    _active = 0;
    _drips.length = 0;
    _rnds.length = 0;
    _dirty = true;
    // ⚠ Bloklar ham tozalanadi: `fired` — o'yin borishi.
    for (const b of blocks()) {
      const ns = b.userData.ns;
      if (!ns) continue;
      for (const s of (ns.slots || [])) s._fired = false;
    }
  }

  // ============================================================
  //  🔘 Tugma / 🎯 Hitbox
  // ============================================================
  /**
   * Obyektga biriktirilgan NoScript amalini bajaradi.
   * Tugma bosilganda va hitboxga kirilganda chaqiriladi.
   */
  function fireFrom(obj) {
    const n = obj && obj.userData && obj.userData.noscript;
    if (!n || n.enabled === false) return false;
    // ⚠ `once` — bitta kalitni ikki marta olib bo'lmasin. Buni
    //   tugmaning o'ziga qo'yamiz, raqamga emas.
    if (n.once && n._done) return false;
    n._done = true;
    const nm = obj.userData.name || 'noma\'lum';
    // 🎰 Tugma/hitbox QAYSI hisoblagichga ta'sir qiladi.
    //  ⚠ `n.slot` yo'q bo'lsa (eski sahna) — faol slot, ya'ni
    //    bitta slotli sahnalarda xulq AYNAN o'zgarmaydi.
    const sid = (n.slot != null) ? n.slot : undefined;
    apply(n.op || '+', n.value, nm, sid);

    // ── ⏳ TOMCHILAB BERISH ──────────────────────────────────
    //  Bosilgach N soniya davomida har `every` soniyada `step`
    //  qo'shadi yoki ayiradi: "+5, keyin 5 soniya davomida +1 +1…"
    //
    //  ⚠ Bir xil obyekt QAYTA bosilsa eskisi TO'XTAYDI. Aks holda
    //    o'nta bosish o'nta oqim yasab, raqam nazoratdan chiqardi.
    if (n.drip && n.drip.on) startDrip(obj, n.drip, sid);

    // ── 🎲 TASODIFIY SON ─────────────────────────────────────
    if (n.rnd && n.rnd.on) startRandom(obj, n.rnd, n.op || '+', nm, sid);
    return true;
  }

  /** ⏳ Faol tomchilar (runtime — saqlanmaydi). */
  const _drips = [];

  //  ⚠ `sid` — oqim QAYSI slotga tushishi. Oqim boshlanganda
  //    eslab qolinadi: ijro paytida dizayner blokni boshqa slotga
  //    ko'chirsa ham, ketayotgan oqim o'z slotida tugaydi.
  function startDrip(obj, d, sid) {
    const every = Math.max(0.05, Number(d.every) || 1);
    const dur   = Math.max(0, Number(d.dur) || 0);
    const step  = Number(d.step) || 0;
    if (!dur || !step) return false;
    stopDrip(obj);
    _drips.push({ obj, left: dur, t: 0, every, step, sid,
                  name: (obj.userData && obj.userData.name) || 'tomchi' });
    return true;
  }
  function stopDrip(obj) {
    for (let i = _drips.length - 1; i >= 0; i--) if (_drips[i].obj === obj) _drips.splice(i, 1);
  }
  const dripCount = () => _drips.length;

  function tickDrips(dt) {
    for (let i = _drips.length - 1; i >= 0; i--) {
      const d = _drips[i];
      d.left -= dt;
      d.t    += dt;
      // ⚠ `while`, `if` EMAS: kadr uzun bo'lsa (yuklash, lag) bir
      //   necha qadam o'tkazib yuborilmasin.
      while (d.t >= d.every) {
        d.t -= d.every;
        apply(d.step >= 0 ? '+' : '-', Math.abs(d.step), d.name + ' ⏳', d.sid);
      }
      if (d.left <= 0) _drips.splice(i, 1);
    }
  }

  const defaultOp = () => ({
    enabled: true, op: '+', value: 10, once: false,
    // ⏳ dur = necha soniya, every = qancha oraliqda, step = nechta
    drip: { on: false, dur: 5, every: 1, step: 1 },
    // ── 🎲 TASODIFIY SON ──────────────────────────────────────
    //  on    — yoqilganmi
    //  min/max — qaysi oraliqdan son olinadi (10…20)
    //  clicks — bir bosishda NECHA MARTA berilsin
    //  dur    — o'sha berishlar necha soniyaga cho'zilsin
    //
    //  ⚠ `clicks` 1 va `dur` 0 bo'lsa — oddiy bir martalik tasodif.
    //    `clicks` 5, `dur` 10 bo'lsa — 10 soniyaga cho'zib 5 ta son.
    rnd: { on: false, min: 1, max: 10, clicks: 1, dur: 0 },
  });

  // ============================================================
  //  🎲 TASODIFIY SON
  // ------------------------------------------------------------
  //  ⚠ NEGA `value` NI ALMASHTIRMAYDI: dizayner "+10 va ustiga
  //    tasodifiy 1…5" deyishi mumkin. Tasodif QO'SHIMCHA sifatida
  //    ishlaydi, asosiy qiymat esa joyida qoladi. Faqat tasodif
  //    kerak bo'lsa `value` ni 0 qilib qo'yiladi.
  //
  //  ⚠ Chegaralar SHU YERDA to'g'rilanadi: `min > max` bo'lsa
  //    almashtiriladi. Aks holda `Math.random()` manfiy oraliqda
  //    doim bir xil son qaytarardi.
  // ============================================================
  function randOne(r) {
    let a = Number(r.min), b = Number(r.max);
    if (!isFinite(a)) a = 0;
    if (!isFinite(b)) b = a;
    if (a > b) { const t = a; a = b; b = t; }
    // ⚠ Butun son: raqam hisoblagich, kasr ko'rsatish chalkash
    //   bo'lardi ("COLLECTED: 13.7241").
    return Math.floor(a + Math.random() * (b - a + 1));
  }

  /** 🎲 Faol tasodifiy oqimlar (runtime — saqlanmaydi). */
  const _rnds = [];

  function startRandom(obj, r, op, why, sid) {
    const clicks = Math.max(1, Math.floor(Number(r.clicks) || 1));
    const dur    = Math.max(0, Number(r.dur) || 0);

    // ⚠ Bir xil obyekt QAYTA bosilsa eskisi TO'XTAYDI — ⏳ tomchi
    //   bilan bir xil qoida. Aks holda o'nta bosish o'nta oqim
    //   yasab, raqam nazoratdan chiqardi.
    stopRandom(obj);

    // Darhol beriladigan birinchi ulush
    apply(op, randOne(r), why + ' 🎲', sid);
    if (clicks <= 1 || dur <= 0) return true;

    // ⚠ Qolgani TENG oraliqda taqsimlanadi: 5 ta son 10 soniyaga
    //   cho'zilsa — birinchisi darhol, qolgan 4 tasi har 2.5 s da.
    //   `clicks` ga bo'lsak oxirgisi vaqt tugagach kelardi.
    const every = dur / (clicks - 1);
    _rnds.push({ obj, left: clicks - 1, t: 0, every, r, op, sid,
                 name: (obj.userData && obj.userData.name) || 'tasodif' });
    return true;
  }

  function stopRandom(obj) {
    for (let i = _rnds.length - 1; i >= 0; i--) if (_rnds[i].obj === obj) _rnds.splice(i, 1);
  }
  const randCount = () => _rnds.length;

  function tickRandom(dt) {
    for (let i = _rnds.length - 1; i >= 0; i--) {
      const q = _rnds[i];
      q.t += dt;
      // ⚠ `while` — uzun kadr (yuklash, lag) bo'lsa qadamlar
      //   o'tkazib yuborilmasin.
      while (q.t >= q.every && q.left > 0) {
        q.t -= q.every;
        q.left--;
        apply(q.op, randOne(q.r), q.name + ' 🎲', q.sid);
      }
      if (q.left <= 0) _rnds.splice(i, 1);
    }
  }

  // ============================================================
  //  🧊 NoScript Blok
  // ============================================================
  const blocks = () => _objs().filter(o => o && o.userData && o.userData.isNoScript);

  function defaultBlock() {
    return { globalTarget: 100, slots: [] };
  }
  function defaultSlot() {
    return {
      target: null,          // null = umumiy nishondan olinadi
      cond:   '>=',
      mode:   'once',        // once | repeat
      name:   '',
      // 🎬 animatsiya
      keyframes: [], targetObjectId: null, sourceName: '', speed: 1,
      // 🔊 musiqa
      soundUrl: null, soundName: '',
      // ⚡ boshqa obyektni ishga tushirish (🎯 hitbox · 🔘 tugma · 🗺 map)
      actId: null,
    };
  }

  /** Slotning amaldagi nishoni. */
  function slotTarget(ns, slot) {
    // ⚠ `ns` yo'q bo'lishi mumkin: eski sahnadan yuklangan blok yoki
    //   tashqaridan chaqirilgan `fireSlot`. Ilgari bu yerda
    //   `ns.globalTarget` bevosita o'qilardi va TypeError chiqarardi —
    //   eksport qilingan o'yinda esa `main-loop._safe` butun NoScript
    //   tizimini o'sha kadrdan boshlab o'chirib qo'yardi.
    if (!ns) ns = {};
    if (!slot) slot = {};
    // ⚠ `null` va `0` FARQLI: 0 — haqiqiy nishon (\"jon tugadi\"),
    //   `null` esa \"umumiydan ol\". `slot.target || global` yozsak
    //   nolinchi nishon jimgina umumiyga almashib ketardi.
    return (slot.target === null || slot.target === undefined || slot.target === '')
      ? Number(ns.globalTarget) || 0
      : Number(slot.target) || 0;
  }

  function test(cond, num, target) {
    switch (cond) {
      case '==': return num === target;
      case '>=': return num >= target;
      case '<=': return num <= target;
      case '>':  return num >  target;
      case '<':  return num <  target;
      default:   return false;
    }
  }

  // ============================================================
  //  🔁 QAYTA KIRISH QO'RIQCHISI
  // ------------------------------------------------------------
  //  ⚠ `set()` → `checkAll()` → `fireSlot()` → `⚡ Ishga` boshqa
  //    tugmani otadi → o'sha tugma raqamga ta'sir qiladi → yana
  //    `set()`. Ya'ni `checkAll` O'Z ICHIDA qayta ishga tushadi.
  //
  //    Amalda `_fired` qulflari zanjirni odatda 2-3 qadamda uzadi
  //    (sinalgan). Lekin bu TASODIF: "🔁 Qayta" rejimidagi ikki blok
  //    bir-birini quvsa (biri +10, ikkinchisi −10) zanjir uzilmaydi
  //    va stek to'lib ketadi. Yomoni — `fireSlot` dagi `catch` uni
  //    JIMGINA yutardi: o'yin \"nimadir ishlamayapti\" bo'lib qolardi,
  //    konsolda esa hech nima.
  //
  //    Chuqurlik 8 — dizayner uchun mo'l (zanjirli mantiq kamdan-kam
  //    3 qadamdan oshadi), cheksiz halqa uchun esa yetarlicha past.
  const _MAX_DEPTH = 8;
  let _depth = 0;
  let _deepWarned = false;

  /** Hamma blokdagi hamma slotni tekshiradi. */
  function checkAll() {
    if (!_playing()) return 0;
    if (_depth >= _MAX_DEPTH) {
      if (!_deepWarned) {
        _deepWarned = true;
        _log(`⚠ 🧊 NoScript: zanjir ${_MAX_DEPTH} qavatdan oshdi — to'xtatildi. ` +
             "Ikki blok bir-birini \"🔁 Qayta\" rejimida quvyapti bo'lishi mumkin.", 'lw');
      }
      return 0;
    }
    _depth++;
    try { return _checkAllInner(); }
    finally { _depth--; }
  }

  function _checkAllInner() {
    let n = 0;
    for (const b of blocks()) {
      const ns = b.userData.ns;
      if (!ns || !ns.slots) continue;
      // 🎰 Blok QAYSI hisoblagichni tinglaydi
      //  ⚠ `ns.slotId` yo'q bo'lsa (eski sahna) — birinchi slot.
      //    Shunda eski fayllar AYNAN oldingidek ishlaydi.
      const own = (ns.slotId != null) ? slotById(ns.slotId, b.userData.name) : slotAt(0);
      //  ⚠ GALMA-GAL: navbati kelmagan slotning bloklari ISHLAMAYDI.
      //    Aks holda \"2-bosqich\" eshigi 1-bosqich davomida ochilib
      //    ketardi — galma-gal rejimining butun ma'nosi yo'qolardi.
      if (!slotLive(own)) continue;
      const val = value(own.id);
      for (let i = 0; i < ns.slots.length; i++) {
        const s = ns.slots[i];
        const ok = test(s.cond || '>=', val, slotTarget(ns, s));
        if (!ok) {
          // ⚠ `repeat` da shart YOLG'ONGA tushganda qulf ochiladi —
          //   aks holda \"qayta\" rejimi ham bir martalik bo'lardi.
          if (s.mode === 'repeat') s._fired = false;
          continue;
        }
        if (s._fired) continue;
        s._fired = true;
        fireSlot(b, s, i);
        n++;
      }
    }
    return n;
  }

  /** 🎬 animatsiya + 🔊 musiqa. */
  function fireSlot(block, slot, idx) {
    const nm = slot.name || ('Slot ' + (idx + 1));
    const _own = (block.userData.ns && block.userData.ns.slotId != null)
      ? slotById(block.userData.ns.slotId) : slotAt(0);
    _log(`🧊 "${block.userData.name}" [${_own.name}] → ${nm} (${slot.cond} ${slotTarget(block.userData.ns, slot)})`, 'lok');

    // 🔊 Musiqa
    if (slot.soundUrl) _playSound(slot.soundUrl);

    // ── ⚡ Boshqa obyektni ishga tushirish ──────────────────
    //  ⚠ Har birining O'Z yo'li chaqiriladi, taqlid qilinmaydi:
    //    hitboxning amallari, tugmaning rejimi va map loaderning
    //    yuklash qo'riqchisi murakkab — ularni qaytadan yozsak
    //    ikkita xulq paydo bo'lardi.
    if (slot.actId != null && slot.actId !== '') {
      const tgt = _objs().find(o => String(o.userData?.id) === String(slot.actId));
      if (!tgt) {
        _log(`⚠ ${nm} — ishga tushiriladigan obyekt topilmadi`, 'lw');
      } else {
        const u = tgt.userData;
        try {
          if (u.isHitbox && window._hbForceFire) {
            window._hbForceFire(tgt);
            _log(`⚡ 🎯 "${u.name}" o'yinchisiz ishga tushdi`, 'lok');
          } else if (u.isInteractiveBtn && window.InteractiveButtonSystem) {
            window.InteractiveButtonSystem.fire(tgt);
            _log(`⚡ 🔘 "${u.name}" bosildi`, 'lok');
          } else if (u.isMapLoader && window.MapLoaderSystem && window.MapLoaderSystem.forceLoad) {
            window.MapLoaderSystem.forceLoad(tgt);
          } else if (u.isMiniPad && window.MiniPadSystem) {
            window.MiniPadSystem.fire(tgt);
          } else {
            _log(`⚠ ${nm} — "${u.name}" ni ishga tushirib bo'lmaydi`, 'lw');
          }
        } catch (e) {
          // ⚠ Ilgari bu `catch (e) {}` edi — BO'SH. Zanjir stekni
          //   to'ldirsa yoki maqsad tizimda xato bo'lsa, u hech
          //   qayerda ko'rinmasdi. Endi bir marta jurnalga tushadi.
          _log(`❌ ${nm} → "${u.name}": ${e && e.message ? e.message : e}`, 'le');
        }
      }
    }

    // 🎬 Animatsiya — dvigatelning O'Z ijrochisi
    // ⚠ Ikkinchi animatsiya dvigatelini yozmaymiz: tezlik, loop va
    //   to'xtatish qoidalari ikki xil bo'lib ketardi.
    const kfs = Array.isArray(slot.keyframes) ? slot.keyframes : [];
    if (!kfs.length) return;
    const target = _objs().find(o => String(o.userData?.id) === String(slot.targetObjectId));
    if (!target) { _log(`⚠ ${nm} — maqsad obyekt topilmadi`, 'lw'); return; }
    if (typeof TimelineExportSystem === 'undefined' || !TimelineExportSystem.playObjectKeyframes) return;
    try {
      TimelineExportSystem.playObjectKeyframes({
        target, keyframes: kfs, direction: 'forward',
        speed: slot.speed || 1, loop: false,
      });
    } catch (e) {
      _log(`❌ ${nm} — animatsiya ijro etilmadi: ${e && e.message ? e.message : e}`, 'le');
    }
  }

  const _audio = new Map();

  // ============================================================
  //  🔊 Kesh kaliti
  // ------------------------------------------------------------
  //  ⚠ Ilgari: `String(url).slice(0, 100)`. Bu XATO edi.
  //
  //    `soundUrl` — `readAsDataURL` bergan data URL. Prefiks
  //    (`data:audio/wav;base64,`) 23 belgi, demak kalitga faylning
  //    atigi ~57 bayti tushardi. WAV da birinchi 44 bayt — SARLAVHA,
  //    ya'ni haqiqiy tovushdan 13 bayt qolardi. Boshida jimlik bo'lgan
  //    ikki fayl (juda keng holat) AYNAN bir xil kalit berardi va
  //    ikkinchi slot birinchisining ovozini ijro etardi.
  //
  //    O'lchov (8 kHz, 30 ms jimlik, 440 Hz va 880 Hz):
  //        a: …ZGF0YUAfAAAAAAAAAAAAAAAAAAAAAA
  //        b: …ZGF0YUAfAAAAAAAAAAAAAAAAAAAAAA   ← bir xil
  //
  //  ⚠ NEGA TO'LIQ URL EMAS: data URL o'nlab MB bo'lishi mumkin;
  //    uni Map kaliti qilsak har ijroda uzun satr solishtiriladi.
  //    UZUNLIK + BOSH + DUM — O(1) va amalda to'qnashmaydi:
  //    ikki fayl bir xil kalit olishi uchun hajmi ham, boshi ham,
  //    OXIRI ham bir xil bo'lishi kerak.
  // ============================================================
  function _audioKey(url) {
    const s = String(url || '');
    return s.length + '\u0000' + s.slice(0, 64) + '\u0000' + s.slice(-64);
  }

  //  ⚠ Kesh CHEKLANGAN: `_audio` hech qachon tozalanmasdi va har bir
  //    yozuv data URL ni ushlab turardi. Uzun sessiyada (karta
  //    almashuvi, ko'p slot) bu sof xotira oqishi edi.
  const _AUDIO_MAX = 32;

  function _playSound(url) {
    if (!url) return null;
    if (typeof Audio === 'undefined') return null;   // test / server muhiti
    try {
      const key = _audioKey(url);
      let a = _audio.get(key);
      if (!a) {
        if (_audio.size >= _AUDIO_MAX) {
          // Eng eski yozuvni chiqaramiz (Map tartibni saqlaydi)
          const first = _audio.keys().next();
          if (!first.done) {
            const old = _audio.get(first.value);
            try { old.pause(); } catch (e) {}
            _audio.delete(first.value);
          }
        }
        a = new Audio(url); a.volume = 0.9; _audio.set(key, a);
      }
      a.currentTime = 0;
      a.play().catch(() => {});
      return a;
    } catch (e) {
      _log('⚠ 🔊 ovoz ijro etilmadi: ' + (e && e.message ? e.message : e), 'lw');
      return null;
    }
  }

  /**
   * ⏹ Hamma ovozni to'xtatadi.
   * ⚠ Stop bosilganda SHART: aks holda slot ochgan musiqa muharrirda
   *   ijro bo'lishda davom etardi va uni to'xtatish yo'li yo'q edi.
   */
  function stopAllSounds() {
    for (const a of _audio.values()) {
      try { a.pause(); a.currentTime = 0; } catch (e) {}
    }
  }

  // ============================================================
  //  🧊 Blok yaratish
  // ============================================================
  function createBlock(pos) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.MeshStandardMaterial({
      color: 0x2a3644, roughness: 0.6, metalness: 0.2,
      emissive: 0x0d2a1a, emissiveIntensity: 0.5,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData = {
      // ⚠ `objIdC` — `objId` emas (minipad.js:229 dagi bilan bir xil xato edi).
      id: (typeof objIdC !== 'undefined') ? ++objIdC : Date.now(),
      name: 'NoScript ' + (blocks().length + 1),
      type: 'Kub',                      // ⚠ oddiy kub: model/tekstura beriladi
      isNoScript: true,
      ns: defaultBlock(),
      colliderMode: 'inline',
    };
    mesh.position.copy(pos || new THREE.Vector3(0, 1, 0));
    scene.add(mesh);
    objects.push(mesh);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof selectObject === 'function') selectObject(mesh);
    _log('🧊 NoScript blok qo\'shildi', 'lok');
    return mesh;
  }

  // ============================================================
  //  🖥 Ekrandagi raqam
  // ============================================================
  //  ⚠ HAR SLOTNING O'Z elementi: `apex-ns-ui-<id>`. Ilgari bitta
  //    `apex-ns-ui` bor edi — ikkinchi slot qo'shilsa u birinchisining
  //    matnini qayta yozardi va ekranda baribir bitta yozuv qolardi.
  //    Eski `apex-ns-ui` id si ham tozalanadi (pastda).
  function _ui(id) {
    // ⚠ DOM bo'lmasligi mumkin (test muhiti, server tomoni). Yozuv —
    //   bezak, uning yo'qligi butun tizimni to'xtatmasligi kerak.
    if (typeof document === 'undefined' || !document.body) return null;
    const key = 'apex-ns-ui-' + id;
    let el = document.getElementById(key);
    if (!el) {
      el = document.createElement('div');
      el.id = key;
      el.className = 'apex-ns-ui';
      el.style.cssText = 'position:absolute;z-index:58;pointer-events:none;' +
        "font-family:'Share Tech Mono',monospace;font-weight:700;letter-spacing:2px;" +
        'text-shadow:0 2px 10px rgba(0,0,0,.8)';
      (document.getElementById('cvp') || document.body).appendChild(el);
    }
    return el;
  }

  const POS = {
    'top-left':     'top:14px;left:16px',
    'top-right':    'top:14px;right:16px',
    'top-center':   'top:14px;left:50%;transform:translateX(-50%)',
    'bottom-left':  'bottom:14px;left:16px',
    'bottom-right': 'bottom:14px;right:16px',
  };

  function _drawUI() {
    // ⚠ `_ui()` DOM yo'qligini tekshiradi, bu funksiya esa tekshirmasdi
    //   va `document.getElementById` da yiqilardi. Eksport qilingan
    //   o'yinda DOM bor, lekin test/server muhitida yo'q — ikkalasi
    //   bir xil kodni yuritadi, shuning uchun qo'riq shu yerda ham.
    if (typeof document === 'undefined') return;
    const playing = _playing();
    //  ⚠ ESKI ID ni tozalaymiz: bir slotli davrda yozuv
    //    `apex-ns-ui` edi. Sahna eskisidan yuklansa u DOM da qolib,
    //    yangi yozuvlar ustiga chiqib turardi.
    //  ⚠ `remove()` bo'lmasligi mumkin (mok DOM, eski brauzer) —
    //    himoyasiz chaqiruv butun chizishni yiqitardi.
    try {
      const legacy = document.getElementById('apex-ns-ui');
      if (legacy && legacy.remove) legacy.remove();
    } catch (e) {}

    const live = slots();
    const seen = {};
    for (let i = 0; i < live.length; i++) {
      const s = live[i];
      seen['apex-ns-ui-' + s.id] = 1;
      const e = _ui(s.id);
      if (!e) return;
      //  ⚠ GALMA-GAL rejimida faqat FAOL slot ko'rinadi — boshqalari
      //    hali navbatini kutyapti va ekranni bekorga to'ldirardi.
      const show = playing && s.ui !== false && slotLive(s);
      if (!show) { e.style.display = 'none'; continue; }
      e.style.display = '';
      e.style.cssText = e.style.cssText.replace(/(top|bottom|left|right|transform):[^;]*;?/g, '');
      e.style.cssText += ';' + (POS[s.pos] || POS['top-left']);
      e.style.color = s.color || 'var(--accent3)';
      e.style.fontSize = (s.size || 22) + 'px';
      // ⚠ `{n}` — matn ichida ISTALGAN joyda. Faqat oxiriga qo'shsak
      //   \"35 ta olma\" kabi yozuv yozib bo'lmasdi.
      e.textContent = String(s.text || '{n}').replace(/\{n\}/g, String(value(s.id)));
    }
    //  ⚠ O'CHIRILGAN slotning yozuvi ekranda QOLIB KETMASIN.
    //    `querySelectorAll` yo'q muhitlarda (mok DOM) jim o'tamiz.
    try {
      const all = document.querySelectorAll && document.querySelectorAll('.apex-ns-ui');
      if (all) for (const el of all) if (!seen[el.id] && el.remove) el.remove();
    } catch (e) {}
  }

  // ============================================================
  //  Har kadr
  // ============================================================
  let _was = false;
  function update(delta) {
    const p = _playing();
    if (p !== _was) {
      _was = p;
      // ⚠ BU QATOR MUHIM. Ilgari yo'q edi va ⏹ Stop bosilganda
      //   ekrandagi raqam O'CHMASDI:
      //     • `reset()` faqat ▶ Play da chaqiriladi (`if (p)`),
      //     • boshqa hech nima `_dirty` ni ko'tarmaydi,
      //     • pastdagi zaxira shart esa `p` ROST bo'lishini talab qiladi.
      //   Natijada \"COLLECTED: 42\" muharrir ustida osilib qolardi va
      //   keyingi `set()` gacha turardi.
      //   O'lchov: PLAY → display=\"\" · STOP → display=\"\" (o'chishi kerak).
      _dirty = true;
      if (p) { reset(); checkAll(); }
      // ⏹ Stop — tugmalarning \"bir marta\" qulfi ham ochiladi
      _drips.length = 0;          // ⏳ oqimlar to'xtaydi
      _rnds.length = 0;           // 🎲 tasodifiy oqimlar ham
      _deepWarned = false;        // 🔁 qo'riqchi ogohlantirishi qaytadan
      if (!p) {
        // 🔊 Slot ochgan musiqa muharrirda ijro bo'lib qolmasin
        stopAllSounds();
        for (const o of _objs()) {
          if (o.userData && o.userData.noscript) o.userData.noscript._done = false;
        }
      }
    }
    if (p) {
      const dt = Math.min(0.1, delta || 0.016);
      tickDrips(dt);
      tickRandom(dt);
    }
    if (typeof document === 'undefined') return;
    if (_dirty) { _dirty = false; _drawUI(); }
    else if (p && !document.getElementById('apex-ns-ui')) _drawUI();
  }

  // ============================================================
  //  💾 Saqlash
  //  Bloklar va tugmalar sozlamasi `userData` da — o'zi saqlanadi.
  //  Bu yerda faqat umumiy sozlama va boshlang'ich qiymat.
  // ============================================================
  function serialize() {
    return { cfg: JSON.parse(JSON.stringify(cfg)) };
  }

  // ============================================================
  //  🔄 ESKI SAHNALARNI KO'CHIRISH
  // ------------------------------------------------------------
  //  Bir slotli davrda `cfg` TEKIS edi:
  //      { start, useMax, max, useMin, min, ui, text, pos, color, size }
  //  Endi ular slotning maydonlari. Eski fayl uchun o'sha qiymatlardan
  //  BITTA slot yasaymiz — shunda sahna AYNAN oldingidek ishlaydi.
  //
  //  ⚠ Ko'chirish O'QISH paytida: fayl o'zgarmaydi, ya'ni sahnani
  //    eski dvigatelda ham ochish mumkin.
  // ============================================================
  function restore(d) {
    if (!d || !d.cfg) return;
    const c = d.cfg;
    if (Array.isArray(c.slots) && c.slots.length) {
      cfg.slots = c.slots.map(raw => Object.assign(newSlot(), raw));
      //  ⚠ Hisoblagichni eng katta `id` dan davom ettiramiz — aks
      //    holda yangi slot mavjud id ni takrorlab, ikkalasi bitta
      //    qiymatni bo'lishardi.
      _slotIdC = cfg.slots.reduce((m, s) => Math.max(m, s.id || 0), 0);
    } else {
      const one = newSlot('Slot 1');
      for (const k of ['start','useMax','max','useMin','min','ui','text','pos','color','size'])
        if (c[k] !== undefined) one[k] = c[k];
      cfg.slots = [one];
      _slotIdC = one.id;
    }
    //  ⚠ STANDARTGA QAYTARISH shart, faqat \"bor bo'lsa yoz\" YETARLI
    //    EMAS: eski (bir slotli) sahnada `mode` yo'q, lekin oldingi
    //    sahnadan `'seq'` qolib ketardi. Natijada bitta slotli fayl
    //    galma-gal rejimida ochilardi va sabab ko'rinmasdi.
    const DEF = { mode: 'all', seqRule: 'zero', seqTarget: 100, loop: true };
    for (const k in DEF) cfg[k] = (c[k] !== undefined) ? c[k] : DEF[k];
    _active = 0;
    reset();
    _dirty = true;
  }

  return {
    OPS, CONDS, cfg, POS,
    value, set, apply, reset, test, slotTarget,
    // 🎰 Slotlar
    slots, slotAt, slotById, activeSlot, slotLive,
    addSlot, removeSlot, setSlot, nextSlot, newSlot,
    fireFrom, defaultOp, blocks, defaultBlock, defaultSlot,
    startDrip, stopDrip, tickDrips, dripCount,
    randOne, startRandom, stopRandom, tickRandom, randCount,
    checkAll, fireSlot, createBlock, update,
    stopAllSounds, _audioKey,
    serialize, restore,
  };
})();

window.addNoScriptBlock = function () { return NoScriptSystem.createBlock(); };
