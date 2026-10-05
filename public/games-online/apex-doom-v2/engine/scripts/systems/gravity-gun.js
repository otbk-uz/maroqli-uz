// ============================================================
//  🔫 GRAVITY GUN  v1.0
// ------------------------------------------------------------
//  Fizikasi yoqilgan obyektlarni KO'TARISH tizimi. Ikki rejim:
//
//    🖐 QO'L      — quroldan tashqari. O'yinchi menyusida bitta
//                   "maks kg" bor: shundan yengil narsani ko'taradi.
//    🔫 GRAVITY   — qurol ushlanganda. MIN va MAKS kg oralig'i bor,
//       GUN         ya'ni juda yengil narsani ham, juda og'irini ham
//                   rad etadi (masalan 5–200 kg).
//
//  Tugma sozlanadi (standart `E`) yoki sichqoncha tugmasi tanlanadi.
//
//  ⚙️ NEGA RAPIER TANASI "UCHIRIB" OLIB BORILADI, `camera.attach` EMAS.
//     `interactive-button.js` dagi mavjud pickup obyektni kameraga
//     bola qilib ulaydi. U YENGIL predmetlar uchun (kalit, qurol)
//     to'g'ri: predmet devordan o'tib ketsa ham muammo emas.
//     Fizik jism uchun bu YARAMAYDI — 200 kg li quti devor ichidan
//     o'tib ketardi va qo'yib yuborilganda dunyoning yarmida paydo
//     bo'lardi.
//     Shuning uchun bu yerda jism DINAMIK qoladi: har kadr uning
//     TEZLIGI nishon nuqtaga qarab beriladi (prujina). Natijada u
//     devorga urilib to'xtaydi, boshqa jismlarni turtadi va qo'yib
//     yuborilganda tabiiy tushadi.
// ============================================================

window.GravityGunSystem = (() => {

  const DEF = {
    // 🖐 Qo'l (quroldan tashqari)
    handEnabled: true,
    handMaxMass: 15,        // kg — shundan og'irini ko'tara olmaydi
    // 🔫 Gravity gun
    gunEnabled:  false,     // qurol o'yinchida bormi
    gunMinMass:  0,         // kg — undan yengili "ilashmaydi"
    gunMaxMass:  200,       // kg
    gunRange:    12,        // m — nur uzunligi
    // Umumiy
    handRange:   3,         // m — qo'l bilan yetib boradigan masofa
    key:         'KeyE',    // ko'tarish/qo'yish tugmasi
    holdDist:    2.2,       // m — jism ko'z oldida qancha uzoqda tursin
    holdHeight:  -0.2,      // m — ko'zdan pastga siljish
    throwForce:  9,         // otish kuchi (impuls koeff.)
    stiffness:   12,        // nishonga tortish kuchi
    // ⚠ 18 m/s juda tez edi: o'yinchi keskin burilsa jism qamchidek
    //   aylanib, devor va yerga urilardi — qo'yilgandan keyin ham
    //   sapchib yurardi. 8 m/s da harakat silliq, lekin sudralib
    //   qolmaydi.
    maxSpeed:    8,         // m/s — tortish tezligi chegarasi
  };

  const cfg = Object.assign({}, DEF);

  let _held      = null;   // ko'tarilgan mesh
  let _heldPrevDamp = null;
  let _heldPrevCol  = undefined;   // ko'tarishdan oldingi `colliderMode`
  let _keyWasDown = false;

  const _v  = new THREE.Vector3();
  const _t  = new THREE.Vector3();
  const _dir= new THREE.Vector3();
  const _ray = new THREE.Raycaster();

  const _playing = () => (typeof isPlaying !== 'undefined') && isPlaying;

  // ── Yordamchilar ────────────────────────────────────────────
  function _player() {
    if (window.PlayerController && PlayerController.obj) return PlayerController.obj;
    if (typeof playerMesh !== 'undefined' && playerMesh) return playerMesh;
    return null;
  }

  /** Ko'z nuqtasi va qarash yo'nalishi — 1-shaxs va 3-shaxsda ham to'g'ri. */
  function _eye(outPos, outDir) {
    const P = window.PlayerController;
    if (P && P.obj && P.camYaw !== undefined) {
      // 3-shaxsda kamera o'yinchi ORQASIDA — nur o'yinchidan otilishi kerak
      P.obj.getWorldPosition(outPos);
      outPos.y += 1.2;
      const yaw = P.camYaw || 0, pitch = P.camPitch || 0;
      outDir.set(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      ).normalize();
      // Kamera oldinga −Z ga qaraydi — o'yinchi yaw'i bilan mos kelishi uchun
      outDir.x = -outDir.x; outDir.z = -outDir.z;
      return true;
    }
    if (typeof camera === 'undefined' || !camera) return false;
    camera.getWorldPosition(outPos);
    camera.getWorldDirection(outDir);
    return true;
  }

  /** Obyektning fizika yozuvi (massa shu yerda). */
  function _body(mesh) {
    if (typeof physBodies === 'undefined') return null;
    return physBodies.find(b => b.mesh === mesh) || null;
  }

  /** Ko'tarilishi MUMKIN bo'lgan jismmi — va nega yo'q. */
  function canLift(mesh) {
    if (!mesh) return { ok: false, why: 'yo\'q' };
    const ud = mesh.userData || {};

    // ⚠ 1) DIZAYNER O'CHIRGAN. Inspektordagi "Ushlash mumkin"
    //   bayrog'i. Fizikasi bor, dinamik, og'irligi joyida — lekin
    //   o'yin mantig'iga ko'ra ko'tarilmasligi kerak (dekoratsiya,
    //   qurilma qismi, jumboq elementi). Eng birinchi tekshiriladi:
    //   qolgan sabablardan ustun.
    if (ud.grabbable === false) return { ok: false, why: 'ushlash o\'chirilgan' };

    // ⚠ 2) FUNKSIONAL BLOK — 🔘 tugma, 💻 PC, 👁 qarash, 📝 matn,
    //   🔊 ovoz, 🗺 map loader, 📁 papka, 📷 kamera, 🛤 yo'l…
    //   Ular `SceneTypes` da `physics: null` bilan turibdi, ya'ni
    //   normal holatda fizika tanasi ham yo'q — lekin eski sahnalarda
    //   yoki qo'lda qo'shilganда tana qolib ketishi mumkin. Bunda
    //   o'yinchi tugmani "ko'tarib" ketardi va u ishlamay qolardi.
    //   ⚠ Ro'yxatni QAYTA SANAMAYMIZ: `SceneTypes` — yagona reyestr.
    try {
      if (window.SceneTypes && typeof SceneTypes.match === 'function') {
        const t = SceneTypes.match(ud);
        if (t && t.physics === null) return { ok: false, why: 'funksional blok (' + t.name + ')' };
      }
    } catch (e) { /* reyestr yo'q — qolgan tekshiruvlar bilan davom */ }

    // ⚠ 3) 📷 KAMERA — `SceneTypes` da `physics: {isStatic:true}`, ya'ni
    //   yuqoridagi `physics === null` tekshiruvi uni TUTMAYDI. Odatda
    //   statik tana uni baribir rad etadi, lekin kimdir kamerani
    //   dinamik qilib qo'ysa — u dekoratsiya emas, REDAKTOR asbobi,
    //   ko'tarilmasligi kerak.
    if (ud.isCamera) return { ok: false, why: 'kamera' };

    const b = _body(mesh);
    if (!b) return { ok: false, why: 'fizikasi yo\'q' };
    if (b.isStatic || ud.isStatic) return { ok: false, why: 'qo\'zg\'almas' };
    if (ud.isPlayerObj) return { ok: false, why: 'o\'yinchi' };
    if (typeof activeCar !== 'undefined' && mesh === activeCar) return { ok: false, why: 'mashina' };

    const m = b.mass || 1;
    if (cfg.gunEnabled) {
      if (m < cfg.gunMinMass) return { ok:false, mass:m, why:`juda yengil (min ${cfg.gunMinMass}kg)` };
      if (m > cfg.gunMaxMass) return { ok:false, mass:m, why:`juda og'ir (maks ${cfg.gunMaxMass}kg)` };
      return { ok: true, mass: m, mode: 'gun' };
    }
    if (!cfg.handEnabled) return { ok:false, mass:m, why:'qo\'l bilan ko\'tarish o\'chiq' };
    if (m > cfg.handMaxMass) return { ok:false, mass:m, why:`juda og'ir (qo'l maks ${cfg.handMaxMass}kg)` };
    return { ok: true, mass: m, mode: 'hand' };
  }

  /** Nishonga olingan jism — nur bilan. */
  function _aimed() {
    if (!_eye(_v, _dir)) return null;
    const range = cfg.gunEnabled ? cfg.gunRange : cfg.handRange;
    _ray.set(_v, _dir);
    _ray.far = range;
    const cands = (typeof objects !== 'undefined' ? objects : []).filter(o =>
      o && o.visible && o !== _player() && !o.userData?.isPlayerObj);
    const hits = _ray.intersectObjects(cands, true);
    for (const h of hits) {
      // Bolasiga tegsa — ro'yxatdagi ajdodini topamiz
      let o = h.object;
      while (o && !cands.includes(o)) o = o.parent;
      if (o) return o;
    }
    return null;
  }

  // ── Ko'tarish / qo'yish ─────────────────────────────────────
  function pickup(mesh) {
    if (_held) return false;

    //  🌐 BOSHQA O'YINCHI ko'targan bo'lsa — olmaymiz.
    //  ⚠ Foydalanuvchi so'ragan holat: \"o'yinchi boshqa o'yinchi
    //    qo'lidan blokni olib qochib ketdi\". Busiz predmet ikki
    //    joyda bir vaqtda bo'lardi.
    try {
      if (window.MultiplayerSystem && MultiplayerSystem.busy &&
          MultiplayerSystem.busy(mesh)) {
        if (typeof log === 'function') log('🌐 Predmet boshqa o\'yinchida', 'lw');
        return false;
      }
    } catch (e) {}
    const chk = canLift(mesh);
    if (!chk.ok) {
      if (typeof log === 'function' && chk.why) log(`🖐 Ko'tarib bo'lmadi: ${chk.why}`, 'lw');
      return false;
    }
    _held = mesh;
    const rec = _rapier(mesh);
    if (rec) {
      // Ko'tarilgan jism havoda muallaq turishi kerak — gravitatsiyani
      // o'chiramiz va so'nishni oshiramiz (aks holda tebranib qoladi).
      _heldPrevDamp = {
        g: rec.rigidBody.gravityScale ? rec.rigidBody.gravityScale() : 1,
        lin: rec.rigidBody.linearDamping ? rec.rigidBody.linearDamping() : 0.05,
        ccd: rec.rigidBody.isCcdEnabled ? rec.rigidBody.isCcdEnabled() : false,
      };
      try { rec.rigidBody.setGravityScale(0, true); } catch (e) {}
      try { rec.rigidBody.setLinearDamping(6); } catch (e) {}
      // ⚠ CCD (uzluksiz to'qnashuv) — ushlab turilganda YOQILADI.
      //   Prujina jismni 8 m/s gacha tortadi, ya'ni 60 fps da bir
      //   kadrda 13 sm. Ingichka devor (0.1–0.15 m) ikki kadr orasida
      //   butunlay \"o'tkazib yuborilishi\" mumkin — Rapier standart
      //   rejimda faqat kadr OXIRIDAGI holatni tekshiradi.
      //   ⚠ Doimiy yoqib qo'ymaymiz: CCD qimmat, sahnadagi yuzlab
      //     jismga yoqilsa fizika sezilarli sekinlashadi.
      try { if (rec.rigidBody.enableCcd) rec.rigidBody.enableCcd(true); } catch (e) {}
      try { rec.rigidBody.wakeUp(); } catch (e) {}
    }
    // ── 🖐 O'YINCHI UCHUN O'TKAZUVCHI QILAMIZ ──────────────────
    //  ⚠ MUAMMO: ko'tarilgan jism o'yinchining O'Z tanasiga urilardi.
    //    Uni oldiga tortsangiz — tanaga tiralib qaltirardi, o'yinchini
    //    itarardi, tor joyda esa jismni umuman olib kirib bo'lmasdi.
    //
    //  ⚠ NEGA AYNAN `colliderMode`: uni FAQAT o'yinchi to'qnashuvi
    //    o'qiydi (`player.js` ning sikli). Rapier'даги jism-jism
    //    fizikasi bunga QARAMAYDI — ya'ni ko'tarilgan quti devorga,
    //    yerga va boshqa jismlarga AVVALGIDEK uriladi.
    //    Aynan talab qilingani: "o'yinchi uchun inline, qolgan
    //    yerlarda block".
    //
    //  Avvalgi qiymat eslab qolinadi va `drop()` da AYNAN qaytariladi
    //  (yo'q bo'lsa — kalit butunlay o'chiriladi, standart tiklansin).
    _heldPrevCol = ('colliderMode' in mesh.userData)
                     ? mesh.userData.colliderMode : undefined;
    mesh.userData.colliderMode = 'inline';
    mesh.userData._ggHeld = true;
    if (typeof log === 'function') {
      log(`${chk.mode === 'gun' ? '🔫' : '🖐'} Ko'tarildi: ${mesh.userData?.name || '?'} (${(chk.mass).toFixed(1)}kg)`, 'lok');
    }
    return true;
  }

  function drop(throwIt) {
    if (!_held) return false;
    const mesh = _held;
    const rec  = _rapier(mesh);
    _held = null;
    delete mesh.userData._ggHeld;

    if (rec) {
      try { rec.rigidBody.setGravityScale(_heldPrevDamp ? _heldPrevDamp.g : 1, true); } catch (e) {}
      try { rec.rigidBody.setLinearDamping(_heldPrevDamp ? _heldPrevDamp.lin : 0.05); } catch (e) {}
      // ⚠ CCD ni QAYTA O'CHIRAMIZ. Yoqilgan holda qolsa har bir
      //   ko'tarilgan jism sahna oxirigacha qimmat rejimda yurardi.
      try { if (rec.rigidBody.enableCcd) rec.rigidBody.enableCcd(_heldPrevDamp ? !!_heldPrevDamp.ccd : false); } catch (e) {}

      // ── ⚠ QOLDIQ TEZLIKNI NOLLAYMIZ ──────────────────────────
      //  Ushlab turilganda jism prujina bilan tortiladi: har kadr
      //  `setLinvel(farq × stiffness)`. Nishon jismdan 0.3 m tepada
      //  bo'lsa — tezlik 4.2 m/s YUQORIGA.
      //
      //  Ilgari qo'yib yuborilganda shu tezlik JISMDA QOLARDI va u
      //  yuqoriga otilib ketardi. Foydalanuvchi ko'rgan alomat aynan
      //  shu edi: "sal teparoqdan tashlasa juda balandga uchib ketyapti"
      //  (o'lchov: 2.0 m dan qo'yilgan quti 2.85 m ga chiqardi).
      //
      //  Yon ta'siri battar edi: qoldiq tezlik bilan tushgan quti
      //  ostidagisiga urilib sakrardi — BLOKLAR USTMA-UST TURMASDI.
      //  Nollansa quti 1.505 da (to'g'ri joyida) tinch o'tiradi.
      //
      //  Otishda esa nollab, KEYIN impuls beramiz — shunda otish kuchi
      //  faqat `throwForce` ga bog'liq bo'ladi, tasodifiy qoldiqqa emas.
      try { rec.rigidBody.setLinvel({ x:0, y:0, z:0 }, true); } catch (e) {}
      try { rec.rigidBody.setAngvel({ x:0, y:0, z:0 }, true); } catch (e) {}

      if (throwIt && _eye(_v, _dir)) {
        // Impuls = kuch × massa — og'ir jism sekinroq uchadi (tabiiy)
        const b = _body(mesh);
        const m = (b && b.mass) || 1;
        const k = cfg.throwForce * m;
        try {
          rec.rigidBody.applyImpulse({ x:_dir.x*k, y:_dir.y*k, z:_dir.z*k }, true);
        } catch (e) {}
      }
      try { rec.rigidBody.wakeUp(); } catch (e) {}
    }
    // 🧱 Qo'yvorilgach — o'yinchi uchun yana QATTIQ bo'ladi
    if (mesh && mesh.userData) {
      if (_heldPrevCol === undefined) delete mesh.userData.colliderMode;
      else mesh.userData.colliderMode = _heldPrevCol;
    }
    _heldPrevCol  = undefined;
    _heldPrevDamp = null;
    return true;
  }

  function _rapier(mesh) {
    if (typeof rapierBodies === 'undefined' || !rapierBodies) return null;
    return rapierBodies.get(mesh) || null;
  }

  /** Tugma bosilganda: ushlab tursa — qo'yadi, bo'sh bo'lsa — ko'taradi. */
  // ── ⌨ E TUGMASI — FAQAT QUROL UCHUN ────────────────────────
  //  Talab: "gravity qurolni E bilan olsa va E bilan tashlasa".
  //  Qurol qo'lga olingach boshqaruv SICHQONCHAGA o'tadi, E esa
  //  faqat qurolni yerga qo'yish uchun qoladi.
  //
  //  ⚠ Qurol qo'lda turganda E jismni QO'YMAYDI — aks holda bitta
  //    tugma ikki ishni qilardi (jismni qo'yish / qurolni tashlash)
  //    va foydalanuvchi qaysi biri bo'lishini bilmasdi. Jism bilan
  //    ishlash butunlay sichqonchada.
  function toggle() {
    if (!_playing()) return;

    // ============================================================
    //  ⌨ BOSHQA TIZIM SHU TUGMANI \"BAND QILGAN\" bo'lsa — chekinamiz
    // ------------------------------------------------------------
    //  ⚠ MUAMMO: 🔢 MiniPad standart ochish tugmasi ham `E`.
    //    O'yinchi qulf oldida `E` bosganda ikkala tizim ham javob
    //    berardi: gravitatsiya quroli qulfni KO'TARMOQCHI bo'lib
    //    \"funksional blok\" degan rad javobini jurnalga yozardi,
    //    panel esa ochilmasdi. Foydalanuvchi ko'rgani aynan shu:
    //    \"E ni bossa minipadni ko'tarmoqchi bo'lyapti\".
    //
    //  ⚠ NEGA MINIPAD USTUN: u ANIQ nishonga ega — dizayner o'sha
    //    qulfga o'sha tugmani ataylab bog'lagan. Ko'tarish esa
    //    umumiy harakat: yaqinda ko'tariladigan boshqa narsa bo'lsa
    //    o'yinchi bir qadam yon tomonga siljib oladi.
    try {
      if (window.MiniPadSystem && typeof MiniPadSystem.claims === 'function'
          && MiniPadSystem.claims(cfg.key)) return;
    } catch (e) {}

    const W = window.GravityGunSystem?.Weapon;

    // 1) Qurol qo'lda → uni yerga qo'yamiz (avval jismni qo'yib)
    if (W && W.equipped()) { if (_held) drop(false); W.unequip(); return; }

    // 2) Yaqinda qurol yotibdi → olamiz
    if (W) {
      const pl = _player();
      const gun = W.nearby(pl ? pl.position : (camera ? camera.position : null));
      if (gun) { W.equip(gun); return; }
    }

    // 3) Qurol yo'q → qo'l bilan ko'tarish/qo'yish (handMaxMass chegarasi)
    if (_held) { drop(false); return; }
    const target = _aimed();
    if (target) pickup(target);
  }

  function throwHeld() { if (_held) drop(true); }

  // ── Har kadr ────────────────────────────────────────────────
  function update(delta) {
    if (!_playing()) { if (_held) drop(false); return; }

    _readInput();

    if (_held) {
      // Jism sahnadan o'chirilgan bo'lsa — havolani tashlash YETARLI EMAS.
      // ⚠ Ko'tarishda uning gravitatsiyasi 0 ga, so'nishi 6 ga qo'yilgan.
      //   Shunchaki `_held = null` desak, jism (agar keyin qaytarilsa yoki
      //   boshqa tizim uni ishlatsa) MANGU muallaq qolardi. `drop()` ular-
      //   ni tiklaydi.
      if (!_held.parent) { drop(false); return; }
      _holdUpdate(delta);
      return;
    }

    // Yerdagi qurolning yadrosini "tirik" ko'rsatib turamiz — bu YAGONA
    // vizual ishora. Ekranga hech qanday taklif yozuvi chiqmaydi.
    if (window.GravityGunSystem?.Weapon) {
      GravityGunSystem.Weapon.animate(performance.now() / 1000);
    }
  }

  // ============================================================
  //  🧱 _holdDistClamped — ushlagich nishonini DEVOR OLDIDA to'xtatadi
  // ------------------------------------------------------------
  //  ⚠ MUAMMO: nishon har doim ko'zdan `holdDist` (2.2 m) oldinda
  //    hisoblanardi — orada devor bormi-yo'qmi tekshirilmasdi.
  //    O'yinchi qutini ko'tarib devorga yaqinlashsa, nishon devorning
  //    ORQASIDA qolardi va prujina qutini u yerga tortardi.
  //
  //    Rapier tanasi bor jism devorga tiralib qaltirardi; tanasi
  //    YO'Q jism esa (pastdagi zaxira yo'l) to'g'ridan-to'g'ri
  //    ko'chirilib, devordan O'TIB KETARDI. Qo'yib yuborilgach u
  //    devor ortida yoki boshqa jism ichida qolib, \"umuman
  //    kolliziyasi yo'q\" bo'lib ko'rinardi.
  //
  //  YECHIM: ko'zdan nishonga qarab nur otiladi. Biror narsaga
  //  tegsa — nishon o'sha nuqtadan `_HOLD_MARGIN` beri qo'yiladi.
  //  Ya'ni jism devorni KESIB O'TA olmaydi, faqat unga yaqinlashadi.
  //
  //  ⚠ Ko'tarilgan jismning O'ZI va o'yinchi nurdan chiqariladi —
  //    aks holda nur darhol qo'ldagi qutiga tegib, nishon burunga
  //    yopishib qolardi.
  // ============================================================
  const _HOLD_MARGIN = 0.35;   // m — devordan shuncha beri turadi
  const _ray2 = new THREE.Raycaster();

  function _holdDistClamped(eyePos, dir) {
    const want = cfg.holdDist;
    if (typeof objects === 'undefined' || !objects) return want;
    const self = _player();
    const cands = objects.filter(o => {
      if (!o || !o.visible || o === _held || o === self) return false;
      const ud = o.userData || {};
      if (ud.isPlayerObj || ud._ggHeld) return false;
      // 👻 O'tkazuvchi bloklar devor emas — ular yo'lni to'smaydi
      if (ud.colliderMode === 'inline') return false;
      // Belgilar, yo'llar, spawn nuqtalari — ko'rinmas yordamchilar
      if (ud.isSpawn || ud.isPath || ud.isPathShape || ud._animProxy) return false;
      return true;
    });
    if (!cands.length) return want;
    _ray2.set(eyePos, dir);
    _ray2.far = want + _HOLD_MARGIN;
    let hits;
    try { hits = _ray2.intersectObjects(cands, true); } catch (e) { return want; }
    if (!hits || !hits.length) return want;
    //  ⚠ Eng yaqini kifoya: undan naridagilari baribir to'silgan.
    return Math.max(0.45, Math.min(want, hits[0].distance - _HOLD_MARGIN));
  }

  /** Ko'tarilgan jismni ko'z oldidagi nuqtaga tortadi (prujina). */
  function _holdUpdate(delta) {
    const rec = _rapier(_held);
    if (!_eye(_v, _dir)) return;
    const dist = _holdDistClamped(_v, _dir);

    if (!rec) {
      // ── Rapier tanasi yo'q — jismni qo'lda ko'chiramiz ──
      //  ⚠ Bu yo'lda Rapier'ning to'qnashuvi UMUMAN yo'q, shuning
      //    uchun devor tekshiruvi (`dist`) yagona himoya. Ilgari u
      //    ham yo'q edi va jism har narsadan o'tib ketardi.
      _t.copy(_v).addScaledVector(_dir, dist); _t.y += cfg.holdHeight;
      _held.position.copy(_t);
      return;
    }
    _t.copy(_v).addScaledVector(_dir, dist);
    _t.y += cfg.holdHeight;

    const p = rec.rigidBody.translation();
    // Kerakli tezlik = (nishon − joriy) × qattiqlik
    _v.set(_t.x - p.x, _t.y - p.y, _t.z - p.z).multiplyScalar(cfg.stiffness);
    const sp = _v.length();
    if (sp > cfg.maxSpeed) _v.multiplyScalar(cfg.maxSpeed / sp);
    try {
      rec.rigidBody.setLinvel({ x:_v.x, y:_v.y, z:_v.z }, true);
      // Aylanishni so'ndiramiz — qo'lda aylanib ketmasin
      rec.rigidBody.setAngvel({ x:0, y:0, z:0 }, true);
    } catch (e) {}

    // Juda uzoqlashib ketsa (devor ortida qolgan) — qo'yib yuboramiz
    const dx = _t.x - p.x, dy = _t.y - p.y, dz = _t.z - p.z;
    if (dx*dx + dy*dy + dz*dz > (cfg.gunRange + 4) * (cfg.gunRange + 4)) drop(false);
  }

  // ── Kirish (klavish / sichqoncha) ───────────────────────────
  //  ⚠ Loyihada UMUMIY `keys` obyekti YO'Q — `PlayerController` o'zining
  //    `this.keys` ini yuritadi va u tashqaridan ishonchli emas (o'yinchi
  //    bo'lmasa umuman mavjud emas). Shuning uchun tizim O'Z tinglovchisini
  //    qo'yadi. Qirra (edge) shu yerda ushlanadi: bosib turilsa jism
  //    ko'tarilib-qo'yilib turmasin.
  function _installKeys() {
    if (window.__ggKeysHooked) return;
    window.__ggKeysHooked = true;
    document.addEventListener('keydown', e => {
      if (e.repeat) return;
      if (!_playing()) return;
      // Matn maydonida yozayotgan bo'lsa — tegmaymiz
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (e.code !== cfg.key) return;
      e.preventDefault();
      toggle();
    }, { capture: true });
  }

  function _readInput() { /* qirra keydown tinglovchisida ushlanadi */ }

  function _keyLbl() {
    return String(cfg.key || '').replace('Key', '').replace('Digit', '');
  }

  // ── ⚠ EKRANDAGI YOZUV OLIB TASHLANDI ───────────────────────
  //  Ilgari bu yerda `#gg-prompt` degan qatlam bor edi: kubga
  //  yaqinlashsangiz "E — ko'tarish: Kub (5.0kg)" deb chiqardi.
  //  Foydalanuvchi so'roviga ko'ra olib tashlandi — o'yin ekranida
  //  hech qanday taklif yozuvi chiqmaydi. Ma'lumot faqat konsolga
  //  (`log`) yoziladi, u ham faqat amal bajarilganda.

  // ── Sichqoncha ──────────────────────────────────────────────
  // ── 🖱 SICHQONCHA — FAQAT QUROL QO'LDA BO'LGANDA ───────────
  //    chap tugma : oladi / qo'yadi
  //    o'ng tugma : oladi va OTADI (HL2 dagi "punt")
  //
  //  ⚠ Qurol qo'lda bo'lmasa tinglovchi HECH NIMA qilmaydi — muharrirda
  //    va qurolsiz o'yinda sichqoncha odatdagidek ishlayveradi
  //    (tanlash, kamera burish).
  function _installMouse() {
    const cv = document.getElementById('three-canvas');
    if (!cv || cv.__ggHooked) return;
    const armed = () => _playing() && !!window.GravityGunSystem?.Weapon?.equipped();

    cv.addEventListener('mousedown', e => {
      if (!armed()) return;
      if (e.button === 0) {                 // chap — olish / qo'yish
        e.preventDefault();
        if (_held) drop(false);
        else { const t = _aimed(); if (t) pickup(t); }
      } else if (e.button === 2) {          // o'ng — olish va otish
        e.preventDefault();
        if (_held) { throwHeld(); return; }
        const t = _aimed();
        if (t && pickup(t)) drop(true);     // darhol uchirib yuboramiz
      }
    });
    // O'ng tugma menyusi o'yin paytida chiqmasin
    cv.addEventListener('contextmenu', e => { if (armed()) e.preventDefault(); });
    cv.__ggHooked = true;
  }

  // ── Play/Stop ───────────────────────────────────────────────
  function onPlayStop() {
    if (_held) drop(false);
    // ============================================================
    //  🧹 QOLDIQ TOZALASH
    // ------------------------------------------------------------
    //  ⚠ `colliderMode` — `_` SIZ nomlangan, ya'ni SAHNA BILAN
    //    SAQLANADI. Ko'tarilgan jismda u `'inline'` ga qo'yiladi.
    //    Agar ushlab turganda sahna saqlansa (avtosaqlash, 💾
    //    tugmasi, eksport) — jism FAYLGA \"o'tkazuvchi\" bo'lib
    //    tushardi va keyingi safar hech narsaga urilmasdi.
    //    Foydalanuvchi ko'rgan alomat: \"tashlagan blok boshqa
    //    obyekt ichidan o'tib ketyapti, umuman kolliziyasi yo'q\" —
    //    va u SAQLANGANDAN keyin ham davom etardi.
    //
    //  ⚠ `_ggHeld` bayrog'i yagona ishonchli belgi: uni faqat shu
    //    tizim qo'yadi. Dizayner o'zi `inline` qilgan bloklarga
    //    tegmaymiz — ular bayroqsiz.
    try {
      const list = (typeof objects !== 'undefined' && objects) ? objects : [];
      for (const o of list) {
        if (!o || !o.userData || !o.userData._ggHeld) continue;
        delete o.userData._ggHeld;
        if (o.userData.colliderMode === 'inline') delete o.userData.colliderMode;
      }
    } catch (e) {}
    // 🔫 Qurol yerga qaytadi, chegara qo'lnikiga tushadi
    try { window.GravityGunSystem?.Weapon?.reset(); } catch (e) {}
    _keyWasDown = false;
  }

  // ── Saqlash / yuklash ───────────────────────────────────────
  function serialize() { const o = {}; for (const k of Object.keys(DEF)) o[k] = cfg[k]; return o; }
  function restore(data) {
    if (!data) return;
    for (const k of Object.keys(DEF)) if (data[k] !== undefined) cfg[k] = data[k];
  }
  function reset() { Object.assign(cfg, DEF); }

  // ── Inspektor sozlagichlari (o'yinchi menyusi) ───────────────
  window._ggSet = function (key, val) {
    if (!(key in cfg)) return;
    cfg[key] = val;
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._ggSetNum = function (key, val, min, max) {
    if (!(key in cfg)) return;
    let v = parseFloat(val); if (!isFinite(v)) v = 0;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    cfg[key] = v;
    // MIN maks'dan oshib ketmasin
    if (key === 'gunMinMass' && cfg.gunMinMass > cfg.gunMaxMass) cfg.gunMaxMass = cfg.gunMinMass;
    if (key === 'gunMaxMass' && cfg.gunMaxMass < cfg.gunMinMass) cfg.gunMinMass = cfg.gunMaxMass;
  };
  window._ggCatchKey = function (btnEl) {
    if (btnEl) btnEl.textContent = '⏳ bosing...';
    const h = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      cfg.key = e.code;
      document.removeEventListener('keydown', h, { capture: true });
      if (typeof updateInspector === 'function') updateInspector();
    };
    document.addEventListener('keydown', h, { capture: true });
  };

  /** O'yinchi inspektoriga qo'shiladigan HTML bo'lim. */
  function inspectorHTML() {
    const num = (k, min, max, step) =>
      `<input type="number" min="${min}" max="${max}" step="${step||1}" value="${cfg[k]}"
        style="width:62px;background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
        oninput="_ggSetNum('${k}',this.value,${min},${max})">`;
    const row = (lbl, inner) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
         <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:96px;flex-shrink:0">${lbl}</span>
         ${inner}</div>`;
    const tgl = (k, on) =>
      `<button onclick="_ggSet('${k}',${!cfg[k]})" style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid ${cfg[k]?'var(--accent3)':'var(--red)'};
        background:${cfg[k]?'rgba(var(--accent3-rgb),.1)':'rgba(255,68,68,.08)'};color:${cfg[k]?'var(--accent3)':'var(--red)'}">
        ${cfg[k]?'✓ Yoqiq':'✗ O\'chiq'}</button>`;

    return `
    <div style="border-top:1px solid rgba(var(--accent-rgb),.15);padding-top:6px;margin-top:6px">
      <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:6px">
        🖐 KO'TARISH / 🔫 GRAVITY GUN</div>

      ${row('🖐 Qo\'l bilan', tgl('handEnabled'))}
      ${row('🖐 Maks (kg)', num('handMaxMass', 0, 10000, 0.5))}
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:-2px 0 7px;font-family:'Share Tech Mono',monospace">
        Shundan OG'IR jismni qo'l bilan ko'tara olmaydi. Masalan 15 → 14kg ✓, 16kg ✗.
      </div>

      ${row('🔫 Gravity gun', tgl('gunEnabled'))}
      ${cfg.gunEnabled ? `
      ${row('🔫 Min (kg)', num('gunMinMass', 0, 10000, 0.5))}
      ${row('🔫 Maks (kg)', num('gunMaxMass', 0, 100000, 1))}
      ${row('🔫 Masofa (m)', num('gunRange', 1, 100, 1))}
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:-2px 0 7px;font-family:'Share Tech Mono',monospace">
        Qurol yoqilsa qo'l chegarasi o'rniga SHU oraliq ishlaydi.
      </div>` : ''}

      ${row('⌨ Tugma', `
        <button onclick="_ggCatchKey(this)" style="padding:3px 9px;border:1px solid var(--accent);background:rgba(var(--accent-rgb),.08);
          color:var(--accent);font-size:9px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">
          🎯 ${(cfg.key||'').replace('Key','').replace('Digit','')}</button>`)}
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-2px 0 7px;font-family:'Share Tech Mono',monospace">
        <b style="color:var(--accent)">${(cfg.key||'').replace('Key','')}</b> — qurolni yerdan olish / yerga qo'yish.<br>
        Qurolsiz esa shu tugma qo'l bilan ko'taradi/qo'yadi.<br>
        <b style="color:var(--accent3)">Qurol qo'lda</b> → boshqaruv sichqonchada:<br>
        &nbsp;&nbsp;🖱 chap — oladi / qo'yadi<br>
        &nbsp;&nbsp;🖱 o'ng — oladi va otadi
      </div>

      ${row('📐 Ushlash (m)', num('holdDist', 0.5, 10, 0.1))}
      ${row('💨 Otish kuchi', num('throwForce', 0, 60, 0.5))}

    </div>`;
  }

  // ── Ulanish ─────────────────────────────────────────────────
  function init() {
    _installKeys();
    _installMouse();
    const pb = document.getElementById('play-btn');
    if (pb && !pb.__ggHooked) {
      pb.addEventListener('click', () => setTimeout(() => { if (!_playing()) onPlayStop(); }, 30));
      pb.__ggHooked = true;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 60);

  return {
    cfg, DEF,
    update, toggle, pickup, drop, throwHeld, canLift,
    isHolding: () => !!_held,
    held: () => _held,
    onPlayStop, serialize, restore, reset,
    inspectorHTML,
  };
})();

window.GravityGun = window.GravityGunSystem;

// ============================================================
//  🔫 GRAVITY GUN — SAHNADAGI QUROL (asset blok)
// ------------------------------------------------------------
//  Assetlar panelidan qo'yiladi. HL2 dagi kabi: yerda yotadi,
//  o'yinchi yaqinlashib tugmani bossa QO'LGA OLADI. Shundan keyin
//  ko'tarish chegarasi qo'lniki emas — QUROLNIKI bo'ladi.
//
//  ⚠ Har bir qurol O'Z min/maks kg va masofasini olib yuradi
//    (`userData.gg*`). Ya'ni sahnada "kuchsiz" va "kuchli" ikki
//    qurol bo'lishi mumkin. Qo'lga olinganda ular `cfg` ga ko'chadi.
// ============================================================
(function () {

  const GG = window.GravityGunSystem;
  const DEFAULTS = { ggMinMass: 0, ggMaxMass: 200, ggRange: 12, ggPickupDist: 2.5 };

  let _idC = 0;

  /** Qurol ko'rinishi — korpus + shox + yadro. */
  function buildVisual() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.26, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x39424d, metalness: 0.75, roughness: 0.42 }));
    body.position.z = 0.05;
    g.add(body);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.3, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x22282e, metalness: 0.5, roughness: 0.7 }));
    grip.position.set(0, -0.24, 0.16);
    grip.rotation.x = 0.22;
    g.add(grip);

    // Uchidagi uch shox
    const prongMat = new THREE.MeshStandardMaterial({ color: 0x5b6875, metalness: 0.85, roughness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), prongMat);
      p.position.set(Math.cos(a) * 0.13, Math.sin(a) * 0.13, -0.36);
      p.rotation.x = -0.22;
      g.add(p);
    }
    // Yadro — nur sochadigan sfera
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 }));
    core.position.z = -0.3;
    core.name = '__ggCore';
    g.add(core);
    return g;
  }

  /** KO'RINISHNI tiklaydi — sahnaga qo'shmaydi (save/load uchun). */
  function restoreVisual(mesh) {
    if (!mesh || mesh.getObjectByName('__ggCore')) return mesh;
    const v = buildVisual();
    while (v.children.length) mesh.add(v.children[0]);
    return mesh;
  }

  function create(pos) {
    const mesh = buildVisual();
    mesh.position.copy(pos || new THREE.Vector3(0, 0.6, 0));
    mesh.userData = Object.assign({
      id: ++objIdC,
      name: 'Gravity Gun' + (++_idC > 1 ? ' ' + _idC : ''),
      type: 'gravitygun',
      isGravityGun: true,
      isStatic: true,          // yerda yotadi, fizika kerak emas
    }, DEFAULTS);

    scene.add(mesh);
    objects.push(mesh);
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof selectObject === 'function') selectObject(mesh);
    if (typeof updateStats === 'function') updateStats();
    if (typeof captureState === 'function') captureState('Gravity Gun qo\'shildi');
    log('🔫 <span style="color:var(--accent)">' + mesh.userData.name + '</span> qo\'shildi', 'lok');
    return mesh;
  }

  // ── Qo'lga olish ────────────────────────────────────────────
  let _equipped = null;

  function equip(mesh) {
    if (!mesh || !mesh.userData?.isGravityGun) return false;
    _equipped = mesh;
    mesh.visible = false;                  // qo'lga olindi — yerdan yo'qoladi
    GG.cfg.gunEnabled = true;
    GG.cfg.gunMinMass = mesh.userData.ggMinMass ?? DEFAULTS.ggMinMass;
    GG.cfg.gunMaxMass = mesh.userData.ggMaxMass ?? DEFAULTS.ggMaxMass;
    GG.cfg.gunRange   = mesh.userData.ggRange   ?? DEFAULTS.ggRange;
    log(`🔫 ${mesh.userData.name} qo'lga olindi — ${GG.cfg.gunMinMass}…${GG.cfg.gunMaxMass}kg`, 'lok');
    return true;
  }

  /**
   * 🔫 Qurolni YERGA QO'YISH (E tugmasi).
   *  Qurol o'yinchining oldiga tashlanadi — o'sha joyda turadi va
   *  keyin yana E bilan olish mumkin.
   *  ⚠ `reset()` dan farqi: bu foydalanuvchi AMALI, qurol yangi joyga
   *    qo'yiladi. `reset()` esa ▶ Play tugaganda ishlaydi va qurolni
   *    o'z joyida qoldiradi.
   */
  function unequip() {
    if (!_equipped) return false;
    const gun = _equipped;
    _equipped = null;
    GG.cfg.gunEnabled = false;

    // O'yinchining oldiga, yerga yaqin qo'yamiz
    const P = window.PlayerController?.obj
           || (typeof playerMesh !== 'undefined' ? playerMesh : null)
           || (typeof camera !== 'undefined' ? camera : null);
    if (P) {
      const d = new THREE.Vector3();
      if (window.PlayerController && PlayerController.camYaw !== undefined) {
        const y = PlayerController.camYaw || 0;
        d.set(-Math.sin(y), 0, -Math.cos(y));
      } else if (P.getWorldDirection) { P.getWorldDirection(d); d.y = 0; }
      if (d.lengthSq() < 1e-6) d.set(0, 0, -1);
      d.normalize();
      const wp = new THREE.Vector3();
      P.getWorldPosition(wp);
      gun.position.set(wp.x + d.x * 1.2, Math.max(0.35, wp.y - 0.4), wp.z + d.z * 1.2);
    }
    gun.visible = true;
    log(`🔫 ${gun.userData.name} yerga qo'yildi`, 'lw');
    return true;
  }

  /** ▶ Play tugaganda qurol yerga qaytadi va sozlama tiklanadi. */
  function reset() {
    if (_equipped) { _equipped.visible = true; _equipped = null; }
    GG.cfg.gunEnabled = false;
  }

  function equipped() { return _equipped; }

  /** Har kadr — yaqindagi qurolni topib "olish" taklifini beradi. */
  function nearby(playerPos) {
    if (_equipped || !playerPos) return null;
    let best = null, bd = Infinity;
    for (const o of (typeof objects !== 'undefined' ? objects : [])) {
      if (!o?.userData?.isGravityGun || !o.visible) continue;
      const d = o.position.distanceTo(playerPos);
      const lim = o.userData.ggPickupDist ?? DEFAULTS.ggPickupDist;
      if (d <= lim && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  // Yadroni sekin aylantirib turamiz — tirik ko'rinsin
  function animate(t) {
    for (const o of (typeof objects !== 'undefined' ? objects : [])) {
      if (!o?.userData?.isGravityGun || !o.visible) continue;
      const c = o.getObjectByName('__ggCore');
      if (c) c.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
    }
  }

  window.addGravityGun = () => create();

  GG.Weapon = { create, restoreVisual, equip, unequip, reset, equipped, nearby, animate, DEFAULTS };
})();
