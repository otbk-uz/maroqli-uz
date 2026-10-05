// ============================================================
//  🦴 ANIM IMPORT — tashqi animatsiyani rigli modelga biriktirish
//
//  MUAMMO: klaviatura muharriridagi fayl tanlagich `.json,.glb,.fbx`
//  ni qabul qilardi, lekin:
//     • FBX uchun `libs/` da LOADER UMUMAN YO'Q edi — fayl blob URL
//       bo'lib saqlanar, keyin "⚠ animFile fetch file:// da ishlamaydi"
//       deb chiqib, hech nima bo'lmasdi;
//     • GLB ham xuddi shunday tugardi;
//     • ya'ni ishlaydigan yagona yo'l — animatsiyani modelning O'ZIGA
//       biriktirib, GLB qilib qayta eksport qilish edi.
//
//  Endi fayl to'g'ridan-to'g'ri o'qiladi va klip modelning MAVJUD
//  skeletiga QAYTA MOSLANADI (retarget) — model qayta eksport
//  qilinmaydi, tashqi xizmat kerak emas.
//
//  ── Nima qo'llab-quvvatlanadi ────────────────────────────────
//    .fbx  — THREE.FBXLoader (libs/FBXLoader.js + fflate + NURBS)
//    .glb  — GLTFLoader, faqat `animations` olinadi
//    .json — three.js AnimationClip JSON  YOKI  APEX obyekt eksporti
//
//  ── Retarget qanday ishlaydi ─────────────────────────────────
//  AnimationClip trekilari `mixamorig:Hips.quaternion` kabi nomlanadi.
//  Modelning suyagi esa `mixamorigHips` (GLB eksportida ikki nuqta
//  tushib qoladi) yoki oddiy `Hips` bo'lishi mumkin. Shuning uchun
//  ikkala tomon ham NORMALLASHTIRILADI va nom bo'yicha bog'lanadi.
//
//  ⚠ POZITSIYA trekilari alohida muomala talab qiladi: FBX odatda
//    SANTIMETRDA (skelet 100× kattaroq), GLB esa metrda. Pozitsiyani
//    xom holda qo'llasak, model portlab ketadi. Shuning uchun ikki
//    skeletning o'lchov nisbati hisoblanadi va pozitsiya shunga
//    ko'paytiriladi. Burilish (quaternion) o'lchovga bog'liq emas —
//    u o'zgarishsiz ko'chadi.
// ============================================================

const AnimImport = (() => {
  'use strict';

  const _log = (m, t) => { try { (window.log || console.log)(m, t || 'lok'); } catch (e) { console.log(m); } };

  // ============================================================
  //  🏷 cleanClipName — foydasiz klip nomlarini almashtirish
  //
  //  ⚠ Eksport dasturlari klipga o'z REKLAMASINI yoki ichki texnik
  //    nomni beradi. Eng ko'p uchraydiganlari:
  //       "mixamo.com"        — Mixamo HAR BIR klipni shunday nomlaydi
  //       "Armature|mixamo.com"
  //       "Take 001"          — FBX standart nomi
  //       "AnimStack::Take 001"
  //    Bu nomlar modelning O'ZIDA yozilgan (`gltf.animations[i].name`),
  //    dvigatel ularni shunchaki ko'rsatardi. Natijada klaviatura
  //    muharririda animatsiya nomi sifatida "mixamo.com" turardi —
  //    foydasiz va chalg'ituvchi.
  //
  //    Endi bunday nomlar fayl/model nomiga almashtiriladi. Klip nomi
  //    faqat YORLIQ — mixer treklar bo'yicha bog'lanadi, shuning uchun
  //    qayta nomlash xavfsiz.
  // ============================================================
  const _JUNK = [
    'mixamo.com', 'mixamocom', 'take001', 'take1', 'animstack',
    'animation', 'animationclip', 'clip', 'default', 'unnamed',
    'armature', 'scene', 'baselayer', 'layer0',
  ];

  function cleanClipName(name, fallback, index) {
    const raw = String(name || '').trim();
    // "Armature|mixamo.com" / "AnimStack::Take 001" → oxirgi bo'lak
    const tail = raw.split('|').pop().split('::').pop().trim();
    const key  = tail.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (tail && _JUNK.indexOf(key) < 0) return tail;   // yaxshi nom — tegmaymiz

    const base = String(fallback || 'Animatsiya').replace(/\.\w+$/, '').trim() || 'Animatsiya';
    return (index === undefined || index === null || index === 0)
             ? base : base + ' ' + (index + 1);
  }

  // ── Suyak nomini solishtirish uchun soddalashtirish ──────────
  //  "Armature|mixamorig:LeftArm" → "leftarm"
  //  "mixamorigLeftArm"           → "leftarm"
  //  "Bip01 L UpperArm"           → "bip01lupperarm"
  function normBone(name) {
    let s = String(name || '');
    s = s.split('|').pop();          // "Armature|X" → "X"
    s = s.split(':').pop();          // "mixamorig:X" → "X"
    s = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    // ⚠ Ikki nuqtasiz variant: eksportchilar `mixamorig:Hips` ni
    //   `mixamorigHips` qilib yozadi. Prefiksni olib tashlaymiz,
    //   aks holda ikki tomon hech qachon mos kelmaydi.
    s = s.replace(/^mixamorig\d*/, '');
    return s;
  }

  /**
   * Obyekt ichidagi barcha suyaklar: normNomi → suyak
   *
   * ⚠ Ikkinchi kalit ham qo'yiladi — raqamli qo'shimchasiz variant.
   *   GLTFLoader takrorlangan nomlarga `_09`, `_023` qo'shadi va u
   *   HAR YUKLASHDA boshqacha bo'lishi mumkin. Eksport paytidagi nom
   *   bilan hozirgi nom mos kelmasa, animatsiya suyakka bog'lanmaydi.
   */
  function collectBones(root) {
    const map = new Map();
    if (!root || typeof root.traverse !== 'function') return map;
    root.traverse(o => {
      if (!o.isBone) return;
      const k = normBone(o.name);
      if (!k) return;
      if (!map.has(k)) map.set(k, o);
      const bare = k.replace(/\d+$/, '');
      if (bare && bare !== k && !map.has(bare)) map.set(bare, o);
    });
    return map;
  }

  /**
   * Ikki skeletning o'lchov nisbati.
   * Mos kelgan suyaklarning tinch holatdagi siljish uzunliklari
   * yig'indisi solishtiriladi — bu skelet "kattaligi" uchun ishonchli
   * o'lchov (bitta suyakka qarasak, u ildizda bo'lsa 0 bo'lib qoladi).
   * @returns {number} 1 — o'lcham bir xil, 0.01 — manba 100× katta
   */
  function skeletonScale(srcMap, dstMap) {
    let sSum = 0, dSum = 0, n = 0;
    for (const [k, sBone] of srcMap) {
      const dBone = dstMap.get(k);
      if (!dBone) continue;
      sSum += sBone.position.length();
      dSum += dBone.position.length();
      n++;
    }
    if (!n || sSum < 1e-6) return 1;
    const r = dSum / sSum;
    return (isFinite(r) && r > 0) ? r : 1;
  }

  /**
   * Klipni maqsad skeletiga moslaydi.
   * @param {THREE.AnimationClip} clip
   * @param {Map} dstMap    maqsad suyaklari (normNomi → suyak)
   * @param {number} posScale  pozitsiya koeffitsienti
   * @returns {{clip:THREE.AnimationClip|null, matched:number, dropped:number}}
   */
  function retargetClip(clip, dstMap, posScale) {
    if (!clip || !Array.isArray(clip.tracks)) return { clip: null, matched: 0, dropped: 0 };

    const tracks = [];
    let matched = 0, dropped = 0;

    for (const tr of clip.tracks) {
      // Trek nomi: "<obyekt>.<xususiyat>" — masalan "mixamorig:Hips.quaternion"
      const dot = tr.name.lastIndexOf('.');
      if (dot < 0) { dropped++; continue; }
      const objName = tr.name.slice(0, dot);
      const prop    = tr.name.slice(dot + 1);

      const bone = dstMap.get(normBone(objName));
      if (!bone) { dropped++; continue; }

      // ⚠ `scale` treklari TASHLANADI. Ular deyarli har doim (1,1,1)
      //   bo'ladi, lekin manba skeletida boshqacha bo'lsa modelni
      //   cho'zib yuboradi — foyda yo'q, xavf bor.
      if (prop === 'scale') { dropped++; continue; }

      let t;
      try {
        t = tr.clone();
      } catch (e) { dropped++; continue; }

      t.name = bone.uuid + '.' + prop;   // uuid — nom takrorlanishidan himoya

      if (prop === 'position' && posScale !== 1) {
        const v = t.values;
        for (let i = 0; i < v.length; i++) v[i] *= posScale;
      }
      tracks.push(t);
      matched++;
    }

    if (!tracks.length) return { clip: null, matched: 0, dropped };
    const out = new THREE.AnimationClip(clip.name, clip.duration, tracks);
    return { clip: out, matched, dropped };
  }

  // ============================================================
  //  🩹 fixClipJson — three.js `AnimationClip.parse` uchun tayyorlash
  //
  //  ⚠ `KeyframeTrack.parse` trekda `type` maydonini MAJBURIY talab
  //    qiladi, aks holda darhol yiqiladi:
  //       "THREE.KeyframeTrack: track type undefined, can not parse"
  //    Ko'p eksportchi (Blender skriptlari, eski three.js, qo'lda
  //    yozilgan JSON) uni yozmaydi — chunki tur trek NOMIDAN allaqachon
  //    ma'lum: ".quaternion" → quaternion, ".position" → vector.
  //
  //    Shuning uchun yetishmagan `type` ni nomdan chiqaramiz. Bu
  //    taxmin emas: three.js ning o'zi ham xuddi shu moslikni ishlatadi
  //    (`AnimationClip.CreateFromMorphTargetSequence` va h.k.).
  //
  //  ⚠ Yana bitta eski format: `keys: [{time, value}]` (three.js r68).
  //    U `times` / `values` ga o'giriladi.
  // ============================================================
  const _TYPE_BY_PROP = {
    quaternion: 'quaternion',
    position:   'vector3',
    scale:      'vector3',
    color:      'color',
    visible:    'bool',
    opacity:    'number',
    morphTargetInfluences: 'number',
    influence:  'number',
    intensity:  'number',
  };

  function _inferType(trackName) {
    const prop = String(trackName || '').split('.').pop();
    if (_TYPE_BY_PROP[prop]) return _TYPE_BY_PROP[prop];
    // "material.opacity" kabi — oxirgi qismga qaraymiz
    for (const k in _TYPE_BY_PROP) if (prop && prop.indexOf(k) >= 0) return _TYPE_BY_PROP[k];
    return null;
  }

  function fixClipJson(j) {
    if (!j || !Array.isArray(j.tracks)) return { clip: j, fixed: 0, dropped: 0 };
    const tracks = [];
    let fixed = 0, dropped = 0;

    for (const t of j.tracks) {
      if (!t || !t.name) { dropped++; continue; }
      const o = Object.assign({}, t);

      // Eski `keys` formati → times/values
      if (!o.times && Array.isArray(o.keys)) {
        o.times = []; o.values = [];
        for (const k of o.keys) {
          if (!k || k.time === undefined) continue;
          o.times.push(k.time);
          const v = k.value !== undefined ? k.value : k.pos || k.rot || k.scl;
          if (Array.isArray(v)) o.values.push(...v);
          else if (v && typeof v === 'object') o.values.push(v.x || 0, v.y || 0, v.z || 0, ...(v.w !== undefined ? [v.w] : []));
          else o.values.push(Number(v) || 0);
        }
        delete o.keys;
        fixed++;
      }

      if (!Array.isArray(o.times) || !Array.isArray(o.values) || !o.times.length) { dropped++; continue; }

      if (!o.type) {
        const ty = _inferType(o.name);
        if (!ty) { dropped++; continue; }   // turini aniqlab bo'lmadi
        o.type = ty;
        fixed++;
      }
      tracks.push(o);
    }

    return {
      clip: Object.assign({}, j, { tracks, duration: j.duration !== undefined ? j.duration : -1 }),
      fixed, dropped,
    };
  }

  /** JSON ni xavfsiz AnimationClip ga aylantiradi. Xato bo'lsa null. */
  function parseClipJson(j) {
    const r = fixClipJson(j);
    if (!r.clip.tracks.length) return { clip: null, fixed: r.fixed, dropped: r.dropped };
    try {
      return { clip: THREE.AnimationClip.parse(r.clip), fixed: r.fixed, dropped: r.dropped };
    } catch (e) {
      _log('⚠ Klip o\'qilmadi: ' + e.message, 'lw');
      return { clip: null, fixed: r.fixed, dropped: r.dropped, error: e };
    }
  }

  // ============================================================
  //  🎞 fromApexTimeline — APEX timeline eksportini klipga aylantirish
  //
  //  Format (`apex3d_timeline*.json`):
  //    { version, duration, tracks: [
  //        { objId, objName: "model / mixamorigLeftArm_09",
  //          keyframes: [{ time, ease, tangent, pos{x,y,z}, rot{x,y,z}, scale{x,y,z} }] } ] }
  //
  //  ⚠ NEGA ALOHIDA: `_playApexJsonData` bu formatni "biladi", lekin
  //    undan BITTA trekni tanlab, uni butun O'YINCHI OBYEKTIGA qo'llaydi.
  //    Foydalanuvchi esa 4 ta SUYAKNI animatsiya qilgan bo'ladi —
  //    natijada suyaklar qimirlamaydi, o'rniga butun model buriladi.
  //    Ya'ni timeline'da yasagan suyak animatsiyangizni klavishga
  //    bog'lab bo'lmasdi.
  //
  //    Endi har bir trek O'Z suyagiga bog'lanadi va hammasi bitta
  //    `AnimationClip` ga yig'iladi — modeldan chiqqan animatsiyalar
  //    bilan bir xil yo'ldan (mixer orqali) ijro etiladi.
  //
  //  ⚠ `rot` — EYLER burchagi (radian), klip esa kvaternion kutadi.
  //    To'g'ridan-to'g'ri ko'chirsak model chirmashib ketadi.
  // ============================================================
  function isApexTimeline(j) {
    return !!(j && Array.isArray(j.tracks) && j.tracks.length &&
              j.tracks.some(t => Array.isArray(t.keyframes)));
  }

  /**
   * SUYAK animatsiyasimi yoki ODDIY OBYEKT animatsiyasimi?
   *
   * Belgisi — trek nomidagi `/`:
   *     "kapitan / mixamorigLeftArm_09"  → 🦴 suyak
   *     "Kub 2"                          → 🧊 obyekt
   * (bone-system suyakni `egaNomi + " / " + suyakNomi` deb yozadi)
   *
   * ⚠ NEGA "suyak topildimi" bo'yicha AJRATIB BO'LMAYDI: suyak
   *   animatsiyasi bog'lanmay qolsa, uni obyekt yo'liga yuborish
   *   HALOKATLI. U yo'l birinchi trekni olib BUTUN OBYEKTGA qo'llaydi —
   *   suyakning lokal pozitsiyasi (masalan y=3.13) va burilishi butun
   *   modelga tushadi va model yanchilib/uchib ketadi.
   *   Shuning uchun tur AVVAL nomdan aniqlanadi, keyin bog'lanadi.
   */
  function isBoneTimeline(j) {
    const tr = (j && j.tracks) || [];
    if (!tr.length) return false;
    const withSlash = tr.filter(t => t && typeof t.objName === 'string' &&
                                     t.objName.indexOf('/') >= 0).length;
    return withSlash > tr.length / 2;
  }

  function fromApexTimeline(json, model, clipName) {
    const dstMap = collectBones(model);
    if (!dstMap.size) return { clip: null, matched: 0, dropped: 0, reason: 'Modelda suyak yo\'q' };

    // Suyak nomini trekdan ajratamiz: "kapitan / mixamorigLeftArm_09"
    const boneOf = objName => {
      const tail = String(objName || '').split('/').pop().trim();
      let b = dstMap.get(normBone(tail));
      if (b) return b;
      // ⚠ Zaxira: GLTFLoader takrorlangan nomlarga "_09" qo'shadi.
      //   Aniq moslik topilmasa, raqamli qo'shimchani olib qaraymiz.
      return dstMap.get(normBone(tail).replace(/\d+$/, '')) || null;
    };

    const tracks = [];
    let matched = 0, dropped = 0, maxT = 0;
    const _e = new THREE.Euler(), _q = new THREE.Quaternion();

    for (const tr of (json.tracks || [])) {
      const kfs = (tr.keyframes || []).filter(k => k && typeof k.time === 'number')
                                      .sort((a, b) => a.time - b.time);
      if (!kfs.length) { dropped++; continue; }

      const bone = boneOf(tr.objName);
      if (!bone) { dropped++; continue; }

      const times = kfs.map(k => k.time);
      maxT = Math.max(maxT, times[times.length - 1]);
      const id = bone.uuid;

      if (kfs.some(k => k.pos)) {
        const v = [];
        for (const k of kfs) { const p = k.pos || bone.position; v.push(p.x || 0, p.y || 0, p.z || 0); }
        tracks.push(new THREE.VectorKeyframeTrack(id + '.position', times, v));
      }
      if (kfs.some(k => k.rot)) {
        const v = [];
        for (const k of kfs) {
          const r = k.rot || { x: 0, y: 0, z: 0 };
          _e.set(r.x || 0, r.y || 0, r.z || 0);
          _q.setFromEuler(_e);
          v.push(_q.x, _q.y, _q.z, _q.w);
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(id + '.quaternion', times, v));
      }
      if (kfs.some(k => k.scale)) {
        const v = [];
        for (const k of kfs) { const c = k.scale || { x: 1, y: 1, z: 1 }; v.push(c.x, c.y, c.z); }
        tracks.push(new THREE.VectorKeyframeTrack(id + '.scale', times, v));
      }
      matched++;
    }

    if (!tracks.length) {
      return { clip: null, matched: 0, dropped,
               reason: 'Trek nomlari modeldagi suyaklarga mos kelmadi' };
    }
    const dur = json.duration || maxT || 1;
    return { clip: new THREE.AnimationClip(clipName || 'Timeline', dur, tracks), matched, dropped };
  }

  // ── Fayl o'qish ──────────────────────────────────────────────

  function _readAs(file, how) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result);
      r.onerror = () => rej(new Error('Fayl o\'qilmadi'));
      if (how === 'text') r.readAsText(file); else r.readAsArrayBuffer(file);
    });
  }

  /**
   * Fayldan animatsiya klipilarini va (bo'lsa) manba skeletini oladi.
   * @returns {Promise<{clips:Array, srcRoot:object|null, kind:string}>}
   */
  async function readClips(file) {
    const name = String(file.name || '').toLowerCase();

    // ── FBX ──
    if (name.endsWith('.fbx')) {
      if (typeof THREE.FBXLoader !== 'function') {
        throw new Error('FBXLoader yuklanmagan (libs/FBXLoader.js)');
      }
      const buf = await _readAs(file, 'buffer');
      const loader = new THREE.FBXLoader();
      // ⚠ `parse` ikkinchi argument sifatida resurs yo'lini kutadi —
      //   tekstura qidirmasin deb bo'sh beramiz, bizga faqat animatsiya kerak.
      const obj = loader.parse(buf, '');
      return { clips: obj.animations || [], srcRoot: obj, kind: 'fbx' };
    }

    // ── GLB / GLTF ──
    if (name.endsWith('.glb') || name.endsWith('.gltf')) {
      const loader = (typeof getGLTFLoader === 'function')
                       ? getGLTFLoader() : new THREE.GLTFLoader();
      const buf = await _readAs(file, 'buffer');
      const gltf = await new Promise((res, rej) => {
        loader.parse(buf, '', res, e => rej(new Error(e && e.message || 'GLB parse xatosi')));
      });
      return { clips: gltf.animations || [], srcRoot: gltf.scene || null, kind: 'glb' };
    }

    // ── JSON ──
    if (name.endsWith('.json')) {
      const txt = await _readAs(file, 'text');
      const j = JSON.parse(txt);

      // 🎞 APEX timeline eksporti — treklarda `keyframes` bo'ladi.
      //
      //  ⚠ BU TEKSHIRUV THREE.JS DAN OLDIN TURISHI SHART. Ikkala formatda
      //    ham `tracks` massivi bor, lekin ichi butunlay boshqacha:
      //      three.js → { name, type, times[], values[] }
      //      APEX     → { objId, objName, keyframes[{time,pos,rot,scale}] }
      //    Tartib buzilsa APEX fayli three.js klipi deb qabul qilinadi,
      //    treklarda `type`/`times` topilmay hammasi tashlanadi va
      //    "treklar o'qilmadi" xatosi chiqadi.
      if (isApexTimeline(j)) return { clips: [], srcRoot: null, kind: 'apextl', apex: j };

      // three.js AnimationClip JSON — bitta, massiv yoki {animations:[...]}
      //  ⚠ `duration` MAJBURIY emas: ko'p eksportchi uni yozmaydi va
      //    three.js uni -1 dan o'zi hisoblab oladi. Ilgari bu yerda
      //    `duration !== undefined` talab qilinardi va bunday fayllar
      //    "qo'llab-quvvatlanmaydigan format" bo'lib rad etilardi.
      const asClip = o => (o && Array.isArray(o.tracks) && o.tracks.length > 0);
      const list = asClip(j)                          ? [j]
                 : (Array.isArray(j) && j.every(asClip)) ? j
                 : (Array.isArray(j.animations) && j.animations.some(asClip)) ? j.animations.filter(asClip)
                 : null;
      if (list) {
        const clips = [];
        let fixed = 0, dropped = 0;
        for (const c of list) {
          const r = parseClipJson(c);
          fixed += r.fixed; dropped += r.dropped;
          if (r.clip) clips.push(r.clip);
        }
        if (fixed)   _log(`🩹 ${fixed} ta trek to'ldirildi (yetishmagan "type" nomdan aniqlandi)`, 'lw');
        if (dropped) _log(`⚠ ${dropped} ta trek tashlandi (turi aniqlanmadi yoki bo'sh)`, 'lw');
        if (!clips.length) throw new Error('JSON dagi treklar o\'qilmadi — nomlari ".quaternion" / ".position" bilan tugashi kerak');
        return { clips, srcRoot: null, kind: 'clipjson' };
      }

      // APEX obyekt eksporti — suyak animatsiyasi emas, obyekt keyframelari.
      // Uni bu yerda tiklamaymiz; chaqiruvchi eski yo'ldan yuboradi.
      return { clips: [], srcRoot: null, kind: 'apexjson', apex: j };
    }

    throw new Error('Qo\'llab-quvvatlanmaydigan format: ' + (file.name || '?'));
  }

  /**
   * Faylni o'qib, klipilarni modelga biriktiradi.
   * @param {File} file
   * @param {THREE.Object3D} model   rigli model (yoki uni o'z ichiga olgan obyekt)
   * @returns {Promise<{ok:boolean, names:Array<string>, apex?:object, reason?:string}>}
   */
  async function importToModel(file, model) {
    if (!file)  return { ok: false, reason: 'Fayl yo\'q' };
    if (!model) return { ok: false, reason: 'Model tanlanmagan' };

    let read;
    try { read = await readClips(file); }
    catch (e) { _log('❌ ' + e.message, 'le'); return { ok: false, reason: e.message }; }

    // APEX obyekt JSON — suyak animatsiyasi emas
    // 🎞 APEX timeline eksporti — IKKI xil bo'lishi mumkin:
    //
    //   🦴 SUYAK animatsiyasi — trek nomi "model / mixamorigLeftArm_09".
    //      Modelning skeletiga bog'lanadi, mixer orqali ijro etiladi.
    //
    //   🧊 ODDIY OBYEKT animatsiyasi — trek nomi shunchaki "Kub 2".
    //      Obyektning O'ZI siljiydi/buriladi. Bu eskidan ishlaydigan
    //      yo'l (`_playApexJsonData`) va u SAQLANISHI SHART.
    //
    //  ⚠ Men buni bir marta buzganman: `isApexTimeline()` BARCHA
    //    timeline fayllarini suyak yo'liga yuborardi, va oddiy obyekt
    //    animatsiyalari "Modelda suyak yo'q" deb rad etilardi.
    //
    //  Qoida: avval suyak yo'lini SINAB ko'ramiz; mos suyak topilmasa —
    //  bu oddiy obyekt animatsiyasi, chaqiruvchi eski yo'ldan yuboradi.
    if (read.kind === 'apextl') {
      const nTr = (read.apex.tracks || []).length;

      // 🧊 ODDIY OBYEKT animatsiyasi — suyak yo'liga UMUMAN kirmaydi
      if (!isBoneTimeline(read.apex)) {
        _log(`🧊 Obyekt animatsiyasi (${nTr} trek) — obyektning o'zi harakatlanadi`, 'lok');
        return { ok: false, apex: read.apex, reason: 'apex' };
      }

      // 🦴 SUYAK animatsiyasi — faqat skeletga bog'lanadi
      const dstMap0 = collectBones(model);
      const conv = dstMap0.size
        ? fromApexTimeline(read.apex, model, cleanClipName(null, file.name, 0))
        : { clip: null, reason: 'Modelda suyak yo\'q' };
      if (!conv.clip) {
        // ⚠ OBYEKT YO'LIGA TUSHIRMAYMIZ. U birinchi trekni olib butun
        //   obyektga qo'llaydi — suyakning lokal pozitsiyasi va burilishi
        //   modelga tushib, u YANCHILIB/UCHIB ketadi.
        const want = (read.apex.tracks || []).slice(0, 3)
                       .map(t => String(t.objName || '').split('/').pop().trim()).join(', ');
        _log(`❌ Suyak animatsiyasi bog'lanmadi: ${conv.reason}.` +
             ` Faylda kutilgan suyaklar: ${want}${nTr > 3 ? ' ...' : ''}.` +
             ` Bu animatsiya SHU model uchun eksport qilinganmi?`, 'le');
        return { ok: false, reason: conv.reason };
      }
      const ud0 = model.userData;
      if (!ud0._mixer) ud0._mixer = new THREE.AnimationMixer(model);
      if (!Array.isArray(ud0._clips))   ud0._clips   = [];
      if (!Array.isArray(ud0._actions)) ud0._actions = [];
      let nm = conv.clip.name;
      if (ud0._clips.some(x => x.name === nm)) {
        let i = 2; while (ud0._clips.some(x => x.name === nm + ' ' + i)) i++;
        nm = nm + ' ' + i;
      }
      conv.clip.name = nm;
      ud0._clips.push(conv.clip);
      const a0 = ud0._mixer.clipAction(conv.clip);
      a0.loop = THREE.LoopRepeat;
      ud0._actions.push(a0);
      _log(`🎞 "${file.name}" → "${nm}": ${conv.matched} ta suyak` +
           (conv.dropped ? ` (${conv.dropped} trek mos kelmadi)` : ''), 'lok');
      return { ok: true, names: [nm], bones: conv.matched };
    }

    // APEX obyekt eksporti — suyak animatsiyasi emas, eski yo'ldan
    if (read.kind === 'apexjson') return { ok: false, apex: read.apex, reason: 'apex' };

    if (!read.clips.length) {
      _log('⚠ Faylda animatsiya topilmadi: ' + file.name, 'lw');
      return { ok: false, reason: 'Animatsiya yo\'q' };
    }

    // Maqsad skeleti
    const dstMap = collectBones(model);
    if (!dstMap.size) {
      _log('⚠ Modelda suyak yo\'q — animatsiya biriktirilmadi', 'lw');
      return { ok: false, reason: 'Suyak yo\'q' };
    }

    // O'lchov nisbati — manba skeleti bo'lsa hisoblaymiz
    let posScale = 1;
    if (read.srcRoot) {
      const srcMap = collectBones(read.srcRoot);
      if (srcMap.size) posScale = skeletonScale(srcMap, dstMap);
    }

    const ud = model.userData;
    if (!ud._mixer) ud._mixer = new THREE.AnimationMixer(model);
    if (!Array.isArray(ud._clips))   ud._clips   = [];
    if (!Array.isArray(ud._actions)) ud._actions = [];

    const added = [];
    let totalMatched = 0, totalDropped = 0;
    for (const c of read.clips) {
      const r = retargetClip(c, dstMap, posScale);
      totalMatched += r.matched; totalDropped += r.dropped;
      if (!r.clip) continue;

      // Nom to'qnashuvi — ustiga yozmaymiz, raqam qo'shamiz
      let nm = cleanClipName(r.clip.name, file.name, added.length);
      if (ud._clips.some(x => x.name === nm)) {
        let i = 2;
        while (ud._clips.some(x => x.name === nm + ' ' + i)) i++;
        nm = nm + ' ' + i;
      }
      r.clip.name = nm;

      ud._clips.push(r.clip);
      const act = ud._mixer.clipAction(r.clip);
      act.loop = THREE.LoopRepeat;
      ud._actions.push(act);
      added.push(nm);
    }

    if (!added.length) {
      _log(`⚠ "${file.name}": suyak nomlari modelga mos kelmadi ` +
           `(${totalDropped} trek tashlandi). Skeletlar boshqacha bo'lishi mumkin.`, 'lw');
      return { ok: false, reason: 'Mos kelmadi' };
    }

    const scaleNote = (Math.abs(posScale - 1) > 0.01)
      ? ` · o'lchov ×${posScale.toFixed(3)}` : '';
    _log(`🦴 "${file.name}" → ${added.length} ta animatsiya: ${added.join(', ')}` +
         ` (${totalMatched} trek${scaleNote})`, 'lok');
    return { ok: true, names: added, posScale };
  }

  return { normBone, collectBones, skeletonScale, retargetClip, readClips, importToModel,
           fixClipJson, parseClipJson, cleanClipName, isApexTimeline, isBoneTimeline, fromApexTimeline };
})();

window.AnimImport = AnimImport;

// Modeldan kelgan klip nomlarini tozalash uchun — GLB import yo'llari ham
// ishlatadi (inspector.js, gltf-import.js).
window.cleanClipName = AnimImport.cleanClipName;
