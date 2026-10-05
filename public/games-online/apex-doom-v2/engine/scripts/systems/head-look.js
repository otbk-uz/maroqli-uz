// ============================================================
//  👁 HEAD-LOOK — obyekt maqsadni (o'yinchi/mashina/obyekt) KUZATADI
//
//  Sahnadagi istalgan obyektga biriktiriladi. O'yin paytida obyekt
//  maqsadga qarab buriladi — huddi bosh burib qaragandek. Post,
//  turret, kuzatuv kamerasi, dushman, NPC boshi uchun.
//
//  SOZLAMALAR:
//    target   — kimni kuzatadi: 'player' | 'car' | 'obj:<id>'
//    mode     — 'static' (faqat gorizontal, tepa-pastga qaramaydi)
//             | 'realistic' (tepa-pastga ham qaraydi)
//    behavior — 'always' (devor orqasidan ham) — standart
//             | 'ifVisible' (faqat ko'rinsa; devor to'ssa qaramaydi)
//             | 'ifBehind' (maqsad ORQADA bo'lsagina)
//    onLost   — maqsad shartga tushmasa: 'freeze' (turaveradi)
//             | 'reset' (boshlang'ich burilishga qaytadi)
//    speed    — burilish tezligi (0.01=sekin/silliq, 1=darhol)
//    axis     — qaysi o'q "old" tomon: '+z','-z','+x','-x'
//
//  ⚠ NEGA ALOHIDA FAYL: obyektning O'Z rotatsiyasini boshqaradi.
//    Timeline animatsiyasi ham rotatsiyani boshqaradi — ular
//    urishmasligi uchun head-look `_animDriven` obyektga TEGMAYDI.
// ============================================================
(function () {
  'use strict';

  const _tmpTargetPos = new THREE.Vector3();
  const _tmpSelfPos   = new THREE.Vector3();
  const _tmpDir       = new THREE.Vector3();
  const _tmpMat       = new THREE.Matrix4();
  const _tmpQuat      = new THREE.Quaternion();
  const _tmpEuler     = new THREE.Euler();
  const _upVec        = new THREE.Vector3(0, 1, 0);
  const _behindTmp    = new THREE.Vector3();
  const _ray          = (typeof THREE.Raycaster !== 'undefined') ? new THREE.Raycaster() : null;

  const DEFAULTS = {
    enabled:  false,
    target:   'player',    // 'player' | 'car' | 'obj:<id>'
    mode:     'static',    // 'static' | 'realistic'
    behavior: 'always',    // 'always' | 'ifVisible' | 'ifBehind'
    onLost:   'freeze',    // 'freeze' | 'reset'
    speed:    0.15,        // 0.01..1
    axis:     '+z',        // obyektning qaysi tomoni "old"
  };

  function _cfg(o) {
    if (!o.userData.headLook) o.userData.headLook = Object.assign({}, DEFAULTS);
    // Eski sahnalarda yetishmagan maydonlarni to'ldiramiz
    for (const k in DEFAULTS)
      if (o.userData.headLook[k] === undefined) o.userData.headLook[k] = DEFAULTS[k];
    return o.userData.headLook;
  }

  /** Maqsad obyektni topadi (kuzatiladigan). */
  function _resolveTarget(spec) {
    if (!spec || spec === 'player') {
      if (typeof PlayerController !== 'undefined' && PlayerController && PlayerController.obj && PlayerController.obj.parent)
        return PlayerController.obj;
      if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent) return playerMesh;
      return objects.find(o => o.userData && (o.userData.isPlayerObj || o.userData.entityType === 'player'));
    }
    if (spec === 'car') {
      // Faol (minilgan) mashina — bo'lmasa istalgan mashina
      const active = objects.find(o => o.userData && o.userData._entityMode === 'vehicle' && o.userData._occupants > 0);
      if (active) return active;
      return objects.find(o => o.userData && (o.userData.entityType === 'car' || o.userData._entityMode === 'vehicle'));
    }
    if (typeof spec === 'string' && spec.indexOf('obj:') === 0) {
      const id = spec.slice(4);
      return objects.find(o => o.userData && String(o.userData.id) === String(id));
    }
    return null;
  }

  /** "Old" o'qi va uning belgisiga qarab kerakli yaw ofsetini beradi. */
  function _axisYawOffset(axis) {
    switch (axis) {
      case '-z': return Math.PI;
      case '+x': return -Math.PI / 2;
      case '-x': return  Math.PI / 2;
      default:   return 0;          // '+z'
    }
  }

  /** Maqsad obyektning ORQASIDAmi? (behavior:'ifBehind') */
  function _isBehind(self, targetPos) {
    // ⚠ three.getWorldDirection() obyektning +Z (old) o'qini qaytaradi.
    //   Buni teskariga o'girish KERAK EMAS — u to'g'ridan-to'g'ri "old".
    self.getWorldDirection(_tmpDir);       // +Z = old yo'nalishi
    self.getWorldPosition(_tmpSelfPos);
    // ⚠ Alohida vektor: `targetPos` — bu `_tmpTargetPos`ning O'ZI bo'lishi
    //   mumkin, uni ustiga yozsak buziladi.
    _behindTmp.copy(targetPos).sub(_tmpSelfPos).normalize();
    return _tmpDir.dot(_behindTmp) < 0;    // <0 → maqsad orqada
  }

  /** Maqsad ko'rinadimi? (behavior:'ifVisible') — devor tekshiruvi */
  function _isVisible(self, target, targetPos) {
    if (!_ray) return true;
    self.getWorldPosition(_tmpSelfPos);
    const dir = _tmpDir.copy(targetPos).sub(_tmpSelfPos);
    const dist = dir.length();
    if (dist < 0.001) return true;
    dir.normalize();
    _ray.set(_tmpSelfPos, dir);
    _ray.far = dist - 0.1;                  // maqsadning o'zigacha
    // O'zini va maqsadni istisno qilib, orada block obyekt bormi
    const blockers = [];
    for (const o of objects) {
      if (o === self || o === target) continue;
      const ud = o.userData;
      if (!ud) continue;
      if (ud.colliderMode === 'inline') continue;      // 👻 ko'rinishga to'sqinlik qilmaydi
      if (ud.isSpawn || ud.isPath || ud.isPathShape || ud.isInteractiveBtn ||
          ud.isGazeTrigger || ud.isTextBlock || ud.isSoundBlock || ud.isMapLoader) continue;
      if (o.visible === false) continue;
      blockers.push(o);
    }
    const hits = _ray.intersectObjects(blockers, true);
    return hits.length === 0;               // hech narsa to'smasa — ko'rinadi
  }

  /** Bitta obyektni yangilaydi. */
  function _updateOne(self, delta) {
    const c = self.userData.headLook;
    if (!c || !c.enabled) return;
    if (self.userData._animDriven) return;  // 🎬 animatsiya boshqarayapti — tegmaymiz

    const target = _resolveTarget(c.target);
    // Boshlang'ich rotatsiyani birinchi kadrda eslab qolamiz (reset uchun)
    if (self.userData._hlInitRot === undefined) {
      self.userData._hlInitRot = { x: self.rotation.x, y: self.rotation.y, z: self.rotation.z };
    }

    let active = !!target;
    if (active && c.behavior === 'ifBehind') {
      target.getWorldPosition(_tmpTargetPos);
      active = _isBehind(self, _tmpTargetPos);
    }
    if (active && c.behavior === 'ifVisible') {
      target.getWorldPosition(_tmpTargetPos);
      active = _isVisible(self, target, _tmpTargetPos);
    }

    if (!active) {
      if (c.onLost === 'reset') _applyRot(self, self.userData._hlInitRot, c.speed);
      return;                               // 'freeze' — turaveradi
    }

    // ── Maqsadga qarab burilish ──
    target.getWorldPosition(_tmpTargetPos);
    self.getWorldPosition(_tmpSelfPos);
    _tmpDir.copy(_tmpTargetPos).sub(_tmpSelfPos);
    if (_tmpDir.lengthSq() < 1e-6) return;

    // ⚠ To'g'ridan-to'g'ri yaw/pitch hisoblaymiz — `Matrix4.lookAt`
    //   konvensiyasi (kamera −Z ga qaraydi, mesh +Z old) chalkash va
    //   turli three versiyalarida farq qiladi. Yaw/pitch ishonchli.
    //
    //   Obyektning "old" o'qi `axis` bilan belgilanadi. Standart '+z'
    //   uchun old = +Z. Yaw = atan2(dx, dz) shu holatga to'g'ri keladi.
    const dx = _tmpDir.x, dy = _tmpDir.y, dz = _tmpDir.z;
    const horiz = Math.sqrt(dx * dx + dz * dz);

    // ⚠ VERTOLYOT MUAMMOSI: maqsad obyekt deyarli ustida/tagida bo'lsa
    //   (horiz ≈ 0), gorizontal yo'nalish aniqlanmaydi — eng kichik
    //   qimirlash ham yaw'ni butun aylana bo'ylab sakratadi va obyekt
    //   "vertolyot" kabi aylanaveradi. Bunday holda yaw'ni O'ZGARTIRMAY
    //   qoldiramiz (oxirgi burilishda turadi), faqat pitch ishlaydi.
    const HORIZ_MIN = 0.35;                   // ~35 sm dan yaqin = "ustida"
    let yaw;
    if (horiz < HORIZ_MIN) {
      // Gorizontal yo'nalish ishonchsiz — joriy yaw'ni saqlaymiz
      _tmpEuler.setFromQuaternion(self.quaternion, 'YXZ');
      yaw = _tmpEuler.y;
    } else {
      yaw = Math.atan2(dx, dz) + _axisYawOffset(c.axis);
    }

    let pitch = 0;
    if (c.mode === 'realistic') {
      // ⚠ Pitch ni ham cheklaymiz — maqsad tik ustida bo'lsa 90° ga
      //   sakramasin (bo'yin sinmaydi). ±75° chegara tabiiy ko'rinadi.
      pitch = -Math.atan2(dy, Math.max(horiz, 0.001));
      const MAX_PITCH = 1.31;                 // ~75°
      pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
    }

    // Maqsad rotatsiya (local, ota-ona bo'lsa ham yaw dunyoviy taxminan
    // to'g'ri — post/turret odatda ildizda turadi).
    const init = self.userData._hlInitRot;
    _tmpEuler.set(
      c.mode === 'realistic' ? pitch : init.x,   // static → boshlang'ich x
      yaw,
      init.z,                                     // roll o'zgarmaydi
      'YXZ'
    );
    _tmpQuat.setFromEuler(_tmpEuler);

    // Silliq yoki darhol
    const t = Math.min(1, Math.max(0.01, c.speed));
    self.quaternion.slerp(_tmpQuat, t);
    return;
  }
  const _pq = new THREE.Quaternion();
  function _tmpEuler2Q(obj) {
    obj.getWorldQuaternion(_pq);
    return _pq.clone();
  }

  /** Reset: boshlang'ich burilishga silliq qaytish. */
  function _applyRot(self, rot, speed) {
    if (!rot) return;
    _tmpEuler.set(rot.x, rot.y, rot.z, 'YXZ');
    const targetQ = new THREE.Quaternion().setFromEuler(_tmpEuler);
    const t = Math.min(1, Math.max(0.01, speed));
    self.quaternion.slerp(targetQ, t);
  }

  const HeadLookSystem = {
    update(delta) {
      if (typeof isPlaying === 'undefined' || !isPlaying) return;
      if (typeof objects === 'undefined' || !objects) return;
      for (let i = 0; i < objects.length; i++) {
        const o = objects[i];
        if (o.userData && o.userData.headLook && o.userData.headLook.enabled) {
          try { _updateOne(o, delta); } catch (e) {}
        }
      }
    },
    // Play to'xtaganda: boshlang'ich rotatsiyani tiklaymiz va eslab qolgan
    // holatni tozalaymiz (keyingi o'yin toza boshlansin).
    reset() {
      if (typeof objects === 'undefined') return;
      for (const o of objects) {
        if (o.userData && o.userData._hlInitRot) {
          o.rotation.set(o.userData._hlInitRot.x, o.userData._hlInitRot.y, o.userData._hlInitRot.z);
          delete o.userData._hlInitRot;
        }
      }
    },
    cfg: _cfg,
    DEFAULTS,
  };
  window.HeadLookSystem = HeadLookSystem;

  // ── Inspektor sozlagichlari ─────────────────────────────────
  window._hlToggle = function () {
    if (!selectedObj) return;
    const c = _cfg(selectedObj);
    c.enabled = !c.enabled;
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._hlSet = function (key, val) {
    if (!selectedObj) return;
    const c = _cfg(selectedObj);
    c[key] = val;
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._hlSetNum = function (key, val) {
    if (!selectedObj) return;
    _cfg(selectedObj)[key] = parseFloat(val) || 0;
  };
})();
