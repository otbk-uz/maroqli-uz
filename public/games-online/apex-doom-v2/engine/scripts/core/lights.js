
// ============================================================
//  💡 YORDAMCHI CHIZIQLAR — BUTUNLAY OLIB TASHLANDI (58.34)
// ------------------------------------------------------------
//  `PointLightHelper` / `SpotLightHelper` sahna ustida oq to'r
//  chiziqlarni chizardi: fonarlardan uzun konuslar, nuqtaviy
//  yorug'liklardan to'rli sharlar. Ular butun sahnani to'sib
//  turardi va HECH QANDAY foyda bermasdi — yorug'lik pozitsiyasi
//  ⚡ ro'yxatdan tanlanadi va inspektorda sozlanadi.
//
//  Avval ular faqat ▶ Play da yashirilgan edi (58.32), lekin
//  muharrirda ham keraksiz ekan.
//
//  ☀️ Quyoshning kichkina oq to'rtburchagi (`__sun_marker__`) ham
//  shu sababdan olib tashlandi.
//
//  ⚠ Endi yorug'likka QANDAY yetish kerak: ⚡ ro'yxatdan tanlanadi,
//    so'ng **F** bosiladi — kamera o'sha yorug'likka uchadi
//    (`keyboard.js`). Ilgari F faqat obyektlarga ishlardi.
//
//  ⚠ `entry.helper` maydoni SAQLANDI (doim `null`) — uni o'qiydigan
//    eski kod (`hierarchy.js`) sinmasin.
// ============================================================

// Eski chaqiriqlar sinmasin — endi ish yo'q.
window.syncLightHelpers = function () {};

// ============================================================
// LIGHTS SYSTEM
// ============================================================

// ─── Markaziy holat ob'ekti — global o'zgaruvchilar o'rniga ─
const AppState = {
  // Sahna ob'ektlari
  objects:        [],
  selectedObj:    null,
  selectedLight:  null,
  objIdC:         0,
  particleSystems:[],
  psIdC:          0,
  // Chiroqlar
  lights:         [],
  lightIdC:       0,
};

// Eski kod bilan moslik uchun alias'lar (qisqa muddatli shim)
// Keyinchalik barcha joyda AppState.xxx ishlatilsin
let lights         = AppState.lights;
let lightIdC       = AppState.lightIdC;
let objects        = AppState.objects;
// ⚠ `keybindings.js` `window.objects` ga tayanadi (fallback qidiruvda).
//   Top-level `let` window ga yozilmaydi → u yerda doim `undefined` edi.
window.objects     = objects;
let selectedObj    = AppState.selectedObj;
let selectedLight  = AppState.selectedLight;
let objIdC         = AppState.objIdC;
let particleSystems= AppState.particleSystems;
let psIdC = 0;

function createLight(type='point', opts={}) {
  let light, helper;
  const col = opts.color || 0x88aaff;
  const intensity = opts.intensity || 1;
  const pos = opts.pos || new THREE.Vector3(0,5,0);

  if (type === 'ambient') {
    light = new THREE.AmbientLight(col, intensity);
  } else if (type === 'directional') {
    light = new THREE.DirectionalLight(col, intensity);
    light.position.copy(pos);
    light.castShadow = true;
    light.shadow.mapSize.set(1024,1024);
    helper = null; // DirectionalLightHelper olib tashlandi
  } else if (type === 'point') {
    light = new THREE.PointLight(col, intensity, opts.distance||20);
    light.position.copy(pos);
    light.castShadow = true;
    helper = null;   // 💡 yordamchi chiziqlar olib tashlandi (58.34)
  } else if (type === 'spot') {
    light = new THREE.SpotLight(col, intensity);
    light.position.copy(pos);
    light.castShadow = true;
    light.angle = opts.angle || Math.PI/6;
    light.penumbra = 0.3;
    helper = null;   // 💡 yordamchi chiziqlar olib tashlandi (58.34)
  }

  // Parent object ga biriktirish yoki scene ga qo'shish
  const container = opts.parent || null;
  if (container) {
    container.add(light);
  } else {
    scene.add(light);
  }

  const lid = ++lightIdC;
  const entry = {id:lid, type, light, helper, name:`${type[0].toUpperCase()+type.slice(1)} ${lid}`, parent:container};

  // ⚠ Yorug'liklar `objects[]` da EMAS — alohida `lights` massivida.
  //   Timeline esa `userData.id` bo'yicha trek quradi va `getObjById`
  //   orqali qidiradi. Shu ikki maydonsiz yorug'likni umuman
  //   animatsiya qilib bo'lmasdi.
  //   `L` prefiksi — obyekt id'lari bilan to'qnashmasligi uchun
  //   (ikkalasi ham 1,2,3… dan boshlanadi).
  light.userData = light.userData || {};
  light.userData.id        = 'L' + lid;
  light.userData.name      = entry.name;
  light.userData.isLight3D = true;      // captureState/applyState uchun belgi
  light.userData._lentry   = entry;

  lights.push(entry);
  if (typeof updateHierarchy === "function") updateHierarchy();
  log(`💡 ${entry.name} qo'shildi${container?' → '+container.userData?.name:''}`, 'lok');
  return entry;
}

// Default lights
createLight('ambient', {color:0x334488, intensity:0.9});
const sun = createLight('directional', {color:0xfff0dd, intensity:2.5, pos:new THREE.Vector3(10,15,8)});
const fill = createLight('point', {color:0x4466ff, intensity:1.8, distance:35, pos:new THREE.Vector3(-8,3,-6)});

window.addLight = function() {
  const types = [
    ['☀️ Sun (Quyosh)','sun'],
    ['🔦 Headlight (Fanar)','headlight'],
    ['Point 💡','point'],
    ['Spot 🔦','spot'],
    ['Directional ☀','directional'],
  ];
  const m = document.createElement('div');
  m.classList.add('ui-popup');
m.style.cssText='min-width:170px;top:60px;left:50%';
  types.forEach(([label,type])=>{
    const b = document.createElement('button');
    b.textContent = label;
    b.classList.add('ui-menu-item');
    b.onmouseover=()=>b.style.background='var(--hover)';
    b.onmouseout=()=>b.style.background='none';
    b.onclick=()=>{
      if (type==='sun') {
        createSunLight({pos:new THREE.Vector3(10,15,8)});
      } else if (type==='headlight') {
        createHeadlight({pos:new THREE.Vector3(0,2,0)});
      } else {
        const pos=new THREE.Vector3((Math.random()-.5)*8,3+Math.random()*4,(Math.random()-.5)*8);
        const col=[0xff4488,0x44ffaa,0xffaa00,0x88aaff][Math.floor(Math.random()*4)];
        createLight(type,{color:col,intensity:1.5,pos});
      }
      document.body.removeChild(m);
      if (typeof updateHierarchy === "function") updateHierarchy();
    };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener('click',function rm(){if(m.parentNode)m.parentNode.removeChild(m);document.removeEventListener('click',rm)},100));
};

// ────────────────────────────────────────────────────────────────
// SUN LIGHT — quyoshday keng maydon directional, rotatsiya bilan
// ────────────────────────────────────────────────────────────────
function createSunLight(opts={}) {
  const col = opts.color || 0xfff5cc;
  const intensity = opts.intensity || 6;
  const pos = opts.pos || new THREE.Vector3(10,15,8);
  const parent = opts.parent || null;

  const light = new THREE.DirectionalLight(col, intensity);
  light.position.copy(pos);
  light.castShadow = true;
  light.shadow.mapSize.set(2048,2048);
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 200;
  light.shadow.camera.left = -30;
  light.shadow.camera.right = 30;
  light.shadow.camera.top = 30;
  light.shadow.camera.bottom = -30;

  // ☀️ Kichkina oq to'rtburchak marker OLIB TASHLANDI (58.34) —
  //    u sahnada osilib turardi va yorug'likka hech nima qo'shmasdi.
  //    Quyosh ⚡ ro'yxatdan tanlanadi, F bilan unga uchiladi.
  const sunMesh = null;
  const helper  = null;

  const container = parent;
  if (container) container.add(light);
  else scene.add(light);

  const lid = ++lightIdC;
  const entry = {
    id:lid, type:'sun', light, helper,
    marker:sunMesh,
    name:`Sun ${lid}`,
    parent:container,
    rotX: Math.atan2(pos.y, Math.sqrt(pos.x*pos.x+pos.z*pos.z)) * 180/Math.PI,
    rotY: Math.atan2(pos.x, pos.z) * 180/Math.PI,
  };
  lights.push(entry);
  if (typeof updateHierarchy === "function") updateHierarchy();
  log(`☀️ Sun yorug'lik qo'shildi (${intensity} intensiv, soya: 2K)`, 'lok');
  return entry;
}

// ────────────────────────────────────────────────────────────────
// HEADLIGHT — mashina farasi / fonar, rotatsiya bilan
// ────────────────────────────────────────────────────────────────
function createHeadlight(opts={}) {
  const col = opts.color || 0xffffff;
  const intensity = opts.intensity || 8;
  const pos = opts.pos || new THREE.Vector3(0,1,0);
  const parent = opts.parent || null;

  const light = new THREE.SpotLight(col, intensity);
  light.position.copy(pos);
  light.angle = opts.angle || Math.PI/10; // tor konusli
  light.penumbra = 0.15;
  light.distance = opts.distance || 30;
  light.castShadow = true;
  light.shadow.mapSize.set(1024,1024);

  // Target
  light.target.position.set(pos.x, pos.y, pos.z - 5);

  // Fanar korpus marker
  const fGeo = new THREE.CylinderGeometry(0.08,0.18,0.3,10);
  const fMat = new THREE.MeshBasicMaterial({color:0xaaddff,transparent:true,opacity:0.9});
  const fMarker = new THREE.Mesh(fGeo,fMat);
  fMarker.rotation.x = Math.PI/2;
  fMarker.name = '__headlight_marker__';

  // Lens glow disc
  const lGeo = new THREE.CircleGeometry(0.18,16);
  const lMat = new THREE.MeshBasicMaterial({color:0xeef8ff,transparent:true,opacity:0.85,side:THREE.DoubleSide});
  const lens = new THREE.Mesh(lGeo,lMat);
  lens.position.z = -0.16;
  fMarker.add(lens);
  fMarker.position.copy(pos);

  const helper = null;   // 💡 yordamchi chiziqlar olib tashlandi (58.34)

  const container = parent;
  if(container){
    container.add(light); container.add(light.target); container.add(fMarker);
  } else {
    scene.add(light); scene.add(light.target); scene.add(fMarker);
  }

  const lid = ++lightIdC;
  const entry = {
    id:lid, type:'headlight', light, helper,
    marker:fMarker,
    name:`Headlight ${lid}`,
    parent:container,
    rotX:0, rotY:0,
  };
  lights.push(entry);
  if (typeof updateHierarchy === "function") updateHierarchy();
  log(`🔦 Headlight (fanar) qo'shildi`, 'lok');
  return entry;
}

// Sun / Headlight yo'nalishini rotatsiyadan hisoblash
function applyLightRotation(entry) {
  const rx = (entry.rotX||0) * Math.PI/180;
  const ry = (entry.rotY||0) * Math.PI/180;
  const r = 18; // radius
  const dir = new THREE.Vector3(
    r * Math.sin(ry) * Math.cos(rx),
    r * Math.sin(rx),
    r * Math.cos(ry) * Math.cos(rx)
  );
  const base = entry.parent ? new THREE.Vector3(0,0,0) : new THREE.Vector3(0,0,0);

  if (entry.type==='sun') {
    entry.light.position.copy(dir);
    if (entry.marker) entry.marker.position.copy(dir);
    if (entry.helper) entry.helper.update();   // 💡 endi doim null
  } else if (entry.type==='headlight') {
    // target yo'nalishi
    const pos = entry.light.position.clone();
    const targetDir = new THREE.Vector3(
      Math.sin(ry)*Math.cos(rx),
      Math.sin(rx),
      -Math.cos(ry)*Math.cos(rx)
    );
    entry.light.target.position.copy(pos.clone().add(targetDir.multiplyScalar(10)));
    entry.light.target.updateMatrixWorld();
    // Marker rotation
    if (entry.marker) {
      entry.marker.rotation.x = rx;
      entry.marker.rotation.y = ry;
    }
    if (entry.helper) entry.helper.update();   // 💡 endi doim null
  }
}
