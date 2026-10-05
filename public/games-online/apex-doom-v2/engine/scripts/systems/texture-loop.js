// ============================================================
// APEX3D — Texture Loop (scale-aware tiling)
// ------------------------------------------------------------
// Muammo: obyekt scale bo'yicha cho'zilsa, materialdagi textura ham
// cho'ziladi (bitta nusxa butun yuzga yoyiladi). Bu tekstura sifatini
// buzadi.
//
// Yechim: "Textura Loop" yoqilganda tekstura CHO'ZILMAYDI — u
// RepeatWrapping bilan takrorlanib (tile) cho'zilgan bo'sh joyni
// to'ldiradi va texel zichligini saqlaydi ("maksimal moslik").
//
// Ishlash printsipi (nisbiy usul):
//   Yoqilgan paytdagi scale (baseScale) va repeat (baseRepeat) eslab
//   qolinadi. Keyin har bir o'lchamda:
//       repeat = baseRepeat * (currentScale / baseScale) * density
//   x → U (repeat.x),  y → V (repeat.y).
//   Yoqilgan lahzada rasm aynan avvalgidek ko'rinadi; cho'zilganda esa
//   avtomatik takrorlanadi. `density` — foydalanuvchi sozlaydigan tile
//   zichligi (1× = default).
//
// Barcha PBR map'lar (map/normal/roughness/metalness/ao/emissive) birga
// tile qilinadi. Holat obyekt.userData.textureLoop da saqlanadi, shu bois
// save/load bilan ham qo'llab-quvvatlanadi.
// ============================================================

const TextureLoopSystem = (() => {
  'use strict';

  const MAP_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];

  // Yoqilgan obyektlar registri — har frame'da scale o'zgarishini tekshiramiz
  const _active = new Set();

  // ── Yordamchi: obyektning barcha materiallari (GLB bolalarni ham) ──
  function _materials(obj) {
    const out = [];
    const push = m => { if (m) (Array.isArray(m) ? m : [m]).forEach(x => x && out.push(x)); };
    if (obj.material) push(obj.material);
    // GLB/GLTF — material bolalar mesh'larida bo'lishi mumkin
    if (out.length === 0 && obj.traverse) {
      obj.traverse(ch => { if (ch !== obj && ch.isMesh && ch.material) push(ch.material); });
    }
    return out;
  }

  // Materialdagi mavjud textura map'lari
  function _maps(mat) {
    const out = [];
    MAP_SLOTS.forEach(s => { if (mat[s]) out.push(mat[s]); });
    return out;
  }

  // Birinchi diffuse map (baseRepeat olish uchun)
  function _firstDiffuse(obj) {
    const mats = _materials(obj);
    for (const m of mats) if (m.map) return m.map;
    return null;
  }

  function isEnabled(obj) {
    return !!(obj && obj.userData && obj.userData.textureLoop && obj.userData.textureLoop.enabled);
  }

  // ── Yoqish ──────────────────────────────────────────────────
  function enable(obj, opts) {
    if (!obj) return;
    opts = opts || {};
    const prev = obj.userData.textureLoop || {};
    const diffuse = _firstDiffuse(obj);
    const baseRepeat = opts.baseRepeat || prev.baseRepeat
                     || (diffuse ? { x: diffuse.repeat.x || 1, y: diffuse.repeat.y || 1 }
                                 : { x: 1, y: 1 });
    // Yangi yoqishda baza = joriy scale (hozir 1:1 ko'rinsin).
    // restore() esa saqlangan baseScale ni uzatadi.
    const baseScale = opts.baseScale
                    || { x: obj.scale.x || 1, y: obj.scale.y || 1, z: obj.scale.z || 1 };

    obj.userData.textureLoop = {
      enabled:   true,
      density:   (typeof opts.density === 'number') ? opts.density
               : (typeof prev.density === 'number' ? prev.density : 1),
      baseScale: baseScale,
      baseRepeat: baseRepeat,
    };
    obj.userData._texLoopLastScale = null;   // refresh'ni majburlash

    // Barcha map'larni RepeatWrapping'ga o'tkazamiz (bir martalik)
    _materials(obj).forEach(mat => {
      _maps(mat).forEach(tex => {
        if (tex.wrapS !== THREE.RepeatWrapping || tex.wrapT !== THREE.RepeatWrapping) {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.matrixAutoUpdate = true;
          tex.needsUpdate = true;   // wrap rejimi o'zgargani uchun kerak
        }
      });
    });

    _active.add(obj);
    refresh(obj);
    return obj.userData.textureLoop;
  }

  // ── O'chirish — repeat ni baza qiymatiga qaytaramiz ──────────
  function disable(obj) {
    if (!obj || !obj.userData.textureLoop) { _active.delete(obj); return; }
    const base = obj.userData.textureLoop.baseRepeat || { x: 1, y: 1 };
    _materials(obj).forEach(mat => {
      _maps(mat).forEach(tex => { tex.repeat.set(base.x, base.y); });
    });
    obj.userData.textureLoop.enabled = false;
    delete obj.userData._texLoopLastScale;
    _active.delete(obj);
  }

  function toggle(obj) {
    if (isEnabled(obj)) { disable(obj); return false; }
    enable(obj); return true;
  }

  function setDensity(obj, d) {
    if (!obj || !obj.userData.textureLoop) return;
    obj.userData.textureLoop.density = Math.max(0.01, d || 1);
    refresh(obj);
  }

  // ── Repeat ni scale bo'yicha qayta hisoblash ─────────────────
  // rewrap=true bo'lsa — yangi qo'shilgan tekstura wrap'ini ham tuzatadi
  function refresh(obj) {
    const tl = obj && obj.userData && obj.userData.textureLoop;
    if (!tl || !tl.enabled) return;

    const bs = tl.baseScale || { x: 1, y: 1, z: 1 };
    const br = tl.baseRepeat || { x: 1, y: 1 };
    const dens = (typeof tl.density === 'number') ? tl.density : 1;

    // x → U, y → V. baza scale'ga nisbatan nisbat.
    const rx = br.x * (obj.scale.x / Math.max(1e-4, bs.x)) * dens;
    const ry = br.y * (obj.scale.y / Math.max(1e-4, bs.y)) * dens;

    _materials(obj).forEach(mat => {
      _maps(mat).forEach(tex => {
        // Yangi qo'shilgan tekstura Repeat bo'lmasa — o'zini davolaydi
        if (tex.wrapS !== THREE.RepeatWrapping || tex.wrapT !== THREE.RepeatWrapping) {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.matrixAutoUpdate = true;
          tex.needsUpdate = true;
        }
        tex.repeat.set(rx, ry);   // needsUpdate SHART EMAS — matrixAutoUpdate o'zi qiladi
      });
    });

    obj.userData._texLoopLastScale = { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z };
  }

  // Tanlangan obyekt uchun qulay wrapperlar (inspector chaqiradi)
  function refreshSelected() {
    if (typeof selectedObj !== 'undefined' && selectedObj) refresh(selectedObj);
  }

  // ── Har frame: scale o'zgargan yoqilgan obyektlarni yangilash ──
  function update() {
    if (_active.size === 0) return;
    _active.forEach(obj => {
      // Sahnadan o'chirilgan obyektni registrdan chiqaramiz
      if (!obj.parent && !(typeof objects !== 'undefined' && objects.indexOf(obj) >= 0)) {
        _active.delete(obj); return;
      }
      const last = obj.userData._texLoopLastScale;
      if (!last ||
          Math.abs(last.x - obj.scale.x) > 1e-4 ||
          Math.abs(last.y - obj.scale.y) > 1e-4 ||
          Math.abs(last.z - obj.scale.z) > 1e-4) {
        refresh(obj);
      }
    });
  }

  // ── Save/Load ────────────────────────────────────────────────
  function serialize(obj) {
    const tl = obj && obj.userData && obj.userData.textureLoop;
    if (!tl || !tl.enabled) return null;
    return {
      enabled:   true,
      density:   tl.density || 1,
      baseScale: { ...tl.baseScale },
      baseRepeat: { ...tl.baseRepeat },
    };
  }

  function restore(obj, data) {
    if (!obj || !data || !data.enabled) return;
    // Saqlangan baza qiymatlarini aynan uzatamiz — shunda tile darajasi
    // saqlangandagidek tiklanadi (joriy scale bo'yicha qayta hisoblanadi).
    enable(obj, {
      density:    (typeof data.density === 'number') ? data.density : 1,
      baseScale:  data.baseScale  || { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
      baseRepeat: data.baseRepeat || { x: 1, y: 1 },
    });
  }

  return {
    enable, disable, toggle, setDensity, refresh, refreshSelected,
    isEnabled, update, serialize, restore,
  };
})();


// Global — yuqoridagi bilan bir xil sabab: top-level `const` `window` ga
// tushmaydi. Hozircha chaqiruvchilar yalang'och nom ishlatadi, lekin
// `window.TextureLoopSystem` tekshiruvi jimgina false berib qo'ymasin.
window.TextureLoopSystem = TextureLoopSystem;
// ── Inspector uchun global tugma handlerlar ──────────────────
window._texLoopToggle = function(on) {
  if (typeof selectedObj === 'undefined' || !selectedObj) return;
  if (on) {
    TextureLoopSystem.enable(selectedObj);
    log(`🔁 Textura Loop yoqildi — "${selectedObj.userData.name}"`, 'lok');
  } else {
    TextureLoopSystem.disable(selectedObj);
    log(`🔁 Textura Loop o'chirildi — "${selectedObj.userData.name}"`, 'lw');
  }
  if (typeof updateInspector === 'function') updateInspector();
};

window._texLoopDensity = function(d) {
  if (typeof selectedObj === 'undefined' || !selectedObj) return;
  TextureLoopSystem.setDensity(selectedObj, d);
};
