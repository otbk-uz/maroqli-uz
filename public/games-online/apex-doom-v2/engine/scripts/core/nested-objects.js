// ============================================================
// PHYSICS MODES — jele, suyuqlik, sinuvchi, mato
// ============================================================
const jellyObjects = new Map();   // mesh -> {origPositions, phase}
const liquidObjects = new Map();  // mesh -> {drops:[]}
const clothObjects = new Map();   // mesh -> {verts, vel}
const breakQueue = [];            // meshes to break this frame

window.setPhysMode = function(mode) {
  if (!selectedObj && !multiSelected.size) return;

  // Targets: multi yoki group ichidagi childlar yoki yagona obyekt
  let targets = [];
  if (multiSelected.size > 0) {
    multiSelected.forEach(o => {
      targets.push(o);
      if (o.userData.isGroup || o.userData._isFolder || o.isGroup) {
        o.traverse(ch => { if(ch!==o && (ch.isMesh||ch.isGroup) && ch.userData?.id) targets.push(ch); });
      }
    });
  } else {
    targets.push(selectedObj);
    if (selectedObj.userData.isGroup || selectedObj.userData._isFolder || selectedObj.isGroup) {
      selectedObj.traverse(ch => { if(ch!==selectedObj && (ch.isMesh||ch.isGroup) && ch.userData?.id) targets.push(ch); });
    }
  }

  targets.forEach(o => {
    if (!o || !o.userData) return;
    const prev = o.userData.physMode || 'solid';
    if (prev === 'jelly') jellyObjects.delete(o);
    if (prev === 'liquid') { liquidObjects.get(o)?.drops?.forEach(d=>scene.remove(d.mesh)); liquidObjects.delete(o); }
    if (prev === 'cloth') clothObjects.delete(o);
    o.userData.physMode = mode;

  if (mode === 'jelly') {
    // Store original vertex positions
    const posAttr = o.geometry.attributes.position;
    const orig = new Float32Array(posAttr.array);
    jellyObjects.set(o, { orig, phase: Math.random()*Math.PI*2, amp: 0 });
    o.material.color.set(0x44ff88);
    o.material.roughness = 0.1;
    o.material.metalness = 0.0;
    o.material.transparent = true;
    o.material.opacity = 0.82;
    o.material.needsUpdate = true;
    log(`🟢 ${o.userData.name} → Jele rejimi`, 'lok');
  }
  else if (mode === 'liquid') {
    o.material.color.set(0x1166ff);
    o.material.roughness = 0.0;
    o.material.metalness = 0.1;
    o.material.transparent = true;
    o.material.opacity = 0.55;
    o.material.needsUpdate = true;
    // Create liquid drop particles
    const drops = [];
    for (let i=0;i<12;i++) {
      const dg = new THREE.SphereGeometry(0.06+Math.random()*0.07, 8, 8);
      const dm = new THREE.MeshStandardMaterial({color:0x3388ff, transparent:true, opacity:0.7+Math.random()*0.25, roughness:0, metalness:0.15});
      const dp = new THREE.Mesh(dg, dm);
      dp.position.copy(o.position).add(new THREE.Vector3((Math.random()-.5)*.6, -0.3-Math.random()*.5, (Math.random()-.5)*.6));
      scene.add(dp);
      drops.push({mesh:dp, vel:new THREE.Vector3((Math.random()-.5)*.02, -0.01-Math.random()*.02, (Math.random()-.5)*.02), life:Math.random()});
    }
    liquidObjects.set(o, {drops});
    log(`🔵 ${o.userData.name} → Suyuqlik rejimi`, 'lok');
  }
  else if (mode === 'breakable') {
    o.material.color.set(0xff6644);
    o.material.roughness = 0.8;
    o.material.metalness = 0.0;
    o.material.needsUpdate = true;
    // Add crack wireframe overlay
    const wg = o.geometry.clone();
    const wm = new THREE.MeshBasicMaterial({color:0xff2200, wireframe:true, transparent:true, opacity:0.25});
    const crack = new THREE.Mesh(wg, wm);
    crack.scale.copy(o.scale).multiplyScalar(1.02);
    o.add(crack);
    o.userData._crackMesh = crack;
    log(`💥 ${o.userData.name} → Sinuvchi rejimi`, 'lok');
  }
  else if (mode === 'cloth') {
    o.material.color.set(0xcc88ff);
    o.material.roughness = 0.95;
    o.material.metalness = 0.0;
    o.material.side = THREE.DoubleSide;
    o.material.needsUpdate = true;
    // Store verts for cloth sim
    const posAttr = o.geometry.attributes.position;
    const verts = [];
    for (let i=0;i<posAttr.count;i++) {
      verts.push({
        x: posAttr.getX(i), y: posAttr.getY(i), z: posAttr.getZ(i),
        ox: posAttr.getX(i), oy: posAttr.getY(i), oz: posAttr.getZ(i),
        vx:0, vy:0, vz:0, pinned: posAttr.getY(i) > 0.4
      });
    }
    clothObjects.set(o, {verts});
    log(`🟣 ${o.userData.name} → Mato rejimi`, 'lok');
  }
  else {
    // solid — restore
    if (o.material) {
      o.material.transparent = false; o.material.opacity = 1;
      o.material.color.set(0x88aacc); o.material.roughness = 0.5; o.material.metalness = 0.3;
      o.material.side = THREE.FrontSide;
      o.material.needsUpdate = true;
    }
    if (o.userData._crackMesh) { o.remove(o.userData._crackMesh); delete o.userData._crackMesh; }
    log(`🧱 ${o.userData.name} → Qattiq rejimi`, 'lok');
  }
  }); // targets.forEach end
  updateHierarchy();
  updateInspector();
};

// ============================================================
// URILISH REJIMI (collider mode) — block vs inline (passthrough)
// ============================================================
//   block  = qattiq, urilsa boladi, fizika tanasi bor (default)
//   inline = ko'rinadi lekin orqasidan o'tib ketsa boladi (gologramma-uslubli)
function _applyInlineLook(obj, inline) {
  obj.traverse(ch => {
    if (!ch.isMesh || !ch.material) return;
    const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
    mats.forEach(m => {
      if (inline) {
        if (m.__origOpacity === undefined) {
          m.__origOpacity = m.opacity;
          m.__origTransparent = m.transparent;
          m.__origDepthWrite = m.depthWrite;
        }
        m.transparent = true;
        m.opacity = 0.35;
        m.depthWrite = false; // gologramma effekti
      } else {
        if (m.__origOpacity !== undefined) {
          m.opacity     = m.__origOpacity;
          m.transparent = m.__origTransparent;
          m.depthWrite  = m.__origDepthWrite !== undefined ? m.__origDepthWrite : true;
          delete m.__origOpacity;
          delete m.__origTransparent;
          delete m.__origDepthWrite;
        } else {
          m.opacity = 1;
          m.transparent = false;
          m.depthWrite = true;
        }
      }
      m.needsUpdate = true;
    });
  });
}

window.setColliderMode = function(mode) {
  if (!selectedObj && !multiSelected.size) return;

  // Targetlarni yig'ish (multi-select va group bolalarini qamrab oladi)
  let targets = [];
  if (multiSelected.size > 0) {
    multiSelected.forEach(o => {
      targets.push(o);
      if (o.userData.isGroup || o.userData._isFolder || o.isGroup) {
        o.traverse(ch => { if (ch!==o && (ch.isMesh||ch.isGroup) && ch.userData?.id) targets.push(ch); });
      }
    });
  } else {
    targets.push(selectedObj);
    if (selectedObj.userData.isGroup || selectedObj.userData._isFolder || selectedObj.isGroup) {
      selectedObj.traverse(ch => { if (ch!==selectedObj && (ch.isMesh||ch.isGroup) && ch.userData?.id) targets.push(ch); });
    }
  }

  targets.forEach(o => {
    if (!o || !o.userData) return;
    o.userData.colliderMode = mode;

    if (mode === 'inline') {
      // Joriy fizika sozlamalarini saqlab qo'yamiz — keyin tiklash uchun
      if (typeof physBodies !== 'undefined') {
        const existing = physBodies.find(b => b.mesh === o);
        if (existing && !o.userData._savedPhys) {
          o.userData._savedPhys = {
            mass:        existing.mass,
            restitution: existing.restitution,
            friction:    existing.friction,
            isStatic:    existing.isStatic,
            radius:      existing.radius,
            shape:       existing.shape,
          };
        }
        if (typeof removeRapierBody === 'function') removeRapierBody(o);
      }
      // Eski versiyada qo'shilgan avto-shaffoflikni qaytaramiz (agar bor bo'lsa)
      _applyInlineLook(o, false);
      log(`👻 ${o.userData.name} → Inline (orqasidan o'tib ketsa boladi)`, 'lw');
    } else {
      // block — material'ga tegmaymiz, foydalanuvchi o'zi nazorat qiladi
      _applyInlineLook(o, false); // eski avto-shaffoflik bo'lsa tozalash
      // Fizika tanasi yo'q bo'lsa, saqlangan sozlama yoki defolt bilan qaytarish
      if (typeof physBodies !== 'undefined' && typeof addPhysicsBody === 'function') {
        const stillHas = physBodies.find(b => b.mesh === o);
        if (!stillHas) {
          const saved = o.userData._savedPhys || { isStatic: !!o.userData.isStatic };
          addPhysicsBody(o, saved);
          delete o.userData._savedPhys;
        }
      }
      log(`🧱 ${o.userData.name} → Block (urilsa boladi)`, 'lok');
    }
  });

  updateInspector();
};
