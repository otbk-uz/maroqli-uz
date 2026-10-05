// ============================================================
// TIMELINE EXPORT SYSTEM
//
// Two export modes:
//   1) Full Scene Export   → .zip
//        timeline.json + models/ + sounds/ + textures/
//        (Optionally includes hitbox / trigger data)
//   2) Object-Only Export  → single .json
//        Just position/rotation/scale keyframes for one object
//
// Also exposes:
//   - Reverse timeline playback (TimelineExportSystem.playTimeline)
//   - Interpolation utility mirroring the internal one from timeline.js
//
// UI text: Uzbek.  Code and comments: English.
// ============================================================

const TimelineExportSystem = (() => {
  'use strict';

  // ────────────────────────────────────────────────────────────
  // Timeline data accessors (TimelineSystem exposes read-only getters)
  // ────────────────────────────────────────────────────────────
  function _tracks() {
    if (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) {
      return TimelineSystem.tracks;
    }
    return [];
  }
  function _duration() {
    if (typeof TimelineSystem !== 'undefined' && typeof TimelineSystem.duration === 'number') {
      return TimelineSystem.duration;
    }
    return 5;
  }

  // ────────────────────────────────────────────────────────────
  // Interpolation — mirrors timeline.js internal implementation.
  // (timeline.js endi `interpolateTrack` ni eksport qiladi — maxsus
  //  treklar o'sha yerga topshiriladi, pastdagi izohga qarang.)
  // ────────────────────────────────────────────────────────────
  const _easings = {
    linear:  t => t,
    smooth:  t => t < .5 ? 2*t*t : -1+(4-2*t)*t,
    bounce:  t => {
      if (t < 1/2.75)   return 7.5625*t*t;
      if (t < 2/2.75)   { t-=1.5/2.75;  return 7.5625*t*t+.75; }
      if (t < 2.5/2.75) { t-=2.25/2.75; return 7.5625*t*t+.9375; }
      t-=2.625/2.75;    return 7.5625*t*t+.984375;
    },
    elastic: t => t===0||t===1 ? t : Math.pow(2,-10*t)*Math.sin((t*10-.75)*2*Math.PI/3)+1,
    back:    t => { const c=1.70158+1; return 1+c*Math.pow(t-1,3)+(c-1)*Math.pow(t-1,2); },
  };

  function _lerp(a, b, t) { return a + (b - a) * t; }
  function _lerpV3(a, b, t) {
    return { x: _lerp(a.x, b.x, t), y: _lerp(a.y, b.y, t), z: _lerp(a.z, b.z, t) };
  }

  function _applyState(obj, kf) {
    if (!obj || !kf) return;
    // ── ⭐ TO'LIQ QO'LLASHNI `timeline.js` GA TOPSHIRAMIZ ────────
    //  ⚠ ALOMAT: 🎞 GIF ga key qo'yib, so'ng o'sha trekni 🎯 hitbox /
    //    🔘 tugma / 👁 qarash slotiga bersangiz — HECH NIMA
    //    o'zgarmasdi.
    //
    //  SABAB: bu yerdagi nusxa faqat `pos` · `rot` · `scale` · `vis` ·
    //    `pcMode` · `pcOn` ni bilardi. Timelineда o'ynatilganda
    //    `timeline.js` ning TO'LIQ `applyState` i ishlardi va GIF ·
    //    material · glow · matn · chiroq · sinish keylari qo'llanardi.
    //    Ya'ni bir xil trek IKKI XIL natija berardi — qaysi yo'ldan
    //    ijro etilishiga qarab.
    //
    //  Endi yagona manba: `timeline.js` dagi `applyState`.
    //  Quyidagi nusxa faqat ZAXIRA (u fayl yuklanmagan bo'lsa).
    if (window.TimelineSystem && typeof TimelineSystem.applyState === 'function') {
      try { TimelineSystem.applyState(obj, kf); return; } catch (e) {}
    }
    if (kf.pos)   obj.position.set(kf.pos.x, kf.pos.y, kf.pos.z);
    if (kf.rot)   obj.rotation.set(kf.rot.x, kf.rot.y, kf.rot.z);
    if (kf.scale) obj.scale.set(kf.scale.x, kf.scale.y, kf.scale.z);
    if (kf.vis !== undefined) obj.visible = !!kf.vis;
    // 💻 PC BLOCK — YONIQ/O'CHIQ va ekran rejimi (faqat o'zgarganda qo'llaymiz)
    if (obj.userData && obj.userData.isPCBlock) {
      const PB = window.PCBlockSystem;
      if (kf.pcMode !== undefined && obj.userData.screenMode !== kf.pcMode) {
        obj.userData.screenMode = kf.pcMode;
        if (PB && PB._paintScreen) PB._paintScreen(obj);
      }
      if (kf.pcOn !== undefined && (!!obj.userData.powered) !== (!!kf.pcOn)) {
        if (PB && PB.setPower) PB.setPower(obj, !!kf.pcOn);
        else obj.userData.powered = !!kf.pcOn;
      }
    }
    obj.matrixWorldNeedsUpdate = true;
  }

  function _interpolateTrackAt(track, t) {
    const kfs = track && track.keyframes;
    if (!kfs || !kfs.length) return;

    // ── ⚠ MAXSUS TREKLAR — sahna obyektiga bog'lanmagan ─────────
    //  🌌 Skybox, 🌦 Weather, 🔎 Zoom, 🎨 Filter treklarining
    //  `objRef` i YO'Q — ular obyektni emas, SAHNA holatini
    //  o'zgartiradi. Pastdagi `if (!obj) return;` ularni jimgina
    //  tashlab yuborardi.
    //
    //  Alomat: timeline panelidan ▶ bosilsa skybox rangi silliq
    //  o'zgarardi, LEKIN o'sha timeline'ni hitbox yoki tugmaga
    //  biriktirsangiz — ishlamasdi. Chunki hitbox/tugma
    //  `TimelineExportSystem.playTimeline()` ni chaqiradi va u
    //  shu funksiyaga tushadi, `TimelineSystem.interpolateTrack`
    //  ga emas.
    //
    //  Endi maxsus treklar o'sha egasiga topshiriladi — u ularni
    //  qanday aralashtirishni biladi (rang silliq, rejim qadamli).
    //  ⚠ RO'YXAT BIRMA-BIR SANALGAN va aynan shu bois yangi maxsus
    //    trek qo'shilganda uni bu yerga yozish ESDAN CHIQARDI:
    //      💻📷 PC kamerasi va 💻🎛 PC filtri
    //    Alomat: timeline panelidan ▶ bosilsa ishlardi, LEKIN o'sha
    //    timeline'ni 🔘 tugma / 👁 qarash / 🎯 hitbox ga biriktirsangiz
    //    — ISHLAMASDI. Chunki ular shu funksiyaga tushadi va
    //    ro'yxatda yo'q trek `objRef` topilmagani uchun jimgina
    //    tashlab yuborilardi.
    //
    //  ⚠ Endi NEGATIV shart: \"obyektga bog'langan trek EMASmi?\" —
    //    ya'ni `objRef` i yo'q har qanday maxsus trek egasiga
    //    topshiriladi. Yangi trek qo'shilganda bu yerni yangilash
    //    SHART EMAS — xato o'z-o'zidan qaytmaydi.
    if (!track.objRef && (track.isSkybox || track.isWeather || track.isZoom ||
        track.isFilter || track.isKino || track.isBlockPick ||
        track.isPCCam || track.isPCFx)) {
      if (window.TimelineSystem && typeof TimelineSystem.interpolateTrack === 'function') {
        try { TimelineSystem.interpolateTrack(track, t); } catch (e) {}
      }
      return;
    }

    const obj = track.objRef;
    if (!obj) return;

    const first = kfs[0].time, last = kfs[kfs.length - 1].time;
    if (t <= first) { _applyState(obj, kfs[0]); return; }
    if (t >= last)  { _applyState(obj, kfs[kfs.length - 1]); return; }

    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i], b = kfs[i + 1];
      if (t >= a.time && t <= b.time) {
        const raw = (t - a.time) / Math.max(0.0001, b.time - a.time);
        const ease = _easings[a.ease || 'smooth'] || _easings.smooth;
        const et = ease(raw);
        const kf = {};
        if (a.pos && b.pos)     kf.pos   = _lerpV3(a.pos,   b.pos,   et);
        if (a.rot && b.rot)     kf.rot   = _lerpV3(a.rot,   b.rot,   et);
        if (a.scale && b.scale) kf.scale = _lerpV3(a.scale, b.scale, et);
        if (a.vis !== undefined) kf.vis = et < 0.5 ? a.vis : b.vis;
        // 💻 PC BLOCK — qadamli: oldingi holatda turadi, keyingi keyда almashadi
        if (obj.userData && obj.userData.isPCBlock) {
          if (a.pcOn   !== undefined) kf.pcOn   = et < 1 ? a.pcOn   : b.pcOn;
          if (a.pcMode !== undefined) kf.pcMode = et < 1 ? a.pcMode : b.pcMode;
        }
        // 🔊 SOUND BLOCK balandlik shkalasi — SILLIQ.
        //  ⚠ SHU YERDA HAM bo'lishi SHART. Bu ijrochi 🧊 NoScript
        //    sloti, 🎯 hitbox va 🔘 tugma orqali ishga tushadi —
        //    ya'ni EKSPORT QILINGAN o'yindagi asosiy yo'l. Faqat
        //    `timeline.js` ga qo'shsak, o'yinda ovoz "ko'tarilmay"
        //    qolardi va sabab ko'rinmasdi.
        if (typeof a.sbVol === 'number' && typeof b.sbVol === 'number') {
          kf.sbVol = a.sbVol + (b.sbVol - a.sbVol) * et;
        }
        _applyState(obj, kf);
        return;
      }
    }
  }

  // ────────────────────────────────────────────────────────────
  // Timeline playback controller (forward + reverse)
  //
  // We run our own RAF loop so we can play in either direction
  // at custom speed. When active, this drives the same tracks
  // that TimelineSystem drives — so we stop TimelineSystem first.
  // ────────────────────────────────────────────────────────────
  const _pb = {
    active:    false,
    direction: 'forward',  // 'forward' | 'reverse'
    speed:     1.0,
    t:         0,
    lastTS:    null,
    rafId:     null,
    onDone:    null,
    paused:    false,
    blocks:    [],
    _bi:       0,
  };

  function _stopExternalTimelinePlayback() {
    // Stop TimelineSystem's internal playback so we don't fight it
    if (typeof tlStop === 'function' && TimelineSystem && TimelineSystem.isPlaying) {
      try { tlStop(); } catch(e) {}
    }
  }

  function _playbackStep(ts) {
    if (!_pb.active || _pb.paused) return;
    const dur = _duration();
    if (_pb.lastTS !== null) {
      const dt = ((ts - _pb.lastTS) / 1000) * _pb.speed;
      _pb.t += (_pb.direction === 'forward' ? dt : -dt);

      // ── Bloklash nuqtasi (forward) ──
      if (_pb.direction === 'forward' && _pb.blocks.length && _pb._bi < _pb.blocks.length) {
        const blk = _pb.blocks[_pb._bi];
        if (_pb.t >= blk.time) {
          _freezeAtBlock(_pb, blk, _applyAllAt, _playbackStep);
          return;
        }
      }

      if (_pb.direction === 'forward' && _pb.t >= dur) {
        _pb.t = dur;
        _applyAllAt(_pb.t);
        stopTimeline();
        return;
      }
      if (_pb.direction === 'reverse' && _pb.t <= 0) {
        _pb.t = 0;
        _applyAllAt(_pb.t);
        stopTimeline();
        return;
      }
    }
    _pb.lastTS = ts;
    _applyAllAt(_pb.t);
    _pb.rafId = requestAnimationFrame(_playbackStep);
  }

  function _applyAllAt(t) {
    _tracks().forEach(tr => _interpolateTrackAt(tr, t));
  }

  // ────────────────────────────────────────────────────────────
  //  🌌 playSpecialTrack — sahna holatini o'zgartiruvchi YAKKA trek
  //
  //  ⚠ NEGA ALOHIDA: 🌌 Skybox, 🌦 Weather, 🔎 Zoom, 🎨 Filter
  //    treklari sahna OBYEKTIGA bog'lanmagan (`objRef: null`).
  //    Hitbox/tugmaning "bitta trekni ijro et" yo'li esa avval
  //    `track.objRef || objects.find(...)` bilan nishon obyekt
  //    qidirardi va topa olmay "trek obyekti topilmadi" deb
  //    chiqib ketardi.
  //
  //    Alomat: timeline panelidan ▶ bosilsa skybox rangi o'zgarardi,
  //    lekin o'sha trekni hitbox yoki tugmaga biriktirsangiz —
  //    hech nima bo'lmasdi.
  //
  //  Bu yerda obyekt umuman kerak emas: vaqtni yurgizamiz va har
  //  kadr `TimelineSystem.interpolateTrack` ga topshiramiz — u
  //  rangni silliq, rejimni qadamli aralashtirishni biladi.
  // ────────────────────────────────────────────────────────────
  const _specialPlaybacks = new Set();

  function isSpecialTrack(tr) {
    return !!(tr && (tr.isSkybox || tr.isWeather || tr.isZoom || tr.isFilter));
  }

  function playSpecialTrack(opts) {
    opts = opts || {};
    const track = opts.track;
    const kfs = track && track.keyframes;
    if (!kfs || !kfs.length) return null;

    const TS = window.TimelineSystem;
    if (!TS || typeof TS.interpolateTrack !== 'function') {
      log('⚠ TimelineSystem.interpolateTrack topilmadi', 'lw');
      return null;
    }

    const times = kfs.map(k => k.time).sort((a, b) => a - b);
    const t0 = times[0], t1 = times[times.length - 1];
    // Bitta keyframe bo'lsa — shu holatni QO'YAMIZ va tugatamiz
    if (t1 - t0 < 0.001) { try { TS.interpolateTrack(track, t0); } catch (e) {} return null; }

    const dir   = opts.direction === 'reverse' ? 'reverse' : 'forward';
    const speed = Math.max(0.05, opts.speed || 1);
    const loop  = !!opts.loop;
    const h = { active: true, t: dir === 'forward' ? t0 : t1, last: null, raf: 0 };

    h.stop = () => {
      if (!h.active) return;
      h.active = false;
      if (h.raf) cancelAnimationFrame(h.raf);
      _specialPlaybacks.delete(h);
      if (typeof opts.onDone === 'function') { try { opts.onDone(); } catch (e) {} }
    };

    const step = ts => {
      if (!h.active) return;
      if (h.last !== null) {
        const dt = ((ts - h.last) / 1000) * speed;
        h.t += (dir === 'forward' ? dt : -dt);
        if (dir === 'forward' && h.t >= t1) {
          if (loop) h.t = t0;
          else { h.t = t1; try { TS.interpolateTrack(track, h.t); } catch (e) {} h.stop(); return; }
        }
        if (dir === 'reverse' && h.t <= t0) {
          if (loop) h.t = t1;
          else { h.t = t0; try { TS.interpolateTrack(track, h.t); } catch (e) {} h.stop(); return; }
        }
      }
      h.last = ts;
      try { TS.interpolateTrack(track, h.t); } catch (e) {}
      h.raf = requestAnimationFrame(step);
    };

    _specialPlaybacks.add(h);
    h.raf = requestAnimationFrame(step);
    return h;
  }

  function stopAllSpecialTracks() { [..._specialPlaybacks].forEach(h => h.stop()); }

  function playTimeline(opts) {
    opts = opts || {};
    const dir   = opts.direction === 'reverse' ? 'reverse' : 'forward';
    const speed = Math.max(0.05, opts.speed || 1.0);
    const dur   = _duration();

    _stopExternalTimelinePlayback();

    _pb.active    = true;
    _pb.direction = dir;
    _pb.speed     = speed;
    _pb.t         = (dir === 'forward') ? 0 : dur;
    _pb.lastTS    = null;
    _pb.onDone    = opts.onDone || null;
    _pb.paused    = false;
    _pb._bi       = 0;
    _pb.blocks    = Array.isArray(opts.blocks)
      ? opts.blocks.filter(b => typeof b.time === 'number').slice().sort((a, b) => a.time - b.time)
      : [];

    if (_pb.rafId) cancelAnimationFrame(_pb.rafId);
    _pb.rafId = requestAnimationFrame(_playbackStep);
    log(`⏱ Timeline: ${dir === 'forward' ? 'oldinga' : 'teskariga'} (${speed.toFixed(2)}x)`, 'lok');
  }

  function stopTimeline() {
    _pb.active = false;
    if (_pb.rafId) { cancelAnimationFrame(_pb.rafId); _pb.rafId = null; }
    _pb.lastTS = null;
    const cb = _pb.onDone; _pb.onDone = null;
    if (typeof cb === 'function') { try { cb(); } catch(e) {} }
  }

  // ────────────────────────────────────────────────────────────
  // Play arbitrary keyframes on a single target object.
  // Self-contained — does not touch TimelineSystem.tracks.
  //
  // Used by HitboxObject's "Import Qilingan Animatsiya" action:
  // the keyframes come from an Object-Only Export .json file
  // imported directly into the hitbox, so the source scene
  // (where the animation was authored) is not required.
  //
  // Multiple concurrent handles are supported — the caller gets
  // a { stop } object back so it can cancel its own playback.
  // ────────────────────────────────────────────────────────────
  const _keyPlaybacks = new Set();   // track active playbacks for cleanup

  // ── 🎬 Animatsiya "egalik" hisoblagichi ──────────────────────
  //  Obyektni keyframe animatsiyasi haydab turganida FIZIKA unga
  //  tegmasligi kerak: `updatePhysics` har kadr `position`/`quaternion`
  //  ni Rapier'dagi qiymat bilan qayta yozadi. Animatsiya qo'yadi —
  //  fizika darhol tortib oladi, natijada animatsiya "boshlanmay
  //  tugaydi".
  //
  //  ⚠ HISOBLAGICH, oddiy bayroq emas: bitta obyektni bir necha
  //    animatsiya haydashi mumkin. Bayroq bo'lsa, birinchisi tugashi
  //    bilan ikkinchisi hali ketayotganda fizika qo'shilib qolardi.
  function _animHold(obj, delta) {
    if (!obj || !obj.userData) return;
    const n = Math.max(0, (obj.userData._animDriven || 0) + delta);
    obj.userData._animDriven = n;
    if (n === 0) {
      delete obj.userData._animDriven;
      if (typeof window.syncPhysicsBodyToMesh === 'function') {
        try { window.syncPhysicsBodyToMesh(obj); } catch (e) {}
      }
    }
  }

  // ── Bloklash (pause) tizimi ──────────────────────────────────
  // Animatsiya belgilangan key'ga yetganda to'xtaydi va biriktirilgan
  // custom tugma bosilguncha kutadi. Tugma bosilsa davom etadi.
  window._blockWaiters = window._blockWaiters || {};   // buttonId -> Set(resumeFn)
  function _registerBlockWaiter(buttonId, fn) {
    const key = String(buttonId == null ? '' : buttonId);
    if (!window._blockWaiters[key]) window._blockWaiters[key] = new Set();
    window._blockWaiters[key].add(fn);
  }
  function _unregisterBlockWaiter(buttonId, fn) {
    const key = String(buttonId == null ? '' : buttonId);
    const set = window._blockWaiters[key];
    if (set) set.delete(fn);
  }
  // Custom tugma bosilganda chaqiriladi — o'sha tugmaga biriktirilgan bloklarni ochadi
  window._resumeBlockedAnim = function(buttonId) {
    const key = String(buttonId == null ? '' : buttonId);
    const set = window._blockWaiters[key];
    if (set && set.size) {
      const fns = Array.from(set); set.clear();
      fns.forEach(fn => { try { fn(); } catch (e) {} });
      return fns.length;
    }
    return 0;
  };

  // ── Blokda muzlash — oddiy blok yoki SIKL (loop) bloki ────────
  // `state` — _pb yoki playObjectKeyframes handle (ikkalasida ham
  //   .t .paused .lastTS .rafId .active ._bi maydonlari bor).
  // `applyFn(t)` — o'sha t vaqtidagi kadrni qo'llaydi.
  // `stepFn` — davom ettirish uchun RAF step funksiyasi.
  //
  // Oddiy blok: belgilangan tugma bosilsa keyingi blokka o'tadi (_bi++).
  // Sikl bloki (blk.loop && blk.loopBack < blk.time):
  //   • repeat tugma (blk.key / blk.buttonId) → loopBack'ga qaytib
  //     segmentni QAYTA o'ynaydi (yana shu blokda muzlaydi).
  //   • exit tugma (blk.exitKey / blk.exitButtonId) → sikldan chiqib
  //     oldinga davom etadi (_bi++).
  function _freezeAtBlock(state, blk, applyFn, stepFn) {
    state.t = blk.time;
    applyFn(state.t);
    state.paused = true;
    state.lastTS = null;

    const isLoop = blk.loop === true &&
                   typeof blk.loopBack === 'number' &&
                   blk.loopBack < blk.time;
    let settled = false;
    const fk = (c) => (window._friendlyKey ? window._friendlyKey(c) : c);

    if (isLoop) {
      // Sikl (BUMERANG) bloki:
      //   • sikl tugma (blk.key / blk.buttonId) → segment ORQAGA silliq
      //     o'ynaydi (blk.time → loopBack), so'ng O'ZI oldinga qaytadi
      //     (loopBack → blk.time) va yana shu yerda to'xtaydi. Har bir bosish
      //     = bitta "4→3→4" aylanish.
      //   • davom tugma (blk.exitKey / blk.exitButtonId) → oldinga davom (5 ga).
      //   • hech narsa bosilmasa — blk.time da turaveradi.
      const loopKeys = [];
      const exitKeys = [];
      if (blk.buttonId)     loopKeys.push(String(blk.buttonId));
      if (blk.key)          loopKeys.push('key:' + blk.key);
      if (blk.exitButtonId) exitKeys.push(String(blk.exitButtonId));
      if (blk.exitKey)      exitKeys.push('key:' + blk.exitKey);
      if (!loopKeys.length) loopKeys.push('');   // tugma tanlanmagan — istalgan tugma

      let loopFn, exitFn;
      const cleanup = () => {
        loopKeys.forEach(k => _unregisterBlockWaiter(k, loopFn));
        exitKeys.forEach(k => _unregisterBlockWaiter(k, exitFn));
      };
      const arm = () => {
        settled = false;
        loopKeys.forEach(k => _registerBlockWaiter(k, loopFn));
        exitKeys.forEach(k => _registerBlockWaiter(k, exitFn));
      };
      // Bumerang: blk.time → loopBack (teskari), keyin loopBack → blk.time
      // (oldinga), so'ng qayta shu blokda to'xtab kutadi.
      const runBoomerang = () => {
        const spd = Math.max(0.05, state.speed || 1);
        let dir = -1;      // avval teskari (4→3)
        let last = null;
        const frame = (ts) => {
          if (!state.active) return;
          if (last !== null) {
            const dt = ((ts - last) / 1000) * spd;
            state.t += dir * dt;
            if (dir < 0 && state.t <= blk.loopBack) {
              state.t = blk.loopBack; dir = 1;    // 3 ga yetdi → oldinga (3→4)
            } else if (dir > 0 && state.t >= blk.time) {
              state.t = blk.time;                 // 4 ga qaytdi
              applyFn(state.t);
              arm();                              // yana kutadi
              return;
            }
          }
          last = ts;
          applyFn(state.t);
          state.rafId = requestAnimationFrame(frame);
        };
        state.rafId = requestAnimationFrame(frame);
      };
      loopFn = () => {
        if (settled || !state.active) return;
        settled = true; cleanup();
        runBoomerang();
      };
      exitFn = () => {
        if (settled || !state.active) return;
        settled = true; cleanup();
        state._bi++;                  // sikldan chiqib oldinga davom
        state.paused = false;
        state.lastTS = null;
        state.rafId = requestAnimationFrame(stepFn);
      };
      arm();
      log(`🔁 Sikl bloki (t=${blk.time.toFixed(2)}s ↔ ${blk.loopBack.toFixed(2)}s bumerang)` +
          (blk.key ? ` — ⌨ ${fk(blk.key)} sikl` : '') +
          (blk.exitKey ? ` | ⌨ ${fk(blk.exitKey)} davom` :
           (blk.exitButtonId ? ' | 🔘 tugma davom' : '')) +
          ' kutilmoqda', 'lw');
      return;
    }

    // ── Oddiy blok (eski xatti-harakat) ──
    const resumeFn = () => {
      if (settled || !state.active) return;
      settled = true;
      state._bi++;
      state.paused = false;
      state.lastTS = null;
      state.rafId = requestAnimationFrame(stepFn);
    };
    if (blk.buttonId) _registerBlockWaiter(blk.buttonId, resumeFn);
    if (blk.key)      _registerBlockWaiter('key:' + blk.key, resumeFn);
    if (!blk.buttonId && !blk.key) _registerBlockWaiter('', resumeFn);
    log(`⏸ Animatsiya bloklandi (t=${blk.time.toFixed(2)}s)` +
        (blk.key ? ` — ⌨ ${fk(blk.key)}` : '') +
        (blk.buttonId ? ' — 🔘 tugma' : '') + ' kutilmoqda', 'lw');
  }

  // Klaviatura tugmasi bilan bloklangan animatsiyani ochish (faqat play'da)
  document.addEventListener('keydown', (e) => {
    if (typeof isPlaying !== 'undefined' && !isPlaying) return;
    if (!window._resumeBlockedAnim) return;
    window._resumeBlockedAnim('key:' + e.code);   // aniq tugma
    window._resumeBlockedAnim('');                // biriktirilmagan bloklar — istalgan tugma
  });

  function playObjectKeyframes(opts) {
    opts = opts || {};
    const target    = opts.target;
    const rawKfs    = opts.keyframes;
    const direction = opts.direction === 'reverse' ? 'reverse' : 'forward';
    const speed     = Math.max(0.05, opts.speed || 1.0);
    const loop      = !!opts.loop;
    const onDone    = opts.onDone;

    // ── 🎨 MAXSUS TREKLAR — nishon obyekti YO'Q ──────────────────
    //  Filtr · ob-havo · skybox · kino kamera · zoom butun SAHNAGA
    //  ta'sir qiladi, biror obyektga emas.
    //
    //  ⚠ ALOMAT: 🎯 hitbox slotiga filtr treki qo'yilsa, u UMUMAN
    //    ishlamasdi. Ikki to'siq bor edi:
    //      1. quyidagi shart `!target` da darhol chiqib ketardi;
    //      2. `track` yasalganda tur bayrog'i (`isFilter` …)
    //         ko'chirilmasdi, ya'ni `interpolateTrack` uni ODDIY
    //         obyekt treki deb hisoblab, `pos/rot/scale` qidirardi
    //         va filtr qiymatlarini e'tiborsiz qoldirardi.
    //  ⚠ RO'YXAT YANA BIRMA-BIR SANALGAN edi va yangi treklar unga
    //    qo'shilmagandi. Alomat: 🎯 hitbox SLOTIGA 💻 PC kamerasi yoki
    //    💻 PC filtri treki qo'yilsa
    //    ISHLAMASDI — butun timeline'ni ishga tushirsa ishlardi.
    //    (`playTimeline` boshqa yo'l; u 58.96 da tuzatilgan.)
    const kind = opts.trackKind || null;
    const KIND_FLAG = { filter: 'isFilter', weather: 'isWeather',
                        skybox: 'isSkybox', kino: 'isKino', zoom: 'isZoom',
                        pccam: 'isPCCam', pcfx: 'isPCFx' };
    const isSpecial = !!(kind && KIND_FLAG[kind]);

    if ((!target && !isSpecial) || !Array.isArray(rawKfs) || rawKfs.length < 1) {
      log("⚠ playObjectKeyframes: target yoki keyframe yo'q", 'lw');
      return null;
    }

    // Sort a defensive copy so we never mutate the caller's array
    const kfs = rawKfs.slice().sort((a, b) => (a.time || 0) - (b.time || 0));
    const startT = kfs[0].time || 0;
    const endT   = kfs[kfs.length - 1].time || 0;

    // Bloklash nuqtalari (faqat forward yo'nalishda) — vaqt bo'yicha tartib
    const blocks = Array.isArray(opts.blocks)
      ? opts.blocks.filter(b => typeof b.time === 'number').slice().sort((a, b) => a.time - b.time)
      : [];

    // Fake track so we can reuse _interpolateTrackAt
    const track = { objRef: target, keyframes: kfs };
    // 🎨 Maxsus trek bayrog'i — `interpolateTrack` shunga qarab
    //    filtr/ob-havo/skybox yo'lini tanlaydi.
    if (isSpecial) {
      track[KIND_FLAG[kind]] = true;
      //  ⚠ EGASINING ID si HAM ko'chiriladi. Busiz 💻 PC va 🎨 canvas
      //    treklari \"qaysi obyekt?\" degan savolga javobsiz qolib,
      //    `applyPCCanvasKF` ni jimgina tashlab yuborardi — slot
      //    ishlayotgandek ko'rinib, hech nima o'zgarmasdi.
      if (opts.pcId != null) track.pcId = opts.pcId;
    }

    const handle = {
      active:   true,
      direction,
      speed,
      loop,
      t:        (direction === 'forward') ? startT : endT,
      lastTS:   null,
      rafId:    null,
      paused:   false,
      blocks,
      _bi:      0,
      stop() {
        if (!this._held) return this._finish();
        this._held = false;
        if (target) _animHold(target, -1);   // 🎬 fizikaga obyektni qaytaramiz
        this._finish();
      },
      _finish() {
        this.active = false;
        this.paused = false;
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        _keyPlaybacks.delete(this);
      },
      _held: true,
    };
    // ⚠ Maxsus trekda (filtr · ob-havo · …) nishon YO'Q — fizika
    //   ushlab turadigan obyekt ham yo'q.
    if (target) _animHold(target, +1);       // 🎬 fizika bu obyektga tegmasin
    _keyPlaybacks.add(handle);

    const step = (ts) => {
      if (!handle.active || handle.paused) return;
      if (handle.lastTS !== null) {
        const dt = ((ts - handle.lastTS) / 1000) * handle.speed;
        handle.t += (handle.direction === 'forward' ? dt : -dt);

        // ── Bloklash nuqtasi (forward) ──
        if (handle.direction === 'forward' && handle.blocks.length && handle._bi < handle.blocks.length) {
          const blk = handle.blocks[handle._bi];
          if (handle.t >= blk.time) {
            _freezeAtBlock(handle, blk, (tt) => _interpolateTrackAt(track, tt), step);
            return;
          }
        }

        const forwardDone = handle.direction === 'forward' && handle.t >= endT;
        const reverseDone = handle.direction === 'reverse' && handle.t <= startT;
        if (forwardDone || reverseDone) {
          if (handle.loop) {
            handle.t = (handle.direction === 'forward') ? startT : endT;
            handle._bi = 0;   // loop — bloklarni qayta yoqamiz
          } else {
            handle.t = forwardDone ? endT : startT;
            _interpolateTrackAt(track, handle.t);
            handle.stop();
            if (typeof onDone === 'function') { try { onDone(); } catch(e) {} }
            return;
          }
        }
      }
      handle.lastTS = ts;
      _interpolateTrackAt(track, handle.t);
      handle.rafId = requestAnimationFrame(step);
    };
    handle.rafId = requestAnimationFrame(step);

    log(`▶ Import KF: ${direction === 'forward' ? 'oldinga' : 'teskariga'} — ` +
        `${kfs.length} KF, ${(endT - startT).toFixed(2)}s @ ${speed.toFixed(2)}x` +
        (blocks.length ? ` | ${blocks.length} blok` : ''), 'lok');
    return handle;
  }

  function stopAllObjectKeyframePlaybacks() {
    _keyPlaybacks.forEach(h => h.stop());
    _keyPlaybacks.clear();
    if (window._blockWaiters) window._blockWaiters = {};
  }

  // ────────────────────────────────────────────────────────────
  // Asset collection helpers (Full Scene Export)
  // ────────────────────────────────────────────────────────────

  // Find the loadedModels entry that best matches a scene object.
  // Match strategy: userData.name → loadedModels[i].name.
  function _findModelForObject(obj) {
    if (typeof loadedModels === 'undefined' || !obj || !obj.userData) return null;
    const targetName = obj.userData._sourceModelName ||
                       obj.userData.modelName ||
                       obj.userData.name;
    if (!targetName) return null;
    return loadedModels.find(lm =>
      lm.name === targetName ||
      lm.name === obj.userData.name ||
      (obj.userData.name && obj.userData.name.startsWith(lm.name))
    ) || null;
  }

  // Encode an AudioBuffer as WAV (16-bit PCM, little-endian).
  // Returns an ArrayBuffer suitable for a ZIP entry.
  function _audioBufferToWav(buffer) {
    const numCh = buffer.numberOfChannels;
    const sr    = buffer.sampleRate;
    const bit   = 16;
    const bpc   = bit / 8;
    const dataLen = buffer.length * numCh * bpc;
    const ab = new ArrayBuffer(44 + dataLen);
    const v  = new DataView(ab);
    const w  = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };

    w(0, 'RIFF');
    v.setUint32(4, 36 + dataLen, true);
    w(8, 'WAVE');
    w(12, 'fmt ');
    v.setUint32(16, 16, true);        // fmt chunk size
    v.setUint16(20, 1, true);         // PCM
    v.setUint16(22, numCh, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * numCh * bpc, true);
    v.setUint16(32, numCh * bpc, true);
    v.setUint16(34, bit, true);
    w(36, 'data');
    v.setUint32(40, dataLen, true);

    const chans = [];
    for (let i = 0; i < numCh; i++) chans.push(buffer.getChannelData(i));

    let off = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numCh; c++) {
        let s = Math.max(-1, Math.min(1, chans[c][i]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        v.setInt16(off, s | 0, true);
        off += 2;
      }
    }
    return ab;
  }

  // Turn a data-URL / http URL into base64 bytes for a ZIP entry.
  // Returns {base64, ext} or null if unsupported.
  async function _fetchTextureBase64(src) {
    if (!src) return null;
    if (src.startsWith('data:')) {
      const commaIdx = src.indexOf(',');
      const header   = src.substring(0, commaIdx);
      const b64      = src.substring(commaIdx + 1);
      const mimeM    = /data:([^;]+)/.exec(header);
      const mime     = mimeM ? mimeM[1] : 'image/png';
      const ext      = mime.split('/')[1] || 'png';
      return { base64: b64, ext };
    }
    // Non-data URL — try fetch. May fail for cross-origin sources.
    try {
      const res  = await fetch(src);
      const blob = await res.blob();
      const b64  = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload  = () => {
          const s = fr.result;
          const i = s.indexOf(',');
          resolve(i >= 0 ? s.substring(i + 1) : s);
        };
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      return { base64: b64, ext };
    } catch (e) {
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────
  // EXPORT MODE 1 — Full Scene Export
  // ────────────────────────────────────────────────────────────
  async function exportFullScene(opts) {
    opts = opts || {};
    const exportName        = (opts.exportName        || 'timeline').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const includeTriggerData = opts.includeTriggerData !== false;   // default true

    if (typeof JSZip === 'undefined') {
      log("❌ JSZip mavjud emas — eksport qilib bo'lmadi", 'le');
      return false;
    }

    const tracks = _tracks();
    if (!tracks.length) {
      log("⚠ Timeline bo'sh — eksport qilinadigan animatsiya yo'q", 'lw');
      return false;
    }

    log("📦 Timeline eksport tayyorlanmoqda…", 'lw');
    const zip = new JSZip();

    // ── 1) Determine which objects are referenced by the timeline
    const animatedObjIds = new Set();
    tracks.forEach(t => { if (t.objId != null) animatedObjIds.add(String(t.objId)); });

    // Also include hitboxes if includeTriggerData is on
    const includedObjects = [];
    if (typeof objects !== 'undefined') {
      objects.forEach(o => {
        if (!o.userData) return;
        const oid = String(o.userData.id);
        if (animatedObjIds.has(oid)) {
          includedObjects.push(o);
        } else if (includeTriggerData && o.userData.isHitbox) {
          includedObjects.push(o);
        }
      });
    }

    // ── 2) Serialize per-object metadata
    const objectsData = includedObjects.map(o => {
      const base = {
        id:       o.userData.id,
        name:     o.userData.name,
        type:     o.userData.type || 'Mesh',
        position: { x: o.position.x, y: o.position.y, z: o.position.z },
        rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
        scale:    { x: o.scale.x,    y: o.scale.y,    z: o.scale.z    },
      };
      // Material / color hints
      if (o.material && o.material.color) {
        base.color     = '#' + o.material.color.getHexString();
        base.roughness = o.material.roughness;
        base.metalness = o.material.metalness;
      }
      // Collision mode ('inline' — o'yinchi o'tadi | 'block'/undefined — solid).
      // Import shu qiymatni saqlab qoladi (har obyekt o'z rejimida bo'ladi).
      base.colliderMode = o.userData.colliderMode || null;
      // Hitbox data (only when includeTriggerData is on)
      if (o.userData.isHitbox) {
        base.isHitbox       = true;
        base.hitboxSize     = o.userData.hitboxSize    || { x: 2, y: 2, z: 2 };
        base.triggerType    = o.userData.triggerType   || 'onEnter';
        base.targetObjectId = o.userData.targetObjectId || null;
        base.reverseMode    = o.userData.reverseMode    || null;
        base.actions        = o.userData.actions ? JSON.parse(JSON.stringify(o.userData.actions)) : null;
      }
      // GLB model reference (filename resolved after model collection below)
      if (o.userData.isGLB || o.userData.isGLTF) {
        base.isGLB     = true;
        base.modelName = o.userData._sourceModelName || o.userData.modelName || o.userData.name;
      }
      return base;
    });

    // ── 3) Serialize timeline tracks (safely, no circular refs)
    const timelineTracks = tracks.map(t => ({
      objId:     t.objId,
      objName:   t.objName,
      loop:      t.loop || false,
      keyframes: (t.keyframes || []).map(k => ({
        time:  k.time,
        ease:  k.ease || 'smooth',
        tangent: k.tangent || 'auto',
        pos:   k.pos   ? { x: k.pos.x,   y: k.pos.y,   z: k.pos.z }   : undefined,
        rot:   k.rot   ? { x: k.rot.x,   y: k.rot.y,   z: k.rot.z }   : undefined,
        scale: k.scale ? { x: k.scale.x, y: k.scale.y, z: k.scale.z } : undefined,
        vis:   k.vis,
        pcOn:   k.pcOn,     // 💻 PC block YONIQ/O'CHIQ
        pcMode: k.pcMode,   // 💻 PC block ekran rejimi
      })),
    }));

    // ── 4) Collect models (from loadedModels), sounds (from SoundSystem),
    //       textures (from object materials)
    const modelFileMap = {};   // logical name → 'models/<safe>.glb'
    const soundFileMap = {};   // sound name → 'sounds/<safe>.wav'
    const textureFileMap = {}; // objectId → 'textures/<safe>.<ext>'

    // Models
    if (typeof loadedModels !== 'undefined') {
      includedObjects.forEach(o => {
        if (!(o.userData.isGLB || o.userData.isGLTF)) return;
        const lm = _findModelForObject(o);
        if (!lm || !lm.buffer || modelFileMap[lm.name]) return;
        const safe = lm.name.replace(/[^a-zA-Z0-9_\-]/g, '_') + '.glb';
        const rel  = 'models/' + safe;
        zip.folder('models').file(safe, lm.buffer);
        modelFileMap[lm.name] = rel;
      });
    }
    // Attach model file path to serialized object metadata
    objectsData.forEach(od => {
      if (od.isGLB && od.modelName && modelFileMap[od.modelName]) {
        od.modelFile = modelFileMap[od.modelName];
      }
    });

    // Sounds — collect from any included hitbox's soundtrack action
    if (typeof SoundSystem !== 'undefined' && SoundSystem.library) {
      const soundsSeen = new Set();
      includedObjects.forEach(o => {
        const a = o.userData && o.userData.actions;
        if (a && a.soundtrack && a.soundtrack.enabled && a.soundtrack.soundName) {
          soundsSeen.add(a.soundtrack.soundName);
        }
      });
      soundsSeen.forEach(name => {
        const def = SoundSystem.library[name];
        if (!def || !def.buffer) return;
        try {
          const wav = _audioBufferToWav(def.buffer);
          const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_') + '.wav';
          zip.folder('sounds').file(safe, wav);
          soundFileMap[name] = 'sounds/' + safe;
        } catch (e) {
          log(`⚠ Ovoz eksport qilinmadi: ${name} (${e.message})`, 'lw');
        }
      });
    }
    // Attach sound file path to hitbox action metadata
    for (const od of objectsData) {
      if (od.isHitbox && od.actions && od.actions.soundtrack && od.actions.soundtrack.soundName) {
        const p = soundFileMap[od.actions.soundtrack.soundName];
        if (p) od.actions.soundtrack.soundFile = p;
      }
    }

    // Textures
    for (const o of includedObjects) {
      if (!o.material || !o.material.map || !o.material.map.image) continue;
      const src = o.material.map.image.src || o.userData.textureBase64;
      if (!src) continue;
      const encoded = await _fetchTextureBase64(src);
      if (!encoded) continue;
      const safe = `tex_${o.userData.id}.${encoded.ext}`;
      zip.folder('textures').file(safe, encoded.base64, { base64: true });
      textureFileMap[o.userData.id] = 'textures/' + safe;
      const od = objectsData.find(d => d.id === o.userData.id);
      if (od) od.textureFile = 'textures/' + safe;
    }

    // ── 5) Build timeline.json
    const manifest = {
      format:      'apex-timeline-export',
      version:     1,
      exportName,
      exportDate:  new Date().toISOString(),
      mode:        'FullScene',
      includeTriggerData,
      duration:    _duration(),
      objects:     objectsData,
      timeline:    { tracks: timelineTracks },
      assets: {
        models:   Object.entries(modelFileMap).map(([name, file]) => ({ name, file })),
        sounds:   Object.entries(soundFileMap).map(([name, file]) => ({ name, file })),
        textures: Object.entries(textureFileMap).map(([objId, file]) => ({ objId: +objId, file })),
      },
    };
    zip.file('timeline.json', JSON.stringify(manifest, null, 2));

    // ── 6) Download
    try {
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportName + '.zip';
      a.click();
      URL.revokeObjectURL(url);
      log(`💾 Eksport tayyor: <b>${exportName}.zip</b> — ` +
          `${includedObjects.length} obyekt, ${timelineTracks.length} track, ` +
          `${Object.keys(modelFileMap).length} model, ` +
          `${Object.keys(soundFileMap).length} ovoz, ` +
          `${Object.keys(textureFileMap).length} texture`, 'lok');
      return true;
    } catch (e) {
      log('❌ ZIP xatosi: ' + e.message, 'le');
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────
  // EXPORT MODE 2 — Object-Only Export
  //
  // Emits a single JSON with just this object's keyframes.
  // Independent of the rest of the scene. Ideal for reusable
  // primitives like a door open/close animation.
  // ────────────────────────────────────────────────────────────
  function exportObjectOnly(opts) {
    opts = opts || {};
    const objectId          = opts.objectId;
    const includeModelRef   = opts.includeModelRef !== false;   // default true
    const exportName        = opts.exportName;

    if (objectId == null) {
      log("⚠ Obyekt tanlanmagan", 'lw');
      return false;
    }
    if (typeof objects === 'undefined') return false;
    const obj = objects.find(o => String(o.userData && o.userData.id) === String(objectId));
    if (!obj) {
      log("⚠ Obyekt topilmadi (id=" + objectId + ")", 'lw');
      return false;
    }

    // Find associated timeline track (may not exist — that's OK per spec)
    const track = _tracks().find(t => String(t.objId) === String(objectId)) || null;
    const keyframes = track ? (track.keyframes || []) : [];

    const data = {
      format:     'apex-object-keys',
      version:    1,
      exportDate: new Date().toISOString(),
      object: {
        id:       obj.userData.id,
        name:     obj.userData.name,
        type:     obj.userData.type || 'Mesh',
        // Current transform state (exported even if no keyframes exist)
        currentState: {
          position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
          scale:    { x: obj.scale.x,    y: obj.scale.y,    z: obj.scale.z    },
        },
      },
      duration:   _duration(),
      keyframes: keyframes.map(k => ({
        time:    k.time,
        ease:    k.ease || 'smooth',
        tangent: k.tangent || 'auto',
        pos:     k.pos   ? { x: k.pos.x,   y: k.pos.y,   z: k.pos.z }   : undefined,
        rot:     k.rot   ? { x: k.rot.x,   y: k.rot.y,   z: k.rot.z }   : undefined,
        scale:   k.scale ? { x: k.scale.x, y: k.scale.y, z: k.scale.z } : undefined,
        vis:     k.vis,
      })),
    };

    // Model reference — path only, no bytes
    if (includeModelRef && (obj.userData.isGLB || obj.userData.isGLTF)) {
      const lm = _findModelForObject(obj);
      data.modelReference = {
        modelName: (lm && lm.name) || obj.userData.name,
        // Path relative to scene root. Loader can resolve.
        modelPath: 'models/' + ((lm && lm.name) || obj.userData.name).replace(/[^a-zA-Z0-9_\-]/g, '_') + '.glb',
      };
    }

    // Serialize + download
    const filename = (exportName || (obj.userData.name || 'object')).replace(/[^a-zA-Z0-9_\-]/g, '_') + '_keys.json';
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      log(`💾 Eksport: <b>${filename}</b> — ${keyframes.length} keyframe`, 'lok');
      return true;
    } catch (e) {
      log('❌ Eksport xatosi: ' + e.message, 'le');
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────
  // UI — Export panel (modal). All labels in Uzbek.
  // ────────────────────────────────────────────────────────────
  function showPanel() {
    const existing = document.getElementById('tl-export-panel');
    if (existing) { existing.remove(); return; }

    const panel = document.createElement('div');
    panel.id = 'tl-export-panel';
    panel.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:var(--panel); border:1px solid var(--border);
      border-radius:10px; padding:18px 20px; z-index:10001;
      box-shadow:0 12px 40px rgba(0,0,0,.9); width:420px;
      font-family:'Rajdhani',sans-serif;
    `;

    // Build dropdown of objects that could be exported one-by-one.
    // Prefer objects with keyframes, but per spec allow any object.
    const animIds = new Set(_tracks().map(t => String(t.objId)));
    const objOptsList = (typeof objects !== 'undefined' ? objects : [])
      .filter(o => o.userData && !o.userData.isStatic)
      .map(o => {
        const has = animIds.has(String(o.userData.id));
        return `<option value="${o.userData.id}">${has ? '◆ ' : '  '}#${o.userData.id} ${o.userData.name || ''}</option>`;
      }).join('');

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <span style="font-family:'Share Tech Mono','Courier New',monospace;font-size:12px;color:var(--accent);letter-spacing:2px">
          TIMELINE &nbsp;— OBYEKT ANIMATSIYASI
        </span>
        <button onclick="document.getElementById('tl-export-panel').remove()"
          style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;line-height:1;padding:0 4px">✕</button>
      </div>

      <!-- ⚠ "📦 TO'LIQ SAHNA (.zip)" rejimi OLIB TASHLANDI.
           Sahnani saqlash endi 🗺 Kartalar kutubxonasi ishi (💾 Saqlash),
           va Map Loader kutubxonadagi kartani TO'G'RIDAN-TO'G'RI oladi
           (📚 Kutubxonadan tanlash). Ya'ni ZIP eksporti oraliq qadam
           bo'lib qolgan edi: saqla → diskka chiqar → qayta yukla.
           Fayl kerak bo'lsa — kutubxonadagi ⬇ tugmasi shuni beradi.

           "◆ FAQAT OBYEKT (.json)" QOLDI — u boshqa maqsad uchun:
           hitbox importedAnimations slotlari va tugma importi aynan
           shu fayldan oziqlanadi (masalan eshik ochilishi animatsiyasi). -->

      <!-- Object-Only form -->
      <div id="tle-form-obj">
        <div style="margin-bottom:10px">
          <div style="font-size:10px;color:var(--muted);letter-spacing:1px;margin-bottom:4px">
            MAQSAD OBYEKT
            <span style="color:var(--accent);margin-left:6px">◆ = keyframe bor</span>
          </div>
          <select id="tle-obj-target" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 8px;font-family:'Share Tech Mono',monospace;font-size:11px;border-radius:3px;outline:none;box-sizing:border-box">
            ${objOptsList || '<option value="">— Obyekt yo\'q —</option>'}
          </select>
        </div>
        <div style="margin-bottom:10px;display:flex;align-items:center;gap:8px">
          <input type="checkbox" id="tle-obj-modelref" checked style="cursor:pointer">
          <label for="tle-obj-modelref" style="font-size:11px;color:var(--text);cursor:pointer">
            Model havolasini kiritish (agar GLB bo'lsa)
          </label>
        </div>
        <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:6px 8px;background:rgba(var(--accent2-rgb),.04);border-radius:3px;border-left:2px solid var(--accent2);margin-bottom:12px">
          Faqat tanlangan obyektning keyframe'larini eksport qiladi.<br>
          Boshqa obyektlar, sahna, model fayllari yoki texture'lar
          <b>kiritilmaydi</b> — bu qayta ishlatiluvchi animatsiya bloki
          (masalan: eshik ochilishi).
        </div>
        <button onclick="window._tleExportObj()" style="width:100%;padding:9px;background:rgba(var(--accent2-rgb),.15);border:1px solid var(--accent2);color:var(--accent2);cursor:pointer;border-radius:4px;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px">
          💾 EKSPORT QILISH (.json)
        </button>
      </div>
    `;

    document.body.appendChild(panel);
  }

  // ⚠ `_tleSwitchMode` va `_tleExportFull` OLIB TASHLANDI — panelda
  //   endi bitta rejim bor (obyekt animatsiyasi .json). To'liq sahnani
  //   ZIP qilish 🗺 Kartalar kutubxonasi ishi.
  //
  //   `exportFullScene()` funksiyasining O'ZI qoldirildi va hali ham
  //   eksport qilinadi (`TimelineExportSystem.exportFullScene`). Hozir
  //   uni loyihada HECH KIM chaqirmaydi — lekin u `timeline.json`
  //   formatini yasaydigan yagona joy, va addon'lar unga tayanishi
  //   mumkin. O'chirish alohida qaror, tugmani olib tashlash bilan
  //   bir narsa emas.

  window._tleExportObj = function() {
    const target = document.getElementById('tle-obj-target')?.value;
    const modref = !!document.getElementById('tle-obj-modelref')?.checked;
    if (!target) { log("⚠ Obyekt tanlanmagan", 'lw'); return; }
    if (exportObjectOnly({ objectId: target, includeModelRef: modref })) {
      document.getElementById('tl-export-panel')?.remove();
    }
  };

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────
  return {
    exportFullScene,
    exportObjectOnly,
    showPanel,
    playTimeline,       // { direction:'forward'|'reverse', speed, onDone }
    playSpecialTrack, isSpecialTrack, stopAllSpecialTracks,
    stopTimeline,
    playObjectKeyframes,          // { target, keyframes, direction, speed, loop, onDone }
    stopAllObjectKeyframePlaybacks,
    // internals (exposed for potential future ActionFlow integration)
    _interpolateTrackAt,
    _applyState,
  };
})();

window.TimelineExportSystem = TimelineExportSystem;

// ============================================================
// Convenience globals for buttons / menus
// ============================================================
window.showTimelineExportPanel = function() {
  TimelineExportSystem.showPanel();
};
