// ============================================================
// EDIT MODE — F bosilganda ob'ektga "yopishib" klaviatura bilan boshqarish
// ============================================================
const editMode = {
  active: false,
  keys: {},
  light: null,   // 💡 yorug'lik tahrirlanayotgan bo'lsa — o'sha yozuv
};

// HUD elementini yaratish
(function buildEditHUD() {
  const hud = document.createElement('div');
  hud.id = 'edit-mode-hud';
  hud.style.cssText = `
    position:fixed; top:44px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.75); border:1px solid var(--accent);
    color:var(--accent); font-family:'Share Tech Mono',monospace;
    font-size:10px; padding:5px 16px; border-radius:3px;
    pointer-events:none; display:none; z-index:9998;
    letter-spacing:1px; text-align:center; line-height:1.7;
    white-space:nowrap;
  `;
  document.body.appendChild(hud);
})();

function editModeHudText() {
  // 💡 Yorug'likda o'lchov (scale) yo'q — u geometriya emas. Aylantirish
  //    esa faqat ☀️ quyosh va 🔦 fonarda ma'noli: nur YO'NALISHI.
  if (editMode.light) {
    const L = editMode.light;
    const canRot = L.type === 'sun' || L.type === 'headlight';
    return `💡 ${L.name} — WASD:harakat  Q:pastga  E:tepaga` +
           (canRot ? '  ←→↑↓:nur yo\'nalishi' : '') +
           '  Shift:tez  Space:sekin  F/Esc:chiq';
  }
  const m = gizmoMode;
  if (m === 'select') return '⬛ SELECT — 1:Select  2:Move  3:Rotate  4:Scale  F/Esc:chiq';
  if (m === 'move')   return '✛ MOVE — WASD:harakat  Q:pastga  E:tepaga  Shift:tez  Space:sekin  1/2/3/4:rejim  F/Esc:chiq';
  if (m === 'rotate') return '↻ ROTATE — WASD:aylantir  1/2/3/4:rejim  F/Esc:chiq';
  if (m === 'scale')  return '⊞ SCALE — WASD:kattalashtir  1/2/3/4:rejim  F/Esc:chiq';
  return 'EDIT MODE — 1:Select 2:Move 3:Rotate 4:Scale  F/Esc:chiq';
}

function enterEditMode() {
  if (editMode.active) { exitEditMode(); return; }

  // 💡 Obyekt tanlanmagan bo'lsa — YORUG'LIK. `selectLight()` `selectedObj`
  //    ni ataylab `null` qiladi, ya'ni ikkalasi bir vaqtda tanlangan
  //    bo'lolmaydi.
  if (!selectedObj) {
    if (typeof selectedLight !== 'undefined' && selectedLight) return enterLightEditMode();
    return;
  }
  editMode.active = true;
  editMode.light  = null;
  editMode.keys = {};

  // Kamera obyektga yaqinlashadi (nested/attached uchun WORLD pozitsiya)
  selectedObj.updateMatrixWorld(true);
  const _wp = new THREE.Vector3();
  selectedObj.getWorldPosition(_wp);
  orbitTarget.copy(_wp);
  spherical.radius = Math.max(4, spherical.radius * 0.7);
  updateCamera();

  const hud = $('edit-mode-hud');
  if (hud) { hud.textContent = editModeHudText(); hud.style.display = 'block'; }
  log(`✏ Edit mode: <span style="color:var(--accent)">${selectedObj.userData.name}</span> — F yoki Esc: chiqish`, 'lok');
}

/**
 * 💡 Yorug'lik uchun EDIT MODE.
 *
 * ⚠ NEGA KERAK: 58.34 da yordamchi chiziqlar va ☀️ quyosh markeri olib
 *   tashlandi — yorug'likning sahnada ushlab suradigan izi qolmadi.
 *   Uni faqat inspektordagi raqamlar bilan surish mumkin edi, bu esa
 *   "ko'zim bilan qo'yaman" degan ishga to'g'ri kelmasdi.
 *
 * ⚠ Obyektdan farqi (`updateEditMode` da ham shu):
 *     • o'lchov (scale) YO'Q — yorug'likda geometriya yo'q
 *     • aylantirish faqat ☀️ quyosh va 🔦 fonarda — u yerda "aylanish"
 *       degani nur YO'NALISHI (`rotX`/`rotY` → `applyLightRotation`)
 *     • gizmo rejimlari (1/2/3/4) ishlatilmaydi — WASD doim suradi,
 *       o'q tugmalari doim yo'naltiradi. Aks holda o'yinchi "nega
 *       WASD ishlamayapti?" degan holatga tushardi.
 */
function enterLightEditMode() {
  const L = selectedLight;
  if (!L || !L.light) return;
  editMode.active = true;
  editMode.light  = L;
  editMode.keys   = {};

  const wp = new THREE.Vector3();
  try { L.light.getWorldPosition(wp); } catch (e) { wp.copy(L.light.position || new THREE.Vector3()); }
  // ⚠ ☀️ Quyosh YO'NALISH vektori bilan yashaydi va juda uzoqda
  //   bo'lishi mumkin — kamerani o'sha yerga olib borsak sahna
  //   ko'rinmay qolardi.
  if (wp.length() > 120) wp.setLength(120);

  orbitTarget.copy(wp);
  spherical.radius = Math.max(6, Math.min(spherical.radius, 40));
  updateCamera();

  const hud = $('edit-mode-hud');
  if (hud) { hud.textContent = editModeHudText(); hud.style.display = 'block'; }
  log(`✏ Edit mode: <span style="color:var(--accent)">💡 ${L.name}</span> — F yoki Esc: chiqish`, 'lok');
}

// Eski nom bilan chaqirganlar uchun — endi to'liq edit mode ochadi.
window.focusOnLight = function () {
  if (typeof selectedLight === 'undefined' || !selectedLight) return false;
  enterLightEditMode();
  return true;
};
window.enterLightEditMode = enterLightEditMode;

function exitEditMode() {
  editMode.active = false;
  editMode.light  = null;
  editMode.keys = {};
  const hud = $('edit-mode-hud');
  if (hud) hud.style.display = 'none';
  log('✏ Edit mode — chiqildi', 'lw');
}

function editModeKeyDown(e) {
  const k = e.code;
  if (k === 'Escape' || k === 'KeyF') { exitEditMode(); e.preventDefault(); return; }
  if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight','Space',
       'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) {
    editMode.keys[k] = true;
    e.preventDefault();
  }
  // Gizmo mode switch inside edit mode
  // ⚠ Yorug'likda rejim yo'q — WASD doim suradi (yuqoridagi izohga qarang)
  if (editMode.light) return;
  if (k === 'Digit1') { setGizmoMode('select'); const h=$('edit-mode-hud'); if(h) h.textContent=editModeHudText(); }
  if (k === 'Digit2') { setGizmoMode('move');   const h=$('edit-mode-hud'); if(h) h.textContent=editModeHudText(); }
  if (k === 'Digit3') { setGizmoMode('rotate'); const h=$('edit-mode-hud'); if(h) h.textContent=editModeHudText(); }
  if (k === 'Digit4') { setGizmoMode('scale');  const h=$('edit-mode-hud'); if(h) h.textContent=editModeHudText(); }
}

document.addEventListener('keyup', e => {
  delete editMode.keys[e.code];
});

function updateEditMode(delta) {
  if (!editMode.active) return;
  if (editMode.light) return updateLightEditMode(delta);
  if (!selectedObj) return;
  const k = editMode.keys;
  const shift = k['ShiftLeft'] || k['ShiftRight'];
  const space  = k['Space'];
  const baseSpeed = shift ? 6 : space ? 0.5 : 2;

  const m = gizmoMode;

  if (m === 'move') {
    const speed = baseSpeed * delta;
    // Kamera yo'nalishi bo'yicha harakat (horizontal)
    const fwd   = new THREE.Vector3(-Math.sin(spherical.theta), 0, -Math.cos(spherical.theta)).normalize();
    const right  = new THREE.Vector3(Math.cos(spherical.theta), 0, -Math.sin(spherical.theta)).normalize();
    if (k['KeyW']) selectedObj.position.addScaledVector(fwd,   speed);
    if (k['KeyS']) selectedObj.position.addScaledVector(fwd,  -speed);
    if (k['KeyA']) selectedObj.position.addScaledVector(right, -speed);
    if (k['KeyD']) selectedObj.position.addScaledVector(right,  speed);
    if (k['KeyQ']) selectedObj.position.y -= speed;
    if (k['KeyE']) selectedObj.position.y += speed;
    // Outline va inspektor sinxi
    if (outlineMesh) outlineMesh.position.copy(selectedObj.position);
    if ($('px')) { $('px').value=selectedObj.position.x.toFixed(2); $('py').value=selectedObj.position.y.toFixed(2); $('pz').value=selectedObj.position.z.toFixed(2); }
    // Kamera orbitTarget ham ob'ekt bilan yuradi
    orbitTarget.copy(selectedObj.position);
    updateCamera();

  } else if (m === 'rotate') {
    const speed = 1.5 * delta;
    if (k['KeyA']) selectedObj.rotation.y -= speed;
    if (k['KeyD']) selectedObj.rotation.y += speed;
    if (k['KeyW']) selectedObj.rotation.x -= speed;
    if (k['KeyS']) selectedObj.rotation.x += speed;
    if (k['KeyQ']) selectedObj.rotation.z -= speed;
    if (k['KeyE']) selectedObj.rotation.z += speed;
    if (outlineMesh) outlineMesh.rotation.copy(selectedObj.rotation);

  } else if (m === 'scale') {
    const speed = 1.5 * delta;
    if (k['KeyW'] || k['KeyD']) { selectedObj.scale.multiplyScalar(1 + speed); }
    if (k['KeyS'] || k['KeyA']) { selectedObj.scale.multiplyScalar(Math.max(0.01, 1 - speed)); }
    if (k['KeyQ']) { const f=1-speed; selectedObj.scale.set(selectedObj.scale.x*f, selectedObj.scale.y, selectedObj.scale.z); }
    if (k['KeyE']) { const f=1+speed; selectedObj.scale.set(selectedObj.scale.x*f, selectedObj.scale.y, selectedObj.scale.z); }
    if (outlineMesh) outlineMesh.scale.copy(selectedObj.scale).multiplyScalar(1.07);
    if ($('sx')) { $('sx').value=selectedObj.scale.x.toFixed(2); $('sy').value=selectedObj.scale.y.toFixed(2); $('sz').value=selectedObj.scale.z.toFixed(2); }
  }
}

/** 💡 Yorug'likni WASD bilan surish va nurini yo'naltirish. */
function updateLightEditMode(delta) {
  const L = editMode.light;
  if (!L || !L.light) { exitEditMode(); return; }
  const k = editMode.keys;
  const shift = k['ShiftLeft'] || k['ShiftRight'];
  const speed = (shift ? 6 : k['Space'] ? 0.5 : 2) * delta;

  const p = L.light.position;
  const fwd   = new THREE.Vector3(-Math.sin(spherical.theta), 0, -Math.cos(spherical.theta)).normalize();
  const right = new THREE.Vector3( Math.cos(spherical.theta), 0, -Math.sin(spherical.theta)).normalize();
  let moved = false;
  if (k['KeyW']) { p.addScaledVector(fwd,   speed); moved = true; }
  if (k['KeyS']) { p.addScaledVector(fwd,  -speed); moved = true; }
  if (k['KeyA']) { p.addScaledVector(right, -speed); moved = true; }
  if (k['KeyD']) { p.addScaledVector(right,  speed); moved = true; }
  if (k['KeyQ']) { p.y -= speed; moved = true; }
  if (k['KeyE']) { p.y += speed; moved = true; }

  // ⚠ 🔦 Fonarning nuri `light.target` ga qaraydi — u bilan birga
  //   ko'chmasa, chiroqni surganingizda nur eski nuqtada qolib
  //   "cho'zilib" ketardi. `applyLightRotation()` targetni qaytadan
  //   hisoblaydi.
  if (moved) {
    if (L.marker) L.marker.position.copy(p);
    if (typeof applyLightRotation === 'function' &&
        (L.type === 'headlight' || L.type === 'sun')) applyLightRotation(L);
    if ($('lpx')) { $('lpx').value = p.x.toFixed(2); $('lpy').value = p.y.toFixed(2); $('lpz').value = p.z.toFixed(2); }
    orbitTarget.copy(p.length() > 120 ? p.clone().setLength(120) : p);
    updateCamera();
  }

  // ← → ↑ ↓ — nur yo'nalishi (faqat ☀️ va 🔦 da ma'noli)
  if (L.type === 'sun' || L.type === 'headlight') {
    const rs = (shift ? 90 : 35) * delta;
    let rot = false;
    if (k['ArrowUp'])    { L.rotX = Math.max(-89, Math.min(89, (L.rotX || 0) + rs)); rot = true; }
    if (k['ArrowDown'])  { L.rotX = Math.max(-89, Math.min(89, (L.rotX || 0) - rs)); rot = true; }
    if (k['ArrowLeft'])  { L.rotY = (L.rotY || 0) - rs; rot = true; }
    if (k['ArrowRight']) { L.rotY = (L.rotY || 0) + rs; rot = true; }
    if (rot) {
      if (typeof applyLightRotation === 'function') applyLightRotation(L);
      if ($('sl-rx-v')) $('sl-rx-v').textContent = (L.rotX || 0).toFixed(0) + '°';
      if ($('sl-ry-v')) $('sl-ry-v').textContent = (L.rotY || 0).toFixed(0) + '°';
    }
  }
}
