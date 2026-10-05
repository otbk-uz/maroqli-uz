// ============================================================
//  ⚡ OPTIMIZATSIYA  v1.0  (build 58.52)
// ------------------------------------------------------------
//  O'yin tez ishlashi uchun uch qatlam:
//
//    👁 Ko'rinmasni chizmaslik   — kamera orqasidagi obyekt
//    📉 Uzoqdagini pastroq sifatda — soya va material soddalashadi
//    🚫 Juda uzoqni umuman yo'q   — chizishdan chiqariladi
//
//  ── ⚠ NEGA `frustumCulled` YETARLI EMAS ─────────────────────
//    Uch.js ning o'z qirqishi (`frustumCulled`) faqat kameraning
//    KO'RISH PIRAMIDASIDAN tashqarini tashlaydi. U:
//      • devor orqasidagi obyektni ko'radi (occlusion yo'q),
//      • uzoqdagi obyektni HAM TO'LIQ sifatda chizadi,
//      • soyani hisoblashda davom etadi.
//    Ya'ni 500 metrdagi bir dona qutining soyasi ham har kadr
//    hisoblanardi.
//
//  ── ⚠ NEGA HAR KADR EMAS ────────────────────────────────────
//    Har obyekt uchun masofa hisoblash ham qimmat: 2000 obyektli
//    sahnada har kadr 2000 ta ildiz olish FPS ni tushiradi. Shuning
//    uchun tekshiruv NAVBAT bilan yuradi — har kadr obyektlarning
//    bir qismi ko'riladi, hammasi bir necha kadrda aylanib chiqadi.
//
//  ── ⚠ NIMAGA TEGILMAYDI ─────────────────────────────────────
//    O'yinchi, kamera, yorug'lik, zamin, hitbox, yo'l va
//    `__noSave` yordamchilari — hech qachon o'chirilmaydi. Zamin
//    yo'qolsa o'yinchi qulab tushardi, hitbox o'chsa tuzoq ishlamay
//    qolardi.
// ============================================================

window.OptimizeSystem = (() => {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _objs = () => (typeof objects !== 'undefined' ? objects : []);
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);

  const DEF = {
    enabled:   true,
    cull:      true,    // 👁 ko'rish maydonidan tashqarini o'chirish
    lodDist:   60,      // 📉 shundan uzoqda sifat pasayadi (m)
    hideDist:  180,     // 🚫 shundan uzoqda umuman chizilmaydi (m)
    perFrame:  120,     // ⚙️ bir kadrda nechta obyekt ko'riladi
    shadowDist: 40,     // 🌑 shundan uzoqda soya o'chadi
  };
  const cfg = Object.assign({}, DEF);

  let _i = 0;                     // navbat ko'rsatkichi
  const _stat = { hidden: 0, lod: 0, total: 0 };

  const _v = new THREE.Vector3();
  const _cv = new THREE.Vector3();
  const _frustum = new THREE.Frustum();
  const _mat = new THREE.Matrix4();

  /** Bu obyektga tegish MUMKINMI? */
  function _skip(o) {
    const u = o && o.userData;
    if (!u) return true;
    // ⚠ Ro'yxat ATAYLAB uzun: bittasini unutsak o'yin buziladi.
    return !!(u.isPlayerObj || u.isCamera || u.isHitbox || u.isPath || u.isPathShape ||
              u.isStatic || u.isGround || u.__noSave || u.isMapLoader ||
              u.isStartBlock || u.isFinishBlock || u.noOptimize);
  }

  /**
   * Obyektni asl holatiga qaytaradi.
   * ⚠ Asl `visible` va `castShadow` BIR MARTA eslab qolinadi. Har
   *   chaqiruvda yozsak, ikkinchi marta \"asl\" deb biz o'chirgan
   *   qiymatni saqlab qo'yardik va obyekt mangu ko'rinmas bo'lardi.
   */
  function _remember(o) {
    const u = o.userData;
    if (u._optVis === undefined) u._optVis = o.visible;
    if (u._optShadow === undefined) u._optShadow = !!o.castShadow;
  }
  function _restore(o) {
    const u = o.userData;
    if (u._optVis !== undefined) { o.visible = u._optVis; delete u._optVis; }
    if (u._optShadow !== undefined) { o.castShadow = u._optShadow; delete u._optShadow; }
  }

  /** Hammasini asl holiga qaytaradi (o'chirilganda, ⏹ Stop da). */
  function restoreAll() {
    for (const o of _objs()) if (o && o.userData) _restore(o);
    _stat.hidden = _stat.lod = 0;
  }

  function update(delta) {
    const list = _objs();
    _stat.total = list.length;
    if (!cfg.enabled || !_playing() || typeof camera === 'undefined' || !camera) return;
    if (!list.length) return;

    camera.getWorldPosition(_cv);
    if (cfg.cull) {
      camera.updateMatrixWorld();
      _mat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      _frustum.setFromProjectionMatrix(_mat);
    }

    const hide2 = cfg.hideDist * cfg.hideDist;
    const lod2  = cfg.lodDist  * cfg.lodDist;
    const sh2   = cfg.shadowDist * cfg.shadowDist;

    // ⚠ NAVBAT bilan: hammasini har kadr tekshirish qimmat.
    const n = Math.min(cfg.perFrame, list.length);
    for (let k = 0; k < n; k++) {
      _i = (_i + 1) % list.length;
      const o = list[_i];
      if (!o || _skip(o)) continue;
      _remember(o);
      const u = o.userData;

      o.getWorldPosition(_v);
      const d2 = _v.distanceToSquared(_cv);

      // 🚫 Juda uzoq — umuman chizilmaydi
      if (d2 > hide2) {
        if (o.visible) _stat.hidden++;
        o.visible = false;
        continue;
      }

      // 👁 Ko'rish maydonidan tashqarida
      //  ⚠ Faqat `visible` o'zgaradi — obyekt sahnadan OLINMAYDI.
      //    Olib tashlasak fizika, timeline va skriptlar uni yo'qotardi.
      if (cfg.cull && !_inView(o)) {
        if (o.visible) _stat.hidden++;
        o.visible = false;
        continue;
      }

      if (!o.visible) o.visible = u._optVis !== undefined ? u._optVis : true;

      // 📉 Uzoqda — sifat pasayadi
      const far = d2 > lod2;
      if (far !== !!u._optLod) {
        u._optLod = far;
        if (far) _stat.lod++;
        _setLod(o, far);
      }
      // 🌑 Soya — uzoqda kerak emas
      const wantShadow = (u._optShadow !== false) && d2 <= sh2;
      if (o.castShadow !== wantShadow) o.castShadow = wantShadow;
    }
  }

  /** Obyekt kameraning ko'rish maydonidamikan? */
  function _inView(o) {
    // ⚠ Chegara sferasi kerak: `Frustum.intersectsObject` uni o'zi
    //   hisoblaydi, lekin geometriyasiz obyektда (papka, guruh)
    //   yiqiladi — shuning uchun tekshiramiz.
    if (o.isMesh && o.geometry) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      return _frustum.intersectsObject(o);
    }
    return true;      // guruh/papka — tegmaymiz
  }

  /**
   * 📉 Past sifat: material soddalashadi.
   * ⚠ Geometriya ALMASHTIRILMAYDI — buning uchun har obyektga
   *   soddalashtirilgan nusxa kerak bo'lardi (xotira va yuklash
   *   vaqti). Materialni soddalashtirish esa bepul va sezilarli:
   *   uzoqdagi qutida PBR hisobi ham, soya ham keraksiz.
   */
  function _setLod(o, far) {
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats) {
      if (!m) continue;
      if (far) {
        if (m.userData.__lodFlat === undefined) {
          m.userData.__lodFlat = { flatShading: !!m.flatShading, ao: !!m.aoMap };
        }
        m.flatShading = true;
      } else if (m.userData.__lodFlat) {
        m.flatShading = m.userData.__lodFlat.flatShading;
        delete m.userData.__lodFlat;
      }
      m.needsUpdate = true;
    }
  }

  // ⏹ Stop — hammasi qaytadi
  let _was = false;
  function tick(delta) {
    const p = _playing();
    if (p !== _was) { _was = p; if (!p) restoreAll(); }
    update(delta);
  }

  function set(k, v) {
    if (!(k in DEF)) return false;
    cfg[k] = (k === 'enabled' || k === 'cull') ? !!v : Math.max(0, parseFloat(v) || 0);
    if (!cfg.enabled) restoreAll();
    return true;
  }

  const stats = () => Object.assign({}, _stat, { cfg: Object.assign({}, cfg) });

  function serialize() { const o = {}; for (const k in DEF) o[k] = cfg[k]; return { cfg: o }; }
  function restore(d) { if (d && d.cfg) for (const k in DEF) if (d.cfg[k] !== undefined) cfg[k] = d.cfg[k]; }

  return { DEF, cfg, set, update: tick, restoreAll, stats, serialize, restore, _skip, _setLod };
})();
