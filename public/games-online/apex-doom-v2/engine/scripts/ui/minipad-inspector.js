// ============================================================
//  🔢 MINIPAD — INSPEKTOR  (build 58.31)
// ------------------------------------------------------------
//  Alohida fayl: `minipad.js` — MANTIQ (parol, random, ijro),
//  bu yer — KO'RINISH. Ikkalasi bir faylda bo'lsa mantiqni test
//  qilish uchun DOM ko'tarish kerak bo'lardi.
// ============================================================

window.buildMiniPadInspector = function (pad) {
  const ic = document.getElementById('inspector-content');
  if (!ic || !pad) return;
  const ud = pad.userData;
  const M  = window.MiniPadSystem;
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const row = (lbl, inner) =>
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
       <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:98px;flex-shrink:0">${lbl}</span>
       ${inner}</div>`;
  const num = (prop, min, max, step, unit) =>
    `<input type="number" min="${min}" max="${max}" step="${step}" value="${ud[prop]}"
      style="width:64px;background:var(--bg);border:1px solid var(--border);color:var(--text);
      padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
      oninput="_padSet('${prop}', this.value, true)">${unit ? `<span style="font-size:8px;color:var(--muted);margin-left:3px">${unit}</span>` : ''}`;
  const opt = (prop, id, label, cur, col) =>
    `<button onclick="_padSet('${prop}','${id}')" style="flex:1;padding:5px 2px;border-radius:3px;cursor:pointer;
      font-size:9px;font-family:'Share Tech Mono',monospace;
      border:1px solid ${cur === id ? (col || 'var(--accent)') : 'var(--border)'};
      background:${cur === id ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
      color:${cur === id ? (col || 'var(--accent)') : 'var(--muted)'}">${label}</button>`;

  const slots = ud.slots || [];
  const isEach = ud.padMode === 'each';

  ic.innerHTML = `
  <div class="comp-block">
    <div class="comp-title"><span class="tag" style="background:rgba(var(--accent-rgb),.12);color:var(--accent)">PAD</span>
      <input value="${esc(ud.name)}" oninput="_padSet('name', this.value, false, true)"
        style="flex:1;background:transparent;border:none;color:var(--text);font-family:inherit;font-size:11px;outline:none">
    </div>

    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:6px 0 3px">
      🖥 Ko'rinish</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:3px">
      ${opt('padStyle', 'numpad',   '🔢 Numpad',    ud.padStyle)}
      ${opt('padStyle', 'keyboard', '⌨ Klaviatura', ud.padStyle)}
      ${opt('padStyle', 'both',     '⌨🔢 Ikkalasi', ud.padStyle)}
      ${opt('padStyle', 'screen',   '▭ Ekrancha',   ud.padStyle)}
    </div>
    <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:7px;font-family:'Share Tech Mono',monospace">
      ▭ <b>Ekrancha</b> — yordamchi tugma yo'q, o'yinchi
      <b style="color:var(--accent)">fizik klaviaturada</b> yozadi.<br>
      🔢 ⌨ ⌨🔢 — aksincha: faqat <b style="color:var(--accent)">o'yin ichidagi</b>
      tugmalar bosiladi, fizik klaviatura ishlamaydi (<b>Esc</b> dan boshqa).
    </div>

    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:6px 0 3px">
      🔑 Parol</div>
    ${row('Parol', `<input value="${esc(ud.code)}" ${ud.randomMode !== 'off' ? 'readonly' : ''}
      style="flex:1;background:var(--bg);border:1px solid ${ud.randomMode !== 'off' ? 'rgba(var(--accent2-rgb),.4)' : 'var(--border)'};
      color:${ud.randomMode !== 'off' ? 'var(--accent2)' : 'var(--text)'};padding:2px 5px;
      font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;border-radius:2px;outline:none"
      oninput="_padSet('code', this.value)">`)}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin:5px 0 3px">
      ${opt('randomMode', 'off',     "✋ Qo'lda",  ud.randomMode)}
      ${opt('randomMode', 'digits',  '🔢 Son',      ud.randomMode, 'var(--accent2)')}
      ${opt('randomMode', 'letters', '⌨ Harf',      ud.randomMode, 'var(--accent2)')}
      ${opt('randomMode', 'mixed',   '🔀 Aralash',  ud.randomMode, 'var(--accent2)')}
    </div>
    ${ud.randomMode !== 'off' ? `
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
        ${row('Uzunlik', `${num('randMin', 1, 64, 1, '')}<span style="font-size:9px;color:var(--muted);margin:0 4px">…</span>${num('randMax', 1, 64, 1, '')}`)}
      </div>
      ${row('🎲 Yangilanish', num('regen', 0, 600, 0.5, 's'))}
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:5px;font-family:'Share Tech Mono',monospace">
        0 = yangilanmaydi. Aks holda har shuncha soniyada YANGI parol —
        <b style="color:var(--accent2)">{random}</b> yozilgan joylarda real vaqtda almashadi.
      </div>
      <button onclick="_padRegen()" style="width:100%;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid var(--accent2);background:rgba(var(--accent2-rgb),.1);color:var(--accent2)">
        🎲 Hozir yangilash</button>
    ` : `
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:5px;font-family:'Share Tech Mono',monospace">
        ⌨ Harf rejimida <b>@#$&-</b> belgilari kamdan-kam uchraydi.
      </div>`}

    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:8px 0 3px">
      ⏱ Ijro</div>
    ${row('Kechikish', num('delay', 0, 60, 0.5, 's'))}
    <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:5px;font-family:'Share Tech Mono',monospace">
      Parol to'g'ri bo'lgach animatsiya shuncha soniyadan keyin boshlanadi.
      <b>🎲 Yangilanish</b> dan farqli — u parolni almashtiradi, bu esa ijroni kutadi.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-bottom:3px">
      ${opt('padMode', 'all',  '⚡ Hammasi',  ud.padMode)}
      ${opt('padMode', 'seq',  '⏭ Galma-gal', ud.padMode)}
      ${opt('padMode', 'each', '🔑 Har parol', ud.padMode)}
    </div>
    <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:6px;font-family:'Share Tech Mono',monospace">
      ⚡ hamma slot bir vaqtda · ⏭ har to'g'ri parolda keyingi slot ·
      🔑 har slotning <b>o'z paroli</b> bor.
    </div>

    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:6px 0 3px">
      🎬 Slotlar (${slots.length})</div>
    ${slots.map((s, i) => `
      <div style="border:1px solid var(--border);border-radius:3px;padding:5px;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
          <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;flex:1">
            ${i + 1}. ${esc(s.sourceName || "bo'sh")}${s.soundUrl ? ' 🔊' : ''}</span>
          <button onclick="_padPickTl(${i})" style="padding:2px 6px;border:1px solid var(--accent4);background:rgba(var(--accent4-rgb),.08);
            color:var(--accent4);font-size:8px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">🎬</button>
          <button onclick="_padPickSnd(${i})" style="padding:2px 6px;border:1px solid var(--accent2);background:rgba(var(--accent2-rgb),.08);
            color:var(--accent2);font-size:8px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">🔊</button>
          <button onclick="_padDelSlot(${i})" style="padding:2px 6px;border:1px solid var(--red);background:transparent;
            color:var(--red);font-size:8px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">✕</button>
        </div>
        ${isEach ? `<div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:56px">🔑 Paroli</span>
          <input value="${esc(s.code || '')}" placeholder="bo'sh = umumiy parol"
            style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;
            font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
            oninput="_padSlotCode(${i}, this.value)"></div>` : ''}
      </div>`).join('')}
    <button onclick="_padAddSlot()" style="width:100%;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
      font-family:'Share Tech Mono',monospace;border:1px solid var(--accent);background:rgba(var(--accent-rgb),.08);
      color:var(--accent);margin-bottom:6px">+ Slot qo'shish</button>

    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:6px 0 3px">
      🧱 To'qnashuv</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:6px">
      ${opt('colliderMode', 'block',  '🧱 Block',  ud.colliderMode || 'block')}
      ${opt('colliderMode', 'inline', '👻 Inline', ud.colliderMode || 'block')}
    </div>

    ${row('📏 Masofa', num('interactDist', 0.5, 20, 0.5, 'm'))}
    ${row('⌨ Tugma', `<button onclick="_padCatchKey(this)" style="padding:3px 9px;border:1px solid var(--accent);
      background:rgba(var(--accent-rgb),.08);color:var(--accent);font-size:9px;border-radius:3px;cursor:pointer;
      font-family:'Share Tech Mono',monospace">🎯 ${esc((ud.actionKey || 'KeyE').replace(/^Key|^Digit/, ''))}</button>`)}

    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:98px;flex-shrink:0">🖼 Bezak plitalari</span>
      <button onclick="_padFaceplate(${!(ud.hideFaceplate)})" style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid ${ud.hideFaceplate ? 'var(--red)' : 'var(--accent3)'};
        background:${ud.hideFaceplate ? 'rgba(255,68,68,.08)' : 'rgba(var(--accent3-rgb),.1)'};
        color:${ud.hideFaceplate ? 'var(--red)' : 'var(--accent3)'}">
        ${ud.hideFaceplate ? "✗ Yashirin" : "✓ Ko'rinadi"}</button>
    </div>
    <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:6px;font-family:'Share Tech Mono',monospace">
      MiniPadning ustidagi ekran va tugmalar plitasi — <b>bezak</b>.
      O'z teksturangiz yoki 📦 modelingiz ko'rinishi uchun ularni yashiring.
    </div>

    <div style="font-size:8px;color:var(--muted);line-height:1.7;margin-top:6px;font-family:'Share Tech Mono',monospace">
      🔤 HTML sahifa, 💻 PC ekrani yoki 📝 matn blokida
      <b style="color:var(--accent3)">{random}</b> deb yozsangiz — dvigatel uni
      amaldagi parol bilan almashtiradi.<br>
      Aniq qulf kerak bo'lsa: <b style="color:var(--accent3)">{random:${esc(ud.name)}}</b><br>
      <span style="color:var(--border)">Tekstura va model — pastdagi umumiy bo'limlardan.</span>
    </div>

    <button class="action-btn" style="margin-top:6px" onclick="_padTest()">▶ Sinash (ijroni ishga tushirish)</button>
    <button class="action-btn del-btn" style="margin-top:3px" onclick="deleteSel()">✕ O'chirish</button>
  </div>

  <div class="comp-block">
    <div class="comp-title"><span class="tag">TRS</span>Joylashuv</div>
    <div class="fl" style="margin:2px 0 3px">Pozitsiya</div>
    <div class="xyzr">
      <div><input class="xi" id="px" value="${pad.position.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
      <div><input class="xi" id="py" value="${pad.position.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
      <div><input class="xi" id="pz" value="${pad.position.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
    </div>
    <div class="fl" style="margin:6px 0 3px">Aylanish (°)</div>
    <div class="xyzr">
      <div><input class="xi" id="rx" value="${(pad.rotation.x * 57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
      <div><input class="xi" id="ry" value="${(pad.rotation.y * 57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
      <div><input class="xi" id="rz" value="${(pad.rotation.z * 57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
    </div>
    <div class="fl" style="margin:6px 0 3px">O'lchov</div>
    <div class="xyzr">
      <div><input class="xi" id="sx" value="${pad.scale.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
      <div><input class="xi" id="sy" value="${pad.scale.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
      <div><input class="xi" id="sz" value="${pad.scale.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
    </div>
  </div>

  <!-- 🎨 Material · 🖼 Tekstura · 📦 GLB — oddiy obyektdagi BIR XIL blok.
       Nusxa ko'chirilmagan: inspector.js dagi yagona manbadan
       chaqiriladi (buildMaterialInspectorHTML). -->
  ${window.buildMaterialInspectorHTML ? window.buildMaterialInspectorHTML(pad) : ''}`;
};

// ── Yordamchilar ──────────────────────────────────────────────
window._padSet = function (prop, val, isNum, keepFocus) {
  if (!selectedObj || !selectedObj.userData.isMiniPad) return;
  const ud = selectedObj.userData;
  ud[prop] = isNum ? (parseFloat(val) || 0) : val;
  // ⚠ Qo'lda kiritilgan parolni ALOHIDA eslab qolamiz: random yoqilib
  //   o'chirilsa dizayner yozgan parol qaytishi kerak, aks holda u
  //   tasodifiy qiymat bilan almashib ketardi.
  if (prop === 'code' && ud.randomMode === 'off') ud.manualCode = val;
  if (prop === 'randomMode') {
    if (val === 'off') ud.code = ud.manualCode || ud.code;
    else if (window.MiniPadSystem) MiniPadSystem.regenerate(selectedObj, true);
  }
  if (!keepFocus && typeof updateInspector === 'function') updateInspector();
};
window._padRegen = function () {
  if (!selectedObj || !window.MiniPadSystem) return;
  MiniPadSystem.regenerate(selectedObj);
  if (typeof updateInspector === 'function') updateInspector();
};
window._padSlotCode = function (i, v) {
  if (!selectedObj || !selectedObj.userData.isMiniPad) return;
  const s = (selectedObj.userData.slots || [])[i];
  if (s) s.code = v;
};
window._padAddSlot = function () {
  if (!selectedObj || !selectedObj.userData.isMiniPad) return;
  const ud = selectedObj.userData;
  ud.slots = ud.slots || [];
  ud.slots.push({ sourceName: '', keyframes: [], duration: 0, targetObjectId: null,
                  speed: 1, soundUrl: null, soundName: '', code: '' });
  if (typeof updateInspector === 'function') updateInspector();
};
window._padDelSlot = function (i) {
  if (!selectedObj || !selectedObj.userData.isMiniPad) return;
  (selectedObj.userData.slots || []).splice(i, 1);
  if (typeof updateInspector === 'function') updateInspector();
};

/**
 * 🎬 Timeline'dan animatsiya olish.
 * ⚠ Keyframelar NUSXA olinadi — timeline keyin o'zgarsa ham slot
 *   ishlashda davom etadi (🔘 tugmadagi bilan bir xil qoida).
 */
window._padPickTl = function (i) {
  if (!selectedObj || !selectedObj.userData.isMiniPad) return;
  if (typeof TimelineSystem === 'undefined' || !TimelineSystem.tracks) {
    log('⚠ Timeline tizim topilmadi', 'lw'); return;
  }
  const usable = (TimelineSystem.tracks || []).filter(t => t.keyframes && t.keyframes.length > 0 && !t.isFilter && !t.isWeather && !t.isSkybox && !t.isKino);
  if (!usable.length) { log("⚠ Timeline'da keyframe'li obyekt yo'q — avval I bilan kalit qo'ying", 'lw'); return; }
  const old = document.getElementById('pad-tl-picker');
  if (old) old.remove();
  const back = document.createElement('div');
  back.id = 'pad-tl-picker';
  back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;' +
                       'align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  back.onclick = e => { if (e.target === back) back.remove(); };
  back.innerHTML = `<div style="background:#151b25;border:1px solid rgba(var(--accent-rgb),.4);border-radius:6px;
    padding:14px 16px;min-width:300px;max-height:70vh;overflow:auto;font-family:'Share Tech Mono',monospace;color:#eee">
    <div style="font-size:12px;letter-spacing:1.5px;color:var(--accent);font-weight:700;margin-bottom:10px">🎬 TIMELINE'DAN TANLASH</div>
    ${usable.map((t, k) => {
      const obj = objects.find(o => String(o.userData?.id) === String(t.objId));
      const nm = (obj && obj.userData.name) || ('Obyekt #' + t.objId);
      return `<button data-i="${k}" style="display:block;width:100%;text-align:left;margin-bottom:4px;
        background:rgba(var(--accent-rgb),.06);border:1px solid rgba(var(--accent-rgb),.25);color:#eee;padding:8px 10px;
        border-radius:3px;cursor:pointer;font-family:inherit;font-size:11px">▪ ${nm}
        <span style="color:#888">— ${t.keyframes.length} key</span></button>`;
    }).join('')}
  </div>`;
  back.querySelectorAll('[data-i]').forEach(b => {
    b.onclick = () => {
      const tr = usable[+b.dataset.i];
      const obj = objects.find(o => String(o.userData?.id) === String(tr.objId));
      const s = selectedObj.userData.slots[i];
      s.keyframes = JSON.parse(JSON.stringify(tr.keyframes));
      s.targetObjectId = tr.objId;
      s.sourceName = (obj && obj.userData.name) || ('Obyekt #' + tr.objId);
      const times = tr.keyframes.map(k => k.time || 0);
      s.duration = Math.max(...times) - Math.min(...times);
      back.remove();
      log(`🎬 Slot ${i + 1} → "${s.sourceName}"`, 'lok');
      if (typeof updateInspector === 'function') updateInspector();
    };
  });
  document.body.appendChild(back);
};

/**
 * 🔊 Ovoz yuklash.
 * ⚠ `readAsDataURL` — `readAsArrayBuffer` EMAS: `AssetBundle` faylni
 *   `data:audio/…;base64,` ko'rinishidan tanib ZIP ga chiqaradi.
 *   Xom baytlarni saqlasak ovoz jimgina yo'qolardi (58.16 dagi xato).
 */
window._padPickSnd = function (i) {
  if (!selectedObj || !selectedObj.userData.isMiniPad) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'audio/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const s = selectedObj.userData.slots[i];
      s.soundUrl = String(rd.result || '');
      s.soundName = f.name;
      log(`🔊 Slot ${i + 1} → "${f.name}" (${(f.size / 1024).toFixed(1)} KB)`, 'lok');
      if (typeof updateInspector === 'function') updateInspector();
    };
    rd.readAsDataURL(f);
  };
  inp.click();
};

window._padCatchKey = function (btnEl) {
  if (!selectedObj || !selectedObj.userData.isMiniPad) return;
  if (btnEl) btnEl.textContent = '⏳ bosing...';
  const h = (e) => {
    e.preventDefault(); e.stopImmediatePropagation();
    selectedObj.userData.actionKey = e.code;
    document.removeEventListener('keydown', h, { capture: true });
    if (typeof updateInspector === 'function') updateInspector();
  };
  document.addEventListener('keydown', h, { capture: true });
};

window._padTest = function () {
  if (!selectedObj || !selectedObj.userData.isMiniPad || !window.MiniPadSystem) return;
  MiniPadSystem.fire(selectedObj);
};


/**
 * 🖼 Bezak plitalari (ekran + tugmalar) ko'rinishi.
 *
 * ⚠ NEGA KERAK: MiniPad meshining ustida ikkita PlaneGeometry bolasi
 *   turadi. Ular ota mesh materialidan MUSTAQIL, ya'ni teksturani
 *   yoki 📦 GLB ni qo'ysangiz ham o'sha ikkita plita ustida qolib,
 *   yangi ko'rinishni to'sib turardi. Alomat: "tekstura qo'ydim,
 *   lekin baribir eski kalkulyator ko'rinadi".
 */
window._padFaceplate = function (show) {
  if (!selectedObj || !selectedObj.userData.isMiniPad) return;
  selectedObj.userData.hideFaceplate = !show;
  selectedObj.traverse(ch => {
    if (ch !== selectedObj && ch.userData && ch.userData._padPart) ch.visible = !!show;
  });
  if (typeof updateInspector === 'function') updateInspector();
};
