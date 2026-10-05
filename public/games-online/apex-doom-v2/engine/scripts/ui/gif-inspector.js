// ============================================================
//  🎞 GIF TEKSTURA — inspektor  (build 58.39)
// ------------------------------------------------------------
//  🎨 Material bo'limining ichida turadi: rasm qanday qo'yilsa,
//  GIF ham shundoq qo'yiladi.
// ============================================================

window.buildGifInspectorHTML = function (o) {
  if (!o || !window.GifTextureSystem) return '';
  const G = GifTextureSystem;
  const g = o.userData.gif || null;
  const all = G.list();
  const faces = Array.isArray(o.material) ? o.material.length : 0;

  const opt = (c) =>
    `<option value="${c.id}" ${g && g.clip === c.id ? 'selected' : ''}>${
      String(c.name).replace(/[<>&]/g, '')} (${c.frames.length} kadr)</option>`;

  return `
  <div style="border-top:1px solid rgba(var(--accent4-rgb),.18);margin-top:6px;padding-top:6px">
    <div class="fr"><span class="fl" style="color:var(--accent4)">🎞 GIF / ketma-ketlik</span></div>

    <div style="display:flex;gap:3px;margin-bottom:5px">
      <button onclick="_gifUpload()" style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid var(--accent4);
        background:rgba(var(--accent4-rgb),.08);color:var(--accent4)">🎞 GIF yuklash</button>
      <button onclick="_gifDepack()" style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid var(--accent2);
        background:rgba(255,107,53,.08);color:var(--accent2)">📚 Depack</button>
    </div>
    <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:6px;font-family:'Share Tech Mono',monospace">
      📚 <b>Depack</b> — raqamlangan rasmlarni birdaniga tanlaysiz
      (1.png, 2.png, 3.png…), dvijok ularni <b>qatorasiga</b> qo'yadi.
      Tartib fayl nomidagi <b>raqam</b> bo'yicha.
    </div>

    ${all.length ? `
      <div class="fr"><span class="fl">Klip</span>
        <select onchange="_gifAssign(this.value)" style="flex:1;background:var(--bg);border:1px solid var(--border);
          color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px">
          <option value="">— yo'q —</option>${all.map(opt).join('')}
        </select></div>
    ` : `<div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">
        Hali klip yo'q — yuqoridagi tugmalar bilan qo'shing.</div>`}

    ${g ? `
      <div class="fr"><span class="fl">🎬 Kadr/sek</span>
        <input type="range" min="0.5" max="60" step="0.5" value="${g.fps}" style="flex:1"
          oninput="_gifSet('fps', this.value, true)">
        <span id="gif-fps-v" style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${(+g.fps).toFixed(1)}</span>
      </div>
      <div class="fr"><span class="fl">▶ O'ynash</span>
        <button onclick="_gifSet('playing', ${!(g.playing !== false)})" style="padding:3px 9px;border-radius:3px;cursor:pointer;
          font-size:9px;font-family:'Share Tech Mono',monospace;
          border:1px solid ${g.playing !== false ? 'var(--accent3)' : 'var(--border)'};
          background:${g.playing !== false ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};
          color:${g.playing !== false ? 'var(--accent3)' : 'var(--muted)'}">
          ${g.playing !== false ? '✓ Yuribdi' : '⏸ To\'xtagan'}</button>
      </div>
      ${faces > 1 ? `
      <div class="fr"><span class="fl">🎯 Yuz</span>
        <select onchange="_gifSet('face', this.value)" style="flex:1;background:var(--bg);border:1px solid var(--border);
          color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px">
          <option value="" ${g.face == null ? 'selected' : ''}>Hamma tomonga</option>
          ${Array.from({ length: faces }, (_, i) =>
            `<option value="${i}" ${g.face === i ? 'selected' : ''}>Qism ${i + 1}</option>`).join('')}
        </select></div>` : ''}
      <button onclick="_gifClear()" style="width:100%;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid var(--border);background:transparent;
        color:var(--muted);margin-top:4px">✕ GIF ni olib tashlash</button>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:4px;font-family:'Share Tech Mono',monospace">
        ⏱ Timeline'da klipni almashtirish mumkin: 1-keyda bittasi,
        2-keyda boshqasi — <b>silliq emas, qadamli</b> (ular rasm).
      </div>
    ` : ''}
  </div>`;
};

// ── Yordamchilar ──────────────────────────────────────────────
window._gifUpload = function () {
  if (!selectedObj) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/gif';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const id = GifTextureSystem.addFromGif(new Uint8Array(rd.result), f.name);
        GifTextureSystem.assign(selectedObj, id);
        const c = GifTextureSystem.clips[id];
        log(`🎞 "${f.name}" — ${c.frames.length} kadr, ${c.fps} k/s`, 'lok');
      } catch (e) {
        log('⚠ GIF o\'qilmadi: ' + (e && e.message), 'lw');
      }
      updateInspector();
    };
    // ⚠ `readAsArrayBuffer` — GIF ni O'ZIMIZ ochamiz, ya'ni xom
    //   baytlar kerak. `readAsDataURL` bo'lsa avval matnga o'girib,
    //   keyin qaytadan baytga aylantirish kerak bo'lardi.
    rd.readAsArrayBuffer(f);
  };
  inp.click();
};

window._gifDepack = function () {
  if (!selectedObj) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
  inp.onchange = () => {
    const files = Array.from(inp.files || []);
    if (!files.length) return;
    const out = [];
    let done = 0;
    files.forEach(f => {
      const rd = new FileReader();
      rd.onload = () => {
        out.push({ name: f.name, url: String(rd.result || '') });
        if (++done === files.length) {
          try {
            const id = GifTextureSystem.addFromSequence(out, files[0].name.replace(/\d+.*$/, '') || 'ketma-ketlik');
            GifTextureSystem.assign(selectedObj, id);
            const c = GifTextureSystem.clips[id];
            log(`📚 Depack: ${c.frames.length} kadr — "${c.name}"`, 'lok');
          } catch (e) { log('⚠ ' + (e && e.message), 'lw'); }
          updateInspector();
        }
      };
      rd.readAsDataURL(f);
    });
  };
  inp.click();
};

window._gifAssign = function (id) {
  if (!selectedObj) return;
  if (!id) GifTextureSystem.clear(selectedObj);
  else GifTextureSystem.assign(selectedObj, id);
  updateInspector();
};
window._gifClear = function () {
  if (!selectedObj) return;
  GifTextureSystem.clear(selectedObj);
  updateInspector();
};
window._gifSet = function (k, v, live) {
  if (!selectedObj) return;
  GifTextureSystem.set(selectedObj, k, v);
  if (live) {
    const el = document.getElementById('gif-fps-v');
    if (el) el.textContent = (+selectedObj.userData.gif.fps).toFixed(1);
    return;
  }
  updateInspector();
};
