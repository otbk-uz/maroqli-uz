// ============================================================
//  ⏸ PAUZA MENYUSI — o'yin ichida ESC
// ------------------------------------------------------------
//  Eksport qilingan o'yinda ESC bosilsa:
//      ▶ Davom ettirish · ⚙️ Sozlamalar · ✕ Chiqish
//
//  ⚙️ Sozlamalarda o'yinchi o'zi uchun sozlaydi:
//      ☀️ Yorug'lik · 🖱 Sezgirlik · 🔊 Ovoz
//      🎨 Grafika (past / o'rta / yuqori)
//      🖥 FPS chegarasi · ⚡ V-Sync
//
//  ── NEGA MUHARRIRDA EMAS ────────────────────────────────────
//  ⚠ Bu menyu FAQAT eksport qilingan o'yinda ishlaydi. Muharrirda
//    ESC allaqachon band: o'yindan chiqish, kamera rejimidan
//    chiqish, panel yopish. Uni bu yerda ham tutsak dizayner
//    ⏹ Stop bosolmay qolardi.
//
//  ── DIZAYNER SOZLAMALARI ────────────────────────────────────
//  Eksport oynasida (💾 → 🚀 game.zip) menyuni sozlash mumkin:
//  qaysi bo'limlar ko'rinsin, FPS chegarasining eng katta qiymati,
//  va o'z HTML/CSS/JS ni qo'shish.
//
//  ⚠ Dizayner kodi menyu ICHIGA qo'shiladi, uni ALMASHTIRMAYDI:
//    almashtirsak "Chiqish" tugmasi yo'qolib, o'yinchi o'yindan
//    chiqolmay qolardi.
// ============================================================
window.PauseMenu = (function () {
  'use strict';

  const ROOT = 'apex-pause';
  const CSS  = 'apex-pause-css';
  const _hasDoc = () => typeof document !== 'undefined' && !!document.body;

  /** Dizayner sozlamalari — eksport oynasida to'ldiriladi. */
  const cfg = {
    enabled:  true,
    title:    'PAUZA',
    //  ⚠ Har bo'lim ALOHIDA o'chiriladi: masalan mobil o'yinda
    //    🖱 sezgirlik keraksiz, lekin 🔊 ovoz kerak.
    show: { brightness: true, sensitivity: true, volume: true,
            graphics: true, fps: true, vsync: true },
    //  ⚠ Eng katta FPS chegarasi. Dizayner uni 200 ga qo'ysa
    //    o'yinchi undan yuqorisini tanlay olmaydi.
    fpsMax:   240,
    exitUrl:  '',            // ✕ Chiqish qayerga (bo'sh = oynani yopish)
    html: '', css: '', js: '',
  };

  /** O'yinchi sozlamalari — brauzerda saqlanadi. */
  const opt = {
    brightness: 1.0,     // 0.3 … 1.8
    sensitivity: 1.0,    // 0.2 … 3.0
    volume: 0.8,         // 0 … 1
    graphics: 'orta',    // past | orta | yuqori
    fpsCap: 0,           // 0 = cheklanmagan
    vsync: true,
    //  💬 O'YINCHINING tanlovi — dizaynerning emas.
    //  ⚠ Chat o'chirilsa faqat KO'RINISH yopiladi: ulanish,
    //    joylashuv sinxroni va boshqa hammasi ishlayveradi.
    //    Butunlay uzsak o'yinchi boshqalarni ham ko'rmay qolardi.
    chat: true,
  };

  let _open = false;
  let _page = 'main';      // main | settings
  const isOpen = () => _open;

  // ============================================================
  //  💾 O'yinchi sozlamalari — brauzerda
  // ------------------------------------------------------------
  //  ⚠ SAHNA bilan saqlanmaydi: bu O'YINCHINING tanlovi, dizayner
  //    qarori emas. Sahnaga yozsak har yangilanishda o'yinchining
  //    sozlamasi yo'qolardi.
  //  ⚠ HAMMASI `try` ichida: `localStorage` yopiq bo'lishi mumkin
  //    (maxfiy rejim, ba'zi mobil brauzerlar) — u holda sozlama
  //    shu sessiyada ishlaydi, xolos.
  // ============================================================
  const KEY = 'apex.opt';
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(opt, JSON.parse(raw));
    } catch (e) {}
    apply();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(opt)); } catch (e) {}
  }

  // ============================================================
  //  ⚙️ Sozlamalarni QO'LLASH
  // ============================================================
  function apply() {
    // ☀️ Yorug'lik — CSS filtri bilan, renderer ga tegmasdan.
    //  ⚠ NEGA CSS: renderer `toneMappingExposure` ni o'zgartirsak
    //    dizaynerning yorug'lik sozlamasi buzilardi. CSS filtri esa
    //    faqat KO'RINISHGA ta'sir qiladi.
    try {
      const cv = document.getElementById('cvp') || document.body;
      if (cv) cv.style.filter = (opt.brightness === 1) ? '' : `brightness(${opt.brightness})`;
    } catch (e) {}

    // 🖱 Sezgirlik
    try {
      if (typeof playerSettings !== 'undefined' && playerSettings) {
        //  ⚠ Dizayner qiymati ASOS sifatida saqlanadi va o'yinchi
        //    tanlovi unga KO'PAYTIRILADI. Almashtirsak dizaynerning
        //    sozlamasi butunlay yo'qolardi.
        if (playerSettings._baseSens === undefined) {
          playerSettings._baseSens = playerSettings.mouseSens ?? 1;
        }
        playerSettings.mouseSens = playerSettings._baseSens * opt.sensitivity;
      }
    } catch (e) {}

    // 🔊 Ovoz
    try {
      if (window.SoundSystem && SoundSystem.setMasterVolume) {
        SoundSystem.setMasterVolume(opt.volume);
      } else if (window.SoundSystem) {
        SoundSystem.masterVolume = opt.volume;
      }
    } catch (e) {}

    // 🎨 Grafika — soya va piksel nisbati
    try {
      const r = window.renderer;
      if (r) {
        const g = opt.graphics;
        r.shadowMap.enabled = (g !== 'past');
        //  ⚠ `devicePixelRatio` CHEGARALANADI: telefonlarda u 3 gacha
        //    chiqadi va past rejimda ham o'yin sekin ishlardi.
        const dpr = (typeof devicePixelRatio !== 'undefined') ? devicePixelRatio : 1;
        r.setPixelRatio(g === 'yuqori' ? Math.min(dpr, 2)
                      : g === 'orta'   ? Math.min(dpr, 1.5) : 1);
      }
    } catch (e) {}

    // 💬 Chat ko'rinishi
    //  ⚠ `MultiplayerSystem.cfg.chat` ga TEGMAYMIZ — u DIZAYNER
    //    sozlamasi va sahna bilan saqlanadi. O'yinchi tanlovi
    //    alohida bayroqda, aks holda o'yinchi chatni o'chirsa
    //    dizaynerning sahnasi ham o'zgarib ketardi.
    window._mpChatMuted = (opt.chat === false);
    try {
      if (window.MultiplayerSystem && MultiplayerSystem.chatToggle && opt.chat === false) {
        MultiplayerSystem.chatToggle(false);
      }
    } catch (e) {}

    // 🖥 FPS chegarasi — main-loop o'qiydi
    window._apexFpsCap = Math.max(0, Math.min(cfg.fpsMax, opt.fpsCap | 0));
    window._apexVsync  = !!opt.vsync;
  }

  function set(k, v) {
    //  ⚠ Segment tugmalari MATN beradi ('true'/'false'). Uni
    //    mantiqiy qiymatga aylantirmasak `opt.chat === false`
    //    tekshiruvi HECH QACHON to'g'ri bo'lmasdi — 'false' satri
    //    `false` ga teng emas.
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    opt[k] = v;
    //  ⚠ FPS chegarasi dizayner belgilagan tepadan OSHMAYDI.
    if (k === 'fpsCap') opt.fpsCap = Math.max(0, Math.min(cfg.fpsMax, v | 0));
    apply();
    save();
    if (_open) render();
  }

  // ============================================================
  //  🎨 Ko'rinish
  // ============================================================
  function _style() {
    if (!_hasDoc() || document.getElementById(CSS)) return;
    const s = document.createElement('style');
    s.id = CSS;
    s.textContent = `
#${ROOT}{position:absolute;inset:0;z-index:120;display:flex;align-items:center;
  justify-content:center;background:rgba(4,7,12,.82);backdrop-filter:blur(5px);
  font-family:'Share Tech Mono',monospace}
#${ROOT} .pm-box{min-width:320px;max-width:min(520px,90%);max-height:86%;overflow-y:auto;
  background:rgba(10,15,22,.96);border:1px solid rgba(0,255,190,.28);border-radius:8px;
  padding:20px 22px;box-shadow:0 16px 60px rgba(0,0,0,.7)}
#${ROOT} .pm-title{font-size:17px;letter-spacing:4px;color:#4de2c8;text-align:center;
  margin-bottom:16px}
#${ROOT} .pm-btn{display:block;width:100%;margin-bottom:9px;padding:11px;border-radius:5px;
  cursor:pointer;font-family:inherit;font-size:13px;letter-spacing:1px;
  border:1px solid rgba(0,255,190,.3);background:rgba(0,255,190,.07);color:#b9e8dd}
#${ROOT} .pm-btn:hover{background:rgba(0,255,190,.16);border-color:#4de2c8;color:#4de2c8}
#${ROOT} .pm-btn.pm-exit{border-color:rgba(255,80,80,.35);background:rgba(255,80,80,.07);color:#ff9d9d}
#${ROOT} .pm-btn.pm-exit:hover{background:rgba(255,80,80,.16);color:#ff6b6b}
#${ROOT} .pm-row{display:flex;align-items:center;gap:10px;margin-bottom:11px}
#${ROOT} .pm-lbl{font-size:11px;color:#8fa3b0;min-width:118px;flex-shrink:0}
#${ROOT} .pm-val{font-size:11px;color:#4de2c8;min-width:52px;text-align:right}
#${ROOT} input[type=range]{flex:1;accent-color:#4de2c8}
#${ROOT} .pm-seg{display:flex;gap:4px;flex:1}
#${ROOT} .pm-seg button{flex:1;padding:5px;border-radius:3px;cursor:pointer;font-family:inherit;
  font-size:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#8fa3b0}
#${ROOT} .pm-seg button.on{border-color:#4de2c8;background:rgba(0,255,190,.14);color:#4de2c8}`;
    document.head.appendChild(s);
  }

  const _seg = (cur, vals, fn) => `<div class="pm-seg">${vals.map(v =>
    `<button class="${cur === v[0] ? 'on' : ''}" onclick="PauseMenu.set('${fn}','${v[0]}')">${v[1]}</button>`).join('')}</div>`;

  function _mainHTML() {
    return `
      <div class="pm-title">${cfg.title || 'PAUZA'}</div>
      <button class="pm-btn" onclick="PauseMenu.close()">▶ Davom ettirish</button>
      <button class="pm-btn" onclick="PauseMenu.page('settings')">⚙️ Sozlamalar</button>
      <button class="pm-btn pm-exit" onclick="PauseMenu.exit()">✕ Chiqish</button>`;
  }

  function _settingsHTML() {
    const S = cfg.show || {};
    const pct = (v) => Math.round(v * 100) + '%';
    return `
      <div class="pm-title">SOZLAMALAR</div>
      ${S.brightness ? `<div class="pm-row"><span class="pm-lbl">☀️ Yorug'lik</span>
        <input type="range" min="0.3" max="1.8" step="0.05" value="${opt.brightness}"
          oninput="PauseMenu.set('brightness',parseFloat(this.value))">
        <span class="pm-val">${pct(opt.brightness)}</span></div>` : ''}
      ${S.sensitivity ? `<div class="pm-row"><span class="pm-lbl">🖱 Sezgirlik</span>
        <input type="range" min="0.2" max="3" step="0.05" value="${opt.sensitivity}"
          oninput="PauseMenu.set('sensitivity',parseFloat(this.value))">
        <span class="pm-val">${opt.sensitivity.toFixed(2)}×</span></div>` : ''}
      ${S.volume ? `<div class="pm-row"><span class="pm-lbl">🔊 Ovoz</span>
        <input type="range" min="0" max="1" step="0.02" value="${opt.volume}"
          oninput="PauseMenu.set('volume',parseFloat(this.value))">
        <span class="pm-val">${pct(opt.volume)}</span></div>` : ''}
      ${S.graphics ? `<div class="pm-row"><span class="pm-lbl">🎨 Grafika</span>
        ${_seg(opt.graphics, [['past', 'Past'], ['orta', "O'rta"], ['yuqori', 'Yuqori']], 'graphics')}
        </div>` : ''}
      ${S.fps ? `<div class="pm-row"><span class="pm-lbl">🖥 FPS chegarasi</span>
        <input type="range" min="0" max="${cfg.fpsMax}" step="10" value="${opt.fpsCap}"
          oninput="PauseMenu.set('fpsCap',parseInt(this.value))">
        <span class="pm-val">${opt.fpsCap ? opt.fpsCap : '∞'}</span></div>` : ''}
      <!--  NIK O'ZGARTIRISH.
            O'yinda multiplayer paneli YO'Q va o'yinchi nikini bir
            marta kiritgach uni HECH QACHON o'zgartira olmasdi:
            u brauzerda saqlanadi va qayta so'ralmaydi. -->
      ${(window.MultiplayerSystem && MultiplayerSystem.cfg) ? `
      <div class="pm-row">
        <span class="pm-lbl">\u{1F464} Nik</span>
        <!--  Hozirgi nik QIYMAT sifatida turadi - o'yinchi uni
              ko'radi va kerakli joyini tahrirlaydi. Bo'sh
              maydondan boshlash noqulay bo'lardi. -->
        <input id="pm-nick" maxlength="20" value="${String(
          (MultiplayerSystem.cfg.name || '')).replace(/[<>&"]/g, '')}"
          style="flex:1;background:#0a0f16;border:1px solid rgba(0,255,190,.3);
          color:#e8f0ee;padding:5px 8px;border-radius:4px;font-family:inherit;
          font-size:11px;outline:none">
        <button onclick="PauseMenu.saveNick()" class="pm-seg"
          style="padding:5px 11px;border-radius:4px;cursor:pointer;font-family:inherit;
          font-size:10px;border:1px solid #4de2c8;background:rgba(0,255,190,.1);
          color:#4de2c8;flex:0 0 auto">\u2713</button>
      </div>` : ''}

      <!--  Chat o'chirilsa faqat KO'RINISH yopiladi - ulanish va
            joylashuv sinxroni ishlayveradi. -->
      ${(window.MultiplayerSystem && MultiplayerSystem.cfg && MultiplayerSystem.cfg.chat)
        ? `<div class="pm-row"><span class="pm-lbl">\u{1F4AC} Chat</span>
        ${_seg(String(opt.chat !== false), [['true', 'Yoniq'], ['false', "O'chiq"]], 'chat')}
        </div>` : ''}
      ${S.vsync ? `<div class="pm-row"><span class="pm-lbl">⚡ V-Sync</span>
        ${_seg(String(opt.vsync), [['true', 'Yoniq'], ['false', "O'chiq"]], 'vsync')}
        </div>` : ''}
      ${cfg.html ? `<div id="pm-custom">${cfg.html}</div>` : ''}
      <button class="pm-btn" style="margin-top:14px" onclick="PauseMenu.page('main')">← Orqaga</button>`;
  }

  function render() {
    if (!_hasDoc() || !_open) return;
    _style();
    let r = document.getElementById(ROOT);
    if (!r) {
      r = document.createElement('div');
      r.id = ROOT;
      r.innerHTML = '<div class="pm-box"></div>';
      (document.getElementById('cvp') || document.body).appendChild(r);
    }
    const box = r.querySelector('.pm-box');
    box.innerHTML = (_page === 'settings') ? _settingsHTML() : _mainHTML();
    //  ⚠ Dizayner CSS si HAR CHIZISHDA emas, BIR MARTA qo'shiladi:
    //    har safar qo'shsak `<style>` teglari yig'ilib borardi.
    if (cfg.css && !document.getElementById('pm-user-css')) {
      const st = document.createElement('style');
      st.id = 'pm-user-css';
      st.textContent = cfg.css;
      document.head.appendChild(st);
    }
    //  ⚠ Dizayner JS i FAQAT sozlamalar sahifasida va `try` ichida:
    //    undagi xato menyuni yopib qo'ysa o'yinchi o'yindan
    //    chiqolmay qolardi.
    if (cfg.js && _page === 'settings') {
      try {
        const el = document.getElementById('pm-custom');
        new Function('root', 'opt', 'cfg', cfg.js)(el, opt, cfg);
      } catch (e) {
        try { console.error('⚠ Pauza menyusi JS xatosi:', e && e.message); } catch (x) {}
      }
    }
  }

  // ============================================================
  //  🔁 Ochish / yopish
  // ============================================================
  function open() {
    if (_open || !cfg.enabled) return;
    _open = true;
    _page = 'main';
    //  ⚠ O'yin TO'XTATILADI va sichqoncha qulfi ochiladi — aks holda
    //    o'yinchi menyu tugmalarini bosolmasdi.
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
    try { if (window._apexFlushKeys) window._apexFlushKeys(); } catch (e) {}
    window._apexPaused = true;
    render();
  }

  function close() {
    _open = false;
    window._apexPaused = false;
    if (_hasDoc()) { const r = document.getElementById(ROOT); if (r) r.remove(); }
  }

  const page = (p) => { _page = p; render(); };
  const toggle = () => (_open ? close() : open());

  /**
   * ✕ O'yindan chiqish.
   * ⚠ `window.close()` faqat skript OCHGAN oynada ishlaydi. Shuning
   *   uchun dizayner `exitUrl` bergan bo'lsa o'sha manzilga
   *   o'tamiz, bo'lmasa `close()` ni sinab ko'ramiz va bo'lmasa
   *   hech bo'lmasa "chiqdingiz" ekranini ko'rsatamiz — o'yinchi
   *   bosdim-u hech nima bo'lmadi degan holatda qolmasin.
   */
  function exit() {
    close();
    if (cfg.exitUrl) { try { location.href = cfg.exitUrl; return; } catch (e) {} }
    try { window.close(); } catch (e) {}
    setTimeout(() => {
      if (!_hasDoc()) return;
      try {
        document.body.innerHTML =
          '<div style="position:fixed;inset:0;display:flex;align-items:center;' +
          "justify-content:center;background:#04070c;color:#4de2c8;" +
          "font-family:'Share Tech Mono',monospace;font-size:15px;letter-spacing:2px\">" +
          "O'YINDAN CHIQDINGIZ \u2014 oynani yopishingiz mumkin</div>";
      } catch (e) {}
    }, 60);
  }

  /**
   * 👤 Nikni o'zgartiradi va SAQLAYDI.
   *
   * ⚠ Xona hammaga XABAR qilinadi: busiz boshqalar eski nikni
   *   ko'rib turardi va yorliq faqat qayta ulanganda yangilanardi.
   *
   * ⚠ `localStorage` ga ham yoziladi — keyingi kirishda yangi nik
   *   turadi. Aks holda o'yinchi har safar qaytadan o'zgartirishga
   *   majbur bo'lardi.
   *
   * ⚠ UID TEGILMAYDI: u o'yinchini tanitadi va nik bilan bog'liq
   *   emas. O'zgartirsak ballari va mulki begona bo'lib qolardi.
   */
  function saveNick() {
    if (!_hasDoc()) return false;
    const inp = document.getElementById('pm-nick');
    const M = window.MultiplayerSystem;
    if (!inp || !M || !M.cfg) return false;
    const v = String(inp.value || '').trim().slice(0, 20);
    //  ⚠ Bo'sh nik RAD ETILADI — bu yerda (nik so'rovchidan farqli)
    //    o'yinchi ATAYLAB o'zgartiryapti va bo'sh qoldirish xato.
    if (!v) { try { log('⚠ Nik bo\'sh bo\'lmasin', 'lw'); } catch (e) {} return false; }
    if (v === M.cfg.name) return false;

    M.cfg.name = v;
    try {
      const KEY = 'apex.mp.id';
      const old = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
      old.name = v;
      localStorage.setItem(KEY, JSON.stringify(old));
    } catch (e) {}
    //  ⚠ Xonaga darhol e'lon.
    try { if (M.renameSelf) M.renameSelf(v); } catch (e) {}
    try { log('👤 Nik: ' + v, 'lok'); } catch (e) {}
    render();
    return true;
  }

  function serialize() { return { cfg: JSON.parse(JSON.stringify(cfg)), opt: JSON.parse(JSON.stringify(opt)) }; }
  function restore(d) {
    if (!d) return;
    if (d.cfg) Object.assign(cfg, d.cfg);
    //  ⚠ `opt` sahnadan TIKLANMAYDI: u o'yinchining tanlovi va
    //    brauzerda saqlanadi. Sahnadan olsak har yangilanishda
    //    o'yinchining sozlamasi dizaynerникi bilan almashardi.
    apply();
  }

  // ============================================================
  //  ⌨ ESC — FAQAT eksport qilingan o'yinda
  // ------------------------------------------------------------
  //  ⚠ Muharrirda ESC allaqachon band: o'yindan chiqish, kamera
  //    rejimidan chiqish, panel yopish. Uni bu yerda ham tutsak
  //    dizayner ⏹ Stop bosolmay qolardi.
  //  ⚠ `window.__APEX_GAME__` — eksport qilingan o'yin belgisi.
  // ============================================================
  function _bind() {
    if (!_hasDoc() || window._pmBound) return;
    window._pmBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;
      if (!window.__APEX_GAME__) return;          // muharrir — tegmaymiz
      if (!cfg.enabled) return;
      //  ⚠ Boshqa oyna ochiq bo'lsa (📜 konsol) unga tegmaymiz.
      if (document.getElementById('apex-gconsole-open')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      toggle();
    }, true);
    load();
  }
  _bind();

  return { cfg, opt, open, close, toggle, page, exit, set, apply, saveNick,
           load, save, render, isOpen, serialize, restore };
})();
