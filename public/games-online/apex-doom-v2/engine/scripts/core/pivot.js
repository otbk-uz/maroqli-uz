// ============================================================
//  ◈ PIVOT — obyekt markazini o'zgartirish  (build 58.37)
// ------------------------------------------------------------
//  Pivot — obyektning aylanish va ko'chirish markazi. Eshik chap
//  qanotidan ochilishi uchun uning pivoti chap tomonda bo'lishi
//  kerak.
//
//  Ishlash printsipi: geometriya `-p` ga suriladi, `position` esa
//  `+p` ga qaytariladi. Natijada obyekt EKRANDA joyida qoladi,
//  lekin uning nol nuqtasi ko'chadi.
//
//  ── ⚠ NIMA BUZILGAN EDI: "faqat vizual o'zgaryapti" ──────────
//    Uch narsa unutilgan edi:
//
//    1. 💾 SAQLANMASDI. Pivot `pivotMap` degan `Map` da turardi va
//       geometriya nusxasi runtime da o'zgartirilardi. Sahna
//       saqlanganda geometriya TURI va o'lchamlari yoziladi
//       (`BoxGeometry(1,1,1)`), surilgani emas — ya'ni yuklashda
//       geometriya markazga qaytardi, `position` esa surilgan
//       holida qolardi. Obyekt joyidan sakrab ketardi.
//
//    2. 🧱 TO'QNASHUV KO'CHMASDI. `player.js` obyekt markazini doim
//       `position` deb bilardi. Pivotdan keyin markaz
//       `position - p` da bo'ladi — o'yinchi bo'sh joyda to'xtab,
//       ko'rinib turgan devordan o'tib ketardi.
//
//    3. ⚖️ FIZIKA TANASI eski shaklda qolardi.
//
//  ── ⚠ NEGA `userData.pivot` ─────────────────────────────────
//    `Map` sahna bilan saqlanmaydi va obyekt nusxalanganda ham
//    ko'chmaydi. `userData` esa `_` siz maydon sifatida faylga
//    tushadi, nusxada ham qoladi, prefabda ham.
// ============================================================

window.PivotSystem = (() => {
  'use strict';

  const _objs = () => (typeof objects !== 'undefined' ? objects : []);
  const V = (o) => new THREE.Vector3((o && o.x) || 0, (o && o.y) || 0, (o && o.z) || 0);

  /** Obyektning amaldagi pivoti. */
  function pivotOf(o) {
    return V(o && o.userData && o.userData.pivot);
  }

  /**
   * Markazni `-p` ga suradi.
   *
   *  🧱 MESH  — geometriyaning o'zi suriladi.
   *  📁 PAPKA / 📦 MODEL — bevosita BOLALARNING joyi suriladi.
   *
   * ⚠ NEGA IKKI XIL YO'L: papkada geometriya yo'q, bolalarining
   *   geometriyasini surish esa NOTO'G'RI — har bolaning o'z
   *   burilishi va o'lchovi bor, ya'ni `-p` har birida BOSHQA
   *   tomonga ketardi va papka ichi tarqab ketardi.
   *
   *   Bolaning JOYINI surish esa aynan papkaning nol nuqtasini
   *   ko'chiradi — hech nima buzilmaydi.
   *
   * ⚠ Ilgari papka pivoti UMUMAN ishlamasdi: eski kod faqat
   *   `selectedObj.geometry` ni tekshirardi, papkada esa u yo'q.
   *   Ctrl+F bilan yasalgan papkaning markazi 0,0,0 da qotib
   *   qolardi va uni o'zgartirib bo'lmasdi.
   */
  function _translateGeom(o, p) {
    if (!p.lengthSq()) return false;

    // 📁 Papka yoki 📦 model — bolalarning joyi
    if (!o.isMesh) {
      const kids = o.children ? o.children.slice() : [];
      if (!kids.length) return false;
      for (const ch of kids) {
        // ⚠ Yordamchi bolalar (chiroq, marker) ham suriladi — ular
        //   ham papkaning ichida va u bilan birga ko'chishi kerak.
        ch.position.sub(p);
      }
      o.updateMatrixWorld(true);
      return true;
    }

    // 🧱 Oddiy mesh — geometriya
    // ⚠ Geometriya BOSHQA obyektlar bilan bo'lishilgan bo'lishi
    //   mumkin (nusxalar bir xil `BoxGeometry` ga ishora qiladi).
    //   Nusxa olmasak, bittasining pivotini o'zgartirish
    //   hammasini surib yuborardi.
    if (!o.geometry) return false;
    o.geometry = o.geometry.clone();
    o.geometry.translate(-p.x, -p.y, -p.z);
    o.geometry.computeBoundingBox();
    o.geometry.computeBoundingSphere();
    return true;
  }

  /**
   * To'qnashuv qutisini ko'rinishga moslaydi.
   *
   * `colliderOffset` — LOKAL siljish. `player.js` uni burilish va
   * o'lchov bilan hisoblab, quti markazini surib qo'yadi.
   */
  function _syncCollider(o) {
    const p = pivotOf(o);
    const ud = o.userData;
    if (p.lengthSq()) ud.colliderOffset = { x: -p.x, y: -p.y, z: -p.z };
    else delete ud.colliderOffset;

    // 📐 O'lcham geometriyaning HAQIQIY chegarasidan
    try {
      const g = o.geometry;
      if (g) {
        if (!g.boundingBox) g.computeBoundingBox();
        const bb = g.boundingBox;
        if (bb) ud.colliderSize = {
          x: Math.max(1e-3, bb.max.x - bb.min.x),
          y: Math.max(1e-3, bb.max.y - bb.min.y),
          z: Math.max(1e-3, bb.max.z - bb.min.z),
        };
      }
    } catch (e) {}
  }

  /** ⚖️ Fizika tanasini yangi shaklda qayta quradi. */
  function _rebuildPhysics(o) {
    try {
      if (typeof physBodies === 'undefined') return;
      const b = physBodies.find(x => x.mesh === o);
      if (!b) return;
      const opts = { mass: b.mass, restitution: b.restitution, friction: b.friction,
                     isStatic: b.isStatic, radius: b.radius, shape: b.shape };
      if (typeof removeRapierBody === 'function') removeRapierBody(o);
      if (typeof addPhysicsBody === 'function') addPhysicsBody(o, opts);
    } catch (e) {}
  }

  /**
   * ◈ Pivotni qo'llaydi.
   * @param {THREE.Object3D} o
   * @param {number} x @param {number} y @param {number} z  yangi pivot
   */
  function apply(o, x, y, z) {
    if (!o) return false;
    const want = new THREE.Vector3(+x || 0, +y || 0, +z || 0);
    const cur  = pivotOf(o);
    const d    = want.clone().sub(cur);          // faqat FARQINI suramiz
    if (!d.lengthSq()) return false;

    // ⚠ Faqat farq: ikki marta "chap" bossangiz obyekt ikki barobar
    //   surilib ketmasin.
    _translateGeom(o, d);
    // Ko'rinish joyida qolsin — siljish burilish/o'lchov bilan
    o.position.add(d.clone().multiply(o.scale).applyQuaternion(o.quaternion));

    o.userData.pivot = { x: want.x, y: want.y, z: want.z };
    o.userData._pivotDone = { x: want.x, y: want.y, z: want.z };
    _syncCollider(o);
    _rebuildPhysics(o);
    if (typeof outlineMesh !== 'undefined' && outlineMesh &&
        typeof selectedObj !== 'undefined' && selectedObj === o) {
      outlineMesh.position.copy(o.position);
    }
    return true;
  }

  /**
   * Sahna yuklangandan keyin geometriyani qayta suradi.
   *
   * ⚠ `position` FAYLDA allaqachon surilgan holda saqlangan, ya'ni
   *   uni QAYTA surmaymiz — faqat geometriyani. Aks holda obyekt
   *   har yuklashda pivot qadamicha uchib ketardi.
   *
   * ⚠ 📁 PAPKA BU YERGA KIRMAYDI. Sabab — nima saqlanishida:
   *
   *     🧱 Mesh   → geometriya saqlanmaydi, `PRIMITIVES[i].geo()`
   *                 bilan TOZA yasaladi → siljish qayta kerak.
   *     📁 Papka  → siljish BOLALARNING joyiga singib ketgan, ular
   *                 esa `objects[]` da o'z pozitsiyasi bilan
   *                 saqlanadi → siljish ALLAQACHON faylda.
   *
   *   Farq sezilmagani uchun papka ichidagi hamma narsa HAR
   *   YUKLASHDA pivot qadamicha siljib borardi: bir marta saqlab
   *   ochsangiz 1 metr, ikki marta — 2 metr.
   *
   * ⚠ 📦 GLB MODEL (`!isMesh`, lekin papka emas) BU YERGA KIRADI:
   *   uning bolasi fayldan emas, GLB baytlaridan QAYTA o'qiladi va
   *   nol nuqtada paydo bo'ladi — ya'ni siljish qayta kerak.
   */
  function syncAll() {
    let n = 0;
    for (const o of _objs()) {
      const ud = o && o.userData;
      if (!ud || !ud.pivot) continue;
      // 📁 Papka — siljish bolalar pozitsiyasida allaqachon bor
      if (typeof SceneTypes !== 'undefined' && SceneTypes.isFolder && SceneTypes.isFolder(ud)) continue;
      const p = V(ud.pivot);
      const done = V(ud._pivotDone);
      if (p.distanceToSquared(done) < 1e-12) continue;
      // Yuklashda `_pivotDone` yo'q — geometriya markazda
      _translateGeom(o, p.clone().sub(done));
      ud._pivotDone = { x: p.x, y: p.y, z: p.z };
      _syncCollider(o);
      n++;
    }
    return n;
  }

  let _t = 0;
  function update(delta) {
    _t += (delta || 0.016);
    if (_t < 0.5) return;
    _t = 0;
    syncAll();
  }

  return { pivotOf, apply, syncAll, update, _translateGeom, _syncCollider };
})();

// ============================================================
//  🎛 Panel
// ============================================================
window.showPivotPanel = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  const old = document.getElementById('pivot-panel');
  if (old) { old.remove(); return; }

  const o = selectedObj;
  const pm = PivotSystem.pivotOf(o);
  const row = (ax, val) => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:30px">${ax.toUpperCase()}</span>
      <input type="number" id="pv${ax}" value="${val.toFixed(3)}" step="0.1" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:2px;outline:none" oninput="previewPivot()">
      <input type="range" min="-2" max="2" step="0.05" value="${val}" style="flex:2" oninput="$('pv${ax}').value=parseFloat(this.value).toFixed(3);previewPivot()">
    </div>`;
  const preset = (x, y, z, lbl) =>
    `<button onclick="setPivotPreset(${x},${y},${z})" style="flex:1;min-width:60px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">${lbl}</button>`;

  const panel = document.createElement('div');
  panel.id = 'pivot-panel';
  panel.classList.add('ui-modal');
  panel.style.cssText = 'border:1px solid var(--accent4);min-width:300px';
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent4);letter-spacing:2px">◈ PIVOT POINT</span>
      <button onclick="document.getElementById('pivot-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px">✕</button>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:10px;line-height:1.6">
      Pivot — ob'ektning aylanish va ko'chirish markazi.<br>
      <span style="color:var(--accent3)">Masalan: eshik uchun — chap tomoni (-0.5, 0, 0)</span>
    </div>
    ${row('x', pm.x)}${row('y', pm.y)}${row('z', pm.z)}
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
      ${preset(0,0,0,'Markaz')}${preset(-0.5,0,0,'\u25c1 Chap')}${preset(0.5,0,0,"\u25b7 O'ng")}
      ${preset(0,-0.5,0,'\u25bd Pastki')}${preset(0,0.5,0,'\u25b3 Tepaki')}
      ${preset(0,0,-0.5,'\u25c1 Old')}${preset(0,0,0.5,'\u25b7 Orqa')}
    </div>
    <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:8px;font-family:'Share Tech Mono',monospace">
      Qo'llangach to'qnashuv qutisi va \u2696\ufe0f fizika tanasi ham
      <b style="color:var(--accent3)">birga</b> ko'chadi, sahna bilan
      <b style="color:var(--accent3)">saqlanadi</b>.
    </div>
    <button onclick="applyPivot()" style="width:100%;background:rgba(var(--accent4-rgb),.12);border:1px solid rgba(var(--accent4-rgb),.4);color:var(--accent4);font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;padding:6px;border-radius:4px;cursor:pointer">\u2705 Qo'llash</button>
  `;
  document.body.appendChild(panel);
  previewPivot();
};

window.setPivotPreset = function(x, y, z) {
  if ($('pvx')) { $('pvx').value = x; $('pvy').value = y; $('pvz').value = z; }
  const inputs = document.querySelectorAll('#pivot-panel input[type=range]');
  if (inputs[0]) inputs[0].value = x;
  if (inputs[1]) inputs[1].value = y;
  if (inputs[2]) inputs[2].value = z;
  previewPivot();
};

/** 🟣 Kelajakdagi markazni sahnada ko'rsatadi. */
window.previewPivot = function() {
  if (!selectedObj) return;
  let marker = scene.getObjectByName('__pivot_marker__');
  if (!marker) {
    marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xcc88ff, depthTest: false })
    );
    marker.name = '__pivot_marker__';
    marker.renderOrder = 999;
    marker.userData.__noSave = true;
    scene.add(marker);
  }
  const x = parseFloat($('pvx') && $('pvx').value) || 0;
  const y = parseFloat($('pvy') && $('pvy').value) || 0;
  const z = parseFloat($('pvz') && $('pvz').value) || 0;
  // ⚠ Amaldagi pivotga NISBATAN: geometriya allaqachon surilgan.
  const d = new THREE.Vector3(x, y, z).sub(PivotSystem.pivotOf(selectedObj));
  marker.position.copy(d.applyMatrix4(selectedObj.matrixWorld));
};

window.applyPivot = function() {
  if (!selectedObj) return;
  const x = parseFloat($('pvx') && $('pvx').value) || 0;
  const y = parseFloat($('pvy') && $('pvy').value) || 0;
  const z = parseFloat($('pvz') && $('pvz').value) || 0;

  if (!PivotSystem.apply(selectedObj, x, y, z)) {
    log('◈ Pivot allaqachon shu joyda', 'lw');
  } else {
    log(`◈ Pivot: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) — ` +
        `to'qnashuv va fizika ham ko'chdi`, 'lok');
  }

  const marker = scene.getObjectByName('__pivot_marker__');
  if (marker) scene.remove(marker);
  const p = document.getElementById('pivot-panel');
  if (p) p.remove();
  updateInspector();
};
