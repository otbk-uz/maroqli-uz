// ============================================================
//  SOUND BLOCK  —  ko'p funksiyali ovoz zonasi
//  Bitta blok ichida bir nechta BINDING (bog'lanish) bo'ladi.
//  Har binding: o'z klavishi (yoki W+Shift kabi 2-talik kombo),
//               o'z mp3 fayli, o'z rejimi.
//  Rejimlar:
//    hold   = klavishni BOSIB TURSA loop, QO'YVORSA to'xtaydi (walk.mp3).
//    loop   = klavish bossa loop bo'ladi, zonadan chiqsa to'xtaydi.
//    toggle = 1-marta yoq, 2-marta o'chir (vaklyuchatel).
//    timer     = ⏱🧍 O'YINCHI BILAN — o'yinchi zonaga KIRGACH sanoq
//                boshlanadi, vaqt tugagach ovoz chalinadi. Chiqib ketsa
//                sanoq bekor bo'ladi.
//    timerAuto = ⏱🌐 O'YINCHISIZ — ▶ Play bosilishi bilan sanaydi.
//                O'yinchi zonaga kiradimi-yo'qmi — ahamiyati yo'q,
//                vaqt tugasa ovoz o'zi boshlanadi. Zonadan chiqish
//                ham to'xtatmaydi.
//  Klavish "WASD" tanlansa — istalgan yurish tugmasi (W/A/S/D/strelka).
//  2-talik kombo: ikkala klavish birga bosilsa ishlaydi (mas: WASD + SHIFT = yugurish).
//
//  ── 🔊 BALANDLIK SHKALASI (timeline bilan) ───────────────
//    Blokda `sbVolume` (0…1) — BUTUN blokning umumiy balandligi.
//    U timeline keyframe'ga tushadi (`sbVol`) va keylar orasida
//    SILLIQ o'zgaradi: 3-soniyada 50%, 8-soniyada 100% qo'ysangiz —
//    ovoz o'sha 5 soniya davomida asta ko'tariladi.
//
//    ⚠ NEGA BLOKDA, BINDINGDA EMAS: bitta blokda bir nechta ovoz
//      bo'ladi va ular birga ko'tarilib-tushishi kerak ("sahna ovozi
//      susaydi"). Har bindingga alohida trek qo'ysak timeline o'nta
//      trek bilan to'lib ketardi.
//
//    ⚠ NEGA KO'PAYTUVCHI, ALMASHTIRUVCHI EMAS: bindingning o'z
//      `volMax` i va 🎧 masofa hisobi joyida qoladi — shkala
//      ularning USTIDAN ko'paytiriladi. Aks holda timeline keyi
//      masofa effektini jimgina o'chirib qo'yardi.
// ============================================================
const SoundBlockSystem = (() => {
  let _sbIdC = 0;

  // ── Aks-sado presetlari (joy turiga qarab) ──
  //   duration = aks-sado davomiyligi, decay = so'nish, wet = balandlik (0..1)
  const REVERB = {
    none: { duration: 0.0, decay: 1.0, wet: 0.00 },
    room: { duration: 0.5, decay: 2.6, wet: 0.16 }, // kichik xona
    hall: { duration: 1.4, decay: 2.2, wet: 0.24 }, // katta zal
    cave: { duration: 2.8, decay: 1.8, wet: 0.32 }, // g'or — uzun aks-sado
  };
  const _irCache = {};
  // Impuls javobini protsedurali yaratish (silliq — g'irillamasin)
  function _impulse(ctx, type) {
    const p = REVERB[type];
    if (!p || p.duration <= 0) return null;
    const c = _irCache[type];
    if (c && c.sampleRate === ctx.sampleRate) return c;
    const len = Math.max(1, Math.floor(ctx.sampleRate * p.duration));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0; // bir-polyusli past-chastota filtri (shovqin qirralarini yumshatadi)
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        lp = lp * 0.72 + white * 0.28;           // yumshoq shovqin
        d[i] = lp * Math.pow(1 - i / len, p.decay);
      }
    }
    _irCache[type] = buf;
    return buf;
  }
  // library[name] ichidan AudioBuffer'ni olish (turli tuzilishlarga chidamli)
  function _getBuffer(name) {
    if (typeof SoundSystem === 'undefined' || !SoundSystem.library) return null;
    const e = SoundSystem.library[name];
    if (!e) return null;
    if (e instanceof AudioBuffer) return e;
    if (e.buffer instanceof AudioBuffer) return e.buffer;
    if (e.audioBuffer instanceof AudioBuffer) return e.audioBuffer;
    if (e.sound && e.sound.buffer instanceof AudioBuffer) return e.sound.buffer;
    return null;
  }
  function _listener() {
    return (typeof SoundSystem !== 'undefined' && SoundSystem.listener) ? SoundSystem.listener : null;
  }

  function _newBinding(id) {
    return {
      id:        id,
      key1:      'KeyE',
      key2:      '',        // '' = bitta klavish; aks holda kombo (ikkalasi birga)
      soundName: '',
      mode:      'hold',    // 🔁 CHALISH rejimi: hold | loop | toggle
      //  ⏱ Taymer — MUSTAQIL. Yoqilsa klavish o'rniga vaqt ishga
      //    tushiradi, `mode` esa qanday chalinishini belgilaydi.
      timerOn:   false,
      volume:    0.7,       // (eski) — volMax bilan bir xil, moslik uchun
      volMax:    0.7,       // yaqinda / 3D o'chiq bo'lsa — balandlik
      volMin:    0.0,       // uzoqda — eng past balandlik
      timerDelay:3,
      //  ⚠ ESKI maydon. Yangi sahnalarda loop `mode: 'loop'` dan
      //    olinadi; bu faqat eski fayllarni ko'chirish uchun qoldi.
      timerLoop: true,
      // ⚠ `timerRepeat` — sanoq QAYTA boshlansinmi. `timerLoop` dan
      //   FARQLI: `timerLoop` ovozning o'zini takrorlaydi, bu esa
      //   TAYMERNI. \"Har 30 soniyada bir marta qo'ng'iroq\" uchun
      //   `timerLoop=false` + `timerRepeat=true` kerak — ilgari buni
      //   qilishning iloji yo'q edi.
      timerRepeat: false,
      spatial:   false,   // masofaga bog'liq ovoz (yaqin balandroq, uzoq pastroq)
      reverb:    'none',  // aks-sado: none | room | hall | cave
      // ── runtime (saqlanmaydi) ──
      _playing:  false,
      _prevKey:  false,
      _node:     null,
      _timer:    -1,
      _spatial:  false,  // masofaga bog'liq ovoz ijro etilyaptimi
      _revNodes: null,   // { conv, lp, wet } aks-sado tugunlari
    };
  }

  function _defaultData() {
    return {
      isSoundBlock: true,
      triggerSize:  { x: 3, y: 3, z: 3 },
      zoneShape:    'box',                 // box | sphere | pyramid
      audioOffset:  { x: 0, y: 0, z: 0 },  // yashil shar (ovoz markazi) — kub markaziga nisbatan
      // 🔊 Umumiy balandlik shkalasi (0…1). Timeline `sbVol` keyi shuni yozadi.
      sbVolume:     1,
      // ⏱ Taymer rejimi — BUTUN blok uchun umumiy: 'player' | 'auto'
      //  ⚠ Balandlik shkalasi bilan AYNAN bir xil sabab: bitta blokdagi
      //    hamma taymer bir xil qoidada ishlashi kerak. Ilgari u har
      //    bindingda alohida edi va besh ovozli blokda beshta joyda
      //    almashtirish kerak bo'lardi — bittasi unutilsa u boshqacha
      //    yurib, sababi ko'rinmasdi.
      timerNeedsPlayer: true,
      bindings:     [ _newBinding(1) ],
      _bindIdC:     1,
      _sbInside:    false,
    };
  }

  // ── Ovoz markazi shari (yashil) — faqat editor'da ko'rinadi ──
  //  ⚠ Bu ro'yxat endi faqat CHALISH rejimlari. ⏱ Taymer undan
  //    CHIQARILDI — u rejim emas, mustaqil qo'shimcha (`timerOn`).
  //    Ilgari `timer` shu yerda turgani uchun uni tanlash 🔁 loop ni
  //    YO'QOTARDI: \"5 soniyadan keyin boshlanib uzluksiz chaladigan\"
  //    fon musiqasini yasab bo'lmasdi.
  const _MODES = { hold: 1, loop: 1, toggle: 1 };

  //  ⚠ Eski sahnalar bilan moslik uchun qoldirildi: ular `mode`
  //    ichida `timer` / `timerAuto` yozib yuborgan.
  const _isTimer = (m) => m === 'timer' || m === 'timerAuto';

  // ============================================================
  //  🔊 Umumiy balandlik shkalasi
  // ------------------------------------------------------------
  //  ⚠ Bitta joydan o'qiladi: `_startB` boshlanish balandligini
  //    shundan oladi, `update()` esa har kadr shu bilan yangilaydi.
  //    Ikki joyda alohida hisoblansa, timeline keyi faqat YANGI
  //    boshlangan ovozga ta'sir qilardi — allaqachon chalinayotgani
  //    eski balandlikda qolib ketardi.
  // ============================================================
  /**
   * ⏱ Bu blokning taymeri O'YINCHINI talab qiladimi?
   *
   * ⚠ KO'CHIRISH QOIDASI (eski sahnalar): sozlama BLOKKA ko'chdi,
   *   lekin eski fayllarda u bindingda `mode: 'timerAuto'` bo'lib
   *   yozilgan. Shuning uchun: blokda maydon bo'lsa — u ustun;
   *   bo'lmasa, bindinglardan birortasi `timerAuto` bo'lsa blok
   *   🌐 o'yinchisiz deb qabul qilinadi. Aks holda 🧍.
   *   Shunda eski sahnalar AYNAN oldingidek ishlaydi.
   */
  function _needsPlayer(sb) {
    const ud = sb && sb.userData;
    if (!ud) return true;
    if (typeof ud.timerNeedsPlayer === 'boolean') return ud.timerNeedsPlayer;
    const bs = ud.bindings;
    if (Array.isArray(bs) && bs.some(b => b && b.mode === 'timerAuto')) return false;
    return true;
  }

  function _masterVol(sb) {
    const v = sb && sb.userData ? sb.userData.sbVolume : 1;
    if (typeof v !== 'number' || !isFinite(v)) return 1;
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  // ── Zona shakli: geometriya va "ichkarida"-testi ──
  function _zoneGeometry(ud) {
    const s = ud.triggerSize || { x: 3, y: 3, z: 3 };
    const shape = ud.zoneShape || 'box';
    let g;
    if (shape === 'sphere') {
      g = new THREE.SphereGeometry(0.5, 20, 14); g.scale(s.x, s.y, s.z);
    } else if (shape === 'pyramid') {
      g = new THREE.ConeGeometry(0.5, 1, 4);      g.scale(s.x, s.y, s.z); // 4 tomonli piramida
    } else {
      g = new THREE.BoxGeometry(s.x, s.y, s.z);
    }
    return g;
  }
  // O'yinchi zona ichidami (markazga nisbatan dx,dy,dz)
  function _insideZone(ud, dx, dy, dz) {
    const s = ud.triggerSize || { x: 3, y: 3, z: 3 };
    const hx = s.x / 2, hy = s.y / 2, hz = s.z / 2;
    const shape = ud.zoneShape || 'box';
    if (shape === 'sphere') {
      const nx = dx / hx, ny = dy / hy, nz = dz / hz;
      return (nx * nx + ny * ny + nz * nz) <= 1;
    }
    if (shape === 'pyramid') {
      if (dy < -hy || dy > hy) return false;
      const t = (hy - dy) / (2 * hy);           // pastda 1, tepada 0
      const rx = hx * t, rz = hz * t;
      if (rx <= 1e-4 || rz <= 1e-4) return false;
      return (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz) <= 1;
    }
    return Math.abs(dx) <= hx && Math.abs(dy) <= hy && Math.abs(dz) <= hz;
  }

  // Blok o'lchamiga qarab maksimal eshitilish masofasi (blok kattarsa — masofa kattaradi)
  function _audioMaxDist(sb) {
    const s = (sb.userData && sb.userData.triggerSize) || { x: 3, y: 3, z: 3 };
    return Math.max(s.x, s.y, s.z) * 0.7 + 0.5;
  }
  // Sharni yaratish (yo'q bo'lsa) — qayta yuklangan bloklar uchun ham. Faqat markaz nuqtasi.
  function _ensureAnchor(sb) {
    const ud = sb.userData;
    let a = ud._audioAnchor;
    if (!a || a.parent !== sb) a = sb.children.find(c => c && c.name === '__sbAudioAnchor');
    if (a && a.parent === sb) { ud._audioAnchor = a; return a; }

    ud.audioOffset = ud.audioOffset || { x: 0, y: 0, z: 0 };
    a = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9, depthTest: false })
    );
    a.name = '__sbAudioAnchor';
    a.renderOrder = 999;
    a.raycast = () => {};                 // ray/klik tegmaydi
    a.userData.__noSave = true;           // saqlashda tashlab ketilsin (serializer hisobga olsa)
    a.position.set(ud.audioOffset.x, ud.audioOffset.y, ud.audioOffset.z);
    sb.add(a);
    ud._audioAnchor = a;
    return a;
  }

  // Eski (bitta-ovozli) bloklarni yangi bindings tuzilishiga o'tkazish
  function ensureBindings(ud) {
    if (!Array.isArray(ud.bindings)) {
      const b = _newBinding(1);
      b.key1       = ud.triggerKey || 'KeyE';
      b.soundName  = ud.soundName  || '';
      b.mode       = _MODES[ud.playMode] ? ud.playMode : 'loop';
      b.volume     = ud.volume     != null ? ud.volume : 0.7;
      b.timerDelay = ud.timerDelay != null ? ud.timerDelay : 3;
      b.timerLoop  = ud.timerLoop  != null ? ud.timerLoop : true;
      ud.bindings  = [ b ];
      ud._bindIdC  = 1;
    }
    if (ud._bindIdC == null) {
      ud._bindIdC = ud.bindings.reduce((m, b) => Math.max(m, b.id || 0), 0) || 1;
    }
    // ⚠ ESKI SAHNALAR: `sbVolume` va `timerRepeat` ular yozilganda
    //   yo'q edi. `undefined` qolsa `_masterVol` 1 qaytaradi (jarima
    //   yo'q), lekin inspektor slayderi bo'sh chiqardi va birinchi
    //   tekkanda ovoz sakrab ketardi. Shu bois bir marta to'ldiramiz.
    if (typeof ud.sbVolume !== 'number') ud.sbVolume = 1;
    for (const b of ud.bindings) {
      if (b.timerRepeat === undefined) b.timerRepeat = false;
      if (b._lastVol === undefined)    b._lastVol    = -1;
    }
    return ud.bindings;
  }

  /**
   * Saqlangan Sound Block ning KO'RINISHINI tiklaydi.
   * Prefab/sahna yuklashda u oddiy kub bo'lib keladi — bu yerda zonaning
   * to'q sariq simli chegarasi, shaffof to'ldirishi va yashil ovoz-markaz
   * shari qaytariladi. `userData` konfiguratsiyasiga tegilmaydi.
   * ⚠ `create()` dan farqi: sahnaga/`objects` ga QO'SHMAYDI — chaqiruvchi
   *   (prefab spawn) buni o'zi qiladi, aks holda ikki marta qo'shilardi.
   */
  function restoreVisual(mesh) {
    if (!mesh || !mesh.isMesh) return mesh;
    try { mesh.material && mesh.material.dispose(); } catch (e) {}
    mesh.material = new THREE.MeshBasicMaterial({
      color: 0xff8c00, wireframe: true, transparent: true, opacity: 0.6 });
    mesh.castShadow = false; mesh.receiveShadow = false;

    // Eski to'ldirish/anchor qolgan bo'lsa — ikkilanmasin
    [...mesh.children].forEach(c => {
      if (c && (c.name === '__sbFill' || c.name === '__sbAudioAnchor')) {
        mesh.remove(c);
        try { c.geometry && c.geometry.dispose(); c.material && c.material.dispose(); } catch (e) {}
      }
    });

    const fill = new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0xff8c00, transparent: true, opacity: 0.07, depthWrite: false }));
    fill.raycast = () => {};
    fill.name = '__sbFill';
    mesh.add(fill);

    // `_fillRef` va `_audioAnchor` — `_` bilan boshlanadi, saqlashda
    // tashlanadi. `syncSize` aynan shularga tayanadi.
    mesh.userData._fillRef     = fill;
    mesh.userData._audioAnchor = null;
    mesh.userData.colliderMode = 'inline';
    _ensureAnchor(mesh);
    syncSize(mesh);
    return mesh;
  }

  function create(pos) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8c00, wireframe: true, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.castShadow = false; mesh.receiveShadow = false;

    const fill = new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0xff8c00, transparent: true, opacity: 0.07, depthWrite: false }));
    fill.raycast = () => {};
    fill.name = '__sbFill';       // restoreVisual shu nom bo'yicha topadi
    mesh.add(fill);

    mesh.position.copy(pos || new THREE.Vector3(0, 1.5, 0));
    mesh.userData = Object.assign({ id: ++objIdC, name: 'Sound Block ' + (++_sbIdC) }, _defaultData());
    mesh.userData.colliderMode = 'inline';
    mesh.userData._fillRef = fill;
    _ensureAnchor(mesh);   // yashil ovoz-markaz nuqtasi
    syncSize(mesh);        // shakl/geometriyani qurish

    scene.add(mesh);
    objects.push(mesh);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof selectObject === 'function') selectObject(mesh);
    if (typeof updateStats === 'function') updateStats();
    if (typeof captureState === 'function') captureState('Sound Block qo\'shildi');
    log('🔊 <span style="color:var(--accent2)">' + mesh.userData.name + '</span> qo\'shildi', 'lok');
    return mesh;
  }

  function syncSize(sb) {
    const s = sb.userData.triggerSize || { x: 3, y: 3, z: 3 };
    const ud = sb.userData;
    if (sb.geometry) sb.geometry.dispose();
    sb.geometry = _zoneGeometry(ud);
    const fill = sb.userData._fillRef;
    if (fill) { if (fill.geometry) fill.geometry.dispose(); fill.geometry = _zoneGeometry(ud); }

    // Sharni kub ichida ushlab turish
    const a = _ensureAnchor(sb);
    if (ud.audioOffset && a) {
      ud.audioOffset.x = Math.max(-s.x / 2, Math.min(s.x / 2, ud.audioOffset.x));
      ud.audioOffset.y = Math.max(-s.y / 2, Math.min(s.y / 2, ud.audioOffset.y));
      ud.audioOffset.z = Math.max(-s.z / 2, Math.min(s.z / 2, ud.audioOffset.z));
      a.position.set(ud.audioOffset.x, ud.audioOffset.y, ud.audioOffset.z);
    }
  }

  // ── Faol o'yinchi ──
  function _getPlayerRef() {
    if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent) return playerMesh;
    if (typeof PlayerController !== 'undefined' && PlayerController.obj) return PlayerController.obj;
    if (typeof playerMesh !== 'undefined' && playerMesh) return playerMesh;
    return null;
  }

  // ── Global klavish holati (fpsKeys — interaktiv tugmalar ham shuni ishlatadi)
  function _keyDown(code) {
    return !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[code]);
  }
  // ── Klavish bosib turilganmi. 'WASD' = istalgan yurish tugmasi, modifikatorlar L/R.
  function _keyHeld(code) {
    if (!code) return false;
    if (code === 'WASD') {
      return _keyDown('KeyW') || _keyDown('KeyA') || _keyDown('KeyS') || _keyDown('KeyD') ||
             _keyDown('ArrowUp') || _keyDown('ArrowDown') || _keyDown('ArrowLeft') || _keyDown('ArrowRight');
    }
    if (code === 'ShiftLeft')   return _keyDown('ShiftLeft')   || _keyDown('ShiftRight');
    if (code === 'ControlLeft') return _keyDown('ControlLeft') || _keyDown('ControlRight');
    if (code === 'AltLeft')     return _keyDown('AltLeft')     || _keyDown('AltRight');
    return _keyDown(code);
  }
  // ── Binding klavishi(lari) bosilganmi (kombo bo'lsa — ikkalasi birga)
  function _bindHeld(b) {
    const h1 = _keyHeld(b.key1);
    if (!b.key2) return h1;
    return h1 && _keyHeld(b.key2);
  }

  const _tmpV = new THREE.Vector3(), _tmpP = new THREE.Vector3(), _tmpA = new THREE.Vector3();

  // Masofadan balandlikni hisoblash (faqat masofaga bog'liq — yaqin balandroq, uzoq pastroq)
  function _volFromDist(b, dist, maxD) {
    const ref  = 0.5;
    const vMax = b.volMax != null ? b.volMax : (b.volume != null ? b.volume : 0.7);
    const vMin = b.volMin != null ? b.volMin : 0;
    const t = Math.max(0, Math.min(1, (dist - ref) / Math.max(0.001, maxD - ref)));
    return vMax + (vMin - vMax) * t;   // yaqinda vMax, uzoqda vMin
  }

  // ── Bitta binding ovozini boshlash ──
  function _startB(b, loop, sb) {
    if (!b.soundName || typeof SoundSystem === 'undefined') {
      log('⚠ Sound Block: ovoz import qilinmagan/tanlanmagan', 'lw');
      return;
    }
    _stopB(b);

    // 🔊 Shkala boshlanishdayoq hisobga olinadi: aks holda ovoz to'liq
    //    balandlikda \"chirt\" etib boshlanib, keyin pasayardi.
    const vMax = (b.volMax != null ? b.volMax : (b.volume != null ? b.volume : 0.7)) * _masterVol(sb);

    // ── Ovozni HAR DOIM dvijokning ishlaydigan yo'li orqali chalamiz ──
    //    (SoundSystem.play(name, null, …) → global THREE.Audio — burилиш/yo'nalish ta'sir qilmaydi)
    const node = SoundSystem.play(b.soundName, null, { loop: !!loop, volume: vMax });
    b._node    = node || null;
    b._playing = true;

    const listener = _listener();
    if (listener && listener.context && listener.context.state === 'suspended') {
      try { listener.context.resume(); } catch (e) {}
    }

    // ── Masofaga bog'liq bo'lsa: markazni ta'minlab, reverb qo'shib, update() balandlikni boshqaradi ──
    if (b.spatial && node && listener) {
      b._spatial = true;
      _ensureAnchor(sb);

      // Aks-sado (g'or / zal / xona) — yumshoq, past-chastota filtrli
      try {
        const ir = _impulse(listener.context, b.reverb || 'none');
        if (ir && node.getOutput) {
          const ctx  = listener.context;
          const conv = ctx.createConvolver(); conv.buffer = ir;
          const lp   = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
          const wet  = ctx.createGain();      wet.gain.value = (REVERB[b.reverb] || REVERB.none).wet;
          const out  = node.getOutput();      // THREE.Audio chiqishi (gain)
          out.connect(conv); conv.connect(lp); lp.connect(wet); wet.connect(listener.getInput());
          b._revNodes = { conv, lp, wet };
        }
      } catch (e) { /* reverb bo'lmasa ham ovoz chalaveradi */ }
    } else {
      b._spatial = false;
    }
  }
  // ── Bitta binding ovozini to'xtatish ──
  function _stopB(b) {
    const n = b._node;
    if (n) { try { if (n.isPlaying) n.stop(); } catch (e) {} }
    // Aks-sado tugunlarini uzish
    if (b._revNodes) {
      try { b._revNodes.conv.disconnect(); b._revNodes.lp && b._revNodes.lp.disconnect(); b._revNodes.wet.disconnect(); } catch (e) {}
      b._revNodes = null;
    }
    b._node    = null;
    b._spatial = false;
    b._playing = false;
  }

  function _resetBinding(b) {
    if (b._playing) _stopB(b);
    b._playing = false; b._prevKey = false; b._node = null; b._timer = -1;
    b._armed   = false;   // ⏱🌐 o'yinchisiz taymer hali qurilmagan
    b._lastVol = -1;      // 🔊 kesh — keyingi kadrda majburan yangilanadi
  }

  // ============================================================
  //  🔊 Chalinayotgan ovoz balandligini JONLI o'zgartirish
  // ------------------------------------------------------------
  //  ⚠ NEGA `setTargetAtTime`: `gain.value` ni to'g'ridan yozish
  //    \"zipper\" shovqini beradi (qiymat sakrab o'zgaradi, quloqqa
  //    chirsillash bo'lib eshitiladi). 50 ms konstanta bilan silliq.
  //
  //  ⚠ NEGA KESH (`_lastVol`): bu funksiya HAR KADR chaqiriladi.
  //    O'zgarish bo'lmasa Web Audio grafigiga tegmaymiz — 144 Hz da
  //    bekorga `setTargetAtTime` yozish protsessorni yeydi.
  // ============================================================
  function _applyVol(b, vol) {
    const v = Math.max(0, Math.min(1, vol));
    if (b._lastVol >= 0 && Math.abs(b._lastVol - v) < 0.001) return;
    b._lastVol = v;
    const n = b._node;
    if (!n) return;
    try {
      const g = n.gain;
      if (g && g.gain && n.context) g.gain.setTargetAtTime(v, n.context.currentTime, 0.05);
      else if (n.setVolume) n.setVolume(v);
    } catch (e) {
      try { if (n.setVolume) n.setVolume(v); } catch (e2) {}
    }
  }

  function update(delta) {
    const playing = (typeof isPlaying !== 'undefined' && isPlaying) ||
                    (typeof window !== 'undefined' && window.isPlaying);

    // Zonalar o'yin paytida ko'rinmas
    for (const o of objects) {
      if (o.userData && o.userData._mlOff) continue;   // 🚫 yashirilgan karta
      if (o.userData && o.userData.isSoundBlock) o.visible = !playing;
    }

    // Edit rejimida — hammasini to'xtat
    if (!playing) {
      for (const o of objects) {
        const ud = o.userData; if (!ud || !ud.isSoundBlock || ud._mlOff) continue;
        if (Array.isArray(ud.bindings)) for (const b of ud.bindings) _resetBinding(b);
        ud._sbInside = false;
      }
      return;
    }

    // ============================================================
    //  ⚠ O'YINCHI ENDI MAJBURIY EMAS
    // ------------------------------------------------------------
    //  Ilgari shu yerda `if (!player) return;` turardi. Bu ikki
    //  narsani buzardi:
    //    1) ⏱🌐 o'yinchisiz taymer — ta'rifan o'yinchiga bog'liq
    //       emas, lekin o'yinchi topilmasa umuman sanamasdi;
    //    2) o'yinchisiz sahnada (kino, menyu foni, kesish sahnasi)
    //       hech qanday ovoz bloki ishlamasdi.
    //
    //  Endi o'yinchi YO'Q bo'lsa ham sikl yuradi: `pp === null`
    //  bo'ladi, `inside` doim `false`, ya'ni zonaga bog'liq
    //  rejimlar (hold/loop/toggle/timer) tabiiy ravishda jim
    //  turadi — ular baribir o'yinchisiz ma'noga ega emas.
    // ============================================================
    const player = _getPlayerRef();
    let pp = null;
    if (player) {
      player.updateMatrixWorld(true);
      pp = _tmpP.setFromMatrixPosition(player.matrixWorld);
    }

    for (const o of objects) {
      const ud = o.userData;
      if (!ud || !ud.isSoundBlock || ud._mlOff) continue;
      const binds = ensureBindings(ud);
      _ensureAnchor(o);   // yashil markaz nuqtasi (qayta yuklangan bloklar uchun ham)

      o.updateMatrixWorld(true);
      const c = _tmpV.setFromMatrixPosition(o.matrixWorld);
      // ⚠ O'yinchi yo'q bo'lsa \"ichkarida emas\" — zonaga bog'liq
      //   rejimlar jim turadi, ⏱🌐 esa pastda baribir sanaydi.
      const inside = pp ? _insideZone(ud, pp.x - c.x, pp.y - c.y, pp.z - c.z) : false;

      const justEntered = inside && !ud._sbInside;
      const justExited  = !inside && ud._sbInside;
      ud._sbInside = inside;

      // Ovoz markazi (yashil nuqta) — dunyo koordinatasi; masofa shu yerdan o'lchanadi
      const anchor = ud._audioAnchor;
      let ap = c;
      if (anchor) { anchor.updateMatrixWorld(true); ap = _tmpA.setFromMatrixPosition(anchor.matrixWorld); }
      const distToCenter = pp ? ap.distanceTo(pp) : 0;
      const maxD = _audioMaxDist(o);
      const master = _masterVol(o);
      // ⏱ Taymer rejimi — BLOKDAN, bindingdan emas.
      //  ⚠ Eski sahnalarda maydon yo'q → `true` (🧍 o'yinchi bilan),
      //    ya'ni eski xulq saqlanadi. Eski `timerAuto` rejimidagi
      //    bindinglar esa pastda o'zi 🌐 yo'lga tushadi.
      const needsPlayer = _needsPlayer(o);

      for (const b of binds) {
        const mode  = _playMode(b);
        const held  = inside && _bindHeld(b);          // zona ichida + klavish bosilgan
        const press = held && !b._prevKey;              // yangi bosildi (rising-edge)
        b._prevKey  = held;

        // ============================================================
        //  ⏱ TAYMER — REJIM EMAS, QO'SHIMCHA
        // ------------------------------------------------------------
        //  ⚠ ILGARI ⏱ Timer rejimlar RO'YXATIDA turardi:
        //    hold / loop / toggle / timer. Ya'ni taymerni tanlash
        //    🔁 LOOP ni YO'QOTARDI va "5 soniyadan keyin boshlanib,
        //    uzluksiz chaladigan" fon musiqasini yasashning iloji
        //    YO'Q edi. Foydalanuvchi aynan shuni so'radi:
        //    "timerga o'rniga loop qo'ymoqchi bo'lsam nima qilaman?"
        //
        //  Endi ikkisi MUSTAQIL o'q:
        //    • `timerOn` — NIMA ishga tushiradi (klavish yoki vaqt)
        //    • `mode`    — ishga tushgach QANDAY chalinadi
        //  Shuning uchun ⏱ + 🔁 birga bo'lishi mumkin.
        // ============================================================
        if (_timerOn(b)) {
          //  ⚠ Loop endi REJIMDAN olinadi, alohida `timerLoop`
          //    bayrog'idan emas — ikki manba ziddiyatga tushardi
          //    ("rejim loop, bayroq o'chiq — qaysi biri ustun?").
          const loop = (mode === 'loop' || mode === 'hold');
          if (needsPlayer) {
            // ── ⏱🧍 Sanoq zonaga KIRGANDA boshlanadi ─────────────
            if (justEntered) b._timer = _delayOf(b);
            if (b._timer > 0) {
              b._timer -= delta;
              //  ⚠ `-1` EMAS, `_fireTimer` qaytargani: ⏲ sanoq
              //    qaytarilishi yoqiq bo'lsa darrov qayta quriladi.
              if (b._timer <= 0) b._timer = _fireTimer(b, o, loop);
            }
            if (justExited) { b._timer = -1; if (b._playing) _stopB(b); }
          } else {
            // ── ⏱🌐 Sanoq ▶ Play bilan BIR MARTA quriladi ────────
            //  ⚠ `justEntered` ga bog'lamaymiz — o'yinchi umuman
            //    bo'lmasligi mumkin. Zonadan chiqish ham to'xtatmaydi:
            //    bu rejimning butun MA'NOSI shu.
            if (!b._armed) { b._armed = true; b._timer = _delayOf(b); }
            if (b._timer > 0) {
              b._timer -= delta;
              if (b._timer <= 0) b._timer = _fireTimer(b, o, loop);
            }
          }

        } else if (mode === 'hold') {
          if (held && !b._playing) _startB(b, true, o);
          else if (!held && b._playing) _stopB(b);

        } else if (mode === 'loop') {
          if (press && !b._playing) _startB(b, true, o);
          if (justExited && b._playing) _stopB(b);

        } else if (mode === 'toggle') {
          if (press) { if (b._playing) _stopB(b); else _startB(b, true, o); }
        }

        // ── 🔊 Balandlik: masofa × umumiy shkala ─────────────────
        //  ⚠ Ilgari bu blok FAQAT `b._spatial` bo'lganda ishlardi.
        //    Ya'ni 3D o'chiq oddiy ovozning balandligi boshlanish
        //    paytida bir marta qo'yilib, keyin qotib qolardi —
        //    timeline shkalasi unga UMUMAN ta'sir qilmasdi.
        //    Endi ikkala holat ham shu yerdan boshqariladi.
        if (b._playing && b._node) {
          const base = (b._spatial && pp)
            ? _volFromDist(b, distToCenter, maxD)
            : (b.volMax != null ? b.volMax : (b.volume != null ? b.volume : 0.7));
          _applyVol(b, base * master);
        }
      }
    }
  }

  /** ⏱ Kechikish (soniya) — manfiy/bo'sh qiymatlardan himoyalangan. */
  function _delayOf(b) {
    const d = Number(b.timerDelay);
    return (isFinite(d) && d > 0) ? d : (b.timerDelay === 0 ? 0.0001 : 3);
  }

  /**
   * ⏱ Vaqt tugadi — ovozni boshlaydi.
   * @returns {number} yangi `_timer` qiymati: `timerRepeat` yoqiq bo'lsa
   *   qaytadan sanoq, aks holda `-1` (o'chiq).
   *
   * ⚠ Ikkala taymer rejimi ham SHU funksiyani chaqiradi. Ilgari mantiq
   *   faqat bitta joyda yozilgan edi va yangi rejim qo'shilganda uni
   *   ko'chirib yozish kerak bo'lardi — ikkita boshqa-boshqa xulq
   *   paydo bo'lishining klassik yo'li.
   */
  /**
   * 📡 Boshqa o'yinchidan kelgan ovozni takrorlaydi.
   * ⚠ Ovoz MAHALLIY chalinadi — tarmoqdan ovoz YUBORILMAYDI.
   *   Faqat \"qaysi blok ishga tushdi\" xabari ketadi va har
   *   mijoz o'z faylidan chaladi. Ovozni yuborish minglab
   *   kilobayt bo'lardi.
   */
  function mpReplay(o, m) {
    if (!o || !o.userData) return;
    //  ⚠ BIRINCHI bog'lanish chalinadi: blokda bir nechta ovoz
    //    bo'lishi mumkin va qaysi biri ishlaganini xabar bilan
    //    yuborish kerak bo'lardi. Hozircha birinchisi — sodda va
    //    ko'p holatda to'g'ri.
    try {
      const bs = o.userData && o.userData.bindings;
      if (Array.isArray(bs) && bs.length) {
        const b = Object.assign({}, bs[(m && m.b) || 0] || bs[0], { obj: o });
        _fireTimer(b, o.userData, false);
      }
    } catch (e) {}
  }

  function _fireTimer(b, sb, loop) {
    //  📡 E'lon — boshqalar ham eshitsin.
    //  ⚠ `loop` da E'LON QILINMAYDI: halqa har takrorda xabar
    //    yuborardi va tarmoq bekorga to'lardi. Halqani har mijoz
    //    o'zi davom ettiradi.
    try {
      if (!loop && b && b.obj && b.obj.userData && b.obj.userData.id != null &&
          window.MultiplayerSystem && MultiplayerSystem.fire) {
        MultiplayerSystem.fire('sound', { o: b.obj.userData.id });
      }
    } catch (e) {}

    //  ⚠ `loop` endi TASHQARIDAN keladi — bindingning 🔁 rejimidan.
    //    Ilgari `b.timerLoop` ALOHIDA bayroq edi va rejim bilan
    //    ziddiyatga tushardi: rejim \"loop\", bayroq o'chiq — qaysi
    //    biri ustun? Endi yagona manba: rejim. Eski sahnalar
    //    `_playMode()` da ko'chiriladi.
    _startB(b, !!loop, sb);
    return b.timerRepeat ? _delayOf(b) : -1;
  }

  // ============================================================
  //  ⏱ `timerOn` va 🔁 `mode` — eski sahnalarni KO'CHIRISH
  // ------------------------------------------------------------
  //  Eski fayllarda taymer REJIM edi: `mode: 'timer'` yoki
  //  `'timerAuto'`, loop esa alohida `timerLoop` bayrog'ida.
  //  Yangi modelda:
  //      timerOn = true            (nima ishga tushiradi)
  //      mode    = timerLoop ? 'loop' : 'toggle'   (qanday chalinadi)
  //  Ko'chirish O'QISH paytida bo'ladi, faylni o'zgartirmaydi —
  //  shunda eski sahna yangi dvigatelda ham, eskisida ham ishlaydi.
  // ============================================================
  function _timerOn(b) {
    if (!b) return false;
    if (typeof b.timerOn === 'boolean') return b.timerOn;
    return b.mode === 'timer' || b.mode === 'timerAuto';   // eski sahna
  }

  /** Chalish rejimi: hold | loop | toggle. */
  function _playMode(b) {
    if (!b) return 'loop';
    //  ⚠ Eski `timer*` rejimi CHALISH rejimi emas — uni `timerLoop`
    //    bayrog'idan tiklaymiz. Aks holda eski taymerli bloklar
    //    `_MODES` tekshiruvidan o'tolmay jimgina `loop` bo'lib qolardi
    //    va \"bir marta chalinsin\" sozlamasi yo'qolardi.
    if (b.mode === 'timer' || b.mode === 'timerAuto') {
      return (b.timerLoop === false) ? 'toggle' : 'loop';
    }
    return _MODES[b.mode] ? b.mode : 'loop';
  }

  // ============================================================
  //  ⏱ Timeline uchun: umumiy balandlik shkalasi
  // ------------------------------------------------------------
  //  `ObjectGlowSystem.captureTL` / `applyTL` bilan AYNAN bir naqsh —
  //  timeline uni o'zi taniydi, `timeline.js` ga tizim nomi qo'lda
  //  yozilmaydi.
  // ============================================================

  /** @returns {{sbVol:number}|null} — faqat Sound Block uchun. */
  function captureTL(o) {
    if (!o || !o.userData || !o.userData.isSoundBlock) return null;
    return { sbVol: _masterVol(o) };
  }

  /**
   * ⚠ Bu yerda ovozga TEGILMAYDI — faqat qiymat yoziladi. Balandlikni
   *   `update()` har kadr o'zi qo'llaydi. Aks holda ikki joyda ikki xil
   *   hisob bo'lib, timeline scrub qilinganda ovoz sakrab ketardi.
   */
  function applyTL(o, kf) {
    if (!o || !o.userData || !kf) return;
    if (typeof kf.sbVol !== 'number' || !isFinite(kf.sbVol)) return;
    o.userData.sbVolume = Math.max(0, Math.min(1, kf.sbVol));
  }

  //  📡 `mpReplay` — multiplayer: kelgan ovozni takrorlaydi.
  //     Ro'yxat OXIRIGA qo'shildi: `test-prefab-visual`
  //     `return { create, restoreVisual,` naqshini qidiradi.
  return { create, restoreVisual, update, syncSize, ensureBindings,
           mpReplay, _newBinding, _stopB, _defaultData,
           ensureAnchor: _ensureAnchor,
           // ⏱ timeline (ObjectGlow bilan bir xil shartnoma)
           captureTL, applyTL,
           // sinov va tashqi foydalanish uchun
           masterVol: _masterVol, isTimerMode: _isTimer, MODES: _MODES,
           timerOn: _timerOn, playMode: _playMode,
           needsPlayer: _needsPlayer };
})();

// Global — prefab, save/load va inspektor uchun
// ⚠ Klassik skriptda top-level `const` `window` ga YOZILMAYDI. Ya'ni
//   `window.SoundBlockSystem` `undefined` bo'lib qolardi va unga tayangan
//   kod JIMGINA ishlamasdi — prefabda Sound Block ko'rinishi shu sabab
//   tiklanmay, oddiy kub bo'lib chiqardi.
//   (`map-loader.js` da xuddi shu xato allaqachon tuzatilgan edi.)
window.SoundBlockSystem = SoundBlockSystem;

window.addSoundBlock = function() { return SoundBlockSystem.create(); };

// ============================================================
//  INSPECTOR
// ============================================================
function _sbKeyLabel(code) {
  const map = {
    WASD:'WASD (yurish)',
    KeyW:'W', KeyA:'A', KeyS:'S', KeyD:'D',
    KeyE:'E', KeyF:'F', KeyR:'R', KeyG:'G', KeyQ:'Q', KeyH:'H',
    KeyT:'T', KeyY:'Y', KeyU:'U', KeyC:'C', KeyV:'V', KeyB:'B',
    KeyZ:'Z', KeyX:'X', Space:'SPACE', Enter:'ENTER',
    ShiftLeft:'SHIFT', ControlLeft:'CTRL', AltLeft:'ALT',
  };
  return map[code] || code.replace('Key', '').replace('Digit', '');
}
const _SB_KEYS = ['WASD','KeyW','KeyA','KeyS','KeyD','KeyE','KeyF','KeyR','KeyG','KeyQ','KeyH',
                  'KeyT','KeyY','KeyU','KeyC','KeyV','KeyB','Space','Enter','ShiftLeft','ControlLeft','AltLeft'];

function _sbKeyOpts(sel) {
  return _SB_KEYS.map(k => `<option value="${k}" ${sel===k?'selected':''}>${_sbKeyLabel(k)}</option>`).join('');
}

function buildSoundBlockInspector(obj) {
  const ic = document.getElementById('inspector-content');
  if (!ic) return;
  const ud = obj.userData;
  ud.triggerSize = ud.triggerSize || { x: 3, y: 3, z: 3 };
  const binds = SoundBlockSystem.ensureBindings(ud);

  const p = obj.position, sz = ud.triggerSize;
  ud.audioOffset = ud.audioOffset || { x: 0, y: 0, z: 0 };
  const ao = ud.audioOffset;
  const SEL = "flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";
  const sndOptsFor = (name) => (typeof SoundSystem !== 'undefined' && SoundSystem.library)
    ? Object.keys(SoundSystem.library).map(n => `<option value="${n}" ${name===n?'selected':''}>${n}</option>`).join('')
    : '';

  // Har bir binding uchun kartochka
  const cards = binds.map((b, idx) => {
    //  ⚠ `SoundBlockSystem.MODES` — `_MODES` EMAS. Bu funksiya IIFE dan
    //    TASHQARIDA turadi, ya'ni closure ichidagi `_MODES` unga
    //    ko'rinmaydi va `ReferenceError` berardi (butun inspektor
    //    chizilmay qolardi). Xuddi shu sabab pastda `isTimerMode` ham
    //    tizim obyekti orqali chaqiriladi.
    //  ⚠ Eski sahnalarda `timerAuto` saqlangan bo'lishi mumkin —
    //    u ham ⏱ Timer bandini tanlagan ko'rsatilishi kerak.
    //  ⚠ ⏱ Taymer REJIMLAR RO'YXATIDAN chiqarildi. Endi u mustaqil
    //    belgilash qutisi — shuning uchun ⏱ + 🔁 loop birga bo'lishi
    //    mumkin. Ilgari taymerni tanlash loop ni yo'qotardi.
    //  ⚠ ⏱ Taymer REJIMLAR RO'YXATIDAN chiqarildi — endi mustaqil
    //    belgilash qutisi. Shu bois ⏱ + 🔁 loop birga bo'lishi mumkin.
    const mode    = SoundBlockSystem.playMode(b);
    const timerOn = SoundBlockSystem.timerOn(b);
    const keyRow = b.key2
      ? `<select onchange="window._sbBindSet(${b.id},'key1',this.value)" style="${SEL}">${_sbKeyOpts(b.key1)}</select>
         <span style="color:var(--accent2);font-weight:bold;padding:0 3px">+</span>
         <select onchange="window._sbBindSet(${b.id},'key2',this.value)" style="${SEL}">${_sbKeyOpts(b.key2)}</select>
         <button onclick="window._sbBindDelKey2(${b.id})" title="komboni olib tashlash"
           style="background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.4);color:#ff6666;border-radius:2px;font-size:11px;padding:1px 6px;cursor:pointer">×</button>`
      : `<select onchange="window._sbBindSet(${b.id},'key1',this.value)" style="${SEL}">${_sbKeyOpts(b.key1)}</select>
         <button onclick="window._sbBindAddKey2(${b.id})" title="2-klavish (kombo) qo'shish"
           style="background:rgba(var(--accent2-rgb),.12);border:1px solid rgba(var(--accent2-rgb),.4);color:var(--accent2);border-radius:2px;font-size:12px;padding:1px 7px;cursor:pointer">+</button>`;

    //  ⚠ `extra` IKKALA taymer rejimida ham chiqadi. Ilgari shart
    //    `mode === 'timer'` edi — yangi rejim qo'shilganda kechikish
    //    maydoni ko'rinmay qolardi va dizayner uni sozlay olmasdi.
    //  ⚠ Blok rejimi paneldan yuqorida turadi — bu yerda faqat
    //    eslatib qo'yamiz, ikkinchi tanlov bermaymiz.
    const _tmLbl = _sbNeedsPlayer(ud) ? '⏱🧍 o\'yinchi bilan' : '⏱🌐 o\'yinchisiz';
    const extra = timerOn
      ? `<div style="font-size:8px;color:var(--accent4);margin:3px 0 2px;line-height:1.5">
           Rejim: <b>${_tmLbl}</b> — yuqoridagi ⏱ bo'limdan o'zgartiriladi
           (butun blokka tegishli).
         </div>
         <div class="fr"><span class="fl">⏱ Kechikish (s)</span>
           <input type="number" min="0" step="0.5" value="${b.timerDelay}"
             oninput="window._sbBindSet(${b.id},'timerDelay',Math.max(0,parseFloat(this.value)||0))"
             style="width:66px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-size:10px;border-radius:2px"></div>
         <div class="fr"><span class="fl">⏲ Sanoq qaytarilsin</span>
           <input type="checkbox" ${b.timerRepeat?'checked':''} onchange="window._sbBindSet(${b.id},'timerRepeat',this.checked)"></div>
         <div style="font-size:9px;color:var(--muted);margin:2px 0 2px;line-height:1.5">
           ⏲ <b>Sanoq qaytarilsin</b> — vaqt tugagach TAYMER qaytadan
           boshlanadi. "Har ${b.timerDelay||3}s da bir marta qo'ng'iroq"
           uchun: rejim <b>Toggle</b> + sanoq ✓.<br>
           Uzluksiz ovoz kerak bo'lsa rejimni <b>Loop</b> qiling —
           alohida "ovoz loop" belgisi endi kerak emas: chalish
           rejimi YAGONA manba.
         </div>`
      : '';

    //  ⚠ Izoh TAYMER holatiga qarab o'zgaradi: taymer yoqilganda
    //    \"klavishni bosib turing\" degan maslahat noto'g'ri bo'lardi.
    const modeHint = timerOn
      ? ({ hold: "🔁 uzluksiz chalinadi", loop: "🔁 uzluksiz chalinadi",
           toggle: "▶ bir marta chalinadi" })[mode] || ""
      : ({ hold: "bosib tursa loop, qo'yvorsa to'xtaydi",
           loop: "bossa loop, zonadan chiqsa to'xtaydi",
           toggle: "1-marta yoq, 2-marta o'chir" })[mode] || "";

    return `
    <div class="comp-block" style="border:1px solid var(--border);border-radius:5px;padding:7px;margin-bottom:7px;background:rgba(var(--accent2-rgb),.04)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:10px;color:var(--accent2);font-weight:bold">🔊 Ovoz #${idx + 1}</span>
        <button onclick="window._sbDelBinding(${b.id})" title="o'chirish"
          style="background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.4);color:#ff6666;border-radius:3px;font-size:11px;padding:2px 8px;cursor:pointer">🗑</button>
      </div>

      <button class="action-btn" onclick="window._sbBindImport(${b.id})"
        style="background:rgba(var(--accent2-rgb),.1);border-color:rgba(var(--accent2-rgb),.4);color:var(--accent2);width:100%;font-size:10px;padding:5px;margin-bottom:4px">📁 MP3 import</button>
      <div class="fr">
        <span class="fl">Ovoz</span>
        <select onchange="window._sbBindSet(${b.id},'soundName',this.value)" style="${SEL}">
          <option value="">— tanlang —</option>${sndOptsFor(b.soundName)}
        </select>
      </div>

      <div class="fl" style="margin:6px 0 3px">Klavish ${b.key2 ? '(kombo — ikkalasi birga)' : ''}</div>
      <div style="display:flex;align-items:center;gap:4px">${keyRow}</div>

      <div class="fr" style="margin-top:6px">
        <span class="fl">Rejim</span>
        <select onchange="window._sbBindSet(${b.id},'mode',this.value)" style="${SEL}">
          <option value="hold"   ${mode==='hold'  ?'selected':''}>Hold</option>
          <option value="loop"   ${mode==='loop'  ?'selected':''}>Loop</option>
          <option value="toggle" ${mode==='toggle'?'selected':''}>Toggle</option>
        </select>
      </div>
      <div style="font-size:9px;color:var(--muted);margin:2px 0 2px">${modeHint}</div>

      <!--  TAYMER — REJIM EMAS, QO'SHIMCHA.
            Ilgari u yuqoridagi ro'yxatda turardi va uni tanlash
            Loop ni YO'QOTARDI. Endi mustaqil: taymer + loop birga
            ishlaydi — \"5 soniyadan keyin boshlanib, uzluksiz
            chaladigan\" fon musiqasi. -->
      <div style="border:1px solid ${timerOn?'rgba(var(--accent4-rgb),.45)':'var(--border)'};
        border-radius:3px;padding:5px 6px;margin:5px 0 3px;
        background:${timerOn?'rgba(var(--accent4-rgb),.07)':'transparent'}">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" ${timerOn?'checked':''}
            onchange="window._sbBindSet(${b.id},'timerOn',this.checked)">
          <span class="fl" style="color:${timerOn?'var(--accent4)':'var(--muted)'}">⏱ Taymer bilan boshlansin</span>
        </label>
        <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-top:3px">
          ${timerOn
            ? `Klavish KERAK EMAS — vaqt bilan boshlanadi, keyin
               <b>${(mode === 'loop' || mode === 'hold') ? '🔁 uzluksiz' : '▶ bir marta'}</b>
               chalinadi (yuqoridagi rejimga qarab).`
            : `Hozir klavish bilan boshlanadi. Yoqsangiz — vaqt bilan
               boshlanadi, rejim esa qanday chalinishini belgilaydi:
               ⏱ + 🔁 Loop birga bo'lishi mumkin.`}
        </div>
      </div>
      ${extra}
      <div class="fr" style="margin-top:4px">
        <span class="fl">🔊 Balandlik${b.spatial ? ' (yaqin)' : ''}</span>
        <input type="range" min="0" max="1" step="0.05" value="${b.volMax != null ? b.volMax : (b.volume != null ? b.volume : 0.7)}"
          oninput="window._sbBindSet(${b.id},'volMax',parseFloat(this.value))" style="flex:1">
      </div>
      <div class="fr" style="margin-top:6px">
        <span class="fl">🎧 Masofa (3D)</span>
        <input type="checkbox" ${b.spatial ? 'checked' : ''} onchange="window._sbBindSet(${b.id},'spatial',this.checked)">
      </div>
      <div style="font-size:9px;color:var(--muted);margin:2px 0 2px">yoqilsa — faqat masofaga bog'liq: yaqin balandroq, uzoq pastroq (burилиш ta'sir qilmaydi)</div>
      ${b.spatial ? `
      <div class="fr" style="margin-top:2px">
        <span class="fl">🔉 Min (uzoqda)</span>
        <input type="range" min="0" max="1" step="0.05" value="${b.volMin != null ? b.volMin : 0}"
          oninput="window._sbBindSet(${b.id},'volMin',parseFloat(this.value))" style="flex:1">
      </div>` : ''}
      <div class="fr" style="margin-top:4px">
        <span class="fl">🌫 Aks-sado</span>
        <select onchange="window._sbBindSet(${b.id},'reverb',this.value)" style="${SEL}" ${b.spatial ? '' : 'disabled'}>
          <option value="none" ${(b.reverb || 'none') === 'none' ? 'selected' : ''}>Yo'q</option>
          <option value="room" ${b.reverb === 'room' ? 'selected' : ''}>Xona</option>
          <option value="hall" ${b.reverb === 'hall' ? 'selected' : ''}>Katta zal</option>
          <option value="cave" ${b.reverb === 'cave' ? 'selected' : ''}>G'or</option>
        </select>
      </div>
      <div style="font-size:9px;color:var(--muted);margin:2px 0 0">aks-sado faqat masofa (3D) yoqilganda ishlaydi</div>
    </div>`;
  }).join('');

  ic.innerHTML = `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent2-rgb),.15);color:var(--accent2)">SND</span>Sound Block</div>
      <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 6px">
        O'yinchi zona ichida bo'lganda klavishlar ishlaydi. Har ovozning o'z klavishi (yoki W+SHIFT kabi kombosi), mp3 fayli va rejimi bor.
        ⏱🌐 <b>o'yinchisiz</b> taymer esa zonaga bog'liq emas — ▶ Play bilan sanaydi.
      </div>

      <!-- ── ⏱ TAYMER REJIMI — BUTUN BLOK UCHUN ───────────── -->
      <!--  ⚠ Ilgari bu har bindingda alohida edi. Besh ovozli blokda
            beshta joyda almashtirish kerak bo'lardi va bittasi
            unutilsa u boshqacha yurib, sababi ko'rinmasdi.
            🔊 Balandlik shkalasi bilan bir xil sabab — shuning
            uchun yonma-yon turibdi. -->
      <div style="border:1px solid rgba(var(--accent4-rgb),.35);border-radius:4px;padding:6px 7px;
        background:rgba(var(--accent4-rgb),.05);margin-bottom:7px">
        <div class="fl" style="color:var(--accent4);margin-bottom:4px">⏱ Taymer rejimi</div>
        <div style="display:flex;gap:4px">
          ${[['player','⏱🧍 O\'yinchi bilan'],['auto','⏱🌐 O\'yinchisiz']]
            .map(([v,l])=>{
              const on = (_sbNeedsPlayer(ud) ? 'player' : 'auto') === v;
              return `<button onclick="window._sbSetTimerMode('${v}')"
                style="flex:1;padding:5px 2px;border-radius:3px;cursor:pointer;font-size:9px;
                font-family:'Share Tech Mono',monospace;
                border:1px solid ${on?'var(--accent4)':'var(--border)'};
                background:${on?'rgba(var(--accent4-rgb),.18)':'transparent'};
                color:${on?'var(--accent4)':'var(--muted)'}">${l}</button>`;
            }).join('')}
        </div>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:5px">
          ⏱🧍 <b>O'yinchi bilan</b> — sanoq o'yinchi zonaga KIRGACH
          boshlanadi; chiqib ketsa bekor bo'ladi.<br>
          ⏱🌐 <b>O'yinchisiz</b> — ▶ Play bilan sanaydi. O'yinchi
          zonaga kiradimi-yo'qmi, hatto sahnada o'yinchi bormi —
          ahamiyati yo'q. Fon musiqasi, kino sahnasi uchun.<br>
          Bu blokdagi HAMMA taymerga birdek ta'sir qiladi.
        </div>
      </div>

      <!-- ── 🔊 UMUMIY BALANDLIK SHKALASI (timeline bilan) ────── -->
      <div style="border:1px solid rgba(var(--accent3-rgb),.35);border-radius:4px;padding:6px 7px;
        background:rgba(var(--accent3-rgb),.05);margin-bottom:7px">
        <div class="fr">
          <span class="fl" style="color:var(--accent3)">🔊 Umumiy balandlik</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent3);
            font-weight:700;min-width:42px;text-align:right">${Math.round(_sbVolOf(ud) * 100)}%</span>
        </div>
        <input type="range" min="0" max="1" step="0.01" value="${_sbVolOf(ud)}"
          oninput="window._sbSetMaster(parseFloat(this.value))" style="width:100%;margin-top:3px">
        <div style="display:flex;gap:4px;margin-top:5px">
          ${[0, 25, 50, 75, 100].map(v => `<button onclick="window._sbSetMaster(${v / 100})"
            style="flex:1;padding:3px 1px;border-radius:2px;cursor:pointer;font-size:9px;
            font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
            background:transparent;color:var(--muted)">${v}%</button>`).join('')}
        </div>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:5px">
          Bu shkala BUTUN blokka ta'sir qiladi va har bir ovozning o'z
          balandligi USTIDAN ko'paytiriladi — 🎧 masofa effekti buzilmaydi.<br>
          ⏱ <b>Timeline bilan:</b> vaqtni qo'ying → shkalani 50% qiling →
          <b>I</b> bosing. Keyin boshqa vaqtga o'ting → 100% → <b>I</b>.
          Ovoz o'sha ikki key orasida SILLIQ ko'tariladi.
        </div>
      </div>
      <div class="fl" style="margin:2px 0 3px">Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" value="${p.x.toFixed(2)}" oninput="window._sbSetPos(0,this.value)"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" value="${p.y.toFixed(2)}" oninput="window._sbSetPos(1,this.value)"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" value="${p.z.toFixed(2)}" oninput="window._sbSetPos(2,this.value)"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
      <div class="fl" style="margin:8px 0 3px">Shakl</div>
      <div style="display:flex;gap:4px">
        ${['box','sphere','pyramid'].map(shp => {
          const lbl = { box:'▭ To\'rtburchak', sphere:'◯ Dumaloq', pyramid:'△ Uchburchak' }[shp];
          const on = (ud.zoneShape || 'box') === shp;
          return `<button onclick="window._sbSetShape('${shp}')"
            style="flex:1;background:${on?'rgba(var(--accent2-rgb),.25)':'rgba(var(--accent2-rgb),.06)'};border:1px solid rgba(var(--accent2-rgb),${on?'.7':'.3'});color:var(--accent2);border-radius:3px;font-size:10px;padding:5px 2px;cursor:pointer">${lbl}</button>`;
        }).join('')}
      </div>
      <div class="fl" style="margin:8px 0 3px">Zona o'lchami (W H D)</div>
      <div class="xyzr">
        <div><input class="xi" value="${sz.x.toFixed(2)}" oninput="window._sbSetSize(0,this.value)"><div class="xl" style="color:#ff5555">W</div></div>
        <div><input class="xi" value="${sz.y.toFixed(2)}" oninput="window._sbSetSize(1,this.value)"><div class="xl" style="color:#55ff55">H</div></div>
        <div><input class="xi" value="${sz.z.toFixed(2)}" oninput="window._sbSetSize(2,this.value)"><div class="xl" style="color:#5588ff">D</div></div>
      </div>
      <div class="fl" style="margin:8px 0 3px">🟢 Ovoz markazi (X Y Z)</div>
      <div class="xyzr">
        <div><input class="xi" value="${(ao.x||0).toFixed(2)}" oninput="window._sbSetAudioOffset(0,this.value)"><div class="xl" style="color:#00ff88">X</div></div>
        <div><input class="xi" value="${(ao.y||0).toFixed(2)}" oninput="window._sbSetAudioOffset(1,this.value)"><div class="xl" style="color:#00ff88">Y</div></div>
        <div><input class="xi" value="${(ao.z||0).toFixed(2)}" oninput="window._sbSetAudioOffset(2,this.value)"><div class="xl" style="color:#00ff88">Z</div></div>
      </div>
      <div style="font-size:9px;color:var(--muted);margin:2px 0 0">Yashil nuqta — ovoz markazi. Istalgan burchakka suring; masofa shu yerdan o'lchanadi. Faqat editor'da ko'rinadi.</div>
    </div>

    ${cards}

    <button class="action-btn" onclick="window._sbAddBinding()"
      style="background:rgba(var(--accent2-rgb),.12);border:1px solid rgba(var(--accent2-rgb),.5);color:var(--accent2);width:100%;font-size:11px;padding:7px;font-weight:bold">+ Ovoz (tugma) qo'shish</button>
  `;
}
window.buildSoundBlockInspector = buildSoundBlockInspector;

// ── Selektorlar / setterlar ──
function _sbSel() {
  return (typeof selectedObj !== 'undefined' && selectedObj && selectedObj.userData && selectedObj.userData.isSoundBlock) ? selectedObj : null;
}
function _sbBind(o, id) { return (o.userData.bindings || []).find(b => b.id === id); }

window._sbAddBinding = function() {
  const o = _sbSel(); if (!o) return;
  SoundBlockSystem.ensureBindings(o.userData);
  o.userData._bindIdC = (o.userData._bindIdC || 0) + 1;
  o.userData.bindings.push(SoundBlockSystem._newBinding(o.userData._bindIdC));
  if (typeof updateInspector === 'function') updateInspector();
};
window._sbDelBinding = function(id) {
  const o = _sbSel(); if (!o) return;
  const b = _sbBind(o, id); if (b) SoundBlockSystem._stopB(b);
  o.userData.bindings = (o.userData.bindings || []).filter(x => x.id !== id);
  if (o.userData.bindings.length === 0) {
    o.userData._bindIdC = (o.userData._bindIdC || 0) + 1;
    o.userData.bindings.push(SoundBlockSystem._newBinding(o.userData._bindIdC));
  }
  if (typeof updateInspector === 'function') updateInspector();
};
window._sbBindSet = function(id, prop, val) {
  const o = _sbSel(); if (!o) return;
  const b = _sbBind(o, id); if (!b) return;
  b[prop] = val;
  // ⚠ `timerRepeat` shu ro'yxatda EMAS: u panelning ko'rinishini
  //   o'zgartirmaydi, faqat qiymat. Ro'yxatga qo'shsak har belgilashda
  //   inspektor qayta chizilib, sichqoncha fokusi yo'qolardi.
  if (prop === 'mode' || prop === 'key2' || prop === 'timerDelay' || prop === 'spatial') {
    if (typeof updateInspector === 'function') updateInspector();
  }
};

/**
 * 🔊 Blokning UMUMIY balandlik shkalasi (0…1).
 *
 * ⚠ Bu yerda ovozga TEGILMAYDI — faqat qiymat yoziladi.
 *   `SoundBlockSystem.update()` uni har kadr chalinayotgan ovozlarga
 *   qo'llaydi. Shu bois slayder ▶ Play davomida ham JONLI ishlaydi
 *   va timeline keyi bilan bir xil yo'ldan o'tadi — ikkita boshqa-boshqa
 *   balandlik hisobi paydo bo'lmaydi.
 */
window._sbSetMaster = function(v) {
  const o = _sbSel(); if (!o) return;
  const n = parseFloat(v);
  o.userData.sbVolume = (!isFinite(n)) ? 1 : Math.max(0, Math.min(1, n));
  if (typeof updateInspector === 'function') updateInspector();
};

/**
 * ⏱ Blokning taymer rejimi.
 *
 * ⚠ Bindinglardagi ESKI `timerAuto` ham TOZALANADI: aks holda blok
 *   \"o'yinchi bilan\" ga o'tkazilgach ham eski binding o'z holicha
 *   o'yinchisiz yurib, sozlama ishlamayotgandek ko'rinardi.
 */
window._sbSetTimerMode = function (v) {
  const o = _sbSel(); if (!o) return;
  o.userData.timerNeedsPlayer = (v !== 'auto');
  const bs = o.userData.bindings;
  if (Array.isArray(bs)) for (const b of bs) {
    if (b && b.mode === 'timerAuto') b.mode = 'timer';
  }
  if (typeof updateInspector === 'function') updateInspector();
};

/** Inspektor uchun: blok o'yinchini talab qiladimi (eski sahnalar bilan). */
function _sbNeedsPlayer(ud) {
  if (!ud) return true;
  if (typeof ud.timerNeedsPlayer === 'boolean') return ud.timerNeedsPlayer;
  const bs = ud.bindings;
  if (Array.isArray(bs) && bs.some(b => b && b.mode === 'timerAuto')) return false;
  return true;
}

/** Inspektor uchun: qiymat yo'q bo'lsa 1 (eski sahnalar). */
function _sbVolOf(ud) {
  const v = ud && ud.sbVolume;
  return (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(1, v)) : 1;
}
window._sbBindAddKey2 = function(id) {
  const o = _sbSel(); if (!o) return;
  const b = _sbBind(o, id); if (!b) return;
  b.key2 = 'ShiftLeft';
  if (typeof updateInspector === 'function') updateInspector();
};
window._sbBindDelKey2 = function(id) {
  const o = _sbSel(); if (!o) return;
  const b = _sbBind(o, id); if (!b) return;
  b.key2 = '';
  if (typeof updateInspector === 'function') updateInspector();
};

window._sbSetPos = function(i, v) {
  const o = _sbSel(); if (!o) return; const val = parseFloat(v); if (isNaN(val)) return;
  if (i === 0) o.position.x = val; else if (i === 1) o.position.y = val; else o.position.z = val;
};
window._sbSetSize = function(i, v) {
  const o = _sbSel(); if (!o) return; const val = Math.max(0.1, parseFloat(v) || 0.1);
  o.userData.triggerSize = o.userData.triggerSize || { x: 3, y: 3, z: 3 };
  if (i === 0) o.userData.triggerSize.x = val; else if (i === 1) o.userData.triggerSize.y = val; else o.userData.triggerSize.z = val;
  SoundBlockSystem.syncSize(o);
};
// Yashil shar (ovoz markazi) joyini o'zgartirish — kub ichida cheklanadi
// Zona shaklini o'zgartirish: box | sphere | pyramid
window._sbSetShape = function(shape) {
  const o = _sbSel(); if (!o) return;
  o.userData.zoneShape = shape;
  SoundBlockSystem.syncSize(o);
  if (typeof updateInspector === 'function') updateInspector();
};
window._sbSetAudioOffset = function(i, v) {
  const o = _sbSel(); if (!o) return; const val = parseFloat(v); if (isNaN(val)) return;
  const ud = o.userData;
  ud.audioOffset = ud.audioOffset || { x: 0, y: 0, z: 0 };
  const s = ud.triggerSize || { x: 3, y: 3, z: 3 };
  const clamp = (x, half) => Math.max(-half, Math.min(half, x));
  if (i === 0) ud.audioOffset.x = clamp(val, s.x / 2);
  else if (i === 1) ud.audioOffset.y = clamp(val, s.y / 2);
  else ud.audioOffset.z = clamp(val, s.z / 2);
  const a = SoundBlockSystem.ensureAnchor(o);
  if (a) a.position.set(ud.audioOffset.x, ud.audioOffset.y, ud.audioOffset.z);
};

// ── Binding uchun mp3 import ──
window._sbBindImport = function(id) {
  const o = _sbSel(); if (!o) { log('⚠ Sound Block tanlanmagan', 'lw'); return; }
  const b = _sbBind(o, id); if (!b) return;
  if (typeof SoundSystem === 'undefined' || !SoundSystem._reg) { log('⚠ Ovoz tizimi topilmadi', 'lw'); return; }
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'audio/*,.mp3,.wav,.ogg'; inp.style.display = 'none';
  inp.onchange = e => {
    const f = e.target && e.target.files && e.target.files[0];
    if (f) {
      const name = f.name.replace(/\.\w+$/, '');
      const reader = new FileReader();
      reader.onload = ev => {
        try { if (SoundSystem._ensure) SoundSystem._ensure(); } catch (e0) {}
        const ctx = (SoundSystem.listener && SoundSystem.listener.context) ? SoundSystem.listener.context : null;
        if (!ctx) { log("⚠ Audio hali tayyor emas — avval ▶ o'yinni bir marta boshlang (yoki 🔊 tovushni yoqing), keyin qayta yuklang", 'lw'); return; }
        // ⚠ ASL BAYTLAR. Ilgari bu yerda faqat dekod qilinardi va xom
        //   baytlar tashlanardi — `SoundSystem.serialize()` esa `src`siz
        //   ovozni O'TKAZIB YUBORADI (`if (!s.src) continue`). Natijada
        //   Sound Block ga import qilingan musiqa sahnaga YOZILMASDI:
        //   boshqa brauzerda/o'yinda jimjit bo'lardi.
        //   (`soundLoadFile` da bu allaqachon tuzatilgan edi — bu ikkinchi
        //    import yo'li, u qamrovdan chetda qolgan.)
        let _src = null;
        try {
          if (typeof window._abToDataUrl === 'function')
            _src = window._abToDataUrl(ev.target.result.slice(0), f.type || 'audio/mpeg');
        } catch (e1) { log('⚠ Ovoz baytlari saqlanmadi (sahnaga yozilmaydi)', 'lw'); }
        try {
          ctx.decodeAudioData(ev.target.result.slice(0), buf => {
            try { SoundSystem._reg(name, buf, { volume: 0.7, src: _src, fileName: f.name, builtin: false }); } catch (e2) {}
            b.soundName = name;
            log(`🔊 Ovoz yuklandi: ${name}` + (_src ? '' : ' ⚠ sahnaga yozilmaydi'), 'lok');
            if (typeof updateInspector === 'function') updateInspector();
          }, () => log('⚠ Ovozni dekod qilib bo\'lmadi', 'lw'));
        } catch (e2) { log('⚠ Ovoz xato: ' + e2.message, 'lw'); }
      };
      reader.readAsArrayBuffer(f);
    }
    if (inp.parentNode) inp.parentNode.removeChild(inp);
  };
  document.body.appendChild(inp); inp.click();
  setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
};