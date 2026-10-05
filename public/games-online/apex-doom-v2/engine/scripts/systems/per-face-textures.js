// ============================================================
// PER-FACE TEXTURES
// Assign a distinct texture / color / visibility to each face of
// a cube (BoxGeometry). PNG transparency is respected automatically.
//
// Face indices (BoxGeometry standard):
//   0 → Right   (+X)
//   1 → Left    (−X)
//   2 → Top     (+Y)
//   3 → Bottom  (−Y)
//   4 → Front   (+Z)
//   5 → Back    (−Z)
//
// UI text: Uzbek. Code/comments: English.
// ============================================================

const PerFaceTextures = (() => {
  'use strict';

  // Kub uchun eski (orqaga mos) qiymatlar
  const FACE_COUNT = 6;
  const FACE_LABELS = ["O'ng (+X)", "Chap (-X)", "Yuqori (+Y)", "Past (-Y)", "Old (+Z)", "Orqa (-Z)"];
  const FACE_KEYS   = ['right', 'left', 'top', 'bottom', 'front', 'back'];

  // ── Shakl sxemalari ────────────────────────────────────────
  //  Three.js har bir geometriyani "group" larga bo'ladi — har bir group
  //  o'z materialini oladi. O'lchangan qiymatlar (three r128):
  //    BoxGeometry      → 6  (olti yoq)
  //    CylinderGeometry → 3  (yon yuza + 2 qopqoq)
  //    ConeGeometry     → 2  (yon yuza + tag)
  //    Uchburchak = CylinderGeometry(0, r, h, 3) → 2  (radiusTop=0 →
  //                       yuqori qopqoq tushib qoladi, konusga aylanadi)
  //    Sfera/Torus/Tekislik/Oktagedron → 0  (yagona yaxlit yuza)
  const SCHEMES = {
    6: { labels: FACE_LABELS, keys: FACE_KEYS },
    3: { labels: ['Yon yuza', 'Yuqori qopqoq', 'Past qopqoq'],
         keys:   ['side', 'top', 'bottom'] },
    2: { labels: ['Yon yuza', 'Tag'], keys: ['side', 'bottom'] },
  };

  /** Geometriyadagi mustaqil qismlar soni (0 = yaxlit) */
  function partCount(mesh) {
    if (!mesh || !mesh.geometry) return 0;
    const g = mesh.geometry;
    if (Array.isArray(g.groups) && g.groups.length) return g.groups.length;
    // Ba'zi holatlarda groups hali yasalmagan bo'lishi mumkin
    if (g.type === 'BoxGeometry') return FACE_COUNT;
    return 0;
  }

  /** Shakl uchun qism nomlari */
  function partLabels(mesh) {
    const n = partCount(mesh);
    const sc = SCHEMES[n];
    if (sc) return sc.labels;
    return Array.from({ length: n }, (_, i) => `Qism ${i + 1}`);
  }

  /**
   * Har-qismga alohida tekstura MUMKINMI.
   * ⚠ Ilgari faqat 6 guruhli (kub) o'tardi — shu sabab silindr, konus va
   *   uchburchakka tekstura qo'yib bo'lmasdi. Endi 2 va undan ortiq
   *   qismli har qanday shakl qo'llab-quvvatlanadi.
   *   Sfera/Torus (0 qism) — bo'linadigan yuzasi yo'q, ular uchun
   *   "Hamma yeriga tekstura" tugmasi ishlatiladi.
   */
  function supports(mesh) {
    return partCount(mesh) >= 2;
  }

  // Fresh default data for a face
  function _defaultFace(baseColor) {
    return {
      textureBase64: '',
      textureName:   '',
      color:         baseColor || '#ffffff',
      visible:       true,
    };
  }

  // Initialise userData.perFace if missing, seeding from current material
  function _ensureData(mesh) {
    if (!mesh.userData.perFace) {
      // mesh.material might be an array at this point (unlikely, but safe)
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const baseColor = (mat && mat.color)
        ? '#' + mat.color.getHexString()
        : '#ffffff';
      mesh.userData.perFace = {
        enabled: false,
        // ⚠ Shaklga qarab: kub 6, silindr 3, konus/uchburchak 2
        faces:   Array.from({ length: partCount(mesh) }, () => _defaultFace(baseColor)),
      };
    }
    // Shakl almashgan bo'lsa (masalan kub → silindr) — moslashtiramiz
    const need = partCount(mesh);
    const arr  = mesh.userData.perFace.faces;
    const mat0 = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const bc   = (mat0 && mat0.color) ? '#' + mat0.color.getHexString() : '#ffffff';
    while (arr.length < need) arr.push(_defaultFace(bc));
    if (arr.length > need) arr.length = need;
    return mesh.userData.perFace;
  }

  // Build a material for a single face using its data slot.
  // Copies key PBR properties (roughness/metalness/emissive) from the
  // mesh's original material so all faces stay physically consistent.
  //
  // IMPORTANT: never set material.visible = false. THREE.Mesh.raycast()
  // skips face groups whose material is invisible, which breaks click
  // selection AND FPS pickup. Instead we use opacity = 0 + transparent
  // to hide a face while keeping it raycast-hittable.
  function _makeFaceMaterial(mesh, face) {
    // Pull the original single material if we saved it; otherwise
    // fall back to the current material (which may be an array on
    // second/third rebuilds — safe because we only read .isMeshStandardMaterial).
    const base = mesh.userData._perFaceOrigMat || mesh.material;
    const singleBase = Array.isArray(base) ? base[0] : base;
    const isPBR = singleBase && (singleBase.isMeshStandardMaterial || singleBase.isMeshPhysicalMaterial);
    const mat = isPBR
      ? new THREE.MeshStandardMaterial()
      : new THREE.MeshBasicMaterial();

    mat.color.set(face.color || '#ffffff');
    // Carry over shared PBR settings so faces don't look mismatched
    if (isPBR && singleBase) {
      mat.roughness = singleBase.roughness;
      mat.metalness = singleBase.metalness;
      if (singleBase.emissive) mat.emissive.copy(singleBase.emissive);
    }

    const wantHidden = face.visible === false;

    if (face.textureBase64) {
      const tex = new THREE.TextureLoader().load(face.textureBase64, () => {
        mat.needsUpdate = true;
      });
      // ⚠ Rang maydoni ham, `colorSpace` ham bo'lishi mumkin —
      //   uch.js versiyasiga qarab. Skybox'dagi bilan bir xil tekshiruv.
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      mat.map = tex;

      // ⚠ ALOMAT: "ba'zida tekstura ko'rinmay qoladi".
      //
      // ⚠ SABAB: bu yerda HAR QANDAY teksturaga `transparent = true`
      //   qo'yilardi. Shaffof material SHAFFOF O'TISHDA chiziladi:
      //   u chuqurlikni ishonchli yozmaydi va kamera burchagiga qarab
      //   saralanadi. Natijada yopiq kubning old yuzasi orqa yuzasi
      //   ostida qolib ketardi — tekstura goh ko'rinib, goh yo'qolardi.
      //   JPEG da esa alfa umuman yo'q, ya'ni shaffoflik BEHUDA edi.
      //
      // YECHIM: shaffoflik faqat alfa BO'LISHI MUMKIN bo'lgan
      //   formatlarda (png/webp/gif). Qolganida material qattiq
      //   qoladi va har doim ko'rinadi.
      const mime = String(face.textureBase64).slice(5, 30).toLowerCase();
      const mayHaveAlpha = /png|webp|gif/.test(mime);
      mat.transparent = mayHaveAlpha;
      if (mayHaveAlpha) mat.alphaTest = 0.01;
    } else if (wantHidden) {
      // Hidden solid face — just make it invisible via opacity
      mat.transparent = true;
    } else {
      // Solid-colour visible face — keep it opaque so raycast / pickup works
      mat.transparent = false;
    }

    // Hide via opacity, NOT via mat.visible (which breaks raycasting)
    mat.opacity = wantHidden ? 0 : 1;

    // Keep FrontSide (default). DoubleSide creates duplicate hits that
    // can confuse the FPS pickup raycaster.
    mat.side = THREE.FrontSide;

    // NEVER touch mat.visible — always leave it true so raycast works.
    mat.visible = true;
    mat.needsUpdate = true;
    return mat;
  }

  // Rebuild the material array on the mesh from userData.perFace
  function rebuild(mesh) {
    const data = _ensureData(mesh);
    if (!data.enabled) return;
    if (!supports(mesh)) {
      log("⚠ Bu obyekt turida per-face rejim qo'llab-quvvatlanmaydi", 'lw');
      return;
    }

    // Save the previous material so disable() can restore it
    if (!mesh.userData._perFaceOrigMat && !Array.isArray(mesh.material)) {
      mesh.userData._perFaceOrigMat = mesh.material;
    }

    const mats = data.faces.map(f => _makeFaceMaterial(mesh, f || _defaultFace('#ffffff')));
    mesh.material = mats;
    // needsUpdate on the array itself does nothing — set per-material
    mats.forEach(m => { m.needsUpdate = true; });

    // ── BULLETPROOF RAYCAST OVERRIDE ──────────────────────────
    // Replace mesh.raycast() with a bounding-box implementation.
    // Three.js's default Mesh.raycast() iterates every triangle and
    // for multi-material meshes checks the group's material — with
    // certain state combinations (transparency, alphaTest, opacity 0,
    // material.needsUpdate on an array, etc.) it can silently drop
    // hits, making the mesh un-selectable. A bounding-box test does
    // not depend on any of that: it works from geometry only.
    _installRaycastOverride(mesh);
  }

  // Install a bounding-box raycast on the mesh (idempotent)
  function _installRaycastOverride(mesh) {
    if (mesh.userData._perFaceRaycast) return;
    mesh.userData._perFaceRaycast = true;
    // Keep the original method around so disable() can undo the override
    mesh.userData._origRaycast = mesh.raycast;

    mesh.raycast = function(raycaster, intersects) {
      // Compute world-space bounding box from the geometry.
      // Not cached because the mesh could be scaled or rotated at any time.
      const geom = this.geometry;
      if (!geom) return;
      if (!geom.boundingBox) geom.computeBoundingBox();
      const bbox = geom.boundingBox.clone().applyMatrix4(this.matrixWorld);

      const hitPoint = new THREE.Vector3();
      if (!raycaster.ray.intersectBox(bbox, hitPoint)) return;

      const distance = raycaster.ray.origin.distanceTo(hitPoint);
      if (distance < raycaster.near || distance > raycaster.far) return;

      intersects.push({
        distance,
        point:     hitPoint.clone(),
        object:    this,
        face:      null,
        faceIndex: 0,
        uv:        null,
      });
    };
  }

  // Undo the raycast override (used by disable())
  function _uninstallRaycastOverride(mesh) {
    if (!mesh.userData._perFaceRaycast) return;
    if (mesh.userData._origRaycast) {
      mesh.raycast = mesh.userData._origRaycast;
    } else {
      // Fallback: remove the own property so the prototype method is used
      delete mesh.raycast;
    }
    delete mesh.userData._perFaceRaycast;
    delete mesh.userData._origRaycast;
  }

  function enable(mesh) {
    if (!supports(mesh)) {
      log("⚠ Faqat Kub obyekti uchun mavjud", 'lw');
      return false;
    }
    const data = _ensureData(mesh);
    data.enabled = true;
    rebuild(mesh);
    log('+ Per-face texture rejim yoqildi', 'lok');
    return true;
  }

  function disable(mesh) {
    const data = mesh.userData && mesh.userData.perFace;
    if (!data) return;
    data.enabled = false;

    // Restore the pre-per-face material, if any
    if (mesh.userData._perFaceOrigMat) {
      // Dispose per-face materials + their textures to free GPU memory
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
      mesh.material = mesh.userData._perFaceOrigMat;
      delete mesh.userData._perFaceOrigMat;
    }

    // Restore Three.js's default raycast method
    _uninstallRaycastOverride(mesh);

    log('− Per-face texture rejim o\'chirildi', 'lw');
  }

  // Update a single face slot and re-apply just that material
  function setFace(mesh, idx, props) {
    if (idx < 0 || idx >= partCount(mesh)) return;
    const data = _ensureData(mesh);
    Object.assign(data.faces[idx], props);
    if (!data.enabled) return;
    // Rebuild only this slot for efficiency
    if (Array.isArray(mesh.material) && mesh.material[idx]) {
      const oldMat = mesh.material[idx];
      const newMat = _makeFaceMaterial(mesh, data.faces[idx]);
      mesh.material[idx] = newMat;
      // Dispose old
      if (oldMat.map) oldMat.map.dispose();
      oldMat.dispose();
    }
  }

  function toggleFaceVisibility(mesh, idx) {
    const data = _ensureData(mesh);
    if (idx < 0 || idx >= partCount(mesh)) return;
    data.faces[idx].visible = !data.faces[idx].visible;
    // Re-apply the whole face material so opacity + transparent are correct
    if (data.enabled && Array.isArray(mesh.material) && mesh.material[idx]) {
      const oldMat = mesh.material[idx];
      mesh.material[idx] = _makeFaceMaterial(mesh, data.faces[idx]);
      if (oldMat.map) oldMat.map.dispose();
      oldMat.dispose();
    }
  }

  // Serialize for save/load — pure JSON, no runtime bits
  function serialize(mesh) {
    const data = mesh.userData && mesh.userData.perFace;
    if (!data || !data.enabled) return null;
    return {
      enabled: true,
      faces: data.faces.map(f => ({
        textureBase64: f.textureBase64 || '',
        textureName:   f.textureName   || '',
        color:         f.color         || '#ffffff',
        visible:       f.visible !== false,
      })),
    };
  }

  function deserialize(mesh, data) {
    if (!data || !data.enabled) return;
    if (!supports(mesh)) return;
    mesh.userData.perFace = {
      enabled: true,
      faces: (data.faces || []).slice(0, partCount(mesh)).map(f => ({
        textureBase64: f.textureBase64 || '',
        textureName:   f.textureName   || '',
        color:         f.color         || '#ffffff',
        visible:       f.visible !== false,
      })),
    };
    // Pad if fewer than 6 faces were provided
    while (mesh.userData.perFace.faces.length < partCount(mesh)) {
      mesh.userData.perFace.faces.push(_defaultFace('#ffffff'));
    }
    rebuild(mesh);
  }

  return {
    supports,
    enable,
    disable,
    rebuild,
    setFace,
    toggleFaceVisibility,
    serialize,
    deserialize,

    // ── ⚠ `restore` — `deserialize` ning TAXALLUSI ──────────────
    //  Loyihadagi qolgan tizimlar `serialize()` / `restore()` juftini
    //  ishlatadi va `SystemRegistry` aynan shu nomni qidiradi. Bu
    //  modul esa `deserialize` deb atagan — ya'ni reyestr uni
    //  "serialize() bor, restore() YO'Q" deb ogohlantirardi.
    //
    //  ⚠ HOZIRCHA ZARARI YO'Q: bu tizim OBYEKTGA tegishli va
    //    `save-load.js` uni har obyekt uchun ALOHIDA tiklaydi
    //    (`od.perFace` → `deserialize`). Shuning uchun u
    //    `HANDLED` ro'yxatida turadi va reyestr unga tegmaydi.
    //
    //  ⚠ XAVF esa kelajakda: kimdir uni `HANDLED` dan olib tashlasa,
    //    reyestr saqlashni oladi-yu, tiklashni topolmaydi — har
    //    yuzga qo'yilgan teksturalar JIMGINA yo'qolardi. Taxallus
    //    shu tuzoqni yopadi: ikkala nom ham ishlaydi.
    //
    //  ⚠ Imzosi bir xil: `(mesh, data)`. Reyestr `restore(data)` deb
    //    chaqirsa `mesh` `undefined` bo'ladi va funksiya birinchi
    //    qatorida chiqib ketadi — sinmaydi.
    restore: deserialize,
    FACE_LABELS,
    FACE_KEYS,
    FACE_COUNT,
    partCount,
    partLabels,
  };
})();

window.PerFaceTextures = PerFaceTextures;

// ============================================================
// MODAL — opened via "🎨 Har yuzga alohida tekstura" button in Inspector
// ============================================================
function _pfRenderModal() {
  const mesh = selectedObj;
  if (!mesh) return;
  const data = mesh.userData.perFace || { enabled: false, faces: [] };
  const isCube = PerFaceTextures.supports(mesh);

  const facesHtml = isCube
    ? PerFaceTextures.partLabels(mesh).map((label, idx) => {
        const f = (data.faces && data.faces[idx]) || {};
        const hasTex = !!f.textureBase64;
        const preview = hasTex
          ? `<img src="${f.textureBase64}" style="width:80px;height:80px;object-fit:cover;border:1px solid var(--border);border-radius:3px;background:repeating-conic-gradient(#666 0 25%,#333 0 50%) 50%/10px 10px">`
          : `<div style="width:80px;height:80px;border:1px dashed var(--border);border-radius:3px;background:${f.color||'#ffffff'};display:flex;align-items:center;justify-content:center;font-size:10px;color:${(f.color||'#ffffff').toLowerCase()==='#ffffff'?'#333':'#fff'};font-family:'Share Tech Mono',monospace">RANG</div>`;
        const visStyle = f.visible === false ? 'opacity:0.4' : '';
        return `
          <div style="border:1px solid var(--border);border-radius:4px;padding:10px;background:rgba(0,0,0,.2);${visStyle}">
            <div style="font-size:11px;color:var(--accent);font-family:'Share Tech Mono',monospace;letter-spacing:1px;margin-bottom:8px">
              ${label}
            </div>
            <div style="display:flex;gap:10px;margin-bottom:8px">
              ${preview}
              <div style="flex:1;display:flex;flex-direction:column;gap:4px">
                ${f.textureName ? `
                  <div style="font-size:9px;color:var(--muted);word-break:break-all;line-height:1.3">
                    📎 ${f.textureName}
                  </div>` : `
                  <div style="font-size:9px;color:var(--muted);font-style:italic">
                    Texture yo'q
                  </div>`}
                <div style="display:flex;gap:4px;align-items:center;margin-top:4px">
                  <input type="color" value="${f.color || '#ffffff'}"
                         onchange="window._pfSetColor(${idx}, this.value)"
                         style="width:40px;height:26px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:var(--bg)" title="Rang">
                  <label style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text);cursor:pointer">
                    <input type="checkbox" ${f.visible !== false ? 'checked' : ''}
                           onchange="window._pfSetVisible(${idx}, this.checked)"
                           style="cursor:pointer">
                    ${f.visible !== false ? "ko'rinuvchan" : 'yashirin'}
                  </label>
                </div>
              </div>
            </div>
            <div style="display:flex;gap:4px">
              <button onclick="window._pfPickTexture(${idx})"
                      style="flex:1;background:rgba(var(--accent2-rgb),.1);border:1px solid rgba(var(--accent2-rgb),.35);color:var(--accent2);padding:5px 8px;border-radius:3px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:600">
                📂 Rasm yuklash
              </button>
              ${hasTex ? `
                <button onclick="window._pfClearTexture(${idx})"
                        style="background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.35);color:var(--red);padding:5px 10px;border-radius:3px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:11px" title="Texture'ni tozalash">✕</button>` : ''}
            </div>
          </div>`;
      }).join('')
    : `<div style="grid-column:1/-1;padding:16px;text-align:center;color:var(--muted);font-size:12px">
         Bu funksiya faqat <b>Kub</b> obyektlari uchun mavjud.
       </div>`;

  const modal = document.getElementById('pf-modal');
  if (!modal) return;
  modal.innerHTML = `
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:18px;width:min(680px,90vw);max-height:88vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,.9);font-family:'Rajdhani',sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--accent);letter-spacing:2px">
            HAR YUZGA ALOHIDA TEKSTURA
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">
            ${mesh.userData.name || 'Obyekt'} — ${isCube
               ? PerFaceTextures.partCount(mesh) + ' qism: ' + PerFaceTextures.partLabels(mesh).join(', ')
               : 'bu shakl yaxlit — bo\'linadigan yuzasi yo\'q'}
          </div>
        </div>
        <button onclick="window._pfCloseModal()"
                style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:22px;line-height:1;padding:0 6px">✕</button>
      </div>

      ${!isCube ? `
        <div style="font-size:11px;color:var(--muted);line-height:1.7;padding:10px 12px;
                    background:rgba(255,170,68,.06);border-left:3px solid #ffaa44;border-radius:3px">
          Sfera, Torus, Tekislik kabi shakllar Three.js da <b>yagona yaxlit yuza</b> —
          ularni yuzlarga bo'lib bo'lmaydi.<br>
          Bunday shakllarga tekstura Inspektordagi
          <b style="color:var(--accent)">🖼 Hamma yeriga tekstura</b> tugmasi orqali qo'yiladi.
        </div>` : ''}

      ${isCube ? `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(var(--accent-rgb),.05);border-left:3px solid var(--accent);border-radius:3px;margin-bottom:12px">
          <input type="checkbox" id="pf-modal-enable" ${data.enabled?'checked':''}
                 onchange="window._pfToggle()" style="cursor:pointer;transform:scale(1.2)">
          <label for="pf-modal-enable" style="cursor:pointer;font-size:12px;color:var(--text);flex:1">
            <b>Rejimni yoqish</b> — obyekt materiali
            ${PerFaceTextures.partCount(mesh)} ta alohida materialga bo'linadi
          </label>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;${data.enabled?'':'opacity:0.4;pointer-events:none'}">
          ${facesHtml}
        </div>

        ${data.enabled ? `
          <div style="font-size:10px;color:var(--muted);padding:8px 10px;background:rgba(var(--accent-rgb),.03);border-left:2px solid var(--accent);border-radius:3px;margin-top:12px;line-height:1.6">
            <b style="color:var(--accent)">PNG shaffofligi</b> — shaffof qismlar orqali ichi ko'rinadi.<br>
            <b style="color:var(--red)">yashirin</b> — yuz butunlay yo'q qilinadi (bir tomoni ochiq quti, chodir va h.k.).<br>
            <b style="color:var(--accent2)">rang</b> — texture ostidagi asosiy rang (texture yo'q bo'lsa faqat rang ko'rinadi).
          </div>` : ''}
      ` : facesHtml}
    </div>
    <input type="file" id="pf-file-input" accept="image/*"
           style="display:none" onchange="window._pfHandleFile(event)">
  `;
}

window._pfOpenModal = function() {
  if (!selectedObj) { log("⚠ Avval obyekt tanlang", 'lw'); return; }
  let modal = document.getElementById('pf-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pf-modal';
    modal.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.7);' +
      'display:flex;align-items:center;justify-content:center;' +
      'z-index:10002;';
    modal.addEventListener('click', (e) => {
      // Close only when clicking the backdrop, not the panel inside
      if (e.target === modal) window._pfCloseModal();
    });
    document.body.appendChild(modal);
  }
  _pfRenderModal();
};

window._pfCloseModal = function() {
  const modal = document.getElementById('pf-modal');
  if (modal) modal.remove();
};

// ============================================================
// UI callbacks — all refresh the modal (not the inspector)
// ============================================================
let _pfActiveIdx = 0;   // which face slot the file picker targets

window._pfToggle = function() {
  if (!selectedObj) return;
  if (!PerFaceTextures.supports(selectedObj)) {
    log("⚠ Bu shaklning bo'linadigan yuzasi yo'q — \"🖼 Hamma yeriga tekstura\" dan foydalaning", 'lw');
    return;
  }
  const data = selectedObj.userData.perFace;
  if (data && data.enabled) PerFaceTextures.disable(selectedObj);
  else                       PerFaceTextures.enable(selectedObj);
  _pfRenderModal();
};

window._pfSetVisible = function(idx, visible) {
  if (!selectedObj || !selectedObj.userData.perFace) return;
  const data = selectedObj.userData.perFace;
  // Only rebuild if state actually changes
  if (data.faces[idx].visible !== visible) {
    data.faces[idx].visible = !!visible;
    // Rebuild the material properly (opacity trick, not mat.visible=false)
    PerFaceTextures.setFace(selectedObj, idx, {});
  }
  _pfRenderModal();
};

window._pfSetColor = function(idx, color) {
  if (!selectedObj) return;
  PerFaceTextures.setFace(selectedObj, idx, { color });
  _pfRenderModal();
};

window._pfPickTexture = function(idx) {
  _pfActiveIdx = idx;
  const inp = document.getElementById('pf-file-input');
  if (inp) inp.click();
};

window._pfClearTexture = function(idx) {
  if (!selectedObj) return;
  PerFaceTextures.setFace(selectedObj, idx, { textureBase64: '', textureName: '' });
  log(`✕ Yuz ${idx + 1}: texture olib tashlandi`, 'lw');
  _pfRenderModal();
};

window._pfHandleFile = function(event) {
  const file = event && event.target && event.target.files && event.target.files[0];
  if (!file || !selectedObj) return;
  const idx = _pfActiveIdx;

  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result;
    // ⚠ Rang OQ ga qaytariladi. Material rangi tekstura ustidan
    //   KO'PAYTIRILADI: quyuq yuzaga rasm qo'yilsa u deyarli qora
    //   chiqib, "tekstura ko'rinmadi" degan taassurot berardi.
    //   Rangni ataylab bo'yash kerak bo'lsa — yuklashdan KEYIN.
    PerFaceTextures.setFace(selectedObj, idx, {
      textureBase64: base64,
      textureName:   file.name,
      color:         '#ffffff',
    });
    const label = PerFaceTextures.partLabels(selectedObj)[idx] || `Qism ${idx + 1}`;
    log(`🖼 ${label}: ${file.name}`, 'lok');
    _pfRenderModal();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};
