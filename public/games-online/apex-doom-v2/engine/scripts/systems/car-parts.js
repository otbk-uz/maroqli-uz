// ============================================================
//  CAR PARTS  —  GLB mashina qismlarini belgilash + g'ildirak animatsiyasi
//  Mashina GLB'sining sub-mesh'larini rol'ga biriktiramiz (old/orqa
//  g'ildiraklar, rul). Dvijok haydaganда g'ildiraklarni aylantiradi,
//  old g'ildiraklar + rulni buradi.
// ============================================================

// Mashina ichidagi barcha mesh'lar ro'yxati (uuid + nom)
function _carMeshList(carObj) {
  const list = [];
  if (!carObj) return list;
  carObj.traverse(ch => {
    if ((ch.isMesh || ch.isObject3D) && ch !== carObj) {
      const nm = ch.name || ('mesh_' + ch.uuid.slice(0, 4));
      // faqat nomli yoki mesh'larni ko'rsatamiz (juda mayda bo'sh grouplarni ham qamraymiz)
      if (ch.isMesh || (ch.name && ch.children && ch.children.length)) {
        list.push({ uuid: ch.uuid, name: nm, isMesh: !!ch.isMesh });
      }
    }
  });
  return list;
}

const _CAR_ROLES = [
  ['wheelFL',  'Old chap g\'ildirak',  'var(--accent)'],
  ['wheelFR',  'Old o\'ng g\'ildirak',  'var(--accent)'],
  ['wheelRL',  'Orqa chap g\'ildirak', 'var(--accent3)'],
  ['wheelRR',  'Orqa o\'ng g\'ildirak', 'var(--accent3)'],
  ['steering', 'Rul',                  'var(--accent2)'],
  ['headlightF', 'Old fara',           '#ffee55'],
  ['headlightR', 'Orqa fara (stop)',   '#ff5555'],
  ['hood',     'Kapot',                'var(--accent4)'],
  ['spoiler',  'Spoyler',              'var(--accent4)'],
  ['bumperF',  'Old bamper',           '#88bbff'],
  ['bumperR',  'Orqa bamper',          '#88bbff'],
  ['doorFL',   'Old chap eshik',       '#ff66cc'],
  ['doorFR',   'Old o\'ng eshik',       '#ff66cc'],
  ['doorRL',   'Orqa chap eshik',      '#ff99dd'],
  ['doorRR',   'Orqa o\'ng eshik',      '#ff99dd'],
];

window.openCarPartsMenu = function(carObj) {
  carObj = carObj || (typeof selectedObj !== 'undefined' ? selectedObj : null);
  if (!carObj) { if (window.log) log('⚠ Mashina tanlanmagan', 'lw'); return; }
  const cfg = window._getCarCfg ? window._getCarCfg(carObj) : (carObj.userData._carCfg = carObj.userData._carCfg || {});
  cfg.parts = cfg.parts || {};
  if (cfg.partsEnabled === undefined) cfg.partsEnabled = true;

  const meshes = _carMeshList(carObj);
  const old = document.getElementById('carparts-overlay');
  if (old) old.remove();

  const ov = document.createElement('div');
  ov.id = 'carparts-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px)';

  const opts = (sel) => '<option value="">— yo\'q —</option>' +
    meshes.map(m => `<option value="${m.uuid}" ${sel===m.uuid?'selected':''}>${m.name}${m.isMesh?'':' (grup)'}</option>`).join('');

  const rows = _CAR_ROLES.map(([key, label, color]) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:10px;color:${color};min-width:130px;font-family:'Share Tech Mono',monospace">${label}</span>
      <select onchange="window._carSetPart('${key}',this.value)" style="flex:1;background:#080d18;border:1px solid #232d3f;color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:5px 7px;border-radius:4px;outline:none">
        ${opts(cfg.parts[key])}
      </select>
      <button onclick="window._carHilite('${key}')" title="Ajratib ko'rsatish" style="flex-shrink:0;padding:5px 8px;border-radius:4px;background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.3);color:var(--accent);font-size:10px;cursor:pointer">👁</button>
    </div>`).join('');

  ov.innerHTML = `
    <div style="background:#0b1020;border:1px solid rgba(0,180,255,.25);border-radius:12px;padding:20px 22px;width:560px;max-width:95vw;max-height:88vh;overflow-y:auto;font-family:'Share Tech Mono',monospace;color:var(--text);box-shadow:0 0 60px rgba(0,180,255,.12)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;color:#00b4ff;letter-spacing:1px">🔧 MASHINA QISMLARI</div>
        <button onclick="document.getElementById('carparts-overlay').remove()" style="background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);color:#ff4444;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:12px">✕</button>
      </div>
      <div style="font-size:8px;color:var(--border);margin-bottom:14px;line-height:1.5">
        GLB modeldagi qismlarni tanlang. Dvijok g'ildiraklarni aylantiradi, old g'ildiraklar + rulni buradi.
        Model ichida ${meshes.length} ta qism topildi.
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 10px;background:rgba(0,180,255,.05);border:1px solid rgba(0,180,255,.15);border-radius:5px">
        <input type="checkbox" id="carparts-enabled" ${cfg.partsEnabled?'checked':''} onchange="window._carSetPartsEnabled(this.checked)" style="width:15px;height:15px;cursor:pointer;accent-color:#00b4ff">
        <span style="font-size:10px;color:var(--text)">G'ildirak/rul animatsiyasini yoqish</span>
      </div>
      ${rows}
      <div style="font-size:8px;color:var(--border);margin-top:10px;line-height:1.5">
        💡 Agar g'ildirak noto'g'ri o'q bo'yicha aylansa yoki bur ilса — ayting, o'qini moslashtiraman.
      </div>
    </div>`;
  ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
};

window._carSetPart = function(key, uuid) {
  const o = (typeof selectedObj !== 'undefined') ? selectedObj : null; if (!o) return;
  const cfg = window._getCarCfg ? window._getCarCfg(o) : o.userData._carCfg;
  if (!cfg) return;
  cfg.parts = cfg.parts || {};
  cfg.parts[key] = uuid || '';
  // cache tozalash (runtime qayta topsin)
  o.userData._carPartCache = null;
};
window._carSetPartsEnabled = function(on) {
  const o = (typeof selectedObj !== 'undefined') ? selectedObj : null; if (!o) return;
  const cfg = window._getCarCfg ? window._getCarCfg(o) : o.userData._carCfg;
  if (cfg) cfg.partsEnabled = !!on;
};
window._carHilite = function(key) {
  const o = (typeof selectedObj !== 'undefined') ? selectedObj : null; if (!o) return;
  const cfg = window._getCarCfg ? window._getCarCfg(o) : o.userData._carCfg;
  const uuid = cfg && cfg.parts && cfg.parts[key];
  if (!uuid) return;
  const m = o.getObjectByProperty('uuid', uuid);
  if (!m) return;
  // vaqtincha yorqinlashtiramiz
  m.traverse(ch => {
    if (ch.isMesh && ch.material) {
      const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
      mats.forEach(mat => {
        if (!mat.emissive) return;
        const prev = mat.emissive.getHex();
        mat.emissive.setHex(0x00ff88);
        setTimeout(() => { try { mat.emissive.setHex(prev); } catch(e){} }, 700);
      });
    }
  });
};

// ── Runtime: g'ildirak/rul animatsiyasi (updateCar'дан chaqiriladi) ──
//    speed — m/s (ishorasi bilan), steer — burilish (-max..max)
function applyCarWheels(carObj, speed, steer, delta, headlightOn) {
  if (!carObj) return;
  const cfg = window._getCarCfg ? window._getCarCfg(carObj) : carObj.userData._carCfg;
  if (!cfg || !cfg.parts || cfg.partsEnabled === false) return;

  // Mesh cache (uuid → mesh) — har frame traverse qilmaslik uchun
  let cache = carObj.userData._carPartCache;
  if (!cache) {
    cache = {};
    for (const key in cfg.parts) {
      const uuid = cfg.parts[key];
      cache[key] = uuid ? carObj.getObjectByProperty('uuid', uuid) : null;
    }
    carObj.userData._carPartCache = cache;
  }

  const spin = speed * delta * 2.2;           // g'ildirak aylanishi (radian)
  const steerAngle = (steer || 0) * 6;        // old g'ildirak burilishi (radian)
  const clampSteer = Math.max(-0.6, Math.min(0.6, steerAngle));

  // Orqa g'ildiraklar — faqat aylanadi
  ['wheelRL', 'wheelRR'].forEach(k => { const m = cache[k]; if (m) m.rotation.x += spin; });
  // Old g'ildiraklar — aylanadi + buriladi
  ['wheelFL', 'wheelFR'].forEach(k => { const m = cache[k]; if (m) { m.rotation.y = clampSteer; m.rotation.x += spin; } });
  // Rul — buriladi (Z o'qi bo'yicha)
  const st = cache['steering'];
  if (st) st.rotation.z = -clampSteer * 2.5;

  // Faralar — yoqilgan bo'lsa yonadi (emissive)
  _setFaraGlow(cache['headlightF'], headlightOn, 0xfff2aa);
  _setFaraGlow(cache['headlightR'], headlightOn, 0xff3333);
  // Orqa fara — tormozда ham yonadi (S bosilib sekinlaganда)
}
function _setFaraGlow(mesh, on, colorHex) {
  if (!mesh || mesh.userData._faraState === on) return;   // faqat o'zgarganда
  mesh.userData._faraState = on;
  mesh.traverse(ch => {
    if (ch.isMesh && ch.material) {
      const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
      mats.forEach(mat => {
        if (!mat.emissive) return;
        if (on) {
          if (mat.userData._prevEmissive === undefined) mat.userData._prevEmissive = mat.emissive.getHex();
          mat.emissive.setHex(colorHex);
          mat.emissiveIntensity = 1.4;
        } else {
          if (mat.userData._prevEmissive !== undefined) { mat.emissive.setHex(mat.userData._prevEmissive); mat.userData._prevEmissive = undefined; }
          else mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 1;
        }
        mat.needsUpdate = true;
      });
    }
  });
}
window.applyCarWheels = applyCarWheels;

// ── Eshiklarni ochish/yopish (mashinaga kirish/chiqishда) ──────
//    Y o'qi bo'yicha aylantiradi (chap/o'ng eshiklar teskari tomonga).
function _tweenDoor(m, targetY) {
  if (m.userData._doorTween) cancelAnimationFrame(m.userData._doorTween);
  const step = () => {
    const d = targetY - m.rotation.y;
    if (Math.abs(d) < 0.01) { m.rotation.y = targetY; m.userData._doorTween = null; return; }
    m.rotation.y += d * 0.18;
    m.userData._doorTween = requestAnimationFrame(step);
  };
  step();
}
window.animateCarDoors = function(carObj, open) {
  if (!carObj) return;
  const cfg = window._getCarCfg ? window._getCarCfg(carObj) : carObj.userData._carCfg;
  if (!cfg || !cfg.parts || cfg.partsEnabled === false) return;
  const cache = carObj.userData._carPartCache || {};
  ['doorFL', 'doorFR', 'doorRL', 'doorRR'].forEach(k => {
    let m = cache[k];
    if (!m) { const uuid = cfg.parts[k]; m = uuid ? carObj.getObjectByProperty('uuid', uuid) : null; }
    if (!m) return;
    if (m.userData._doorBaseY === undefined) m.userData._doorBaseY = m.rotation.y;
    const side = (k === 'doorFL' || k === 'doorRL') ? 1 : -1;   // chap/o'ng teskari ochiladi
    _tweenDoor(m, m.userData._doorBaseY + (open ? side * 0.9 : 0));
  });
};

// ── Qismni bosганда — mashina roliga biriktirish (inspektorда) ──
function _findCarAncestor(o) {
  let n = o;
  while (n) {
    if (n.userData && (n.userData.entityType === 'car' || n.userData._entityMode === 'vehicle' ||
        n.userData.isCar || n.userData._carCfg)) return n;
    n = n.parent;
  }
  return null;
}
window._glbCarPartUI = function(o) {
  if (!o || !o.userData || !o.userData._glbPart) return '';
  const car = _findCarAncestor(o);
  if (!car) return '';
  const cfg = window._getCarCfg ? window._getCarCfg(car) : car.userData._carCfg;
  if (!cfg) return '';
  cfg.parts = cfg.parts || {};
  let curRole = '';
  for (const k in cfg.parts) { if (cfg.parts[k] === o.uuid) { curRole = k; break; } }
  const opts = '<option value="">— belgilanmagan —</option>' +
    _CAR_ROLES.map(([key, label]) => `<option value="${key}" ${curRole===key?'selected':''}>${label}</option>`).join('');
  return `
    <div class="comp-block" style="border-color:rgba(0,180,255,.35);background:rgba(0,180,255,.04)">
      <div class="comp-title" style="color:#00b4ff"><span class="tag" style="background:rgba(0,180,255,.15);color:#00b4ff">🚗</span>Mashina qismi sifatida belgilash</div>
      <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 6px">Bu qismni rolga biriktiring — dvijok uni taniydi (g'ildirak aylanadi, fara yonadi, eshik ochiladi).</div>
      <div class="fr">
        <span class="fl">Rol</span>
        <select onchange="window._glbAssignRole('${car.userData.id}','${o.uuid}',this.value)" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none">
          ${opts}
        </select>
      </div>
      ${curRole?`<div style="font-size:9px;color:#00b4ff;padding:4px 0 0">✓ Belgilangan: ${(_CAR_ROLES.find(r=>r[0]===curRole)||[])[1]||curRole}</div>`:''}
    </div>`;
};
window._glbAssignRole = function(carId, uuid, role) {
  const car = (typeof objects !== 'undefined') ? objects.find(x => x.userData && String(x.userData.id) === String(carId)) : null;
  if (!car) return;
  const cfg = window._getCarCfg ? window._getCarCfg(car) : car.userData._carCfg;
  if (!cfg) return;
  cfg.parts = cfg.parts || {};
  for (const k in cfg.parts) { if (cfg.parts[k] === uuid) delete cfg.parts[k]; }   // eski rolni tozalaymiz
  if (role) cfg.parts[role] = uuid;
  car.userData._carPartCache = null;
  if (window.log) log(`🚗 Qism "${role || '—'}" roliga belgilandi`, 'lok');
  if (typeof updateInspector === 'function') updateInspector();
};
