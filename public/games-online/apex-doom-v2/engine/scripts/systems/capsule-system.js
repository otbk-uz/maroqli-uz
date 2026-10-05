// ============================================================
//  CAPSULE SYSTEM  v1.0
// ------------------------------------------------------------
//  O'yinchining kapsulasi (kollayder) — faqat DEV ko'radi,
//  ▶ o'yin bosilganda ko'rinmaydi.
//
//  Kapsula boshida o'yinchiga mos beriladi (uning asl o'lchami),
//  keyin KLAVIATURA MUXARRIRIDAN klavish/komboga preset biriktirib
//  o'yin paytida kattalashtirish/kichraytirish mumkin.
//
//  Masalan: teshik 2x2, o'yinchi 3x3 → tugmani bosib turadi,
//  kapsula 2x2 bo'ladi va o'sha yerdan o'tib ketadi.
//
//  Muhimi: PlayerController kolliziyani obj.scale dan hisoblaydi,
//  shuning uchun scale o'zgarsa — KOLLAYDER ham, MODEL ham
//  birga o'zgaradi va personaj animatsiyasi ishlayveradi.
//
//  Rejimlar:  hold — bosib tursa kichik, qo'yvorsa asliga qaytadi
//             loop — bir bosib o'zgartiradi, yana bosib qaytaradi
// ============================================================

window.CapsuleSystem = (() => {

  // ── Presetlar (foydalanuvchi sozlaydi) ───────────────────────
  window._capsulePresets = window._capsulePresets || [
    { id: 1, name: "Cho'nqaygan", sx: 1.0, sy: 0.5, sz: 1.0 },
    { id: 2, name: 'Tor teshik',  sx: 0.6, sy: 1.0, sz: 0.6 },
    { id: 3, name: 'Kichik',      sx: 0.6, sy: 0.6, sz: 0.6 },
  ];
  window._capsuleKeys   = window._capsuleKeys   || {};   // code → {preset, mode}
  window._capsuleCombos = window._capsuleCombos || [];   // [{keys:[], preset, mode}]
  window._capsuleCfg    = window._capsuleCfg    || { enabled: true, showDev: true, speed: 10, squeezeModel: false };

  let _presetIdC = 3;
  let _base = null;        // o'yinchining ASL scale'i (kapsula "boshlang'ich" o'lchami)
  let _baseObj = null;     // qaysi obyekt uchun saqlangan
  let _devMesh = null;     // dev wireframe kapsula
  let _capScale = null;    // kapsulaning joriy o'lchami (kolliziya uchun)

  function _preset(id) { return window._capsulePresets.find(p => p.id === id) || null; }

  // ── Faol o'yinchi obyekti ────────────────────────────────────
  function _playerObj() {
    if (typeof PlayerController !== 'undefined' && PlayerController && PlayerController.obj && PlayerController.obj.parent)
      return PlayerController.obj;
    if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent) return playerMesh;
    return null;
  }

  // ============================================================
  //  📏 ASL O'LCHAM (`_base`)
  // ------------------------------------------------------------
  //  ⚠ XATO BOR EDI (foydalanuvchi topgan): `_base` obyekt uchun
  //    BIR MARTA olinardi — faqat o'yinchi ALMASHGANDA yangilanardi.
  //
  //    Alomat: o'yinchiga 3.00 qo'yib ▶ Play bosasiz — 3.00.
  //    ⏹ Stop, 2.00 qo'yasiz, yana ▶ Play — u YANA 3.00 bo'lib
  //    qoladi. \"Masshtabni faqat bir marta o'zgartirish mumkindek\".
  //
  //    Sabab: `applyCapsule()` har kadr `o.scale.set(_base…)` qiladi
  //    (154-qator). `_base` esa birinchi Play dagi 3.00 bo'lib
  //    qolgan — ya'ni dizaynerning yangi 2.00 si har kadr ustidan
  //    yozib tashlanardi.
  //
  //  YECHIM: MUHARRIRDA `_base` HAR DOIM obyektning joriy
  //  masshtabidan olinadi — dizayner nima qo'ysa, o'sha asl o'lcham.
  //  ▶ Play davomida esa QOTADI: o'yin ichida 🧎 cho'kish/🏃 yugurish
  //  kapsulani vaqtincha o'zgartiradi va u asl o'lchamga qaytishi
  //  kerak.
  // ============================================================
  function _ensureBase(o) {
    const playing = (typeof isPlaying !== 'undefined' && isPlaying);
    if (_baseObj !== o || !_base) {
      _baseObj = o;
      _base = { x: o.scale.x, y: o.scale.y, z: o.scale.z };
      _capScale = { x: o.scale.x, y: o.scale.y, z: o.scale.z };
      return _base;
    }
    //  ⚠ Muharrirda — dizaynerning joriy qiymati YANGI asl o'lcham.
    //    ▶ Play da tegilmaydi, aks holda cho'kish paytidagi vaqtinchalik
    //    o'lcham \"asl\" bo'lib qolib, o'yinchi qaytib turolmasdi.
    if (!playing &&
        (_base.x !== o.scale.x || _base.y !== o.scale.y || _base.z !== o.scale.z)) {
      _base = { x: o.scale.x, y: o.scale.y, z: o.scale.z };
      _capScale = { x: o.scale.x, y: o.scale.y, z: o.scale.z };
    }
    return _base;
  }

  function baseSize() { return _base ? Object.assign({}, _base) : null; }
  function rebase() { const o = _playerObj(); if (o) { _baseObj = null; _ensureBase(o); } }

  // ── DEV kapsula (faqat editor'da ko'rinadi) ──────────────────
  function _ensureDev() {
    if (_devMesh && _devMesh.parent) return _devMesh;
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 14, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.45, depthWrite: false });
    _devMesh = new THREE.Mesh(geo, mat);
    _devMesh.raycast = () => {};                   // tanlashga xalaqit bermasin
    _devMesh.userData = { _isDevCapsule: true };
    if (typeof scene !== 'undefined') scene.add(_devMesh);
    return _devMesh;
  }

  function _updateDev(o) {
    const playing = (typeof isPlaying !== 'undefined' && isPlaying);
    const show = !playing && window._capsuleCfg.showDev && !!o;   // ▶ bosilsa ko'rinmaydi
    const d = _ensureDev();
    d.visible = show;
    if (!show || !o) return;
    o.updateMatrixWorld(true);
    d.position.setFromMatrixPosition(o.matrixWorld);
    d.quaternion.copy(o.quaternion);
    const cs = _capScale || o.scale;
    d.scale.set(cs.x, cs.y, cs.z);                 // kapsula (kollayder) o'lchami
  }

  // ── Klavish holati ───────────────────────────────────────────
  function _kd(c) { return !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[c]); }
  function _held(c) {
    if (c === 'ShiftLeft')   return _kd('ShiftLeft')   || _kd('ShiftRight');
    if (c === 'ControlLeft') return _kd('ControlLeft') || _kd('ControlRight');
    if (c === 'AltLeft')     return _kd('AltLeft')     || _kd('AltRight');
    return _kd(c);
  }

  const _prev = new Map();
  const _loopOn = new Map();

  // ── UPDATE ───────────────────────────────────────────────────
  function update(delta) {
    const o = _playerObj();
    _updateDev(o);
    if (!o) return;
    _ensureBase(o);

    const playing = (typeof isPlaying !== 'undefined' && isPlaying);
    if (!playing || !window._capsuleCfg.enabled) {
      _loopOn.clear(); _prev.clear();
      return;
    }

    // Qaysi bind aktiv? (kombo yakka klavishdan ustun)
    let chosen = null, chosenBind = null, prio = -1;
    const consider = (key, held, bind, p) => {
      const was = _prev.get(key) || false;
      const edge = held && !was;
      _prev.set(key, held);
      let on;
      if (bind.mode === 'loop') { if (edge) _loopOn.set(key, !_loopOn.get(key)); on = !!_loopOn.get(key); }
      else on = held;
      if (on && p >= prio) { chosen = bind.preset; chosenBind = bind; prio = p; }
    };

    (window._capsuleCombos || []).forEach((c, i) => {
      const ok = c.keys.length > 0 && c.keys.every(_held);
      consider('c' + i, ok, c, 2);
    });
    Object.keys(window._capsuleKeys || {}).forEach(code => {
      consider('k' + code, _held(code), window._capsuleKeys[code], 1);
    });

    // Maqsad kapsula o'lchami
    const pr = chosen ? _preset(chosen) : null;
    const tx = _base.x * (pr ? pr.sx : 1);
    const ty = _base.y * (pr ? pr.sy : 1);
    const tz = _base.z * (pr ? pr.sz : 1);

    // Kapsula o'lchamini silliq yuritamiz (model'dan alohida)
    if (!_capScale) _capScale = { x: _base.x, y: _base.y, z: _base.z };
    const lf = Math.min(1, delta * (window._capsuleCfg.speed || 10));
    const oldY = _capScale.y;
    _capScale.x += (tx - _capScale.x) * lf;
    _capScale.y += (ty - _capScale.y) * lf;
    _capScale.z += (tz - _capScale.z) * lf;

    // Balandlik kamaysa — yerga botib ketmasin
    const dY = (_capScale.y - oldY) * 0.5;
    if (dY < 0) o.position.y += dY;

    // Model o'lchami: "modelni ham ez" yoqiq bo'lsa — kapsula bilan birga,
    // o'chiq bo'lsa — modelga TEGILMAYDI (asl holida qoladi).
    if (window._capsuleCfg.squeezeModel) o.scale.set(_capScale.x, _capScale.y, _capScale.z);
    else                                 o.scale.set(_base.x, _base.y, _base.z);

    // Model swap (klavishga model biriktirilgan bo'lsa)
    _applySwap(o, chosenBind);
  }

  // ══════════════════════════════════════════════════════════════
  //  PlayerController PATCH — kolliziya kapsula o'lchamida hisoblansin
  //  (model esa render'da asl o'lchamda qoladi)
  // ══════════════════════════════════════════════════════════════
  function _hookPlayerController() {
    if (typeof PlayerController === 'undefined' || !PlayerController.update) { setTimeout(_hookPlayerController, 150); return; }
    if (PlayerController.update.__capPatched) return;
    const orig = PlayerController.update;
    PlayerController.update = function (delta) {
      const o = this.obj;
      const cfg = window._capsuleCfg;
      // "modelni ham ez" yoqiq bo'lsa scale allaqachon kapsula o'lchamida — patch shart emas
      if (!o || !_capScale || !cfg.enabled || cfg.squeezeModel) { orig.call(this, delta); return; }
      // Kolliziya/kamera hisobi uchun vaqtincha kapsula o'lchami
      const bx = o.scale.x, by = o.scale.y, bz = o.scale.z;
      o.scale.set(_capScale.x, _capScale.y, _capScale.z);
      try { orig.call(this, delta); }
      finally { o.scale.set(bx, by, bz); }   // model asl o'lchamiga qaytadi
    };
    PlayerController.update.__capPatched = true;
  }

  // ══════════════════════════════════════════════════════════════
  //  MODEL SWAP — klavishga model biriktirilgan bo'lsa, bosilganda
  //  o'yinchi o'sha modelga o'zgaradi (kapsulaga tegmaydi)
  // ══════════════════════════════════════════════════════════════
  let _activeSwap = null;     // hozir ko'rsatilayotgan swap modeli

  // O'yinchining ASL ko'rinishini yashirish/ko'rsatish
  function _setOrigVisible(o, v) {
    if (o.isMesh && o.material) {
      if (Array.isArray(o.material)) o.material.forEach(m => { m.visible = v; });
      else o.material.visible = v;
    }
    o.children.forEach(ch => {
      const ud = ch.userData || {};
      if (ud._swapModel || ud._isDevCapsule) return;   // swap modeli va dev kapsula alohida
      ch.visible = v;
    });
  }

  function _applySwap(o, bind) {
    const want = (bind && bind.model && bind.model.node) ? bind.model : null;
    if (want === _activeSwap) return;

    // Eskisini olib tashlaymiz
    if (_activeSwap && _activeSwap.node && _activeSwap.node.parent) _activeSwap.node.parent.remove(_activeSwap.node);
    _activeSwap = null;
    _setOrigVisible(o, true);

    // Yangisini qo'yamiz
    if (want) {
      want.node.userData._swapModel = true;
      _setOrigVisible(o, false);
      o.add(want.node);
      _activeSwap = want;
    }
  }

  function _clearSwap() {
    const o = _playerObj();
    if (_activeSwap && _activeSwap.node && _activeSwap.node.parent) _activeSwap.node.parent.remove(_activeSwap.node);
    _activeSwap = null;
    if (o) _setOrigVisible(o, true);
  }

  // ── GLB import (har bind uchun alohida model) ────────────────
  function _importModel(bind, onDone) {
    if (typeof getGLTFLoader !== 'function' || !THREE.GLTFLoader) {
      if (typeof log === 'function') log('⚠ GLTF loader topilmadi', 'lw');
      return;
    }
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.glb,.gltf'; inp.style.display = 'none';
    inp.onchange = e => {
      const f = e.target && e.target.files && e.target.files[0];
      if (f) {
        const rd = new FileReader();
        rd.onload = ev => {
          try {
            const loader = getGLTFLoader();
            loader.parse(ev.target.result, '', gltf => {
              const node = gltf.scene || (gltf.scenes && gltf.scenes[0]);
              if (!node) { if (typeof log === 'function') log('⚠ Model bo\'sh', 'lw'); return; }
              node.userData._swapModel = true;
              bind.model = { name: f.name.replace(/\.\w+$/, ''), node, clips: gltf.animations || [],
                             user: { s: 1, y: 0, rotY: 0 } };
              _autoFit(bind.model);          // kapsulaga avtomatik moslash
              if (typeof log === 'function') log(`🧍 Model yuklandi va moslandi: ${bind.model.name}`, 'lok');
              if (onDone) onDone();
            }, err => { if (typeof log === 'function') log('⚠ Model xato: ' + (err && err.message || ''), 'lw'); });
          } catch (e2) { if (typeof log === 'function') log('⚠ Model xato: ' + e2.message, 'lw'); }
        };
        rd.readAsArrayBuffer(f);
      }
      if (inp.parentNode) inp.parentNode.removeChild(inp);
    };
    document.body.appendChild(inp); inp.click();
    setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
  }

  // ── Modelni kapsulaga avtomatik moslash (auto-fit) ───────────
  //  GLB o'z origin/o'lchamiga ega — uni o'yinchi kapsulasiga moslaymiz.
  //  O'yinchi obyekti 1 birlik deb olinadi (markaz 0, past -0.5),
  //  chunki PlayerController yerni minY = scale.y*0.5 dan hisoblaydi.
  function _autoFit(model) {
    const node = model.node;
    node.scale.set(1, 1, 1);
    node.position.set(0, 0, 0);
    node.rotation.set(0, 0, 0);
    node.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(node);
    if (!isFinite(box.min.y) || box.isEmpty()) { model.fit = { s: 1, x: 0, y: 0, z: 0, rotY: 0 }; return; }
    const size = box.getSize(new THREE.Vector3());
    const ctr  = box.getCenter(new THREE.Vector3());

    // Balandligini 1 birlikka keltiramiz (parent scale keyin qo'llanadi)
    const s = 1 / Math.max(0.0001, size.y);
    // Markazni X/Z bo'yicha tenglaymiz, pastini -0.5 ga qo'yamiz
    model.fit = {
      s,
      x: -ctr.x * s,
      y: -box.min.y * s - 0.5,
      z: -ctr.z * s,
      rotY: 0,
    };
    _applyFit(model);
  }

  // Qo'lda tuzatish qiymatlari bilan birga qo'llash
  function _applyFit(model) {
    if (!model || !model.node || !model.fit) return;
    const f = model.fit;
    const u = model.user || (model.user = { s: 1, y: 0, rotY: 0 });
    model.node.scale.setScalar(f.s * (u.s || 1));
    model.node.position.set(f.x, f.y + (u.y || 0), f.z);
    model.node.rotation.set(0, ((f.rotY || 0) + (u.rotY || 0)) * Math.PI / 180, 0);
  }

  // ── Model sozlash paneli (auto-fit ustidan qo'lda tuzatish) ──
  let _tunePanel = null;
  function _openTune(bind, anchorEl) {
    _closeTune();
    const m = bind && bind.model;
    if (!m) return;
    const u = m.user || (m.user = { s: 1, y: 0, rotY: 0 });

    const p = document.createElement('div');
    p.style.cssText = `position:fixed;z-index:100000;background:#0b1020;border:1px solid rgba(var(--accent3-rgb),.45);
      border-radius:6px;padding:9px 10px;min-width:230px;box-shadow:0 8px 24px rgba(0,0,0,.6);
      font-family:'Share Tech Mono',monospace`;
    p.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px">
        <span style="flex:1;font-size:11px;color:var(--accent3)">🧍 ${m.name}</span>
        <button id="tn-x" style="background:none;border:none;color:#7a8aa0;cursor:pointer;font-size:13px">✕</button>
      </div>
      <div style="font-size:9px;color:var(--border);margin-bottom:6px">Avtomatik moslandi. Kerak bo'lsa tuzating:</div>
      ${_tuneRow('tn-s',   "O'lcham",   u.s,    0.2, 3,   0.02)}
      ${_tuneRow('tn-y',   'Balandlik', u.y,   -1.5, 1.5, 0.02)}
      ${_tuneRow('tn-r',   'Burilish°', u.rotY, -180, 180, 5)}
      <div style="display:flex;gap:5px;margin-top:7px">
        <button id="tn-auto" style="flex:1;background:rgba(var(--accent-rgb),.1);border:1px solid rgba(var(--accent-rgb),.4);color:var(--accent);border-radius:4px;font-size:9px;padding:4px;cursor:pointer">↺ Qayta moslash</button>
        <button id="tn-test" style="flex:1;background:rgba(120,220,120,.1);border:1px solid rgba(120,220,120,.4);color:#7fd97f;border-radius:4px;font-size:9px;padding:4px;cursor:pointer">▶ Ko'rish</button>
      </div>`;
    document.body.appendChild(p);
    _tunePanel = p;

    const r = anchorEl.getBoundingClientRect();
    p.style.left = Math.min(window.innerWidth - 250, r.left) + 'px';
    p.style.top  = Math.min(window.innerHeight - 190, r.bottom + 6) + 'px';

    const bindRange = (id, key) => {
      const el = p.querySelector('#' + id); if (!el) return;
      el.oninput = () => {
        u[key] = parseFloat(el.value);
        const lbl = p.querySelector('#' + id + '-v'); if (lbl) lbl.textContent = (+u[key]).toFixed(2);
        _applyFit(m);
      };
    };
    bindRange('tn-s', 's'); bindRange('tn-y', 'y'); bindRange('tn-r', 'rotY');

    p.querySelector('#tn-x').onclick = _closeTune;
    p.querySelector('#tn-auto').onclick = () => { m.user = { s: 1, y: 0, rotY: 0 }; _autoFit(m); _closeTune(); _openTune(bind, anchorEl); };
    p.querySelector('#tn-test').onclick = () => {
      const o = _playerObj(); if (!o) { if (typeof log === 'function') log("⚠ O'yinchi topilmadi", 'lw'); return; }
      _applySwap(o, bind);
      setTimeout(() => _clearSwap(), 2500);
    };
  }
  function _tuneRow(id, label, v, min, max, step) {
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="width:62px;font-size:9px;color:#7a8aa0">${label}</span>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}" style="flex:1">
      <span id="${id}-v" style="width:40px;text-align:right;font-size:9px;color:var(--accent3)">${(+v).toFixed(2)}</span>
    </div>`;
  }
  function _closeTune() { if (_tunePanel && _tunePanel.parentNode) _tunePanel.parentNode.removeChild(_tunePanel); _tunePanel = null; }

  // ══════════════════════════════════════════════════════════════
  //  KLAVISH POPUP'IGA QO'SHISH (bkm-popup — animatsiya yonida)
  // ══════════════════════════════════════════════════════════════
  function _installPopupHook() {
    if (typeof window._bkmOpenKeyPopup !== 'function') { setTimeout(_installPopupHook, 200); return; }
    if (window._bkmOpenKeyPopup.__capPatched) return;
    const orig = window._bkmOpenKeyPopup;
    window._bkmOpenKeyPopup = function (code, lbl, boundAction, onSave) {
      orig(code, lbl, boundAction, onSave);
      try { _injectPopup(code, lbl); } catch (e) { if (typeof log === 'function') log('❌ Capsule popup: ' + e.message, 'le'); }
    };
    window._bkmOpenKeyPopup.__capPatched = true;
  }

  function _injectPopup(code, lbl) {
    const popup = document.getElementById('bkm-popup');
    if (!popup || popup.querySelector('#capp-box')) return;

    const b = window._capsuleKeys[code] || null;
    const on = !!b;

    const box = document.createElement('div');
    box.id = 'capp-box';
    box.style.cssText = 'margin-bottom:12px;padding:8px 10px;background:rgba(var(--accent-rgb),.04);border:1px solid rgba(var(--accent-rgb),.18);border-radius:5px';
    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="capp-on" ${on?'checked':''} style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent)">
        <div style="flex:1">
          <div style="font-size:9px;color:var(--text)">🧍 Kapsula / Model o'zgarsin</div>
          <div style="font-size:8px;color:var(--border)">Bu tugma bosilganda kapsula o'lchami va/yoki model almashadi</div>
        </div>
      </div>
      <div id="capp-body" style="display:${on?'block':'none'};margin-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
          <span style="width:52px;font-size:9px;color:#7a8aa0">O'lcham</span>
          <select id="capp-p" class="bkm-inp" style="flex:1;font-size:10px">${_presetOpts(b?b.preset:null)}</select>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
          <span style="width:52px;font-size:9px;color:#7a8aa0">Rejim</span>
          <select id="capp-m" class="bkm-inp" style="flex:1;font-size:10px">${_modeOpts(b?b.mode:'hold')}</select>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:52px;font-size:9px;color:#7a8aa0">Model</span>
          <button id="capp-mdl" style="flex:1;padding:5px 8px;border-radius:4px;font-size:9px;cursor:pointer;font-family:'Share Tech Mono',monospace;
            background:${b&&b.model?'rgba(var(--accent3-rgb),.1)':'rgba(122,138,160,.08)'};
            border:1px solid ${b&&b.model?'rgba(var(--accent3-rgb),.4)':'rgba(122,138,160,.3)'};
            color:${b&&b.model?'var(--accent3)':'#7a8aa0'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${b&&b.model ? '🧍 '+b.model.name+'  (sozlash)' : '📁 Model import'}</button>
          ${b&&b.model?`<button id="capp-mdlx" title="olib tashlash" style="padding:5px 7px;border-radius:4px;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.3);color:#ff4444;font-size:9px;cursor:pointer">✕</button>`:''}
        </div>
        <div style="font-size:8px;color:var(--border);margin-top:5px">
          Model import qilinsa kapsulaga avtomatik moslanadi. Animatsiyani tepadagi 🎬 maydondan berasiz.
        </div>
      </div>`;

    // Saqlash tugmalari qatoridan oldin joylashtiramiz
    const saveBtn = popup.querySelector('#bkm-save-btn');
    const btnRow = saveBtn ? saveBtn.parentElement : null;
    if (btnRow) popup.insertBefore(box, btnRow); else popup.appendChild(box);

    const body = box.querySelector('#capp-body');
    const ensure = () => {
      if (!window._capsuleKeys[code]) {
        const first = window._capsulePresets[0];
        window._capsuleKeys[code] = { preset: first ? first.id : 1, mode: 'hold' };
      }
      return window._capsuleKeys[code];
    };

    box.querySelector('#capp-on').onchange = e => {
      if (e.target.checked) { ensure(); body.style.display = 'block'; }
      else { delete window._capsuleKeys[code]; _clearSwap(); body.style.display = 'none'; }
      _reopenPopup(code, lbl);
    };
    const pSel = box.querySelector('#capp-p');
    if (pSel) pSel.onchange = e => { ensure().preset = parseInt(e.target.value, 10); };
    const mSel = box.querySelector('#capp-m');
    if (mSel) mSel.onchange = e => { ensure().mode = e.target.value; };

    const mdl = box.querySelector('#capp-mdl');
    if (mdl) mdl.onclick = (ev) => {
      const bd = ensure();
      if (bd.model) _openTune(bd, ev.currentTarget);
      else _importModel(bd, () => _reopenPopup(code, lbl));
    };
    const mdlx = box.querySelector('#capp-mdlx');
    if (mdlx) mdlx.onclick = () => {
      const bd = window._capsuleKeys[code];
      if (bd) bd.model = null;
      _closeTune(); _clearSwap(); _reopenPopup(code, lbl);
    };
  }

  // Popup'ni qayta chizish (holat o'zgargach)
  function _reopenPopup(code, lbl) {
    const popup = document.getElementById('bkm-popup');
    const box = popup && popup.querySelector('#capp-box');
    if (box) box.remove();
    try { _injectPopup(code, lbl); } catch (e) {}
    _refresh();
  }

  function _hookMainLoop() {
    if (typeof camModuleUpdate !== 'function') { setTimeout(_hookMainLoop, 120); return; }
    if (camModuleUpdate.__capPatched) return;
    const orig = camModuleUpdate;
    window.camModuleUpdate = function (delta) {
      orig(delta);
      try { update(delta || 0); } catch (e) { if (typeof log === 'function') log('❌ Capsule: ' + e.message, 'le'); }
    };
    window.camModuleUpdate.__capPatched = true;
  }

  // ── ▶/⏹ da asl o'lchamga qaytarish ───────────────────────────
  function _hookPlayMode() {
    const pb = document.getElementById('play-btn');
    if (pb && !pb.__capHooked) {
      pb.addEventListener('click', () => setTimeout(() => {
        _loopOn.clear(); _prev.clear();
        const o = _playerObj();
        //  ⚠ ▶ PLAY BOSHLANISHIDA asl o'lcham QAYTA olinadi.
        //    Busiz dizayner ⏹ Stop dan keyin masshtabni o'zgartirsa,
        //    o'yin eski qiymatni ishlatib turaverardi — aynan
        //    foydalanuvchi ko'rgan holat.
        if (o && typeof isPlaying !== 'undefined' && isPlaying) {
          _baseObj = null;
          _ensureBase(o);
        }
        if (o && _base && typeof isPlaying !== 'undefined' && !isPlaying) {
          o.scale.set(_base.x, _base.y, _base.z);
          _capScale = { x: _base.x, y: _base.y, z: _base.z };
          _clearSwap();
        }
      }, 40));
      pb.__capHooked = true;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  KLAVIATURA MUXARRIRIGA QO'SHISH
  // ══════════════════════════════════════════════════════════════
  const CHIP = 'padding:3px 9px;border:1px solid rgba(var(--accent-rgb),.35);border-radius:4px;color:var(--accent);font-size:10px;cursor:pointer;background:#0b1020';
  const SEL  = "background:#0b1020;border:1px solid #23324a;color:var(--text);border-radius:4px;padding:3px 6px;font-family:'Share Tech Mono',monospace;font-size:10px";
  const DEL  = 'background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.4);color:#ff6666;border-radius:4px;font-size:11px;padding:2px 8px;cursor:pointer';

  function _keyLbl(c) { return (typeof _keyLabel === 'function') ? _keyLabel(c) : String(c||'').replace('Key','').replace('Digit',''); }
  function _presetOpts(sel) {
    if (sel == null && window._capsulePresets[0]) sel = window._capsulePresets[0].id;
    return window._capsulePresets.map(p =>
      `<option value="${p.id}" ${sel===p.id?'selected':''}>${p.name} (${p.sx}×${p.sy}×${p.sz})</option>`).join('');
  }
  const _modeOpts = (m) => `
    <option value="hold" ${m==='hold'?'selected':''}>Hold (bosib tursa)</option>
    <option value="loop" ${m==='loop'?'selected':''}>Loop (bosib yoq/o'chir)</option>`;

  function _refresh() {
    const p = document.getElementById('bkm-panel');
    if (p && typeof _bkmRender === 'function') _bkmRender(p, p._tab || 0);
  }

  function _installEditorHook() {
    if (typeof window._bkmRenderKeys !== 'function') { setTimeout(_installEditorHook, 200); return; }
    if (window._bkmRenderKeys.__capPatched) return;
    const orig = window._bkmRenderKeys;
    window._bkmRenderKeys = function (panel) {
      orig(panel);
      try { _injectUI(panel); } catch (e) { if (typeof log === 'function') log('❌ Capsule UI: ' + e.message, 'le'); }
    };
    window._bkmRenderKeys.__capPatched = true;
  }

  function _injectUI(panel) {
    const box = document.createElement('div');
    box.style.cssText = 'margin-top:16px;border-top:1px solid #1a2535;padding-top:12px';
    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--accent);font-weight:700">🧍 Kapsula (o'lcham) biriktirishlari</span>
        <label style="display:flex;align-items:center;gap:4px;font-size:9px;color:#7a8aa0;cursor:pointer">
          <input type="checkbox" id="cap-devshow" ${window._capsuleCfg.showDev?'checked':''}> dev'da ko'rsat
        </label>
        <label title="Yoqilsa model ham eziladi. O'chirilsa modelga hech nima bo'lmaydi — faqat kapsula o'zgaradi."
          style="display:flex;align-items:center;gap:4px;font-size:9px;color:${window._capsuleCfg.squeezeModel?'#ffaa44':'#7a8aa0'};cursor:pointer">
          <input type="checkbox" id="cap-squeeze" ${window._capsuleCfg.squeezeModel?'checked':''}> modelni ham ez
        </label>
        <span style="flex:1"></span>
        <button id="cap-add-combo"  style="${CHIP};border-color:rgba(255,170,68,.4);color:#ffaa44">➕ Kombo</button>
        <button id="cap-add-preset" style="${CHIP};border-color:rgba(var(--accent3-rgb),.4);color:var(--accent3)">➕ O'lcham</button>
      </div>
      <div id="cap-preset-list" style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"></div>
      <div id="cap-combo-list"  style="display:flex;flex-direction:column;gap:5px"></div>
      <div style="font-size:9px;color:var(--border);margin-top:8px;line-height:1.5">
        Kapsula = o'yinchining kolliderи. Odatda faqat <b style="color:var(--accent)">kapsula</b> o'zgaradi — modelga tegilmaydi, animatsiya ishlayveradi.<br>
        <b style="color:#ffaa44">«modelni ham ez»</b> yoqilsa model ham siqiladi (qiziqarli o'yinlar uchun).<br>
        <b style="color:var(--accent)">Yakka klavish</b> uchun: tepadagi klaviaturadan klavishni bosing —
        popup ichida (animatsiya yonida) kapsula va model sozlamalari bor.<br>
        Namuna: teshik 2×2, o'yinchi 3×3 → tugmani <b>bosib tursa</b> kapsula kichrayadi va o'tib ketadi.
      </div>`;
    panel.appendChild(box);

    box.querySelector('#cap-devshow').onchange = e => { window._capsuleCfg.showDev = e.target.checked; };
    box.querySelector('#cap-squeeze').onchange = e => {
      window._capsuleCfg.squeezeModel = e.target.checked;
      const o = _playerObj(); if (o && _base) o.scale.set(_base.x, _base.y, _base.z);
      _refresh();
    };
    _renderPresets(); _renderCombos();

    box.querySelector('#cap-add-preset').onclick = () => {
      window._capsulePresets.push({ id: ++_presetIdC, name: 'Yangi', sx: 1, sy: 0.5, sz: 1 });
      _refresh();
    };
    box.querySelector('#cap-add-combo').onclick = () => {
      const first = window._capsulePresets[0];
      const c = { keys: [], preset: first ? first.id : 1, mode: 'hold' };
      window._capsuleCombos.push(c);
      _guided(c, 2);
    };
  }

  function _guided(combo, remaining) {
    _refresh();
    if (remaining <= 0) return;
    const list = document.getElementById('cap-combo-list'); if (!list) return;
    const chips = list.querySelectorAll('.cap-addkey');
    const chip = chips[chips.length - 1]; if (!chip) return;
    _catchKeyInto(chip, code => { combo.keys.push(code); _guided(combo, remaining - 1); });
  }

  // ── Preset ro'yxati (o'lchamlarni sozlash) ───────────────────
  function _renderPresets() {
    const list = document.getElementById('cap-preset-list'); if (!list) return;
    list.innerHTML = window._capsulePresets.map(p => `
      <div style="display:flex;align-items:center;gap:5px;background:rgba(var(--accent3-rgb),.04);border:1px solid #1a2535;border-radius:4px;padding:4px 6px">
        <input value="${p.name}" onchange="CapsuleSystem._setP(${p.id},'name',this.value)"
          style="${SEL};width:110px">
        <span style="font-size:9px;color:var(--border)">kенг</span>
        <input type="number" step="0.05" min="0.1" value="${p.sx}" onchange="CapsuleSystem._setP(${p.id},'sx',parseFloat(this.value)||1)" style="${SEL};width:58px">
        <span style="font-size:9px;color:var(--border)">bal</span>
        <input type="number" step="0.05" min="0.1" value="${p.sy}" onchange="CapsuleSystem._setP(${p.id},'sy',parseFloat(this.value)||1)" style="${SEL};width:58px">
        <span style="font-size:9px;color:var(--border)">chuq</span>
        <input type="number" step="0.05" min="0.1" value="${p.sz}" onchange="CapsuleSystem._setP(${p.id},'sz',parseFloat(this.value)||1)" style="${SEL};width:58px">
        <span style="flex:1"></span>
        <button onclick="CapsuleSystem._testP(${p.id})" style="background:rgba(120,220,120,.1);border:1px solid rgba(120,220,120,.35);color:#7fd97f;border-radius:3px;font-size:9px;padding:2px 7px;cursor:pointer">▶</button>
        <button onclick="CapsuleSystem._delP(${p.id})" style="${DEL}">🗑</button>
      </div>`).join('') || `<div style="font-size:9px;color:var(--border)">— o'lcham yo'q —</div>`;
  }

  function _renderCombos() {
    const list = document.getElementById('cap-combo-list'); if (!list) return;
    const combos = window._capsuleCombos;
    if (!combos.length) { list.innerHTML = `<div style="font-size:9px;color:var(--border)">— kombo yo'q —</div>`; return; }
    list.innerHTML = '';
    combos.forEach((c, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';
      const chips = c.keys.map((code, ki) =>
        `<span class="cap-ck" data-ki="${ki}" style="${CHIP};border-color:rgba(255,170,68,.4);color:#ffaa44">${_keyLbl(code)}</span>`
      ).join('<span style="color:var(--border)">+</span>');
      row.innerHTML = `
        ${chips}
        ${c.keys.length ? '<span style="color:var(--border)">+</span>' : ''}
        <span class="cap-addkey" title="klavish qo'shish" style="${CHIP};border-color:rgba(var(--accent3-rgb),.5);color:var(--accent3);font-weight:700">＋</span>
        <span style="color:var(--border)">→</span>
        <select class="cap-p" style="${SEL};flex:1;min-width:110px">${_presetOpts(c.preset)}</select>
        <select class="cap-m" style="${SEL};width:150px">${_modeOpts(c.mode)}</select>
        <button class="cap-mdl" title="${c.model ? 'Model sozlash' : 'Model import qilish'}"
          style="${CHIP};border-color:${c.model?'rgba(var(--accent3-rgb),.5)':'rgba(122,138,160,.35)'};color:${c.model?'var(--accent3)':'#7a8aa0'};max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.model ? '🧍 ' + c.model.name : '📁 model'}</button>
        ${c.model ? `<button class="cap-mdlx" style="${DEL};padding:2px 6px">×</button>` : ''}
        <button class="cap-d" style="${DEL}">🗑</button>`;
      row.querySelector('.cap-p').onchange = e => { c.preset = parseInt(e.target.value, 10); };
      row.querySelector('.cap-m').onchange = e => { c.mode = e.target.value; };
      row.querySelector('.cap-d').onclick  = () => { window._capsuleCombos.splice(idx, 1); _refresh(); };
      row.querySelector('.cap-mdl').onclick = (ev) => {
        if (c.model) _openTune(c, ev.currentTarget);
        else _importModel(c, _refresh);
      };
      const cmx = row.querySelector('.cap-mdlx');
      if (cmx) cmx.onclick = () => { c.model = null; _closeTune(); _clearSwap(); _refresh(); };
      row.querySelector('.cap-addkey').onclick = () => {
        _catchKeyInto(row.querySelector('.cap-addkey'), code => { c.keys.push(code); _refresh(); });
      };
      row.querySelectorAll('.cap-ck').forEach(ch => {
        const ki = parseInt(ch.dataset.ki, 10);
        ch.onclick = () => _catchKeyInto(ch, code => { c.keys[ki] = code; _refresh(); });
        ch.oncontextmenu = ev => { ev.preventDefault(); c.keys.splice(ki, 1); _refresh(); };
      });
      list.appendChild(row);
    });
  }

  // ── Inline handlerlar ────────────────────────────────────────
  function _setP(id, key, val) { const p = _preset(id); if (p) { p[key] = val; if (key !== 'name') _refresh(); } }
  function _delP(id) {
    window._capsulePresets = window._capsulePresets.filter(p => p.id !== id);
    Object.keys(window._capsuleKeys).forEach(c => { if (window._capsuleKeys[c].preset === id) delete window._capsuleKeys[c]; });
    window._capsuleCombos = window._capsuleCombos.filter(c => c.preset !== id);
    _refresh();
  }
  function _testP(id) {
    const o = _playerObj(); const p = _preset(id);
    if (!o || !p) { if (typeof log === 'function') log('⚠ O\'yinchi topilmadi', 'lw'); return; }
    _ensureBase(o);
    _capScale = { x: _base.x * p.sx, y: _base.y * p.sy, z: _base.z * p.sz };
    if (window._capsuleCfg.squeezeModel) o.scale.set(_capScale.x, _capScale.y, _capScale.z);
    setTimeout(() => {
      if (!_base) return;
      _capScale = { x: _base.x, y: _base.y, z: _base.z };
      o.scale.set(_base.x, _base.y, _base.z);
    }, 1200);
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    _hookMainLoop(); _hookPlayMode(); _hookPlayerController(); _installEditorHook(); _installPopupHook();
    if (typeof log === 'function') log('🧍 CapsuleSystem ishga tushdi', 'lok');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 100);

  // ── 💾 SystemRegistry shartnomasi ────────────────────────────
  //  ⚠ Kapsula presetlari, klavish bog'lanishlari va kombinatsiyalari
  //    `window._capsule*` da turadi. Ular sahna bilan ko'chmasdi —
  //    o'yinda cho'kkalash/emaklash bog'lanishlari yo'q bo'lardi.
  //    (`_base`, `_devMesh`, `_capScale` — runtime, saqlanmaydi.)
  function serialize() {
    try {
      const W = window;
      const out = {};
      if (W._capsuleCfg)     out.cfg     = W._capsuleCfg;
      if (W._capsuleKeys)    out.keys    = W._capsuleKeys;
      if (W._capsuleCombos)  out.combos  = W._capsuleCombos;
      if (W._capsulePresets) out.presets = W._capsulePresets;
      return Object.keys(out).length ? out : null;
    } catch (e) { return null; }
  }
  function restore(d) {
    if (!d) return 0;
    try {
      const W = window;
      if (d.cfg)     W._capsuleCfg     = d.cfg;
      if (d.keys)    W._capsuleKeys    = d.keys;
      if (d.combos)  W._capsuleCombos  = d.combos;
      if (d.presets) W._capsulePresets = d.presets;
      return 1;
    } catch (e) { return 0; }
  }

  return { update, baseSize, rebase, _setP, _delP, _testP, serialize, restore };
})();

window.Capsule = window.CapsuleSystem;
// ============================================================