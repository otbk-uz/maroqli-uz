// ============================================================
// APEX3D — Timeline System  v2.2  (tlUpdate + object ref fix)
// Tuzatilgan:
//   1. Track'da objRef — to'g'ridan object referensini saqlash
//   2. getOrCreateTrack — id undefined bo'lsa ham ishlaydi
//   3. interpolateTrack — objRef ustunlik qiladi, id fallback
//   4. captureState — position/rotation clone qilinadi (reference bug yo'q)
//   5. applyState — matrixWorldNeedsUpdate majburiy yangilanadi
//   6. window.tlUpdate — main-loop.js chaqiruvi uchun export qilindi
// ============================================================

const TimelineSystem = (() => {
  'use strict';

  // ── STATE ──────────────────────────────────────────────────
  let tracks      = [];
  let duration    = 5;
  let currentTime = 0;
  let isPlaying   = false;
  let rafId       = null;
  let lastTS      = null;
  let selectedKf  = null;
  let globalEase  = 'smooth';
  let cutMode     = false;
  let loopMode    = false;
  let tlZoom      = 1;    // 1 = butun timeline; >1 = kattalashtirilgan (yaqinlashtirilgan)
  let tlPan       = 0;    // ko'rinadigan oynaning boshi (soniya)
  let filterTrackActive = false;   // true bo'lsa "I" filtr keyframe qo'yadi
  let weatherTrackActive = false;  // true bo'lsa "I" ob-havo (atmosfera) keyframe qo'yadi
  let kinoTrackActive    = false;  // true bo'lsa "I" 🎬 kino kamera keyframe qo'yadi
  const FILTER_ID = '__filter__';
  const ZOOM_ID = '__zoom__', WEATHER_ID = '__weather__', SKYBOX_ID = '__skybox__';
  const KINO_ID = '__kinocam__';
  let cutStart = null, cutEnd = null;   // kesish diapazoni (soniya)
  let _lastPlayT = 0;                    // sound/weather keylarni "cross"da o'qish uchun
  let _sndEdit = null;                   // ovoz popup tahrirlayotgan {track, ki} yoki null

  // ── DOM HELPER ─────────────────────────────────────────────
  const $   = (id) => document.getElementById(id);
  const $el = (tag, cls, style) => {
    const e = document.createElement(tag);
    if (cls)   e.className = cls;
    if (style) Object.assign(e.style, style);
    return e;
  };

  // ── CONSOLE LOG ────────────────────────────────────────────
  function clog(msg, type = '') {
    const body = $('console-body');
    if (!body) { console.log('[TL]', msg); return; }
    const row = $el('div', type==='w'?'lw':type==='e'?'le':type==='ok'?'lok':'lg');
    const ts  = $el('span', 'lt');
    ts.textContent = new Date().toLocaleTimeString('uz');
    row.appendChild(ts);
    row.appendChild(document.createTextNode(msg));
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  // ── EASING ─────────────────────────────────────────────────
  const easings = {
    linear:  t => t,
    smooth:  t => t < .5 ? 2*t*t : -1+(4-2*t)*t,
    bounce:  t => {
      if (t < 1/2.75)  return 7.5625*t*t;
      if (t < 2/2.75)  { t-=1.5/2.75;   return 7.5625*t*t+.75; }
      if (t < 2.5/2.75){ t-=2.25/2.75;  return 7.5625*t*t+.9375; }
      t-=2.625/2.75;   return 7.5625*t*t+.984375;
    },
    elastic: t => t===0||t===1 ? t : Math.pow(2,-10*t)*Math.sin((t*10-.75)*2*Math.PI/3)+1,
    back:    t => { const c=1.70158+1; return 1+c*Math.pow(t-1,3)+(c-1)*Math.pow(t-1,2); }
  };

  const lerpV3 = (a,b,t) => ({
    x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t, z: a.z+(b.z-a.z)*t
  });

  // ── TANLANGAN OBYEKTNI TOPISH ──────────────────────────────
  function getSelectedObj() {
    const directCandidates = [
      // 💡 Tanlangan yorug'lik — BIRINCHI. `selectedLight` bu `{id,type,light,…}`
      //    yozuvi, Object3D emas; Timeline'ga uning `.light` i kerak.
      //    Yorug'lik tanlanganда `selectObject()` chaqirilmaydi, ya'ni
      //    quyidagi `window.selectedObj` eski qiymatда qolishi mumkin —
      //    shuning uchun yorug'lik ustunlik qiladi. Teskarisi xavfsiz:
      //    `selectObject()` `selectedLight` ni nolga tushiradi.
      //  ⚠ `window.selectedLight` EMAS! U `lights.js` da top-level `let`
      //    bilan e'lon qilingan → `window` ga yozilmaydi → hamisha
      //    `undefined` bo'lardi va bu yo'l jimgina ishlamasdi.
      (typeof selectedLight !== 'undefined' && selectedLight ? selectedLight.light : null),
      window.sel,
      window.selectedObject,
      window.selectedObj,
      window.selObj,
      window._sel,
      window.curObj,
      window.activeObj,
      window.currentObject,
      window.pickedObject,
      window.APEX && window.APEX.sel,
      window.APEX && window.APEX.selected,
      window.Editor && window.Editor.sel,
      window.Editor && window.Editor.selected,
      window.EditorState && window.EditorState.selected,
      window.EditorCore && window.EditorCore.selected,
      window.HierarchyManager && window.HierarchyManager.selected,
      window.inspector && window.inspector.target,
    ];

    for (const c of directCandidates) {
      if (c && (c.isObject3D || (c.position && c.rotation))) return c;
    }

    const hierSel = document.querySelector('.h-item.sel, .h-item.selected');
    if (hierSel) {
      const id =
        hierSel.dataset?.id   ||
        hierSel.dataset?.uuid ||
        hierSel.dataset?.objId ||
        hierSel.getAttribute('data-id') ||
        hierSel.getAttribute('data-uuid') ||
        hierSel.getAttribute('data-obj-id');

      if (id) {
        const found = getObjById(id);
        if (found) return found;
      }

      const nameEl = hierSel.querySelector('.h-name');
      const name   = nameEl ? nameEl.textContent.trim() : null;
      if (name && window.scene) {
        let found = null;
        window.scene.traverse(o => {
          if (!found && (o.name === name || o.userData?.name === name)) found = o;
        });
        if (found) return found;
      }
    }

    if (!getSelectedObj._debugged) {
      getSelectedObj._debugged = true;
      const foundVars = [];
      for (const k in window) {
        try {
          const v = window[k];
          if (v && (v.isObject3D || (v.position?.isVector3 && v.rotation?.isEuler))) {
            foundVars.push(k);
          }
        } catch(e) {}
      }
      if (foundVars.length > 0) {
        clog(`⚠ Keyframe: tanlangan ob'ekt topilmadi. Bu nomlardagi ob'ektlar mavjud: ${foundVars.slice(0,5).join(', ')}`, 'w');
      } else {
        clog('⚠ Keyframe: hierarchy\'dan ob\'ekt tanlang!', 'w');
      }
    }

    return null;
  }

  function getObjById(id) {
    if (!id) return null;
    // 💡 Yorug'liklar scene.traverse da topiladi, lekin `lights` massivi
    //    tezroq va ishonchli (helper bilan chalkashmaydi).
    if (typeof id === 'string' && id[0] === 'L' && typeof lights !== 'undefined') {
      const le = lights.find(l => l.light && l.light.userData && l.light.userData.id === id);
      if (le) return le.light;
    }
    if (window.sceneObjects) {
      const found = window.sceneObjects.find(o =>
        (o.userData?.id || o.userData?.uuid || o.uuid) === id
      );
      if (found) return found;
    }
    if (window.scene) {
      let found = null;
      window.scene.traverse(o => {
        if (!found && (o.userData?.id===id || o.userData?.uuid===id || o.uuid===id)) found=o;
      });
      return found;
    }
    return null;
  }

  // 💡 Ikki HEX rang orasida silliq o'tish (RGB bo'yicha)
  const _lhA = new THREE.Color(), _lhB = new THREE.Color();
  function _lerpHex(a, b, t) {
    _lhA.set(a); _lhB.set(b);
    return '#' + _lhA.lerp(_lhB, Math.max(0, Math.min(1, t))).getHexString();
  }

  /**
   * 🚫 ZAMIN — animatsiya berib bo'lmaydi.
   *
   * ⚠ Zamin — sahnaning tayanchi: butun fizika, o'yinchi yurishi va
   *   barcha kolliderlar unga bog'langan. Unga keyframe berilsa
   *   zamin siljiydi va o'yinchi u bilan birga "tushib ketadi" —
   *   tashqaridan bu "animatsiya zaminga o'tib ketdi" bo'lib ko'rinadi.
   *
   *   `inspector.js` da o'yinchi uchun xuddi shu qorovul bor
   *   ("⛔ Zamin oyinchi bo'la olmaydi") — bu uning timeline juftligi.
   */
  function _isGround(obj) {
    const ud = obj && obj.userData;
    if (!ud) return false;
    return ud.type === 'Tekislik' || ud.name === 'Zamin' || ud.isGround === true;
  }

  // ── Track'da objRef saqlash ─────────────────────────────────
  function getOrCreateTrack(obj) {
    if (_isGround(obj)) {
      log('⛔ Zaminga animatsiya berib bo\'lmaydi — u sahnaning tayanchi ' +
          '(fizika, o\'yinchi, kolliderlar unga bog\'langan)', 'lw');
      return null;
    }
    const id = obj.userData?.id || obj.userData?.uuid || obj.uuid || ('obj_' + Math.random().toString(36).slice(2));

    if (!obj.userData) obj.userData = {};
    if (!obj.userData.id && !obj.userData.uuid) {
      obj.userData._tlId = obj.userData._tlId || obj.uuid;
    }

    const name = obj.userData?.name || obj.name || 'Obyekt';

    let track = tracks.find(t => t.objId === id || t.objRef === obj);
    if (!track) {
      track = {
        objId:     id,
        objName:   name,
        objRef:    obj,
        keyframes: []
      };
      tracks.push(track);
    } else {
      track.objRef = obj;
    }
    return track;
  }

  // ── captureState — clone qilish ────────────────────────────
  function captureState(obj) {
    const st = {
      pos:   { x: obj.position.x, y: obj.position.y, z: obj.position.z },
      rot:   { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
      scale: { x: obj.scale.x,    y: obj.scale.y,    z: obj.scale.z    }
    };
    // 📝 Matn bloki bo'lsa — MATN ham keyframe ga yoziladi.
    // Shu tufayli "Salom" qo'yib, boshqa keyda "O'yinchi" desangiz —
    // o'sha keyga kelganda matn almashadi.
    if (obj.userData && obj.userData.isTextBlock) {
      st.txt = String(obj.userData.text ?? '');
    }
    // 🎞 GIF / ketma-ketlik — QAYSI klip o'ynayotgani
    if (window.GifTextureSystem) {
      const gf = GifTextureSystem.captureTL(obj);
      if (gf) Object.assign(st, gf);
    }
    // ✨ OBYEKT YORQINLIGI — kuch, masofa va porlash keyframe ga
    //    tushadi. Rang va soya esa TUSHMAYDI: ular "qaror" sozlamasi,
    //    har keyda qayta tanlash kerak bo'lardi.
    if (window.ObjectGlowSystem) {
      const g = ObjectGlowSystem.captureTL(obj);
      if (g) Object.assign(st, g);
    }
    // 🔊 SOUND BLOCK — blokning UMUMIY balandlik shkalasi (0…1).
    //    "3-soniyada 50%, 8-soniyada 100%" — orada ovoz silliq ko'tariladi.
    //    ⚠ Faqat SHKALA tushadi. Ovoz fayli, klavish, rejim va 🎧 masofa
    //      sozlamalari — "qaror" sozlamalari, ular har keyda qayta
    //      tanlanmasligi kerak (✨ yorqinlikdagi bilan bir xil qoida).
    if (window.SoundBlockSystem && SoundBlockSystem.captureTL) {
      const sv = SoundBlockSystem.captureTL(obj);
      if (sv) Object.assign(st, sv);
    }
    // 💥 SINISH holati — 0 (butun) / 1 (siniq). Faqat parchalari
    //    TAYYORLANGAN obyektda yoziladi, aks holda har keyframe
    //    keraksiz maydon ko'tarib yurardi.
    if (window.BreakTimeline) {
      const bk = BreakTimeline.capture(obj);
      if (bk !== undefined) st.brk = bk;
    }
    // 💡 YORUG'LIK — quvvat, rang, masofa, burchak va YONIQ/O'CHIQ
    //    holati keyframe ga yoziladi. Shu tufayli bitta keyda chiroqni
    //    o'chirasiz, ikkinchisida rangini o'zgartirasiz.
    if (obj.isLight) {
      st.li = obj.intensity;
      st.lc = '#' + obj.color.getHexString();
      st.lon = obj.visible;
      if (typeof obj.distance === 'number') st.ld = obj.distance;   // Point/Spot
      if (typeof obj.angle    === 'number') st.la = obj.angle;      // Spot
      if (typeof obj.penumbra === 'number') st.lp = obj.penumbra;   // Spot
      // 🔦 Spot/Directional NISHONI — chiroqqa NISBATAN (offset).
      //    Absolyut pozitsiya saqlansa, chiroqni A→B ga ko'chirganда
      //    nishon joyida qolib, nur yo'nalishi o'zi burilib ketardi.
      //    Offset saqlansa — fonar ko'chganда nuri o'zi bilan ketadi,
      //    yo'nalishni ataylab o'zgartirsangiz esa u ham yoziladi.
      if (obj.target && obj.target.isObject3D) {
        st.lt = { x: obj.target.position.x - obj.position.x,
                  y: obj.target.position.y - obj.position.y,
                  z: obj.target.position.z - obj.position.z };
      }
    }
    // Kamera obyekti bo'lsa — FOV (zoom) ham yoziladi
    if (obj.userData && obj.userData.isCamera) {
      st.fov = (typeof obj.userData.fov === 'number') ? obj.userData.fov
             : (typeof camera !== 'undefined' && camera ? camera.fov : 60);
    }
    // 💻 PC BLOCK — YONIQ/O'CHIQ va ekran rejimi (html/image/camera/off) keyframe ga yoziladi.
    //    Shu tufayli bir keyda O'CHIQ, keyingisida YONIQ qo'yib animatsiya qilinadi.
    //    Xuddi shunday: bir keyda HTML, keyingisida Rasm/Kamera — ekran almashadi.
    if (obj.userData && obj.userData.isPCBlock) {
      st.pcOn   = !!obj.userData.powered;
      st.pcMode = obj.userData.screenMode || 'html';
      // 💻 EKRANDAGI HTML KOD ham keyframe ga tushadi. Shu tufayli
      //    bir keyda eski sahifa, keyingisida yangisi bo'ladi.
      //    ⚠ Kod MATN — uni "yarim" qilib bo'lmaydi, shuning uchun
      //      pastda `lerp` da qadamli almashadi (rang kabi silliq emas).
      st.pcHtml = String(obj.userData.html ?? '');
    }
    return st;
  }

  // ── applyState — matrixWorldNeedsUpdate ─────────────────────
  function applyState(obj, kf) {
    if (!obj || !kf) return;
    // 🦴 SUYAK animatsiyasi: baked mixer clip suyakni har kadr qayta yozmasin —
    //   birinchi marta shu modelning mixerini to'xtatamiz (timeline endi boshqaradi).
    if (obj.isBone) {
      let m = obj;
      while (m && !(m.userData && m.userData._mixer)) m = m.parent;
      if (m && m.userData._mixer && !m.userData._tlStoppedMixer) {
        try { m.userData._mixer.stopAllAction(); } catch (e) {}
        m.userData._tlStoppedMixer = true;
      }
    }
    if (kf.pos)   obj.position.set(kf.pos.x,   kf.pos.y,   kf.pos.z);
    if (kf.rot)   obj.rotation.set(kf.rot.x,   kf.rot.y,   kf.rot.z);
    if (kf.scale) obj.scale.set(kf.scale.x,    kf.scale.y, kf.scale.z);
    if (kf.vis !== undefined) obj.visible = !!kf.vis;
    // 💥 SINISH — `visible` DAN KEYIN: `BreakTimeline.set` obyekt va
    //    parchalar ko'rinishini o'zi boshqaradi, ustidan yozilmasin.
    if (kf.brk !== undefined && window.BreakTimeline) BreakTimeline.set(obj, !!kf.brk);
    // 💡 YORUG'LIK
    if (obj.isLight) {
      if (typeof kf.li === 'number') obj.intensity = kf.li;
      if (kf.lc) obj.color.set(kf.lc);
      if (kf.lon !== undefined) obj.visible = !!kf.lon;
      if (typeof kf.ld === 'number' && typeof obj.distance === 'number') obj.distance = kf.ld;
      if (typeof kf.la === 'number' && typeof obj.angle    === 'number') obj.angle    = kf.la;
      if (typeof kf.lp === 'number' && typeof obj.penumbra === 'number') obj.penumbra = kf.lp;
      // 🔦 Nishon — chiroq pozitsiyasi + offset
      if (kf.lt && obj.target && obj.target.isObject3D) {
        obj.target.position.set(obj.position.x + kf.lt.x,
                                obj.position.y + kf.lt.y,
                                obj.position.z + kf.lt.z);
        obj.target.updateMatrixWorld();
      }
      // ☀️ Yorug'lik o'zgardi — soya qayta hisoblansin
      if (typeof requestShadowUpdate === 'function') requestShadowUpdate();
    }
    // 🎞 GIF / ketma-ketlik
    if (kf.gifClip !== undefined && window.GifTextureSystem) {
      GifTextureSystem.applyTL(obj, kf);
    }
    // ✨ OBYEKT YORQINLIGI
    if (kf.gPow !== undefined || kf.gOn !== undefined) {
      if (window.ObjectGlowSystem) ObjectGlowSystem.applyTL(obj, kf);
    }
    // 🔊 SOUND BLOCK — umumiy balandlik shkalasi
    if (kf.sbVol !== undefined && window.SoundBlockSystem && SoundBlockSystem.applyTL) {
      SoundBlockSystem.applyTL(obj, kf);
    }
    // 📝 Matn bloki — matn + o'zgarish shaffofligi
    if (kf.txt !== undefined && obj.userData && obj.userData.isTextBlock) {
      if (obj.userData.text !== kf.txt) {
        obj.userData.text = kf.txt;
        if (window.TextBlockSystem) TextBlockSystem.redraw(obj);
      }
      if (obj.material && kf.txtOp !== undefined) obj.material.opacity = kf.txtOp;
    }
    // Kamera FOV (zoom) — obyektga yozamiz; faol kamera bo'lsa darrov ko'rinsin
    if (typeof kf.fov === 'number' && obj.userData) {
      obj.userData.fov = kf.fov;
      if (obj.userData.isCamera && obj.userData._isActive &&
          typeof camera !== 'undefined' && camera) {
        camera.fov = kf.fov; camera.updateProjectionMatrix();
      }
    }
    // 💻 PC BLOCK — ekran rejimi + YONIQ/O'CHIQ. Faqat HAQIQATAN o'zgarganda
    //    qo'llaymiz (har kadr emas), aks holda log/CSS3D behuda qayta ishlardi.
    if (obj.userData && obj.userData.isPCBlock) {
      const PB = window.PCBlockSystem;
      if (kf.pcMode !== undefined && obj.userData.screenMode !== kf.pcMode) {
        obj.userData.screenMode = kf.pcMode;
        if (PB && PB._paintScreen) PB._paintScreen(obj);   // yangi rejimni ko'rsat
      }
      // 💻 HTML kod — faqat HAQIQATAN o'zgarganda. `setHtml` iframe ni
      //    qayta quradi, har kadr chaqirilsa sahifa uzluksiz yangilanib
      //    ko'z oldida miltillardi.
      if (kf.pcHtml !== undefined && String(obj.userData.html ?? '') !== kf.pcHtml) {
        if (PB && PB.setHtml) PB.setHtml(obj, kf.pcHtml);
        else obj.userData.html = kf.pcHtml;
      }
      if (kf.pcOn !== undefined && (!!obj.userData.powered) !== (!!kf.pcOn)) {
        if (PB && PB.setPower) PB.setPower(obj, !!kf.pcOn); // ekran + CSS3D + fokusni boshqaradi
        else obj.userData.powered = !!kf.pcOn;
      }
    }
    obj.updateMatrix();
    obj.matrixWorldNeedsUpdate = true;

    // 💡 Helper — matritsa YANGILANGANDAN KEYIN.
    //    ⚠ Ilgari bu yuqorida, `updateMatrix()` dan OLDIN turardi:
    //    helper `light.matrixWorld` ni o'qiydi, u esa hali eski edi →
    //    ko'rsatkich chiroqdan bir kadr orqada sudralib yurardi.
    if (obj.isLight) {
      const _le = obj.userData && obj.userData._lentry;
      if (_le && _le.helper) {
        obj.updateMatrixWorld(true);
        if (_le.helper.material && _le.helper.material.color) _le.helper.material.color.copy(obj.color);
        if (typeof _le.helper.update === 'function') { try { _le.helper.update(); } catch(e) {} }
        _le.helper.visible = obj.visible;
      }
    }
  }

  // ── interpolateTrack — objRef ustunlik qiladi ───────────────
// == PC BLOK va CANVAS - qo'llash ============================
//  ⚠ Kalitlar `PCBlockSystem.fxCss` bilgan kalitlar bilan AYNAN
//    bir xil. Ikki ro'yxat bo'lsa biri yangilanib, ikkinchisi
//    eskirib qolardi.
const _FX_KEYS = ['grayscale', 'sepia', 'invert', 'contrast',
                  'brightness', 'saturation', 'blur', 'hue'];

// ============================================================
//  🔎 NEGA ISHLAMADI — sababni AYTADIGAN yordamchi
// ------------------------------------------------------------
//  ⚠ Ilgari bu yo'llar JIM qaytardi: obyekt topilmasa, xato
//    chiqsa — hech qanday xabar yo'q. Natijada \"ishlamayapti\"
//    dan boshqa ma'lumot bo'lmasdi va sababni topish uchun
//    taxmin qilishga to'g'ri kelardi.
//
//  ⚠ HAR TREK UCHUN BIR MARTA: bu funksiya har kadr chaqiriladi
//    va har safar yozsak konsol bir soniyada to'lib ketardi.
const _tlWhyShown = {};
function _tlWhy(track, msg) {
  const key = (track && track.objId) || 'yoq';
  if (_tlWhyShown[key]) return;
  _tlWhyShown[key] = 1;
  try { log(`⚠ ⏱ "${(track && track.objName) || key}" ishlamadi — ${msg}`, 'lw'); } catch (e) {}
}
/** ▶/⏹ o'tishida qaytadan aytilsin. */
window._tlWhyReset = function () { for (const k in _tlWhyShown) delete _tlWhyShown[k]; };

function applyPCCanvasKF(track, kf) {
  try {
    // 💻 PC BLOK
    const pc = (typeof objects !== 'undefined' ? objects : [])
      .find(o => o && o.userData && o.userData.isPCBlock && o.userData.id === track.pcId);
    if (!pc) return _tlWhy(track, 'PC blok #' + track.pcId + ' topilmadi ' +
      '(mavjudlari: ' + (typeof objects !== 'undefined' ? objects : [])
        .filter(o => o && o.userData && o.userData.isPCBlock)
        .map(o => o.userData.id).join(',') + ')');
    const ud = pc.userData;
    if (track.isPCCam) {
      // ⚠ FAQAT O'ZGARGANDA: `_paintScreen` render target qayta
      //   yasaydi va har kadr chaqirilsa feed uzilib turardi.
      if (kf.camSource !== undefined && ud.camSource !== kf.camSource) {
        ud.camSource = kf.camSource;
        ud.screenMode = 'camera';
        if (window.PCBlockSystem) PCBlockSystem._paintScreen(pc);
      }
      return;
    }
    if (track.isPCFx) {
      if (!ud.screenFx) ud.screenFx = {};
      for (const k of _FX_KEYS) if (isFinite(kf[k])) ud.screenFx[k] = kf[k];
      // ⚠ Tayyor tanlov endi "o'zim sozladim" - inspektorda tugma
      //   yonib turmasin.
      ud._fxPreset = null;
      if (window.PCBlockSystem) PCBlockSystem._paintScreen(pc);
    }
  } catch (e) {
    //  ⚠ Xato BUTUN timeline'ni yiqitmaydi, lekin JIM ham qolmaydi:
    //    ilgari `catch (e) {}` edi va nima bo'lganini hech kim
    //    bilmasdi — \"ishlamayapti\" degan xabar bilan qidirishga
    //    to'g'ri kelardi.
    _tlWhy(track, 'xato: ' + (e && e.message));
  }
}

  function interpolateTrack(track, t) {
    // ── FILTR TREKI (ColorGrade) — obyektga bog'liq emas ──
    if (track && track.isFilter) {
      const kfs = track.keyframes;
      if (!kfs || !kfs.length || typeof ColorGrade === 'undefined') return;
      const start = kfs[0].time, end = kfs[kfs.length-1].time;
      let localT = t;
      if (track.loop && (end-start) > 0 && t > start) localT = start + ((t-start) % (end-start));
      if (localT <= start) { ColorGrade.applySettings(kfs[0].filter, true); return; }
      if (localT >= end)   { ColorGrade.applySettings(kfs[kfs.length-1].filter, true); return; }
      for (let i = 0; i < kfs.length-1; i++) {
        const a = kfs[i], b = kfs[i+1];
        if (localT >= a.time && localT <= b.time) {
          const raw = (localT - a.time) / (b.time - a.time);
          const al  = (easings[b.ease||globalEase]||easings.smooth)(Math.max(0,Math.min(1,raw)));
          const out = {};
          for (const k in a.filter) {
            const av = a.filter[k], bv = b.filter[k];
            out[k] = (typeof av==='number' && typeof bv==='number') ? av+(bv-av)*al : (al<0.5?av:bv);
          }
          ColorGrade.applySettings(out, true);
          return;
        }
      }
      return;
    }

    // ── 🎬 KINO KAMERA TREKI ───────────────────────────────────
    //  Filtr treki bilan bir xil naqsh. Sonlar (toyinchoqlik, to'xtash
    //  vaqti, blur) SILLIQ o'zgaradi; `enabled` va `blur` esa
    //  bayroqlar — ularni "yarim" qilib bo'lmaydi, shuning uchun
    //  qadamli almashadi (yarmida keyingi qiymatga o'tadi).
    //
    //  ⚠ Aynan shu sabab "o'chirib key qo'yib, boshqa yerda yoqib key
    //    qo'yish" ishlaydi: `enabled` interpolatsiya QILINMAYDI.
    if (track && track.isKino) {
      const K = window.KinoCamSystem;
      if (!K) return;
      const kfs = track.keyframes.filter(k => k.kino).sort((a, b) => a.time - b.time);
      if (!kfs.length) return;
      const start = kfs[0].time, end = kfs[kfs.length - 1].time;
      let localT = t;
      if (track.loop && (end - start) > 0 && t > start) localT = start + ((t - start) % (end - start));
      if (localT <= start) { K.applyState(kfs[0].kino); return; }
      if (localT >= end)   { K.applyState(kfs[kfs.length - 1].kino); return; }
      for (let i = 0; i < kfs.length - 1; i++) {
        const a = kfs[i], b = kfs[i + 1];
        if (localT >= a.time && localT <= b.time) {
          const raw = (localT - a.time) / (b.time - a.time);
          const al  = b.cut ? (raw >= 1 ? 1 : 0)
                    : (easings[b.ease || globalEase] || easings.smooth)(Math.max(0, Math.min(1, raw)));
          const out = {};
          for (const k in a.kino) {
            const av = a.kino[k], bv = b.kino[k];
            out[k] = (typeof av === 'number' && typeof bv === 'number')
              ? av + (bv - av) * al
              : (al < 0.5 ? av : bv);
          }
          K.applyState(out);
          return;
        }
      }
      return;
    }

    // ── WEATHER TREKI — atmosfera (yomg'ir zarrachalari + tuman) SILLIQ interpolatsiya ──
    if (track && track.isBlockPick) return;   // faqat tanlash uchun — animatsiya emas
    // ── 🌌 SKYBOX TREKI ────────────────────────────────────────
    //  Weather treki bilan bir xil naqsh. Rang keyframelar orasida
    //  SILLIQ o'zgaradi (oq → qora bosqichma-bosqich), rejim va rasm
    //  esa qadamli almashadi — ularni "yarim" qilib bo'lmaydi.
    if (track && track.isSkybox) {
      const S = window.SkyboxSystem;
      if (!S) return;
      const kfs = track.keyframes.filter(k => k.sky).sort((a,b)=>a.time-b.time);
      if (!kfs.length) return;
      const start = kfs[0].time, end = kfs[kfs.length-1].time;
      let localT = t;
      if (track.loop && (end-start) > 0 && t > start) localT = start + ((t-start) % (end-start));
      if (localT <= start) { S.applyState(kfs[0].sky); return; }
      if (localT >= end)   { S.applyState(kfs[kfs.length-1].sky); return; }
      for (let i = 0; i < kfs.length-1; i++) {
        const a = kfs[i], b = kfs[i+1];
        if (localT >= a.time && localT <= b.time) {
          const raw = (localT - a.time) / (b.time - a.time);
          const al  = b.cut ? (raw>=1?1:0)
                    : (easings[b.ease||globalEase]||easings.smooth)(Math.max(0,Math.min(1,raw)));
          S.applyState(S.lerp(a.sky, b.sky, al));
          return;
        }
      }
      return;
    }

    if (track && track.isWeather) {
      const akfs = (track.keyframes || []).filter(k => k.atmo);
      if (!akfs.length) return;
      const start = akfs[0].time, end = akfs[akfs.length-1].time;
      let localT = t;
      if (track.loop && (end-start) > 0 && t > start) localT = start + ((t-start) % (end-start));
      if (localT <= start) { _applyAtmo(akfs[0].atmo); return; }
      if (localT >= end)   { _applyAtmo(akfs[akfs.length-1].atmo); return; }
      for (let i = 0; i < akfs.length-1; i++) {
        const a = akfs[i], b = akfs[i+1];
        if (localT >= a.time && localT <= b.time) {
          const raw = (localT - a.time) / (b.time - a.time);
          const al  = b.cut ? (raw>=1?1:0) : (easings[b.ease||globalEase]||easings.smooth)(Math.max(0,Math.min(1,raw)));
          _applyAtmo(_lerpAtmo(a.atmo, b.atmo, al));
          return;
        }
      }
      return;
    }

    // == PC BLOK va CANVAS TREKLARI ==============================
    //  Uch tizim BOG'LANADI:
    //    isPCCam  - PC ekranidagi KAMERA manbai (kamera-1 -> kamera-2)
    //    isPCFx   - PC EKRANINING filtri (global filtrdan mustaqil)
    //
    //  ⚠ HAR OBYEKTGA ALOHIDA trek: bitta umumiy trekka solsak har key
    //    bir vaqtda hamma PC ga tegardi - birini o'zgartirib ikkinchisini
    //    joyida qoldirish mumkin bo'lmasdi.
    if (track && (track.isPCCam || track.isPCFx)) {
      const kfs = track.keyframes;
      if (!kfs || !kfs.length) return;
      const start = kfs[0].time, end = kfs[kfs.length - 1].time;
      let localT = t;
      if (track.loop && (end - start) > 0 && t > start) localT = start + ((t - start) % (end - start));

      let out;
      if (localT <= start)    out = kfs[0];
      else if (localT >= end) out = kfs[kfs.length - 1];
      else {
        for (let i = 0; i < kfs.length - 1; i++) {
          const a = kfs[i], b = kfs[i + 1];
          if (localT >= a.time && localT <= b.time) {
            const raw = (localT - a.time) / (b.time - a.time);
            const al = b.cut ? (raw >= 1 ? 1 : 0)
                             : (easings[b.ease || globalEase] || easings.smooth)(Math.max(0, Math.min(1, raw)));
            const L = (p) => (typeof a[p] === 'number' && typeof b[p] === 'number')
              ? a[p] + (b[p] - a[p]) * al : (a[p] !== undefined ? a[p] : b[p]);
            if (track.isPCCam) {
              // ⚠ KAMERA MANBAI - QADAMLI. `id` son emas, HAVOLA:
              //   kamera-1 va kamera-2 orasida "o'rtacha kamera" yo'q.
              //   Sonli lerp 1 va 7 dan 4 chiqarib, mavjud bo'lmagan
              //   kameraga murojaat qilardi va ekran qorayardi.
              out = { camSource: al < 1 ? a.camSource : b.camSource };
            } else if (track.isPCFx) {
              // 🎛 Filtr - SONLAR, ya'ni SILLIQ o'tadi.
              out = {};
              for (const k of _FX_KEYS) out[k] = L(k);
            } else {
              // 🎛 Filtr - SONLAR, ya'ni SILLIQ o'tadi.
              out = {};
              for (const k of _FX_KEYS) out[k] = L(k);
            }
            break;
          }
        }
      }
      if (!out) return;
      applyPCCanvasKF(track, out);
      return;
    }

    // ── ZOOM TREKI (kamera FOV) ──
    if (track && track.isZoom) {
      const kfs = track.keyframes;
      if (!kfs || !kfs.length || typeof camera === 'undefined' || !camera) return;
      const start = kfs[0].time, end = kfs[kfs.length-1].time;
      let localT = t;
      if (track.loop && (end-start) > 0 && t > start) localT = start + ((t-start) % (end-start));
      let fov;
      if (localT <= start)      fov = kfs[0].fov;
      else if (localT >= end)   fov = kfs[kfs.length-1].fov;
      else {
        for (let i = 0; i < kfs.length-1; i++) {
          const a = kfs[i], b = kfs[i+1];
          if (localT >= a.time && localT <= b.time) {
            const raw = (localT - a.time) / (b.time - a.time);
            const al  = b.cut ? (raw>=1?1:0) : (easings[b.ease||globalEase]||easings.smooth)(Math.max(0,Math.min(1,raw)));
            fov = a.fov + (b.fov - a.fov) * al;
            break;
          }
        }
      }
      if (typeof fov === 'number') { camera.fov = fov; camera.updateProjectionMatrix(); }
      return;
    }

    const kfs = track?.keyframes;
    if (!kfs?.length) return;

    const obj = track.objRef || getObjById(track.objId);
    if (!obj) {
      if (!track._warnedMissing) {
        track._warnedMissing = true;
        clog(`⚠ Track "${track.objName}" — object topilmadi (objId: ${track.objId})`, 'w');
      }
      return;
    }

    const trackStart = kfs[0].time;
    const trackEnd   = kfs[kfs.length-1].time;
    const trackLen   = trackEnd - trackStart;
    let localT = t;
    if (track.loop && trackLen > 0 && t > trackStart) {
      localT = trackStart + ((t - trackStart) % trackLen);
    }

    if (localT <= trackStart) { applyState(obj, kfs[0]); return; }
    if (localT >= trackEnd)   {
      const last = kfs[kfs.length-1];
      // 📝 Oxirgi keyda matn to'liq ko'rinsin (fade tugagan)
      if (obj.userData && obj.userData.isTextBlock && last.txt !== undefined) {
        applyState(obj, Object.assign({}, last, { txtOp: 1 }));
      } else applyState(obj, last);
      return;
    }

    for (let i = 0; i < kfs.length-1; i++) {
      const a = kfs[i], b = kfs[i+1];
      if (localT >= a.time && localT <= b.time) {
        const raw   = (localT - a.time) / (b.time - a.time);
        // Dual/Cut key: silliq emas — oldingi holatda turadi va b.time'da SAKRAB o'tadi (teleport)
        const alpha = b.cut ? (raw >= 1 ? 1 : 0)
                            : (easings[b.ease||globalEase]||easings.smooth)(Math.max(0,Math.min(1,raw)));
        const out   = {};
        if (a.pos   && b.pos)   out.pos   = lerpV3(a.pos,   b.pos,   alpha);
        if (a.rot   && b.rot)   out.rot   = lerpV3(a.rot,   b.rot,   alpha);
        if (a.scale && b.scale) out.scale = lerpV3(a.scale, b.scale, alpha);
        if (a.vis !== undefined) out.vis  = alpha < 0.5 ? a.vis : b.vis;
        // 💥 SINISH — QADAMLI va OXIRIDA: obyekt "yarim siniq"
        //    bo'lolmaydi, va sinish aynan ikkinchi keyda yuz beradi
        //    (`alpha < 1`), o'rtasida emas.
        if (a.brk !== undefined) out.brk = alpha < 1 ? a.brk : b.brk;
        // 💡 YORUG'LIK — son qiymatlar SILLIQ o'tadi (chiroq asta so'nadi,
        //    rang asta almashadi). Yoniq/o'chiq esa QADAMLI — yorug'lik
        //    "yarim yoniq" bo'lolmaydi.
        if (obj.isLight) {
          if (typeof a.li === 'number' && typeof b.li === 'number') out.li = a.li + (b.li - a.li) * alpha;
          if (a.lc && b.lc) out.lc = _lerpHex(a.lc, b.lc, alpha);
          if (typeof a.ld === 'number' && typeof b.ld === 'number') out.ld = a.ld + (b.ld - a.ld) * alpha;
          if (typeof a.la === 'number' && typeof b.la === 'number') out.la = a.la + (b.la - a.la) * alpha;
          if (typeof a.lp === 'number' && typeof b.lp === 'number') out.lp = a.lp + (b.lp - a.lp) * alpha;
          if (a.lon !== undefined) out.lon = alpha < 1 ? a.lon : b.lon;
          if (a.lt && b.lt) out.lt = lerpV3(a.lt, b.lt, alpha);   // 🔦 nur yo'nalishi
        }
        // 📝 MATN — lerp qilinmaydi (qadamli). Blokning o'z o'zgarish
        // turi (⚡ oddiy / 🔲 qattiq / 🌊 silliq) bo'yicha almashadi.
        if (obj.userData && obj.userData.isTextBlock && window.TextBlockSystem) {
          const ts = TextBlockSystem.textStateAt(
            kfs, localT,
            obj.userData.textEase || 'smooth',
            obj.userData.textFade ?? 0.4);
          if (ts) { out.txt = ts.txt; out.txtOp = ts.op; }
        }
        // 🎞 GIF KLIPI — QADAMLI. Rasm — son emas, oraliq qiymati
        //    yo'q: keyframening yarmida keyingisiga o'tadi.
        if (a.gifClip !== undefined || b.gifClip !== undefined) {
          out.gifClip = alpha < 0.5 ? a.gifClip : b.gifClip;
          out.gifFps  = alpha < 0.5 ? a.gifFps  : b.gifFps;
          out.gifFace = alpha < 0.5 ? a.gifFace : b.gifFace;
        }
        // ✨ OBYEKT YORQINLIGI — sonlar SILLIQ (70 → 100 orada
        //    asta ko'tariladi), yoqiq/o'chiq esa QADAMLI: "yarim
        //    yoqilgan chiroq" degan narsa yo'q.
        if (typeof a.gPow  === 'number' && typeof b.gPow  === 'number') out.gPow  = a.gPow  + (b.gPow  - a.gPow)  * alpha;
        if (typeof a.gDist === 'number' && typeof b.gDist === 'number') out.gDist = a.gDist + (b.gDist - a.gDist) * alpha;
        if (typeof a.gSelf === 'number' && typeof b.gSelf === 'number') out.gSelf = a.gSelf + (b.gSelf - a.gSelf) * alpha;
        if (a.gOn !== undefined) out.gOn = alpha < 1 ? a.gOn : b.gOn;
        // 🔊 BALANDLIK — SILLIQ. Butun g'oyaning o'zi shu: 50% dan
        //    100% ga keylar ORASIDA asta ko'tarilishi kerak. Qadamli
        //    qilsak ovoz ikkinchi keyda "chirt" etib sakrardi.
        if (typeof a.sbVol === 'number' && typeof b.sbVol === 'number') out.sbVol = a.sbVol + (b.sbVol - a.sbVol) * alpha;
        if (typeof a.fov === 'number' && typeof b.fov === 'number') out.fov = a.fov + (b.fov - a.fov) * alpha;
        // 💻 PC BLOCK — QADAMLI (silliq emas): oldingi holatda turadi,
        //    keyingi keyga yetganda YONIQ/O'CHIQ yoki ekran rejimi almashadi.
        if (obj.userData && obj.userData.isPCBlock) {
          if (a.pcOn   !== undefined) out.pcOn   = alpha < 1 ? a.pcOn   : b.pcOn;
          if (a.pcMode !== undefined) out.pcMode = alpha < 1 ? a.pcMode : b.pcMode;
          // 💻 HTML matn — qadamli (yarim kod degan narsa yo'q)
          if (a.pcHtml !== undefined) out.pcHtml = alpha < 1 ? a.pcHtml : b.pcHtml;
        }
        applyState(obj, out);
        return;
      }
    }
  }

  // ── RENDER ─────────────────────────────────────────────────
  function laneW() {
    const el = $('tl-tracks');
    return Math.max(80, (el ? el.offsetWidth : 300) - 90);
  }

  // ── ZOOM / PAN yordamchilari ──
  function _viewDur() { return duration / tlZoom; }               // ko'rinadigan vaqt oynasi (s)
  function _clampPan() {
    const vd = _viewDur();
    const maxPan = Math.max(0, duration - vd);
    if (tlPan < 0) tlPan = 0;
    if (tlPan > maxPan) tlPan = maxPan;
  }
  function _t2frac(t) { return (t - tlPan) / _viewDur(); }         // vaqt → 0..1 (lane bo'yicha)
  function _frac2t(f) { return tlPan + f * _viewDur(); }           // 0..1 → vaqt
  // Tik qadamini ko'rinadigan zichlikка moslash (0.5 1 2 … 10 20 30)
  function _niceStep(px) {
    const vd = _viewDur();
    const pps = laneW() / vd;                 // piksel / soniya
    const targetSec = 62 / pps;               // ~62px oralig'ida bitta tik
    const steps = [0.1,0.25,0.5,1,2,5,10,15,20,30,60,120,300];
    for (const s of steps) if (s >= targetSec) return s;
    return steps[steps.length-1];
  }

  function updatePlayhead() {
    const ph = $('tl-playhead');
    if (!ph) return;
    const f = _t2frac(currentTime);
    if (f < -0.001 || f > 1.001) { ph.style.display = 'none'; return; }
    ph.style.display = '';
    ph.style.left = (90 + f * laneW()) + 'px';
  }

  function updateTimeLbl() {
    const l = $('tl-time-lbl');
    if (l) l.textContent = currentTime.toFixed(2)+'s';
  }

  function render() {
    const tracksEl = $('tl-tracks');
    if (!tracksEl) return;

    const row = $('tl-scrubber-row');
    if (row) {
      row.querySelectorAll('.tl-tick,.tl-tick-lbl').forEach(e=>e.remove());
      _clampPan();
      const lw   = laneW();
      const vd   = _viewDur();
      const step = _niceStep();
      const t0   = Math.floor(tlPan / step) * step;
      const tEnd = tlPan + vd;
      for (let t=t0; t<=tEnd+1e-6; t+=step) {
        if (t < -1e-6) continue;
        const f = _t2frac(t);
        if (f < -0.001 || f > 1.001) continue;
        const x  = 90 + f*lw;
        const tk = $el('div','tl-tick',{left:x+'px'});
        row.appendChild(tk);
        const lb = $el('div','tl-tick-lbl',{left:(x+2)+'px'});
        lb.textContent = t.toFixed(step<1?1:0)+'s';
        row.appendChild(lb);
      }
    }

    updatePlayhead();
    updateTimeLbl();

    tracksEl.innerHTML = '';
    tracks.forEach((track, ti) => {
      const pct  = t => (_t2frac(t)*100)+'%';
      const _vis = t => { const f=_t2frac(t); return f>=-0.02 && f<=1.02; };  // oynada ko'rinadimi
      const trow = $el('div','tl-track');

      const lbl = $el('div','tl-track-lbl');
      lbl.textContent = track.objName.length>11 ? track.objName.slice(0,10)+'…' : track.objName;
      lbl.title = track.objName;

      if (track.isFilter) {
        lbl.textContent = (filterTrackActive ? '● ' : '') + '🎨 Filtr';
        lbl.style.color = 'var(--accent, var(--accent))';
        lbl.style.cursor = 'pointer';
        lbl.style.fontWeight = '700';
        if (filterTrackActive) lbl.style.textShadow = '0 0 6px var(--accent, var(--accent))';
        lbl.title = 'Filtr treki — bosib rejimni yoqing, so\'ng I → filtr keyframe';
        lbl.addEventListener('click', e => {
          e.stopPropagation();
          filterTrackActive = !filterTrackActive;
          if (filterTrackActive) { weatherTrackActive = false; kinoTrackActive = false; _rememberSelection(); }
          clog(filterTrackActive ? '🎨 Filtr rejimi YONIQ — endi I filtr KF qo\'yadi' : 'Filtr rejimi o\'chirildi', 'ok');
          render();
        });
      } else if (track.isZoom) {
        lbl.textContent = '🔎 Zoom';
        lbl.style.color = 'var(--accent)'; lbl.style.fontWeight = '700';
        lbl.title = 'Kamera FOV (zoom) treki — 🔎 tugma bilan key qo\'ying';
      } else if (track.isSkybox) {
        lbl.textContent = '🌌 Skybox';
        lbl.style.color = 'var(--accent)'; lbl.style.fontWeight = '700'; lbl.style.cursor = 'pointer';
        lbl.title = 'Skybox treki — panelni ochib rangni sozlang, so\'ng key qo\'ying';
        lbl.addEventListener('click', e => {
          e.stopPropagation();
          if (window.SkyboxSystem) SkyboxSystem.showPanel();
        });
      } else if (track.isWeather) {
        lbl.textContent = (weatherTrackActive ? '● ' : '') + '🌦 Weather';
        lbl.style.color = 'var(--accent2)'; lbl.style.fontWeight = '700'; lbl.style.cursor = 'pointer';
        if (weatherTrackActive) lbl.style.textShadow = '0 0 6px var(--accent2)';
        lbl.title = 'Ob-havo treki — bosib rejimni yoqing, atmosferani sozlang, I → key';
        lbl.addEventListener('click', e => {
          e.stopPropagation();
          weatherTrackActive = !weatherTrackActive;
          if (weatherTrackActive) { filterTrackActive = false; kinoTrackActive = false; _rememberSelection(); }
          clog(weatherTrackActive ? '🌦 Ob-havo rejimi YONIQ — I atmosfera KF qo\'yadi' : 'Ob-havo rejimi o\'chirildi', 'ok');
          render();
        });
      } else if (track.isKino) {
        lbl.textContent = (kinoTrackActive ? '● ' : '') + '🎬 Kino';
        lbl.style.color = 'var(--accent3)'; lbl.style.fontWeight = '700'; lbl.style.cursor = 'pointer';
        if (kinoTrackActive) lbl.style.textShadow = '0 0 6px var(--accent3)';
        lbl.title = 'Kino kamera treki — bosib rejimni yoqing, sozlang, I → key';
        lbl.addEventListener('click', e => {
          e.stopPropagation();
          kinoTrackActive = !kinoTrackActive;
          if (kinoTrackActive) { filterTrackActive = false; weatherTrackActive = false; _rememberSelection(); }
          clog(kinoTrackActive ? '🎬 Kino rejimi YONIQ — I kino KF qo\'yadi' : 'Kino rejimi o\'chirildi', 'ok');
          render();
        });
      } else if (track.isBlockPick) {
        lbl.textContent = '🔒 Blok tanlash';
        lbl.style.color = '#ff3b6b'; lbl.style.fontWeight = '700';
        lbl.title = 'Bloklash uchun keyframe\'ni bosing (qizil = blok). Qayta bosib o\'chiriladi.';
      } else {
        lbl.addEventListener('click', e => {
          e.stopPropagation();
          if (filterTrackActive || weatherTrackActive || kinoTrackActive) {
            filterTrackActive = false; weatherTrackActive = false; kinoTrackActive = false; render();
          }
        });
      }

      // 🗑 Bu obyekt (trek) ning HAMMA keyini o'chirish — loop oldida
      if (!track.isBlockPick) {
        const trashBtn = $el('button', 'tl-track-loop-btn');
        trashBtn.textContent = '🗑';
        trashBtn.title = "Bu obyektning hamma keyini o'chirish";
        trashBtn.style.color = '#ff6b6b';
        trashBtn.style.borderColor = 'rgba(255,107,107,.4)';
        trashBtn.addEventListener('click', e => {
          e.stopPropagation();
          const n = (track.keyframes && track.keyframes.length) || 0;
          if (!n) { clog('⚠ Bu trekда key yo\'q','w'); return; }
          if (!confirm(`"${track.objName}" — ${n} ta key o'chirilsinmi?`)) return;
          _tlPushUndo('trek tozalandi');
          const idx = tracks.indexOf(track);
          if (idx >= 0) tracks.splice(idx, 1);
          selectedKf = null;
          _fitDuration(); render();
          clog(`🗑 "${track.objName}" — hamma key o'chirildi`, 'ok');
        });
        trow.appendChild(trashBtn);
      }

      const loopBtn = $el('button', 'tl-track-loop-btn' + (track.loop ? ' active' : ''));
      loopBtn.textContent = '🔁';
      loopBtn.title = "🔁 Loop — SHU trek o'z OXIRGI KEYIGA yetganda qaytadan " +
        "boshlanadi.\nTimelinening oxiri bilan bog'liq emas va boshqa treklarga " +
        "tegmaydi.\nButun timelineni takrorlash — pastdagi umumiy 🔁 tugmasi.";
      loopBtn.addEventListener('click', e => {
        e.stopPropagation();
        track.loop = !track.loop;
        loopBtn.classList.toggle('active', track.loop);
        // ⚠ Trek loopi — FAQAT shu trek uchun: u O'Z OXIRGI KEYIDA
        //   qaytadan boshlanadi. Butun timelineni takrorlash esa
        //   pastdagi umumiy 🔁 tugmasining ishi.
        clog(`🔁 "${track.objName}" loop: ${track.loop ? 'YOQILDI' : 'O\'chirildi'}` +
             (track.loop ? ` — oxirgi keyda (${_trackLen(track).toFixed(2)}s) qaytadi` : ''), 'ok');
      });
      trow.appendChild(loopBtn);
      trow.appendChild(lbl);

      const lane = $el('div','tl-track-lane');
      lane.addEventListener('click', e => {
        const r   = lane.getBoundingClientRect();
        const raw = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
        currentTime = _frac2t(raw);
        updatePlayhead(); updateTimeLbl();
        tracks.forEach(tr=>interpolateTrack(tr,currentTime));
      });

      track.keyframes.forEach((kf,ki) => {
        if (ki < track.keyframes.length-1) {
          const nxt = track.keyframes[ki+1];
          if (!_vis(kf.time) && !_vis(nxt.time)) return;   // oynadan tashqarida — chizmaymiz
          const seg = $el('div',`tl-segment ease-${kf.ease||'smooth'}`);
          seg.style.left  = pct(kf.time);
          seg.style.width = (((nxt.time-kf.time)/_viewDur())*100)+'%';
          lane.appendChild(seg);
        }
      });

      track.keyframes.forEach((kf,ki) => {
        const isSnd     = kf.sound   !== undefined;
        const isWeather = kf.weather !== undefined || kf.atmo !== undefined;
        const isZoom    = kf.fov     !== undefined && kf.pos === undefined;
        const isVis     = kf.vis     !== undefined && kf.pos === undefined;
        const kfEl  = $el('div',
          isSnd ? 'tl-kf-snd' :
          isVis ? `tl-kf-vis ${kf.vis?'vis-on':'vis-off'}` :
                  `tl-kf ease-${kf.ease||'smooth'}`
        );
        if (kf.sky) { kfEl.style.background = kf.sky.color || 'var(--accent)'; kfEl.style.borderRadius='2px';
                      kfEl.style.border='1px solid #fff6'; kfEl.title='🌌 Skybox: '+(kf.sky.color||''); }
        if (kf.kino) { kfEl.style.background = kf.kino.enabled ? 'var(--accent3)' : 'var(--border)';
                       kfEl.style.borderRadius='2px'; kfEl.style.border='1px solid #fff3';
                       kfEl.title='🎬 Kino: ' + (kf.kino.enabled ? 'yoqiq' : 'o\'chiq'); }
        if (isWeather) { kfEl.style.background='var(--accent2)'; kfEl.style.borderRadius='2px'; kfEl.style.border='1px solid #fff3'; kfEl.title='🌦 '+kf.weather; }
        else if (isZoom) { kfEl.style.background='var(--accent)'; kfEl.style.borderRadius='2px'; kfEl.title='🔎 FOV '+Math.round(kf.fov)+'°'; }
        else if (kf.cut) { kfEl.style.background='#ff3b6b'; kfEl.style.borderRadius='0'; kfEl.style.outline='1px solid #ff3b6b'; kfEl.title='⧉ Dual (cut / teleport)'; }
        if (track.isBlockPick) {
          const isBlk = (track._blocks || []).some(b => Math.abs(b.time - kf.time) < 0.005);
          kfEl.style.background = isBlk ? '#ff3b6b' : 'rgba(255,255,255,.35)';
          kfEl.style.outline = isBlk ? '2px solid #ff3b6b' : 'none';
          kfEl.style.borderRadius = '2px';
          kfEl.title = isBlk ? `🔒 Blok: ${kf.time.toFixed(2)}s (bosib o'chirish)` : `${kf.time.toFixed(2)}s — bosib blok qo'ying`;
        }
        kfEl.style.left = pct(kf.time);
        if (!_vis(kf.time)) kfEl.style.display = 'none';   // ko'rinadigan oynadan tashqarida
        if (selectedKf?.trackIdx===ti && selectedKf?.kfIdx===ki) kfEl.classList.add('selected');

        kfEl.addEventListener('click', e => {
          e.stopPropagation();
          const tr = tracks[ti];
          if (tr && tr.isBlockPick) {
            if (typeof tr._onPick === 'function') tr._onPick(kf.time);
            render();
            return;
          }
          selectedKf = {trackIdx:ti, kfIdx:ki};
          if (e.shiftKey) { showKfCtxMenu(ti, ki, e); render(); return; }  // Shift+klik → menyu
          showKfPopup(ti,ki,e);
          render();
        });
        // 🖱 O'ng tugma → kontekst menyu (copy/paste/delete/ease)
        if (!track.isBlockPick) {
          kfEl.addEventListener('contextmenu', e => {
            e.preventDefault(); e.stopPropagation();
            selectedKf = {trackIdx:ti, kfIdx:ki};
            showKfCtxMenu(ti, ki, e); render();
          });
        }
        if (!track.isBlockPick) setupKfDrag(kfEl,ti,ki);
        lane.appendChild(kfEl);
      });

      trow.appendChild(lane);
      tracksEl.appendChild(trow);
    });
  }

  // ── KF POPUP ───────────────────────────────────────────────
  function showKfPopup(ti,ki,e) {
    const kf     = tracks[ti]?.keyframes[ki];
    const popup  = $('tl-kf-popup');
    if (!kf || !popup) return;
    const isVis  = kf.vis !== undefined && kf.pos === undefined;
    const isSnd  = kf.sound !== undefined;

    if (isSnd) {
      _sndEdit = { track: tracks[ti], ki };
      _populateSndSelect(kf.sound || 'impact');
      if ($('sp-volume'))  $('sp-volume').value = kf.volume ?? 1;
      if ($('sp-vol-lbl')) $('sp-vol-lbl').textContent = (kf.volume ?? 1).toFixed(1);
      if ($('sp-spatial')) $('sp-spatial').checked = kf.spatial !== false;
      const sp = $('tl-snd-popup');
      if (sp) { sp.style.display='block'; sp.style.left=e.clientX+'px'; sp.style.top=e.clientY+'px'; }
      popup.style.display='none'; return;
    }

    popup.style.display='block';
    popup.style.left = Math.min(e.clientX, window.innerWidth -170)+'px';
    popup.style.top  = Math.min(e.clientY, window.innerHeight-130)+'px';

    const easeEl=$('kfp-ease');    if(easeEl) easeEl.value = kf.ease    ||'smooth';
    const tangEl=$('kfp-tangent'); if(tangEl) tangEl.value = kf.tangent ||'auto';
    const visRow=$('kfp-vis-row'); if(visRow) visRow.style.display = isVis?'flex':'none';
    const visEl =$('kfp-vis');     if(isVis&&visEl) visEl.value = kf.vis?'1':'0';

    setTimeout(()=>{
      function close(ev){ if(!popup.contains(ev.target)){ popup.style.display='none'; document.removeEventListener('click',close); } }
      document.addEventListener('click', close);
    }, 80);
  }

  // ── KF DRAG ────────────────────────────────────────────────
  function setupKfDrag(el,ti,ki) {
    let drag=false, sx=0, st=0, kfRef=null, moved=false;
    el.addEventListener('mousedown', e => {
      if(e.button!==0 || e.shiftKey) return;   // shift = menyu, drag emas
      e.stopPropagation();
      drag=true; moved=false; sx=e.clientX;
      kfRef = tracks[ti]?.keyframes[ki];         // INDEX emas, REF — sort qilinса ham yo'qolmaydi
      st = kfRef?.time ?? 0;
    });
    document.addEventListener('mousemove', e => {
      if(!drag || !kfRef) return;
      const dt   = ((e.clientX-sx)/laneW())*_viewDur();
      let newT   = Math.max(0, st+dt);           // YUQORI chegara YO'Q → oxiriga o'tsa cho'ziladi
      if (Math.abs(newT - st) > 0.001) moved = true;
      kfRef.time = Math.round(newT*1000)/1000;
      // Boshqa keylar ustidan bemalol o'tadi (faqat tartiblanadi, ref saqlanadi)
      if (tracks[ti]) tracks[ti].keyframes.sort((a,b)=>a.time-b.time);
      if (newT > duration) { duration = Math.ceil(newT + 0.5); updateTimeLbl(); }  // cho'zilish
      render();
    });
    document.addEventListener('mouseup', ()=>{
      if (drag && moved) { _fitDuration(); _tlPushUndo('key surildi'); render(); }
      drag=false; kfRef=null;
    });
  }

  // ══════════════════════════════════════════════════════════
  //  ✏️ TAHRIRLASH: auto-cho'zilish, clipboard, kontekst menyu, undo
  // ══════════════════════════════════════════════════════════

  // Timeline uzunligini oxirgi keyга moslash (kamida 5s). "Davom" inputisiz.
  function _fitDuration() {
    let mx = 0;
    tracks.forEach(tr => (tr.keyframes || []).forEach(k => { if (k.time > mx) mx = k.time; }));
    duration = Math.max(5, Math.ceil(mx + 0.5));
    if (currentTime > duration) currentTime = duration;
    _clampPan();
    updateTimeLbl(); updatePlayhead();
  }

  // ── Clipboard ──
  let _clip = null;   // { kf: {...}, single:true } — nusxalangan keyframe(lar)

  function tlCopyKeyframe() {
    if (!selectedKf) { clog('⚠ Nusxa uchun keyframe tanlang','w'); return; }
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (!kf) return;
    _clip = { kf: JSON.parse(JSON.stringify(kf)) };
    clog('⧉ Keyframe nusxalandi (Ctrl+V — qo\'yish)','ok');
  }
  function tlCutKeyframe() {
    tlCopyKeyframe();
    if (_clip) tlDeleteKeyframe();
  }
  // Paste — TANLANGAN trekка (yoki tanlangan obyekt trekiga), joriy vaqtga.
  //   Shu tufayli boshqa obyektga ham nusxalab qo'yiladi.
  function tlPasteKeyframe() {
    if (!_clip) { clog('⚠ Buferда keyframe yo\'q','w'); return; }
    let track = selectedKf ? tracks[selectedKf.trackIdx] : null;
    if (!track) {
      const obj = getSelectedObj();
      if (obj) track = getOrCreateTrack(obj);
    }
    if (!track) { clog('⚠ Trek tanlang (obyektни yoki uning keyini)','w'); return; }
    _tlPushUndo('paste');
    const nk = JSON.parse(JSON.stringify(_clip.kf));
    nk.time = Math.round(currentTime * 1000) / 1000;
    const ex = track.keyframes.findIndex(k => Math.abs(k.time - nk.time) < 0.004);
    if (ex >= 0) track.keyframes[ex] = nk;
    else { track.keyframes.push(nk); track.keyframes.sort((a,b)=>a.time-b.time); }
    _fitDuration();
    selectedKf = { trackIdx: tracks.indexOf(track), kfIdx: track.keyframes.indexOf(nk) };
    render();
    clog('📋 Keyframe qo\'yildi','ok');
  }

  // ── Hamma keyni o'chirish ──
  function tlClearAll() {
    const total = tracks.reduce((n,t)=>n+((t.keyframes&&t.keyframes.length)||0),0);
    if (!total) { clog('⚠ O\'chiriladigan key yo\'q','w'); return; }
    if (!confirm(`Barcha ${total} ta keyframe o'chirilsinmi?`)) return;
    _tlPushUndo('hammasi o\'chirildi');
    tracks.length = 0;
    selectedKf = null;
    _fitDuration();
    render();
    clog('🗑 Barcha keyframelar o\'chirildi','ok');
  }

  // ── Kontekst menyu (o'ng-tugma / shift-klik) ──
  function showKfCtxMenu(ti, ki, e) {
    document.getElementById('tl-ctx-menu')?.remove();
    const kf = tracks[ti]?.keyframes[ki];
    const m = document.createElement('div');
    m.id = 'tl-ctx-menu';
    m.style.cssText = `position:fixed;z-index:9999;left:${Math.min(e.clientX, innerWidth-170)}px;top:${Math.min(e.clientY, innerHeight-260)}px;
      background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:4px;min-width:150px;
      box-shadow:0 8px 24px rgba(0,0,0,.5);font-family:'Rajdhani',sans-serif;font-size:12px`;
    const row = (label, fn, col) => {
      const b = document.createElement('div');
      b.textContent = label;
      b.style.cssText = `padding:6px 10px;border-radius:4px;cursor:pointer;color:${col||'var(--text)'};white-space:nowrap`;
      b.onmouseenter = () => b.style.background = 'rgba(255,255,255,.07)';
      b.onmouseleave = () => b.style.background = 'none';
      b.onclick = () => { m.remove(); fn(); };
      return b;
    };
    const sep = () => { const d=document.createElement('div'); d.style.cssText='height:1px;background:var(--border);margin:3px 0'; return d; };
    const head = document.createElement('div');
    head.textContent = `◆ ${(kf?.time??0).toFixed(2)}s`;
    head.style.cssText = 'padding:4px 10px;color:var(--muted);font-size:10px;letter-spacing:1px';
    m.appendChild(head);
    m.appendChild(row('⧉ Nusxa (Ctrl+C)', tlCopyKeyframe));
    m.appendChild(row('✂ Kes (Ctrl+X)',   tlCutKeyframe));
    m.appendChild(row('📋 Qo\'y (Ctrl+V)', tlPasteKeyframe, _clip ? 'var(--accent)' : 'var(--muted)'));
    m.appendChild(row('✕ O\'chir (Del)',   tlDeleteKeyframe, '#ff6666'));
    m.appendChild(sep());
    // Egri (line) shakli — 1-radius: silliq / tekis / siniq / o'tkir
    const setEase = (v) => { if (kf) { kf.ease = v; _tlPushUndo('ease'); render(); } };
    m.appendChild(row('∿ Silliq',  () => setEase('smooth')));
    m.appendChild(row('╱ Tekis',   () => setEase('linear')));
    m.appendChild(row('⌐ Siniq',   () => setEase('step')));
    m.appendChild(row('▲ O\'tkir', () => setEase('back')));
    document.body.appendChild(m);
    setTimeout(() => {
      const close = ev => { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('mousedown', close); } };
      document.addEventListener('mousedown', close);
    }, 60);
  }

  // ── Timeline UNDO / REDO (o'z stack — sahna undo'sidан alohida) ──
  const _tlUndo = [], _tlRedo = [];
  const _TL_MAX = 60;
  function _tlSnapshot() {
    // objRef ni tashlab, faqat serializable qism (keyframes) saqlanadi
    return {
      duration,
      tracks: tracks.map(t => ({
        objId: t.objId, objName: t.objName, loop: !!t.loop,
        isFilter: t.isFilter, isZoom: t.isZoom, isWeather: t.isWeather, isSkybox: t.isSkybox, isKino: t.isKino, isBlockPick: t.isBlockPick,
        // 💻 PC treklari — `pcId` HAM kerak: busiz trek qaysi PC ga
        //    tegishli ekanini unutardi va jimgina tashlanardi.
        isPCCam: t.isPCCam, isPCFx: t.isPCFx, pcId: t.pcId,
        keyframes: JSON.parse(JSON.stringify(t.keyframes || []))
      }))
    };
  }
  function _tlPushUndo() {
    _tlUndo.push(_tlSnapshot());
    if (_tlUndo.length > _TL_MAX) _tlUndo.shift();
    _tlRedo.length = 0;
  }
  function _tlApply(snap) {
    duration = snap.duration;
    tracks.length = 0;
    snap.tracks.forEach(s => {
      const tr = { objId: s.objId, objName: s.objName, loop: s.loop,
        isFilter: s.isFilter, isZoom: s.isZoom, isWeather: s.isWeather, isSkybox: s.isSkybox, isKino: s.isKino, isBlockPick: s.isBlockPick,
        isPCCam: s.isPCCam, isPCFx: s.isPCFx, pcId: s.pcId,
        keyframes: JSON.parse(JSON.stringify(s.keyframes)) };
      tr.objRef = getObjById(s.objId) || null;   // obyektни qayta ulaymiz
      tracks.push(tr);
    });
    selectedKf = null;
    updateTimeLbl(); updatePlayhead(); render();
  }
  function tlUndo() {
    if (!_tlUndo.length) { clog('⚠ Bekor qilinadigan timeline amali yo\'q','w'); return false; }
    _tlRedo.push(_tlSnapshot());
    _tlApply(_tlUndo.pop());
    clog('↶ Timeline: bekor qilindi','ok'); return true;
  }
  function tlRedo() {
    if (!_tlRedo.length) { clog('⚠ Qayta qilinadigan yo\'q','w'); return false; }
    _tlUndo.push(_tlSnapshot());
    _tlApply(_tlRedo.pop());
    clog('↷ Timeline: qayta qilindi','ok'); return true;
  }
  // Timeline paneli ochiqmi (undo shungа yo'naltiriladi)
  function _tlVisible() {
    const p = document.getElementById('timeline-panel');
    return p && p.style.display !== 'none' && p.offsetParent !== null;
  }
  // Global Ctrl+Z/Y ni o'raymiz: timeline ochiq va tarixi bo'lsa — timeline undo
  const _origUndo = window.undo, _origRedo = window.redo;
  window.undo = function() { if (_tlVisible() && _tlUndo.length) { tlUndo(); return; } if (_origUndo) _origUndo(); };
  window.redo = function() { if (_tlVisible() && _tlRedo.length) { tlRedo(); return; } if (_origRedo) _origRedo(); };

  // ── Klaviatura: Ctrl+C/X/V, Del (timeline ochiq va input'да yozilmayotgan bo'lsa) ──
  document.addEventListener('keydown', e => {
    if (!_tlVisible()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'c' && selectedKf) { e.preventDefault(); tlCopyKeyframe(); }
      else if (k === 'x' && selectedKf) { e.preventDefault(); tlCutKeyframe(); }
      else if (k === 'v' && _clip) { e.preventDefault(); tlPasteKeyframe(); }
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKf) {
      e.preventDefault(); tlDeleteKeyframe();
    }
  }, true);

  // ── SCRUBBER DRAG ──────────────────────────────────────────
  function _timeAt(e) {
    const row = $('tl-scrubber-row'); if (!row) return 0;
    const rect = row.getBoundingClientRect();
    return Math.max(0, Math.min(duration, _frac2t((e.clientX-rect.left-90)/laneW())));
  }

  function _updateCutRange() {
    const cr = $('tl-cut-range'); if (!cr) return;
    if (cutStart === null) { cr.style.display = 'none'; return; }
    const a = cutStart, b = (cutEnd === null ? cutStart : cutEnd);
    const lo = Math.min(a,b), hi = Math.max(a,b);
    cr.style.display = 'block';
    cr.style.left  = (90 + _t2frac(lo)*laneW()) + 'px';
    cr.style.width = ((_t2frac(hi)-_t2frac(lo))*laneW()) + 'px';
  }

  function _applyCut() {
    if (cutStart === null || cutEnd === null) return;
    const lo = Math.min(cutStart, cutEnd), hi = Math.max(cutStart, cutEnd);
    const len = hi - lo;
    if (len < 0.01) { cutStart = cutEnd = null; _updateCutRange(); return; }
    let removed = 0;
    tracks.forEach(tr => {
      const kept = [];
      (tr.keyframes || []).forEach(kf => {
        if (kf.time > lo && kf.time < hi) { removed++; return; }      // diapazon ichidagilar o'chadi
        if (kf.time >= hi) kf.time = Math.round((kf.time - len)*1000)/1000; // keyingilar chapga suriladi
        kept.push(kf);
      });
      tr.keyframes = kept;
    });
    // bo'sh treklarni tozalash
    for (let i = tracks.length-1; i >= 0; i--) if (!tracks[i].keyframes.length) tracks.splice(i,1);
    duration = Math.max(1, Math.round((duration - len)*1000)/1000);
    if (currentTime > duration) currentTime = duration;
    const di = $('tl-dur-inp'); if (di) di.value = duration;
    cutStart = cutEnd = null;
    _updateCutRange();
    render();
    clog(`✂ Kesildi: ${lo.toFixed(2)}–${hi.toFixed(2)}s (${removed} KF o'chdi, ${len.toFixed(2)}s qisqardi)`, 'ok');
  }

  function initScrubber() {
    const row = $('tl-scrubber-row');
    if (!row) return;
    let drag = false;
    function seek(e) {
      currentTime = _timeAt(e);
      updatePlayhead(); updateTimeLbl();
      tracks.forEach(tr=>interpolateTrack(tr,currentTime));
    }
    row.addEventListener('mousedown', e => {
      if (cutMode) {
        const t = _timeAt(e);
        if (cutStart === null) { cutStart = t; cutEnd = null; _updateCutRange(); clog(`✂ Boshi: ${t.toFixed(2)}s — ikkinchi nuqtani bosing`, 'ok'); }
        else { cutEnd = t; _updateCutRange(); _applyCut(); }
        return;
      }
      drag = true; seek(e);
    });
    document.addEventListener('mousemove', e => {
      if (cutMode && cutStart !== null && cutEnd === null) { /* jonli oldindan ko'rish */ const cr=$('tl-cut-range'); if(cr){ const hi=_timeAt(e); const lo=Math.min(cutStart,hi),h=Math.max(cutStart,hi); cr.style.display='block'; cr.style.left=(90+_t2frac(lo)*laneW())+'px'; cr.style.width=((_t2frac(h)-_t2frac(lo))*laneW())+'px'; } return; }
      if (drag) seek(e);
    });
    document.addEventListener('mouseup', ()=>{ drag=false; });

    // ── Ctrl+scroll = ZOOM (kursor ostidagi vaqt joyida qoladi), Shift+scroll = PAN (yonga) ──
    const body = $('tl-body') || row;
    const onWheel = e => {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey)) return;  // oddiy scroll — vertikal, tegmaymiz
      e.preventDefault();
      const lw = laneW();
      // kursorning lane ichidagi ulushi (0..1)
      const bx = (body.getBoundingClientRect().left) + 90;
      let f = (e.clientX - bx) / lw;
      f = Math.max(0, Math.min(1, f));

      if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // PAN — yonga siljish
        tlPan += (e.deltaY > 0 ? 1 : -1) * _viewDur() * 0.18;
        _clampPan();
      } else {
        // ZOOM — pastga(+) yaqinlashadi, tepaga(−) uzoqlashadi; kursor ostidagi vaqt qotib turadi
        const tUnder = _frac2t(f);
        const factor = e.deltaY > 0 ? 1.25 : 0.8;
        tlZoom = Math.max(1, Math.min(60, tlZoom * factor));
        tlPan = tUnder - f * _viewDur();
        _clampPan();
      }
      render();
    };
    if (body) body.addEventListener('wheel', onWheel, { passive: false });
  }

  // ── KEYBOARD SHORTCUTS ──────────────────────────────────────
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      const tag = e.target.tagName;
      if (tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.target.isContentEditable) return;

      if (e.code === 'KeyI' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        tlAddKeyframe();
        return;
      }
      if (e.code === 'KeyI' && e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        tlAddVisKeyframe();
        return;
      }
      if ((e.code==='Delete'||e.code==='Backspace') && selectedKf !== null) {
        const tlPanel = $('timeline-panel');
        if (tlPanel && tlPanel.style.display !== 'none') {
          e.preventDefault();
          tlDeleteKeyframe();
        }
      }
    });
  }

  /** Trekning O'Z uzunligi — birinchi keydan oxirgisigacha. */
  function _trackLen(track) {
    const k = (track && track.keyframes) || [];
    if (k.length < 2) return 0;
    const ts = k.map(x => x.time || 0);
    return Math.max(...ts) - Math.min(...ts);
  }

  // ── PLAYBACK ───────────────────────────────────────────────
  function play() {
    if (isPlaying) return;
    isPlaying = true; lastTS = null;
    _lastPlayT = currentTime;
    const btn = $('tl-play-btn');
    if (btn) { btn.textContent='⏸'; btn.classList.add('active'); }
    function step(ts) {
      if (!isPlaying) return;
      if (lastTS !== null) {
        currentTime += (ts-lastTS)/1000;
        if (currentTime >= duration) {
          // ── ⚠ FAQAT GLOBAL 🔁 — trek loopi EMAS ────────────────
          //  ALOMAT: bitta trekda 🔁 yoqilsa, timeline OXIRIGA
          //    yetganda BUTUN sahna qaytadan boshlanardi — loopsiz
          //    treklar ham. Ya'ni "shu eshik aylansin" degan bitta
          //    belgi butun animatsiyani takrorlashga majbur qilardi.
          //
          //  SABAB: `anyTrackLoops` — biror trekda loop bo'lsa
          //    `currentTime` nolga qaytarilardi.
          //
          //  TO'G'RISI: trek loopi O'Z OXIRGI KEYIDA qaytadi va buni
          //    `interpolateTrack()` bajaradi (`% trackLen`). Playhead
          //    esa oldinga yuraveradi. Butun timelineni takrorlash —
          //    alohida, GLOBAL 🔁 tugmasining ishi.
          if (loopMode) {
            currentTime = currentTime % duration;
          } else {
            currentTime = duration;
            _fireSoundKeyframes(_lastPlayT, currentTime);
            stop();
            updatePlayhead(); updateTimeLbl();
            tracks.forEach(tr=>interpolateTrack(tr,currentTime));
            return;
          }
        }
      }
      lastTS = ts;
      _fireSoundKeyframes(_lastPlayT, currentTime);
      _lastPlayT = currentTime;
      updatePlayhead(); updateTimeLbl();
      tracks.forEach(tr=>interpolateTrack(tr,currentTime));
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  // ── ⏱ Aniq vaqtga o'tish (animatsiya eksporti va script uchun) ──
  //  To'xtatmaydi — faqat playhead ni suradi va holatni qo'llaydi.
  function tlSeek(t) {
    currentTime = Math.max(0, Math.min(duration, +t || 0));
    _lastPlayT = currentTime;
    updatePlayhead(); updateTimeLbl();
    tracks.forEach(tr => interpolateTrack(tr, currentTime));
  }

  function stop() {
    isPlaying = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId=null; }
    lastTS = null;
    const btn = $('tl-play-btn');
    if (btn) { btn.textContent='▶'; btn.classList.remove('active'); }
  }

  // ── CSS PATCH ──────────────────────────────────────────────
  function patchCSS() {
    if ($('tl-css-patch')) return;
    const s = document.createElement('style');
    s.id = 'tl-css-patch';
    s.textContent = `
      #timeline-panel {
        height: calc(100% - 28px) !important;
        display: none !important;
        flex-direction: column;
        overflow: hidden;
      }
      #timeline-panel.tl-visible {
        display: flex !important;
      }
      .tl-track-loop-btn {
        flex-shrink: 0;
        background: transparent;
        border: 1px solid #444;
        border-radius: 3px;
        color: #555;
        cursor: pointer;
        font-size: 10px;
        line-height: 1;
        padding: 1px 4px;
        margin-right: 3px;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        user-select: none;
      }
      .tl-track-loop-btn:hover { background:#222; color:#aaa; border-color:#666; }
      .tl-track-loop-btn.active { background:#1a4a6e; border-color:#3a8fc7; color:#7dd3f8; }
    `;
    document.head.appendChild(s);
  }

  // ── switchBottomTab ─────────────────────────────────────────
  function patchSwitchBottomTab() {
    window.switchBottomTab = function(tab, tabEl) {
      ['console-body','timeline-panel','physics-panel'].forEach(id => {
        const el = $(id);
        if (!el) return;
        el.style.display = 'none';
        el.classList.remove('tl-visible');
      });
      const sw = $('script-wrap') || $('script-panel');
      if (sw) sw.style.display = 'none';

      if (tab === 'timeline') {
        const tp = $('timeline-panel');
        if (tp) { tp.style.display='flex'; tp.classList.add('tl-visible'); render(); }
      } else if (tab === 'console') {
        const cb = $('console-body');
        if (cb) cb.style.display = 'block';
      } else if (tab === 'physics') {
        const pp = $('physics-panel');
        if (pp) pp.style.display = 'block';
      } else if (tab === 'script') {
        const sp = $('script-wrap') || $('script-panel');
        if (sp) sp.style.display = 'flex';
      }

      document.querySelectorAll('#console-wrap .ptab').forEach(t => t.classList.remove('active'));
      if (tabEl) tabEl.classList.add('active');
    };
  }

  // ── PUBLIC API ─────────────────────────────────────────────

  function tlPlay() { isPlaying ? stop() : play(); }

  function tlStop() {
    stop();
    currentTime = 0;
    tracks.forEach(tr => { if(tr.keyframes.length) interpolateTrack(tr,0); });
    render(); updateTimeLbl();
  }

  // ── FILTR (ColorGrade) TREKI ───────────────────────────────
  function getOrCreateFilterTrack() {
    let track = tracks.find(t => t.isFilter);
    if (!track) {
      track = { isFilter: true, objId: FILTER_ID, objName: '🎨 Filtr', objRef: null, keyframes: [] };
      tracks.push(track);
    }
    return track;
  }

  // "🎨 Filtr → Timeline" — trek qo'shadi, timeline'ni ochadi, filtr rejimini yoqadi
  function addFilterToTimeline() {
    getOrCreateFilterTrack();
    filterTrackActive = true;
    weatherTrackActive = false;
    _rememberSelection();
    if (typeof window.switchBottomTab === 'function') {
      try { window.switchBottomTab('timeline'); } catch (e) {}
    }
    const tp = $('timeline-panel');
    if (tp) { tp.style.display = 'flex'; tp.classList.add('tl-visible'); }
    render();
    clog('🎨 Filtr treki qo\'shildi — kursorni joyga qo\'ying va I bosing (filtr keyframe)', 'ok');
    clog('   Obyektga key kerak bo\'lsa — shunchaki obyektni tanlang, rejim o\'zi o\'chadi', 'i');
  }

  function tlAddFilterKeyframe() {
    if (typeof ColorGrade === 'undefined') { clog('⚠ ColorGrade topilmadi', 'w'); return; }
    const track = getOrCreateFilterTrack();
    filterTrackActive = true;
    const settings = ColorGrade.getSettings();
    const kf = { time: Math.round(currentTime*1000)/1000, ease: globalEase, filter: settings };
    const ex = track.keyframes.findIndex(k => Math.abs(k.time - kf.time) < 0.005);
    if (ex >= 0) track.keyframes[ex] = kf;
    else { track.keyframes.push(kf); track.keyframes.sort((a,b)=>a.time-b.time); }
    render();
    clog(`🎨◆ Filtr KF: t=${kf.time.toFixed(2)}s`, 'ok');
  }

  // ── 🎬 KINO KAMERA TREKI ───────────────────────────────────
  function getOrCreateKinoTrack() {
    let track = tracks.find(t => t.isKino);
    if (!track) {
      track = { isKino: true, objId: KINO_ID, objName: '🎬 Kino', objRef: null, keyframes: [] };
      tracks.push(track);
    }
    return track;
  }

  /** "🎬 Kino → Timeline" — trek qo'shadi va rejimni yoqadi. */
  function addKinoToTimeline() {
    getOrCreateKinoTrack();
    kinoTrackActive = true;
    filterTrackActive = false;
    weatherTrackActive = false;
    _rememberSelection();
    if (typeof window.switchBottomTab === 'function') {
      try { window.switchBottomTab('timeline'); } catch (e) {}
    }
    const tp = $('timeline-panel');
    if (tp) { tp.style.display = 'flex'; tp.classList.add('tl-visible'); }
    render();
    clog('🎬 Kino treki qo\'shildi — kursorni joyga qo\'ying va I bosing', 'ok');
    clog('   O\'chirib key qo\'ying, boshqa joyda yoqib yana key — o\'rtada o\'zi o\'tadi', 'i');
  }

  function tlAddKinoKeyframe() {
    const K = window.KinoCamSystem;
    if (!K) { clog('⚠ KinoCamSystem topilmadi', 'w'); return; }
    const track = getOrCreateKinoTrack();
    kinoTrackActive = true;
    const kf = { time: Math.round(currentTime * 1000) / 1000, ease: globalEase, kino: K.getState() };
    const ex = track.keyframes.findIndex(k => Math.abs(k.time - kf.time) < 0.005);
    if (ex >= 0) track.keyframes[ex] = kf;
    else { track.keyframes.push(kf); track.keyframes.sort((a, b) => a.time - b.time); }
    render();
    clog(`🎬◆ Kino KF: t=${kf.time.toFixed(2)}s — ${kf.kino.enabled ? 'YOQIQ' : 'o\'chiq'}`, 'ok');
  }

  // ════════════════════════════════════════════════════════════
  //  YANGI KEYLAR: Dual (cut/teleport) · Zoom (FOV) · Weather
  // ════════════════════════════════════════════════════════════

  // ── DUAL / CUT key — silliq emas, teleport (A→B sakrash) ─────
  function tlAddDualKeyframe() {
    if (filterTrackActive) { clog('⚠ Dual key obyekt uchun — filtr rejimini o\'chiring', 'w'); return; }
    const obj = getSelectedObj();
    if (!obj) { clog('⚠ Dual key uchun obyekt tanlang', 'w'); return; }
    const track = getOrCreateTrack(obj);
    if (!track) return;                 // ⛔ zamin — trek berilmadi
    const st = captureState(obj);
    const kf = Object.assign({ time: Math.round(currentTime*1000)/1000, ease: globalEase, tangent: 'auto', cut: true }, st);
    const ex = track.keyframes.findIndex(k => k.pos && Math.abs(k.time - kf.time) < 0.005);
    if (ex >= 0) track.keyframes[ex] = kf;
    else { track.keyframes.push(kf); track.keyframes.sort((a,b)=>a.time-b.time); }
    render();
    clog(`⧉ Dual (cut) KF: "${track.objName}" t=${kf.time.toFixed(2)}s — teleport / burchak kesish`, 'ok');
  }

  // == PC BLOK va CANVAS - key qo'shish =========================
  function _pcSel() {
    const o = (typeof selectedObj !== 'undefined') ? selectedObj : null;
    return (o && o.userData && o.userData.isPCBlock) ? o : null;
  }
  function _getTrack(find, make) {
    let t = tracks.find(find);
    if (!t) { t = make(); tracks.push(t); }
    return t;
  }

  /**
   * 💻📷 PC ekranidagi KAMERA manbaini key qilib yozadi.
   * ⚠ Ish tartibi obyekt treklari bilan bir xil: PC ni tanla,
   *   kamerani tanla, vaqtni qo'y, tugmani bos.
   */
  function tlAddPCCamKeyframe() {
    const pc = _pcSel();
    if (!pc) { clog('⚠ Avval 💻 PC blokni tanlang', 'w'); return; }
    const ud = pc.userData;
    const track = _getTrack(x => x.isPCCam && x.pcId === ud.id,
      () => ({ isPCCam: true, pcId: ud.id, objId: '__pccam__' + ud.id,
               objName: '💻📷 ' + (ud.name || 'PC'), objRef: null, keyframes: [] }));
    _pushKF(track, { camSource: ud.camSource ?? null });
    clog(`💻📷 kamera keyi: "${ud.name}" → ${ud.camSource ?? 'yo\'q'}`, 'ok');
  }

  /** 💻🎛 PC EKRANINING filtrini key qilib yozadi. */
  function tlAddPCFxKeyframe() {
    const pc = _pcSel();
    if (!pc) { clog('⚠ Avval 💻 PC blokni tanlang', 'w'); return; }
    const ud = pc.userData;
    const fx = ud.screenFx || {};
    const track = _getTrack(x => x.isPCFx && x.pcId === ud.id,
      () => ({ isPCFx: true, pcId: ud.id, objId: '__pcfx__' + ud.id,
               objName: '💻🎛 ' + (ud.name || 'PC'), objRef: null, keyframes: [] }));
    const d = { grayscale: 0, sepia: 0, invert: 0, contrast: 1,
                brightness: 1, saturation: 1, blur: 0, hue: 0 };
    const kf = {};
    for (const k of _FX_KEYS) kf[k] = isFinite(+fx[k]) ? +fx[k] : d[k];
    _pushKF(track, kf);
    clog(`💻🎛 filtr keyi: "${ud.name}"`, 'ok');
  }

  /**
   * 🎨 CANVAS oynasining joylashuvini key qilib yozadi.
   * ⚠ Burchak `free` ga o'tkaziladi: tayyor burchakda qolsa X/Y
   *   e'tiborsiz bo'lib, harakat umuman ko'rinmasdi.
   */
  /**
   * ⋯ Ko'proq menyusini ochadi/yopadi.
   * ⚠ Tashqariga bosilsa YOPILADI: ochiq qolgan menyu timeline
   *   yo'lakchasini to'sib turardi va dizayner keyframe'ni
   *   bosolmasdi.
   */
  function tlToggleMore() {
    if (typeof document === 'undefined') return;
    const m = document.getElementById('tl-more-menu');
    const b = document.getElementById('tl-more-btn');
    if (!m || !b) return;
    const open = m.style.display !== 'none' && m.style.display !== '';
    // ============================================================
    //  ⚠ MENYU `document.body` GA KO'CHIRILADI
    // ------------------------------------------------------------
    //  XATO BOR EDI: menyu timeline panelining ICHIDA edi, panelda
    //  esa `overflow:hidden` turibdi (409-qator). Natijada menyu
    //  panel chegarasida KESILARDI — ochilardi, lekin pastda qolib
    //  ketardi va tugmalari ko'rinmasdi.
    //
    //  `z-index` ni oshirish YORDAM BERMASDI: `overflow:hidden`
    //  qatlam tartibiga emas, KESISHGA ta'sir qiladi. Yagona yechim
    //  — elementni o'sha idishdan chiqarish.
    //
    //  ⚠ Joylashuv har ochilishda QAYTA hisoblanadi: panel
    //    o'lchami o'zgarishi mumkin (ekran kichraysa, panel
    //    sudralsa) va bir marta hisoblasak menyu noto'g'ri joyda
    //    ochilardi.
    if (m.parentElement !== document.body) document.body.appendChild(m);
    m.style.position = 'fixed';
    m.style.zIndex = '9999';
    if (!open) {
      const r = b.getBoundingClientRect();
      m.style.left = r.left + 'px';
      //  ⚠ Menyu tugmaning USTIDA ochiladi (timeline ekran pastida).
      //    Pastga ochsak ekrandan chiqib ketardi.
      m.style.top = 'auto';
      m.style.bottom = (window.innerHeight - r.top + 5) + 'px';
    }
    m.style.display = open ? 'none' : 'flex';
    if (!open) {
      const off = (e) => {
        if (e.target.closest && e.target.closest('#tl-more-menu, #tl-more-btn')) return;
        m.style.display = 'none';
        document.removeEventListener('mousedown', off, true);
      };
      //  ⚠ Keyingi kadrda ulaymiz: shu bosish hodisasining o'zi
      //    menyuni darhol yopib qo'ymasin.
      setTimeout(() => document.addEventListener('mousedown', off, true), 0);
    }
  }

  /** Umumiy: keyni qo'yadi yoki o'sha vaqtdagisini almashtiradi. */
  function _pushKF(track, data) {
    const kf = Object.assign({ time: Math.round(currentTime * 1000) / 1000,
                               ease: globalEase }, data);
    const ex = track.keyframes.findIndex(x => Math.abs(x.time - kf.time) < 0.005);
    if (ex >= 0) track.keyframes[ex] = kf;
    else { track.keyframes.push(kf); track.keyframes.sort((a, b) => a.time - b.time); }
    render();
  }

  // ── ⌨🖥 KL_M — ekran tugmalari animatsiyasi ─────────────
  //  ⚠ HAR TUGMAGA ALOHIDA trek. Bitta umumiy trekka solsak har key
  //    bir vaqtda HAMMA tugmaga tegardi — W ni surib, D ni joyida
  //    qoldirish mumkin bo'lmasdi.

  // ── ZOOM key — kamera FOV yozib oladi va silliq interpolatsiya ─
  function getOrCreateZoomTrack() {
    let t = tracks.find(x => x.isZoom);
    if (!t) { t = { isZoom: true, objId: ZOOM_ID, objName: '🔎 Zoom', objRef: null, keyframes: [] }; tracks.push(t); }
    return t;
  }
  function tlAddZoomKeyframe() {
    if (typeof camera === 'undefined' || !camera) { clog('⚠ Kamera topilmadi', 'w'); return; }
    const track = getOrCreateZoomTrack();
    const kf = { time: Math.round(currentTime*1000)/1000, ease: globalEase, fov: camera.fov };
    const ex = track.keyframes.findIndex(k => Math.abs(k.time - kf.time) < 0.005);
    if (ex >= 0) track.keyframes[ex] = kf;
    else { track.keyframes.push(kf); track.keyframes.sort((a,b)=>a.time-b.time); }
    render();
    clog(`🔎 Zoom KF: FOV ${Math.round(kf.fov)}° t=${kf.time.toFixed(2)}s`, 'ok');
  }

  // ── WEATHER key — tun/kun, yomg'ir, bo'ron, tuman ────────────
  function getOrCreateWeatherTrack() {
    let t = tracks.find(x => x.isWeather);
    if (!t) { t = { isWeather: true, objId: WEATHER_ID, objName: '🌦 Weather', objRef: null, keyframes: [] }; tracks.push(t); }
    return t;
  }
  const WEATHER_PRESETS = ['clear','rain','storm','fog','night','day'];

  // ── Atmosfera holatini o'qish/qo'llash/interpolatsiya ────────
  function _hexLerp(h1, h2, al) {
    const p = h => { h = (h || '#000000').replace('#',''); if (h.length===3) h = h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; };
    const c1 = p(h1), c2 = p(h2);
    const r = Math.round(c1[0]+(c2[0]-c1[0])*al), g = Math.round(c1[1]+(c2[1]-c1[1])*al), b = Math.round(c1[2]+(c2[2]-c1[2])*al);
    return '#' + [r,g,b].map(x => Math.max(0,Math.min(255,x)).toString(16).padStart(2,'0')).join('');
  }
  function _captureAtmo() {
    const RS = (typeof RainSystem !== 'undefined') ? RainSystem : null;
    const cfg = RS ? RS._cfg : {};
    const rainOn = RS ? RS.active : false;
    let fogDensity = 0, fogColor = '#8899aa';
    if (typeof scene !== 'undefined' && scene && scene.fog) {
      fogColor = '#' + scene.fog.color.getHexString();
      if (scene.fog.isFogExp2) fogDensity = scene.fog.density;
      else if (typeof scene.fog.far === 'number') fogDensity = Math.min(0.15, 1/Math.max(1, scene.fog.far));
    }
    return {
      // Yomg'ir O'CHIQ bo'lsa samarali intensivlik = 0 (rainToggle _cfg'ni 0 qilmaydi).
      // Shu bois interpolatsiyada yomg'ir to'g'ri so'nadi/to'xtaydi.
      intensity: rainOn ? (cfg.intensity ?? 0) : 0,
      speed: cfg.speed ?? 18, wind: cfg.wind ?? 0.3,
      size: cfg.size ?? 0.07, opacity: cfg.opacity ?? 0.55, rainColor: cfg.color ?? '#aaccdd',
      fogDensity, fogColor,
    };
  }
  function _applyAtmo(a) {
    if (!a) return;
    const RS = (typeof RainSystem !== 'undefined') ? RainSystem : null;
    if (RS) {
      RS._cfg.intensity = a.intensity; RS._cfg.speed = a.speed; RS._cfg.wind = a.wind;
      RS._cfg.size = a.size; RS._cfg.opacity = a.opacity; if (a.rainColor) RS._cfg.color = a.rainColor;
      if (a.intensity > 0.001) { if (!RS.active) RS.start(); }
      else if (RS.active) RS.stop();
    }
    if (typeof scene !== 'undefined' && scene && typeof THREE !== 'undefined') {
      if (a.fogDensity > 0.0008) {
        if (scene.fog && scene.fog.isFogExp2) { scene.fog.density = a.fogDensity; scene.fog.color.set(a.fogColor); }
        else scene.fog = new THREE.FogExp2(a.fogColor, a.fogDensity);
      } else scene.fog = null;
    }
  }
  function _lerpAtmo(a, b, al) {
    const L = (x,y) => x + (y-x)*al;
    return {
      intensity: L(a.intensity,b.intensity), speed: L(a.speed,b.speed), wind: L(a.wind,b.wind),
      size: L(a.size,b.size), opacity: L(a.opacity,b.opacity), rainColor: _hexLerp(a.rainColor,b.rainColor,al),
      fogDensity: L(a.fogDensity,b.fogDensity), fogColor: _hexLerp(a.fogColor,b.fogColor,al),
    };
  }

  // ── 🌌 Skybox treki ─────────────────────────────────────────
  function getOrCreateSkyboxTrack() {
    let t = tracks.find(x => x.isSkybox);
    if (!t) { t = { isSkybox: true, objId: SKYBOX_ID, objName: '🌌 Skybox', objRef: null, keyframes: [] }; tracks.push(t); }
    return t;
  }
  function addSkyboxKey() {
    const S = window.SkyboxSystem;
    if (!S) { clog('⚠ Skybox tizimi topilmadi', 'warn'); return; }
    const track = getOrCreateSkyboxTrack();
    const kf = { time: Math.round(currentTime*1000)/1000, ease: globalEase, sky: S.capture() };
    const ex = track.keyframes.findIndex(k => k.sky && Math.abs(k.time - kf.time) < 0.005);
    if (ex >= 0) track.keyframes[ex] = kf;
    else { track.keyframes.push(kf); track.keyframes.sort((a,b)=>a.time-b.time); }
    render();
    clog(`🌌 Skybox KF (silliq): t=${kf.time.toFixed(2)}s · ${kf.sky.color}`, 'ok');
  }

  function _addWeatherKey(preset) {
    if (preset && preset !== 'current') _applyWeatherPreset(preset);  // preset atmosferani o'rnatadi
    const track = getOrCreateWeatherTrack();
    const kf = { time: Math.round(currentTime*1000)/1000, ease: globalEase, atmo: _captureAtmo() };
    const ex = track.keyframes.findIndex(k => k.atmo && Math.abs(k.time - kf.time) < 0.005);
    if (ex >= 0) track.keyframes[ex] = kf;
    else { track.keyframes.push(kf); track.keyframes.sort((a,b)=>a.time-b.time); }
    render();
    clog(`🌦 Weather KF (silliq): t=${kf.time.toFixed(2)}s`, 'ok');
  }
  function tlAddWeatherKeyframe() {
    let pop = $('tl-weather-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'tl-weather-pop';
      pop.style.cssText = 'position:fixed;z-index:9999;background:var(--panel);border:1px solid var(--accent2);border-radius:5px;padding:8px;display:flex;flex-wrap:wrap;gap:4px;max-width:220px;box-shadow:0 4px 14px rgba(0,0,0,.7)';
      const cur = document.createElement('button');
      cur.textContent = '📸 Hozirgi holat'; cur.title = 'Ayni ob-havo/tuman/yomg\'ir sozlamalarini yozib oladi';
      cur.style.cssText = 'flex:1 0 100%;font-size:9px;padding:5px 7px;background:rgba(var(--accent-rgb),.12);border:1px solid var(--accent);color:var(--accent);border-radius:3px;cursor:pointer;font-family:monospace;font-weight:700';
      cur.onclick = () => { _addWeatherKey('current'); pop.style.display = 'none'; };
      pop.appendChild(cur);
      const labels = { clear:'☀️ Ochiq', rain:'🌧 Yomg\'ir', storm:'⛈ Bo\'ron', fog:'🌫 Tuman', night:'🌙 Tun', day:'🌤 Kun' };
      WEATHER_PRESETS.forEach(p => {
        const b = document.createElement('button');
        b.textContent = labels[p] || p;
        b.style.cssText = 'font-size:9px;padding:5px 7px;background:rgba(255,107,53,.1);border:1px solid var(--border);color:var(--text);border-radius:3px;cursor:pointer;font-family:monospace';
        b.onclick = () => { _addWeatherKey(p); pop.style.display = 'none'; };
        pop.appendChild(b);
      });
      const close = document.createElement('button');
      close.textContent = '✕'; close.style.cssText = 'font-size:9px;padding:5px 7px;background:none;border:1px solid var(--border);color:var(--muted);border-radius:3px;cursor:pointer';
      close.onclick = () => { pop.style.display = 'none'; };
      pop.appendChild(close);
      document.body.appendChild(pop);
    }
    pop.style.display = 'flex'; pop.style.left = '240px'; pop.style.top = '120px';
  }
  function _applyWeatherPreset(preset) {
    try {
      const RS = (typeof RainSystem !== 'undefined') ? RainSystem : null;
      const rainOff = () => { if (RS && RS.active && RS.stop) RS.stop(); };
      const rainOn  = () => { if (RS && RS.start) RS.start(); };
      if (preset === 'clear' || preset === 'day') {
        rainOff();
        if (typeof scene !== 'undefined' && scene) scene.fog = null;
      } else if (preset === 'rain')  { if (window.rainPreset) rainPreset('rain'); rainOn(); }
      else if (preset === 'storm')   { if (window.fogPreset) fogPreset('storm'); rainOn(); }
      else if (preset === 'fog')     { if (window.fogPreset) fogPreset('heavy'); }
      else if (preset === 'night')   { if (window.fogPreset) fogPreset('night'); }
    } catch (e) {}
  }

  // Tuman panelidan chaqiriladi — ob-havo trekini qo'shib "rejim"ni yoqadi
  function addWeatherToTimeline() {
    getOrCreateWeatherTrack();
    weatherTrackActive = true;
    filterTrackActive = false;
    _rememberSelection();
    if (typeof window.switchBottomTab === 'function') { try { window.switchBottomTab('timeline'); } catch (e) {} }
    const tp = $('timeline-panel');
    if (tp) { tp.style.display = 'flex'; tp.classList.add('tl-visible'); }
    render();
    clog('🌦 Ob-havo treki qo\'shildi — atmosferani sozlab, kursorni joyga qo\'ying va I bosing', 'ok');
    clog('   Obyektga key kerak bo\'lsa — shunchaki obyektni tanlang, rejim o\'zi o\'chadi', 'i');
  }

  // ── Blok tanlash rejimi (hitbox import-animatsiya bloklari uchun) ──
  function startBlockPick(keyframes, blocks, onPick) {
    tracks = tracks.filter(t => !t.isBlockPick);
    const track = {
      isBlockPick: true, objId: '__blockpick__', objName: '🔒 Blok tanlash', objRef: null,
      keyframes: (keyframes || []).slice().sort((a,b)=>(a.time||0)-(b.time||0)),
      _blocks: blocks || [],
      _onPick: onPick,
    };
    tracks.push(track);
    if (typeof window.switchBottomTab === 'function') { try { window.switchBottomTab('timeline'); } catch (e) {} }
    const tp = $('timeline-panel');
    if (tp) { tp.style.display = 'flex'; tp.classList.add('tl-visible'); }
    // davomiylikni keyframe'larga moslash
    if (track.keyframes.length) {
      const end = track.keyframes[track.keyframes.length-1].time || 0;
      if (end > duration) { duration = Math.ceil(end); const di = $('tl-dur-inp'); if (di) di.value = duration; }
    }
    render();
    clog('🔒 Blok tanlash: keyframe\'ni bosing (qizil = blok). Qayta bosib o\'chiriladi.', 'ok');
  }
  function stopBlockPick() {
    tracks = tracks.filter(t => !t.isBlockPick);
    render();
  }

  // ════════════════════════════════════════════════════════════
  //  🎨 / 🌦 MAXSUS REJIMLAR VA ULARDAN CHIQISH
  // ------------------------------------------------------------
  //  ⚠ ALOMAT: "Atmosfera → tuman → ⏱ Timelinega qo'shish" bosilib
  //    key qo'yilgach, boshqa OBYEKTGA key qo'yib bo'lmay qoladi —
  //    `I` doim ob-havo keyini qo'yaveradi. Filtrda ham xuddi shu.
  //
  //  ⚠ SABAB: `weatherTrackActive` / `filterTrackActive` — YOPISHQOQ
  //    global bayroqlar. `⏱` tugmasi ularni YOQADI, lekin hech narsa
  //    o'chirmaydi. `tlAddKeyframe()` esa eng boshida shu bayroqlarni
  //    tekshirib, tanlangan obyektga umuman yetib bormaydi.
  //
  //    Eng yomoni — chiqish yo'li AMALDA YO'Q edi: rejimni faqat
  //    timeline'dagi trek yorlig'ini bosib o'chirish mumkin, lekin
  //    sahnada hali birorta obyekt treki bo'lmasa, bosadigan yorliq
  //    ham yo'q. Foydalanuvchi qopqonda qolardi.
  //
  //  YECHIM: rejim TANLOVGA bog'lanadi. Obyekt tanlangan zahoti
  //    maxsus rejim o'chadi — chunki "obyektni tanlab I bosish"
  //    aniq bir narsani anglatadi: shu obyektga key kerak.
  //    Ob-havo/filtr keyi yana kerak bo'lsa — trek yorlig'ini yoki
  //    ⏱ tugmasini qayta bosish kifoya.
  // ════════════════════════════════════════════════════════════
  function _exitSpecialModes(silent) {
    if (!filterTrackActive && !weatherTrackActive && !kinoTrackActive) return false;
    const was = filterTrackActive ? '🎨 Filtr' : weatherTrackActive ? '🌦 Ob-havo' : '🎬 Kino';
    filterTrackActive = false;
    weatherTrackActive = false;
    kinoTrackActive = false;
    render();
    if (!silent) clog(`${was} rejimi o'chdi — I endi tanlangan obyektga key qo'yadi`, 'ok');
    return true;
  }

  // Rejim yoqilgan paytdagi tanlov. Undan boshqasi tanlansa — chiqamiz.
  let _modeSelAtStart = null;
  function _rememberSelection() {
    _modeSelAtStart = (typeof selectedObj !== 'undefined') ? selectedObj : null;
  }
  /** Tanlov o'zgargan bo'lsa maxsus rejimdan chiqadi. */
  function _syncModeWithSelection() {
    if (!filterTrackActive && !weatherTrackActive && !kinoTrackActive) return;
    const cur = (typeof selectedObj !== 'undefined') ? selectedObj : null;
    if (cur && cur !== _modeSelAtStart) _exitSpecialModes();
  }

  // `selectObject` ni o'raymiz — rejim yorlig'i darrov yangilansin.
  // ⚠ `init()` ichidan chaqiriladi: o'shanda barcha skriptlar yuklangan
  //   bo'ladi va `window.selectObject` albatta mavjud.
  let _selHooked = false;
  function _hookSelection() {
    if (_selHooked || typeof window.selectObject !== 'function') return;
    _selHooked = true;
    const orig = window.selectObject;
    window.selectObject = function (obj) {
      if (obj && (filterTrackActive || weatherTrackActive || kinoTrackActive)) _exitSpecialModes();
      return orig.apply(this, arguments);
    };
  }

  function tlAddKeyframe() {
    // ⚠ Zaxira tekshiruv: `selectObject` o'ralmagan bo'lsa ham
    //   (boshqa yo'l bilan tanlangan bo'lsa) qopqonda qolmaymiz.
    _syncModeWithSelection();
    // 🎬 Kino rejimi yoniq bo'lsa — kino kamera keyframe
    if (kinoTrackActive) { tlAddKinoKeyframe(); return; }
    // Ob-havo rejimi yoniq bo'lsa — atmosfera keyframe
    if (weatherTrackActive) { _addWeatherKey('current'); return; }
    // Filtr rejimi yoniq bo'lsa — filtr keyframe qo'yamiz
    if (filterTrackActive) { tlAddFilterKeyframe(); return; }
    getSelectedObj._debugged = false;
    const obj = getSelectedObj();
    if (!obj) return;
    const track = getOrCreateTrack(obj);
    if (!track) return;                 // ⛔ zamin — trek berilmadi
    _tlPushUndo('KF qo\'shildi');
    const state = {
      time: Math.round(currentTime*1000)/1000,
      ease: globalEase, tangent:'auto',
      ...captureState(obj)
    };
    const ex = track.keyframes.findIndex(k => Math.abs(k.time-state.time) < 0.005);
    if (ex >= 0) { track.keyframes[ex] = state; }
    else { track.keyframes.push(state); track.keyframes.sort((a,b)=>a.time-b.time); }
    _fitDuration();
    render();
    clog(`◆ KF qo'shildi: "${track.objName}"  t=${state.time.toFixed(2)}s`, 'ok');
  }

  function tlAddVisKeyframe() {
    const obj = getSelectedObj();
    if (!obj) return;
    const track = getOrCreateTrack(obj);
    if (!track) return;                 // ⛔ zamin — trek berilmadi
    const state = { time: Math.round(currentTime*1000)/1000, vis: obj.visible?1:0, ease: globalEase };
    const ex = track.keyframes.findIndex(k => Math.abs(k.time-state.time)<0.005 && k.vis!==undefined && !k.pos);
    if (ex>=0) track.keyframes[ex]=state;
    else { track.keyframes.push(state); track.keyframes.sort((a,b)=>a.time-b.time); }
    render();
    clog(`👁 VIS KF: "${track.objName}"  t=${state.time.toFixed(2)}s`, 'ok');
  }

  function _soundNames() {
    if (typeof SoundSystem !== 'undefined' && SoundSystem.library) return Object.keys(SoundSystem.library);
    return ['impact','boom','whoosh','click','beep','coin','jump','land','hurt','powerup','shoot','step','door','explosion','wind','rain'];
  }

  function _populateSndSelect(sel) {
    const el = $('sp-sound'); if (!el) return;
    const names = _soundNames();
    el.innerHTML = names.map(n => `<option value="${n}"${n===sel?' selected':''}>${n}</option>`).join('');
  }

  function tlAddSoundKeyframe() {
    // Ovoz keyframe tanlangan obyekt trekiga qo'yiladi (transform kabi obyekt kerak)
    const obj = getSelectedObj();
    if (!obj) { clog('⚠ Ovoz KF uchun avval obyekt tanlang', 'w'); return; }
    const track = getOrCreateTrack(obj);
    if (!track) return;                 // ⛔ zamin — trek berilmadi
    _sndEdit = { track, ki: -1 };   // -1 = yangi
    _populateSndSelect('impact');
    const vEl = $('sp-volume'), vl = $('sp-vol-lbl'), spE = $('sp-spatial');
    if (vEl) vEl.value = 1;
    if (vl)  vl.textContent = '1.0';
    if (spE) spE.checked = true;
    const sp = $('tl-snd-popup');
    if (sp) { sp.style.display = 'block'; sp.style.left = '240px'; sp.style.top = '120px'; }
  }

  function tlSndKfPreview() {
    const name = $('sp-sound') ? $('sp-sound').value : null;
    if (!name) return;
    if (typeof SoundSystem !== 'undefined' && SoundSystem.play) {
      try { SoundSystem.play(name, null, { volume: parseFloat($('sp-volume')?.value) || 1 }); } catch (e) {}
    }
  }

  function tlSndKfSave() {
    if (!_sndEdit || !_sndEdit.track) { const sp = $('tl-snd-popup'); if (sp) sp.style.display='none'; return; }
    const track = _sndEdit.track;
    const kf = {
      time:    Math.round(currentTime*1000)/1000,
      sound:   $('sp-sound') ? $('sp-sound').value : 'impact',
      volume:  parseFloat($('sp-volume')?.value) || 1,
      spatial: $('sp-spatial') ? !!$('sp-spatial').checked : true,
      ease:    globalEase,
    };
    if (_sndEdit.ki >= 0 && track.keyframes[_sndEdit.ki]) {
      kf.time = track.keyframes[_sndEdit.ki].time;   // mavjudni tahrirlaganda vaqtni saqlaymiz
      track.keyframes[_sndEdit.ki] = kf;
    } else {
      const ex = track.keyframes.findIndex(k => k.sound !== undefined && Math.abs(k.time - kf.time) < 0.005);
      if (ex >= 0) track.keyframes[ex] = kf;
      else { track.keyframes.push(kf); track.keyframes.sort((a,b)=>a.time-b.time); }
    }
    _sndEdit = null;
    const sp = $('tl-snd-popup'); if (sp) sp.style.display = 'none';
    render();
    clog(`♪ Ovoz KF: "${kf.sound}"  t=${kf.time.toFixed(2)}s`, 'ok');
  }

  function tlSndKfDelete() {
    const sp = $('tl-snd-popup'); if (sp) sp.style.display = 'none';
    if (_sndEdit && _sndEdit.ki >= 0 && _sndEdit.track) {
      _sndEdit.track.keyframes.splice(_sndEdit.ki, 1);
      render();
      clog('✕ Ovoz KF o\'chirildi', 'ok');
    }
    _sndEdit = null;
  }

  // Play/scrub paytida sound keyframe'larni "cross" bo'lganda ijro etish
  function _fireSoundKeyframes(prevT, curT) {
    if (curT < prevT) prevT = -1;   // loop/qaytish — hammasini qayta
    tracks.forEach(tr => {
      (tr.keyframes || []).forEach(kf => {
        if (kf.sound !== undefined && kf.time > prevT && kf.time <= curT) {
          if (typeof SoundSystem !== 'undefined' && SoundSystem.play) {
            try { SoundSystem.play(kf.sound, kf.spatial ? (tr.objRef || null) : null, { volume: kf.volume ?? 1 }); } catch (e) {}
          }
        }
      });
    });
  }

  function tlDeleteKeyframe() {
    if (!selectedKf) { clog('⚠ Biror keyframeni bosib tanlang!','w'); return; }
    const { trackIdx:ti, kfIdx:ki } = selectedKf;
    const track = tracks[ti];
    if (!track) return;
    _tlPushUndo('key o\'chirildi');
    track.keyframes.splice(ki,1);
    if (!track.keyframes.length) tracks.splice(ti,1);
    selectedKf = null;
    _fitDuration();
    render();
    clog('✕ Keyframe o\'chirildi','ok');
  }

  function tlDuplicateKeyframe() {
    if (!selectedKf) { clog('⚠ KF tanlanmagan!','w'); return; }
    const {trackIdx:ti, kfIdx:ki} = selectedKf;
    const track = tracks[ti];
    if (!track) return;
    _tlPushUndo('key nusxalandi');
    const newKf = {...track.keyframes[ki], time: track.keyframes[ki].time+0.25};
    track.keyframes.push(newKf);
    track.keyframes.sort((a,b)=>a.time-b.time);
    _fitDuration();
    selectedKf = {trackIdx:ti, kfIdx:track.keyframes.indexOf(newKf)};
    render();
    clog('⧉ Keyframe nusxalandi','ok');
  }

  function tlDuplicateTrack() {
    if (selectedKf===null) { clog('⚠ Track KF\'ini tanlang!','w'); return; }
    const obj = getSelectedObj();
    if (!obj) return;
    const src = tracks[selectedKf.trackIdx];
    if (!src) return;
    const newTrack = {
      objId:     obj.userData?.id || obj.uuid,
      objName:   obj.userData?.name || obj.name || 'Obyekt',
      objRef:    obj,
      keyframes: src.keyframes.map(k=>({...k}))
    };
    const ex = tracks.findIndex(t=>t.objId===newTrack.objId || t.objRef===obj);
    if (ex>=0) tracks[ex]=newTrack; else tracks.push(newTrack);
    render();
    clog(`⧉ Track nusxalandi → "${newTrack.objName}"`, 'ok');
  }

  function tlToggleCutMode() {
    cutMode = !cutMode;
    cutStart = cutEnd = null;
    const btn = $('tl-cut-btn');
    if (btn) btn.classList.toggle('active', cutMode);
    const cr = $('tl-cut-range'); if (cr) cr.style.display = 'none';
    clog(cutMode ? '✂ Kesish rejimi YONIQ — scrubber\'da 2 nuqta bosing (diapazon o\'chadi)' : '✂ Kesish rejimi o\'chirildi', 'ok');
  }

  function tlToggleLoop() {
    loopMode = !loopMode;
    const btn = $('tl-loop-btn');
    if (btn) btn.classList.toggle('active', loopMode);
    clog(loopMode ? '🔁 Loop YOQILDI' : '🔁 Loop o\'chirildi', 'ok');
  }

  function tlSetGlobalEase(val) { globalEase = val; }

  function tlSetDuration(sec) {
    const v = parseFloat(sec);
    if (isNaN(v)||v<=0) return;
    duration = v;
    const inp = $('tl-dur-inp');
    if (inp) inp.value = duration;
    if (currentTime > duration) currentTime = duration;
    render();
  }

  function tlSetKfEase(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.ease=val; render(); }
  }

  function tlSetKfTangent(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.tangent=val; render(); }
  }

  function tlSetKfVis(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.vis=parseInt(val,10); render(); }
  }

  function tlExportJSON() {
    if (!tracks.length) { clog('⚠ Timeline bo\'sh!','w'); return; }
    const exportData = {
      version: 1,
      duration,
      tracks: tracks.map(t => ({
        objId:     t.objId,
        objName:   t.objName,
        keyframes: t.keyframes
      }))
    };
    const blob = new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),{href:url,download:'apex3d_timeline.json'});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clog('⬇ Timeline JSON yuklandi','ok');
  }

  function tlImportJSON(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data.duration==='number') duration = data.duration;
        if (Array.isArray(data.tracks)) {
          tracks = data.tracks.map(t => ({
            ...t,
            // objId topilmasa — NOM bo'yicha moslash (tashqi/Blender JSON uchun)
            objRef: getObjById(t.objId)
                 || (typeof objects !== 'undefined' && objects.find(o => o.userData && o.userData.name === t.objName))
                 || null
          }));
          tracks.forEach(t => { if (t.objRef && t.objRef.userData) t.objId = t.objRef.userData.id; });
        }
        const inp = $('tl-dur-inp');
        if (inp) inp.value = duration;
        selectedKf = null;
        render();
        clog(`⬆ Import: ${tracks.length} track, ${duration}s`, 'ok');
      } catch(err) { clog('✕ Import xatosi: '+err.message,'e'); }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    _hookSelection();
    patchCSS();
    patchSwitchBottomTab();
    initScrubber();
    initKeyboardShortcuts();

    Object.assign(window, {
      tlPlay, tlStop, tlSeek,
      tlAddKeyframe, tlAddVisKeyframe, tlAddSoundKeyframe,
      // 💻 PC blok · 🎨 canvas treklari
      tlAddPCCamKeyframe, tlAddPCFxKeyframe,
      tlToggleMore,
      tlDeleteKeyframe, tlDuplicateKeyframe, tlDuplicateTrack,
      tlToggleCutMode, tlToggleLoop, tlSetGlobalEase, tlSetDuration,
      tlSetKfEase, tlSetKfTangent, tlSetKfVis,
      tlExportJSON, tlImportJSON,
      tlAddFilterToTimeline: addFilterToTimeline,
      tlAddWeatherToTimeline: addWeatherToTimeline,
      tlAddFilterKeyframe,
      tlSndKfSave, tlSndKfPreview, tlSndKfDelete,
      tlAddDualKeyframe,
      tlCopyKeyframe, tlCutKeyframe, tlPasteKeyframe, tlClearAll,
      tlUndo, tlRedo
    });

    render();
    clog('⏱ Timeline v2.2 ishga tushdi  |  I = KF qo\'shish  |  Shift+I = VIS KF  |  Del = KF o\'chirish', 'ok');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  // ============================================================
  //  💾 SERIALIZE / RESTORE
  //
  //  ⚠ NEGA BU YERDA: ilgari save-load.js timeline'ni O'ZI yig'ardi va
  //    `tlTracks` degan GLOBAL obyektdan o'qirdi. Lekin `tlTracks`
  //    LOYIHADA UMUMAN E'LON QILINMAGAN — haqiqiy ma'lumot shu IIFE
  //    ichidagi `tracks` massivida turadi. Har bir chaqiruv
  //    `typeof tlTracks !== 'undefined' ? tlTracks : {}` bilan
  //    himoyalangani uchun xato ham chiqmasdi: saqlashda hamisha
  //    BO'SH massiv yozilardi, yuklashda shart hech qachon bajarilmasdi.
  //    Ya'ni timeline HECH QACHON saqlanmagan.
  //
  //  Endi format modulning O'ZIDA. Keyframega yangi maydon qo'shilsa
  //  (yangi effekt, yangi trek turi) — bu yerni tahrirlash SHART EMAS:
  //  keyframe butunligicha ko'chiriladi.
  // ============================================================
  function serialize() {
    return {
      version:  2,
      duration,
      loopMode,
      tracks: tracks.map(t => ({
        objId:     t.objId,
        objName:   t.objName,
        isFilter:  !!t.isFilter,
        isZoom:    !!t.isZoom,
        isWeather: !!t.isWeather,
        // ⚠ `isSkybox` SHU YERDA BO'LISHI SHART. Bayroqlar birma-bir
        //   sanalgani uchun yangisi qo'shilganda jimgina yo'qolardi:
        //   sahnani saqlab qayta yuklasangiz trek "skybox" ekanini
        //   UNUTARDI va `interpolateTrack` uni tanimay qolardi.
        //   Alomat: yangi qurilgan trek ishlaydi, saqlangani — yo'q.
        isSkybox:  !!t.isSkybox,
        isKino:    !!t.isKino,

        //    Faqat bayroqni saqlasak trek \"qaysi tugma?\" degan
        //    savolga javobsiz qolib, yuklashda tashlab yuborilardi.
        // 💻 PC blok · 🎨 canvas
        //  ⚠ `pcId` bayroq bilan BIRGA: u trekni PC ga
        //    bog'laydi. Faqat bayroqni saqlasak trek \"qaysi PC?\"
        //    degan savolga javobsiz qolib, yuklashda tashlanardi.
        isPCCam:   !!t.isPCCam,
        isPCFx:    !!t.isPCFx,
        pcId:      t.pcId,
        loop:      !!t.loop,
        // ⚠ Keyframe BUTUNLIGICHA — pos/rot/scale/vis/fov/sound/volume/
        //   spatial/txt/filter/weather/atmo/pcMode/ease/tangent/cut ...
        //   Maydonlarni sanab chiqsak, yangisi qo'shilganda jimgina
        //   yo'qolardi. Aynan shu xato eski kodda bor edi.
        keyframes: JSON.parse(JSON.stringify(t.keyframes || [])),
      })),
    };
  }

  /**
   * @param {object} data     serialize() chiqargan obyekt
   * @param {Map}    idMap    eski obyekt id → yangi id (save-load beradi)
   * @returns {number}        tiklangan keyframe soni
   */
  function restore(data, idMap) {
    if (!data) return 0;
    // Eski format (v1): { duration, tracks:[{objId, objName, keyframes, visKeyframes}] }
    const list = Array.isArray(data.tracks) ? data.tracks : [];
    tracks.length = 0;

    const _remap = id => {
      if (!idMap) return id;
      const k = String(id);
      if (typeof idMap.get === 'function' && idMap.has(k)) return idMap.get(k);
      if (idMap[k] !== undefined) return idMap[k];
      return id;
    };
    const _find = id => (typeof objects !== 'undefined' && objects)
      ? objects.find(o => o.userData && String(o.userData.id) === String(id)) || null
      : null;

    let kfCount = 0;
    for (const t of list) {
      const tr = {
        objId:     t.objId,
        objName:   t.objName || 'Obyekt',
        objRef:    null,
        keyframes: Array.isArray(t.keyframes) ? t.keyframes : [],
      };
      if (t.isFilter)       { tr.isFilter  = true; tr.objId = FILTER_ID;  }
      else if (t.isZoom)    { tr.isZoom    = true; tr.objId = ZOOM_ID;    }
      else if (t.isWeather) { tr.isWeather = true; tr.objId = WEATHER_ID; }
      // ⚠ Yuklashda ham tiklanishi SHART — aks holda trek keyframelari
      //   joyida qolib, o'zi oddiy obyekt treki deb qabul qilinardi
      //   (`objRef` yo'q → jimgina tashlanardi).
      else if (t.isSkybox)  { tr.isSkybox  = true; tr.objId = SKYBOX_ID;  }
      else if (t.isKino)    { tr.isKino    = true; tr.objId = KINO_ID;    }
      else if (t.isPCCam)  { tr.isPCCam  = true; tr.pcId = t.pcId; tr.objId = '__pccam__' + t.pcId; }
      else if (t.isPCFx)   { tr.isPCFx   = true; tr.pcId = t.pcId; tr.objId = '__pcfx__'  + t.pcId; }
      else {
        // Oddiy obyekt treki — yuklashda obyekt YANGI id oladi.
        tr.objId  = _remap(t.objId);
        tr.objRef = _find(tr.objId);
        // ⚠ Zaminga tushib qolgan trekni RAD ETAMIZ. Bu eski/buzuq
        //   fayllarda bo'ladi: id mos kelmasa `_remap` eskisini
        //   qaytaradi va u yangi sahnada zaminga tegishli bo'lib
        //   qolishi mumkin (zamin birinchi yaratiladi — kichik id).
        if (tr.objRef && _isGround(tr.objRef)) {
          log(`⛔ "${tr.objName}" treki zaminga tushib qoldi — rad etildi`, 'lw');
          continue;
        }
        // ⚠ Zaxira: id mos kelmasa nom bo'yicha qidiramiz. Eski
        //   sahnalarda id xaritasi bo'lmasligi mumkin.
        if (!tr.objRef && typeof objects !== 'undefined' && objects) {
          tr.objRef = objects.find(o => o.userData && o.userData.name === tr.objName) || null;
          if (tr.objRef) tr.objId = tr.objRef.userData.id;
        }
      }
      if (t.loop) tr.loop = true;
      tracks.push(tr);
      kfCount += tr.keyframes.length;
    }

    if (data.duration) duration = data.duration;
    if (data.loopMode !== undefined) loopMode = !!data.loopMode;
    currentTime = 0;
    try { render(); } catch (e) { /* panel hali qurilmagan bo'lishi mumkin */ }
    return kfCount;
  }

  return {
    get tracks()      { return tracks;      },
    get currentTime() { return currentTime; },
    get duration()    { return duration;    },
    get isPlaying()   { return isPlaying;   },
    get loopMode()    { return loopMode;    },
    render,
    serialize,
    restore,
    getSelectedObj,
    addFilterToTimeline,
    addSkyboxKey, getOrCreateSkyboxTrack,
    // ⚠ `interpolateTrack` TASHQARIGA chiqarildi. `timeline-export.js`
    //   dagi `playTimeline()` (hitbox/tugma shu bilan ishga tushiradi)
    //   MAXSUS treklarni — 🌌 skybox, 🌦 weather, 🔎 zoom, 🎨 filter —
    //   o'zi qanday qo'llashni bilmaydi. Ular sahna obyektiga
    //   bog'lanmagan (`objRef: null`), shuning uchun u yerda jimgina
    //   tashlab yuborilardi. Endi o'sha fayl shu funksiyaga topshiradi.
    interpolateTrack,
    // ⚠ TO'LIQ `applyState` — `timeline-export.js` uchun.
    //   O'sha faylda O'Z `_applyState` i bor edi va u faqat
    //   `pos/rot/scale/vis/pcMode/pcOn` ni qo'llardi. Ya'ni 🎯 hitbox,
    //   🔘 tugma yoki 👁 qarash orqali ijro etilgan animatsiyada
    //   🎞 GIF · 🎨 material · ✨ glow · 📝 matn · 💡 chiroq · 💥 sinish
    //   keylari JIMGINA e'tiborsiz qolardi.
    //   Endi u shu funksiyaga topshiradi — yagona manba.
    applyState,
    addWeatherToTimeline,
    startBlockPick,
    stopBlockPick,
    getFilterKeyframes() { const t = tracks.find(x => x.isFilter); return t ? t.keyframes.slice() : []; },
    isFilterMode() { return filterTrackActive; },
    isWeatherMode() { return weatherTrackActive; },
    isKinoMode() { return kinoTrackActive; },
    addKinoToTimeline,
    tlAddKinoKeyframe,
    getKinoKeyframes() { const t = tracks.find(x => x.isKino); return t ? t.keyframes.slice() : []; },
    exitSpecialModes: _exitSpecialModes,
    setVar(name, obj) { window[name] = obj; }
  };
})();

window.TimelineSystem = TimelineSystem;

// Global qulaylik (ColorGrade paneli DOMContentLoaded'dan oldin bossa ham ishlashi uchun).
// init() ichida Object.assign bu funksiyani to'g'ridan-to'g'ri versiyaga almashtiradi.
if (typeof window.tlAddFilterToTimeline !== 'function') {
  window.tlAddFilterToTimeline = function() {
    if (window.TimelineSystem && TimelineSystem.addFilterToTimeline) TimelineSystem.addFilterToTimeline();
  };
}

// ── FIX: tlUpdate — main-loop.js "tlUpdate(delta)" chaqiruvi ──
// main-loop.js da bu funksiya chaqiriladi. Agar u mavjud bo'lmasa,
// butun animate() loop to'xtab qoladi (ReferenceError).
// TimelineSystem o'z ichida RAF loop bilan ishlaydi,
// shuning uchun bu yerda faqat xatolikni oldini olamiz.
// GLB mixer update main-loop.js pastida alohida qilingan —
// ikki marta qilmaslik uchun bu yerda qilmaymiz.
window.tlUpdate = function(delta) {
  // intentionally empty — TimelineSystem uses its own RAF
};