// ============================================================
//  🗂 SCENE TYPES — maxsus obyekt turlarining YAGONA ro'yxati
//
//  ⚠ NEGA KERAK BO'LDI: loyihada obyektni tiklashning IKKITA mustaqil
//    yo'li bor edi va ikkalasi bir xil ishni har xil qilardi:
//
//      save-load.js  →  create() + maydonlarni QO'LDA sanash
//      prefab.js     →  restoreVisual() + to'liq userData
//
//    Har bir tizimda tiklash funksiyasi ALLAQACHON bor edi
//    (`HitboxSystem.restoreVisual`, `MapLoaderSystem.restoreVisual`,
//    `SoundBlockSystem.restoreVisual`), lekin ularni FAQAT prefab.js
//    chaqirardi. `save-load.js` ular haqida bilmasdi.
//
//    Natijada bir tomonga qo'shilgan tuzatish ikkinchisiga yetib
//    bormasdi. Shu sababdan chiqqan xatolar:
//      • 🔘 tugma yuklashda kulrang kub bo'lardi
//      • 🦴 suyaklar sahnaga yolg'on kub bo'lib qaytardi
//      • ⏱ timeline umuman saqlanmasdi
//      • ⚖️ PC/tugma/kamera yuklangach yerga qulardi
//
//    To'rttasi ham bitta sababdan: IKKI RO'YXAT, biri yangilanmagan.
//
//  ENDI: bitta ro'yxat, ikkala yo'l ham shundan o'qiydi. Yangi tur
//  qo'shganda BIR joyga yoziladi.
//
//  ── Shartnoma ────────────────────────────────────────────────
//    match(ud)      → shu userData ushbu turgami?
//    restore(mesh)  → ko'rinishni tiklaydi. Yangi Object3D qaytarsa,
//                     chaqiruvchi eskisini almashtiradi (kub → kamera
//                     modeli). `userData` va transformga TEGMAYDI.
//    physics        → `addPhysicsBody` sozlamasi yoki `null` (fizika
//                     berilmaydi). Yaratish yo'lidagi qoidani takrorlaydi.
//
//  ⚠ `restore` ICHIDA fizika qo'shilmaydi — buni chaqiruvchi qiladi,
//    bir marta. Aks holda `create()` ham, ro'yxat ham qo'shib, obyekt
//    ikkita tanaga ega bo'lardi.
// ============================================================

const SceneTypes = (() => {
  'use strict';

  const _list = [];

  /**
   * @param {string} name  ro'yxatdagi nom (xato xabarlari uchun)
   * @param {{match:Function, restore?:Function, physics?:object|null}} def
   */
  function register(name, def) {
    if (!def || typeof def.match !== 'function') {
      console.warn('[SceneTypes] "' + name + '" — match() shart'); return;
    }
    // Bir xil nom ikki marta ro'yxatga tushmasin (skript ikki marta
    // yuklansa jimgina ikkilanardi).
    const i = _list.findIndex(t => t.name === name);
    const entry = { name, match: def.match, restore: def.restore || null,
                    physics: def.physics === undefined ? undefined : def.physics };
    if (i >= 0) _list[i] = entry; else _list.push(entry);
  }

  /** userData ga mos keluvchi birinchi tur (ro'yxat TARTIBI muhim). */
  function match(ud) {
    if (!ud) return null;
    for (const t of _list) { try { if (t.match(ud)) return t; } catch (e) {} }
    return null;
  }

  /**
   * Ko'rinishni tiklaydi.
   * @returns {THREE.Object3D} yakuniy obyekt (mesh yoki uning o'rnini
   *          bosgan yangi obyekt). Almashtirilsa, transform ko'chiriladi
   *          va eskisining resurslari bo'shatiladi.
   */
  function restore(mesh) {
    if (!mesh) return mesh;
    const t = match(mesh.userData);
    if (!t || !t.restore) return mesh;

    let placed;
    try { placed = t.restore(mesh) || mesh; }
    catch (e) {
      // Bitta tur yiqilsa — BUTUN sahna yuklanmay qolmasin.
      //
      // ⚠ LEKIN JIM QOLMASLIK SHART. Bu joyda avval yumshoq 'lw'
      //   ogohlantirish turardi va natija dahshatli edi: masalan PC
      //   blok tiklanmasa, u OQ KUB bo'lib qolardi, tugma unga ulangan
      //   ko'rinardi, lekin bosilganda hech nima bo'lmasdi — va sabab
      //   konsolda bir qator ogohlantirish bo'lib ko'zdan qochardi.
      //   "Ishlamay qoldi, sababi noma'lum" — eng yomon xato turi.
      //
      //   Endi: qizil xato + brauzer konsoliga TO'LIQ stack.
      const msg = '❌ ' + t.name + ' tiklanmadi: ' + (e && e.message ? e.message : e);
      try { (window.log || console.error)(msg, 'le'); } catch (_) {}
      try { console.error('[SceneTypes] ' + t.name, mesh && mesh.userData, e); } catch (_) {}
      return mesh;
    }

    if (placed !== mesh) {
      placed.position.copy(mesh.position);
      placed.rotation.copy(mesh.rotation);
      placed.scale.copy(mesh.scale);
      try { mesh.geometry && mesh.geometry.dispose(); } catch (e) {}
      try { mesh.material && mesh.material.dispose(); } catch (e) {}
    }
    return placed;
  }

  /**
   * Fizika sozlamasi. `null` — fizika BERILMAYDI.
   * Ro'yxatda yo'q tur → oddiy primitiv → `{}` (dinamik, avvalgidek).
   */
  function physicsFor(obj) {
    const ud = (obj && obj.userData) || {};
    const t = match(ud);
    if (t && t.physics !== undefined) return t.physics;

    if (ud.isCamera) return { isStatic: true, radius: 0.4 };
    if (ud.isGLB || ud.isGLTF) return { isStatic: true };
    if (ud.isStatic) return { isStatic: true };
    if (ud._savedPhys) return ud._savedPhys;
    return {};
  }

  const names = () => _list.map(t => t.name);

  /**
   * 📁 Bu userData PAPKAmi?
   *
   * ⚠ NEGA ALOHIDA EKSPORT: papkani tanish qoidasi endi UCH joyda
   *   kerak — yuklovchi (`restore`), o'yinchi to'qnashuvi
   *   (`player.js`) va ◈ pivot (`pivot.js`). Har birida qo'lda
   *   takrorlasak, ular albatta ajralib ketardi: bu loyihada
   *   takrorlangan xato (`_slMergeRest`, `AssetBundle` izohlariga
   *   qarang). Qoida pastdagi `folder` yozuvidan O'QILADI.
   *
   * ⚠ `ud.isGroup` bu yerda ham ATAYLAB tekshirilmaydi — sabab
   *   `folder` yozuvining izohida (GLB modelning ildizi ham Group).
   */
  function isFolder(ud) {
    if (!ud) return false;
    const t = _list.find(x => x.name === 'folder');
    try { return !!(t && t.match(ud)); } catch (e) { return false; }
  }

  return { register, match, restore, physicsFor, names, isFolder, _list };
})();

window.SceneTypes = SceneTypes;

// ============================================================
//  RO'YXAT
//
//  ⚠ TARTIB MUHIM: birinchi mos kelgani ishlaydi.
//    Qarash bloki `isGazeTrigger` VA `isInteractiveBtn` bayroqlarini
//    birga ko'taradi — shuning uchun u tugmadan OLDIN turishi shart,
//    aks holda ko'z ikonasi o'rniga oddiy tugma paneli chiqadi.
//
//  ⚠ `physics` qiymatlari YARATISH yo'lidan olingan — o'zgartirishdan
//    oldin o'sha faylga qarang (test-load-physics.js buni tekshiradi):
//      camera-objects.js:27  → { isStatic: true, radius: 0.4 }
//      hitbox.js:1666        → { isStatic: true }
//      pc-block / interactive-button / map-loader / sound-block /
//      text-block            → addPhysicsBody UMUMAN chaqirilmaydi
//
//  Kelajakda har bir tizim o'zini ro'yxatga olishi mumkin
//  (`SceneTypes.register(...)` o'z faylining oxirida). Hozircha bu yerda
//  markazlashgan — bitta joy, ikkita emas, muammoning ildizi shu edi.
// ============================================================

// 👁 Qarash bloki — kub o'rniga ko'z ikonasi (obyektni ALMASHTIRADI)
SceneTypes.register('gazeTrigger', {
  match:   ud => !!ud.isGazeTrigger,
  restore: mesh => (window.InteractiveButtonSystem
                    && typeof InteractiveButtonSystem.restoreGazeVisual === 'function')
                     ? InteractiveButtonSystem.restoreGazeVisual(mesh) : mesh,
  physics: null,
});

// 📷 Kamera — kub o'rniga kamera modeli (obyektni ALMASHTIRADI)
SceneTypes.register('camera', {
  match:   ud => !!ud.isCamera,
  restore: mesh => (typeof restoreCameraObject === 'function')
                     ? restoreCameraObject(mesh) : mesh,
  physics: { isStatic: true, radius: 0.4 },
});

// 💻 PC blok — korpus + ekran + stend + HTML
//  ⚠ Ildizi GROUP bo'lishi SHART: `PCBlockSystem.create()` shunday yasaydi.
//    Yuklovchilar "PC" turini PRIMITIVES da topolmay KUB qiladi; agar u
//    kub bo'lib qolsa — ortiqcha OQ KUB ko'rinib turadi va o'z scale'i
//    bilan PC qismlarini (korpus + ekran) o'rab, cho'zib yuboradi.
//
//    Bu tuzatish ilgari FAQAT `save-load.js` da bor edi — `prefab.js`
//    da yo'q. Ya'ni prefabdagi har bir PC ortiqcha kub bilan chiqardi.
//    Ro'yxatga ko'chirilgach ikkala yo'l ham to'g'ri ishlaydi.
SceneTypes.register('pcBlock', {
  match: ud => !!ud.isPCBlock,
  restore: mesh => {
    let root = mesh;
    if (mesh.isMesh) {                    // kub bo'lib kelgan — Group ga o'raymiz
      root = new THREE.Group();
      root.userData = mesh.userData;      // havola ko'chadi (nusxa emas)
      // ⚠ Transformni SHU YERDA ko'chiramiz, `restore()` dan OLDIN.
      //   `PCBlockSystem.restore()` ichida `resetCamAnchor()` bor va u
      //   `pc.getWorldScale()` ni o'qiydi. Transform keyin qo'yilsa,
      //   u (1,1,1) ni ko'rardi. (Formulasi scale'ga bog'liq emasligi
      //   uchun hozir zarari yo'q — lekin bu tasodif, unga tayanmaymiz.)
      root.position.copy(mesh.position);
      root.rotation.copy(mesh.rotation);
      root.scale.copy(mesh.scale);
    }
    if (window.PCBlockSystem) PCBlockSystem.restore(root);
    return root;
  },
  physics: null,
});

// 📝 Matn bloki — geometriya + material + tekstura
SceneTypes.register('textBlock', {
  match:   ud => !!ud.isTextBlock,
  restore: mesh => { if (window.TextBlockSystem) TextBlockSystem.restore(mesh); return mesh; },
  physics: null,
});

// 🎯 Hitbox — simli chegara + yarim shaffof to'ldirish
//  ⚠ `physics: null` — hitbox fizikani O'ZI boshqaradi.
//    `_addBlockCollider()` faqat `collisionMode === 'block'` bo'lganda
//    static tana qo'shadi va `_blockColliderAdded` bilan qorovullaydi.
//    Yuklovchi ham qo'shsa — block hitbox IKKITA tanaga ega bo'lardi
//    (qorovul faqat hitboxning o'z tomonida). `inline` hitboxda esa
//    fizika umuman bo'lmasligi kerak — u o'tib ketiladigan zona.
SceneTypes.register('hitbox', {
  match:   ud => !!ud.isHitbox,
  restore: mesh => { if (window.HitboxSystem && HitboxSystem.restoreVisual)
                       HitboxSystem.restoreVisual(mesh); return mesh; },
  physics: null,
});

// 🔊 Sound blok — to'q sariq zona + ovoz-markaz shari
SceneTypes.register('soundBlock', {
  match:   ud => !!ud.isSoundBlock,
  restore: mesh => { if (window.SoundBlockSystem && SoundBlockSystem.restoreVisual)
                       SoundBlockSystem.restoreVisual(mesh); return mesh; },
  physics: null,
});

// 🗺 Map Loader — yashil trigger zonasi
SceneTypes.register('mapLoader', {
  match:   ud => !!ud.isMapLoader,
  restore: mesh => { if (window.MapLoaderSystem && MapLoaderSystem.restoreVisual)
                       MapLoaderSystem.restoreVisual(mesh); return mesh; },
  physics: null,
});

// 🔘 Tugma — yassi yorqin panel
SceneTypes.register('interactiveBtn', {
  match:   ud => !!ud.isInteractiveBtn,
  restore: mesh => { if (window.InteractiveButtonSystem && InteractiveButtonSystem.restoreBtnVisual)
                       InteractiveButtonSystem.restoreBtnVisual(mesh); return mesh; },
  physics: null,
});

// ── Fizikasi yo'q, lekin ko'rinishi o'zi tiklanadigan turlar ──
//    (`restore` yo'q — faqat fizika qoidasi uchun ro'yxatda)
SceneTypes.register('pcCam',     { match: ud => !!ud.isPCCam,     physics: null });
SceneTypes.register('spawn',     { match: ud => !!ud.isSpawn,     physics: null });

// 🔢 MiniPad · 🧊 NoScript — fizika tanasi BERILMAYDI
//
//  ⚠ XATO: ikkalasi ham `create()` da `addPhysicsBody` ni UMUMAN
//    chaqirmaydi — ular devorga o'rnatilgan qulf va mantiqiy blok,
//    yerga quladigan jism emas. Yuklashda esa ular bu ro'yxatda
//    bo'lmagani uchun `physicsFor()` oxirgi qatorga tushib `{}`
//    qaytarardi — ya'ni DINAMIK tana. Natijada sahna saqlanib qayta
//    ochilgach ▶ Play bosilsa qulf devordan uzilib yerga tushardi.
//
//    Bu — \"yaratish va yuklash BIR XIL natija berishi kerak\"
//    qoidasining buzilishi; aynan shu naqsh kamera va GLB uchun
//    allaqachon tuzatilgan (`physicsOptsFor` izohiga qarang).
//
//  ⚠ `colliderMode` ga TEGISHLI EMAS: o'yinchining to'qnashuvi
//    `player.js` da `colliderSize` bo'yicha alohida hisoblanadi va
//    Rapier tanasini talab qilmaydi. Ya'ni 🧱 block rejimidagi
//    MiniPad fizika tanasisiz ham o'tkazmaydi.
SceneTypes.register('miniPad', {
  match: ud => !!ud.isMiniPad,
  restore: mesh => (window.MiniPadSystem && MiniPadSystem.restoreVisual)
                     ? MiniPadSystem.restoreVisual(mesh) : mesh,
  physics: null,
});
SceneTypes.register('noScript', { match: ud => !!ud.isNoScript, physics: null });
//  🎛 AllKey — hududga bog'langan klaviatura sozlamasi.
//  ⚠ `physics: null` — 🎯 hitbox bilan bir xil sabab: bu O'TKAZUVCHI
//    hudud. Qattiq qilsak o'yinchi unga kira olmasdi va tetik hech
//    qachon ishlamasdi.
SceneTypes.register('allKey', {
  match:   ud => !!ud.isAllKey,
  restore: mesh => { if (window.AllKeySystem) AllKeySystem.restoreVisual(mesh); return mesh; },
  physics: null,
});

// 💥 Sinish parchasi — fizika tanasi YUKLASHDA berilmaydi.
//
//  ⚠ Parchaning tanasi faqat `BreakTimeline.set(obj, true)` da
//    yasaladi. Yuklovchi uni o'zi bersa, hali sinmagan (yashirin)
//    parchalar ko'rinmas holda yerga qulab ketardi va ⏱ timeline
//    ularni boshlang'ich joyiga qaytara olmasdi.
//
//  ⚠ Allaqachon SINGAN sahnada ham tana kerak emas: parchalar
//    qulab bo'lgan, ular yotgan joyida qolishi kerak.
SceneTypes.register('fragment', { match: ud => !!ud.isFragment, physics: null });
// 🛤 YO'L (Path) — Mesh emas, GROUP; ko'rinishi KOD bilan quriladi
//
//  ⚠ XATO: yo'l saqlab-yuklaganda oddiy KUBGA aylanib qolardi.
//    `type: 'Path'` `PRIMITIVES` da yo'q → yuklovchi kub yasardi.
//    `test-save-coverage.js` buni "ma'lum kamchilik" deb yozib
//    qo'ygandi (`Path`, `PathShape`).
//
//    Yo'lning gavdasi — chiziq, nuqta sharlari va (yoqilgan bo'lsa)
//    ekstruziya qilingan shakl — faylда SAQLANMAYDI: u `points[]` dan
//    `PathSystem.rebuild()` bilan qayta hisoblanadi. Shuning uchun bu
//    yerda faqat idishni to'g'ri turga keltirib, qayta qurish yetarli.
SceneTypes.register('path', {
  match: ud => !!ud.isPath,
  restore: mesh => {
    if (!mesh || !mesh.isMesh) return mesh;
    const g = new THREE.Group();
    g.userData = mesh.userData;
    g.position.copy(mesh.position);
    g.rotation.copy(mesh.rotation);
    g.scale.copy(mesh.scale);
    while (mesh.children.length) g.add(mesh.children[0]);
    // Chiziq / nuqtalar / shakl — hammasi shu yerda qayta quriladi
    try { if (window.PathSystem && PathSystem.rebuild) PathSystem.rebuild(g); }
    catch (e) { try { console.error('[path] rebuild:', e); } catch (_) {} }
    return g;
  },
  physics: null,
});
SceneTypes.register('pathShape', { match: ud => !!ud.isPathShape, physics: null });

// 📁 PAPKA / GURUH — Mesh emas, GROUP bo'lishi shart
//
//  ⚠ XATO: papka yuklanganda "fizik blok"ka aylanardi. Zanjiri:
//     1. Papka `type` i — 'group' yoki 'Group'. Ikkalasi ham
//        `PRIMITIVES` da YO'Q → yuklovchi KUB yasardi
//        (konsolda: "⚠ Noma'lum tur (group), Kub bilan almashtirildi").
//     2. Kubga `physicsOptsFor` `{}` (dinamik) berardi → papka
//        yerga qulaydigan, urilib turadigan qattiq jismga aylanardi.
//     3. Ichidagi obyektlar esa unga `attach` qilinardi va papkaning
//        geometriyasi/scale'i ular bilan birga ko'rinib qolardi.
//
//  ⚠ NEGA BAYROQ TOPILMASDI: papka `_isFolder` bilan belgilanardi,
//    `_slCleanUD` esa `_` bilan boshlanadigan HAMMA kalitni tashlaydi.
//    `scene-objects.js` dagi `multiGroup()` da `isGroup` (`_` siz) ham
//    bor edi, lekin `hierarchy.js` va `addons.js` dagi papkalarda —
//    yo'q. Endi uchalasida ham bor, ustiga `type` bo'yicha ham
//    aniqlanadi (eski, allaqachon saqlangan fayllar uchun).
SceneTypes.register('folder', {
//  ⚠ `ud.isGroup` ATAYLAB tekshirilmaydi. `prefab.js:437` uni userData ga
//    yozadi va qiymati `obj.isGroup` dan keladi — GLB modelning ildizi esa
//    `THREE.Group`. Ya'ni `isGroup` ni tekshirsak, HAR BIR GLB model papka
//    deb qabul qilinib, `physics: null` olardi va fizikasini yo'qotardi.
//    `type` esa faqat papkalarda 'group'/'Group' bo'ladi (tekshirilgan) va
//    u yozuvning yuqori darajasida saqlanadi — `_slCleanUD` unga tegmaydi.
  match: ud => !!(ud._isFolder || ud.isFolder ||
                  ud.type === 'group' || ud.type === 'Group'),
  restore: mesh => {
    if (!mesh || !mesh.isMesh) return mesh;      // allaqachon Group
    const g = new THREE.Group();
    g.userData = mesh.userData;                  // havola ko'chadi (nusxa emas)
    // `_` li bayroqni qaytaramiz — iyerarxiya ikonasi (📁) va
    // `nested-objects.js` / `inspector.js` shundan o'qiydi.
    g.userData._isFolder = true;
    g.userData.isGroup   = true;
    g.position.copy(mesh.position);
    g.rotation.copy(mesh.rotation);
    g.scale.copy(mesh.scale);
    // Bolalarni ko'chiramiz. `save-load` yo'lida papka hali bo'sh
    // (bolalar keyin `_slPending` bilan biriktiriladi), lekin
    // `prefab.js` yo'lida ular ALLAQACHON ichida bo'ladi.
    while (mesh.children.length) g.add(mesh.children[0]);
    return g;
  },
  physics: null,        // 📁 papka — fizika tanasi YO'Q
});
