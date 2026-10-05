// ============================================================
//  🎞 GIF TEKSTURA  v1.0  (build 58.39)
// ------------------------------------------------------------
//  Animatsiyali teksturalar: 🎞 GIF fayl yoki 📚 raqamlangan
//  rasmlar ketma-ketligi (1.png, 2.png, 3.png…).
//
//    • Butun obyektga yoki BITTA yuzga
//    • Kadr tezligi (FPS) dizayner qo'lida
//    • ⏱ Timeline: 1-key `a.gif`, 2-key `b.gif` — ALMASHADI
//
//  ── ⚠ NEGA \"KLIP KUTUBXONASI\" ───────────────────────────────
//    Kadrlar obyektning `userData` sida saqlansa, bitta GIF ni ikki
//    joyda ishlatgan sahna uni IKKI MARTA saqlardi — 5 MB lik GIF
//    o'nta obyektda 50 MB bo'lib ketardi. Endi klip kutubxonada
//    BIR MARTA yotadi, obyekt esa faqat uning nomini ushlaydi.
//
//  ── ⚠ NEGA SILLIQ O'TISH YO'Q ───────────────────────────────
//    Timeline'da `a.gif` va `b.gif` orasida oraliq qiymat yo'q:
//    ular rasm, sonlar emas. Shuning uchun almashish QADAMLI —
//    keyframening yarmida keyingisiga o'tadi.
//
//  ── ⚠ NEGA `THREE.Texture` KANVASDAN ────────────────────────
//    Har kadrni `TextureLoader` bilan yuklasak, o'yin davomida
//    o'nlab marta rasm dekodlash boshlanardi va kadr sakrardi.
//    Endi kadrlar BIR MARTA teksturaga aylantiriladi va keyin
//    faqat `material.map` almashadi — bu deyarli bepul.
// ============================================================

window.GifTextureSystem = (() => {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _objs = () => (typeof objects !== 'undefined' ? objects : []);

  /**
   * Klip kutubxonasi.
   *   clips[id] = { id, name, w, h, fps, frames: [dataURL…] }
   * ⚠ `dataURL` — `AssetBundle` uni O'ZI tanib ZIP dagi `texture/`
   *   papkasiga chiqaradi (kalit nomini bilishi shart emas).
   */
  const clips = {};
  let _seq = 1;

  /** Har klip uchun tayyorlangan teksturalar (runtime, saqlanmaydi). */
  const _tex = new Map();     // clipId -> [THREE.Texture]

  // ============================================================
  //  Klip yaratish
  // ============================================================

  /**
   * 🎞 GIF faylidan klip.
   * @param {ArrayBuffer|Uint8Array} buf
   * @param {string} name
   */
  function addFromGif(buf, name) {
    if (!window.GifDecoder) throw new Error('GifDecoder topilmadi');
    const g = GifDecoder.decode(buf);
    const frames = g.frames.map(f => _rgbaToDataURL(f.rgba, g.width, g.height));
    // ⚠ FPS ni GIF ning O'Z kechikishidan olamiz — dizayner uni
    //   keyin o'zgartira oladi, lekin standart holda GIF o'zi
    //   mo'ljallangan tezlikda o'ynashi kerak.
    const avg = g.frames.reduce((s, f) => s + (f.delay || 100), 0) / g.frames.length;
    const fps = Math.max(1, Math.min(60, Math.round(1000 / Math.max(10, avg))));
    return _add(name || 'gif', frames, g.width, g.height, fps);
  }

  /**
   * 📚 DEPACK — raqamlangan rasmlar ketma-ketligidan klip.
   *
   * ⚠ Tartib FAYL NOMIDAGI RAQAM bo'yicha, alifbo bo'yicha EMAS.
   *   Alifboda `10.png` `2.png` dan OLDIN keladi va animatsiya
   *   sakrab-sakrab o'ynardi.
   *
   * @param {Array<{name:string,url:string}>} files
   */
  function addFromSequence(files, name) {
    const list = (files || []).slice().sort((a, b) => _numOf(a.name) - _numOf(b.name));
    if (!list.length) throw new Error('Rasm tanlanmadi');
    return _add(name || 'ketma-ketlik', list.map(f => f.url), 0, 0, 12);
  }

  /** Fayl nomidagi birinchi butun son (`kadr_007.png` → 7). */
  function _numOf(n) {
    const m = String(n || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function _add(name, frames, w, h, fps) {
    const id = 'clip_' + (_seq++);
    clips[id] = { id, name: String(name), w: w || 0, h: h || 0,
                  fps: fps || 12, frames };
    return id;
  }

  function remove(id) {
    if (!clips[id]) return false;
    delete clips[id];
    const list = _tex.get(id);
    if (list) { list.forEach(t => { try { t.dispose(); } catch (e) {} }); _tex.delete(id); }
    // Ishlatayotgan obyektlarni bo'shatamiz
    for (const o of _objs()) {
      if (o.userData && o.userData.gif && o.userData.gif.clip === id) clear(o);
    }
    return true;
  }

  function _rgbaToDataURL(rgba, w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    img.data.set(rgba);
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }

  /** Klip teksturalari (kerak bo'lganda bir marta tayyorlanadi). */
  function texturesOf(id) {
    if (_tex.has(id)) return _tex.get(id);
    const c = clips[id];
    if (!c) return null;
    const loader = new THREE.TextureLoader();
    const list = c.frames.map(url => {
      const t = loader.load(url);
      if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
      else if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      return t;
    });
    _tex.set(id, list);
    return list;
  }

  // ============================================================
  //  Obyektga qo'llash
  // ============================================================

  /**
   * @param {THREE.Object3D} o
   * @param {string} clipId
   * @param {object} [opt] { fps, face } — `face` null = hamma yuzga
   */
  function assign(o, clipId, opt) {
    if (!o || !clips[clipId]) return false;
    const c = clips[clipId];
    o.userData.gif = {
      clip: clipId,
      fps:  (opt && opt.fps) || (o.userData.gif && o.userData.gif.fps) || c.fps,
      face: (opt && opt.face != null) ? opt.face
          : (o.userData.gif ? o.userData.gif.face : null),
      playing: true,
    };
    texturesOf(clipId);
    return true;
  }

  function clear(o) {
    if (!o || !o.userData.gif) return false;
    _restore(o);
    delete o.userData.gif;
    delete o.userData._gifFrame;
    return true;
  }

  function set(o, key, val) {
    if (!o || !o.userData.gif) return false;
    if (key === 'fps')  o.userData.gif.fps = Math.max(0.1, Math.min(60, parseFloat(val) || 12));
    if (key === 'face') o.userData.gif.face = (val === '' || val == null) ? null : (parseInt(val, 10) | 0);
    if (key === 'playing') o.userData.gif.playing = !!val;
    return true;
  }

  /** Materiallar ro'yxati — yuz indeksi bilan yoki hammasi. */
  function _targets(o) {
    const g = o.userData.gif;
    const m = o.material;
    if (Array.isArray(m)) {
      if (g.face != null && m[g.face]) return [m[g.face]];
      return m;
    }
    return m ? [m] : [];
  }

  /**
   * ⚠ Asl teksturani BIR MARTA eslab qolamiz. Har kadrda yozsak,
   *   ikkinchi kadrda \"asl\" deb GIF ning o'z kadrini saqlab
   *   qo'yardik va o'chirganda obyekt GIF kadrida qotib qolardi.
   */
  function _remember(mat) {
    if (mat.userData && mat.userData.__gifPrev === undefined) {
      mat.userData.__gifPrev = mat.map || null;
    }
  }
  function _restore(o) {
    for (const mat of _targets(o)) {
      if (mat.userData && mat.userData.__gifPrev !== undefined) {
        mat.map = mat.userData.__gifPrev;
        delete mat.userData.__gifPrev;
        mat.needsUpdate = true;
      }
    }
  }

  // ============================================================
  //  Har kadr
  // ============================================================
  let _t = 0;
  function update(delta) {
    _t += (delta || 0.016);
    for (const o of _objs()) {
      const g = o && o.userData && o.userData.gif;
      if (!g || !g.clip) continue;
      const list = texturesOf(g.clip);
      if (!list || !list.length) continue;
      const fps = Math.max(0.1, g.fps || 12);
      const idx = (g.playing === false)
        ? (o.userData._gifFrame || 0)
        : Math.floor(_t * fps) % list.length;
      if (o.userData._gifFrame === idx) continue;
      o.userData._gifFrame = idx;
      for (const mat of _targets(o)) {
        if (!mat) continue;
        _remember(mat);
        mat.map = list[idx];
        mat.needsUpdate = true;
      }
    }
  }

  // ============================================================
  //  ⏱ Timeline
  //  ⚠ Rasm — son emas: oraliq qiymat yo'q. Shuning uchun
  //    almashish QADAMLI (`timeline.js` da `alpha < 0.5`).
  // ============================================================
  function captureTL(o) {
    const g = o && o.userData && o.userData.gif;
    if (!g || !g.clip) return null;
    return { gifClip: g.clip, gifFps: g.fps, gifFace: g.face };
  }
  function applyTL(o, kf) {
    if (!o || kf.gifClip === undefined) return;
    if (!clips[kf.gifClip]) return;
    const g = o.userData.gif;
    if (!g || g.clip !== kf.gifClip) {
      assign(o, kf.gifClip, { fps: kf.gifFps, face: kf.gifFace });
      o.userData._gifFrame = -1;      // darhol yangi kadr chizilsin
    } else if (typeof kf.gifFps === 'number') {
      g.fps = kf.gifFps;
    }
  }

  // ============================================================
  //  💾 Saqlash
  // ============================================================
  function serialize() {
    return { clips: JSON.parse(JSON.stringify(clips)), seq: _seq };
  }
  function restore(d) {
    for (const k in clips) delete clips[k];
    _tex.forEach(list => list.forEach(t => { try { t.dispose(); } catch (e) {} }));
    _tex.clear();
    if (!d || !d.clips) return;
    Object.assign(clips, d.clips);
    _seq = Math.max(d.seq || 1, ...Object.keys(clips)
      .map(k => (parseInt(String(k).replace('clip_', ''), 10) || 0) + 1), 1);
  }

  function list() { return Object.values(clips); }

  return {
    clips, list, addFromGif, addFromSequence, remove, texturesOf,
    assign, clear, set, update, captureTL, applyTL, serialize, restore,
    _numOf, _targets,
  };
})();
