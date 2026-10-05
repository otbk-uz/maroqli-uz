// ============================================================
//  CAMERA RIG SYSTEM  v1.0
// ------------------------------------------------------------
//  Kameraga uzluksiz "rig" effektlari — obyekt-kameraga ham,
//  GLOBAL o'yin kamerasiga ham ta'sir qiladi.
//
//  Camera
//  ├── Position / Rotation / Zoom  → mavjud transform + FOV
//  ├── Shake                       → CameraShakeSystem (alohida blok)
//  ├── Bob        ✔ yurish tebranishi (tezlikka bog'liq)
//  ├── Sway       ✔ turganda silliq tebranish
//  ├── Follow                      → (mavjud 3rd-person / fixed rejim)
//  ├── Collision                   → (keyingi bosqich)
//  ├── Dynamic FOV ✔ tezlikka qarab FOV kengayishi
//  ├── Motion Blur ✔ harakat blur (overlay)
//  ├── Cinematic  ✔ letterbox (kino chiziqlari) + grain
//  ├── Transition                  → (keyingi bosqich / fade API)
//  └── Special    ✔ doimiy roll (dutch tilt)
//
//  Qo'llash: renderer.render() monkey-patch — kamera pos+rot+FOV
//  faqat render paytida vaqtincha o'zgaradi (CameraShake / MotionFX
//  bilan qatlamlanadi). Cinematic va Blur — DOM overlay.
// ============================================================

window.CameraRigSystem = (() => {

  // ── Standart config ──────────────────────────────────────────
  function _defaultRig() {
    return {
      enabled:  true,
      bob:      { on: false, amp: 0.06, freq: 9,  side: 0.5 },
      sway:     { on: false, amp: 0.6 },
      dynFov:   { on: false, amount: 12, max: 22 },
      blur:     { on: false, amount: 1.0 },
      cinematic:{ on: false, bars: 0.12, grain: 0.0 },
      special:  { on: false, roll: 0 },
    };
  }

  // Global rig (main kamera uchun) — window'da saqlanadi
  window._camRigGlobal = window._camRigGlobal || _defaultRig();
  let _editGlobal = false;   // Inspector "Global" rejimida ochilganmi

  // ── Har frame yig'iladigan ofsetlar (render patch shundan foydalanadi) ──
  const _pos = { x: 0, y: 0, z: 0 };
  const _rot = { pitch: 0, yaw: 0, roll: 0 };
  let   _fov = 0;

  // Runtime holat
  let _bobPhase = 0;
  let _swayT = 0;
  let _lastPos = null;      // kamera oldingi pozitsiyasi (tezlik uchun)
  const _lastQuat = new THREE.Quaternion();
  let _haveQuat = false;
  let _fovSmooth = 0;
  let _blurSmooth = 0;

  // ── Aktiv kamera obyektining rig'ini olish (bo'lmasa global) ──
  // ── ⚠ RIG BO'LIM-BO'LIM BIRLASHADI, ALMASHMAYDI ─────────────
  //  Ilgari bu funksiya faol obyekt-kamera rigini topsa, GLOBAL
  //  rigni butunlay chetga surardi:
  //      if (active && active.userData.rig.enabled) return active.userData.rig;
  //
  //  ALOMAT: sahnada 🎬 Cinematic yoqiq (tepa-pastda qora chiziqlar),
  //    o'yinchi kameraga kiradi — chiziqlar YO'QOLADI. Chunki
  //    kameraning o'z rigida `cinematic.on = false`.
  //
  //  Bu noto'g'ri: kameraga kirish sahnaning umumiy ko'rinishini
  //  jimgina bekor qilmasligi kerak. Kamera faqat O'ZI ATAYLAB
  //  yoqqan bo'limlarni ustidan yozsin.
  //
  //  ⚠ "Ataylab yoqqan" — bu `section.on === true`. `false` esa
  //    "tegmayman" degani, "o'chir" emas. Aks holda har bir yangi
  //    kamera butun sahna effektlarini o'chirib tashlardi.
  function _effectiveRig() {
    const g = window._camRigGlobal;
    const gOn = (g && g.enabled) ? g : null;

    let cam = null;
    if (typeof objects !== 'undefined') {
      const active = objects.find(o => o.userData && o.userData.isCamera && o.userData._isActive);
      if (active && active.userData.rig && active.userData.rig.enabled) cam = active.userData.rig;
    }

    if (!cam) return gOn;
    if (!gOn) return cam;

    // Ikkalasi ham bor — bo'lim-bo'lim birlashtiramiz
    const out = {};
    const keys = new Set([...Object.keys(gOn), ...Object.keys(cam)]);
    for (const k of keys) {
      const cv = cam[k], gv = gOn[k];
      if (cv && typeof cv === 'object' && cv.on === true) { out[k] = cv; continue; }
      if (gv !== undefined) { out[k] = gv; continue; }
      out[k] = cv;
    }
    out.enabled = true;
    return out;
  }

  function _getObjRig(obj) {
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.rig) obj.userData.rig = _defaultRig();
    // eski configlarga yangi bo'limlar
    const r = obj.userData.rig, d = _defaultRig();
    for (const k in d) if (r[k] === undefined) r[k] = d[k];
    return obj.userData.rig;
  }

  // ══════════════════════════════════════════════════════════════
  //  UPDATE
  // ══════════════════════════════════════════════════════════════
  function update(delta) {
    if (!delta || delta < 0) delta = 0;
    _pos.x = _pos.y = _pos.z = 0;
    _rot.pitch = _rot.yaw = _rot.roll = 0;
    _fov = 0;

    const rig = _effectiveRig();
    const cam = (typeof camera !== 'undefined') ? camera : null;
    const playing = (typeof isPlaying !== 'undefined' && isPlaying);
    if (!rig || !cam) { _applyOverlays(0, 0, 0); return; }

    // Kamera tezligi (world pozitsiya deltasi)
    let speed = 0;
    const cp = cam.position;
    if (_lastPos) {
      const dx = cp.x - _lastPos.x, dy = cp.y - _lastPos.y, dz = cp.z - _lastPos.z;
      speed = (delta > 0) ? Math.sqrt(dx*dx + dy*dy + dz*dz) / delta : 0;
    } else _lastPos = { x: 0, y: 0, z: 0 };
    _lastPos.x = cp.x; _lastPos.y = cp.y; _lastPos.z = cp.z;

    // Burchak tezligi (motion blur uchun)
    let angSpeed = 0;
    if (_haveQuat) angSpeed = _lastQuat.angleTo(cam.quaternion) / Math.max(0.0001, delta);
    _lastQuat.copy(cam.quaternion); _haveQuat = true;

    // kamera "o'ng" va "yuqori" vektorlari (bob offseti uchun)
    const moving = speed > 0.35;

    // ── BOB (yurish tebranishi) — faqat play + harakatda ──
    if (rig.bob && rig.bob.on && playing && moving) {
      const sf = Math.min(1.6, speed / 5);
      _bobPhase += delta * (rig.bob.freq || 9) * (0.6 + sf);
      const amp = (rig.bob.amp || 0.06) * sf;
      const upY  = Math.sin(_bobPhase) * amp;
      const side = Math.cos(_bobPhase * 0.5) * amp * (rig.bob.side ?? 0.5);
      // world Y + kamera-o'ng bo'ylab yon
      _pos.y += upY;
      const right = _camRight(cam);
      _pos.x += right.x * side;
      _pos.z += right.z * side;
      _rot.roll += Math.sin(_bobPhase * 0.5) * 0.008 * sf;
    } else if (rig.bob && rig.bob.on) {
      _bobPhase *= 0.9;   // to'xtaganda so'nadi
    }

    // ── SWAY (turganda silliq tebranish) — play + deyarli qimirlamaganda ──
    if (rig.sway && rig.sway.on && (!moving)) {
      _swayT += delta;
      const I = rig.sway.amp || 0.6;
      _rot.yaw   += Math.sin(_swayT * 0.55)       * 0.020 * I;
      _rot.pitch += Math.sin(_swayT * 0.80 + 1.0) * 0.014 * I;
      _rot.roll  += Math.sin(_swayT * 0.42 + 0.5) * 0.010 * I;
    }

    // ── DYNAMIC FOV — tezlikka qarab FOV kengayadi ──
    if (rig.dynFov && rig.dynFov.on && playing) {
      const target = Math.min(rig.dynFov.max || 22, speed * (rig.dynFov.amount || 12) * 0.12);
      _fovSmooth += (target - _fovSmooth) * Math.min(1, delta * 5);
      _fov += _fovSmooth;
    } else if (_fovSmooth > 0.01) {
      _fovSmooth += (0 - _fovSmooth) * Math.min(1, delta * 5);
      _fov += _fovSmooth;
    }

    // ── SPECIAL — doimiy roll (dutch tilt) — edit'da ham ko'rinadi ──
    if (rig.special && rig.special.on && rig.special.roll) {
      _rot.roll += (rig.special.roll * Math.PI / 180);
    }

    // ── MOTION BLUR (overlay) — burchak/pozitsiya tezligiga qarab ──
    let blurAmt = 0;
    if (rig.blur && rig.blur.on) {
      const raw = (angSpeed * 1.2 + speed * 0.12) * (rig.blur.amount || 1);
      _blurSmooth += (raw - _blurSmooth) * Math.min(1, delta * 8);
      blurAmt = playing ? _blurSmooth : 0;
    } else _blurSmooth = 0;

    // ── CINEMATIC (letterbox + grain) ──
    let barsAmt = 0, grainAmt = 0;
    if (rig.cinematic && rig.cinematic.on) {
      barsAmt  = rig.cinematic.bars ?? 0.12;   // ekran balandligining ulushi
      grainAmt = rig.cinematic.grain ?? 0;
    }

    _applyOverlays(blurAmt, barsAmt, grainAmt);
  }

  const _rightTmp = new THREE.Vector3();
  function _camRight(cam) {
    _rightTmp.set(1, 0, 0).applyQuaternion(cam.quaternion);
    _rightTmp.y = 0;
    if (_rightTmp.lengthSq() > 1e-6) _rightTmp.normalize();
    return _rightTmp;
  }

  // ══════════════════════════════════════════════════════════════
  //  OVERLAYS (cinematic bars, grain, motion blur)
  // ══════════════════════════════════════════════════════════════
  let _els = null;
  function _ensureOverlay() {
    if (_els) return _els;
    const cvp = document.getElementById('cvp');
    if (!cvp) return null;
    const root = document.createElement('div');
    root.id = 'camrig-overlay';
    root.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:7;overflow:hidden';

    const barTop = document.createElement('div');
    barTop.style.cssText = 'position:absolute;left:0;right:0;top:0;height:0;background:#000;transition:height .5s ease';
    const barBot = document.createElement('div');
    barBot.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:0;background:#000;transition:height .5s ease';

    const blur = document.createElement('div');
    blur.style.cssText = 'position:absolute;inset:0;backdrop-filter:blur(0px);-webkit-backdrop-filter:blur(0px);opacity:0';

    const grain = document.createElement('div');
    grain.style.cssText = 'position:absolute;inset:0;opacity:0;mix-blend-mode:overlay;'
      + "background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\");";

    root.appendChild(blur);
    root.appendChild(grain);
    root.appendChild(barTop);
    root.appendChild(barBot);
    cvp.appendChild(root);
    _els = { root, barTop, barBot, blur, grain };
    return _els;
  }

  function _applyOverlays(blurAmt, barsFrac, grainAmt) {
    const o = _ensureOverlay(); if (!o) return;
    // Letterbox
    const h = Math.max(0, Math.min(0.25, barsFrac)) * 100;
    o.barTop.style.height = h ? h.toFixed(1) + '%' : '0';
    o.barBot.style.height = h ? h.toFixed(1) + '%' : '0';
    // Grain
    o.grain.style.opacity = grainAmt > 0.001 ? Math.min(0.6, grainAmt).toFixed(3) : '0';
    // Motion blur
    if (blurAmt > 0.01) {
      const px = Math.min(6, blurAmt);
      o.blur.style.backdropFilter = 'blur(' + px.toFixed(2) + 'px)';
      o.blur.style.webkitBackdropFilter = o.blur.style.backdropFilter;
      o.blur.style.opacity = '1';
    } else if (o.blur.style.opacity !== '0') {
      o.blur.style.opacity = '0';
      o.blur.style.backdropFilter = 'blur(0px)';
      o.blur.style.webkitBackdropFilter = 'blur(0px)';
    }
  }

  function _resetOverlays() { _applyOverlays(0, 0, 0); }

  // ══════════════════════════════════════════════════════════════
  //  RENDER PATCH — pos + rot + fov
  // ══════════════════════════════════════════════════════════════
  const _q0 = new THREE.Quaternion(), _qo = new THREE.Quaternion(), _e = new THREE.Euler();
  function _hookRenderer() {
    if (typeof renderer === 'undefined' || !renderer.render) { setTimeout(_hookRenderer, 100); return; }
    if (renderer.render.__rigPatched) return;
    const orig = renderer.render.bind(renderer);
    renderer.render = function (scn, cam) {
      const c = cam || (typeof camera !== 'undefined' ? camera : null);
      const need = c && (_pos.x || _pos.y || _pos.z || _rot.pitch || _rot.yaw || _rot.roll || Math.abs(_fov) > 0.001);
      if (need) {
        c.position.x += _pos.x; c.position.y += _pos.y; c.position.z += _pos.z;
        _q0.copy(c.quaternion);
        _e.set(_rot.pitch, _rot.yaw, _rot.roll, 'YXZ');
        _qo.setFromEuler(_e);
        c.quaternion.multiply(_qo);
        let f0;
        if (Math.abs(_fov) > 0.001 && c.isPerspectiveCamera) {
          f0 = c.fov; c.fov = Math.max(1, Math.min(179, c.fov + _fov)); c.updateProjectionMatrix();
        }
        c.updateMatrixWorld(true);
        try { orig(scn, cam); }
        finally {
          c.position.x -= _pos.x; c.position.y -= _pos.y; c.position.z -= _pos.z;
          c.quaternion.copy(_q0);
          if (f0 !== undefined) { c.fov = f0; c.updateProjectionMatrix(); }
          c.updateMatrixWorld(true);
        }
      } else {
        orig(scn, cam);
      }
    };
    renderer.render.__rigPatched = true;
  }

  function _hookMainLoop() {
    if (typeof camModuleUpdate !== 'function') { setTimeout(_hookMainLoop, 100); return; }
    if (camModuleUpdate.__rigPatched) return;
    const orig = camModuleUpdate;
    window.camModuleUpdate = function (delta) {
      orig(delta);
      try { update(delta); } catch (e) { if (typeof log === 'function') log('❌ CameraRig update: ' + e.message, 'le'); }
    };
    window.camModuleUpdate.__rigPatched = true;
  }

  function _hookPlayMode() {
    const pb = document.getElementById('play-btn');
    if (pb && !pb.__rigHooked) {
      pb.addEventListener('click', () => {
        setTimeout(() => {
          _lastPos = null; _haveQuat = false; _bobPhase = 0; _fovSmooth = 0; _blurSmooth = 0;
          if (typeof isPlaying !== 'undefined' && !isPlaying) _resetOverlays();
        }, 30);
      });
      pb.__rigHooked = true;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  INSPECTOR — kamera tanlanganda "Camera Rig" paneli (yoki Global)
  // ══════════════════════════════════════════════════════════════
  const INP = "flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";

  function _row(label, inner) { return `<div class="fr"><span class="fl">${label}</span>${inner}</div>`; }
  function _num(id, v, step, min, max) {
    return `<input id="${id}" type="number" value="${v}" step="${step||0.05}"${min!=null?` min="${min}"`:''}${max!=null?` max="${max}"`:''}
      style="width:74px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-size:10px;border-radius:2px">`;
  }
  function _rng(id, v, min, max, step) {
    return `<input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}" style="flex:1">`;
  }
  function _chk(id, on) { return `<input id="${id}" type="checkbox" ${on?'checked':''} style="cursor:pointer">`; }

  // Bitta modul bloki (sarlavha + checkbox + ochilganda ichki maydonlar)
  function _module(key, title, on, bodyHTML) {
    return `
      <div style="border:1px solid var(--border);border-radius:4px;margin-bottom:5px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:6px;padding:5px 7px;background:rgba(var(--accent-rgb),.04)">
          <span style="flex:1;font-size:10px;color:var(--accent)">${title}</span>
          <input type="checkbox" ${on?'checked':''} onchange="CameraRigSystem._toggle('${key}',this.checked)" style="cursor:pointer">
        </div>
        ${on ? `<div style="padding:6px 8px">${bodyHTML}</div>` : ''}
      </div>`;
  }

  function _note(title, txt) {
    return `
      <div style="border:1px solid var(--border);border-radius:4px;margin-bottom:5px;padding:6px 8px;opacity:.7">
        <div style="font-size:10px;color:var(--muted)">${title}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">${txt}</div>
      </div>`;
  }

  function _rigOf() {
    if (_editGlobal) return window._camRigGlobal;
    if (typeof selectedObj !== 'undefined' && selectedObj && selectedObj.userData && selectedObj.userData.isCamera)
      return _getObjRig(selectedObj);
    return null;
  }

  function _buildPanel() {
    const rig = _rigOf(); if (!rig) return '';
    const b = rig.bob, s = rig.sway, df = rig.dynFov, bl = rig.blur, ci = rig.cinematic, sp = rig.special;
    const targetLbl = _editGlobal ? 'GLOBAL kamera' : (selectedObj?.userData?.name || 'Kamera');

    return `
      <div class="comp-block">
        <div class="comp-title">
          <span class="tag" style="background:rgba(var(--accent-rgb),.15);color:var(--accent)">RIG</span>
          <span style="flex:1">Camera Rig</span>
          <span style="font-size:9px;color:var(--muted)">${targetLbl}</span>
        </div>
        <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 6px">
          Uzluksiz kamera effektlari. ${_editGlobal ? "Global — barcha o'yin kamerasiga." : "Faqat shu kamera aktiv bo'lganda."}
        </div>

        ${_module('bob', '🚶 Bob (yurish tebranishi)', b.on, `
          ${_row('Amplituda', _num('rig-bob-amp', b.amp, 0.01, 0))}
          ${_row('Chastota',  _num('rig-bob-freq', b.freq, 0.5, 0))}
          ${_row('Yon',       _rng('rig-bob-side', b.side, 0, 1, 0.05))}
        `)}

        ${_module('sway', '🎐 Sway (turganda tebranish)', s.on, `
          ${_row('Kuch', _rng('rig-sway-amp', s.amp, 0, 2, 0.05))}
        `)}

        ${_module('dynFov', '🎯 Dynamic FOV (tezlikka qarab)', df.on, `
          ${_row('Kuch',    _num('rig-dfov-amount', df.amount, 1, 0))}
          ${_row('Maks +°', _num('rig-dfov-max', df.max, 1, 0))}
        `)}

        ${_module('blur', '💨 Motion Blur', bl.on, `
          ${_row('Kuch', _rng('rig-blur-amt', bl.amount, 0, 3, 0.1))}
        `)}

        ${_module('cinematic', '🎬 Cinematic (letterbox)', ci.on, `
          ${_row('Chiziq balandligi', _rng('rig-cine-bars', ci.bars, 0, 0.25, 0.01))}
          ${_row('Grain (donadorlik)', _rng('rig-cine-grain', ci.grain, 0, 1, 0.05))}
        `)}

        ${_module('special', '🌀 Special (dutch roll)', sp.on, `
          ${_row('Roll (°)', _num('rig-sp-roll', sp.roll, 1))}
        `)}

        ${_note('📷 Shake', "Pastdagi «Camera Shake» blokidan sozlang.")}
        ${_note('🔎 Zoom / Position / Rotation', "Kamera FOV va transform — asosiy Inspector maydonlaridan.")}
        ${_note('🎯 Follow / 🧱 Collision / 🔀 Transition', "Keyingi bosqichda — hozircha kamera rejimlaridan (3rd-person / fixed) foydalaning.")}
      </div>`;
  }

  function _wirePanel() {
    const rig = _rigOf(); if (!rig) return;
    const on = (id, obj, key, num) => {
      const el = document.getElementById(id); if (!el) return;
      const ev = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
      el.addEventListener(ev, () => { obj[key] = num ? (parseFloat(el.value) || 0) : el.value; });
    };
    on('rig-bob-amp', rig.bob, 'amp', true);
    on('rig-bob-freq', rig.bob, 'freq', true);
    on('rig-bob-side', rig.bob, 'side', true);
    on('rig-sway-amp', rig.sway, 'amp', true);
    on('rig-dfov-amount', rig.dynFov, 'amount', true);
    on('rig-dfov-max', rig.dynFov, 'max', true);
    on('rig-blur-amt', rig.blur, 'amount', true);
    on('rig-cine-bars', rig.cinematic, 'bars', true);
    on('rig-cine-grain', rig.cinematic, 'grain', true);
    on('rig-sp-roll', rig.special, 'roll', true);
  }

  function _toggle(modKey, val) {
    const rig = _rigOf(); if (!rig) return;
    if (rig[modKey]) rig[modKey].on = !!val;
    if (typeof updateInspector === 'function') updateInspector();
    else _renderGlobalPanel();
  }

  // Kamera obyekti tanlanganda panelni Inspector'ga qo'shish
  function _appendToInspector() {
    if (_editGlobal) return;   // global rejimda alohida render
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const ud = selectedObj.userData; if (!ud || !ud.isCamera) return;
    const ic = document.getElementById('inspector-content'); if (!ic) return;
    ic.insertAdjacentHTML('beforeend', _buildPanel());
    _wirePanel();
  }

  function _hookInspector() {
    if (typeof updateInspector !== 'function') { setTimeout(_hookInspector, 100); return; }
    if (updateInspector.__rigPatched) return;
    const orig = updateInspector;
    window.updateInspector = function () {
      _editGlobal = false;   // oddiy obyekt tanlanganda global rejimdan chiqamiz
      orig.apply(this, arguments);
      try { _appendToInspector(); } catch (e) { if (typeof log === 'function') log('❌ CameraRig inspector: ' + e.message, 'le'); }
    };
    window.updateInspector.__rigPatched = true;
  }

  // ── GLOBAL rig panelini Inspector'da ochish (hamburger menyudan) ──
  function editGlobal() {
    _editGlobal = true;
    if (typeof switchInsTab === 'function') { try { switchInsTab('inspector'); } catch (e) {} }
    _renderGlobalPanel();
  }
  function _renderGlobalPanel() {
    if (!_editGlobal) return;
    const ic = document.getElementById('inspector-content'); if (!ic) return;
    ic.innerHTML = `
      <div style="font-size:10px;color:var(--muted);padding:4px 6px 8px">
        🎥 <b style="color:var(--accent)">Global Camera FX</b> — barcha o'yin kamerasiga.
      </div>` + _buildPanel();
    _wirePanel();
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    _ensureOverlay();
    _hookRenderer();
    _hookMainLoop();
    _hookPlayMode();
    _hookInspector();
    if (typeof log === 'function') log('🎥 CameraRigSystem ishga tushdi', 'lok');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 70);

  // ── PUBLIC ───────────────────────────────────────────────────
  return {
    update, editGlobal,
    getGlobal: () => window._camRigGlobal,
    _toggle,
  };
})();

window.CameraRig = window.CameraRigSystem;
// ============================================================
