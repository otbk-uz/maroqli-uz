// ============================================================
//  📄 HTML SAHIFA — CHIQISH EFFEKTLARI  (build 58.46)
// ------------------------------------------------------------
//  🎯 Hitbox va 🔘 tugmadagi "HTML Sahifa" bo'limi uchun umumiy
//  sozlagich:
//
//    🎞 Chiqish   — qattiq · silliq · 🎛 bezier
//    ⏱ Davomiylik — chiqish/ketish animatsiyasi (soniya)
//    ⏳ Turishi    — ekranda necha soniya (0 = cheksiz)
//    ⌨ Qulf       — o'yinchi klaviaturasi bloklansinmi
//
//  ── ⚠ NEGA BITTA UMUMIY FUNKSIYA ────────────────────────────
//    Ikkala tizim (hitbox va tugma) bir xil `htmlPage` obyektini
//    ishlatadi va bir xil `_showHtmlPage()` ni chaqiradi. Panelni
//    ikki marta yozsak, yangi sozlama qo'shilganda biri yangilanib
//    ikkinchisi unutilardi — loyihada bu xato ko'p marta bo'lgan.
//
//    `setFn` — chaqiruvchining O'Z yozuvchisi:
//      hitbox → "window._hbSetAction('htmlPage',"
//      tugma  → "window._ibtnSetHtml("
//    Ikkalasi ham `(prop, val)` shaklida qabul qiladi.
// ============================================================

window._htmlFxHTML = function (h, setFn) {
  if (!h) return '';
  const ease = h.ease || 'smooth';
  const dur  = (h.dur  != null) ? h.dur  : 0.3;
  const hold = (h.hold != null) ? h.hold : 0;
  const bez  = Array.isArray(h.bez) ? h.bez : [0.42, 0, 0.58, 1];
  const S = (prop, val) => `${setFn}'${prop}', ${val})`;

  const row = (lbl, inner) =>
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
       <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:88px;flex-shrink:0">${lbl}</span>
       ${inner}</div>`;
  const num = (prop, v, min, max, step, unit) =>
    `<input type="number" min="${min}" max="${max}" step="${step}" value="${v}"
      style="width:62px;background:var(--bg);border:1px solid var(--border);color:var(--text);
      padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
      oninput="${setFn}'${prop}', parseFloat(this.value)||0)">
     <span style="font-size:8px;color:var(--muted)">${unit}</span>`;
  const easeBtn = (k, lbl) =>
    `<button onclick="${setFn}'ease', '${k}'); updateInspector()"
      style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
      font-family:'Share Tech Mono',monospace;
      border:1px solid ${ease === k ? 'var(--accent)' : 'var(--border)'};
      background:${ease === k ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
      color:${ease === k ? 'var(--accent)' : 'var(--muted)'}">${lbl}</button>`;

  return `
  <div style="border-top:1px solid rgba(var(--accent-rgb),.15);margin:6px 0 4px;padding-top:5px">
    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);margin-bottom:4px">
      🎞 Chiqish effekti</div>
    <div style="display:flex;gap:3px;margin-bottom:4px">
      ${easeBtn('none', '⚡ Qattiq')}${easeBtn('smooth', '🌊 Silliq')}${easeBtn('bezier', '🎛 Bezier')}
    </div>
    ${ease === 'bezier' ? `
      <div style="display:flex;gap:3px;margin-bottom:4px">
        ${[0, 1, 2, 3].map(i => `<input type="number" step="0.05" value="${bez[i]}"
          style="flex:1;min-width:0;background:var(--bg);border:1px solid var(--border);color:var(--text);
          padding:2px 3px;font-family:'Share Tech Mono',monospace;font-size:9px;border-radius:2px;outline:none"
          oninput="window._htmlFxBez(${i}, this.value, ${JSON.stringify(setFn)})">`).join('')}
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-bottom:4px;font-family:'Share Tech Mono',monospace">
        CSS <b>cubic-bezier(x1,y1,x2,y2)</b>. Masalan
        <b>0.68, -0.55, 0.27, 1.55</b> — oshib qaytadi.</div>` : ''}
    ${row('⏱ Davomiylik', num('dur', dur, 0, 10, 0.05, 's'))}
    ${row('⏳ Turishi', num('hold', hold, 0, 600, 0.5, 's'))}
    ${row('⌨ Klaviatura', `<button onclick="${setFn}'lockKeys', ${!h.lockKeys}); updateInspector()"
      style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
      border:1px solid ${h.lockKeys ? 'var(--red)' : 'var(--border)'};
      background:${h.lockKeys ? 'rgba(255,68,68,.1)' : 'transparent'};
      color:${h.lockKeys ? 'var(--red)' : 'var(--muted)'}">
      ${h.lockKeys ? '🔒 Bloklanadi' : '🔓 Erkin'}</button>`)}
    <div style="font-size:8px;color:var(--muted);line-height:1.6;font-family:'Share Tech Mono',monospace">
      ⏳ <b>0</b> = cheksiz turadi (yopish tugmasi kerak).<br>
      🔒 Bloklansa o'yinchi yurolmaydi — matn o'qiyotganda tasodifan
      WASD bosib qahramonni jarga tushirib yubormasin. <b>Esc</b> baribir ishlaydi.
    </div>
  </div>`;
};

/**
 * 🎛 Bezier tugunlari.
 * ⚠ `x` 0…1 ga qisiladi: undan tashqarida CSS egri chizig'i
 *   YAROQSIZ hisoblanadi va brauzer o'tishni umuman chizmaydi.
 *   `y` esa erkin (oshib qaytish uchun).
 */
window._htmlFxBez = function (i, v, setFn) {
  const h = (typeof selectedObj !== 'undefined' && selectedObj)
    ? (selectedObj.userData.htmlPage ||
       (selectedObj.userData.actions && selectedObj.userData.actions.htmlPage))
    : null;
  if (!h) return;
  const bez = Array.isArray(h.bez) ? h.bez.slice() : [0.42, 0, 0.58, 1];
  let n = parseFloat(v); if (!isFinite(n)) n = 0;
  bez[i] = (i === 0 || i === 2) ? Math.max(0, Math.min(1, n)) : Math.max(-3, Math.min(3, n));
  h.bez = bez;
};
