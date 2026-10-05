// ============================================================
//  🚗⌨ MASHINA KLAVIATURA PROFILI
// ------------------------------------------------------------
//  O'yinchi mashinaga o'tirganda klaviatura BOSHQACHA ishlaydi:
//  piyodalikda `W` → walk.mp3 va yurish animatsiyasi, mashinada
//  esa o'sha `W` → car.mp3 va boshqa effekt.
//
//  ── HAR MASHINA O'ZINIKI ────────────────────────────────────
//  ⚠ Profil MASHINANING O'ZIDA (`ud.keys` / `ud.sounds`), umumiy
//    "mashina rejimi" da EMAS. Sahnada o'nlab mashina bo'lishi
//    mumkin va dizayner birining ovozini o'zgartirsa, qolganlari
//    ham o'zgarib ketishi kerak emas — yuk mashinasi va sport
//    mashinasi bir xil eshitilmaydi.
//
//  ── NEGA ALMASHTIRMAYMIZ, USTIGA QO'YAMIZ ───────────────────
//  ⚠ Global jadvalni butunlay almashtirsak, mashinada belgilanmagan
//    klavishlar ISHLAMAY qolardi: dizayner faqat `W` ni sozlagan
//    bo'lsa, `E` (o'zaro aloqa) ham o'lik bo'lardi.
//    Shuning uchun faqat YOZILGAN klavishlar ustma-ust qo'yiladi.
//
//  ── ORQAGA QAYTARISH ────────────────────────────────────────
//  ⚠ 🎛 AllKey bilan AYNAN bir naqsh: har o'zgarish OLDIN eski
//    qiymatni eslab qoladi va chiqishda AYNAN o'shani tiklaydi.
//    "Standartga qaytar" deb qattiq qiymat yozsak dizaynerning
//    piyodalik sozlamasi yo'q bo'lardi.
// ============================================================
window.CarKeyProfile = (function () {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);

  let _owner = null;       // profili amalda bo'lgan mashina
  let _prev  = null;       // { kb: {}, snd: {} }

  const owner = () => _owner;

  /** Mashinaning profil jadvallari (kerak bo'lsa yaratiladi). */
  function tables(car) {
    if (!car || !car.userData) return null;
    const ud = car.userData;
    //  ⚠ `_` SIZ nomlangan — sahna bilan saqlanadi. Aks holda
    //    dizaynerning sozlamasi fayl qayta ochilganda yo'qolardi.
    if (!ud.keys)   ud.keys   = {};
    if (!ud.sounds) ud.sounds = {};
    return { keys: ud.keys, sounds: ud.sounds };
  }

  /** Mashinada nechta klavish sozlangan. */
  function count(car) {
    if (!car || !car.userData) return 0;
    return Object.keys(car.userData.keys || {}).length +
           Object.keys(car.userData.sounds || {}).length;
  }

  // ============================================================
  //  ▶ Qo'llash
  // ============================================================
  function apply(car) {
    if (!car || _owner === car) return false;
    if (_owner) revert();
    const t = tables(car);
    if (!t) return false;
    _owner = car;
    _prev = { kb: {}, snd: {} };

    // ── ⌨ Klavish qoidalari ──
    if (!window._kbAnimations) window._kbAnimations = {};
    for (const code in t.keys) {
      const r = t.keys[code];
      if (!r) continue;
      //  ⚠ Eski qiymat BIR MARTA eslab qolinadi. `null` — bu
      //    klavishda ILGARI hech nima yo'q edi; chiqishda uni
      //    BUTUNLAY o'chirish kerak, bo'sh obyekt qoldirsak
      //    `anims[code]` mavjud bo'lib qolib keyingi tekshiruvlar
      //    boshqacha yurardi.
      if (_prev.kb[code] === undefined) {
        const a = window._kbAnimations[code];
        _prev.kb[code] = a ? JSON.parse(JSON.stringify(a)) : null;
      }
      const a = window._kbAnimations[code] || (window._kbAnimations[code] = {});
      //  ⚠ Faqat YOZILGAN maydonlar: `undefined` ni ko'chirsak
      //    piyodalik sozlamasi o'chib ketardi.
      if (r.blocked  !== undefined) a.blocked  = r.blocked;
      if (r.animName)               a.animName = r.animName;
      if (r.altKey)                 a.altKey   = r.altKey;
      if (r.holdEnd  !== undefined) a.holdEnd  = r.holdEnd;
      if (r.animJson !== undefined) a.animJson = r.animJson;
    }

    // ── 🔊 Klavish ovozlari ──
    //  ⚠ Ovozlar ALOHIDA xaritada (`_kbSounds`) — klavish
    //    animatsiyalaridan mustaqil. Uni ham qamrab olmasak
    //    "mashinada W boshqa ovoz chiqarsin" ishlamasdi.
    if (!window._kbSounds) window._kbSounds = {};
    for (const code in t.sounds) {
      const src = t.sounds[code];
      if (!src) continue;
      if (_prev.snd[code] === undefined) {
        _prev.snd[code] = window._kbSounds[code]
          ? JSON.parse(JSON.stringify(window._kbSounds[code])) : null;
      }
      window._kbSounds[code] = JSON.parse(JSON.stringify(src));
    }

    const n = count(car);
    if (n) _log(`🚗⌨ "${car.userData.name}" klaviatura profili qo'llandi (${n})`, 'lok');
    return true;
  }

  // ============================================================
  //  ⏹ Orqaga qaytarish
  // ============================================================
  function revert() {
    if (!_owner || !_prev) return false;
    const nm = _owner.userData ? _owner.userData.name : 'mashina';
    for (const code in _prev.kb) {
      const p = _prev.kb[code];
      if (p === null) delete window._kbAnimations[code];
      else            window._kbAnimations[code] = p;
    }
    for (const code in _prev.snd) {
      const p = _prev.snd[code];
      //  ⚠ Ovoz ham to'xtatiladi: mashinadan tushganda dvigatel
      //    ovozi osilib qolmasin.
      try { if (window._kbSoundStop) window._kbSoundStop(code); } catch (e) {}
      if (p === null) delete window._kbSounds[code];
      else            window._kbSounds[code] = p;
    }
    _owner = null;
    _prev = null;
    _log(`🚗⌨ "${nm}" profili — piyodalik sozlamasiga qaytdi`, 'lok');
    return true;
  }

  // ============================================================
  //  🚗 QAYSI MASHINA — IKKI YO'L
  // ------------------------------------------------------------
  //  1️⃣ O'yinchi mashinaga O'TIRGAN (`carInside` + `activeCar`)
  //  2️⃣ O'yinchining O'ZI mashina — \"o'tirish\" degan holat yo'q,
  //     u boshidan mashina. Model almashtirilsa (boshqa mashina
  //     o'yinchi qilinsa) profil ham o'sha zahoti almashadi, chunki
  //     profil OBYEKTNING O'ZIDA turadi.
  //
  //  ⚠ Ikkinchi yo'lni qo'shmasak, o'yinchi mashina bo'lgan
  //    loyihalarda profil UMUMAN ishlamasdi: `carInside` hech
  //    qachon `true` bo'lmasdi.
  //
  //  ⚠ `carInside` birinchi yo'lda SHART: `activeCar` mashinadan
  //    tushgandan keyin ham to'lib turishi mumkin va profil o'chmay
  //    qolardi.
  // ============================================================
  function _isCar(o) {
    if (!o || !o.userData) return false;
    const ud = o.userData;
    return ud.entityType === 'car' || ud._entityMode === 'vehicle';
  }

  function _currentCar() {
    // 1️⃣ O'tirgan
    const inside = (typeof carInside !== 'undefined') ? carInside : false;
    if (inside && typeof activeCar !== 'undefined' && activeCar) return activeCar;

    // 2️⃣ O'yinchining O'ZI mashina
    //  ⚠ Tartib `SoundBlockSystem._getPlayerRef` bilan bir xil: uch
    //    tizim bir savolga (\"o'yinchi qaysi obyekt?\") boshqa javob
    //    bermasligi kerak.
    const pl = (typeof playerMesh !== 'undefined' && playerMesh) ||
               (window.PlayerController && window.PlayerController.obj) || null;
    if (_isCar(pl)) return pl;

    return null;
  }

  // ============================================================
  //  🔁 Kadr
  // ============================================================
  let _was = false;
  function update() {
    const p = _playing();
    if (p !== _was) {
      _was = p;
      //  ⚠ ▶/⏹ o'tishida HAR DOIM qaytaramiz: o'yin mashinada
      //    to'xtatilsa profil muharrirga ham o'tib ketardi va
      //    dizayner uni qo'lda tuzatishga majbur bo'lardi.
      revert();
      return;
    }
    if (!p) return;

    const car = _currentCar();
    if (car) { if (_owner !== car) apply(car); return; }
    if (_owner) revert();
  }

  return { tables, count, apply, revert, owner, update, _currentCar, _isCar };
})();
