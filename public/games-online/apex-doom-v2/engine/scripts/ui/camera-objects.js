// ============================================================
// CAMERA OBJECTS — Sahnaga kamera qo'shish
// ============================================================
let camObjIdC = 0;

function addCameraObject() {
  const cam = _buildCameraMesh();
  cam.userData = {
    id: 'cam_' + (++camObjIdC),
    name: 'Kamera ' + camObjIdC,
    type: 'Kamera',
    isCamera: true,
    fov: 60, near: 0.1, far: 100,
    // 📷 Feed aylantirish — KAMERANING xususiyati. PC feed shu qiymatlarni
    //    o'qiydi. Faqat ekrandagi tasvirga ta'sir qiladi, kameraning
    //    haqiqiy ko'rinishiga emas.
    camFlipX: false, camFlipY: false,
    _isActive: false,
  };

  cam.position.copy(camera.position);
  cam.rotation.copy(camera.rotation);

  scene.add(cam);
  objects.push(cam);

  addPhysicsBody(cam, { isStatic: true, radius: 0.4 });

  updateHierarchy();
  selectObject(cam);
  updateStats();
  log('🎥 ' + cam.userData.name + ' qo\'shildi — siljitish uchun W/E/R gizmo', 'lok');
  return cam;
}

// ── 📷 Kamera modeli (eski ko'rinish — binafsha korpus + frustum) ──
//  addCameraObject va restoreCameraObject IKKALASI shundan foydalanadi.
//  ⚠ Funksiya nomi `_buildCameraMesh` — save-load va PC feed shunga tayanadi.
function _buildCameraMesh() {
  const camGeo = new THREE.BoxGeometry(0.45, 0.32, 0.55);
  const camMat = new THREE.MeshStandardMaterial({
    color: 0xcc88ff, roughness: 0.3, metalness: 0.6,
    emissive: new THREE.Color(0xcc88ff).multiplyScalar(0.08),
  });
  const mesh = new THREE.Mesh(camGeo, camMat);
  mesh.castShadow = true;

  // Kichik frustum — vizual ko'rsatkich (kamera qayoqqa qarayotgani)
  const frustumPts = [
    -0.18,-0.12,-0.28,  0.18,-0.12,-0.28,
     0.18,-0.12,-0.28,  0.18, 0.12,-0.28,
     0.18, 0.12,-0.28, -0.18, 0.12,-0.28,
    -0.18, 0.12,-0.28, -0.18,-0.12,-0.28,
    -0.22,-0.16,-0.27, -0.18,-0.12,-0.28,
     0.22,-0.16,-0.27,  0.18,-0.12,-0.28,
     0.22, 0.16,-0.27,  0.18, 0.12,-0.28,
    -0.22, 0.16,-0.27, -0.18, 0.12,-0.28,
  ];
  const frustGeo = new THREE.BufferGeometry();
  frustGeo.setAttribute('position', new THREE.Float32BufferAttribute(frustumPts, 3));
  const frustLine = new THREE.LineSegments(frustGeo,
    new THREE.LineBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.7 }));
  frustLine.raycast = () => {};
  mesh.add(frustLine);
  return mesh;
}

// ── 📷 Saqlangan kamerani tiklaydi ──────────────────────────
//  save-load `type:'Kamera'` ni PRIMITIVES da topolmay KUB qilib
//  yaratadi; bu yordamchi to'g'ri kamera modeli bilan almashtiradi.
function restoreCameraObject(mesh) {
  const cam = _buildCameraMesh();
  cam.position.copy(mesh.position);
  cam.rotation.copy(mesh.rotation);
  cam.scale.copy(mesh.scale);
  cam.userData = mesh.userData;   // id, name, fov, near, far, camFlipX/Y ...
  // Eski saqlangan kameralarда flip maydoni bo'lmasligi mumkin — default
  if (cam.userData.camFlipX === undefined) cam.userData.camFlipX = false;
  if (cam.userData.camFlipY === undefined) cam.userData.camFlipY = false;
  return cam;
}

function buildCamObjInspector(o) {
  const ic=$('inspector-content'); if(!ic) return;
  const p=o.position, isActive=o.userData._isActive;
  ic.innerHTML=`
    <div class="comp-block">
      <div class="comp-title">
        <span class="tag" style="background:rgba(var(--accent4-rgb),.12);color:var(--accent4)">CAM</span>
        ${o.userData.name}
        ${isActive?'<span style="font-size:8px;background:rgba(var(--accent4-rgb),.3);color:var(--accent4);padding:1px 5px;border-radius:2px;margin-left:3px">● AKTIV</span>':''}
      </div>
      <div class="fr"><span class="fl">FOV</span>
        <input type="range" min="10" max="120" value="${o.userData.fov||60}" style="flex:1" oninput="if(selectedObj)selectedObj.userData.fov=+this.value;this.nextSibling.textContent=this.value+'°'">
        <span class="cam-val">${o.userData.fov||60}°</span>
      </div>
      <div class="fr"><span class="fl">Near</span><input class="fv" value="${o.userData.near||0.1}" style="width:44px" oninput="if(selectedObj)selectedObj.userData.near=+this.value"></div>
      <div class="fr"><span class="fl">Far</span><input class="fv" value="${o.userData.far||100}" style="width:44px" oninput="if(selectedObj)selectedObj.userData.far=+this.value"></div>
    </div>
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent-rgb),.12);color:var(--accent)">FEED</span>Ekran tasviri (CCTV)</div>
      <div style="display:flex;gap:4px;margin-top:4px">
        <button onclick="camObjToggleFlip('camFlipX')" style="flex:1;
          background:${o.userData.camFlipX?'rgba(var(--accent-rgb),.15)':'transparent'};
          border:1px solid ${o.userData.camFlipX?'var(--accent)':'var(--border)'};
          color:${o.userData.camFlipX?'var(--accent)':'var(--muted)'};padding:6px 3px;border-radius:3px;
          cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700">⇄ O'ng-chap</button>
        <button onclick="camObjToggleFlip('camFlipY')" style="flex:1;
          background:${o.userData.camFlipY?'rgba(var(--accent-rgb),.15)':'transparent'};
          border:1px solid ${o.userData.camFlipY?'var(--accent)':'var(--border)'};
          color:${o.userData.camFlipY?'var(--accent)':'var(--muted)'};padding:6px 3px;border-radius:3px;
          cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700">⇅ Yuqori-past</button>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:4px;font-family:'Share Tech Mono',monospace">
        Bu kamera PC ekraniga (CCTV) uzatilganда tasvirni aylantiradi.
        Kamera teskari o'rnatilgan bo'lsa (oyog'i osmonga), ⇅ bilan to'g'rilang.<br>
        <span style="color:var(--border)">Faqat feed'ga ta'sir qiladi — kameraning haqiqiy
        ko'rinishiga emas.</span>
      </div>
    </div>
    ${(() => {
      const vm = o.userData.camViewMode || 'keyframe';
      const tgt = o.userData.camLookTarget || 'player';
      const mkBtn = (m, label, col) => `<button onclick="camObjSetView('${m}')"
        style="background:${vm===m?col.bg:'transparent'};border:1px solid ${vm===m?col.bd:'var(--border)'};
               color:${vm===m?col.fg:'var(--muted)'};padding:6px 3px;border-radius:3px;cursor:pointer;
               font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700">${label}</button>`;
      const objOpts = objects.filter(x => x.userData && !x.userData.isCamera && x.userData.id !== o.userData.id)
        .map(x => `<option value="obj:${x.userData.id}" ${tgt===('obj:'+x.userData.id)?'selected':''}>🎯 ${x.userData.name}</option>`).join('');
      return `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent-rgb),.12);color:var(--accent)">VIEW</span>Ko'rish rejimi</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:4px">
        ${mkBtn('keyframe','◆ Keyframe',{bg:'rgba(var(--accent-rgb),.15)',bd:'var(--accent)',fg:'var(--accent)'})}
        ${mkBtn('lookat','🔒 Lock',{bg:'rgba(var(--accent2-rgb),.15)',bd:'var(--accent2)',fg:'var(--accent2)'})}
        ${mkBtn('absolute','🎮 Absolute',{bg:'rgba(var(--accent3-rgb),.15)',bd:'var(--accent3)',fg:'var(--accent3)'})}
      </div>
      ${vm==='absolute' && window.KinoCamSystem ? KinoCamSystem.camObjHTML(o) : ''}
      ${vm==='lookat' ? `
      <div class="fr" style="margin-top:5px"><span class="fl" style="font-size:9px">Maqsad</span>
        <select class="fv" onchange="camObjSetLookTarget(this.value)" style="width:auto">
          <option value="player" ${tgt==='player'?'selected':''}>🧍 Oyinchi</option>
          <option value="car"    ${tgt==='car'?'selected':''}>🚗 Avto/mashina</option>
          ${objOpts}
        </select>
      </div>` : ''}
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-top:5px;font-family:'Share Tech Mono',monospace">
        ${vm==='absolute'
          ? '🎮 Kamera timeline yo\'lida yuradi, lekin o\'yinchi ko\'zdan <b style="color:var(--accent3)">erkin buriladi</b> (sichqoncha).'
          : vm==='lookat'
            ? '🔒 Kamera timeline yo\'lida yuradi, lekin doim <b style="color:var(--accent2)">maqsadga qaraydi</b> (o\'yinchi/avto).'
            : '◆ Kamera pozitsiya va burilishi to\'liq keyframe bo\'yicha.'}
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag3">URILISH</span>Kamera urilishi</div>
      <div class="deform-grid" style="grid-template-columns:1fr 1fr;margin-top:4px">
        <button class="deform-btn ${(o.userData.colliderMode||'inline')==='block'?'active-mode':''}" onclick="setColliderMode('block')">🧱 Block</button>
        <button class="deform-btn ${(o.userData.colliderMode||'inline')==='inline'?'active-mode':''}" onclick="setColliderMode('inline')">👻 Inline</button>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-top:5px;font-family:'Share Tech Mono',monospace">
        <b>Block</b> — kamera qattiq, o'yinchi/obyektlar urilib to'xtaydi.<br>
        <b>Inline</b> — kamera orqasidan bemalol o'tib ketiladi (default).
      </div>
    </div>`;
    })()}
    <div class="comp-block">
      <div class="comp-title"><span class="tag">TRS</span>Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" id="px" value="${p.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="py" value="${p.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="pz" value="${p.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
    </div>
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent4-rgb),.12);color:var(--accent4)">ACT</span>Amallar</div>
      <button class="action-btn" style="background:${isActive?'rgba(var(--accent4-rgb),.25)':'rgba(var(--accent4-rgb),.08)'};border-color:rgba(var(--accent4-rgb),.4);color:var(--accent4)" onclick="camObjActivate()">
        ${isActive?'⏹ Kamerani o\'chir':'🎥 Faollash (mesh = kamera)'}
      </button>

      ${(() => {
        const pil = (typeof CamPilot !== 'undefined') && CamPilot.isOn() && CamPilot.target() === o;
        return `
      <button class="action-btn" onclick="window.camPilotToggle()" style="width:100%;margin-top:5px;
        background:${pil?'rgba(var(--accent3-rgb),.25)':'rgba(var(--accent3-rgb),.08)'};
        border-color:${pil?'var(--accent3)':'rgba(var(--accent3-rgb),.4)'};color:var(--accent3);font-size:11px;padding:6px">
        ${pil?'⏹ Pilotdan chiqish (Esc)':'🕹 Boshqarish (pointer lock)'}
      </button>
      <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.7;font-family:'Share Tech Mono',monospace">
        <b style="color:var(--accent3)">Sichqoncha</b> qaratadi · <b style="color:var(--accent3)">WASD</b> suradi ·
        <b style="color:var(--accent3)">Q/E</b> balandlik · <b style="color:var(--accent3)">Shift</b> tez<br>
        <b style="color:var(--accent2)">←&nbsp;→</b> vaqt · <b style="color:var(--accent2)">↑</b> key qo'yish ·
        <b style="color:var(--accent2)">↓</b> key o'chirish · <b style="color:var(--accent2)">Space</b> ijro ·
        <b style="color:var(--accent2)">Esc</b> chiqish<br>
        <span style="color:var(--border)">Pilot vaqtida kamera avtomatik faollashadi va <b>keyframe</b> rejimiga o'tadi —
        aks holda sichqoncha bilan qaraganingiz ko'rinmasdi.</span>
      </div>`;
      })()}


      <button class="action-btn" style="margin-top:3px" onclick="camObjCapture()">📍 Hozirgi pozitsiyani olish</button>
      <button class="action-btn" style="background:rgba(var(--accent-rgb),.06);border-color:rgba(var(--accent-rgb),.2);margin-top:3px" onclick="camObjAddKF()">◆ Timeline KF qo\'sh</button>
      <button class="action-btn" style="margin-top:3px" onclick="camObjScreenshot()">📸 Screenshot</button>
      <button class="action-btn del-btn" style="margin-top:3px" onclick="deleteSel()">✕ O\'chirish</button>
    </div>`;
}

window.camObjFov = function(v) {
  if(selectedObj) selectedObj.userData.fov=+v;
};
window.camObjToggleFlip = function(key) {
  if(!selectedObj || !selectedObj.userData.isCamera) return;
  selectedObj.userData[key] = !selectedObj.userData[key];
  const on = selectedObj.userData[key];
  const label = key === 'camFlipX' ? "o'ng-chap" : 'yuqori-past';
  log('📷 Feed aylantirish (' + label + '): ' + (on ? 'yoniq' : "o'chiq"), 'lok');
  // ⚠ PC feed har kadr src.userData dan o'qiydi — darhol qo'llanadi.
  //   Faqat inspektor tugmasi holatini yangilaymiz.
  updateInspector();
};
window.camObjSetView = function(mode) {
  if(!selectedObj || !selectedObj.userData.isCamera) return;
  selectedObj.userData.camViewMode = mode;
  if ((mode === 'absolute' || mode === 'lookat') && window._resetAbsCamLook) window._resetAbsCamLook();
  const names = { keyframe:'Keyframe', lookat:'Lock (maqsadga qaraydi)', absolute:'Absolute (erkin burilish)' };
  log('🎥 Ko\'rish rejimi: ' + (names[mode]||mode), 'lok');
  updateInspector();
};
window.camObjSetLookTarget = function(v) {
  if(!selectedObj || !selectedObj.userData.isCamera) return;
  selectedObj.userData.camLookTarget = v;
};


// ══════════════════════════════════════════════════════════════
//  🕹 KAMERA PILOTI — pointer lock + FPS boshqaruv
// --------------------------------------------------------------
//  Kamera OBYEKTINI FPS kabi uchirasiz: sichqoncha qaratadi,
//  WASD suradi. Kamera faollashgani uchun uning ko'zidan ko'rasiz.
//
//  Strelkalar bilan Timeline boshqariladi — qo'lni klaviaturadan
//  olmasdan poza qo'yasiz:
//     ←  orqaga        →  oldinga
//     ↑  key QO'YADI   ↓  key O'CHIRADI
//     Space            Timeline ishga tushadi / to'xtaydi
//     Esc              chiqish
// ══════════════════════════════════════════════════════════════
const CamPilot = (() => {
  'use strict';

  let on = false, obj = null, prevMode = null;
  const keys = {};
  let SPEED = 6, SENS = 0.0022, STEP = 0.1;   // m/s, rad/px, s

  const _e = new THREE.Euler(0, 0, 0, 'YXZ');
  const _f = new THREE.Vector3(), _r = new THREE.Vector3();
  const _UP = new THREE.Vector3(0, 1, 0);

  const isOn = () => on;
  const target = () => obj;

  function _onMouse(e) {
    if (!on || !obj) return;
    _e.setFromQuaternion(obj.quaternion, 'YXZ');
    _e.y -= (e.movementX || 0) * SENS;
    _e.x -= (e.movementY || 0) * SENS;
    _e.x = Math.max(-1.55, Math.min(1.55, _e.x));   // tepa/pastga qarashni cheklash
    _e.z = 0;
    obj.quaternion.setFromEuler(_e);
  }

  function _onKeyDown(e) {
    if (!on) return;
    // ⚠ `stopImmediatePropagation` SHART — keybindings.js ham strelka/Space
    //   ni tinglaydi (obyekt surish, o'yin boshlash). Faqat preventDefault
    //   qilsak ular baribir ishlab, pilot vaqtida obyektlarni surib
    //   yuborardi.
    const _eat = () => { e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); };

    // ── Timeline strelkalari ──
    //  ⚠ `tlPlay` / `tlSeek` / `tlAddKeyframe` / `tlDeleteKeyframe`
    //    `TimelineSystem` METODI EMAS! Ular `timeline.js` ning init()
    //    ichida `Object.assign(window, {...})` orqali GLOBAL qilib
    //    eksport qilinadi. `TimelineSystem` obyektida faqat `tracks`,
    //    `currentTime`, `duration`, `render`, `getSelectedObj` va h.k. bor.
    //    (Men ro'yxatni ko'rib `return {}` deb o'ylagandim — xato edi.)
    //  ⚠ Ular init() da yaratilgani uchun mavjudligini tekshiramiz.
    const T  = window.TimelineSystem;
    const _t = () => (T && typeof T.currentTime === 'number') ? T.currentTime : 0;

    if (e.code === 'ArrowLeft')  { _eat(); if (window.tlSeek) tlSeek(Math.max(0, _t() - STEP)); return; }
    if (e.code === 'ArrowRight') { _eat(); if (window.tlSeek) tlSeek(_t() + STEP); return; }
    if (e.code === 'ArrowUp')    { _eat(); if (window.tlAddKeyframe)    tlAddKeyframe();    return; }
    if (e.code === 'ArrowDown')  { _eat(); if (window.tlDeleteKeyframe) tlDeleteKeyframe(); return; }
    if (e.code === 'Space')      { _eat(); if (window.tlPlay)           tlPlay();           return; }
    if (e.code === 'Escape')     { _eat(); exit(); return; }
    keys[e.code] = true;
    // Harakat klavishlari o'yin/editorga o'tib ketmasin
    if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft'].includes(e.code)) _eat();
  }
  function _onKeyUp(e) { if (on) keys[e.code] = false; }

  function _onLockChange() {
    // Foydalanuvchi Esc bosib lock'dan chiqsa — rejimni ham yopamiz
    if (on && !document.pointerLockElement) exit();
  }

  function enter(o) {
    if (on) return false;
    if (!o || !o.userData || !o.userData.isCamera) { log('⚠ Kamera obyektini tanlang', 'lw'); return false; }
    const cv = document.getElementById('three-canvas');
    if (!cv) return false;

    obj = o; on = true;
    Object.keys(keys).forEach(k => delete keys[k]);

    // ⚠ Kamerani faollashtiramiz — uning ko'zidan ko'ramiz.
    //   `keyframe` rejimi shart: `absolute`/`lookat` da burilish
    //   obyektdan olinmaydi (o'yinchi offseti yoki nishon bosib ketadi),
    //   ya'ni sichqoncha bilan qaraganingiz ko'rinmasdi.
    prevMode = o.userData.camViewMode || 'keyframe';
    o.userData.camViewMode = 'keyframe';
    objects.forEach(x => { if (x.userData && x.userData.isCamera) x.userData._isActive = (x === o); });

    document.addEventListener('mousemove', _onMouse);
    document.addEventListener('keydown',   _onKeyDown, true);
    document.addEventListener('keyup',     _onKeyUp,   true);
    document.addEventListener('pointerlockchange', _onLockChange);
    try { cv.requestPointerLock(); } catch (e) {}

    log('🕹 Pilot: sichqoncha qaratadi, WASD suradi, Q/E balandlik', 'lok');
    log('   ← → vaqt | ↑ key qo\'yish | ↓ key o\'chirish | Space ijro | Esc chiqish', 'lok');
    if (typeof updateInspector === 'function') updateInspector();
    return true;
  }

  function exit() {
    if (!on) return;
    on = false;
    document.removeEventListener('mousemove', _onMouse);
    document.removeEventListener('keydown',   _onKeyDown, true);
    document.removeEventListener('keyup',     _onKeyUp,   true);
    document.removeEventListener('pointerlockchange', _onLockChange);
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}

    if (obj && prevMode) obj.userData.camViewMode = prevMode;
    // ⚠ Kamerani o'chiramiz — aks holda editor kamerasi qulflanib qolardi
    //   (main-loop faol kameraning pozitsiyasini har kadr bosib turadi).
    if (obj) obj.userData._isActive = false;
    obj = null; prevMode = null;
    Object.keys(keys).forEach(k => delete keys[k]);
    log('🕹 Pilot: chiqildi', 'lw');
    if (typeof updateInspector === 'function') updateInspector();
  }

  // Main-loop har kadr chaqiradi
  function update(delta) {
    if (!on || !obj) return;
    const sp = SPEED * (keys['ShiftLeft'] ? 3 : 1) * Math.min(delta, 0.1);
    let moved = false;
    _f.set(0, 0, -1).applyQuaternion(obj.quaternion);
    _r.crossVectors(_f, _UP).normalize().multiplyScalar(-1);
    if (keys['KeyW']) { obj.position.addScaledVector(_f,  sp); moved = true; }
    if (keys['KeyS']) { obj.position.addScaledVector(_f, -sp); moved = true; }
    if (keys['KeyA']) { obj.position.addScaledVector(_r,  sp); moved = true; }
    if (keys['KeyD']) { obj.position.addScaledVector(_r, -sp); moved = true; }
    if (keys['KeyE']) { obj.position.y += sp; moved = true; }
    if (keys['KeyQ']) { obj.position.y -= sp; moved = true; }
    if (moved && typeof requestShadowUpdate === 'function') requestShadowUpdate();
  }

  function setSpeed(v) { SPEED = Math.max(0.5, Math.min(50, v || 6)); }
  function setSens(v)  { SENS  = Math.max(0.0005, Math.min(0.01, v || 0.0022)); }
  function setStep(v)  { STEP  = Math.max(0.01, Math.min(2, v || 0.1)); }

  return { enter, exit, update, isOn, target, setSpeed, setSens, setStep };
})();
window.CamPilot = CamPilot;

window.camPilotToggle = function () {
  if (CamPilot.isOn()) { CamPilot.exit(); return; }
  if (!selectedObj || !selectedObj.userData.isCamera) { log('⚠ Kamera obyektini tanlang', 'lw'); return; }
  CamPilot.enter(selectedObj);
};

window.camObjActivate = function() {
  if(!selectedObj||!selectedObj.userData.isCamera) return;
  const wasActive = selectedObj.userData._isActive;
  // Deactivate all cameras first
  objects.forEach(o=>{ if(o.userData.isCamera){ o.userData._isActive=false; if(o.material) o.material.emissive.setScalar(0.05); } });

  if (!wasActive) {
    // Activate this one
    selectedObj.userData._isActive = true;
    if(selectedObj.material) selectedObj.material.emissive.set(0xcc88ff).multiplyScalar(0.3);
    // Mesh yashiriladi — kamera o'z tanasini ko'rmasin
    selectedObj.visible = false;
    if ((selectedObj.userData.camViewMode === 'absolute' || selectedObj.userData.camViewMode === 'lookat') && window._resetAbsCamLook) window._resetAbsCamLook();
    // Snap real camera to this mesh right now
    camera.position.copy(selectedObj.position);
    // Burilish kvaternion orqali — Euler order mos kelmasa qiyshiqlik chiqmasin
    camera.quaternion.copy(selectedObj.quaternion);
    camera.fov = selectedObj.userData.fov || 60;
    camera.near = selectedObj.userData.near || 0.1;
    camera.far = selectedObj.userData.far || 100;
    camera.updateProjectionMatrix();
    camMode = 'fixed';
    log('🎥 '+selectedObj.userData.name+' AKTIV — mesh harakat qilsa kamera ham harakat qiladi','lok');
  } else {
    // Deactivate — mesh qayta ko'rinadi
    selectedObj.visible = true;
    if(selectedObj.material) selectedObj.material.emissive.setScalar(0.05);
    camMode = 'orbit';
    setCamMode('orbit');
    log('🎥 '+selectedObj.userData.name+' o\'chirildi — orbit rejimiga qaytildi','lw');
  }
  updateInspector();
};
window.camObjCapture = function() {
  if(!selectedObj||!selectedObj.userData.isCamera) return;
  selectedObj.position.copy(camera.position);
  selectedObj.rotation.copy(camera.rotation);
  selectedObj.userData.fov=camera.fov;
  selectedObj.userData.near=camera.near;
  selectedObj.userData.far=camera.far;
  updateInspector();
  log('📍 Pozitsiya olindi','lok');
};
window.camObjAddKF = function() {
  if(!selectedObj) return;
  tlAddKeyframe();
};
window.camObjScreenshot = function() {
  if(!selectedObj||!selectedObj.userData.isCamera) return;
  const savedPos=camera.position.clone(), savedFov=camera.fov;
  const savedRot={x:camera.rotation.x,y:camera.rotation.y,z:camera.rotation.z};
  camObjActivate();
  renderer.setClearAlpha(1);              // shaffof fon → to'ldirilgan
  renderer.render(scene,camera);
  const url=renderer.domElement.toDataURL('image/png');
  renderer.setClearAlpha(0);
  const a=document.createElement('a');
  a.href=url; a.download='cam_'+camObjIdC+'.png'; a.click();
  camera.position.copy(savedPos);
  camera.rotation.set(savedRot.x,savedRot.y,savedRot.z);
  camera.fov=savedFov; camera.updateProjectionMatrix();
  log('📸 Screenshot ('+selectedObj.userData.name+')','lok');
};

// Patch updateInspector for camera objects

// Camera active track: apply position to real camera during timeline playback


function showKfPopup(mx,my,kf,isVis) {
  const pop=$('tl-kf-popup');
  if (!pop) return;
  const easeEl=$('kfp-ease'), tangentEl=$('kfp-tangent'), visEl=$('kfp-vis'), visRow=$('kfp-vis-row');
  if (isVis) {
    if (easeEl) easeEl.closest('.kfp-row').style.display='none';
    if (tangentEl) tangentEl.closest('.kfp-row').style.display='none';
    if (visRow) visRow.style.display='flex';
    if (visEl) visEl.value=String(kf.vis||0);
  } else {
    if (easeEl) { easeEl.closest('.kfp-row').style.display='flex'; easeEl.value=kf.ease||'smooth'; }
    if (tangentEl) { tangentEl.closest('.kfp-row').style.display='flex'; tangentEl.value=kf.tangent||'auto'; }
    if (visRow) visRow.style.display='none';
  }
  // Position popup near click
  const px=Math.min(mx, window.innerWidth-160);
  const py=Math.max(my-120, 60);
  pop.style.left=px+'px'; pop.style.top=py+'px'; pop.style.display='block';
}
document.addEventListener('click', e=>{
  const pop=$('tl-kf-popup');
  if (pop && !pop.contains(e.target) && !e.target.classList.contains('tl-kf') && !e.target.classList.contains('tl-kf-vis')) {
    pop.style.display='none';
  }
});

// ── EASING CURVE SVG POINTS ───────────────────────────────────
function tlEaseCurvePoints(ease, w) {
  const fn=EASINGS[ease]||EASINGS.smooth;
  const pts=[];
  const steps=16;
  for (let i=0;i<=steps;i++) {
    const t=i/steps;
    const y=fn(t);
    pts.push(`${(t*w).toFixed(1)},${(14-y*12).toFixed(1)}`);
  }
  return pts.join(' ');
}

function tlUpdate(delta) {
  if (typeof tlPlaying === 'undefined' || !tlPlaying) return;
  tlCurrent += delta;
  if (tlCurrent >= tlDuration) {
    // Agar hech bo'lmasa bitta track loop yoqilgan bo'lsa — cheksiz davom et
    const anyLoop = Object.values(tlTracks).some(tr => tr.loop);
    if (anyLoop) {
      // Loop yoqilgan track'lar tlApplyAll ichida o'z vaqtini loop qiladi
      // tlCurrent esa davom etaveradi (tlDuration dan oshib ketsa ham ishlaydi)
    } else {
      tlCurrent = tlDuration;
      tlPlaying = false;
      $('tl-play-btn').textContent = '▶';
      $('tl-play-btn').onclick = tlPlay;
    }
  }
  tlApplyAll(tlCurrent);
  const ph=$('tl-playhead');
  const lane=$('tl-scrubber-row');
  if (ph&&lane&&lane.clientWidth) ph.style.left=(Math.min(tlCurrent,tlDuration)/tlDuration*lane.clientWidth)+'px';
  const lbl=$('tl-time-lbl'); if(lbl) lbl.textContent=Math.min(tlCurrent,tlDuration).toFixed(2)+'s';
}
