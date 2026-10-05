// PLAYER CONTROLLER — O'yin rejimida FPS player
// ============================================================
let playerMesh   = null;
let playerVel    = new THREE.Vector3();
let playerOnGround = false;
let playerYaw    = 0;
const PLAYER_SPEED  = 6;
const PLAYER_JUMP   = 8;
const PLAYER_HEIGHT = 1.0;
const PLAYER_RADIUS = 0.4;

// ⚠ Kamera maqsadi uchun QAYTA ISHLATILADIGAN vektor. Ilgari har kadr
//   `new THREE.Vector3(...)` yaratilardi — sekundiga 60+ ta axlat obyekt.
//   Bunday tomchilab yig'ilgan axlat GC ni ishga soladi va u aynan
//   harakat paytida qisqa "sakrash"lar beradi.
const _camTarget = new THREE.Vector3();

// ============================================================
//  📐 _playerHalf — O'YINCHI QUTISINING HAQIQIY yarim o'lchami
// ------------------------------------------------------------
//  ⚠ MUAMMO (foydalanuvchi topgan): hamma joyda `o.scale.y * 0.5`
//    ishlatilardi. Bu geometriya BIRLIK KUB (1×1×1) deb faraz qiladi.
//    Lekin:
//      • standart o'yinchi — balandligi 2 birlik SILINDR, ya'ni
//        haqiqiy yarim balandlik `scale.y × 1.0`. Formula ikki
//        barobar kichik chiqarardi va o'yinchining YARMI YER OSTIDA
//        qolardi;
//      • import qilingan model — istalgan o'lchamda;
//      • shar, silindr, konus — har biri boshqacha.
//
//  ⚠ BURILISH ham hisobga olinadi: obyektni yon tomonga cho'zib
//    keyin bursangiz, u tor joyga SIG'MASLIGI kerak. Ilgari quti
//    dunyo o'qlariga parallel edi va burilish e'tiborsiz qolardi —
//    cho'zilgan o'yinchi 90° burilib tor eshikdan o'tib ketardi.
//
//  ⚠ O'lchov geometriyadan CACHE bilan olinadi: `boundingBox`
//    hisoblash arzon emas va u har kadr, har obyekt uchun
//    chaqirilardi.
// ============================================================
const _phBox = new THREE.Box3();
const _phSize = new THREE.Vector3();
const _phScale = new THREE.Vector3();
const _phOut = { x: 0.5, y: 0.5, z: 0.5 };

function _playerHalf(o) {
  if (!o) { _phOut.x = _phOut.y = _phOut.z = 0.5; return _phOut; }
  //  Lokal yarim o'lcham — geometriyada CACHE qilinadi.
  let lh = o.geometry && o.geometry.__plHalf;
  if (!lh) {
    lh = { x: 0.5, y: 0.5, z: 0.5 };
    try {
      if (o.geometry) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        if (bb) {
          bb.getSize(_phSize);
          lh = { x: _phSize.x * 0.5, y: _phSize.y * 0.5, z: _phSize.z * 0.5 };
        }
      } else {
        //  ⚠ Geometriyasiz obyekt (📁 guruh, import qilingan model
        //    ildizi) — bolalarini qamrab olamiz. Busiz model o'yinchi
        //    bo'lganda quti 1×1×1 bo'lib qolardi.
        _phBox.setFromObject(o);
        _phBox.getSize(_phSize);
        const s = o.scale;
        lh = { x: _phSize.x * 0.5 / (s.x || 1),
               y: _phSize.y * 0.5 / (s.y || 1),
               z: _phSize.z * 0.5 / (s.z || 1) };
      }
    } catch (e) {}
    if (o.geometry) o.geometry.__plHalf = lh;
  }
  o.getWorldScale(_phScale);
  const hx = Math.abs(lh.x * _phScale.x);
  const hy = Math.abs(lh.y * _phScale.y);
  const hz = Math.abs(lh.z * _phScale.z);

  //  ── Burilish: dunyo AABB si ──────────────────────────
    //  ⚠ Burilgan qutining dunyo o'qlari bo'yicha qamrovi — matritsa
    //    ustunlarining mos komponentlari moduli yig'indisi.
    //    🚗 Mashinadagi `_obbWorldHalf` bilan AYNAN bir xil usul.
  const q = o.quaternion;
  if (Math.abs(q.x) > 1e-4 || Math.abs(q.y) > 1e-4 || Math.abs(q.z) > 1e-4) {
    o.updateMatrixWorld(true);
    const e = o.matrixWorld.elements;
    //  Ustunlar masshtabni o'z ichiga oladi — shuning uchun LOKAL
    //  yarim o'lchamlar bilan ko'paytiriladi.
    _phOut.x = Math.abs(e[0]) * lh.x + Math.abs(e[4]) * lh.y + Math.abs(e[8])  * lh.z;
    _phOut.y = Math.abs(e[1]) * lh.x + Math.abs(e[5]) * lh.y + Math.abs(e[9])  * lh.z;
    _phOut.z = Math.abs(e[2]) * lh.x + Math.abs(e[6]) * lh.y + Math.abs(e[10]) * lh.z;
  } else {
    _phOut.x = hx; _phOut.y = hy; _phOut.z = hz;
  }
  return _phOut;
}
window._playerHalf = _playerHalf;



function createPlayer() {
  if (playerMesh) { scene.remove(playerMesh); playerMesh=null; }
  // Invisible capsule (visual indicator only in editor)
  const geo = new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT*2, 12);
  const mat = new THREE.MeshStandardMaterial({
    color:0x00e5ff, roughness:0.3, metalness:0.1,
    transparent:true, opacity: isPlaying ? 0.0 : 0.3,
    wireframe: !isPlaying
  });
  playerMesh = new THREE.Mesh(geo, mat);
  playerMesh.castShadow = false;
  playerMesh.userData = {id:-1, name:'Player', isPlayer:true};
  // Start position: find spawn or use default
  const spawn = objects.find(o=>o.userData.isSpawn);
  if (spawn) playerMesh.position.copy(spawn.position).add(new THREE.Vector3(0,2,0));
  else playerMesh.position.set(0, PLAYER_HEIGHT+1, 5);
  scene.add(playerMesh);
  playerVel.set(0,0,0);
  playerYaw = Math.PI;
  log('🎮 Player tushdi — WASD:yur, Space:sakra, Mouse:bosh', 'lok');
}

function destroyPlayer() {
  if (playerMesh) { scene.remove(playerMesh); playerMesh=null; }
}

// ============================================================
// setPlayerObj — Inspector dan "Oyinchi Qil" bosganda
// ============================================================
window.setPlayerObj = function(obj) {
  // Zaminni oyinchi qilib bo'lmaydi
  if (obj && (obj.userData.type === 'Tekislik' || obj.userData.name === 'Zamin')) {
    log('⚠ Zaminni oyinchi qilib bo\'lmaydi! Boshqa ob\'ekt tanlang.', 'lw');
    return;
  }
  // Oldingi oyinchini tozalash
  objects.forEach(o => { o.userData.isPlayerObj = false; });
  if (obj) {
    obj.userData.isPlayerObj = true;
    log(`🎮 "${obj.userData.name}" — oyinchi qilindi. ▶ O'YNA bosing.`, 'lok');
  }
  updateInspector();
  updateHierarchy();
};

// ============================================================
// PlayerController — istalgan ob'ektni WASD bilan boshqarish
// ============================================================
// ── Moving Platform uchun shared allocations (per-frame GC oldini olish) ──
const _tmp = {
  pos:    new THREE.Vector3(),
  currPos:new THREE.Vector3(),
  currQ:  new THREE.Quaternion(),
  lastQinv: new THREE.Quaternion(),
  dPos:   new THREE.Vector3(),
  dq:     new THREE.Quaternion(),
  de:     new THREE.Euler(),
  rel:    new THREE.Vector3(),
  prevPos:new THREE.Vector3(),
  up:     new THREE.Vector3(0, 1, 0),
  scl:    new THREE.Vector3(),   // ⚠ YANGI: decompose uchun (natija tashlanadi)
};

// 🛤 Yo'l shakli OBB to'qnashuvi uchun scratch obyektlar
const _segC  = new THREE.Vector3();
const _segL  = new THREE.Vector3();
const _segQ  = new THREE.Quaternion();
const _segQi = new THREE.Quaternion();

// ── Burilgan obyekt (OBB) to'qnashuvi uchun ishchi obyektlar ──
const _obbQ  = new THREE.Quaternion();
const _obbQi = new THREE.Quaternion();
const _obbL  = new THREE.Vector3();   // o'yinchi — obyektning LOKAL fazosida
const _obbN  = new THREE.Vector3();   // itarish normali
const _obbM  = new THREE.Matrix4();

const PlayerController = {
  obj: null,          // boshqarilayotgan ob'ekt
  vel: null,          // THREE.Vector3 tezlik
  camYaw: 0,
  // ============================================================
  //  👁 ERKIN KAMERA (\"Alt qarash\")
  // ------------------------------------------------------------
  //  Klavish BOSIB TURILGANDA kamera erkin aylanadi, personaj esa
  //  QIMIRLAMAYDI — o'yinchi yurish yo'nalishini yo'qotmasdan atrofga
  //  qaray oladi. MMO larda klassik \"free look\".
  //
  //  ⚠ Qo'yib yuborilganda kamera personaj orqasiga QAYTADI. Aks
  //    holda o'yinchi yon tomonga qarab yurib ketardi va boshqaruv
  //    buzilgandek tuyulardi.
  _freeLook: false,
  _freeLookYaw: 0,      // qo'yib yuborilganda qaytadigan burchak
  camPitch: 0,
  camMode: 'fps',     // 'fps' | 'third'
  onGround: false,
  keys: {},
  _mouseBound: false,
  _vPressed: false,

  // ── Moving Platform (harakatlanuvchi obyekt ustida turish) ──
  _groundObj:     null,   // Oxirgi frame'da oyinchi ustida turgan obyekt
  _groundLastPos: null,   // Platforma oxirgi world pozitsiyasi
  _groundLastQuat:null,   // Platforma oxirgi world rotatsiyasi (quaternion)
  _groundVel:     null,   // Platforma tezligi (sakrash inersiyasi uchun)

  start(obj) {
    this.stop();
    this.obj = obj;
    // YXZ order: Y(kamera burish) avval, X/Z(animatsiya) keyin — qiyashmaslik uchun
    obj.rotation.order = 'YXZ';
    // Fizikani o'chir — PlayerController o'zi boshqaradi
    if (window.removeRapierBody) removeRapierBody(obj);
    this._physicsData = obj.userData.physics ? { ...obj.userData.physics } : null;
    this.vel = new THREE.Vector3();
    // ── 🧭 BOSHLANG'ICH QARASH YO'NALISHI ──────────────────────
    //  ⚠ ALOMAT: o'yin boshlanishi bilan kamera HAR DOIM bitta
    //    tomonga qarardi. Obyektni istagancha bursangiz ham foydasi
    //    yo'q edi — qahramon bir tomonga qarab turib, kamera boshqa
    //    tomonni ko'rsatardi.
    //
    //  ⚠ SABAB: `camYaw` to'g'ridan `camInitYaw` dan olinardi. Bu
    //    MUTLAQ burchak — dunyo o'qlariga nisbatan. Obyektning o'z
    //    burilishi hisobga OLINMASDI.
    //
    //  YECHIM: burchak endi obyektning burilishiga QO'SHIMCHA
    //    bo'lib qo'llanadi. `camInitYaw = 0` degani "qahramon qayerga
    //    qarab tursa, kamera ham o'sha yerga". Eski mutlaq xulq
    //    kerak bo'lsa — `camYawFromObj` ni o'chirish mumkin.
    //
    //  ⚠ `rotation.y` EMAS, DUNYO kvaternioni: qahramon papka ichida
    //    yoki boshqa obyektga biriktirilgan bo'lsa, lokal burchak
    //    haqiqiy yo'nalishni bermaydi.
    let _baseYaw = 0;
    if (playerSettings.camYawFromObj !== false) {
      try {
        obj.updateMatrixWorld(true);
        _baseYaw = new THREE.Euler().setFromQuaternion(
          obj.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
      } catch (e) { _baseYaw = obj.rotation.y || 0; }
    }
    this._baseYaw = _baseYaw;
    this.camYaw   = _baseYaw + (playerSettings.camInitYaw ?? 0) * Math.PI / 180;
    this.camPitch = (playerSettings.camInitPitch ?? 0) * Math.PI / 180;
    // Boshlang'ich rejim — sozlamадан, ruxsat berilганини tanlaymiz
    this.camMode  = playerSettings.camMode || 'fps';
    if (this.camMode === 'fps'   && playerSettings.camAllow1st === false) this.camMode = 'third';
    if (this.camMode === 'third' && playerSettings.camAllow3rd === false) this.camMode = 'fps';
    if (playerSettings.camAllow1st === false && playerSettings.camAllow3rd === false) this.camMode = 'fps';
    this.onGround = false;
    this.stamina    = playerSettings.staminaMax ?? 100;
    this._landLockT = 0;
    this._camBob    = 0;
    this._sprintTime   = 0;
    this._sprintBlockT = 0;
    this.keys     = {};
    this._vPressed = false;

    this._onKey = e => {
      if (!isPlaying) return;
      // ── ⌨ 📄 HTML sahifa qulfi ──────────────────────────────
      //  ⚠ Dialog ochilganda o'yinchi yurib ketmasligi kerak: matn
      //    o'qiyotgan odam tasodifan WASD bosib qahramonni jarga
      //    tushirib yuborardi.
      //
      //  ⚠ `Escape` O'TKAZILADI — aks holda qulf qotib qolsa
      //    o'yindan chiqib bo'lmasdi.
      // ============================================================
      //  ⚠ MATN MAYDONIGA YOZISHGA XALAQIT BERMASLIK
      // ------------------------------------------------------------
      //  XATO BOR EDI: `_htmlKeyLock` yoniq bo'lganda har qanday
      //  klavish uchun `preventDefault()` chaqirilardi — shu jumladan
      //  `<input>` ga yozilayotganda ham. Natijada 💬 chatga BIRORTA
      //  HARF ham kiritib bo'lmasdi: qulf yonardi, o'yin klavishni
      //  \"tortib olardi\" va maydon bo'sh qolaverardi.
      //
      //  Foydalanuvchi aynan shuni ko'rdi: \"chatga yozib bo'lmayapti,
      //  klaviatura bloklangan\".
      //
      //  ⚠ Tekshiruv QULFDAN OLDIN: qulfning o'zi ham shu bilan
      //    chetlab o'tiladi, chunki matn maydoni fokusda bo'lsa
      //    o'yin baribir klavish olmasligi kerak.
      const _tg = e.target;
      const _typing = !!_tg && (
        _tg.tagName === 'INPUT' || _tg.tagName === 'TEXTAREA' ||
        _tg.tagName === 'SELECT' || _tg.isContentEditable === true);
      if (_typing) {
        //  ⚠ Klavish o'yinga TUSHMAYDI, lekin `preventDefault` ham
        //    QILINMAYDI — aks holda harf maydonga yozilmasdi.
        this.keys[e.code] = false;
        return;
      }

      if (window._htmlKeyLock && e.code !== 'Escape') {
        this.keys[e.code] = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.keys[e.code] = true;

      //  💬 Multiplayer chat — klavishni oladi.
      //  ⚠ SHU YERDA: o'yinchining tinglovchisi o'yin rejimida
      //    ishlaydi va muharrirda tegmaydi. Alohida tinglovchi
      //    yozsak muharrirda ham chat ochilib ketardi.
      //  ⚠ `try` ichida: tizim yo'q bo'lsa o'yinchi harakati
      //    BUZILMASIN.
      try {
        if (window.MultiplayerSystem && MultiplayerSystem.onKey &&
            MultiplayerSystem.onKey(e.code)) {
          this.keys[e.code] = false;
          e.preventDefault();
          return;
        }
      } catch (err) {}
      // Alt tugmasi: bodyRotate on/off
      // ⚠ `e.repeat` — brauzer tugma BOSIB TURILGANDA `keydown` ni
      //   qayta-qayta yuboradi. Tekshirmasak Alt sekundiga o'nlab
      //   marta almashardi va natija tasodifiy chiqardi — ya'ni
      //   "ishlamayapti" degan taassurot berardi.
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && !e.repeat) {
        e.preventDefault();
        playerSettings.bodyRotate = !playerSettings.bodyRotate;
        const state = playerSettings.bodyRotate ? 'YOQILDI' : 'OCHIRILDI';
        showGameMessage('🔄 Obyekt burilishi: ' + state, playerSettings.bodyRotate ? 'var(--accent3)' : '#ff8844');
      }
      if (['Space','ShiftLeft','ShiftRight','KeyW','KeyA','KeyS','KeyD',
           'ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyV'].includes(e.code)) {
        e.preventDefault(); // sahifaning scrollini to'xtat, boshqa handlerlarga o'tkazamiz
      }
    };
    this._offKey = e => { this.keys[e.code] = false; };
    this._onMouse = e => {
      if (!isPlaying) return;
      // Pointer lock bo'lmasa ham canvas ustida bo'lsa ishlaydi
      if (!document.pointerLockElement && !this._mouseDown) return;
      const mx = e.movementX || 0;
      const my = e.movementY || 0;
      if (mx === 0 && my === 0) return;
      const s = camSensitivity * (this.camMode === 'fps'
        ? (playerSettings.cam1stRotateSpeed ?? 1.0)
        : (playerSettings.cam3rdRotateSpeed ?? 1.0));
      this.camYaw   -= mx * s;
      this.camPitch -= my * s;
      this.camPitch  = Math.max(-1.3, Math.min(1.3, this.camPitch));
    };
    this._onMouseDown = () => { this._mouseDown = true; };
    this._onMouseUp   = () => { this._mouseDown = false; };

    // Scroll kameraga tegmasin — play modeda wheel ni blokla
    this._onWheel = e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      // Animatsiyani shu yerdan trigger qilamiz
      if (window._triggerMouseAnim) {
        const dir = e.deltaY < 0 ? 'wheelup' : 'wheeldown';
        const other = e.deltaY < 0 ? 'wheeldown' : 'wheelup';
        if (window._stopKbAnim) window._stopKbAnim('🖱' + other);
        window._triggerMouseAnim(dir);
      }
    };
    const canvas = document.getElementById('three-canvas');
    if (canvas) canvas.addEventListener('wheel', this._onWheel, { passive: false, capture: true });

    document.addEventListener('keydown',   this._onKey,   { capture: true });
    document.addEventListener('keyup',     this._offKey,  { capture: true });
    document.addEventListener('mousemove',  this._onMouse);
    document.addEventListener('mousedown',  this._onMouseDown);
    document.addEventListener('mouseup',    this._onMouseUp);

    // Pointer lock — faqat foydalanuvchi bosganida
    const c = document.getElementById('three-canvas');
    if (c) {
      this._canvasClick = () => {
        // 💻 PC ichida — kursor erkin bo'lishi kerak, qulflamaymiz
        if (window._pcCursorFree) return;
        if (isPlaying && document.pointerLockElement !== c) {
          // Firefox'da requestPointerLock() undefined qaytaradi (Chrome'da Promise) —
          // shuning uchun .catch ni faqat Promise bo'lsa chaqiramiz.
          try { const _p = c.requestPointerLock(); if (_p && typeof _p.catch === 'function') _p.catch(()=>{}); }
          catch(e) {}
        }
      };
      c.addEventListener('click', this._canvasClick);
    }

    this._createHUD();
    window._playerControllerRef = this;
    log(`🎮 "${obj.userData.name}" boshqarilmoqda — WASD yur | Space sakra | V kamera | Esc to'xtat`, 'lok');
  },

  stop() {
    if (!this.obj) return;
    if (this._onKey)   document.removeEventListener('keydown',   this._onKey,   { capture: true });
    if (this._offKey)  document.removeEventListener('keyup',     this._offKey,  { capture: true });
    if (this._onMouse)     document.removeEventListener('mousemove',  this._onMouse);
    if (this._onMouseDown) document.removeEventListener('mousedown',  this._onMouseDown);
    if (this._onMouseUp)   document.removeEventListener('mouseup',    this._onMouseUp);
    const c = document.getElementById('three-canvas');
    if (c && this._canvasClick) c.removeEventListener('click', this._canvasClick);
    if (document.pointerLockElement) {
      document.exitPointerLock();
      // exitPointerLock keyin brauzer canvas ga click yuboradi — uni bloklash
      const c2 = document.getElementById('three-canvas');
      if (c2) {
        const blocker = e => { e.stopImmediatePropagation(); e.preventDefault(); };
        c2.addEventListener('click', blocker, { capture: true, once: true });
      }
    }
    // OrbitControls ni qaytarish
    if (window.orbitControls) {
      window.orbitControls.enabled = true;
      window.orbitControls.enableZoom = true;
    }
    if (window.controls) {
      window.controls.enabled = true;
      window.controls.enableZoom = true;
    }
    // Wheel blokni olib tashla
    const canvas = document.getElementById('three-canvas');
    if (canvas && this._onWheel) canvas.removeEventListener('wheel', this._onWheel, { capture: true });
    document.getElementById('pc-hud')?.remove();
    // Fizikani qayta yoq
    if (this.obj && this._physicsData && window.addPhysicsBody) {
      this.obj.userData.physics = this._physicsData;
      addPhysicsBody(this.obj, this._physicsData);
    }
    this.obj  = null;
    this.vel  = null;
    this.keys = {};
    window._playerControllerRef = null;
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 0, 0);
  },


  _createHUD() {
    document.getElementById('pc-hud')?.remove();
    const hud = document.createElement('div');
    hud.id = 'pc-hud';
    hud.style.cssText = `
      position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
      display:flex;gap:8px;z-index:8888;
      font-family:'Share Tech Mono',monospace;pointer-events:auto;
    `;
    hud.innerHTML = `
      <button id="pc-cam-btn" onclick="PlayerController.toggleCam()"
        style="background:rgba(0,0,0,.75);border:1px solid var(--accent);color:var(--accent);
        padding:5px 14px;border-radius:4px;font-size:11px;cursor:pointer;letter-spacing:1px">
        👁 1-SHAXS
      </button>
      <div style="background:rgba(0,0,0,.65);border:1px solid var(--border);color:var(--muted);
        padding:5px 12px;border-radius:4px;font-size:10px;line-height:1.5;pointer-events:none">
        WASD yur &nbsp;|&nbsp; Space sakra &nbsp;|&nbsp; V kamera &nbsp;|&nbsp; Shift tez
      </div>
    `;
    document.body.appendChild(hud);
  },

  toggleCam() {
    const allow1 = playerSettings.camAllow1st !== false;
    const allow3 = playerSettings.camAllow3rd !== false;
    if (!allow1 && !allow3) return;                 // ikkalasi ham o'chiq — hech narsa
    const target = this.camMode === 'fps' ? 'third' : 'fps';
    if (target === 'fps'   && !allow1) return;       // 1-shaxs o'chiq — o'tmaymiz
    if (target === 'third' && !allow3) return;       // 3-shaxs o'chiq — o'tmaymiz
    this.camMode = target;
    const btn = document.getElementById('pc-cam-btn');
    if (btn) btn.textContent = this.camMode === 'fps' ? '👁 1-SHAXS' : '👥 3-SHAXS';
  },

  // ────────────────────────────────────────────────────────────
  // MOVING PLATFORM SUPPORT
  // ────────────────────────────────────────────────────────────
  // Har frame boshida chaqiriladi. Agar oldingi frame'da oyinchi biror
  // obyekt ustida turgan bo'lsa (mashina, aylanma platforma, timeline'li
  // kub), o'sha obyektning delta transform'i oyinchiga qo'llaniladi.
  //
  // MUHIM: matrix compose/decompose'ni ishlatmaymiz — floating-point drift
  // paydo bo'lishi mumkin (harakatsiz platformada ham juda kichik "harakat"
  // ko'rinardi). Endi to'g'ridan-to'g'ri getWorldPosition/getWorldQuaternion
  // qo'llanadi, va o'zgarish sezilarli bo'lgandagina qo'llanadi.
  _applyPlatformCarry(delta) {
    const o = this.obj;
    if (!this._groundObj || !this._groundObj.parent || !this._groundLastPos) return;

    // ── 🚫 OCHIQ — oyinchi platforma bilan KETMAYDI ─────────────
    //  ⚠ Ikkalasi ham 🚫 OCHIQ bo'lsa hech kim hech kimni ko'tarmaydi:
    //    platforma o'z harakatida, oyinchi o'z harakatida. Oyinchi
    //    joyida turadi, platforma esa uning tagidan sirg'alib o'tadi.
    //
    //  ⚠ Platformada ANIQ rejim bo'lsa (📤/📥) — u baribir yutadi.
    //    Aks holda dizayner "bu platforma ko'taradi" deb belgilagani
    //    oyinchining bitta sozlamasi bilan bekor bo'lardi.
    if (this._resolvePlatformMode(this._groundObj) === 'none') {
      // Tezlik ham nolga tushadi — sakraganda inersiya bermasin
      if (this._groundVel) this._groundVel.set(0, 0, 0);
      // ⚠ Kuzatuv nuqtasi baribir yangilanadi: aks holda rejim
      //   keyin yoqilsa, platforma o'sha oraliqda bosib o'tgan butun
      //   yo'lni oyinchiga BIR ZARBADA berib yuborardi.
      this._groundObj.updateMatrixWorld(true);
      this._groundObj.matrixWorld.decompose(_tmp.currPos, _tmp.currQ, _tmp.scl);
      this._groundLastPos.copy(_tmp.currPos);
      this._groundLastQuat.copy(_tmp.currQ);
      return;
    }

    this._groundObj.updateMatrixWorld(true);
    // ⚠ TUZATILDI — PLATFORMA AYLANISHI XATOSI:
    // Quaternion.setFromRotationMatrix() three.js hujjatiga ko'ra matritsaning
    // yuqori 3x3 qismi SOF AYLANISH (scale'siz) bo'lishini talab qiladi.
    // Platforma esa deyarli doim scale'li (masalan 5 x 0.5 x 5) — kubni
    // cho'zib yasaladi. Natijada quaternion NORMALLASHMAGAN va NOTO'G'RI
    // chiqardi: 30° burilish 109° deb hisoblanardi, kamera esa 90° o'rniga
    // 2435° ga aylanib ketardi. decompose() scale'ni ajratib, sof aylanishni
    // beradi — yagona to'g'ri usul.
    this._groundObj.matrixWorld.decompose(_tmp.currPos, _tmp.currQ, _tmp.scl);

    // ── Delta position (world) ──
    _tmp.dPos.subVectors(_tmp.currPos, this._groundLastPos);

    // ── Delta rotation (yaw only, YXZ order) ──
    _tmp.lastQinv.copy(this._groundLastQuat).invert();
    _tmp.dq.multiplyQuaternions(_tmp.currQ, _tmp.lastQinv);
    _tmp.de.setFromQuaternion(_tmp.dq, 'YXZ');
    const dYaw = _tmp.de.y;

    // ── Skip if change is insignificant (drift oldini olish) ──
    // Bu harakatsiz platformada oyinchini oldinga surib yuborishning oldini oladi.
    if (_tmp.dPos.lengthSq() < 1e-8 && Math.abs(dYaw) < 1e-5) {
      // Tezlikni ham nolga tushuramiz (oldingi kadr harakati unutilsin)
      if (this._groundVel) this._groundVel.set(0, 0, 0);
      return;
    }

    _tmp.prevPos.copy(o.position);

    // ── Siljish qo'llash ──
    o.position.add(_tmp.dPos);

    // ── Aylanish qo'llash (Y o'q atrofida, platforma markazi bo'yicha) ──
    if (Math.abs(dYaw) > 1e-5) {
      _tmp.rel.subVectors(o.position, _tmp.currPos);
      _tmp.rel.applyAxisAngle(_tmp.up, dYaw);
      o.position.copy(_tmp.currPos).add(_tmp.rel);
      this.camYaw += dYaw;
    }

    // ── Tezlik (sakrash inersiyasi uchun) ──
    if (!this._groundVel) this._groundVel = new THREE.Vector3();
    this._groundVel.subVectors(o.position, _tmp.prevPos).divideScalar(Math.max(0.001, delta));
  },

  // ── 🛗 REJIMNI HAL QILISH: platforma + oyinchi ──────────────
  //  Platforma 🚫 O'CHIQ ('off', standart)
  //        → platformada aniq qaror yo'q, OYINCHIning rejimidan ilhomlanadi.
  //  Platforma 📤 TASHQI / 📥 ICHKI
  //        → aniq qaror bor: PLATFORMA YUTADI 😈, oyinchi sozlamasi e'tiborsiz.
  //  Oyinchi   📤 TASHQI (standart) / 📥 ICHKI
  //
  //  Eski sahnalar bilan moslik: platformMode yo'q yoki 'off' → oyinchi
  //  standarti 'external' → natija 'external' (avvalgidek klassik platforma).
  _resolvePlatformMode(plat) {
    const pm = plat && plat.userData && plat.userData.platformMode;
    if (pm === 'external' || pm === 'internal') return pm;   // 😈 platforma yutadi
    // 🚫 O'CHIQ — qaror oyinchida
    const plm = this.obj && this.obj.userData && this.obj.userData.platformMode;
    // ⚠ Oyinchi ham 🚫 OCHIQ — hech kim ko'tarmaydi.
    //   Eski sahnalarda `platformMode` umuman yo'q → 'external'
    //   (avvalgidek klassik platforma). Faqat ATAYLAB 'off' qo'yilsa
    //   ko'tarish uziladi.
    if (plm === 'off') return 'none';
    return (plm === 'internal') ? 'internal' : 'external';
  },

  // Har frame collision loop'idan keyin chaqiriladi.
  _updatePlatformTracking(currentGroundObj) {
    if (currentGroundObj) {
      // Yangi obyektga o'tildi — tezlikni tiklaymiz
      if (this._groundObj !== currentGroundObj) {
        this._groundVel = null;
      }
      this._groundObj = currentGroundObj;
      currentGroundObj.updateMatrixWorld(true);
      if (!this._groundLastPos)  this._groundLastPos  = new THREE.Vector3();
      if (!this._groundLastQuat) this._groundLastQuat = new THREE.Quaternion();
      // ⚠ TUZATILDI: decompose — scale'li matritsadan sof aylanish
      currentGroundObj.matrixWorld.decompose(this._groundLastPos, this._groundLastQuat, _tmp.scl);
      return;
    }

    // Bu frame'da yer topilmadi. 2 xil holat:
    const gObj = this._groundObj;
    const isInternal = gObj && this._resolvePlatformMode(gObj) === 'internal';

    if (isInternal && gObj.parent) {
      // ICHKI rejim — havoda bo'lsa ham bog'lanib qoladi, faqat gorizontal
      // chegaradan chiqilsa uziladi (mashina ichi kabi).
      gObj.updateMatrixWorld(true);
      const _wp = _tmp.pos.setFromMatrixPosition(gObj.matrixWorld);
      const _ph0 = _playerHalf(this.obj);
      const pHW = _ph0.x;
      const pHD = _ph0.z;
      // ⚠ TUZATILDI: world scale (papka ichidagi platforma uchun)
      const _gws = gObj.getWorldScale(new THREE.Vector3());
      const oHW = _gws.x * 0.5;
      const oHD = _gws.z * 0.5;
      const dx  = this.obj.position.x - _wp.x;
      const dz  = this.obj.position.z - _wp.z;
      if (Math.abs(dx) < (pHW + oHW) && Math.abs(dz) < (pHD + oHD)) {
        // Hali chegara ichida — matrixni yangilash va qolish
        if (!this._groundLastPos)  this._groundLastPos  = new THREE.Vector3();
        if (!this._groundLastQuat) this._groundLastQuat = new THREE.Quaternion();
        // ⚠ TUZATILDI: decompose
        gObj.matrixWorld.decompose(this._groundLastPos, this._groundLastQuat, _tmp.scl);
        return;
      }
    }

    // Platformadan chiqildi — inersiya
    if (this._groundObj && this._groundVel) {
      this.vel.x += this._groundVel.x;
      this.vel.z += this._groundVel.z;
      if (this._groundVel.y > 0.5) {
        this.vel.y += this._groundVel.y * 0.5;
      }
    }
    this._groundObj      = null;
    this._groundLastPos  = null;
    this._groundLastQuat = null;
    this._groundVel      = null;
  },

  update(delta) {
    if (!this.obj || !isPlaying) return;

    // ============================================================
    //  👁 ERKIN KAMERA — klavish holatini kuzatish
    // ------------------------------------------------------------
    //  ⚠ `fpsKeys` SO'RALADI, hodisa tinglanmaydi: shunda ⌨🖥 ekran
    //    tugmasi va alternativ klavish ham ishlaydi. Hodisa tinglasak
    //    telefonda erkin kamera ishlamasdi.
    //  ⚠ 🚫 Bloklangan bo'lsa `fpsKeys` allaqachon tozalangan —
    //    alohida tekshiruv kerak emas (`_kbEnforceBlocks` bizdan
    //    OLDIN yuradi).
    {
      const ps0 = (typeof playerSettings !== 'undefined') ? playerSettings : null;
      const on  = !!(ps0 && ps0.freeLookOn);
      const key = (ps0 && ps0.freeLookKey) || 'AltLeft';
      const held = on && !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[key]);
      if (held && !this._freeLook) {
        //  Boshlanish — personajning hozirgi burchagini eslab qolamiz
        this._freeLook = true;
        this._freeLookYaw = this.obj.rotation.y;
      } else if (!held && this._freeLook) {
        this._freeLook = false;
        //  ⚠ Kamera personaj ORQASIGA qaytadi. Aks holda o'yinchi yon
        //    tomonga qarab yurib ketardi va boshqaruv buzilgandek
        //    tuyulardi. Bu \"free look\" ning butun ma'nosi: qarash
        //    VAQTINCHA, yo'nalish esa saqlanadi.
        this.camYaw = this._freeLookYaw;
      }
    }

    // ============================================================
    //  👻 NOCLIP — `noclip 1` konsol komandasi
    // ------------------------------------------------------------
    //  ⚠ Dvigatelda ilgari haqiqiy noclip yo'q edi. `_pcFocusLock`
    //    bor edi, lekin u BOSHQA narsa: o'yinchini MUZLATADI (PC
    //    ekraniga qaraganda). Bu yerда kerak bo'lgani — erkin uchish:
    //    gravitatsiya yo'q, to'qnashuv yo'q, devordan o'tib ketadi.
    //
    //  ⚠ Butun `update()` ni CHETLAB o'tamiz — to'qnashuv sikllari,
    //    zamin, platforma, narvon, step-up hammasi shu funksiya
    //    ichida. Ularga bittalab "agar noclip bo'lmasa" shartini
    //    qo'yish o'nlab joyni chalkashtirardi.
    if (this.noclip) {
      const psN = playerSettings;
      const K  = fpsKeys;        // ⚠ o'yin klavish holati SHU (this.keys emas)
      const bk = psN.keys || {   // foydalanuvchi bind qilgan tugmalar
        forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD',
        jump: 'Space', sprint: 'ShiftLeft',
      };
      // Qarash yo'nalishi (pitch ham hisobga olinadi — yuqoriga qarab uchish)
      const cy = Math.cos(this.camPitch);
      const fwd = new THREE.Vector3(
        -Math.sin(this.camYaw) * cy, Math.sin(this.camPitch), -Math.cos(this.camYaw) * cy);
      const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
      const mv = new THREE.Vector3();
      if (K[bk.forward])  mv.add(fwd);
      if (K[bk.backward]) mv.sub(fwd);
      if (K[bk.left])     mv.sub(right);
      if (K[bk.right])    mv.add(right);
      if (K[bk.jump])     mv.y += 1;
      if (K['ControlLeft'] || K['KeyC']) mv.y -= 1;

      const spd = (psN.speed || 6) * (K[bk.sprint] ? (psN.sprintMult || 2) : 1) * 1.6;
      if (mv.lengthSq() > 0) this.obj.position.addScaledVector(mv.normalize(), spd * delta);
      this.vel.set(0, 0, 0);
      this.onGround = false;
      if (!this._freeLook) this.obj.rotation.y = this.camYaw;
      this._updateCameraOnly(delta);
      return;
    }

    // 💻 PC fokusida — NOCLIP: o'yinchi muzlaydi, gravitatsiya
    // va to'qnashuv o'chadi, kamerani PCBlockSystem oladi.
    if (window._pcFocusLock) {
      this.vel.set(0, 0, 0);
      this._groundObj = null; this._groundLastPos = null;
      this._groundLastQuat = null; this._groundVel = null;
      return;
    }
    // Mashina ichida bo'lsa — o'yinchi mantiqi to'xtaydi (kamera va harakat — car.js da)
    if (typeof carInside !== 'undefined' && carInside) {
      // Platform holatini tozalash — mashina ichida bo'lganimizda "platforma
      // ustida turish" holatini eslab qolmasligimiz kerak
      this._groundObj      = null;
      this._groundLastPos  = null;
      this._groundLastQuat = null;
      this._groundVel      = null;
      return;
    }
    const o = this.obj;
    const ps = playerSettings;
    const GRAV = -25, JUMP = (playerSettings.jumpForce ?? 10);
    const K = fpsKeys;
    const bk = ps.keys;

    // ── 🪜 NARVON: narvonда bo'lsa o'yinchi mantiqi butunlay o'zgaradi
    //    (gravitatsiya o'chadi, W/S vertikal harakat bo'ladi). LadderSystem
    //    o'yinchini ko'taradi/tushiradi. ⚠ return QILMAYMIZ — aks holda
    //    quyidagi kamera yangilanish qismiga yetmay, kamera qotib qolardi.
    //    Buning o'rniga `_onLadder` flag'ini qo'yamiz: harakat/gravitatsiya
    //    o'tkazib yuboriladi, lekin kamera pastda normal yangilanadi.
    let _onLadder = false;
    if (window.LadderSystem && LadderSystem.updatePlayer(this, delta)) {
      _onLadder = true;
      this._groundObj = null; this._groundLastPos = null;
      this._groundLastQuat = null; this._groundVel = null;
    }

    // ── MOVING PLATFORM: oyinchi harakatlanuvchi obyekt ustida tursa
    //    (mashina, aylanma platforma, timeline'li kub) — u bilan birga boradi.
    //    Bu QADAM oyinchi o'z tezligini qo'llashdan OLDIN bajariladi:
    //    platforma delta'si → oyinchi pozitsiyasi, keyin oyinchining tezligi.
    this._applyPlatformCarry(delta);

    // Yo'nalish — standart: W=oldinga, S=orqaga, A=chapga, D=o'ngga
    const fwd   = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3( Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const wantSprint = K[bk.sprint] || K['ShiftRight'];

    let moving = false;
    const move = new THREE.Vector3();
    if (K[bk.forward])  { move.add(fwd);   moving = true; }
    if (K[bk.backward]) { move.sub(fwd);   moving = true; }
    if (K[bk.left])     { move.sub(right); moving = true; }
    if (K[bk.right])    { move.add(right); moving = true; }

    // ── Sprint-stamina + blok: uzoq yugursa shift bloklanadi ──
    if (this._sprintTime === undefined)   this._sprintTime = 0;
    if (this._sprintBlockT === undefined) this._sprintBlockT = 0;
    let isSprint;
    if (ps.sprintLimitEnabled === false) {
      isSprint = wantSprint && moving;          // cheklovsiz
    } else {
      const sprintDur   = ps.sprintDuration  ?? 5;   // uzluksiz yugurish (s)
      const sprintBlock = ps.sprintBlockTime ?? 3;   // blok (s)
      if (this._sprintBlockT > 0) {
        this._sprintBlockT -= delta;
        if (this._sprintBlockT <= 0) { this._sprintBlockT = 0; this._sprintTime = 0; }
        isSprint = false;                       // bloklanган — yugurolmaydi
      } else if (wantSprint && moving) {
        this._sprintTime += delta;
        if (this._sprintTime >= sprintDur) {
          this._sprintBlockT = sprintBlock;     // charchadi → blok!
          isSprint = false;
          if (window.log) log('😮‍💨 Charchadingiz — ' + Math.round(sprintBlock) + 's dam oling', 'lw');
        } else {
          isSprint = true;
        }
      } else {
        this._sprintTime = Math.max(0, this._sprintTime - delta * 1.5);  // dam olganда tiklanadi
        isSprint = false;
      }
    }
    const sprint = isSprint ? ps.sprintMult : 1.0;

    const targetSpeed = ps.speed * sprint;

    if (moving) {
      move.normalize();

      // ── Tezlashish rejimi ──────────────────────────────────
      let speedMult = 1;
      if (ps.accelMode === 'instant') {
        speedMult = 1;
        ps._accelT = ps.accelTime; // tayyor
        ps._waveT  = ps.waveDelay;
      } else if (ps.accelMode === 'easein') {
        // Sekin boshlanib tezlashadi
        ps._accelT = Math.min(ps._accelT + delta, ps.accelTime);
        const t = ps.accelTime > 0 ? ps._accelT / ps.accelTime : 1;
        speedMult = t * t; // kvadratik ease-in
      } else if (ps.accelMode === 'easeout') {
        // Tez boshlanib sekinlashadi
        ps._accelT = Math.min(ps._accelT + delta, ps.accelTime);
        const t = ps.accelTime > 0 ? ps._accelT / ps.accelTime : 1;
        speedMult = 1 - (1 - t) * (1 - t); // ease-out
      } else if (ps.accelMode === 'wave') {
        // Kutish, so'ng to'liq tezlik
        ps._waveT = Math.min(ps._waveT + delta, ps.waveDelay);
        const waited = ps.waveDelay > 0 ? ps._waveT / ps.waveDelay : 1;
        ps._accelT = Math.min(ps._accelT + delta, ps.accelTime);
        const t = ps.accelTime > 0 ? ps._accelT / ps.accelTime : 1;
        speedMult = waited * (t * t);
      }

      move.multiplyScalar(targetSpeed * speedMult);
      this.vel.x = move.x;
      this.vel.z = move.z;
      ps._wasMoving = true;
    } else {
      // To'xtaganda timerlarni reset
      if (ps._wasMoving) {
        ps._accelT  = 0;
        ps._waveT   = 0;
        ps._wasMoving = false;
      }
      // ⚠ SO'NISH KADRGA EMAS, VAQTGA bog'lansin.
      //   Eski kod: `vel.x *= 0.82` — HAR KADRDA. Bu 60 fps uchun
      //   sozlangan edi. O'yin 25-30 fps da ketsa (eksport qilingan
      //   build og'irroq: to'liq dvigatel + soya + fizika), so'nish
      //   ikki barobar kam qo'llanadi va oyinchi tugmani qo'yvorgach
      //   ancha vaqt SIRG'ALIB boradi — "g'irilab yurish" aynan shu.
      //   `0.82^(delta*60)` — 60 fps da aynan eski qiymat, boshqa
      //   kadr tezligida esa BIR XIL natija.
      const damp = Math.pow(0.82, delta * 60);
      this.vel.x *= damp;
      this.vel.z *= damp;
      // Juda kichik qoldiq — nolga. Aks holda oyinchi sezilmas tezlik
      // bilan cheksiz siljib turadi.
      if (Math.abs(this.vel.x) < 0.01) this.vel.x = 0;
      if (Math.abs(this.vel.z) < 0.01) this.vel.z = 0;
    }

    this.vel.y += GRAV * delta;

    // ── Stamina tiklanishi ──
    if (ps.staminaEnabled !== false) {
      if (this.stamina === undefined) this.stamina = ps.staminaMax ?? 100;
      if (this.onGround && this.stamina < (ps.staminaMax ?? 100)) {
        this.stamina = Math.min(ps.staminaMax ?? 100, this.stamina + (ps.staminaRegen ?? 20) * delta);
      }
    }

    // ── Land-lock: yerga tushgach ozgina qotadi (Bhob/bounce yo'q) ──
    if (this._landLockT === undefined) this._landLockT = 0;
    if (this._landLockT > 0) this._landLockT -= delta;

    const jumpNow  = fpsKeys[bk.jump];
    const jumpCost = (ps.staminaEnabled !== false) ? (ps.staminaJumpCost ?? 25) : 0;
    const hasStam  = (ps.staminaEnabled === false) || (this.stamina >= jumpCost);
    if (jumpNow && !this._jumpHeld && this.onGround && this._landLockT <= 0 && hasStam) {
      this.vel.y = JUMP;
      this.onGround = false;
      this._jumpCooldown = 0.15;
      if (ps.staminaEnabled !== false) this.stamina -= jumpCost;
      if (ps.jumpCamBob !== false) this._camBob = 1;   // kamera bob boshlanadi
    }
    this._jumpHeld = jumpNow;
    if (this._jumpCooldown > 0) this._jumpCooldown -= delta;

    // Kamera bob so'nishi (sakraganда oldi-orqa tebranish)
    if (this._camBob === undefined) this._camBob = 0;
    if (this._camBob > 0) this._camBob = Math.max(0, this._camBob - delta * 2.2);

    // V — kamera toggle
    if (K[bk.camToggle] && !this._vPressed) { this._vPressed = true; this.toggleCam(); }
    if (!K[bk.camToggle]) this._vPressed = false;

    // 🪜 Narvonда pozitsiyani LadderSystem allaqachon o'rnatgan —
    //    gravitatsiya/harakat/to'qnashuvni o'tkazib yuboramiz, faqat
    //    pastdagi kamera yangilanadi.
    if (_onLadder) {
      this._updateCameraOnly(delta);
      return;
    }

    o.position.x += this.vel.x * delta;
    o.position.z += this.vel.z * delta;
    o.position.y += this.vel.y * delta;

    // ── ZER (cheksiz zamin) ──────────────────────────────────
    // ⚠ TUZATILDI — SAKRAMASLIK XATOSI:
    // Eski kod bu yerda `else { this.onGround = false; }` qilardi. Oyinchi
    // OBYEKT ustida turganda (y > minY) bu har frame ishlab, onGround ni
    // o'chirardi. Keyin pastdagi to'qnashuv sikli uni "yangi qo'ndi" deb
    // hisoblab, `_landLockT = 1.0` ni HAR KADR qayta o'rnatardi. Sakrash esa
    // `_landLockT <= 0` ni talab qiladi → obyekt ustida SAKRAB BO'LMASDI.
    // Endi: zamin va obyektlar bitta `_grounded` bayrog'iga yig'iladi,
    // onGround esa faqat siklardan KEYIN bir marta hal qilinadi.
    const _wasOnGround = this.onGround;
    const _jumpLocked  = !!(this._jumpCooldown && this._jumpCooldown > 0);
    let   _grounded    = false;

    //  ⚠ `o.scale.y * 0.5` EMAS: u geometriya birlik kub deb faraz
    //    qiladi va standart o'yinchi (2 birlik silindr) yarmi yer
    //    ostida qolardi.
    const _pH = _playerHalf(o);
    const minY = _pH.y;
    if (o.position.y <= minY) {
      o.position.y = minY;
      this.vel.y = 0;
      if (!_jumpLocked) _grounded = true;
    }

    // ── OB'EKTLAR BILAN TO'QNASHUV ───────────────────────────
    // MUHIM: obj.position LOKAL koordinatalar (nested obyektlarda). Shuning
    // uchun world matrix'dan real world pozitsiyasi olinadi — nested/prefab/
    // grouped obyektlarda ham to'qnashuv to'g'ri ishlaydi ("arvoh" ta'siri yo'q).
    let _currentGroundObj = null;
    const _objWorldPos   = new THREE.Vector3();
    const _tmpCO         = new THREE.Vector3();   // ◈ pivot siljishi
    const _tmpCQ         = new THREE.Quaternion();
    const _objWorldScale = new THREE.Vector3();
    objects.forEach(obj => {
      if (obj === o) return;
      if (!obj.parent) return;
      if (obj.userData.type === 'Tekislik') return;
      if (obj.userData.isPlayerObj) return;
      if (obj.userData.colliderMode === 'inline') return; // 👻 inline — orqasidan o'tib ketsin
      // ── 📁 PAPKA — HAR DOIM o'tib ketiladi ────────────────────
      //  ⚠ ALOMAT: o'yinchi bo'm-bo'sh joyda ko'rinmas devorga
      //    urilib to'xtardi. Sababi papka `objects[]` da turadi
      //    (ataylab — hitbox/tugma uni topa olishi kerak), lekin
      //    unda GEOMETRIYA YO'Q. Pastdagi hisob esa `colliderSize`
      //    bo'lmasa `worldScale` ga tushadi, ya'ni papka uchun
      //    1×1×1 lik ko'rinmas quti quriladi — odatda koordinata
      //    boshida, chunki `multiGroup()` papkani (0,0,0) da yasaydi.
      //
      //  ⚠ NEGA `colliderMode` YETARLI EMAS: u yangi papkalarga
      //    qo'yiladi, lekin ALLAQACHON saqlangan sahnalarda yo'q.
      //    Tur bo'yicha tekshiruv eski fayllarni ham qamrab oladi.
      //
      //  Papka — idish, jism emas: uning ichidagi obyektlar o'z
      //  kolliderlari bilan alohida tekshiriladi.
      if (window.SceneTypes && SceneTypes.isFolder(obj.userData)) return;
      if (obj.parent && obj.parent.userData && obj.parent.userData._animProxy === obj) return;
      if (obj.userData._animProxy) return;

      // Nested/prefab uchun world pozitsiya VA world scale
      // ⚠ TUZATILDI: ilgari `obj.scale` (LOKAL) ishlatilardi. Papka scale'i
      // 1 dan farq qilsa, kolayder qutisi noto'g'ri o'lchamda bo'lardi.
      obj.updateMatrixWorld(true);
      _objWorldPos.setFromMatrixPosition(obj.matrixWorld);
      obj.getWorldScale(_objWorldScale);

      // ── ◈ PIVOT — to'qnashuv qutisi KO'RINISH bilan birga siljisin ──
      //  ⚠ ALOMAT: pivot markazini surgach obyekt ko'rinishda joyida
      //    qolardi, lekin to'qnashuv qutisi eski markazda turardi —
      //    o'yinchi bo'sh joyda to'xtardi va ko'rinib turgan devordan
      //    o'tib ketardi. "Pivot faqat vizual o'zgaryapti" degan alomat
      //    aynan shu.
      //
      //  ⚠ SABAB: pivot geometriyani `-p` ga suradi va `position` ni
      //    `+p` ga qaytaradi. Ya'ni obyektning MARKAZI endi
      //    `position` da EMAS, `position - p` da. Quyidagi tekshiruv
      //    esa markazni doim `position` deb bilardi.
      //
      //  `colliderOffset` — LOKAL siljish; burilish va o'lchov bilan
      //  birga hisoblanadi, aks holda burilgan obyektda quti noto'g'ri
      //  tomonga ketardi.
      const _co = obj.userData.colliderOffset;
      if (_co && (_co.x || _co.y || _co.z)) {
        _tmpCO.set(_co.x, _co.y, _co.z)
              .multiply(_objWorldScale)
              .applyQuaternion(obj.getWorldQuaternion(_tmpCQ));
        _objWorldPos.add(_tmpCO);
      }

      //  ⚠ HAQIQIY o'lcham: geometriya + masshtab + burilish.
      //    Ilgari faqat masshtab olinardi va cho'zilgan o'yinchi
      //    tor joyga sig'ib ketardi, standart silindr esa yerga
      //    botardi.
      const _ph = _playerHalf(o);
      const pHW = _ph.x;
      const pHH = _ph.y;
      const pHD = _ph.z;

      // ── 🛤 YO'L SHAKLI — segmentli OBB to'qnashuvi ─────────
      // Egri yo'lga bitta AABB berib bo'lmaydi: u butun egrini
      // qamrab oluvchi ulkan quti bo'lardi va o'yinchi havoda
      // yurgandek his qilardi. Shuning uchun shakl har segmenti
      // o'z burchagi bilan alohida tekshiriladi.
      if (obj.userData.isPathShape) {
        if (obj.userData.colliderMode !== 'block') return;   // 👻 inline — o'tib ketadi
        const pathObj = objects.find(x => String(x.userData?.id) === String(obj.userData._pathId));
        const segs = pathObj && pathObj.userData._segs;
        if (!segs || !segs.length) return;

        obj.updateMatrixWorld(true);
        for (let si = 0; si < segs.length; si++) {
          const sg = segs[si];
          // Segment markazi/burchagi yo'l Group ichida — world ga o'tkazamiz
          _segC.copy(sg.c).applyMatrix4(obj.matrixWorld);
          obj.getWorldQuaternion(_segQ);
          _segQ.multiply(sg.q);
          _segQi.copy(_segQ).invert();

          // O'yinchini segmentning LOKAL fazosiga o'tkazamiz
          _segL.copy(o.position).sub(_segC).applyQuaternion(_segQi);

          const ex = sg.h.x + pHW, ey = sg.h.y + pHH, ez = sg.h.z + pHD;
          const ox = ex - Math.abs(_segL.x);
          const oy = ey - Math.abs(_segL.y);
          const oz = ez - Math.abs(_segL.z);
          if (ox <= 0 || oy <= 0 || oz <= 0) continue;        // bu segment bilan kesishmadi

          // Ustiga chiqish: Y eng kichik kirish + yuqoridan tushyapti
          if (oy <= ox && oy <= oz && _segL.y > 0 && this.vel.y <= 0) {
            _segL.y = ey;
            o.position.copy(_segL.applyQuaternion(_segQ).add(_segC));
            this.vel.y = 0;
            if (!_jumpLocked) _grounded = true;
            _currentGroundObj = pathObj || obj;    // platforma carry ham ishlasin
            return;
          }
          // Yon to'qnashuv — eng kichik o'q bo'yicha itariladi
          if (ox <= oy && ox <= oz)      _segL.x += Math.sign(_segL.x || 1) * ox;
          else if (oz <= oy)             _segL.z += Math.sign(_segL.z || 1) * oz;
          else                           { _segL.y -= oy; this.vel.y = Math.min(0, this.vel.y); }
          o.position.copy(_segL.applyQuaternion(_segQ).add(_segC));
          return;
        }
        return;
      }

      // GLB/model obyektlarda `scale` haqiqiy o'lchamni bermaydi (masalan scale=62).
      // Shuning uchun spawn paytida hisoblangan `colliderSize` (lokal bbox) bo'lsa,
      // uni scale bilan ko'paytirib real o'lcham olamiz. Aks holda scale ishlatiladi.
      const _cs = obj.userData.colliderSize;
      const oHW = (_cs ? _cs.x * _objWorldScale.x : _objWorldScale.x) * 0.5;
      const oHH = (_cs ? _cs.y * _objWorldScale.y : _objWorldScale.y) * 0.5;
      const oHD = (_cs ? _cs.z * _objWorldScale.z : _objWorldScale.z) * 0.5;

      const dx = o.position.x - _objWorldPos.x;
      const dy = o.position.y - _objWorldPos.y;
      const dz = o.position.z - _objWorldPos.z;

      // ============================================================
      //  🔄 BURILGAN OBYEKT — OBB (yo'naltirilgan quti) to'qnashuvi
      // ------------------------------------------------------------
      //  ⚠ ALOMAT: obyektning o'lchamini kichraytirib (masalan taxta
      //    qilib) so'ng uni bursangiz — KO'RINISH buriladi, lekin
      //    to'qnashuv burilmaydi. Oyinchi bo'sh joyda to'xtaydi va
      //    ko'rinib turgan taxtadan o'tib ketadi: "fizikasi bir joyda,
      //    ko'rinishi boshqa joyda".
      //
      //  ⚠ SABAB: pastdagi tekshiruv OBYEKT BURCHAGINI umuman
      //    hisobga olmaydi. U `_objWorldScale` yarim o'lchamlari bilan
      //    DUNYO O'QLARIGA parallel quti quradi. Kub uchun bu deyarli
      //    sezilmaydi (kub burilsa ham o'xshash joy egallaydi), ammo
      //    cho'zilgan shakl 90° burilganda quti va ko'rinish butunlay
      //    boshqa yo'nalishda bo'lib qoladi.
      //
      //  YECHIM: obyekt burilgan bo'lsa — o'yinchini obyektning LOKAL
      //    fazosiga o'tkazamiz, o'sha yerda oddiy quti tekshiruvini
      //    bajaramiz va natijani dunyoga qaytaramiz. Aynan shu usul
      //    yuqorida yo'l shakllari (`isPathShape`) uchun ishlatilgan —
      //    endi u BARCHA obyektlarga tarqatildi.
      //
      //  ⚠ Burilmagan obyektlar eski tez yo'ldan ketaveradi: sahnadagi
      //    obyektlarning aksariyati burilmagan, ularга kvaternion
      //    hisobini yuklash ortiqcha.
      // ============================================================
      obj.getWorldQuaternion(_obbQ);
      if (Math.abs(_obbQ.x) > 1e-4 || Math.abs(_obbQ.y) > 1e-4 || Math.abs(_obbQ.z) > 1e-4) {
        _obbQi.copy(_obbQ).invert();
        _obbL.set(dx, dy, dz).applyQuaternion(_obbQi);   // o'yinchi → lokal
        _obbM.makeRotationFromQuaternion(_obbQ);
        const em = _obbM.elements;

        // ⚠ O'yinchining qutisi DUNYO o'qlariga parallel (u burilmaydi).
        //   Obyektning lokal fazosida u qiyshaygan bo'lib ko'rinadi,
        //   shuning uchun har bir lokal o'q bo'yicha uning haqiqiy
        //   qamrovini hisoblaymiz: a|u.x| + b|u.y| + c|u.z|.
        //   Buni qilmasak, X yoki Z bo'yicha burilgan obyektда
        //   o'yinchining bo'yi va eni o'rin almashib qolardi.
        //   (Faqat Y bo'yicha burilishda natija aynan pHH/pHW ga teng.)
        const pEX = pHW * Math.abs(em[0]) + pHH * Math.abs(em[1]) + pHD * Math.abs(em[2]);
        const pEY = pHW * Math.abs(em[4]) + pHH * Math.abs(em[5]) + pHD * Math.abs(em[6]);
        const pEZ = pHW * Math.abs(em[8]) + pHH * Math.abs(em[9]) + pHD * Math.abs(em[10]);

        const ex = oHW + pEX, ey = oHH + pEY, ez = oHD + pEZ;
        const ovx = ex - Math.abs(_obbL.x);
        const ovy = ey - Math.abs(_obbL.y);
        const ovz = ez - Math.abs(_obbL.z);
        if (ovx <= 0 || ovy <= 0 || ovz <= 0) return;    // kesishmadi

        const yIsMin = (ovy <= ovx && ovy <= ovz);

        // Ustiga chiqish — eng kichik kirish Y bo'yicha va tushayotgan bo'lsa
        if (yIsMin && _obbL.y > 0 && this.vel.y <= 0) {
          _obbL.y = ey;
          o.position.copy(_obbL.applyQuaternion(_obbQ).add(_objWorldPos));
          this.vel.y = 0;
          if (!_jumpLocked) _grounded = true;
          _currentGroundObj = obj;
          return;
        }
        // Pastdan urilish
        if (yIsMin && _obbL.y < 0 && this.vel.y > 0) {
          _obbL.y = -ey;
          o.position.copy(_obbL.applyQuaternion(_obbQ).add(_objWorldPos));
          this.vel.y = 0;
          return;
        }

        // 🪜 Qadam balandligi — burilgan quti uchun dunyo Y bo'yicha
        //    haqiqiy tepani hisoblaymiz (lokal o'qlarning Y proyeksiyasi).
        const _stepCmR = (ps.stepHeightCm ?? 0);
        if (_stepCmR > 0 && this.vel.y <= 0.01) {
          const hY = Math.abs(em[1]) * oHW + Math.abs(em[5]) * oHH + Math.abs(em[9]) * oHD;
          const objTopR = _objWorldPos.y + hY;
          const stepUpR = objTopR - (o.position.y - pHH);
          if (stepUpR > 0.001 && stepUpR <= _stepCmR / 100) {
            o.position.y = objTopR + pHH;
            this.vel.y = 0;
            if (!_jumpLocked) _grounded = true;
            _currentGroundObj = obj;
            return;
          }
        }

        // Yon to'qnashuv — eng kichik lokal o'q bo'yicha itariladi
        if (ovx <= ovz) { const s = Math.sign(_obbL.x || 1); _obbL.x += s * ovx; _obbN.set(s, 0, 0); }
        else            { const s = Math.sign(_obbL.z || 1); _obbL.z += s * ovz; _obbN.set(0, 0, s); }
        o.position.copy(_obbL.applyQuaternion(_obbQ).add(_objWorldPos));

        // Tezlikning devorga TIK qismini olib tashlaymiz — oyinchi
        // burilgan devor bo'ylab sirg'aladi, unga yopishib qolmaydi.
        _obbN.applyQuaternion(_obbQ);
        const vn = this.vel.x * _obbN.x + this.vel.z * _obbN.z;
        if (vn < 0) { this.vel.x -= _obbN.x * vn; this.vel.z -= _obbN.z * vn; }
        return;
      }

      const overlapX = (pHW + oHW) - Math.abs(dx);
      const overlapY = (pHH + oHH) - Math.abs(dy);
      const overlapZ = (pHD + oHD) - Math.abs(dz);

      if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return;

      // Ustiga chiqish
      if (dy > 0 && this.vel.y <= 0 && overlapY < pHH * 0.6) {
        o.position.y = _objWorldPos.y + oHH + pHH;
        this.vel.y = 0;
        // ⚠ TUZATILDI: bu yerda onGround/_landLockT ga TEGMAYMIZ —
        // faqat bayroq qo'yamiz, qaror sikldan keyin bir marta chiqadi.
        if (!_jumpLocked) _grounded = true;

        // 🛗 Platforma + oyinchi rejimlari birgalikda hal qilinadi
        _currentGroundObj = obj;
        return;
      }

      // Pastdan urilish
      if (dy < 0 && this.vel.y > 0 && overlapY < pHH * 0.6) {
        o.position.y = _objWorldPos.y - oHH - pHH;
        this.vel.y = 0;
        return;
      }

      // ── 🪜 QADAM BALANDLIGI — past to'siqqa YOPISHMASDAN chiqish ──
      //  Yon to'qnashuvdan OLDIN: obyektning tepasi o'yinchi oyog'idan
      //  atigi `stepHeightCm` balanddami? Bo'lsa — o'yinchini uning
      //  ustiga QO'YAMIZ va yon itarishни o'tkazib yuboramiz. Natijada
      //  o'yinchi past chekka/qadam/toshga kelib devordek to'xtamay,
      //  birdan ustiga chiqadi (qiyalik shart emas).
      //
      //  ⚠ Faqat YERDA yoki pastga tushayotganda — havoda sakrash
      //    o'rtasida step-up bermaymiz (aks holda devorga tekkanda
      //    yopishib "o'rmalab" chiqardi).
      const _stepCm = (ps.stepHeightCm ?? 0);
      if (_stepCm > 0 && this.vel.y <= 0.01) {
        const objTop  = _objWorldPos.y + oHH;        // to'siq tepasi (world)
        const footY   = o.position.y - pHH;          // o'yinchi oyog'i
        const stepUp  = objTop - footY;              // qancha ko'tarilish kerak
        const stepMax = _stepCm / 100;               // cm → metr
        if (stepUp > 0.001 && stepUp <= stepMax) {
          o.position.y = objTop + pHH;               // ustiga qo'yamiz
          this.vel.y = 0;
          if (!_jumpLocked) _grounded = true;
          _currentGroundObj = obj;
          return;                                    // yon itarish YO'Q
        }
      }

      // Yon to'qnashuv
      if (overlapX < overlapZ) {
        o.position.x += dx > 0 ? overlapX : -overlapX;
        this.vel.x = 0;
      } else {
        o.position.z += dz > 0 ? overlapZ : -overlapZ;
        this.vel.z = 0;
      }
    });

    // ── ⚠ YANGI: ZAMIN HOLATINI BIR MARTA HAL QILISH ─────────
    // _landLockT faqat HAQIQIY qo'nishda (havodan → yerga) o'rnatiladi,
    // har kadr emas. Shu sabab endi obyekt/platforma ustida sakrash ishlaydi.
    if (_grounded) {
      if (!_wasOnGround) {
        this._landLockT = ps.jumpCooldown ?? 1.0;
        if (ps.jumpCamBob !== false) this._camBob = Math.max(this._camBob || 0, 0.5);
      }
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // ── PLATFORM TRACKING: keyingi frame uchun holatni yangilash
    this._updatePlatformTracking(_currentGroundObj);

    // Ob'ekt kamera bilan birga buriladi
    // ⚠ ALOMAT: Alt bosilardi, xabar chiqardi, lekin HECH NIMA
    //   o'zgarmasdi — modelni yon tomondan ko'rib bo'lmasdi.
    //
    // ⚠ SABAB: bu satr SHARTSIZ edi. `playerSettings.bodyRotate`
    //   hech qayerda o'qilmasdi; pastdagi "bodyRotate o'chirilgan —
    //   ob'ekt burilmaydi" izohi bor edi, sharti esa yo'q.
    //
    // ⚠ Faqat 1-SHAXSDA: sozlama ta'rifi ham shunday ("1-shaxsda
    //   ob'ekt kamera bilan birga burilsin"). 3-shaxsda burilishni
    //   to'xtatsak qahramon yurish yo'nalishiga qaramay qolardi.
    //  ⚠ 👁 ERKIN KAMERA — personaj burilmaydi. Shart shu yerda,
    //    chunki qolgan hamma narsa (yurish, fizika) o'z holicha
    //    ishlayveradi: FAQAT burilish to'siladi.
    if (!this._freeLook && (this.camMode !== 'fps' || ps.bodyRotate !== false)) {
      o.rotation.y = this.camYaw;
    }

    // VS ga reference
    window._playerControllerRef = this;
    window._apexPlayerRef = { group: o, vel: this.vel, onGround: this.onGround,
      camMode: this.camMode, _vsAnim: this._vsAnim,
      glbMixer: o.userData._mixer || null,
      glbClips: o.userData._glbClips || {} };

    // ── KAMERA ──────────────────────────────────────────────
    const pos = o.position;
    // ps already declared above
    // Pitch chegarasi playerSettings dan
    const _pMin1 = (ps.cam1stPitchMin ?? -80) * Math.PI / 180;
    const _pMax1 = (ps.cam1stPitchMax ??  80) * Math.PI / 180;
    const _pMin3 = (ps.cam3rdPitchMin ?? -40) * Math.PI / 180;
    const _pMax3 = (ps.cam3rdPitchMax ??  60) * Math.PI / 180;
    if (this.camMode === 'fps') {
      this.camPitch = Math.max(_pMin1, Math.min(_pMax1, this.camPitch));
      const eyeH    = o.scale.y * 0.5 + 0.1 + (ps.cam1stOffsetY || 0);
      // Oyinchi yo'nalishiga ko'ra yon/oldi offset
      const cosY = Math.cos(this.camYaw), sinY = Math.sin(this.camYaw);
      const ox   = (ps.cam1stOffsetX || 0);
      const oz   = (ps.cam1stOffsetZ || 0);
      camera.position.set(
        pos.x + ox * cosY - oz * sinY,
        pos.y + eyeH,
        pos.z + ox * sinY + oz * cosY
      );
      camera.rotation.order = 'YXZ';
      camera.rotation.set(this.camPitch, this.camYaw, 0);
      // Sakrash bob — kamera ozgina oldinga surilib qaytadi
      if (this._camBob > 0) {
        const bobF = this._camBob * 0.13;
        camera.position.x -= Math.sin(this.camYaw) * bobF;
        camera.position.z -= Math.cos(this.camYaw) * bobF;
        camera.position.y -= this._camBob * 0.04;
      }
      // bodyRotate o'chirilgan — ob'ekt burilmaydi
    } else {
      this.camPitch = Math.max(_pMin3, Math.min(_pMax3, this.camPitch));
      const D  = ps.cam3rdDist   || 5;
      const H  = (ps.cam3rdHeight || 2) + o.scale.y * 0.3;
      const ox = ps.cam3rdOffsetX || 0;
      const cp = Math.cos(this.camPitch);
      // Kamera ob'ekt ORQASIDA: fwd=-sin/-cos, shuning uchun orqa=+sin/+cos
      const cx = pos.x + Math.sin(this.camYaw) * D * cp + ox;
      const cy = pos.y + H - Math.sin(this.camPitch) * D;
      const cz = pos.z + Math.cos(this.camYaw) * D * cp;
      this._followCam(cx, cy, cz, delta);
      camera.lookAt(pos.x + ox * 0.5, pos.y + o.scale.y * 0.3, pos.z);
    }
  },

  // ============================================================
  //  👥 3-SHAXS KAMERASINI ERGASHTIRISH
  // ------------------------------------------------------------
  //  ⚠ ALOMAT: 3-shaxsda oyinchi "g'adir-budur" — toshli yo'lda
  //    ketayotgandek titrab yuradi. 1-shaxsda esa silliq.
  //
  //  ⚠ SABAB: eski kod `camera.position.lerp(target, 0.14)` — ya'ni
  //    HAR KADRDA 14%. Bu KADRGA bog'liq, VAQTGA emas. Kamera
  //    maqsaddan ortda qolish masofasi ≈ v·dt/0.14 ga teng, ya'ni
  //    KADR DAVOMIYLIGIGA PROPORSIONAL. Kadr vaqti tabiiy ravishda
  //    har kadrda biroz o'zgaradi (16.2ms, 17.9ms, 15.8ms…), demak
  //    ortda qolish ham o'zgaradi — va oyinchi ekranda oldinga-orqaga
  //    silkinib turadi. Aynan shu "g'adir-budurlik".
  //
  //    1-shaxsda ko'rinmasligi mantiqiy: u yerда kamera aynan
  //    oyinchi pozitsiyasiga QO'YILADI (lerp yo'q), ya'ni ular
  //    orasida nisbiy harakat umuman yo'q.
  //
  //  ⚠ NEGA eksport qilingan o'yinda kuchliroq: u og'irroq ishlaydi
  //    (to'liq dvigatel + fizika + soya), kadr vaqti kattaroq va
  //    KO'PROQ o'zgaradi → titrash amplitudasi ham katta.
  //
  //  YECHIM: bir xil kuchni VAQT bo'yicha qo'llash —
  //    a = 1 − (1−k)^(dt·60).  60 fps da aynan eski 0.14, boshqa
  //    kadr tezligida esa BIR XIL natija (ortda qolish doimiy) →
  //    nisbiy harakat yo'qoladi, tasvir silliq bo'ladi.
  //
  //  `playerSettings.cam3rdSmooth`: 0.02 (juda yumshoq) … 1 (qattiq,
  //  silliqlashsiz — kamera oyinchiga mahkam yopishadi).
  // ============================================================
  _followCam(cx, cy, cz, delta) {
    _camTarget.set(cx, cy, cz);
    const raw = playerSettings.cam3rdSmooth;
    const k = (raw == null) ? 0.14 : Math.max(0.01, Math.min(1, raw));
    if (k >= 1) { camera.position.copy(_camTarget); return; }   // qattiq ergashish
    const d = Math.max(0, Math.min(delta || 1 / 60, 0.1));
    camera.position.lerp(_camTarget, 1 - Math.pow(1 - k, d * 60));
    // Mikro-qoldiq — nolga. Aks holda kamera maqsadga hech qachon
    // yetmay, sezilmas darajada titrab turadi.
    if (camera.position.distanceToSquared(_camTarget) < 1e-6) camera.position.copy(_camTarget);
  },

  // 🪜 Faqat kamerani yangilaydi (narvon holatida). update() dagi KAMERA
  //    blokining aynan nusxasi — narvonда o'yinchi harakati o'tkazib
  //    yuborilsa ham kamera o'yinchi bilan birga ko'tarilsin/tushsin.
  _updateCameraOnly(delta) {
    const o = this.obj; if (!o) return;
    const ps = playerSettings;
    const pos = o.position;
    const _pMin1 = (ps.cam1stPitchMin ?? -80) * Math.PI / 180;
    const _pMax1 = (ps.cam1stPitchMax ??  80) * Math.PI / 180;
    const _pMin3 = (ps.cam3rdPitchMin ?? -40) * Math.PI / 180;
    const _pMax3 = (ps.cam3rdPitchMax ??  60) * Math.PI / 180;
    if (this.camMode === 'fps') {
      this.camPitch = Math.max(_pMin1, Math.min(_pMax1, this.camPitch));
      const eyeH = o.scale.y * 0.5 + 0.1 + (ps.cam1stOffsetY || 0);
      const cosY = Math.cos(this.camYaw), sinY = Math.sin(this.camYaw);
      const ox = (ps.cam1stOffsetX || 0), oz = (ps.cam1stOffsetZ || 0);
      camera.position.set(
        pos.x + ox * cosY - oz * sinY,
        pos.y + eyeH,
        pos.z + ox * sinY + oz * cosY
      );
      camera.rotation.order = 'YXZ';
      camera.rotation.set(this.camPitch, this.camYaw, 0);
    } else {
      this.camPitch = Math.max(_pMin3, Math.min(_pMax3, this.camPitch));
      const D  = ps.cam3rdDist   || 5;
      const H  = (ps.cam3rdHeight || 2) + o.scale.y * 0.3;
      const ox = ps.cam3rdOffsetX || 0;
      const cp = Math.cos(this.camPitch);
      const cx = pos.x + Math.sin(this.camYaw) * D * cp + ox;
      const cy = pos.y + H - Math.sin(this.camPitch) * D;
      const cz = pos.z + Math.cos(this.camYaw) * D * cp;
      this._followCam(cx, cy, cz, delta);
      camera.lookAt(pos.x + ox * 0.5, pos.y + o.scale.y * 0.3, pos.z);
    }
  }
};
window.PlayerController = PlayerController;

// ============================================================
//  ⌨ BOSILIB QOLGAN KLAVISHLARNI TOZALASH
// ------------------------------------------------------------
//  ⚠ ALOMAT: "oyinchi g'irilab yuradi" — tugma qo'yvorilgan bo'lsa ham
//    to'xtovsiz siljib ketaveradi.
//
//  ⚠ SABAB: klavish holati `keydown` → true, `keyup` → false bo'yicha
//    yuritiladi. Agar `keyup` YETIB KELMASA, kalit mangu `true` bo'lib
//    qoladi. Bu quyidagi hollarda bo'ladi va HECH BIRI kamdan-kam emas:
//      • Alt+Tab / boshqa oynaga o'tish (brauzer keyup ni bermaydi)
//      • Esc bosilib pointer lock uzilishi
//      • fokus input/iframe ga ko'chishi (PC blok, o'yin konsoli)
//      • yorliqni almashtirish (tab visibility)
//
//  ⚠ NEGA shu yerda: `PlayerController.keys` va `fpsKeys` — ikkita
//    ALOHIDA holat (birinchisi PC obyekti uchun, ikkinchisi FPS kamera
//    uchun, `camera-modes.js` da). Ikkalasini bitta joyda tozalaymiz,
//    aks holda tuzatish yarmini qamrab, xato "ba'zan" qaytardi.
// ============================================================
function _apexFlushKeys() {
  // ⚠ Alternativ klavishlar ro'yxatini ham tozalaymiz — aks holda
  //   oyna almashganda "bosilgan" deb qolib ketardi va o'yinchi
  //   o'z-o'zidan yuraverardi.
  try { if (window._physKeys) window._physKeys.clear(); } catch (e) {}
  try {
    if (PlayerController.keys) {
      for (const k in PlayerController.keys) PlayerController.keys[k] = false;
    }
    if (PlayerController.vel) { PlayerController.vel.x = 0; PlayerController.vel.z = 0; }
  } catch (e) {}
  try {
    if (typeof fpsKeys !== 'undefined' && fpsKeys) {
      for (const k in fpsKeys) fpsKeys[k] = false;
    }
  } catch (e) {}
}
window._apexFlushKeys = _apexFlushKeys;

window.addEventListener('blur', _apexFlushKeys);
document.addEventListener('visibilitychange', () => { if (document.hidden) _apexFlushKeys(); });
// Pointer lock uzilishi (Esc) — sichqoncha bo'shadi, klavish holati esa
// osilib qolishi mumkin.
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) _apexFlushKeys();
});

let _wasOnGround  = true;
let _prevFallVel  = 0;

function updatePlayer(delta) {
  if (!isPlaying || !playerMesh || camMode !== 'fps') return;
  if (carInside) return; // Mashina ichida — player update o'chiriladi
  const gravity = -20 * delta;
  playerVel.y += gravity;

  // Movement
  const fwd   = new THREE.Vector3(-Math.sin(fpsYaw), 0, -Math.cos(fpsYaw));
  const right  = new THREE.Vector3( Math.cos(fpsYaw), 0, -Math.sin(fpsYaw));
  const isRun  = fpsKeys['ShiftLeft'] || fpsKeys['ShiftRight'];
  const spd    = PLAYER_SPEED * (isRun ? 1.7 : 1) * delta;
  const isMove = fpsKeys['KeyW']||fpsKeys['ArrowUp']||fpsKeys['KeyS']||fpsKeys['ArrowDown']||
                 fpsKeys['KeyA']||fpsKeys['ArrowLeft']||fpsKeys['KeyD']||fpsKeys['ArrowRight'];

  if (fpsKeys['KeyW']||fpsKeys['ArrowUp'])    playerVel.x+=fwd.x*spd*8,   playerVel.z+=fwd.z*spd*8;
  if (fpsKeys['KeyS']||fpsKeys['ArrowDown'])  playerVel.x-=fwd.x*spd*8,   playerVel.z-=fwd.z*spd*8;
  if (fpsKeys['KeyA']||fpsKeys['ArrowLeft'])  playerVel.x-=right.x*spd*8, playerVel.z-=right.z*spd*8;
  if (fpsKeys['KeyD']||fpsKeys['ArrowRight']) playerVel.x+=right.x*spd*8, playerVel.z+=right.z*spd*8;

  // ── SAKRASH ──────────────────────────────────────────────────
  if (fpsKeys['Space'] && playerOnGround) {
    playerVel.y = (typeof playerSettings !== 'undefined' ? (playerSettings.jumpForce ?? PLAYER_JUMP) : PLAYER_JUMP);
    playerOnGround = false;
    SoundSystem.play('jump', null, { volume: 0.65 });
  }

  // ── QADAM / YUGURISH OVOZI ───────────────────────────────────
  if (playerOnGround && isMove) {
    const stepInterval = isRun ? 0.27 : 0.46;
    _stepTimer += delta;
    if (_stepTimer >= stepInterval) {
      _stepTimer = 0;
      SoundSystem.play('step', null, { volume: isRun ? 0.5 : 0.32 });
    }
  } else if (!isMove) {
    _stepTimer = _stepTimer > 0.15 ? 0 : _stepTimer;
  }

  // Damping
  // ⚠ Yuqoridagi `PlayerController` bilan BIR XIL tuzatish: so'nish
  //   kadrga emas, VAQTGA bog'lansin. Aks holda past kadr tezligida
  //   o'yinchi tugmani qo'yvorgach uzoq sirg'alib boradi.
  const _dampL = Math.pow(0.82, delta * 60);
  playerVel.x *= _dampL;
  playerVel.z *= _dampL;
  if (Math.abs(playerVel.x) < 0.01) playerVel.x = 0;
  if (Math.abs(playerVel.z) < 0.01) playerVel.z = 0;

  _prevFallVel = playerVel.y;

  // Move
  playerMesh.position.addScaledVector(playerVel, delta);

  // Ground collision
  const wasOnGround = playerOnGround;
  playerOnGround = false;
  if (playerMesh.position.y <= PLAYER_HEIGHT) {
    playerMesh.position.y = PLAYER_HEIGHT;

    // ── YERGA TUSHISH OVOZI ──────────────────────────────────
    if (!wasOnGround && _prevFallVel < -3) {
      const fallIntensity = Math.min(1, Math.abs(_prevFallVel) / 15);
      SoundSystem.play('land', null, { volume: 0.35 + fallIntensity * 0.55 });
    }

    playerVel.y = 0;
    playerOnGround = true;
    _stepTimer = _stepTimer > 0 ? _stepTimer : 0;
  }

  // Collision with physics objects — mass-based push
  objects.forEach(obj => {
    if (!obj.parent || obj === playerMesh) return;
    const pb = physBodies.find(b => b.mesh === obj);
    if (!pb || pb.isStatic) return;
    const dist = playerMesh.position.distanceTo(obj.position);
    const objR = (obj.scale.x + obj.scale.y + obj.scale.z) / 3 * 0.7;
    if (dist < PLAYER_RADIUS + objR && dist > 0.01) {
      const pushDir = obj.position.clone().sub(playerMesh.position).normalize();
      const overlap = PLAYER_RADIUS + objR - dist;

      // Massani hajmga qarab hisoblash — katta object = og'ir = qiyin siljiydi
      const volume = obj.scale.x * obj.scale.y * obj.scale.z;
      const mass = Math.max(0.5, volume * 2.5); // 0.5 dan kam bo'lmasin
      const pushForce = overlap * 10 / mass;

      pb.vel.addScaledVector(pushDir, pushForce * delta * 5);
      pb.vel.y += (0.8 / mass) * delta;
      pb.angVel.set(
        (Math.random()-.5) * (2 / mass),
        (Math.random()-.5) * (2 / mass),
        (Math.random()-.5) * (2 / mass)
      );
      // Oyinchi ham bir oz orqaga suradi (qaytma kuch)
      playerVel.addScaledVector(pushDir, -overlap * Math.min(1, 1/mass) * 3);
      playImpactSound(Math.min(1, pushForce / 10));
    }
  });

  // Boundary
  const B=22;
  if(playerMesh.position.x > B) {playerMesh.position.x=B; playerVel.x*=-0.3;}
  if(playerMesh.position.x <-B) {playerMesh.position.x=-B;playerVel.x*=-0.3;}
  if(playerMesh.position.z > B) {playerMesh.position.z=B; playerVel.z*=-0.3;}
  if(playerMesh.position.z <-B) {playerMesh.position.z=-B;playerVel.z*=-0.3;}

  // Camera follows player
  const eyeY = playerMesh.position.y + PLAYER_HEIGHT * 0.4;
  camera.position.set(playerMesh.position.x, eyeY, playerMesh.position.z);
  camera.rotation.order='YXZ';
  camera.rotation.y = fpsYaw;
  camera.rotation.x = fpsPitch;

  // Health death
  if (playerMesh.position.y < -15) {
    if (gameState.checkpoint) { SCRIPT_API.respawn(); log('💀 Tushib ketdi — respawn','lw'); }
    else { playerMesh.position.set(0,PLAYER_HEIGHT+1,5); playerVel.set(0,0,0); }
  }

}
