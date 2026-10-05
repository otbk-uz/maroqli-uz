// ============================================================
//  ⌨🖥 SCREEN KEYS — sozlash paneli
// ------------------------------------------------------------
//  Ekranga chiqarilgan klavishlarni tahrirlash: joylashuv (X/Y/Z),
//  o'lcham, rang, nom, qaysi klavishni taqlid qilishi va CSS.
//
//  ⚠ NEGA ALOHIDA FAYL: `screen-keys.js` — MANTIQ (klavish holati,
//    sintetik hodisa, saqlash). Bu — KO'RINISH. Ikkisi aralashsa
//    panelni o'zgartirish klavish mantig'ini buzish xavfini
//    tug'dirardi; loyihaning qolgan qismida ham shu ajratish bor
//    (`minipad.js` / `minipad-inspector.js`).
// ============================================================
(function () {
  'use strict';

  const S = () => window.ScreenKeys;

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[<>&"]/g, '');
  }

  // ============================================================
  //  🎨 TAYYOR USLUBLAR
  // ------------------------------------------------------------
  //  ⚠ Dizayner CSS yozishi SHART emas. Bo'sh maydon qo'yib
  //    "o'zingiz yozing" desak, panel amalda ishlatilmasdi.
  //    Tayyorlar — boshlang'ich nuqta; ustidan CSS yozish mumkin.
  // ============================================================
  const PRESETS = {
    'dark':   { bg: 'rgba(10,16,24,.72)',  fg: '#d8dee6', border: 'rgba(255,255,255,.22)', radius: 10 },
    'glass':  { bg: 'rgba(255,255,255,.10)', fg: '#ffffff', border: 'rgba(255,255,255,.45)', radius: 14 },
    'neon':   { bg: 'rgba(0,20,30,.65)',   fg: '#4de2c8', border: '#4de2c8', radius: 8,
                css: 'box-shadow:0 0 14px rgba(77,226,200,.55);text-shadow:0 0 8px rgba(77,226,200,.8);' },
    'round':  { bg: 'rgba(20,26,36,.85)',  fg: '#ffd479', border: 'rgba(255,212,121,.5)', radius: 999 },
    'danger': { bg: 'rgba(60,10,14,.78)',  fg: '#ff7a7a', border: 'rgba(255,90,90,.6)', radius: 10 },
  };

  /** Panel HTML — inspektor chaqiradi. */
  window.screenKeysPanelHTML = function () {
    const SK = S();
    if (!SK) return '';
    const keys = SK.list();
    if (!keys.length) {
      return `
      <div style="font-size:9px;color:var(--muted);line-height:1.7;padding:8px 2px">
        Hali ekranga chiqarilgan klavish yo'q.<br><br>
        <b>⌨ Klaviatura</b> muharririni oching → istalgan tugmani bosing →
        <b>🖥 Ekranga chiqarish</b>. Tugma ekran o'rtasida paydo bo'ladi va
        shu yerdan sozlanadi.
      </div>`;
    }
    const cur = SK.find(SK.editing()) || keys[0];
    const row = (label, inner) =>
      `<div class="fr"><span class="fl">${label}</span>${inner}</div>`;
    const num = (prop, min, max, step, unit) =>
      `<input type="number" min="${min}" max="${max}" step="${step}" value="${cur[prop]}"
        oninput="window._skSet('${prop}', parseFloat(this.value))"
        style="width:70px;background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:2px 5px;font-size:10px;border-radius:2px;font-family:'Share Tech Mono',monospace">
       <span style="font-size:8px;color:var(--muted);margin-left:3px">${unit || ''}</span>`;
    const col = (prop) =>
      `<input type="text" value="${_esc(cur[prop])}"
        oninput="window._skSet('${prop}', this.value)"
        style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:2px 5px;font-size:9px;border-radius:2px;font-family:'Share Tech Mono',monospace">`;

    return `
      <!-- ── Tugmalar ro'yxati ─────────────────────────────── -->
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
        ${keys.map(k => `<button onclick="window._skPick(${k.id})"
          style="padding:4px 9px;border-radius:3px;cursor:pointer;font-size:10px;
          font-family:'Share Tech Mono',monospace;
          border:1px solid ${k.id === cur.id ? 'var(--accent3)' : 'var(--border)'};
          background:${k.id === cur.id ? 'rgba(var(--accent3-rgb),.18)' : 'transparent'};
          color:${k.id === cur.id ? 'var(--accent3)' : 'var(--muted)'}"
          >${_esc(k.label)}</button>`).join('')}
      </div>

      <!-- ── Nom va klavish ────────────────────────────────── -->
      <!--  OGOHLANTIRISH: nom va klavish ALOHIDA maydonlar. Ekranda
            "Sakrash" deb yozilgan tugma Space ni bosishi mumkin.
            Talab aynan shunday edi: W ning o'rniga boshqa klavish
            qo'yish YOKI o'zi W bo'lib qolib, nomini o'zgartirish. -->
      ${row('🏷 Ekrandagi nom', `<input type="text" value="${_esc(cur.label)}"
        oninput="window._skSet('label', this.value)"
        style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:3px 6px;font-size:11px;border-radius:2px;font-family:'Share Tech Mono',monospace">`)}
      ${row('⌨ Qaysi klavish', `<button onclick="window._skCatch(this)"
        style="flex:1;padding:3px 6px;border-radius:2px;cursor:pointer;font-size:10px;
        font-family:'Share Tech Mono',monospace;border:1px solid var(--accent4);
        background:rgba(var(--accent4-rgb),.1);color:var(--accent4)">🎯 ${_esc(cur.code)}</button>`)}
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:0 0 7px">
        Nom va klavish alohida: ekranda «Sakrash» yozilgan tugma
        <b>Space</b> ni bosishi mumkin.
      </div>

      <!-- ── Joylashuv ─────────────────────────────────────── -->
      <div style="border-top:1px solid var(--border);padding-top:6px;margin-bottom:6px">
        <div class="fl" style="color:var(--accent3);margin-bottom:4px">📍 Joylashuv</div>
        ${row('X (chapdan)', num('x', 0, 100, 0.5, '%'))}
        ${row('Y (tepadan)', num('y', 0, 100, 0.5, '%'))}
        ${row('Z (chuqurlik)', num('z', 0, 999, 1, ''))}
        <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:2px 0 4px">
          X va Y — <b>foizda</b>, shuning uchun ekran o'lchami o'zgarsa tugma
          o'z joyida qoladi. Z — qaysi tugma qaysinisining ustida turishi.
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${[['↖',10,12],['↑',50,12],['↗',90,12],
             ['←',10,50],['◎',50,50],['→',90,50],
             ['↙',10,88],['↓',50,88],['↘',90,88]]
            .map(([s, x, y]) => `<button onclick="window._skPos(${x},${y})"
            style="width:26px;height:22px;border-radius:2px;cursor:pointer;font-size:10px;
            border:1px solid var(--border);background:transparent;color:var(--muted)">${s}</button>`).join('')}
        </div>
      </div>

      <!-- ── Ko'rinish ─────────────────────────────────────── -->
      <div style="border-top:1px solid var(--border);padding-top:6px;margin-bottom:6px">
        <div class="fl" style="color:var(--accent3);margin-bottom:4px">🎨 Ko'rinish</div>
        <div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:6px">
          ${Object.keys(PRESETS).map(n => `<button onclick="window._skPreset('${n}')"
            style="padding:3px 8px;border-radius:2px;cursor:pointer;font-size:9px;
            font-family:'Share Tech Mono',monospace;border:1px solid var(--border);
            background:transparent;color:var(--muted)">${n}</button>`).join('')}
        </div>
        ${row('Kenglik', num('w', 16, 400, 1, 'px'))}
        ${row('Balandlik', num('h', 16, 400, 1, 'px'))}
        ${row('Burchak', num('radius', 0, 999, 1, 'px'))}
        ${row('Shrift', num('fontSize', 6, 64, 1, 'px'))}
        ${row('Shaffoflik', num('opacity', 0, 1, 0.05, ''))}
        ${row('Fon', col('bg'))}
        ${row('Matn', col('fg'))}
        ${row('Chegara', col('border'))}
      </div>

      <!-- ── CSS ───────────────────────────────────────────── -->
      <!--  OGOHLANTIRISH: bu matn tugmaning style atributiga
            QO'SHILADI, ya'ni yuqoridagi maydonlar USTIDAN yozadi.
            Shuning uchun har qator nuqta-vergul bilan tugashi kerak. -->
      <div style="border-top:1px solid var(--border);padding-top:6px;margin-bottom:6px">
        <div class="fl" style="color:var(--accent3);margin-bottom:4px">✏️ Qo'shimcha CSS</div>
        <textarea rows="3" placeholder="box-shadow:0 0 14px #4de2c8; font-weight:700;"
          oninput="window._skSet('css', this.value)"
          style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
          padding:4px 6px;font-size:9px;border-radius:2px;resize:vertical;
          font-family:'Share Tech Mono',monospace">${_esc(cur.css)}</textarea>
        <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-top:3px">
          Yuqoridagi maydonlar ustidan yoziladi. Har qatorni <b>;</b> bilan tugating.
        </div>
      </div>

      <!-- ── Xulq ──────────────────────────────────────────── -->
      <div style="border-top:1px solid var(--border);padding-top:6px;margin-bottom:6px">
        ${row('🖐 Bosib turish', `<input type="checkbox" ${cur.hold !== false ? 'checked' : ''}
          onchange="window._skSet('hold', this.checked)">`)}
        <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:0 0 4px">
          Yoqiq — barmoq turgancha klavish bosilgan (yurish uchun).
          O'chiq — bir marta bosiladi va qo'yiladi (sakrash, o'q uzish).
        </div>
        ${row('👁 Muharrirda ko\'rinsin', `<input type="checkbox" ${cur.showInEdit ? 'checked' : ''}
          onchange="window._skSet('showInEdit', this.checked)">`)}
      </div>

      <button onclick="window._skDel()" style="width:100%;padding:5px;border-radius:3px;cursor:pointer;
        font-size:10px;font-family:'Share Tech Mono',monospace;border:1px solid rgba(255,68,68,.3);
        background:rgba(255,68,68,.08);color:#ff4444">🗑 Bu tugmani o'chirish</button>`;
  };

  /**
   * 👁 Tepa menyudagi tugma — ekran tugmalarini muharrirda
   *    ko'rsatish / yashirish.
   *
   * ⚠ Tugmaning KO'RINISHI ham yangilanadi: bosgan odam natijani
   *   ko'rishi kerak. Aks holda \"bosdim, nima bo'ldi?\" holati bo'lardi
   *   — ayniqsa sahnada hali bitta ham tugma yo'q bo'lsa.
   */
  window.toggleScreenKeysView = function () {
    const SK = S();
    if (!SK) return;
    const on = SK.toggleEditorVisible();
    const b = document.getElementById('skeys-btn');
    if (b) {
      b.style.opacity = on ? '' : '.45';
      b.title = on
        ? "⌨ Ekran tugmalari muharrirda KO'RINADI — yashirish uchun bosing"
        : "⌨ Ekran tugmalari muharrirda YASHIRIN (▶ Play da baribir ko'rinadi)";
    }
    if (window.log) log(on ? '⌨🖥 Tugmalar ko\'rinadi' : '⌨🖥 Tugmalar yashirildi', 'lok');
  };

  // ── Amallar ────────────────────────────────────────────────
  const _cur = () => { const SK = S(); return SK ? SK.find(SK.editing()) : null; };
  const _refresh = () => { if (typeof updateInspector === 'function') updateInspector(); };

  window._skPick = (id) => { S().setEditing(id); _refresh(); };
  window._skSet  = (prop, val) => {
    const k = _cur(); if (!k) return;
    S().set(k.id, prop, val);
    //  ⚠ Matn maydonlari uchun inspektorni QAYTA CHIZMAYMIZ: har
    //    harfda fokus yo'qolib, yozib bo'lmasdi. Faqat tugma va
    //    belgilash qutilari uchun yangilaymiz.
    if (prop === 'hold' || prop === 'showInEdit') _refresh();
  };
  window._skPos = (x, y) => {
    const k = _cur(); if (!k) return;
    S().set(k.id, 'x', x); S().set(k.id, 'y', y); _refresh();
  };
  window._skPreset = (name) => {
    const k = _cur(); if (!k) return;
    const p = PRESETS[name]; if (!p) return;
    //  ⚠ `css` faqat tayyorda BOR bo'lsa almashadi — aks holda
    //    dizayner yozgan CSS jimgina o'chib ketardi.
    for (const prop in p) S().set(k.id, prop, p[prop]);
    _refresh();
  };
  window._skDel = () => {
    const k = _cur(); if (!k) return;
    S().remove(k.id); _refresh();
  };
  window._skCatch = (btn) => {
    const k = _cur(); if (!k) return;
    if (btn) btn.textContent = '⏳ klavishni bosing...';
    const h = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      document.removeEventListener('keydown', h, { capture: true });
      //  ⚠ Sintetik hodisani QABUL QILMAYMIZ: ekrandagi tugmani
      //    bosish o'zi hodisa tarqatadi va u shu yerda ushlanib,
      //    tugma o'z-o'ziga bog'lanib qolardi.
      if (e._screenKey) { _refresh(); return; }
      S().set(k.id, 'code', e.code);
      _refresh();
    };
    document.addEventListener('keydown', h, { capture: true });
  };
})();
