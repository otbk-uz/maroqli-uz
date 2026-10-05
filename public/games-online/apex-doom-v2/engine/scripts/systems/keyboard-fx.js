// ============================================================
//  KEYBOARD FX  v1.0
// ------------------------------------------------------------
//  Locomotion kamera effektlarini (CameraStateSystem) mavjud
//  KATTA KLAVIATURA MUXARRIRIga qo'shadi:
//    - Har klavishga effekt biriktirish
//    - Qo'shma klavish (kombo) — mas: W+Shift → Sprint
//    - 2 rejim:  hold (bosib tursa ishlaydi, qo'yvorsa to'xtaydi)
//                loop (bir bosib yoqadi, yana bosib o'chiradi)
//    - Tepada "O'yinchi turганда animatsiya bo'lsinmi?" tugmasi
//      (yoqilsa turish/idle effekti ishlaydi)
//
//  Muxarrir "_bkmRenderKeys" funksiyasini monkey-patch qiladi —
//  mavjud animatsiya muxarririga tegmaydi, faqat pastiga bo'lim qo'shadi.
// ============================================================

(() => {
  // ── Ma'lumot modeli ──────────────────────────────────────────
  window._camFxKeys   = window._camFxKeys   || {};   // { code: {effect, mode} }
  window._camFxCombos = window._camFxCombos || [];   // [{ keys:[], effect, mode }]
  window._camFxIdle   = window._camFxIdle   || { on: false, effect: 'Idle' };

  function _CS() { return window.CameraStateSystem || null; }
  function _states() { const cs = _CS(); return cs ? cs.STATES : ['Idle','Walk','Run','Sprint']; }
  function _label(s) { const cs = _CS(); return (cs && cs.LABEL[s]) ? cs.LABEL[s] : s; }
  function _isImpulse(s) { const cs = _CS(); return !!(cs && cs.PROFILE[s] && cs.PROFILE[s].impulse); }
  function _keyLbl(code) { return (typeof _keyLabel === 'function') ? _keyLabel(code) : String(code||'').replace('Key','').replace('Digit',''); }

  const _effOpts = (sel) => _states().map(s => `<option value="${s}" ${sel===s?'selected':''}>${_label(s)} (${s})</option>`).join('');
  const _modeOpts = (sel) => `
    <option value="hold" ${sel==='hold'?'selected':''}>Hold (bosib tursa)</option>
    <option value="loop" ${sel==='loop'?'selected':''}>Loop (bosib yoq/o'chir)</option>`;

  // ── Muxarrirga bo'lim qo'shish (monkey-patch) ────────────────
  function _installEditorHook() {
    if (typeof window._bkmRenderKeys !== 'function') { setTimeout(_installEditorHook, 200); return; }
    if (window._bkmRenderKeys.__fxPatched) return;
    const orig = window._bkmRenderKeys;
    window._bkmRenderKeys = function (panel) {
      orig(panel);
      try { _injectFxUI(panel); } catch (e) { if (typeof log === 'function') log('❌ KeyboardFX UI: ' + e.message, 'le'); }
    };
    window._bkmRenderKeys.__fxPatched = true;
  }

  function _refresh() {
    const p = document.getElementById('bkm-panel');
    if (p && typeof _bkmRender === 'function') _bkmRender(p, p._tab || 0);
  }

  function _injectFxUI(panel) {
    // ── 1) TEPADA: "turганda animatsiya" tugmasi ──
    const idle = window._camFxIdle;
    const idleBar = document.createElement('div');
    idleBar.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:8px 10px;border:1px solid rgba(120,220,120,.35);border-radius:8px;background:rgba(120,220,120,.06)';
    idleBar.innerHTML = `
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:#7fd97f">
        <input type="checkbox" id="camfx-idle-on" ${idle.on?'checked':''}> O'yinchi turганда animatsiya bo'lsinmi?
      </label>
      <span style="flex:1"></span>
      <span style="font-size:10px;color:#7a8aa0">Turish effekti:</span>
      <select id="camfx-idle-eff" style="background:#0b1020;border:1px solid rgba(120,220,120,.4);color:var(--text);border-radius:4px;padding:3px 6px;font-family:'Share Tech Mono',monospace;font-size:10px">${_effOpts(idle.effect)}</select>`;
    // tab-bar dan keyin (klaviatura ustiga) joylashtiramiz
    const anchor = panel.childNodes[2] || null;
    panel.insertBefore(idleBar, anchor);
    idleBar.querySelector('#camfx-idle-on').onchange = e => { window._camFxIdle.on = e.target.checked; if(e.target.checked && _CS()) window._camStateCfg.enabled = true; };
    idleBar.querySelector('#camfx-idle-eff').onchange = e => { window._camFxIdle.effect = e.target.value; };

    // ── 2) PASTDA: Kamera FX biriktirishlari ──
    const box = document.createElement('div');
    box.style.cssText = 'margin-top:16px;border-top:1px solid #1a2535;padding-top:12px';
    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:12px;color:#7fd97f;font-weight:700">🎥 Kamera FX biriktirishlari</span>
        <span style="flex:1"></span>
        <button id="camfx-add-key"   class="bkm-btn" style="background:rgba(var(--accent-rgb),.1);border:1px solid rgba(var(--accent-rgb),.4);color:var(--accent);font-size:10px;padding:4px 10px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace">➕ Klavish</button>
        <button id="camfx-add-combo" class="bkm-btn" style="background:rgba(255,170,68,.1);border:1px solid rgba(255,170,68,.4);color:#ffaa44;font-size:10px;padding:4px 10px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace">➕ Kombo</button>
      </div>
      <div id="camfx-key-list"   style="display:flex;flex-direction:column;gap:5px;margin-bottom:8px"></div>
      <div id="camfx-combo-list" style="display:flex;flex-direction:column;gap:5px"></div>
      <div style="font-size:9px;color:var(--border);margin-top:8px;line-height:1.5">
        <b style="color:#7fd97f">Hold</b> — bosib tursangiz effekt ishlaydi, qo'yvorsangiz to'xtaydi.
        <b style="color:#ffaa44">Loop</b> — bir bosib yoqasiz, yana bosib o'chirasiz.
        Kombo namunasi: <b>W + Shift → Sprint</b>.
      </div>`;
    panel.appendChild(box);

    _renderKeyList(box.querySelector('#camfx-key-list'));
    _renderComboList(box.querySelector('#camfx-combo-list'));

    box.querySelector('#camfx-add-key').onclick = () => {
      // yangi klavish tut, keyin qo'sh
      const tmp = document.createElement('span');
      tmp.className = 'bkm-chip';
      tmp.style.cssText = 'padding:2px 8px;border:1px solid rgba(var(--accent-rgb),.35);border-radius:4px;color:var(--accent);font-size:10px';
      tmp.textContent = '[ bosing... ]';
      box.querySelector('#camfx-key-list').appendChild(tmp);
      _catchKeyInto(tmp, code => {
        window._camFxKeys[code] = { effect: 'Walk', mode: 'hold' };
        if (_CS()) window._camStateCfg.enabled = true;
        _refresh();
      });
    };
    box.querySelector('#camfx-add-combo').onclick = () => {
      const combo = { keys: [], effect: 'Sprint', mode: 'hold' };
      window._camFxCombos.push(combo);
      if (_CS()) window._camStateCfg.enabled = true;
      _guidedCombo(combo, 2);   // avval W, keyin SHIFT — ketma-ket tutamiz
    };
  }

  // Yangi kombo uchun klavishlarni ketma-ket tutish (W → SHIFT → ...)
  function _guidedCombo(combo, remaining) {
    _refresh();
    if (remaining <= 0) return;
    const list = document.getElementById('camfx-combo-list');
    if (!list) return;
    const chips = list.querySelectorAll('.cfx-addkey');
    const chip = chips[chips.length - 1];
    if (!chip) return;
    _catchKeyInto(chip, code => { combo.keys.push(code); _guidedCombo(combo, remaining - 1); });
  }

  const CHIP = 'padding:3px 9px;border:1px solid rgba(var(--accent-rgb),.35);border-radius:4px;color:var(--accent);font-size:10px;cursor:pointer;background:#0b1020';
  const SEL  = "background:#0b1020;border:1px solid #23324a;color:var(--text);border-radius:4px;padding:3px 6px;font-family:'Share Tech Mono',monospace;font-size:10px";
  const DEL  = 'background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.4);color:#ff6666;border-radius:4px;font-size:11px;padding:2px 8px;cursor:pointer';

  function _renderKeyList(list) {
    list.innerHTML = '';
    const keys = window._camFxKeys;
    const codes = Object.keys(keys);
    if (!codes.length) { list.innerHTML = `<div style="font-size:9px;color:var(--border)">— hali yo'q —</div>`; return; }
    codes.forEach(code => {
      const b = keys[code];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px';
      const imp = _isImpulse(b.effect);
      row.innerHTML = `
        <span style="${CHIP}" title="klavishni almashtirish">${_keyLbl(code)}</span>
        <span style="color:var(--border)">→</span>
        <select class="cfx-eff" style="${SEL};flex:1">${_effOpts(b.effect)}</select>
        <select class="cfx-mode" style="${SEL};width:150px" ${imp?'disabled title="impuls effekt — bir martalik"':''}>${_modeOpts(b.mode)}</select>
        <button class="cfx-del" style="${DEL}">🗑</button>`;
      const eff = row.querySelector('.cfx-eff');
      eff.onchange = () => { b.effect = eff.value; _refresh(); };
      row.querySelector('.cfx-mode').onchange = e => { b.mode = e.target.value; };
      row.querySelector('.cfx-del').onclick = () => { delete window._camFxKeys[code]; _refresh(); };
      row.querySelector('span[style]').onclick = () => {
        const chip = row.querySelector('span[style]');
        _catchKeyInto(chip, nc => { if (nc !== code) { window._camFxKeys[nc] = b; delete window._camFxKeys[code]; } _refresh(); });
      };
      list.appendChild(row);
    });
  }

  function _renderComboList(list) {
    list.innerHTML = '';
    const combos = window._camFxCombos;
    if (!combos.length) { list.innerHTML = `<div style="font-size:9px;color:var(--border)">— kombo yo'q —</div>`; return; }
    combos.forEach((c, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';
      const imp = _isImpulse(c.effect);
      const chips = (c.keys.length ? c.keys : []).map((code, ki) =>
        `<span class="cfx-ckey" data-ki="${ki}" style="${CHIP};border-color:rgba(255,170,68,.4);color:#ffaa44" title="chap: almashtir | o'ng: o'chir">${_keyLbl(code)}</span>`
      ).join('<span style="color:var(--border)">+</span>');
      row.innerHTML = `
        ${chips || ''}
        ${c.keys.length ? '<span style="color:var(--border)">+</span>' : ''}
        <span class="cfx-addkey" title="klavish qo'shish" style="${CHIP};border-color:rgba(var(--accent3-rgb),.5);color:var(--accent3);font-weight:700">＋</span>
        <span style="color:var(--border)">→</span>
        <select class="cfx-eff" style="${SEL};flex:1;min-width:120px">${_effOpts(c.effect)}</select>
        <select class="cfx-mode" style="${SEL};width:150px" ${imp?'disabled':''}>${_modeOpts(c.mode)}</select>
        <button class="cfx-del" style="${DEL}">🗑</button>`;
      row.querySelector('.cfx-eff').onchange = e => { c.effect = e.target.value; _refresh(); };
      row.querySelector('.cfx-mode').onchange = e => { c.mode = e.target.value; };
      row.querySelector('.cfx-del').onclick = () => { window._camFxCombos.splice(idx, 1); _refresh(); };
      row.querySelector('.cfx-addkey').onclick = () => {
        const chip = row.querySelector('.cfx-addkey');
        _catchKeyInto(chip, code => { c.keys.push(code); _refresh(); });
      };
      row.querySelectorAll('.cfx-ckey').forEach(ch => {
        const ki = parseInt(ch.dataset.ki, 10);
        ch.onclick = () => _catchKeyInto(ch, code => { c.keys[ki] = code; _refresh(); });
        ch.oncontextmenu = ev => { ev.preventDefault(); c.keys.splice(ki, 1); _refresh(); };
      });
      list.appendChild(row);
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  RUNTIME — bindinglarni CameraStateSystem ga ulash
  // ══════════════════════════════════════════════════════════════
  function _kd(code) { return !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[code]); }
  function _held(code) {
    if (code === 'ShiftLeft')   return _kd('ShiftLeft')   || _kd('ShiftRight');
    if (code === 'ControlLeft') return _kd('ControlLeft') || _kd('ControlRight');
    if (code === 'AltLeft')     return _kd('AltLeft')     || _kd('AltRight');
    return _kd(code);
  }

  const _prev = new Map();      // binding kaliti → oldingi held holati (edge)
  const _loop = new Map();      // binding kaliti → loop yoniqmi
  let _weForced = false;

  function update() {
    const CS = _CS();
    const playing = (typeof isPlaying !== 'undefined' && isPlaying);
    // 🚗 Mashinada — klavishlar kamera effektiga UMUMAN o'tmaydi.
    //    Mashinaning o'z effektlari bor; W/Shift bosilganda yurish
    //    tebranishi qo'shilmasligi kerak.
    const inCar = (typeof carInside !== 'undefined') && carInside;
    if (!CS || !playing || inCar) {
      // ⚠ `clearForce()` SHART: ilgari bu yerda faqat mahalliy holat
      //   tozalanardi, `_forced` esa CameraStateSystem da QOLIB KETARDI.
      //   Ya'ni W bosib turib mashinaga o'tirsangiz, Walk effekti
      //   biriktirilgancha qolardi.
      if (CS && _weForced) { CS.clearForce(); }
      _loop.clear(); _prev.clear(); _weForced = false;
      return;
    }

    // active = hozir yoniq (non-impulse) effektlar, prio bilan
    let chosen = null, chosenPrio = -1;
    const consider = (key, held, effect, mode, prio) => {
      const wasHeld = _prev.get(key) || false;
      const edge = held && !wasHeld;
      _prev.set(key, held);
      if (_isImpulse(effect)) { if (edge) CS.impulse(effect); return; }
      let on = false;
      if (mode === 'loop') { if (edge) _loop.set(key, !_loop.get(key)); on = !!_loop.get(key); }
      else { on = held; }                              // hold
      if (on && prio >= chosenPrio) { chosen = effect; chosenPrio = prio; }
    };

    // Kombolar (ustuvor) — barcha klavish bosilgan bo'lsa
    (window._camFxCombos || []).forEach((c, i) => {
      const ok = c.keys.length > 0 && c.keys.every(_held);
      consider('c' + i, ok, c.effect, c.mode, 2);
    });
    // Yakka klavishlar
    Object.keys(window._camFxKeys || {}).forEach(code => {
      const b = window._camFxKeys[code];
      consider('k' + code, _held(code), b.effect, b.mode, 1);
    });

    if (chosen) { CS.force(chosen); _weForced = true; }
    else if (window._camFxIdle && window._camFxIdle.on) { CS.force(window._camFxIdle.effect || 'Idle'); _weForced = true; }
    else if (_weForced) { CS.clearForce(); _weForced = false; }   // faqat o'zimiz majburlagan bo'lsak bo'shatamiz (hitboxni buzmaslik uchun)
  }

  function _hookMainLoop() {
    if (typeof camModuleUpdate !== 'function') { setTimeout(_hookMainLoop, 120); return; }
    if (camModuleUpdate.__kbfxPatched) return;
    const orig = camModuleUpdate;
    window.camModuleUpdate = function (delta) {
      orig(delta);
      try { update(); } catch (e) { if (typeof log === 'function') log('❌ KeyboardFX: ' + e.message, 'le'); }
    };
    window.camModuleUpdate.__kbfxPatched = true;
  }

  function init() {
    _installEditorHook();
    _hookMainLoop();
    if (typeof log === 'function') log('⌨ KeyboardFX ishga tushdi', 'lok');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 90);
})();
// ============================================================