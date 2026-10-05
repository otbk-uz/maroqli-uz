// ============================================================
// SAVE / LOAD SCENE
// ============================================================
// ── ⚠ YANGI: userData ni to'liq saqlash/tiklash yordamchisi ──────────
// Eski kod obyektlarni QAT'IY WHITELIST bilan saqlardi (name, type, isHitbox...).
// Ro'yxatga tushmagan HAR QANDAY xususiyat saqlashda YO'QOLARDI:
//   platformMode, colliderMode, isInteractiveBtn, btnMode, attachedToId,
//   camViewMode, camLookTarget, fov, physMode, colliderSize, parentId ...
// Shu sabab "ICHKI" platforma rejimi sahna qayta yuklangach 'external' ga
// qaytib qolardi — ya'ni ishlamayotgandek ko'rinardi.
// Endi blacklist: runtime maydonlar tashlanadi, qolgani to'liq saqlanadi.
// ============================================================
//  📁 ZIP tuzilmasi:  apex-file.json · models/ · texture/ · sound/
//                     video/ · html/ · maps/
//  ⚠ `texture/` (birlikda) — `AssetBundle` bilan bir xil nom. Yo'l
//    JSON ning O'ZIDA saqlanadi (`textureFile: 'texture/tex_5_x.png'`),
//    shuning uchun eski `textures/` li fayllar ham ochilaveradi.
//
//  🚫 _slSkip — saqlashga TUSHMASLIGI kerak bo'lgan obyektlar
//
//  ⚠ NEGA KERAK: `objects[]` faqat foydalanuvchi yaratgan narsalarni
//    emas, ICHKI YORDAMCHILARNI ham saqlaydi:
//      • suyaklar (bone-system `objects.push(bone)` qiladi — timeline va
//        tugma target'i ularni shu yerdan topadi);
//      • suyak markerlari (`__bm__`, `__bh__` sferalar);
//      • GLB ning ichki qismlari (`_glbPart`).
//
//    Ilgari filtr FAQAT `_glbPart` ni tekshirardi. Natijada rigli model
//    yuklanganda uning HAR BIR SUYAGI alohida obyekt bo'lib ZIP ga
//    tushardi. Suyakda `type` yo'q → yuklashda `PRIMITIVES` dan
//    topilmasdi → "Noma'lum tur (undefined), Kub bilan almashtirildi"
//    va sahnada model atrofida o'nlab yolg'on kub paydo bo'lardi.
//
//    `_noSave` / `__noSave` bayroqlari bone-system.js va sound-block.js
//    da ALLAQACHON qo'yilgan edi — shunchaki hech kim o'qimasdi.
//    (sound-block.js dagi izoh buni ochiq tan oladi: "serializer
//    hisobga olsa".) Endi o'qiladi.
// ============================================================
function _slSkip(o) {
  const ud = o && o.userData;
  if (!ud) return false;
  // ⚠ `isPathShape` — yo'lning ekstruziya qilingan gavdasi. U
  //   `PathSystem.rebuild()` bilan `points[]` dan QAYTA HISOBLANADI.
  //   Saqlansa, yuklashda IKKITA shakl paydo bo'lardi: biri fayldan
  //   (kub ko'rinishida), biri rebuild dan.
  // ⚠ 🗺 KARTA OBYEKTLARI — sahnaga TEGISHLI EMAS.
  //
  //   `_mlLoaded`  — Map Loader yuklagan karta obyekti
  //   `_mlPrevObj` — muharrirdagi karta ko'rish (preview) obyekti
  //
  //   Busiz karta ochiq turganda saqlansa (yoki o'yin qilib eksport
  //   qilinsa) ular sahnaga QOTIB qolardi. Va eng yomoni — buzilgan
  //   holatda:
  //     • `visible: false` SAQLANADI (build 58 dan beri),
  //     • `_mlOff` esa `_` bilan boshlangani uchun SAQLANMAYDI.
  //   Natijada yuklanganda ko'rinmas, lekin ISHLAYDIGAN narvon/hitbox/
  //   tugma paydo bo'lardi — 58.13 da tuzatilgan xatoning aynan o'zi,
  //   faqat endi faylga yozilgan va runtime da tuzatib bo'lmaydigan.
  //
  //   ⚠ "Saqlab qolingan" elementlar (`_mlKept`) TASHLANMAYDI: ular
  //     uchun `_mlLoaded = false` qilinadi — ular ataylab sahnaga
  //     o'tkazilgan.
  if (ud._mlLoaded || ud._mlPrevObj) return true;

  return !!(ud._glbPart || ud._noSave || ud.__noSave || ud._gazePart ||
            ud.isBone || o.isBone || ud.isPathShape);
}

const _SL_RUNTIME = new Set(['id','parentId','textureBase64','textureName','_glbBuffer']);

// ── ⚠ `_` BILAN BOSHLANSA HAM SAQLANADIGAN KALITLAR ───────────
//  Qoida oddiy: `_` — "bu runtime holati, saqlanmaydi". Lekin
//  ayrim SOZLAMALAR tarixiy sabablarga ko'ra `_` bilan nomlangan.
//
//  ⚠ 🚗 `_carCfg` — MASHINANING BUTUN SOZLAMASI: tezlik ·
//    tezlanish · tormoz · peredachalar · rul burchagi · kamera
//    (masofa · balandlik · boshlang'ich burchak) · o'tirish
//    nuqtasi · dvigatel va signal ovozi.
//
//    U `weapon.js` da `o.userData._carCfg` ga yoziladi va
//    `_slCleanUD` uni `_` tufayli TASHLAB YUBORARDI. Ya'ni
//    mashinani sozlaysiz, saqlaysiz, qayta ochasiz — hamma
//    sozlama standartga qaytadi. Konsolda ogohlantirish yo'q.
//
//  ⚠ Nomni o'zgartirmadik: u kodda 20 dan ortiq joyda
//    ishlatiladi va eski sahnalarda ham shu nom bilan turadi.
//    Istisno ro'yxati — kamroq xavfli yo'l.
const _SL_KEEP_UNDERSCORE = new Set(['_carCfg']);

function _slCleanUD(ud) {
  if (!ud) return {};
  const out = {};
  for (const k in ud) {
    if (_SL_RUNTIME.has(k)) continue;
    if (k.startsWith('_') && !_SL_KEEP_UNDERSCORE.has(k)) continue;
    const v = ud[k];
    if (typeof v === 'function') continue;
    if (v instanceof Map || v instanceof Set) continue;
    if (v && v.isObject3D) continue;
    try { out[k] = JSON.parse(JSON.stringify(v)); } catch { /* skip */ }
  }
  return out;
}
// Saqlangan id larni yangi id larga ko'chirish (prefab tizimidagi kabi)
// ⚠ MUHIM: faqat ODDIY obyekt/massivga kiramiz.
//   Ilgari bu funksiya userData ichidagi DOM elementlari (PC block CSS3D div,
//   iframe), THREE obyektlari va shunga o'xshash "jonli" obyektlarni ham kezib,
//   ularning HAR BIR xususiyatiga yozardi. `for..in` DOM elementda `outerText`
//   kabi setter'larni ham sanaydi va unga yozilganda Firefox
//   "Element has no parent" xatosini tashlab, YUKLASHNI TO'XTATARDI.
function _slIsPlain(o) {
  if (typeof Node !== 'undefined' && o instanceof Node) return false;   // DOM
  if (o.isObject3D || o.isMaterial || o.isTexture || o.isBufferGeometry) return false;
  const p = Object.getPrototypeOf(o);
  return p === Object.prototype || p === null;                          // faqat {} obyekt
}
function _slRemapIds(val, map, depth = 0) {
  if (depth > 12 || val == null) return val;
  if (Array.isArray(val)) return val.map(v => _slRemapIds(v, map, depth + 1));
  if (typeof val === 'object') {
    if (!_slIsPlain(val)) return val;      // DOM / THREE / boshqa — tegmaymiz
    for (const k in val) {
      const v = val[k];
      // ── ⚠ OBYEKTNING O'Z `id` SIGA TEGILMAYDI ──────────────────
      //  `depth === 0` — bu `o.userData` ning ildizi, ya'ni `id`
      //  obyektning O'Z shaxsi. U yuklashda ALLAQACHON yangi qiymat
      //  bilan berilgan (`++objIdC`), xarita esa ESKI→YANGI.
      //
      //  ⚠ XATO: yangi id tasodifan biror ESKI id ga teng bo'lsa,
      //    u ikkinchi marta ko'chirilardi va obyekt BOShQA obyektning
      //    id sini olib qolardi. Sahna o'rtasidan bitta obyekt
      //    o'chirilgan bo'lsa yetarli — id lar uzuq bo'ladi va
      //    to'qnashuv deyarli muqarrar:
      //
      //      eski:  1 Zamin · 3 B · 4 Nishon · 5 Lava
      //      yangi: 1        · 2   · 3       · 4
      //      xarita: 1→1, 3→2, 4→3, 5→4
      //      Nishon ning yangi id si 3 → xaritada "3" bor → 2 bo'lib
      //      ketadi va B bilan TO'QNASHADI.
      //
      //  Oqibati: 🎲 Roll ning spawn bloki, 🎯 hitbox ning kamerasi,
      //  🔘 tugmaning nishoni — hammasi noto'g'ri obyektga bog'lanardi.
      //  Alomat: o'yinchi tanlangan blok o'rniga damage blokining
      //  ustida tirilardi.
      //
      //  ⚠ Ichkaridagi (`depth > 0`) `id` kalitlari — HAVOLA, ular
      //    ko'chirilishi SHART.
      if (depth === 0 && k === 'id') continue;
      if ((typeof v === 'string' || typeof v === 'number') && /(^|[a-z])id$/i.test(k)) {
        if (map.has(String(v))) { val[k] = map.get(String(v)); continue; }
      }
      // 🎯 id lar massivi (masalan pcBlock.targets: [10,20,30]) — har bir
      //    raqamli/matnli elementни ham ko'chiramiz. Kalit nomi 'targets',
      //    'ids', yoki '...Ids' bo'lsa.
      if (Array.isArray(v) && /(targets|ids|Ids)$/.test(k)) {
        val[k] = v.map(el =>
          (typeof el === 'string' || typeof el === 'number') && map.has(String(el))
            ? map.get(String(el)) : _slRemapIds(el, map, depth + 1));
        continue;
      }
      val[k] = _slRemapIds(v, map, depth + 1);
    }
    return val;
  }
  return val;
}

// ============================================================
//  🔁 _slMergeRest — oq ro'yxatdan TASHQARIDA qolgan maydonlarni tiklash
//
//  ⚠ MUAMMO: hitbox / map-loader / sound-block `continue` bilan tugaydigan
//    ALOHIDA shoxlarda tiklanadi. O'sha shoxlar maydonlarni QO'LDA sanab
//    ko'chiradi (`hb.userData.hitboxSize = od.hitboxSize; ...`). Ro'yxatga
//    kirmagan maydon — jimgina yo'qoladi. Topilgan yo'qotishlar:
//       • hitbox `itemReq`      — 📦 butun "predmet sharti" xususiyati
//       • sound-block `zoneShape`, `audioOffset`
//
//    Bu — tugma va suyaklar bilan bo'lgan AYNAN O'SHA naqsh: yangi
//    xususiyat qo'shilganda ikkinchi faylni yangilash unutiladi.
//
//  YECHIM: `od.ud` da TO'LIQ userData allaqachon saqlangan (`_slCleanUD`).
//    Oq ro'yxat ishlagandan keyin, TEGILMAGAN kalitlarni undan
//    to'ldiramiz. Endi hitbox/sound-block/map-loader ga yangi maydon
//    qo'shilsa — save-load ga tegish SHART EMAS, o'zi saqlanadi.
//
//  ⚠ Oq ro'yxat USTUNROQ: u migratsiya mantiqini bajaradi (masalan
//    `autoUnloadV2` eski sahnalarni yangi standartga o'tkazadi). Shuning
//    uchun faqat `undefined` bo'lgan kalitlar to'ldiriladi.
// ============================================================
/**
 * Yaratilgandan KEYINGI holatni suratga oladi.
 *
 * ⚠ NEGA KERAK: `_slMergeRest` "oq ro'yxat qo'ygan qiymatga
 *   tegmaymiz" degan qoidaga amal qiladi va buni `!== undefined`
 *   bilan aniqlardi. Lekin `create()` HAMMA standart maydonni
 *   allaqachon qo'yib bo'lgan bo'ladi — ya'ni hech biri
 *   `undefined` emas va merge HECH QACHON ishlamasdi.
 *
 *   Oqibati: shu funksiya "tuzatdi" deb yozilgan yo'qotishlar
 *   aslida tuzatilmagan edi. O'lchov bilan tasdiqlangani:
 *     • 🎯 hitbox   `itemReq`     — butun \"predmet sharti\"
 *     • 🔊 sound    `zoneShape` · `audioOffset`
 *     • 🗺 map      `alignToOld` · `mapEnv`
 *
 *   Surat bilan endi FARQLAY olamiz:
 *     qiymat suratdagidek → shox unga TEGMAGAN → fayldan olamiz
 *     qiymat o'zgargan    → shox ATAYLAB qo'ygan → tegmaymiz
 */
function _slSnap(obj) {
  const out = {};
  if (obj && obj.userData) {
    for (const k in obj.userData) {
      try { out[k] = JSON.stringify(obj.userData[k]); } catch (e) { out[k] = undefined; }
    }
  }
  return out;
}

function _slMergeRest(obj, od, skipKeys, snap) {
  if (!obj || !od || !od.ud) return obj;
  const skip = skipKeys || _SL_SYSTEM_KEYS;
  for (const k in od.ud) {
    if (skip.has(k)) continue;
    if (obj.userData[k] === undefined) { obj.userData[k] = od.ud[k]; continue; }
    // ⚠ Qiymat bor — lekin uni SHOX qo'ydimi yoki `create()` mi?
    if (!snap) continue;                       // surat yo'q — eski, ehtiyotkor xulq
    if (!(k in snap)) continue;                // shox qo'shgan yangi kalit — tegmaymiz
    let cur; try { cur = JSON.stringify(obj.userData[k]); } catch (e) { continue; }
    if (cur !== snap[k]) continue;             // shox o'zgartirgan — hurmat qilamiz
    obj.userData[k] = od.ud[k];                // tegilmagan standart — fayldan tiklaymiz
  }
  return obj;
}
// Tizim o'zi boshqaradigan kalitlar — `od.ud` dan KO'CHIRILMAYDI.
const _SL_SYSTEM_KEYS = new Set([
  'id',        // yangi id `create()` dan keladi
  'parentId',  // iyerarxiya `_slPending` orqali tiklanadi
]);

// ============================================================
//  🔢 _slCheckDupIds — bir xil `id` li obyektlarni topish
//
//  ⚠ NEGA: `id` butun dvigatel bo'ylab HAVOLA sifatida ishlatiladi —
//    tugma → PC (`pcBlock.targetId`), hitbox → kamera (`camId`),
//    yo'l → obyekt va h.k. Qidiruv hamma joyda bir xil:
//        objects.find(o => o.userData.id === X)
//    `find` BIRINCHI mos kelganini qaytaradi. Ikkita obyekt bir xil
//    id ga ega bo'lsa — havola JIMGINA noto'g'ri obyektga tushadi.
//
//    Haqiqiy holat (foydalanuvchi sahnasi): `Map Loader 1` va `PC 8`
//    ikkalasi ham id=8. Map Loader ro'yxatda oldinroq turgani uchun
//    tugma PC ni emas, Map Loader ni topardi. Inspektorda "ulangan"
//    ko'rinardi, bosilganda hech nima bo'lmasdi.
//
//  Bu funksiya saqlashda ham, yuklashda ham chaqiriladi — muammo
//  faylga yozilishidan OLDIN ko'rinsin.
// ============================================================
function _slCheckDupIds(list, getId, getName, where) {
  const seen = new Map();
  const dups = [];
  for (const it of list) {
    const id = getId(it);
    if (id == null) continue;
    const k = String(id);
    if (seen.has(k)) dups.push({ id: k, a: seen.get(k), b: getName(it) });
    else seen.set(k, getName(it));
  }
  if (dups.length) {
    log(`⚠ ${where}: ${dups.length} ta TAKRORLANGAN id topildi — havolalar ` +
        `noto'g'ri obyektga tushishi mumkin:`, 'lw');
    for (const d of dups) log(`     id=${d.id} → "${d.a}" va "${d.b}"`, 'lw');
  }
  return dups;
}

// ⚠ `saveScene` ZIP yasab, darrov YUKLAB oladi. O'yin eksporti uchun
//   bizga ZIP obyektining O'ZI kerak (uni game.zip ichiga solish uchun).
//   `_returnZip = true` bersak — yuklamaydi, ZIP'ni qaytaradi.
//   Shu tufayli sahna serializatsiyasi IKKILANMAYDI: bitta manba,
//   bitta format, kelajakdagi tuzatishlar ikkalasiga ham tegadi.
// ── perFace teksturalarini JSON ichidan textures/ papkaga chiqarish ──
//    Ilgari har yuz uchun base64 rasm JSON ichiga yozilardi (bitta kub 12 MB!).
//    Endi rasm faylga chiqadi, JSON'da faqat fayl nomi qoladi.
function _pfToFiles(pf, obj, zip) {
  if (!pf || !pf.faces) return pf;
  try {
    pf.faces.forEach((f, i) => {
      if (!f.textureBase64) return;
      const nm = (f.textureName || ('face' + i)).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const file = 'pf_' + (obj.userData && obj.userData.id) + '_' + i + '_' + nm;
      const b64 = f.textureBase64;
      const ci = b64.indexOf(',');
      zip.folder('texture').file(file, ci >= 0 ? b64.substring(ci + 1) : b64, { base64: true });
      f.textureFile = 'texture/' + file;
      delete f.textureBase64;          // JSON yengil bo'ladi
    });
  } catch (e) { /* xato bo'lsa eski holida qoladi */ }
  return pf;
}

// ============================================================
//  💡 CHIROQLAR · ✨ ZARRACHALAR · 🌫 TUMAN · ⚖️ FIZIKA · 🎨 MATERIAL
//
//  ⚠ Bularning HECH BIRI saqlanmasdi. `lights` so'zi bu faylda bir
//    marta ham uchramasdi — ya'ni foydalanuvchi sahnaga qo'ygan har
//    bir chiroq (rangi, quvvati, joyi, soyasi) yuklashda YO'QOLARDI
//    va o'rniga `lights.js` dagi standart uchta chiroq turardi.
//    Sahna "boshqa rangda" ochilishining asosiy sababi shu edi.
//
//    Fizika ham shunday: 50 kg qilib qo'yilgan quti yuklanganda
//    `addPhysicsBody` ning standart 1 kg i bilan qaytardi — og'irlik
//    markazi, turtish va gravity gun cheklovlari boshqacha ishlardi.
//
//    Materialda esa faqat `color/roughness/metalness` va faqat
//    BIRINCHI slot saqlanardi: shaffoflik, nur (emissive), simli
//    ko'rinish, ikkinchi material — hammasi standart holatga qaytardi.
// ============================================================

/**
 * 🌍 Dvigatelning O'Z zaminimi?
 *
 * ⚠ NEGA KERAK: sahna almashtirilganda zamin O'CHIRILMAYDI va
 *   fayldan QAYTA YARATILMAYDI — u dvigatel ishga tushganda bir marta
 *   yasaladi va shundoq qolaveradi.
 *
 * ⚠ ILGARI bu qaror `isStatic` bo'yicha qabul qilinardi:
 *      tozalash:  if (!o.userData.isStatic) { o'chir }
 *      yuklash:   if (od.isStatic) continue;
 *   Ya'ni HAR QANDAY statik obyekt "zamin" deb hisoblanardi.
 *   Foydalanuvchi fizikasini o'chirgan devor, platforma, dekoratsiya —
 *   hech biri yangi sahnada PAYDO BO'LMASDI, eskisi esa o'chmasdi.
 *   Tashqaridan: "faqat fizikasi yoniq obyektlar spawn bo'lyapti".
 *
 *   Endi faqat AYNAN zamin. Eski fayllarda `isGround` yo'q — nom va
 *   tur bo'yicha ham tanaladi.
 */
const _slIsGround = u => !!(u && (u.isGround === true ||
  (u.type === 'Tekislik' && (u.name === 'Zamin' || u.name == null))));

const _slV3 = v => v ? { x: v.x, y: v.y, z: v.z } : null;
const _slHex = c => c ? '#' + c.getHexString() : null;

function _slLightsOut() {
  let arr; try { arr = lights; } catch (e) { return []; }
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const e of arr) {
    const L = e && e.light; if (!L) continue;
    out.push({
      type: e.type || 'point',
      name: e.name || null,
      color: _slHex(L.color),
      intensity: L.intensity,
      pos: _slV3(L.position),
      rot: L.rotation ? { x: L.rotation.x, y: L.rotation.y, z: L.rotation.z } : null,
      distance: L.distance, angle: L.angle, penumbra: L.penumbra, decay: L.decay,
      castShadow: !!L.castShadow,
      visible: L.visible !== false,
      shadowBias: (L.shadow && L.shadow.bias != null) ? L.shadow.bias : undefined,
      // Directional/Spot ning nishoni — bo'lmasa chiroq boshqa yoqqa qaraydi
      target: (L.target && L.target.position) ? _slV3(L.target.position) : null,
      // Papka ichidagi chiroq — iyerarxiya `_slPending` bilan tiklanadi
      oldParentId: (e.parent && e.parent.userData && e.parent.userData.id != null)
                     ? String(e.parent.userData.id) : null,
      ud: _slCleanUD(L.userData),
    });
  }
  return out;
}

/** Mavjud chiroqlarni tozalaydi (standart uchtasi fayldagilar ustiga qo'shilmasin). */
function _slLightsClear() {
  let arr; try { arr = lights; } catch (e) { return; }
  if (!Array.isArray(arr)) return;
  for (const e of arr.slice()) {
    const L = e && e.light; if (!L) continue;
    const par = e.parent || scene;
    try { if (L.parent) L.parent.remove(L); } catch (x) {}
    try { if (e.helper && e.helper.parent) e.helper.parent.remove(e.helper); } catch (x) {}
    try { if (e.marker && e.marker.parent) e.marker.parent.remove(e.marker); } catch (x) {}
    try { if (L.target && L.target.parent) L.target.parent.remove(L.target); } catch (x) {}
    void par;
  }
  arr.length = 0;
}

/**
 * @param {Array}  list     saqlangan chiroqlar
 * @param {Array}  pending  iyerarxiya kutish ro'yxati (ixtiyoriy)
 * @param {object} opts
 *   clear — `false` bo'lsa mavjud chiroqlar TOZALANMAYDI (Map Loader:
 *           karta yorug'ligi sahnaga QO'SHILADI, eskisi yashiriladi)
 *   tag   — yaratilgan chiroqqa qo'yiladigan belgi (`_mlLight`), keyin
 *           ularni topib olib tashlash uchun
 */
function _slLightsIn(list, pending, opts) {
  if (!Array.isArray(list) || !list.length) return 0;
  opts = opts || {};
  if (opts.clear !== false) _slLightsClear();
  const created = [];
  let n = 0;
  for (const ld of list) {
    let entry = null;
    const pos = ld.pos ? new THREE.Vector3(ld.pos.x, ld.pos.y, ld.pos.z) : undefined;
    const col = ld.color ? new THREE.Color(ld.color).getHex() : undefined;
    const o   = { pos, color: col, intensity: ld.intensity,
                  distance: ld.distance, angle: ld.angle };
    try {
      if (ld.type === 'sun' && typeof createSunLight === 'function')            entry = createSunLight(o);
      else if (ld.type === 'headlight' && typeof createHeadlight === 'function') entry = createHeadlight(o);
      else if (typeof createLight === 'function')                                entry = createLight(ld.type || 'point', o);
    } catch (e) { entry = null; }
    if (!entry || !entry.light) continue;

    // ⚠ Yaratuvchilar hamma `opts` ni qabul qilmaydi (sun/headlight o'z
    //   standartlarini majburlaydi). Shuning uchun qiymatlar
    //   YARATILGANDAN KEYIN aniq yoziladi — kim nimani qabul qilishiga
    //   bog'liq bo'lib qolmaydi.
    const L = entry.light;
    if (ld.color && L.color) L.color.set(ld.color);
    if (ld.intensity != null) L.intensity = ld.intensity;
    if (ld.pos && L.position) L.position.set(ld.pos.x, ld.pos.y, ld.pos.z);
    if (ld.rot && L.rotation) L.rotation.set(ld.rot.x, ld.rot.y, ld.rot.z);
    if (ld.distance != null && 'distance' in L) L.distance = ld.distance;
    if (ld.angle    != null && 'angle'    in L) L.angle    = ld.angle;
    if (ld.penumbra != null && 'penumbra' in L) L.penumbra = ld.penumbra;
    if (ld.decay    != null && 'decay'    in L) L.decay    = ld.decay;
    L.castShadow = !!ld.castShadow;
    L.visible    = ld.visible !== false;
    if (ld.shadowBias != null && L.shadow) L.shadow.bias = ld.shadowBias;
    if (ld.target && L.target && L.target.position)
      L.target.position.set(ld.target.x, ld.target.y, ld.target.z);
    if (ld.name) { entry.name = ld.name; if (L.userData) L.userData.name = ld.name; }
    if (ld.ud && L.userData) {
      for (const k in ld.ud) {
        if (k === 'id' || k === '_lentry') continue;
        if (L.userData[k] === undefined) L.userData[k] = ld.ud[k];
      }
    }
    if (ld.oldParentId && Array.isArray(pending)) pending.push({ obj: L, oldParent: ld.oldParentId });
    if (opts.tag) { entry[opts.tag] = true; if (L.userData) L.userData[opts.tag] = true; }
    created.push(entry);
    n++;
  }
  // Belgi so'ralgan bo'lsa — yaratilganlar ro'yxati (chaqiruvchi ularni
  // keyin yashiradi/olib tashlaydi). Aks holda eski xulq: faqat son.
  return opts.tag ? created : n;
}

function _slParticlesOut() {
  let arr; try { arr = particleSystems; } catch (e) { return []; }
  if (!Array.isArray(arr)) return [];
  return arr.map(ps => {
    const m = ps.mesh && ps.mesh.material;
    return {
      name: ps.name, count: ps.count, mode: ps.mode, speed: ps.speed,
      spread: ps.spread, gravity: ps.gravity, turbulence: ps.turbulence,
      camForce: ps.camForce, reversed: !!ps.reversed, vortexSpeed: ps.vortexSpeed,
      color: (m && m.color) ? _slHex(m.color) : null,
      size: m ? m.size : undefined,
      opacity: m ? m.opacity : undefined,
      pos: ps.mesh ? _slV3(ps.mesh.position) : null,
      visible: ps.mesh ? ps.mesh.visible !== false : true,
    };
  });
}

/** @param {object} opts  `clear:false` — mavjudlari qoladi; `tag` — belgi */
function _slParticlesIn(list, opts) {
  let arr; try { arr = particleSystems; } catch (e) { return 0; }
  if (!Array.isArray(arr)) return 0;
  opts = opts || {};
  // Mavjudlarini olib tashlaymiz (Map Loader rejimida — YO'Q)
  if (opts.clear !== false) {
    for (const ps of arr.slice()) {
      try {
        if (ps.mesh && ps.mesh.parent) ps.mesh.parent.remove(ps.mesh);
        if (ps.geo && ps.geo.dispose) ps.geo.dispose();
        if (ps.mesh && ps.mesh.material && ps.mesh.material.dispose) ps.mesh.material.dispose();
      } catch (e) {}
    }
    arr.length = 0;
  }
  if (!Array.isArray(list) || !list.length) return opts.tag ? [] : 0;
  if (typeof createParticleSystem !== 'function') return opts.tag ? [] : 0;
  const created = [];
  let n = 0;
  for (const pd of list) {
    try {
      const ps = createParticleSystem({
        name: pd.name, count: pd.count, mode: pd.mode, speed: pd.speed,
        spread: pd.spread, gravity: pd.gravity, turbulence: pd.turbulence,
        camForce: pd.camForce, reversed: pd.reversed, vortexSpeed: pd.vortexSpeed,
        color: pd.color ? new THREE.Color(pd.color).getHex() : undefined,
        size: pd.size,
      });
      if (ps && ps.mesh) {
        if (pd.pos) ps.mesh.position.set(pd.pos.x, pd.pos.y, pd.pos.z);
        ps.mesh.visible = pd.visible !== false;
        if (pd.opacity != null && ps.mesh.material) ps.mesh.material.opacity = pd.opacity;
      }
      if (ps && opts.tag) { ps[opts.tag] = true; if (ps.userData) ps.userData[opts.tag] = true; created.push(ps); }
      n++;
    } catch (e) {}
  }
  return opts.tag ? created : n;
}

function _slFogOut() {
  let f; try { f = scene.fog; } catch (e) { return null; }
  if (!f) return { type: 'off' };
  if (f.isFogExp2) return { type: 'exp', color: _slHex(f.color), density: f.density };
  return { type: 'linear', color: _slHex(f.color), near: f.near, far: f.far };
}

function _slFogIn(d) {
  if (!d) return false;
  try {
    if (d.type === 'off' || !d.type) { scene.fog = null; return true; }
    if (d.type === 'exp') scene.fog = new THREE.FogExp2(d.color || '#8aabb8', d.density != null ? d.density : 0.035);
    else                  scene.fog = new THREE.Fog(d.color || '#8aabb8', d.near != null ? d.near : 8, d.far != null ? d.far : 60);
    return true;
  } catch (e) { return false; }
}

/** Obyektning fizika tanasi sozlamalari (`physBodies` dan). */
function _slPhysOut(o) {
  let arr; try { arr = physBodies; } catch (e) { return null; }
  if (!Array.isArray(arr)) return null;
  const b = arr.find(x => x.mesh === o);
  if (!b) return null;
  return { mass: b.mass, restitution: b.restitution, friction: b.friction,
           isStatic: !!b.isStatic, radius: b.radius, shape: b.shape };
}

const _slMatsArr = o => Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);

function _slMatsOut(o) {
  const arr = _slMatsArr(o);
  if (!arr.length) return null;
  return arr.map(m => m ? {
    color: _slHex(m.color), emissive: _slHex(m.emissive),
    emissiveIntensity: m.emissiveIntensity,
    roughness: m.roughness, metalness: m.metalness,
    opacity: m.opacity, transparent: !!m.transparent,
    wireframe: !!m.wireframe, visible: m.visible !== false,
    side: m.side, depthWrite: m.depthWrite !== false,
    flatShading: !!m.flatShading, alphaTest: m.alphaTest,
  } : null);
}

function _slMatsIn(o, list) {
  if (!Array.isArray(list) || !list.length) return;
  const arr = _slMatsArr(o);
  const n = Math.min(arr.length, list.length);
  for (let i = 0; i < n; i++) {
    const m = arr[i], d = list[i];
    if (!m || !d) continue;
    if (d.color    && m.color)    m.color.set(d.color);
    if (d.emissive && m.emissive) m.emissive.set(d.emissive);
    if (d.emissiveIntensity != null) m.emissiveIntensity = d.emissiveIntensity;
    if (d.roughness != null) m.roughness = d.roughness;
    if (d.metalness != null) m.metalness = d.metalness;
    if (d.opacity   != null) m.opacity   = d.opacity;
    m.transparent = !!d.transparent;
    m.wireframe   = !!d.wireframe;
    m.visible     = d.visible !== false;
    if (d.side       != null) m.side       = d.side;
    if (d.depthWrite != null) m.depthWrite = !!d.depthWrite;
    m.flatShading = !!d.flatShading;
    if (d.alphaTest != null) m.alphaTest = d.alphaTest;
    m.needsUpdate = true;
  }
}

window.saveScene = async function(_returnZip) {
  if (typeof JSZip === 'undefined') {
    log('❌ JSZip yuklanmagan, oddiy JSON saqlash...', 'lw');
    // Fallback: oddiy JSON
    const fallback = { version:4, objects: objects.filter(o=>!_slSkip(o)).map(o=>({
      name:o.userData.name, type:o.userData.type,
      position:{x:o.position.x,y:o.position.y,z:o.position.z},
      rotation:{x:o.rotation.x,y:o.rotation.y,z:o.rotation.z},
      scale:{x:o.scale.x,y:o.scale.y,z:o.scale.z},
      color:(()=>{const m=Array.isArray(o.material)?o.material[0]:o.material;return m&&m.color?'#'+m.color.getHexString():null;})(),
      roughness:(Array.isArray(o.material)?o.material[0]:o.material)?.roughness, metalness:(Array.isArray(o.material)?o.material[0]:o.material)?.metalness,
      script:o.userData.script||null,
    }))};
    const b=new Blob([JSON.stringify(fallback,null,2)],{type:'application/json'});
    const u=URL.createObjectURL(b);
    const a=document.createElement('a'); a.href=u; a.download='apex-file.json'; a.click();
    URL.revokeObjectURL(u);
    return;
  }

  log('📦 ZIP tayyorlanmoqda...', 'lw');
  const zip = new JSZip();

  // ── 1. MODEL fayllarni models/ papkaga qo'shish ─────────────
  // Ikki manbadan olamiz:
  //   a) loadedModels (Assets panel orqali import qilinganlar)
  //   b) objects ichidagi isGLB modellari (to'g'ridan-to'g'ri import/drag-drop)
  const modelFileMap = {}; // name -> 'models/xxx.glb'
  const addedModels  = new Set();

  // a) Asset library dan
  for (const m of loadedModels) {
    if (!m.buffer || addedModels.has(m.name)) continue;
    const safeName = m.name.replace(/[^a-zA-Z0-9_\-]/g,'_') + '.glb';
    zip.folder('models').file(safeName, m.buffer);
    modelFileMap[m.name] = 'models/' + safeName;
    addedModels.add(m.name);
  }

  // b) To'g'ridan-to'g'ri import (drag-drop / importGLTF) — _glbBuffer saqlanadi
  const _modelNoBuf = [];
  for (const o of objects) {
    // ⚠ `isGLB` YETARLI EMAS. "📦 Model qo'shish (GLB/GLTF)" tugmasi
    //   modelni MAVJUD obyektga (kubga) biriktiradi — obyekt `type: 'Kub'`
    //   bo'lib qolaveradi va `isGLB` QO'YILMAYDI. Ilgari bu shart shu
    //   obyektni butunlay o'tkazib yuborardi va model hech qayerga
    //   yozilmasdi: `models/` papkasi umuman yaratilmasdi.
    //   Endi mezon — BUFER BORMI, tur emas.
    const _isModel = o.userData.isGLB || o.userData.isGLTF ||
                     o.userData.attachedGLB || o.userData._glbBuffer;
    if (!_isModel || addedModels.has(o.userData.name)) continue;
    const buf = o.userData._glbBuffer;
    // ⚠ JIMGINA O'TIB KETMAYMIZ. Buferi yo'q model ZIP ga tushmaydi va
    //   yuklashda oddiy KUB bo'lib qaytadi (`Tri` keskin tushadi) —
    //   foydalanuvchi buni faqat sahnani qayta ochganda bilib qolardi.
    //
    //   Eng ko'p uchraydigan sabab: obyekt NOMI o'zgartirilgan.
    //   `modelFileMap` nom bo'yicha ishlaydi, `loadedModels` dagi yozuv
    //   esa eski nom bilan turadi — ikkalasi bir-birini topmaydi.
    //   Shuning uchun pastda nom bo'yicha ZAXIRA moslashtirish bor.
    if (!buf) { _modelNoBuf.push(o); continue; }
    const safeName = o.userData.name.replace(/[^a-zA-Z0-9_\-]/g,'_') + '.glb';
    zip.folder('models').file(safeName, buf);
    modelFileMap[o.userData.name] = 'models/' + safeName;
    addedModels.add(o.userData.name);
  }

  // ── ZAXIRA: buferi yo'q modelni kutubxonadan topishga urinamiz ──
  //  Sahna bir marta saqlanib qayta yuklangan bo'lsa, `_glbBuffer`
  //  `userData` da qolmaydi (`_SL_RUNTIME` uni tashlaydi) — lekin
  //  `loadedModels` da bufer bor. Nom mos kelmasa ham, kutubxonada
  //  BITTA model bo'lsa aniqlik shubhasiz.
  for (const o of _modelNoBuf) {
    let src = loadedModels.find(m => m.buffer && m.name === o.userData.name);
    if (!src && loadedModels.filter(m => m.buffer).length === 1)
      src = loadedModels.find(m => m.buffer);
    if (src) {
      const safeName = src.name.replace(/[^a-zA-Z0-9_\-]/g,'_') + '.glb';
      if (!addedModels.has(src.name)) {
        zip.folder('models').file(safeName, src.buffer);
        addedModels.add(src.name);
      }
      modelFileMap[o.userData.name] = 'models/' + safeName;
      log(`🔗 "${o.userData.name}" modeli kutubxonadagi "${src.name}" bilan bog'landi`, 'lw');
    } else {
      log(`❌ "${o.userData.name}" MODELI SAQLANMADI — fayl buferi yo'q. ` +
          `Yuklashda u kub bo'lib qaytadi. Modelni qayta import qiling.`, 'le');
    }
  }

  // ── 2. Sahnaning har bir obyekti uchun texture faylini textures/ papkaga ──
  const textureFileMap = {}; // objId -> 'textures/xxx'

  for (const o of objects) {
    // Mesh yoki ichidagi Mesh larni tekshiramiz (GLB wrapper uchun)
    const candidates = [o];
    o.traverse(ch => { if (ch !== o && ch.userData?.textureBase64) candidates.push(ch); });

    const b64   = o.userData.textureBase64;
    // ── ⚠ NOMI YO'Q TEKSTURA HAM SAQLANSIN ───────────────────
    //  Ilgari shart `if (!b64 || !tname) continue;` edi. Ya'ni
    //  `textureName` bo'lmasa tekstura ZIP ga UMUMAN yozilmasdi.
    //
    //  Va u shunchaki "saqlanmay qolmasdi" — BUTUNLAY YO'QOLARDI:
    //  `textureBase64` `_SL_RUNTIME` ro'yxatida, ya'ni `ud` dan ham
    //  o'chiriladi. Natijada obyekt teksturasiz qaytardi va konsolda
    //  hech qanday ogohlantirish chiqmasdi.
    //
    //  ⚠ Nomsiz tekstura QAYERDAN kelib chiqadi: har bir import yo'li
    //    `textureName` ni qo'ymaydi (masalan `_pbrLoadMap`, prefab
    //    spawn, yoki tashqi addon). Nomga TAYANISH o'rniga uni
    //    mime dan tiklaymiz — `AssetBundle` ham aynan shunday qiladi.
    if (!b64) continue;
    let tname = o.userData.textureName;
    if (!tname) {
      const _mi = String(b64).slice(5, 30).toLowerCase();
      const _ex = _mi.indexOf('jpeg') >= 0 || _mi.indexOf('jpg') >= 0 ? 'jpg'
                : _mi.indexOf('webp') >= 0 ? 'webp'
                : _mi.indexOf('gif')  >= 0 ? 'gif'
                : 'png';
      tname = 'tekstura.' + _ex;
    }
    const safeTex = 'tex_' + o.userData.id + '_' + tname.replace(/[^a-zA-Z0-9_\-\.]/g,'_');
    const commaIdx = b64.indexOf(',');
    const base64Data = commaIdx >= 0 ? b64.substring(commaIdx+1) : b64;
    zip.folder('texture').file(safeTex, base64Data, {base64: true});
    textureFileMap[o.userData.id] = 'texture/' + safeTex;
  }

  // 🔢 Saqlashdan OLDIN takrorlangan id larni tekshiramiz — buzuq
  //    havolalar faylga ko'chib o'tmasin (yoki hech bo'lmasa foydalanuvchi
  //    bilsin: yuklashda ular avtomatik tuzatiladi).
  _slCheckDupIds(objects.filter(o => !_slSkip(o)),
                 o => o.userData && o.userData.id,
                 o => (o.userData && o.userData.name) || '?',
                 'Sahnada');

  // ── 3. Timeline ma'lumotlarini yig'ish ───────────────────────
  //
  //  ⚠ ILGARIGI XATO: bu yerda `tlTracks` degan GLOBAL obyektdan
  //    o'qilardi. Lekin `tlTracks` LOYIHADA UMUMAN E'LON QILINMAGAN —
  //    haqiqiy treklar `TimelineSystem` IIFE si ichidagi `tracks`
  //    massivida turadi. `typeof tlTracks !== 'undefined' ? ... : {}`
  //    himoyasi tufayli xato ham chiqmasdi — shunchaki HAR SAFAR
  //    bo'sh massiv yozilardi. Ya'ni timeline hech qachon saqlanmagan,
  //    va konsolda muloyimgina "0 timeline track" deb turardi.
  //
  //  Endi format TimelineSystem ning o'zida (serialize/restore).
  const timelineData = (window.TimelineSystem && typeof TimelineSystem.serialize === 'function')
    ? TimelineSystem.serialize()
    : { version: 2, duration: 5, loopMode: false, tracks: [] };

  // ── 4. apex-file.json yaratish ───────────────────────────────
  const sceneData = {
    version: 5,
    exportDate: new Date().toISOString(),
    objects: objects.filter(o => !_slSkip(o)).map(o => ({
      // ⚠ YANGI: to'liq userData + iyerarxiya ma'lumoti
      ud:          _slCleanUD(o.userData),
      oldId:       o.userData.id != null ? String(o.userData.id) : null,
      oldParentId: o.userData.parentId != null ? String(o.userData.parentId) : null,
      name:        o.userData.name,
      type:        o.userData.type,
      isStatic:    o.userData.isStatic   || false,
      // 🌍 Dvigatelning o'z zamini — yuklashda qayta yaratilmaydi,
      //    sozlamalari mavjud zaminga qo'llanadi.
      isGround:    o.userData.isGround   || false,
      isEntity:    o.userData.isEntity   || false,
      entityType:  o.userData.entityType || null,
      isCamera:    o.userData.isCamera   || false,
      isHitbox:    o.userData.isHitbox   || false,
      hitboxSize:  o.userData.isHitbox ? (o.userData.hitboxSize || {x:2,y:2,z:2}) : null,
      triggerType: o.userData.isHitbox ? (o.userData.triggerType || 'onEnter')  : null,
      collisionMode: o.userData.isHitbox ? (o.userData.collisionMode || 'inline') : null,
      targetObjectId: o.userData.isHitbox ? (o.userData.targetObjectId || null) : null,
      reverseMode: o.userData.isHitbox ? (o.userData.reverseMode || null) : null,
      hitboxActions: (o.userData.isHitbox && o.userData.actions)
                      ? JSON.parse(JSON.stringify(o.userData.actions))
                      : null,
      isGLB:       (o.userData.isGLB || o.userData.isGLTF) || false,
      // ⚠ `glbFile` — `isGLB` obyektlar UCHUN ham, kubga BIRIKTIRILGAN
      //   model uchun ham. Ilgari faqat birinchisi yozilardi.
      glbFile:     ((o.userData.isGLB || o.userData.isGLTF || o.userData.attachedGLB)
                     ? (modelFileMap[o.userData.name] || null)
                     : null),
      // 📦 Kubga biriktirilgan model — yuklashda qayta biriktiriladi.
      //    `attachedGLB` `userData` da ham bor (`ud` orqali), lekin
      //    yuqori darajada ham yozamiz: yuklovchi uni `od.ud` ga
      //    kirmasdan, tez tekshiradi.
      attachedGLB: o.userData.attachedGLB || null,
      // 📦 Biriktirilgan modelning O'Z transformi (bola obyekt).
      //   ⚠ Bola `objects[]` da EMAS — u hech qayerda saqlanmasdi.
      //     Modelni mashinaning oldiga moslab burasangiz, saqlab qayta
      //     ochganда u BOSHLANG'ICH holatiga qaytardi.
      attachedGLBXform: (() => {
        const g = o.children && o.children.find(c => c.name === '__glb_model__');
        if (!g) return null;
        return { p: _slV3(g.position),
                 r: { x: g.rotation.x, y: g.rotation.y, z: g.rotation.z },
                 s: _slV3(g.scale) };
      })(),
      // 🚗 Entity rejimi (avto / entity).
      //   ⚠ `_entityMode` `_` bilan boshlanadi — `_slCleanUD` uni
      //     tashlaydi. Ya'ni obyektni AVTO qilib saqlasangiz, qayta
      //     ochganда u oddiy obyektga aylanardi va "Avto ishlamaydi"
      //     bo'lib ko'rinardi.
      entityMode:  o.userData._entityMode || null,
      facingY:     o.userData._facingY != null ? o.userData._facingY : null,
      isPlayerObj: o.userData.isPlayerObj || false,
      isMapLoader: o.userData.isMapLoader || false,
      isLadder:    o.userData.isLadder || false,
      ladder:      o.userData.isLadder ? {
        climbUpKey:   o.userData.climbUpKey   || 'KeyW',
        climbDownKey: o.userData.climbDownKey || 'KeyS',
        exitKey:      o.userData.exitKey      || 'KeyE',
        climbSpeed:   o.userData.climbSpeed != null ? o.userData.climbSpeed : 3,
        grabDist:     o.userData.grabDist != null ? o.userData.grabDist : 1.2,
        autoRelease:  o.userData.autoRelease !== false,
      } : null,
      isSoundBlock: o.userData.isSoundBlock || false,
      soundBlock:  o.userData.isSoundBlock ? {
        triggerSize: o.userData.triggerSize || {x:3,y:3,z:3},
        soundName:   o.userData.soundName || '',
        playMode:    o.userData.playMode || 'once',
        trigger:     o.userData.trigger || 'enter',
        volume:      o.userData.volume != null ? o.userData.volume : 0.7,
        // 🟢 Ovoz markazi (yashil shar) — kub markaziga nisbatan siljish.
        //    ⚠ Ro'yxatdan TUSHIB QOLGAN edi: `_defaultData()` da bor,
        //      bu yerda yo'q. `_slMergeRest` qutqara olmaydi (u faqat
        //      `undefined` maydonlarni to'ldiradi, `create()` esa
        //      standart {0,0,0} ni allaqachon qo'ygan bo'ladi).
        audioOffset: o.userData.audioOffset || { x: 0, y: 0, z: 0 },
        // 📦 Zona shakli: box | sphere | pyramid.
        //    ⚠ `audioOffset` bilan birga TUSHIB QOLGAN edi. Yuqoridagi
        //      `_slMergeRest` izohida ikkalasi "tuzatildi" deb
        //      yozilgan, lekin u yordam BERMAYDI: merge faqat
        //      `undefined` maydonlarni to'ldiradi, `create()` esa
        //      standartni allaqachon qo'ygan bo'ladi. Ya'ni sharsimon
        //      zona sahna qayta ochilganda KUBGA qaytardi.
        zoneShape:   o.userData.zoneShape || 'box',
        // ── ⚠ BOG'LANISHLAR BUTUNLIGICHA ────────────────────────
        //  Ilgari bu yerda 8 ta maydon QO'LDA sanalardi va to'rttasi
        //  ro'yxatga kirmay qolgan edi: `volMax`, `volMin`,
        //  `spatial` (3D masofaga bog'liq ovoz) va `reverb`
        //  (aks-sado). Ya'ni 3D ovoz va aks-sado sozlamalaringiz
        //  sahna qayta ochilganda JIMGINA standartga qaytardi.
        //
        //  Endi butun bog'lanish ko'chiriladi, faqat `_` bilan
        //  boshlanadigan runtime maydonlari tashlanadi
        //  (`_playing`, `_node`, `_timer`, `_revNodes` …).
        //  Aynan shu qoida ⏱ timeline keyframelarida ishlatilgan —
        //  sababi ham bir xil ("maydonlarni sanab chiqsak, yangisi
        //  qo'shilganda jimgina yo'qolardi").
        bindings:    Array.isArray(o.userData.bindings)
                       ? o.userData.bindings.map(b => {
                           const out = {};
                           for (const k in b) if (k[0] !== '_') out[k] = b[k];
                           return out;
                         })
                       : null,
      } : null,
      mapLoader:   o.userData.isMapLoader ? {
        triggerSize: o.userData.triggerSize || {x:3,y:3,z:3},
        mapName:     o.userData.mapName || '',
        mapB64:      o.userData.mapB64 || null,
        // 🎯 Yangi kartani eski karta MARKAZIGA tenglashtirish.
        //    ⚠ Bu maydon ro'yxatdan TUSHIB QOLGAN edi: `_defaultData()`
        //      da bor, lekin bu yerda sanalmagan → saqlanmasdi.
        //      `_slMergeRest` ham qutqara olmasdi, chunki u faqat
        //      `undefined` maydonlarni to'ldiradi, `create()` esa
        //      standart `false` ni allaqachon qo'yib bo'lgan bo'ladi.
        //      Ya'ni yoqib qo'ysangiz, sahna qayta ochilganda jimgina
        //      o'chib qolardi.
        alignToOld:  !!o.userData.alignToOld,
        loading:     o.userData.loading || {type:'none',content:'',duration:1.2},
        teleport:    o.userData.teleport || {enabled:true,x:0,y:2,z:0},
        collision:   o.userData.collision || 'original',
        playAnim:    o.userData.playAnim || 'none',
        // ⚠ `|| false` EMAS — u `undefined` ni ham `false` qiladi va
        //   yangi standartni (yoqiq) o'chirib qo'yardi.
        autoUnload:  o.userData.autoUnload !== false,
        autoUnloadV2: true,          // yangi standartga o'tganini bildiradi
        // 💡 Karta o'z muhitini (chiroq/zarracha/tuman) olib kelsinmi.
        //    ⚠ `|| false` EMAS — `undefined` ni ham `false` qilib,
        //      yangi standartni (yoqiq) o'chirib qo'yardi.
        mapEnv:      o.userData.mapEnv !== false,
        keepElements: Array.isArray(o.userData.keepElements) ? o.userData.keepElements.slice() : [],
        keepReverse: o.userData.keepReverse || false,
        mapObjectNames: Array.isArray(o.userData.mapObjectNames) ? o.userData.mapObjectNames.slice() : [],
      } : null,
      perFace:     (typeof PerFaceTextures !== 'undefined')
                     ? _pfToFiles(PerFaceTextures.serialize(o), o, zip)
                     : null,
      position:    {x:o.position.x, y:o.position.y, z:o.position.z},
      rotation:    {x:o.rotation.x, y:o.rotation.y, z:o.rotation.z},
      scale:       {x:o.scale.x,    y:o.scale.y,    z:o.scale.z},
      // ⚠ `color/roughness/metalness` ORQAGA MOSLIK uchun qoldirilgan
      //   (eski dvigatel shu uchtasini o'qiydi). Yangi, to'liq holat —
      //   pastdagi `mats`: barcha slotlar + shaffoflik, nur, simli
      //   ko'rinish, `side`, `depthWrite`.
      color:       (()=>{const m=Array.isArray(o.material)?o.material[0]:o.material;return m&&m.color?'#'+m.color.getHexString():null;})(),
      roughness:   (Array.isArray(o.material)?o.material[0]:o.material)?.roughness,
      metalness:   (Array.isArray(o.material)?o.material[0]:o.material)?.metalness,
      mats:        _slMatsOut(o),
      // ⚖️ Fizika tanasi — massa, ishqalanish, sakrash, static/dinamik.
      //    Ilgari saqlanmasdi: 50 kg quti 1 kg bo'lib qaytardi.
      phys:        _slPhysOut(o),
      // 👁 Ko'rinish va soya. Yuklashda `castShadow=true` QOTIB yozilardi,
      //    `visible` esa umuman o'qilmasdi — yashirilgan obyekt ko'rinib
      //    ketardi (timeline bilan yashirilganlar ham).
      visible:     o.visible !== false,
      castShadow:  !!o.castShadow,
      receiveShadow: !!o.receiveShadow,
      renderOrder: o.renderOrder || 0,
      textureFile: textureFileMap[o.userData.id] || null,
      // 🏷 ASL nom — foydalanuvchi yuklagan fayl nomi.
      //    ⚠ `textureFile` ZIP ichidagi nom (`tex_5_gisht.png`), asl
      //      nom emas. Ilgari yuklashda `textureName` ANA SHUNDAN
      //      olinardi va inspektorda "tex_5_gisht.png" ko'rinardi.
      //      Endi asli alohida saqlanadi.
      textureOrigName: o.userData.textureName || null,
      textureLoop: (typeof TextureLoopSystem !== 'undefined')
                     ? TextureLoopSystem.serialize(o)
                     : null,
      roll:        (typeof ObjectRoleSystem !== 'undefined')
                     ? ObjectRoleSystem.serialize(o)
                     : null,
      script:      o.userData.script || null,
    })),
    models:   Object.entries(modelFileMap).map(([name,file])=>({name,file})),
    timeline: timelineData,
    // 🔫 Ko'tarish / gravity gun sozlamalari — sahna darajasida
    //    (massa chegaralari, tugma, masofa). Obyektga bog'liq emas.
    // 🌌 Skybox sozlamalari (rejim, rang, rasm, custom ranglar)
    skybox: (typeof SkyboxSystem !== 'undefined') ? SkyboxSystem.serialize() : null,
    gravityGun: (typeof GravityGunSystem !== 'undefined')
                  ? GravityGunSystem.serialize()
                  : null,
    // ── ⚠ YANGI: sahna darajasida YO'QOLAYOTGAN holat ──────────
    lights:    _slLightsOut(),      // 💡 umuman saqlanmasdi
    particles: _slParticlesOut(),   // ✨ umuman saqlanmasdi
    fog:       _slFogOut(),         // 🌫 umuman saqlanmasdi
    // 🔊 Foydalanuvchi yuklagan ovozlar — ASL baytlari bilan.
    //    Ilgari faqat `soundName` saqlanardi va sahna boshqa
    //    brauzerda ochilganda barcha ovozlar jimjit bo'lardi.
    audio: (typeof SoundSystem !== 'undefined' && typeof SoundSystem.serialize === 'function')
             ? SoundSystem.serialize() : null,
    // 🎥 KLAVIATURA KAMERA-FX — klavishlarga bog'langan effektlar.
    //   ⚠ Bu holat `window._camFx*` GLOBALLARIDA yashardi va sahnaga
    //     hech qachon yozilmasdi. Ya'ni muharrirda sozlangan effektlar
    //     o'yin eksportida UMUMAN bo'lmasdi.
    camFx: {
      keys:     (typeof window !== 'undefined' && window._camFxKeys)   ? window._camFxKeys   : {},
      combos:   (typeof window !== 'undefined' && window._camFxCombos) ? window._camFxCombos : [],
      idle:     (typeof window !== 'undefined' && window._camFxIdle)   ? window._camFxIdle   : null,
      stateCfg: (typeof window !== 'undefined' && window._camStateCfg) ? window._camStateCfg : null,
      profiles: (typeof window !== 'undefined' && window._camStateProfiles) ? window._camStateProfiles : null,
    },
    // ── 🗂 TIZIMLARNING O'Z HOLATI (avtomatik) ──────────────────
    //  ⚠ Bu — "bittalab yozish" muammosining yechimi.
    //
    //    Obyekt sozlamalari allaqachon avtomatik saqlanadi
    //    (`ud: _slCleanUD(o.userData)`). Lekin TIZIMLARNING o'z holati
    //    modul ichida YOPIQ turadi (JS closure) — `game.zip` ichida
    //    dvigatel to'liq ko'chsa ham, u KOD, holat emas. Yangi
    //    brauzerda modul bo'sh standartlar bilan boshlanadi.
    //
    //    Ilgari bu yerda 9 ta tizim QO'LDA sanalgan edi. Yangi tizim
    //    qo'shilsa — ro'yxatni yangilash esdan chiqardi.
    //
    //    Endi `SystemRegistry` `window` ni kezib, `serialize()` ga ega
    //    HAR BIR tizimni o'zi topadi. Yangi tizim yozgan dasturchi
    //    faqat `serialize()` / `restore()` qo'shadi — bu faylga tegish
    //    SHART EMAS.
    systems: (() => {
      if (typeof SystemRegistry === 'undefined') return {};
      try {
        const r = SystemRegistry.serializeAll();
        for (const e of r.errors) log('⚠ ' + e, 'lw');
        if (r.count) log(`🗂 ${r.count} ta tizim holati saqlandi`, 'lg');
        return r.data;
      } catch (e) { log('⚠ Tizim holatlari saqlanmadi: ' + e.message, 'lw'); return {}; }
    })(),

    // ⌨ KLAVISH → OVOZ bog'lanishlari (`key-sound.js`).
    //   ⚠ `window._kbSounds` — yana bir "sahnadan tashqaridagi" holat.
    //     `save-load.js` da 0 marta uchrardi, ya'ni klaviaturaga
    //     bog'langan ovozlar hech qachon saqlanmasdi. `camFx` bilan
    //     bir xil sinf.
    keySounds: (typeof window !== 'undefined' && window._kbSounds) ? window._kbSounds : {},

    // ── 🌐 SAHNADAN TASHQARIDAGI SOZLAMALAR ────────────────────
    //  ⚠ Bu — yo'qotishning IKKINCHI sinfi. `userData` obyektga
    //    tegishli, lekin ba'zi tizimlar sozlamani GLOBALGA yozadi.
    //    Ular `objects[]` da emas, ya'ni saqlovchi ularni KO'RMASDI.
    //
    //    `test-save-audit.js` shu sinfni butunlay skanerlaydi va
    //    tasnifsiz qolganini ko'rsatadi — ro'yxat qo'lda yuritilmaydi.
    globals: (() => {
      const W = (typeof window !== 'undefined') ? window : {};
      const pick = {
        // ⌨ Klaviatura → animatsiya bog'lanishlari
        kbAnimations:   W._kbAnimations,
        kbCombos:       W._kbCombos,
        afkAnims:       W._afkAnims,
        // 🖱 Sichqoncha → animatsiya
        mouseAnimEvents: W._mouseAnimEvents,
        mouseAnimJsons:  W._mouseAnimJsons,
        mouseAnimModes:  W._mouseAnimModes,
        // 🧍 Kapsula tizimi (poza/harakat presetlari)
        capsuleCfg:     W._capsuleCfg,
        capsuleKeys:    W._capsuleKeys,
        capsuleCombos:  W._capsuleCombos,
        capsulePresets: W._capsulePresets,
        // 🖼 Kanvas qoplamalar · 🎥 kamera rigi
        canvases:       W._canvases,
        camRig:         W._camRigGlobal,
      };
      const out = {};
      for (const k in pick) if (pick[k] !== undefined && pick[k] !== null) out[k] = pick[k];
      return out;
    })(),
    // 🎥 Kamera silkinishi — `serialize()` bor edi, hech kim chaqirmasdi
    cameraShake: (typeof CameraShakeSystem !== 'undefined' && typeof CameraShakeSystem.serialize === 'function')
             ? CameraShakeSystem.serialize() : null,
  };

  // ── 4a. 🧩 ADDONLAR → addons/ ───────────────────────────────
  //  Har addon o'z papkasida, muallif ko'rgan tuzilma bilan:
  //     addons/<id>/addon.json   — pasporti
  //     addons/<id>/main.js      — kodi
  //  Shu bilan foydalanuvchi ZIP ni ochib addonni o'qiy oladi.
  //
  //  ⚠ Papka HAR DOIM yaratiladi (bo'sh bo'lsa ham) — foydalanuvchi
  //    "addonlar qayerda?" deb izlamasin.
  let _addonCount = 0;
  try {
    const _ad = (typeof AddonSystem !== 'undefined' && AddonSystem.serialize)
                  ? AddonSystem.serialize() : { addons: [] };
    sceneData.addons = _ad;
    for (const a of (_ad.addons || [])) {
      const id = String((a.meta && a.meta.id) || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
      if (!id) continue;
      zip.file('addons/' + id + '/addon.json', JSON.stringify(a.meta, null, 2));
      zip.file('addons/' + id + '/main.js', a.code || '');
      _addonCount++;
    }
    zip.file('addons/README.txt',
      "🧩 ADDONLAR\n\n" +
      (_addonCount
        ? `Bu kartada ${_addonCount} ta addon bor. Har biri o'z papkasida:\n` +
          "  <id>/addon.json  — pasporti (nom, ikona, tavsif)\n" +
          "  <id>/main.js     — kodi\n\n" +
          "Karta ochilganda ular avtomatik o'rnatiladi.\n" +
          "⚠ Sizda o'sha `id` bilan addon bo'lsa — SIZNIKI qoladi, ustiga yozilmaydi.\n"
        : "Bu kartada addon yo'q.\n\n" +
          "Addon qo'shish: ASSETLAR → Addons → Import.\n") +
      "\n⚠ Addon — oddiy JS kod va APEX ichida to'liq huquq bilan ishlaydi.\n" +
      "  Faqat ishonchli manbadan olingan kartani oching.\n");
  } catch (e) {
    log('⚠ Addonlar saqlanmadi: ' + e.message, 'lw');
  }

  // ── 4b. 📦 OG'IR AKTIVLARNI PAPKALARGA CHIQARISH ────────────
  //  mp3 / video / rasm / ichma-ich karta ZIP i — hammasi `data:` yoki
  //  xom base64 bo'lib JSON ichida turgan edi. Endi ular
  //  `audio/`, `video/`, `textures/`, `maps/` papkalariga chiqadi va
  //  JSON da faqat havola qoladi.
  //
  //  ⚠ Bu QAMROV uchun ham muhim, nafaqat hajm: `mapB64` 10–50 MB
  //    bo'lishi mumkin va `JSON.stringify` uni butunlay xotiraga olardi.
  //    Bir necha karta bo'lsa saqlash brauzerni yiqitardi — ya'ni
  //    "hammasi saqlanmayapti" ning bir sababi shu edi.
  // 🗺 Karta ochiq turganda saqlanayotganini AYTAMIZ — aks holda
  //   foydalanuvchi obyektlar "yo'qoldi" deb o'ylardi.
  try {
    const _mlOpen = objects.filter(o => o && o.userData &&
                      (o.userData._mlLoaded || o.userData._mlPrevObj)).length;
    if (_mlOpen) {
      log(`🗺 ${_mlOpen} ta karta obyekti saqlanmadi (ular kartaga tegishli). ` +
          `Ular sahnaga kerak bo'lsa — Map Loader'ning "saqlab qolish" ro'yxatiga qo'shing.`, 'lw');
    }
  } catch (e) {}

  let _abStat = { count: 0, bytes: 0 };
  if (typeof AssetBundle !== 'undefined') {
    try { _abStat = AssetBundle.extract(sceneData, zip); }
    catch (e) { log('⚠ Aktivlarni ajratish xatosi (JSON ichida qoldi): ' + e.message, 'lw'); }
  }

  zip.file('apex-file.json', JSON.stringify(sceneData, null, 2));

  // ── 5. ZIP ni yuklab olish ───────────────────────────────────
  try {
    // 🎮 O'yin eksporti — ZIP obyektining o'zini qaytaramiz, yuklamaymiz
    if (_returnZip) return zip;

    const blob = await zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'apex-file.zip'; a.click();
    URL.revokeObjectURL(url);
    const modelCount = Object.keys(modelFileMap).length;
    const texCount   = Object.keys(textureFileMap).length;
    const tlCount    = timelineData.tracks.length;
    const kfCount    = timelineData.tracks.reduce((n, t) => n + (t.keyframes?.length || 0), 0);
    const _mb = (_abStat.bytes / 1048576);
    log(`💾 Saqlandi → apex-file.zip: ${sceneData.objects.length} obyekt + ` +
        `${modelCount} model + ${texCount} texture + ` +
        `${tlCount} timeline track (${kfCount} keyframe) + ` +
        `${sceneData.lights.length} chiroq + ${sceneData.particles.length} zarracha` +
        (_addonCount ? ` + 🧩 ${_addonCount} addon` : '') +
        (_abStat.count ? ` + ${_abStat.count} aktiv fayl (${_mb < 0.1 ? '<0.1' : _mb.toFixed(1)} MB)` : ''), 'lok');
  } catch(err) {
    log('❌ ZIP xatosi: ' + err.message, 'le');
  }
};

//  ⚠ `zipObj` — ikkinchi parametr. Eksport qilingan o'yin sahnani
//    ZIP'dan yuklaydi, tekstura/modellar esa o'sha ZIP ichida turadi.
//    Ilgari faqat `doLoad(jsonData, null)` yo'li bor edi — zip'siz —
//    va ZIP'li yo'lga FAQAT fayl tanlash dialogidan kirish mumkin edi.
//
//    (Avval buni `window.loadSceneFromZip` deb shu funksiya ICHIDA
//     yozgandim — u faqat `loadScene()` chaqirilganda yaratilardi,
//     ya'ni o'yin uchun hech qachon mavjud emasdi. Parametr — to'g'ri yo'l.)
window.loadScene = function(jsonData, zipObj, opts) {
  // ⚠ YANGI: eski id → yangi id xaritasi va tiklanadigan iyerarxiya ro'yxati
  const _slIdMap   = new Map();
  const _slPending = [];
  /**
   * @param {object} data     apex-file shaklidagi sahna
   * @param {JSZip}  zipObj   modellar/teksturalar uchun (ixtiyoriy)
   * @param {object} opts
   *   keepScene    — sahnani TOZALAMAYDI (karta qo'shish rejimi)
   *   keepTimeline — mavjud timeline ustiga yozmaydi
   *   skipNames    — spawn qilinmaydigan nomlar
   *   onSpawn(obj, od) — har bir yaratilgan obyekt uchun chaqiriladi
   * @returns {{spawned:Array, idMap:Map, count:number}}
   *
   * ⚠ NEGA `opts`: `map-loader.js` da `_spawnManifest()` degan
   *   ~150 qatorlik NUSXA bor edi — u ham manifestdan obyekt yasardi.
   *   Ikki nusxa muqarrar ravishda ajralib ketdi: `SceneTypes` dan
   *   xabarsiz qoldi (PC/sound/map-loader kub bo'lardi), skip ro'yxati
   *   yo'q edi (egasiz PCCam kartani surib yuborardi), suyaklar va
   *   zamin ikkilanardi. Har safar bittasi tuzatilar, ikkinchisi
   *   qolib ketardi.
   *
   *   Endi karta yuklash ham SHU funksiyaga tushadi. Farqi atigi
   *   to'rt bayroq — mantiq bitta.
   */
  const doLoad = async (data, zipObj, opts) => {
    opts = opts || {};
    const _keepScene = !!opts.keepScene;

    // ── 📦 AKTIV HAVOLALARINI TIKLASH (eng birinchi ish) ───────
    //  `@apexasset:audio/x.mp3|audio/mpeg` → `data:audio/mpeg;base64,...`
    //  Bu MAJBURIY ravishda obyektlar qurilishidan OLDIN bo'lishi kerak:
    //  Sound Block, Map Loader, Path, PC va Start/Finish o'z aktivini
    //  `userData` dan `data:` ko'rinishida kutadi.
    //
    //  ZIP bo'lmasa (masalan eski JSON) havolalar joyida qoladi —
    //  aktiv ko'rinmaydi, lekin yuklash TO'XTAMAYDI.
    if (typeof AssetBundle !== 'undefined' && zipObj) {
      try {
        const _r = await AssetBundle.resolve(data, zipObj);
        if (_r.count) log(`📦 ${_r.count} aktiv tiklandi (audio/video/texture/maps)`, 'lg');
        if (_r.missing.length)
          log(`⚠ ZIP da ${_r.missing.length} aktiv topilmadi: ${_r.missing.slice(0, 3).join(', ')}` +
              (_r.missing.length > 3 ? ' …' : ''), 'lw');
      } catch (e) { log('⚠ Aktivlarni tiklash xatosi: ' + e.message, 'lw'); }
    }
    const _skipNames = Array.isArray(opts.skipNames) ? opts.skipNames : null;
    const _onSpawn   = typeof opts.onSpawn === 'function' ? opts.onSpawn : null;
    const _spawned   = [];
    try {
      _slIdMap.clear(); _slPending.length = 0;
      // ♻️ Sahna almashtirilaётганда eski obyektlarning geometriya/material/
      //    teksturasi GPU da qolib ketardi. Sahnani qayta-qayta yuklaganда
      //    xotira o'sib boraverardi.
      // ⚠ Karta qo'shish rejimida (`keepScene`) sahna TOZALANMAYDI —
      //   karta mavjud sahna YONIGA qo'yiladi, Map Loader esa eskisini
      //   o'zi yashiradi.
      if (!_keepScene) {
        const _slDoomed = [];
        [...objects].forEach(o=>{
          if(!_slIsGround(o.userData)){
            scene.remove(o);
            objects.splice(objects.indexOf(o),1);
            _slDoomed.push(o);
          }
        });
        // Hammasi chiqqach — bitta marta. Statik obyektlar (zamin) sahnada
        // qoladi, shuning uchun ular ishlatayotgan resurslar saqlanadi.
        if (typeof disposeMany === 'function' && _slDoomed.length) {
          disposeMany(_slDoomed);
        }
        const physToRemove=[...physBodies.filter(b=>!b.isStatic)];
        physToRemove.forEach(b=>{const i=physBodies.indexOf(b);if(i>-1)physBodies.splice(i,1);});
      }

      // Reset transient state carried between scenes (reverse-mode counters,
      // hitbox entities-inside tracking, camera-anim state)
      if (typeof ReversePlaybackAPI !== 'undefined' && ReversePlaybackAPI._resetAllOnLoad) {
        ReversePlaybackAPI._resetAllOnLoad();
      }
      if (typeof HitboxSystem !== 'undefined' && HitboxSystem.clearAllRuntime) {
        HitboxSystem.clearAllRuntime();
      }

      // ZIP ichidagi modellarni oldindan yuklab olamiz
      const zipModels = {}; // filename -> ArrayBuffer
      if (zipObj && data.models) {
        for (const m of data.models) {
          try {
            const buf = await zipObj.file(m.file)?.async('arraybuffer');
            if (buf) zipModels[m.file] = {buffer: buf, name: m.name};
          } catch(e) { log('⚠ Model o\'qilmadi: '+m.file,'lw'); }
        }
        // loadedModels ga qo'shish (agar yo'q bo'lsa)
        for (const [file, md] of Object.entries(zipModels)) {
          if (!loadedModels.find(lm=>lm.name===md.name)) {
            const loader = getGLTFLoader();
            await new Promise(res=>{
              loader.parse(md.buffer,'',gltf=>{
                loadedModels.push({name:md.name,buffer:md.buffer,scene:gltf.scene,animations:gltf.animations||[],url:''});
                res();
              },()=>res());
            });
          }
        }
        renderModelLibrary();
      }

      let _slSkipped = 0;   // eski sahnalardan tashlab ketilgan suyak yozuvlari
      for (const od of data.objects) {
        // Kartadan "saqlab qolingan" elementlar qayta spawn qilinmaydi
        if (_skipNames && od.name && _skipNames.indexOf(od.name) !== -1) continue;
        // 🌍 ZAMIN — qayta YARATILMAYDI (dvigatel uni ishga tushganda
        //    o'zi yasagan), lekin sozlamalari MAVJUD zaminga qo'llanadi:
        //    o'lchami, rangi, teksturasi yo'qolmasin.
        //
        //    ⚠ Qolgan statiklar — devor, platforma, dekoratsiya — NORMAL
        //      tiklanadi. Ilgari bu yerda `if (od.isStatic) continue;`
        //      turardi va ular umuman qaytmasdi.
        if (od.isGround || _slIsGround(od) || (od.ud && _slIsGround(od.ud))) {
          try {
            const g = objects.find(o => _slIsGround(o.userData));
            if (g) {
              if (od.scale)    g.scale.set(od.scale.x, od.scale.y, od.scale.z);
              if (od.position) g.position.set(od.position.x, od.position.y, od.position.z);
              if (od.rotation) g.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
              if (od.mats) _slMatsIn(g, od.mats);
              else if (od.color && g.material && g.material.color) g.material.color.set(od.color);

              // 🖼 TEKSTURA — zamin shoxi `continue` bilan tugagani uchun
              //   pastdagi umumiy tekstura kodiga YETIB BORMASDI.
              //   Natijada zaminga berilgan tekstura har ochilishda
              //   yo'qolardi (rangi qolardi, rasmi yo'q).
              if (od.textureFile && zipObj) {
                try {
                  const _d = await zipObj.file(od.textureFile)?.async('base64');
                  if (_d) {
                    const _e = od.textureFile.split('.').pop().toLowerCase();
                    const _m = _e === 'png' ? 'image/png'
                             : (_e === 'jpg' || _e === 'jpeg') ? 'image/jpeg'
                             : _e === 'webp' ? 'image/webp' : 'image/png';
                    const _u = `data:${_m};base64,${_d}`;
                    const _t = new THREE.TextureLoader().load(_u);
                    const _mm = Array.isArray(g.material) ? g.material : (g.material ? [g.material] : []);
                    for (const m of _mm) { if (m) { m.map = _t; m.needsUpdate = true; } }
                    g.userData.textureBase64 = _u;
                    // 🏷 Asl nom bo'lsa — o'sha; bo'lmasa ZIP dagi nom.
                    g.userData.textureName = od.textureOrigName
                      || od.textureFile.split('/').pop();
                  }
                } catch (e) { log('⚠ Zamin teksturasi o\'qilmadi', 'lw'); }
              }
              // 🎨 Per-face teksturalar (har yuzga alohida)
              //   ⚠ `deserialize()` — API nomi shunday (`restore` emas),
              //     va rasmlar `texture/` papkadan base64 ga qaytariladi
              //     (pastdagi umumiy yo'l bilan bir xil naqsh).
              if (od.perFace && od.perFace.enabled && typeof PerFaceTextures !== 'undefined') {
                try {
                  if (zipObj && Array.isArray(od.perFace.faces)) {
                    for (const _f of od.perFace.faces) {
                      if (!_f.textureFile || _f.textureBase64) continue;
                      const _b = await zipObj.file(_f.textureFile)?.async('base64');
                      if (!_b) continue;
                      const _x = (_f.textureFile.split('.').pop() || 'png').toLowerCase();
                      const _mi = (_x === 'jpg' || _x === 'jpeg') ? 'image/jpeg'
                                : _x === 'webp' ? 'image/webp' : 'image/png';
                      _f.textureBase64 = 'data:' + _mi + ';base64,' + _b;
                    }
                  }
                  PerFaceTextures.deserialize(g, od.perFace);
                } catch (e) { log('⚠ Zamin perFace teksturasi tiklanmadi', 'lw'); }
              }
              // 🔁 Tekstura Loop
              if (od.textureLoop && od.textureLoop.enabled && typeof TextureLoopSystem !== 'undefined') {
                try { TextureLoopSystem.restore(g, od.textureLoop); } catch (e) {}
              }
              if (od.ud) for (const k in od.ud) {
                if (k === 'id' || k === 'name' || k === 'type') continue;
                g.userData[k] = od.ud[k];
              }
              g.userData.isGround = true;    // bayroq yo'qolmasin
            }
          } catch (e) {}
          continue;
        }
        // 💻 PC blokning 📷 kamera lankasi ALOHIDA yuklanmaydi —
        //    uni PCBlockSystem.ensureCamAnchor() PC bilan birga qayta yaratadi.
        //    Aks holda ierarxiyada IKKITA "PC — 📷 kamera" paydo bo'lardi.
        if (od.type === 'PCCam' || (od.ud && od.ud.isPCCam)) continue;

        // 🦴 SUYAK QOLDIQLARI — orqaga moslik.
        //    Filtri tuzatilgunga qadar saqlangan sahnalarda rigli modelning
        //    har bir suyagi alohida yozuv bo'lib tushib qolgan. Ularni
        //    tiklash SHART EMAS: `_registerBones()` model yuklanganда
        //    suyaklarni GLB ning O'ZIDAN qayta ro'yxatga oladi.
        //    Tashlab ketmasak — o'sha eski yolg'on kublar qaytadi.
        if ((od.ud && (od.ud.isBone || od.ud._noSave)) || od.isBone) {
          _slSkipped++;
          continue;
        }
        // 🛤 Yo'l shakli — ESKI fayllarda saqlangan bo'lishi mumkin.
        //   `PathSystem.rebuild()` uni qayta yasaydi, ya'ni fayldagisi
        //   ortiqcha (va u kub bo'lib tushardi).
        if (od.ud && od.ud.isPathShape) { _slSkipped++; continue; }

        // GLB modellar
        if (od.isGLB && od.glbFile && zipObj) {
          const glbBuf = zipModels[od.glbFile]?.buffer;
          if (!glbBuf) {
            log(`❌ "${od.name}" modeli ZIP da topilmadi (${od.glbFile}) — kub bo'lib yuklanadi`, 'le');
          }
          if (glbBuf && THREE.GLTFLoader) {
            const loader = getGLTFLoader();
            await new Promise(res=>{
              loader.parse(glbBuf,'',gltf=>{
                const clone = gltf.scene;
                const wrapper=new THREE.Group();
                wrapper.add(clone);
                const box2=new THREE.Box3().setFromObject(clone);
                const sz=box2.getSize(new THREE.Vector3());
                const bboxMesh=new THREE.Mesh(new THREE.BoxGeometry(sz.x,sz.y,sz.z),new THREE.MeshBasicMaterial({visible:false,transparent:true,opacity:0}));
                bboxMesh.position.copy(box2.getCenter(new THREE.Vector3()));
                wrapper.add(bboxMesh);
                const newId=++objIdC;
                // ⚠ TUZATILDI: avval saqlangan to'liq userData, keyin tizim maydonlari
                wrapper.userData=Object.assign({}, od.ud||{},
                  {id:newId,name:od.name,type:'GLB',isGLB:true,isPlayerObj:od.isPlayerObj||false});
                // ⭐ ENG MUHIM QATOR: GLB baytlarini obyektga QAYTARAMIZ.
                //
                //  ⚠ Busiz zanjir shunday uzilardi:
                //      import  → `_glbBuffer` bor  → saqlash ISHLAYDI
                //      yuklash → `_glbBuffer` YO'Q (`_SL_RUNTIME` uni JSON dan
                //                tashlaydi, bu to'g'ri — bayt `models/` da)
                //      qayta saqlash → bufer yo'q → `models/` papkasi
                //                UMUMAN yaratilmaydi → model butunlay yo'qoladi
                //
                //    Ya'ni model FAQAT bir marta saqlanardi. Sahnani ochib
                //    tahrirlab, qayta saqlagan yoki o'yin qilib eksport qilgan
                //    zahoti model kub bo'lib qolardi.
                wrapper.userData._glbBuffer = glbBuf;
                if (od.oldId != null) _slIdMap.set(String(od.oldId), newId);
                if (od.oldParentId != null) _slPending.push({obj:wrapper, oldParent:String(od.oldParentId)});
                wrapper.position.set(od.position.x,od.position.y,od.position.z);
                wrapper.rotation.set(od.rotation.x,od.rotation.y,od.rotation.z);
                // Saqlangan scale ni ishlatish (auto-normalize YO'Q)
                if (od.scale) wrapper.scale.set(od.scale.x,od.scale.y,od.scale.z);
                else {
                  // Faqat eski fayllar uchun normalize
                  const maxDim=Math.max(sz.x,sz.y,sz.z);
                  if(maxDim>5) wrapper.scale.setScalar(5/maxDim);
                  else if(maxDim<0.3) wrapper.scale.setScalar(0.5/maxDim);
                }
                wrapper.traverse(ch=>{if(ch.isMesh||ch.isSkinnedMesh){ch.castShadow=true;ch.receiveShadow=true;}});
                scene.add(wrapper); objects.push(wrapper);
                _spawned.push(wrapper); if (_onSpawn) _onSpawn(wrapper, od);
                res();
              },()=>res());
            });
            continue;
          }
        }

        // ⚠ GLB deb belgilangan, lekin fayl havolasi YO'Q. Bu saqlashda
        //   bufer topilmaganini bildiradi (yuqoridagi "MODELI SAQLANMADI").
        //   Jimgina kub qilib qo'ymaymiz — sababini aytamiz.
        if (od.isGLB && !od.glbFile) {
          log(`❌ "${od.name}" modeli faylsiz saqlangan — kub bo'lib yuklanadi. ` +
              `Modelni qayta import qiling.`, 'le');
        }

        // 🏁 Start / Finish bloklari — ko'rinish KOD bilan yasaladi
        //    (bayroq, ustun, halqa). Faylda faqat `userData` bor.
        if (od.ud && (od.ud.isStartBlock || od.ud.isFinishBlock) && window.StartFinishSystem) {
          const kind = od.ud.isStartBlock ? 'start' : 'finish';
          const b = StartFinishSystem.create(kind,
            new THREE.Vector3(od.position.x, od.position.y, od.position.z));
          Object.assign(b.userData, od.ud, { id: b.userData.id });
          b.userData.name = od.name || b.userData.name;
          if (od.rotation) b.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
          if (od.scale) b.scale.set(od.scale.x, od.scale.y, od.scale.z);
          _slIdMap.set(String(od.oldId), b.userData.id);
          _spawned.push(b); if (_onSpawn) _onSpawn(b, od);
          continue;
        }

        // 🔫 Gravity Gun — ko'rinishni qayta quramiz
        //    ⚠ Qurol geometriyasi KOD bilan yasaladi (korpus, shox, yadro).
        //      Faylda faqat `userData` saqlanadi — shuning uchun yuklashda
        //      qayta qurilmasa sahnada BO'SH guruh paydo bo'lardi.
        if (od.ud && od.ud.isGravityGun && window.GravityGunSystem?.Weapon) {
          const gun = GravityGunSystem.Weapon.create(
            new THREE.Vector3(od.position.x, od.position.y, od.position.z));
          Object.assign(gun.userData, od.ud, { id: gun.userData.id });
          gun.userData.name = od.name || gun.userData.name;
          if (od.rotation) gun.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
          if (od.scale) gun.scale.set(od.scale.x, od.scale.y, od.scale.z);
          _slIdMap.set(String(od.oldId), gun.userData.id);
          _spawned.push(gun); if (_onSpawn) _onSpawn(gun, od);
          continue;
        }

        // Sound Block — reconstruct
        if (od.isSoundBlock && typeof SoundBlockSystem !== 'undefined') {
          const sb = SoundBlockSystem.create(new THREE.Vector3(od.position.x, od.position.y, od.position.z));
          // ⚠ Surat — `_slMergeRest` shox TEGMAGAN maydonlarni
          //   fayldan tiklay olishi uchun (izohiga qarang).
          const _snap_sb = _slSnap(sb);
          sb.userData.name = od.name || sb.userData.name;
          if (od.rotation) sb.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
          if (od.soundBlock) {
            sb.userData.triggerSize = od.soundBlock.triggerSize || sb.userData.triggerSize;
            sb.userData.soundName   = od.soundBlock.soundName || '';
            sb.userData.playMode    = od.soundBlock.playMode || 'once';
            sb.userData.trigger     = od.soundBlock.trigger || 'enter';
            sb.userData.volume      = od.soundBlock.volume != null ? od.soundBlock.volume : 0.7;
            // 🟢 Ovoz markazi — `_ensureAnchor` uni yashil sharga qo'llaydi
            if (od.soundBlock.audioOffset) sb.userData.audioOffset = od.soundBlock.audioOffset;
            if (od.soundBlock.zoneShape)   sb.userData.zoneShape   = od.soundBlock.zoneShape;
            if (Array.isArray(od.soundBlock.bindings) && od.soundBlock.bindings.length) {
              // ⚠ BUTUNLIGICHA — saqlashdagi bilan bir xil qoida.
              //   Ilgari bu yerda ham 8 maydon qo'lda sanalardi va
              //   `volMax` · `volMin` · `spatial` · `reverb` tushib
              //   qolardi. `_newBinding()` standartlarni beradi,
              //   saqlangan qiymatlar ularning ustiga yoziladi.
              sb.userData.bindings = od.soundBlock.bindings.map(b => {
                const base = SoundBlockSystem._newBinding(b.id || 1);
                for (const k in b) if (k[0] !== '_' && b[k] !== undefined) base[k] = b[k];
                return base;
              });
              sb.userData._bindIdC = sb.userData.bindings.reduce((m, b) => Math.max(m, b.id || 0), 0) || 1;
            } else {
              // eski format — migratsiya bindings tuzilishiga
              if (SoundBlockSystem.ensureBindings) SoundBlockSystem.ensureBindings(sb.userData);
            }
            if (SoundBlockSystem.syncSize) SoundBlockSystem.syncSize(sb);
          }
          // 🔊 zoneShape / audioOffset va boshqa yangi maydonlar
          _slMergeRest(sb, od, null, _snap_sb);
          if (od.oldId != null) _slIdMap.set(String(od.oldId), sb.userData.id);
          _spawned.push(sb); if (_onSpawn) _onSpawn(sb, od);
          continue;
        }

        // Map Loader — reconstruct via MapLoaderSystem
        if (od.isMapLoader && typeof MapLoaderSystem !== 'undefined') {
          const ml = MapLoaderSystem.create(new THREE.Vector3(od.position.x, od.position.y, od.position.z));
          // ⚠ Surat — `_slMergeRest` shox TEGMAGAN maydonlarni
          //   fayldan tiklay olishi uchun (izohiga qarang).
          const _snap_ml = _slSnap(ml);
          ml.userData.name = od.name || ml.userData.name;
          if (od.rotation) ml.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
          // 📏 O'LCHAM — gizmo bilan berilgan `scale`.
          //    ⚠ Ilgari tiklanmasdi: `create()` dan keyingi (1,1,1) qolardi
          //      va cho'zilgan trigger zonasi sahna qayta ochilganda
          //      kubga qaytardi. `syncSize()` faqat GEOMETRIYAni
          //      `triggerSize` dan quradi — `scale` undan mustaqil
          //      (`syncSize` izohiga qarang).
          if (od.scale) ml.scale.set(od.scale.x, od.scale.y, od.scale.z);
          if (od.mapLoader) {
            ml.userData.triggerSize = od.mapLoader.triggerSize || ml.userData.triggerSize;
            ml.userData.mapName     = od.mapLoader.mapName || '';
            ml.userData.mapB64      = od.mapLoader.mapB64 || null;
            ml.userData.loading     = od.mapLoader.loading  || ml.userData.loading;
            ml.userData.teleport    = od.mapLoader.teleport || ml.userData.teleport;
            ml.userData.collision   = od.mapLoader.collision || 'original';
            ml.userData.playAnim    = od.mapLoader.playAnim || 'none';
            // ⚠ Ilgari: `od.mapLoader.autoUnload || false` — bu ikki xato
            //   qilardi: (1) `undefined` ni `false` ga aylantirardi, ya'ni
            //   MapLoaderSystem.defaults() dagi standart umuman ishlamasdi;
            //   (2) eski sahnalarда `autoUnload:false` qotib qolardi va
            //   o'yinchi 2-marta kirsa karta almashmasdi — Map Loader'ning
            //   asosiy maqsadi ishlamay turardi.
            //   `autoUnloadV2` — eski sahnani bir marta yangi standartga
            //   o'tkazish belgisi. Undan keyin foydalanuvchi tanlovi hurmat qilinadi.
            ml.userData.autoUnload = od.mapLoader.autoUnloadV2
              ? (od.mapLoader.autoUnload !== false)
              : true;   // eski sahna → yangi standart (yoqiq)
            ml.userData.autoUnloadV2 = true;
            ml.userData.keepElements = Array.isArray(od.mapLoader.keepElements) ? od.mapLoader.keepElements : [];
            ml.userData.keepReverse = od.mapLoader.keepReverse || false;
            ml.userData.mapObjectNames = Array.isArray(od.mapLoader.mapObjectNames) ? od.mapLoader.mapObjectNames : [];
            // 🎯 Eski karta markaziga tenglashtirish (standart: o'chiq)
            ml.userData.alignToOld = !!od.mapLoader.alignToOld;
            // 💡 Karta o'z muhitini olib kelsinmi (standart: YOQIQ)
            //    ⚠ `|| true` EMAS va `|| false` ham EMAS: standart yoqiq
            //      bo'lgani uchun faqat AYNAN `false` o'chiq deb qabul
            //      qilinadi. Eski sahnalarda maydon yo'q (`undefined`) —
            //      ular standartga (yoqiq) tushadi.
            //    ⚠ Bu qator umuman YO'Q edi: `create()` standart `true`
            //      ni qo'yardi, `_slMergeRest` esa faqat `undefined`
            //      maydonlarni to'ldiradi — ya'ni o'chirib qo'ygan
            //      sozlamangiz har yuklashda qayta YONARDI.
            ml.userData.mapEnv = od.mapLoader.mapEnv !== false;
            if (ml.userData.triggerSize && MapLoaderSystem.syncSize) MapLoaderSystem.syncSize(ml);
          }
          _slMergeRest(ml, od, null, _snap_ml);
          if (od.oldId != null) _slIdMap.set(String(od.oldId), ml.userData.id);
          _spawned.push(ml); if (_onSpawn) _onSpawn(ml, od);
          continue;
        }

        // 🪜 Narvon — LadderSystem orqali tiklaymiz
        if (od.isLadder && typeof LadderSystem !== 'undefined') {
          const ld = LadderSystem.create(new THREE.Vector3(od.position.x, od.position.y, od.position.z));
          // ⚠ Surat — `_slMergeRest` shox TEGMAGAN maydonlarni
          //   fayldan tiklay olishi uchun (izohiga qarang).
          const _snap_ld = _slSnap(ld);
          ld.userData.name = od.name || ld.userData.name;
          if (od.rotation) ld.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
          if (od.scale) ld.scale.set(od.scale.x, od.scale.y, od.scale.z);
          if (od.ladder) {
            ld.userData.climbUpKey   = od.ladder.climbUpKey   || 'KeyW';
            ld.userData.climbDownKey = od.ladder.climbDownKey || 'KeyS';
            ld.userData.exitKey      = od.ladder.exitKey      || 'KeyE';
            ld.userData.climbSpeed   = od.ladder.climbSpeed != null ? od.ladder.climbSpeed : 3;
            ld.userData.grabDist     = od.ladder.grabDist  != null ? od.ladder.grabDist  : 1.2;
            ld.userData.autoRelease  = od.ladder.autoRelease !== false;
          }
          _slMergeRest(ld, od, null, _snap_ld);
          if (od.oldId != null) _slIdMap.set(String(od.oldId), ld.userData.id);
          _spawned.push(ld); if (_onSpawn) _onSpawn(ld, od);
          continue;
        }

        // Hitbox — reconstruct via HitboxSystem, then apply saved data
        if (od.isHitbox && typeof HitboxSystem !== 'undefined') {
          const hb = HitboxSystem.create(new THREE.Vector3(od.position.x, od.position.y, od.position.z));
          // ⚠ Surat — `_slMergeRest` uchun (izohiga qarang).
          const _snap_hb = _slSnap(hb);
          hb.userData.name          = od.name || hb.userData.name;
          hb.userData.hitboxSize    = od.hitboxSize    || hb.userData.hitboxSize;
          hb.userData.triggerType   = od.triggerType   || hb.userData.triggerType;
          hb.userData.collisionMode = od.collisionMode || 'inline';
          // Sync colliderMode (what player.js checks for pass-through)
          if (hb.userData.collisionMode === 'inline') hb.userData.colliderMode = 'inline';
          else delete hb.userData.colliderMode;
          hb.userData.targetObjectId = od.targetObjectId ?? null;
          if (od.reverseMode) {
            hb.userData.reverseMode = Object.assign({}, hb.userData.reverseMode, od.reverseMode);
          }
          if (od.hitboxActions) {
            hb.userData.actions = Object.assign({}, hb.userData.actions, od.hitboxActions);
            // Migrate old single-slot importedAnimation to multi-slot
            const acts = hb.userData.actions;
            if (acts.importedAnimation && !acts.importedAnimations) {
              const old = acts.importedAnimation;
              if (old.keyframes && old.keyframes.length > 0) {
                acts.importedAnimations = {
                  enabled: !!old.enabled,
                  slots: [{
                    id: 1,
                    sourceName:     old.sourceName || 'migrated.json',
                    keyframes:      old.keyframes,
                    duration:       old.duration || 0,
                    targetObjectId: old.targetObjectId || null,
                    speed:          old.speed || 1.0,
                    loop:           !!old.loop,
                  }],
                };
              }
              delete acts.importedAnimation;
            }
          }
          if (od.rotation) hb.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
          if (od.scale)    hb.scale.set(od.scale.x, od.scale.y, od.scale.z);
          HitboxSystem.syncSize(hb);
          // Apply block-mode visual tint if needed
          if (hb.userData.collisionMode === 'block' &&
              hb.userData._fillRef && hb.userData._fillRef.material) {
            hb.userData._fillRef.material.color.setHex(0xff4444);
            hb.userData._fillRef.material.opacity = 0.14;
            hb.userData._fillRef.material.needsUpdate = true;
          }
          // 📦 itemReq va boshqa oq ro'yxatga kirmagan maydonlar
          _slMergeRest(hb, od, null, _snap_hb);
          if (od.oldId != null) _slIdMap.set(String(od.oldId), hb.userData.id);
          _spawned.push(hb); if (_onSpawn) _onSpawn(hb, od);
          continue;
        }

        let primIdx = PRIMITIVES.findIndex(p=>p.name===od.type);
        // 📝 Matn bloki PRIMITIVES da yo'q — u pastda restore() bilan
        // to'g'ri plane geometriyaga aylantiriladi, ogohlantirish shart emas.
        const _isTB = !!(od.ud && od.ud.isTextBlock);
        const _isCam = !!(od.ud && od.ud.isCamera);   // kamera pastda Group bilan almashtiriladi
        const _isGaze = !!(od.ud && od.ud.isGazeTrigger);  // qarash bloki — pastda ikona bilan
        const _isBtn = !!(od.ud && od.ud.isInteractiveBtn);  // tugma — pastda restoreBtnVisual
        const _isPC  = !!(od.ud && od.ud.isPCBlock);         // PC — pastda Group bilan
        // 📁 Papka/guruh — pastda `SceneTypes` uni Group bilan almashtiradi.
        //    `type` 'group'/'Group' bo'ladi va u `PRIMITIVES` da yo'q, ya'ni
        //    bu yerda "Noma'lum tur" ogohlantirishi chiqardi — foydalanuvchi
        //    uchun bu XATO emas, normal holat.
        const _isFold = !!(od.type === 'group' || od.type === 'Group' ||
                           (od.ud && (od.ud._isFolder || od.ud.isFolder)));
        if (primIdx<0) {
          if (!_isTB && !_isCam && !_isGaze && !_isBtn && !_isPC && !_isFold)
            log(`⚠ Noma'lum tur (${od.type}), Kub bilan almashtirildi: ${od.name}`,'lw');
          primIdx=0;
        }
        const geo = PRIMITIVES[primIdx].geo();
        const mat = new THREE.MeshStandardMaterial({color:od.color||0x888888,roughness:od.roughness??0.5,metalness:od.metalness??0});
        const mesh = new THREE.Mesh(geo,mat);
        // ⚠ Ilgari soya QOTIB `true` yozilardi va `visible` umuman
        //   o'qilmasdi. Saqlangan qiymat bo'lsa — o'sha ishlatiladi,
        //   bo'lmasa (eski fayl) eski xulq saqlanadi.
        mesh.castShadow    = od.castShadow    !== undefined ? !!od.castShadow    : true;
        mesh.receiveShadow = od.receiveShadow !== undefined ? !!od.receiveShadow : true;
        if (od.visible !== undefined) mesh.visible = od.visible !== false;
        if (od.renderOrder) mesh.renderOrder = od.renderOrder;
        // 🎨 To'liq material holati (shaffoflik, nur, simli, barcha slotlar).
        //    `SceneTypes.restore()` dan OLDIN — maxsus turlar (tugma, PC,
        //    kamera) o'z ko'rinishini keyin baribir qayta quradi.
        if (od.mats) _slMatsIn(mesh, od.mats);
        mesh.position.set(od.position.x,od.position.y,od.position.z);
        mesh.rotation.set(od.rotation.x,od.rotation.y,od.rotation.z);
        mesh.scale.set(od.scale.x,od.scale.y,od.scale.z);
        const newId = ++objIdC;
        // ⚠ TUZATILDI: avval saqlangan to'liq userData (platformMode, colliderMode,
        // isInteractiveBtn, btnMode, camViewMode, fov, physMode ...), keyin tizim maydonlari
        mesh.userData=Object.assign({}, od.ud||{},
          {id:newId, name:od.name, type:od.type, script:od.script||null, isPlayerObj:od.isPlayerObj||false});
        if (od.oldId != null) _slIdMap.set(String(od.oldId), newId);
        if (od.oldParentId != null) _slPending.push({obj:mesh, oldParent:String(od.oldParentId)});
        // ⚠ Matn bloki / PC / kamera / tugma va h.k. — ko'rinish pastda,
        //   `SceneTypes.restore()` da bir marta tiklanadi. Ilgari matn
        //   bloki SHU YERDA ham chaqirilardi va ikki marta qurilardi.

        // Texture yuklash (ZIP ichidan)
        if (od.textureFile && zipObj) {
          try {
            const imgData = await zipObj.file(od.textureFile)?.async('base64');
            if (imgData) {
              const ext = od.textureFile.split('.').pop().toLowerCase();
              // ⚠ `webp` ham qo'llab-quvvatlanadi: ilgari u `image/png`
              //   bo'lib qaytardi va brauzer rasmni o'qiy olmasdi.
              const mime = ext==='png'  ? 'image/png'
                         : ext==='jpg' || ext==='jpeg' ? 'image/jpeg'
                         : ext==='webp' ? 'image/webp'
                         : ext==='gif'  ? 'image/gif'
                         : 'image/png';
              const dataUrl = `data:${mime};base64,${imgData}`;
              const tex = new THREE.TextureLoader().load(dataUrl);
              mat.map = tex; mat.needsUpdate = true;
              mesh.userData.textureBase64 = dataUrl;
              mesh.userData.textureName = od.textureOrigName
                || od.textureFile.split('/').pop();
            }
          } catch(e) { log('⚠ Texture o\'qilmadi: '+od.textureFile,'lw'); }
        }

        // Textura Loop holatini tiklash (tekstura qo'llangach)
        if (od.textureLoop && od.textureLoop.enabled && typeof TextureLoopSystem !== 'undefined') {
          TextureLoopSystem.restore(mesh, od.textureLoop);
        }

        // Roll (damage/heal) holatini tiklash
        if (od.roll && typeof ObjectRoleSystem !== 'undefined') {
          ObjectRoleSystem.restore(mesh, od.roll);
        }

        if (od.script) { scriptCompile(od.script, newId); mesh.userData.script = od.script; }

        // 🎥 KAMERA — save-load type ni PRIMITIVES da topolmay yuqorida
        //    KUB qilib yaratdi. Endi haqiqiy kamera modeli bilan almashtiramiz.
        // ── KO'RINISHNI TIKLASH ──────────────────────────────────
        //  ⚠ Ilgari bu yerda PC / kamera / qarash / tugma uchun alohida
        //    if/else zanjiri turardi, va AYNAN shunday zanjir
        //    `prefab.js` da ham bor edi. Ikki nusxa bir-biridan ajralib
        //    ketgandi: tugma bu yerda YO'Q edi (kub bo'lib qolardi),
        //    hitbox/sound/map-loader esa prefabda bor, bu yerda yo'q.
        //    PC ni Group ga o'rash tuzatishi ham faqat SHU yerda edi.
        //    Endi ikkalasi ham `SceneTypes` ro'yxatidan o'qiydi.
        const _placed = window.SceneTypes ? SceneTypes.restore(mesh) : mesh;
        if (_placed !== mesh) {
          // Iyerarxiya kutayotgan havolalarni yangi obyektga burish
          for (const pend of _slPending) if (pend.obj === mesh) pend.obj = _placed;
        }

        scene.add(_placed); objects.push(_placed);
        _spawned.push(_placed); if (_onSpawn) _onSpawn(_placed, od);
        // ⚖️ Fizika — turiga qarab. Ilgari sozlamasiz chaqirilar edi va
        //    HAR BIR yuklangan obyekt dinamik bo'lib yerga qulardi.
        // ── 📦 KUBGA BIRIKTIRILGAN MODELNI QAYTA ULAYMIZ ─────────
        //  "📦 Model qo'shish (GLB/GLTF)" bilan berilgan model. Obyekt
        //  o'zi oddiy primitiv bo'lib qolaveradi, model esa uning
        //  BOLASI bo'ladi va asos materiali yashiriladi.
        //
        //  ⚠ Busiz sahna qayta ochilganda KO'RINMAS KUB qolardi:
        //    model yo'q, ustiga `material.visible=false` ham saqlangan.
        const _attName = od.attachedGLB || (od.ud && od.ud.attachedGLB);
        if (_attName && od.glbFile && zipObj) {
          const _abuf = zipModels[od.glbFile]?.buffer;
          if (!_abuf) {
            log(`❌ "${od.name}" ga biriktirilgan model ZIP da yo'q (${od.glbFile})`, 'le');
          } else if (THREE.GLTFLoader) {
            const _ldr = getGLTFLoader();
            // ⚠ TIMEOUT — `parse()` ikkala callback'ni ham chaqirmasa
            //   (buzuq GLB, ichki xato), `await` MANGU kutardi va
            //   qolgan obyektlar UMUMAN yuklanmasdi: sahna yarim
            //   bo'sh chiqardi. Endi 15 soniyadan keyin davom etamiz.
            await new Promise(resolve => {
              let _done = false;
              let _tmr  = null;
              // Bir marta va faqat bir marta yakunlaymiz
              const res = () => {
                if (_done) return;
                _done = true;
                if (_tmr) clearTimeout(_tmr);
                resolve();
              };
              _tmr = setTimeout(() => {
                log(`⚠ "${od.name}" modeli 15s ichida ochilmadi — o'tkazib yuborildi`, 'lw');
                res();
              }, 15000);
              _ldr.parse(_abuf, '', g2 => {
                try {
                  const ms = g2.scene;
                  ms.name = '__glb_model__';
                  ms.traverse(ch => {
                    if (ch.isMesh || ch.isSkinnedMesh) {
                      ch.castShadow = true; ch.receiveShadow = true;
                      ch.raycast = () => {};      // tanlash asos obyektga tegishli
                    }
                  });
                  // Eski bolalarni tozalab, modelni ulaymiz
                  [..._placed.children].forEach(ch => _placed.remove(ch));
                  _placed.add(ms);
                  // Asos materialini yashiramiz (yaratishdagi bilan bir xil)
                  const _mm = Array.isArray(_placed.material) ? _placed.material : (_placed.material ? [_placed.material] : []);
                  if (od.attachedGLBHidesBase !== false || (od.ud && od.ud.attachedGLBHidesBase !== false)) {
                    for (const m of _mm) { if (m) { m.visible = false; m.needsUpdate = true; } }
                  }
                  // ⭐ Buferni obyektga QAYTARAMIZ — qayta saqlash ishlasin
                  _placed.userData._glbBuffer = _abuf;
                  _placed.userData._hasGLB    = true;
                  _placed.userData._glbName   = _attName;
                  _placed.userData.attachedGLB = _attName;
                  // 📦 Modelning O'Z transformi (burilishi/joyi/o'lchami).
                  //   Busiz mashinaning oldiga moslab burilgan model
                  //   har ochilishда boshlang'ich holatiga qaytardi.
                  const _xf = od.attachedGLBXform;
                  if (_xf) {
                    if (_xf.p) ms.position.set(_xf.p.x, _xf.p.y, _xf.p.z);
                    if (_xf.r) ms.rotation.set(_xf.r.x, _xf.r.y, _xf.r.z);
                    if (_xf.s) ms.scale.set(_xf.s.x, _xf.s.y, _xf.s.z);
                  } else if (od.facingY != null) {
                    ms.rotation.y = od.facingY * Math.PI / 180;   // eski fayllar
                  }
                  if (od.facingY != null) _placed.userData._facingY = od.facingY;
                  // 🎬 Animatsiyalar
                  if (g2.animations && g2.animations.length) {
                    const mx = new THREE.AnimationMixer(ms);
                    const acts = g2.animations.map(c => {
                      const a = mx.clipAction(c); a.loop = THREE.LoopRepeat; return a;
                    });
                    acts[0].play();
                    _placed.userData._mixer   = mx;
                    _placed.userData._clips   = g2.animations;
                    _placed.userData._actions = acts;
                    _placed.userData._activeAnim = 0;
                  }
                } catch (e) {
                  log(`⚠ "${od.name}" modeli ulanmadi: ${e.message}`, 'lw');
                }
                res();
              }, () => { log(`❌ "${od.name}" modeli o'qilmadi`, 'le'); res(); });
            });
          }
        }

        // ⚠ `physicsOptsFor` TURGA qarab qaror qiladi va `null` qaytarsa
        //   tana BERILMAYDI (hitbox/PC/tugma o'z tanasini o'zi boshqaradi).
        //   Bu qaror KUCHDA qoladi — saqlangan sozlamalar faqat qaror
        //   "tana bo'lsin" bo'lganda ustiga yoziladi. Aks holda ikkita
        //   tana paydo bo'lardi.
        const _phys = physicsOptsFor(_placed);
        if (_phys) addPhysicsBody(_placed, od.phys ? Object.assign({}, _phys, od.phys) : _phys);
        // 👁 Ko'rinish/soya — almashtirilgan obyektga ham (kamera modeli,
        //    PC guruhi): ular yuqoridagi `mesh` emas, YANGI obyekt.
        if (_placed !== mesh) {
          if (od.visible !== undefined) _placed.visible = od.visible !== false;
          if (od.renderOrder) _placed.renderOrder = od.renderOrder;
        }

        // Restore per-face textures (if any)
        if (od.perFace && od.perFace.enabled && typeof PerFaceTextures !== 'undefined') {
          // perFace rasmlari textures/ papkada — base64 ga qaytaramiz
          if (zipObj && Array.isArray(od.perFace.faces)) {
            for (const f of od.perFace.faces) {
              if (f.textureFile && !f.textureBase64) {
                try {
                  const b64 = await zipObj.file(f.textureFile)?.async('base64');
                  if (b64) {
                    const ext = (f.textureFile.split('.').pop() || 'png').toLowerCase();
                    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
                    f.textureBase64 = 'data:' + mime + ';base64,' + b64;
                  }
                } catch (e) { log('⚠ perFace tekstura o\'qilmadi: ' + f.textureFile, 'lw'); }
              }
            }
          }
          PerFaceTextures.deserialize(mesh, od.perFace);
        }
      }
      // ── 🧹 ESKI QOLDIQLAR ─────────────────────────────────────
      // Ilgari bu yerda `isPCBlock` / `isPCCam` bayroqli obyektlarni
      // o'chiradigan tozalagich turardi (PC block tizimi olib
      // tashlangan, o'rniga 📺 Televizor qo'yilgan davrda yozilgan).
      //
      // ⚠ 💻 PC block tizimi QAYTA YOZILDI (scripts/systems/pc-block.js)
      // va yana o'sha `isPCBlock` / `isPCCam` bayroqlarini ishlatadi.
      // Shuning uchun tozalagich olib tashlandi — aks holda u har
      // yuklashda YANGI, ishlaydigan PC bloklarni kubga aylantirib,
      // 📷 lankalarini butunlay o'chirib yuborardi.
      //
      // Eski, haqiqiy "arvoh"lar (2 avlod oldingi PC block) `_screen`
      // maydonisiz keladi — PCBlockSystem.restore() ularni baribir
      // to'liq qayta quradi, ya'ni alohida migratsiya kerak emas.

      // ── 💡✨🌫🔊 SAHNA DARAJASIDAGI HOLAT ─────────────────────
      //  ⚠ Iyerarxiya tiklanishidan OLDIN: papka ichidagi chiroq
      //    `_slPending` ga yozilishi va pastdagi tsikl uni ushlashi kerak.
      //
      //  ⚠ `keepScene` (karta qo'shish rejimi) da TEGILMAYDI: karta
      //    mavjud sahna YONIGA qo'yiladi, uning chirog'i/tumani asosiy
      //    sahnaning yorug'ligini o'chirib tashlamasligi kerak.
      let _nLights = 0, _nParts = 0, _nSnd = 0;
      if (!_keepScene) {
        if (Array.isArray(data.lights) && data.lights.length) {
          try { _nLights = _slLightsIn(data.lights, _slPending); }
          catch (e) { log('⚠ Chiroqlar tiklanmadi: ' + e.message, 'lw'); }
        }
        if (Array.isArray(data.particles)) {
          try { _nParts = _slParticlesIn(data.particles); }
          catch (e) { log('⚠ Zarrachalar tiklanmadi: ' + e.message, 'lw'); }
        }
        if (data.fog) { try { _slFogIn(data.fog); } catch (e) {} }
        if (data.cameraShake && typeof CameraShakeSystem !== 'undefined' &&
            typeof CameraShakeSystem.restore === 'function') {
          try { CameraShakeSystem.restore(data.cameraShake); } catch (e) {}
        }
      }
      // 🚗 ENTITY REJIMI (avto). Sikldan KEYIN: `setEntityMode()`
      //    inspektor/iyerarxiyani qayta chizadi — har obyektda emas,
      //    faqat kerakli obyektlarda bir marta chaqiramiz.
      try {
        for (const od of (data.objects || [])) {
          if (!od.entityMode || od.oldId == null) continue;
          const newId = _slIdMap.get(String(od.oldId));
          if (newId == null) continue;
          const o = objects.find(x => x.userData && String(x.userData.id) === String(newId));
          if (!o) continue;
          o.userData._entityMode = od.entityMode;
          if (od.entityMode === 'vehicle' && typeof setEntityMode === 'function') {
            try { setEntityMode(o, 'vehicle'); } catch (e) {}
          }
        }
      } catch (e) { log('⚠ Entity rejimi tiklanmadi: ' + e.message, 'lw'); }

      // 🎥 KLAVIATURA KAMERA-FX
      if (data.camFx) {
        try {
          if (data.camFx.keys)     window._camFxKeys        = data.camFx.keys;
          if (data.camFx.combos)   window._camFxCombos      = data.camFx.combos;
          if (data.camFx.idle)     window._camFxIdle        = data.camFx.idle;
          if (data.camFx.stateCfg) window._camStateCfg      = data.camFx.stateCfg;
          if (data.camFx.profiles) window._camStateProfiles = data.camFx.profiles;
          const _nfx = Object.keys(data.camFx.keys || {}).length +
                       (data.camFx.combos || []).length;
          if (_nfx) log(`🎥 ${_nfx} ta kamera FX bog'lanishi tiklandi`, 'lg');
        } catch (e) { log('⚠ Kamera FX tiklanmadi: ' + e.message, 'lw'); }
      }

      // 🗂 Tizimlarning o'z holati (avtomatik)
      if (data.systems && typeof SystemRegistry !== 'undefined') {
        try {
          const r = SystemRegistry.restoreAll(data.systems);
          for (const e of r.errors) log('⚠ ' + e, 'lw');
          if (r.count) log(`🗂 ${r.count} ta tizim holati tiklandi`, 'lg');
        } catch (e) { log('⚠ Tizim holatlari tiklanmadi: ' + e.message, 'lw'); }
      }

      // 🌐 Sahnadan tashqaridagi sozlamalar
      if (data.globals) {
        try {
          const G = data.globals, W = window;
          const map = {
            kbAnimations: '_kbAnimations', kbCombos: '_kbCombos', afkAnims: '_afkAnims',
            mouseAnimEvents: '_mouseAnimEvents', mouseAnimJsons: '_mouseAnimJsons',
            mouseAnimModes: '_mouseAnimModes',
            capsuleCfg: '_capsuleCfg', capsuleKeys: '_capsuleKeys',
            capsuleCombos: '_capsuleCombos', capsulePresets: '_capsulePresets',
            canvases: '_canvases', camRig: '_camRigGlobal',
          };
          let _ng = 0;
          for (const k in map) if (G[k] !== undefined) { W[map[k]] = G[k]; _ng++; }
          if (_ng) log(`🌐 ${_ng} ta global sozlama tiklandi (klaviatura/kapsula/kanvas)`, 'lg');
        } catch (e) { log('⚠ Global sozlamalar tiklanmadi: ' + e.message, 'lw'); }
      }

      // ⌨ Klavish → ovoz bog'lanishlari
      if (data.keySounds) {
        try {
          window._kbSounds = data.keySounds;
          const _nk = Object.keys(data.keySounds).length;
          if (_nk) log(`⌨ ${_nk} ta klavish ovozi tiklandi`, 'lg');
        } catch (e) { log('⚠ Klavish ovozlari tiklanmadi: ' + e.message, 'lw'); }
      }

      // 🧩 Addonlar — `keepScene` da HAM o'rnatiladi (karta o'z
      //    asboblarini olib keladi). Mavjudlari ustiga yozilmaydi.
      if (data.addons && typeof AddonSystem !== 'undefined' &&
          typeof AddonSystem.restore === 'function') {
        try { AddonSystem.restore(data.addons); }
        catch (e) { log('⚠ Addonlar o\'rnatilmadi: ' + e.message, 'lw'); }
      }

      // 🔊 Ovozlar — `keepScene` da HAM tiklanadi: kartaning o'z ovozlari
      //    kutubxonaga QO'SHILADI (o'chirmaydi), aks holda karta ichidagi
      //    Sound Blocklar jimjit bo'lardi.
      if (data.audio && typeof SoundSystem !== 'undefined' &&
          typeof SoundSystem.restore === 'function') {
        try { _nSnd = await SoundSystem.restore(data.audio); }
        catch (e) { log('⚠ Ovozlar tiklanmadi: ' + e.message, 'lw'); }
      }

      // ── ⚠ YANGI: PAPKA IYERARXIYASINI TIKLASH ─────────────────
      // Eski kod parentId ni umuman saqlamasdi — sahna qayta yuklanganda
      // barcha papka/guruh tuzilmasi yassilanib ketardi.
      let _nested = 0;
      _slPending.forEach(({obj, oldParent}) => {
        const newPid = _slIdMap.get(oldParent);
        if (newPid == null) return;
        const parent = objects.find(o => o.userData && o.userData.id === newPid);
        if (!parent || parent === obj) return;
        try {
          // ── ⚠ `add`, `attach` EMAS ─────────────────────────────
          //  `attach()` obyektning DUNYO transformini saqlab, LOKAL
          //  qiymatni qayta hisoblaydi. Muharrirda (`hierReparent`)
          //  bu to'g'ri: obyekt ekranda joyidan qimirlamasligi kerak.
          //
          //  Yuklashda esa TESKARI: fayldagi `position` ALLAQACHON
          //  lokal (papkaga nisbatan). Obyekt vaqtincha `scene` ga
          //  qo'yilgani uchun `attach()` o'sha lokal qiymatni DUNYO
          //  deb qabul qilib, uni saqlab qolardi — natijada papkaning
          //  o'z siljishi BEKOR bo'lardi.
          //
          //  ⚠ ALOMAT: papka ichidagi obyektlarni ko'chirasiz (yoki
          //    ◈ pivotini o'zgartirasiz), saqlaysiz — o'yinda ular
          //    eski joyida turadi. Papka koordinata boshida (0,0,0)
          //    bo'lsa farq ko'rinmaydi, shuning uchun xato uzoq vaqt
          //    sezilmagan: `multiGroup()` papkani aynan o'sha yerda
          //    yasaydi va foydalanuvchi uni surgandagina bilinadi.
          //
          //  Har aylanmada siljish TO'PLANARDI: bir marta saqlansa
          //  1 qadam, ikki marta — 2 qadam.
          parent.add(obj); obj.userData.parentId = newPid; _nested++;
          // 💡 Chiroq papkaga tushsa, `lights[]` yozuvidagi `parent` ham
          //    yangilanishi kerak — `deleteLight()` aynan shu maydondan
          //    o'qib, chiroqni to'g'ri ota-onadan olib tashlaydi.
          if (obj.userData._lentry) obj.userData._lentry.parent = parent;
        } catch(e) {}
      });

      // ── ⚠ YANGI: BOG'LANISHLARNI YANGI id LARGA KO'CHIRISH ────
      // hitbox → kamera, tugma → maqsad obyekt (camId, targetObjectId, objId ...)
      objects.forEach(o => { if (o.userData) _slRemapIds(o.userData, _slIdMap); });

      updateHierarchy(); updateStats();

      // ── ↩ Undo tarixini tozalash ───────────────────────────────
      //  ⚠ SHART: `undo.js` tarixda havolasi turgan obyektni GPU dan
      //    bo'shatmaydi (aks holda "o'chirishni bekor qilish" buzilardi).
      //    Yuqorida eski sahna `disposeMany(_slDoomed)` ga berildi, lekin
      //    u tarixda turgani uchun bo'shatish KECHIKTIRILDI. Tarixni
      //    tozalamasak, yuklangan har bir sahna xotirada yig'ilib borardi.
      //    `reset(label)` kechiktirilganlarni bo'shatadi va yangi sahnani
      //    tarixning boshlang'ich nuqtasi qilib yozadi.
      if (typeof undoReset === 'function') undoReset('Sahna yuklandi');
      else if (typeof captureState === 'function') captureState('Sahna yuklandi');

      log(`📂 Sahna yuklandi: ${(data.objects?.length||0) - _slSkipped} obyekt` +
          (_nested ? ` (${_nested} ta papka ichida)` : '') +
          (_nLights ? ` · 💡 ${_nLights} chiroq` : '') +
          (_nParts  ? ` · ✨ ${_nParts} zarracha` : '') +
          (_nSnd    ? ` · 🔊 ${_nSnd} ovoz` : '') +
          (_slSkipped ? ` · ${_slSkipped} ta eski suyak yozuvi tashlandi` : ''), 'lok');

      // 🔢 Fayldagi takrorlangan id lar — `_slIdMap` ular uchun
      //    NOANIQ bo'ladi (bitta kalit, ikkita egasi; oxirgisi yutadi).
      //    Yuklashda har bir obyekt yangi id oladi, ya'ni sahna
      //    O'Z-O'ZIDAN tuzaladi — lekin ikkinchi obyektga qaratilgan
      //    havolalar birinchisiga tushib qolgan bo'lishi mumkin.
      const _fileDups = _slCheckDupIds(data.objects || [],
                          od => od.oldId, od => od.name || '?', 'Faylda');
      if (_fileDups.length) {
        log(`   ↳ Yuklashda id lar qayta berildi — sahna tuzaldi. ` +
            `Tekshiring: yuqoridagi obyektlarga ulangan tugma/hitbox ` +
            `to'g'ri ishlayaptimi.`, 'lw');
      }

      // ── Timeline tiklash ─────────────────────────────────────
      //
      //  ⚠ Bu blok ham `tlTracks` ni tekshirardi — u mavjud emas,
      //    demak shart HECH QACHON bajarilmasdi. Endi TimelineSystem
      //    ning o'z `restore()` i chaqiriladi.
      //
      //  `_slIdMap` — eski id → yangi id xaritasi. Obyektlar yuklashda
      //  YANGI id oladi, treklar esa eskisiga ishora qiladi. Xaritasiz
      //  har bir trek "obyekti yo'q" bo'lib qolardi. (Eski kod nom
      //  bo'yicha qidirardi — bir xil nomli ikki obyekt bo'lsa
      //  chalkashardi; nom zaxira sifatida restore() ichida qoldi.)
      // ⚠ Karta qo'shishda mavjud timeline USTIGA YOZILMAYDI — karta
      //   sahnaning bir qismi, uning treklari asosiy timeline'ni
      //   almashtirmasligi kerak.
      if (!opts.keepTimeline && data.timeline?.tracks?.length && window.TimelineSystem
          && typeof TimelineSystem.restore === 'function') {
        const kf = TimelineSystem.restore(data.timeline, _slIdMap);
        const tn = data.timeline.tracks.length;
        log(`⏱ Timeline tiklandi: ${tn} track, ${kf} keyframe`, 'lok');
      }

      // 🌌 Skybox — karta qo'shishda tiklanmaydi (fon asosiy sahnaniki)
      if (!opts.keepScene && data.skybox && typeof SkyboxSystem !== 'undefined') {
        try { SkyboxSystem.restore(data.skybox); } catch (e) {}
      }

      // ── 🌫 TUMAN — SKYBOXDAN KEYIN ────────────────────────────
      //  ⚠ Tumanning IKKI egasi bor:
      //      1. `_slFogIn(data.fog)` — sahna darajasidagi tuman
      //         (🌫 Tuman paneli, `fog-weather.js`)
      //      2. `SkyboxSystem.apply()` — skybox o'z `fogOn` /
      //         `fogColor` / `fogDensity` sozlamasidan tuman yasaydi
      //
      //  Ikkalasi ham `scene.fog` ga yozadi, ya'ni OXIRGISI g'olib.
      //  Ilgari `_slFogIn` yuqorida (skyboxdan OLDIN) ishlardi va
      //  skybox uni ustidan yozardi: skyboxda `fogOn = false` bo'lsa
      //  saqlangan tumaningiz JIMGINA o'chib ketardi. Linear tuman
      //  esa har doim `FogExp2` ga aylanardi — `near`/`far` yo'qolardi.
      //
      //  ⚠ NEGA OXIRIDA QO'YISH TO'G'RI: `_slFogOut()` saqlash
      //    paytidagi JONLI `scene.fog` ni oladi. Ya'ni tuman
      //    skyboxdan kelgan bo'lsa ham, u AYNAN o'sha holatda
      //    yozilgan. Oxirida qo'llash ekrandagi ko'rinishni
      //    aynan tiklaydi — kim yaratganidan qat'i nazar.
      if (!opts.keepScene && data.fog) { try { _slFogIn(data.fog); } catch (e) {} }

      // 🔫 Ko'tarish / gravity gun sozlamalari.
      //    ⚠ Karta QO'SHISH rejimida (`keepScene`) tiklamaymiz — karta
      //      asosiy sahnaning o'yinchi sozlamalarini bosib ketmasligi kerak.
      if (!opts.keepScene && data.gravityGun && typeof GravityGunSystem !== 'undefined') {
        try { GravityGunSystem.restore(data.gravityGun); } catch (e) {}
      }

      // ⚖️ Og'irlik markazi markerlarini tiklaymiz. `comEnabled`/`com`
      //    userData da saqlanadi, marker esa `__noSave` — ya'ni fayldan
      //    qaytmaydi. Tiklamasak sozlama "bor"day ko'rinadi-yu, na
      //    marker bo'lardi, na fizikaga uzatish.
      if (window.CenterOfMass && CenterOfMass.restoreAll) {
        try { CenterOfMass.restoreAll(); } catch (e) {}
      }

      // Chaqiruvchiga yaratilgan obyektlar va id xaritasi qaytariladi —
      // Map Loader ularga o'z belgilarini qo'yadi va ofsetni hisoblaydi.
      return { spawned: _spawned, idMap: new Map(_slIdMap), count: _spawned.length };
    } catch(err) {
      log('❌ Yuklash xatosi: '+err.message,'le');
      return { spawned: _spawned, idMap: new Map(), count: 0, error: err };
    }
  };

  if (jsonData) { return doLoad(jsonData, zipObj || null, opts); }


  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json,.zip';
  inp.onchange = async e=>{
    const file = e.target.files[0]; if (!file) return;

    if (file.name.endsWith('.zip')) {
      // ZIP fayl yuklash — mantiq `loadSceneFromZip` ga ko'chirildi,
      // chunki Kartalar kutubxonasi ham AYNAN shu yo'ldan yuklaydi.
      await window.loadSceneFromZip(await file.arrayBuffer());
    } else {
      // Oddiy JSON
      const reader = new FileReader();
      reader.onload = ev=>{ try { doLoad(JSON.parse(ev.target.result), null); } catch(err) { log('❌ JSON xatosi: '+err.message,'le'); } };
      reader.readAsText(file);
    }
  };
  inp.click();
};

// ============================================================
//  📦 loadSceneFromZip — ZIP (ArrayBuffer / Blob / JSZip) → sahna
//
//  ⚠ Ilgari bu mantiq `loadScene()` ichidagi fayl-dialog obrabotchigida
//    turardi. Ya'ni ZIP'dan yuklashning YAGONA yo'li — foydalanuvchi
//    fayl tanlashi edi. Kartalar kutubxonasi (map-library.js) esa
//    ZIP'ni IndexedDB dan Blob ko'rinishida oladi — dialogsiz.
//    Shuning uchun ajratildi. Ikkala yo'l ham AYNAN shu funksiyaga
//    tushadi → format qo'llab-quvvatlash bir joyda, ikkilanmaydi.
//
//  Qaytaradi: true — yuklandi, false — xato (log'ga yozilgan).
// ============================================================
// ============================================================
//  📖 zipToSceneData — ZIP → `doLoad` kutgan shakl
//
//  ⚠ NEGA AJRATILDI: loyihada karta ZIP ining IKKI formati bor
//    (`apex-file.json` — saqlash/kutubxona, `timeline.json` — eski
//    Timeline eksporti). Ilgari bu o'girish `loadSceneFromZip` ichida
//    qamalgan edi, `map-loader.js` esa O'Z NUSXASINI yuritardi
//    (`_readManifest`) — va ikkalasi boshqacha maydonlarni bilardi.
//    Endi bitta manba: kim ZIP dan sahna o'qisa — shu yerdan o'qiydi.
//
//  Qaytaradi: `{data, zip}` yoki `null` (xato log'ga yozilgan).
// ============================================================
window.zipToSceneData = async function(source) {
  if (typeof JSZip === 'undefined') { log('❌ JSZip yuklanmagan', 'le'); return null; }
  const zip = (source && typeof source.file === 'function')
                ? source                                   // allaqachon JSZip
                : await JSZip.loadAsync(source);           // ArrayBuffer / Blob

  let jsonFile = zip.file('apex-file.json') || zip.file('scene.json');
  let isKarta  = false;
  if (!jsonFile) { jsonFile = zip.file('timeline.json'); isKarta = true; }
  if (!jsonFile) { log('❌ ZIP ichida apex-file.json / timeline.json topilmadi', 'le'); return null; }

  const data = JSON.parse(await jsonFile.async('string'));

  // 🗺 Eski KARTA formati (apex-timeline-export) — doLoad shakliga
  if (isKarta || data.format === 'apex-timeline-export') {
    if (data.assets && Array.isArray(data.assets.models)) {
      data.models = data.assets.models.map(m => ({ name: m.name, file: m.file }));
    }
    if (data.assets && Array.isArray(data.assets.textures)) {
      for (const t of data.assets.textures) {
        const o = (data.objects || []).find(o => String(o.id) === String(t.objId));
        if (o) o.textureFile = t.file;
      }
    }
    for (const o of (data.objects || [])) {
      // doLoad `oldId` bo'yicha id xaritasini quradi
      if (o.oldId == null && o.id != null) o.oldId = o.id;
      if (o.isGLB) {
        if (!o.glbFile && (o.modelFile || o.file)) o.glbFile = o.modelFile || o.file;
        if (!o.modelName && o.name) o.modelName = o.name;
      }
      // doLoad maxsus obyektlarni `od.ud` (saqlangan userData) dan tiklaydi —
      // karta eksportida `ud` yo'q, shuning uchun uni turidan quramiz.
      const t = String(o.type || '').toLowerCase();
      o.ud = o.ud || {};
      if (t === 'kamera' || t === 'camera' || String(o.id).startsWith('cam_')) { o.isCamera = true; o.ud.isCamera = true; }
      if (t === 'pc' || t === 'pcblock' || t === 'pc block')                   { o.isPCBlock = true; o.ud.isPCBlock = true; }
      if (t === 'sound' || t === 'soundblock' || t === 'sound block')          { o.isSoundBlock = true; o.ud.isSoundBlock = true; }
      if (t === 'button' || t === 'tugma' || t === 'interactivebutton')        { o.isButton = true; o.ud.isButton = true; o.ud.isInteractiveBtn = true; }
      for (const k of ['screenMode','powered','htmlContent','imageB64','imageName','camId','triggerSize','bindings','slots','actions'])
        if (o[k] !== undefined && o.ud[k] === undefined) o.ud[k] = o[k];
    }
  }
  return { data, zip, isKarta };
};

// ============================================================
//  📦 loadSceneFromZip — ZIP (ArrayBuffer / Blob / JSZip) → sahna
//
//  ⚠ Ilgari bu mantiq `loadScene()` ichidagi fayl-dialog obrabotchigida
//    turardi. Ya'ni ZIP'dan yuklashning YAGONA yo'li — foydalanuvchi
//    fayl tanlashi edi. Kartalar kutubxonasi (map-library.js) esa
//    ZIP'ni IndexedDB dan Blob ko'rinishida oladi — dialogsiz.
//
//  Qaytaradi: true — yuklandi, false — xato (log'ga yozilgan).
// ============================================================
window.loadSceneFromZip = async function(source) {
  try {
    const r = await window.zipToSceneData(source);
    if (!r) return false;
    const { data, zip, isKarta } = r;
    log(isKarta ? '🗺 Karta yuklanmoqda...' : '📦 ZIP yuklandi, sahna tiklanmoqda...', 'lw');
    await window.loadScene(data, zip);
    return true;
  } catch (err) {
    log('❌ ZIP xatosi: ' + err.message, 'le');
    return false;
  }
};
