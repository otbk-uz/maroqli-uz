// ============================================================
//  🧭 AI NAVIGATSIYA va PATRUL  v1.0  (build 58.40)
// ------------------------------------------------------------
//  Agent QAYERGA va QANDAY borishini hal qiladi.
//
//    🚩 Patrul       — belgilangan nuqtalar bo'ylab yurish
//    ➡ Yo'nalish    — oldinga · orqaga · tasodifiy · tasodifiy sayr
//    🧱 To'siqni aylanib o'tish
//    ⛔ Tiqilib qolishni sezish
//    📍 Eng yaqin patrul nuqtasiga qaytish
//
//  ── ⚠ NEGA TO'G'RIGA YURISH YARAMAYDI ───────────────────────
//    \"O'yinchi tomon yur\" degan eng oddiy qoida devorga borib
//    tirilib qoladi: agent joyida depsinib turadi va o'yin
//    buzilgandek ko'rinadi.
//
//    Bu yerda ikki qatlam bor:
//      1. YO'L (route) — qayerdan borish. Patrul nuqtalari yoki
//         nishonning oxirgi joyi.
//      2. CHETLAB O'TISH (avoidance) — yo'ldagi mayda to'siqlar:
//         qutilar, boshqa agentlar. Har kadr yon tomonga suriladi.
//
//  ── ⚠ NEGA TIQILISHNI SEZISH KERAK ──────────────────────────
//    Har qanday chetlab o'tish ba'zan ojiz qoladi (burchak, tor
//    joy). Agent joyidan siljimayotganini SEZMASA, u o'sha yerda
//    mangu turib qolardi. Sezgach — boshqa yo'l tanlaydi, bo'lmasa
//    eng yaqin patrul nuqtasiga qaytadi.
// ============================================================

window.AINavigation = (() => {
  'use strict';

  const DEF = {
    patrolMode: 'loop',   // loop | reverse | random | randomWalk
    waitMin:    2,        // ⏳ nuqtada kutish (soniya)
    waitMax:    6,
    walkTime:   7,        // 🎲 tasodifiy sayrда yurish vaqti
    radius:     0.6,      // agentning kengligi
    arrive:     0.8,      // nuqtaga yetdi deb hisoblanadigan masofa
    avoidDist:  2.5,      // 🧱 to'siqni qanchadan sezadi
    stuckTime:  2,        // ⛔ necha soniya siljimasa tiqilgan
    stuckTries: 3,        // necha marta boshqa yo'l sinaladi
  };

  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

  // ============================================================
  //  🚩 PATRUL — keyingi nuqta
  // ============================================================
  /**
   * @param {object} st  patrul holati { i, dir, mode }
   * @param {number} n   nuqtalar soni
   * @returns {number}   keyingi indeks
   */
  function nextPoint(st, n, mode) {
    if (n <= 0) return 0;
    const m = mode || 'loop';
    if (m === 'random' || m === 'randomWalk') return Math.floor(Math.random() * n);
    if (m === 'reverse') {
      // ⚠ Bir nuqtali yo'lda `dir` ni aylantirsak cheksiz sakrash
      //   bo'lardi — shuning uchun n < 2 da joyida qolamiz.
      if (n < 2) return 0;
      let i = st.i + (st.dir || 1);
      if (i >= n) { i = n - 2; st.dir = -1; }
      else if (i < 0) { i = 1; st.dir = 1; }
      return i;
    }
    return (st.i + 1) % n;      // loop
  }

  /** 📍 Eng yaqin patrul nuqtasi (quvg'indan qaytishда). */
  function nearestPoint(pos, points) {
    if (!points || !points.length) return -1;
    let best = 0, bd = Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const d = (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2 + (p.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /** Kutish vaqti — min va max orasida tasodifiy. */
  function waitTime(cfg) {
    const c = Object.assign({}, DEF, cfg || {});
    const a = Math.max(0, +c.waitMin || 0);
    const b = Math.max(a, +c.waitMax || a);
    return a + Math.random() * (b - a);
  }

  // ============================================================
  //  🧱 CHETLAB O'TISH
  // ============================================================
  /**
   * Xohlangan yo'nalishni to'siqlarga qarab tuzatadi.
   *
   * ⚠ Uch nur yuboriladi: to'g'riga, chapga 35°, o'ngga 35°.
   *   To'g'ri yo'l band bo'lsa — bo'sh tomonga buriladi. Bitta nur
   *   bilan agent to'siqni ko'radi-yu, qayoqqa burilishni bilmasdi.
   *
   * @returns {THREE.Vector3} tuzatilgan yo'nalish (normallashgan)
   */
  let _ray = null;
  function avoid(self, dir, cfg) {
    const c = Object.assign({}, DEF, cfg || {});
    if (!c.avoidDist || typeof THREE.Raycaster !== 'function') return dir;
    if (!_ray) _ray = new THREE.Raycaster();

    self.getWorldPosition(_a);
    _a.y += (self.scale.y || 1) * 0.3;
    const list = (window.AIPerception ? window.AIPerception._blockers(self, null) : []);
    if (!list.length) return dir;

    const test = (ang) => {
      _b.copy(dir).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).normalize();
      _ray.set(_a, _b);
      _ray.far = c.avoidDist;
      const hit = _ray.intersectObjects(list, true);
      return hit.length ? hit[0].distance : Infinity;
    };

    const D = Math.PI / 180 * 35;
    const fwd = test(0);
    if (fwd === Infinity) return dir;          // yo'l bo'sh

    const left = test(D), right = test(-D);
    // ⚠ Ikkala yon ham band bo'lsa — kengroq burchak sinaladi.
    //   Bo'lmasa agent to'siqqa yopishib turaverardi.
    if (left === Infinity)  return dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), D).normalize();
    if (right === Infinity) return dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -D).normalize();
    const wide = (left > right) ? Math.PI / 2 : -Math.PI / 2;
    return dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), wide).normalize();
  }

  // ============================================================
  //  ⛔ TIQILIB QOLISH
  // ============================================================
  /**
   * @param {object} st  { lastPos, t, tries }
   * @returns {boolean}  tiqilib qoldimi
   */
  function stuckCheck(self, st, dt, cfg) {
    const c = Object.assign({}, DEF, cfg || {});
    self.getWorldPosition(_c);
    if (!st.lastPos) { st.lastPos = _c.clone(); st.t = 0; st.tries = 0; return false; }
    const moved = _c.distanceTo(st.lastPos);
    // ⚠ Chegara kichik (5 sm): sekin yuruvchi agent \"tiqilgan\" deb
    //   noto'g'ri belgilanmasin.
    if (moved > 0.05) { st.lastPos.copy(_c); st.t = 0; return false; }
    st.t = (st.t || 0) + dt;
    if (st.t >= (c.stuckTime || 2)) {
      st.t = 0;
      st.tries = (st.tries || 0) + 1;
      st.lastPos.copy(_c);
      return true;
    }
    return false;
  }

  // ============================================================
  //  ➡ HARAKAT
  // ============================================================
  /**
   * Agentni nishon tomon suradi (chetlab o'tish bilan).
   * @returns {{arrived:boolean, dist:number}}
   */
  function moveTo(self, dest, speed, dt, cfg) {
    const c = Object.assign({}, DEF, cfg || {});
    self.getWorldPosition(_a);
    _b.copy(dest); _b.y = _a.y;                 // ⚠ balandlik farqi harakatga ta'sir qilmasin
    const dist = _a.distanceTo(_b);
    if (dist <= (c.arrive || 0.8)) return { arrived: true, dist };

    let dir = _b.sub(_a).normalize();
    dir = avoid(self, dir, c);

    const step = Math.min(speed * dt, dist);
    self.position.x += dir.x * step;
    self.position.z += dir.z * step;

    // 🔄 Yurish tomoniga qarab buriladi
    const want = Math.atan2(-dir.x, -dir.z);
    self.rotation.y = _lerpAngle(self.rotation.y, want, Math.min(1, dt * 6));
    return { arrived: false, dist };
  }

  /** Burchaklarni eng qisqa tomondan aralashtiradi. */
  function _lerpAngle(a, b, t) {
    // ⚠ Oddiy `a + (b-a)*t` 179° dan -179° ga o'tishда agentni
    //   deyarli to'liq aylanma qildirardi.
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  return { DEF, nextPoint, nearestPoint, waitTime, avoid, stuckCheck, moveTo, _lerpAngle };
})();
