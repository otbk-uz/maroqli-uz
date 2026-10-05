// ============================================================
// 🎬 ANIMATSIYA EKSPORTI → .webm
// ------------------------------------------------------------
//  Timeline'ni 0 dan oxirigacha o'ynatib, canvas'ni to'g'ridan-to'g'ri
//  video faylga yozib oladi.
//
//  Ishlash tamoyili:
//    canvas.captureStream(fps) → MediaRecorder → Blob → yuklab olish
//
//  ⚠ Bu REAL VAQT yozuv: brauzer nima chizsa, o'sha yoziladi.
//  Ya'ni yozuv davomiyligi = timeline davomiyligi. Agar sahna og'ir
//  bo'lib FPS tushsa, video ham sekinlashadi — shuning uchun yozishdan
//  oldin og'ir narsalarni (soya, filtr) kamaytirish tavsiya etiladi.
//
//  Kamera: timeline'da kamera treki bo'lsa — o'sha. Bo'lmasa —
//  tanlangan kamera obyekti yoki hozirgi editor kamerasi.
// ============================================================

const AnimExport = (() => {
  'use strict';

  let _rec = null, _chunks = [], _stream = null;
  let _running = false, _startT = 0, _dur = 0, _raf = null;
  let _prevState = null;

  // ── Brauzer nimani qo'llab-quvvatlaydi ──────────────────────
  const CODECS = [
    { mime: 'video/webm;codecs=vp9', name: 'VP9',  note: 'eng yaxshi siqish' },
    { mime: 'video/webm;codecs=vp8', name: 'VP8',  note: 'keng qo\'llab-quvvatlanadi' },
    { mime: 'video/webm',            name: 'WebM', note: 'standart' },
  ];

  function supported() {
    if (typeof MediaRecorder === 'undefined') return [];
    return CODECS.filter(c => {
      try { return MediaRecorder.isTypeSupported(c.mime); } catch (e) { return false; }
    });
  }

  function _canvas() { return document.getElementById('three-canvas'); }

  // ── Timeline davomiyligi ────────────────────────────────────
  function duration() {
    if (window.TimelineSystem && TimelineSystem.duration) return TimelineSystem.duration;
    return 0;
  }
  function hasTracks() {
    return !!(window.TimelineSystem && TimelineSystem.tracks && TimelineSystem.tracks.length);
  }

  // ── Sahnadagi kamera obyektlari ─────────────────────────────
  function cameras() {
    if (typeof objects === 'undefined') return [];
    return objects.filter(o => o.userData && o.userData.isCamera);
  }

  // ── 📐 REZOLYUTSIYA ─────────────────────────────────────────
  //  ⚠ captureStream() canvas'ning CHIZISH BUFERI o'lchamini oladi
  //  (canvas.width × canvas.height), CSS o'lchamini emas.
  //  Editorda viewport kichik (panellar joy egallaydi) — masalan 730px.
  //  Shuning uchun video ~730×410 = 480p bo'lib chiqardi.
  //
  //  Yechim: yozish paytida renderer.setSize(W, H, false) —
  //  oxirgi `false` = CSS o'lchamiga TEGMA. Ya'ni sahifa tartibi
  //  buzilmaydi, lekin bufer 1920×1080 bo'ladi va video HD chiqadi.
  const RES = {
    viewport: null,
    '720':  [1280, 720],
    '1080': [1920, 1080],
    '1440': [2560, 1440],
    '2160': [3840, 2160],
  };

  function _setRes(key) {
    const r = RES[key];
    const cv = _canvas();
    _prevState.bufW = renderer.domElement.width;
    _prevState.bufH = renderer.domElement.height;
    _prevState.aspect = camera.aspect;
    _prevState.pr = renderer.getPixelRatio();
    _prevState.dynRes = null;

    if (!r) return;   // viewport — tegmaymiz

    // ⚠ Dinamik rezolyutsiya yozuvni buzadi: FPS 30 dan tushsa
    // pixelRatio ni o'zi pasaytiradi va video xiralashadi.
    if (typeof _drEnabled !== 'undefined') {
      _prevState.dynRes = true;
      if (window.toggleDynamicRes && _drEnabled) { window.toggleDynamicRes(); _prevState.dynResWasOn = true; }
    }
    renderer.setPixelRatio(1);
    renderer.setSize(r[0], r[1], false);   // false → CSS o'lchami o'zgarmaydi
    camera.aspect = r[0] / r[1];
    camera.updateProjectionMatrix();
    log(`📐 Yozuv rezolyutsiyasi: ${r[0]}×${r[1]}`, 'lok');
  }

  function _restoreRes() {
    if (!_prevState || _prevState.bufW == null) return;
    renderer.setPixelRatio(_prevState.pr || 1);
    renderer.setSize(_prevState.bufW, _prevState.bufH, false);
    camera.aspect = _prevState.aspect;
    camera.updateProjectionMatrix();
    if (_prevState.dynResWasOn && window.toggleDynamicRes) window.toggleDynamicRes();
    // CSS o'lchamiga qaytarish (tools.js resize bilan bir xil)
    const cv = _canvas();
    if (cv && cv.parentNode) {
      const w = cv.parentNode.clientWidth, h = cv.parentNode.clientHeight;
      if (w && h) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        camera.aspect = w / h; camera.updateProjectionMatrix();
      }
    }
  }

  // ── Yozishni boshlash ───────────────────────────────────────
  //  opts: { fps, bitrate, mime, camId, res, name }
  function start(opts) {
    if (_running) { log('⚠ Yozuv allaqachon ketyapti', 'lw'); return; }
    const cv = _canvas();
    if (!cv) { log('❌ Canvas topilmadi', 'le'); return; }
    if (typeof MediaRecorder === 'undefined') {
      log('❌ Brauzeringiz MediaRecorder ni qo\'llab-quvvatlamaydi', 'le'); return;
    }
    const sup = supported();
    if (!sup.length) { log('❌ Brauzer webm yozishni qo\'llab-quvvatlamaydi', 'le'); return; }

    _dur = duration();
    if (!_dur || _dur <= 0) {
      log('❌ Timeline bo\'sh — avval keyframe qo\'shing', 'le'); return;
    }

    const fps     = Math.max(10, Math.min(60, opts.fps || 30));
    const bitrate = Math.max(1, opts.bitrate || 12) * 1000000;
    const mime    = (sup.find(c => c.mime === opts.mime) || sup[0]).mime;

    // ── Holatni eslab qolamiz ──
    _prevState = {
      camPos: camera.position.clone(),
      camQuat: camera.quaternion.clone(),
      camFov: camera.fov,
      playing: (typeof isPlaying !== 'undefined') && isPlaying,
      activeCam: null,
      bufW: null, bufH: null, aspect: null, pr: null, dynResWasOn: false,
    };

    // 📐 Rezolyutsiyani O'RNATAMIZ — captureStream dan OLDIN,
    // aks holda oqim eski (kichik) o'lchamda qotib qoladi.
    _setRes(opts.res || 'viewport');
    // Yangi bufer bilan bir kadr chizamiz — oqim to'g'ri o'lchamni olsin
    try { renderer.render(scene, camera); } catch (e) {}
    if (opts.camId) {
      const c = objects.find(o => String(o.userData?.id) === String(opts.camId));
      if (c) {
        // Boshqa kameralarni o'chirib, shuni yoqamiz
        cameras().forEach(x => { if (x.userData._isActive) _prevState.activeCam = x.userData.id; x.userData._isActive = false; });
        c.userData._isActive = true;
        log(`🎬 Kamera: ${c.userData.name}`, 'lok');
      }
    }

    // ── Stream + Recorder ──
    try {
      _stream = cv.captureStream(fps);
    } catch (e) {
      log('❌ captureStream ishlamadi: ' + e.message, 'le'); return;
    }
    _chunks = [];
    try {
      _rec = new MediaRecorder(_stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    } catch (e) {
      log('❌ MediaRecorder: ' + e.message, 'le'); _cleanup(); return;
    }
    _rec.ondataavailable = e => { if (e.data && e.data.size) _chunks.push(e.data); };
    _rec.onstop = () => _finish(opts);
    _rec.onerror = e => { log('❌ Yozuv xatosi: ' + (e.error?.message || e), 'le'); _cleanup(); };

    _running = true;
    _startT = performance.now();

    // ── Timeline'ni boshdan o'ynatamiz ──
    if (window.tlStop) tlStop();
    if (window.tlSeek) tlSeek(0);
    else if (window.TimelineSystem) {
      // seek yo'q bo'lsa — playhead ni 0 ga surish uchun tracks ni qo'llaymiz
      try { TimelineSystem.tracks.forEach(t => TimelineSystem._interp && TimelineSystem._interp(t, 0)); } catch (e) {}
    }

    _rec.start(200);   // har 200ms da chunk
    if (window.tlPlay) tlPlay();
    log(`🎬 Yozuv — ${_dur.toFixed(1)}s · ${renderer.domElement.width}×${renderer.domElement.height} · ${fps}fps · ${(bitrate/1e6).toFixed(0)}Mbps`, 'lok');
    _showHUD();
    _tick();
  }

  // ── Har kadr: progress + tugash ─────────────────────────────
  function _tick() {
    if (!_running) return;
    const el = (performance.now() - _startT) / 1000;
    _updHUD(el);
    // Timeline tugadimi?
    const t = window.TimelineSystem ? TimelineSystem.currentTime : el;
    const done = (t >= _dur - 0.02) || (el >= _dur + 1.5);   // zaxira: +1.5s
    if (done) { stop(); return; }
    _raf = requestAnimationFrame(_tick);
  }

  function stop() {
    if (!_running) return;
    _running = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (window.tlStop) tlStop();
    try { if (_rec && _rec.state !== 'inactive') _rec.stop(); } catch (e) { _cleanup(); }
  }

  function _finish(opts) {
    const blob = new Blob(_chunks, { type: 'video/webm' });
    const mb = (blob.size / 1048576).toFixed(1);
    const name = (opts.name || 'apex-animatsiya').replace(/[^a-zA-Z0-9_\-]/g, '_') + '.webm';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

    log(`✅ ${name} — ${mb} MB, ${_dur.toFixed(1)}s`, 'lok');
    _cleanup();
  }

  function _cleanup() {
    _running = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_stream) { try { _stream.getTracks().forEach(t => t.stop()); } catch (e) {} }
    _stream = null; _rec = null; _chunks = [];
    _hideHUD();
    _restoreRes();   // 📐 rezolyutsiyani qaytaramiz
    // Kamera holatini tiklaymiz
    if (_prevState) {
      cameras().forEach(x => { x.userData._isActive = false; });
      if (_prevState.activeCam != null) {
        const c = objects.find(o => String(o.userData?.id) === String(_prevState.activeCam));
        if (c) c.userData._isActive = true;
      } else {
        camera.position.copy(_prevState.camPos);
        camera.quaternion.copy(_prevState.camQuat);
        camera.fov = _prevState.camFov;
        camera.updateProjectionMatrix();
      }
      _prevState = null;
    }
  }

  // ── HUD ─────────────────────────────────────────────────────
  let _hud = null;
  function _showHUD() {
    _hideHUD();
    _hud = document.createElement('div');
    _hud.id = 'anim-rec-hud';
    _hud.style.cssText = `position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:99999;
      background:rgba(10,14,20,.94);border:1px solid #ff3355;border-radius:5px;padding:9px 14px;
      display:flex;align-items:center;gap:10px;font-family:'Share Tech Mono',monospace;
      box-shadow:0 4px 24px rgba(0,0,0,.6)`;
    _hud.innerHTML = `
      <span id="arh-dot" style="width:9px;height:9px;border-radius:50%;background:#ff3355;
        box-shadow:0 0 8px #ff3355;animation:arhPulse 1s infinite"></span>
      <span style="font-size:11px;color:#ff3355;font-weight:700;letter-spacing:1px">REC</span>
      <span id="arh-time" style="font-size:11px;color:var(--text)">0.0 / ${_dur.toFixed(1)}s</span>
      <div style="width:120px;height:4px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden">
        <div id="arh-bar" style="width:0%;height:100%;background:#ff3355;transition:width .1s linear"></div>
      </div>
      <button onclick="AnimExport.stop()" style="background:none;border:1px solid rgba(255,255,255,.25);
        color:var(--muted);font-size:9px;padding:3px 8px;border-radius:3px;cursor:pointer;
        font-family:'Share Tech Mono',monospace">■ To'xtatish</button>`;
    if (!document.getElementById('arh-style')) {
      const st = document.createElement('style'); st.id = 'arh-style';
      st.textContent = '@keyframes arhPulse{0%,100%{opacity:1}50%{opacity:.25}}';
      document.head.appendChild(st);
    }
    document.body.appendChild(_hud);
  }
  function _updHUD(el) {
    if (!_hud) return;
    const t = window.TimelineSystem ? TimelineSystem.currentTime : el;
    const p = Math.min(100, (t / _dur) * 100);
    const tm = _hud.querySelector('#arh-time'), br = _hud.querySelector('#arh-bar');
    if (tm) tm.textContent = `${t.toFixed(1)} / ${_dur.toFixed(1)}s`;
    if (br) br.style.width = p + '%';
  }
  function _hideHUD() { if (_hud && _hud.parentNode) _hud.parentNode.removeChild(_hud); _hud = null; }

  return { start, stop, duration, hasTracks, cameras, supported, isRecording: () => _running };
})();

window.AnimExport = AnimExport;

// ── PANEL ─────────────────────────────────────────────────────
window.showAnimExportPanel = function () {
  const old = document.getElementById('anim-exp-modal');
  if (old) old.remove();

  const sup = AnimExport.supported();
  const dur = AnimExport.duration();
  const cams = AnimExport.cameras();
  const cv = document.getElementById('three-canvas');
  // ⚠ MUHIM: video o'lchami = CHIZISH BUFERI (canvas.width), CSS emas
  const bw = (typeof renderer !== 'undefined' && renderer.domElement) ? renderer.domElement.width : 0;
  const bh = (typeof renderer !== 'undefined' && renderer.domElement) ? renderer.domElement.height : 0;
  const res = bw ? `${bw}×${bh}` : '?';
  const isLow = bh > 0 && bh < 700;

  const bd = document.createElement('div');
  bd.id = 'anim-exp-modal';
  bd.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99998;
    display:flex;align-items:center;justify-content:center`;
  bd.onclick = e => { if (e.target === bd) bd.remove(); };

  const m = document.createElement('div');
  m.style.cssText = `background:var(--panel,#0e1218);border:1px solid var(--border,#2a3a4a);
    border-radius:6px;width:400px;max-width:92vw;max-height:88vh;overflow-y:auto;
    font-family:'Share Tech Mono',monospace;box-shadow:0 12px 48px rgba(0,0,0,.7)`;

  const err = !sup.length ? 'Brauzeringiz webm yozishni qo\'llab-quvvatlamaydi'
            : !dur ? 'Timeline bo\'sh — avval keyframe qo\'shing' : null;

  m.innerHTML = `
    <div style="padding:11px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
      <span style="font-size:15px">🎬</span>
      <span style="flex:1;font-size:12px;color:var(--text);font-weight:700;letter-spacing:1px">ANIMATSIYA → VIDEO</span>
      <button onclick="document.getElementById('anim-exp-modal').remove()"
        style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;line-height:1">×</button>
    </div>
    <div style="padding:14px">
      ${err ? `<div style="font-size:10px;color:#ff5555;line-height:1.6;padding:9px 11px;
        background:rgba(255,85,85,.07);border:1px solid rgba(255,85,85,.3);border-radius:3px">
        ⚠ ${err}</div>` : `
      <div style="display:flex;gap:14px;font-size:9px;color:var(--muted);margin-bottom:11px">
        <span>⏱ <b style="color:var(--text)">${dur.toFixed(1)}s</b></span>
        <span>🎞 <b style="color:var(--text)">${(window.TimelineSystem?.tracks?.length)||0}</b> trek</span>
        <span>🖥 bufer <b style="color:${isLow?'#ff8844':'var(--text)'}">${res}</b></span>
      </div>

      <div style="font-size:9px;color:var(--muted);margin-bottom:4px">📐 REZOLYUTSIYA</div>
      <select id="ae-res" onchange="window._aeResInfo()" style="width:100%;background:rgba(0,0,0,.35);
        border:1px solid var(--border);color:var(--text);border-radius:3px;padding:6px 8px;
        font-family:inherit;font-size:11px;outline:none">
        <option value="1080" selected>🎯 1920×1080 — Full HD</option>
        <option value="720">1280×720 — HD</option>
        <option value="1440">2560×1440 — 2K</option>
        <option value="2160">3840×2160 — 4K (og'ir!)</option>
        <option value="viewport">Viewport — ${res} ${isLow?'⚠ past':''}</option>
      </select>
      <div id="ae-res-info" style="font-size:8px;color:var(--accent3);margin-top:4px;line-height:1.5;
        padding:5px 7px;background:rgba(var(--accent3-rgb),.06);border:1px solid rgba(var(--accent3-rgb),.25);border-radius:2px"></div>

      <div style="font-size:9px;color:var(--muted);margin-bottom:4px">KAMERA</div>
      <select id="ae-cam" style="width:100%;background:rgba(0,0,0,.35);border:1px solid var(--border);
        color:var(--text);border-radius:3px;padding:6px 8px;font-family:inherit;font-size:11px;outline:none">
        <option value="">🎥 Hozirgi ko'rinish (timeline kamerasi)</option>
        ${cams.map(c => `<option value="${c.userData.id}">📹 ${c.userData.name}</option>`).join('')}
      </select>
      ${!cams.length ? `<div style="font-size:8px;color:var(--border);margin-top:3px">
        Sahnada kamera obyekti yo'q — timeline kamera trekiga tayanadi.</div>` : ''}

      <div style="display:flex;gap:8px;margin-top:11px">
        <div style="flex:1">
          <div style="font-size:9px;color:var(--muted);margin-bottom:4px">FPS</div>
          <select id="ae-fps" style="width:100%;background:rgba(0,0,0,.35);border:1px solid var(--border);
            color:var(--text);border-radius:3px;padding:6px 8px;font-family:inherit;font-size:11px;outline:none">
            <option value="24">24 — kino</option>
            <option value="30" selected>30 — standart</option>
            <option value="60">60 — silliq</option>
          </select>
        </div>
        <div style="flex:1">
          <div style="font-size:9px;color:var(--muted);margin-bottom:4px">SIFAT</div>
          <select id="ae-br" style="width:100%;background:rgba(0,0,0,.35);border:1px solid var(--border);
            color:var(--text);border-radius:3px;padding:6px 8px;font-family:inherit;font-size:11px;outline:none">
            <option value="5">Past — 5 Mbps</option>
            <option value="12" selected>O'rta — 12 Mbps</option>
            <option value="25">Yuqori — 25 Mbps</option>
            <option value="50">Maks — 50 Mbps</option>
          </select>
        </div>
      </div>

      <div style="font-size:9px;color:var(--muted);margin:11px 0 4px">KODEK</div>
      <select id="ae-mime" style="width:100%;background:rgba(0,0,0,.35);border:1px solid var(--border);
        color:var(--text);border-radius:3px;padding:6px 8px;font-family:inherit;font-size:11px;outline:none">
        ${sup.map((c, i) => `<option value="${c.mime}" ${i===0?'selected':''}>${c.name} — ${c.note}</option>`).join('')}
      </select>

      <div style="font-size:9px;color:var(--muted);margin:11px 0 4px">FAYL NOMI</div>
      <input id="ae-name" value="apex-animatsiya" style="width:100%;background:rgba(0,0,0,.35);
        border:1px solid var(--border);color:var(--text);border-radius:3px;padding:6px 8px;
        font-family:inherit;font-size:11px;outline:none;box-sizing:border-box">

      <div style="font-size:8px;color:#ff8844;margin-top:12px;line-height:1.6;padding:8px 10px;
        background:rgba(255,136,68,.06);border:1px solid rgba(255,136,68,.22);border-radius:3px">
        ⚠ <b>Real vaqt yozuv</b> — brauzer nima chizsa, o'sha yoziladi. Yozuv aynan
        <b>${dur.toFixed(1)} soniya</b> davom etadi.<br>
        <span style="color:var(--border)">Yozuv paytida dinamik rezolyutsiya avtomatik o'chadi
        (u FPS tushsa sifatni pasaytirardi). 4K og'ir — FPS tushsa video sekinlashadi.</span>
      </div>

      <button onclick="window._aeStart()" style="width:100%;margin-top:13px;padding:10px;
        background:rgba(255,51,85,.12);border:1px solid #ff3355;color:#ff3355;
        font-family:inherit;font-size:12px;font-weight:700;border-radius:4px;cursor:pointer;
        letter-spacing:1px">⏺ YOZISHNI BOSHLASH</button>
      `}
    </div>`;
  bd.appendChild(m);
  document.body.appendChild(bd);
  if (!err) setTimeout(() => window._aeResInfo(), 0);
};

window._aeResInfo = function () {
  const el = document.getElementById('ae-res-info');
  const v = document.getElementById('ae-res')?.value;
  if (!el) return;
  const R = { '720':[1280,720], '1080':[1920,1080], '1440':[2560,1440], '2160':[3840,2160] };
  if (!R[v]) {
    const bw = renderer?.domElement?.width || 0, bh = renderer?.domElement?.height || 0;
    el.style.color = bh < 700 ? '#ff8844' : 'var(--accent3)';
    el.style.background = bh < 700 ? 'rgba(255,136,68,.06)' : 'rgba(var(--accent3-rgb),.06)';
    el.style.borderColor = bh < 700 ? 'rgba(255,136,68,.3)' : 'rgba(var(--accent3-rgb),.25)';
    el.innerHTML = bh < 700
      ? `⚠ Viewport kichik — video <b>${bw}×${bh}</b> bo'ladi (~${bh >= 700 ? '720p' : bh >= 500 ? '576p' : '480p'}). Yuqoridagi variantlardan birini tanlang.`
      : `Viewport o'lchami: <b>${bw}×${bh}</b>`;
    return;
  }
  el.style.color = 'var(--accent3)';
  el.style.background = 'rgba(var(--accent3-rgb),.06)';
  el.style.borderColor = 'rgba(var(--accent3-rgb),.25)';
  el.innerHTML = `✅ Video <b>${R[v][0]}×${R[v][1]}</b> bo'ladi — viewport kichik bo'lsa ham.<br>
    <span style="color:var(--border)">Yozuv paytida chizish buferi shu o'lchamga o'tadi. Ekranda tasvir
    cho'zilgandek ko'rinishi mumkin — bu normal, video to'g'ri chiqadi.</span>`;
};

window._aeStart = function () {
  const g = id => document.getElementById(id);
  const opts = {
    camId:   g('ae-cam')?.value || null,
    fps:     parseInt(g('ae-fps')?.value) || 30,
    bitrate: parseInt(g('ae-br')?.value) || 12,
    mime:    g('ae-mime')?.value,
    res:     g('ae-res')?.value || '1080',
    name:    g('ae-name')?.value || 'apex-animatsiya',
  };
  document.getElementById('anim-exp-modal')?.remove();
  setTimeout(() => AnimExport.start(opts), 120);
};
