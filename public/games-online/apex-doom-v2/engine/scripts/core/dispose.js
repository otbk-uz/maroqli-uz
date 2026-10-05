// ============================================================
//  APEX3D — disposeMany / disposeDeep + escapeHtml
//  ⚠ Bu fayl BOSHQA skriptlardan OLDIN ulanadi (index.html).
// ============================================================
//
//  NEGA BU SHUNCHALIK EHTIYOTKOR:
//    `obj.clone()` (nusxalash, Ctrl+D) Three.js da geometriya va
//    materialni YANGIDAN YARATMAYDI — havolani ULASHADI. Ya'ni
//    nusxalangan ikki kub bitta `MeshStandardMaterial` ni baham
//    ko'radi. Agar biri o'chirilib, materiali `dispose()` qilinsa,
//    IKKINCHISI ham buziladi (GPU dagi shader/tekstura yo'qoladi).
//
//    Shuning uchun bu yerda "ko'r-ko'rona dispose" YO'Q. Avval
//    sahnada QOLGAN obyektlar qaysi resurslardan foydalanayotgani
//    yig'iladi, keyin FAQAT hech kim ishlatmayotgani bo'shatiladi.
// ============================================================

// Three.js r128 materiallaridagi barcha tekstura slotlari
const _APEX_TEX_SLOTS = [
  'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap',
  'aoMap', 'alphaMap', 'bumpMap', 'lightMap', 'envMap',
  'displacementMap', 'specularMap', 'gradientMap', 'matcap',
  'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
  'transmissionMap', 'thicknessMap', 'sheenColorMap', 'sheenRoughnessMap',
  'iridescenceMap', 'iridescenceThicknessMap', 'specularIntensityMap',
  'specularColorMap',
];

function _apexMats(n) {
  return Array.isArray(n.material) ? n.material : (n.material ? [n.material] : []);
}

/**
 * Sahnada HOZIR ishlatilayotgan geometriya/material/teksturalarni yig'adi.
 * @param {THREE.Object3D} root — odatda `scene`
 */
function _apexCollectInUse(root) {
  const geos = new Set(), mats = new Set(), texs = new Set();
  if (!root || typeof root.traverse !== 'function') return { geos, mats, texs };
  root.traverse(n => {
    if (n.geometry) geos.add(n.geometry);
    for (const m of _apexMats(n)) {
      if (!m) continue;
      mats.add(m);
      for (const k of _APEX_TEX_SLOTS) if (m[k]) texs.add(m[k]);
    }
  });
  return { geos, mats, texs };
}

/**
 * Bir nechta obyektni XAVFSIZ bo'shatadi.
 *
 * ⚠ TARTIB MUHIM: obyektlar sahnadan ALLAQACHON olib tashlangan
 *   bo'lishi kerak. Funksiya "kim qoldi" ni sahnadan o'qiydi —
 *   o'chirilayotgan obyekt hali sahnada tursa, u o'z resursini
 *   "ishlatilyapti" deb sanab, hech narsa bo'shatilmaydi.
 *
 *   To'g'ri:  roots.forEach(o => scene.remove(o));  disposeMany(roots);
 *   Noto'g'ri: roots.forEach(o => { scene.remove(o); disposeMany([o]); })
 *              ← ishlaydi, lekin sahnani har safar aylanadi (sekin)
 *
 * @param {THREE.Object3D[]} roots
 * @returns {{geometries:number, materials:number, textures:number, renderTargets:number, kept:number}}
 */
window.disposeMany = function disposeMany(roots) {
  const stat = { geometries: 0, materials: 0, textures: 0, renderTargets: 0, kept: 0 };
  if (!Array.isArray(roots) || !roots.length) return stat;
  if (typeof scene === 'undefined' || !scene) return stat;

  // 1) Sahnada qolganlar nimadan foydalanyapti?
  const inUse = _apexCollectInUse(scene);

  // 2) Nomzodlarni yig'amiz (bir resurs bir necha meshda bo'lishi mumkin)
  const geos = new Set(), mats = new Set();
  for (const r of roots) {
    if (!r || typeof r.traverse !== 'function') continue;
    r.traverse(n => {
      if (n.geometry) geos.add(n.geometry);
      for (const m of _apexMats(n)) if (m) mats.add(m);
    });
  }

  // 3) Faqat hech kim ishlatmayotganini bo'shatamiz
  //    ⚠ Render target'lar ALOHIDA: ular `userData._feedRT` da turadi
  //      (PC block kamera feed'i), sahna grafida emas. Ularni hech kim
  //      ulashmaydi — obyekt bilan birga ketadi.
  for (const r of roots) {
    if (!r || typeof r.traverse !== 'function') continue;
    r.traverse(n => {
      const rt = n.userData && n.userData._feedRT;
      if (rt && typeof rt.dispose === 'function') {
        try { rt.dispose(); stat.renderTargets++; } catch (e) {}
        n.userData._feedRT = null;
        n.userData._feedCam = null;
      }
    });
  }

  for (const g of geos) {
    if (inUse.geos.has(g)) { stat.kept++; continue; }
    try { g.dispose(); stat.geometries++; } catch (e) {}
  }

  const texCands = new Set();
  for (const m of mats) {
    if (inUse.mats.has(m)) { stat.kept++; continue; }
    for (const k of _APEX_TEX_SLOTS) if (m[k]) texCands.add(m[k]);
    try { m.dispose(); stat.materials++; } catch (e) {}
  }

  // Tekstura alohida: u BOSHQA (qolgan) material tomonidan ham
  // ishlatilayotgan bo'lishi mumkin — masalan bitta rasm ikki materialda.
  for (const t of texCands) {
    if (inUse.texs.has(t)) { stat.kept++; continue; }
    if (t && typeof t.dispose === 'function') {
      try { t.dispose(); stat.textures++; } catch (e) {}
    }
  }

  return stat;
};

/** Bitta obyekt uchun qulaylik o'ram. */
window.disposeDeep = function disposeDeep(root) {
  return window.disposeMany([root]);
};

/**
 * HTML matn ichiga xavfsiz qo'yish uchun escape.
 * Obyekt nomlari `innerHTML` ga to'g'ridan-to'g'ri tushardi; nomda `<`
 * bo'lsa panel buzilardi. Nomlar import qilingan GLB'dan ham keladi.
 */
window.escapeHtml = function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')   // & birinchi bo'lishi SHART
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
