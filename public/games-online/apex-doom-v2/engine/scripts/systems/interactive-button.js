// ============================================================
// INTERACTIVE BUTTON  v1.0
// ------------------------------------------------------------
// O'yinchi tugmaning oldiga borib qarasa — ekranda pritsel/tugma
// paydo bo'ladi. Bosilganda tugmadagi navbatdagi animatsiya slot ishga
// tushadi. Har bir bosishda ko'rsatkich keyingi slotga o'tadi.
//
// Rejimlar:
//   • loop:      1 → 2 → 3 → 1 → 2 → 3 → ...
//   • pingpong:  1 → 2 → 3 → 2 → 1 → 2 → 3 → ...  (return tizimi)
//
// Animatsiyalar Object-Only Export (.json) formatidan keladi —
// xuddi Hitbox importedAnimations kabi. Ijro TimelineExportSystem
// orqali amalga oshadi.
// ============================================================

window.InteractiveButtonSystem = (() => {
  'use strict';

  // ── Default userData ─────────────────────────────────────────
  function _defaultData() {
    return {
      isInteractiveBtn: true,
      type:            'InteractiveBtn',

      // ── Umumiy o'zaro aloqa ─────────────────────────────
      interactDist:    3,           // metr
      actionKey:       'KeyE',
      label:           '',

      // ── 🔤 Yaqinlashuv yozuvi (prompt) ───────────────────
      //  O'yinchi yaqinlashib + tugmaga QARAGANDA ekranда chiqadi.
      prompt: {
        enabled:  false,
        text:     '',            // bo'sh bo'lsa `label` yoki "Bosing" ishlatiladi
        position: 'bc',          // tl tc tr | ml mc mr | bl bc br
        showKey:  true,          // yozuv oldida [E] kaliti ko'rsatilsinmi
        requireLook: true,       // true = qarash SHART; false = faqat yaqinlik
        asHtml:   false,         // true = matn HTML sifatida (escape qilinmaydi)
      },

      // ── Rejim (3 asosiy qism) ────────────────────────────
      // 'trigger'  = tugma turadi, bosilsa animatsiya + sound
      // 'attached' = tugma boshqa obyektga yopishgan (u bilan harakatlanadi)
      // 'pickup'   = tugma bosilsa maqsad obyekt ko'tariladi/tashlanadi
      btnMode:         'trigger',

      // ── Attached mode ────────────────────────────────────
      attachedToId:    null,        // qaysi obyektga yopishtirilgan

      // ── Pickup mode ──────────────────────────────────────
      pickupTargetId:  null,        // null = tugmaning o'zi ko'tariladi
      throwForce:      12,          // tashlash kuchi
      holdDist:        1.5,         // qo'lda ushlash masofasi

      // ── 📦 PREDMET SLOTLARI ──────────────────────────────
      //  O'yinchi predmetlarni KETMA-KET olib kelib tugmaga beradi.
      //  Har slotning O'Z predmeti va O'Z (ixtiyoriy) animatsiyasi bor:
      //     slot 1 — Kub   + animatsiya A
      //     slot 2 — Sfera + (animatsiyasiz)
      //     slot 3 — Silindr + animatsiya B
      //  Predmet berilganda o'sha slotning animatsiyasi o'ynaydi; slotda
      //  animatsiya bo'lmasa — shunchaki keyingi slotga o'tadi.
      //  OXIRGI slot to'lgach — tugmaning O'Z funksiyasi (pastdagi ANM
      //  slotlari, kamera, teleport…) ishga tushadi.
      //
      //  ⚠ BU DARVOZA EMAS. Qo'l bo'sh yoki predmet mos kelmasa — tugma
      //    O'ZINING oddiy funksiyasini bajaradi va HECH QANDAY xabar
      //    chiqarmaydi. Tugmaning o'z vazifasi predmetdan mustaqil.
      itemReq: {
        enabled: false,
        onDone:  'consume',  // 'consume' — predmet yo'qoladi · 'keep' — qo'lda qoladi
        loop:    true,       // oxirgi slotdan keyin boshiga qaytsinmi
        slots:   [],         // [{itemId, sourceName, keyframes, duration, targetObjectId, speed}]
      },

      // ── Ketma-ket animatsiyalar (trigger + attached uchun) ─
      mode:            'loop',      // 'loop' | 'pingpong' (faqat 'single' ijro usulida)
      slots:           [],          // [{sourceName, keyframes, duration, targetObjectId, speed, soundUrl, soundName}]

      // ── Ijro usuli ───────────────────────────────────────
      // 'single'       = har bosishda bitta animatsiya (mode: loop/pingpong bo'yicha keyingisi)
      // 'all_seq'      = All: hamma animatsiya qatorma-qator (biri tugagach keyingisi)
      // 'all_parallel' = All: hamma animatsiya (timeline) bir vaqtda ishga tushadi
      playMode:        'single',
      loopPlay:        false,       // true = loop (takrorlanadi), false = oddiy (bir marta)
      // 🔁 Loop ketayotganda QAYTA bosilsa nima bo'ladi:
      //   'stop'    — butunlay to'xtaydi (standart)
      //   'restart' — boshidan qayta boshlanadi
      loopRetrigger:   'stop',

      // ── 🖥 HTML sahifa (dialog/quest) — bosilganda ─────────
      htmlPage:        { enabled: false, mode: 'show', content: '', position: 'bottom',
                         // 🎞 chiqish · ⏱ turish · ⌨ qulf (hitbox bilan BIR XIL)
                         ease: 'smooth', dur: 0.3, hold: 0, lockKeys: false,
                         bez: [0.42, 0, 0.58, 1] },
      // 📝 Matn bloki — tugma bosilganda matn almashadi
      textBlock:       { enabled: false, targetId: null, text: '', mode: null, toggle: false, backText: '' },
      // 🛤 Yo'l — tugma bosilganda yo'l boshqariladi
      path:            { enabled: false, targetId: null, action: 'toggle' },
      // 💻 PC — 1-bosish yoqadi, 2-chisi o'chiradi
      pcBlock:         { enabled: false, targetId: null, action: 'toggle' },
      // 👤 O'yinchi modeli — hitbox bilan bir xil mantiq
      playerModel:     { enabled: false, mode: 'temp', modelId: null, scale: 1, yaw: 0, offset: {x:0,y:0,z:0} },
      // 🌀 Teleport — hitboxdan 1ga1 ko'chirildi (to'liq sozlamalar)
      spawnRedirect:   {
        enabled:             false,
        spawnId:             null,
        preAnimEnabled:      false,
        preAnimType:         'fade',      // 'fade' | 'html' | 'camera'
        preAnimDuration:     1.0,         // umumiy soniya
        preAnimColor:        '#000000',   // 'fade' uchun
        preAnimHtml:         '<div style="text-align:center;font-family:sans-serif">\n' +
                             '  <div style="font-size:36px;color:#fff;margin-bottom:12px">Yuklanmoqda…</div>\n' +
                             '  <div style="font-size:14px;color:#aaa">Iltimos kuting</div>\n' +
                             '</div>',    // 'html' uchun
        // Kamera pre-anim variantlari
        preAnimCameraSource: 'spawn',     // 'spawn' | 'object' | 'timeline' | 'imported'
        preAnimCameraId:     null,        // nishon kamera obyekt id (object/timeline/imported)
        preAnimKeyframes:    [],          // 'imported' — .json dan yuklanadi
        preAnimKfSourceName: '',          // import qilingan fayl nomi
        // Butun pre-anim davomida o'yinchi inputini bloklash
        lockPlayer:          true,
      },
      // 🎥 Kamera animatsiyasi — hitboxdan 1ga1 ko'chirildi (to'liq sozlamalar)
      cameraAnim:      {
        enabled:          false,
        cameraId:         null,
        duration:         1.5,
        transitionMode:   'smooth',   // 'smooth' | 'instant'
        continuePath:     true,       // o'tishdan keyin nishon kamerani faollashtirib Timeline'ni o'ynatish
        returnToPlayer:   true,       // hammasi tugagach boshqaruvni o'yinchiga qaytarish
        lockPlayer:       true,       // cutscene davomida WASD/sichqonchani muzlatish
        hidePlayer:       false,      // cutscene davomida o'yinchi mesh'ini yashirish
        hideCameraAlways: false,      // kamera mesh'i editorda ham ko'rinmasin
        blocks:           [],         // 🔒 [{time, key, loop, loopBack, exitKey}]
      },

      // ── Runtime state ────────────────────────────────────
      _currentIdx:     0,
      _direction:      1,
      _playing:        false,
      _activeHandles:  [],          // ijro etilayotgan animatsiya handle'lari
      _chainIdx:       0,           // all_seq uchun joriy zanjir indeksi
    };
  }

  // ── Create button mesh ───────────────────────────────────────
  /**
   * Saqlangan tugmaning KO'RINISHINI tiklaydi (geometriya + yorug' material).
   * Prefab/sahna yuklashda tugma oddiy kul rang kub bo'lib keladi —
   * bu yerda unga o'zining yassi, yorqin ko'rinishi qaytariladi.
   * `userData` va transformga tegilmaydi.
   */
  function restoreBtnVisual(mesh) {
    if (!mesh || !mesh.isMesh) return mesh;
    try { mesh.geometry && mesh.geometry.dispose(); } catch (e) {}
    try { mesh.material && mesh.material.dispose(); } catch (e) {}
    mesh.geometry = new THREE.BoxGeometry(0.6, 0.6, 0.15);
    mesh.material = new THREE.MeshStandardMaterial({
      color:             0x00e5ff,
      emissive:          0x00e5ff,
      emissiveIntensity: 0.5,
      roughness:         0.35,
      metalness:         0.6,
    });
    mesh.castShadow    = true;
    mesh.receiveShadow = false;
    return mesh;
  }

  /**
   * 📐 Obyektning to'qnashuv qutisini O'Z GEOMETRIYASIDAN oladi.
   *
   * ⚠ ALOMAT: 🔘 tugmaning to'qnashuvi ko'rinishiga mos emasdi —
   *   o'yinchi undan ancha uzoqda to'xtardi, burilgan tugmada esa
   *   quti umuman boshqa yo'nalishda edi.
   *
   * ⚠ SABAB: `player.js:757` quti o'lchamini shunday oladi:
   *      `colliderSize ? colliderSize × worldScale : worldScale`
   *   Kub uchun bu to'g'ri — uning geometriyasi 1×1×1, ya'ni scale
   *   ayni o'lcham. Tugma esa `BoxGeometry(0.6, 0.6, 0.15)`, scale
   *   esa 1 — natijada 1×1×1 lik ko'rinmas quti, haqiqiy tugmadan
   *   ~7× qalin.
   *
   * YECHIM: geometriyaning lokal bbox'i `colliderSize` ga yoziladi —
   * xuddi GLB modellarda qilinganidek. Shundan keyin burilish ham
   * o'zi ishlaydi: `player.js` allaqachon OBB tekshiruvini biladi,
   * unga faqat TO'G'RI o'lcham yetishmayotgan edi.
   *
   * ⚠ Eski sahnalar uchun ham: `update()` da bir marta hisoblanadi.
   */
  function _ensureColliderSize(obj) {
    const ud = obj && obj.userData;
    if (!ud || ud.colliderSize || !obj.geometry) return false;
    try {
      if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
      const bb = obj.geometry.boundingBox;
      if (!bb) return false;
      ud.colliderSize = {
        x: Math.max(1e-3, bb.max.x - bb.min.x),
        y: Math.max(1e-3, bb.max.y - bb.min.y),
        z: Math.max(1e-3, bb.max.z - bb.min.z),
      };
      return true;
    } catch (e) { return false; }
  }

  function create(pos) {
    // Vizual: kichkina yorug' kub (dashboard tugmasi kabi)
    const geo = new THREE.BoxGeometry(0.6, 0.6, 0.15);
    const mat = new THREE.MeshStandardMaterial({
      color:             0x00e5ff,
      emissive:          0x00e5ff,
      emissiveIntensity: 0.5,
      roughness:         0.35,
      metalness:         0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = true;
    mesh.receiveShadow = false;

    mesh.userData = Object.assign({
      id:   ++objIdC,
      name: 'Tugma ' + objIdC,
    }, _defaultData());

    mesh.position.copy(pos || new THREE.Vector3(0, 1, 0));
    _ensureColliderSize(mesh);       // 📐 to'qnashuv = tugmaning O'Z chegarasi
    scene.add(mesh);
    objects.push(mesh);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();

    updateHierarchy();
    updateStats();
    selectObject(mesh);
    log(`+ "Tugma ${objIdC}" qo'shildi`, 'lok');
    return mesh;
  }

  // ── 👁 QARASH BLOKI ─────────────────────────────────────────
  //  O'yinchi qaraganda (yoki qaramay qo'yganда) chiqishlarni ishga
  //  tushiradi. Tugmaning BUTUN chiqish tizimini (`_fireButton`) qayta
  //  ishlatadi — animatsiya, sound, PC, path, textBlock, teleport.
  //  Farqi: bosish emas, QARASH tetigi.
  // 👁 Ko'z ikonasini quradi (create va restore ikkalasi ishlatadi)
  function _buildGazeVisual() {
    const g = new THREE.Group();
    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.36, 32),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    const pupil = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 24),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    pupil.position.z = 0.001;
    g.add(disk); g.add(ring); g.add(pupil);
    g.traverse(o => { if (o !== g) o.userData._gazePart = true; });
    return g;
  }

  // Saqlangan qarash blokini (kub) ko'z ikonasi bilan almashtiradi
  function restoreGazeVisual(mesh) {
    const g = _buildGazeVisual();
    g.position.copy(mesh.position);
    g.rotation.copy(mesh.rotation);
    g.scale.copy(mesh.scale);
    g.userData = mesh.userData;
    return g;
  }

  function createGaze(pos) {
    const g = _buildGazeVisual();
    const ud = Object.assign({
      id:   ++objIdC,
      name: 'Qarash ' + objIdC,
    }, _defaultData());
    // ⚠ isInteractiveBtn=true QOLADI — shunda mavjud tugma inspektori va
    //   _fireButton to'liq ishlaydi (animatsiya, sound, PC, path...).
    //   Qo'shimcha isGazeTrigger bayrog'i: bosish o'rniga QARASH tetigi.
    //   Update loop bosish tekshiruvини gaze blok uchun O'TKAZIB YUBORADI.
    ud.isGazeTrigger = true;
    ud.type          = 'GazeTrigger';
    ud.gaze = {
      trigger:  'look',      // 'look' | 'away' | 'both'
      cone:     30,          // konus yarim burchagi (daraja)
      dist:     15,          // maksimal masofa (metr)
      requireLos: true,      // to'siq (devor) bo'lsa hisoblanmasin
      once:     false,       // bir marta ishga tushib to'xtasin
      reArm:    0.5,         // qayta tayyorlanish kutishi (sek)
      hideInPlay: true,      // 👁 Play'да ko'z ikonasi yashirilsin (funksiya ishlaydi)
      // ── ⏱ TAYMER ────────────────────────────────────────────
      //  delay > 0 bo'lsa: tetik bosilganда chiqish DARHOL emas,
      //  `delay` sekunddan KEYIN ishga tushadi (sanoq boshlanadi).
      delay:    0,           // kechikish (sek). 0 = darhol (eski xulq)
      holdGaze: false,       // sanoq davomida QARAB TURISH shartmi?
                             //   true  → qarashdan voz kechsa sanoq BEKOR bo'ladi
                             //   false → boshlangan sanoq oxirigacha boradi
      showTimer: true,       // ekranda sanoqni ko'rsatish
      timerPos: 'tc',        // sanoq joylashuvi: tl tc tr | mc | bl bc br
    };
    g.userData = ud;

    g.position.copy(pos || new THREE.Vector3(0, 1.5, 0));
    scene.add(g);
    objects.push(g);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();

    updateHierarchy();
    updateStats();
    selectObject(g);
    log(`+ "Qarash ${objIdC}" qo'shildi — qaralganda ishga tushadi`, 'lok');
    return g;
  }

  // ── Pickup / Throw state (butun tizim uchun bitta ko'tarilgan predmet) ──
  let _closestBtn  = null;
  const _prevKey   = {};   // per-key previous state (rising-edge detection)
  let _carried = null;   // { btnId, target, prevParent, prevMatrix }
  const _thrownItems = []; // [{obj, vel:Vector3, life:sec}]
  const _audioCache = new Map(); // slot key → HTMLAudioElement (cache)
  const _activeAudios = new Set(); // ijro etilayotgan audio elementlar

  // ============================================================
  //  📦 PREDMET SHARTI — o'yinchi qo'lida predmet bilan bosishi
  //
  //  ⚠ NEGA HITBOX KODINI QAYTA ISHLATMADIK: hitboxdagi `itemReq`
  //    zonaga KIRISH bilan ishlaydi va uning yarmi ('deliver' —
  //    predmetni zonaga tashlash) tugmada ma'nosiz. Umumiy qismi esa
  //    atigi ikki qator: "qo'lidagi predmet shumi?" va "predmetni
  //    yo'q qil". Ularni umumlashtirish `hitbox.js` ga bog'liqlik
  //    kiritardi — tugma tizimi undan MUSTAQIL ishlashi kerak
  //    (hitbox o'chirilgan build'da ham tugma ishlaydi).
  //
  //  ⚠ `_irConsumed` — Stop bosilganda predmetlarni QAYTARISH uchun.
  //    `visible` ni play-mode.js `savedStates` orqali o'zi tiklaydi,
  //    lekin `colliderMode` — userData maydoni, uni O'ZIMIZ tiklaymiz.
  //    Aks holda predmet keyingi o'yinda ham arvoh bo'lib qolardi.
  //    (Hitboxdagi `_irRestoreConsumed` bilan aynan bir xil sabab.)
  // ============================================================
  const _irConsumed = [];   // [{obj, prevCollider}]

  /** Tugmaning predmet slotlari faolmi (+ eski modelni yangisiga o'tkazadi). */
  function _irOn(ud) {
    if (!ud || !ud.itemReq || !ud.itemReq.enabled) return false;
    // ⚠ Eski sahnalarda `itemReq = {itemId, afterUse, failMsg}` edi.
    //   Migratsiyasiz `slots` bo'lmaydi va xususiyat JIMGINA ishlamay
    //   qolardi. Inspektor ochilmasa ham (o'yin vaqtida) o'tkazamiz.
    if (!Array.isArray(ud.itemReq.slots)) _irMigrate(ud);
    return true;
  }

  /**
   * Joriy (navbatdagi) predmet sloti. Ketma-ketlik tugagan bo'lsa `null`.
   */
  function _irCurSlot(ud) {
    const list = (ud.itemReq && ud.itemReq.slots) || [];
    const i = ud._irIdx || 0;
    return (i >= 0 && i < list.length) ? list[i] : null;
  }

  /**
   * Qo'ldagi predmet JORIY slotga mos keladimi?
   *
   * ⚠ Bu funksiya HECH NARSANI O'ZGARTIRMAYDI — har kadr chaqiriladi
   *   (kalit bosilishini kimga yo'naltirishni hal qilish uchun).
   *   Predmetni olish `_irStep()` da.
   *
   * @returns {THREE.Object3D|null} mos predmet yoki null
   */
  function _irMatchHeld(ud) {
    if (!_carried || !_carried.target) return null;
    const slot = _irCurSlot(ud);
    if (!slot) return null;                    // ketma-ketlik tugagan
    const want = slot.itemId;
    // null / bo'sh — istalgan ko'tarilgan predmet qabul qilinadi
    if (want == null || want === '') return _carried.target;
    const heldId = _carried.target.userData && _carried.target.userData.id;
    return String(heldId) === String(want) ? _carried.target : null;
  }

  /**
   * Ketma-ketlik hali TUGAMAGANmi? (ya'ni yana predmet kutilyaptimi)
   *
   * ⚠ Shu holatda tugmaning ASOSIY funksiyasi ishlamasligi kerak.
   *   Ilgari ishlardi va uch xil buzilish berardi:
   *     • asosiy animatsiya predmetlar to'lmasdan otilib ketardi;
   *     • asosiy va slot animatsiyasi BITTA obyektni bir vaqtda
   *       tortqilardi — natijada slot animatsiyasi oxirigacha
   *       bormasdi va sakrab boshlangandek ko'rinardi;
   *     • keyingi bosishda `_activeHandles` to'lgani uchun toggle
   *       otilib, ikkalasini ham to'xtatardi.
   *   Xabar CHIQARMAYDI — jimgina e'tiborsiz qoldiradi.
   */
  function _irPending(ud) {
    const list = (ud.itemReq && ud.itemReq.slots) || [];
    return list.length > 0 && (ud._irIdx || 0) < list.length;
  }

  /** Bu tugma qo'ldagi predmetni QABUL QILADIMI? (o'zgartirmaydi) */
  function _irAccepts(btn) {
    const ud = btn && btn.userData;
    if (!_irOn(ud)) return false;
    return !!_irMatchHeld(ud);
  }

  /** Predmetni id bo'yicha sahnadan topadi (UI uchun). */
  function _irFindItem(id) {
    if (id == null || id === '') return null;
    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      if (o.userData && String(o.userData.id) === String(id)) return o;
    }
    return null;
  }

  /**
   * Predmetni "iste'mol" qiladi: qo'ldan chiqaradi, ko'rinmas qiladi va
   * to'qnashuvdan olib tashlaydi.
   */
  function _irConsumeItem(item) {
    if (!item || item.userData._ibtnConsumed) return;
    // Qo'ldan chiqaramiz — lekin TASHLAMAYMIZ (tezlik berilmasin).
    // `releaseCarried` mavjud yordamchi: kameradan ajratadi, world
    // pozitsiyaga qo'yadi va tik qilib turg'izadi.
    try { releaseCarried(item); } catch (e) {}
    _irConsumed.push({ obj: item, prevCollider: item.userData.colliderMode });
    item.userData._ibtnConsumed = true;
    item.userData.colliderMode  = 'inline';   // 👻 o'yinchi ichidan o'tsin
    item.visible = false;
  }

  /** Predmet slotlari animatsiyalarini to'xtatadi (asosiylariga tegmaydi). */
  function _irStopAnims(ud) {
    (ud._irHandles || []).forEach(h => { try { h && h.stop && h.stop(); } catch (e) {} });
    ud._irHandles = [];
  }

  /** Stop bosilganda — yo'q qilingan predmetlarni qaytaramiz. */
  function _irRestoreConsumed() {
    for (const c of _irConsumed) {
      if (!c.obj) continue;
      c.obj.userData._ibtnConsumed = false;
      if (c.prevCollider === undefined) delete c.obj.userData.colliderMode;
      else                              c.obj.userData.colliderMode = c.prevCollider;
      c.obj.visible = true;
    }
    _irConsumed.length = 0;
  }

  /** Barcha tugmalarning ketma-ketlik o'rnini boshiga qaytaramiz (Play boshida). */
  function _irResetFlags() {
    for (const o of objects) {
      if (o.userData && o.userData.isInteractiveBtn) {
        o.userData._irIdx = 0;
        _irStopAnims(o.userData);
      }
    }
  }

  /**
   * 📦 BIR QADAM — predmetni qabul qilib, ketma-ketlikni suradi.
   *
   * `true`  → OXIRGI slot ham to'ldi; chaqiruvchi tugmaning o'z
   *           funksiyasini (ANM slotlari, kamera, teleport…) davom ettirsin
   * `false` → hali oxiriga yetmadi; faqat shu slotning animatsiyasi o'ynadi
   *
   * ⚠ Slotda animatsiya BO'LMASLIGI mumkin — u holda shunchaki keyingi
   *   slotga o'tiladi. Animatsiya qo'yish majburiy emas.
   */
  function _irStep(btn) {
    const ud   = btn.userData;
    const held = _irMatchHeld(ud);
    if (!held) return false;

    const slot = _irCurSlot(ud);
    const ir   = ud.itemReq;

    if ((ir.onDone || 'consume') === 'consume') _irConsumeItem(held);

    // Slot animatsiyasi — bo'lsa o'ynaymiz. `_playOne` sound'ni ham
    // hal qiladi; keyframe yo'q bo'lsa jimgina chiqib ketadi.
    //
    // ⚠ Handle ALOHIDA ro'yxatda (`_irHandles`), asosiy `_activeHandles`
    //   da EMAS — sabab `_playOne` izohida.
    const hasAnim = slot && Array.isArray(slot.keyframes) && slot.keyframes.length > 0;
    const list  = (ir.slots || []);
    const next  = (ud._irIdx || 0) + 1;
    const done  = next >= list.length;

    // Oldingi slotning animatsiyasi hali ketayotgan bo'lsa to'xtatamiz —
    // ikkalasi bitta obyektni tortqilamasin.
    if (hasAnim) _irStopAnims(ud);

    if (done) {
      ud._irIdx = (ir.loop !== false) ? 0 : list.length;
      log(`📦 "${ud.name}" — barcha predmetlar to'landi`, 'lok');

      if (hasAnim) {
        // ⚠ OXIRGI slotda ham animatsiya bor: uni asosiy funksiya bilan
        //   BIR VAQTDA ishga tushirsak, ikkalasi bitta obyektni
        //   tortqilaydi — foydalanuvchi ko'rgan "oxirigacha yurmaydi,
        //   sakrab boshlanadi" alomati aynan shundan edi.
        //   Shuning uchun ULAYMIZ: slot animatsiyasi TUGAGACH asosiy
        //   funksiya chaqiriladi (`_skipItem = true` bilan, aks holda
        //   cheksiz rekursiya bo'lardi).
        _playOne(btn, slot, {
          loop: false,
          handles: (ud._irHandles = ud._irHandles || []),
          onDone: () => { try { _fireButton(btn, true); } catch (e) {} },
        });
        return false;   // hozir emas — onDone chaqiradi
      }
      return true;
    }

    if (hasAnim) {
      _playOne(btn, slot, { loop: false, handles: (ud._irHandles = ud._irHandles || []) });
    }
    ud._irIdx = next;
    log(`📦 "${ud.name}" — ${next}/${list.length}`, 'lok');
    return false;
  }

  // ── Sound ijro (per-slot, optional) ──────────────────────────
  function _playSlotSound(slot) {
    if (!slot || !slot.soundUrl) return;
    try {
      const cacheKey = slot.soundUrl.slice(0, 100); // data URL boshi
      let audio = _audioCache.get(cacheKey);
      if (!audio) {
        audio = new Audio(slot.soundUrl);
        audio.volume = 0.75;
        _audioCache.set(cacheKey, audio);
        audio.addEventListener('ended',  () => _activeAudios.delete(audio));
        audio.addEventListener('pause',  () => _activeAudios.delete(audio));
      }
      audio.currentTime = 0;
      _activeAudios.add(audio);
      audio.play().catch(err => {
        _activeAudios.delete(audio);
        log('⚠ Audio: ' + err.message, 'lw');
      });
    } catch (err) {
      log('⚠ Audio yuklanmadi: ' + err.message, 'lw');
    }
  }

  // ── Barcha ijro etilayotgan audiolarni to'xtatish ────────
  function _stopAllSounds() {
    if (_activeAudios.size === 0) return;
    let stopped = 0;
    _activeAudios.forEach(a => {
      try { a.pause(); a.currentTime = 0; stopped++; } catch(e) {}
    });
    _activeAudios.clear();
    return stopped;
  }

  // ── Attach sync — attached rejimda tugma har frame parentga yopishadi ──
  // ⚠ TUZATILDI: eski kod `btnMode !== 'attached'` bo'lgan HAR QANDAY tugmani
  // har frame `scene.attach(o)` bilan sahna ildiziga tortib chiqarardi.
  // Natijada foydalanuvchi tugmani papkaga solsa, keyingi kadrda u yana
  // tashqariga sakrab chiqardi — "tugma papkaga kirmayapti".
  // Endi biz FAQAT o'zimiz avtomatik biriktirgan tugmani uzamiz
  // (_autoAttached bayrog'i). Qo'lda joylashtirilgan iyerarxiyaga tegilmaydi.
  function _syncAttachedButtons() {
    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      if (!o.userData || !o.userData.isInteractiveBtn || o.userData._mlOff) continue;

      const wantParent = (o.userData.btnMode === 'attached') ? o.userData.attachedToId : null;

      if (wantParent) {
        const parent = objects.find(p => String(p.userData?.id) === String(wantParent));
        if (parent && parent !== o && o.parent !== parent) {
          try { parent.attach(o); } catch(e) {}
          o.userData.parentId    = parent.userData.id;
          o.userData._autoAttached = true;
        } else if (!parent && o.userData._autoAttached && o.parent !== scene) {
          // Biriktirilgan obyekt o'chirilgan — biz qo'ygan bog'lanishni uzamiz
          try { scene.attach(o); } catch(e) {}
          o.userData.parentId      = null;
          o.userData._autoAttached = false;
        }
      } else if (o.userData._autoAttached && o.parent !== scene) {
        // 'attached' rejimidan chiqildi — faqat BIZ qo'ygan bog'lanishni uzamiz
        try { scene.attach(o); } catch(e) {}
        o.userData.parentId      = null;
        o.userData._autoAttached = false;
      }
      // Boshqa hollarda — iyerarxiyaga UMUMAN tegmaymiz (papka, prefab, nest).
    }
  }

  // ── 👥 3-SHAXS ushlash nuqtasi ───────────────────────────────
  //  1-shaxsda kamera = o'yinchi ko'zi, shuning uchun predmetni
  //  kameraga yopishtirish to'g'ri ishlaydi.
  //  3-shaxsda esa kamera qahramondan ORQADA va tepada turadi —
  //  predmet o'sha yerda osilib qolardi va tashlaganda ham kameradan
  //  tushardi. Shu sabab 3-shaxsda ushlash nuqtasi QAHRAMON tanasidan
  //  hisoblanadi (qahramon `o.rotation.y = camYaw` bilan buriladi).
  const _tpW = new THREE.Vector3();
  const _tpQ = new THREE.Quaternion();
  const _tpE = new THREE.Euler(0, 0, 0, 'YXZ');

  function _tpBody() {
    const P = (typeof PlayerController !== 'undefined') ? PlayerController : null;
    if (!P || P.camMode !== 'third') return null;
    if (!P.obj || !P.obj.parent) return null;
    return P;
  }

  /** Qahramon oldidagi ushlash nuqtasi (DUNYO koordinatasi) */
  function _tpHoldPos(P, holdDist, out) {
    const o = P.obj;
    o.getWorldPosition(out);
    const yaw = P.camYaw || 0;
    out.x -= Math.sin(yaw) * holdDist;
    out.z -= Math.cos(yaw) * holdDist;
    out.y += (o.scale.y || 1) * 0.25;   // ko'krak balandligi
    return out;
  }

  /**
   * Qarash yo'nalishining YAW burchagi (radian).
   * `camera.rotation.y` ga ishonmaymiz — u faqat 'YXZ' tartibida to'g'ri.
   * Shuning uchun dunyo vektoridan hisoblaymiz: fwd = (-sin y, *, -cos y).
   */
  function _viewYaw() {
    const P = (typeof PlayerController !== 'undefined') ? PlayerController : null;
    if (P && P.obj && typeof P.camYaw === 'number') return P.camYaw;
    if (typeof camera !== 'undefined' && camera) {
      camera.getWorldDirection(_tpW);
      return Math.atan2(-_tpW.x, -_tpW.z);
    }
    return 0;
  }

  const _relQ  = new THREE.Quaternion();
  const _relQi = new THREE.Quaternion();
  const _relE  = new THREE.Euler(0, 0, 0, 'YXZ');
  /**
   * 🔄 Predmet KO'TARILGANDAGI burilishini eslab qoladi.
   *
   * ⚠ ALOMAT: burilgan (masalan 40° yotqizilgan) tugma ko'tarilsa TIK
   *   turib qolardi, tashlangandan keyin ham tik yotardi. Ya'ni
   *   predmetning burilishi qo'lga olish bilan YO'QOLARDI.
   *
   * ⚠ SABAB: `_applyWorldYaw()` predmetga FAQAT o'yinchining yaw'ini
   *   berardi — predmetning o'z burchagi umuman hisobga olinmasdi.
   *
   * YECHIM: ko'tarilganда `relQ = yaw⁻¹ × dunyoBurchagi` saqlanadi.
   *   Keyin har kadr `dunyo = yaw × relQ` qo'yiladi:
   *     • predmet o'z qiyshayishini SAQLAYDI,
   *     • o'yinchi burilsa u bilan birga buriladi,
   *     • kameraning pitch/roll'i esa unga O'TMAYDI (eski xato shu edi).
   *   Burilmagan predmet uchun `relQ` ~ birlik — xulq o'zgarmaydi.
   */
  function _captureRelQ(obj, yaw) {
    const q = new THREE.Quaternion();
    obj.getWorldQuaternion(q);
    _relE.set(0, -yaw, 0);
    _relQi.setFromEuler(_relE);
    return _relQi.multiply(q).clone();
  }

  /**
   * Obyektni DUNYOda berilgan yaw bo'yicha buradi.
   * @param {THREE.Quaternion} [relQ] ko'tarilgandagi o'z burilishi
   *        (berilmasa — tik holat, eski xulq).
   * ⚠ Predmet kameraning bolasi bo'lgani uchun kameraning pitch/roll
   *   burchagi ham unga o'tardi — pastga qarab tashlansa predmet
   *   qiyshaygancha qolib ketardi. Bu yerda faqat YAW qoldiriladi.
   *   Lokal = ota⁻¹ × dunyo.
   */
  function _applyWorldYaw(obj, yaw, relQ) {
    _tpE.set(0, yaw, 0);
    _tpQ.setFromEuler(_tpE);
    if (relQ) _tpQ.multiply(relQ);
    if (obj.parent) {
      obj.parent.getWorldQuaternion(obj.quaternion);
      obj.quaternion.invert().multiply(_tpQ);
    } else {
      obj.quaternion.copy(_tpQ);
    }
  }

  // ── ⚖️ KO'TARILGAN PREDMET FIZIKASI ──────────────────────────
  //
  //  ⚠ ALOMAT: fizikasi YOQILGAN predmet tashlanganda havoda QOTIB
  //    qolardi — odatda ko'tarilgan joyining tepasida.
  //
  //  ⚠ SABAB: `updatePhysics()` har kadr Rapier tanasining joyini
  //    meshga KO'CHIRADI (`physics.js:339` — `mesh.position.set(...)`).
  //    Predmet ko'tarilganда tanaga hech kim aytmaydi — u eski joyida
  //    turaveradi va tinchib UXLAB qoladi. `_updateThrown()` esa
  //    meshni har kadr uchiradi, Rapier esa darhol uxlab yotgan
  //    tananing joyiga QAYTA YOZADI. Ikkalasi urishadi va g'olib
  //    Rapier bo'ladi: predmet qimirlamaydi.
  //
  //    Fizikasiz predmetlarda (🔘 tugma, 📦 pickup — `SceneTypes` da
  //    `physics: null`) tana yo'q, shuning uchun bu xato ilgari
  //    ko'rinmasdi.
  //
  //  YECHIM: predmet qo'lda yoki uchayotganда tanasi VAQTINCHA
  //  yechiladi, tinchiganda esa AYNAN o'sha sozlamalar bilan
  //  tushgan joyida qayta tiklanadi. Sozlamalar `ud.carryPhys` da
  //  turadi (`_` SIZ — ya'ni faylga ham tushadi, o'yin saqlansa
  //  predmet fizikasi yo'qolmaydi).
  //
  //  ⚠ Bu MANTIQ SHU YERDA — ko'tarish va tashlash egasi shu tizim.
  //    🎒 Inventar unga faqat murojaat qiladi, o'zi fizikaga tegmaydi.
  /**
   * 👻 Qo'ldagi predmet — HAR DOIM `inline`.
   *
   * ⚠ NEGA: predmet kameraga yopishtiriladi va o'yinchining
   *   BURNI TAGIDA turadi. `colliderMode` `block` bo'lsa
   *   `player.js` ning AABB sikli uni devor deb biladi — o'yinchi
   *   o'zi ko'tarib turgan narsaga tirilib, oldinga yura olmasdi
   *   yoki qaltirab turardi.
   *
   *   Qo'yib yuborilganda AYNAN avvalgi qiymati qaytariladi
   *   (`ud.carryCollider`, `_` siz — faylga ham tushadi).
   */
  function _carryInline(obj) {
    if (!obj || !obj.userData) return;
    const ud = obj.userData;
    if (ud.carryCollider === undefined) ud.carryCollider = ud.colliderMode ?? null;
    ud.colliderMode = 'inline';
  }
  function _carryColliderBack(obj) {
    if (!obj || !obj.userData) return;
    const ud = obj.userData;
    if (ud.carryCollider === undefined) return;
    if (ud.carryCollider === null) delete ud.colliderMode;
    else ud.colliderMode = ud.carryCollider;
    delete ud.carryCollider;
  }

  function suspendPhysics(obj) {
    if (!obj || !obj.userData) return false;
    if (obj.userData.carryPhys) return true;           // allaqachon yechilgan
    if (typeof physBodies === 'undefined') return false;
    const b = physBodies.find(x => x.mesh === obj);
    if (!b) return false;                              // tanasi yo'q — ish yo'q
    obj.userData.carryPhys = {
      mass: b.mass, restitution: b.restitution, friction: b.friction,
      isStatic: b.isStatic, radius: b.radius, shape: b.shape,
    };
    try { removeRapierBody(obj); } catch (e) {}
    return true;
  }

  function resumePhysics(obj) {
    if (!obj || !obj.userData || !obj.userData.carryPhys) return false;
    const opts = obj.userData.carryPhys;
    delete obj.userData.carryPhys;
    if (!obj.parent) return false;                     // sahnadan chiqib ketgan
    try {
      if (typeof addPhysicsBody === 'function') addPhysicsBody(obj, opts);
    } catch (e) { return false; }
    return true;
  }

  // ── Pickup ──────────────────────────────────────────────────
  function _pickupTarget(btn) {
    if (_carried) return;
    const ud = btn.userData;
    let target;
    if (ud.pickupTargetId) {
      target = objects.find(o => String(o.userData?.id) === String(ud.pickupTargetId));
    } else {
      target = btn; // tugmaning o'zi
    }
    if (!target) {
      log(`⚠ "${ud.name}" — pickup maqsad topilmadi`, 'lw');
      return;
    }
    // ── 🎒 INVENTAR ─────────────────────────────────────────
    //  Inventar yoqilgan bo'lsa predmet QO'LGA emas, SUMKAGA tushadi.
    //  ⚠ Rasm va nom TUGMADAN olinadi (inspektorda \"Nom\" yonida
    //    yuklanadi) — o'yinchi katakda aynan shu rasmni ko'radi.
    //    Tugmada berilmagan bo'lsa predmetning O'ZIDAGI qiymat, u ham
    //    bo'lmasa obyekt nomi ishlatiladi.
    if (window.InventorySystem && InventorySystem.cfg &&
        InventorySystem.cfg.enabled && InventorySystem.cfg.autoStore) {
      const ok = window.InventorySystem.store(target, {
        name:  ud.invName || target.userData.invName || target.userData.name,
        icon:  ud.invIcon || target.userData.invIcon || null,
        // ⚠ Tugmani ESLAB QOLAMIZ: predmet inventardan tashlanganda
        //   tashlash kuchi (`throwForce`) va ushlash masofasi AYNAN
        //   shu tugmanikidek bo'lishi kerak — aks holda inventar
        //   orqali olingan predmet boshqacha uchardi.
        btnId: ud.id,
      });
      if (ok) return;
      // Inventar to'la — eski yo'l bilan qo'lga olamiz (jimgina yo'qotmaymiz)
    }
    // ⚖️ Agar predmet biror obyektga YUK sifatida biriktirilgan bo'lsa —
    //    ko'targanda uni yechamiz, egasining og'irlik markazi qaytadi.
    if (window.CenterOfMass && target.userData && target.userData._comAttached) {
      try { CenterOfMass.detachLoad(target.parent, target); } catch (e) {}
    }
    _carried = {
      btnId:      ud.id,
      target,
      prevParent: target.parent,
      // 🔄 QANDAY olingan bo'lsa — shunday ushlanadi va shunday tashlanadi
      relQ:       _captureRelQ(target, _viewYaw()),
    };
    suspendPhysics(target);            // ⚖️ Rapier qo'ldagi predmetni tortmasin
    _carryInline(target);              // 👻 o'yinchiga to'sqinlik qilmasin
    // Kameraga yopishtir (world transform saqlanadi)
    try { camera.attach(target); } catch(e) {}
    log(`👐 "${target.userData.name || 'predmet'}" ko'tarildi`, 'lok');
  }

  function _throwCarried(btn) {
    if (!_carried) return;
    const target = _carried.target;
    const ud     = btn ? btn.userData : {};
    const force  = ud.throwForce || 12;
    const P      = _tpBody();

    // Dunyo pozitsiyasini saqlab, sahnaga qaytar
    const wpos = new THREE.Vector3();
    if (P) {
      // 👥 3-shaxs — boshlanish nuqtasi QAHRAMON qo'li, kamera emas.
      //   (rejim yangi almashgan bo'lsa `_updateCarried` hali yurmagan
      //    bo'lishi mumkin — shuning uchun qaytadan hisoblaymiz.)
      _tpHoldPos(P, ud.holdDist || 1.5, wpos);
    } else {
      target.getWorldPosition(wpos);
    }
    try { scene.attach(target); } catch(e) {}
    target.position.copy(wpos);
    _carryColliderBack(target);        // 👻 qo'ldan chiqdi — collideri qaytdi
    // ⚠ Predmet TIK tursin. Ilgari kameraning dunyo burchagi ko'chirilardi:
    //   yerga qarab tashlansa predmet qiyshaygancha uchib, shundayligicha
    //   qolib ketardi. Endi faqat yaw olinadi.
    _applyWorldYaw(target, P ? (P.camYaw || 0) : _viewYaw(), _carried.relQ);

    // Tashlash yo'nalishi
    const fwd = new THREE.Vector3();
    if (P) {
      // ⚠ 3-shaxsda `camera.quaternion` ISHLAMAYDI: kamera qahramondan
      //   tepada turib PASTGA qaraydi, predmet darrov yerga sanchilardi.
      //   Yo'nalish o'yinchi nishonidan olinadi: gorizontal — camYaw,
      //   vertikal — camPitch (0 bo'lsa tep-tekis oldinga uchadi).
      const yaw = P.camYaw || 0, pit = P.camPitch || 0;
      const cp = Math.cos(pit);
      fwd.set(-Math.sin(yaw) * cp, Math.sin(pit), -Math.cos(yaw) * cp);
    } else {
      // 👁 1-shaxs — kamera oldingi vektori
      fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
    fwd.multiplyScalar(force);
    // Bir oz yuqoriga arc uchun
    fwd.y += force * 0.15;

    _thrownItems.push({ obj: target, vel: fwd, life: 6 });
    log(`🎯 "${target.userData.name || 'predmet'}" tashlandi`, 'lok');
    _carried = null;

    // ⚖️ Predmet biror obyektning USTIGA tushsa, uning og'irlik markazi
    //    siljiydi. Rapier ikkala jismni alohida hisoblaydi va TEGISH
    //    orqali qiyalash o'z-o'zidan chiqadi — massani qo'lda qo'shish
    //    SHART EMAS va noto'g'ri bo'lardi (og'irlik ikki marta sanalardi).
    //    `attachLoad()` faqat predmet obyektga QATTIQ biriktirilganda
    //    (bola qilib qo'yilganda) kerak — bunda ular bitta jism bo'ladi.
  }

  function _updateCarried(/* delta */) {
    if (!_carried) return;
    const target = _carried.target;
    if (!target) { _carried = null; return; }
    // ⚠ `btnId` NULL bo'lishi mumkin: predmet `giveItem()` orqali tugmasiz
    //   ham qo'lga tushadi (skript, inventar, sahna boshlanishi). Ilgari
    //   bu yerda shartsiz `objects.find(o => o.userData?.id === null)`
    //   turardi — u `undefined` qaytarardi va predmet KEYINGI KADRDA
    //   jimgina qo'ldan tushib ketardi. Alomat chalkash edi: `giveItem`
    //   `true` qaytaradi, `isCarried` ham `true`, lekin bir kadrdan
    //   keyin predmet qo'lda yo'q.
    const btn = (_carried.btnId != null)
      ? objects.find(o => o.userData?.id === _carried.btnId)
      : null;
    const holdDist = (btn && btn.userData.holdDist) || 1.5;
    // Xavfsizlik — agar biror sabab bilan target scenedan yiqilib tushsa
    if (target.parent !== camera) {
      try { camera.attach(target); } catch(e) {}
    }

    const P = _tpBody();
    if (P) {
      // 👥 3-shaxs — predmet qahramon QO'LIDA. Ota hamon `camera`,
      //    shuning uchun dunyo nuqtasini kamera lokaliga ko'chiramiz.
      _tpHoldPos(P, holdDist, _tpW);
      camera.worldToLocal(_tpW);
      target.position.copy(_tpW);
      _applyWorldYaw(target, P.camYaw || 0, _carried.relQ);
    } else {
      // 👁 1-shaxs — kamera oldida
      target.position.set(0, -0.3, -holdDist);
      _applyWorldYaw(target, _viewYaw(), _carried.relQ);
    }
  }

  function _updateThrown(delta) {
    const g = 15; // gravitatsiya
    for (let i = _thrownItems.length - 1; i >= 0; i--) {
      const t = _thrownItems[i];
      if (!t.obj || !t.obj.parent) { _thrownItems.splice(i, 1); continue; }
      t.obj.position.addScaledVector(t.vel, delta);
      t.vel.y -= g * delta;
      // Havodagi drag
      t.vel.multiplyScalar(Math.pow(0.98, delta / 0.016));
      t.life -= delta;
      // Yer tekshiruvi (oddiy — y < 0.5)
      if (t.obj.position.y < 0.5) {
        t.obj.position.y = 0.5;
        if (t.vel.y < 0) t.vel.y *= -0.3;
        t.vel.x *= 0.6;
        t.vel.z *= 0.6;
      }
      const speed2 = t.vel.x*t.vel.x + t.vel.y*t.vel.y + t.vel.z*t.vel.z;
      if (t.life <= 0 || (speed2 < 0.02 && t.obj.position.y <= 0.6)) {
        _thrownItems.splice(i, 1);
        // ⚖️ Uchish tugadi — Rapier tanasi TUSHGAN JOYIDA qayta tug'iladi.
        //   Shundan keyin predmet oddiy jism: dumalaydi, ustiga narsa
        //   qo'yilsa bosiladi, mashina turtsa uchadi.
        resumePhysics(t.obj);
      }
    }
  }



  // ── 📦 Pickup holati — TASHQI tizimlar uchun (hitbox va h.k.) ──
  //  Hitbox "predmet shartи" shu API orqali biladi: predmet o'yinchi
  //  qo'lida turibdimi, havodami, yoki yerda yotibdimi.
  function isCarried(obj) {
    return !!(obj && _carried && _carried.target === obj);
  }
  function getCarried() {
    return _carried ? _carried.target : null;
  }
  function isThrown(obj) {
    if (!obj) return false;
    for (const t of _thrownItems) if (t.obj === obj) return true;
    return false;
  }
  /**
   * Predmetni o'yinchi qo'lidan MAJBURAN qo'yib yuboradi.
   * Otish emas — dunyo pozitsiyasi saqlanib, sahnaga qaytariladi.
   * @returns {boolean} rostdan qo'yib yuborildimi
   */
  function releaseCarried(obj) {
    if (!_carried) return false;
    if (obj && _carried.target !== obj) return false;
    const target = _carried.target;
    const relQ   = _carried.relQ;
    _carried = null;
    if (!target) return false;
    const wpos = new THREE.Vector3();
    target.getWorldPosition(wpos);
    try { scene.attach(target); } catch (e) {}
    target.position.copy(wpos);
    _carryColliderBack(target);                // 👻 qo'ldan chiqdi
    _applyWorldYaw(target, _viewYaw(), relQ);  // 🔄 olingandagi burilish saqlanadi
    // Havoda uchayotgan bo'lsa — to'xtatamiz
    for (let i = _thrownItems.length - 1; i >= 0; i--) {
      if (_thrownItems[i].obj === target) _thrownItems.splice(i, 1);
    }
    // ⚖️ Predmet dunyoga qaytdi — tanasi ham qaytsin. `_updateThrown`
    //    bu yo'lda ishtirok etmaydi, ya'ni uni tiklaydigan boshqa
    //    joy yo'q: qilmasak predmet mangu fizikasiz qolardi.
    resumePhysics(target);
    return true;
  }

  /**
   * 👐 Predmetni o'yinchi qo'liga TUGMASIZ beradi.
   *
   * ⚠ NEGA KERAK: `_pickupTarget()` tugmani talab qiladi (`btn.userData`
   *   dan `pickupTargetId` va `id` o'qiydi). Lekin predmet qo'lga
   *   tugmadan boshqa yo'l bilan ham tushishi mumkin — skript, inventar,
   *   hitbox, sahna boshlanishi. Ularning har biri soxta tugma yasashi
   *   noto'g'ri bo'lardi.
   *
   * `releaseCarried()` ning teskarisi. Qo'l band bo'lsa `false` qaytadi —
   * eski predmetni JIMGINA almashtirmaydi (aks holda o'yinchi qo'lidagi
   * narsa sababsiz yo'qolardi).
   *
   * @param {THREE.Object3D} obj    predmet
   * @param {number} [btnId]        predmetni bergan 🔘 tugma id'si
   *
   * ⚠ `btnId` NEGA KERAK: `_updateCarried()` ushlash masofasini
   *   (`holdDist`) aynan shu tugmadan o'qiydi. Berilmasa standart 1.5
   *   ishlatiladi — ya'ni 🎒 inventardan olingan predmet tugma bilan
   *   to'g'ridan ko'tarilganidan BOSHQA masofada turardi. Bitta
   *   predmet ikki xil ko'rinardi.
   */
  function giveItem(obj, btnId) {
    if (!obj || _carried) return false;
    _carried = {
      btnId: (btnId != null) ? btnId : null,
      target: obj,
      prevParent: obj.parent,
      relQ: _captureRelQ(obj, _viewYaw()),   // 🔄 `_pickupTarget` dagi bilan bir xil
    };
    suspendPhysics(obj);               // ⚖️ `_pickupTarget` dagi bilan bir xil
    _carryInline(obj);                 // 👻 `_pickupTarget` dagi bilan bir xil
    try { camera.attach(obj); } catch (e) {}
    return true;
  }

  // ── Player/kamera pozitsiyasi ────────────────────────────────
  // Har xil rejimlarda ishlashi uchun: PlayerController → playerMesh → kamera
  function _getInteractorPos() {
    if (window.PlayerController && PlayerController.obj) {
      return PlayerController.obj.position.clone();
    }
    if (typeof playerMesh !== 'undefined' && playerMesh) {
      return playerMesh.position.clone();
    }
    // Fallback — kamera pozitsiyasi (FPS mode, no player)
    if (typeof camera !== 'undefined' && camera) {
      return camera.position.clone();
    }
    return null;
  }

  // ── 🔤 Yaqinlashuv yozuvi (prompt) ──────────────────────────
  let _promptEl = null;
  let _promptCurBtn = null;
  const _rayLook = new THREE.Raycaster();
  const _lookNDC = new THREE.Vector2(0, 0);   // ekran markazi (nishon)

  function _getPromptEl() {
    if (_promptEl) return _promptEl;
    _promptEl = document.getElementById('ibtn-prompt');
    return _promptEl;
  }

  function _hidePrompt() {
    const el = _getPromptEl();
    if (el && el.style.display !== 'none') el.style.display = 'none';
    _promptCurBtn = null;
  }

  // O'yinchi tugmaga QARAYAPTIMI — nur otamiz.
  //  ⚠ 1-SHAXS va 3-SHAXS uchun BOSHQACHA:
  //    - 1-shaxs: kamera = o'yinchi ko'zi, nishon oldinga qaraydi → kamera
  //      markazidan nur to'g'ri.
  //    - 3-shaxs: kamera o'yinchining ORQASIDA/tepasida turadi. Kamera
  //      markazidan nur otsak, u o'yinchi qaragan joyga emas, kamera
  //      qaragan joyga borardi. Shuning uchun 3-shaxsда nurni O'YINCHI
  //      pozitsiyasidan, uning QARASH yo'nalishida (camYaw/camPitch)
  //      otamiz. Bu ikkala rejimда ham to'g'ri.
  //  Nur birinchi tugmaga (yoki bolasiga) tegsa — qaralayapti. Devor
  //  to'sib qo'ysa — yo'q.
  const _lookOrigin = new THREE.Vector3();
  const _lookDir = new THREE.Vector3();
  const _btnW = new THREE.Vector3();
  const _toBtn = new THREE.Vector3();

  function _isLookingAt(btn, playerPos) {
    const cam = (typeof camera !== 'undefined') ? camera : null;
    if (!cam) return false;
    const pc = window.PlayerController;
    const isThird = pc && pc.obj && pc.camMode === 'third';

    if (isThird && playerPos) {
      // ── 3-SHAXS: konus tekshiruvi (raycast emas) ──────────────
      //  ⚠ NEGA: 3-shaxsда nishon o'yinchi TANASIGA qaraydi, oldinga
      //    emas. Aniq raycast bilan o'yinchi tugmaga nishon ololmasdi —
      //    juda qattiq bo'lardi. Buning o'rniga: tugma o'yinchi qarash
      //    yo'nalishining KONUSI ichidami — shuni tekshiramiz. Tabiiyroq.
      const yaw = pc.camYaw || 0;
      const pitch = pc.camPitch || 0;
      _lookDir.set(
        -Math.sin(yaw) * Math.cos(pitch),
         Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      ).normalize();
      const eyeH = 1.5 * ((pc.obj && pc.obj.scale && pc.obj.scale.y) || 1);
      _lookOrigin.copy(playerPos);
      _lookOrigin.y += eyeH;

      btn.getWorldPosition(_btnW);
      _toBtn.copy(_btnW).sub(_lookOrigin);
      const distB = _toBtn.length();
      if (distB < 0.001) return true;      // ustida turibdi
      _toBtn.divideScalar(distB);          // normalize
      const dot = _lookDir.dot(_toBtn);
      // ~40° konus (cos40° ≈ 0.766). Undan tashqarida — qaramayapti.
      if (dot < 0.766) return false;
      // Konus ichida — endi yo'lda TO'SIQ bormi (devor ortida bo'lmasin)
      _rayLook.set(_lookOrigin, _toBtn);
    } else {
      // 1-shaxs (yoki o'yinchisiz) — kamera markazidan
      _rayLook.setFromCamera(_lookNDC, cam);
    }

    _rayLook.far = (btn.userData.interactDist || 3) + 1.5;
    const hits = _rayLook.intersectObjects(objects, true);
    const playerObj = pc && pc.obj;
    for (const h of hits) {
      let n = h.object;
      let isBtn = false, isPlayer = false;
      for (let d = 0; d < 8 && n; d++) {
        if (n === btn) { isBtn = true; break; }
        if (n === playerObj || n.userData?.isPlayerObj || n.userData?.isPlayer) { isPlayer = true; break; }
        n = n.parent;
      }
      if (isBtn) return true;
      if (isPlayer) continue;              // o'yinchi o'zi — o'tkazamiz
      if (!h.object.visible) continue;     // ko'rinmas — hisobga olmaymiz
      if (h.object.userData?._pcCamPart) continue;
      return false;                        // boshqa qattiq narsa to'sib qo'ydi
    }
    // 3-shaxsда: konus ichida va yo'lda to'siq uchramadi
    return isThird;
  }

  function _updatePrompt(btn, playerPos) {
    // Prompt yoqilmagan yoki tugma yo'q → yashir
    if (!btn || !btn.userData || !btn.userData.prompt || !btn.userData.prompt.enabled) {
      _hidePrompt();
      return;
    }
    const pr = btn.userData.prompt;

    // Qarash SHART bo'lsa — tekshiramiz
    if (pr.requireLook && !_isLookingAt(btn, playerPos)) { _hidePrompt(); return; }

    const el = _getPromptEl();
    if (!el) return;

    // Faqat kerak bo'lganда DOM yangilaymiz (har kadr emas)
    const keyTxt = _keyShort(btn.userData.actionKey || 'KeyE');

    if (pr.asHtml) {
      // ── HTML rejimi ──────────────────────────────────────────
      //  Foydalanuvchining XOM HTML'i. Hech qanday default stil YO'Q:
      //  na konteyner foni/ramkasi, na kalit qutisi. Foydalanuvchi
      //  o'zi bezaydi. `{key}` yozsa — o'sha joyga tugma harfi (STILSIZ)
      //  qo'yiladi; yozmasa — kalit umuman chiqmaydi.
      const raw = (pr.text && pr.text.length) ? pr.text : 'Bosing';
      const html = raw.split('{key}').join(_esc(keyTxt));   // hamma {key} → harf
      const sig = btn.userData.id + '|html|' + html + '|' + pr.position;
      if (el._sig !== sig) {
        el._sig = sig;
        el.innerHTML = html;
        el.className = 'pos-' + (_PROMPT_POS[pr.position] ? pr.position : 'bc') + ' ib-raw';
      }
      if (el.style.display !== 'block') el.style.display = 'block';
      _promptCurBtn = btn;
      return;
    }

    // ── Oddiy matn rejimi (default stil bilan) ──
    const bodyTxt = (pr.text && pr.text.trim())
      ? pr.text
      : (btn.userData.label && btn.userData.label.trim() ? btn.userData.label : 'Bosing');
    const sig = btn.userData.id + '|' + (pr.showKey ? keyTxt : '') + '|' + bodyTxt + '|' + pr.position;
    if (el._sig !== sig) {
      el._sig = sig;
      el.innerHTML = (pr.showKey ? `<span class="ib-key">${_esc(keyTxt)}</span>` : '') + _esc(bodyTxt);
      el.className = 'pos-' + (_PROMPT_POS[pr.position] ? pr.position : 'bc');
    }
    if (el.style.display !== 'block') el.style.display = 'block';
    _promptCurBtn = btn;
  }

  const _PROMPT_POS = { tl:1, tc:1, tr:1, ml:1, mc:1, mr:1, bl:1, bc:1, br:1 };

  function _esc(s) {
    return (typeof escapeHtml === 'function') ? escapeHtml(s)
      : String(s == null ? '' : s).replace(/[<>&"']/g, c =>
          ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function _keyShort(code) {
    const map = {
      KeyE:'E', KeyF:'F', KeyR:'R', KeyG:'G', KeyQ:'Q', KeyH:'H',
      KeyT:'T', KeyY:'Y', KeyU:'U', Space:'SPC', Enter:'ENTER',
    };
    return map[code] || code.replace('Key', '').replace('Digit', '');
  }

  // ── Main update — har frame ──────────────────────────────────
  function update(delta) {
    // Har doim — attached tugmalarni parentga yopishtirib turish
    _syncAttachedButtons();

    const nowPlaying = typeof isPlaying !== 'undefined' && isPlaying;

    // Play → Stop o'tishini aniqlaymiz (hitboxdagi _onPlayStop kabi)
    if (!nowPlaying && _wasPlayingLastFrame) _resetCamAndTeleport();
    // Play boshlanганда — gaze holatini nolga qaytaramiz + ko'z ikonasini yashiramiz
    if (nowPlaying && !_wasPlayingLastFrame) {
      // 📐 ESKI SAHNALAR: `colliderSize` siz yaratilgan 🔘 tugmalar
      //    1×1×1 lik ko'rinmas quti bilan yurardi. ▶ Play boshida bir
      //    marta hisoblab qo'yamiz — arzon, va saqlanganda faylga ham
      //    tushadi (`colliderSize` — `_` siz maydon).
      let _fixed = 0;
      for (const o of objects) {
        if (o.userData && o.userData.isInteractiveBtn && _ensureColliderSize(o)) _fixed++;
      }
      if (_fixed) log(`📐 ${_fixed} ta tugmaning to'qnashuv qutisi o'z o'lchamiga keltirildi`, 'lok');
      for (const o of objects) {
        if (o.userData && o.userData.isGazeTrigger) {
          o.userData._gazeWasLooking = false;
          o.userData._gazeDone = false;
          o.userData._gazeReArmT = 0;
          o.userData._gazeTimerT = 0;      // ⏱ sanoq qoldig'i (0 = ishlamayapti)
          _setGazeIconVisible(o, !(o.userData.gaze && o.userData.gaze.hideInPlay));
        }
      }
      // 📦 Predmet slotlari — ketma-ketlik o'rni boshiga qaytadi, aks
      //    holda oldingi o'yindan qolgan `_irIdx` tufayli tugma yarim
      //    to'lgan holatdan boshlanardi.
      _irResetFlags();
    }
    // Stop bosilganда — ko'z ikonasini qaytaramiz (editorda ko'rinsin)
    if (!nowPlaying && _wasPlayingLastFrame) {
      for (const o of objects) {
        if (o.userData && o.userData.isGazeTrigger) {
          o.userData._gazeTimerT = 0;   // ⏱ yarim qolgan sanoqlarni bekor qilamiz
          _setGazeIconVisible(o, true);
        }
      }
      _hideGazeTimerHud();
    }
    _wasPlayingLastFrame = nowPlaying;

    if (!nowPlaying) {
      _closestBtn = null;
      _hidePrompt();
      // Play tugagan bo'lsa — ko'tarilganini qaytar, tashlanganlarni to'xtat, sound o'chir
      if (_carried) { _dropCarried(); }
      _thrownItems.length = 0;
      _stopAllSounds();
      // 📦 Predmet sharti bilan yo'q qilinganlarni qaytaramiz.
      //    ⚠ `visible` ni play-mode.js o'zi tiklaydi, lekin
      //      `colliderMode` — userData maydoni: uni tiklamasak predmet
      //      keyingi o'yinda ham arvoh bo'lib qolardi.
      _irRestoreConsumed();
      return;
    }

    // 🎥 Kamera animatsiyasi lerp'i — har kadr
    _updateCameraAnim(delta);

    // Mashina haydayotgan bo'lsa — tugmalar ishlamasin
    if (typeof activeCar !== 'undefined' && activeCar && window.carRole === 'driver') {
      _closestBtn = null; _hidePrompt(); return;
    }

    // Ko'tarilgan va tashlangan predmetlarni yangilash
    _updateCarried(delta);
    _updateThrown(delta);

    const pos = _getInteractorPos();
    if (!pos) { _closestBtn = null; return; }

    // Barcha tugmalar orasidan eng yaqinini top (world position bo'yicha)
    const keySet = new Set();
    let closest = null;
    let closestDist = Infinity;
    const _tmpW = new THREE.Vector3();

    for (let i = 0, len = objects.length; i < len; i++) {
      const o = objects[i];
      if (!o.userData || !o.userData.isInteractiveBtn || o.userData._mlOff) continue;
      // 👁 Qarash bloki — bosish bilan emas, QARASH bilan ishlaydi.
      //   Bu loop (masofa+bosish) uni o'tkazib yuboradi; _updateGazeTriggers
      //   alohida hal qiladi.
      if (o.userData.isGazeTrigger) continue;
      // ⚠ Map Loader eski kartani yashirganда — bu obyekt endi "yo'q".
      //   Bayroqsiz u ko'rinmasa ham tetiklashda davom etardi.
      if (o.userData._mlHidden) continue;
      // 📦 Predmet sifatida BERILGAN tugma — endi u \"yo'q\".
      //   ⚠ Tugmaning o'zi ham predmet bo'la oladi (PICKUP rejimida
      //     `pickupTargetId` bo'sh qolsa tugma ko'tariladi). U slotga
      //     berilgach ko'rinmas bo'ladi, lekin bu ro'yxat `visible` ni
      //     tekshirmaydi — bayroqsiz ko'rinmas tugma bosilaverardi.
      if (o.userData._ibtnConsumed) continue;
      // 📦 🎯 HITBOX ning \"predmet sharti\" YO'Q QILGAN predmeti.
      //   ⚠ ALOMAT: hitbox predmetni \"yo'qolsin\" bilan yutadi, lekin
      //     o'yinchi uni baribir ko'tara oladi — ko'rinmas holida.
      //     Ko'targach `_carryColliderBack` va `releaseCarried` uni
      //     qaytaradi: predmet yana paydo bo'ladi, inventarga tushadi,
      //     hitbox esa `_irDone` tufayli qayta ishlamaydi.
      //     Foydalanuvchi shuni ko'radi: \"hitbox oldi, lekin tugma
      //     o'yinchi uchun bor\".
      //
      //   ⚠ NEGA `visible` NING O'ZI YETMAYDI: Three.js nuri
      //     ko'rinmas obyektni ham uradi — `intersectObject` faqat
      //     `layers` ni tekshiradi, `visible` ni EMAS. Ya'ni predmetni
      //     yashirish uni \"olib bo'lmaydigan\" qilmaydi.
      //
      //   Bayroq `hitbox.js` dagi `_irConsume()` da qo'yiladi va
      //   `_irRestoreConsumed()` da (Stop bosilganda) olinadi.
      if (o.userData._hbConsumed) continue;
      // ⚠ QO'LDAGI predmetning O'ZI tugma bo'lishi mumkin (PICKUP
      //   rejimida `pickupTargetId` bo'sh qolsa tugma ko'tariladi).
      //   U kameraga yopishgani uchun DOIM eng yaqin bo'lib qoladi va
      //   qabul qiluvchi tugmani bosib qo'yardi: E bosilsa qo'ldagi
      //   tugma "eng yaqin" deb tanlanardi, u esa predmet qabul
      //   qilmagani uchun `_irAccepts` false → predmet TASHLANARDI.
      //   Alomat: "tugmani olib tugmaga bossa ishlamayapti".
      if (_carried && _carried.target === o) continue;
      keySet.add(o.userData.actionKey || 'KeyE');
      o.getWorldPosition(_tmpW);
      const dist = _tmpW.distanceTo(pos);
      const maxDist = o.userData.interactDist || 3;
      if (dist > maxDist) continue;
      if (dist < closestDist) { closestDist = dist; closest = o; }
    }

    // Hozirgi kalit holatlarini yig'ib olamiz
    const cur = {};
    keySet.forEach(k => {
      cur[k] = !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[k]);
    });

    _closestBtn = closest;

    // ── 🔤 Yaqinlashuv yozuvi (prompt) ──────────────────────────
    //  closest — masofa ichidagi eng yaqin tugma. Prompt yoqilgan
    //  bo'lsa va (kerak bo'lsa) o'yinchi unga qarab tursa — ko'rsatamiz.
    //  ⚠ Predmet ko'tarib turganда prompt kerak emas — pastda _carried
    //    bloki uni yashiradi, lekin bu yerда umuman chaqirmasak, bir
    //    kadr miltillash ham bo'lmaydi.
    if (!_carried) _updatePrompt(closest, pos);

    // Ko'tarilgan holatda — istalgan E bosilishi bilan avval tashla
    if (_carried) {
      // ── 📦 QABUL QILUVCHI TUGMA — tashlashdan USTUN ────────────
      //  ⚠ BU YERDA JIDDIY XATO BOR EDI. Ilgari bu blok shartsiz
      //    `_throwCarried()` chaqirib `return` qilardi: predmet ko'tarib
      //    turganda E bosilsa DOIM tashlanardi va boshqa hech qaysi
      //    tugmagacha yetib borilmasdi. Ya'ni "predmet sharti"
      //    xususiyati mutlaqo ishlamasdi — `_fireButton` umuman
      //    chaqirilmagani uchun undagi darvoza ham otilmasdi.
      //
      //    Foydalanuvchi ko'rgan alomat aynan shu edi: predmet bilan
      //    borib bosasan — predmet olinmaydi, animatsiya ham yo'q,
      //    faqat predmet tashlanadi.
      //
      //  Endi: yaqinda predmetni KUTAYOTGAN tugma bo'lsa — o'sha
      //  otiladi. Bo'lmasa — eskicha tashlanadi.
      // ⚠ Qabul qiluvchini `closest` ga BOG'LAMAYMIZ. Eng yaqin tugma
      //   qabul qilmaydigan boshqa tugma bo'lishi mumkin (masalan
      //   predmetni bergan PICKUP tugmasi yonida turibsiz) — u holda
      //   predmet noo'rin tashlanardi. Masofa ichidagi tugmalar orasidan
      //   ANIQ QABUL QILADIGANINI, eng yaqinini qidiramiz.
      let receiver = null, recDist = Infinity;
      for (const o of objects) {
        const oud = o.userData;
        if (!oud || !oud.isInteractiveBtn || oud._mlHidden || oud._ibtnConsumed) continue;
        if (_carried.target === o) continue;
        if (!_irAccepts(o)) continue;
        o.getWorldPosition(_tmpW);
        const d = _tmpW.distanceTo(pos);
        if (d > (oud.interactDist || 3)) continue;
        if (d < recDist) { recDist = d; receiver = o; }
      }

      if (receiver) {
        // Prompt qabul qiluvchi tugmaniki bo'lsin — o'yinchi "berish"
        // mumkinligini ko'rsin (ilgari ko'targanda prompt umuman yopiq edi)
        _updatePrompt(receiver, pos);
        const rKey  = receiver.userData.actionKey || 'KeyE';
        const rDown = !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[rKey]);
        if (rDown && !_prevKey[rKey]) _fireButton(receiver);
        keySet.forEach(k => { _prevKey[k] = cur[k]; });
        _prevKey[rKey] = rDown;
        return;
      }

      _hidePrompt();   // predmet ko'tarib turganда prompt kerak emas
      // Ko'tarilgan tugmani top va uning kalitiga qara
      const carriedBtn = objects.find(o => o.userData?.id === _carried.btnId);
      const key = carriedBtn?.userData?.actionKey || 'KeyE';
      const isDown = !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[key]);
      if (isDown && !_prevKey[key]) {
        _throwCarried(carriedBtn);
      }
      _prevKey[key] = isDown;
      // Boshqa tugmalar kalitlarini ham yangilash (rising edge holati toza qolsin)
      keySet.forEach(k => { _prevKey[k] = cur[k]; });
      return;
    }

    // Eng yaqin tugmani tetiklaymiz
    if (closest) {
      const key = closest.userData.actionKey || 'KeyE';
      if (cur[key] && !_prevKey[key]) {
        _fireButton(closest);
      }
    }

    keySet.forEach(k => { _prevKey[k] = cur[k]; });

    // 👁 Qarash bloklarini tekshiramiz
    _updateGazeTriggers(pos, delta);
  }

  // 👁 Ko'z ikonasi ko'rinishini boshqarish (funksiyaga tegmaydi)
  //  ⚠ Faqat BOLA mesh'larni (ko'rinadigan qismlar) yashiramiz, Group'ning
  //    O'ZINI emas — `_updateGazeTriggers` blok pozitsiyasini o'qishда davom
  //    etsin. Ya'ni ikona yo'qoladi, tetik ishlaydi.
  function _setGazeIconVisible(gazeObj, vis) {
    if (!gazeObj) return;
    for (const c of gazeObj.children) {
      if (c.userData && c.userData._gazePart) c.visible = vis;
    }
  }

  // ── 👁 Qarash bloklari — har frame ──────────────────────────
  const _gazeTmp = new THREE.Vector3();
  const _gazeDir = new THREE.Vector3();
  const _gazeToB = new THREE.Vector3();
  const _gazeOrigin = new THREE.Vector3();

  // O'yinchi qarash yo'nalishini (origin + dir) beradi — 1/3-shaxs bir xil
  function _playerGaze() {
    const pc = window.PlayerController;
    const cam = (typeof camera !== 'undefined') ? camera : null;
    if (!cam) return null;
    if (pc && pc.obj && pc.camMode === 'third') {
      const yaw = pc.camYaw || 0, pitch = pc.camPitch || 0;
      _gazeDir.set(-Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch)).normalize();
      const eyeH = 1.5 * ((pc.obj.scale && pc.obj.scale.y) || 1);
      _gazeOrigin.copy(pc.obj.position); _gazeOrigin.y += eyeH;
    } else {
      cam.getWorldPosition(_gazeOrigin);
      cam.getWorldDirection(_gazeDir);
    }
    return true;
  }

  function _updateGazeTriggers(playerPos, delta) {
    // ⏱ HUD yig'gichi — har frame noldan. -1 = ko'rsatiladigan sanoq yo'q.
    _gazeHudT = -1; _gazeHudLabel = '';
    if (!_playerGaze()) { _hideGazeTimerHud(); return; }
    const pc = window.PlayerController;
    const playerObj = pc && pc.obj;

    for (let i = 0, len = objects.length; i < len; i++) {
      const o = objects[i];
      const ud = o.userData;
      if (!ud || !ud.isGazeTrigger) continue;
      if (ud._mlHidden) continue;             // Map Loader yashirgan
      const gz = ud.gaze || {};

      // Masofa
      o.getWorldPosition(_gazeTmp);
      const dist = _gazeTmp.distanceTo(_gazeOrigin);
      const maxD = gz.dist || 15;

      // Qarayaptimi? — konus + (ixtiyoriy) to'siq tekshiruvi
      let looking = false;
      if (dist <= maxD) {
        _gazeToB.copy(_gazeTmp).sub(_gazeOrigin);
        const d = _gazeToB.length();
        if (d < 0.001) looking = true;
        else {
          _gazeToB.divideScalar(d);
          const cosHalf = Math.cos((gz.cone || 30) * Math.PI / 180);
          if (_gazeDir.dot(_gazeToB) >= cosHalf) {
            looking = gz.requireLos === false ? true : !_gazeBlocked(o, playerObj);
          }
        }
      }

      // Rearm taymerini yangilaymiz
      if (ud._gazeReArmT > 0) ud._gazeReArmT = Math.max(0, ud._gazeReArmT - delta);

      // ── ⏱ ISHLAB TURGAN SANOQ ──────────────────────────────
      //  Tetik bosilгanда darhol otilmaydi — `delay` sekund sanaladi.
      //  `_gazeTimerWant` — sanoq BOSHLANGANDAGI qarash holati.
      //  holdGaze yoqиq bo'lsa, holat o'zgarsa (qarashdan voz kechsa,
      //  yoki 'away' tetigida qaytib qarasa) sanoq BEKOR bo'ladi.
      if (ud._gazeTimerT > 0) {
        if (gz.holdGaze && looking !== ud._gazeTimerWant) {
          ud._gazeTimerT = 0;                // ✕ uzildi — bekor
        } else {
          ud._gazeTimerT -= delta;
          if (ud._gazeTimerT <= 0) {
            ud._gazeTimerT = 0;
            _fireButton(o);                  // ♻️ tugmaning chiqish tizimi
            ud._gazeDone   = true;
            ud._gazeReArmT = gz.reArm || 0;
          } else if (gz.showTimer !== false) {
            // Ekranda eng yaqin tugaydigan sanoq ko'rsatiladi
            if (_gazeHudT < 0 || ud._gazeTimerT < _gazeHudT) {
              _gazeHudT     = ud._gazeTimerT;
              _gazeHudLabel = ud.label || ud.name || '';
              _gazeHudPos   = gz.timerPos || 'tc';
            }
          }
        }
      }

      const was = !!ud._gazeWasLooking;
      const trig = gz.trigger || 'look';
      let fire = false;
      // 'look' → false→true chetida; 'away' → true→false chetida; 'both' → har ikkisi
      if (looking && !was && (trig === 'look' || trig === 'both')) fire = true;
      if (!looking && was && (trig === 'away' || trig === 'both')) fire = true;

      if (fire) {
        const delay = Math.max(0, +gz.delay || 0);
        if (ud._gazeDone && gz.once) {
          // bir marta ishlagan — o'tkazamiz
        } else if (ud._gazeReArmT > 0) {
          // hali qayta tayyor emas — o'tkazamiz
        } else if (ud._gazeTimerT > 0) {
          // ⏱ sanoq ALLAQACHON ketyapti — qayta boshlamaymiz.
          //   Aks holda 'both' rejimida yoki chetlar tez almashsa
          //   taymer cheksiz qayta tiklanib, hech qachon tugamasdi.
        } else if (delay > 0) {
          ud._gazeTimerT    = delay;         // ⏱ sanoqni boshlaymiz
          ud._gazeTimerWant = looking;       // holdGaze uchun mos holat
        } else {
          _fireButton(o);                    // kechikish yo'q — darhol
          ud._gazeDone   = true;
          ud._gazeReArmT = gz.reArm || 0;
        }
      }
      ud._gazeWasLooking = looking;
    }

    // ── ⏱ Ekrandagi sanoq ko'rsatkichi ───────────────────────
    if (_gazeHudT >= 0) _showGazeTimerHud(_gazeHudT, _gazeHudLabel, _gazeHudPos);
    else                _hideGazeTimerHud();
  }

  // ⏱ Ruxsat etilgan joylashuvlar — index.html dagi `#gaze-timer-hud.pos-*`
  //   CSS klasslariga mos. Ro'yxatda yo'q qiymat 'tc' ga tushadi.
  const _GAZE_POS = new Set(['tl','tc','tr','ml','mc','mr','bl','bc','br']);

  // ── ⏱ Sanoq HUD — bitta DOM element, qayta ishlatiladi ─────
  //  Har frame `_updateGazeTriggers` boshida nolga tushadi, sikl ichida
  //  eng kam qolgan vaqt yig'iladi, sikl oxirida bir marta chiziladi.
  //  ⚠ Element `#cvp` (viewport) ICHIDA — `position:absolute` + ota
  //    `overflow:hidden`. Ya'ni qaysi burchakni tanlasangiz ham sanoq
  //    3D oynadan tashqariga chiqmaydi va editor panellarini bosmaydi.
  let _gazeHudT = -1, _gazeHudLabel = '', _gazeHudPos = 'tc';
  let _gazeHudEl = null;

  function _getGazeHudEl() {
    if (!_gazeHudEl) _gazeHudEl = document.getElementById('gaze-timer-hud');
    return _gazeHudEl;
  }

  function _showGazeTimerHud(t, label, pos) {
    const el = _getGazeHudEl();
    if (!el) return;
    const p = _GAZE_POS.has(pos) ? pos : 'tc';
    if (el._pos !== p) { el.className = 'pos-' + p; el._pos = p; }
    el.style.display = 'block';
    el.innerHTML =
      (label ? `<div class="gt-lbl">${escapeHtml(String(label))}</div>` : '') +
      `<div class="gt-num">${t.toFixed(1)}<span class="gt-u">s</span></div>`;
  }

  function _hideGazeTimerHud() {
    const el = _getGazeHudEl();
    if (el && el.style.display !== 'none') el.style.display = 'none';
  }

  // Qarash yo'lida to'siq (o'yinchi/gaze bloki emas) bormi?
  function _gazeBlocked(gazeObj, playerObj) {
    _rayLook.set(_gazeOrigin, _gazeToB);
    _rayLook.far = _gazeTmp.distanceTo(_gazeOrigin) + 0.1;
    const hits = _rayLook.intersectObjects(objects, true);
    for (const h of hits) {
      let n = h.object, isSelf = false, isPlayer = false;
      for (let d = 0; d < 8 && n; d++) {
        if (n === gazeObj) { isSelf = true; break; }
        if (n === playerObj || n.userData?.isPlayerObj || n.userData?.isPlayer) { isPlayer = true; break; }
        n = n.parent;
      }
      if (isSelf) return false;              // gaze blokiga yetdi — to'siq yo'q
      if (isPlayer) continue;
      if (!h.object.visible) continue;
      if (h.object.userData?._gazePart || h.object.userData?._pcCamPart) continue;
      return true;                           // boshqa narsa to'sib qo'ydi
    }
    return false;
  }

  // ── Drop carried — play stop yoki majburiy tushirish ────────
  function _dropCarried() {
    if (!_carried) return;
    const target = _carried.target;
    const P = _tpBody();
    const wpos = new THREE.Vector3();
    target.getWorldPosition(wpos);
    try { scene.attach(target); } catch(e) {}
    target.position.copy(wpos);
    _carryColliderBack(target);        // 👻 qo'ldan chiqdi
    resumePhysics(target);             // ⚖️ tanasi ham qaytsin
    _applyWorldYaw(target, P ? (P.camYaw || 0) : _viewYaw(), _carried.relQ);
    _carried = null;
  }

  // ============================================================
  // 🎥 KAMERA ANIMATSIYASI + 🌀 TELEPORT
  // ------------------------------------------------------------
  // Hitbox (scripts/systems/hitbox.js) dan 1ga1 ko'chirilgan va
  // tugmaga moslashtirilgan. Hitboxda `hb` bo'lgan joyda bu yerda
  // `btn` turadi; qolgan mantiq aynan o'sha.
  //
  // Farqlar (faqat moslashtirish uchun zarur bo'lganlari):
  //   • overlay DOM id:  'hb-fade-overlay' → 'ibtn-fade-overlay'
  //     (hitbox bilan bir vaqtda ishlasa bir-birini o'chirmasin)
  //   • log matnlari:    "Hitbox:" → "Tugma:"
  //   • cfg manzili:     hb.userData.actions.X → btn.userData.X
  // ============================================================

  // Play → Stop o'tishini aniqlash uchun latch
  let _wasPlayingLastFrame = false;

  // Klaviatura kodini o'qiladigan yorliqqa aylantirish.
  // Hitbox ham shu global'ni e'lon qiladi — qaysi fayl oldin yuklansa ham
  // bir xil natija beradi, shuning uchun faqat yo'q bo'lsa o'rnatamiz.
  if (typeof window._friendlyKey !== 'function') {
    window._friendlyKey = function(code) {
      if (!code) return '⌨ tugma';
      if (code.indexOf('Key') === 0)   return code.slice(3);
      if (code.indexOf('Digit') === 0) return code.slice(5);
      if (code === 'Space')            return 'Space';
      const arrows = { ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→' };
      return arrows[code] || code;
    };
  }

  // ── Camera animation state ───────────────────────────────────
  const _camAnim = {
    active: false, t: 0, dur: 1,
    fromPos: null, fromRot: null,
    toPos: null,   toRot: null,
    // Restore state so we don't strand the user in cinematic mode
    prevMode: null,
    // Post-transition follow-up (continuePath)
    targetCam:    null,
    continuePath: false,
    direction:    'forward',
    reverseSpeed: 1.0,
  };

  // ── Player lock ──────────────────────────────────────────────
  // Two totally separate input pipelines to defeat:
  //   1) PlayerController (custom player: obj marked isPlayerObj)
  //   2) Built-in FPS camera (camera-modes.js — the DEFAULT case)
  //      Anonymous document listeners can't be removed, so we
  //      monkey-patch `updateFPS(delta)` into a no-op while locked.
  const _playerLock = {
    active:            false,
    detached:          false,
    _origUpdateFPS:    null,   // captures original updateFPS (camera-modes.js)
    _origUpdatePlayer: null,   // captures original updatePlayer (player.js)
  };

  function _installFPSWrapper() {
    if (typeof window.updateFPS === 'function' && !_playerLock._origUpdateFPS) {
      _playerLock._origUpdateFPS = window.updateFPS;
      window.updateFPS = function(delta) {
        if (_playerLock.active) return;   // frozen — skip camera movement
        return _playerLock._origUpdateFPS(delta);
      };
    }
    if (typeof window.updatePlayer === 'function' && !_playerLock._origUpdatePlayer) {
      _playerLock._origUpdatePlayer = window.updatePlayer;
      window.updatePlayer = function(delta) {
        if (_playerLock.active) {
          if (typeof playerVel !== 'undefined' && playerVel && playerVel.set) {
            playerVel.set(0, 0, 0);
          }
          return;
        }
        return _playerLock._origUpdatePlayer(delta);
      };
    }
  }

  // ── BULLETPROOF INPUT BLOCKER ────────────────────────────────
  // Window-level capture-phase listeners installed at module load.
  // Capture goes window → document → target, so these run BEFORE
  // camera-modes.js / player.js / keybindings.js listeners.
  const _blockIfLocked = (e) => {
    if (!_playerLock.active) return;
    if (e.type === 'keydown' || e.type === 'keyup') {
      // Bloklangan animatsiyani ochish uchun tugma — input bloklangan bo'lsa ham ishlasin.
      if (e.type === 'keydown' && typeof window._resumeBlockedAnim === 'function') {
        window._resumeBlockedAnim('key:' + e.code);
        window._resumeBlockedAnim('');
      }
      if (['Escape', 'F5', 'F11', 'F12'].includes(e.code)) return;
    }
    // Absolute/Lock kamera faol bo'lsa — cutscene paytida ham o'yinchi erkin
    // qaray olishi uchun sichqoncha offsetini shu yerda hisoblaymiz.
    if (e.type === 'mousemove' && typeof objects !== 'undefined') {
      const acam = objects.find(o => o.userData && o.userData.isCamera && o.userData._isActive &&
        (o.userData.camViewMode === 'absolute' || o.userData.camViewMode === 'lookat'));
      if (acam) {
        const sens = (typeof camSensitivity !== 'undefined') ? camSensitivity : 0.0025;
        window._absYawOff   = (window._absYawOff || 0) - (e.movementX || 0) * sens;
        window._absPitchOff = Math.max(-1.4, Math.min(1.4, (window._absPitchOff || 0) - (e.movementY || 0) * sens));
      }
    }
    e.stopImmediatePropagation();
    e.stopPropagation();
    if (e.type !== 'mousemove') e.preventDefault();
  };
  (function _installWindowBlocker() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown',   _blockIfLocked, { capture: true });
    window.addEventListener('keyup',     _blockIfLocked, { capture: true });
    window.addEventListener('keypress',  _blockIfLocked, { capture: true });
    window.addEventListener('mousemove', _blockIfLocked, { capture: true });
    window.addEventListener('mousedown', _blockIfLocked, { capture: true });
    window.addEventListener('mouseup',   _blockIfLocked, { capture: true });
    window.addEventListener('wheel',     _blockIfLocked, { capture: true, passive: false });
  })();

  function _clearAllKeyStates() {
    // Built-in FPS keys
    if (typeof fpsKeys !== 'undefined' && fpsKeys) {
      Object.keys(fpsKeys).forEach(k => { fpsKeys[k] = false; });
    }
    if (typeof window.fpsKeys !== 'undefined' && window.fpsKeys) {
      Object.keys(window.fpsKeys).forEach(k => { window.fpsKeys[k] = false; });
    }
    // PlayerController keys
    if (typeof PlayerController !== 'undefined' && PlayerController.keys) {
      PlayerController.keys = {};
    }
    // Car inputs
    if (typeof activeCar !== 'undefined' && activeCar && activeCar.userData && activeCar.userData.input) {
      const c = activeCar.userData.input;
      c.gas = c.brake = c.steer = 0;
      c.handbrake = false;
    }
    // Tugmaning o'z rising-edge holatini ham tozalaymiz — lock ochilgach
    // ushlab turilgan E darrov qayta tetiklamasin.
    Object.keys(_prevKey).forEach(k => { _prevKey[k] = false; });
  }

  function _engagePlayerLock() {
    if (_playerLock.active) return;
    _playerLock.active = true;

    _installFPSWrapper();
    _clearAllKeyStates();

    if (typeof PlayerController !== 'undefined' && PlayerController.vel) {
      PlayerController.vel.set(0, 0, 0);
    }

    // PlayerController path — detach its own listeners for defense in depth.
    if (typeof PlayerController !== 'undefined' && PlayerController.obj) {
      const pc = PlayerController;
      try {
        if (pc._onKey)       document.removeEventListener('keydown',   pc._onKey,       { capture: true });
        if (pc._offKey)      document.removeEventListener('keyup',     pc._offKey,      { capture: true });
        if (pc._onMouse)     document.removeEventListener('mousemove', pc._onMouse);
        if (pc._onMouseDown) document.removeEventListener('mousedown', pc._onMouseDown);
        if (pc._onMouseUp)   document.removeEventListener('mouseup',   pc._onMouseUp);
        _playerLock.detached = true;
      } catch(e) {}
    }

    log("🔒 O'yinchi bloklandi (tugma cutscene)", 'lw');
  }

  function _releasePlayerLock() {
    if (!_playerLock.active) return;
    _playerLock.active = false;

    if (_playerLock.detached && typeof PlayerController !== 'undefined') {
      const pc = PlayerController;
      try {
        if (pc._onKey)       document.addEventListener('keydown',   pc._onKey,       { capture: true });
        if (pc._offKey)      document.addEventListener('keyup',     pc._offKey,      { capture: true });
        if (pc._onMouse)     document.addEventListener('mousemove', pc._onMouse);
        if (pc._onMouseDown) document.addEventListener('mousedown', pc._onMouseDown);
        if (pc._onMouseUp)   document.addEventListener('mouseup',   pc._onMouseUp);
      } catch(e) {}
      _playerLock.detached = false;
    }

    _clearAllKeyStates();

    log("🔓 O'yinchi qayta faollashtirildi", 'lok');
  }

  // ── 🎥 Kamera animatsiyasini boshlash ────────────────────────
  //    cfg          = btn.userData.cameraAnim
  //    direction    = 'forward' | 'reverse'
  //    reverseSpeed = teskari yo'nalish tezligi
  //    btn          = tugma mesh (hitboxdagi `hb` o'rnida)
  function _startCameraAnim(cfg, direction, reverseSpeed, btn) {
    if (typeof camera === 'undefined') return;
    const targetId = cfg.cameraId;
    if (!targetId) {
      log("⚠ Tugma: kamera obyekti tanlanmagan", 'lw');
      return;
    }
    const tgt = objects.find(o => String(o.userData && o.userData.id) === String(targetId));
    if (!tgt) {
      log("⚠ Tugma: kamera obyekti topilmadi", 'lw');
      return;
    }

    // Animatsiyadan oldingi ("origin") kamera holatini tugmaning o'zida
    // eslab qolamiz — reverse yo'nalish shu yerga qaytadi. Runtime-only.
    if (btn && btn.userData && !btn.userData._camOrigin) {
      btn.userData._camOrigin = {
        pos: camera.position.clone(),
        rot: new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z, 'YXZ'),
      };
    }
    const origin = btn && btn.userData && btn.userData._camOrigin;
    const isReverse = direction === 'reverse';

    // Effective duration: reverseSpeed scales the reverse-direction duration
    const baseDur = Math.max(0.05, cfg.duration || 1.5);
    const dur     = isReverse ? (baseDur / Math.max(0.05, reverseSpeed || 1.0)) : baseDur;

    _camAnim.active   = true;
    _camAnim.t        = 0;
    _camAnim.dur      = dur;
    _camAnim.fromPos  = camera.position.clone();
    _camAnim.fromRot  = new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z, 'YXZ');
    if (isReverse && origin) {
      _camAnim.toPos = origin.pos.clone();
      _camAnim.toRot = origin.rot.clone();
    } else {
      _camAnim.toPos = tgt.position.clone();
      _camAnim.toRot = new THREE.Euler(tgt.rotation.x, tgt.rotation.y, tgt.rotation.z, 'YXZ');
    }
    // Post-transition state — used when the lerp completes
    _camAnim.targetCam      = tgt;
    _camAnim.continuePath   = cfg.continuePath !== false;   // default TRUE
    _camAnim.returnToPlayer = cfg.returnToPlayer !== false;  // default TRUE
    _camAnim.blocks         = Array.isArray(cfg.blocks) ? cfg.blocks : [];
    _camAnim.direction      = isReverse ? 'reverse' : 'forward';
    _camAnim.reverseSpeed   = reverseSpeed || 1.0;

    // Player lock — engage if EITHER lock OR hide is requested. A hidden
    // player that can still walk around is always a bug.
    const shouldLock = (cfg.lockPlayer !== false) || !!cfg.hidePlayer;
    if (shouldLock) _engagePlayerLock();

    // Hide player mesh(es) during the cinematic if requested.
    _camAnim._hiddenMeshes = null;
    if (cfg.hidePlayer) {
      _camAnim._hiddenMeshes = [];
      if (typeof playerMesh !== 'undefined' && playerMesh) {
        _camAnim._hiddenMeshes.push({ mesh: playerMesh, wasVisible: playerMesh.visible });
        playerMesh.visible = false;
      }
      if (typeof PlayerController !== 'undefined' && PlayerController.obj &&
          PlayerController.obj !== playerMesh) {
        _camAnim._hiddenMeshes.push({
          mesh: PlayerController.obj,
          wasVisible: PlayerController.obj.visible,
        });
        PlayerController.obj.visible = false;
      }
    }

    // Persistent "hide camera mesh" flag
    if (cfg.hideCameraAlways) {
      tgt.userData._alwaysHidden = true;
      tgt.visible = false;
    }

    // Temporarily switch camera mode so player/orbit doesn't override
    if (typeof camMode !== 'undefined') {
      _camAnim.prevMode = camMode;
    }
    if (typeof setCamMode === 'function') {
      try { setCamMode('orbit'); } catch(e) {}
    }

    // ── Instant snap ─────────────────────────────────────────
    if (cfg.transitionMode === 'instant') {
      camera.position.copy(_camAnim.toPos);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(_camAnim.toRot.x, _camAnim.toRot.y, _camAnim.toRot.z);
      _camAnim.active = false;
      window._ibtnCamBusy = false;
      _camAnim.fromPos = _camAnim.fromRot = _camAnim.toPos = _camAnim.toRot = null;
      log(`🎬 Tugma: kamera darrov (${isReverse ? 'teskariga' : 'oldinga'})`, 'lok');
      _onCameraTransitionDone();
      return;
    }

    log(`🎬 Tugma: kamera ${isReverse ? 'teskariga' : 'oldinga'} (${dur.toFixed(2)}s)`, 'lok');
  }

  function _updateCameraAnim(delta) {
    // ⚠ Cutscene kamerani EGALLAB oldi — mashina kamerasi (car.js)
    //   chetga chiqsin. Bayroqsiz u har kadr kamerani mashinaga
    //   qaytarib, cutscene'ni bosib ketardi.
    window._ibtnCamBusy = _camAnim.active;
    if (!_camAnim.active) return;
    _camAnim.t += delta;
    const a = Math.min(1, _camAnim.t / _camAnim.dur);
    // Smoothstep easing
    const e = a * a * (3 - 2 * a);

    camera.position.lerpVectors(_camAnim.fromPos, _camAnim.toPos, e);
    camera.rotation.order = 'YXZ';

    const lerpA = (x, y, f) => x + (y - x) * f;
    camera.rotation.set(
      lerpA(_camAnim.fromRot.x, _camAnim.toRot.x, e),
      lerpA(_camAnim.fromRot.y, _camAnim.toRot.y, e),
      lerpA(_camAnim.fromRot.z, _camAnim.toRot.z, e)
    );

    if (a >= 1) {
      _camAnim.active = false;
      window._ibtnCamBusy = false;   // lerp tugadi — endi faol kamera obyekti egalik qiladi
      _camAnim.fromPos = _camAnim.fromRot = _camAnim.toPos = _camAnim.toRot = null;
      _onCameraTransitionDone();
    }
  }

  // ── O'tish tugagach: nishon kamerani faollashtirib Timeline'ni
  //    ishga tushiramiz. Main-loop quyidagini bajaradi:
  //       if (ud.isCamera && ud._isActive && !_camPathPlaying)
  //           camera.position.copy(o.position); …
  //    → nishon kamera _isActive bo'lgach asosiy kamera uni kuzatadi.
  function _onCameraTransitionDone() {
    const tgt          = _camAnim.targetCam;
    const cont         = _camAnim.continuePath;
    const returnToPl   = _camAnim.returnToPlayer;
    const dir          = _camAnim.direction;
    const revSpeed     = _camAnim.reverseSpeed;
    const blocks       = _camAnim.blocks || [];
    _camAnim.targetCam = null;

    if (!tgt) return;

    const finishAndReturn = () => {
      if (returnToPl) _returnCameraToPlayer(tgt);
    };

    if (!cont) {
      // No continuePath — nothing more to play. Return to player now.
      finishAndReturn();
      return;
    }

    // Deactivate any other active cameras first
    objects.forEach(o => {
      if (o.userData && o.userData.isCamera && o !== tgt) {
        o.userData._isActive = false;
      }
    });

    tgt.userData._isActive = true;
    tgt.visible = false;

    // Absolute/Lock kamera bo'lsa — o'yinchi erkin qaray olishi uchun
    // erkin-qarash offsetini nolga tashlab, pointer lock so'raymiz.
    if (tgt.userData.camViewMode === 'absolute' || tgt.userData.camViewMode === 'lookat') {
      if (window._resetAbsCamLook) window._resetAbsCamLook();
      const _cv = document.getElementById('three-canvas');
      if (_cv && !document.pointerLockElement && !window._pcCursorFree) { try { _cv.requestPointerLock(); } catch (e) {} }
    }

    const hasTimeline = typeof TimelineExportSystem !== 'undefined' &&
                        TimelineExportSystem.playTimeline &&
                        typeof TimelineSystem !== 'undefined' &&
                        TimelineSystem.tracks && TimelineSystem.tracks.length > 0;

    if (hasTimeline) {
      const speed = (dir === 'reverse') ? (revSpeed || 1.0) : 1.0;
      TimelineExportSystem.playTimeline({
        direction: dir,
        speed,
        blocks,
        onDone: () => { finishAndReturn(); },
      });
    } else {
      // No Timeline to play — the transition WAS the whole animation.
      if (returnToPl) {
        setTimeout(() => {
          if (typeof isPlaying !== 'undefined' && isPlaying) finishAndReturn();
        }, 100);
      }
    }
  }

  // ── Nishon kamerani o'chirib, boshqaruvni o'yinchiga qaytarish ──
  //    Foydalanuvchi tanlamagan rejimga hech qachon majburlamaydi.
  function _returnCameraToPlayer(tgt) {
    objects.forEach(o => {
      if (o.userData && o.userData.isCamera) {
        o.userData._isActive = false;
        o.visible = !o.userData._alwaysHidden;
        if (o.material && o.material.emissive && o.material.emissive.setScalar) {
          o.material.emissive.setScalar(0.05);
        }
      }
    });

    if (typeof TimelineExportSystem !== 'undefined' && TimelineExportSystem.stopTimeline) {
      try { TimelineExportSystem.stopTimeline(); } catch(e) {}
    }
    if (typeof tlStop === 'function') { try { tlStop(); } catch(e) {} }

    // Animatsiya boshlanishidagi rejimni tiklaymiz. FPS ga MAJBURLAMAYMIZ.
    const restoreMode = _camAnim.prevMode;   // _startCameraAnim da olingan
    if (restoreMode && typeof setCamMode === 'function') {
      try { setCamMode(restoreMode); } catch(e) {}
    }

    if (restoreMode === 'fps') {
      const cv = document.getElementById('three-canvas') ||
                 (typeof canvas !== 'undefined' ? canvas : null);
      if (cv && cv.requestPointerLock) {
        setTimeout(() => { if (window._pcCursorFree) return; try { cv.requestPointerLock(); } catch(e) {} }, 60);
      }
    }

    _releasePlayerLock();

    if (Array.isArray(_camAnim._hiddenMeshes)) {
      _camAnim._hiddenMeshes.forEach(({ mesh, wasVisible }) => {
        if (mesh) mesh.visible = wasVisible;
      });
      _camAnim._hiddenMeshes = null;
    }

    _camAnim.prevMode = null;
    log(`🎮 Tugma: kamera boshqaruvi qaytarildi (${restoreMode || 'orbit'})`, 'lok');
  }

  // ── 🌀 Obyektni spawn nuqtaga jo'natish ──────────────────────
  //   direction === 'reverse': teleport o'rniga oldingi pozitsiyani tiklaydi.
  //   Oldingi pozitsiyalar tugmaning o'zida (per-entity) saqlanadi.
  //   cfg.preAnimEnabled bo'lsa: oldin animatsiya, o'rtasida teleport.
  function _teleport(entityMesh, spawnId, direction, btn, cfg) {
    if (!entityMesh) return;

    const doInstant = () => _teleportInstant(entityMesh, spawnId, direction, btn);

    // Pre-teleport animation — three flavours
    if (cfg && cfg.preAnimEnabled) {
      const type = cfg.preAnimType || 'fade';
      const dur  = Math.max(0.2, cfg.preAnimDuration || 1.0);

      const wantLock = cfg.lockPlayer !== false;
      if (wantLock) _engagePlayerLock();
      const finishAndRelease = () => {
        if (wantLock) _releasePlayerLock();
      };

      if (type === 'html') {
        _htmlTeleport(dur, cfg.preAnimHtml || '', () => {
          doInstant();
        }, finishAndRelease);
        return;
      }
      if (type === 'camera') {
        _cameraTeleport(dur, entityMesh, spawnId, direction, btn, cfg, finishAndRelease);
        return;
      }
      // Default: fade
      _fadeTeleport(dur, cfg.preAnimColor || '#000000', () => {
        doInstant();
      }, finishAndRelease);
      return;
    }

    doInstant();
  }

  // Internal — actually move the entity (no fade). Shared by fade+instant paths.
  function _teleportInstant(entityMesh, spawnId, direction, btn) {
    const doApply = (p) => {
      entityMesh.position.copy(p);
      if (typeof playerVel !== 'undefined' && entityMesh === playerMesh) {
        playerVel.set(0, 0, 0);
      }
      if (typeof PlayerController !== 'undefined' &&
          PlayerController.obj === entityMesh && PlayerController.vel) {
        PlayerController.vel.set(0, 0, 0);
      }
      if (typeof rapierBodies !== 'undefined') {
        const rb = rapierBodies.get(entityMesh);
        if (rb && rb.rigidBody) {
          try {
            rb.rigidBody.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
            rb.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
            if (rb.rigidBody.setAngvel) rb.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
          } catch(e) {}
        }
      }
      // Snap the built-in FPS camera to the new position too
      if (typeof camera !== 'undefined' && typeof camMode !== 'undefined' &&
          camMode === 'fps' && typeof carInside !== 'undefined' && !carInside &&
          entityMesh === playerMesh) {
        camera.position.set(p.x, p.y + 1.7, p.z);
      }
    };

    // Reverse: restore stored pre-spawn position, if any
    if (direction === 'reverse') {
      if (!btn || !btn.userData || !btn.userData._preSpawnPositions) {
        log("⚠ Tugma: teskari yo'nalish uchun oldingi pozitsiya yo'q", 'lw');
        return;
      }
      const prev = btn.userData._preSpawnPositions.get(entityMesh);
      if (!prev) {
        log("⚠ Tugma: bu obyektning oldingi pozitsiyasi topilmadi", 'lw');
        return;
      }
      doApply(prev);
      log("🔁 Tugma: oldingi pozitsiyaga qaytarildi", 'lok');
      return;
    }

    // Forward: normal teleport to spawn point
    if (spawnId == null) {
      log("⚠ Tugma: spawn nuqta tanlanmagan", 'lw');
      return;
    }
    const tgt = objects.find(o => String(o.userData && o.userData.id) === String(spawnId));
    if (!tgt) {
      log("⚠ Tugma: spawn nuqta topilmadi", 'lw');
      return;
    }
    const p = tgt.position.clone();
    p.y += 0.5;

    // Remember the entity's pre-teleport position so reverse can restore it
    if (btn && btn.userData) {
      if (!btn.userData._preSpawnPositions) btn.userData._preSpawnPositions = new Map();
      btn.userData._preSpawnPositions.set(entityMesh, entityMesh.position.clone());
    }
    doApply(p);
    log("🚀 Tugma: spawn ga jo'natildi", 'lok');
  }

  // ── Fade-to-color overlay for cinematic teleport ────────────
  // Half the duration is fade-in, then the callback fires (teleport
  // happens off-screen), then the other half fades back out.
  function _fadeTeleport(totalDur, color, midpointCb, onFinish) {
    let ov = document.getElementById('ibtn-fade-overlay');
    if (ov) ov.remove();

    ov = document.createElement('div');
    ov.id = 'ibtn-fade-overlay';
    const half = Math.max(0.1, totalDur * 0.5);
    ov.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:' + color + ';' +
      'opacity:0;pointer-events:none;z-index:99998;' +
      'transition:opacity ' + half + 's linear;';
    document.body.appendChild(ov);

    // Kick off fade-in on the next frame so CSS transition takes effect
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { ov.style.opacity = '1'; });
    });

    // Midpoint — screen is fully covered, do the teleport
    setTimeout(() => {
      if (typeof midpointCb === 'function') {
        try { midpointCb(); } catch(e) { console.warn('[Tugma] fade cb error:', e); }
      }
      ov.style.opacity = '0';
      setTimeout(() => {
        if (ov && ov.parentNode) ov.remove();
        if (typeof onFinish === 'function') { try { onFinish(); } catch(e) {} }
      }, half * 1000 + 120);
    }, half * 1000);

    log(`🎞 Tugma: teleport fade (${totalDur.toFixed(2)}s)`, 'lok');
  }

  // ── HTML overlay teleport ────────────────────────────────────
  function _htmlTeleport(totalDur, htmlContent, midpointCb, onFinish) {
    let ov = document.getElementById('ibtn-fade-overlay');
    if (ov) ov.remove();

    ov = document.createElement('div');
    ov.id = 'ibtn-fade-overlay';
    const half = Math.max(0.1, totalDur * 0.5);
    ov.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:rgba(0,0,0,0.92);' +
      'opacity:0;pointer-events:none;z-index:99998;' +
      'display:flex;align-items:center;justify-content:center;' +
      'color:#fff;font-family:sans-serif;' +
      'transition:opacity ' + half + 's linear;';
    ov.innerHTML = '<div style="max-width:90%;text-align:center">' +
                   (htmlContent || '') + '</div>';
    document.body.appendChild(ov);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => { ov.style.opacity = '1'; });
    });

    setTimeout(() => {
      if (typeof midpointCb === 'function') {
        try { midpointCb(); } catch(e) { console.warn('[Tugma] html cb error:', e); }
      }
      ov.style.opacity = '0';
      setTimeout(() => {
        if (ov && ov.parentNode) ov.remove();
        if (typeof onFinish === 'function') { try { onFinish(); } catch(e) {} }
      }, half * 1000 + 120);
    }, half * 1000);

    log(`📄 Tugma: teleport (HTML, ${totalDur.toFixed(2)}s)`, 'lok');
  }

  // ── Kamera boshqaruvidagi pre-teleport (4 ta manba rejimi) ──
  //   'spawn'    — kamera nishon blok yoniga uchadi; oxirida teleport.
  //   'object'   — kamera tanlangan kamera obyekt holatiga uchadi.
  //   'timeline' — kamera faollashadi + Timeline oldinga o'ynaydi.
  //   'imported' — tanlangan kamerada import qilingan keyframe'lar o'ynaydi.
  //
  //   Reverse rejimi: qisqa fade + oldingi pozitsiyani tiklash.
  function _cameraTeleport(totalDur, entityMesh, spawnId, direction, btn, cfg, onFinish) {
    if (typeof camera === 'undefined') return;

    // Reverse — no forward flight; just a short fade + restore prev pos
    if (direction === 'reverse') {
      _fadeTeleport(totalDur, '#000000',
        () => _teleportInstant(entityMesh, spawnId, direction, btn),
        onFinish);
      return;
    }

    const source = cfg && cfg.preAnimCameraSource || 'spawn';

    // Resolve target camera object (for object/timeline/imported)
    const camId = cfg && cfg.preAnimCameraId;
    const tgtCam = (camId != null)
      ? objects.find(o => String(o.userData && o.userData.id) === String(camId))
      : null;

    // Common completion — teleport player and call onFinish
    const complete = () => {
      _teleportInstant(entityMesh, spawnId, direction, btn);
      if (tgtCam && tgtCam.userData) {
        tgtCam.userData._isActive = false;
        tgtCam.visible = !tgtCam.userData._alwaysHidden;
      }
      if (typeof onFinish === 'function') { try { onFinish(); } catch(e) {} }
    };

    // ── Mode: 'spawn' — fly to spawn point ──
    if (source === 'spawn' || (!tgtCam && (source === 'object' || source === 'spawn'))) {
      if (spawnId == null) { log("⚠ Tugma: spawn nuqta tanlanmagan", 'lw'); return; }
      const tgt = objects.find(o => String(o.userData && o.userData.id) === String(spawnId));
      if (!tgt) { log("⚠ Tugma: spawn nuqta topilmadi", 'lw'); return; }
      // Kamera nishon blokdan ozgina NARIDA to'xtaydi va butun yo'l
      // davomida UNGA qaraydi.
      const look = tgt.getWorldPosition(new THREE.Vector3());
      const fromPos = camera.position.clone();

      // Nishondan qancha narida to'xtasin (blok o'lchamiga qarab)
      const ws  = tgt.getWorldScale(new THREE.Vector3());
      const rad = Math.max(ws.x, ws.y, ws.z) * 0.5;
      const back = Math.max(2.2, rad * 2.6);

      // Kamera kelayotgan tomondan yondashadi — orqasiga o'tib ketmasin
      const dir = fromPos.clone().sub(look); dir.y = 0;
      if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
      dir.normalize();
      const destPos = look.clone().addScaledVector(dir, back);
      destPos.y = look.y + Math.max(1.2, rad * 1.4);

      _lerpCameraTo(fromPos, destPos, null, null, totalDur, complete, look);
      log(`🎥 Kamera → "${tgt.userData.name}" ${totalDur.toFixed(2)}s`, 'lok');
      return;
    }

    // ── Mode: 'object' — fly to chosen camera object ──
    if (source === 'object') {
      const destPos = tgtCam.position.clone();
      const destRot = new THREE.Euler(tgtCam.rotation.x, tgtCam.rotation.y, tgtCam.rotation.z, 'YXZ');
      const fromPos = camera.position.clone();
      const fromRot = new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z, 'YXZ');
      _lerpCameraTo(fromPos, destPos, fromRot, destRot, totalDur, complete);
      log(`🎥 Tugma: kamera (obyektga) ${totalDur.toFixed(2)}s`, 'lok');
      return;
    }

    // ── Mode: 'timeline' — activate camera + play global Timeline ──
    if (source === 'timeline') {
      if (typeof TimelineExportSystem === 'undefined' ||
          typeof TimelineSystem === 'undefined' ||
          !TimelineSystem.tracks || TimelineSystem.tracks.length === 0) {
        log("⚠ Tugma: Timeline bo'sh — fade orqali teleport", 'lw');
        _fadeTeleport(totalDur, '#000000', complete, onFinish);
        return;
      }
      tgtCam.userData._isActive = true;
      tgtCam.visible = false;
      TimelineExportSystem.playTimeline({
        direction: 'forward',
        speed: 1.0,
        onDone: complete,
      });
      log(`🎥 Tugma: kamera + Timeline ijrosi`, 'lok');
      return;
    }

    // ── Mode: 'imported' — play imported keyframes on the target camera ──
    if (source === 'imported') {
      const kfs = cfg.preAnimKeyframes;
      if (!kfs || kfs.length === 0) {
        log("⚠ Tugma: imported keyframe yo'q — fade orqali teleport", 'lw');
        _fadeTeleport(totalDur, '#000000', complete, onFinish);
        return;
      }
      if (typeof TimelineExportSystem === 'undefined' ||
          !TimelineExportSystem.playObjectKeyframes) {
        log("⚠ Tugma: TimelineExportSystem topilmadi", 'lw');
        return;
      }
      tgtCam.userData._isActive = true;
      tgtCam.visible = false;
      TimelineExportSystem.playObjectKeyframes({
        target: tgtCam,
        keyframes: kfs,
        direction: 'forward',
        speed: 1.0,
        loop: false,
        onDone: complete,
      });
      log(`🎥 Tugma: kamera + imported KF (${kfs.length})`, 'lok');
      return;
    }
  }

  // ── Helper: smooth position+rotation lerp on the main camera ──
  //  lookAt — ixtiyoriy THREE.Vector3. Berilsa, kamera HAR KADR
  //  o'sha nuqtaga qaraydi (fromRot/toRot e'tiborsiz qoladi).
  function _lerpCameraTo(fromPos, toPos, fromRot, toRot, totalDur, onDone, lookAt) {
    const startTS = performance.now();
    const durMs   = totalDur * 1000;
    let done = false;
    // Boshlang'ich burilishni eslab qolamiz — lookAt ga SILLIQ o'tish uchun
    const _q0 = camera.quaternion.clone();
    const _qT = new THREE.Quaternion();
    const _m  = new THREE.Matrix4();
    const _up = new THREE.Vector3(0, 1, 0);
    const step = (ts) => {
      if (done) return;
      const a = Math.min(1, (ts - startTS) / durMs);
      const e = a * a * (3 - 2 * a);   // smoothstep
      camera.position.lerpVectors(fromPos, toPos, e);

      // ── 🎯 Nishonga qarash ──
      if (lookAt) {
        _m.lookAt(camera.position, lookAt, _up);
        _qT.setFromRotationMatrix(_m);
        // Boshida o'yinchi ko'rinishidan, oxirida to'liq nishonga —
        // keskin sakramasin
        camera.quaternion.copy(_q0).slerp(_qT, e);
      } else if (fromRot && toRot) {
        camera.rotation.order = 'YXZ';
        const lerp = (x, y, f) => x + (y - x) * f;
        camera.rotation.set(
          lerp(fromRot.x, toRot.x, e),
          lerp(fromRot.y, toRot.y, e),
          lerp(fromRot.z, toRot.z, e)
        );
      }
      if (a < 1) requestAnimationFrame(step);
      else { done = true; if (typeof onDone === 'function') onDone(); }
    };
    requestAnimationFrame(step);
  }

  // ── Play to'xtaganda kamera/teleport holatini tozalash ───────
  //    (hitboxdagi _onPlayStop ning kameraga tegishli qismi)
  function _resetCamAndTeleport() {
    _camAnim.active    = false;
    window._ibtnCamBusy = false;   // ⚠ bayroq qotib qolmasin — car.js kamerani qaytara olsin
    _camAnim.targetCam = null;
    _releasePlayerLock();

    // Safety net — restore any player meshes we may have hidden mid-animation
    if (Array.isArray(_camAnim._hiddenMeshes)) {
      _camAnim._hiddenMeshes.forEach(({ mesh, wasVisible }) => {
        if (mesh) mesh.visible = wasVisible;
      });
      _camAnim._hiddenMeshes = null;
    }
    _camAnim.prevMode = null;

    // Clean up any lingering fade overlay
    const ov = document.getElementById('ibtn-fade-overlay');
    if (ov) ov.remove();

    // Per-play runtime holatni tugmalardan tozalaymiz
    objects.forEach(o => {
      if (!o.userData || !o.userData.isInteractiveBtn) return;
      if (o.userData._preSpawnPositions) o.userData._preSpawnPositions.clear();
      o.userData._camOrigin = null;
    });
  }

  // ── Fire button — rejimga qarab harakat qiladi ──────────────
  // 💻 PC quvvat blokini ishga tushiradi — bir yoki bir nechta PC.
  //   pc.targets: [id, ...]  (yangi model)
  //   pc.targetId: id        (eski model — orqaga moslik)
  //   pc.multiMode: 'sequential' | 'all'
  //   pc.action: 'toggle' | 'on' | 'off'
  //   pc._seqIdx: ketma-ket rejimda keyingi indeks (ichki holat)
  function _firePCBlock(pc, btn) {
    if (!window.PCBlockSystem) return;
    // Ro'yxatni yig'amiz: yangi targets, bo'lmasa eski targetId
    let ids = Array.isArray(pc.targets) ? pc.targets.filter(x => x != null) : [];
    if (!ids.length && pc.targetId != null) ids = [pc.targetId];
    if (!ids.length) return;

    const action = pc.action || 'toggle';
    const mode = pc.multiMode || (ids.length > 1 ? 'sequential' : 'single');

    // ── 💻 HTML KODNI ALMASHTIRISH ──────────────────────────
    //  Tugma bosilganda PC ekranidagi sahifa boshqasiga o'tadi.
    //  `pc.html` bo'sh bo'lsa — tegilmaydi (faqat quvvat amali).
    //
    //  ⚠ `pc.htmlToggle` yoqilgan bo'lsa ikki sahifa GALMA-GAL
    //    almashadi: bosdingiz — yangisi, yana bosdingiz — eskisi.
    //    Eskisi birinchi bosishda AVTOMATIK eslab qolinadi, ya'ni
    //    foydalanuvchi uni qo'lda ikkinchi maydonga ko'chirmaydi.
    const _applyHtml = id => {
      if (!pc.html) return;
      if (!PCBlockSystem.setHtml) return;
      if (pc.htmlToggle) {
        const target = objects.find(o => o.userData &&
          String(o.userData.id) === String(id) && o.userData.isPCBlock);
        const cur = target ? String(target.userData.html ?? '') : '';
        if (pc._prevHtml === undefined) pc._prevHtml = cur;      // birinchi bosish
        const next = (cur === String(pc.html)) ? pc._prevHtml : pc.html;
        PCBlockSystem.setHtml(id, next);
      } else {
        PCBlockSystem.setHtml(id, pc.html);
      }
    };

    if (mode === 'all') {
      // Hammasi birvarakayiga
      ids.forEach(id => { _applyHtml(id); PCBlockSystem.fire(id, action); });
      return;
    }
    if (mode === 'sequential') {
      // Har bosishda galma-gal keyingisi. Oxiriga yetsa boshiga qaytadi.
      if (typeof pc._seqIdx !== 'number' || pc._seqIdx >= ids.length) pc._seqIdx = 0;
      const id = ids[pc._seqIdx];
      _applyHtml(id);
      PCBlockSystem.fire(id, action);
      pc._seqIdx++;
      if (pc._seqIdx >= ids.length) pc._seqIdx = 0;   // aylanma
      return;
    }
    // single (yoki noma'lum) — birinchisiga qo'llaymiz
    _applyHtml(ids[0]);
    PCBlockSystem.fire(ids[0], action);
  }

  /**
   * 📡 Boshqa o'yinchidan kelgan bosishni takrorlaydi.
   * ⚠ `_fireButton` QAYTA ISHLATILADI, nusxa emas.
   * ⚠ `_skipItem: true` — predmet sharti TEKSHIRILMAYDI: predmet
   *   BOSGAN o'yinchida, bizda emas. Tekshirsak amal hech qachon
   *   takrorlanmasdi.
   */
  function mpReplay(btn, m) {
    if (!btn || !btn.userData) return;
    _fireButton(btn, true);
  }

  function _fireButton(btn, _skipItem) {
    //  📡 E'lon — boshqalar ham ko'rsin. 👁 qarash bloki ham shu
    //  ⚠ yo'ldan o'tadi (u tugmaning o'zi), shuning uchun turi
    //    bayroqqa qarab tanlanadi.
    try {
      if (window.MultiplayerSystem && MultiplayerSystem.fire && btn.userData.id != null) {
        MultiplayerSystem.fire(btn.userData.isGazeTrigger ? 'gaze' : 'button',
                               { o: btn.userData.id });
      }
    } catch (e) {}

    const ud = btn.userData;

    // ── 🔢 NoScript — raqamga ta'sir ─────────────────────────
    //  ⚠ ENG BOSHIDA: tugmaning rejimi (anim, ovoz, pickup…) qanday
    //    bo'lishidan qat'i nazar ishlaydi. Rejimlar ichiga qo'ysak
    //    har rejimda alohida yozish kerak bo'lardi va bittasi
    //    albatta unutilardi.
    if (window.NoScriptSystem) { try { NoScriptSystem.fireFrom(btn); } catch (e) {} }

    // ── 📦 PREDMET SLOTLARI ─────────────────────────────────
    //  ⚠ BU DARVOZA EMAS. Qo'l bo'sh yoki predmet joriy slotga mos
    //    kelmasa — hech narsa to'xtatilmaydi va HECH QANDAY xabar
    //    chiqmaydi: tugma pastdagi O'Z funksiyasini bajaradi.
    //    (Ilgari bu yerda darvoza turardi va "📦 Kerak: …" degan yozuv
    //     chiqarardi — tugmaning mustaqil vazifasini bo'g'ib qo'yardi.)
    //
    //  Predmet mos kelsa: u olinadi, slot animatsiyasi o'ynaydi va
    //  ketma-ketlik suriladi. Oxirgi slot to'lgandagina pastdagi
    //  funksiya ham ishga tushadi.
    if (!_skipItem && _irOn(ud)) {
      if (_irAccepts(btn)) {
        if (!_irStep(btn)) return;      // hali oxiriga yetmadi (yoki anim kutilyapti)
      } else if (_irPending(ud)) {
        // Ketma-ketlik tugamagan va qo'lda mos predmet yo'q.
        // ⚠ JIMGINA chiqamiz — xabar YO'Q (foydalanuvchi so'ragan).
        //   Asosiy funksiyani bu yerda otsak, u predmetlar to'lmasdan
        //   ishlab ketardi va slot animatsiyasi bilan urishardi.
        return;
      }
    }

    // 👤 O'YINCHI MODELI — tugma bosilganda almashadi.
    // Tugmada "chiqish" yo'q, shuning uchun har doim 'enter' fazasi.
    // ⏱ VAQTINCHALIK tanlansa — tugma toggle bo'ladi (bosdi→o'zgardi, yana bosdi→qaytdi).
    if (ud.playerModel && ud.playerModel.enabled && window.PlayerModelSystem) {
      const pm = ud.playerModel;
      if (pm.mode === 'temp') {
        if (PlayerModelSystem.current() != null &&
            String(PlayerModelSystem.current()) === String(pm.modelId)) PlayerModelSystem.revert();
        else PlayerModelSystem.fire(pm, 'enter');
      } else {
        PlayerModelSystem.fire(pm, 'enter');
      }
    }

    // 🌀 TELEPORT — hitboxdan ko'chirilgan _teleport (shu fayl ichida)
    if (ud.spawnRedirect && ud.spawnRedirect.enabled && ud.spawnRedirect.spawnId) {
      const pl = (window.PlayerController && PlayerController.obj) ||
                 (typeof playerMesh !== 'undefined' ? playerMesh : null);
      if (pl) _teleport(pl, ud.spawnRedirect.spawnId, 'forward', btn, ud.spawnRedirect);
      else log('⚠ O\'yinchi topilmadi — teleport bekor', 'lw');
    }

    // 🎥 KAMERA ANIMATSIYASI — hitboxdan ko'chirilgan _startCameraAnim
    if (ud.cameraAnim && ud.cameraAnim.enabled) {
      _startCameraAnim(ud.cameraAnim, 'forward', 1, btn);
    }

    // 💻 PC — quvvat. Bir yoki bir nechta PC ni yoqish/o'chirish.
    //   Rejimlar (multiMode):
    //     'sequential' — har bosishda GALMA-GAL keyingisi (1→2→3→…)
    //     'all'        — HAMMASI birvarakayiga
    //     (yo'q/1 ta)  — oddiy: bitta PC ga action qo'llanadi
    if (ud.pcBlock && ud.pcBlock.enabled && window.PCBlockSystem) {
      _firePCBlock(ud.pcBlock, btn);
    }

    // ── 🔴 FINISH — tugma bosilganda o'yin tugaydi ───────────
    //  ⚠ ENG OXIRIDA emas, shu yerda: tugmaning boshqa amallari
    //    (ovoz, animatsiya, PC) ham bajarilib ulgursin. Finish o'zi
    //    outro ko'rsatib, keyin sahifaga o'tadi — ya'ni bir necha
    //    soniya vaqt bor.
    //  ⚠ Sahifaga o'tkazish `StartFinishSystem` ichida FAQAT o'yin
    //    rejimida bajariladi (muharrirda saqlanmagan sahna
    //    yo'qolmasligi uchun).
    if (ud.finishGame && ud.finishGame.enabled) {
      if (window.StartFinishSystem) StartFinishSystem.finish(ud.finishGame.targetId);
      else log('⚠ Finish bloki tizimi topilmadi', 'lw');
    }

    // 🛤 YO'L — tugma bosilganda yo'l ishga tushadi/to'xtaydi
    if (ud.path && ud.path.enabled && ud.path.targetId && window.PathSystem) {
      PathSystem.fire(ud.path.targetId, ud.path.action || 'toggle');
    }

    // 📝 MATN BLOKI — tugma bosilganda matn o'zgaradi
    if (ud.textBlock && ud.textBlock.enabled && ud.textBlock.targetId) {
      const tb = objects.find(o => String(o.userData?.id) === String(ud.textBlock.targetId));
      if (tb && tb.userData.isTextBlock && window.TextBlockSystem) {
        // Toggle: har bosishda ikki matn orasida almashadi
        let t = ud.textBlock.text ?? '';
        if (ud.textBlock.toggle && ud.textBlock.backText) {
          ud._tbFlip = !ud._tbFlip;
          t = ud._tbFlip ? (ud.textBlock.text ?? '') : ud.textBlock.backText;
        }
        TextBlockSystem.setText(tb, t, ud.textBlock.mode || null);
      } else if (!tb) log('⚠ Matn bloki topilmadi', 'lw');
    }

    // 🖥 HTML sahifa (dialog/quest) — bosilganda ko'rsatiladi/yopiladi
    if (ud.htmlPage && ud.htmlPage.enabled) {
      if (ud.htmlPage.mode === 'close') { if (window._hbCloseHtmlPage) window._hbCloseHtmlPage(); }
      else if (window._hbShowHtmlPage) window._hbShowHtmlPage(ud.htmlPage.content, ud.htmlPage.position, ud.htmlPage);
    }

    // ── Bloklangan animatsiyalarni ochish ──────────────
    // Bu tugmaga biriktirilgan blok(lar) bo'lsa — animatsiya davom etadi.
    if (typeof window._resumeBlockedAnim === 'function') {
      const n = window._resumeBlockedAnim(ud.id);
      if (n > 0) log(`🔓 ${n} bloklangan animatsiya davom etdi — "${ud.name}"`, 'lok');
    }

    // ── PICKUP rejim — ko'tarish/tashlash ──────────────
    if (ud.btnMode === 'pickup') {
      if (_carried) _throwCarried(btn);
      else          _pickupTarget(btn);
      return;
    }

    // ── TRIGGER va ATTACHED — animatsiya + sound ──────
    const slots = ud.slots || [];
    if (slots.length === 0) {
      if (!(ud.htmlPage && ud.htmlPage.enabled))
        log(`⚠ "${ud.name}" — slot yo'q, avval animatsiya qo'shing`, 'lw');
      return;
    }

    // ── 🔁 Ijro ketyaptimi? ──────────────────────────────────
    //  Ikki xil xulq, dizayner tanlaydi:
    //    ⏹ 'stop'    — qayta bosish TO'XTATADI (standart)
    //    🔄 'restart' — qayta bosish BOSHIDAN boshlaydi
    //
    //  ⚠ 'restart' da ham avval to'xtatiladi: eski oqim yashab
    //    qolsa ikkita animatsiya bir vaqtda yurib, obyekt titrardi.
    if (ud._activeHandles && ud._activeHandles.length) {
      const rt = ud.loopRetrigger || 'stop';
      _stopButtonAnims(btn);
      if (rt !== 'restart') {
        log(`■ "${ud.name}" — to'xtatildi`, 'lw');
        return;
      }
      log(`🔄 "${ud.name}" — boshidan`, 'lok');
      // pastga tushib qayta boshlanadi
    }

    const playMode = ud.playMode || 'single';
    const loopOn   = !!ud.loopPlay;
    ud._activeHandles = [];

    if (playMode === 'all_parallel')  { _playAllParallel(btn, loopOn); return; }
    if (playMode === 'all_seq')       { _playAllSequential(btn, loopOn); return; }
    _playSingle(btn, loopOn);
  }

  // ── Maqsad obyektni topish ──────────────────────────────────
  function _resolveTarget(slot) {
    return objects.find(o => String(o.userData && o.userData.id) === String(slot.targetObjectId));
  }

  // ── Bitta slotni ijro etish (sound + animatsiya) ────────────
  function _playOne(btn, slot, opts) {
    opts = opts || {};
    const ud = btn.userData;
    const hasAnim  = slot && Array.isArray(slot.keyframes) && slot.keyframes.length > 0;
    const hasSound = slot && slot.soundUrl;
    if (hasSound) _playSlotSound(slot);
    if (!hasAnim) { if (opts.onDone) opts.onDone(); return null; }
    // 🎨 Maxsus trekda (filtr · ob-havo · …) nishon obyekti YO'Q
    const kind   = slot.trackKind || null;
    const target = kind ? null : _resolveTarget(slot);
    if (!kind && !target) {
      log(`⚠ "${ud.name}" — maqsad obyekt topilmadi (${slot.sourceName || 'anim'})`, 'lw');
      if (opts.onDone) opts.onDone();
      return null;
    }
    if (typeof TimelineExportSystem === 'undefined' || !TimelineExportSystem.playObjectKeyframes) {
      log('⚠ TimelineExportSystem topilmadi', 'lw');
      if (opts.onDone) opts.onDone();
      return null;
    }
    // ⚠ Handle tugagach RO'YXATDAN CHIQARILADI.
    //
    //  ALOMAT: loopsiz animatsiya o'ynab bo'lgach ham handle
    //    `_activeHandles` da qolib ketardi. Keyingi bosishda
    //    `_fireButton` uni "ijro ketyapti" deb o'qib, TO'XTATISH
    //    deb tushunardi — ya'ni tugma bir marta ishlab, ikkinchi
    //    bosishda jimgina hech nima qilmasdi va faqat uchinchisida
    //    yana yurardi.
    //
    //  ⚠ LOOP da esa handle O'ZI tugamaydi — u mangu aylanadi va
    //    ro'yxatda qoladi. Aynan shu kerak: ikkinchi bosish uni
    //    to'xtatadi (toggle).
    let _h = null;
    const _done = () => {
      const list = opts.handles || ud._activeHandles;
      if (list) { const i = list.indexOf(_h); if (i >= 0) list.splice(i, 1); }
      if (opts.onDone) opts.onDone();
    };
    const h = TimelineExportSystem.playObjectKeyframes({
      target, trackKind: kind,        // 🎨 maxsus trek turi (bo'lsa)
      //  💻 Egasining id si — busiz trek qaysi PC ga tegishini
      //  bilmasdi va jimgina tashlanardi.
      pcId: slot.trackPcId ?? null,
      keyframes: slot.keyframes, direction: 'forward',
      speed: slot.speed || 1, loop: !!opts.loop, onDone: _done,
    });
    _h = h;
    // ⚠ Handle QAYSI ro'yxatga tushishi MUHIM. Standarti — tugmaning
    //   asosiy `_activeHandles` ro'yxati; uni `_fireButton` "ijro
    //   ketyaptimi?" deb tekshiradi va ketayotgan bo'lsa bosishni
    //   TO'XTATISH deb tushunadi (toggle).
    //
    //   📦 Predmet slotlari o'sha ro'yxatga tushmasligi kerak: 1-slot
    //   animatsiyasi tugagach ham handle qolib ketardi va OXIRGI predmet
    //   berilganda `_fireButton` uni "ijro ketyapti" deb o'qib,
    //   `_stopButtonAnims()` chaqirib chiqib ketardi — asosiy animatsiya
    //   umuman boshlanmasdi. Foydalanuvchi ko'rgan alomat: "oxirgi
    //   animatsiya boshida bir sekund yurib to'xtaydi".
    if (h) (opts.handles || (ud._activeHandles = ud._activeHandles || [])).push(h);
    return h;
  }

  // ── Barcha ijroni to'xtatish ────────────────────────────────
  function _stopButtonAnims(btn) {
    const ud = btn.userData;
    (ud._activeHandles || []).forEach(h => { try { h && h.stop && h.stop(); } catch (e) {} });
    ud._activeHandles = [];
    _irStopAnims(ud);   // 📦 predmet slotlari animatsiyalari ham to'xtasin
    ud._playing = false;
    ud._chainIdx = 0;
    _stopAllSounds();
    if (typeof updateInspector === 'function' &&
        typeof selectedObj !== 'undefined' && selectedObj === btn) updateInspector();
  }

  // ── SINGLE — har bosishda bitta slot (loop/pingpong bo'yicha) ─
  function _playSingle(btn, loopOn) {
    const ud = btn.userData;
    const slots = ud.slots;
    const idx  = Math.max(0, Math.min(slots.length - 1, ud._currentIdx || 0));
    const slot = slots[idx];
    ud._playing = true;
    log(`▶ "${ud.name}" — slot ${idx + 1}/${slots.length}${loopOn ? ' (loop)' : ''}`, 'lok');
    _playOne(btn, slot, {
      loop: loopOn,
      onDone: () => { ud._playing = false; ud._activeHandles = []; _advanceIndex(btn); },
    });
  }

  // ── ALL — KETMA-KET (biri tugagach keyingisi) ───────────────
  function _playAllSequential(btn, loopOn) {
    const ud = btn.userData;
    const slots = ud.slots;
    ud._playing = true;
    ud._chainIdx = 0;
    log(`⏭ "${ud.name}" — All ketma-ket (${slots.length})${loopOn ? ' (loop)' : ''}`, 'lok');
    const playNext = () => {
      if (!ud._playing) return;
      if (ud._chainIdx >= slots.length) {
        if (loopOn) { ud._chainIdx = 0; }
        else { ud._playing = false; ud._activeHandles = []; return; }
      }
      const slot = slots[ud._chainIdx++];
      ud._activeHandles = [];                 // faqat joriy handle saqlanadi
      _playOne(btn, slot, { loop: false, onDone: playNext });
    };
    playNext();
  }

  // ── ALL — BIR VAQTDA (hamma timeline birdan) ────────────────
  function _playAllParallel(btn, loopOn) {
    const ud = btn.userData;
    const slots = ud.slots;
    ud._playing = true;
    ud._activeHandles = [];
    let remaining = 0;
    slots.forEach(slot => {
      if (slot && Array.isArray(slot.keyframes) && slot.keyframes.length > 0 && _resolveTarget(slot)) remaining++;
    });
    log(`⚡ "${ud.name}" — All bir vaqtda (${slots.length})${loopOn ? ' (loop)' : ''}`, 'lok');
    if (remaining === 0) {
      slots.forEach(slot => _playOne(btn, slot, { loop: false }));  // faqat soundlar bo'lishi mumkin
      ud._playing = false;
      return;
    }
    let done = 0;
    slots.forEach(slot => {
      _playOne(btn, slot, {
        loop: loopOn,
        onDone: () => {
          done++;
          if (!loopOn && done >= remaining) { ud._playing = false; ud._activeHandles = []; }
        },
      });
    });
  }

  // ── Index advance — loop yoki pingpong ──────────────────────
  function _advanceIndex(btn) {
    const ud   = btn.userData;
    const len  = (ud.slots || []).length;
    if (len === 0) return;
    if (len === 1) { ud._currentIdx = 0; ud._direction = 1; return; }

    const mode = ud.mode || 'loop';
    let idx    = ud._currentIdx || 0;
    let dir    = ud._direction  || 1;

    if (mode === 'pingpong') {
      idx += dir;
      if (idx >= len)  { idx = len - 2; dir = -1; }   // oxirdan orqaga
      else if (idx < 0){ idx = 1;       dir = +1; }   // boshdan oldinga
    } else {
      idx = (idx + 1) % len;
      dir = 1;
    }
    ud._currentIdx = idx;
    ud._direction  = dir;
    if (typeof updateInspector === 'function' &&
        typeof selectedObj !== 'undefined' && selectedObj === btn) {
      updateInspector();
    }
  }

  // ── Public: reset (inspector'dan chaqiriladi) ────────────────
  function reset(btn) {
    const ud = btn.userData;
    _stopButtonAnims(btn);
    ud._currentIdx = 0;
    ud._direction  = 1;
    ud._playing    = false;
    log(`↺ "${ud.name}" — ko'rsatkich qayta boshlandi`, 'lok');
    if (typeof updateInspector === 'function') updateInspector();
  }

  // ── Inspector panel ──────────────────────────────────────────
  let _activeSlotIdx = null;
  // ⚠ Qaysi slot RO'YXATIGA yozilishi: 'main' — ANM slotlari (ud.slots),
  //   'item' — predmet slotlari (ud.itemReq.slots). Timeline/JSON tanlash
  //   mexanizmi ikkalasi uchun BITTA — ikkinchi nusxa yozilmasin.
  let _activeSlotList = 'main';
  function _slotsOf(ud, which) {
    if (which === 'item') {
      if (!ud.itemReq) ud.itemReq = { enabled:false, onDone:'consume', loop:true, slots:[] };
      if (!Array.isArray(ud.itemReq.slots)) ud.itemReq.slots = [];
      return ud.itemReq.slots;
    }
    return (ud.slots = ud.slots || []);
  }

  function buildInspector(btn) {
    const ic = $('inspector-content');
    const ud = btn.userData;

    // ── Migratsiya: eski sahnalarda cameraAnim/spawnRedirect qisqa
    //    shaklda saqlangan bo'lishi mumkin. Yo'q maydonlarni standart
    //    qiymat bilan to'ldiramiz — panel ham, funksiyalar ham to'liq ishlasin.
    const _def = _defaultData();
    ['cameraAnim', 'spawnRedirect'].forEach(k => {
      ud[k] = Object.assign({}, _def[k], ud[k] || {});
      if (!Array.isArray(ud[k].blocks) && k === 'cameraAnim') ud[k].blocks = [];
    });
    // 🔤 prompt — eski sahnalarda yo'q bo'lishi mumkin
    ud.prompt = Object.assign({}, _def.prompt, ud.prompt || {});
    // 👁 gaze — qarash bloklari uchun
    if (ud.isGazeTrigger) {
      // ⚠ Object.assign — ESKI sahnalarda `delay`/`holdGaze`/`showTimer`
      //   yo'q edi; shu yerda avtomatik to'ldiriladi (delay:0 = eski xulq).
      ud.gaze = Object.assign({ trigger:'look', cone:30, dist:15, requireLos:true, once:false, reArm:0.5, hideInPlay:true,
                                delay:0, holdGaze:false, showTimer:true, timerPos:'tc' }, ud.gaze || {});
    }

    const slots = ud.slots || (ud.slots = []);
    const p = btn.position, r = btn.rotation;
    const btnMode = ud.btnMode || 'trigger';

    // Attach/pickup uchun boshqa obyektlar ro'yxati
    const otherObjects = objects.filter(o =>
      o !== btn && !o.userData.isInteractiveBtn && o.userData.id);

    // 📦 Predmet slotlari uchun ALOHIDA ro'yxat — tugmalar ham KIRADI.
    //    ⚠ NEGA: PICKUP rejimida `pickupTargetId` bo'sh qolsa tugmaning
    //      O'ZI ko'tariladi (`_pickupTarget`: `target = btn`). Ya'ni tugma
    //      ham to'liq huquqli predmet. `otherObjects` esa barcha tugmalarni
    //      chiqarib tashlaydi — u "animatsiya maqsadi" uchun mo'ljallangan
    //      va o'sha yerda to'g'ri. Ikkalasini bitta ro'yxatga birlashtirsak,
    //      maqsad tanlashda tugmalar ham chiqib chalkashtirardi.
    const itemObjects = objects.filter(o => o !== btn && o.userData.id);
    const _itemIcon = o => o.userData.isGazeTrigger    ? '👁'
                         : o.userData.isInteractiveBtn ? '🔘'
                         : o.userData.isHitbox         ? '📦'
                         : o.userData.isCamera         ? '🎥'
                         : '▪';

    ic.innerHTML = `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:var(--accent);color:#001">BTN</span>${ud.name}</div>
        <div class="fr"><span class="fl">Nom</span>
          <input id="obj-name-inp" value="${ud.name}"
            style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px;outline:none"
            oninput="window._renameObj(this.value)">
        </div>
        <div class="fr"><span class="fl">Yorliq</span>
          <input value="${ud.label || ''}" placeholder="Ixtiyoriy"
            style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px;outline:none"
            oninput="window._ibtnSetProp('label', this.value)">
        </div>
      </div>

      <div class="comp-block">
        <div class="comp-title"><span class="tag">TRS</span>Transform</div>
        <div class="fl" style="margin-bottom:3px">Pozitsiya</div>
        <div class="xyzr">
          <div><input class="xi" id="px" value="${p.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
          <div><input class="xi" id="py" value="${p.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
          <div><input class="xi" id="pz" value="${p.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
        </div>
        <div class="fl" style="margin:5px 0 3px">Aylantirish (°)</div>
        <div class="xyzr">
          <div><input class="xi" id="rx" value="${(r.x*180/Math.PI).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
          <div><input class="xi" id="ry" value="${(r.y*180/Math.PI).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
          <div><input class="xi" id="rz" value="${(r.z*180/Math.PI).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
        </div>
      </div>

      ${ud.isGazeTrigger ? (() => {
        const gz = ud.gaze || {};
        const trg = gz.trigger || 'look';
        const tbtn = (id, ic, name) => `<button onclick="window._gazeSet('trigger','${id}')"
          style="flex:1;background:${trg===id?'rgba(var(--accent-rgb),.15)':'transparent'};
                 border:1px solid ${trg===id?'var(--accent)':'var(--border)'};
                 color:${trg===id?'var(--accent)':'var(--muted)'};padding:6px 3px;border-radius:3px;
                 cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
                 display:flex;flex-direction:column;align-items:center;gap:2px">
          <span style="font-size:13px">${ic}</span><span>${name}</span></button>`;
        return `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:var(--accent);color:#001">👁</span>Qarash tetigi</div>
        <div class="fl" style="margin:2px 0 4px">Qachon ishga tushsin</div>
        <div style="display:flex;gap:3px">
          ${tbtn('look','👁','Qarasa')}
          ${tbtn('away','🚫','Qaramasa')}
          ${tbtn('both','🔄','Ikkalasi')}
        </div>
        <div class="fr" style="margin-top:6px"><span class="fl">Konus (aniqlik)</span>
          <input type="number" min="3" max="90" step="1" value="${gz.cone ?? 30}"
            style="width:70px;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._gazeSet('cone', Math.max(3, Math.min(90, parseFloat(this.value)||30)))">
          <span style="font-size:9px;color:var(--muted);margin-left:4px">°</span>
        </div>
        <div class="fr"><span class="fl">Masofa</span>
          <input type="number" min="1" max="100" step="1" value="${gz.dist ?? 15}"
            style="width:70px;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._gazeSet('dist', Math.max(1, Math.min(100, parseFloat(this.value)||15)))">
          <span style="font-size:9px;color:var(--muted);margin-left:4px">m</span>
        </div>
        <div class="fr"><span class="fl">Qayta kutish</span>
          <input type="number" min="0" max="60" step="0.1" value="${gz.reArm ?? 0.5}"
            style="width:70px;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._gazeSet('reArm', Math.max(0, Math.min(60, parseFloat(this.value)||0)))">
          <span style="font-size:9px;color:var(--muted);margin-left:4px">s</span>
        </div>

        <div style="border-top:1px solid var(--border);margin:8px 0 6px"></div>
        <div class="fl" style="margin:2px 0 4px;color:var(--accent)">⏱ TAYMER</div>
        <div class="fr"><span class="fl">Kechikish</span>
          <input type="number" min="0" max="600" step="0.5" value="${gz.delay ?? 0}"
            style="width:70px;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid ${(gz.delay > 0) ? 'var(--accent)' : 'var(--border)'};color:${(gz.delay > 0) ? 'var(--accent)' : 'var(--text)'};padding:2px 5px;border-radius:2px"
            oninput="window._gazeSet('delay', Math.max(0, Math.min(600, parseFloat(this.value)||0)))">
          <span style="font-size:9px;color:var(--muted);margin-left:4px">s</span>
        </div>
        <div style="display:flex;gap:3px;margin:4px 0 2px">
          ${[0, 5, 10, 20, 30].map(v => `<button onclick="window._gazeSet('delay',${v});updateInspector()"
            style="flex:1;background:${(+gz.delay || 0) === v ? 'rgba(var(--accent-rgb),.15)' : 'transparent'};
                   border:1px solid ${(+gz.delay || 0) === v ? 'var(--accent)' : 'var(--border)'};
                   color:${(+gz.delay || 0) === v ? 'var(--accent)' : 'var(--muted)'};padding:3px 0;border-radius:3px;
                   cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px">${v === 0 ? "Yo'q" : v + 's'}</button>`).join('')}
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:4px 0 2px">
          <input type="checkbox" ${gz.holdGaze ? 'checked' : ''}
            onchange="window._gazeSet('holdGaze', this.checked)" style="cursor:pointer">
          Qarab turish shart — uzilsa sanoq bekor
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:2px 0">
          <input type="checkbox" ${gz.showTimer !== false ? 'checked' : ''}
            onchange="window._gazeSet('showTimer', this.checked);updateInspector()" style="cursor:pointer">
          Ekranda sanoq ko'rinsin
        </label>
        ${gz.showTimer !== false ? (() => {
          const cur = gz.timerPos || 'tc';
          const cell = (id, ar, tip) =>
            `<button onclick="window._gazeSet('timerPos','${id}')" title="${tip}"
               style="background:${cur === id ? 'rgba(var(--accent-rgb),.18)' : 'transparent'};
                      border:1px solid ${cur === id ? 'var(--accent)' : 'var(--border)'};
                      color:${cur === id ? 'var(--accent)' : 'var(--muted)'};
                      padding:7px 0;border-radius:3px;cursor:pointer;font-size:13px;line-height:1">${ar}</button>`;
          return `
        <div class="fl" style="margin:6px 0 4px">Sanoq joylashuvi</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;max-width:130px">
          ${cell('tl','↖','Tepa-chap')}${cell('tc','↑','Tepa-o\'rta')}${cell('tr','↗','Tepa-o\'ng')}
          ${cell('ml','←','O\'rta-chap')}${cell('mc','●','O\'rta')}${cell('mr','→','O\'rta-o\'ng')}
          ${cell('bl','↙','Past-chap')}${cell('bc','↓','Past-o\'rta')}${cell('br','↘','Past-o\'ng')}
        </div>
        ${cur === 'mc' ? `<div style="font-size:8px;color:#ffcc00;line-height:1.6;margin-top:3px;font-family:'Share Tech Mono',monospace">
          ⚠ O'rta — nishon (crosshair) shu yerda. Sanoq uni bosib qolishi mumkin.
        </div>` : ''}`;
        })() : ''}
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:3px 0 0;font-family:'Share Tech Mono',monospace">
          ${(+gz.delay || 0) > 0
            ? `O'yinchi ${(gz.trigger === 'away') ? 'qaramay qo\'ysa' : 'qarasa'} → <b style="color:var(--accent)">${gz.delay}s</b> sanaladi → chiqishlar ishga tushadi.`
              + (gz.holdGaze ? ' Sanoq davomida <b>qarashni uzsa — bekor</b>.' : ' Sanoq boshlangach <b>qaramasa ham</b> oxirigacha boradi.')
            : 'Kechikish 0 — chiqishlar darhol ishga tushadi.'}
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:6px 0 2px">
          <input type="checkbox" ${gz.requireLos ? 'checked' : ''}
            onchange="window._gazeSet('requireLos', this.checked)" style="cursor:pointer">
          To'siq tekshiruvi — devor ortidan ishlamasin
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:2px 0">
          <input type="checkbox" ${gz.once ? 'checked' : ''}
            onchange="window._gazeSet('once', this.checked)" style="cursor:pointer">
          Bir marta — ishga tushib to'xtasin
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:2px 0">
          <input type="checkbox" ${gz.hideInPlay !== false ? 'checked' : ''}
            onchange="window._gazeSet('hideInPlay', this.checked)" style="cursor:pointer">
          O'yinda ko'rinmasin — ikona faqat editorda
        </label>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:4px;font-family:'Share Tech Mono',monospace">
          Pastdagi chiqishlar (animatsiya, sound, PC...) qaralganда ishga tushadi.
          Konus kichik = aniqroq qarash kerak.
        </div>
      </div>`;
      })() : `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:var(--accent);color:#001">INT</span>O'zaro Aloqa</div>
        <div class="fr"><span class="fl">Masofa</span>
          <input type="number" min="0.5" max="20" step="0.5" value="${ud.interactDist}"
            style="width:70px;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._ibtnSetProp('interactDist', parseFloat(this.value)||3)">
          <span style="font-size:9px;color:var(--muted);margin-left:4px">m</span>
        </div>
        <div class="fr"><span class="fl">Bosish tugmasi</span>
          <select style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--accent);padding:2px 5px;border-radius:2px"
            oninput="window._ibtnSetProp('actionKey', this.value)">
            ${['KeyE','KeyF','KeyR','KeyG','KeyQ','KeyH','KeyT','Space','Enter'].map(k =>
              `<option value="${k}" ${ud.actionKey === k ? 'selected' : ''}>${_keyShort(k)}</option>`
            ).join('')}
          </select>
        </div>
      </div>`}

      <!--  YAQINLASHUV YOZUVI - QARASH blokida HAM ko'rsatiladi.
            OGOHLANTIRISH: ilgari u faqat tugmalarda ko'rsatilardi.
              Sabab noto'g'ri farazda edi: "qarash blokida bosish
              yo'q, demak yozuv ham kerak emas". Amalda esa yozuv
              KERAK - "Ekranga qarang" kabi ko'rsatma aynan shu
              blokda ma'noli.
            ⚠ Ikkalasining farqi FAQAT tetikda: tugmada BOSADI,
              qarashda QARAYDI. Qolgan hamma imkoniyat bir xil
              bo'lishi kerak, aks holda dizayner "nega bunda bor,
              unda yo'q?" deb chalkashardi. -->
      ${((() => {
        const pr = ud.prompt || {};
        const posGrid = [
          ['tl','↖'],['tc','↑'],['tr','↗'],
          ['ml','←'],['mc','●'],['mr','→'],
          ['bl','↙'],['bc','↓'],['br','↘'],
        ];
        return `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:var(--accent);color:#001">TXT</span>Yaqinlashuv yozuvi</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:2px 0 6px">
          <input type="checkbox" ${pr.enabled ? 'checked' : ''}
            onchange="window._ibtnSetPrompt('enabled', this.checked)" style="cursor:pointer">
          Yoqilgan — o'yinchi yaqinlashib qaraganda chiqadi
        </label>
        ${pr.enabled ? `
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:2px 0 6px">
          <input type="checkbox" ${pr.asHtml ? 'checked' : ''}
            onchange="window._ibtnSetPrompt('asHtml', this.checked)" style="cursor:pointer">
          HTML rejimi — teg va stil yozish mumkin
        </label>
        ${pr.asHtml ? `
        <div class="fl" style="margin:2px 0 3px">HTML matn</div>
        <textarea spellcheck="false"
          oninput="window._ibtnSetPrompt('text', this.value)"
          placeholder="&lt;div style='...'&gt;{key} Eshikni och&lt;/div&gt;"
          style="width:100%;min-height:70px;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:#9fe8c0;padding:5px 7px;border-radius:3px;outline:none;resize:vertical">${_esc(pr.text || '')}</textarea>
        <div style="font-size:8px;color:var(--muted);line-height:1.7;margin:3px 0 4px;font-family:'Share Tech Mono',monospace">
          Hech qanday default stil yo'q — hammasini o'zingiz yozasiz.<br>
          <b style="color:#9fe8c0">{key}</b> — o'sha joyga tugma harfi (<b style="color:var(--accent)">${_keyShort(ud.actionKey || 'KeyE')}</b>) qo'yiladi. Yozmasangiz — kalit chiqmaydi.<br>
          Masalan: <span style="color:#9fe8c0">&lt;div style="background:#000c;padding:8px;border-radius:8px;color:#0ff"&gt;{key} Ochish&lt;/div&gt;</span>
        </div>
        ` : `
        <div class="fr"><span class="fl">Matn</span>
          <input value="${_esc(pr.text || '')}" placeholder="Bo'sh = Yorliq yoki 'Bosing'"
            style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px;outline:none"
            oninput="window._ibtnSetPrompt('text', this.value)">
        </div>
        `}
        <div class="fl" style="margin:6px 0 4px">Joylashuv</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;max-width:130px">
          ${posGrid.map(([id, ar]) => `
            <button onclick="window._ibtnSetPrompt('position','${id}')"
              title="${id}"
              style="background:${pr.position === id ? 'rgba(var(--accent-rgb),.18)' : 'transparent'};
                     border:1px solid ${pr.position === id ? 'var(--accent)' : 'var(--border)'};
                     color:${pr.position === id ? 'var(--accent)' : 'var(--muted)'};
                     padding:7px 0;border-radius:3px;cursor:pointer;font-size:13px;line-height:1">${ar}</button>
          `).join('')}
        </div>
        ${pr.asHtml ? '' : `
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:8px 0 2px">
          <input type="checkbox" ${pr.showKey ? 'checked' : ''}
            onchange="window._ibtnSetPrompt('showKey', this.checked)" style="cursor:pointer">
          Kalitni ko'rsatish — <b style="color:var(--accent)">[${_keyShort(ud.actionKey || 'KeyE')}]</b>
        </label>`}
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:2px 0">
          <input type="checkbox" ${pr.requireLook ? 'checked' : ''}
            onchange="window._ibtnSetPrompt('requireLook', this.checked)" style="cursor:pointer">
          Qarash shart — tugmaga qaramasa chiqmaydi
        </label>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:4px;font-family:'Share Tech Mono',monospace">
          "Qarash shart" o'chiq bo'lsa, faqat yaqinlik yetarli.
        </div>
        ` : ''}
      </div>`;
      })())}

      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:#ffaa00;color:#000">MOD</span>Tugma Rejimi</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:4px">
          ${[
            { id:'trigger',  ic:'⚡', name:'TRIGGER',  color:'var(--accent)' },
            { id:'attached', ic:'🔗', name:'ATTACHED', color:'#55ff88' },
            { id:'pickup',   ic:'✋', name:'PICKUP',   color:'#ffaa55' },
          ].map(m => `
            <button onclick="window._ibtnSetMode('${m.id}')"
              style="background:${btnMode === m.id ? m.color+'20' : 'transparent'};
                     border:1px solid ${btnMode === m.id ? m.color : 'var(--border)'};
                     color:${btnMode === m.id ? m.color : 'var(--muted)'};
                     padding:6px 3px;border-radius:3px;cursor:pointer;
                     font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
                     display:flex;flex-direction:column;align-items:center;gap:3px">
              <span style="font-size:14px">${m.ic}</span>
              <span>${m.name}</span>
            </button>
          `).join('')}
        </div>
        <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 6px;background:rgba(0,0,0,.2);border-radius:2px">
          ${btnMode === 'trigger'
            ? '⚡ Tugma turadi. Bosilsa — animatsiya va sound ishlaydi.'
            : btnMode === 'attached'
              ? '🔗 Tugma boshqa obyektga yopishgan — u bilan birga harakatlanadi. Bosilsa animatsiya + sound.'
              : '✋ Bosilsa maqsad predmet ko\'tariladi. Yana bosilsa — tashlanadi.'}
        </div>
      </div>

      <!-- NoScript - raqamga tasir. REJIMDAN TASHQARIDA turadi:
           ilgari u PICKUP bolimi ichida edi va faqat osha rejimda
           korinardi. Holbuki amal tugma bosilishining ENG BOSHIDA
           bajariladi - anim, ovoz, trigger, attached, kamera, spawn,
           teleport - hammasida ishlaydi. Sozlamasi esa korinmasdi. -->
      ${window.buildNoScriptOpHTML ? window.buildNoScriptOpHTML(btn) : ''}

      ${(() => {
        // ── 🧱 TO'QNASHUV — inline / block ────────────────────
        //  Engine `userData.colliderMode` ni shunday o'qiydi (player.js:602):
        //    'inline'  → o'yinchi ichidan o'tib ketadi
        //    boshqasi  → qattiq, to'sadi (engine standarti)
        //  ⚠ Standart BLOCK: `colliderMode` yozilmagan eski tugmalar hozir
        //    ham qattiq. Shuning uchun inspektor ham shuni ko'rsatadi —
        //    aks holda UI yolg'on gapirar va mavjud sahnalar o'zgarardi.
        const cm = (ud.colliderMode === 'inline') ? 'inline' : 'block';
        const opt = (id, ic, name, color) => `
          <button onclick="window._ibtnSetCollider('${id}')"
            style="background:${cm === id ? color + '20' : 'transparent'};
                   border:1px solid ${cm === id ? color : 'var(--border)'};
                   color:${cm === id ? color : 'var(--muted)'};
                   padding:6px 3px;border-radius:3px;cursor:pointer;
                   font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
                   display:flex;flex-direction:column;align-items:center;gap:3px">
            <span style="font-size:14px">${ic}</span><span>${name}</span></button>`;
        return `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:#a078ff;color:#000">COL</span>To'qnashuv</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:4px">
          ${opt('inline', '👻', 'INLINE', '#a078ff')}
          ${opt('block',  '🧱', 'BLOCK',  '#ff6b6b')}
        </div>
        <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 6px;background:rgba(0,0,0,.2);border-radius:2px">
          ${cm === 'inline'
            ? '👻 O\'yinchi ichidan o\'tib ketadi. Bosish baribir ishlaydi.'
            : '🧱 Qattiq — o\'yinchi to\'qnashadi, o\'ta olmaydi. Devor, tutqich, richag uchun.'}
        </div>
      </div>`;
      })()}

      ${btnMode === 'attached' ? `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:#55ff88;color:#001">ATT</span>Yopishtirish Ota-obyekt</div>
        <div class="fr">
          <span class="fl">Ota-obyekt</span>
          <select style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._ibtnAttachTo(this.value || null)">
            <option value="">— hech kim (sahnada) —</option>
            ${otherObjects.map(o =>
              `<option value="${o.userData.id}" ${String(ud.attachedToId) === String(o.userData.id) ? 'selected' : ''}>${o.userData.name}</option>`
            ).join('')}
          </select>
        </div>
        <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.6;font-family:'Share Tech Mono',monospace">
          Tugma tanlangan obyektning bolasi bo'ladi. Ota-obyekt harakatlansa/aylansa, tugma ham u bilan boradi.
        </div>
      </div>
      ` : ''}

      ${btnMode === 'pickup' ? `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:#ffaa55;color:#000">PCK</span>Ko'tarish Sozlamalari</div>
        <div class="fr">
          <span class="fl">Predmet</span>
          <select style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._ibtnSetProp('pickupTargetId', this.value || null)">
            <option value="">— tugmaning o'zi ko'tariladi —</option>
            ${otherObjects.map(o =>
              `<option value="${o.userData.id}" ${String(ud.pickupTargetId) === String(o.userData.id) ? 'selected' : ''}>${o.userData.name}</option>`
            ).join('')}
          </select>
        </div>
        <!-- 🎒 INVENTAR KO'RINISHI — nom + rasm -->
        <div style="border-top:1px solid rgba(255,170,85,.18);margin:7px 0 5px;padding-top:6px">
          <div class="fl" style="color:#ffaa55;margin-bottom:4px">🎒 Inventardagi ko'rinishi</div>
          <div class="fr"><span class="fl">Predmet nomi</span>
            <input value="${_esc(ud.invName || '')}" placeholder="Bo'sh = obyekt nomi"
              style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px;outline:none"
              oninput="window._ibtnSetProp('invName', this.value)">
          </div>
          <div style="display:flex;align-items:center;gap:7px;margin-top:5px">
            <div style="width:46px;height:46px;flex-shrink:0;border:1px solid var(--border);border-radius:3px;
                        background:${ud.invIcon ? `url('${ud.invIcon}') center/contain no-repeat, var(--bg)` : 'var(--bg)'};
                        display:flex;align-items:center;justify-content:center;font-size:17px;color:var(--muted)">
              ${ud.invIcon ? '' : '📦'}
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:3px">
              <button onclick="window._ibtnPickInvIcon()"
                style="padding:4px 6px;border:1px solid #ffaa55;background:rgba(255,170,85,.1);color:#ffaa55;
                       font-size:9px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">
                🖼 ${ud.invIcon ? 'Rasmni almashtirish' : 'Rasm yuklash'}</button>
              ${ud.invIcon ? `<button onclick="window._ibtnClearInvIcon()"
                style="padding:3px 6px;border:1px solid var(--border);background:transparent;color:var(--muted);
                       font-size:9px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">
                ✕ Rasmni olib tashlash</button>` : ''}
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.6;font-family:'Share Tech Mono',monospace">
            Predmet o'yinchi inventariga tushganda katakda AYNAN shu rasm ko'rinadi.
            Rasm sahna bilan saqlanadi (ZIP → <b style="color:#9fe8c0">texture/</b>).
          </div>
        </div>

        <div class="fr"><span class="fl">Tashlash kuchi</span>
          <input type="number" min="1" max="50" step="1" value="${ud.throwForce || 12}"
            style="width:70px;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._ibtnSetProp('throwForce', parseFloat(this.value)||12)">
        </div>
        <div class="fr"><span class="fl">Ushlash masofasi</span>
          <input type="number" min="0.5" max="4" step="0.1" value="${ud.holdDist || 1.5}"
            style="width:70px;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._ibtnSetProp('holdDist', parseFloat(this.value)||1.5)">
          <span style="font-size:9px;color:var(--muted);margin-left:4px">m</span>
        </div>
        <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.6;font-family:'Share Tech Mono',monospace">
          O'yin: <b style="color:#ffaa55">${_keyShort(ud.actionKey || 'KeyE')}</b> — ko'tarish (1-marta), tashlash (2-marta).<br>
          Inventar tayyor bo'lsa — avtomatik integratsiya qilinadi.
        </div>
      </div>
      ` : ''}

      <!-- ── 📦 PREDMET SHARTI ────────────────────────────────
           Hitboxdagi "Predmet Sharti" ning tugma varianti. Farqi:
           hitboxda zonaga KIRISH (yoki predmetni tashlash) tetik edi,
           bu yerda esa BOSISH. 'deliver' (tashlash) yo'li yo'q —
           tugmani bosish uchun o'yinchi shu yerda turadi, ya'ni
           predmet ham qo'lida bo'ladi.                          -->
      ${(() => {
        const ir  = _irMigrate(ud);
        const on  = !!ir.enabled;
        const dn  = ir.onDone || 'consume';
        const S2  = ir.slots || [];
        const cur = ud._irIdx || 0;
        const IS  = "flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);" +
                    "padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";
        const pick = (fn, val, c, ic, title, sub) => `
          <button onclick="window._ibtnIrSet('${fn}','${val}')"
            style="flex:1;text-align:left;background:${c===val?'rgba(255,170,85,.14)':'transparent'};
                   border:1px solid ${c===val?'#ffaa55':'var(--border)'};
                   color:${c===val?'#ffaa55':'var(--muted)'};padding:6px 8px;border-radius:3px;
                   cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;line-height:1.5">
            <b style="font-size:10px">${ic} ${title}</b><br><span style="font-size:8px">${sub}</span></button>`;
        return `
      <div class="comp-block">
        <div class="comp-title" style="cursor:pointer" onclick="window._ibtnIrToggle()">
          <span class="tag" style="background:rgba(255,170,85,.15);color:#ffaa55">ITM</span>
          <span style="flex:1">Predmet Slotlari</span>
          <input type="checkbox" ${on?'checked':''}
                 onclick="event.stopPropagation(); window._ibtnIrToggle();" style="cursor:pointer">
        </div>
        ${on ? `
        ${btnMode === 'pickup' ? `
        <div class="fl" style="font-size:9px;color:#ff6b6b;padding:4px 0;line-height:1.6">
          ⚠ Rejim <b>PICKUP</b> — bu tugmaning o'z vazifasi predmet ko'tarish.
          Predmet slotlari bilan birga ishlatish chalkash bo'ladi: qo'ldagi
          predmet olinadi, so'ng tugma yangisini ko'tarmoqchi bo'ladi.<br>
          Qabul qiluvchi tugma uchun <b style="color:#ffaa55">TRIGGER</b> rejimini tanlang.
        </div>` : ''}
        <div style="font-size:8px;color:var(--muted);line-height:1.6;padding:2px 0 6px;font-family:'Share Tech Mono',monospace">
          O'yinchi predmetlarni <b style="color:#ffaa55">ketma-ket</b> olib kelib beradi.
          Har slotning o'z predmeti va ixtiyoriy animatsiyasi bor.
          Oxirgi slot animatsiyasi <b>tugagach</b> — tugmaning asosiy funksiyasi ishga tushadi.
        </div>
        ${S2.length === 0
          ? `<div style="font-size:9px;color:var(--muted);padding:8px;text-align:center;
                        font-family:'Share Tech Mono',monospace;line-height:1.6">
               Slot yo'q.<br>Pastdan qo'shing va predmet tanlang.
             </div>`
          : S2.map((sl, i) => `
            <div style="margin-bottom:6px;padding:6px 8px;
                        background:${i===cur ? 'rgba(255,170,85,.07)' : 'rgba(255,255,255,.02)'};
                        border:1px solid ${i===cur ? 'rgba(255,170,85,.45)' : 'var(--border)'};
                        border-radius:3px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-size:10px;font-weight:700;font-family:'Share Tech Mono',monospace;
                             color:${i===cur ? '#ffaa55' : 'var(--text)'}">
                  ${i===cur ? '▶ ' : ''}Slot ${i+1}
                </span>
                <button onclick="window._ibtnIrRemoveSlot(${i})"
                  style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:11px;padding:0 4px"
                  title="O'chirish">✕</button>
              </div>
              <div class="fr" style="margin-bottom:3px">
                <span class="fl" style="min-width:44px">Predmet</span>
                <select onchange="window._ibtnIrSetSlot(${i},'itemId', this.value)" style="${IS}">
                  <option value="">— istalgan predmet —</option>
                  ${itemObjects.map(o =>
                    `<option value="${o.userData.id}" ${String(sl.itemId)===String(o.userData.id)?'selected':''}>${_itemIcon(o)} ${_esc(o.userData.name)}</option>`
                  ).join('')}
                </select>
              </div>
              ${sl.sourceName
                ? `<div style="display:flex;justify-content:space-between;align-items:center;font-size:8px;
                               color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:3px;
                               padding:3px 5px;background:rgba(var(--accent2-rgb),.06);border-radius:2px">
                     <span>📄 ${_esc(sl.sourceName)} · ${(sl.duration||0).toFixed(2)}s · ${(sl.keyframes||[]).length} KF</span>
                     <button onclick="window._ibtnIrClearAnim(${i})"
                       style="background:transparent;border:none;color:#f88;cursor:pointer;font-size:10px;padding:0 3px"
                       title="O'chirish">✕</button>
                   </div>
                   <div style="display:flex;gap:4px;align-items:center;margin-top:3px">
                     <span style="font-size:9px;color:var(--muted);min-width:44px">Maqsad:</span>
                     <select style="${IS};font-size:9px"
                       onchange="window._ibtnIrSetSlot(${i},'targetObjectId', this.value || null)">
                       <option value="">— tanlang —</option>
                       ${otherObjects.map(o =>
                         `<option value="${o.userData.id}" ${String(sl.targetObjectId)===String(o.userData.id)?'selected':''}>${_esc(o.userData.name)}</option>`
                       ).join('')}
                     </select>
                   </div>
                   <div style="display:flex;gap:4px;align-items:center;margin-top:3px">
                     <span style="font-size:9px;color:var(--muted);min-width:44px">Tezlik:</span>
                     <input type="number" min="0.1" max="5" step="0.1" value="${sl.speed || 1}"
                       style="width:60px;font-family:'Share Tech Mono',monospace;font-size:9px;background:var(--bg);
                              border:1px solid var(--border);color:var(--text);padding:1px 4px;border-radius:2px"
                       oninput="window._ibtnIrSetSlot(${i},'speed', parseFloat(this.value) || 1)">
                     <span style="font-size:9px;color:var(--muted)">×</span>
                   </div>`
                : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
                     <button onclick="window._ibtnIrPickTimeline(${i})"
                       style="background:rgba(var(--accent4-rgb),.08);border:1px dashed rgba(var(--accent4-rgb),.4);
                              color:var(--accent4);padding:5px 3px;border-radius:2px;cursor:pointer;
                              font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700">
                       🎬 Timeline
                     </button>
                     <button onclick="window._ibtnIrPickAnim(${i})"
                       style="background:rgba(var(--accent2-rgb),.08);border:1px dashed rgba(var(--accent2-rgb),.4);
                              color:var(--accent2);padding:5px 3px;border-radius:2px;cursor:pointer;
                              font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700">
                       📂 JSON
                     </button>
                   </div>
                   <div style="font-size:8px;color:var(--muted);margin-top:3px;line-height:1.5;
                               padding:3px 4px;background:rgba(0,0,0,.15);border-radius:2px;
                               font-family:'Share Tech Mono',monospace">
                     💡 Animatsiya <b>majburiy emas</b> — predmet berilishi bilan keyingi slotga o'tadi.
                   </div>`}
            </div>`).join('')}
        <button onclick="window._ibtnIrAddSlot()"
          style="width:100%;background:rgba(255,170,85,.07);border:1px dashed rgba(255,170,85,.4);
                 color:#ffaa55;padding:6px;border-radius:3px;cursor:pointer;
                 font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;margin-top:4px">
          + Predmet sloti qo'shish
        </button>
        <div class="fl" style="margin:10px 0 4px">Berilgandan keyin predmet</div>
        <div style="display:flex;gap:4px">
          ${pick('onDone','consume', dn,'💨','YO\'QOLSIN','Qo\'ldan chiqadi va ko\'rinmas bo\'ladi')}
          ${pick('onDone','keep',    dn,'📌','QOLSIN','Qo\'lda turaveradi, faqat kalit vazifasi')}
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:8px 0 2px">
          <input type="checkbox" ${ir.loop !== false ? 'checked' : ''}
            onchange="window._ibtnIrSet('loop', this.checked)" style="cursor:pointer">
          Oxirgi slotdan keyin boshiga qaytsin (takrorlansin)
        </label>
        ${S2.length ? `
        <div style="margin-top:6px;padding:5px 8px;background:rgba(0,0,0,.25);border-radius:3px;border:1px solid var(--border)">
          <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
            Joriy: <span style="color:#ffaa55;font-weight:700">Slot ${Math.min(cur+1, S2.length)} / ${S2.length}</span>
          </div>
          <button onclick="window._ibtnIrReset()"
            style="margin-top:4px;background:transparent;border:1px solid var(--border);color:var(--muted);
                   padding:3px 8px;border-radius:2px;cursor:pointer;font-size:9px;
                   font-family:'Share Tech Mono',monospace">↺ Boshiga qaytarish</button>
        </div>` : ''}
        <div class="fl" style="font-size:8px;color:var(--muted);line-height:1.7;padding:6px 0 0">
          🔒 Ketma-ketlik tugamaguncha tugmaning asosiy funksiyasi <b>kutadi</b>.
          Predmetsiz bosilsa hech nima bo'lmaydi va <b>hech qanday xabar chiqmaydi</b>.
          Oxirgi slot to'lgach — asosiy funksiya ishga tushadi va tugma erkin bo'ladi
          ${ir.loop !== false ? '(takrorlash yoqiq — yana boshidan predmet kutadi)' : ''}.
          ${dn === 'consume' ? '<br>💨 Predmet yo\'qolganda to\'qnashuvi ham o\'chadi. <b>Stop</b> bosilsa qaytadi.' : ''}
        </div>` : `
        <div class="fl" style="font-size:9px;color:var(--muted);padding:3px 0;line-height:1.6">
          Yoqilsa — o'yinchi predmetlarni ketma-ket olib kelib beradi.
          Har slotga o'z predmeti va ixtiyoriy animatsiyasi qo'yiladi.
        </div>`}
      </div>`;
      })()}

      ${btnMode !== 'pickup' ? `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:var(--accent);color:#001">RUN</span>Ijro usuli</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;margin-top:4px">
          <button onclick="window._ibtnSetProp('playMode','single');updateInspector()"
            style="text-align:left;background:${(ud.playMode||'single')==='single' ? 'rgba(var(--accent-rgb),.15)' : 'transparent'};
                   border:1px solid ${(ud.playMode||'single')==='single' ? 'var(--accent)' : 'var(--border)'};
                   color:${(ud.playMode||'single')==='single' ? 'var(--accent)' : 'var(--muted)'};
                   padding:6px 8px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700">
            🔘 Bittalab — har bosishda navbatdagisi
          </button>
          <button onclick="window._ibtnSetProp('playMode','all_seq');updateInspector()"
            style="text-align:left;background:${ud.playMode==='all_seq' ? 'rgba(var(--accent2-rgb),.15)' : 'transparent'};
                   border:1px solid ${ud.playMode==='all_seq' ? 'var(--accent2)' : 'var(--border)'};
                   color:${ud.playMode==='all_seq' ? 'var(--accent2)' : 'var(--muted)'};
                   padding:6px 8px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700">
            ⏭ All — Ketma-ket (biri tugagach keyingisi)
          </button>
          <button onclick="window._ibtnSetProp('playMode','all_parallel');updateInspector()"
            style="text-align:left;background:${ud.playMode==='all_parallel' ? 'rgba(var(--accent3-rgb),.15)' : 'transparent'};
                   border:1px solid ${ud.playMode==='all_parallel' ? 'var(--accent3)' : 'var(--border)'};
                   color:${ud.playMode==='all_parallel' ? 'var(--accent3)' : 'var(--muted)'};
                   padding:6px 8px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700">
            ⚡ All — Bir vaqtda (hamma timeline birdan)
          </button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px">
          <button onclick="window._ibtnSetProp('loopPlay',true);updateInspector()"
            style="background:${ud.loopPlay ? 'rgba(var(--accent4-rgb),.18)' : 'transparent'};
                   border:1px solid ${ud.loopPlay ? 'var(--accent4)' : 'var(--border)'};
                   color:${ud.loopPlay ? 'var(--accent4)' : 'var(--muted)'};
                   padding:6px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700">↻ Loop</button>
          <button onclick="window._ibtnSetProp('loopPlay',false);updateInspector()"
            style="background:${!ud.loopPlay ? 'rgba(var(--accent-rgb),.15)' : 'transparent'};
                   border:1px solid ${!ud.loopPlay ? 'var(--accent)' : 'var(--border)'};
                   color:${!ud.loopPlay ? 'var(--accent)' : 'var(--muted)'};
                   padding:6px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700">▶ Oddiy</button>
        </div>
        ${ud.loopPlay ? `
        <div style="margin-top:6px">
          <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin-bottom:3px">
            ↻ LOOP KETAYOTGANDA QAYTA BOSILSA</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            ${[['stop', "⏹ To'xtaydi"], ['restart', '🔄 Boshidan']].map(([k, lbl]) => `
              <button onclick="window._ibtnSetProp('loopRetrigger','${k}');updateInspector()"
                style="background:${(ud.loopRetrigger || 'stop') === k ? 'rgba(var(--accent4-rgb),.18)' : 'transparent'};
                border:1px solid ${(ud.loopRetrigger || 'stop') === k ? 'var(--accent4)' : 'var(--border)'};
                color:${(ud.loopRetrigger || 'stop') === k ? 'var(--accent4)' : 'var(--muted)'};
                padding:5px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;
                font-size:10px;font-weight:700">${lbl}</button>`).join('')}
          </div>
          <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.55;font-family:'Share Tech Mono',monospace">
            ⏹ <b>To'xtaydi</b> — bir bosish yoqadi, ikkinchisi o'chiradi.<br>
            🔄 <b>Boshidan</b> — har bosishda animatsiya nolinchi kadrdan qayta yuradi.
          </div>
        </div>` : ''}
        <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.55;font-family:'Share Tech Mono',monospace">
          ${ud.playMode==='all_parallel'
            ? 'Bosilganda barcha animatsiyalar bir vaqtda ishga tushadi.'
            : ud.playMode==='all_seq'
              ? 'Bosilganda animatsiyalar qatorma-qator ijro etiladi.'
              : 'Har bosishda navbatdagi bitta animatsiya (quyidagi loop/ping-pong tartibi bo\'yicha).'}
          ${ud.loopPlay ? ' <b style="color:var(--accent4)">Loop</b> — takrorlanadi (yana bossangiz to\'xtaydi).' : ' <b style="color:var(--accent)">Oddiy</b> — bir marta.'}
        </div>
      </div>

      ${(ud.playMode||'single')==='single' ? `
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:var(--accent4);color:#001">SEQ</span>Ketma-ketlik Rejimi</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
          <button onclick="window._ibtnSetProp('mode','loop');updateInspector()"
            style="background:${ud.mode === 'loop' ? 'rgba(var(--accent-rgb),.15)' : 'transparent'};
                   border:1px solid ${ud.mode === 'loop' ? 'var(--accent)' : 'var(--border)'};
                   color:${ud.mode === 'loop' ? 'var(--accent)' : 'var(--muted)'};
                   padding:6px;border-radius:3px;cursor:pointer;
                   font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700">
            ↻ LOOP
          </button>
          <button onclick="window._ibtnSetProp('mode','pingpong');updateInspector()"
            style="background:${ud.mode === 'pingpong' ? 'rgba(var(--accent4-rgb),.15)' : 'transparent'};
                   border:1px solid ${ud.mode === 'pingpong' ? 'var(--accent4)' : 'var(--border)'};
                   color:${ud.mode === 'pingpong' ? 'var(--accent4)' : 'var(--muted)'};
                   padding:6px;border-radius:3px;cursor:pointer;
                   font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700">
            ⇄ PING-PONG
          </button>
        </div>
        <div style="margin-top:6px;padding:5px 8px;background:rgba(0,0,0,.25);border-radius:3px;border:1px solid var(--border)">
          <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
            Joriy: <span style="color:var(--accent);font-weight:700">Slot ${(ud._currentIdx||0)+1} / ${slots.length}</span>
            ${ud.mode === 'pingpong' ? `<span style="color:var(--accent4);margin-left:6px">${(ud._direction||1) > 0 ? '→' : '←'}</span>` : ''}
          </div>
          <button onclick="window._ibtnReset()"
            style="margin-top:4px;background:transparent;border:1px solid var(--border);color:var(--muted);
                   padding:3px 8px;border-radius:2px;cursor:pointer;font-size:9px;
                   font-family:'Share Tech Mono',monospace">
            ↺ Ko'rsatkichni tiklash
          </button>
        </div>
      </div>

      ` : ''}

      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:var(--accent2);color:#000">ANM</span>Animatsiya + 🔊 Sound Slotlari</div>
        ${slots.length === 0
          ? `<div style="font-size:9px;color:var(--muted);padding:8px;text-align:center;font-family:'Share Tech Mono',monospace;line-height:1.6">
              Slot yo'q.<br>Timeline'dan yoki JSON fayldan tanlang.
             </div>`
          : slots.map((slot, idx) => `
            <div style="margin-bottom:6px;padding:6px 8px;background:${idx === (ud._currentIdx||0) ? 'rgba(var(--accent-rgb),.06)' : 'rgba(255,255,255,.02)'};
                        border:1px solid ${idx === (ud._currentIdx||0) ? 'rgba(var(--accent-rgb),.4)' : 'var(--border)'};
                        border-radius:3px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-size:10px;color:${idx === (ud._currentIdx||0) ? 'var(--accent)' : 'var(--text)'};font-family:'Share Tech Mono',monospace;font-weight:700">
                  ${idx === (ud._currentIdx||0) ? '▶ ' : ''}Animatsiya ${idx + 1}
                </span>
                <button onclick="window._ibtnRemoveSlot(${idx})"
                  style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:11px;padding:0 4px"
                  title="O'chirish">✕</button>
              </div>
              ${slot.sourceName
                ? `<div style="display:flex;justify-content:space-between;align-items:center;font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:3px;padding:3px 5px;background:rgba(var(--accent2-rgb),.06);border-radius:2px">
                     <span>📄 ${slot.sourceName} · ${(slot.duration || 0).toFixed(2)}s · ${(slot.keyframes || []).length} KF</span>
                     <button onclick="window._ibtnClearAnim(${idx})"
                       style="background:transparent;border:none;color:#f88;cursor:pointer;font-size:10px;padding:0 3px" title="O'chirish">✕</button>
                   </div>`
                : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:3px">
                     <button onclick="window._ibtnPickTimeline(${idx})"
                       style="background:rgba(var(--accent4-rgb),.08);border:1px dashed rgba(var(--accent4-rgb),.4);
                              color:var(--accent4);padding:5px 3px;border-radius:2px;cursor:pointer;
                              font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700">
                       🎬 Timeline
                     </button>
                     <button onclick="window._ibtnPickAnim(${idx})"
                       style="background:rgba(var(--accent2-rgb),.08);border:1px dashed rgba(var(--accent2-rgb),.4);
                              color:var(--accent2);padding:5px 3px;border-radius:2px;cursor:pointer;
                              font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700">
                       📂 JSON
                     </button>
                   </div>`}
              ${slot.soundUrl
                ? `<div style="display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#88ff88;font-family:'Share Tech Mono',monospace;margin-bottom:3px;padding:2px 4px;background:rgba(85,255,136,.05);border-radius:2px">
                     <span>🔊 ${slot.soundName || 'sound'}</span>
                     <button onclick="window._ibtnClearSound(${idx})"
                       style="background:transparent;border:none;color:#f88;cursor:pointer;font-size:10px;padding:0 3px" title="O'chirish">✕</button>
                   </div>`
                : `<button onclick="window._ibtnPickSound(${idx})"
                     style="width:100%;background:rgba(85,255,136,.06);border:1px dashed rgba(85,255,136,.35);
                            color:#88ff88;padding:3px;border-radius:2px;cursor:pointer;
                            font-family:'Share Tech Mono',monospace;font-size:9px;margin-bottom:3px">
                     🔊 Sound qo'shish (ixtiyoriy)
                   </button>`}
              ${slot.sourceName ? `
              <div style="display:flex;gap:4px;align-items:center;margin-top:3px">
                <span style="font-size:9px;color:var(--muted);min-width:44px">Maqsad:</span>
                <select style="flex:1;font-family:'Share Tech Mono',monospace;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:1px 3px;border-radius:2px"
                  oninput="window._ibtnSetSlotProp(${idx},'targetObjectId', this.value || null)">
                  <option value="">— tanlang —</option>
                  ${otherObjects.map(o =>
                    `<option value="${o.userData.id}" ${String(slot.targetObjectId) === String(o.userData.id) ? 'selected' : ''}>${o.userData.name}</option>`
                  ).join('')}
                </select>
              </div>
              <div style="display:flex;gap:4px;align-items:center;margin-top:3px">
                <span style="font-size:9px;color:var(--muted);min-width:44px">Tezlik:</span>
                <input type="number" min="0.1" max="5" step="0.1" value="${slot.speed || 1}"
                  style="width:60px;font-family:'Share Tech Mono',monospace;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:1px 4px;border-radius:2px"
                  oninput="window._ibtnSetSlotProp(${idx},'speed', parseFloat(this.value) || 1)">
                <span style="font-size:9px;color:var(--muted)">×</span>
              </div>
              ` : `
              <div style="font-size:8px;color:var(--muted);margin-top:3px;font-family:'Share Tech Mono',monospace;line-height:1.5;padding:3px 4px;background:rgba(0,0,0,.15);border-radius:2px">
                💡 Bo'sh slot bosilsa — ijro etilayotgan musiqa <b style="color:#ff8888">to'xtaydi</b>
              </div>
              `}
            </div>
          `).join('')
        }
        <button onclick="window._ibtnAddSlot()"
          style="width:100%;background:rgba(var(--accent-rgb),.06);border:1px dashed rgba(var(--accent-rgb),.35);
                 color:var(--accent);padding:6px;border-radius:3px;cursor:pointer;
                 font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;margin-top:4px">
          + Slot qo'shish
        </button>
      </div>
      ` : ''}

      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer" onclick="window._ibtnTogglePM()">
          <span style="font-size:9px;color:var(--accent4);letter-spacing:1px;font-family:'Share Tech Mono',monospace;flex:1">👤 O'YINCHI MODELINI ALMASHTIRISH</span>
          <input type="checkbox" ${(ud.playerModel&&ud.playerModel.enabled)?'checked':''} onclick="event.stopPropagation();window._ibtnTogglePM();" style="cursor:pointer">
        </div>
        ${(ud.playerModel&&ud.playerModel.enabled&&window._pmBlock) ? window._pmBlock(ud.playerModel, 'window._ibtnSetPM') : ''}
        ${(ud.playerModel&&ud.playerModel.enabled&&(ud.playerModel.mode||'temp')==='temp') ? `
        <div style="font-size:8px;color:#66ccff;margin-top:4px;line-height:1.5;font-family:'Share Tech Mono',monospace;
          padding:5px 7px;background:rgba(102,204,255,.06);border:1px solid rgba(102,204,255,.25);border-radius:2px">
          ⓘ Tugmada "chiqish" yo'q — shuning uchun ⏱ VAQTINCHALIK <b>toggle</b> bo'ladi:
          1-bosish → model o'zgaradi, 2-bosish → qaytadi.
        </div>` : ''}
      </div>

      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer" onclick="window._ibtnToggleTP()">
          <span style="font-size:9px;color:var(--accent);letter-spacing:1px;font-family:'Share Tech Mono',monospace;flex:1">🌀 BOSHQA JOYGA JO'NATISH</span>
          <input type="checkbox" ${(ud.spawnRedirect&&ud.spawnRedirect.enabled)?'checked':''} onclick="event.stopPropagation();window._ibtnToggleTP();" style="cursor:pointer">
        </div>
        ${(ud.spawnRedirect&&ud.spawnRedirect.enabled)?(()=>{
          const sp=objects.filter(x=>x.userData&&x.userData.id!=null&&!x.userData.isPlayerObj&&!x.userData.isInteractiveBtn);
          const c=ud.spawnRedirect;
          return `
          <div class="fr"><span class="fl">Qayerga</span>
            <select class="fv" onchange="window._ibtnSetTP('spawnId', this.value||null)">
              <option value="">— tanlang —</option>
              ${sp.map(x=>`<option value="${x.userData.id}" ${String(c.spawnId)===String(x.userData.id)?'selected':''}>${x.userData.name}</option>`).join('')}
            </select></div>
          <div class="fr"><span class="fl">Oldin animatsiya</span>
            <input type="checkbox" ${c.preAnimEnabled?'checked':''} onchange="window._ibtnSetTP('preAnimEnabled', this.checked)"></div>
          ${c.preAnimEnabled?`
          <div class="fr"><span class="fl">Turi</span>
            <select class="fv" onchange="window._ibtnSetTP('preAnimType', this.value)">
              <option value="fade"   ${(c.preAnimType||'fade')==='fade'?'selected':''}>🌑 So'nish (fade)</option>
              <option value="html"   ${c.preAnimType==='html'?'selected':''}>🖥 HTML sahifa</option>
              <option value="camera" ${c.preAnimType==='camera'?'selected':''}>🎥 Kamera</option>
            </select></div>
          <div class="fr"><span class="fl">Davomiyligi (s)</span>
            <input class="fv" type="number" step="0.1" min="0.1" value="${(c.preAnimDuration??0.8).toFixed(1)}"
              oninput="window._ibtnSetTP('preAnimDuration', Math.max(0.1, parseFloat(this.value)||0.8))"></div>
          ${(c.preAnimType||'fade')==='fade'?`
          <div class="fr"><span class="fl">Rang</span>
            <input type="color" value="${c.preAnimColor||'#000000'}" oninput="window._ibtnSetTP('preAnimColor', this.value)"
              style="width:100%;height:22px;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer"></div>`:''}

          ${c.preAnimType==='html'?`
          <div style="font-size:9px;color:var(--muted);margin:5px 0 3px;font-family:'Share Tech Mono',monospace">HTML SAHIFA</div>
          <textarea oninput="window._ibtnSetTP('preAnimHtml', this.value)" spellcheck="false"
            style="width:100%;min-height:80px;background:rgba(0,0,0,.4);border:1px solid var(--border);
            color:#9fe8c0;border-radius:3px;padding:6px 8px;font-family:'Share Tech Mono',monospace;
            font-size:11px;resize:vertical;outline:none;line-height:1.45;box-sizing:border-box"
            >${(c.preAnimHtml || '').replace(/</g,'&lt;')}</textarea>
          <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.5;font-family:'Share Tech Mono',monospace">
            Har qanday HTML: matn, rasm, CSS. Qorong'i fon ustida markazda ko'rsatiladi.<br>
            <span style="color:var(--border)">Loading screen, hikoya matni, logo uchun.</span>
          </div>`:''}

          ${c.preAnimType==='camera'?(()=>{
            const src  = c.preAnimCameraSource || 'spawn';
            const cams = objects.filter(x=>x.userData&&x.userData.isCamera);
            const needsCam = (src==='object' || src==='timeline' || src==='imported');
            return `
          <div class="fr"><span class="fl">Kamera manbai</span>
            <select class="fv" onchange="window._ibtnSetTP('preAnimCameraSource', this.value)">
              <option value="spawn"    ${src==='spawn'   ?'selected':''}>🎯 Nishon blokka uchish</option>
              <option value="object"   ${src==='object'  ?'selected':''}>📹 Kamera obyektiga</option>
              <option value="timeline" ${src==='timeline'?'selected':''}>🎬 Kamera + Timeline</option>
              <option value="imported" ${src==='imported'?'selected':''}>📥 Kamera + Import .json</option>
            </select></div>

          ${needsCam ? (!cams.length
            ? `<div style="font-size:8px;color:#ff8844;margin-top:3px;
                 font-family:'Share Tech Mono',monospace">⚠ Sahnada kamera yo'q.</div>`
            : `<div class="fr"><span class="fl">Kamera</span>
                 <select class="fv" onchange="window._ibtnSetTP('preAnimCameraId', this.value||null)">
                   <option value="">— tanlang —</option>
                   ${cams.map(x=>`<option value="${x.userData.id}" ${String(c.preAnimCameraId)===String(x.userData.id)?'selected':''}>📹 ${x.userData.name}</option>`).join('')}
                 </select></div>`) : ''}

          ${src==='spawn'?`
          <div style="font-size:8px;color:var(--accent3);margin-top:4px;line-height:1.5;font-family:'Share Tech Mono',monospace;
            padding:5px 7px;background:rgba(var(--accent3-rgb),.06);border:1px solid rgba(var(--accent3-rgb),.25);border-radius:2px">
            🎯 Kamera nishon blokdan ozgina narida to'xtaydi va butun yo'l davomida <b>unga qaraydi</b>.
          </div>`:''}

          ${src==='timeline'?`
          <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.5;font-family:'Share Tech Mono',monospace">
            Kamera faollashadi va global <b>Timeline</b> oldinga o'ynaydi. Timeline tugagach teleport bo'ladi.<br>
            <span style="color:var(--border)">Timeline bo'sh bo'lsa — fade orqali teleport qilinadi.</span>
          </div>`:''}

          ${src==='imported'?`
          <div style="display:flex;align-items:center;gap:5px;margin-top:5px">
            <button onclick="window._ibtnImportPreAnimKf()"
              style="flex:1;background:rgba(var(--accent-rgb),.1);border:1px solid rgba(var(--accent-rgb),.4);color:var(--accent);
              font-size:9px;padding:3px 7px;border-radius:3px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">
              📥 .json yuklash
            </button>
            ${(c.preAnimKeyframes&&c.preAnimKeyframes.length)?`
            <button onclick="window._ibtnClearPreAnimKf()" title="O'chirish"
              style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);
              font-size:9px;padding:3px 7px;border-radius:3px;cursor:pointer">✕</button>`:''}
          </div>
          <div style="font-size:8px;margin-top:4px;line-height:1.5;font-family:'Share Tech Mono',monospace;
            color:${(c.preAnimKeyframes&&c.preAnimKeyframes.length)?'var(--accent3)':'#ff8844'}">
            ${(c.preAnimKeyframes&&c.preAnimKeyframes.length)
              ? `✅ ${c.preAnimKfSourceName||'import.json'} — ${c.preAnimKeyframes.length} ta keyframe`
              : '⚠ Keyframe yuklanmagan — fade orqali teleport qilinadi.'}
          </div>
          <div style="font-size:8px;color:var(--muted);margin-top:3px;line-height:1.5;font-family:'Share Tech Mono',monospace">
            <span style="color:var(--border)">Object-Only Export (.json) formatidagi kamera yo'li.</span>
          </div>`:''}
          `;
          })():''}
          `:''}
          <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
            Hitboxdagi <b>_teleport</b> funksiyasi shu faylga 1ga1 ko'chirilgan.
          </div>`;
        })():''}
      </div>

      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer" onclick="window._ibtnToggleCA()">
          <span style="font-size:9px;color:var(--accent2);letter-spacing:1px;font-family:'Share Tech Mono',monospace;flex:1">🎥 KAMERA ANIMATSIYASI</span>
          <input type="checkbox" ${(ud.cameraAnim&&ud.cameraAnim.enabled)?'checked':''} onclick="event.stopPropagation();window._ibtnToggleCA();" style="cursor:pointer">
        </div>
        ${(ud.cameraAnim&&ud.cameraAnim.enabled)?(()=>{
          const cams=objects.filter(x=>x.userData&&x.userData.isCamera);
          const c=ud.cameraAnim;
          if(!cams.length) return `<div style="font-size:9px;color:#ff8844;font-family:'Share Tech Mono',monospace;line-height:1.5">
            ⚠ Sahnada kamera yo'q.<br><span style="color:var(--border)">Assets → 🎥 Kamera qo'shing.</span></div>`;
          return `
          <div class="fr"><span class="fl">Kamera</span>
            <select class="fv" onchange="window._ibtnSetCA('cameraId', this.value||null)">
              <option value="">— tanlang —</option>
              ${cams.map(x=>`<option value="${x.userData.id}" ${String(c.cameraId)===String(x.userData.id)?'selected':''}>📹 ${x.userData.name}</option>`).join('')}
            </select></div>
          <div class="fr"><span class="fl">O'tish</span>
            <select class="fv" onchange="window._ibtnSetCA('transitionMode', this.value)">
              <option value="smooth"  ${(c.transitionMode||'smooth')==='smooth'?'selected':''}>🌊 Silliq</option>
              <option value="instant" ${c.transitionMode==='instant'?'selected':''}>⚡ Darhol</option>
            </select></div>
          ${(c.transitionMode||'smooth')==='smooth'?`
          <div class="fr"><span class="fl">Davomiyligi (s)</span>
            <input class="fv" type="number" step="0.5" min="0.1" value="${(c.duration??1.5).toFixed(1)}"
              oninput="window._ibtnSetCA('duration', Math.max(0.1, parseFloat(this.value)||1.5))"></div>`:''}
          <div class="fr"><span class="fl">Yo'l davom etsin</span>
            <input type="checkbox" ${c.continuePath!==false?'checked':''} onchange="window._ibtnSetCA('continuePath', this.checked)"></div>
          <div class="fr"><span class="fl">Oyinchiga qaytsin</span>
            <input type="checkbox" ${c.returnToPlayer!==false?'checked':''} onchange="window._ibtnSetCA('returnToPlayer', this.checked)"></div>
          <div class="fr"><span class="fl">Harakat qotsin</span>
            <input type="checkbox" ${c.lockPlayer!==false?'checked':''} onchange="window._ibtnSetCA('lockPlayer', this.checked)"></div>
          <div class="fr"><span class="fl">Oyinchi yashirinsin</span>
            <input type="checkbox" ${c.hidePlayer?'checked':''} onchange="window._ibtnSetCA('hidePlayer', this.checked)"></div>
          <div class="fr"><span class="fl">Kamera yashirinsin</span>
            <input type="checkbox" ${c.hideCameraAlways?'checked':''} onchange="window._ibtnSetCA('hideCameraAlways', this.checked)"></div>

          ${c.continuePath!==false?`
          <div style="margin-top:6px;border-top:1px solid var(--border);padding-top:5px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:9px;color:#ff3b6b;font-family:'Share Tech Mono',monospace;letter-spacing:1px">🔒 BLOKLASH (to'xtash)</span>
              <button onclick="window._ibtnCamPickBlockOnTimeline()"
                style="background:rgba(255,59,107,.1);border:1px solid rgba(255,59,107,.4);color:#ff3b6b;font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">
                🎯 Timelineда tanlash
              </button>
            </div>
            ${(c.blocks && c.blocks.length) ? c.blocks.slice().sort((x,y)=>x.time-y.time).map(blk => `
              <div style="margin:3px 0;border:1px solid ${blk.loop?'rgba(var(--accent-rgb),.35)':'var(--border)'};border-radius:4px;padding:3px 4px">
                <div class="fr" style="align-items:center;gap:4px">
                  <span class="fl" style="font-size:9px;min-width:52px;color:${blk.loop?'var(--accent)':'#ff3b6b'}">${blk.loop?'🔁':'⏸'} ${(blk.time||0).toFixed(2)}s</span>
                  <input readonly data-cur="${blk.key ? window._friendlyKey(blk.key) : (blk.loop?'⌨ sikl':'⌨ tugma')}"
                    value="${blk.key ? window._friendlyKey(blk.key) : (blk.loop?'⌨ sikl':'⌨ tugma')}"
                    onfocus="this.value='bosing...'"
                    onblur="this.value=this.getAttribute('data-cur')"
                    onkeydown="event.preventDefault();event.stopPropagation();window._ibtnCamSetBlockKey(${blk.time},event.code);this.blur();"
                    title="${blk.loop?'Sikl tugmasi (bumerang: orqaga-oldinga)':'Davom etish tugmasi'} (bosib klaviaturadan yozing)"
                    style="flex:1;text-align:center;cursor:pointer;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 0">
                  <button onclick="window._ibtnCamToggleLoop(${blk.time})" title="Sikl (loop) rejimini yoqish/o'chirish"
                    style="background:${blk.loop?'rgba(var(--accent-rgb),.18)':'none'};border:1px solid ${blk.loop?'var(--accent)':'var(--border)'};color:${blk.loop?'var(--accent)':'var(--muted)'};cursor:pointer;font-size:10px;padding:1px 5px;border-radius:2px">🔁</button>
                  <button onclick="window._ibtnCamToggleBlock(${blk.time},false)" title="Blokni o'chirish"
                    style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);cursor:pointer;font-size:9px;padding:1px 5px;border-radius:2px">✕</button>
                </div>
                ${blk.loop ? `
                <div class="fr" style="align-items:center;gap:4px;margin-top:3px">
                  <span class="fl" style="font-size:9px;min-width:52px;color:var(--accent)">↩ qaytish</span>
                  <input type="number" step="0.05" min="0" value="${(blk.loopBack||0).toFixed(2)}"
                    onchange="window._ibtnCamSetLoopBack(${blk.time},parseFloat(this.value)||0)"
                    title="Sikl boshlanish vaqti — bu vaqtga qaytib segment qayta o'ynaydi"
                    style="width:54px;text-align:center;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 0">
                  <input readonly data-cur="${blk.exitKey ? window._friendlyKey(blk.exitKey) : '⌨ davom'}"
                    value="${blk.exitKey ? window._friendlyKey(blk.exitKey) : '⌨ davom'}"
                    onfocus="this.value='bosing...'"
                    onblur="this.value=this.getAttribute('data-cur')"
                    onkeydown="event.preventDefault();event.stopPropagation();window._ibtnCamSetExitKey(${blk.time},event.code);this.blur();"
                    title="Davom tugmasi — bosilsa oldinga (5 ga) o'tadi"
                    style="flex:1;text-align:center;cursor:pointer;font-size:9px;background:var(--bg);border:1px solid rgba(var(--accent2-rgb),.4);color:var(--accent2);border-radius:3px;padding:2px 0">
                </div>` : ''}
              </div>`).join('') : `
              <div style="font-size:9px;color:var(--muted);font-style:italic;padding:2px 0">Blok yo'q — "Timelineда tanlash" bilan qo'shing</div>`}
            <div style="font-size:8px;color:var(--muted);line-height:1.4;margin-top:3px">
              Belgilangan key'ga yetganda kamera animatsiyasi <b style="color:#ff3b6b">to'xtaydi</b>. Davom etish uchun <b>⌨ tugma</b> bosiladi.<br>
              <b style="color:var(--accent)">🔁 Sikl</b> — <b>sikl</b> tugma bossa segment <b>orqaga</b> (t→<b>↩ qaytish</b>) so'ng o'zi <b>oldinga</b> qaytib o'ynaydi (masalan 4→3→4) va yana to'xtaydi; <b style="color:var(--accent2)">davom</b> tugma bossa oldinga (5 ga) o'tadi.
            </div>
          </div>`:''}

          <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
            <b style="color:var(--accent2)">Silliq</b> — kamera davomiylik ichida silliq lerp qiladi.<br>
            <b style="color:var(--accent2)">Darhol</b> — bir kadrda to'g'ridan-to'g'ri kamera ko'ziga o'tadi.<br>
            <b style="color:var(--accent2)">Yo'l davom etsin</b> — o'tishdan keyin kamera faollashib Timeline o'ynaydi.<br>
            <b style="color:var(--accent2)">Harakat qotsin</b> — cutscene paytida WASD/sichqoncha ishlamaydi.<br>
            <b style="color:var(--accent2)">Kamera yashirinsin</b> — kamera mesh editorda ham ko'rinmasin.
          </div>`;
        })():''}
      </div>

      <!-- ── 🔴 FINISH — o'yinni tugatish ─────────────────────── -->
      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer" onclick="window._ibtnToggleFinish()">
          <span style="font-size:9px;color:#ff3355;letter-spacing:1px;font-family:'Share Tech Mono',monospace;flex:1">🔴 FINISH (O'YINNI TUGATISH)</span>
          <input type="checkbox" ${(ud.finishGame&&ud.finishGame.enabled)?'checked':''} onclick="event.stopPropagation();window._ibtnToggleFinish();" style="cursor:pointer">
        </div>
        ${(ud.finishGame&&ud.finishGame.enabled)?(()=>{
          const fins = objects.filter(x=>x.userData&&x.userData.isFinishBlock);
          if(!fins.length) return `<div style="font-size:9px;color:#ff8844;font-family:'Share Tech Mono',monospace;line-height:1.5">
            ⚠ Sahnada Finish bloki yo'q.<br><span style="color:var(--border)">Assets → 🔴 Finish qo'shing.</span></div>`;
          return `
          <div class="fr">
            <span class="fl">Finish blok</span>
            <select class="fv" onchange="window._ibtnSetFinish('targetId', this.value||null)">
              <option value="">— birinchisi —</option>
              ${fins.map(o=>`<option value="${o.userData.id}"
                ${String(ud.finishGame.targetId)===String(o.userData.id)?'selected':''}
                >${o.userData.name}</option>`).join('')}
            </select>
          </div>
          <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.6;font-family:'Share Tech Mono',monospace">
            Tugma bosilganda finish bloki ishga tushadi — outro
            ko'rsatiladi va sozlangan sahifaga o'tiladi.<br>
            <b style="color:#ffcc44">⚠ O'tkazish faqat ▶ O'YNA rejimida.</b>
          </div>`;
        })():''}
      </div>

      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer" onclick="window._ibtnTogglePC()">
          <span style="font-size:9px;color:var(--accent);letter-spacing:1px;font-family:'Share Tech Mono',monospace;flex:1">💻 PC (QUVVAT)</span>
          <input type="checkbox" ${(ud.pcBlock&&ud.pcBlock.enabled)?'checked':''} onclick="event.stopPropagation();window._ibtnTogglePC();" style="cursor:pointer">
        </div>
        ${(ud.pcBlock&&ud.pcBlock.enabled)?(()=>{
          const pcs=objects.filter(x=>x.userData&&x.userData.isPCBlock);
          if(!pcs.length) return `<div style="font-size:9px;color:#ff8844;font-family:'Share Tech Mono',monospace;line-height:1.5">
            ⚠ Sahnada PC yo'q.<br><span style="color:var(--border)">Assets → Shakl → 💻 PC qo'shing.</span></div>`;
          const A=ud.pcBlock.action||'toggle';
          // Ro'yxat: yangi targets, bo'lmasa eski targetId (migratsiya)
          let targets = Array.isArray(ud.pcBlock.targets) ? ud.pcBlock.targets.slice() : [];
          if(!targets.length && ud.pcBlock.targetId!=null) targets=[ud.pcBlock.targetId];
          const mode = ud.pcBlock.multiMode || (targets.length>1?'sequential':'single');
          const pcName = (id)=>{ const p=pcs.find(x=>String(x.userData.id)===String(id)); return p?p.userData.name:('#'+id); };
          return `
          <div style="font-size:8px;color:var(--muted);margin-bottom:5px;font-family:'Share Tech Mono',monospace">Boshqariladigan PC lar:</div>
          ${targets.map((id,i)=>`
            <div class="fr" style="margin-bottom:4px">
              <span style="font-size:8px;color:var(--accent);min-width:16px;font-family:'Share Tech Mono',monospace">${i+1}.</span>
              <select class="fv" style="flex:1" onchange="window._ibtnPCListSet(${i},this.value)">
                ${pcs.map(x=>`<option value="${x.userData.id}" ${String(id)===String(x.userData.id)?'selected':''}>💻 ${x.userData.name}</option>`).join('')}
              </select>
              <button onclick="window._ibtnPCListDel(${i})" style="flex-shrink:0;padding:3px 7px;border-radius:3px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);color:#ff6b6b;font-size:9px;cursor:pointer;font-family:'Share Tech Mono',monospace">✕</button>
            </div>`).join('')}
          <button onclick="window._ibtnPCListAdd()" style="width:100%;margin:2px 0 8px;padding:5px;border-radius:4px;background:rgba(var(--accent-rgb),.1);border:1px dashed rgba(var(--accent-rgb),.4);color:var(--accent);font-size:9px;cursor:pointer;font-family:'Share Tech Mono',monospace">➕ PC qo'shish</button>
          ${targets.length>1?`
          <div class="fl" style="margin:4px 0 3px">Yoqish tartibi</div>
          <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px">
            <button onclick="window._ibtnSetPC('multiMode','sequential')"
              style="text-align:left;padding:6px 8px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:8px;line-height:1.4;
                     background:${mode==='sequential'?'rgba(var(--accent-rgb),.14)':'transparent'};
                     border:1px solid ${mode==='sequential'?'var(--accent)':'var(--border)'};
                     color:${mode==='sequential'?'var(--accent)':'var(--muted)'}">
              <b>🔢 GALMA-GAL</b> — har bosishda keyingisi (1→2→3→…)</button>
            <button onclick="window._ibtnSetPC('multiMode','all')"
              style="text-align:left;padding:6px 8px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:8px;line-height:1.4;
                     background:${mode==='all'?'rgba(var(--accent-rgb),.14)':'transparent'};
                     border:1px solid ${mode==='all'?'var(--accent)':'var(--border)'};
                     color:${mode==='all'?'var(--accent)':'var(--muted)'}">
              <b>⚡ HAMMASI</b> — bitta bosishda barchasi birvarakay</button>
          </div>`:''}
          <div class="fr"><span class="fl">Amal</span>
            <select class="fv" onchange="window._ibtnSetPC('action',this.value)">
              <option value="toggle" ${A==='toggle'?'selected':''}>🔄 Almashtirish (1-bosish 🟢, 2-chisi ⚫)</option>
              <option value="on"     ${A==='on'?'selected':''}>🟢 Faqat yoqish</option>
              <option value="off"    ${A==='off'?'selected':''}>⚫ Faqat o'chirish</option>
            </select></div>
          <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
            ${targets.length>1
              ? (mode==='sequential'
                  ? 'GALMA-GAL: 1-marta bossangiz 1-PC, 2-marta 2-PC… oxiriga yetgach boshiga qaytadi.'
                  : 'HAMMASI: bir marta bosishda barcha PC lar birga ishlaydi.')
              : 'PC o\'chiq bo\'lsa — ekran qora, kamera fokusi ham ishlamaydi.'}
          </div>

          <!-- 💻 HTML KOD ALMASHTIRISH -->
          <div style="border-top:1px solid rgba(var(--accent-rgb),.15);margin-top:8px;padding-top:7px">
            <div style="font-size:8px;color:var(--accent);letter-spacing:1.2px;margin-bottom:5px;
                 font-family:'Share Tech Mono',monospace">💻 EKRAN HTML KODI</div>
            <textarea placeholder="&lt;h1&gt;Yangi sahifa&lt;/h1&gt;&#10;Bo'sh qoldirilsa — kod tegilmaydi"
              oninput="window._ibtnSetPC('html', this.value)"
              style="width:100%;min-height:74px;resize:vertical;background:var(--bg);
              border:1px solid var(--border);color:var(--text);padding:5px 6px;border-radius:3px;
              font-family:'Share Tech Mono',monospace;font-size:9px;line-height:1.5;outline:none"
              >${String(ud.pcBlock.html || '').replace(/</g,'&lt;')}</textarea>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:5px;
                   font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
              <input type="checkbox" ${ud.pcBlock.htmlToggle?'checked':''}
                onchange="window._ibtnSetPC('htmlToggle', this.checked)" style="cursor:pointer">
              🔄 Galma-gal (bosgan sari eski ↔ yangi)
            </label>
            <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.6;
                 font-family:'Share Tech Mono',monospace">
              Tugma bosilganda ekrandagi sahifa shu kodga almashadi.<br>
              <b style="color:var(--accent3)">Galma-gal</b> yoqilsa eski kod avtomatik
              eslab qolinadi — uni qo'lda ko'chirish shart emas.
            </div>
          </div>`;
        })():''}
      </div>

      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer" onclick="window._ibtnTogglePath()">
          <span style="font-size:9px;color:var(--accent3);letter-spacing:1px;font-family:'Share Tech Mono',monospace;flex:1">🛤 YO'LNI BOSHQARISH</span>
          <input type="checkbox" ${(ud.path&&ud.path.enabled)?'checked':''} onclick="event.stopPropagation();window._ibtnTogglePath();" style="cursor:pointer">
        </div>
        ${(ud.path&&ud.path.enabled)?(()=>{
          const paths=objects.filter(x=>x.userData&&x.userData.isPath);
          if(!paths.length) return `<div style="font-size:9px;color:#ff8844;font-family:'Share Tech Mono',monospace;line-height:1.5">
            ⚠ Sahnada yo'l yo'q.<br><span style="color:var(--border)">Assets → 🛤 Yo'l (Path) qo'shing.</span></div>`;
          const A=ud.path.action||'toggle';
          const tp=paths.find(x=>String(x.userData.id)===String(ud.path.targetId));
          return `
          <div class="fr"><span class="fl">Yo'l</span>
            <select class="fv" onchange="window._ibtnSetPath('targetId',this.value||null)">
              <option value="">— tanlang —</option>
              ${paths.map(x=>`<option value="${x.userData.id}" ${String(ud.path.targetId)===String(x.userData.id)?'selected':''}>🛤 ${x.userData.name}</option>`).join('')}
            </select></div>
          <div class="fr"><span class="fl">Amal</span>
            <select class="fv" onchange="window._ibtnSetPath('action',this.value)">
              <option value="toggle"  ${A==='toggle'?'selected':''}>🔄 Almashtirish (play/pause)</option>
              <option value="play"    ${A==='play'?'selected':''}>▶ Boshlash</option>
              <option value="stop"    ${A==='stop'?'selected':''}>⏸ To'xtatish</option>
              <option value="restart" ${A==='restart'?'selected':''}>⏮ Boshdan boshlash</option>
              <option value="reset"   ${A==='reset'?'selected':''}>⏹ Boshiga qaytarish</option>
              <option value="reverse" ${A==='reverse'?'selected':''}>◀ Yo'nalishni teskari</option>
            </select></div>
          ${tp&&(tp.userData.trigger||'auto')==='auto'?`
          <div style="font-size:8px;color:#ff8844;margin-top:6px;padding:5px 7px;line-height:1.5;
            background:rgba(255,136,68,.08);border:1px solid rgba(255,136,68,.3);border-radius:2px;
            font-family:'Share Tech Mono',monospace">
            ⚠ "<b>${tp.userData.name}</b>" <b>⚡ Avtomatik</b> rejimda — Play bilan o'zi yuradi.<br>
            <span style="color:var(--border)">Yo'lni tanlab → 🎯 Trigger bilan qiling.</span></div>`:''}`;
        })():''}
      </div>

      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer" onclick="window._ibtnToggleText()">
          <span style="font-size:9px;color:#ffcc00;letter-spacing:1px;font-family:'Share Tech Mono',monospace;flex:1">📝 MATN BLOKINI O'ZGARTIRISH</span>
          <input type="checkbox" ${(ud.textBlock&&ud.textBlock.enabled)?'checked':''} onclick="event.stopPropagation();window._ibtnToggleText();" style="cursor:pointer">
        </div>
        ${(ud.textBlock&&ud.textBlock.enabled)?`
        <div class="fr"><span class="fl">Matn bloki</span>
          <select class="fv" onchange="window._ibtnSetText('targetId', this.value||null)">
            <option value="">— tanlang —</option>
            ${objects.filter(x=>x.userData&&x.userData.isTextBlock).map(x=>
              `<option value="${x.userData.id}" ${String(ud.textBlock.targetId)===String(x.userData.id)?'selected':''}>📝 ${x.userData.name}</option>`).join('')}
          </select></div>
        <div style="font-size:9px;color:var(--muted);margin:5px 0 3px;font-family:'Share Tech Mono',monospace">YANGI MATN</div>
        <textarea oninput="window._ibtnSetText('text', this.value)" spellcheck="false" style="width:100%;min-height:40px;
          background:rgba(0,0,0,.35);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:5px 7px;
          font-family:'Share Tech Mono',monospace;font-size:11px;resize:vertical;outline:none">${(ud.textBlock.text??'').replace(/</g,'&lt;')}</textarea>
        <div class="fr" style="margin-top:4px"><span class="fl">Toggle (almashib tursin)</span>
          <input type="checkbox" ${ud.textBlock.toggle?'checked':''} onchange="window._ibtnSetText('toggle',this.checked);updateInspector()"></div>
        ${ud.textBlock.toggle?`
        <div style="font-size:9px;color:var(--muted);margin:5px 0 3px;font-family:'Share Tech Mono',monospace">IKKINCHI MATN</div>
        <textarea oninput="window._ibtnSetText('backText', this.value)" spellcheck="false" style="width:100%;min-height:34px;
          background:rgba(0,0,0,.35);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:5px 7px;
          font-family:'Share Tech Mono',monospace;font-size:11px;resize:vertical;outline:none">${(ud.textBlock.backText??'').replace(/</g,'&lt;')}</textarea>`:''}
        <div class="fr" style="margin-top:4px"><span class="fl">O'zgarish</span>
          <select class="fv" onchange="window._ibtnSetText('mode', this.value||null)">
            <option value=""        ${!ud.textBlock.mode?'selected':''}>Blok sozlamasi</option>
            <option value="instant" ${ud.textBlock.mode==='instant'?'selected':''}>⚡ Oddiy</option>
            <option value="hard"    ${ud.textBlock.mode==='hard'?'selected':''}>🔲 Qattiq</option>
            <option value="smooth"  ${ud.textBlock.mode==='smooth'?'selected':''}>🌊 Silliq</option>
          </select></div>
        `:''}
      </div>

      <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer" onclick="window._ibtnToggleHtml()">
          <span style="font-size:9px;color:var(--accent);letter-spacing:1px;font-family:'Share Tech Mono',monospace;flex:1">🖥 HTML SAHIFA (DIALOG)</span>
          <input type="checkbox" ${(ud.htmlPage&&ud.htmlPage.enabled)?'checked':''} onclick="event.stopPropagation();window._ibtnToggleHtml();" style="cursor:pointer">
        </div>
        ${(ud.htmlPage&&ud.htmlPage.enabled)?`
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:10px;color:var(--muted);width:66px">Rejim</span>
            <select onchange="window._ibtnSetHtml('mode',this.value);updateInspector();" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-size:10px;border-radius:2px">
              <option value="show" ${(ud.htmlPage.mode||'show')==='show'?'selected':''}>Ko'rsatish</option>
              <option value="close" ${ud.htmlPage.mode==='close'?'selected':''}>Yopish</option>
            </select>
          </div>
          ${(ud.htmlPage.mode||'show')==='show'?`
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-size:10px;color:var(--muted);width:66px">Joylashuv</span>
              <select onchange="window._ibtnSetHtml('position',this.value)" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-size:10px;border-radius:2px">
                <option value="bottom" ${(ud.htmlPage.position||'bottom')==='bottom'?'selected':''}>Pastda</option>
                <option value="top" ${ud.htmlPage.position==='top'?'selected':''}>Tepada</option>
                <option value="center" ${ud.htmlPage.position==='center'?'selected':''}>Markazda</option>
                <option value="full" ${ud.htmlPage.position==='full'?'selected':''}>To'liq ekran</option>
              </select>
            </div>
            ${window._htmlFxHTML ? window._htmlFxHTML(ud.htmlPage, "window._ibtnSetHtml(") : ''}
            <textarea onchange="window._ibtnSetHtmlContent(this.value)" rows="4" placeholder="&lt;div style=...&gt;Dialog&lt;/div&gt;"
              style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:3px;padding:5px;resize:vertical;margin-top:2px">${_ibEsc(ud.htmlPage.content||'')}</textarea>
          `:''}
          <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:4px 0 0">
            Bosilганда HTML chiqadi (qoladi). <b>Fon yo'q</b> — o'z CSS'ingiz bilan bezang.
            Yopish tugmasi: <b style="color:var(--accent)">&lt;button onclick="_hbCloseHtmlPage()"&gt;</b>.
          </div>
        `:''}
      </div>
    `;
  }
  function _ibEsc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── Global slot manipulation helpers (inspector'dan chaqiriladi)
  // 👤 O'yinchi modeli
  window._ibtnTogglePM = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.playerModel = ud.playerModel || { enabled:false, mode:'temp', modelId:null, scale:1, yaw:0, offset:{x:0,y:0,z:0} };
    ud.playerModel.enabled = !ud.playerModel.enabled;
    updateInspector();
  };
  window._ibtnSetPM = function(prop, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.playerModel = ud.playerModel || { enabled:true, mode:'temp', modelId:null, scale:1, yaw:0, offset:{x:0,y:0,z:0} };
    ud.playerModel[prop] = val;
    if (prop === 'mode') updateInspector();
  };
  // ── Tanlangan tugmaning cfg blokini olish (yo'q maydonlarni
  //    _defaultData dan to'ldiradi — eski sahnalar ham to'liq ishlaydi)
  function _selBtnCfg(key) {
    if (typeof selectedObj === 'undefined' || !selectedObj ||
        !selectedObj.userData || !selectedObj.userData.isInteractiveBtn) return null;
    const ud = selectedObj.userData;
    const def = _defaultData()[key];
    ud[key] = Object.assign({}, def, ud[key] || {});
    return ud[key];
  }

  // 🌀 Teleport
  window._ibtnToggleTP = function() {
    const c = _selBtnCfg('spawnRedirect'); if (!c) return;
    c.enabled = !c.enabled;
    updateInspector();
  };
  window._ibtnSetTP = function(prop, val) {
    const c = _selBtnCfg('spawnRedirect'); if (!c) return;
    c[prop] = val;
    if (prop === 'preAnimEnabled' || prop === 'preAnimType' ||
        prop === 'preAnimCameraSource') updateInspector();
  };

  // 🎥 Kamera animatsiyasi
  window._ibtnToggleCA = function() {
    const c = _selBtnCfg('cameraAnim'); if (!c) return;
    c.enabled = !c.enabled;
    updateInspector();
  };
  window._ibtnSetCA = function(prop, val) {
    const c = _selBtnCfg('cameraAnim'); if (!c) return;
    c[prop] = val;
    // Bu maydonlar UI tarkibini o'zgartiradi — panelni qayta chizamiz
    if (prop === 'transitionMode' || prop === 'continuePath') updateInspector();
    // hideCameraAlways darhol qo'llansin (hitboxdagi kabi)
    if (prop === 'hideCameraAlways' && c.cameraId != null) {
      const tgt = objects.find(o => String(o.userData && o.userData.id) === String(c.cameraId));
      if (tgt) {
        tgt.userData._alwaysHidden = !!val;
        tgt.visible = !val;
      }
    }
  };

  // ── 🔒 Kamera animatsiyasi bloklari (hitboxdagi _hbCam* bilan bir xil) ──
  window._ibtnCamToggleBlock = function(time, on) {
    const ca = _selBtnCfg('cameraAnim'); if (!ca) return;
    if (!Array.isArray(ca.blocks)) ca.blocks = [];
    const i = ca.blocks.findIndex(b => Math.abs(b.time - time) < 0.005);
    if (on) { if (i < 0) ca.blocks.push({ time: time, key: null }); }
    else if (i >= 0) ca.blocks.splice(i, 1);
    updateInspector();
  };
  window._ibtnCamSetBlockKey = function(time, code) {
    const ca = _selBtnCfg('cameraAnim'); if (!ca) return;
    const blk = (ca.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
    if (blk) {
      blk.key = code || null;
      log(`⌨ Tugma kamera blok (${time.toFixed(2)}s) → ${window._friendlyKey(code)}`, 'lok');
      updateInspector();
    }
  };
  window._ibtnCamToggleLoop = function(time) {
    const ca = _selBtnCfg('cameraAnim'); if (!ca) return;
    const blk = (ca.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
    if (!blk) return;
    blk.loop = !blk.loop;
    if (blk.loop && typeof blk.loopBack !== 'number') {
      // standart: undan oldingi blok vaqti, bo'lmasa 0
      const prev = (ca.blocks || []).filter(b => b.time < time).sort((a,b)=>b.time-a.time)[0];
      blk.loopBack = prev ? prev.time : 0;
    }
    log(`🔁 Tugma kamera sikl bloki (${time.toFixed(2)}s): ${blk.loop ? 'YONIQ ↩ ' + (blk.loopBack||0).toFixed(2) + 's' : "O'CHIQ"}`, 'lok');
    updateInspector();
  };
  window._ibtnCamSetLoopBack = function(time, val) {
    const ca = _selBtnCfg('cameraAnim'); if (!ca) return;
    const blk = (ca.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
    if (!blk) return;
    let v = Math.max(0, val);
    if (v >= time) {
      v = Math.max(0, time - 0.05);
      log(`⚠ Qaytish vaqti blokdan oldin bo'lishi kerak — ${v.toFixed(2)}s ga o'rnatildi`, 'lw');
    }
    blk.loopBack = v;
    log(`↩ Tugma kamera sikl qaytish (${time.toFixed(2)}s) → ${v.toFixed(2)}s`, 'lok');
    updateInspector();
  };
  window._ibtnCamSetExitKey = function(time, code) {
    const ca = _selBtnCfg('cameraAnim'); if (!ca) return;
    const blk = (ca.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
    if (blk) {
      blk.exitKey = code || null;
      log(`🚪 Tugma kamera sikl chiqish (${time.toFixed(2)}s) → ${window._friendlyKey(code)}`, 'lok');
      updateInspector();
    }
  };
  // Timeline'dagi keyframe vaqtlaridan blok tanlash
  window._ibtnCamPickBlockOnTimeline = function() {
    const ca = _selBtnCfg('cameraAnim'); if (!ca) return;
    if (!Array.isArray(ca.blocks)) ca.blocks = [];
    let times = [];
    if (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) {
      const tr = TimelineSystem.tracks.find(t => String(t.objId) === String(ca.cameraId));
      if (tr && tr.keyframes) times = tr.keyframes.map(k => k.time);
      if (!times.length) {
        const s = new Set();
        TimelineSystem.tracks.forEach(t => (t.keyframes || []).forEach(k => {
          if (typeof k.time === 'number') s.add(Math.round(k.time * 1000) / 1000);
        }));
        times = [...s];
      }
    }
    times = [...new Set(times.map(t => Math.round(t * 1000) / 1000))].sort((a, b) => a - b);
    if (!times.length) {
      log("⚠ Timeline'da keyframe yo'q — avval kameraga yo'l chizing", 'lw');
      return;
    }
    const cur = new Set((ca.blocks || []).map(b => Math.round(b.time * 1000) / 1000));
    const free = times.filter(t => !cur.has(t));
    if (!free.length) { log('ℹ Barcha keyframe vaqtlari allaqachon bloklangan', 'lw'); return; }
    window._ibtnCamToggleBlock(free[0], true);
    log(`🔒 Tugma: blok qo'shildi (t=${free[0].toFixed(2)}s) — tugmasini biriktiring`, 'lok');
  };

  // ── 📥 Teleport pre-anim uchun .json keyframe import ──────────
  window._ibtnImportPreAnimKf = function() {
    const c = _selBtnCfg('spawnRedirect'); if (!c) return;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const j = JSON.parse(rd.result);
          // Object-Only Export formati: {keyframes:[...]} yoki to'g'ridan massiv
          const kfs = Array.isArray(j) ? j
                    : (Array.isArray(j.keyframes) ? j.keyframes
                    : (j.track && Array.isArray(j.track.keyframes) ? j.track.keyframes : null));
          if (!kfs || !kfs.length) { log('⚠ Faylda keyframe topilmadi', 'lw'); return; }
          c.preAnimKeyframes    = kfs;
          c.preAnimKfSourceName = f.name;
          log(`📥 Tugma: ${kfs.length} ta keyframe yuklandi (${f.name})`, 'lok');
          updateInspector();
        } catch(e) {
          log('❌ JSON o\'qilmadi: ' + e.message, 'le');
        }
      };
      rd.readAsText(f);
    };
    inp.click();
  };
  window._ibtnClearPreAnimKf = function() {
    const c = _selBtnCfg('spawnRedirect'); if (!c) return;
    c.preAnimKeyframes = [];
    c.preAnimKfSourceName = '';
    log('🗑 Tugma: import qilingan keyframe o\'chirildi', 'lw');
    updateInspector();
  };

  window._ibtnTogglePC = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.pcBlock = ud.pcBlock || { enabled:false, targetId:null, action:'toggle' };
    ud.pcBlock.enabled = !ud.pcBlock.enabled;
    updateInspector();
  };
  // ── 🔴 Finish bo'limi sozlagichlari ─────────────────────────
  window._ibtnToggleFinish = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.finishGame = ud.finishGame || { enabled: false, targetId: null };
    ud.finishGame.enabled = !ud.finishGame.enabled;
    updateInspector();
  };
  window._ibtnSetFinish = function(prop, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.finishGame = ud.finishGame || { enabled: true, targetId: null };
    ud.finishGame[prop] = val;
    updateInspector();
  };

  window._ibtnSetPC = function(prop, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.pcBlock = ud.pcBlock || { enabled:true, targetId:null, action:'toggle' };
    ud.pcBlock[prop] = val;
    // ⚠ Matn maydonida inspektorni QAYTA CHIZMAYMIZ. `oninput` har
    //   bosilgan harfda ishlaydi — qayta chizsak textarea yangidan
    //   yasalib, kursor har harfdan keyin oxiriga sakrab ketardi va
    //   yozib bo'lmasdi.
    if (prop === 'html') return;
    updateInspector();
  };

  // 💻 Bir nechta PC ro'yxati — targets massivini boshqaradi.
  function _pcEnsureList(ud) {
    ud.pcBlock = ud.pcBlock || { enabled:true, action:'toggle' };
    if (!Array.isArray(ud.pcBlock.targets)) {
      // Eski targetId ni yangi ro'yxatga ko'chiramiz (migratsiya)
      ud.pcBlock.targets = (ud.pcBlock.targetId != null) ? [ud.pcBlock.targetId] : [];
    }
    return ud.pcBlock.targets;
  }
  window._ibtnPCListAdd = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    const list = _pcEnsureList(ud);
    // Birinchi mavjud PC ni standart qo'shamiz
    const pcs = objects.filter(x => x.userData && x.userData.isPCBlock);
    const firstId = pcs.length ? pcs[0].userData.id : null;
    list.push(firstId);
    ud.pcBlock._seqIdx = 0;
    updateInspector();
  };
  window._ibtnPCListDel = function(i) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    const list = _pcEnsureList(ud);
    list.splice(i, 1);
    ud.pcBlock._seqIdx = 0;
    // Bitta qolganда targetId ni ham sinxronlaymiz (orqaga moslik)
    ud.pcBlock.targetId = list.length ? list[0] : null;
    updateInspector();
  };
  window._ibtnPCListSet = function(i, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    const list = _pcEnsureList(ud);
    list[i] = val || null;
    if (i === 0) ud.pcBlock.targetId = list[0];   // eski maydonni ham yangilaymiz
    // updateInspector shart emas — select o'zi ko'rsatadi (fokus yo'qotmaslik)
  };

  window._ibtnTogglePath = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.path = ud.path || { enabled:false, targetId:null, action:'toggle' };
    ud.path.enabled = !ud.path.enabled;
    updateInspector();
  };
  window._ibtnSetPath = function(prop, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.path = ud.path || { enabled:true, targetId:null, action:'toggle' };
    ud.path[prop] = val;
    updateInspector();
  };

  window._ibtnToggleText = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.textBlock = ud.textBlock || { enabled:false, targetId:null, text:'', mode:null, toggle:false, backText:'' };
    ud.textBlock.enabled = !ud.textBlock.enabled;
    updateInspector();
  };
  window._ibtnSetText = function(prop, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.textBlock = ud.textBlock || { enabled:true, targetId:null, text:'', mode:null, toggle:false, backText:'' };
    ud.textBlock[prop] = val;
  };

  // ── 📦 Predmet slotlari sozlagichlari ───────────────────────
  /**
   * Eski (bir predmetli) modeldan yangi (ko'p slotli) modelga o'tkazadi.
   *
   * ⚠ Eski sahnalarda `itemReq = {itemId, afterUse, failMsg}` shaklida
   *   saqlangan. Migratsiyasiz ular jimgina ishlamay qolardi: `slots`
   *   massivi bo'lmagani uchun `_irCurSlot()` doim `null` qaytarardi.
   *   Eski `itemId` birinchi slotga aylanadi.
   */
  function _irMigrate(ud) {
    if (!ud.itemReq) ud.itemReq = { enabled:false, onDone:'consume', loop:true, slots:[] };
    const ir = ud.itemReq;
    if (!Array.isArray(ir.slots)) {
      ir.slots = (ir.itemId != null && ir.itemId !== '') ? [{ itemId: ir.itemId }] : [];
      // 'lock' — takrorlanmasin degani edi
      if (ir.loop === undefined) ir.loop = (ir.afterUse !== 'lock');
    }
    if (ir.onDone === undefined) ir.onDone = 'consume';
    if (ir.loop   === undefined) ir.loop   = true;
    delete ir.itemId; delete ir.afterUse; delete ir.failMsg;
    return ir;
  }

  function _ibtnIrGet() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return null;
    return _irMigrate(selectedObj.userData);
  }
  window._ibtnIrToggle = function() {
    const ir = _ibtnIrGet();
    if (!ir) return;
    ir.enabled = !ir.enabled;
    selectedObj.userData._irIdx = 0;
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._ibtnIrSet = function(prop, val) {
    const ir = _ibtnIrGet();
    if (!ir) return;
    ir[prop] = val;
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._ibtnIrAddSlot = function() {
    const ir = _ibtnIrGet();
    if (!ir) return;
    ir.slots.push({ itemId:null, sourceName:'', keyframes:[], duration:0,
                    targetObjectId:null, speed:1 });
    log(`+ Predmet sloti ${ir.slots.length} qo'shildi`, 'lok');
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._ibtnIrRemoveSlot = function(i) {
    const ir = _ibtnIrGet();
    if (!ir || i < 0 || i >= ir.slots.length) return;
    ir.slots.splice(i, 1);
    const ud = selectedObj.userData;
    if ((ud._irIdx || 0) >= ir.slots.length) ud._irIdx = 0;
    log(`✕ Predmet sloti ${i + 1} o'chirildi`, 'lw');
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._ibtnIrSetSlot = function(i, prop, val) {
    const ir = _ibtnIrGet();
    if (!ir || i < 0 || i >= ir.slots.length) return;
    ir.slots[i][prop] = (prop === 'itemId' || prop === 'targetObjectId') ? (val || null) : val;
    if (prop === 'itemId' && typeof updateInspector === 'function') updateInspector();
  };
  window._ibtnIrClearAnim = function(i) {
    const ir = _ibtnIrGet();
    if (!ir || i < 0 || i >= ir.slots.length) return;
    const sl = ir.slots[i];
    sl.sourceName = ''; sl.keyframes = []; sl.duration = 0; sl.targetObjectId = null;
    log(`✕ Predmet sloti ${i + 1} — animatsiya o'chirildi`, 'lw');
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._ibtnIrReset = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    selectedObj.userData._irIdx = 0;
    log('↺ Predmet ketma-ketligi boshiga qaytarildi', 'lok');
    if (typeof updateInspector === 'function') updateInspector();
  };
  // Timeline / JSON tanlash — ANM slotlari bilan AYNAN bir mexanizm,
  // faqat qaysi ro'yxatga yozilishi `_activeSlotList` bilan aytiladi.
  window._ibtnIrPickTimeline = function(i) { window._ibtnPickTimeline(i, 'item'); };
  window._ibtnIrPickAnim     = function(i) { window._ibtnPickAnim(i, 'item'); };

  window._ibtnSetProp = function(prop, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    selectedObj.userData[prop] = val;
  };

  // ── 🎒 Inventar ikonkasi ──────────────────────────────────────
  //  ⚠ `readAsDataURL` — `readAsArrayBuffer` EMAS. Rasm `userData`
  //    ichida `data:image/...;base64,` bo'lib turishi kerak: shunda
  //    `AssetBundle` uni O'ZI topib `texture/` papkasiga chiqaradi
  //    (kalit nomini bilishi shart emas) va yuklashda qaytaradi.
  //    Xom baytlarni saqlasak — 📦 model va 🔊 ovoz bilan bo'lgan
  //    o'sha xato takrorlanardi: fayl jimgina yo'qolardi.
  window._ibtnPickInvIcon = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const target = selectedObj;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        target.userData.invIcon = String(rd.result || '');
        if (!target.userData.invName) {
          target.userData.invName = f.name.replace(/\.[^.]+$/, '');
        }
        log(`🖼 "${target.userData.name}" — inventar rasmi qo'shildi (${(f.size / 1024).toFixed(1)} KB)`, 'lok');
        if (typeof updateInspector === 'function') updateInspector();
        if (window.InventorySystem) { try { InventorySystem.refresh(); } catch (e) {} }
      };
      rd.onerror = () => log('⚠ Rasm o\'qilmadi', 'lw');
      rd.readAsDataURL(f);
    };
    inp.click();
  };
  window._ibtnClearInvIcon = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    delete selectedObj.userData.invIcon;
    if (typeof updateInspector === 'function') updateInspector();
    if (window.InventorySystem) { try { InventorySystem.refresh(); } catch (e) {} }
  };
  // 👁 Qarash tetigi sozlagichi
  window._gazeSet = function(prop, val) {
    if (!selectedObj || !selectedObj.userData.isGazeTrigger) return;
    const ud = selectedObj.userData;
    if (!ud.gaze) ud.gaze = { trigger:'look', cone:30, dist:15, requireLos:true, once:false, reArm:0.5,
                              delay:0, holdGaze:false, showTimer:true, timerPos:'tc' };
    ud.gaze[prop] = val;
    // ⏱ delay 0 ga tushsa — ketayotgan sanoqni bekor qilamiz (osilib qolmasin)
    if (prop === 'delay' && !val) selectedObj.userData._gazeTimerT = 0;
    // Play davomida hideInPlay almashsa — darhol qo'llaymiz
    if (prop === 'hideInPlay' && typeof isPlaying !== 'undefined' && isPlaying) {
      _setGazeIconVisible(selectedObj, !val);
    }
    if (prop === 'trigger' && typeof updateInspector === 'function') updateInspector();
  };
  // 🔤 Prompt sozlagichi
  window._ibtnSetPrompt = function(prop, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    if (!ud.prompt) ud.prompt = { enabled:false, text:'', position:'bc', showKey:true, requireLook:true };
    ud.prompt[prop] = val;
    // enabled/asHtml almashsa panel qayta chizilsin (maydonlar o'zgaradi)
    if ((prop === 'enabled' || prop === 'asHtml') && typeof updateInspector === 'function') updateInspector();
  };
  function _ibtnHtml() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return null;
    const ud = selectedObj.userData;
    ud.htmlPage = ud.htmlPage || { enabled: false, mode: 'show', content: '', position: 'bottom' };
    return ud.htmlPage;
  }
  window._ibtnToggleHtml = function() {
    const h = _ibtnHtml(); if (!h) return;
    h.enabled = !h.enabled;
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._ibtnSetHtml = function(prop, val) {
    const h = _ibtnHtml(); if (!h) return;
    h[prop] = val;
  };
  window._ibtnSetHtmlContent = function(val) {
    const h = _ibtnHtml(); if (!h) return;
    h.content = val;
  };

  window._ibtnAddSlot = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.slots = ud.slots || [];
    ud.slots.push({
      sourceName:     '',
      keyframes:      [],
      duration:       0,
      targetObjectId: null,
      speed:          1,
    });
    log(`+ Slot ${ud.slots.length} qo'shildi`, 'lok');
    updateInspector();
  };

  window._ibtnRemoveSlot = function(idx) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    if (!Array.isArray(ud.slots) || idx < 0 || idx >= ud.slots.length) return;
    ud.slots.splice(idx, 1);
    if (ud._currentIdx >= ud.slots.length) ud._currentIdx = 0;
    log(`✕ Slot ${idx + 1} o'chirildi`, 'lw');
    updateInspector();
  };

  window._ibtnSetSlotProp = function(idx, prop, val) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    if (!Array.isArray(ud.slots) || idx < 0 || idx >= ud.slots.length) return;
    ud.slots[idx][prop] = val;
  };

  window._ibtnPickAnim = function(idx, which) {
    _activeSlotIdx  = idx;
    _activeSlotList = which || 'main';
    // MUHIM: file input'ni har safar YANGI yaratamiz (DOM'dan mustaqil).
    // Inspector qayta renderlansa eski input yo'q bo'ladi va dialog "osilib
    // qoladi" — shuning uchun detached element ishlatamiz.
    const inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = '.json,application/json';
    inp.style.display = 'none';
    inp.onchange = window._ibtnHandleAnimFile;
    document.body.appendChild(inp);
    inp.click();
    // Foydalanuvchi dialog'ni yopganidan keyin tozalash
    setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
  };

  window._ibtnHandleAnimFile = function(evt) {
    const file = evt && evt.target && evt.target.files && evt.target.files[0];
    if (!file) return;
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) {
      log("⚠ Tugma tanlanmagan", 'lw');
      return;
    }
    const ud = selectedObj.userData;
    const _list = _slotsOf(ud, _activeSlotList);
    // Aktiv slot cursor — agar biror sabab bilan yo'qolgan bo'lsa, oxirgi slotga tushiramiz
    const idx = (_activeSlotIdx != null && _activeSlotIdx >= 0 && _activeSlotIdx < _list.length)
      ? _activeSlotIdx : (_list.length - 1);
    _activeSlotIdx = null;
    if (idx < 0) {
      log("⚠ Avval '+ Slot qo'shish' ni bosing", 'lw');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const raw = e.target.result;
        const data = JSON.parse(raw);

        // ── Keyframe'larni topish (3 xil format qo'llab-quvvatlanadi) ──
        // MUHIM: aynan shu paytda track'ning metadata'sini ham eslab qolamiz
        // (objId / objName) — pastda maqsad obyektni avtomatik topish uchun.
        let kfs = null;
        let sourceObjId = null;
        let sourceObjName = null;

        if (Array.isArray(data.keyframes)) {
          // 1. Object-Only Export: { keyframes: [...], object: {id, name} }
          kfs = data.keyframes;
          sourceObjId   = data.object?.id ?? null;
          sourceObjName = data.object?.name ?? null;
        } else if (Array.isArray(data.tracks) && data.tracks[0]?.keyframes) {
          // 2. Full Timeline Export: { tracks:[{objId, objName, keyframes:[...]}, ...] }
          const t = data.tracks[0];
          kfs = t.keyframes;
          sourceObjId   = t.objId   ?? null;
          sourceObjName = t.objName ?? null;
          if (data.tracks.length > 1) {
            log(`ℹ ${data.tracks.length} trekli fayl — birinchi trek (${sourceObjName || 'noma\'lum'}) olindi`, 'lok');
          }
        } else if (data.timeline && Array.isArray(data.timeline.tracks) && data.timeline.tracks[0]?.keyframes) {
          // 3. Wrapped timeline
          const t = data.timeline.tracks[0];
          kfs = t.keyframes;
          sourceObjId   = t.objId   ?? null;
          sourceObjName = t.objName ?? null;
        }

        if (!Array.isArray(kfs) || kfs.length === 0) {
          log(`⚠ Faylda keyframe topilmadi. Kutilgan format: {"keyframes":[...]} yoki {"tracks":[{"keyframes":[...]}]}`, 'lw');
          return;
        }

        // ── Maqsad obyektni AVTOMATIK topish ──────────────
        // Avval objId bo'yicha, keyin objName bo'yicha (sahnalar orasida
        // id o'zgarishi mumkin, lekin nom ko'pincha o'zgarmaydi).
        let autoTargetId = null;
        let autoTargetName = null;
        if (sourceObjId != null) {
          const byId = objects.find(o => String(o.userData?.id) === String(sourceObjId));
          if (byId) {
            autoTargetId = byId.userData.id;
            autoTargetName = byId.userData.name;
          }
        }
        if (!autoTargetId && sourceObjName) {
          const byName = objects.find(o => o.userData?.name === sourceObjName);
          if (byName) {
            autoTargetId = byName.userData.id;
            autoTargetName = byName.userData.name;
          }
        }

        const times = kfs.map(k => (typeof k.time === 'number') ? k.time : 0);
        const duration = Math.max(...times) - Math.min(...times);
        const slot = _list[idx];
        slot.sourceName = file.name;
        slot.keyframes  = kfs;
        slot.duration   = duration;
        // Avtomatik topilgan bo'lsa — o'rnatib qo'yamiz
        if (autoTargetId) {
          slot.targetObjectId = autoTargetId;
          log(`✅ Slot ${idx + 1}: ${file.name} — ${kfs.length} KF, ${duration.toFixed(2)}s | maqsad: "${autoTargetName}" (avtomatik)`, 'lok');
        } else {
          log(`✅ Slot ${idx + 1}: ${file.name} — ${kfs.length} KF, ${duration.toFixed(2)}s`, 'lok');
          if (sourceObjName) {
            log(`⚠ "${sourceObjName}" sahnadan topilmadi — Maqsad'ni qo'lda tanlang`, 'lw');
          } else {
            log(`💡 Slot ${idx + 1}: Maqsad obyektni qo'lda tanlang`, 'lw');
          }
        }
        updateInspector();
      } catch (err) {
        log(`❌ JSON o'qib bo'lmadi: ${err.message}`, 'le');
      }
    };
    reader.onerror = () => log(`❌ Fayl o'qishda xato`, 'le');
    reader.readAsText(file);
  };

  // ── Sound picker — bir xil detached pattern ──────────────
  window._ibtnPickSound = function(idx) {
    // 🔊 Sound faqat ANM slotlarida bor. Ro'yxat belgisini tiklaymiz,
    //    aks holda oldingi "predmet sloti" tanlovi shu yerda qolib
    //    ketardi va sound noto'g'ri massivga yozilardi.
    _activeSlotList = 'main';
    _activeSlotIdx = idx;
    const inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = 'audio/*,.mp3,.wav,.ogg,.m4a';
    inp.style.display = 'none';
    inp.onchange = window._ibtnHandleSoundFile;
    document.body.appendChild(inp);
    inp.click();
    setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
  };

  window._ibtnHandleSoundFile = function(evt) {
    const file = evt && evt.target && evt.target.files && evt.target.files[0];
    if (!file) return;
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.slots = ud.slots || [];
    const idx = (_activeSlotIdx != null && _activeSlotIdx >= 0 && _activeSlotIdx < ud.slots.length)
      ? _activeSlotIdx : (ud.slots.length - 1);
    _activeSlotIdx = null;
    if (idx < 0) {
      log("⚠ Avval slot qo'shing", 'lw');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      log(`⚠ Katta sound fayl (${(file.size/1024/1024).toFixed(1)}MB) — sahna hajmi oshadi`, 'lw');
    }
    const reader = new FileReader();
    reader.onload = e => {
      const slot = ud.slots[idx];
      slot.soundUrl  = e.target.result;
      slot.soundName = file.name;
      log(`🔊 Slot ${idx + 1}: sound "${file.name}" qo'shildi`, 'lok');
      updateInspector();
    };
    reader.onerror = () => log(`❌ Sound o'qib bo'lmadi`, 'le');
    reader.readAsDataURL(file);
  };

  window._ibtnReset = function() {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    reset(selectedObj);
  };

  // ── Rejim o'zgartirish (trigger/attached/pickup) ──────────
  // 🧱 To'qnashuv rejimi: 'inline' (o'tkazuvchi) | 'block' (qattiq)
window._ibtnSetCollider = function(mode) {
  if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
  if (mode === 'block') {
    // Engine standarti — `colliderMode` yo'q bo'lsa BLOCK deb hisoblanadi.
    // Aniq yozib qo'yamiz: saqlash/eksport yo'llari shu maydonga qaraydi.
    selectedObj.userData.colliderMode = 'block';
  } else {
    selectedObj.userData.colliderMode = 'inline';
  }
  updateInspector();
  if (typeof captureState === 'function') {
    captureState(mode === 'block' ? 'Tugma: qattiq' : "Tugma: o'tkazuvchi");
  }
  log(mode === 'block'
    ? '🧱 Tugma qattiq — o\'yinchi to\'qnashadi'
    : '👻 Tugma o\'tkazuvchi', 'lok');
};

window._ibtnSetMode = function(mode) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    const prev = ud.btnMode;
    ud.btnMode = mode;
    // Attached rejimidan chiqilsa — parentdan uzish
    if (prev === 'attached' && mode !== 'attached') {
      try { scene.attach(selectedObj); } catch(e) {}
      ud.attachedToId = null;
    }
    // Pickup rejimga o'tilsa — agar ko'tarilgan bo'lsa qaytar
    if (prev === 'pickup' && mode !== 'pickup' && _carried && _carried.btnId === ud.id) {
      _dropCarried();
    }
    log(`🔄 "${ud.name}" — rejim: ${mode.toUpperCase()}`, 'lok');
    updateInspector();
  };

  // ── Attached: parentga yopishtirish ──────────────────────
  window._ibtnAttachTo = function(parentId) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    ud.attachedToId = parentId || null;
    if (parentId) {
      const parent = objects.find(o => String(o.userData?.id) === String(parentId));
      if (parent) {
        try { parent.attach(selectedObj); } catch(e) {}
        ud.parentId = parent.userData.id;  // ★ Ierarxiya renderi uchun sinxron
        log(`🔗 "${ud.name}" → "${parent.userData.name}" ga yopishtirildi`, 'lok');
      }
    } else {
      try { scene.attach(selectedObj); } catch(e) {}
      ud.parentId = null;                  // ★ Ierarxiyada yuqori darajaga qayt
      log(`🔓 "${ud.name}" ajratildi`, 'lok');
    }
    if (typeof updateHierarchy === 'function') updateHierarchy();
    updateInspector();
  };

  window._ibtnClearSound = function(idx) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    if (!ud.slots || idx < 0 || idx >= ud.slots.length) return;
    const slot = ud.slots[idx];
    delete slot.soundUrl;
    delete slot.soundName;
    log(`🔇 Slot ${idx + 1} — sound o'chirildi`, 'lw');
    updateInspector();
  };

  window._ibtnClearAnim = function(idx) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    if (!ud.slots || idx < 0 || idx >= ud.slots.length) return;
    const slot = ud.slots[idx];
    delete slot.sourceName;
    delete slot.keyframes;
    delete slot.duration;
    delete slot.targetObjectId;
    delete slot.trackKind;
    log(`✕ Slot ${idx + 1} — animatsiya o'chirildi`, 'lw');
    updateInspector();
  };

  // ── Timeline'dan olish — modal picker ─────────────────────
  window._ibtnPickTimeline = function(slotIdx, which) {
    _activeSlotList = which || 'main';
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    if (typeof TimelineSystem === 'undefined' || !TimelineSystem.tracks) {
      log("⚠ Timeline tizim topilmadi", 'lw');
      return;
    }
    const tracks = TimelineSystem.tracks || [];
    // Faqat kalitli treklarni ko'rsatamiz
    const usable = tracks.filter(t => t.keyframes && t.keyframes.length > 0);
    if (usable.length === 0) {
      log("⚠ Timeline'da keyframe'li obyekt yo'q — avval Timeline'ga kalit qo'shing (I tugmasi)", 'lw');
      return;
    }
    _showTimelinePicker(usable, slotIdx);
  };

  function _showTimelinePicker(tracks, slotIdx) {
    // Modal — allaqachon mavjud bo'lsa qayta yaratmaymiz
    const existing = document.getElementById('ibtn-tl-picker');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'ibtn-tl-picker';
    backdrop.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    backdrop.onclick = e => { if (e.target === backdrop) backdrop.remove(); };

    const modal = document.createElement('div');
    modal.style.cssText =
      'background:var(--panel,#151b25);border:1px solid rgba(var(--accent4-rgb),.4);' +
      'border-radius:6px;padding:14px 16px;min-width:320px;max-width:420px;max-height:70vh;' +
      "font-family:'Share Tech Mono',monospace;color:#eee;box-shadow:0 8px 40px rgba(0,0,0,.6)";
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:12px;letter-spacing:1.5px;color:var(--accent4);font-weight:700">🎬 TIMELINE'DAN TANLASH</div>
        <button id="ibtn-tl-close"
          style="background:transparent;border:none;color:#f88;cursor:pointer;font-size:16px">✕</button>
      </div>
      <div style="font-size:9px;color:#888;margin-bottom:10px;line-height:1.5">
        Qaysi obyekt animatsiyasini ushbu slotga ulash?<br>
        Tanlangan obyektning keyframe'lari <b style="color:var(--accent4)">nusxa</b> olinadi — timeline o'zgarsa slot ishlashda davom etadi.
      </div>
      <div id="ibtn-tl-list" style="display:flex;flex-direction:column;gap:4px;max-height:45vh;overflow-y:auto">
        ${tracks.map((t, i) => {
          const obj = objects.find(o => String(o.userData?.id) === String(t.objId));
          const name = obj?.userData?.name || `Obyekt #${t.objId}`;
          const kfCount = t.keyframes.length;
          const times = t.keyframes.map(k => k.time || 0);
          const dur = Math.max(...times) - Math.min(...times);
          const icon = obj?.userData?.isCamera ? '🎥'
                     : obj?.userData?.isHitbox ? '📦'
                     : obj?.userData?.isInteractiveBtn ? '🔘'
                     : '▪';
          return `
            <button data-tl-idx="${i}"
              style="background:rgba(var(--accent4-rgb),.06);border:1px solid rgba(var(--accent4-rgb),.25);
                     color:#eee;padding:8px 10px;border-radius:3px;cursor:pointer;
                     display:flex;justify-content:space-between;align-items:center;
                     font-family:'Share Tech Mono',monospace;font-size:11px;text-align:left"
              onmouseover="this.style.background='rgba(var(--accent4-rgb),.15)';this.style.borderColor='var(--accent4)'"
              onmouseout="this.style.background='rgba(var(--accent4-rgb),.06)';this.style.borderColor='rgba(var(--accent4-rgb),.25)'">
              <span><span style="margin-right:6px">${icon}</span>${name}</span>
              <span style="font-size:8px;color:#888">${kfCount} KF · ${dur.toFixed(1)}s</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    document.getElementById('ibtn-tl-close').onclick = () => backdrop.remove();
    document.querySelectorAll('#ibtn-tl-list button[data-tl-idx]').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.tlIdx, 10);
        _applyTimelinePick(tracks[i], slotIdx);
        backdrop.remove();
      };
    });
  }

  function _applyTimelinePick(track, slotIdx) {
    if (!selectedObj || !selectedObj.userData.isInteractiveBtn) return;
    const ud = selectedObj.userData;
    // ⚠ Tekshiruv TANLANGAN ro'yxatga qarab bo'lishi shart. Ilgari bu
    //   yerda `ud.slots` (ASOSIY ANM slotlari) turardi: predmet sloti
    //   uchun Timeline tanlanganda `ud.slots` bo'sh bo'lgani sababli
    //   funksiya SHU YERDA jimgina `return` qilardi — modal yopilardi,
    //   hech qanday xato chiqmasdi, slot esa bo'sh qolardi.
    //   Alomat: "Timeline orqali animatsiya sodir bo'lmayapti".
    const _list = _slotsOf(ud, _activeSlotList);
    if (slotIdx < 0 || slotIdx >= _list.length) return;

    // ── 🎨 MAXSUS TREK (filtr · ob-havo · skybox · kino · zoom) ──
    //  Ular butun SAHNAGA ta'sir qiladi, nishon obyekti YO'Q.
    //  ⚠ ALOMAT: filtr treki ro'yxatda ko'rinardi, tanlansa ham
    //    slotga tushardi — lekin `targetObjectId` bo'lmagani uchun
    //    `_playOne` da "maqsad obyekt topilmadi" deb TO'XTARDI.
    //    Foydalanuvchi buni "tugmaga filtr animatsiyasini bersa ham
    //    ishlamayapti" deb ko'rardi.
    //  🎯 Hitboxda ham xuddi shu xato bor edi — bir xil naqsh bilan
    //    tuzatilgan.
    //  ⚠ RO'YXAT BIRMA-BIR SANALGAN edi va 💻 PC treklari unga
    //    qo'shilmagandi. Alomat: 🎯 hitbox slotida ishlardi, LEKIN
    //    🔘 tugma yoki 👁 qarash slotiga qo'yilsa — yo'q.
    //    `_kind` `null` qaytarardi, trek ODDIY obyekt treki deb
    //    hisoblanardi va `objRef` topilmagani uchun jimgina
    //    tashlanardi.
    const _kind = track.isPCCam ? 'pccam' : track.isPCFx ? 'pcfx'
                : track.isFilter ? 'filter' : track.isWeather ? 'weather'
                : track.isSkybox ? 'skybox' : track.isKino ? 'kino'
                : track.isZoom   ? 'zoom'   : null;
    const _KLBL = { pccam: '💻📷 PC kamerasi', pcfx: '💻🎛 PC filtri',
                    filter: '🎨 Filtr', weather: '🌦 Ob-havo',
                    skybox: '🌌 Skybox', kino: '🎬 Kino kamera', zoom: '🔍 Zoom' };

    // Maqsad obyektni topish — avval objId, so'ng objName bo'yicha
    let targetObj = _kind ? null : objects.find(o => String(o.userData?.id) === String(track.objId));
    if (!_kind && !targetObj && track.objName) {
      targetObj = objects.find(o => o.userData?.name === track.objName);
    }
    // Keyframe'larni chuqur nusxa olamiz (timeline o'zgarsa slot ta'sirlanmasin)
    const kfs = track.keyframes.map(k => JSON.parse(JSON.stringify(k)));
    const times = kfs.map(k => k.time || 0);
    const duration = Math.max(...times) - Math.min(...times);
    const slot = _list[slotIdx];
    slot.sourceName     = _kind ? _KLBL[_kind]
      : 'Timeline: ' + (targetObj?.userData?.name || track.objName || `#${track.objId}`);
    slot.keyframes      = kfs;
    slot.duration       = duration;
    // ⚠ `trackKind` `_` SIZ — saqlanishi SHART. Aks holda sahna
    //   qayta ochilganda slot oddiy obyekt treki deb hisoblanib,
    //   xato qaytib kelardi.
    slot.trackKind      = _kind || null;
    //  ⚠ EGASINING ID si HAM saqlanadi. 💻 PC treklari \"qaysi PC?\"
    //    degan savolga javob talab qiladi — busiz `applyPCCanvasKF`
    //    ularni jimgina tashlab yuborardi va slot ishlayotgandek
    //    ko'rinib, hech nima o'zgarmasdi.
    //  ⚠ `_` SIZ: sahna bilan saqlanishi shart.
    slot.trackPcId      = track.pcId ?? null;
    slot.targetObjectId = targetObj ? targetObj.userData.id : null;
    if (_kind) {
      log(`✅ Slot ${slotIdx + 1}: ${_KLBL[_kind]} treki olindi (${kfs.length} KF, ${duration.toFixed(2)}s)`, 'lok');
    } else if (targetObj) {
      log(`✅ Slot ${slotIdx + 1}: "${targetObj.userData.name}" timeline'idan olindi (${kfs.length} KF, ${duration.toFixed(2)}s)`, 'lok');
    } else {
      log(`⚠ Slot ${slotIdx + 1}: keyframes olindi ammo "${track.objName || '?'}" sahnadan topilmadi — Maqsad'ni qo'lda tanlang`, 'lw');
    }
    updateInspector();
  }

  // ── Play mode hooks — o'yin to'xtaganda pritselni yashir ────
  function onPlayStop() {
    // Ko'tarilgan predmetni qaytar, tashlanganlarni to'xtat
    if (_carried) _dropCarried();
    _thrownItems.length = 0;
    // 🎥 Kamera animatsiyasi + 🌀 teleport holatini tozalash
    _resetCamAndTeleport();
    // Har bir tugmani boshiga qaytar
    objects.forEach(o => {
      if (o.userData && o.userData.isInteractiveBtn) {
        o.userData._currentIdx = 0;
        o.userData._direction  = 1;
        o.userData._playing    = false;
      }
    });
  }

  return {
    mpReplay,        // 📡 multiplayer: kelgan bosishni takrorlaydi
    create,
    createGaze,
    // ⌨️ Konsol komandalari (`apex.start - button`) tugmani QO'LDA
    //   ishga tushirishi uchun. Ilgari `_fireButton` faqat ichkarida
    //   edi va tashqaridan tugmani "bosish" imkoni yo'q edi.
    fire: (btn, silent) => _fireButton(btn, silent),
    restoreGazeVisual,
    restoreBtnVisual,
    addBtn:         () => create(),
    update,
    buildInspector,
    onPlayStop,
    reset,
    // 📦 Pickup holati — hitbox "predmet sharti" uchun
    isCarried,
    getCarried,
    isThrown,
    releaseCarried,
    giveItem,
    // ⚖️ Ko'tarilgan predmet fizikasi — 🎒 inventar shu API ga murojaat
    //    qiladi (o'zi fizikaga tegmaydi; mantiq egasi shu tizim)
    suspendPhysics,
    resumePhysics,

    /**
     * 🎯 Qo'ldagi predmetni HAQIQIY tashlash yo'li bilan uchiradi.
     *
     * ⚠ NEGA EKSPORT: 🎒 inventarning o'z tashlash tugmasi bor (`Q`).
     *   U `releaseCarried()` ni chaqirmasligi SHART — o'sha predmetni
     *   shu yerda qoldiradi: tezlik yo'q, `_thrownItems` ga tushmaydi,
     *   ya'ni sakrab tashlangan predmet osmonda qotib qolardi va
     *   `isThrown()` ga tayanadigan 🎯 hitbox sharti ishlamasdi.
     *   Bitta uchish yo'li — bitta funksiya.
     *
     * @param {THREE.Object3D} [btn] tashlash kuchini beradigan tugma
     *        (bo'lmasa standart: `throwForce = 12`)
     * @returns {boolean} rostdan tashlandimi
     */
    throwCarried: (btn) => {
      if (!_carried) return false;
      _throwCarried(btn);
      return true;
    },

    // 📦 Predmet sharti — tashqi tizimlar (inventar, testlar) uchun
    itemReqStep:    _irStep,            // predmetni qabul qilib ketma-ketlikni suradi
    itemReqAccepts: _irAccepts,         // qo'ldagi predmet joriy slotga mos keladimi
    itemReqMatch:   (ud) => _irMatchHeld(ud),
    itemReqRestore: _irRestoreConsumed, // Stop'da yo'q qilinganlarni qaytarish
    itemReqReset:   _irResetFlags,      // "ishlatilgan" belgilarini tozalash
    _defaultData,
  };
})();

// Global registrasyon (add-object menu va inspector uchun)
window.addInteractiveButton = function() {
  return InteractiveButtonSystem.create();
};
window.addGazeTrigger = function() {
  return InteractiveButtonSystem.createGaze();
};
window.buildInteractiveBtnInspector = function(obj) {
  InteractiveButtonSystem.buildInspector(obj);
};
