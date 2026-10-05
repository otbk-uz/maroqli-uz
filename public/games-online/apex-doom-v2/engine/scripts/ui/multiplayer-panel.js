// ============================================================
//  🌐 MULTIPLAYER — panel
// ------------------------------------------------------------
//  ⚠ NEGA ALOHIDA FAYL: `multiplayer.js` — MANTIQ (ulanish,
//    protokol, arvohlar). Bu — KO'RINISH. Loyihaning qolgan
//    qismida ham shu ajratish bor.
// ============================================================
(function () {
  'use strict';

  const ID = 'mp-panel';
  const M = () => window.MultiplayerSystem;
  const esc = (v) => String(v == null ? '' : v).replace(/[<>&"]/g, '');

  /**
 * RTDB qoidalarini vaqtinchalik maydonga qo'yib nusxalaydi.
 *
 * ⚠ Qoidalar SINOV UCHUN: `rooms` ga hamma yoza oladi. Tayyor
 *   o'yinda buni cheklash kerak — matn buni ochiq aytadi, aks
 *   holda dizayner sinov qoidalari bilan chiqarib yuborardi.
 *
 * ⚠ `navigator.clipboard` HAMMA JOYDA ishlamaydi (http sahifada
 *   yoki eski brauzerda yo'q). Shuning uchun zaxira yo'l ham bor —
 *   matnni ko'rsatamiz, dizayner o'zi nusxalaydi.
 */
/**
 * 📋 Yopishtirilgan konfiguratsiyani JONLI tekshiradi.
 *
 * ⚠ Panel qayta chizilmaydi — faqat ko'rsatkich yangilanadi.
 *   Qayta chizsak `textarea` fokusdan chiqib, kursor boshiga
 *   sakrardi va matn terish mumkin bo'lmasdi.
 */
window._mpHint = function (key) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('mp-hint-' + key);
  if (!el) return;
  const S = window.MultiplayerSystem;
  const raw = S ? (S.cfg[key] || '') : '';
  if (!raw.trim()) { el.textContent = ''; return; }
  const c = window._fbParseConfig ? window._fbParseConfig(raw) : null;
  if (c && c.databaseURL) {
    el.style.color = '#4de2c8';
    el.textContent = '\u2705 ' + c.databaseURL;
  } else {
    el.style.color = '#ffaa44';
    //  ⚠ Nima qilish kerakligi ham aytiladi: faqat \"topilmadi\"
    //    desak dizayner qayerda xato qilganini bilmasdi.
    el.textContent = "\u26A0 databaseURL topilmadi — `databaseURL: \"https://...\"` qatori bormi?";
  }
};

/**
 * 📍 Spawn nuqtalari — qo'shish / o'chirish / o'zgartirish.
 * ⚠ Matn maydonlari uchun inspektor QAYTA CHIZILMAYDI: har raqamda
 *   chizsak maydon fokusdan chiqib, son kiritib bo'lmasdi.
 */
window._mpSpawnAdd = function () {
  const S = window.MultiplayerSystem;
  if (!S) return;
  if (!Array.isArray(S.cfg.spawnPoints)) S.cfg.spawnPoints = [];
  S.cfg.spawnPoints.push({ x: 0, y: 0, z: 0 });
  showMultiplayerPanel();
};

window._mpSpawnDel = function (i) {
  const S = window.MultiplayerSystem;
  if (!S || !Array.isArray(S.cfg.spawnPoints)) return;
  S.cfg.spawnPoints.splice(i, 1);
  showMultiplayerPanel();
};

window._mpSpawnSet = function (i, k, v) {
  const S = window.MultiplayerSystem;
  if (!S || !Array.isArray(S.cfg.spawnPoints) || !S.cfg.spawnPoints[i]) return;
  S.cfg.spawnPoints[i][k] = v;
};

/**
 * 🎯 Hozirgi joydan nuqta oladi.
 * ⚠ Tanlangan obyekt bo'lsa UNDAN, bo'lmasa KAMERADAN. Qo'lda
 *   yozishdan tez va aniqroq: dizayner sahnada turgan joyini
 *   koordinata sifatida bilmaydi.
 */
window._mpSpawnHere = function () {
  const S = window.MultiplayerSystem;
  if (!S) return;
  let p = null;
  try {
    if (typeof selectedObj !== 'undefined' && selectedObj) p = selectedObj.position;
    else if (typeof camera !== 'undefined' && camera) p = camera.position;
  } catch (e) {}
  if (!p) { try { log('\u26a0 Joy aniqlanmadi', 'lw'); } catch (e) {} return; }
  if (!Array.isArray(S.cfg.spawnPoints)) S.cfg.spawnPoints = [];
  S.cfg.spawnPoints.push({
    x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2),
  });
  showMultiplayerPanel();
};

window._mpCopyRules = function () {
  // ============================================================
  //  🔒 QOIDALAR — nima qila oladi, nima QILA OLMAYDI
  // ------------------------------------------------------------
  //  QILA OLADI (kirish nazorati):
  //    • boshqa o'yinchining yozuvini o'chirishga yo'l qo'ymaslik
  //    • butun xonani o'chirib yuborishga yo'l qo'ymaslik
  //    • turlarni tekshirish (ball — son, nom — qisqa matn)
  //    • xabar hajmini cheklash
  //
  //  ⚠ QILA OLMAYDI (o'yin mantig'i):
  //    • \"bu ballni haqiqatan yig'dimi?\" — qoida uchun `9999`
  //      ham to'g'ri yozuv: son, o'z joyida, o'z nomidan
  //    • \"bir kadrda 500 metr yurdimi?\"
  //
  //    Buning uchun VAKOLATLI SERVER kerak: o'yin mantig'i
  //    serverda ishlaydi, mijoz faqat TUGMA BOSISHINI yuboradi.
  //    Firebase RTDB bunga mo'ljallanmagan.
  //
  //  ⚠ `auth` YO'Q: o'yin anonim ishlaydi va `uid` brauzerda
  //    saqlanadi. Shuning uchun qoida \"o'z yozuvi\" ni ISHONCH
  //    bilan tekshira olmaydi — faqat tuzilma va turlarni.
  //    Haqiqiy himoya Firebase Auth talab qiladi.
  // ============================================================
  const rules = JSON.stringify({
    rules: {
      rooms: {
        //  ⚠ Xona darajasida `.write` YO'Q — shu bois hech kim
        //    butun xonani bir zarb bilan o'chira olmaydi.
        '$room': {
          peers: {
            '.read': true,
            '$peer': {
              '.write': true,
              //  Tuzilma: faqat kutilgan maydonlar.
              '.validate': "newData.hasChildren(['name'])",
              name: { '.validate': 'newData.isString() && newData.val().length <= 20' },
              t:    { '.validate': 'newData.isNumber()' },
              s: {
                p: { '.validate': 'newData.hasChildren()' },
                //  ⚠ Faqat TUR tekshiriladi, qiymat emas: o'yinchi
                //    qayerda turishini qoida bilmaydi.
                r: { '.validate': 'newData.isNumber()' },
                a: { '.validate': 'newData.isString()' },
                c: { '.validate': 'newData.isNumber()' },
                h: { '.validate': 'newData.isNumber()' },
              },
            },
          },
          msg: {
            '.read': true,
            //  ⚠ `ts` bo'yicha tartiblanadi — indeks busiz Firebase
            //    har so'rovda butun ro'yxatni tortib olardi.
            '.indexOn': ['ts'],
            '$msg': {
              //  ⚠ YOZISH mumkin, O'ZGARTIRISH mumkin emas: eski
              //    xabarni qayta yozib, boshqaning gapini
              //    almashtirib bo'lmaydi.
              '.write': 'data.val() === null || newData.val() === null',
              '.validate': "newData.hasChildren(['t', 'ts'])",
              t:    { '.validate': 'newData.isString() && newData.val().length <= 24' },
              ts:   { '.validate': 'newData.isNumber()' },
              //  ⚠ Uzunlik CHEKLANADI: busiz bitta odam megabaytlik
              //    matn yuborib xonani ishdan chiqarardi.
              text: { '.validate': 'newData.isString() && newData.val().length <= 200' },
              name: { '.validate': 'newData.isString() && newData.val().length <= 20' },
              v:    { '.validate': 'newData.isNumber()' },
            },
          },
        },
      },
    },
  }, null, 2);
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rules);
      ok = true;
    }
  } catch (e) {}
  try {
    if (ok) log('\ud83d\udccb RTDB qoidalari nusxalandi — Firebase konsoliga qo\'ying', 'lok');
    else {
      log('\ud83d\udccb RTDB qoidalari (nusxalang):', 'lok');
      log(rules, 'lok');
    }
    //  ⚠ CHEGARA OCHIQ AYTILADI: dizayner qoidalarni "himoya" deb
    //    o'ylab, aldovga qarshi hech nima qilmay qo'yishi mumkin.
    log('\u26a0 Qoidalar TUZILMANI himoya qiladi, o\'yin mantig\'ini EMAS:', 'lw');
    log('   o\'yinchi o\'z ballini istagancha yoza oladi.', 'lw');
    log('   Haqiqiy himoya — vakolatli server (hozircha yo\'q).', 'lw');
  } catch (e) {}
};

window.showMultiplayerPanel = function () {
    if (typeof document === 'undefined') return;
    //  ⚠ Ikki marta ochilmasin: qayta bosilsa YOPILADI (boshqa
    //    panellar bilan bir xil xulq).
    const old = document.getElementById(ID);
    if (old) { old.remove(); return; }
    const el = document.createElement('div');
    el.id = ID;
    el.style.cssText =
      'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9998;' +
      'width:min(430px,92%);background:rgba(10,15,22,.97);' +
      "border:1px solid rgba(0,255,190,.3);border-radius:7px;padding:14px 16px;" +
      "font-family:'Share Tech Mono',monospace;box-shadow:0 14px 50px rgba(0,0,0,.65);" +
      //  ⚠ SCROLL: panel o'sib ketdi (backend, spawn, chat, AFK,
      //    qoidalar) va pastki yarmi EKRANDAN CHIQIB ketardi —
      //    dizayner tugmalarni umuman ko'rmasdi.
      //  ⚠ `max-height` EKRANGA nisbatan: qat'iy piksel qo'ysak
      //    kichik ekranda yana kesilardi, kattasida esa bo'sh joy
      //    qolardi.
      'max-height:calc(100vh - 110px);overflow-y:auto;overscroll-behavior:contain';
    document.body.appendChild(el);
    window._mpPaint();
  };

  window._mpPaint = function () {
    const el = document.getElementById(ID);
    if (!el) return;
    const S = M();
    if (!S) { el.innerHTML = '<div style="color:#ff6b6b;font-size:11px">⚠ Tizim yuklanmagan</div>'; return; }

    const st = S.status();
    const on = st === 'on';
    const lbl = { off: '⚪ Ulanmagan', connecting: '⏳ Ulanmoqda…',
                  on: '🟢 Ulangan', error: '🔴 Xato' }[st] || st;
    const list = S.roster();

    const row = (l, inner) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
        <span style="font-size:10px;color:var(--muted);min-width:78px">${l}</span>${inner}</div>`;
    const inp = (val, ph, on) =>
      `<input value="${esc(val)}" placeholder="${esc(ph)}" oninput="${on}"
        style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:4px 7px;font-size:11px;border-radius:3px;font-family:inherit">`;

    el.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:12px">
        <span style="color:#4de2c8;font-size:13px;letter-spacing:2px">🌐 MULTIPLAYER</span>
        <span style="flex:1"></span>
        <span style="font-size:10px;color:${on ? '#4de2c8' : 'var(--muted)'}">${lbl}</span>
        <button onclick="document.getElementById('${ID}').remove()"
          style="margin-left:10px;background:none;border:none;color:var(--border);
          cursor:pointer;font-size:14px">✕</button>
      </div>

      <!--  BACKEND TANLOVI.
            Adapterlar scripts/net/ papkasida ro'yxatdan o'tadi va bu
            yerda ro'yxat ULARDAN olinadi - qo'lda yozilmaydi.
            Yangi backend qo'shilsa panel o'zi biladi; qo'lda
            yozsak biri qo'shilib, ikkinchisi unutilardi. -->
      ${(() => {
        const A = window.NetAdapters;
        const list = A ? A.list() : [];
        if (list.length < 2) return '';
        const cur = S.cfg.backend || 'ws';
        return `<div style="display:flex;gap:4px;margin-bottom:9px">
          ${list.map(a => `<button onclick="MultiplayerSystem.cfg.backend='${a.name}';showMultiplayerPanel()"
            style="flex:1;padding:5px 4px;border-radius:3px;cursor:pointer;font-size:9px;
            font-family:'Share Tech Mono',monospace;line-height:1.4;
            border:1px solid ${cur === a.name ? '#4de2c8' : 'var(--border)'};
            background:${cur === a.name ? 'rgba(0,255,190,.12)' : 'transparent'};
            color:${cur === a.name ? '#4de2c8' : 'var(--muted)'}">${a.label}</button>`).join('')}
        </div>`;
      })()}

      <!--  Placeholderlar MISOL ko'rsatadi, ta'rif emas.
            "avtomatik" degan matn nima yozish mumkinligini
            aytmasdi va dizayner maydonni bo'sh qoldirib,
            keyin nomini qayerdan o'zgartirishni qidirardi. -->
      ${row('🏠 Xona', inp(S.cfg.room, 'apex  •  xona-1  •  do\'stlar',
        "MultiplayerSystem.cfg.room=this.value"))}
      ${row('👤 Nom', inp(S.cfg.name, 'bo\'sh = Player 123  •  yoki nikingiz',
        "MultiplayerSystem.cfg.name=this.value"))}

      <!--  Maydonlar TANLANGAN adapterdan olinadi: WebSocket uchun
            manzil, Firebase uchun database URL va kalit. Hammasini
            birdan ko'rsatsak dizayner qaysi biri kerakligini
            bilmasdi. -->
      ${(() => {
        const A = window.NetAdapters;
        const d = A ? A.get(S.cfg.backend || 'ws') : null;
        if (!d || !d.fields || !d.fields.length) return '';
        return d.fields.map(f => {
          //  ⚠ BIR TIRNOQ, `JSON.stringify` EMAS. Atribut QO'SHTIRNOQ
          //    bilan yopiladi (`oninput="…"`), `JSON.stringify` esa
          //    qo'shtirnoq beradi — va atribut AYNAN o'sha yerda
          //    UZILARDI:
          //        oninput="MultiplayerSystem.cfg["  ← shu yerda tugadi
          //    Natijada yozganda HECH NIMA saqlanmasdi: maydon to'la
          //    ko'rinardi, `cfg.fbConfig` esa BO'SH qolardi va ulanish
          //    \"databaseURL kiritilmagan\" derdi.
          //  ⚠ Kalit nomlari oddiy identifikator (`fbConfig`, `url`)
          //    — ularda tirnoq bo'lmaydi, shuning uchun bu xavfsiz.
          const key = String(f.key).replace(/[^\w]/g, '');
          const set = `MultiplayerSystem.cfg['${key}']=this.value`;
          //  Katta maydon - yopishtirilgan konfiguratsiya uchun.
          //  Bir qatorli input ga blok sig'masdi va dizayner uni
          //  ko'rmay turib tahrirlashga majbur bo'lardi.
          if (f.type === 'area') {
            //  Ko'rsatkich JONLI yangilanadi.
            //  XATO BOR EDI: u panel CHIZILGANDA hisoblanardi, ya'ni
            //  matn yopishtirilgandan keyin ham eski holatni
            //  ("databaseURL topilmadi") ko'rsatib turardi.
            //  Dizayner to'g'ri konfiguratsiya tashlab, xato xabarni
            //  ko'rardi va nima qilishni bilmasdi.
            const hid = 'mp-hint-' + f.key;
            return `<div style="margin-bottom:7px">
              <div style="font-size:9px;color:var(--muted);margin-bottom:3px;
                font-family:'Share Tech Mono',monospace">${f.label}</div>
              <!--  Placeholder ATRIBUTGA yoziladi va unda qo'shtirnoq
                    bo'lsa atribut YARMIDA uzilib qolardi - Firebase
                    misolida esa ular ko'p. Yangi qator ham atributda
                    ishlamaydi. Shuning uchun ikkalasi ekranlanadi. -->
              <textarea rows="5" placeholder="${String(f.placeholder || '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}"
                oninput="${set};window._mpHint('${key}')"
                style="width:100%;box-sizing:border-box;background:var(--bg);
                border:1px solid var(--border);color:var(--text);padding:5px 7px;
                font-size:9px;border-radius:3px;resize:vertical;
                font-family:'Share Tech Mono',monospace">${(S.cfg[f.key] || '')
                  .replace(/[<>&]/g, '')}</textarea>
              <div id="${hid}" style="font-size:8px;margin-top:3px;
                font-family:'Share Tech Mono',monospace"></div>
            </div>`;
          }
          return row(f.label, inp(S.cfg[f.key] || '', f.placeholder || '', set));
        }).join('');
      })()}

      <!--  Firebase eslatmasi.
            Matn QISQA va <code> tegisiz: ilgari uch qatorli edi va
            panelda kesilib qolardi - dizayner oxirgi jumlani,
            ya'ni eng kerakli qismini (qoidalar) ko'rmasdi.
            Qoidalar matni NUSXALANADIGAN tugmada. -->
      ${(S.cfg.backend === 'firebase') ? `
      <div style="font-size:8px;color:#ffaa44;line-height:1.6;margin:-4px 0 8px">
        \u26A0 Narx trafikka bog'liq - sinov uchun bepul kvota yetadi.
        <button onclick="window._mpCopyRules()"
          style="margin-left:4px;padding:1px 6px;border-radius:2px;cursor:pointer;
          font-size:8px;font-family:'Share Tech Mono',monospace;
          border:1px solid rgba(255,170,68,.45);background:transparent;color:#ffaa44">
          \u{1F4CB} RTDB qoidalari</button>
      </div>` : ''}

      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:10px;
        color:var(--muted);margin:2px 0 8px">
        <input type="checkbox" ${S.cfg.autoJoin ? 'checked' : ''}
          onchange="MultiplayerSystem.cfg.autoJoin=this.checked">
        ▶ Play bosilganda o'zi ulansin
      </label>

      <!--  O'YIN SOZLAMALARI.
            Bularsiz multiplayer "arvohlar dunyosi" bo'lib tuyulardi:
            o'yinchilar bir-biridan o'tib ketardi, hammasi bir joyda
            paydo bo'lardi va gaplasha olmasdi. -->
      <div style="font-size:8px;color:#4de2c8;letter-spacing:1.5px;margin:6px 0 5px;
        font-family:'Share Tech Mono',monospace">O'YIN</div>

      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:10px;
        color:var(--muted);margin-bottom:5px">
        <input type="checkbox" ${S.cfg.solid !== false ? 'checked' : ''}
          onchange="MultiplayerSystem.cfg.solid=this.checked">
        \u{1F9F1} O'yinchilar bir-biridan o'tmasin
      </label>

      ${row('\u{1F465} Eng ko\'p', inp(S.cfg.maxPlayers || 0, '0 = cheksiz',
        'MultiplayerSystem.cfg.maxPlayers=parseInt(this.value)||0'))}
      <!--  Bu MASLAHAT, himoya emas: haqiqiy cheklash serverda
            bo'lishi kerak va uni chetlab o'tish oson. Ochiq
            aytmasak dizayner unga ishonib qolardi. -->
      <div style="font-size:8px;color:#ffaa44;line-height:1.5;margin:-3px 0 7px">
        \u26A0 Mijozdagi cheklov — chetlab o'tish mumkin.
      </div>

      ${row('\u{1F4CD} Spawn', `<select onchange="MultiplayerSystem.cfg.spawnMode=this.value;showMultiplayerPanel()"
        style="background:var(--bg);border:1px solid var(--border);color:var(--text);
        padding:3px 6px;font-size:10px;border-radius:3px;flex:1;
        font-family:'Share Tech Mono',monospace">
        ${[['ring', '⭕ Doira bo\'ylab'], ['points', '\u{1F9CD} Spawn nuqtalari'],
           ['none', '— Tegmasin']].map(x =>
          `<option value="${x[0]}" ${(S.cfg.spawnMode || 'ring') === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}
      </select>`)}
      ${(S.cfg.spawnMode || 'ring') === 'ring'
        ? row('⇔ Radius', inp(S.cfg.spawnRadius ?? 4, '4',
            'MultiplayerSystem.cfg.spawnRadius=parseFloat(this.value)||4'))
        : ''}

      <!--  QO'LDA YOZILGAN NUQTALAR.
            Ular sahnadagi spawn bloklaridan USTUN: dizayner ataylab
            koordinata yozgan bo'lsa, bloklar uni bekor qilmasligi
            kerak. -->
      ${(S.cfg.spawnMode === 'points') ? (() => {
        const pts = Array.isArray(S.cfg.spawnPoints) ? S.cfg.spawnPoints : [];
        return `
        <div style="font-size:9px;color:var(--muted);margin:2px 0 4px;
          font-family:'Share Tech Mono',monospace">\u{1F4CD} Koordinatalar (${pts.length})</div>
        ${pts.map((p, i) => `
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
            <span style="font-size:9px;color:#4de2c8;min-width:16px;
              font-family:'Share Tech Mono',monospace">${i + 1}</span>
            ${['x', 'y', 'z'].map(k => `<input type="number" step="0.5"
              value="${(p && p[k]) ?? 0}" placeholder="${k}"
              oninput="window._mpSpawnSet(${i},'${k}',parseFloat(this.value)||0)"
              style="width:56px;background:var(--bg);border:1px solid var(--border);
              color:var(--text);padding:2px 5px;font-size:10px;border-radius:3px;
              font-family:'Share Tech Mono',monospace">`).join('')}
            <button onclick="window._mpSpawnDel(${i})"
              style="padding:1px 7px;border-radius:2px;cursor:pointer;font-size:9px;
              border:1px solid rgba(255,68,68,.35);background:transparent;
              color:#ff6b6b">✕</button>
          </div>`).join('')}
        <div style="display:flex;gap:4px;margin-bottom:6px">
          <button onclick="window._mpSpawnAdd()" style="flex:1;padding:4px;border-radius:3px;
            cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
            border:1px dashed #4de2c8;background:transparent;color:#4de2c8">
            ➕ Nuqta qo'shish</button>
          <!--  Hozirgi joyni olish - qo'lda yozishdan tez va aniq. -->
          <button onclick="window._mpSpawnHere()" style="flex:1;padding:4px;border-radius:3px;
            cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
            border:1px solid var(--border);background:transparent;color:var(--muted)">
            \u{1F3AF} Shu yerdan</button>
        </div>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-bottom:7px">
          O'yinchilar NAVBAT bilan taqsimlanadi. Nuqta kam bo'lsa aylanib
          qaytadi. Bo'sh qoldirilsa sahnadagi \u{1F9CD} spawn bloklari
          ishlatiladi.
        </div>`;
      })() : ''}

      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:10px;
        color:var(--muted);margin:4px 0 5px">
        <input type="checkbox" ${S.cfg.chat !== false ? 'checked' : ''}
          onchange="MultiplayerSystem.cfg.chat=this.checked;showMultiplayerPanel()">
        \u{1F4AC} Chat
      </label>
      ${(S.cfg.chat !== false) ? `
        ${row('⌨ Klavish', inp(S.cfg.chatKey || 'KeyT', 'KeyT',
          'MultiplayerSystem.cfg.chatKey=this.value.trim()'))}
        ${row('⏱ So\'nish (s)', inp(S.cfg.chatFade ?? 12, '0 = so\'nmasin',
          'MultiplayerSystem.cfg.chatFade=parseFloat(this.value)||0'))}
        ${row('\u{1F4A4} AFK (daq)', inp(S.cfg.afkMinutes ?? 5, '0 = avtomatik yo\'q',
          'MultiplayerSystem.cfg.afkMinutes=parseFloat(this.value)||0'))}
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-3px 0 6px">
          Harakatsiz o'yinchi AFK bo'ladi — uni hech kim render qilmaydi
          va u ham boshqalarni. Personaji joyida qoladi.
          Chatda <b>/help</b> — buyruqlar ro'yxati.
        </div>
        <!--  IKKI ALOHIDA CHEKLOV - ular boshqa-boshqa masalani hal
              qiladi va bitta songa birlashtirib bo'lmaydi:
              ekranda ko'p bo'lsa o'yin ko'rinmaydi, tarixda kam
              bo'lsa o'qib bo'lmaydi. -->
        ${row('\u{1F441} Ekranda', inp(S.cfg.chatVisible ?? 5, '5',
          'MultiplayerSystem.cfg.chatVisible=parseInt(this.value)||5'))}
        ${row('\u{1F4DC} Tarixda', inp(S.cfg.chatHistory ?? 20, '20',
          'MultiplayerSystem.cfg.chatHistory=parseInt(this.value)||20'))}
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-3px 0 6px">
          \u{1F441} o'yin vaqtida ko'rinadigan qatorlar ·
          \u{1F4DC} <b>T</b> bosilganda va xotirada.
          Eskilari serverdan ham o'chadi.
        </div>
        ${row('\u{1F524} Shrift (px)', inp(S.cfg.chatFontSize ?? 11, '11',
          'MultiplayerSystem.cfg.chatFontSize=parseInt(this.value)||11'))}
        <div style="font-size:9px;color:var(--muted);margin-bottom:3px;
          font-family:'Share Tech Mono',monospace">\u{1F3A8} CSS</div>
        <textarea rows="2" placeholder=".mp-chat-name{color:#ff0}  .mp-chat-row{font-weight:700}"
          oninput="MultiplayerSystem.cfg.chatCss=this.value"
          style="width:100%;box-sizing:border-box;background:var(--bg);
          border:1px solid var(--border);color:var(--text);padding:4px 6px;
          font-size:9px;border-radius:3px;resize:vertical;margin-bottom:6px;
          font-family:'Share Tech Mono',monospace">${(S.cfg.chatCss || '').replace(/[<>&]/g, '')}</textarea>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-3px 0 7px">
          O'yinchi ⏸ pauza menyusidan chatni o'chira oladi —
          shunda faqat ko'rinish yopiladi, qolgani ishlayveradi.
        </div>
      ` : ''}

      <button onclick="${on ? 'MultiplayerSystem.disconnect()' : 'MultiplayerSystem.connect()'}"
        style="width:100%;padding:9px;border-radius:4px;cursor:pointer;font-size:11px;
        font-family:inherit;font-weight:700;
        border:1px solid ${on ? 'rgba(255,80,80,.4)' : 'rgba(0,255,190,.4)'};
        background:${on ? 'rgba(255,80,80,.08)' : 'rgba(0,255,190,.08)'};
        color:${on ? '#ff9d9d' : '#4de2c8'}">
        ${on ? '✕ Uzish' : '🔗 Ulanish'}</button>

      ${list.length ? `
<div style="margin-top:12px">
        <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:5px">
          O'YINCHILAR (${list.length})</div>
        ${list.map(p => `<div style="font-size:11px;color:${p.id === S.myId() ? '#4de2c8' : 'var(--text)'};
          padding:3px 0">${p.id === S.myId() ? '▸ ' : '  '}${esc(p.name)}</div>`).join('')}
      </div>` : ''}

      <!--  CHEGARA OCHIQ AYTILADI: dizayner nimaga tayanayotganini
            bilishi kerak. Yarim ishlaydigan narsani "tayyor" deb
            ko'rsatish eng yomon yo'l. -->
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);
        font-size:9px;color:var(--muted);line-height:1.7">
        Hozircha sinxronlanadi: <b>joylashuv, burilish, mashinada
        ekanlik</b>. Fizika, 🔢 sonlar, 🚪 eshiklar va inventar —
        hali yo'q.<br>
        Server <b>rele</b>: aldovga qarshi himoya bermaydi —
        hamkorlikdagi o'yin uchun, raqobat uchun emas.<br>
        <b>game.zip</b> da ham ishlaydi: <code>node server.js</code>.
      </div>`;

    //  ⚠ Ko'rsatkichlar chizilgandan KEYIN to'ldiriladi: saqlangan
    //    konfiguratsiya bo'lsa dizayner uni darhol ko'rsin. Ilgari
    //    panel ochilganda maydon to'la, ko'rsatkich esa BO'SH edi —
    //    \"tanilmadimi?\" degan savol tug'ilardi.
    try {
      const A = window.NetAdapters;
      const d = A ? A.get(S.cfg.backend || 'ws') : null;
      if (d) for (const f of (d.fields || [])) {
        if (f.type === 'area' && window._mpHint) window._mpHint(f.key);
      }
    } catch (e) {}
  };
})();
