// ============================================================
//  MAP LOADER  —  karta almashtirish tizimi
//  Assetlar bo'limidan qo'shiladigan trigger zonasi. O'yinchi
//  ichiga kirganda:
//    1) loading screen (HTML / rasm / video) chiqadi,
//    2) eski karta o'chiriladi (statik yer va o'yinchi qoladi),
//    3) yangi karta ZIP'dan yuklanadi (obyektlar o'z koordinatalari,
//       teksturasi va O'Z collision rejimida spawn bo'ladi),
//    4) o'yinchi belgilangan joyga teleport qilinadi.
//  Karta ZIP base64 sifatida userData'da saqlanadi (save/load bilan).
// ============================================================
const MapLoaderSystem = (() => {
  let _mlIdC = 0;

  function _defaultData() {
    return {
      //  🌐 Karta almashuvi HAMMAGA tegsinmi.
      //  ⚠ `_` SIZ — sahna bilan saqlanadi. Standart YONIQ:
      //    multiplayerda odatda hamma birga o'tishi kutiladi.
      //    O'chirilsa faqat bosgan odam o'tadi (lobbi va o'yin
      //    maydoni alohida bo'lsa foydali).
      mpShared: true,
      isMapLoader: true,
      triggerSize: { x: 3, y: 3, z: 3 },
      mapName:     '',
      mapB64:      null,         // karta ZIP (base64) — saqlanadi
      // Kartani eski karta MARKAZIGA tenglashtirish.
      // Standart false — obyektlar saqlangan koordinatalarida qoladi.
      alignToOld:  false,
      loading:     { type: 'none', content: '', duration: 1.2 }, // none|html|image|video
      teleport:    { enabled: true, mode: 'coords', object: '', x: 0, y: 2, z: 0 },
      collision:   'original',   // original | inline | block
      playAnim:    'none',       // none | objects | camera
      // ⚠ Standart YOQIQ. Ilgari `false` edi va bu asosiy oqimni buzardi:
      //   o'yinchi 2-marta kirsa HECH NARSA bo'lmasdi — konsolда xabar ham
      //   yo'q, ya'ni sababini bilib bo'lmasdi. Karta almashishi — bu
      //   Map Loader'ning MAQSADI, yashirin sozlama emas.
      // ⚠ STANDART: BIR TOMONLAMA (daraja almashuvi).
      //   Map Loader — bu "daraja o'tish": eski karta ketadi, yangisi
      //   keladi. Qaytish uchun yangi kartaga BOSHQA Map Loader qo'yiladi.
      //   `true` qilinsa — eski "borib-qaytish" (portal) xulqi.
      autoUnload:  false,
      // 💡 Karta O'Z muhitini (chiroq/zarracha/tuman) olib kelsinmi.
      //    Standart YOQIQ: karta qanday yasalgan bo'lsa, shunday
      //    ko'rinishi kerak. O'chirilsa — sahnaning muhiti qoladi.
      mapEnv:      true,
      keepElements: [],          // yo'qolganда qoladigan obyekt nomlari
      keepReverse: false,        // teskari: tanlanganlar o'chadi, qolgani qoladi
      mapObjectNames: [],        // ZIP manifestidagi obyekt nomlari (UI uchun)
    };
  }

  // ============================================================
  //  📖 _readManifest — ZIP ichidan sahna ma'lumotini o'qish
  //
  //  ⚠ Ilgari bu yerda O'Z konverteri bor edi (`apex-file.json` va
  //    `timeline.json` maydonlarini `_spawnManifest` kutgan shaklga
  //    o'giradigan ~50 qator). `save-load.js` da esa AYNAN shu ish
  //    uchun boshqa konverter turardi. Ikkalasi boshqacha maydonlarni
  //    bilardi — va PC/sound/map-loader bloklari yo'lda yo'qolardi.
  //
  //    Endi bitta manba: `window.zipToSceneData()`. Bu funksiya faqat
  //    uni chaqiradi va xatoni yumshoq qaytaradi.
  // ============================================================
  async function _readManifest(zip) {
    if (!zip || typeof window.zipToSceneData !== 'function') return null;
    try {
      const r = await window.zipToSceneData(zip);
      return r ? r.data : null;
    } catch (e) {
      log('⚠ Karta o\'qilmadi: ' + e.message, 'lw');
      return null;
    }
  }

  // ── Geometriya (primitiv tur bo'yicha) ──
  function _primGeo(type) {
    if (typeof PRIMITIVES !== 'undefined') {
      const p = PRIMITIVES.find(pr => pr.name === type);
      if (p) { try { return p.geo(); } catch(e) {} }
    }
    return new THREE.BoxGeometry(1, 1, 1);
  }

  // ── Yaratish ──
  /**
   * Saqlangan Map Loader ning KO'RINISHINI tiklaydi — yashil simli
   * trigger zonasi + shaffof to'ldirish.
   * ⚠ `create()` dan farqi: sahnaga/`objects` ga QO'SHMAYDI (prefab spawn
   *   buni o'zi qiladi, aks holda element ikki marta qo'shilardi).
   */
  function restoreVisual(mesh) {
    if (!mesh || !mesh.isMesh) return mesh;
    try { mesh.material && mesh.material.dispose(); } catch (e) {}
    mesh.material = new THREE.MeshBasicMaterial({
      color: 0x39ff14, wireframe: true, transparent: true, opacity: 0.65 });
    mesh.castShadow = false; mesh.receiveShadow = false;

    [...mesh.children].forEach(c => {
      if (c && c.name === '__ml_fill__') {
        mesh.remove(c);
        try { c.geometry && c.geometry.dispose(); c.material && c.material.dispose(); } catch (e) {}
      }
    });

    const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.08, depthWrite: false }));
    fill.raycast = () => {};
    fill.name = '__ml_fill__';
    mesh.add(fill);

    // `_fillRef` — `_` bilan boshlangani uchun saqlashda tashlanadi,
    // `syncSize` esa aynan shunga tayanadi.
    mesh.userData._fillRef     = fill;
    mesh.userData.colliderMode = 'inline';
    syncSize(mesh);
    return mesh;
  }

  function create(pos) {
    const s = 3;
    const geo = new THREE.BoxGeometry(s, s, s);
    const mat = new THREE.MeshBasicMaterial({ color: 0x39ff14, wireframe: true, transparent: true, opacity: 0.65 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false; mesh.receiveShadow = false;

    const fill = new THREE.Mesh(new THREE.BoxGeometry(s, s, s),
      new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.08, depthWrite: false }));
    fill.raycast = () => {};
    fill.name = '__ml_fill__';
    mesh.add(fill);

    mesh.position.copy(pos || new THREE.Vector3(0, 1.5, 0));
    mesh.userData = Object.assign({ id: ++objIdC, name: 'Map Loader ' + (++_mlIdC) }, _defaultData());
    mesh.userData.colliderMode = 'inline';   // o'yinchi o'tadi (trigger)
    mesh.userData._fillRef = fill;

    scene.add(mesh);
    objects.push(mesh);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof selectObject === 'function') selectObject(mesh);
    if (typeof updateStats === 'function') updateStats();
    if (typeof captureState === 'function') captureState('Map Loader qo\'shildi');
    log('🗺 <span style="color:var(--accent3)">' + mesh.userData.name + '</span> qo\'shildi [karta almashtirish]', 'lok');
    return mesh;
  }

  function syncSize(ml) {
    const s = ml.userData.triggerSize || { x: 3, y: 3, z: 3 };
    // ⚠ Ilgari bu yerda `ml.scale.set(1,1,1)` turardi — gizmo bilan
    //   bergan scale'ingiz Inspector'da o'lchamni tahrirlashingiz bilan
    //   yo'qolib ketardi. Trigger endi lokal fazoda tekshirilgani uchun
    //   scale ham, burilish ham to'g'ri hisobga olinadi.
    if (ml.geometry) ml.geometry.dispose();
    ml.geometry = new THREE.BoxGeometry(s.x, s.y, s.z);
    const fill = ml.userData._fillRef;
    if (fill) { if (fill.geometry) fill.geometry.dispose(); fill.geometry = new THREE.BoxGeometry(s.x, s.y, s.z); }
  }

  // ══════════════════════════════════════════════════════════
  //  ♻️ RESURS BOSHQARUVI — tekstura keshi + dispose
  // ----------------------------------------------------------
  //  Ilgari har obyekt o'z teksturasini ZIP'dan qayta dekod qilib,
  //  alohida GPU teksturasi yaratardi (50 obyekt × wood.png = 50 nusxa),
  //  va karta o'chganда HECH NARSA dispose qilinmasdi — ya'ni har
  //  portal siklida butun karta GPU xotirasida qolib ketardi.
  // ══════════════════════════════════════════════════════════
  const _texCache = new Map();      // 'wood.png' → THREE.Texture

  // ZIP ichidagi teksturani BIR MARTA dekod qilib keshlaymiz
  async function _getTex(zip, file) {
    if (_texCache.has(file)) return _texCache.get(file);
    const entry = zip.file(file);
    if (!entry) return null;
    const b64 = await entry.async('base64');
    const ext = (file.split('.').pop() || 'png').toLowerCase();
    const tex = new THREE.TextureLoader().load(
      `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${b64}`);
    if ('colorSpace' in tex && THREE.SRGBColorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    _texCache.set(file, tex);
    return tex;
  }

  const _TEX_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap',
                      'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'lightMap'];

  function _isCached(tex) {
    for (const t of _texCache.values()) if (t === tex) return true;
    return false;
  }

  // Bitta karta obyektini to'liq bo'shatish (bolalari bilan).
  // ⚠ Keshdagi teksturalarga TEGMAYMIZ — ular boshqa obyektlarda ham
  //   ishlatilishi mumkin. Ularni _gcTextures() hal qiladi.
  function _disposeMapObject(o) {
    if (!o || !o.traverse) return;
    o.traverse(n => {
      if (n.geometry) { try { n.geometry.dispose(); } catch(e) {} }
      const mats = Array.isArray(n.material) ? n.material : (n.material ? [n.material] : []);
      for (const m of mats) {
        if (!m) continue;
        for (const k of _TEX_SLOTS) {
          const t = m[k];
          if (t && t.dispose && !_isCached(t)) { try { t.dispose(); } catch(e) {} }
        }
        try { m.dispose(); } catch(e) {}
      }
    });
  }

  // Keshdagi, endi hech kim ishlatmaydigan teksturalarni bo'shatamiz.
  // (keepElements bilan qolgan obyektlarning teksturasi saqlanadi)
  function _gcTextures() {
    if (!_texCache.size) return;
    const inUse = new Set();
    for (const o of objects) {
      if (!o || !o.traverse) continue;
      o.traverse(n => {
        const mats = Array.isArray(n.material) ? n.material : (n.material ? [n.material] : []);
        for (const m of mats) {
          if (!m) continue;
          for (const k of _TEX_SLOTS) if (m[k]) inUse.add(m[k]);
        }
      });
    }
    let freed = 0;
    for (const [file, tex] of [..._texCache]) {
      if (inUse.has(tex)) continue;
      try { tex.dispose(); } catch(e) {}
      _texCache.delete(file);
      freed++;
    }
    if (freed) log(`♻️ ${freed} ta tekstura bo'shatildi`, 'lw');
  }

  // ── base64 <-> bytes ──
  function _b64ToBytes(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function _bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  // ── Loading screen ──
  function _showLoadingScreen(cfg) {
    _hideLoadingScreen();
    if (!cfg || cfg.type === 'none') return;
    const ov = document.createElement('div');
    ov.id = 'ml-loading-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
                       'background:#000;color:#fff;font-family:Rajdhani,sans-serif;overflow:hidden';
    if (cfg.type === 'image' && cfg.content) {
      ov.innerHTML = `<img src="${_esc(cfg.content)}" style="max-width:100%;max-height:100%;object-fit:contain">`;
    } else if (cfg.type === 'video' && cfg.content) {
      ov.innerHTML = `<video src="${_esc(cfg.content)}" autoplay muted loop playsinline style="max-width:100%;max-height:100%;object-fit:contain"></video>`;
    } else if (cfg.type === 'html') {
      ov.innerHTML = cfg.content || '<div style="font-size:24px;letter-spacing:2px">YUKLANMOQDA…</div>';
    } else {
      ov.innerHTML = '<div style="font-size:24px;letter-spacing:2px">YUKLANMOQDA…</div>';
    }
    document.body.appendChild(ov);
  }
  function _hideLoadingScreen() {
    const ov = document.getElementById('ml-loading-overlay');
    if (ov) ov.remove();
  }
  function _esc(s) { return String(s).replace(/"/g, '&quot;'); }

  // ── Faol o'yinchini topish (FPS playerMesh yoki maxsus PlayerController) ──
  // ⚠ Tartib Hitbox / PC block / Interactive Button bilan BIR XIL:
  //   avval PlayerController.obj. Ilgari bu yerda playerMesh birinchi
  //   turardi — custom player model ishlatilganда trigger noto'g'ri
  //   obyektni kuzatib, umuman ishlamay qolishi mumkin edi.
  function _getPlayerRef() {
    if (typeof PlayerController !== 'undefined' && PlayerController.obj) return PlayerController.obj;
    if (typeof playerMesh !== 'undefined' && playerMesh) return playerMesh;
    return null;
  }

  // ── Runtime: o'yinchi kirishini aniqlash ──
  function update(delta) {
    const playing = (typeof isPlaying !== 'undefined' && isPlaying) ||
                    (typeof window !== 'undefined' && window.isPlaying);

    if (!playing) {
      if (_wasPlaying) {
        // o'yin to'xtadi — yuklangan kartani o'chirib, eski sahnani tiklaymiz
        _restoreScene();
        _wasPlaying = false;
      }
      // O'yin tugadi — preview obyektlarini qaytaramiz
      if (_prevHidden) {
        _prevHidden = false;
        for (const o of objects) if (o.userData && o.userData._mlPrevObj) o.visible = true;
      }
      // Zona editorда KO'RINADI + holat tozalanadi (bitta sikl)
      for (const o of objects) {
        if (!o.userData || !o.userData.isMapLoader) continue;
        o.visible = true;
        o.userData._mlInside    = false;
        o.userData._mlMapLoaded = false;
        o.userData._mlLoading   = false;
      }
      return;
    }
    // ⚠ Preview o'yin paytida VAQTINCHA yashiriladi (o'chirilmaydi!).
    //   Ilgari Play bosilganда u saqlanib YOPILARDI — bu noto'g'ri edi:
    //   developer Play bosib qaytsa, preview yo'qolib, ikkala karta bilan
    //   ishlash imkoni yo'qolardi.
    if (!_prevHidden && anyPreview()) {
      _prevHidden = true;
      for (const o of objects) if (o.userData && o.userData._mlPrevObj) o.visible = false;
    }
    _wasPlaying = true;
    const player = _getPlayerRef();
    if (!player) return;
    player.updateMatrixWorld(true);
    const pp = _tmpP.setFromMatrixPosition(player.matrixWorld);

    for (const o of objects) {
      if (!o.userData || !o.userData.isMapLoader) continue;
      // 🚫 Yashirilgan KARTA ichidagi map loader ishlamasin — aks holda
      //   karta yopilgandan keyin ham ko'rinmas trigger o'yinchini
      //   boshqa kartaga tashlab yuborardi.
      if (o.userData._mlOff) continue;
      o.visible = false;                      // o'yinда zona ko'rinmas (hitbox kabi)

      const s = o.userData.triggerSize || { x: 3, y: 3, z: 3 };
      o.updateMatrixWorld(true);

      // ⚠ LOKAL FAZODA tekshiramiz. Ilgari dunyo koordinatasidagi oddiy
      //   AABB ishlatilardi — zonani bursangiz yoki scale bersangiz,
      //   ko'rinadigan yashil kub bilan haqiqiy trigger hududi mos
      //   kelmasdi. matrixWorld ning teskarisi burilish VA scale ni
      //   birga hisobga oladi → hudud aynan kubning o'zi.
      _tmpM.copy(o.matrixWorld).invert();
      const lp = _tmpL.copy(pp).applyMatrix4(_tmpM);
      const isInside = (Math.abs(lp.x) <= s.x * 0.5 &&
                        Math.abs(lp.y) <= s.y * 0.5 &&
                        Math.abs(lp.z) <= s.z * 0.5);

      if (isInside && !o.userData._mlInside) {
        // ── KIRDI ──
        o.userData._mlInside = true;
        if (o.userData._mlLoading) continue;   // yuklash ketyapti — tegmaymiz

        if (o.userData.autoUnload) {
          // Har KIRISHда almashtiradi: 1-kirish yuklaydi, 2-kirish o'chiradi.
          // (Chiqishда o'chirmaymiz — kichik zona/teleport tufayli darrov
          //  o'chib qolmasin; karta portal'ga qayta kirmaguncha turadi.)
          if (!o.userData._mlMapLoaded) _beginLoad(o);
          else {
            o.userData._mlMapLoaded = false;
            log('🗺 Map Loader — eski kartaga qaytilmoqda (yangi karta yashirilyapti)…', 'lw');
            _unloadMap(o);
          }
        } else if (!o.userData._mlMapLoaded) {
          // Faqat bir marta yuklaydi (o'yin to'xtaguncha turadi)
          _beginLoad(o);
        } else {
          // ⚠ Ilgari bu shox JIM edi: o'yinchi qayta kiradi, hech narsa
          //   bo'lmaydi, konsolда ham hech nima. Endi sababi aytiladi.
          log('🗺 Karta allaqachon yuklangan — qayta kirish hech narsa qilmaydi. ' +
              'Eski kartaga qaytish uchun Map Loader → AUTO belgisini yoqing.', 'lw');
        }
      } else if (!isInside && o.userData._mlInside) {
        // ── CHIQDI ── (faqat holatni yangilaymiz — karta o'chmaydi)
        o.userData._mlInside = false;
      }
    }
  }

  // ⚠ _loadMap — async, lekin update() uni kutmaydi. Ilgari
  //   `_mlMapLoaded = true` yuklashdan OLDIN qo'yilardi: yuklash xato
  //   bersa ham `true` qolib ketib, autoUnload mantiqi teskari bo'lardi
  //   (kirsangiz — hech qachon yuklanmagan kartani "o'chirishga" urinardi).
  //   Endi bayroq FAQAT muvaffaqiyatда qo'yiladi, va _mlLoading qo'riqchisi
  //   yuklash tugamaguncha qayta chaqirishga yo'l bermaydi.
  function _beginLoad(o) {
    o.userData._mlLoading = true;
    log('🗺 Map Loader — karta yuklanmoqda…', 'lok');
    _loadMap(o)
      .then(ok => { o.userData._mlMapLoaded = !!ok; })
      .catch(() => { o.userData._mlMapLoaded = false; })
      .finally(() => { o.userData._mlLoading = false; });
  }

  let _wasPlaying = false;
  let _prevHidden = false;
  const _tmpP = new THREE.Vector3();
  const _tmpL = new THREE.Vector3();
  const _tmpM = new THREE.Matrix4();

  // ══════════════════════════════════════════════════════════
  //  👁 PREVIEW — kartani EDITORда ko'rish va TAHRIRLASH
  // ----------------------------------------------------------
  //  Muammo: Map Loader qo'yilganда developer kartani ko'rmaydi —
  //  uni faqat o'yinchi, o'yin paytida, portalga kirib ko'radi.
  //  Ya'ni kartani sozlash uchun har safar Play bosish kerak edi.
  //
  //  Yechim: karta sahnaning CHEKASIGA (mavjud obyektlardan nariga)
  //  spawn qilinadi. U yerda uni odatdagidek tahrirlaysiz — surasiz,
  //  o'chirasiz, yangi obyekt qo'shasiz, timeline chizasiz.
  //  Preview'ni o'chirganда — o'zgarishlar ZIP'ga QAYTA YOZILADI.
  //
  //  Timeline: karta treklari TimelineSystem'ga `_mlTrack` bilan
  //  qo'shiladi — ya'ni sahna timeline'i bilan BIRLASHADI. Shuning
  //  uchun karta ichidagi hitbox/tugma tashqaridagi obyektni ham
  //  animatsiya qila oladi (va aksincha).
  // ══════════════════════════════════════════════════════════

  // ── Preview uchun eski sahnani yashirish ────────────────────
  //  ⚠ NEGA ALOHIDA RO'YXAT (_hideOldMap dagi `_hiddenObjs` emas):
  //    preview — EDITOR narsasi va Play/Stop dan keyin ham ochiq
  //    turishi mumkin. Bitta ro'yxatni baham ko'rsak, o'ynash
  //    rejimining `_showOldMap()` i preview yashirganlarini ham
  //    tiklab, ro'yxatni bo'shatib yuborardi — keyin previewOff
  //    hech nimani qaytara olmasdi.
  let _prevHiddenObjs = [];

  // Sahnada haqiqiy (statik) zamin bormi?
  //  Preview zamini KERAKMI yoki yo'qmi — shuni hal qiladi.
  function _hasStaticGround() {
    for (const o of objects) {
      if (!o || !o.userData) continue;
      if (o.userData._mlPrevObj || o.userData._mlLoaded) continue;
      if (o.userData.isStatic || o.userData.type === 'Tekislik') return true;
    }
    return false;
  }

  function _hideSceneForPreview() {
    let n = 0;
    for (const o of objects) {
      if (!o || !o.userData) continue;
      // O'ynash rejimidagi _hideOldMap bilan BIR XIL filtr — preview
      // aynan o'sha ko'rinishni bersin. Zamin ikkalasida ham qoladi.
      if (o.userData.isStatic)      continue;   // zamin QOLADI — umumiy
      if (o.userData.isPlayer)      continue;
      if (o.userData.isPlayerObj)   continue;
      if (o.userData.isMapLoader)   continue;   // loader ko'rinib tursin (tanlangan)
      if (o.userData._mlPrevObj)    continue;   // preview obyektining o'zi
      if (o.userData._mlLoaded)     continue;   // o'ynash rejimidagi karta
      if (o.userData._mlPrevHidden) continue;   // allaqachon
      _prevHiddenObjs.push({ obj: o, vis: o.visible, cm: o.userData.colliderMode });
      o.userData._mlPrevHidden = true;
      o.visible = false;
      o.userData.colliderMode = 'inline';       // yashirin obyekt to'qnashmasin
      n++;
    }
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    return n;
  }

  function _showSceneAfterPreview() {
    let n = 0;
    for (const h of _prevHiddenObjs) {
      if (!h.obj) continue;
      h.obj.visible = (h.vis !== undefined) ? h.vis : true;
      if (h.cm === undefined || h.cm === null) delete h.obj.userData.colliderMode;
      else h.obj.userData.colliderMode = h.cm;
      delete h.obj.userData._mlPrevHidden;
      n++;
    }
    _prevHiddenObjs = [];
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    return n;
  }

  async function previewOn(ml) {
    const ud = ml.userData;
    if (ud._mlPreview) return false;
    if (!ud.mapB64)  { log('⚠ Avval kartani import qiling', 'lw'); return false; }
    if (typeof JSZip === 'undefined') { log('❌ JSZip mavjud emas', 'le'); return false; }

    try {
      const zip = await JSZip.loadAsync(_b64ToBytes(ud.mapB64));
      const mapData = await _readManifest(zip);
      if (!mapData) { log('❌ ZIP ichida timeline.json / apex-file.json topilmadi', 'le'); return false; }
      if (!Array.isArray(mapData.objects)) { log("❌ Karta formati noto'g'ri", 'le'); return false; }

      // ⚠ Anchor SPAWN'DAN OLDIN o'lchanadi — aks holda hali siljitilmagan
      //   yangi obyektlar ham bounding box'ga kirib, markazni buzardi.
      const _anchor = _oldMapAnchor();
      const { idMap } = await _spawnManifest(zip, mapData, ud.collision || 'original', []);

      // Karta ESKI KARTA O'RNIGA qo'yiladi (ilgari `_previewSpot()` uni
      // zamin YONIGA, x≈26 ga surardi). Endi preview o'ynash rejimi bilan
      // bir xil ko'rinadi: A yo'qoladi, B uning o'rnida turadi.
      // ⚠ STANDART: SILJITILMAYDI — obyektlar saqlangan koordinatalarida
      //   qoladi. Ikkala karta ham odatda bir xil dunyo fazosida (koordinata
      //   boshi atrofida) yasaladi, shuning uchun ular o'z-o'zidan mos tushadi.
      //
      //   Ilgari karta MAJBURAN eski karta markaziga tenglashtirilardi:
      //   yangi kartaning bounding box markazi eski kartanikiga ko'chirilardi.
      //   Natijada obyektlar o'z joyidan chiqib, kartaning chetiga siljib
      //   qolardi — ayniqsa kartada obyekt kam bo'lsa (bbox kichik va
      //   nosimmetrik). Endi buni foydalanuvchi ATAYLAB yoqadi.
      const off = (ud.alignToOld ? _mapSpawnOffset(idMap, _anchor) : null)
                  || new THREE.Vector3();

      // Eski sahnani yashiramiz — aks holda ikki karta bir joyda
      // ustma-ust tushib, aralashib ketardi.
      const _hid = _hideSceneForPreview();

      // Chekaga surib qo'yamiz. Siljish ESLAB QOLINADI — qayta
      // saqlashда ayiriladi, aks holda karta har preview'da uzoqlashib
      // ketaverardi.
      const list = [];
      for (const k in idMap) {
        const o = idMap[k];
        o.position.add(off);
        // ⚠ ALOHIDA bayroq! Ilgari bu ham `_mlPreview` edi — Map Loader'ning
        //   O'ZIDA ham `_mlPreview` bor (holat belgisi), shuning uchun
        //   previewOff() Map Loader'ni ham o'chirib yuborardi.
        o.userData._mlPrevObj = true;
        // ⚠ `_mlLoaded` ni OLIB TASHLAYMIZ. U "o'yin paytida yuklangan
        //   karta" degani va _restoreScene() uni Stop bosilganда o'chiradi.
        //   Preview esa editor narsasi — Play/Stop dan keyin ham TURISHI
        //   kerak, aks holda developer ikkala karta bilan ishlay olmaydi.
        delete o.userData._mlLoaded;
        list.push(o);
      }

      // ── 🟫 Preview tagiga vaqtinchalik zamin ──
      //    ⚠ FAQAT sahnada haqiqiy zamin bo'lmasa. Zamin yashirilmaydi —
      //      u ikkala kartaga umumiy. Yana bitta zamin yasasak, ikkalasi
      //      ustma-ust tushib z-fighting (miltillash) berardi.
      //    `_mlPrevGround` — ZIP'ga SAQLANMAYDI (_writeBack uni chetlab o'tadi).
      if (list.length && !_hasStaticGround()) {
        const bb = new THREE.Box3();
        for (const o of list) { try { bb.expandByObject(o); } catch(e) {} }
        if (isFinite(bb.min.x)) {
          const sz = bb.getSize(new THREE.Vector3());
          const ct = bb.getCenter(new THREE.Vector3());
          const pad = 4;
          const g = new THREE.Mesh(
            new THREE.BoxGeometry(Math.max(4, sz.x + pad * 2), 0.4, Math.max(4, sz.z + pad * 2)),
            new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.95, metalness: 0 }));
          g.position.set(ct.x, bb.min.y - 0.2, ct.z);
          g.receiveShadow = true;
          g.userData = {
            id: ++objIdC, name: 'preview-zamin', type: 'Kub',
            isStatic: true, _mlPrevObj: true, _mlPrevGround: true,
          };
          scene.add(g); objects.push(g); list.push(g);
        }
      }

      _registerMapTimeline(mapData, idMap, off);   // ⚠ keyframe'lar ham siljiydi

      ud._mlPreview     = true;
      ud._previewZip    = zip;
      ud._previewMf     = mapData;
      ud._previewOffset = off.clone();
      ud._previewObjs   = list;

      // ⚠ HitboxSystem.create() / InteractiveButtonSystem.create() /
      //   addCameraObject() — uchalasi ham ichida selectObject() chaqiradi.
      //   Ya'ni kartada hitbox/tugma/kamera bo'lsa, tanlov Map Loader'dan
      //   o'sha obyektga o'tib ketardi: Inspector boshqa panelni ko'rsatib,
      //   👁 tugma ko'zdan yo'qolardi va _mlSel() null qaytarardi —
      //   "faqat bir marta ishlaydi" muammosi shundan edi.
      if (typeof selectObject === 'function') selectObject(ml);

      if (typeof updateHierarchy === 'function') updateHierarchy();
      log(`👁 "${ud.mapName || 'karta'}" preview ochildi — ${list.length} obyekt` +
          (off.x || off.z
            ? ` — eski karta markaziga tenglashtirildi (Δx=${off.x.toFixed(1)}, Δz=${off.z.toFixed(1)})`
            : ' — siljitish shart emas') +
          (_hid ? `, eski sahna yashirildi (${_hid} obyekt)` : ''), 'lok');
      log('   Tahrirlang. Yopganда o\'zgarishlar ZIP\'ga saqlanadi.', 'lok');
      return true;
    } catch (e) {
      log('❌ Preview xatosi: ' + (e.message || e), 'le');
      return false;
    }
  }

  // ── B) O'zgarishlarni ZIP'ga QAYTA YOZISH ──
  //  ⚠ ZIP'ni to'liq qayta qurmaymiz — faqat `timeline.json`ni.
  //    models/ textures/ sounds/ o'zgarishsiz qoladi (GLB'ni qayta
  //    serializatsiya qilish shart emas, sifat ham yo'qolmaydi).
  async function _writeBack(ml) {
    const ud = ml.userData;
    const zip = ud._previewZip, mf = ud._previewMf;
    if (!zip || !mf) return false;
    const off = ud._previewOffset || new THREE.Vector3();

    // Hali sahnada turgan preview obyektlari (o'chirilganlari tushib qoladi)
    // ⚠ `_mlPrevGround` — preview uchun yasalgan vaqtinchalik zamin.
    //   U kartaning bir qismi EMAS, ZIP'ga yozilmasligi shart.
    const live = objects.filter(o => o.userData && o.userData._mlPrevObj && !o.userData._mlPrevGround);
    const bySrc = new Map();
    for (const od of mf.objects) bySrc.set(String(od.id), od);

    const out = [];
    for (const o of live) {
      const ud2 = o.userData;
      // Asl yozuvni asos qilamiz — textureFile, modelFile, hitbox
      // sozlamalari va h.k. saqlanib qolsin.
      const src = ud2._mlSrcId != null ? bySrc.get(String(ud2._mlSrcId)) : null;
      const od = src ? JSON.parse(JSON.stringify(src)) : { id: ud2.id, type: ud2.type || 'Mesh' };

      od.name     = ud2.name;
      od.position = { x: o.position.x - off.x, y: o.position.y - off.y, z: o.position.z - off.z };
      od.rotation = { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z };
      od.scale    = { x: o.scale.x, y: o.scale.y, z: o.scale.z };

      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m && m.color) {
        od.color     = '#' + m.color.getHexString();
        if (m.roughness != null) od.roughness = m.roughness;
        if (m.metalness != null) od.metalness = m.metalness;
      }
      od.colliderMode = ud2.colliderMode === 'inline' ? 'inline' : undefined;

      // Hitbox / tugma sozlamalari — jonli holatдан
      if (ud2.isHitbox) {
        od.isHitbox = true;
        if (ud2.hitboxSize)  od.hitboxSize  = ud2.hitboxSize;
        if (ud2.triggerType) od.triggerType = ud2.triggerType;
        if (ud2.actions) { try { od.actions = JSON.parse(JSON.stringify(ud2.actions)); } catch(e) {} }
      }
      out.push(od);
    }

    // Timeline — birlashgan treklardan FAQAT karta treklarini olamiz
    const tracks = [];
    if (typeof TimelineSystem !== 'undefined' && Array.isArray(TimelineSystem.tracks)) {
      for (const t of TimelineSystem.tracks) {
        if (!t || !t._mlTrack || !t.objRef) continue;
        const srcId = t.objRef.userData && t.objRef.userData._mlSrcId;
        if (srcId == null) continue;
        // Keyframe pozitsiyalari ham siljishsiz saqlanadi
        const kfs = (t.keyframes || []).map(k => {
          const c = JSON.parse(JSON.stringify(k));
          if (c.pos) { c.pos.x -= off.x; c.pos.y -= off.y; c.pos.z -= off.z; }
          return c;
        });
        tracks.push({ objId: srcId, objName: t.objName, keyframes: kfs, loop: !!t.loop });
      }
    }

    mf.objects  = out;
    mf.timeline = { tracks };
    mf.exportDate = new Date().toISOString();
    zip.file('timeline.json', JSON.stringify(mf, null, 2));
    ud.mapB64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    ud.mapObjectNames = out.map(o => o.name).filter(Boolean);
    log(`💾 Karta saqlandi — ${out.length} obyekt, ${tracks.length} trek`, 'lok');
    return true;
  }

  //  ⚠ Bu funksiya HAR QANDAY holatда preview'ni yopishi SHART.
  //     Ilgari sikl ICHIDA selectObject(null) chaqirilardi — u
  //     updateInspector() ni ishga tushiradi, va o'sha yerda istisno
  //     chiqsa sikl yarmida uzilib qolardi: saqlash bo'lgan, obyektlar
  //     esa sahnada qolib ketardi ("saqlasa ham turibdi").
  //     Endi: ro'yxat OLDIN yig'iladi → o'chirish hech narsa chaqirmaydi
  //     → tanlov va UI sikldan KEYIN → hammasi try/finally ichida.
  async function previewOff(ml, save) {
    const ud = ml.userData;
    if (!ud._mlPreview) return;
    ud._mlPreview = false;               // darrov — qayta kirishga yo'l yo'q

    try {
      if (save !== false) {
        try { await _writeBack(ml); }
        catch (e) { log('❌ Saqlashда xato: ' + (e.message || e), 'le'); }
      }
      try { _clearMapTimeline(); } catch (e) {}

      // 1) Ro'yxatni oldin yig'amiz
      const doomed = objects.filter(o => o.userData && o.userData._mlPrevObj);
      // 2) Faqat o'chiramiz — bu yerда hech qanday UI chaqirilmaydi
      for (const o of doomed) {
        const i = objects.indexOf(o);
        if (i >= 0) objects.splice(i, 1);
        if (o.parent) o.parent.remove(o);
        try { _disposeMapObject(o); } catch (e) {}
      }
      try { _gcTextures(); } catch (e) {}
      log(`👁 Preview yopildi — ${doomed.length} obyekt olib tashlandi`, 'lw');
    } finally {
      // ⚠ ESKI SAHNANI HAR HOLDA QAYTARAMIZ — yuqorida istisno chiqsa ham.
      //   Bunsiz preview yopilgach developer bo'm-bo'sh dunyoda qolardi.
      try {
        const _back = _showSceneAfterPreview();
        if (_back) log(`   ↩ Sahna qaytdi (${_back} obyekt)`, 'lok');
      } catch (e) {}
      // 3) UI va tanlov — HAR HOLDA
      ud._previewZip = null; ud._previewMf = null;
      ud._previewObjs = null; ud._previewOffset = null;
      try {
        if (typeof selectObject === 'function' && objects.includes(ml)) selectObject(ml);
        else if (typeof updateInspector === 'function') updateInspector();
      } catch (e) {}
      try { if (typeof updateHierarchy === 'function') updateHierarchy(); } catch (e) {}
      try { if (typeof updateStats === 'function') updateStats(); } catch (e) {}
      try { if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty(); } catch (e) {}
    }
  }

  // ══════════════════════════════════════════════════════════
  //  🔀 Obyektni kartaga KIRITISH / CHIQARISH (ierarxiya drag&drop)
  // ----------------------------------------------------------
  //  Preview obyektlari sahnadan `_previewOffset` ga siljitilgan
  //  fazoda yashaydi (_writeBack uni ayiradi). Shuning uchun obyekt
  //  chegaradan o'tganда pozitsiyasini ham ko'chiramiz — aks holda
  //  kartaga qo'shilgan kub ZIP'ga `-off` da, ya'ni kartadan
  //  o'nlab metr narida saqlanib qolardi.
  // ══════════════════════════════════════════════════════════
  function _activePreview() {
    return objects.find(o => o.userData && o.userData.isMapLoader && o.userData._mlPreview) || null;
  }

  // Sahna → karta
  function addToMap(obj) {
    const ml = _activePreview();
    if (!ml) { log('⚠ Avval Map Loader\'da 👁 Kartani ko\'rish ni yoqing', 'lw'); return false; }
    if (!obj || !obj.userData || obj.userData._mlPrevObj) return false;
    if (obj.userData.isMapLoader) { log('⚠ Map Loader\'ni kartaga solib bo\'lmaydi', 'lw'); return false; }
    if (obj.userData.isPlayerObj || obj.userData.isStatic) { log('⚠ Zamin/o\'yinchini kartaga solib bo\'lmaydi', 'lw'); return false; }

    const off = ml.userData._previewOffset || new THREE.Vector3();
    obj.position.add(off);                 // karta fazosiga ko'chiramiz
    obj.userData._mlPrevObj = true;
    obj.userData._mlSrcId   = null;        // manifestда yo'q — YANGI obyekt
    obj.userData.parentId   = null;        // ildizga chiqaramiz
    delete obj.userData._mlLoaded;
    if (typeof updateHierarchy === 'function') updateHierarchy();
    log(`➕ "${obj.userData.name}" kartaga qo'shildi — yopganда ZIP'ga saqlanadi`, 'lok');
    return true;
  }

  // Karta → sahna
  function removeFromMap(obj) {
    const ml = _activePreview();
    if (!obj || !obj.userData || !obj.userData._mlPrevObj) return false;
    if (obj.userData._mlPrevGround) { log('⚠ preview-zamin — vaqtinchalik, ko\'chirib bo\'lmaydi', 'lw'); return false; }

    const off = (ml && ml.userData._previewOffset) || new THREE.Vector3();
    obj.position.sub(off);                 // sahna fazosiga qaytaramiz
    delete obj.userData._mlPrevObj;
    delete obj.userData._mlSrcId;
    if (typeof updateHierarchy === 'function') updateHierarchy();
    log(`➖ "${obj.userData.name}" kartadan chiqarildi — ZIP'ga saqlanmaydi`, 'lw');
    return true;
  }

  function anyPreview() {
    return objects.some(o => o.userData && o.userData.isMapLoader && o.userData._mlPreview);
  }
  async function closeAllPreviews(save) {
    for (const o of [...objects]) {
      if (o.userData && o.userData.isMapLoader && o.userData._mlPreview) await previewOff(o, save);
    }
  }

  // ── Kartani yuklash ──
  //  Qaytaradi: true — karta yuklandi | false — yuklanmadi (xato).
  //  _beginLoad shu javobga qarab `_mlMapLoaded` ni belgilaydi.
  // ── Keyframe'larni siljitish (umumiy yordamchi) ─────────────
  //  ⚠ NEGA ALOHIDA: ilgari bu mantiq faqat _registerMapTimeline
  //    ichida edi, _playMapAnim esa manifestdagi XOM keyframe'larni
  //    o'qirdi. Karta siljitilганда animatsiya obyektni darhol asl
  //    (uzoq) koordinataga tortib ketardi. Endi ikkalasi bitta
  //    funksiyadan foydalanadi.
  function _offsetKfs(kfs, off) {
    if (!off || !Array.isArray(kfs)) return kfs;
    return kfs.map(k => {
      const c = JSON.parse(JSON.stringify(k));
      if (c.pos) { c.pos.x += off.x; c.pos.y += off.y; c.pos.z += off.z; }
      return c;
    });
  }

  // ── Eski kartaning "o'rni" ──────────────────────────────────
  //  Eski karta = o'yinchi editorда qurgan sahna (zamin + kublar...).
  //  Yangi karta shu joyga qo'yiladi.
  //  ⚠ SPAWN'DAN OLDIN chaqirilishi SHART — aks holda hali
  //    siljitilmagan yangi obyektlar ham bounding box'ga kirib,
  //    markazni buzib yuboradi.
  function _oldMapAnchor() {
    const box = new THREE.Box3(); let has = false;
    for (const o of objects) {
      if (!o || !o.userData) continue;
      if (o.userData.isMapLoader)  continue;   // loader o'zi sanalmasin
      if (o.userData._mlPrevObj)   continue;   // preview — editor narsasi
      if (o.userData._mlLoaded)    continue;   // boshqa kartaning obyekti
      if (o.userData._mlKept)      continue;   // ⚠ oldingi kartadan qolgan element.
                                               //   Hisobga olinsa, anchor har
                                               //   kartada bir oz siljib, karta
                                               //   asta-sekin "sudralib" ketardi.
      if (o.userData.isPlayer)     continue;
      if (o.userData.isPlayerObj)  continue;
      // ⚠ ZAMIN SANALMASIN. U ulkan tekislik (±25 va undan katta) va
      //   bounding box ni butunlay o'ziga tortadi — natijada anchor
      //   sahnadagi haqiqiy obyektlarга emas, zamin markaziga tenglashadi.
      if (o.userData.isStatic)     continue;
      // ⚠ Suyaklar ham sanalmasin: ular `objects[]` da (timeline uchun),
      //   lekin modelning ICHIDA — alohida hisobga olinsa bir obyekt
      //   o'nlab marta og'irlik qiladi.
      if (o.isBone || o.userData.isBone) continue;
      try { o.updateMatrixWorld(true); box.expandByObject(o); has = true; } catch(e) {}
    }
    if (!has || !isFinite(box.max.x)) return null;
    const c = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(c.x, 0, c.z);
  }

  // ── Yangi karta markazi → anchor ustiga keladigan siljish ───
  //  ⚠ Y TEGILMAYDI (off.y = 0). Kartalar odatda zamini y≈0 da
  //    bo'ladigan qilib yaratiladi; Y ni ham markazlash kartani
  //    yerga ko'mib yoki havoga ko'tarib qo'yardi. Muammo gorizontal
  //    ("yonidan chiqadi") — shuning uchun faqat X/Z tuzatiladi.
  function _mapSpawnOffset(idMap, anchor) {
    if (!anchor) return null;
    const box = new THREE.Box3(); let has = false;
    for (const k in idMap) {
      const o = idMap[k];
      if (!o) continue;
      try { o.updateMatrixWorld(true); box.expandByObject(o); has = true; } catch(e) {}
    }
    if (!has || !isFinite(box.max.x)) return null;
    const c = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(anchor.x - c.x, 0, anchor.z - c.z);
  }

  // ── Kartani YASHIRISH / KO'RSATISH (A↔B tez almashish) ──────
  //  ⚠ NEGA O'CHIRMAYMIZ: ilgari _unloadMap kartani butunlay o'chirib
  //    tashlardi (scene.remove + dispose). Har qayta kirishда ZIP
  //    qaytadan parse qilinar, GLB qaytadan dekod qilinar, teksturalar
  //    qaytadan yuklanardi — sekin va isrof. Endi karta sahnada
  //    QOLADI, faqat yashiriladi. Eski karta bilan bir xil mexanizm.
  //
  //  Tozalash NUQTASI bitta: `_restoreScene()` (Stop bosilganда).
  //  Ya'ni karta o'yin davomida xotirada turadi — bu ATAYLAB.

  function _hideMapObjects(ml) {
    const ud = ml.userData;
    const keep    = Array.isArray(ud.keepElements) ? ud.keepElements : [];
    const reverse = !!ud.keepReverse;
    const list = Array.isArray(ud._mlHiddenMap) ? ud._mlHiddenMap : (ud._mlHiddenMap = []);
    let hidden = 0, kept = 0;
    for (const o of objects) {
      if (!o || !o.userData || !o.userData._mlLoaded) continue;
      const inList     = keep.indexOf(o.userData.name) !== -1;
      const shouldKeep = reverse ? !inList : inList;
      if (shouldKeep) {
        // "Saqlab qolingan" element — endi kartaga emas, SAHNAGA tegishli.
        // Ko'rinib turaveradi va _hideOldMap uni chetlab o'tadi (_mlKept).
        o.userData._mlLoaded = false;
        o.userData._mlKept   = true;
        kept++;
        continue;
      }
      if (o.userData._mlMapHidden) continue;
      list.push({ obj: o, vis: o.visible, cm: o.userData.colliderMode });
      o.userData._mlMapHidden = true;
      // ⚠ ENG MUHIM QATOR. Karta yopilganда uning 🪜 narvoni, 🎯 hitboxi,
      //   🔊 ovoz zonasi va 🔘 tugmalari FAQAT ko'rinmas bo'lardi —
      //   funksiyasi ishlashda DAVOM ETARDI. O'yinchi bo'sh joyda
      //   ko'rinmas narvonga yopishib qolardi.
      //
      //   `hitbox.js` da qorovul allaqachon bor edi, lekin u
      //   `_mlHidden` ni tekshirardi — bu esa ESKI sahna uchun.
      //   Karta obyektlari `_mlMapHidden` bilan belgilanadi va
      //   qorovulga tushmasdi. Endi ikkala yo'l ham BITTA bayroq
      //   qo'yadi: `_mlOff`.
      o.userData._mlOff = true;
      o.visible = false;
      o.userData.colliderMode = 'inline';   // yashirin karta bilan to'qnashmasin
      hidden++;
    }
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    return { hidden, kept };
  }

  function _showMapObjects(ml) {
    const ud = ml.userData;
    const list = Array.isArray(ud._mlHiddenMap) ? ud._mlHiddenMap : [];
    let n = 0;
    for (const h of list) {
      if (!h.obj) continue;
      h.obj.visible = (h.vis !== undefined) ? h.vis : true;
      if (h.cm === undefined || h.cm === null) delete h.obj.userData.colliderMode;
      else h.obj.userData.colliderMode = h.cm;
      delete h.obj.userData._mlMapHidden;
      delete h.obj.userData._mlOff;
      n++;
    }
    ud._mlHiddenMap = [];
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    return n;
  }

  // ── O'yinchini kartaga teleport qilish ──────────────────────
  //  ⚠ ALOHIDA funksiya: bu endi IKKI yo'ldan chaqiriladi — kartani
  //    birinchi marta yuklaganда va yashirilган kartani QAYTA
  //    ko'rsatganда. Ikkinchisida ZIP qayta parse qilinmaydi.
  function _doTeleport(ud, idMap, off) {
    const tp = ud.teleport || {};
    if (!tp.enabled) return;
    const player = _getPlayerRef();
    if (!player) return;
    let tx = tp.x || 0, ty = tp.y || 2, tz = tp.z || 0;
    // ⚠ Koordinata rejimi KARTA fazosida yoziladi (o'yinchi kartaning
    //   ichidagi nuqtaga tushishi kerak) — karta surilса, nuqta ham
    //   suriladi. Obyekt rejimiga TEGILMAYDI: u pastda siljitilган
    //   obyektning DUNYO pozitsiyasini o'qiydi, ya'ni offset allaqachon
    //   hisobga olingan. Ikkalasiga qo'llash = ikki marta surish.
    if (off) { tx += off.x; ty += off.y; tz += off.z; }
    if (tp.mode === 'object' && tp.object) {
      let tgt = null;
      for (const k in idMap) { const o = idMap[k]; if (o && o.userData && o.userData.name === tp.object) { tgt = o; break; } }
      if (tgt) {
        tgt.updateMatrixWorld(true);
        const wp = new THREE.Vector3().setFromMatrixPosition(tgt.matrixWorld);
        tx = wp.x; ty = wp.y + 2; tz = wp.z;   // obyekt ustidan biroz balandda
      } else {
        log(`⚠ Teleport obyekti topilmadi: ${tp.object}`, 'lw');
      }
    }
    player.position.set(tx, ty, tz);
    if (typeof playerVel !== 'undefined' && playerVel.set) playerVel.set(0, 0, 0);
  }

  /**
   * 📡 Boshqa o'yinchidan kelgan karta almashuvini takrorlaydi.
   *
   * ⚠ Karta almashuvi ENG DRASTIK hodisa: butun sahna yangilanadi.
   *   Shuning uchun u ALOHIDA sozlama bilan boshqariladi — dizayner
   *   xohlamasa har kim o'z kartasida qoladi (masalan lobbi va
   *   o'yin maydoni alohida bo'lsa).
   */
  function mpReplay(ml, m) {
    if (!ml || !ml.userData) return;
    //  ⚠ Standart YONIQ: multiplayerda odatda hamma birga
    //    o'tishi kutiladi. O'chirilsa faqat bosgan odam o'tadi.
    if (ml.userData.mpShared === false) return;
    try { _loadMap(ml); } catch (e) {}
  }

  async function _loadMap(ml) {
    //  📡 E'lon — boshqalar ham o'tsin.
    //  ⚠ SHU YERDA, yuklashdan OLDIN: yuklash sekin (zip ochiladi,
    //    teksturalar yig'iladi) va oxirida e'lon qilsak boshqalar
    //    bir necha soniya kechikib o'tardi.
    try {
      if (ml.userData.mpShared !== false &&
          window.MultiplayerSystem && MultiplayerSystem.fire &&
          ml.userData.id != null) {
        MultiplayerSystem.fire('map', { o: ml.userData.id });
      }
    } catch (e) {}

    const ud = ml.userData;

    // ── TEZ YO'L: karta allaqachon spawn qilingan, faqat yashirin ──
    //   ZIP parse / GLB dekod / tekstura yuklash — hech biri qayta
    //   qilinmaydi. A↔B almashish deyarli bir zumda bo'ladi.
    //   ⚠ Shart `_mlSpawned` — `_mlHiddenMap.length` EMAS. Agar
    //     keepElements hamma obyektni qamrasa, yashirilganlar ro'yxati
    //     bo'sh bo'lardi va ZIP behuda qayta o'qilardi.
    if (ud._mlSpawned) {
      _hideOldMap();
      const shown = _showMapObjects(ml);
      _envShow(ml);                       // 💡 karta muhiti qayta yonadi
      // Timeline treklarini qayta bog'laymiz (unload'да olib tashlangan edi).
      // ⚠ Saqlangan idMap/manifest ishlatiladi — obyektlar O'SHA obyektlar.
      if (ud._mlManifest && ud._mlIdMap) {
        _registerMapTimeline(ud._mlManifest, ud._mlIdMap, ud._loadOffset);
        if (ud.playAnim && ud.playAnim !== 'none') {
          _playMapAnim(ud, ud._mlIdMap, ud._mlManifest, ud._loadOffset);
        }
      }
      _doTeleport(ud, ud._mlIdMap || {}, ud._loadOffset);
      log(`🗺 Karta qaytdi — ${shown} obyekt (ZIP qayta o'qilmadi)`, 'lok');
      return true;
    }

    if (!ud.mapB64) { log('⚠ Map Loader: karta ZIP yuklanmagan', 'lw'); return false; }
    if (typeof JSZip === 'undefined') { log('❌ JSZip mavjud emas', 'le'); return false; }

    _showLoadingScreen(ud.loading);
    const minShow = (ud.loading && ud.loading.duration ? ud.loading.duration : 0.8) * 1000;
    const t0 = Date.now();
    try {
      const zip = await JSZip.loadAsync(_b64ToBytes(ud.mapB64));
      const mapData = await _readManifest(zip);
      if (!mapData) { log('❌ ZIP ichida timeline.json / apex-file.json topilmadi', 'le'); return false; }
      if (!Array.isArray(mapData.objects)) { log('❌ Karta formati noto\'g\'ri', 'le'); return false; }

      // 0) Eski kartaning o'rnini YASHIRISHDAN OLDIN o'lchaymiz.
      //    (Box3 ko'rinmas obyektni ham o'lchaydi, lekin tartib aniq
      //     bo'lgani ma'qul — keyinchalik _hideOldMap o'zgarsa ham buzilmaydi.)
      const _anchor = _oldMapAnchor();

      // 1) Eski kartani YASHIRAMIZ (o'chirmaymiz — o'yin to'xtaganда tiklanadi)
      _hideOldMap();
      // Saqlab qolingan (kept) obyekt nomlari — qayta yuklashда dublikat bo'lmasin
      const keptNames = objects.filter(o => o.userData && o.userData._mlKept)
                               .map(o => o.userData.name);
      // 2) Yangi kartani spawn qilamiz (kept nomlar o'tkazib yuboriladi)
      const { spawned, idMap } = await _spawnManifest(zip, mapData, ud.collision || 'original', keptNames);

      // 2.5) ⚠ YANGI: kartani ESKI KARTA O'RNIGA ko'chiramiz.
      //   Ilgari obyektlar manifestdagi ABSOLYUT koordinatalarga qo'yilardi —
      //   karta qayerda yaratilgan bo'lsa, o'sha yerda paydo bo'lardi, ya'ni
      //   o'yinchidan uzoqda ("yonidan"). Endi butun karta bir butun holda
      //   suriladi. Siljish ESLAB QOLINADI — timeline/teleport ham shuni
      //   ishlatadi va _unloadMap tozalashда farqi yo'q.
      const _off = _mapSpawnOffset(idMap, _anchor);
      if (_off && (_off.x || _off.z)) {
        for (const k in idMap) { const o = idMap[k]; if (o) o.position.add(_off); }
      }
      ud._loadOffset = _off ? _off.clone() : null;

      // ⚠ Holatni ESLAB QOLAMIZ — qayta kirishда ZIP parse qilinmasin.
      //   Bularning hammasi `_restoreScene()` (Stop) da tozalanadi.
      ud._mlSpawned   = true;
      ud._mlManifest  = mapData;
      ud._mlIdMap     = idMap;
      ud._mlHiddenMap = [];

      // 2.7) 💡 KARTA MUHITI — chiroq / zarracha / tuman.
      //   Obyektlardan KEYIN: chiroq papka ichida bo'lsa, ota-onasi
      //   allaqachon sahnada bo'lishi kerak.
      _envApply(ml, mapData);

      // Kartaning timeline treklarini TimelineSystem'ga qo'shamiz (spawn obyektlarga)
      _registerMapTimeline(mapData, idMap, _off);

      // 3) O'yinchini teleport qilamiz
      _doTeleport(ud, idMap, _off);

      // 4) Kartadagi animatsiyani ishga tushiramiz (obyektlar / kamera)
      if (ud.playAnim && ud.playAnim !== 'none') {
        _playMapAnim(ud, idMap, mapData, _off);
      }

      log(`🗺 Karta yuklandi: ${spawned} obyekt` +
          (_off && (_off.x || _off.z)
            ? ` — eski karta markaziga tenglashtirildi (Δx=${_off.x.toFixed(1)}, Δz=${_off.z.toFixed(1)})`
            : ' — o\'z koordinatalarida'), 'lok');
      return true;
    } catch (e) {
      log('❌ Karta yuklashda xato: ' + (e.message || e), 'le');
      return false;
    } finally {
      const wait = Math.max(0, minShow - (Date.now() - t0));
      setTimeout(_hideLoadingScreen, wait);
    }
  }

  // ── Kartaning timeline treklarini TimelineSystem'ga qo'shish ──
  //    Spawn qilingan obyektlarga bog'lanadi → timelinePlay va boshqa
  //    timeline-ga bog'liq narsalar ishlaydi. `_mlTrack` deb belgilanadi
  //    (o'yin to'xtaganда / karta o'chganда tozalanadi).
  //  ⚠ `off` — preview siljishi. Keyframe pozitsiyalari kartaning ASL
  //     koordinatasida keladi. Pastda har obyekt birinchi keyframe
  //     holatiga qo'yiladi — agar keyframe'ni siljitmasak, preview'da
  //     siljitilgan obyekt DARROV asl joyiga qaytib ketadi (timeline'i
  //     borlari markazga, yo'qlari chekada qoladi).
  //     Shuning uchun preview'da keyframe'lar ham siljitiladi; qayta
  //     saqlashда _writeBack ularni teskari ayiradi → format buzilmaydi.
  function _registerMapTimeline(manifest, idMap, off) {
    if (typeof TimelineSystem === 'undefined' || !TimelineSystem.tracks) return;
    if (!manifest.timeline || !Array.isArray(manifest.timeline.tracks)) return;
    let n = 0;
    for (const tr of manifest.timeline.tracks) {
      const obj = idMap[String(tr.objId)];
      if (!obj || !Array.isArray(tr.keyframes) || !tr.keyframes.length) continue;
      // Preview siljishini keyframe'larga ham qo'llaymiz
      const kfs = _offsetKfs(tr.keyframes, off);
      const newTrack = {
        objId:     obj.userData.id,
        objName:   obj.userData.name,
        objRef:    obj,
        keyframes: kfs,
        loop:      !!tr.loop,
        _mlTrack:  true,
      };
      const ex = TimelineSystem.tracks.findIndex(t => t.objRef === obj || String(t.objId) === String(obj.userData.id));
      if (ex >= 0) TimelineSystem.tracks[ex] = newTrack; else TimelineSystem.tracks.push(newTrack);

      // Obyektni animatsiyaning BIRINCHI keyframe holatiga qo'yamiz — shunda
      // karta yuklanганда animatsiya OXIRIDA emas, BOSHIDA turadi.
      const k0 = kfs[0];
      if (k0) {
        if (k0.pos)   obj.position.set(k0.pos.x, k0.pos.y, k0.pos.z);
        if (k0.rot)   obj.rotation.set(k0.rot.x, k0.rot.y, k0.rot.z);
        if (k0.scale) obj.scale.set(k0.scale.x, k0.scale.y, k0.scale.z);
      }
      n++;
    }
    if (n && TimelineSystem.render) { try { TimelineSystem.render(); } catch(e) {} }
    if (n) log(`🎞 Kartaning timeline'i qo'shildi (${n} trek)`, 'lok');
  }

  // Karta timeline treklarini olib tashlash (o'yin to'xtaganда / karta o'chganда)
  function _clearMapTimeline() {
    if (typeof TimelineSystem === 'undefined' || !TimelineSystem.tracks) return;
    for (let i = TimelineSystem.tracks.length - 1; i >= 0; i--) {
      if (TimelineSystem.tracks[i] && TimelineSystem.tracks[i]._mlTrack) TimelineSystem.tracks.splice(i, 1);
    }
    if (TimelineSystem.render) { try { TimelineSystem.render(); } catch(e) {} }
  }

  // ── Kartadagi animatsiyani ishga tushirish (obyektlar + kamera cutscene) ──
  function _playMapAnim(ud, idMap, manifest, off) {
    const TES = (typeof TimelineExportSystem !== 'undefined') ? TimelineExportSystem : null;
    if (!TES || !TES.playObjectKeyframes) { log('⚠ Animatsiya: TimelineExportSystem topilmadi', 'lw'); return; }
    const tracks = (manifest.timeline && manifest.timeline.tracks) || [];
    if (!tracks.length) { log("⚠ Kartada animatsiya (timeline) yo'q", 'lw'); return; }

    const isCamMode = ud.playAnim === 'camera';
    let camObj = null, camTrack = null;

    for (const tr of tracks) {
      const obj = idMap[String(tr.objId)];
      if (!obj || !Array.isArray(tr.keyframes) || !tr.keyframes.length) continue;
      // ⚠ Keyframe'lar manifestда kartaning ASL koordinatalarida. Karta
      //   surilган bo'lsa, ularni ham surmasak — animatsiya boshlanishi
      //   bilan obyekt eski (uzoq) joyiga sakrab ketardi va butun
      //   "eski karta o'rniga qo'yish" mantiqi buzilardi.
      const kfs = _offsetKfs(tr.keyframes, off);
      const isCamObj = obj.userData && (obj.userData.isCamera || obj.userData.type === 'Kamera');
      // Cutscene ham SILJITILGAN treкdan foydalanadi (aks holda kamera
      // bo'sh joyga qarab uchardi).
      if (isCamMode && isCamObj && !camObj) { camObj = obj; camTrack = Object.assign({}, tr, { keyframes: kfs }); }
      TES.playObjectKeyframes({ target: obj, keyframes: kfs, direction: 'forward', speed: 1, loop: !!tr.loop });
    }

    // Kamera rejimi: real kamerani kamera-obyekt bo'ylab haydaymiz (cutscene)
    if (isCamMode && camObj && camTrack) _startCutscene(camObj, camTrack);

    log(`🎬 Kartadagi animatsiya boshlandi (${tracks.length} trek)` +
        (isCamMode && camObj ? ' + kamera cutscene' : ''), 'lok');
  }

  // Kamera-obyektni faollashtiramiz — main-loop real kamerani undan haydaydi
  // (obyekt sikli o'yinchi kamerasidan KEYIN ishlaydi, shuning uchun ustun).
  // Trek tugagach faolsizlantiramiz (boshqaruv o'yinchiga qaytadi).
  function _startCutscene(camObj, camTrack) {
    try {
      // boshqa barcha kameralarni faolsizlantiramiz — faqat cutscene kamerasi faol
      for (const o of objects) { if (o.userData && o.userData.isCamera) o.userData._isActive = false; }
      camObj.userData._isActive   = true;
      camObj.userData.camViewMode = camObj.userData.camViewMode || 'keyframe';
      if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
      log("🎥 Kamera cutscene — timeline kamerasi ko'rinishni haydamoqda", 'lok');
      const times = (camTrack.keyframes || []).map(k => (typeof k.time === 'number') ? k.time : 0);
      const dur = (times.length ? Math.max(...times) - Math.min(...times) : 3) || 3;
      setTimeout(() => {
        camObj.userData._isActive = false;
        if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
        log("🎥 Cutscene tugadi — boshqaruv o'yinchiga qaytdi", 'lw');
      }, (dur + 0.2) * 1000);
    } catch(e) {}
  }

  // ── Eski kartani yashirish (o'chirmasdan) — o'yin to'xtaganда tiklanadi ──
  let _hiddenObjs = [];
  let _hiddenParts = [];   // ✨ eski kartaning zarrachalari
  function _hideOldMap() {
    for (const o of objects) {
      if (!o || !o.userData) continue;
      // ⚠ ZAMIN QOLADI. Zamin ikkala kartaga UMUMIY — eski karta ham,
      //   yangi karta ham o'sha zamin ustida turadi. Uni yashirsak,
      //   karta o'z zaminini olib kelmasa, o'yinchi pastga tushib ketardi.
      //   Chiroqlar `objects[]` da emas (alohida `lights[]`) — ular
      //   baribir tegilmaydi.
      if (o.userData.isStatic)    continue;   // yer qoladi
      if (o.userData.isPlayer)    continue;
      if (o.userData.isPlayerObj) continue;
      if (o.userData.isMapLoader) continue;   // trigger ishlashda davom etsin
                                              // (update() uni baribir visible=false qiladi)
      if (o.userData._mlLoaded)   continue;    // shu kartaga oid emas
      if (o.userData._mlPrevObj)  continue;    // preview — editor narsasi, tegmaymiz
      if (o.userData._mlKept)     continue;    // saqlab qolingan element
      if (o.userData._mlHidden)   continue;    // allaqachon yashirilган
      // ⚠ `vis` — yashirishdan OLDINGI ko'rinish. U ikki xil ishlatiladi:
      //   • _showOldMap()  (o'yin ICHIDA, 2-kirishда) → TIKLANADI.
      //     Bu yerда play-mode yordam berolmaydi — o'yin hali davom etyapti.
      //   • _restoreScene() (Stop bosilganда)        → TIKLANMAYDI.
      //     Uni play-mode.js savedStates orqali o'zi qaytaradi.
      //     (Hitboxlar o'yinда yashiriladi — bu yerда false saqlanib
      //      qolgan bo'lardi va editorда ko'rinmay qolardi.)
      // ⚠ ASL KO'RINISH — SESSIYA BO'YICHA BIR MARTA yoziladi.
      //
      //   Muammo: `_hideOldMap()` bir sessiyada BIR NECHA MARTA
      //   chaqiriladi (har kirishда, tez yo'lда ham). Agar obyekt
      //   o'sha paytда allaqachon ko'rinmas bo'lsa — masalan oldingi
      //   qaytarish yarim yo'lда uzilgan, yoki boshqa tizim yashirgan —
      //   `vis: false` yozib olinardi va keyingi `_showOldMap()` uni
      //   ABADIY ko'rinmas qilib qo'yardi.
      //
      //   🪜 narvon va 🎯 hitbox aynan shunga tushgan: ular ko'rinmay
      //   qoladi, lekin `colliderMode` normal ('inline' — ularning
      //   standart rejimi), shuning uchun ISHLAYVERADI.
      //
      //   `_mlOrigVis` bir marta yoziladi va faqat `_showOldMap()`
      //   uni o'chiradi. Ikkinchi yashirish uni QAYTA YOZMAYDI.
      if (o.userData._mlOrigVis === undefined) o.userData._mlOrigVis = o.visible;
      _hiddenObjs.push({ obj: o, cm: o.userData.colliderMode, vis: o.userData._mlOrigVis });
      o.userData._mlHidden = true;
      o.userData._mlOff    = true;   // 🚫 funksional tizimlar uni ko'rmasin
      o.visible = false;
      o.userData.colliderMode = 'inline';      // yashirin obyekt to'qnashmasin
    }
    // ── ✨ ZARRACHALAR ────────────────────────────────────────
    //  ⚠ Ular `objects[]` da EMAS (alohida `particleSystems[]`), ya'ni
    //    yuqoridagi sikl ularni KO'RMAYDI. Natijada eski kartaning qori,
    //    changi, uchqunlari yangi karta ustida yog'ib turardi.
    //    Chiroqlar bilan bir xil kamchilik — o'sha dars.
    for (const ps of _envParts()) {
      if (!ps || !ps.mesh || ps._mlPart) continue;      // karta zarrachasi emas
      if (ps._mlHidden) continue;
      _hiddenParts.push({ ps, vis: ps.mesh.visible });
      ps._mlHidden = true;
      ps.mesh.visible = false;
    }
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
  }

  // ── Eski kartani QAYTARISH (o'yin ICHIDA — 2-kirishда) ──
  //  ⚠ Bu `_restoreScene()` dan farq qiladi: o'yin davom etyapti, ya'ni
  //    play-mode hech narsani tiklamaydi. Shuning uchun `visible` ni ham,
  //    `colliderMode` ni ham O'ZIMIZ qaytaramiz.
  //
  //  O'zgarishlar saqlanib qoladi: eski karta hech qachon O'CHIRILMAGAN,
  //  faqat yashirilgan edi. Ya'ni pozitsiyalari, holati — hammasi
  //  qanday qoldirilgan bo'lsa, shundayligicha qaytadi.
  function _showOldMap() {
    let n = 0;
    for (const h of _hiddenObjs) {
      if (!h.obj) continue;
      // Asl qiymat ustuvor — ikkilangan yashirishdan himoya
      const _v = (h.obj.userData._mlOrigVis !== undefined) ? h.obj.userData._mlOrigVis
               : (h.vis !== undefined ? h.vis : true);
      h.obj.visible = _v;
      if (h.cm === undefined || h.cm === null) delete h.obj.userData.colliderMode;
      else h.obj.userData.colliderMode = h.cm;
      delete h.obj.userData._mlHidden;
      delete h.obj.userData._mlOff;
      delete h.obj.userData._mlOrigVis;
      n++;
    }
    _hiddenObjs = [];

    // ── 🩹 QOLIB KETGANLARNI TUZATAMIZ ────────────────────────
    //  ⚠ Agar oldingi qaytarish yarim yo'lda XATO bilan uzilgan bo'lsa,
    //    obyektda `_mlHidden` bayrog'i qolib ketardi. Keyingi
    //    `_hideOldMap()` uni "allaqachon yashirilgan" deb o'tkazib
    //    yuborardi, ya'ni u `_hiddenObjs` ga HECH QACHON tushmasdi va
    //    abadiy ko'rinmas bo'lib qolardi.
    //
    //    Tashqaridan bu shunday ko'rinadi: 🪜 narvon KO'RINMAYDI, lekin
    //    oldiga borsang ISHLAYDI — chunki `colliderMode` tiklangan
    //    (narvonning normal rejimi allaqachon `inline`), faqat
    //    `visible` false bo'lib qolgan.
    //
    //    `_mlSafe()` endi uzilishning oldini oladi, bu esa ALLAQACHON
    //    buzilgan sahnani tuzatadi (eski saqlangan o'yinlar uchun).
    let _fixed = 0;
    for (const o of objects) {
      if (!o || !o.userData || !o.userData._mlHidden) continue;
      if (o.userData._mlLoaded) continue;          // karta obyekti — o'z yo'li bor
      o.visible = (o.userData._mlOrigVis !== undefined) ? o.userData._mlOrigVis : true;
      delete o.userData._mlHidden;
      delete o.userData._mlOff;
      delete o.userData._mlOrigVis;
      _fixed++; n++;
    }
    if (_fixed) log(`🩹 ${_fixed} ta obyekt yashirin qolib ketgan edi — qaytarildi`, 'lw');

    // ✨ Zarrachalar
    for (const h of _hiddenParts) {
      if (!h.ps || !h.ps.mesh) continue;
      h.ps.mesh.visible = (h.vis !== undefined) ? h.vis : true;
      delete h.ps._mlHidden;
      n++;
    }
    _hiddenParts = [];
    // 💻 PC BLOKLARINI QAYTA QURAMIZ.
    //  ⚠ PC ekrani — CSS3D <iframe>, ya'ni DOM qatlamida. `visible=false`
    //    davrida u sahnadan uzilib qolishi mumkin va oddiy `visible=true`
    //    uni qaytarmaydi — ekran qora bo'lib qoladi va bosilmaydi.
    //    `rebuild()` ekranni va CSS3D ni qaytadan bog'laydi.
    try {
      if (window.PCBlockSystem && typeof PCBlockSystem.rebuild === 'function') {
        for (const o of objects) {
          if (o && o.userData && o.userData.isPCBlock && o.visible !== false) {
            try { PCBlockSystem.rebuild(o); } catch (e) {}
          }
        }
      }
    } catch (e) {}
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    return n;
  }

  // ══════════════════════════════════════════════════════════
  //  💡 KARTA MUHITI — chiroq · zarracha · tuman
  //
  //  ⚠ MUAMMO: karta o'z YORUG'LIGINI olib kelmasdi. Sababi
  //    `loadScene(..., {keepScene:true})`: u sahna darajasidagi
  //    holatni ATAYLAB o'tkazib yuboradi, chunki oddiy "karta qo'shish"
  //    rejimida asosiy sahnaning yorug'ligini o'chirib tashlash
  //    noto'g'ri bo'lardi. Lekin Map Loader — bu "qo'shish" emas,
  //    ALMASHTIRISH: eski karta yashiriladi, yangisi ko'rsatiladi.
  //
  //    Natijada qorong'i uchun yasalgan karta yorqin sahnaga tushib
  //    butunlay boshqacha ko'rinardi (yoki aksincha), tumani esa
  //    umuman kelmasdi.
  //
  //  ⚠ NEGA `_slLightsIn` TO'G'RIDAN-TO'G'RI chaqirilmaydi: u avval
  //    `_slLightsClear()` bilan HAMMA chiroqni o'chiradi. Karta esa
  //    hech narsani o'chirmaydi — yashiradi va qaytaradi. Shuning
  //    uchun serializatorga `{clear:false, tag:'_mlLight'}` rejimi
  //    qo'shildi: karta chiroqlari QO'SHILADI va belgilanadi.
  //
  //  Simmetriya — obyektlar bilan AYNAN bir xil:
  //     yuklash  → eski muhit yashirin, karta muhiti yoniq
  //     unload   → karta muhiti yashirin, eski muhit qaytadi
  //     Stop     → karta muhiti O'CHIRILADI, eski qaytadi
  //
  //  ⚠ Eski kartalar (build 58 dan oldin saqlangan) da `lights` /
  //    `particles` / `fog` bo'limlari YO'Q — bunda hech nima
  //    qilinmaydi va avvalgi xulq saqlanadi.
  // ══════════════════════════════════════════════════════════
  const _envLights = () => { try { return Array.isArray(lights) ? lights : []; } catch (e) { return []; } };
  const _envParts  = () => { try { return Array.isArray(particleSystems) ? particleSystems : []; } catch (e) { return []; } };
  const _envScene  = () => { try { return scene; } catch (e) { return null; } };

  /** Karta muhitini birinchi marta qo'llash. */
  function _envApply(ml, mapData) {
    const ud = ml.userData;
    if (ud.mapEnv === false) return 0;                 // sozlamada o'chirilgan
    const hasL = Array.isArray(mapData.lights)    && mapData.lights.length    > 0;
    const hasP = Array.isArray(mapData.particles) && mapData.particles.length > 0;
    const hasF = !!mapData.fog;
    if (!hasL && !hasP && !hasF) return 0;             // eski format — tegmaymiz

    const sc = _envScene();
    // 1) Eski muhitni eslab qolamiz
    const old = { lights: [], parts: [], fog: sc ? sc.fog : null, hasF };
    for (const e of _envLights()) {
      if (!e || !e.light || e._mlLight) continue;
      old.lights.push({ e, vis: e.light.visible });
      // ⚠ Faqat karta O'Z chirog'ini olib kelgan bo'lsa yashiramiz.
      //   Aks holda karta zim-ziyo qorong'ida qolardi.
      if (hasL) e.light.visible = false;
    }
    for (const ps of _envParts()) {
      if (!ps || ps._mlPart) continue;
      // ⚠ `_hideOldMap()` allaqachon yashirgan bo'lsa — TEGMAYMIZ.
      //   Ikki egasi bo'lsa qaytarish tartibida ziddiyat chiqardi:
      //   `_showOldMap()` ko'rsatardi, keyin `_envHide()` yana
      //   yashirib qo'yardi (u eski qiymat sifatida `false` ni yozib
      //   olgan bo'lardi).
      if (ps._mlHidden) continue;
      old.parts.push({ ps, vis: ps.mesh ? ps.mesh.visible : true });
      if (hasP && ps.mesh) ps.mesh.visible = false;
    }
    ud._mlEnvOld = old;

    // 2) Karta muhitini qo'shamiz (belgilangan holda)
    ud._mlEnvLights = (hasL && typeof _slLightsIn === 'function')
      ? (_slLightsIn(mapData.lights, null, { clear: false, tag: '_mlLight' }) || []) : [];
    ud._mlEnvParts = (hasP && typeof _slParticlesIn === 'function')
      ? (_slParticlesIn(mapData.particles, { clear: false, tag: '_mlPart' }) || []) : [];
    ud._mlEnvFog = hasF ? mapData.fog : null;
    if (hasF && typeof _slFogIn === 'function') _slFogIn(mapData.fog);

    if (typeof updateHierarchy === 'function') updateHierarchy();
    const nL = ud._mlEnvLights.length, nP = ud._mlEnvParts.length;
    if (nL || nP || hasF) {
      log(`🗺 Karta muhiti: ${nL ? `💡 ${nL} chiroq ` : ''}` +
          `${nP ? `✨ ${nP} zarracha ` : ''}${hasF ? '🌫 tuman' : ''}`.trim(), 'lg');
    }
    return nL + nP;
  }

  /** Karta muhitini yashirish + eski muhitni qaytarish (unload). */
  function _envHide(ml) {
    const ud = ml.userData;
    for (const e of (ud._mlEnvLights || [])) if (e && e.light) e.light.visible = false;
    for (const ps of (ud._mlEnvParts  || [])) if (ps && ps.mesh)  ps.mesh.visible  = false;
    const old = ud._mlEnvOld;
    if (!old) return;
    for (const h of old.lights) if (h.e && h.e.light) h.e.light.visible = h.vis;
    for (const h of old.parts)  if (h.ps && h.ps.mesh) h.ps.mesh.visible = h.vis;
    const sc = _envScene();
    if (sc && old.hasF) sc.fog = old.fog;              // tumanni faqat biz o'zgartirган bo'lsak
    if (typeof updateHierarchy === 'function') updateHierarchy();
  }

  /** Karta muhitini qayta yoqish (tez yo'l — 2-marta kirish). */
  function _envShow(ml) {
    const ud = ml.userData;
    const old = ud._mlEnvOld;
    const hasL = (ud._mlEnvLights || []).length > 0;
    const hasP = (ud._mlEnvParts  || []).length > 0;
    if (old) {
      for (const h of old.lights) if (h.e && h.e.light && hasL) h.e.light.visible = false;
      for (const h of old.parts)  if (h.ps && h.ps.mesh && hasP) h.ps.mesh.visible = false;
    }
    for (const e of (ud._mlEnvLights || [])) if (e && e.light) e.light.visible = true;
    for (const ps of (ud._mlEnvParts  || [])) if (ps && ps.mesh)  ps.mesh.visible  = true;
    const sc = _envScene();
    if (sc && ud._mlEnvFog && typeof _slFogIn === 'function') _slFogIn(ud._mlEnvFog);
    if (typeof updateHierarchy === 'function') updateHierarchy();
  }

  /** Karta muhitini BUTUNLAY olib tashlash (Stop bosilganda). */
  function _envDestroy(ml) {
    const ud = ml.userData;
    const arr = _envLights();
    for (const e of (ud._mlEnvLights || [])) {
      if (!e) continue;
      const L = e.light;
      try { if (L && L.parent) L.parent.remove(L); } catch (x) {}
      try { if (e.helper && e.helper.parent) e.helper.parent.remove(e.helper); } catch (x) {}
      try { if (e.marker && e.marker.parent) e.marker.parent.remove(e.marker); } catch (x) {}
      try { if (L && L.target && L.target.parent) L.target.parent.remove(L.target); } catch (x) {}
      const i = arr.indexOf(e); if (i > -1) arr.splice(i, 1);
    }
    const parr = _envParts();
    for (const ps of (ud._mlEnvParts || [])) {
      if (!ps) continue;
      try { if (ps.mesh && ps.mesh.parent) ps.mesh.parent.remove(ps.mesh); } catch (x) {}
      try { if (ps.geo && ps.geo.dispose) ps.geo.dispose(); } catch (x) {}
      try { if (ps.mesh && ps.mesh.material && ps.mesh.material.dispose) ps.mesh.material.dispose(); } catch (x) {}
      const i = parr.indexOf(ps); if (i > -1) parr.splice(i, 1);
    }
    const old = ud._mlEnvOld;
    if (old) {
      for (const h of old.lights) if (h.e && h.e.light) h.e.light.visible = h.vis;
      for (const h of old.parts)  if (h.ps && h.ps.mesh) h.ps.mesh.visible = h.vis;
      const sc = _envScene();
      if (sc && old.hasF) sc.fog = old.fog;
    }
    delete ud._mlEnvLights; delete ud._mlEnvParts;
    delete ud._mlEnvOld;    delete ud._mlEnvFog;
    if (typeof updateHierarchy === 'function') updateHierarchy();
  }

  // ── Sahnani tiklash (o'yin to'xtaganда): yuklangan kartani o'chirib, eskini qaytaradi ──
  function _restoreScene() {
    _clearMapTimeline();

    // ⚠ Karta endi o'yin davomida YASHIRILADI (o'chirilmaydi) — ya'ni
    //   Stop bosilганда yashirin obyektlar ham shu yerда tozalanadi.
    //   Ular `_mlLoaded` bayrog'ini saqlab qolgan, shuning uchun pastdagi
    //   sikl ularni ham tutadi.
    for (const o of objects) {
      if (o && o.userData && o.userData._mlMapHidden) { delete o.userData._mlMapHidden; delete o.userData._mlOff; }
    }
    // Har bir Map Loader'ning holatini nolga qaytaramiz.
    //   ⚠ `_mlIdMap` / `_mlManifest` — o'chirilган obyektlarga HAVOLA ushlab
    //     turadi. Tozalamasak, sahna almashsa ham ular xotirada qolib
    //     ketardi (JS ularni yig'a olmaydi).
    for (const o of objects) {
      if (!o || !o.userData || !o.userData.isMapLoader) continue;
      // 💡 Karta chiroq/zarrachalari O'CHIRILADI, eski muhit qaytadi.
      //   ⚠ Obyektlardan farqli — ular `objects[]` da emas, ya'ni
      //     pastdagi `_mlLoaded` sikli ularni TUTMAYDI. Tozalanmasa
      //     Stop bosilgandan keyin sahnada karta chiroqlari qolib,
      //     har Play/Stop da yana bittadan qo'shilib borardi.
      _envDestroy(o);
      o.userData._mlSpawned   = false;
      o.userData._mlMapLoaded = false;
      o.userData._mlInside    = false;
      o.userData._mlManifest  = null;
      o.userData._mlIdMap     = null;
      o.userData._mlHiddenMap = [];
      o.userData._loadOffset  = null;
    }

    // yuklangan karta obyektlarini (va saqlab qolinganlarni) o'chiramiz
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      if (o && o.userData && (o.userData._mlLoaded || o.userData._mlKept)) {
        if (typeof physBodies !== 'undefined') {
          const pi = physBodies.findIndex(b => b.mesh === o);
          if (pi >= 0) physBodies.splice(pi, 1);
        }
        scene.remove(o);
        objects.splice(i, 1);
        _disposeMapObject(o);          // ♻️ geometriya + material bo'shatiladi
      }
    }
    _gcTextures();                     // ♻️ ishlatilmayotgan teksturalar
    // yashirilган eski obyektlarni qaytaramiz.
    // MUHIM: bu yerда ko'rinishni (visible) TIKLAMAYMIZ — uni play-mode o'zi
    // savedStates orqali to'g'ri tiklaydi. (Hitboxlar o'yin paytida yashiriladi,
    // shuning uchun `vis` da false saqlanib qolgan bo'lardi va hitbox editorда
    // ko'rinmay qolardi.) Biz faqat colliderMode'ni qaytaramiz — uni play-mode
    // tiklamaydi.
    // ⚠ _showOldMap() dan farqi shu: u o'yin ICHIDA chaqiriladi, u yerда
    //   play-mode yordam berolmaydi, shuning uchun u `vis` ni ham tiklaydi.
    for (const h of _hiddenObjs) {
      if (!h.obj) continue;
      if (h.cm === undefined || h.cm === null) delete h.obj.userData.colliderMode;
      else h.obj.userData.colliderMode = h.cm;
      delete h.obj.userData._mlHidden;
    }
    _hiddenObjs = [];
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof updateStats === 'function') updateStats();
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
  }

  // ── Kartani olib tashlash (chiqqanда) — qoladigan elementlarni saqlaydi ──
  /**
   * Bir qadamni ALOHIDA himoyada bajaradi.
   *
   * ⚠ NEGA: `_unloadMap` ketma-ket qadamlardan iborat edi va bittasi
   *   xato bersa QOLGANLARI BAJARILMASDAN qolardi. Tashqaridan bu
   *   "hammasi qaytdi, lekin narvon ko'rinmayapti, PC ishlamayapti"
   *   bo'lib ko'rinardi — sahna yarim tiklangan holatda muzlab qolardi.
   *
   *   `main-loop.js` dagi `_safe()` bilan bir xil g'oya: bitta tizim
   *   yiqilsa, qolganlari ishlashda davom etadi va xato KO'RINADI.
   */
  function _mlSafe(label, fn) {
    try { return fn(); }
    catch (e) {
      const m = (e && e.message) ? e.message : String(e);
      log(`❌ Karta almashuvi — "${label}" qadamida xato: ${m}`, 'le');
      try { console.error('[map-loader] ' + label + ':', e); } catch (_) {}
      return null;
    }
  }

  function _unloadMap(ml) {
    _mlSafe('timeline tozalash', () => _clearMapTimeline());

    // ⚠ O'ZGARDI: karta endi O'CHIRILMAYDI, faqat YASHIRILADI.
    //   Ilgari bu yerда scene.remove + dispose bo'lardi va har qayta
    //   kirishда ZIP qaytadan parse qilinardi. Endi eski karta bilan
    //   simmetrik: ikkalasi ham yashiriladi, ikkalasi ham qaytadi.
    //   Xotira Stop bosilganда (`_restoreScene`) bo'shatiladi.
    const r = _mlSafe('kartani yashirish', () => _hideMapObjects(ml)) || { hidden: 0, kept: 0 };
    const hidden = r.hidden, kept = r.kept;

    // ⚠ ENG MUHIMI: eski kartani QAYTARAMIZ. Bu qadam yuqoridagilar
    //   yiqilsa ham BAJARILADI — aks holda o'yinchi bo'sh sahnada qolardi.
    const back = _mlSafe('eski kartani qaytarish', () => _showOldMap()) || 0;
    _mlSafe('muhitni qaytarish', () => _envHide(ml));

    _mlSafe('UI yangilash', () => {
      if (typeof updateHierarchy === 'function') updateHierarchy();
      if (typeof updateStats === 'function') updateStats();
      if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    });
    log(`🗺 Karta almashdi — ${hidden} yashirildi` + (kept ? `, ${kept} qoldi` : '') +
        `, eski karta qaytdi (${back} obyekt)`, 'lok');
  }

  // ── Manifestdan obyektlarni spawn qilish ──
  // ============================================================
  //  🗺 _spawnManifest — kartani sahnaga chiqarish
  //
  //  ⚠ ILGARI: bu funksiya ~150 qator bo'lib, `doLoad()` ning QO'LBOLA
  //    NUSXASI edi. U ham manifestdan obyekt yasardi, lekin o'z bilgani
  //    bilan — va ikki nusxa muqarrar ravishda ajralib ketdi:
  //
  //      • `SceneTypes` dan xabarsiz  → 💻 PC, 🔊 sound, 🗺 map-loader,
  //                                      📝 matn bloki OQ KUB bo'lardi
  //      • skip ro'yxati yo'q         → egasiz 📷 PCCam spawn bo'lardi va
  //                                      bounding box ni tortib, BUTUN
  //                                      kartani noto'g'ri joyga surardi
  //      • zamin ikkilanardi, suyaklar qaytardi
  //      • id qayta moslash o'z nusxasi bilan (hitbox actions, timer...)
  //
  //    Har safar bittasi tuzatilardi, ikkinchisi qolib ketardi. Chunki
  //    bilim IKKI JOYDA yashardi.
  //
  //  ENDI: `loadScene()` ga topshiriladi — sahna yuklaydigan AYNAN
  //  o'sha funksiya. Farqi to'rt bayroqda:
  //     keepScene    — eski sahna tozalanmaydi (karta yoniga qo'yiladi)
  //     keepTimeline — asosiy timeline ustiga yozilmaydi
  //     skipNames    — "saqlab qolingan" elementlar qayta spawn bo'lmaydi
  //     onSpawn      — har bir obyektga karta belgilari qo'yiladi
  //
  //  Bundan buyon `save-load.js` ga qo'shilgan HAR QANDAY tuzatish
  //  kartaga ham avtomatik tegadi.
  // ============================================================
  async function _spawnManifest(zip, data, collision, skipNames) {
    if (typeof window.loadScene !== 'function') {
      log('❌ loadScene topilmadi (save-load.js yuklanmagan)', 'le');
      return { spawned: 0, idMap: {} };
    }

    const idMap = {};   // eski objId → yangi obyekt (ofset/teleport uchun)

    // ⚠ Yuklashdan OLDINGI chegara. `onSpawn` faqat MANIFEST yozuvlari
    //   uchun chaqiriladi, lekin tizimlar tiklanayotganda YANA obyekt
    //   qo'shishi mumkin: `PCBlockSystem.restore()` PC ning 📷 kamera
    //   lankasini `objects.push(a)` bilan o'zi qo'shadi.
    //   Ular `_mlLoaded` belgisini olmasa — karta almashganda
    //   YASHIRILMAYDI va sahnada egasiz qolib ketadi (har almashishda
    //   yana bittadan to'planadi).
    const _base = objects.length;

    const res = await window.loadScene(data, zip, {
      keepScene:    true,
      keepTimeline: true,
      skipNames:    Array.isArray(skipNames) ? skipNames : [],
      onSpawn: (obj, od) => {
        if (od && od.oldId != null) idMap[String(od.oldId)] = obj;

        // ── Collision rejimi ──
        //  'inline'|'block' — hammasini majburan; 'original' — har obyekt
        //  o'z rejimida. Hitbox/kamera va TRIGGER ZONALARI doim inline:
        //  ular ko'rinmas hudud, o'yinchi ichidan o'tishi kerak.
        const u = obj.userData || {};
        const isZone = !!(u.isHitbox || u.isCamera || u.isSoundBlock ||
                          u.isMapLoader || u.isGazeTrigger);
        const isBtn  = !!u.isInteractiveBtn;
        let mode;
        if (isZone)                      mode = 'inline';
        else if (isBtn)                  mode = (u.colliderMode === 'inline') ? 'inline' : 'block';
        else if (collision === 'inline') mode = 'inline';
        else if (collision === 'block')  mode = 'block';
        else                             mode = (u.colliderMode === 'inline') ? 'inline' : 'block';
        if (mode === 'inline') u.colliderMode = 'inline';
        else delete u.colliderMode;      // block (standart)

        u._mlLoaded = true;              // shu karta yukladi — Stop da o'chiriladi
        u._mlSrcId  = od ? od.oldId : null;  // manifestdagi asl id — qayta saqlashda kerak
      },
    });

    // Yuklash davomida qo'shilgan HAMMA narsani belgilaymiz —
    // manifestda bo'lmagan yordamchilar ham kartaga tegishli.
    let _extra = 0;
    for (let i = _base; i < objects.length; i++) {
      const o = objects[i];
      if (!o || !o.userData || o.userData._mlLoaded) continue;
      o.userData._mlLoaded = true;
      o.userData._mlSrcId  = null;   // manifestда yo'q — hosila obyekt
      _extra++;
    }

    const spawned = (res && res.count) || 0;
    if (_extra) log(`   ↳ ${_extra} ta hosila obyekt ham kartaga biriktirildi`, 'lw');
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof updateStats === 'function') updateStats();
    log(`🗺 Spawn: ${spawned} obyekt`, 'lok');
    return { spawned, idMap };
  }


  /**
   * 🔢 NoScript uchun: kartani O'YINCHISIZ yuklaydi.
   * ⚠ `_beginLoad` qo'riqchisi bilan boradi — ikki marta chaqirilsa
   *   ham yuklash ikki barobar bo'lmaydi.
   */
  function forceLoad(o) {
    if (!o || !o.userData || !o.userData.isMapLoader) return false;
    if (o.userData._mlLoading || o.userData._mlMapLoaded) return false;
    _beginLoad(o);
    return true;
  }

  //  📡 `mpReplay` — multiplayer: kelgan karta almashuvini
  //     takrorlaydi. Ro'yxat OXIRIGA qo'shildi: `test-prefab-visual`
  //     `return { create, restoreVisual,` naqshini qidiradi va uni
  //     buzsak tekshiruv yiqilardi.
  return { create, restoreVisual, update, syncSize, _defaultData, _bufToB64, _readManifest,
           mpReplay,
           previewOn, previewOff, anyPreview, closeAllPreviews,
           addToMap, removeFromMap, forceLoad };
})();

// Global — assets menyusi va inspektor uchun
// ⚠ Klassik skriptда top-level `const` `window` ga YOZILMAYDI. Ya'ni
//   `window.MapLoaderSystem` `undefined` bo'lib qolardi, va unga tayangan
//   har qanday kod (masalan ierarxiyadagi drag&drop) JIMGINA ishlamasdi.
//   Loyihadagi boshqa OLTI tizim (HitboxSystem, InteractiveButtonSystem,
//   TimelineSystem, TimelineExportSystem, PCBlockSystem, TextBlockSystem)
//   o'zini window ga yozadi — bu yagona istisno edi.
window.MapLoaderSystem = MapLoaderSystem;

window.addMapLoader = function() { return MapLoaderSystem.create(); };

// ============================================================
//  INSPECTOR
// ============================================================
function buildMapLoaderInspector(obj) {
  const ic = document.getElementById('inspector-content');
  if (!ic) return;
  const ud = obj.userData;
  ud.triggerSize = ud.triggerSize || { x: 3, y: 3, z: 3 };
  ud.loading     = ud.loading     || { type: 'none', content: '', duration: 1.2 };
  ud.teleport    = ud.teleport    || { enabled: true, x: 0, y: 2, z: 0 };
  ud.collision   = ud.collision   || 'original';
  ud.playAnim    = ud.playAnim    || 'none';
  ud.teleport.mode   = ud.teleport.mode   || 'coords';
  if (ud.teleport.object == null) ud.teleport.object = '';
  ud.autoUnload  = ud.autoUnload  || false;
  if (ud.mapEnv === undefined) ud.mapEnv = true;   // 💡 standart YOQIQ
  if (!Array.isArray(ud.keepElements))   ud.keepElements   = [];
  if (!Array.isArray(ud.mapObjectNames)) ud.mapObjectNames = [];
  const p = obj.position, sz = ud.triggerSize, ld = ud.loading, tp = ud.teleport;
  const SEL = "flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";

  ic.innerHTML = `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent3-rgb),.15);color:var(--accent3)">MAP</span>Map Loader</div>
      <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 6px">
        O'yinchi shu zonaga kirganda eski karta o'chib, yangi karta (ZIP) yuklanadi va o'yinchi teleport qilinadi.
      </div>

      <div class="fl" style="margin:2px 0 3px">Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" value="${p.x.toFixed(2)}" oninput="window._mlSetPos(0,this.value)"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" value="${p.y.toFixed(2)}" oninput="window._mlSetPos(1,this.value)"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" value="${p.z.toFixed(2)}" oninput="window._mlSetPos(2,this.value)"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
      <div class="fl" style="margin:8px 0 3px">Zona o'lchami (W H D)</div>
      <div class="xyzr">
        <div><input class="xi" value="${sz.x.toFixed(2)}" oninput="window._mlSetSize(0,this.value)"><div class="xl" style="color:#ff5555">W</div></div>
        <div><input class="xi" value="${sz.y.toFixed(2)}" oninput="window._mlSetSize(1,this.value)"><div class="xl" style="color:#55ff55">H</div></div>
        <div><input class="xi" value="${sz.z.toFixed(2)}" oninput="window._mlSetSize(2,this.value)"><div class="xl" style="color:#5588ff">D</div></div>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent3-rgb),.15);color:var(--accent3)">ZIP</span>Karta ZIP</div>
      ${ud.mapName
        ? `<div style="font-size:9px;color:var(--accent);padding:2px 0 5px">✓ ${ud.mapName}</div>`
        : `<div style="font-size:9px;color:var(--muted);font-style:italic;padding:2px 0 5px">Karta tanlanmagan</div>`}
      <!-- FAYL YOLI ENDI ASOSIY.
           Kutubxona - brauzerning IndexedDB si, yani FAQAT shu
           kompyuter va shu brauzerda yashaydi. Boshqa mashinada
           yoki brauzer malumotlari tozalanganda kartalar yoqoladi.
           ZIP fayli esa kochma - u game.zip bilan bir xil mantiq.
           Shuning uchun asosiy tugma - fayl. -->
      <button class="action-btn" onclick="window._mlImportZip()"
        style="background:rgba(var(--accent-rgb),.14);border-color:var(--accent);color:var(--accent);width:100%;font-size:11px;padding:6px;font-weight:700">
        📦 Fayldan tanlash (.zip)
      </button>
      <button class="action-btn" onclick="window._mlPickFromLibrary()"
        title="Faqat shu brauzerda saqlangan kartalar"
        style="background:none;border-color:var(--border);color:var(--muted);width:100%;font-size:10px;padding:5px;margin-top:4px">
        📚 yoki brauzer kutubxonasidan
      </button>

      ${ud.mapB64 ? `
      <button class="action-btn" onclick="window._mlTogglePreview()"
        style="background:${ud._mlPreview ? 'rgba(var(--accent2-rgb),.18)' : 'rgba(var(--accent-rgb),.1)'};
        border-color:${ud._mlPreview ? 'var(--accent2)' : 'rgba(var(--accent-rgb),.4)'};
        color:${ud._mlPreview ? 'var(--accent2)' : 'var(--accent)'};width:100%;font-size:11px;padding:6px;margin-top:5px">
        ${ud._mlPreview ? '💾 Yopish va saqlash' : '👁 Kartani ko\'rish'}
      </button>
      <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.6;font-family:'Share Tech Mono',monospace">
        ${ud._mlPreview
          ? `<b style="color:var(--accent2)">Preview ochiq</b> — karta <b>eski karta o'rnida</b> turibdi, eski sahna vaqtincha yashirilgan.
             Odatdagidek tahrirlang: suring, o'chiring, yangi obyekt qo'shing, timeline chizing.<br>
             Yopganда hammasi <b>ZIP'ga qayta yoziladi</b> va eski sahna qaytadi.`
          : `Kartani <b>editorда</b> ochadi — <b>eski karta o'rniga</b> qo'yiladi, eski sahna yashiriladi
             (Play bosgandagi bilan bir xil ko'rinish). Har safar Play bosmasdan tahrirlash mumkin.
             Yopganда o'zgarishlar ZIP'ga saqlanadi.<br>
             <span style="color:var(--border)">Timeline'lar birlashadi — karta ichidagi hitbox tashqaridagi obyektni ham animatsiya qila oladi.</span>`}
      </div>` : ''}
      <div class="fr" style="margin-top:6px">
        <span class="fl">To'qnashuv</span>
        <select onchange="window._mlSetCollision(this.value)" style="${SEL}">
          <option value="original" ${(ud.collision||'original')==='original'?'selected':''}>Original (har biri o'zicha)</option>
          <option value="inline"   ${ud.collision==='inline'?'selected':''}>Hammasi Inline (o'yinchi o'tadi)</option>
          <option value="block"    ${ud.collision==='block'?'selected':''}>Hammasi Block (solid)</option>
        </select>
      </div>
      <div class="fr" style="margin-top:4px">
        <span class="fl">Kirganда animatsiya</span>
        <select onchange="window._mlSetPlayAnim(this.value)" style="${SEL}">
          <option value="none"    ${(ud.playAnim||'none')==='none'?'selected':''}>Yo'q</option>
          <option value="objects" ${ud.playAnim==='objects'?'selected':''}>Oddiy (obyektlar harakati)</option>
          <option value="camera"  ${ud.playAnim==='camera'?'selected':''}>Kamera cutscene</option>
        </select>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:4px 0 0">
        Timeline "ZIP eksport"i kerak. Obyektlar o'z koordinatalari va teksturasi bilan yuklanadi.
        <b>Original</b> — har obyekt o'z collision rejimida (eski ZIP'da collision yo'q — hammasi block bo'ladi, o'shanda <b>Inline</b> tanlang).
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent-rgb),.15);color:var(--accent)">LOAD</span>Loading Screen</div>
      <div class="fr">
        <span class="fl">Turi</span>
        <select onchange="window._mlSetLoading('type',this.value)" style="${SEL}">
          <option value="none"  ${ld.type==='none'?'selected':''}>Yo'q</option>
          <option value="html"  ${ld.type==='html'?'selected':''}>HTML</option>
          <option value="image" ${ld.type==='image'?'selected':''}>Rasm (URL)</option>
          <option value="video" ${ld.type==='video'?'selected':''}>Video (URL)</option>
        </select>
      </div>
      ${ld.type !== 'none' ? `
        <div class="fl" style="margin:5px 0 3px">${ld.type==='html'?'HTML kodi':'URL / manba'}</div>
        <textarea onchange="window._mlSetLoading('content',this.value)" rows="${ld.type==='html'?3:1}"
          placeholder="${ld.type==='image'?'https://.../rasm.png':ld.type==='video'?'https://.../video.mp4':'<div>Yuklanmoqda…</div>'}"
          style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:3px;padding:4px;resize:vertical">${_mlEsc(ld.content||'')}</textarea>
        <div class="fr" style="margin-top:5px">
          <span class="fl">Min. ko'rsatish (s)</span>
          <input type="number" step="0.1" min="0" value="${(ld.duration ?? 1.2)}" onchange="window._mlSetLoading('duration',parseFloat(this.value)||0)" style="${SEL}">
        </div>
      ` : ''}
    </div>

    <div class="comp-block">
      <div class="comp-title" style="cursor:pointer" onclick="window._mlToggleTeleport()">
        <span class="tag" style="background:rgba(var(--accent4-rgb),.15);color:var(--accent4)">TP</span>
        <span style="flex:1">Teleport (o'yinchi)</span>
        <input type="checkbox" ${tp.enabled?'checked':''} onclick="event.stopPropagation();window._mlToggleTeleport();" style="cursor:pointer">
      </div>
      ${tp.enabled ? `
        <div class="fr" style="margin:4px 0">
          <span class="fl">Rejim</span>
          <select onchange="window._mlSetTeleportMode(this.value)" style="${SEL}">
            <option value="coords" ${(tp.mode||'coords')==='coords'?'selected':''}>Koordinata (X Y Z)</option>
            <option value="object" ${tp.mode==='object'?'selected':''}>Karta obyektiga</option>
          </select>
        </div>
        ${tp.mode === 'object' ? `
          <div class="fr">
            <span class="fl">Obyekt</span>
            <select onchange="window._mlSetTeleportObject(this.value)" style="${SEL}">
              <option value="">— tanlang —</option>
              ${(ud.mapObjectNames||[]).map(n=>`<option value="${_mlEsc(n)}" ${tp.object===n?'selected':''}>${_mlEsc(n)}</option>`).join('')}
            </select>
          </div>
          <div style="font-size:8px;color:var(--muted);padding:3px 0 0">O'yinchi shu obyekt ustiga tushadi (masalan Kub 4). ${(ud.mapObjectNames||[]).length===0?'Avval ZIP import qiling.':''}</div>
        ` : `
          <div class="fl" style="margin:4px 0 3px">Koordinata (yangi kartada)</div>
          <div class="xyzr">
            <div><input class="xi" value="${(tp.x||0).toFixed(2)}" oninput="window._mlSetTeleport(0,this.value)"><div class="xl" style="color:#ff5555">X</div></div>
            <div><input class="xi" value="${(tp.y||0).toFixed(2)}" oninput="window._mlSetTeleport(1,this.value)"><div class="xl" style="color:#55ff55">Y</div></div>
            <div><input class="xi" value="${(tp.z||0).toFixed(2)}" oninput="window._mlSetTeleport(2,this.value)"><div class="xl" style="color:#5588ff">Z</div></div>
          </div>
        `}
      ` : ''}
    </div>

    <div class="comp-block">
      <div class="comp-title" style="cursor:pointer" onclick="window._mlToggleAlign()">
        <span class="tag" style="background:rgba(var(--accent-rgb),.15);color:var(--accent)">POS</span>
        <span style="flex:1">Eski karta markaziga tenglashtirish</span>
        <input type="checkbox" ${ud.alignToOld?'checked':''} onclick="event.stopPropagation();window._mlToggleAlign();" style="cursor:pointer">
      </div>
      <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 5px">
        ${ud.alignToOld
          ? `<b style="color:var(--accent2)">YOQIQ</b> — butun karta bir butun holda suriladi, markazi eski karta markaziga tushadi. Karta uzoqda yaratilgan bo'lsa foydali.`
          : `<b style="color:var(--accent3)">O'CHIQ</b> — obyektlar <b>saqlangan koordinatalarida</b> qoladi (o'z joyida). Ikkala karta ham koordinata boshi atrofida yasalgan bo'lsa shu kerak.`}
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title" style="cursor:pointer" onclick="window._mlToggleMapEnv()">
        <span class="tag" style="background:rgba(255,214,0,.15);color:#ffd600">MUHIT</span>
        <span style="flex:1">Karta o'z muhitini olib kelsin</span>
        <input type="checkbox" ${ud.mapEnv!==false?'checked':''} onclick="event.stopPropagation();window._mlToggleMapEnv();" style="cursor:pointer">
      </div>
      <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 5px">
        💡 chiroqlar · ✨ zarrachalar · 🌫 tuman — karta qanday yasalgan bo'lsa, shunday ko'rinadi.<br>
        Karta yuklanganda sahnaning muhiti <b>yashiriladi</b>, qaytganda <b style="color:var(--accent3)">o'zi qaytadi</b>
        (obyektlar bilan bir xil — hech nima o'chirilmaydi).<br>
        <span style="color:var(--border)">O'chirilsa — karta sahnaning mavjud yorug'ligida ko'rinadi.
        Eski kartalarda (muhit saqlanmagan) bu sozlama ta'sir qilmaydi.</span>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title" style="cursor:pointer" onclick="window._mlToggleAutoUnload()">
        <span class="tag" style="background:rgba(var(--accent2-rgb),.15);color:var(--accent2)">AUTO</span>
        <span style="flex:1">Portal rejimi (2-kirishда qaytish)</span>
        <input type="checkbox" ${ud.autoUnload?'checked':''} onclick="event.stopPropagation();window._mlToggleAutoUnload();" style="cursor:pointer">
      </div>
      ${ud.autoUnload ? `
        <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 5px">
          🔁 <b>PORTAL</b> — borib-qaytish uchun.<br>
          <b>1-kirish</b> — yangi karta keladi, eski karta yashirinadi.<br>
          <b>2-kirish</b> — <b style="color:var(--accent3)">eski karta qaytadi</b>.<br>
          <span style="color:var(--border)">Eski karta o'chirilmaydi — yashiriladi. Qaytganda hamma
          o'zgarishlar (pozitsiya, holat) joyida bo'ladi.</span>
        </div>` : `
        <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 5px">
          ➡️ <b>DARAJA ALMASHUVI</b> (standart) — bir tomonlama.<br>
          Kirilganda eski karta <b>butunlay ketadi</b>: modellar, teksturalar,
          pozitsiya, fizika — hammasi. O'rniga yangi karta keladi.<br>
          <b style="color:var(--accent3)">Qaytish uchun</b> — yangi kartaning ichiga
          BOSHQA Map Loader qo'ying va unga eski kartani bering.<br>
          <span style="color:var(--border)">Eski karta xotirada yashirin turadi (Stop bosilganda
          muharrirdagi sahnangiz qaytishi uchun), lekin o'yin uchun u YO'Q:
          narvon, hitbox, tugma, ovoz — hech biri ishlamaydi.</span>
        </div>`}

        <div class="fr" style="margin-bottom:5px">
          <span class="fl">Teskari rejim</span>
          <input type="checkbox" ${ud.keepReverse?'checked':''} onchange="window._mlToggleKeepReverse()" style="cursor:pointer">
        </div>
        <div style="font-size:9px;color:var(--accent2);letter-spacing:1px;font-family:'Share Tech Mono',monospace;margin:4px 0 3px">
          ${ud.keepReverse ? "🗑 SHULAR O'CHADI (qolgani qoladi)" : "📌 SHULAR QOLADI (qolgani o'chadi)"}
        </div>
        ${(ud.keepElements||[]).map((nm,i)=>`
          <div class="fr" style="margin-bottom:3px;gap:4px">
            <select onchange="window._mlSetKeep(${i},this.value)" style="${SEL}">
              <option value="">— tanlang —</option>
              ${(ud.mapObjectNames||[]).map(o2=>`<option value="${_mlEsc(o2)}" ${nm===o2?'selected':''}>${_mlEsc(o2)}</option>`).join('')}
            </select>
            <button onclick="window._mlRemoveKeep(${i})" title="O'chirish" style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);cursor:pointer;font-size:9px;padding:1px 6px;border-radius:2px">✕</button>
          </div>`).join('')}
        <button class="action-btn" onclick="window._mlAddKeep()"
          style="background:rgba(var(--accent2-rgb),.08);border-color:rgba(var(--accent2-rgb),.35);color:var(--accent2);width:100%;font-size:10px;padding:3px 6px">+ Element (${(ud.mapObjectNames||[]).length} mavjud)</button>
        ${(ud.mapObjectNames||[]).length===0 ? `<div style="font-size:8px;color:var(--muted);font-style:italic;padding:3px 0">Avval Karta ZIP import qiling — obyekt nomlari shu yerда chiqadi.</div>` : ''}
    </div>
  `;
}
window.buildMapLoaderInspector = buildMapLoaderInspector;

function _mlEsc(s) { return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _mlSel() { return (typeof selectedObj !== 'undefined' && selectedObj && selectedObj.userData && selectedObj.userData.isMapLoader) ? selectedObj : null; }

window._mlSetPos = function(i, v) {
  const o = _mlSel(); if (!o) return;
  const val = parseFloat(v); if (isNaN(val)) return;
  if (i === 0) o.position.x = val; else if (i === 1) o.position.y = val; else o.position.z = val;
};
window._mlSetSize = function(i, v) {
  const o = _mlSel(); if (!o) return;
  const val = Math.max(0.1, parseFloat(v) || 0.1);
  o.userData.triggerSize = o.userData.triggerSize || { x: 3, y: 3, z: 3 };
  if (i === 0) o.userData.triggerSize.x = val; else if (i === 1) o.userData.triggerSize.y = val; else o.userData.triggerSize.z = val;
  MapLoaderSystem.syncSize(o);
};
window._mlSetLoading = function(prop, v) {
  const o = _mlSel(); if (!o) return;
  o.userData.loading = o.userData.loading || { type: 'none', content: '', duration: 1.2 };
  o.userData.loading[prop] = v;
  if (prop === 'type' && typeof updateInspector === 'function') updateInspector();
};
window._mlToggleTeleport = function() {
  const o = _mlSel(); if (!o) return;
  o.userData.teleport = o.userData.teleport || { enabled: true, x: 0, y: 2, z: 0 };
  o.userData.teleport.enabled = !o.userData.teleport.enabled;
  if (typeof updateInspector === 'function') updateInspector();
};
window._mlSetTeleport = function(i, v) {
  const o = _mlSel(); if (!o) return;
  const val = parseFloat(v); if (isNaN(val)) return;
  o.userData.teleport = o.userData.teleport || { enabled: true, x: 0, y: 2, z: 0 };
  if (i === 0) o.userData.teleport.x = val; else if (i === 1) o.userData.teleport.y = val; else o.userData.teleport.z = val;
};
window._mlSetCollision = function(v) {
  const o = _mlSel(); if (!o) return;
  o.userData.collision = v;
};
window._mlSetTeleportMode = function(v) {
  const o = _mlSel(); if (!o) return;
  o.userData.teleport = o.userData.teleport || { enabled: true, x: 0, y: 2, z: 0 };
  o.userData.teleport.mode = v;
  if (typeof updateInspector === 'function') updateInspector();
};
window._mlSetTeleportObject = function(v) {
  const o = _mlSel(); if (!o) return;
  o.userData.teleport = o.userData.teleport || { enabled: true, x: 0, y: 2, z: 0 };
  o.userData.teleport.object = v;
};
window._mlSetPlayAnim = function(v) {
  const o = _mlSel(); if (!o) return;
  o.userData.playAnim = v;
};
window._mlToggleAlign = function() {
  const o = selectedObj; if (!o || !o.userData.isMapLoader) return;
  o.userData.alignToOld = !o.userData.alignToOld;
  log(o.userData.alignToOld
    ? '📐 Karta eski karta markaziga tenglashtiriladi'
    : "📐 Karta o'z koordinatalarida qoladi", 'lok');
  if (typeof updateInspector === 'function') updateInspector();
};

window._mlToggleMapEnv = function() {
  const o = _mlSel(); if (!o) return;
  o.userData.mapEnv = o.userData.mapEnv === false;   // undefined/true → false, false → true
  if (typeof updateInspector === 'function') updateInspector();
};
window._mlToggleAutoUnload = function() {
  const o = _mlSel(); if (!o) return;
  o.userData.autoUnload = !o.userData.autoUnload;
  if (typeof updateInspector === 'function') updateInspector();
};
window._mlToggleKeepReverse = function() {
  const o = _mlSel(); if (!o) return;
  o.userData.keepReverse = !o.userData.keepReverse;
  if (typeof updateInspector === 'function') updateInspector();
};
window._mlAddKeep = function() {
  const o = _mlSel(); if (!o) return;
  if (!Array.isArray(o.userData.keepElements)) o.userData.keepElements = [];
  o.userData.keepElements.push('');
  if (typeof updateInspector === 'function') updateInspector();
};
window._mlSetKeep = function(i, v) {
  const o = _mlSel(); if (!o) return;
  if (!Array.isArray(o.userData.keepElements) || i < 0 || i >= o.userData.keepElements.length) return;
  o.userData.keepElements[i] = v;
};
window._mlRemoveKeep = function(i) {
  const o = _mlSel(); if (!o) return;
  if (!Array.isArray(o.userData.keepElements) || i < 0 || i >= o.userData.keepElements.length) return;
  o.userData.keepElements.splice(i, 1);
  if (typeof updateInspector === 'function') updateInspector();
};
// 👁 Preview — ochish / saqlab yopish
window._mlTogglePreview = function() {
  const ml = _mlSel(); if (!ml) return;
  if (ml.userData._mlPreview) {
    MapLoaderSystem.previewOff(ml, true).then(() => { if (typeof updateInspector === 'function') updateInspector(); });
  } else {
    MapLoaderSystem.previewOn(ml).then(() => { if (typeof updateInspector === 'function') updateInspector(); });
  }
};

window._mlImportZip = function() {
  const o = _mlSel(); if (!o) { log('⚠ Map Loader tanlanmagan', 'lw'); return; }
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.zip,application/zip'; inp.style.display = 'none';
  inp.onchange = (e) => {
    const f = e.target && e.target.files && e.target.files[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = ev => window._mlAttachZip(o, ev.target.result, f.name);
      reader.readAsArrayBuffer(f);
    }
    if (inp.parentNode) inp.parentNode.removeChild(inp);
  };
  document.body.appendChild(inp);
  inp.click();
  setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
};

// ============================================================
//  📎 _mlAttachZip — ZIP ni Map Loader ga biriktirish
//
//  Fayl dialogi ham, 📚 kutubxona ham SHU funksiyaga tushadi.
//  Ilgari mantiq fayl obrabotchigi ichida qamalgan edi — aynan
//  `loadSceneFromZip` bilan bo'lgan holat (kutubxona uni chaqira
//  olmasdi va format qo'llab-quvvatlash ikkilanardi).
// ============================================================
window._mlAttachZip = async function(o, arrayBuffer, name) {
  try {
    o.userData.mapB64  = MapLoaderSystem._bufToB64(arrayBuffer);
    o.userData.mapName = name || 'karta.zip';
    // Manifestdan obyekt nomlarini ajratamiz (keep-elements ro'yxati uchun)
    o.userData.mapObjectNames = [];
    try {
      if (typeof JSZip !== 'undefined') {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const man = await MapLoaderSystem._readManifest(zip);
        if (!man) {
          log('⚠ ZIP ichida timeline.json / apex-file.json yo\'q — bu karta emas', 'lw');
          o.userData.mapB64 = null; o.userData.mapName = '';
          if (typeof updateInspector === 'function') updateInspector();
          return false;
        }
        o.userData.mapObjectNames = (man.objects || [])
          .filter(od => !od.isHitbox)   // hitboxlar keep ro'yxatiga kirmasin
          .map(od => od.name).filter(Boolean);
      }
    } catch (e2) { o.userData.mapObjectNames = []; }
    log(`✓ Karta: ${o.userData.mapName} (${o.userData.mapObjectNames.length} obyekt)`, 'lok');
    if (typeof updateInspector === 'function') updateInspector();
    return true;
  } catch (err) { log('⚠ ZIP o\'qishda xato: ' + err.message, 'lw'); return false; }
};

// ============================================================
//  📚 _mlPickFromLibrary — 🗺 Kartalar kutubxonasidan tanlash
//
//  Foydalanuvchi kartani dvigatel ichida saqlaydi, keyin uni Map
//  Loader ga bermoqchi bo'lsa — ilgari avval ⬇ bilan diskka
//  chiqarib, keyin 📦 bilan qayta yuklashi kerak edi. Endi
//  to'g'ridan-to'g'ri.
// ============================================================
window._mlPickFromLibrary = async function() {
  const o = (typeof selectedObj !== 'undefined' && selectedObj &&
             selectedObj.userData && selectedObj.userData.isMapLoader) ? selectedObj : null;
  if (!o) { log('⚠ Map Loader tanlanmagan', 'lw'); return; }
  if (!window.MapLibrary) { log('❌ Kartalar kutubxonasi yuklanmagan', 'le'); return; }

  const maps = await MapLibrary.list();
  if (!maps.length) {
    log('⚠ Kutubxonada karta yo\'q — avval 💾 Saqlash bilan qo\'shing', 'lw');
    return;
  }

  const esc = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s ?? ''))
                 : String(s ?? '').replace(/[&<>"']/g, ch =>
                     ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  document.getElementById('ml-lib-pick')?.remove();
  const p = document.createElement('div');
  p.id = 'ml-lib-pick';
  p.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(4,6,10,.72);backdrop-filter:blur(3px);' +
    'font-family:var(--font-ui,sans-serif)';
  p.innerHTML =
    '<div style="width:min(560px,92vw);max-height:80vh;display:flex;flex-direction:column;' +
    'background:var(--panel,#0f1318);border:1px solid var(--border,#1e2530);border-radius:6px;overflow:hidden">' +
      '<div style="display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border,#1e2530)">' +
        '<span style="font-size:13px;font-weight:700;color:var(--accent3);letter-spacing:1px">📚 KUTUBXONADAN KARTA</span>' +
        '<div style="flex:1"></div>' +
        '<button id="ml-lib-x" style="background:none;border:none;color:var(--muted,#4a5568);' +
        'font-size:18px;cursor:pointer;padding:0 4px">✕</button>' +
      '</div>' +
      '<div id="ml-lib-body" style="flex:1;overflow-y:auto;padding:12px 14px">' +
        maps.map(m =>
          '<div class="ml-lib-row" data-id="' + esc(m.id) + '" style="display:flex;gap:10px;' +
          'align-items:center;padding:8px;margin-bottom:6px;background:var(--panel2,#111620);' +
          'border:1px solid var(--border,#1e2530);border-radius:4px;cursor:pointer">' +
            (m.thumb
              ? '<img src="' + esc(m.thumb) + '" style="width:72px;height:41px;object-fit:cover;border-radius:3px;flex-shrink:0">'
              : '<div style="width:72px;height:41px;border-radius:3px;flex-shrink:0;background:#080b12;' +
                'display:flex;align-items:center;justify-content:center">🗺</div>') +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:12px;font-weight:700;color:var(--text,#c8d4e0);white-space:nowrap;' +
              'overflow:hidden;text-overflow:ellipsis">' + esc(m.name) + '</div>' +
              '<div style="font-size:10px;color:var(--muted,#4a5568);font-family:var(--font-mono,monospace)">' +
                esc(MapLibrary._fmtDate(m.date)) + ' · ' + esc(MapLibrary._fmtSize(m.size)) + '</div>' +
            '</div>' +
            '<span style="color:var(--accent3);font-size:11px;font-weight:700">Tanlash →</span>' +
          '</div>').join('') +
      '</div>' +
    '</div>';
  document.body.appendChild(p);

  const close = () => p.remove();
  p.addEventListener('click', e => { if (e.target === p) close(); });
  p.querySelector('#ml-lib-x').onclick = close;
  p.querySelectorAll('.ml-lib-row').forEach(row => {
    row.onclick = async () => {
      const rec = await MapLibrary.get(row.dataset.id);
      if (!rec) { log('❌ Karta topilmadi', 'le'); return; }
      close();
      await window._mlAttachZip(o, await rec.blob.arrayBuffer(), rec.name + '.zip');
    };
  });
};
