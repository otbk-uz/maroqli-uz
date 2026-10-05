// ============================================================
//  🎛 ALLKEY — inspektor paneli
// ------------------------------------------------------------
//  ⚠ NEGA ALOHIDA FAYL: `allkey.js` — MANTIQ (zona testi, qo'llash,
//    orqaga qaytarish). Bu — KO'RINISH. Loyihaning qolgan qismida
//    ham shu ajratish bor (`minipad.js` / `minipad-inspector.js`).
// ============================================================
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v).replace(/[<>&"]/g, '');
  const row = (l, inner) => `<div class="fr"><span class="fl">${l}</span>${inner}</div>`;
  const num = (v, on, w) =>
    `<input type="number" step="any" value="${v}" oninput="${on}"
      style="width:${w || 62}px;background:var(--bg);border:1px solid var(--border);color:var(--text);
      padding:2px 5px;font-size:10px;border-radius:2px;font-family:'Share Tech Mono',monospace">`;
  const txt = (v, on, ph) =>
    `<input value="${esc(v)}" placeholder="${ph || ''}" oninput="${on}"
      style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
      padding:2px 5px;font-size:10px;border-radius:2px;font-family:'Share Tech Mono',monospace">`;
  const chk = (v, on) => `<input type="checkbox" ${v ? 'checked' : ''} onchange="${on}">`;

  // ============================================================
  //  🔊 · 🎬 TANLASH — dvigateldagilardan yoki FAYLDAN
  // ------------------------------------------------------------
  //  ⚠ Ilgari bu yerda oddiy MATN maydoni edi: dizayner ovoz nomini
  //    QO'LDA yozardi. Nomni bir harf xato yozsa — ovoz jimgina
  //    chiqmasdi va sabab hech qayerda ko'rinmasdi.
  //
  //  Endi ro'yxatdan tanlanadi: dvigatelga allaqachon yuklangan
  //  ovozlar (🔊 SoundSystem kutubxonasi) va ⏱ timeline dagi
  //  animatsiya kliplari. Yonida 📂 import tugmasi — yangi fayl
  //  qo'shish uchun.
  // ============================================================
  const SEL = "background:var(--bg);border:1px solid var(--border);color:var(--text);" +
              "font-size:10px;padding:2px 4px;border-radius:2px;flex:1;" +
              "font-family:'Share Tech Mono',monospace";

  /** 🔊 Dvigatelga yuklangan ovozlar ro'yxati. */
  function _akSounds() {
    try {
      const lib = window.SoundSystem && SoundSystem.library;
      return lib ? Object.keys(lib) : [];
    } catch (e) { return []; }
  }

  /** ⏱ Timeline dagi animatsiya kliplari + ⌨ klavish animatsiyalari. */
  function _akAnims() {
    const out = new Set();
    try {
      const cl = window.TimelineSystem && TimelineSystem.clips;
      if (cl) for (const c of (Array.isArray(cl) ? cl : Object.keys(cl))) {
        out.add(typeof c === 'string' ? c : (c && c.name));
      }
    } catch (e) {}
    //  ⚠ ⌨ Klavishga biriktirilganlar ham — dizayner ularni
    //    allaqachon yaratgan va qayta yozishga majbur bo'lmasligi kerak.
    try {
      const a = window._kbAnimations || {};
      for (const k in a) if (a[k] && a[k].animName) out.add(a[k].animName);
    } catch (e) {}
    out.delete(undefined); out.delete('');
    return [...out];
  }

  function _akSndPick(grp, cur) {
    const list = _akSounds();
    return `
      <select onchange="_akSub2('${grp}','sound',this.value)" style="${SEL}">
        <option value="">— yo'q —</option>
        ${list.map(n => `<option value="${esc(n)}" ${cur === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
        ${(cur && list.indexOf(cur) < 0) ? `<option value="${esc(cur)}" selected>${esc(cur)} (yo'q)</option>` : ''}
      </select>
      <button onclick="_akImportSound('${grp}')" title="mp3/wav yuklash"
        style="padding:2px 7px;border-radius:2px;cursor:pointer;font-size:10px;
        border:1px solid var(--border);background:transparent;color:var(--muted)">📂</button>`;
  }

  function _akAnimPick(grp, cur) {
    const list = _akAnims();
    return `
      <select onchange="_akSub2('${grp}','anim',this.value)" style="${SEL}">
        <option value="">— yo'q —</option>
        ${list.map(n => `<option value="${esc(n)}" ${cur === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
        ${(cur && list.indexOf(cur) < 0) ? `<option value="${esc(cur)}" selected>${esc(cur)} (yo'q)</option>` : ''}
      </select>
      <button onclick="_akImportAnim('${grp}')" title="JSON animatsiya yuklash"
        style="padding:2px 7px;border-radius:2px;cursor:pointer;font-size:10px;
        border:1px solid var(--border);background:transparent;color:var(--muted)">📂</button>`;
  }

  window.buildAllKeyHTML = function (o) {
    const ud = o.userData;
    const AK = window.AllKeySystem;
    if (!AK) return '';
    //  ⚠ Eski format bo'lsa — ko'chiramiz (panel ochilgan zahoti).
    if (AK._migrate) AK._migrate(ud);
    if (!ud.keys) ud.keys = {};
    const keyCount = Object.keys(ud.keys).length;
    //  🖥 Shablon nomlari — IERARXIYA → 🎮 Buttons dan.
    //  ⚠ NOMI bo'yicha, id bo'yicha EMAS: shablonlar serverda va
    //    id lar boshqa kompyuterda mos kelmasligi mumkin.
    const tplNames = (window.ButtonTemplates ? ButtonTemplates.list() : []).map(x => x.name);
    const live = AK.owner() === o;

    const modeBtn = (k, lbl, hint) => `<button onclick="_akSet('mode','${k}')"
      style="flex:1;padding:5px 3px;border-radius:3px;cursor:pointer;font-size:9px;
      font-family:'Share Tech Mono',monospace;line-height:1.4;
      border:1px solid ${ud.mode === k ? '#9b86ff' : 'var(--border)'};
      background:${ud.mode === k ? 'rgba(122,92,255,.15)' : 'transparent'};
      color:${ud.mode === k ? '#9b86ff' : 'var(--muted)'}" title="${hint}">${lbl}</button>`;

    const shapeBtn = (k, lbl) => `<button onclick="_akSet('zoneShape','${k}')"
      style="flex:1;padding:3px 2px;border-radius:2px;cursor:pointer;font-size:9px;
      font-family:'Share Tech Mono',monospace;
      border:1px solid ${ud.zoneShape === k ? '#9b86ff' : 'var(--border)'};
      background:${ud.zoneShape === k ? 'rgba(122,92,255,.12)' : 'transparent'};
      color:${ud.zoneShape === k ? '#9b86ff' : 'var(--muted)'}">${lbl}</button>`;

    const skBtn = (r, i, k, lbl) => `<button onclick="_akRule(${i},'skMode','${k}')"
      style="flex:1;padding:2px 1px;border-radius:2px;cursor:pointer;font-size:8px;
      font-family:'Share Tech Mono',monospace;
      border:1px solid ${r.skMode === k ? 'var(--accent3)' : 'var(--border)'};
      background:${r.skMode === k ? 'rgba(var(--accent3-rgb),.12)' : 'transparent'};
      color:${r.skMode === k ? 'var(--accent3)' : 'var(--muted)'}">${lbl}</button>`;

    return `
    <!--  ⚠ JOYLASHUV bo'limi SHU YERDA: zona surilishi va burilishi
          kerak (⏱ timeline bilan animatsiya ham qilinadi). Uni
          qo'shmasak dizayner zonani faqat gizmo bilan surardi va
          aniq koordinata kirita olmasdi. 🔢 MiniPad bilan bir xil
          naqsh — applyT() allaqachon mavjud. -->
    <div class="comp-block">
      <div class="comp-title"><span class="tag">TRS</span>Joylashuv</div>
      <div class="fl" style="margin:2px 0 3px">Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" id="px" value="${o.position.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="py" value="${o.position.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="pz" value="${o.position.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
      <div class="fl" style="margin:6px 0 3px">Aylanish (°)</div>
      <div class="xyzr">
        <div><input class="xi" id="rx" value="${(o.rotation.x * 57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="ry" value="${(o.rotation.y * 57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="rz" value="${(o.rotation.z * 57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title">
        <span class="tag" style="background:rgba(122,92,255,.18);color:#9b86ff">AK</span>ALLKEY
        ${live ? '<span style="font-size:8px;color:#9b86ff;margin-left:6px">● AMALDA</span>' : ''}
      </div>

      <div style="font-size:9px;color:var(--muted);line-height:1.6;margin-bottom:7px">
        O'yinchi shu hududga kirsa klaviatura boshqacha ishlaydi.
        Chiqib ketsa — hammasi <b>o'z holiga</b> qaytadi.
      </div>

      <!-- ── Rejim ─────────────────────────────────────────── -->
      <div style="display:flex;gap:4px;margin-bottom:5px">
        ${modeBtn('inside', '📍 Zona ichida<br>turganda', "Chiqib ketsa darhol standartga qaytadi")}
        ${modeBtn('sticky', '📌 Chiqsa ham<br>qoladi', "Boshqa zona yoki ⏹ Stop bekor qilguncha")}
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:8px">
        ${ud.mode === 'sticky'
          ? '📌 Kirgach sozlama QOLADI — boshqa AllKey zonasi yoki ⏹ Stop bekor qilguncha. ' +
            '"Qurolni oldingdan keyin boshqaruv o\'zgardi" kabi holatlar uchun.'
          : '📍 Faqat zona ichida amal qiladi. Bu eng bashorat qilinadigan xulq.'}
      </div>

      <!-- ── Zona ──────────────────────────────────────────── -->
      <div style="display:flex;gap:3px;margin-bottom:4px">
        ${shapeBtn('box', '⬛ Quti')}${shapeBtn('sphere', '⭕ Shar')}
      </div>
      ${row('📏 O\'lcham', `
        ${num(ud.triggerSize.x, "_akSize('x',this.value)", 48)}
        ${num(ud.triggerSize.y, "_akSize('y',this.value)", 48)}
        ${num(ud.triggerSize.z, "_akSize('z',this.value)", 48)}`)}
      <div style="font-size:8px;color:var(--muted);margin:0 0 8px">
        Zona 👻 o'tkazuvchi — o'yinchi undan bemalol o'tadi.
        Timeline bilan ham surish/kattalashtirish mumkin.
      </div>

      <!-- ── ⌨ KLAVIATURA ───────────────────────────────
            ⚠ O'Z MENYUSI YO'Q. Ilgari bu yerda alohida qoida
              ro'yxati bor edi — dizayner uchun IKKI xil interfeys:
              biri klaviatura muharriri, ikkinchisi shu panel.
              Ikkalasi bir xil narsani boshqarardi, lekin bu yerda
              imkoniyat kamroq edi (masalan 🎬 animatsiya klipi,
              🖱 sichqoncha, kombo — yo'q edi).
            Endi TANISH oyna ochiladi va u shu zonaning jadvalini
              tahrirlaydi. Standart sozlama o'yinchiga beriladi,
              o'zgartirish kerak bo'lsa — shu tugma. -->
      <div style="border-top:1px solid var(--border);padding-top:6px;margin-bottom:7px">
        <button onclick="_akOpenKb()" style="width:100%;padding:7px;border-radius:4px;cursor:pointer;
          font-size:11px;font-family:'Share Tech Mono',monospace;font-weight:700;
          border:1px solid #9b86ff;background:rgba(122,92,255,.12);color:#9b86ff">
          ⌨ Klaviatura muharririni ochish</button>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:5px">
          Shu zona uchun: 🚫 bloklash · 🎬 animatsiya · 🔊 ovoz ·
          🔗 kombo klavish. Bu yerda qo'yilganlar FAQAT zona ichida
          ishlaydi va chiqishda o'z holiga qaytadi.
          <br><b style="color:#9b86ff">${keyCount}</b> ta klavish sozlangan.
        </div>
        ${keyCount ? `<button onclick="_akClearKeys()" style="width:100%;margin-top:5px;padding:4px;
          border-radius:3px;cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
          border:1px solid rgba(255,68,68,.3);background:rgba(255,68,68,.06);color:#ff4444">
          🗑 Hammasini tozalash</button>` : ''}
      </div>

      <!-- ── 🖥 Ekran tugmalari shabloni ──────────────────
            ⚠ Butun joylashuv almashadi, bitta tugma emas.
              \"Mashinada boshqa tugmalar\" — aynan shu kerak. -->
      <div style="border-top:1px solid var(--border);padding-top:6px;margin-bottom:7px">
        ${row('🖥 Tugma shabloni', `
          <select onchange="_akSet('skTemplate', this.value)" style="flex:1;background:var(--bg);
            border:1px solid var(--border);color:var(--text);font-size:10px;padding:2px 4px;
            border-radius:2px;font-family:'Share Tech Mono',monospace">
            <option value="">— tegilmaydi —</option>
            ${tplNames.map(n => `<option value="${esc(n)}" ${ud.skTemplate === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
          </select>`)}
        <div style="font-size:8px;color:var(--muted);line-height:1.6">
          ${tplNames.length
            ? 'Zonaga kirganda ekran tugmalari shu shablonga almashadi, chiqishda tiklanadi.'
            : "Hali shablon yo'q — IERARXIYA → 🎮 Buttons dan yasang."}
        </div>
      </div>

      <!-- ── 🧍 Kapsula · 🖱 Sichqoncha · 📷 Kamera ─────────── -->
      <div style="border-top:1px solid var(--border);padding-top:6px">
        ${row('🧍 Kapsula o\'lchami', chk(ud.capsule.on, "_akSub('capsule','on',this.checked)"))}
        ${ud.capsule.on ? `
          ${row('  radius', num(ud.capsule.radius, "_akSub('capsule','radius',this.value,1)"))}
          ${row('  balandlik', num(ud.capsule.height, "_akSub('capsule','height',this.value,1)"))}` : ''}

        ${row('🖱 Sichqoncha sezgirligi', chk(ud.mouse.on, "_akSub('mouse','on',this.checked)"))}
        ${ud.mouse.on ? row('  sens', num(ud.mouse.sens, "_akSub('mouse','sens',this.value,1)")) : ''}

        ${row('📷 Kamera fix', chk(ud.camFix.on, "_akSub('camFix','on',this.checked)"))}
        ${ud.camFix.on ? `
          ${row('  yaw', num(ud.camFix.yaw, "_akSub('camFix','yaw',this.value,1)"))}
          ${row('  pitch', num(ud.camFix.pitch, "_akSub('camFix','pitch',this.value,1)"))}
          ${row('  qulflansin', chk(ud.camFix.lock, "_akSub('camFix','lock',this.checked)"))}` : ''}
      </div>

      <!-- ── 🏃 Harakat ────────────────────────────── -->
      <div style="border-top:1px solid var(--border);padding-top:6px;margin-top:6px">
        ${row('🏃 Harakat', chk(ud.move && ud.move.on, "_akSub('move','on',this.checked)"))}
        ${(ud.move && ud.move.on) ? `
          ${row('  tezlik ×', num(ud.move.speed, "_akSub('move','speed',this.value,1)"))}
          ${row('  sakrash ×', num(ud.move.jump, "_akSub('move','jump',this.value,1)"))}
          ${row('  tortishish ×', num(ud.move.gravity, "_akSub('move','gravity',this.value,1)"))}
          <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:0 0 5px">
            KO'PAYTUVCHI: 0.5 = ikki barobar sekin, 2 = ikki barobar tez.
            Dizaynerning o'z tezligi saqlanadi.
          </div>` : ''}

        <!-- ── 🚫 Cheklovlar ── -->
        <div class="fl" style="margin:5px 0 3px">🚫 Cheklovlar</div>
        ${row('  🏃 yugurish', chk(ud.lockRun, "_akSet('lockRun',this.checked)"))}
        ${row('  ⬆ sakrash', chk(ud.lockJump, "_akSet('lockJump',this.checked)"))}
        ${row('  🔫 otish', chk(ud.lockShoot, "_akSet('lockShoot',this.checked)"))}
        ${row('  ✋ ko\'tarish', chk(ud.lockPick, "_akSet('lockPick',this.checked)"))}
      </div>

      <!-- ── 🎬 Kirish / chiqish ──────────────────────── -->
      <!--  ⚠ Bular HOLAT emas, HODISA: bir marta ishlaydi va orqaga
            QAYTARILMAYDI. Ovozni \"qaytarib\" bo'lmaydi. -->
      <div style="border-top:1px solid var(--border);padding-top:6px;margin-top:6px">
        <div class="fl" style="margin-bottom:3px">🎬 Kirganda (bir marta)</div>
        ${row('  🔊 ovoz', _akSndPick('onEnter', ud.onEnter.sound))}
        ${row('  🎬 animatsiya', _akAnimPick('onEnter', ud.onEnter.anim))}
        ${row('  🔢 son', `
          <select onchange="_akSub2('onEnter','nsOp',this.value)" style="background:var(--bg);
            border:1px solid var(--border);color:var(--text);font-size:10px;padding:2px 4px;
            border-radius:2px;font-family:'Share Tech Mono',monospace">
            ${['', '+', '-', '×', '÷'].map(o =>
              `<option value="${o}" ${ud.onEnter.nsOp === o ? 'selected' : ''}>${o || '—'}</option>`).join('')}
          </select>${num(ud.onEnter.nsValue, "_akSub2('onEnter','nsValue',this.value)", 56)}`)}
        <div class="fl" style="margin:5px 0 3px">🎬 Chiqqanda (bir marta)</div>
        ${row('  🔊 ovoz', _akSndPick('onExit', ud.onExit.sound))}
        ${row('  🎬 animatsiya', _akAnimPick('onExit', ud.onExit.anim))}
        ${row('  🔢 son', `
          <select onchange="_akSub2('onExit','nsOp',this.value)" style="background:var(--bg);
            border:1px solid var(--border);color:var(--text);font-size:10px;padding:2px 4px;
            border-radius:2px;font-family:'Share Tech Mono',monospace">
            ${['', '+', '-', '×', '÷'].map(o =>
              `<option value="${o}" ${ud.onExit.nsOp === o ? 'selected' : ''}>${o || '—'}</option>`).join('')}
          </select>${num(ud.onExit.nsValue, "_akSub2('onExit','nsValue',this.value)", 56)}`)}
      </div>

      <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:7px">
        ⚠ Har o'zgarish OLDIN eski qiymatni eslab qoladi va chiqishda
        AYNAN o'shani tiklaydi — dizaynerning o'z sozlamasi yo'qolmaydi.
        🎬 Kirish/chiqish esa HODISA: bir marta ishlaydi va
        qaytarilmaydi.
      </div>
    </div>`;
  };

  // ── Amallar ────────────────────────────────────────────────
  const _sel = () => (typeof selectedObj !== 'undefined' && selectedObj &&
                      selectedObj.userData && selectedObj.userData.isAllKey) ? selectedObj : null;
  const _ref = () => { if (typeof updateInspector === 'function') updateInspector(); };

  window._akSet = function (k, v) {
    const o = _sel(); if (!o) return;
    o.userData[k] = v;
    _ref();
  };

  window._akSize = function (axis, v) {
    const o = _sel(); if (!o) return;
    const n = parseFloat(v);
    //  ⚠ Nol yoki manfiy o'lcham zonani ko'rinmas qilardi va tetik
    //    hech qachon ishlamasdi. Eng kichigi 0.1.
    o.userData.triggerSize[axis] = (isFinite(n) && n > 0) ? n : 0.1;
    if (window.AllKeySystem) AllKeySystem.syncSize(o);
  };

  window._akSub = function (grp, k, v, keep) {
    const o = _sel(); if (!o) return;
    if (!o.userData[grp]) o.userData[grp] = {};
    o.userData[grp][k] = (typeof v === 'boolean') ? v : (parseFloat(v) || 0);
    if (!keep) _ref();
  };

  /**
   * ⌨ Klaviatura muharririni SHU ZONA uchun ochadi.
   *
   * ⚠ `_kbEditTarget` — muharrir nimani tahrirlashini almashtiradi.
   *   Yopilganda u avtomatik tozalanadi (`keybindings.js`), aks holda
   *   keyingi safar global sozlama o'rniga zona tahrirlanardi va
   *   dizayner buni sezmasdi.
   */
  window._akOpenKb = function () {
    const o = _sel(); if (!o) return;
    if (typeof openBigKeyboard !== 'function') {
      try { log('⚠ Klaviatura muharriri yuklanmagan', 'lw'); } catch (e) {}
      return;
    }
    window._kbEditTarget = o;
    openBigKeyboard();
  };

  window._akClearKeys = function () {
    const o = _sel(); if (!o) return;
    const n = Object.keys(o.userData.keys || {}).length;
    if (n && !confirm(`${n} ta klavish sozlamasi o'chirilsinmi?`)) return;
    o.userData.keys = {};
    _ref();
  };

  window._akRuleAdd = function () {
    const o = _sel(); if (!o || !window.AllKeySystem) return;
    if (!Array.isArray(o.userData.rules)) o.userData.rules = [];
    o.userData.rules.push(AllKeySystem.newRule());
    _ref();
  };

  window._akRuleDel = function (i) {
    const o = _sel(); if (!o) return;
    o.userData.rules.splice(i, 1);
    _ref();
  };

  window._akRule = function (i, k, v, keep) {
    const o = _sel(); if (!o) return;
    const r = o.userData.rules[i]; if (!r) return;
    //  ⚠ `nsValue` SON: matn qolsa `apply()` da `NaN` chiqib, raqam
    //    butunlay buzilardi.
    r[k] = (k === 'nsValue') ? (parseFloat(v) || 0) : v;
    if (!keep) _ref();
  };

  /**
   * 🎬 Kirish/chiqish hodisasi maydonlari.
   * ⚠ `nsValue` SON: matn qolsa `apply()` da `NaN` chiqib, raqam
   *   butunlay buzilardi.
   */
  window._akSub2 = function (grp, k, v) {
    const o = _sel(); if (!o) return;
    if (!o.userData[grp]) o.userData[grp] = {};
    o.userData[grp][k] = (k === 'nsValue') ? (parseFloat(v) || 0) : v;
  };

  /**
   * 📂 mp3/wav yuklash — mavjud 🔊 `SoundSystem` yo'lidan.
   * ⚠ O'z yuklovchimizni yozmaymiz: ovoz kutubxonaga ro'yxatga
   *   olinishi, eksportda `sound/` ga chiqishi va ⏹ Stop da
   *   to'xtatilishi kerak — bularning hammasi o'sha tizimda bor.
   */
  window._akImportSound = function (grp) {
    const o = _sel(); if (!o) return;
    if (typeof SoundSystem === 'undefined' || !SoundSystem.importFile) {
      try { log('⚠ 🔊 Ovoz tizimi topilmadi', 'lw'); } catch (e) {}
      return;
    }
    SoundSystem.importFile((name) => {
      if (!name) return;
      if (!o.userData[grp]) o.userData[grp] = {};
      o.userData[grp].sound = name;
      _ref();
    });
  };

  /**
   * 📂 JSON animatsiya yuklash — mavjud 🎬 `AnimImport` yo'lidan.
   * ⚠ Xuddi shu sabab: klip ⏱ timeline ga ro'yxatga olinishi kerak,
   *   aks holda uni ijro etib bo'lmasdi.
   */
  window._akImportAnim = function (grp) {
    const o = _sel(); if (!o) return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = (e) => {
      const f = e.target && e.target.files && e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = (ev) => {
        try {
          const data = JSON.parse(String(ev.target.result || ''));
          const nm = f.name.replace(/\.\w+$/, '');
          //  ⚠ `TimelineSystem.importClip` bo'lsa — o'sha yo'ldan.
          //    Bo'lmasa hech bo'lmasa NOMNI saqlaymiz, shunda dizayner
          //    nima yuklaganini ko'radi (jim yo'qolib ketmaydi).
          if (window.TimelineSystem && TimelineSystem.importClip) {
            TimelineSystem.importClip(nm, data);
          }
          if (!o.userData[grp]) o.userData[grp] = {};
          o.userData[grp].anim = nm;
          try { log(`🎬 "${nm}" animatsiyasi yuklandi`, 'lok'); } catch (er) {}
          _ref();
        } catch (er) {
          try { log('❌ JSON o\'qilmadi: ' + (er && er.message), 'le'); } catch (e2) {}
        }
      };
      rd.readAsText(f);
    };
    inp.click();
  };

  window._akCatch = function (i, btn) {
    const o = _sel(); if (!o) return;
    if (btn) btn.textContent = '⏳ bosing...';
    const h = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      document.removeEventListener('keydown', h, { capture: true });
      //  ⚠ Sintetik hodisani rad etamiz: ⌨🖥 ekran tugmasi o'zi hodisa
      //    tarqatadi va u shu yerda ushlanib qolardi.
      if (e._screenKey) { _ref(); return; }
      const r = o.userData.rules[i];
      if (r) r.code = e.code;
      _ref();
    };
    document.addEventListener('keydown', h, { capture: true });
  };
})();
