// ============================================================
//  ⚖️ OG'IRLIK MARKAZI (Center of Mass)
//
//  Obyektga massa berish yetarli emas: bir xil massali, lekin
//  og'irligi CHETGA surilgan jism butunlay boshqacha tutadi.
//  Chekkada turgan quti, og'ir tomoni tashqarida bo'lsa, QIYALAB
//  ag'anab tushadi — bu yerda shu qo'shiladi.
//
//  ── Qanday ishlaydi ─────────────────────────────────────────
//  Obyektga yoqilsa, uning ichida kichik kubcha (marker) paydo
//  bo'ladi. Uni oddiy GIZMO bilan surasiz — qayerga sursangiz,
//  og'irlik o'sha tomonga o'tadi. Marker MUHARRIR narsasi:
//  ▶ O'YNA bosilganda ko'rinmaydi va saqlanmaydi ham.
//
//  ⚠ TORQUE QO'LDA HISOBLANMAYDI. Rapier collider'ga massa va
//    og'irlik markazi berilsa, gravitatsiya momentini o'zi
//    hisoblaydi — qiyalash, ag'anash, aylanish hammasi tabiiy
//    chiqadi. Qo'lda "tepasiga kuch qo'shish" har doim soxta
//    ko'rinadi va boshqa to'qnashuvlar bilan urishib ketadi.
//
//  ── Ko'tarilgan yuk ─────────────────────────────────────────
//  O'yinchi PICKUP bilan massali obyektni olib, boshqasining
//  ustiga qo'ysa — ikkalasining massasi va markazi BIRLASHADI
//  (`recompute`). Chapga qo'ysa chap tomoni og'irlashadi.
// ============================================================

const CenterOfMass = (() => {
  'use strict';

  const MARK_NAME = '__com__';
  const COL_COM   = 0xffcc00;   // sariq — og'irlik markazi
  const COL_SEL   = 0x39ff14;   // tanlanganda yashil

  const _hitList = [];   // markerlar — O'Z raycast ro'yxatimiz

  const _log = (m, t) => { try { (window.log || console.log)(m, t || 'lok'); } catch (e) { console.log(m); } };
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying) || window.isPlaying ||
                         (typeof document !== 'undefined' && document.body &&
                          document.body.classList.contains('play-mode'));

  /** Obyektning o'lchami (marker kattaligini shunga moslash uchun) */
  function _sizeOf(obj) {
    try {
      const b = new THREE.Box3().setFromObject(obj);
      const s = b.getSize(new THREE.Vector3());
      return Math.max(0.05, (s.x + s.y + s.z) / 3);
    } catch (e) { return 1; }
  }

  // ── Marker ───────────────────────────────────────────────────

  function _marker(obj) { return obj && obj.getObjectByName ? obj.getObjectByName(MARK_NAME) : null; }

  function _makeMarker(obj) {
    let m = _marker(obj);
    if (m) return m;
    const r = _sizeOf(obj) * 0.14;
    m = new THREE.Mesh(
      new THREE.BoxGeometry(r, r, r),
      new THREE.MeshBasicMaterial({ color: COL_COM, depthTest: false, transparent: true, opacity: 0.95 }));
    m.name = MARK_NAME;
    m.renderOrder = 997;
    // ⚠ `__noSave` — `_slSkip()` shu bayroqni biladi va markerni
    //   faylga yozmaydi. Aks holda u sahnaga oddiy kub bo'lib qaytardi.
    m.userData = { __noSave: true, _isCom: true, _comOwner: obj, name: '⚖ Og\'irlik markazi' };
    m.visible = !_playing();
    obj.add(m);
    return m;
  }

  // ── Yoqish / o'chirish ──────────────────────────────────────

  function isOn(obj) { return !!(obj && obj.userData && obj.userData.comEnabled); }

  function enable(obj) {
    if (!obj || !obj.userData) return false;
    const ud = obj.userData;
    ud.comEnabled = true;
    if (!ud.com) ud.com = { x: 0, y: 0, z: 0 };
    const m = _makeMarker(obj);
    m.position.set(ud.com.x, ud.com.y, ud.com.z);

    // ⚠ `objects[]` GA QO'SHILMAYDI.
    //
    //   Suyak markerlari qo'shiladi — va aynan shundan kelib chiqib
    //   ular saqlashda "34 ta yolg'on kub" bo'lib qaytgan edi.
    //   Loyihada `objects` ni aylanadigan 86 ta sikl bor va ularning
    //   71 tasi `userData.id` yoki bayroq TEKSHIRMAYDI — ya'ni marker
    //   u yerga tushsa, karta ofsetiga, eksportga, statistikaga,
    //   AI qidiruviga... hammasiga aralashardi.
    //
    //   Tanlash uchun ro'yxatda bo'lish SHART EMAS: `selectObject()`
    //   istalgan obyektni qabul qiladi va gizmo faqat `selectedObj`
    //   bilan ishlaydi. Shuning uchun o'z raycast'imizni yuritamiz
    //   (`_hitList`) — bone-system ham aynan shunday qiladi.
    if (_hitList.indexOf(m) < 0) _hitList.push(m);
    _hookClick();

    apply(obj);
    _log(`⚖ "${ud.name || 'obyekt'}" — og'irlik markazi yoqildi. Sariq kubchani surib o'zgartiring.`, 'lok');
    return true;
  }

  function disable(obj) {
    if (!obj || !obj.userData) return false;
    obj.userData.comEnabled = false;
    const m = _marker(obj);
    if (m) {
      const i = _hitList.indexOf(m);
      if (i >= 0) _hitList.splice(i, 1);
      obj.remove(m);
      try { m.geometry.dispose(); m.material.dispose(); } catch (e) {}
    }
    apply(obj);   // Rapier'ga standart massa xossalarini qaytaradi
    _log(`⚖ "${obj.userData.name || 'obyekt'}" — og'irlik markazi o'chirildi`, 'lw');
    return true;
  }

  function toggle(obj) { return isOn(obj) ? disable(obj) : enable(obj); }

  // ── Markaz / massa ──────────────────────────────────────────

  /** Markerdan o'qib `userData.com` ga yozadi (gizmo bilan surilgach). */
  function syncFromMarker(obj) {
    const m = _marker(obj);
    if (!m || !obj.userData) return null;
    obj.userData.com = { x: m.position.x, y: m.position.y, z: m.position.z };
    apply(obj);
    return obj.userData.com;
  }

  /** Marker surilganini aniqlab, egasini yangilaydi. */
  function onMarkerMoved(markerMesh) {
    if (!markerMesh || !markerMesh.userData || !markerMesh.userData._isCom) return false;
    const owner = markerMesh.userData._comOwner;
    if (!owner) return false;
    syncFromMarker(owner);
    return true;
  }

  function setCom(obj, x, y, z) {
    if (!obj || !obj.userData) return;
    obj.userData.com = { x: +x || 0, y: +y || 0, z: +z || 0 };
    const m = _marker(obj);
    if (m) m.position.set(obj.userData.com.x, obj.userData.com.y, obj.userData.com.z);
    apply(obj);
  }

  function getMass(obj) {
    const pb = (typeof physBodies !== 'undefined')
      ? physBodies.find(b => b.mesh === obj) : null;
    if (pb && pb.mass) return pb.mass;
    return (obj && obj.userData && obj.userData.mass) || 1;
  }

  function setMass(obj, m) {
    const val = Math.max(0.01, +m || 1);
    if (obj && obj.userData) obj.userData.mass = val;
    if (typeof physBodies !== 'undefined') {
      const pb = physBodies.find(b => b.mesh === obj);
      if (pb) pb.mass = val;
    }
    apply(obj);
  }

  // ── Ko'tarilgan yuklar bilan birlashtirish ──────────────────

  /**
   * Obyektning ustiga qo'yilgan / biriktirilgan massali bolalarni
   * hisobga olib UMUMIY massa va markazni qaytaradi.
   *
   * ⚠ Bola obyektning LOKAL koordinatasida ishlaymiz — markaz ham
   *   lokal bo'lishi kerak (Rapier collider markazi shunday kutadi).
   */
  function combined(obj) {
    let mass = getMass(obj);
    const ud = obj.userData || {};
    const c = ud.com || { x: 0, y: 0, z: 0 };
    let mx = c.x * mass, my = c.y * mass, mz = c.z * mass;
    let extra = 0;

    for (const ch of (obj.children || [])) {
      if (!ch || !ch.userData) continue;
      if (ch.userData._isCom) continue;                 // marker — massasiz
      if (!ch.userData._comAttached) continue;          // faqat ATAYLAB qo'yilganlar
      const cm = getMass(ch);
      if (!cm) continue;
      // Bolaning o'z markazi ham hisobga olinadi
      const cc = ch.userData.com || { x: 0, y: 0, z: 0 };
      mx += (ch.position.x + cc.x) * cm;
      my += (ch.position.y + cc.y) * cm;
      mz += (ch.position.z + cc.z) * cm;
      mass += cm; extra++;
    }
    if (mass <= 0) return { mass: 1, com: { x: 0, y: 0, z: 0 }, extra: 0 };
    return { mass, com: { x: mx / mass, y: my / mass, z: mz / mass }, extra };
  }

  /** Obyektga yuk biriktirish (PICKUP qo'yilganda). */
  function attachLoad(host, load) {
    if (!host || !load || !load.userData) return false;
    load.userData._comAttached = true;
    apply(host);
    const r = combined(host);
    _log(`⚖ Yuk qo'shildi: umumiy massa ${r.mass.toFixed(1)}, ` +
         `markaz x=${r.com.x.toFixed(2)} z=${r.com.z.toFixed(2)}`, 'lok');
    return true;
  }

  function detachLoad(host, load) {
    if (load && load.userData) load.userData._comAttached = false;
    apply(host);
    return true;
  }

  // ── Rapier'ga uzatish ───────────────────────────────────────

  /**
   * Massa + og'irlik markazini fizika tanasiga yozadi.
   *
   * ⚠ Momentni O'ZIMIZ hisoblamaymiz. Rapier collider markazini bilsa,
   *   gravitatsiya momentini o'zi chiqaradi — qiyalash va ag'anash
   *   tabiiy bo'ladi. Qo'lda kuch qo'shish har doim soxta ko'rinadi.
   */
  function apply(obj) {
    if (!obj) return false;
    if (typeof rapierBodies === 'undefined' || !rapierBodies) return false;
    const rb = rapierBodies.get(obj);
    if (!rb || !rb.collider || !rb.legacy || rb.legacy.isStatic) return false;

    const on = isOn(obj);
    const r  = on ? combined(obj) : { mass: getMass(obj), com: { x: 0, y: 0, z: 0 } };

    try {
      // Inersiya — o'lcham va massadan taxminiy kub momenti.
      // (Aniq tenzor shart emas: qiyalash yo'nalishini MARKAZ belgilaydi,
      //  inersiya faqat aylanish TEZLIGIGA ta'sir qiladi.)
      const s = _sizeOf(obj);
      const I = Math.max(1e-4, r.mass * s * s / 6);
      rb.collider.setMassProperties(
        r.mass,
        { x: r.com.x, y: r.com.y, z: r.com.z },
        { x: I, y: I, z: I },
        { x: 0, y: 0, z: 0, w: 1 });
      // Tana uyquda bo'lsa uyg'otamiz — aks holda o'zgarish sezilmaydi
      if (rb.rigidBody.wakeUp) rb.rigidBody.wakeUp();
      return true;
    } catch (e) {
      _log('⚠ Og\'irlik markazi qo\'llanmadi: ' + e.message, 'lw');
      return false;
    }
  }

  /** Barcha yoqilgan obyektlar uchun qayta qo'llash (Play boshlanishida). */
  function applyAll() {
    if (typeof objects === 'undefined') return 0;
    let n = 0;
    for (const o of objects) if (isOn(o) && apply(o)) n++;
    return n;
  }

  // ── Ko'rinish (marker — muharrir narsasi) ───────────────────

  let _lastHide = null;
  function refresh(force) {
    const hide = _playing();
    if (!force && hide === _lastHide) return;
    _lastHide = hide;
    for (const o of _hitList) { if (o) o.visible = !hide; }
  }

  /** Tanlangan markerni ajratib ko'rsatish. */
  function highlight(sel) {
    for (const o of _hitList) {
      if (!o || !o.material) continue;
      try { o.material.color.setHex(o === sel ? COL_SEL : COL_COM); } catch (e) {}
    }
  }

  // ── Bosib tanlash (o'z raycast'i) ───────────────────────────
  //  ⚠ Marker `objects[]` da EMAS, shuning uchun dvigatelning umumiy
  //    tanlash mexanizmi uni ko'rmaydi. O'zimiz ushlaymiz.
  let _hooked = false;
  const _ray = new THREE.Raycaster();
  let _swallow = false;

  function _hookClick() {
    if (_hooked) return;
    const cv = (typeof renderer !== 'undefined' && renderer && renderer.domElement)
                 ? renderer.domElement : document.querySelector('canvas');
    if (!cv) return;
    _hooked = true;

    const down = e => {
      if (_playing() || !_hitList.length) return;
      const cam = (typeof camera !== 'undefined' && camera) ? camera : window.camera;
      if (!cam) return;
      const r = cv.getBoundingClientRect();
      _ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1,
                           y: -((e.clientY - r.top) / r.height) * 2 + 1 }, cam);
      const hits = _ray.intersectObjects(_hitList.filter(o => o.visible), false);
      if (!hits.length) return;
      if (typeof selectObject === 'function') selectObject(hits[0].object);
      highlight(hits[0].object);
      _swallow = true;
      e.stopPropagation(); e.preventDefault();
    };
    const eat = e => { if (_swallow) { _swallow = false; e.stopPropagation(); e.preventDefault(); } };
    cv.addEventListener('pointerdown', down, true);
    cv.addEventListener('mousedown', down, true);
    cv.addEventListener('click', eat, true);
  }

  /**
   * Yuklangandan keyin markerlarni tiklash.
   * ⚠ `comEnabled` / `com` userData da SAQLANADI, lekin marker
   *   saqlanmaydi (`__noSave`). Sahna yuklangach ularni qayta
   *   yasamasak, sozlama "bor"day ko'rinadi-yu, marker ham,
   *   fizikaga uzatish ham bo'lmasdi.
   */
  function restoreAll() {
    if (typeof objects === 'undefined') return 0;
    let n = 0;
    for (const o of objects) {
      if (!o || !o.userData || !o.userData.comEnabled) continue;
      if (_marker(o)) { apply(o); continue; }
      const m = _makeMarker(o);
      const c = o.userData.com || { x: 0, y: 0, z: 0 };
      m.position.set(c.x, c.y, c.z);
      if (_hitList.indexOf(m) < 0) _hitList.push(m);
      apply(o); n++;
    }
    if (n) _log(`⚖ ${n} ta og'irlik markazi tiklandi`, 'lok');
    _hookClick();
    return n;
  }

  // ── 💾 SystemRegistry shartnomasi ────────────────────────────
  //  ⚠ Og'irlik markazi va massa obyektlarning `userData` sida turadi
  //    (avtomatik saqlanadi). Bu yerda faqat REJIM holati.
  // ── ⚠ TIZIM DARAJASIDA SAQLANADIGAN HOLAT YO'Q ──────────────
  //  ⚖️ Massa markazi — HAR OBYEKTNING o'z sozlamasi
  //  (`ud.comEnabled`, `ud.com`). U obyekt bilan birga, umumiy
  //  `userData` yo'lidan saqlanadi.
  //
  //  ⚠ Ilgari bu yerda shunday edi:
  //      serialize() { return { on: !!isOn() }; }
  //      restore(d)  { if (d.on) enable(); else disable(); }
  //
  //    Lekin `isOn`, `enable` va `disable` — uchalasi ham OBYEKT
  //    talab qiladi (`isOn(obj)`), bu yerda esa argumentsiz
  //    chaqirilardi. Natijada:
  //      • `serialize()` HAR DOIM `{on:false}` qaytarardi —
  //        har bir saqlangan sahnaga ma'nosiz maydon qo'shilardi;
  //      • `restore()` HECH NIMA qilmasdi (`enable()` darhol
  //        `false` qaytarardi).
  //
  //    Ya'ni juftlik hech qachon ishlamagan, lekin `SystemRegistry`
  //    da "tiklanadigan tizim" bo'lib turardi va uni sinash
  //    imkonsiz edi.
  //
  //  `null` qaytarish — `SystemRegistry` ni bu tizimni o'tkazib
  //  yuborishga undaydi (`serializeAll` da `if (v == null) continue`).
  function serialize() { return null; }

  /** Eski fayllarda `{on:…}` bo'lishi mumkin — jimgina e'tiborsiz. */
  function restore() { return 0; }

  return {
    serialize, restore,
    isOn, enable, disable, toggle, restoreAll,
    setCom, syncFromMarker, onMarkerMoved,
    getMass, setMass, combined,
    attachLoad, detachLoad,
    apply, applyAll, refresh, highlight,
    _marker, MARK_NAME,
  };
})();

window.CenterOfMass = CenterOfMass;

// Inspektor tugmalari uchun
window._comToggle = function() {
  const o = (typeof selectedObj !== 'undefined') ? selectedObj : window.selectedObj;
  if (!o) return;
  CenterOfMass.toggle(o);
  if (typeof updateInspector === 'function') updateInspector();
  if (typeof updateHierarchy === 'function') updateHierarchy();
};

window._comSet = function(axis, val) {
  const o = (typeof selectedObj !== 'undefined') ? selectedObj : window.selectedObj;
  if (!o || !o.userData) return;
  const c = o.userData.com || { x: 0, y: 0, z: 0 };
  c[axis] = parseFloat(val) || 0;
  CenterOfMass.setCom(o, c.x, c.y, c.z);
};

window._comReset = function() {
  const o = (typeof selectedObj !== 'undefined') ? selectedObj : window.selectedObj;
  if (!o) return;
  CenterOfMass.setCom(o, 0, 0, 0);
  if (typeof updateInspector === 'function') updateInspector();
};
