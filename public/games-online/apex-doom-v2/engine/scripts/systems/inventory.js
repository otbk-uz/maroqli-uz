// ============================================================
//  🎒 INVENTORY  v1.0  (build 58.28)
// ------------------------------------------------------------
//  🔘 PICKUP tugmasi bilan ko'tarilgan predmetlarni SAQLAB TURADIGAN
//  ro'yxat — `inventar = []`, xolos. Predmet ichiga solinadi va
//  ichidan chiqariladi.
//
//  ⚠ NEGA KERAK: PICKUP predmeti ko'p bo'lsa, o'yinchi ularni
//    GALMA-GAL — bittalab olib borishga majbur edi (qo'l bitta).
//    Endi hammasini yig'ib yuradi va keraklisini bardan tanlaydi.
//
//    🎒 OYNA (Tab)  — OMBOR. Predmet shu yerda turadi va ISHLAMAYDI.
//    ▭ BAR          — FAOL joy. Tanlangan katakdagi predmet
//                     o'yinchining QO'LIDA hisoblanadi: 🎯 hitbox va
//                     🔘 tugmaning \"predmet sharti\" aynan shuni ko'radi.
//    ✋ QO'L         — bir vaqtda BITTA predmet (dvigatel qoidasi).
//
//  ── ⚠ NIMA O'ZGARMADI ────────────────────────────────────────
//    🔘 PICKUP tugmasining O'ZI — hech nimasi. Ko'tarish, tashlash
//    (`E`), tashlash kuchi, uchish yoyi — hammasi avvalgidek.
//    Inventarda TASHLASH TUGMASI YO'Q: tashlash tugmaning ishi.
//
//  ── Bardan tanlash ───────────────────────────────────────────
//    🖲 SCROLL      — bar bo'ylab yurish
//    1️⃣2️⃣3️⃣…      — raqam tugmalari (`Digit1…Digit9` + `Digit0`)
//    🖱 O'NG tugma  — oynadagi predmetni BARGA chiqarish (sozlanadi)
//
//  ── ⚠ NEGA `_slots` BITTA MASSIV (bar + oyna birga) ──────────
//    Birinchi o'yim bar va inventarni IKKI alohida ro'yxat qilish
//    edi. U zahoti \"predmetni bardan inventarga o'tkazish\" alohida
//    kod, alohida chegara tekshiruvi va alohida xato manbai bo'ldi.
//    Endi bitta massiv: [0 … hotbarSlots-1] = BAR, qolgani = OYNA.
//    Ko'chirish — ikkita indeks almashuvi, xolos.
//
//  ── ⚠ NEGA PREDMET IDENTIFIKATORI OBYEKTNING O'ZIDA ──────────
//    `objId` bilan bog'lash NOTO'G'RI bo'lardi: sahna yuklanganda
//    obyektlar YANGI id oladi (`_slIdMap`), ya'ni saqlangan
//    inventar butunlay boshqa narsalarga ishora qilardi.
//    Shuning uchun bog'lanish obyektning O'ZIDA turadi:
//        obj.userData.invUid = 'itm_7'
//    `userData` avtomatik saqlanadi va id ga bog'liq emas. Yuklashda
//    `restore()` shunchaki `objects[]` ni kezib uid bo'yicha topadi.
//    (Bu — `SceneTypes` / `AssetBundle` dagi bilan bir xil dars:
//     ikkita ro'yxatni sinxron ushlashdan ko'ra, bitta manbadan o'qish.)
//
//  ── ⚠ FIZIKAGA TEGILMAYDI ────────────────────────────────────
//    Inventar predmetning fizikasini O'ZGARTIRMAYDI — u shunchaki
//    SLOT. Obyekt sumkada turganda `visible = false`, xolos.
//    (Birinchi versiyada bu yerda Rapier tanasi yechilib qayta
//     qo'shilardi — ortiqcha: 🔘 PICKUP predmetlari `SceneTypes` da
//     `physics: null`, ya'ni ularda tana umuman yo'q.)
//    Yagona istisno — `colliderMode`: uni FAQAT `player.js` ning
//    AABB sikli o'qiydi va u ko'rinmaslikni tekshirmaydi, ya'ni
//    yashirin predmet ko'rinmas devor bo'lib qolardi.
//
//  ── 🎨 CSS ───────────────────────────────────────────────────
//    Butun ko'rinish CSS bilan almashtiriladi. `cfg.css` foydalanuvchi
//    matni bo'lib, standart CSS dan KEYIN qo'yiladi (ya'ni ustun).
//    Sinf nomlari o'zgarmas shartnoma — inspektorda ro'yxati bor.
// ============================================================

window.InventorySystem = (() => {
  'use strict';

  // ── Sozlamalar ──────────────────────────────────────────────
  const DEF = {
    enabled:       true,
    invSlots:      20,        // 🎒 oyna kataklari soni
    invCols:       5,         // to'r ustunlari
    hotbarSlots:   5,         // ▭ tezkor bar kataklari (1…12)
    hotbarVisible: true,      // ▭ ekranda ko'rinsinmi
    hotbarNumbers: true,      // 1…9,0 tugmalari bilan tanlash
    wheelSelect:   true,      // 🖲 scroll bilan tanlash
    autoStore:     true,      // ✋ PICKUP tugmasi predmetni INVENTARGA solsin
    // ============================================================
    //  ▭ AVTO QO'LGA OLISH
    // ------------------------------------------------------------
    //  ⚠ STANDARTI `false`. Ilgari bu xulq QATTIQ yozilgan edi va
    //    o'chirishning iloji yo'q edi: predmet sumkaga tushishi
    //    bilan tanlangan bar katagi uni DARHOL qo'lga oldirardi —
    //    ya'ni sahnada KO'RINIB turardi.
    //
    //    Natijada ikki qoida bir-biri bilan urishardi:
    //      🛡 qorovul  → \"sumkada, demak yashirin\"
    //      ▭ avto-qo'l → \"tanlangan katak, demak qo'lda va ko'rinadi\"
    //    Konsolda \"🛡 sumkada, lekin ko'rinib qolgan — tuzatildi\"
    //    chiqar, keyingi kadrda predmet yana ko'rinardi.
    //
    //  ⚠ O'CHIRILGANI QO'LNI OLIB TASHLAMAYDI: `selectSlot()` (1…9
    //    tugmalari, 🖲 scroll, katakni bosish) baribir qo'lga oladi.
    //    Farqi shundaki, endi bu O'YINCHINING qarori — avtomatik emas.
    //    Ya'ni predmet sumkaga tushsa, u SUMKADA qoladi.
    //  ⚠ Standarti QAYTA `true`. Uni o'chirish yangi muammo tug'dirdi:
    //    bar katagi \"tanlangan\" bo'lib ko'rinardi, lekin predmet
    //    qo'lda emasdi — o'yinchi uchun tushunarsiz holat.
    //    Asl muammo boshqa joyda edi (pastdagi 📦 SAQLASH JOYI ga
    //    qarang) va u endi tubdan hal qilindi.
    autoEquip:     true,
    equipMouse:    'right',   // 'right' | 'left' | 'dbl'
    rmbMenu:       true,      // 🖱 o'ng tugma → menyu (ishlatish/tashlash/ko'rish)
    viewMode:      'manual',  // 🔍 ko'rish: 'manual' (o'zi turadi) | 'auto'
    viewDir:       'right',   // 🔄 auto yo'nalishi: left|right|up|down
    viewSpeed:     0.9,       // 🔄 auto tezligi (aylanish/sek ~)
    viewDim:       0.88,      // 🔍 ko'rish foni qoraligi (0 = shaffof, 1 = qop-qora)
    pauseMove:     true,      // oyna ochiq — WASD ishlamaydi
    openKey:       'Tab',
    dropKey:       'KeyQ',    // 🎯 qo'ldagini tashlash (o'zgartiriladi)
    title:         'INVENTAR',
    css:           '',        // 🎨 foydalanuvchi CSS
  };

  const cfg = Object.assign({}, DEF);

  // ── Holat ───────────────────────────────────────────────────
  //  `_slots[i]` = null | { uid, name, icon }
  let _slots   = [];
  let _sel     = 0;          // tezkor bardagi tanlangan katak
  let _held    = null;       // { uid } — qo'ldagi predmet
  let _open    = false;
  let _cursor  = null;       // ko'chirilayotgan predmet (chap bosish)
  let _menu    = null;       // { i, x, y } — 🖱 o'ng tugma menyusi
  let _view    = null;       // 🔍 360° ko'rish oynasi holati
  let _preview = false;      // muharrirda CSS sozlash uchun
  let _uidSeq  = 1;
  let _wasPlaying = false;
  let _snapshot   = null;    // ▶ Play boshlanishidagi holat
  let _prevCursorFree = undefined;

  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);
  const _objs    = () => (typeof objects !== 'undefined' ? objects : []);
  const _log     = (m, c) => { try { log(m, c); } catch (e) { try { console.log(m); } catch (_) {} } };

  function _total() { return _hb() + Math.max(0, cfg.invSlots | 0); }
  function _hb()    { return Math.max(0, Math.min(12, cfg.hotbarSlots | 0)); }

  /**
   * ▭ Bar HAQIQATAN ishlayaptimi?
   *
   * ⚠ NEGA KERAK: bar yashirilganda u shunchaki ko'rinmay qolardi,
   *   lekin "faqat barda ishlaydi" qoidasi kuchda qolaverardi.
   *   Natijada ✋ Ishlatish bosilsa predmet KO'RINMAS bar katagiga
   *   tushardi: inventardan yo'qolgandek bo'lardi, qayerdaligini
   *   bilib ham bo'lmasdi.
   *
   *   Endi bar yashirilgan bo'lsa u YO'Q hisoblanadi: kataklar
   *   oddiy ombor kataklariga aylanadi va predmet turgan joyidan
   *   to'g'ridan qo'lga olinadi (qo'ldagisi `.held` bilan belgilanadi).
   *
   * ⚠ `_slots` massivi O'ZGARMAYDI — faqat ko'rinish va qoidalar.
   *   Massivni qisqartirsak predmetlar joyidan uchib ketardi.
   */
  function _barOn() { return !!cfg.hotbarVisible && _hb() > 0; }

  // ── Slot massivini o'lchamga keltirish ──────────────────────
  //  ⚠ Sozlama o'zgarganda predmetlar YO'QOLMASLIGI kerak: qisqargan
  //    qismdagi predmetlar bo'sh kataklarga ko'chiriladi, joy bo'lmasa
  //    dunyoga tashlanadi (jimgina o'chirilmaydi).
  function _resize() {
    const want = _total();
    const spill = [];
    if (_slots.length > want) {
      for (let i = want; i < _slots.length; i++) if (_slots[i]) spill.push(_slots[i]);
      _slots.length = want;
    }
    while (_slots.length < want) _slots.push(null);
    for (const it of spill) {
      const i = _slots.indexOf(null);
      if (i >= 0) _slots[i] = it;
      else _spillItem(it);
    }
    if (_sel >= _hb()) _sel = Math.max(0, _hb() - 1);
  }

  // ── Predmet ↔ obyekt bog'lanishi ────────────────────────────
  function _objOf(item) {
    if (!item) return null;
    for (const o of _objs()) if (o && o.userData && o.userData.invUid === item.uid) return o;
    return null;
  }
  function _indexOfUid(uid) {
    for (let i = 0; i < _slots.length; i++) if (_slots[i] && _slots[i].uid === uid) return i;
    return -1;
  }

  // ── Obyektni \"sumkaga\" yashirish / qaytarish ─────────────────
  //  ⚠ FIZIKAGA TEGILMAYDI. Inventar — shunchaki SLOT: predmet
  //    ro'yxatda turadi, xolos. Birinchi versiyada bu yerda Rapier
  //    tanasi yechilib, sozlamalari `ud.invPhys` ga ko'chirilardi —
  //    ortiqcha va xavfli edi: 🔘 PICKUP predmetlari `SceneTypes` da
  //    `physics: null` bilan turadi, ya'ni ularda tana umuman YO'Q.
  //    Tanasi bor obyekt uchun esa yechib-qo'shish uni muharrirdagi
  //    holatidan chetlashtirardi.
  //
  //  ⚠ `colliderMode` — BOSHQA narsa: uni faqat `player.js` ning
  //    AABB sikli o'qiydi (Rapier unga qaramaydi). Ko'rinmas predmet
  //    `block` holida qolsa BO'SH JOYDA KO'RINMAS DEVOR bo'lardi —
  //    `player.js:691` ko'rinmaslikni tekshirmaydi, faqat
  //    `colliderMode` ni. Shuning uchun `inline` ga o'tkaziladi va
  //    chiqarilganda AYNAN avvalgi qiymati qaytariladi.
  // ============================================================
  //  🅿️ TO'XTASH JOYI (`invPark`)
  // ------------------------------------------------------------
  //  ⚠ MUAMMO (foydalanuvchi topgan): predmetni qo'ldan chiqarganda
  //    🔘 tugma tizimining `releaseCarried()` uni QO'L TURGAN
  //    NUQTAGA ko'chiradi:
  //        target.getWorldPosition(wpos);
  //        target.position.copy(wpos);      ← endi o'yinchining oldida
  //
  //    Sumkaga solingan predmet ko'rinmas, lekin uning DUNYODAGI
  //    O'RNI o'yinchiga yopishib qoladi. Foydalanuvchi aytgani aynan
  //    shu: \"tugma joyida emas, men turgan joyda\". O'yinchi yursa
  //    predmet ortidan sudralmaydi, lekin qayerda qoldirgan bo'lsa
  //    o'sha yerda ham qolmaydi — va biror narsa uni ko'rsatib
  //    yuborsa (⏹ Stop, o'chirilgan slot, xatolik) u o'yinchining
  //    ustida paydo bo'ladi.
  //
  //  YECHIM: predmet sumkaga BIRINCHI MARTA tushganda dunyodagi
  //  o'rni eslab qolinadi va har safar yashirilganda o'sha yerga
  //  qaytariladi. Sumka — \"saqlash joyi\", ya'ni predmet o'z
  //  joyida turibdi, shunchaki ko'rinmaydi.
  //
  //  ⚠ `_` SIZ nomlanmagan: `invPark` sahna bilan SAQLANISHI kerak.
  //    Aks holda o'yinni saqlab qayta ochgach to'xtash joyi yo'qolib,
  //    predmet yana o'yinchida paydo bo'lardi.
  // ============================================================
  // ============================================================
  //  📦 SAQLASH JOYI (`inv`) — xarita TAGIDAGI ko'rinmas xona
  // ------------------------------------------------------------
  //  ⚠ ASL MUAMMO (foydalanuvchi aniqlagan): sumkadagi predmet
  //    dunyoda QOLARDI — odatda kamera ortida, o'yinchi bilan birga
  //    yurib. Dvigatel uchun u ODDIY OBYEKT edi: kamera ortida joy
  //    band, ikkinchi predmet uchun joy kerak → birinchisini
  //    surib qo'yardi. Shu bois predmet sahnada qolib ketardi.
  //
  //    Uch marta \"tuzatildi\" va har safar boshqa yo'ldan qaytdi,
  //    chunki tuzatishlar ALOMATNI yopardi: yashirish, ota
  //    almashtirish, joyga qaytarish. Predmetning O'ZI esa o'yin
  //    maydonida qolaverardi va har bir tizim uni ko'rardi.
  //
  //  YECHIM: predmet sumkaga tushganda o'yin maydonidan BUTUNLAY
  //  chiqariladi — xarita tagidagi ko'rinmas guruhga ko'chiriladi.
  //  U yerda:
  //    • hech qanday nur unga tegmaydi (10 km pastda)
  //    • guruh `visible = false` — ichidagi HAMMASI ko'rinmas,
  //      predmetning o'z bayrog'i nima bo'lishidan qat'i nazar
  //    • o'yinchi u yerga yeta olmaydi
  //
  //  ⚠ NEGA GURUH, NEGA SHUNCHAKI `visible = false` EMAS: predmetga
  //    besh xil tizim tegadi va har biri `visible` ni qayta yoqishi
  //    mumkin. Ota guruh ko'rinmas bo'lsa, bolaning bayrog'i
  //    ahamiyatsiz — Three.js uni umuman chizmaydi. Bu YAGONA
  //    ishonchli qulf.
  //
  //  ⚠ NEGA 10 000 m: `−100` past emas — xarita ostida yerto'la yoki
  //    tushib ketgan obyekt bo'lishi mumkin. 10 km da hech qanday
  //    o'yin mantig'i yo'q va suzuvchi nuqta aniqligi hali ham
  //    yetarli (float32 uchun ~0.001 m).
  const STORE_Y = -10000;
  let _store = null;

  function _storeAnchor() {
    if (_store && _store.parent) return _store;
    if (typeof THREE === 'undefined' || typeof scene === 'undefined') return null;
    _store = new THREE.Group();
    _store.name = '__inv_store__';
    _store.position.set(0, STORE_Y, 0);
    //  ⚠ Guruhning O'ZI ko'rinmas — ichidagi hamma narsa ham.
    _store.visible = false;
    //  ⚠ `objects` ga QO'SHILMAYDI: u sahna ro'yxati emas, texnik
    //    idish. Qo'shsak ierarxiyada ko'rinib, saqlanib va
    //    tanlanadigan bo'lib qolardi.
    scene.add(_store);
    return _store;
  }

  /** Predmetni saqlash joyiga KO'CHIRADI (dunyodan chiqaradi). */
  function _toStore(obj) {
    const a = _storeAnchor();
    if (!a || !obj) return false;
    //  ⚠ `add`, `attach` EMAS: `attach` dunyo joylashuvini saqlaydi,
    //    ya'ni predmet o'yin maydonida QOLARDI — aynan tuzatmoqchi
    //    bo'lgan narsamiz. Bizga KO'CHIRISH kerak.
    a.add(obj);
    obj.position.set(0, 0, 0);
    obj.visible = false;
    return true;
  }

  /** Predmetni dunyoga qaytaradi (berilgan joyga). */
  function _fromStore(obj, pos) {
    if (!obj) return false;
    try { if (typeof scene !== 'undefined') scene.add(obj); } catch (e) {}
    if (pos) obj.position.set(pos.x, pos.y, pos.z);
    obj.visible = true;
    return true;
  }

  function _stow(obj) {
    if (!obj) return;
    const ud = obj.userData;
    if (ud.invPrevCollider === undefined) ud.invPrevCollider = ud.colliderMode ?? null;
    //  ⚠ FAQAT birinchi marta: predmet sumkadan chiqib qayta
    //    tushsa (boshqa joyda tashlangan bo'lsa) yangi joyi yozilishi
    //    kerak — buni `_unstow` o'chirib beradi.
    //  🅿️ To'xtash joyi — predmet sumkadan chiqqanda qayerga
    //  qaytishi. FAQAT birinchi marta yoziladi.
    //  ⚠ DUNYO koordinatasi: predmet qo'lda bo'lsa u KAMERAGA
    //    bog'langan va `obj.position` lokal (nolga yaqin).
    if (!ud.invPark) {
      const _wp = new THREE.Vector3();
      obj.getWorldPosition(_wp);
      ud.invPark = { x: _wp.x, y: _wp.y, z: _wp.z };
    }
    //  📦 O'yin maydonidan BUTUNLAY chiqaramiz.
    _toStore(obj);
    ud.colliderMode = 'inline';
    ud.invStored = true;
    //  ⚠ MUTLAQ BELGI. `invStored` ro'yxat bilan bog'liq — uni
    //    boshqa kod ham o'zgartirishi mumkin. `invHidden` esa FAQAT
    //    shu yerda qo'yiladi va FAQAT predmet dunyoga qaytganda
    //    o'chadi. Qorovul aynan SHUNGA qaraydi, ya'ni ro'yxat
    //    buzilsa ham predmet ko'rinmas bo'lib qolaveradi.
    //  ⚠ `_` SIZ nomlangan: sahna bilan saqlanadi. Aks holda
    //    o'yinni saqlab qayta ochgach sumkadagi predmet ko'rinib
    //    ketardi — aynan foydalanuvchi shikoyat qilgan holat.
    ud.invHidden = true;
    obj.visible = false;
    // ⚖️ Sumkadagi predmet fizikasi TO'XTAB tursin. Inventar buni O'ZI
    //   qilmaydi — 🔘 tugma tizimining API'siga murojaat qiladi
    //   (ko'tarish/tashlash egasi o'sha, mantiq bitta joyda tursin).
    //   Qilmasak: ko'rinmas predmetning Rapier tanasi yashab qolardi —
    //   yerga qulardi, boshqa jismlarni turtardi, keyin chiqarilganда
    //   butunlay boshqa joyda paydo bo'lardi.
    try {
      if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.suspendPhysics)
        window.InteractiveButtonSystem.suspendPhysics(obj);
    } catch (e) {}
  }

  function _unstow(obj) {
    if (!obj) return;
    const ud = obj.userData;
    //  📦 Saqlash joyidan dunyoga qaytaramiz.
    //  ⚠ Joy: 🅿️ to'xtash nuqtasi. Qo'lga olinayotgan bo'lsa
    //    🔘 tugma tizimi uni darrov kameraga bog'lab, oldga
    //    qo'yadi — shuning uchun bu yerda aniq joy muhim emas,
    //    lekin `(0,0,0)` da qoldirsak bir kadr sahna markazida
    //    ko'rinib ketardi.
    _fromStore(obj, ud.invPark);
    obj.visible = true;
    ud.invStored = false;
    //  ⚠ Predmet dunyoga chiqdi — mutlaq belgi ham o'chadi, aks
    //    holda qorovul uni darhol qayta yashirardi.
    delete ud.invHidden;
    //  ⚠ 🅿️ To'xtash joyi BU YERDA O'CHIRILMAYDI. `_unstow` predmet
    //    QO'LGA olinganda ham chaqiriladi — u hali sumkaga tegishli.
    //    Bu yerda o'chirsak keyingi `_stow` yangi joyni O'YINCHI
    //    TURGAN NUQTADAN olardi va tuzatish ishlamasdi (test aynan
    //    shuni ko'rsatdi: 9,−4 o'rniga 50,50).
    //    U predmet sumkadan BUTUNLAY chiqqanda o'chadi — ya'ni
    //    `invUid` uzilgan joyda (`_spillItem`, tashlash, o'chirish).
    if (ud.invPrevCollider !== undefined) {
      if (ud.invPrevCollider === null) delete ud.colliderMode;
      else ud.colliderMode = ud.invPrevCollider;
      delete ud.invPrevCollider;
    }
    // ⚠ Fizika tanasi bu yerda TIKLANMAYDI. Predmet sumkadan chiqib
    //   darhol QO'LGA o'tadi — `giveItem()` uni baribir yana yechardi.
    //   Tana tashlangandan keyin, TINCHIGAN JOYIDA tiklanadi
    //   (`_updateThrown` → `resumePhysics`). Yagona istisno —
    //   `_spillItem()`: u predmetni to'g'ridan dunyoga qo'yadi.
  }

  // ============================================================
  //  QO'SHISH / OLIB TASHLASH
  // ============================================================

  /**
   * 📦 Obyektni inventarga soladi.
   * @param {THREE.Object3D} obj  sahna obyekti
   * @param {object} [meta]       { name, icon } — odatda PICKUP tugmasidan
   * @returns {boolean} joy bo'ldimi
   */
  function store(obj, meta) {
    if (!obj) return false;
    _resize();
    // Allaqachon ichidami — takrorlamaymiz
    if (obj.userData.invUid && _indexOfUid(obj.userData.invUid) >= 0) return true;

    const i = _slots.indexOf(null);
    if (i < 0) { _log('🎒 Inventar TO\'LA', 'lw'); return false; }

    const m = meta || {};
    const uid = obj.userData.invUid || ('itm_' + (_uidSeq++));
    obj.userData.invUid = uid;

    _slots[i] = {
      uid,
      name: m.name || obj.userData.invName || obj.userData.name || 'Predmet',
      icon: m.icon || obj.userData.invIcon || null,
      btnId: (m.btnId != null) ? m.btnId : null,
    };
    // Qo'lda turgan bo'lsa — avval qo'ldan olamiz
    try {
      if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.isCarried &&
          window.InteractiveButtonSystem.isCarried(obj)) {
        window.InteractiveButtonSystem.releaseCarried(obj);
      }
    } catch (e) {}
    _stow(obj);
    _log(`🎒 "${_slots[i].name}" inventarga tushdi (${i < _hb() ? 'bar ' + (i + 1) : 'katak ' + (i - _hb() + 1)})`, 'lok');
    refresh();
    return true;
  }

  /**
   * Predmetni ro'yxatdan CHIQARIB sahnaga qaytaradi — o'yinchi oldiga.
   *
   * ⚠ Bu foydalanuvchi AMALI emas: inventarda "tashlash" tugmasi YO'Q
   *   (tashlash 🔘 PICKUP tugmasining o'z ishi va u o'zgarmagan).
   *   Bu funksiya faqat SLOT SONI KAMAYGANDA chaqiriladi — sig'may
   *   qolgan predmet jimgina yo'qolib ketmasin.
   */
  function _spillItem(item) {
    const obj = _objOf(item);
    if (!obj) return;
    const p = _playerPos();
    _unstow(obj);
    delete obj.userData.invUid;
    delete obj.userData.invPark;   // 🅿️ sumkadan chiqdi — to'xtash joyi ham
    delete obj.userData.invHidden; // ✅ va yashirish belgisi ham
    if (p) {
      const d = _viewDir();
      obj.position.set(p.x + d.x * 1.3, Math.max(0.4, p.y), p.z + d.z * 1.3);
    }
    // ⚖️ Dunyoga qaytdi — tanasi ham qaytsin (`_stow` uni to'xtatgan edi)
    try {
      if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.resumePhysics)
        window.InteractiveButtonSystem.resumePhysics(obj);
    } catch (e) {}
  }

  function _playerPos() {
    try {
      if (window.PlayerController && PlayerController.obj) return PlayerController.obj.position.clone();
      if (typeof playerMesh !== 'undefined' && playerMesh) return playerMesh.position.clone();
      if (typeof camera !== 'undefined' && camera) return camera.position.clone();
    } catch (e) {}
    return null;
  }
  function _viewDir() {
    const d = { x: 0, z: -1 };
    try {
      const P = window.PlayerController;
      if (P && P.camYaw !== undefined) {
        d.x = -Math.sin(P.camYaw || 0); d.z = -Math.cos(P.camYaw || 0);
      } else if (typeof camera !== 'undefined' && camera) {
        const v = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        d.x = v.x; d.z = v.z;
      }
    } catch (e) {}
    return d;
  }

  // ============================================================
  //  QO'LGA OLISH
  // ============================================================

  /** Qo'ldagi predmetni sumkaga qaytaradi. */
  function unequip() {
    if (!_held) return;
    const i = _indexOfUid(_held.uid);
    const obj = _objOf(i >= 0 ? _slots[i] : { uid: _held.uid });
    _held = null;
    if (!obj) { refresh(); return; }
    try {
      if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.releaseCarried)
        window.InteractiveButtonSystem.releaseCarried(obj);
    } catch (e) {}
    _stow(obj);
    refresh();
  }

  /**
   * ✋ Katakdagi predmetni QO'LGA beradi — ya'ni uni "ishlatiladigan"
   *    qiladi: 🎯 hitbox va 🔘 tugmaning "predmet sharti" `getCarried()`
   *    orqali aynan shuni ko'radi.
   *
   * ⚠ FAQAT ▭ BAR kataklari. Oynadagi predmet — OMBORDA turibdi va
   *   ishlamaydi; uning ustiga bosilsa u **barga chiqariladi**
   *   (tanlangan katak bilan almashadi), keyin ishlatiladi.
   *   Aks holda "tanlangan" tushunchasi ikki xil bo'lardi: oynada ham,
   *   barda ham — va o'yinchi qaysi predmet qo'lida ekanini
   *   ekranga qarab bilolmasdi.
   *
   *  Xuddi shu katak qayta bosilsa — qo'ldan olinadi (toggle).
   */
  function equipSlot(i) {
    if (!cfg.enabled || i == null || i < 0 || i >= _slots.length) return false;

    // 🎒 Oynadagi katak — avval BARGA chiqaramiz.
    //    ⚠ Bar yashirilgan bo'lsa chiqaradigan joy YO'Q — predmet
    //      turgan katagidan to'g'ridan qo'lga olinadi.
    if (_barOn() && i >= _hb()) return takeOut(i);

    const it = _slots[i];
    if (_held && it && _held.uid === it.uid) { unequip(); return true; }
    unequip();
    if (i < _hb()) _sel = i;
    if (!it) { refresh(); return false; }

    const obj = _objOf(it);
    if (!obj) {
      _log(`⚠ "${it.name}" — obyekt sahnada topilmadi (o'chirilgan?)`, 'lw');
      _slots[i] = null; refresh(); return false;
    }
    _unstow(obj);
    let ok = true;
    try {
      if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.giveItem)
        // ⚠ `btnId` — ushlash masofasi (`holdDist`) aynan predmetni
        //   bergan tugmanikidek bo'lishi uchun. Busiz inventardan
        //   olingan predmet standart 1.5 m da turardi.
        ok = window.InteractiveButtonSystem.giveItem(obj, it.btnId);
    } catch (e) { ok = false; }
    if (!ok) {
      // Qo'l band (boshqa tizim ushlab turibdi) — qaytarib qo'yamiz
      _stow(obj);
      _log('⚠ Qo\'l band — avval qo\'ldagini qo\'ying', 'lw');
      refresh();
      return false;
    }
    _held = { uid: it.uid };
    if (i < _hb()) _sel = i;
    refresh();
    return true;
  }

  /**
   * 📤 Oynadagi predmetni BARGA chiqaradi (tanlangan katak bilan
   *    almashadi) va darhol qo'lga beradi.
   *
   *  Bar to'la bo'lsa — almashish: bardagisi omborga tushadi.
   *  Shu sababdan "chiqarish" hech qachon rad etilmaydi.
   */
  function takeOut(i) {
    if (!_barOn()) return equipSlot(i);      // bar yo'q — chiqaradigan joy ham yo'q
    const hb = _hb();
    if (!hb) { _log('⚠ ▭ Bar kataklari 0 — inspektordan qo\'shing', 'lw'); return false; }
    if (i < hb) return equipSlot(i);
    if (!_slots[i]) return false;
    unequip();
    const to = Math.max(0, Math.min(hb - 1, _sel));
    const tmp = _slots[to];
    _slots[to] = _slots[i];
    _slots[i]  = tmp || null;
    return equipSlot(to);
  }

  /**
   * 🎯 Qo'ldagi predmetni tashlaydi — dvigatelning O'Z uchish yo'li
   *    bilan (yoy bo'yicha uchadi, yerga tushadi, 🎯 hitbox uni
   *    "tashlangan" deb ko'radi, tinchgach fizikasi tiklanadi).
   *
   *  Qo'lda hech nima bo'lmasa — hech nima qilmaydi. Bar katagi
   *  tanlanganda predmet baribir qo'lga o'tadi, ya'ni amalda
   *  "tanlangani tashlanadi".
   *
   * ⚠ SHU YERDA `releaseCarried()` BO'LMASLIGI KERAK. U predmetni
   *   qo'ldan **qo'yib yuboradi** — tezlik bermaydi va uni
   *   `_thrownItems` ga qo'shmaydi. Bir marta shunday yozilgan edi va
   *   uch xato bergan:
   *     1. sakrab tashlansa predmet OSMONDA QOTIB qolardi
   *        (gravitatsiyani `_updateThrown` beradi);
   *     2. `isThrown()` `false` — 🎯 hitboxning "predmet yetkazish"
   *        sharti ishga tushmasdi;
   *     3. 🔘 tugmaning predmet sloti ham shu sababdan jim edi.
   *
   * ⚠ Tashlash kuchi predmetni BERGAN tugmadan olinadi (`item.btnId`).
   *   Bo'lmasa inventardan olingan predmet standart `12` bilan,
   *   to'g'ridan ko'tarilgani esa tugmanikidek uchardi.
   */
  function dropHeld() {
    if (!_held) return false;
    const i = _indexOfUid(_held.uid);
    if (i < 0) { _held = null; return false; }
    const it  = _slots[i];
    const obj = _objOf(it);
    _held = null;

    const btn = (it.btnId != null)
      ? _objs().find(o => o && o.userData && o.userData.isInteractiveBtn &&
                          String(o.userData.id) === String(it.btnId))
      : null;

    let thrown = false;
    try {
      if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.throwCarried)
        thrown = window.InteractiveButtonSystem.throwCarried(btn);
    } catch (e) { thrown = false; }

    if (obj) {
      delete obj.userData.invUid;
    delete obj.userData.invPark;   // 🅿️ sumkadan chiqdi — to'xtash joyi ham
    delete obj.userData.invHidden; // ✅ va yashirish belgisi ham
      obj.userData.invStored = false;
      if (!thrown) {
        // Zaxira: tizim tashlay olmadi — predmet qo'lda osilib qolmasin
        try {
          if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.releaseCarried)
            window.InteractiveButtonSystem.releaseCarried(obj);
        } catch (e) {}
      }
    }
    _slots[i] = null;
    _log(`🎯 "${it.name}" tashlandi`, 'lok');
    refresh();
    return true;
  }

  /** 🖲 Tezkor bar bo'ylab siljish. */
  function selectDelta(d) {
    const n = _hb();
    if (!n) return;
    _sel = ((_sel + d) % n + n) % n;
    if (_slots[_sel]) equipSlot(_sel); else { unequip(); refresh(); }
  }
  function selectSlot(i) {
    const n = _hb();
    if (i < 0 || i >= n) return;
    _sel = i;
    if (_slots[i]) equipSlot(i); else { unequip(); refresh(); }
  }

  // ── Kataklarni ko'chirish (chap bosish) ─────────────────────
  /**
   * Katakni ko'chirish: bir bosish — predmet kursorga yopishadi,
   * ikkinchi bosish — joylashadi (band bo'lsa almashadi).
   *
   * ⚠ XATO BOR EDI — PREDMET YO'QOLARDI. Predmetni olib **o'sha
   *   katakning o'ziga** qaytarsangiz:
   *       _slots[i] = _cursor.item;            // qaytardik ✅
   *       _slots[_cursor.from] = back || null;  // from === i ❗
   *   ikkinchi satr birinchisining ustidan `null` yozardi — predmet
   *   ro'yxatdan o'chib ketardi, obyekt esa sahnada ko'rinmas holda
   *   qolib ketardi (`invStored`, `visible = false`).
   *   Endi \"o'z joyiga qaytarish\" alohida, eng birinchi hol.
   */
  function _slotClick(i) {
    if (_cursor == null) {
      if (!_slots[i]) return;
      _cursor = { from: i, item: _slots[i] };
      _slots[i] = null;
    } else if (i === _cursor.from) {
      // O'z joyiga qaytdi — almashtirish YO'Q
      _slots[i] = _cursor.item;
      _cursor = null;
    } else {
      const back = _slots[i];
      _slots[i] = _cursor.item;
      _slots[_cursor.from] = back || null;
      _cursor = null;
    }
    _syncHeld();
    refresh();
  }

  // ============================================================
  //  ✋ _syncHeld — QO'LDAGI predmet katagiga MOS bo'lib tursin
  // ------------------------------------------------------------
  //  ⚠ XATO (foydalanuvchi topgan): predmetni olib, 1-katakdan
  //    boshqasiga ko'chirsangiz u SUMKADA turaveradi, lekin
  //    SAHNADA KO'RINIB qolardi — o'zi olingan joyda paydo bo'lgandek.
  //
  //    Sabab: predmet ▭ bar ning tanlangan katagida bo'lsa u
  //    QO'LDA — `visible = true`, fizikasi to'xtatilgan, tugma
  //    tizimi uni ushlab turibdi. `_slotClick` esa faqat RO'YXATNI
  //    o'zgartirardi: `_held` ga tegmasdi, `_stow()` chaqirilmasdi.
  //    Natijada ro'yxat bo'yicha predmet 4-katakda, dunyo bo'yicha
  //    esa hamon qo'lda — ikki manba bir-biriga zid bo'lib qolardi.
  //
  //    O'lchov (haqiqiy tizim bilan):
  //        saqlangach  → visible = false   ✅
  //        qo'lga olgach → visible = true   ✅
  //        4-katakka ko'chirgach → visible = true   ❌
  //
  //  ⚠ NEGA `unequip()`: u nafaqat `visible` ni yopadi, balki
  //    🔘 tugma tizimining `releaseCarried()` ini ham chaqiradi va
  //    `colliderMode` ni tiklaydi. Faqat `visible = false` qilsak
  //    predmet ko'rinmas holda qo'lda osilib qolardi.
  // ============================================================
  function _syncHeld() {
    if (!_held) return;
    const i = _indexOfUid(_held.uid);
    //  Qo'ldagi predmet TANLANGAN bar katagida qolgan bo'lsa —
    //  hammasi joyida, tegmaymiz.
    if (i >= 0 && i === _sel && i < _hb()) return;
    unequip();
  }

  // ============================================================
  //  🎨 KO'RINISH
  // ============================================================

  // ============================================================
  //  🎨 TAYYOR USLUBLAR
  // ------------------------------------------------------------
  //  ⚠ NEGA KERAK: CSS maydoni bor edi, lekin bo'sh sahifadan
  //    boshlash og'ir — dizayner sinf nomlarini bilmasa nimadan
  //    tutishni bilmaydi. Tayyor uslub bosilganda MATNGA tushadi:
  //    uni o'qib, o'zgartirib, o'z uslubini yasash mumkin.
  //
  //  ⚠ Uslub `cfg.css` NI ALMASHTIRADI, ustiga qo'shmaydi —
  //    ikkitasi ustma-ust tushsa qaysi qoida yutgani noma'lum
  //    bo'lardi.
  // ============================================================
  const THEMES = {
    'Standart': '',

    'Shisha': `/* 🧊 Shisha — xira fon, yumshoq chekka */
#apex-inv-root{ --inv-size:64px; --inv-accent:#8ad7ff }
#apex-inv-root .apex-slot{
  border-radius:14px; border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.07); backdrop-filter:blur(10px) }
#apex-inv-root .apex-slot.sel{
  border-color:#8ad7ff; box-shadow:0 0 0 2px rgba(138,215,255,.35) }
#apex-inv-root .apex-inv{
  background:rgba(20,26,34,.72); backdrop-filter:blur(16px);
  border-radius:16px; border:1px solid rgba(255,255,255,.12) }`,

    'Neon': `/* 💜 Neon — quyuq fon, porlovchi chekka */
#apex-inv-root{ --inv-size:60px; --inv-accent:#ff4df0 }
#apex-inv-root .apex-slot{
  border-radius:4px; background:#0b0714;
  border:1px solid rgba(255,77,240,.35) }
#apex-inv-root .apex-slot.sel{
  border-color:#ff4df0; box-shadow:0 0 12px rgba(255,77,240,.7) }
#apex-inv-root .apex-slot.held{ border-color:#4dfff0 }
#apex-inv-root .apex-inv{ background:#0b0714; border:1px solid rgba(255,77,240,.3) }
#apex-inv-root .apex-nm{ color:#ff9df5 }`,

    'Qog\'oz': `/* 📜 Qog'oz — och fon, quyuq matn */
#apex-inv-root{ --inv-size:58px; --inv-accent:#8a6a3b }
#apex-inv-root .apex-slot{
  border-radius:3px; background:#efe6d2; border:1px solid #bfae8c }
#apex-inv-root .apex-slot.sel{ border-color:#8a6a3b; background:#fff8e6 }
#apex-inv-root .apex-inv{ background:#efe6d2; border:1px solid #bfae8c }
#apex-inv-root .apex-nm, #apex-inv-root .apex-key{ color:#4a3a22 }`,

    'Kichik': `/* 🔹 Kichik — joy egallamaydi */
#apex-inv-root{ --inv-size:44px }
#apex-inv-root .apex-slot{ border-radius:6px }
#apex-inv-root .apex-nm{ font-size:8px }
#apex-inv-root .apex-key{ font-size:7px }`,
  };

  const DEFAULT_CSS = `
#apex-inv-root{
  --inv-bg:rgba(14,16,20,.94); --inv-panel:rgba(22,26,32,.96);
  --inv-slot:rgba(255,255,255,.05); --inv-line:rgba(255,255,255,.14);
  --inv-accent:#78b4e8; --inv-text:#d8dee6; --inv-muted:#79818c;
  --inv-size:56px; --inv-gap:5px; --inv-radius:3px;
  position:absolute; inset:0; pointer-events:none; z-index:60;
  font-family:'Share Tech Mono',monospace; color:var(--inv-text);
}
#apex-inv-root .apex-slot{
  width:var(--inv-size); height:var(--inv-size); position:relative;
  background:var(--inv-slot); border:1px solid var(--inv-line);
  border-radius:var(--inv-radius); box-sizing:border-box;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; overflow:hidden; transition:border-color .12s,background .12s;
}
#apex-inv-root .apex-slot:hover{ border-color:var(--inv-accent); background:rgba(120,180,232,.10) }
#apex-inv-root .apex-slot.sel{ border-color:var(--inv-accent); box-shadow:inset 0 0 0 1px var(--inv-accent) }
#apex-inv-root .apex-slot.held{ background:rgba(120,180,232,.18) }
#apex-inv-root .apex-slot img{ width:82%; height:82%; object-fit:contain; pointer-events:none }
#apex-inv-root .apex-slot .apex-ph{ font-size:19px; color:var(--inv-muted); pointer-events:none }
#apex-inv-root .apex-slot .apex-key{
  position:absolute; top:2px; left:3px; font-size:8px; color:var(--inv-muted); pointer-events:none }
#apex-inv-root .apex-slot .apex-nm{
  position:absolute; bottom:0; left:0; right:0; font-size:7px; line-height:11px;
  text-align:center; background:rgba(0,0,0,.55); color:var(--inv-text);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none }

/* ▭ TEZKOR BAR */
#apex-inv-root .apex-hotbar{
  position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
  display:flex; gap:var(--inv-gap); padding:6px;
  background:var(--inv-bg); border:1px solid var(--inv-line);
  border-radius:calc(var(--inv-radius) + 2px); pointer-events:auto }

/* 🎒 OYNA */
#apex-inv-root .apex-inv-back{
  position:absolute; inset:0; background:rgba(0,0,0,.55);
  display:flex; align-items:center; justify-content:center; pointer-events:auto }
#apex-inv-root .apex-inv{
  background:var(--inv-panel); border:1px solid var(--inv-line);
  border-radius:calc(var(--inv-radius) + 3px); padding:12px 14px;
  max-height:86%; overflow:auto; box-shadow:0 18px 60px rgba(0,0,0,.6) }
#apex-inv-root .apex-inv-head{
  display:flex; align-items:center; gap:10px; margin-bottom:10px }
#apex-inv-root .apex-inv-title{ font-size:12px; letter-spacing:2px; color:var(--inv-accent); flex:1 }
#apex-inv-root .apex-inv-x{
  background:transparent; border:1px solid var(--inv-line); color:var(--inv-muted);
  border-radius:var(--inv-radius); cursor:pointer; font-size:11px; padding:2px 8px;
  font-family:inherit }
#apex-inv-root .apex-inv-x:hover{ color:#ff6b6b; border-color:#ff6b6b }
#apex-inv-root .apex-grid{ display:grid; gap:var(--inv-gap) }
#apex-inv-root .apex-sep{ height:1px; background:var(--inv-line); margin:11px 0 9px }
#apex-inv-root .apex-barrow{ display:flex; gap:var(--inv-gap) }
#apex-inv-root .apex-hint{ font-size:8px; color:var(--inv-muted); line-height:1.7; margin-top:9px }
#apex-inv-root .apex-cursor{
  position:fixed; width:40px; height:40px; margin:-20px 0 0 -20px;
  background:var(--inv-panel); border:1px solid var(--inv-accent);
  border-radius:var(--inv-radius); display:flex; align-items:center;
  justify-content:center; pointer-events:none; z-index:80 }
#apex-inv-root .apex-cursor img{ width:80%; height:80%; object-fit:contain }

/* 🖱 O'NG TUGMA MENYUSI */
#apex-inv-root .apex-ctx{
  position:fixed; min-width:150px; padding:4px;
  background:var(--inv-panel); border:1px solid var(--inv-line);
  border-radius:var(--inv-radius); box-shadow:0 10px 34px rgba(0,0,0,.55);
  pointer-events:auto; z-index:90 }
#apex-inv-root .apex-ctx-h{
  font-size:8px; letter-spacing:1px; color:var(--inv-accent);
  padding:4px 7px 6px; border-bottom:1px solid var(--inv-line); margin-bottom:3px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
#apex-inv-root .apex-ctx-b{
  display:block; width:100%; text-align:left; padding:6px 8px;
  background:transparent; border:0; border-radius:var(--inv-radius);
  color:var(--inv-text); font-family:inherit; font-size:10px; cursor:pointer }
#apex-inv-root .apex-ctx-b:hover{ background:rgba(120,180,232,.16); color:var(--inv-accent) }

/* 🔍 360° KO'RISH — ramkasiz, faqat predmet */
#apex-inv-root .apex-view-back{
  position:absolute; inset:0; background:var(--inv-view-bg,rgba(0,0,0,.88));
  display:flex; align-items:center; justify-content:center; pointer-events:auto; z-index:95 }
#apex-inv-root .apex-view-c{
  width:min(76vw,760px); height:min(74vh,560px); cursor:grab }
#apex-inv-root .apex-view-c:active{ cursor:grabbing }
#apex-inv-root .apex-view-c canvas{ display:block }
`;

  function _style() {
    let s = document.getElementById('apex-inv-css');
    if (!s) {
      s = document.createElement('style');
      s.id = 'apex-inv-css';
      document.head.appendChild(s);
    }
    // 🔍 Ko'rish foni — inspektordagi shkaladan. Ayrim o'zgaruvchi
    //   sifatida beriladi, ya'ni foydalanuvchi CSS'i uni ham bemalol
    //   qayta yozadi (masalan rangli fon qo'yish uchun).
    const dim = Math.max(0, Math.min(1, cfg.viewDim ?? DEF.viewDim));
    const dimCss = `#apex-inv-root{ --inv-view-bg:rgba(0,0,0,${dim.toFixed(3)}) }\n`;
    // ⚠ Foydalanuvchi CSS'i standartdan KEYIN — ya'ni ustun.
    s.textContent = DEFAULT_CSS + dimCss +
                    '\n/* ── foydalanuvchi CSS ── */\n' + (cfg.css || '');
    return s;
  }

  function _root() {
    const host = document.getElementById('cvp') || document.body;
    let r = document.getElementById('apex-inv-root');
    if (!r) {
      r = document.createElement('div');
      r.id = 'apex-inv-root';
      host.appendChild(r);
      _bindRoot(r);
    } else if (r.parentElement !== host) {
      host.appendChild(r);
    }
    return r;
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _slotHTML(i, keyLabel) {
    const it = _slots[i];
    const cls = ['apex-slot'];
    // ⚠ "Tanlangan" halqasi faqat bar ISHLAYOTGANDA — bar yashirin
    //   bo'lsa `_sel` ma'nosiz, tasodifiy katakda halqa turishi esa
    //   o'yinchini adashtirardi (qo'ldagisi `.held` bilan ko'rinadi).
    if (_barOn() && i < _hb() && i === _sel) cls.push('sel');
    if (it && _held && _held.uid === it.uid) cls.push('held');
    const inner = it
      ? (it.icon
          ? `<img src="${_esc(it.icon)}" alt="">`
          : `<span class="apex-ph">📦</span>`) +
        `<span class="apex-nm">${_esc(it.name)}</span>`
      : '';
    return `<div class="${cls.join(' ')}" data-i="${i}">` +
           (keyLabel ? `<span class="apex-key">${_esc(keyLabel)}</span>` : '') +
           inner + `</div>`;
  }

  function refresh() {
    if (typeof document === 'undefined') return;
    _style();
    const show = cfg.enabled && (_playing() || _preview);
    const r = _root();
    if (!show) { r.innerHTML = ''; r.style.display = 'none'; return; }
    r.style.display = '';

    const hb  = _hb();
    const bar = _barOn();          // ⚠ yashirilgan bar = YO'Q bar
    _resize();

    // ── ▭ Tezkor bar ──
    let html = '';
    if (bar && !_open) {
      html += `<div class="apex-hotbar">`;
      for (let i = 0; i < hb; i++) html += _slotHTML(i, cfg.hotbarNumbers ? _numLabel(i) : '');
      html += `</div>`;
    }

    // ── 🎒 Oyna ──
    if (_open) {
      const cols = Math.max(1, cfg.invCols | 0);
      html += `<div class="apex-inv-back" data-back="1"><div class="apex-inv">
        <div class="apex-inv-head">
          <span class="apex-inv-title">🎒 ${_esc(cfg.title || 'INVENTAR')}</span>
          <button class="apex-inv-x" data-close="1">✕</button>
        </div>
        <div class="apex-grid" style="grid-template-columns:repeat(${cols},var(--inv-size))">`;
      // ⚠ Bar yashirilgan bo'lsa uning kataklari ham SHU YERDA —
      //   alohida qatorda emas. Aks holda oynada "ko'rinmas bar"
      //   uchun bo'sh joy turar, predmet esa o'sha yerga tushib
      //   yo'qolgandek bo'lardi.
      for (let i = (bar ? hb : 0); i < _slots.length; i++) html += _slotHTML(i, '');
      html += `</div>`;
      if (bar) {
        html += `<div class="apex-sep"></div><div class="apex-barrow">`;
        for (let i = 0; i < hb; i++) html += _slotHTML(i, cfg.hotbarNumbers ? _numLabel(i) : '');
        html += `</div>`;
      }
      html += `<div class="apex-hint">
        🖱 <b>${cfg.rmbMenu ? 'o\'ng' : (cfg.equipMouse === 'left' ? 'chap' : cfg.equipMouse === 'dbl' ? 'ikki marta' : 'o\'ng')}</b> — ${cfg.rmbMenu ? 'menyu: ishlatish · tashlash · ko\'rish' : (bar ? 'barga chiqarish / qo\'lga olish' : 'qo\'lga olish')}<br>
        🖱 <b>chap</b> — katakni ko'chirish<br>
        ${bar ? `🖲 scroll / 1…${Math.min(9, hb)} — bardan tanlash &nbsp;·&nbsp;` : ''}
        <b>${_keyTxt(cfg.dropKey)}</b> — tashlash &nbsp;·&nbsp;
        <b>${_keyTxt(cfg.openKey)}</b> — yopish<br>
        ${bar
          ? '⚠ Predmet <b>faqat ▭ barda</b> ishlaydi. Oynada turgani — ombor.'
          : '⚠ ▭ Bar yashirilgan — predmet <b>turgan katagidan</b> qo\'lga olinadi.'}
      </div></div></div>`;
    }

    // ── 🖱 O'ng tugma menyusi ──
    if (_menu && _slots[_menu.i]) {
      const it = _slots[_menu.i];
      const inBar = !_barOn() || _menu.i < hb;
      const held  = _held && _held.uid === it.uid;
      html += `<div class="apex-ctx" id="apex-inv-ctx" style="left:${_menu.x}px;top:${_menu.y}px">
        <div class="apex-ctx-h">${_esc(it.name)}</div>
        <button class="apex-ctx-b" data-act="use">✋ ${held ? 'Qo\'ldan olish' : (inBar ? 'Ishlatish' : 'Ishlatish (barga)')}</button>
        <button class="apex-ctx-b" data-act="throw">🎯 Tashlash</button>
        <button class="apex-ctx-b" data-act="view">🔍 Ko'rish</button>
      </div>`;
    }

    // ── 🔍 360° KO'RISH — RAMKASIZ ──
    //  ⚠ Ekranda BOSHQA HECH NIMA yo'q: sarlavha ham, tugma ham,
    //    yozuv ham. Rejim (🖐 manual / 🔄 auto) — DIZAYNER qarori,
    //    u inspektorda turadi. O'yinchiga tanlov berilmaydi: u
    //    predmetni ko'rgani keldi, sozlama qidirgani emas.
    if (_view) {
      html += `<div class="apex-view-back" data-vback="1">
        <div class="apex-view-c" id="apex-inv-view-canvas"></div>
      </div>`;
    }

    // ── Ko'chirilayotgan predmet ──
    if (_cursor) {
      const it = _cursor.item;
      html += `<div class="apex-cursor" id="apex-inv-cursor">` +
              (it.icon ? `<img src="${_esc(it.icon)}">` : '📦') + `</div>`;
    }

    r.innerHTML = html;
    if (_cursor) _moveCursorEl(_lastMouse.x, _lastMouse.y);
    if (_menu) _clampMenu();
    if (_view) _viewMount();
  }

  function _numLabel(i) {
    if (i < 9) return String(i + 1);
    if (i === 9) return '0';
    return '';
  }
  function _keyTxt(code) {
    if (!code) return '—';
    try { if (typeof _keyLabel === 'function') return _keyLabel(code); } catch (e) {}
    return String(code).replace(/^Key|^Digit|^Arrow/, '');
  }

  // ── Sichqoncha ──────────────────────────────────────────────
  const _lastMouse = { x: 0, y: 0 };
  function _moveCursorEl(x, y) {
    const el = document.getElementById('apex-inv-cursor');
    if (el) { el.style.left = x + 'px'; el.style.top = y + 'px'; }
  }

  function _bindRoot(r) {
    // ⚠ Delegatsiya: `innerHTML` har `refresh()` da qayta yoziladi,
    //   ya'ni har katakka listener qo'yish behuda (va oqib ketardi).
    r.addEventListener('mousedown', (e) => {
      // ⚠ HAR QANDAY bosishni to'xtatamiz. `player.js` `mousedown` ni
      //   `document` da tutadi va `_mouseDown = true` qiladi — undan
      //   keyin `mousemove` pointer lock BO'LMASA HAM kamerani buradi.
      //   Ya'ni inventarda katakni sudrasangiz o'yin kamerasi
      //   aylanib ketardi.
      e.stopPropagation();
      const T = e.target;

      // 🔍 Ko'rish — predmet ustida sudrab aylantirish
      if (_view && T && T.closest && T.closest('.apex-view-c')) {
        e.preventDefault();
        _view.drag = { x: e.clientX, y: e.clientY };
        return;
      }
      // Predmetdan tashqari bosildi — yopamiz (yopish tugmasi yo'q,
      // chunki ekranda hech nima turmasligi kerak; `Esc` ham ishlaydi)
      if (T && T.dataset && T.dataset.vback) { closeView(); return; }

      // 🖱 Menyu tugmalari
      const mb = T && T.closest ? T.closest('.apex-ctx-b') : null;
      if (mb) { e.preventDefault(); _menuAct(mb.dataset.act); return; }
      if (T && T.closest && T.closest('.apex-ctx')) return;   // menyu ichi — tegmaymiz
      if (_menu) { closeMenu(); }

      const slot = T.closest ? T.closest('.apex-slot') : null;
      if (T && T.dataset && T.dataset.close) { close(); return; }
      if (!slot) {
        // Fon bosildi — oynani yopamiz
        if (T && T.dataset && T.dataset.back && e.button === 0) close();
        return;
      }
      e.preventDefault();
      const i = parseInt(slot.dataset.i, 10);
      const rightBtn = e.button === 2;

      // 🖱 O'ng tugma → menyu (ishlatish / tashlash / ko'rish)
      if (rightBtn && cfg.rmbMenu) { openMenu(i, e.clientX, e.clientY); return; }

      const eq = cfg.equipMouse;
      if ((eq === 'right' && rightBtn) || (eq === 'left' && e.button === 0)) equipSlot(i);
      else if (e.button === 0 || rightBtn) _slotClick(i);
    });
    r.addEventListener('dblclick', (e) => {
      if (cfg.equipMouse !== 'dbl') return;
      const slot = e.target.closest ? e.target.closest('.apex-slot') : null;
      if (!slot) return;
      e.preventDefault(); e.stopPropagation();
      equipSlot(parseInt(slot.dataset.i, 10));
    });
    r.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
    r.addEventListener('mousemove', (e) => {
      _lastMouse.x = e.clientX; _lastMouse.y = e.clientY;
      if (_cursor) _moveCursorEl(e.clientX, e.clientY);
      // 🔄 360° sudrash
      if (_view && _view.drag) {
        _view.yaw   -= (e.clientX - _view.drag.x) * 0.011;
        _view.pitch += (e.clientY - _view.drag.y) * 0.009;
        _view.pitch  = Math.max(-1.45, Math.min(1.45, _view.pitch));
        _view.drag.x = e.clientX; _view.drag.y = e.clientY;
      }
    });
    r.addEventListener('mouseup', () => { if (_view) _view.drag = null; });
    r.addEventListener('mouseleave', () => { if (_view) _view.drag = null; });
    r.addEventListener('wheel', (e) => {
      e.stopPropagation();
      if (_view && e.target && e.target.closest && e.target.closest('.apex-view-c')) {
        _view.dist = Math.max(0.05, _view.dist * (e.deltaY > 0 ? 1.12 : 0.89));
      }
    }, { passive: true });
  }

  // ============================================================
  //  🖱 O'NG TUGMA MENYUSI
  //  ⚠ Menyu `refresh()` bilan birga qayta chiziladi — o'z holati
  //    `_menu` da, DOM da emas. Aks holda har `refresh()` da menyu
  //    yo'qolib ketardi (predmet qo'lga o'tsa `refresh()` chaqiriladi).
  // ============================================================
  function openMenu(i, x, y) {
    if (!cfg.rmbMenu || !_slots[i]) return false;
    _menu = { i, x, y };
    refresh();
    return true;
  }
  function closeMenu() {
    if (!_menu) return;
    _menu = null;
    refresh();
  }

  /** Menyu ekrandan chiqib ketmasin. */
  function _clampMenu() {
    const el = document.getElementById('apex-inv-ctx');
    if (!el || !el.getBoundingClientRect) return;
    const b = el.getBoundingClientRect();
    const W = (window.innerWidth  || 1280), H = (window.innerHeight || 720);
    if (b.right  > W - 6) el.style.left = Math.max(6, _menu.x - b.width) + 'px';
    if (b.bottom > H - 6) el.style.top  = Math.max(6, _menu.y - b.height) + 'px';
  }

  function _menuAct(act) {
    if (!_menu) return;
    const i = _menu.i;
    const it = _slots[i];
    _menu = null;
    if (!it) { refresh(); return; }

    if (act === 'use') {
      // 🎒 ombordagi bo'lsa — avval barga chiqadi, keyin qo'lga
      equipSlot(i);
      return;
    }
    if (act === 'throw') {
      // ⚠ Tashlash uchun predmet QO'LDA bo'lishi shart — uchish yo'li
      //   (`throwCarried`) faqat qo'ldagini biladi. Shuning uchun
      //   ombordagi predmet avval qo'lga olinadi.
      if (!_held || _held.uid !== it.uid) equipSlot(i);
      if (_held && _held.uid === it.uid) dropHeld();
      else refresh();
      return;
    }
    if (act === 'view') { openView(i); return; }
    refresh();
  }

  // ============================================================
  //  🔍 360° KO'RISH OYNASI
  // ------------------------------------------------------------
  //  Predmet AYNAN sahnadagidek ko'rinadi: o'sha model, o'sha
  //  materiallar/teksturalar, o'sha o'lchamlar.
  //
  //  ⚠ NEGA KLON, ASLI EMAS: aslini bu yerga olib kelsak, uni
  //    sahnadan uzib olish kerak bo'lardi — o'yin davomida predmet
  //    dunyodan yo'qolib turardi va qaytarishda ota/joy/burilishni
  //    tiklash kerak bo'lardi (yana bir \"holat ikki joyda\" xatosi).
  //    `clone(true)` esa geometriya va materialni ULASHADI — ya'ni
  //    tekstura ikkinchi marta yuklanmaydi, xotira ham deyarli
  //    o'smaydi.
  //
  //  ⚠ NEGA ALOHIDA RENDERER: asosiy kanvasga chizsak o'yin
  //    kadrini buzardik (kamera, viewport, post-effektlar). Kichkina
  //    mustaqil renderer arzon va hech nimaga tegmaydi. Oyna
  //    yopilganda `dispose()` qilinadi — aks holda har ochilishda
  //    yangi WebGL konteksti oqib ketardi (brauzer ~16 tasidan keyin
  //    eng eskisini majburan yo'q qiladi).
  // ============================================================
  function openView(i) {
    const it = _slots[i];
    if (!it) return false;
    const obj = _objOf(it);
    if (!obj) { _log(`⚠ "${it.name}" — obyekt topilmadi`, 'lw'); return false; }
    closeView();
    _view = { uid: it.uid, name: it.name, yaw: 0.6, pitch: 0.25, dist: 0, drag: null, sizeTxt: '' };
    refresh();
    return true;
  }

  /**
   * 🖐 Manual — predmet turadi, faqat sudrab aylantiriladi.
   * 🔄 Auto  — o'zi aylanadi, yo'nalishi `setViewDir()` bilan.
   *
   * ⚠ Tanlov `cfg` da — ya'ni sahna bilan saqlanadi va keyingi
   *   ochilishda ham o'sha rejimda ochiladi. `_view` da bo'lsa
   *   oyna har yopilganda unutilardi.
   */
  function setViewMode(m) {
    if (m !== 'manual' && m !== 'auto') return false;
    cfg.viewMode = m;
    refresh();
    return true;
  }
  function setViewDir(d) {
    if (['left', 'right', 'up', 'down'].indexOf(d) < 0) return false;
    cfg.viewDir  = d;
    cfg.viewMode = 'auto';        // yo'nalish tanlandi — demak auto
    refresh();
    return true;
  }

  function closeView() {
    if (!_view) return;
    const v = _view;
    _view = null;
    if (v.raf) cancelAnimationFrame(v.raf);
    try {
      if (v.renderer) { v.renderer.dispose(); v.renderer.forceContextLoss?.(); }
    } catch (e) {}
    refresh();
  }

  /**
   * 📐 Predmetni oynaga SIG'DIRISH hisobi — WebGL'siz ham ishlaydi,
   *    shuning uchun alohida (va test qilinadigan) funksiya.
   *
   *  @returns {{size:THREE.Vector3, center:THREE.Vector3, dist:number}}
   *  ⚠ `size` — predmetning DUNYODAGI haqiqiy o'lchami (world scale
   *    bilan). "Qanaqa razmer qo'yilgan bo'lsa o'shanday" degani shu:
   *    oyna kattalashtiradi, lekin nisbatlar va yozilgan metr
   *    o'zgarmaydi.
   */
  function viewFit(src, fovDeg) {
    const out = { size: new THREE.Vector3(1, 1, 1), center: new THREE.Vector3(), dist: 3 };
    if (!src) return out;
    const probe = src.clone(true);
    probe.position.set(0, 0, 0);
    probe.rotation.set(0, 0, 0);
    probe.visible = true;
    probe.traverse(o => { o.visible = true; });
    try { src.getWorldScale(probe.scale); } catch (e) {}
    probe.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(probe);
    if (box.isEmpty()) return out;
    box.getSize(out.size);
    box.getCenter(out.center);
    const radius = Math.max(1e-3, out.size.length() * 0.5);
    const fov = (fovDeg || 40) * Math.PI / 180;
    out.dist = radius / Math.tan(fov / 2) * 1.25;
    return out;
  }

  function _viewMount() {
    if (!_view) return;
    const host = document.getElementById('apex-inv-view-canvas');
    if (!host || typeof THREE === 'undefined') return;

    // ⚠ `refresh()` `innerHTML` ni QAYTA YOZADI — kanvas DOM dan
    //   uchib ketadi. Ilgari bu yerda `if (_view.renderer) return;`
    //   turardi: rejim tugmasi bosilishi bilan oyna BO'M-BO'SH
    //   qolardi (renderer bor, lekin ekranda yo'q). Endi mavjud
    //   kanvas shunchaki yangi uyga qayta ulanadi — WebGL konteksti
    //   saqlanadi, ya'ni oqib ketish ham yo'q.
    if (_view.renderer) {
      const cv = _view.renderer.domElement;
      if (cv && cv.parentElement !== host) host.appendChild(cv);
      return;
    }
    const src = _objOf({ uid: _view.uid });
    if (!src) { _view = null; setTimeout(refresh, 0); return; }

    const W = Math.max(120, host.clientWidth  || 320);
    const H = Math.max(120, host.clientHeight || 260);

    const sc = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, W / H, 0.01, 500);
    let rend;
    try {
      rend = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      if (!rend.getContext || !rend.getContext()) throw new Error('no ctx');
    } catch (e) {
      // ⚠ Oynani OCHIQ qoldirmaymiz: aks holda bo'm-bo'sh quti turib
      //   qolardi va `viewing()` `null` — ko'rinish holat bilan
      //   ziddiyatda bo'lardi.
      _log('⚠ 🔍 Ko\'rish: WebGL konteksti ochilmadi', 'lw');
      _view = null; setTimeout(refresh, 0); return;
    }
    rend.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    rend.setSize(W, H);
    host.appendChild(rend.domElement);

    sc.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 5, 4); sc.add(key);
    const rim = new THREE.DirectionalLight(0x88bbff, 0.5); rim.position.set(-4, 2, -3); sc.add(rim);

    // 🔄 Aylanish o'qi — klon markazga siljitiladi
    const pivot = new THREE.Group();
    sc.add(pivot);
    const clone = src.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    // ⚠ Sumkadagi predmet `visible = false` — klonda buni ochamiz,
    //   aks holda oyna bo'm-bo'sh ko'rinardi.
    clone.visible = true;
    clone.traverse(o => { o.visible = true; });
    // Dunyo o'lchamini saqlaymiz (\"qanday razmer qo'yilgan bo'lsa\")
    try { src.getWorldScale(clone.scale); } catch (e) {}
    pivot.add(clone);

    const fit = viewFit(src, cam.fov);
    clone.position.sub(fit.center);                // markazga keltiramiz
    const size = fit.size;
    _view.dist = fit.dist;

    // 📐 O'lcham holatda qoladi (API/testlar uchun) — ekranda ko'rinmaydi
    _view.sizeTxt = `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`;

    Object.assign(_view, { scene: sc, cam, renderer: rend, pivot, host });

    // ⚠ MANUALDA PREDMET TURADI. Ilgari u har doim o'z-o'zidan
    //   aylanardi — predmetni bir tomondan tinch ko'rib bo'lmasdi:
    //   qo'yib yuborishingiz bilan surilib ketardi. Endi aylanish
    //   faqat 🔄 Auto rejimida, va yo'nalishi tanlanadi.
    let _prevT = 0;
    const tick = (now) => {
      if (!_view || _view.renderer !== rend) return;
      const dt = _prevT ? Math.min(0.05, (now - _prevT) / 1000) : 0;
      _prevT = now;

      if (cfg.viewMode === 'auto' && !_view.drag) {
        const w = (cfg.viewSpeed || 0.9) * dt * Math.PI * 2 * 0.16;
        // ⚠ Chap/o'ng — KAMERA orbitasi (yaw). Tepa/past esa
        //   PREDMETNING o'zi ag'daradi: kamera pitch'i ±90° da
        //   qamalgan (qutb muammosi), ya'ni u bilan to'liq 360°
        //   ag'darib bo'lmasdi.
        if      (cfg.viewDir === 'left')  _view.yaw -= w;
        else if (cfg.viewDir === 'right') _view.yaw += w;
        else if (cfg.viewDir === 'up')    pivot.rotation.x -= w;
        else if (cfg.viewDir === 'down')  pivot.rotation.x += w;
      }
      const d = _view.dist;
      cam.position.set(
        Math.sin(_view.yaw) * Math.cos(_view.pitch) * d,
        Math.sin(_view.pitch) * d,
        Math.cos(_view.yaw) * Math.cos(_view.pitch) * d,
      );
      cam.lookAt(0, 0, 0);
      rend.render(sc, cam);
      _view.raf = requestAnimationFrame(tick);
    };
    _view.raf = requestAnimationFrame(tick);
  }


  function open() {
    if (_open || !cfg.enabled) return;
    _open = true;
    // 🖱 Kursor kerak — pointer lock'dan chiqamiz.
    //  ⚠ `_pcCursorFree` loyihadagi YAGONA \"kursor erkin\" bayrog'i:
    //    `player.js`, `hitbox.js`, `interactive-button.js` va `GameLock`
    //    hammasi shuni o'qiydi. O'z bayrog'imizni qo'ysak, o'sha to'rt
    //    joyni ham tahrirlash kerak bo'lardi.
    _prevCursorFree = window._pcCursorFree;
    window._pcCursorFree = true;
    try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
    try { if (typeof window._apexFlushKeys === 'function') window._apexFlushKeys(); } catch (e) {}
    refresh();
  }

  function close() {
    if (!_open) return;
    _open = false;
    _menu = null;
    if (_view) { const v = _view; _view = null;
      if (v.raf) cancelAnimationFrame(v.raf);
      try { v.renderer && v.renderer.dispose(); } catch (e) {} }
    // Ko'chirilayotgan predmet qo'lda qolib ketmasin
    if (_cursor) {
      const i = _slots.indexOf(null);
      if (i >= 0) _slots[i] = _cursor.item; else _spillItem(_cursor.item);
      _cursor = null;
    }
    window._pcCursorFree = _prevCursorFree;
    _prevCursorFree = undefined;
    refresh();
  }

  function toggle() { _open ? close() : open(); }
  const isOpen = () => _open;

  // ============================================================
  //  KLAVIATURA / SCROLL
  //  ⚠ HAMMASI `window` CAPTURE fazasida. Sabab:
  //    • `player.js` `keydown` ni `document` da CAPTURE bilan tutadi,
  //    • `player.js` `wheel` ni KANVASDA capture bilan tutib
  //      `stopImmediatePropagation()` qiladi.
  //    Capture fazasi window → document → … → canvas tartibida yuradi,
  //    ya'ni window bizga BIRINCHI navbat beradi. Bo'lmasa scroll ham,
  //    Tab ham bizga umuman yetib kelmasdi.
  // ============================================================
  const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight',
                     'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  function _installKeys() {
    window.addEventListener('keydown', (e) => {
      if (!cfg.enabled || !_playing()) return;
      const t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;

      // ── 🚗 MASHINA ICHIDA — inventar KLAVIŞLARI o'chadi ──────
      //  ⚠ ALOMAT: mashinaga o'tirib `Q` bosilsa peredacha pastga
      //    tushmasdi. `E` esa ishlardi.
      //
      //  ⚠ SABAB: inventarning "tashlash" tugmasi ham `Q` va u
      //    `window` CAPTURE fazasida turadi — ya'ni mashinadan
      //    OLDIN yetib keladi va `stopPropagation()` bilan uni
      //    yutib yuboradi.
      //
      //  ⚠ NEGA SHUNCHAKI `dropKey` NI TEKSHIRMAYMIZ: mashinada
      //    boshqa klavişlar ham band (`E` yuqoriga, `Tab`, scroll —
      //    peredacha va kamera). Ro'yxat tuzsak, mashinaga yangi
      //    klaviş qo'shilganda bu yerni ham yangilash kerak bo'lardi
      //    va albatta unutilardi. Mashinada inventar UMUMAN kerak
      //    emas: qo'l rulda.
      if (typeof carInside !== 'undefined' && carInside) return;

      // 🎒 ochish / yopish
      if (e.code === cfg.openKey) {
        e.preventDefault(); e.stopPropagation();
        toggle();
        return;
      }
      // 🎯 tashlash
      if (cfg.dropKey && e.code === cfg.dropKey) {
        e.preventDefault(); e.stopPropagation();
        dropHeld();
        return;
      }
      if (e.code === 'Escape' && (_view || _menu)) {
        e.preventDefault(); e.stopPropagation();
        if (_view) closeView(); else closeMenu();
        return;
      }
      if (_open && e.code === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        close();
        return;
      }
      // 1…9, 0 — bardan tanlash
      if (_barOn() && cfg.hotbarNumbers && /^Digit[0-9]$/.test(e.code)) {
        const d = parseInt(e.code.slice(5), 10);
        const idx = (d === 0) ? 9 : d - 1;
        if (idx < _hb()) {
          e.preventDefault(); e.stopPropagation();
          selectSlot(idx);
          return;
        }
      }
      // Oyna ochiq — yurish to'xtaydi
      if (_open && cfg.pauseMove && MOVE_KEYS.indexOf(e.code) >= 0) {
        e.preventDefault(); e.stopPropagation();
      }
    }, true);
  }

  function _installWheel() {
    window.addEventListener('wheel', (e) => {
      if (!cfg.enabled || !cfg.wheelSelect || !_playing()) return;
      // 🚗 Mashinada scroll — KAMERA masofasi, inventar emas
      if (typeof carInside !== 'undefined' && carInside) return;
      // ⚠ Oyna ochiq bo'lsa scroll TEGILMAYDI — katak ko'p bo'lsa
      //   ro'yxatni aylantirish kerak. Aks holda uzun inventarning
      //   pastini ko'rishning iloji bo'lmasdi.
      if (_open) return;
      if (!_barOn()) return;
      e.preventDefault();
      e.stopPropagation();
      selectDelta(e.deltaY > 0 ? 1 : -1);
    }, { capture: true, passive: false });
  }

  // ============================================================
  //  ▶ PLAY / ⏹ STOP
  //  ⚠ Muharrirdagi sahna O'ZGARMASLIGI kerak: o'yin davomida
  //    yig'ilgan predmetlar Stop bosilganda dunyoga QAYTADI va
  //    inventar Play boshlangandagi holatiga tushadi. Bu — Map
  //    Loader falsafasi: o'yin muharrirni buzmaydi.
  // ============================================================
  function _snap() {
    _resize();
    _snapshot = JSON.stringify(_slots);
  }

  function onPlayStop() {
    close();
    unequip();
    // Play davomida qo'shilgan predmetlarni dunyoga qaytaramiz
    let before = null;
    try { before = _snapshot ? new Set(JSON.parse(_snapshot).filter(Boolean).map(x => x.uid)) : null; } catch (e) {}
    if (before) {
      for (const it of _slots.slice()) {
        if (!it || before.has(it.uid)) continue;
        const obj = _objOf(it);
        if (obj) {
          _unstow(obj);
          delete obj.userData.invUid;
    delete obj.userData.invPark;   // 🅿️ sumkadan chiqdi — to'xtash joyi ham
    delete obj.userData.invHidden; // ✅ va yashirish belgisi ham
          // ⚖️ Muharrirga qaytdi — tanasi ham qaytsin
          try {
            if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.resumePhysics)
              window.InteractiveButtonSystem.resumePhysics(obj);
          } catch (e) {}
        }
      }
      try { _slots = JSON.parse(_snapshot); } catch (e) {}
    }
    _sel = 0; _cursor = null;
    refresh();
  }

  // ============================================================
  //  🛡 _enforceStowed — SUMKADAGI PREDMET INVARIANTI
  // ------------------------------------------------------------
  //  QOIDA: sumkada ro'yxatga olingan (`invUid`) va QO'LDA
  //  BO'LMAGAN predmet HAR DOIM:
  //      • ko'rinmas   (`visible === false`)
  //      • sahna bolasi (kamera yoki boshqa obyektga bog'lanmagan)
  //      • 🅿️ to'xtash joyida
  //
  //  ⚠ NEGA QOROVUL, NEGA HAR YO'LNI ALOHIDA TUZATISH EMAS:
  //    bu predmetlarga KAMIDA BESH tizim tegadi — 🔘 tugma
  //    (`camera.attach`), 🔫 gravitatsiya quroli, 🎯 hitbox,
  //    ⏱ timeline va 🎛 AllKey. Ularning har biri predmetni
  //    ko'rsatib yoki boshqa otaga bog'lab yuborishi mumkin.
  //    Har yo'lni alohida tuzatish uch marta urinib ko'rildi va
  //    har safar YANGI yo'l topildi — chunki ro'yxat to'liq emas
  //    va yangi tizim qo'shilganda yana buzilardi.
  //
  //    Invariantni HAR KADR majburlash esa manbaga bog'liq emas:
  //    kim buzsa ham o'sha kadrda tuzatiladi.
  //
  //  ⚠ JIM TUZATMAYMIZ: buzilish BIR MARTA jurnalga yoziladi.
  //    Qorovul xatoni yashirsa, sabab hech qachon topilmasdi —
  //    endi qaysi predmet buzilgani ko'rinadi.
  // ============================================================
  const _warned = {};
  function _enforceStowed() {
    //  ⚠ RO'YXAT BO'YLAB EMAS, BELGI BO'YLAB. Ilgari `_slots` kezilardi
    //    — ya'ni ro'yxat buzilsa (predmet katakdan tushib qolsa,
    //    `uid` mos kelmasa, `_objOf` `null` qaytarsa) qorovul uni
    //    UMUMAN ko'rmasdi va predmet ko'rinib qolaverardi.
    //    Endi sahnadagi HAR BIR obyekt tekshiriladi va `invHidden`
    //    belgisi bor bo'lganlari yashiriladi. Belgi faqat ikki
    //    joyda qo'yiladi/o'chadi (`_stow` / `_unstow`), ya'ni
    //    ro'yxatning holatiga bog'liq emas.
    const list = (typeof objects !== 'undefined' && objects) ? objects : [];
    const heldObj = _held ? _objOf(_slots[_indexOfUid(_held.uid)]) : null;
    for (let i = 0; i < list.length; i++) {
      const obj = list[i];
      if (!obj || !obj.userData || !obj.userData.invHidden) continue;
      //  ✅ YAGONA ISTISNO — qo'ldagi predmet. U KO'RINISHI kerak,
      //    aks holda o'yinchi qo'lidagi qurolni ko'rmasdi.
      if (heldObj && obj === heldObj) continue;

      let bad = '';
      //  📦 YAGONA QOIDA: sumkadagi predmet SAQLASH JOYIDA turishi
      //     kerak. Ilgari qorovul uch narsani alohida tekshirardi
      //     (ota, ko'rinish, joy) — chunki predmet o'yin maydonida
      //     qolardi va uni \"o'z holida\" ushlab turish kerak edi.
      //     Endi predmet maydondan butunlay chiqarilgan: bitta
      //     tekshiruv yetadi va u har qanday buzilishni qamrab oladi.
      const anchor = _storeAnchor();
      if (anchor && obj.parent !== anchor) {
        bad = 'saqlash joyidan chiqib ketgan (ota: ' +
              (obj.parent === (typeof camera !== 'undefined' ? camera : null) ? 'kamera'
               : (obj.parent && obj.parent.isScene ? 'sahna'
                  : ((obj.parent && obj.parent.name) || 'yo\'q'))) + ')';
        _toStore(obj);
      } else if (obj.visible) {
        //  ⚠ Guruh ko'rinmas bo'lgani uchun bu amalda chizishga
        //    ta'sir qilmaydi — lekin bayroqni toza saqlaymiz, aks
        //    holda `_unstow` dan keyingi holat chalkash bo'lardi.
        bad = "ko'rinib qolgan";
        obj.visible = false;
      }
      if (bad) {
        //  ⚠ JIM TUZATMAYMIZ, lekin har kadr ham yozmaymiz: obyekt
        //    boshiga BIR MARTA. Qorovul xatoni yashirsa sabab hech
        //    qachon topilmasdi; har kadr yozsa konsol to'lib ketardi.
        const key = obj.userData.id != null ? obj.userData.id : i;
        if (!_warned[key]) {
          _warned[key] = 1;
          _log(`🛡 "${obj.userData.name || 'predmet'}" sumkada, lekin ${bad} — tuzatildi`, 'lw');
        }
      }
    }
  }

  function update() {
    const p = _playing();
    if (p !== _wasPlaying) {
      _wasPlaying = p;
      //  Yangi o'yin — ogohlantirishlar ham qaytadan
      for (const k in _warned) delete _warned[k];
      if (p) { _snap(); _preview = false; refresh(); }
      else onPlayStop();
    }
    //  ⚠ HAR KADR, ▶ Play da ham, muharrirda ham: sahna muharrirda
    //    ham tahrirlanadi va predmet o'sha yerda ham ko'rinib qolishi
    //    mumkin (foydalanuvchi aynan buni ko'rgan).
    _enforceStowed();
    // ── ▭ Tanlangan bar katagi HAR DOIM qo'lda ────────────────
    //  ⚠ ALOMAT: predmet ko'tarilib barning 1-katagiga tushardi,
    //    katak \"tanlangan\" bo'lib turardi — lekin predmet QO'LDA
    //    emasdi. Ya'ni ko'rinishi bo'yicha tayyor, aslida esa
    //    🎯 hitbox va 🔘 tugma uni ko'rmasdi. O'yinchi uchun
    //    tushunarsiz: \"barda turibdi, nega ishlamayapti?\"
    //
    //  ⚠ Faqat bar KO'RINGANDA: bar yashirilgan bo'lsa tanlangan
    //    katak tushunchasi yo'q, predmet o'z katagidan olinadi.
    //  ⚠ Oyna ochiq yoki katak ko'chirilayotgan bo'lsa tegilmaydi —
    //    o'yinchi predmetlarni saralayapti, o'rtada qo'lga tiqishtirish
    //    aralashib ketardi.
    //  ⚠ `cfg.autoEquip` o'chiq bo'lsa bu blok UMUMAN ishlamaydi —
    //    predmet sumkaga tushsa o'sha yerda, ko'rinmas holda qoladi.
    //    Qo'lga olish `selectSlot()` orqali, o'yinchi tanlovi bilan.
    if (p && cfg.autoEquip && _barOn() && !_open && !_cursor) {
      const IB = window.InteractiveButtonSystem;
      // Qo'lni BOSHQA tizim band qilgan bo'lsa (gravity gun, skript) —
      // tortishmaymiz, aks holda har kadr \"Qo'l band\" deb yozardik.
      const busy = IB && IB.getCarried ? IB.getCarried() : null;
      const it = _slots[_sel];
      if (it && !_held && !busy) equipSlot(_sel);
      else if (it && _held && _held.uid !== it.uid) equipSlot(_sel);
      else if (!it && _held) unequip();
    }

    // ── Qo'ldagi predmet holatini kuzatamiz ───────────────────
    //  ⚠ NEGA KERAK: predmet qo'ldan inventardan TASHQARI yo'l bilan
    //    ham ketishi mumkin va bu yo'llarning hech biri inventar
    //    haqida bilmaydi:
    //      • 🔘 PICKUP tugmasi bosilsa (`E`) — tizim uni O'ZI tashlaydi
    //      • 🎯 hitbox / 🔘 tugmaning "predmet sharti" uni QABUL qilib
    //        yo'q qiladi (`consume`)
    //      • obyekt sahnadan o'chirilsa
    //    Kuzatmasak katak "arvoh" bo'lib qolardi: rasm turadi, ustiga
    //    bosilsa "obyekt topilmadi" deyilardi.
    if (_held) {
      const i = _indexOfUid(_held.uid);
      if (i < 0) { _held = null; refresh(); return; }
      const obj = _objOf(_slots[i]);
      const IB = window.InteractiveButtonSystem;
      const gone = !obj || !obj.parent;
      const taken = obj && IB && typeof IB.isCarried === 'function' && !IB.isCarried(obj);
      if (gone || taken) {
        if (obj) { delete obj.userData.invUid; delete obj.userData.invPark;
                   delete obj.userData.invHidden; obj.userData.invStored = false; }
        _slots[i] = null;
        _held = null;
        refresh();
      }
    }
  }

  // ============================================================
  //  💾 SAQLASH
  //  ⚠ `SystemRegistry` bu ikki metodni O'ZI topadi — `save-load.js`
  //    ga tegish shart emas. Ikonkalar `data:image/...` bo'lgani
  //    uchun `AssetBundle` ularni `texture/` papkasiga chiqaradi
  //    (kalit nomini bilishi shart emas — qiymatning o'ziga qaraydi).
  // ============================================================
  function serialize() {
    const c = {};
    for (const k in DEF) c[k] = cfg[k];
    return {
      cfg: c,
      sel: _sel,
      slots: _slots.map(s => s ? { uid: s.uid, name: s.name, icon: s.icon || null } : null),
    };
  }

  function restore(d) {
    if (!d || typeof d !== 'object') return;
    if (d.cfg) for (const k in DEF) if (d.cfg[k] !== undefined) cfg[k] = d.cfg[k];
    _slots = Array.isArray(d.slots) ? d.slots.map(s => s ? { uid: s.uid, name: s.name, icon: s.icon || null } : null) : [];
    _resize();
    _sel = Math.max(0, Math.min(_hb() - 1, d.sel | 0));
    _held = null; _cursor = null; _open = false;

    // 🔗 Obyektlar bilan qayta bog'lanish — id bo'yicha EMAS, `invUid`
    //    bo'yicha (yuklashda id lar o'zgaradi, uid esa obyekt bilan
    //    birga keladi).
    let lost = 0;
    for (let i = 0; i < _slots.length; i++) {
      const it = _slots[i];
      if (!it) continue;
      const obj = _objOf(it);
      if (!obj) { _slots[i] = null; lost++; continue; }
      const n = parseInt(String(it.uid).replace('itm_', ''), 10);
      if (!isNaN(n) && n >= _uidSeq) _uidSeq = n + 1;
      _stow(obj);
    }
    if (lost) _log(`⚠ 🎒 ${lost} ta inventar predmetining obyekti topilmadi`, 'lw');
    refresh();
  }

  // ============================================================
  //  🎛 INSPEKTOR (o'yinchi tanlanganda)
  // ============================================================
  function inspectorHTML() {
    const dim = Math.max(0, Math.min(1, cfg.viewDim ?? DEF.viewDim));
    const row = (lbl, inner) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
         <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:96px;flex-shrink:0">${lbl}</span>
         ${inner}</div>`;
    const num = (k, min, max, step) =>
      `<input type="number" min="${min}" max="${max}" step="${step || 1}" value="${cfg[k]}"
        style="width:62px;background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
        oninput="_invSetNum('${k}',this.value,${min},${max})">`;
    const tgl = (k) =>
      `<button onclick="_invSet('${k}',${!cfg[k]})" style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid ${cfg[k] ? 'var(--accent3)' : 'var(--red)'};
        background:${cfg[k] ? 'rgba(var(--accent3-rgb),.1)' : 'rgba(255,68,68,.08)'};color:${cfg[k] ? 'var(--accent3)' : 'var(--red)'}">
        ${cfg[k] ? '✓ Yoqiq' : '✗ O\'chiq'}</button>`;
    const key = (k) =>
      `<button onclick="_invCatchKey('${k}',this)" style="padding:3px 9px;border:1px solid var(--accent);
        background:rgba(var(--accent-rgb),.08);color:var(--accent);font-size:9px;border-radius:3px;cursor:pointer;
        font-family:'Share Tech Mono',monospace">🎯 ${_keyTxt(cfg[k])}</button>`;
    const vmOpt = (id, name) =>
      `<button onclick="_invSetViewMode('${id}')" style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;
        font-size:9px;font-family:'Share Tech Mono',monospace;
        border:1px solid ${cfg.viewMode === id ? 'var(--accent)' : 'var(--border)'};
        background:${cfg.viewMode === id ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
        color:${cfg.viewMode === id ? 'var(--accent)' : 'var(--muted)'}">${name}</button>`;
    const vdOpt = (id, ch, ttl) =>
      `<button onclick="_invSetViewDir('${id}')" title="${ttl}" style="flex:1;padding:4px 2px;border-radius:3px;
        cursor:pointer;font-size:12px;line-height:1;font-family:'Share Tech Mono',monospace;
        border:1px solid ${cfg.viewDir === id ? 'var(--accent)' : 'var(--border)'};
        background:${cfg.viewDir === id ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
        color:${cfg.viewDir === id ? 'var(--accent)' : 'var(--muted)'}">${ch}</button>`;
    const mouseOpt = (id, name) =>
      `<button onclick="_invSet('equipMouse','${id}')" style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;
        font-size:9px;font-family:'Share Tech Mono',monospace;
        border:1px solid ${cfg.equipMouse === id ? 'var(--accent)' : 'var(--border)'};
        background:${cfg.equipMouse === id ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
        color:${cfg.equipMouse === id ? 'var(--accent)' : 'var(--muted)'}">${name}</button>`;

    return `
    <div style="border-top:1px solid rgba(var(--accent-rgb),.15);padding-top:6px;margin-top:6px">
      <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:6px">
        🎒 INVENTAR</div>

      ${row('🎒 Tizim', tgl('enabled'))}
      ${cfg.enabled ? `
      ${row('🎒 Katak soni', num('invSlots', 0, 120, 1))}
      ${row('▦ Ustunlar', num('invCols', 1, 12, 1))}
      ${row('▭ Bar kataklari', num('hotbarSlots', 0, 12, 1))}
      ${row('▭ Bar ko\'rinsin', tgl('hotbarVisible'))}
      ${row('1️⃣ Raqam tugmalari', tgl('hotbarNumbers'))}
      ${row('🖲 Scroll bilan', tgl('wheelSelect'))}
      ${row('✋ PICKUP → inventar', tgl('autoStore'))}
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-2px 0 7px;font-family:'Share Tech Mono',monospace">
        Yoqiq bo'lsa 🔘 PICKUP tugmasi predmetni QO'LGA emas, INVENTARGA soladi.
        O'chirilsa — eski xulq (to'g'ridan qo'lga).
      </div>
      ${row('⏸ Oyna → yurish yo\'q', tgl('pauseMove'))}

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:6px 0 3px">
        🖱 Barga chiqarish / qo'lga olish tugmasi</div>
      <div style="display:flex;gap:3px;margin-bottom:6px">
        ${mouseOpt('right', '🖱 O\'ng')}
        ${mouseOpt('left', '🖱 Chap')}
        ${mouseOpt('dbl', '🖱 ×2')}
      </div>
      ${row('🖱 O\'ng → menyu', tgl('rmbMenu'))}

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:6px 0 3px">
        🔍 Ko'rish oynasi — aylanish</div>
      <div style="display:flex;gap:3px;margin-bottom:4px">
        ${vmOpt('manual', '🖐 Manual')}
        ${vmOpt('auto', '🔄 Auto')}
      </div>
      ${cfg.viewMode === 'auto' ? `
      <div style="display:flex;gap:3px;margin-bottom:5px">
        ${vdOpt('left', '←', 'Chapga')}
        ${vdOpt('right', '→', 'O\'ngga')}
        ${vdOpt('up', '↑', 'Pastdan tepaga')}
        ${vdOpt('down', '↓', 'Tepadan pastga')}
      </div>` : ''}
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:96px;flex-shrink:0">🌫 Fon qoraligi</span>
        <input type="range" min="0" max="1" step="0.01" value="${dim}" style="flex:1"
          oninput="_invSetDim(this.value)">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:32px;text-align:right"
          id="apex-inv-dim-v">${Math.round(dim * 100)}%</span>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-1px 0 7px;font-family:'Share Tech Mono',monospace">
        🌫 <b>0%</b> — fon butunlay shaffof (o'yin ko'rinib turadi),
        <b>100%</b> — qop-qora. Predmet o'zi hamisha to'liq ko'rinadi.<br>
        🖐 <b>Manual</b> — predmet turadi, o'yinchi sichqoncha bilan aylantiradi.<br>
        🔄 <b>Auto</b> — o'zi aylanadi (sudralganda vaqtincha to'xtaydi).<br>
        ⚠ Bu <b style="color:var(--accent)">dizayner</b> qarori: o'yinchi ekranida tanlov
        <b>ko'rinmaydi</b> — u yerda faqat predmetning o'zi turadi.
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-2px 0 7px;font-family:'Share Tech Mono',monospace">
        Yoqiq bo'lsa 🖱 o'ng tugma menyu ochadi: <b style="color:var(--accent)">✋ Ishlatish</b> ·
        <b style="color:var(--accent)">🎯 Tashlash</b> · <b style="color:var(--accent)">🔍 Ko'rish</b>
        (predmetni 360° aylantirib ko'rish — o'sha model, tekstura va o'lcham).<br>
        Predmet <b style="color:var(--accent)">faqat ▭ barda</b> ishlaydi — 🎯 hitbox va
        🔘 tugma tanlangan bar katagini ko'radi. 🎒 oynadagisi shunchaki turadi.<br>
        🎯 Tashlash: <b style="color:#ffaa55">${_keyTxt(cfg.dropKey)}</b> (qo'ldagini uchiradi) yoki
        🔘 PICKUP tugmasining o'z <b style="color:#ffaa55">${_keyTxt('KeyE')}</b> si — ikkalasi ham
        dvigatelning BITTA uchish yo'lidan o'tadi.
      </div>

      ${row('⌨ Ochish', key('openKey'))}
      ${row('🎯 Tashlash', key('dropKey'))}
      ${row('🏷 Sarlavha', `<input value="${_esc(cfg.title)}"
        style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
        oninput="_invSet('title',this.value)">`)}

      <div style="display:flex;gap:4px;margin:7px 0 5px">
        <button onclick="_invPreview()" style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
          font-family:'Share Tech Mono',monospace;border:1px solid var(--accent);
          background:rgba(var(--accent-rgb),.08);color:var(--accent)">👁 Muharrirda ko'rish</button>
        <button onclick="_invPreviewOpen()" style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
          font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
          background:transparent;color:var(--muted)">🎒 Oynani ochish</button>
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);margin:7px 0 3px">
        🎨 Uslub</div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px">
        ${Object.keys(THEMES).map(n => `<button onclick="_invTheme('${n.replace(/'/g, "\\'")}')"
          style="flex:1;min-width:56px;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
          font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
          background:transparent;color:var(--muted)">${n}</button>`).join('')}
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:5px;font-family:'Share Tech Mono',monospace">
        Uslub bosilsa quyidagi maydonga <b>tushadi</b> — o'qib, o'zgartirib
        o'z uslubingizni yasashingiz mumkin.
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);margin:7px 0 3px">
        🎨 CSS — ko'rinishni butunlay o'zgartirish</div>
      <textarea id="apex-inv-css-box" placeholder="/* masalan */
#apex-inv-root{ --inv-size:72px; --inv-accent:#ff9f43 }
#apex-inv-root .apex-slot{ border-radius:14px }"
        style="width:100%;min-height:90px;background:var(--bg);border:1px solid var(--border);color:#9fe8c0;
        padding:5px 7px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:3px;
        outline:none;resize:vertical">${_esc(cfg.css)}</textarea>
      <div style="display:flex;gap:4px;margin-top:4px">
        <button onclick="_invCssApply()" style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
          font-family:'Share Tech Mono',monospace;border:1px solid var(--accent3);
          background:rgba(var(--accent3-rgb),.1);color:var(--accent3)">✓ Qo'llash</button>
        <button onclick="_invCssReset()" style="padding:4px 10px;border-radius:3px;cursor:pointer;font-size:9px;
          font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
          background:transparent;color:var(--muted)">↺</button>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.7;margin-top:5px;font-family:'Share Tech Mono',monospace">
        Sinflar: <b style="color:#9fe8c0">#apex-inv-root</b> ·
        <b style="color:#9fe8c0">.apex-hotbar</b> ·
        <b style="color:#9fe8c0">.apex-inv-back</b> ·
        <b style="color:#9fe8c0">.apex-inv</b> ·
        <b style="color:#9fe8c0">.apex-slot</b> (<i>.sel</i>, <i>.held</i>) ·
        <b style="color:#9fe8c0">.apex-nm</b> · <b style="color:#9fe8c0">.apex-key</b><br>
        O'zgaruvchilar: <b style="color:#9fe8c0">--inv-size</b>, <b style="color:#9fe8c0">--inv-gap</b>,
        <b style="color:#9fe8c0">--inv-accent</b>, <b style="color:#9fe8c0">--inv-bg</b>,
        <b style="color:#9fe8c0">--inv-panel</b>, <b style="color:#9fe8c0">--inv-radius</b>.<br>
        Predmet rasmi 🔘 PICKUP tugmasi inspektorida (Nom yonida) yuklanadi.
      </div>
      ` : ''}
    </div>`;
  }

  // ── Inspektor sozlagichlari (funksiya — audit uni holat deb sanamaydi) ──
  window._invSet = function (k, v) {
    cfg[k] = v;
    if (k === 'hotbarSlots' || k === 'invSlots') _resize();
    refresh();
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._invSetNum = function (k, v, min, max) {
    let n = parseFloat(v);
    if (isNaN(n)) n = DEF[k];
    cfg[k] = Math.max(min, Math.min(max, n));
    _resize(); refresh();
  };
  window._invCatchKey = function (k, btnEl) {
    const orig = btnEl ? btnEl.textContent : '';
    if (btnEl) btnEl.textContent = '⏳ bosing...';
    const h = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      cfg[k] = e.code;
      document.removeEventListener('keydown', h, { capture: true });
      if (typeof updateInspector === 'function') updateInspector();
      else if (btnEl) btnEl.textContent = orig;
    };
    document.addEventListener('keydown', h, { capture: true });
  };
  /**
   * 🌫 Ko'rish foni qoraligi — 0 (shaffof) … 1 (qop-qora).
   *
   * ⚠ `refresh()` EMAS, faqat `_style()`: shkalani sudrayotganda har
   *   harakatда butun inventarni qayta chizsak, `innerHTML` yangilanib
   *   3D kanvas uzilib-ulanardi va sudrash tutilib qolardi. CSS
   *   o'zgaruvchisini almashtirish esa bir satr — DOM tegilmaydi.
   */
  window._invSetDim = function (v) {
    let n = parseFloat(v);
    if (isNaN(n)) n = DEF.viewDim;
    cfg.viewDim = Math.max(0, Math.min(1, n));
    _style();
    const lbl = document.getElementById('apex-inv-dim-v');
    if (lbl) lbl.textContent = Math.round(cfg.viewDim * 100) + '%';
  };
  window._invSetViewMode = function (m) {
    setViewMode(m);
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._invSetViewDir = function (d) {
    setViewDir(d);
    if (typeof updateInspector === 'function') updateInspector();
  };
  /**
   * 🎨 Tayyor uslubni qo'llaydi.
   * ⚠ Matn maydoniga ham YOZILADI: dizayner nimani o'zgartirayotganini
   *   ko'rmasa, uslub "sehrli" bo'lib qolardi va uni sozlab bo'lmasdi.
   */
  window._invTheme = function (name) {
    const css = THEMES[name];
    if (css === undefined) return;
    cfg.css = css;
    const box = document.getElementById('apex-inv-css-box');
    if (box) box.value = css;
    _style();
    refresh();
    try { log(`🎨 Inventar uslubi: ${name}`, 'lok'); } catch (e) {}
  };

  window._invCssApply = function () {
    const box = document.getElementById('apex-inv-css-box');
    if (!box) return;
    cfg.css = box.value || '';
    _style(); refresh();
    _log('🎨 Inventar CSS qo\'llandi', 'lok');
  };
  window._invCssReset = function () {
    cfg.css = '';
    const box = document.getElementById('apex-inv-css-box');
    if (box) box.value = '';
    _style(); refresh();
  };
  window._invPreview = function () {
    _preview = !_preview;
    refresh();
    _log(_preview ? '👁 Inventar ko\'rinishi YOQILDI (muharrir)' : '👁 Inventar ko\'rinishi o\'chdi', 'lok');
  };
  window._invPreviewOpen = function () {
    _preview = true;
    _open = !_open;
    refresh();
  };

  // ── Ishga tushirish ─────────────────────────────────────────
  function init() {
    _resize();
    _installKeys();
    _installWheel();
    _style();
    refresh();
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else setTimeout(init, 60);
  }

  return {
    cfg, DEF,
    THEMES,
    store, equipSlot, takeOut, unequip, dropHeld, selectSlot, selectDelta,
    slotClick: _slotClick,   // katakni ko'chirish (bosish → qo'yish)
    open, close, toggle, isOpen,
    openMenu, closeMenu, openView, closeView, setViewMode, setViewDir,
    menu: () => _menu, viewing: () => (_view ? _view.uid : null), viewFit,
    // 🔍 ko'rish holati — testlar va tashqi skriptlar uchun
    viewState: () => (_view ? {
      uid: _view.uid, mode: cfg.viewMode, dir: cfg.viewDir,
      yaw: _view.yaw, pitch: _view.pitch,
      spin: _view.pivot ? _view.pivot.rotation.x : 0,
    } : null),
    slots: () => _slots.slice(),
    held: () => (_held ? _held.uid : null),
    heldObject: () => (_held ? _objOf({ uid: _held.uid }) : null),
    has: (uid) => _indexOfUid(uid) >= 0,
    count: () => _slots.filter(Boolean).length,
    update, onPlayStop, refresh,
    serialize, restore,
    inspectorHTML,
  };
})();
