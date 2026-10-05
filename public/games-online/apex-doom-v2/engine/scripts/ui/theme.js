// ============================================================
//  🎨 ThemeSystem — palitra + APEX menyusi
// ------------------------------------------------------------
//  Uch narsa bir joyda:
//    1. 🎨 Palitra — foydalanuvchi tanlaydigan rang sxemasi
//    2. 📂 APEX menyusi — Saqlash · Ochish · Yuklash · Sozlamalar
//    3. 🌐 Til — endi sozlamalar ichida
//
//  ⚠ NEGA CSS O'ZGARUVCHILARI ORQALI: butun interfeys
//    `var(--bg)`, `var(--accent)` kabi tokenlarga tayanadi
//    (600+ joyda). Palitra shu tokenlarni almashtiradi — bitta
//    ham CSS qoidasi qayta yozilmaydi.
//
//  ⚠ `--accent-rgb` JUFTLARI SHART: CSS da hex o'zgaruvchiga
//    alfa qo'shib bo'lmaydi (`rgba(var(--accent), .1)` ishlamaydi).
//    Loyihada shaffof tuslar aynan `rgba(var(--accent-rgb), …)`
//    bilan yasaladi. Palitra ikkalasini BIRGA yangilashi kerak,
//    aks holda fon ranglari eski palitrada qotib qolardi.
// ============================================================

const ThemeSystem = (() => {
  'use strict';

  const LS_KEY = 'apex_theme';

  /** hex → "r,g,b" */
  function _rgb(hex) {
    const h = String(hex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }

  // ── PALITRALAR ──────────────────────────────────────────────
  //  Har birida uch pog'ona fon (fon → panel → ichki maydon) va
  //  bitta aksent oilasi. `accent2/3/4` va `red` MA'NO uchun:
  //  ogohlantirish, tasdiq, alohida — ular palitradan qat'i nazar
  //  farqlanib turishi kerak.
  const PALETTES = {
    'qora-kok': {
      label: '🌑 Qora · ko‘k', dark: true,
      v: { bg:'#14161a', panel:'#191c21', panel2:'#20242a', border:'#2a2f36',
           hover:'#23272e', text:'#d6dae0', muted:'#79818c',
           accent:'#78b4e8', accent2:'#d49a6a', accent3:'#7cc49b',
           accent4:'#ab97d8', red:'#dd7b7b' },
    },
    'qora-qizil': {
      label: '🔴 Qora · qizil', dark: true,
      v: { bg:'#141011', panel:'#1a1516', panel2:'#221b1c', border:'#332728',
           hover:'#261e1f', text:'#e0d8d8', muted:'#8c7d7e',
           accent:'#e08585', accent2:'#d4a86a', accent3:'#8cc49b',
           accent4:'#c497b8', red:'#ff6b6b' },
    },
    'qora-oq': {
      label: '⚫ Qora · oq', dark: true,
      v: { bg:'#121212', panel:'#181818', panel2:'#202020', border:'#2e2e2e',
           hover:'#252525', text:'#e8e8e8', muted:'#858585',
           accent:'#e8e8e8', accent2:'#c9a96a', accent3:'#8fc49b',
           accent4:'#b0a8d8', red:'#e08585' },
    },
    'qora-yashil': {
      label: '🟢 Qora · yashil', dark: true,
      v: { bg:'#101413', panel:'#151a18', panel2:'#1c221f', border:'#28312d',
           hover:'#1f2724', text:'#d6e0da', muted:'#798c84',
           accent:'#7cc49b', accent2:'#d4b46a', accent3:'#78b4e8',
           accent4:'#ab97d8', red:'#dd7b7b' },
    },
    'oq-qora': {
      label: '⚪ Oq · qora', dark: false,
      v: { bg:'#f2f3f5', panel:'#ffffff', panel2:'#e9ebee', border:'#d2d6dc',
           hover:'#e2e5e9', text:'#1c1f24', muted:'#6b7280',
           accent:'#2f6fa8', accent2:'#a06b2a', accent3:'#2f7d52',
           accent4:'#6a4fa8', red:'#c04141' },
    },
    'oq-kok': {
      label: '🔵 Oq · ko‘k', dark: false,
      v: { bg:'#eef2f7', panel:'#ffffff', panel2:'#e2e9f2', border:'#cbd6e4',
           hover:'#dce5f0', text:'#16202c', muted:'#5c6b7d',
           accent:'#1f6feb', accent2:'#9a6a1f', accent3:'#1f7d4f',
           accent4:'#6a3fd0', red:'#c62f2f' },
    },
  };

  let _cur = 'qora-kok';

  /** Palitrani qo'llaydi (CSS o'zgaruvchilarini almashtiradi). */
  function apply(id) {
    const p = PALETTES[id];
    if (!p) return false;
    _cur = id;
    const r = document.documentElement.style;
    for (const [k, hex] of Object.entries(p.v)) {
      r.setProperty('--' + k, hex);
      // ⚠ RGB juftlik — shaffof tuslar uchun (izohga qarang)
      if (['accent','accent2','accent3','accent4','red'].includes(k)) {
        r.setProperty('--' + k + '-rgb', _rgb(hex));
      }
    }
    // 🌗 Yorug' temada soyalar va aralashuv boshqacha ishlaydi
    document.documentElement.setAttribute('data-theme', p.dark ? 'dark' : 'light');
    try { localStorage.setItem(LS_KEY, id); } catch (e) {}
    if (typeof log === 'function') log(`🎨 Mavzu: ${p.label}`, 'lok');
    return true;
  }

  function current() { return _cur; }
  function list() { return Object.entries(PALETTES).map(([id, p]) => ({ id, ...p })); }

  // ── Boshlanish ──────────────────────────────────────────────
  //  ⚠ `DOMContentLoaded` KUTILMAYDI: palitra qanchalik erta
  //    qo'llansa, "eski rangda bir lahza ko'rinish" shunchalik
  //    kam bo'ladi.
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && PALETTES[saved]) _cur = saved;
  } catch (e) {}
  apply(_cur);

  return { PALETTES, apply, current, list };
})();

window.ThemeSystem = ThemeSystem;

// ============================================================
//  📂 APEX MENYUSI — sarlavhani bosganda ochiladi
// ============================================================
(() => {
  'use strict';

  function _menu() {
    let m = document.getElementById('apex-menu');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'apex-menu';
    document.body.appendChild(m);
    return m;
  }

  function close() {
    const m = document.getElementById('apex-menu');
    if (m) m.style.display = 'none';
    const l = document.getElementById('apex-logo');
    if (l) l.classList.remove('open');
  }
  window.closeApexMenu = close;

  function _row(icon, label, onclick, hint) {
    return `<button class="apex-item" onclick="${onclick}">
      <span class="ai-ic">${icon}</span>
      <span class="ai-tx">${label}</span>
      ${hint ? `<span class="ai-hint">${hint}</span>` : ''}
    </button>`;
  }

  /**
   * 💾 Saqlash — `Ctrl+S` bilan AYNAN bir xil yo'l.
   *
   * ⚠ NEGA `saveScene()` NING O'ZI EMAS: u ZIP ni brauzerga
   *   YUKLAB OLADI. Foydalanuvchi "saqlandi" deb o'ylab qoladi,
   *   loyiha papkasi esa yaratilmagan bo'ladi — keyingi safar
   *   "Ochish" da hech nima chiqmaydi.
   *   `keyboard.js` dagi `Ctrl+S` aynan shu sababdan loyiha
   *   papkasiga yozadi. Menyu ham o'shanga ergashadi.
   *
   * ⚠ Loyiha nomi hali yo'q bo'lsa — panel ochiladi (nom so'raladi),
   *   jimgina hech nima qilmaydi.
   */
  window.__apexSave = function () {
    const PS = window.ProjectSystem;
    if (PS && PS.cfg && PS.cfg.name) { PS.save(PS.cfg.name, false); return; }
    if (window.showProjectPanel) { window.showProjectPanel(); return; }
    if (window.saveScene) window.saveScene();
  };

  function toggle() {
    const m = _menu();
    if (m.style.display === 'block') { close(); return; }

    const langs = (window.LangSystem && LangSystem.LANGS) || {};
    const curLang = (window.LangSystem && LangSystem.current()) || 'uz';

    m.innerHTML = `
      <div class="apex-sec">LOYIHA</div>
      ${_row('💾', 'Saqlash',  'closeApexMenu();window.__apexSave()',  'Ctrl+S')}
      ${_row('📂', 'Ochish',   'closeApexMenu();showProjectPanel()',   'projects/')}

      <div class="apex-sec">FAYL</div>
      ${_row('⬇', 'ZIP yuklab olish', 'closeApexMenu();saveScene()',   'Ctrl+Shift+S')}
      ${_row('📥', 'Import GLB / GLTF', 'closeApexMenu();importGLTF()', '')}

      <div class="apex-sec">KO‘RINISH</div>
      <div class="apex-pal">
        ${ThemeSystem.list().map(p => `
          <button class="pal-chip ${p.id === ThemeSystem.current() ? 'on' : ''}"
                  onclick="ThemeSystem.apply('${p.id}');window.__apexRefreshMenu()"
                  title="${p.label}">
            <span class="pal-dots">
              <i style="background:${p.v.bg}"></i>
              <i style="background:${p.v.panel2}"></i>
              <i style="background:${p.v.accent}"></i>
            </span>
            <span class="pal-lbl">${p.label}</span>
          </button>`).join('')}
      </div>

      <div class="apex-sec">TIL</div>
      <div class="apex-langs">
        ${Object.entries(langs).map(([code, l]) => `
          <button class="lang-chip ${code === curLang ? 'on' : ''}"
                  onclick="LangSystem.apply('${code}');window.__apexRefreshMenu()">
            ${l.code} <span>${l.label}</span>
          </button>`).join('')}
      </div>
    `;
    m.style.display = 'block';
    const l = document.getElementById('apex-logo');
    if (l) l.classList.add('open');
  }
  window.toggleApexMenu = toggle;

  /** Menyu ochiq turganda uni qayta chizadi (tanlov ko'rinsin). */
  window.__apexRefreshMenu = () => {
    const m = document.getElementById('apex-menu');
    if (m && m.style.display === 'block') { m.style.display = 'none'; toggle(); }
  };

  // Tashqariga bosilsa — yopiladi
  document.addEventListener('mousedown', e => {
    const m = document.getElementById('apex-menu');
    if (!m || m.style.display !== 'block') return;
    if (m.contains(e.target)) return;
    const l = document.getElementById('apex-logo');
    if (l && l.contains(e.target)) return;
    close();
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  }, true);
})();
