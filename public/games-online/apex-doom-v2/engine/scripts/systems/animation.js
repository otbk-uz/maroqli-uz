// ============================================================
// BLENDER ANIMATION IMPORT — To'g'ridan GLB yuklab animatsiya
// Tuzatilgan:
//   1. pauseBlenderAnim — _userData → userData fix
//   2. window.showAnimPanelForSelected — tanlangan ob'ekt uchun
//   3. window.tlUpdate — main-loop chaqiruvi uchun
// ============================================================

window.importBlenderAnim = function() {
  const old = document.getElementById('blender-anim-panel');
  if (old) { old.remove(); return; }
  const panel = document.createElement('div');
  panel.id = 'blender-anim-panel';
  panel.classList.add('ui-modal');
  panel.style.cssText='border:1px solid var(--accent2);min-width:340px';
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent2);letter-spacing:2px">🎬 BLENDER ANIMATSIYA</span>
      <button onclick="document.getElementById('blender-anim-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;line-height:1;padding:0 4px">✕</button>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:10px;line-height:1.7;font-family:'Share Tech Mono',monospace">
      Blenderdan: File → Export → glTF 2.0<br>
      ✅ "Include → Selected Objects"<br>
      ✅ "Animation → Include Animation"<br>
      Format: .glb yoki .gltf
    </div>
    <button onclick="doImportBlenderAnim()" style="width:100%;background:rgba(255,107,53,.1);border:1px dashed rgba(255,107,53,.4);color:var(--accent2);font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;padding:12px;border-radius:4px;cursor:pointer;margin-bottom:8px">
      📂 GLB / GLTF Fayl Tanlash
    </button>
    <div id="anim-import-log" style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-height:24px;padding:4px 6px;background:var(--bg);border-radius:3px;border:1px solid var(--border)">Fayl tanlanmadi...</div>
  `;
  document.body.appendChild(panel);
};

window.doImportBlenderAnim = function() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.glb,.gltf';
  inp.onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const logEl = document.getElementById('anim-import-log');
    if(logEl) logEl.textContent = '⏳ Yuklanmoqda: '+file.name+'...';

    const reader = new FileReader();
    reader.onload = ev => {
      const _glbAB = ev.target.result;   // ⚠ xom baytlar — saqlash uchun
      if(!THREE.GLTFLoader) { log('❌ GLTFLoader topilmadi','le'); return; }
      const loader = getGLTFLoader();
      loader.parse(ev.target.result, '', gltf => {
        const modelScene = gltf.scene;
        const name = file.name.replace(/\.(glb|gltf)$/i,'');

        // Auto scale
        const box = new THREE.Box3().setFromObject(modelScene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if(maxDim > 0.01) modelScene.scale.setScalar(3 / maxDim);

        // Center at origin
        const center = box.getCenter(new THREE.Vector3());
        modelScene.position.sub(center.multiplyScalar(3/maxDim));

        modelScene.traverse(ch => {
          if(ch.isMesh||ch.isSkinnedMesh) { ch.castShadow=true; ch.receiveShadow=true; }
        });

        // Wrapper group
        const group = new THREE.Group();
        group.userData = { id:++objIdC, name:'Blender: '+name, type:'GLB', isGLB:true };
        // ⚠ XOM BAYTLAR — busiz model sahnaga YOZILMASDI: `isGLB` bor,
        //   lekin `_glbBuffer` yo'q → saqlovchi `models/` ga hech nima
        //   qo'yolmasdi va yuklashda kub bo'lib qaytardi.
        //   (Klaviatura muharririga import qilingan animatsiyalar ham
        //    shu yo'ldan o'tadi.)
        group.userData._glbBuffer = _glbAB;
        group.add(modelScene);
        scene.add(group);
        objects.push(group);
        addPhysicsBody(group, {isStatic:true});

        // Animatsiyalar
        let animInfo = 'Animatsiya yo\'q';
        if(gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(modelScene);
          const clips = gltf.animations;
          const actions = clips.map(clip => {
            const a = mixer.clipAction(clip);
            a.loop = THREE.LoopRepeat;
            return a;
          });
          actions[0].play();
          group.userData._mixer   = mixer;
          group.userData._clips   = clips;
          group.userData._actions = actions;
          group.userData._activeAnim   = 0;
          group.userData._modelScene   = modelScene;
          animInfo = clips.length + ' ta anim: ' + clips.map(c=>c.name).join(', ');
          // Anim panel
          setTimeout(()=>showBlenderAnimPanel(group), 300);
        }

        // Skeleton helper
        let hasBones = false;
        modelScene.traverse(ch => { if(ch.isSkinnedMesh) hasBones=true; });
        if(hasBones) {
          const skelH = new THREE.SkeletonHelper(modelScene);
          skelH.visible = false;
          group.add(skelH);
          group.userData._skelHelper = skelH;
        }

        updateHierarchy(); updateStats();
        selectObject(group);
        if (window.BoneRig) { setTimeout(() => window.BoneRig.autoExpose(group), 350); }  // suyaklarni ko'rsat
        log(`🎬 ${name} yuklandi — ${animInfo}`, 'lok');
        if(logEl) logEl.textContent = '✅ ' + animInfo;
        document.getElementById('blender-anim-panel')?.remove();
      }, err => {
        log('❌ GLB yuklash xatosi: '+err,'le');
        if(logEl) logEl.textContent = '❌ Xato: '+err;
      });
    };
    reader.readAsArrayBuffer(file);
  };
  inp.click();
};

function showBlenderAnimPanel(obj) {
  const old = document.getElementById('blender-anim-ctrl');
  if(old) old.remove();
  const clips   = obj.userData._clips   || [];
  const actions = obj.userData._actions || [];
  if(!clips.length) return;

  const panel = document.createElement('div');
  panel.id = 'blender-anim-ctrl';
  panel.style.cssText = `
    position:fixed; bottom:170px; left:50%; transform:translateX(-50%);
    background:var(--panel); border:1px solid var(--accent2);
    border-radius:6px; padding:10px 14px; z-index:9998;
    box-shadow:0 8px 24px rgba(0,0,0,.7); min-width:360px;
    font-family:'Rajdhani',sans-serif; max-width:90vw;
  `;

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent2);letter-spacing:1px">🎬 ${obj.userData.name}</span>
      <button onclick="document.getElementById('blender-anim-ctrl').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer">✕</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
  `;
  clips.forEach((clip, i) => {
    html += `<button id="banim-btn-${i}" onclick="playBlenderAnim(${i})"
      style="background:${i===0?'rgba(255,107,53,.15)':'rgba(255,255,255,.05)'};
      border:1px solid ${i===0?'var(--accent2)':'var(--border)'};
      color:${i===0?'var(--accent2)':'var(--muted)'};
      font-family:'Share Tech Mono',monospace;font-size:9px;padding:4px 10px;
      border-radius:3px;cursor:pointer;transition:all .15s">
      ${i===0?'⏸':'▶'} ${clip.name}
    </button>`;
  });
  html += `</div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:60px">Tezlik</span>
      <input type="range" id="banim-speed" min="0.1" max="3" step="0.05" value="1" style="flex:1"
        oninput="setBlenderAnimSpeed(parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);min-width:34px">1.00x</span>
    </div>
    <div style="display:flex;gap:4px">
      <button onclick="pauseBlenderAnim()" style="flex:1;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:11px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">⏸ Pauza</button>
      <button onclick="resetBlenderAnim()" style="flex:1;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:11px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">⏮ Reset</button>
    </div>
  `;
  panel.innerHTML = html;
  document.body.appendChild(panel);
}

window.playBlenderAnim = function(idx) {
  const obj = window.selectedObj || window.sel;
  if (!obj || !obj.userData._actions) return;
  const actions = obj.userData._actions;
  const clips   = obj.userData._clips || [];
  actions.forEach((a,i) => {
    if(i===idx) { a.paused=false; a.play(); }
    else { a.stop(); }
  });
  obj.userData._activeAnim = idx;
  // UI yangilash
  clips.forEach((_,i)=>{
    const btn = document.getElementById('banim-btn-'+i);
    if(!btn) return;
    btn.style.background   = i===idx?'rgba(255,107,53,.15)':'rgba(255,255,255,.05)';
    btn.style.borderColor  = i===idx?'var(--accent2)':'var(--border)';
    btn.style.color        = i===idx?'var(--accent2)':'var(--muted)';
    btn.textContent        = (i===idx?'⏸ ':'▶ ') + clips[i].name;
  });
  log(`🎬 Animatsiya: ${clips[idx]?.name}`, 'lok');
};

// ── FIX: _userData → userData ──────────────────────────────
window.pauseBlenderAnim = function() {
  const obj = window.selectedObj || window.sel;
  if (!obj?.userData?._actions) return;
  obj.userData._actions.forEach(a => { a.paused = !a.paused; });
};

window.resetBlenderAnim = function() {
  const obj = window.selectedObj || window.sel;
  if (!obj?.userData?._actions) return;
  obj.userData._actions.forEach(a => { a.stop(); a.reset(); a.play(); });
};

window.setBlenderAnimSpeed = function(spd) {
  const obj = window.selectedObj || window.sel;
  if (!obj?.userData?._mixer) return;
  obj.userData._mixer.timeScale = spd;
};

// ── YANGI: Tanlangan ob'ekt uchun anim panelni ochish ──────
// Inspector yoki hierarchy'dan ob'ekt tanlanganida chaqiring:
// showAnimPanelForSelected()
window.showAnimPanelForSelected = function() {
  const obj = window.selectedObj || window.sel;
  if (!obj) {
    if (typeof log === 'function') log('⚠ Avval ob\'ekt tanlang!', 'lw');
    return;
  }
  if (!obj.userData?._clips?.length) {
    if (typeof log === 'function') log('⚠ Tanlangan ob\'ektda animatsiya yo\'q', 'lw');
    return;
  }
  showBlenderAnimPanel(obj);
};

// ── YANGI: tlUpdate — main-loop.js chaqiruvi uchun ─────────
// main-loop.js da "tlUpdate(delta)" chaqiriladi.
// Bu funksiya bo'lmasa JS xatosi chiqadi va butun animate() to'xtaydi.
// GLB mixer update allaqachon main-loop.js pastida bor,
// shuning uchun bu yerda faqat xatolikni oldini olamiz.
window.tlUpdate = window.tlUpdate || function(delta) {
  // TimelineSystem o'z RAF loop'ida ishlaydi — qo'shimcha narsa shart emas.
  // Agar TimelineSystem mixer'larni boshqarsa, shu yerga qo'shish mumkin.
};

// ── RMB + WASD/Q/E — Kamera erkin yurishi ──────────────────
// O'ng tugma ushlab + WASD: oldinga/orqaga/chap/o'ng
// O'ng tugma ushlab + Q: pastga, E: tepaga
// Shift: tez, Space: sekin
let rmbHeld = false;
const rmbMoveSpeed = 8;

canvas.addEventListener('mousedown', e => {
  if (e.button === 2) { rmbHeld = true; isOrbiting = true; orbitStart = {x:e.clientX, y:e.clientY}; }
});
document.addEventListener('mouseup', e => {
  if (e.button === 2) { rmbHeld = false; isOrbiting = false; }
});

function updateRmbCameraMove(delta) {
  if (PlayerController.obj || isPlaying) return;
  if (!rmbHeld || camMode === 'fps') return;
  const shiftFast = fpsKeys['ShiftLeft'] || fpsKeys['ShiftRight'];
  const spaceSlow = fpsKeys['Space'];
  const mult = shiftFast ? 3 : spaceSlow ? 0.25 : 1;
  const s = rmbMoveSpeed * delta * mult;

  const fwd   = new THREE.Vector3(-Math.sin(spherical.theta), 0, -Math.cos(spherical.theta));
  const right = new THREE.Vector3( Math.cos(spherical.theta), 0, -Math.sin(spherical.theta));

  if (fpsKeys['KeyW'] || fpsKeys['ArrowUp'])    { orbitTarget.addScaledVector(fwd,  s); }
  if (fpsKeys['KeyS'] || fpsKeys['ArrowDown'])  { orbitTarget.addScaledVector(fwd, -s); }
  if (fpsKeys['KeyA'] || fpsKeys['ArrowLeft'])  { orbitTarget.addScaledVector(right,-s); }
  if (fpsKeys['KeyD'] || fpsKeys['ArrowRight']) { orbitTarget.addScaledVector(right, s); }
  if (fpsKeys['KeyQ']) { orbitTarget.y -= s; }
  if (fpsKeys['KeyE']) { orbitTarget.y += s; }

  updateCamera();
}