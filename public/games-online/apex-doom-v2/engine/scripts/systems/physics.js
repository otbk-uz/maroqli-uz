// ============================================================
// PHYSICS SYSTEM (simple)
// ============================================================
let physicsEnabled = true;
// ============================================================
// RAPIER PHYSICS SYSTEM — WASM based real physics
// ============================================================
const physBodies = [];
let rapierWorld = null;
let rapierBodies = new Map(); // mesh -> {rigidBody, collider}
let _rapierInitDone = false;
let _physAccum = 0;   // qat'iy qadam uchun to'plangan vaqt

// Rapier tayyor bo'lganda world yaratish
function initRapierWorld() {
  if (!window.RAPIER || _rapierInitDone) return;
  _rapierInitDone = true;
  const R = window.RAPIER;
  rapierWorld = new R.World({ x: 0, y: -9.81, z: 0 });

  // ── 🧱 USTMA-UST TURISH BARQARORLIGI ─────────────────────────
  //  Rapier standarti `maxVelocityIterations = 4`. Bir-birining ustida
  //  turgan bir necha jism uchun bu kamlik qiladi: pastdagilar sekin
  //  siljib, minora "oqib" ketadi. 8 ga oshirsak minora turg'un bo'ladi
  //  (o'lchov: 4 qavatli minora 600 qadamdan keyin ham joyida).
  //
  //  ⚠ `erp` (0.8) ga TEGMAYMIZ. Uni pasaytirish "ichma-ich tushib
  //    ketish" muammosini yumshatadigandek tuyuladi, lekin aslida
  //    BUZADI: o'lchovda erp=0.1 da oddiy ikki quti orasidagi masofa
  //    1.0 o'rniga 0.49 ga tushdi — ya'ni jismlar bir-biriga botib
  //    qoldi. Chuqurlik tuzatilmay qolgani uchun.
  try { rapierWorld.integrationParameters.maxVelocityIterations = 8; } catch (e) {}

  // Yerga static collider qo'shish
  const groundDesc = R.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
  const groundBody = rapierWorld.createRigidBody(groundDesc);
  const groundCollider = rapierWorld.createCollider(
    R.ColliderDesc.cuboid(100, 0.01, 100), groundBody
  );

  log('⚡ Rapier Physics v0.11 — WASM initialized', 'lok');

  // Mavjud physBodies ni Rapier ga ko'chirish
  physBodies.forEach(b => _addRapierBody(b));
}

// ============================================================
//  📦 _localHalfExtents — jismning O'Z fazosidagi yarim o'lchami
//
//  ⚠ NEGA `Box3.setFromObject` YETARLI EMAS: u DUNYO fazosidagi
//    o'qlarga parallel qutini (AABB) qaytaradi. Jism aylantirilgan
//    bo'lsa, bu quti haqiqiy jismdan KATTA bo'ladi — masalan 45°
//    burilgan 1×1 kub uchun AABB 1.41×1.41. Natijada:
//       • jismlar bir-birining ustida MUALLAQ turadi,
//       • yon tomondan ko'rinmas devor paydo bo'ladi,
//       • ustiga qo'yilgan narsa sirg'alib tushadi.
//
//    Shuning uchun o'lchov LOKAL fazoda olinadi va dunyo MASSHTABIGA
//    ko'paytiriladi. Aylanish esa tananing o'ziga beriladi
//    (`setRotation`) — Rapier kollayderni birga buradi.
//
//  ⚠ Gizmo bolalari (og'irlik markazi kubchasi, suyak markerlari,
//    hitbox to'ldirmasi) hisobga OLINMAYDI — aks holda kollayder
//    ular tufayli kattalashib ketardi.
// ============================================================
/** Jurnalga yozish — `log` hali yuklanmagan bo'lsa yiqilmaydi. */
function _plog(m, c) { try { if (typeof log === 'function') log(m, c); } catch (e) {} }

const _PHYS_SKIP_CHILD = o => {
  const u = o && o.userData;
  return !!(u && (u.__noSave || u._noSave || u._isCom || u._pathGizmo)) ||
         (o && (o.name === '__bm__' || o.name === '__bh__')) ||
         (o && o.isLine) || (o && o.type === 'SkeletonHelper');
};

function _localBox(mesh) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  let has = false;

  const addGeo = (o, mat) => {
    if (!o.geometry) return;
    if (!o.geometry.boundingBox) { try { o.geometry.computeBoundingBox(); } catch (e) { return; } }
    const bb = o.geometry.boundingBox;
    if (!bb) return;
    // Sakkiz burchakni jismning LOKAL fazosiga ko'chiramiz
    for (let k = 0; k < 8; k++) {
      v.set(k & 1 ? bb.max.x : bb.min.x,
            k & 2 ? bb.max.y : bb.min.y,
            k & 4 ? bb.max.z : bb.min.z);
      if (mat) v.applyMatrix4(mat);
      box.expandByPoint(v); has = true;
    }
  };

  addGeo(mesh, null);
  if (mesh.children && mesh.children.length) {
    mesh.updateWorldMatrix(false, true);
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    mesh.traverse(ch => {
      if (ch === mesh || _PHYS_SKIP_CHILD(ch) || !ch.geometry) return;
      addGeo(ch, new THREE.Matrix4().multiplyMatrices(inv, ch.matrixWorld));
    });
  }
  if (!has) box.set(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5));
  return box;
}

// ============================================================
//  🧊 KOLLAYDER SHAKLI — obyektga MOS keladigan shakl
// ------------------------------------------------------------
//  ⚠ MUAMMO: `addPhysicsBody` HECH QAYERDA `shape` ni uzatmasdi
//    (18 ta chaqiruv joyi tekshirildi). Ya'ni `opts.shape || 'cuboid'`
//    tufayli SAHNADAGI HAMMA NARSA — shar, konus, silindr, GLB
//    model — to'rtburchak quti kollayder olardi.
//
//    Alomatlari aynan foydalanuvchi aytgani: shar dumalamaydi,
//    konusning uchi bo'sh joyni to'sadi, murakkab model qutidek
//    urishadi. \"Ko'rinishi boshqa, urilishi boshqa.\"
//
//  Endi shakl uch manbadan, shu tartibda:
//    1. `ud.colShape` — inspektorda qo'lda tanlangan (eng kuchli)
//    2. `opts.shape`  — chaqiruvchi ataylab bergan
//    3. AVTOMATIK — `ud.type` va geometriyadan aniqlanadi
//
//  ⚠ NEGA `convex` STANDART EMAS: convex hull aniqroq, lekin
//    Rapier uni har tanada qayta hisoblaydi va yuzlab vertexli
//    modelda bu sezilarli. Standart — tez va bashorat qilinadigan
//    quti; aniqlik kerak bo'lganda inspektordan yoqiladi.
// ============================================================
const _COL_BY_TYPE = {
  'Sfera': 'sphere', 'Shar': 'sphere', 'Sphere': 'sphere',
  'Silindr': 'cylinder', 'Cylinder': 'cylinder', 'Truba': 'cylinder',
  'Konus': 'cone', 'Cone': 'cone',
  'Kapsula': 'capsule', 'Capsule': 'capsule',
  'Kub': 'cuboid', 'Box': 'cuboid', 'Tekislik': 'cuboid', 'Plane': 'cuboid',
};

/** Geometriya turidan shakl (tip yozilmagan/import qilingan obyektlar uchun). */
function _colShapeFromGeo(mesh) {
  const g = mesh && mesh.geometry;
  const n = g && (g.type || '');
  if (/Sphere/i.test(n))   return 'sphere';
  if (/Cylinder/i.test(n)) return 'cylinder';
  if (/Cone/i.test(n))     return 'cone';
  if (/Capsule/i.test(n))  return 'capsule';
  return 'cuboid';
}

/**
 * Tanaga qanday kollayder kerak.
 * @returns {'cuboid'|'sphere'|'cylinder'|'cone'|'capsule'|'convex'}
 */
function resolveColliderShape(b) {
  const ud = (b.mesh && b.mesh.userData) || {};
  //  ⚠ `auto` — ataylab tanlangan \"o'zi aniqlasin\", ya'ni qo'lda
  //    tanlov EMAS. Uni shakl deb qabul qilsak avtomatika o'chib
  //    qolardi.
  if (ud.colShape && ud.colShape !== 'auto') return ud.colShape;
  if (b.shape && b.shape !== 'auto') return b.shape;
  const byType = _COL_BY_TYPE[ud.type];
  if (byType) return byType;
  return _colShapeFromGeo(b.mesh);
}

// ============================================================
//  🔷 _convexPoints — convex hull uchun nuqtalar
// ------------------------------------------------------------
//  ⚠ Nuqtalar LOKAL fazoda olinadi va dunyo MASSHTABIGA
//    ko'paytiriladi — aylanish tananing o'zida (`setRotation`).
//    Aks holda hull ikki marta aylantirilib, ko'rinishdan
//    ajralib ketardi.
//
//  ⚠ Vertex soni cheklangan: 5000 dan ko'p bo'lsa qadam tashlab
//    olinadi. Rapier hullni O(n log n) quradi, lekin 200k vertexli
//    model sahna yuklanishini soniyalarga cho'zardi.
// ============================================================
const _CONVEX_MAX = 5000;
function _convexPoints(mesh, ws) {
  const out = [];
  let total = 0;
  const metas = [];
  const collect = (o, mat) => {
    const pos = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) return;
    metas.push({ pos, mat }); total += pos.count;
  };
  collect(mesh, null);
  if (mesh.children && mesh.children.length) {
    mesh.updateWorldMatrix(false, true);
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    mesh.traverse(ch => {
      if (ch === mesh || _PHYS_SKIP_CHILD(ch) || !ch.geometry) return;
      collect(ch, new THREE.Matrix4().multiplyMatrices(inv, ch.matrixWorld));
    });
  }
  if (!total) return null;
  const step = Math.max(1, Math.ceil(total / _CONVEX_MAX));
  const v = new THREE.Vector3();
  for (const m of metas) {
    for (let i = 0; i < m.pos.count; i += step) {
      v.fromBufferAttribute(m.pos, i);
      if (m.mat) v.applyMatrix4(m.mat);
      out.push(v.x * ws.x, v.y * ws.y, v.z * ws.z);
    }
  }
  return out.length >= 12 ? new Float32Array(out) : null;   // kamida 4 nuqta
}

function _addRapierBody(b) {
  if (!rapierWorld || !window.RAPIER) return;
  const R = window.RAPIER;

  // ⚠ DUNYO transformi. Ilgari `b.mesh.position` — LOKAL pozitsiya —
  //   ishlatilardi. Papka/prefab/kub ichidagi jism uchun u dunyo
  //   koordinatasi EMAS, ya'ni fizika tanasi butunlay boshqa joyda
  //   paydo bo'lardi.
  b.mesh.updateWorldMatrix(true, false);
  const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
  b.mesh.matrixWorld.decompose(wp, wq, ws);

  let rbDesc;
  if (b.isStatic) {
    rbDesc = R.RigidBodyDesc.fixed();
  } else {
    rbDesc = R.RigidBodyDesc.dynamic()
      .setLinearDamping(0.05)
      .setAngularDamping(0.3);
  }
  rbDesc.setTranslation(wp.x, wp.y, wp.z);
  if (rbDesc.setRotation) rbDesc.setRotation({ x: wq.x, y: wq.y, z: wq.z, w: wq.w });
  const rb = rapierWorld.createRigidBody(rbDesc);

  // ── Kollayder o'lchami: LOKAL quti × dunyo masshtabi ──
  const lb   = _localBox(b.mesh);
  const size = lb.getSize(new THREE.Vector3());
  const ctr  = lb.getCenter(new THREE.Vector3());
  const sx = Math.abs(ws.x), sy = Math.abs(ws.y), sz2 = Math.abs(ws.z);
  const hx = Math.max(size.x * sx / 2, 0.02);
  const hy = Math.max(size.y * sy / 2, 0.02);
  const hz = Math.max(size.z * sz2 / 2, 0.02);

  let vol;   // kollayder hajmi — zichlikni massadan hisoblash uchun
  // ── ⚠ `??` — `||` EMAS ────────────────────────────────────────
  //  Ilgari bu yerda `b.restitution || 0.5` turardi. JS da `0 || 0.5`
  //  → `0.5`. Ya'ni inspektorda "Sakrash" slayderini NOLGA qo'ysangiz
  //  qiymat jimgina 0.5 ga qaytardi — sakrashni O'CHIRISHNING ILOJI
  //  YO'Q edi. Aynan shu sabab jism yerga qo'yilganda qo'ltopiday
  //  sapchirdi. Ishqalanish (`friction 0`) ham xuddi shunday yo'qolardi.
  const _rest = b.restitution ?? 0.15;
  const _fric = b.friction ?? 0.8;
  const shape = resolveColliderShape(b);
  let desc = null;

  if (shape === 'convex') {
    // ── 🔷 ANIQ (convex hull) ─────────────────────────────────
    //  Ko'rinishning haqiqiy qirralari bo'yicha. Qiya qo'yilgan
    //  konus, nishab tom, murakkab model uchun yagona to'g'ri yo'l.
    const pts = _convexPoints(b.mesh, ws);
    if (pts && R.ColliderDesc.convexHull) {
      try { desc = R.ColliderDesc.convexHull(pts); } catch (e) { desc = null; }
    }
    //  ⚠ Hull qurilmasa (tekis/degenerativ geometriya) — JIM qolmaymiz.
    //    Ilgari shunga o'xshash holatlar sababsiz \"fizika yo'q\" bo'lib
    //    ko'rinardi. Endi qutiga tushamiz va sababini yozamiz.
    if (!desc) {
      _plog(`⚠ \"${b.mesh.userData?.name || 'obyekt'}\" — aniq kollayder qurilmadi, quti ishlatildi`, 'lw');
    }
  }

  if (!desc && shape === 'sphere') {
    const r = b.radius || Math.max(hx, hy, hz);
    desc = R.ColliderDesc.ball(r);
    vol = (4 / 3) * Math.PI * r * r * r;
  } else if (!desc && shape === 'cylinder') {
    const r = Math.max(hx, hz);
    desc = R.ColliderDesc.cylinder(hy, r);
    vol = Math.PI * r * r * (2 * hy);
  } else if (!desc && shape === 'cone') {
    //  ⚠ Konusning hajmi qutinikidan 3× kichik. Zichlik massadan
    //    hisoblangani uchun (ρ = m / V) noto'g'ri hajm massani
    //    uch barobar buzardi.
    const r = Math.max(hx, hz);
    if (R.ColliderDesc.cone) desc = R.ColliderDesc.cone(hy, r);
    vol = (1 / 3) * Math.PI * r * r * (2 * hy);
  } else if (!desc && shape === 'capsule') {
    const r = Math.max(hx, hz);
    //  ⚠ Rapier kapsulasida `halfHeight` — SILINDR qismi, yarim sharlar
    //    ustiga qo'shiladi. To'g'ridan `hy` bersak kapsula radius bo'yi
    //    uzun chiqardi.
    const hh = Math.max(0.01, hy - r);
    if (R.ColliderDesc.capsule) desc = R.ColliderDesc.capsule(hh, r);
    vol = Math.PI * r * r * (2 * hh) + (4 / 3) * Math.PI * r * r * r;
  }

  if (!desc) {                       // 'cuboid' va hamma zaxira yo'llar
    desc = R.ColliderDesc.cuboid(hx, hy, hz);
    vol = 8 * hx * hy * hz;
  } else if (shape === 'convex') {
    //  Hull hajmini aniq hisoblash qimmat — quti hajmining ~55% i
    //  yaxshi yaqinlashish (kub uchun 100%, sfera uchun 52%).
    vol = 8 * hx * hy * hz * 0.55;
  }
  desc.setRestitution(_rest).setFriction(_fric);
  b._shapeUsed = shape;

  // ── ⚖️ MASSA: inspektordagi kg = HAQIQIY massa ───────────────
  //  ⚠ Ilgari massa Rapier'ga UMUMAN uzatilmasdi. `addPhysicsBody({mass})`
  //    uni faqat legacy yozuvida saqlardi, tana esa kollayderning
  //    standart zichligidan (1.0 × hajm) massa olardi. Ya'ni inspektorda
  //    "5 kg" yozilgan kub aslida hajmiga qarab butunlay boshqa massada
  //    edi — og'irlik markazi, turtish va ko'tarish cheklovlari
  //    (gravity gun) shu sababli noto'g'ri ishlardi.
  //
  //  Zichlik massadan hisoblanadi: ρ = m / V. Nega `setAdditionalMass`
  //  emas: u massani qo'shadi, lekin AYLANISH INERSIYASINI qo'shmaydi —
  //  jism nolga yaqin inersiya bilan aqldan ozgandek aylanardi.
  if (!b.isStatic && vol > 1e-9 && desc.setDensity) {
    desc.setDensity(Math.max(1e-4, (b.mass || 1) / vol));
  }
  vol = vol || 1;

  // ⚠ Geometriya markazi koordinata boshida bo'lmasligi mumkin
  //   (GLB modellar, guruhlar). Kollayderni o'sha markazga suramiz —
  //   aks holda ko'rinish bilan fizika bir-biriga tushmaydi va jism
  //   "yerga botib" yoki "havoda muallaq" turadi.
  const cx = ctr.x * ws.x, cy = ctr.y * ws.y, cz = ctr.z * ws.z;
  if (desc.setTranslation && (Math.abs(cx) > 1e-4 || Math.abs(cy) > 1e-4 || Math.abs(cz) > 1e-4)) {
    desc.setTranslation(cx, cy, cz);
  }

  const col = rapierWorld.createCollider(desc, rb);
  rapierBodies.set(b.mesh, { rigidBody: rb, collider: col, legacy: b, volume: vol });
}

// ============================================================
//  ♻️ rebuildRapierBody / syncAllPhysicsToMeshes
//
//  ⚠ MUAMMO: Rapier tanasi obyekt YARATILGANDA bir marta quriladi va
//    keyin unutiladi. Muharrirda gizmo bilan obyektni surganingizda,
//    burganingizda yoki CHO'ZGANINGIZDA mesh o'zgaradi — tana esa eski
//    joyida, eski o'lchamida qolaveradi.
//
//    ▶ O'YNA bosilganda `updatePhysics` mesh'ni tananing eski holatiga
//    QAYTA YOZADI. Foydalanuvchi ko'rgan alomat aynan shu edi:
//    ehtiyotlab ustma-ust terilgan qutilar o'yin boshlanishi bilan
//    joyidan sakrab, bir-birining ICHIGA tushib ketardi.
//
//    Cho'zilgan obyektda yana battar: kollayder eski o'lchamda qolgani
//    uchun 3× kattalashtirilgan kub 1× kollayder bilan yurardi —
//    ko'rinishning uchdan ikki qismi hech nimaga tegmasdi.
//
//  Yechim: ▶ Play bosilganda hamma tana mesh'ning JORIY holatidan
//  qayta quriladi. Kollayder o'lchami ham qaytadan hisoblanadi.
// ============================================================
function rebuildRapierBody(mesh) {
  if (!rapierWorld || !mesh) return false;
  const b = physBodies.find(x => x.mesh === mesh);
  if (!b) return false;
  const rec = rapierBodies.get(mesh);
  if (rec) {
    try { rapierWorld.removeRigidBody(rec.rigidBody); } catch (e) {}
    rapierBodies.delete(mesh);
  }
  _addRapierBody(b);
  return true;
}
window.rebuildRapierBody = rebuildRapierBody;

/** ▶ Play boshlanganda: har bir tanani mesh'ning joriy holatiga keltiradi. */
function syncAllPhysicsToMeshes() {
  if (!rapierWorld) return 0;
  let n = 0;
  for (const b of physBodies.slice()) {
    if (!b.mesh || !b.mesh.parent) continue;
    if (rebuildRapierBody(b.mesh)) n++;
  }
  return n;
}
window.syncAllPhysicsToMeshes = syncAllPhysicsToMeshes;

function addPhysicsBody(mesh, opts={}) {
  const body = {
    mesh,
    vel: new THREE.Vector3(0,0,0),
    angVel: new THREE.Vector3(0,(Math.random()-.5)*0.5,0),
    mass: opts.mass || 1,
    // ⚖️ Standart sakrash 0.5 dan 0.15 ga tushirildi. O'lchov (haqiqiy
    //    Rapier): 1.2 m dan tushgan quti 0.5 da SAKRAB 0.60 s da tinchidi,
    //    0.15 da esa UMUMAN sakramay 0.43 s da o'tirdi. 5 m dan tushsa
    //    0.15 da ham bitta kichik sakrash qoladi — ya'ni balandlikka
    //    qarab, tabiiy. Kerak bo'lsa inspektordan oshirish mumkin.
    restitution: opts.restitution ?? 0.15,
    friction: opts.friction ?? 0.8,
    isStatic: opts.isStatic || false,
    radius: opts.radius || 0.5,
    //  ⚠ Standart 'cuboid' EMAS, 'auto'. Ilgari bu yerda 'cuboid'
    //    turardi va u `resolveColliderShape` da qo'lda tanlov deb
    //    qabul qilinardi — ya'ni avtomatika HECH QACHON ishga
    //    tushmasdi va shar ham quti kollayder olardi.
    shape: opts.shape || 'auto',
  };
  physBodies.push(body);

  // Rapier tayyor bo'lsa — darhol qo'shish
  if (rapierWorld) _addRapierBody(body);

  return body;
}

// ============================================================
//  ⚖️ physicsOptsFor — yuklangan obyektga QANDAY fizika berilishi
//
//  ⚠ MUAMMO: yuklash yo'lining oxirida shunchaki `addPhysicsBody(_placed)`
//    turardi — sozlamasiz. `addPhysicsBody` da standart `isStatic: false`,
//    ya'ni har bir yuklangan obyekt DINAMIK tana olardi va ▶ O'YNA
//    bosilganda yerga qulardi. Kamera YARATILGANDA `{isStatic:true}`
//    olardi, YUKLANGANDA esa dinamik — tizim o'zi bilan ziddiyatda edi.
//
//  Qoida endi `SceneTypes` ro'yxatida — saqlash, yuklash va prefab
//  uchun BITTA manba. Bu funksiya faqat unga murojaat qiladi.
//  (`SceneTypes` hali yuklanmagan bo'lsa — zaxira qoida ishlaydi.)
// ============================================================
// ============================================================
//  🧱 QATTIQ FUNKSIONAL BLOKLAR
// ------------------------------------------------------------
//  ⚠ MUAMMO: 🔘 tugma, 🔢 qulf, 💻 PC, 📝 matn va 🔊 ovoz
//    bloklari `SceneTypes` da `physics: null` bilan turadi — ya'ni
//    ularda KOLLAYDER UMUMAN YO'Q. Natijada boshqa fizik jism
//    (tashlangan quti, dumalagan shar, mashina) ular ICHIDAN
//    o'tib ketardi: tugma stol ustida turgandek ko'rinsa ham
//    aslida hech narsani to'smasdi.
//
//  ⚠ NEGA `physics: null` O'ZGARTIRILMADI: u boshqa ma'noni ham
//    bildiradi — \"bu DINAMIK jism EMAS\". 🔫 Gravitatsiya quroli
//    aynan shundan \"funksional blok\" degan xulosa chiqaradi va uni
//    ko'tarishni rad etadi. O'zgartirsak tugmalarni ko'tarib
//    ketish mumkin bo'lardi.
//
//  Shuning uchun bu yerda AYRIM yo'l: blok QO'ZG'ALMAS kollayder
//  oladi. U o'zi harakatlanmaydi (statik), lekin boshqalar unga
//  uriladi — aynan kutilgan xulq.
//
//  ⚠ `colliderMode` HURMAT QILINADI: dizayner 👻 `inline` qilgan
//    blok o'tkazuvchi bo'lib qoladi. Bu bayroq ilgari faqat
//    O'YINCHI to'qnashuvini boshqarardi; endi jism-jism fizikasi
//    ham xuddi shu qoidaga bo'ysunadi — ikki xil xulq bo'lmaydi.
// ============================================================
function physicsOptsFor(obj) {
  const _ud = (obj && obj.userData) || {};
  //  ⚠ Ro'yxat funksiya ICHIDA: `test-load-physics.js` bu funksiyani
  //    fayldan ajratib olib, alohida yuritadi. Tashqi `const` ga
  //    tayansak u yerda `ReferenceError` berardi — ya'ni test emas,
  //    yozilish usuli aybdor bo'lardi.
  const _solid = !!(_ud.isInteractiveBtn || _ud.isMiniPad || _ud.isPCBlock ||
                    _ud.isTextBlock || _ud.isSoundBlock || _ud.isNoScript);
  //  ⚠ Reyestrdan OLDIN: `SceneTypes` `null` qaytaradi va u yerda
  //    `colliderMode` ni hisobga oladigan joy yo'q.
  //    ⚠ 🎯 Hitbox va 🗺 map loader ATAYLAB chetda: ular ta'rifan
  //      o'tkazuvchi hududlar, qattiq qilsak o'yinchi ularga
  //      kirolmay qolardi.
  if (_solid && _ud.colliderMode !== 'inline') return { isStatic: true };

  if (window.SceneTypes && typeof SceneTypes.physicsFor === 'function')
    return SceneTypes.physicsFor(obj);

  // ── Zaxira (scene-types.js yuklanmagan holat) ──
  const ud = _ud;
  if (ud.isPCBlock || ud.isPCCam || ud.isInteractiveBtn || ud.isGazeTrigger ||
      ud.isTextBlock || ud.isSoundBlock || ud.isMapLoader || ud.isHitbox ||
      ud.isSpawn || ud.isPath || ud.isPathShape ||
      ud.isMiniPad || ud.isNoScript || ud.isFragment) return null;
  if (ud.isCamera) return { isStatic: true, radius: 0.4 };
  if (ud.isGLB || ud.isGLTF || ud.isStatic) return { isStatic: true };
  if (ud._savedPhys) return ud._savedPhys;
  return {};
}
window.physicsOptsFor = physicsOptsFor;

function removeRapierBody(mesh) {
  // physBodies dan har doim o'chir — Rapier yuklanmagan bo'lsa ham
  const idx = physBodies.findIndex(b => b.mesh === mesh);
  if (idx !== -1) physBodies.splice(idx, 1);

  // Rapier dan o'chir
  if (rapierWorld) {
    const rb = rapierBodies.get(mesh);
    if (rb) {
      try { rapierWorld.removeCollider(rb.collider, false); } catch(e) {}
      try { rapierWorld.removeRigidBody(rb.rigidBody); } catch(e) {}
    }
  }
  rapierBodies.delete(mesh);
}

// ============================================================
//  🌍→📁 _applyWorldPose — DUNYO holatini LOKAL ga o'girib yozadi
// ------------------------------------------------------------
//  ⚠ MUAMMO: Rapier har doim DUNYO koordinatasini qaytaradi, kod esa
//    uni to'g'ridan-to'g'ri `mesh.position` / `mesh.quaternion` ga —
//    ya'ni OTASIGA NISBATAN o'lchanadigan LOKAL maydonlarga yozardi.
//
//    Sahna ildizidagi obyekt uchun ikkalasi bir xil, shuning uchun
//    xato ko'rinmasdi. Papka (📁) yoki prefab ICHIDAGI obyekt uchun
//    esa jism o'yin boshlanishi bilan butunlay boshqa joyga sakrardi.
//
//    O'lchov (haqiqiy Rapier): 90° burilgan papka ichidagi kub,
//    dunyo (5, 3, −2) da turgan:
//        eski kod → dunyo (3, 0.51, −5)   ❌ 3.6 m siljish
//        yangi    → dunyo (5, 0.51, −2)   ✅ joyida tushdi
//
//  ⚠ Ota AYLANTIRILGAN bo'lsa aylanish ham o'girilishi kerak:
//    lokal q = (ota dunyo q)⁻¹ × (dunyo q). Faqat pozitsiyani
//    o'girish yetarli emas — obyekt ota burchagiga qo'shimcha
//    burilib qolardi.
// ============================================================
const _wpV = new THREE.Vector3();
const _wpQ = new THREE.Quaternion();
const _wpPQ = new THREE.Quaternion();
const _wpM = new THREE.Matrix4();
function _applyWorldPose(mesh, t, r) {
  const par = mesh.parent;
  //  Tez yo'l: ota — sahnaning o'zi (aylanmagan, surilmagan).
  //  Sahnadagi obyektlarning aksariyati shu holatda, shuning uchun
  //  matritsa teskarilashni bekorga qilmaymiz.
  if (!par || par.isScene) {
    mesh.position.set(t.x, t.y, t.z);
    mesh.quaternion.set(r.x, r.y, r.z, r.w);
    return;
  }
  par.updateWorldMatrix(true, false);
  _wpM.copy(par.matrixWorld).invert();
  mesh.position.set(t.x, t.y, t.z).applyMatrix4(_wpM);
  par.getWorldQuaternion(_wpPQ);
  _wpQ.set(r.x, r.y, r.z, r.w);
  mesh.quaternion.copy(_wpPQ.invert()).multiply(_wpQ);
}

function updatePhysics(delta) {
  if (!physicsEnabled || !isPlaying) return;

  // Rapier step
  if (rapierWorld && _rapierInitDone) {
    // ── ⏱ QAT'IY QADAM (fixed timestep) ────────────────────────
    //  ⚠ Ilgari `rapierWorld.step()` HAR KADRDA chaqirilardi. Rapier'ning
    //    standart qadami 1/60 s — ya'ni 144 Hz monitorda fizika real
    //    vaqtdan 2.4× TEZ yurardi, 30 fps ga tushsa 2× sekin. Jismlar
    //    "yengil" tuyulardi va tez tushib, bir-biriga urilib ketardi.
    //
    //    Endi haqiqiy `delta` to'planadi va 1/60 lik qadamlar bilan
    //    sarflanadi. Kadr juda uzun bo'lsa (tab orqada turgan, sahna
    //    yuklangan) qadamlar soni cheklanadi — aks holda "o'lim
    //    spirali" bo'lardi: kechikish → ko'p qadam → yana kechikish.
    const FIXED = 1 / 60;
    _physAccum += Math.min(delta || FIXED, 0.25);
    let steps = 0;
    while (_physAccum >= FIXED && steps < 5) {
      rapierWorld.step();
      _physAccum -= FIXED;
      steps++;
    }
    if (steps === 0) return;   // hali to'liq qadam yig'ilmadi

    // Rapier pozitsiyalarini Three.js meshlariga ko'chirish
    rapierBodies.forEach(({rigidBody, legacy}, mesh) => {
      if (legacy.isStatic || !mesh.parent) return;
      // 🎬 ANIMATSIYA HAYDAYOTGAN obyektga TEGMAYMIZ.
      //   ⚠ Bu satr bo'lmasa fizika har kadr `position`/`quaternion` ni
      //     Rapier'dagi qiymat bilan QAYTA YOZADI. Keyframe animatsiyasi
      //     obyektni qo'yadi — fizika darhol tortib oladi. Natijada
      //     animatsiya "boshlanmay tugaydi" va harakat titrab ko'rinadi.
      //     Bayroqni `timeline-export.js` qo'yadi/oladi (`_animHold`).
      if (mesh.userData && mesh.userData._animDriven) return;
      if (mesh === activeCar) return;
      if (window.PlayerController && window.PlayerController.obj === mesh) return; // oyinchiga tegma
      const t = rigidBody.translation();
      const r = rigidBody.rotation();
      _applyWorldPose(mesh, t, r);
    });

    // Rapier body velocity sync (legacy vel array uchun)
    physBodies.forEach(b => {
      if (b.isStatic) return;
      const rb = rapierBodies.get(b.mesh);
      if (!rb) return;
      const lv = rb.rigidBody.linvel();
      b.vel.set(lv.x, lv.y, lv.z);
    });

    return; // Rapier ishlamoqda — legacy skip
  }

  // Fallback: legacy JS physics (Rapier yuklanmaguncha)
  const gravity = -9.8 * delta;
  physBodies.forEach(b => {
    if (b.isStatic || !b.mesh.parent) return;
    if (b.mesh === activeCar) return;
    if (window.PlayerController && window.PlayerController.obj === b.mesh) return; // oyinchiga tegma
    b.vel.y += gravity;
    b.mesh.position.addScaledVector(b.vel, delta);
    b.mesh.rotation.x += b.angVel.x * delta;
    b.mesh.rotation.z += b.angVel.z * delta;
    if (b.mesh.position.y <= b.radius) {
      b.mesh.position.y = b.radius;
      b.vel.y *= -b.restitution;
      b.vel.x *= b.friction;
      b.vel.z *= b.friction;
      b.angVel.multiplyScalar(0.95);
    }
    ['x','z'].forEach(a=>{
      if (Math.abs(b.mesh.position[a]) > 18) {
        b.vel[a] *= -0.7;
        b.mesh.position[a] = Math.sign(b.mesh.position[a])*18;
      }
    });
  });

  // ⚠ Jismlar bir-birining ICHIGA tushib ketmasin.
  _legacyResolveContacts();
}

// ============================================================
//  🧱 _legacyResolveContacts — zaxira fizikada jism-jismga urilish
//
//  ⚠ NEGA KERAK: yuqoridagi zaxira tsikl har bir jismni ALOHIDA
//    hisoblaydi — u faqat yerni (`y <= radius`) va ±18 devorlarni
//    biladi. Ikki quti bir-birining ustiga qo'yilsa IKKALASI HAM
//    yergacha tushib, bir-birining ichiga kirib ketardi.
//
//    Bu Rapier yuklanmaganda ishlaydi. Rapier esa `file://` da
//    YUKLANMAYDI: u ES modul, brauzer esa `file://` dan modul
//    import qilishni CORS bilan bloklaydi. Ya'ni loyihani
//    ikki marta bosib ochgan foydalanuvchi AYNAN shu zaxira
//    fizikani ko'radi. Shuning uchun u ham ishlashi shart.
//
//  Usul: dunyo AABB lari kesishsa, ENG KAM chuqurlik o'qi bo'yicha
//  ajratamiz (eng qisqa yo'l bilan chiqarish). Statik jism qimirlamaydi,
//  ikki dinamik jism esa massaga teskari nisbatda suriladi.
// ============================================================
const _lcBox = new THREE.Box3();
function _legacyAABB(mesh, out) {
  out.setFromObject(mesh);
  return out;
}
function _legacyResolveContacts() {
  const list = physBodies.filter(b =>
    b.mesh && b.mesh.parent && b.mesh !== activeCar &&
    !(window.PlayerController && window.PlayerController.obj === b.mesh));
  if (list.length < 2) return;

  // AABB larni bir marta hisoblaymiz
  const boxes = list.map(b => _legacyAABB(b.mesh, new THREE.Box3()));

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j];
      if (A.isStatic && B.isStatic) continue;
      const ba = boxes[i], bb = boxes[j];
      if (!ba.intersectsBox(bb)) continue;

      // Har o'q bo'yicha kesishish chuqurligi
      const ox = Math.min(ba.max.x, bb.max.x) - Math.max(ba.min.x, bb.min.x);
      const oy = Math.min(ba.max.y, bb.max.y) - Math.max(ba.min.y, bb.min.y);
      const oz = Math.min(ba.max.z, bb.max.z) - Math.max(ba.min.z, bb.min.z);
      if (ox <= 0 || oy <= 0 || oz <= 0) continue;

      // Eng kam chuqurlik o'qi — eng qisqa chiqish yo'li
      let ax = 'y', depth = oy;
      if (ox < depth) { ax = 'x'; depth = ox; }
      if (oz < depth) { ax = 'z'; depth = oz; }

      // Yo'nalish: A markazi B dan qaysi tomonda
      const ca = (ba.min[ax] + ba.max[ax]) / 2;
      const cb = (bb.min[ax] + bb.max[ax]) / 2;
      const sign = ca < cb ? -1 : 1;

      // Massaga teskari nisbatda ulush (statik = qimirlamaydi)
      const ma = A.isStatic ? Infinity : (A.mass || 1);
      const mb = B.isStatic ? Infinity : (B.mass || 1);
      const inA = A.isStatic ? 0 : 1 / ma;
      const inB = B.isStatic ? 0 : 1 / mb;
      const tot = inA + inB;
      if (tot <= 0) continue;

      // ⚠ To'liq emas, 80% ajratamiz — qolgan qismi keyingi kadrda
      //   tuzatiladi. To'liq ajratish jismlarni tebrantirib yuborardi.
      const push = depth * 0.8;
      A.mesh.position[ax] += sign * push * (inA / tot);
      B.mesh.position[ax] -= sign * push * (inB / tot);

      // Tezlik: faqat bir-biriga QARAB kelayotgan qism so'ndiriladi
      const rel = (A.vel[ax] || 0) - (B.vel[ax] || 0);
      if (rel * sign < 0) {
        const e = Math.min(A.restitution ?? 0.15, B.restitution ?? 0.15);
        const jimp = -(1 + e) * rel / tot;
        if (!A.isStatic) A.vel[ax] += jimp * inA;
        if (!B.isStatic) B.vel[ax] -= jimp * inB;
        // Ustma-ust turganda gorizontal sirg'anishni ham so'ndiramiz
        if (ax === 'y') {
          const f = Math.min(A.friction ?? 0.8, B.friction ?? 0.8);
          if (!A.isStatic) { A.vel.x *= f; A.vel.z *= f; }
          if (!B.isStatic) { B.vel.x *= f; B.vel.z *= f; }
        }
      }
      // AABB larni yangilaymiz — keyingi juftlik to'g'ri hisoblansin
      _legacyAABB(A.mesh, ba);
      _legacyAABB(B.mesh, bb);
    }
  }
}

// Rapier WASM tayyor bo'lganda ulash
window.addEventListener('rapier-ready', () => {
  initRapierWorld();
});
// Agar allaqachon tayyor bo'lsa
if (window._rapierReady) initRapierWorld();

// Vel ga force qo'shish (Rapier + legacy)
// ============================================================
//  🎬 syncPhysicsBodyToMesh — animatsiyadan keyin tanani meshga tenglash
//
//  Animatsiya obyektni ko'chirganda Rapier tanasi ESKI joyda qoladi
//  (sinxronizatsiya to'xtatib turilgan edi). Tugagach tanani yangi joyga
//  ko'chirmasak, fizika obyektni darhol eski joyiga qaytarib tashlardi —
//  eshik ochilib, sakrab yopilardi. Tezlik ham nolga tushiriladi: aks
//  holda animatsiya davomida to'plangan "xayoliy" tezlik bilan uchardi.
// ============================================================
function syncPhysicsBodyToMesh(mesh) {
  if (!mesh || !rapierWorld) return false;
  const rec = rapierBodies.get(mesh);
  if (!rec) return false;
  try {
    mesh.updateWorldMatrix(true, false);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    mesh.matrixWorld.decompose(p, q, sc);
    rec.rigidBody.setTranslation({ x:p.x, y:p.y, z:p.z }, true);
    if (rec.rigidBody.setRotation) rec.rigidBody.setRotation({ x:q.x, y:q.y, z:q.z, w:q.w }, true);
    if (!rec.legacy.isStatic) {
      if (rec.rigidBody.setLinvel) rec.rigidBody.setLinvel({ x:0, y:0, z:0 }, true);
      if (rec.rigidBody.setAngvel) rec.rigidBody.setAngvel({ x:0, y:0, z:0 }, true);
    }
    const b = physBodies.find(x => x.mesh === mesh);
    if (b && b.vel) b.vel.set(0, 0, 0);
  } catch (e) { return false; }
  return true;
}
window.syncPhysicsBodyToMesh = syncPhysicsBodyToMesh;

function applyForceToMesh(mesh, forceVec) {
  const rb = rapierBodies.get(mesh);
  if (rb && !rb.legacy.isStatic) {
    rb.rigidBody.applyImpulse({x:forceVec.x, y:forceVec.y, z:forceVec.z}, true);
  } else {
    const b = physBodies.find(b=>b.mesh===mesh);
    if (b) b.vel.add(forceVec);
  }
}

// Mass, restitution, friction update (Rapier)
function updateRapierColliderProps(mesh, props={}) {
  const rb = rapierBodies.get(mesh);
  if (!rb) return;
  if (props.restitution !== undefined) rb.collider.setRestitution(props.restitution);
  if (props.friction    !== undefined) rb.collider.setFriction(props.friction);
  if (props.mass !== undefined && !rb.legacy.isStatic) {
    // ⚖️ Massa zichlik orqali beriladi (ρ = m / V) — `setAdditionalMass`
    //    aylanish inersiyasini qo'shmaydi va jism aqldan ozgandek
    //    aylanardi. Hajm tana qurilganda yozib qo'yilgan.
    const V = rb.volume || 1;
    if (rb.collider.setDensity) rb.collider.setDensity(Math.max(1e-4, props.mass / V));
    if (rb.rigidBody.wakeUp) rb.rigidBody.wakeUp();
  }
}

function physSyncUI() {
  const s = $('phys-s');
  const btn = $('phys-toggle');
  if (s) { s.textContent = physicsEnabled ? 'ON' : 'OFF'; s.style.color = physicsEnabled ? 'var(--accent3)' : 'var(--red)'; }
  if (btn) { btn.style.color = physicsEnabled ? 'var(--accent3)' : 'var(--red)'; btn.style.opacity = '1'; btn.style.display = ''; }
}

window.togglePhysics = function() {
  physicsEnabled = !physicsEnabled;
  physSyncUI();
  log(`🌊 Fizika: ${physicsEnabled?'yoqildi':'o\'chirildi'}`, physicsEnabled?'lok':'lw');
};
