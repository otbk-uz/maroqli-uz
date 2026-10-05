// ============================================================
//  👁 AI IDROK (Perception)  v1.0  (build 58.40)
// ------------------------------------------------------------
//  Agent nishonni QANDAY ko'rishini hal qiladi:
//
//    📏 Masofa      — nechchi metrgacha ko'radi
//    🔦 Ko'rish burchagi (FOV) — oldida qancha keng ko'radi
//    🧱 To'siq       — devor ko'rishni to'sadimi (raycast)
//    ⏱ Sezish vaqti  — necha soniya ko'rgach \"payqadi\" deyiladi
//    🧠 Xotira       — nishon yo'qolgach necha soniya eslab qoladi
//
//  ── ⚠ NEGA SHUNCHAKI MASOFA EMAS ────────────────────────────
//    \"Masofa < 30 bo'lsa ko'rdi\" degan qoida yaramaydi: dushman
//    devor orqasidan, orqa tomondan, hatto qorong'ida ham hamma
//    narsani bilardi. O'yinchi yashira olmasa, yashirinishning
//    ma'nosi qolmaydi.
//
//  ── ⚠ NEGA \"SEZISH VAQTI\" KERAK ─────────────────────────────
//    Bir kadr ko'rinib qolgan o'yinchi darhol quvg'inga sabab
//    bo'lsa, dushman \"telepat\" bo'lib tuyuladi. Sezish vaqti —
//    ko'z bilan tanib olish uchun ketadigan fursat.
//
//  ── ⚠ NEGA XOTIRA ───────────────────────────────────────────
//    Ko'rinish uzilishi bilan unutsa, o'yinchi ustunning orqasiga
//    o'tib qo'yishi kifoya bo'lardi. Xotira tufayli dushman
//    oxirgi ko'rilgan joyga boradi va qidiradi.
// ============================================================

window.AIPerception = (() => {
  'use strict';

  const DEF = {
    seeDist:    30,     // 📏 metr
    fov:        100,    // 🔦 gradus (to'liq burchak)
    useRay:     true,   // 🧱 to'siq to'sadimi
    seeTime:    0.5,    // ⏱ soniya
    memoryTime: 5,      // 🧠 soniya
    hearDist:   0,      // 👂 shovqinni eshitish (0 = o'chiq)
  };

  const _v1 = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  let _ray = null;

  /** Sahnadagi to'siq bo'la oladigan obyektlar. */
  function _blockers(self, target) {
    const out = [];
    const list = (typeof objects !== 'undefined') ? objects : [];
    for (const o of list) {
      if (!o || o === self || o === target) continue;
      const ud = o.userData || {};
      // ⚠ Ko'rinmas, `inline` va yordamchi obyektlar TO'SMAYDI —
      //   aks holda dushman o'z hitboxi yoki tugmasi ortida
      //   \"ko'r\" bo'lib qolardi.
      if (o.visible === false) continue;
      if (ud.colliderMode === 'inline') continue;
      if (ud.isHitbox || ud.isCamera || ud.isPath || ud.isPlayerObj) continue;
      if (ud.isAIAgent) continue;                 // boshqa agentlar to'smaydi
      out.push(o);
    }
    return out;
  }

  /**
   * Nishon SHU ONDA ko'rinyaptimi?
   * @returns {{visible:boolean, dist:number, reason:string}}
   */
  function look(self, target, cfg) {
    const c = Object.assign({}, DEF, cfg || {});
    if (!self || !target) return { visible: false, dist: Infinity, reason: 'nishon yo\'q' };

    self.getWorldPosition(_v1);
    target.getWorldPosition(_v2);
    // ⚠ Ko'z balandligi: oyoq ostidan emas, boshdan qaraydi.
    _v1.y += (self.scale.y || 1) * 0.4;
    _v2.y += (target.scale.y || 1) * 0.3;

    const dist = _v1.distanceTo(_v2);
    if (dist > c.seeDist) return { visible: false, dist, reason: 'uzoq' };

    // 🔦 Ko'rish burchagi
    if (c.fov < 360) {
      _fwd.set(0, 0, -1).applyQuaternion(self.getWorldQuaternion(new THREE.Quaternion()));
      _fwd.y = 0; _fwd.normalize();
      const dir = _v2.clone().sub(_v1); dir.y = 0; dir.normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, _fwd.dot(dir)))) * 180 / Math.PI;
      if (ang > c.fov / 2) return { visible: false, dist, reason: 'burchakdan tashqarida' };
    }

    // 🧱 To'siq
    if (c.useRay && typeof THREE.Raycaster === 'function') {
      if (!_ray) _ray = new THREE.Raycaster();
      const dir = _v2.clone().sub(_v1).normalize();
      _ray.set(_v1, dir);
      _ray.far = dist - 0.1;
      const hits = _ray.intersectObjects(_blockers(self, target), true);
      if (hits.length) return { visible: false, dist, reason: 'to\'siq: ' + (hits[0].object.userData?.name || '?') };
    }

    return { visible: true, dist, reason: 'ko\'rinyapti' };
  }

  /**
   * Har kadr chaqiriladi: ko'rish + sezish vaqti + xotira.
   *
   * `mem` — agentning xotira obyekti (o'zi o'zgartiriladi):
   *   { seeing, seeT, known, lastPos, lastDir, memT }
   */
  function update(self, target, cfg, mem, dt) {
    const c = Object.assign({}, DEF, cfg || {});
    const r = look(self, target, c);
    mem.dist = r.dist;
    mem.reason = r.reason;

    if (r.visible) {
      // ⏱ Sezish vaqti — darhol emas, asta tanib oladi
      mem.seeT = (mem.seeT || 0) + dt;
      if (mem.seeT >= c.seeTime) {
        if (!mem.known) mem.justFound = true;
        mem.known = true;
        mem.memT  = c.memoryTime;
        if (!mem.lastPos) mem.lastPos = new THREE.Vector3();
        target.getWorldPosition(mem.lastPos);
      }
    } else {
      // ⚠ Sezish hisoblagichi ASTA tushadi: o'yinchi ustun orqasidan
      //   \"lip-lip\" o'tib turса ham to'planган diqqat yo'qolmasin.
      mem.seeT = Math.max(0, (mem.seeT || 0) - dt * 0.5);
      if (mem.known) {
        mem.memT = (mem.memT || 0) - dt;
        if (mem.memT <= 0) { mem.known = false; mem.justLost = true; }
      }
    }
    mem.visible = r.visible;
    return mem;
  }

  function newMemory() {
    return { visible: false, known: false, seeT: 0, memT: 0,
             lastPos: null, dist: Infinity, reason: '', justFound: false, justLost: false };
  }

  return { DEF, look, update, newMemory, _blockers };
})();
