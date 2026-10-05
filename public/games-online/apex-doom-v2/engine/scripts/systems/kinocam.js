// ============================================================
//  🎬 KINO KAMERA (Кинематографическая)  v1.0  (build 58.30)
// ------------------------------------------------------------
//  Kamerani "og'ir" qiladi: burilish darhol emas, ozgina KECHIKIB
//  ergashadi va to'xtaganda sekinlashib tinchiydi. Burilish paytida
//  ekranning YON tomonlari blurlashadi.
//
//    🌀 Toyinchoqlik  — burilishda qanchalik ortda qoladi (0…1)
//    ⏱ To'xtash vaqti — burilish to'xtagach necha soniyada tinchiydi
//    🌫 Yon blur      — burilganda chetlar blurlashadimi
//    ↔ Blur cho'zilishi — blur chetdan qanchalik ichkariga kiradi
//
//  ── Ikki joyda yoqiladi ─────────────────────────────────────
//    📦 O'yinchi inspektorida  — UMUMIY (o'yin kamerasi uchun)
//    📷 Kamera obyektining 🎮 ABSOLUTE rejimida — o'sha kamera uchun
//       (u umumiydan ustun turadi)
//
//  ── ⚠ NEGA `renderer.render` PATCH ──────────────────────────
//    Kamera burilishini bitta emas, O'NLAB joy yozadi: `player.js`,
//    kamera obyektlari (`main-loop.js`), 💻 PC blok, 🎯 hitbox
//    animatsiyalari, 🎥 kamera yo'li. Ularning har birini tuzatib
//    chiqish — o'nta joyda bir xil kodni ushlab turish demak.
//    YAKUNIY qiymat esa faqat bitta nuqtada ma'lum: render oldida.
//    `CameraRig`, `CameraShake` va `MotionFX` ham aynan shu yerga
//    ulanadi — biz ulardan KEYIN turamiz.
//
//  ── ⚠ NEGA `slerp` VA `exp` ─────────────────────────────────
//    `q.slerp(target, 0.1)` har KADRDA bir xil ulush oladi — ya'ni
//    natija FPS ga bog'liq bo'lardi: 30 fps da sekin, 144 fps da
//    tez. `k = 1 - exp(-dt/τ)` esa vaqtga bog'liq va har qanday
//    fps da bir xil his beradi.
//
//  ── 💾 Timeline ─────────────────────────────────────────────
//    `TimelineSystem` da 🎬 Kino treki bor: o'chirib key qo'yasiz,
//    boshqa joyda yoqib yana key — o'rtada silliq o'tadi.
//    Holatni `getState()` beradi, `applyState()` qaytaradi.
// ============================================================

window.KinoCamSystem = (() => {
  'use strict';

  const DEF = {
    enabled:     false,
    inertia:     0.55,   // 🌀 toyinchoqlik 0…1
    stopTime:    0.55,   // ⏱ tinchish vaqti (soniya)
    blur:        true,   // 🌫 yon blur
    blurAmount:  0.7,    // blur kuchi 0…2
    blurStretch: 1.0,    // ↔ chetdan ichkariga cho'zilishi 0…2
  };

  const cfg = Object.assign({}, DEF);

  // ── Holat ───────────────────────────────────────────────────
  const _q    = new THREE.Quaternion();   // silliqlangan burilish
  const _prev = new THREE.Quaternion();   // o'tgan kadrdagi natija
  let _have   = false;
  let _blurS  = 0;      // silliqlangan blur kuchi
  let _yawShare = 0.5;  // burilishning qancha qismi yon tomonga
  let _els    = null;
  let _lastT  = 0;

  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);

  // ============================================================
  //  Amaldagi sozlama
  //  ⚠ Faol kamera OBYEKTI o'z sozlamasini bergan bo'lsa u ustun —
  //    rejissyor bitta sahnada bitta kamerani og'ir, boshqasini
  //    tikkasiga qilishi mumkin.
  // ============================================================
  function activeCfg() {
    try {
      if (typeof objects !== 'undefined') {
        for (const o of objects) {
          const ud = o && o.userData;
          if (!ud || !ud.isCamera || !ud._isActive) continue;
          if ((ud.camViewMode || 'keyframe') !== 'absolute') continue;
          if (ud.kino && ud.kino.enabled) return Object.assign({}, DEF, ud.kino);
        }
      }
    } catch (e) {}
    return cfg.enabled ? cfg : null;
  }

  /** Tanlangan kamera obyektining sozlamasi (inspektor uchun). */
  function objCfg(o) {
    return Object.assign({}, DEF, (o && o.userData && o.userData.kino) || {});
  }

  // ============================================================
  //  Hisob
  // ============================================================
  /**
   * τ — vaqt konstantasi.
   *  ⚠ `stopTime` foydalanuvchi uchun \"necha soniyada tinchiydi\"
   *    degani. Eksponentada 95% ga yetish ≈ 3τ, shuning uchun
   *    τ = stopTime/3. `inertia` esa uni cho'zadi: 0 da deyarli
   *    darhol, 1 da ancha og'ir.
   */
  function tauOf(c) {
    const st = Math.max(0.02, +c.stopTime || DEF.stopTime);
    const it = Math.max(0, Math.min(1, +c.inertia ?? DEF.inertia));
    return (st / 3) * (0.35 + 1.65 * it);
  }

  /** Har kadr — render oldidan chaqiriladi. */
  function _step(cam, dt) {
    const c = activeCfg();
    if (!c || !cam) { _have = false; _fadeBlur(dt); return false; }

    if (!_have) { _q.copy(cam.quaternion); _prev.copy(cam.quaternion); _have = true; return false; }

    // 🌀 Toyinchoqlik — FPS ga bog'liq bo'lmagan silliqlash
    const k = 1 - Math.exp(-Math.max(1e-4, dt) / tauOf(c));
    _q.slerp(cam.quaternion, k);

    // 🌫 Burilish tezligi (rad/sek) — blur uchun
    const ang = _prev.angleTo(_q) / Math.max(1e-4, dt);
    _prev.copy(_q);

    // Yon (yaw) va tik (pitch) ulushi — blur qaysi chetdan kirishini
    // shu belgilaydi
    _measureShare(cam);

    const want = (c.blur === false) ? 0
      : Math.min(1, (ang / 2.2)) * Math.max(0, +c.blurAmount ?? DEF.blurAmount);
    _blurS += (want - _blurS) * Math.min(1, dt * 9);
    _applyBlur(c);

    cam.quaternion.copy(_q);
    return true;
  }

  const _eA = new THREE.Euler(0, 0, 0, 'YXZ');
  const _eB = new THREE.Euler(0, 0, 0, 'YXZ');
  function _measureShare(cam) {
    _eA.setFromQuaternion(_q, 'YXZ');
    _eB.setFromQuaternion(cam.quaternion, 'YXZ');
    const dy = Math.abs(_eB.y - _eA.y), dx = Math.abs(_eB.x - _eA.x);
    const s = dy + dx;
    const share = s > 1e-6 ? dy / s : 0.5;
    _yawShare += (share - _yawShare) * 0.25;
  }

  // ============================================================
  //  🌫 Blur qatlami
  //  ⚠ Markaz TINIQ qoladi — blur faqat chetlardan kiradi. Butun
  //    ekranni blurlasak o'yinchi qayerga qarayotganini ko'rmasdi;
  //    kinoda ham diqqat markazda qoladi.
  // ============================================================
  function _mkEls() {
    if (_els) return _els;
    const host = document.getElementById('cvp') || document.body;
    const root = document.createElement('div');
    root.id = 'apex-kino-root';
    root.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:55;opacity:0;transition:opacity .12s linear';
    const blur = document.createElement('div');
    blur.style.cssText =
      'position:absolute;inset:0;backdrop-filter:blur(0px);-webkit-backdrop-filter:blur(0px)';
    root.appendChild(blur);
    host.appendChild(root);
    _els = { root, blur };
    return _els;
  }

  function _applyBlur(c) {
    if (_blurS <= 0.004) { _fadeBlur(1); return; }
    const o = _mkEls();
    const px = Math.min(9, _blurS * 7);
    o.blur.style.backdropFilter = 'blur(' + px.toFixed(2) + 'px)';
    o.blur.style.webkitBackdropFilter = o.blur.style.backdropFilter;

    // ↔ Cho'zilish: tiniq markaz qanchalik kichrayadi
    const st  = Math.max(0, Math.min(2, +c.blurStretch ?? DEF.blurStretch));
    const base = 72 - st * 26;                 // % — tiniq soha
    const rx = Math.max(6, base * (1 - 0.55 * _yawShare));
    const ry = Math.max(6, base * (1 - 0.55 * (1 - _yawShare)));
    const mask = `radial-gradient(ellipse ${rx.toFixed(0)}% ${ry.toFixed(0)}% at 50% 50%,` +
                 ` rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, #000 100%)`;
    o.blur.style.maskImage = mask;
    o.blur.style.webkitMaskImage = mask;
    o.root.style.opacity = Math.min(1, _blurS * 1.6).toFixed(3);
  }

  function _fadeBlur(dt) {
    if (_blurS > 0) _blurS = Math.max(0, _blurS - dt * 2.5);
    if (_els && _blurS <= 0.004 && _els.root.style.opacity !== '0') {
      _els.root.style.opacity = '0';
      _els.blur.style.backdropFilter = 'blur(0px)';
      _els.blur.style.webkitBackdropFilter = 'blur(0px)';
    }
  }

  function reset() {
    _have = false; _blurS = 0; _yawShare = 0.5;
    if (_els) {
      _els.root.style.opacity = '0';
      _els.blur.style.backdropFilter = 'blur(0px)';
      _els.blur.style.webkitBackdropFilter = 'blur(0px)';
    }
  }

  // ============================================================
  //  renderer.render patch
  //  ⚠ `CameraRig` / `CameraShake` / `MotionFX` dan KEYIN ulanamiz:
  //    ular kameraga o'z qo'shimchasini qo'shib bo'lgach, biz
  //    YAKUNIY burilishni silliqlaymiz. Aks holda ularning tebranishi
  //    silliqlanmay o'tib ketardi.
  // ============================================================
  let _patched = false;
  function _patch() {
    if (_patched || typeof renderer === 'undefined' || !renderer || !renderer.render) return;
    if (renderer.render.__kinoPatched) { _patched = true; return; }
    const orig = renderer.render.bind(renderer);
    const qSave = new THREE.Quaternion();
    renderer.render = function (scn, cam) {
      const c = cam || (typeof camera !== 'undefined' ? camera : null);
      const now = performance.now();
      const dt = _lastT ? Math.min(0.1, (now - _lastT) / 1000) : 0.016;
      _lastT = now;
      // ⚠ Faqat ▶ Play da. Muharrirda kamerani sudrab yurganda
      //   \"og'irlik\" xalaqit berardi — nishonga aniq turg'izib
      //   bo'lmasdi.
      if (!c || !_playing()) { if (_have) reset(); orig(scn, cam); return; }
      qSave.copy(c.quaternion);
      let touched = false;
      try { touched = _step(c, dt); } catch (e) {}
      if (touched) c.updateMatrixWorld(true);
      try { orig(scn, cam); }
      finally {
        if (touched) { c.quaternion.copy(qSave); c.updateMatrixWorld(true); }
      }
    };
    renderer.render.__kinoPatched = true;
    _patched = true;
  }

  // ============================================================
  //  💾 Holat — timeline va saqlash uchun
  // ============================================================
  function getState() {
    const s = {};
    for (const k in DEF) s[k] = cfg[k];
    return s;
  }
  function applyState(s) {
    if (!s) return;
    for (const k in DEF) if (s[k] !== undefined) cfg[k] = s[k];
  }
  function set(k, v) {
    if (!(k in DEF)) return false;
    cfg[k] = (k === 'enabled' || k === 'blur') ? !!v : _num(v, DEF[k]);
    return true;
  }
  function _num(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }

  function serialize() { return { cfg: getState() }; }
  function restore(d) { if (d && d.cfg) applyState(d.cfg); }

  // ============================================================
  //  🎛 Inspektor
  // ============================================================
  const FIELDS = [
    ['inertia',     '🌀 Toyinchoqlik',   0, 1, 0.05, ''],
    ['stopTime',    '⏱ To\'xtash',       0.05, 3, 0.05, 's'],
    ['blurAmount',  '🌫 Blur kuchi',     0, 2, 0.05, ''],
    ['blurStretch', '↔ Blur cho\'zilishi', 0, 2, 0.05, ''],
  ];

  function _row(lbl, inner) {
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:104px;flex-shrink:0">${lbl}</span>
      ${inner}</div>`;
  }
  function _fields(vals, setFn) {
    return FIELDS.map(([k, lbl, min, max, step, unit]) => _row(lbl,
      `<input type="range" min="${min}" max="${max}" step="${step}" value="${vals[k]}" style="flex:1"
         oninput="${setFn}('${k}', this.value)">
       <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${(+vals[k]).toFixed(2)}${unit}</span>`
    )).join('');
  }
  function _tgl(on, onclick, yes, no) {
    return `<button onclick="${onclick}" style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;
      font-family:'Share Tech Mono',monospace;border:1px solid ${on ? 'var(--accent3)' : 'var(--red)'};
      background:${on ? 'rgba(var(--accent3-rgb),.1)' : 'rgba(255,68,68,.08)'};
      color:${on ? 'var(--accent3)' : 'var(--red)'}">${on ? yes : no}</button>`;
  }

  /** 📦 O'yinchi inspektori — UMUMIY sozlama. */
  function inspectorHTML() {
    return `
    <div style="border-top:1px solid rgba(var(--accent-rgb),.15);padding-top:6px;margin-top:6px">
      <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:6px">
        🎬 KINO KAMERA</div>
      ${_row('🎬 Yoqish', _tgl(cfg.enabled, `_kinoSet('enabled',${!cfg.enabled})`, "✓ Yoqiq", "✗ O'chiq"))}
      ${cfg.enabled ? `
        ${_fields(cfg, '_kinoSet')}
        ${_row('🌫 Yon blur', _tgl(cfg.blur, `_kinoSet('blur',${!cfg.blur})`, "✓ Bor", "✗ Yo'q"))}
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:2px 0 6px;font-family:'Share Tech Mono',monospace">
          Kamera burilishga <b>kechikib</b> ergashadi va to'xtaganda sekinlashib
          tinchiydi. Burilish paytida ekran <b>chetlari</b> blurlashadi —
          markaz tiniq qoladi.<br>
          ⚠ Faqat ▶ <b>Play</b> da ishlaydi.
        </div>
        <button onclick="_kinoToTimeline()" style="width:100%;padding:4px 2px;border-radius:3px;cursor:pointer;
          font-size:9px;font-family:'Share Tech Mono',monospace;border:1px solid var(--accent);
          background:rgba(var(--accent-rgb),.08);color:var(--accent)">🎬 Kino → Timeline</button>
      ` : ''}
    </div>`;
  }

  /**
   * 📷 Kamera obyekti — 🎮 ABSOLUTE rejimidagi bo'lim.
   *  ⚠ Bu kamera faol bo'lganda UMUMIY sozlamadan ustun turadi.
   */
  function camObjHTML(o) {
    const v = objCfg(o);
    return `
    <div style="border-top:1px solid rgba(var(--accent3-rgb),.18);padding-top:6px;margin-top:6px">
      <div style="font-size:8px;color:var(--accent3);font-family:'Share Tech Mono',monospace;margin-bottom:5px">
        🎬 КИНЕМАТОГРАФИЧЕСКАЯ</div>
      ${_row('🎬 Shu kamerada', _tgl(v.enabled, `_kinoObjSet('enabled',${!v.enabled})`, "✓ Yoqiq", "✗ O'chiq"))}
      ${v.enabled ? `
        ${_fields(v, '_kinoObjSet')}
        ${_row('🌫 Yon blur', _tgl(v.blur, `_kinoObjSet('blur',${!v.blur})`, "✓ Bor", "✗ Yo'q"))}
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:3px;font-family:'Share Tech Mono',monospace">
          ⚠ Bu kamera faol bo'lganda 📦 o'yinchidagi <b>umumiy</b> sozlamadan
          <b style="color:var(--accent3)">ustun turadi</b>.
        </div>
      ` : `<div style="font-size:8px;color:var(--muted);line-height:1.6;font-family:'Share Tech Mono',monospace">
          Kamera og'irlashadi: burilishga kechikib ergashadi, to'xtaganda
          sekinlashib tinchiydi, chetlari blurlashadi.
        </div>`}
    </div>`;
  }

  // ── Inspektor yordamchilari (funksiya — audit uni holat sanamaydi) ──
  window._kinoSet = function (k, v) {
    set(k, v);
    if ((k === 'enabled' || k === 'blur') && typeof updateInspector === 'function') updateInspector();
  };
  window._kinoObjSet = function (k, v) {
    if (typeof selectedObj === 'undefined' || !selectedObj || !selectedObj.userData.isCamera) return;
    const ud = selectedObj.userData;
    ud.kino = Object.assign({}, DEF, ud.kino || {});
    ud.kino[k] = (k === 'enabled' || k === 'blur') ? !!v : _num(v, DEF[k]);
    if ((k === 'enabled' || k === 'blur') && typeof updateInspector === 'function') updateInspector();
  };
  window._kinoToTimeline = function () {
    if (typeof TimelineSystem === 'undefined' || !TimelineSystem.addKinoToTimeline) {
      try { log('⚠ Timeline topilmadi', 'lw'); } catch (e) {}
      return;
    }
    TimelineSystem.addKinoToTimeline();
  };

  // ── Ishga tushirish ─────────────────────────────────────────
  function init() {
    _patch();
    if (!_patched) setTimeout(init, 200);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 120));
    else setTimeout(init, 120);
  }

  return {
    cfg, DEF,
    activeCfg, objCfg, tauOf,
    set, getState, applyState, reset,
    serialize, restore,
    inspectorHTML, camObjHTML,
    _step,                 // testlar uchun
    isPatched: () => _patched,
  };
})();
