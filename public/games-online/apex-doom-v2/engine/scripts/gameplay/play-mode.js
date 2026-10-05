// ============================================================
// PLAY MODE
// ============================================================
let isPlaying=false, playTime=0;
const savedStates=[];
let camSensitivity = 0.002;

// ── OYINCHI SOZLAMALARI ─────────────────────────────────────
const playerSettings = {
  speed:       7,
  sprintMult:  1.8,
  accelMode:   'instant',
  accelTime:   0.3,
  waveDelay:   0,
  keys: {
    forward:  'KeyW',
    backward: 'KeyS',
    left:     'KeyA',
    right:    'KeyD',
    jump:     'Space',
    sprint:   'ShiftLeft',
    camToggle:'KeyV',
  },
  _rebinding: null,
  _accelT: 0,
  _waveT:  0,
  _wasMoving: false,
  // ── KAMERA SOZLAMALARI ───────────────────────────
  camMode:        'fps',  // 'fps' | 'third'
  camAllow1st:    true,
  camAllow3rd:    true,
  cam1stOffsetX:  0,
  cam1stOffsetY:  0,
  cam1stOffsetZ:  0,
  cam1stPitchMin: -80,
  cam1stPitchMax:  80,
  cam3rdDist:     5,
  cam3rdHeight:   2,
  cam3rdOffsetX:  0,
  cam3rdPitchMin: -40,
  cam3rdPitchMax:  60,
  // 🎞 3-shaxs kamerasi ergashish silliqligi (0.02…1). 1 = qattiq.
  //    ⚠ Bu qiymat VAQT bo'yicha qo'llanadi (`PlayerController._followCam`),
  //      shuning uchun kadr tezligi qanday bo'lsa ham natija bir xil.
  cam3rdSmooth:   0.14,
  cam1stRotateSpeed: 1.0,
  cam3rdRotateSpeed: 1.0,
  // 🧭 Boshlang'ich qarash: obyekt qayerga qarasa — kamera ham
  //    o'sha yerga. `camInitYaw` esa unga QO'SHIMCHA burchak.
  //    O'chirilsa — eski xulq: mutlaq (dunyo o'qlariga nisbatan).
  camYawFromObj: true,
  camInitYaw:   0,
  camInitPitch: 0,
  maxHealth:    100,
  // ── STAMINA + SAKRASH ────────────────────────────
  staminaEnabled:  true,
  staminaMax:      100,
  staminaJumpCost: 25,    // har sakrashда
  staminaRegen:    20,    // soniyaga tiklanish
  jumpCooldown:    1.0,   // yerga tushgach qotib turish (s) — Bhob yo'q
  jumpCamBob:      true,   // sakraganда kamera oldi-orqa
  jumpForce:       10,     // sakrash balandligi (kuchi) — ~10 ≈ 2m
  // ── SPRINT (yugurish) cheklovi ───────────────────
  sprintLimitEnabled: true,
  sprintDuration:     5,   // uzluksiz yugurish (s)
  sprintBlockTime:    3,   // blok/dam (s)
  bodyRotate:   true,   // 1-shaxsda ob'ekt kamera bilan birga burilsin
  // ── 🪜 QADAM BALANDLIGI (step-height) ────────────────
  //  O'yinchi shu balandlikkacha past to'siqlarga YOPISHMASDAN, oldiga
  //  borib avtomatik chiqib ketadi. Birlik: SANTIMETR (1 = 1 cm,
  //  100 = 1 m). Bundan baland to'siq — devor kabi to'sadi.
  //  0 = o'chiq (hech qanday to'siqqa chiqmaydi).
  stepHeightCm: 30,     // ~30 cm: past qadamlar, chekkalar, kichik toshlar
  deathMessage: "Siz oldingiz!",
};

/**
 * 👁 Erkin kamera klavishini tanlash.
 * ⚠ Sintetik hodisa RAD ETILADI: ⌨🖥 ekran tugmasi o'zi hodisa
 *   tarqatadi va u shu yerda ushlanib, tugma o'z-o'ziga bog'lanib
 *   qolardi.
 */
window._psFreeLookKey = function (btn) {
  if (btn) btn.textContent = '⏳ klavishni bosing...';
  const h = (e) => {
    e.preventDefault(); e.stopImmediatePropagation();
    document.removeEventListener('keydown', h, { capture: true });
    if (e._screenKey) { if (typeof updateInspector === 'function') updateInspector(); return; }
    window._psCamSet('freeLookKey', e.code);
    if (typeof updateInspector === 'function') updateInspector();
  };
  document.addEventListener('keydown', h, { capture: true });
};

window._psCamSet = function(key, val) {
  playerSettings[key] = val;
  // O'yin paytida PlayerController camYaw/camPitch ni ham yangilash
  if (isPlaying && window.PlayerController && window.PlayerController.obj) {
    // ⚠ Jonli sozlashda ham BAZA burchak qo'shiladi — aks holda
    //   shkalani qimirlatgan zahoti kamera sakrab, obyekt burilishini
    //   unutib qo'yardi.
    if (key === 'camInitYaw')
      PlayerController.camYaw = (PlayerController._baseYaw || 0) + val * Math.PI / 180;
    if (key === 'camInitPitch') PlayerController.camPitch = val * Math.PI / 180;
  }
  if (window._camPreview && window._camPreview.active) {
    if (key === 'camInitYaw')
      window._camPreview.yaw = (window._camPreview._baseYaw || 0) + val * Math.PI / 180;
    if (key === 'camInitPitch') window._camPreview.pitch = val * Math.PI / 180;
    window._camPreview._updateCamera();
  }
};

// Play/Stop tugmalari olib tashlandi — funksiyalar saqlanadi
// O'YNA / TO'XTAT — faqat fizika yoqish va isPlaying flag
if($('play-btn')) $('play-btn').onclick = function() {
  if (!isPlaying) {
    // ── FPS kamera rejimidan chiqish (gizmo yo'qolishini oldini olish) ──
    if (camMode === 'fps') { setCamMode('orbit'); document.exitPointerLock?.(); }

    isPlaying = true; playTime = 0;
    window.isPlaying = true;
    if (window._resetAbsCamLook) window._resetAbsCamLook();  // Absolute kamera: ko'rinish asosiy yo'nalishdan boshlansin
    // Absolute/Lock kamerali obyekt faol bo'lsa — erkin qarash uchun pointer lock
    try {
      const _acam = objects.find(o => o.userData && o.userData.isCamera && o.userData._isActive &&
        (o.userData.camViewMode === 'absolute' || o.userData.camViewMode === 'lookat'));
      if (_acam) {
        const _cv = document.getElementById('three-canvas') || canvas;
        if (_cv) setTimeout(() => { _cv.requestPointerLock?.(); }, 80);
      }
    } catch (e) {}
    document.body.classList.add('play-mode');
    // 🦴 Skelet gizmolarini darhol yashiramiz — RAF siklini kutmasdan.
    if (window.BoneRig && BoneRig.refresh) { try { BoneRig.refresh(); } catch (e) {} }
    // ⚖️ Og'irlik markazi markerlari ham muharrir narsasi — yashiramiz.
    //    Va massa xossalarini fizikaga qayta uzatamiz: obyekt tanasi
    //    o'yin boshlanguncha yaratilmagan bo'lishi mumkin.
    if (window.CenterOfMass) {
      try { CenterOfMass.restoreAll(); CenterOfMass.refresh(true); } catch (e) {}
    }

    // ── ♻️ FIZIKA TANALARINI MESH HOLATIGA KELTIRAMIZ ───────────
    //  Muharrirda gizmo bilan surilgan/burilgan/cho'zilgan obyektning
    //  Rapier tanasi eski joyida qolgan bo'lishi mumkin — u faqat
    //  YARATILGANDA quriladi. Sinxronlamasak, o'yin boshlanishi bilan
    //  mesh tananing eski holatiga qaytariladi va ustma-ust terilgan
    //  qutilar bir-birining ichiga tushib ketardi.
    //  Kollayder o'lchami ham qaytadan hisoblanadi (scale o'zgargan bo'lsa).
    // 🟢 Start bloki — o'yin boshlanishi bilan intro ko'rsatiladi
    if (window.StartFinishSystem) {
      // ⚠ Ilgari bu `catch (e) {}` — MUTLAQO JIM edi. Start bloki
      //   ishlamasa sabab hech qayerda ko'rinmasdi va uni topib
      //   bo'lmasdi. Endi xato konsolga ham, o'yin jurnaliga ham chiqadi.
      try {
        const ok = StartFinishSystem.onPlayStart();
        if (ok === false) log('🟢 Start bloki sahnada topilmadi', 'lw');
      } catch (e) {
        log('❌ Start bloki xatosi: ' + (e && e.message ? e.message : e), 'le');
        try { console.error('[start-finish] onPlayStart:', e); } catch (_) {}
      }
    } else {
      log('⚠ StartFinishSystem yuklanmagan', 'lw');
    }

    if (typeof syncAllPhysicsToMeshes === 'function') {
      try {
        const _n = syncAllPhysicsToMeshes();
        if (_n) log(`⚡ ${_n} ta fizika tanasi joriy holatga keltirildi`, 'lok');
      } catch (e) {}
    }

    // ── Sozlangan alternativ klavishlar xulosasi (bir marta) ─────
    if (window._kbAnimations && window.log) {
      const altPairs = Object.entries(window._kbAnimations)
        .filter(([, data]) => data.altKey)
        .map(([origCode, data]) => {
          const lbl = typeof _keyLabel === 'function' ? _keyLabel : (c => c);
          return `${lbl(data.altKey)} → ${lbl(origCode)}`;
        });
      if (altPairs.length) {
        log(`⌨ Alt klavishlar (${altPairs.length}): ` + altPairs.join(', '), 'lw');
      }
    }
    // O'yin boshlananda vehicle strelkalarini yashir
    objects.forEach(o => { const a = o.getObjectByName('__vehicle_arrow__'); if(a) a.visible = false; });
    this.textContent = '⏸ PAUZA';
    this.classList.add('playing');
    // ============================================================
    //  📌 HOLAT SURATI — OBYEKT HAVOLASI bo'yicha
    // ------------------------------------------------------------
    //  ⚠ XATO BOR EDI: suratlar INDEKS bo'yicha juftlanardi
    //    (`savedStates[i]` ↔ `objects[i]`). O'yin davomida obyekt
    //    qo'shilsa yoki o'chsa (🎯 hitbox predmeti, 💥 yo'q qilingan
    //    blok, 🧊 NoScript sloti) indekslar SILJIYDI va ⏹ Stop da
    //    har bir obyektga BOSHQA obyektning holati yozilardi.
    //
    //    Alomat aynan foydalanuvchi ko'rgani: o'yinchi bo'yini 5 dan
    //    3 ga o'zgartirasiz, ▶ Play bosasiz — u yana 5 bo'lib turadi.
    //    Chunki qo'shni obyektning eski masshtabi unga yozilgan.
    //
    //  Endi surat OBYEKTNING O'ZIGA bog'lanadi — ro'yxat qanday
    //  o'zgarishidan qat'i nazar juftlik buzilmaydi.
    savedStates.length = 0;
    objects.forEach(o => savedStates.push({
      obj: o,
      pos: o.position.clone(), rot: o.rotation.clone(),
      sca: o.scale.clone(), vis: o.visible
    }));
    physBodies.forEach(b => { if(!b.isStatic){ b.vel.set(0,0,0); b.angVel.set(0,(Math.random()-.5)*0.3,0); } });

    // ── Barcha ob'ektlarda on_start ni ishga tushirish ───────
    objects.forEach(o => {
      const id = o.userData.id;
    });

    // ── isPlayerObj ob'ektni avtomatik boshqarishga olish ────
    const playerObj = objects.find(o => o.userData.isPlayerObj);
    const carObj    = objects.find(o => o.userData._entityMode === 'vehicle' || o.userData.entityType === 'car');
    if (playerObj) {
      PlayerController.start(playerObj);
    } else if (carObj) {
      activeCar = carObj; carInside = true;
      _nitroActive = false; _nitroCoolTimer = 0; _currentGear = 3;
      _driftActive = false; _sportActive = false;
      const cfg = window._getCarCfg ? window._getCarCfg(carObj) : null;
      const _sCamMode = cfg ? (cfg.camMode || '3rd') : '3rd';
      fpsYaw   = carObj.rotation.y + (_sCamMode === '1st' ? 0 : Math.PI);
      fpsPitch = _sCamMode === '1st' ? 0 : -0.25;
      setCamMode('fps');
      const _sCv = document.getElementById('three-canvas') || canvas;
      if (_sCv) setTimeout(()=>{ _sCv.requestPointerLock?.(); }, 80);
      log('🚗 ' + carObj.userData.name + ' — WASD:haydash | ' + (cfg?cfg.nitroKey:'F') + ':nitro | E:chiqish', 'lok');
    }

    log('▶ O\'yin boshlandi', 'lok');
  } else {
    // ── TO'XTATISH + Sahna tiklash ────────────────────────────
    isPlaying = false;
    window.isPlaying = false;
    activeCar = null; carInside = false;
    _nitroActive = false; _nitroCoolTimer = 0; _currentGear = 3;
    // O'yin to'xtaganda vehicle strelkalarini qayta ko'rsat
    objects.forEach(o => { const a = o.getObjectByName('__vehicle_arrow__'); if(a) a.visible = true; });
    document.getElementById('_car-prompt')?.remove();
    document.getElementById('_car-hud')?.remove();
    document.body.classList.remove('play-mode');
    // 🦴 Muharrirga qaytdik — gizmolar qaytadi
    if (window.BoneRig && BoneRig.refresh) { try { BoneRig.refresh(); } catch (e) {} }
    if (window.CenterOfMass) { try { CenterOfMass.refresh(true); } catch (e) {} }
    // 👁 Head-look kuzatuvi to'xtaydi — obyektlar boshlang'ich burilishga qaytadi
    if (window.HeadLookSystem) { try { HeadLookSystem.reset(); } catch (e) {} }
    // 🔊 Tugma ovozlari (loop) to'xtaydi — aks holda walk.mp3 g'ing'illab qolardi
    if (window._kbSoundsStopAll) { try { _kbSoundsStopAll(); } catch (e) {} }
    // 🪜 Narvondan chiqaramiz (keyingi o'yin toza boshlansin)
    if (window.LadderSystem) { try { LadderSystem.forceRelease(); } catch (e) {} }
    this.textContent = '▶ O\'YNA';
    this.classList.remove('playing');

    // Pointer lock va kamera rejimini tiklash
    if (document.pointerLockElement) document.exitPointerLock?.();
    setCamMode('orbit');
    // Kamera pozitsiyasini tiklash
    spherical = { theta: 0.7, phi: 0.6, radius: 16 };
    orbitTarget.set(0, 0, 0);
    updateCamera?.();

    const prevSelected = selectedObj;
    PlayerController.stop();
    if (prevSelected && objects.includes(prevSelected)) {
      selectedObj = prevSelected;
    }
    // 🏁 Start/Finish qatlamini yopamiz — muharrirga qaytdik
    if (window.StartFinishSystem) { try { StartFinishSystem.onPlayStop(); } catch (e) {} }
    physSyncUI();
    //  ⚠ Havola bo'yicha tiklaymiz. `Map` — ro'yxat uzun bo'lsa
    //    har obyekt uchun qidirish O(n²) bo'lardi.
    const _byObj = new Map();
    for (const st of savedStates) if (st && st.obj) _byObj.set(st.obj, st);
    objects.forEach(o => {
      const st = _byObj.get(o);
      //  ⚠ Surat yo'q — obyekt o'yin DAVOMIDA yaratilgan. Unga
      //    tegmaymiz: uni yaratgan tizim o'zi tozalaydi.
      if (!st) return;
      o.position.copy(st.pos);
      o.rotation.copy(st.rot);
      o.scale.copy(st.sca);
      if (st.vis !== undefined) o.visible = st.vis;
    });
    physBodies.forEach(b => { b.vel.set(0,0,0); b.angVel.set(0,0,0); });
    log('■ To\'xtatildi — sahna tiklandi', 'lw');
    setTimeout(() => { updateHierarchy(); updateInspector(); }, 50);
  }
};


// ============================================================
//  💾 PlayerSettingsSystem — SystemRegistry shartnomasi
//
//  ⚠ `playerSettings` — `play-mode.js` da top-level `const`, ya'ni
//    MODUL-LOKAL. `save-load.js` da 0 marta uchrardi.
//
//    Natijada o'yinchining BARCHA sozlamalari yo'qolardi:
//      🏃 tezlik, sprint · 👁 1-shaxs balandligi/offseti ·
//      🎥 3-shaxs masofasi · 🚫 1/3-shaxs o'chirilgani ·
//      ❤️ jon · 💪 stamina · ⌨ klavish bog'lanishlari · 🪜 qadam balandligi
//
//    Foydalanuvchi tezlikni pasaytiradi, 3-shaxsni o'chiradi, saqlaydi —
//    o'yinda hammasi standart holatda ochilardi.
//
//  ⚠ `_` bilan boshlanadigan maydonlar (`_rebinding`, `_accelT`,
//    `_waveT`, `_wasMoving`) — RUNTIME holati, saqlanmaydi.
// ============================================================
const PlayerSettingsSystem = {
  serialize() {
    try {
      const out = {};
      for (const k in playerSettings) {
        if (k.charAt(0) === '_') continue;            // runtime
        const v = playerSettings[k];
        if (typeof v === 'function') continue;
        out[k] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
      }
      return Object.keys(out).length ? out : null;
    } catch (e) { return null; }
  },
  restore(d) {
    if (!d || typeof d !== 'object') return 0;
    let n = 0;
    for (const k in d) {
      if (k.charAt(0) === '_') continue;
      // `keys` — ichma-ich obyekt, birlashtiramiz (yangi klavish qo'shilsa yo'qolmasin)
      if (k === 'keys' && d.keys && typeof d.keys === 'object') {
        Object.assign(playerSettings.keys, d.keys);
      } else {
        playerSettings[k] = d[k];
      }
      n++;
    }
    // Kamera rejimi ruxsat bilan mos kelsin
    try {
      if (!playerSettings.camAllow1st && playerSettings.camMode === 'fps')
        playerSettings.camMode = 'third';
      if (!playerSettings.camAllow3rd && playerSettings.camMode === 'third')
        playerSettings.camMode = 'fps';
    } catch (e) {}
    try { if (typeof updateInspector === 'function') updateInspector(); } catch (e) {}
    return n;
  },
};

window.PlayerSettingsSystem = PlayerSettingsSystem;
window.playerSettings = playerSettings;   // audit/diagnostika uchun
