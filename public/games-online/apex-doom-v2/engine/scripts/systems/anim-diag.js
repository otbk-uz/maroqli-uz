// ============================================================
//  🔍 ANIM-DIAG — animatsiyaga NIMA xalaqit berayotganini topadi
//
//  Muammo shundaki, animatsiya dvigateli o'zi yaxshi ishlaydi, lekin
//  sahnada obyektni HAR KADR qayta yozadigan boshqa tizim bo'lsa
//  animatsiya "boshlanmay tugaydi" yoki umuman ko'rinmaydi. Ayblilar
//  bir nechta bo'lishi mumkin: fizika, yo'l (path), motion-fx, skript,
//  ota-obyekt, boshqa animatsiya.
//
//  Bu modul aybdorni TAXMIN qilmaydi — o'lchaydi:
//    1. `playObjectKeyframes` chaqirilganda nima uzatilganini yozadi;
//    2. har kadr animatsiya qo'ygan qiymatni eslab qoladi va KEYINGI
//       kadr boshida obyekt hali o'sha joydami — tekshiradi. Boshqa
//       joyda bo'lsa, kimdir orada yozgan degani.
//
//  ISHLATISH (brauzer konsolida):
//      apexAnimDiag()        — yoqish, so'ng o'yinda animatsiyani sinang
//      apexAnimDiag.report() — hisobot
//      apexAnimDiag.off()    — o'chirish
// ============================================================

(function () {
  'use strict';

  let ON = false;
  const runs = [];          // har bir ijro haqida yozuv
  let rafId = null;

  function _fmt(v) { return (v === undefined || v === null) ? '—' : (+v).toFixed(3); }
  function _p(o) { return `(${_fmt(o.position.x)}, ${_fmt(o.position.y)}, ${_fmt(o.position.z)})`; }

  /** Obyektni kim haydayotgani haqidagi BELGILAR (taxmin emas — fakt). */
  function _drivers(obj) {
    const d = [];
    const ud = obj.userData || {};

    // Fizika — Rapier tanasi bormi va u har kadr yozadimi
    if (typeof physBodies !== 'undefined' && Array.isArray(physBodies)) {
      const b = physBodies.find(x => x.mesh === obj);
      if (b) d.push(b.isStatic ? 'fizika(STATIC — yozmaydi)' : '⚠ FIZIKA(dinamik — har kadr yozadi)');
    }
    if (ud._animDriven) d.push(`animatsiya×${ud._animDriven}`);

    // Yo'l (path) — obyektni yo'l bo'ylab suradi
    if (ud.pathId || ud.followPath || ud.isPathFollower) d.push('⚠ YO\'L (path)');
    // Motion FX
    if (ud.motionFx || ud.isMotionFx) d.push('⚠ MOTION-FX');
    // Skript
    if (ud.script && String(ud.script).trim()) d.push('⚠ SKRIPT');
    // Ota-obyekt harakatlansa bola ham ko'chadi
    if (obj.parent && obj.parent !== scene) d.push(`ota-obyekt: "${obj.parent.userData?.name || obj.parent.type}"`);
    // Baked animatsiya
    if (ud._mixer) d.push('⚠ BAKED MIXER (GLTF animatsiyasi)');
    // Timeline o'zi ijro etayotgan bo'lsa
    if (typeof TimelineSystem !== 'undefined' && TimelineSystem && TimelineSystem.isPlaying)
      d.push('⚠ TIMELINE ijro etyapti');

    return d.length ? d : ['boshqa haydovchi topilmadi'];
  }

  function _install() {
    if (typeof TimelineExportSystem === 'undefined' ||
        !TimelineExportSystem.playObjectKeyframes) {
      console.error('[anim-diag] TimelineExportSystem topilmadi');
      return false;
    }
    if (TimelineExportSystem.__diagWrapped) return true;

    const orig = TimelineExportSystem.playObjectKeyframes;
    TimelineExportSystem.__diagWrapped = orig;
    TimelineExportSystem.playObjectKeyframes = function (opts) {
      const h = orig.apply(this, arguments);
      if (!ON) return h;

      const t = opts && opts.target;
      const kfs = (opts && opts.keyframes) || [];
      const times = kfs.map(k => k.time || 0);
      const rec = {
        name:    t ? (t.userData?.name || '?') : '(TARGET YO\'Q)',
        obj:     t,
        kf:      kfs.length,
        from:    times.length ? Math.min.apply(null, times) : 0,
        to:      times.length ? Math.max.apply(null, times) : 0,
        speed:   opts.speed || 1,
        blocks:  (opts.blocks || []).length,
        started: t ? _p(t) : '—',
        drivers: t ? _drivers(t) : [],
        frames:  0,
        stolen:  0,          // boshqa tizim orada yozgan kadrlar soni
        maxJump: 0,          // eng katta o'g'irlangan siljish
        handle:  h,
        ended:   false,
      };
      runs.push(rec);

      console.group(`%c🔍 ANIMATSIYA BOSHLANDI → "${rec.name}"`, 'color:#4ade80;font-weight:700');
      console.log(`keyframe: ${rec.kf} ta,  vaqt: ${_fmt(rec.from)}s → ${_fmt(rec.to)}s ` +
                  `(davomiylik ${_fmt(rec.to - rec.from)}s),  tezlik ${rec.speed}×`);
      console.log(`boshlang'ich joy: ${rec.started}`);
      if (rec.blocks) console.warn(`⚠ ${rec.blocks} ta BLOKLASH nuqtasi bor — ` +
        `animatsiya o'sha yerda TO'XTAB tugma kutadi. Shu sabab "oxirigacha bormasligi" mumkin.`);
      if (!t) console.error('❌ MAQSAD OBYEKT YO\'Q — animatsiya hech nimaga qo\'llanmaydi');
      if (rec.to - rec.from <= 0.001)
        console.error('❌ Davomiylik NOL — barcha keyframe bir vaqtda. Timeline\'da kalitlarni turli vaqtga qo\'ying.');
      console.log('boshqa haydovchilar:', rec.drivers.join(', '));
      console.groupEnd();
      return h;
    };
    return true;
  }

  /** Har kadr: animatsiya qo'ygan joy saqlanib qoldimi? */
  function _watch() {
    if (!ON) return;
    for (const r of runs) {
      if (r.ended || !r.obj) continue;
      if (r.handle && r.handle.active === false) {
        r.ended = true;
        r.finished = _p(r.obj);
        continue;
      }
      if (r._last) {
        const dx = r.obj.position.x - r._last.x;
        const dy = r.obj.position.y - r._last.y;
        const dz = r.obj.position.z - r._last.z;
        const jump = Math.sqrt(dx*dx + dy*dy + dz*dz);
        // Animatsiya o'zi qo'ygan joydan JUDA farq qilsa — kimdir yozgan.
        // (Animatsiya keyingi kadrda o'zi ham suradi, shuning uchun
        //  faqat KATTA sakrashni "o'g'irlik" deb hisoblaymiz.)
        if (jump > 0.5) { r.stolen++; r.maxJump = Math.max(r.maxJump, jump); }
      }
      r._last = r.obj.position.clone();
      r.frames++;
    }
    rafId = requestAnimationFrame(_watch);
  }

  function report() {
    if (!runs.length) {
      console.warn('[anim-diag] Hali biror animatsiya ishga tushmadi. ' +
                   'O\'yinni boshlab tugmani/hitboxni ishlatib ko\'ring.');
      return;
    }
    console.group('%c🔍 ANIM-DIAG HISOBOTI', 'color:#60a5fa;font-weight:700;font-size:13px');
    runs.forEach((r, i) => {
      console.group(`${i + 1}. "${r.name}"  —  ${r.ended ? 'tugadi' : 'ketyapti'}`);
      console.log(`keyframe: ${r.kf},  vaqt ${_fmt(r.from)}s → ${_fmt(r.to)}s,  kadrlar: ${r.frames}`);
      console.log(`boshlandi: ${r.started}`);
      console.log(`hozir/oxiri: ${r.finished || (r.obj ? _p(r.obj) : '—')}`);
      console.log(`haydovchilar: ${r.drivers.join(', ')}`);
      if (r.stolen) {
        console.error(`❌ ${r.stolen} ta kadrda obyekt BOSHQA tizim tomonidan ko'chirildi ` +
                      `(eng katta sakrash ${_fmt(r.maxJump)}). Yuqoridagi "⚠" belgili ` +
                      `haydovchini o'chirib ko'ring.`);
      } else if (r.ended) {
        console.log('%c✅ Aralashuv aniqlanmadi — animatsiya to\'siqsiz yurdi.', 'color:#4ade80');
      }
      if (r.blocks) console.warn(`⚠ ${r.blocks} ta bloklash nuqtasi bor.`);
      console.groupEnd();
    });
    console.groupEnd();
    console.log('%cNusxa olib yuboring ↑', 'color:#888');
  }

  function on() {
    if (!_install()) return;
    ON = true;
    runs.length = 0;
    if (!rafId) rafId = requestAnimationFrame(_watch);
    console.log('%c🔍 anim-diag YOQILDI', 'color:#4ade80;font-weight:700');
    console.log('Endi o\'yinni boshlab animatsiyani ishlatib ko\'ring, so\'ng: apexAnimDiag.report()');
  }
  function off() {
    ON = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    console.log('🔍 anim-diag o\'chirildi');
  }

  window.apexAnimDiag = on;
  window.apexAnimDiag.report = report;
  window.apexAnimDiag.off = off;
  window.apexAnimDiag.runs = runs;
})();

// ── 🚀 Ishga tushish xabari ──────────────────────────────────
//  ⚠ Ilgari bu log `constraints.js` ning oxirgi qatorida turardi.
//    O'sha fayl (🔩 Joints) olib tashlanganda xabar ham yo'qolib
//    ketardi — muharrir jimgina ochilardi. Endi eng OXIRGI yuklanadigan
//    skript (shu fayl) uni beradi, ya'ni "hammasi yuklandi" ma'nosi
//    saqlanib qoldi.
log('🚀 Barcha sistemalar yuklandi: Scene | PBR/HDR | Assets | Editor | Physics', 'lok');
