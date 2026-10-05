// ============================================================
// ICHIGA QOSHISH (NEST) — Inspector tabi
// Shift+click bilan belgilangan obyektlarni bitta ona ichiga joylash
// Birinchi tanlangan = ona, qolganlari = bolalar
// ============================================================

// Inspector tabi almashtirish
window.switchInsTab = function(name) {
  const tabs = document.querySelectorAll('#right-col .ptab');
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tabname === name));
  document.getElementById('inspector-content').style.display = (name === 'inspector') ? '' : 'none';
  const nest = document.getElementById('nest-content');
  if (nest) nest.style.display = (name === 'nest') ? '' : 'none';
  if (name === 'nest') renderNestTab();
};

// Nest tab paneli — multi-selected ro'yxati + Qo'sh tugmasi
window.renderNestTab = function() {
  const nest = document.getElementById('nest-content');
  if (!nest) return;

  const arr = (typeof multiSelected !== 'undefined') ? [...multiSelected] : [];
  const single = (typeof selectedObj !== 'undefined' && selectedObj) ? selectedObj : null;

  // Agar multiSelect bo'sh bo'lsa, lekin yagona tanlov bor — uni ham ko'rsatish
  const effectiveList = arr.length ? arr : (single ? [single] : []);

  if (effectiveList.length === 0) {
    nest.innerHTML = `
      <div style="padding:18px;font-size:11px;color:var(--muted);text-align:center;line-height:1.7">
        <div style="font-size:30px;margin-bottom:8px;opacity:.5">📂</div>
        <div>Hech qaysi obyekt tanlanmadi</div>
        <div style="font-size:9px;color:var(--border);margin-top:10px;line-height:1.6">
          Sahnada bitta obyektga bosib, keyin<br>
          <b style="color:var(--accent2)">Shift</b> + click bilan boshqalarini ham belgilang.<br><br>
          Birinchi tanlanganingiz <b style="color:var(--accent4)">ona</b> bo'ladi,<br>
          qolganlari uning <b style="color:var(--accent3)">ichiga</b> joylanadi.
        </div>
      </div>
    `;
    return;
  }

  const parent = effectiveList[0];
  const children = effectiveList.slice(1);

  nest.innerHTML = `
    <div style="padding:12px">
      <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:8px">🎯 ONA OBYEKT (1-tanlangan)</div>
      <div style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:rgba(var(--accent4-rgb),.08);border:1px solid rgba(var(--accent4-rgb),.35);border-radius:5px;margin-bottom:14px">
        <span style="font-size:16px">📦</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;color:var(--accent4);font-family:'Share Tech Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${parent.userData.name || 'Nomsiz'}</div>
          <div style="font-size:8px;color:var(--border)">${parent.userData.type || 'Mesh'}</div>
        </div>
      </div>

      <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:8px">
        ⬇ ICHIGA JOYLANADIGAN BOLALAR (${children.length})
      </div>

      ${children.length === 0
        ? `<div style="padding:14px;font-size:10px;color:var(--border);text-align:center;background:rgba(255,170,68,.04);border:1px dashed rgba(255,170,68,.25);border-radius:5px;margin-bottom:14px">
            Shift+click bilan yana bitta obyektni belgilang
          </div>`
        : `<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:14px;max-height:240px;overflow-y:auto">
            ${children.map(c => `
              <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(var(--accent3-rgb),.04);border:1px solid rgba(var(--accent3-rgb),.2);border-radius:4px">
                <span style="font-size:13px">↳</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:10px;color:var(--accent3);font-family:'Share Tech Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.userData.name || 'Nomsiz'}</div>
                  <div style="font-size:8px;color:var(--border)">${c.userData.type || 'Mesh'}</div>
                </div>
              </div>
            `).join('')}
          </div>`
      }

      <button id="nest-do-btn" ${children.length === 0 ? 'disabled' : ''} style="
        width:100%;
        padding:11px;
        background:${children.length ? 'rgba(var(--accent3-rgb),.12)' : 'rgba(255,255,255,.03)'};
        border:1px solid ${children.length ? 'rgba(var(--accent3-rgb),.45)' : 'rgba(255,255,255,.08)'};
        color:${children.length ? 'var(--accent3)' : 'var(--border)'};
        font-family:'Share Tech Mono',monospace;
        font-size:11px;
        font-weight:700;
        letter-spacing:1.5px;
        border-radius:5px;
        cursor:${children.length ? 'pointer' : 'not-allowed'};
        transition:all .15s
      ">➕ ICHIGA QO'SHISH</button>

      <div style="margin-top:10px;padding:8px 10px;background:rgba(var(--accent-rgb),.03);border:1px solid rgba(var(--accent-rgb),.15);border-radius:4px;font-size:9px;color:var(--border);line-height:1.6">
        💡 World-pozitsiyalar saqlanadi. Bolalar ona ichida iyerarxiyaga joylashadi va ona harakatlansa ular ham birga harakatlanadi.
      </div>
    </div>
  `;

  const btn = document.getElementById('nest-do-btn');
  if (btn && children.length) {
    btn.onmouseenter = () => btn.style.background = 'rgba(var(--accent3-rgb),.22)';
    btn.onmouseleave = () => btn.style.background = 'rgba(var(--accent3-rgb),.12)';
    btn.onclick = () => { window.multiNest(); renderNestTab(); };
  }
};

// ── ASOSIY NEST FUNKSIYASI ──────────────────────────────────────
window.multiNest = function() {
  if (typeof multiSelected === 'undefined' || multiSelected.size < 2) {
    if (window.log) log('⚠ Kamida 2 ta obyekt tanlang', 'lw');
    return;
  }

  const arr = [...multiSelected];
  const parent = arr[0];
  const children = arr.slice(1);

  let moved = 0;
  children.forEach(obj => {
    if (obj === parent) return;

    // Tsiklik parent oldini olish — parent obyekt obj ning ichida bo'lmasligi kerak
    let p = parent;
    while (p) {
      if (p === obj) {
        if (window.log) log(`⚠ "${obj.userData.name}" o'z ichidagi obyektga qo'shilmaydi`, 'lw');
        return;
      }
      p = p.parent;
    }

    // World pozitsiyani saqlash uchun scene'ga attach qilib, keyin parent'ga
    if (typeof scene !== 'undefined') scene.attach(obj);
    parent.attach(obj);
    obj.userData.parentId = parent.userData.id;

    // ⚠ TUZATILDI: obj objects[] da QOLADI.
    // objects[] — bu iyerarxiya emas, global REYESTR. Hitbox/tugma/kamera
    // tizimlari bir-birini shu massivdan `objects.find(id===...)` bilan topadi.
    // Bu yerdan splice qilish = element barcha tizimlar uchun "yo'q bo'lib qolish".
    // Ikki marta render bo'lmaydi, chunki hierarchy.js top-level ni
    // `objects.filter(o => !o.userData.parentId)` bilan ajratadi.

    moved++;
  });

  if (typeof clearMultiSelect === 'function') clearMultiSelect();
  if (typeof selectObject === 'function') selectObject(parent);
  if (typeof updateHierarchy === 'function') updateHierarchy();
  if (typeof updateStats === 'function') updateStats();
  if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();

  if (window.log) log(`📂 "${parent.userData.name}" ichiga ${moved} ta obyekt joylandi`, 'lok');
};

// Multi-select o'zgarganda nest tab live yangilash (agar ochiq bo'lsa)
const _origUpdateMultiSelectBar = window.updateMultiSelectBar;
if (typeof updateMultiSelectBar === 'function') {
  window.updateMultiSelectBar = function() {
    if (_origUpdateMultiSelectBar) _origUpdateMultiSelectBar.apply(this, arguments);
    const nest = document.getElementById('nest-content');
    if (nest && nest.style.display !== 'none') renderNestTab();
  };
}

// Inspector content tanlangan obyekt o'zgarsa ham yangilanadi (selectedObj nest uchun ham muhim)
const _origUpdateInspector = window.updateInspector;
if (typeof updateInspector === 'function') {
  window.updateInspector = function() {
    if (_origUpdateInspector) _origUpdateInspector.apply(this, arguments);
    const nest = document.getElementById('nest-content');
    if (nest && nest.style.display !== 'none') renderNestTab();
  };
}
