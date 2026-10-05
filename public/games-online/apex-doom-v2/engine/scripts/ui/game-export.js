// ============================================================
// APEX3D — Save Menu + Game Export  v3
// Saqlash tugmasi → menu:
//   1. 📁 ZIP saqlash  (oddiy apex sahna)
//   2. 🎮 Game.html    (o'yin sifatida)
//
// Game Export ZIP:
//   textures/         ← tekstura fayllar
//   models/           ← GLB modellar
//   apex-file.json    ← sahna ma'lumotlari
//   game.html         ← tashqi fayllardan yuklaydi (embed yo'q)
//
// ⚡ Faqat 🎥 Kamera kerak — player ixtiyoriy (Ko'rinish rejimi)
// ============================================================

// ══════════════════════════════════════════════════════════════
//  ⚠⚠ MUHIM: ASL SAQLOVCHINI USHLAB QOLAMIZ ⚠⚠
// --------------------------------------------------------------
//  `save-load.js` (845) `window.saveScene` ga TO'LIQ saqlovchini
//  yozadi: `ud` (butun userData), mapLoader, hitboxActions,
//  soundBlock, perFace, timeline, models — hammasi.
//
//  Bu fayl (846) esa uning ustiga menyu ochuvchini yozib, asl
//  funksiyani BUTUNLAY yo'qotardi. Undan keyin pastda
//  `_originalSaveScene` nomi bilan saqlovchi QAYTA yozilgan edi —
//  lekin u ancha kambag'al: faqat position/rotation/scale/color.
//
//  Natijasi: "💾 ZIP Saqlash" bosilganda hitbox, PC block,
//  Map Loader, timeline, ovozlar — HAMMASI yo'qolardi, chunki
//  yuklovchi (`doLoad`) `od.ud` / `od.mapLoader` / `od.hitboxActions`
//  ni kutadi, kambag'al saqlovchi esa ularni yozmasdi.
//
//  Endi: asl funksiya `_realSaveScene` da saqlanadi va menyu aynan
//  uni chaqiradi. Serializatsiya BITTA joyda.
// ══════════════════════════════════════════════════════════════
if (typeof window.saveScene === 'function' && !window._realSaveScene) {
  window._realSaveScene = window.saveScene;
}

// ============================================================
//  💾 SAQLASH MENYUSI
//
//  ⚠ OLIB TASHLANDI: 🎮 "Game.html (eski, cheklangan)" varianti.
//    U bu faylning O'Z mini-runtime'ini (`_buildGameHTML`) yozardi —
//    noldan qayta yozilgan kichik dvigatel. Uning izohi ham buni tan
//    olardi: "yorug'lik / hitbox / PC / karta ISHLAMAYDI".
//
//    Ya'ni ikkita dvigatel bor edi va ikkinchisi birinchisidan doim
//    orqada qolardi: 💡 chiroq, ✨ zarracha, 🌫 tuman, 🗺 Map Loader,
//    💻 PC blok, 🔊 ovoz kutubxonasi, 🔒 o'yin qulfi — hech biri
//    unga yetib bormasdi. Har yangi xususiyat farqni kattalashtirardi.
//
//    Endi bitta yo'l: 🚀 `game.zip` — HAQIQIY dvigatel ichida ishlaydi,
//    ya'ni redaktorda ishlagan narsa o'yinda ham ishlaydi.
//
//  ⚠ `exportGameHTML` / `openGameExportMenu` funksiyalari O'CHIRILMADI —
//    ular hali ham konsoldan chaqirilishi mumkin. Faqat menyudan
//    olindi, chunki foydalanuvchi uchun bu TUZOQ edi: "o'yin" deb
//    saqlaydi, keyin yarmi ishlamasligini bilib qoladi.
// ============================================================
window.saveScene = function() {
  const old = document.getElementById('save-choice-menu');
  if (old) { old.remove(); return; }

  const menu = document.createElement('div');
  menu.id = 'save-choice-menu';
  menu.style.cssText = `
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    background:var(--panel); border:1px solid var(--border);
    border-radius:10px; padding:18px 20px; z-index:10000;
    box-shadow:0 12px 40px rgba(0,0,0,.9); min-width:300px;
    font-family:'Rajdhani',sans-serif;
  `;

  menu.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <span style="font-family:'Share Tech Mono','Courier New',monospace;font-size:12px;color:var(--accent);letter-spacing:2px">
        APEX<span style="color:var(--accent2)">3D</span> &nbsp;— SAQLASH
      </span>
      <button onclick="document.getElementById('save-choice-menu').remove()"
        style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;line-height:1;padding:0 4px">✕</button>
    </div>

    <!-- ⚠ "ZIP Saqlash" OLIB TASHLANDI (58.50).
         O'rnida 💾 loyiha PAPKASI turibdi: u ham hamma narsani
         oladi, lekin ochib ko'rish, faylni almashtirish, git ga
         qo'yish mumkin. ZIP esa har safar Downloads ga tushib,
         qaysi nusxa yangi ekani chalkashib ketardi.
         Kerak bo'lsa: Ctrl+Shift+S hamon ZIP beradi. -->
    <button id="scm-proj" style="
      width:100%;display:flex;align-items:center;gap:12px;
      background:rgba(var(--accent-rgb),.06);border:1px solid rgba(var(--accent-rgb),.2);
      border-radius:7px;padding:13px 14px;cursor:pointer;margin-bottom:8px;
      text-align:left;transition:background .15s;
    ">
      <span style="font-size:22px">💾</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--accent);font-family:'Rajdhani',sans-serif">Loyihaga saqlash</div>
        <div style="font-size:10px;color:var(--muted);font-family:'Share Tech Mono','Courier New',monospace;margin-top:2px">projects/&lt;nom&gt;/ — papka: sahna + texture/ models/ sound/</div>
        <div style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-top:3px">Ustida ishlash uchun — ⏱ avtosaqlash bilan</div>
      </div>
    </button>

    <button id="scm-gzip" style="
      width:100%;display:flex;align-items:center;gap:11px;margin-top:8px;
      background:rgba(var(--accent3-rgb),.07);border:1px solid rgba(var(--accent3-rgb),.35);
      border-radius:7px;padding:13px 14px;cursor:pointer;
      text-align:left;transition:background .15s;
    ">
      <span style="font-size:22px">🚀</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--accent3);font-family:'Rajdhani',sans-serif">game.zip — TO'LIQ o'yin</div>
        <div style="font-size:10px;color:var(--muted);font-family:'Share Tech Mono','Courier New',monospace;margin-top:2px">engine/ map/ music/ html/ jsons/ timeline/ + index.html + server.js</div>
        <div style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;margin-top:3px">Hamma funksiya ishlaydi — haqiqiy dvigatel ichida</div>
      </div>
    </button>

    <!-- ⚙️ game.zip sozlamalari — tugma bosilganda ochiladi -->
    <div id="scm-gopts" style="display:none;margin-top:9px;padding:11px 12px;
      background:rgba(var(--accent3-rgb),.04);border:1px solid rgba(var(--accent3-rgb),.22);border-radius:7px">

      <div style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;letter-spacing:1px;margin-bottom:7px">
        ⚙️ O'YIN SOZLAMALARI
      </div>

      <label style="display:block;font-size:10px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:3px">O'yin nomi</label>
      <input id="scm-gname" type="text" value="game" spellcheck="false" style="
        width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);
        color:var(--text);font-family:'Share Tech Mono',monospace;font-size:11px;
        padding:5px 7px;border-radius:3px;outline:none">
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:3px">
        Fayl nomi, brauzer sarlavhasi va yuklanish ekranida ko'rinadi.
      </div>

      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:10px;
        font-size:10px;color:var(--muted);font-family:'Share Tech Mono',monospace">
        <input id="scm-gconsole" type="checkbox" style="cursor:pointer">
        🖥 Razrabotchiklar konsolini yoqish
      </label>

      <div id="scm-gkeyrow" style="display:none;align-items:center;gap:7px;margin-top:7px;padding-left:22px">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">Ochish tugmasi</span>
        <input id="scm-gkey" type="text" value="\`" maxlength="1" spellcheck="false" style="
          width:38px;text-align:center;background:var(--bg);border:1px solid rgba(var(--accent3-rgb),.35);
          color:var(--accent3);font-family:'Share Tech Mono',monospace;font-size:13px;
          padding:3px;border-radius:3px;outline:none">
        <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">standart: \`</span>
      </div>
      <div id="scm-gconsole-hint" style="display:none;font-size:8px;color:var(--muted);
        font-family:'Share Tech Mono',monospace;line-height:1.6;margin-top:6px;padding-left:22px">
        O'yin ichida uchib yuradigan konsol oynasi ochiladi — jurnal + komanda qatori.
        Yakuniy o'yinni tarqatishda buni o'chirib qo'ying.
      </div>

      <!--  ⏸ PAUZA MENYUSI — o'yin ichida ESC -->
      <!--   ⚠ Bo'lim YOPIQ ochiladi: ko'pchilikka standart menyu
             yetarli va uni ochiq qoldirish eksport oynasini
             uzaytirib yuborardi. -->
      <div style="margin-top:12px;border-top:1px solid rgba(255,255,255,.08);padding-top:10px">
        <div id="scm-phdr" style="display:flex;align-items:center;gap:7px;cursor:pointer;user-select:none">
          <span style="color:var(--accent3);font-size:11px;font-family:'Share Tech Mono',monospace">⏸ PAUZA MENYUSI (ESC)</span>
          <span style="flex:1"></span>
          <span id="scm-parrow" style="color:var(--border);font-size:10px">▾</span>
        </div>
        <div id="scm-pbody" style="display:none;margin-top:8px">
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:10px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:6px">
            <input type="checkbox" id="scm-pon" checked> Menyu yoqilsin (▶ Davom · ⚙️ Sozlamalar · ✕ Chiqish)
          </label>
          <div style="display:flex;flex-wrap:wrap;gap:9px;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:8px">
            <label style="display:flex;gap:4px;cursor:pointer"><input type="checkbox" id="scm-p-br" checked>☀️ Yorug'lik</label>
            <label style="display:flex;gap:4px;cursor:pointer"><input type="checkbox" id="scm-p-se" checked>🖱 Sezgirlik</label>
            <label style="display:flex;gap:4px;cursor:pointer"><input type="checkbox" id="scm-p-vo" checked>🔊 Ovoz</label>
            <label style="display:flex;gap:4px;cursor:pointer"><input type="checkbox" id="scm-p-gr" checked>🎨 Grafika</label>
            <label style="display:flex;gap:4px;cursor:pointer"><input type="checkbox" id="scm-p-fp" checked>🖥 FPS</label>
            <label style="display:flex;gap:4px;cursor:pointer"><input type="checkbox" id="scm-p-vs" checked>⚡ V-Sync</label>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <label style="flex:1;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
              Eng katta FPS
              <input type="number" id="scm-pfps" value="240" min="30" max="1000" style="width:100%;margin-top:3px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 5px;font-size:10px;border-radius:3px;font-family:inherit">
            </label>
            <label style="flex:2;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
              ✕ Chiqish manzili (bo'sh = oynani yopish)
              <input type="text" id="scm-pexit" placeholder="https://…" style="width:100%;margin-top:3px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 5px;font-size:10px;border-radius:3px;font-family:inherit">
            </label>
          </div>
          <!--  ⚠ Dizayner kodi menyu ICHIGA qo'shiladi, uni
                ALMASHTIRMAYDI: almashtirsak ✕ Chiqish tugmasi
                yo'qolib, o'yinchi o'yindan chiqolmay qolardi. -->
          <div style="font-size:9px;color:var(--border);font-family:'Share Tech Mono',monospace;margin-bottom:4px">
            📝 O'z kodingiz — sozlamalar sahifasiga QO'SHILADI (almashtirmaydi)
          </div>
          ${['scm-phtml,HTML', 'scm-pcss,CSS', 'scm-pjs,JS  — root, opt, cfg uzatiladi'].map(x => {
            const [id, lbl] = x.split(',');
            return `<div style="margin-bottom:5px">
              <div style="font-size:8px;color:var(--accent3);font-family:'Share Tech Mono',monospace;margin-bottom:2px">${lbl}</div>
              <textarea id="${id}" rows="2" style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:4px 6px;font-size:9px;border-radius:3px;resize:vertical;font-family:'Share Tech Mono',monospace"></textarea>
            </div>`;
          }).join('')}
        </div>
      </div>

      <button id="scm-gstart" style="
        width:100%;margin-top:12px;background:rgba(var(--accent3-rgb),.12);border:1px solid var(--accent3);
        color:var(--accent3);font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;
        padding:9px;border-radius:6px;cursor:pointer;letter-spacing:1px">
        🚀 EKSPORT QILISH
      </button>
    </div>
  `;

  document.body.appendChild(menu);

  document.getElementById('scm-proj').onmouseenter  = function(){ this.style.background='rgba(var(--accent-rgb),.12)'; };
  document.getElementById('scm-proj').onmouseleave  = function(){ this.style.background='rgba(var(--accent-rgb),.06)'; };
  const _gz = document.getElementById('scm-gzip');
  _gz.onmouseenter = function(){ this.style.background='rgba(var(--accent3-rgb),.14)'; };
  _gz.onmouseleave = function(){ this.style.background='rgba(var(--accent3-rgb),.07)'; };
  // 🚀 game.zip — darrov eksport EMAS, avval sozlamalar ochiladi
  const _opts    = document.getElementById('scm-gopts');
  const _cbCons  = document.getElementById('scm-gconsole');
  const _keyRow  = document.getElementById('scm-gkeyrow');
  const _hint    = document.getElementById('scm-gconsole-hint');
  const _nameInp = document.getElementById('scm-gname');

  _gz.onclick = function(){
    const showing = _opts.style.display !== 'none';
    _opts.style.display = showing ? 'none' : 'block';
    if (!showing) setTimeout(() => { try { _nameInp.focus(); _nameInp.select(); } catch(e){} }, 0);
  };

  //  ⏸ Pauza bo'limini ochish/yopish
  const _phdr = document.getElementById('scm-phdr');
  if (_phdr) _phdr.onclick = function () {
    const b = document.getElementById('scm-pbody');
    const a = document.getElementById('scm-parrow');
    const showing = b.style.display !== 'none';
    b.style.display = showing ? 'none' : 'block';
    if (a) a.textContent = showing ? '\u25be' : '\u25b4';
  };

  _cbCons.onchange = function(){
    _keyRow.style.display = this.checked ? 'flex'  : 'none';
    _hint.style.display   = this.checked ? 'block' : 'none';
  };

  // Enter — darrov eksport
  _nameInp.onkeydown = e => { if (e.key === 'Enter') document.getElementById('scm-gstart').click(); };

  document.getElementById('scm-gstart').onclick = function(){
    // ⚠ Fayl nomi tozalanadi: `/ \ : * ? " < > |` — ZIP va OS uchun xavfli
    const raw   = (_nameInp.value || '').trim() || 'game';
    const safe  = raw.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 60) || 'game';
    const cons  = !!_cbCons.checked;
    const key   = (document.getElementById('scm-gkey').value || '`').slice(0, 1) || '`';
    menu.remove();
    //  ⏸ Pauza menyusi sozlamalari
    const _v = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };
    const _c = (id) => { const e = document.getElementById(id); return e ? !!e.checked : true; };
    const pause = {
      enabled: _c('scm-pon'),
      show: { brightness: _c('scm-p-br'), sensitivity: _c('scm-p-se'), volume: _c('scm-p-vo'),
              graphics: _c('scm-p-gr'), fps: _c('scm-p-fp'), vsync: _c('scm-p-vs') },
      //  ⚠ Son sifatida: matn qolsa o'yinda taqqoslash `NaN` berib,
      //    FPS chegarasi umuman ishlamasdi.
      fpsMax: Math.max(30, Math.min(1000, parseInt(_v('scm-pfps'), 10) || 240)),
      exitUrl: (_v('scm-pexit') || '').trim(),
      html: _v('scm-phtml'), css: _v('scm-pcss'), js: _v('scm-pjs'),
    };
    if (typeof exportGameZip === 'function')
      exportGameZip(safe, { title: raw, devConsole: cons, consoleKey: key, pause });
    else log('❌ game-zip.js yuklanmagan', 'le');
  };

  setTimeout(() => {
    function outsideClick(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', outsideClick); }
    }
    document.addEventListener('click', outsideClick);
  }, 100);

  document.getElementById('scm-proj').onclick = () => {
    menu.remove();
    // ⚠ Loyiha OCHIQ bo'lsa darhol o'sha papkaga yozamiz — nomni
    //   qayta so'rash ortiqcha. Ochilmagan bo'lsa panel ochiladi.
    const PS = window.ProjectSystem;
    if (PS && PS.cfg.name) PS.save(PS.cfg.name, false);
    else if (window.showProjectPanel) window.showProjectPanel();
  };
};

// ── Asl ZIP saqlash ──────────────────────────────────────────
//  ⚠ Bu yerда ~50 satrlik IKKINCHI saqlovchi (`_originalSaveScene`)
//    turardi. U `save-load.js` dagisining kambag'al nusxasi edi va
//    `ud` / `mapLoader` / `hitboxActions` / `soundBlock` / `timeline`
//    ni umuman yozmasdi — ya'ni saqlangan sahna jimgina buzilardi.
//    O'chirildi. Endi yagona, to'liq saqlovchi ishlatiladi.
window._originalSaveScene = function (returnZip) {
  if (typeof window._realSaveScene !== 'function') {
    log('❌ save-load.js yuklanmagan', 'le');
    return Promise.resolve(null);
  }
  return window._realSaveScene(returnZip);
};

function _getExportCamera() {
  return objects.find(o => o.userData && o.userData.isCamera);
}

function _getExportPlayer() {
  const p = objects.find(o => o.userData.isPlayerObj || o.userData.isPlayer || o.userData.entityType==='player');
  if (p) return { type:'player', obj:p };
  const c = objects.find(o => o.userData.entityType==='car' || o.userData._entityMode==='vehicle' || o.userData.isCar);
  if (c) return { type:'car', obj:c };
  return null; // null = Ko'rinish rejimi
}

// ─────────────────────────────────────────────────────────────
// GAME EXPORT PANEL — faqat kamera shart, player ixtiyoriy
// ─────────────────────────────────────────────────────────────

function openGameExportMenu() {
  const old = document.getElementById('game-export-panel');
  if (old) { old.remove(); return; }

  const cam = _getExportCamera();
  if (!cam) {
    _showExportError('❌ Kamera topilmadi!\n\nSahnaga 🎥 Kamera qo\'shing.');
    return;
  }

  const player   = _getExportPlayer(); // null bo'lsa — Ko'rinish rejimi
  const fov      = cam.userData.fov || 60;
  const glbCount = objects.filter(o=>o.userData.isGLB||o.userData.isGLTF).length;

  // Rejim belgisi
  const modeHTML = player
    ? `${player.type==='car'?'🚗':'👤'} <span style="color:var(--accent2)">${player.obj.userData.name}</span>`
    : `👁 <span style="color:rgba(var(--accent-rgb),.45)">Ko'rinish rejimi</span>`;

  const panel = document.createElement('div');
  panel.id = 'game-export-panel';
  panel.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:var(--panel);border:1px solid var(--accent2);
    border-radius:10px;padding:20px 22px;z-index:10000;
    box-shadow:0 12px 40px rgba(0,0,0,.9);min-width:380px;max-width:95vw;
    font-family:'Rajdhani',sans-serif;
  `;
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <span style="font-family:'Share Tech Mono','Courier New',monospace;font-size:12px;color:var(--accent2);letter-spacing:2px">
        🎮 GAME.HTML SOZLAMALARI
      </span>
      <button id="gep-close" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;line-height:1">✕</button>
    </div>

    <div style="background:rgba(var(--accent-rgb),.05);border:1px solid rgba(var(--accent-rgb),.12);border-radius:5px;padding:8px 10px;margin-bottom:6px;font-size:10px;color:var(--muted);font-family:'Share Tech Mono','Courier New',monospace;line-height:1.8">
      🎥 <span style="color:var(--accent)">${cam.userData.name}</span> &nbsp;|&nbsp;
      ${modeHTML} &nbsp;|&nbsp;
      📦 <span style="color:var(--accent4)">${glbCount} GLB</span>
    </div>

    <div style="background:rgba(255,107,53,.04);border:1px solid rgba(255,107,53,.12);border-radius:5px;padding:5px 10px;margin-bottom:14px;font-size:9px;color:rgba(255,107,53,.5);font-family:'Share Tech Mono',monospace;line-height:1.6">
      📂 textures/ &nbsp;•&nbsp; models/ &nbsp;•&nbsp; apex-file.json &nbsp;•&nbsp; game.html
    </div>

    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent2);letter-spacing:1px;margin-bottom:8px">🎥 KAMERA</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:11px;color:var(--muted);width:100px;flex-shrink:0">Ko'rish burchagi</span>
      <input type="range" id="gep-fov" min="20" max="130" value="${fov}" style="flex:1;accent-color:var(--accent2)">
      <span id="gep-fov-lbl" style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);min-width:36px">${fov}°</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span style="font-size:11px;color:var(--muted);width:100px;flex-shrink:0">Sezgirlik</span>
      <input type="range" id="gep-sens" min="0.1" max="3" step="0.1" value="1" style="flex:1;accent-color:var(--accent2)">
      <span id="gep-sens-lbl" style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);min-width:36px">1.0x</span>
    </div>

    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent2);letter-spacing:1px;margin-bottom:8px">🔺 APEX LOGO</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:11px;color:var(--muted);width:100px;flex-shrink:0">Ko'rsatish</span>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="gep-logo" checked style="accent-color:var(--accent2)">
        <span style="font-size:11px;color:var(--text)">Ha, tepa o'ng burchakda</span>
      </label>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:11px;color:var(--muted);width:100px;flex-shrink:0">O'lchami</span>
      <input type="range" id="gep-logo-size" min="20" max="100" value="50" style="flex:1;accent-color:var(--accent2)">
      <span id="gep-logo-size-lbl" style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);min-width:36px">50%</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="font-size:11px;color:var(--muted);width:100px;flex-shrink:0">Shaffoflik</span>
      <input type="range" id="gep-logo-opacity" min="10" max="100" value="70" style="flex:1;accent-color:var(--accent2)">
      <span id="gep-logo-opacity-lbl" style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);min-width:36px">70%</span>
    </div>

    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="font-size:11px;color:var(--muted);width:100px;flex-shrink:0">Fayl nomi</span>
      <input type="text" id="gep-filename" value="game" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:11px;padding:5px 8px;border-radius:3px;outline:none">
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--muted)">.zip</span>
    </div>

    <div style="display:flex;gap:8px">
      <button id="gep-export-btn" style="flex:1;background:rgba(255,107,53,.12);border:1px solid rgba(255,107,53,.5);color:var(--accent2);font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;padding:11px;border-radius:5px;cursor:pointer">▶ SAQLASH</button>
      <button id="gep-cancel-btn" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;padding:11px 16px;border-radius:5px;cursor:pointer">Bekor</button>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById('gep-close').onclick       =
  document.getElementById('gep-cancel-btn').onclick   = () => panel.remove();
  document.getElementById('gep-fov').oninput          = function(){ document.getElementById('gep-fov-lbl').textContent=this.value+'°'; cam.userData.fov=+this.value; };
  document.getElementById('gep-sens').oninput         = function(){ document.getElementById('gep-sens-lbl').textContent=(+this.value).toFixed(1)+'x'; };
  document.getElementById('gep-logo-size').oninput    = function(){ document.getElementById('gep-logo-size-lbl').textContent=this.value+'%'; };
  document.getElementById('gep-logo-opacity').oninput = function(){ document.getElementById('gep-logo-opacity-lbl').textContent=this.value+'%'; };

  document.getElementById('gep-export-btn').onclick = () => {
    const cfg = {
      fov:        +document.getElementById('gep-fov').value,
      sensitivity:+document.getElementById('gep-sens').value,
      showLogo:    document.getElementById('gep-logo').checked,
      logoSize:   +document.getElementById('gep-logo-size').value,
      logoOpacity:+document.getElementById('gep-logo-opacity').value,
      filename:   (document.getElementById('gep-filename').value.trim()||'game'),
      cam, player  // player = null bo'lsa Ko'rinish rejimi
    };
    panel.remove();
    exportGameHTML(cfg);
  };
}

function _showExportError(msg) {
  const old = document.getElementById('gep-err'); if(old) old.remove();
  const m = document.createElement('div');
  m.id = 'gep-err';
  m.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--panel);border:1px solid #f44;border-radius:8px;padding:20px 22px;z-index:10001;box-shadow:0 8px 32px rgba(0,0,0,.9);min-width:300px;max-width:90vw;text-align:center';
  m.innerHTML = `<div style="font-size:30px;margin-bottom:10px">⚠️</div><div style="font-family:'Share Tech Mono','Courier New',monospace;font-size:10px;color:#f66;white-space:pre-line;line-height:1.8;margin-bottom:14px">${msg}</div><button onclick="document.getElementById('gep-err').remove()" style="background:rgba(255,68,68,.1);border:1px solid #f44;color:#f66;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;padding:7px 20px;border-radius:4px;cursor:pointer">OK</button>`;
  document.body.appendChild(m);
}

// ─────────────────────────────────────────────────────────────
// GAME EXPORT — ZIP: textures/ + models/ + apex-file.json + game.html
// ─────────────────────────────────────────────────────────────

async function exportGameHTML(cfg) {
  if (typeof JSZip === 'undefined') {
    if(typeof log==='function') log('❌ JSZip yuklanmagan','le');
    return;
  }

  const prog = document.createElement('div');
  prog.style.cssText = "position:fixed;bottom:20px;right:20px;background:var(--panel);border:1px solid var(--accent2);border-radius:6px;padding:10px 14px;z-index:10001;font-family:'Share Tech Mono','Courier New',monospace;font-size:10px;color:var(--accent);min-width:260px";
  document.body.appendChild(prog);
  const L = t => { prog.textContent = t; if(typeof log==='function') log(t,'lw'); };

  try {
    const zip = new JSZip();
    const modelFileMap = {}, addedModels = new Set(), textureFileMap = {};

    // ── 1. Modellar → models/ ─────────────────────────────
    L('📦 Modellar yig\'ilmoqda...');
    for (const m of (typeof loadedModels!=='undefined'?loadedModels:[])) {
      if (!m.buffer||addedModels.has(m.name)) continue;
      const safe = m.name.replace(/[^a-zA-Z0-9_\-]/g,'_')+'.glb';
      zip.folder('models').file(safe, m.buffer);
      modelFileMap[m.name] = 'models/'+safe;
      addedModels.add(m.name);
    }
    for (const o of objects) {
      if ((!o.userData.isGLB&&!o.userData.isGLTF)||addedModels.has(o.userData.name)) continue;
      const buf = o.userData._glbBuffer; if(!buf) continue;
      const safe = o.userData.name.replace(/[^a-zA-Z0-9_\-]/g,'_')+'.glb';
      zip.folder('models').file(safe, buf);
      modelFileMap[o.userData.name] = 'models/'+safe;
      addedModels.add(o.userData.name);
    }

    // ── 2. Texturalar → textures/ ─────────────────────────
    L('🖼 Texturalar yig\'ilmoqda...');
    for (const o of objects) {
      const b64 = o.userData.textureBase64, tname = o.userData.textureName;
      if (!b64||!tname) continue;
      const safe = 'tex_'+o.userData.id+'_'+tname.replace(/[^a-zA-Z0-9_\-\.]/g,'_');
      const ci = b64.indexOf(',');
      zip.folder('textures').file(safe, ci>=0 ? b64.substring(ci+1) : b64, {base64:true});
      textureFileMap[o.userData.id] = 'textures/'+safe;
    }

    // ── 3. apex-file.json ─────────────────────────────────
    L('📋 apex-file.json...');
    // Timeline ma'lumotlari (agar mavjud bo'lsa)
    let timelineData = null;
    if (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks && TimelineSystem.tracks.length) {
      timelineData = {
        duration: TimelineSystem.duration || 5,
        tracks: TimelineSystem.tracks.map(t => ({
          objId:     t.objId,
          objName:   t.objName,
          keyframes: (t.keyframes || []).map(k => ({
            time:    k.time,
            ease:    k.ease || 'smooth',
            pos:     k.pos   ? { x:k.pos.x,   y:k.pos.y,   z:k.pos.z   } : undefined,
            rot:     k.rot   ? { x:k.rot.x,   y:k.rot.y,   z:k.rot.z   } : undefined,
            scale:   k.scale ? { x:k.scale.x, y:k.scale.y, z:k.scale.z } : undefined,
          })),
        })),
      };
    }
    const sceneJSON = {
      version: 6,
      exportDate: new Date().toISOString(),
      camera: {
        position: { x:cfg.cam.position.x, y:cfg.cam.position.y, z:cfg.cam.position.z },
        fov: cfg.fov
      },
      playerType: cfg.player ? cfg.player.type : null,
      timeline: timelineData,
      objects: objects.map(o => {
        const ud = o.userData || {};
        // Interactive Button — barcha slot ma'lumotlarini export qilamiz
        let btnData = null;
        if (ud.isInteractiveBtn) {
          btnData = {
            btnMode:        ud.btnMode || 'trigger',
            interactDist:   ud.interactDist || 3,
            actionKey:      ud.actionKey || 'KeyE',
            mode:           ud.mode || 'loop',
            label:          ud.label || '',
            attachedToId:   ud.attachedToId || null,
            pickupTargetId: ud.pickupTargetId || null,
            throwForce:     ud.throwForce || 12,
            holdDist:       ud.holdDist || 1.5,
            slots: (ud.slots || []).map(s => ({
              sourceName:     s.sourceName || '',
              keyframes:      s.keyframes || [],
              duration:       s.duration || 0,
              targetObjectId: s.targetObjectId || null,
              speed:          s.speed || 1,
              soundUrl:       s.soundUrl || null,   // data URL — o'zi bilan bir joyda
              soundName:      s.soundName || '',
            })),
          };
        }
        return {
          id:         ud.id,
          name:       ud.name,
          type:       ud.type,
          isStatic:   ud.isStatic || false,
          isGLB:      (ud.isGLB || ud.isGLTF) || false,
          glbFile:    (ud.isGLB || ud.isGLTF) ? (modelFileMap[ud.name] || null) : null,
          isPlayerObj:ud.isPlayerObj || false,
          isCar:      !!(ud.entityType === 'car' || ud._entityMode === 'vehicle' || ud.isCar),
          isCamera:   ud.isCamera || false,
          isInteractiveBtn: !!ud.isInteractiveBtn,
          btnData,
          position:   { x:o.position.x, y:o.position.y, z:o.position.z },
          rotation:   { x:o.rotation.x, y:o.rotation.y, z:o.rotation.z },
          scale:      { x:o.scale.x,    y:o.scale.y,    z:o.scale.z    },
          color:      o.material ? '#'+o.material.color.getHexString() : null,
          emissive:   o.material && o.material.emissive ? '#'+o.material.emissive.getHexString() : null,
          emissiveIntensity: o.material?.emissiveIntensity ?? 0,
          roughness:  o.material?.roughness ?? 0.5,
          metalness:  o.material?.metalness ?? 0,
          textureFile:textureFileMap[ud.id] || null,
          script:     ud.script || null,
        };
      }),
      models: Object.entries(modelFileMap).map(([name,file]) => ({ name, file })),
    };
    zip.file('apex-file.json', JSON.stringify(sceneJSON, null, 2));

    // ── 4. game.html ──────────────────────────────────────
    L('⚙️ game.html...');
    zip.file('game.html', _buildGameHTML(cfg));

    // ── 5. ZIP yuklash ────────────────────────────────────
    L('🗜 ZIP siqilmoqda...');
    const blob = await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=cfg.filename+'.zip'; a.click();
    URL.revokeObjectURL(url);

    L('✅ '+cfg.filename+'.zip yuklandi!');
    if(typeof log==='function') log('🎮 Game eksport tayyor!','lok');
    setTimeout(()=>prog.remove(), 3000);

  } catch(e) {
    L('❌ Xato: '+e.message);
    setTimeout(()=>prog.remove(), 5000);
  }
}

// ─────────────────────────────────────────────────────────────
// GAME.HTML — apex-file.json dan fetch qilib yuklaydi
// ─────────────────────────────────────────────────────────────

function _buildGameHTML(cfg) {
  const isCar     = cfg.player?.type === 'car';
  const hasPlayer = !!cfg.player;

  const logo = cfg.showLogo
    ? `<div style="position:fixed;top:16px;right:16px;z-index:999;font-family:'Share Tech Mono','Courier New',monospace;font-size:${Math.round(cfg.logoSize*0.18)}px;font-weight:700;letter-spacing:3px;color:var(--accent);opacity:${(cfg.logoOpacity/100).toFixed(2)};text-shadow:0 0 12px rgba(var(--accent-rgb),.5);pointer-events:none;user-select:none">APEX<span style="color:#ff6b35">3D</span></div>`
    : '';

  const hintText = hasPlayer
    ? (isCar ? 'WASD — boshqarish | Sichqon — kamera | V — kamera' : 'WASD — harakat | Space — sakrash | E — bosish | Sichqon — qarash')
    : 'WASD — harakat | Sichqon — qarash | E/Q — yuqori/past';

  return `<!DOCTYPE html>
<html lang="uz"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${cfg.filename} — APEX3D</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#080b12;overflow:hidden}
#c{display:block;width:100vw;height:100vh}
#ch{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:rgba(255,255,255,.7);font-size:20px;pointer-events:none;z-index:10}
#hint{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:5px 14px;font-size:11px;color:rgba(255,255,255,.45);font-family:'Courier New',monospace;pointer-events:none;z-index:10}
#ld{position:fixed;inset:0;background:#080b12;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:var(--accent);font-family:'Courier New',monospace}
#ld h1{font-size:26px;letter-spacing:5px;margin-bottom:18px}
#bb{width:240px;height:3px;background:rgba(var(--accent-rgb),.15);border-radius:2px}
#b{height:3px;background:var(--accent);border-radius:2px;width:0%;transition:width .3s;box-shadow:0 0 8px var(--accent)}
#lt{margin-top:10px;font-size:10px;color:rgba(var(--accent-rgb),.5)}
</style></head><body>
<div id="ld">
  <h1>APEX<span style="color:#ff6b35">3D</span></h1>
  <div id="bb"><div id="b"></div></div>
  <div id="lt">Yuklanmoqda...</div>
</div>
<canvas id="c"></canvas>
<div id="ch">${hasPlayer && !isCar ? '+' : ''}</div>
${logo}
<div id="hint">${hintText}</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
// ── Sozlamalar ────────────────────────────────────────────────
const CFG = { fov:${cfg.fov}, sens:${cfg.sensitivity}, hasPlayer:${hasPlayer}, isCar:${isCar} };
const sl = (p,t) => { document.getElementById('b').style.width=p+'%'; document.getElementById('lt').textContent=t; };

// ── Renderer + Scene ─────────────────────────────────────────
const cv  = document.getElementById('c');
const rnd = new THREE.WebGLRenderer({canvas:cv, antialias:true, powerPreference:'high-performance'});
rnd.setPixelRatio(Math.min(devicePixelRatio,2));
rnd.setSize(innerWidth, innerHeight);
rnd.shadowMap.enabled = true;
rnd.shadowMap.type    = THREE.PCFShadowMap;
rnd.setClearColor(0x080b12);
rnd.toneMapping         = THREE.ACESFilmicToneMapping;
rnd.toneMappingExposure = 1.2;
if ('outputColorSpace' in rnd) rnd.outputColorSpace = THREE.SRGBColorSpace;
else rnd.outputEncoding = THREE.sRGBEncoding;
window.addEventListener('resize', () => { cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); rnd.setSize(innerWidth,innerHeight); });

const sc  = new THREE.Scene();
sc.fog    = new THREE.FogExp2(0x080b12, 0.016);
const cam = new THREE.PerspectiveCamera(CFG.fov, innerWidth/innerHeight, 0.1, 1000);
sc.add(new THREE.AmbientLight(0xffffff, 0.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(8,16,8); sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
sun.shadow.camera.right= sun.shadow.camera.top    =  30;
sc.add(sun);
sc.add(new THREE.GridHelper(40,40,0x1e2530,0x141820));

// ── Boshqaruv ─────────────────────────────────────────────────
const keys = {};
const _prevKeys = {};
document.addEventListener('keydown', e => keys[e.code]=true);
document.addEventListener('keyup',   e => keys[e.code]=false);
let yaw=0, pitch=0, lk=false;
document.addEventListener('pointerlockchange', () => lk = document.pointerLockElement === cv);
cv.addEventListener('click', () => cv.requestPointerLock());
document.addEventListener('mousemove', e => {
  if (!lk) return;
  const s = CFG.sens * 0.002;
  if (CFG.isCar) {
    // Mashina: kamera offset (mashina yo'nalishiga nisbatan)
    _carCamYawOff  -= e.movementX * s;
    _carCamPitchOff = Math.max(-1.0, Math.min(1.0, _carCamPitchOff - e.movementY * s));
  } else {
    yaw   -= e.movementX * s;
    pitch = Math.max(-1.5, Math.min(1.5, pitch - e.movementY * s));
  }
});

function pGeo(t) {
  switch(t) {
    case 'Kub':     return new THREE.BoxGeometry(1,1,1);
    case 'Sfera':   return new THREE.SphereGeometry(0.5,32,16);
    case 'Silindr': return new THREE.CylinderGeometry(0.5,0.5,1,32);
    case 'Konus':   return new THREE.ConeGeometry(0.5,1,32);
    case 'Torus':   return new THREE.TorusGeometry(0.5,0.2,16,64);
    case 'Tekislik':return new THREE.PlaneGeometry(20,20);
    default:        return new THREE.BoxGeometry(1,1,1);
  }
}

// ────────────────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────────────────
let pm = null;                    // player mesh (yoki mashina)
const vel = new THREE.Vector3();
const allMeshes = [];             // ALL sahna meshlari (id → mesh) collision uchun
const meshById  = new Map();      // ID → mesh mapping
const btnList   = [];             // Interactive Button ro'yxati
let sceneData   = null;           // apex-file.json
let timelineData = null;

// Car camera (redaktordagi mantiq)
let _carCamYawOff  = 0;
let _carCamPitchOff = -0.25;

// Moving platform (oyinchi turgan obyekt)
let _groundObj     = null;
let _groundLastMat = null;
let _groundVel     = null;

// Interactive Button pickup/throw
let _carried = null;
const _thrownItems = [];

// Interactive Button ijro etilayotgan animatsiyalar
const _activeAnims = new Map();   // btnId → {kfs, target, start, dur, speed, onDone}
const _activeAudios = new Set();

// Timeline auto-play
let _tlTime = 0;
let _tlDuration = 5;

// ────────────────────────────────────────────────────────────
// LOADING
// ────────────────────────────────────────────────────────────
async function loadScene(sd) {
  sceneData = sd;
  timelineData = sd.timeline || null;
  if (timelineData) _tlDuration = timelineData.duration || 5;

  const ldr = new THREE.GLTFLoader();
  const txl = new THREE.TextureLoader();
  const cp = sd.camera.position;
  cam.position.set(cp.x, cp.y, cp.z);

  const obs = sd.objects.filter(o => !o.isCamera);
  for (let i=0; i<obs.length; i++) {
    const o = obs[i];
    sl(10 + Math.round(i/obs.length * 80), o.name+'...');
    let mesh = null;

    if (o.isGLB && o.glbFile) {
      try {
        const g = await new Promise((rs,rj) => ldr.load(o.glbFile, rs, undefined, rj));
        const w = new THREE.Group();
        w.add(g.scene);
        if (g.animations && g.animations.length) {
          const mx = new THREE.AnimationMixer(g.scene);
          g.animations.forEach((c,i) => { const a=mx.clipAction(c); a.loop=THREE.LoopRepeat; if(i===0) a.play(); });
          w.userData._mx = mx;
        }
        w.traverse(ch => { if(ch.isMesh||ch.isSkinnedMesh){ ch.castShadow=true; ch.receiveShadow=true; } });
        mesh = w;
      } catch(e) { console.warn('GLB yuklanmadi:', o.name, e); }
    }

    if (!mesh) {
      const geo = pGeo(o.type);
      const matProps = { color:o.color||'#888', roughness:o.roughness??0.5, metalness:o.metalness??0 };
      if (o.emissive && o.emissiveIntensity > 0) {
        matProps.emissive = o.emissive;
        matProps.emissiveIntensity = o.emissiveIntensity;
      }
      const mat = new THREE.MeshStandardMaterial(matProps);
      if (o.textureFile) { mat.map = txl.load(o.textureFile); mat.needsUpdate = true; }
      mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow    = !o.isStatic;
      mesh.receiveShadow = true;
      if (o.type === 'Tekislik') mesh.rotation.x = -Math.PI/2;
    }

    mesh.position.set(o.position.x, o.position.y, o.position.z);
    mesh.rotation.set(o.rotation.x, o.rotation.y, o.rotation.z);
    mesh.scale.set(o.scale.x, o.scale.y, o.scale.z);
    mesh.userData._id = o.id;
    mesh.userData._src = o;    // asl ma'lumot
    sc.add(mesh);
    allMeshes.push(mesh);
    meshById.set(o.id, mesh);

    if (o.isPlayerObj || o.isCar) pm = mesh;
    if (o.isInteractiveBtn && o.btnData) {
      mesh.userData._btn = {
        ...o.btnData,
        _currentIdx: 0,
        _direction:  1,
        _playing:    false,
      };
      btnList.push(mesh);
    }
  }

  // Interactive Button 'attached' rejimida ota-obyektga yopishtirish
  for (const btn of btnList) {
    const d = btn.userData._btn;
    if (d.btnMode === 'attached' && d.attachedToId != null) {
      const parent = meshById.get(d.attachedToId);
      if (parent) { try { parent.attach(btn); } catch(e) {} }
    }
  }
}

// ────────────────────────────────────────────────────────────
// TIMELINE PLAYBACK — barcha tracklarni davomiy loop qilib ijro etadi
// ────────────────────────────────────────────────────────────
const _easings = {
  linear: t => t,
  smooth: t => t<.5 ? 2*t*t : -1+(4-2*t)*t,
  ease:   t => t*t*(3-2*t),
};
function _lerpV3(a, b, t) {
  return { x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t, z: a.z+(b.z-a.z)*t };
}
function _applyKf(target, kf) {
  if (kf.pos)   target.position.set(kf.pos.x,   kf.pos.y,   kf.pos.z);
  if (kf.rot)   target.rotation.set(kf.rot.x,   kf.rot.y,   kf.rot.z);
  if (kf.scale) target.scale.set(kf.scale.x, kf.scale.y, kf.scale.z);
}
function _interpolateTrackAt(track, target, t) {
  const kfs = track.keyframes;
  if (!kfs || !kfs.length || !target) return;
  const first = kfs[0].time, last = kfs[kfs.length-1].time;
  if (t <= first) { _applyKf(target, kfs[0]); return; }
  if (t >= last)  { _applyKf(target, kfs[kfs.length-1]); return; }
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i+1];
    if (t >= a.time && t <= b.time) {
      const raw = (t - a.time) / Math.max(0.0001, b.time - a.time);
      const ease = _easings[a.ease || 'smooth'] || _easings.smooth;
      const et = ease(raw);
      const out = {};
      if (a.pos && b.pos)     out.pos   = _lerpV3(a.pos, b.pos, et);
      if (a.rot && b.rot)     out.rot   = _lerpV3(a.rot, b.rot, et);
      if (a.scale && b.scale) out.scale = _lerpV3(a.scale, b.scale, et);
      _applyKf(target, out);
      return;
    }
  }
}
function updateTimeline(dt) {
  if (!timelineData || !timelineData.tracks) return;
  _tlTime = (_tlTime + dt) % _tlDuration;
  timelineData.tracks.forEach(track => {
    const target = meshById.get(track.objId);
    if (!target) return;
    _interpolateTrackAt(track, target, _tlTime);
  });
}

// ────────────────────────────────────────────────────────────
// INTERACTIVE BUTTON — trigger/attached/pickup
// ────────────────────────────────────────────────────────────
function _playAudio(url) {
  if (!url) return;
  try {
    const a = new Audio(url);
    a.volume = 0.75;
    a.addEventListener('ended', () => _activeAudios.delete(a));
    a.addEventListener('pause', () => _activeAudios.delete(a));
    _activeAudios.add(a);
    a.play().catch(()=>{});
  } catch(e) {}
}
function _stopAllAudios() {
  _activeAudios.forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e){} });
  _activeAudios.clear();
}
function _advanceBtn(btn) {
  const d = btn.userData._btn;
  const len = (d.slots || []).length;
  if (len === 0) return;
  if (len === 1) { d._currentIdx = 0; d._direction = 1; return; }
  if (d.mode === 'pingpong') {
    d._currentIdx += d._direction;
    if (d._currentIdx >= len)  { d._currentIdx = len - 2; d._direction = -1; }
    else if (d._currentIdx < 0){ d._currentIdx = 1;       d._direction = +1; }
  } else {
    d._currentIdx = (d._currentIdx + 1) % len;
    d._direction  = 1;
  }
}
function _pickupBtn(btn) {
  if (_carried) return;
  const d = btn.userData._btn;
  const target = d.pickupTargetId ? meshById.get(d.pickupTargetId) : btn;
  if (!target) return;
  _carried = { btnId: btn.userData._id, target };
  try { cam.attach(target); } catch(e) {}
}
function _throwCarried(btn) {
  if (!_carried) return;
  const target = _carried.target;
  const d = btn ? btn.userData._btn : { throwForce: 12 };
  const wpos = new THREE.Vector3(); target.getWorldPosition(wpos);
  const wq   = new THREE.Quaternion(); target.getWorldQuaternion(wq);
  try { sc.attach(target); } catch(e) {}
  target.position.copy(wpos); target.quaternion.copy(wq);
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion);
  fwd.multiplyScalar(d.throwForce || 12);
  fwd.y += (d.throwForce || 12) * 0.15;
  _thrownItems.push({ obj:target, vel:fwd, life:6 });
  _carried = null;
}
function _fireBtn(btn) {
  const d = btn.userData._btn;
  if (d.btnMode === 'pickup') {
    if (_carried) _throwCarried(btn);
    else          _pickupBtn(btn);
    return;
  }
  if (d._playing) return;
  const slots = d.slots || [];
  if (!slots.length) return;
  const idx  = Math.max(0, Math.min(slots.length-1, d._currentIdx || 0));
  const slot = slots[idx];
  const hasAnim  = slot && slot.keyframes && slot.keyframes.length > 0;
  const hasSound = slot && slot.soundUrl;
  // Bo'sh slot — hozirgi soundlarni to'xtat
  if (!hasAnim && !hasSound) {
    _stopAllAudios();
    _advanceBtn(btn);
    return;
  }
  if (hasSound) _playAudio(slot.soundUrl);
  if (!hasAnim) { _advanceBtn(btn); return; }
  const target = meshById.get(slot.targetObjectId);
  if (!target) { _advanceBtn(btn); return; }
  // Animatsiyani ijro etamiz
  d._playing = true;
  const times = slot.keyframes.map(k => k.time || 0);
  const startT = Math.min(...times);
  const endT   = Math.max(...times);
  _activeAnims.set(btn.userData._id, {
    kfs: slot.keyframes,
    target,
    t: startT, startT, endT,
    speed: slot.speed || 1,
    btn,
  });
}
function updateBtnAnims(dt) {
  _activeAnims.forEach((a, id) => {
    a.t += dt * a.speed;
    if (a.t >= a.endT) {
      _interpolateTrackAt({ keyframes: a.kfs }, a.target, a.endT);
      a.btn.userData._btn._playing = false;
      _activeAnims.delete(id);
      _advanceBtn(a.btn);
      return;
    }
    _interpolateTrackAt({ keyframes: a.kfs }, a.target, a.t);
  });
}
function _updateCarried() {
  if (!_carried) return;
  const target = _carried.target;
  const btn = meshById.get(_carried.btnId);
  const holdDist = btn?.userData?._btn?.holdDist || 1.5;
  target.position.set(0, -0.3, -holdDist);
  target.rotation.set(0, 0, 0);
  if (target.parent !== cam) { try { cam.attach(target); } catch(e) {} }
}
function _updateThrown(dt) {
  const g = 15;
  for (let i = _thrownItems.length - 1; i >= 0; i--) {
    const t = _thrownItems[i];
    if (!t.obj || !t.obj.parent) { _thrownItems.splice(i,1); continue; }
    t.obj.position.addScaledVector(t.vel, dt);
    t.vel.y -= g * dt;
    t.vel.multiplyScalar(Math.pow(0.98, dt/0.016));
    t.life -= dt;
    if (t.obj.position.y < 0.5) {
      t.obj.position.y = 0.5;
      if (t.vel.y < 0) t.vel.y *= -0.3;
      t.vel.x *= 0.6; t.vel.z *= 0.6;
    }
    const sp2 = t.vel.x*t.vel.x + t.vel.y*t.vel.y + t.vel.z*t.vel.z;
    if (t.life <= 0 || (sp2 < 0.02 && t.obj.position.y <= 0.6)) _thrownItems.splice(i,1);
  }
}
function updateBtnInteract() {
  if (!btnList.length) return;
  // Oyinchi (yoki kamera) pozitsiyasi
  const pos = pm ? pm.position.clone() : cam.position.clone();
  // Eng yaqin tugmani top
  let closest = null, cd = Infinity;
  const _wp = new THREE.Vector3();
  for (const btn of btnList) {
    btn.getWorldPosition(_wp);
    const d = _wp.distanceTo(pos);
    const md = btn.userData._btn.interactDist || 3;
    if (d > md) continue;
    if (d < cd) { cd = d; closest = btn; }
  }
  // Ko'tarilgan holatda — istalgan E tashlaydi
  if (_carried) {
    const carriedBtn = meshById.get(_carried.btnId);
    const key = carriedBtn?.userData?._btn?.actionKey || 'KeyE';
    if (keys[key] && !_prevKeys[key]) _throwCarried(carriedBtn);
    _prevKeys[key] = keys[key];
    return;
  }
  if (closest) {
    const key = closest.userData._btn.actionKey || 'KeyE';
    if (keys[key] && !_prevKeys[key]) _fireBtn(closest);
    _prevKeys[key] = keys[key];
  }
}

// ────────────────────────────────────────────────────────────
// MOVING PLATFORM (oyinchi harakatlanuvchi obyekt bilan boradi)
// ────────────────────────────────────────────────────────────
const _tmp = {
  pos:  new THREE.Vector3(), quat: new THREE.Quaternion(), scl: new THREE.Vector3(),
  unit: new THREE.Vector3(1,1,1),
  m1: new THREE.Matrix4(), m2: new THREE.Matrix4(), m3: new THREE.Matrix4(),
  prev: new THREE.Vector3(), dq: new THREE.Quaternion(), de: new THREE.Euler(),
};
function applyPlatformCarry(dt) {
  if (!pm || !_groundObj || !_groundObj.parent || !_groundLastMat) return;
  _groundObj.updateMatrixWorld(true);
  _groundLastMat.decompose(_tmp.pos, _tmp.quat, _tmp.scl);
  const prev = _tmp.m1.compose(_tmp.pos, _tmp.quat, _tmp.unit);
  _groundObj.matrixWorld.decompose(_tmp.pos, _tmp.quat, _tmp.scl);
  const curr = _tmp.m2.compose(_tmp.pos, _tmp.quat, _tmp.unit);
  const dm = _tmp.m3.multiplyMatrices(curr, prev.invert());
  _tmp.prev.copy(pm.position);
  pm.position.applyMatrix4(dm);
  if (!_groundVel) _groundVel = new THREE.Vector3();
  _groundVel.subVectors(pm.position, _tmp.prev).divideScalar(Math.max(0.001, dt));
  _tmp.dq.setFromRotationMatrix(dm);
  _tmp.de.setFromQuaternion(_tmp.dq, 'YXZ');
  if (Math.abs(_tmp.de.y) > 0.0001) yaw += _tmp.de.y;
}
function updatePlatformTracking(currentGround) {
  if (currentGround) {
    if (_groundObj !== currentGround) _groundVel = null;
    _groundObj = currentGround;
    currentGround.updateMatrixWorld(true);
    if (!_groundLastMat) _groundLastMat = new THREE.Matrix4();
    _groundLastMat.copy(currentGround.matrixWorld);
  } else {
    if (_groundObj && _groundVel) {
      vel.x += _groundVel.x;
      vel.z += _groundVel.z;
      if (_groundVel.y > 0.5) vel.y += _groundVel.y * 0.5;
    }
    _groundObj = null; _groundLastMat = null; _groundVel = null;
  }
}

// ────────────────────────────────────────────────────────────
// GAME LOOP — update(dt)
// ────────────────────────────────────────────────────────────
function update(dt) {
  updateTimeline(dt);
  updateBtnAnims(dt);
  _updateCarried();
  _updateThrown(dt);
  updateBtnInteract();

  if (!CFG.hasPlayer || !pm) {
    // Ko'rinish rejimi — kamera erkin uchadi
    cam.rotation.order = 'YXZ';
    cam.rotation.y = yaw; cam.rotation.x = pitch;
    const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const r = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));
    const s = 5 * dt;
    if (keys['KeyW']||keys['ArrowUp'])    cam.position.addScaledVector(f,  s);
    if (keys['KeyS']||keys['ArrowDown'])  cam.position.addScaledVector(f, -s);
    if (keys['KeyA']||keys['ArrowLeft'])  cam.position.addScaledVector(r, -s);
    if (keys['KeyD']||keys['ArrowRight']) cam.position.addScaledVector(r,  s);
    if (keys['Space']||keys['KeyE'])      cam.position.y += s;
    if (keys['KeyQ']||keys['ShiftLeft'])  cam.position.y -= s;
    return;
  }

  if (CFG.isCar) {
    // Mashina — WASD haydash, mouse offset kamera
    const gas   = keys['KeyW']||keys['ArrowUp']    ? 1 : 0;
    const brake = keys['KeyS']||keys['ArrowDown']  ? 1 : 0;
    const left  = keys['KeyA']||keys['ArrowLeft']  ? 1 : 0;
    const right = keys['KeyD']||keys['ArrowRight'] ? 1 : 0;
    if (!pm.userData._sp) pm.userData._sp = 0;
    if (!pm.userData._st) pm.userData._st = 0;
    const maxSp = 22;
    if (gas)   pm.userData._sp = Math.min(maxSp, pm.userData._sp + 10*dt);
    if (brake) pm.userData._sp = pm.userData._sp > 0.15 ? Math.max(0, pm.userData._sp - 18*dt)
                                                       : Math.max(-8, pm.userData._sp - 6*dt);
    if (!gas && !brake) pm.userData._sp *= Math.pow(0.9, dt/0.016);
    const steerDir = right - left;
    pm.userData._st += steerDir * 3.5 * dt;
    if (steerDir === 0) pm.userData._st *= Math.pow(0.86, dt/0.016);
    pm.userData._st = Math.max(-0.7, Math.min(0.7, pm.userData._st));
    // Rotatsiya (tezlik bilan proportsional)
    const spR = Math.min(1, Math.abs(pm.userData._sp)/maxSp);
    pm.rotation.y -= pm.userData._st * (0.4 + spR*0.6) * dt * 3.5 * Math.sign(pm.userData._sp || 1);
    const fwd = new THREE.Vector3(-Math.sin(pm.rotation.y), 0, -Math.cos(pm.rotation.y));
    pm.position.addScaledVector(fwd, pm.userData._sp * dt);
    if (pm.position.y > 0.6) pm.position.y -= 9.8*dt;
    if (pm.position.y < 0.6) pm.position.y  = 0.6;
    // Kamera — 3-shaxs orqadan, mouse offset + FOV + roll
    const effYaw = pm.rotation.y + Math.PI + _carCamYawOff;
    const dist = 6, h = 3;
    cam.position.lerp(new THREE.Vector3(
      pm.position.x + Math.sin(effYaw)*dist*Math.cos(_carCamPitchOff),
      pm.position.y + h - Math.sin(_carCamPitchOff)*dist,
      pm.position.z + Math.cos(effYaw)*dist*Math.cos(_carCamPitchOff)
    ), dt*5);
    cam.lookAt(pm.position.clone().add(new THREE.Vector3(0,1,0)));
    // Speed FOV
    const tgtFov = 60 + 15*spR;
    cam.fov += (tgtFov - cam.fov) * Math.min(1, dt*3);
    cam.updateProjectionMatrix();
    // Roll tilt
    const tgtRoll = pm.userData._st * 0.18 * spR;
    if (!pm.userData._rl) pm.userData._rl = 0;
    pm.userData._rl += (tgtRoll - pm.userData._rl) * Math.min(1, dt*5);
    if (Math.abs(pm.userData._rl) > 0.001) cam.rotateZ(pm.userData._rl);
    return;
  }

  // ── OYINCHI (FPS) ──
  // 1. Platform carry (oldingi frame'da ustida turgan obyekt deltasi)
  applyPlatformCarry(dt);

  // 2. WASD harakat
  const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const r = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));
  vel.x = 0; vel.z = 0;
  if (keys['KeyW']||keys['ArrowUp'])    { vel.x+=f.x*6; vel.z+=f.z*6; }
  if (keys['KeyS']||keys['ArrowDown'])  { vel.x-=f.x*4; vel.z-=f.z*4; }
  if (keys['KeyA']||keys['ArrowLeft'])  { vel.x-=r.x*5; vel.z-=r.z*5; }
  if (keys['KeyD']||keys['ArrowRight']) { vel.x+=r.x*5; vel.z+=r.z*5; }

  // 3. Gravitatsiya
  vel.y += -25*dt;
  pm.position.addScaledVector(vel, dt);

  // 4. AABB collision — obyektlar bilan
  let currentGround = null;
  const pHW = pm.scale.x * 0.5, pHH = pm.scale.y * 0.5, pHD = pm.scale.z * 0.5;
  for (const obj of allMeshes) {
    if (obj === pm) continue;
    if (!obj.parent) continue;
    if (obj.userData._src?.type === 'Tekislik') continue;
    if (obj.userData._src?.isPlayerObj) continue;
    // World pozitsiyasi (attached obyektlar uchun)
    obj.updateMatrixWorld(true);
    const wp = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
    const oHW = obj.scale.x * 0.5, oHH = obj.scale.y * 0.5, oHD = obj.scale.z * 0.5;
    const dx = pm.position.x - wp.x, dy = pm.position.y - wp.y, dz = pm.position.z - wp.z;
    const ovX = (pHW + oHW) - Math.abs(dx);
    const ovY = (pHH + oHH) - Math.abs(dy);
    const ovZ = (pHD + oHD) - Math.abs(dz);
    if (ovX <= 0 || ovY <= 0 || ovZ <= 0) continue;
    if (dy > 0 && vel.y <= 0 && ovY < pHH * 0.6) {
      pm.position.y = wp.y + oHH + pHH;
      vel.y = 0;
      currentGround = obj;
      continue;
    }
    if (dy < 0 && vel.y > 0 && ovY < pHH * 0.6) {
      pm.position.y = wp.y - oHH - pHH;
      vel.y = 0;
      continue;
    }
    if (ovX < ovZ) { pm.position.x += dx > 0 ? ovX : -ovX; vel.x = 0; }
    else           { pm.position.z += dz > 0 ? ovZ : -ovZ; vel.z = 0; }
  }
  // Yer
  if (pm.position.y < 0.9) { pm.position.y = 0.9; vel.y = 0; currentGround = currentGround || 'ground'; }
  // Sakrash
  if (keys['Space'] && currentGround) vel.y = 8;

  // 5. Platform tracking (keyingi frame uchun)
  updatePlatformTracking(currentGround && currentGround !== 'ground' ? currentGround : null);

  // 6. Kamera
  cam.position.copy(pm.position).add(new THREE.Vector3(0, 1.6, 0));
  cam.rotation.order = 'YXZ';
  cam.rotation.y = yaw; cam.rotation.x = pitch;
  pm.rotation.y = yaw;
}

const clk = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const d = Math.min(clk.getDelta(), 0.05);
  sc.traverse(o => { if(o.userData._mx) o.userData._mx.update(d); });
  update(d);
  rnd.render(sc, cam);
}
</script>`;
}
