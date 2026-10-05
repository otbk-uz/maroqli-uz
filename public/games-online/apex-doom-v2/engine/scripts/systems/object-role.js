// ============================================================
// APEX3D — Object Roll (Roles)  ·  Damage / Heal
// ------------------------------------------------------------
// Har qanday obyektga inspector'dan "Roll" biriktirish mumkin.
// Birinchi roll — DAMAGE / HEAL (jon):
//   • Oyinchi obyektga tegib turganda har sekundda -X hp (damage) yoki
//     +X hp (heal) beriladi.
//   • Jon 0 ga tushsa — oyinchi "oladi": o'lim ekrani ko'rsatiladi
//     (HTML "Siz oldingiz!" / rasm / video / kamerali animatsiya),
//     so'ng respawn bo'ladi.
//   • Respawn'da oxirgi kirilgan hitbox animatsiyasi qayta boshlanadimi
//     yoki davom etadimi — tanlanadi.
//   • Har zarba (yoki har davolash) uchun camera SHAKE yoki BLUR effektini
//     necha soniya va qanchalik kuchli ishlashini tanlash mumkin.
//
// Holat obj.userData.roll da saqlanadi → save/load qo'llab-quvvatlaydi.
// ============================================================

const ObjectRoleSystem = (() => {
  'use strict';

  const _box = new THREE.Box3();
  const _sz  = new THREE.Vector3();

  // Runtime o'lim holati (bir vaqtda bitta o'lim ketma-ketligi)
  let _dying     = false;
  let _deathTimer = 0;
  let _deathRole  = null;
  let _wasPlaying = false;
  const _fxCooldown = new WeakMap();   // obj -> qolgan cooldown (fx spam oldini oladi)
  const _accum      = new WeakMap();    // obj -> kontaktda o'tgan vaqt (interval uchun)

  // Play boshlanganda: jonni to'ldirish + biror roll faol bo'lsa HUD ko'rsatish
  function _onPlayStart() {
    gameState.health = _maxHp();
    const anyRole = objects.some(o => o.userData && o.userData.roll &&
                                       o.userData.roll.enabled && o.userData.roll.type === 'health');
    if (anyRole) {
      if (typeof buildGameHUD === 'function') buildGameHUD();
      const hud = document.getElementById('game-hud');
      if (hud) hud.style.display = 'block';
    }
    if (typeof updateGameHUD === 'function') updateGameHUD();
  }

  // ── SPAWN (qayta tug'ilish) nuqtasi — default ────────────────
  //   mode:
  //     'default' → eski xatti-harakat (checkpoint → isSpawn obyekt → 0,3,5)
  //     'object'  → IERARXIYADAN tanlangan blokka nisbatan
  //     'coords'  → qo'lda kiritilgan X / Y / Z koordinata
  //   anchor (faqat 'object' uchun): blokning qaysi tomonida paydo bo'lsin
  function defaultSpawn() {
    return {
      mode:     'default',
      objectId: null,          // ⚠ nomi "...Id" — save/load id'ni avtomatik ko'chiradi
      anchor:   'top',         // 'top'|'bottom'|'front'|'back'|'left'|'right'|'center'
      gap:      0.15,          // yuzadan bo'shliq (m)
      offset:   { x: 0, y: 0, z: 0 },   // qo'shimcha siljish (world o'qlari)
      coords:   { x: 0, y: 3, z: 0 },
      face:     'none',        // 'none' | 'to' (blokka qarab) | 'away' (teskari)
    };
  }

  // ── Default roll ma'lumoti ───────────────────────────────────
  function defaultRoll() {
    return {
      type:    'health',        // hozircha yagona roll turi
      enabled: false,
      mode:    'damage',        // 'damage' | 'heal'
      amount:  20,              // har tetiklashda o'zgaradigan jon (± hp)
      interval: 5,              // har necha vaqtda bir marta beriladi
      intervalUnit: 'sec',      // 'sec' | 'min' | 'hour'  (0 = uzluksiz, hp/sek)
      contact: 'near',          // 'inside' | 'near' (near = tanaga tegsa)
      // Har zarbadagi kamera effekti
      fx: {
        enabled:   true,
        effect:    'Shake',     // 'Shake' | 'Blur'
        duration:  0.3,         // soniya
        intensity: 0.6,
        interval:  0.25,        // effekt qayta ishga tushish oralig'i (sekund)
      },
      // O'lim (faqat damage rejimida, hp<=0 bo'lganda)
      death: {
        respawn:           true,
        spawn:             defaultSpawn(),   // ⬅ qayerdan qayta tug'ilishi
        respawnHitboxAnim: 'restart',   // 'restart' | 'continue'
        screen:  'html',        // 'none' | 'html' | 'image' | 'video' | 'camera'
        html:    "<div style=\"font-family:sans-serif;color:#fff\">"
               + "<div style=\"font-size:44px;font-weight:800;color:#ff4444\">SIZ OLDINGIZ</div>"
               + "<div style=\"opacity:.8;margin-top:8px\">Respawn...</div></div>",
        mediaB64: null,         // rasm/video data URL
        mediaName: null,
        cameraId: null,         // 'camera' turi uchun kamera obyekt id
        duration: 3,            // ekran / kinematik necha soniya
      },
    };
  }

  function get(obj)      { return obj && obj.userData ? obj.userData.roll : null; }
  function isActive(obj) { const r = get(obj); return !!(r && r.enabled); }

  function ensure(obj) {
    if (!obj.userData.roll) obj.userData.roll = defaultRoll();
    return obj.userData.roll;
  }

  // ── Overlap testi ────────────────────────────────────────────
  // MUHIM: player qattiq obyekt ICHIGA kira olmaydi — u ustida yoki
  // yonida turadi. Shu bois obyekt AABB'ini player tanasi (radius +
  // balandlik) bo'yicha kengaytirib, player markazi shu zonaga tushsa
  // "tegdi" deb hisoblaymiz. Bu ust/yon/ichidan o'tish — barchasini ushlaydi.
  function _overlaps(obj, p, near) {
    _box.setFromObject(obj);
    const PR = (typeof PLAYER_RADIUS === 'number') ? PLAYER_RADIUS : 0.4;
    const PH = (typeof PLAYER_HEIGHT === 'number') ? PLAYER_HEIGHT : 1.0;
    const padXZ = PR + (near ? 0.55 : 0.12);   // yon kontakt
    const padY  = PH + (near ? 0.45 : 0.12);   // ust/ost kontakt (player balandligi)
    return (
      p.x >= _box.min.x - padXZ && p.x <= _box.max.x + padXZ &&
      p.z >= _box.min.z - padXZ && p.z <= _box.max.z + padXZ &&
      p.y >= _box.min.y - padY  && p.y <= _box.max.y + padY
    );
  }

  function _maxHp() {
    return (typeof playerSettings !== 'undefined' && playerSettings.maxHealth) || 100;
  }

  // ── Haqiqiy "player"ni topish ────────────────────────────────
  // Bu build'da createPlayer() chaqirilmaydi (playerMesh = null), shuning
  // uchun player quyidagilardan biri bo'lishi mumkin:
  //   1) PlayerController.obj — foydalanuvchi 🎮 belgilagan obyekt
  //   2) playerMesh — o'rnatilgan FPS mesh (agar mavjud bo'lsa)
  //   3) camera — erkin kamera (player = kamera ko'zi)
  function _player() {
    if (typeof PlayerController !== 'undefined' && PlayerController &&
        PlayerController.obj && PlayerController.obj.parent) {
      return { obj: PlayerController.obj, pos: PlayerController.obj.position, kind: 'controller' };
    }
    if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent) {
      return { obj: playerMesh, pos: playerMesh.position, kind: 'mesh' };
    }
    if (typeof camera !== 'undefined' && camera) {
      return { obj: camera, pos: camera.position, kind: 'camera' };
    }
    return null;
  }

  function _toSec(v, unit) {
    const n = parseFloat(v) || 0;
    if (unit === 'min')  return n * 60;
    if (unit === 'hour') return n * 3600;
    return n;
  }

  // Bir marta jon o'zgartirish (tick) + effekt
  function _applyOnce(obj, r) {
    if (r.mode === 'heal') {
      const max = _maxHp();
      if ((gameState.health || 0) < max) {
        gameState.health = Math.min(max, (gameState.health || 0) + Math.abs(r.amount || 0));
        _fireHitFx(obj, r, true);
      }
      return false;
    } else {
      gameState.health = (gameState.health || 0) - Math.abs(r.amount || 0);
      _fireHitFx(obj, r, false);
      if (gameState.health <= 0) { gameState.health = 0; return true; } // o'ldi
      return false;
    }
  }

  // ── Har frame yangilash (faqat play rejimida) ────────────────
  function update(delta) {
    const playing = (typeof isPlaying !== 'undefined' && isPlaying);
    if (!playing) {
      if (_dying) _cancelDeath();
      _wasPlaying = false;
      return;
    }

    // Play endigina boshlandimi? — jonni to'ldirib, HUD'ni ko'rsatamiz
    if (!_wasPlaying) {
      _wasPlaying = true;
      _onPlayStart();
    }

    // O'lim ketma-ketligi ketayotgan bo'lsa — faqat taymer
    if (_dying) {
      _deathTimer -= delta;
      if (_deathTimer <= 0) _finishDeath();
      return;
    }

    const P = _player();
    if (!P) return;
    const pPos = P.pos;

    for (let i = 0, n = objects.length; i < n; i++) {
      const obj = objects[i];
      const r = obj.userData && obj.userData.roll;
      if (!r || !r.enabled || r.type !== 'health') continue;

      // fx cooldown pasaytirish
      let cd = _fxCooldown.get(obj) || 0;
      if (cd > 0) _fxCooldown.set(obj, Math.max(0, cd - delta));

      if (!_overlaps(obj, pPos, r.contact !== 'inside')) {
        _accum.set(obj, 0);   // kontaktdan chiqdi — hisoblagichni nolga
        continue;
      }

      const intervalSec = _toSec(r.interval, r.intervalUnit);
      let died = false;

      if (intervalSec <= 0) {
        // Uzluksiz rejim: amount = hp/sekund
        const amt = Math.abs(r.amount || 0) * delta;
        if (r.mode === 'heal') {
          const max = _maxHp();
          if ((gameState.health || 0) < max) {
            gameState.health = Math.min(max, (gameState.health || 0) + amt);
            _fireHitFx(obj, r, true);
          }
        } else {
          gameState.health = (gameState.health || 0) - amt;
          _fireHitFx(obj, r, false);
          if (gameState.health <= 0) { gameState.health = 0; died = true; }
        }
      } else {
        // Interval rejimi: har intervalSec da bir marta amount beriladi
        let acc = (_accum.get(obj) || 0) + delta;
        while (acc >= intervalSec) {
          acc -= intervalSec;
          if (_applyOnce(obj, r)) { died = true; break; }
        }
        _accum.set(obj, acc);
      }

      if (died) { _startDeath(obj, r); break; }
    }

    if (typeof updateGameHUD === 'function') updateGameHUD();
  }

  // ── Har zarbadagi kamera effekti ─────────────────────────────
  // Ustuvor: to'liq CameraShake bloki (obj.userData.roll.cameraShake) —
  // xuddi hitbox/kameradagiday boy sozlamalar. U bo'lmasa, eski oddiy
  // fx (Shake/Blur) ga qaytamiz (orqaga moslik uchun).
  function _fireHitFx(obj, r) {
    const noShake = (typeof CameraShakeSystem === 'undefined' || !CameraShakeSystem.fireEphemeral);
    if (noShake) return;

    const cs = r.cameraShake;
    if (cs && cs.enabled) {
      const throttle = Math.max(0.12, (cs.duration || 0.3));
      if ((_fxCooldown.get(obj) || 0) > 0) return;
      _fxCooldown.set(obj, throttle);
      CameraShakeSystem.fireEphemeral(cs);
      return;
    }

    // Fallback — eski oddiy fx
    const fx = r.fx;
    if (!fx || !fx.enabled) return;
    if ((_fxCooldown.get(obj) || 0) > 0) return;
    _fxCooldown.set(obj, Math.max(0.05, fx.interval || 0.25));
    const isBlur = (fx.effect === 'Blur');
    CameraShakeSystem.fireEphemeral({
      preset:          'Custom',
      effectType:      isBlur ? 'Blur' : 'Shake',
      intensity:       fx.intensity ?? 0.6,
      duration:        fx.duration ?? 0.3,
      effectDuration:  fx.duration ?? 0.3,
      effectIntensity: fx.intensity ?? 0.6,
      falloff:         'EaseOut',
    });
  }

  // ── O'LIM ketma-ketligi ──────────────────────────────────────
  function _startDeath(obj, r) {
    _dying = true;
    _deathRole = r;
    const d = r.death || {};
    _deathTimer = Math.max(0.4, d.duration || 3);

    if (typeof showGameMessage === 'function' && d.screen === 'none') {
      showGameMessage('☠ Siz oldingiz!', '#ff4444');
    }
    if (d.screen === 'camera') _startDeathCamera(d);
    else if (d.screen && d.screen !== 'none') _showDeathOverlay(d);

    if (typeof log === 'function') log('☠ Oyinchi oldi — respawn tayyorlanmoqda', 'le');
  }

  function _finishDeath() {
    const d = (_deathRole && _deathRole.death) || {};
    _hideDeathOverlay();
    _endDeathCamera();

    if (d.respawn !== false) _respawnPlayer(_deathRole);

    // Oxirgi hitbox animatsiyasi: qayta boshlash / davom etish
    if (d.respawnHitboxAnim === 'restart' &&
        typeof HitboxSystem !== 'undefined' && HitboxSystem.refireLastPlayerAnim) {
      HitboxSystem.refireLastPlayerAnim();
    }
    // 'continue' — hech narsa qilmaymiz (davom etaveradi)

    _dying = false;
    _deathRole = null;
    if (typeof updateGameHUD === 'function') updateGameHUD();
  }

  function _cancelDeath() {
    _hideDeathOverlay();
    _endDeathCamera();
    _dying = false; _deathRole = null; _deathTimer = 0;
  }

  // ============================================================
  //  SPAWN NUQTASINI HISOBLASH
  // ============================================================

  function _findById(id) {
    if (id == null || id === '') return null;
    return objects.find(o => o.userData && String(o.userData.id) === String(id)) || null;
  }

  // Obyektning O'Z (local) o'qlaridagi bounding box —
  // blok burilgan bo'lsa ham "old / tepa / yon" to'g'ri topilsin.
  function _localBox(obj) {
    obj.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    const m   = new THREE.Matrix4();
    obj.traverse(c => {
      if (!c.isMesh || !c.geometry) return;
      if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
      if (!c.geometry.boundingBox) return;
      tmp.copy(c.geometry.boundingBox);
      m.multiplyMatrices(inv, c.matrixWorld);
      tmp.applyMatrix4(m);
      box.union(tmp);
    });
    if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    return box;
  }

  // Player markazidan oyoq ostigacha bo'lgan masofa
  function _feetOffset(P) {
    const PH = (typeof PLAYER_HEIGHT === 'number') ? PLAYER_HEIGHT : 1.0;
    if (!P) return PH;
    if (P.kind === 'camera') return PH * 1.6;      // kamera = ko'z balandligi
    if (P.kind === 'mesh')   return PH;
    try {
      const b = new THREE.Box3().setFromObject(P.obj);
      const d = P.obj.position.y - b.min.y;
      if (isFinite(d) && d > 0.001) return d;
    } catch (e) {}
    return PH;
  }

  function _playerRadius(P) {
    const PR = (typeof PLAYER_RADIUS === 'number') ? PLAYER_RADIUS : 0.4;
    if (!P || P.kind !== 'controller') return PR;
    try {
      const b = new THREE.Box3().setFromObject(P.obj);
      const s = b.getSize(new THREE.Vector3());
      const r = Math.max(s.x, s.z) * 0.5;
      if (isFinite(r) && r > 0.01) return r;
    } catch (e) {}
    return PR;
  }

  // anchor → local o'q va ishora
  const _ANCHOR = {
    top:    { ax: 'y', sg:  1 },
    bottom: { ax: 'y', sg: -1 },
    front:  { ax: 'z', sg:  1 },
    back:   { ax: 'z', sg: -1 },
    right:  { ax: 'x', sg:  1 },
    left:   { ax: 'x', sg: -1 },
    center: null,
  };

  // Tanlangan blokka nisbatan spawn koordinatasi (+ ixtiyoriy yaw)
  function _objectSpawn(obj, sp, P) {
    const lb = _localBox(obj);
    const a  = (sp.anchor in _ANCHOR) ? _ANCHOR[sp.anchor] : _ANCHOR.top;
    const p  = lb.getCenter(new THREE.Vector3());
    const nL = new THREE.Vector3();

    if (a) {
      if (a.ax === 'y') { p.y = a.sg > 0 ? lb.max.y : lb.min.y; nL.set(0, a.sg, 0); }
      if (a.ax === 'z') { p.z = a.sg > 0 ? lb.max.z : lb.min.z; nL.set(0, 0, a.sg); }
      if (a.ax === 'x') { p.x = a.sg > 0 ? lb.max.x : lb.min.x; nL.set(a.sg, 0, 0); }
    }
    p.applyMatrix4(obj.matrixWorld);              // yuza markazi → world

    const q = obj.getWorldQuaternion(new THREE.Quaternion());
    const n = nL.lengthSq() ? nL.clone().applyQuaternion(q).normalize() : new THREE.Vector3(0, 1, 0);

    const feet = _feetOffset(P);
    const rad  = _playerRadius(P);
    const gap  = (sp.gap == null ? 0.15 : (parseFloat(sp.gap) || 0));

    if (!a) {
      // markaz — aynan blok o'rtasida (hech qanday itarish yo'q)
    } else if (a.ax === 'y') {
      // TEPASI / OSTI — yuzadan player bo'yi qadar surib qo'yamiz
      p.addScaledVector(n, feet + gap);
    } else {
      // OLDI / ORQA / CHAP / O'NG — yon tomonga suramiz va
      // blok tagi sathida (yerda) turadigan qilamiz
      p.addScaledVector(n, rad + gap);
      const wb = new THREE.Box3().setFromObject(obj);
      p.y = wb.min.y + feet;
    }

    const off = sp.offset || {};
    p.x += parseFloat(off.x) || 0;
    p.y += parseFloat(off.y) || 0;
    p.z += parseFloat(off.z) || 0;

    // Yuzni blokka qaratish
    let yaw = null;
    if (sp.face === 'to' || sp.face === 'away') {
      const cw = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
      const d  = cw.sub(p); d.y = 0;
      if (sp.face === 'away') d.negate();
      if (d.lengthSq() > 1e-6) { d.normalize(); yaw = Math.atan2(-d.x, -d.z); }
    }
    return { pos: p, yaw };
  }

  // Roll sozlamasidan yakuniy spawn nuqtasini olish
  function resolveSpawn(r, P) {
    P = P || _player();
    const sp = (r && r.death && r.death.spawn) || null;

    if (sp && sp.mode === 'coords') {
      const c = sp.coords || {};
      return {
        pos: new THREE.Vector3(parseFloat(c.x) || 0, parseFloat(c.y) || 0, parseFloat(c.z) || 0),
        yaw: null,
      };
    }

    if (sp && sp.mode === 'object') {
      const obj = _findById(sp.objectId);
      if (obj) return _objectSpawn(obj, sp, P);
      if (typeof log === 'function')
        log("⚠ Spawn bloki topilmadi — standart nuqtaga qaytildi", 'lw');
    }

    // 'default' — eski xatti-harakat
    if (gameState.checkpoint) return { pos: gameState.checkpoint.clone(), yaw: null };
    const spawnObj = objects.find(o => o.userData && o.userData.isSpawn);
    if (spawnObj) return { pos: spawnObj.position.clone().add(new THREE.Vector3(0, 2, 0)), yaw: null };
    return { pos: new THREE.Vector3(0, 3, 5), yaw: null };
  }

  // Playerni nuqtaga ko'chirish (tezlikni nolga, kerak bo'lsa yuzni burish)
  function placePlayer(pos, yaw, P) {
    P = P || _player();
    if (!P || !pos) return false;
    P.pos.copy(pos);

    // ── ⚠ RAPIER TANASINI HAM KO'CHIRAMIZ ─────────────────────────
    //  ALOMAT: respawn nuqtasi qo'yilgan, lekin o'yinchi o'lgach
    //  BOSHLANG'ICH joyida paydo bo'lardi.
    //
    //  SABAB: `P.pos` — bu `mesh.position`, ya'ni faqat KO'RINISH.
    //  Rapier yoqilgan bo'lsa (`Fizika: ON`), `physics.js` har
    //  qadamda `mesh.position.set(t.x, t.y, t.z)` bilan pozitsiyani
    //  RIGID BODY dan qayta yozadi. Ya'ni bizning ko'chirishimiz
    //  keyingi kadrdayoq bekor bo'lardi va o'yinchi tanasi qayerda
    //  bo'lsa — o'sha yerga qaytardi.
    //
    //  ⚠ Nega muharrirda sezilmasligi mumkin: Rapier yuklanmagan
    //    yoki `Fizika: OFF` bo'lsa zaxira integrator ishlaydi va
    //    ko'chirish joyida qoladi. `game.zip` da fizika doim yoqiq.
    //
    //  🎯 hitbox va 🔘 tugmaning teleporti aynan shu naqshni
    //  ishlatadi (`hitbox.js` dagi `setTranslation` blokiga qarang) —
    //  respawn esa o'sha darsdan chetda qolgan edi.
    if (typeof rapierBodies !== 'undefined' && P.obj) {
      const rb = rapierBodies.get(P.obj);
      if (rb && rb.rigidBody) {
        try {
          rb.rigidBody.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
          rb.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          if (rb.rigidBody.setAngvel) rb.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
          rb.rigidBody.wakeUp && rb.rigidBody.wakeUp();
        } catch (e) {}
      }
    }

    if (P.kind === 'controller') {
      if (PlayerController.vel) PlayerController.vel.set(0, 0, 0);
      if (yaw != null) {
        PlayerController.camYaw = yaw;
        try { if (P.obj) P.obj.rotation.y = yaw; } catch (e) {}
      }
    } else if (P.kind === 'mesh') {
      if (typeof playerVel !== 'undefined' && playerVel) playerVel.set(0, 0, 0);
      if (yaw != null) {
        try { if (typeof fpsYaw !== 'undefined') fpsYaw = yaw; } catch (e) {}
        try { P.obj.rotation.y = yaw; } catch (e) {}
      }
    } else if (P.kind === 'camera' && yaw != null) {
      try { if (typeof fpsYaw !== 'undefined') fpsYaw = yaw; } catch (e) {}
      camera.rotation.y = yaw;
    }

    // 📷 FPS kamerasini ham yangi joyga olib boramiz.
    //    ⚠ Busiz ekran bir kadr davomida eski joyda qolib, keskin
    //      sakrash beradi. 🎯 hitbox teleporti ham shunday qiladi.
    try {
      if (typeof camera !== 'undefined' && typeof camMode !== 'undefined' &&
          camMode === 'fps' && typeof carInside !== 'undefined' && !carInside &&
          P.kind !== 'camera') {
        camera.position.set(pos.x, pos.y + 1.7, pos.z);
      }
    } catch (e) {}
    return true;
  }

  function _respawnPlayer(role) {
    gameState.health = _maxHp();
    const P = _player();
    if (!P) return;
    const r = role || _deathRole;
    const { pos, yaw } = resolveSpawn(r, P);
    placePlayer(pos, yaw, P);
  }

  // ── O'lim overlay (html / rasm / video) ──────────────────────
  function _overlayEl() {
    let ov = document.getElementById('role-death-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'role-death-overlay';
      ov.style.cssText =
        'position:absolute;inset:0;z-index:60;display:none;align-items:center;' +
        'justify-content:center;background:rgba(0,0,0,.9);text-align:center;' +
        'pointer-events:none;transition:opacity .25s;opacity:0';
      const host = document.getElementById('cvp') || document.body;
      host.appendChild(ov);
    }
    return ov;
  }

  function _showDeathOverlay(d) {
    const ov = _overlayEl();
    let inner = '';
    if (d.screen === 'html') {
      inner = '<div style="max-width:90%">' + (d.html || '') + '</div>';
    } else if (d.screen === 'image' && d.mediaB64) {
      inner = '<img src="' + d.mediaB64 + '" style="max-width:88%;max-height:82%;border-radius:6px">';
    } else if (d.screen === 'video' && d.mediaB64) {
      inner = '<video src="' + d.mediaB64 + '" autoplay muted playsinline ' +
              'style="max-width:88%;max-height:82%;border-radius:6px"></video>';
    } else {
      inner = '<div style="font-family:sans-serif;color:#ff4444;font-size:40px;font-weight:800">SIZ OLDINGIZ</div>';
    }
    ov.innerHTML = inner;
    ov.style.display = 'flex';
    requestAnimationFrame(() => { ov.style.opacity = '1'; });
    const v = ov.querySelector('video'); if (v) { try { v.play(); } catch(e){} }
  }

  function _hideDeathOverlay() {
    const ov = document.getElementById('role-death-overlay');
    if (!ov) return;
    ov.style.opacity = '0';
    const v = ov.querySelector('video'); if (v) { try { v.pause(); } catch(e){} }
    setTimeout(() => { if (ov) { ov.style.display = 'none'; ov.innerHTML = ''; } }, 260);
  }

  // ── O'lim kamerali animatsiyasi (oddiy kinematik) ────────────
  let _camSave = null;
  function _startDeathCamera(d) {
    if (typeof camera === 'undefined' || !camera) return;
    const cam = objects.find(o => o.userData && String(o.userData.id) === String(d.cameraId)
                                  && o.userData.isCamera);
    _camSave = {
      pos: camera.position.clone(),
      rot: camera.rotation.clone(),
      fov: camera.fov,
    };
    // Qorong'i vignette hissi uchun overlay (yengil)
    const ov = _overlayEl();
    ov.innerHTML = '';
    ov.style.background = 'radial-gradient(circle, rgba(0,0,0,0) 35%, rgba(0,0,0,.85) 100%)';
    ov.style.display = 'flex';
    requestAnimationFrame(() => { ov.style.opacity = '1'; });

    if (cam) {
      camera.position.copy(cam.position);
      camera.rotation.set(cam.rotation.x, cam.rotation.y, cam.rotation.z);
      if (cam.userData.fov) { camera.fov = cam.userData.fov; camera.updateProjectionMatrix(); }
    }
  }

  function _endDeathCamera() {
    const ov = document.getElementById('role-death-overlay');
    if (ov) ov.style.background = 'rgba(0,0,0,.9)';   // keyingi safar uchun tiklash
    if (_camSave && typeof camera !== 'undefined' && camera) {
      camera.fov = _camSave.fov; camera.updateProjectionMatrix();
    }
    _camSave = null;
  }

  // ── Save / Load ──────────────────────────────────────────────
  function serialize(obj) {
    const r = obj && obj.userData ? obj.userData.roll : null;
    if (!r || !r.enabled) return null;
    return JSON.parse(JSON.stringify(r));
  }
  function restore(obj, data) {
    if (!obj || !data) return;
    // ⚠ Object.assign SAYOZ — eski saqlangan `death` obyekti yangi
    //   `spawn` maydonini butunlay yo'q qilib yuborardi. Shuning uchun
    //   ichki bloklarni (fx / death / death.spawn) alohida qo'shamiz.
    const base = defaultRoll();
    const r = Object.assign(base, data);
    r.fx    = Object.assign(defaultRoll().fx,    data.fx    || {});
    r.death = Object.assign(defaultRoll().death, data.death || {});
    r.death.spawn = Object.assign(defaultSpawn(), (data.death && data.death.spawn) || {});
    r.death.spawn.offset = Object.assign({ x:0, y:0, z:0 },
      (data.death && data.death.spawn && data.death.spawn.offset) || {});
    r.death.spawn.coords = Object.assign({ x:0, y:3, z:0 },
      (data.death && data.death.spawn && data.death.spawn.coords) || {});
    obj.userData.roll = r;
  }

  return {
    defaultRoll, defaultSpawn, get, isActive, ensure, update,
    serialize, restore,
    // spawn API
    resolveSpawn, placePlayer,
    // test/manual
    _startDeath, _respawnPlayer, _player,
  };
})();

window.ObjectRoleSystem = ObjectRoleSystem;

// ============================================================
// INSPECTOR handlerlari (inline onclick/oninput uchun)
// ============================================================
window._rollToggle = function(on) {
  if (typeof selectedObj === 'undefined' || !selectedObj) return;
  const r = ObjectRoleSystem.ensure(selectedObj);
  r.enabled = !!on;
  if (typeof log === 'function')
    log(`🎭 Roll ${on ? 'yoqildi' : "o'chirildi"} — "${selectedObj.userData.name}"`, on ? 'lok' : 'lw');
  if (typeof updateInspector === 'function') updateInspector();
};

// Nuqtali yo'l bo'yicha qiymat o'rnatish: "mode", "rate", "fx.effect", "death.screen"...
window._rollSet = function(path, val) {
  if (typeof selectedObj === 'undefined' || !selectedObj) return;
  const r = ObjectRoleSystem.ensure(selectedObj);
  const parts = path.split('.');
  let o = r;
  for (let i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
  o[parts[parts.length - 1]] = val;
  // Ekran/effekt turi o'zgarsa — UI ni qayta chizamiz (yangi maydonlar chiqishi uchun)
  if (path === 'death.screen' || path === 'fx.effect' || path === 'mode' || path === 'fx.enabled') {
    if (typeof updateInspector === 'function') updateInspector();
  }
};

// O'lim ekrani uchun rasm/video yuklash
window._rollPickMedia = function(kind) {
  if (typeof selectedObj === 'undefined' || !selectedObj) return;
  const r = ObjectRoleSystem.ensure(selectedObj);
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = (kind === 'video') ? 'video/*' : 'image/*';
  inp.style.display = 'none';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      r.death.mediaB64  = ev.target.result;
      r.death.mediaName = f.name;
      r.death.screen    = kind;
      if (typeof log === 'function') log(`🖼 O'lim ekrani (${kind}): ${f.name}`, 'lok');
      if (typeof updateInspector === 'function') updateInspector();
    };
    reader.readAsDataURL(f);
  };
  document.body.appendChild(inp);
  inp.click();
  setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
};

// ============================================================
//  SPAWN NUQTASI — inspector handlerlari
// ============================================================

function _rollSpawnCfg() {
  if (typeof selectedObj === 'undefined' || !selectedObj) return null;
  const r = ObjectRoleSystem.ensure(selectedObj);
  if (!r.death) r.death = ObjectRoleSystem.defaultRoll().death;
  if (!r.death.spawn) r.death.spawn = ObjectRoleSystem.defaultSpawn();
  if (!r.death.spawn.offset) r.death.spawn.offset = { x:0, y:0, z:0 };
  if (!r.death.spawn.coords) r.death.spawn.coords = { x:0, y:3, z:0 };
  return r.death.spawn;
}

// Rejimni almashtirish: 'default' | 'object' | 'coords'
window._rollSpawnMode = function(mode) {
  const sp = _rollSpawnCfg(); if (!sp) return;
  sp.mode = mode;
  // 'object' tanlandi-yu, blok hali yo'q bo'lsa — birinchi mos blokni taklif qilamiz
  if (mode === 'object' && sp.objectId == null) {
    const cand = objects.find(o => o !== selectedObj && o.userData && o.userData.id &&
      !o.userData.isPath && !o.userData.isPathShape && o.visible);
    if (cand) sp.objectId = cand.userData.id;
  }
  if (typeof updateInspector === 'function') updateInspector();
};

// Oddiy qiymat: objectId / anchor / face / gap
window._rollSpawnSet = function(key, val) {
  const sp = _rollSpawnCfg(); if (!sp) return;
  sp[key] = val;
  if (key === 'objectId' || key === 'anchor' || key === 'face') {
    if (typeof updateInspector === 'function') updateInspector();
  }
};

// Ichki qiymat: offset.x / coords.y ...
window._rollSpawnNum = function(group, axis, val) {
  const sp = _rollSpawnCfg(); if (!sp) return;
  if (!sp[group]) sp[group] = { x:0, y:0, z:0 };
  sp[group][axis] = parseFloat(val) || 0;
};

// 🎯 Oyinchining HOZIRGI joyini koordinata sifatida olish
window._rollSpawnHere = function() {
  const sp = _rollSpawnCfg(); if (!sp) return;
  const P = ObjectRoleSystem._player();
  let p = null;
  if (P && P.pos) p = P.pos.clone();
  else if (typeof selectedObj !== 'undefined' && selectedObj) p = selectedObj.position.clone();
  if (!p) return;
  sp.mode = 'coords';
  sp.coords = { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) };
  if (typeof log === 'function')
    log(`🎯 Spawn koordinatasi olindi: ${sp.coords.x} / ${sp.coords.y} / ${sp.coords.z}`, 'lok');
  if (typeof updateInspector === 'function') updateInspector();
};

// 👁 Spawn nuqtasini sinash — hisoblab, marker qo'yadi.
//    Play rejimida bo'lsa — oyinchini o'sha joyga ko'chiradi ham.
window._rollSpawnPreview = function() {
  if (typeof selectedObj === 'undefined' || !selectedObj) return;
  const r = ObjectRoleSystem.ensure(selectedObj);
  const res = ObjectRoleSystem.resolveSpawn(r);
  if (!res || !res.pos) return;
  _rollSpawnMarker(res.pos);
  const playing = (typeof isPlaying !== 'undefined' && isPlaying);
  if (playing) {
    ObjectRoleSystem.placePlayer(res.pos, res.yaw);
    if (typeof log === 'function') log('👁 Oyinchi spawn nuqtasiga ko\'chirildi', 'lok');
  } else if (typeof log === 'function') {
    log(`👁 Spawn nuqtasi: ${res.pos.x.toFixed(2)} / ${res.pos.y.toFixed(2)} / ${res.pos.z.toFixed(2)}`, 'lok');
  }
};

// Vaqtinchalik yashil marker (sahnaga qo'shiladi, `objects` ga EMAS — saqlanmaydi)
let _rollMarker = null, _rollMarkerT = null;
function _rollSpawnMarker(pos) {
  if (typeof scene === 'undefined' || !scene) return;
  if (!_rollMarker) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.045, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.9, depthTest: false })
    );
    ring.rotation.x = Math.PI / 2;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 2, 6),
      new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.55, depthTest: false })
    );
    g.add(ring); g.add(pole);
    g.renderOrder = 999;
    g.userData._noSave = true;
    _rollMarker = g;
  }
  if (!_rollMarker.parent) scene.add(_rollMarker);
  _rollMarker.position.copy(pos);
  _rollMarker.visible = true;
  if (_rollMarkerT) clearTimeout(_rollMarkerT);
  _rollMarkerT = setTimeout(() => { if (_rollMarker) _rollMarker.visible = false; }, 4000);
}

// O'lim ketma-ketligini sinab ko'rish (play rejimida)
window._rollTestDeath = function() {
  if (typeof selectedObj === 'undefined' || !selectedObj) return;
  if (typeof isPlaying === 'undefined' || !isPlaying) {
    if (typeof log === 'function') log('▶ Avval Play rejimini yoqing', 'lw');
    return;
  }
  const r = ObjectRoleSystem.ensure(selectedObj);
  ObjectRoleSystem._startDeath(selectedObj, r);
};
