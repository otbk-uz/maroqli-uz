// ============================================================
//  MOTION FX SYSTEM  v1.0
// ------------------------------------------------------------
//  Kinematik kamera "motion" effektlari — CameraShake dan farqli
//  o'laroq bu tizim AYLANMA (rotation) + FOV + vignette bilan
//  ishlaydi (pozitsion silkinish emas).
//
//  Effektlar:
//    Dizzy     — Bosh aylanishi (roll/pitch/yaw tebranishi, ko'ngil aynishi)
//    Sway      — Kinematik / qo'lda ushlangandek silliq tebranish
//    Heartbeat — Yurak urishi (lub-dub ritmda FOV + vignette pulsatsiya)
//
//  Trigger manbalari:
//    - Manual / Script:  MotionFX.play('Dizzy', {intensity,duration,loop})
//    - Hitbox:           hb.userData.actions.motionFx (enter | hold | exit)
//    - Timeline:         trek keyframe'ida kf.motionFx bo'lsa — o'sha vaqtda
//                        ishga tushadi (timeline toolbar'ida "🎬 FX" tugmasi)
//
//  Qo'llash: renderer.render() monkey-patch orqali — kamera oriyentatsiyasi
//  va FOV faqat render paytida vaqtincha o'zgartiriladi va darhol tiklanadi.
//  Shu bois CameraShake (pozitsiya) bilan bemalol birga ishlaydi.
// ============================================================

window.MotionFXSystem = (() => {

  const EFFECTS = ['Dizzy', 'Sway', 'Heartbeat'];
  const EFFECT_LABEL = {
    Dizzy:     'Bosh aylanishi',
    Sway:      'Kinematik tebranish',
    Heartbeat: 'Yurak urishi',
  };

  // Aktiv effekt instansiyalari
  //   { id, effect, intensity, duration, loop, elapsed, _hold, _key }
  const live = new Map();
  let nextId = 1;

  // Har frame hisoblangan yig'indi ofset (renderer patch shundan foydalanadi)
  const _rot    = { pitch: 0, yaw: 0, roll: 0 };
  let   _fovOff = 0;
  let   _vign   = 0;

  // ── VIGNETTE OVERLAY ─────────────────────────────────────────
  let _vEl = null;
  function _ensureOverlay() {
    if (_vEl) return _vEl;
    const cvp = document.getElementById('cvp');
    if (!cvp) return null;
    const d = document.createElement('div');
    d.id = 'motionfx-vignette';
    d.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:6;opacity:0;'
      + 'background:radial-gradient(ellipse at center,'
      + 'rgba(0,0,0,0) 38%,rgba(0,0,0,0.9) 100%);';
    cvp.appendChild(d);
    _vEl = d;
    return d;
  }
  function _applyVignette(amt) {
    const el = _ensureOverlay(); if (!el) return;
    const o = Math.min(1, Math.max(0, amt));
    if (o > 0.001) el.style.opacity = o.toFixed(3);
    else if (el.style.opacity !== '0') el.style.opacity = '0';
  }

  // ── EFFEKT MATEMATIKASI ──────────────────────────────────────
  // Har biri {pitch,yaw,roll,fov,vign} qaytaradi (radian / gradus / 0..1).
  function _sample(effect, t, intensity, duration, loop) {
    const I = intensity;
    // Kirish/chiqish konverti (loop bo'lmasa boshi-oxiri silliq so'nadi)
    let env = 1;
    if (!loop && duration > 0) {
      const inD = Math.min(0.6, duration * 0.25);
      const outD = Math.min(0.8, duration * 0.3);
      if (t < inD)               env = t / inD;
      else if (t > duration - outD) env = Math.max(0, (duration - t) / outD);
      env = Math.max(0, Math.min(1, env));
    }

    if (effect === 'Dizzy') {
      // Ko'ngil aynishi: sekin aylanuvchi roll + pitch/yaw tebranish
      const roll  = Math.sin(t * 2.2) * 0.09  * I;
      const pitch = Math.sin(t * 1.6 + 1.3) * 0.045 * I;
      const yaw   = Math.sin(t * 1.05) * 0.06  * I
                  + Math.sin(t * 0.33) * 0.03  * I;   // sekin drift
      const fov   = Math.sin(t * 1.2) * 2.2 * I;       // "nafas olish"
      const vign  = (0.10 + Math.abs(Math.sin(t * 1.1)) * 0.10) * I;
      return { pitch: pitch*env, yaw: yaw*env, roll: roll*env, fov: fov*env, vign: vign*env };
    }

    if (effect === 'Sway') {
      // Kinematik / qo'lda ushlangandek: juda silliq, kichik amplitudali "8" figurasi
      const yaw   = Math.sin(t * 0.55)        * 0.026 * I;
      const pitch = Math.sin(t * 0.80 + 1.0)  * 0.018 * I;
      const roll  = Math.sin(t * 0.42 + 0.5)  * 0.012 * I;
      const fov   = Math.sin(t * 0.6)         * 0.6   * I;
      return { pitch: pitch*env, yaw: yaw*env, roll: roll*env, fov: fov*env, vign: 0 };
    }

    if (effect === 'Heartbeat') {
      // Lub-dub ritm — BPM ~ 78. Har zarba: tez FOV "punch" (zoom in) + vignette.
      const bpm = 78;
      const beat = 60 / bpm;
      const lt = t % beat;
      const thump = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (w * w));
      const pulse = thump(lt, 0.02, 0.045) + 0.6 * thump(lt, 0.20, 0.055); // lub ... dub
      const p = pulse * I;
      // FOV punch = zoom in (fov kamayadi) => manfiy ofset
      const fov  = -p * 5.0;
      const vign =  p * 0.42;
      const roll =  Math.sin(t * 6) * 0.004 * p;   // engil tebranish
      return { pitch: 0, yaw: 0, roll: roll*env, fov: fov*env, vign: vign*env };
    }

    return { pitch: 0, yaw: 0, roll: 0, fov: 0, vign: 0 };
  }

  // ── UPDATE (camModuleUpdate patch orqali chaqiriladi) ────────
  function update(delta) {
    if (!delta || delta < 0) delta = 0;

    let pitch = 0, yaw = 0, roll = 0, fov = 0, vign = 0;
    const done = [];

    live.forEach((inst, id) => {
      inst.elapsed += delta;
      const finished = !inst.loop && !inst._hold && inst.duration > 0 && inst.elapsed >= inst.duration;
      if (finished) { done.push(id); return; }
      const s = _sample(inst.effect, inst.elapsed, inst.intensity, inst.duration, inst.loop || inst._hold);
      pitch += s.pitch; yaw += s.yaw; roll += s.roll; fov += s.fov; vign += s.vign;
    });

    done.forEach(id => live.delete(id));

    _rot.pitch = pitch; _rot.yaw = yaw; _rot.roll = roll;
    _fovOff = fov; _vign = vign;
    _applyVignette(vign);

    // Timeline keyframe'larini tekshirish (o'z ijro paytida)
    _timelineTick();
  }

  // ── PUBLIC: effektni ishga tushirish ─────────────────────────
  function play(effect, opts) {
    opts = opts || {};
    if (!EFFECTS.includes(effect)) effect = 'Dizzy';
    const id = opts.id || ('mfx_' + (nextId++));
    live.set(id, {
      id,
      effect,
      intensity: opts.intensity != null ? opts.intensity : 1.0,
      duration:  opts.duration  != null ? opts.duration  : 2.0,
      loop:      !!opts.loop,
      _hold:     !!opts._hold,
      _key:      opts._key || null,
      elapsed:   0,
    });
    return id;
  }
  function stop(id) { return live.delete(id); }
  function stopAll() { live.clear(); _rot.pitch = _rot.yaw = _rot.roll = 0; _fovOff = 0; _vign = 0; _applyVignette(0); }

  // "hold" — zona ichida turганда davom etadigan, kalitli instansiya
  function playHold(key, effect, opts) {
    stopHold(key);
    return play(effect, Object.assign({}, opts, { _hold: true, loop: true, _key: key, id: 'hold_' + key }));
  }
  function stopHold(key) { live.delete('hold_' + key); }

  // ── PLAY MODE reset ──────────────────────────────────────────
  function onPlayStop() { stopAll(); }

  // ══════════════════════════════════════════════════════════════
  //  RENDER PATCH — kamera oriyentatsiyasi + FOV ni faqat render'da
  // ══════════════════════════════════════════════════════════════
  const _q0 = new THREE.Quaternion();
  const _qo = new THREE.Quaternion();
  const _e  = new THREE.Euler();

  function _hookRenderer() {
    if (typeof renderer === 'undefined' || !renderer.render) { setTimeout(_hookRenderer, 100); return; }
    if (renderer.render.__mfxPatched) return;
    const orig = renderer.render.bind(renderer);
    renderer.render = function (scn, cam) {
      const c = cam || (typeof camera !== 'undefined' ? camera : null);
      const need = c && (_rot.pitch || _rot.yaw || _rot.roll || Math.abs(_fovOff) > 0.001);
      if (need) {
        _q0.copy(c.quaternion);
        _e.set(_rot.pitch, _rot.yaw, _rot.roll, 'YXZ');
        _qo.setFromEuler(_e);
        c.quaternion.multiply(_qo);        // kamera-lokal ofset (roll = ko'rish o'qi bo'ylab)
        let f0;
        if (Math.abs(_fovOff) > 0.001 && c.isPerspectiveCamera) {
          f0 = c.fov;
          c.fov = Math.max(1, Math.min(179, c.fov + _fovOff));
          c.updateProjectionMatrix();
        }
        c.updateMatrixWorld(true);
        try { orig(scn, cam); }
        finally {
          c.quaternion.copy(_q0);
          if (f0 !== undefined) { c.fov = f0; c.updateProjectionMatrix(); }
          c.updateMatrixWorld(true);
        }
      } else {
        orig(scn, cam);
      }
    };
    renderer.render.__mfxPatched = true;
  }

  // ── camModuleUpdate patch (har frame update) ─────────────────
  function _hookMainLoop() {
    if (typeof camModuleUpdate !== 'function') { setTimeout(_hookMainLoop, 100); return; }
    if (camModuleUpdate.__mfxPatched) return;
    const orig = camModuleUpdate;
    window.camModuleUpdate = function (delta) {
      orig(delta);
      try { update(delta); } catch (e) { if (typeof log === 'function') log('❌ MotionFX update: ' + e.message, 'le'); }
    };
    window.camModuleUpdate.__mfxPatched = true;
  }

  // ── Play tugmasi bilan bog'lanish (o'yin to'xtaganda tozalash) ─
  function _hookPlayMode() {
    const pb = document.getElementById('play-btn');
    if (pb && !pb.__mfxHooked) {
      pb.addEventListener('click', () => {
        setTimeout(() => { if (typeof isPlaying !== 'undefined' && !isPlaying) onPlayStop(); }, 30);
      });
      pb.__mfxHooked = true;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  HITBOX INTEGRATSIYASI  (enter | hold | exit)
  //  Config: hb.userData.actions.motionFx
  //    { enabled, phase, effect, intensity, duration, loop }
  // ══════════════════════════════════════════════════════════════
  const _hbPrev = new WeakMap();   // hb → Set<entity>

  function _getHbCfg(hb) {
    if (!hb.userData) hb.userData = {};
    if (!hb.userData.actions) hb.userData.actions = {};
    if (!hb.userData.actions.motionFx) {
      hb.userData.actions.motionFx = {
        enabled: false, phase: 'enter', effect: 'Dizzy',
        intensity: 1.0, duration: 2.0, loop: false,
      };
    }
    return hb.userData.actions.motionFx;
  }

  function _processHitbox(delta) {
    if (typeof isPlaying === 'undefined' || !isPlaying) return;
    if (typeof objects === 'undefined') return;
    for (let i = 0; i < objects.length; i++) {
      const hb = objects[i];
      if (!hb || !hb.userData || !hb.userData.isHitbox) continue;
      const cfg = hb.userData.actions && hb.userData.actions.motionFx;
      if (!cfg || !cfg.enabled) continue;
      const cur = hb.userData._entitiesInside;
      if (!cur) continue;

      let prev = _hbPrev.get(hb);
      if (!prev) { prev = new Set(); _hbPrev.set(hb, prev); }

      // ENTER / HOLD
      cur.forEach(ent => {
        if (!prev.has(ent)) {
          if (cfg.phase === 'enter') {
            play(cfg.effect, { intensity: cfg.intensity, duration: cfg.duration, loop: cfg.loop });
          } else if (cfg.phase === 'hold') {
            playHold(_entKey(hb, ent), cfg.effect, { intensity: cfg.intensity, duration: cfg.duration });
          }
        }
      });
      // EXIT
      prev.forEach(ent => {
        if (!cur.has(ent)) {
          if (cfg.phase === 'exit') {
            play(cfg.effect, { intensity: cfg.intensity, duration: cfg.duration, loop: cfg.loop });
          } else if (cfg.phase === 'hold') {
            stopHold(_entKey(hb, ent));
          }
        }
      });

      const snap = new Set(); cur.forEach(e => snap.add(e));
      _hbPrev.set(hb, snap);
    }
  }
  let _entC = 0;
  const _entIds = new WeakMap();
  function _entKey(hb, ent) {
    let hid = hb.userData.id != null ? hb.userData.id : (hb.uuid || 'hb');
    let eid = _entIds.get(ent);
    if (!eid) { eid = 'e' + (++_entC); _entIds.set(ent, eid); }
    return hid + '_' + eid;
  }

  function _hookHitbox() {
    if (typeof HitboxSystem === 'undefined' || !HitboxSystem.update) { setTimeout(_hookHitbox, 100); return; }
    if (HitboxSystem.update.__mfxPatched) return;
    const orig = HitboxSystem.update;
    HitboxSystem.update = function (delta) {
      orig.call(this, delta);
      try { _processHitbox(delta || 0); } catch (e) { if (typeof log === 'function') log('❌ MotionFX hitbox: ' + e.message, 'le'); }
    };
    HitboxSystem.update.__mfxPatched = true;
  }

  // ══════════════════════════════════════════════════════════════
  //  TIMELINE INTEGRATSIYASI
  //   - Trek keyframe'ida kf.motionFx = {effect,intensity,duration,loop}
  //   - Timeline ijro paytida vaqt o'sha keyframe'dan o'tsa — ishga tushadi
  //   - Authoring: toolbar'ga "🎬 FX" tugmasi + effekt tanlagich qo'shiladi
  // ══════════════════════════════════════════════════════════════
  let _tlPrev = -1;
  function _timelineTick() {
    const TL = window.TimelineSystem;
    if (!TL || !TL.isPlaying) { _tlPrev = -1; return; }
    const cur = TL.currentTime;
    let prev = _tlPrev;
    if (prev < 0 || cur < prev) prev = -0.0001;   // boshlanish yoki loop qaytishi
    const tracks = TL.tracks || [];
    for (const tr of tracks) {
      const kfs = tr.keyframes || [];
      for (const kf of kfs) {
        if (kf.motionFx && kf.time > prev && kf.time <= cur) {
          const m = kf.motionFx;
          play(m.effect || 'Dizzy', { intensity: m.intensity ?? 1, duration: m.duration ?? 2, loop: !!m.loop });
        }
      }
    }
    _tlPrev = cur;
  }

  // Toolbar'ga boshqaruv qo'shish
  function _hookTimelineToolbar() {
    const bar = document.getElementById('tl-toolbar');
    if (!bar) { setTimeout(_hookTimelineToolbar, 200); return; }
    if (bar.__mfxHooked) return;

    const sel = document.createElement('select');
    sel.id = 'mfx-tl-effect';
    sel.className = 'tl-btn';
    sel.style.cssText += ';color:#ff77dd;border-color:rgba(255,119,221,.35)';
    sel.innerHTML = EFFECTS.map(e => `<option value="${e}">${EFFECT_LABEL[e]}</option>`).join('');

    const btn = document.createElement('button');
    btn.className = 'tl-btn';
    btn.textContent = '🎬 FX';
    btn.title = "Motion FX keyframe qo'shish (joriy playhead vaqtiga)";
    btn.style.cssText += ';color:#ff77dd;border-color:rgba(255,119,221,.35)';
    btn.onclick = () => timelineAddKeyframe(sel.value);

    bar.appendChild(sel);
    bar.appendChild(btn);
    bar.__mfxHooked = true;
  }

  // Joriy playhead vaqtiga motionFx keyframe qo'shadi
  function timelineAddKeyframe(effect) {
    const TL = window.TimelineSystem;
    if (!TL) { if (typeof clog === 'function') clog('⚠ Timeline topilmadi', 'w'); return; }
    if (!EFFECTS.includes(effect)) effect = 'Dizzy';
    const tracks = TL.tracks;
    let tr = tracks.find(t => t.isMotionFx);
    if (!tr) {
      tr = { isMotionFx: true, objId: 'MFX', objName: '🎬 Motion FX', objRef: null, keyframes: [], _warnedMissing: true };
      tracks.push(tr);
    }
    const t = Math.round(TL.currentTime * 1000) / 1000;
    const kf = { time: t, motionFx: { effect, intensity: 1.0, duration: 2.0, loop: false } };
    const ex = tr.keyframes.findIndex(k => Math.abs(k.time - t) < 0.005);
    if (ex >= 0) tr.keyframes[ex] = kf;
    else { tr.keyframes.push(kf); tr.keyframes.sort((a, b) => a.time - b.time); }
    if (TL.render) TL.render();
    if (typeof clog === 'function') clog(`🎬◆ Motion FX KF: ${EFFECT_LABEL[effect]} @ ${t.toFixed(2)}s`, 'ok');
  }

  // ══════════════════════════════════════════════════════════════
  //  INSPECTOR — Hitbox tanlanganda "Motion FX on Trigger" bloki
  // ══════════════════════════════════════════════════════════════
  const INP = "flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";

  function _buildHitboxSection(hb) {
    const cfg = _getHbCfg(hb);
    const en = !!cfg.enabled;
    const effOpts = EFFECTS.map(e => `<option value="${e}" ${cfg.effect===e?'selected':''}>${EFFECT_LABEL[e]}</option>`).join('');
    return `
      <div class="comp-block">
        <div class="comp-title" style="cursor:pointer" onclick="MotionFXSystem._toggleHb()">
          <span class="tag" style="background:rgba(255,119,221,.16);color:#ff77dd">MFX</span>
          <span style="flex:1">Motion FX on Trigger</span>
          <input type="checkbox" ${en?'checked':''}
                 onclick="event.stopPropagation();MotionFXSystem._toggleHb();" style="cursor:pointer">
        </div>
        ${en ? `
          <div class="fr"><span class="fl">Effekt</span>
            <select id="mfx-hb-eff" style="${INP}">${effOpts}</select>
          </div>
          <div class="fr"><span class="fl">Qachon</span>
            <select id="mfx-hb-phase" style="${INP}">
              <option value="enter" ${cfg.phase==='enter'?'selected':''}>Kirishda (enter)</option>
              <option value="hold"  ${cfg.phase==='hold' ?'selected':''}>Ichida turганда (hold)</option>
              <option value="exit"  ${cfg.phase==='exit' ?'selected':''}>Chiqishda (exit)</option>
            </select>
          </div>
          <div style="font-size:9px;color:var(--muted);margin:1px 0 3px">
            ${cfg.phase==='hold' ? "zona ichida davom etadi, chiqsa to'xtaydi" : "bir marta ishga tushadi"}
          </div>
          <div class="fr"><span class="fl">Kuch</span>
            <input id="mfx-hb-int" type="range" min="0.1" max="2" step="0.05" value="${cfg.intensity}" style="flex:1">
          </div>
          ${cfg.phase!=='hold' ? `
          <div class="fr"><span class="fl">Davomiylik (s)</span>
            <input id="mfx-hb-dur" type="number" min="0.2" step="0.1" value="${cfg.duration}"
              style="width:70px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-size:10px;border-radius:2px">
          </div>
          <div class="fr"><span class="fl">Loop</span>
            <input id="mfx-hb-loop" type="checkbox" ${cfg.loop?'checked':''}>
          </div>` : ''}
          <button class="action-btn" onclick="MotionFXSystem._testHb()"
            style="background:rgba(255,119,221,.1);border-color:rgba(255,119,221,.4);color:#ff77dd;margin-top:6px;width:100%">▶ TEST</button>
        ` : `
          <div style="font-size:10px;color:var(--muted);padding:4px 0;text-align:center">
            Trigger effektini yoqing
          </div>
        `}
      </div>`;
  }

  function _wireHitboxSection(hb) {
    const cfg = _getHbCfg(hb);
    if (!cfg.enabled) return;
    const on = (id, key, kind) => {
      const el = document.getElementById(id); if (!el) return;
      const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(ev, () => {
        if (kind === 'num')  cfg[key] = parseFloat(el.value) || 0;
        else if (kind === 'bool') cfg[key] = el.checked;
        else cfg[key] = el.value;
        if (key === 'phase' && typeof updateInspector === 'function') updateInspector();
      });
    };
    on('mfx-hb-eff',   'effect',    'str');
    on('mfx-hb-phase', 'phase',     'str');
    on('mfx-hb-int',   'intensity', 'num');
    on('mfx-hb-dur',   'duration',  'num');
    on('mfx-hb-loop',  'loop',      'bool');
  }

  function _toggleHb() {
    if (typeof selectedObj === 'undefined' || !selectedObj || !selectedObj.userData || !selectedObj.userData.isHitbox) return;
    const cfg = _getHbCfg(selectedObj);
    cfg.enabled = !cfg.enabled;
    if (typeof updateInspector === 'function') updateInspector();
  }
  function _testHb() {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const cfg = _getHbCfg(selectedObj);
    play(cfg.effect, { intensity: cfg.intensity, duration: cfg.phase === 'hold' ? 3 : cfg.duration, loop: cfg.loop });
  }

  function _appendToInspector() {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const ud = selectedObj.userData; if (!ud || !ud.isHitbox) return;
    const ic = document.getElementById('inspector-content'); if (!ic) return;
    ic.insertAdjacentHTML('beforeend', _buildHitboxSection(selectedObj));
    _wireHitboxSection(selectedObj);
  }

  function _hookInspector() {
    if (typeof updateInspector !== 'function') { setTimeout(_hookInspector, 100); return; }
    if (updateInspector.__mfxPatched) return;
    const orig = updateInspector;
    window.updateInspector = function () {
      orig.apply(this, arguments);
      try { _appendToInspector(); } catch (e) { if (typeof log === 'function') log('❌ MotionFX inspector: ' + e.message, 'le'); }
    };
    window.updateInspector.__mfxPatched = true;
    if (typeof selectedObj !== 'undefined' && selectedObj && typeof updateInspector === 'function') updateInspector();
  }

  // ── Script API ───────────────────────────────────────────────
  function _hookScriptAPI() {
    if (typeof SCRIPT_API !== 'undefined' && !SCRIPT_API.motionFx) {
      SCRIPT_API.motionFx = {
        play: (e, o) => play(e, o),
        stop: (id) => stop(id),
        stopAll: () => stopAll(),
        dizzy:     (o) => play('Dizzy', o),
        sway:      (o) => play('Sway', o),
        heartbeat: (o) => play('Heartbeat', o),
      };
    }
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    _ensureOverlay();
    _hookRenderer();
    _hookMainLoop();
    _hookPlayMode();
    _hookHitbox();
    _hookInspector();
    _hookTimelineToolbar();
    _hookScriptAPI();
    if (typeof log === 'function') log('🎬 MotionFXSystem ishga tushdi', 'lok');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 60);

  // ── PUBLIC API ───────────────────────────────────────────────
  // ── 💾 SystemRegistry shartnomasi ────────────────────────────
  //  ⚠ Effekt sozlamalari obyektlarning `userData` sida turadi (ular
  //    avtomatik saqlanadi). Bu yerda faqat GLOBAL sozlama bor.
  function serialize() {
    try {
      const out = {};
      if (typeof _cfg !== 'undefined' && _cfg) out.cfg = JSON.parse(JSON.stringify(_cfg));
      return Object.keys(out).length ? out : null;
    } catch (e) { return null; }
  }
  function restore(d) {
    if (!d) return 0;
    try {
      if (d.cfg && typeof _cfg !== 'undefined' && _cfg) Object.assign(_cfg, d.cfg);
      return 1;
    } catch (e) { return 0; }
  }

  return {
    serialize, restore,
    EFFECTS, EFFECT_LABEL,
    play, stop, stopAll, playHold, stopHold, update,
    onPlayStop,
    timelineAddKeyframe,
    // inspector inline handlerlar
    _toggleHb, _testHb,
  };
})();

window.MotionFX = window.MotionFXSystem;
// ============================================================
