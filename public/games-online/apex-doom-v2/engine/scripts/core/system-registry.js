// ============================================================
//  APEX3D — SYSTEM REGISTRY
//  Sahna saqlanganda HAR BIR tizimdan o'z holatini so'raydi.
//
//  ⚠ MUAMMO: obyekt sozlamalari (`userData`) allaqachon avtomatik
//    saqlanadi — `ud: _slCleanUD(o.userData)` ularni birma-bir
//    sanamasdan oladi. Shuning uchun kubning tezligi, rangi, hitbox
//    sozlamalari, tugma ulanishlari — hammasi joyida.
//
//    Lekin TIZIMLARNING O'Z holati modul ichida yopiq turadi:
//
//        const CameraStates = (() => {
//          let _profiles = {};        ← JS CLOSURE — tashqaridan
//          ...                          O'QIB BO'LMAYDI
//        })();
//
//    `game.zip` ichida dvigatel TO'LIQ ko'chadi, lekin dvigatel — bu
//    KOD, holat emas. Yangi brauzerda modul ishga tushadi va o'zining
//    BO'SH standartlari bilan boshlanadi. Shuning uchun kamera FX,
//    kapsula presetlari, klaviatura bog'lanishlari "yo'qolgan"dek
//    ko'rinardi.
//
//  ⚠ NEGA RO'YXAT EMAS: `save-load.js` da 9 ta tizim QO'LDA sanalgan
//    edi (`SkyboxSystem.serialize()`, `TimelineSystem.serialize()`…).
//    Yangi tizim qo'shilsa — ro'yxatni yangilash esdan chiqardi va
//    holat jimgina yo'qolardi. Bu loyihada takrorlangan xato
//    (`_slMergeRest`, `SceneTypes`, `AssetBundle` izohlariga qarang).
//
//    Bu reyestr `window` ni kezib, `serialize()` metodiga ega HAR BIR
//    tizimni O'ZI topadi. Yangi tizim yozgan dasturchi faqat
//    `serialize()` / `restore()` qo'shadi — saqlovchiga tegish
//    SHART EMAS.
//
//  ── Tizim uchun shartnoma ────────────────────────────────────
//      serialize()      → JSON'ga aylanadigan holat (yoki null)
//      restore(data)    → o'sha holatni qaytaradi
//
//    Ikkalasi ham IXTIYORIY: faqat `serialize()` bo'lsa — saqlanadi,
//    lekin tiklanmaydi (va bu ogohlantirish sifatida yoziladi).
// ============================================================

const SystemRegistry = (() => {
  'use strict';

  // ⚠ Bu tizimlar `save-load.js` da ALOHIDA, aniq nom bilan
  //   chaqiriladi (formati boshqacha yoki tartib muhim).
  //   Reyestr ularni ikkinchi marta yozmasligi kerak.
  const HANDLED = new Set([
    'SkyboxSystem',       // skybox:      (rasm/tekstura bilan)
    'TimelineSystem',     // timeline:    (trek + keyframe)
    'GravityGunSystem',   // gravityGun:
    'SoundSystem',        // audio:       (baytlar AssetBundle bilan)
    //  ⚠ 58.50 dan boshlab `window.SoundSystem` ham bor. Bu ro'yxatda
    //    QOLDIRILADI: aks holda u IKKI MARTA saqlanardi — `audio:`
    //    maydonida va `systems.SoundSystem` da. Ovoz baytlari og'ir,
    //    fayl ikki barobar shishardi.
    'CameraShakeSystem',  // cameraShake:
    'AddonSystem',        // addons:      (papkaga chiqadi)
    'ObjectRoleSystem',   // obyekt ichida
    'PerFaceTextures',    // obyekt ichida
    'TextureLoopSystem',  // obyekt ichida
    // Taqlid nomlar (yuqoridagilar bilan bir obyekt)
    'Skybox', 'Timeline', 'GravityGun', 'Sound', 'CameraShake', 'Addons',
  ]);

  // ⚠ Bular tizim EMAS — asboblar/yordamchilar. `serialize` bo'lsa ham
  //   sahna holati emas.
  const SKIP = new Set([
    'AssetBundle', 'SceneTypes', 'UndoSystem', 'GameLock',
    'SystemRegistry', 'JSON',
  ]);

  /**
   * `window` dagi barcha tizimni topadi.
   *
   * ⚠ TAQLIDLAR: bitta tizim IKKI nom bilan turishi mumkin —
   *     window.CameraStateSystem = window.CameraState = CameraStates;
   *     window.CapsuleSystem     = window.Capsule     = …
   *   Ikkalasi ham bir OBYEKTGA ishora qiladi. Ro'yxatga ikki marta
   *   tushsa, holat JSON'da ikkilanardi va `restore()` ikki marta
   *   chaqirilardi. Obyekt AYNIYATI bo'yicha filtrlaymiz va
   *   UZUNROQ nomni tanlaymiz (`…System` — aniqroq).
   */
  function discover() {
    const seen = new Map();          // obyekt → yozuv
    if (typeof window === 'undefined') return [];
    for (const name of Object.keys(window)) {
      if (SKIP.has(name) || HANDLED.has(name)) continue;
      if (!/^[A-Z]/.test(name)) continue;
      let v;
      try { v = window[name]; } catch (e) { continue; }
      if (!v || typeof v !== 'object') continue;
      if (typeof v.serialize !== 'function') continue;
      const prev = seen.get(v);
      if (prev && prev.name.length >= name.length) continue;   // qisqarog'i — tashlaymiz
      seen.set(v, { name, sys: v, hasRestore: typeof v.restore === 'function' });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Barcha tizimdan holatini so'raydi.
   * ⚠ Bitta tizim yiqilsa QOLGANLARI saqlanadi (`main-loop._safe` g'oyasi).
   * @returns {{data: object, count: number, errors: string[]}}
   */
  function serializeAll() {
    const data = {}, errors = [];
    let count = 0;
    for (const { name, sys, hasRestore } of discover()) {
      try {
        const v = sys.serialize();
        if (v == null) continue;                       // holat yo'q — o'tkazamiz
        if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) continue;
        data[name] = v;
        count++;
        if (!hasRestore) errors.push(`${name}: serialize() bor, restore() YO'Q — tiklanmaydi`);
      } catch (e) {
        errors.push(`${name}.serialize(): ${e && e.message ? e.message : e}`);
      }
    }
    return { data, count, errors };
  }

  /**
   * Saqlangan holatni tizimlarga qaytaradi.
   * ⚠ Tizim yo'q bo'lsa (eski fayl, olib tashlangan modul) — jimgina
   *   o'tkazamiz: yuklash TO'XTAMASLIGI kerak.
   */
  function restoreAll(data) {
    const errors = [];
    let count = 0;
    if (!data || typeof data !== 'object') return { count, errors };
    for (const name of Object.keys(data)) {
      let sys;
      try { sys = window[name]; } catch (e) { continue; }
      if (!sys || typeof sys.restore !== 'function') continue;
      try { sys.restore(data[name]); count++; }
      catch (e) { errors.push(`${name}.restore(): ${e && e.message ? e.message : e}`); }
    }
    return { count, errors };
  }

  /** Diagnostika: `systemRegistryReport()` konsolda. */
  function report() {
    const found = discover();
    return {
      serializable: found.map(f => f.name + (f.hasRestore ? '' : ' ⚠ restore yo\'q')),
      handledSeparately: [...HANDLED],
      total: found.length,
    };
  }

  return { discover, serializeAll, restoreAll, report, HANDLED, SKIP };
})();

window.SystemRegistry = SystemRegistry;
window.systemRegistryReport = SystemRegistry.report;
