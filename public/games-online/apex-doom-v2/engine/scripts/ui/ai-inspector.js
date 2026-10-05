// ============================================================
//  🤖 AI AGENT — INSPEKTOR  (build 58.40)
// ------------------------------------------------------------
//  Yo'riqnomaning 24-bo'limidagi tuzilma, o'zbekcha:
//
//    AI AGENT
//    ├── Umumiy      ├── Xulq       ├── Idrok
//    ├── Navigatsiya ├── Animatsiya ├── Jang
//    └── Hodisalar
// ============================================================

window.buildAIInspectorHTML = function (o) {
  if (!o || !window.AIAgentSystem) return '';
  const A = AIAgentSystem;
  const ai = o.userData.ai;
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, '');

  if (!o.userData.isAIAgent) {
    return `
    <div style="border-top:1px solid rgba(var(--accent-rgb),.15);padding-top:6px;margin-top:6px">
      <div class="fr"><span class="fl" style="color:var(--accent)">🤖 AI Agent</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:4px">
        ${Object.keys(A.TYPES).map(k =>
          `<button onclick="_aiMake('${k}')" title="${esc(A.TYPES[k].izoh)}"
            style="padding:5px 2px;border-radius:3px;cursor:pointer;font-size:9px;
            font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
            background:transparent;color:var(--muted)">${A.TYPES[k].nom}</button>`).join('')}
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;font-family:'Share Tech Mono',monospace">
        Obyektni aqlli qiladi: ko'radi, patrul qiladi, quvadi, qidiradi.
        Tur — faqat <b>standart sozlamalar</b>; keyin hammasini o'zingiz o'zgartirasiz.
      </div>
    </div>`;
  }

  const rt = A._rt(o);
  const row = (lbl, inner) =>
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
       <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:104px;flex-shrink:0">${lbl}</span>
       ${inner}</div>`;
  const num = (k, min, max, step, unit) =>
    `<input type="number" min="${min}" max="${max}" step="${step}" value="${ai[k]}"
      style="width:66px;background:var(--bg);border:1px solid var(--border);color:var(--text);
      padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
      oninput="_aiSet('${k}', this.value)">${unit ? `<span style="font-size:8px;color:var(--muted);margin-left:3px">${unit}</span>` : ''}`;
  const tgl = (k, yes, no) =>
    `<button onclick="_aiSet('${k}', ${!ai[k]})" style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;
      font-family:'Share Tech Mono',monospace;border:1px solid ${ai[k] ? 'var(--accent3)' : 'var(--border)'};
      background:${ai[k] ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};
      color:${ai[k] ? 'var(--accent3)' : 'var(--muted)'}">${ai[k] ? yes : no}</button>`;
  const sect = (t) =>
    `<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);margin:8px 0 3px">${t}</div>`;

  return `
  <div style="border-top:1px solid rgba(var(--accent-rgb),.15);padding-top:6px;margin-top:6px">
    <div class="fr">
      <span class="fl" style="color:var(--accent)">🤖 ${esc(A.TYPES[ai.aiType] ? A.TYPES[ai.aiType].nom : ai.aiType)}</span>
      <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace">${rt.state}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-bottom:4px">
      ${Object.keys(A.TYPES).map(k =>
        `<button onclick="_aiType('${k}')" style="padding:4px 1px;border-radius:3px;cursor:pointer;font-size:8px;
          font-family:'Share Tech Mono',monospace;
          border:1px solid ${ai.aiType === k ? 'var(--accent)' : 'var(--border)'};
          background:${ai.aiType === k ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
          color:${ai.aiType === k ? 'var(--accent)' : 'var(--muted)'}">${A.TYPES[k].nom}</button>`).join('')}
    </div>

    ${sect('🏃 Xulq')}
    ${row('Yurish tezligi', num('speedWalk', 0, 20, 0.1, 'm/s'))}
    ${row('Yugurish', num('speedRun', 0, 30, 0.1, 'm/s'))}
    ${row('❤️ Jon', num('health', 1, 10000, 1, ''))}

    ${sect('👁 Idrok')}
    ${row('📏 Ko\'rish masofasi', num('seeDist', 0, 200, 1, 'm'))}
    ${row('🔦 Ko\'rish burchagi', num('fov', 10, 360, 5, '°'))}
    ${row('🧱 Devor to\'sadi', tgl('useRay', '✓ Ha', '✗ Yo\'q'))}
    ${row('⏱ Sezish vaqti', num('seeTime', 0, 10, 0.1, 's'))}
    ${row('🧠 Xotira', num('memoryTime', 0, 60, 0.5, 's'))}
    <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:4px;font-family:'Share Tech Mono',monospace">
      🧱 <b>Devor to'sadi</b> — o'chirilsa agent to'siq orqasidan ham ko'radi.<br>
      🧠 <b>Xotira</b> — nishon ko'zdan g'oyib bo'lgach shuncha soniya izlaydi.
    </div>

    ${sect('🚩 Patrul')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:4px">
      ${[['loop','🔁 Aylana'],['reverse','↔ Orqaga'],['random','🎲 Tasodifiy'],['randomWalk','🚶 Tasodifiy sayr']]
        .map(([k, n]) => `<button onclick="_aiSet('patrolMode','${k}')" style="padding:4px 2px;border-radius:3px;
          cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
          border:1px solid ${ai.patrolMode === k ? 'var(--accent)' : 'var(--border)'};
          background:${ai.patrolMode === k ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
          color:${ai.patrolMode === k ? 'var(--accent)' : 'var(--muted)'}">${n}</button>`).join('')}
    </div>
    ${row('⏳ Kutish (min/max)', `${num('waitMin', 0, 120, 0.5, '')}<span style="font-size:9px;color:var(--muted);margin:0 4px">…</span>${num('waitMax', 0, 120, 0.5, 's')}`)}
    <div style="display:flex;gap:3px;margin-bottom:4px">
      <button onclick="_aiAddPoint()" style="flex:1;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid var(--accent);
        background:rgba(var(--accent-rgb),.08);color:var(--accent)">+ Nuqta (shu joyga)</button>
      <button onclick="_aiClearPoints()" style="padding:4px 8px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
        background:transparent;color:var(--muted)">✕</button>
    </div>
    <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:4px">
      ${ai.patrol.length ? `📍 ${ai.patrol.length} ta nuqta` : 'Nuqta yo\'q — agent joyida turadi'}
    </div>

    ${sect('🏃 Quvish va qidiruv')}
    ${row('Quvish tezligi', num('chaseSpeed', 0, 30, 0.1, 'm/s'))}
    ${row('Eng uzoq masofa', num('chaseMax', 1, 300, 1, 'm'))}
    ${row('🔍 Qidiruv vaqti', num('searchTime', 0, 60, 0.5, 's'))}
    ${row('↩ Qaytish tezligi', num('returnSpeed', 0, 30, 0.1, 'm/s'))}

    ${sect('⚔️ Jang')}
    ${row('Hujum qiladi', tgl('canAttack', '✓ Ha', '✗ Yo\'q'))}
    ${ai.canAttack ? `
      ${row('Hujum masofasi', num('attackDist', 0.1, 30, 0.1, 'm'))}
      ${row('Hujum oralig\'i', num('attackRate', 0.1, 10, 0.1, 's'))}
      ${row('Zarar', num('attackDamage', 0, 1000, 1, ''))}
    ` : ''}
    ${row('Qochadi', tgl('canFlee', '✓ Ha', '✗ Yo\'q'))}
    ${ai.canFlee ? row('Qochish chegarasi', num('fleeHealth', 0, 100, 1, '❤️')) : ''}

    ${sect('🧭 Navigatsiya')}
    ${row('🧱 To\'siqni sezish', num('avoidDist', 0, 20, 0.1, 'm'))}
    ${row('⛔ Tiqilish vaqti', num('stuckTime', 0.2, 20, 0.1, 's'))}
    ${row('   Urinishlar', num('stuckTries', 1, 10, 1, ''))}

    <button onclick="_aiRemove()" style="width:100%;padding:4px 2px;border-radius:3px;cursor:pointer;font-size:9px;
      font-family:'Share Tech Mono',monospace;border:1px solid var(--red);background:rgba(255,68,68,.08);
      color:var(--red);margin-top:8px">✕ AI ni olib tashlash</button>

    <div style="font-size:8px;color:var(--muted);line-height:1.7;margin-top:5px;font-family:'Share Tech Mono',monospace">
      ⚠ <b>Tur butun xulqni belgilamaydi</b> — u faqat standart sozlamalarni
      to'ldiradi. Yakuniy xulqni idrok, patrul, jang va hodisalar
      birgalikda hal qiladi.
    </div>
  </div>`;
};

// ── Yordamchilar ──────────────────────────────────────────────
window._aiMake = function (type) {
  if (!selectedObj) return;
  AIAgentSystem.makeAgent(selectedObj, type);
  log(`🤖 "${selectedObj.userData.name}" → ${AIAgentSystem.TYPES[type].nom}`, 'lok');
  updateInspector();
};
window._aiType = function (type) {
  if (!selectedObj || !selectedObj.userData.ai) return;
  // ⚠ Faqat TUR almashadi — dizayner qo'lda sozlagan qiymatlar
  //   saqlanadi. Standartlarni qayta yuklasak, uning ishi yo'qolardi.
  selectedObj.userData.ai.aiType = type;
  updateInspector();
};
window._aiSet = function (k, v) {
  if (!selectedObj || !selectedObj.userData.ai) return;
  const ai = selectedObj.userData.ai;
  const cur = ai[k];
  ai[k] = (typeof cur === 'boolean') ? !!v
        : (typeof cur === 'number') ? (parseFloat(v) || 0)
        : v;
  if (typeof cur === 'boolean' || typeof cur === 'string') updateInspector();
};
window._aiAddPoint = function () {
  if (!selectedObj || !selectedObj.userData.ai) return;
  const p = selectedObj.position;
  selectedObj.userData.ai.patrol.push({ x: p.x, y: p.y, z: p.z, wait: null });
  log(`📍 Patrul nuqtasi ${selectedObj.userData.ai.patrol.length}`, 'lok');
  updateInspector();
};
window._aiClearPoints = function () {
  if (!selectedObj || !selectedObj.userData.ai) return;
  selectedObj.userData.ai.patrol = [];
  updateInspector();
};
window._aiRemove = function () {
  if (!selectedObj) return;
  AIAgentSystem.removeAgent(selectedObj);
  updateInspector();
};
