// ============================================================
// 💻 PC BLOCK
// ------------------------------------------------------------
//  Assetlar → Shakl → 💻 PC
//
//  Tuzilishi — yalpoq kub:
//     pc (Group)                 ← scale = o'lcham (W, H, D)
//      ├─ korpus  (Box)          — 5×5 yalpoq kub
//      ├─ ekran   (Plane)        — old yuzada, ramka ichida
//      └─ 📷 lanka (Group)       — fokus kamera nuqtasi (editor'da)
//
//  Scale gizmo bilan yoki Inspector → 📐 TRANSFORM (W/H/D) orqali
//  ixtiyoriy o'lcham berish mumkin. Ekran nisbati avtomatik moslashadi.
//
//  HTML — tekstura kabi yopishtiriladi. Inspector'da "🌐 HTML"
//  tanlansa, ekran yuzasiga JONLI sahifa tushadi: CSS3D orqali
//  haqiqiy <iframe> DOM 3D fazoda turadi. Ya'ni <input>, <button>,
//  CSS animatsiya, JS — hammasi haqiqatan ishlaydi. Bu canvas'ga
//  chizilgan rasm EMAS.
//
//  Ekran o'yinchi ekraniga overlay bo'lib chiqmaydi — u dunyo
//  koordinatasida, blok yuzasida turadi. Devor orqasida qolsa
//  ko'rinmaydi (LOS raycast + orqa yuza culling + masofa).
//
//  Ishlatish:
//     1. Tugma (Interactive Btn → 💻 PC) bilan YOQILADI
//     2. Oldiga borib klavish/kombinatsiya → kamera ekranga qadaladi
//     3. Kursor ochiladi, sichqoncha FAQAT ekran chegarasida ishlaydi
//     4. Klaviatura bloklanadi, o'yinchi ko'rinmas bo'ladi (sozlanadi)
//     5. Chiqish: o'sha klavish, Esc, yoki sahifa ichidan APEX.exit()
// ============================================================

window.PCBlockSystem = (() => {
  'use strict';

  const BEZEL = 0.0;     // ramka kengligi (0 = ramkasiz panel; inspektorda oshirish mumkin)
  // ⚠ Ekran korpusning OLD YUZASIDAN sal OLDINDA turishi SHART.
  //   Ilgari u ichkarida ("botiq") edi va bu ishlardi, chunki CSS3D
  //   canvas USTIGA chizilardi. Endi CSS3D canvas ORQASIDA — agar ekran
  //   korpus ichida qolsa, korpusning old yuzasi uni butunlay to'sadi.
  //   0.004 lokal birlik ≈ 0.2 mm (pc.scale.z = 0.05 da) — z-fighting yo'q.
  const PROUD = 0.004;
  const HIDE_LAYER = 2;  // 'self' rejimi uchun render qatlami

  // ── Standart userData ────────────────────────────────────────
  function defaults() {
    return {
      isPCBlock: true,

      // ── Ekran mazmuni (tekstura kabi) ──
      //  🎨 `canvas` — sahnadagi tayyor CANVAS ni ekranga qo'yadi.
      //  ⚠ NEGA: HTML ni IKKI MARTA yozish kerak edi — biri 🎨 Canvas
      //    muharririda (HUD uchun), ikkinchisi shu yerda (PC ekrani
      //    uchun). Bir xil interfeysni ikki joyda saqlash esa
      //    ertami-kechmi ularni bir-biridan uzoqlashtirardi.
      //    Endi bitta canvas ham HUD, ham PC ekrani bo'la oladi —
      //    va `{hp}` `{n}` kabi o'rin tutuvchilar ikkalasida ishlaydi.
      screenMode: 'html',        // 'html' | 'canvas' | 'image' | 'camera' | 'off'
      canvasId: null,            // 🎨 qaysi canvas (`_canvases[].id`)

      // ── 🎛 EKRAN FILTRI ──
      //  ⚠ 🎨 Filtrlar menyusi (`ColorGrade`) BUTUN ekranga ta'sir
      //    qiladi — u post-processing. Bu esa FAQAT SHU EKRANGA:
      //    kuzatuv kamerasi oq-qora va shovqinli, eski monitor
      //    yashil va chiziqli bo'lsin. Global filtrni ishlatsak
      //    butun o'yin oq-qora bo'lib qolardi.
      //  ⚠ Nomlar `ColorGrade` bilan bir xil — dizayner ikkinchi
      //    atamalar to'plamini o'rganmasin.
      screenFx: null,            // { grayscale, sepia, invert, contrast,
                                 //   brightness, saturation, blur, hue }

      // ── 📷 Kamera feed (CCTV) ──
      //  `camSource` — sahnadagi Kamera obyektining userData.id si.
      //  ⚠ Bu kalitlar `_` siz — save-load ularni SAQLAYDI.
      //    Ichki holat (`_feedRT`, `_feedCam`…) esa `_` bilan boshlanadi
      //    va saqlanmaydi (save-load.js:18 — `k.startsWith('_')` filtri).
      camSource: null,
      camFps: 15,                // feed yangilanish tezligi (1–60)
      camRes: 512,               // render target o'lchami (128–1024)

      html: '<h1 style="color:var(--accent);margin:0 0 14px">APEX OS</h1>\n' +
            '<p>Tizim tayyor.</p>\n' +
            '<input placeholder="Buyruq kiriting..." style="width:70%;padding:8px;font-size:18px">\n' +
            '<button onclick="APEX.log(\'Salom!\')" style="padding:8px 14px;font-size:18px">Yuborish</button>\n' +
            '<p style="color:var(--accent3)">&gt; _</p>',
      imageB64: null,
      imageName: null,
      screenBg: '#080c12',
      screenRes: 1024,           // ekran eni (px) — balandligi nisbатdan
      glow: true,

      // ── Korpus ──
      bodyColor: '#16191f',
      bezel: BEZEL,

      // ── Quvvat ──
      powered: false,
      offColor: '#08090b',

      // ── Kirish ──
      enterKey: 'KeyE',
      enterCtrl: false, enterShift: false, enterAlt: false,
      interactDist: 6.0,
      focusSpeed: 3.0,
      focusEase: 'smooth',       // 'smooth' | 'hard' | 'custom'
      focusBez: [0.42, 0, 0.58, 1],

      // ── O'yinchi ──
      //   'full' — butunlay yashiriladi (soya ham yo'qoladi)
      //   'self' — faqat O'Z kamerangizdan yashiriladi; boshqa
      //            o'yinchilar (multiplayer) sizni ko'rib turadi
      //   'off'  — yashirilmaydi
      hidePlayer: 'full',
      lockKeys: true,            // fokusda klaviatura bloklansin

      // ── Ko'rinish ──
      screenVis: 'depth',        // 'depth' | 'los' | 'always' | 'focus'
      screenMaxDist: 25,

      // ── Sandbox ──
      allowSameOrigin: false,
      allowForms: true,
      allowPopups: false,

      colliderMode: 'block',
      platformMode: 'off',
    };
  }

  // ── 🔧 Shaklni qurish ────────────────────────────────────────
  function _build(pc) {
    const ud = pc.userData;
    const bz = Math.max(0, Math.min(0.35, ud.bezel ?? BEZEL));

    // Eskisini tozalash (kamera lankasiga tegmaymiz)
    for (let i = pc.children.length - 1; i >= 0; i--) {
      const c = pc.children[i];
      if (!c.userData || !c.userData._pcPart) continue;
      pc.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(ud.bodyColor || '#16191f'),
      roughness: 0.6, metalness: 0.2,
    });

    // ── Yupqa PANEL korpus ──────────────────────────────────────
    //  ⚠ O'ZGARDI: ilgari korpus 1×1×1 to'liq quti ("ramka") edi. Endi
    //    Z bo'yicha yupqa (DEPTH) — old yuzada ekran, orqasida ozgina
    //    qalinlik. Har qanday joyga (devor, stol, panel) yopishtirish
    //    uchun qulay. Ekran pozitsiyasi shu qalinlikka BOG'LANADI —
    //    aks holda ekran korpusdan uzoqda osilib qolardi.
    const DEPTH = 0.12;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, DEPTH), bodyMat);
    body.userData = { _pcPart: 'body' };
    body.castShadow = true; body.receiveShadow = true;
    pc.add(body);

    // ── Ekran — panelning old yuzasida ──
    //  bz (bezel) endi default 0 (ramkasiz), lekin foydalanuvchi xohlasa
    //  hali ham ekran atrofiga ramka qo'sha oladi (inspektorda).
    // ⚠ bz=0 (ramkasiz) da ekran korpus bilan aynan bir o'lchamda bo'lib,
    //   chekkalarda z-fighting berardi. Mikroskopik kichraytiramiz.
    const sw = (1 - bz * 2) * (bz === 0 ? 0.998 : 1);
    const sh = (1 - bz * 2) * (bz === 0 ? 0.998 : 1);
    const sz = DEPTH / 2 + PROUD;    // panelning old yuzasi (yarmi) + ozgina old
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(sw, sh),
      new THREE.MeshStandardMaterial({
        color: 0x000000, roughness: 0.25, metalness: 0,
        emissive: new THREE.Color(0x000000), toneMapped: false,
      }));
    screen.position.set(0, 0, sz);
    screen.userData = { _pcPart: 'screen' };
    // ⚠ Ekran korpusdan OLDIN chizilishi shart. HTML rejimida u faqat
    //   DEPTH yozadi (colorWrite:false). Agar korpus oldin chizilsa,
    //   u rangni yozib bo'lardi va teshik ochilmay qolardi.
    //   renderOrder = -10 → ekran doim birinchi → korpusning old yuzasi
    //   depth testdan o'tolmaydi → o'sha piksellar shaffof qoladi.
    screen.renderOrder = -10;
    pc.add(screen);

    ud._body = body; ud._screen = screen;
    ud._sw = sw; ud._sh = sh; ud._sz = sz;

    _paintScreen(pc);
    return pc;
  }

  // ── Ekran teksturasini xavfsiz tozalash ─────────────────────
  //  ⚠ NEGA ALOHIDA: kamera rejimida `m.map` — RENDER TARGET ning
  //    teksturasi. Uni bu yerда dispose qilsak, RT buzilib, keyingi
  //    kadrda qora ekran chiqardi (RT ning o'zi hali tirik bo'lsa ham).
  //    RT teksturasini FAQAT `_disposeFeed()` bo'shatadi.
  function _clearMap(pc, m) {
    const feedTex = pc.userData._feedRT && pc.userData._feedRT.texture;
    if (m.map && m.map !== feedTex) { try { m.map.dispose(); } catch (e) {} }
    m.map = null;
    // 🖼 Rasm keshini ham tozalaymiz — aks holda rejim/quvvat almashib
    //    qaytganda `_texSrc === imageB64` bo'lib qolib, rasm QAYTA yuklanmasdi.
    pc.userData._texSrc = null;
  }

  // ══════════════════════════════════════════════════════════
  //  📷 KAMERA FEED — sahna kamerasidan PC ekraniga (CCTV)
  // ----------------------------------------------------------
  //  Sahnadagi 🎥 Kamera obyektining ko'rinishi WebGLRenderTarget'ga
  //  chiziladi va PC ekraniga tekstura sifatida beriladi.
  //
  //  ⚠ TARTIB MUHIM: bu update() ichida ishlaydi, ya'ni main-loop
  //    dagi asosiy `renderer.render(scene, camera)` dan OLDIN
  //    (main-loop.js: update ~233-satr, render ~362-satr). Aks holda
  //    ekranда bir kadr eskirgan tasvir turardi.
  // ══════════════════════════════════════════════════════════
  const _fWP = new THREE.Vector3();
  const _fWN = new THREE.Vector3();
  const _fWQ = new THREE.Quaternion();
  const _fScl = new THREE.Vector3();

  function _findCam(id) {
    if (id == null || id === '') return null;
    if (typeof objects === 'undefined') return null;
    for (const o of objects) {
      if (o && o.userData && o.userData.isCamera &&
          String(o.userData.id) === String(id)) return o;
    }
    return null;
  }

  function _ensureFeed(pc) {
    const ud = pc.userData;
    const res = Math.max(128, Math.min(1024, Math.round(ud.camRes || 512)));
    if (ud._feedRT && ud._feedRes === res) return ud._feedRT;
    if (ud._feedRT) { try { ud._feedRT.dispose(); } catch (e) {} }
    const rt = new THREE.WebGLRenderTarget(res, res, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    // Rang fazosi — aks holda feed asosiy sahnadan quyuqroq/oqroq chiqadi
    if ('colorSpace' in rt.texture) rt.texture.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in rt.texture && THREE.sRGBEncoding !== undefined) {
      rt.texture.encoding = THREE.sRGBEncoding;
    }
    // ⚠ Flip (repeat=-1, offset=1) uchun wrap REPEAT bo'lishi kerak.
    //   ClampToEdge bo'lsa, aylantirilганда chekka piksel cho'zilib ketardi.
    rt.texture.wrapS = THREE.RepeatWrapping;
    rt.texture.wrapT = THREE.RepeatWrapping;
    ud._feedRT = rt; ud._feedRes = res; ud._feedT = 0;
    if (!ud._feedCam) ud._feedCam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    return rt;
  }

  function _disposeFeed(pc) {
    const ud = pc.userData;
    if (!ud._feedRT) return;
    // Ekran hali RT teksturasini ushlab tursa — havolani uzamiz
    const m = ud._screen && ud._screen.material;
    if (m && m.map === ud._feedRT.texture) { m.map = null; m.emissiveMap = null; m.needsUpdate = true; }
    try { ud._feedRT.dispose(); } catch (e) {}
    ud._feedRT = null; ud._feedCam = null; ud._feedRes = 0; ud._feedT = 0;
  }

  function _renderFeed(pc, now) {
    const ud = pc.userData;
    const src = _findCam(ud.camSource);
    if (!src) return false;
    if (typeof renderer === 'undefined' || !renderer || !ud._screen) return false;

    // ⚡ FPS cheklovi — har kadr TO'LIQ sahnani qayta chizish juda qimmat.
    //    Oraliqda oxirgi kadr ekranда turaveradi (CCTV uchun ayni muddao).
    const fps = Math.max(1, Math.min(60, ud.camFps || 15));
    if (ud._feedT && now - ud._feedT < 1000 / fps) return true;

    // 👁 Ko'rinmasa umuman chizmaymiz — masofа/burchak/LOS mantiqi
    //    ekranning o'zi bilan bir xil (_visible).
    pc.updateMatrixWorld(true);
    pc.getWorldQuaternion(_fWQ);
    ud._screen.getWorldPosition(_fWP);
    _fWN.set(0, 0, 1).applyQuaternion(_fWQ).normalize();
    if (!_visible(pc, _fWP, _fWN)) return true;

    ud._feedT = now;
    const rt  = _ensureFeed(pc);
    const cam = ud._feedCam;

    // 📷 Feed'ni aylantirish — endi KAMERANING xususiyati (`src.userData`),
    //   PC'niki emas. Teleskop/kamera teskari o'rnatilganда tuzatish uchun.
    //   Teksturaning repeat/offset orqali — proyeksiyaga tegmaymiz.
    //     flipX: o'ng↔chap  → repeat.x = -1, offset.x = 1
    //     flipY: yuqori↔past → repeat.y = -1, offset.y = 1
    const tex = rt.texture;
    const fx = src.userData.camFlipX ? -1 : 1;
    const fy = src.userData.camFlipY ? -1 : 1;
    if (tex.repeat.x !== fx || tex.repeat.y !== fy) {
      tex.repeat.set(fx, fy);
      tex.offset.set(fx < 0 ? 1 : 0, fy < 0 ? 1 : 0);
      tex.needsUpdate = true;
    }

    src.updateMatrixWorld(true);
    src.getWorldPosition(cam.position);
    src.getWorldQuaternion(cam.quaternion);
    // Kamera obyektining frustumi -Z ga chizilgan; PerspectiveCamera ham
    // -Z ga qaraydi → burilish to'g'ridan-to'g'ri mos, tuzatish kerak emas.
    cam.fov    = src.userData.fov  || 60;
    cam.near   = src.userData.near || 0.1;
    cam.far    = src.userData.far  || 100;
    // ⚠ Ekran geometriyasi kvadrat (sw === sh), LEKIN PC blokni notekis
    //   kattalashtirish mumkin (masalan scale 2×1×1) — u holda ekran
    //   cho'ziladi. Aspect'ni DUNYO masshtabidan olamiz, aks holda feed
    //   cho'zilgan ekranda siqilib ko'rinardi.
    pc.getWorldScale(_fScl);
    cam.aspect = Math.max(0.05, Math.min(20, (_fScl.x || 1) / (_fScl.y || 1)));
    cam.updateProjectionMatrix();

    // ⚠ O'Z ekranini yashiramiz (tunnel/mirror artefakti oldini olish).
    const scr = ud._screen;
    const wasVis = scr.visible;
    scr.visible = false;

    // ⚠ MANBA KAMERANING O'Z KORPUSINI ham yashiramiz. Feed kamera manba
    //   pozitsiyasiga aynan qo'yiladi — ya'ni kamera korpusining ICHIDA.
    //   Yashirmasak, feed faqat lens/korpusning ichki devorlarini ko'radi
    //   (foydalanuvchi aytgan "kameraning ichini ko'rsatadi" muammosi).
    //   Butun manba obyektini (Group bo'lsa bolalari bilan) yashiramiz.
    const srcWasVis = src.visible;
    src.visible = false;

    const prev = renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
    } catch (e) {
      // jim — bitta buzuq feed butun kadrni yiqitmasin
    } finally {
      // ⚠ HAR HOLDA qaytaramiz: null ga qaytarmasak, asosiy sahna
      //   ekranga emas, RT ga chizilib, o'yin qorayib qolardi.
      renderer.setRenderTarget(prev);
      scr.visible = wasVis;
      src.visible = srcWasVis;
    }
    return true;
  }

  // ── 🎨 Ekran yuzasini bo'yash ───────────────────────────────
  function _paintScreen(pc) {
    const ud = pc.userData;
    const sc = ud._screen;
    if (!sc) return;
    const m = sc.material;

    //  🎛 Ekran filtri — CSS3D elementiga darhol qo'llanadi.
    //  ⚠ SHU YERDA: inspektor slayderi `_paintScreen` ni chaqiradi,
    //    `_syncCSS` esa keyingi kadrda yuradi. Faqat u yerda qo'llasak
    //    dizayner slayderni surganda natija bir kadr kechikardi va
    //    \"ishlamadi\" bo'lib tuyulardi.
    _applyFx(pc);

    // 🔌 O'CHIQ — o'lik qora ekran
    if (!ud.powered || ud.screenMode === 'off') {
      _clearMap(pc, m);
      m.emissiveMap = null;
      m.colorWrite = true;
      m.color.set(ud.offColor || '#08090b');
      m.emissive.set(0x000000); m.emissiveIntensity = 0;
      m.needsUpdate = true;
      return;
    }

    // 🖼 RASM — oddiy tekstura
    if (ud.screenMode === 'image' && ud.imageB64) {
      m.colorWrite = true;
      if (ud._texSrc !== ud.imageB64) {
        _clearMap(pc, m);
        m.map = new THREE.TextureLoader().load(ud.imageB64, t => {
          if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
          else if ('encoding' in t && THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
          t.anisotropy = 8; t.needsUpdate = true; m.needsUpdate = true;
        });
        ud._texSrc = ud.imageB64;
      }
      m.color.set(0xffffff);
      m.emissive.set(ud.glow ? 0xffffff : 0x000000);
      m.emissiveMap = ud.glow ? m.map : null;
      m.emissiveIntensity = ud.glow ? 0.45 : 0;
      _applyFxMat(ud, m);        // 🎛 yorug'lik — tekstura qila oladigani
      m.needsUpdate = true;
      return;
    }

    // 📷 KAMERA — jonli feed. Tekstura RT ga tegishli; uni har kadr
    //    `_renderFeed()` yangilaydi. Bu yerda faqat materialga ulaymiz.
    if (ud.screenMode === 'camera') {
      _clearMap(pc, m);                 // eski rasm teksturasi bo'lsa — ketsin
      const rt = _ensureFeed(pc);
      m.colorWrite = true;
      m.map = rt.texture;
      m.color.set(0xffffff);
      m.emissive.set(ud.glow ? 0xffffff : 0x000000);
      m.emissiveMap = ud.glow ? rt.texture : null;
      m.emissiveIntensity = ud.glow ? 0.45 : 0;
      m.needsUpdate = true;
      return;
    }

    // 🌐 HTML — 🕳 CHUQURLIK TESHIGI.
    //    Yuza faqat DEPTH yozadi, RANG yozmaydi (colorWrite:false).
    //    Natijada canvas shu pikselларda shaffof qoladi va orqadagi
    //    CSS3D <iframe> ko'rinadi. Ekran oldidagi har qanday obyekt
    //    esa rang yozadi → ekranni PIKSEL DARAJASIDA to'sadi.
    //    Orqadagi obyektlar depth testdan o'tolmaydi → ta'sir qilmaydi.
    _clearMap(pc, m);
    m.emissiveMap = null;
    m.color.set(ud.screenBg || '#080c12');
    m.emissive.set(0x000000); m.emissiveIntensity = 0;
    m.colorWrite = false;
    m.needsUpdate = true;
  }

  // ── 🌐 CSS3D — jonli HTML ekran yuzasida ────────────────────
  let _css3d = null, _cssScene = null;

  function _ensureCSS3D() {
    if (_css3d || typeof THREE.CSS3DRenderer === 'undefined') return _css3d;
    const cv = document.getElementById('three-canvas');
    const host = (cv && cv.parentNode) || document.body;
    _css3d = new THREE.CSS3DRenderer();
    _css3d.setSize(cv ? cv.clientWidth : window.innerWidth,
                   cv ? cv.clientHeight : window.innerHeight);
    const d = _css3d.domElement;
    d.id = 'pc-css3d';
    d.style.position = 'absolute';
    d.style.top = '0'; d.style.left = '0';
    d.style.pointerEvents = 'none';   // fokusdan tashqarida sichqoncha o'tadi
    // ⚠ z-index:-1 → #cvp ning foni (osmon) USTIDA, lekin canvas OSTIDA.
    //   Canvas shaffof bo'lgani uchun ekran teshigidan ko'rinadi,
    //   geometriya esa uni to'sadi.
    //   Canvas'ga z-index BERMAYMIZ — aks holda u #gizmo-svg, FPS overlay,
    //   crosshair va boshqa HUD elementlarini (z-index:auto) bosib qo'yadi.
    d.style.zIndex = '-1';
    host.appendChild(d);
    _cssScene = new THREE.Scene();
    window.addEventListener('resize', () => {
      const c = document.getElementById('three-canvas');
      if (c && _css3d) _css3d.setSize(c.clientWidth, c.clientHeight);
    });
    return _css3d;
  }

  // ⚠ MUHIM: element o'lchami ekran NISBATIga mos bo'lishi shart.
  //   Aks holda kvadrat DOM'ni to'g'ri bo'lmagan nisbatda cho'zsak,
  //   HTML ichidagi hamma narsa (shrift, tugma, doira) buziladi.
  const _es = new THREE.Vector3();
  function _elSize(pc) {
    const ud = pc.userData;
    pc.getWorldScale(_es);
    const w = Math.abs(ud._sw * _es.x) || 1;
    const h = Math.abs(ud._sh * _es.y) || 1;
    const pxW = Math.max(128, Math.min(2048, Math.round(ud.screenRes || 1024)));
    const pxH = Math.max(64, Math.min(2048, Math.round(pxW * (h / w))));
    return { pxW, pxH, w, h };
  }

  function _bridge(ud) {
    const key = ud.enterKey || 'KeyE';
    return `<script>(function(){
      window.APEX = {
        exit: function(){ parent.postMessage({__apexPC:'exit'}, '*'); },
        send: function(d){ parent.postMessage({__apexPC:'msg', data:d}, '*'); },
        log:  function(m){ parent.postMessage({__apexPC:'log', data:String(m)}, '*'); }
      };
      document.addEventListener('keydown', function(e){
        if (e.code === ${JSON.stringify(key)} || e.code === 'Escape') {
          var t = e.target, tag = t && t.tagName;
          // Matn yozayotgan bo'lsa — chiqish klavishi harf sifatida ketsin
          if (e.code !== 'Escape' && (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable))) return;
          e.preventDefault(); window.APEX.exit();
        }
      });
    })();<\/script>`;
  }

  const _wq = new THREE.Quaternion();
  // ============================================================
  //  🎛 EKRAN FILTRI — FAQAT shu ekranga
  // ------------------------------------------------------------
  //  ⚠ 🎨 Filtrlar menyusi (`ColorGrade`) BUTUN o'yin ekraniga
  //    ta'sir qiladi — u post-processing. Bu esa faqat SHU PC
  //    ekraniga: kuzatuv kamerasi oq-qora va shovqinli, eski
  //    monitor yashil va chiziqli bo'lsin. Global filtrni
  //    ishlatsak butun o'yin oq-qora bo'lib qolardi.
  //
  //  ⚠ Nomlar `ColorGrade` bilan AYNAN bir xil — dizayner
  //    ikkinchi atamalar to'plamini o'rganmasin.
  //
  //  ⚠ CSS `filter` bilan: CSS3D <iframe>, <img> va kamera feed —
  //    uchalasi ham DOM/tekstura, ya'ni bitta yo'l hammasiga
  //    yetadi. Shader yozsak har manba uchun alohida kerak bo'lardi.
  const _FX_DEF = { grayscale: 0, sepia: 0, invert: 0, contrast: 1,
                    brightness: 1, saturation: 1, blur: 0, hue: 0 };

  /** @returns {string} CSS `filter` qiymati (bo'sh = filtr yo'q) */
  function fxCss(fx) {
    if (!fx) return '';
    const g = (k) => {
      const v = Number(fx[k]);
      return isFinite(v) ? v : _FX_DEF[k];
    };
    const out = [];
    //  ⚠ Neytral qiymatlar YOZILMAYDI: `filter: brightness(1)` ham
    //    brauzerni alohida qatlam yasashga majbur qiladi va ekran
    //    sekinlashardi.
    if (g('grayscale'))        out.push(`grayscale(${g('grayscale')})`);
    if (g('sepia'))            out.push(`sepia(${g('sepia')})`);
    if (g('invert'))           out.push(`invert(${g('invert')})`);
    if (g('contrast')   !== 1) out.push(`contrast(${g('contrast')})`);
    if (g('brightness') !== 1) out.push(`brightness(${g('brightness')})`);
    if (g('saturation') !== 1) out.push(`saturate(${g('saturation')})`);
    if (g('blur'))             out.push(`blur(${g('blur')}px)`);
    if (g('hue'))              out.push(`hue-rotate(${g('hue')}deg)`);
    return out.join(' ');
  }

  /**
   * Filtrni ekran elementiga qo'llaydi.
   *
   * ⚠ CHEGARA HALOL AYTILADI: to'liq filtr FAQAT 🌐 HTML va
   *   🎨 Canvas ekranlarida ishlaydi — ular DOM, ya'ni CSS
   *   `filter` ularga to'g'ridan-to'g'ri tegadi.
   *
   *   🖼 rasm va 📷 kamera feed esa TEKSTURA (WebGL). Ularga CSS
   *   tegmaydi. Har kadr teksturani canvas'ga ko'chirib filtrlash
   *   mumkin edi, lekin 512×512 feed uchun bu sekundiga 15 marta
   *   nusxa olish — o'yin sezilarli sekinlashardi.
   *
   *   Shuning uchun ular uchun materialning O'ZI qila oladigan
   *   narsa qo'llanadi: yorug'lik (rang ko'paytuvchisi). Qolganini
   *   inspektor ochiq aytadi — dizayner \"nega ishlamadi?\" deb
   *   qidirib yurmasin.
   */
  function _applyFx(pc) {
    const ud = pc.userData;
    const css = fxCss(ud.screenFx);
    if (ud._cssWrap && ud._cssWrap.style.filter !== css) ud._cssWrap.style.filter = css;
    ud._fxCss = css;
  }

  /** 🖼📷 Tekstura ekranlari uchun — material qila oladigani. */
  function _applyFxMat(ud, m) {
    if (!m || !m.color) return;
    const b = (ud.screenFx && isFinite(+ud.screenFx.brightness)) ? +ud.screenFx.brightness : 1;
    //  ⚠ 1 dan YUQORI qiymat rangni oqartirib yuboradi (tekstura
    //    allaqachon to'liq yorug'). Shuning uchun faqat pasaytiramiz.
    const k = Math.max(0, Math.min(1, b));
    m.color.setScalar(k);
    if (m.emissive && ud.glow) m.emissiveIntensity = 0.45 * k;
  }

  const _wp = new THREE.Vector3();
  const _wn = new THREE.Vector3();

  function _syncCSS(pc) {
    const ud = pc.userData;
    //  🎨 `canvas` rejimi ham JONLI ekran — u ham HTML/CSS/JS.
    const live = ud.powered && (ud.screenMode === 'html' || ud.screenMode === 'canvas');
    if (!live) { _dropCSS(pc); return; }
    if (!_ensureCSS3D() || !ud._screen) return;

    const { pxW, pxH, w, h } = _elSize(pc);

    // Element
    if (!ud._cssObj) {
      const wrap = document.createElement('div');
      wrap.style.cssText = `width:${pxW}px;height:${pxH}px;overflow:hidden;background:${ud.screenBg || '#080c12'}`;
      wrap.style.pointerEvents = 'none';
      const ifr = document.createElement('iframe');
      ifr.style.cssText = 'width:100%;height:100%;border:0;display:block;background:transparent';
      wrap.appendChild(ifr);
      const obj = new THREE.CSS3DObject(wrap);
      _cssScene.add(obj);
      ud._cssObj = obj; ud._cssWrap = wrap; ud._cssIfr = ifr;
      ud._cssSig = null; ud._pxW = pxW; ud._pxH = pxH;
    }
    // Nisbat o'zgargan bo'lsa — element o'lchamini yangilaymiz.
    // Kichik o'zgarishlarga tegmaymiz (gizmo bilan sudralganda
    // iframe har kadr reflow bo'lmasin).
    if (Math.abs(ud._pxW - pxW) > 2 || Math.abs(ud._pxH - pxH) > 2) {
      ud._cssWrap.style.width = pxW + 'px';
      ud._cssWrap.style.height = pxH + 'px';
      ud._pxW = pxW; ud._pxH = pxH;
    }

    // srcdoc — faqat mazmun o'zgarsa qayta yuklanadi
    // 🔤 `{random}` — 🔢 MiniPad paroli bilan almashadi.
    //  ⚠ IMZO ham AYNAN shu yechilgan matndan hisoblanadi. Xom matndan
    //    hisoblasak parol o'zgarganda imzo o'zgarmasdi va iframe
    //    yangilanmasdi — ekranda eski parol turib qolardi.
    // ============================================================
    //  📄 EKRAN MAZMUNI — o'zining HTML i yoki 🎨 CANVAS
    // ------------------------------------------------------------
    //  ⚠ Canvas tanlangan bo'lsa uning HTML+CSS i olinadi. Shunda
    //    dizayner bitta narsani ikki marta yozmaydi: o'sha canvas
    //    ham HUD bo'lib ekranda turadi, ham PC monitorida ko'rinadi.
    //  ⚠ Canvas TOPILMASA o'z HTML iga qaytamiz — ekran qop-qora
    //    bo'lib qolmasin. Sahna boshqa kompyuterdan kelib, canvas
    //    o'chirilgan bo'lishi mumkin.
    let _raw = String(ud.html ?? '');
    if (ud.screenMode === 'canvas') {
      const cv = (window._canvases || []).find(c => c && c.id === ud.canvasId);
      if (cv) _raw = `<style>${cv.css || ''}</style>` + (cv.html || '');
    }
    //  🔤 O'rin tutuvchilar: 🔢 MiniPad paroli VA 🖼 HUD
    //    ({hp} {n} {random} …) — ikkalasi ham ishlaydi.
    //  ⚠ IMZO ham AYNAN yechilgan matndan hisoblanadi (pastda), aks
    //    holda qiymat o'zgarganda ekran yangilanmasdi.
    let _pcHtml = window.MiniPadSystem ? MiniPadSystem.resolve(_raw) : _raw;
    if (window.HudSystem && window.HudSystem.resolve) _pcHtml = window.HudSystem.resolve(_pcHtml);
    const sig = _pcHtml + '|' + (ud.screenMode || '') + '|' + (ud.canvasId ?? '') +
                '|' + (ud.screenBg || '') + '|' + (ud.allowSameOrigin ? 1 : 0) +
                '|' + (ud.allowForms !== false ? 1 : 0) + '|' + (ud.allowPopups ? 1 : 0) + '|' + (ud.enterKey || '');
    _applyFx(pc);
    if (ud._cssSig !== sig) {
      const sandbox = ['allow-scripts', ud.allowForms !== false && 'allow-forms',
        ud.allowPopups && 'allow-popups', ud.allowSameOrigin && 'allow-same-origin',
        'allow-modals'].filter(Boolean).join(' ');
      ud._cssIfr.setAttribute('sandbox', sandbox);
      ud._cssIfr.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          /* ⚠ Brauzer/OS mavzusi input va tugmalarni o'zicha bo'yab
             qo'ymasin — ekran har joyda BIR XIL ko'rinsin. */
          :root{color-scheme:dark}
          *,*::before,*::after{box-sizing:border-box}
          html,body{margin:0;padding:0;height:100%;
            background:${ud.screenBg || '#080c12'};
            color:#d6e6f2;font-family:'Share Tech Mono','Courier New',monospace;
            font-size:20px;line-height:1.5;-webkit-font-smoothing:antialiased}
          body{padding:18px;overflow:auto}
          input,textarea,select,button{
            font-family:inherit;font-size:inherit;color:#d6e6f2;
            background:rgba(255,255,255,.06);
            border:1px solid rgba(255,255,255,.22);
            border-radius:4px;padding:8px 12px;outline:none;
            appearance:none;-webkit-appearance:none;margin:2px 0}
          input:focus,textarea:focus,select:focus{
            border-color:var(--accent);background:rgba(var(--accent-rgb),.08)}
          button{cursor:pointer;background:rgba(var(--accent-rgb),.14);
            border-color:rgba(var(--accent-rgb),.45);color:var(--accent);font-weight:700}
          button:hover{background:rgba(var(--accent-rgb),.24)}
          button:active{transform:translateY(1px)}
          ::placeholder{color:#5b6b7d}
          ::-webkit-scrollbar{width:10px;height:10px}
          ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:5px}
          ::-webkit-scrollbar-track{background:transparent}
        </style></head>
        <body>${_pcHtml}${_bridge(ud)}</body></html>`;
      ud._cssWrap.style.background = ud.screenBg || '#080c12';
      ud._cssSig = sig;
    }

    // ── Ekran tekisligiga AYNAN joylash ──
    pc.updateMatrixWorld(true);
    pc.getWorldQuaternion(_wq);
    ud._screen.getWorldPosition(_wp);
    _wn.set(0, 0, 1).applyQuaternion(_wq).normalize();

    const o = ud._cssObj;
    // ⚠ AYNAN ekran tekisligida. Ilgari 1mm oldinga suriladi (z-fighting
    //   uchun), lekin div endi BOSHQA QATLAMDA (DOM, canvas ortida) —
    //   z-fighting bo'lishi mumkin emas. Har qanday siljish esa
    //   perspektivada div ni mesh'dan chetga chiqaradi. Siljish = 0.
    o.position.copy(_wp);
    o.quaternion.copy(_wq);
    // Bir xil koeffitsient → HTML cho'zilmaydi
    o.scale.set(w / pxW, h / pxH, 1);
    o.visible = _visible(pc, _wp, _wn);
  }

  function _dropCSS(pc) {
    const ud = pc.userData;
    if (!ud._cssObj) return;
    if (_cssScene) _cssScene.remove(ud._cssObj);
    if (ud._cssWrap && ud._cssWrap.parentNode) ud._cssWrap.parentNode.removeChild(ud._cssWrap);
    ud._cssObj = null; ud._cssWrap = null; ud._cssIfr = null; ud._cssSig = null;
  }

  // ── 👁 Ekran ko'rinsinmi ────────────────────────────────────
  const _ray = new THREE.Raycaster();
  const _rd = new THREE.Vector3();
  const _pv = new THREE.Vector3();

  function _visible(pc, center, wn) {
    const ud = pc.userData;
    if (pc.visible === false) return false;
    if (typeof camera === 'undefined') return false;

    // 🔙 Orqa yuza — CSS3D da culling yo'q, o'zimiz qilamiz
    _rd.copy(camera.position).sub(center);
    if (_rd.dot(wn) <= 0.001) return false;

    const mode = ud.screenVis || 'depth';
    if (mode === 'focus') return _focus === pc && _blend > 0.25;

    const dist = camera.position.distanceTo(center);
    if ((ud.screenMaxDist ?? 25) > 0 && dist > ud.screenMaxDist) return false;
    if (mode === 'always') return true;

    // 🕳 'depth' — to'siqni WebGL depth buferi hal qiladi (colorWrite:false
    //    teshigi). Raycast umuman kerak emas: obyekt yarim to'ssa ham
    //    aynan o'sha piksellar to'siladi. Eng aniq va eng tez yo'l.
    if (mode === 'depth') return true;
    if (_focus === pc && _blend > 0.9) return true;

    // ⚡ LOS raycast qimmat — har kadr emas, ~90ms da bir marta.
    //    Oraliqda oxirgi natija ishlatiladi.
    const now = performance.now();
    if (ud._losT && now - ud._losT < 90) return ud._losV !== false;
    ud._losT = now;

    // Ko'rish chizig'i — markaz + 4 burchak; bittasi ochiq bo'lsa yetarli
    const blockers = [];
    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      if (!o.visible || !o.userData) continue;
      if (o.userData.isPath || o.userData.isTextBlock || o.userData.isPCCam) continue;
      if (o.userData.colliderMode === 'inline' && !o.userData.isPCBlock) continue;
      if (o.userData.isPlayerObj && _focus === pc) continue;
      blockers.push(o);
    }
    const hw = ud._sw * 0.4, hh = ud._sh * 0.4;
    const pts = [[0, 0], [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    for (let k = 0; k < pts.length; k++) {
      _pv.set(pts[k][0], pts[k][1], ud._sz).applyMatrix4(pc.matrixWorld);
      _rd.copy(_pv).sub(camera.position);
      const len = _rd.length();
      if (len < 0.05) { ud._losV = true; return true; }
      _rd.normalize();
      _ray.set(camera.position, _rd);
      _ray.far = len - 0.08;
      const hits = _ray.intersectObjects(blockers, true);
      let blocked = false;
      for (let h = 0; h < hits.length; h++) { if (_realBlocker(hits[h].object)) { blocked = true; break; } }
      if (!blocked) { ud._losV = true; return true; }
    }
    ud._losV = false;
    return false;
  }

  function _realBlocker(o) {
    let n = o;
    for (let i = 0; i < 8 && n; i++) {
      const u = n.userData;
      if (u) {
        if (u.isPCCam || u._pathGizmo || u.isPath || u.isTextBlock) return false;
        if (u.id != null && u.colliderMode === 'inline' && !u.isPCBlock) return false;
      }
      n = n.parent;
    }
    return true;
  }

  // ── 📷 Kamera lankasi ───────────────────────────────────────
  function _mkCamIcon() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, depthTest: false, transparent: true, opacity: 0.9 }));
    const l = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 4),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, depthTest: false, transparent: true, opacity: 0.55 }));
    l.rotation.x = -Math.PI / 2; l.position.z = -0.16;
    const ln = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -0.7)]),
      new THREE.LineBasicMaterial({ color: 0x00e5ff, depthTest: false, transparent: true, opacity: 0.5 }));
    g.add(b); g.add(l); g.add(ln);
    g.traverse(o => { o.renderOrder = 997; });
    return g;
  }

  function ensureCamAnchor(pc) {
    let a = pc.children.find(c => c.userData && c.userData.isPCCam);
    if (a) { pc.userData._cam = a; return a; }
    a = _mkCamIcon();
    a.userData = {
      id: ++objIdC, name: (pc.userData.name || 'PC') + ' — 📷 kamera',
      type: 'PCCam', isPCCam: true, _pcId: pc.userData.id, parentId: pc.userData.id,
      colliderMode: 'inline', platformMode: 'off',
    };
    pc.add(a); objects.push(a);
    pc.userData._cam = a;
    resetCamAnchor(pc);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    return a;
  }
  function getCamAnchor(pc) {
    const a = pc.children.find(c => c.userData && c.userData.isPCCam);
    if (a) pc.userData._cam = a;
    return a || null;
  }
  function resetCamAnchor(pc) {
    const a = getCamAnchor(pc) || ensureCamAnchor(pc);
    if (!a) return;
    const ws = pc.getWorldScale(new THREE.Vector3());
    // Ekran oldida, tik qarab. Masofa — ekran to'liq ko'rinadigan qilib.
    const w = pc.userData._sw * ws.x, h = pc.userData._sh * ws.y;
    const fov = (camera && camera.fov ? camera.fov : 60) * Math.PI / 180;
    const need = (Math.max(h, w / (camera.aspect || 1.7)) * 0.5) / Math.tan(fov / 2) * 1.06;
    a.position.set(0, 0, (pc.userData._sz + need / (ws.z || 1)));
    a.rotation.set(0, 0, 0);   // +Z ga qaraydi → kamera -Z → ekranga
    a.updateMatrixWorld(true);
  }

  // ── Yaratish / tiklash ──────────────────────────────────────
  function create(pos) {
    const pc = new THREE.Group();
    pc.userData = Object.assign({ id: ++objIdC, name: 'PC ' + objIdC, type: 'PC' }, defaults());
    pc.position.copy(pos || new THREE.Vector3(0, 1.6, 0));
    pc.scale.set(5, 5, 0.2);             // 5×5 yalpoq kub
    scene.add(pc); objects.push(pc);
    _build(pc);
    ensureCamAnchor(pc);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    updateHierarchy(); updateStats(); selectObject(pc);
    log(`💻 "${pc.userData.name}" qo'shildi — tugma bilan yoqiladi`, 'lok');
    return pc;
  }

  function restore(pc) {
    const d = defaults();
    for (const k in d) if (pc.userData[k] === undefined) pc.userData[k] = d[k];
    // Eski saqlangan sahnalar `hidePlayer: true/false` bo'lishi mumkin
    if (pc.userData.hidePlayer === true)  pc.userData.hidePlayer = 'full';
    if (pc.userData.hidePlayer === false) pc.userData.hidePlayer = 'off';
    // Stend olib tashlandi — eski sahnalardagi qoldiq maydonlar
    delete pc.userData.stand; delete pc.userData.standColor;
    delete pc.userData._leg;  delete pc.userData._base;
    _build(pc);
    ensureCamAnchor(pc);
    return pc;
  }
  function rebuild(pc) { _build(pc); }

  // ── 🔌 Quvvat ───────────────────────────────────────────────
  function setPower(pc, on) {
    pc.userData.powered = !!on;
    _paintScreen(pc);
    if (!on) {
      _dropCSS(pc);
      if (_focus === pc) exit();
    }
    log(`💻 ${pc.userData.name}: ${on ? '🟢 YOQILDI' : "⚫ O'CHIRILDI"}`, 'lok');
  }
  // ── 💻 setHtml — PC ekranidagi HTML kodni ALMASHTIRISH ──────
  //  Timeline keyframelari, hitbox va tugma shu funksiyani chaqiradi.
  //  ⚠ `_paintScreen` ni QAYTA chaqirish shart: HTML `userData.html` da
  //    saqlanadi-yu, ekranga `_syncCSS()` chizadi va u faqat imzo
  //    (`sig`) o'zgarganda iframe ni yangilaydi. Imzo esa `ud.html` dan
  //    hisoblanadi — ya'ni matnni yozishning o'zi yetarli, lekin
  //    ekran YONIQ bo'lmasa ko'rinmaydi.
  function setHtml(pcIdOrObj, html) {
    let pc = pcIdOrObj;
    if (typeof pc !== 'object' || !pc) {
      const sid = String(pcIdOrObj);
      const byId = o => o.userData && String(o.userData.id) === sid;
      pc = objects.find(o => byId(o) && o.userData.isPCBlock) || objects.find(byId);
    }
    if (!pc || !pc.userData || !pc.userData.isPCBlock) {
      log(`⚠ PC topilmadi (id=${pcIdOrObj}) — HTML almashtirilmadi`, 'lw');
      return false;
    }
    if (String(pc.userData.html ?? '') === String(html ?? '')) return true;  // o'zgarish yo'q
    pc.userData.html = String(html ?? '');
    // HTML rejimida bo'lmasa — o'sha rejimga o'tkazamiz, aks holda
    // foydalanuvchi kodni yozadi-yu ekranda rasm turaveradi.
    if (pc.userData.screenMode !== 'html') pc.userData.screenMode = 'html';
    if (typeof _paintScreen === 'function') _paintScreen(pc);
    return true;
  }

  function fire(pcId, action) {
    // ⚠ `objects.find(id === pcId)` YETARLI EMAS: sahnada id lar
    //   takrorlanishi mumkin (masalan Map Loader va PC ikkalasi ham id=8).
    //   `find` BIRINCHI mos kelganini qaytaradi — agar u PC bo'lmasa,
    //   tugma inspektorda ULANGAN ko'rinadi, bosilganda esa hech nima
    //   bo'lmaydi. Shuning uchun avval PC lar orasidan qidiramiz.
    const _sid = String(pcId);
    const _byId = o => o.userData && String(o.userData.id) === _sid;
    let pc = objects.find(o => _byId(o) && o.userData.isPCBlock);
    if (!pc) pc = objects.find(_byId);
    // ⚠ Ilgari bu yerda quruq "PC topilmadi" turardi. Tugma inspektorda
    //   ULANGAN ko'rinadi, bosilganda hech nima bo'lmaydi, konsolda esa
    //   sababni aniqlab bo'lmaydigan bir qator. Endi nima aynan
    //   noto'g'ri ekani yoziladi.
    if (!pc) {
      const ids = objects.filter(o => o.userData && o.userData.isPCBlock)
                         .map(o => `${o.userData.id}:${o.userData.name}`);
      log(`⚠ PC topilmadi (id=${pcId}). Sahnadagi PC lar: ${ids.join(', ') || 'yo\'q'}` +
          ` — tugmani PC ga qayta ulang.`, 'lw');
      return;
    }
    if (!pc.userData.isPCBlock) {
      log(`⚠ id=${pcId} — bu PC emas ("${pc.userData.name}"). Tugma noto'g'ri obyektga ulangan.`, 'lw');
      return;
    }
    if (!pc.userData._screen) {
      // Ekran qurilmagan → ko'rinish tiklanmagan. Quvvat berish befoyda.
      log(`⚠ "${pc.userData.name}" ekrani qurilmagan — PC to'liq tiklanmagan.` +
          ` Konsolda [SceneTypes] xatosini qarang.`, 'lw');
    }
    if (action === 'on') setPower(pc, true);
    else if (action === 'off') setPower(pc, false);
    else setPower(pc, !pc.userData.powered);
    return pc;
  }

  // ── 🎬 Kirish / chiqish ─────────────────────────────────────
  let _focus = null, _blend = 0, _opened = false, _keyDown = false;
  const _fromP = new THREE.Vector3(), _fromQ = new THREE.Quaternion();

  function _bez(x1, y1, x2, y2, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const cx = t => ((1 - t) * (1 - t) * 3 * t * x1) + ((1 - t) * 3 * t * t * x2) + (t * t * t);
    const cy = t => ((1 - t) * (1 - t) * 3 * t * y1) + ((1 - t) * 3 * t * t * y2) + (t * t * t);
    const dx = t => 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = cx(t) - x; if (Math.abs(e) < 1e-5) break;
      const d = dx(t); if (Math.abs(d) < 1e-6) break;
      t = Math.max(0, Math.min(1, t - e / d));
    }
    return cy(t);
  }
  /**
   * Fokus o'tishining silliqlik egri chizig'i.
   *
   * ⚠ ALOMAT: menyuni o'zgartirsangiz ham "bitta silliq o'tishda"
   *   qolib ketardi.
   *
   * ⚠ SABAB: uchta variantdan IKKITASI amalda bir xil edi.
   *   `custom` ning standarti `[0.42, 0, 0.58, 1]` — bu aynan
   *   ease-in-out, ya'ni `smooth` bilan bir xil egri. Bezier
   *   qiymatlarini o'zgartiradigan UI esa UMUMAN yo'q edi, ya'ni
   *   `custom` ni hech qachon boshqacha qilib bo'lmasdi. Uchinchisi
   *   (`hard`) esa chiziqli — 0.3 soniyalik o'tishda sezilmasdi.
   *
   * YECHIM: farqi KO'RINADIGAN variantlar + `custom` uchun haqiqiy
   *   Bezier sozlagichi (pastdagi inspektorda).
   */
  const EASES = {
    hard:    p => p,                                        // ⚡ chiziqli
    smooth:  p => (p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p),  // 🌊 ease-in-out
    // 🐢 Sekin boshlanadi, keskin yetib boradi
    accel:   p => p * p * p,
    // 🚀 Keskin boshlanadi, sekin to'xtaydi
    decel:   p => 1 - Math.pow(1 - p, 3),
    // 🎯 Ozgina oshib ketib qaytadi (kinodagi kabi)
    back:    p => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    // 🍮 Elastik to'xtash
    elastic: p => (p === 0 || p === 1) ? p
                : Math.pow(2, -9 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
  };
  const EASE_LABELS = {
    smooth:  '🌊 Silliq',
    hard:    '⚡ Chiziqli',
    accel:   '🐢 Sekin → tez',
    decel:   '🚀 Tez → sekin',
    back:    '🎯 Oshib qaytish',
    elastic: '🍮 Elastik',
    custom:  '🎛 Bezier (o\'zim)',
  };

  function _ease(ud, p) {
    const m = ud.focusEase || 'smooth';
    if (m === 'custom') { const b = ud.focusBez || [0.42, 0, 0.58, 1]; return _bez(b[0], b[1], b[2], b[3], p); }
    return (EASES[m] || EASES.smooth)(p);
  }

  function camTarget(pc) {
    const a = getCamAnchor(pc);
    pc.updateMatrixWorld(true);
    if (a) {
      a.updateMatrixWorld(true);
      // ⚠ Kompozitsiya (dekompozitsiya EMAS) — pc.scale notekis,
      //   getWorldQuaternion() skew tufayli 40°+ xato beradi.
      return {
        pos: a.getWorldPosition(new THREE.Vector3()),
        quat: pc.getWorldQuaternion(new THREE.Quaternion()).multiply(a.quaternion),
      };
    }
    const p = pc.userData._screen.getWorldPosition(new THREE.Vector3());
    const q = pc.getWorldQuaternion(new THREE.Quaternion());
    return { pos: p.addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(q), 1.2), quat: q };
  }

  function _player() {
    if (window.PlayerController && PlayerController.obj) return PlayerController.obj;
    if (typeof playerMesh !== 'undefined' && playerMesh) return playerMesh;
    return null;
  }
  function _comboDown(ud) {
    const K = (typeof fpsKeys !== 'undefined') ? fpsKeys : {};
    if (!K[ud.enterKey || 'KeyE']) return false;
    if (ud.enterCtrl  && !K['ControlLeft'] && !K['ControlRight']) return false;
    if (ud.enterShift && !K['ShiftLeft']   && !K['ShiftRight'])   return false;
    if (ud.enterAlt   && !K['AltLeft']     && !K['AltRight'])     return false;
    return true;
  }

  // ── 👤 O'yinchini yashirish ─────────────────────────────────
  //   'full' — visible=false. Hech kim ko'rmaydi, soya ham yo'q.
  //   'self' — render qatlami. Kamerangiz ko'rmaydi, lekin obyekt
  //            sahnada qoladi — multiplayer'da boshqalar sizni
  //            ko'rib turadi.
  //            ⚠ Three.js soyani asosiy kamera qatlami bo'yicha
  //            filtrlaydi, shuning uchun bu rejimda O'Z soyangiz
  //            ham yo'qoladi. Soya kerak bo'lsa — 'off'.
  function _hidePlayer(pc, on) {
    const ud = pc.userData;
    const p = _player();
    if (!p) return;
    const mode = ud.hidePlayer === true ? 'full'
               : ud.hidePlayer === false ? 'off'
               : (ud.hidePlayer || 'full');

    if (on) {
      if (mode === 'off') return;
      if (mode === 'self') {
        ud._plLayers = [];
        p.traverse(o => { ud._plLayers.push([o, o.layers.mask]); o.layers.set(HIDE_LAYER); });
        if (typeof camera !== 'undefined') camera.layers.disable(HIDE_LAYER);
        ud._plHidMode = 'self';
      } else {
        ud._plVis = p.visible;
        p.visible = false;
        ud._plHidMode = 'full';
      }
      return;
    }

    // Qaytarish
    if (ud._plHidMode === 'self' && Array.isArray(ud._plLayers)) {
      ud._plLayers.forEach(([o, mask]) => { if (o) o.layers.mask = mask; });
      ud._plLayers = null;
    } else if (ud._plHidMode === 'full') {
      p.visible = (ud._plVis !== undefined) ? ud._plVis : true;
    }
    delete ud._plVis;
    ud._plHidMode = null;
  }

  function enter(pc) {
    if (!pc || !pc.userData.isPCBlock) return;
    if (!pc.userData.powered) { log('⚠ PC o\'chiq — avval yoqing', 'lw'); return; }
    _focus = pc; _blend = 0; _opened = false; _keyDown = true;
    _fromP.copy(camera.position); _fromQ.copy(camera.quaternion);
    if (pc.userData.lockKeys !== false) window._pcFocusLock = true;   // ⌨️ WASD qotadi + 👻 NOCLIP
    _hidePlayer(pc, true);
    log(`💻 ${pc.userData.name} — kirildi. Chiqish: ${(pc.userData.enterKey || 'KeyE').replace('Key', '')} yoki Esc`, 'lok');
  }

  function exit() {
    if (!_focus) return;
    const pc = _focus;

    // 🖱 Sichqoncha o'yinga qaytadi
    if (pc.userData._cssWrap) pc.userData._cssWrap.style.pointerEvents = 'none';
    if (_css3d) _css3d.domElement.style.pointerEvents = 'none';
    const _cv = document.getElementById('three-canvas');
    if (_cv) _cv.style.pointerEvents = '';     // ⚠ qaytarilishi SHART
    window._pcCursorFree = false;

    _hidePlayer(pc, false);

    _focus = null; _blend = 0; _opened = false; _keyDown = true;
    window._pcFocusLock = false;

    // Tiqilib qolgan klavishlar (keydown o'yinga, keyup iframe ga ketgan)
    if (typeof fpsKeys !== 'undefined') {
      const keep = new Set([pc.userData.enterKey || 'KeyE',
        'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight']);
      for (const k in fpsKeys) if (!keep.has(k)) delete fpsKeys[k];
    }
    if (typeof isPlaying !== 'undefined' && isPlaying) {
      const cv = document.getElementById('three-canvas');
      if (cv && cv.requestPointerLock) { try { cv.requestPointerLock(); } catch (e) {} }
    }
    log(`💻 ${pc.userData.name} — chiqildi`, 'lok');
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('message', e => {
      const d = e.data;
      if (!d || !d.__apexPC) return;
      if (d.__apexPC === 'exit') exit();
      else if (d.__apexPC === 'log') log('💻 ' + d.data, 'lok');
      else if (d.__apexPC === 'msg' && window._pcOnMessage) window._pcOnMessage(d.data);
    });
    // 🛟 Escape har doim chiqaradi — o'yinchi qamalib qolmaydi
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _focus) { e.preventDefault(); exit(); }
    }, true);
  }

  // ── ⏱ Har kadr ──────────────────────────────────────────────
  const _aScl = new THREE.Vector3();

  // ── 🌌 SKY-MESH: HTML PC teshigi fon (skybox/rasm) bilan yopilmasin ──
  //  MUAMMO: HTML rejimidagi PC ekrani "teshik" ochadi (colorWrite:false)
  //   — canvas o'sha piksellarda shaffof qoladi va ORTIDAGI CSS3D iframe
  //   ko'rinadi. Lekin `scene.background` (skybox yoki fon rasm) qo'yilsa,
  //   three.js uni butun canvas'ga OPAQUE chizadi va teshikni yopadi —
  //   iframe ko'rinmay qoladi (foydalanuvchi ko'rgan xato).
  //
  //  YECHIM: HTML PC faol bo'lganda `scene.background` ni katta ICHKI
  //   SFERAGA ko'chiramiz. Sfera — oddiy geometriya, DEPTH testga
  //   bo'ysunadi, shuning uchun ekran teshigi ortida qoladi va iframe
  //   ko'rinadi. Vizual bir xil: fon baribir hamma joyni qoplaydi.
  let _skyMesh = null, _skyStashed = null;

  //  ⚠ `isPlaying` SHARTI YO'Q — ataylab. CSS3D ekranini yasaydigan
  //    `_syncCSS()` ham faqat `powered && screenMode==='html'` ga qaraydi,
  //    ya'ni iframe MUHARRIRDA ham ko'rinadi. Ilgari bu yerda `!isPlaying`
  //    tekshiruvi turardi — natijada muharrirda sky-mesh umuman
  //    yaratilmasdi va `scene.background` (skybox rangi) teshikni yopardi.
  //    Ikkala funksiya bir xil shartga qarashi SHART.
  function _hasLiveHTMLPC() {
    if (typeof objects === 'undefined') return false;
    for (let i = 0; i < objects.length; i++) {
      const ud = objects[i].userData;
      if (ud && ud.isPCBlock && ud.powered && ud.screenMode === 'html') return true;
    }
    return false;
  }

  function _enableSkyMesh() {
    if (typeof scene === 'undefined') return;
    // Foydalanuvchi HTML PC faol paytida fonni O'ZGARTIRSA — scene.background
    // yana null bo'lmagan qiymat oladi. Bu holatда eski sky-mesh ni yangisiga
    // almashtiramiz (aks holda eski fon ko'rinib qolardi).
    if (_skyMesh && scene.background) _disableSkyMesh();

    // Sky-mesh allaqachon faol (background null) — qayta yaratmaymiz.
    if (_skyMesh && _skyStashed) return;

    const bg = scene.background;
    if (!bg) { return; }                          // fon yo'q — kerak emas
    _skyStashed = bg;

    //  depthTest: true — MAJBURIY. Ekran teshigi aynan shu orqali
    //  saqlanadi (pastdagi renderOrder izohiga qarang). depthWrite: false —
    //  sfera depth buferini iflos qilmasin, aks holda undan keyin
    //  chizilgan obyektlar yo'qolardi.
    const mat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide, depthTest: true, depthWrite: false,
      fog: false, toneMapped: false });
    if (bg.isColor) mat.color = bg.clone();
    else if (bg.isTexture) { mat.map = bg; mat.color = new THREE.Color(0xffffff); }
    else return;

    // ⚠ 🌌 SKYBOX SFERASIDAN KATTA (480 → 496). Ikkalasi ham
    //   `depthWrite:false` — ya'ni ular bir-birini DEPTH bilan
    //   to'sa olmaydi, faqat CHIZILISH TARTIBI hal qiladi.
    _skyMesh = new THREE.Mesh(new THREE.SphereGeometry(496, 32, 16), mat);
    _skyMesh.name = '__pcSkyMesh';
    //  🔑 RENDER TARTIBI — bu yerda butun tuzatish hal bo'ladi.
    //    Ekran teshigi (`screen.renderOrder = -10`) faqat DEPTH yozadi,
    //    RANG yozmaydi. Ya'ni u o'zidan KEYIN chizilgan narsalarni
    //    depth testi bilan to'sadi, OLDIN chizilganlarni emas.
    //
    //    Ilgari bu qiymat `-1000` edi — sfera ekrandan OLDIN chizilardi,
    //    butun canvas'ga (teshik joyiga ham) rangini yozib bo'lardi, keyin
    //    ekran faqat depth yozardi va sferaning rangi joyida QOLARDI.
    //    Aynan foydalanuvchi ko'rgan xato: "skybox rangi o'tib qolyapti".
    //
    //    Endi `-9.5` — ekrandan (-10) KEYIN, oddiy obyektlardan (0) OLDIN:
    //      screen(-10)  → depth yozadi, rang yo'q
    //      pcSky(-9.5)  → depth TESTIDAN o'tolmaydi (sfera r=496, uzoqroq)
    //                     → teshik joyida chizilmaydi → shaffof qoladi ✅
    //      skybox(-9)   → 🌌 SkyboxSystem ning O'Z sferasi (r=480)
    //      obyektlar(0) → yaqinroq, rang yozadi → ekranni normal to'sadi
    //    `depthWrite:false` bo'lgani uchun sfera hech nimani bloklamaydi.
    //
    // ⚠ ALOMAT (58.33): "skyboxga rasm qo'yib bo'lmayapti" — osmon
    //    tekis rang bo'lib qolardi.
    //
    // ⚠ SABAB: bu qiymat ilgari `-9` edi — 🌌 skybox sferasi bilan
    //    AYNAN BIR XIL. Teng `renderOrder` da uch.js jismlarni
    //    masofa bo'yicha saralaydi (yaqindan uzoqqa), ikkalasi ham
    //    depth YOZMAYDI — ya'ni OXIRIDA chizilgani yutadi. PC sferasi
    //    uzoqroq (490 > 480) → u OXIRIDA chizilib, skybox RASMINI
    //    o'z tekis rangi bilan bo'yab tashlardi.
    //
    //    Shuning uchun xato faqat sahnada 💻 HTML PC bo'lganda
    //    ko'rinardi va skybox tizimini qancha tekshirmang, u yerda
    //    hech qanday nuqson yo'q edi.
    _skyMesh.renderOrder = -9.5;
    _skyMesh.raycast = () => {};
    _skyMesh.frustumCulled = false;
    _skyMesh.userData.__noSave = true;
    scene.add(_skyMesh);
    scene.background = null;                       // endi sfera fon vazifasini bajaradi
  }

  function _disableSkyMesh(keepStash) {
    if (_skyMesh && typeof scene !== 'undefined') {
      // Fonni qaytaramiz (agar hali null bo'lsa)
      if (!scene.background && _skyStashed) scene.background = _skyStashed;
      scene.remove(_skyMesh);
      try { _skyMesh.geometry.dispose(); _skyMesh.material.dispose(); } catch (e) {}
      _skyMesh = null;
    }
    if (!keepStash) _skyStashed = null;
  }

  /** Har kadr: HTML PC bor bo'lsa sky-mesh yoqiladi, aks holda o'chadi.
   *  Kamera sfera markazida yursin — u bilan birga siljiydi. */
  function _updateSkyMesh() {
    if (_hasLiveHTMLPC()) {
      _enableSkyMesh();
      if (_skyMesh && typeof camera !== 'undefined') _skyMesh.position.copy(camera.position);
    } else {
      _disableSkyMesh();
    }
  }

  // ── 🎥 Effekt offsetlari qo'shilgan CSS3D kamerasi ───────────
  //   Har kadr asosiy kameradan nusxa oladi va ustiga Walk/Sprint
  //   tebranishi + silkinish offsetlarini qo'yadi. Hech qanday effekt
  //   yo'q bo'lsa — asosiy kameraning O'ZI qaytariladi (ortiqcha ish yo'q).
  let _cssCam = null;
  const _fxEuler = new THREE.Euler();
  const _fxQuat  = new THREE.Quaternion();

  function _fxCamera() {
    let px = 0, py = 0, pz = 0, pitch = 0, yaw = 0, roll = 0, fov = 0;

    for (const sys of [window.CameraStateSystem, window.CameraShakeSystem]) {
      if (!sys || typeof sys.getCamFx !== 'function') continue;
      let fx; try { fx = sys.getCamFx(); } catch (e) { continue; }
      if (!fx) continue;
      if (fx.pos) { px += fx.pos.x || 0; py += fx.pos.y || 0; pz += fx.pos.z || 0; }
      if (fx.rot) { pitch += fx.rot.pitch || 0; yaw += fx.rot.yaw || 0; roll += fx.rot.roll || 0; }
      fov += fx.fov || 0;
    }

    // Effekt yo'q — asosiy kamera aynan to'g'ri keladi.
    if (!px && !py && !pz && !pitch && !yaw && !roll && Math.abs(fov) < 0.001) return camera;

    if (!_cssCam) _cssCam = camera.clone();
    // ⚠ `clone()` bir marta — keyin har kadr faqat qiymat ko'chiriladi.
    //   Aks holda har kadr yangi kamera obyekti yasalardi (GC bosimi).
    _cssCam.position.copy(camera.position);
    _cssCam.position.x += px; _cssCam.position.y += py; _cssCam.position.z += pz;
    _cssCam.quaternion.copy(camera.quaternion);
    if (pitch || yaw || roll) {
      _fxEuler.set(pitch, yaw, roll, 'YXZ');
      _fxQuat.setFromEuler(_fxEuler);
      _cssCam.quaternion.multiply(_fxQuat);
    }
    if (camera.isPerspectiveCamera) {
      _cssCam.aspect = camera.aspect;
      _cssCam.near   = camera.near;
      _cssCam.far    = camera.far;
      _cssCam.fov    = Math.max(1, Math.min(179, camera.fov + fov));
      _cssCam.updateProjectionMatrix();
    }
    _cssCam.updateMatrixWorld(true);
    return _cssCam;
  }

  function update(delta) {
    if (typeof objects === 'undefined') return;
    const playing = (typeof isPlaying !== 'undefined') && isPlaying;
    const _now = performance.now();
    _updateSkyMesh();   // 🌌 HTML PC teshigi fon bilan yopilmasin

    for (let i = 0; i < objects.length; i++) {
      const pc = objects[i];
      if (!pc.userData || !pc.userData.isPCBlock) continue;
      _syncCSS(pc);

      // 📷 Kamera feed — asosiy renderdan OLDIN chiziladi.
      //    Rejim o'zgargan/o'chirilgan bo'lsa, RT ni bo'shatamiz:
      //    render target GPU xotirasini ushlab turadi va uni hech kim
      //    avtomatik yig'maydi.
      const wantFeed = pc.userData.powered && pc.userData.screenMode === 'camera';
      if (wantFeed) _renderFeed(pc, _now);
      else if (pc.userData._feedRT) _disposeFeed(pc);

      const a = getCamAnchor(pc) || (playing ? null : ensureCamAnchor(pc));
      if (a) {
        a.visible = !playing;
        const ws = pc.getWorldScale(_aScl);
        a.scale.set(1 / (ws.x || 1), 1 / (ws.y || 1), 1 / (ws.z || 1));   // ikonka cho'zilmasin
      }
    }
    // ⚠ Canvas o'lchami panel ochilishi/Play rejimi bilan o'zgaradi, lekin
    //   window 'resize' hodisasi kelmaydi. Sinxron bo'lmasa CSS3D
    //   proyeksiyasi markazi siljib, ekran mesh'dan chetga chiqadi.
    if (_css3d) {
      const cv = document.getElementById('three-canvas');
      if (cv) {
        const s = _css3d.getSize();
        if (s.width !== cv.clientWidth || s.height !== cv.clientHeight) {
          _css3d.setSize(cv.clientWidth, cv.clientHeight);
        }
      }
    }
    // ── 🎥 CSS3D KAMERASI — WebGL bilan AYNAN bir xil bo'lishi shart ──
    //   CameraStateSystem (Walk/Run/Sprint tebranishi) va CameraShakeSystem
    //   (silkinish) kamerani FAQAT `renderer.render()` patch ichida siljitadi
    //   va darhol qaytarib oladi. CSS3DRenderer — ALOHIDA renderer, u o'sha
    //   patch'ni ko'rmaydi va TOZA kamerani oladi.
    //
    //   Natijada: WebGL chizgan "teshik" effekt bilan tebranadi, ortidagi
    //   iframe esa qimirlamaydi → HTML ekran ichida SILKINIB turganday
    //   ko'rinadi (foydalanuvchi ko'rgan xato: yurish/sprint paytida
    //   PC blok ichidagi HTML tebranadi).
    //
    //   Yechim: CSS3D uchun alohida kamera — asosiy kameradan nusxa olinadi
    //   va ustiga o'sha effekt offsetlari qo'shiladi. Ikkala renderer endi
    //   bir xil transformni ko'radi → tebranish yo'q.
    if (_css3d && _cssScene && typeof camera !== 'undefined') {
      _css3d.render(_cssScene, _fxCamera());
    }

    if (!playing) { if (_focus) exit(); _keyDown = false; return; }

    // ── Fokus yo'q — eng yaqin YOQILGAN PC ni qidiramiz ──
    if (!_focus) {
      const pl = _player();
      const pp = pl && pl.position;
      if (!pp) { _keyDown = false; return; }
      let best = null, bd = Infinity;
      for (let i = 0; i < objects.length; i++) {
        const o = objects[i], ud = o.userData;
        if (!ud || !ud.isPCBlock || !ud.powered) continue;
      if (ud._mlHidden) continue;              // Map Loader yashirgan — mavjud emas
        const d = o.getWorldPosition(_wp).distanceTo(pp);
        if (d <= (ud.interactDist ?? 3.5) && d < bd) { bd = d; best = o; }
      }
      const down = best ? _comboDown(best.userData) : false;
      if (down && !_keyDown) { enter(best); return; }
      _keyDown = down;
      return;
    }

    // ── Fokusdamiz ──
    const down = _comboDown(_focus.userData);
    if (down && !_keyDown) { exit(); return; }
    _keyDown = down;

    const sp = Math.max(0.2, _focus.userData.focusSpeed ?? 3);
    _blend = Math.min(1, _blend + delta * sp);
    const e = _ease(_focus.userData, _blend);
    const t = camTarget(_focus);
    camera.position.lerpVectors(_fromP, t.pos, e);
    camera.quaternion.copy(_fromQ).slerp(t.quat, e);
    camera.rotation.order = 'YXZ';

    // Yetib bordi → sichqoncha FAQAT ekran chegarasida ishlaydi
    if (_blend >= 1 && !_opened) {
      _opened = true;
      const ud = _focus.userData;
      if (ud._cssWrap) ud._cssWrap.style.pointerEvents = 'auto';
      if (_css3d) _css3d.domElement.style.pointerEvents = 'none';   // ← konteyner o'tkazuvchi
      // ⚠ CSS3D canvas OSTIDA turadi — canvas bosishlarni ushlab qoladi.
      //   Fokusda uni o'tkazuvchi qilamiz, shunda bosish pastdagi
      //   <iframe> ga tushadi. Chiqishda albatta qaytariladi.
      const _cv = document.getElementById('three-canvas');
      if (_cv) _cv.style.pointerEvents = 'none';
      try { if (document.pointerLockElement) document.exitPointerLock(); } catch (er) {}
      window._pcCursorFree = true;
      log('🖱 Kursor ochildi — ekranni bosishingiz mumkin', 'lok');
      if (ud.lockKeys !== false && typeof fpsKeys !== 'undefined') {
        for (const k in fpsKeys) delete fpsKeys[k];
      }
      _keyDown = false;
    }
  }

  // ── 🧹 Play to'xtaganda ─────────────────────────────────────
  function onPlayStop() {
    if (_focus) exit();
    _keyDown = false;
    _disableSkyMesh();   // 🌌 fon (skybox/rasm) ni qaytaramiz
    objects.forEach(o => {
      if (o.userData && o.userData.isPCBlock) { o.userData._losT = 0; o.userData._losV = undefined; }
    });
  }

  return {
    create, restore, rebuild, defaults, setPower, fire, setHtml, update, onPlayStop,
    fxCss,                              // 🎛 ekran filtri (inspektor va test uchun)
    enter, exit, camTarget, ensureCamAnchor, getCamAnchor, resetCamAnchor,
    isFocused: () => !!_focus, focused: () => _focus,
    EASES, EASE_LABELS, _ease,          // 🎛 silliqlik egri chizig'i
    _paintScreen, _build, _disposeFeed,
  };
})();

window.addPCBlock = function () {
  const p = new THREE.Vector3(0, 1.6, 0);
  if (typeof camera !== 'undefined' && camera) {
    p.set(camera.position.x + Math.sin(camera.rotation.y) * -4,
          Math.max(1.2, camera.position.y),
          camera.position.z + Math.cos(camera.rotation.y) * -4);
  }
  return PCBlockSystem.create(p);
};

// ── 📷 Kamera feed sozlagichlari ─────────────────────────────
// Sahnadagi barcha 🎥 Kamera obyektlari
window._pcCamList = function () {
  if (typeof objects === 'undefined') return [];
  return objects.filter(o => o && o.userData && o.userData.isCamera);
};

window._pcSetCam = function (id) {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  selectedObj.userData.camSource = id || null;
  PCBlockSystem._paintScreen(selectedObj);
  const c = _pcCamList().find(x => String(x.userData.id) === String(id));
  log(c ? `📷 Ekran manbai: ${c.userData.name}` : '📷 Kamera manbai olib tashlandi', 'lok');
  updateInspector();
};

window._pcSetCamRes = function (r) {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  selectedObj.userData.camRes = r;
  // ⚠ Eski RT boshqa o'lchamda — uni bo'shatamiz, _ensureFeed yangisini
  //   yaratadi. Bo'shatmasak, GPU da eski buferlar to'planib borardi.
  PCBlockSystem._disposeFeed(selectedObj);
  PCBlockSystem._paintScreen(selectedObj);
  log(`📷 Feed sifati: ${r}px`, 'lok');
};

// ── Sozlagichlar ─────────────────────────────────────────────
/**
 * 🎛 Bitta ekran filtri qiymatini o'zgartiradi.
 * ⚠ `PCBlockSystem` ICHIDAGI `_applyFx` ga kirish yo'q, shuning
 *   uchun `_paintScreen` orqali o'tamiz — u `_syncCSS` ni ham
 *   ishga soladi va filtr o'sha yerda qo'llanadi.
 */
window._pcFx = function (k, v) {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  const ud = selectedObj.userData;
  if (!ud.screenFx) ud.screenFx = {};
  ud.screenFx[k] = v;
  //  ⚠ Tayyor tanlov endi \"o'zim sozladim\" bo'ldi — tugma yonib
  //    turmasin, aks holda dizayner qaysi holatda ekanini bilmasdi.
  ud._fxPreset = null;
  PCBlockSystem._paintScreen(selectedObj);
  updateInspector();
};

/**
 * 🎛 Tayyor ekran ko'rinishlari.
 * ⚠ NEGA TAYYOR: sakkizta slayderni qo'lda sozlab \"kuzatuv
 *   kamerasi\" chiqarish uchun tajriba kerak. Bir bosishda tayyor
 *   natija dizaynerni ishga qaytaradi.
 */
window._pcFxPreset = function (k) {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  const P = {
    cctv:   { grayscale: 1, contrast: 1.4, brightness: 0.85, blur: 0.4 },
    retro:  { sepia: 0.5, saturation: 0.6, contrast: 1.15, hue: 90 },
    glitch: { invert: 0.15, saturation: 2.2, contrast: 1.5, hue: 200 },
  };
  selectedObj.userData.screenFx = P[k] ? Object.assign({}, P[k]) : null;
  selectedObj.userData._fxPreset = P[k] ? k : null;
  PCBlockSystem._paintScreen(selectedObj);
  updateInspector();
};

window._pcSet = function (k, v) {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  selectedObj.userData[k] = v;
  if (['bezel', 'bodyColor'].includes(k)) PCBlockSystem.rebuild(selectedObj);
  else PCBlockSystem._paintScreen(selectedObj);
  if (k === 'powered' && !v && PCBlockSystem.focused() === selectedObj) PCBlockSystem.exit();
  updateInspector();
};
/**
 * 🎛 Bezier tugunlari.
 * ⚠ `x` 0…1 oralig'ida QAT'IY: undan tashqarida egri chiziq "orqaga"
 *   qaytadi va `_bez()` ning Nyuton iteratsiyasi yechim topolmaydi —
 *   o'tish sakrab ketardi. `y` esa erkin (oshib qaytish uchun).
 */
window._pcSetBez = function (i, v) {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  const ud = selectedObj.userData;
  ud.focusBez = (ud.focusBez || [0.42, 0, 0.58, 1]).slice();
  let n = parseFloat(v); if (!isFinite(n)) n = 0;
  ud.focusBez[i] = (i === 0 || i === 2) ? Math.max(0, Math.min(1, n)) : Math.max(-3, Math.min(3, n));
};
window._pcSetHtml = function (v) {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  selectedObj.userData.html = String(v);
};
window._pcSetKey = function (code) {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  selectedObj.userData.enterKey = code || 'KeyE';
  log(`💻 Kirish klavishi → ${window._friendlyKey(code)}`, 'lok');
  updateInspector();
};
window._pcPickImage = function () {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  const pc = selectedObj;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      pc.userData.imageB64 = rd.result;
      pc.userData.imageName = f.name;
      pc.userData.screenMode = 'image';
      pc.userData.powered = true;      // rasm darrov ko'rinsin (o'chiq bo'lsa ko'rinmasdi)
      PCBlockSystem._paintScreen(pc);
      log(`🖼 Ekranga rasm: ${f.name}`, 'lok');
      updateInspector();
    };
    rd.readAsDataURL(f);
  };
  inp.click();
};
window._pcResetCam = function () {
  if (!selectedObj || !selectedObj.userData.isPCBlock) return;
  PCBlockSystem.resetCamAnchor(selectedObj);
  log('📷 Kamera lankasi standart holatga qaytdi', 'lok');
};

// ── 🖥 Inspector ─────────────────────────────────────────────
function buildPCBlockInspector(o) {
  // 📷 lanka tanlansa — asosiy PC ni ko'rsatamiz
  if (o.userData.isPCCam) {
    const host = objects.find(x => String(x.userData && x.userData.id) === String(o.userData._pcId));
    if (host) { selectObject(host); return; }
  }
  const ud = o.userData;
  const ic = $('inspector-content');
  const p = o.position, r = o.rotation, s = o.scale;
  const SEL = "width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);" +
              "border-radius:3px;padding:3px 5px;font-size:11px;font-family:'Share Tech Mono',monospace";
  const btn = (on, act, ico, txt, col) => `
    <button onclick="${act}" style="flex:1;background:${on ? col + '22' : 'none'};
      border:1px solid ${on ? col : 'var(--border)'};color:${on ? col : 'var(--muted)'};
      border-radius:3px;padding:4px 0;cursor:pointer;font-size:10px;
      font-family:'Rajdhani',sans-serif;font-weight:700">${ico} ${txt}</button>`;
  const hp = (ud.hidePlayer === true) ? 'full' : (ud.hidePlayer === false) ? 'off' : (ud.hidePlayer || 'full');

  ic.innerHTML = `
    <div class="comp-block">
      <div class="comp-title">💻 PC</div>
      <div class="fr"><span class="fl">Nomi</span>
        <input class="fv" value="${ud.name || ''}" oninput="selectedObj.userData.name=this.value;updateHierarchy()"></div>

      <div style="display:flex;gap:4px;margin:7px 0">
        <button onclick="window._pcSet('powered', ${!ud.powered})"
          style="flex:1;background:${ud.powered ? 'rgba(var(--accent3-rgb),.15)' : 'none'};
          border:1px solid ${ud.powered ? 'var(--accent3)' : 'var(--border)'};
          color:${ud.powered ? 'var(--accent3)' : 'var(--muted)'};border-radius:3px;padding:5px 0;
          cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:11px">
          ${ud.powered ? '🟢 YONIQ' : '⚫ O\'CHIQ'}
        </button>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;font-family:'Share Tech Mono',monospace">
        O'yinda tugma (🔘 Tugma → 💻 PC) bilan yoqiladi. Bu yerdagi tugma — sinov uchun.
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title">🖥 EKRAN</div>
      <div style="display:flex;gap:4px;margin-bottom:6px">
        ${btn(ud.screenMode === 'html',   "window._pcSet('screenMode','html')",   '🌐', 'HTML',  'var(--accent3)')}
        ${btn(ud.screenMode === 'canvas', "window._pcSet('screenMode','canvas')", '🎨', 'Canvas', 'var(--accent3)')}
        ${btn(ud.screenMode === 'image',  "window._pcPickImage()",                '🖼', 'Rasm',  'var(--accent)')}
        ${btn(ud.screenMode === 'camera', "window._pcSet('screenMode','camera')", '📷', 'Kamera', 'var(--accent4)')}
        ${btn(ud.screenMode === 'off',    "window._pcSet('screenMode','off')",    '⚫', 'O\'chiq', '#888')}
      </div>

      <!--  🎨 CANVAS — tayyor canvas ni ekranga qo'yadi.
            ⚠ Shunda dizayner bitta narsani IKKI marta yozmaydi:
              o'sha canvas ham HUD bo'lib ekranda turadi, ham PC
              monitorida ko'rinadi. O'rin tutuvchilar ikkalasida
              ham ishlaydi. -->
      ${ud.screenMode === 'canvas' ? `
      <div class="fr"><span class="fl">🎨 Canvas</span>
        <select onchange="window._pcSet('canvasId', this.value ? +this.value : null)" style="${SEL}">
          <option value="">— tanlang —</option>
          ${(window._canvases || []).map(c => `<option value="${c.id}"
            ${ud.canvasId === c.id ? 'selected' : ''}>${escapeHtml(String(c.name || ('Canvas ' + c.id)))}</option>`).join('')}
        </select>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-2px 0 6px">
        ${(window._canvases || []).length
          ? "Canvas ning HTML va CSS i ekranga tushadi — o'rin tutuvchilar ham ishlaydi."
          : "Hali canvas yo'q — 🎨 CANVAS bo'limidan yarating."}
      </div>` : ''}

      <!--  EKRAN FILTRI - FAQAT shu ekranga.
            Filtrlar menyusi (ColorGrade) BUTUN o'yinga ta'sir qiladi.
            Bu esa faqat shu monitorga: kuzatuv kamerasi oq-qora,
            eski monitor yashil bo'lsin. -->
      ${ud.screenMode !== 'off' ? `
      <div style="border-top:1px solid var(--border);margin-top:7px;padding-top:6px">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
          <span class="fl" style="flex:1">\u{1F39B} Ekran filtri</span>
          ${[["Yo'q",''],['Kuzatuv','cctv'],['Eski','retro'],['Buzuq','glitch']].map(pr => {
            const on = (ud._fxPreset || '') === pr[1];
            return `<button onclick="window._pcFxPreset('${pr[1]}')"
              style="padding:2px 6px;border-radius:3px;cursor:pointer;font-size:9px;
              font-family:'Share Tech Mono',monospace;
              border:1px solid ${on ? 'var(--accent3)' : 'var(--border)'};
              background:${on ? 'rgba(var(--accent3-rgb),.12)' : 'transparent'};
              color:${on ? 'var(--accent3)' : 'var(--muted)'}">${pr[0]}</button>`;
          }).join('')}
        </div>
        ${[['grayscale','Oq-qora',0,1,0.05,0],['sepia','Sepiya',0,1,0.05,0],
           ['invert','Teskari',0,1,0.05,0],['contrast','Kontrast',0,3,0.05,1],
           ['brightness',"Yorug'lik",0,2,0.05,1],['saturation',"To'yinganlik",0,3,0.05,1],
           ['blur','Xiralik (px)',0,8,0.1,0],['hue','Rang burchagi',0,360,1,0]].map(f => {
          const v = (ud.screenFx && isFinite(+ud.screenFx[f[0]])) ? +ud.screenFx[f[0]] : f[5];
          return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px">${f[1]}</span>
            <input type="range" min="${f[2]}" max="${f[3]}" step="${f[4]}" value="${v}"
              oninput="window._pcFx('${f[0]}', parseFloat(this.value))" style="flex:1">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent3);min-width:32px;text-align:right">${v}</span>
          </div>`;
        }).join('')}
        ${(ud.screenMode === 'camera' || ud.screenMode === 'image') ? `
        <div style="font-size:8px;color:#ffaa44;line-height:1.6;margin-top:4px">
          \u26A0 Rasm va kamera - TEKSTURA, ularga CSS filtri tegmaydi.
          Bu rejimlarda faqat <b>Yorug'lik</b> ishlaydi. To'liq filtr
          HTML va Canvas ekranlarida.
        </div>` : ''}
      </div>` : ''}

      <!--  TIMELINE - SHU PC uchun.
            ⚠ Ilgari tugmalar umumiy timeline toolbarida edi va
              sahnada o'nlab PC bo'lsa qaysi biriga tegishini
              AYTMASDI - dizayner tasodifiy blokka key qo'yardi.
              Bu yerda savol umuman tug'ilmaydi: tanlangan PC. -->
      <div style="border-top:1px solid var(--border);margin-top:7px;padding-top:6px">
        <div class="fl" style="margin-bottom:4px">\u23F1 Timeline — shu PC uchun</div>
        <div style="display:flex;gap:4px">
          <button onclick="window.tlAddPCCamKeyframe && tlAddPCCamKeyframe()"
            style="flex:1;padding:4px;border-radius:3px;cursor:pointer;font-size:9px;
            font-family:'Share Tech Mono',monospace;border:1px solid var(--accent4);
            background:rgba(var(--accent4-rgb),.08);color:var(--accent4)"
            title="Shu paytdagi KAMERA manbaini key qilib yozadi">\u{1F4F7} Kamera keyi</button>
          <button onclick="window.tlAddPCFxKeyframe && tlAddPCFxKeyframe()"
            style="flex:1;padding:4px;border-radius:3px;cursor:pointer;font-size:9px;
            font-family:'Share Tech Mono',monospace;border:1px solid var(--accent3);
            background:rgba(var(--accent3-rgb),.08);color:var(--accent3)"
            title="Shu paytdagi EKRAN FILTRINI key qilib yozadi">\u{1F39B} Filtr keyi</button>
        </div>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:4px">
          Vaqtni qo'ying, kamerani yoki filtrni sozlang, keyin tugmani bosing.
          Kamera QADAMLI o'tadi, filtr esa silliq.
        </div>
      </div>

      ${ud.screenMode === 'camera' ? `
      <div class="fr"><span class="fl">Manba</span>
        <select onchange="window._pcSetCam(this.value)" style="${SEL}">
          <option value="">— kamera tanlang —</option>
          ${_pcCamList().map(c => `<option value="${escapeHtml(String(c.userData.id))}"
            ${String(ud.camSource) === String(c.userData.id) ? 'selected' : ''}>
            ${escapeHtml(c.userData.name || 'Kamera')}</option>`).join('')}
        </select>
      </div>
      ${_pcCamList().length ? '' : `<div style="font-size:9px;color:var(--accent2);margin:4px 0">
        ⚠ Sahnada kamera yo'q. ASSETLAR → 🎥 Kamera qo'shing.</div>`}
      <div class="fr"><span class="fl">FPS</span>
        <input type="number" min="1" max="60" value="${ud.camFps ?? 15}"
          oninput="window._pcSet('camFps', Math.max(1, Math.min(60, +this.value || 15)))"
          style="${SEL}">
      </div>
      <div class="fr"><span class="fl">Sifat</span>
        <select onchange="window._pcSetCamRes(+this.value)" style="${SEL}">
          ${[128, 256, 512, 1024].map(r => `<option value="${r}"
            ${(ud.camRes || 512) === r ? 'selected' : ''}>${r}px</option>`).join('')}
        </select>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:4px;font-family:'Share Tech Mono',monospace">
        Tanlangan kameraning ko'rinishi ekranga jonli uzatiladi.<br>
        <span style="color:var(--border)">Tasvirni aylantirish (o'ng-chap / yuqori-past)
        kameraning O'ZIDA sozlanadi — kamerani tanlab, inspektordan.
        Har kadr TO'LIQ sahna qayta chiziladi — FPS va sifatni oshirmang.</span>
      </div>
      ` : ''}

      ${ud.screenMode === 'html' ? `
      <textarea oninput="window._pcSetHtml(this.value)" spellcheck="false"
        style="width:100%;min-height:140px;background:rgba(0,0,0,.4);border:1px solid var(--border);
        color:#9fe8c0;border-radius:3px;padding:6px 8px;font-family:'Share Tech Mono',monospace;
        font-size:11px;resize:vertical;outline:none;line-height:1.45;box-sizing:border-box"
        >${String(ud.html || '').replace(/</g, '&lt;')}</textarea>
      <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.6;font-family:'Share Tech Mono',monospace">
        Haqiqiy DOM — <b style="color:var(--accent3)">&lt;input&gt;, &lt;button&gt;, CSS, JS ishlaydi</b>.<br>
        Sahifa ichidan: <b style="color:var(--accent)">APEX.exit()</b> — chiqish,
        <b style="color:var(--accent)">APEX.log(m)</b> — konsolga,
        <b style="color:var(--accent)">APEX.send(d)</b> — o'yinga (<span style="color:var(--border)">window._pcOnMessage</span>).
      </div>` : ''}

      ${ud.screenMode === 'image' ? `
      <div style="font-size:9px;color:${ud.imageB64 ? 'var(--accent3)' : '#ff8844'};font-family:'Share Tech Mono',monospace">
        ${ud.imageB64 ? '✅ ' + (ud.imageName || 'rasm') : '⚠ Rasm tanlanmagan'}
      </div>
      <div class="fr"><span class="fl">Porlasin</span>
        <input type="checkbox" ${ud.glow ? 'checked' : ''} onchange="window._pcSet('glow', this.checked)"></div>` : ''}

      <div class="fr"><span class="fl">Fon rangi</span>
        <input type="color" value="${ud.screenBg || '#080c12'}" onchange="window._pcSet('screenBg', this.value)"
          style="width:100%;height:22px;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer"></div>
      <div class="fr"><span class="fl">Ekran eni (px)</span>
        <input class="fv" type="number" step="128" min="128" max="2048" value="${ud.screenRes || 1024}"
          oninput="window._pcSet('screenRes', Math.max(128, Math.min(2048, parseInt(this.value)||1024)))"></div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;font-family:'Share Tech Mono',monospace">
        Balandligi blok nisbatidan avtomatik olinadi — HTML cho'zilmaydi.
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title">⌨ KIRISH</div>
      <div class="fr"><span class="fl">Klavish</span>
        <input class="fv" readonly data-cur="${window._friendlyKey(ud.enterKey)}"
          value="${window._friendlyKey(ud.enterKey)}"
          onfocus="this.value='bosing...'"
          onblur="this.value=this.getAttribute('data-cur')"
          onkeydown="event.preventDefault();event.stopPropagation();window._pcSetKey(event.code);this.blur();"
          style="text-align:center;cursor:pointer"></div>
      <div class="fr"><span class="fl">Kombinatsiya</span>
        <div style="display:flex;gap:3px;flex:1">
          ${btn(ud.enterCtrl,  `window._pcSet('enterCtrl',${!ud.enterCtrl})`,   '', 'Ctrl',  'var(--accent2)')}
          ${btn(ud.enterShift, `window._pcSet('enterShift',${!ud.enterShift})`, '', 'Shift', 'var(--accent2)')}
          ${btn(ud.enterAlt,   `window._pcSet('enterAlt',${!ud.enterAlt})`,     '', 'Alt',   'var(--accent2)')}
        </div></div>
      <div class="fr"><span class="fl">Masofa (m)</span>
        <input class="fv" type="number" step="0.5" min="0.5" value="${(ud.interactDist ?? 3.5).toFixed(1)}"
          oninput="window._pcSet('interactDist', Math.max(0.5, parseFloat(this.value)||3.5))"></div>
      <div class="fr"><span class="fl">Tezlik</span>
        <input class="fv" type="number" step="0.5" min="0.2" value="${(ud.focusSpeed ?? 3).toFixed(1)}"
          oninput="window._pcSet('focusSpeed', Math.max(0.2, parseFloat(this.value)||3))"></div>
      <div class="fr"><span class="fl">Silliqlik</span>
        <select onchange="window._pcSet('focusEase', this.value)" style="${SEL}">
          ${Object.keys(PCBlockSystem.EASE_LABELS).map(k =>
            `<option value="${k}" ${(ud.focusEase || 'smooth') === k ? 'selected' : ''}>${PCBlockSystem.EASE_LABELS[k]}</option>`).join('')}
        </select></div>
      ${(ud.focusEase === 'custom') ? (() => {
        const b = ud.focusBez || [0.42, 0, 0.58, 1];
        const f = (i, lbl) => `<div style="flex:1;display:flex;align-items:center;gap:3px">
            <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">${lbl}</span>
            <input type="number" step="0.05" value="${b[i]}" style="width:100%;background:var(--bg);
              border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;
              font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
              oninput="window._pcSetBez(${i}, this.value)"></div>`;
        return `<div style="display:flex;gap:4px;margin:3px 0">${f(0,'x1')}${f(1,'y1')}</div>
                <div style="display:flex;gap:4px;margin-bottom:3px">${f(2,'x2')}${f(3,'y2')}</div>
                <div style="font-size:8px;color:var(--muted);line-height:1.5;font-family:'Share Tech Mono',monospace">
                  CSS <b>cubic-bezier(x1,y1,x2,y2)</b> bilan bir xil.
                  Masalan <b>0.68, -0.55, 0.27, 1.55</b> — oshib qaytadi.</div>`;
      })() : ''}
      <button onclick="window._pcResetCam()" style="width:100%;margin-top:5px;background:rgba(var(--accent-rgb),.1);
        border:1px solid rgba(var(--accent-rgb),.4);color:var(--accent);border-radius:3px;padding:4px 0;cursor:pointer;
        font-family:'Rajdhani',sans-serif;font-weight:700;font-size:10px">📷 Kamera nuqtasini tiklash</button>
      <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.5;font-family:'Share Tech Mono',monospace">
        📷 lankani gizmo bilan surib, kamera qayerdan qarashini o'zingiz belgilashingiz mumkin.
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title">👤 O'YINCHI</div>
      <div class="fr"><span class="fl">Yashirish</span>
        <select onchange="window._pcSet('hidePlayer', this.value)" style="${SEL}">
          <option value="full" ${hp === 'full' ? 'selected' : ''}>🚫 To'liq yashirish</option>
          <option value="self" ${hp === 'self' ? 'selected' : ''}>👁 Faqat o'zimdan</option>
          <option value="off"  ${hp === 'off'  ? 'selected' : ''}>✅ Yashirmaslik</option>
        </select></div>
      <div class="fr"><span class="fl">Klavishlar qotsin</span>
        <input type="checkbox" ${ud.lockKeys !== false ? 'checked' : ''} onchange="window._pcSet('lockKeys', this.checked)"></div>
      <div style="font-size:8px;color:var(--muted);margin-top:4px;line-height:1.6;font-family:'Share Tech Mono',monospace">
        <b style="color:var(--accent2)">To'liq</b> — hech kim ko'rmaydi (soya ham yo'q).<br>
        <b style="color:var(--accent2)">Faqat o'zimdan</b> — siz ko'rmaysiz, multiplayer'da boshqalar ko'radi.
        <span style="color:var(--border)">Bu rejimda o'z soyangiz ham yo'qoladi (Three.js cheklovi).</span>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title">👁 KO'RINISH</div>
      <div class="fr"><span class="fl">Rejim</span>
        <select onchange="window._pcSet('screenVis', this.value)" style="${SEL}">
          <option value="depth"  ${(ud.screenVis || 'depth') === 'depth' ? 'selected' : ''}>🕳 Aniq (depth — piksel darajasida)</option>
          <option value="los"    ${ud.screenVis === 'los' ? 'selected' : ''}>🧱 Ko'rish chizig'i (raycast)</option>
          <option value="always" ${ud.screenVis === 'always' ? 'selected' : ''}>♾ Har doim</option>
          <option value="focus"  ${ud.screenVis === 'focus'  ? 'selected' : ''}>🎯 Faqat fokusda</option>
        </select></div>
      <div class="fr"><span class="fl">Maks. masofa (m)</span>
        <input class="fv" type="number" step="1" min="0" value="${ud.screenMaxDist ?? 25}"
          oninput="window._pcSet('screenMaxDist', Math.max(0, parseFloat(this.value)||0))"></div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;font-family:'Share Tech Mono',monospace">
        <b style="color:var(--accent3)">🕳 Aniq</b> — ekran chuqurlik teshigi; obyekt yarim to'ssa,
        aynan o'sha yarmi to'siladi. Tavsiya etiladi.<br>
        <b style="color:var(--accent2)">🧱 Raycast</b> — eski usul: to'silsa ekran BUTUNLAY yo'qoladi.
        ~90ms da bir marta tekshiriladi.<br>0 = cheksiz masofa.
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title">🔧 KORPUS</div>
      <div class="fr"><span class="fl">Rangi</span>
        <input type="color" value="${ud.bodyColor || '#16191f'}" onchange="window._pcSet('bodyColor', this.value)"
          style="width:100%;height:22px;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer"></div>
      <div class="fr"><span class="fl">Ramka</span>
        <input class="fv" type="number" step="0.01" min="0" max="0.35" value="${(ud.bezel ?? BEZEL).toFixed(3)}"
          oninput="window._pcSet('bezel', Math.max(0, Math.min(0.35, parseFloat(this.value)||0)))"></div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;font-family:'Share Tech Mono',monospace">
        Ramka = ekran atrofidagi korpus. Ekran old yuzada — depth teshigi ishlashi uchun.
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title">🔒 SANDBOX</div>
      <div class="fr"><span class="fl">Formalar</span>
        <input type="checkbox" ${ud.allowForms !== false ? 'checked' : ''} onchange="window._pcSet('allowForms', this.checked)"></div>
      <div class="fr"><span class="fl">Popup</span>
        <input type="checkbox" ${ud.allowPopups ? 'checked' : ''} onchange="window._pcSet('allowPopups', this.checked)"></div>
      <div class="fr"><span class="fl">same-origin</span>
        <input type="checkbox" ${ud.allowSameOrigin ? 'checked' : ''} onchange="window._pcSet('allowSameOrigin', this.checked)"></div>
      <div style="font-size:8px;color:#ff8844;margin-top:4px;line-height:1.5;font-family:'Share Tech Mono',monospace">
        ⚠ same-origin — sahifa o'yin sahifasiga to'liq kira oladi. Faqat o'z kodingizga yoqing.
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title">📐 TRANSFORM</div>
      <div class="xyz">
        <div><input class="xi" value="${p.x.toFixed(2)}" oninput="selectedObj.position.x=parseFloat(this.value)||0"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" value="${p.y.toFixed(2)}" oninput="selectedObj.position.y=parseFloat(this.value)||0"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" value="${p.z.toFixed(2)}" oninput="selectedObj.position.z=parseFloat(this.value)||0"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
      <div class="xyz" style="margin-top:4px">
        <div><input class="xi" value="${(r.x * 180 / Math.PI).toFixed(1)}" oninput="selectedObj.rotation.x=(parseFloat(this.value)||0)*Math.PI/180"><div class="xl">RX</div></div>
        <div><input class="xi" value="${(r.y * 180 / Math.PI).toFixed(1)}" oninput="selectedObj.rotation.y=(parseFloat(this.value)||0)*Math.PI/180"><div class="xl">RY</div></div>
        <div><input class="xi" value="${(r.z * 180 / Math.PI).toFixed(1)}" oninput="selectedObj.rotation.z=(parseFloat(this.value)||0)*Math.PI/180"><div class="xl">RZ</div></div>
      </div>
      <div class="xyz" style="margin-top:4px">
        <div><input class="xi" value="${s.x.toFixed(2)}" oninput="selectedObj.scale.x=Math.max(0.01,parseFloat(this.value)||1)"><div class="xl">W</div></div>
        <div><input class="xi" value="${s.y.toFixed(2)}" oninput="selectedObj.scale.y=Math.max(0.01,parseFloat(this.value)||1)"><div class="xl">H</div></div>
        <div><input class="xi" value="${s.z.toFixed(2)}" oninput="selectedObj.scale.z=Math.max(0.01,parseFloat(this.value)||1)"><div class="xl">D</div></div>
      </div>
    </div>
  `;
}
window.buildPCBlockInspector = buildPCBlockInspector;
