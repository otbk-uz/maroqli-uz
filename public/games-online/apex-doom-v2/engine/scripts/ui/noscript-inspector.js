// ============================================================
//  🔢 NoScript — INSPEKTOR va PANEL  (build 58.45)
// ============================================================

const _nsEsc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, '');
const _nsRow = (lbl, inner) =>
  `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
     <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:96px;flex-shrink:0">${lbl}</span>
     ${inner}</div>`;
const _nsInp = (val, oninput, w) =>
  `<input value="${_nsEsc(val)}" style="width:${w || 66}px;background:var(--bg);border:1px solid var(--border);
    color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;
    border-radius:2px;outline:none" oninput="${oninput}">`;

// ── 🔘 Tugma / 🎯 Hitbox uchun kichik blok ────────────────────
//  ── 🎰 SLOT TANLOVI ──────────────────────────────────
//  ⚠ Obyekt QAYSI hisoblagichga tegishli. Bu bo'lmasa dizayner
//    slot yaratgani bilan blokni unga bog'lay olmasdi — hammasi
//    baribir birinchi slotda ishlab, ko'p slotlik ma'nosiz bo'lardi.
//  ⚠ Bitta slot bo'lsa tanlov KO'RSATILMAYDI: tanlanadigan narsa
//    yo'q, panelni bekorga to'ldirardi.
function _nsSlotSelect(curId, onchange) {
  const N = window.NoScriptSystem;
  if (!N) return '';
  const list = N.slots();
  if (list.length < 2) return '';
  const cur = (curId != null) ? curId : list[0].id;
  return `
    <div class="fr" style="margin-bottom:4px">
      <span class="fl" style="color:var(--accent3)">🎰 Slot</span>
      <select onchange="${onchange}" style="flex:1;background:var(--bg);border:1px solid var(--border);
        color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px">
        ${list.map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${_nsEsc(s.name)}</option>`).join('')}
      </select>
    </div>
    <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:0 0 5px">
      Qaysi hisoblagichga tegishli. Slotning shkalasi faqat o'z
      obyektlariga ta'sir qiladi.
    </div>`;
}

window.buildNoScriptOpHTML = function (o) {
  if (!o || !window.NoScriptSystem) return '';
  const ud = o.userData;
  if (!ud.isInteractiveBtn && !ud.isHitbox) return '';
  const n = ud.noscript;
  const d = n && n.drip;
  const r = n && n.rnd;
  const N = NoScriptSystem;

  if (!n) {
    return `
    <div style="border-top:1px solid rgba(var(--accent3-rgb),.18);margin-top:6px;padding-top:6px">
      <div class="fr"><span class="fl" style="color:var(--accent3)">🔢 NoScript</span>
        <button onclick="_nsAdd()" style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;
          font-family:'Share Tech Mono',monospace;border:1px solid var(--accent3);
          background:rgba(var(--accent3-rgb),.1);color:var(--accent3)">+ Raqamga ta'sir</button>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;font-family:'Share Tech Mono',monospace">
        Bosilganda / kirilganda umumiy raqamga son qo'shadi yoki ayiradi.
      </div>
    </div>`;
  }

  const opBtn = (op) => `<button onclick="_nsSet('op','${op}')" style="flex:1;padding:4px 2px;border-radius:3px;
    cursor:pointer;font-size:13px;font-family:'Share Tech Mono',monospace;
    border:1px solid ${n.op === op ? 'var(--accent3)' : 'var(--border)'};
    background:${n.op === op ? 'rgba(var(--accent3-rgb),.12)' : 'transparent'};
    color:${n.op === op ? 'var(--accent3)' : 'var(--muted)'}">${op}</button>`;

  return `
  <div style="border-top:1px solid rgba(var(--accent3-rgb),.18);margin-top:6px;padding-top:6px">
    <div class="fr"><span class="fl" style="color:var(--accent3)">🔢 NoScript</span>
      <button onclick="_nsDel()" style="padding:2px 7px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid var(--border);background:transparent;
        color:var(--muted)">✕</button>
    </div>
    ${_nsSlotSelect(n.slot, "_nsSet('slot', parseInt(this.value,10))")}
    <div style="display:flex;gap:5px;align-items:center;margin-bottom:4px">
      <div style="display:flex;gap:3px;width:76px">${opBtn('+')}${opBtn('-')}</div>
      ${_nsInp(n.value, "_nsSet('value', this.value, true)", 70)}
      <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">→ raqam</span>
    </div>
    ${_nsRow('🔒 Bir marta', `<button onclick="_nsSet('once', ${!n.once})" style="padding:3px 9px;border-radius:3px;
      cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
      border:1px solid ${n.once ? 'var(--accent3)' : 'var(--border)'};
      background:${n.once ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};
      color:${n.once ? 'var(--accent3)' : 'var(--muted)'}">${n.once ? '✓ Ha' : '✗ Cheksiz'}</button>`)}

    ${_nsRow('⏳ Tomchilab', `<button onclick="_nsDrip('on', ${!(d && d.on)})" style="padding:3px 9px;border-radius:3px;
      cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
      border:1px solid ${d && d.on ? 'var(--accent)' : 'var(--border)'};
      background:${d && d.on ? 'rgba(var(--accent-rgb),.1)' : 'transparent'};
      color:${d && d.on ? 'var(--accent)' : 'var(--muted)'}">${d && d.on ? '✓ Yoqiq' : "✗ O'chiq"}</button>`)}
    ${(d && d.on) ? `
      <div style="display:flex;gap:5px;align-items:center;margin-bottom:4px">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;width:96px">⏱ Davomiyligi</span>
        ${_nsInp(d.dur, "_nsDrip('dur', this.value, true)", 54)}
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">s</span>
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-bottom:4px">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;width:96px">🔁 Har</span>
        ${_nsInp(d.every, "_nsDrip('every', this.value, true)", 54)}
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">soniyada</span>
        ${_nsInp(d.step, "_nsDrip('step', this.value, true)", 54)}
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">ta</span>
      </div>
      <div style="font-size:8px;color:var(--accent);line-height:1.6;margin-bottom:4px;font-family:'Share Tech Mono',monospace">
        Natija: ${n.op}${n.value}, so'ng ${d.dur}s davomida
        ${(d.step >= 0 ? '+' : '') + d.step} × ${Math.max(1, Math.floor((+d.dur || 0) / (+d.every || 1)))} marta
        = jami ${(n.op === '-' ? -n.value : +n.value) + (+d.step || 0) * Math.max(0, Math.floor((+d.dur || 0) / (+d.every || 1)))}
      </div>` : ''}

    ${_nsRow('🎲 Tasodifiy', `<button onclick="_nsRnd('on', ${!(r && r.on)})" style="padding:3px 9px;border-radius:3px;
      cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
      border:1px solid ${r && r.on ? 'var(--accent2)' : 'var(--border)'};
      background:${r && r.on ? 'rgba(var(--accent2-rgb),.1)' : 'transparent'};
      color:${r && r.on ? 'var(--accent2)' : 'var(--muted)'}">${r && r.on ? '✓ Yoqiq' : "✗ O'chiq"}</button>`)}
    ${(r && r.on) ? `
      <div style="display:flex;gap:5px;align-items:center;margin-bottom:4px">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;width:96px">🔢 Oraliq</span>
        ${_nsInp(r.min, "_nsRnd('min', this.value, true)", 54)}
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">…</span>
        ${_nsInp(r.max, "_nsRnd('max', this.value, true)", 54)}
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-bottom:4px">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;width:96px">🖱 Necha marta</span>
        ${_nsInp(r.clicks, "_nsRnd('clicks', this.value, true)", 54)}
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">ta</span>
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-bottom:4px">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;width:96px">⏱ Vaqt</span>
        ${_nsInp(r.dur, "_nsRnd('dur', this.value, true)", 54)}
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">s</span>
      </div>
      <div style="font-size:8px;color:var(--accent2);line-height:1.6;margin-bottom:4px;font-family:'Share Tech Mono',monospace">
        ${(+r.clicks || 1) <= 1 || (+r.dur || 0) <= 0
          ? `Natija: ${n.op}(${r.min}…${r.max}) — <b>bir marta</b>, darhol`
          : `Natija: ${(+r.dur).toFixed(1)}s ichida <b>${+r.clicks} ta</b> son,
             har ${((+r.dur) / Math.max(1, (+r.clicks) - 1)).toFixed(2)}s da
             ${n.op}(${r.min}…${r.max})`}
      </div>` : ''}

    <div style="font-size:8px;color:var(--muted);line-height:1.6;font-family:'Share Tech Mono',monospace">
      🔒 Yoqiq bo'lsa bitta kalitni ikki marta olib bo'lmaydi.
      ⏹ Stop bosilganda qulf ochiladi.<br>
      ⏳ <b>Tomchilab</b> — bosilgach berilgan vaqt davomida asta qo'shadi
      yoki ayiradi. <b>Manfiy</b> son ham bo'ladi (zahar, yoqilg'i).<br>
      🎲 <b>Tasodifiy</b> — oraliqdan tasodifiy son. Asosiy qiymatga
      <b>qo'shimcha</b> ishlaydi: faqat tasodif kerak bo'lsa yuqoridagi
      sonni <b>0</b> qiling.<br>
      🖱 <b>1</b> va ⏱ <b>0</b> — bir martalik. Aks holda vaqt ichida
      teng taqsimlanadi.
    </div>
  </div>`;
};

window._nsAdd = function () {
  if (!selectedObj) return;
  selectedObj.userData.noscript = NoScriptSystem.defaultOp();
  updateInspector();
};
window._nsDel = function () {
  if (!selectedObj) return;
  delete selectedObj.userData.noscript;
  updateInspector();
};
window._nsDrip = function (k, v, keep) {
  if (!selectedObj || !selectedObj.userData.noscript) return;
  const n = selectedObj.userData.noscript;
  // ⚠ Eski sahnalarda `drip` yo'q — birinchi tegishda yaratamiz.
  if (!n.drip) n.drip = { on: false, dur: 5, every: 1, step: 1 };
  n.drip[k] = (k === 'on') ? !!v : (parseFloat(v) || 0);
  if (!keep) updateInspector();
};
window._nsRnd = function (k, v, keep) {
  if (!selectedObj || !selectedObj.userData.noscript) return;
  const n = selectedObj.userData.noscript;
  // ⚠ Eski sahnalarda `rnd` yo'q — birinchi tegishda yaratamiz.
  if (!n.rnd) n.rnd = { on: false, min: 1, max: 10, clicks: 1, dur: 0 };
  n.rnd[k] = (k === 'on') ? !!v : (parseFloat(v) || 0);
  if (!keep) updateInspector();
};
window._nsSet = function (k, v, keep) {
  if (!selectedObj || !selectedObj.userData.noscript) return;
  const n = selectedObj.userData.noscript;
  //  ⚠ `slot` ham SON — `<select>` satr beradi va `===` bilan
  //    solishtirilganda mos kelmasdi (yuqoridagi `slotId` bilan
  //    aynan bir xil tuzoq).
  n[k] = (k === 'value' || k === 'slot') ? (parseFloat(v) || 0) : v;
  if (!keep) updateInspector();
};

// ── 🧊 NoScript Blok inspektori ───────────────────────────────
window.buildNoScriptBlockHTML = function (o) {
  if (!o || !o.userData.isNoScript || !window.NoScriptSystem) return '';
  const N = NoScriptSystem;
  const ns = o.userData.ns || (o.userData.ns = N.defaultBlock());
  const slots = ns.slots || [];

  const condSel = (i, cur) =>
    `<select onchange="_nsSlot(${i},'cond',this.value)" style="background:var(--bg);border:1px solid var(--border);
      color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 3px;border-radius:2px">
      ${N.CONDS.map(c => `<option value="${c}" ${cur === c ? 'selected' : ''}>${c}</option>`).join('')}
    </select>`;

  //  🎰 Blok qaysi hisoblagichni tinglaydi
  const blockSlotSel = _nsSlotSelect(ns.slotId,
    "_nsBlock('slotId', parseInt(this.value,10))");

  const slotBox = (s, i) => `
    <div style="border:1px solid var(--border);border-radius:3px;padding:6px;margin-bottom:4px;background:var(--panel2)">
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
        <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;flex:1">
          ${i + 1}. ${_nsEsc(s.name || s.sourceName || 'slot')}${s.soundUrl ? ' 🔊' : ''}${(s.keyframes || []).length ? ' 🎬' : ''}</span>
        <button onclick="_nsSlotDel(${i})" style="padding:2px 6px;border:1px solid var(--red);background:transparent;
          color:var(--red);font-size:8px;border-radius:2px;cursor:pointer">✕</button>
      </div>
      <div style="display:flex;gap:4px;align-items:center;margin-bottom:4px">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;width:52px">🎯 Nishon</span>
        ${condSel(i, s.cond || '>=')}
        <input value="${s.target == null ? '' : s.target}" placeholder="${ns.globalTarget}"
          style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;
          font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
          oninput="_nsSlot(${i},'target',this.value,true)">
      </div>
      <div style="display:flex;gap:4px;margin-bottom:4px">
        <button onclick="_nsSlotTl(${i})" style="flex:1;padding:3px 2px;border:1px solid var(--accent4);
          background:rgba(var(--accent4-rgb),.08);color:var(--accent4);font-size:9px;border-radius:2px;cursor:pointer;
          font-family:'Share Tech Mono',monospace">🎬 ${(s.keyframes || []).length ? _nsEsc(s.sourceName) : 'Timeline'}</button>
        <button onclick="_nsSlotSnd(${i})" style="flex:1;padding:3px 2px;border:1px solid var(--accent2);
          background:rgba(var(--accent2-rgb),.08);color:var(--accent2);font-size:9px;border-radius:2px;cursor:pointer;
          font-family:'Share Tech Mono',monospace">🔊 ${s.soundUrl ? _nsEsc(s.soundName) : 'Musiqa'}</button>
      </div>
      <div style="display:flex;gap:4px;align-items:center;margin-bottom:4px">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;width:52px">⚡ Ishga</span>
        <select onchange="_nsSlot(${i},'actId',this.value)" style="flex:1;background:var(--bg);
          border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;
          font-size:10px;padding:2px 4px;border-radius:2px">
          <option value="">— yo'q —</option>
          ${(typeof objects !== 'undefined' ? objects : [])
            .filter(x => x.userData && (x.userData.isHitbox || x.userData.isInteractiveBtn ||
                                        x.userData.isMapLoader || x.userData.isMiniPad))
            .map(x => `<option value="${x.userData.id}" ${String(s.actId) === String(x.userData.id) ? 'selected' : ''}>${
              x.userData.isHitbox ? '🎯' : x.userData.isMapLoader ? '🗺' : x.userData.isMiniPad ? '🔢' : '🔘'
            } ${_nsEsc(x.userData.name)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:3px">
        ${['once', 'repeat'].map(m => `<button onclick="_nsSlot(${i},'mode','${m}')"
          style="flex:1;padding:3px 2px;border-radius:2px;cursor:pointer;font-size:9px;
          font-family:'Share Tech Mono',monospace;
          border:1px solid ${(s.mode || 'once') === m ? 'var(--accent)' : 'var(--border)'};
          background:${(s.mode || 'once') === m ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
          color:${(s.mode || 'once') === m ? 'var(--accent)' : 'var(--muted)'}">
          ${m === 'once' ? '1️⃣ Bir marta' : '🔁 Qayta'}</button>`).join('')}
      </div>
    </div>`;

  return `
  <div class="comp-block">
    <div class="comp-title"><span class="tag" style="background:rgba(var(--accent3-rgb),.15);color:var(--accent3)">NS</span>NO SCRIPT</div>

    ${blockSlotSel}
    ${_nsRow('🎯 Umumiy nishon', _nsInp(ns.globalTarget, "_nsBlock('globalTarget', this.value, true)", 76))}
    <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:6px;font-family:'Share Tech Mono',monospace">
      Slotda o'z nishoni yozilmagan bo'lsa shu ishlatiladi.
      Slotdagi qiymat <b>ustun</b> turadi.
    </div>

    ${slots.map(slotBox).join('')}
    <button onclick="_nsSlotAdd()" style="width:100%;padding:5px 2px;border-radius:3px;cursor:pointer;font-size:9px;
      font-family:'Share Tech Mono',monospace;border:1px solid var(--accent3);background:rgba(var(--accent3-rgb),.08);
      color:var(--accent3)">+ Slot qo'shish</button>

    <div style="font-size:8px;color:var(--muted);line-height:1.7;margin-top:6px;font-family:'Share Tech Mono',monospace">
      Joriy raqam: <b style="color:var(--accent3)">${N.value()}</b><br>
      1️⃣ <b>Bir marta</b> — shart bajarilgach slot yopiladi (standart).<br>
      🔁 <b>Qayta</b> — shart yolg'onga tushib yana rost bo'lsa qaytadan ishlaydi.<br>
      ⚡ <b>Ishga</b> — 🎯 hitbox, 🔘 tugma, 🗺 map loader yoki 🔢 minipadni
      <b>o'yinchisiz</b> ishga tushiradi.
    </div>
    <button class="action-btn del-btn" style="margin-top:5px" onclick="deleteSel()">✕ O'chirish</button>
  </div>`;
};

window._nsBlock = function (k, v, keep) {
  if (!selectedObj || !selectedObj.userData.ns) return;
  //  ⚠ `slotId` ham SON: `<select>` satr qaytaradi va u `===` bilan
  //    solishtirilganda hech qachon mos kelmasdi — blok jimgina
  //    birinchi slotga tushib qolardi.
  selectedObj.userData.ns[k] = (k === 'globalTarget' || k === 'slotId')
    ? (parseFloat(v) || 0) : v;
  if (!keep) updateInspector();
};
window._nsSlotAdd = function () {
  if (!selectedObj || !selectedObj.userData.ns) return;
  selectedObj.userData.ns.slots.push(NoScriptSystem.defaultSlot());
  updateInspector();
};
window._nsSlotDel = function (i) {
  if (!selectedObj || !selectedObj.userData.ns) return;
  selectedObj.userData.ns.slots.splice(i, 1);
  updateInspector();
};
window._nsSlot = function (i, k, v, keep) {
  if (!selectedObj || !selectedObj.userData.ns) return;
  const s = selectedObj.userData.ns.slots[i];
  if (!s) return;
  // ⚠ Bo'sh matn `null` bo'ladi, `0` EMAS: `null` — "umumiydan ol",
  //   `0` esa haqiqiy nishon.
  s[k] = (k === 'target') ? (String(v).trim() === '' ? null : (parseFloat(v) || 0)) : v;
  if (!keep) updateInspector();
};

/** 🎬 Timeline'dan animatsiya (keyframelar NUSXA olinadi). */
window._nsSlotTl = function (i) {
  if (!selectedObj || !selectedObj.userData.ns) return;
  if (typeof TimelineSystem === 'undefined' || !TimelineSystem.tracks) {
    log('⚠ Timeline topilmadi', 'lw'); return;
  }
  const usable = (TimelineSystem.tracks || []).filter(t =>
    t.keyframes && t.keyframes.length && !t.isFilter && !t.isWeather && !t.isSkybox && !t.isKino);
  if (!usable.length) { log("⚠ Timeline'da keyframe'li obyekt yo'q", 'lw'); return; }
  const old = document.getElementById('ns-tl-pick');
  if (old) old.remove();
  const back = document.createElement('div');
  back.id = 'ns-tl-pick';
  back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;' +
                       'align-items:center;justify-content:center';
  back.onclick = e => { if (e.target === back) back.remove(); };
  back.innerHTML = `<div style="background:#151b25;border:1px solid rgba(var(--accent3-rgb),.4);border-radius:6px;
    padding:14px 16px;min-width:300px;max-height:70vh;overflow:auto;font-family:'Share Tech Mono',monospace;color:#eee">
    <div style="font-size:12px;color:var(--accent3);letter-spacing:1.5px;margin-bottom:10px">🎬 ANIMATSIYA TANLASH</div>
    ${usable.map((t, k) => {
      const obj = objects.find(o => String(o.userData?.id) === String(t.objId));
      const nm = (obj && obj.userData.name) || ('Obyekt #' + t.objId);
      return `<button data-i="${k}" style="display:block;width:100%;text-align:left;margin-bottom:4px;
        background:rgba(var(--accent3-rgb),.06);border:1px solid rgba(var(--accent3-rgb),.25);color:#eee;padding:8px 10px;
        border-radius:3px;cursor:pointer;font-family:inherit;font-size:11px">▪ ${nm}
        <span style="color:#888">— ${t.keyframes.length} key</span></button>`;
    }).join('')}
  </div>`;
  back.querySelectorAll('[data-i]').forEach(b => {
    b.onclick = () => {
      const tr = usable[+b.dataset.i];
      const obj = objects.find(o => String(o.userData?.id) === String(tr.objId));
      const s = selectedObj.userData.ns.slots[i];
      s.keyframes = JSON.parse(JSON.stringify(tr.keyframes));
      s.targetObjectId = tr.objId;
      s.sourceName = (obj && obj.userData.name) || ('Obyekt #' + tr.objId);
      back.remove();
      log(`🎬 Slot ${i + 1} → "${s.sourceName}"`, 'lok');
      updateInspector();
    };
  });
  document.body.appendChild(back);
};

/**
 * 🔊 Musiqa yuklash.
 * ⚠ `readAsDataURL` — `AssetBundle` faylni `data:audio/…` ko'rinishidan
 *   tanib ZIP dagi `sound/` papkasiga chiqaradi.
 */
window._nsSlotSnd = function (i) {
  if (!selectedObj || !selectedObj.userData.ns) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'audio/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const s = selectedObj.userData.ns.slots[i];
      s.soundUrl = String(rd.result || '');
      s.soundName = f.name;
      log(`🔊 Slot ${i + 1} → "${f.name}"`, 'lok');
      updateInspector();
    };
    rd.readAsDataURL(f);
  };
  inp.click();
};

// ============================================================
//  🔢 NoScript — ☰ MENYUDAGI PANEL
// ------------------------------------------------------------
//  ⚠ Ilgari u IERARXIYA yonida uchinchi TAB edi. Noto'g'ri joy:
//    IERARXIYA va ASSETLAR — sahnaning DOIMIY ro'yxatlari, ular
//    ishlash davomida ochiq turadi. NoScript esa vaqti-vaqti bilan
//    ochiladigan sozlagich — 🌌 Skybox va 💾 Loyiha papkasi kabi.
//    Uchinchi tab bo'lib turishi ikkala doimiy ro'yxatni ham
//    torroq qilardi.
// ============================================================
window.showNoScriptPanel = function () {
  const old = document.getElementById('noscript-panel');
  if (old) { old.remove(); return; }
  if (!window.NoScriptSystem) { log('⚠ NoScriptSystem yuklanmagan', 'lw'); return; }
  const p = document.createElement('div');
  p.id = 'noscript-panel';
  p.classList.add('ui-modal');
  p.style.cssText = 'border:1px solid var(--accent3);min-width:320px;max-width:92vw;max-height:86vh;overflow:auto';
  document.body.appendChild(p);
  if (typeof makeDraggable === 'function') makeDraggable(p);
  nsRenderTab();
};

window.nsRenderTab = function () {
  const box = document.getElementById('noscript-panel');
  if (!box || !window.NoScriptSystem) return;
  const N = NoScriptSystem;
  const cfg = N.cfg;
  const list = N.slots();
  // ⚠ Tahrirlanayotgan slot indeksi PANELDA saqlanadi, tizimda emas:
  //   u ko'rinish holati, o'yin mantiqi emas. Tizimga qo'ysak
  //   sahna bilan saqlanib, boshqa kompyuterda "boshqa slot ochiq"
  //   bo'lib chiqardi.
  if (window._nsEditIdx == null || window._nsEditIdx >= list.length) window._nsEditIdx = 0;
  const idx = window._nsEditIdx;
  const c = list[idx];
  const bl = N.blocks();
  const ops = (typeof objects !== 'undefined' ? objects : [])
    .filter(o => o.userData && o.userData.noscript);

  const posBtn = (k, lbl) => `<button onclick="_nsCfg('pos','${k}')" style="flex:1;padding:3px 1px;border-radius:2px;
    cursor:pointer;font-size:8px;font-family:'Share Tech Mono',monospace;
    border:1px solid ${c.pos === k ? 'var(--accent)' : 'var(--border)'};
    background:${c.pos === k ? 'rgba(var(--accent-rgb),.12)' : 'transparent'};
    color:${c.pos === k ? 'var(--accent)' : 'var(--muted)'}">${lbl}</button>`;

  const modeBtn = (k, lbl, hint) => `<button onclick="_nsMode('${k}')" style="flex:1;padding:5px 3px;border-radius:3px;
    cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;line-height:1.4;
    border:1px solid ${cfg.mode === k ? 'var(--accent3)' : 'var(--border)'};
    background:${cfg.mode === k ? 'rgba(var(--accent3-rgb),.15)' : 'transparent'};
    color:${cfg.mode === k ? 'var(--accent3)' : 'var(--muted)'}"
    title="${hint}">${lbl}</button>`;

  const ruleBtn = (k, lbl) => `<button onclick="_nsSeq('seqRule','${k}')" style="flex:1;padding:4px 2px;border-radius:2px;
    cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
    border:1px solid ${cfg.seqRule === k ? 'var(--accent4)' : 'var(--border)'};
    background:${cfg.seqRule === k ? 'rgba(var(--accent4-rgb),.12)' : 'transparent'};
    color:${cfg.seqRule === k ? 'var(--accent4)' : 'var(--muted)'}">${lbl}</button>`;

  box.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;cursor:move">
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent3);letter-spacing:2px">🔢 NO SCRIPT</span>
      <button onclick="document.getElementById('noscript-panel').remove()"
        style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px">✕</button>
    </div>
    <div style="padding:2px">

      <!-- ── 🎰 SLOTLAR ─────────────────────────────────────── -->
      <!--  ⚠ Har slot MUSTAQIL hisoblagich: o'z qiymati, o'z ekran
            yozuvi, o'z chegaralari. Slotning shkalasi FAQAT o'z
            bloklariga ta'sir qiladi. -->
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:2px 0 4px">
        🎰 Slotlar (${list.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:7px">
        ${list.map((s, i) => {
          const live = N.slotLive(s);
          return `<button onclick="_nsPick(${i})" style="padding:4px 8px;border-radius:3px;cursor:pointer;
            font-size:9px;font-family:'Share Tech Mono',monospace;
            border:1px solid ${i === idx ? 'var(--accent3)' : 'var(--border)'};
            background:${i === idx ? 'rgba(var(--accent3-rgb),.18)' : 'transparent'};
            color:${i === idx ? 'var(--accent3)' : (live ? 'var(--text)' : 'var(--border)')}"
            title="${live ? 'faol' : 'navbatini kutyapti'}">${_nsEsc(s.name)} · ${N.value(s.id)}</button>`;
        }).join('')}
        <button onclick="_nsSlotNew()" style="padding:4px 10px;border-radius:3px;cursor:pointer;
          font-size:11px;font-family:'Share Tech Mono',monospace;font-weight:700;
          border:1px dashed var(--accent3);background:transparent;color:var(--accent3)"
          title="Yangi slot qo'shish">+</button>
      </div>

      <!-- ── ⚙️ Ishlash tartibi ─────────────────────────────── -->
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:2px 0 4px">
        ⚙️ Ishlash tartibi</div>
      <div style="display:flex;gap:4px;margin-bottom:5px">
        ${modeBtn('all', '⚡ Hammasi<br>birdaniga', 'Har slot mustaqil ishlaydi')}
        ${modeBtn('seq', '🔁 Galma-gal<br>navbat bilan', 'Bir vaqtda faqat bitta slot faol')}
      </div>
      ${cfg.mode === 'seq' ? `
        <div style="border:1px solid rgba(var(--accent4-rgb),.35);border-radius:3px;padding:6px 7px;
          background:rgba(var(--accent4-rgb),.05);margin-bottom:7px">
          <div style="font-size:9px;color:var(--accent4);margin-bottom:4px">
            Keyingisiga qachon o'tsin?</div>
          <div style="display:flex;gap:4px">
            ${ruleBtn('zero', '0 ga tushsa')}
            ${ruleBtn('target', 'songa yetsa')}
          </div>
          ${cfg.seqRule === 'target' ? `
            <div style="display:flex;align-items:center;gap:5px;margin-top:5px">
              <span style="font-size:9px;color:var(--muted)">Nishon son</span>
              ${_nsInp(cfg.seqTarget, "_nsSeq('seqTarget', this.value, true)", 70)}
            </div>` : ''}
          <div style="display:flex;align-items:center;gap:6px;margin-top:5px">
            <button onclick="_nsSeq('loop', ${!cfg.loop})" style="padding:3px 9px;border-radius:3px;
              cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
              border:1px solid ${cfg.loop ? 'var(--accent4)' : 'var(--border)'};
              background:${cfg.loop ? 'rgba(var(--accent4-rgb),.1)' : 'transparent'};
              color:${cfg.loop ? 'var(--accent4)' : 'var(--muted)'}">${cfg.loop ? '✓' : '✗'}</button>
            <span style="font-size:9px;color:var(--muted)">Oxiridan birinchisiga qaytsin</span>
          </div>
          <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:5px">
            Faol slot: <b style="color:var(--accent4)">${_nsEsc(N.activeSlot().name)}</b>.
            Galma-gal rejimida faqat shu slot ekranda ko'rinadi va faqat
            uning bloklari ishlaydi — qolganlari navbatini kutadi.
          </div>
          <button onclick="NoScriptSystem.nextSlot('qo\\'lda');nsRenderTab()"
            style="width:100%;margin-top:5px;padding:4px;border-radius:3px;cursor:pointer;font-size:9px;
            font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
            background:transparent;color:var(--muted)">⏭ Keyingisiga o'tkazish (sinov)</button>
        </div>` : `
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:7px">
          Hamma slot bir vaqtda ishlaydi va hammasi ekranda ko'rinadi.
          Har biri faqat o'z bloklariga ta'sir qiladi.
        </div>`}

      <!-- ── Tanlangan slot ─────────────────────────────────── -->
      <div style="display:flex;align-items:center;gap:7px;padding:7px 8px;border:1px solid rgba(var(--accent3-rgb),.35);
        border-radius:4px;background:rgba(var(--accent3-rgb),.05);margin-bottom:8px">
        <input value="${_nsEsc(c.name)}" oninput="_nsCfg('name', this.value, true)"
          style="flex:1;background:transparent;border:none;color:var(--accent3);outline:none;
          font-family:'Share Tech Mono',monospace;font-size:10px">
        <span style="font-size:20px;color:var(--accent3);font-family:'Share Tech Mono',monospace;
          font-weight:700">${N.value(c.id)}</span>
        ${list.length > 1 ? `<button onclick="_nsSlotDrop(${c.id})" title="Bu slotni o'chirish"
          style="background:none;border:none;color:var(--red);cursor:pointer;font-size:13px">🗑</button>` : ''}
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:4px 0 3px">⚙️ Sozlama</div>
      ${_nsRow("🎬 Boshlang'ich", _nsInp(c.start, "_nsCfg('start', this.value, true)", 66))}
      ${_nsRow('⬆️ Maksimum', `<button onclick="_nsCfg('useMax', ${!c.useMax})" style="padding:3px 9px;border-radius:3px;
        cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
        border:1px solid ${c.useMax ? 'var(--accent3)' : 'var(--border)'};
        background:${c.useMax ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};
        color:${c.useMax ? 'var(--accent3)' : 'var(--muted)'}">${c.useMax ? '✓' : '✗'}</button>
        ${c.useMax ? _nsInp(c.max, "_nsCfg('max', this.value, true)", 62) : ''}`)}
      ${_nsRow('⬇️ Minimum', `<button onclick="_nsCfg('useMin', ${!c.useMin})" style="padding:3px 9px;border-radius:3px;
        cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
        border:1px solid ${c.useMin ? 'var(--accent3)' : 'var(--border)'};
        background:${c.useMin ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};
        color:${c.useMin ? 'var(--accent3)' : 'var(--muted)'}">${c.useMin ? '✓' : '✗'}</button>
        ${c.useMin ? _nsInp(c.min, "_nsCfg('min', this.value, true)", 62) : ''}`)}
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:2px 0 6px">
        Chegara <b>shu slotniki</b> — boshqa slotlarga ta'sir qilmaydi.
        Maksimum 100 bo'lsa, tugmani qancha bossangiz ham <b>100</b> bo'lib turadi.
      </div>

      ${_nsRow('🖥 Ekranda', `<button onclick="_nsCfg('ui', ${!c.ui})" style="padding:3px 9px;border-radius:3px;
        cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
        border:1px solid ${c.ui ? 'var(--accent3)' : 'var(--border)'};
        background:${c.ui ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};
        color:${c.ui ? 'var(--accent3)' : 'var(--muted)'}">${c.ui ? "✓ Ko'rinadi" : "✗ Yashirin"}</button>`)}
      ${c.ui ? `
        ${_nsRow('📝 Matn', `<input value="${_nsEsc(c.text)}" style="flex:1;background:var(--bg);
          border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;
          font-size:10px;border-radius:2px;outline:none" oninput="_nsCfg('text', this.value, true)">`)}
        <div style="font-size:8px;color:var(--muted);margin:0 0 4px">{n} — shu slotning qiymati</div>
        <div style="display:flex;gap:3px;margin-bottom:4px">
          ${posBtn('top-left', '↖')}${posBtn('top-center', '↑')}${posBtn('top-right', '↗')}
          ${posBtn('bottom-left', '↙')}${posBtn('bottom-right', '↘')}
        </div>
        ${_nsRow('🎨 Rang', `<input type="color" value="${c.color}" oninput="_nsCfg('color', this.value, true)"
          style="width:24px;height:20px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none">
          ${_nsInp(c.size, "_nsCfg('size', this.value, true)", 50)}<span style="font-size:8px;color:var(--muted)">px</span>`)}
      ` : ''}

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:8px 0 3px">
        🧊 Bloklar (${bl.length})</div>
      ${bl.length ? bl.map(b => {
        const own = (b.userData.ns && b.userData.ns.slotId != null)
          ? N.slotById(b.userData.ns.slotId) : list[0];
        const mine = own.id === c.id;
        return `
        <div onclick="selectObject(objects.find(o=>o.userData.id===${b.userData.id}))"
          style="display:flex;align-items:center;gap:6px;padding:5px 6px;border:1px solid ${mine ? 'rgba(var(--accent3-rgb),.4)' : 'var(--border)'};
          border-radius:3px;margin-bottom:3px;cursor:pointer;background:var(--panel2)">
          <span style="font-size:13px">🧊</span>
          <span style="flex:1;font-size:10px;color:var(--text)">${_nsEsc(b.userData.name)}</span>
          <span style="font-size:8px;color:${mine ? 'var(--accent3)' : 'var(--muted)'};font-family:'Share Tech Mono',monospace">
            🎰 ${_nsEsc(own.name)}</span>
          <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">
            ${(b.userData.ns && b.userData.ns.slots || []).length} shart</span>
        </div>`; }).join('')
        : `<div style="font-size:9px;color:var(--border);padding:6px;line-height:1.6">Blok yo'q — ASSETLAR → 🧊 NoScript</div>`}

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin:8px 0 3px">
        ± Ta'sir qiluvchilar (${ops.length})</div>
      ${ops.length ? ops.map(o => {
        const n = o.userData.noscript;
        const own = (n.slot != null) ? N.slotById(n.slot) : list[0];
        return `
        <div onclick="selectObject(objects.find(x=>x.userData.id===${o.userData.id}))"
          style="display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid var(--border);
          border-radius:3px;margin-bottom:3px;cursor:pointer;background:var(--panel2)">
          <span style="font-size:11px">${o.userData.isHitbox ? '🎯' : '🔘'}</span>
          <span style="flex:1;font-size:10px;color:var(--text)">${_nsEsc(o.userData.name)}</span>
          <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">🎰 ${_nsEsc(own.name)}</span>
          <span style="font-size:11px;color:${n.op === '-' ? 'var(--red)' : 'var(--accent3)'};
            font-family:'Share Tech Mono',monospace">${n.op}${n.value}</span>
        </div>`; }).join('')
        : `<div style="font-size:9px;color:var(--border);padding:6px;line-height:1.6">
             🔘 tugma yoki 🎯 hitboxni tanlab "+ Raqamga ta'sir" bosing</div>`}

      <div style="display:flex;gap:4px;margin-top:8px">
        <button onclick="NoScriptSystem.apply('+',10,'panel',${c.id});nsRenderTab()" style="flex:1;padding:4px 2px;
          border-radius:3px;cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
          border:1px solid var(--accent3);background:rgba(var(--accent3-rgb),.08);color:var(--accent3)">+10</button>
        <button onclick="NoScriptSystem.apply('-',10,'panel',${c.id});nsRenderTab()" style="flex:1;padding:4px 2px;
          border-radius:3px;cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
          border:1px solid var(--red);background:rgba(255,68,68,.08);color:var(--red)">-10</button>
        <button onclick="NoScriptSystem.reset();nsRenderTab()" style="padding:4px 8px;border-radius:3px;
          cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
          background:transparent;color:var(--muted)">↺</button>
      </div>
      <div style="font-size:8px;color:var(--border);line-height:1.6;margin-top:5px;font-family:'Share Tech Mono',monospace">
        Sinov tugmalari — ▶ Play siz ham raqamni o'zgartirib ko'rish uchun.
      </div>
    </div>`;
};

// ── 🎰 Slot boshqaruvi ───────────────────────────────────────
window._nsPick = function (i) { window._nsEditIdx = i; nsRenderTab(); };

window._nsSlotNew = function () {
  if (!window.NoScriptSystem) return;
  const s = NoScriptSystem.addSlot();
  //  ⚠ Yangi slot DARHOL tanlanadi: dizayner uni qo'shgach nomini
  //    va matnini o'zgartirmoqchi bo'ladi, qo'lda bosib o'tish
  //    keraksiz qadam.
  window._nsEditIdx = NoScriptSystem.slots().findIndex(x => x.id === s.id);
  nsRenderTab();
};

window._nsSlotDrop = function (id) {
  if (!window.NoScriptSystem) return;
  if (NoScriptSystem.removeSlot(id)) window._nsEditIdx = 0;
  nsRenderTab();
  if (typeof updateInspector === 'function') updateInspector();
};

window._nsMode = function (m) {
  if (!window.NoScriptSystem) return;
  NoScriptSystem.cfg.mode = m;
  //  ⚠ Rejim almashganda qiymatlar tiklanadi: 'seq' ga o'tganda
  //    boshqa slotlar allaqachon to'lgan bo'lsa, birinchi slot
  //    faollashishi bilan ular jimgina "tugagan" holatda qolardi.
  NoScriptSystem.reset();
  nsRenderTab();
};

window._nsSeq = function (k, v, keep) {
  if (!window.NoScriptSystem) return;
  NoScriptSystem.cfg[k] = (k === 'seqTarget') ? (parseFloat(v) || 0) : v;
  if (!keep) nsRenderTab();
};

// ⚠ Endi TANLANGAN SLOTGA yozadi, umumiy `cfg` ga emas.
window._nsCfg = function (k, v, keep) {
  if (!window.NoScriptSystem) return;
  const N = NoScriptSystem;
  const s = N.slots()[window._nsEditIdx || 0];
  if (!s) return;
  const num = (k === 'start' || k === 'size' || k === 'max' || k === 'min');
  N.setSlot(s.id, k, num ? (parseFloat(v) || 0) : v);
  // ⚠ Chegara o'zgarsa joriy raqam ham qirqiladi — panelda 100 deb
  //   yozib, ekranda 250 turishi chalkash bo'lardi.
  if (k === 'max' || k === 'min' || k === 'useMax' || k === 'useMin') {
    N.set(N.value(s.id), 'chegara', s.id);
  }
  if (k === 'start') N.set(s.start, 'boshlang\'ich', s.id);
  if (!keep) nsRenderTab();
};
