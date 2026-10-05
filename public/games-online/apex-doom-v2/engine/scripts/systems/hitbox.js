// ============================================================
// HITBOX OBJECT — Invisible trigger zone
// Fires configurable events (camera anim, spawn redirect,
// checkpoint, soundtrack, custom logic) when a player or
// vehicle enters/stays/exits the zone.
//
// UI-facing text: Uzbek.
// Code, variable names, comments: English.
// ============================================================

const HitboxSystem = (() => {
  'use strict';

  // ── Colors used for editor visualization ─────────────────────
  const COLOR_OUTLINE = 0xff8c00;  // vivid orange — stands out against grid
  const COLOR_FILL    = 0xff8c00;

  // ── Editor materials ─────────────────────────────────────────
  const _mkOutlineMat = () => new THREE.MeshBasicMaterial({
    color: COLOR_OUTLINE,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const _mkFillMat = () => new THREE.MeshBasicMaterial({
    color: COLOR_FILL,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // ── Default userData for a new hitbox ────────────────────────
  function _defaultData() {
    return {
      isHitbox:      true,
      type:          'Hitbox',
      hitboxSize:    { x: 2, y: 2, z: 2 },     // width, height, depth
      triggerType:   'onEnter',                // onEnter | onStay | onExit
      // Collision mode:
      //   'inline' — pass-through / ghost (default). Trigger fires while
      //              the entity's center is inside the box.
      //   'block'  — solid static collider. Entity cannot pass through.
      //              Trigger fires on contact (padded surface hit).
      collisionMode: 'inline',
      targetObjectId: null,                    // optional reference object
      // ── 📦 PREDMET SHARTI (pickup bilan bog'liq) ─────────────
      //  Hitbox faqat KERAKLI predmet bilan ishlaydi.
      //    mode 'carry'   — o'yinchi predmetni QO'LIDA ushlab kirsa,
      //                     avtomatik ishga tushadi.
      //    mode 'deliver' — predmet zona ichiga TASHLANSA/OTILSA ishlaydi.
      //                     Qo'lda ushlab kirib turish YETARLI EMAS —
      //                     predmet qo'ldan chiqishi shart.
      //  onDone 'keep'    — predmet joyida qoladi.
      //  onDone 'consume' — predmet yo'qoladi (ko'rinmas bo'ladi) va
      //                     o'yinchi qo'lidan o'zi chiqib ketadi.
      itemReq: {
        enabled: false,
        itemId:  null,      // kerakli obyekt id (null = shart yo'q)
        mode:    'carry',   // 'carry' | 'deliver'
        onDone:  'consume', // 'consume' | 'keep'
        once:    true,      // bir marta ishlab to'xtasin
      },
      // Reverse Playback mode — alternates forward/reverse on each activation.
      // Handled by ReversePlaybackAPI; per-hitbox key is 'hb_' + id.
      reverseMode: {
        enabled:      false,   // must be explicitly enabled
        reverseSpeed: 1.0,     // separate speed for the reverse direction
        resetOnLoad:  true,    // clear alternation counter on scene reload
      },
      actions: {
        cameraAnim: {
          enabled:      false,
          cameraId:     null,
          duration:     1.5,
          // transitionMode:
          //   'smooth'  — smooth lerp from current cam to target (duration seconds)
          //   'instant' — snap instantly; no interpolation, no waiting
          transitionMode: 'smooth',
          // continuePath: after the transition completes, activate the
          // target camera and start Timeline playback so any keyframes on
          // that camera (a cinematic path) actually play.  Default true —
          // this matches the user expectation when they set up camera paths.
          continuePath: true,
          // returnToPlayer: when the whole animation ends (transition +
          // optional Timeline), deactivate the target camera and hand
          // control back to the player / previous camera mode.
          returnToPlayer: true,
          // lockPlayer: freeze player input (WASD, mouse look, velocity)
          // for the duration of the cinematic, then release when done.
          // Prevents the player from wandering off-frame mid-cutscene.
          lockPlayer:      true,
          // hidePlayer: also hide the player mesh during the cinematic
          // and restore it when the animation ends. Useful when the
          // camera flies through the player or when they'd otherwise
          // be visible in the frame.
          hidePlayer:      false,
          // hideCameraAlways: keep the target camera mesh invisible in
          // the editor too (not just during play). Useful to declutter
          // scenes with many cinematic cameras.
          hideCameraAlways: false,
        },
        spawnRedirect: {
          enabled: false,
          spawnId: null,
          // Pre-teleport animation — three flavours:
          //   'fade'   — screen fades to preAnimColor, teleport at midpoint,
          //              fades back out
          //   'html'   — custom HTML content is shown over a dark backdrop
          //              for the duration; teleport at midpoint
          //   'camera' — camera-driven pre-anim. See preAnimCameraSource:
          //              'spawn'    — lerp to a spot above the spawn point (default)
          //              'object'   — lerp to a chosen camera object (like Camera Anim)
          //              'timeline' — activate chosen camera + play Timeline
          //              'imported' — play imported keyframes on the chosen camera
          preAnimEnabled:  false,
          preAnimType:     'fade',      // 'fade' | 'html' | 'camera'
          preAnimDuration: 1.0,         // total seconds
          preAnimColor:    '#000000',   // for 'fade'
          preAnimHtml:     '<div style="text-align:center;font-family:sans-serif">\n' +
                           '  <div style="font-size:36px;color:#fff;margin-bottom:12px">Yuklanmoqda…</div>\n' +
                           '  <div style="font-size:14px;color:#aaa">Iltimos kuting</div>\n' +
                           '</div>',    // for 'html'
          // Camera pre-anim options
          preAnimCameraSource: 'spawn',   // 'spawn' | 'object' | 'timeline' | 'imported'
          preAnimCameraId:     null,      // target camera object id (for object/timeline/imported)
          preAnimKeyframes:    [],        // for 'imported' — loaded from a .json
          preAnimKfSourceName: '',        // display name of imported file
          // Player-input lock during the entire pre-anim (same as Camera Anim)
          lockPlayer:          true,
        },
        checkpoint:    { enabled: false },
        // ⏱ Timer / Auto — animatsiya/ovozni kechikish bilan yoki
        // o'yinchisiz (auto) ishga tushiradi.
        //   delay — necha soniyadan keyin ishga tushsin
        //   auto  — true: o'yinchi kirmasa ham play boshlangach `delay`
        //           soniyadan keyin O'ZI ishga tushadi (bir marta).
        //           false: o'yinchi kirganda `delay` kutib, keyin ishga tushadi.
        timer:         { enabled: false, delay: 3.0, auto: false,
                         tracks: [], sounds: [], imports: [] },
        // 📦 Scene ZIP — Timeline ZIP eksportidan import qilingan
        // obyektlar animatsiyasi + ovozlar.
        //   trigger:   'enter' — o'yinchi kirganda | 'auto' — o'yin boshlanganda o'zi
        //   collision: 'original' — har obyekt o'z rejimida | 'inline' | 'block'
        sceneZip:      { enabled: false, imports: [], sounds: [],
                         trigger: 'enter', collision: 'original' },
        soundtrack:    { enabled: false, soundName: 'coin', triggerOn: 'enter' },
        // 🖥 HTML sahifa (dialog/quest) — o'yinchi kirganda HTML ko'rsatiladi.
        //   mode: 'show' — HTML chiqadi (qoladi) | 'close' — mavjud HTML yopiladi
        //   HTML chiqib ketilса ham qoladi; faqat boshqa trigger yoki ichidagi
        //   tugma (_hbCloseHtmlPage()) uni yopadi.
        // 🎚 Stat-zona — kirganда o'yinchi/mashina statlarini o'zgartiradi.
        //   mode:'set' — belgilangan qiymatlarni qo'llaydi
        //   mode:'reset' — standart (o'yin boshidagi) holatga qaytaradi
        //   null qiymat = o'zgartirilmaydi
        statZone:      { enabled: false, mode: 'set',
                         pSpeed: null, pJump: null, pStamina: null, pSprint: null,
                         cMaxSpeed: null },
        htmlPage:      { enabled: false, mode: 'show', content: '', position: 'bottom',
                         // 🎞 chiqish · ⏱ turish · ⌨ qulf
                         ease: 'smooth', dur: 0.3, hold: 0, lockKeys: false,
                         bez: [0.42, 0, 0.58, 1] },
        // Timeline playback — triggers a Timeline sequence forward/reverse.
        //   mode: 'global' plays the whole timeline
        //   mode: 'object' plays only the track for `targetTrackId`
        timelinePlay:  {
          targetTrackName: '',   // zaxira bog'lanish (id eskirsa)
          enabled: false, mode: 'global', targetTrackId: null, speed: 1.0,
          lockPlayer: false,   // freeze player input while Timeline plays
        },
        // Imported animations — multiple slots, each an animation
        // loaded from an Object-Only Export .json file. Every slot
        // targets its own object; all slots fire in parallel on trigger.
        // Ideal for cutscenes: door + light + character + prop, all
        // animated together from one hitbox.
        importedAnimations: {
          enabled: false,
          slots: [],   // [{ id, sourceName, keyframes, duration, targetObjectId, speed, loop, soundUrl }]
          lockPlayer: false,   // freeze player input while any slot is playing
          // 🎬 SLOT REJIMI — 🔘 tugma bilan bir xil tanlov:
          //   'all'        — HAMMASI BIRDAN (standart, eski xulq)
          //   'sequential' — GALMA-GAL: 1-slot tugagach 2-si boshlanadi
          //   'each'       — HAR KIRGANDA keyingisi (1→ 1, 2→ 2 …)
          //  ⚠ Standart 'all' — ESKI SAHNALAR uchun: boshqa qiymat
          //    qilsak mavjud loyihalarda animatsiya boshqacha ishlab
          //    ketardi.
          slotMode: 'all',
          // 🔁 Loop ketayotganda QAYTA kirilsa:
          //   'stop'    — butunlay to'xtaydi (standart)
          //   'restart' — boshidan qayta boshlanadi
          loopRetrigger: 'stop',
          // ▶ Butun timelineni ishga tushirish (hamma obyekt birdan)
          playWhole: false,
        },
        customLogic:   { enabled: false, code:
          "// Custom logic (JS)\n" +
          "// Available: entity, hitbox, api, direction, THREE, scene, objects\n" +
          "//   direction = 'forward' | 'reverse'  (respects Reverse Mode)\n" +
          "// Example:\n" +
          "//   if (direction === 'reverse') api.addScore(-5);\n" +
          "//   else                          api.addScore(10);\n" },
      },
    };
  }

  /**
   * Saqlangan hitboxning KO'RINISHINI tiklaydi.
   * Prefab/sahna yuklashda mesh oddiy `MeshStandardMaterial` kub bo'lib
   * keladi — bu yerda unga simli chegara (outline) va yarim shaffof
   * to'ldirish qaytariladi. `userData` va transformga tegilmaydi.
   */
  function restoreVisual(mesh) {
    if (!mesh || !mesh.isMesh) return mesh;
    try { if (mesh.material) mesh.material.dispose(); } catch (e) {}
    mesh.material = _mkOutlineMat();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // Eski to'ldirish qolgan bo'lsa — olib tashlaymiz (ikki marta bo'lmasin)
    const old = mesh.children.filter(c => c.name === '__hb_fill__');
    old.forEach(c => {
      mesh.remove(c);
      try { c.geometry && c.geometry.dispose(); c.material && c.material.dispose(); } catch (e) {}
    });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), _mkFillMat());
    fill.raycast = () => {};
    fill.name = '__hb_fill__';
    mesh.add(fill);
    // ⚠ `_fillRef` — `_` bilan boshlangani uchun saqlashda tashlanadi.
    //   `syncSize` va rang yangilagichlar aynan shu havolaga tayanadi,
    //   shuning uchun uni qayta o'rnatish SHART.
    mesh.userData._fillRef = fill;
    syncSize(mesh);          // o'lchamni userData.hitboxSize dan tiklaydi
    return mesh;
  }

  // ── Create a new hitbox mesh and add to scene ────────────────
  function create(pos) {
    const s = 2;
    const geo = new THREE.BoxGeometry(s, s, s);
    const mesh = new THREE.Mesh(geo, _mkOutlineMat());
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    // Semi-transparent fill (child of the outline mesh — moves with parent)
    const fill = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), _mkFillMat());
    fill.raycast = () => {};       // fill is non-clickable; parent handles selection
    fill.name = '__hb_fill__';
    mesh.add(fill);

    mesh.position.copy(pos || new THREE.Vector3(0, 1, 0));

    // Attach data
    mesh.userData = Object.assign({
      id:   ++objIdC,
      name: 'Hitbox ' + objIdC,
    }, _defaultData());

    // Player collision skip: player.js checks `colliderMode === 'inline'`
    // and passes right through. We mirror our collisionMode into this
    // property so the two stay in sync automatically.
    mesh.userData.colliderMode = 'inline';

    // Runtime state (not serialized)
    mesh.userData._entitiesInside = new Set();
    mesh.userData._fillRef        = fill;

    scene.add(mesh);
    objects.push(mesh);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();

    updateHierarchy();
    selectObject(mesh);
    updateStats();
    if (typeof captureState === 'function') captureState("Hitbox qo'shildi");
    log(`+ <span style="color:var(--accent2)">${mesh.userData.name}</span> [Trigger zonasi]`, 'lok');
    return mesh;
  }

  // ── Rebuild geometry after size change ───────────────────────
  function syncSize(hb) {
    if (!hb || !hb.userData || !hb.userData.isHitbox) return;
    const s = hb.userData.hitboxSize || { x: 2, y: 2, z: 2 };
    const sx = Math.max(0.05, s.x);
    const sy = Math.max(0.05, s.y);
    const sz = Math.max(0.05, s.z);

    if (hb.geometry) hb.geometry.dispose();
    hb.geometry = new THREE.BoxGeometry(sx, sy, sz);

    const fill = hb.userData._fillRef;
    if (fill) {
      if (fill.geometry) fill.geometry.dispose();
      fill.geometry = new THREE.BoxGeometry(sx, sy, sz);
    }
  }

  // ── ⚠ TUZATILDI: WORLD koordinatalar ────────────────────────
  // Hitbox papka/prefab ichiga joylanganda `hb.position` LOKAL bo'lib qoladi
  // (ona ichidagi offset). Eski kod uni world deb hisoblagani uchun
  // nested hitbox zonasi butunlay boshqa joyda "yashirin" turardi.
  // getWorldPosition/getWorldScale ona zanjirini hisobga oladi.
  const _hbWorldC = new THREE.Vector3();
  const _hbWorldS = new THREE.Vector3();
  function _hbCenter(hb) { return hb.getWorldPosition(_hbWorldC); }
  function _hbScale(hb)  { return hb.getWorldScale(_hbWorldS); }

  // ── AABB (axis-aligned) point-in-box test ────────────────────
  // Uses hitbox.position as center, hitboxSize scaled by hitbox.scale.
  // Ignores hitbox rotation to keep the check O(1) and predictable.
  function _pointInside(hb, p) {
    const s = hb.userData.hitboxSize || { x: 2, y: 2, z: 2 };
    const w = _hbScale(hb);
    const hx = s.x * w.x * 0.5;
    const hy = s.y * w.y * 0.5;
    const hz = s.z * w.z * 0.5;
    const c = _hbCenter(hb);
    return (
      p.x >= c.x - hx && p.x <= c.x + hx &&
      p.y >= c.y - hy && p.y <= c.y + hy &&
      p.z >= c.z - hz && p.z <= c.z + hz
    );
  }

  // Padded AABB test — for BLOCK mode. Since the entity physically
  // cannot get inside (there's a solid collider), we widen the box
  // by an approximate entity radius so a "contact" fires when the
  // entity is pressed against a face.
  const _CONTACT_PADDING = 0.55;   // ~ typical player capsule radius
  function _pointNear(hb, p) {
    const s = hb.userData.hitboxSize || { x: 2, y: 2, z: 2 };
    const w = _hbScale(hb);
    const hx = s.x * w.x * 0.5 + _CONTACT_PADDING;
    const hy = s.y * w.y * 0.5 + _CONTACT_PADDING;
    const hz = s.z * w.z * 0.5 + _CONTACT_PADDING;
    const c = _hbCenter(hb);
    return (
      p.x >= c.x - hx && p.x <= c.x + hx &&
      p.y >= c.y - hy && p.y <= c.y + hy &&
      p.z >= c.z - hz && p.z <= c.z + hz
    );
  }

  // ── Enumerate all "entities" that can trigger a hitbox ───────
  //   - the FPS playerMesh (created by createPlayer)
  //   - a mesh registered with PlayerController (custom playerObj)
  //   - the active driven car
  // ── 📦 PREDMET SHARTI — yordamchilar ─────────────────────────
  //  Pickup tizimi `InteractiveButtonSystem` da; bu yer faqat SO'RAYDI.
  //  Tizim yuklanmagan bo'lsa hammasi xavfsiz `false` qaytaradi.
  const _irWorldP = new THREE.Vector3();
  const _consumedItems = [];   // [{obj, prevCollider}] — Stop'da tiklanadi

  function _irFindItem(id) {
    if (id == null || id === '') return null;
    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      if (o.userData && String(o.userData.id) === String(id)) return o;
    }
    return null;
  }

  function _irHeld(item) {
    const S = (typeof InteractiveButtonSystem !== 'undefined') ? InteractiveButtonSystem : null;
    if (!S || typeof S.isCarried !== 'function') return false;
    try { return S.isCarried(item); } catch (e) { return false; }
  }

  // Predmet kamera bolasi bo'lishi mumkin (qo'lda) — WORLD pozitsiya shart
  function _irPos(item) {
    item.updateMatrixWorld(true);
    return _irWorldP.setFromMatrixPosition(item.matrixWorld);
  }

  /**
   * Predmetni "iste'mol" qiladi: o'yinchi qo'lidan chiqaradi, ko'rinmas
   * qiladi va to'qnashuvdan olib tashlaydi.
   * ⚠ `visible` ni play-mode.js `savedStates` orqali Stop'da o'zi qaytaradi,
   *   lekin `colliderMode` — userData maydoni, uni O'ZIMIZ tiklaymiz
   *   (`_onPlayStop`). Aks holda predmet keyingi o'yinda ham arvoh bo'lardi.
   */
  function _irConsume(item) {
    if (!item || item.userData._hbConsumed) return;
    const S = (typeof InteractiveButtonSystem !== 'undefined') ? InteractiveButtonSystem : null;
    if (S && typeof S.releaseCarried === 'function') {
      try { S.releaseCarried(item); } catch (e) {}
    }
    _consumedItems.push({ obj: item, prevCollider: item.userData.colliderMode });
    item.userData._hbConsumed = true;
    item.userData.colliderMode = 'inline';   // 👻 o'yinchi ichidan o'tsin
    item.visible = false;
  }

  function _irRestoreConsumed() {
    for (const c of _consumedItems) {
      if (!c.obj) continue;
      c.obj.userData._hbConsumed = false;
      if (c.prevCollider === undefined) delete c.obj.userData.colliderMode;
      else                              c.obj.userData.colliderMode = c.prevCollider;
      c.obj.visible = true;
    }
    _consumedItems.length = 0;
  }

  /**
   * 💨 Yutilgan predmetlar YASHIRIN turishini har kadrda TASDIQLAYDI.
   *
   * ⚠ NEGA KERAK: `_irConsume()` predmetni bir marta yashiradi. Lekin
   *   sahnada uni QAYTA yoqadigan boshqa tizim bo'lishi mumkin —
   *   ⏱ timeline `vis` keyi, 🎒 inventar `_unstow`, 🗺 Map Loader,
   *   🎬 kamera animatsiyasi yoki 📦 prefab. Ular predmetni bilmaydi
   *   va o'z holatini tiklab, yutilgan predmetni ko'rinadigan qilib
   *   qo'yishi mumkin.
   *
   *   Foydalanuvchi aynan shuni ko'rgan: hitbox ishlaydi, lekin
   *   predmet yo'qolmaydi. Kod o'qish bilan aybdorni topib
   *   bo'lmadi — har bir shox alohida to'g'ri ishlaydi.
   *
   * ⚠ BU XATONI YASHIRMAYDI: qayta yoqilgani PAYQALSA, konsolga
   *   bir marta yoziladi. Ya'ni keyingi safar aybdor tizim
   *   nomi bilan ma'lum bo'ladi, taxmin qilish shart emas.
   */
  function _irEnforceConsumed() {
    for (const c of _consumedItems) {
      const o = c.obj;
      if (!o || !o.userData || !o.userData._hbConsumed) continue;
      if (o.visible) {
        o.visible = false;
        if (!c._warned) {
          c._warned = true;
          if (typeof log === 'function') {
            log(`⚠ 💨 "${o.userData.name}" yutilgan, lekin BOSHQA tizim uni qayta ` +
                `ko'rsatdi — yana yashirildi. (timeline 👁 keyi · inventar · ` +
                `Map Loader shundan bo'lishi mumkin)`, 'lw');
          }
        }
      }
      // 👻 To'qnashuv rejimi ham qayta yozilib qolmasin
      if (o.userData.colliderMode !== 'inline') o.userData.colliderMode = 'inline';
    }
  }

  // Reverse Playback yo'nalishi (entity siklidan tashqarida ham kerak)
  function _irDir(hb, phase) {
    const rev = hb.userData.reverseMode;
    if (!rev || !rev.enabled || typeof ReversePlaybackAPI === 'undefined') return 'forward';
    const key = 'hb_' + hb.userData.id;
    if (phase === 'enter' || phase === 'exit') {
      ReversePlaybackAPI.register(key, { resetOnLoad: rev.resetOnLoad !== false });
      return ReversePlaybackAPI.nextDirection(key);
    }
    return (typeof ReversePlaybackAPI.peekDirection === 'function')
      ? ReversePlaybackAPI.peekDirection(key) : 'forward';
  }

  function _collectEntities() {
    const list = [];
    if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent) {
      list.push({ ref: playerMesh, kind: 'player' });
    }
    if (typeof PlayerController !== 'undefined' && PlayerController.obj &&
        PlayerController.obj !== playerMesh) {
      list.push({ ref: PlayerController.obj, kind: 'player' });
    }
    if (typeof activeCar !== 'undefined' && activeCar) {
      list.push({ ref: activeCar, kind: 'car' });
    }
    return list;
  }

  // ── Camera animation state (single-slot, per-frame lerp) ─────
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
  //      Handles keys via its own document listeners that we can
  //      remove by reference.
  //   2) Built-in FPS camera (camera-modes.js — the DEFAULT case)
  //      Handles keys via ANONYMOUS document listeners that we
  //      can't remove.  Instead we monkey-patch `updateFPS(delta)`
  //      so it becomes a no-op while the lock is active.  Mouse
  //      look is blocked by _startCameraAnim switching camMode
  //      to 'orbit' (the FPS mouse handler is gated on camMode).
  const _playerLock = {
    active:              false,
    detached:            false,
    _origUpdateFPS:      null,   // captures original updateFPS (camera-modes.js)
    _origUpdatePlayer:   null,   // captures original updatePlayer (player.js)
  };

  // Install the FPS wrappers ONCE, immediately, so any future lock
  // just flips the flag.  The wrappers are permanent and pass-through
  // whenever _playerLock.active is false.
  //
  // Two separate functions read fpsKeys and need to be intercepted:
  //   • updateFPS   — camera-modes.js  (default FPS camera, no player mesh)
  //   • updatePlayer — player.js       (built-in FPS player with mesh, from createPlayer)
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
          // Frozen — still apply gravity/damping? No: zero velocity fully
          // and skip. Prevents the player from continuing to slide from
          // prior momentum during the cutscene.
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
  // Install window-level capture-phase listeners at module load time.
  // These run BEFORE any document-level listener (camera-modes.js,
  // player.js, keybindings.js, etc.) in the event flow: capture goes
  // window → document → target. When _playerLock.active is true,
  // stopImmediatePropagation() prevents ANY downstream listener from
  // firing — nothing sets fpsKeys, nothing rotates the camera, nothing.
  // This is the last line of defense on top of the update wrappers.
  const _blockIfLocked = (e) => {
    if (!_playerLock.active) return;
    // Let the user still switch tabs, escape pointer lock, etc.
    if (e.type === 'keydown' || e.type === 'keyup') {
      // Bloklangan animatsiyani ochish uchun tugma — input bloklangan bo'lsa ham ishlasin.
      if (e.type === 'keydown' && typeof window._resumeBlockedAnim === 'function') {
        window._resumeBlockedAnim('key:' + e.code);
        window._resumeBlockedAnim('');
      }
      if (['Escape', 'F5', 'F11', 'F12'].includes(e.code)) return;
    }
    // Absolute/Lock kamera faol bo'lsa — cutscene paytida ham o'yinchi erkin
    // qaray olishi uchun sichqoncha offsetini shu yerda hisoblaymiz (WASD hali bloklangan).
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
    window.addEventListener('keydown',    _blockIfLocked, { capture: true });
    window.addEventListener('keyup',      _blockIfLocked, { capture: true });
    window.addEventListener('keypress',   _blockIfLocked, { capture: true });
    window.addEventListener('mousemove',  _blockIfLocked, { capture: true });
    window.addEventListener('mousedown',  _blockIfLocked, { capture: true });
    window.addEventListener('mouseup',    _blockIfLocked, { capture: true });
    window.addEventListener('wheel',      _blockIfLocked, { capture: true, passive: false });
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
  }

  function _engagePlayerLock() {
    if (_playerLock.active) return;
    _playerLock.active = true;

    _installFPSWrapper();
    _clearAllKeyStates();

    // Zero out PlayerController velocity if it exists
    if (typeof PlayerController !== 'undefined' && PlayerController.vel) {
      PlayerController.vel.set(0, 0, 0);
    }

    // PlayerController path — detach its own listeners for defense in depth.
    // Not strictly required (fpsKeys wrapper handles the default case),
    // but it prevents PlayerController from accumulating state.
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

    log("🔒 O'yinchi bloklandi (cutscene)", 'lw');
  }

  function _releasePlayerLock() {
    if (!_playerLock.active) return;
    _playerLock.active = false;

    // Re-attach PlayerController listeners (updateFPS wrapper stays put)
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

    // Clear any residual state so nothing lurches when control returns
    _clearAllKeyStates();

    log("🔓 O'yinchi qayta faollashtirildi", 'lok');
  }

  function _startCameraAnim(cfg, direction, reverseSpeed, hb) {
    if (typeof camera === 'undefined') return;
    const targetId = cfg.cameraId;
    if (!targetId) {
      log("⚠ Hitbox: kamera obyekti tanlanmagan", 'lw');
      return;
    }
    const tgt = objects.find(o => String(o.userData && o.userData.id) === String(targetId));
    if (!tgt) {
      log("⚠ Hitbox: kamera obyekti topilmadi", 'lw');
      return;
    }

    // Remember the pre-animation ("origin") camera state on the hitbox itself.
    // Kept in userData so it's per-hitbox; runtime-only (not serialized).
    if (hb && hb.userData && !hb.userData._camOrigin) {
      hb.userData._camOrigin = {
        pos: camera.position.clone(),
        rot: new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z, 'YXZ'),
      };
    }
    const origin = hb && hb.userData && hb.userData._camOrigin;
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
    _camAnim.returnToPlayer = cfg.returnToPlayer !== false; // default TRUE
    _camAnim.blocks         = Array.isArray(cfg.blocks) ? cfg.blocks : [];
    _camAnim.direction      = isReverse ? 'reverse' : 'forward';
    _camAnim.reverseSpeed   = reverseSpeed || 1.0;

    // Player lock — engage if EITHER lock OR hide is requested. A
    // hidden player that can still walk around is always a bug —
    // they'd wander out of the scene and get stuck when re-shown.
    // Released in _returnCameraToPlayer / _onPlayStop.
    const shouldLock = (cfg.lockPlayer !== false) || !!cfg.hidePlayer;
    if (shouldLock) _engagePlayerLock();

    // Hide player mesh(es) during the cinematic if requested.
    // Track what we hid so we can restore visibility precisely.
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

    // Persistent "hide camera mesh" flag — mark on the camera so
    // subsequent frames keep it hidden even after the cinematic.
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
    // Skip the lerp entirely: place the camera at the target pose
    // on the same frame and hand off to _onCameraTransitionDone.
    if (cfg.transitionMode === 'instant') {
      camera.position.copy(_camAnim.toPos);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(_camAnim.toRot.x, _camAnim.toRot.y, _camAnim.toRot.z);
      _camAnim.active = false;
      window._hbCamBusy = false;
      _camAnim.fromPos = _camAnim.fromRot = _camAnim.toPos = _camAnim.toRot = null;
      log(`🎬 Hitbox: kamera darrov (${isReverse ? 'teskariga' : 'oldinga'})`, 'lok');
      _onCameraTransitionDone();
      return;
    }

    log(`🎬 Hitbox: kamera ${isReverse ? 'teskariga' : 'oldinga'} (${dur.toFixed(2)}s)`, 'lok');
  }

  function _updateCameraAnim(delta) {
    // ⚠ Cutscene kamerani EGALLAB oldi — mashina kamerasi (car.js)
    //   chetga chiqsin. Bayroqsiz u har kadr kamerani mashinaga
    //   qaytarib, cutscene'ni bosib ketardi.
    window._hbCamBusy = _camAnim.active;
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
      window._hbCamBusy = false;   // lerp tugadi — endi faol kamera obyekti egalik qiladi
      _camAnim.fromPos = _camAnim.fromRot = _camAnim.toPos = _camAnim.toRot = null;
      _onCameraTransitionDone();
    }
  }

  // ── When the smooth transition finishes: optionally activate the
  //    target camera object so the main camera follows it, and kick
  //    off Timeline playback so any keyframes on that camera play.
  //
  //    Main-loop already does:
  //       if (ud.isCamera && ud._isActive && !_camPathPlaying)
  //           camera.position.copy(o.position); …
  //    → so once the target camera is _isActive, the main camera
  //      tracks it every frame. Timeline then animates the target
  //      camera's position/rotation and the main camera follows.
  function _onCameraTransitionDone() {
    const tgt          = _camAnim.targetCam;
    const cont         = _camAnim.continuePath;
    const returnToPl   = _camAnim.returnToPlayer;
    const dir          = _camAnim.direction;
    const revSpeed     = _camAnim.reverseSpeed;
    const blocks       = _camAnim.blocks || [];
    _camAnim.targetCam = null;

    if (!tgt) return;

    // Helper to hand control back when everything is done.
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

    // Activate the target camera → main-loop will sync the real
    // camera to its position/rotation every frame.
    tgt.userData._isActive = true;
    tgt.visible = false;

    // Absolute/Lock kamera bo'lsa — o'yinchi erkin qaray olishi uchun
    // erkin-qarash offsetini nolga tashlab, pointer lock so'raymiz.
    if (tgt.userData.camViewMode === 'absolute' || tgt.userData.camViewMode === 'lookat') {
      if (window._resetAbsCamLook) window._resetAbsCamLook();
      const _cv = document.getElementById('three-canvas');
      if (_cv && !document.pointerLockElement && !window._pcCursorFree) { try { _cv.requestPointerLock(); } catch (e) {} }
    }

    // If Timeline has content, play it and hand off on completion.
    // Otherwise (Timeline empty) the target camera is static, so
    // return immediately if requested.
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
      // Give the viewer a beat to register the target pose, then return.
      if (returnToPl) {
        setTimeout(() => {
          if (typeof isPlaying !== 'undefined' && isPlaying) finishAndReturn();
        }, 100);
      }
    }
  }

  // ── Deactivate the target camera and hand control back to the
  //    player (or whatever camera mode was active before the animation).
  //    Never forces a mode change the user didn't originally have.
  function _returnCameraToPlayer(tgt) {
    // Deactivate all cameras. Show meshes UNLESS they're flagged as
    // always-hidden (hideCameraAlways option).
    objects.forEach(o => {
      if (o.userData && o.userData.isCamera) {
        o.userData._isActive = false;
        o.visible = !o.userData._alwaysHidden;
        if (o.material && o.material.emissive && o.material.emissive.setScalar) {
          o.material.emissive.setScalar(0.05);
        }
      }
    });

    // Stop any still-running Timeline playback (both ours and Timeline's own)
    if (typeof TimelineExportSystem !== 'undefined' && TimelineExportSystem.stopTimeline) {
      try { TimelineExportSystem.stopTimeline(); } catch(e) {}
    }
    if (typeof tlStop === 'function') { try { tlStop(); } catch(e) {} }

    // Restore whatever mode the user was in before we started the animation.
    // Do NOT force FPS — that was overriding a 3rd-person / orbit user.
    const restoreMode = _camAnim.prevMode;   // captured in _startCameraAnim
    if (restoreMode && typeof setCamMode === 'function') {
      try { setCamMode(restoreMode); } catch(e) {}
    }

    // Only reacquire pointer lock if the restored mode was FPS —
    // otherwise the user wasn't in a locked-mouse mode to begin with.
    if (restoreMode === 'fps') {
      const cv = document.getElementById('three-canvas') ||
                 (typeof canvas !== 'undefined' ? canvas : null);
      if (cv && cv.requestPointerLock) {
        setTimeout(() => { if (window._pcCursorFree) return; try { cv.requestPointerLock(); } catch(e) {} }, 60);
      }
    }

    // Release player lock so WASD / mouse work again
    _releasePlayerLock();

    // Restore player mesh visibility if we hid it at anim start
    if (Array.isArray(_camAnim._hiddenMeshes)) {
      _camAnim._hiddenMeshes.forEach(({ mesh, wasVisible }) => {
        if (mesh) mesh.visible = wasVisible;
      });
      _camAnim._hiddenMeshes = null;
    }

    _camAnim.prevMode = null;
    log(`🎮 Hitbox: kamera boshqaruvi qaytarildi (${restoreMode || 'orbit'})`, 'lok');
  }

  // ── Teleport an entity to a spawn point (target object pos) ──
  //   direction === 'reverse': restore pre-spawn position instead of teleporting.
  //   Pre-spawn positions are tracked per-entity on the hitbox itself.
  //   If cfg.preAnimEnabled: play a fade-to-color effect, teleport at the
  //   midpoint (screen fully covered), fade back out.
  function _teleport(entityMesh, spawnId, direction, hb, cfg) {
    if (!entityMesh) return;

    const doInstant = () => _teleportInstant(entityMesh, spawnId, direction, hb);

    // Pre-teleport animation — three flavours
    if (cfg && cfg.preAnimEnabled) {
      const type = cfg.preAnimType || 'fade';
      const dur  = Math.max(0.2, cfg.preAnimDuration || 1.0);

      // Optional player-input lock for the duration of the pre-anim
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
        _cameraTeleport(dur, entityMesh, spawnId, direction, hb, cfg, finishAndRelease);
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
  function _teleportInstant(entityMesh, spawnId, direction, hb) {
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
      if (!hb || !hb.userData || !hb.userData._preSpawnPositions) {
        log("⚠ Hitbox: teskari yo'nalish uchun oldingi pozitsiya yo'q", 'lw');
        return;
      }
      const prev = hb.userData._preSpawnPositions.get(entityMesh);
      if (!prev) {
        log("⚠ Hitbox: bu obyektning oldingi pozitsiyasi topilmadi", 'lw');
        return;
      }
      doApply(prev);
      log("🔁 Hitbox: oldingi pozitsiyaga qaytarildi", 'lok');
      return;
    }

    // Forward: normal teleport to spawn point
    if (spawnId == null) {
      log("⚠ Hitbox: spawn nuqta tanlanmagan", 'lw');
      return;
    }
    const tgt = objects.find(o => String(o.userData && o.userData.id) === String(spawnId));
    if (!tgt) {
      log("⚠ Hitbox: spawn nuqta topilmadi", 'lw');
      return;
    }
    const p = tgt.position.clone();
    p.y += 0.5;

    // Remember the entity's pre-teleport position so reverse can restore it
    if (hb && hb.userData) {
      if (!hb.userData._preSpawnPositions) hb.userData._preSpawnPositions = new Map();
      hb.userData._preSpawnPositions.set(entityMesh, entityMesh.position.clone());
    }
    doApply(p);
    log("🚀 Hitbox: spawn ga jo'natildi", 'lok');
  }

  // ── Fade-to-color overlay for cinematic teleport ────────────
  // Half the duration is fade-in (screen goes to color), then the
  // callback fires (teleport happens off-screen), then the other
  // half fades the overlay back out.
  function _fadeTeleport(totalDur, color, midpointCb, onFinish) {
    // Reuse existing overlay if one is somehow lingering
    let ov = document.getElementById('hb-fade-overlay');
    if (ov) ov.remove();

    ov = document.createElement('div');
    ov.id = 'hb-fade-overlay';
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
        try { midpointCb(); } catch(e) { console.warn('[Hitbox] fade cb error:', e); }
      }
      // Start fade-out
      ov.style.opacity = '0';
      // Remove after fade completes (+ small buffer)
      setTimeout(() => {
        if (ov && ov.parentNode) ov.remove();
        if (typeof onFinish === 'function') { try { onFinish(); } catch(e) {} }
      }, half * 1000 + 120);
    }, half * 1000);

    log(`🎞 Hitbox: teleport fade (${totalDur.toFixed(2)}s)`, 'lok');
  }

  // ── HTML overlay teleport ────────────────────────────────────
  function _htmlTeleport(totalDur, htmlContent, midpointCb, onFinish) {
    let ov = document.getElementById('hb-fade-overlay');
    if (ov) ov.remove();

    ov = document.createElement('div');
    ov.id = 'hb-fade-overlay';
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
        try { midpointCb(); } catch(e) { console.warn('[Hitbox] html cb error:', e); }
      }
      ov.style.opacity = '0';
      setTimeout(() => {
        if (ov && ov.parentNode) ov.remove();
        if (typeof onFinish === 'function') { try { onFinish(); } catch(e) {} }
      }, half * 1000 + 120);
    }, half * 1000);

    log(`📄 Hitbox: teleport (HTML, ${totalDur.toFixed(2)}s)`, 'lok');
  }

  // ── Camera-driven pre-teleport (four source modes) ──────────
  //   'spawn'    — camera lerps from current position to a spot above the
  //                spawn point over `totalDur`; teleport at end.
  //   'object'   — camera lerps to a chosen camera object's pose; teleport
  //                at end. Same shape as Camera Animation transition.
  //   'timeline' — activate chosen camera + play Timeline forward; teleport
  //                when Timeline finishes.
  //   'imported' — play imported keyframes on the chosen camera; teleport
  //                when keyframes finish.
  //
  // Reverse mode: fall back to a short fade + reverse restoration.
  function _cameraTeleport(totalDur, entityMesh, spawnId, direction, hb, cfg, onFinish) {
    if (typeof camera === 'undefined') return;

    // Reverse — no forward flight; just a short fade + restore prev pos
    if (direction === 'reverse') {
      _fadeTeleport(totalDur, '#000000',
        () => _teleportInstant(entityMesh, spawnId, direction, hb),
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
      _teleportInstant(entityMesh, spawnId, direction, hb);
      // Optional: deactivate the pre-anim camera so player is back in control
      if (tgtCam && tgtCam.userData) {
        tgtCam.userData._isActive = false;
        tgtCam.visible = !tgtCam.userData._alwaysHidden;
      }
      if (typeof onFinish === 'function') { try { onFinish(); } catch(e) {} }
    };

    // ── Mode: 'spawn' — fly to spawn point (original behavior) ──
    if (source === 'spawn' || (!tgtCam && (source === 'object' || source === 'spawn'))) {
      if (spawnId == null) { log("⚠ Hitbox: spawn nuqta tanlanmagan", 'lw'); return; }
      const tgt = objects.find(o => String(o.userData && o.userData.id) === String(spawnId));
      if (!tgt) { log("⚠ Hitbox: spawn nuqta topilmadi", 'lw'); return; }
      // ⚠ TUZATILDI: ilgari burchak `null` berilardi — kamera spawn
      // nuqtaga uchsa ham, qarashi o'zgarmasdi va o'yinchiga qarab
      // qolgandek ko'rinardi.
      //
      // Endi kamera nishon blokdan ozgina NARIDA to'xtaydi va
      // butun yo'l davomida UNGA qaraydi.
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
      log(`🎥 Hitbox: kamera (obyektga) ${totalDur.toFixed(2)}s`, 'lok');
      return;
    }

    // ── Mode: 'timeline' — activate camera + play global Timeline ──
    if (source === 'timeline') {
      if (typeof TimelineExportSystem === 'undefined' ||
          typeof TimelineSystem === 'undefined' ||
          !TimelineSystem.tracks || TimelineSystem.tracks.length === 0) {
        log("⚠ Hitbox: Timeline bo'sh — fade orqali teleport", 'lw');
        _fadeTeleport(totalDur, '#000000', complete, onFinish);
        return;
      }
      // Activate the target camera so main-loop syncs the real camera to it
      tgtCam.userData._isActive = true;
      tgtCam.visible = false;
      TimelineExportSystem.playTimeline({
        direction: 'forward',
        speed: 1.0,
        onDone: complete,
      });
      log(`🎥 Hitbox: kamera + Timeline ijrosi`, 'lok');
      return;
    }

    // ── Mode: 'imported' — play imported keyframes on the target camera ──
    if (source === 'imported') {
      const kfs = cfg.preAnimKeyframes;
      if (!kfs || kfs.length === 0) {
        log("⚠ Hitbox: imported keyframe yo'q — fade orqali teleport", 'lw');
        _fadeTeleport(totalDur, '#000000', complete, onFinish);
        return;
      }
      if (typeof TimelineExportSystem === 'undefined' ||
          !TimelineExportSystem.playObjectKeyframes) {
        log("⚠ Hitbox: TimelineExportSystem topilmadi", 'lw');
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
      log(`🎥 Hitbox: kamera + imported KF (${kfs.length})`, 'lok');
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

  // ── Save checkpoint at entity's current world position ───────
  function _saveCheckpoint(hb, entityMesh) {
    if (typeof gameState === 'undefined') return;
    gameState.checkpoint = entityMesh.position.clone();
    if (typeof showGameMessage === 'function') {
      showGameMessage("✅ Checkpoint saqlandi", 'var(--accent3)');
    }
    log("✅ Checkpoint (hitbox): " + hb.userData.name, 'lok');
  }

  // ── Play named sound from SoundSystem (global, non-positional) ──
  function _playSound(name) {
    if (typeof SoundSystem === 'undefined' || !SoundSystem.play) return;
    try { SoundSystem.play(name, null, {}); }
    catch(e) { console.warn('[Hitbox] sound error:', e); }
  }

  // ── Sandbox execution for custom logic zone ──────────────────
  function _runCustomLogic(hb, entity, code, direction) {
    if (!code) return;
    try {
      const api = (typeof SCRIPT_API !== 'undefined') ? SCRIPT_API : {};
      const fn  = new Function('entity', 'hitbox', 'api', 'direction', 'THREE', 'scene', 'objects', code);
      fn(entity.ref, hb, api, direction || 'forward', THREE, scene, objects);
    } catch(e) {
      log(`❌ Hitbox custom kod xatosi: ${e.message}`, 'le');
    }
  }

  // ── Fire configured actions for a given phase ────────────────
  //    phase:     'enter' | 'stay' | 'exit'
  //    direction: 'forward' | 'reverse'   (from ReversePlaybackAPI)
  //    reverseSpeed: number   (used only when direction === 'reverse')
  // ── 🖥 HTML sahifa (dialog/quest) ───────────────────────────
  //    Bir vaqtda bitta HTML ko'rsatiladi. Kirganда chiqadi va QOLADI
  //    (chiqib ketilса ham). Boshqa trigger (mode:'show'/'close') yoki
  //    HTML ichidagi tugma `_hbCloseHtmlPage()` uni almashtiradi/yopadi.
  // ============================================================
  //  📄 HTML SAHIFA — chiqish, ushlab turish, klaviatura qulfi
  // ------------------------------------------------------------
  //  ⚠ NEGA `opt` ALOHIDA ARGUMENT: bu funksiyani 🔘 tugma ham,
  //    🎯 hitbox ham, 🔢 MiniPad ham chaqiradi va ularning ba'zisi
  //    faqat ikki argument beradi. Yangi sozlamalarni majburiy
  //    qilsak eski chaqiriqlar `undefined` bilan sinardi.
  //
  //  opt = { ease, dur, hold, lockKeys, bez }
  //    ease     — 'none' | 'smooth' | 'bezier'
  //    dur      — chiqish/ketish animatsiyasi (soniya)
  //    hold     — ekranda necha soniya tursin (0 = cheksiz)
  //    lockKeys — o'yinchi klaviaturasi bloklansinmi
  //    bez      — [x1,y1,x2,y2] (faqat 'bezier' da)
  // ============================================================
  let _htmlHold = null;      // ⏱ avtoyopish taymeri
  let _htmlLock = false;     // ⌨ qulf qo'yilganmi

  const EASES = {
    none:   'linear',
    smooth: 'cubic-bezier(.42,0,.58,1)',
  };

  function _showHtmlPage(content, position, opt) {
    _closeHtmlPage();
    const o = opt || {};
    const ov = document.createElement('div');
    ov.id = 'hb-html-page';
    const pos = position || 'bottom';
    let posCss;
    if (pos === 'top')         posCss = 'left:50%;top:24px;transform:translateX(-50%)';
    else if (pos === 'center') posCss = 'left:50%;top:50%;transform:translate(-50%,-50%)';
    else if (pos === 'full')   posCss = 'inset:0';
    else                       posCss = 'left:50%;bottom:24px;transform:translateX(-50%)';
    // FON YO'Q — faqat joylashuv. Ko'rinishni foydalanuvchi o'z HTML/CSS'i bilan beradi.
    ov.style.cssText = 'position:fixed;z-index:99998;' + posCss;

    // ── 🎞 Chiqish animatsiyasi ──
    const dur = Math.max(0, Number(o.dur) || 0);
    if (dur > 0) {
      const ease = (o.ease === 'bezier' && Array.isArray(o.bez) && o.bez.length === 4)
        ? `cubic-bezier(${o.bez.join(',')})`
        : (EASES[o.ease] || EASES.smooth);
      ov.style.opacity = '0';
      ov.style.transition = `opacity ${dur}s ${ease}`;
      // ⚠ Ikki kadr kutamiz: `appendChild` dan keyin DARHOL
      //   `opacity=1` qo'ysak brauzer ikkala qiymatni bitta
      //   hisobda ko'radi va o'tish umuman chizilmasdi.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = document.getElementById('hb-html-page');
        if (el) el.style.opacity = '1';
      }));
    }
    ov.dataset.dur = String(dur);
    // 🔤 `{random}` — 🔢 MiniPad paroli bilan almashadi.
    //  ⚠ XOM matn eslab qolinadi: parol yangilanganda MiniPad shu
    //    overlay'ni qayta chizadi. Yechilgan matnni saqlasak ikkinchi
    //    almashtirishda `{random}` topilmay, yozuv eskicha qolib
    //    ketardi.
    ov.dataset.pos = pos;
    if (window.MiniPadSystem) {
      try {
        MiniPadSystem.rememberHtml(content || '');
        content = MiniPadSystem.resolve(content || '');
      } catch (e) {}
    }
    ov.innerHTML = content || '';
    document.body.appendChild(ov);

    // ── ⌨ Klaviatura qulfi ──
    //  ⚠ Bayroq `window` da: `player.js` va boshqa tizimlar uni
    //    O'QIYDI. O'z tinglagichimizni qo'ysak, o'yinchi hamon
    //    yuraverardi — uning tinglagichi capture fazasida turadi.
    if (o.lockKeys) { window._htmlKeyLock = true; _htmlLock = true; }

    // ── ⏱ Necha soniya tursin ──
    //  ⚠ 0 = CHEKSIZ. Aks holda dialog o'zi yopilib ketardi va
    //    "yopish" tugmasi bo'lgan sahifalar ishlamas edi.
    const hold = Math.max(0, Number(o.hold) || 0);
    if (hold > 0) {
      _htmlHold = setTimeout(() => { _htmlHold = null; _closeHtmlPage(); }, hold * 1000);
    }
    // HTML ichidagi <script>lar innerHTML orqali ishlamaydi — qo'lda ishga tushiramiz
    ov.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script');
      if (old.src) s.src = old.src; else s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }
  function _closeHtmlPage() {
    if (_htmlHold) { clearTimeout(_htmlHold); _htmlHold = null; }
    // ⚠ Qulf HAR DOIM ochiladi — hatto sahifa allaqachon yo'q
    //   bo'lsa ham. Aks holda bir marta qotib qolgan qulf butun
    //   o'yinni boshqarib bo'lmas holga keltirardi.
    if (_htmlLock) { window._htmlKeyLock = false; _htmlLock = false; }
    const ov = document.getElementById('hb-html-page');
    if (!ov) return;
    const dur = Math.max(0, Number(ov.dataset.dur) || 0);
    if (dur > 0) {
      ov.style.opacity = '0';
      // ⚠ `id` DARHOL olib tashlanadi: keyingi sahifa shu oraliqda
      //   ochilsa, eskisining o'chirish taymeri yangisini o'ldirardi.
      ov.removeAttribute('id');
      setTimeout(() => { try { ov.remove(); } catch (e) {} }, dur * 1000);
      return;
    }
    ov.remove();
  }
  window._hbCloseHtmlPage = _closeHtmlPage;   // HTML ichidagi tugmalar chaqirishi uchun
  window._hbShowHtmlPage  = _showHtmlPage;    // tugma (Interactive Button) ham ishlatishi uchun

  // ── 🎚 Stat-zona: o'yinchi/mashina statlarini o'zgartirish ──────
  let _szBase = null;   // standart (o'yin boshidagi) qiymatlar
  function _szCaptureBase() {
    if (_szBase) return;
    const ps = (typeof playerSettings !== 'undefined') ? playerSettings : null;
    _szBase = ps ? {
      speed:      ps.speed,
      jumpForce:  ps.jumpForce  ?? 10,
      staminaMax: ps.staminaMax ?? 100,
      sprintMult: ps.sprintMult ?? 1.8,
    } : null;
  }
  function _fireStatZone(sz) {
    const ps = (typeof playerSettings !== 'undefined') ? playerSettings : null;
    if (sz.mode === 'reset') {
      if (ps && _szBase) {
        ps.speed      = _szBase.speed;
        ps.jumpForce  = _szBase.jumpForce;
        ps.staminaMax = _szBase.staminaMax;
        ps.sprintMult = _szBase.sprintMult;
      }
      if (typeof objects !== 'undefined') objects.forEach(x => {
        if (x.userData && x.userData._szBaseMaxSpeed !== undefined) {
          const cfg = window._getCarCfg ? window._getCarCfg(x) : x.userData._carCfg;
          if (cfg) cfg.maxSpeed = x.userData._szBaseMaxSpeed;
          delete x.userData._szBaseMaxSpeed;
        }
      });
      log('🎚 Stat-zona: standart holatga qaytdi', 'lok');
      return;
    }
    // mode 'set' — belgilangan qiymatlarni qo'llaymiz (null = o'zgarmaydi)
    _szCaptureBase();
    if (ps) {
      if (sz.pSpeed   != null) ps.speed      = sz.pSpeed;
      if (sz.pJump    != null) ps.jumpForce  = sz.pJump;
      if (sz.pStamina != null) ps.staminaMax = sz.pStamina;
      if (sz.pSprint  != null) ps.sprintMult = sz.pSprint;
    }
    if (sz.cMaxSpeed != null) {
      const car = (typeof activeCar !== 'undefined' && activeCar) ? activeCar : (window.activeCar || null);
      if (car) {
        const cfg = window._getCarCfg ? window._getCarCfg(car) : car.userData._carCfg;
        if (cfg) {
          if (car.userData._szBaseMaxSpeed === undefined) car.userData._szBaseMaxSpeed = cfg.maxSpeed;
          cfg.maxSpeed = sz.cMaxSpeed;
        }
      }
    }
    log('🎚 Stat-zona qo\'llandi', 'lok');
  }
  window._hbResetStatZone = function() {   // play stop tozalash uchun
    if (_szBase) { _fireStatZone({ mode: 'reset' }); _szBase = null; }
  };

  // ── 📝 Matn blokining matnini almashtirish ──────────────────
  //  Reverse rejimda "orqaga" matn (backText) bo'lsa — o'sha qo'yiladi.
  function _fireTextBlock(cfg, direction) {
    if (!cfg || !cfg.targetId) return;
    const tb = objects.find(o => String(o.userData && o.userData.id) === String(cfg.targetId));
    if (!tb || !tb.userData.isTextBlock) {
      log('⚠ Matn bloki topilmadi (id: ' + cfg.targetId + ')', 'lw');
      return;
    }
    const txt = (direction === 'reverse' && cfg.backText) ? cfg.backText : (cfg.text ?? '');
    if (window.TextBlockSystem) TextBlockSystem.setText(tb, txt, cfg.mode || null);
  }
  window._hbFireTextBlock = _fireTextBlock;

  // ── Tugma ham ishlatishi uchun ochamiz ──────────────────────
  // Hitbox va tugma bir xil mantiqni ishlatsin — kod ikkilanmasin.
  window._hbTeleport       = _teleport;          // (entityMesh, spawnId, direction, hb, cfg)
  window._hbStartCameraAnim = _startCameraAnim;  // (cfg, direction, reverseSpeed, hb)

  /**
   * 📡 Boshqa o'yinchidan kelgan tetikni takrorlaydi.
   * ⚠ `_fireActions` QAYTA ISHLATILADI, nusxa emas: ikki yo'l
   *   bo'lsa biri tuzatilib, ikkinchisi eskirib qolardi.
   */
  function mpReplay(hb, m) {
    if (!hb || !hb.userData || !hb.userData.isHitbox) return;
    //  ⚠ `entity` — MAHALLIY o'yinchi emas, `null`: hodisa boshqa
    //    o'yinchiniki va bizning o'yinchimizga kamera yoki qulf
    //    qo'llanmasligi kerak.
    _fireActions(hb, null, m.ph || 'enter', m.dir, m.rs);
  }

  function _fireActions(hb, entity, phase, direction, reverseSpeed) {
    //  📡 E'lon — boshqa o'yinchilar ham ko'rsin (eshik ochildi,
    //  ⚠ platforma yurdi). `fire()` o'zi tekshiradi: takrorlash
    //    paytida yoki ulanmagan bo'lsa jimgina `false` qaytaradi.
    try {
      if (window.MultiplayerSystem && MultiplayerSystem.fire) {
        MultiplayerSystem.fire('hitbox', {
          o: hb.userData.id, ph: phase, dir: direction, rs: reverseSpeed,
        });
      }
    } catch (e) {}

    const a = (hb.userData && hb.userData.actions) || {};
    direction = direction || 'forward';

    // ── 🔢 NoScript — faqat KIRGANDA ─────────────────────────
    //  ⚠ `enter` dan boshqa fazalarda ishlamaydi: `stay` da raqam
    //    har kadr o'sib ketardi, `exit` da esa o'yinchi orqaga
    //    chiqib yana kirib son yig'ib olardi.
    if (phase === 'enter' && window.NoScriptSystem) {
      try { NoScriptSystem.fireFrom(hb); } catch (e) {}
    }
    // ⏱ Auto-timer o'yinchisiz ham ishga tushishi mumkin — entity bo'lmasligi mumkin
    entity = entity || { ref: null, kind: 'auto' };

    // Camera animation — only on enter
    if (a.cameraAnim && a.cameraAnim.enabled && phase === 'enter') {
      _startCameraAnim(a.cameraAnim, direction, reverseSpeed, hb);
    }
    // Spawn redirect — only on enter (o'yinchi kerak)
    if (a.spawnRedirect && a.spawnRedirect.enabled && phase === 'enter' && entity.ref) {
      _teleport(entity.ref, a.spawnRedirect.spawnId, direction, hb, a.spawnRedirect);
    }
    // Checkpoint — only on enter (o'yinchi kerak)
    if (a.checkpoint && a.checkpoint.enabled && phase === 'enter' && entity.ref) {
      _saveCheckpoint(hb, entity.ref);
    }
    // Soundtrack — respect triggerOn preference
    if (a.soundtrack && a.soundtrack.enabled) {
      const wantEnter = a.soundtrack.triggerOn === 'enter' && phase === 'enter';
      const wantExit  = a.soundtrack.triggerOn === 'exit'  && phase === 'exit';
      if (wantEnter || wantExit) _playSound(a.soundtrack.soundName || 'coin');
    }
    // ── 💻 PC BLOK HTML — ekrandagi sahifani almashtirish ─────
    //  Hitboxga kirilganda (yoki chiqilganda) PC ekranidagi HTML kod
    //  boshqasiga o'tadi. `exitHtml` to'ldirilsa — chiqishda eski
    //  sahifaga qaytadi, ya'ni zona ichida bir xil, tashqarisida
    //  boshqacha bo'ladi.
    if (a.pcHtml && a.pcHtml.enabled && a.pcHtml.targetId != null) {
      const PB = window.PCBlockSystem;
      if (PB && PB.setHtml) {
        if (phase === 'enter' && a.pcHtml.html) {
          PB.setHtml(a.pcHtml.targetId, a.pcHtml.html);
          log(`💻 Hitbox: PC HTML almashtirildi`, 'lok');
        } else if (phase === 'exit' && a.pcHtml.exitHtml) {
          PB.setHtml(a.pcHtml.targetId, a.pcHtml.exitHtml);
          log(`💻 Hitbox: PC HTML tiklandi (chiqish)`, 'lok');
        }
      }
    }

    // ── 🔴 FINISH — o'yin tugadi ──────────────────────────────
    //  Hitboxga kirilganda finish bloki ishga tushadi: outro
    //  ko'rsatiladi va (sozlangan bo'lsa) boshqa sahifaga o'tiladi.
    if (a.finishGame && a.finishGame.enabled && phase === 'enter') {
      if (window.StartFinishSystem) StartFinishSystem.finish(a.finishGame.targetId);
      else log('⚠ Finish bloki tizimi topilmadi', 'lw');
    }

    // Timeline playback — plays global timeline or a specific object's track
    if (a.timelinePlay && a.timelinePlay.enabled && phase === 'enter') {
      _fireTimelinePlay(a.timelinePlay, direction, reverseSpeed);
    }
    // Imported animations — one or more parallel keyframe playbacks
    if (a.importedAnimations && a.importedAnimations.enabled && phase === 'enter') {
      _fireImportedAnimations(hb, a.importedAnimations, direction, reverseSpeed);
    }
    // 🎚 Stat-zona — o'yinchi/mashina statlarini o'zgartiradi
    if (a.statZone && a.statZone.enabled && phase === 'enter') {
      _fireStatZone(a.statZone);
    }
    // 🖥 HTML sahifa (dialog/quest) — kirganда ko'rsatiladi yoki yopiladi
    // 👤 O'YINCHI MODELI — kirganda almashadi, chiqqanda (vaqtinchalik) qaytadi
    if (a.playerModel && a.playerModel.enabled && window.PlayerModelSystem) {
      PlayerModelSystem.fire(a.playerModel, phase);
    }

    // 🛤 YO'L (PATH) — hitboxga kirilganda yo'l ishga tushadi
    if (a.path && a.path.enabled && a.path.targetId && phase === 'enter') {
      // Reverse rejimda "orqaga" amali bo'lsa — o'sha bajariladi
      const act = (direction === 'reverse' && a.path.backAction)
        ? a.path.backAction : (a.path.action || 'play');
      if (window.PathSystem) PathSystem.fire(a.path.targetId, act);
    }
    // Hitboxdan CHIQQANDA — alohida amal (ixtiyoriy)
    if (a.path && a.path.enabled && a.path.targetId && phase === 'exit' && a.path.exitAction) {
      if (window.PathSystem) PathSystem.fire(a.path.targetId, a.path.exitAction);
    }

    // 📝 MATN BLOKI — hitboxga kirilganda matn almashadi
    if (a.textBlock && a.textBlock.enabled && phase === 'enter') {
      _fireTextBlock(a.textBlock, direction);
    }
    if (a.htmlPage && a.htmlPage.enabled && phase === 'enter') {
      if (a.htmlPage.mode === 'close') _closeHtmlPage();
      else _showHtmlPage(a.htmlPage.content, a.htmlPage.position, a.htmlPage);
    }
    // Custom logic — on enter (and stay if triggerType is onStay)
    if (a.customLogic && a.customLogic.enabled && (phase === 'enter' || phase === 'stay')) {
      _runCustomLogic(hb, entity, a.customLogic.code, direction);
    }
  }

  // ── Timeline playback dispatch (delegates to TimelineExportSystem) ──
  //    mode 'global' — butun timeline
  //    mode 'object' — faqat tanlangan obyektning treki (masalan Kub)
  // Trekni tanlashда id VA nom birga saqlanadi — nom zaxira bog'lanish
  // (karta obyektlarining id'si har yuklashда o'zgaradi).
  window._hbSetTLTrack = function (id, nm) {
    if (!selectedObj || !selectedObj.userData || !selectedObj.userData.actions) return;
    const tp = selectedObj.userData.actions.timelinePlay;
    if (!tp) return;
    tp.targetTrackId   = id;
    tp.targetTrackName = nm || '';
    updateInspector();
  };

  function _fireTimelinePlay(cfg, direction, reverseSpeed) {
    if (typeof TimelineExportSystem === 'undefined') {
      log("⚠ Hitbox: TimelineExportSystem topilmadi", 'lw');
      return;
    }
    const isReverse = direction === 'reverse';
    const speed = isReverse ? (reverseSpeed || 1.0) : (cfg.speed || 1.0);
    const wantLock = !!cfg.lockPlayer;

    // ── 🔁 IJRO KETYAPTIMI? — qayta kirish TO'XTATADI ─────────
    //  ⚠ ALOMAT: 🔁 loop yoqilgan hitboxga kirilsa animatsiya
    //    mangu aylanardi va uni to'xtatib bo'lmasdi. Qayta kirish
    //    esa IKKINCHI oqim yasardi — obyekt titrab, tezligi ikki
    //    barobar bo'lib ko'rinardi.
    //
    //  ⚠ SABAB: hitbox 🔘 tugmadan farqli o'laroq handle'ni
    //    SAQLAMASDI: `playObjectKeyframes()` chaqirilardi-yu,
    //    natijasi tashlab yuborilardi.
    //
    //  Endi tugmadagi bilan BIR XIL qoida: ijro ketayotgan bo'lsa
    //  qayta kirish uni to'xtatadi (toggle).
    const _ud = hb.userData;
    if (_ud._animHandles && _ud._animHandles.length) {
      // ⚠ Ikki xil xulq — 🔘 tugmadagi bilan BIR XIL qoida:
      //   ⏹ 'stop'    — qayta kirish to'xtatadi (standart)
      //   🔄 'restart' — qayta kirish boshidan boshlaydi
      const _ia = (_ud.actions && _ud.actions.importedAnimations) || {};
      const rt = _ia.loopRetrigger || 'stop';
      _stopHitboxAnims(hb);
      if (rt !== 'restart') {
        log(`■ "${_ud.name || 'Hitbox'}" — animatsiya to'xtatildi`, 'lw');
        return;
      }
      log(`🔄 "${_ud.name || 'Hitbox'}" — boshidan`, 'lok');
    }
    _ud._animHandles = [];

    // ── Mode: 'object' — faqat bitta obyekt trekini o'ynatadi ──
    if (cfg.mode === 'object') {
      if (!TimelineExportSystem.playObjectKeyframes) {
        log("⚠ Hitbox: playObjectKeyframes topilmadi", 'lw');
        return;
      }
      if (typeof TimelineSystem === 'undefined' || !TimelineSystem.tracks) {
        log("⚠ Hitbox: Timeline tizimi topilmadi", 'lw');
        return;
      }
      if (cfg.targetTrackId == null || cfg.targetTrackId === '') {
        log("⚠ Hitbox: Timeline treki tanlanmagan", 'lw');
        return;
      }
      // ⚠ Avval id bo'yicha. Topilmasa — NOM bo'yicha zaxira qidiruv.
      //   Karta obyektlari har yuklashда yangi id oladi, ya'ni id eskirib
      //   qoladi; nom esa ZIP manifestida saqlanadi va o'zgarmaydi.
      let track = TimelineSystem.tracks.find(
        t => String(t.objId) === String(cfg.targetTrackId));
      if (!track && cfg.targetTrackName) {
        track = TimelineSystem.tracks.find(t => t.objName === cfg.targetTrackName);
        if (track) log(`🔗 Hitbox: "${cfg.targetTrackName}" nom bo'yicha topildi (id yangilangan)`, 'lw');
      }
      if (!track || !Array.isArray(track.keyframes) || track.keyframes.length === 0) {
        log("⚠ Hitbox: tanlangan obyektning timeline treki bo'sh", 'lw');
        return;
      }
      // ── 🌌 MAXSUS TREK (Skybox / Weather / Zoom / Filter) ─────
      //  Ular sahna OBYEKTIGA bog'lanmagan (`objRef: null`) —
      //  pastdagi "nishon obyekt" qidiruvi ularni topa olmasdi va
      //  "trek obyekti topilmadi" deb chiqib ketardi. Natijada
      //  skybox rangi timeline panelidan ishlardi-yu, hitboxga
      //  biriktirilsa ishlamasdi.
      if (TimelineExportSystem.isSpecialTrack &&
          TimelineExportSystem.isSpecialTrack(track)) {
        if (wantLock) _engagePlayerLock();
        TimelineExportSystem.playSpecialTrack({
          track,
          direction: isReverse ? 'reverse' : 'forward',
          speed,
          loop: !!track.loop,
          onDone: () => { if (wantLock) _releasePlayerLock(); },
        });
        log(`🎞 Hitbox: '${track.objName}' treki ijro etildi`, 'lok');
        return;
      }

      const target = track.objRef ||
        objects.find(o => String(o.userData && o.userData.id) === String(cfg.targetTrackId));
      if (!target) {
        log("⚠ Hitbox: timeline trek obyekti topilmadi", 'lw');
        return;
      }
      if (wantLock) _engagePlayerLock();
      // ⚠ Handle SAQLANADI — busiz to'xtatib bo'lmasdi.
      //   Loopsiz animatsiya tugagach ro'yxatdan o'zi chiqadi.
      let _h = null;
      _h = TimelineExportSystem.playObjectKeyframes({
        target,
        keyframes: track.keyframes,
        direction: isReverse ? 'reverse' : 'forward',
        speed,
        loop: !!track.loop,
        onDone: () => {
          const i = (_ud._animHandles || []).indexOf(_h);
          if (i >= 0) _ud._animHandles.splice(i, 1);
          if (wantLock) _releasePlayerLock();
        },
      });
      if (_h) _ud._animHandles.push(_h);
      log(`🎞 Hitbox: '${track.objName || 'obyekt'}' timeline treki ijro etildi`, 'lok');
      return;
    }

    // ── Mode: 'global' — butun timeline ──
    if (!TimelineExportSystem.playTimeline) {
      log("⚠ Hitbox: playTimeline topilmadi", 'lw');
      return;
    }
    // Optional player lock for the duration of the Timeline playback
    if (wantLock) _engagePlayerLock();

    TimelineExportSystem.playTimeline({
      direction: isReverse ? 'reverse' : 'forward',
      speed,
      onDone: () => { if (wantLock) _releasePlayerLock(); },
    });
  }

  // ── Imported animations dispatch (multi-slot) ───────────────
  //    Iterates every enabled slot and plays each on its own target.
  //    All slots run in parallel — a cutscene can trigger a door,
  //    a light, and a character walk animation from one hitbox.
  //    Reverse Mode: every slot reverses together.
  //    Lock: if cfg.lockPlayer, engage on first slot and release when
  //          the last active slot completes (counter-based).
  function _fireImportedAnimations(hb, cfg, direction, reverseSpeed) {
    if (typeof TimelineExportSystem === 'undefined' ||
        !TimelineExportSystem.playObjectKeyframes) {
      log("⚠ Hitbox: TimelineExportSystem topilmadi", 'lw');
      return;
    }

    // ── ▶ BUTUN TIMELINE ────────────────────────────────────
    //  ⚠ Ilgari bu ish `timelinePlay` amalining `global` rejimida
    //    edi — ya'ni dizayner IKKI xil joydan bir xil narsani
    //    qidirardi. Endi bitta belgi: "Timelineni boshlash".
    //
    //  ⚠ Slotlar KERAK EMAS: butun timeline har obyektni O'Z treki
    //    bo'yicha yurgizadi. Ikkalasi birga ishlasa bitta obyektga
    //    ikkita oqim tushib, u titrardi.
    if (cfg.playWhole) {
      if (!TimelineExportSystem.playTimeline) {
        log('⚠ Hitbox: playTimeline topilmadi', 'lw'); return;
      }
      const wl = !!cfg.lockPlayer;
      if (wl) _engagePlayerLock();
      try {
        TimelineExportSystem.playTimeline({
          direction: direction === 'reverse' ? 'reverse' : 'forward',
          speed: direction === 'reverse' ? (reverseSpeed || 1) : 1,
          onDone: () => { if (wl) _releasePlayerLock(); },
        });
        log('▶ Hitbox: butun timeline ishga tushdi', 'lok');
      } catch (e) { if (wl) _releasePlayerLock(); }
      return;
    }

    if (!cfg.slots || cfg.slots.length === 0) return;

    // ── 🔁 Ijro ketyaptimi? ─────────────────────────────────
    //  ⚠ Ilgari eskisi SHARTSIZ to'xtatilib, yangisi darhol
    //    boshlanardi — ya'ni loop rejimida qayta kirish HECH
    //    QANDAY farq qilmasdi: u har doim "boshidan" edi va
    //    to'xtatishning iloji yo'q edi.
    //
    //  Endi dizayner tanlaydi:
    //    ⏹ 'stop'    — qayta kirish TO'XTATADI (standart)
    //    🔄 'restart' — qayta kirish BOSHIDAN boshlaydi
    const _prev = hb.userData._importAnimHandles;
    if (Array.isArray(_prev) && _prev.length) {
      _prev.forEach(h => { if (h && h.stop) { try { h.stop(); } catch (e) {} } });
      hb.userData._importAnimHandles = [];
      try { _releasePlayerLock(); } catch (e) {}
      if ((cfg.loopRetrigger || 'stop') !== 'restart') {
        log(`■ "${hb.userData.name || 'Hitbox'}" — animatsiya to'xtatildi`, 'lw');
        return;
      }
      log(`🔄 "${hb.userData.name || 'Hitbox'}" — boshidan`, 'lok');
    }
    hb.userData._importAnimHandles = [];

    const isReverse = direction === 'reverse';
    const wantLock  = !!cfg.lockPlayer;
    let activeCount = 0;
    let fired = 0, skipped = 0;

    // Called when a slot completes; when the count reaches 0, release the lock
    const onSlotDone = (h) => {
      const arr = hb.userData._importAnimHandles;
      if (Array.isArray(arr)) {
        const i = arr.indexOf(h);
        if (i >= 0) arr.splice(i, 1);
      }
      activeCount--;
      //  ⏭ GALMA-GAL: bittasi tugadi — navbatdagisini boshlaymiz.
      //  ⚠ `_playSlot` QAYTA ISHLATILADI, nusxa emas: ikki xil yo'l
      //    bo'lsa biri tuzatilib, ikkinchisi eskirib qolardi.
      if (_seqQueue && _seqQueue.length) {
        const nx = _seqQueue.shift();
        try { _playOneSlot(nx, -1, true); } catch (e) {}
        return;
      }
      if (wantLock && activeCount <= 0) _releasePlayerLock();
    };

    // ============================================================
    //  🎬 SLOT REJIMI — 🔘 tugma bilan bir xil tanlov
    // ------------------------------------------------------------
    //  'all'        — HAMMASI BIRDAN (standart, eski xulq)
    //  'sequential' — GALMA-GAL: 1-slot tugagach 2-si boshlanadi
    //  'each'       — HAR KIRGANDA keyingisi (1-kirish → 1, 2 → 2 …)
    //
    //  ⚠ Standart 'all' — ESKI SAHNALAR uchun. Boshqa qiymat qilsak
    //    mavjud loyihalarda animatsiya boshqacha ishlab ketardi.
    const slotMode = cfg.slotMode || 'all';

    //  ⚠ GALMA-GAL uchun `onDone` zanjiri kerak: keyingisi oldingisi
    //    TUGAGANDA boshlanadi. Vaqt bo'yicha kutish (`setTimeout`)
    //    noto'g'ri bo'lardi — tezlik va `loop` uni buzib yuborardi.
    let _seqQueue = null;
    if (slotMode === 'sequential') _seqQueue = [];

    //  ⚠ HAR KIRGANDA: hisoblagich hitboxda saqlanadi va ⏹ Stop da
    //    nolga qaytadi (`_playSlotIdx`). `_` bilan — sahna emas,
    //    o'yin borishi.
    let _eachIdx = -1;
    if (slotMode === 'each') {
      const n = cfg.slots.filter(x => x.keyframes && x.keyframes.length).length;
      hb.userData._playSlotIdx = ((hb.userData._playSlotIdx | 0) % Math.max(1, n));
      _eachIdx = hb.userData._playSlotIdx;
      hb.userData._playSlotIdx = (_eachIdx + 1) % Math.max(1, n);
    }
    let _liveIdx = -1;      // key'i bor slotlar bo'yicha tartib

    //  ⚠ SLOT IJROSI ALOHIDA FUNKSIYADA: ⏭ galma-gal rejimida
    //    keyingisi `onSlotDone` dan chaqiriladi va u yerda AYNAN shu
    //    mantiq kerak. Nusxa qilsak biri tuzatilib, ikkinchisi
    //    eskirib qolardi.
    //  ⚠ `queued` — navbatdan kelganmi. Shunda u qayta navbatga
    //    tushmaydi (aks holda cheksiz halqa bo'lardi).
    function _playOneSlot(slot, idx, queued) {

      if (!slot.keyframes || slot.keyframes.length === 0) {
        skipped++; return;
      }
      // ── 🎨 MAXSUS TREK (filtr · ob-havo · skybox · kino · zoom) ──
      //  Ular butun SAHNAGA ta'sir qiladi, ya'ni nishon obyekti yo'q.
      //  ⚠ Ilgari bu yerda `if (!target) { … skipped++; return; }`
      //    turardi va filtr slotini QO'YIB BO'LSA HAM u jimgina
      //    o'tkazib yuborilardi — foydalanuvchi "filtrdagi key
      //    ishlamayapti" deb ko'rardi.
      const kind = slot.trackKind || null;
      const target = kind ? null : objects.find(o =>
        String(o.userData && o.userData.id) === String(slot.targetObjectId));
      if (!kind && !target) {
        log(`⚠ Slot ${idx + 1} (${slot.sourceName || 'noma\'lum'}): ` +
            `maqsad obyekt topilmadi`, 'lw');
        skipped++; return;
      }

      const speed = isReverse ? (reverseSpeed || 1.0) : (slot.speed || 1.0);

      // 🔊 Slot musiqasi — animatsiya bilan BIRGA
      //  ⚠ `Audio` nusxasi slotda KESHLANADI: har ijroda yangisini
      //    yasasak, tez-tez ishga tushirilganda o'nlab ovoz obyekti
      //    to'planib xotirani yeb qo'yardi.
      if (slot.soundUrl) {
        try {
          if (!slot._audio) { slot._audio = new Audio(slot.soundUrl); slot._audio.volume = 0.9; }
          slot._audio.currentTime = 0;
          slot._audio.play().catch(() => {});
        } catch (e) {}
      }

      _liveIdx++;
      //  🔁 HAR KIRGANDA — faqat navbatdagi slot ishlaydi.
      if (slotMode === 'each' && _liveIdx !== _eachIdx) { skipped++; return; }

      //  ⏭ GALMA-GAL — birinchisidan boshqasi NAVBATGA tushadi.
      if (slotMode === 'sequential' && _liveIdx > 0 && !queued) {
        _seqQueue.push(slot);
        return;
      }

      activeCount++;
      const h = TimelineExportSystem.playObjectKeyframes({
        target,
        trackKind: kind,        // 🎨 maxsus trek turi (bo'lsa)
        //  💻🎨 Egasining id si — busiz trek qaysi obyektga
        //  tegishini bilmasdi.
        pcId: slot.trackPcId ?? null,
        keyframes: slot.keyframes,
        direction: isReverse ? 'reverse' : 'forward',
        speed,
        loop: !!slot.loop,
        blocks: Array.isArray(slot.blocks) ? slot.blocks : [],
        onDone: () => onSlotDone(h),
      });
      if (h) {
        hb.userData._importAnimHandles.push(h);
        fired++;
      } else {
        // Handle creation failed — don't count it as active
        activeCount--;
      }
    }

    cfg.slots.forEach((slot, idx) => _playOneSlot(slot, idx, false));

    if (fired > 0) {
      // Engage lock only after we've confirmed at least one slot actually fired
      if (wantLock) _engagePlayerLock();
      log(`🎞 Hitbox: ${fired} animatsiya boshlandi` +
          (skipped ? ` (${skipped} o'tkazildi)` : ''), 'lok');
    }
  }

  // ── Umumiy payload ijrosi (tracks + sounds + imports) ────────
  //    handlesKey — import handle'lari saqlanadigan userData kaliti
  //    (timer va sceneZip alohida saqlaydi).
  function _firePayload(hb, payload, direction, reverseSpeed, handlesKey) {
    if (!payload) return;
    const isReverse = direction === 'reverse';
    const TES = (typeof TimelineExportSystem !== 'undefined') ? TimelineExportSystem : null;

    // 1) Timeline obyekt treklari
    if (TES && TES.playObjectKeyframes && Array.isArray(payload.tracks) && payload.tracks.length &&
        typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) {
      payload.tracks.forEach(tid => {
        if (tid == null || tid === '') return;
        const track = TimelineSystem.tracks.find(t => String(t.objId) === String(tid));
        if (!track || !Array.isArray(track.keyframes) || !track.keyframes.length) {
          log("⚠ Payload: timeline treki bo'sh yoki topilmadi", 'lw'); return;
        }
        const target = track.objRef ||
          objects.find(o => String(o.userData && o.userData.id) === String(tid));
        if (!target) { log("⚠ Payload: trek obyekti topilmadi", 'lw'); return; }
        TES.playObjectKeyframes({
          target, keyframes: track.keyframes,
          direction: isReverse ? 'reverse' : 'forward',
          speed: isReverse ? (reverseSpeed || 1) : 1,
          loop: !!track.loop,
        });
      });
    }

    // 2) Musiqa / ovozlar
    if (Array.isArray(payload.sounds)) {
      payload.sounds.forEach(sn => { if (sn) _playSound(sn); });
    }

    // 3) File orqali import qilingan animatsiyalar
    if (TES && TES.playObjectKeyframes && Array.isArray(payload.imports) && payload.imports.length) {
      const key = handlesKey || '_importAnimHandles';
      if (!Array.isArray(hb.userData[key])) hb.userData[key] = [];
      hb.userData[key].forEach(h => { if (h && h.stop) { try { h.stop(); } catch(e) {} } });
      hb.userData[key] = [];
      payload.imports.forEach(slot => {
        if (!slot || !Array.isArray(slot.keyframes) || !slot.keyframes.length) return;
        const target = objects.find(o =>
          String(o.userData && o.userData.id) === String(slot.targetObjectId));
        if (!target) { log("⚠ Payload import: maqsad obyekt topilmadi", 'lw'); return; }
        const h = TES.playObjectKeyframes({
          target, keyframes: slot.keyframes,
          direction: isReverse ? 'reverse' : 'forward',
          speed: isReverse ? (reverseSpeed || 1) : (slot.speed || 1),
          loop: !!slot.loop,
        });
        if (h) hb.userData[key].push(h);
      });
    }
  }

  // ── ⏱ Timer'ning O'Z payload'i (tracks + sounds + imports) ───
  function _fireTimerPayload(hb, tm, direction, reverseSpeed) {
    _firePayload(hb, tm, direction, reverseSpeed, '_timerImportHandles');
  }

  // ── Block-mode collider management ───────────────────────────
  // When a hitbox is in 'block' mode, we add a static Rapier collider
  // during play, so the entity physically cannot pass through it.
  // Detection then uses a padded AABB so the trigger fires on contact.
  function _addBlockCollider(hb) {
    if (hb.userData._blockColliderAdded) return;
    if (typeof addPhysicsBody !== 'function') return;
    try {
      addPhysicsBody(hb, { isStatic: true });
      hb.userData._blockColliderAdded = true;
    } catch(e) {
      log("⚠ Hitbox block collider qo'shilmadi: " + e.message, 'lw');
    }
  }

  function _removeBlockCollider(hb) {
    if (!hb.userData._blockColliderAdded) return;
    if (typeof removeRapierBody !== 'function') return;
    try {
      removeRapierBody(hb);
    } catch(e) {}
    hb.userData._blockColliderAdded = false;
  }

  // Runtime helper — user can toggle collisionMode while playing
  // and the collider is added/removed on the fly.
  function _syncBlockCollider(hb) {
    const shouldBeBlock = hb.userData.collisionMode === 'block';
    const isBlock       = !!hb.userData._blockColliderAdded;
    if (shouldBeBlock && !isBlock) _addBlockCollider(hb);
    else if (!shouldBeBlock && isBlock) _removeBlockCollider(hb);
  }

  // ── Play-state transitions ───────────────────────────────────
  let _wasPlayingLastFrame = false;
  let _lastPlayerHb = null;   // {hb, ent, direction, rSpeed} — respawn restart uchun

  // Respawn'da oxirgi kirilgan hitbox animatsiyasini QAYTA boshlaydi.
  // ObjectRoleSystem (damage roli) chaqiradi.
  function refireLastPlayerAnim() {
    if (!_lastPlayerHb || !_lastPlayerHb.hb || !_lastPlayerHb.hb.parent) return false;
    const { hb, ent, direction, rSpeed } = _lastPlayerHb;
    // Har qanday davom etayotgan import-animatsiyani to'xtatib, boshidan qo'yamiz
    if (Array.isArray(hb.userData._importAnimHandles)) {
      hb.userData._importAnimHandles.forEach(h => { if (h && h.stop) { try { h.stop(); } catch(e){} } });
      hb.userData._importAnimHandles = [];
    }
    try { _fireActions(hb, ent, 'enter', direction || 'forward', rSpeed || 1); } catch(e) {}
    return true;
  }
  /**
   * 🔢 NoScript uchun: hitboxni O'YINCHISIZ ishga tushiradi.
   *
   * ⚠ NEGA KERAK: hitbox odatda o'yinchi KIRGANDA otiladi. NoScript
   *   esa "son 100 ga yetdi" degan holatда uni o'zi ishga tushirishi
   *   kerak — o'yinchi u yerda bo'lmasa ham.
   *
   * ⚠ `entity` `null` bo'lishi mumkin: hitbox amallari uni faqat
   *   o'yinchiga tegishli ishlarda (kamera, teleport) ishlatadi va
   *   ularning har biri o'zi tekshiradi.
   */
  /**
   * ■ Hitbox animatsiyalarini to'xtatadi.
   * ⚠ O'yinchi qulfi ham OCHILADI: aks holda to'xtatilgan
   *   animatsiya o'yinchini mangu qulflab qo'yardi.
   */
  function _stopHitboxAnims(hb) {
    const ud = hb && hb.userData;
    if (!ud) return 0;
    const n = (ud._animHandles || []).length;
    (ud._animHandles || []).forEach(h => { try { h && h.stop && h.stop(); } catch (e) {} });
    ud._animHandles = [];
    try { _releasePlayerLock(); } catch (e) {}
    return n;
  }
  window._hbStopAnims = _stopHitboxAnims;

  function forceFire(hb, direction) {
    if (!hb || !hb.userData || !hb.userData.isHitbox) return false;
    const ent = (typeof PlayerController !== 'undefined' && PlayerController.obj)
      ? PlayerController.obj : null;
    try { _fireActions(hb, ent, 'enter', direction || 'forward', 1); }
    catch (e) { return false; }
    return true;
  }
  window._hbForceFire = forceFire;

  function _onPlayStart() {
    objects.forEach(o => {
      if (!o.userData || !o.userData.isHitbox) return;
      if (o.userData.collisionMode === 'block') _addBlockCollider(o);
      // ⏱ Timer runtime holatini reset qilamiz
      const tm = o.userData.actions && o.userData.actions.timer;
      o.userData._timerT       = 0;
      o.userData._timerDone    = false;
      o.userData._timerPending = null;
      // auto rejim play boshlanishida darrov armlanadi (o'yinchi kutmaydi)
      o.userData._timerArmed   = !!(tm && tm.enabled && tm.auto);
      // 📦 Scene ZIP auto-fire flag (o'yin boshlanganda bir marta)
      o.userData._sceneZipAutoFired = false;
      // 📦 Predmet sharti runtime holati
      o.userData._irDone  = false;
      o.userData._irWasIn = false;
      // 🔍 Diagnostika yozuvlari — har Play da qaytadan
      o.userData._irLog   = null;
    });
  }
  function _onPlayStop() {
    _closeHtmlPage();   // 🖥 HTML sahifani (dialog) yopamiz
    _irRestoreConsumed();   // 📦 yo'q qilingan predmetlarni qaytaramiz
    if (window._hbResetStatZone) window._hbResetStatZone();   // 🎚 statlarni standartga qaytaramiz
    objects.forEach(o => {
      if (!o.userData || !o.userData.isHitbox) return;
      _removeBlockCollider(o);
      //  🔁 \"Har kirganda keyingisi\" hisoblagichi — ⏹ Stop da
      //     BOSHIDAN. Busiz keyingi sinov o'rtadan boshlanardi va
      //     dizayner \"nega 1-slot ishlamadi?\" deb o'ylardi.
      delete o.userData._playSlotIdx;
      // Clear per-play state
      if (o.userData._entitiesInside)    o.userData._entitiesInside.clear();
      if (o.userData._preSpawnPositions) o.userData._preSpawnPositions.clear();
      // ⏱ Timer holatini tozalaymiz
      o.userData._timerArmed   = false;
      o.userData._timerDone    = false;
      o.userData._timerT       = 0;
      o.userData._timerPending = null;
      // 📦 Predmet sharti holati
      o.userData._irDone  = false;
      o.userData._irWasIn = false;
      o.userData._irLog   = null;
      // Stop every in-flight imported-animation playback
      if (Array.isArray(o.userData._importAnimHandles)) {
        o.userData._importAnimHandles.forEach(h => {
          if (h && h.stop) { try { h.stop(); } catch(e) {} }
        });
        o.userData._importAnimHandles = [];
      }
      // Stop timer's own imported-animation playbacks
      if (Array.isArray(o.userData._timerImportHandles)) {
        o.userData._timerImportHandles.forEach(h => {
          if (h && h.stop) { try { h.stop(); } catch(e) {} }
        });
        o.userData._timerImportHandles = [];
      }
      // Stop Scene ZIP imported-animation playbacks
      if (Array.isArray(o.userData._sceneZipHandles)) {
        o.userData._sceneZipHandles.forEach(h => {
          if (h && h.stop) { try { h.stop(); } catch(e) {} }
        });
        o.userData._sceneZipHandles = [];
      }
    });
    _camAnim.active = false;
    window._hbCamBusy = false;   // ⚠ bayroq qotib qolmasin — car.js kamerani qaytara olsin
    _lastPlayerHb = null;
    _releasePlayerLock();
    // Safety net — restore any player meshes we may have hidden mid-animation
    if (Array.isArray(_camAnim._hiddenMeshes)) {
      _camAnim._hiddenMeshes.forEach(({ mesh, wasVisible }) => {
        if (mesh) mesh.visible = wasVisible;
      });
      _camAnim._hiddenMeshes = null;
    }
    // Clean up any lingering fade overlay
    const ov = document.getElementById('hb-fade-overlay');
    if (ov) ov.remove();
  }

  // ── Per-frame update ─────────────────────────────────────────
  function update(delta) {
    const nowPlaying = typeof isPlaying !== 'undefined' && isPlaying;

    // Detect play-state transitions
    if (nowPlaying && !_wasPlayingLastFrame)       _onPlayStart();
    else if (!nowPlaying && _wasPlayingLastFrame)  _onPlayStop();
    _wasPlayingLastFrame = nowPlaying;

    if (!nowPlaying) return;

    _updateCameraAnim(delta);

    // 💨 Yutilgan predmetlar yashirin turishini tasdiqlaymiz
    //    (izohi `_irEnforceConsumed` da).
    _irEnforceConsumed();

    const entities = _collectEntities();
    if (entities.length === 0) return;

    for (let i = 0, n = objects.length; i < n; i++) {
      const hb = objects[i];
      if (!hb.userData || !hb.userData.isHitbox) continue;
      // ⚠ Map Loader yashirganда — bu hitbox endi "yo'q".
      //   Bayroqsiz u ko'rinmasa ham o'yinchini tetiklashda davom etardi.
      //   ⚠ `_mlHidden` — ESKI sahna uchun; KARTA obyektlari
      //     `_mlMapHidden` bilan belgilanardi va bu qorovulga
      //     TUSHMASDI. Endi ikkala yo'l ham `_mlOff` qo'yadi.
      if (hb.userData._mlOff || hb.userData._mlHidden) continue;

      // Hide hitbox visual during play (savedStates restore it on stop)
      if (hb.visible) hb.visible = false;

      // Keep block collider in sync if user toggled collisionMode
      // while play was already running.
      _syncBlockCollider(hb);

      // ⏱ Timer — kechikish/auto ishga tushirish sanog'i
      const _tm = hb.userData.actions && hb.userData.actions.timer;
      if (_tm && _tm.enabled && hb.userData._timerArmed && !hb.userData._timerDone) {
        hb.userData._timerT = (hb.userData._timerT || 0) + delta;
        if (hb.userData._timerT >= (_tm.delay || 0)) {
          hb.userData._timerArmed = false;
          if (_tm.auto) hb.userData._timerDone = true;   // auto — faqat bir marta
          const p = hb.userData._timerPending;
          hb.userData._timerPending = null;
          const fEnt = p ? p.ent
            : (entities.find(e => e.kind === 'player') || { ref: null, kind: 'auto' });
          _fireActions(hb, fEnt, 'enter', p ? p.dir : 'forward', p ? p.rSpeed : 1);
          // Timer'ning o'z payload'i (tracks + sounds + imports)
          _fireTimerPayload(hb, _tm, p ? p.dir : 'forward', p ? p.rSpeed : 1);
        }
      }

      const inside = hb.userData._entitiesInside || (hb.userData._entitiesInside = new Set());
      const trig   = hb.userData.triggerType || 'onEnter';
      const mode   = hb.userData.collisionMode || 'inline';
      const hitTest = (mode === 'block') ? _pointNear : _pointInside;

      // ── 📦 PREDMET SHARTI ────────────────────────────────────
      //  `_irGate` — oddiy (o'yinchi kirishi) yo'li ochiqmi.
      //  'deliver' rejimida bu yo'l DOIM yopiq: tetik predmetning
      //  o'zi zonaga tushganda otiladi, o'yinchi qayerda bo'lishidan
      //  qat'i nazar.
      const ir   = hb.userData.itemReq;
      const irOn = !!(ir && ir.enabled && ir.itemId != null && ir.itemId !== '');
      let _irGate = true;
      if (irOn) {
        const item = _irFindItem(ir.itemId);
        const spent = !!hb.userData._irDone && ir.once !== false;
        // ── 🔍 DIAGNOSTIKA ────────────────────────────────────────
        //  Predmet sharti ko'p qismdan iborat (topish · rejim · qo'lda
        //  ushlash · zona · bir martalik). Biror joyi jim to'xtasa,
        //  tashqaridan qaysi biri ekanini BILIB BO'LMASDI — konsolda
        //  hech nima chiqmasdi. Har holat bir MARTA yoziladi
        //  (`_irLog`), aks holda har kadrda konsolni to'ldirardi.
        const _irSay = (key, msg, cls) => {
          const seen = hb.userData._irLog || (hb.userData._irLog = {});
          if (seen[key]) return;
          seen[key] = true;
          if (typeof log === 'function') log(msg, cls || 'lw');
        };
        if (!item) {
          _irSay('nofind',
            `⚠ 📦 "${hb.userData.name}": kerakli predmet topilmadi (id: ${ir.itemId}). ` +
            `O'chirilgan bo'lishi mumkin — shartni qayta tanlang.`, 'le');
        } else if (spent) {
          _irSay('spent',
            `📦 "${hb.userData.name}": predmet sharti allaqachon bajarilgan ` +
            `("Bir marta" yoqiq) — qayta ishlamaydi.`);
        }
        if (!item || spent) {
          _irGate = false;
        } else if ((ir.mode || 'carry') === 'deliver') {
          _irGate = false;
          // Zonada + qo'lda EMAS  →  tashlangan/otilgan holat.
          // ⚠ `!_irHeld` SHART: predmetni ushlab kirib turish yetarli emas.
          const held   = _irHeld(item);
          const inZone = !held && item.visible && hitTest(hb, _irPos(item));
          if (held) {
            _irSay('held',
              `📦 "${hb.userData.name}": rejim 🎯 TASHLASA — predmetni QO'LDA ` +
              `ushlab kirish hisoblanmaydi, uni zonaga tashlang.`);
          }
          if (inZone && !hb.userData._irWasIn) {
            const pEnt = entities.find(e => e.kind === 'player') || { ref: null, kind: 'auto' };
            hb.userData._irDone = true;
            _fireActions(hb, pEnt, 'enter', _irDir(hb, 'enter'),
                         (hb.userData.reverseMode && hb.userData.reverseMode.reverseSpeed) || 1);
            if ((ir.onDone || 'consume') === 'consume') {
              _irConsume(item);
              _irSay('fired', `📦 "${hb.userData.name}" ishladi — 💨 "${item.userData.name}" yo'qoldi.`, 'lok');
            } else {
              _irSay('fired', `📦 "${hb.userData.name}" ishladi — 📌 "${item.userData.name}" joyida qoldi.`, 'lok');
            }
          }
          hb.userData._irWasIn = inZone;
        } else {
          // 'carry' — predmet o'yinchi qo'lida bo'lsa yo'l ochiq
          _irGate = _irHeld(item);
          if (!_irGate) {
            _irSay('nothold',
              `📦 "${hb.userData.name}": rejim ✋ QO'LIDA — "${item.userData.name}" ` +
              `o'yinchi qo'lida emas, shuning uchun kutilmoqda.`);
          }
        }
      }

      for (let j = 0; j < entities.length; j++) {
        const ent = entities[j];
        const wasInside = inside.has(ent.ref);
        const isInsideNow = hitTest(hb, ent.ref.position);

        // Resolve activation direction via ReversePlaybackAPI (only if enabled)
        const rev = hb.userData.reverseMode;
        const hbKey = 'hb_' + hb.userData.id;
        const dirFor = (phase) => {
          if (!rev || !rev.enabled) return 'forward';
          // Only advance the counter on `enter` transitions (or `exit` for onExit),
          // so a single activation = one direction change.
          if (typeof ReversePlaybackAPI === 'undefined') return 'forward';
          if (phase === 'enter' || phase === 'exit') {
            ReversePlaybackAPI.register(hbKey, { resetOnLoad: rev.resetOnLoad !== false });
            return ReversePlaybackAPI.nextDirection(hbKey);
          }
          // For 'stay' phase, peek without advancing (all stay-frames share direction)
          return (typeof ReversePlaybackAPI.peekDirection === 'function')
            ? ReversePlaybackAPI.peekDirection(hbKey) : 'forward';
        };
        const rSpeed = (rev && rev.reverseSpeed) ? rev.reverseSpeed : 1.0;

        if (isInsideNow && !wasInside) {
          inside.add(ent.ref);
          // 📦 Predmet sharti bajarilmagan — kirish QAYD etiladi (chiqish
          //    hisoblanishi buzilmasin), lekin hech narsa otilmaydi va
          //    Reverse Playback hisoblagichi ham surilmaydi.
          if (!_irGate) continue;
          const _enterDir = dirFor('enter');   // bir marta hisoblanadi
          // Oyinchi qaysi hitboxga oxirgi kirganini eslab qolamiz —
          // respawn'da "oxirgi hitbox animatsiyasini qayta boshlash" uchun.
          if (ent.kind === 'player') {
            _lastPlayerHb = { hb, ent, direction: _enterDir, rSpeed };
          }
          // OnEnter and OnStay both fire on enter transition.
          if (trig === 'onEnter' || trig === 'onStay') {
            if (_tm && _tm.enabled) {
              if (_tm.auto) {
                // auto — faqat timer ishga tushiradi; o'yinchi kirishi e'tiborsiz
              } else if (!hb.userData._timerArmed && !hb.userData._timerDone) {
                // kechikish (delay) — fitil yoqiladi, _timerT tugagach otiladi
                hb.userData._timerArmed   = true;
                hb.userData._timerT       = 0;
                hb.userData._timerPending = { ent, dir: _enterDir, rSpeed };
              }
            } else {
              _fireActions(hb, ent, 'enter', _enterDir, rSpeed);
            }
          }
          // 📦 'carry' — predmat bilan kirdi: belgilaymiz va (kerak bo'lsa)
          //    predmetni yo'q qilamiz. Timer yoqilgan bo'lsa ham shu yerda:
          //    predmet DARHOL olinadi, animatsiya kechikib chiqadi.
          if (irOn && (ir.mode || 'carry') === 'carry' && ent.kind === 'player') {
            hb.userData._irDone = true;
            const _it = _irFindItem(ir.itemId);
            if ((ir.onDone || 'consume') === 'consume') {
              _irConsume(_it);
              if (typeof log === 'function' && _it) {
                log(`📦 "${hb.userData.name}" ishladi — 💨 "${_it.userData.name}" yo'qoldi.`, 'lok');
              }
            } else if (typeof log === 'function' && _it) {
              log(`📦 "${hb.userData.name}" ishladi — 📌 "${_it.userData.name}" joyida qoldi.`, 'lok');
            }
          }
        } else if (!isInsideNow && wasInside) {
          inside.delete(ent.ref);
          if (!_irGate) continue;
          if (trig === 'onExit') {
            _fireActions(hb, ent, 'exit', dirFor('exit'), rSpeed);
          } else if (trig === 'onEnter' || trig === 'onStay') {
            // Fire soundtrack-on-exit even for non-onExit triggers,
            // because the user may want music to stop on leave.
            const s = hb.userData.actions && hb.userData.actions.soundtrack;
            if (s && s.enabled && s.triggerOn === 'exit') _playSound(s.soundName || 'coin');
            // 👤⏱ VAQTINCHALIK model — chiqqanda O'ZIGA QAYTADI.
            //   ⚠ Bu 'onEnter' tetigida ham ishlashi SHART. Ilgari chiqish
            //     faqat 'onExit' da hisoblanardi, shuning uchun standart
            //     sozlamada model kirganda almashib, HECH QACHON qaytmasdi —
            //     "vaqtinchalik" amalda "doimiy" bo'lib qolardi.
            const pm = hb.userData.actions && hb.userData.actions.playerModel;
            if (pm && pm.enabled && (pm.mode || 'temp') === 'temp' && window.PlayerModelSystem) {
              PlayerModelSystem.fire(pm, 'exit');
            }
          }
        } else if (isInsideNow && trig === 'onStay') {
          if (!_irGate) continue;
          _fireActions(hb, ent, 'stay', dirFor('stay'), rSpeed);
        }
      }
    }
  }

  // ── Cleanup helper (call before scene reload / delete) ───────
  function clearAllRuntime() {
    objects.forEach(o => {
      if (o.userData && o.userData.isHitbox) {
        if (o.userData._entitiesInside)     o.userData._entitiesInside.clear();
        if (o.userData._preSpawnPositions)  o.userData._preSpawnPositions.clear();
        // Stop every in-flight imported-animation playback
        if (Array.isArray(o.userData._importAnimHandles)) {
          o.userData._importAnimHandles.forEach(h => {
            if (h && h.stop) { try { h.stop(); } catch(e) {} }
          });
          o.userData._importAnimHandles = [];
        }
        // Do NOT clear _camOrigin here — user may just be replaying the level.
      }
    });
    _camAnim.active = false;
    window._hbCamBusy = false;   // ⚠ bayroq qotib qolmasin — car.js kamerani qaytara olsin
    // Reset reverse-mode counters on scene reload
    if (typeof ReversePlaybackAPI !== 'undefined' && ReversePlaybackAPI._resetAllOnLoad) {
      ReversePlaybackAPI._resetAllOnLoad();
    }
  }

  return {
    create,
    update,
    syncSize,
    mpReplay,        // 📡 multiplayer: kelgan tetikni takrorlaydi
    restoreVisual,   // prefab/sahna yuklashda ko'rinishni tiklaydi
    clearAllRuntime,
    // exposed for save/load
    _defaultData,
    _fireActions,
    // exposed for ObjectRoleSystem (respawn animation restart)
    refireLastPlayerAnim,
    getLastPlayerHitbox: () => (_lastPlayerHb ? _lastPlayerHb.hb : null),
  };
})();

window.HitboxSystem = HitboxSystem;

// ============================================================
// PUBLIC ENTRY: add-object menu / asset grid handler
// ============================================================
window.addHitboxObject = function() {
  // Spawn a bit in front of the current camera so it's visible
  let pos = new THREE.Vector3(0, 1, 0);
  if (typeof camera !== 'undefined' && camera) {
    const forward = new THREE.Vector3(0, 0, -3).applyQuaternion(camera.quaternion);
    pos = camera.position.clone().add(forward);
    if (pos.y < 1) pos.y = 1;
  }
  return HitboxSystem.create(pos);
};

// ============================================================
// INSPECTOR PANEL — buildHitboxInspector
// Called from updateInspector() (see inspector.js dispatch)
//
// Uses existing CSS classes for a consistent look:
//   .comp-block   .comp-title   .tag
//   .fr .fl .xyzr .xi .xl
//   .action-btn   .del-btn
// ============================================================
function buildHitboxInspector(o) {
  const ic = $('inspector-content');
  if (!ic) return;

  const ud = o.userData;
  const p  = o.position;
  const s  = ud.hitboxSize || { x: 2, y: 2, z: 2 };
  const a  = ud.actions    || {};
  const rev = ud.reverseMode || { enabled: false, reverseSpeed: 1.0, resetOnLoad: true };

  // Build <select> options for scene objects (optional filter)
  const objOpts = (currentId, filter) => {
    let html = '<option value="">— Yo\'q —</option>';
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj === o) continue;
      if (!obj.userData || obj.userData.id == null) continue;
      if (filter && !filter(obj)) continue;
      const isSel = String(obj.userData.id) === String(currentId) ? ' selected' : '';
      html += `<option value="${obj.userData.id}"${isSel}>#${obj.userData.id} ${obj.userData.name || ''}</option>`;
    }
    return html;
  };

  // Sound options from SoundSystem.library
  const buildSoundOpts = (curName) => {
    if (typeof SoundSystem === 'undefined' || !SoundSystem.library) {
      return `<option value="${curName || 'coin'}">${curName || 'coin'}</option>`;
    }
    let html = '';
    Object.keys(SoundSystem.library).forEach(n => {
      const isSel = n === (curName || 'coin') ? ' selected' : '';
      html += `<option value="${n}"${isSel}>${n}</option>`;
    });
    return html;
  };

  // Timeline track options — faqat animatsiya treki bor obyektlar
  const tlTrackOpts = (selId) => {
    const trs = (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) ? TimelineSystem.tracks : [];
    if (!trs.length) return '<option value="">(timeline trek yo&#39;q)</option>';
    return '<option value="">— trekni tanlang —</option>' + trs.map(t =>
      `<option value="${t.objId}" ${String(selId)===String(t.objId)?'selected':''}>${t.objName || ('obyekt '+t.objId)}</option>`
    ).join('');
  };

  // Shared <select> style
  const SEL = "flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";

  // Feature block header (checkbox + label). Clicking the row toggles.
  const featureHeader = (key, tag, tagColor, label) => {
    const enabled = a[key] && a[key].enabled;
    const checked = enabled ? 'checked' : '';
    return `
      <div class="comp-title" style="cursor:pointer" onclick="window._hbToggle('${key}')">
        <span class="tag" style="background:${tagColor}22;color:${tagColor}">${tag}</span>
        <span style="flex:1">${label}</span>
        <input type="checkbox" ${checked}
               onclick="event.stopPropagation(); window._hbToggle('${key}');"
               style="cursor:pointer">
      </div>`;
  };

  ic.innerHTML = `
    <!-- Header -->
    <div class="comp-block">
      <div class="comp-title">
        <span class="tag" style="background:rgba(var(--accent2-rgb),.18);color:var(--accent2)">HTB</span>
        <input id="hb-name-inp" value="${ud.name}"
               style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
               oninput="window._hbRename(this.value)">
      </div>
      <div class="fr"><span class="fl">Tur</span>
        <span style="font-size:10px;color:var(--accent2);font-family:'Share Tech Mono',monospace">Hitbox Zonasi</span>
      </div>
      <div class="fr"><span class="fl">Holat</span>
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
          O'yin rejimida ko'rinmaydi
        </span>
      </div>
    </div>

    <!-- Position + Size -->
    <div class="comp-block">
      <div class="comp-title"><span class="tag">TRS</span>Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" id="px" value="${p.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="py" value="${p.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="pz" value="${p.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>

      <div class="fl" style="margin:8px 0 3px">Hitbox O'lchami (kenglik, balandlik, chuqurlik)</div>
      <div class="xyzr">
        <div><input class="xi" id="hb-sx" value="${s.x.toFixed(2)}" oninput="window._hbSizeChanged()"><div class="xl" style="color:#ff5555">W</div></div>
        <div><input class="xi" id="hb-sy" value="${s.y.toFixed(2)}" oninput="window._hbSizeChanged()"><div class="xl" style="color:#55ff55">H</div></div>
        <div><input class="xi" id="hb-sz" value="${s.z.toFixed(2)}" oninput="window._hbSizeChanged()"><div class="xl" style="color:#5588ff">D</div></div>
      </div>
    </div>

    <!-- Trigger settings -->
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent2-rgb),.15);color:var(--accent2)">TRG</span>Trigger Sozlamalari</div>
      <div class="fr">
        <span class="fl">Trigger Turi</span>
        <select id="hb-trigger" onchange="window._hbTriggerChanged(this.value)" style="${SEL}">
          <option value="onEnter" ${ud.triggerType==='onEnter'?'selected':''}>Kirganda</option>
          <option value="onStay"  ${ud.triggerType==='onStay'?'selected':''}>Ichida bo'lganda</option>
          <option value="onExit"  ${ud.triggerType==='onExit'?'selected':''}>Chiqqanda</option>
        </select>
      </div>
      <div class="fr">
        <span class="fl">Fizika Rejimi</span>
        <select id="hb-collision" onchange="window._hbCollisionChanged(this.value)" style="${SEL}">
          <option value="inline" ${(ud.collisionMode||'inline')==='inline'?'selected':''}>Inline (o'tib bo'ladi)</option>
          <option value="block"  ${ud.collisionMode==='block'?'selected':''}>Block (solid to'siq)</option>
        </select>
      </div>
      <div class="fl" style="font-size:9px;color:var(--muted);padding:2px 0 4px">
        <b style="color:var(--accent2)">Inline</b> — o'yinchi ichidan o'tadi, ichiga kirganda ishlaydi.<br>
        <b style="color:var(--accent2)">Block</b> — solid to'siq, o'yinchi o'ta olmaydi, tekkanda ishlaydi.
      </div>
      <div class="fr">
        <span class="fl">Maqsad Obyekt</span>
        <select id="hb-target" onchange="window._hbTargetChanged(this.value)" style="${SEL}">
          ${objOpts(ud.targetObjectId, null)}        </select>
      </div>
      <div class="fl" style="font-size:9px;color:var(--muted);padding:2px 0 0">
        Maqsad obyekt — ixtiyoriy havola (masalan: eshik, dushman, portlash markazi).
        Custom kod ichida <code style="color:var(--accent)">hitbox.userData.targetObjectId</code> orqali olinadi.
      </div>
    </div>

    <!-- 📦 Predmet sharti (pickup) -->
    ${(() => {
      const ir = ud.itemReq || (ud.itemReq = { enabled:false, itemId:null, mode:'carry', onDone:'consume', once:true });
      const on = !!ir.enabled;
      const md = ir.mode || 'carry';
      const dn = ir.onDone || 'consume';
      const pick = (fn, val, cur, ic, title, sub) => `
        <button onclick="window._hbIrSet('${fn}','${val}')"
          style="flex:1;text-align:left;background:${cur===val?'rgba(255,170,85,.14)':'transparent'};
                 border:1px solid ${cur===val?'#ffaa55':'var(--border)'};
                 color:${cur===val?'#ffaa55':'var(--muted)'};padding:6px 8px;border-radius:3px;
                 cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;line-height:1.5">
          <b style="font-size:10px">${ic} ${title}</b><br><span style="font-size:8px">${sub}</span></button>`;
      return `
    <div class="comp-block">
      <div class="comp-title" style="cursor:pointer" onclick="window._hbIrToggle()">
        <span class="tag" style="background:rgba(255,170,85,.15);color:#ffaa55">ITM</span>
        <span style="flex:1">Predmet Sharti</span>
        <input type="checkbox" ${on?'checked':''}
               onclick="event.stopPropagation(); window._hbIrToggle();" style="cursor:pointer">
      </div>
      ${on ? `
      <div class="fr">
        <span class="fl">Kerakli predmet</span>
        <select onchange="window._hbIrSet('itemId', this.value)" style="${SEL}">
          ${objOpts(ir.itemId, obj => !obj.userData.isHitbox)}
        </select>
      </div>
      ${!ir.itemId ? `<div class="fl" style="font-size:9px;color:#ff6b6b;padding:3px 0">
        ⚠ Predmet tanlanmagan — shart ishlamaydi, hitbox oddiy holicha qoladi.
      </div>` : ''}
      <div class="fl" style="margin:6px 0 4px">Qanday ishga tushsin</div>
      <div style="display:flex;gap:4px">
        ${pick('mode','carry',   md,'✋','QO\'LIDA','Predmetni ushlab kirsa — o\'zi ishlaydi')}
        ${pick('mode','deliver', md,'🎯','TASHLASA','Zonaga otsa/tashlasa. Ushlab kirish YETMAYDI')}
      </div>
      <div class="fl" style="margin:8px 0 4px">Ishlagandan keyin predmet</div>
      <div style="display:flex;gap:4px">
        ${pick('onDone','consume', dn,'💨','YO\'QOLSIN','Ko\'rinmas bo\'ladi, qo\'ldan o\'zi chiqadi')}
        ${pick('onDone','keep',    dn,'📌','QOLDIRILSIN','Predmet joyida turaveradi')}
      </div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:var(--text);margin:8px 0 2px">
        <input type="checkbox" ${ir.once !== false ? 'checked' : ''}
          onchange="window._hbIrSet('once', this.checked)" style="cursor:pointer">
        Bir marta — ishlab bo'lgach qayta ishlamasin
      </label>
      <div class="fl" style="font-size:8px;color:var(--muted);line-height:1.7;padding:4px 0 0">
        ${md === 'deliver'
          ? 'Predmet zonaga tushishi kifoya — <b style="color:#ffaa55">o\'yinchi ichida bo\'lishi shart emas</b>. Ushlab turgan predmet hisoblanmaydi.'
          : 'O\'yinchi predmetni qo\'lida ushlab zonaga kirsa — pastdagi chiqishlar ishga tushadi. Predmetsiz kirsa — hech narsa bo\'lmaydi.'}
        ${dn === 'consume' ? '<br>💨 Predmet yo\'qolganda to\'qnashuvi ham o\'chadi. <b>Stop</b> bosilsa qaytadi.' : ''}
      </div>` : `
      <div class="fl" style="font-size:9px;color:var(--muted);padding:3px 0">
        Yoqilsa — hitbox faqat kerakli predmet bilan ishlaydi (kalit, quti, qurol...).
      </div>`}
    </div>`;
    })()}

    <!-- NoScript - raqamga tasir. IKKI XATO TUZATILDI:
         1. Bu chaqiruv "pick" YORDAMCHISINING ichida edi. "pick" esa
            4 marta chaqiriladi (QOLIDA / TASHLASA / YOQOLSIN /
            QOLDIRILSIN) - yani NoScript menyusi TORT marta chizilardi.
            Ustiga u tugmalar qatorining (display:flex) ichiga tushib,
            "yoqolsin / qoldirilsin" tugmalarini ezib qoyardi va ular
            bosilmay qolardi.
         2. Predmet sharti panelining ICHIDA edi, yani shart ochirilgan
            bolsa umuman korinmasdi. Holbuki NoScript amali hitbox
            ishga tushishining ENG BOSHIDA bajariladi - predmet
            shartiga boglik emas.
         Interaktiv tugmada aynan shu ikkinchi xato allakachon
         tuzatilgan (interactive-button.js:3113 izohiga karang) -
         hitbox osha darsdan chetda kolgan edi. -->
    ${window.buildNoScriptOpHTML ? window.buildNoScriptOpHTML(o) : ''}

    <!-- 👤 O'yinchi modeli -->
    <div class="comp-block">
      ${featureHeader('playerModel', 'MDL', 'var(--accent4)', 'O\'yinchi Modelini Almashtirish')}
      ${(a.playerModel && a.playerModel.enabled && window._pmBlock)
        ? window._pmBlock(a.playerModel, 'window._hbSetPM') : ''}
    </div>

    <!-- 🛤 Yo'l (Path) -->
    <div class="comp-block">
      ${featureHeader('path', 'PATH', 'var(--accent3)', 'Yo\'lni Boshqarish')}
      ${(a.path && a.path.enabled) ? (() => {
        const paths = objects.filter(x => x.userData && x.userData.isPath);
        if (!paths.length) return `<div style="font-size:9px;color:#ff8844;margin-top:5px;
          font-family:'Share Tech Mono',monospace;line-height:1.5">
          ⚠ Sahnada yo'l yo'q.<br><span style="color:var(--border)">Assets → 🛤 Yo'l (Path) qo'shing.</span></div>`;
        const A  = a.path.action || 'play';
        const BA = a.path.backAction || '';
        const EA = a.path.exitAction || '';
        const tp = paths.find(x => String(x.userData.id) === String(a.path.targetId));
        return `
        <div class="fr" style="margin-top:4px"><span class="fl">Yo'l</span>
          <select class="fv" onchange="window._hbSetAction('path','targetId',this.value||null)">
            <option value="">— tanlang —</option>
            ${paths.map(x => `<option value="${x.userData.id}" ${String(a.path.targetId)===String(x.userData.id)?'selected':''}>🛤 ${x.userData.name}</option>`).join('')}
          </select></div>
        <div class="fr"><span class="fl">Kirganda</span>
          <select class="fv" onchange="window._hbSetAction('path','action',this.value)">
            <option value="play"    ${A==='play'?'selected':''}>▶ Boshlash</option>
            <option value="stop"    ${A==='stop'?'selected':''}>⏸ To'xtatish</option>
            <option value="toggle"  ${A==='toggle'?'selected':''}>🔄 Almashtirish (play/pause)</option>
            <option value="restart" ${A==='restart'?'selected':''}>⏮ Boshdan boshlash</option>
            <option value="reset"   ${A==='reset'?'selected':''}>⏹ Boshiga qaytarish</option>
            <option value="reverse" ${A==='reverse'?'selected':''}>◀ Yo'nalishni teskari</option>
          </select></div>
        <div class="fr"><span class="fl">Chiqqanda</span>
          <select class="fv" onchange="window._hbSetAction('path','exitAction',this.value||null)">
            <option value=""        ${!EA?'selected':''}>— hech narsa —</option>
            <option value="stop"    ${EA==='stop'?'selected':''}>⏸ To'xtatish</option>
            <option value="reset"   ${EA==='reset'?'selected':''}>⏹ Boshiga qaytarish</option>
            <option value="reverse" ${EA==='reverse'?'selected':''}>◀ Teskari</option>
          </select></div>
        <div class="fr"><span class="fl">Orqaga (reverse)</span>
          <select class="fv" onchange="window._hbSetAction('path','backAction',this.value||null)">
            <option value=""        ${!BA?'selected':''}>— bir xil —</option>
            <option value="stop"    ${BA==='stop'?'selected':''}>⏸ To'xtatish</option>
            <option value="reset"   ${BA==='reset'?'selected':''}>⏹ Boshiga</option>
            <option value="reverse" ${BA==='reverse'?'selected':''}>◀ Teskari</option>
          </select></div>
        ${tp && (tp.userData.trigger || 'auto') === 'auto' ? `
        <div style="font-size:8px;color:#ff8844;margin-top:6px;padding:5px 7px;line-height:1.5;
          background:rgba(255,136,68,.08);border:1px solid rgba(255,136,68,.3);border-radius:2px;
          font-family:'Share Tech Mono',monospace">
          ⚠ "<b>${tp.userData.name}</b>" hozir <b>⚡ Avtomatik</b> — Play bosilishi bilan
          o'zi yuradi, hitboxni kutmaydi.<br>
          <span style="color:var(--border)">Uni tanlab → Harakat → Boshlanishi → <b>🎯 Trigger bilan</b> qiling.</span>
        </div>` : `
        <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.5;font-family:'Share Tech Mono',monospace">
          ✅ Yo'l trigger rejimida — obyekt boshida kutib turadi, hitboxga kirilganda yuradi.
        </div>`}`;
      })() : ''}
    </div>

    <!-- 📝 Matn bloki -->
    <div class="comp-block">
      ${featureHeader('textBlock', 'TXT', '#ffcc00', 'Matn Blokini O\'zgartirish')}
      ${(a.textBlock && a.textBlock.enabled) ? `
        <div class="fr" style="margin-top:4px">
          <span class="fl">Matn bloki</span>
          <select class="fv" onchange="window._hbSetAction('textBlock','targetId',this.value||null)">
            <option value="">— tanlang —</option>
            ${objects.filter(x => x.userData && x.userData.isTextBlock).map(x =>
              `<option value="${x.userData.id}" ${String(a.textBlock.targetId)===String(x.userData.id)?'selected':''}>📝 ${x.userData.name}</option>`
            ).join('')}
          </select>
        </div>
        <div style="font-size:9px;color:var(--muted);margin:5px 0 3px;font-family:'Share Tech Mono',monospace">YANGI MATN</div>
        <textarea oninput="window._hbSetAction('textBlock','text',this.value)" spellcheck="false" style="
          width:100%;min-height:44px;background:rgba(0,0,0,.35);border:1px solid var(--border);
          color:var(--text);border-radius:3px;padding:5px 7px;font-family:'Share Tech Mono',monospace;
          font-size:11px;resize:vertical;outline:none">${(a.textBlock.text ?? '').replace(/</g,'&lt;')}</textarea>
        <div style="font-size:9px;color:var(--muted);margin:5px 0 3px;font-family:'Share Tech Mono',monospace">
          ORQAGA MATN <span style="color:var(--border)">(reverse rejim — ixtiyoriy)</span></div>
        <textarea oninput="window._hbSetAction('textBlock','backText',this.value)" spellcheck="false" style="
          width:100%;min-height:32px;background:rgba(0,0,0,.35);border:1px solid var(--border);
          color:var(--text);border-radius:3px;padding:5px 7px;font-family:'Share Tech Mono',monospace;
          font-size:11px;resize:vertical;outline:none">${(a.textBlock.backText ?? '').replace(/</g,'&lt;')}</textarea>
        <div class="fr" style="margin-top:4px">
          <span class="fl">O'zgarish</span>
          <select class="fv" onchange="window._hbSetAction('textBlock','mode',this.value||null)">
            <option value=""        ${!a.textBlock.mode?'selected':''}>Blok sozlamasi</option>
            <option value="instant" ${a.textBlock.mode==='instant'?'selected':''}>⚡ Oddiy</option>
            <option value="hard"    ${a.textBlock.mode==='hard'?'selected':''}>🔲 Qattiq</option>
            <option value="smooth"  ${a.textBlock.mode==='smooth'?'selected':''}>🌊 Silliq</option>
          </select>
        </div>
        <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
          Oyinchi hitboxga kirganda tanlangan matn bloki shu matnga o'zgaradi.
        </div>
      ` : ''}
    </div>

    <!-- ⏱ Timer / Auto -->
    <div class="comp-block">
      ${featureHeader('timer', 'TMR', 'var(--accent3)', 'Timer / Auto Ishga Tushirish')}
      ${(a.timer && a.timer.enabled) ? `
        <div class="fr" style="margin-top:4px">
          <span class="fl">Kechikish (soniya)</span>
          <input type="number" step="0.1" min="0" value="${(a.timer.delay ?? 3).toFixed(1)}"
                 onchange="window._hbSetAction('timer','delay',Math.max(0,parseFloat(this.value)||0)); updateInspector();"
                 style="${SEL}">
        </div>
        <div class="fr" style="margin-top:4px">
          <span class="fl">Auto (o'yinchisiz)</span>
          <input type="checkbox" ${a.timer.auto ? 'checked' : ''}
                 onchange="window._hbSetAction('timer','auto',this.checked); updateInspector();"
                 style="cursor:pointer">
        </div>

        <!-- 🎞 Timeline animatsiyalar -->
        <div style="margin-top:8px;border-top:1px solid var(--border);padding-top:6px">
          <div style="font-size:9px;color:var(--accent);letter-spacing:1px;font-family:'Share Tech Mono',monospace;margin-bottom:4px">🎞 TIMELINE ANIMATSIYALAR</div>
          ${(a.timer.tracks || []).map((tid, i) => `
            <div class="fr" style="margin-bottom:4px;gap:4px">
              <select onchange="window._hbTimerSetTrack(${i}, this.value)" style="${SEL}">
                ${tlTrackOpts(tid)}
              </select>
              <button onclick="window._hbTimerRemoveTrack(${i})" title="O'chirish"
                style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);cursor:pointer;font-size:9px;padding:1px 6px;border-radius:2px">✕</button>
            </div>`).join('')}
          <button class="action-btn" onclick="window._hbTimerAddTrack()"
            style="background:rgba(var(--accent-rgb),.08);border-color:rgba(var(--accent-rgb),.35);color:var(--accent);width:100%;font-size:10px;padding:3px 6px">+ Animatsiya (timeline)</button>
        </div>

        <!-- 🎵 Musiqa -->
        <div style="margin-top:8px;border-top:1px solid var(--border);padding-top:6px">
          <div style="font-size:9px;color:#ff6b35;letter-spacing:1px;font-family:'Share Tech Mono',monospace;margin-bottom:4px">🎵 MUSIQA / OVOZ</div>
          ${(a.timer.sounds || []).map((sn, i) => `
            <div class="fr" style="margin-bottom:4px;gap:4px">
              <select onchange="window._hbTimerSetSound(${i}, this.value)" style="${SEL}">
                ${buildSoundOpts(sn)}
              </select>
              <button onclick="window._hbTimerRemoveSound(${i})" title="O'chirish"
                style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);cursor:pointer;font-size:9px;padding:1px 6px;border-radius:2px">✕</button>
            </div>`).join('')}
          <button class="action-btn" onclick="window._hbTimerAddSound()"
            style="background:rgba(255,107,53,.08);border-color:rgba(255,107,53,.35);color:#ff6b35;width:100%;font-size:10px;padding:3px 6px">+ Musiqa</button>
        </div>

        <!-- 📂 Import animatsiya (.json) -->
        <div style="margin-top:8px;border-top:1px solid var(--border);padding-top:6px">
          <div style="font-size:9px;color:var(--accent2);letter-spacing:1px;font-family:'Share Tech Mono',monospace;margin-bottom:4px">📂 IMPORT ANIMATSIYA (.json)</div>
          ${(a.timer.imports || []).map((slot, i) => `
            <div style="border:1px solid var(--border);border-radius:3px;padding:5px 6px;margin-bottom:5px;background:rgba(0,0,0,.15)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:9px;color:var(--accent2);font-family:'Share Tech Mono',monospace">IMPORT ${i + 1}${slot.sourceName ? ` — ${slot.sourceName}` : ''}</span>
                <button onclick="window._hbTimerRemoveImport(${i})" title="O'chirish"
                  style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);cursor:pointer;font-size:9px;padding:1px 6px;border-radius:2px">✕</button>
              </div>
              ${slot.sourceName
                ? `<div style="font-size:9px;color:var(--accent);padding:1px 0 3px">✓ ${(slot.keyframes || []).length} keyframe</div>`
                : `<div style="font-size:9px;color:var(--muted);padding:1px 0 3px;font-style:italic">Fayl tanlanmagan</div>`}
              <button class="action-btn" onclick="window._hbTimerPickImportFile(${i})"
                style="background:rgba(var(--accent2-rgb),.06);border-color:rgba(var(--accent2-rgb),.3);color:var(--accent2);font-size:10px;padding:3px 6px">📂 Fayl</button>
              <div class="fr" style="margin-top:4px">
                <span class="fl">Maqsad</span>
                <select onchange="window._hbTimerSetImportProp(${i},'targetObjectId',this.value)" style="${SEL}">
                  ${objOpts(slot.targetObjectId, null)}
                </select>
              </div>
              <div class="fr">
                <span class="fl">Tezlik</span>
                <input class="xi" style="width:50px" value="${slot.speed || 1.0}"
                       oninput="window._hbTimerSetImportProp(${i},'speed',parseFloat(this.value)||1.0)">
                <span class="fl" style="margin-left:8px">Loop</span>
                <input type="checkbox" ${slot.loop ? 'checked' : ''}
                       onchange="window._hbTimerSetImportProp(${i},'loop',this.checked)" style="cursor:pointer">
              </div>
            </div>`).join('')}
          <button class="action-btn" onclick="window._hbTimerAddImport()"
            style="background:rgba(var(--accent2-rgb),.08);border-color:rgba(var(--accent2-rgb),.35);color:var(--accent2);width:100%;font-size:10px;padding:3px 6px">+ Import animatsiya (.json)</button>
          <button class="action-btn" onclick="window._hbImportSceneZip()"
            style="background:rgba(var(--accent4-rgb),.1);border-color:rgba(var(--accent4-rgb),.4);color:var(--accent4);width:100%;font-size:10px;padding:4px 6px;margin-top:4px">📦 Scene ZIP import (.zip — obyekt+animatsiya)</button>
          <div class="fr" style="margin-top:4px">
            <span class="fl">ZIP to'qnashuv</span>
            <select onchange="window._hbSetAction('timer','collision',this.value)" style="${SEL}">
              <option value="original" ${(a.timer.collision||'original')==='original'?'selected':''}>Original (har biri o'zicha)</option>
              <option value="inline"   ${a.timer.collision==='inline'?'selected':''}>Hammasi Inline (o'tadi)</option>
              <option value="block"    ${a.timer.collision==='block'?'selected':''}>Hammasi Block (solid)</option>
            </select>
          </div>
          <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:3px 0 0">
            <b style="color:var(--accent4)">.zip</b> — Timeline ZIP eksporti: obyektlar joriy kartaga spawn bo'ladi
            va animatsiyalari shu timer'ga qo'shiladi. To'qnashuvni import qilishdan <b>oldin</b> tanlang
            (eski ZIP'da collision yo'q — <b>Inline</b> tanlang, aks holda hammasi block bo'ladi).
            <i>Butun kartani almashtirish uchun Assetlardagi 🗺 Map Loader'dan foydalaning.</i>
          </div>
        </div>

        <div class="fl" style="font-size:9px;color:var(--muted);line-height:1.5;padding:6px 0 0;border-top:1px solid var(--border);margin-top:8px">
          ${a.timer.auto
            ? `<b style="color:var(--accent3)">Auto</b> — o'yin boshlangach <b>${(a.timer.delay ?? 3).toFixed(1)}s</b> dan keyin O'ZI ishga tushadi (o'yinchi kirmasa ham, bir marta).`
            : `<b style="color:var(--accent3)">Kechikish</b> — o'yinchi kirgach <b>${(a.timer.delay ?? 3).toFixed(1)}s</b> kutib, keyin ishga tushadi.`}
          <br>Timer yuqorida sozlangan animatsiya, musiqa va importlarni birga ishga tushiradi.
        </div>
      ` : `
        <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0 0">
          Animatsiya/ovoz va boshqa amallarni kechikish bilan yoki o'yinchisiz (auto) ishga tushiradi.
        </div>`}
    </div>

    <!-- Reverse Playback Mode -->
    <div class="comp-block">
      <div class="comp-title" style="cursor:pointer" onclick="window._hbToggleReverse()">
        <span class="tag" style="background:rgba(var(--accent4-rgb),.15);color:var(--accent4)">REV</span>
        <span style="flex:1">Teskari Rejimni Yoqish</span>
        <input type="checkbox" ${rev.enabled?'checked':''}
               onclick="event.stopPropagation(); window._hbToggleReverse();"
               style="cursor:pointer">
      </div>
      ${rev.enabled ? `
        <div class="fr">
          <span class="fl">Teskari Tezlik</span>
          <input class="xi" style="width:60px" value="${rev.reverseSpeed || 1.0}"
                 oninput="window._hbSetReverse('reverseSpeed', parseFloat(this.value)||1.0)">
        </div>
        <div class="fr" style="align-items:center">
          <span class="fl">Sahna Qayta Yuklanganda Reset</span>
          <input type="checkbox" ${rev.resetOnLoad!==false?'checked':''}
                 onchange="window._hbSetReverse('resetOnLoad', this.checked)"
                 style="cursor:pointer">
        </div>
        <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
          Har safar faollashganda oldinga/teskariga navbatlashadi:<br>
          &nbsp;1-marta: oldinga → &nbsp;2-marta: teskariga → &nbsp;3-marta: oldinga …
        </div>` : `
        <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
          Yoqilsa: har faollashuvda oldinga/teskariga almashinadi.
        </div>`}
    </div>

    <!-- 1) Camera Animation -->
    <div class="comp-block">
      ${featureHeader('cameraAnim', 'CAM', 'var(--accent4)', 'Kamera Animatsiyasi')}
      ${(a.cameraAnim && a.cameraAnim.enabled) ? `
        <div class="fr">
          <span class="fl">Kamera</span>
          <select onchange="window._hbSetAction('cameraAnim','cameraId',this.value)" style="${SEL}">
            ${objOpts(a.cameraAnim.cameraId, obj => obj.userData.isCamera)}
          </select>
        </div>
        <button class="action-btn" onclick="window._hbCamAnimImport()"
          style="background:rgba(var(--accent4-rgb),.1);border-color:rgba(var(--accent4-rgb),.4);color:var(--accent4);width:100%;font-size:10px;padding:4px 6px;margin-top:4px">📂 Kamera animatsiyasi import (.json)</button>
        <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:3px 0 2px">
          Kamera <b>Object-Only export</b>ini (.json) yuklaydi — yangi kamera-obyekt yaratib, keyframe'larni
          uning timeline yo'liga qo'yadi va shu kamerani tanlaydi. Trigger'da shu kamera animatsiyasi ijro etiladi.
        </div>
        <div class="fr">
          <span class="fl">O'tish Turi</span>
          <select onchange="window._hbSetAction('cameraAnim','transitionMode',this.value); updateInspector();" style="${SEL}">
            <option value="smooth"  ${(a.cameraAnim.transitionMode||'smooth')==='smooth' ?'selected':''}>Silliq o'tish</option>
            <option value="instant" ${a.cameraAnim.transitionMode==='instant' ?'selected':''}>Darrov o'tish (snap)</option>
          </select>
        </div>
        ${(a.cameraAnim.transitionMode||'smooth')==='smooth' ? `
        <div class="fr">
          <span class="fl">Davomiyligi (s)</span>
          <input class="xi" style="width:60px" value="${a.cameraAnim.duration || 1.5}"
                 oninput="window._hbSetAction('cameraAnim','duration',parseFloat(this.value)||1.5)">
        </div>` : ''}
        <div class="fr" style="align-items:center">
          <span class="fl">Kamera yo'lini davom ettirish</span>
          <input type="checkbox" ${a.cameraAnim.continuePath !== false ? 'checked' : ''}
                 onchange="window._hbSetAction('cameraAnim','continuePath', this.checked)"
                 style="cursor:pointer">
        </div>
        <div class="fr" style="align-items:center">
          <span class="fl">Tugagach o'yinchiga qaytish</span>
          <input type="checkbox" ${a.cameraAnim.returnToPlayer !== false ? 'checked' : ''}
                 onchange="window._hbSetAction('cameraAnim','returnToPlayer', this.checked)"
                 style="cursor:pointer">
        </div>
        <div class="fr" style="align-items:center">
          <span class="fl">O'yinchini bloklash</span>
          <input type="checkbox" ${a.cameraAnim.lockPlayer !== false ? 'checked' : ''}
                 onchange="window._hbSetAction('cameraAnim','lockPlayer', this.checked)"
                 style="cursor:pointer">
        </div>
        <div class="fr" style="align-items:center">
          <span class="fl">O'yinchini yashirish</span>
          <input type="checkbox" ${a.cameraAnim.hidePlayer ? 'checked' : ''}
                 onchange="window._hbSetAction('cameraAnim','hidePlayer', this.checked)"
                 style="cursor:pointer">
        </div>
        <div class="fr" style="align-items:center">
          <span class="fl">Kamera mesh'ini yashirish</span>
          <input type="checkbox" ${a.cameraAnim.hideCameraAlways ? 'checked' : ''}
                 onchange="window._hbHideCameraToggle(this.checked)"
                 style="cursor:pointer">
        </div>
        ${a.cameraAnim.continuePath !== false ? `
        <div style="margin-top:6px;border-top:1px solid var(--border);padding-top:5px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:9px;color:#ff3b6b;font-family:'Share Tech Mono',monospace;letter-spacing:1px">🔒 BLOKLASH (to'xtash)</span>
            <button onclick="window._hbCamPickBlockOnTimeline()"
              style="background:rgba(255,59,107,.1);border:1px solid rgba(255,59,107,.4);color:#ff3b6b;font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">
              🎯 Timelineда tanlash
            </button>
          </div>
          ${(a.cameraAnim.blocks && a.cameraAnim.blocks.length) ? a.cameraAnim.blocks.slice().sort((x,y)=>x.time-y.time).map(blk => `
            <div style="margin:3px 0;border:1px solid ${blk.loop?'rgba(var(--accent-rgb),.35)':'var(--border)'};border-radius:4px;padding:3px 4px">
              <div class="fr" style="align-items:center;gap:4px">
                <span class="fl" style="font-size:9px;min-width:52px;color:${blk.loop?'var(--accent)':'#ff3b6b'}">${blk.loop?'🔁':'⏸'} ${(blk.time||0).toFixed(2)}s</span>
                <input readonly data-cur="${blk.key ? window._friendlyKey(blk.key) : (blk.loop?'⌨ sikl':'⌨ tugma')}"
                  value="${blk.key ? window._friendlyKey(blk.key) : (blk.loop?'⌨ sikl':'⌨ tugma')}"
                  onfocus="this.value='bosing...'"
                  onblur="this.value=this.getAttribute('data-cur')"
                  onkeydown="event.preventDefault();event.stopPropagation();window._hbCamSetBlockKey(${blk.time},event.code);this.blur();"
                  title="${blk.loop?'Sikl tugmasi (bumerang: orqaga-oldinga)':'Davom etish tugmasi'} (bosib klaviaturadan yozing)"
                  style="flex:1;text-align:center;cursor:pointer;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 0">
                <button onclick="window._hbCamToggleLoop(${blk.time})" title="Sikl (loop) rejimini yoqish/o'chirish"
                  style="background:${blk.loop?'rgba(var(--accent-rgb),.18)':'none'};border:1px solid ${blk.loop?'var(--accent)':'var(--border)'};color:${blk.loop?'var(--accent)':'var(--muted)'};cursor:pointer;font-size:10px;padding:1px 5px;border-radius:2px">🔁</button>
                <button onclick="window._hbCamToggleBlock(${blk.time},false)" title="Blokni o'chirish"
                  style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);cursor:pointer;font-size:9px;padding:1px 5px;border-radius:2px">✕</button>
              </div>
              ${blk.loop ? `
              <div class="fr" style="align-items:center;gap:4px;margin-top:3px">
                <span class="fl" style="font-size:9px;min-width:52px;color:var(--accent)">↩ qaytish</span>
                <input type="number" step="0.05" min="0" value="${(blk.loopBack||0).toFixed(2)}"
                  onchange="window._hbCamSetLoopBack(${blk.time},parseFloat(this.value)||0)"
                  title="Sikl boshlanish vaqti — bu vaqtga qaytib segment qayta o'ynaydi"
                  style="width:54px;text-align:center;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 0">
                <input readonly data-cur="${blk.exitKey ? window._friendlyKey(blk.exitKey) : '⌨ davom'}"
                  value="${blk.exitKey ? window._friendlyKey(blk.exitKey) : '⌨ davom'}"
                  onfocus="this.value='bosing...'"
                  onblur="this.value=this.getAttribute('data-cur')"
                  onkeydown="event.preventDefault();event.stopPropagation();window._hbCamSetExitKey(${blk.time},event.code);this.blur();"
                  title="Davom tugmasi — bosilsa oldinga (5 ga) o'tadi"
                  style="flex:1;text-align:center;cursor:pointer;font-size:9px;background:var(--bg);border:1px solid rgba(var(--accent2-rgb),.4);color:var(--accent2);border-radius:3px;padding:2px 0">
              </div>` : ''}
            </div>`).join('') : `
            <div style="font-size:9px;color:var(--muted);font-style:italic;padding:2px 0">Blok yo'q — "Timelineда tanlash" bilan qo'shing</div>`}
          <div style="font-size:8px;color:var(--muted);line-height:1.4;margin-top:3px">
            Belgilangan key'ga yetganda kamera animatsiyasi <b style="color:#ff3b6b">to'xtaydi</b>. Davom etish uchun <b>⌨ tugma</b> bosiladi.<br>
            <b style="color:var(--accent)">🔁 Sikl</b> — <b>sikl</b> tugma bossa segment <b>orqaga</b> (t→<b>↩ qaytish</b>) so'ng o'zi <b>oldinga</b> qaytib o'ynaydi (masalan 4→3→4) va yana to'xtaydi; <b style="color:var(--accent2)">davom</b> tugma bossa oldinga (5 ga) o'tadi.
          </div>
        </div>` : ''}
        <div class="fl" style="font-size:9px;color:var(--muted);padding:2px 0 0">
          <b style="color:var(--accent4)">Silliq</b> — kamera davomiylik ichida silliq lerp qiladi.<br>
          <b style="color:var(--accent4)">Darrov</b> — bir kadr'da to'g'ridan-to'g'ri kamera ko'ziga o'tadi.<br>
          <b style="color:var(--accent2)">Bloklash</b> — cutscene paytida WASD/sichqoncha ishlamaydi.<br>
          <b style="color:var(--accent2)">O'yinchi yashirish</b> — animatsiya davomida o'yinchi mesh yashiriladi (tugagach qaytadi).<br>
          <b style="color:var(--accent2)">Kamera yashirish</b> — kamera mesh editor'da ham ko'rinmasin.
        </div>` : ''}
    </div>

    <!-- 2) Spawn Redirect -->
    <div class="comp-block">
      ${featureHeader('spawnRedirect', 'SPN', 'var(--accent)', "Boshqa Joyga Jo'natish")}
      ${(a.spawnRedirect && a.spawnRedirect.enabled) ? `
        <div class="fr">
          <span class="fl">Spawn Nuqta</span>
          <select onchange="window._hbSetAction('spawnRedirect','spawnId',this.value)" style="${SEL}">
            ${objOpts(a.spawnRedirect.spawnId, null)}
          </select>
        </div>
        <div class="fr" style="align-items:center">
          <span class="fl">Pre-animatsiya</span>
          <input type="checkbox" ${a.spawnRedirect.preAnimEnabled ? 'checked' : ''}
                 onchange="window._hbSetAction('spawnRedirect','preAnimEnabled', this.checked); updateInspector();"
                 style="cursor:pointer">
        </div>
        ${a.spawnRedirect.preAnimEnabled ? `
          <div class="fr">
            <span class="fl">Turi</span>
            <select onchange="window._hbSetAction('spawnRedirect','preAnimType',this.value); updateInspector();" style="${SEL}">
              <option value="fade"   ${(a.spawnRedirect.preAnimType||'fade')==='fade'  ?'selected':''}>Fade (rang bilan)</option>
              <option value="html"   ${a.spawnRedirect.preAnimType==='html'  ?'selected':''}>HTML sahifa</option>
              <option value="camera" ${a.spawnRedirect.preAnimType==='camera'?'selected':''}>Kamera uchishi</option>
            </select>
          </div>
          <div class="fr">
            <span class="fl">Davomiylik (s)</span>
            <input class="xi" style="width:60px" value="${a.spawnRedirect.preAnimDuration || 1.0}"
                   oninput="window._hbSetAction('spawnRedirect','preAnimDuration',parseFloat(this.value)||1.0)">
          </div>
          <div class="fr" style="align-items:center">
            <span class="fl">O'yinchini bloklash</span>
            <input type="checkbox" ${a.spawnRedirect.lockPlayer !== false ? 'checked' : ''}
                   onchange="window._hbSetAction('spawnRedirect','lockPlayer', this.checked)"
                   style="cursor:pointer">
          </div>
          ${(a.spawnRedirect.preAnimType||'fade')==='fade' ? `
            <div class="fr" style="align-items:center">
              <span class="fl">Rang</span>
              <input type="color" value="${a.spawnRedirect.preAnimColor || '#000000'}"
                     onchange="window._hbSetAction('spawnRedirect','preAnimColor',this.value); updateInspector();"
                     style="width:40px;height:22px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:var(--bg)">
              <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--muted);margin-left:6px">
                ${(a.spawnRedirect.preAnimColor || '#000000').toUpperCase()}
              </span>
            </div>
            <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
              Ekran rangga qorayadi → o'rtada teleport → ekran ochiladi.
            </div>` : ''}
          ${a.spawnRedirect.preAnimType==='html' ? `
            <div class="fl" style="margin:6px 0 3px">HTML kontent</div>
            <textarea id="hb-html-content"
              oninput="window._hbSetAction('spawnRedirect','preAnimHtml',this.value)"
              style="width:100%;height:130px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none;resize:vertical;box-sizing:border-box"
            >${(a.spawnRedirect.preAnimHtml || '').replace(/</g,'&lt;')}</textarea>
            <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
              Har qanday HTML: matn, rasm, CSS. Qorongi orqa fon (rgba(0,0,0,0.92))
              ustida markazda ko'rsatiladi. Loading screen, hikoya matni, logo uchun.
            </div>` : ''}
          ${a.spawnRedirect.preAnimType==='camera' ? `
            <div class="fr">
              <span class="fl">Kamera manbai</span>
              <select onchange="window._hbSetAction('spawnRedirect','preAnimCameraSource',this.value); updateInspector();" style="${SEL}">
                <option value="spawn"    ${(a.spawnRedirect.preAnimCameraSource||'spawn')==='spawn'   ?'selected':''}>Spawn nuqtaga uchish</option>
                <option value="object"   ${a.spawnRedirect.preAnimCameraSource==='object'  ?'selected':''}>Tanlangan kameraga</option>
                <option value="timeline" ${a.spawnRedirect.preAnimCameraSource==='timeline'?'selected':''}>Kamera + Timeline</option>
                <option value="imported" ${a.spawnRedirect.preAnimCameraSource==='imported'?'selected':''}>Kamera + Import .json</option>
              </select>
            </div>
            ${(a.spawnRedirect.preAnimCameraSource==='object' ||
               a.spawnRedirect.preAnimCameraSource==='timeline' ||
               a.spawnRedirect.preAnimCameraSource==='imported') ? `
              <div class="fr">
                <span class="fl">Kamera</span>
                <select onchange="window._hbSetAction('spawnRedirect','preAnimCameraId',this.value)" style="${SEL}">
                  ${objOpts(a.spawnRedirect.preAnimCameraId, obj => obj.userData.isCamera)}
                </select>
              </div>` : ''}
            ${a.spawnRedirect.preAnimCameraSource==='imported' ? `
              ${a.spawnRedirect.preAnimKfSourceName ? `
                <div style="font-size:9px;color:var(--accent);padding:4px 8px;background:rgba(var(--accent-rgb),.06);border-left:2px solid var(--accent);border-radius:2px;margin:4px 0">
                  ✓ ${a.spawnRedirect.preAnimKfSourceName} —
                  ${(a.spawnRedirect.preAnimKeyframes || []).length} keyframe
                </div>` : `
                <div style="font-size:9px;color:var(--muted);padding:4px 8px;background:rgba(var(--accent2-rgb),.04);border-left:2px solid var(--accent2);border-radius:2px;margin:4px 0">
                  Fayl tanlanmagan. Object-Only Export .json faylini yuklang.
                </div>`}
              <button class="action-btn" onclick="window._hbSpawnPickAnim()"
                      style="background:rgba(var(--accent2-rgb),.08);border-color:rgba(var(--accent2-rgb),.3);color:var(--accent2)">
                📂 Animatsiya Faylini Yuklash
              </button>
              <input type="file" id="hb-spawn-anim-input" accept=".json"
                     style="display:none" onchange="window._hbSpawnHandleAnim(event)">
            ` : ''}
            <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
              ${a.spawnRedirect.preAnimCameraSource==='spawn'    ? "Kamera to'g'ridan-to'g'ri spawn nuqta ustiga silliq uchadi." :
                a.spawnRedirect.preAnimCameraSource==='object'   ? "Kamera tanlangan kamera obyektiga silliq uchadi." :
                a.spawnRedirect.preAnimCameraSource==='timeline' ? "Kamera aktivlashadi va Timeline ijro etiladi. Tugagach — teleport." :
                a.spawnRedirect.preAnimCameraSource==='imported' ? "Kamera aktivlashadi va yuklangan keyframe'lar ijro etiladi. Tugagach — teleport." : ''}
            </div>` : ''}
        ` : `
          <div class="fl" style="font-size:9px;color:var(--muted);padding:2px 0 0">
            Kirganda o'yinchi/mashina tanlangan obyekt pozitsiyasiga tashlanadi.
          </div>`}
        ` : ''}
    </div>

    <!-- 3) Checkpoint -->
    <div class="comp-block">
      ${featureHeader('checkpoint', 'CHK', 'var(--accent3)', 'Checkpoint Saqlash')}
      ${(a.checkpoint && a.checkpoint.enabled) ? `
        <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
          Kirganda joriy pozitsiya checkpoint sifatida saqlanadi.
          Respawn: <code style="color:var(--accent)">api.respawn()</code>
        </div>` : ''}
    </div>

    <!-- 4) Soundtrack -->
    <div class="comp-block">
      ${featureHeader('soundtrack', 'SND', '#ff6b35', 'Musiqa Boshlash')}
      ${(a.soundtrack && a.soundtrack.enabled) ? `
        <div class="fr">
          <span class="fl">Ovoz</span>
          <select onchange="window._hbSetAction('soundtrack','soundName',this.value)" style="${SEL}">
            ${buildSoundOpts(a.soundtrack.soundName)}
          </select>
        </div>
        <div class="fr">
          <span class="fl">Qachon</span>
          <select onchange="window._hbSetAction('soundtrack','triggerOn',this.value)" style="${SEL}">
            <option value="enter" ${a.soundtrack.triggerOn==='enter'?'selected':''}>Kirganda</option>
            <option value="exit"  ${a.soundtrack.triggerOn==='exit'?'selected':''}>Chiqqanda</option>
          </select>
        </div>` : ''}
    </div>

    <!-- 4b-1) 🔴 Finish -->
    <div class="comp-block">
      ${featureHeader('finishGame', 'FIN', '#ff3355', "O'yinni tugatish (Finish blok)")}
      ${(a.finishGame && a.finishGame.enabled) ? `
        <div class="fr">
          <span class="fl">Finish blok</span>
          <select class="fv" onchange="window._hbSetAction('finishGame','targetId',this.value||null)">
            <option value="">— birinchisi —</option>
            ${objects.filter(o => o.userData && o.userData.isFinishBlock).map(o =>
              `<option value="${o.userData.id}" ${String(a.finishGame.targetId)===String(o.userData.id)?'selected':''}
                >${o.userData.name}</option>`).join('')}
          </select>
        </div>
        <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.6;font-family:'Share Tech Mono',monospace">
          Zonaga kirilganda finish bloki ishga tushadi — outro
          ko'rsatiladi va sozlangan sahifaga o'tiladi.
        </div>` : ''}
    </div>

    <!-- 4b-2) 💻 PC blok HTML -->
    <div class="comp-block">
      ${featureHeader('pcHtml', 'PC', 'var(--accent)', 'PC ekran HTML kodi')}
      ${(a.pcHtml && a.pcHtml.enabled) ? `
        <div class="fr">
          <span class="fl">PC blok</span>
          <select class="fv" onchange="window._hbSetAction('pcHtml','targetId',this.value||null)">
            <option value="">— PC ni tanlang —</option>
            ${objects.filter(o => o.userData && o.userData.isPCBlock).map(o =>
              `<option value="${o.userData.id}" ${String(a.pcHtml.targetId)===String(o.userData.id)?'selected':''}
                >${o.userData.name || ('PC ' + o.userData.id)}</option>`).join('')}
          </select>
        </div>
        <div style="font-size:8px;color:var(--muted);margin:5px 0 3px;font-family:'Share Tech Mono',monospace">
          KIRGANDA qo'yiladigan kod</div>
        <textarea placeholder="&lt;h1&gt;Zonaga kirdingiz&lt;/h1&gt;"
          oninput="window._hbSetActionQuiet('pcHtml','html',this.value)"
          style="width:100%;min-height:66px;resize:vertical;background:var(--bg);border:1px solid var(--border);
          color:var(--text);padding:5px 6px;border-radius:3px;font-family:'Share Tech Mono',monospace;
          font-size:9px;line-height:1.5;outline:none">${String(a.pcHtml.html||'').replace(/</g,'&lt;')}</textarea>
        <div style="font-size:8px;color:var(--muted);margin:6px 0 3px;font-family:'Share Tech Mono',monospace">
          CHIQQANDA qo'yiladigan kod (ixtiyoriy)</div>
        <textarea placeholder="Bo'sh qoldirilsa — chiqqanda tegilmaydi"
          oninput="window._hbSetActionQuiet('pcHtml','exitHtml',this.value)"
          style="width:100%;min-height:52px;resize:vertical;background:var(--bg);border:1px solid var(--border);
          color:var(--text);padding:5px 6px;border-radius:3px;font-family:'Share Tech Mono',monospace;
          font-size:9px;line-height:1.5;outline:none">${String(a.pcHtml.exitHtml||'').replace(/</g,'&lt;')}</textarea>
        <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.6;font-family:'Share Tech Mono',monospace">
          Zonaga kirilganda PC ekranidagi sahifa almashadi.<br>
          Ikkinchi maydon to'ldirilsa — chiqqanda eski sahifaga qaytadi.
        </div>` : ''}
    </div>

    <!-- 4c) Stat-zona -->
    <div class="comp-block">
      ${featureHeader('statZone', 'STAT', '#ffcc00', 'Stat-zona (tezlik/sakrash...)')}
      ${(a.statZone && a.statZone.enabled) ? `
        <div class="fr">
          <span class="fl">Rejim</span>
          <select onchange="window._hbSetStatMode(this.value); updateInspector();" style="${SEL}">
            <option value="set"   ${(a.statZone.mode||'set')==='set'?'selected':''}>O'zgartirish (set)</option>
            <option value="reset" ${a.statZone.mode==='reset'?'selected':''}>Standartga qaytarish (reset)</option>
          </select>
        </div>
        ${(a.statZone.mode||'set')==='set' ? `
          <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:4px 0">Belgilanganlar o'zgaradi. Belgilanmagani o'z holida qoladi.</div>
          ${[['pSpeed','🚶 O\'yinchi tezligi',7],['pJump','🦘 Sakrash kuchi',10],['pStamina','🔋 Max stamina',100],['pSprint','🏃 Yugurish x',1.8],['cMaxSpeed','🏎 Mashina max (km/h)',120]].map(([k,lbl,def])=>`
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <input type="checkbox" ${a.statZone[k]!=null?'checked':''} onchange="window._hbToggleStat('${k}',this.checked,${def})" style="cursor:pointer">
              <span style="flex:1;font-size:10px;color:${a.statZone[k]!=null?'var(--text)':'var(--muted)'}">${lbl}</span>
              <input type="number" value="${a.statZone[k]??''}" ${a.statZone[k]==null?'disabled':''} oninput="window._hbSetStat('${k}',this.value)" style="width:64px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none;${a.statZone[k]==null?'opacity:.4':''}">
            </div>`).join('')}
        ` : `<div style="font-size:8px;color:#ffcc00;line-height:1.5;padding:4px 0">Bu zonaga kirganда barcha statlar <b>standart</b> (o'yin boshidagi) holatga qaytadi.</div>`}
        <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:2px 0">O'yinchi kirganда qo'llanadi. Boshqa stat-zonaga kirsa — o'shaniki. O'yin to'xtaганда standartga qaytadi.</div>
      ` : ''}
    </div>

    <!-- 4b) HTML Sahifa (Dialog / Quest) -->
    <div class="comp-block">
      ${featureHeader('htmlPage', 'HTML', 'var(--accent)', 'HTML Sahifa (Dialog)')}
      ${(a.htmlPage && a.htmlPage.enabled) ? `
        <div class="fr">
          <span class="fl">Rejim</span>
          <select onchange="window._hbSetAction('htmlPage','mode',this.value); updateInspector();" style="${SEL}">
            <option value="show"  ${(a.htmlPage.mode||'show')==='show'?'selected':''}>Ko'rsatish (HTML chiqadi)</option>
            <option value="close" ${a.htmlPage.mode==='close'?'selected':''}>Yopish (mavjud HTMLni o'chiradi)</option>
          </select>
        </div>
        ${(a.htmlPage.mode||'show')==='show' ? `
          <div class="fr">
            <span class="fl">Joylashuv</span>
            <select onchange="window._hbSetAction('htmlPage','position',this.value)" style="${SEL}">
              <option value="bottom" ${(a.htmlPage.position||'bottom')==='bottom'?'selected':''}>Pastda</option>
              <option value="top"    ${a.htmlPage.position==='top'?'selected':''}>Tepada</option>
              <option value="center" ${a.htmlPage.position==='center'?'selected':''}>Markazda</option>
              <option value="full"   ${a.htmlPage.position==='full'?'selected':''}>To'liq ekran</option>
            </select>
          </div>
          ${window._htmlFxHTML ? window._htmlFxHTML(a.htmlPage, "window._hbSetAction('htmlPage',") : ''}
          <div class="fl" style="margin:5px 0 3px">HTML kodi</div>
          <textarea onchange="window._hbSetHtmlContent(this.value)" rows="5"
            placeholder="&lt;h3&gt;Salom!&lt;/h3&gt;&lt;p&gt;Dialog matni...&lt;/p&gt;&lt;button onclick=&quot;_hbCloseHtmlPage()&quot;&gt;Yopish&lt;/button&gt;"
            style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:3px;padding:5px;resize:vertical">${_hbEsc(a.htmlPage.content||'')}</textarea>
        ` : ''}
        <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:4px 0 0">
          O'yinchi kirganда HTML chiqadi va <b>qoladi</b> (chiqib ketsa ham). Boshqa trigger
          (Ko'rsatish/Yopish) yoki HTML ichidagi tugma bilan almashtiriladi. Yopuvchi tugma:
          <b style="color:var(--accent)">&lt;button onclick="_hbCloseHtmlPage()"&gt;</b>.
          Bir vaqtda bitta HTML. Tugma/onclick ishlaydi (quest/dialog uchun).
        </div>` : ''}
    </div>

    <!-- 5) Timeline Playback — ⚠ ESKI, panelidan OLINGAN (58.54)
         O'rnida pastdagi 🎬 "Timeline Boshqaruvi" turibdi: u ham
         butun timelineni ishga tushiradi, ham har obyektga alohida
         slot beradi. Ikki joyda bir xil narsani qidirish chalkash
         edi.

         KOD O'CHIRILMADI - eski sahnalarda bu amal yoqilgan
         bo'lishi mumkin va ular ISHLASHDA DAVOM ETADI. Faqat
         yangi sahnada bu blok ko'rinmaydi. -->
    <div class="comp-block" style="${(a.timelinePlay && a.timelinePlay.enabled) ? '' : 'display:none'}">
      ${featureHeader('timelinePlay', 'TL', 'var(--accent3)', 'Timeline Ijrosi (eski)')}
      ${(a.timelinePlay && a.timelinePlay.enabled) ? `
        <div style="font-size:9px;color:#ffcc00;padding:4px 8px;background:rgba(255,204,0,.06);
          border-left:2px solid #ffcc00;border-radius:2px;margin-bottom:6px;line-height:1.5">
          ⚠ Bu blok <b>eskirgan</b>. Yangi sahnada pastdagi
          🎬 <b>Timeline Boshqaruvi</b> dan foydalaning — u ham butun
          timelineni boshlaydi, ham har obyektga alohida slot beradi.
        </div>
        <div class="fr">
          <span class="fl">Rejim</span>
          <select onchange="window._hbSetAction('timelinePlay','mode',this.value)" style="${SEL}">
            <option value="global" ${a.timelinePlay.mode==='global'?'selected':''}>Butun Timeline</option>
            <option value="object" ${a.timelinePlay.mode==='object'?'selected':''}>Faqat bitta obyekt</option>
          </select>
        </div>
        ${a.timelinePlay.mode === 'object' ? `
        <div class="fr">
          <span class="fl">Obyekt Track</span>
          <select onchange="window._hbSetTLTrack(this.value, this.options[this.selectedIndex].dataset.nm||'')" style="${SEL}">
            ${(() => {
              const trs = (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) ? TimelineSystem.tracks : [];
              const sel = a.timelinePlay.targetTrackId;
              if (!trs.length) return '<option value="">(timeline trek yo&#39;q)</option>';

              // Timeline'lar BIRLASHGAN: sahna treklari + karta treklari
              // (_registerMapTimeline ularni `_mlTrack` bilan qo'shadi).
              // Ikkalasini ham ko'rsatamiz, lekin ajratib — qaysi biri
              // qayerdan ekani bilinsin.
              const scn = trs.filter(t => !t._mlTrack);
              const map = trs.filter(t =>  t._mlTrack);

              const _mlObj = (typeof objects !== 'undefined')
                ? objects.find(o => o.userData && o.userData.isMapLoader && o.userData.mapName) : null;
              const _mapNm = _mlObj ? String(_mlObj.userData.mapName).replace(/\.zip$/i, '') + '-map' : 'karta';

              // ⚠ `data-nm` — obyekt NOMI. Karta obyektlari har spawn'да
              //   YANGI id oladi (++objIdC), ya'ni faqat id saqlansa
              //   bog'lanish keyingi yuklashда uzilib qolardi. Nom bilan
              //   zaxira bog'lanish qilamiz (_fireTimelinePlay da).
              const opt = t => `<option value="${t.objId}" data-nm="${(t.objName||'').replace(/"/g,'&quot;')}" ` +
                               `${String(sel)===String(t.objId)?'selected':''}>` +
                               `${t.objName || ('obyekt ' + t.objId)}</option>`;

              let h = '<option value="">— trekni tanlang —</option>';
              if (scn.length) h += `<optgroup label="🌐 Sahna">${scn.map(opt).join('')}</optgroup>`;
              if (map.length) h += `<optgroup label="🗺 ${_mapNm}">${map.map(opt).join('')}</optgroup>`;
              return h;
            })()}
          </select>
        </div>
        <div class="fl" style="font-size:9px;color:var(--muted);padding:2px 0 0;line-height:1.6">
          Faqat tanlangan obyektning (masalan <b style="color:var(--accent)">Kub</b>) timeline treki ijro etiladi.<br>
          <b style="color:var(--accent3)">🌐 Sahna</b> va <b style="color:var(--accent3)">🗺 karta</b> treklari birga chiqadi —
          timeline'lar birlashgan, ya'ni bu hitbox <b>kartadagi</b> obyektni ham harakatlantira oladi
          (va kartadagi hitbox — sahnadagini).
          ${(() => {
            const trs = (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) ? TimelineSystem.tracks : [];
            if (trs.some(t => t._mlTrack)) return '';
            return `<br><span style="color:#ff8844">⚠ Karta treklari ko'rinmayapti — Map Loader'да
                    <b>👁 Kartani ko'rish</b> ni yoqing (yoki kartani yuklang).</span>`;
          })()}
        </div>` : ''}
        <div class="fr">
          <span class="fl">Tezlik</span>
          <input class="xi" style="width:60px" value="${a.timelinePlay.speed || 1.0}"
                 oninput="window._hbSetAction('timelinePlay','speed',parseFloat(this.value)||1.0)">
        </div>
        <div class="fr" style="align-items:center">
          <span class="fl">O'yinchini bloklash</span>
          <input type="checkbox" ${a.timelinePlay.lockPlayer ? 'checked' : ''}
                 onchange="window._hbSetAction('timelinePlay','lockPlayer', this.checked)"
                 style="cursor:pointer">
        </div>
        <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
          Reverse rejimida ikkinchi faollashda Timeline teskariga ijro etiladi.<br>
          <b style="color:var(--accent3)">File orqali import</b> qilmoqchi bo'lsangiz — pastdagi
          <b style="color:var(--accent4)">Import animatsiya</b> blokidan foydalaning (.json).
        </div>` : ''}
    </div>

    <!-- 6) Imported Animations (multi-slot, from Object-Only Export .json) -->
    <div class="comp-block">
      ${featureHeader('importedAnimations', 'TL', 'var(--accent2)', 'Timeline Boshqaruvi')}
      ${(a.importedAnimations && a.importedAnimations.enabled) ? `
        <div style="font-size:9px;color:var(--muted);padding:4px 8px;background:rgba(var(--accent2-rgb),.04);border-left:2px solid var(--accent2);border-radius:2px;margin-bottom:8px;line-height:1.5">
          Bir nechta obyekt uchun parallel animatsiyalar (eshik + chiroq + qush).
          Har slotga <b style="color:var(--accent4)">Timeline'dan</b> yoki
          <b style="color:var(--accent2)">.json fayldan</b> animatsiya olinadi,
          🔊 musiqa ham qo'shiladi.
        </div>

        <!-- ▶ Butun timelineni ishga tushirish -->
        <div style="border:1px solid rgba(var(--accent-rgb),.3);border-radius:3px;padding:6px 8px;margin-bottom:8px;background:rgba(var(--accent-rgb),.04)">
          <div class="fr">
            <span class="fl" style="color:var(--accent)">▶ Timelineni boshlash</span>
            <input type="checkbox" ${a.importedAnimations.playWhole ? 'checked' : ''}
                   onchange="window._hbSetAction('importedAnimations','playWhole',this.checked);updateInspector()"
                   style="cursor:pointer">
          </div>
          <div style="font-size:8px;color:var(--muted);line-height:1.55;margin-top:3px;font-family:'Share Tech Mono',monospace">
            Yoqilsa — trigger BUTUN timelineni ishga tushiradi:
            <b>hamma obyekt</b> o'z treki bo'yicha birga yuradi.
            Pastdagi slotlar kerak bo'lmaydi.
          </div>
        </div>

        <!--  SLOT REJIMI - tugmadagi bilan bir xil tanlov.
              Standart 'all' (eski xulq): boshqa qiymat qilsak
              mavjud loyihalarda animatsiya boshqacha ishlab
              ketardi. -->
        ${!a.importedAnimations.playWhole ? `
        <div style="margin-bottom:8px">
          <div style="font-size:8px;color:var(--accent2);font-family:'Share Tech Mono',monospace;margin-bottom:3px">
            \u{1F3AC} O'YINCHI KIRGANDA SLOTLAR QANDAY ISHLASIN</div>
          <div style="display:grid;grid-template-columns:1fr;gap:4px">
            ${[['all', "\u26A1 Hammasi birdan", 'kirgan zahoti hamma slot bir vaqtda'],
               ['sequential', "\u23ED Galma-gal", '1-slot tugagach 2-si boshlanadi'],
               ['each', "\u{1F501} Har kirganda keyingisi", '1-kirish - 1-slot, 2-kirish - 2-slot']]
              .map(m => {
              const on = (a.importedAnimations.slotMode || 'all') === m[0];
              return `<button onclick="window._hbSetAction('importedAnimations','slotMode','${m[0]}');updateInspector()"
                style="background:${on ? 'rgba(var(--accent2-rgb),.18)' : 'transparent'};
                border:1px solid ${on ? 'var(--accent2)' : 'var(--border)'};
                color:${on ? 'var(--accent2)' : 'var(--muted)'};
                padding:5px 7px;border-radius:3px;cursor:pointer;text-align:left;
                font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700">
                ${m[1]}
                <div style="font-size:8px;font-weight:400;color:var(--muted);margin-top:2px">${m[2]}</div>
              </button>`;
            }).join('')}
          </div>
        </div>` : ''}

        ${!a.importedAnimations.playWhole ? `
        <div style="margin-bottom:8px">
          <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin-bottom:3px">
            ↻ LOOP KETAYOTGANDA QAYTA KIRILSA</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            ${[['stop', "⏹ To'xtaydi"], ['restart', '🔄 Boshidan']].map(([k, lbl]) => `
              <button onclick="window._hbSetAction('importedAnimations','loopRetrigger','${k}');updateInspector()"
                style="background:${(a.importedAnimations.loopRetrigger || 'stop') === k ? 'rgba(var(--accent4-rgb),.18)' : 'transparent'};
                border:1px solid ${(a.importedAnimations.loopRetrigger || 'stop') === k ? 'var(--accent4)' : 'var(--border)'};
                color:${(a.importedAnimations.loopRetrigger || 'stop') === k ? 'var(--accent4)' : 'var(--muted)'};
                padding:5px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;
                font-size:10px;font-weight:700">${lbl}</button>`).join('')}
          </div>
        </div>` : ''}

        ${(a.importedAnimations.slots || []).length === 0 ? `
          <div style="font-size:9px;color:var(--muted);padding:6px;text-align:center;font-style:italic">
            Slot yo'q. Quyidagi tugma bilan qo'shing.
          </div>
        ` : (a.importedAnimations.slots || []).map((slot, idx) => `
          <div style="border:1px solid var(--border);border-radius:3px;padding:6px 8px;margin-bottom:6px;background:rgba(0,0,0,.15)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;color:var(--accent2);font-family:'Share Tech Mono',monospace;letter-spacing:1px">
                SLOT ${idx + 1}${slot.sourceName ? ` — ${slot.sourceName}` : ''}
              </span>
              <button onclick="window._hbRemoveSlot(${idx})"
                style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);cursor:pointer;font-size:9px;padding:1px 6px;border-radius:2px" title="Slot o'chirish">
                ✕
              </button>
            </div>
            ${slot.sourceName ? `
              <div style="font-size:9px;color:var(--accent);padding:2px 0 4px">
                ✓ ${(slot.keyframes || []).length} keyframe, ${(slot.duration || 0).toFixed(2)}s
              </div>` : `
              <div style="font-size:9px;color:var(--muted);padding:2px 0 4px;font-style:italic">
                Fayl tanlanmagan
              </div>`}
            <div style="display:flex;gap:4px">
              <button class="action-btn" onclick="window._hbPickSlotFromTimeline(${idx})"
                style="flex:1;background:rgba(var(--accent4-rgb),.08);border-color:rgba(var(--accent4-rgb),.4);color:var(--accent4);font-size:10px;padding:3px 6px">
                🎬 Timeline'dan
              </button>
              <button class="action-btn" onclick="window._hbPickAnimForSlot(${idx})"
                style="flex:1;background:rgba(var(--accent2-rgb),.06);border-color:rgba(var(--accent2-rgb),.3);color:var(--accent2);font-size:10px;padding:3px 6px">
                📂 .json
              </button>
            </div>
            <button class="action-btn" onclick="window._hbPickSlotSound(${idx})"
              style="width:100%;margin-top:4px;background:rgba(255,107,53,.08);border-color:rgba(255,107,53,.35);color:#ff6b35;font-size:10px;padding:3px 6px">
              🔊 ${slot.soundName ? String(slot.soundName).replace(/[<>&"]/g, '') : 'Musiqa'}
            </button>
            <div class="fr" style="margin-top:4px">
              <span class="fl">Maqsad</span>
              <select onchange="window._hbSetSlotProp(${idx},'targetObjectId',this.value)" style="${SEL}">
                ${objOpts(slot.targetObjectId, null)}
              </select>
            </div>
            <div class="fr">
              <span class="fl">Tezlik</span>
              <input class="xi" style="width:50px" value="${slot.speed || 1.0}"
                     oninput="window._hbSetSlotProp(${idx},'speed',parseFloat(this.value)||1.0)">
              <span class="fl" style="margin-left:8px">Loop</span>
              <input type="checkbox" ${slot.loop ? 'checked' : ''}
                     onchange="window._hbSetSlotProp(${idx},'loop', this.checked)"
                     style="cursor:pointer">
            </div>
            ${(slot.keyframes && slot.keyframes.length) ? `
            <div style="margin-top:6px;border-top:1px solid var(--border);padding-top:5px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:9px;color:#ff3b6b;font-family:'Share Tech Mono',monospace;letter-spacing:1px">🔒 BLOKLASH (to'xtash)</span>
                <button onclick="window._hbPickBlockOnTimeline(${idx})"
                  style="background:rgba(255,59,107,.1);border:1px solid rgba(255,59,107,.4);color:#ff3b6b;font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">
                  🎯 Timelineда tanlash
                </button>
              </div>
              ${(slot.blocks && slot.blocks.length) ? slot.blocks.slice().sort((a,b)=>a.time-b.time).map(blk => `
                <div style="margin:3px 0;border:1px solid ${blk.loop?'rgba(var(--accent-rgb),.35)':'var(--border)'};border-radius:4px;padding:3px 4px">
                  <div class="fr" style="align-items:center;gap:4px">
                    <span class="fl" style="font-size:9px;min-width:52px;color:${blk.loop?'var(--accent)':'#ff3b6b'}">${blk.loop?'🔁':'⏸'} ${(blk.time||0).toFixed(2)}s</span>
                    <input readonly data-cur="${blk.key ? window._friendlyKey(blk.key) : (blk.loop?'⌨ sikl':'⌨ tugma')}"
                      value="${blk.key ? window._friendlyKey(blk.key) : (blk.loop?'⌨ sikl':'⌨ tugma')}"
                      onfocus="this.value='bosing...'"
                      onblur="this.value=this.getAttribute('data-cur')"
                      onkeydown="event.preventDefault();event.stopPropagation();window._hbSetBlockKey(${idx},${blk.time},event.code);this.blur();"
                      title="${blk.loop?'Sikl tugmasi (bumerang: orqaga-oldinga)':'Davom etish tugmasi'} (bosib klaviaturadan yozing)"
                      style="flex:1;text-align:center;cursor:pointer;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 0">
                    <button onclick="window._hbToggleLoop(${idx},${blk.time})" title="Sikl (loop) rejimini yoqish/o'chirish"
                      style="background:${blk.loop?'rgba(var(--accent-rgb),.18)':'none'};border:1px solid ${blk.loop?'var(--accent)':'var(--border)'};color:${blk.loop?'var(--accent)':'var(--muted)'};cursor:pointer;font-size:10px;padding:1px 5px;border-radius:2px">🔁</button>
                    <button onclick="window._hbToggleBlock(${idx},${blk.time},false)" title="Blokni o'chirish"
                      style="background:none;border:1px solid rgba(255,68,68,.3);color:var(--red);cursor:pointer;font-size:9px;padding:1px 5px;border-radius:2px">✕</button>
                  </div>
                  ${blk.loop ? `
                  <div class="fr" style="align-items:center;gap:4px;margin-top:3px">
                    <span class="fl" style="font-size:9px;min-width:52px;color:var(--accent)">↩ qaytish</span>
                    <input type="number" step="0.05" min="0" value="${(blk.loopBack||0).toFixed(2)}"
                      onchange="window._hbSetLoopBack(${idx},${blk.time},parseFloat(this.value)||0)"
                      title="Sikl boshlanish vaqti — bu vaqtga qaytib segment qayta o'ynaydi"
                      style="width:54px;text-align:center;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 0">
                    <input readonly data-cur="${blk.exitKey ? window._friendlyKey(blk.exitKey) : '⌨ davom'}"
                      value="${blk.exitKey ? window._friendlyKey(blk.exitKey) : '⌨ davom'}"
                      onfocus="this.value='bosing...'"
                      onblur="this.value=this.getAttribute('data-cur')"
                      onkeydown="event.preventDefault();event.stopPropagation();window._hbSetExitKey(${idx},${blk.time},event.code);this.blur();"
                      title="Davom tugmasi — bosilsa oldinga (5 ga) o'tadi"
                      style="flex:1;text-align:center;cursor:pointer;font-size:9px;background:var(--bg);border:1px solid rgba(var(--accent2-rgb),.4);color:var(--accent2);border-radius:3px;padding:2px 0">
                  </div>` : ''}
                </div>`).join('') : `
                <div style="font-size:9px;color:var(--muted);font-style:italic;padding:2px 0">Blok yo'q — "Timelineда tanlash" bilan qo'shing</div>`}
              <div style="font-size:8px;color:var(--muted);line-height:1.4;margin-top:3px">
                Belgilangan key'ga yetganda animatsiya <b style="color:#ff3b6b">to'xtaydi</b>. Davom etish uchun <b>⌨ tugma</b> bosiladi.<br>
                <b style="color:var(--accent)">🔁 Sikl</b> — <b>sikl</b> tugma bossa segment <b>orqaga</b> (t→<b>↩ qaytish</b>) so'ng o'zi <b>oldinga</b> qaytib o'ynaydi (masalan 4→3→4) va yana to'xtaydi; <b style="color:var(--accent2)">davom</b> tugma bossa oldinga (5 ga) o'tadi.
              </div>
            </div>` : ''}
          </div>
        `).join('')}

        <input type="file" id="hb-anim-file-input" accept=".json"
               style="display:none" onchange="window._hbHandleAnimFile(event)">
        <button class="action-btn" onclick="window._hbAddAnimSlot()"
          style="background:rgba(var(--accent-rgb),.08);border-color:rgba(var(--accent-rgb),.35);color:var(--accent);width:100%">
          + Yangi Slot Qo'shish
        </button>
        <div class="fr" style="align-items:center;margin-top:8px">
          <span class="fl">O'yinchini bloklash</span>
          <input type="checkbox" ${a.importedAnimations.lockPlayer ? 'checked' : ''}
                 onchange="window._hbSetAction('importedAnimations','lockPlayer', this.checked)"
                 style="cursor:pointer">
        </div>
        <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
          Reverse rejim yoqilgan bo'lsa — 2-marta faollashuvda barcha slotlar
          bir vaqtda teskariga ijro etiladi. Bloklash — barcha slotlar
          tugagunga qadar.
        </div>
      ` : `
        <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
          Bir nechta obyekt uchun animatsiya slotlari — cutscene, kombinatsiyalar
          va parallel harakatlar uchun.
        </div>`}
    </div>

    <!-- 7) Custom Logic Zone -->
    <div class="comp-block">
      ${featureHeader('customLogic', 'JS', 'var(--accent)', 'Maxsus Kod Zonasi')}
      ${(a.customLogic && a.customLogic.enabled) ? `
        <textarea id="hb-code"
          oninput="window._hbSetAction('customLogic','code',this.value)"
          style="width:100%;height:110px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none;resize:vertical;box-sizing:border-box"
        >${(a.customLogic.code || '').replace(/</g,'&lt;')}</textarea>
        <div class="fl" style="font-size:9px;color:var(--muted);padding:4px 0">
          Mavjud: <code style="color:var(--accent)">entity, hitbox, api, direction, THREE, scene, objects</code><br>
          <code style="color:var(--accent4)">direction</code> = 'forward' | 'reverse' (Reverse rejim yoqilgan bo'lsa)
        </div>` : ''}
    </div>

    <!-- Delete -->
    <div class="comp-block">
      <button class="action-btn del-btn" onclick="deleteSel()">✕ O'chirish</button>
    </div>
  `;
}
window.buildHitboxInspector = buildHitboxInspector;

// ============================================================
// Inspector callbacks (exposed on window for inline handlers)
// ============================================================

// ── 📦 Predmet sharti sozlagichlari ─────────────────────────
function _hbIrGet() {
  if (!selectedObj || !selectedObj.userData.isHitbox) return null;
  const ud = selectedObj.userData;
  if (!ud.itemReq) ud.itemReq = { enabled:false, itemId:null, mode:'carry', onDone:'consume', once:true };
  return ud.itemReq;
}

window._hbIrToggle = function() {
  const ir = _hbIrGet();
  if (!ir) return;
  ir.enabled = !ir.enabled;
  // Runtime holatini tozalaymiz — o'yin davomida almashtirilsa qotib qolmasin
  selectedObj.userData._irDone  = false;
  selectedObj.userData._irWasIn = false;
  updateInspector();
};

window._hbIrSet = function(prop, val) {
  const ir = _hbIrGet();
  if (!ir) return;
  ir[prop] = (prop === 'itemId') ? (val || null) : val;
  selectedObj.userData._irDone  = false;
  selectedObj.userData._irWasIn = false;
  // mode/onDone/itemId — tushuntirish matni va tugma rangi o'zgaradi
  if (prop !== 'once') updateInspector();
};

window._hbRename = function(name) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  selectedObj.userData.name = name || 'Hitbox';
  updateHierarchy();
};

window._hbSizeChanged = function() {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const x = parseFloat($('hb-sx') && $('hb-sx').value) || 2;
  const y = parseFloat($('hb-sy') && $('hb-sy').value) || 2;
  const z = parseFloat($('hb-sz') && $('hb-sz').value) || 2;
  selectedObj.userData.hitboxSize = { x, y, z };
  HitboxSystem.syncSize(selectedObj);
  // Re-sync selection outline to the new box geometry
  if (typeof outlineMesh !== 'undefined' && outlineMesh) {
    if (outlineMesh.geometry && outlineMesh.geometry.dispose) outlineMesh.geometry.dispose();
    outlineMesh.geometry = new THREE.BoxGeometry(x, y, z);
  }
};

window._hbTriggerChanged = function(v) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  selectedObj.userData.triggerType = v;
  if (selectedObj.userData._entitiesInside) selectedObj.userData._entitiesInside.clear();
};

window._hbCollisionChanged = function(v) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const ud = selectedObj.userData;
  ud.collisionMode = (v === 'block') ? 'block' : 'inline';
  // Sync the property that player.js actually reads.
  // 'inline' → player passes through (line 333 in player.js)
  // 'block'  → clear so player uses normal AABB collision
  if (ud.collisionMode === 'inline') {
    ud.colliderMode = 'inline';
  } else {
    delete ud.colliderMode;
  }
  // Clear inside tracking so switching mode doesn't leave stale "inside" state
  if (ud._entitiesInside) ud._entitiesInside.clear();
  // Update editor visual tint so the two modes are distinguishable
  if (ud._fillRef && ud._fillRef.material) {
    if (ud.collisionMode === 'block') {
      // Solid-looking tint for block mode
      ud._fillRef.material.color.setHex(0xff4444);
      ud._fillRef.material.opacity = 0.14;
    } else {
      // Original translucent orange for inline
      ud._fillRef.material.color.setHex(0xff8c00);
      ud._fillRef.material.opacity = 0.08;
    }
    ud._fillRef.material.needsUpdate = true;
  }
  log(`🔀 Hitbox rejim: ${ud.collisionMode === 'block' ? 'Block (solid)' : 'Inline (ghost)'}`, 'lok');
};

window._hbTargetChanged = function(v) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  selectedObj.userData.targetObjectId = v || null;
};

window._hbToggle = function(key) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions[key] = ud.actions[key] || { enabled: false };
  ud.actions[key].enabled = !ud.actions[key].enabled;
  updateInspector();
};

function _hbEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _hbStatZone() {
  if (!selectedObj || !selectedObj.userData.isHitbox) return null;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions.statZone = ud.actions.statZone || { enabled: true, mode: 'set', pSpeed: null, pJump: null, pStamina: null, pSprint: null, cMaxSpeed: null };
  return ud.actions.statZone;
}
window._hbSetStatMode = function(v) { const s = _hbStatZone(); if (s) s.mode = v; };
window._hbToggleStat = function(prop, on, defVal) {
  const s = _hbStatZone(); if (!s) return;
  s[prop] = on ? defVal : null;
  if (typeof updateInspector === 'function') updateInspector();
};
window._hbSetStat = function(prop, val) {
  const s = _hbStatZone(); if (!s) return;
  const n = parseFloat(val);
  s[prop] = isNaN(n) ? null : n;
};
window._hbSetHtmlContent = function(v) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions.htmlPage = ud.actions.htmlPage || { enabled: true, mode: 'show', content: '', position: 'bottom' };
  ud.actions.htmlPage.content = v;
};
// 👤 O'yinchi modeli uchun maxsus setter.
// _hbSetAction.bind(...) ni HTML onclick ichida ishlatib bo'lmaydi —
// ichidagi qo'shtirnoq atributni buzadi. Shuning uchun alohida wrapper.
window._hbSetPM = function(prop, val) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions.playerModel = ud.actions.playerModel || { enabled: true, mode: 'temp' };
  ud.actions.playerModel[prop] = val;
  if (prop === 'mode') updateInspector();   // rejim o'zgarsa panel qayta chiziladi
};

// Matn maydonlari uchun — `_hbSetAction` bilan bir xil, lekin nomi
// bilan aytib turadi: bu yerda inspektor QAYTA CHIZILMAYDI.
// (`_hbSetAction` ham chizmaydi, lekin `oninput` da uni ishlatganda
//  niyat noaniq ko'rinardi — textarea har harfda qayta yasalsa
//  kursor oxiriga sakrab ketardi.)
window._hbSetActionQuiet = function(key, prop, val) {
  window._hbSetAction(key, prop, val);
};

window._hbSetAction = function(key, prop, val) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions[key] = ud.actions[key] || { enabled: true };
  ud.actions[key][prop] = val;
};

// ── Hide-camera toggle — also flips the target camera's visibility
//    right away so the editor reflects the change without a play cycle.
window._hbHideCameraToggle = function(checked) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions.cameraAnim = ud.actions.cameraAnim || { enabled: true };
  ud.actions.cameraAnim.hideCameraAlways = !!checked;

  // Find the target camera (if picked) and apply the change now
  const camId = ud.actions.cameraAnim.cameraId;
  if (camId != null) {
    const tgt = objects.find(o => String(o.userData && o.userData.id) === String(camId));
    if (tgt) {
      if (checked) {
        tgt.userData._alwaysHidden = true;
        tgt.visible = false;
      } else {
        delete tgt.userData._alwaysHidden;
        tgt.visible = true;
      }
      log(`👁 Kamera '${tgt.userData.name}': ${checked ? 'yashirildi' : "ko'rsatildi"}`, 'lok');
    }
  }
};

// ── Reverse Mode toggle + setters ────────────────────────────
window._hbToggleReverse = function() {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const ud = selectedObj.userData;
  ud.reverseMode = ud.reverseMode ||
    { enabled: false, reverseSpeed: 1.0, resetOnLoad: true };
  ud.reverseMode.enabled = !ud.reverseMode.enabled;
  // Reset any lingering counter when toggling off (so re-enable starts fresh)
  if (!ud.reverseMode.enabled && typeof ReversePlaybackAPI !== 'undefined') {
    ReversePlaybackAPI.reset('hb_' + ud.id);
  }
  updateInspector();
};

window._hbSetReverse = function(prop, val) {
  if (!selectedObj || !selectedObj.userData.isHitbox) return;
  const ud = selectedObj.userData;
  ud.reverseMode = ud.reverseMode ||
    { enabled: false, reverseSpeed: 1.0, resetOnLoad: true };
  ud.reverseMode[prop] = val;
};

// ── Spawn Redirect — camera animation import (.json) ─────────
window._hbSpawnPickAnim = function() {
  // Detached input — inspector re-render (innerHTML) eski input'ni o'chirib
  // yuborishi va dialog "osilib qolishi" oldini oladi.
  const inp = document.createElement('input');
  inp.type   = 'file';
  inp.accept = '.json,application/json';
  inp.style.display = 'none';
  inp.onchange = window._hbSpawnHandleAnim;
  document.body.appendChild(inp);
  inp.click();
  setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
};

window._hbSpawnHandleAnim = function(event) {
  const file = event && event.target && event.target.files && event.target.files[0];
  if (!file || !selectedObj || !selectedObj.userData.isHitbox) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      let kfs = null;
      if (Array.isArray(data.keyframes)) kfs = data.keyframes;
      else if (Array.isArray(data.tracks) && data.tracks[0] && Array.isArray(data.tracks[0].keyframes)) kfs = data.tracks[0].keyframes;
      else if (data.timeline && Array.isArray(data.timeline.tracks) && data.timeline.tracks[0] && Array.isArray(data.timeline.tracks[0].keyframes)) kfs = data.timeline.tracks[0].keyframes;
      if (!Array.isArray(kfs) || kfs.length === 0) { log("⚠ Faylda keyframe topilmadi", 'lw'); return; }

      const ud = selectedObj.userData;
      ud.actions = ud.actions || {};
      ud.actions.spawnRedirect = ud.actions.spawnRedirect || { enabled: true };
      ud.actions.spawnRedirect.preAnimKeyframes    = kfs;
      ud.actions.spawnRedirect.preAnimKfSourceName = file.name;

      log(`✅ Spawn kamera animatsiyasi: <b>${file.name}</b> — ${kfs.length} keyframe`, 'lok');
      updateInspector();
    } catch(err) {
      log(`❌ Faylni o'qib bo'lmadi: ${err.message}`, 'le');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
};
// Slot state lives in userData.actions.importedAnimations.slots[].
// Each slot is: { id, sourceName, keyframes, duration, targetObjectId, speed, loop }
// The file picker uses a global cursor `_hbActiveSlotIdx` so a single
// <input type="file"> element can be reused for every slot.
let _hbActiveSlotIdx = null;
let _hbSlotIdCounter = 1;

function _hbGetSlots() {
  if (!selectedObj || !selectedObj.userData.isHitbox) return null;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions.importedAnimations = ud.actions.importedAnimations ||
    { enabled: true, slots: [], slotMode: 'all' };
  if (!Array.isArray(ud.actions.importedAnimations.slots)) {
    ud.actions.importedAnimations.slots = [];
  }
  return ud.actions.importedAnimations.slots;
}

window._hbAddAnimSlot = function() {
  const slots = _hbGetSlots();
  if (!slots) return;
  slots.push({
    id:             _hbSlotIdCounter++,
    sourceName:     '',
    keyframes:      [],
    duration:       0,
    targetObjectId: selectedObj.userData.targetObjectId || null,
    speed:          1.0,
    loop:           false,
    soundUrl:       null,
    soundName:      '',
  });
  log(`+ Slot ${slots.length} qo'shildi`, 'lok');
  updateInspector();
};

/**
 * 🎬 Slotga TIMELINE dan animatsiya olish.
 *
 * ⚠ NEGA KERAK: ilgari faqat `.json` fayl orqali olinardi — ya'ni
 *   dizayner o'zi yasagan animatsiyani AVVAL eksport qilib, keyin
 *   qaytadan import qilishi kerak edi. Holbuki u allaqachon
 *   timelineда turibdi.
 *
 * ⚠ Keyframelar NUSXA olinadi: timeline keyin o'zgarsa ham slot
 *   ishlashda davom etadi (🔘 tugmadagi bilan bir xil qoida).
 */
window._hbPickSlotFromTimeline = function(idx) {
  const slots = _hbGetSlots();
  if (!slots || !slots[idx]) return;
  if (typeof TimelineSystem === 'undefined' || !TimelineSystem.tracks) {
    log('⚠ Timeline tizim topilmadi', 'lw'); return;
  }
  // ── 🎨 MAXSUS TREKLAR HAM RO'YXATGA TUSHADI ──────────────────
  //  ⚠ Ilgari ular ATAYLAB chiqarib tashlangandi
  //    (`!t.isFilter && !t.isWeather && …`). Ya'ni 🎯 hitbox bilan
  //    filtr yoki ob-havo animatsiyasini ishga tushirib bo'lmasdi —
  //    trek timelineda turardi, lekin ro'yxatda ko'rinmasdi.
  //    Foydalanuvchi buni "filtrdagi key ishlamayapti" deb ko'rardi.
  //
  //  Ular butun sahnaga ta'sir qiladi, ya'ni nishon obyekti yo'q —
  //  slotga `trackKind` yoziladi va ijro shunga qarab boradi.
  //  ⚠ RO'YXAT BIRMA-BIR SANALGAN va yangi treklar unga
  //    qo'shilmagandi. Alomat: 🎯 hitbox SLOTIGA 💻 PC kamerasi yoki
  //    💻 PC filtri treki qo'yilsa
  //    ISHLAMASDI — `KIND_OF` `null` qaytarib, ular ODDIY obyekt
  //    treki deb hisoblanardi va `objRef` topilmagani uchun jimgina
  //    tashlanardi. Butun timeline'ni ishga tushirsa esa ishlardi.
  const KIND_OF = t => t.isFilter ? 'filter' : t.isWeather ? 'weather'
                     : t.isSkybox ? 'skybox' : t.isKino ? 'kino'
                     : t.isZoom   ? 'zoom'
                     : t.isPCCam  ? 'pccam'  : t.isPCFx ? 'pcfx' : null;
  const KIND_LBL = { filter: '🎨 Filtr', weather: '🌦 Ob-havo',
                     skybox: '🌌 Skybox', kino: '🎬 Kino kamera', zoom: '🔍 Zoom',
                     pccam: '💻📷 PC kamerasi', pcfx: '💻🎛 PC filtri' };

  const usable = (TimelineSystem.tracks || []).filter(t => t.keyframes && t.keyframes.length);
  if (!usable.length) { log("⚠ Timeline'da keyframe'li trek yo'q — avval I bilan kalit qo'ying", 'lw'); return; }

  const old = document.getElementById('hb-tl-pick');
  if (old) old.remove();
  const back = document.createElement('div');
  back.id = 'hb-tl-pick';
  back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;' +
                       'align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  back.onclick = e => { if (e.target === back) back.remove(); };
  back.innerHTML = `<div style="background:#151b25;border:1px solid rgba(var(--accent4-rgb),.45);border-radius:6px;
    padding:14px 16px;min-width:320px;max-height:70vh;overflow:auto;font-family:'Share Tech Mono',monospace;color:#eee">
    <div style="font-size:12px;letter-spacing:1.5px;color:var(--accent4);font-weight:700;margin-bottom:10px">🎬 TIMELINE'DAN TANLASH</div>
    ${usable.map((t, k) => {
      const kd = KIND_OF(t);
      const obj = kd ? null : objects.find(o => String(o.userData?.id) === String(t.objId));
      const nm = kd ? KIND_LBL[kd]
                    : ((obj && obj.userData.name) || ('Obyekt #' + t.objId));
      return `<button data-i="${k}" style="display:block;width:100%;text-align:left;margin-bottom:4px;
        background:rgba(var(--accent4-rgb),.07);border:1px solid rgba(var(--accent4-rgb),.25);color:#eee;padding:8px 10px;
        border-radius:3px;cursor:pointer;font-family:inherit;font-size:11px">▪ ${nm}
        <span style="color:#888">— ${t.keyframes.length} key${t.loop ? ' · 🔁' : ''}</span></button>`;
    }).join('')}
  </div>`;
  back.querySelectorAll('[data-i]').forEach(b => {
    b.onclick = () => {
      const tr = usable[+b.dataset.i];
      const kd = KIND_OF(tr);
      const obj = kd ? null : objects.find(o => String(o.userData?.id) === String(tr.objId));
      const s = slots[idx];
      s.keyframes = JSON.parse(JSON.stringify(tr.keyframes));
      // 🎨 Maxsus trekda nishon YO'Q — turini yozamiz.
      //    ⚠ `trackKind` `_` SIZ: u saqlanishi SHART, aks holda
      //      sahna qayta ochilganda slot oddiy obyekt treki deb
      //      hisoblanib, yana ishlamay qolardi.
      s.trackKind = kd || null;
      //  ⚠ EGASINING ID si HAM saqlanadi. 💻 PC treklari
      //    \"qaysi obyekt?\" degan savolga javob talab qiladi — busiz
      //    `applyPCCanvasKF` ularni jimgina tashlab yuborardi va slot
      //    ishlayotgandek ko'rinib, hech nima o'zgarmasdi.
      //  ⚠ `_` SIZ: sahna bilan saqlanishi shart.
      s.trackPcId = tr.pcId ?? null;
      s.targetObjectId = kd ? null : tr.objId;
      s.sourceName = kd ? KIND_LBL[kd]
                        : ((obj && obj.userData.name) || ('Obyekt #' + tr.objId));
      const ts = tr.keyframes.map(k => k.time || 0);
      s.duration = Math.max(...ts) - Math.min(...ts);
      // ⚠ Trekning O'Z loopi ham ko'chadi — dizayner uni timelineda
      //   qo'ygan bo'lsa, slotda ham o'shani kutadi.
      if (tr.loop) s.loop = true;
      back.remove();
      log(`🎬 Slot ${idx + 1} → "${s.sourceName}" (${s.keyframes.length} key)`, 'lok');
      updateInspector();
    };
  });
  document.body.appendChild(back);
};

/**
 * 🔊 Slotga musiqa.
 * ⚠ `readAsDataURL` — `AssetBundle` faylni `data:audio/…` ko'rinishidan
 *   tanib ZIP dagi `sound/` papkasiga chiqaradi.
 */
window._hbPickSlotSound = function(idx) {
  const slots = _hbGetSlots();
  if (!slots || !slots[idx]) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'audio/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      slots[idx].soundUrl  = String(rd.result || '');
      slots[idx].soundName = f.name;
      log(`🔊 Slot ${idx + 1} → "${f.name}"`, 'lok');
      updateInspector();
    };
    rd.readAsDataURL(f);
  };
  inp.click();
};

window._hbRemoveSlot = function(idx) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  const removed = slots.splice(idx, 1)[0];
  // Stop any playback tied to this slot (best-effort — handles aren't
  // per-slot indexed, so we cancel all and let the next trigger restart)
  if (Array.isArray(selectedObj.userData._importAnimHandles)) {
    selectedObj.userData._importAnimHandles.forEach(h => {
      if (h && h.stop) { try { h.stop(); } catch(e) {} }
    });
    selectedObj.userData._importAnimHandles = [];
  }
  log(`✕ Slot ${idx + 1} o'chirildi${removed.sourceName ? ` (${removed.sourceName})` : ''}`, 'lw');
  updateInspector();
};

window._hbSetSlotProp = function(idx, prop, val) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  slots[idx][prop] = val;
};

// ── ⏱ Timer payload — tracks / sounds / imports ──────────────
function _hbGetTimer() {
  if (!selectedObj || !selectedObj.userData.isHitbox) return null;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions.timer = ud.actions.timer || { enabled: false, delay: 3.0, auto: false };
  const tm = ud.actions.timer;
  if (!Array.isArray(tm.tracks))  tm.tracks  = [];
  if (!Array.isArray(tm.sounds))  tm.sounds  = [];
  if (!Array.isArray(tm.imports)) tm.imports = [];
  if (!tm.collision) tm.collision = 'original';
  return tm;
}
window._hbTimerAddTrack    = function()    { const t=_hbGetTimer(); if(!t)return; t.tracks.push(''); updateInspector(); };
window._hbTimerSetTrack    = function(i,v) { const t=_hbGetTimer(); if(!t||i<0||i>=t.tracks.length)return; t.tracks[i]=v; };
window._hbTimerRemoveTrack = function(i)   { const t=_hbGetTimer(); if(!t||i<0||i>=t.tracks.length)return; t.tracks.splice(i,1); updateInspector(); };
window._hbTimerAddSound    = function()    { const t=_hbGetTimer(); if(!t)return; t.sounds.push('coin'); updateInspector(); };
window._hbTimerSetSound    = function(i,v) { const t=_hbGetTimer(); if(!t||i<0||i>=t.sounds.length)return; t.sounds[i]=v; };
window._hbTimerRemoveSound = function(i)   { const t=_hbGetTimer(); if(!t||i<0||i>=t.sounds.length)return; t.sounds.splice(i,1); updateInspector(); };
window._hbTimerAddImport   = function()    {
  const t=_hbGetTimer(); if(!t)return;
  t.imports.push({ id:_hbSlotIdCounter++, sourceName:'', keyframes:[], duration:0,
                   targetObjectId:(selectedObj.userData.targetObjectId||null), speed:1.0, loop:false });
  updateInspector();
};
window._hbTimerRemoveImport = function(i) {
  const t=_hbGetTimer(); if(!t||i<0||i>=t.imports.length)return;
  t.imports.splice(i,1);
  if(Array.isArray(selectedObj.userData._timerImportHandles)){
    selectedObj.userData._timerImportHandles.forEach(h=>{ if(h&&h.stop){try{h.stop();}catch(e){}} });
    selectedObj.userData._timerImportHandles=[];
  }
  updateInspector();
};
window._hbTimerSetImportProp = function(i,prop,val){ const t=_hbGetTimer(); if(!t||i<0||i>=t.imports.length)return; t.imports[i][prop]=val; };

// ── 📦 Scene ZIP payload getter + list funksiyalari ──────────
function _hbGetSceneZip() {
  if (!selectedObj || !selectedObj.userData.isHitbox) return null;
  const ud = selectedObj.userData;
  ud.actions = ud.actions || {};
  ud.actions.sceneZip = ud.actions.sceneZip || { enabled: false, imports: [], sounds: [] };
  const sz = ud.actions.sceneZip;
  if (!Array.isArray(sz.imports)) sz.imports = [];
  if (!Array.isArray(sz.sounds))  sz.sounds  = [];
  return sz;
}
window._hbSceneZipRemoveImport = function(i){
  const sz=_hbGetSceneZip(); if(!sz||i<0||i>=sz.imports.length)return;
  sz.imports.splice(i,1);
  if(Array.isArray(selectedObj.userData._sceneZipHandles)){
    selectedObj.userData._sceneZipHandles.forEach(h=>{if(h&&h.stop){try{h.stop();}catch(e){}}});
    selectedObj.userData._sceneZipHandles=[];
  }
  updateInspector();
};
window._hbSceneZipRemoveSound = function(i){
  const sz=_hbGetSceneZip(); if(!sz||i<0||i>=sz.sounds.length)return;
  sz.sounds.splice(i,1); updateInspector();
};
window._hbSceneZipSetImportProp = function(i,prop,val){
  const sz=_hbGetSceneZip(); if(!sz||i<0||i>=sz.imports.length)return;
  sz.imports[i][prop]=val;
};

let _hbTimerActiveImport = null;
window._hbTimerPickImportFile = function(i){
  _hbTimerActiveImport = i;
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json,application/json'; inp.style.display='none';
  inp.onchange = window._hbTimerHandleImportFile;
  document.body.appendChild(inp); inp.click();
  setTimeout(()=>{ if(inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
};
window._hbTimerHandleImportFile = function(event){
  const file = event && event.target && event.target.files && event.target.files[0];
  if(!file) return;
  const t=_hbGetTimer(); if(!t){ log("⚠ Hitbox tanlanmagan",'lw'); return; }
  const idx = (_hbTimerActiveImport!=null && _hbTimerActiveImport<t.imports.length)
    ? _hbTimerActiveImport : t.imports.length-1;
  if(idx<0){ log("⚠ Avval import qo'shing",'lw'); return; }
  _hbTimerActiveImport=null;
  const reader=new FileReader();
  reader.onload = e => {
    try{
      const data=JSON.parse(e.target.result);
      let kfs=null, srcId=null, srcName=null;
      if(Array.isArray(data.keyframes)){
        kfs=data.keyframes;
        srcId=(data.object&&data.object.id!=null)?data.object.id:null;
        srcName=(data.object&&data.object.name!=null)?data.object.name:null;
      } else if(Array.isArray(data.tracks)&&data.tracks[0]&&Array.isArray(data.tracks[0].keyframes)){
        const tr=data.tracks[0]; kfs=tr.keyframes; srcId=(tr.objId??null); srcName=(tr.objName??null);
      } else if(data.timeline&&Array.isArray(data.timeline.tracks)&&data.timeline.tracks[0]&&Array.isArray(data.timeline.tracks[0].keyframes)){
        const tr=data.timeline.tracks[0]; kfs=tr.keyframes; srcId=(tr.objId??null); srcName=(tr.objName??null);
      }
      if(!Array.isArray(kfs)||kfs.length===0){ log("⚠ Faylda keyframe topilmadi",'lw'); return; }
      const times=kfs.map(k=>(typeof k.time==='number')?k.time:0);
      const slot=t.imports[idx];
      slot.sourceName=file.name; slot.keyframes=kfs; slot.duration=Math.max(...times)-Math.min(...times);
      let autoId=null;
      if(srcId!=null){ const byId=objects.find(o=>String(o.userData&&o.userData.id)===String(srcId)); if(byId) autoId=byId.userData.id; }
      if(autoId==null&&srcName){ const byName=objects.find(o=>o.userData&&o.userData.name===srcName); if(byName) autoId=byName.userData.id; }
      if(autoId!=null) slot.targetObjectId=autoId;
      else if(!slot.targetObjectId) slot.targetObjectId=selectedObj.userData.targetObjectId||null;
      log(`✓ Timer import: ${file.name} (${kfs.length} keyframe)`, 'lok');
      updateInspector();
    }catch(err){ log("⚠ JSON o'qishda xato: "+err.message,'lw'); }
  };
  reader.readAsText(file);
};

// ── 📦 Scene ZIP import — Timeline "ZIP eksport"ini hitboxga import ─────
//    Zip ichidagi obyektlar (primitiv + GLB) o'z koordinatalarida SPAWN
//    bo'ladi (tekstura/rang bilan), ularning timeline animatsiyalari
//    timer'ning import slotlariga qo'shiladi, ovozlar ro'yxatga olinadi.
//    Natijada: import → obyektlar paydo bo'ladi; o'yinchi kirsa/auto →
//    animatsiya + ovoz ijro etiladi.
function _hbPrimGeo(type) {
  if (typeof PRIMITIVES !== 'undefined') {
    const p = PRIMITIVES.find(pr => pr.name === type);
    if (p) { try { return p.geo(); } catch(e) {} }
  }
  return new THREE.BoxGeometry(1, 1, 1);
}

// ── 📂 Kamera animatsiyasi import (.json) — cameraAnim uchun ──────
window._hbCamAnimImport = function() {
  if (!selectedObj || !selectedObj.userData.isHitbox) { log('⚠ Hitbox tanlanmagan', 'lw'); return; }
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json'; inp.style.display = 'none';
  inp.onchange = window._hbCamAnimHandleFile;
  document.body.appendChild(inp); inp.click();
  setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
};
window._hbCamAnimHandleFile = function(event) {
  const file = event && event.target && event.target.files && event.target.files[0];
  if (!file) return;
  if (!selectedObj || !selectedObj.userData.isHitbox) { log('⚠ Hitbox tanlanmagan', 'lw'); return; }
  const hostHb = selectedObj;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      let kfs = null, srcName = null;
      if (Array.isArray(data.keyframes)) { kfs = data.keyframes; srcName = (data.object && data.object.name) || null; }
      else if (Array.isArray(data.tracks) && data.tracks[0] && Array.isArray(data.tracks[0].keyframes)) { kfs = data.tracks[0].keyframes; srcName = data.tracks[0].objName || null; }
      else if (data.timeline && Array.isArray(data.timeline.tracks) && data.timeline.tracks[0]) { kfs = data.timeline.tracks[0].keyframes; srcName = data.timeline.tracks[0].objName || null; }
      if (!Array.isArray(kfs) || !kfs.length) { log('⚠ Faylda keyframe topilmadi', 'lw'); return; }
      if (typeof addCameraObject !== 'function') { log('⚠ Kamera tizimi topilmadi', 'lw'); return; }

      // Yangi kamera-obyekt yaratamiz
      const cam = addCameraObject();
      cam.userData.name = (srcName ? (srcName + ' (import)') : 'Kamera (import)');
      const k0 = kfs[0];
      if (k0 && k0.pos) cam.position.set(k0.pos.x, k0.pos.y, k0.pos.z);
      if (k0 && k0.rot) cam.rotation.set(k0.rot.x, k0.rot.y, k0.rot.z);

      // Keyframe'larni kameraning timeline trekiga qo'yamiz
      if (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) {
        const ex = TimelineSystem.tracks.findIndex(t => t.objRef === cam || String(t.objId) === String(cam.userData.id));
        const track = { objId: cam.userData.id, objName: cam.userData.name, objRef: cam, keyframes: kfs };
        if (ex >= 0) TimelineSystem.tracks[ex] = track; else TimelineSystem.tracks.push(track);
      }

      // Hitbox cameraAnim'ga bog'laymiz
      hostHb.userData.actions = hostHb.userData.actions || {};
      hostHb.userData.actions.cameraAnim = hostHb.userData.actions.cameraAnim || {};
      hostHb.userData.actions.cameraAnim.enabled      = true;
      hostHb.userData.actions.cameraAnim.cameraId     = cam.userData.id;
      hostHb.userData.actions.cameraAnim.continuePath = true;

      log(`✓ Kamera animatsiyasi import: ${file.name} (${kfs.length} keyframe)`, 'lok');
      if (typeof selectObject === 'function') selectObject(hostHb);   // host hitboxni qaytadan tanlaymiz
      if (typeof TimelineSystem !== 'undefined' && TimelineSystem.render) { try { TimelineSystem.render(); } catch(e2) {} }
      updateInspector();
    } catch(err) { log("⚠ JSON o'qishda xato: " + err.message, 'lw'); }
  };
  reader.readAsText(file);
};

window._hbImportSceneZip = function() {
  if (!selectedObj || !selectedObj.userData.isHitbox) { log('⚠ Hitbox tanlanmagan', 'lw'); return; }
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.zip,application/zip'; inp.style.display = 'none';
  inp.onchange = (e) => {
    const f = e.target && e.target.files && e.target.files[0];
    if (f) _hbHandleSceneZip(f);
    if (inp.parentNode) inp.parentNode.removeChild(inp);
  };
  document.body.appendChild(inp);
  inp.click();
  setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
};

async function _hbHandleSceneZip(file) {
  if (!selectedObj || !selectedObj.userData.isHitbox) { log('⚠ Hitbox tanlanmagan', 'lw'); return; }
  if (typeof JSZip === 'undefined') { log('❌ JSZip mavjud emas', 'le'); return; }
  const sz = _hbGetTimer(); if (!sz) return;   // Timer payload'iga qo'shamiz (imports/sounds)
  const hostHb = selectedObj;   // spawn funksiyalari selectObject chaqiradi — oxirida qaytaramiz
  try {
    log("📦 Scene ZIP o'qilmoqda…", 'lw');
    const zip = await JSZip.loadAsync(file);
    const mf = zip.file('timeline.json');
    if (!mf) { log("❌ timeline.json topilmadi — bu Timeline ZIP eksporti emas", 'le'); return; }
    const manifest = JSON.parse(await mf.async('string'));
    if (!Array.isArray(manifest.objects)) { log("❌ Manifest formati noto'g'ri", 'le'); return; }

    // 1) GLB model bufferlarini oldindan yuklaymiz
    const modelBufs = {};
    for (const m of ((manifest.assets && manifest.assets.models) || [])) {
      const f = zip.file(m.file);
      if (f) { try { modelBufs[m.file] = await f.async('arraybuffer'); } catch(e) {} }
    }
    const loader = (typeof getGLTFLoader === 'function') ? getGLTFLoader() : null;

    // 2) Obyektlarni spawn qilamiz.
    //    Hitbox/Kamera/Interaktiv-tugma — o'z tizimlari orqali HAQIQIY
    //    obyekt qilib qayta yaratiladi (kub bo'lib qolmaydi). Primitiv/GLB —
    //    to'g'ridan-to'g'ri.
    const idMap = {};   // eski objId -> yangi obyekt
    let spawned = 0;
    for (const od of manifest.objects) {
      // Host hitboxning O'ZINI qayta yaratmaymiz (agar zipda bo'lsa ham)
      let obj = null;
      let alreadyAdded = false;   // create funksiyalari scene+objects ga qo'shsa true
      let isPrimitive  = false;

      if (od.isHitbox || od.type === 'Hitbox') {
        // ── Haqiqiy hitbox ──
        if (typeof HitboxSystem !== 'undefined' && HitboxSystem.create) {
          const nh = HitboxSystem.create(new THREE.Vector3(
            od.position ? od.position.x : 0, od.position ? od.position.y : 1, od.position ? od.position.z : 0));
          nh.userData.name = od.name || nh.userData.name;
          if (od.hitboxSize)          nh.userData.hitboxSize    = od.hitboxSize;
          if (od.triggerType)         nh.userData.triggerType   = od.triggerType;
          if (od.collisionMode)       nh.userData.collisionMode = od.collisionMode;
          if (od.targetObjectId != null) nh.userData.targetObjectId = od.targetObjectId;
          if (od.actions) {
            try { nh.userData.actions = Object.assign({}, nh.userData.actions, JSON.parse(JSON.stringify(od.actions))); } catch(e) {}
          }
          if (nh.userData.hitboxSize && typeof HitboxSystem.syncSize === 'function') {
            try { HitboxSystem.syncSize(nh); } catch(e) {}
          }
          obj = nh; alreadyAdded = true;
        }
      } else if (od.isCamera || od.type === 'Kamera') {
        // ── Haqiqiy kamera obyekti ──
        if (typeof addCameraObject === 'function') {
          const nc = addCameraObject();
          nc.userData.name = od.name || nc.userData.name;
          if (od.fov  != null) nc.userData.fov  = od.fov;
          if (od.near != null) nc.userData.near = od.near;
          if (od.far  != null) nc.userData.far  = od.far;
          obj = nc; alreadyAdded = true;
        }
      } else if (od.type === 'InteractiveBtn' || od.isButton) {
        // ── Interaktiv tugma ──
        if (typeof InteractiveButtonSystem !== 'undefined' && InteractiveButtonSystem.create) {
          obj = InteractiveButtonSystem.create(new THREE.Vector3(
            od.position ? od.position.x : 0, od.position ? od.position.y : 1, od.position ? od.position.z : 0));
          if (obj) { obj.userData.name = od.name || obj.userData.name; alreadyAdded = true; }
        } else if (typeof addInteractiveButton === 'function') {
          obj = addInteractiveButton();
          if (obj) alreadyAdded = true;
        }
      } else if (od.isGLB || od.type === 'GLB') {
        // ── GLB model — zip'dan to'g'ridan yuklaymiz; yuklanmasa O'TKAZAMIZ (kub qilmaymiz) ──
        const mfile  = od.modelFile;
        const mentry = mfile ? zip.file(mfile) : null;
        if (mentry && loader) {
          let buf = modelBufs[mfile];
          if (!buf) { try { buf = await mentry.async('arraybuffer'); } catch(e) { buf = null; } }
          if (buf) {
            obj = await new Promise(res => {
              try {
                loader.parse(buf, '', gltf => {
                  const wrapper = new THREE.Group();
                  wrapper.add(gltf.scene);
                  wrapper.traverse(ch => { if (ch.isMesh || ch.isSkinnedMesh) { ch.castShadow = true; ch.receiveShadow = true; } });
                  res(wrapper);
                }, () => { log(`⚠ GLB parse xato: ${od.name}`, 'lw'); res(null); });
              } catch(e) { res(null); }
            });
            if (obj) obj.userData = { id: ++objIdC, name: od.name, type: 'GLB', isGLB: true };
          }
        }
        if (!obj) { log(`⚠ GLB yuklanmadi (o'tkazildi): ${od.name} — ${mfile || 'model yo\'q'}`, 'lw'); continue; }
      } else {
        // ── Primitiv (Kub, Sfera, ...) ──
        const geo = _hbPrimGeo(od.type || od.name);
        const mat = new THREE.MeshStandardMaterial({
          color:     od.color != null ? od.color : '#cccccc',
          roughness: od.roughness != null ? od.roughness : 0.6,
          metalness: od.metalness != null ? od.metalness : 0.1,
        });
        obj = new THREE.Mesh(geo, mat);
        obj.castShadow = true; obj.receiveShadow = true;
        obj.userData = { id: ++objIdC, name: od.name, type: od.type || 'Mesh' };
        isPrimitive = true;
      }
      if (!obj) continue;

      // Pozitsiya / rotatsiya / masshtab (barcha turlar uchun)
      if (od.position) obj.position.set(od.position.x, od.position.y, od.position.z);
      if (od.rotation) obj.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
      if (od.scale)    obj.scale.set(od.scale.x, od.scale.y, od.scale.z);

      // GLB uchun real bounding box'dan collider o'lchami (ulkan scale qutilari bo'lmasin)
      if (obj.userData.isGLB) {
        try {
          obj.updateMatrixWorld(true);
          const _bb = new THREE.Box3().setFromObject(obj);
          const _sz = _bb.getSize(new THREE.Vector3());
          const _sx = obj.scale.x || 1, _sy = obj.scale.y || 1, _sz2 = obj.scale.z || 1;
          obj.userData.colliderSize = { x: _sz.x / _sx, y: _sz.y / _sy, z: _sz.z / _sz2 };
        } catch(e) {}
      }

      // Tekstura — faqat primitivlar (zip ichidan)
      if (isPrimitive && od.textureFile && obj.material && zip.file(od.textureFile)) {
        try {
          const b64 = await zip.file(od.textureFile).async('base64');
          const ext = (od.textureFile.split('.').pop() || 'png').toLowerCase();
          const url = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${b64}`;
          const tex = new THREE.TextureLoader().load(url);
          if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
          obj.material.map = tex; obj.material.needsUpdate = true;
        } catch(e) {}
      }

      if (!alreadyAdded) { scene.add(obj); objects.push(obj); }
      // To'qnashuv rejimi:
      //   hitbox/kamera/tugma — doim inline (trigger/dekoratsiya)
      //   collision='inline'|'block' — hammasini majburan o'sha rejimga
      //   collision='original' (default) — HAR OBYEKT o'z rejimini saqlaydi
      //     (eksportdagi colliderMode; yo'q bo'lsa engine default = block)
      const _isHb  = od.isHitbox || od.type === 'Hitbox';
      const _isCam = od.isCamera || od.type === 'Kamera';
      const _isBtn = od.type === 'InteractiveBtn' || od.isButton;
      let _mode;
      // ⚠ Tugma endi ISTISNO EMAS: Inspektorda 👻 INLINE / 🧱 BLOCK tanlanadi,
      //   shuning uchun uni majburan inline qilib tanlovni bekor qilmaymiz.
      //   Hitbox va kamera esa har doim o'tkazuvchi bo'lishi kerak.
      if (_isHb || _isCam)                  _mode = 'inline';
      else if (_isBtn)                      _mode = (od.colliderMode === 'inline') ? 'inline' : 'block';
      else if (sz.collision === 'inline')   _mode = 'inline';
      else if (sz.collision === 'block')    _mode = 'block';
      else                                  _mode = (od.colliderMode === 'inline') ? 'inline' : 'block';
      if (_mode === 'inline') obj.userData.colliderMode = 'inline';
      else delete obj.userData.colliderMode;   // block (o'yinchi to'qnashadi)
      idMap[String(od.id)] = obj;
      spawned++;
    }

    // Recreated hitbox action target id'larini yangi obyektlarga bog'laymiz
    const _remapId = (oldId) => {
      if (oldId == null || oldId === '') return oldId;
      const o = idMap[String(oldId)];
      return o ? o.userData.id : oldId;
    };
    for (const k in idMap) {
      const o = idMap[k];
      if (!o.userData || !o.userData.isHitbox) continue;
      if (o.userData.targetObjectId != null) o.userData.targetObjectId = _remapId(o.userData.targetObjectId);
      const aa = o.userData.actions; if (!aa) continue;
      if (aa.importedAnimations && Array.isArray(aa.importedAnimations.slots))
        aa.importedAnimations.slots.forEach(s => { if (s && s.targetObjectId != null) s.targetObjectId = _remapId(s.targetObjectId); });
      if (aa.timer) {
        if (Array.isArray(aa.timer.imports)) aa.timer.imports.forEach(s => { if (s && s.targetObjectId != null) s.targetObjectId = _remapId(s.targetObjectId); });
        if (Array.isArray(aa.timer.tracks))  aa.timer.tracks  = aa.timer.tracks.map(t => _remapId(t));
      }
      if (aa.timelinePlay && aa.timelinePlay.targetTrackId != null)
        aa.timelinePlay.targetTrackId = _remapId(aa.timelinePlay.targetTrackId);
    }

    // 3) Timeline treklarini timer import slotlariga qo'shamiz
    let animCount = 0;
    for (const tr of ((manifest.timeline && manifest.timeline.tracks) || [])) {
      const target = idMap[String(tr.objId)];
      if (!target || !Array.isArray(tr.keyframes) || !tr.keyframes.length) continue;
      const times = tr.keyframes.map(k => (typeof k.time === 'number') ? k.time : 0);
      sz.imports.push({
        id:             _hbSlotIdCounter++,
        sourceName:     `${file.name} → ${tr.objName || ('obj ' + tr.objId)}`,
        keyframes:      tr.keyframes,
        duration:       Math.max(...times) - Math.min(...times),
        targetObjectId: target.userData.id,
        speed:          1.0,
        loop:           !!tr.loop,
      });
      animCount++;
    }

    // 4) Ovozlar (best-effort — SoundSystem kontekstida dekod qilamiz)
    let sndCount = 0;
    const sctx = (typeof SoundSystem !== 'undefined' && SoundSystem.listener && SoundSystem.listener.context)
      ? SoundSystem.listener.context : null;
    for (const sd of ((manifest.assets && manifest.assets.sounds) || [])) {
      const f = zip.file(sd.file); if (!f) continue;
      if (sz.sounds.indexOf(sd.name) === -1) {
        if (sctx && typeof SoundSystem._reg === 'function') {
          try {
            const buf = await f.async('arraybuffer');
            const audioBuf = await sctx.decodeAudioData(buf.slice(0));
            // ⚠ ASL BAYTLAR. Busiz zanjir uzilardi: paketdan ovoz keladi →
            //   sahna saqlanadi → `src` yo'qligi uchun ovoz YOZILMAYDI →
            //   sahna qayta ochilganda jimjit. (GLB `_glbBuffer` bilan
            //   bir xil naqsh.)
            let _src = null;
            try {
              const _ext = String(sd.file || '').split('.').pop().toLowerCase();
              const _mime = _ext === 'wav' ? 'audio/wav' : _ext === 'ogg' ? 'audio/ogg'
                          : _ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg';
              if (typeof window._abToDataUrl === 'function') _src = window._abToDataUrl(buf, _mime);
            } catch (e1) {}
            SoundSystem._reg(sd.name, audioBuf, { src: _src, fileName: sd.file, builtin: false });
          } catch(e) { /* dekod bo'lmasa ham nomni qo'shamiz */ }
        }
        sz.sounds.push(sd.name); sndCount++;
      }
    }

    // 5) Scene ZIP amalini yoqamiz va UI'ni yangilaymiz
    sz.enabled = true;
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof updateStats === 'function') updateStats();
    if (typeof captureState === 'function') { try { captureState('Scene ZIP import'); } catch(e) {} }
    // Host hitboxni qaytadan tanlaymiz (spawn funksiyalari boshqa obyektni tanlagan bo'lishi mumkin)
    if (hostHb && typeof selectObject === 'function') { try { selectObject(hostHb); } catch(e) {} }
    updateInspector();
    log(`📦 Scene ZIP: ${spawned} obyekt spawn, ${animCount} animatsiya, ${sndCount} ovoz qo'shildi`, 'lok');
  } catch(err) {
    log('❌ ZIP import xatosi: ' + err.message, 'le');
  }
}

// Klaviatura kodini chiroyli ko'rsatish (KeyE→E, Space→Space, Digit1→1, ...)
window._friendlyKey = function(code) {
  if (!code) return '⌨ tugma';
  if (code.indexOf('Key') === 0)   return code.slice(3);
  if (code.indexOf('Digit') === 0) return code.slice(5);
  if (code === 'Space')            return 'Space';
  const arrows = { ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→' };
  return arrows[code] || code;
};

// Blokni ochadigan klaviatura tugmasini biriktirish
window._hbSetBlockKey = function(idx, time, code) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  const slot = slots[idx];
  const blk = (slot.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (blk) {
    blk.key = code || null;
    log(`⌨ Blok (t=${time.toFixed(2)}s) → tugma: ${window._friendlyKey(code)}`, 'lok');
    if (typeof updateInspector === 'function') updateInspector();
  }
};

// ── Kamera animatsiyasi bloklari ─────────────────────────────
function _hbCamAnim() {
  if (typeof selectedObj === 'undefined' || !selectedObj || !selectedObj.userData || !selectedObj.userData.actions) return null;
  return selectedObj.userData.actions.cameraAnim || null;
}
window._hbCamToggleBlock = function(time, on) {
  const ca = _hbCamAnim(); if (!ca) return;
  if (!Array.isArray(ca.blocks)) ca.blocks = [];
  const i = ca.blocks.findIndex(b => Math.abs(b.time - time) < 0.005);
  if (on) { if (i < 0) ca.blocks.push({ time: time, key: null }); }
  else if (i >= 0) ca.blocks.splice(i, 1);
  if (typeof updateInspector === 'function') updateInspector();
};
window._hbCamSetBlockKey = function(time, code) {
  const ca = _hbCamAnim(); if (!ca) return;
  const blk = (ca.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (blk) { blk.key = code || null; log(`⌨ Kamera blok (${time.toFixed(2)}s) → ${window._friendlyKey(code)}`, 'lok'); if (typeof updateInspector === 'function') updateInspector(); }
};
// ── Kamera SIKL (loop) bloki ─────────────────────────────────
window._hbCamToggleLoop = function(time) {
  const ca = _hbCamAnim(); if (!ca) return;
  const blk = (ca.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (!blk) return;
  blk.loop = !blk.loop;
  if (blk.loop && typeof blk.loopBack !== 'number') {
    // standart: undan oldingi blok vaqti, bo'lmasa 0
    const prev = (ca.blocks || []).filter(b => b.time < time).sort((a,b)=>b.time-a.time)[0];
    blk.loopBack = prev ? prev.time : 0;
  }
  log(`🔁 Kamera sikl bloki (${time.toFixed(2)}s): ${blk.loop ? 'YONIQ ↩ ' + (blk.loopBack||0).toFixed(2) + 's' : "O'CHIQ"}`, 'lok');
  if (typeof updateInspector === 'function') updateInspector();
};
window._hbCamSetLoopBack = function(time, val) {
  const ca = _hbCamAnim(); if (!ca) return;
  const blk = (ca.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (!blk) return;
  let v = Math.max(0, val);
  if (v >= time) { v = Math.max(0, time - 0.05); log(`⚠ Qaytish vaqti blokdan oldin bo'lishi kerak — ${v.toFixed(2)}s ga o'rnatildi`, 'lw'); }
  blk.loopBack = v;
  log(`↩ Kamera sikl qaytish (${time.toFixed(2)}s) → ${v.toFixed(2)}s`, 'lok');
  if (typeof updateInspector === 'function') updateInspector();
};
window._hbCamSetExitKey = function(time, code) {
  const ca = _hbCamAnim(); if (!ca) return;
  const blk = (ca.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (blk) { blk.exitKey = code || null; log(`🚪 Kamera sikl chiqish (${time.toFixed(2)}s) → ${window._friendlyKey(code)}`, 'lok'); if (typeof updateInspector === 'function') updateInspector(); }
};
window._hbCamPickBlockOnTimeline = function() {
  const ca = _hbCamAnim(); if (!ca) return;
  if (!Array.isArray(ca.blocks)) ca.blocks = [];
  let kfs = [];
  if (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) {
    const tr = TimelineSystem.tracks.find(t => String(t.objId) === String(ca.cameraId));
    if (tr && tr.keyframes) kfs = tr.keyframes.filter(k => k.pos);
    if (!kfs.length) {
      const times = new Set();
      TimelineSystem.tracks.forEach(t => (t.keyframes || []).forEach(k => { if (typeof k.time === 'number') times.add(Math.round(k.time * 1000) / 1000); }));
      kfs = Array.from(times).sort((a, b) => a - b).map(t => ({ time: t }));
    }
  }
  if (!kfs.length) { log('⚠ Kamera timeline keyframe topilmadi — avval timelineда kameraga key qo\'ying', 'lw'); return; }
  if (typeof TimelineSystem.startBlockPick !== 'function') { log('⚠ Timeline topilmadi', 'lw'); return; }
  TimelineSystem.startBlockPick(kfs, ca.blocks, (time) => {
    const i = ca.blocks.findIndex(b => Math.abs(b.time - time) < 0.005);
    if (i >= 0) { ca.blocks.splice(i, 1); log(`🔓 Kamera blok o'chirildi (${time.toFixed(2)}s)`, 'lok'); }
    else { ca.blocks.push({ time: time, key: null }); log(`🔒 Kamera blok qo'shildi (${time.toFixed(2)}s)`, 'lok'); }
    if (typeof updateInspector === 'function') updateInspector();
  });
};

// Bloklarni TIMELINE'da vizual tanlash — uzun ro'yxat o'rniga
window._hbPickBlockOnTimeline = function(idx) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  const slot = slots[idx];
  if (!slot.keyframes || !slot.keyframes.length) { log('⚠ Slotda keyframe yo\'q', 'lw'); return; }
  if (!Array.isArray(slot.blocks)) slot.blocks = [];
  if (typeof TimelineSystem === 'undefined' || !TimelineSystem.startBlockPick) { log('⚠ Timeline topilmadi', 'lw'); return; }
  TimelineSystem.startBlockPick(slot.keyframes, slot.blocks, (time) => {
    const i = slot.blocks.findIndex(b => Math.abs(b.time - time) < 0.005);
    if (i >= 0) { slot.blocks.splice(i, 1); log(`🔓 Blok o'chirildi (${time.toFixed(2)}s)`, 'lok'); }
    else { slot.blocks.push({ time: time, buttonId: null }); log(`🔒 Blok qo'shildi (${time.toFixed(2)}s) — hitboxда tugma tanlang`, 'lok'); }
    if (typeof updateInspector === 'function') updateInspector();
  });
};

// Bloklash nuqtasini yoqish/o'chirish (belgilangan key'da animatsiya to'xtaydi)
window._hbToggleBlock = function(idx, time, on) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  const slot = slots[idx];
  if (!Array.isArray(slot.blocks)) slot.blocks = [];
  const i = slot.blocks.findIndex(b => Math.abs(b.time - time) < 0.005);
  if (on) { if (i < 0) slot.blocks.push({ time: time, buttonId: null }); }
  else if (i >= 0) slot.blocks.splice(i, 1);
  if (typeof updateInspector === 'function') updateInspector();
};

// ── Slot SIKL (loop) bloki ───────────────────────────────────
window._hbToggleLoop = function(idx, time) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  const slot = slots[idx];
  const blk = (slot.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (!blk) return;
  blk.loop = !blk.loop;
  if (blk.loop && typeof blk.loopBack !== 'number') {
    const prev = (slot.blocks || []).filter(b => b.time < time).sort((a,b)=>b.time-a.time)[0];
    blk.loopBack = prev ? prev.time : 0;
  }
  log(`🔁 Sikl bloki (${time.toFixed(2)}s): ${blk.loop ? 'YONIQ ↩ ' + (blk.loopBack||0).toFixed(2) + 's' : "O'CHIQ"}`, 'lok');
  if (typeof updateInspector === 'function') updateInspector();
};
window._hbSetLoopBack = function(idx, time, val) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  const slot = slots[idx];
  const blk = (slot.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (!blk) return;
  let v = Math.max(0, val);
  if (v >= time) { v = Math.max(0, time - 0.05); log(`⚠ Qaytish vaqti blokdan oldin bo'lishi kerak — ${v.toFixed(2)}s ga o'rnatildi`, 'lw'); }
  blk.loopBack = v;
  log(`↩ Sikl qaytish (${time.toFixed(2)}s) → ${v.toFixed(2)}s`, 'lok');
  if (typeof updateInspector === 'function') updateInspector();
};
window._hbSetExitKey = function(idx, time, code) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  const slot = slots[idx];
  const blk = (slot.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (blk) { blk.exitKey = code || null; log(`🚪 Sikl chiqish (${time.toFixed(2)}s) → ${window._friendlyKey(code)}`, 'lok'); if (typeof updateInspector === 'function') updateInspector(); }
};

// Bloklash nuqtasini ochadigan custom tugmani biriktirish
window._hbSetBlockButton = function(idx, time, buttonId) {
  const slots = _hbGetSlots();
  if (!slots || idx < 0 || idx >= slots.length) return;
  const slot = slots[idx];
  const blk = (slot.blocks || []).find(b => Math.abs(b.time - time) < 0.005);
  if (blk) {
    blk.buttonId = buttonId || null;
    const btn = objects.find(o => o.userData && String(o.userData.id) === String(buttonId));
    log(`🔒 Blok (t=${time.toFixed(2)}s) → ochish tugmasi: ${btn ? btn.userData.name : '—'}`, 'lok');
  }
};

window._hbPickAnimForSlot = function(idx) {
  _hbActiveSlotIdx = idx;
  // MUHIM: file input'ni har safar YANGI, DOM'dan mustaqil yaratamiz.
  // Import onload'da inspector qayta renderlanadi (innerHTML) va HTML ichidagi
  // eski <input id="hb-anim-file-input"> yo'q bo'lib ketadi. Dialog ochiq
  // turgan paytda input DOM'dan olib tashlansa, brauzer 'change' hodisasini
  // umuman yubormaydi — shuning uchun detached input'ni document.body'ga qo'shamiz.
  const inp = document.createElement('input');
  inp.type   = 'file';
  inp.accept = '.json,application/json';
  inp.style.display = 'none';
  inp.onchange = window._hbHandleAnimFile;
  document.body.appendChild(inp);
  inp.click();
  setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
};

window._hbHandleAnimFile = function(event) {
  const file = event && event.target && event.target.files && event.target.files[0];
  if (!file) return;
  if (!selectedObj || !selectedObj.userData.isHitbox) {
    log("⚠ Hitbox tanlanmagan", 'lw');
    return;
  }
  const slots = _hbGetSlots();
  if (!slots) return;

  // If no active slot cursor (fallback safety) — target the last one
  const slotIdx = (_hbActiveSlotIdx != null && _hbActiveSlotIdx < slots.length)
    ? _hbActiveSlotIdx
    : slots.length - 1;
  if (slotIdx < 0) {
    log("⚠ Faol slot yo'q — avval slot qo'shing", 'lw');
    event.target.value = '';
    return;
  }
  _hbActiveSlotIdx = null;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      // ── Keyframe'larni topish — 3 xil eksport formati qo'llab-quvvatlanadi ──
      //   1) Object-Only Export:  { keyframes:[...], object:{id,name} }
      //   2) Full Scene Export:   { tracks:[{objId,objName,keyframes:[...]}] }
      //   3) Wrapped timeline:    { timeline:{ tracks:[{keyframes:[...]}] } }
      let kfs = null, srcId = null, srcName = null;
      if (Array.isArray(data.keyframes)) {
        kfs = data.keyframes;
        srcId   = (data.object && data.object.id   != null) ? data.object.id   : null;
        srcName = (data.object && data.object.name != null) ? data.object.name : null;
      } else if (Array.isArray(data.tracks) && data.tracks[0] &&
                 Array.isArray(data.tracks[0].keyframes)) {
        const t = data.tracks[0];
        kfs = t.keyframes; srcId = (t.objId ?? null); srcName = (t.objName ?? null);
        if (data.tracks.length > 1) {
          log(`ℹ ${data.tracks.length} trekli fayl — birinchi trek (${srcName || 'noma\'lum'}) olindi`, 'lok');
        }
      } else if (data.timeline && Array.isArray(data.timeline.tracks) &&
                 data.timeline.tracks[0] && Array.isArray(data.timeline.tracks[0].keyframes)) {
        const t = data.timeline.tracks[0];
        kfs = t.keyframes; srcId = (t.objId ?? null); srcName = (t.objName ?? null);
      }

      if (!Array.isArray(kfs) || kfs.length === 0) {
        log(`⚠ Faylda keyframe topilmadi (kutilgan: {"keyframes":[...]} yoki {"tracks":[{"keyframes":[...]}]})`, 'lw');
        return;
      }

      const times = kfs.map(k => (typeof k.time === 'number') ? k.time : 0);
      const duration = Math.max(...times) - Math.min(...times);

      const slot = slots[slotIdx];
      slot.sourceName = file.name;
      slot.keyframes  = kfs;
      slot.duration   = duration;

      // ── Maqsad obyektni AVTOMATIK topish (avval id, keyin nom bo'yicha) ──
      let autoId = null, autoName = null;
      if (srcId != null) {
        const byId = objects.find(o => String(o.userData && o.userData.id) === String(srcId));
        if (byId) { autoId = byId.userData.id; autoName = byId.userData.name; }
      }
      if (autoId == null && srcName) {
        const byName = objects.find(o => o.userData && o.userData.name === srcName);
        if (byName) { autoId = byName.userData.id; autoName = byName.userData.name; }
      }
      if (autoId != null) {
        slot.targetObjectId = autoId;
      } else if (!slot.targetObjectId) {
        // Avtomatik topilmasa — hitbox target'iga tushiramiz (agar bor bo'lsa)
        slot.targetObjectId = selectedObj.userData.targetObjectId || null;
      }

      log(`✅ Slot ${slotIdx + 1}: <b>${file.name}</b> — ` +
          `${kfs.length} KF, ${duration.toFixed(2)}s` +
          (autoName ? ` | maqsad: "${autoName}" (avtomatik)` : ''), 'lok');
      updateInspector();

      if (!slot.targetObjectId) {
        log(`💡 Slot ${slotIdx + 1}: Maqsad obyekt tanlang`, 'lw');
      }
    } catch (err) {
      log(`❌ Faylni o'qib bo'lmadi: ${err.message}`, 'le');
    }
  };
  reader.readAsText(file);
  event.target.value = '';   // allow re-selecting the same file
};

// ============================================================
// Serialization helpers (used by save-load.js)
// ============================================================
window._hbSerialize = function(o) {
  const ud = o.userData;
  return {
    isHitbox:       true,
    hitboxSize:     ud.hitboxSize    || { x: 2, y: 2, z: 2 },
    triggerType:    ud.triggerType   || 'onEnter',
    collisionMode:  ud.collisionMode || 'inline',
    targetObjectId: ud.targetObjectId || null,
    // 📦 Predmet sharti — `itemId` obyekt havolasi, `_slRemapIds` uni
    //    yuklashda yangi id ga ko'chiradi (nomi 'Id' bilan tugagani uchun).
    itemReq:        ud.itemReq ? JSON.parse(JSON.stringify(ud.itemReq)) : null,
    reverseMode:    ud.reverseMode   || { enabled: false, reverseSpeed: 1.0, resetOnLoad: true },
    // Deep-copy actions minus runtime fields
    actions: JSON.parse(JSON.stringify(ud.actions || {})),
  };
};

window._hbDeserialize = function(od) {
  const p = od.position || { x: 0, y: 1, z: 0 };
  const mesh = HitboxSystem.create(new THREE.Vector3(p.x, p.y, p.z));
  const ud = mesh.userData;
  ud.name          = od.name || ud.name;
  ud.hitboxSize    = od.hitboxSize    || ud.hitboxSize;
  ud.triggerType   = od.triggerType   || ud.triggerType;
  ud.collisionMode = od.collisionMode || 'inline';
  // Sync colliderMode (what player.js checks for pass-through)
  if (ud.collisionMode === 'inline') ud.colliderMode = 'inline';
  else delete ud.colliderMode;
  ud.targetObjectId = od.targetObjectId ?? null;
  // 📦 Eski sahnalarda `itemReq` yo'q — standart bilan to'ldiriladi
  ud.itemReq = Object.assign(
    { enabled:false, itemId:null, mode:'carry', onDone:'consume', once:true },
    ud.itemReq || {}, od.itemReq || {});
  if (od.reverseMode) ud.reverseMode = Object.assign({}, ud.reverseMode, od.reverseMode);
  if (od.actions) {
    ud.actions = Object.assign({}, ud.actions, od.actions);
  }

  // ── Backward compat: migrate old single-slot importedAnimation
  //    format to the new multi-slot importedAnimations format.
  if (ud.actions && ud.actions.importedAnimation && !ud.actions.importedAnimations) {
    const old = ud.actions.importedAnimation;
    if (old.keyframes && old.keyframes.length > 0) {
      ud.actions.importedAnimations = {
        enabled: !!old.enabled,
        slots: [{
          id:             1,
          sourceName:     old.sourceName || 'migrated.json',
          keyframes:      old.keyframes,
          duration:       old.duration || 0,
          targetObjectId: old.targetObjectId || null,
          speed:          old.speed || 1.0,
          loop:           !!old.loop,
        }],
      };
    }
    delete ud.actions.importedAnimation;
  }

  // Apply rotation/scale if provided
  if (od.rotation) mesh.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
  if (od.scale)    mesh.scale.set(od.scale.x, od.scale.y, od.scale.z);

  HitboxSystem.syncSize(mesh);
  // Apply block-mode fill tint if needed
  if (ud.collisionMode === 'block' && ud._fillRef && ud._fillRef.material) {
    ud._fillRef.material.color.setHex(0xff4444);
    ud._fillRef.material.opacity = 0.14;
    ud._fillRef.material.needsUpdate = true;
  }

  // Deferred: after all objects load, re-apply hideCameraAlways flag
  // by hiding the target camera mesh. Runs on next tick because the
  // target camera might not exist yet at this point in the load flow.
  const camAnim = ud.actions && ud.actions.cameraAnim;
  if (camAnim && camAnim.hideCameraAlways && camAnim.cameraId != null) {
    setTimeout(() => {
      const tgt = objects.find(o =>
        String(o.userData && o.userData.id) === String(camAnim.cameraId));
      if (tgt) {
        tgt.userData._alwaysHidden = true;
        tgt.visible = false;
      }
    }, 0);
  }
  return mesh;
};
