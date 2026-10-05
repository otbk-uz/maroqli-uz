// ============================================================
// APEX3D — Color Grade / Filtrlar
// ------------------------------------------------------------
// Header'dagi 🎨 tugma orqali ochiladigan filtr paneli. Butun o'yin
// ko'rinishiga jonli post-processing qo'llaydi (WebGL pipeline'ga
// tegmasdan): CSS filter + jonli SVG filter grafi + overlay qatlamlar.
//
// Guruhlar: Rang kanallari (R/G/B), Yorug'lik (brightness/exposure/
// contrast/gamma/shadows/highlights), Rang (saturation/vibrance/
// temperature/tint/hue), Effektlar (grayscale/sepia/blur/sharpen/
// noise/grain/bloom/vignette/glow), Maxsus presetlar (invert/pixelate/
// mosaic/oil/sketch/HDR/vintage/cinematic/retro/VHS/polaroid).
//
// O'chirib/yoqib qo'yiladi, Reset bor, sozlamalar localStorage'da saqlanadi.
// ============================================================

const ColorGrade = (() => {
  'use strict';

  const LS_KEY = 'apex_colorgrade_v1';

  // ── Neytral (ta'sirsiz) default sozlamalar ───────────────────
  function neutral() {
    return {
      enabled: true,
      // Rang kanallari (gain 0..2, 1 = neytral)
      red: 1, green: 1, blue: 1,
      // Yorug'lik
      brightness: 1, exposure: 0, contrast: 1, gamma: 1, shadows: 0, highlights: 0,
      // Rang
      saturation: 1, vibrance: 0, temperature: 0, tint: 0, hue: 0,
      // Effektlar
      grayscale: 0, sepia: 0, blur: 0, sharpen: 0, noise: 0, grain: 0,
      bloom: 0, vignette: 0, glow: 0,
      // Maxsus
      invert: 0, pixelate: 0, mosaic: 0, scanline: 0, chroma: 0, letterbox: 0,
    };
  }

  let s = neutral();
  let _grain_t = 0, _pixLoop = null;

  // ── DOM elementlari ──────────────────────────────────────────
  let _svgFilter, _overlayVign, _overlayGrain, _overlayBloom, _overlayScan,
      _overlayLetter, _pixCanvas, _pixCtx, _panel;

  function _cvp()    { return document.getElementById('cvp'); }
  function _canvas() { return document.getElementById('three-canvas'); }

  // ── Bir martalik: SVG filter defs + overlaylarni yaratish ────
  function _ensureDom() {
    if (_svgFilter) return;
    const cvp = _cvp(); if (!cvp) return;
    const gizmo = document.getElementById('gizmo-svg');
    // Gizmo/overlay tartibi: canvas < filtr overlaylar (z5/6) < gizmo (z10).
    if (gizmo && !gizmo.style.zIndex) gizmo.style.zIndex = '10';

    // SVG filter defs (butun sahifada, o'lchamsiz)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filt = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filt.setAttribute('id', 'apex-grade');
    filt.setAttribute('color-interpolation-filters', 'sRGB');
    defs.appendChild(filt); svg.appendChild(defs);
    document.body.appendChild(svg);
    _svgFilter = filt;

    const mkOverlay = (extra) => {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;' + (extra || '');
      cvp.insertBefore(d, gizmo || null);
      return d;
    };
    _overlayBloom  = mkOverlay('mix-blend-mode:screen;opacity:0');
    _overlayGrain  = mkOverlay('opacity:0;mix-blend-mode:overlay');
    _overlayScan   = mkOverlay('opacity:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0px,rgba(0,0,0,.35) 1px,transparent 1px,transparent 3px)');
    _overlayVign   = mkOverlay('opacity:0;background:radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.85) 130%)');
    _overlayLetter = mkOverlay('opacity:0');
    _overlayLetter.innerHTML =
      '<div style="position:absolute;top:0;left:0;right:0;height:11%;background:#000"></div>' +
      '<div style="position:absolute;bottom:0;left:0;right:0;height:11%;background:#000"></div>';

    // Pixelate/mosaic uchun overlay canvas
    _pixCanvas = document.createElement('canvas');
    _pixCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6;display:none;image-rendering:pixelated';
    cvp.insertBefore(_pixCanvas, gizmo || null);
    _pixCtx = _pixCanvas.getContext('2d');
  }

  // ── Sozlamalarni jonli qo'llash ──────────────────────────────
  // opts.transient=true → localStorage'ga yozmaydi va panelni sync qilmaydi
  // (timeline/animatsiya har frame chaqirganda ishlatiladi).
  function apply(opts) {
    opts = opts || {};
    _ensureDom();
    const cv = _canvas(); if (!cv) return;

    if (!s.enabled) {
      cv.style.filter = 'none';
      [_overlayVign, _overlayGrain, _overlayBloom, _overlayScan, _overlayLetter]
        .forEach(o => { if (o) o.style.opacity = '0'; });
      if (_pixCanvas) _pixCanvas.style.display = 'none';
      _stopPixLoop();
      return;
    }

    // ── SVG filter grafi (kanallar, exposure, gamma, shadows/highlights,
    //    temperature, tint, sharpen) ──
    const exp = Math.pow(2, s.exposure);
    const tR = s.temperature * 0.12, tB = -s.temperature * 0.12;
    const gG = s.tint * 0.12, gRB = -s.tint * 0.06;
    const rr = (s.red   * exp).toFixed(4);
    const gg = (s.green * exp).toFixed(4);
    const bb = (s.blue  * exp).toFixed(4);
    const offR = (tR + gRB).toFixed(4), offG = (gG).toFixed(4), offB = (tB + gRB).toFixed(4);

    let fx = '';
    // 1) kanal/exposure/temperature/tint — feColorMatrix
    const isChan = (s.red!==1||s.green!==1||s.blue!==1||s.exposure!==0||s.temperature!==0||s.tint!==0);
    if (isChan) {
      fx += `<feColorMatrix type="matrix" values="`
          + `${rr} 0 0 0 ${offR}  0 ${gg} 0 0 ${offG}  0 0 ${bb} 0 ${offB}  0 0 0 1 0"/>`;
    }
    // 2) gamma — feComponentTransfer
    if (s.gamma !== 1) {
      const e = (1 / Math.max(0.01, s.gamma)).toFixed(4);
      fx += `<feComponentTransfer>`
          + `<feFuncR type="gamma" exponent="${e}"/>`
          + `<feFuncG type="gamma" exponent="${e}"/>`
          + `<feFuncB type="gamma" exponent="${e}"/></feComponentTransfer>`;
    }
    // 3) shadows / highlights — table
    if (s.shadows !== 0 || s.highlights !== 0) {
      const a = Math.max(0, Math.min(0.6, s.shadows * 0.35)).toFixed(3);
      const c = Math.max(0.4, Math.min(1, 1 - s.highlights * 0.35)).toFixed(3);
      const tv = `${a} 0.5 ${c}`;
      fx += `<feComponentTransfer>`
          + `<feFuncR type="table" tableValues="${tv}"/>`
          + `<feFuncG type="table" tableValues="${tv}"/>`
          + `<feFuncB type="table" tableValues="${tv}"/></feComponentTransfer>`;
    }
    // 4) sharpen — feConvolveMatrix
    if (s.sharpen > 0) {
      const k = (s.sharpen * 1.2).toFixed(3);
      const center = (1 + 4 * s.sharpen * 1.2).toFixed(3);
      fx += `<feConvolveMatrix order="3" preserveAlpha="true" `
          + `kernelMatrix="0 -${k} 0  -${k} ${center} -${k}  0 -${k} 0"/>`;
    }
    const useSvg = fx.length > 0;
    if (useSvg) _svgFilter.innerHTML = fx;

    // ── CSS filter (tez, GPU): brightness/contrast/saturate/sepia/
    //    grayscale/hue/invert/blur + url(#apex-grade) ──
    const sat = (s.saturation * (1 + s.vibrance * 0.45)).toFixed(3);
    const parts = [];
    if (useSvg)            parts.push('url(#apex-grade)');
    if (s.brightness !== 1) parts.push(`brightness(${s.brightness})`);
    if (s.contrast   !== 1) parts.push(`contrast(${s.contrast})`);
    if (sat !== '1.000')    parts.push(`saturate(${sat})`);
    if (s.sepia > 0)        parts.push(`sepia(${s.sepia})`);
    if (s.grayscale > 0)    parts.push(`grayscale(${s.grayscale})`);
    if (s.hue !== 0)        parts.push(`hue-rotate(${s.hue}deg)`);
    if (s.invert > 0)       parts.push(`invert(${s.invert})`);
    if (s.blur > 0)         parts.push(`blur(${s.blur.toFixed(2)}px)`);
    cv.style.filter = parts.length ? parts.join(' ') : 'none';

    // ── Overlaylar ──
    _overlayVign.style.opacity = String(Math.min(1, s.vignette));
    _overlayLetter.style.opacity = String(Math.min(1, s.letterbox));

    // Bloom / Glow — yorug' pardali oq overlay + backdrop blur
    const bloom = Math.max(s.bloom, s.glow);
    if (bloom > 0) {
      _overlayBloom.style.opacity = String(Math.min(0.8, bloom * 0.6));
      _overlayBloom.style.background = `rgba(255,255,255,${(bloom*0.10).toFixed(3)})`;
      _overlayBloom.style.backdropFilter = `blur(${(bloom*6).toFixed(1)}px) brightness(${1+bloom*0.25})`;
      _overlayBloom.style.webkitBackdropFilter = _overlayBloom.style.backdropFilter;
    } else {
      _overlayBloom.style.opacity = '0';
      _overlayBloom.style.backdropFilter = 'none';
      _overlayBloom.style.webkitBackdropFilter = 'none';
    }

    // Scanline (VHS/retro)
    _overlayScan.style.opacity = String(Math.min(1, s.scanline));

    // Grain / Noise
    const grainAmt = Math.max(s.noise, s.grain);
    if (grainAmt > 0) {
      if (!_overlayGrain.style.backgroundImage || _overlayGrain.dataset.set !== '1') {
        _overlayGrain.style.backgroundImage = `url("${_noiseDataURL()}")`;
        _overlayGrain.style.backgroundRepeat = 'repeat';
        _overlayGrain.dataset.set = '1';
      }
      _overlayGrain.style.opacity = String(Math.min(0.6, grainAmt * 0.6));
    } else {
      _overlayGrain.style.opacity = '0';
    }

    // Chroma (VHS chromatic aberration) — canvasga rangli drop-shadow
    if (s.chroma > 0) {
      const px = (s.chroma * 3).toFixed(1);
      const shadow = ` drop-shadow(${px}px 0 0 rgba(255,0,0,.5)) drop-shadow(-${px}px 0 0 rgba(0,255,255,.5))`;
      cv.style.filter = (cv.style.filter === 'none' ? '' : cv.style.filter) + shadow;
    }

    // Pixelate / Mosaic
    const block = Math.max(s.pixelate, s.mosaic);
    if (block > 0) { _startPixLoop(); } else { _stopPixLoop(); if (_pixCanvas) _pixCanvas.style.display = 'none'; }

    if (!opts.transient) { _save(); _syncPanel(); }
  }

  // ── Pixelate/Mosaic — canvasni past o'lchamda qayta chizish ──
  function _startPixLoop() {
    if (_pixLoop) return;
    _pixCanvas.style.display = 'block';
    const src = _canvas();
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');
    const step = () => {
      if (!s.enabled || Math.max(s.pixelate, s.mosaic) <= 0) { _pixLoop = null; _pixCanvas.style.display='none'; return; }
      const w = src.clientWidth || src.width, h = src.clientHeight || src.height;
      if (w && h) {
        // mosaic = kattaroq bloklar
        const amt = Math.max(s.pixelate, s.mosaic * 1.8);
        const block = Math.max(2, Math.round(2 + amt * 60));  // 2..~62 px
        const lw = Math.max(1, Math.round(w / block));
        const lh = Math.max(1, Math.round(h / block));
        off.width = lw; off.height = lh;
        _pixCanvas.width = w; _pixCanvas.height = h;
        octx.imageSmoothingEnabled = false;
        try {
          octx.drawImage(src, 0, 0, lw, lh);
          _pixCtx.imageSmoothingEnabled = false;
          _pixCtx.clearRect(0, 0, w, h);
          _pixCtx.drawImage(off, 0, 0, lw, lh, 0, 0, w, h);
        } catch (e) { /* WebGL o'qib bo'lmasa — jim */ }
      }
      _pixLoop = requestAnimationFrame(step);
    };
    _pixLoop = requestAnimationFrame(step);
  }
  function _stopPixLoop() {
    if (_pixLoop) { cancelAnimationFrame(_pixLoop); _pixLoop = null; }
  }

  // Kichik protsedural shovqin (data URL)
  let _noiseCache = null;
  function _noiseDataURL() {
    if (_noiseCache) return _noiseCache;
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const cx = c.getContext('2d'); const img = cx.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255;
    }
    cx.putImageData(img, 0, 0);
    _noiseCache = c.toDataURL('image/png');
    return _noiseCache;
  }

  // ── Presetlar (maxsus filtrlar) ──────────────────────────────
  const PRESETS = {
    'Yo\'q':        () => neutral(),
    'Invert':       b => { b.invert = 1; },
    'Grayscale':    b => { b.grayscale = 1; },
    'Sepia':        b => { b.sepia = 0.85; b.temperature = 0.15; b.contrast = 1.05; },
    'Vintage':      b => { b.sepia = 0.3; b.temperature = 0.28; b.contrast = 1.12; b.saturation = 0.85; b.vignette = 0.45; b.grain = 0.18; },
    'Cinematic':    b => { b.temperature = 0.16; b.tint = -0.05; b.contrast = 1.18; b.saturation = 1.05; b.vignette = 0.38; b.letterbox = 1; b.bloom = 0.15; b.shadows = 0.1; },
    'Retro':        b => { b.saturation = 1.35; b.contrast = 1.12; b.hue = 12; b.sepia = 0.12; b.scanline = 0.35; },
    'VHS':          b => { b.scanline = 0.7; b.noise = 0.28; b.hue = 6; b.saturation = 1.25; b.chroma = 0.7; b.blur = 0.4; b.contrast = 1.05; },
    'Polaroid':     b => { b.temperature = 0.22; b.brightness = 1.06; b.contrast = 0.95; b.saturation = 0.9; b.vignette = 0.32; b.tint = 0.05; },
    'HDR':          b => { b.contrast = 1.22; b.vibrance = 0.45; b.sharpen = 0.3; b.bloom = 0.2; b.shadows = 0.2; b.highlights = 0.12; b.saturation = 1.1; },
    'Sketch':       b => { b.grayscale = 1; b.contrast = 1.7; b.sharpen = 0.85; b.brightness = 1.12; },
    'Oil Paint':    b => { b.blur = 0.6; b.saturation = 1.25; b.contrast = 1.06; b.bloom = 0.12; },
    'Cinematic LUT':b => { b.temperature = 0.22; b.tint = -0.08; b.contrast = 1.24; b.saturation = 0.95; b.vignette = 0.42; b.shadows = 0.15; b.highlights = 0.08; b.letterbox = 1; },
  };

  function applyPreset(name) {
    const base = neutral();
    const fn = PRESETS[name];
    if (fn) { const r = fn(base); if (r) s = r; else s = base; }
    s.enabled = true;
    apply();
  }

  function reset() { const en = s.enabled; s = neutral(); s.enabled = en; apply(); }
  function setEnabled(on) { s.enabled = !!on; apply(); }
  function set(key, val) { if (key in s) { s[key] = val; apply(); } }

  // ── Timeline / animatsiya integratsiyasi ─────────────────────
  // Sozlamalar obyektini bir zarbada qo'llash (raqamli maydonlarni ham).
  function applySettings(obj, transient) {
    if (!obj) return;
    for (const k in s) { if (k in obj) s[k] = obj[k]; }
    if (obj.enabled === undefined) s.enabled = true;   // animatsiya paytida yoniq
    apply({ transient: !!transient });
  }

  // Keyframe animatsiyasini mustaqil ijro etish (hitbox/tugma/skript uchun).
  // keyframes: [{time, filter:{...}}, ...] (ColorGrade sozlamalari)
  let _animRAF = null, _animStart = 0;
  function playKeyframes(keyframes, opts) {
    opts = opts || {};
    stopAnim();
    if (!Array.isArray(keyframes) || keyframes.length === 0) return;
    const kfs = keyframes.slice().sort((a, b) => a.time - b.time);
    const t0 = kfs[0].time, t1 = kfs[kfs.length - 1].time;
    const dur = Math.max(0.001, t1 - t0);
    const speed = opts.speed || 1;
    const loop = !!opts.loop;
    _animStart = performance.now();

    const sample = (localT) => {
      if (localT <= kfs[0].time)             return kfs[0].filter;
      if (localT >= kfs[kfs.length-1].time)  return kfs[kfs.length-1].filter;
      for (let i = 0; i < kfs.length - 1; i++) {
        const a = kfs[i], b = kfs[i+1];
        if (localT >= a.time && localT <= b.time) {
          const al = (localT - a.time) / Math.max(1e-6, (b.time - a.time));
          const out = {};
          for (const k in a.filter) {
            const av = a.filter[k], bv = b.filter[k];
            out[k] = (typeof av === 'number' && typeof bv === 'number') ? av + (bv - av) * al : (al < 0.5 ? av : bv);
          }
          return out;
        }
      }
      return kfs[kfs.length-1].filter;
    };

    const step = () => {
      let elapsed = ((performance.now() - _animStart) / 1000) * speed;
      if (loop) elapsed = elapsed % dur;
      const localT = t0 + Math.min(elapsed, dur);
      applySettings(sample(localT), true);
      if (!loop && elapsed >= dur) { _animRAF = null; if (opts.onDone) opts.onDone(); return; }
      _animRAF = requestAnimationFrame(step);
    };
    _animRAF = requestAnimationFrame(step);
  }
  function stopAnim() { if (_animRAF) { cancelAnimationFrame(_animRAF); _animRAF = null; } }

  // ── Persistence ──────────────────────────────────────────────
  function _save() { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {} }
  function _load() {
    try { const j = localStorage.getItem(LS_KEY); if (j) s = Object.assign(neutral(), JSON.parse(j)); } catch (e) {}
  }

  // ── UI panel ─────────────────────────────────────────────────
  const GROUPS = [
    ['Rang kanallari', [
      ['🔴 Red', 'red', 0, 2, 0.01], ['🟢 Green', 'green', 0, 2, 0.01], ['🔵 Blue', 'blue', 0, 2, 0.01],
    ]],
    ['Yorug\'lik', [
      ['☀️ Brightness', 'brightness', 0, 2, 0.01], ['🌑 Exposure', 'exposure', -2, 2, 0.02],
      ['🌗 Contrast', 'contrast', 0, 2, 0.01], ['⚫ Gamma', 'gamma', 0.2, 3, 0.01],
      ['🌫️ Shadows', 'shadows', -1, 1, 0.02], ['✨ Highlights', 'highlights', -1, 1, 0.02],
    ]],
    ['Rang', [
      ['🌈 Saturation', 'saturation', 0, 2, 0.01], ['🎨 Vibrance', 'vibrance', -1, 1, 0.02],
      ['🌡️ Temperature', 'temperature', -1, 1, 0.02], ['💜 Tint', 'tint', -1, 1, 0.02],
      ['🔄 Hue', 'hue', -180, 180, 1],
    ]],
    ['Effektlar', [
      ['🖤 Grayscale', 'grayscale', 0, 1, 0.01], ['🟤 Sepia', 'sepia', 0, 1, 0.01],
      ['🌫️ Blur', 'blur', 0, 8, 0.1], ['✨ Sharpen', 'sharpen', 0, 1, 0.02],
      ['📺 Noise', 'noise', 0, 1, 0.02], ['🎞️ Film Grain', 'grain', 0, 1, 0.02],
      ['💨 Bloom', 'bloom', 0, 1, 0.02], ['🌈 Vignette', 'vignette', 0, 1, 0.02],
      ['🌟 Glow', 'glow', 0, 1, 0.02], ['🧊 Pixelate', 'pixelate', 0, 1, 0.02],
      ['🌀 Mosaic', 'mosaic', 0, 1, 0.02], ['🎭 Invert', 'invert', 0, 1, 0.02],
    ]],
  ];

  function _buildPanel() {
    if (_panel) return _panel;
    _injectCSS();
    const p = document.createElement('div');
    p.id = 'cg-panel';
    p.style.display = 'none';
    _panel = p;
    document.body.appendChild(p);
    _renderPanel();
    return p;
  }

  function _renderPanel() {
    if (!_panel) return;
    const presetBtns = Object.keys(PRESETS).map(n =>
      `<button class="cg-preset" onclick="ColorGrade.preset('${n.replace(/'/g,"\\'")}')">${n}</button>`).join('');
    let sliders = '';
    for (const [title, rows] of GROUPS) {
      sliders += `<div class="cg-grp-title">${title}</div>`;
      for (const [label, key, min, max, step] of rows) {
        const v = s[key];
        sliders += `<div class="cg-row">
          <span class="cg-lbl">${label}</span>
          <input class="cg-sl" type="range" min="${min}" max="${max}" step="${step}" value="${v}"
                 oninput="ColorGrade.set('${key}',parseFloat(this.value));this.nextElementSibling.textContent=(+this.value).toFixed(2)">
          <span class="cg-val">${(+v).toFixed(2)}</span>
        </div>`;
      }
    }
    _panel.innerHTML = `
      <div class="cg-head">
        <span style="font-weight:800;letter-spacing:1px">🎨 FILTRLAR</span>
        <label class="cg-master"><input type="checkbox" ${s.enabled?'checked':''}
               onchange="ColorGrade.enable(this.checked)"> Yoniq</label>
        <button class="cg-x" onclick="ColorGrade.togglePanel()">✕</button>
      </div>
      <div class="cg-body">
        <button class="cg-tl" onclick="(window.TimelineSystem&&TimelineSystem.addFilterToTimeline)?TimelineSystem.addFilterToTimeline():(window.tlAddFilterToTimeline&&window.tlAddFilterToTimeline())">⏱ Timelinega qo'shish (keyframe I bilan)</button>
        <div class="cg-grp-title">🎬 Maxsus / Presetlar</div>
        <div class="cg-presets">${presetBtns}</div>
        ${sliders}
        <button class="cg-reset" onclick="ColorGrade.reset()">↺ Reset (neytral)</button>
      </div>`;
  }

  // Faqat qiymatlarni yangilash (to'liq re-render qilmasdan)
  function _syncPanel() {
    if (!_panel || _panel.style.display === 'none') return;
    const master = _panel.querySelector('.cg-master input');
    if (master) master.checked = s.enabled;
    _panel.querySelectorAll('.cg-sl').forEach(sl => {
      const key = sl.getAttribute('oninput').match(/set\('(\w+)'/);
      if (key && key[1] in s) {
        if (Math.abs(parseFloat(sl.value) - s[key[1]]) > 1e-6) {
          sl.value = s[key[1]];
          if (sl.nextElementSibling) sl.nextElementSibling.textContent = (+s[key[1]]).toFixed(2);
        }
      }
    });
  }

  function togglePanel() {
    _buildPanel();
    const open = _panel.style.display === 'none';
    if (open) { _renderPanel(); _panel.style.display = 'block'; }
    else _panel.style.display = 'none';
    const btn = document.getElementById('cg-btn');
    if (btn) btn.classList.toggle('active', open);
  }

  function _injectCSS() {
    if (document.getElementById('cg-style')) return;
    const st = document.createElement('style');
    st.id = 'cg-style';
    st.textContent = `
      #cg-panel{position:absolute;top:40px;right:10px;width:270px;max-height:78vh;overflow:hidden;
        background:var(--panel,#141821);border:1px solid var(--border,#2a3040);border-radius:8px;
        box-shadow:0 10px 40px rgba(0,0,0,.6);z-index:200;font-family:'Rajdhani',sans-serif;
        display:flex;flex-direction:column}
      #cg-panel .cg-head{display:flex;align-items:center;gap:8px;padding:8px 10px;
        border-bottom:1px solid var(--border,#2a3040);color:var(--text,#e8ecf4);font-size:12px;flex-shrink:0}
      #cg-panel .cg-master{margin-left:auto;font-size:10px;color:var(--muted,#8892a6);display:flex;align-items:center;gap:3px;cursor:pointer}
      #cg-panel .cg-x{background:none;border:none;color:var(--muted,#8892a6);cursor:pointer;font-size:13px;padding:0 2px}
      #cg-panel .cg-body{overflow-y:auto;padding:8px 10px 12px}
      #cg-panel .cg-grp-title{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1px;
        color:var(--accent2,#ff6b35);margin:10px 0 5px;text-transform:uppercase}
      #cg-panel .cg-grp-title:first-child{margin-top:2px}
      #cg-panel .cg-row{display:flex;align-items:center;gap:6px;margin:3px 0}
      #cg-panel .cg-lbl{font-size:10px;color:var(--text,#e8ecf4);width:95px;flex-shrink:0}
      #cg-panel .cg-sl{flex:1;height:3px;accent-color:var(--accent,var(--accent3))}
      #cg-panel .cg-val{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted,#8892a6);width:32px;text-align:right}
      #cg-panel .cg-presets{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:6px}
      #cg-panel .cg-preset{font-size:9px;padding:4px 2px;background:rgba(255,255,255,.05);
        border:1px solid var(--border,#2a3040);color:var(--text,#e8ecf4);border-radius:3px;cursor:pointer;
        font-family:'Rajdhani',sans-serif;font-weight:600}
      #cg-panel .cg-preset:hover{background:var(--accent2,#ff6b35);color:#000;border-color:var(--accent2,#ff6b35)}
      #cg-panel .cg-reset{width:100%;margin-top:10px;padding:6px;font-size:11px;font-weight:700;
        background:rgba(255,255,255,.05);border:1px solid var(--border,#2a3040);color:var(--text,#e8ecf4);
        border-radius:4px;cursor:pointer;font-family:'Rajdhani',sans-serif}
      #cg-panel .cg-reset:hover{background:rgba(255,68,68,.15);border-color:rgba(255,68,68,.4);color:#ff8888}
      #cg-panel .cg-tl{width:100%;margin-bottom:8px;padding:7px;font-size:11px;font-weight:700;
        background:rgba(var(--accent-rgb),.1);border:1px solid rgba(var(--accent-rgb),.4);color:var(--accent,var(--accent));
        border-radius:4px;cursor:pointer;font-family:'Rajdhani',sans-serif}
      #cg-panel .cg-tl:hover{background:rgba(var(--accent-rgb),.22)}`;
    document.head.appendChild(st);
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    _load();
    _ensureDom();
    apply();
  }

  // ── 💾 SystemRegistry shartnomasi ────────────────────────────
  //  ⚠ `getSettings`/`applySettings` ALLAQACHON bor edi, lekin
  //    saqlovchi ularni chaqirmasdi — rang gradatsiyasi (kontrast,
  //    to'yinganlik, vinyet, don) sahna bilan ko'chmasdi.
  function serialize() {
    try { const v = Object.assign({}, s); return (v && v.enabled !== undefined) ? v : null; }
    catch (e) { return null; }
  }
  function restore(d) {
    if (!d) return 0;
    try { applySettings(d); return 1; } catch (e) { return 0; }
  }

  return {
    serialize, restore,
    init, apply, reset, togglePanel,
    set, enable: setEnabled, preset: applyPreset,
    getSettings: () => Object.assign({}, s),
    applySettings, playKeyframes, stopAnim,
  };
})();

window.ColorGrade = ColorGrade;

// Hitbox / tugma / skriptdan chaqirish uchun qulay triggerlar.
// Timeline'dagi filtr keyframe'larini ijro etadi.
window.playFilterTimeline = function(opts) {
  const kfs = (window.TimelineSystem && TimelineSystem.getFilterKeyframes)
    ? TimelineSystem.getFilterKeyframes() : [];
  if (kfs.length) ColorGrade.playKeyframes(kfs, opts || {});
};
window.stopFilterTimeline = function() { ColorGrade.stopAnim(); };

// DOM tayyor bo'lgach ishga tushiramiz
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ColorGrade.init());
} else {
  ColorGrade.init();
}
