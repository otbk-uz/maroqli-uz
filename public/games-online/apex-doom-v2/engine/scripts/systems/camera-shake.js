// ============================================================
// CAMERA SHAKE SYSTEM  v1.0
// ------------------------------------------------------------
// Kamera silkinishi, jolt va distorsiya effektlari.
// Trigger manbalari: TimeTrigger | QuestStep | CutsceneStart |
//                    CutsceneEnd | ActionFlow | Manual
// Effektlar:         Shake | Blur | ChromaticAberration |
//                    Vignette | Combined
// Presetlar:         Explosion | Impact | Rumble | Custom
// Falloff:           Linear | Instant | EaseOut
//
// Integratsiya:
//   - main-loop dagi camModuleUpdate ga monkey-patch orqali ulanadi
//   - Sahna obyektidagi isCamera:true bo'lgan kameralarga ham
//     biriktirish mumkin (userData._shakeConfig)
//   - ScriptSystem (SCRIPT_API) ga cameraShake API kengaytiriladi
//   - Har qanday tashqi tizim CameraShake.fire(...) chaqira oladi
// ============================================================

window.CameraShakeSystem = (() => {

  // ── PRESETLAR ────────────────────────────────────────────────
  const PRESETS = {
    Explosion:  { intensity: 1.6,  duration: 0.9, falloff: 'EaseOut', frequency: 30 },
    Impact:     { intensity: 1.2,  duration: 0.25, falloff: 'Instant', frequency: 45 },
    Rumble:     { intensity: 0.45, duration: 3.0, falloff: 'Linear',  frequency: 14 },
    Custom:     { intensity: 0.6,  duration: 0.5, falloff: 'EaseOut', frequency: 22 },
  };

  const TRIGGER_SOURCES = ['TimeTrigger','QuestStep','CutsceneStart','CutsceneEnd','ActionFlow','Manual'];
  const FALLOFFS        = ['Linear','Instant','EaseOut'];
  const EFFECT_TYPES    = ['Shake','Blur','ChromaticAberration','Vignette','Combined'];

  // ── STATE ────────────────────────────────────────────────────
  // Instance = bitta shake konfiguratsiyasi (bitta trigger)
  // Instance strukturasi (config):
  //   { id, name, targetCamId, triggerSource, triggerParam,
  //     preset, intensity, duration, falloff, frequency,
  //     effectType, effectDuration, effectIntensity,
  //     _armed, _timer, _active, _elapsed, _fxElapsed,
  //     _sampleTime, _sampleOffset, _sampleTarget }
  const instances = new Map();
  let nextId = 1;
  let overlayEls = null;  // { root, blur, chromR, chromB, vignette }

  // Silkinish ANIQ vizual effekt — u camera.position ni doimiy o'zgartirmaydi.
  // O'rniga, renderer.render() ni monkey-patch qilib, faqat render paytida
  // offsetni qo'llaymiz va darhol qaytarib olamiz. Shunday qilib:
  //   - Har qanday controller (FPS accumulative, orbit-idle, cam-obj, ...)
  //     hech qachon shake offsetini o'z pozitsiyasiga qo'shib olmaydi
  //   - Silkinish tugagach kamera aynan o'z joyida qoladi
  //   - Boshqa tizimlar (script, gizmo) toza pozitsiyani ko'radi
  const _currentOffset = { x: 0, y: 0, z: 0 };

  // ── OVERLAY DOM (blur / chromatic / vignette) ────────────────
  function ensureOverlay() {
    if (overlayEls) return overlayEls;
    const cvp = document.getElementById('cvp');
    if (!cvp) return null;
    const root = document.createElement('div');
    root.id = 'camshake-overlay';
    root.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;';

    // BLUR overlay — dublicates canvas via backdrop-filter
    const blur = document.createElement('div');
    blur.style.cssText =
      'position:absolute;inset:0;pointer-events:none;'
      +'backdrop-filter:blur(0px);-webkit-backdrop-filter:blur(0px);'
      +'transition:none;opacity:0;';

    // CHROMATIC ABERRATION — 2 offset colored screens on canvas snapshot.
    // Realtime GL post-fx yo'q, shuning uchun tint overlay + shift orqali
    // approxim. Har frame position offset o'zgaradi.
    const chromR = document.createElement('div');
    chromR.style.cssText =
      'position:absolute;inset:0;pointer-events:none;'
      +'background:radial-gradient(circle at 50% 50%,'
      +'rgba(255,0,0,0.0) 45%,rgba(255,40,40,0.28) 100%);'
      +'mix-blend-mode:screen;opacity:0;transform:translate(0,0);';
    const chromB = document.createElement('div');
    chromB.style.cssText =
      'position:absolute;inset:0;pointer-events:none;'
      +'background:radial-gradient(circle at 50% 50%,'
      +'rgba(0,0,255,0.0) 45%,rgba(40,120,255,0.28) 100%);'
      +'mix-blend-mode:screen;opacity:0;transform:translate(0,0);';

    // VIGNETTE — dark radial mask
    const vignette = document.createElement('div');
    vignette.style.cssText =
      'position:absolute;inset:0;pointer-events:none;'
      +'background:radial-gradient(ellipse at center,'
      +'rgba(0,0,0,0) 40%,rgba(0,0,0,0.85) 100%);'
      +'opacity:0;';

    root.appendChild(blur);
    root.appendChild(chromR);
    root.appendChild(chromB);
    root.appendChild(vignette);
    cvp.appendChild(root);

    overlayEls = { root, blur, chromR, chromB, vignette };
    return overlayEls;
  }

  // ── FALLOFF FUNCTIONS ────────────────────────────────────────
  function falloff(kind, t /* 0..1 elapsed frac */) {
    const x = Math.max(0, Math.min(1, t));
    switch (kind) {
      case 'Linear':  return 1 - x;
      case 'Instant': return x < 1 ? 1 : 0;
      case 'EaseOut': {
        const inv = 1 - x;
        return inv * inv * inv;   // cubic ease-out
      }
      default: return 1 - x;
    }
  }

  // ── CONFIG DEFAULTS ──────────────────────────────────────────
  function defaults(overrides) {
    const presetName = overrides?.preset || 'Custom';
    const p = PRESETS[presetName] || PRESETS.Custom;
    return Object.assign({
      id:              'shake_' + (nextId++),
      name:            'CameraShake',
      targetCamId:     null,               // null => asosiy camera
      // Trigger
      triggerSource:   'Manual',
      triggerParam:    '',                 // TimeTrigger: soniyalar (raqam) / boshqalar: matn
      triggerUnit:     'sec',              // TimeTrigger uchun UI birligi: 'sec' | 'min'
      // Shake
      preset:          presetName,
      intensity:       p.intensity,
      duration:        p.duration,
      durationUnit:    'sec',              // UI birligi: 'sec' | 'min'
      falloff:         p.falloff,
      frequency:       p.frequency,
      // Effect
      effectType:      'Shake',
      effectDuration:  p.duration,
      effectDurationUnit: 'sec',           // UI birligi: 'sec' | 'min'
      effectIntensity: 0.6,
      // Runtime (ustma-ust yozilmaydi)
      _armed:          false,
      _timer:          0,
      _active:         false,
      _elapsed:        0,
      _fxActive:       false,
      _fxElapsed:      0,
      _sampleTime:     0,
      _sampleOffset:   { x:0, y:0, z:0 },
      _sampleTarget:   { x:0, y:0, z:0 },
    }, overrides || {});
  }

  // ── CREATE / REMOVE ──────────────────────────────────────────
  function create(config) {
    const inst = defaults(config);
    instances.set(inst.id, inst);
    _rearm(inst);
    if (typeof log === 'function')
      log('💥 CameraShake yaratildi: ' + inst.id + ' (' + inst.triggerSource + ')', 'lok');
    _syncCamObjUserData(inst);
    _refreshInspector();
    return inst.id;
  }

  function remove(id) {
    const inst = instances.get(id);
    if (!inst) return false;
    instances.delete(id);
    // Cam obj userData dan tozalash
    if (inst.targetCamId) {
      const camObj = _findCamObj(inst.targetCamId);
      if (camObj && camObj.userData._shakeConfig
          && camObj.userData._shakeConfig.id === id) {
        delete camObj.userData._shakeConfig;
      }
    }
    _refreshInspector();
    return true;
  }

  function get(id) { return instances.get(id) || null; }
  function all()   { return Array.from(instances.values()); }

  // ── TRIGGERING ───────────────────────────────────────────────
  // Manual trigger — instansiyani darhol ishga tushiradi.
  function trigger(id) {
    const inst = typeof id === 'object' ? id : instances.get(id);
    if (!inst) return false;
    inst._active     = true;
    inst._elapsed    = 0;
    inst._fxActive   = (inst.effectType !== 'Shake' || inst.effectType === 'Combined')
                        ? true : true;   // effekt turi qanday bo'lmasin — start
    inst._fxElapsed  = 0;
    inst._sampleTime = 0;
    if (typeof log === 'function')
      log('💥 CameraShake trigger: ' + inst.id, 'lw');
    return true;
  }

  function stop(id) {
    const inst = instances.get(id);
    if (!inst) return false;
    inst._active   = false;
    inst._fxActive = false;
    inst._elapsed  = 0;
    inst._fxElapsed= 0;
    return true;
  }

  function stopAll() {
    instances.forEach(i => { i._active = false; i._fxActive = false; });
  }

  // ── PRESET SWITCH ────────────────────────────────────────────
  function setPreset(id, presetName) {
    const inst = instances.get(id); if (!inst) return false;
    const p = PRESETS[presetName]; if (!p) return false;
    inst.preset    = presetName;
    if (presetName !== 'Custom') {
      inst.intensity = p.intensity;
      inst.duration  = p.duration;
      inst.falloff   = p.falloff;
      inst.frequency = p.frequency;
    }
    _syncCamObjUserData(inst);
    _refreshInspector();
    return true;
  }

  // ── FIRE by trigger source (tashqi tizimlar chaqiradi) ────────
  // Har qanday moslashuvchi source: fire('QuestStep', 'boss_defeated')
  function fire(source, param) {
    let count = 0;
    instances.forEach(inst => {
      if (inst.triggerSource !== source) return;
      if (source === 'Manual') return; // manual faqat trigger() orqali
      // Parametr moslikni tekshirish
      const tp = String(inst.triggerParam || '').trim();
      if (tp === '' || tp === String(param ?? '').trim()) {
        trigger(inst);
        count++;
      }
    });
    return count;
  }

  // Qulaylik uchun alohida notify* funksiyalar (tashqi kodga chiroyli API)
  function notifyQuestStep(step)     { return fire('QuestStep',     step); }
  function notifyCutsceneStart(name) { return fire('CutsceneStart', name); }
  function notifyCutsceneEnd(name)   { return fire('CutsceneEnd',   name); }
  function notifyActionFlow(id)      { return fire('ActionFlow',    id);   }

  // ── ARM (TimeTrigger uchun taymer qayta yuklash) ─────────────
  function _rearm(inst) {
    inst._armed = (inst.triggerSource === 'TimeTrigger');
    inst._timer = parseFloat(inst.triggerParam) || 0;
  }

  // Play mode boshlangan/to'xtaganda TimeTrigger larni qayta armlash
  function onPlayStart() {
    instances.forEach(inst => { _rearm(inst); inst._active = false; inst._fxActive = false; });
  }
  function onPlayStop() {
    instances.forEach(inst => { inst._active = false; inst._fxActive = false; });
    _resetOverlay();
    // Offsetni tozalaymiz — bu render-patch avtomatik hisobga oladi
    _currentOffset.x = 0;
    _currentOffset.y = 0;
    _currentOffset.z = 0;
  }

  // ── HELPER: kamera obyektini topish ──────────────────────────
  function _findCamObj(camId) {
    if (!camId || typeof objects === 'undefined') return null;
    return objects.find(o => o.userData && o.userData.id === camId
                              && o.userData.isCamera) || null;
  }

  function _syncCamObjUserData(inst) {
    if (!inst.targetCamId) return;
    const camObj = _findCamObj(inst.targetCamId);
    if (camObj) {
      // Faqat serialize qilinadigan qismini saqlaymiz
      camObj.userData._shakeConfig = {
        id: inst.id, name: inst.name,
        triggerSource: inst.triggerSource, triggerParam: inst.triggerParam,
        triggerUnit: inst.triggerUnit,
        preset: inst.preset, intensity: inst.intensity, duration: inst.duration,
        durationUnit: inst.durationUnit,
        falloff: inst.falloff, frequency: inst.frequency,
        effectType: inst.effectType, effectDuration: inst.effectDuration,
        effectDurationUnit: inst.effectDurationUnit,
        effectIntensity: inst.effectIntensity,
      };
    }
  }

  // ── SHAKE SAMPLER (frequency-aware, sample-and-hold + lerp) ──
  function _updateShakeSample(inst, delta) {
    inst._sampleTime += delta;
    const period = 1 / Math.max(1, inst.frequency);
    if (inst._sampleTime >= period) {
      inst._sampleTime = 0;
      inst._sampleTarget.x = (Math.random() - 0.5) * 2;
      inst._sampleTarget.y = (Math.random() - 0.5) * 2;
      inst._sampleTarget.z = (Math.random() - 0.5) * 2;
    }
    // lerp toward target for smoothness
    const lf = Math.min(1, delta * inst.frequency * 1.5);
    inst._sampleOffset.x += (inst._sampleTarget.x - inst._sampleOffset.x) * lf;
    inst._sampleOffset.y += (inst._sampleTarget.y - inst._sampleOffset.y) * lf;
    inst._sampleOffset.z += (inst._sampleTarget.z - inst._sampleOffset.z) * lf;
  }

  // ── UPDATE (main loop dan chaqiriladi) ───────────────────────
  // Bu funksiya faqat OFFSET ni HISOBLAYDI va _currentOffset ga yozadi.
  // Kamera pozitsiyasiga tegmaydi — renderer patch tekshiradi.
  function update(delta) {
    if (!delta || delta <= 0) return;

    // Aggregate offset (bir necha instance parallel ishlashi mumkin)
    let sumX = 0, sumY = 0, sumZ = 0;
    // Aggregate effect strengths
    let blurAmt = 0, chromAmt = 0, vignAmt = 0;

    const isPlayingSafe = (typeof isPlaying !== 'undefined') && isPlaying;

    instances.forEach(inst => {
      // ── TimeTrigger — o'yin rejimida sanoq ────────────────
      if (inst._armed && isPlayingSafe && !inst._active) {
        inst._timer -= delta;
        if (inst._timer <= 0) {
          inst._armed = false;
          trigger(inst);
        }
      }

      // ── SHAKE fazasi ──────────────────────────────────────
      if (inst._active) {
        inst._elapsed += delta;
        const t = inst._elapsed / Math.max(0.001, inst.duration);
        const k = falloff(inst.falloff, t);
        if (t >= 1 || k <= 0.001) {
          inst._active = false;
        } else {
          _updateShakeSample(inst, delta);
          // Faqat Shake yoki Combined => pozitsiya offset
          if (inst.effectType === 'Shake' || inst.effectType === 'Combined') {
            const amp = inst.intensity * k * 0.15;
            sumX += inst._sampleOffset.x * amp;
            sumY += inst._sampleOffset.y * amp;
            sumZ += inst._sampleOffset.z * amp;
          }
        }
      }

      // ── EFFECT fazasi (blur/chromatic/vignette) ───────────
      if (inst._fxActive) {
        inst._fxElapsed += delta;
        const t = inst._fxElapsed / Math.max(0.001, inst.effectDuration);
        const k = falloff(inst.falloff, t);
        if (t >= 1 || k <= 0.001) {
          inst._fxActive = false;
        } else {
          const amt = inst.effectIntensity * k;
          const et = inst.effectType;
          if (et === 'Blur'                 || et === 'Combined') blurAmt  += amt;
          if (et === 'ChromaticAberration'  || et === 'Combined') chromAmt += amt;
          if (et === 'Vignette'             || et === 'Combined') vignAmt  += amt;
        }
      }
    });

    // ── Overlay effektlarini yangilash ────────────────────────
    _applyOverlay(blurAmt, chromAmt, vignAmt);

    // ── Offsetni saqlash — renderer patch shundan foydalanadi ──
    _currentOffset.x = sumX;
    _currentOffset.y = sumY;
    _currentOffset.z = sumZ;
  }

  function _applyOverlay(blurAmt, chromAmt, vignAmt) {
    const o = ensureOverlay(); if (!o) return;
    // Blur (px)
    if (blurAmt > 0.001) {
      const px = Math.min(12, blurAmt * 8);
      o.blur.style.backdropFilter = 'blur(' + px.toFixed(2) + 'px)';
      o.blur.style.webkitBackdropFilter = o.blur.style.backdropFilter;
      o.blur.style.opacity = 1;
    } else if (o.blur.style.opacity !== '0') {
      o.blur.style.opacity = 0;
      o.blur.style.backdropFilter = 'blur(0px)';
      o.blur.style.webkitBackdropFilter = 'blur(0px)';
    }

    // Chromatic aberration — offset amount => translate
    if (chromAmt > 0.001) {
      const off = Math.min(14, chromAmt * 10);
      const jitterR = (Math.random() - 0.5) * 2;
      const jitterB = (Math.random() - 0.5) * 2;
      o.chromR.style.transform = 'translate(' +
          (off + jitterR).toFixed(1) + 'px,0)';
      o.chromB.style.transform = 'translate(' +
          (-off + jitterB).toFixed(1) + 'px,0)';
      const opa = Math.min(1, chromAmt);
      o.chromR.style.opacity = opa;
      o.chromB.style.opacity = opa;
    } else if (o.chromR.style.opacity !== '0') {
      o.chromR.style.opacity = 0;
      o.chromB.style.opacity = 0;
    }

    // Vignette
    if (vignAmt > 0.001) {
      o.vignette.style.opacity = Math.min(1, vignAmt);
    } else if (o.vignette.style.opacity !== '0') {
      o.vignette.style.opacity = 0;
    }
  }

  function _resetOverlay() {
    if (!overlayEls) return;
    overlayEls.blur.style.opacity     = 0;
    overlayEls.chromR.style.opacity   = 0;
    overlayEls.chromB.style.opacity   = 0;
    overlayEls.vignette.style.opacity = 0;
  }

  // ── SERIALIZE / RESTORE (scene save/load bilan integratsiya) ─
  function serialize() {
    return Array.from(instances.values()).map(i => ({
      id:              i.id,
      name:            i.name,
      targetCamId:     i.targetCamId,
      triggerSource:   i.triggerSource,
      triggerParam:    i.triggerParam,
      triggerUnit:     i.triggerUnit,
      preset:          i.preset,
      intensity:       i.intensity,
      duration:        i.duration,
      durationUnit:    i.durationUnit,
      falloff:         i.falloff,
      frequency:       i.frequency,
      effectType:      i.effectType,
      effectDuration:  i.effectDuration,
      effectDurationUnit: i.effectDurationUnit,
      effectIntensity: i.effectIntensity,
    }));
  }
  function restore(arr) {
    if (!Array.isArray(arr)) return;
    instances.clear();
    let maxId = 0;
    arr.forEach(cfg => {
      instances.set(cfg.id, defaults(cfg));
      const m = String(cfg.id).match(/(\d+)$/);
      if (m) maxId = Math.max(maxId, parseInt(m[1]));
    });
    nextId = Math.max(nextId, maxId + 1);
    instances.forEach(_rearm);
    _refreshInspector();
  }


  // ══════════════════════════════════════════════════════════════
  //  INSPECTOR INTEGRATSIYASI
  //  — Suzuvchi tugma va menejer paneli olib tashlandi.
  //  — Kamera obyekti tanlanganda Inspector paneliga "Camera Shake"
  //    bloki qo'shiladi.
  //  — Hitbox tanlanganda "Camera Shake on Trigger" bloki qo'shiladi
  //    (enter/stay/exit).
  //  — HitboxSystem._fireActions monkey-patch qilinadi — hitbox
  //    hodisalarida silkinish avtomatik ishga tushadi.
  // ══════════════════════════════════════════════════════════════

  // Kamera obyektiga bog'liq persistent instansiyani topish/yaratish
  function _getCamInstance(camObj) {
    if (!camObj || !camObj.userData) return null;
    const camId = camObj.userData.id;
    for (const inst of instances.values()) {
      if (inst.targetCamId === camId) return inst;
    }
    return null;
  }
  function _getOrCreateCamInstance(camObj) {
    let inst = _getCamInstance(camObj);
    if (inst) return inst;
    const id = create({
      name: 'Shake:' + (camObj.userData.name || camObj.userData.id),
      targetCamId: camObj.userData.id,
      triggerSource: 'Manual',
    });
    return instances.get(id);
  }

  // Ephemeral (bir martalik) silkinish — hitbox uchun ishlatiladi.
  // Konfigni oladi, instansiya yaratadi, darhol ishga tushiradi va
  // silkinish tugagach o'chiradi. Persistent ro'yxatda paydo bo'lmaydi.
  function fireEphemeral(cfg) {
    const inst = defaults(Object.assign({
      name: 'ephemeral',
      triggerSource: 'Manual',
      _ephemeral: true,
    }, cfg || {}));
    instances.set(inst.id, inst);
    trigger(inst);
    return inst.id;
  }

  // Ephemeral instansiyalarni tozalash — update ichida chaqiriladi
  function _cleanupEphemeral() {
    const toRemove = [];
    instances.forEach((inst, id) => {
      if (inst._ephemeral && !inst._active && !inst._fxActive) {
        toRemove.push(id);
      }
    });
    toRemove.forEach(id => instances.delete(id));
  }

  // ── Inspector uchun UI qurish ────────────────────────────────
  // Barcha style ni mavjud .comp-block / .comp-title / .fr / .fl
  // klasslariga moslashtiramiz — Inspector estetikasiga to'g'ri keladi.

  const INP = 'flex:1;background:var(--bg);border:1px solid var(--border);'
            + 'color:var(--text);padding:2px 5px;'
            + 'font-family:\'Share Tech Mono\',monospace;font-size:10px;'
            + 'border-radius:2px;outline:none';
  const SEL = INP;   // select bir xil ko'rinish

  function _opts(arr, cur) {
    return arr.map(v => '<option value="'+v+'"'
                   + (v===cur?' selected':'')+'>'+v+'</option>').join('');
  }

  // Silkinish maydonlarining umumiy HTML (kamera va hitbox uchun ham)
  function _shakeFieldsHTML(cfg, idPrefix) {
    // Duration UI qiymati birlikka qarab hisoblanadi (ichki qiymat doim soniya)
    const dUnit = cfg.durationUnit       || 'sec';
    const eUnit = cfg.effectDurationUnit || 'sec';
    const dVal  = dUnit === 'min' ? (cfg.duration / 60)       : cfg.duration;
    const eVal  = eUnit === 'min' ? (cfg.effectDuration / 60) : cfg.effectDuration;

    return `
      <div class="fr"><span class="fl">Preset</span>
        <select id="${idPrefix}-preset" style="${SEL}">
          ${_opts(Object.keys(PRESETS), cfg.preset)}
        </select>
      </div>
      <div class="fr"><span class="fl">Intensity</span>
        <input id="${idPrefix}-int" type="number" step="0.05" min="0"
               value="${cfg.intensity}" style="${INP}">
      </div>

      <div class="fr"><span class="fl">Duration</span>
        <input id="${idPrefix}-dur" type="number" step="0.05" min="0"
               value="${dVal}" style="${INP};flex:1;margin-right:4px">
        <select id="${idPrefix}-dunit" style="${SEL};flex:0 0 68px">
          <option value="sec"${dUnit==='sec'?' selected':''}>soniya</option>
          <option value="min"${dUnit==='min'?' selected':''}>daqiqa</option>
        </select>
      </div>
      <div class="fr" style="padding:2px 0 0 0">
        <span class="fl"></span>
        <span id="${idPrefix}-dinfo"
              style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
          = ${cfg.duration.toFixed(2)}s qimirlash
        </span>
      </div>

      <div class="fr"><span class="fl">Falloff</span>
        <select id="${idPrefix}-fall" style="${SEL}">
          ${_opts(FALLOFFS, cfg.falloff)}
        </select>
      </div>
      <div class="fr"><span class="fl">Frequency</span>
        <input id="${idPrefix}-freq" type="number" step="1" min="1"
               value="${cfg.frequency}" style="${INP}">
      </div>
      <div class="fr"><span class="fl">Effect</span>
        <select id="${idPrefix}-etype" style="${SEL}">
          ${_opts(EFFECT_TYPES, cfg.effectType)}
        </select>
      </div>

      <div class="fr"><span class="fl">Fx Duration</span>
        <input id="${idPrefix}-edur" type="number" step="0.05" min="0"
               value="${eVal}" style="${INP};flex:1;margin-right:4px">
        <select id="${idPrefix}-eunit" style="${SEL};flex:0 0 68px">
          <option value="sec"${eUnit==='sec'?' selected':''}>soniya</option>
          <option value="min"${eUnit==='min'?' selected':''}>daqiqa</option>
        </select>
      </div>
      <div class="fr" style="padding:2px 0 0 0">
        <span class="fl"></span>
        <span id="${idPrefix}-einfo"
              style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
          = ${cfg.effectDuration.toFixed(2)}s effekt
        </span>
      </div>

      <div class="fr"><span class="fl">Fx Intensity</span>
        <input id="${idPrefix}-eint" type="number" step="0.05" min="0" max="2"
               value="${cfg.effectIntensity}" style="${INP}">
      </div>
    `;
  }

  // Duration + Unit wiring — kamera va hitbox uchun umumiy yordamchi.
  // cfg — qayerga yozish (instance yoki hitbox.userData.actions.cameraShake).
  // afterChange — o'zgargach ixtiyoriy chaqiruv (masalan _syncCamObjUserData).
  function _wireDurationUnits(cfg, idPrefix, afterChange) {
    const wire = (valId, unitId, infoId, durKey, unitKey, labelSuffix) => {
      const valEl  = document.getElementById(valId);
      const unitEl = document.getElementById(unitId);
      const infoEl = document.getElementById(infoId);
      if (!valEl || !unitEl) return;
      const recompute = () => {
        const raw  = parseFloat(valEl.value) || 0;
        const unit = unitEl.value;
        const secs = unit === 'min' ? raw * 60 : raw;
        cfg[durKey]  = secs;
        cfg[unitKey] = unit;
        if (infoEl) infoEl.textContent = '= ' + secs.toFixed(2) + 's ' + labelSuffix;
        if (typeof afterChange === 'function') afterChange();
      };
      valEl.addEventListener('input',  recompute);
      unitEl.addEventListener('change', recompute);
    };
    wire(idPrefix + '-dur',  idPrefix + '-dunit', idPrefix + '-dinfo',
         'duration',       'durationUnit',       'qimirlash');
    wire(idPrefix + '-edur', idPrefix + '-eunit', idPrefix + '-einfo',
         'effectDuration', 'effectDurationUnit', 'effekt');
  }

  // ── KAMERA obyektiga Inspector bloki ─────────────────────────
  function _buildCameraSection(camObj) {
    const inst = _getCamInstance(camObj);
    const enabled = !!inst;
    const cfg = inst || defaults({});
    const trigLabel = _triggerParamLabel(cfg.triggerSource);
    const trigPh    = _triggerParamPlaceholder(cfg.triggerSource);
    const isTimer   = cfg.triggerSource === 'TimeTrigger';
    // TimeTrigger uchun: triggerParam soniyada saqlanadi; UI da esa
    // birlik (sec/min) tanlangan bo'lsa qiymatni shunga moslab ko'rsatamiz
    const unit      = cfg.triggerUnit || 'sec';
    const totalSec  = parseFloat(cfg.triggerParam) || 0;
    const uiValue   = unit === 'min' ? (totalSec / 60) : totalSec;

    return `
      <div class="comp-block">
        <div class="comp-title" style="cursor:pointer"
             onclick="CameraShakeSystem._toggleCam()">
          <span class="tag" style="background:rgba(255,107,53,.18);color:var(--accent2)">SHK</span>
          <span style="flex:1">Camera Shake</span>
          <input type="checkbox" ${enabled?'checked':''}
                 onclick="event.stopPropagation();CameraShakeSystem._toggleCam();"
                 style="cursor:pointer">
        </div>
        ${enabled ? `
          <div class="fr"><span class="fl">Manba</span>
            <select id="cs-cam-trig" style="${SEL}">
              ${_opts(TRIGGER_SOURCES, cfg.triggerSource)}
            </select>
          </div>
          ${isTimer ? `
            <div class="fr"><span class="fl">Vaqt</span>
              <input id="cs-cam-tval" type="number" step="0.1" min="0"
                     value="${uiValue}" placeholder="masalan 5"
                     style="${INP};flex:1;margin-right:4px">
              <select id="cs-cam-tunit" style="${SEL};flex:0 0 68px">
                <option value="sec"${unit==='sec'?' selected':''}>soniya</option>
                <option value="min"${unit==='min'?' selected':''}>daqiqa</option>
              </select>
            </div>
            <div class="fr" style="padding:2px 0 0 0">
              <span class="fl"></span>
              <span id="cs-cam-tinfo"
                    style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
                = ${totalSec.toFixed(1)}s (o'yin boshlanganda sanoq boshlanadi)
              </span>
            </div>
          ` : `
            <div class="fr"><span class="fl" id="cs-cam-tplbl">${trigLabel}</span>
              <input id="cs-cam-tparam" value="${_esc(String(cfg.triggerParam))}"
                     placeholder="${trigPh}" style="${INP}">
            </div>
          `}
          ${_shakeFieldsHTML(cfg, 'cs-cam')}
          <div class="fr" style="gap:4px;margin-top:6px">
            <button class="action-btn"
                    style="background:rgba(var(--accent3-rgb),.1);border-color:rgba(var(--accent3-rgb),.35);color:var(--accent3);flex:1"
                    onclick="CameraShakeSystem._testCam()">▶ TEST</button>
            <button class="action-btn"
                    style="background:rgba(255,68,68,.08);border-color:rgba(255,68,68,.3);color:var(--red);flex:1"
                    onclick="CameraShakeSystem._stopCam()">■ STOP</button>
          </div>
        ` : `
          <div style="font-size:10px;color:var(--muted);padding:4px 0;text-align:center">
            Silkinishni yoqish uchun tepadagi ✓ ni bosing
          </div>
        `}
      </div>
    `;
  }

  function _wireCameraSection(camObj) {
    const inst = _getCamInstance(camObj);
    if (!inst) return;
    const bind = (id, key, isNum) => {
      const el = document.getElementById(id); if (!el) return;
      el.addEventListener('input', () => {
        inst[key] = isNum ? (parseFloat(el.value) || 0) : el.value;
        if (key === 'preset')        setPreset(inst.id, el.value);
        if (key === 'triggerSource') {
          _rearm(inst);
          _syncCamObjUserData(inst);
          // Manba o'zgardi — UI ni to'liq qayta chizamiz
          // (TimeTrigger raqamli input, boshqalar matn — shakl butunlay boshqa)
          _refreshInspector();
          return;   // qayta chizishdan keyin qolgan kod kerak emas
        }
        if (key === 'triggerParam') _rearm(inst);
        _syncCamObjUserData(inst);
      });
    };
    bind('cs-cam-trig',   'triggerSource',  false);
    bind('cs-cam-tparam', 'triggerParam',   false);   // matn manbalari uchun
    bind('cs-cam-preset', 'preset',         false);
    bind('cs-cam-int',    'intensity',      true);
    bind('cs-cam-fall',   'falloff',        false);
    bind('cs-cam-freq',   'frequency',      true);
    bind('cs-cam-etype',  'effectType',     false);
    bind('cs-cam-eint',   'effectIntensity',true);
    // Duration + Fx Duration — birlik dropdown bilan (soniya/daqiqa)
    _wireDurationUnits(inst, 'cs-cam', () => _syncCamObjUserData(inst));

    // ── TimeTrigger uchun maxsus: raqam + birlik ─────────────────
    const valEl  = document.getElementById('cs-cam-tval');
    const unitEl = document.getElementById('cs-cam-tunit');
    const infoEl = document.getElementById('cs-cam-tinfo');
    const recompute = () => {
      if (!valEl || !unitEl) return;
      const raw   = parseFloat(valEl.value) || 0;
      const unit  = unitEl.value;
      const secs  = unit === 'min' ? raw * 60 : raw;
      inst.triggerUnit  = unit;
      inst.triggerParam = String(secs);
      if (infoEl) infoEl.textContent =
        '= ' + secs.toFixed(1) + "s (o'yin boshlanganda sanoq boshlanadi)";
      _rearm(inst);
      _syncCamObjUserData(inst);
    };
    if (valEl)  valEl.addEventListener('input', recompute);
    if (unitEl) unitEl.addEventListener('change', recompute);
  }

  // Kamera checkboxini bosganda — instansiyani yaratish/o'chirish
  function _toggleCam() {
    if (typeof selectedObj === 'undefined' || !selectedObj ||
        !selectedObj.userData || !selectedObj.userData.isCamera) return;
    const existing = _getCamInstance(selectedObj);
    if (existing) {
      remove(existing.id);
    } else {
      _getOrCreateCamInstance(selectedObj);
    }
    if (typeof updateInspector === 'function') updateInspector();
  }
  function _testCam() {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const inst = _getCamInstance(selectedObj);
    if (inst) trigger(inst.id);
  }
  function _stopCam() {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const inst = _getCamInstance(selectedObj);
    if (inst) stop(inst.id);
  }

  // ── HITBOX obyektiga Inspector bloki ─────────────────────────
  // Config joyi: hb.userData.actions.cameraShake
  //   { enabled, phase: 'enter'|'stay'|'exit', preset, intensity,
  //     duration, falloff, frequency,
  //     effectType, effectDuration, effectIntensity }
  function _getHitboxCfg(hb) {
    if (!hb.userData) hb.userData = {};
    if (!hb.userData.actions) hb.userData.actions = {};
    if (!hb.userData.actions.cameraShake) {
      const d = defaults({});
      hb.userData.actions.cameraShake = {
        enabled:         false,
        phase:           'enter',
        preset:          d.preset,
        intensity:       d.intensity,
        duration:        d.duration,
        durationUnit:    d.durationUnit,
        falloff:         d.falloff,
        frequency:       d.frequency,
        effectType:      d.effectType,
        effectDuration:  d.effectDuration,
        effectDurationUnit: d.effectDurationUnit,
        effectIntensity: d.effectIntensity,
      };
    }
    // Eski (avvalgi versiyada saqlangan) config uchun default'lar
    const c = hb.userData.actions.cameraShake;
    if (c.durationUnit       === undefined) c.durationUnit       = 'sec';
    if (c.effectDurationUnit === undefined) c.effectDurationUnit = 'sec';
    return hb.userData.actions.cameraShake;
  }

  function _buildHitboxSection(hb) {
    const cfg = _getHitboxCfg(hb);
    const enabled = !!cfg.enabled;
    return `
      <div class="comp-block">
        <div class="comp-title" style="cursor:pointer"
             onclick="CameraShakeSystem._toggleHb()">
          <span class="tag" style="background:rgba(255,107,53,.18);color:var(--accent2)">SHK</span>
          <span style="flex:1">Camera Shake on Trigger</span>
          <input type="checkbox" ${enabled?'checked':''}
                 onclick="event.stopPropagation();CameraShakeSystem._toggleHb();"
                 style="cursor:pointer">
        </div>
        ${enabled ? `
          <div class="fr"><span class="fl">Faza</span>
            <select id="cs-hb-phase" style="${SEL}">
              <option value="enter"${cfg.phase==='enter'?' selected':''}>Kirishda (enter)</option>
              <option value="stay" ${cfg.phase==='stay' ?' selected':''}>Ichida (stay)</option>
              <option value="exit" ${cfg.phase==='exit' ?' selected':''}>Chiqishda (exit)</option>
            </select>
          </div>
          ${_shakeFieldsHTML(cfg, 'cs-hb')}
          <button class="action-btn"
                  style="background:rgba(var(--accent3-rgb),.1);border-color:rgba(var(--accent3-rgb),.35);color:var(--accent3);margin-top:6px"
                  onclick="CameraShakeSystem._testHb()">▶ TEST</button>
        ` : `
          <div style="font-size:10px;color:var(--muted);padding:4px 0;text-align:center">
            Trigger silkinishini yoqing
          </div>
        `}
      </div>
    `;
  }

  function _wireHitboxSection(hb) {
    const cfg = _getHitboxCfg(hb);
    if (!cfg.enabled) return;
    const bind = (id, key, isNum) => {
      const el = document.getElementById(id); if (!el) return;
      el.addEventListener('input', () => {
        cfg[key] = isNum ? (parseFloat(el.value) || 0) : el.value;
        if (key === 'preset') {
          const p = PRESETS[el.value];
          if (p && el.value !== 'Custom') {
            cfg.intensity = p.intensity;
            cfg.duration  = p.duration;
            cfg.falloff   = p.falloff;
            cfg.frequency = p.frequency;
          }
          if (typeof updateInspector === 'function') updateInspector();
        }
      });
    };
    bind('cs-hb-phase',  'phase',           false);
    bind('cs-hb-preset', 'preset',          false);
    bind('cs-hb-int',    'intensity',       true);
    bind('cs-hb-fall',   'falloff',         false);
    bind('cs-hb-freq',   'frequency',       true);
    bind('cs-hb-etype',  'effectType',      false);
    bind('cs-hb-eint',   'effectIntensity', true);
    // Duration + Fx Duration — birlik dropdown bilan
    _wireDurationUnits(cfg, 'cs-hb');
  }

  function _toggleHb() {
    if (typeof selectedObj === 'undefined' || !selectedObj ||
        !selectedObj.userData || !selectedObj.userData.isHitbox) return;
    const cfg = _getHitboxCfg(selectedObj);
    cfg.enabled = !cfg.enabled;
    if (typeof updateInspector === 'function') updateInspector();
  }
  function _testHb() {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const cfg = _getHitboxCfg(selectedObj);
    fireEphemeral(cfg);
  }

  // ── ROLL (damage/heal) uchun bir xil Camera Shake bloki ──────
  //   Xuddi hitbox kabi, faqat config obj.userData.roll.cameraShake da
  //   saqlanadi va har zarba (damage/heal tick)da ishga tushadi.
  function _getRoleCfg(obj) {
    if (!obj.userData || !obj.userData.roll) return null;
    const roll = obj.userData.roll;
    if (!roll.cameraShake) {
      const d = defaults({});
      roll.cameraShake = {
        enabled:         false,
        preset:          d.preset,
        intensity:       d.intensity,
        duration:        d.duration,
        durationUnit:    d.durationUnit,
        falloff:         d.falloff,
        frequency:       d.frequency,
        effectType:      d.effectType,
        effectDuration:  d.effectDuration,
        effectDurationUnit: d.effectDurationUnit,
        effectIntensity: d.effectIntensity,
      };
    }
    const c = roll.cameraShake;
    if (c.durationUnit       === undefined) c.durationUnit       = 'sec';
    if (c.effectDurationUnit === undefined) c.effectDurationUnit = 'sec';
    return c;
  }

  function _buildRoleSection(obj) {
    const cfg = _getRoleCfg(obj);
    if (!cfg) return '';
    const enabled = !!cfg.enabled;
    return `
      <div class="comp-block">
        <div class="comp-title" style="cursor:pointer"
             onclick="CameraShakeSystem._toggleRole()">
          <span class="tag" style="background:rgba(255,107,53,.18);color:var(--accent2)">SHK</span>
          <span style="flex:1">Camera Shake (har zarba)</span>
          <input type="checkbox" ${enabled?'checked':''}
                 onclick="event.stopPropagation();CameraShakeSystem._toggleRole();"
                 style="cursor:pointer">
        </div>
        ${enabled ? `
          ${_shakeFieldsHTML(cfg, 'cs-roll')}
          <button class="action-btn"
                  style="background:rgba(var(--accent3-rgb),.1);border-color:rgba(var(--accent3-rgb),.35);color:var(--accent3);margin-top:6px"
                  onclick="CameraShakeSystem._testRole()">▶ TEST</button>
        ` : `
          <div style="font-size:10px;color:var(--muted);padding:4px 0;text-align:center">
            Har damage/heal zarbasida silkinish — yoqing
          </div>
        `}
      </div>
    `;
  }

  function _wireRoleSection(obj) {
    const cfg = _getRoleCfg(obj);
    if (!cfg || !cfg.enabled) return;
    const bind = (id, key, isNum) => {
      const el = document.getElementById(id); if (!el) return;
      el.addEventListener('input', () => {
        cfg[key] = isNum ? (parseFloat(el.value) || 0) : el.value;
        if (key === 'preset') {
          const p = PRESETS[el.value];
          if (p && el.value !== 'Custom') {
            cfg.intensity = p.intensity;
            cfg.duration  = p.duration;
            cfg.falloff   = p.falloff;
            cfg.frequency = p.frequency;
          }
          if (typeof updateInspector === 'function') updateInspector();
        }
      });
    };
    bind('cs-roll-preset', 'preset',          false);
    bind('cs-roll-int',    'intensity',       true);
    bind('cs-roll-fall',   'falloff',         false);
    bind('cs-roll-freq',   'frequency',       true);
    bind('cs-roll-etype',  'effectType',      false);
    bind('cs-roll-eint',   'effectIntensity', true);
    _wireDurationUnits(cfg, 'cs-roll');
  }

  function _toggleRole() {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const cfg = _getRoleCfg(selectedObj);
    if (!cfg) return;
    cfg.enabled = !cfg.enabled;
    if (typeof updateInspector === 'function') updateInspector();
  }
  function _testRole() {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const cfg = _getRoleCfg(selectedObj);
    if (cfg) fireEphemeral(cfg);
  }

  // ── Inspector rebuild dan keyin blokni qo'shish ──────────────
  function _appendToInspector() {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    const ud = selectedObj.userData; if (!ud) return;
    const ic = document.getElementById('inspector-content'); if (!ic) return;

    if (ud.isCamera) {
      ic.insertAdjacentHTML('beforeend', _buildCameraSection(selectedObj));
      _wireCameraSection(selectedObj);
    } else if (ud.isHitbox) {
      ic.insertAdjacentHTML('beforeend', _buildHitboxSection(selectedObj));
      _wireHitboxSection(selectedObj);
    } else if (ud.roll && ud.roll.enabled && ud.roll.type === 'health') {
      // Roll blokining HTML'i endi inspector'da Roll bo'limi ICHIDA
      // (inspector.js render qiladi). Bu yerda faqat input'larni ulaymiz.
      _wireRoleSection(selectedObj);
    }
  }

  // Inspector qayta chizish uchun qulaylik
  function _refreshInspector() {
    if (typeof updateInspector === 'function') {
      try { updateInspector(); } catch(e) {}
    }
  }

  // ── Trigger param yorlig'i uchun yordamchilar ────────────────
  function _triggerParamLabel(src) {
    switch (src) {
      case 'TimeTrigger':   return 'Vaqt (s)';
      case 'QuestStep':     return 'Step ID';
      case 'CutsceneStart': return 'Cutscene nomi';
      case 'CutsceneEnd':   return 'Cutscene nomi';
      case 'ActionFlow':    return 'Action ID';
      case 'Manual':        return '—';
      default:              return 'Param';
    }
  }
  function _triggerParamPlaceholder(src) {
    switch (src) {
      case 'TimeTrigger':   return 'masalan 5.0';
      case 'QuestStep':     return 'masalan boss_defeated';
      case 'CutsceneStart': return 'intro_scene';
      case 'CutsceneEnd':   return 'intro_scene';
      case 'ActionFlow':    return 'action_id yoki bo\'sh';
      case 'Manual':        return '(ishlatilmaydi)';
      default:              return '';
    }
  }
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')
                          .replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ══════════════════════════════════════════════════════════════
  //  HOOKS
  // ══════════════════════════════════════════════════════════════

  // 1) main-loop dagi camModuleUpdate ni monkey-patch
  function _hookMainLoop() {
    if (typeof camModuleUpdate !== 'function') {
      setTimeout(_hookMainLoop, 100);
      return;
    }
    if (camModuleUpdate.__csPatched) return;
    const orig = camModuleUpdate;
    window.camModuleUpdate = function(delta) {
      orig(delta);
      try {
        update(delta);
        _cleanupEphemeral();
      } catch(e) {
        if (typeof log === 'function') log('❌ CameraShake update: ' + e.message, 'le');
      }
    };
    window.camModuleUpdate.__csPatched = true;
  }

  // 1b) renderer.render ni monkey-patch — silkinish faqat render paytida
  //     qo'llaniladi va darhol qaytariladi.
  function _hookRenderer() {
    if (typeof renderer === 'undefined' || !renderer.render) {
      setTimeout(_hookRenderer, 100);
      return;
    }
    if (renderer.render.__csPatched) return;
    const origRender = renderer.render.bind(renderer);
    renderer.render = function(scn, cam) {
      const c = cam || (typeof camera !== 'undefined' ? camera : null);
      const off = _currentOffset;
      const has = (off.x || off.y || off.z);
      if (c && has) {
        c.position.x += off.x;
        c.position.y += off.y;
        c.position.z += off.z;
        c.updateMatrixWorld(true);
        try { origRender(scn, cam); } finally {
          c.position.x -= off.x;
          c.position.y -= off.y;
          c.position.z -= off.z;
          c.updateMatrixWorld(true);
        }
      } else {
        origRender(scn, cam);
      }
    };
    renderer.render.__csPatched = true;
  }

  // 2) Play mode toggle bilan bog'lanish
  function _hookPlayMode() {
    const pb = document.getElementById('play-btn');
    if (pb && !pb.__csHooked) {
      pb.addEventListener('click', () => {
        setTimeout(() => {
          if (typeof isPlaying !== 'undefined') {
            if (isPlaying) onPlayStart(); else onPlayStop();
          }
        }, 30);
      });
      pb.__csHooked = true;
    }
  }

  // 3) Inspector monkey-patch — updateInspector chaqirilgach o'z blokimizni
  //    #inspector-content ga qo'shamiz.
  function _hookInspector() {
    if (typeof updateInspector !== 'function') {
      setTimeout(_hookInspector, 100);
      return;
    }
    if (updateInspector.__csPatched) return;
    const orig = updateInspector;
    window.updateInspector = function() {
      orig.apply(this, arguments);
      try { _appendToInspector(); } catch(e) {
        if (typeof log === 'function') log('❌ CameraShake inspector: ' + e.message, 'le');
      }
    };
    window.updateInspector.__csPatched = true;
    // Agar hozir tanlanganga qandaydir obyekt bor bo'lsa — darhol qayta chizamiz
    if (typeof selectedObj !== 'undefined' && selectedObj) _refreshInspector();
  }

  // 4) Hitbox integratsiyasi — HitboxSystem.update ni monkey-patch qilamiz.
  //
  //    NIMA UCHUN _fireActions monkey-patch ishlamaydi:
  //    HitboxSystem IIFE ichida _fireActions LOKAL closure funksiya.
  //    Ichki `_fireActions(hb, ent, 'enter', ...)` chaqiruvlari lokal
  //    referenceni ishlatadi, tashqi HitboxSystem._fireActions esa faqat
  //    alias. Uni qayta yozish ichki chaqiruvlarga ta'sir qilmaydi.
  //
  //    Yechim: HitboxSystem.update() chaqiruvidan KEYIN — u o'z
  //    `hb.userData._entitiesInside` Set ini yangilagach — biz uni oldingi
  //    frame dagi holat bilan solishtirib, enter/exit/stay transitionlarni
  //    aniqlaymiz va cameraShake action ini o'zimiz firing qilamiz.
  //
  //    Bu yondashuv HitboxSystem ning kolliziya logikasini qayta ishlamaydi
  //    — biz faqat uning natijalarini o'qiymiz.

  // Har bir hitbox uchun oldingi frame da ichida bo'lgan entity-lar Set i
  const _hbPrevInside = new WeakMap();  // hb → Set<entityRef>
  // 'stay' faza uchun cooldown taymer — har (hb, entity) juftligi uchun
  const _hbStayCooldown = new WeakMap(); // hb → Map<entityRef, secondsRemaining>

  function _processHitboxTransitions(delta) {
    if (typeof isPlaying === 'undefined' || !isPlaying) return;
    if (typeof objects === 'undefined') return;

    for (let i = 0, n = objects.length; i < n; i++) {
      const hb = objects[i];
      if (!hb || !hb.userData || !hb.userData.isHitbox) continue;
      const cfg = hb.userData.actions && hb.userData.actions.cameraShake;
      if (!cfg || !cfg.enabled) continue;

      const curInside = hb.userData._entitiesInside;
      if (!curInside) continue;   // HitboxSystem hali update qilmagan bo'lsa

      let prev = _hbPrevInside.get(hb);
      if (!prev) { prev = new Set(); _hbPrevInside.set(hb, prev); }

      // Cooldown taymerlarini kamaytiramiz (stay faza uchun)
      let cdMap = _hbStayCooldown.get(hb);
      if (cdMap) {
        cdMap.forEach((v, k) => {
          const nv = v - delta;
          if (nv <= 0) cdMap.delete(k); else cdMap.set(k, nv);
        });
      }

      // Transitionlar: enter (yangi kelgan), exit (chiqib ketgan), stay
      curInside.forEach(ent => {
        if (!prev.has(ent)) {
          // ENTER transition
          if (cfg.phase === 'enter') fireEphemeral(cfg);
          if (cfg.phase === 'stay')  {
            // Kirishda darhol ishga tushiramiz + cooldown o'rnatamiz
            fireEphemeral(cfg);
            if (!cdMap) { cdMap = new Map(); _hbStayCooldown.set(hb, cdMap); }
            cdMap.set(ent, (cfg.duration || 0.5) + (cfg.effectDuration || 0.5));
          }
        } else if (cfg.phase === 'stay') {
          // Ichida qolgan — cooldown bo'lmasa qayta ishga tushiramiz
          if (!cdMap) { cdMap = new Map(); _hbStayCooldown.set(hb, cdMap); }
          if (!cdMap.has(ent)) {
            fireEphemeral(cfg);
            cdMap.set(ent, (cfg.duration || 0.5) + (cfg.effectDuration || 0.5));
          }
        }
      });
      // EXIT transitionlar
      if (cfg.phase === 'exit') {
        prev.forEach(ent => {
          if (!curInside.has(ent)) fireEphemeral(cfg);
        });
      }

      // Yangi snapshot ni saqlaymiz
      const newSnap = new Set();
      curInside.forEach(e => newSnap.add(e));
      _hbPrevInside.set(hb, newSnap);
    }
  }

  // HitboxSystem.update ni monkey-patch qilamiz — u o'z ishini bajargach
  // biz transitionlarni o'qiymiz.
  function _hookHitbox() {
    if (typeof HitboxSystem === 'undefined' || !HitboxSystem.update) {
      setTimeout(_hookHitbox, 100);
      return;
    }
    if (HitboxSystem.update.__csPatched) return;
    const origUpdate = HitboxSystem.update;
    HitboxSystem.update = function(delta) {
      origUpdate.call(this, delta);
      try { _processHitboxTransitions(delta || 0); } catch(e) {
        if (typeof log === 'function') log('❌ CameraShake hitbox: ' + e.message, 'le');
      }
    };
    HitboxSystem.update.__csPatched = true;
  }

  // 5) Script sandbox ga cameraShake API qo'shish
  function _hookScriptAPI() {
    if (typeof SCRIPT_API !== 'undefined' && !SCRIPT_API.cameraShake) {
      SCRIPT_API.cameraShake = {
        trigger:             (id) => trigger(id),
        stop:                (id) => stop(id),
        stopAll:             ()   => stopAll(),
        setPreset:           (id, name) => setPreset(id, name),
        fire:                (source, param) => fire(source, param),
        notifyQuestStep:     (s)  => notifyQuestStep(s),
        notifyCutsceneStart: (n)  => notifyCutsceneStart(n),
        notifyCutsceneEnd:   (n)  => notifyCutsceneEnd(n),
        notifyActionFlow:    (n)  => notifyActionFlow(n),
        create:              (cfg) => create(cfg),
        remove:              (id)  => remove(id),
        fireEphemeral:       (cfg) => fireEphemeral(cfg),
        list:                ()    => all().map(i => ({
                                        id:i.id, name:i.name,
                                        source:i.triggerSource,
                                        preset:i.preset })),
      };
    }
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    _hookMainLoop();
    _hookRenderer();
    _hookPlayMode();
    _hookInspector();
    _hookHitbox();
    _hookScriptAPI();
    ensureOverlay();
    if (typeof log === 'function')
      log('💥 CameraShakeSystem ishga tushdi (Inspector paneli orqali)', 'lok');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }

  // ── 📤 Joriy silkinish offseti (CSS3D sinxroni uchun) ────────
  //   Izoh: camera-states.js dagi getCamFx bilan bir xil sabab —
  //   💻 PC blokning HTML ekrani alohida CSS3DRenderer bilan chiziladi
  //   va `renderer.render()` patch'ini ko'rmaydi. Sinxron bo'lmasa
  //   iframe ekran ichida tebranadi.
  function getCamFx() {
    return { pos: _currentOffset, rot: null, fov: 0 };
  }

  // ── PUBLIC API ───────────────────────────────────────────────
  return {
    // Instance boshqaruvi
    create, remove, get, all,
    // Runtime
    trigger, stop, stopAll, setPreset, update,
    getCamFx,
    // Ephemeral (hitbox uchun)
    fireEphemeral,
    // Trigger fire
    fire, notifyQuestStep, notifyCutsceneStart, notifyCutsceneEnd, notifyActionFlow,
    // Play mode
    onPlayStart, onPlayStop,
    // Persistence
    serialize, restore,
    // Inspector callbacks (inline onclick handler-lar uchun)
    _toggleCam, _testCam, _stopCam,
    _toggleHb,  _testHb,
    _toggleRole, _testRole, _getRoleCfg, _buildRoleSection,
    // Constants
    PRESETS, TRIGGER_SOURCES, FALLOFFS, EFFECT_TYPES,
  };
})();

// Qulaylik uchun alias
window.CameraShake = window.CameraShakeSystem;

// ============================================================