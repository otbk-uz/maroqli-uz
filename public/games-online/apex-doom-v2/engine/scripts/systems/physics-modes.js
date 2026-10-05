// ============================================================
// DEFORM OPERATIONS
// ------------------------------------------------------------
//  ⚠ DEFORM IKKI XIL, VA ULAR BOSHQACHA SAQLANADI:
//
//    squish · stretch · inflate → faqat `scale` ni o'zgartiradi.
//        `scale` allaqachon saqlanadi → aylanmadan o'zi o'tadi.
//
//    twist · shear → GEOMETRIYA VERTEKSLARINI o'zgartiradi.
//        Bu yerda muammo bor edi: saqlashda geometriya YOZILMAYDI —
//        faylga faqat `type` tushadi (`Kub`, `Sfera`), yuklashda esa
//        `PRIMITIVES[i].geo()` toza geometriya yasaydi. Ya'ni
//        burab/qiyshaytirib qo'yilgan obyekt sahna qayta ochilganda
//        JIMGINA asl shakliga qaytardi.
//
//  YECHIM: vertex amallari `ud.deformOps` ga YOZIB BORILADI
//  (`[{op:'twist', str:1.4}, …]`) va yuklashdan keyin toza
//  geometriya ustida QAYTA IJRO ETILADI.
//
//  ⚠ NEGA GEOMETRIYANING O'ZI SAQLANMAYDI: burab qo'yilgan sferada
//    ~2000 vertex bor — bu JSON'da ~100 KB. O'nta shunday obyekt
//    sahnani megabaytlarga shishirardi. Amallar ro'yxati esa bir
//    necha bayt va ANIQ: bir xil ro'yxat har doim bir xil shakl
//    beradi (`_applyVertexOp` — sof funksiya, tasodif ishlatmaydi).
//
//  ⚠ CHEGARA (halol yozamiz): agar foydalanuvchi AVVAL burab, KEYIN
//    ◈ pivotni ko'chirsa, yuklashda tartib teskari bo'ladi
//    (deform → pivot). Burash va siljitish o'rin almashtirilsa
//    natija bir xil emas. Amaliyotda sezilarli emas, lekin
//    to'liq aniqlik uchun pivotni deformdan OLDIN qo'ying.
// ============================================================

/**
 * Bitta vertex amalini geometriyaga qo'llaydi.
 * ⚠ SOF funksiya: bir xil kirish → bir xil chiqish. Qayta ijro
 *   aynan shunga tayanadi.
 */
window._applyVertexOp = function (geo, op, str) {
  const pos = geo && geo.attributes && geo.attributes.position;
  if (!pos) return false;
  if (op === 'twist') {
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const angle = y * 0.8 * str;
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setX(i, x * Math.cos(angle) - z * Math.sin(angle));
      pos.setZ(i, x * Math.sin(angle) + z * Math.cos(angle));
    }
  } else if (op === 'shear') {
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + pos.getY(i) * 0.25 * str);
    }
  } else return false;
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return true;
};

window.deformOp = function(op) {
  if (!selectedObj || !selectedObj.geometry) return;
  const str = parseFloat($('deform-str')?.value || 1);
  const geo = selectedObj.geometry;
  const pos = geo.attributes.position;

  // Jelly objects: bump amplitude
  if (selectedObj.userData.physMode === 'jelly') {
    const jd = jellyObjects.get(selectedObj);
    if (jd) { jd.amp = Math.min(0.4, (jd.amp||0) + 0.08 * str); }
  }

  if (op === 'squish') {
    selectedObj.scale.y = Math.max(0.05, selectedObj.scale.y - 0.15 * str);
    selectedObj.scale.x *= 1 + 0.06 * str;
    selectedObj.scale.z *= 1 + 0.06 * str;
  }
  else if (op === 'stretch') {
    selectedObj.scale.y *= 1 + 0.2 * str;
    selectedObj.scale.x = Math.max(0.05, selectedObj.scale.x - 0.05 * str);
    selectedObj.scale.z = Math.max(0.05, selectedObj.scale.z - 0.05 * str);
  }
  else if (op === 'inflate') {
    selectedObj.scale.multiplyScalar(1 + 0.12 * str);
  }
  else if (op === 'twist' || op === 'shear') {
    window._applyVertexOp(geo, op, str);
    // 📝 Ro'yxatga yozamiz — aks holda yuklashda yo'qolardi.
    //    `deformOps` `_` SIZ: `_slCleanUD` `_` li kalitlarni tashlaydi.
    const ud = selectedObj.userData;
    if (!Array.isArray(ud.deformOps)) ud.deformOps = [];
    ud.deformOps.push({ op, str });
    // Nechtasi JORIY geometriyaga qo'llanganini belgilaymiz.
    ud._deformDone = ud.deformOps.length;
  }
  else if (op === 'break') {
    breakObject(selectedObj, str);
    return;
  }
  if (outlineMesh) { outlineMesh.position.copy(selectedObj.position); outlineMesh.scale.copy(selectedObj.scale).multiplyScalar(1.07); }
  captureState('Deform: '+op);
  log(`✏ ${selectedObj.userData.name} → ${op} (kuch:${str.toFixed(1)})`, 'lok');
};

// ============================================================
//  🔨 DeformSystem — yuklangandan keyin vertex amallarini QAYTA IJRO
//
//  ⚠ NEGA POLLING (`update` orqali), bir martalik chaqiruv emas:
//    obyekt sahnaga TO'RT yo'l bilan tushishi mumkin — `loadScene`,
//    📦 prefab, 🗺 Map Loader va 🧩 addon. Har biriga alohida
//    chaqiruv qo'shsak, beshinchisi qo'shilganda esdan chiqardi —
//    bu loyihada takrorlangan xato. ◈ `PivotSystem` aynan shu
//    sababdan xuddi shunday ishlaydi.
//
//  ⚠ Arzon: `_deformDone === deformOps.length` bo'lsa darhol chiqadi,
//    ya'ni odatdagi kadrda hech qanday ish bajarilmaydi.
// ============================================================
window.DeformSystem = (() => {
  'use strict';
  const _objs = () => (typeof objects !== 'undefined' ? objects : []);

  /** @returns {number} qayta ijro etilgan obyektlar soni */
  function syncAll() {
    let n = 0;
    for (const o of _objs()) {
      const ud = o && o.userData;
      if (!ud || !Array.isArray(ud.deformOps) || !ud.deformOps.length) continue;
      const done = ud._deformDone || 0;
      if (done >= ud.deformOps.length) continue;
      if (!o.geometry) continue;
      // ⚠ FAQAT qolganlari qo'llanadi. Butun geometriyani qaytadan
      //   yasab, hammasini boshidan ijro etsak — ◈ pivot surilishi
      //   yo'qolardi (u ham geometriyani o'zgartiradi).
      for (let i = done; i < ud.deformOps.length; i++) {
        const d = ud.deformOps[i];
        if (!d) continue;
        try { window._applyVertexOp(o.geometry, d.op, Number(d.str) || 1); } catch (e) {}
      }
      ud._deformDone = ud.deformOps.length;
      n++;
    }
    return n;
  }

  let _t = 0;
  function update(delta) {
    _t += (delta || 0.016);
    if (_t < 0.5) return;
    _t = 0;
    syncAll();
  }

  return { syncAll, update };
})();

window.resetDeform = function() {
  if (!selectedObj) return;
  selectedObj.scale.set(1,1,1);
  // Rebuild geometry from scratch
  const idx = PRIMITIVES.findIndex(p=>p.name===selectedObj.userData.type);
  if (idx>=0) {
    selectedObj.geometry.dispose();
    selectedObj.geometry = PRIMITIVES[idx].geo();
  }
  // 🔨 Vertex amallari ro'yxati ham tozalanadi — aks holda keyingi
  //    yuklashda ular QAYTA ijro etilib, \"reset\" bekor bo'lardi.
  delete selectedObj.userData.deformOps;
  delete selectedObj.userData._deformDone;
  captureState('Reset deform');
  log(`↺ ${selectedObj.userData.name} reset`, 'lw');
};

// ============================================================
// BREAK / SHATTER — fragments
// ============================================================
// ============================================================
// 💥 BREAK / SHATTER — parchalarga bo'lish
// ------------------------------------------------------------
//  ⚠ XATO (tuzatildi): parchalar `type:'Parchai'` bilan yozilardi.
//    Bunday tur `PRIMITIVES` da YO'Q, shuning uchun sahna saqlanib
//    qayta ochilganda yuklovchi konsolga
//        ⚠ Noma'lum tur (Parchai), Kub bilan almashtirildi
//    deb yozib, har bir parchani 1×1×1 lik KUBGA aylantirardi.
//    O'yinda (game.zip) mayda siniqlar o'rniga bir uyum katta kub
//    paydo bo'lardi — bu MiniPad bilan bo'lgan AYNAN o'sha xato.
//
//  YECHIM: parcha endi HAQIQIY primitivdan yasaladi va o'lchami
//    `scale` da saqlanadi. Ikkovi ham allaqachon saqlanadigan
//    maydonlar — ya'ni save-load ga hech nima qo'shish shart emas.
//
//    ⚠ Geometriya EMAS, `scale`: geometriya faylga umuman
//      yozilmaydi (u `PRIMITIVES[i].geo()` bilan qayta yasaladi),
//      shuning uchun o'lcham FAQAT `scale` orqali omon qoladi.
//
//  📁 Parchalar bitta PAPKAGA solinadi — ierarxiya 40 ta "Parcha 7"
//    bilan to'lib ketmasin.
//
//    ⚠ Papka ATAYLAB (0,0,0) da, burilishsiz va o'lchovsiz
//      qoldiriladi. Fizika `mesh.position` ni to'g'ridan yozadi, u
//      esa bola uchun LOKAL. Papka nol nuqtada turganda lokal ≡
//      dunyo, ya'ni fizika to'g'ri ishlaydi. Papkani surmang.
// ============================================================

/** Parcha turlari — hammasi `PRIMITIVES` da bor, ya'ni saqlanadi. */
const _FRAG_KINDS = [
  { type: 'Oktagedron', base: 1.4 },   // radius 0.7 → diametri 1.4
  { type: 'Kub',        base: 1.0 },
];

/**
 * Parchalar sonini aniqlaydi.
 * ⚠ IKKI MANBA: avval jonli slayder (`#deform-frags`), u yo'q bo'lsa
 *   eslab qolingan qiymat (`window._deformFrags`). Inspektor har
 *   tanlovda qayta chiziladi, ya'ni faqat DOM ga tayansak sozlama
 *   boshqa obyektga o'tganda yo'qolardi.
 */
function _fragCount(str) {
  const el = (typeof $ === 'function') ? $('deform-frags') : null;
  let n = el ? parseInt(el.value, 10) : NaN;
  if (!isFinite(n) || n <= 0) n = parseInt(window._deformFrags, 10);
  if (isFinite(n) && n > 0) return Math.max(2, Math.min(120, n));
  return 6 + Math.floor(str * 4);          // eski standart
}

/**
 * 💥 Parchalarni TAYYORLAYDI (hali sindirmaydi).
 *
 * ⚠ NEGA ASL OBYEKT O'CHIRILMAYDI (eski xulq shunday edi):
 *   ⏱ timelineda "1-kadrda butun, 3-kadrda siniq" qilish uchun
 *   obyekt QAYTA paydo bo'lishi kerak. O'chirilgan obyektni esa
 *   qaytarib bo'lmaydi — undo ham, keyframe ham ojiz.
 *   Endi u faqat YASHIRILADI (`visible=false`).
 *
 * @returns {THREE.Group|null} parchalar papkasi
 */
function prepareBreak(obj, str = 1) {
  if (!obj || obj.userData.isStatic) return null;
  // Allaqachon tayyorlangan bo'lsa — qaytadan yasamaymiz
  if (obj.userData.breakFolderId != null) {
    const ex = objects.find(o => o.userData && o.userData.id === obj.userData.breakFolderId);
    if (ex) return ex;
  }

  const fragCount = _fragCount(str);
  const baseSize = 0.22 * str;
  const srcName = obj.userData.name;

  // 📁 Parchalar papkasi — nol nuqtada (yuqoridagi izohga qarang)
  const folder = new THREE.Group();
  folder.position.set(0, 0, 0);
  folder.userData = {
    id: ++objIdC, name: srcName + ' — parchalari', type: 'Group',
    isGroup: true, _isFolder: true,
    colliderMode: 'inline',              // 👻 papka — idish, jism emas
    children: [], parentId: null,
  };
  folder.visible = false;                // sinmaguncha ko'rinmaydi
  scene.add(folder);
  objects.push(folder);

  const srcColor = (obj.material && obj.material.color)
    ? obj.material.color.clone() : new THREE.Color(0x888888);

  for (let i = 0; i < fragCount; i++) {
    const s = baseSize * (0.5 + Math.random());
    const kind = _FRAG_KINDS[Math.random() > 0.5 ? 0 : 1];
    const pi = PRIMITIVES.findIndex(p => p.name === kind.type);
    if (pi < 0) continue;

    const frag = new THREE.Mesh(PRIMITIVES[pi].geo(), new THREE.MeshStandardMaterial({
      color: srcColor.clone(), roughness: 0.8, metalness: 0.1,
      emissive: srcColor.clone().multiplyScalar(0.1),
    }));
    // O'lcham FAQAT scale orqali — geometriya saqlanmaydi
    const k = s / kind.base;
    frag.scale.set(k * (0.8 + Math.random() * 0.4),
                   k * (0.6 + Math.random() * 0.4),
                   k * (0.7 + Math.random() * 0.4));
    frag.position.copy(obj.position).add(new THREE.Vector3(
      (Math.random() - .5) * 0.6, Math.random() * 0.5, (Math.random() - .5) * 0.6
    ));
    frag.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    frag.castShadow = true;
    // ⚠ Sinmaguncha KO'RINMAYDI. Papkaning `visible=false` i yetarli
    //   emas: ⏱ timeline parchalarni birma-bir yoqadi va ularning
    //   O'Z bayrog'i to'g'ri boshlanishi kerak.
    frag.visible = false;

    frag.userData = {
      id: ++objIdC, name: `Parcha ${i + 1}`, type: kind.type,
      physMode: 'solid', parentId: folder.userData.id, children: [],
      isFragment: true, fragOf: srcName,
      // ── 👻 O'YINCHI UCHUN INLINE, QOLGAN YERDA ODATDAGIDEK ────
      //  ⚠ MUAMMO: o'nlab mayda siniq o'yinchining oyog'i ostida
      //    to'planadi. Ular `player.js` ning to'qnashuv siklida
      //    qatnashsa, qahramon ular ustiga chiqib qolar, qaltirar
      //    yoki tor joyda umuman qimirlolmasdi.
      //
      //  ⚠ NEGA AYNAN `colliderMode`: uni FAQAT o'yinchi to'qnashuvi
      //    o'qiydi (`player.js` sikli va `car.js`). Rapier'даги
      //    jism-jism fizikasi bunga QARAMAYDI — ya'ni parcha yerga,
      //    devorga va boshqa jismlarga AVVALGIDEK uriladi va
      //    ulardan sakraydi. Agar o'sha devorning o'zi 👻 inline
      //    bo'lsa — parcha undan ham o'tib ketadi, bu kutilgan xulq.
      //
      //  Aynan shu naqsh 🔫 gravity gun ko'targan jism uchun
      //  ishlatilgan (`gravity-gun.js` izohiga qarang).
      colliderMode: 'inline',
      // ⚠ `_` SIZ — ikkovi ham SAQLANADI. Aks holda sahna qayta
      //   ochilganda parchani boshlang'ich joyiga qaytarib ham,
      //   uchirib yuborib ham bo'lmasdi.
      fragHome: { p: frag.position.toArray(), r: [frag.rotation.x, frag.rotation.y, frag.rotation.z] },
      fragVel: {
        v: [(Math.random() - .5) * 6 * str, 2 + Math.random() * 4 * str, (Math.random() - .5) * 6 * str],
        a: [(Math.random() - .5) * 4, (Math.random() - .5) * 4, (Math.random() - .5) * 4],
        r: 0.3 + Math.random() * 0.4, rad: s,
      },
    };
    // ⚠ `add`, `attach` EMAS: pozitsiya allaqachon dunyo fazosida
    //   hisoblangan, papka esa nol nuqtada — lokal ≡ dunyo.
    folder.add(frag);
    folder.userData.children.push(frag.userData.id);
    objects.push(frag);
    // ⚠ Fizika tanasi HOZIR berilmaydi: sinmagan parchalar ko'rinmas
    //   holda yerga qulab ketardi. U `BreakTimeline.set(obj,true)` da
    //   beriladi.
  }

  obj.userData.breakFolderId = folder.userData.id;
  obj.userData.broken = false;
  return folder;
}

// ============================================================
//  ⏱ BreakTimeline — sinish holatini yoqadi/o'chiradi
//
//  Timeline `brk` kaliti shu yerga keladi:
//      brk = 0  → butun (parchalar yashirin, boshlang'ich joyida)
//      brk = 1  → siniq (obyekt yashirin, parchalar uchadi)
//
//  ⚠ QADAMLI, silliq emas: obyekt "yarim siniq" bo'lolmaydi.
//    `lerp` da bu 💡 chiroqning yoniq/o'chiq holati bilan bir xil
//    qoidaga bo'ysunadi.
// ============================================================
window.BreakTimeline = (() => {
  'use strict';

  function _folderOf(obj) {
    const id = obj && obj.userData && obj.userData.breakFolderId;
    if (id == null) return null;
    return objects.find(o => o.userData && o.userData.id === id) || null;
  }
  const _fragsOf = f => (f && f.children ? f.children.filter(c => c.userData && c.userData.isFragment) : []);

  /**
   * Holatni QO'LLAYDI.
   * @param {boolean} broken
   * @param {boolean} launch  parchalarga boshlang'ich tezlik berilsinmi
   *   (`false` — sahna yuklangandan keyin: ular allaqachon uchib bo'lgan,
   *    ularni qayta otib yuborish kerak emas)
   */
  function _apply(obj, broken, launch) {
    const folder = _folderOf(obj);
    if (!folder) return false;

    obj.visible = !broken;
    folder.visible = broken;

    for (const frag of _fragsOf(folder)) {
      frag.visible = broken;
      const fv = frag.userData.fragVel || {};
      if (broken) {
        let b = physBodies.find(x => x.mesh === frag);
        if (!b) b = addPhysicsBody(frag, { radius: fv.rad || 0.2, restitution: fv.r ?? 0.4 });
        if (b && launch && fv.v) {
          b.vel.set(fv.v[0], fv.v[1], fv.v[2]);
          b.angVel.set(fv.a[0], fv.a[1], fv.a[2]);
          // ── ⚠ RAPIER TANASIGA HAM YOZAMIZ ───────────────────────
          //  `addPhysicsBody` Rapier tayyor bo'lsa jismni DARHOL
          //  yasaydi — ya'ni yuqoridagi `b.vel` dan OLDIN. `b.vel`
          //  esa faqat zaxira (Rapier'siz) integratorga ta'sir
          //  qiladi. Natijada Rapier yoqilganda parchalar UMUMAN
          //  otilmasdi — bir joyda qotib turardi.
          //  Aynan shu naqsh 🎯 hitbox va 🔘 tugmaning teleportida
          //  ishlatilgan (`hitbox.js` ga qarang).
          if (typeof rapierBodies !== 'undefined') {
            const rb = rapierBodies.get(frag);
            if (rb && rb.rigidBody) {
              try {
                rb.rigidBody.setLinvel({ x: fv.v[0], y: fv.v[1], z: fv.v[2] }, true);
                if (rb.rigidBody.setAngvel) rb.rigidBody.setAngvel({ x: fv.a[0], y: fv.a[1], z: fv.a[2] }, true);
                rb.rigidBody.wakeUp && rb.rigidBody.wakeUp();
              } catch (e) {}
            }
          }
          // ── ⚠ \"UCHDI\" DEB FAQAT O'YIN KETAYOTGANDA BELGILAYMIZ ──
          //  MUHARRIRDA FIZIKA ISHLAMAYDI. 💢 tugmasi bosilganda
          //  parchalar yasaladi va ularga tezlik beriladi, lekin
          //  hech qayoqqa uchmaydi — ular kubning ICHIDA turaveradi.
          //  Foydalanuvchi shu holatda saqlaydi.
          //
          //  Agar shu paytda ularni \"uchgan\" deb belgilasak,
          //  `game.zip` da ular yana o'sha joyda — kub ichida —
          //  qimirlamay turardi. Aynan shu alomat kuzatilgan.
          //
          //  `isPlaying` yolg'on bo'lsa bayroq QO'YILMAYDI, ya'ni
          //  o'yin boshlanganda `sync()` ularni haqiqatan uchiradi.
          if (typeof isPlaying !== 'undefined' && isPlaying) {
            frag.userData.fragLaunched = true;
          }
        }
      } else {
        // ↺ Boshlang'ich joyiga — fizika tanasi OLINADI, aks holda
        //   parcha ko'rinmas holda qulashda davom etardi.
        const i = physBodies.findIndex(x => x.mesh === frag);
        if (i > -1) physBodies.splice(i, 1);
        if (typeof removeRapierBody === 'function') { try { removeRapierBody(frag); } catch (e) {} }
        const h = frag.userData.fragHome;
        if (h) { frag.position.fromArray(h.p); frag.rotation.set(h.r[0], h.r[1], h.r[2]); }
      }
    }
    obj.userData.broken = broken;
    obj.userData._brkSynced = broken;
    return true;
  }

  /** ⏱ Timeline / 💢 tugma chaqiradi — o'zgargandagina ishlaydi. */
  function set(obj, broken) {
    broken = !!broken;
    if (obj && obj.userData && obj.userData.broken === broken &&
        obj.userData._brkSynced === broken) return true;   // o'zgarish yo'q
    return _apply(obj, broken, true);
  }

  // ============================================================
  //  ⏱ sync — sahna YUKLANGANDAN keyin holatni tiklaydi
  //
  //  ⚠ ALOMAT: `game.zip` da singan obyektning parchalari BIR
  //    JOYDA QOTIB turardi. Sabab: parcha `SceneTypes` da
  //    `physics: null` — yuklovchi unga tana BERMAYDI (bu ataylab:
  //    hali sinmagan yashirin parchalar ko'rinmas holda qulab
  //    ketmasin). Lekin allaqachon SINGAN sahnada ham tana
  //    yasalmasdi, `set()` esa `broken` allaqachon `true` bo'lgani
  //    uchun darhol chiqib ketardi.
  //
  //  ⚠ `launch = false`: parchalar allaqachon uchib bo'lgan va
  //    saqlangan joyida yotibdi. Ularni qayta otib yuborsak, sahna
  //    har ochilganda portlab ketardi.
  //
  //  ⚠ Polling — ◈ Pivot va 🔨 Deform bilan bir xil sabab: obyekt
  //    sahnaga to'rt yo'l bilan tushadi (`loadScene`, 📦 prefab,
  //    🗺 Map Loader, 🧩 addon). `_brkSynced` bilan qo'riqlangani
  //    uchun odatdagi kadrda hech qanday ish bajarilmaydi.
  // ============================================================
  function sync() {
    let n = 0;
    for (const o of objects) {
      const ud = o && o.userData;
      if (!ud || ud.breakFolderId == null) continue;
      const want = !!ud.broken;
      if (ud._brkSynced === want) continue;
      // ── ⚠ HALI UCHMAGAN PARCHALARNI UCHIRAMIZ ──────────────────
      //  Muharrirda fizika ishlamaydi: 💢 bosilganda parchalar
      //  yasaladi, lekin kubning ICHIDA turaveradi. O'yin
      //  boshlanganda ular haqiqatan otilishi kerak.
      //
      //  Allaqachon uchib bo'lganlarda (`fragLaunched`) tezlik
      //  BERILMAYDI — aks holda sahna har ochilganda portlab
      //  ketardi.
      const folder = _folderOf(o);
      const kids = _fragsOf(folder);
      const launch = want && kids.length > 0 && !kids.every(f => f.userData.fragLaunched);
      if (_apply(o, want, launch)) n++;
    }
    return n;
  }

  let _t = 0;
  function update(delta) {
    _t += (delta || 0.016);
    if (_t < 0.5) return;
    _t = 0;
    sync();
  }

  /** Timeline keyframe uchun joriy holat (0/1) yoki `undefined`. */
  function capture(obj) {
    if (!obj || !obj.userData || obj.userData.breakFolderId == null) return undefined;
    return obj.userData.broken ? 1 : 0;
  }

  return { set, sync, update, capture, prepare: prepareBreak, folderOf: _folderOf };
})();

/**
 * 💥 Darhol sindirish (inspektordagi 💢 tugmasi).
 * Parchalarni tayyorlaydi va shu zahoti uchiradi.
 */
function breakObject(obj, str = 1) {
  const folder = prepareBreak(obj, str);
  if (!folder) return;
  BreakTimeline.set(obj, true);
  if (outlineMesh) { scene.remove(outlineMesh); outlineMesh = null; }
  selectedObj = null;
  updateHierarchy(); updateInspector(); updateStats();
  playImpactSound(str);
  const n = folder.userData.children.length;
  log(`💥 ${obj.userData.name} parchalandi! (${n} parcha → "${folder.userData.name}")`, 'lok');
  log(`   ⏱ Obyekt o'chirilmadi — yashirildi. Timelineda "brk" kaliti bilan qaytariladi.`, 'lw');
}
