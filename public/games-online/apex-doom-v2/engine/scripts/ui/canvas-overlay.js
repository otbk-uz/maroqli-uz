// ============================================================
// CANVAS OVERLAY TIZIMI
// Foydalanuvchi HTML/CSS/JS yozadi, tugmani bossa three-canvas
// ustida HUD/oyna chiqadi (minimap, salomatlik shkalasi, va h.k.)
// ============================================================
window._canvases = window._canvases || [];
// Har bir element: { id, name, triggerKey, corner, width, height, html, css, js, visible, _cleanup }
let _cvIdSeq = 1;
window._canvases.forEach(c => { if (c.id >= _cvIdSeq) _cvIdSeq = c.id + 1; });

const CV_CORNERS = [
  ['top-left',      '↖ Yuqori chap'],
  ['top-center',    '↑ Yuqori o\'rta'],
  ['top-right',     '↗ Yuqori o\'ng'],
  ['middle-left',   '← Chap o\'rta'],
  ['center',        '⊕ Markaz'],
  ['middle-right',  '→ O\'ng o\'rta'],
  ['bottom-left',   '↙ Pastki chap'],
  ['bottom-center', '↓ Pastki o\'rta'],
  ['bottom-right',  '↘ Pastki o\'ng']
];

function _cvCornerStyle(corner) {
  const M = '10px';
  switch (corner) {
    case 'top-left':      return `top:${M};left:${M}`;
    case 'top-center':    return `top:${M};left:50%;transform:translateX(-50%)`;
    case 'top-right':     return `top:${M};right:${M}`;
    case 'middle-left':   return `top:50%;left:${M};transform:translateY(-50%)`;
    case 'center':        return `top:50%;left:50%;transform:translate(-50%,-50%)`;
    case 'middle-right':  return `top:50%;right:${M};transform:translateY(-50%)`;
    case 'bottom-left':   return `bottom:${M};left:${M}`;
    case 'bottom-center': return `bottom:${M};left:50%;transform:translateX(-50%)`;
    case 'bottom-right':  return `bottom:${M};right:${M}`;
    default:              return `top:${M};left:${M}`;
  }
}

function _cvKeyLabel(code) {
  if (!code) return '—';
  if (typeof _keyLabel === 'function') return _keyLabel(code);
  return code.replace(/^Key|^Digit|^Arrow/, '');
}

// ── Kanvasni ko'rsatish/yashirish ───────────────────────────────
// ============================================================
//  📖 O'RIN TUTUVCHILAR RO'YXATI — HTML maydonining TEPASIDA
// ------------------------------------------------------------
//  ⚠ Ro'yxat `HudSystem.TOKENS` dan olinadi — YAGONA MANBA.
//    Bu yerda qo'lda yozsak, yangi tutuvchi qo'shilganda uni ikki
//    joyda yangilash kerak bo'lardi va biri albatta unutilardi:
//    dizayner mavjud imkoniyatni umuman bilmay qolardi.
//
//  ⚠ Bosilganda HTML maydoniga QO'SHILADI — qo'lda ko'chirishdan
//    ko'ra tez va xatosiz. Qavsni bir harf xato yozsa tutuvchi
//    jimgina xom matn bo'lib qolardi.
function _cvTokenList() {
  const T = (window.HudSystem && window.HudSystem.TOKENS) || [];
  if (!T.length) return '';
  return `
    <div style="margin:0 0 8px;padding:8px 10px;background:rgba(var(--accent3-rgb),.04);
      border:1px solid rgba(var(--accent3-rgb),.18);border-radius:5px">
      <div style="font-size:9px;color:var(--accent3);letter-spacing:1.5px;margin-bottom:6px;
        font-family:'Share Tech Mono',monospace">📖 O'RIN TUTUVCHILAR — bosing, qo'shiladi</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:3px 10px">
        ${T.map(x => `
          <div onclick="_cvInsertToken('${x.tag}')" title="HTML ga qo'shish"
            style="display:flex;align-items:baseline;gap:6px;cursor:pointer;padding:2px 4px;border-radius:3px"
            onmouseover="this.style.background='rgba(var(--accent3-rgb),.10)'"
            onmouseout="this.style.background='transparent'">
            <code style="color:var(--accent3);font-size:10px;font-family:'Share Tech Mono',monospace;
              flex-shrink:0;min-width:96px">${x.tag}</code>
            <span style="font-size:9px;color:var(--border);line-height:1.5">${x.desc}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

/** Tanlangan tutuvchini HTML maydoniga qo'shadi. */
window._cvInsertToken = function (tag) {
  const el = document.getElementById('cv-html');
  if (!el) return;
  //  ⚠ KURSOR JOYIGA qo'shiladi, oxiriga emas: dizayner matn
  //    o'rtasiga qo'ymoqchi bo'lsa har safar qo'lda ko'chirishga
  //    majbur bo'lardi.
  const a = el.selectionStart != null ? el.selectionStart : el.value.length;
  const b = el.selectionEnd != null ? el.selectionEnd : a;
  el.value = el.value.slice(0, a) + tag + el.value.slice(b);
  el.selectionStart = el.selectionEnd = a + tag.length;
  el.focus();
  //  ⚠ `oninput` QO'LDA chaqiriladi: qiymatni kod bilan
  //    o'zgartirish hodisa tug'dirmaydi va o'zgarish saqlanmasdi.
  if (typeof el.oninput === 'function') el.oninput();
};

window._renderCanvasOverlay = function(canvas) {
  const cvp = document.getElementById('cvp');
  if (!cvp) return;

  let el = document.getElementById('cv-ov-' + canvas.id);
  if (!el) {
    el = document.createElement('div');
    el.id = 'cv-ov-' + canvas.id;
    cvp.appendChild(el);
  }

  el.style.cssText = `
    position:absolute;
    width:${canvas.width || 280}px;
    height:${canvas.height || 180}px;
    z-index:60;
    pointer-events:auto;
    box-sizing:border-box;
    overflow:hidden;
    ${_cvCornerStyle(canvas.corner)};
  `;

  // CSS + HTML — CSS attribute selectori orqali sodda sko'plash
  const scopedCss = (canvas.css || '').replace(/(^|\})\s*([^{}@]+)\s*\{/g,
    (m, brace, sel) => `${brace} #cv-ov-${canvas.id} ${sel.split(',').map(s => s.trim()).join(`, #cv-ov-${canvas.id} `)} {`
  );
  // ============================================================
  //  🔤 O'RIN TUTUVCHILAR
  // ------------------------------------------------------------
  //  ⚠ XATO BOR EDI: HTML shundayligicha yozilardi va `{hp}`,
  //    `{n}`, `{random}` xom matn bo'lib ko'rinardi — dizayner
  //    canvas yaratardi, lekin \"ishlamayapti\" deb o'ylardi.
  //
  //  ⚠ `HudSystem.resolve` QAYTA ISHLATILADI, o'z nusxamiz emas:
  //    ikkita almashtiruvchi bo'lsa biri tuzatilib, ikkinchisi
  //    eskicha qolib ketardi.
  //
  //  ⚠ Asl HTML `_srcHtml` da SAQLANADI: almashtirilgan matnni
  //    qayta almashtirsak `{hp}` allaqachon `73` bo'lib ketgan
  //    bo'lardi va keyingi yangilanishda o'zgarmasdi.
  //  ⚠ Mazmun BITTA IDISHGA o'raladi (`.cv-body`).
  //    XATO BOR EDI: `el.lastChild` yangilanardi. HTML da bir nechta
  //    yuqori darajali element bo'lsa (masalan uchta `<div>`),
  //    `lastChild` faqat OXIRGISI bo'lardi — va uni uchta div bilan
  //    almashtirish har kadr ikkitasini QO'SHIB borardi:
  //        3 → 5 → 7 → 9 …
  //    Foydalanuvchi skrinshotida aynan shu: HUD da uchta qator
  //    yozilgan, ekranda esa to'rttadan ko'p quti.
  //    Bitta idish bilan almashtirish 1:1 bo'ladi.
  canvas._srcHtml = canvas.html || '';
  const _resolved = (window.HudSystem && window.HudSystem.resolve)
    ? window.HudSystem.resolve(canvas._srcHtml) : canvas._srcHtml;
  el.innerHTML = `<style>${scopedCss}</style>` +
                 `<div class="cv-body" style="display:contents">${_resolved}</div>`;
  el._cvBody = el.querySelector('.cv-body');
  el._cvLast = _resolved;

  // Eski JS cleanup (agar avvalgi run cleanup callback qaytargan bo'lsa)
  if (canvas._cleanup) {
    try { canvas._cleanup(); } catch (e) { /* ignore */ }
    canvas._cleanup = null;
  }

  // JS — root va canvas obyektlarini funksiyaga uzatamiz
  if (canvas.js && canvas.js.trim()) {
    try {
      const fn = new Function('root', 'canvas', canvas.js);
      const ret = fn(el, canvas);
      if (typeof ret === 'function') canvas._cleanup = ret;
    } catch (err) {
      console.error(`[Canvas "${canvas.name}"] JS xato:`, err);
      if (window.log) log(`⚠ Canvas "${canvas.name}" JS: ${err.message}`, 'lw');
    }
  }
};

window._showCanvas = function(canvas) {
  if (canvas.visible) return;
  canvas.visible = true;
  window._renderCanvasOverlay(canvas);
};

// ============================================================
//  🔄 HAR KADR YANGILASH — o'rin tutuvchilar tirik bo'lsin
// ------------------------------------------------------------
//  ⚠ Ilgari canvas BIR MARTA chizilardi. `{hp}` o'sha paytdagi
//    qiymatda qotib qolardi va o'yinchi jon yo'qotganda raqam
//    o'zgarmasdi — \"ishlamayapti\" bo'lib ko'rinardi.
//
//  ⚠ Faqat MATN qayta yoziladi, `<style>` va JS QAYTA ISHLAMAYDI:
//    aks holda dizaynerning `setInterval` i har kadr qaytadan
//    ishga tushib, brauzerni to'ldirardi.
//
//  ⚠ Faqat O'ZGARGANDA yoziladi — har kadr `innerHTML` yozish CSS
//    animatsiyalarni uzib turardi.
window._cvTickOverlays = function () {
  if (typeof document === 'undefined') return;
  if (!window._canvases || !window.HudSystem || !window.HudSystem.resolve) return;
  for (const c of window._canvases) {
    if (!c || !c._srcHtml) continue;
    const el = document.getElementById('cv-ov-' + c.id);
    if (!el || !el._cvBody) continue;
    //  ⚠ O'rin tutuvchi yo'q bo'lsa umuman tegmaymiz — statik
    //    canvas ni bekorga qayta yozishning ma'nosi yo'q.
    if (c._srcHtml.indexOf('{') < 0) continue;
    const v = window.HudSystem.resolve(c._srcHtml);
    //  ⚠ `innerHTML`, `outerHTML` EMAS: idishning O'ZI joyida
    //    qoladi, faqat ichi almashadi. `outerHTML` idishni yo'q
    //    qilib, havolani ham uzib qo'yardi.
    if (el._cvLast !== v) { el._cvBody.innerHTML = v; el._cvLast = v; }
  }
};

window._hideCanvas = function(canvas) {
  canvas.visible = false;
  if (canvas._cleanup) { try { canvas._cleanup(); } catch (e) {} canvas._cleanup = null; }
  const el = document.getElementById('cv-ov-' + canvas.id);
  if (el) el.remove();
};

window._toggleCanvas = function(canvas) {
  if (canvas.visible) _hideCanvas(canvas);
  else _showCanvas(canvas);
};

// ── Scope tekshiruvi: canvas hozirgi rejimda ko'rsatilishi mumkinmi? ─────
function _canvasScopeMatches(c) {
  const inCar = !!(typeof carInside !== 'undefined' && carInside);
  const s = c.scope || 'player';
  if (s === 'both')   return true;
  if (s === 'car')    return inCar;
  return !inCar; // 'player'
}

// ── Doimiy ko'rinib turadigan canvas'lar: scope + isPlaying'ga qarab ko'rsat/yashir ──
function _shouldShowAlways(c) {
  if (!c.alwaysVisible) return false;
  // O'yin rejimida emasmi? Edit'da chiqarmaymiz — sahna toza tursin
  if (typeof isPlaying !== 'undefined' && !isPlaying) return false;
  return _canvasScopeMatches(c);
}
function _refreshAlwaysVisible() {
  window._canvases.forEach(c => {
    if (!c.alwaysVisible) return;
    const want = _shouldShowAlways(c);
    if (want && !c.visible) _showCanvas(c);
    else if (!want && c.visible) _hideCanvas(c);
  });
}
window._refreshAlwaysVisible = _refreshAlwaysVisible;

// ── Tugma triggeri ───────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (document.getElementById('cv-overlay')) return;
  if (document.getElementById('bkm-overlay')) return;
  if (e.repeat) return;

  window._canvases.forEach(c => {
    if (!c.triggerKey || c.triggerKey !== e.code) return;
    if (c.alwaysVisible) return; // doimiy — tugma ta'sir qilmaydi
    if (!_canvasScopeMatches(c)) return;
    if ((c.mode || 'hold') === 'hold') {
      if (!c.visible) _showCanvas(c);
    } else {
      _toggleCanvas(c);
    }
  });
});

document.addEventListener('keyup', e => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

  window._canvases.forEach(c => {
    if (!c.triggerKey || c.triggerKey !== e.code) return;
    if (c.alwaysVisible) return; // doimiy — tugma ta'sir qilmaydi
    if ((c.mode || 'hold') === 'hold' && c.visible) _hideCanvas(c);
  });
});

// ── State kuzatuvi — carInside VA isPlaying o'zgarsa, refresh ───────────
let _lastInCar    = !!(typeof carInside !== 'undefined' && carInside);
let _lastPlaying  = !!(typeof isPlaying  !== 'undefined' && isPlaying);
setInterval(() => {
  const inCarNow   = !!(typeof carInside !== 'undefined' && carInside);
  const playingNow = !!(typeof isPlaying  !== 'undefined' && isPlaying);
  if (inCarNow === _lastInCar && playingNow === _lastPlaying) return;
  _lastInCar = inCarNow;
  _lastPlaying = playingNow;
  // 1. Doimiy canvas'larni qayta hisoblash
  _refreshAlwaysVisible();
  // 2. Trigger orqali ochilgan canvas'lar — endi noto'g'ri rejim bo'lsa, yashir
  window._canvases.forEach(c => {
    if (c.alwaysVisible) return; // doimiylarni alohida ushlaymiz
    if (c.visible && !_canvasScopeMatches(c)) _hideCanvas(c);
  });
}, 150);

// ============================================================
// MUHARRIR (modal)
// ============================================================
window.openCanvasEditor = function() {
  if (document.getElementById('cv-overlay')) {
    document.getElementById('cv-overlay').remove();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'cv-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,5,15,.85);backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
    font-family:'Share Tech Mono',monospace;
  `;
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) overlay.remove(); });

  const panel = document.createElement('div');
  panel.style.cssText = `
    width:min(1150px, 96vw); height:min(740px, 94vh);
    background:#070b14; border:1px solid #1a2535; border-radius:8px;
    display:flex; flex-direction:column; overflow:hidden;
    box-shadow:0 0 60px rgba(var(--accent-rgb),.15);
  `;

  // Sarlavha
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #1a2535;background:rgba(var(--accent-rgb),.04)';
  hdr.innerHTML = `
    <div style="font-size:13px;color:var(--accent);letter-spacing:2px">🎨 CANVAS MUHARRIR</div>
    <div style="display:flex;gap:8px;align-items:center">
      <button id="cv-add" style="background:rgba(var(--accent3-rgb),.1);border:1px solid rgba(var(--accent3-rgb),.4);color:var(--accent3);padding:6px 12px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px">➕ Yangi canvas</button>
      <button id="cv-close" style="background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);color:#ff4444;padding:6px 12px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px">✕ Yopish</button>
    </div>
  `;
  panel.appendChild(hdr);

  // Tana — yon panel + asosiy muharrir
  const body = document.createElement('div');
  body.style.cssText = 'flex:1;display:flex;overflow:hidden';

  const sidebar = document.createElement('div');
  sidebar.id = 'cv-sidebar';
  sidebar.style.cssText = 'width:220px;border-right:1px solid #1a2535;overflow-y:auto;padding:10px;background:rgba(0,0,0,.2)';
  body.appendChild(sidebar);

  const main = document.createElement('div');
  main.id = 'cv-main';
  main.style.cssText = 'flex:1;overflow-y:auto;padding:14px';
  main.innerHTML = `<div style="color:var(--border);font-size:11px;text-align:center;margin-top:80px">← Chapdan canvas tanlang yoki yangisini yarating</div>`;
  body.appendChild(main);

  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Hodisalar
  document.getElementById('cv-close').onclick = () => overlay.remove();
  document.getElementById('cv-add').onclick = () => {
    const newC = {
      id: _cvIdSeq++, name: 'Canvas ' + _cvIdSeq, triggerKey: '',
      corner: 'top-left', width: 280, height: 180, mode: 'hold',
      scope: 'player', // 'player' | 'car' | 'both'
      alwaysVisible: false, // doimiy ko'rinib tursinmi (tugmasiz)
      html: '<div class="hud">Salom!</div>',
      css: '.hud { color:var(--accent3); font-family:monospace; padding:10px; background:rgba(0,0,0,.6); border:1px solid var(--accent3); border-radius:6px }',
      js: '// root — kanvas DOM elementi, canvas — sozlamalar\n// Misol: har soniyada vaqtni yangilash\n// const t = root.querySelector(".hud");\n// const id = setInterval(()=> t.textContent = new Date().toLocaleTimeString(), 1000);\n// return () => clearInterval(id);  // cleanup',
      visible: false
    };
    window._canvases.push(newC);
    _cvRenderSidebar();
    _cvRenderEditor(newC);
  };

  _cvRenderSidebar();
};

function _cvRenderSidebar() {
  const sidebar = document.getElementById('cv-sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = '<div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:8px">RO\'YXAT</div>';

  if (!window._canvases.length) {
    sidebar.innerHTML += '<div style="color:var(--border);font-size:10px;padding:14px 6px;text-align:center;line-height:1.6">Hali canvas yo\'q.<br>Yuqoridan «➕ Yangi» bosing.</div>';
    return;
  }

  window._canvases.forEach((c, idx) => {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 9px;margin-bottom:5px;background:rgba(255,255,255,.03);border:1px solid #1a2535;border-radius:5px;cursor:pointer;transition:all .12s`;
    row.onmouseenter = () => row.style.background = 'rgba(var(--accent-rgb),.08)';
    row.onmouseleave = () => row.style.background = 'rgba(255,255,255,.03)';
    row.onclick = (e) => { if (e.target.tagName !== 'BUTTON') _cvRenderEditor(c); };

    const scopeIcon = c.scope === 'car' ? '🚗' : (c.scope === 'both' ? '🌐' : '👤');
    const alwaysIcon = c.alwaysVisible ? '⭐ ' : '';
    row.innerHTML = `
      <span style="font-size:14px">${c.visible ? '👁' : '·'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${alwaysIcon}${scopeIcon} ${c.name || 'Nomsiz'}</div>
        <div style="font-size:8px;color:${c.alwaysVisible?'#ffaa44':(c.triggerKey?'var(--accent4)':'var(--border)')}">${c.alwaysVisible ? 'doimiy ko\'rinadi' : (c.triggerKey ? '⌨ ' + _cvKeyLabel(c.triggerKey) : '⌨ tugma yo\'q')}</div>
      </div>
      <button data-del="${idx}" title="O'chirish" style="background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);color:#ff4444;width:22px;height:22px;border-radius:3px;cursor:pointer;font-size:10px;flex-shrink:0">✕</button>
    `;
    row.querySelector('[data-del]').onclick = (e) => {
      e.stopPropagation();
      if (window._canvases[idx].visible) _hideCanvas(window._canvases[idx]);
      window._canvases.splice(idx, 1);
      _cvRenderSidebar();
      document.getElementById('cv-main').innerHTML = `<div style="color:var(--border);font-size:11px;text-align:center;margin-top:80px">← Chapdan canvas tanlang yoki yangisini yarating</div>`;
    };
    sidebar.appendChild(row);
  });
}

function _cvRenderEditor(c) {
  const main = document.getElementById('cv-main');
  if (!main) return;

  main.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <input id="cv-name" value="${c.name||''}" placeholder="Canvas nomi"
        style="flex:1;background:#0a0e18;border:1px solid #1a2535;color:var(--text);padding:7px 10px;border-radius:4px;font-family:inherit;font-size:12px;outline:none">
      <button id="cv-toggle" style="padding:7px 14px;border-radius:4px;border:1px solid ${c.visible?'#ff4444':'var(--accent3)'};background:${c.visible?'rgba(255,68,68,.1)':'rgba(var(--accent3-rgb),.1)'};color:${c.visible?'#ff4444':'var(--accent3)'};cursor:pointer;font-family:inherit;font-size:11px">${c.visible?'■ To\'xtatish':'▶ Ko\'rsatish'}</button>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:9px 12px;background:rgba(255,170,68,.05);border:1px solid rgba(255,170,68,.25);border-radius:5px">
      <input type="checkbox" id="cv-always" ${c.alwaysVisible?'checked':''} style="width:16px;height:16px;cursor:pointer;accent-color:#ffaa44">
      <div style="flex:1">
        <div style="font-size:10px;color:#ffaa44;letter-spacing:1px">⭐ Doimiy ko'rinib tursin</div>
        <div style="font-size:8px;color:var(--border);margin-top:2px;line-height:1.5">Tugmasiz, o'yin davomida tanlangan rejimda doimo ekranda turadi (karta, sog'liq shkalasi, va h.k.)</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:5px">⌨ TRIGGER TUGMA</div>
        <div style="display:flex;gap:6px">
          <input id="cv-trigger" value="${c.triggerKey||''}" readonly placeholder="bosing va tugma..."
            style="flex:1;background:#0a0e18;border:1px solid #1a2535;color:var(--accent4);padding:7px 10px;border-radius:4px;font-family:inherit;font-size:11px;outline:none">
          <button id="cv-trigger-catch" style="background:rgba(var(--accent4-rgb),.1);border:1px solid rgba(var(--accent4-rgb),.3);color:var(--accent4);padding:6px 10px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:10px;white-space:nowrap">🎯 Tutish</button>
        </div>
      </div>

      <div>
        <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:5px">📍 BURCHAK / JOY</div>
        <select id="cv-corner" style="width:100%;background:#0a0e18;border:1px solid #1a2535;color:var(--text);padding:7px 10px;border-radius:4px;font-family:inherit;font-size:11px;outline:none">
          ${CV_CORNERS.map(([v, lbl]) => `<option value="${v}" ${c.corner===v?'selected':''}>${lbl}</option>`).join('')}
        </select>
      </div>

      <div>
        <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:5px">⚡ REJIM</div>
        <select id="cv-mode" style="width:100%;background:#0a0e18;border:1px solid #1a2535;color:var(--text);padding:7px 10px;border-radius:4px;font-family:inherit;font-size:11px;outline:none">
          <option value="hold"   ${(c.mode||'hold')==='hold'  ?'selected':''}>👇 Bosib turish (hold)</option>
          <option value="toggle" ${(c.mode||'hold')==='toggle'?'selected':''}>🔁 Bosib o'chirish (toggle)</option>
        </select>
      </div>

      <div>
        <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:5px">🎯 QACHON KO'RSATILSIN</div>
        <select id="cv-scope" style="width:100%;background:#0a0e18;border:1px solid #1a2535;color:var(--text);padding:7px 10px;border-radius:4px;font-family:inherit;font-size:11px;outline:none">
          <option value="player" ${(c.scope||'player')==='player'?'selected':''}>👤 Oyinchi rejimida</option>
          <option value="car"    ${(c.scope||'player')==='car'   ?'selected':''}>🚗 Mashinada bo'lganda</option>
          <option value="both"   ${(c.scope||'player')==='both'  ?'selected':''}>🌐 Ikkalasida ham</option>
        </select>
      </div>

      <div>
        <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:5px">📏 KENGLIK (px)</div>
        <input id="cv-w" type="number" value="${c.width||280}" min="50" max="2000"
          style="width:100%;background:#0a0e18;border:1px solid #1a2535;color:var(--text);padding:7px 10px;border-radius:4px;font-family:inherit;font-size:11px;outline:none">
      </div>

      <div>
        <div style="font-size:9px;color:var(--border);letter-spacing:1.5px;margin-bottom:5px">📐 BALANDLIK (px)</div>
        <input id="cv-h" type="number" value="${c.height||180}" min="30" max="2000"
          style="width:100%;background:#0a0e18;border:1px solid #1a2535;color:var(--text);padding:7px 10px;border-radius:4px;font-family:inherit;font-size:11px;outline:none">
      </div>
    </div>

    ${_cvTokenList()}

    <div style="display:grid;grid-template-rows:1fr 1fr 1.4fr;gap:8px;height:380px">
      ${_cvCodeBox('cv-html', 'HTML', c.html||'', 'var(--accent)')}
      ${_cvCodeBox('cv-css',  'CSS',  c.css||'',  '#ffaa44')}
      ${_cvCodeBox('cv-js',   'JS',   c.js||'',   'var(--accent3)')}
    </div>

    <div style="margin-top:10px;padding:8px 12px;background:rgba(var(--accent-rgb),.03);border:1px solid rgba(var(--accent-rgb),.15);border-radius:5px;font-size:9px;color:var(--border);line-height:1.6">
      💡 JS funksiyangizga <span style="color:var(--accent)">root</span> (canvas DOM elementi) va <span style="color:var(--accent)">canvas</span> (sozlamalar) uzatiladi.
      Cleanup uchun <span style="color:var(--accent3)">return () =&gt; { ... }</span> qaytaring.
      CSS avtomatik scoped — boshqa elementlarga ta'sir qilmaydi.
    </div>
  `;

  const inp = id => document.getElementById(id);
  const save = () => {
    c.name          = inp('cv-name').value || 'Nomsiz';
    c.corner        = inp('cv-corner').value;
    c.mode          = inp('cv-mode').value;
    c.scope         = inp('cv-scope').value;
    c.alwaysVisible = inp('cv-always').checked;
    c.width         = parseInt(inp('cv-w').value) || 280;
    c.height        = parseInt(inp('cv-h').value) || 180;
    c.html          = inp('cv-html').value;
    c.css           = inp('cv-css').value;
    c.js            = inp('cv-js').value;
    if (c.visible) window._renderCanvasOverlay(c); // jonli yangilash
    _refreshAlwaysVisible(); // doimiy canvas'larni qayta hisoblash
    _cvRenderSidebar();
  };

  ['cv-name','cv-w','cv-h'].forEach(id => inp(id).oninput = save);
  inp('cv-corner').onchange = save;
  inp('cv-mode').onchange = save;
  inp('cv-scope').onchange = save;
  inp('cv-always').onchange = save;
  ['cv-html','cv-css','cv-js'].forEach(id => inp(id).oninput = save);

  // Trigger tutish
  inp('cv-trigger-catch').onclick = () => {
    const tInp = inp('cv-trigger');
    const btn = inp('cv-trigger-catch');
    tInp.value = '[ bosing... ]'; tInp.style.color = '#ffaa44';
    btn.textContent = '⏳';
    const h = e => {
      e.preventDefault(); e.stopImmediatePropagation();
      document.removeEventListener('keydown', h, { capture: true });
      btn.textContent = '🎯 Tutish'; tInp.style.color = 'var(--accent4)';
      if (e.code === 'Escape') { tInp.value = c.triggerKey || ''; return; }
      c.triggerKey = e.code;
      tInp.value = e.code;
      _cvRenderSidebar();
    };
    document.addEventListener('keydown', h, { capture: true });
  };

  // Ko'rsatish/to'xtatish
  inp('cv-toggle').onclick = () => {
    save();
    _toggleCanvas(c);
    _cvRenderSidebar();
    _cvRenderEditor(c);
  };
}

function _cvCodeBox(id, label, value, color) {
  return `
    <div style="display:flex;flex-direction:column;border:1px solid #1a2535;border-radius:5px;overflow:hidden">
      <div style="padding:5px 10px;background:rgba(0,0,0,.3);font-size:9px;color:${color};letter-spacing:1.5px;border-bottom:1px solid #1a2535">${label}</div>
      <textarea id="${id}" spellcheck="false" style="flex:1;border:0;background:#050810;color:var(--text);font-family:'Share Tech Mono',monospace;font-size:11px;padding:8px 10px;outline:none;resize:none;line-height:1.5">${value.replace(/</g,'&lt;')}</textarea>
    </div>
  `;
}
