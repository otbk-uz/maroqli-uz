// ============================================================
//  📊 O'YIN HUD — FPS va koordinatalar  (build 58.52)
// ------------------------------------------------------------
//  Konsol komandalari bilan boshqariladi:
//      fps_show 1 top-left 1.0
//      show_coordinats 1 bottom-right 1.2
//
//  ── ⚠ NEGA ALOHIDA MODUL ────────────────────────────────────
//    Muharrirdagi `#fps-ov` — REDAKTOR asbobi va o'yinda CSS bilan
//    yashiriladi (`game-zip.js`). Uni o'yinda qayta yoqsak,
//    yonidagi "Obj / Tri / Vaqt" ham chiqib, o'yinchi uchun
//    keraksiz ma'lumot ko'rsatardi.
//
//  ── ⚠ NEGA `requestAnimationFrame` EMAS ─────────────────────
//    HUD `main-loop` dan yangilanadi: o'sha yerda `delta` bor va
//    o'yin to'xtaganda (⏹ Stop) hisob ham to'xtaydi. O'z siklini
//    yasasak, ikkita mustaqil sikl paydo bo'lib, biri ikkinchisidan
//    keyin qolardi.
// ============================================================

window.GameHUD = (() => {
  'use strict';

  const POS = {
    'top-left':     'top:10px;left:12px;text-align:left',
    'top-right':    'top:10px;right:12px;text-align:right',
    'top':          'top:10px;left:50%;transform:translateX(-50%);text-align:center',
    'bottom-left':  'bottom:10px;left:12px;text-align:left',
    'bottom-right': 'bottom:10px;right:12px;text-align:right',
    'bottom':       'bottom:10px;left:50%;transform:translateX(-50%);text-align:center',
    'left':         'top:50%;left:12px;transform:translateY(-50%);text-align:left',
    'right':        'top:50%;right:12px;transform:translateY(-50%);text-align:right',
  };
  const ALIASES = { top: 'top', bottom: 'bottom', left: 'left', right: 'right' };

  const fps = { on: false, pos: 'top-left', scale: 1, color: 'var(--accent3)' };
  const crd = { on: false, pos: 'bottom-left', scale: 1, color: 'var(--accent)' };

  // ⚠ FPS ni HAR KADR ko'rsatsak raqam titrab o'qib bo'lmasdi.
  //   Shuning uchun 0.25 s oynada o'rtacha olinadi.
  let _acc = 0, _frames = 0, _fpsVal = 0;

  function _el(id, c) {
    let e = document.getElementById(id);
    if (!e) {
      e = document.createElement('div');
      e.id = id;
      (document.getElementById('cvp') || document.body).appendChild(e);
    }
    e.style.cssText =
      'position:absolute;z-index:57;pointer-events:none;' +
      "font-family:'Share Tech Mono',monospace;font-weight:700;line-height:1.35;" +
      'text-shadow:0 2px 8px rgba(0,0,0,.85);white-space:pre;' +
      `color:${c.color};font-size:${(13 * (c.scale || 1)).toFixed(1)}px;` +
      (POS[c.pos] || POS['top-left']);
    return e;
  }
  function _kill(id) { const e = document.getElementById(id); if (e) e.remove(); }

  /** Nomni tekshiradi: `left` → `left`, noto'g'ri bo'lsa `null`. */
  function normPos(p) {
    const s = String(p || '').toLowerCase().trim();
    if (POS[s]) return s;
    if (ALIASES[s]) return ALIASES[s];
    return null;
  }

  function setFps(on, pos, scale, color) {
    if (on !== undefined) fps.on = !!on;
    if (pos) { const p = normPos(pos); if (p) fps.pos = p; else return false; }
    if (scale !== undefined && scale !== null) fps.scale = Math.max(0.3, Math.min(6, +scale || 1));
    if (color) fps.color = color;
    if (!fps.on) _kill('apex-hud-fps');
    return true;
  }
  function setCoords(on, pos, scale, color) {
    if (on !== undefined) crd.on = !!on;
    if (pos) { const p = normPos(pos); if (p) crd.pos = p; else return false; }
    if (scale !== undefined && scale !== null) crd.scale = Math.max(0.3, Math.min(6, +scale || 1));
    if (color) crd.color = color;
    if (!crd.on) _kill('apex-hud-crd');
    return true;
  }

  /** Koordinata manbai: o'yinchi bo'lsa u, bo'lmasa kamera. */
  function _pos() {
    try {
      if (typeof PlayerController !== 'undefined' && PlayerController.obj) {
        const p = new THREE.Vector3();
        PlayerController.obj.getWorldPosition(p);
        return { p, who: 'oyinchi' };
      }
      if (typeof camera !== 'undefined' && camera) {
        const p = new THREE.Vector3();
        camera.getWorldPosition(p);
        return { p, who: 'kamera' };
      }
    } catch (e) {}
    return null;
  }

  function update(delta) {
    const dt = delta || 0.016;
    _acc += dt; _frames++;
    if (_acc >= 0.25) { _fpsVal = Math.round(_frames / _acc); _acc = 0; _frames = 0; }

    if (fps.on) {
      const e = _el('apex-hud-fps', fps);
      // ⚠ 30 dan past bo'lsa sariq, 20 dan past bo'lsa qizil —
      //   raqamni o'qimasdan ham holat ko'rinsin.
      e.style.color = _fpsVal < 20 ? '#ff4444' : _fpsVal < 30 ? '#ffcc00' : fps.color;
      e.textContent = `FPS ${_fpsVal}`;
    }
    if (crd.on) {
      const r = _pos();
      const e = _el('apex-hud-crd', crd);
      e.textContent = r
        ? `X ${r.p.x.toFixed(1)}\nY ${r.p.y.toFixed(1)}\nZ ${r.p.z.toFixed(1)}`
        : 'X —\nY —\nZ —';
    }
  }

  // ⏹ Stop — HUD yopiladi (u O'YIN ko'rsatkichi, muharrirniki emas)
  let _was = false;
  function tick(delta) {
    const p = (typeof isPlaying !== 'undefined' && isPlaying);
    if (p !== _was) {
      _was = p;
      if (!p) { _kill('apex-hud-fps'); _kill('apex-hud-crd'); }
    }
    if (!p) return;
    update(delta);
  }

  function serialize() {
    return { fps: Object.assign({}, fps), crd: Object.assign({}, crd) };
  }
  function restore(d) {
    if (!d) return;
    if (d.fps) Object.assign(fps, d.fps);
    if (d.crd) Object.assign(crd, d.crd);
  }

  return { POS, fps, crd, setFps, setCoords, normPos, update: tick, serialize, restore,
           fpsValue: () => _fpsVal };
})();
