// ============================================================
//  🏁 START / FINISH BLOKLARI  v1
// ------------------------------------------------------------
//  🟢 START  — o'yin BOSHLANGANDA ishga tushadi
//  🔴 FINISH — o'yin TUGAGANDA ishga tushadi va boshqa sahifaga
//              o'tkazib yuboradi (masalan games.html → index.html)
//
//  Ikkalasi ham bir xil ko'rsatish rejimlariga ega:
//    html   — HTML kod (to'liq ekran qatlami)
//    image  — rasm
//    video  — video
//    camera — kamera animatsiyasi (timeline ijro etiladi)
//    none   — hech nima ko'rsatilmaydi (faqat o'tkazish)
//
//  ⚠ NEGA DOM QATLAMI, 3D EMAS: intro/outro renderer holatiga
//    bog'liq bo'lmasligi kerak. Sahna hali yuklanmagan, kamera
//    boshqa joyda yoki fizika ishlamayotgan bo'lishi mumkin —
//    DOM qatlami baribir ko'rinadi.
//
//  ⚠ XAVFSIZLIK: sahifaga o'tkazish FAQAT o'yin rejimida ishlaydi.
//    Muharrirda ishlab ketsa, saqlanmagan sahna YO'QOLARDI.
// ============================================================

window.StartFinishSystem = (() => {

  const DEF = {
    mode:        'html',   // html | image | video | camera | none
    html:        '<div style="text-align:center;font-family:sans-serif">\n  <h1>Boshladik!</h1>\n</div>',
    image:       null,     // dataURL
    imageName:   '',
    video:       null,     // dataURL yoki URL
    videoName:   '',
    duration:    3,        // soniya (video uchun: 0 = tugaguncha)
    skippable:   true,     // Space/Esc bilan o'tkazib yuborish
    fadeIn:      0.4,
    fadeOut:     0.5,
    bg:          '#000000',
    // 🔴 faqat FINISH uchun
    redirectUrl:   '',     // masalan 'index.html'
    redirectDelay: 0,      // ko'rsatish tugagach qo'shimcha kutish (s)
    // 🎥 camera rejimi
    timelineDir: 'forward',
    timelineSpeed: 1,
  };

  let _overlay = null, _active = null, _timer = 0, _idC = 0;

  const _blocks = kind => (typeof objects !== 'undefined' ? objects : [])
    // 🚫 Map Loader yashirgan blok hisobga olinmaydi
    .filter(o => !o?.userData?._mlOff &&
                 o?.userData?.isStartBlock === (kind === 'start') &&
                 o?.userData?.isFinishBlock === (kind === 'finish'));

  const _playing = () => (typeof isPlaying !== 'undefined') && isPlaying;

  // ── Ko'rinish (sahnadagi gavda) ─────────────────────────────
  function buildVisual(kind) {
    const g = new THREE.Group();
    const col = kind === 'start' ? 0x39ff14 : 0xff3355;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: 0x1a2028, metalness: 0.6, roughness: 0.5 }));
    base.position.y = 0.07;
    g.add(base);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.42),
      new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide,
                                    transparent: true, opacity: 0.92 }));
    flag.position.set(0.33, 0.92, 0);
    g.add(flag);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 1.15, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a949e, metalness: 0.8, roughness: 0.35 }));
    pole.position.y = 0.6;
    g.add(pole);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.82, 28),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35,
                                    side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.02;
    halo.name = '__sfHalo';
    g.add(halo);
    return g;
  }

  function restoreVisual(mesh, kind) {
    if (!mesh || mesh.getObjectByName('__sfHalo')) return mesh;
    const v = buildVisual(kind);
    while (v.children.length) mesh.add(v.children[0]);
    return mesh;
  }

  function create(kind, pos) {
    const isStart = kind === 'start';
    const mesh = buildVisual(kind);
    mesh.position.copy(pos || new THREE.Vector3(0, 0, 0));
    mesh.userData = Object.assign({
      id: ++objIdC,
      name: (isStart ? '🟢 Start' : '🟢 Finish') + (++_idC > 1 ? ' ' + _idC : ''),
      type: isStart ? 'startblock' : 'finishblock',
      isStartBlock:  isStart,
      isFinishBlock: !isStart,
      isStatic: true,
    }, DEF, isStart ? { redirectUrl: '', redirectDelay: 0 }
                    : { html: '<div style="text-align:center;font-family:sans-serif">\n  <h1>Tabriklaymiz!</h1>\n</div>',
                        redirectUrl: 'index.html' });

    scene.add(mesh);
    objects.push(mesh);
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof selectObject === 'function') selectObject(mesh);
    if (typeof updateStats === 'function') updateStats();
    if (typeof captureState === 'function') captureState((isStart ? 'Start' : 'Finish') + ' blok');
    log(`${isStart ? '🟢 Start' : '🔴 Finish'} bloki qo'shildi`, 'lok');
    return mesh;
  }

  // ── Qatlam (overlay) ────────────────────────────────────────
  function _makeOverlay(ud) {
    _killOverlay();
    const el = document.createElement('div');
    el.id = 'sf-overlay';
    el.style.cssText =
      'position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;' +
      'opacity:0;transition:opacity ' + (ud.fadeIn || 0) + 's ease;overflow:hidden;' +
      'background:' + (ud.bg || '#000');

    if (ud.mode === 'html') {
      const box = document.createElement('div');
      box.style.cssText = 'max-width:90vw;max-height:90vh;overflow:auto;color:#fff';
      box.innerHTML = String(ud.html || '');
      el.appendChild(box);

    } else if (ud.mode === 'image' && ud.image) {
      const img = document.createElement('img');
      img.src = ud.image;
      img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain';
      el.appendChild(img);

    } else if (ud.mode === 'video' && ud.video) {
      const v = document.createElement('video');
      v.src = ud.video;
      v.autoplay = true; v.playsInline = true;
      // ⚠ Brauzerlar OVOZLI avto-ijroni bloklaydi. `muted` bo'lmasa
      //   video umuman boshlanmasdi va ekran qora qolardi.
      v.muted = true;
      v.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain';
      // Video tugasa — davomiylikni kutmay o'tamiz
      v.addEventListener('ended', () => { if (_active) _finishShow(); });
      el.appendChild(v);
      el.__video = v;
    }

    if (ud.skippable) {
      const hint = document.createElement('div');
      hint.textContent = 'Space / Esc — o\'tkazib yuborish';
      hint.style.cssText =
        'position:absolute;right:16px;bottom:14px;font-family:\'Share Tech Mono\',monospace;' +
        'font-size:11px;color:rgba(255,255,255,.55);pointer-events:none';
      el.appendChild(hint);
    }

    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    _overlay = el;
    return el;
  }

  function _killOverlay() {
    if (!_overlay) return;
    try { if (_overlay.__video) { _overlay.__video.pause(); _overlay.__video.src = ''; } } catch (e) {}
    try { _overlay.remove(); } catch (e) {}
    _overlay = null;
  }

  // ── Ko'rsatishni boshlash ───────────────────────────────────
  function _show(ud, onDone) {
    _active = { ud, onDone, t: 0 };
    _timer = 0;

    if (ud.mode === 'camera') {
      // 🎥 Qatlam yo'q — timeline ijro etiladi
      if (window.TimelineExportSystem?.playTimeline) {
        TimelineExportSystem.playTimeline({
          direction: ud.timelineDir === 'reverse' ? 'reverse' : 'forward',
          speed: ud.timelineSpeed || 1,
          onDone: () => _finishShow(),
        });
      } else { _finishShow(); }
      return;
    }
    if (ud.mode === 'none') { _finishShow(); return; }

    _makeOverlay(ud);
  }

  /** Ko'rsatish tugadi — qatlamni yopamiz va davom etamiz. */
  function _finishShow() {
    if (!_active) return;
    const { ud, onDone } = _active;
    _active = null;

    if (_overlay) {
      _overlay.style.transition = `opacity ${ud.fadeOut || 0}s ease`;
      _overlay.style.opacity = '0';
      const el = _overlay; _overlay = null;
      setTimeout(() => { try { if (el.__video) el.__video.pause(); el.remove(); } catch (e) {} },
                 Math.max(60, (ud.fadeOut || 0) * 1000));
    }
    if (typeof onDone === 'function') { try { onDone(); } catch (e) {} }
  }

  function skip() { if (_active && _active.ud.skippable) _finishShow(); }

  // ── Har kadr ────────────────────────────────────────────────
  function update(delta) {
    // Sahnadagi halqani sekin aylantiramiz
    const tsec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    for (const o of (typeof objects !== 'undefined' ? objects : [])) {
      if (!o?.userData?.isStartBlock && !o?.userData?.isFinishBlock) continue;
      const h = o.getObjectByName('__sfHalo');
      if (h) h.scale.setScalar(1 + Math.sin(tsec * 2) * 0.07);
    }

    if (!_active) return;
    const ud = _active.ud;
    // Video o'z tugashini kutadi (duration = 0)
    if (ud.mode === 'video' && (!ud.duration || ud.duration <= 0)) return;
    _timer += delta || 0;
    if (_timer >= (ud.duration || 0)) _finishShow();
  }

  // ── 🟢 O'yin boshlanishi ────────────────────────────────────
  function onPlayStart() {
    const b = _blocks('start')[0];
    if (!b) return false;
    log('🟢 Start bloki ishga tushdi', 'lok');
    _show(b.userData, () => log('🟢 Start tugadi', 'lok'));
    return true;
  }

  // ── 🔴 O'yin tugashi ────────────────────────────────────────
  /**
   * Finish blokini ishga tushiradi. Hitbox, tugma, skript yoki
   * `winzone` shu funksiyani chaqiradi.
   * @param {number} [id] aniq finish blok id si (bo'lmasa birinchisi)
   */
  function finish(id) {
    const list = _blocks('finish');
    const b = (id != null && list.find(o => String(o.userData.id) === String(id))) || list[0];
    if (!b) { log('⚠ Finish bloki topilmadi', 'lw'); return false; }
    const ud = b.userData;
    log('🔴 Finish bloki ishga tushdi', 'lok');

    _show(ud, () => {
      const url = String(ud.redirectUrl || '').trim();
      if (!url) return;

      // ── ⚠ XAVFSIZLIK DARVOZASI ───────────────────────────────
      //  Sahifaga o'tkazish FAQAT o'yin rejimida. Muharrirda ishlab
      //  ketsa (masalan hitboxni tekshirib ko'rayotganda) brauzer
      //  boshqa sahifaga o'tib, SAQLANMAGAN SAHNA yo'qolardi.
      if (!_playing()) {
        log(`⚠ Muharrirda o'tkazish bloklandi: ${url} — O'YNA rejimida ishlaydi`, 'lw');
        return;
      }
      const go = () => {
        log(`➡ Sahifaga o'tilmoqda: ${url}`, 'lok');
        try { window.location.href = url; } catch (e) { log('❌ O\'tkazib bo\'lmadi: ' + e.message, 'le'); }
      };
      const d = Math.max(0, ud.redirectDelay || 0);
      if (d > 0) setTimeout(go, d * 1000); else go();
    });
    return true;
  }

  function onPlayStop() { _active = null; _killOverlay(); }

  // ── Sozlagichlar ────────────────────────────────────────────
  const _sel = () => (typeof selectedObj !== 'undefined' && selectedObj &&
    (selectedObj.userData.isStartBlock || selectedObj.userData.isFinishBlock))
    ? selectedObj : null;

  window._sfSet = function (k, v, quiet) {
    const o = _sel(); if (!o) return;
    o.userData[k] = v;
    if (!quiet && typeof updateInspector === 'function') updateInspector();
  };
  window._sfNum = function (k, v, min, max) {
    const o = _sel(); if (!o) return;
    let n = parseFloat(v); if (!isFinite(n)) n = 0;
    o.userData[k] = Math.max(min, Math.min(max, n));
  };
  window._sfFile = function (input, kind) {
    const o = _sel(); if (!o) return;
    const f = input.files && input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      o.userData[kind] = e.target.result;
      o.userData[kind + 'Name'] = f.name;
      o.userData.mode = kind;
      if (typeof updateInspector === 'function') updateInspector();
      log(`📁 ${f.name} yuklandi`, 'lok');
    };
    r.readAsDataURL(f);
  };
  window._sfClearFile = function (kind) {
    const o = _sel(); if (!o) return;
    o.userData[kind] = null; o.userData[kind + 'Name'] = '';
    if (o.userData.mode === kind) o.userData.mode = 'html';
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._sfTest = function () {
    const o = _sel(); if (!o) return;
    // ⚠ Sinovda `onDone` BO'SH — o'tkazish bajarilmaydi. Aks holda
    //   muharrirda "sinash" tugmasi sahifani almashtirib yuborardi.
    _show(o.userData, () => log('▶ Sinov tugadi', 'lok'));
  };

  // ── Inspektor bo'limi ───────────────────────────────────────
  function inspectorHTML(obj) {
    const ud = obj.userData;
    const isFin = !!ud.isFinishBlock;
    const MODES = [['html','📝','HTML kod'], ['image','🖼','Rasm'],
                   ['video','🎬','Video'], ['camera','🎥','Kamera anim'],
                   ['none','🔇','Hech nima']];
    const row = (l, inner) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:82px;flex-shrink:0">${l}</span>
        ${inner}</div>`;
    const num = (k, min, max, step) =>
      `<input type="number" min="${min}" max="${max}" step="${step}" value="${ud[k] ?? 0}"
        oninput="_sfNum('${k}',this.value,${min},${max})"
        style="width:66px;background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none">`;
    const fileRow = (kind, label) => `
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
        <input type="file" accept="${kind === 'image' ? 'image/*' : 'video/*'}"
          onchange="_sfFile(this,'${kind}')"
          style="flex:1;font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">
        ${ud[kind] ? `<button onclick="_sfClearFile('${kind}')" style="padding:3px 8px;border:1px solid var(--red);
          background:none;color:var(--red);font-size:9px;border-radius:3px;cursor:pointer">✕</button>` : ''}
      </div>
      <div style="font-size:8px;color:${ud[kind] ? 'var(--accent3)' : 'var(--muted)'};
        font-family:'Share Tech Mono',monospace;margin-bottom:6px">
        ${ud[kind] ? '✓ ' + (ud[kind + 'Name'] || label) : label + ' tanlanmagan'}</div>`;

    return `
    <div class="comp-block">
      <div class="comp-title">
        <span class="tag" style="background:${isFin ? 'rgba(255,51,85,.18)' : 'rgba(var(--accent3-rgb),.18)'};
          color:${isFin ? '#ff3355' : 'var(--accent3)'}">${isFin ? 'FIN' : 'START'}</span>
        ${isFin ? 'O\'yin tugaganda' : 'O\'yin boshlanganda'}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px">
        ${MODES.map(([m, ic, nm]) => `
        <button onclick="_sfSet('mode','${m}')" style="padding:5px 7px;border-radius:3px;cursor:pointer;
          font-size:9px;font-family:'Share Tech Mono',monospace;text-align:left;
          border:1px solid ${ud.mode === m ? 'var(--accent)' : 'var(--border)'};
          background:${ud.mode === m ? 'rgba(var(--accent-rgb),.12)' : 'none'};
          color:${ud.mode === m ? 'var(--accent)' : 'var(--muted)'}">${ic} ${nm}</button>`).join('')}
      </div>

      ${ud.mode === 'html' ? `
        <div style="font-size:8px;color:var(--muted);margin-bottom:4px;font-family:'Share Tech Mono',monospace">HTML KOD</div>
        <textarea oninput="_sfSet('html',this.value,true)"
          style="width:100%;min-height:88px;resize:vertical;background:var(--bg);border:1px solid var(--border);
          color:var(--text);padding:5px 6px;border-radius:3px;font-family:'Share Tech Mono',monospace;
          font-size:9px;line-height:1.5;outline:none">${String(ud.html || '').replace(/</g, '&lt;')}</textarea>` : ''}

      ${ud.mode === 'image' ? fileRow('image', 'Rasm') : ''}
      ${ud.mode === 'video' ? fileRow('video', 'Video') +
        `<div style="font-size:8px;color:var(--muted);line-height:1.5;margin-bottom:6px">
          Davomiylik <b>0</b> qo'yilsa — video tugaguncha ko'rsatiladi.<br>
          ⚠ Brauzer talabiga ko'ra video OVOZSIZ boshlanadi.</div>` : ''}

      ${ud.mode === 'camera' ? `
        ${row('Yo\'nalish', `<select onchange="_sfSet('timelineDir',this.value)"
          style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
          font-size:9px;padding:2px 4px;border-radius:2px;font-family:'Share Tech Mono',monospace">
          <option value="forward" ${ud.timelineDir !== 'reverse' ? 'selected' : ''}>Oldinga</option>
          <option value="reverse" ${ud.timelineDir === 'reverse' ? 'selected' : ''}>Teskariga</option>
        </select>`)}
        ${row('Tezlik', num('timelineSpeed', 0.1, 8, 0.1))}
        <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-bottom:6px">
          Timeline ijro etiladi — kamera treki bilan kirish/chiqish sahnasi.</div>` : ''}

      ${(ud.mode !== 'camera' && ud.mode !== 'none') ? `
        ${row('Davomiylik (s)', num('duration', 0, 120, 0.5))}
        ${row('Fon rangi', `<input type="color" value="${ud.bg || '#000000'}"
          oninput="_sfSet('bg',this.value,true)"
          style="width:38px;height:22px;border:1px solid var(--border);background:none;
          cursor:pointer;border-radius:3px;padding:0">`)}
        ${row('Kirish (s)', num('fadeIn', 0, 5, 0.1))}
        ${row('Chiqish (s)', num('fadeOut', 0, 5, 0.1))}
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:9px;
          color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:7px">
          <input type="checkbox" ${ud.skippable ? 'checked' : ''}
            onchange="_sfSet('skippable',this.checked,true)" style="cursor:pointer">
          Space / Esc bilan o'tkazib yuborish
        </label>` : ''}

      ${isFin ? `
      <div style="border-top:1px solid rgba(255,51,85,.2);padding-top:7px;margin-top:4px">
        <div style="font-size:8px;color:#ff3355;letter-spacing:1.2px;margin-bottom:5px;
          font-family:'Share Tech Mono',monospace">➡ SAHIFAGA O'TKAZISH</div>
        ${row('Manzil', `<input value="${ud.redirectUrl || ''}" placeholder="index.html"
          oninput="_sfSet('redirectUrl',this.value,true)"
          style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
          padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none">`)}
        ${row('Kutish (s)', num('redirectDelay', 0, 30, 0.5))}
        <div style="font-size:8px;color:var(--muted);line-height:1.6;font-family:'Share Tech Mono',monospace">
          Ko'rsatish tugagach shu sahifaga o'tiladi.<br>
          Bo'sh qoldirilsa — o'tkazilmaydi, faqat ko'rsatiladi.<br>
          <b style="color:#ffcc44">⚠ Faqat ▶ O'YNA rejimida</b> — muharrirda
          bloklanadi, aks holda saqlanmagan sahna yo'qolardi.
        </div>
      </div>` : ''}

      <button onclick="_sfTest()" style="width:100%;margin-top:8px;padding:6px;border:1px solid var(--accent);
        background:rgba(var(--accent-rgb),.08);color:var(--accent);font-size:9px;border-radius:3px;cursor:pointer;
        font-family:'Share Tech Mono',monospace">▶ Sinab ko'rish (o'tkazilmaydi)</button>
      ${isFin ? `<div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:6px;
        font-family:'Share Tech Mono',monospace">
        Ishga tushirish: hitbox/tugma amali yoki skriptda
        <b style="color:var(--accent)">StartFinishSystem.finish()</b></div>` : ''}
    </div>`;
  }

  // ── Klaviatura: o'tkazib yuborish ───────────────────────────
  document.addEventListener('keydown', e => {
    if (!_active || !_active.ud.skippable) return;
    if (e.code === 'Space' || e.code === 'Escape') { e.preventDefault(); skip(); }
  }, { capture: true });

  window.addStartBlock  = () => create('start');
  window.addFinishBlock = () => create('finish');

  return {
    DEF, create, buildVisual, restoreVisual, inspectorHTML,
    onPlayStart, onPlayStop, finish, skip, update,
    isShowing: () => !!_active,
  };
})();
