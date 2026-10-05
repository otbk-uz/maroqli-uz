// ============================================================
// APEX3D — Main Loop  (Optimized v2)
// Optimizatsiyalar:
//   1. objects.forEach 5 → 1 marta (birlashtirildi)
//   2. Collision check throttle: har 3 frame (60fps da 20fps da ishlaydi)
//   3. Outline update: faqat pozitsiya o'zgarganda
//   4. Shadow auto-disable: 4+ ob'ekt bo'lsa performance mode
//   5. Camera object: faqat aktiv bo'lsa va o'zgarganda ishlaydi
//   6. Fill light sin/cos: har 4 frame da bir marta
//   7. Curve editor: faqat visible bo'lsa
// ============================================================

let frameCount = 0, fpsTimer = 0;

// ⚠ TUZATILDI: papka/prefab ichidagi kamera va maqsad obyektlar uchun
// world-space yordamchilari (lokal transform ona zanjiriga nisbatan bo'ladi)
const _wq  = new THREE.Quaternion();
const _wp  = new THREE.Vector3();

// Kamera "Lock" (look-at) uchun maqsad obyektni topish
function _resolveCamTarget(mode) {
  if (!mode || mode === 'player') {
    if (typeof PlayerController !== 'undefined' && PlayerController && PlayerController.obj && PlayerController.obj.parent) return PlayerController.obj;
    if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent) return playerMesh;
    return objects.find(o => o.userData && (o.userData.isPlayerObj || o.userData.entityType === 'player' || o.userData.isSpawn));
  }
  if (mode === 'car') {
    return objects.find(o => o.userData && (o.userData.entityType === 'car' || o.userData.isCar));
  }
  if (typeof mode === 'string' && mode.indexOf('obj:') === 0) {
    const id = mode.slice(4);
    return objects.find(o => o.userData && String(o.userData.id) === String(id));
  }
  return objects.find(o => o.userData && String(o.userData.id) === String(mode));
}

// ── Throttle latchlar ───────────────────────────────────────
let _loopFrame       = 0;   // umumiy frame counter
let _collisionSkip   = 3;   // har N frame da collision check
let _fillLightSkip   = 4;   // har N frame da fill light sin/cos
// ── ♻️ Sahna o'zgardi — soya xaritasini qayta hisoblash kerak ──
//  ⚠ Ilgari bu yerда `_doorObjects` / `_mixerObjects` / `_cameraObjects`
//    keshi turardi. `_rebuildCache()` ularni to'ldirardi, lekin bu
//    massivlar HECH QAYERDA O'QILMASDI — pastdagi asosiy sikl baribir
//    butun `objects` ni aylanardi. Ya'ni kesh qurish sof qo'shimcha ish edi.
//    Olib tashlandi; `_markLoopCacheDirty()` esa saqlanadi va endi
//    HAQIQIY vazifa bajaradi: soyani yangilashni so'raydi.
window._markLoopCacheDirty = function() {
  if (typeof window.requestShadowUpdate === 'function') window.requestShadowUpdate();
};

// Tanlangan obyekt surilganini aniqlash uchun — gizmo bilan sudralsa
// soya real vaqtда ergashsin.
const _shTmpP  = new THREE.Vector3();
const _shLastPos = new THREE.Vector3(Infinity, 0, 0);
let _shLastSel = null;

// ── Outline pozitsiya kesh (faqat o'zgarganda yangilash) ────
let _outlineLastPos  = new THREE.Vector3(Infinity, 0, 0);
let _outlineLastRot  = new THREE.Euler();
let _outlineLastScl  = new THREE.Vector3(1,1,1);


// ============================================================
//  🛡 _safe — bitta tizimning xatosi BUTUN KADRNI o'ldirmasin
//
//  ⚠ MUAMMO: `animate()` ichidagi tizimlar ketma-ket, himoyasiz
//    chaqirilardi. Ro'yxatning BOSHIDAGI biror tizim (masalan fizika)
//    bir marta xato bersa, undan KEYINGI hammasi — hitbox triggerlari
//    (332-qator), interaktiv tugmalar (339), head-look, sound blok —
//    o'sha kadrda umuman ishga tushmasdi. Har kadr takrorlangani
//    uchun ular BUTUNLAY o'lik ko'rinardi.
//
//    Alomat chalkash edi: "hitboxga kirsam yoki tugmani bossam
//    ishlamayapti, lekin ANIMATSIYA zo'r ishlayapti" — chunki
//    `TimelineSystem` o'zining ALOHIDA RAF siklida yuradi va
//    `animate()` yiqilsa ham to'xtamaydi.
//
//    Ustiga xato konsolda sekundiga 144 marta takrorlanib, haqiqiy
//    sababni ko'mib tashlardi.
//
//  Endi har bir tizim alohida o'raladi: xato ushlanadi, BIR MARTA
//  jurnalga yoziladi va keyingi tizimlar ishlayveradi.
// ============================================================
const _sysErr = new Set();
function _safe(name, fn) {
  try { fn(); }
  catch (e) {
    if (!_sysErr.has(name)) {
      _sysErr.add(name);
      const m = (e && e.message) ? e.message : String(e);
      try { log(`❌ [${name}] xato — bu tizim to'xtatildi: ${m}`, 'le'); } catch (_) {}
      console.error(`[${name}]`, e);
    }
  }
}
window._sysErrors = () => [..._sysErr];
window._sysErrorsClear = () => { _sysErr.clear(); };

//  🖥 FPS CHEGARASI — ⏸ pauza menyusidan
//  ⚠ Oxirgi kadr vaqti kadrlar orasida SAQLANISHI kerak, shuning
//    uchun funksiyadan tashqarida.
let _fpsCapLast = 0;

function animate() {
  requestAnimationFrame(animate);

  // ============================================================
  //  🖥 FPS CHEGARASI
  // ------------------------------------------------------------
  //  ⚠ `requestAnimationFrame` DOIM chaqiriladi — faqat KADR
  //    O'TKAZIB YUBORILADI. To'xtatsak keyingi kadr hech qachon
  //    so'ralmasdi va o'yin muzlab qolardi.
  //  ⚠ `clock.getDelta()` ni o'tkazilgan kadrda CHAQIRMAYMIZ: u
  //    hisoblagichni nolga qaytaradi va `delta` doim kichkina
  //    bo'lib, o'yin sekinlashib qolardi.
  {
    const cap = window._apexFpsCap | 0;
    if (cap > 0) {
      const now = (typeof performance !== 'undefined' && performance.now)
        ? performance.now() : Date.now();
      //  1 ms zaxira: aks holda chegara aynan 60 bo'lganda brauzer
      //  kadrlari bilan nomutanosiblik 30 FPS beradi.
      if (now - _fpsCapLast < (1000 / cap) - 1) return;
      _fpsCapLast = now;
    }
  }

  _loopFrame++;

  const delta = Math.min(clock.getDelta(), 0.05);

  //  ⏸ Pauza menyusi ochiq — o'yin mantig'i to'xtaydi, lekin
  //  chizish davom etadi (fon ko'rinib tursin).
  //  ⚠ `return` EMAS: chizmasak ekran qotib qolardi va menyu
  //    qora fonda osilgandek ko'rinardi.
  const _paused = !!window._apexPaused;

  // ── FPS counter ─────────────────────────────────────────
  fpsTimer += delta; frameCount++;
  if (fpsTimer >= 0.5) {
    const fps = Math.round(frameCount / fpsTimer);
    $('fps-d').textContent = fps;
    $('fps-s').textContent = fps;
    // ⚠ O'lchov oynasini SAQLAB qolamiz. Ilgari `_rendererDynamicRes(fpsTimer, fps)`
    //   fpsTimer nolga tushirilgandan KEYIN chaqirilardi → funksiyaga hamisha 0
    //   uzatilardi → ichidagi `_drTimer += 0` hech qachon o'smasdi →
    //   dinamik ruxsat BUTUNLAY o'lik kod edi.
    const _dt = fpsTimer;
    frameCount = 0; fpsTimer = 0;

    // ⚠ `_autoShadowMode()` OLIB TASHLANDI — u ikki qavat o'lik edi:
    //   (1) `_shadowFrames++ === 0` tufayli umr bo'yi BIR marta chaqirilardi;
    //   (2) ichidagi shart `shadowMap.type === PCFSoftShadowMap` ni tekshirardi,
    //       renderer.js esa allaqachon PCFShadowMap qilib qo'ygan → hech qachon
    //       rost bo'lmasdi. Ya'ni har 0.5s da bekorga tekshiriladigan yo'q shart.

    // ── 🌫 Tuman bo'yicha far-plane ────────────────────────
    //  FogExp2 da ko'rinuvchanlik = exp(-(d·density)²).
    //  d·density = 3.5 bo'lganда exp(-12.25) ≈ 0.0000048 — ya'ni obyekt
    //  to'liq tumanga ko'milgan, PIKSELDA hech qanday hissasi yo'q.
    //  Lekin `camera.far = 1000` bo'lgani uchun u baribir renderlanardi:
    //  vertex, fragment, draw call — hammasi bekorga.
    //  far ni tumanga moslasak, frustum culling ularni BEPUL kesadi.
    //  Vizual farq nol. Bonus: far kichrayganда depth bufer aniqligi
    //  oshadi → z-fighting kamayadi.
    //  Tuman zichligi o'yin/timeline orqali o'zgaradi — shuning uchun
    //  har 0.5s da qayta hisoblanadi.
    if (scene.fog && scene.fog.isFogExp2) {
      const _d = scene.fog.density;
      const _want = (_d > 0.0005) ? Math.min(1000, Math.max(60, 3.5 / _d)) : 1000;
      if (Math.abs(camera.far - _want) > 1) {
        camera.far = _want;
        camera.updateProjectionMatrix();
      }
    }

    // Dynamic resolution (renderer.js dan)
    if (typeof _rendererDynamicRes === 'function') {
      _rendererDynamicRes(_dt, fps);
    }
  }

  //  ⏸ Pauzada o'yin mantig'i O'TKAZIB YUBORILADI — o'yinchi
  //  menyuda turganda dushman yugurmasin, taymer o'tmasin.
  if (isPlaying && !_paused) {
    playTime += delta;
    $('time-d').textContent = playTime.toFixed(2) + 's';
  }

  // ── Cache qayta qurish (ob'ekt qo'shilsa/o'chirilsa) ────

  // ── Physics ─────────────────────────────────────────────
  _safe('Physics', () => updatePhysics(delta));
  _safe('SpecialPhysics', () => updateSpecialPhysics(delta));

  // ── Particles ───────────────────────────────────────────
  _safe('Particles', () => updateParticles(delta));

  // ── Camera ──────────────────────────────────────────────
  updateFPS(delta);
  updateRmbCameraMove(delta);

  // ── Edit mode ───────────────────────────────────────────
  updateEditMode(delta);

  // ── Timeline ────────────────────────────────────────────
  tlUpdate(delta);

  // ── 🎛 AllKey + 🚫 bloklash ──────────────────────────────
  //  ⚠ TARTIB MUHIM — ikkalasi ham KLAVISH O'QILISHIDAN OLDIN.
  //
  //    XATO BOR EDI: bloklash pastda, boshqa tizimlar orasida turardi.
  //    O'yinchi esa SHU YERDA `fpsKeys` ni O'QIYDI. Ya'ni har kadr
  //    klavish AVVAL ishlab, KEYIN tozalanardi — bloklash amalda
  //    umuman sezilmasdi. Foydalanuvchi aynan shuni ko'rdi:
  //    "bloklash ishlagani yo'q".
  //
  //  ⚠ 🎛 AllKey BLOKLASHDAN OLDIN: u zona qoidalarini
  //    `_kbAnimations` ga ko'chiradi, ya'ni bloklash undan KEYIN
  //    yurishi kerak — aks holda zona qo'ygan bloklash bir kadr
  //    kechikardi.
  //  🚗⌨ Mashina klaviatura profili — 🎛 AllKey DAN OLDIN.
  //  ⚠ TARTIB: mashina profili ASOS (piyoda → mashina), 🎛 AllKey
  //    esa uning USTIGA qo'yiladi. Teskari qilsak zona qo'ygan
  //    sozlamani mashina bosib ketardi va \"zonaga kirdim, lekin
  //    hech nima o'zgarmadi\" holati chiqardi.
  _safe('CarKeyProfile', () => { if (window.CarKeyProfile) CarKeyProfile.update(delta); });
  _safe('AllKey', () => { if (window.AllKeySystem) AllKeySystem.update(delta); });
  _safe('KeyBlocks', () => { if (window._kbEnforceBlocks) window._kbEnforceBlocks(); });

  // ── Player ──────────────────────────────────────────────
  updatePlayer(delta);
  PlayerController.update(delta);

  //  🌐 Multiplayer — O'YINCHI HARAKATIDAN KEYIN.
  //  ⚠ XATO BOR EDI: u yuqorida, harakatdan OLDIN turardi — ya'ni
  //    biz o'tgan kadrning joylashuvini yuborardik va boshqa
  //    o'yinchilar bizni doim BIR KADR ORQADA ko'rardi. Tez
  //    harakatda bu sezilarli kechikish.
  _safe('Multiplayer', () => { if (window.MultiplayerSystem) MultiplayerSystem.update(delta); });

  // ── Birlashtirilgan objects loop (1 marta!) ──────────────
  // Eski kod: 3 ta alohida forEach → hozir 1 ta
  const _camPathPlaying = camPathPlaying; // closure dan cache
  // ── 🕹 Kamera piloti ─────────────────────────────────────
  //  ⚠ Obyektlar siklidan OLDIN bo'lishi SHART. Sikl ichida faol
  //    kameraning pozitsiyasi asosiy kameraga ko'chiriladi — pilot
  //    undan KEYIN yursa, ko'rinish har doim bir kadr orqada
  //    sudralib qolardi.
  if (typeof CamPilot !== 'undefined' && CamPilot.isOn()) CamPilot.update(delta);

  for (let i = 0, len = objects.length; i < len; i++) {
    const o = objects[i];
    const ud = o.userData;
    if (!ud) continue;

    // 1) Eshik animatsiyasi
    if (ud._doorAxis) {
      const ax    = ud._doorAxis;
      const target = ud._doorTarget || 0;
      const spd   = ud._doorSpeed  || 1.5;
      const curR  = o.rotation[ax] || 0;
      const diff  = target - curR;
      if (Math.abs(diff) > 0.005) {
        o.rotation[ax] += diff * spd * delta * 3;
      } else {
        o.rotation[ax] = target;
      }
    }

    // 2) GLB AnimationMixer
    if (ud._mixer) {
      ud._mixer.update(delta);
    }

    // 3) Camera ob'ekt (faqat kesh ro'yxatidagilar)
    if (ud.isCamera && ud._isActive && !_camPathPlaying) {
      o.visible = false;
      // ⚠ TUZATILDI: papka/prefab ichidagi kamera uchun o.position LOKAL bo'ladi.
      // World pozitsiya olinmasa, nested kamera noto'g'ri joyga sakrardi.
      o.getWorldPosition(camera.position);
      camera.fov = ud.fov || 60;
      const vm = ud.camViewMode || 'keyframe';
      if (vm === 'absolute') {
        // Pozitsiya keyframedan; burilish = keyframe ASOSI + o'yinchi offseti.
        const yo = window._absYawOff   || 0;
        const po = window._absPitchOff || 0;
        camera.rotation.order = 'YXZ';
        const _we = new THREE.Euler().setFromQuaternion(o.getWorldQuaternion(_wq), 'YXZ');
        camera.rotation.y = _we.y + yo;
        camera.rotation.x = _we.x + po;
        camera.rotation.z = 0;
      } else if (vm === 'lookat') {
        // Pozitsiya keyframedan; doim maqsadga qaraydi (kamera past/qiyshiq bo'lsa ham).
        // So'ng o'yinchi offseti (agar bo'lsa) mahalliy o'qlarda qo'shiladi — atrofga qaray oladi.
        const tgt = _resolveCamTarget(ud.camLookTarget || 'player');
        if (tgt && tgt.position) {
          // world pozitsiya — maqsad ham papka ichida bo'lishi mumkin
          tgt.getWorldPosition(_wp);
          camera.lookAt(_wp.x, _wp.y + (ud.camLookYOff || 1), _wp.z);
          const yo = window._absYawOff   || 0;
          const po = window._absPitchOff || 0;
          if (yo) camera.rotateY(yo);
          if (po) camera.rotateX(po);
        } else {
          // Mesh yo'nalishini AYNAN kameraga — Euler tartibiga bog'liq emas
          camera.quaternion.copy(o.getWorldQuaternion(_wq));
        }
      } else {
        // keyframe rejimi — mesh burilishini AYNAN kvaternion orqali beramiz.
        // Euler .set() tartib (order) mos kelmasa roll/qiyshiqlik chiqaradi;
        // kvaternion order'ga bog'liq emas — kamera aynan mesh qayerga qarasa,
        // o'sha yerga qaraydi (qiyshiqlik yo'q).
        camera.quaternion.copy(o.getWorldQuaternion(_wq));
      }
      camera.updateProjectionMatrix();
    }
  }

  // ── Car ─────────────────────────────────────────────────
  updateCar(delta);
  updateCarProximity();

  // ── Animal AI ───────────────────────────────────────────
  updateAnimals(delta);

  // ── 👤 O'yinchi modeli — Play tugasa asl holatga qaytadi
  if (window.PlayerModelSystem) PlayerModelSystem.update();

  // ── 💻 PC block — kamera fokusi ─────────────────────────
  // PlayerController.update DAN KEYIN turishi SHART: fokusda
  // kamerani o'yinchi boshqaruvi ustidan yozadi.
  if (window.PCBlockSystem) PCBlockSystem.update(delta);

  // ── 🛤 Yo'llar (path bo'ylab harakat) ───────────────────
  if (window.PathSystem) PathSystem.update(delta);

  // ── 📝 Matn bloklari (billboard + matn o'zgarishi) ──────
  if (window.TextBlockSystem) TextBlockSystem.update(delta);

  // ── Camera module ───────────────────────────────────────
  camModuleUpdate(delta);

  // 🌌 Skybox — `facing` rejimida tekislik kameraga qarab turadi
  _safe('Skybox', () => { if (window.SkyboxSystem) SkyboxSystem.update(); });
  _safe('StartFinish', () => { if (window.StartFinishSystem) StartFinishSystem.update(delta); });

  // ── 🔫 Gravity gun / ko'tarish ──────────────────────────
  //  Fizikadan KEYIN turishi shart: ko'tarilgan jismning tezligini
  //  Rapier qadamidan so'ng qo'yamiz, aks holda qadam uni bekor qilardi.
  _safe('GravityGun', () => { if (window.GravityGunSystem) GravityGunSystem.update(delta); });
  _safe('Inventory', () => { if (window.InventorySystem) InventorySystem.update(delta); });
  _safe('MiniPad', () => { if (window.MiniPadSystem) MiniPadSystem.update(delta); });
  //  ⌨🖥 Ekran tugmalari — faqat ▶/⏹ o'tishini kuzatadi, arzon
  _safe('ScreenKeys', () => { if (window.ScreenKeys) ScreenKeys.update(delta); });
  //  ⌨🔢 Klavishga biriktirilgan son amallari (➕➖✖➗)
  //  ⚠ `ScreenKeys` dan KEYIN: ekran tugmasi `fpsKeys` ni o'sha
  //    kadrda to'ldiradi, oldin qo'ysak amal bir kadr kechikardi.
  _safe('KeyNoScript', () => { if (window.KeyNoScript) KeyNoScript.update(delta); });
  //  🖼 HUD panellari — `KeyNoScript` DAN KEYIN: panel `{n}` ni
  //    ko'rsatadi, ya'ni son allaqachon yangilangan bo'lishi kerak.
  //    Oldin qo'ysak ekrandagi raqam bir kadr orqada qolardi.
  _safe('Hud', () => { if (window.HudSystem) HudSystem.update(delta); });
  //  🎨 Canvas qoplamalari — `{hp}` `{n}` `{random}` tirik bo'lsin.
  //  ⚠ `HudSystem` DAN KEYIN: ikkalasi ham bir xil almashtiruvchini
  //    ishlatadi va tartib farq qilmaydi, lekin yonma-yon turgani
  //    kelajakda kim nimani yangilashini ko'rsatib turadi.
  _safe('CanvasTick', () => { if (window._cvTickOverlays) window._cvTickOverlays(); });
  //  🔎 ⏱ Timeline sabab xabarlari — ▶/⏹ o'tishida qaytadan
  //    aytilsin, aks holda birinchi sinovda ko'rilgan sabab keyingi
  //    sinovlarda yashirin qolardi.
  _safe('TlWhy', () => {
    if (!window._tlWhyReset) return;
    const p = (typeof isPlaying !== 'undefined' && isPlaying);
    if (p !== window._tlWhyWas) { window._tlWhyWas = p; window._tlWhyReset(); }
  });
  _safe('ObjectGlow', () => { if (window.ObjectGlowSystem) ObjectGlowSystem.update(delta); });
  // 🔨 Deform — vertex amallarini yuklangandan keyin qayta ijro etadi.
  //    ⚠ ◈ `Pivot` dan OLDIN: ikkalasi ham geometriyani o'zgartiradi.
  //      Deform burash/qiyshaytirish (asl markazga nisbatan), pivot
  //      esa siljitish. Siljitishdan KEYIN burasak natija boshqacha
  //      chiqardi.
  // 🗺 PBR xaritalari — yuklangandan keyin materialga qaytadan qo'yiladi
  _safe('PBRMaps', () => { if (window.PBRMaps) PBRMaps.update(delta); });
  _safe('Deform', () => { if (window.DeformSystem) DeformSystem.update(delta); });
  // 💥 Sinish — yuklangandan keyin parchalarga fizika tanasini qaytaradi
  _safe('Break', () => { if (window.BreakTimeline) BreakTimeline.update(delta); });
  _safe('Pivot', () => { if (window.PivotSystem) PivotSystem.update(delta); });
  _safe('GifTexture', () => { if (window.GifTextureSystem) GifTextureSystem.update(delta); });
  _safe('AIAgent', () => { if (window.AIAgentSystem) AIAgentSystem.update(delta); });
  _safe('Project', () => { if (window.ProjectSystem) ProjectSystem.update(delta); });
  _safe('NoScript', () => { if (window.NoScriptSystem) NoScriptSystem.update(delta); });
  // ⚡ Optimizatsiya — CHIZISHDAN OLDIN. Keyin chaqirsak `visible`
  //   o'zgarishi keyingi kadrda kuchga kirardi, ya'ni bir kadr
  //   kechikish paydo bo'lardi.
  _safe('Optimize', () => { if (window.OptimizeSystem) OptimizeSystem.update(delta); });
  _safe('GameHUD',  () => { if (window.GameHUD) GameHUD.update(delta); });
  _safe('LightHelpers', () => { if (window.syncLightHelpers) syncLightHelpers(); });

  // ── Script system ───────────────────────────────────────
  _safe('Scripts', () => scriptRunAll(delta));

  // Collision: har _collisionSkip frame da bir marta (performance)
  if (_loopFrame % _collisionSkip === 0) {
    _safe('ScriptCollisions', () => scriptCheckCollisions());
  }

  // ── Curve editor (faqat panel ochiq bo'lsa) ─────────────
  if (ceObjId) {
    const cePanel = $('curve-editor-panel');
    if (cePanel && cePanel.style.display !== 'none') {
      ceDrawCanvas();
    }
  }

  // ── Outline: faqat pozitsiya o'zgarganda yangilash ───────
  if (outlineMesh && selectedObj) {
    const sp = selectedObj.position;
    const sr = selectedObj.rotation;
    const ss = selectedObj.scale;

    // Pozitsiya o'zgardimi?
    if (!_outlineLastPos.equals(sp) ||
        _outlineLastRot.x !== sr.x || _outlineLastRot.y !== sr.y || _outlineLastRot.z !== sr.z ||
        !_outlineLastScl.equals(ss)) {

      outlineMesh.position.copy(sp);
      outlineMesh.rotation.copy(sr);
      outlineMesh.scale.copy(ss).multiplyScalar(
        1.07 + (isPlaying ? Math.sin(playTime * 4) * 0.01 : 0)
      );

      _outlineLastPos.copy(sp);
      _outlineLastRot.copy(sr);
      _outlineLastScl.copy(ss);
    }
  }

  // ── Multi-select outlines sync ───────────────────────────
  //  ⚠ WORLD transform. Qobiq `scene` ning bolasi, obyekt esa
  //    papka ichida bo'lishi mumkin — lokal qiymatni ko'chirsak
  //    qobiq papkaning nol nuqtasi atrofida qolib ketardi.
  //    (Bitta obyekt uchun bu pastda `_owner` bloki bilan
  //     allaqachon to'g'ri qilingan; bu — uning juftligi.)
  for (let i = 0, len = multiOutlines.length; i < len; i++) {
    const ol = multiOutlines[i];
    const src = ol.__forObj;
    if (!src) continue;
    src.updateMatrixWorld(true);
    src.getWorldPosition(ol.position);
    src.getWorldQuaternion(ol.quaternion);
    src.getWorldScale(ol.scale);
    if (ol.__isOutline) ol.scale.multiplyScalar(1.08);
  }

  // ── Outline sinxronizatsiyasi (nested/attached obyektlar uchun) ──
  // Outline sahna darajasida — obyekt harakatlansa/aylansa uni har frame'da
  // owner'ning WORLD transform'iga o'rnatamiz. Bu nested/attached (mashina
  // ustidagi tugma) holatlarida ham outline to'g'ri joyda ko'rinishi uchun.
  if (typeof outlineMesh !== 'undefined' && outlineMesh && outlineMesh.userData._owner) {
    const _own = outlineMesh.userData._owner;
    if (_own.parent) {
      _own.updateMatrixWorld(true);
      _own.getWorldPosition(outlineMesh.position);
      _own.getWorldQuaternion(outlineMesh.quaternion);
      _own.getWorldScale(outlineMesh.scale);
      outlineMesh.scale.multiplyScalar(1.07);
    }
  }

  // ── Gizmo ────────────────────────────────────────────────
  updateGizmo();

  // ── Fill light (har _fillLightSkip frame) ────────────────
  if (isPlaying && fill && (_loopFrame % _fillLightSkip === 0)) {
    fill.light.position.x = Math.sin(playTime * 0.4) * 10;
    fill.light.position.z = Math.cos(playTime * 0.4) * 10;
    if (fill.helper) fill.helper.update();
  }

  // ── Rain ─────────────────────────────────────────────────
  _safe('Rain', () => RainSystem.update(delta));

  // ── Hitbox triggers (play mode only) ─────────────────────
  _safe('Hitbox', () => { if (typeof HitboxSystem !== 'undefined') HitboxSystem.update(delta); });

  // ── Map Loader — karta almashtirish triggeri (play mode) ─
  _safe('MapLoader', () => { if (typeof MapLoaderSystem !== 'undefined') MapLoaderSystem.update(delta); });
  _safe('SoundBlock', () => { if (typeof SoundBlockSystem !== 'undefined') SoundBlockSystem.update(delta); });

  // ── Interactive Buttons — pritsel va o'zaro aloqa ───────
  _safe('InteractiveButton', () => { if (typeof InteractiveButtonSystem !== 'undefined') InteractiveButtonSystem.update(delta); });

  // ── 👁 Head-look — obyekt maqsadni kuzatib buriladi ─────
  _safe('HeadLook', () => { if (typeof HeadLookSystem !== 'undefined') HeadLookSystem.update(delta); });

  // ── Textura Loop — scale o'zgarsa tile ni yangilash ─────
  _safe('TextureLoop', () => { if (typeof TextureLoopSystem !== 'undefined') TextureLoopSystem.update(); });

  // ── Object Roll — damage/heal, o'lim, respawn ───────────
  if (typeof ObjectRoleSystem !== 'undefined')          ObjectRoleSystem.update(delta);

  // ── Multiplayer (faqat ulangan bo'lsa) ───────────────────
  if (typeof trackObjectChanges === 'function')         trackObjectChanges();
  if (typeof MultiplayerSmooth !== 'undefined')         MultiplayerSmooth.interpolate(delta);
  if (typeof renderLockedIndicators === 'function')     renderLockedIndicators();
  if (typeof MultiplayerViz !== 'undefined')            MultiplayerViz.update();
  if (typeof MultiplayerPlayerMode !== 'undefined')     MultiplayerPlayerMode.update(delta);

  // ── ☀️ Soya ──────────────────────────────────────────────
  //  Render'dan OLDIN — Three.js soya xaritasini render ichida chizadi.
  //  `moving`: o'yin ketyapti YOKI tanlangan obyekt gizmo bilan surilyapti.
  //  Ikkalasi ham bo'lmasa — sahna statik, soya qayta hisoblanmaydi.
  if (typeof applyShadowUpdate === 'function') {
    let moving = (typeof isPlaying !== 'undefined') && isPlaying;
    if (!moving && typeof selectedObj !== 'undefined' && selectedObj) {
      selectedObj.getWorldPosition(_shTmpP);
      if (_shLastSel !== selectedObj || _shTmpP.distanceToSquared(_shLastPos) > 1e-8) {
        _shLastSel = selectedObj;
        _shLastPos.copy(_shTmpP);
        moving = true;
      }
    }
    applyShadowUpdate(moving);
  }

  // ── Render ───────────────────────────────────────────────
  renderer.render(scene, camera);
}