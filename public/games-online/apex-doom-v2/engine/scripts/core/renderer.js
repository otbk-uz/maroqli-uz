// ============================================================
// RENDERER SETUP — Optimized v2 (antialias qaytarildi)
// Optimizatsiyalar (saqlab qolindi):
//   1. Shadow map: PCFShadowMap (PCFSoft o'rniga — 2x tezroq)
//   2. shadowMap.autoUpdate = false + needsUpdate pattern
//   3. Dynamic resolution: FPS < 30 bo'lsa pixelRatio pasaytiradi
// Qaytarildi:
//   - antialias: true (tiniqlik uchun)
//   - pixelRatio: min(dPR, 2) (asl qiymat)
// ============================================================

const canvas = $('three-canvas');
const cvp    = $('cvp');

let renderer;
let renderBackend = 'WebGL2';

// ── Renderer yaratish ──────────────────────────────────────
renderer = new THREE.WebGLRenderer({
  canvas,
  antialias:              true,           // tiniqlik uchun (asl qiymat)
  preserveDrawingBuffer:  true,           // screenshot uchun kerak
  powerPreference:        'high-performance',
  context: (() => {
    try {
      return canvas.getContext('webgl2', {
        antialias:        true,
        alpha:            true,   // 💻 PC block: shaffof fon → CSS3D ekran
        powerPreference:  'high-performance',
      });
    } catch(e) { return null; }
  })()
});

// ── Pixel ratio — asl qiymat ──────────────────────────────
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ── Shadow — PCF (PCFSoft dan 2x tezroq, saqlab qolindi) ──
renderer.shadowMap.enabled     = true;
renderer.shadowMap.type        = THREE.PCFShadowMap;

// Shadow faqat ob'ekt qo'shilsa/o'chirilsa yangilanadi
renderer.shadowMap.autoUpdate  = false;
renderer.shadowMap.needsUpdate = true;

// ══════════════════════════════════════════════════════════
//  🎥 KAMERA KIMNIKI? — egalik tekshiruvi
// ----------------------------------------------------------
//  Bir necha tizim asosiy kamerani boshqarishi mumkin:
//     • mashina kamerasi (car.js — updateCar)
//     • hitbox / tugma kamera animatsiyasi (cutscene)
//     • faol kamera obyekti (_isActive)
//     • PC block fokusi
//
//  Ular HAR KADR `camera.position` yozadi va bir-birini bosib ketadi.
//  Muammo: o'yinchi mashinada turib hitboxga kirsa, cutscene lerp
//  qiladi, keyin `updateCar` uni darrov mashinaga qaytaradi →
//  kamera mashinaga qarab qoladi va titraydi ("lag").
//
//  Yechim: cutscene kamerani EGALLAB olganда, mashina kamerasi
//  chetga chiqadi.
window.cameraIsOwned = function () {
  if (window._pcFocusLock)  return true;   // 💻 PC block fokusi
  if (window._hbCamBusy)    return true;   // 🎥 hitbox cutscene lerp'i
  if (window._ibtnCamBusy)  return true;   // 🎥 tugma cutscene lerp'i
  if (typeof objects !== 'undefined') {
    for (let i = 0; i < objects.length; i++) {
      const u = objects[i] && objects[i].userData;
      if (u && u.isCamera && u._isActive) return true;   // faol kamera obyekti
    }
  }
  return false;
};

// ── ☀️ SOYA YANGILASH ─────────────────────────────────────
//  ⚠ `shadowMap.autoUpdate = false` + `needsUpdate = true` — Three.js
//    HAR RENDER'dan keyin `needsUpdate` ni o'zi `false` ga qaytaradi.
//    Ya'ni soya faqat 1-kadrда hisoblanib, keyin ABADIY MUZLAB qolardi:
//    obyektni surasiz — soyasi eski joyida turaveradi.
//    Ustiga bu funksiya butun loyihada BIRORTA JOYDA chaqirilmagan edi.
//
//  Yechim: bayroq. `requestShadowUpdate()` bir necha kadrga "iflos"
//  deb belgilaydi (bitta kadr yetmaydi — o'zgarish render'dan keyin
//  qo'llanishi mumkin). Main-loop uni har kadr tekshiradi.
//  Statik editorда soya qayta hisoblanmaydi → optimizatsiya saqlanadi.
let _shadowDirty = 3;
window.requestShadowUpdate = function() { _shadowDirty = 3; };

// Main-loop har kadr chaqiradi. `moving` — sahnada nimadir harakatlanyapti
// (o'yin ketyapti yoki gizmo sudralyapti) degani.
window.applyShadowUpdate = function(moving) {
  if (!renderer) return;
  if (moving) { renderer.shadowMap.needsUpdate = true; return; }
  if (_shadowDirty > 0) { renderer.shadowMap.needsUpdate = true; _shadowDirty--; }
};

// ── Tone mapping ──────────────────────────────────────────
// ⚠ 💻 PC BLOCK — SHAFFOF FON (alpha = 0)
// CSS3D ekran (haqiqiy <iframe> DOM) canvas ORQASIDA turadi. Canvas
// shaffof bo'lgan joyda u ko'rinadi, geometriya chizilgan joyda esa
// yo'q — ya'ni devor/obyekt ekranni PIKSEL DARAJASIDA to'sadi.
// "Osmon" rangi endi #cvp ning CSS foni (index.html) — vizual bir xil.
renderer.setClearColor(0x080b12, 0);

// Screenshot / kamera render uchun — fonni vaqtincha shaffof emas qilish.
window.withOpaqueBackground = function (fn, cam) {
  renderer.setClearAlpha(1);
  try {
    renderer.render(scene, cam || camera);
    return fn();
  } finally {
    renderer.setClearAlpha(0);
  }
};
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ── Version-aware API ─────────────────────────────────────
if ('outputColorSpace' in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.useLegacyLights  = false;
} else {
  renderer.outputEncoding          = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
}

// ── Dynamic resolution (FPS < 30 bo'lsa pixelRatio tushiradi)
let _drEnabled  = true;
let _drTimer    = 0;
let _drCooldown = 3;
let _drMinRatio = 1.0;   // min 1.0 (antialias yoq bo'lgani uchun pastga tushirmaymiz)
let _drCurRatio = Math.min(window.devicePixelRatio, 2);

window._rendererDynamicRes = function(delta, currentFps) {
  if (!_drEnabled) return;
  _drTimer += delta;
  if (_drTimer < _drCooldown) return;

  if (currentFps < 30 && _drCurRatio > _drMinRatio) {
    _drCurRatio = Math.max(_drMinRatio, _drCurRatio - 0.25);
    renderer.setPixelRatio(_drCurRatio);
    _drTimer = 0;
    log(`⚡ Dynamic resolution: pixelRatio → ${_drCurRatio.toFixed(2)} (FPS: ${currentFps})`, 'lw');
  } else if (currentFps > 55 && _drCurRatio < Math.min(window.devicePixelRatio, 2)) {
    _drCurRatio = Math.min(Math.min(window.devicePixelRatio, 2), _drCurRatio + 0.25);
    renderer.setPixelRatio(_drCurRatio);
    _drTimer = 0;
    log(`✅ Dynamic resolution: pixelRatio → ${_drCurRatio.toFixed(2)} (FPS: ${currentFps})`, 'lok');
  }
};

window.toggleDynamicRes = function() {
  _drEnabled = !_drEnabled;
  log(`🖥 Dynamic Resolution: ${_drEnabled ? 'YOQILDI' : 'O\'chirildi'}`, _drEnabled ? 'lok' : 'lw');
};

// ── GPU info va backend detect ────────────────────────────
async function initRendererInfo() {
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        renderBackend = 'WebGPU (via WebGL2)';
        log('⚡ WebGPU aniqlandi — WebGL2 backend (Three.js r128 compat)', 'lok');
      }
    } catch(e) {}
  }

  const gl = canvas.getContext('webgl2');
  if (gl) {
    renderBackend = renderBackend === 'WebGPU (via WebGL2)' ? renderBackend : 'WebGL 2.0';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      log(`🖥 Renderer: ${renderBackend} | GPU: ${gpu}`, 'lok');
    } else {
      log(`🖥 Renderer: ${renderBackend}`, 'lok');
    }
  } else {
    renderBackend = 'WebGL 1.0';
    log('⚠ WebGL2 mavjud emas — WebGL1 ishlatilmoqda', 'lw');
  }

  const fbk = document.getElementById('render-backend-lbl');
  if (fbk) fbk.textContent = renderBackend;

  log(`🖥 Shadow: PCFShadowMap | pixelRatio: ${_drCurRatio.toFixed(2)} | AA: ON`, 'lok');
}

initRendererInfo();