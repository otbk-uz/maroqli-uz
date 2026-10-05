// ============================================================
//  🌸 AIKO — APEX uchun tirik AI hamroh
// ------------------------------------------------------------
//  Bu addon sahnaga MUSTAQIL qaror qabul qiladigan personaj
//  qo'shadi. U skript emas — har kadr atrofini "ko'radi",
//  imkoniyatlarni BAHOLAYDI va eng qiziq ko'ringanini tanlaydi.
//
//  ── Nega utility-AI (ballar), oddiy holat mashinasi emas ────
//    Talab ro'yxati uzun: o'g'irlash, qurish, tepish, tugma
//    bosish, quchoqlash, hafa bo'lish, PC kodini almashtirish…
//    Bularni `if/else` zanjiri bilan yozsa, har yangi xatti-harakat
//    oldingilarining hammasiga tegib ketardi (bu loyihada
//    `save-load.js` ning qo'lda sanalgan ro'yxati bilan aynan
//    shunday bo'lgan — `system-registry.js` izohiga qarang).
//
//    Bu yerda har bir xatti-harakat — ALOHIDA obyekt:
//        { id, score(ctx) → son, enter(), tick(dt), exit() }
//    Yangisini qo'shish = `BEHAVIORS` massiviga bitta yozuv.
//    Boshqa hech narsaga tegilmaydi.
//
//  ── Nega o'z RAF sikli ──────────────────────────────────────
//    `main-loop.js` addonlar haqida bilmaydi va uni tahrirlash
//    addonning ma'nosini yo'qotadi. `TimelineSystem` allaqachon
//    o'zining alohida `requestAnimationFrame` siklida yuradi —
//    o'sha naqshni takrorlaymiz. Sikl `_safe` g'oyasi bilan
//    o'ralgan: Aiko yiqilsa dvigatel to'xtamaydi.
//
//  ── Nega tana `_` bilan boshlanadigan bolalardan ────────────
//    `save-load.js` `_` bilan boshlanadigan bolalarni faylga
//    YOZMAYDI (hitbox, tugma, MiniPad shu qoidaga bo'ysunadi).
//    Ya'ni tana ZIP hajmini shishirmaydi — yuklashdan keyin
//    `_ensureBody()` uni qaytadan quradi.
// ============================================================

(function () {
'use strict';

// ============================================================
//  0. YORDAMCHILAR
// ============================================================

const T = () => window.THREE;
const _v1 = () => new (T().Vector3)();
const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
const lerp  = (a, b, t) => a + (b - a) * t;
const rnd   = (a, b) => a + Math.random() * (b - a);
const pick  = (arr) => arr[(Math.random() * arr.length) | 0];

/** Burchakni [-π, π] oralig'iga keltiradi — burilish "uzun yo'ldan" ketmasin. */
function wrapPi(a) {
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Burchakni maqsadga silliq yaqinlashtiradi. */
function turnTo(cur, want, rate, dt) {
  return cur + wrapPi(want - cur) * clamp(rate * dt, 0, 1);
}

function say(msg, type) {
  try { if (typeof window.log === 'function') window.log('🌸 ' + msg, type || 'lok'); }
  catch (e) {}
}

/** `dispose.js` dagi escape — dialog matni HTML ga tushadi. */
function esc(s) {
  return (typeof window.escapeHtml === 'function')
    ? window.escapeHtml(String(s == null ? '' : s))
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const isPlay = () => (typeof window.isPlaying !== 'undefined' && window.isPlaying);

/** O'yinchi (yoki kamera) dunyo pozitsiyasi. */
function playerPos(out) {
  const o = out || _v1();
  const PC = window.PlayerController;
  if (PC && PC.obj && PC.obj.parent) { PC.obj.getWorldPosition(o); return o; }
  if (window.playerMesh && window.playerMesh.parent) { window.playerMesh.getWorldPosition(o); return o; }
  if (window.camera) { o.copy(window.camera.position); return o; }
  return o.set(0, 0, 0);
}

// ============================================================
//  1. SOZLAMALAR
// ============================================================

const DEF = {
  // — Jismoniy —
  height:     1.62,    // bo'yi (m) — model shu bo'yicha masshtablanadi
  walkSpeed:  2.2,
  runSpeed:   4.4,
  turnRate:   7.0,
  jumpVel:    4.6,
  gravity:    18.0,
  stepUp:     0.42,    // shu balandlikkacha to'siqqa "qadam qo'yadi"

  // — Sezish —
  sightRange: 16,      // shu radiusda narsalarni "ko'radi"
  sightCone:  115,     // ko'rish burchagi (daraja, to'liq kenglik)
  reach:      1.15,    // qo'li yetadigan masofa

  // — Fe'l-atvor (0..1) —
  curiosity:  0.80,    // qiziquvchanlik — tugma/PC/yangi jismga intilish
  mischief:   0.65,    // shumlik — o'g'irlash, trigger bosish
  temper:     0.55,    // jahldorlik — qanchalik tez achchiqlanadi
  clumsy:     0.40,    // beso'naqaylik — qoqinib yiqilish ehtimoli
  affection:  0.30,    // mehr — quchoqlash shu yerdan boshlanadi

  // — Xotira —
  afkLimit:   12,      // o'yinchi shuncha sekund qimirlamasa — hafa bo'ladi
  stashGoal:  4,       // shuncha jism to'plansa qurilish boshlanadi
  maxLiftKg:  60,      // shundan og'irini ko'tara olmaydi

  // — Dialog —
  talkKey:    'KeyT',
  talkDist:   4.0,

  // — Ovoz —
  chatty:     true,    // gapiradigan pufakchalar
};

// ============================================================
//  2. TANA — sof primitivlardan (tashqi model shart emas)
// ------------------------------------------------------------
//  Har bir bo'g'in ALOHIDA `Group` — mesh emas. Sabab: aylanish
//  markazi bo'g'inda (yelka, tirsak, son) bo'lishi kerak, mesh
//  markazida emas. Meshni guruh ichida yarim uzunlikka surib
//  qo'yamiz — shunda `group.rotation.x` tabiiy buriladi.
// ============================================================

const SKIN  = 0xffe0d0;
const HAIR  = 0x2e2438;
const DRESS = 0xe8547c;
const WHITE = 0xfaf7f5;

function _mat(color, opts) {
  const o = opts || {};
  return new (T().MeshStandardMaterial)({
    color: color,
    roughness: o.rough == null ? 0.72 : o.rough,
    metalness: 0,
    emissive: o.emissive || 0x000000,
    emissiveIntensity: o.ei || 1,
    transparent: !!o.transparent,
    opacity: o.opacity == null ? 1 : o.opacity,
  });
}

function _box(w, h, d, color, opts) {
  const m = new (T().Mesh)(new (T().BoxGeometry)(w, h, d), _mat(color, opts));
  m.castShadow = true;
  return m;
}

function _sph(r, color, opts) {
  const m = new (T().Mesh)(new (T().SphereGeometry)(r, 16, 12), _mat(color, opts));
  m.castShadow = true;
  return m;
}

function _cyl(rt, rb, h, color, opts) {
  const m = new (T().Mesh)(new (T().CylinderGeometry)(rt, rb, h, 12), _mat(color, opts));
  m.castShadow = true;
  return m;
}

/**
 * Bo'g'in yaratadi: guruh bo'g'in nuqtasida turadi, mesh esa undan
 * pastga osiladi.
 * @returns {{joint: Group, mesh: Mesh}}
 */
function _limb(w, h, d, color, opts) {
  const g = new (T().Group)();
  const m = _box(w, h, d, color, opts);
  m.position.y = -h / 2;
  g.add(m);
  return { joint: g, mesh: m };
}

/**
 * Aikoning tanasini quradi va `root.userData._w` ga bo'g'inlar
 * xaritasini yozadi.
 *
 * ⚠ Hamma bola nomi `_` bilan boshlanadi → `save-load.js` ularni
 *   faylga yozmaydi → ZIP shishmaydi, yuklashda qaytadan quriladi.
 */
function buildBody(root) {
  const TH = T();
  const P = {};   // bo'g'inlar xaritasi

  // ── Hip (butun tananing tayanchi) ─────────────────────────
  const hip = new TH.Group();
  hip.name = '_wHip';
  hip.position.y = 0.82;
  root.add(hip);
  P.hip = hip;

  // ── Tana ──────────────────────────────────────────────────
  const torso = _box(0.30, 0.42, 0.19, DRESS);
  torso.name = '_wTorso';
  torso.position.y = 0.21;
  hip.add(torso);
  P.torso = torso;

  // Yubka — teskari konus, tanadan pastga
  const skirt = new TH.Mesh(new TH.ConeGeometry(0.30, 0.26, 14, 1, true), _mat(DRESS));
  skirt.name = '_wSkirt';
  skirt.position.y = 0.02;
  skirt.material.side = TH.DoubleSide;
  skirt.castShadow = true;
  hip.add(skirt);
  P.skirt = skirt;

  // Yoqa
  const collar = _cyl(0.10, 0.11, 0.05, WHITE);
  collar.name = '_wCollar';
  collar.position.y = 0.44;
  hip.add(collar);

  // ── Bo'yin + bosh ─────────────────────────────────────────
  const neck = new TH.Group();
  neck.name = '_wNeck';
  neck.position.y = 0.47;
  hip.add(neck);
  P.neck = neck;

  const head = new TH.Group();
  head.name = '_wHead';
  head.position.y = 0.13;
  neck.add(head);
  P.head = head;

  const skull = _sph(0.155, SKIN);
  skull.name = '_wSkull';
  skull.scale.set(1, 1.06, 0.96);
  head.add(skull);

  // Soch — orqa massasi
  const hairBack = _sph(0.172, HAIR);
  hairBack.name = '_wHairBack';
  hairBack.scale.set(1, 1.02, 1);
  hairBack.position.z = -0.012;
  head.add(hairBack);

  // Kokil (chelka)
  const bang = _box(0.29, 0.075, 0.10, HAIR);
  bang.name = '_wBang';
  bang.position.set(0, 0.105, 0.095);
  head.add(bang);

  // Ikki dumcha (twin-tail)
  P.tails = [];
  for (const s of [-1, 1]) {
    const t = new TH.Group();
    t.name = '_wTail' + (s < 0 ? 'L' : 'R');
    t.position.set(0.155 * s, 0.05, -0.03);
    const tm = _cyl(0.055, 0.028, 0.34, HAIR);
    tm.position.y = -0.17;
    t.add(tm);
    const tip = _sph(0.032, DRESS);
    tip.position.y = -0.34;
    t.add(tip);
    head.add(t);
    P.tails.push(t);
  }

  // Yuz — katta anime ko'zlar
  P.eyes = [];
  for (const s of [-1, 1]) {
    const e = new TH.Group();
    e.name = '_wEye' + (s < 0 ? 'L' : 'R');
    e.position.set(0.058 * s, 0.005, 0.142);
    const wht = _box(0.052, 0.062, 0.012, WHITE, { rough: 0.3 });
    e.add(wht);
    const iris = _box(0.030, 0.040, 0.010, 0x4aa3ff, { rough: 0.2, emissive: 0x1a3a66, ei: 0.6 });
    iris.position.z = 0.008;
    iris.name = '_wIris';
    e.add(iris);
    head.add(e);
    P.eyes.push(e);
  }

  // Qovoq — pirpiratish va jahl uchun `scale.y` bilan bosiladi
  P.lids = [];
  for (const s of [-1, 1]) {
    const l = _box(0.058, 0.062, 0.016, SKIN);
    l.name = '_wLid' + (s < 0 ? 'L' : 'R');
    l.position.set(0.058 * s, 0.037, 0.146);
    l.scale.y = 0.02;
    head.add(l);
    P.lids.push(l);
  }

  // Yonoq qizarishi — quchoqlash/uyalish paytida ko'rinadi
  P.blush = [];
  for (const s of [-1, 1]) {
    const b = _box(0.048, 0.022, 0.008, 0xff8fa8, { transparent: true, opacity: 0 });
    b.name = '_wBlush' + (s < 0 ? 'L' : 'R');
    b.position.set(0.088 * s, -0.045, 0.138);
    head.add(b);
    P.blush.push(b);
  }

  // Og'iz — kayfiyatga qarab `scale` o'zgaradi
  const mouth = _box(0.038, 0.014, 0.008, 0xc4485f);
  mouth.name = '_wMouth';
  mouth.position.set(0, -0.078, 0.142);
  head.add(mouth);
  P.mouth = mouth;

  // ── Qo'llar ───────────────────────────────────────────────
  P.arms = [];
  for (const s of [-1, 1]) {
    const sh = _limb(0.062, 0.20, 0.062, SKIN);
    sh.joint.name = '_wArm' + (s < 0 ? 'L' : 'R');
    sh.joint.position.set(0.176 * s, 0.40, 0);
    hip.add(sh.joint);

    const fo = _limb(0.055, 0.19, 0.055, SKIN);
    fo.joint.name = '_wFore' + (s < 0 ? 'L' : 'R');
    fo.joint.position.y = -0.20;
    sh.joint.add(fo.joint);

    const hand = _sph(0.045, SKIN);
    hand.name = '_wHand' + (s < 0 ? 'L' : 'R');
    hand.position.y = -0.20;
    fo.joint.add(hand);

    // Yeng
    const sleeve = _cyl(0.075, 0.070, 0.09, DRESS);
    sleeve.position.y = -0.045;
    sh.joint.add(sleeve);

    P.arms.push({ shoulder: sh.joint, fore: fo.joint, hand: hand, side: s });
  }

  // ── Oyoqlar ───────────────────────────────────────────────
  P.legs = [];
  for (const s of [-1, 1]) {
    const th = _limb(0.086, 0.36, 0.086, WHITE);
    th.joint.name = '_wLeg' + (s < 0 ? 'L' : 'R');
    th.joint.position.set(0.082 * s, -0.02, 0);
    hip.add(th.joint);

    const sn = _limb(0.076, 0.36, 0.076, WHITE);
    sn.joint.name = '_wShin' + (s < 0 ? 'L' : 'R');
    sn.joint.position.y = -0.36;
    th.joint.add(sn.joint);

    const foot = _box(0.088, 0.062, 0.155, 0x2a2430);
    foot.name = '_wFoot' + (s < 0 ? 'L' : 'R');
    foot.position.set(0, -0.375, 0.035);
    sn.joint.add(foot);

    P.legs.push({ thigh: th.joint, shin: sn.joint, foot: foot, side: s });
  }

  // ── Bo'yga moslash ────────────────────────────────────────
  const raw = 1.62;
  const want = root.userData.wCfg && root.userData.wCfg.height || DEF.height;
  const k = want / raw;
  hip.scale.setScalar(k);
  hip.position.y = 0.82 * k;

  root.userData._w = P;
  root.userData._wBuilt = true;
  return P;
}



/**
 * `bone-system.js` qoldirgan skelet "simlari" va marker sharlarini
 * tozalaydi.
 *
 * ⚠ Faqat `_boneExposed` qo'yish yetarli emas: skaner allaqachon
 *   bir marta ishlab ulgurgan bo'lsa, `SkeletonHelper` va markerlar
 *   sahnada QOLIB KETADI. Ular `depthTest:false` bilan chiziladi,
 *   ya'ni hamma narsaning ustidan ko'rinadi.
 */
function _clearBoneHelpers(root) {
  const kill = [];
  const sc = window.scene;
  const seen = [root];
  if (sc) seen.push(sc);
  for (const holder of seen) {
    if (!holder) continue;
    for (const c of holder.children.slice()) {
      if (c.type === 'SkeletonHelper' || c.isSkeletonHelper) {
        holder.remove(c); kill.push(c);
      }
    }
    if (holder.userData) delete holder.userData._skelHelper;
  }
  // Suyaklarga ilingan markerlar
  root.traverse(o => {
    if (!o.userData) return;
    for (const k of ['_marker', '_hit']) {
      const m = o.userData[k];
      if (m) { if (m.parent) m.parent.remove(m); kill.push(m); delete o.userData[k]; }
    }
    delete o.userData._rigged;
  });
  try { if (window.disposeMany) window.disposeMany(kill); } catch (e) {}
  // Ro'yxatdan ham chiqaramiz
  try {
    const BR = window.BoneRig;
    if (BR && BR._rigs && Array.isArray(BR._rigs)) {
      for (let i = BR._rigs.length - 1; i >= 0; i--) {
        const m = BR._rigs[i];
        if (m === root || m === window.scene) BR._rigs.splice(i, 1);
      }
    }
  } catch (e) {}
}

/** GLB ulanganda primitiv tanani yashiradi (o'chirmaydi — qaytarish oson). */
function hidePrimitive(root, hide) {
  for (const c of root.children)
    if (c.name && c.name.indexOf('_w') === 0 && c.name !== '_wGlbRoot')
      c.visible = !hide;
}

/**
 * Yuklangan GLB sahnasini Aikoga ulaydi va skeletni topadi.
 *
 * ⚠ Bola nomi `_wGlbRoot` — `_` bilan boshlangani uchun sahna
 *   ZIP iga YOZILMAYDI. Model yo'li (`wGlbUrl`) esa `_` siz
 *   saqlanadi va yuklashda qaytadan o'qiladi. Aks holda har
 *   saqlashda 8 MB lik model ZIP ga qo'shilib ketardi.
 */
function attachGlb(A, gltfScene) {
  const root = A.root;
  // Eskisini olib tashlaymiz
  const old = root.getObjectByName('_wGlbRoot');
  if (old) { root.remove(old); try { if (window.disposeMany) window.disposeMany([old]); } catch (e) {} }

  gltfScene.name = '_wGlbRoot';
  gltfScene.traverse(o => { if (o.isMesh || o.isSkinnedMesh) { o.castShadow = true; o.frustumCulled = false; } });

  // ⚠ SUYAK KO'RSATKICHINI O'CHIRAMIZ.
  //   `bone-system.js` har soniyada `objects` ni skanerlaydi va
  //   suyagi bor har qanday `Group` ni "riglash" uchun oladi
  //   (`_watch()` → `autoExpose()`). Aiko esa aynan shunday: oddiy
  //   `Group` ichida skeletli GLB.
  //
  //   Natijasi ekranda ko'rindi: konsol har soniyada
  //   `"undefined" — 331 suyak` deb takrorlanardi va suyak
  //   markerlari ULKAN chiqardi.
  //
  //   Sabab: `_topModel()` `isGLB` belgisi bo'lgan otani qidiradi;
  //   Aikoda u yo'q, shuning uchun funksiya SAHNAGACHA chiqib
  //   ketardi. Ya'ni `model` = butun sahna → nomi `undefined`,
  //   marker o'lchami esa BUTUN SAHNA hajmidan hisoblanardi.
  //   `_boneExposed` ham sahnaga yozilardi, `_watch()` esa Aiko
  //   rootini tekshirardi — bayroq hech qachon mos kelmasdi va
  //   skaner har soniyada qaytadan ishlardi.
  //
  //   Aikoning suyaklarini bu addon boshqaradi — qo'lda tanlash
  //   yoki poza berish kerak emas. Shuning uchun ochiq voz
  //   kechamiz: `_boneExposed` ni O'ZIMIZ qo'yamiz va skaner
  //   Aikoni butunlay chetlab o'tadi.
  root.userData._boneExposed = true;
  gltfScene.userData = gltfScene.userData || {};
  gltfScene.userData._boneExposed = true;
  _clearBoneHelpers(root);

  // Bo'yga moslash: modelning haqiqiy balandligini o'lchaymiz
  const TH = T();
  const box = new TH.Box3().setFromObject(gltfScene);
  const h = Math.max(1e-6, box.max.y - box.min.y);
  const k = (A.cfg.height || DEF.height) / h;
  gltfScene.scale.setScalar(k);
  // Oyoq ostini nolga tushiramiz
  gltfScene.position.y = -box.min.y * k;
  gltfScene.userData._wBaseY = gltfScene.position.y;   // cho'kkalash shundan o'lchanadi

  root.add(gltfScene);
  root.userData._wGlb = gltfScene;

  const rig = Rig.detect(gltfScene);
  A.rig = rig;
  hidePrimitive(root, !!rig || true);      // model bor — primitivni yashiramiz

  return rig;
}

/** Tanani butunlay o'chiradi (qayta qurishdan oldin). */
function clearBody(root) {
  const kill = root.children.filter(c => c.name && c.name.indexOf('_w') === 0);
  for (const c of kill) root.remove(c);
  try { if (window.disposeMany) window.disposeMany(kill); } catch (e) {}
  root.userData._w = null;
  root.userData._wBuilt = false;
}

// ============================================================
//  3. POZA — animatsiya qatlami
// ------------------------------------------------------------
//  Har kadr HAR BIR bo'g'in maqsad burchakka `lerp` bilan
//  yaqinlashadi. Ya'ni pozalar bir-biriga o'z-o'zidan qorishadi
//  va "sakrash" bo'lmaydi — alohida blend kodi kerak emas.
// ============================================================

const Pose = (() => {
  const goal = {};             // bo'g'in nomi → burchak
  let blushGoal = 0, mouthGoal = 1, lidGoal = 0.02;
  // ⚠ `crouch` — poza qanchalik "pastda" (0 = tik turibdi,
  //   1 = yerda yotibdi). Oyoq suyagi BO'LMAGAN modellarda
  //   cho'kkalashni oyoq bukish bilan ko'rsatib bo'lmaydi —
  //   o'rniga butun tanani pastga tushiramiz. Aks holda Aiko
  //   "o'tiribman" deb turaverar, lekin HAVODA qolardi.
  let crouchGoal = 0;

  function set(name, x, y, z) {
    goal[name] = { x: x || 0, y: y || 0, z: z || 0 };
  }
  function reset() {
    for (const k in goal) delete goal[k];
    blushGoal = 0; mouthGoal = 1; lidGoal = 0.02; crouchGoal = 0;
  }
  function crouch(v) { crouchGoal = clamp(v, 0, 1); }
  function face(o) {
    if (o.blush != null) blushGoal = o.blush;
    if (o.mouth != null) mouthGoal = o.mouth;
    if (o.lid   != null) lidGoal   = o.lid;
  }

  /** Maqsadlarni haqiqiy bo'g'inlarga qo'llaydi. */
  function apply(P, dt, speed) {
    const k = clamp((speed == null ? 10 : speed) * dt, 0, 1);
    const jm = {
      neck: P.neck, head: P.head,
      armL: P.arms[0].shoulder, armR: P.arms[1].shoulder,
      foreL: P.arms[0].fore,    foreR: P.arms[1].fore,
      legL: P.legs[0].thigh,    legR: P.legs[1].thigh,
      shinL: P.legs[0].shin,    shinR: P.legs[1].shin,
      tailL: P.tails[0],        tailR: P.tails[1],
      hip: P.hip,
    };
    for (const name in jm) {
      const j = jm[name];
      if (!j) continue;
      const g = goal[name] || { x: 0, y: 0, z: 0 };
      // hip ning `y` si yurish yo'nalishi — uni bu yerda tegmaymiz
      if (name === 'hip') {
        j.rotation.x = lerp(j.rotation.x, g.x, k);
        j.rotation.z = lerp(j.rotation.z, g.z, k);
        continue;
      }
      j.rotation.x = lerp(j.rotation.x, g.x, k);
      j.rotation.y = lerp(j.rotation.y, g.y, k);
      j.rotation.z = lerp(j.rotation.z, g.z, k);
    }
    // Yuz
    for (const b of P.blush) b.material.opacity = lerp(b.material.opacity, blushGoal, k);
    P.mouth.scale.x = lerp(P.mouth.scale.x, mouthGoal, k);
    P.mouth.scale.y = lerp(P.mouth.scale.y, mouthGoal > 1.4 ? 2.4 : 1, k);
    for (const l of P.lids) l.scale.y = lerp(l.scale.y, lidGoal, k);
  }

  // ── Tayyor pozalar ────────────────────────────────────────
  //  Har biri faqat MAQSAD qo'yadi; qorishtirish `apply` da.

  function idle(t) {
    const b = Math.sin(t * 1.6) * 0.05;
    set('neck', b * 0.4, Math.sin(t * 0.7) * 0.18, 0);
    set('armL', 0.06, 0, -0.13 + b * 0.3);
    set('armR', 0.06, 0,  0.13 - b * 0.3);
    set('foreL', -0.22, 0, 0); set('foreR', -0.22, 0, 0);
    set('legL', 0, 0, 0.02);   set('legR', 0, 0, -0.02);
    set('shinL', 0, 0, 0);     set('shinR', 0, 0, 0);
    set('tailL', Math.sin(t * 1.3) * 0.12, 0, -0.28);
    set('tailR', Math.sin(t * 1.3 + 1) * 0.12, 0, 0.28);
    set('hip', b * 0.06, 0, 0);
  }

  function walk(t, run) {
    const f = run ? 11 : 6.5;
    const a = run ? 0.85 : 0.52;
    const s = Math.sin(t * f);
    const c = Math.cos(t * f);
    set('legL',  s * a, 0, 0.02);
    set('legR', -s * a, 0, -0.02);
    set('shinL', Math.max(0, -s) * 0.9, 0, 0);
    set('shinR', Math.max(0,  s) * 0.9, 0, 0);
    set('armL', -s * a * 0.7, 0, -0.16);
    set('armR',  s * a * 0.7, 0,  0.16);
    set('foreL', -0.35, 0, 0); set('foreR', -0.35, 0, 0);
    set('hip', 0.06 + Math.abs(c) * 0.03, 0, s * 0.05);
    set('neck', -0.05, 0, 0);
    set('tailL', -s * 0.25, 0, -0.28);
    set('tailR',  s * 0.25, 0,  0.28);
  }

  /** Ikki qo'lda jism ko'tarib turish. */
  function carry(t) {
    set('armL', -1.35, 0, -0.32);
    set('armR', -1.35, 0,  0.32);
    set('foreL', -0.55, 0, 0.3);
    set('foreR', -0.55, 0, -0.3);
    set('neck', 0.1, 0, 0);
    set('hip', -0.08, 0, Math.sin(t * 5) * 0.04);
  }

  /** Qo'l silkitib chaqirish. */
  function wave(t) {
    set('armR', -2.5, 0, 0.5);
    set('foreR', -0.4, 0, Math.sin(t * 9) * 0.75);
    set('armL', 0.1, 0, -0.15);
    set('foreL', -0.3, 0, 0);
    set('neck', -0.12, 0, 0);
    face({ mouth: 1.7, lid: 0.02 });
  }

  /** Tepish — `p` 0..1 (zamburug'dan zarbagacha). */
  function kick(p) {
    if (p < 0.45) {                       // orqaga tortish
      const q = p / 0.45;
      set('legR', -0.9 * q, 0, 0);
      set('shinR', 1.5 * q, 0, 0);
      set('hip', -0.12 * q, 0, 0);
      set('armL', -0.5 * q, 0, -0.4);
    } else {                              // zarba
      const q = (p - 0.45) / 0.55;
      set('legR', 1.5 * q, 0, 0);
      set('shinR', 0.15, 0, 0);
      set('hip', 0.18 * q, 0, 0);
      set('armR', -0.9 * q, 0, 0.5);
      set('armL', 0.6 * q, 0, -0.5);
    }
    set('legL', 0.05, 0, 0);
    face({ mouth: 1.5 });
  }

  /** Barmoq bilan turtish (tugma, PC). */
  function poke(p) {
    set('armR', -1.55 - Math.sin(p * Math.PI) * 0.35, 0, 0.18);
    set('foreR', -0.15, 0, 0);
    set('armL', 0.1, 0, -0.15);
    set('neck', 0.18, 0, 0);
    face({ mouth: 0.7, lid: 0.35 });
  }

  /** Hayron qolish — orqaga tislanadi, qo'llar yuqorida. */
  function surprised(t) {
    set('armL', -2.2, 0, -0.9);
    set('armR', -2.2, 0,  0.9);
    set('foreL', -0.9, 0, 0); set('foreR', -0.9, 0, 0);
    set('neck', -0.3, 0, 0);
    set('hip', -0.22, 0, 0);
    set('legL', -0.25, 0, 0); set('legR', 0.1, 0, 0);
    set('tailL', -0.7, 0, -0.4); set('tailR', -0.7, 0, 0.4);
    face({ mouth: 2.2, lid: 0.02, blush: 0.35 });
  }

  /** Jahli chiqqan — qo'llar belda, oldinga engashadi. */
  function angry(t) {
    const sh = Math.sin(t * 22) * 0.03;
    set('armL', 0.3, 0, -1.25);
    set('armR', 0.3, 0,  1.25);
    set('foreL', -1.5, 0, 0); set('foreR', -1.5, 0, 0);
    set('neck', 0.22, sh, 0);
    set('hip', 0.16, 0, sh);
    set('tailL', 0.35, 0, -0.5); set('tailR', 0.35, 0, 0.5);
    face({ mouth: 1.3, lid: 0.55 });
  }

  /** Hafa — cho'kkalab, boshi quyi. */
  function sulk(t) {
    crouch(0.62);                     // cho'kkalagan — yerga yaqin
    set('hip', 0.42, 0, 0);
    set('neck', 0.55, Math.sin(t * 0.5) * 0.1, 0);
    set('legL', -1.5, 0, 0.1); set('legR', -1.5, 0, -0.1);
    set('shinL', 1.8, 0, 0);   set('shinR', 1.8, 0, 0);
    set('armL', -0.6, 0, -0.1); set('armR', -0.6, 0, 0.1);
    set('foreL', -1.1, 0, 0);   set('foreR', -1.1, 0, 0);
    set('tailL', 0.6, 0, -0.15); set('tailR', 0.6, 0, 0.15);
    face({ mouth: 0.55, lid: 0.7 });
  }

  /** Quchoqlash — ikki qo'l oldinga ochilgan. */
  function hug(p) {
    set('armL', -1.5, 0, -0.55 + p * 0.35);
    set('armR', -1.5, 0,  0.55 - p * 0.35);
    set('foreL', -0.5 - p * 0.6, 0, 0);
    set('foreR', -0.5 - p * 0.6, 0, 0);
    set('neck', -0.15, 0, 0);
    face({ mouth: 1.6, lid: 0.6, blush: 0.55 + p * 0.35 });
  }

  /** Yiqilish — `p` 0..1. */
  function fall(p) {
    crouch(p * 0.85);                 // yiqilganda YERGA tushadi
    set('hip', -p * 1.35, 0, p * 0.3);
    set('neck', p * 0.5, 0, 0);
    set('armL', -1.9 * p, 0, -0.8 * p);
    set('armR', -1.9 * p, 0,  0.8 * p);
    set('legL', p * 0.8, 0, 0); set('legR', p * 0.5, 0, 0);
    set('shinL', -p * 0.9, 0, 0); set('shinR', -p * 0.5, 0, 0);
    face({ mouth: 2.0, lid: 0.05 });
  }

  /** Chiqish/tirmashish. */
  function climb(t) {
    const s = Math.sin(t * 7);
    set('armL', -2.6 - s * 0.3, 0, -0.35);
    set('armR', -2.6 + s * 0.3, 0,  0.35);
    set('foreL', -0.5, 0, 0); set('foreR', -0.5, 0, 0);
    set('legL', -0.55 + s * 0.4, 0, 0.08);
    set('legR', -0.55 - s * 0.4, 0, -0.08);
    set('shinL', 0.9, 0, 0); set('shinR', 0.9, 0, 0);
    set('neck', -0.35, 0, 0);
  }

  /** Raqs — musiqa yoqsa. */
  function dance(t) {
    const s = Math.sin(t * 6), c = Math.cos(t * 6);
    crouch(Math.max(0, -s) * 0.08);   // ritmda sal cho'kkalash
    set('armL', -1.9 + s * 0.5, 0, -0.7);
    set('armR', -1.9 - s * 0.5, 0,  0.7);
    set('foreL', -0.7 + c * 0.5, 0, 0);
    set('foreR', -0.7 - c * 0.5, 0, 0);
    set('hip', 0.05, 0, s * 0.16);
    set('neck', 0, s * 0.35, 0);
    set('legL', Math.max(0, s) * 0.5, 0, 0.05);
    set('legR', Math.max(0, -s) * 0.5, 0, -0.05);
    set('tailL', s * 0.4, 0, -0.32); set('tailR', -s * 0.4, 0, 0.32);
    face({ mouth: 1.8, lid: 0.5 });
  }


  // ── 🙅 Bosh irg'itish (yo'q deyish) ──────────────────────
  function shakeHead(t) {
    set('neck', 0.04, Math.sin(t * 12) * 0.42, 0);
    set('head', 0, Math.sin(t * 12 + 0.4) * 0.18, 0);
    set('armL', 0.08, 0, -0.14); set('armR', 0.08, 0, 0.14);
    set('foreL', -0.25, 0, 0);   set('foreR', -0.25, 0, 0);
    face({ mouth: 0.7, lid: 0.45 });
  }

  /** Bosh + qo'l bilan "yo'q" — ikkinchi marta. */
  function shakeBoth(t) {
    set('neck', 0.05, Math.sin(t * 12) * 0.45, 0);
    set('armR', -1.5, 0, 0.35);
    set('foreR', -0.35, 0, Math.sin(t * 13) * 0.8);   // barmoq silkitish
    set('armL', 0.2, 0, -0.5);
    set('foreL', -1.2, 0, 0);
    face({ mouth: 0.6, lid: 0.55 });
  }

  /** Sabri tugagan — osmonga, keyin yerga qaraydi. */
  function exasperated(p) {
    const up = p < 0.5;
    set('neck', up ? -0.72 : 0.62, 0, 0);
    set('head', up ? -0.25 : 0.18, 0, 0);
    set('armL', 0.35, 0, -1.15);   // qo'llar belda
    set('armR', 0.35, 0,  1.15);
    set('foreL', -1.45, 0, 0); set('foreR', -1.45, 0, 0);
    set('hip', up ? -0.12 : 0.14, 0, 0);
    face({ mouth: up ? 1.6 : 0.5, lid: up ? 0.05 : 0.75 });
  }

  /** Kerakli shaklni qo'l bilan ko'rsatish. */
  function showShape(t, big) {
    const w = big ? 0.55 : 0.28;
    set('armL', -1.15, 0, -w);
    set('armR', -1.15, 0,  w);
    set('foreL', -0.85, 0, 0.25);
    set('foreR', -0.85, 0, -0.25);
    set('neck', 0.12, 0, 0);
    set('hip', -0.04 + Math.sin(t * 3) * 0.02, 0, 0);
    face({ mouth: 1.5, lid: 0.15 });
  }

  /** Mensimaslik — teskari o'girilib, qo'l ko'krakda. */
  function ignore(t) {
    set('neck', -0.08, 0.85, 0);          // boshini burib oladi
    set('head', 0, 0.25, 0);
    set('armL', 0.15, 0, -1.05);
    set('armR', 0.15, 0,  1.05);
    set('foreL', -1.6, 0, 0.3); set('foreR', -1.6, 0, -0.3);
    set('hip', -0.05, 0, 0);
    set('tailL', 0.15, 0, -0.3); set('tailR', 0.15, 0, 0.3);
    face({ mouth: 0.6, lid: 0.62 });
  }

  /** Qo'rqish — qo'llar yuzda, tislanadi. */
  function scared(t) {
    const sh = Math.sin(t * 26) * 0.035;
    set('armL', -2.35, 0, -0.35);
    set('armR', -2.35, 0,  0.35);
    set('foreL', -1.5, 0, 0.4); set('foreR', -1.5, 0, -0.4);
    set('neck', 0.25 + sh, sh * 2, 0);
    set('hip', 0.2, 0, sh);
    set('legL', -0.15, 0, 0.05); set('legR', -0.15, 0, -0.05);
    set('tailL', -0.5, 0, -0.45); set('tailR', -0.5, 0, 0.45);
    face({ mouth: 2.3, lid: 0.02, blush: 0.2 });
  }

  return { set, reset, face, apply,
           /** ⚠ GLB skeleti shu maqsadlarni O'QIYDI (Rig.apply). */
           goals: () => goal,
           crouchAmount: () => crouchGoal,
           crouch,
           faceGoals: () => ({ blush: blushGoal, mouth: mouthGoal, lid: lidGoal }),
           idle, walk, carry, wave, kick, poke, surprised,
           angry, sulk, hug, fall, climb, dance,
           shakeHead, shakeBoth, exasperated, showShape, ignore, scared };
})();

// ============================================================
//  4. HARAKAT — kinematik yurish
// ------------------------------------------------------------
//  ⚠ NEGA RAPIER EMAS: Aiko `objects[]` dagi oddiy `Group`.
//    Unga rigid body bersak, `PlayerController` va gravity gun
//    uni "ko'tarsa bo'ladigan jism" deb hisoblab qolardi va
//    o'yinchi uni havoga uchirib yuborardi. Kinematik yurish
//    to'liq nazoratda va bu loyihada `PlayerController` ham
//    xuddi shunday ishlaydi (`removeRapierBody(obj)` — player.js).
// ============================================================

const Move = (() => {
  const _down = () => new (T().Vector3)(0, -1, 0);
  let _ray = null;

  function ray() {
    if (!_ray) _ray = new (T().Raycaster)();
    return _ray;
  }

  /** Ostidagi yuza balandligini topadi. Topilmasa `null`. */
  function groundAt(pos, ignore, maxDrop) {
    const list = [];
    const objs = window.objects || [];
    for (const o of objs) {
      if (!o || o === ignore || !o.visible) continue;
      const ud = o.userData || {};
      if (ud.isWaifu) continue;
      if (ud.colliderMode === 'inline' && !ud.isPCBlock) continue;  // o'tib ketiladigan
      if (ud.isHitbox || ud.isCamera || ud.isSoundBlock) continue;
      if (ud._isFolder || ud.isGroup) continue;
      list.push(o);
    }
    if (!list.length) return null;
    const r = ray();
    r.set(new (T().Vector3)(pos.x, pos.y + 1.2, pos.z), _down());
    r.far = 1.2 + (maxDrop == null ? 6 : maxDrop);
    let hits = [];
    try { hits = r.intersectObjects(list, true); } catch (e) { return null; }
    for (const h of hits) {
      if (!h.object) continue;
      // Aikoning o'z tanasi
      let p = h.object, mine = false;
      while (p) { if (p === ignore) { mine = true; break; } p = p.parent; }
      if (mine) continue;
      return { y: h.point.y, obj: h.object };
    }
    return null;
  }

  /** Oldinda to'siq bormi? `stepUp` dan past bo'lsa — qadam qo'ysa bo'ladi. */
  function obstacle(pos, dirX, dirZ, footY, dist) {
    const r = ray();
    const from = new (T().Vector3)(pos.x, footY + 0.35, pos.z);
    const dir  = new (T().Vector3)(dirX, 0, dirZ).normalize();
    r.set(from, dir);
    r.far = dist == null ? 0.55 : dist;
    const list = [];
    for (const o of (window.objects || [])) {
      if (!o || !o.visible) continue;
      const ud = o.userData || {};
      if (ud.isWaifu || ud.isHitbox || ud.isCamera || ud._isFolder || ud.isGroup) continue;
      if (ud.colliderMode === 'inline' && !ud.isPCBlock) continue;
      list.push(o);
    }
    let hits = [];
    try { hits = r.intersectObjects(list, true); } catch (e) { return null; }
    return hits.length ? hits[0] : null;
  }

  return { groundAt, obstacle };
})();

// ============================================================
//  5. SEZISH — atrofda nima bor
// ------------------------------------------------------------
//  Har kadr emas, `SCAN_HZ` da bir marta yangilanadi. Sabab:
//  bu yerda `objects` bo'ylab bir necha marta yurish bor va
//  sahnada yuzlab jism bo'lishi mumkin. 6 Hz — qaror qabul
//  qilishga yetarli, lekin kadrga sezilarli yuk emas.
// ============================================================

const SCAN_HZ = 6;

const Sense = (() => {
  const out = {
    liftables: [], round: [], buttons: [], pcs: [],
    hitboxes: [], sounds: [], pickups: [], blocks: [],
    nearest: null, playerDist: 999, playerSeen: false,
  };
  let _acc = 0;

  /** Jismning massasi (fizika bo'lsa) — tepish/ko'tarish kuchi shunga bog'liq. */
  function massOf(o) {
    const ud = o.userData || {};
    if (ud.physics && ud.physics.mass != null) return ud.physics.mass;
    const b = (window.physBodies || []).find(x => x.mesh === o);
    if (b && b.mass != null) return b.mass;
    return 1;
  }

  /** Taxminiy radius — "dumaloqmi va qanchalik katta" savoli uchun. */
  function sizeOf(o) {
    const s = o.scale || { x: 1, y: 1, z: 1 };
    return (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.z)) / 3;
  }

  function isRound(o) {
    const t = String((o.userData && o.userData.type) || '');
    return t === 'Sfera' || t === 'Torus' || t === 'Ikosaedr' ||
           t === 'Ikosedron' || t === 'Oktaedr' || t === 'Oktagedron';
  }

  function isLiftable(o, cfg) {
    const ud = o.userData || {};
    if (ud.isWaifu || ud.isGround || ud.isStatic) return false;
    if (ud.isHitbox || ud.isCamera || ud.isPCBlock || ud.isSoundBlock) return false;
    if (ud.isMapLoader || ud.isPath || ud.isTextBlock || ud.isMiniPad) return false;
    if (ud._isFolder || ud.isGroup) return false;
    if (ud.grabbable === false) return false;
    if (ud._wOwned) return false;                    // allaqachon Aikoda
    if (sizeOf(o) > 2.2) return false;               // juda katta
    if (massOf(o) > (cfg.maxLiftKg || DEF.maxLiftKg)) return false;
    return true;
  }

  function scan(self, cfg, dt) {
    _acc += dt;
    if (_acc < 1 / SCAN_HZ) return out;
    _acc = 0;

    for (const k of ['liftables', 'round', 'buttons', 'pcs', 'hitboxes', 'sounds', 'pickups', 'blocks'])
      out[k].length = 0;

    const pos = self.position;
    const R = cfg.sightRange || DEF.sightRange;
    const R2 = R * R;
    const yaw = self.rotation.y;
    const cone = Math.cos((cfg.sightCone || DEF.sightCone) * Math.PI / 360);

    for (const o of (window.objects || [])) {
      if (!o || o === self || !o.visible) continue;
      const ud = o.userData || {};
      if (ud.isWaifu) continue;
      const dx = o.position.x - pos.x, dz = o.position.z - pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > R2) continue;

      // Ko'rish konusi — orqasidagi narsani "ko'rmaydi"
      const len = Math.sqrt(d2) || 1e-6;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const dot = (dx / len) * fx + (dz / len) * fz;
      const inView = dot > cone || len < 2.0;        // juda yaqin bo'lsa his qiladi
      if (!inView) continue;

      const rec = { obj: o, dist: len };
      if (ud.isPCBlock) out.pcs.push(rec);
      else if (ud.isSoundBlock) out.sounds.push(rec);
      else if (ud.isHitbox) out.hitboxes.push(rec);
      else if (ud.isInteractiveBtn && ud.btnMode === 'pickup') out.pickups.push(rec);
      else if (ud.isInteractiveBtn || ud.isGazeTrigger) out.buttons.push(rec);
      else {
        if (isRound(o)) out.round.push(rec);
        if (isLiftable(o, cfg)) out.liftables.push(rec);
        if (ud.isStatic || ud.isGround) out.blocks.push(rec);
      }
    }

    for (const k of ['liftables', 'round', 'buttons', 'pcs', 'hitboxes', 'sounds', 'pickups', 'blocks'])
      out[k].sort((a, b) => a.dist - b.dist);

    const pp = playerPos();
    out.playerDist = Math.hypot(pp.x - pos.x, pp.z - pos.z);
    const pdx = (pp.x - pos.x) / (out.playerDist || 1e-6);
    const pdz = (pp.z - pos.z) / (out.playerDist || 1e-6);
    out.playerSeen = (pdx * Math.sin(yaw) + pdz * Math.cos(yaw)) > cone || out.playerDist < 2.5;
    return out;
  }

  return { scan, out, massOf, sizeOf, isRound, isLiftable };
})();

// ============================================================
//  6. AIKO — agentning o'zi
// ============================================================

function makeAgent(root) {
  const A = {
    root: root,
    cfg: Object.assign({}, DEF, root.userData.wCfg || {}),
    staredAt: 0,

    // — Holat —
    t: 0,                     // ichki soat
    vy: 0,                    // vertikal tezlik
    onGround: false,
    speed: 0,                 // joriy gorizontal tezlik (animatsiya uchun)
    behavior: null,
    bTime: 0,                 // joriy xatti-harakat davomiyligi
    cool: {},                 // xatti-harakat → qayta ishlatish vaqti

    // — Kayfiyat (0..1) —
    mood: { happy: 0.5, anger: 0, curiosity: 0.5, sad: 0, love: 0 },

    // — Xotira —
    carried: null,            // ko'tarib turgan jism
    stash: [],                // qurilish uchun to'plangan jismlar
    built: [],                // qurgan inshootlari
    stolen: [],               // o'yinchidan olib qo'yganlari
    seenBtns: new Set(),
    wantShape: null, wantBig: false, askStrikes: 0, askCool: 0,
    nagTarget: null, improvise: false,
    rig: null,                // GLB skeleti (bo'lsa)
    afk: 0,                   // o'yinchi qimirlamagan vaqt
    lastPP: null,
    home: root.position.clone(),

    // — Nutq —
    bubble: '', bubbleT: 0,
  };
  return A;
}

/** Pufakchada gapirtiradi. */
function speak(A, text, secs) {
  if (!A.cfg.chatty) return;
  A.bubble = String(text);
  A.bubbleT = secs || 2.6;
}


/**
 * `A.mood` (xatti-harakatlar ishlatadi) va `Brain` hissiyotlari
 * (saqlanadi) o'rtasidagi ko'prik.
 *
 * ⚠ NEGA IKKITA: `A.mood` — kadr-ma-kadr, tez o'zgaradigan
 *   qisqa muddatli holat. `Brain.emotions` — sessiyalar aro
 *   saqlanadigan uzoq muddatli holat. Ikkalasi bir xil emas:
 *   bitta quchoqlash `A.mood.love` ni keskin ko'taradi, lekin
 *   `trust` ga arzimas ta'sir qiladi. Ko'prik ularni sekin
 *   yaqinlashtiradi.
 */
function syncMood(A) {
  const E = Brain.mem().emotions;
  E.anger     = lerp(E.anger,     A.mood.anger, 0.04);
  E.sadness   = lerp(E.sadness,   A.mood.sad,   0.04);
  E.happiness = lerp(E.happiness, A.mood.happy, 0.04);
  A.mood.anger = lerp(A.mood.anger, E.anger, 0.01);
  A.mood.sad   = lerp(A.mood.sad,   E.sadness, 0.01);
  // Mehr — munosabatdan o'sadi
  A.mood.love  = lerp(A.mood.love, Brain.mem().player.relationship, 0.008);
}

/** Kayfiyatni chegara ichida o'zgartiradi. */
function feel(A, key, delta) {
  A.mood[key] = clamp((A.mood[key] || 0) + delta, 0, 1);
}


/**
 * Xotiradagi xarakterni ishchi sozlamalarga uzatadi.
 *
 * ⚠ `cfg` — xatti-harakatlar o'qiydigan tezkor qiymatlar,
 *   `personality` — saqlanadigan va sekin siljiydigan qiymatlar.
 *   Ular sessiya boshida va xarakter o'zgarganda moslashtiriladi.
 */
function applyPersonality(A) {
  const P = Brain.mem().personality;
  A.cfg.curiosity = P.curiosity;
  A.cfg.mischief  = P.mischief;
  A.cfg.temper    = P.stubbornness;
  A.cfg.clumsy    = P.clumsiness;
  A.cfg.affection = P.care;
  A.cfg.chatty    = P.talkativeness > 0.25;
  A.root.userData.wCfg = A.cfg;
}

/** Xatti-harakatni tanlash uchun "hozir mumkinmi" tekshiruvi. */
function ready(A, id) {
  return !(A.cool[id] > 0);
}
function cooldown(A, id, secs) {
  A.cool[id] = secs;
}

// ── Yurish ───────────────────────────────────────────────────
//  `target` — Vector3 yoki null. Qaytaradi: maqsadgacha masofa.

function stepTo(A, target, dt, opts) {
  const o = opts || {};
  const root = A.root;
  const cfg = A.cfg;
  const want = o.run ? cfg.runSpeed : cfg.walkSpeed;
  let dist = 0;

  if (target) {
    const dx = target.x - root.position.x;
    const dz = target.z - root.position.z;
    dist = Math.hypot(dx, dz);
    const stop = o.stopAt == null ? cfg.reach : o.stopAt;

    // Yuz maqsadga buriladi (o'girilib qochish rejimida — teskari)
    const wantYaw = Math.atan2(o.away ? -dx : dx, o.away ? -dz : dz);
    root.rotation.y = turnTo(root.rotation.y, wantYaw, cfg.turnRate, dt);

    if (o.away || dist > stop) {
      const yaw = root.rotation.y;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);

      // To'siq — pastini bo'lsa qadam qo'yamiz, balandini bo'lsa yon oladi
      const foot = root.position.y;
      const hit = Move.obstacle(root.position, fx, fz, foot, 0.6);
      if (hit) {
        const top = hit.point.y;
        if (top - foot <= cfg.stepUp) {
          root.position.y = top + 0.01;          // qadam
          A.onGround = true; A.vy = 0;
        } else if (A.onGround) {
          // Balandroq — sakraydi (aynan shu narsa "blokka chiqish" ni beradi)
          A.vy = cfg.jumpVel;
          A.onGround = false;
        }
      }

      const v = want * (o.slow ? 0.45 : 1);
      root.position.x += fx * v * dt;
      root.position.z += fz * v * dt;
      A.speed = v;
    } else {
      A.speed = lerp(A.speed, 0, clamp(10 * dt, 0, 1));
    }
  } else {
    A.speed = lerp(A.speed, 0, clamp(10 * dt, 0, 1));
  }

  // ── Gravitatsiya + zamin ──────────────────────────────────
  A.vy -= cfg.gravity * dt;
  root.position.y += A.vy * dt;

  const g = Move.groundAt(root.position, root, 8);
  const floor = g ? g.y : 0;
  if (root.position.y <= floor + 0.02) {
    root.position.y = floor;
    if (A.vy < -9 && !A.onGround && (A.tripCool || 0) <= 0) {
      // Juda qattiq tushish — beso'naqaylik hisobiga yiqilishi mumkin
      if (Math.random() < A.cfg.clumsy * 0.25) { A.trip = 0.001; A.tripCool = 45; }
    }
    A.vy = 0;
    A.onGround = true;
  } else {
    A.onGround = false;
  }

  return dist;
}

/** Ko'tarilgan jismni qo'l oldiga bog'laydi. */
function holdObject(A, obj) {
  if (!obj || A.carried) return false;
  A.carried = obj;
  obj.userData._wOwned = true;
  // Fizikani to'xtatamiz — aks holda Rapier uni tortib ketardi
  try { if (window.removeRapierBody) window.removeRapierBody(obj); } catch (e) {}
  obj.userData._wPrevStatic = obj.userData.isStatic;
  return true;
}

/** Ko'tarilgan jismni qo'yib yuboradi (ixtiyoriy kuch bilan). */
function releaseObject(A, impulse) {
  const obj = A.carried;
  if (!obj) return null;
  A.carried = null;
  delete obj.userData._wOwned;
  // Fizikani qaytaramiz
  try {
    if (window.physicsOptsFor && window.addPhysicsBody &&
        !(window.physBodies || []).some(b => b.mesh === obj)) {
      const opts = window.physicsOptsFor(obj);
      if (opts) window.addPhysicsBody(obj, opts);
    }
    if (window.rebuildRapierBody) window.rebuildRapierBody(obj);
  } catch (e) {}
  if (impulse) {
    try {
      const rec = window.rapierBodies && window.rapierBodies.get(obj);
      if (rec && rec.rigidBody && rec.rigidBody.applyImpulse)
        rec.rigidBody.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    } catch (e) {}
  }
  return obj;
}

/** Ko'tarilgan jismni har kadr qo'l oldida ushlab turadi. */
function syncCarried(A) {
  if (!A.carried) return;
  const r = A.root, yaw = r.rotation.y;
  const h = A.cfg.height;
  A.carried.position.set(
    r.position.x + Math.sin(yaw) * 0.48,
    r.position.y + h * 0.55,
    r.position.z + Math.cos(yaw) * 0.48);
  A.carried.rotation.y = yaw;
}


/** O'yinchi hozir qo'lida nima ushlab turibdi (tugma tizimi orqali). */
function heldByPlayer() {
  try {
    const IB = window.InteractiveButtonSystem;
    if (IB && IB.getCarried) {
      const c = IB.getCarried();
      if (c) return c.target || c;
    }
    const GG = window.GravityGunSystem;
    if (GG && GG.held) { const h = GG.held(); if (h) return h.mesh || h; }
    const INV = window.InventorySystem;
    if (INV && INV.heldObject) { const h = INV.heldObject(); if (h) return h; }
  } catch (e) {}
  return null;
}

const SHAPES = ['Kub', 'Sfera', 'Silindr', 'Konus', 'Torus', 'Tekislik', 'Uchburchak'];


// ============================================================
//  6.5 🧠 MIYA — xotira · yangilik · hissiyot · maqsad
// ------------------------------------------------------------
//  Bu qatlam xatti-harakatlar USTIDA turadi. U qaror qabul
//  qilmaydi — xatti-harakatlarning ballarini O'ZGARTIRADI.
//
//  ⚠ NEGA SHUNDAY: agar xotira/hissiyot mantiqini har bir
//    xatti-harakat ichiga yozsak, 15 ta joyda bir xil kod
//    takrorlanardi va yangi xatti-harakat qo'shgan odam ularni
//    unutardi. Bu yerda esa `Brain.bias(id)` bitta son qaytaradi
//    va `choose()` uni HAMMASIGA qo'llaydi.
// ============================================================

const MEM_VERSION = 1;

/** Bo'sh xotira — barcha maydonlar shu yerda bir joyda. */
function blankMemory() {
  return {
    version: MEM_VERSION,
    sessionCount: 0,
    firstSeen: Date.now(),
    lastSeen: Date.now(),

    // ── Xarakter (0..1). Topshiriqdagi 12 ta qiymat ────────
    personality: {
      curiosity: 0.90, playfulness: 0.85, mischief: 0.88, stubbornness: 0.75,
      clumsiness: 0.60, drama: 0.65, independence: 0.70, care: 0.60,
      sensitivity: 0.55, shyness: 0.45, laziness: 0.40, talkativeness: 0.50,
    },
    // Xarakterning boshlang'ich nusxasi — siljish shundan o'lchanadi
    personalityBase: null,

    // ── Hissiyotlar (0..1) ────────────────────────────────
    emotions: {
      happiness: 0.5, sadness: 0, fear: 0, anger: 0, curiosity: 0.5,
      boredom: 0, embarrassment: 0, excitement: 0, stress: 0,
      trust: 0.4, confidence: 0.5, annoyance: 0,
    },

    player: { relationship: 0.4, helps: 0, ignores: 0, angers: 0,
              gifts: 0, rudeWords: 0, niceWords: 0, totalTime: 0 },

    // ── Yangilik: id → {times, lastSession, novelty, liked} ─
    novelty: {},
    favorites: {},                 // id → true (yangilik bloklamaydi)

    learned: {},                   // "obj:action" → {result, confidence, times}
    music:   {},                   // trek → {plays, liked, saturation}
    pranks:  {},                   // prank → {times, lastSession, playerReaction}
    constructions: [],             // {kind, x,z, session, alive}
    locations: {},                 // nom → {x,z, feeling, visits}
    mistakes: [],
    discoveries: [],
    events: [],                    // halqa bufer
    sessions: [],                  // {n, start, end, goals, summary}
  };
}

const Brain = (() => {
  const ADDON = 'waifu';
  let M = blankMemory();
  let loaded = false, dirty = false, saveT = 0;
  let sessionStart = Date.now();
  let sessionEvents = [];
  let goals = [];
  let lastSummary = null;

  // ── Saqlash / yuklash ─────────────────────────────────────
  //  ⚠ Ikki qatlam: server bo'lsa DISK (topshiriq talabi), server
  //    bo'lmasa `localStorage`. Ikkinchisi zaxira — `file://` orqali
  //    ochilganda addon baribir eslab qolsin.
  const LS_KEY = 'apex.waifu.memory';

  function load(cb) {
    const finish = (m, src) => {
      if (m && m.version) M = Object.assign(blankMemory(), m);
      if (!M.personalityBase) M.personalityBase = Object.assign({}, M.personality);
      loaded = true;
      startSession(src);
      if (cb) cb(M, src);
    };

    fetch('/api/addon-memory/load/' + ADDON)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        const f = (d && d.files) || {};
        // Fayllar alohida-alohida saqlanadi — birlashtiramiz
        const m = mergeFiles(f);
        finish(m, Object.keys(f).length ? 'disk' : 'yangi');
      })
      .catch(() => {
        let m = null;
        try { m = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) {}
        finish(m, m ? 'localStorage' : 'yangi');
      });
  }

  /**
   * Topshiriqda xotira ALOHIDA fayllarda talab qilingan
   * (personality.json, emotions.json, …). Diskda shunday
   * saqlaymiz, ichkarida esa bitta obyekt bilan ishlash qulay.
   */
  function splitFiles() {
    return {
      personality:   { personality: M.personality, personalityBase: M.personalityBase },
      emotions:      { emotions: M.emotions },
      player:        { player: M.player },
      novelty:       { novelty: M.novelty, favorites: M.favorites },
      learned:       { learned: M.learned },
      music:         { music: M.music },
      pranks:        { pranks: M.pranks },
      constructions: { constructions: M.constructions },
      locations:     { locations: M.locations },
      mistakes:      { mistakes: M.mistakes.slice(-60) },
      discoveries:   { discoveries: M.discoveries.slice(-60) },
      events:        { events: M.events.slice(-200) },
      sessions:      { sessions: M.sessions.slice(-40),
                       sessionCount: M.sessionCount,
                       firstSeen: M.firstSeen, lastSeen: M.lastSeen,
                       version: M.version },
    };
  }

  function mergeFiles(f) {
    const m = blankMemory();
    for (const k in f) {
      const part = f[k];
      if (part && typeof part === 'object')
        for (const kk in part) m[kk] = part[kk];
    }
    return m.version ? m : null;
  }

  function save(force) {
    if (!loaded) return;
    M.lastSeen = Date.now();
    const files = splitFiles();
    // localStorage — hamisha (zaxira)
    try { localStorage.setItem(LS_KEY, JSON.stringify(M)); } catch (e) {}
    // Disk — server bo'lsa
    fetch('/api/addon-memory/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addon: ADDON, files }),
    }).catch(() => {});
    dirty = false;
  }

  // ── Sessiya ───────────────────────────────────────────────
  function startSession(src) {
    M.sessionCount++;
    sessionStart = Date.now();
    sessionEvents = [];
    lastSummary = M.sessions.length ? M.sessions[M.sessions.length - 1] : null;

    // ⚠ Yangilik VAQT bilan tiklanadi: bir necha sessiya qilinmagan
    //   ish yana qiziq bo'lib qoladi. Aks holda 20-sessiyada Aiko
    //   hamma narsani "zerikarli" deb hisoblab, faqat `idle` qilardi.
    for (const id in M.novelty) {
      const n = M.novelty[id];
      const gap = M.sessionCount - (n.lastSession || 0);
      if (gap > 0) n.novelty = clamp((n.novelty || 0) + gap * 0.18, 0, 1);
    }

    // Hissiyotlar yangi sessiyada yumshaydi, lekin nolga tushmaydi
    for (const k in M.emotions) M.emotions[k] = lerp(M.emotions[k], 0.35, 0.5);
    M.emotions.curiosity = Math.max(M.emotions.curiosity, 0.5);

    goals = pickGoals();
    M.sessions.push({ n: M.sessionCount, start: sessionStart,
                      goals: goals.slice(), summary: null });
    save(true);
  }

  function endSession() {
    const s = M.sessions[M.sessions.length - 1];
    if (s) {
      s.end = Date.now();
      s.summary = sessionEvents.slice(-14);
    }
    M.player.totalTime += (Date.now() - sessionStart) / 1000;
    save(true);
  }

  // ── Yangilik ──────────────────────────────────────────────
  /** 0..1 — 1 = mutlaqo yangi, 0 = joniga tekkan. */
  function novelty(id) {
    if (M.favorites[id]) return 0.85;          // sevimlisi bloklanmaydi
    const n = M.novelty[id];
    if (!n) return 1;
    return clamp(n.novelty == null ? 1 : n.novelty, 0, 1);
  }

  /** Xatti-harakat bajarildi — yangiligi tushadi. */
  function used(id, ok) {
    const n = M.novelty[id] || (M.novelty[id] = { times: 0, novelty: 1 });
    n.times++;
    n.lastSession = M.sessionCount;
    n.lastTime = Date.now();
    // Ketma-ket takrorlansa tezroq tushadi
    n.novelty = clamp((n.novelty == null ? 1 : n.novelty) - 0.26, 0.05, 1);
    if (ok) n.success = (n.success || 0) + 1;
    dirty = true;
  }

  function makeFavorite(id) { M.favorites[id] = true; dirty = true; }

  // ── O'rganish ─────────────────────────────────────────────
  /** "Bu tugma nima qiladi" — kuzatish natijasini yozadi. */
  function learn(objType, action, result, ok) {
    const key = objType + ':' + action;
    const L = M.learned[key] || (M.learned[key] = { times: 0, confidence: 0 });
    L.times++;
    L.result = result;
    // Ishonch takrorlanish bilan o'sadi, xatoda tushadi
    L.confidence = clamp(L.confidence + (ok ? 0.22 : -0.3), 0, 1);
    dirty = true;
    return L;
  }
  function knows(objType, action) {
    const L = M.learned[objType + ':' + action];
    return (L && L.confidence > 0.5) ? L : null;
  }

  // ── Musiqa ────────────────────────────────────────────────
  /**
   * ⚠ To'yinish (saturation): bir xil trek qayta-qayta qo'yilsa
   *   Aiko undan BEZIYDI. Topshiriqning 44-bo'limi. Sevimli trek
   *   ham cheksiz emas — faqat sekinroq to'yinadi.
   */
  function heardMusic(track) {
    const t = M.music[track] || (M.music[track] = { plays: 0, liked: 0.5, saturation: 0 });
    t.plays++;
    t.lastPlayed = Date.now();
    const k = M.favorites['music:' + track] ? 0.06 : 0.14;
    t.saturation = clamp(t.saturation + k, 0, 1);
    if (t.plays === 1) t.liked = 0.45 + Math.random() * 0.4;   // birinchi taassurot
    dirty = true;
    return t;
  }
  /** Trekka bo'lgan hozirgi ishtiyoq (0..1). */
  function musicMood(track) {
    const t = M.music[track];
    if (!t) return 0.6;
    return clamp(t.liked * (1 - t.saturation * 0.85), 0, 1);
  }
  function decayMusic(dt) {
    for (const k in M.music) {
      const t = M.music[k];
      t.saturation = Math.max(0, t.saturation - dt * 0.004);   // sekin unutiladi
    }
  }

  // ── Pranklar ──────────────────────────────────────────────
  function prankDone(kind, reaction) {
    const p = M.pranks[kind] || (M.pranks[kind] = { times: 0 });
    p.times++;
    p.lastSession = M.sessionCount;
    p.lastTime = Date.now();
    if (reaction) p.playerReaction = reaction;
    used('prank:' + kind, true);
    note('prank', kind + ' → ' + (reaction || 'noma\'lum'));
    dirty = true;
  }
  /** Shu prank hozir qanchalik jozibali. */
  function prankScore(kind) {
    const p = M.pranks[kind];
    let s = novelty('prank:' + kind);
    if (p && p.playerReaction === 'angry') s *= 0.35;     // jahli chiqqan edi
    if (p && p.playerReaction === 'laugh') s *= 1.35;     // kulgan edi
    return s;
  }

  // ── Voqealar ──────────────────────────────────────────────
  function note(kind, text, extra) {
    const e = Object.assign({ kind, text, t: Date.now(), s: M.sessionCount }, extra || {});
    M.events.push(e);
    if (M.events.length > 400) M.events.splice(0, M.events.length - 400);
    sessionEvents.push(kind + ': ' + text);
    dirty = true;
  }
  function mistake(text) { M.mistakes.push({ text, t: Date.now(), s: M.sessionCount }); note('mistake', text); }
  function discover(text) { M.discoveries.push({ text, t: Date.now(), s: M.sessionCount }); note('discover', text); }

  function builtStructure(kind, pos) {
    M.constructions.push({ kind, x: +pos.x.toFixed(2), z: +pos.z.toFixed(2),
                           session: M.sessionCount, alive: true, t: Date.now() });
    used('build:' + kind, true);
    note('build', kind + ' qurdi');
  }

  // ── O'yinchi bilan munosabat ──────────────────────────────
  function playerAct(kind) {
    const P = M.player;
    if (kind === 'help')   { P.helps++;  P.relationship = clamp(P.relationship + 0.08, 0, 1); }
    if (kind === 'ignore') { P.ignores++; P.relationship = clamp(P.relationship - 0.04, 0, 1); }
    if (kind === 'anger')  { P.angers++; P.relationship = clamp(P.relationship - 0.07, 0, 1); }
    if (kind === 'gift')   { P.gifts++;  P.relationship = clamp(P.relationship + 0.12, 0, 1); }
    if (kind === 'nice')   { P.niceWords++; P.relationship = clamp(P.relationship + 0.03, 0, 1); }
    if (kind === 'rude')   { P.rudeWords++; P.relationship = clamp(P.relationship - 0.05, 0, 1); }
    dirty = true;
  }

  // ── Xarakter siljishi ─────────────────────────────────────
  /**
   * ⚠ Topshiriqning 64-bo'limi: 1-sessiyadagi va 100-sessiyadagi
   *   Aiko bir xil bo'lmasligi kerak. Siljish JUDA sekin
   *   (sessiyada ~0.02) va chegaralangan (asl qiymatdan ±0.3) —
   *   aks holda bir necha sessiyada xarakter butunlay yo'qolardi.
   */
  function drift(trait, delta) {
    const base = (M.personalityBase && M.personalityBase[trait]);
    if (base == null) return;
    const cur = M.personality[trait];
    const want = clamp(cur + delta, clamp(base - 0.3, 0, 1), clamp(base + 0.3, 0, 1));
    M.personality[trait] = want;
    dirty = true;
  }

  // ── Hissiyot ──────────────────────────────────────────────
  function emo(k, d) { M.emotions[k] = clamp((M.emotions[k] || 0) + d, 0, 1); dirty = true; }
  function emoDecay(dt) {
    const E = M.emotions;
    const to = (k, target, rate) => { E[k] = lerp(E[k], target, clamp(rate * dt, 0, 1)); };
    to('anger', 0, 0.05); to('fear', 0, 0.07); to('excitement', 0.2, 0.06);
    to('annoyance', 0, 0.06); to('embarrassment', 0, 0.12); to('stress', 0, 0.05);
    to('sadness', 0.05, 0.02); to('happiness', 0.45, 0.02);
    // Zerikish O'SADI — faoliyat uni tushiradi
    E.boredom = clamp(E.boredom + dt * 0.012, 0, 1);
    decayMusic(dt);
  }

  // ── Maqsadlar ─────────────────────────────────────────────
  const GOAL_POOL = [
    'explore', 'build', 'play', 'inspect', 'prank', 'rest', 'follow', 'collect',
  ];
  function pickGoals() {
    const P = M.personality;
    const w = {
      explore: P.curiosity, build: P.independence * 0.8 + 0.2,
      play: P.playfulness, inspect: P.curiosity * 0.9,
      prank: P.mischief, rest: P.laziness, follow: P.care,
      collect: P.independence * 0.6 + 0.2,
    };
    const scored = GOAL_POOL.map(g => ({
      g, s: (w[g] || 0.3) * (0.55 + novelty('goal:' + g) * 0.9) * (0.75 + Math.random() * 0.5),
    })).sort((a, b) => b.s - a.s);
    return scored.slice(0, 3).map(x => x.g);
  }

  /**
   * Xatti-harakat balliga qo'shiladigan tuzatish.
   * @returns {number} odatda -0.4 … +0.7
   */
  function bias(id) {
    if (!loaded) return 0;      // xotira hali kelmagan — neytral
    const E = M.emotions, P = M.personality;
    let b = 0;

    // Yangilik — eng muhim omil (topshiriqning 72-bo'limi)
    b += (novelty(id) - 0.5) * 0.55;

    // Maqsadga mos kelsa
    const goalMap = {
      steal: 'collect', build: 'build', press: 'inspect', hack: 'inspect',
      kick: 'play', music: 'play', idle: 'rest', reach: 'explore',
      meddle: 'prank', snatch: 'prank', prank: 'prank', hug: 'follow',
      watch: 'follow', rest: 'rest', explore: 'explore',
    };
    if (goals.indexOf(goalMap[id]) === 0) b += 0.3;
    else if (goals.indexOf(goalMap[id]) > 0) b += 0.15;

    // Hissiyot ta'siri (55-bo'lim)
    if (id === 'prank' || id === 'meddle' || id === 'snatch')
      b += E.boredom * 0.4 + P.mischief * 0.25 - E.fear * 0.5;
    if (id === 'hug' || id === 'watch')
      b += M.player.relationship * 0.35 - E.anger * 0.6;
    if (id === 'sulk' || id === 'ignore')
      b += E.anger * 0.5 + E.sadness * 0.4;
    if (id === 'rest')
      b += P.laziness * 0.4 + E.boredom * 0.2 - E.excitement * 0.3;
    if (id === 'press' || id === 'hack')
      b += E.curiosity * 0.35 + P.curiosity * 0.2;
    if (id === 'shy')
      b += P.shyness * 0.5 + E.embarrassment * 0.6;

    return b;
  }

  return {
    load, save, endSession, startSession,
    mem: () => M,
    goals: () => goals,
    lastSummary: () => lastSummary,
    isLoaded: () => loaded,
    novelty, used, makeFavorite,
    learn, knows,
    heardMusic, musicMood,
    prankDone, prankScore,
    note, mistake, discover, builtStructure,
    playerAct, drift, emo, emoDecay, bias,
    tick(dt) {
      if (!loaded) return;
      emoDecay(dt);
      saveT += dt;
      // ⚠ Muhim voqealar darhol, oddiylari 20 s da bir — topshiriqning
      //   69-bo'limi (performance). Har kadr yozsak server ko'madi.
      if (dirty && saveT > 20) { saveT = 0; save(); }
    },
  };
})();

// ============================================================
//  7. XATTI-HARAKATLAR
// ------------------------------------------------------------
//  Har biri: { id, score(A,S) → son, enter?, tick(A,S,dt), exit? }
//
//  `score` — 0 bo'lsa umuman qatnashmaydi. Eng katta ball
//  yutadi. Joriy xatti-harakat +0.25 bonus oladi (`STICKY`) —
//  aks holda ikki variant teng bo'lsa har kadr almashib,
//  Aiko joyida "titrab" qolardi.
// ============================================================

const STICKY = 0.25;

const BEHAVIORS = [

// ── 😤 Yiqilish — beso'naqaylik. Hamma narsadan ustun ───────
{
  id: 'trip',
  score(A) { return (A.trip != null) ? 100 : 0; },
  enter(A) {
    A.trip = 0;
    speak(A, pick(['Vayy!', 'Uf...', 'Ko\'rmadim!', 'Bu yerda tosh bormidi?!']));
    feel(A, 'anger', 0.12);
  },
  tick(A, S, dt) {
    A.trip += dt;
    const p = A.trip < 0.35 ? (A.trip / 0.35) : 1;
    Pose.fall(p);
    stepTo(A, null, dt);
    if (A.trip > 1.6) {
      A.trip = null;
      speak(A, pick(['Hech kim ko\'rmadi-ku?', 'Men ataylab qildim.', 'Hmph!']));
      cooldown(A, 'trip', 6);
      A.done = true;
    }
  },
},

// ── 🤗 Quchoqlash ───────────────────────────────────────────
{
  id: 'hug',
  score(A, S) {
    if (!isPlay()) return 0;
    if (!ready(A, 'hug')) return 0;
    if (A.mood.love < 0.55) return 0;
    if (S.playerDist > 6) return 0;
    return 0.55 + A.mood.love * 0.5 - A.mood.anger * 0.4;
  },
  enter(A) { A.hugP = 0; speak(A, pick(['Kel bu yoqqa!', 'Sog\'indim!', 'Bir daqiqa...'])); },
  tick(A, S, dt) {
    const pp = playerPos();
    const d = stepTo(A, pp, dt, { stopAt: 0.85, run: S.playerDist > 3 });
    if (d > 1.0) { Pose.walk(A.t, S.playerDist > 3); return; }
    A.hugP = Math.min(1, (A.hugP || 0) + dt * 1.6);
    Pose.hug(A.hugP);
    if (A.hugP >= 1) {
      A.hugT = (A.hugT || 0) + dt;
      if (A.hugT > 1.2 && !A.kissed && A.mood.love > 0.85) {
        A.kissed = true;
        spawnHearts(A, 6);
        speak(A, pick(['💗', 'Mana shunday!', 'Hech kimga aytma.']));
        feel(A, 'happy', 0.3);
      }
      if (A.hugT > 2.2) {
        A.hugT = 0; A.kissed = false;
        speak(A, pick(['Bo\'ldi, yetadi!', 'Uyaldim...', 'Endi ishga.']));
        feel(A, 'love', -0.35);
        cooldown(A, 'hug', 25);
        A.done = true;
      }
    }
  },
  exit(A) { A.hugP = 0; A.hugT = 0; A.kissed = false; },
},

// ── 💢 Hafa bo'lish — o'yinchi AFK ──────────────────────────
{
  id: 'sulk',
  score(A, S) {
    if (!isPlay()) return 0;
    if (A.afk < A.cfg.afkLimit) return 0;
    return 0.7 + Math.min(0.5, (A.afk - A.cfg.afkLimit) / 30);
  },
  enter(A) {
    speak(A, pick(['Yana qimirlamayapsiz.', 'Zerikdim.', 'Men bu yerdaman, aytganday.']), 4);
    feel(A, 'sad', 0.5);
  },
  tick(A, S, dt) {
    // O'yinchidan teskari o'girilib, biroz nariga boradi va cho'kkalaydi
    const pp = playerPos();
    const dx = A.root.position.x - pp.x, dz = A.root.position.z - pp.z;
    const far = Math.hypot(dx, dz);
    if (far < 4.5) {
      stepTo(A, pp, dt, { away: true, slow: true });
      Pose.walk(A.t, false);
    } else {
      stepTo(A, null, dt);
      Pose.sulk(A.t);
      A.sulkT = (A.sulkT || 0) + dt;
      if (A.sulkT > 3 && Math.random() < dt * 0.4)
        speak(A, pick(['...', 'Hmph.', 'Bir gapiring-da.', 'Men xafaman.']), 3);
    }
    if (A.afk < 1.5) {                     // o'yinchi qimirladi
      speak(A, pick(['Nihoyat!', 'Uyg\'ondingizmi?', 'Kech qoldingiz.']));
      feel(A, 'sad', -0.6);
      A.sulkT = 0;
      A.done = true;
    }
  },
  exit(A) { A.sulkT = 0; },
},

// ── 🎵 Musiqa — cho'chish yoki raqs ─────────────────────────
{
  id: 'music',
  score(A, S) {
    if (!isPlay() || !S.sounds.length) return 0;
    if (!ready(A, 'music')) return 0;
    const near = S.sounds[0];
    if (near.dist > 7) return 0;
    return 0.75;
  },
  enter(A, S) {
    // ⚠ Trekni xotiradan tekshiramiz: ko'p eshitilgan bo'lsa
    //   Aiko undan BEZIYDI va raqsga tushmaydi (44-bo'lim).
    const src = S.sounds[0] && S.sounds[0].obj;
    A.musicTrack = String((src && src.userData &&
      (src.userData.soundName || src.userData.src || src.userData.name)) || 'trek');
    let want = 0.6;
    try { Brain.heardMusic(A.musicTrack); want = Brain.musicMood(A.musicTrack); } catch (e) {}
    A.musicWant = want;
    if (want < 0.28) {
      A.musicMode = 'bored';
      speak(A, pick(['Yana shu qo\'shiqmi…', 'Buni juda ko\'p eshitdim.',
                     'Boshqasini qo\'ying.']), 3.5);
      A.musicT = 0;
      return;
    }
    // 50/50: cho'chib tushadi yoki o'ynaydi. Jahli chiqqan bo'lsa —
    // cho'chish ehtimoli yuqori.
    A.musicMode = (Math.random() < 0.35 + A.mood.anger * 0.3) ? 'scare' : 'dance';
    A.musicT = 0;
    speak(A, A.musicMode === 'scare'
      ? pick(['Voy!', 'Bu nima ovoz?!', 'Qo\'rqitdingiz!'])
      : pick(['Bu qo\'shiq zo\'r!', '♪♪♪', 'Men raqsga tushaman!']));
  },
  tick(A, S, dt) {
    A.musicT += dt;
    if (A.musicMode === 'bored') {
      // Bezib uzoqlashadi
      stepTo(A, S.sounds[0] ? S.sounds[0].obj.position : null, dt, { away: true });
      Pose.ignore(A.t);
      try { Brain.emo('annoyance', dt * 0.15); } catch (e) {}
      if (A.musicT > 4) { cooldown(A, 'music', 30); A.done = true; }
      return;
    }
    if (A.musicMode === 'scare') {
      Pose.surprised(A.t);
      stepTo(A, S.sounds[0] ? S.sounds[0].obj.position : null, dt, { away: true, run: true });
      if (A.musicT > 2.2) { A.musicMode = 'dance'; A.musicT = 0; speak(A, 'Ha, mayli... yoqimli ekan.'); }
    } else {
      stepTo(A, null, dt);
      Pose.dance(A.t);
      feel(A, 'happy', dt * 0.12);
      if (A.musicT > 7) {
        // Yoqqan bo'lsa sevimliga aylanishi mumkin
        try {
          if (A.musicWant > 0.75 && Math.random() < 0.4) {
            Brain.makeFavorite('music:' + A.musicTrack);
            Brain.note('music', A.musicTrack + ' — sevimli bo\'ldi');
            speak(A, pick(['Bu qo\'shiq menga yoqadi!', 'Yana qo\'ying!']), 3);
          }
          Brain.emo('happiness', 0.3); Brain.emo('boredom', -0.4);
        } catch (e) {}
        cooldown(A, 'music', 20);
        A.done = true;
      }
    }
  },
},

// ── 🥱 O'g'irlash: jismni ko'tarib o'yinchidan qochish ──────
{
  id: 'steal',
  score(A, S) {
    if (!isPlay()) return 0;
    if (A.carried) return 0;
    if (!S.liftables.length) return 0;
    if (!ready(A, 'steal')) return 0;
    const near = S.liftables[0];
    const bonus = (S.playerDist < 6) ? 0.25 : 0;    // ko'z oldida qilish qiziqroq
    return 0.42 + A.cfg.mischief * 0.5 + bonus - near.dist * 0.02;
  },
  enter(A, S, keepTarget) {
    if (!keepTarget) A.target = S.liftables[0] ? S.liftables[0].obj : null;
    A.stealPhase = 'go';
    speak(A, pick(['Bu meniki endi.', 'Menga kerak bo\'ladi.', 'Ko\'zingizni yumdingizmi?']));
  },
  tick(A, S, dt) {
    if (!A.target || !A.target.parent) { A.done = true; return; }
    if (A.stealPhase === 'go') {
      const d = stepTo(A, A.target.position, dt, { stopAt: 0.9, run: true });
      Pose.walk(A.t, true);
      if (d <= 1.0) {
        if (holdObject(A, A.target)) {
          A.stealPhase = 'run';
          A.stealT = 0;
          A.stolen.push(A.target.userData.id);
          feel(A, 'happy', 0.2);
          speak(A, pick(['Oldim!', 'Tutolmaysiz!', 'Xihi.']));
        } else { A.done = true; }
      }
    } else {
      A.stealT += dt;
      // O'yinchidan qochib, "uy" tomon eltadi
      const pp = playerPos();
      const runFrom = (S.playerDist < 9);
      stepTo(A, runFrom ? pp : A.home, dt, { away: runFrom, run: true, stopAt: 1.4 });
      Pose.carry(A.t);
      const homeD = Math.hypot(A.root.position.x - A.home.x, A.root.position.z - A.home.z);
      if ((!runFrom && homeD < 2.0) || A.stealT > 14) {
        const obj = releaseObject(A, null);
        if (obj) A.stash.push(obj);
        speak(A, pick(['Shu yerda tursin.', 'To\'plam o\'sib boryapti.', 'Yana kerak.']));
        cooldown(A, 'steal', 4);
        A.done = true;
      }
    }
  },
  // ⚠ Yarim yo'lda uzilsa (boshqa xatti-harakat ustun chiqsa) jism
  //   qo'lida QOLIB KETARDI: `syncCarried` uni har kadr qo'l oldiga
  //   ko'chirar, fizikasi esa o'chirilgan bo'lardi — jism abadiy
  //   havoda osilib yurardi. Chiqishda albatta qo'yib yuboramiz.
  exit(A) {
    if (A.carried) {
      const obj = releaseObject(A, null);
      if (obj && A.stash.indexOf(obj) < 0) A.stash.push(obj);
    }
    A.target = null; A.stealPhase = null;
  },
},

// ── 🏠 Qurish — to'plangan jismlardan inshoot ───────────────
{
  id: 'build',
  score(A) {
    if (A.carried) return 0;
    if (A.stash.length < (A.cfg.stashGoal || DEF.stashGoal)) return 0;
    if (!ready(A, 'build')) return 0;
    return 0.9 + A.cfg.curiosity * 0.3;
  },
  enter(A) {
    // ⚠ Avval loyihaga YETISHMAYDIGAN shakl bormi? Bo'lsa —
    //   qurishni boshlamay, o'yinchidan so'raydi (`ask` ustun ball
    //   oladi va shu zahoti almashadi).
    if (!A.improvise) {
      const need = missingShape(A);
      if (need) {
        A.wantShape = need.shape;
        A.wantBig = need.big;
        // O'yinchining QO'LIDA aynan shu shakl bo'lsa — injiqlik rejimi
        const held = heldByPlayer();
        if (held && String(held.userData && held.userData.type) === need.shape) {
          A.nagTarget = held;
          A.wantShape = null;
        }
        A.done = true;
        return;
      }
    }
    A.improvise = false;
    A.plan = planStructure(A);
    A.planI = 0;
    speak(A, pick(['Men uy quraman!', 'Loyiha tayyor.', 'Endi chinakam ish.']), 3.5);
  },
  tick(A, S, dt) {
    if (!A.plan || A.planI >= A.plan.length) {
      speak(A, pick(['Tugadi! Chiroyli chiqdimi?', 'Mana shunday quriladi.', 'Maqtang endi.']), 4);
      A.built.push(A.plan ? A.plan.length : 0);
      try { Brain.builtStructure(A.buildName || 'inshoot', A.home);
            Brain.emo('confidence', 0.2); } catch (e) {}
      feel(A, 'happy', 0.4);
      cooldown(A, 'build', 40);
      A.done = true;
      return;
    }
    const step = A.plan[A.planI];
    if (!step.obj || !step.obj.parent) { A.planI++; return; }

    if (!A.carried) {
      const d = stepTo(A, step.obj.position, dt, { stopAt: 0.9, run: false });
      Pose.walk(A.t, false);
      if (d <= 1.0) holdObject(A, step.obj);
    } else {
      const d = stepTo(A, step.to, dt, { stopAt: 1.0, run: false });
      Pose.carry(A.t);
      if (d <= 1.1) {
        const obj = releaseObject(A, null);
        if (obj) {
          obj.position.copy(step.to);
          obj.rotation.y = step.rot || 0;
          obj.userData.isStatic = true;              // inshoot qulamasin
          try { if (window.rebuildRapierBody) window.rebuildRapierBody(obj); } catch (e) {}
        }
        A.planI++;
        if (A.planI % 2 === 0) speak(A, pick(['Bir...', 'Ikki...', 'Shunday...', 'Deyarli!']), 1.6);
      }
    }
  },
  // ⚠ `steal` dagi bilan bir xil sabab — uzilganda g'isht qo'lida
  //   qolib ketmasin. Qolgan reja `stash` ga qaytadi va keyingi
  //   safar qurilish davom etadi.
  exit(A) {
    if (A.carried) {
      const obj = releaseObject(A, null);
      if (obj && A.stash.indexOf(obj) < 0) A.stash.push(obj);
    }
    if (A.plan) {
      for (let i = A.planI; i < A.plan.length; i++) {
        const o = A.plan[i].obj;
        if (o && o.parent && A.stash.indexOf(o) < 0) A.stash.push(o);
      }
    }
    A.plan = null; A.planI = 0;
  },
},

// ── 🧱 O'YINCHIDAN BLOK SO'RASH ─────────────────────────────
//  Qurish paytida kerakli shakl topilmasa, Aiko o'yinchidan
//  SO'RAYDI: qo'li bilan shaklni ko'rsatadi va kutadi.
//
//  ⚠ Sabr bosqichlari (talab bo'yicha):
//     1-xato → boshini irg'itadi
//     2-xato → bosh + qo'l bilan irg'itadi
//     3-xato → osmonga, keyin yerga qaraydi va shaklni QAYTA ko'rsatadi
//     4-xato → sabri tugadi: boshqa shakl bilan quradi
//
//  ⚠ "O'yinchi ishlatayotgan shakl" holati alohida: u injiq
//    kichkina qizchaday talab qiladi, bermasa hafa bo'ladi.
{
  id: 'ask',
  score(A, S) {
    if (!isPlay()) return 0;
    if (!A.wantShape) return 0;                  // `build` qo'yadi
    return 1.15;                                 // qurishdan ham ustun
  },
  enter(A, S) {
    A.askPhase = 'show';
    A.askT = 0;
    A.askStrikes = A.askStrikes || 0;
    A.askHeldSeen = false;
    speak(A, A.askStrikes === 0
      ? pick(['Menga ' + A.wantShape + ' kerak!', A.wantShape + ' bering.',
              'Hoy, ' + A.wantShape + ' toping.'])
      : pick(['Yana ayting — ' + A.wantShape + '.', 'Men ' + A.wantShape + ' dedim.']), 4);
  },
  tick(A, S, dt) {
    A.askT += dt;
    const pp = playerPos();
    // O'yinchiga qarab turadi
    A.root.rotation.y = turnTo(A.root.rotation.y,
      Math.atan2(pp.x - A.root.position.x, pp.z - A.root.position.z), A.cfg.turnRate, dt);
    stepTo(A, S.playerDist > 3.5 ? pp : null, dt, { stopAt: 2.6 });

    // ── O'yinchi biror narsa uzatdimi? ──────────────────
    const held = heldByPlayer();
    if (held && held !== A.askLastHeld) {
      A.askLastHeld = held;
      const t = String((held.userData && held.userData.type) || '');
      if (t === A.wantShape) {
        // ✅ To'g'ri shakl
        A.askPhase = 'happy';
        A.askT = 0;
        A.stash.push(held);
        try { if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.releaseCarried)
                window.InteractiveButtonSystem.releaseCarried(); } catch (e) {}
        speak(A, pick(['Mana! Rahmat!', 'Shu, shu!', 'Bilardim topasiz deb.']), 3);
        feel(A, 'happy', 0.35); feel(A, 'love', 0.15); feel(A, 'anger', -0.2);
        A.askStrikes = 0;
      } else {
        // ❌ Noto'g'ri shakl — sabr bosqichi oshadi
        A.askStrikes++;
        A.askT = 0;
        A.askPhase = (A.askStrikes === 1) ? 'no1'
                   : (A.askStrikes === 2) ? 'no2'
                   : (A.askStrikes === 3) ? 'no3' : 'giveup';
        feel(A, 'anger', 0.18);
        speak(A, {
          no1: pick(['Yo\'q.', 'Bu emas.', 'Hmm... yo\'q.']),
          no2: pick(['Yo\'q dedim!', 'Qarang-da!', 'Bu ' + A.wantShape + ' emas.']),
          no3: pick(['Uf... yana bir marta ko\'rsataman.', 'Diqqat bilan qarang!',
                     'Menga ' + A.wantShape + ' KERAK.']),
          giveup: pick(['Mayli, o\'zim boshqacha qilaman.', 'Kerakmas endi.',
                        'Sizsiz ham quraman.']),
        }[A.askPhase], 3.5);
      }
    }

    // ── Bosqichlarni ijro etish ─────────────────────────
    switch (A.askPhase) {
      case 'show':
        Pose.showShape(A.t, A.wantBig);
        // ⚠ SABR CHEKLANGAN. Ilgari `show` fazasi CHEKSIZ edi:
        //   o'yinchi e'tibor bermasa Aiko blok so'rab abadiy turib
        //   qolardi va boshqa hech narsa qilmasdi (o'lchovda
        //   vaqtning 86% i shunga ketardi). Endi 25 soniyadan
        //   keyin o'zi hal qiladi — ayni "giveup" yo'li.
        A.askWait = (A.askWait || 0) + dt;
        if (A.askT > 9) {
          A.askT = 0;
          feel(A, 'sad', 0.15);
          speak(A, pick(['Kutyapman...', 'Beradigan bo\'ldingizmi?',
                         'Men shu yerda turibman.']), 3);
        }
        if (A.askWait > 25) {
          A.askPhase = 'giveup';
          A.askT = 0;
          speak(A, pick(['Kerakmas endi.', 'O\'zim topaman.',
                         'Yaxshi, o\'zim qilaman.']), 3.5);
          try { Brain.emo('sadness', 0.25); Brain.playerAct('ignore'); } catch (e) {}
        }
        break;

      case 'no1':                                 // 1️⃣ boshini irg'itadi
        Pose.shakeHead(A.t);
        if (A.askT > 1.4) { A.askPhase = 'show'; A.askT = 0; }
        break;

      case 'no2':                                 // 2️⃣ bosh + qo'l
        Pose.shakeBoth(A.t);
        if (A.askT > 1.9) { A.askPhase = 'show'; A.askT = 0; }
        break;

      case 'no3':                                 // 3️⃣ osmon → yer → qayta ko'rsatish
        if (A.askT < 2.2) Pose.exasperated(A.askT / 2.2);
        else Pose.showShape(A.t, A.wantBig);
        if (A.askT > 4.5) { A.askPhase = 'show'; A.askT = 0; }
        break;

      case 'happy':
        Pose.wave(A.t);
        if (A.askT > 1.8) { A.wantShape = null; A.done = true; }
        break;

      case 'giveup':                              // 4️⃣ boshqacha quradi
        Pose.ignore(A.t);
        if (A.askT > 2.4) {
          A.wantShape = null;
          A.askStrikes = 0;
          A.improvise = true;                     // `build` buni o'qiydi
          feel(A, 'sad', 0.35);
          A.done = true;
        }
        break;
    }
  },
  exit(A) {
    // ⚠ So'rov YOPILADI. Aks holda `wantShape` qolib, `ask` darhol
    //   qaytadan g'olib chiqardi (uning bali 1.15 — deyarli hamma
    //   narsadan yuqori) va sikl uzilmasdi.
    A.wantShape = null;
    A.askPhase = null; A.askLastHeld = null; A.askWait = 0;
    A.askCool = 60;                  // keyingi so'rov eng erta 60 s dan keyin
  },
},

// ── 😤 INJIQLIK — o'yinchi ishlatayotgan shaklni talab qilish ──
//  ⚠ `ask` dan farqi: bu yerda shakl o'yinchining QO'LIDA. Aiko
//    uni ko'radi va kichkina qizchaday turib oladi. Bermasa —
//    quvonch emas, hafalik (jahl emas): u xafa bo'ladi.
{
  id: 'nag',
  score(A, S) {
    if (!isPlay()) return 0;
    if (!A.nagTarget) return 0;
    return 1.05;
  },
  enter(A) {
    A.nagT = 0; A.nagStage = 0;
    speak(A, pick(['U meniki bo\'lishi kerak!', 'Menga bering, iltimos...',
                   'Sizga kerakmasdi-ku?']), 3.5);
  },
  tick(A, S, dt) {
    A.nagT += dt;
    const pp = playerPos();
    stepTo(A, pp, dt, { stopAt: 1.6, run: A.nagT < 2 });

    // Hali qo'lidami?
    const held = heldByPlayer();
    if (held !== A.nagTarget) {
      if (!held) {
        // Qo'yib yubordi — o'zi olib ketadi
        speak(A, pick(['Mana shunday!', 'Rahmat!', 'Bilardim!']), 2.5);
        A.stash.push(A.nagTarget);
        feel(A, 'happy', 0.4); feel(A, 'love', 0.2);
      }
      A.nagTarget = null;
      A.done = true;
      return;
    }

    // Bosqichma-bosqich injiqlik → hafalik
    if (A.nagT < 3)      { Pose.showShape(A.t, false); }
    else if (A.nagT < 5) { Pose.shakeBoth(A.t);
                           if (A.nagStage < 1) { A.nagStage = 1;
                             speak(A, pick(['Bering deyapman!', 'Yaxshi emas bu!']), 2.5); } }
    else if (A.nagT < 8) { Pose.exasperated((A.nagT - 5) / 3);
                           if (A.nagStage < 2) { A.nagStage = 2;
                             speak(A, pick(['Hech kim meni tinglamaydi.',
                                            'Mayli...']), 3); } }
    else {
      // Hafa bo'ladi va ketadi
      Pose.sulk(A.t);
      if (A.nagStage < 3) {
        A.nagStage = 3;
        speak(A, pick(['Endi men xafaman.', 'Bermadingiz-a.', '...']), 4);
        feel(A, 'sad', 0.6); feel(A, 'love', -0.25);
      }
      if (A.nagT > 11) { A.nagTarget = null; A.done = true; }
    }
  },
  exit(A) { A.nagTarget = null; A.nagT = 0; A.nagStage = 0; A.askCool = 60; },
},

// ── 😈 PRANK — darajali bezorilik ───────────────────────────
//  ⚠ Prank tanlash XOTIRAGA bog'liq: o'yinchi kulgan bo'lsa
//    ehtimol oshadi, jahli chiqqan bo'lsa tushadi (51–52-bo'lim).
//    Xavf bo'lsa prank umuman qilinmaydi.
{
  id: 'prank',
  score(A, S) {
    if (!isPlay()) return 0;
    if (!ready(A, 'prank')) return 0;
    const M = Brain.mem();
    const misch = M.personality.mischief;
    if (misch < 0.2) return 0;                       // 0–20: prank yo'q
    if (M.emotions.fear > 0.6) return 0;             // xavfda — prank yo'q
    if (S.playerDist > 18) return 0;
    return 0.35 + misch * 0.45 + M.emotions.boredom * 0.35;
  },
  enter(A, S) {
    // Daraja mischief bo'yicha, tur esa xotira bo'yicha tanlanadi
    const M = Brain.mem();
    const misch = M.personality.mischief;
    const pool = ['blockView', 'mimic', 'peekaboo', 'hide'];
    if (misch > 0.4) pool.push('moveThing');
    if (misch > 0.6) pool.push('stealOne', 'beatToButton');
    if (misch > 0.8) pool.push('stare');
    A.prank = pool.map(k => ({ k, s: Brain.prankScore(k) * (0.6 + Math.random() * 0.8) }))
                  .sort((a, b) => b.s - a.s)[0].k;
    A.prankT = 0;
    A.prankSpot = null;
    speak(A, pick(['Hihi.', '…', 'Bir ko\'ray-chi.']), 2);
  },
  tick(A, S, dt) {
    A.prankT += dt;
    const pp = playerPos();

    switch (A.prank) {
      case 'blockView': {           // LEVEL 1 — kamera oldida turish
        const cam = window.camera;
        const tgt = cam ? new (T().Vector3)(
          pp.x + (cam.position.x - pp.x) * 0.25,
          pp.y, pp.z + (cam.position.z - pp.z) * 0.25) : pp;
        stepTo(A, tgt, dt, { stopAt: 0.7, run: true });
        Pose.walk(A.t, true);
        if (A.prankT > 3) { Pose.ignore(A.t); }
        break;
      }
      case 'mimic': {               // o'yinchiga taqlid
        stepTo(A, pp, dt, { stopAt: 2.0, run: S.playerDist > 5 });
        Pose.walk(A.t, false);
        A.root.rotation.y = turnTo(A.root.rotation.y,
          (window.PlayerController && window.PlayerController.camYaw) || A.root.rotation.y,
          A.cfg.turnRate * 0.5, dt);
        break;
      }
      case 'peekaboo': {            // birdan paydo bo'lish
        if (A.prankT < 2.5) { stepTo(A, pp, dt, { stopAt: 1.2, run: true }); Pose.walk(A.t, true); }
        else { Pose.surprised(A.t); stepTo(A, null, dt);
               if (A.prankT < 2.6) speak(A, pick(['BA!', 'Salom!', 'Ku-ku!']), 2); }
        break;
      }
      case 'hide': {                // obyekt orqasiga yashirinish
        if (!A.prankSpot) {
          const c = S.blocks[0] || S.liftables[0];
          A.prankSpot = c ? c.obj.position.clone() : null;
        }
        if (A.prankSpot) {
          const away = new (T().Vector3)(
            A.prankSpot.x + (A.prankSpot.x - pp.x) * 0.4, A.prankSpot.y,
            A.prankSpot.z + (A.prankSpot.z - pp.z) * 0.4);
          stepTo(A, away, dt, { stopAt: 0.6, run: true });
          Pose.walk(A.t, true);
        } else { Pose.idle(A.t); stepTo(A, null, dt); }
        break;
      }
      case 'moveThing': {           // dekoratsiyani siljitish
        const t = S.liftables[0];
        if (!t) { A.done = true; break; }
        if (!A.carried) {
          const d = stepTo(A, t.obj.position, dt, { stopAt: 0.9, run: true });
          Pose.walk(A.t, true);
          if (d <= 1.0) holdObject(A, t.obj);
        } else {
          stepTo(A, A.home, dt, { stopAt: 1.4, run: true });
          Pose.carry(A.t);
          if (A.prankT > 6) { releaseObject(A, null); A.done = true; }
        }
        break;
      }
      case 'stealOne': {            // bitta zararsiz blok
        const t = S.liftables[0];
        if (!t) { A.done = true; break; }
        if (!A.carried) {
          const d = stepTo(A, t.obj.position, dt, { stopAt: 0.9, run: true });
          Pose.walk(A.t, true);
          if (d <= 1.0) { holdObject(A, t.obj); speak(A, pick(['Meniki!', 'Xihi!']), 2); }
        } else {
          stepTo(A, pp, dt, { away: true, run: true });
          Pose.carry(A.t);
          if (A.prankT > 7) { const o = releaseObject(A, null);
                              if (o) A.stash.push(o); A.done = true; }
        }
        break;
      }
      case 'beatToButton': {        // o'yinchidan oldin bosish
        const b = S.buttons[0];
        if (!b) { A.done = true; break; }
        const d = stepTo(A, b.obj.position, dt, { stopAt: 1.0, run: true });
        Pose.walk(A.t, true);
        if (d <= 1.1) {
          try { window.InteractiveButtonSystem &&
                window.InteractiveButtonSystem.fire(b.obj); } catch (e) {}
          speak(A, pick(['Men birinchi!', 'Kech qoldingiz!']), 2.5);
          A.done = true;
        }
        break;
      }
      default: {                    // stare — jim kuzatish
        stepTo(A, pp, dt, { stopAt: 3.2 });
        A.root.rotation.y = turnTo(A.root.rotation.y,
          Math.atan2(pp.x - A.root.position.x, pp.z - A.root.position.z), 5, dt);
        Pose.idle(A.t);
        Pose.face({ lid: 0.15, mouth: 0.6 });
        break;
      }
    }

    if (A.prankT > 10) A.done = true;
  },
  exit(A) {
    if (A.carried) { const o = releaseObject(A, null); if (o) A.stash.push(o); }
    // ⚠ Natijani xotiraga yozamiz. O'yinchining reaksiyasini
    //   to'g'ridan-to'g'ri bilmaymiz, shuning uchun TAXMIN:
    //   yaqin kelib turgan bo'lsa "ko'rdi", uzoqda bo'lsa "sezmadi".
    const near = A.root.position.distanceTo(playerPos()) < 5;
    Brain.prankDone(A.prank || 'unknown', near ? 'noticed' : 'unseen');
    Brain.emo('boredom', -0.35);
    Brain.emo('happiness', 0.15);
    A.prank = null; A.prankT = 0; A.prankSpot = null;
  },
},

// ── 😳 UYALISH — o'yinchi uzoq qarab tursa ──────────────────
//  ⚠ "Qarab turish" — kamera yo'nalishi Aikoga qaratilgani.
//    `A.staredAt` sekundlarda hisoblanadi (update ichida).
{
  id: 'shy',
  score(A, S) {
    if (!isPlay()) return 0;
    if (!ready(A, 'shy')) return 0;
    if ((A.staredAt || 0) < 4) return 0;
    return 0.7 + Brain.mem().personality.shyness * 0.5;
  },
  enter(A) {
    A.shyT = 0;
    // Jahli chiqqan bo'lsa uyalmaydi — g'azablanadi (34-qator talabi)
    A.shyAngry = Brain.mem().emotions.anger > 0.55 && Math.random() < 0.6;
    Brain.emo('embarrassment', 0.5);
    speak(A, A.shyAngry
      ? pick(['Nega tikilib turibsiz?!', 'Bas qiling!'])
      : pick(['N-nega qarayapsiz…', 'Menga qaramang!', 'U-uf…']), 3);
  },
  tick(A, S, dt) {
    A.shyT += dt;
    const pp = playerPos();

    if (A.shyAngry) {
      // Jahl: kameraga fizik jism otadi
      if (!A.carried && S.liftables.length && A.shyT < 4) {
        const t = S.liftables[0];
        const d = stepTo(A, t.obj.position, dt, { stopAt: 0.9, run: true });
        Pose.walk(A.t, true);
        if (d <= 1.0) holdObject(A, t.obj);
      } else if (A.carried) {
        A.root.rotation.y = turnTo(A.root.rotation.y,
          Math.atan2(pp.x - A.root.position.x, pp.z - A.root.position.z), 8, dt);
        stepTo(A, null, dt);
        Pose.kick(Math.min(1, (A.shyT - 4) / 0.8));
        if (A.shyT > 4.8) {
          const yaw = A.root.rotation.y;
          releaseObject(A, { x: Math.sin(yaw) * 9, y: 4, z: Math.cos(yaw) * 9 });
          speak(A, pick(['Mana sizga!', 'Endi qarang!']), 3);
          Brain.note('throw', 'kameraga jism otdi');
          Brain.emo('anger', -0.3);
          A.done = true;
        }
      } else { Pose.angry(A.t); stepTo(A, null, dt); if (A.shyT > 5) A.done = true; }
      return;
    }

    // Oddiy uyalish: qarashini olib qochadi, band bo'lib ko'rinadi
    if (A.shyT < 2) {
      Pose.ignore(A.t);
      stepTo(A, null, dt);
    } else if (A.shyT < 5) {
      stepTo(A, pp, dt, { away: true, slow: true });
      Pose.walk(A.t, false);
      Pose.face({ blush: 0.7, lid: 0.6 });
    } else {
      Pose.poke((Math.sin(A.t * 4) + 1) / 2);       // "band" ko'rinadi
      stepTo(A, null, dt);
      if (A.shyT > 8) {
        // Keyin o'yinchi oldiga borishi mumkin
        if (Brain.mem().player.relationship > 0.55 && Math.random() < 0.5) {
          Brain.emo('happiness', 0.2);
          A.mood.love = Math.max(A.mood.love, 0.6);
        }
        A.done = true;
      }
    }
    A.staredAt = 0;
    cooldown(A, 'shy', 20);
  },
  exit(A) { A.shyT = 0; A.staredAt = 0; A.shyAngry = false; },
},

// ── 😴 DAM OLISH / UXLASH ───────────────────────────────────
{
  id: 'rest',
  score(A, S) {
    if (!ready(A, 'rest')) return 0;
    const M = Brain.mem();
    // ⚠ ILGARI JUDA TEZ-TEZ G'OLIB CHIQARDI: bazasi 0.25 +
    //   dangasalik×0.5 ≈ 0.45, `idle` esa atigi 0.2 — Aiko deyarli
    //   doim yotib qolardi. Endi dam olish uchun SABAB kerak:
    //   • charchagan bo'lsin (stress) yoki zerikkan bo'lsin,
    //   • yaqinda faol ish qilgan bo'lsin (`A.activeT`),
    //   • o'yinchi yonida bo'lmasin — u kelganda dam olish g'alati.
    const tired = M.emotions.stress * 0.5 + M.emotions.boredom * 0.35;
    if (tired < 0.25 && (A.activeT || 0) < 25) return 0;
    if (isPlay() && S.playerDist < 5) return 0;
    return 0.18 + M.personality.laziness * 0.28 + tired * 0.35
                - M.emotions.excitement * 0.5;
  },
  enter(A) {
    A.restT = 0;
    A.activeT = 0;             // dam olindi — hisob noldan
    A.restKind = pick(['sit', 'sit', 'sleep', 'watch']);
    speak(A, {
      sit:   pick(['Biroz o\'tiraman.', 'Charchadim.']),
      sleep: pick(['Uyquyim kelyapti…', 'Zzz…']),
      watch: pick(['Shunchaki qarab turaman.', 'Chiroyli ekan.']),
    }[A.restKind], 3);
  },
  tick(A, S, dt) {
    A.restT += dt;
    stepTo(A, null, dt);
    if (A.restKind === 'sleep') {
      Pose.sulk(A.t * 0.3);
      Pose.face({ lid: 1, mouth: 0.5 });
    } else if (A.restKind === 'watch') {
      Pose.idle(A.t * 0.5);
      Pose.face({ lid: 0.3 });
    } else {
      Pose.sulk(A.t * 0.5);
      Pose.face({ lid: 0.4, mouth: 0.9 });
    }
    Brain.emo('stress', -dt * 0.1);
    Brain.emo('boredom', dt * 0.03);
    // O'yinchi yaqin kelsa uyg'onadi
    if (isPlay() && S.playerDist < 2.5) {
      speak(A, pick(['A? Uyg\'oq edim!', 'Men uxlamayotgandim.']), 2.5);
      A.done = true;
    }
    if (A.restT > (A.restKind === 'sleep' ? 14 : 8)) {
      cooldown(A, 'rest', 40);
      A.done = true;
    }
  },
},

// ── 🔍 O'YINCHINI QIDIRISH ──────────────────────────────────
//  ⚠ Topshiriqning 11-bo'limi: chap → o'ng → orqa → atrofdagi
//    jismlar. Ketma-ketlik AYNAN shunday.
{
  id: 'search',
  score(A, S) {
    if (!isPlay()) return 0;
    if (S.playerDist < 14) return 0;               // ko'rinib turibdi
    if (!ready(A, 'search')) return 0;
    return 0.55 + Brain.mem().player.relationship * 0.3;
  },
  enter(A) {
    A.searchT = 0;
    A.searchStep = 0;
    A.searchBase = A.root.rotation.y;
    speak(A, pick(['Qayerdasiz?', 'Yo\'qolib qoldingizmi?', 'Hoy!']), 3);
  },
  tick(A, S, dt) {
    A.searchT += dt;
    const steps = [0.9, -0.9, Math.PI, 0];         // chap · o'ng · orqa · old
    const i = Math.min(steps.length - 1, Math.floor(A.searchT / 1.3));
    if (i !== A.searchStep) {
      A.searchStep = i;
      if (i === 3) speak(A, pick(['Hmm…', 'Bu yerda emas.']), 2);
    }
    A.root.rotation.y = turnTo(A.root.rotation.y, A.searchBase + steps[i], 4, dt);
    stepTo(A, A.searchT > 5.5 ? playerPos() : null, dt, { stopAt: 3, run: true });
    Pose[A.searchT > 5.5 ? 'walk' : 'idle'](A.t, true);
    Pose.face({ lid: 0.2 });

    if (S.playerDist < 8) {
      speak(A, pick(['Mana!', 'Topdim!', 'Yashiringandingizmi?']), 2.5);
      Brain.emo('happiness', 0.2);
      cooldown(A, 'search', 25);
      A.done = true;
    }
    if (A.searchT > 12) { cooldown(A, 'search', 30); A.done = true; }
  },
},

// ── 🔘 Tugmani bosib ko'rish ────────────────────────────────
{
  id: 'press',
  score(A, S) {
    if (!isPlay() || !S.buttons.length) return 0;
    if (A.carried) return 0;
    if (!ready(A, 'press')) return 0;
    // ⚠ Ko'rilgan tugmani chetlab, YANGISINI qidiramiz. Ilgari
    //   faqat `fresh` bonusi tushardi, lekin ball baribir yuqori
    //   qolib, Aiko bitta tugmani cheksiz bosaverardi.
    const b = S.buttons.find(x => !A.seenBtns.has(x.obj.userData.id)) || S.buttons[0];
    const seen = A.seenBtns.has(b.obj.userData.id);
    if (seen && Brain.knows(String(b.obj.userData.btnMode || 'button'), 'press'))
      return 0;                    // nima qilishini BILADI — qiziq emas
    const fresh = seen ? 0 : 0.35;
    A._pressPick = b.obj;
    return (seen ? 0.18 : 0.5) + A.cfg.curiosity * 0.5 + fresh - b.dist * 0.02;
  },
  enter(A, S, keepTarget) {
    if (!keepTarget) A.target = A._pressPick || (S.buttons[0] ? S.buttons[0].obj : null);
    A.pressP = 0; A.pressed = false;
    speak(A, pick(['Bu nima ekan?', 'Bosib ko\'rsam...', 'Qiziq...']));
  },
  tick(A, S, dt) {
    if (!A.target || !A.target.parent) { A.done = true; return; }
    const d = stepTo(A, A.target.position, dt, { stopAt: 1.0 });
    if (d > 1.15 && !A.pressed) { Pose.walk(A.t, false); return; }

    A.pressP = Math.min(1, A.pressP + dt * 2.2);
    Pose.poke(A.pressP);

    if (A.pressP >= 1 && !A.pressed) {
      A.pressed = true;
      A.seenBtns.add(A.target.userData.id);
      let fired = false;
      try {
        if (window.InteractiveButtonSystem && window.InteractiveButtonSystem.fire)
          fired = window.InteractiveButtonSystem.fire(A.target) !== false;
      } catch (e) {}
      A.wowT = 0;
      A.wow = fired;
      speak(A, fired
        ? pick(['Voy! Nimadir bo\'ldi!', 'Men qildim!', 'Bu ishladi!'])
        : pick(['Hech nima...', 'Buzuqmi?', 'Yana bosaman.']));
      // ⚠ O'rganish: shu turdagi tugma nima qilishini eslab qoladi
      try {
        const ty = String((A.target.userData && A.target.userData.btnMode) || 'button');
        Brain.learn(ty, 'press', fired ? 'ishladi' : 'hech nima', fired);
        if (fired) Brain.discover(ty + ' tugmasi ishlaydi');
        Brain.emo('excitement', fired ? 0.35 : 0);
        Brain.emo('curiosity', -0.15);
      } catch (e) {}
      if (fired) feel(A, 'happy', 0.25); else feel(A, 'anger', 0.1);
    }

    if (A.pressed) {
      A.wowT = (A.wowT || 0) + dt;
      if (A.wow) Pose.surprised(A.t); else Pose.angry(A.t);
      if (A.wowT > 2.0) { cooldown(A, 'press', 9); A.done = true; }
    }
  },
  // ⚠ SOVUTISH `exit()` DA. Ilgari faqat tugagach qo'yilardi:
  //   agar `press` yarim yo'lda uzilsa (boshqa xatti-harakat ustun
  //   chiqsa), sovutish QO'YILMASDI va Aiko darhol tugmaga qaytardi.
  //   Ekranda bu "tugmani qayta-qayta bosish" bo'lib ko'rindi.
  //   Endi har qanday chiqishda qo'yiladi; muvaffaqiyatlisi uzunroq.
  exit(A) {
    cooldown(A, 'press', A.pressed ? 25 : 12);
    if (A.target && A.target.userData) A.seenBtns.add(A.target.userData.id);
    A.target = null; A.pressed = false; A.wow = false;
  },
},

// ── ⚽ Dumaloq narsani tepish ───────────────────────────────
{
  id: 'kick',
  score(A, S) {
    if (!isPlay() || !S.round.length) return 0;
    if (A.carried) return 0;
    if (!ready(A, 'kick')) return 0;
    return 0.6 + A.cfg.mischief * 0.35 - S.round[0].dist * 0.03;
  },
  enter(A, S, keepTarget) {
    if (!keepTarget) A.target = S.round[0] ? S.round[0].obj : null;
    A.kickP = 0; A.kicked = false;
    if (A.target) {
      const sz = Sense.sizeOf(A.target);
      A.tooBig = sz > 1.5;
      speak(A, A.tooBig
        ? pick(['Bu juda katta...', 'Baribir tepaman.'])
        : pick(['Gooool!', 'Mana bu tepish!', 'Tayyor bo\'ling.']));
    }
  },
  tick(A, S, dt) {
    if (!A.target || !A.target.parent) { A.done = true; return; }
    const d = stepTo(A, A.target.position, dt, { stopAt: 0.85, run: true });
    if (d > 1.0 && !A.kicked) { Pose.walk(A.t, true); return; }

    A.kickP = Math.min(1, A.kickP + dt * 2.6);
    Pose.kick(A.kickP);

    if (A.kickP >= 1 && !A.kicked) {
      A.kicked = true;
      const sz = Sense.sizeOf(A.target);
      const m  = Sense.massOf(A.target);
      if (A.tooBig) {
        // Katta jism qimirlamaydi — oyog'i og'riydi, jahli chiqadi
        speak(A, pick(['Aaay! Oyog\'im!', 'Bu tosh ekan!', 'Kim buni qo\'ydi?!']));
        feel(A, 'anger', 0.45);
        A.hurtT = 0;
      } else {
        // Kuch o'lchamga TESKARI: kichkinasi uzoqqa uchadi
        const power = clamp(9 / (sz * 2 + 0.4), 1.5, 26) * clamp(m, 0.3, 6);
        const yaw = A.root.rotation.y;
        try {
          const rec = window.rapierBodies && window.rapierBodies.get(A.target);
          if (rec && rec.rigidBody && rec.rigidBody.applyImpulse) {
            rec.rigidBody.applyImpulse(
              { x: Math.sin(yaw) * power, y: power * 0.32, z: Math.cos(yaw) * power }, true);
          } else {
            // Rapier yo'q — zaxira fizikaga tezlik beramiz
            const b = (window.physBodies || []).find(x => x.mesh === A.target);
            if (b && b.vel) {
              b.vel.x += Math.sin(yaw) * power * 0.5;
              b.vel.y += power * 0.18;
              b.vel.z += Math.cos(yaw) * power * 0.5;
            }
          }
        } catch (e) {}
        feel(A, 'happy', 0.2);
      }
    }

    if (A.kicked) {
      A.hurtT = (A.hurtT || 0) + dt;
      if (A.tooBig) Pose.angry(A.t);
      if (A.hurtT > 1.6) { cooldown(A, 'kick', 8); A.done = true; }
    }
  },
  exit(A) { cooldown(A, 'kick', 14); A.target = null; A.kicked = false;
            A.tooBig = false; A.hurtT = 0; },
},

// ── 💻 PC ekranining kodini o'zgartirish ────────────────────
{
  id: 'hack',
  score(A, S) {
    if (!S.pcs.length) return 0;
    if (A.carried) return 0;
    if (!ready(A, 'hack')) return 0;
    return 0.65 + A.cfg.curiosity * 0.45 + A.cfg.mischief * 0.2;
  },
  enter(A, S, keepTarget) {
    if (!keepTarget) A.target = S.pcs[0] ? S.pcs[0].obj : null;
    A.typeT = 0; A.typed = false;
    speak(A, pick(['Kompyuter! Menga bering.', 'Kodini o\'zgartiraman.', 'Bu nima yozilgan?']));
  },
  tick(A, S, dt) {
    if (!A.target || !A.target.parent) { A.done = true; return; }
    const d = stepTo(A, A.target.position, dt, { stopAt: 1.1 });
    if (d > 1.3 && !A.typed) { Pose.walk(A.t, false); return; }

    A.typeT += dt;
    Pose.poke((Math.sin(A.typeT * 14) + 1) / 2);       // tez chertish

    if (A.typeT > 2.4 && !A.typed) {
      A.typed = true;
      const html = generatePcHtml(A);
      try {
        if (window.PCBlockSystem && window.PCBlockSystem.setHtml)
          window.PCBlockSystem.setHtml(A.target, html);
      } catch (e) {}
      speak(A, pick(['Endi yaxshiroq!', 'Men yozdim.', 'O\'chirmang, iltimos.']), 3);
      feel(A, 'happy', 0.3);
    }
    if (A.typed && A.typeT > 4.0) { cooldown(A, 'hack', 45); A.done = true; }
  },
  exit(A) { cooldown(A, 'hack', A.typed ? 60 : 20); A.target = null; A.typed = false; },
},

// ── 🧗 Redaktorda kameraga chiqish / uzoqdan chaqirish ──────
{
  id: 'reach',
  score(A, S) {
    if (isPlay()) return 0;                       // faqat redaktor rejimida
    if (!window.camera) return 0;
    if (!ready(A, 'reach')) return 0;
    return 0.6 + A.cfg.curiosity * 0.3;
  },
  enter(A) { A.reachT = 0; A.reachMode = null; },
  tick(A, S, dt) {
    const cam = window.camera;
    if (!cam) { A.done = true; return; }
    A.reachT += dt;

    const cp = cam.position;
    const dy = cp.y - A.root.position.y;
    const flat = Math.hypot(cp.x - A.root.position.x, cp.z - A.root.position.z);

    if (A.reachMode == null)
      A.reachMode = (dy > 2.6 || flat > 14) ? 'call' : 'climb';

    if (A.reachMode === 'climb') {
      // Yaqindagi bloklarga tirmashib kamera balandligiga intiladi
      const d = stepTo(A, cp, dt, { stopAt: 1.6 });
      if (!A.onGround || dy > 0.6) Pose.climb(A.t); else Pose.walk(A.t, false);
      if (dy < 1.2 && d < 2.2) {
        Pose.wave(A.t);
        A.reachDone = (A.reachDone || 0) + dt;
        if (A.reachDone < dt * 2) speak(A, pick(['Salom! Ko\'ryapsizmi?', 'Yetib keldim!', 'Mana men.']), 3);
        if (A.reachDone > 3) { cooldown(A, 'reach', 30); A.done = true; }
      }
      if (A.reachT > 18) { A.reachMode = 'call'; A.reachT = 0; }
    } else {
      // Yetolmaydi — uzoqdan sakrab qo'l silkitadi
      A.root.rotation.y = turnTo(A.root.rotation.y,
        Math.atan2(cp.x - A.root.position.x, cp.z - A.root.position.z), A.cfg.turnRate, dt);
      stepTo(A, null, dt);
      Pose.wave(A.t);
      if (A.onGround && Math.random() < dt * 1.4) A.vy = A.cfg.jumpVel * 0.8;
      if (A.reachT < dt * 2) speak(A, pick(['Hoy! Bu yoqqa qarang!', 'Meni ko\'ryapsizmi?', 'Pastdaman!']), 3);
      if (A.reachT > 6) { cooldown(A, 'reach', 25); A.done = true; }
    }
  },
  exit(A) { A.reachT = 0; A.reachMode = null; A.reachDone = 0; },
},

// ── 🎯 Triggerni "tasodifan" bosib yuborish ─────────────────
{
  id: 'meddle',
  score(A, S) {
    if (!isPlay() || !S.hitboxes.length) return 0;
    if (!ready(A, 'meddle')) return 0;
    return 0.3 + A.cfg.mischief * 0.45;
  },
  enter(A, S, keepTarget) {
    if (!keepTarget) A.target = S.hitboxes[0] ? S.hitboxes[0].obj : null;
    A.medT = 0;
  },
  tick(A, S, dt) {
    if (!A.target || !A.target.parent) { A.done = true; return; }
    A.medT += dt;
    const d = stepTo(A, A.target.position, dt, { stopAt: 0.4, run: true });
    Pose.walk(A.t, true);
    if (d <= 0.6 || A.medT > 8) {
      try {
        if (window.HitboxSystem && window.HitboxSystem._fireActions)
          window.HitboxSystem._fireActions(A.target, A.root, 'enter', 1, 1);
      } catch (e) {}
      speak(A, pick(['Hoop! Men bosib yubordim.', 'Bu men emas edim.', 'Nima bo\'ldi hozir?']));
      cooldown(A, 'meddle', 22);
      A.done = true;
    }
  },
  exit(A) { cooldown(A, 'meddle', 30); A.target = null; A.medT = 0; },
},

// ── 🎁 Predmetni olib qo'yish ───────────────────────────────
{
  id: 'snatch',
  score(A, S) {
    if (!isPlay() || !S.pickups.length) return 0;
    if (A.carried || A.pocket) return 0;
    if (!ready(A, 'snatch')) return 0;
    return 0.5 + A.cfg.mischief * 0.4;
  },
  enter(A, S, keepTarget) {
    if (!keepTarget) A.target = S.pickups[0] ? S.pickups[0].obj : null;
    speak(A, pick(['Buni men olaman.', 'Sizga kerakmasdi-ku?', 'Vaqtincha menda tursin.']));
  },
  tick(A, S, dt) {
    if (!A.target || !A.target.parent) { A.done = true; return; }
    const d = stepTo(A, A.target.position, dt, { stopAt: 0.8, run: true });
    Pose.walk(A.t, true);
    if (d <= 0.95) {
      A.pocket = A.target;                      // cho'ntagiga soladi
      A.target.visible = false;
      A.target.userData._wPocket = true;
      speak(A, pick(['Xihi. Yaxshi so\'rasangiz beraman.', 'Endi meniki.', 'Iltimos deng-chi.']), 4);
      feel(A, 'happy', 0.15);
      cooldown(A, 'snatch', 30);
      A.done = true;
    }
  },
  exit(A) { A.target = null; },
},

// ── 🌿 Bekorchilik — kezish va qiliqlar ─────────────────────
{
  id: 'idle',
  score() { return 0.2; },                     // eng past — hamisha zaxirada
  enter(A) {
    A.wanderTo = null;
    A.idleT = 0;
    A.gag = null;
  },
  tick(A, S, dt) {
    A.idleT += dt;

    // Vaqti-vaqti bilan kulgili qiliq
    if (!A.gag && Math.random() < dt * 0.12) {
      A.gag = pick(['spin', 'jump', 'peek', 'stretch']);
      A.gagT = 0;
      speak(A, pick(['Zerikdim...', 'Hmm.', 'Nima qilsam ekan?', 'Qarang, men shunday qila olaman!']), 2);
    }

    if (A.gag) {
      A.gagT += dt;
      if (A.gag === 'spin') { A.root.rotation.y += dt * 7; Pose.wave(A.t); }
      else if (A.gag === 'jump') { if (A.onGround) A.vy = A.cfg.jumpVel; Pose.surprised(A.t); }
      else if (A.gag === 'peek') { Pose.poke((Math.sin(A.gagT * 5) + 1) / 2); }
      else { Pose.climb(A.t); }
      stepTo(A, null, dt);
      if (A.gagT > 1.8) A.gag = null;
      return;
    }

    // Kezish
    if (!A.wanderTo || A.idleT > 9) {
      A.idleT = 0;
      const base = (isPlay() && S.playerDist < 22) ? playerPos() : A.home;
      A.wanderTo = new (T().Vector3)(
        base.x + rnd(-6, 6), base.y, base.z + rnd(-6, 6));
    }
    const d = stepTo(A, A.wanderTo, dt, { stopAt: 0.8, slow: true });
    if (d < 1.0) { A.wanderTo = null; Pose.idle(A.t); }
    else Pose.walk(A.t, false);

    // O'yinchiga qarab qo'yadi
    if (isPlay() && S.playerDist < 5 && S.playerSeen) {
      Pose.face({ mouth: 1.4 });
      feel(A, 'love', dt * 0.02);
    }
  },
},
];

// ============================================================
//  8. QURILISH GENERATORI
// ------------------------------------------------------------
//  To'plangan jismlar SONIGA qarab loyiha tanlanadi. Har safar
//  bir xil chiqmasligi uchun o'lchamlar va tur tasodifiy.
// ============================================================


/**
 * Loyiha uchun yetishmayotgan shakl.
 *
 * ⚠ Har safar so'ramaydi: `askCool` bilan chegaralanadi, aks holda
 *   Aiko qurishni boshlamay, cheksiz "blok bering" deb turardi.
 * @returns {{shape:string, big:boolean}|null}
 */
function missingShape(A) {
  if (A.askCool > 0) return null;
  const have = new Set(A.stash.map(o => String(o.userData && o.userData.type)));
  // Chiroyli inshoot uchun kamida bitta yumaloq element yoqadi
  const wish = ['Silindr', 'Konus', 'Torus', 'Sfera'].filter(x => !have.has(x));
  if (!wish.length) return null;
  // Ehtimol bilan — hamisha emas
  if (Math.random() > 0.55) return null;
  A.askCool = 45;
  const shape = pick(wish);
  return { shape, big: (shape === 'Sfera' || shape === 'Torus') };
}

function planStructure(A) {
  const items = A.stash.filter(o => o && o.parent);
  A.stash = items;
  if (!items.length) return [];

  const n = items.length;
  const base = A.home.clone();
  base.x += rnd(-1.5, 1.5);
  base.z += rnd(-1.5, 1.5);

  const kinds = [];
  if (n >= 8) kinds.push('house');
  if (n >= 5) kinds.push('tower', 'arch');
  kinds.push('stairs', 'pile');
  const kind = pick(kinds);

  const size = (o) => Math.max(0.4, Sense.sizeOf(o));
  const plan = [];
  const V = T().Vector3;

  if (kind === 'tower') {
    let y = 0;
    for (let i = 0; i < n; i++) {
      const h = size(items[i]);
      plan.push({ obj: items[i], to: new V(base.x, base.y + y + h / 2, base.z),
                  rot: i * 0.35 });
      y += h;
    }
    A.buildName = 'minora';
  } else if (kind === 'arch') {
    const half = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      const side = i < half ? -1 : 1;
      const k = i < half ? i : (i - half);
      const h = size(items[i]);
      plan.push({ obj: items[i],
                  to: new V(base.x + side * 1.1, base.y + k * h + h / 2, base.z), rot: 0 });
    }
    A.buildName = 'darvoza';
  } else if (kind === 'stairs') {
    for (let i = 0; i < n; i++) {
      const h = size(items[i]);
      plan.push({ obj: items[i],
                  to: new V(base.x + i * 0.9, base.y + i * h * 0.55 + h / 2, base.z), rot: 0 });
    }
    A.buildName = 'zinapoya';
  } else if (kind === 'house') {
    // 4 ta devor + tom: perimetr bo'ylab teng taqsimlaymiz
    const W = 2.4;
    const perWall = Math.floor((n - 1) / 4);
    let i = 0;
    const walls = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [wx, wz] of walls) {
      for (let k = 0; k < perWall && i < n - 1; k++, i++) {
        const t = (k / Math.max(1, perWall - 1)) - 0.5;
        const h = size(items[i]);
        plan.push({ obj: items[i],
                    to: new V(base.x + wx * W / 2 + (wz ? t * W : 0),
                              base.y + h / 2,
                              base.z + wz * W / 2 + (wx ? t * W : 0)),
                    rot: wx ? Math.PI / 2 : 0 });
      }
    }
    // Oxirgisi — tom
    if (i < n) {
      plan.push({ obj: items[i], to: new V(base.x, base.y + 1.4, base.z), rot: 0 });
    }
    A.buildName = 'uy';
  } else {
    // Uyum — dumaloq halqa
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      plan.push({ obj: items[i],
                  to: new V(base.x + Math.cos(a) * 1.5,
                            base.y + size(items[i]) / 2,
                            base.z + Math.sin(a) * 1.5), rot: a });
    }
    A.buildName = 'gulchambar';
  }

  A.stash = [];
  return plan;
}

/** PC ekraniga yoziladigan "Aiko yozgan" HTML. */
function generatePcHtml(A) {
  const lines = [
    'kim eng aqlli? — men',
    'o\'yinchi: shubhali',
    'todo: yana bitta koptok tepish',
    'parol: 0000 (hech kimga aytmang)',
    'bugungi kayfiyat: ' + (A.mood.anger > 0.5 ? 'jahlim chiqqan' : 'a\'lo'),
  ];
  const rows = lines.map(l => '<div>&gt; ' + esc(l) + '</div>').join('\n');
  return '<h1 style="color:#ff7aa2;margin:0 0 12px">AIKO OS v1.0</h1>\n' +
         '<div style="font-family:monospace;font-size:20px;line-height:1.7;color:#9fe8c0">\n' +
         rows + '\n<div>&gt; _</div>\n</div>\n' +
         '<p style="color:#8892a0;font-size:16px;margin-top:16px">' +
         esc('bu kompyuter Aiko tomonidan egallandi') + '</p>';
}

/** Yurakcha zarralari — quchoqlashda. */
function spawnHearts(A, n) {
  const TH = T();
  const holder = A.root;
  for (let i = 0; i < n; i++) {
    const m = new TH.Mesh(
      new TH.SphereGeometry(0.05, 6, 5),
      new TH.MeshBasicMaterial({ color: 0xff5f8d, transparent: true, opacity: 0.9 }));
    m.name = '_wHeart';
    m.position.set(rnd(-0.25, 0.25), A.cfg.height * 0.95, rnd(-0.15, 0.25));
    m.userData._hv = { y: rnd(0.5, 1.1), life: rnd(0.8, 1.5), t: 0 };
    holder.add(m);
  }
}

function updateHearts(A, dt) {
  const kill = [];
  for (const c of A.root.children) {
    if (c.name !== '_wHeart') continue;
    const h = c.userData._hv;
    h.t += dt;
    c.position.y += h.y * dt;
    c.material.opacity = Math.max(0, 0.9 * (1 - h.t / h.life));
    if (h.t >= h.life) kill.push(c);
  }
  for (const c of kill) {
    A.root.remove(c);
    try { c.geometry.dispose(); c.material.dispose(); } catch (e) {}
  }
}

// ============================================================
//  9. DIALOG — gaplashish
// ------------------------------------------------------------
//  ⚠ Bu "chatbot" emas va bo'lishga urinmaydi. Kalit so'z +
//    kayfiyat = javob. Sabab: addon offline ishlashi kerak va
//    javob PERSONAJGA mos bo'lishi kerak, umumiy bo'lmasligi.
//
//  Muloyimlik ballari `love` ni oshiradi, qo'polligi `anger` ni.
//  `pocket` dagi predmet FAQAT yaxshi gapirilganda qaytariladi —
//  talab shundan.
// ============================================================

const NICE = ['iltimos', 'rahmat', 'raxmat', 'chiroyli', 'yaxshi', 'zo\'r', 'kechir',
              'uzr', 'salom', 'jonim', 'aziz', 'go\'zal', 'ajoyib', 'barakalla',
              'qoyil', 'sevaman', 'do\'st', 'marhamat'];
const RUDE = ['ahmoq', 'jinni', 'yo\'qol', 'ket', 'nodon', 'yomon', 'jirkanch',
              'tez bo\'l', 'zerikarli', 'befoyda', 'oshxona', 'o\'chir'];

function classify(text) {
  const t = String(text || '').toLowerCase();
  let nice = 0, rude = 0;
  for (const w of NICE) if (t.indexOf(w) >= 0) nice++;
  for (const w of RUDE) if (t.indexOf(w) >= 0) rude++;
  return { nice, rude, text: t };
}

function respond(A, input) {
  const c = classify(input);
  const t = c.text;

  feel(A, 'love',  c.nice * 0.16 - c.rude * 0.12);
  feel(A, 'anger', c.rude * 0.28 - c.nice * 0.1);
  if (c.nice) feel(A, 'sad', -0.2);
  try {
    if (c.nice) { Brain.playerAct('nice'); Brain.emo('trust', 0.05); }
    if (c.rude) { Brain.playerAct('rude'); Brain.emo('annoyance', 0.2); }
    Brain.note('talk', String(input).slice(0, 60));
  } catch (e) {}

  // ── Predmetni qaytarish ──────────────────────────────────
  const asksBack = /ber|qaytar|menga|meniki|predmet|narsa/.test(t);
  if (asksBack && A.pocket) {
    if (c.nice > 0 && A.mood.anger < 0.55) {
      const obj = A.pocket;
      A.pocket = null;
      obj.visible = true;
      delete obj.userData._wPocket;
      obj.position.set(A.root.position.x + Math.sin(A.root.rotation.y) * 0.8,
                       A.root.position.y + 0.5,
                       A.root.position.z + Math.cos(A.root.rotation.y) * 0.8);
      try { if (window.rebuildRapierBody) window.rebuildRapierBody(obj); } catch (e) {}
      feel(A, 'love', 0.15);
      return 'Mayli... ushlang. Chiroyli so\'radingiz.';
    }
    return A.mood.anger > 0.55
      ? 'Yo\'q! Avval jahlimni chiqarganingiz uchun kechirim so\'rang.'
      : 'Hmph. Shunchaki "ber" emas — "iltimos" degan so\'z bor.';
  }


  // ── XOTIRA SAVOLLARI ─────────────────────────────────────
  //  ⚠ Topshiriqning 71-bo'limi: Aiko o'tgan sessiyani ESLASHI
  //    va bu haqda GAPIRISHI kerak. Bu shunchaki bezak emas —
  //    xotira ishlayotganini o'yinchi shu orqali ko'radi.
  if (/kecha|eslay|esingdami|oldin|nima qilgan|xotira/.test(t)) {
    const M = Brain.mem();
    const last = Brain.lastSummary();
    if (M.sessionCount <= 1) return 'Bugun birinchi kunimiz. Hali eslaydigan narsam yo\'q.';
    if (last && last.summary && last.summary.length)
      return 'O\'tgan safar: ' + last.summary.slice(-3).join(', ') + '.';
    return M.sessionCount + '-marta ko\'rishyapmiz, lekin tafsilotlar esimda yo\'q.';
  }
  if (/qurgan|qurding|inshoot|uying/.test(t)) {
    const cs = Brain.mem().constructions;
    if (!cs.length) return 'Hali hech narsa qurmadim. Menga bloklar kerak.';
    const last = cs[cs.length - 1];
    return `Men ${cs.length} ta narsa qurdim. Oxirgisi — ${last.kind}, ` +
           `${last.session}-sessiyada.`;
  }
  if (/bilasan|o'rgan|organ|nima bilasan/.test(t)) {
    const L = Brain.mem().learned;
    const ks = Object.keys(L).filter(k => L[k].confidence > 0.5);
    return ks.length
      ? 'Bilaman: ' + ks.slice(0, 3).map(k => k.split(':')[0]).join(', ') + '.'
      : 'Hali ko\'p narsa bilmayman. O\'rganyapman.';
  }
  if (/maqsad|reja|nima qilmoqchi/.test(t)) {
    const g = Brain.goals();
    const uz = { explore: 'atrofni o\'rganish', build: 'qurish', play: 'o\'ynash',
                 inspect: 'tekshirish', prank: 'hazil qilish', rest: 'dam olish',
                 follow: 'siz bilan yurish', collect: 'narsa yig\'ish' };
    return g.length ? 'Bugungi rejam: ' + g.map(x => uz[x] || x).join(', ') + '.'
                    : 'Hali o\'ylab ko\'rmadim.';
  }
  if (/musiqa|qo'shiq|qoshiq/.test(t)) {
    const M = Brain.mem().music;
    const ks = Object.keys(M);
    if (!ks.length) return 'Musiqa yoqadi. Faqat to\'satdan yoqmang, cho\'chiyman.';
    const fav = ks.sort((a, b) => Brain.musicMood(b) - Brain.musicMood(a))[0];
    const tired = ks.filter(k => M[k].saturation > 0.7);
    return `"${fav}" menga yoqadi.` +
           (tired.length ? ` Lekin "${tired[0]}" dan bezdim — juda ko'p qo'ydingiz.` : '');
  }
  if (/prank|hazil|shumlik/.test(t)) {
    const P = Brain.mem().pranks;
    const ks = Object.keys(P);
    return ks.length
      ? `Men ${ks.length} xil hazil qilganman. Bugun boshqasini o'ylab topaman.`
      : 'Hali hech narsa qilmadim... hozircha.';
  }

  // ── Kalit so'zlar ────────────────────────────────────────
  if (/salom|assalom|hayr|hello|privet/.test(t))
    return pick(['Salom! Nihoyat gaplashdingiz.', 'Ha, salom. Nima gap?', 'Salom-salom.']);
  if (/ism|oting|kimsan|kim san|nomi/.test(t))
    return 'Ismim Aiko. Esda tuting, yana so\'ramang.';
  if (/nima qil|nima qilyap|band/.test(t))
    return A.carried ? 'Ko\'rmayapsizmi? Ishlayapman.'
                     : pick(['Fikr yuritayapman.', 'Sizni kuzatyapman.', 'Rejalarim bor.']);
  if (/uy|qur|bino|inshoot/.test(t))
    return A.built.length
      ? 'Men allaqachon ' + A.built.length + ' ta narsa qurdim. Ko\'rmadingizmi?'
      : 'Menga ' + A.cfg.stashGoal + ' ta jism kerak. Keyin ko\'rasiz.';
  if (/kayfiyat|qalay|yaxshimisan|holing/.test(t)) {
    if (A.mood.anger > 0.55) return 'Jahlim chiqqan. Sababini o\'zingiz bilasiz.';
    if (A.mood.sad > 0.5)    return 'Yaxshi emas. Meni tashlab qo\'ygandingiz.';
    if (A.mood.love > 0.6)   return 'Siz bilan — yaxshi.';
    return 'Normal. Qiziqroq nimadir bo\'lsa yaxshi bo\'lardi.';
  }
  if (/kechir|uzr|afsus/.test(t)) {
    feel(A, 'anger', -0.45); feel(A, 'sad', -0.3);
    return pick(['...Mayli. Bu safar.', 'Kechirdim. Lekin esimda.', 'Hmph. Bo\'ldi.']);
  }
  if (/sevaman|yoqasan|chiroylisan|go\'zal/.test(t)) {
    feel(A, 'love', 0.3);
    return pick(['B-bunday demang!', 'Bilaman.', 'Yuzim qizardi... hech narsa.']);
  }
  if (/tepma|to\'xta|qo\'y|bas/.test(t)) {
    feel(A, 'anger', 0.2);
    return 'Menga buyruq bermang.';
  }
  if (/yordam|kel|ergash|yur/.test(t)) {
    A.followT = 22;
    return 'Mayli, ergashaman. Lekin zerikarli bo\'lsa ketaman.';
  }
  if (/tur|kut|joyda qol/.test(t)) {
    A.followT = 0;
    A.home.copy(A.root.position);
    return 'Shu yerda turaman. Uzoqqa ketmang.';
  }
  if (/tugma|bos/.test(t))
    return 'Tugmalarni bosishni yaxshi ko\'raman. Nima bo\'lishini bilmasam ham.';
  if (/kompyuter|pc|kod/.test(t))
    return 'Ha, kodini men o\'zgartirdim. Chiroyliroq bo\'ldi-ku?';

  // ── Umumiy ───────────────────────────────────────────────
  if (c.rude) return pick(['Nima dedingiz?!', 'Bu qo\'pollik.', 'Ketaman hozir.']);
  if (c.nice) return pick(['Rahmat sizga ham.', 'Xursandman.', 'Siz yaxshisiz.']);
  return pick(['Tushunmadim, boshqacha ayting.', 'Hmm?', 'Menga qiziq emas.',
               'Nima?', 'Buni keyin gaplashamiz.']);
}

// ============================================================
//  10. UI — pufakcha va dialog oynasi
// ============================================================

const UI = (() => {
  let bub = null, dlg = null, dlgBody = null, dlgInp = null;

  function bubbleEl() {
    if (bub && bub.parentNode) return bub;
    bub = document.createElement('div');
    bub.id = 'waifu-bubble';
    bub.style.cssText =
      'position:fixed;z-index:99998;pointer-events:none;transform:translate(-50%,-100%);' +
      'background:rgba(18,20,26,.92);color:#ffd9e4;border:1px solid #ff7aa2;' +
      'border-radius:10px;padding:5px 10px;font-size:12px;font-family:system-ui,sans-serif;' +
      'max-width:230px;text-align:center;display:none;box-shadow:0 4px 18px rgba(0,0,0,.5);' +
      'line-height:1.35';
    document.body.appendChild(bub);
    return bub;
  }

  /** Pufakchani boshi ustiga proyeksiya qiladi. */
  function drawBubble(A) {
    const el = bubbleEl();
    if (!A.bubble || A.bubbleT <= 0 || !window.camera || !window.renderer) {
      el.style.display = 'none';
      return;
    }
    const TH = T();
    const p = new TH.Vector3(
      A.root.position.x,
      A.root.position.y + A.cfg.height * 1.18,
      A.root.position.z);
    p.project(window.camera);
    if (p.z > 1) { el.style.display = 'none'; return; }   // orqada
    const cv = window.renderer.domElement;
    const r = cv.getBoundingClientRect();
    el.style.left = (r.left + (p.x * 0.5 + 0.5) * r.width) + 'px';
    el.style.top  = (r.top  + (-p.y * 0.5 + 0.5) * r.height) + 'px';
    el.style.display = 'block';
    const txt = esc(A.bubble);
    if (el.dataset.txt !== txt) { el.innerHTML = txt; el.dataset.txt = txt; }
  }

  // ── Dialog oynasi ────────────────────────────────────────
  function buildDialog() {
    if (dlg && dlg.parentNode) return dlg;
    dlg = document.createElement('div');
    dlg.id = 'waifu-dialog';
    dlg.style.cssText =
      'position:fixed;right:18px;bottom:18px;width:320px;z-index:99999;display:none;' +
      'background:rgba(14,16,22,.96);border:1px solid #ff7aa2;border-radius:12px;' +
      'font-family:system-ui,sans-serif;color:#e8e6ea;box-shadow:0 10px 40px rgba(0,0,0,.6);' +
      'overflow:hidden';
    dlg.innerHTML =
      '<div style="padding:8px 12px;background:rgba(255,122,162,.14);' +
      'border-bottom:1px solid rgba(255,122,162,.3);font-size:12px;display:flex;' +
      'justify-content:space-between;align-items:center">' +
        '<span>🌸 <b>Aiko</b> <span id="waifu-mood" style="color:#8892a0"></span></span>' +
        '<span id="waifu-x" style="cursor:pointer;color:#8892a0;padding:0 4px">✕</span>' +
      '</div>' +
      '<div id="waifu-log" style="height:190px;overflow-y:auto;padding:10px;' +
      'font-size:12px;line-height:1.5"></div>' +
      '<div style="display:flex;gap:6px;padding:8px;border-top:1px solid rgba(255,255,255,.08)">' +
        '<input id="waifu-in" placeholder="Nimadir yozing..." ' +
        'style="flex:1;background:#0c0e13;border:1px solid #2a2f3a;color:#e8e6ea;' +
        'padding:6px 8px;border-radius:6px;font-size:12px;outline:none">' +
        '<button id="waifu-send" style="background:#ff7aa2;border:0;color:#1a0d13;' +
        'padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">' +
        'Ayt</button>' +
      '</div>';
    document.body.appendChild(dlg);
    dlgBody = dlg.querySelector('#waifu-log');
    dlgInp  = dlg.querySelector('#waifu-in');

    // ⚠ Inline `onclick` EMAS — bu addon global funksiya qoldirmaydi.
    dlg.querySelector('#waifu-x').addEventListener('click', close);
    dlg.querySelector('#waifu-send').addEventListener('click', send);
    dlgInp.addEventListener('keydown', (e) => {
      e.stopPropagation();                       // o'yin boshqaruviga tushmasin
      if (e.code === 'Enter') send();
      if (e.code === 'Escape') close();
    });
    dlgInp.addEventListener('keyup',   (e) => e.stopPropagation());
    dlgInp.addEventListener('keypress', (e) => e.stopPropagation());
    return dlg;
  }

  function line(who, text, color) {
    if (!dlgBody) return;
    const d = document.createElement('div');
    d.style.cssText = 'margin-bottom:6px;color:' + color;
    d.innerHTML = '<b>' + esc(who) + ':</b> ' + esc(text);
    dlgBody.appendChild(d);
    dlgBody.scrollTop = dlgBody.scrollHeight;
  }

  function send() {
    const A = window.WaifuSystem && window.WaifuSystem.agent();
    if (!A || !dlgInp) return;
    const txt = dlgInp.value.trim();
    if (!txt) return;
    dlgInp.value = '';
    line('Siz', txt, '#9fd8ff');
    const ans = respond(A, txt);
    line('Aiko', ans, '#ffb3c9');
    speak(A, ans, 3.5);
    refreshMood(A);
  }

  function refreshMood(A) {
    const el = dlg && dlg.querySelector('#waifu-mood');
    if (!el || !A) return;
    const m = A.mood;
    let s = '😐';
    if (m.anger > 0.55) s = '😠';
    else if (m.sad > 0.5) s = '😢';
    else if (m.love > 0.6) s = '☺️';
    else if (m.happy > 0.6) s = '😄';
    el.textContent = s;
  }

  function open() {
    const A = window.WaifuSystem && window.WaifuSystem.agent();
    if (!A) { say('Sahnada Aiko yo\'q — avval uni qo\'ying', 'lw'); return; }
    buildDialog().style.display = 'block';
    refreshMood(A);
    if (dlgBody && !dlgBody.children.length)
      line('Aiko', pick(['Ha? Nima gap?', 'Nihoyat.', 'Eshityapman.']), '#ffb3c9');
    setTimeout(() => { if (dlgInp) dlgInp.focus(); }, 30);
  }

  function close() {
    if (dlg) dlg.style.display = 'none';
    if (dlgInp) dlgInp.blur();
  }

  function isOpen() { return !!(dlg && dlg.style.display === 'block'); }

  function destroy() {
    for (const el of [bub, dlg]) if (el && el.parentNode) el.parentNode.removeChild(el);
    bub = dlg = dlgBody = dlgInp = null;
  }

  return { drawBubble, open, close, isOpen, destroy, refreshMood, line };
})();

// ============================================================
//  11. TIZIM — o'z sikli, saqlanish, ro'yxatdan o'tish
// ------------------------------------------------------------
//  `serialize()` / `restore()` bo'lgani uchun `SystemRegistry`
//  bu tizimni O'ZI topadi va sahna bilan birga saqlaydi —
//  `save-load.js` ga tegish shart emas (system-registry.js
//  izohidagi shartnoma).
// ============================================================

window.WaifuSystem = (() => {
  'use strict';

  let _agent = null;
  let _last = 0;
  let _running = false;
  const _err = new Set();

  /** Sahnadagi Aiko obyektini topadi (yuklangandan keyin ham). */
  function findRoot() {
    for (const o of (window.objects || []))
      if (o && o.userData && o.userData.isWaifu) return o;
    return null;
  }

  /**
   * Aiko obyektini yaratadi.
   * ⚠ `isWaifu` `_` SIZ — saqlanadi. Tana esa `_w*` bolalar —
   *   saqlanmaydi va yuklashda qaytadan quriladi.
   */
  function create(pos) {
    const TH = T();
    const g = new TH.Group();
    g.userData = {
      id: (typeof window.objIdC !== 'undefined') ? ++window.objIdC : Date.now(),
      name: 'Aiko',
      type: 'Group',
      isWaifu: true,
      isGroup: true,
      _isFolder: false,
      colliderMode: 'inline',        // o'yinchi ichidan o'tib ketadi (turtib yubormaydi)
      grabbable: false,
      isStatic: true,                // fizika tizimi unga tana bermasin
      children: [],
      wCfg: Object.assign({}, DEF),
      // ⚠ Suyak skaneri Aikoni umuman olmasin (yuqoridagi izoh)
      _boneExposed: true,
    };
    g.position.copy(pos || new TH.Vector3(0, 0, 3));
    window.scene.add(g);
    window.objects.push(g);
    buildBody(g);
    _agent = makeAgent(g);
    return g;
  }

  /** Yuklangandan keyin tanani tiklaydi + agentni bog'laydi. */
  function ensure() {
    const root = findRoot();
    if (!root) { _agent = null; return null; }
    if (!root.userData._wBuilt || !root.userData._w) buildBody(root);
    if (!_agent || _agent.root !== root) {
      _agent = makeAgent(root);
      // Saqlangan kayfiyat bo'lsa qaytaramiz
      if (root.userData.wMood) Object.assign(_agent.mood, root.userData.wMood);
    }
    // GLB modeli ulangan bo'lsa skeletni topamiz (yuklashdan keyin ham)
    if (!_agent.rig && root.userData._wGlb) {
      try {
        _agent.rig = Rig.detect(root.userData._wGlb);
        if (_agent.rig) hidePrimitive(root, true);
      } catch (e) {}
    }
    return _agent;
  }

  // ── Xatti-harakat tanlash ─────────────────────────────────
  /**
   * Ustuvorlik qatlamlari — topshiriqning 57-bo'limi.
   * ⚠ Qatlam ballga QO'SHILADI, uni almashtirmaydi: shunda
   *   quyi qatlamdagi juda jozibali ish yuqori qatlamdagi
   *   zaif ishdan ustun chiqa oladi. Qat'iy qatlam bo'lsa
   *   Aiko `trip` tugaguncha boshqa hech narsa qila olmasdi.
   */
  const TIER = {
    trip: 3.0, shy: 1.2, ask: 1.1, nag: 1.05,
    hug: 0.9, sulk: 0.85, search: 0.8, music: 0.75,
    press: 0.6, hack: 0.6, build: 0.55, steal: 0.5,
    kick: 0.45, reach: 0.4, prank: 0.35, meddle: 0.3,
    snatch: 0.3, rest: 0.15, idle: 0.0,
  };

  function choose(A, S) {
    let best = null, bs = -Infinity;
    for (const b of BEHAVIORS) {
      let s = 0;
      try { s = b.score(A, S) || 0; } catch (e) { s = 0; }
      if (s <= 0) continue;                       // umuman mumkin emas
      s += (TIER[b.id] || 0) * 0.35;              // ustuvorlik
      try { s += Brain.bias(b.id); } catch (e) {} // xotira · hissiyot · maqsad
      if (b === A.behavior) s += STICKY;
      if (s > bs) { bs = s; best = b; }
    }
    // Hech biri mumkin bo'lmasa — `idle` hamisha zaxirada
    return best || BEHAVIORS[BEHAVIORS.length - 1];
  }

  // ── Asosiy yangilanish ────────────────────────────────────
  function update(dt) {
    const A = ensure();
    if (!A) return;
    const P = A.root.userData._w;
    if (!P) return;

    A.t += dt;
    reloadGlbIfSaved();
    // Faol harakat vaqti — dam olish shu bilan "haq qilinadi"
    if (A.behavior && A.behavior.id !== 'rest' && A.behavior.id !== 'idle')
      A.activeT = (A.activeT || 0) + dt;

    // Coold ownlar
    for (const k in A.cool) { A.cool[k] -= dt; if (A.cool[k] <= 0) delete A.cool[k]; }
    if (A.askCool > 0) A.askCool -= dt;

    // O'yinchi AFK hisobi
    const pp = playerPos();
    if (!A.lastPP) A.lastPP = pp.clone();
    const moved = A.lastPP.distanceToSquared(pp);
    if (moved > 0.0025) { A.afk = 0; A.lastPP.copy(pp); } else { A.afk += dt; }

    // Kayfiyat sekin markazga qaytadi
    A.mood.anger = Math.max(0, A.mood.anger - dt * 0.035);
    A.mood.sad   = Math.max(0, A.mood.sad   - dt * 0.02);
    A.mood.happy = lerp(A.mood.happy, 0.5, dt * 0.05);

    // ── Miya ──────────────────────────────────────────────
    Brain.tick(dt);
    syncMood(A);
    // ⚠ Xarakter siljishi `cfg` ga UZATILISHI kerak. Ilgari
    //   `applyPersonality` faqat yuklashda chaqirilardi — ya'ni
    //   sessiya ichidagi siljish hech qanday ta'sir ko'rsatmasdi
    //   va 64-bo'lim ("sessiyadan sessiyaga o'zgarish") yarim
    //   ishlardi. Har soniyada bir marta — arzon.
    A._persT = (A._persT || 0) + dt;
    if (A._persT > 1) { A._persT = 0; if (Brain.isLoaded()) applyPersonality(A); }
    A.afk > A.cfg.afkLimit ? Brain.emo('sadness', dt * 0.02)
                           : Brain.emo('boredom', -dt * 0.004);

    // ⚠ "O'yinchi menga qarab turibdi" — kamera yo'nalishi bilan
    //   Aikoga qarab vektor orasidagi burchak. Uzoq qarab tursa
    //   `shy` ishga tushadi (topshiriqning 2-bo'limi, "Uyalish").
    if (isPlay() && window.camera) {
      const cam = window.camera;
      const to = new (T().Vector3)(
        A.root.position.x - cam.position.x,
        (A.root.position.y + A.cfg.height * 0.8) - cam.position.y,
        A.root.position.z - cam.position.z);
      const dist = to.length() || 1e-6;
      to.divideScalar(dist);
      const fwd = new (T().Vector3)(0, 0, -1).applyQuaternion(cam.quaternion);
      const dot = to.dot(fwd);
      A.staredAt = (dot > 0.965 && dist < 12)
        ? (A.staredAt || 0) + dt
        : Math.max(0, (A.staredAt || 0) - dt * 2);
    } else A.staredAt = 0;

    // Ergashish rejimi (dialogdan)
    if (A.followT > 0) {
      A.followT -= dt;
      A.home.copy(pp);
    }

    // Sezish
    const S = Sense.scan(A.root, A.cfg, dt);

    // Xatti-harakat almashinuvi
    if (A.done || !A.behavior) {
      if (A.behavior && A.behavior.exit) { try { A.behavior.exit(A); } catch (e) {} }
      A.done = false;
      A.lock = false;
      const nb = choose(A, S);
      if (nb !== A.behavior) {
        A.behavior = nb;
        A.bTime = 0;
        if (nb) { try { Brain.used(nb.id, true); Brain.note('do', nb.id); } catch (e) {} }
        if (nb && nb.enter) { try { nb.enter(A, S, false); } catch (e) {} }
      }
    } else {
      A.bTime += dt;
      // ⚠ `A.lock` — `force()` qo'ygan qulf. Usiz majburlangan
      //   xatti-harakat 0.6 s ichida boshqasiga almashib ketardi va
      //   🧪 "Sinash" asbobi HECH QACHON ishlamasdi (test aynan shuni
      //   topdi). Qulf faqat `done` bo'lganda ochiladi.
      A._reeval = (A._reeval || 0) + dt;
      if (A.lock) A._reeval = 0;
      if (A._reeval > 0.6) {
        A._reeval = 0;
        const nb = choose(A, S);
        if (nb && nb !== A.behavior) {
          if (A.behavior.exit) { try { A.behavior.exit(A); } catch (e) {} }
          A.behavior = nb;
          A.bTime = 0;
          try { Brain.used(nb.id, true); Brain.note('do', nb.id); } catch (e) {}
          if (nb.enter) { try { nb.enter(A, S, false); } catch (e) {} }
        }
      }
    }

    // Bajarish
    Pose.reset();
    if (A.behavior && A.behavior.tick) {
      try { A.behavior.tick(A, S, dt); }
      catch (e) {
        const key = A.behavior.id;
        if (!_err.has(key)) {
          _err.add(key);
          say('xatti-harakat xatosi [' + key + ']: ' + (e && e.message), 'le');
          console.error('[waifu:' + key + ']', e);
        }
        A.done = true;
      }
    }

    // ── Beso'naqaylik ─────────────────────────────────────
    //  ⚠ ILGARI JUDA TEZ-TEZ: 0.18 koeffitsientda soniyasiga
    //    ~10% ehtimol edi, ya'ni har 10 soniyada yiqilardi.
    //    Topshiriqda esa "beso'naqaylik — KAMDAN-KAM sodir
    //    bo'ladigan xususiyat" deyilgan. Endi koeffitsient 12
    //    barobar past VA o'z sovutish vaqti bor.
    A.tripCool = Math.max(0, (A.tripCool || 0) - dt);
    if (A.trip == null && A.tripCool <= 0 && A.speed > 1.2 && A.onGround &&
        Math.random() < dt * A.cfg.clumsy * 0.015) {
      A.trip = 0.001;
      A.tripCool = 45;              // keyingisi eng erta 45 s dan keyin
    }

    // Pirpiratish
    if (Math.random() < dt * 0.5) {
      A.blinkT = 0.12;
    }
    if (A.blinkT > 0) { A.blinkT -= dt; Pose.face({ lid: 1 }); }

    // ⚠ Cho'kkalash: pozaning "pastlik" darajasini haqiqiy
    //   BALANDLIKKA aylantiramiz. Oyoq suyagi bo'lmagan modelda
    //   bu yagona yo'l — aks holda o'tirgan Aiko havoda qolardi.
    const wantCrouch = Pose.crouchAmount() * A.cfg.height * 0.42;
    A.crouch = lerp(A.crouch || 0, wantCrouch, clamp(6 * dt, 0, 1));

    // Primitiv tana (hamisha bor — GLB bo'lsa yashiriladi)
    if (P) Pose.apply(P, dt, 11);
    // GLB skeleti bo'lsa — AYNAN o'sha maqsadlar suyaklarga
    if (A.rig) { try { Rig.apply(A.rig, Pose.goals(), dt, 11); } catch (e) {} }

    // ⚠ Cho'kkalashni MODELGA qo'llaymiz, `root` ga emas: `root.y`
    //   zamin tekshiruvi va gravitatsiya uchun ishlatiladi. Uni
    //   tushirsak Aiko yerga botib ketardi va keyingi kadrda
    //   gravitatsiya uni qaytadan ko'tarardi — titrash chiqardi.
    const glb = A.root.userData._wGlb;
    if (glb) glb.position.y = (glb.userData._wBaseY || 0) - A.crouch;
    else if (P && P.hip) P.hip.position.y = (P.hip.userData._baseY != null
      ? P.hip.userData._baseY : (P.hip.userData._baseY = P.hip.position.y)) - A.crouch;
    syncCarried(A);
    updateHearts(A, dt);

    // Pufakcha
    if (A.bubbleT > 0) A.bubbleT -= dt;
    UI.drawBubble(A);

    // Kayfiyatni obyektga yozib boramiz — saqlanadi
    A.root.userData.wMood = {
      happy: +A.mood.happy.toFixed(3), anger: +A.mood.anger.toFixed(3),
      curiosity: +A.mood.curiosity.toFixed(3), sad: +A.mood.sad.toFixed(3),
      love: +A.mood.love.toFixed(3),
    };
  }

  // ── O'z RAF sikli ─────────────────────────────────────────
  //  ⚠ `main-loop.js` addonni bilmaydi. `TimelineSystem` ham
  //    aynan shunday alohida siklda yuradi.
  function loop(now) {
    if (!_running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - _last) / 1000 || 0.016);
    _last = now;
    try { update(dt); }
    catch (e) {
      if (!_err.has('loop')) {
        _err.add('loop');
        say('sikl xatosi: ' + (e && e.message), 'le');
        console.error('[waifu:loop]', e);
      }
    }
  }

  function start() {
    if (_running) return;
    _running = true;
    _last = performance.now();
    requestAnimationFrame(loop);
  }

  function stop() { _running = false; }

  // ── Klaviatura: dialogni ochish ───────────────────────────
  function onKey(e) {
    if (UI.isOpen()) return;                     // ichida yozilyapti
    const A = _agent;
    if (!A) return;
    if (e.code !== (A.cfg.talkKey || DEF.talkKey)) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const d = A.root.position.distanceTo(playerPos());
    if (d > (A.cfg.talkDist || DEF.talkDist) * 3) return;
    e.preventDefault();
    UI.open();
  }
  window.addEventListener('keydown', onKey, true);

  // ── SystemRegistry shartnomasi ────────────────────────────
  function serialize() {
    const A = _agent;
    if (!A) return null;
    return {
      cfg: A.cfg,
      mood: A.mood,
      home: { x: A.home.x, y: A.home.y, z: A.home.z },
      stolen: A.stolen.slice(0, 60),
      built: A.built.length,
      pocketId: A.pocket ? A.pocket.userData.id : null,
    };
  }

  function restore(d) {
    if (!d) return;
    const A = ensure();
    if (!A) { window.__waifuPending = d; return; }   // obyekt hali yaratilmagan
    if (d.cfg)  A.cfg = Object.assign({}, DEF, d.cfg);
    if (d.mood) Object.assign(A.mood, d.mood);
    if (d.home) A.home.set(d.home.x, d.home.y, d.home.z);
    if (Array.isArray(d.stolen)) A.stolen = d.stolen.slice();
    if (d.built) A.built = new Array(d.built).fill(0);
    if (d.pocketId != null) {
      const o = (window.objects || []).find(x => x.userData &&
                  String(x.userData.id) === String(d.pocketId));
      if (o) { A.pocket = o; o.visible = false; o.userData._wPocket = true; }
    }
    A.root.userData.wCfg = A.cfg;
  }

  // ── Xotirani yuklash va sessiyani boshlash ────────────────
  //  ⚠ Bu ASINXRON. Aiko xotira kelmasdan ham yurishi mumkin —
  //    `Brain.isLoaded()` false bo'lsa `bias()` neytral qaytaradi.
  //    Aks holda dvigatel ishga tushishi tarmoqqa bog'lanib qolardi.
  Brain.load((M, src) => {
    const s = Brain.lastSummary();
    say(`xotira yuklandi (${src}) — ${M.sessionCount}-sessiya, ` +
        `${Object.keys(M.novelty).length} ta tanish ish, ` +
        `munosabat ${Math.round(M.player.relationship * 100)}%`);
    if (s && s.summary && s.summary.length)
      say('o\'tgan safar: ' + s.summary.slice(-3).join(' · '));
    // Xarakterni sozlamalarga uzatamiz
    const A = _agent;
    if (A) applyPersonality(A);
    if (A && s) {
      const last = (s.summary || []).slice(-1)[0] || '';
      speak(A, M.sessionCount <= 1
        ? pick(['Salom! Men Aiko.', 'Birinchi marta ko\'rishyapmiz.'])
        : pick(['Yana keldingizmi?', 'Kecha nima qilganimni eslayman.',
                'Bugun boshqa narsa qilaman.']), 5);
    }
  });

  // Sahifa yopilganda sessiyani yakunlaymiz
  window.addEventListener('beforeunload', () => {
    try { Brain.endSession(); } catch (e) {}
  });

  start();


  /**
   * GLB modelni yuklab Aikoga ulaydi.
   * @param {string|File} src URL yoki fayl
   */
  function loadGlb(src, cb) {
    const A = ensure();
    if (!A) { say('Avval Aikoni chaqiring', 'lw'); return; }
    const TH = T();
    const L = TH.GLTFLoader ? new TH.GLTFLoader() : null;
    if (!L) { say('GLTFLoader topilmadi', 'le'); return; }

    const done = (gltf) => {
      let rig = null;
      try { rig = attachGlb(A, gltf.scene); } catch (e) { say('model ulanmadi: ' + e.message, 'le'); }
      if (rig) {
        say(`model ulandi — skelet topildi (${rig.bones.length} suyak, ` +
            `oyoq ${rig.hasLegs ? 'BOR' : "YO'Q"})`);
        if (!rig.hasLegs)
          say('⚠ Bu rigda oyoq suyagi yo\'q — yurish oyoq animatsiyasisiz ' +
              'ko\'rsatiladi (tepa qism to\'liq ishlaydi)', 'lw');
      } else {
        say('⚠ model ulandi, lekin skelet topilmadi — u qimirlamaydi', 'lw');
      }
      if (cb) cb(rig);
    };

    if (typeof src === 'string') {
      L.load(src, done, undefined, (e) => say('model yuklanmadi: ' + src, 'le'));
      A.root.userData.wGlbUrl = src;             // `_` siz → saqlanadi
    } else {
      const r = new FileReader();
      r.onload = () => {
        try { L.parse(r.result, '', done, (e) => say('GLB o\'qilmadi', 'le')); }
        catch (e) { say('GLB xato: ' + e.message, 'le'); }
      };
      r.readAsArrayBuffer(src);
    }
  }

  /** Yuklashdan keyin model yo'li saqlangan bo'lsa qayta o'qiydi. */
  function reloadGlbIfSaved() {
    const A = _agent;
    if (!A || A.rig || A._glbTried) return;
    // ⚠ Avval saqlangan yo'l, bo'lmasa addon papkasidagi standart
    //   model. Shunda Aiko chaqirilishi bilanoq to'g'ri ko'rinadi —
    //   qo'lda ulash SHART emas.
    const url = A.root.userData.wGlbUrl || 'addons/waifu/models/AIKO.glb';
    A._glbTried = true;
    loadGlb(url);
  }

  /**
   * Xatti-harakatni majburan ishga tushiradi va TUGAGUNCHA ushlab
   * turadi (`A.lock`). Sinov asboblari va testlar shu orqali yuradi.
   */
  function force(id, target) {
    const A = ensure();
    if (!A) return false;
    const b = BEHAVIORS.find(x => x.id === String(id).trim());
    if (!b) return false;
    if (A.behavior && A.behavior.exit) { try { A.behavior.exit(A); } catch (e) {} }
    delete A.cool[b.id];
    A.behavior = b;
    A.done = false;
    A.bTime = 0;
    A.lock = true;
    // ⚠ `target` `enter()` DAN OLDIN qo'yiladi. Teskarisi bo'lganda
    //   `enter()` eski nishonni o'qirdi: `kick` da `tooBig` avvalgi
    //   jism bo'yicha hisoblanib, katta toshni ham tepib yuborardi.
    if (target) A.target = target;
    try { if (b.enter) b.enter(A, Sense.out, !!target); } catch (e) {}
    if (target) A.target = target;   // `enter()` uni almashtirmasin
    return true;
  }

  return {
    create, ensure, findRoot, update, start, stop, force,
    loadGlb, attachGlb: (g) => attachGlb(_agent, g), rig: () => (_agent && _agent.rig),
    brain: () => Brain,
    agent: () => _agent,
    poseCrouch: () => Pose.crouchAmount(),
    talk:  () => UI.open(),
    say:   (t) => { if (_agent) speak(_agent, t, 3.5); },
    behaviors: BEHAVIORS,
    /** Diagnostika: `WaifuSystem.report()` konsolda. */
    report() {
      const A = _agent;
      if (!A) return { ok: false, why: 'Aiko sahnada yo\'q' };
      return {
        behavior: A.behavior ? A.behavior.id : null,
        mood: A.mood,
        carried: A.carried ? A.carried.userData.name : null,
        pocket: A.pocket ? A.pocket.userData.name : null,
        stash: A.stash.length,
        built: A.built.length,
        afk: +A.afk.toFixed(1),
        onGround: A.onGround,
        cooldowns: Object.keys(A.cool),
      };
    },
    serialize, restore,
  };
})();

// Yuklash tartibi teskari bo'lsa (restore create dan oldin kelsa)
if (window.__waifuPending) {
  try { window.WaifuSystem.restore(window.__waifuPending); } catch (e) {}
  delete window.__waifuPending;
}

// ============================================================
//  11.5 GLB SKELET — tayyor modelni suyaklari bilan ulash
// ------------------------------------------------------------
//  ⚠ NEGA GEOMETRIK ANIQLASH, NOM BO'YICHA EMAS:
//    Sketchfab/Blender orqali o'tgan modellarda suyak nomlari
//    ko'pincha buziladi. AIKO.glb da HAMMA nom `U+FFFD` ga
//    aylangan — ya'ni nom orqali (Mixamo, SkeletonUtils.retarget
//    va boshqa hamma retargeter shunday ishlaydi) suyakni topib
//    BO'LMAYDI.
//
//    Shuning uchun suyaklar TUZILISH bo'yicha topiladi:
//      • hips   — ildizdan pastdagi eng past tarmoqlanish
//      • spine  — undan yuqoriga ketgan eng uzun zanjir
//      • chest  — zanjirdagi oxirgi tarmoqlanish nuqtasi
//      • head   — chest ustidagi, |x|≈0 bo'lgan eng baland zanjir
//      • arms   — chest dan |x| eng katta tomonga ketgan zanjir
//      • legs   — hips dan PASTGA ketgan zanjir (bo'lmasligi mumkin)
//
//    Bu nomga umuman bog'liq emas va buzilgan riglarda ham ishlaydi.
// ============================================================

const Rig = (() => {


  /**
   * Suyakning rest burchagini shunday tuzatadiki, u bolasi tomon
   * emas, KO'RSATILGAN yo'nalishga qarasin.
   *
   * @param {object} R    rig
   * @param {string} key  'armL' kabi kalit
   * @param {Array}  chain shu qo'l/oyoq zanjiri (keyingi suyakni topish uchun)
   * @param {number} x,y,z xohlangan yo'nalish (dunyo fazosi)
   */
  function aimBone(R, key, chain, x, y, z) {
    const TH = T();
    const b = R[key];
    if (!b || !chain) return;

    // ⚠ Yo'nalish ZANJIR UCHIGA qarab olinadi ("qo'l qayoqqa
    //   cho'zilgan"), zanjirdagi keyingi suyakka emas: chap va
    //   o'ng zanjir uzunligi farq qilishi mumkin va o'shanda
    //   qo'llar assimetrik tushardi.
    const i = chain.indexOf(b);
    if (i < 0 || i + 1 >= chain.length) return;
    const tip = chain[chain.length - 1];
    if (tip === b) return;

    const wantDir = new TH.Vector3(x, y, z).normalize();
    const p0 = new TH.Vector3(), p1 = new TH.Vector3();
    const q = new TH.Quaternion();
    const boneWorldQ = new TH.Quaternion();
    const parentWorldQ = new TH.Quaternion();

    // ⚠ ITERATIV. Bir marta hisoblash YETARLI EMAS: ko'zgu qilingan
    //   riglarda bir tomon manfiy masshtabli bo'ladi va
    //   `getWorldQuaternion()` shunday tugunlarda aniq natija
    //   bermaydi. O'lchovda bu ko'rindi — chap qo'l 0.49 m tushdi,
    //   o'ng qo'l atigi 0.10 m.
    //
    //   Uch marta takrorlash xatoni yo'q qiladi va bu BIR MARTALIK
    //   narx (model ulanganda), har kadr emas.
    for (let it = 0; it < 3; it++) {
      b.updateMatrixWorld(true);
      tip.updateWorldMatrix(true, false);
      p0.setFromMatrixPosition(b.matrixWorld);
      p1.setFromMatrixPosition(tip.matrixWorld);
      const cur = p1.clone().sub(p0);
      if (cur.lengthSq() < 1e-10) return;
      cur.normalize();
      if (cur.dot(wantDir) > 0.9995) break;         // yetarlicha aniq

      q.setFromUnitVectors(cur, wantDir);
      b.getWorldQuaternion(boneWorldQ);
      parentWorldQ.identity();
      if (b.parent) b.parent.getWorldQuaternion(parentWorldQ);

      // local = parentWorld⁻¹ · q · boneWorld
      b.quaternion.copy(parentWorldQ.clone().invert().multiply(q).multiply(boneWorldQ));
    }

    b.updateMatrixWorld(true);
    R.rest.set(key, b.quaternion.clone());
  }

  /** Suyakning dunyo pozitsiyasi (rest holatda). */
  function wpos(b, out) {
    const v = out || new (T().Vector3)();
    b.updateWorldMatrix(true, false);
    return v.setFromMatrixPosition(b.matrixWorld);
  }

  /** Suyak ostidagi eng uzun zanjir. */
  function longest(b, depth) {
    const d = depth || 0;
    if (d > 40 || !b.children.length) return [b];
    let best = [];
    for (const c of b.children) {
      if (!c.isBone) continue;
      const ch = longest(c, d + 1);
      if (ch.length > best.length) best = ch;
    }
    return [b].concat(best);
  }

  /** `pred` shartiga eng mos bolani tanlab zanjir tuzadi. */
  function chainBy(b, score, maxLen) {
    const out = [b];
    let cur = b;
    for (let i = 0; i < (maxLen || 6); i++) {
      let best = null, bs = -Infinity;
      for (const c of cur.children) {
        if (!c.isBone) continue;
        const s = score(c, cur);
        if (s > bs) { bs = s; best = c; }
      }
      if (!best) break;
      out.push(best);
      cur = best;
    }
    return out;
  }

  /**
   * Modeldan humanoid suyaklarni topadi.
   * @returns {object|null} { hips, spine, chest, neck, head,
   *                          armL/R, foreL/R, handL/R,
   *                          legL/R, shinL/R, hasLegs, scale }
   */
  function detect(rootObj) {
    const TH = T();
    let skinned = null;
    rootObj.traverse(o => { if (!skinned && o.isSkinnedMesh && o.skeleton) skinned = o; });
    if (!skinned) return null;

    const bones = skinned.skeleton.bones.filter(Boolean);
    if (bones.length < 5) return null;

    const P = new Map();
    for (const b of bones) P.set(b, wpos(b).clone());

    const ys = bones.map(b => P.get(b).y);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const H = Math.max(1e-6, maxY - minY);

    // ── HIPS: suyak bolalari 2+ bo'lgan eng past suyak ─────
    const boneKids = (b) => b.children.filter(c => c.isBone);
    let hips = null;
    for (const b of bones) {
      if (boneKids(b).length < 2) continue;
      if (!hips || P.get(b).y < P.get(hips).y) hips = b;
    }
    if (!hips) {
      // Tarmoqlanish yo'q — eng past suyakni olamiz
      hips = bones.reduce((a, b) => (P.get(b).y < P.get(a).y ? b : a));
    }

    // ── SPINE: hips dan YUQORIGA ketgan zanjir ─────────────
    const upScore = (c, par) => (P.get(c) ? P.get(c).y - P.get(par).y : -9) -
                                Math.abs(P.get(c) ? P.get(c).x : 9) * 2;
    const spineChain = chainBy(hips, upScore, 12).filter(b => P.has(b));

    // ── CHEST: zanjirdagi ENG YUQORI tarmoqlanish nuqtasi ──
    let chest = null;
    for (const b of spineChain) if (boneKids(b).length >= 2) chest = b;
    if (!chest) chest = spineChain[Math.min(spineChain.length - 1, 2)] || hips;
    const spine = spineChain[1] || chest;

    // ── QO'LLAR: UCHIDAN boshlab yuqoriga ─────────────────
    //  ⚠ Ilgari `chest` dan pastga qidirilardi va ISHLAMASDI:
    //    buzilgan rigda "chest" soch/bosh sohasiga tushib qolgan,
    //    qo'llar esa undan pastda edi — qidiruv ularni ko'rmagan.
    //
    //    Endi teskari: |x| eng katta suyak — bu ANIQ panja uchi
    //    (T-pozada qo'l eng chekkada). Undan OTA zanjiri bo'ylab
    //    yuqoriga chiqamiz, |x| kichrayib markazga yaqinlashgan
    //    joyda to'xtaymiz — bu yelka. Bu chest qayerda deb
    //    topilganiga UMUMAN bog'liq emas.
    const armSpan = Math.max(...bones.map(b => Math.abs(P.get(b).x)));
    function armChain(sign) {
      // 1) Uchi: shu tomondagi eng chekka suyak
      let tip = null, bs = -Infinity;
      for (const b of bones) {
        const x = P.get(b).x * sign;
        if (x > bs) { bs = x; tip = b; }
      }
      if (!tip || bs < armSpan * 0.5) return null;

      // 2) Ota zanjiri bo'ylab markazga qaytamiz
      const up = [];
      let cur = tip;
      while (cur && up.length < 24) {
        up.push(cur);
        const par = cur.parent;
        if (!par || !par.isBone || !P.has(par)) break;
        // Markazga yetdik — bu yelka ildizi
        if (Math.abs(P.get(par).x) < armSpan * 0.12) { up.push(par); break; }
        cur = par;
      }
      const chain = up.reverse();          // yelka → … → panja
      if (chain.length < 3) return null;

      // 3) Yelka · tirsak · panja ni zanjirdan TENG masofada olamiz.
      //    Barmoq suyaklari zanjirni cho'zib yuboradi, shuning uchun
      //    |x| ning 0→maks yo'lidagi 1/3 va 2/3 nuqtalarini olamiz.
      const x0 = Math.abs(P.get(chain[0]).x);
      const x1 = Math.abs(P.get(chain[chain.length - 1]).x);
      const at = (f) => {
        const want = x0 + (x1 - x0) * f;
        let best = chain[0], bd = Infinity;
        for (const b of chain) {
          const d = Math.abs(Math.abs(P.get(b).x) - want);
          if (d < bd) { bd = d; best = b; }
        }
        return best;
      };
      return { shoulder: chain[0], upper: at(0.18), fore: at(0.62),
               hand: at(0.92), chain };
    }
    const aL = armChain(-1), aR = armChain(1);

    // ── CHEST ni QAYTA aniqlash: qo'llar qo'shiladigan joy ──
    //  Ikki yelkaning eng yaqin umumiy ajdodi — bu ko'krak.
    //  Bu "spine zanjiridagi eng yuqori tarmoqlanish" dan ancha
    //  ishonchli: soch/yubka suyaklari uni chalg'ita olmaydi.
    if (aL && aR) {
      const anc = new Set();
      let c = aL.shoulder;
      while (c) { anc.add(c); c = (c.parent && c.parent.isBone) ? c.parent : null; }
      let c2 = aR.shoulder;
      while (c2) { if (anc.has(c2)) { chest = c2; break; }
                   c2 = (c2.parent && c2.parent.isBone) ? c2.parent : null; }
    }


    // ── OYOQLAR: hips dan PASTGA ketgan zanjir ────────────
    //  ⚠ Ba'zi riglarda oyoq suyagi UMUMAN yo'q (oyoq qattiq
    //    skinlangan). Shuni ochiq aniqlaymiz — `hasLegs`.
    function legChain(sign) {
      const hipY = P.get(hips).y;
      let tip = null, bs = Infinity;
      for (const b of bones) {
        const p = P.get(b);
        if (p.y > hipY - H * 0.15) continue;          // yetarlicha past emas
        if (p.x * sign < -H * 0.02) continue;         // noto'g'ri tomon
        if (p.y < bs) { bs = p.y; tip = b; }
      }
      if (!tip) return null;
      const up = [];
      let cur = tip;
      while (cur && up.length < 12) {
        up.push(cur);
        const par = cur.parent;
        if (!par || !par.isBone || !P.has(par)) break;
        if (P.get(par).y >= hipY - H * 0.02) break;   // hips ga yetdik
        cur = par;
      }
      const chain = up.reverse();
      return chain.length >= 2 ? chain : null;
    }
    const lL = legChain(-1), lR = legChain(1);

    // ── BOSH va BO'YIN ────────────────────────────────────
    //  ⚠ "Eng baland suyak" YARAMAYDI: soch dumchalari boshdan
    //    ham balandda bo'lishi mumkin va bosh o'rniga SOCH UCHI
    //    tanlanardi — bosh animatsiyasi butunlay noto'g'ri
    //    ko'rinardi (soch aylanar, bosh qotib turardi).
    //
    //    Kalla suyagini uning OG'IRLIGI bilan topamiz: soch,
    //    quloq, yuz — hammasi kalla ostiga osilgan, shuning uchun
    //    unda ENG KO'P avlod bor. Soch uchida esa bitta-ikkita.
    let head = null, neck = null;
    {
      const chestY = P.get(chest).y;
      const cands = [];
      const scan = (b, d) => {
        if (d > 7) return;
        for (const c of b.children) {
          if (!c.isBone || !P.has(c)) continue;
          const p = P.get(c);
          if (p.y > chestY && Math.abs(p.x) < H * 0.07) cands.push(c);
          scan(c, d + 1);
        }
      };
      scan(chest, 0);

      if (cands.length) {
        // Avlodlar soni
        const weight = (b) => { let n = 0; b.traverse(o => { if (o.isBone) n++; }); return n; };
        const scored = cands.map(b => ({
          b, w: weight(b), y: P.get(b).y,
        }));
        // Kalla: ko'p avlodli VA yetarlicha baland
        const maxW = Math.max(...scored.map(x => x.w));
        const headCands = scored.filter(x => x.w >= Math.max(3, maxW * 0.35));
        head = headCands.length
          ? headCands.reduce((a, b) => (b.y > a.y ? b : a)).b   // ular ichida eng balandi
          : scored.reduce((a, b) => (b.y > a.y ? b : a)).b;

        // Bo'yin — kalla bilan chest orasidagi eng past nomzod
        const below = scored.filter(x => x.b !== head && x.y < P.get(head).y);
        neck = below.length ? below.reduce((a, b) => (b.y < a.y ? b : a)).b : null;
        // Bo'yin kalla otasi bo'lsa — eng ishonchli variant
        if (head.parent && head.parent.isBone && P.has(head.parent) &&
            P.get(head.parent).y > chestY) neck = head.parent;
      }
    }

    const R = {
      skinned, bones, hips, spine, chest,
      neck: neck || chest, head: head || neck || chest,
      shoulderL: aL && aL.shoulder, shoulderR: aR && aR.shoulder,
      armL:  aL && aL.upper, armR:  aR && aR.upper,
      foreL: aL && aL.fore,  foreR: aR && aR.fore,
      handL: aL && aL.hand,  handR: aR && aR.hand,
      legL:  lL && lL[0],  legR:  lR && lR[0],
      shinL: lL && lL[1],  shinR: lR && lR[1],
      hasLegs: !!(lL && lR),
      chainL: aL && aL.chain, chainR: aR && aR.chain,
      height: H,
      // Rest burchaklarni saqlaymiz — animatsiya ULARGA nisbatan qo'yiladi
      rest: new Map(),
    };
    for (const k of ['hips','spine','chest','neck','head','armL','armR',
                     'foreL','foreR','handL','handR','legL','legR','shinL','shinR']) {
      const b = R[k];
      if (b) R.rest.set(k, b.quaternion.clone());
    }

    // ── T-POZADAN CHIQARISH ───────────────────────────────
    //  ⚠ MODEL T-POZADA: qo'llar YONGA cho'zilgan. Animatsiyalar
    //    rest burchakka QO'SHILADI, ya'ni ular ham yonga cho'zilgan
    //    holatdan boshlanardi — Aiko doim "T" bo'lib turardi.
    //
    //    Yechim: rest burchakni BIR MARTA tuzatamiz. Yelka suyagi
    //    hozir qayoqqa qaragan bo'lsa (`restDir`), uni pastga
    //    burib qo'yamiz (`wantDir`). Burilish DUNYO fazosida
    //    hisoblanadi, so'ng suyakning LOKAL fazosiga o'tkaziladi —
    //    shuning uchun suyakning o'q konventsiyasi (X-up, Y-up,
    //    Z-up — modelchi qanday qilgan bo'lsa) ahamiyatsiz.
    aimBone(R, 'armL',  aL && aL.chain, -0.28, -1, 0.06);
    aimBone(R, 'armR',  aR && aR.chain,  0.28, -1, 0.06);
    aimBone(R, 'foreL', aL && aL.chain, -0.12, -1, 0.14);
    aimBone(R, 'foreR', aR && aR.chain,  0.12, -1, 0.14);

    return R;
  }

  /**
   * `Pose` maqsadlarini HAQIQIY suyaklarga qo'llaydi.
   *
   * ⚠ Burchak rest holatga QO'SHILADI, ustidan yozilmaydi. T-poza
   *   modelda qo'llar yonga cho'zilgan — mutlaq burchak qo'ysak
   *   qo'llar yelkadan uzilib ketardi.
   */
  function apply(R, goals, dt, speed) {
    if (!R) return;
    // ⚠ OYOQ SUYAGI YO'Q BO'LSA yurish sonini boshqa yo'l bilan
    //   ko'rsatamiz. Ilgari `legL/legR` maqsadlari shunchaki
    //   yo'qolardi va Aiko oyog'ini qimirlatmay SIRPANIB yurardi.
    //
    //   O'rniga oyoq qadamini TANA tebranishiga aylantiramiz:
    //   chap-o'ng chayqalish (`hips.z`) va yuqori-past sakrash
    //   (`hips.x`). Bu haqiqiy yurishning ikkilamchi harakati —
    //   oyoq ko'rinmasa ham miya uni "qadam" deb o'qiydi.
    if (!R.hasLegs && R.hips) {
      const gl = goals.legL, gr = goals.legR;
      if (gl && gr) {
        const swing = (gl.x - gr.x) * 0.5;          // qadam fazasi
        goals.hip = goals.hip || { x: 0, y: 0, z: 0 };
        goals.hip = {
          x: goals.hip.x + Math.abs(swing) * 0.10,  // har qadamda sal ko'tariladi
          y: goals.hip.y,
          z: goals.hip.z + swing * 0.16,            // chap-o'ng chayqalish
        };
      }
    }
    const TH = T();
    const k = clamp((speed == null ? 10 : speed) * dt, 0, 1);
    const e = new TH.Euler();
    const q = new TH.Quaternion();
    const map = {
      hip: 'hips', neck: 'neck', head: 'head',
      armL: 'armL', armR: 'armR', foreL: 'foreL', foreR: 'foreR',
      legL: 'legL', legR: 'legR', shinL: 'shinL', shinR: 'shinR',
    };
    for (const g in map) {
      const b = R[map[g]];
      if (!b) continue;
      const rest = R.rest.get(map[g]);
      let t = goals[g];
      // ⚠ Pozalar odatda faqat `neck` ni beradi. Bosh suyagi alohida
      //   bo'lsa, u qimirlamay qotib qolardi — tirik ko'rinmasdi.
      //   Haqiqiy bo'yin harakatida bosh HAMISHA ergashadi, shuning
      //   uchun `head` maqsadi bo'lmasa `neck` ning bir qismini oladi.
      if (!t && g === 'head' && goals.neck)
        t = { x: goals.neck.x * 0.45, y: goals.neck.y * 0.45, z: goals.neck.z * 0.45 };
      if (!t) t = { x: 0, y: 0, z: 0 };
      e.set(t.x, t.y, t.z, 'XYZ');
      q.setFromEuler(e);
      if (rest) q.premultiply(rest);              // rest + animatsiya
      b.quaternion.slerp(q, k);
    }
  }

  return { detect, apply, wpos };
})();

// ============================================================
//  12. REDAKTOR ASBOBLARI
// ============================================================

APEX.register({
  id:          'waifu',
  name:        'AI Hamroh — Aiko',
  icon:        '🌸',
  version:     '1.0.0',
  author:      'APEX',
  description: "Mustaqil qaror qabul qiladigan AI qiz: o'g'irlaydi, quradi, tepadi, gaplashadi.",

  tools: [

    // ── 🌸 Aikoni qo'yish ─────────────────────────────────
    {
      id: 'spawn', icon: '🌸', name: 'Aikoni chaqirish',
      desc: "Sahnaga AI hamrohni qo'yadi (bitta bo'lishi kifoya)",
      run(api) {
        const has = window.WaifuSystem.findRoot();
        if (has) {
          api.log('Aiko allaqachon sahnada — tanlandi', 'lw');
          api.select(has);
          return;
        }
        const g = window.WaifuSystem.create(api.frontOfCamera(3.5));
        api.refresh();
        api.select(g);
        api.log('Aiko keldi. ▶ O\'YNA bosing — u o\'zi harakat qiladi. ' +
                'Gaplashish: T tugmasi.');
      },
    },

    // ── 💬 Gaplashish ─────────────────────────────────────
    {
      id: 'talk', icon: '💬', name: 'Gaplashish',
      desc: 'Dialog oynasini ochadi (o\'yinda: T tugmasi)',
      run(api) {
        if (!window.WaifuSystem.ensure()) {
          api.log('Avval Aikoni chaqiring', 'lw');
          return;
        }
        window.WaifuSystem.talk();
      },
    },


    // ── 🧍 GLB model ulash ────────────────────────────────
    {
      id: 'model', icon: '🧍', name: 'Tayyor model ulash (GLB)',
      desc: "Skeletli GLB ni yuklaydi — suyaklar GEOMETRIYA bo'yicha topiladi",
      run(api) {
        if (!window.WaifuSystem.ensure()) { api.log('Avval Aikoni chaqiring', 'lw'); return; }
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.glb,.gltf';
        inp.style.display = 'none';
        inp.onchange = () => {
          const f = inp.files && inp.files[0];
          if (f) {
            api.log('Model o\'qilmoqda: ' + f.name + ' …');
            window.WaifuSystem.loadGlb(f, (rig) => {
              api.refresh();
              if (!rig) return;
              const miss = [];
              for (const k of ['hips','chest','head','armL','armR','handL','handR'])
                if (!rig[k]) miss.push(k);
              api.log('Topilgan suyaklar: hips·chest·head·qo\'llar' +
                      (rig.hasLegs ? '·oyoqlar' : '') +
                      (miss.length ? ' | topilmadi: ' + miss.join(',') : ''));
            });
          }
          if (inp.parentNode) inp.parentNode.removeChild(inp);
        };
        document.body.appendChild(inp);
        inp.click();
      },
    },

    // ── 🦴 Skelet hisoboti ────────────────────────────────
    {
      id: 'rig', icon: '🦴', name: 'Skelet hisoboti',
      desc: "Qaysi suyak nima deb topilgani va nima yetishmayotgani",
      run(api) {
        const r = window.WaifuSystem.rig();
        if (!r) { api.log('Skelet yo\'q — 🧍 bilan GLB ulang', 'lw'); return; }
        const nm = (b) => b ? ('node "' + String(b.name || '?').slice(0, 18) + '"') : '—';
        api.log(`Jami suyak: ${r.bones.length} | model balandligi: ${r.height.toFixed(3)}`);
        api.log(`hips=${nm(r.hips)} chest=${nm(r.chest)} head=${nm(r.head)}`);
        api.log(`qo'l L=${nm(r.armL)} R=${nm(r.armR)} | panja L=${nm(r.handL)} R=${nm(r.handR)}`);
        api.log(`oyoq: ${r.hasLegs ? nm(r.legL) + ' / ' + nm(r.legR) : "YO'Q — yurish oyoqsiz"}`);
        console.log('[waifu] rig', r);
      },
    },

    // ── 🎛 Fe'l-atvor ─────────────────────────────────────
    {
      id: 'temper', icon: '🎛', name: 'Fe\'l-atvorini sozlash',
      desc: 'Qiziquvchanlik, shumlik, jahldorlik, beso\'naqaylik, mehr',
      run(api) {
        const A = window.WaifuSystem.ensure();
        if (!A) { api.log('Avval Aikoni chaqiring', 'lw'); return; }

        const ask = (label, key) => {
          const cur = Math.round((A.cfg[key] != null ? A.cfg[key] : DEF[key]) * 100);
          const v = api.ask(label + ' (0–100):', String(cur));
          if (v == null) return false;
          const n = parseInt(v, 10);
          if (!isNaN(n)) A.cfg[key] = clamp(n / 100, 0, 1);
          return true;
        };

        if (!ask('Qiziquvchanlik', 'curiosity')) return;
        if (!ask('Shumlik (o\'g\'irlash, trigger)', 'mischief')) return;
        if (!ask('Jahldorlik', 'temper')) return;
        if (!ask('Beso\'naqaylik (yiqilish)', 'clumsy')) return;
        if (!ask('Mehr (quchoqlash)', 'affection')) return;

        A.mood.love = Math.max(A.mood.love, A.cfg.affection * 0.6);
        A.root.userData.wCfg = A.cfg;
        api.refresh();
        api.log(`Fe'l yangilandi — qiziqish ${Math.round(A.cfg.curiosity * 100)}%, ` +
                `shumlik ${Math.round(A.cfg.mischief * 100)}%, ` +
                `beso'naqaylik ${Math.round(A.cfg.clumsy * 100)}%`);
      },
    },

    // ── 📐 Jismoniy sozlamalar ────────────────────────────
    {
      id: 'body', icon: '📐', name: 'Bo\'y va tezlik',
      desc: 'Bo\'yi, yurish/yugurish tezligi, ko\'rish radiusi',
      run(api) {
        const A = window.WaifuSystem.ensure();
        if (!A) { api.log('Avval Aikoni chaqiring', 'lw'); return; }

        const h = parseFloat(api.ask('Bo\'yi (metr):', String(A.cfg.height)));
        if (isNaN(h)) { api.log('Bekor qilindi', 'lw'); return; }
        const w = parseFloat(api.ask('Yurish tezligi (m/s):', String(A.cfg.walkSpeed)));
        const r = parseFloat(api.ask('Ko\'rish radiusi (m):', String(A.cfg.sightRange)));
        const s = parseInt(api.ask('Qurish uchun necha jism kerak:', String(A.cfg.stashGoal)), 10);

        A.cfg.height     = clamp(h, 0.5, 4);
        if (!isNaN(w)) { A.cfg.walkSpeed = clamp(w, 0.4, 8); A.cfg.runSpeed = A.cfg.walkSpeed * 2; }
        if (!isNaN(r)) A.cfg.sightRange = clamp(r, 3, 60);
        if (!isNaN(s)) A.cfg.stashGoal  = clamp(s, 1, 40);

        A.root.userData.wCfg = A.cfg;
        clearBody(A.root);
        buildBody(A.root);                       // bo'y o'zgardi — qayta quramiz
        api.refresh();
        api.log(`Bo'yi ${A.cfg.height.toFixed(2)} m, tezligi ${A.cfg.walkSpeed} m/s, ` +
                `ko'rishi ${A.cfg.sightRange} m`);
      },
    },

    // ── 🏠 "Uy" nuqtasini belgilash ───────────────────────
    {
      id: 'home', icon: '🏠', name: 'Uy nuqtasini belgilash',
      desc: 'O\'g\'irlagan narsalarini shu yerga tashiydi va shu yerda quradi',
      run(api) {
        const A = window.WaifuSystem.ensure();
        if (!A) { api.log('Avval Aikoni chaqiring', 'lw'); return; }
        const p = window.selectedObj && !window.selectedObj.userData.isWaifu
          ? window.selectedObj.position.clone()
          : api.frontOfCamera(4);
        A.home.copy(p);
        api.log(`Uy nuqtasi: ${p.x.toFixed(1)}, ${p.z.toFixed(1)} — ` +
                'o\'g\'irlagan jismlarini shu yerga yig\'adi');
      },
    },

    // ── 🧪 Xatti-harakatni majburlash ─────────────────────
    {
      id: 'force', icon: '🧪', name: 'Xatti-harakatni sinash',
      desc: 'Biror xatti-harakatni majburan ishga tushiradi (sinov uchun)',
      run(api) {
        const A = window.WaifuSystem.ensure();
        if (!A) { api.log('Avval Aikoni chaqiring', 'lw'); return; }
        const ids = BEHAVIORS.map(b => b.id).join(', ');
        const id = api.ask('Qaysi biri?\n' + ids, 'kick');
        if (!id) return;
        // ⚠ `force()` qulf qo'yadi — aks holda tanlangan xatti-harakat
        //   yarim soniyada boshqasiga almashib ketardi.
        if (!window.WaifuSystem.force(id)) {
          api.log('Bunday xatti-harakat yo\'q: ' + id, 'lw');
          return;
        }
        api.log('Majburlandi: ' + String(id).trim() + ' (tugaguncha almashmaydi)');
      },
    },


    // ── 🧠 Xotira hisoboti ────────────────────────────────
    {
      id: 'memory', icon: '🧠', name: 'Xotira hisoboti',
      desc: "Nechta sessiya, nimalarni o'rgangan, qanday hissiyotda",
      run(api) {
        const M = Brain.mem();
        if (!Brain.isLoaded()) { api.log('Xotira hali yuklanmoqda…', 'lw'); return; }
        const E = M.emotions, P = M.personality;
        api.log(`Sessiya: ${M.sessionCount} | munosabat: ` +
                `${Math.round(M.player.relationship * 100)}% | ` +
                `qurgan: ${M.constructions.length} | prank: ${Object.keys(M.pranks).length}`);
        api.log(`Hissiyot — xursand ${Math.round(E.happiness*100)}%, ` +
                `jahl ${Math.round(E.anger*100)}%, zerikish ${Math.round(E.boredom*100)}%, ` +
                `qo'rquv ${Math.round(E.fear*100)}%, ishonch ${Math.round(E.trust*100)}%`);
        api.log(`Xarakter — qiziqish ${Math.round(P.curiosity*100)}, ` +
                `shumlik ${Math.round(P.mischief*100)}, injiqlik ${Math.round(P.stubbornness*100)}, ` +
                `uyatchanlik ${Math.round(P.shyness*100)}, dangasalik ${Math.round(P.laziness*100)}`);
        api.log(`Bugungi maqsad: ${Brain.goals().join(', ')}`);
        const nov = Object.entries(M.novelty).sort((a,b) => a[1].novelty - b[1].novelty);
        if (nov.length)
          api.log(`Zerikkani: ${nov.slice(0,3).map(x => x[0]).join(', ')} | ` +
                  `yangi: ${nov.slice(-3).map(x => x[0]).join(', ')}`);
        console.log('[waifu] memory', M);
      },
    },

    // ── 🗑 Xotirani tozalash ──────────────────────────────
    {
      id: 'forget', icon: '🧽', name: 'Xotirani o\'chirish',
      desc: "Aiko hamma narsani unutadi va noldan boshlaydi",
      run(api) {
        const ok = api.ask('Aikoning BUTUN xotirasi o\'chadi.\n' +
                           'Tasdiqlash uchun "ha" deb yozing:', '');
        if (String(ok).trim().toLowerCase() !== 'ha') { api.log('Bekor qilindi'); return; }
        try { localStorage.removeItem('apex.waifu.memory'); } catch (e) {}
        fetch('/api/addon-memory/clear', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addon: 'waifu' }),
        }).catch(() => {});
        api.log('Xotira o\'chirildi. APEX ni qayta yuklang.');
      },
    },

    // ── 🔍 Holat hisoboti ─────────────────────────────────
    {
      id: 'report', icon: '🔍', name: 'Holat hisoboti',
      desc: 'Hozir nima qilyapti, kayfiyati, nimalarni olgan',
      run(api) {
        const r = window.WaifuSystem.report();
        if (r.ok === false) { api.log(r.why, 'lw'); return; }
        api.log(`Hozir: ${r.behavior || '—'} | kayfiyat: jahl ${Math.round(r.mood.anger * 100)}%, ` +
                `mehr ${Math.round(r.mood.love * 100)}%, hafa ${Math.round(r.mood.sad * 100)}%`);
        api.log(`Qo'lida: ${r.carried || '—'} | cho'ntagida: ${r.pocket || '—'} | ` +
                `to'plagan: ${r.stash} | qurgan: ${r.built} | AFK: ${r.afk}s`);
        console.log('[waifu] report', r);
      },
    },

    // ── 🗑 Olib tashlash ──────────────────────────────────
    {
      id: 'remove', icon: '🗑', name: 'Aikoni olib tashlash',
      desc: 'Sahnadan o\'chiradi va ushlab turgan narsalarini qaytaradi',
      run(api) {
        const root = window.WaifuSystem.findRoot();
        if (!root) { api.log('Aiko sahnada yo\'q', 'lw'); return; }
        const A = window.WaifuSystem.agent();
        if (A) {
          releaseObject(A, null);
          if (A.pocket) {
            A.pocket.visible = true;
            delete A.pocket.userData._wPocket;
            A.pocket = null;
          }
        }
        clearBody(root);
        window.scene.remove(root);
        const i = window.objects.indexOf(root);
        if (i > -1) window.objects.splice(i, 1);
        UI.close();
        api.refresh();
        api.log('Aiko ketdi. (Yana chaqirish mumkin)');
      },
    },
  ],
});

})();
