// ============================================================
// ENHANCED CAR CONTROLLER (carCfg bilan)
// ============================================================
let activeCar = null;   // hozir haydayotgan mashina
let carInside = false;
// Legacy constants (carCfg bo'lmasa fallback)
const CAR_MAX_SPEED  = 18;
const CAR_ACCEL      = 12;
const CAR_BRAKE      = 18;
const CAR_STEER_MAX  = 0.7;
const CAR_STEER_SPD  = 3.5;  // Burilish sezgirligi oshirildi
const CAR_FRICTION   = 0.88;

// Nitro state
let _nitroActive = false;
let _nitroTimer = 0;      // qolgan ishlash vaqti
let _nitroCoolTimer = 0;  // cooldown timeri
// Gear state
let _currentGear = 1;  // 1=P, 2=R, 3=N, 4=1st, 5=2nd ...
let _manualGear  = true; // har doim manual

// Gear index yordamchi funksiyalari
function _gearLabel(idx) {
  if (idx <= 1) return 'P';
  if (idx === 2) return 'R';
  if (idx === 3) return 'N';
  return String(idx - 3); // 4→'1', 5→'2', ...
}
function _gearMaxIdx(g) { return 3 + (g || 6); } // P(1)+R(2)+N(3)+gears
// Mode state
let _driftActive = false;
let _sportActive = false;
// Headlight state
let _headlightOn = false;
// Key prev states
const _carPrev = {};

// ── Kamera aylantirish offset (mouse orqali) ─────────────────
// _carCamYawOff / _carCamPitchOff — mashina yo'nalishidan chetlanish.
// Mashina rotatsiyasiga qo'shiladi: kamera doim mashinaga nisbatan aylanadi,
// mashina bursa kamera ham avtomatik u tomonga buriladi.
let _carCamYawOff   = 0;
let _carCamPitchOff = 0;
// Tashqi kirish (camera-modes.js dagi mousemove handleri uchun)
window._carCam = {
  get yawOff()    { return _carCamYawOff;   },
  set yawOff(v)   { _carCamYawOff = v;      },
  get pitchOff()  { return _carCamPitchOff; },
  set pitchOff(v) { _carCamPitchOff = v;    },
};

// ============================================================
//  🚗 _carResolveCollisions — mashinani obyektlarga urishtiradi
//
//  O'yinchining `player.js` dagi AABB-overlap to'qnashuvining mashina
//  varianti. Farqlari:
//    • mashina o'lchami `colliderSize`/`scale` dan olinadi;
//    • urilganda tezlik so'nadi (devorga tekkanda sekinlashadi), lekin
//      YO'NALISH saqlanadi — burchak ostida tekkanda mashina o'yinchi
//      kabi sirg'alib buriladi, ichidan o'tib ketmaydi.
//
//  ⚠ NEGA RAPIER EMAS: mashina dinamik Rapier tanasini har kadr
//    `setTranslation` bilan haydaydi. Rapier'da dinamik jismni shunday
//    itarsangiz to'qnashuv HISOBLANMAYDI — jism ichidan o'tib ketardi
//    (foydalanuvchi ko'rgan "inline bo'lib o'tib ketish"). O'yinchi ham
//    aynan shu sababdan Rapier'ga tayanmay, qo'lda AABB ishlatadi.
//
//  ⚠ Faqat GORIZONTAL (X/Z): mashina baland jismlar USTIGA chiqmasin.
//    Y ni `updateCar` o'zi boshqaradi.
// ============================================================
//  🎥 Salon kamerasining o'rni — mashina aylanishiga qarab burаladi
const _camOff = new THREE.Vector3();
// ============================================================
//  🛣 _obbTopAt — BURILGAN jismning (x, z) ustidagi SIRT balandligi
// ------------------------------------------------------------
//  ⚠ MUAMMO (foydalanuvchi rasmi bilan tasdiqlangan): mashina
//    to'qnashuvi va yer o'lchashi AABB (o'qqa parallel quti) bilan
//    ishlardi — jismning BURILISHI butunlay e'tiborsiz qolardi.
//    `colliderSize × worldScale` faqat o'lchamni beradi, burchakni
//    emas.
//
//    Ikki alomat, ikkalasi ham foydalanuvchi aytgani:
//      1. Kubni buqib TRAMPLIN qilsangiz — mashina qiyalikka
//         chiqmasdan uning ko'rinmas TIK yon devoriga urilardi.
//         Chunki 30° burilgan plita AABB da baland to'g'ri quti
//         bo'lib qolardi.
//      2. 🪜 Qadam balandligini maksimalga qo'ysangiz — mashina
//         o'sha AABB ning TEPASIGA sakrab chiqib, plita ustida
//         havoda \"yurib\" ketardi (rasmdagi holat).
//
//  YECHIM: (x, z) ustidan PASTGA nur otiladi va u jismning LOKAL
//  fazosida quti bilan kesishtiriladi. Nur lokal fazoda burchakli
//  bo'ladi, quti esa o'qqa parallel — ya'ni oddiy \"slab\" usuli
//  bilan aniq yechiladi. Natija: qiyalikning HAQIQIY balandligi.
//
//  ⚠ NEGA `Raycaster` EMAS: u butun geometriya bo'ylab uchburchak
//    darajasida yuradi. Bu funksiya HAR KADR, har jism uchun, to'rt
//    nuqtada chaqiriladi — mingdan ortiq nur. Kollayder qutisi
//    bo'yicha yechim esa bir necha bo'lish amali.
//
//  @returns {number|null} dunyo Y, yoki (x,z) jism ustida bo'lmasa null
// ============================================================
const _obbInv  = new THREE.Matrix4();
const _obbP0   = new THREE.Vector3();
const _obbP1   = new THREE.Vector3();
const _obbDir  = new THREE.Vector3();
const _obbHit  = new THREE.Vector3();

function _obbTopAt(obj, x, z) {
  const ud = obj.userData || {};
  const cs = ud.colliderSize;
  //  Lokal yarim o'lchamlar. `colliderSize` yo'q bo'lsa birlik kub
  //  (0.5) — dunyo o'lchami `matrixWorld` dagi masshtabdan keladi.
  const hx = cs ? Math.abs(cs.x) * 0.5 : 0.5;
  const hy = cs ? Math.abs(cs.y) * 0.5 : 0.5;
  const hz = cs ? Math.abs(cs.z) * 0.5 : 0.5;
  if (!(hx > 0 && hy > 0 && hz > 0)) return null;

  obj.updateMatrixWorld(true);
  _obbInv.copy(obj.matrixWorld).invert();

  //  ⚠ Yo'nalishni ikki NUQTANI o'girib olamiz. To'g'ridan-to'g'ri
  //    vektorni o'girsak masshtab noto'g'ri hisoblanardi (matritsada
  //    ko'chirish ham bor). Ikki nuqta farqi masshtabni to'g'ri
  //    o'tkazadi.
  const TOP = 1e4;
  _obbP0.set(x, TOP, z).applyMatrix4(_obbInv);
  _obbP1.set(x, TOP - 1, z).applyMatrix4(_obbInv);
  _obbDir.subVectors(_obbP1, _obbP0);
  const dlen = _obbDir.length();
  if (dlen < 1e-9) return null;
  _obbDir.multiplyScalar(1 / dlen);

  //  ── Slab usuli: har o'q bo'yicha kirish/chiqish oralig'i ──
  let tMin = -Infinity, tMax = Infinity;
  const o = [_obbP0.x, _obbP0.y, _obbP0.z];
  const d = [_obbDir.x, _obbDir.y, _obbDir.z];
  const h = [hx, hy, hz];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      //  Nur bu o'qqa parallel — quti oralig'idan tashqarida bo'lsa
      //  hech qachon kesishmaydi.
      if (o[i] < -h[i] || o[i] > h[i]) return null;
      continue;
    }
    let t1 = (-h[i] - o[i]) / d[i];
    let t2 = ( h[i] - o[i]) / d[i];
    if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    if (t1 > tMin) tMin = t1;
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return null;          // kesishmadi
  }
  if (tMax < 0) return null;
  //  ⚠ KIRISH nuqtasi (`tMin`) kerak — nur TEPADAN tushayotgani uchun
  //    u sirtning USTKI tomoni. `tMax` pastki tomon bo'lardi va
  //    mashina jismning ICHIGA tushib ketardi.
  const t = Math.max(0, tMin);
  _obbHit.copy(_obbP0).addScaledVector(_obbDir, t).applyMatrix4(obj.matrixWorld);
  return _obbHit.y;
}

// ============================================================
//  📐 _obbWorldHalf — BURILGAN jismning dunyo AABB yarim o'lchami
// ------------------------------------------------------------
//  ⚠ MUAMMO: keng faza `colliderSize × worldScale` bilan ishlardi —
//    ya'ni jism BURILMAGANDEK. Burilgan plita haqiqatda balandroq
//    va kengroq joy egallaydi, lekin filtr eski (kichik) o'lchamni
//    ko'rardi.
//
//    Natija o'lchov bilan tasdiqlangan: mashina 25° nishabga chiqib
//    y > 2.7 ga yetgach, filtrdagi
//        `markaz.y + yarimBalandlik < mashina.y − 0.7`
//    sharti bajarilib, plita ro'yxatdan BUTUNLAY chiqib ketardi.
//    Yer yo'qolar, mashina polga qulardi — keyingi kadrda yana
//    ko'tarilardi. Skrinshotdagi \"havoda yurish\" shundan.
//
//  Burilgan qutining dunyo AABB yarim o'lchami — matritsa
//  ustunlarining mos komponentlari moduli yig'indisi. Ustunlar
//  masshtabni allaqachon o'z ichiga oladi.
// ============================================================
function _obbWorldHalf(obj, out) {
  const ud = obj.userData || {};
  const cs = ud.colliderSize;
  const hx = cs ? Math.abs(cs.x) * 0.5 : 0.5;
  const hy = cs ? Math.abs(cs.y) * 0.5 : 0.5;
  const hz = cs ? Math.abs(cs.z) * 0.5 : 0.5;
  const e = obj.matrixWorld.elements;
  out.x = Math.abs(e[0]) * hx + Math.abs(e[4]) * hy + Math.abs(e[8])  * hz;
  out.y = Math.abs(e[1]) * hx + Math.abs(e[5]) * hy + Math.abs(e[9])  * hz;
  out.z = Math.abs(e[2]) * hx + Math.abs(e[6]) * hy + Math.abs(e[10]) * hz;
  return out;
}
const _obbHalf = new THREE.Vector3();

const _carTmpWP = new THREE.Vector3();
const _carTmpWS = new THREE.Vector3();
function _carResolveCollisions(carObj, ud, delta) {
  if (typeof objects === 'undefined' || !objects) return;

  carObj.updateMatrixWorld(true);
  const cS = ud.colliderSize;
  carObj.getWorldScale(_carTmpWS);
  const cHW = (cS ? cS.x * _carTmpWS.x : _carTmpWS.x) * 0.5 || 0.9;
  const cHD = (cS ? cS.z * _carTmpWS.z : _carTmpWS.z) * 0.5 || 1.8;
  const cHH = (cS ? cS.y * _carTmpWS.y : _carTmpWS.y) * 0.5 || 0.6;

  // 🪜 Qadam balandligi (cm → metr). Mashina cfg dan.
  const _cfg = (window._getCarCfg ? window._getCarCfg(carObj) : null) || {};
  const stepMax = (_cfg.stepHeightCm ?? 0) / 100;

  let hit = false;   // biror obyektga TEGDIMI
  let groundY = null; // 🪜 step-up bilan chiqqan yer balandligi (mashina markazi)

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (obj === carObj || !obj.parent) continue;
    const oud = obj.userData;
    if (!oud) continue;
    if (oud.type === 'Tekislik') continue;                 // pol
    if (oud.colliderMode === 'inline') continue;           // 👻 ataylab o'tuvchi
    if (oud.entityType === 'car' || oud._entityMode === 'vehicle') continue;
    if (oud.isSpawn || oud.isPath || oud.isPathShape) continue;
    if (oud.isInteractiveBtn || oud.isGazeTrigger || oud.isMapLoader ||
        oud.isTextBlock || oud.isSoundBlock || oud.isPCBlock || oud.isPCCam) continue;
    if (oud._animProxy || (obj.parent.userData && obj.parent.userData._animProxy === obj)) continue;
    if (oud._animDriven) continue;                         // animatsiya haydayapti
    if (oud.isPlayerObj) continue;                         // 🚗 haydovchining o'zi — o'tkazamiz
    if (obj.visible === false) continue;                   // yashirilgan (mashinaga o'tirgan o'yinchi) — soyasiga urilmasin
    if (window.PlayerController && window.PlayerController.obj === obj) continue;

    obj.updateMatrixWorld(true);
    _carTmpWP.setFromMatrixPosition(obj.matrixWorld);
    //  ⚠ BURILISHNI hisobga olgan dunyo AABB — masshtab + burchak.
    //    Ilgari faqat masshtab olinardi va burilgan jism filtrdan
    //    tushib qolardi (yuqoridagi `_obbWorldHalf` izohiga qarang).
    _obbWorldHalf(obj, _obbHalf);
    const oHW = _obbHalf.x, oHH = _obbHalf.y, oHD = _obbHalf.z;

    // ── KENG FAZA: o'qqa parallel quti bilan tez tekshiruv ──
    //  ⚠ Burilgan jismning AABB si HAR DOIM haqiqiy jismdan KATTA,
    //    shuning uchun bu yerda hech narsa o'tkazib yuborilmaydi.
    //    Aniq javob pastdagi OBB bosqichida chiqadi.
    if (_carTmpWP.y - oHH > carObj.position.y + 1.2) continue;
    if (_carTmpWP.y + oHH < carObj.position.y - 0.7) continue;

    const dx = carObj.position.x - _carTmpWP.x;
    const dz = carObj.position.z - _carTmpWP.z;
    const ox = (cHW + oHW) - Math.abs(dx);
    const oz = (cHD + oHD) - Math.abs(dz);
    if (ox <= 0 || oz <= 0) continue;                      // kesishmadi

    // ============================================================
    //  ── ANIQ FAZA: BURILISHNI HISOBGA OLGAN SIRT ──
    // ------------------------------------------------------------
    //  ⚠ Bu yerda ilgari `objTop = _carTmpWP.y + oHH` turardi — ya'ni
    //    O'QQA PARALLEL qutining tepasi. Jism burilgan bo'lsa bu son
    //    HAQIQIY sirtdan ancha baland chiqardi:
    //      • 30° ga buqilgan 8 m plita AABB da ~2 m baland quti
    //        bo'lardi va mashina uning ko'rinmas TIK yon devoriga
    //        urilardi — trampline ishlamasdi;
    //      • 🪜 Qadam balandligi maksimal bo'lsa mashina o'sha
    //        soxta tepaga sakrab chiqib, plita ustida havoda
    //        \"yurib\" ketardi.
    //
    //  Endi sirt ikki nuqtada o'lchanadi: mashina MARKAZI va OLDI.
    //  Old nuqta muhim — qiyalikka birinchi bo'lib u yetadi. Faqat
    //  markazni o'lchasak, mashina nishabning pastki qirrasiga
    //  devordek urilib, undan keyingina ko'tarilardi.
    // ============================================================
    const _fs = Math.sin(carObj.rotation.y), _fc = Math.cos(carObj.rotation.y);
    const _fx = carObj.position.x - _fs * cHD * 0.9;       // oldi (forward = −sin, −cos)
    const _fz = carObj.position.z - _fc * cHD * 0.9;
    const sC = _obbTopAt(obj, carObj.position.x, carObj.position.z);
    const sF = _obbTopAt(obj, _fx, _fz);

    //  ⚠ Ikkalasi ham `null` — mashina jismning USTIDA emas, YONIDA.
    //    Kesishuv bor (yuqorida tekshirildi), demak bu haqiqiy devor.
    if (sC === null && sF === null) {
      if (ox < oz) carObj.position.x = _carTmpWP.x + Math.sign(dx || 1) * (cHW + oHW);
      else         carObj.position.z = _carTmpWP.z + Math.sign(dz || 1) * (cHD + oHD);
      hit = true;
      continue;
    }

    //  ── Ikki namuna, ikki xil vazifa ──────────────────────────
    //  • `stepRef` — KO'TARILISH mumkinmi: eng PAST nuqta, chunki
    //    qiyalikka aynan o'sha joydan kirilaadi.
    //  • `objTop0` — gavda QAYERGA qo'yiladi: MARKAZ sirti.
    //
    //  ⚠ Ilgari bu yerda `Math.max(sC, sF)` — ya'ni OLD nuqta —
    //    turardi va gavda o'sha balandlikka ko'tarilardi. 25° qiyalikda
    //    old namuna markazdan 1.62 m oldinda, ya'ni
    //    1.62 × tan(25°) = 0.76 m BALAND. Natijada mashina butun
    //    nishab bo'ylab sirtdan 0.75 m havoda \"suzib\" borardi —
    //    o'lchov bilan tasdiqlangan (18 kadrda xato).
    //    Gavdaning BURCHAGI 🏔 qiyalikka moslashish tizimining ishi,
    //    bu yerda faqat BALANDLIK.
    const stepRef = (sC === null) ? sF : (sF === null ? sC : Math.min(sC, sF));
    const objTop0 = (sC === null) ? sF : sC;
    const carBot0 = carObj.position.y - cHH;

    // 🪜 Mashina ALLAQACHON sirt tepasida (yoki balandroqda) tursa —
    //    u endi to'siq emas, YER.
    //  ⚠ Solishtirish ENG PAST namunadan (`stepRef`), eng balanddan
    //    EMAS. Nishabda turgan mashinaning tagi markaz sirtiga teng,
    //    OLD nuqta esa undan baland — `objTop0` bilan solishtirsak
    //    mashina hech qachon \"yerda\" hisoblanmasdi va o'z ostidagi
    //    qiyalikka DEVORDEK urilardi. Test aynan shuni ushladi:
    //    mashina +X ga haydalsa ham −4.25 ga QAYTIB ketardi.
    if (carBot0 >= stepRef - 0.02) {
      if (groundY === null || objTop0 + cHH > groundY) groundY = objTop0 + cHH;
      continue;
    }

    // ── 🪜 QADAM BALANDLIGI — past to'siqqa CHIQIB KETISH ──
    //  ⚠ O'lchov ENG PAST nuqtadan (`stepRef`): nishabga chiqayotgan
    //    mashina uchun bu old g'ildirak tegadigan joy. `objTop0` dan
    //    o'lchasak uzun qiyalik \"juda baland\" bo'lib chiqib, mashina
    //    unga devordek urilardi.
    if (stepMax > 0) {
      const stepUp = stepRef - carBot0;
      if (stepUp > 0.001 && stepUp <= stepMax) {
        carObj.position.y = objTop0 + cHH;                 // sirtga qo'yamiz
        if (groundY === null || objTop0 + cHH > groundY) groundY = objTop0 + cHH;
        continue;                                          // to'sish YO'Q
      }
    }

    // Eng kichik kirish o'qi bo'yicha itaramiz — YON bo'ylab sirg'alish.
    if (ox < oz) carObj.position.x = _carTmpWP.x + Math.sign(dx || 1) * (cHW + oHW);
    else         carObj.position.z = _carTmpWP.z + Math.sign(dz || 1) * (cHD + oHD);
    hit = true;
  }

  // So'nish FAQAT haqiqiy to'qnashuvda (step-up sekinlashtirmaydi).
  if (hit) {
    ud.speed *= 0.85;
    if (Math.abs(ud.speed) < 0.4) ud.speed = 0;
  }
  return groundY;   // 🪜 step-up bo'lsa yangi yer balandligi, aks holda null
}

// ============================================================
//  🏔 QIYALIKKA MOSLASHISH
// ------------------------------------------------------------
//  ⚠ MUAMMO: `updateCar` faqat `rotation.y` (yo'nalish) ni
//    boshqarardi. Mashina nishabga chiqsa ham gavdasi gorizontal
//    turardi — old g'ildiraklar havoda, orqasi yerga botgan.
//
//  YECHIM: mashina TAGIDAN to'rtta nuqtada yer balandligi
//  o'lchanadi (old/orqa va chap/o'ng) va ulardan qiyalik burchagi
//  chiqariladi:
//      pitch = atan2(orqa − old,  bazaUzunlik)
//      roll  = atan2(o'ng − chap, bazaKenglik)
//
//  ⚠ NEGA RAYCAST EMAS: `Raycaster` har kadr butun sahna bo'ylab
//    yuradi va 4 ta nur × 60 fps qimmat. Bu yerda `_carResolveCollisions`
//    dagi AYNAN o'sha AABB mantiqi ishlatiladi — bir xil natija,
//    lekin allaqachon hisoblangan ma'lumot ustida.
//
//  ⚠ NEGA `rotation.order = 'YXZ'`: kodning qolgan qismi
//    `rotation.y` ni yo'nalish deb o'qiydi (100 dan ortiq joyda).
//    Standart 'XYZ' da pitch/roll qo'yilsa `rotation.y` endi
//    yo'nalish bo'lmay qolardi — mashina o'z-o'zidan burilib
//    ketardi. 'YXZ' da yaw BIRINCHI qo'llanadi va ma'nosi saqlanadi.
// ============================================================
const _slopeWP = new THREE.Vector3();
const _slopeWS = new THREE.Vector3();

/**
 * (x, z) nuqtasi ostidagi eng baland obyekt USTINI qaytaradi.
 * Hech nima bo'lmasa 0 (pol).
 * @param {number} maxY — shundan balandi hisobga olinmaydi (tom ostida qolmasin)
 */
function _carGroundAt(carObj, x, z, maxY) {
  let top = 0;
  if (typeof objects === 'undefined' || !objects) return top;
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (obj === carObj || !obj.parent || obj.visible === false) continue;
    const oud = obj.userData;
    if (!oud) continue;
    // ⚠ Skip qoidalari `_carResolveCollisions` bilan BIR XIL bo'lishi
    //   shart — aks holda mashina to'sig'i bilan yer sathi ajralib,
    //   gavda devorga qarab qiyalashib ketardi.
    if (oud.colliderMode === 'inline') continue;
    if (oud.entityType === 'car' || oud._entityMode === 'vehicle') continue;
    if (oud.isSpawn || oud.isPath || oud.isPathShape) continue;
    if (oud.isInteractiveBtn || oud.isGazeTrigger || oud.isMapLoader ||
        oud.isTextBlock || oud.isSoundBlock || oud.isPCBlock || oud.isPCCam) continue;
    if (oud.isPlayerObj || oud._animProxy) continue;
    if (window.PlayerController && window.PlayerController.obj === obj) continue;

    //  ⚠ BURILISHNI HISOBGA OLADI. Ilgari bu yerda ham AABB edi:
    //    `top = markaz.y + yarimBalandlik`. Buqilgan plita uchun bu
    //    son butun sirt bo'ylab BIR XIL chiqardi — ya'ni 🏔 qiyalikka
    //    moslashish nishabni umuman SEZMASDI va mashina trampline
    //    ustida gorizontal turardi.
    //    Endi har namuna nuqtasida haqiqiy sirt o'lchanadi, shuning
    //    uchun old va orqa nuqtalar farq qiladi va gavda to'g'ri
    //    burchakka og'adi.
    const t = _obbTopAt(obj, x, z);
    if (t === null) continue;
    if (t > top && t <= maxY) top = t;
  }
  return top;
}

/**
 * 🏔 Qiyalikni o'lchab, mashina gavdasini unga silliq moslaydi.
 * `tiltToSlope` o'chirilgan bo'lsa — gavdani gorizontalga qaytaradi.
 */
function _carApplySlopeTilt(carObj, cfg, delta) {
  carObj.rotation.order = 'YXZ';
  const on = !cfg || cfg.tiltToSlope !== false;
  const spd = Math.max(0.5, (cfg && cfg.tiltSpeed) || 6);
  // ⚠ Silliqlash frame-rate mustaqil: `1 - e^(-k·dt)`. Ilgari
  //   loyihada `lerp(x, dt*k)` naqshi bir necha joyda titrashga
  //   sabab bo'lgan (144 Hz da boshqa, 30 fps da boshqa tezlik).
  const k = 1 - Math.exp(-spd * delta);

  if (!on) {
    // O'chirilgan — gavdani gorizontalga qaytaramiz (sakramasdan)
    carObj.rotation.x += (0 - carObj.rotation.x) * k;
    carObj.rotation.z += (0 - carObj.rotation.z) * k;
    if (Math.abs(carObj.rotation.x) < 1e-4) carObj.rotation.x = 0;
    if (Math.abs(carObj.rotation.z) < 1e-4) carObj.rotation.z = 0;
    return;
  }

  const ud = carObj.userData;
  carObj.getWorldScale(_slopeWS);
  const cS = ud.colliderSize;
  const halfW = ((cS ? cS.x * _slopeWS.x : _slopeWS.x) * 0.5) || 0.9;
  const halfD = ((cS ? cS.z * _slopeWS.z : _slopeWS.z) * 0.5) || 1.8;
  // ⚠ Namuna nuqtalari g'ildirak o'rniga — chekkadan 80%. Aynan
  //   chekkada olsak, mashina to'siq yonidan o'tayotganda bitta
  //   nuqta to'siq ustiga tushib, gavda keskin qiyalashardi.
  const ax = halfW * 0.8, az = halfD * 0.8;
  const yaw = carObj.rotation.y;
  const s = Math.sin(yaw), c = Math.cos(yaw);
  // ── Mashina lokal → dunyo ──────────────────────────
  //  `dx` = o'ngga, `fz` = OLDINGA (metrda).
  //  ⚠ Mashina oldi — lokal −Z (`forward = (−sin, 0, −cos)`).
  //    Ilgari bu yerda `dz` \"lokal Z\" deb qaralib, old namunasi
  //    `−az` bilan olinardi — ya'ni ORQAGA. Natijada tepalikka
  //    chiqqan mashina oldi bilan yerga botib ko'rinardi.
  //    O'lchov: old 0.5 m ko'tarilganda pitch −0.17 (noto'g'ri) →
  //    endi +0.17 (burun tepada).
  const wx = (dx, fz) => carObj.position.x + dx * c - fz * s;
  const wz = (dx, fz) => carObj.position.z - dx * s - fz * c;
  // Tom ostida qolmaslik uchun: mashina markazidan yuqorisi hisobga olinmaydi
  const maxY = carObj.position.y + 0.4;

  //  F = old (fz = +az), B = orqa (fz = −az), L = chap (dx = −ax)
  const hFL = _carGroundAt(carObj, wx(-ax,  az), wz(-ax,  az), maxY);
  const hFR = _carGroundAt(carObj, wx( ax,  az), wz( ax,  az), maxY);
  const hBL = _carGroundAt(carObj, wx(-ax, -az), wz(-ax, -az), maxY);
  const hBR = _carGroundAt(carObj, wx( ax, -az), wz( ax, -az), maxY);

  const front = (hFL + hFR) / 2, back = (hBL + hBR) / 2;
  const leftH = (hFL + hBL) / 2, rightH = (hFR + hBR) / 2;

  const lim = ((cfg && cfg.tiltMaxDeg) || 35) * Math.PI / 180;
  const cl = (v) => Math.max(-lim, Math.min(lim, v));
  // ── Belgilar (Three.js aylanish yo'nalishi bo'yicha tekshirildi) ──
  //  • `rotation.x` MUSBAT → burun TEPAGA (−Z nuqtasi ko'tariladi).
  //    Demak old baland bo'lsa pitch musbat.
  //  • `rotation.z` MUSBAT → O'NG tomon TEPAGA (+X ko'tariladi).
  //    Demak o'ng baland bo'lsa roll musbat.
  //  ⚠ Ikkala belgi ham dastlab TESKARI edi — mashina qiyalikni
  //    aks ettirib, nishabga qarshi yotardi.
  const tPitch = cl(Math.atan2(front  - back,  az * 2));
  const tRoll  = cl(Math.atan2(rightH - leftH, ax * 2));

  carObj.rotation.x += (tPitch - carObj.rotation.x) * k;
  carObj.rotation.z += (tRoll  - carObj.rotation.z) * k;
  ud._slopePitch = tPitch;
  ud._slopeRoll  = tRoll;
}

function updateCar(delta) {
  if (!isPlaying || !activeCar) return;
  const ud = activeCar.userData;
  const cfg = window._getCarCfg ? window._getCarCfg(activeCar) : null;

  ud.speed      = ud.speed      || 0;
  ud.steer      = ud.steer      || 0;
  ud.lateralVel = ud.lateralVel || 0;

  // --- Cfg values (fallback to constants) ---
  const maxSpeedMs = cfg ? (cfg.maxSpeed / 3.6) : CAR_MAX_SPEED;
  const accel     = cfg ? cfg.accel    : CAR_ACCEL;
  const brakeF    = cfg ? cfg.brake    : CAR_BRAKE;
  const friction  = cfg ? cfg.friction : CAR_FRICTION;
  const gears     = cfg ? cfg.gears    : 6;
  //  🛞 Ilashuv va to'xtash — yangi sozlamalar. Standartlari eski
  //  qattiq sonlarga MOS keladi, ya'ni mavjud sahnalar o'zgarmaydi.
  const gripCfg   = cfg ? (cfg.grip ?? 0.85) : 0.85;
  const hbForce   = cfg ? (cfg.handbrakeForce ?? 2.4) : 2.4;
  const stopMs    = (cfg ? (cfg.stopSpeed ?? 1.5) : 1.5) / 3.6;
  const driveType = cfg ? cfg.driveType : 'rear';

  // --- Key mapping from cfg ---
  const gasCode   = cfg ? cfg.gasKey      : 'KeyW';
  const brkCode   = cfg ? cfg.brakeKey    : 'KeyS';
  const lefCode   = cfg ? cfg.leftKey     : 'KeyA';
  const rgtCode   = cfg ? cfg.rightKey    : 'KeyD';
  const hbkCode   = cfg ? cfg.handbrakeKey: 'Space';
  const ntrCode   = cfg ? cfg.nitroKey    : 'KeyF';
  const hlCode    = cfg ? cfg.headlightKey: 'KeyL';
  const dftCode   = cfg ? cfg.driftKey    : 'KeyC';
  const sptCode   = cfg ? cfg.sportKey    : 'KeyV';
  const exitCode  = cfg ? cfg.enterKey    : 'Enter';  // kirish va chiqish — bitta tugma

  // Yo'lovchi rejimida boshqaruv yo'q — barcha tugma input'lari 0 bo'ladi
  const isPassenger = window.carRole === 'passenger';
  const gas       = (!isPassenger && fpsKeys[gasCode])  ? 1 : 0;
  const brake     = (!isPassenger && fpsKeys[brkCode])  ? 1 : 0;
  const left      = (!isPassenger && fpsKeys[lefCode])  ? 1 : 0;
  const right     = (!isPassenger && fpsKeys[rgtCode])  ? 1 : 0;
  const handbrake = (!isPassenger && fpsKeys[hbkCode])  ? 1 : 0;

  // --- Gear system: Q ↓  E ↑ ---
  // Agar mashinada faqat 1 ta peredacha bo'lsa → AVTOMAT karobka.
  // Q/E ishlamaydi, gear har doim D (drive) da qoladi, W=oldinga, S=orqaga.
  const isAutomatic = gears <= 1;
  const maxGearIdx = _gearMaxIdx(gears);
  if (isAutomatic) {
    _currentGear = 4; // Doim Drive
  } else {
    if (!isPassenger && fpsKeys['KeyQ'] && !_carPrev['KeyQ']) {
      _currentGear = Math.max(1, _currentGear - 1);
      log(`🔢 ${_gearLabel(_currentGear)}`, 'lok');
    }
    if (!isPassenger && fpsKeys['KeyE'] && !_carPrev['KeyE'] && exitCode !== 'KeyE') {
      _currentGear = Math.min(maxGearIdx, _currentGear + 1);
      log(`🔢 ${_gearLabel(_currentGear)}`, 'lok');
    }
  }
  _carPrev['KeyQ'] = fpsKeys['KeyQ'];
  _carPrev['KeyE'] = fpsKeys['KeyE'];

  const speedKmh = Math.abs(ud.speed) * 3.6;

  // Gear ratio faqat haydash pog'onalari uchun
  const driveGear = _currentGear - 3; // ≤0 = P/R/N, 1..N = drive
  const gearRatio = driveGear > 0
    ? (0.5 + (driveGear / Math.max(gears, 1)) * 0.5)
    : 1.0;

  // --- Nitro ---
  if (cfg) {
    const nitroPress = !isPassenger && fpsKeys[ntrCode] && !_carPrev[ntrCode];
    if (nitroPress && !_nitroActive && _nitroCoolTimer <= 0 && (ud.fuel === undefined || ud.fuel > 0)) {
      _nitroActive = true;
      _nitroTimer = cfg.nitroDuration;
      log('⚡ NITRO!', 'lok');
    }
    if (_nitroActive) {
      _nitroTimer -= delta;
      if (_nitroTimer <= 0) { _nitroActive = false; _nitroCoolTimer = cfg.nitroCooldown; log('⚡ Nitro tugadi — '+cfg.nitroCooldown+'s kutish', 'lw'); }
    }
    if (!_nitroActive && _nitroCoolTimer > 0) { _nitroCoolTimer = Math.max(0, _nitroCoolTimer - delta); }
    _carPrev[ntrCode] = fpsKeys[ntrCode];
  }
  const nitroMult = (_nitroActive && cfg) ? cfg.nitroBoost : 1;

  // --- Drift & Sport mode toggle ---
  if (cfg && !isPassenger) {
    if (fpsKeys[dftCode] && !_carPrev[dftCode]) { _driftActive = !_driftActive; log('🌀 Drift: '+(_driftActive?'ON':'OFF'), _driftActive?'lok':'lw'); }
    if (fpsKeys[sptCode] && !_carPrev[sptCode]) { _sportActive = !_sportActive; log('🏁 Sport: '+(_sportActive?'ON':'OFF'), _sportActive?'lok':'lw'); }
    _carPrev[dftCode] = fpsKeys[dftCode];
    _carPrev[sptCode] = fpsKeys[sptCode];
  }
  // Rul kirishi — pastda bir necha joyda kerak
  const steerInput = right - left;

  // ── 🖐 QO'L TORMOZI ────────────────────────────────────────
  //  ⚠ ILGARI: `drifting = _driftActive || (handbrake && speed > 3)`.
  //    Ya'ni tezlik 3 m/s (10.8 km/h) dan oshsa, qo'l tormozini bosish
  //    AVTOMATIK drift rejimini yoqardi va pastdagi tormozlash satrlari
  //    (`!drifting && handbrake`) BUTUNLAY O'TKAZIB YUBORILARDI.
  //    Natijada qo'l tormozi mashinani hech qachon TO'XTATMASDI —
  //    faqat toydirardi.
  //
  //  ENDI ikkiga ajratildi:
  //    · qo'l tormozi + rul YO'Q  → sof TORMOZ, mashina to'xtaydi
  //    · qo'l tormozi + rul BOR   → orqa qism chiqadi (handbrake turn)
  const hbTurn = handbrake === 1 && Math.abs(ud.speed) > 2.5 && steerInput !== 0;
  const drifting = _driftActive || hbTurn;
  // Friksiya: per-second qiymati (frame-rate mustaqil)
  // ── 🔄 BO'SH YURISH SEKINLASHISHI ───────────────────────────
  //  ⚠ ILGARI: `frictionPerSec = drifting ? 1.2 : (sport ? 1.8 : 2.5)`.
  //    Uch qattiq son. `cfg.friction` yuqorida O'QILARDI (177-qator),
  //    lekin bu yerda ISHLATILMASDI — ya'ni inspektordagi
  //    \"Ishqalanish\" slayderi mutlaqo hech narsaga ta'sir qilmasdi.
  //
  //  Endi slayder (0.5…1) sekinlashish tezligiga aylantiriladi:
  //      0.50 → 0.60 /s  (uzoq siljiydi, muzdek)
  //      0.88 → 2.50 /s  (eski qattiq son — AYNAN mos keladi)
  //      1.00 → 3.10 /s  (tez to'xtaydi)
  //  Drift va sport rejimlari endi shu qiymatni KO'PAYTIRADI,
  //  almashtirmaydi — sozlama ular ichida ham sezilsin.
  const _fricBase = (friction - 0.5) * 5.0 + 0.6;
  const frictionPerSec = _fricBase * (drifting ? 0.48 : (_sportActive ? 0.72 : 1));
  const frictionFinal  = Math.exp(-frictionPerSec * 0.016); // ~60fps bazali

  // Sport: tezroq akselerasiya, max 30% oshadi
  // Drift: akselerasiya o'zgarmas — faqat grip kamayadi
  const accelFinal    = _sportActive ? accel * 1.3 : accel;
  const sportSpeedMul = _sportActive ? 1.25 : (_driftActive ? 1.0 : 1.0);
  const absMaxSpeedMs = maxSpeedMs * sportSpeedMul * nitroMult; // mutlaq cheklov

  // --- Headlight toggle ---
  if (cfg && !isPassenger && fpsKeys[hlCode] && !_carPrev[hlCode]) {
    _headlightOn = !_headlightOn;
    // Toggle lights on car
    activeCar.traverse(ch => { if (ch.isLight) ch.visible = _headlightOn; });
    log('💡 Fara: '+(_headlightOn?'ON':'OFF'), 'lok');
  }
  _carPrev[hlCode] = cfg ? fpsKeys[hlCode] : false;

  // --- Physics — Avtomat | P / R / N / 1..N ---
  if (ud.fuel <= 0) {
    // Yoqilg'i yo'q — asta to'xtaydi
    ud.speed *= Math.pow(0.5, delta);

  } else if (isAutomatic) {
    // ⚙ AVTOMAT KAROBKA
    // W = oldinga akselerasiya | S = tormoz (yoki to'xtagan bo'lsa orqaga)
    const gearSpeedCap = absMaxSpeedMs;
    const revCap       = maxSpeedMs * 0.35 * nitroMult;
    if (gas) {
      ud.speed = Math.min(gearSpeedCap, ud.speed + accelFinal * 1.6 * nitroMult * delta);
    }
    if (brake) {
      if (ud.speed > 0.15) {
        // Oldinga yurayotgan bo'lsa — tormoz
        ud.speed = Math.max(0, ud.speed - brakeF * delta * 1.5);
      } else {
        // To'xtagan yoki orqaga yurayotgan bo'lsa — orqaga akselerasiya
        ud.speed = Math.max(-revCap, ud.speed - accelFinal * 0.7 * nitroMult * delta);
      }
    }
    if (!gas && !brake) ud.speed *= Math.pow(frictionFinal, delta / 0.016);
    ud.speed = Math.max(-revCap, Math.min(gearSpeedCap, ud.speed));
    if (ud.fuel !== undefined) ud.fuel = Math.max(0, ud.fuel - Math.abs(ud.speed) * delta * 0.3);

  } else if (_currentGear <= 1) {
    // P — to'liq tormoz
    ud.speed *= Math.pow(0.01, delta);

  } else if (_currentGear === 2) {
    // R — orqaga
    const revCap = maxSpeedMs * 0.35 * nitroMult;
    if (gas)   ud.speed = Math.max(-revCap, ud.speed - accelFinal * 0.7 * nitroMult * delta);
    if (brake) ud.speed = Math.min(0, ud.speed + brakeF * delta);
    if (!gas && !brake) ud.speed *= Math.pow(frictionFinal, delta / 0.016);
    ud.speed = Math.max(-revCap, Math.min(0, ud.speed));

  } else if (_currentGear === 3) {
    // N — neytral, asta sekinlashadi
    ud.speed *= Math.pow(frictionFinal, delta / 0.016);

  } else {
    // Drive gears (1..N) — manual
    const gearSpeedCap = Math.min(absMaxSpeedMs,
      maxSpeedMs * sportSpeedMul * (driveGear / Math.max(gears, 1)) * nitroMult);
    const gearAccelMult = ((gears - driveGear + 1) / Math.max(gears, 1)) * 1.6 + 0.4;

    if (gas) {
      ud.speed = Math.min(gearSpeedCap, ud.speed + accelFinal * gearAccelMult * nitroMult * delta);
    } else if (!handbrake) {
      // Frame-rate mustaqil friksiya
      ud.speed *= Math.pow(frictionFinal, delta / 0.016);
    }
    if (brake)         ud.speed = Math.max(0, ud.speed - brakeF * delta * 1.5);
    // Mutlaq cheklov
    ud.speed = Math.max(0, Math.min(absMaxSpeedMs, ud.speed));
    if (ud.fuel !== undefined) ud.fuel = Math.max(0, ud.fuel - Math.abs(ud.speed) * delta * 0.3);
  }

  // ── 🖐 Qo'l tormozi — HAR DOIM sekinlatadi ──────────────────
  //  Drift paytida ham sekinlatadi, faqat kuchsizroq — aks holda
  //  "handbrake turn" ni bajarib bo'lmasdi (mashina darhol qotardi).
  //  Rulsiz bosilsa esa qattiq tormoz: mashina TO'XTAYDI.
  if (handbrake) {
    //  ⚠ `2.4` qattiq son edi — endi sozlama (🖐 Qo'l tormozi).
    const hbDecel = brakeF * (hbTurn ? 0.9 : hbForce);
    if (Math.abs(ud.speed) > 0) {
      ud.speed -= Math.sign(ud.speed) * hbDecel * delta;
    }
    // ⚠ Nolga "yopishtirish" SHART: sof ko'paytiruvchi so'nish
    //   (`speed *= 0.9`) hech qachon nolga yetmaydi va mashina
    //   sezilmas darajada sudralib turaverardi.
    if (Math.abs(ud.speed) < stopMs) { ud.speed = 0; ud.lateralVel = 0; }
  }

  // ── ⏹ TO'LIQ TO'XTASH ───────────────────────────────
  //  ⚠ Ilgari bu chegara qattiq son (`0.35`) edi va FAQAT qo'l
  //    tormozida ishlardi. Gaz qo'yib yuborilganda esa umuman yo'q:
  //    `speed *= friction` eksponensial so'nish hech qachon nolga
  //    yetmaydi. Mashina sezilmas tezlikda cheksiz \"suzib\" yurardi,
  //    HUD esa 0 km/h ko'rsatardi — sabab ko'rinmasdi.
  if (!gas && Math.abs(ud.speed) < stopMs) { ud.speed = 0; ud.lateralVel = 0; }

  // --- MIN / MAX TEZLIK (cfg.minSpeed / cfg.maxSpeed) ---
  // Qattiq maks chegara — istalgan yerda tezlik ko'p bo'lsa ham kesiladi
  if (Math.abs(ud.speed) > absMaxSpeedMs) {
    ud.speed = Math.sign(ud.speed) * absMaxSpeedMs;
  }
  // Min tezlik — drive gearda va gaz bosilganda majburiy minimal harakat
  // ("idle creep" — avtomat mashinalarning tinimsiz sekin surilishi)
  const minSpeedMs = cfg ? ((cfg.minSpeed || 0) / 3.6) : 0;
  if (minSpeedMs > 0 && ud.fuel > 0 && !brake && !handbrake) {
    const inDrive = isAutomatic || _currentGear > 3;
    if (inDrive && ud.speed >= 0 && ud.speed < minSpeedMs) {
      ud.speed = minSpeedMs;
    }
  }

  // --- Steering ---
  // Muhim: decay (0.86) faqat tugma bo'shatilganda qo'llanadi — aks holda
  // A/D ushlab turilsa ham steer maksimumga chiqolmaydi (0.7 emas ~0.36 gacha).
  // ── 🏎 TEZLIKKA BOG'LIQ RUL ─────────────────────────────────
  //  ⚠ ILGARI rul cheklovi tezlikka umuman bog'liq emasdi va pastdagi
  //    `turnFactor = 0.4 + speedRatio * 0.6` tezlik oshgani sari
  //    burilishni KO'PAYTIRARDI. Ya'ni mashina qanchalik tez ketsa,
  //    shunchalik keskin burilardi — 300 km/h da ham joyida aylanib
  //    ketaverardi.
  //
  //  Haqiqiy mashinalarda teskarisi: tezlikda rul burchagi cheklanadi
  //  (speed-sensitive steering) va g'ildirak ilashuvi kamayadi.
  //  Bu yerda maksimal rul burchagi tezlik bilan kamayadi:
  //    turgan joyda   → 100%
  //    yarim tezlikda → ~48%
  //    to'liq tezlikda→ ~31%
  //  Drift rejimida cheklov yumshoqroq — toydirish uchun rul kerak.
  const _spRatio0 = Math.min(1, Math.abs(ud.speed) / Math.max(0.5, maxSpeedMs));
  const steerSpeedLimit = drifting
    ? 1 / (1 + _spRatio0 * 0.8)
    : 1 / (1 + _spRatio0 * 2.2);
  const steerMax = (drifting ? CAR_STEER_MAX * 1.4 : CAR_STEER_MAX) * steerSpeedLimit;
  const steerDir = steerInput;
  ud.steer += steerDir * CAR_STEER_SPD * delta;
  if (steerDir === 0) {
    // Markazga qaytish — frame-rate mustaqil
    const returnPerSec = drifting ? 0.90 : 0.86; // 60fps bazasida
    ud.steer *= Math.pow(returnPerSec, delta / 0.016);
  }
  ud.steer = Math.max(-steerMax, Math.min(steerMax, ud.steer));

  // --- Move & Rotate ---
  const driftAmt   = cfg ? (cfg.driftAmount ?? 0.6) : 0.6;
  const speedRatio = Math.min(1, Math.abs(ud.speed) / Math.max(0.5, maxSpeedMs));

  ud.lateralVel = ud.lateralVel || 0;

  if (Math.abs(ud.speed) > 0.05) {
    // ⚠ Ilgari: `0.4 + speedRatio * 0.6` — tezlik bilan O'SARDI.
    //   Endi past tezlikda manevr uchun biroz yuqori, tezlikda esa
    //   barqaror (o'smaydi). Rul burchagining o'zi yuqorida
    //   `steerSpeedLimit` bilan allaqachon cheklangan.
    const turnFactor = 1.0 - speedRatio * 0.25;
    // Orqaga yurganda burilish teskari bo'lishi kerak
    const reverseSign = ud.speed < 0 ? -1 : 1;
    activeCar.rotation.y -= ud.steer * turnFactor * delta * 3.5 * reverseSign;

    if (drifting) {
      // Yon kuch: burilish + tezlik → yon siljish
      const lateralForce = ud.steer * Math.abs(ud.speed) * driftAmt * delta * 5 * reverseSign;
      ud.lateralVel += lateralForce;

      // ── 🖐 ORQA QISM CHIQISHI (handbrake turn) ───────────────
      //  Qo'l tormozi bosilib RUL BURILGANDA orqa g'ildiraklar
      //  ilashuvni yo'qotadi va mashinaning orqasi tashqariga chiqadi.
      //
      //  ⚠ YO'NALISH RUL BILAN BELGILANADI: chapga bursangiz orqa
      //    O'NGGA chiqadi (va aksincha) — mashina rul tomonga
      //    "burilib ketadi". Ilgari tezlik `*= (1 - delta*2.5)` bilan
      //    "deyarli o'zgarmaydi" deb qoldirilardi; endi sekinlashtirish
      //    yuqoridagi yagona qo'l tormozi blokida.
      //
      //  ⚠ Orqaga yurganda yo'nalish teskari (`reverseSign`) — aks holda
      //    orqaga yurib qo'l tormozini bossangiz mashina noto'g'ri
      //    tomonga aylanardi.
      if (hbTurn) {
        // Rul yo'q bo'lsa mavjud siljish yo'nalishini davom ettiramiz
        const kickDir = ud.steer || (ud.lateralVel > 0 ? 0.3 : ud.lateralVel < 0 ? -0.3 : 0);

        // Orqa g'ildiraklar yon tomonga sirg'anadi
        const rearKick = Math.sign(kickDir) * Math.abs(ud.speed) * driftAmt * 0.55 * reverseSign;
        ud.lateralVel += rearKick;

        // Gavda rul tomonga qo'shimcha buriladi.
        //  `speedRatio` ko'paytmasi — turgan joyda pirillab aylanmasin.
        activeCar.rotation.y -= kickDir * driftAmt * delta * 6 * speedRatio * reverseSign;
      }

      // Drift burchagi: lateral tezlik bo'yicha gavda ham aylanadi (tezlikка bog'liq)
      if (Math.abs(ud.lateralVel) > 0.15) {
        const bodyAngle = ud.lateralVel / Math.max(4, Math.abs(ud.speed)) * driftAmt * delta * 3.5 * speedRatio;
        activeCar.rotation.y += bodyAngle;
      }

      // Yon friksiya (drift da past — ko'proq toyish)
      const latDecay = Math.pow(0.3 + (1 - driftAmt) * 0.65, delta / 0.016);
      ud.lateralVel *= latDecay;
    } else {
      // Grip — yon tezlikni tez nolga tushir
      if (handbrake) ud.speed *= Math.max(0, 1 - delta * 9);
      //  ⚠ ILGARI: `Math.pow(0.02, ...)` — qattiq son. Mashina normal
      //    rejimda relsda yurgandek edi va \"biroz toyadigan\" mashina
      //    yasashning iloji yo'q edi. Endi 🛞 Ilashuv slayderidan:
      //        grip 1.00 → 0.005 (umuman toymaydi)
      //        grip 0.85 → 0.021 (eski standart — mos keladi)
      //        grip 0.00 → 0.70  (muzdek sirg'aladi)
      //  ⚠ CHIZIQLI formula MOS KELMASDI: 0.85 → 0.109, ya'ni mavjud
      //    sahnalardagi mashinalar besh barobar toyib ketardi.
      //    Eksponensial to'g'ri: grip 0.85 → 0.020 (eski qattiq son),
      //    grip 1.00 → 0.011, grip 0.00 → 0.70 (muz).
      const _latKeep = 0.70 * Math.exp(-4.18 * gripCfg);
      ud.lateralVel *= Math.pow(_latKeep, delta / 0.016);
    }
  } else {
    ud.lateralVel *= 0.85;
  }

  // Yon tezlik chegarasi
  const maxLat = Math.abs(ud.speed) * driftAmt * 1.2;
  ud.lateralVel = Math.max(-maxLat, Math.min(maxLat, ud.lateralVel));

  // Harakat: oldinga + yon
  const fwd = new THREE.Vector3(-Math.sin(activeCar.rotation.y), 0, -Math.cos(activeCar.rotation.y));
  const rgt = new THREE.Vector3( Math.cos(activeCar.rotation.y), 0, -Math.sin(activeCar.rotation.y));
  activeCar.position.addScaledVector(fwd, ud.speed * delta);
  activeCar.position.addScaledVector(rgt, ud.lateralVel * delta);

  // --- Ground + 🪜 step-up ---
  //  ⚠ TARTIB: avval to'qnashuv (u step-up bilan ko'tarilgan yer
  //    balandligini qaytaradi), keyin gravitatsiya SHU balandlikka
  //    tushiradi. Ilgari `y < 0.6 → y = 0.6` qattiq yozilgan edi va
  //    mashina to'siq ustiga chiqib bo'lib, keyingi kadr yana polga
  //    tushardi — natijada past to'siqqa ham "yopishib" qolardi.
  const _stepGroundY = _carResolveCollisions(activeCar, ud, delta);
  const _floorY = (_stepGroundY != null) ? _stepGroundY : 0.6;
  if (activeCar.position.y > _floorY) {
    activeCar.position.y -= 9.8 * delta;
    if (activeCar.position.y < _floorY) activeCar.position.y = _floorY;
  } else if (activeCar.position.y < _floorY) {
    activeCar.position.y = _floorY;   // step-up: darhol ko'tar
  }

  // ── 🏔 Qiyalikka moslashish ─────────────────────────────────
  //  ⚠ TARTIB: yer balandligi ANIQLANGANDAN keyin. Avval qo'ysak
  //    gavda o'tgan kadrning balandligiga qarab qiyalashib, bir
  //    kadr orqada qolardi (tepalikda titrash).
  _carApplySlopeTilt(activeCar, cfg, delta);

  // --- Rapier body ni sinxronlash (to'qnashuv ishlashi uchun) ---
  const _carRb = rapierBodies?.get(activeCar);
  if (_carRb) {
    const p = activeCar.position;
    _carRb.rigidBody.setTranslation({ x:p.x, y:p.y, z:p.z }, true);
    const q = activeCar.quaternion;
    _carRb.rigidBody.setRotation({ x:q.x, y:q.y, z:q.z, w:q.w }, true);
    _carRb.rigidBody.setLinvel({ x:0, y:0, z:0 }, false);
    _carRb.rigidBody.setAngvel({ x:0, y:0, z:0 }, false);
  }

  // --- Wheel spin ---
  activeCar.children.forEach(ch => {
    if (ch.userData._wheelIdx !== undefined) {
      ch.rotation.x += ud.speed * delta * 1.5;
      if (ch.userData._wheelIdx < 2) ch.rotation.y = ud.steer;
    }
  });

  ud._moving = Math.abs(ud.speed) > 0.5;
  ud._gear = _currentGear;
  ud._nitroActive = _nitroActive;
  ud._nitroCoolLeft = _nitroCoolTimer;

  // --- Camera ---
  const camCfg = cfg || {};
  const _allow1st = camCfg.camAllow1st !== false;
  const _allow3rd = camCfg.camAllow3rd !== false;
  // Agar faqat biri ruxsat bo'lsa — shu rejimda majburan
  const _effectiveCamMode = (!_allow3rd && _allow1st) ? '1st'
                          : (!_allow1st && _allow3rd) ? '3rd'
                          : (camCfg.camMode || '3rd');
  const camMode1st = carInside && _effectiveCamMode === '1st';

  // ⚠ Kamera boshqa tizimniki bo'lsa — TEGMAYMIZ.
  //   Bu blok har kadr `camera.position`/`lookAt` yozadi va main-loop'da
  //   obyektlar siklidan KEYIN turadi (221 vs ~145). Ya'ni o'yinchi
  //   mashinada turib hitboxga kirsa: cutscene kamerani lerp qiladi,
  //   keyin shu blok uni darrov mashinaga qaytaradi. Natijada kamera
  //   cutscene o'rniga mashinaga qarab, ikki tizim orasida titrardi.
  const _camBusy = (typeof cameraIsOwned === 'function') && cameraIsOwned();

  if (_camBusy) {
    // Kamerani boshqalarga qoldiramiz. Mashina fizikasi ishlayveradi —
    // faqat kamera bloki o'tkazib yuboriladi.
  } else if (camMode1st) {
    // 1-shaxs: kamera mashina ichida — mashina bursa kamera ham buriladi
    const ox  = camCfg.camOffsetX ?? 0;
    const oy  = camCfg.camOffsetY ?? 1.2;
    const oz  = camCfg.camOffsetZ ?? 0.3;
    const carY = activeCar.rotation.y;
    const sin  = Math.sin(carY);
    const cos  = Math.cos(carY);
    // Mashina lokal fazasidagi (ox, oy, oz) → dunyoga aylantirish.
    // ox = yon (right), oy = balandlik (up), oz = oldinga (forward).
    // Car forward vektori = (-sin, 0, -cos), right = (cos, 0, -sin).
    // World offset = ox * right + oy * up + oz * forward.
    // MUHIM: eski kodda Z uchun belgilar noto'g'ri edi — mashina aylantirilganda
    // kamera mashinaning atrofida "aylanardi" (goh orqada, goh oldinda paydo bo'lardi).
    // ============================================================
    //  🏔 KAMERA MASHINA BILAN QIYALASHADI
    // ------------------------------------------------------------
    //  ⚠ Ilgari o'rin faqat `rotation.y` (yo'nalish) bilan
    //    hisoblanardi — mashina qiyalashganda kamera GORIZONTAL
    //    joyda qolardi. Nishabda o'yinchining boshi salon shipidan
    //    chiqib ketardi, tepalikda esa panel ostiga botardi.
    //
    //  Endi o'rin mashinaning TO'LIQ aylanishi bilan aylantiriladi
    //  (`applyQuaternion`), ya'ni kamera haqiqatan salon ichida
    //  \"mahkamlangan\" bo'ladi.
    _camOff.set(ox, oy, oz).applyQuaternion(activeCar.quaternion);
    camera.position.set(
      activeCar.position.x + _camOff.x,
      activeCar.position.y + _camOff.y,
      activeCar.position.z + _camOff.z
    );
    // MUHIM: kamera yaw = mashina rotatsiyasi + mouse offset.
    // Shu tufayli mashina bursa kamera ham avtomatik buriladi (tashqariga chiqmaydi).
    camera.rotation.order = 'YXZ';
    camera.rotation.y = carY + _carCamYawOff;
    //  ⚠ Mashina QIYALIGI kamera burchagiga QO'SHILADI. Sichqoncha
    //    offseti saqlanadi — o'yinchi qiyalikda ham atrofga qaray
    //    oladi, faqat \"nol\" holati mashina bilan birga og'adi.
    //    `tiltToSlope` o'chirilgan bo'lsa mashina burchagi 0 bo'ladi
    //    va bu ifoda o'z-o'zidan eski xulqqa qaytadi — alohida
    //    shart kerak emas.
    camera.rotation.x = _carCamPitchOff + (activeCar.rotation.x || 0);
    camera.rotation.z = (activeCar.rotation.z || 0); // + roll pastda qo'shiladi
  } else {
    // 3-shaxs: kamera fpsYaw (dunyoga nisbatan) — mouse bilan aylantirish
    // Tezlikда: ozgina uzoqlashadi (kamroq) + sal pasayadi + orqada qolmaydi.
    const dist   = (camCfg.cam3rdDist   ?? 6) - speedRatio * 0.4;   // tezlikда oldinga (yaqinroq)
    const height = (camCfg.cam3rdHeight ?? 3) - speedRatio * 0.7;   // sal pasayish
    const camX = activeCar.position.x + Math.sin(fpsYaw) * dist * Math.cos(fpsPitch);
    const camY = activeCar.position.y + height - Math.sin(fpsPitch) * dist;
    const camZ = activeCar.position.z + Math.cos(fpsYaw) * dist * Math.cos(fpsPitch);
    // Tezlikда lerp tezroq — kamera orqada qolib "orqaga ketmasin"
    const camLerp = Math.min(1, delta * (5 + speedRatio * 5));
    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), camLerp);
    camera.lookAt(activeCar.position.clone().add(new THREE.Vector3(0, 1, 0)));
  }

  // ── Tezlikka qarab FOV (60 → 75) ──────────────────────────
  // Katta tezlikda kamera FOV kengayadi — tezlik tuyg'usi kuchayadi.
  const _baseFov = 60, _maxFov = 68;
  const _tgtFov  = _baseFov + (_maxFov - _baseFov) * speedRatio;
  camera.fov += (_tgtFov - camera.fov) * Math.min(1, delta * 3);
  if (!_camBusy) camera.updateProjectionMatrix();

  // ── Rezki burumlarda kamera naklon (roll) ─────────────────
  // O'ngga burilish (steer > 0) → kamera chapga naklon.
  // Faqat harakatda va tezlikga proportsional (tinch turganda tebranmasin).
  const _rollAmt   = 0.18;                                    // max ~10° tilt
  const _tgtRoll   = ud.steer * _rollAmt * speedRatio;
  activeCar.__camRoll = activeCar.__camRoll || 0;
  activeCar.__camRoll += (_tgtRoll - activeCar.__camRoll) * Math.min(1, delta * 5);
  if (_camBusy) {
    // cutscene ketyapti — roll qo'llanmaydi
  } else if (camMode1st) {
    //  ⚠ `=` EMAS, `+=`. Ilgari bu qator kamera roll'ini butunlay
    //    QAYTA YOZARDI. Yuqorida qo'yilgan 🏔 qiyalik burchagi shu
    //    yerda jimgina yo'q qilinardi va salon kamerasi nishabda
    //    baribir gorizontal turardi — tuzatish \"ishlamadi\" bo'lib
    //    ko'rinardi.
    //    Endi burilishdagi naklon qiyalikning USTIGA qo'shiladi.
    camera.rotation.z = (activeCar.rotation.z || 0) + activeCar.__camRoll;
  } else if (Math.abs(activeCar.__camRoll) > 0.001) {
    // 3-shaxs: lookAt dan keyin local Z bo'yicha aylantiramiz (roll)
    camera.rotateZ(activeCar.__camRoll);
  }

  // --- 🔧 G'ildirak / rul / fara animatsiyasi (belgilangan qismlar) ---
  if (typeof applyCarWheels === 'function') applyCarWheels(activeCar, ud.speed || 0, ud.steer || 0, delta, (typeof _headlightOn !== 'undefined') ? _headlightOn : false);

  // --- HUD overlay (tezlik, gear, nitro) ---
  _updateCarHUD(ud, cfg, maxSpeedMs);

  // _car-ptr-hint olib tashlandi
  document.getElementById('_car-ptr-hint')?.remove();

  // --- Chiqish ---
  if (fpsKeys[exitCode] && !_carPrev['_exit']) {
    if (document.pointerLockElement) document.exitPointerLock?.();
    document.getElementById('_car-ptr-hint')?.remove();

    // Eshik tomoni — mashinaning chap yon tomonida (driver eshigi)
    const ry = activeCar.rotation.y;
    const doorOffset = 1.6;
    const doorX = activeCar.position.x - Math.cos(ry) * doorOffset;
    const doorZ = activeCar.position.z + Math.sin(ry) * doorOffset;

    // Sig'imni kamaytirish
    const ud2 = activeCar.userData;
    ud2._occupants = Math.max(0, (ud2._occupants || 1) - 1);
    window.carRole = null;

    // Zamonaviy PlayerController obyektini eshik yoniga ko'chiramiz
    const pObj = (window.PlayerController && PlayerController.obj) ? PlayerController.obj : null;
    if (pObj) {
      pObj.position.set(doorX, PLAYER_HEIGHT, doorZ);
      pObj.visible = true;
      // PlayerController kamera yo'nalishi — mashinaga qarab tursin
      if (typeof PlayerController.camYaw !== 'undefined') {
        PlayerController.camYaw = ry + Math.PI / 2; // mashinaga 90° o'ng
      }
    }

    // Eski playerMesh — agar mavjud bo'lsa (legacy fallback)
    if (playerMesh && playerMesh.visible !== undefined) {
      playerMesh.position.set(doorX, PLAYER_HEIGHT, doorZ);
      playerVel?.set(0, 0, 0);
      playerMesh.visible = true;
    }
    if (typeof animateCarDoors === 'function' && activeCar) animateCarDoors(activeCar, false);   // eshiklar yopiladi
    activeCar = null; carInside = false; _nitroActive = false;
    _currentGear = 3; _driftActive = false; _sportActive = false;
    // Kamera FOV va roll ni asl holatga qaytar
    if (camera && camera.fov !== 60) {
      camera.fov = 60;
      camera.updateProjectionMatrix();
    }
    camera.rotation.z = 0;
    setCamMode('fps'); // FPS modida qoladi — oyinchi yurishda davom etadi
    _driftActive=false; _sportActive=false;
    document.getElementById('_car-hud')?.remove();
    setCamMode('orbit');
    log('🚗 Mashinadan chiqdingiz','lw');

    // Tugma hali bosilib turibdi — qayta kirib ketmasin uchun proximity prev'larni yoqamiz
    _carPrev['_enterPrev'] = true;
    _carPrev['_passPrev']  = true;
  }
  _carPrev['_exit'] = fpsKeys[exitCode];
  _carPrev['KeyQ'] = fpsKeys['KeyQ'];

  // Kamera rejimi almashtirish (V yoki camSwitchKey)
  const _swKey = cfg ? (cfg.camSwitchKey || 'KeyV') : 'KeyV';
  const _can1  = cfg ? cfg.camAllow1st !== false : true;
  const _can3  = cfg ? cfg.camAllow3rd !== false : true;
  if (fpsKeys[_swKey] && !_carPrev[_swKey] && _can1 && _can3) {
    const curMode = cfg ? (cfg.camMode || '3rd') : '3rd';
    const newMode = curMode === '1st' ? '3rd' : '1st';
    if (cfg) cfg.camMode = newMode;
    // Kamera offsetlarni tiklash — yangi rejimda kamera to'g'ri joyda tursin
    _carCamYawOff = 0;
    _carCamPitchOff = newMode === '1st' ? 0 : -0.25;
    // fpsYaw / fpsPitch — legacy compat (kamera kodi endi ulardan foydalanmaydi)
    fpsYaw   = activeCar.rotation.y + (newMode === '1st' ? 0 : Math.PI);
    fpsPitch = _carCamPitchOff;
    log('🎥 ' + (newMode === '1st' ? '1-shaxs' : '3-shaxs') + ' kamera', 'lok');
  }
  _carPrev[_swKey] = fpsKeys[_swKey];
}

function _updateCarHUD(ud, cfg, maxSpeedMs) {
  let hud = document.getElementById('_car-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = '_car-hud';
    hud.style.cssText = `position:fixed;bottom:90px;right:18px;z-index:9990;
      background:rgba(0,0,0,.72);border:1px solid rgba(0,180,255,.35);border-radius:8px;
      padding:10px 14px;font-family:'Share Tech Mono',monospace;color:#00b4ff;
      min-width:180px;backdrop-filter:blur(4px);pointer-events:none;user-select:none`;
    document.body.appendChild(hud);
  }
  const kmh = Math.abs(ud.speed * 3.6).toFixed(0);
  const maxKmh = cfg ? cfg.maxSpeed : Math.round(maxSpeedMs*3.6);
  const gears    = cfg ? cfg.gears : 6;
  const gearLbl  = _gearLabel(_currentGear);
  const driveNum = _currentGear - 3;
  const gearColor = _currentGear <= 1 ? '#ff4444'   // P — qizil
                  : _currentGear === 2 ? '#ffaa00'  // R — sariq
                  : _currentGear === 3 ? '#888'      // N — kulrang
                  : 'var(--accent)';                        // D — ko'k
  const nitroBar = cfg ? Math.max(0, (_nitroActive ? _nitroTimer/cfg.nitroDuration : (_nitroCoolTimer>0?0:1))) : 1;
  const nitroPct = Math.round(nitroBar*100);
  const driftStr = _driftActive?`<span style="color:var(--accent4)"> 🌀DRIFT ${ud.lateralVel?Math.min(100,Math.round(Math.abs(ud.lateralVel)/Math.max(0.01,maxSpeedMs*(cfg?.driftAmount??0.6)*1.2)*100))+'%':''}</span>`:'';
  const sportStr = _sportActive?'<span style="color:#ffcc00"> 🏁SPORT</span>':'';
  const headStr  = _headlightOn?'<span style="color:#ffee66"> 💡</span>':'';

  hud.innerHTML = `
    <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-1px;line-height:1">${kmh} <span style="font-size:10px;color:#00b4ff">km/h</span></div>
    <div style="font-size:9px;color:#445;margin:2px 0 4px">MAX: ${maxKmh} km/h</div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="font-size:9px;color:var(--muted)">GEAR</span>
      <span style="font-size:20px;font-weight:900;color:${gearColor};min-width:22px;text-align:center">${gearLbl}</span>
      ${driveNum > 0 ? `<span style="font-size:8px;color:#334">/ ${gears}</span>` : ''}
    </div>
    <div style="margin-bottom:3px">
      <div style="font-size:8px;color:${_nitroActive?'var(--accent3)':(_nitroCoolTimer>0?'#ff4444':'#556')};margin-bottom:2px">
        ⚡ NITRO ${_nitroActive?'AKTIV':(_nitroCoolTimer>0?Math.ceil(_nitroCoolTimer)+'s kutish':'TAYYOR')}
      </div>
      <div style="background:#111;border-radius:2px;height:4px;overflow:hidden">
        <div style="height:100%;width:${nitroPct}%;background:${_nitroActive?'var(--accent3)':(_nitroCoolTimer>0?'#ff4444':'#00b4ff')};transition:width .1s"></div>
      </div>
    </div>
    <div style="font-size:9px;margin-top:3px">${driftStr}${sportStr}${headStr}</div>
    ${ud.fuel!==undefined?`<div style="font-size:8px;color:#445;margin-top:2px">⛽ ${Math.round(ud.fuel??100)}%</div>`:''}
  `;
}


function tryEnterCar(targetCar, role) {
  if (!isPlaying) return;
  role = role || 'driver';

  //  🌐 BOSHQA O'YINCHI o'tirgan bo'lsa — kirmaymiz.
  //  ⚠ Busiz ikki o'yinchi bitta rulga o'tirardi va mashina ikki
  //    tomonga tortilardi: har biri o'z mijozida haydab, joylashuv
  //    xabarlari bir-birini bekor qilardi.
  //  ⚠ Yakka o'yinda `busy()` DOIM `false` — tekshiruv hech nimaga
  //    xalaqit bermaydi.
  try {
    if (targetCar && window.MultiplayerSystem && MultiplayerSystem.busy &&
        MultiplayerSystem.busy(targetCar)) {
      if (typeof log === 'function') log('🌐 Mashina band — boshqa o\'yinchi ichida', 'lw');
      return;
    }
  } catch (e) {}

  const doEnter = (car) => {
    // Sig'imni tekshirish — to'la bo'lsa jim qaytariladi
    const cfg = window._getCarCfg?.(car);
    const cap = cfg ? (cfg.capacity || 4) : 4;
    const occ = car.userData._occupants || 0;
    if (occ >= cap) return;
    car.userData._occupants = occ + 1;

    // Rolni saqlash — yo'lovchi haydovchidan farqli, boshqaruvi yo'q
    window.carRole = role;

    activeCar = car; carInside = true;
    // Eshiklar ochiladi (belgilangan bo'lsa), so'ng 1.2s dan keyin yopiladi
    if (typeof animateCarDoors === 'function') {
      animateCarDoors(car, true);
      setTimeout(() => { if (activeCar === car && typeof animateCarDoors === 'function') animateCarDoors(car, false); }, 1200);
    }
    _currentGear = 3; _nitroActive = false; _nitroCoolTimer = 0;
    _driftActive = false; _sportActive = false;
    const _eCamMode = cfg ? (cfg.camMode || '3rd') : '1st';
    // Kamera offsetlarini nolga qaytar — kamera darhol mashinaga qarab tursin
    _carCamYawOff   = 0;
    _carCamPitchOff = _eCamMode === '1st' ? 0 : -0.25;
    // fpsYaw / fpsPitch — legacy compat uchun
    fpsYaw   = car.rotation.y + (_eCamMode === '1st' ? 0 : Math.PI);
    fpsPitch = _carCamPitchOff;
    setCamMode('fps');
    const _eCv = document.getElementById('three-canvas') || canvas;
    if (_eCv) setTimeout(()=>{ _eCv.requestPointerLock?.(); }, 80);
    if (playerMesh) playerMesh.visible = false;
    if (window.PlayerController && PlayerController.obj) {
      PlayerController.obj.visible = false;
    }
    const lbl = role === 'passenger' ? '🧍 yo\'lovchi sifatida' : '🚗 haydovchi sifatida';
    log(`${lbl} ${car.userData.name} ga o'tirdingiz`, 'lok');

    // Tugma hali bosilib turibdi — bitta press = bitta harakat.
    // Bu prev flag'larni yoqamiz, shunda fpsKeys[Enter]=true bo'lsa ham
    // rising edge yangi press kelguncha tetiklanmaydi (darhol chiqib ketmaydi).
    _carPrev['_exit']       = true;
    _carPrev['_enterPrev']  = true;
    _carPrev['_passPrev']   = true;
  };

  if (targetCar) { doEnter(targetCar); return; }
  if (!playerMesh) return;
  let nearest = null, nearDist = 999;
  objects.forEach(o => {
    if (o.userData.entityType !== 'car' && o.userData._entityMode !== 'vehicle') return;
    const cfg = window._getCarCfg ? window._getCarCfg(o) : null;
    const maxDist = cfg ? cfg.enterDistance : 3.5;
    const d = playerMesh.position.distanceTo(o.position);
    if (d < maxDist && d < nearDist) { nearDist = d; nearest = o; }
  });
  if (nearest) doEnter(nearest);
}
