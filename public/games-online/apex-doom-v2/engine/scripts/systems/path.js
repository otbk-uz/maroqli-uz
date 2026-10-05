// ============================================================
// 🛤 PATH SYSTEM — spline yo'l tizimi  (BOSQICH 1: POYDEVOR)
// ------------------------------------------------------------
//  Sahnaga bosib nuqta qo'yasiz, nuqtalar chiziq/egri bilan
//  bog'lanadi. Istalgan obyektni yo'lga biriktirib qo'yish mumkin —
//  u yo'l bo'ylab silliq harakatlanadi.
//
//  Path = THREE.Group (userData.isPath). Gizmo — uning bolasi,
//  lekin objects[] ga qo'shilmaydi → hierarchy/inspector uni
//  alohida obyekt deb ko'rmaydi, faqat editor ko'rsatkichi.
//
//  Keyingi bosqichlar shu poydevor ustiga quriladi:
//    2) tilt / surface carry / model skin
//    3) wagon coupling (poyezd)
//    4) sub-path / junction / in-game render
//    5) qo'lda boshqaruv (W/S/Space + parol)
// ============================================================

const PathSystem = (() => {

  const DOT_R    = 0.16;      // nuqta shari radiusi
  const SAMPLES  = 200;       // chiziqni chizish uchun namunalar

  // ── Standart sozlamalar ─────────────────────────────────────
  function defaults() {
    return {
      isPath:      true,
      points:      [],            // [{x,y,z}, ...]
      curveType:   'catmullrom',  // 'linear' | 'catmullrom' | 'bezier'
      smoothness:  0.5,           // 0 = o'tkir burchak, 1 = to'liq silliq
      closed:      false,

      // Editor gizmo
      showGizmo:   true,
      pathColor:   'var(--accent3)',
      pointNumbers:true,

      // Harakat
      attachedId:  null,          // qaysi obyekt yo'l bo'ylab yuradi
      speed:       2.0,           // birlik/soniya
      loopMode:    'loop',        // 'once' | 'loop' | 'pingpong'
      rotFollow:   true,          // yo'nalishga qarab burilsinmi
      trigger:     'auto',        // 'auto' | 'onTrigger'

      colliderMode:'inline',

      // 🧱 SHAKL (material) — yo'l bo'ylab hosil bo'ladigan jism
      shapeOn:      false,       // material tugmasi — o'chirsa ham bo'ladi
      shapeWidth:   2.0,         // kenglik (yo'lga ko'ndalang)
      shapeThick:   0.3,         // qalinlik (vertikal)
      shapeLength:  1.0,         // uzunlik — yo'lning qancha qismini qoplaydi (0..1)
      shapeOffsetY: 0.0,         // vertikal siljish
      shapeSegs:    120,         // silliqlik (segmentlar soni)
      shapeColor:   '#8899aa',
      shapeOpacity: 1.0,
      shapeCollider:'block',     // 'block' | 'inline'

      // 🖼 TEKSTURA
      shapeTexB64:   null,       // rasm (data URL)
      shapeTexName:  null,
      shapeTexMode:  'tile',     // 'tile' (loop) | 'stretch' (cho'zish)
      shapeTexSize:  4.0,        // tile: har necha metrda takrorlansin
      shapeTexAcross:1,          // tile: kenglik bo'ylab necha marta
      shapeTexRot:   0,          // burish (gradus)
      shapeTexFlipY: false,
    };
  }

  // ── 🖼 Teksturani shaklga qo'llash ──────────────────────────
  //  UV normallashtirilgan (V: 0..1 yo'l bo'ylab, U: 0..1 kenglik bo'ylab).
  //  Tile/stretch farqi repeat orqali beriladi — geometriyani qayta
  //  qurish shart emas, shuning uchun slider surilganda darhol yangilanadi.
  function applyShapeTex(path) {
    const ud = path.userData;
    const mesh = ud._shape;
    if (!mesh) return;
    const mat = mesh.material;

    if (!ud.shapeTexB64) {
      if (mat.map) { mat.map.dispose(); mat.map = null; mat.needsUpdate = true; }
      return;
    }

    const setup = (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

      const arc = (ud._len || 1) * Math.max(0.01, ud.shapeLength ?? 1);
      if ((ud.shapeTexMode || 'tile') === 'tile') {
        // 🔁 LOOP — har `shapeTexSize` metrda bir marta takrorlanadi.
        // Yo'l uzunligi o'zgarsa ham tekstura o'lchami bir xil qoladi.
        const size = Math.max(0.05, ud.shapeTexSize ?? 4);
        tex.repeat.set(Math.max(0.01, ud.shapeTexAcross ?? 1), arc / size);
      } else {
        // ↔ STRETCH — butun yo'lga bir marta cho'ziladi
        tex.repeat.set(1, 1);
      }

      // 🔄 Burish — markaz atrofida
      tex.center.set(0.5, 0.5);
      tex.rotation = (ud.shapeTexRot || 0) * Math.PI / 180;
      tex.flipY = ud.shapeTexFlipY !== false ? true : false;
      tex.anisotropy = 8;
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      else if ('encoding' in tex && THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
      tex.needsUpdate = true;
      mat.map = tex;
      mat.needsUpdate = true;
    };

    // Bir xil rasm bo'lsa — qayta yuklamaymiz, faqat repeat/rotation yangilanadi
    if (mat.map && ud._texSrc === ud.shapeTexB64) { setup(mat.map); return; }
    const tex = new THREE.TextureLoader().load(ud.shapeTexB64, t => setup(t));
    ud._texSrc = ud.shapeTexB64;
    setup(tex);
  }

  // ── Egri chiziq qurish ──────────────────────────────────────
  //  THREE r128 da CatmullRomCurve3 va CubicBezierCurve3 bor.
  function buildCurve(ud) {
    const pts = (ud.points || []).map(p => new THREE.Vector3(p.x, p.y, p.z));
    if (pts.length < 2) return null;

    const type = ud.curveType || 'catmullrom';

    if (type === 'linear') {
      const c = new THREE.CatmullRomCurve3(pts, !!ud.closed, 'catmullrom', 0);
      c.curveType = 'catmullrom'; c.tension = 0;   // tension=0 → deyarli to'g'ri
      return c;
    }

    if (type === 'bezier') {
      // Har segment uchun avtomatik tutqich: qo'shni nuqtalar yo'nalishida.
      // smoothness tutqich uzunligini boshqaradi.
      const cur = new THREE.CurvePath();
      const k = Math.max(0, Math.min(1, ud.smoothness ?? 0.5)) * 0.5;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i], p2 = pts[i + 1];
        const p3 = pts[i + 2] || pts[i + 1];
        const h1 = p1.clone().add(p2.clone().sub(p0).multiplyScalar(k));
        const h2 = p2.clone().sub(p3.clone().sub(p1).multiplyScalar(k));
        cur.add(new THREE.CubicBezierCurve3(p1, h1, h2, p2));
      }
      return cur;
    }

    // catmullrom — smoothness → tension
    const c = new THREE.CatmullRomCurve3(pts, !!ud.closed, 'catmullrom',
      Math.max(0.001, Math.min(1, ud.smoothness ?? 0.5)));
    return c;
  }

  // ── Raqam yorlig'i (sprite) ─────────────────────────────────
  function makeNumber(n, color) {
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.75)';
    g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
    g.strokeStyle = color; g.lineWidth = 4; g.stroke();
    g.fillStyle = color;
    g.font = '700 34px "Share Tech Mono", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n), 32, 34);
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, depthTest: false, transparent: true, sizeAttenuation: true }));
    sp.scale.set(0.5, 0.5, 0.5);
    sp.renderOrder = 999;
    return sp;
  }

  // ── Gizmo qayta qurish ──────────────────────────────────────
  function rebuild(path) {
    if (!path || !path.userData || !path.userData.isPath) return;
    const ud = path.userData;

    // Eski gizmoni tozalash
    if (ud._giz) {
      path.remove(ud._giz);
      ud._giz.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      });
    }
    const giz = new THREE.Group();
    giz.userData._pathGizmo = true;
    ud._giz  = giz;
    ud._dots = [];
    path.add(giz);

    const col = new THREE.Color(ud.pathColor || 'var(--accent3)');
    ud._curve = buildCurve(ud);

    // 1) Chiziq
    if (ud._curve) {
      const pts = ud._curve.getPoints(SAMPLES);
      const lg  = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({
        color: col, transparent: true, opacity: 0.95, depthTest: false }));
      line.renderOrder = 998;
      line.raycast = () => {};             // chiziq tanlanmasin
      giz.add(line);
      ud._len = ud._curve.getLength();
    } else {
      ud._len = 0;
    }

    // 2) Nuqta sharlari + raqamlar
    (ud.points || []).forEach((p, i) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(DOT_R, 12, 12),
        new THREE.MeshBasicMaterial({ color: col, depthTest: false }));
      dot.position.set(p.x, p.y, p.z);
      dot.renderOrder = 999;
      dot.userData._pathDot = true;
      dot.userData._pathRef = path;
      dot.userData._idx = i;
      giz.add(dot);
      ud._dots.push(dot);

      if (ud.pointNumbers) {
        const sp = makeNumber(i + 1, '#' + col.getHexString());
        sp.position.set(p.x, p.y + 0.42, p.z);
        sp.raycast = () => {};
        giz.add(sp);
      }
    });

    giz.visible = !!ud.showGizmo && !(typeof isPlaying !== 'undefined' && isPlaying);

    // 🧱 Shakl ham yo'l bilan birga yangilanadi
    buildShape(path);
  }

  // ── 🧱 SHAKL QURISH ─────────────────────────────────────────
  //  Yo'l bo'ylab quti kesimli jism (yo'l, ko'prik, devor, rels).
  //
  //  Frenet frame ISHLATILMAYDI — u egrilikda "aylanib" ketadi va
  //  yo'l qiyshayadi. O'rniga har namunada:
  //     right = tangent × worldUp,  up = right × tangent
  //  Bu yo'lni gorizontal ushlab turadi (banking 2-bosqichda).
  //
  //  Kolayder: egri jismga BITTA AABB berib bo'lmaydi (ulkan quti chiqadi).
  //  Shuning uchun har segment uchun alohida OBB (burchakli quti)
  //  saqlanadi — player.js ularni segment-segment tekshiradi.
  const _WUP = new THREE.Vector3(0, 1, 0);

  function buildShape(path) {
    const ud = path.userData;

    // Eskisini tozalash
    if (ud._shape) {
      const oi = objects.indexOf(ud._shape);
      if (oi > -1) objects.splice(oi, 1);
      path.remove(ud._shape);
      if (ud._shape.geometry) ud._shape.geometry.dispose();
      if (ud._shape.material) ud._shape.material.dispose();
      ud._shape = null;
    }
    ud._segs = null;
    if (!ud.shapeOn || !ud._curve || ud._len <= 0) {
      if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
      return;
    }

    const N    = Math.max(2, Math.min(400, ud.shapeSegs || 120));
    const frac = Math.max(0.01, Math.min(1, ud.shapeLength ?? 1));
    const hw   = Math.max(0.01, (ud.shapeWidth ?? 2) / 2);
    const hh   = Math.max(0.01, (ud.shapeThick ?? 0.3) / 2);
    const oy   = ud.shapeOffsetY || 0;

    const pos = [], uv = [], idx = [];
    const rings = [];   // {c, right, up, tan}
    const segs  = [];

    for (let i = 0; i <= N; i++) {
      const t = (i / N) * frac;
      const c = ud._curve.getPointAt(t).clone();
      c.y += oy;
      const tan = ud._curve.getTangentAt(t).clone().normalize();

      // ⚠ MUHIM: bazis O'NG QO'LLI bo'lishi SHART (right × up = tan).
      // Aks holda makeBasis() aks ettirish matritsasini beradi (det = -1) va
      // setFromRotationMatrix() undan axlat quaternion chiqaradi —
      // o'yinchi ko'prik ustida turolmay, ichiga tushib ketadi.
      //   right = worldUp × tan   (tan × worldUp EMAS!)
      //   up    = tan × right
      let right = new THREE.Vector3().crossVectors(_WUP, tan);
      if (right.lengthSq() < 1e-6) right.set(0, 0, -1);   // tik yo'l — zaxira o'q
      right.normalize();
      const up = new THREE.Vector3().crossVectors(tan, right).normalize();

      rings.push({ c, right, up, tan });

      // 4 burchak: 0=yuqori-chap 1=yuqori-o'ng 2=past-o'ng 3=past-chap
      const corners = [
        c.clone().addScaledVector(right, -hw).addScaledVector(up,  hh),
        c.clone().addScaledVector(right,  hw).addScaledVector(up,  hh),
        c.clone().addScaledVector(right,  hw).addScaledVector(up, -hh),
        c.clone().addScaledVector(right, -hw).addScaledVector(up, -hh),
      ];
      corners.forEach(v => pos.push(v.x, v.y, v.z));
      // UV normallashtirilgan: V = 0..1 yo'l bo'ylab, U = 0..1 kenglik bo'ylab.
      // Tile/stretch tex.repeat orqali beriladi (geometriya o'zgarmaydi).
      const v = i / N;
      uv.push(0, v, 1, v, 1, v, 0, v);
    }

    // Yon yuzalar
    for (let i = 0; i < N; i++) {
      const a = i * 4, b = (i + 1) * 4;
      const quad = (p, q, r, t) => idx.push(p, q, r, p, r, t);
      quad(a + 0, a + 1, b + 1, b + 0);   // ustki
      quad(a + 1, a + 2, b + 2, b + 1);   // o'ng
      quad(a + 2, a + 3, b + 3, b + 2);   // pastki
      quad(a + 3, a + 0, b + 0, b + 3);   // chap

      // ── Segment OBB (kolayder uchun) ──
      const r0 = rings[i], r1 = rings[i + 1];
      const mid = r0.c.clone().add(r1.c).multiplyScalar(0.5);
      const len = r0.c.distanceTo(r1.c);
      if (len > 1e-5) {
        const m = new THREE.Matrix4().makeBasis(r0.right, r0.up, r0.tan);
        segs.push({
          c: mid, q: new THREE.Quaternion().setFromRotationMatrix(m),
          h: { x: hw, y: hh, z: len / 2 + 0.02 },   // ozgina ustma-ust — teshik qolmasin
        });
      }
    }
    // Uchlarni yopish
    idx.push(0, 2, 1, 0, 3, 2);
    const L = N * 4;
    idx.push(L + 0, L + 1, L + 2, L + 0, L + 2, L + 3);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();

    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      color: new THREE.Color(ud.shapeColor || '#8899aa'),
      roughness: 0.85, metalness: 0.05,
      transparent: (ud.shapeOpacity ?? 1) < 1,
      opacity: ud.shapeOpacity ?? 1,
      side: THREE.DoubleSide,
    }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = {
      id: ++objIdC, name: (ud.name || 'Yo\'l') + ' — shakl', type: 'PathShape',
      isPathShape: true, _pathId: ud.id, _pathShapeHide: true,
      colliderMode: ud.shapeCollider || 'block',
      platformMode: 'off',
    };
    path.add(mesh);
    objects.push(mesh);          // ← collision loop ko'rishi uchun SHART
    ud._shape = mesh;
    ud._segs  = segs;
    ud._texSrc = null;           // yangi mesh — teksturani qayta bog'laymiz
    applyShapeTex(path);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    return mesh;
  }

  // ── Yaratish ────────────────────────────────────────────────
  function create() {
    const g = new THREE.Group();
    g.userData = Object.assign({ id: ++objIdC, name: 'Yo\'l ' + objIdC, type: 'Path' }, defaults());
    scene.add(g);
    objects.push(g);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    rebuild(g);
    updateHierarchy(); updateStats(); selectObject(g);
    log('🛤 Yo\'l qo\'shildi — "➕ Nuqta qo\'shish" bosib sahnaga bosing', 'lok');
    return g;
  }

  // ── Nuqta amallari ──────────────────────────────────────────
  function addPoint(path, v, atIdx) {
    const ud = path.userData;
    ud.points = ud.points || [];
    const p = { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
    if (atIdx === undefined || atIdx < 0 || atIdx >= ud.points.length) ud.points.push(p);
    else ud.points.splice(atIdx, 0, p);
    rebuild(path);
    return p;
  }

  function removePoint(path, i) {
    const ud = path.userData;
    if (!ud.points || i < 0 || i >= ud.points.length) return;
    ud.points.splice(i, 1);
    rebuild(path);
  }

  function movePoint(path, i, v) {
    const ud = path.userData;
    if (!ud.points || !ud.points[i]) return;
    ud.points[i] = { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
    rebuild(path);
  }

  //  Segment ustiga bosilganda o'rtaga nuqta qo'shish
  function insertOnSegment(path, worldPt) {
    const ud = path.userData;
    if (!ud.points || ud.points.length < 2) { addPoint(path, worldPt); return; }
    // Eng yaqin segmentni topamiz
    let best = 1, bd = Infinity;
    for (let i = 0; i < ud.points.length - 1; i++) {
      const a = new THREE.Vector3(ud.points[i].x, ud.points[i].y, ud.points[i].z);
      const b = new THREE.Vector3(ud.points[i+1].x, ud.points[i+1].y, ud.points[i+1].z);
      const ab = b.clone().sub(a);
      const t  = Math.max(0, Math.min(1, worldPt.clone().sub(a).dot(ab) / (ab.lengthSq() || 1)));
      const d  = a.clone().addScaledVector(ab, t).distanceTo(worldPt);
      if (d < bd) { bd = d; best = i + 1; }
    }
    addPoint(path, worldPt, best);
    log(`🛤 Nuqta ${best + 1}-o'ringa qo'shildi`, 'lok');
  }

  function duplicatePoint(path, i) {
    const ud = path.userData;
    if (!ud.points || !ud.points[i]) return;
    const p = ud.points[i];
    addPoint(path, new THREE.Vector3(p.x + 0.5, p.y, p.z + 0.5), i + 1);
    log('🛤 Nuqta nusxalandi', 'lok');
  }

  // ── Yo'l bo'ylab pozitsiya/yo'nalish ────────────────────────
  //  t: 0..1
  function sample(path, t) {
    const ud = path.userData;
    if (!ud._curve) return null;
    t = Math.max(0, Math.min(1, t));
    const pos = ud._curve.getPointAt(t);
    const tan = ud._curve.getTangentAt(t);
    return { pos, tan };
  }

  // ── Play boshlanishi/tugashi ────────────────────────────────
  function onPlayStart() {
    objects.forEach(o => {
      const ud = o.userData;
      if (!ud || !ud.isPath) return;
      ud._t = 0; ud._dir = 1; ud._done = false;
      ud._playing = (ud.trigger || 'auto') === 'auto';
      // 🎯 Trigger rejimida — obyekt yo'l boshida kutib turadi
      if (!ud._playing) {
        const s0 = sample(o, 0), a0 = getAttached(o);
        if (s0 && a0) a0.position.copy(s0.pos);
      }
      if (ud._giz) ud._giz.visible = false;
      // Biriktirilgan obyektning boshlang'ich holatini eslab qolamiz
      const a = getAttached(o);
      if (a) ud._origPose = {
        p: a.position.clone(), q: a.quaternion.clone(),
      };
    });
  }

  function onPlayStop() {
    objects.forEach(o => {
      const ud = o.userData;
      if (!ud || !ud.isPath) return;
      ud._playing = false; ud._t = 0; ud._dir = 1;
      if (ud._giz) ud._giz.visible = !!ud.showGizmo;
      const a = getAttached(o);
      if (a && ud._origPose) {
        a.position.copy(ud._origPose.p);
        a.quaternion.copy(ud._origPose.q);
      }
    });
  }

  function getAttached(path) {
    const id = path.userData.attachedId;
    if (id == null) return null;
    return objects.find(o => String(o.userData && o.userData.id) === String(id)) || null;
  }

  // ── Ishga tushirish (hitbox / tugma / script uchun) ─────────
  function play(path)  {
    if (!path || !path.userData.isPath) return;
    const ud = path.userData;
    // 'once' tugagan bo'lsa — qaytadan boshlaymiz
    if (ud._done && (ud.loopMode || 'loop') === 'once') { ud._t = 0; ud._dir = 1; ud._done = false; }
    ud._playing = true;
  }
  function stop(path)  { if (path && path.userData.isPath) path.userData._playing = false; }
  function reset(path) {
    if (!path || !path.userData.isPath) return;
    const ud = path.userData;
    ud._t = 0; ud._dir = 1; ud._done = false;
    // Obyektni darhol boshiga qo'yamiz (Play kutmasdan ko'rinsin)
    const s = sample(path, 0), obj = getAttached(path);
    if (s && obj) obj.position.copy(s.pos);
  }
  function toggle(path)  { if (path && path.userData.isPath) (path.userData._playing ? stop : play)(path); }
  function reverse(path) {
    if (!path || !path.userData.isPath) return;
    path.userData._dir = (path.userData._dir || 1) * -1;
    play(path);
  }

  // ── Nomi bo'yicha bajarish — hitbox/tugma shuni chaqiradi ───
  function fire(pathId, action) {
    const path = objects.find(o => String(o.userData && o.userData.id) === String(pathId));
    if (!path || !path.userData.isPath) { log('⚠ Yo\'l topilmadi (id: ' + pathId + ')', 'lw'); return; }
    switch (action) {
      case 'stop':    stop(path);    break;
      case 'reset':   reset(path);   break;
      case 'toggle':  toggle(path);  break;
      case 'reverse': reverse(path); break;
      case 'restart': reset(path); play(path); break;
      default:        play(path);
    }
    return path;
  }

  // ── Har frame ───────────────────────────────────────────────
  const _up = new THREE.Vector3(0, 1, 0);
  const _m  = new THREE.Matrix4();

  let _wasPlaying = false;

  function update(delta) {
    if (typeof objects === 'undefined') return;
    const playing = (typeof isPlaying !== 'undefined') && isPlaying;

    // ── Play boshlandi/tugadi — chekka aniqlash (hitbox.js naqshi) ──
    if (playing && !_wasPlaying)       onPlayStart();
    else if (!playing && _wasPlaying)  onPlayStop();
    _wasPlaying = playing;

    for (let i = 0; i < objects.length; i++) {
      const path = objects[i];
      const ud = path.userData;
      if (!ud || !ud.isPath) continue;

      // Gizmo — o'yin paytida ko'rinmaydi (dev-only)
      if (ud._giz) ud._giz.visible = !!ud.showGizmo && !playing;

      if (!playing || !ud._playing || !ud._curve || ud._len <= 0) continue;

      const obj = getAttached(path);
      if (!obj) continue;

      // t ni siljitamiz — tezlik birlik/soniya, shuning uchun uzunlikka bo'lamiz
      const dt = (ud.speed || 0) * delta / ud._len;
      ud._t += dt * (ud._dir || 1);

      const mode = ud.loopMode || 'loop';
      if (mode === 'loop') {
        if (ud._t > 1) ud._t -= 1;
        if (ud._t < 0) ud._t += 1;
      } else if (mode === 'pingpong') {
        if (ud._t > 1) { ud._t = 1; ud._dir = -1; }
        if (ud._t < 0) { ud._t = 0; ud._dir =  1; }
      } else { // once
        if (ud._t >= 1) { ud._t = 1; ud._playing = false; ud._done = true; }
        if (ud._t <= 0 && ud._dir < 0) { ud._t = 0; ud._playing = false; }
      }

      const s = sample(path, ud._t);
      if (!s) continue;

      // Yo'l Group ichida bo'lsa — lokal → world
      let wp = s.pos.clone();
      if (path.parent && path.parent !== scene) {
        path.updateMatrixWorld(true);
        wp.applyMatrix4(path.matrixWorld);
      }
      obj.position.copy(wp);

      // Yo'nalishga qarab burilish
      if (ud.rotFollow) {
        const dir = s.tan.clone().multiplyScalar(ud._dir < 0 ? -1 : 1);
        if (dir.lengthSq() > 1e-8) {
          const look = wp.clone().add(dir);
          _m.lookAt(wp, look, _up);
          obj.quaternion.setFromRotationMatrix(_m);
        }
      }
      obj.updateMatrix();
      obj.matrixWorldNeedsUpdate = true;
    }
  }

  return {
    create, rebuild, defaults, buildCurve, buildShape, applyShapeTex,
    addPoint, removePoint, movePoint, insertOnSegment, duplicatePoint,
    sample, getAttached, update, onPlayStart, onPlayStop,
    play, stop, reset, toggle, reverse, fire,
  };
})();

window.PathSystem = PathSystem;
window.addPath = () => PathSystem.create();

// ── Nuqta qo'yish rejimi ──────────────────────────────────────
window._pathPickMode = null;   // null | 'add' | 'insert'

window._pathStartPick = function (mode) {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  window._pathPickMode = (window._pathPickMode === mode) ? null : mode;
  const cv = document.getElementById('three-canvas');
  if (cv) cv.style.cursor = window._pathPickMode ? 'crosshair' : '';
  log(window._pathPickMode
    ? (mode === 'add' ? '🛤 Sahnaga bosing — nuqta qo\'shiladi (ESC = chiqish)'
                      : '🛤 Chiziq ustiga bosing — o\'rtaga nuqta qo\'shiladi (ESC)')
    : '🛤 Nuqta qo\'yish rejimi o\'chdi', 'lw');
  updateInspector();
};

// ── Sahnaga bosish: nuqta qo'yish + nuqta tanlash ─────────────
(function () {
  const rc = new THREE.Raycaster();
  const m2 = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  function canvasPt(e, cv) {
    const r = cv.getBoundingClientRect();
    m2.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    m2.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    rc.setFromCamera(m2, camera);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const cv = document.getElementById('three-canvas');
    if (!cv) return;

    // Nuqta qo'yish — capture fazasida, orbit-controls dan OLDIN
    cv.addEventListener('click', e => {
      if (!window._pathPickMode) return;
      if (!selectedObj || !selectedObj.userData.isPath) return;
      if (typeof camMode !== 'undefined' && camMode === 'fps') return;
      e.stopPropagation(); e.preventDefault();

      canvasPt(e, cv);
      // Avval obyektlarga urinamiz (yer, platforma ustiga qo'yish uchun)
      const solid = objects.filter(o => o !== selectedObj && !o.userData.isPath && o.visible);
      const hits = rc.intersectObjects(solid, true);
      let pt;
      if (hits.length) pt = hits[0].point.clone().add(new THREE.Vector3(0, 0.05, 0));
      else {
        pt = new THREE.Vector3();
        if (!rc.ray.intersectPlane(groundPlane, pt)) return;
      }

      const path = selectedObj;
      // Yo'l Group ichida bo'lsa — world → lokal
      if (path.parent && path.parent !== scene) {
        path.updateMatrixWorld(true);
        pt.applyMatrix4(new THREE.Matrix4().copy(path.matrixWorld).invert());
      }

      if (window._pathPickMode === 'insert') PathSystem.insertOnSegment(path, pt);
      else {
        PathSystem.addPoint(path, pt);
        log(`🛤 Nuqta ${path.userData.points.length} qo'shildi`, 'lok');
      }
      updateInspector();
    }, true);
  });

  // ESC — rejimdan chiqish
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && window._pathPickMode) {
      window._pathPickMode = null;
      const cv = document.getElementById('three-canvas');
      if (cv) cv.style.cursor = '';
      log('🛤 Nuqta qo\'yish rejimi o\'chdi', 'lw');
      updateInspector();
    }
    // Ctrl+D — tanlangan nuqtani nusxalash
    if (e.key === 'd' && (e.ctrlKey || e.metaKey) && window._pathSelIdx != null &&
        selectedObj && selectedObj.userData.isPath) {
      e.preventDefault();
      PathSystem.duplicatePoint(selectedObj, window._pathSelIdx);
      updateInspector();
    }
  });
})();

// ── Inspector sozlagichlari ───────────────────────────────────
window._pathSelIdx = null;

// ── 🖼 Tekstura sozlagichlari ─────────────────────────────────
//  Faqat repeat/rotation o'zgaradi → geometriya qayta QURILMAYDI.
//  Shu sabab slider surilganda darhol yangilanadi, sekinlashmaydi.
window._pathTexSet = function (key, val) {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  selectedObj.userData[key] = val;
  PathSystem.applyShapeTex(selectedObj);
  updateInspector();
};

window._pathTexUpload = function () {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  const path = selectedObj;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      path.userData.shapeTexB64  = ev.target.result;
      path.userData.shapeTexName = file.name;
      path.userData._texSrc = null;
      if (!path.userData.shapeOn) { path.userData.shapeOn = true; PathSystem.rebuild(path); }
      else PathSystem.applyShapeTex(path);
      log(`🖼 Yo'l teksturasi: ${file.name}`, 'lok');
      updateInspector();
    };
    r.readAsDataURL(file);
  };
  inp.click();
};

window._pathTexClear = function () {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  selectedObj.userData.shapeTexB64 = null;
  selectedObj.userData.shapeTexName = null;
  selectedObj.userData._texSrc = null;
  PathSystem.applyShapeTex(selectedObj);
  log('🖼 Tekstura o\'chirildi', 'lw');
  updateInspector();
};

window._pathSet = function (key, val) {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  selectedObj.userData[key] = val;
  PathSystem.rebuild(selectedObj);
  updateInspector();
};

window._pathPtSet = function (i, axis, val) {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  const p = selectedObj.userData.points[i];
  if (!p) return;
  p[axis] = parseFloat(val) || 0;
  PathSystem.rebuild(selectedObj);
};

window._pathPtDel = function (i) {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  PathSystem.removePoint(selectedObj, i);
  window._pathSelIdx = null;
  updateInspector();
};

window._pathPtDup = function (i) {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  PathSystem.duplicatePoint(selectedObj, i);
  updateInspector();
};

window._pathPtFocus = function (i) {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  window._pathSelIdx = i;
  const p = selectedObj.userData.points[i];
  if (p && typeof camera !== 'undefined') {
    // Kamerani nuqtaga qaratamiz
    const t = new THREE.Vector3(p.x, p.y, p.z);
    if (selectedObj.parent && selectedObj.parent !== scene) {
      selectedObj.updateMatrixWorld(true);
      t.applyMatrix4(selectedObj.matrixWorld);
    }
    camera.lookAt(t);
  }
  updateInspector();
};

window._pathClear = function () {
  if (!selectedObj || !selectedObj.userData.isPath) return;
  if (!confirm('Barcha nuqtalarni o\'chirasizmi?')) return;
  selectedObj.userData.points = [];
  PathSystem.rebuild(selectedObj);
  log('🛤 Nuqtalar tozalandi', 'lw');
  updateInspector();
};

// ── INSPECTOR ─────────────────────────────────────────────────
function buildPathInspector(o) {
  const ic = document.getElementById('inspector-content');
  if (!ic) return;
  const ud  = o.userData;
  const pts = ud.points || [];
  const picking = window._pathPickMode;

  const btn = (active, on, ico, lbl, col) => `
    <button onclick="${on}" style="background:${active ? col + '26' : 'transparent'};
      border:1px solid ${active ? col : 'var(--border)'};color:${active ? col : 'var(--muted)'};
      padding:6px 3px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;
      font-size:9px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:2px">
      <span style="font-size:14px">${ico}</span><span>${lbl}</span></button>`;

  const len = ud._len ? ud._len.toFixed(2) + ' m' : '—';

  ic.innerHTML = `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:var(--accent3);color:#001">PATH</span>Yo'l</div>
      <div class="fr"><span class="fl">Nom</span>
        <input class="fv" value="${ud.name || ''}" oninput="window._renameObj(this.value)"></div>
      <div style="display:flex;gap:8px;margin-top:5px;font-size:9px;font-family:'Share Tech Mono',monospace;color:var(--muted)">
        <span>📍 <b style="color:var(--text)">${pts.length}</b> nuqta</span>
        <span>📏 <b style="color:var(--text)">${len}</b></span>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">EDIT</span>Nuqtalar</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:4px">
        ${btn(picking === 'add',    "window._pathStartPick('add')",    '➕', 'QO\'SHISH', 'var(--accent3)')}
        ${btn(picking === 'insert', "window._pathStartPick('insert')", '⤵', 'O\'RTAGA',  '#ffcc00')}
      </div>
      ${picking ? `<div style="font-size:8px;color:var(--accent3);margin-top:5px;padding:5px 7px;
          background:rgba(var(--accent3-rgb),.08);border:1px solid rgba(var(--accent3-rgb),.3);border-radius:2px;
          font-family:'Share Tech Mono',monospace;line-height:1.5">
          ⬤ Sahnaga bosing${picking === 'insert' ? ' (chiziq yaqiniga)' : ''} · <b>ESC</b> = chiqish
        </div>` : `<div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
          ➕ Oxiriga qo'shadi · ⤵ eng yaqin segment o'rtasiga · <b>Ctrl+D</b> = nusxalash
        </div>`}

      ${pts.length ? `
      <div style="max-height:190px;overflow-y:auto;margin-top:8px;display:flex;flex-direction:column;gap:3px">
        ${pts.map((p, i) => `
          <div style="display:flex;align-items:center;gap:3px;padding:3px 4px;border-radius:3px;
            background:${window._pathSelIdx === i ? 'rgba(var(--accent3-rgb),.1)' : 'rgba(255,255,255,.02)'};
            border:1px solid ${window._pathSelIdx === i ? 'rgba(var(--accent3-rgb),.4)' : 'var(--border)'}">
            <span onclick="window._pathPtFocus(${i})" style="cursor:pointer;font-size:9px;color:var(--accent3);
              font-family:'Share Tech Mono',monospace;min-width:16px;font-weight:700">${i + 1}</span>
            <input type="number" step="0.1" value="${p.x}" oninput="window._pathPtSet(${i},'x',this.value)"
              style="width:100%;min-width:0;background:rgba(0,0,0,.3);border:1px solid var(--border);color:var(--text);
              border-radius:2px;padding:2px 3px;font-size:9px;font-family:'Share Tech Mono',monospace">
            <input type="number" step="0.1" value="${p.y}" oninput="window._pathPtSet(${i},'y',this.value)"
              style="width:100%;min-width:0;background:rgba(0,0,0,.3);border:1px solid var(--border);color:var(--text);
              border-radius:2px;padding:2px 3px;font-size:9px;font-family:'Share Tech Mono',monospace">
            <input type="number" step="0.1" value="${p.z}" oninput="window._pathPtSet(${i},'z',this.value)"
              style="width:100%;min-width:0;background:rgba(0,0,0,.3);border:1px solid var(--border);color:var(--text);
              border-radius:2px;padding:2px 3px;font-size:9px;font-family:'Share Tech Mono',monospace">
            <button onclick="window._pathPtDup(${i})" title="Nusxalash" style="background:none;border:1px solid var(--border);
              color:var(--muted);font-size:9px;padding:1px 4px;border-radius:2px;cursor:pointer">⧉</button>
            <button onclick="window._pathPtDel(${i})" title="O'chirish" style="background:none;border:1px solid var(--border);
              color:var(--red);font-size:9px;padding:1px 4px;border-radius:2px;cursor:pointer">✕</button>
          </div>`).join('')}
      </div>
      <button onclick="window._pathClear()" style="width:100%;margin-top:5px;padding:5px;background:none;
        border:1px solid var(--border);color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer;
        font-family:'Share Tech Mono',monospace">🗑 Hammasini tozalash</button>
      ` : `<div style="padding:12px;font-size:9px;color:var(--border);text-align:center;font-family:'Share Tech Mono',monospace">
        Hali nuqta yo'q — ➕ QO'SHISH bosing</div>`}
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">CURVE</span>Egri Chiziq</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:4px">
        ${btn(ud.curveType === 'linear',     "window._pathSet('curveType','linear')",     '📐', 'LINEAR', '#66ccff')}
        ${btn((ud.curveType ?? 'catmullrom') === 'catmullrom', "window._pathSet('curveType','catmullrom')", '🌊', 'SILLIQ', 'var(--accent3)')}
        ${btn(ud.curveType === 'bezier',     "window._pathSet('curveType','bezier')",     '✒️', 'BEZIER', 'var(--accent4)')}
      </div>
      ${ud.curveType === 'linear' ? '' : `
      <div class="fr" style="margin-top:5px"><span class="fl">Silliqlik</span>
        <input type="range" min="0" max="1" step="0.05" value="${ud.smoothness ?? 0.5}" style="flex:1"
          oninput="window._pathSet('smoothness', parseFloat(this.value))">
        <span style="font-size:9px;color:var(--muted);min-width:24px;font-family:'Share Tech Mono',monospace">${(ud.smoothness ?? 0.5).toFixed(2)}</span>
      </div>`}
      <div class="fr"><span class="fl">Yopiq halqa</span>
        <input type="checkbox" ${ud.closed ? 'checked' : ''} onchange="window._pathSet('closed', this.checked)"></div>
      <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
        ${ud.curveType === 'linear' ? '📐 To\'g\'ri chiziqlar — o\'tkir burchaklar.'
        : ud.curveType === 'bezier' ? '✒️ Bezier — avtomatik tutqichlar, silliqlik tutqich uzunligini boshqaradi.'
        : '🌊 CatmullRom — nuqtalardan aynan o\'tadi, silliqlik = tension.'}
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title" style="cursor:pointer" onclick="window._pathSet('shapeOn', ${!ud.shapeOn})">
        <span class="tag" style="background:${ud.shapeOn ? '#ff8844' : '#2a3a4a'};color:${ud.shapeOn ? '#001' : '#5a6a7a'}">MAT</span>Shakl (Material)
        <input type="checkbox" ${ud.shapeOn ? 'checked' : ''} style="margin-left:auto;cursor:pointer"
          onclick="event.stopPropagation();window._pathSet('shapeOn', this.checked)">
      </div>
      ${!ud.shapeOn ? `<div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
        Yoqilsa — nuqtalar bo'ylab jism hosil bo'ladi: yo'l, ko'prik, devor, rels.<br>
        <span style="color:var(--border)">O'chirilsa — faqat chiziq qoladi (hozirgi holat).</span></div>`
      : pts.length < 2 ? `<div style="font-size:9px;color:#ff8844;margin-top:5px;font-family:'Share Tech Mono',monospace">
        ⚠ Kamida 2 ta nuqta kerak.</div>`
      : `
      <div class="fr" style="margin-top:4px"><span class="fl">Kenglik</span>
        <input class="fv" type="number" step="0.1" min="0.05" value="${(ud.shapeWidth ?? 2).toFixed(2)}"
          oninput="window._pathSet('shapeWidth', Math.max(0.05, parseFloat(this.value)||2))"></div>
      <div class="fr"><span class="fl">Qalinlik</span>
        <input class="fv" type="number" step="0.05" min="0.02" value="${(ud.shapeThick ?? 0.3).toFixed(2)}"
          oninput="window._pathSet('shapeThick', Math.max(0.02, parseFloat(this.value)||0.3))"></div>
      <div class="fr"><span class="fl">Uzunlik</span>
        <input type="range" min="0.02" max="1" step="0.02" value="${ud.shapeLength ?? 1}" style="flex:1"
          oninput="window._pathSet('shapeLength', parseFloat(this.value))">
        <span style="font-size:9px;color:var(--muted);min-width:32px;font-family:'Share Tech Mono',monospace">${Math.round((ud.shapeLength ?? 1)*100)}%</span></div>
      <div class="fr"><span class="fl">Vertikal siljish</span>
        <input class="fv" type="number" step="0.05" value="${(ud.shapeOffsetY ?? 0).toFixed(2)}"
          oninput="window._pathSet('shapeOffsetY', parseFloat(this.value)||0)"></div>
      <div class="fr"><span class="fl">Silliqlik</span>
        <input type="range" min="4" max="400" step="4" value="${ud.shapeSegs ?? 120}" style="flex:1"
          oninput="window._pathSet('shapeSegs', parseInt(this.value))">
        <span style="font-size:9px;color:var(--muted);min-width:32px;font-family:'Share Tech Mono',monospace">${ud.shapeSegs ?? 120}</span></div>
      <div class="fr"><span class="fl">Rang</span>
        <input type="color" value="${ud.shapeColor || '#8899aa'}" oninput="window._pathSet('shapeColor', this.value)"
          style="width:100%;height:22px;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer"></div>
      <div class="fr"><span class="fl">Shaffoflik</span>
        <input type="range" min="0.05" max="1" step="0.05" value="${ud.shapeOpacity ?? 1}" style="flex:1"
          oninput="window._pathSet('shapeOpacity', parseFloat(this.value))"></div>

      <div style="font-size:9px;color:var(--muted);margin:8px 0 3px;font-family:'Share Tech Mono',monospace">KOLAYDER</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
        ${btn((ud.shapeCollider ?? 'block') === 'block',  "window._pathSet('shapeCollider','block')",  '🧱', 'BLOCK',  '#ff8844')}
        ${btn(ud.shapeCollider === 'inline', "window._pathSet('shapeCollider','inline')", '👻', 'INLINE', '#66ccff')}
      </div>
      <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 7px;background:rgba(0,0,0,.2);border-radius:2px">
        ${(ud.shapeCollider ?? 'block') === 'block'
          ? '🧱 <b style="color:#ff8844">BLOCK</b> — qattiq. O\'yinchi ustida yuradi, ichidan o\'tolmaydi.<br><span style="color:var(--border)">Har segment alohida burchakli quti (OBB) — egri yo\'lda ham to\'g\'ri ishlaydi.</span>'
          : '👻 <b style="color:#66ccff">INLINE</b> — o\'yinchi bemalol o\'tib ketadi. Bezak uchun.'}
      </div>
      <div style="font-size:8px;color:var(--border);margin-top:5px;font-family:'Share Tech Mono',monospace">
        🧱 ${ud._segs ? ud._segs.length : 0} segment kolayder
      </div>

      <div style="font-size:9px;color:var(--muted);margin:9px 0 4px;font-family:'Share Tech Mono',monospace;
        border-top:1px solid var(--border);padding-top:7px">🖼 TEKSTURA</div>
      ${!ud.shapeTexB64 ? `
        <button onclick="window._pathTexUpload()" style="width:100%;padding:7px;
          background:rgba(102,204,255,.1);border:1px solid rgba(102,204,255,.35);color:#66ccff;
          font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;border-radius:3px;cursor:pointer">
          🖼 Rasm yuklash</button>
        <div style="font-size:8px;color:var(--border);margin-top:4px;font-family:'Share Tech Mono',monospace">
          Yo'l chizig'i, rels, g'isht, daryo yuzasi...</div>
      ` : `
        <div style="display:flex;align-items:center;gap:5px;padding:4px 6px;border-radius:3px;
          background:rgba(102,204,255,.07);border:1px solid rgba(102,204,255,.25);margin-bottom:5px">
          <span style="font-size:11px">🖼</span>
          <span style="flex:1;font-size:9px;color:#66ccff;font-family:'Share Tech Mono',monospace;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ud.shapeTexName || 'tekstura'}</span>
          <button onclick="window._pathTexUpload()" title="Almashtirish" style="background:none;border:1px solid var(--border);
            color:var(--muted);font-size:9px;padding:1px 5px;border-radius:2px;cursor:pointer">⟳</button>
          <button onclick="window._pathTexClear()" title="O'chirish" style="background:none;border:1px solid var(--border);
            color:var(--red);font-size:9px;padding:1px 5px;border-radius:2px;cursor:pointer">✕</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
          ${btn((ud.shapeTexMode ?? 'tile') === 'tile',    "window._pathTexSet('shapeTexMode','tile')",    '🔁', 'LOOP',    'var(--accent3)')}
          ${btn(ud.shapeTexMode === 'stretch', "window._pathTexSet('shapeTexMode','stretch')", '↔', "CHO'ZISH", '#ffcc00')}
        </div>

        ${(ud.shapeTexMode ?? 'tile') === 'tile' ? `
        <div class="fr" style="margin-top:5px"><span class="fl">Takror (metr)</span>
          <input class="fv" type="number" step="0.25" min="0.05" value="${(ud.shapeTexSize ?? 4).toFixed(2)}"
            oninput="window._pathTexSet('shapeTexSize', Math.max(0.05, parseFloat(this.value)||4))"></div>
        <div class="fr"><span class="fl">Kenglik bo'ylab</span>
          <input class="fv" type="number" step="1" min="1" value="${ud.shapeTexAcross ?? 1}"
            oninput="window._pathTexSet('shapeTexAcross', Math.max(1, parseInt(this.value)||1))"></div>
        ` : ''}

        <div class="fr" style="margin-top:5px"><span class="fl">Burish°</span>
          <input type="range" min="0" max="360" step="5" value="${ud.shapeTexRot ?? 0}" style="flex:1"
            oninput="window._pathTexSet('shapeTexRot', parseFloat(this.value))">
          <span style="font-size:9px;color:var(--muted);min-width:30px;font-family:'Share Tech Mono',monospace">${ud.shapeTexRot ?? 0}°</span></div>
        <div style="display:flex;gap:3px;margin-top:3px">
          ${[0,90,180,270].map(a => `<button onclick="window._pathTexSet('shapeTexRot',${a})"
            style="flex:1;padding:3px;background:${(ud.shapeTexRot??0)===a?'rgba(102,204,255,.18)':'none'};
            border:1px solid ${(ud.shapeTexRot??0)===a?'#66ccff':'var(--border)'};
            color:${(ud.shapeTexRot??0)===a?'#66ccff':'var(--muted)'};font-size:9px;border-radius:2px;cursor:pointer;
            font-family:'Share Tech Mono',monospace">${a}°</button>`).join('')}
        </div>

        <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 7px;background:rgba(0,0,0,.2);border-radius:2px">
          ${(ud.shapeTexMode ?? 'tile') === 'tile'
            ? `🔁 <b style="color:var(--accent3)">LOOP</b> — har <b>${(ud.shapeTexSize ?? 4)}m</b> da takrorlanadi.
               Yo'l uzayса ham rasm o'lchami o'zgarmaydi.<br>
               <span style="color:var(--border)">${(ud._len ? ((ud._len * (ud.shapeLength ?? 1)) / Math.max(0.05, ud.shapeTexSize ?? 4)).toFixed(1) : '0')} marta takrorlanadi</span>`
            : '↔ <b style="color:#ffcc00">CHO\'ZISH</b> — butun yo\'lga bir marta cho\'ziladi. Yo\'l uzaysa rasm ham cho\'ziladi.'}
        </div>
      `}`}
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:var(--accent);color:#001">MOVE</span>Harakat</div>
      <div class="fr"><span class="fl">Yuruvchi obyekt</span>
        <select class="fv" onchange="window._pathSet('attachedId', this.value||null)">
          <option value="">— yo'q —</option>
          ${objects.filter(x => x.userData && !x.userData.isPath && x.userData.id !== ud.id)
            .map(x => `<option value="${x.userData.id}" ${String(ud.attachedId)===String(x.userData.id)?'selected':''}>${x.userData.name}</option>`).join('')}
        </select></div>
      <div class="fr"><span class="fl">Tezlik (m/s)</span>
        <input class="fv" type="number" step="0.1" min="0" value="${(ud.speed ?? 2).toFixed(1)}"
          oninput="window._pathSet('speed', Math.max(0, parseFloat(this.value)||0))"></div>
      <div class="fr"><span class="fl">Takrorlash</span>
        <select class="fv" onchange="window._pathSet('loopMode', this.value)">
          <option value="once"     ${ud.loopMode==='once'?'selected':''}>▶ Bir marta</option>
          <option value="loop"     ${(ud.loopMode??'loop')==='loop'?'selected':''}>🔁 Halqa</option>
          <option value="pingpong" ${ud.loopMode==='pingpong'?'selected':''}>↔ Ping-Pong</option>
        </select></div>
      <div class="fr"><span class="fl">Yo'nalishga bur</span>
        <input type="checkbox" ${ud.rotFollow!==false?'checked':''} onchange="window._pathSet('rotFollow', this.checked)"></div>
      <div class="fr"><span class="fl">Boshlanishi</span>
        <select class="fv" onchange="window._pathSet('trigger', this.value)">
          <option value="auto"      ${(ud.trigger??'auto')==='auto'?'selected':''}>⚡ Avtomatik (Play)</option>
          <option value="onTrigger" ${ud.trigger==='onTrigger'?'selected':''}>🎯 Trigger bilan</option>
        </select></div>
      ${!ud.attachedId ? `<div style="font-size:8px;color:#ff8844;margin-top:5px;font-family:'Share Tech Mono',monospace">
        ⚠ Yuruvchi obyekt tanlanmagan — yo'l bo'sh ishlaydi.</div>` : ''}
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">GIZMO</span>Editor Ko'rsatkichi</div>
      <div class="fr"><span class="fl">Chiziqni ko'rsat</span>
        <input type="checkbox" ${ud.showGizmo!==false?'checked':''} onchange="window._pathSet('showGizmo', this.checked)"></div>
      <div class="fr"><span class="fl">Raqamlar</span>
        <input type="checkbox" ${ud.pointNumbers!==false?'checked':''} onchange="window._pathSet('pointNumbers', this.checked)"></div>
      <div class="fr"><span class="fl">Rang</span>
        <input type="color" value="${ud.pathColor||'var(--accent3)'}" oninput="window._pathSet('pathColor', this.value)"
          style="width:100%;height:22px;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer"></div>
      <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
        ⓘ Gizmo faqat editorda ko'rinadi — o'yinchi uni hech qachon ko'rmaydi.
      </div>
    </div>`;
}
window.buildPathInspector = buildPathInspector;
