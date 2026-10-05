// ============================================================
//  🌐 MULTIPLAYER: 🎛 AllKey — SHAXSIY amal, TARQATILMAYDI
// ------------------------------------------------------------
//  ⚠ ATAYLAB: AllKey o'yinchining KLAVIATURASINI o'zgartiradi —
//    tezlik, sakrash, bloklangan klavishlar, ekran tugmalari.
//
//    Uni tarqatsak bir odam zonaga kirganda HAMMANING boshqaruvi
//    buzilardi: kimdir suv ostiga tushsa hamma sekinlashardi.
//
//  ⚠ 🎯 hitbox, 🔘 tugma, 👁 qarash, 🔊 ovoz, 🗺 karta — DUNYO
//    amallari va ular TARQATILADI (`MultiplayerSystem.WORLD_EVENTS`).
//    AllKey esa ataylab o'sha ro'yxatda YO'Q.
// ============================================================
// ============================================================
//  🎛 ALLKEY — hududga bog'langan KLAVIATURA sozlamasi
// ------------------------------------------------------------
//  O'yinchi shu trigger ichiga kirsa, klaviatura boshqacha ishlay
//  boshlaydi. Chiqib ketsa — hammasi standartga qaytadi.
//
//  Nima o'zgartirish mumkin (har biri ALOHIDA yoqiladi):
//    🚫 Klavishni bloklash            — o'sha zonada ishlamaydi
//    🔊 Klavish ovozini almashtirish
//    🎬 Klavish animatsiyasini almashtirish
//    🔗 Alternativ (kombo) klavish
//    🔢 NoScript sonini o'zgartirish  — kam yoki ko'p beradi
//    🖥 Ekran tugmasi: yashirish · ko'rsatish · nomini almashtirish
//    🧍 O'yinchi kapsulasi o'lchami
//    🖱 Sichqoncha sezgirligi
//    📷 Kamerani biriktirish (fix)
//
//  ── NEGA ALOHIDA TIZIM, NEGA 🎯 HITBOX EMAS ──────────────────
//  Hitbox — HODISA tetigi: kirdi → bir marta ishladi. AllKey esa
//  HOLAT: zona ichida turgan VAQT davomida amal qiladi va chiqishda
//  orqaga qaytariladi. Ikkisini bitta tizimga tiqsak "bir marta"
//  va "davomiy" mantiqlari chalkashardi.
//
//  ── ORQAGA QAYTARISH ────────────────────────────────────────
//  ⚠ ENG NOZIK JOY: zona nimani o'zgartirgan bo'lsa, chiqishda
//    AYNAN o'shani tiklashi kerak. Shuning uchun har o'zgarish
//    OLDIN eski qiymatni `_prev` ga yozadi. "Standartga qaytar"
//    deb qattiq qiymat yozsak, dizaynerning o'z sozlamasi
//    yo'q bo'lardi.
//
//  ── REJIMLAR ────────────────────────────────────────────────
//    'inside'  — faqat zona ICHIDA amal qiladi (standart)
//    'sticky'  — kirgach QOLADI; boshqa AllKey zonasi bekor qilmaguncha
//                yoki "standart" rejimli zonaga kirmaguncha
// ============================================================
window.AllKeySystem = (function () {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);
  const _objs = () => (typeof objects !== 'undefined' && objects) ? objects : [];
  const zones = () => _objs().filter(o => o && o.userData && o.userData.isAllKey);

  const _tmpP = new THREE.Vector3();
  const _tmpC = new THREE.Vector3();
  const _tmpS = new THREE.Vector3();

  // ── Standart ma'lumot ───────────────────────────────────────
  function _defaultData() {
    return {
      isAllKey:  true,
      // 🧊 Zona shakli — 🎯 hitbox bilan bir xil atamalar
      zoneShape: 'box',                     // box | sphere
      triggerSize: { x: 4, y: 3, z: 4 },
      mode: 'inside',                       // inside | sticky
      //  ⚠ `colliderMode: 'inline'` — zona O'TKAZUVCHI. Qattiq qilsak
      //    o'yinchi unga kira olmasdi va tetik hech qachon
      //    ishlamasdi (🎯 hitbox bilan bir xil sabab).
      colliderMode: 'inline',
      // ============================================================
      //  ⌨ KLAVISH QOIDALARI — klaviatura muharriri yozadi
      // ------------------------------------------------------------
      //  ⚠ Tuzilishi `window._kbAnimations` bilan AYNAN bir xil:
      //      { KeyE: { animName, altKey, blocked, holdEnd, sound } }
      //    Shu bois muharrir ikkalasini ham bir xil tahrirlaydi —
      //    ikkinchi interfeys yozish shart emas.
      //
      //  ⚠ Eski `rules` massivi TASHLANDI: u o'z formatiga ega edi
      //    va muharrir uni o'qiy olmasdi. Eski sahnalar `restoreVisual`
      //    da ko'chiriladi.
      keys: {},
      // 🔊 Klavish ovozlari: { KeyE: { soundName, soundUrl, mode, volume } }
      //  ⚠ `_kbSounds` bilan AYNAN bir xil tuzilish — muharrir
      //    ikkalasini ham bir xil tahrirlaydi.
      sounds: {},
      // 🖥 Ekran tugmalari shabloni — zonaga kirganda almashadi
      //  ⚠ Nomi bo'yicha, id bo'yicha EMAS: shablonlar serverda va
      //    id lar boshqa kompyuterda mos kelmasligi mumkin.
      skTemplate: '',
      // 🧍 O'yinchi kapsulasi — yoqilsa zona ichida almashadi
      capsule:  { on: false, radius: 0.4, height: 1.8 },
      // 🖱 Sichqoncha
      mouse:    { on: false, sens: 1.0 },
      // 📷 Kamerani biriktirish
      camFix:   { on: false, yaw: 0, pitch: 0, lock: true },
      // ── 🏃 HARAKAT — zona ichida boshqacha yuradi ────────────
      //  ⚠ Har biri ALOHIDA yoqiladi. Bitta \"harakat\" bayrog'i
      //    qilsak dizayner faqat tezlikni o'zgartirmoqchi bo'lganda
      //    sakrash balandligi ham majburan yozilardi.
      move:     { on: false, speed: 1.0, jump: 1.0, gravity: 1.0, canJump: true },
      // ── 🚫 CHEKLOVLAR ──────────────────────────────────────
      //  \"Suv ostida yugurib bo'lmaydi\", \"minoradan otib bo'lmaydi\"
      //  kabi holatlar — kod yozmasdan.
      lockRun:   false,        // 🏃 yugurish o'chadi
      lockJump:  false,        // ⬆ sakrash o'chadi
      lockShoot: false,        // 🔫 otish o'chadi
      lockPick:  false,        // ✋ predmet ko'tarish o'chadi
      // ── 🎬 KIRISH/CHIQISHDA bir martalik ta'sir ─────────────
      //  ⚠ Bular HOLAT emas, HODISA: kirganda bir marta ishlaydi
      //    va orqaga qaytarilmaydi.
      onEnter:  { sound: '', anim: '', nsOp: '', nsValue: 0, nsSlot: null },
      onExit:   { sound: '', anim: '', nsOp: '', nsValue: 0, nsSlot: null },
      _inside:  false,
    };
  }

  /** Bitta klavish qoidasi. */
  function newRule(code) {
    return {
      code:    code || 'KeyE',
      block:   false,          // 🚫 bu klavish zonada ishlamasin
      sound:   '',             // 🔊 almashtiriladigan ovoz nomi ('' = tegilmaydi)
      anim:    '',             // 🎬 almashtiriladigan animatsiya nomi
      altKey:  '',             // 🔗 kombo/alternativ klavish
      // 🔢 NoScript soni
      nsOn:    false, nsOp: '+', nsValue: 1, nsSlot: null,
      // 🖥 Ekran tugmasi
      skMode:  'keep',         // keep | hide | show | relabel
      skLabel: '',
    };
  }

  // ============================================================
  //  🧍 O'yinchi
  // ------------------------------------------------------------
  //  ⚠ Tartib `SoundBlockSystem._getPlayerRef` va `MiniPadSystem`
  //    bilan AYNAN bir xil: uch tizim bir savolga ("o'yinchi
  //    qayerda?") boshqa-boshqa javob bermasligi kerak.
  // ============================================================
  function _playerRef() {
    if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent) return playerMesh;
    if (typeof PlayerController !== 'undefined' && PlayerController.obj) return PlayerController.obj;
    if (typeof playerMesh !== 'undefined' && playerMesh) return playerMesh;
    return null;
  }

  /** O'yinchi shu zona ichidami. */
  function inside(zone, p) {
    if (!zone || !p) return false;
    const ud = zone.userData;
    zone.updateMatrixWorld(true);
    _tmpC.setFromMatrixPosition(zone.matrixWorld);
    zone.getWorldScale(_tmpS);
    //  ⚠ O'LCHAM FAQAT MASSHTABDAN. `syncSize()` `triggerSize` ni
    //    MASSHTABGA yozadi (geometriya 1×1×1), ya'ni ikkalasini
    //    ko'paytirsak o'lcham KVADRATGA ko'tarilardi: 4 × 4 = 8 m
    //    yarim o'lcham, ya'ni zona ikki barobar katta bo'lardi.
    //    Test buni darrov ko'rsatdi: 3 m uzoqdagi o'yinchi ham
    //    \"ichkarida\" chiqdi.
    //  ⚠ Yon foydasi: ⏱ timeline masshtabni o'zgartirsa zona ham
    //    o'sha zahoti kattalashadi — alohida kod kerak emas.
    const hx = Math.abs(_tmpS.x) * 0.5, hy = Math.abs(_tmpS.y) * 0.5, hz = Math.abs(_tmpS.z) * 0.5;
    const dx = p.x - _tmpC.x, dy = p.y - _tmpC.y, dz = p.z - _tmpC.z;
    if (ud.zoneShape === 'sphere') {
      const r = Math.max(hx, hy, hz);
      return (dx * dx + dy * dy + dz * dz) <= r * r;
    }
    return Math.abs(dx) <= hx && Math.abs(dy) <= hy && Math.abs(dz) <= hz;
  }

  // ============================================================
  //  ⏮ ORQAGA QAYTARISH
  // ------------------------------------------------------------
  //  ⚠ Har o'zgarish OLDIN eski qiymatni yozadi. "Standartga
  //    qaytar" deb qattiq qiymat yozsak dizaynerning o'z sozlamasi
  //    yo'q bo'lardi — masalan u W ga ataylab boshqa ovoz qo'ygan
  //    bo'lsa, zonadan chiqqach u ham o'chib ketardi.
  // ============================================================
  let _prev = null;          // { kb:{}, sk:{}, skAll, cap, mouse, cam, move, locks }
  let _owner = null;         // qaysi zona amalda

  function _snapKb(code) {
    if (!_prev.kb[code]) {
      const a = (window._kbAnimations && window._kbAnimations[code]) || null;
      _prev.kb[code] = a ? JSON.parse(JSON.stringify(a)) : null;
    }
  }

  function _snapSk(id) {
    if (_prev.sk[id] === undefined && window.ScreenKeys) {
      const k = window.ScreenKeys.find(id);
      _prev.sk[id] = k ? { vis: k.vis !== false, label: k.label } : null;
    }
  }

  // ============================================================
  //  🎬 Bir martalik ta'sir (kirish / chiqish)
  // ------------------------------------------------------------
  //  ⚠ Bular HOLAT emas, HODISA: bir marta ishlaydi va orqaga
  //    qaytarilmaydi. Shuning uchun `_prev` ga yozilmaydi — ovozni
  //    \"qaytarib\" bo'lmaydi.
  // ============================================================
  function _fire(ev, why) {
    if (!ev) return;
    if (ev.sound && window.SoundSystem) {
      try { window.SoundSystem.play(ev.sound, null, { volume: 0.9 }); } catch (e) {}
    }
    if (ev.anim && typeof window._triggerObjAnim === 'function') {
      try { window._triggerObjAnim(ev.anim, null); } catch (e) {}
    }
    if (ev.nsOp && window.NoScriptSystem) {
      try {
        window.NoScriptSystem.apply(ev.nsOp, ev.nsValue, '🎛 ' + (why || 'zona'),
                             ev.nsSlot == null ? undefined : ev.nsSlot);
      } catch (e) {}
    }
  }

  function apply(zone) {
    if (!zone) return false;
    const ud = zone.userData;
    if (_owner === zone) return false;         // allaqachon amalda
    if (_owner) revert();                      // avval eskisini qaytaramiz
    _owner = zone;
    _prev = { kb: {}, sk: {}, skAll: null, cap: null, mouse: null, cam: null };

    // ── ⌨ Klavish qoidalari (klaviatura muharriri yozgan) ──
    //  ⚠ Zona jadvali global jadval USTIGA yoziladi, uni
    //    ALMASHTIRMAYDI: zona faqat o'zi belgilagan klavishlarga
    //    tegadi, qolganlari dizayner qo'ygancha qoladi.
    if (!window._kbAnimations) window._kbAnimations = {};
    const zk = ud.keys || {};
    for (const code in zk) {
      const r = zk[code];
      if (!r) continue;
      _snapKb(code);
      const a = window._kbAnimations[code] || (window._kbAnimations[code] = {});
      //  ⚠ Faqat YOZILGAN maydonlar ko'chiriladi: `undefined` ni
      //    ko'chirsak dizaynerning global sozlamasi o'chib ketardi.
      if (r.blocked  !== undefined) a.blocked  = r.blocked;
      if (r.animName)               a.animName = r.animName;
      if (r.altKey)                 a.altKey   = r.altKey;
      if (r.holdEnd  !== undefined) a.holdEnd  = r.holdEnd;
      //  🔊 Ovoz: FAYL (data URL) ustun, nom zaxira.
      if (r.soundUrl) a.soundUrl = r.soundUrl;
      else if (r.sound) a.sound  = r.sound;
    }

    // ── 🔊 Klavish OVOZLARI ───────────────────────────
    //  ⚠ Ovozlar ALOHIDA xaritada (`window._kbSounds`) — klavish
    //    animatsiyalaridan mustaqil. Zona ularni ham qamrab olishi
    //    kerak, aks holda \"zonada W boshqa ovoz chiqarsin\" ishlamasdi.
    //  ⚠ Ovoz FAYL sifatida saqlanadi (`soundUrl` — data URL), nom
    //    bo'yicha emas: nom bo'yicha izlash boshqa loyihada
    //    topilmasdi va ovoz jimgina chiqmasdi.
    if (ud.sounds && window._kbSounds) {
      _prev.snd = {};
      for (const code in ud.sounds) {
        const src = ud.sounds[code];
        if (!src) continue;
        _prev.snd[code] = window._kbSounds[code]
          ? JSON.parse(JSON.stringify(window._kbSounds[code])) : null;
        window._kbSounds[code] = JSON.parse(JSON.stringify(src));
      }
    }

    // ── 🖥 Ekran tugmalari SHABLONI ────────────────────
    //  ⚠ Butun joylashuv almashadi, bitta tugma emas. \"Mashinada
    //    boshqa tugmalar\", \"suv ostida boshqa tugmalar\" — aynan
    //    shu kerak bo'ladi.
    //  ⚠ HOZIRGI holat to'liq eslab qolinadi: chiqishda dizayner
    //    yig'gan joylashuv AYNAN tiklanadi.
    if (ud.skTemplate && window.ScreenKeys && window.ButtonTemplates) {
      _prev.skAll = window.ScreenKeys.serialize();
      const tpl = window.ButtonTemplates.list().find(x =>
        String(x.name).toLowerCase() === String(ud.skTemplate).toLowerCase());
      if (tpl) window.ScreenKeys.restore({ keys: JSON.parse(JSON.stringify(tpl.keys)) });
      else _log(`⚠ "${ud.skTemplate}" shabloni topilmadi`, 'lw');
    }

    // ── 🧍 Kapsula ──
    if (ud.capsule && ud.capsule.on && window.PlayerController) {
      const pc = window.PlayerController;
      _prev.cap = { radius: pc.radius, height: pc.height };
      if (typeof ud.capsule.radius === 'number') pc.radius = ud.capsule.radius;
      if (typeof ud.capsule.height === 'number') pc.height = ud.capsule.height;
    }
    // ── 🖱 Sichqoncha ──
    if (ud.mouse && ud.mouse.on && typeof playerSettings !== 'undefined' && playerSettings) {
      _prev.mouse = playerSettings.mouseSens;
      playerSettings.mouseSens = ud.mouse.sens;
    }
    // ── 📷 Kamera fix ──
    if (ud.camFix && ud.camFix.on && window.PlayerController) {
      const pc = window.PlayerController;
      _prev.cam = { yaw: pc.camYaw, pitch: pc.camPitch, lock: !!pc.camLocked };
      if (typeof ud.camFix.yaw   === 'number') pc.camYaw   = ud.camFix.yaw;
      if (typeof ud.camFix.pitch === 'number') pc.camPitch = ud.camFix.pitch;
      pc.camLocked = !!ud.camFix.lock;
    }

    // ── 🏃 Harakat ──
    if (ud.move && ud.move.on && typeof playerSettings !== 'undefined' && playerSettings) {
      _prev.move = { speed: playerSettings.moveSpeed, jump: playerSettings.jumpPower,
                     gravity: playerSettings.gravity };
      //  ⚠ KO'PAYTUVCHI, almashtiruvchi EMAS: dizaynerning o'z
      //    tezligi saqlanadi, zona uni faqat \"ikki barobar sekin\"
      //    qiladi. Aniq son yozsak har sahnada boshqacha chiqardi.
      if (typeof playerSettings.moveSpeed === 'number') playerSettings.moveSpeed *= ud.move.speed;
      if (typeof playerSettings.jumpPower === 'number') playerSettings.jumpPower *= ud.move.jump;
      if (typeof playerSettings.gravity   === 'number') playerSettings.gravity   *= ud.move.gravity;
    }
    // ── 🚫 Cheklovlar ──
    //  ⚠ Bayroqlar `window` da: ularni o'yinchi kontrolleri, 🔫 qurol
    //    va ✋ ko'tarish tizimi o'qiydi. Har biri o'z tizimiga
    //    tegmasdan \"so'rov\" qo'yamiz — shunda tizimlar bir-birini
    //    bilmaydi.
    _prev.locks = { run: window._akLockRun, jump: window._akLockJump,
                    shoot: window._akLockShoot, pick: window._akLockPick };
    if (ud.lockRun)   window._akLockRun   = true;
    if (ud.lockJump)  window._akLockJump  = true;
    if (ud.lockShoot) window._akLockShoot = true;
    if (ud.lockPick)  window._akLockPick  = true;

    // ── 🎬 Kirishda bir martalik ──
    _fire(ud.onEnter, `"${ud.name}" kirish`);

    _log(`🎛 "${ud.name}" — klaviatura sozlamasi qo'llandi ` +
         `(${Object.keys(ud.keys || {}).length} klavish` +
         `${ud.skTemplate ? ', 🖥 ' + ud.skTemplate : ''})`, 'lok');
    if (window.ScreenKeys) window.ScreenKeys.render();
    return true;
  }

  function revert() {
    if (!_owner || !_prev) return false;
    const nm = _owner.userData ? _owner.userData.name : 'zona';

    for (const code in _prev.kb) {
      if (code.indexOf('__ns_') === 0) {
        //  🔢 NoScript miqdori
        const real = code.slice(5);
        const d = window.KeyNoScript && window.KeyNoScript.get(real);
        const p = _prev.kb[code];
        if (d && p) { d.op = p.op; d.value = p.value; d.slot = p.slot; }
        continue;
      }
      const p = _prev.kb[code];
      //  ⚠ `null` — bu klavishda ILGARI hech nima yo'q edi. Bo'sh
      //    obyekt qoldirsak `anims[code]` mavjud bo'lib qolib,
      //    keyingi tekshiruvlar boshqacha yurardi.
      if (p === null) delete window._kbAnimations[code];
      else            window._kbAnimations[code] = p;
    }
    if (_prev.snd && window._kbSounds) {
      for (const code in _prev.snd) {
        //  ⚠ `null` — bu klavishda ILGARI ovoz yo'q edi. Bo'sh
        //    obyekt qoldirsak `_kbSounds[code]` mavjud bo'lib qolib,
        //    keyingi tekshiruvlar boshqacha yurardi.
        if (_prev.snd[code] === null) delete window._kbSounds[code];
        else window._kbSounds[code] = _prev.snd[code];
      }
    }
    //  🖥 Shablon — dizayner yig'gan joylashuv AYNAN tiklanadi
    if (_prev.skAll && window.ScreenKeys) {
      window.ScreenKeys.restore(_prev.skAll);
    }
    for (const id in _prev.sk) {
      const p = _prev.sk[id];
      if (!p || !window.ScreenKeys) continue;
      window.ScreenKeys.set(+id, 'vis', p.vis);
      window.ScreenKeys.set(+id, 'label', p.label);
    }
    if (_prev.cap && window.PlayerController) {
      window.PlayerController.radius = _prev.cap.radius;
      window.PlayerController.height = _prev.cap.height;
    }
    if (_prev.mouse !== null && typeof playerSettings !== 'undefined' && playerSettings) {
      playerSettings.mouseSens = _prev.mouse;
    }
    if (_prev.cam && window.PlayerController) {
      window.PlayerController.camLocked = _prev.cam.lock;
    }
    if (_prev.move && typeof playerSettings !== 'undefined' && playerSettings) {
      playerSettings.moveSpeed = _prev.move.speed;
      playerSettings.jumpPower = _prev.move.jump;
      playerSettings.gravity   = _prev.move.gravity;
    }
    if (_prev.locks) {
      //  ⚠ `undefined` ga qaytaramiz, `false` ga EMAS: boshqa tizim
      //    ham shu bayroqni qo'ygan bo'lishi mumkin va `false`
      //    uning cheklovini ham bekor qilardi.
      window._akLockRun   = _prev.locks.run;
      window._akLockJump  = _prev.locks.jump;
      window._akLockShoot = _prev.locks.shoot;
      window._akLockPick  = _prev.locks.pick;
    }
    // ── 🎬 Chiqishda bir martalik ──
    if (_owner && _owner.userData) _fire(_owner.userData.onExit, `"${nm}" chiqish`);
    _owner = null;
    _prev = null;
    _log(`🎛 "${nm}" — sozlama standartga qaytdi`, 'lok');
    if (window.ScreenKeys) window.ScreenKeys.render();
    return true;
  }

  const owner = () => _owner;

  // ============================================================
  //  🔁 Kadr
  // ============================================================
  let _was = false;
  function update() {
    const p = _playing();
    if (p !== _was) {
      _was = p;
      // ============================================================
      //  👁 ZONA ▶ PLAY DA KO'RINMAYDI
      // ------------------------------------------------------------
      //  ⚠ AllKey — MUHARRIR vositasi: sim ramka va binafsha to'ldiruvchi
      //    dizayner uni ko'rib joylashtirishi uchun. O'yinchi uchun u
      //    ko'rinmas hudud bo'lishi kerak — aks holda o'yin o'rtasida
      //    katta binafsha quti turardi.
      //  ⚠ `visible` ni ⏹ Stop da `play-mode.js` `savedStates` orqali
      //    o'zi tiklaydi (🎯 hitbox bilan bir xil naqsh), shuning uchun
      //    bu yerda faqat yashiramiz.
      for (const z of zones()) { if (z) z.visible = !p; }
      //  ⚠ ▶/⏹ o'tishida HAR DOIM qaytaramiz: o'yin zona ichida
      //    to'xtatilsa sozlama muharrirga ham o'tib ketardi va
      //    dizayner uni qo'lda tuzatishga majbur bo'lardi.
      revert();
      for (const z of zones()) if (z.userData) z.userData._inside = false;
      return;
    }
    if (!p) return;

    const ref = _playerRef();
    if (!ref) return;
    ref.updateMatrixWorld(true);
    ref.getWorldPosition(_tmpP);

    let hit = null;
    for (const z of zones()) {
      const ud = z.userData;
      if (!ud || ud.enabled === false) continue;
      const inZone = inside(z, _tmpP);
      ud._inside = inZone;
      //  ⚠ BIRINCHI mos zona yutadi. Ikkitasi ustma-ust bo'lsa
      //    ikkalasini qo'llash mumkin emas: ular bir xil klavishni
      //    boshqacha o'zgartirishi mumkin va natija tasodifiy
      //    bo'lardi. Ro'yxat tartibi — dizaynerning qaroriga qoladi.
      if (inZone && !hit) hit = z;
    }

    if (hit) { if (_owner !== hit) apply(hit); return; }

    //  Zona tashqarisida
    if (_owner) {
      const m = _owner.userData ? _owner.userData.mode : 'inside';
      //  ⚠ `sticky` — chiqib ketsa ham QOLADI. Boshqa zona bekor
      //    qilguncha yoki ⏹ Stop gacha. \"Bu qurolni oldingdan keyin
      //    boshqaruv butunlay o'zgardi\" kabi holatlar uchun.
      if (m !== 'sticky') revert();
    }
  }

  // ============================================================
  //  🧊 Yaratish
  // ============================================================
  function create(pos) {
    const s = 1;
    const mat = new THREE.MeshBasicMaterial({
      color: 0x7a5cff, wireframe: true, transparent: true, opacity: 0.75,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshBasicMaterial({
      color: 0x7a5cff, transparent: true, opacity: 0.10, depthWrite: false,
    }));
    fill.raycast = () => {};
    fill.name = '__ak_fill__';
    mesh.add(fill);
    mesh.position.copy(pos || new THREE.Vector3(0, 1.5, 0));
    mesh.userData = Object.assign({
      id:   (typeof objIdC !== 'undefined') ? ++objIdC : Date.now(),
      name: '🎛 AllKey',
    }, _defaultData());
    syncSize(mesh);
    return mesh;
  }

  /** O'lchamni `triggerSize` ga moslaydi (masshtab orqali). */
  function syncSize(o) {
    if (!o || !o.userData) return;
    const t = o.userData.triggerSize || { x: 4, y: 3, z: 4 };
    o.scale.set(t.x, t.y, t.z);
  }

  /** Sahnadan yuklangach ko'rinishni tiklaydi. */
  // ============================================================
  //  🔄 ESKI SAHNALARNI KO'CHIRISH
  // ------------------------------------------------------------
  //  Eski format: `rules: [{ code, block, anim, sound, altKey, … }]`
  //  Yangi: `keys: { KeyE: { blocked, animName, sound, altKey } }`
  //  — chunki u `window._kbAnimations` bilan bir xil va klaviatura
  //  muharriri uni to'g'ridan-to'g'ri tahrirlaydi.
  //
  //  ⚠ Ko'chirish O'QISH paytida: fayl o'zgarmaydi.
  // ============================================================
  function _migrate(ud) {
    if (!ud || !Array.isArray(ud.rules) || !ud.rules.length) return;
    if (!ud.keys) ud.keys = {};
    for (const r of ud.rules) {
      if (!r || !r.code || ud.keys[r.code]) continue;
      const k = {};
      if (r.block)  k.blocked  = true;
      if (r.anim)   k.animName = r.anim;
      if (r.sound)  k.sound    = r.sound;
      if (r.altKey) k.altKey   = r.altKey;
      ud.keys[r.code] = k;
    }
    _log(`🔄 "${ud.name}" — ${ud.rules.length} ta eski qoida ko'chirildi`, 'lok');
    delete ud.rules;
  }

  function restoreVisual(o) {
    if (!o || !o.userData || !o.userData.isAllKey) return o;
    _migrate(o.userData);
    if (!o.userData.keys) o.userData.keys = {};
    //  ⚠ To'ldiruvchi bola SAQLANMAYDI (u ko'rinish, sahna emas) —
    //    yuklashda qayta yasaymiz. Busiz zona faqat sim bo'lib
    //    ko'rinib, uni sichqoncha bilan ilib olish qiyin bo'lardi.
    if (!o.children.some(c => c.name === '__ak_fill__')) {
      const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
        color: 0x7a5cff, transparent: true, opacity: 0.10, depthWrite: false,
      }));
      fill.raycast = () => {};
      fill.name = '__ak_fill__';
      o.add(fill);
    }
    syncSize(o);
    return o;
  }

  return { create, restoreVisual, syncSize, update, zones, inside,
           apply, revert, owner, newRule, _defaultData, _playerRef, _migrate };
})();

/** 🎛 Sahnaga AllKey zonasi qo'shadi (ASSETLAR → Shakl). */
window.addAllKeyZone = function (pos) {
  if (!window.AllKeySystem) return null;
  const mesh = AllKeySystem.create(pos);
  //  ⚠ Nom TARTIB RAQAMI bilan: bir nechta zona bo'lsa ierarxiyada
  //    ularni ajratib bo'lmasdi.
  mesh.userData.name = '🎛 AllKey ' + (AllKeySystem.zones().length + 1);
  scene.add(mesh);
  objects.push(mesh);
  if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
  if (typeof updateHierarchy === 'function') updateHierarchy();
  if (typeof selectObject === 'function') selectObject(mesh);
  try { log('🎛 AllKey zonasi qo\'shildi — o\'yinchi kirsa klaviatura o\'zgaradi', 'lok'); } catch (e) {}
  return mesh;
};
