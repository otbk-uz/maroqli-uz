// ============================================================
//  🔢 MINIPAD  v1.0  (build 58.31)
// ------------------------------------------------------------
//  Kombinatsiyali QULF. O'yinchi parol kiritadi — to'g'ri bo'lsa,
//  belgilangan kechikishdan keyin animatsiya/ovoz ishga tushadi.
//
//  ── Ko'rinish (4 xil) ────────────────────────────────────────
//    🔢 numpad    — kalkulyator: kichkina ekran + raqamlar
//    ⌨ keyboard   — harflar (@#$&- belgilari kamdan-kam uchraydi)
//    ⌨🔢 both     — numpad yonida klaviatura
//    ▭ screen     — faqat ekrancha: o'yinchi FIZIK klaviaturada yozadi
//
//  ── ⚠ KLAVIATURA QAYERDA ISHLAYDI ──────────────────────────
//    ▭ Ekranchada — FAQAT fizik klaviatura (yordamchi tugmalar yo'q).
//    🔢 ⌨ ⌨🔢 da  — FAQAT o'yin ichidagi tugmalar; fizik klaviatura
//                    ishlatilmaydi (`Esc` dan boshqa).
//
//    Sabab: ikkalasi birga ishlasa o'yinchi "nima bilan yozaman?"
//    degan savolga tushardi, va terilgan harf ikki marta kirib
//    ketishi mumkin edi (tugmani bosish + klavishani bosish).
//
//  ── Rejim (3 xil) ────────────────────────────────────────────
//    ⚡ all  — hammasi bittada: barcha slot bir vaqtda
//    ⏭ seq  — galma-gal: har to'g'ri parolda KEYINGI slot
//    🔑 each — har parol kiritilganda: har slotning O'Z paroli bor
//              (1-slot o'z paroli bilan, keyin 2-slot boshqasi bilan)
//
//  ── 🎲 Random ────────────────────────────────────────────────
//    Parolni dizayner qo'yadi YOKI MiniPad o'zi yaratadi:
//      🔢 digits  — faqat son
//      ⌨ letters  — harf (+ kamdan-kam @#$&-)
//      🔀 mixed   — harf + son + belgi
//    Uzunlik `randMin`…`randMax` orasida tasodifiy.
//
//  ── ⚠ NEGA IKKI XIL VAQT ────────────────────────────────────
//    Bitta \"timer\" ikki ishni bajarolmaydi, chunki ular teskari:
//      ⏱ `delay`  — parol TO'G'RI bo'lgach animatsiya necha soniyada
//                   boshlanadi (0 = darhol)
//      🎲 `regen`  — random parol necha soniyada bir YANGILANADI
//                   (0 = yangilanmaydi)
//    Bittasiga qo'shsak: parolni 3 soniyada yangilamoqchi bo'lgan
//    dizayner animatsiyani ham 3 soniya kutishga majbur bo'lardi.
//
//  ── 🔤 `{random}` belgisi ────────────────────────────────────
//    HTML sahifa, 💻 PC ekrani yoki 📝 matn blokida `{random}` deb
//    yozilsa — dvigatel uni AMALDAGI parol bilan almashtiradi.
//    Parol yangilanganda yozuv ham real vaqtda o'zgaradi.
//      {random}          — birinchi (yoki eng yaqin) MiniPad
//      {random:Qulf 2}   — nomi bo'yicha aniq MiniPad
//
//  ── ⚠ NEGA `_pcCursorFree` ──────────────────────────────────
//    Parol kiritish uchun kursor kerak. Bu loyihadagi YAGONA
//    \"kursor erkin\" bayrog'i: `player.js`, `hitbox.js`,
//    `interactive-button.js` va `GameLock` hammasi shuni o'qiydi.
//    O'z bayrog'imizni qo'ysak o'sha to'rt joyni ham tahrirlash
//    kerak bo'lardi.
// ============================================================

window.MiniPadSystem = (() => {
  'use strict';

  const SYM = '@#$&-';
  const DIG = '0123456789';
  const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function _defaultData() {
    return {
      isMiniPad:   true,
      type:        'MiniPad',
      name:        'MiniPad',

      padStyle:    'numpad',    // numpad | keyboard | both | screen
      code:        '1234',      // amaldagi parol
      manualCode:  '1234',      // dizayner qo'ygan parol (random o'chsa qaytadi)

      // 🎲 Random
      randomMode:  'off',       // off | digits | letters | mixed
      randMin:     4,
      randMax:     6,
      regen:       0,           // sek — 0 = yangilanmaydi

      // ⏱ Ijro
      delay:       3,           // sek — to'g'ri paroldan keyin kutish
      padMode:     'all',       // all | seq | each
      slots:       [],          // [{sourceName, keyframes, duration, targetObjectId, speed, soundUrl, soundName, code}]

      // O'zaro aloqa
      interactDist: 3,
      actionKey:    'KeyE',
      colliderMode: 'block',    // 🧱 block | 👻 inline

      // Runtime (saqlanmaydi — `_` bilan)
      _padStep:    0,           // seq/each — nechanchi slotdamiz
      _open:       false,
    };
  }

  const _log = (m, c) => { try { log(m, c); } catch (e) { try { console.log(m); } catch (_) {} } };
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);
  const _objs = () => (typeof objects !== 'undefined' ? objects : []);
  const pads = () => _objs().filter(o => o && o.userData && o.userData.isMiniPad);

  /**
   * 🧍 O'yinchi obyekti (yo'q bo'lsa `null`).
   * ⚠ Tartib `SoundBlockSystem._getPlayerRef` bilan bir xil.
   */
  function _playerRef() {
    if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent) return playerMesh;
    if (typeof PlayerController !== 'undefined' && PlayerController.obj) return PlayerController.obj;
    if (typeof playerMesh !== 'undefined' && playerMesh) return playerMesh;
    return null;
  }

  // ============================================================
  //  🎲 RANDOM PAROL
  // ============================================================
  /**
   * ⚠ Chegaralar SHU YERDA tekshiriladi, inspektorda emas: parol
   *   `restore()`, prefab yoki qo'lda tahrirlangan JSON orqali ham
   *   kelishi mumkin. `min > max` bo'lsa almashtiriladi, 0 va manfiy
   *   qiymatlar 1 ga ko'tariladi — aks holda bo'sh parol chiqib,
   *   qulf HAR QANDAY kiritishni qabul qilardi.
   */
  function genCode(mode, min, max) {
    let a = Math.max(1, Math.min(64, parseInt(min, 10) || 1));
    let b = Math.max(1, Math.min(64, parseInt(max, 10) || a));
    if (a > b) { const t = a; a = b; b = t; }
    const len = a + Math.floor(Math.random() * (b - a + 1));

    let pool, symChance;
    if (mode === 'digits')      { pool = DIG;       symChance = 0;    }
    else if (mode === 'letters'){ pool = LET;       symChance = 0.08; }  // kamdan-kam
    else                        { pool = DIG + LET; symChance = 0.15; }  // mixed

    let out = '';
    for (let i = 0; i < len; i++) {
      out += (symChance && Math.random() < symChance)
        ? SYM[Math.floor(Math.random() * SYM.length)]
        : pool[Math.floor(Math.random() * pool.length)];
    }
    return out;
  }

  /** Padga yangi parol beradi (random yoqilgan bo'lsa). */
  function regenerate(pad, silent) {
    const ud = pad && pad.userData;
    if (!ud || ud.randomMode === 'off') return false;
    ud.code = genCode(ud.randomMode, ud.randMin, ud.randMax);
    _notifyChanged();
    if (!silent) _log(`🎲 "${ud.name}" — yangi parol`, 'lok');
    return true;
  }

  // ============================================================
  //  🔤 `{random}` belgisi
  // ============================================================
  const TOKEN = /\{random(?::([^}]*))?\}/gi;

  /**
   * Matndagi `{random}` larni amaldagi parol bilan almashtiradi.
   * @param {string} str
   * @returns {string}
   */
  function resolve(str) {
    if (typeof str !== 'string' || str.indexOf('{random') < 0) return str;
    const list = pads();
    return str.replace(TOKEN, (m, name) => {
      let p = null;
      if (name && name.trim()) {
        const n = name.trim().toLowerCase();
        p = list.find(o => String(o.userData.name || '').toLowerCase() === n) || null;
      } else {
        // Nom berilmagan — birinchi RANDOM padni olamiz, u ham bo'lmasa birinchisini
        p = list.find(o => o.userData.randomMode !== 'off') || list[0] || null;
      }
      return p ? String(p.userData.code ?? '') : m;
    });
  }
  const hasToken = (s) => typeof s === 'string' && /\{random(?::[^}]*)?\}/i.test(s);

  /**
   * Parol o'zgarganda ochiq oynalarni yangilaydi.
   * ⚠ 💻 PC ekrani o'zi yangilanadi: uning \"imzosi\" (`sig`) yechilgan
   *   HTML dan hisoblanadi, ya'ni parol o'zgarishi bilan imzo ham
   *   o'zgaradi va iframe qayta quriladi. Bu yerda faqat HTML sahifa
   *   overlay'i qayta chiziladi.
   */
  let _lastHtml = null;
  function _notifyChanged() {
    // 🖥 Ochiq HTML sahifa
    try {
      const ov = document.getElementById('hb-html-page');
      if (ov && _lastHtml && hasToken(_lastHtml) && window._hbShowHtmlPage) {
        window._hbShowHtmlPage(_lastHtml, ov.dataset.pos || 'bottom');
      }
    } catch (e) {}
    // 📝 Matn bloklari — faqat `{random}` yozilganlari qayta chiziladi
    try {
      if (window.TextBlockSystem && TextBlockSystem.redraw) {
        for (const o of _objs()) {
          if (o && o.userData && o.userData.isTextBlock && hasToken(o.userData.text)) {
            TextBlockSystem.redraw(o);
          }
        }
      }
    } catch (e) {}
    // 💻 PC ekrani o'zi sezadi: uning imzosi YECHILGAN matndan
    //    hisoblanadi, ya'ni parol o'zgarishi bilan iframe qayta quriladi.
  }
  /** `_showHtmlPage` chaqirilganda XOM matnni eslab qolamiz. */
  function rememberHtml(raw) { _lastHtml = raw; }

  // ============================================================
  //  YARATISH
  // ============================================================
  // ── PAD O'LCHAMI — bitta manba ───────────────────────────────
  //  Korpus, `colliderSize` va `restoreVisual` — uchalasi shu yerdan
  //  o'qiydi. Ilgari raqamlar uch joyda takrorlanardi.
  const PAD_W = 0.5, PAD_H = 0.7, PAD_D = 0.12;

  /**
   * 🖥 MiniPad KO'RINISHINI quradi: korpus materiali + ekrancha +
   * tugmalar plitasi. `userData` va transformga TEGMAYDI.
   *
   * ⚠ NEGA AJRATILDI: `create()` va `restoreVisual()` bir xil pad
   *   berishi SHART. Ilgari ko'rinish faqat `create()` ichida edi va
   *   yuklashda umuman qurilmasdi — MiniPad oddiy 1×1×1 kub bo'lib
   *   qaytardi, ekranchasi va tugmalari yo'qolardi. Bu — 🎯 hitbox,
   *   🔘 tugma va 💻 PC da allaqachon hal qilingan naqsh
   *   (`restoreVisual` + `SceneTypes`), MiniPad esa ro'yxatdan
   *   chetda qolgan edi.
   */
  function _buildVisual(mesh) {
    try { mesh.geometry && mesh.geometry.dispose(); } catch (e) {}
    try { mesh.material && mesh.material.dispose(); } catch (e) {}
    mesh.geometry = new THREE.BoxGeometry(PAD_W, PAD_H, PAD_D);
    mesh.material = new THREE.MeshStandardMaterial({
      color: 0x1b2430, roughness: 0.55, metalness: 0.3,
      emissive: 0x0a1a24, emissiveIntensity: 0.6,
    });
    mesh.castShadow = mesh.receiveShadow = true;

    // ⚠ Eski qismlarni OLIB TASHLAYMIZ. Prefab yo'lida ular allaqachon
    //   ichida bo'lishi mumkin — tekshirmasak har tiklashda ikkilanardi.
    [...mesh.children].forEach(c => {
      if (c && c.userData && c.userData._padPart) {
        mesh.remove(c);
        try { c.geometry && c.geometry.dispose(); c.material && c.material.dispose(); } catch (e) {}
      }
    });

    // Ekrancha (yuqorida) + tugmalar plitasi (pastda) — faqat ko'rinish
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x0a2e2a, transparent: true, opacity: 0.95 }));
    scr.position.set(0, 0.2, 0.062);
    // ⚠ `_padPart` — `_` bilan: `_slCleanUD` uni tashlaydi, ya'ni
    //   bolalar faylga YOZILMAYDI va shu yerda qayta quriladi.
    scr.userData = { _padPart: 'screen' };
    mesh.add(scr);

    const kp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.32),
      new THREE.MeshBasicMaterial({ color: 0x101822, transparent: true, opacity: 0.9 }));
    kp.position.set(0, -0.12, 0.062);
    kp.userData = { _padPart: 'keys' };
    mesh.add(kp);

    // 📐 To'qnashuv qutisi — o'z geometriyasidan (tugmadagi bilan bir xil dars)
    mesh.userData.colliderSize = { x: PAD_W, y: PAD_H, z: PAD_D };
    return mesh;
  }

  /** Saqlangan MiniPad ning ko'rinishini tiklaydi (`SceneTypes` chaqiradi). */
  function restoreVisual(mesh) {
    if (!mesh || !mesh.isMesh) return mesh;
    return _buildVisual(mesh);
  }

  function create(pos) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(PAD_W, PAD_H, PAD_D),
                                new THREE.MeshStandardMaterial());
    _buildVisual(mesh);

    // ⚠ HISOBLAGICH NOMI — `objIdC`, `objId` EMAS.
    //   Ilgari bu yerda `typeof objId !== 'undefined'` turardi, lekin
    //   dvigatelda `objId` degan o'zgaruvchi UMUMAN YO'Q (u `objIdC`).
    //   Ya'ni shart hech qachon bajarilmasdi va MiniPad har safar
    //   `Date.now()` ni id qilib olardi (masalan 1787300381088).
    //   Oqibati: (1) id ketma-ketlikdan tashqarida — undo `objIdC` ni
    //   tiklaganda uni hisobga ololmaydi; (2) bir millisekundda ikkita
    //   MiniPad yaratilsa id TO'QNASHADI, va `objects.find(...)`
    //   birinchisini qaytarib, tugma/hitbox noto'g'ri padga ulanadi.
    mesh.userData = Object.assign(_defaultData(), {
      id: (typeof objIdC !== 'undefined') ? ++objIdC : Date.now(),
      name: 'MiniPad ' + (pads().length + 1),
    });
    // 📐 To'qnashuv qutisi — o'z geometriyasidan (tugmadagi bilan bir xil dars).
    //    ⚠ `_buildVisual` uni allaqachon qo'ygan edi, lekin yuqoridagi
    //      `mesh.userData = Object.assign(...)` butun `userData` ni
    //      ALMASHTIRADI — shuning uchun qaytadan yoziladi.
    mesh.userData.colliderSize = { x: PAD_W, y: PAD_H, z: PAD_D };

    mesh.position.copy(pos || new THREE.Vector3(0, 1.4, 0));
    scene.add(mesh);
    objects.push(mesh);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof selectObject === 'function') selectObject(mesh);
    _log('🔢 MiniPad qo\'shildi — parolni inspektorda sozlang', 'lok');
    return mesh;
  }

  // ============================================================
  //  PAROL TEKSHIRUVI
  // ============================================================
  /** Shu qadamda kutilayotgan parol. */
  function expectedCode(pad) {
    const ud = pad.userData;
    if (ud.padMode === 'each') {
      const s = (ud.slots || [])[ud._padStep || 0];
      // ⚠ Slotda o'z paroli bo'lmasa — umumiy parol. Aks holda
      //   dizayner slot qo'shishi bilan qulf JIMGINA ochilmas
      //   bo'lib qolardi (bo'sh parol hech qachon to'g'ri emas).
      if (s && s.code) return String(s.code);
    }
    return String(ud.code ?? '');
  }

  /**
   * Kiritilgan parolni tekshiradi va to'g'ri bo'lsa ijroni boshlaydi.
   * @returns {boolean} to'g'rimi
   */
  function submit(pad, typed) {
    const ud = pad && pad.userData;
    if (!ud) return false;
    const want = expectedCode(pad);
    if (!want) { _log(`⚠ "${ud.name}" — parol qo'yilmagan`, 'lw'); return false; }
    if (String(typed) !== want) {
      _log(`🔒 "${ud.name}" — parol xato`, 'lw');
      return false;
    }
    _log(`🔓 "${ud.name}" — parol to'g'ri`, 'lok');
    const d = Math.max(0, +ud.delay || 0);
    if (d > 0) {
      ud._pending = setTimeout(() => { ud._pending = null; fire(pad); }, d * 1000);
    } else {
      fire(pad);
    }
    return true;
  }

  /** Rejimga qarab slot(lar)ni ishga tushiradi. */
  function fire(pad) {
    const ud = pad.userData;
    const slots = ud.slots || [];
    if (!slots.length) { _log(`⚠ "${ud.name}" — slot yo'q`, 'lw'); return; }

    if (ud.padMode === 'all') {
      slots.forEach(s => _playSlot(pad, s));
      _log(`⚡ "${ud.name}" — hammasi bittada (${slots.length})`, 'lok');
    } else {
      const i = Math.max(0, Math.min(slots.length - 1, ud._padStep || 0));
      _playSlot(pad, slots[i]);
      _log(`⏭ "${ud.name}" — slot ${i + 1}/${slots.length}`, 'lok');
      ud._padStep = (i + 1) % slots.length;
    }
    // 🎲 Random bo'lsa — ishlagach yangi parol
    if (ud.randomMode !== 'off') regenerate(pad, true);
    if (typeof updateInspector === 'function' &&
        typeof selectedObj !== 'undefined' && selectedObj === pad) updateInspector();
  }

  /**
   * ⚠ Animatsiya va ovoz 🔘 tugmadagi BIR XIL yo'ldan o'ynaydi
   *   (`TimelineExportSystem.playObjectKeyframes`). Ikkinchi ijro
   *   dvigateli yozsak, tezlik/loop/to'xtatish qoidalari ikki xil
   *   bo'lib ketardi.
   */
  function _playSlot(pad, slot) {
    if (!slot) return;
    if (slot.soundUrl) _playSound(slot.soundUrl);
    const kfs = Array.isArray(slot.keyframes) ? slot.keyframes : [];
    if (!kfs.length) return;
    const target = _objs().find(o => String(o.userData?.id) === String(slot.targetObjectId));
    if (!target) { _log(`⚠ "${pad.userData.name}" — maqsad obyekt topilmadi`, 'lw'); return; }
    if (typeof TimelineExportSystem === 'undefined' || !TimelineExportSystem.playObjectKeyframes) {
      _log('⚠ TimelineExportSystem topilmadi', 'lw'); return;
    }
    const h = TimelineExportSystem.playObjectKeyframes({
      target, keyframes: kfs, direction: 'forward', speed: slot.speed || 1, loop: false,
    });
    if (h) (pad.userData._handles = pad.userData._handles || []).push(h);
  }

  const _audio = new Map();
  function _playSound(url) {
    try {
      const key = url.slice(0, 100);
      let a = _audio.get(key);
      if (!a) { a = new Audio(url); a.volume = 0.8; _audio.set(key, a); }
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (e) {}
  }

  function reset(pad) {
    const ud = pad.userData;
    if (ud._pending) { clearTimeout(ud._pending); ud._pending = null; }
    (ud._handles || []).forEach(h => { try { h && h.stop && h.stop(); } catch (e) {} });
    ud._handles = [];
    ud._padStep = 0;
  }

  // ============================================================
  //  🖥 O'YIN OYNASI
  // ============================================================
  let _openPad = null, _typed = '', _prevCursor;

  function open(pad) {
    if (_openPad) close();
    _openPad = pad; _typed = '';
    _prevCursor = window._pcCursorFree;
    window._pcCursorFree = true;
    try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
    try { if (typeof window._apexFlushKeys === 'function') window._apexFlushKeys(); } catch (e) {}
    _render();
  }

  function close() {
    _openPad = null; _typed = '';
    window._pcCursorFree = _prevCursor;
    _prevCursor = undefined;
    const el = document.getElementById('apex-pad-root');
    if (el) el.remove();
  }
  const isOpen = () => !!_openPad;

  function _style() {
    if (document.getElementById('apex-pad-css')) return;
    const s = document.createElement('style');
    s.id = 'apex-pad-css';
    s.textContent = `
#apex-pad-root{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,.6); z-index:70; pointer-events:auto;
  font-family:'Share Tech Mono',monospace; color:#d8dee6 }
#apex-pad-root .pad{ background:#161c24; border:1px solid rgba(255,255,255,.14); border-radius:8px;
  padding:14px; box-shadow:0 18px 60px rgba(0,0,0,.6); max-width:94vw; max-height:92vh; overflow:auto }
#apex-pad-root .pad-h{ display:flex; align-items:center; gap:8px; margin-bottom:9px }
#apex-pad-root .pad-t{ flex:1; font-size:10px; letter-spacing:2px; color:#78b4e8 }
#apex-pad-root .pad-x{ background:transparent; border:1px solid rgba(255,255,255,.14); color:#79818c;
  border-radius:3px; cursor:pointer; font-size:11px; padding:2px 8px; font-family:inherit }
#apex-pad-root .pad-x:hover{ color:#ff6b6b; border-color:#ff6b6b }
#apex-pad-root .pad-scr{ background:#06110f; border:1px solid rgba(120,180,232,.3); border-radius:4px;
  padding:11px 13px; font-size:21px; letter-spacing:4px; color:var(--accent3); min-height:30px;
  text-align:right; overflow:hidden; text-shadow:0 0 8px rgba(var(--accent3-rgb),.5) }
#apex-pad-root .pad-scr.bad{ color:#ff4444; text-shadow:0 0 8px rgba(255,68,68,.5) }
#apex-pad-root .pad-sub{ font-size:8px; color:#79818c; margin:6px 0 9px; text-align:right; letter-spacing:1px }
#apex-pad-root button.k{ background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.14);
  color:#d8dee6; border-radius:4px; cursor:pointer; font-family:inherit; line-height:1;
  display:flex; align-items:center; justify-content:center }
#apex-pad-root button.k:hover{ border-color:#78b4e8; background:rgba(120,180,232,.14); color:#78b4e8 }
#apex-pad-root button.k.ok{ border-color:var(--accent3); color:var(--accent3) }
#apex-pad-root button.k.del{ border-color:var(--accent2); color:var(--accent2) }
#apex-pad-root .pad-row{ display:flex; gap:12px; align-items:flex-start }
#apex-pad-root .pad-grid{ display:grid; grid-template-columns:repeat(3, var(--nk)); gap:6px }
#apex-pad-root .pad-grid button.k{ width:var(--nk); height:var(--nk); font-size:calc(var(--nk) * .40) }
#apex-pad-root .pad-kb{ display:grid; grid-template-columns:repeat(7, var(--kk)); gap:5px }
#apex-pad-root .pad-kb button.k{ width:var(--kk); height:var(--kk); font-size:calc(var(--kk) * .40) }
#apex-pad-root .pad-act{ display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:5px }
#apex-pad-root .pad-act button.k{ height:32px; font-size:11px }

/* ⚠ O'LCHAM KO'RINISHGA QARAB. Ilgari hamma uchun bitta o'lcham
   ishlatilardi: 🔢 numpad yolg'iz qolganda kichrayib bukilib qolardi,
   ⌨🔢 birga bo'lganda esa ikkalasi bir-biriga sig'may torayib
   ketardi. Endi har holatning O'Z kaliti bor. */
#apex-pad-root .pad.s-numpad{ --nk:58px }
#apex-pad-root .pad.s-keyboard{ --kk:42px }
#apex-pad-root .pad.s-both{ --nk:46px; --kk:38px }
#apex-pad-root .pad.s-screen{ min-width:280px }
#apex-pad-root .pad.s-numpad .pad-scr{ font-size:26px }
#apex-pad-root .pad.s-screen .pad-scr{ font-size:24px; min-height:34px; text-align:center; letter-spacing:6px }
#apex-pad-root .pad-hint{ font-size:9px; color:#79818c; line-height:1.7; text-align:center; margin-top:8px }
#apex-pad-root .pad-hint b{ color:#78b4e8 }`;
    document.head.appendChild(s);
  }

  function _render(flash) {
    if (!_openPad) return;
    _style();
    const host = document.getElementById('cvp') || document.body;
    let r = document.getElementById('apex-pad-root');
    if (!r) {
      r = document.createElement('div');
      r.id = 'apex-pad-root';
      host.appendChild(r);
      r.addEventListener('mousedown', _onClick);
      r.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); });
    }
    const ud = _openPad.userData;
    const st = ud.padStyle || 'numpad';
    const dig = ['1','2','3','4','5','6','7','8','9'];
    const letters = (LET + SYM).split('');

    // ⚠ Ekranda HAR DOIM terilgani turadi — parol emas. Parolni
    //   ko'rsatish kerak bo'lsa `{random}` belgisi bor: uni 💻 PC
    //   ekraniga yoki 📝 matn blokiga yozish mumkin. Qulfning o'z
    //   ekraniga parolni chiqarish esa qulfning ma'nosini yo'qotardi.
    let body = `<div class="pad-scr ${flash || ''}">${_typed ? _esc(_typed) : '&nbsp;'}</div>`;

    if (st === 'screen') {
      // ▭ Faqat ekrancha — yordamchi tugma YO'Q, fizik klaviaturada yoziladi
      body += `<div class="pad-hint">⌨ <b>Klaviaturada</b> yozing<br>
        <b>Enter</b> — tasdiqlash &nbsp;·&nbsp; <b>Backspace</b> — o'chirish &nbsp;·&nbsp; <b>Esc</b> — chiqish</div>`;
    } else {
      body += `<div class="pad-sub">${_esc(String(ud.name || 'MiniPad'))}</div><div class="pad-row">`;
      if (st === 'numpad' || st === 'both') {
        body += `<div><div class="pad-grid">` +
          dig.map(d => `<button class="k" data-k="${d}">${d}</button>`).join('') +
          `<button class="k del" data-k="del">⌫</button>` +
          `<button class="k" data-k="0">0</button>` +
          `<button class="k ok" data-k="ok">✓</button></div></div>`;
      }
      if (st === 'keyboard' || st === 'both') {
        body += `<div><div class="pad-kb">` +
          letters.map(c => `<button class="k" data-k="${c}">${c}</button>`).join('') +
          `</div>` +
          // ⚠ ⌨🔢 da ⌫/✓ numpadda allaqachon bor — ikkinchi marta
          //   chizsak panel keraksiz kengayardi.
          (st === 'keyboard' ? `<div class="pad-act">
             <button class="k del" data-k="del">⌫ O'chirish</button>
             <button class="k ok" data-k="ok">✓ Tasdiqlash</button></div>` : '') +
          `</div>`;
      }
      body += `</div><div class="pad-hint">🖱 Tugmalarni <b>bosing</b> — fizik klaviatura bu rejimda ishlamaydi</div>`;
    }

    r.innerHTML = `<div class="pad s-${st}">
      <div class="pad-h"><span class="pad-t">🔢 ${_esc(String(ud.name || 'MINIPAD'))}</span>
        <button class="pad-x" data-k="close">✕</button></div>
      ${body}
    </div>`;
  }

  function _esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _onClick(e) {
    e.stopPropagation();
    const b = e.target.closest ? e.target.closest('[data-k]') : null;
    if (!b) return;
    e.preventDefault();
    _key(b.dataset.k);
  }

  function _key(k) {
    if (!_openPad) return;
    if (k === 'close') { close(); return; }
    if (k === 'del') { _typed = _typed.slice(0, -1); _render(); return; }
    if (k === 'ok') {
      const ok = submit(_openPad, _typed);
      _render(ok ? 'ok' : 'bad');
      const p = _openPad;
      setTimeout(() => { if (_openPad === p) { if (ok) close(); else { _typed = ''; _render(); } } }, 550);
      return;
    }
    if (_typed.length < 64) { _typed += k; _render(); }
  }

  // ── Klaviatura ──────────────────────────────────────────────
  //  ⚠ `window` CAPTURE fazasida: `player.js` `keydown` ni `document`
  //    da capture bilan tutadi. Capture window → document tartibida
  //    yuradi, ya'ni bizga birinchi navbat tegadi — aks holda parol
  //    terayotganда o'yinchi yurib ketardi.
  //  ⚠ Bir marta o'rnatiladi. Ikki marta ulansa har bosishда harf
  //    ikki marta kirardi — aynan shu xatoning boshqa ko'rinishi.
  let _keysOn = false;
  function _installKeys() {
    if (_keysOn || !window.addEventListener) return;
    _keysOn = true;
    window.addEventListener('keydown', (e) => {
      if (!_openPad) return;
      const t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
      // Oyna ochiq — o'yin boshqaruviga hech nima o'tmaydi
      e.preventDefault(); e.stopPropagation();

      if (e.code === 'Escape') { close(); return; }

      // ⚠ Yozish FAQAT ▭ ekrancha rejimida. Qolgan rejimlarда parol
      //   o'yin ichidagi tugmalar bilan teriladi — ikkalasi birga
      //   ishlasa bitta bosishда harf IKKI marta kirib ketardi
      //   (tugma bosildi + klavish bosildi).
      if ((_openPad.userData.padStyle || 'numpad') !== 'screen') return;

      if (e.code === 'Backspace') { _key('del'); return; }
      if (e.code === 'Enter' || e.code === 'NumpadEnter') { _key('ok'); return; }
      const ch = (e.key || '').toUpperCase();
      if (ch.length === 1 && (DIG + LET + SYM).indexOf(ch) >= 0) _key(ch);
    }, true);
  }

  // ============================================================
  //  HAR KADR
  // ============================================================
  let _wasPlaying = false;
  const _tmpA = new THREE.Vector3(), _tmpB = new THREE.Vector3();

  /**
   * 🖼 Bezak plitalari (ekran + tugmalar) holatini tiklaydi.
   *
   * ⚠ `hideFaceplate` — `userData` da, ya'ni faylga tushadi. Lekin
   *   BOLALARNING `visible` i tiklanmaydi (ular sahna obyekti emas,
   *   mesh bolasi). Shuning uchun har kadr emas, holat o'zgarganda
   *   bir marta sinxronlaymiz.
   */
  function _syncFaceplate(pad) {
    const want = !pad.userData.hideFaceplate;
    if (pad.userData._fpSynced === want) return;
    pad.userData._fpSynced = want;
    pad.traverse(ch => {
      if (ch !== pad && ch.userData && ch.userData._padPart) ch.visible = want;
    });
  }

  /**
   * ⌨ Shu tugma AYNI PAYTDA biror qulfga tegishlimi?
   *
   * ⚠ Gravitatsiya quroli shuni so'raydi: `E` bosilganda ikkala
   *   tizim javob berib, qurol qulfni \"ko'tarmoqchi\" bo'lardi va
   *   panel ochilmasdi. Endi qurol chekinadi.
   *
   * ⚠ Faqat MASOFA ICHIDAGI qulf hisobga olinadi — aks holda
   *   sahnada bitta qulf bo'lsa `E` butun o'yin davomida band
   *   bo'lib qolardi va hech narsa ko'tarib bo'lmasdi.
   */
  function claims(code) {
    if (!code || !_playing()) return false;
    if (_openPad) return true;              // panel ochiq — hamma tugma banda
    const ref = _playerRef() || ((typeof camera !== 'undefined') ? camera : null);
    if (!ref) return false;
    ref.updateMatrixWorld(true);
    ref.getWorldPosition(_tmpA);
    for (const pad of pads()) {
      const ud = pad.userData;
      if ((ud.actionKey || 'KeyE') !== code) continue;
      pad.getWorldPosition(_tmpB);
      if (_tmpA.distanceTo(_tmpB) <= (+ud.interactDist || 3)) return true;
    }
    return false;
  }

  function update(delta) {
    for (const pad of pads()) _syncFaceplate(pad);
    const p = _playing();
    if (p !== _wasPlaying) {
      _wasPlaying = p;
      close();
      pads().forEach(pad => {
        reset(pad);
        // ▶ Play boshida random parol yangi bo'lsin — dizayner
        //   muharrirda ko'rgan parol o'yinda ham qolib ketmasin
        if (p && pad.userData.randomMode !== 'off') regenerate(pad, true);
        if (!p && pad.userData.randomMode !== 'off') {
          pad.userData.code = pad.userData.manualCode || pad.userData.code;
        }
      });
    }
    if (!p) return;

    // 🎲 Davriy yangilanish
    for (const pad of pads()) {
      const ud = pad.userData;
      const every = Math.max(0, +ud.regen || 0);
      if (ud.randomMode === 'off' || !every) continue;
      ud._t = (ud._t || 0) + delta;
      if (ud._t >= every) { ud._t = 0; regenerate(pad, true); }
    }

    // Yaqinlik + tugma
    if (_openPad) return;
    // ============================================================
    //  📏 Yaqinlik — O'YINCHIDAN o'lchanadi
    // ------------------------------------------------------------
    //  ⚠ MUAMMO: ilgari masofa KAMERADAN o'lchanardi. Birinchi
    //    shaxsda kamera o'yinchining ko'zida — farq sezilmasdi.
    //    Uchinchi shaxsda esa kamera o'yinchidan 4–6 m ORQADA turadi.
    //    Ya'ni o'yinchi qulf oldida turgan bo'lsa ham kamera 3 m
    //    chegarasidan tashqarida qolib, panel HECH QACHON ochilmasdi.
    //
    //    Alomat aynan foydalanuvchi aytgani: \"tugmani F ga qo'ysam
    //    hech nima ro'y bermayapti\". Tugma aybdor emas edi —
    //    masofa hech qachon shartni qanoatlantirmasdi.
    //
    //  ⚠ Kamera ZAXIRA bo'lib qoladi: o'yinchi obyekti yo'q sahnada
    //    (erkin uchish rejimi) yagona ma'noli mos yozuvlar — kamera.
    //  ⚠ `SoundBlockSystem._getPlayerRef` bilan AYNAN bir xil tartib:
    //    ikki tizim bir xil savolga (\"o'yinchi qayerda?\") boshqa-boshqa
    //    javob bermasligi kerak.
    // ============================================================
    const ref = _playerRef() ||
                ((typeof camera !== 'undefined') ? camera : null);
    if (!ref) return;
    ref.updateMatrixWorld(true);
    ref.getWorldPosition(_tmpA);
    for (const pad of pads()) {
      const ud = pad.userData;
      pad.getWorldPosition(_tmpB);
      if (_tmpA.distanceTo(_tmpB) > (+ud.interactDist || 3)) continue;
      const key = ud.actionKey || 'KeyE';
      const down = !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[key]);
      if (down && !ud._prevKey) { open(pad); ud._prevKey = down; return; }
      ud._prevKey = down;
    }
  }

  // ============================================================
  //  💾 Saqlash — pad holati `userData` da, ya'ni o'zi saqlanadi.
  //     Bu yerda faqat runtime tozalash kerak.
  // ============================================================
  function serialize() { return {}; }
  function restore() {}

  function _installInit() {
    _installKeys();
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _installInit);
    else setTimeout(_installInit, 60);
  }

  return {
    create, _defaultData,
    // ⚠ `SceneTypes` shu nomni qidiradi — o'zgartirilsa MiniPad
    //   yana kub bo'lib yuklanadi (jimgina).
    restoreVisual,
    genCode, regenerate, expectedCode, submit, fire, reset,
    resolve, hasToken, rememberHtml,
    open, close, isOpen, update, claims,
    installKeys: _installKeys,   // testlar uchun (brauzerda o'zi ulanadi)
    pads,
    serialize, restore,
    SYM, DIG, LET,
  };
})();

window.addMiniPad = function () { return MiniPadSystem.create(); };
