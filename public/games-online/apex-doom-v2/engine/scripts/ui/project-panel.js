// ============================================================
//  💾 LOYIHA — PANEL  (build 58.44)
// ------------------------------------------------------------
//  ☰ menyu → 💾 Loyiha papkasi
// ============================================================

window.showProjectPanel = async function () {
  const old = document.getElementById('project-panel');
  if (old) { old.remove(); return; }
  if (!window.ProjectSystem) { log('⚠ ProjectSystem yuklanmagan', 'lw'); return; }

  const P = ProjectSystem;
  const p = document.createElement('div');
  p.id = 'project-panel';
  p.classList.add('ui-modal');
  p.style.cssText = 'border:1px solid var(--accent3);min-width:420px;max-width:92vw';
  p.innerHTML = `<div style="color:var(--muted);font-size:11px;padding:14px">⏳ Yuklanmoqda…</div>`;
  document.body.appendChild(p);
  if (typeof makeDraggable === 'function') makeDraggable(p);

  await projRender();
};

window.projRender = async function () {
  const box = document.getElementById('project-panel');
  if (!box) return;
  const P = ProjectSystem;
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, '');
  const r = await P.list();
  const list = (r && r.projects) || [];

  const when = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < 1) return 'hozir';
    if (m < 60) return m + ' daq oldin';
    if (m < 60 * 24) return Math.round(m / 60) + ' soat oldin';
    return d.toLocaleDateString();
  };
  const kb = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

  const row = (x) => `
    <div style="display:flex;align-items:center;gap:7px;padding:6px 7px;border:1px solid ${
      x.name === P.cfg.name ? 'rgba(var(--accent3-rgb),.5)' : 'var(--border)'};border-radius:3px;margin-bottom:3px;
      background:${x.name === P.cfg.name ? 'rgba(var(--accent3-rgb),.06)' : 'var(--panel2)'}">
      <span style="font-size:16px">📁</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${esc(x.name)}${x.name === P.cfg.name ? ' <span style="color:var(--accent3);font-size:8px">● joriy</span>' : ''}</div>
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">
          ${when(x.saved)} · ${kb(x.size)}${x.meta && x.meta.objects != null ? ' · ' + x.meta.objects + ' obyekt' : ''}${
          x.autosaves ? ' · ⏱ ' + x.autosaves : ''}</div>
      </div>
      <button onclick="projOpen('${esc(x.name)}')" title="Ochish"
        style="background:rgba(var(--accent-rgb),.08);border:1px solid var(--accent);color:var(--accent);
        border-radius:3px;cursor:pointer;font-size:9px;padding:4px 8px;font-family:'Share Tech Mono',monospace">📂 Och</button>
      ${x.autosaves ? `<button onclick="projAutos('${esc(x.name)}')" title="Avtosaqlangan nusxalar"
        style="background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:3px;
        cursor:pointer;font-size:10px;padding:4px 7px">⏱</button>` : ''}
      <button onclick="projDelete('${esc(x.name)}')" title="O'chirish"
        style="background:transparent;border:1px solid var(--red);color:var(--red);border-radius:3px;
        cursor:pointer;font-size:10px;padding:4px 7px">🗑</button>
    </div>`;

  box.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;cursor:move">
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent3);letter-spacing:2px">💾 LOYIHA PAPKASI</span>
      <button onclick="document.getElementById('project-panel').remove()"
        style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px">✕</button>
    </div>

    <div style="display:flex;gap:5px;margin-bottom:8px">
      <input id="proj-name" placeholder="loyiha nomi" value="${esc(P.cfg.name)}"
        style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
        font-family:'Share Tech Mono',monospace;font-size:11px;padding:5px 7px;border-radius:3px;outline:none">
      <button onclick="projSave()"
        style="background:rgba(var(--accent3-rgb),.1);border:1px solid var(--accent3);color:var(--accent3);
        font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px 12px;border-radius:3px;cursor:pointer">
        💾 Saqlash</button>
    </div>

    <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px;font-family:'Share Tech Mono',monospace;font-size:9px">
      <span style="color:var(--muted)">⏱ Avtosaqlash</span>
      <button onclick="projToggleAuto()"
        style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;font-family:inherit;
        border:1px solid ${P.cfg.autosave ? 'var(--accent3)' : 'var(--border)'};
        background:${P.cfg.autosave ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};
        color:${P.cfg.autosave ? 'var(--accent3)' : 'var(--muted)'}">
        ${P.cfg.autosave ? '✓ Yoqiq' : "✗ O'chiq"}</button>
      <input type="number" min="0.5" max="120" step="0.5" value="${(P.cfg.every / 60).toFixed(1)}"
        oninput="projSetEvery(this.value)"
        style="width:56px;background:var(--bg);border:1px solid var(--border);color:var(--text);
        font-family:inherit;font-size:10px;padding:2px 5px;border-radius:2px;outline:none">
      <span style="color:var(--muted)">daqiqada bir</span>
      <span style="flex:1"></span>
      <span style="color:var(--border)">${P.cfg.name ? (P.sinceSave() >= 0 ? P.sinceSave() + ' s oldin' : '') : "nom qo'ying"}</span>
    </div>
    <div style="font-size:8px;color:var(--border);margin-bottom:8px;font-family:'Share Tech Mono',monospace">
      ${P.cfg.name ? `📁 <b style="color:var(--accent3)">projects/${esc(P.cfg.name)}/</b> — <b>Ctrl+S</b> shu papkaga yozadi`
        : `<b>Ctrl+S</b> — loyiha ochilmagan bo'lsa shu panelni ochadi`}
    </div>

    <div style="max-height:44vh;overflow-y:auto;margin-bottom:6px">
      ${list.length ? list.map(row).join('')
        : `<div style="padding:16px;text-align:center;color:var(--muted);font-size:10px;line-height:1.7">
             Hali loyiha yo'q<br><span style="font-size:9px;color:var(--border)">Nom yozib 💾 Saqlash bosing</span></div>`}
    </div>

    <div style="font-size:8px;color:var(--border);line-height:1.7;font-family:'Share Tech Mono',monospace">
      Loyiha <b>projects/&lt;nom&gt;/</b> papkasiga yoziladi: <b>project.json</b> +
      texture/ models/ sound/ video/ html/.<br>
      ⏱ Avtosaqlash yangi holatni yozishdan <b>oldin</b> eskisini
      <b>autosave/</b> ga ko'chiradi — buzilgan sahna tuzuk nusxa ustiga yozilmasin.
    </div>`;
};

window.projSave = async function () {
  const el = document.getElementById('proj-name');
  const nm = el ? el.value.trim() : '';
  if (!nm) { log('⚠ Loyiha nomini yozing', 'lw'); return; }
  await ProjectSystem.save(nm, false);
  projRender();
};

window.projOpen = async function (name) {
  // ⚠ Tasdiq: ochish HOZIRGI sahnani almashtiradi.
  if (!confirm(`📂 "${name}" ochilsinmi?\n\nHozirgi sahna almashtiriladi.`)) return;
  await ProjectSystem.open(name);
  projRender();
};

window.projDelete = async function (name) {
  if (!confirm(`🗑 "${name}" papkasi butunlay o'chirilsinmi?\n\nAvtosaqlangan nusxalar ham ketadi. Bekor qilib bo'lmaydi.`)) return;
  await ProjectSystem.remove(name);
  log(`🗑 "${name}" o'chirildi`, 'lw');
  projRender();
};

window.projToggleAuto = function () {
  ProjectSystem.cfg.autosave = !ProjectSystem.cfg.autosave;
  projRender();
};
window.projSetEvery = function (v) {
  const m = parseFloat(v);
  if (isFinite(m)) ProjectSystem.cfg.every = Math.max(30, m * 60);
};

/** ⏱ Avtosaqlangan nusxalar ro'yxati. */
window.projAutos = async function (name) {
  const r = await ProjectSystem.autosaves(name);
  const list = (r && r.autosaves) || [];
  const old = document.getElementById('proj-autos');
  if (old) old.remove();
  const d = document.createElement('div');
  d.id = 'proj-autos';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99999;display:flex;' +
                    'align-items:center;justify-content:center';
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  const esc = (s) => String(s).replace(/[<>&"]/g, '');
  d.innerHTML = `<div style="background:#151b25;border:1px solid rgba(var(--accent3-rgb),.4);border-radius:6px;
    padding:14px 16px;min-width:340px;max-height:70vh;overflow:auto;font-family:'Share Tech Mono',monospace;color:#eee">
    <div style="font-size:12px;color:var(--accent3);letter-spacing:1.5px;margin-bottom:10px">
      ⏱ AVTOSAQLANGAN NUSXALAR — ${esc(name)}</div>
    ${list.length ? list.map(x => `
      <button onclick="projOpenAuto('${esc(name)}','${esc(x.file)}')"
        style="display:block;width:100%;text-align:left;margin-bottom:4px;background:rgba(var(--accent3-rgb),.06);
        border:1px solid rgba(var(--accent3-rgb),.25);color:#eee;padding:7px 10px;border-radius:3px;cursor:pointer;
        font-family:inherit;font-size:10px">
        ⏱ ${new Date(x.saved).toLocaleString()}
        <span style="color:#888"> — ${(x.size / 1024).toFixed(0)} KB</span></button>`).join('')
      : '<div style="color:#888;font-size:10px;padding:10px">Nusxa yo\'q</div>'}
    <div style="font-size:8px;color:var(--border);line-height:1.6;margin-top:6px">
      Nusxa — bu <b>oldingi</b> ishonchli holat, hozirgi emas.</div>
  </div>`;
  document.body.appendChild(d);
};

window.projOpenAuto = async function (name, file) {
  if (!confirm(`⏱ "${file}" nusxasi ochilsinmi?\n\nHozirgi sahna almashtiriladi.`)) return;
  const d = document.getElementById('proj-autos');
  if (d) d.remove();
  await ProjectSystem.open(name, file);
  projRender();
};
