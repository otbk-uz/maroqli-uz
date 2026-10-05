// ============================================================
// TUGMA BIRIKTIRISHLAR (Keybinding) helpers
// ============================================================
function _keyLabel(code) {
  if (!code) return '---';
  const map = {
    'KeyW':'W','KeyA':'A','KeyS':'S','KeyD':'D','KeyQ':'Q','KeyE':'E',
    'KeyR':'R','KeyF':'F','KeyG':'G','KeyH':'H','KeyI':'I','KeyJ':'J',
    'KeyK':'K','KeyL':'L','KeyZ':'Z','KeyX':'X','KeyC':'C','KeyV':'V',
    'KeyB':'B','KeyN':'N','KeyM':'M','KeyP':'P','KeyO':'O','KeyT':'T',
    'KeyU':'U','KeyY':'Y',
    'Space':'SPACE','ShiftLeft':'SHIFT L','ShiftRight':'SHIFT R',
    'ControlLeft':'CTRL L','ControlRight':'CTRL R',
    'AltLeft':'ALT L','AltRight':'ALT R',
    'ArrowUp':'↑','ArrowDown':'↓','ArrowLeft':'←','ArrowRight':'→',
    'Digit1':'1','Digit2':'2','Digit3':'3','Digit4':'4','Digit5':'5',
    'Digit6':'6','Digit7':'7','Digit8':'8','Digit9':'9','Digit0':'0',
    'Enter':'ENTER','Backspace':'BKSP','Tab':'TAB','Escape':'ESC',
    'CapsLock':'CAPS',
  };
  return map[code] || code.replace('Key','').replace('Digit','');
}

function _buildMiniKeyboard() {
  const boundCodes = new Set(Object.values(playerSettings.keys));
  const rows = [
    ['Escape','','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'],
    ['Tab','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP'],
    ['CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Enter'],
    ['ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','ShiftRight'],
    ['ControlLeft','AltLeft','Space','AltRight','ArrowLeft','ArrowDown','ArrowUp','ArrowRight'],
  ];
  const labels = {
    'Escape':'Esc','Tab':'Tab','CapsLock':'Caps','ShiftLeft':'Shift','ShiftRight':'Shift',
    'ControlLeft':'Ctrl','AltLeft':'Alt','AltRight':'Alt','Enter':'↵','Space':'SPACE',
    'ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓',
    'Digit1':'1','Digit2':'2','Digit3':'3','Digit4':'4','Digit5':'5',
    'Digit6':'6','Digit7':'7','Digit8':'8','Digit9':'9','Digit0':'0',
  };
  const actionColors = {
    forward:'var(--accent)',backward:'var(--accent)',left:'var(--accent)',right:'var(--accent)',
    jump:'var(--accent3)',sprint:'#ffaa44',camToggle:'var(--accent4)',
  };
  const codeToAction = {};
  Object.entries(playerSettings.keys).forEach(([a,c]) => { codeToAction[c] = a; });

  // Mini klaviatura endi kliklanadi - hint ko'rsatamiz
  let html = '<div style="font-family:Share Tech Mono,monospace;font-size:7px;line-height:1;position:relative">';
  rows.forEach(row => {
    html += '<div style="display:flex;gap:2px;margin-bottom:2px;justify-content:center">';
    row.forEach(code => {
      if (!code) { html += '<div style="width:6px"></div>'; return; }
      const lbl = labels[code] || code.replace('Key','').replace('Digit','');
      const isWide = ['Space','ShiftLeft','ShiftRight','CapsLock','Enter','Tab','CapsLock','ControlLeft','AltLeft','AltRight'].includes(code);
      const action = codeToAction[code];
      const animData = (window._kbAnimations||{})[code]||{};
      const hasAnim = !!animData.animName;
      const hasAlt = !!animData.altKey;
      const isBlocked = !!animData.blocked;
      const color = action ? (actionColors[action]||'var(--accent)') : null;

      let style = `padding:2px ${isWide?'6px':'3px'};min-width:${isWide?'auto':'14px'};`;
      if (action) {
        style += `background:rgba(0,0,0,.6);border:1px solid ${color};color:${color};box-shadow:0 0 5px ${color}44;font-weight:700;`;
      } else if (hasAnim) {
        style += `background:rgba(255,170,68,.08);border:1px solid rgba(255,170,68,.4);color:#ffaa44;`;
      } else if (isBlocked) {
        style += `background:rgba(255,68,68,.06);border:1px dashed rgba(255,68,68,.3);color:#ff444455;`;
      } else {
        style += `background:rgba(255,255,255,.04);border:1px solid #2a3040;color:#445;`;
      }
      style += 'border-radius:2px;text-align:center;position:relative;';

      const dots = (hasAlt?'<span style="position:absolute;top:1px;right:1px;width:3px;height:3px;border-radius:50%;background:var(--accent4)"></span>':'') +
                   (hasAnim?'<span style="position:absolute;top:1px;left:1px;width:3px;height:3px;border-radius:50%;background:#ffaa44"></span>':'');
      html += `<div style="${style}">${lbl}${dots}</div>`;
    });
    html += '</div>';
  });
  html += '<div style="text-align:center;margin-top:3px;font-size:7px;color:rgba(var(--accent-rgb),.3);letter-spacing:1px">▶ BOSIB KATTALASHTIRISH</div>';
  html += '</div>';
  return html;
}

window.startRebind = function(action) {
  if (playerSettings._rebinding === action) {
    playerSettings._rebinding = null;
    updateInspector();
    return;
  }
  playerSettings._rebinding = action;
  updateInspector();
  const handler = e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.code === 'Escape') {
      playerSettings._rebinding = null;
      updateInspector();
      document.removeEventListener('keydown', handler, { capture: true });
      return;
    }
    playerSettings.keys[action] = e.code;
    playerSettings._rebinding = null;
    document.removeEventListener('keydown', handler, { capture: true });
    updateInspector();
    log(`⌨ ${action} → ${_keyLabel(e.code)}`, 'lok');
  };
  document.addEventListener('keydown', handler, { capture: true });
};

// ============================================================
// GLOBAL STATE
// ============================================================
window._kbAnimations = window._kbAnimations || {};
// ============================================================
//  🚫 BLOKLANGAN KLAVISHNI MAJBURLASH
// ------------------------------------------------------------
//  ⚠ Hodisani to'xtatish YETARLI EMAS (yuqoridagi izohga qarang).
//    Bu funksiya klavishning HOLATINI tozalaydi — so'rov bilan
//    ishlaydigan tizimlar uchun yagona ishonchli yo'l.
// ============================================================
//  ⚠ HARAKAT TUGMALARI — endi ISTISNO EMAS, faqat OGOHLANTIRISH
//    uchun. Ilgari ular bloklashdan butunlay chiqarib qo'yilgan edi:
//    \"o'yinchi qimirlay olmay qolsa buni xato deb o'ylardi\".
//
//    Amalda bu boshqa chalkashlik tug'dirdi. Dizayner 🚫 katagini
//    W uchun belgilaydi — va u ISHLAMAYDI. Konsolda esa W ning
//    🔢 son amali ishlab turadi (`[Slot 1] 0 → 10 (= W)`).
//    \"Bloklandi, lekin ishlayapti\" — aynan shu holat.
//
//    To'g'ri qaror: dizayner nima so'rasa, o'sha bo'lsin. Lekin
//    HARAKAT tugmasi bloklanganda bir marta jurnalga yoziladi —
//    kutilmagan holat bo'lsa sabab darrov ko'rinadi.
const _KB_MOVE = ['Space','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight',
                  'ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyV'];
const _kbMoveWarned = {};
let _kbWasPlaying = false;

function _kbClearKey(code) {
  try { if (window.fpsKeys) window.fpsKeys[code] = false; } catch (e) {}
  try { if (window.PlayerController && window.PlayerController.keys)
          window.PlayerController.keys[code] = false; } catch (e) {}
  try { if (window._physKeys && window._physKeys.delete) window._physKeys.delete(code); } catch (e) {}
}

/**
 * Har kadr chaqiriladi (main-loop). Bloklangan klavishlar bosilgan
 * bo'lib qolmasin.
 * ⚠ NEGA HAR KADR: klavish bloklanishidan OLDIN bosilgan bo'lishi
 *   mumkin (🎛 AllKey zonasiga W bosib turib kirish). U holda
 *   `keydown` allaqachon o'tib ketgan va faqat majburlash qutqaradi.
 */
window._kbEnforceBlocks = function () {
  const anims = window._kbAnimations;
  if (!anims) return;
  // ============================================================
  //  ⚠ OGOHLANTIRISH — HAR SINOVDA BIR MARTA
  // ------------------------------------------------------------
  //  ⚠ XATO BOR EDI: shart `!isPlaying` edi, ya'ni HAR KADR
  //    tozalanardi — muharrirda `isPlaying` doim `false`. Natijada
  //    ogohlantirish tozalanib, qayta yozilib, yana tozalanib…
  //    konsol bir soniyada o'nlab bir xil qator bilan to'lib ketardi
  //    (foydalanuvchi skrinshoti).
  //
  //  To'g'risi — faqat ▶/⏹ O'TISHIDA tozalash. Va ogohlantirish
  //  faqat ▶ Play da beriladi: muharrirda o'yinchi yurmaydi, ya'ni
  //  ogohlantirishning ma'nosi yo'q.
  const _pl = (typeof isPlaying !== 'undefined' && isPlaying);
  if (_pl !== _kbWasPlaying) {
    _kbWasPlaying = _pl;
    for (const k in _kbMoveWarned) delete _kbMoveWarned[k];
  }
  for (const code in anims) {
    const a = anims[code];
    if (!a || !a.blocked) continue;
    //  ⚠ Harakat tugmasi ham BLOKLANADI — lekin bir marta aytamiz.
    //    ⚠ Faqat ▶ Play da: muharrirda o'yinchi yurmaydi.
    if (_pl && _KB_MOVE.indexOf(code) >= 0 && !_kbMoveWarned[code]) {
      _kbMoveWarned[code] = 1;
      try {
        log(`⚠ 🚫 "${String(code).replace(/^Key/, '')}" — HARAKAT tugmasi bloklandi. ` +
            "O'yinchi bu tomonga yura olmaydi.", 'lw');
      } catch (e) {}
    }
    _kbClearKey(code);
  }
};
 // { KeyCode: { animName, altKey, blocked } }
window._kbCombos = window._kbCombos || [];  // [{ keys:['KeyW','ShiftLeft'], animName, animJson?, animFile? }, ...]
window._activeCombos = window._activeCombos || new Set();
window._afkAnims = window._afkAnims || [];  // [{ animName, timer, animJson? }, ...]
window._idleTime = 0;
window._mouseAnimEvents = window._mouseAnimEvents || {
  click:'', dblclick:'', presshold:'', wheelup:'', wheeldown:'',
  dirUp:'', dirDown:'', dirLeft:'', dirRight:''
};

// ============================================================
// KATTA KLAVIATURA MODAL
// ============================================================
window.openBigKeyboard = function() {
  if (document.getElementById('bkm-overlay')) {
    document.getElementById('bkm-overlay').remove();
    return;
  }

  // CSS inject
  if (!document.getElementById('bkm-style')) {
    const s = document.createElement('style');
    s.id = 'bkm-style';
    s.textContent = `
      #bkm-overlay { position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px); }
      @keyframes bkmIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
      @keyframes bkmKeyPress { 0%{transform:scale(1)} 35%{transform:scale(.84);filter:brightness(2)} 100%{transform:scale(1)} }
      #bkm-panel { background:#0b1020;border:1px solid rgba(var(--accent-rgb),.2);border-radius:12px;padding:20px 22px 18px;width:720px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 0 80px rgba(var(--accent-rgb),.1);animation:bkmIn .2s ease;font-family:'Share Tech Mono',monospace;color:var(--text); }
      .bkm-key { display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 8px;background:rgba(255,255,255,.04);border:1px solid #232d3f;border-radius:5px;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--border);cursor:pointer;transition:all .12s;position:relative;user-select:none;box-sizing:border-box; }
      .bkm-key:hover { border-color:rgba(var(--accent-rgb),.4);color:var(--accent)88; }
      .bkm-key.is-action { font-weight:700; }
      .bkm-key.is-anim { border-color:rgba(255,170,68,.5);color:#ffaa44;background:rgba(255,170,68,.06); }
      .bkm-key.is-blocked { opacity:.35;border-style:dashed; }
      .bkm-key.is-alt { border-bottom:2px solid var(--accent4)44; }
      .bkm-key.pressing { animation:bkmKeyPress .2s ease; }
      .bkm-kdot { position:absolute;width:4px;height:4px;border-radius:50%; }
      .bkm-tab { padding:5px 14px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;border:1px solid #232d3f;background:none;color:var(--border);transition:all .15s; }
      .bkm-tab.on { border-color:var(--accent);color:var(--accent);background:rgba(var(--accent-rgb),.08); }
      .bkm-inp { width:100%;background:#080d18;border:1px solid #232d3f;color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:5px 8px;border-radius:4px;outline:none;box-sizing:border-box; }
      .bkm-inp:focus { border-color:var(--accent)55; }
      .bkm-btn { padding:5px 12px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;border:1px solid;transition:all .12s; }
      #bkm-popup { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100001;background:#0b1020;border:1px solid rgba(var(--accent-rgb),.3);border-radius:8px;padding:18px 20px;min-width:300px;box-shadow:0 0 50px rgba(var(--accent-rgb),.15);animation:bkmIn .15s ease; }
    `;
    document.head.appendChild(s);
  }

  const overlay = document.createElement('div');
  overlay.id = 'bkm-overlay';

  const panel = document.createElement('div');
  panel.id = 'bkm-panel';

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  //  ⚠ Yopilganda nishon TOZALANADI. Aks holda keyingi safar
  //    muharrir global sozlama o'rniga o'sha zonani tahrirlashda
  //    davom etardi — dizayner buni sezmasdi va global sozlamani
  //    o'zgartirmoqchi bo'lib zonani buzardi.
  overlay.addEventListener('mousedown', e => {
    if (e.target === overlay) { window._kbEditTarget = null; overlay.remove(); }
  });

  _bkmRender(panel, 0);
};

function _bkmRender(panel, tab) {
  panel.innerHTML = '';

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px';
  hdr.innerHTML = `
    <div>
      <div style="font-size:13px;font-weight:700;color:var(--accent);letter-spacing:2px">
        ⌨ KLAVIATURA MUHARRIRI${_kbTargetName()
          ? `<span style="color:#9b86ff;font-size:10px;letter-spacing:1px;margin-left:8px">
               ${_kbTargetKind() === 'car' ? '🚗' : '🎛'} ${_kbTargetName()}</span>` : ''}</div>
      ${_kbProfileBar()}
      ${_kbTargetName() ? `
        <div style="font-size:9px;color:#9b86ff;line-height:1.6;margin-top:3px;
          background:rgba(122,92,255,.08);border:1px solid rgba(122,92,255,.25);
          border-radius:3px;padding:5px 7px">
          ${_kbTargetKind() === 'car'
            ? `⚠ Siz 🚗 <b>mashina profilini</b> tahrirlayapsiz — global emas.
               Bu yerda qo'yilganlar FAQAT o'yinchi SHU mashinada o'tirganda
               ishlaydi va tushganda piyodalik sozlamasiga qaytadi.
               <b>Har mashina o'ziniki</b> — boshqa mashinalar o'zgarmaydi.`
            : `⚠ Siz 🎛 <b>zona sozlamasini</b> tahrirlayapsiz — global emas.
               Bu yerda qo'yilganlar FAQAT o'yinchi shu zonaga kirganda ishlaydi
               va chiqishda o'z holiga qaytadi.`}
        </div>` : ''}
      <div style="font-size:8px;color:var(--border);margin-top:2px">Klavishga bosing → animatsiya / alt-tugma / bloklash</div>
    </div>
    <button onclick="window._kbEditTarget=null;document.getElementById('bkm-overlay').remove()" style="background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);color:#ff4444;border-radius:4px;padding:4px 12px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:12px">✕</button>
  `;
  panel.appendChild(hdr);

  // Tabs
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:6px;margin-bottom:16px';
  [['⌨ Klavishlar',0],['🖱 Sichqoncha',1]].forEach(([lbl,i]) => {
    const b = document.createElement('button');
    b.className = 'bkm-tab' + (tab===i?' on':'');
    b.textContent = lbl;
    b.onclick = () => _bkmRender(panel, i);
    tabBar.appendChild(b);
  });
  panel.appendChild(tabBar);

  if (tab === 0) {
    _bkmRenderKeys(panel);
  } else {
    _bkmRenderMouse(panel);
  }
}

function _bkmRenderKeys(panel) {
  const rows = [
    ['Escape','','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Backspace'],
    ['Tab','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP'],
    ['CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Enter'],
    ['ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','ShiftRight'],
    ['ControlLeft','AltLeft','Space','AltRight','ArrowLeft','ArrowDown','ArrowUp','ArrowRight'],
  ];
  const labels = {
    'Escape':'Esc','Tab':'Tab','CapsLock':'Caps','ShiftLeft':'Shift L','ShiftRight':'Shift R',
    'ControlLeft':'Ctrl','AltLeft':'Alt','AltRight':'Alt','Enter':'↵','Space':'SPACE','Backspace':'⌫',
    'ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓',
    'Digit1':'1','Digit2':'2','Digit3':'3','Digit4':'4','Digit5':'5',
    'Digit6':'6','Digit7':'7','Digit8':'8','Digit9':'9','Digit0':'0',
  };
  const wideKeys = new Set(['Space','ShiftLeft','ShiftRight','CapsLock','Enter','Tab','ControlLeft','AltLeft','AltRight','Backspace']);
  const actionColors = { forward:'var(--accent)',backward:'var(--accent)',left:'var(--accent)',right:'var(--accent)',jump:'var(--accent3)',sprint:'#ffaa44',camToggle:'var(--accent4)' };
  const codeToAction = {};
  Object.entries(playerSettings.keys).forEach(([a,c]) => { codeToAction[c] = a; });

  const kbWrap = document.createElement('div');
  kbWrap.style.cssText = 'display:flex;flex-direction:column;gap:5px;margin-bottom:14px';

  rows.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.style.cssText = 'display:flex;gap:4px;justify-content:center';
    row.forEach(code => {
      if (!code) { const sp=document.createElement('div');sp.style.width='12px';rowDiv.appendChild(sp);return; }
      const lbl = labels[code] || code.replace('Key','').replace('Digit','');
      const action = codeToAction[code];
      const anim = (_kbTable()[code]||{});
      const color = action ? (actionColors[action]||'var(--accent)') : null;
      const isWide = wideKeys.has(code);

      const key = document.createElement('div');
      key.className = 'bkm-key' +
        (action?' is-action':'') +
        (anim.animName&&!action?' is-anim':'') +
        (anim.blocked?' is-blocked':'') +
        (anim.altKey&&!action?' is-alt':'');
      if (isWide) key.style.minWidth = code==='Space'?'130px': code==='Backspace'||code==='ShiftLeft'||code==='ShiftRight'?'68px':'58px';
      if (color) { key.style.borderColor=color; key.style.color=color; key.style.background='rgba(0,0,0,.7)'; key.style.boxShadow=`0 0 6px ${color}44`; }
      key.textContent = lbl;

      // Dots
      if (anim.altKey) { const d=document.createElement('span');d.className='bkm-kdot';d.style.cssText='top:2px;right:2px;background:var(--accent4)';key.appendChild(d); }
      if (anim.animName) { const d=document.createElement('span');d.className='bkm-kdot';d.style.cssText='top:2px;left:2px;background:#ffaa44';key.appendChild(d); }
      //  🔢 Son amali biriktirilganini KO'RSATISH shart: aks holda
      //    dizayner qaysi klavishda amal borligini faqat har birini
      //    ochib ko'rib bilardi.
      const nsD = (window.KeyNoScript && window.KeyNoScript.get(code)) || null;
      if (nsD) { const d=document.createElement('span');d.className='bkm-kdot';d.style.cssText='bottom:2px;right:2px;background:var(--accent3)';key.appendChild(d); }

      key.title = `[${lbl}]${action?' → '+action:''}${anim.animName?' | 🎬'+anim.animName:''}${anim.altKey?' | Alt:'+_keyLabel(anim.altKey):''}${anim.blocked?' | 🚫BLOKLANGAN':''}${nsD?` | 🔢 ${nsD.op}${nsD.value} (${nsD.mode})`:''}`;

      key.onmousedown = () => { key.classList.add('pressing'); setTimeout(()=>key.classList.remove('pressing'),220); };
      key.onclick = () => _bkmOpenKeyPopup(code, lbl, action, () => { const p=document.getElementById('bkm-panel');if(p){const t=p._tab||0;_bkmRender(p,t);} });
      rowDiv.appendChild(key);
    });
    kbWrap.appendChild(rowDiv);
  });
  panel.appendChild(kbWrap);

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;font-size:8px;color:var(--border);border-top:1px solid #1a2535;padding-top:10px;margin-top:4px';
  legend.innerHTML = `<span style="color:var(--accent)">■ Harakat tugmasi</span><span style="color:#ffaa44">■ Animatsiyali</span><span style="color:var(--accent4)">■ Alternativ</span><span style="color:var(--accent3)">■ Sakrash</span><span>■ Bloklangan</span><span style="color:var(--accent3)">■ 🔢 Son amali</span>`;
  panel.appendChild(legend);

  // ── QO'SHMA KLAVISHLAR (kombo) ─────────────────────────────────
  _bkmRenderCombos(panel);

  // ── AFK ANIMATSIYALAR ─────────────────────────────────────────
  _bkmRenderAfk(panel);

  panel._tab = 0;
}

// ============================================================
// KOMBO PANELI — Big Keyboard ostida
// ============================================================
function _bkmRenderCombos(parent) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid #1a2535';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px';
  header.innerHTML = `
    <span style="font-size:10px;color:var(--accent3);letter-spacing:1.5px;font-family:'Share Tech Mono',monospace">🔗 QO'SHMA KLAVISHLAR</span>
    <button id="bkm-combo-add" class="bkm-btn" style="background:rgba(var(--accent3-rgb),.1);border:1px solid rgba(var(--accent3-rgb),.4);color:var(--accent3);font-size:10px;padding:4px 10px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace">➕ Qo'sh</button>
  `;
  wrap.appendChild(header);

  const list = document.createElement('div');
  list.id = 'bkm-combo-list';
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  wrap.appendChild(list);

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:8px;color:var(--border);margin-top:6px;line-height:1.5;font-family:"Share Tech Mono",monospace';
  hint.textContent = "Misol: W bosilsa anim_A, W+SHIFT bosilsa anim_B. Tugma chip'iga bossangiz qayta yozasiz.";
  wrap.appendChild(hint);

  parent.appendChild(wrap);

  const renderList = () => {
    list.innerHTML = '';
    window._kbCombos.forEach((combo, idx) => list.appendChild(_bkmBuildComboRow(combo, idx, renderList)));
  };
  renderList();

  document.getElementById('bkm-combo-add').onclick = () => {
    window._kbCombos.push({ keys: [], animName: '' });
    renderList();
  };
}

function _bkmBuildComboRow(combo, idx, refresh) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:5px;padding:6px 8px;background:rgba(var(--accent3-rgb),.04);border:1px solid rgba(var(--accent3-rgb),.18);border-radius:5px;flex-wrap:wrap';

  // Tugma chip'lari
  const keysWrap = document.createElement('div');
  keysWrap.style.cssText = 'display:flex;align-items:center;gap:3px;flex-wrap:wrap';

  const renderKeys = () => {
    keysWrap.innerHTML = '';
    combo.keys.forEach((code, ki) => {
      if (ki > 0) {
        const plus = document.createElement('span');
        plus.textContent = '+';
        plus.style.cssText = 'color:var(--accent3);font-size:11px;padding:0 2px;font-family:"Share Tech Mono",monospace';
        keysWrap.appendChild(plus);
      }
      const chip = document.createElement('button');
      chip.textContent = code ? _keyLabel(code) : '?';
      chip.title = code || 'Bosing — yangi tugma yozish';
      chip.style.cssText = 'background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.35);color:var(--accent);font-family:"Share Tech Mono",monospace;font-size:10px;padding:3px 8px;min-width:32px;border-radius:3px;cursor:pointer';
      chip.onclick = () => _catchKeyInto(chip, c => { combo.keys[ki] = c; renderKeys(); });
      // O'ng tugma — o'chirish
      chip.oncontextmenu = ev => { ev.preventDefault(); combo.keys.splice(ki, 1); renderKeys(); };
      keysWrap.appendChild(chip);
    });

    // + tugma qo'shish
    const addBtn = document.createElement('button');
    addBtn.textContent = '➕';
    addBtn.title = "Yana tugma qo'shish";
    addBtn.style.cssText = 'background:none;border:1px dashed rgba(var(--accent3-rgb),.4);color:var(--accent3);font-size:10px;width:24px;height:24px;border-radius:3px;cursor:pointer;margin-left:2px';
    addBtn.onclick = () => {
      combo.keys.push('');
      renderKeys();
      // Yangi chip avtomatik catch rejimida
      setTimeout(() => { const last = keysWrap.querySelectorAll('button'); if (last.length >= 2) last[last.length-2].click(); }, 30);
    };
    keysWrap.appendChild(addBtn);
  };
  renderKeys();
  row.appendChild(keysWrap);

  // Anim nomi inputi
  const animInp = document.createElement('input');
  animInp.type = 'text';
  animInp.placeholder = "anim nomi";
  animInp.value = combo.animName || '';
  animInp.className = 'bkm-inp';
  animInp.style.cssText = 'flex:1;min-width:90px;background:#0a0e18;border:1px solid #1a2535;color:var(--text);font-family:"Share Tech Mono",monospace;font-size:10px;padding:4px 7px;border-radius:3px;outline:none';
  animInp.oninput = () => { combo.animName = animInp.value.trim(); };
  row.appendChild(animInp);

  // 📁 JSON yuklash (ixtiyoriy)
  const fileLbl = document.createElement('label');
  fileLbl.title = "Animatsiya uchun JSON fayl";
  fileLbl.style.cssText = 'cursor:pointer;padding:4px 7px;border-radius:3px;background:rgba(255,170,68,.1);border:1px solid rgba(255,170,68,.3);color:#ffaa44;font-size:10px;font-family:"Share Tech Mono",monospace';
  fileLbl.textContent = combo.animJson ? '✅' : '📁';
  const fileInp = document.createElement('input');
  fileInp.type = 'file';
  fileInp.accept = '.json';
  fileInp.style.display = 'none';
  fileInp.onchange = () => {
    const f = fileInp.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        combo.animJson = JSON.parse(ev.target.result);
        if (!combo.animName) {
          combo.animName = f.name.replace(/\.\w+$/, '');
          animInp.value = combo.animName;
        }
        fileLbl.textContent = '✅';
        if (window.log) log(`📁 Kombo JSON yuklandi: ${f.name}`, 'lok');
      } catch (err) {
        if (window.log) log('⚠ JSON parse xatosi: ' + err.message, 'lw');
      }
    };
    reader.readAsText(f);
  };
  fileLbl.appendChild(fileInp);
  row.appendChild(fileLbl);

  // 🗑 O'chirish
  const del = document.createElement('button');
  del.textContent = '🗑';
  del.title = "Komboni o'chirish";
  del.style.cssText = 'background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.3);color:#ff4444;font-size:11px;width:26px;height:26px;border-radius:3px;cursor:pointer';
  del.onclick = () => { window._kbCombos.splice(idx, 1); refresh(); };
  row.appendChild(del);

  return row;
}

// ============================================================
// AFK PANEL — Big Keyboard ostida (kombo'dan keyin)
// ============================================================
function _bkmRenderAfk(parent) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid #1a2535';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px';
  header.innerHTML = `
    <span style="font-size:10px;color:#ffaa44;letter-spacing:1.5px;font-family:'Share Tech Mono',monospace">💤 AFK ANIMATSIYALAR</span>
    <button id="bkm-afk-add" class="bkm-btn" style="background:rgba(255,170,68,.1);border:1px solid rgba(255,170,68,.4);color:#ffaa44;font-size:10px;padding:4px 10px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace">➕ Qo'sh</button>
  `;
  wrap.appendChild(header);

  const list = document.createElement('div');
  list.id = 'bkm-afk-list';
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  wrap.appendChild(list);

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:8px;color:var(--border);margin-top:6px;line-height:1.5;font-family:"Share Tech Mono",monospace';
  hint.textContent = "Oyinchi / avto idle turganda N soniyadan keyin animatsiya o'ynaydi. Bir nechta bo'lishi mumkin — har biri o'z vaqtida.";
  wrap.appendChild(hint);

  parent.appendChild(wrap);

  const renderList = () => {
    list.innerHTML = '';
    window._afkAnims.forEach((afk, idx) => list.appendChild(_bkmBuildAfkRow(afk, idx, renderList)));
  };
  renderList();

  document.getElementById('bkm-afk-add').onclick = () => {
    window._afkAnims.push({ animName: '', timer: 5, mode: 'loop' });
    renderList();
  };
}

function _bkmBuildAfkRow(afk, idx, refresh) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:5px;padding:6px 8px;background:rgba(255,170,68,.04);border:1px solid rgba(255,170,68,.18);border-radius:5px;flex-wrap:wrap';

  // Loop / Bir toggle — timer'dan oldin
  const modeBtn = document.createElement('button');
  const renderMode = () => {
    const isLoop = (afk.mode || 'loop') === 'loop';
    modeBtn.textContent = isLoop ? '🔁 Loop' : '1️⃣ Bir';
    modeBtn.title = isLoop ? 'Doimiy takrorlanadi (bossangiz "Bir"ga o\'tadi)' : 'Bir marta o\'ynaydi (bossangiz "Loop"ga o\'tadi)';
    modeBtn.style.cssText = `
      background:${isLoop ? 'rgba(var(--accent3-rgb),.1)' : 'rgba(var(--accent4-rgb),.1)'};
      border:1px solid ${isLoop ? 'rgba(var(--accent3-rgb),.4)' : 'rgba(var(--accent4-rgb),.4)'};
      color:${isLoop ? 'var(--accent3)' : 'var(--accent4)'};
      font-family:'Share Tech Mono',monospace; font-size:9px; padding:3px 8px;
      border-radius:3px; cursor:pointer; min-width:60px; text-align:center
    `;
  };
  renderMode();
  modeBtn.onclick = () => {
    afk.mode = (afk.mode || 'loop') === 'loop' ? 'once' : 'loop';
    afk._played = false; // qayta tetiklash uchun reset
    if (typeof _stopKbAnim === 'function') _stopKbAnim('@afk:' + idx);
    renderMode();
  };
  row.appendChild(modeBtn);

  // Timer input (soniya)
  const timerWrap = document.createElement('div');
  timerWrap.style.cssText = 'display:flex;align-items:center;gap:4px';
  timerWrap.innerHTML = `
    <span style="font-size:10px;color:#ffaa44;font-family:'Share Tech Mono',monospace">⏱</span>
    <input type="number" min="0.5" max="3600" step="0.5" value="${afk.timer ?? 5}"
      style="width:60px;background:#0a0e18;border:1px solid rgba(255,170,68,.3);color:#ffaa44;font-family:'Share Tech Mono',monospace;font-size:10px;padding:3px 6px;border-radius:3px;outline:none;text-align:center">
    <span style="font-size:9px;color:var(--border)">s</span>
  `;
  const tInp = timerWrap.querySelector('input');
  tInp.oninput = () => { afk.timer = parseFloat(tInp.value) || 5; afk._played = false; };
  row.appendChild(timerWrap);

  // Anim nomi
  const animInp = document.createElement('input');
  animInp.type = 'text';
  animInp.placeholder = "anim nomi";
  animInp.value = afk.animName || '';
  animInp.style.cssText = 'flex:1;min-width:90px;background:#0a0e18;border:1px solid #1a2535;color:var(--text);font-family:"Share Tech Mono",monospace;font-size:10px;padding:4px 7px;border-radius:3px;outline:none';
  animInp.oninput = () => { afk.animName = animInp.value.trim(); afk._played = false; };
  row.appendChild(animInp);

  // 📁 JSON
  const fileLbl = document.createElement('label');
  fileLbl.title = "Animatsiya uchun JSON fayl";
  fileLbl.style.cssText = 'cursor:pointer;padding:4px 7px;border-radius:3px;background:rgba(255,170,68,.1);border:1px solid rgba(255,170,68,.3);color:#ffaa44;font-size:10px;font-family:"Share Tech Mono",monospace';
  fileLbl.textContent = afk.animJson ? '✅' : '📁';
  const fileInp = document.createElement('input');
  fileInp.type = 'file';
  fileInp.accept = '.json';
  fileInp.style.display = 'none';
  fileInp.onchange = () => {
    const f = fileInp.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        afk.animJson = JSON.parse(ev.target.result);
        if (!afk.animName) { afk.animName = f.name.replace(/\.\w+$/, ''); animInp.value = afk.animName; }
        fileLbl.textContent = '✅';
        if (window.log) log(`📁 AFK JSON yuklandi: ${f.name}`, 'lok');
      } catch (err) {
        if (window.log) log('⚠ JSON parse xatosi: ' + err.message, 'lw');
      }
    };
    reader.readAsText(f);
  };
  fileLbl.appendChild(fileInp);
  row.appendChild(fileLbl);

  // 🗑 O'chirish
  const del = document.createElement('button');
  del.textContent = '🗑';
  del.title = "AFK animatsiyani o'chirish";
  del.style.cssText = 'background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.3);color:#ff4444;font-size:11px;width:26px;height:26px;border-radius:3px;cursor:pointer';
  del.onclick = () => {
    if (afk._played) _stopKbAnim('@afk:' + idx);
    window._afkAnims.splice(idx, 1);
    refresh();
  };
  row.appendChild(del);

  return row;
}

// Chip'ga bosilganda — keyingi keydown'ni tutib olish va `onCaught` ga uzatish
function _catchKeyInto(chipEl, onCaught) {
  const origLbl = chipEl.textContent;
  const origBg  = chipEl.style.background;
  chipEl.textContent = '...';
  chipEl.style.background = 'rgba(255,170,68,.2)';
  chipEl.style.borderColor = '#ffaa44';
  chipEl.style.color = '#ffaa44';
  const h = e => {
    e.preventDefault(); e.stopImmediatePropagation();
    document.removeEventListener('keydown', h, { capture: true });
    chipEl.style.background = origBg;
    chipEl.style.borderColor = 'rgba(var(--accent-rgb),.35)';
    chipEl.style.color = 'var(--accent)';
    if (e.code === 'Escape') { chipEl.textContent = origLbl; return; }
    onCaught(e.code);
  };
  document.addEventListener('keydown', h, { capture: true });
}

function _bkmRenderMouse(panel) {
  panel._tab = 1;
  const ev = window._mouseAnimEvents;
  const mj = window._mouseAnimJsons = window._mouseAnimJsons || {};

  const d = document.createElement('div');
  d.innerHTML = `
    <div style="font-size:10px;color:var(--accent);margin-bottom:14px;letter-spacing:1px">🖱 SICHQONCHA HODISALARI</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${[
        ['click','🖱 Oddiy Click','1 marta bosish'],
        ['dblclick','👆 Double Click','2 marta tez bosish'],
        ['presshold','⏳ Bosib ushlab turish','500ms bosib turish'],
        ['wheelup','🔼 Yuqoriga','Scroll yuqoriga'],
        ['wheeldown','🔽 Pastga','Scroll pastga'],
      ].map(([id,lbl,desc])=>`
        <div style="background:rgba(255,255,255,.02);border:1px solid #1a2535;border-radius:6px;padding:10px">
          <div style="font-size:10px;color:var(--text);margin-bottom:3px">${lbl}</div>
          <div style="font-size:8px;color:var(--border);margin-bottom:8px">${desc}</div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 10px;border-radius:5px;background:${mj[id]?'rgba(var(--accent3-rgb),.08)':'rgba(255,170,68,.06)'};border:1px solid ${mj[id]?'rgba(var(--accent3-rgb),.3)':'rgba(255,170,68,.25)'};transition:all .15s">
            <span style="font-size:13px">${mj[id]?'✅':'📁'}</span>
            <span style="font-size:9px;color:${mj[id]?'var(--accent3)':'#ffaa44'};font-family:'Share Tech Mono',monospace">
              ${mj[id]?`<b>${ev[id]||'yuklandi'}</b>`:'Fayl yuklash'}
            </span>
            <input type="file" accept=".json" style="display:none" onchange="
              const f=this.files[0];if(!f)return;
              const nm=f.name.replace(/\\.\\w+$/,'');
              window._mouseAnimEvents['${id}']=nm;
              window._mouseAnimJsons=window._mouseAnimJsons||{};
              const r=new FileReader();
              r.onload=function(e){
                try{
                  window._mouseAnimJsons['${id}']=JSON.parse(e.target.result);
                  if(window.log)log('📁 Mouse anim yuklandi: '+nm+' → ${id}','lok');
                  const lbl=this.closest('label');
                  if(lbl){lbl.style.background='rgba(var(--accent3-rgb),.08)';lbl.style.borderColor='rgba(var(--accent3-rgb),.3)';lbl.querySelector('span:last-of-type').innerHTML='<b>'+nm+'</b>';lbl.querySelector('span:first-of-type').textContent='✅';}
                }catch(ex){if(window.log)log('⚠ JSON xato: '+ex.message,'lw');}
              }.bind(this);
              r.readAsText(f);
            ">
          </label>
          ${mj[id]?`<button onclick="delete window._mouseAnimJsons['${id}'];delete window._mouseAnimEvents['${id}'];_bkmRender(this.closest('#bkm-panel'),1)" style="margin-top:5px;width:100%;padding:3px;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.2);border-radius:4px;color:#ff4444;font-size:8px;cursor:pointer">✕ O'chirish</button>`:''}
        </div>
      `).join('')}
    </div>

    <div style="background:rgba(var(--accent-rgb),.03);border:1px solid rgba(var(--accent-rgb),.12);border-radius:8px;padding:14px;margin-bottom:12px">
      <div style="font-size:10px;color:var(--accent);margin-bottom:5px;letter-spacing:1px">🖱 SICHQONCHA YO'NALISH ANIMATSIYASI</div>
      <div style="font-size:8px;color:var(--border);margin-bottom:12px">Sichqoncha o'sha tomonga harakatlanса — animatsiya trigger bo'ladi</div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:auto auto auto;gap:6px;width:186px;margin:0 auto 12px">
        <div></div>
        ${(()=>{const id='dirUp',lbl='⬆',icon='🟦';const loaded=!!mj[id];return '<label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:'+(loaded?'rgba(var(--accent3-rgb),.1)':'rgba(255,255,255,.03)')+';border:1px solid '+(loaded?'rgba(var(--accent3-rgb),.4)':'rgba(var(--accent-rgb),.15)')+';gap:3px"><div style="font-size:18px">'+icon+'</div><div style="font-size:14px">'+lbl+'</div><div style="font-size:7px;color:'+(loaded?'var(--accent3)':'var(--border)')+'">'+(loaded?(ev[id]||'✓'):'fayl yoq')+'</div><input type=\'file\' accept=\'.json\' style=\'display:none\' onchange=\'const f=this.files[0];if(!f)return;const nm=f.name.replace(/\\.\\w+$/,"");window._mouseAnimEvents["'+id+'"]=nm;window._mouseAnimJsons=window._mouseAnimJsons||{};const r=new FileReader();r.onload=function(ev){try{window._mouseAnimJsons["'+id+'"]=JSON.parse(ev.target.result);if(window.log)log("📁 '+id+': "+nm,"lok");_bkmRender(document.getElementById("bkm-panel"),1);}catch(ex){}};r.readAsText(f);\'>'+( loaded ? '<button onclick=\'event.preventDefault();delete window._mouseAnimJsons["'+id+'"];delete window._mouseAnimEvents["'+id+'"];_bkmRender(document.getElementById("bkm-panel"),1)\' style=\'margin-top:3px;padding:2px 6px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:3px;color:#ff6666;font-size:7px;cursor:pointer\'>✕</button>' : '' )+'</label>';})()}
        <div></div>
        ${(()=>{const id='dirLeft',lbl='⬅',icon='🟦';const loaded=!!mj[id];return '<label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:'+(loaded?'rgba(var(--accent3-rgb),.1)':'rgba(255,255,255,.03)')+';border:1px solid '+(loaded?'rgba(var(--accent3-rgb),.4)':'rgba(var(--accent-rgb),.15)')+';gap:3px"><div style="font-size:18px">'+icon+'</div><div style="font-size:14px">'+lbl+'</div><div style="font-size:7px;color:'+(loaded?'var(--accent3)':'var(--border)')+'">'+(loaded?(ev[id]||'✓'):'fayl yoq')+'</div><input type=\'file\' accept=\'.json\' style=\'display:none\' onchange=\'const f=this.files[0];if(!f)return;const nm=f.name.replace(/\\.\\w+$/,"");window._mouseAnimEvents["'+id+'"]=nm;window._mouseAnimJsons=window._mouseAnimJsons||{};const r=new FileReader();r.onload=function(ev){try{window._mouseAnimJsons["'+id+'"]=JSON.parse(ev.target.result);if(window.log)log("📁 '+id+': "+nm,"lok");_bkmRender(document.getElementById("bkm-panel"),1);}catch(ex){}};r.readAsText(f);\'>'+( loaded ? '<button onclick=\'event.preventDefault();delete window._mouseAnimJsons["'+id+'"];delete window._mouseAnimEvents["'+id+'"];_bkmRender(document.getElementById("bkm-panel"),1)\' style=\'margin-top:3px;padding:2px 6px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:3px;color:#ff6666;font-size:7px;cursor:pointer\'>✕</button>' : '' )+'</label>';})()}
        <div style="display:flex;align-items:center;justify-content:center;font-size:20px;opacity:.4">🖱</div>
        ${(()=>{const id='dirRight',lbl='➡',icon='🟦';const loaded=!!mj[id];return '<label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:'+(loaded?'rgba(var(--accent3-rgb),.1)':'rgba(255,255,255,.03)')+';border:1px solid '+(loaded?'rgba(var(--accent3-rgb),.4)':'rgba(var(--accent-rgb),.15)')+';gap:3px"><div style="font-size:18px">'+icon+'</div><div style="font-size:14px">'+lbl+'</div><div style="font-size:7px;color:'+(loaded?'var(--accent3)':'var(--border)')+'">'+(loaded?(ev[id]||'✓'):'fayl yoq')+'</div><input type=\'file\' accept=\'.json\' style=\'display:none\' onchange=\'const f=this.files[0];if(!f)return;const nm=f.name.replace(/\\.\\w+$/,"");window._mouseAnimEvents["'+id+'"]=nm;window._mouseAnimJsons=window._mouseAnimJsons||{};const r=new FileReader();r.onload=function(ev){try{window._mouseAnimJsons["'+id+'"]=JSON.parse(ev.target.result);if(window.log)log("📁 '+id+': "+nm,"lok");_bkmRender(document.getElementById("bkm-panel"),1);}catch(ex){}};r.readAsText(f);\'>'+( loaded ? '<button onclick=\'event.preventDefault();delete window._mouseAnimJsons["'+id+'"];delete window._mouseAnimEvents["'+id+'"];_bkmRender(document.getElementById("bkm-panel"),1)\' style=\'margin-top:3px;padding:2px 6px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:3px;color:#ff6666;font-size:7px;cursor:pointer\'>✕</button>' : '' )+'</label>';})()}
        <div></div>
        ${(()=>{const id='dirDown',lbl='⬇',icon='🟦';const loaded=!!mj[id];return '<label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:'+(loaded?'rgba(var(--accent3-rgb),.1)':'rgba(255,255,255,.03)')+';border:1px solid '+(loaded?'rgba(var(--accent3-rgb),.4)':'rgba(var(--accent-rgb),.15)')+';gap:3px"><div style="font-size:18px">'+icon+'</div><div style="font-size:14px">'+lbl+'</div><div style="font-size:7px;color:'+(loaded?'var(--accent3)':'var(--border)')+'">'+(loaded?(ev[id]||'✓'):'fayl yoq')+'</div><input type=\'file\' accept=\'.json\' style=\'display:none\' onchange=\'const f=this.files[0];if(!f)return;const nm=f.name.replace(/\\.\\w+$/,"");window._mouseAnimEvents["'+id+'"]=nm;window._mouseAnimJsons=window._mouseAnimJsons||{};const r=new FileReader();r.onload=function(ev){try{window._mouseAnimJsons["'+id+'"]=JSON.parse(ev.target.result);if(window.log)log("📁 '+id+': "+nm,"lok");_bkmRender(document.getElementById("bkm-panel"),1);}catch(ex){}};r.readAsText(f);\'>'+( loaded ? '<button onclick=\'event.preventDefault();delete window._mouseAnimJsons["'+id+'"];delete window._mouseAnimEvents["'+id+'"];_bkmRender(document.getElementById("bkm-panel"),1)\' style=\'margin-top:3px;padding:2px 6px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:3px;color:#ff6666;font-size:7px;cursor:pointer\'>✕</button>' : '' )+'</label>';})()}
        <div></div>
      </div>

      ${(()=>{
        const dirs=['dirUp','dirDown','dirLeft','dirRight'];
        const loaded=dirs.filter(d=>mj[d]);
        if(!loaded.length) return '';
        const mm=window._mouseAnimModes=window._mouseAnimModes||{};
        return loaded.map(id=>{
          const m=mm[id]||{mode:'loop',time:3};
          const lbl={dirUp:'⬆ Tepaga',dirDown:'⬇ Pastga',dirLeft:'⬅ Chapga',dirRight:'➡ Ongga'}[id];
          const btnStyle=(active,color)=>'flex:1;padding:4px;border-radius:4px;font-size:8px;cursor:pointer;border:1px solid '+(active?color:'#1a2535')+';background:'+(active?'rgba('+{loop:'0,229,255',hold:'255,170,68',time:'204,136,255'}[m.mode]+',.15)':'rgba(255,255,255,.02)')+';color:'+(active?color:'#5a6a80');
          return '<div style="margin-bottom:6px;background:rgba(255,255,255,.02);border:1px solid #1a2535;border-radius:6px;padding:8px">'
            +'<div style="font-size:9px;color:var(--text);margin-bottom:5px">'+lbl+' — <b style=\'color:#ffaa44\'>'+(ev[id]||'')+'</b></div>'
            +'<div style="display:flex;gap:4px">'
            +'<button onclick=\'(window._mouseAnimModes=window._mouseAnimModes||{})["'+id+'"]={mode:"loop",time:((window._mouseAnimModes||{})["'+id+'"]||{}).time||3};_bkmRender(document.getElementById("bkm-panel"),1)\' style=\''+btnStyle(m.mode==="loop","var(--accent)")+'\'>🔄 Loop</button>'
            +'<button onclick=\'(window._mouseAnimModes=window._mouseAnimModes||{})["'+id+'"]={mode:"hold",time:((window._mouseAnimModes||{})["'+id+'"]||{}).time||3};_bkmRender(document.getElementById("bkm-panel"),1)\' style=\''+btnStyle(m.mode==="hold","#ffaa44")+'\'>⏸ Qotib</button>'
            +'<button onclick=\'(window._mouseAnimModes=window._mouseAnimModes||{})["'+id+'"]={mode:"time",time:((window._mouseAnimModes||{})["'+id+'"]||{}).time||3};_bkmRender(document.getElementById("bkm-panel"),1)\' style=\''+btnStyle(m.mode==="time","var(--accent4)")+'\'>⏱ Vaqt</button>'
            +'</div>'
            +(m.mode==='time'?'<div style="display:flex;align-items:center;gap:6px;margin-top:5px"><span style="font-size:8px;color:var(--text)">Sekund:</span><input type="number" min="0.1" max="60" step="0.1" value="'+(m.time||3)+'" onchange=\'(window._mouseAnimModes=window._mouseAnimModes||{})["'+id+'"]={mode:"time",time:+this.value}\' style=\'width:50px;padding:3px;background:#0a0e16;border:1px solid #1a2535;border-radius:4px;color:var(--text);font-size:9px\'></div>':'')
            +'</div>';
        }).join('');
      })()}
    </div>
    <div style="font-size:8px;color:var(--border);line-height:1.7">
      💡 📁 tugmasini bosib JSON animatsiya faylini yuklang<br>
      ✅ — fayl yuklangan, hodisa ishga tushganda animatsiya boshlanadi
    </div>
  `;
  panel.appendChild(d);
}

// ============================================================
//  🎯 TAHRIRLASH NISHONI — global sozlama yoki 🎛 AllKey zonasi
// ------------------------------------------------------------
//  ⚠ NEGA SHUNDAY: 🎛 AllKey o'ziga ALOHIDA menyu yasagan edi —
//    dizayner uchun IKKI xil interfeys: biri klaviatura muharriri,
//    ikkinchisi zona paneli. Ikkalasi bir xil narsani boshqarardi
//    (klavish → animatsiya / ovoz / bloklash), lekin boshqacha
//    ko'rinardi va zona menyusi kamroq imkoniyat berardi.
//
//  Endi YAGONA muharrir. `_kbEditTarget` faqat NIMANI tahrirlashni
//  almashtiradi:
//      null       → global sozlama (`window._kbAnimations`)
//      <zona>     → o'sha zonaning ustma-ust qoidalari
//
//  Dizayner uchun bitta tanish oyna; standart sozlama o'yinchiga
//  beriladi, o'zgartirish kerak bo'lsa 🎛 AllKey.
// ============================================================
window._kbEditTarget = null;

/** Tahrirlanayotgan klavish jadvali. */
function _kbTable() {
  const z = window._kbEditTarget;
  if (z && z.userData) {
    if (!z.userData.keys) z.userData.keys = {};
    return z.userData.keys;
  }
  if (!window._kbAnimations) window._kbAnimations = {};
  return window._kbAnimations;
}

/** Nishon nomi — oyna sarlavhasida ko'rsatiladi. */
function _kbTargetName() {
  const z = window._kbEditTarget;
  return (z && z.userData && z.userData.name) || '';
}

/**
 * Nishon TURI — sarlavhada nima yozilishini belgilaydi.
 * ⚠ 🎛 Zona va 🚗 mashina bir xil `_kbEditTarget` mexanizmidan
 *   foydalanadi (ikkalasi ham `ud.keys` / `ud.sounds` ga yozadi),
 *   lekin dizaynerga ULAR BOSHQACHA tuyuladi: biri hududda
 *   ishlaydi, ikkinchisi mashinada o'tirganda. Sarlavha buni
 *   ochiq aytmasa \"nega bu yerda o'zgartirganim u yerda ham
 *   ko'rindi?\" degan savol tug'ilardi.
 */
// ============================================================
//  🧍🚗 PROFIL ALMASHTIRGICH — muharrirning O'ZIDA
// ------------------------------------------------------------
//  ⚠ MUAMMO (foydalanuvchi topgan): dizayner 🚗 mashina
//    inspektoridagi tugmadan muharrirni ochadi, sozlaydi, yopadi.
//    Keyin uni QAYTA ochish uchun tepa menyudagi ⌨ tugmasini
//    bosadi — va o'sha paytda nishon YO'Q, ya'ni GLOBAL sozlama
//    tahrirlanadi. Panelda o'yinchining ovozi ko'rinadi va dizayner
//    \"nega mashina sozlamam yo'qolgan?\" deb o'ylaydi.
//
//    Aslida hech nima yo'qolmagan — u boshqa profilga qarab turibdi.
//
//  ⚠ YECHIM: qaysi profil ochiqligi HAR DOIM ko'rinib tursin va
//    bir bosishda almashsin. Dizayner qaysi tugmadan ochganini
//    eslab qolishi shart emas.
// ============================================================
function _kbCarList() {
  try {
    return (typeof objects !== 'undefined' ? objects : []).filter(o =>
      o && o.userData && (o.userData.entityType === 'car' ||
                          o.userData._entityMode === 'vehicle'));
  } catch (e) { return []; }
}

function _kbProfileBar() {
  const cars = _kbCarList();
  //  ⚠ Mashina yo'q bo'lsa chiziq umuman chizilmaydi — bo'sh
  //    \"Piyoda\" tugmasi faqat joy egallardi.
  if (!cars.length) return '';
  const cur = window._kbEditTarget;
  const btn = (on, onclick, label) => `<button onclick="${onclick}"
    style="padding:4px 11px;border-radius:4px;cursor:pointer;font-size:10px;
    font-family:'Share Tech Mono',monospace;font-weight:700;
    border:1px solid ${on ? '#9b86ff' : 'var(--border)'};
    background:${on ? 'rgba(122,92,255,.16)' : 'transparent'};
    color:${on ? '#9b86ff' : 'var(--muted)'}">${label}</button>`;
  const esc = (x) => String(x == null ? '' : x).replace(/[<>&"]/g, '');
  return `
    <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:6px">
      <span style="font-size:9px;color:var(--border);font-family:'Share Tech Mono',monospace">PROFIL:</span>
      ${btn(!cur, 'window._kbPickProfile(null)', '🧍 Piyoda')}
      ${cars.map(c => btn(cur === c,
        `window._kbPickProfile(${c.userData.id})`,
        '🚗 ' + esc(c.userData.name || ('#' + c.userData.id)))).join('')}
    </div>`;
}

/**
 * Profilni almashtiradi va muharrirni QAYTA chizadi.
 * ⚠ `id` — `null` bo'lsa global (piyodalik) sozlama.
 */
window._kbPickProfile = function (id) {
  if (id == null) {
    window._kbEditTarget = null;
  } else {
    const car = _kbCarList().find(c => c.userData.id === id);
    if (!car) return;
    //  ⚠ Jadvallarni OLDINDAN yaratamiz: `🔊 ovoz` bo'limi
    //    `ud.sounds` yo'q bo'lsa jimgina GLOBAL sozlamaga yozardi.
    if (window.CarKeyProfile) window.CarKeyProfile.tables(car);
    window._kbEditTarget = car;
  }
  const p = document.getElementById('bkm-panel');
  if (p) _bkmRender(p, p._tab || 0);
};

function _kbTargetKind() {
  const z = window._kbEditTarget;
  if (!z || !z.userData) return '';
  if (z.userData.isAllKey) return 'zone';
  if (z.userData.entityType === 'car' || z.userData._entityMode === 'vehicle') return 'car';
  return 'obj';
}

function _bkmOpenKeyPopup(code, lbl, boundAction, onSave) {
  const old = document.getElementById('bkm-popup');
  if (old) old.remove();

  //  ⚠ Global emas, NISHONDAN: 🎛 AllKey zonasi tahrirlanayotgan
  //    bo'lsa o'sha zonaning qoidalari o'qiladi.
  const anim = _kbTable()[code] || {};
  const popup = document.createElement('div');
  popup.id = 'bkm-popup';
  popup.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:11px;color:var(--accent);font-weight:700">[ ${lbl} ] ${boundAction?'<span style="color:#ffaa44;font-size:9px">→ '+boundAction+'</span>':''}</div>
      <button onclick="document.getElementById('bkm-popup').remove()" style="background:none;border:none;color:var(--border);cursor:pointer;font-size:14px">✕</button>
    </div>

    <div style="font-size:9px;color:var(--border);margin-bottom:4px">🎬 Animatsiya nomi (GLB clip nomi):</div>
    <div style="display:flex;gap:6px;margin-bottom:12px;align-items:center">
      <input id="bkm-aname" class="bkm-inp" placeholder="masalan: walk, run, jump..." value="${anim.animName||''}" style="font-size:10px">
      <label style="cursor:pointer;flex-shrink:0;padding:6px 8px;border-radius:4px;background:rgba(255,170,68,.1);border:1px solid rgba(255,170,68,.3);color:#ffaa44;font-size:9px;white-space:nowrap;font-family:'Share Tech Mono',monospace">
        📁 Fayl
        <input type="file" accept=".json,.glb,.gltf,.fbx" style="display:none"
               onchange="window._bkmImportAnim(this.files[0], '${code}')">
      </label>
    </div>

    ${(() => {
      // 🦴 Modeldagi HAQIQIY clip nomlari. Ilgari bu yerda faqat bo'sh
      //    matn maydoni bor edi — foydalanuvchi "walk" deb yozardi, model
      //    ichida esa "Armature|Walk_Cycle" bo'lardi va hech nima ishlamasdi.
      const rig = _kbFindRig(_kbTargetObj());
      if (!rig) return '';   // rig yo'q — hech narsa ko'rsatmaymiz
      const names = rig.userData._clips.map(c => c.name);
      return `
    <div style="font-size:9px;color:var(--border);margin-bottom:4px">
      🦴 Modeldagi animatsiyalar — bosing (${names.length} ta):</div>
    <div id="bkm-clips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;
                max-height:96px;overflow-y:auto">
      ${names.map(n => `<button class="bkm-clip" data-clip="${_kbEsc(n)}"
        style="background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.3);
               color:var(--accent);padding:4px 8px;border-radius:3px;cursor:pointer;
               font-family:'Share Tech Mono',monospace;font-size:9px"
        >${_kbEsc(n)}</button>`).join('')}
    </div>`;
    })()}

    <div style="font-size:9px;color:var(--border);margin-bottom:4px">⌨ Alternativ klavish (bu ham xuddi [ ${lbl} ] kabi ishlaydi):</div>
    <div style="display:flex;gap:6px;margin-bottom:12px;align-items:center">
      <input id="bkm-altkey" class="bkm-inp" placeholder="masalan: ArrowUp" value="${anim.altKey||''}" style="font-size:10px;color:var(--accent4)">
      <button id="bkm-catch-btn" style="flex-shrink:0;padding:6px 8px;border-radius:4px;background:rgba(var(--accent4-rgb),.1);border:1px solid rgba(var(--accent4-rgb),.3);color:var(--accent4);font-size:9px;cursor:pointer;font-family:'Share Tech Mono',monospace;white-space:nowrap">🎯 Tutish</button>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:8px 10px;background:rgba(var(--accent3-rgb),.04);border:1px solid rgba(var(--accent3-rgb),.18);border-radius:5px">
      <input type="checkbox" id="bkm-holdend" ${anim.holdEnd?'checked':''} style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent3)">
      <div>
        <div style="font-size:9px;color:var(--text)">🔒 Tugaganda joyida qotib qolsin</div>
        <div style="font-size:8px;color:var(--border)">Anim tugagach oxirgi kadrda turadi, tugma qayta bosilguncha</div>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:8px 10px;background:rgba(255,68,68,.04);border:1px solid rgba(255,68,68,.12);border-radius:5px">
      <input type="checkbox" id="bkm-blocked" ${anim.blocked?'checked':''} style="width:15px;height:15px;cursor:pointer;accent-color:#ff4444">
      <div>
        <div style="font-size:9px;color:var(--text)">🚫 Bu klavishni bloklash</div>
        <div style="font-size:8px;color:var(--border)">O'yinda bu tugma hech qanday harakatni ishlatmaydi</div>
      </div>
    </div>

    ${(() => {
      //  ⚠ NISHONDAN o'qiladi: 🎛 zona tahrirlanayotgan bo'lsa
      //    uning ovozlari ko'rsatilishi kerak, global emas.
      const _st = (window._kbSoundTable ? window._kbSoundTable() : (window._kbSounds || {}));
      const snd = _st[code] || {};
      const mode = snd.mode || 'loop';
      const vol = snd.volume ?? 0.7;
      const hasSnd = !!snd.soundName;
      return `
    <div style="margin-bottom:14px;padding:9px 11px;background:rgba(102,204,255,.05);border:1px solid rgba(102,204,255,.22);border-radius:5px">
      <div style="font-size:9px;color:#66ccff;font-weight:700;margin-bottom:7px">🔊 Tugma ovozi</div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
        ${hasSnd
          ? `<div style="flex:1;font-size:9px;color:var(--text);font-family:'Share Tech Mono',monospace;padding:4px 6px;background:rgba(0,0,0,.25);border-radius:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🎵 ${_kbEsc(snd.soundName)}</div>
             <button onclick="window._kbSoundClear('${code}');document.getElementById('bkm-popup').remove()" style="flex-shrink:0;padding:5px 8px;border-radius:4px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);color:#ff6b6b;font-size:9px;cursor:pointer;font-family:'Share Tech Mono',monospace">✕</button>`
          : `<button onclick="window._kbSoundImport('${code}')" style="flex:1;padding:6px;border-radius:4px;background:rgba(102,204,255,.1);border:1px dashed rgba(102,204,255,.4);color:#66ccff;font-size:9px;cursor:pointer;font-family:'Share Tech Mono',monospace">📂 mp3/wav yuklash</button>`}
      </div>
      ${hasSnd ? `
      <div style="font-size:8px;color:var(--border);margin-bottom:4px">Rejim:</div>
      <div style="display:flex;gap:5px;margin-bottom:8px">
        <button onclick="window._kbSoundSet('${code}','mode','loop')"
          style="flex:1;padding:6px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:8px;line-height:1.3;
                 background:${mode==='loop'?'rgba(102,204,255,.18)':'transparent'};
                 border:1px solid ${mode==='loop'?'#66ccff':'#2a3040'};
                 color:${mode==='loop'?'#66ccff':'#556'}">
          <b>🔁 BOSIB TURGANDA</b><br>takrorlanadi, qo'yvorsa to'xtaydi</button>
        <button onclick="window._kbSoundSet('${code}','mode','once')"
          style="flex:1;padding:6px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:8px;line-height:1.3;
                 background:${mode==='once'?'rgba(102,204,255,.18)':'transparent'};
                 border:1px solid ${mode==='once'?'#66ccff':'#2a3040'};
                 color:${mode==='once'?'#66ccff':'#556'}">
          <b>1️⃣ BIR MARTA</b><br>oxirigacha yetib to'xtaydi</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:8px;color:var(--border);min-width:38px">Ovoz:</span>
        <input type="range" min="0" max="1" step="0.05" value="${vol}" style="flex:1"
          oninput="window._kbSoundSet('${code}','volume',parseFloat(this.value));this.nextElementSibling.textContent=Math.round(this.value*100)+'%'">
        <span style="font-size:8px;color:#66ccff;min-width:30px;text-align:right;font-family:'Share Tech Mono',monospace">${Math.round(vol*100)}%</span>
      </div>` : ''}
    </div>`;
    })()}

    <div style="display:flex;gap:6px">
      <button id="bkm-save-btn" class="bkm-btn" style="flex:1;background:rgba(var(--accent-rgb),.12);border-color:rgba(var(--accent-rgb),.4);color:var(--accent);font-weight:700">✅ Saqlash</button>
      <button id="bkm-clear-btn" class="bkm-btn" style="background:rgba(255,68,68,.08);border-color:rgba(255,68,68,.3);color:#ff4444">🗑 Tozala</button>
    </div>
  `;

  // ── 🖥 EKRANGA CHIQARISH ────────────────────────────
  //  ⚠ Bo'lim shu yerda, `innerHTML` dan KEYIN qo'shiladi. Yuqoridagi
  //    shablonga qo'shsak `${}` ichida yana `${}` bo'lib, tirnoqlar
  //    chalkashardi — popupning qolgan qismi ham chizilmay qolardi.
  //  ⚠ HAMMASI `try` ICHIDA. Bu blok popupning QOLGAN qismidan
  //    keyin qo'shiladi — shu yerdagi har qanday xato butun oynani
  //    yiqitadi va foydalanuvchi \"klaviatura muharririda sozlamalar
  //    chiqmayapti\" holatini ko'radi. Aynan shunday bo'ldi ham:
  //    `ScreenKeys` global sifatida yozilgan edi va u yuklanmagan
  //    muhitda `ReferenceError` berib, popup umuman chizilmasdi.
  //    Endi `window.ScreenKeys` — yo'q bo'lsa shunchaki bo'lim
  //    ko'rsatilmaydi, qolgan sozlamalar joyida qoladi.
  try {
    if (!window.ScreenKeys) throw 0;
    const SKS = window.ScreenKeys;
    const box = document.createElement('div');
    box.style.cssText = 'border-top:1px solid #1a2535;margin-top:10px;padding-top:10px';
    const onScr = SKS.byCode(code);
    box.innerHTML =
      '<div style="font-size:9px;color:var(--border);margin-bottom:6px">' +
      '🖥 Ekran tugmasi — bu klavishni ekranga chiqarish:</div>' +
      '<div style="font-size:8px;color:var(--border);line-height:1.6;margin-bottom:7px">' +
      'Ekrandagi tugmani bosish FIZIK klavishni bosish bilan aynan bir xil ishlaydi. ' +
      'Joylashuv, o\'lcham, rang va nomi — ⚙️ Sozlamalar → 🖥 Ekran tugmalari bo\'limida.</div>' +
      '<button id="bkm-scr-add" class="bkm-btn" style="width:100%;background:rgba(var(--accent3-rgb),.12);' +
      'border-color:rgba(var(--accent3-rgb),.4);color:var(--accent3)">' +
      (onScr.length ? '➕ Yana bittasini chiqarish (hozir ' + onScr.length + ' ta)'
                    : '🖥 Ekranga chiqarish') + '</button>';
    const saveBtn = popup.querySelector('#bkm-save-btn');
    if (saveBtn && saveBtn.parentElement) saveBtn.parentElement.before(box);
  } catch (e) { /* bo'lim ko'rsatilmaydi — popupning qolgani ishlayveradi */ }

  // ── 🔢 NOSCRIPT SONI ────────────────────────────────
  //  ⚠ 🖥 bo'limi bilan bir xil sabab: `try` ichida va
  //    `window.` orqali. Bu blokdagi xato butun popupni yiqitmasin.
  try {
    if (!window.KeyNoScript) throw 0;
    const KNS = window.KeyNoScript;
    const d = KNS.get(code) || KNS.defaults(code);
    const box = document.createElement('div');
    box.style.cssText = 'border-top:1px solid #1a2535;margin-top:10px;padding-top:10px';
    const inp = (id, val, w) =>
      `<input id="${id}" type="number" step="any" value="${val}" style="width:${w || 58}px;` +
      `background:rgba(0,0,0,.35);border:1px solid #23324a;color:var(--text);padding:3px 5px;` +
      `font-size:11px;border-radius:3px;font-family:'Share Tech Mono',monospace">`;
    const opt = (v, cur, txt) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${txt}</option>`;
    const SELS = "background:rgba(0,0,0,.35);border:1px solid #23324a;color:var(--text);" +
                 "padding:3px 5px;font-size:11px;border-radius:3px;font-family:'Share Tech Mono',monospace";
    // ============================================================
    //  ⚠ YOQISH TUGMASI — standarti O'CHIQ
    // ------------------------------------------------------------
    //  Ilgari bo'lim har doim ochiq turardi va saqlashda \"foydali\"
    //  ko'ringan har qanday qiymat yozilardi. Natijada dizayner
    //  klavishga faqat 🎬 animatsiya qo'ymoqchi bo'lganda ham
    //  🔢 son amali JIMGINA biriktirilib qolardi.
    //
    //  Endi ochiq savol: bu klavish raqamga tegadimi? Tegmasa —
    //  bo'lim yopiq va hech narsa saqlanmaydi.
    //  ⚠ Mavjud sozlama bo'lsa YONIQ ochiladi, aks holda dizayner
    //    o'zi qo'ygan amalni yo'qotgandek his qilardi.
    const _nsOn = !!(window.KeyNoScript && window.KeyNoScript.get(code));
    box.innerHTML =
      '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px">' +
        `<input id="bkm-ns-on" type="checkbox" ${_nsOn ? 'checked' : ''}>` +
        '<span style="font-size:10px;color:' + (_nsOn ? 'var(--accent3)' : 'var(--border)') + '">' +
        '🔢 NoScript soni — bu klavish raqamga tegsinmi?</span>' +
      '</label>' +
      '<div id="bkm-ns-body" style="display:' + (_nsOn ? 'block' : 'none') + '">' +
      '<div style="display:flex;gap:5px;align-items:center;margin-bottom:6px">' +
        `<select id="bkm-ns-op" style="${SELS}">` +
          opt('+', d.op, '➕ qo\'shish') + opt('-', d.op, '➖ ayirish') +
          opt('×', d.op, '✖ ko\'paytirish') + opt('÷', d.op, '➗ bo\'lish') +
        '</select>' + inp('bkm-ns-val', d.value, 70) +
      '</div>' +
      //  🎰 SLOT TANLOVI — faqat ikki va undan ortiq slot bo'lsa.
      //   ⚠ Busiz klavish amali HAR DOIM faol slotga tushardi va
      //     ko'p slotlik yarim ishlagan bo'lardi: 🧊 blok va 🔘 tugma
      //     slotni tanlaydi, klavish esa yo'q.
      ((window.NoScriptSystem && window.NoScriptSystem.slots().length > 1)
        ? '<div style="display:flex;gap:5px;align-items:center;margin-bottom:6px">' +
            '<span style="font-size:9px;color:var(--border)">🎰 Slot</span>' +
            `<select id="bkm-ns-slot" style="${SELS};flex:1">` +
              window.NoScriptSystem.slots().map(sl =>
                `<option value="${sl.id}" ${sl.id === d.slot ? 'selected' : ''}>${sl.name}</option>`).join('') +
            '</select>' +
          '</div>'
        : '') +
      '<div style="display:flex;gap:5px;align-items:center;margin-bottom:6px">' +
        `<select id="bkm-ns-mode" style="${SELS};flex:1">` +
          opt('click', d.mode, '🖱 Bosish — bir marta son beradi') +
          opt('drip',  d.mode, '⏳ Tomchi — bosgach oqim ketadi') +
          opt('hold',  d.mode, '🖐 Bosma — bosib turganda beradi') +
        '</select>' +
        `<select id="bkm-ns-once" style="${SELS}">` +
          opt('0', d.once ? '1' : '0', 'Standart') + opt('1', d.once ? '1' : '0', 'Bir marta') +
        '</select>' +
      '</div>' +
      // ── 🎲 TASODIFIY SON ───────────────────────────────
      //  ⚠ UCHALA rejimda ham ishlaydi. Oqim rejimlarida HAR ULUSHDA
      //    yangi son keladi — ya'ni \"100 soniyaning har 10 soniyasida
      //    1…56 oralig'idan tasodifiy son\".
      '<div style="border:1px solid ' + (d.rnd ? 'rgba(var(--accent4-rgb),.45)' : '#1a2535') + ';' +
        'border-radius:3px;padding:5px 6px;margin:6px 0;' +
        'background:' + (d.rnd ? 'rgba(var(--accent4-rgb),.07)' : 'transparent') + '">' +
        '<label style="display:flex;align-items:center;gap:6px;cursor:pointer">' +
          `<input id="bkm-ns-rnd" type="checkbox" ${d.rnd ? 'checked' : ''}>` +
          '<span style="font-size:10px;color:' + (d.rnd ? 'var(--accent4)' : 'var(--border)') + '">' +
          '🎲 Tasodifiy son</span>' +
        '</label>' +
        '<div id="bkm-ns-rndbox" style="display:' + (d.rnd ? 'flex' : 'none') + ';' +
          'gap:5px;align-items:center;margin-top:5px">' +
          '<span style="font-size:9px;color:var(--border)">dan</span>' + inp('bkm-ns-rmin', d.rndMin, 62) +
          '<span style="font-size:9px;color:var(--border)">gacha</span>' + inp('bkm-ns-rmax', d.rndMax, 62) +
        '</div>' +
        '<div style="font-size:8px;color:var(--border);line-height:1.6;margin-top:4px">' +
          'Yoqilsa yuqoridagi son o\'rniga shu oraliqdan tasodifiy BUTUN son olinadi. ' +
          '⏳ Tomchi va 🖐 Bosma rejimlarida har ulushda YANGI son keladi.' +
        '</div>' +
      '</div>' +
      '<div id="bkm-ns-flow" style="display:' + (d.mode === 'click' ? 'none' : 'block') + '">' +
        '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">' +
          '<span style="font-size:9px;color:var(--border)">Davomiyligi</span>' + inp('bkm-ns-dur', d.dur) +
          '<span style="font-size:9px;color:var(--border)">s · har</span>' + inp('bkm-ns-every', d.every) +
          '<span style="font-size:9px;color:var(--border)">s da</span>' + inp('bkm-ns-step', d.step) +
          '<span style="font-size:9px;color:var(--border)">ta</span>' +
        '</div>' +
        '<div id="bkm-ns-hint" style="font-size:8px;color:var(--accent3);line-height:1.6;margin-top:5px"></div>' +
      '</div>' +
      '<div style="font-size:8px;color:var(--border);line-height:1.6;margin-top:6px">' +
        '🖱 <b>Bosish</b> — har bosishda bir marta.<br>' +
        '⏳ <b>Tomchi</b> — BIR bosishda oqim boshlanadi va klavishni qo\'yib yuborsangiz ham davom etadi.<br>' +
        '🖐 <b>Bosma</b> — faqat klavish bosib turilganda; qo\'yvorsangiz TO\'XTAYDI.<br>' +
        '<b>Bir marta</b> — butun o\'yin davomida faqat bitta marta ishlaydi.' +
      '</div>' +
      '</div>';   // ← 🔢 bo'limining yopilishi

    popup.querySelector('#bkm-save-btn').parentElement.before(box);
  } catch (e) { /* bo'lim ko'rsatilmaydi — popupning qolgani ishlayveradi */ }

  document.body.appendChild(popup);

  // ── 🔢 Jonli izoh + rejimga qarab maydonlarni ko'rsatish ─────
  //  ⚠ Izoh SHART: \"100 · 10 · 1\" uch sonini ko'rgan dizayner ular
  //    nimani anglatishini eslay olmaydi. Jonli jumla \"100 soniya
  //    davomida har 10 soniyada 1 ta\" — xatoni darrov ko'rsatadi.
  (function () {
    const mSel = document.getElementById('bkm-ns-mode');
    if (!mSel) return;
    const paint = () => {
      const md = mSel.value;
      const flow = document.getElementById('bkm-ns-flow');
      if (flow) flow.style.display = (md === 'click') ? 'none' : 'block';
      //  🖱 Bosish rejimida oqim maydonlari yashiriladi, lekin 🎲
      //    tasodif KO'RINIB TURADI — u uchala rejimga ham tegishli.
      const hint = document.getElementById('bkm-ns-hint');
      if (!hint) return;
      const dur = +document.getElementById('bkm-ns-dur').value || 0;
      const ev  = +document.getElementById('bkm-ns-every').value || 0;
      const st  = +document.getElementById('bkm-ns-step').value || 0;
      const op  = document.getElementById('bkm-ns-op').value;
      const n   = (ev > 0) ? Math.floor(dur / ev) : 0;
      //  🎲 Tasodif yoqilgan bo'lsa miqdor oraliqdan olinadi —
      //  izohda ham aynan shuni ko'rsatamiz, aks holda dizayner
      //  \"+1\" deb o'qib, aslida \"+1…56\" bo'layotganini bilmasdi.
      const rOn = document.getElementById('bkm-ns-rnd');
      const rBox = document.getElementById('bkm-ns-rndbox');
      if (rBox) rBox.style.display = (rOn && rOn.checked) ? 'flex' : 'none';
      const amt = (rOn && rOn.checked)
        ? `${op}(${+document.getElementById('bkm-ns-rmin').value || 0}…${+document.getElementById('bkm-ns-rmax').value || 0} 🎲)`
        : `${op}${st}`;
      hint.textContent = (md === 'hold')
        ? `🖐 Bosib turilsa: ${dur}s davomida har ${ev}s da ${amt} → jami ${n} marta` +
          ` (qo'yvorilsa to'xtaydi)`
        : `⏳ Bir bosishda: ${dur}s davomida har ${ev}s da ${amt} → jami ${n} marta`;
    };
    //  🔢 Yoqish tugmasi — butun bo'limni ko'rsatadi/yashiradi
    const _nsOnEl = document.getElementById('bkm-ns-on');
    if (_nsOnEl) {
      const _paintOn = () => {
        const b = document.getElementById('bkm-ns-body');
        if (b) b.style.display = _nsOnEl.checked ? 'block' : 'none';
        const lbl = _nsOnEl.nextElementSibling;
        if (lbl) lbl.style.color = _nsOnEl.checked ? 'var(--accent3)' : 'var(--border)';
      };
      _nsOnEl.addEventListener('change', _paintOn);
      _paintOn();
    }
    ['bkm-ns-mode','bkm-ns-dur','bkm-ns-every','bkm-ns-step','bkm-ns-op',
     'bkm-ns-rnd','bkm-ns-rmin','bkm-ns-rmax'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('input', paint); el.addEventListener('change', paint); }
    });
    paint();
  })();

  //  🖥 Ekranga chiqarish — tugma ekran O'RTASIDA paydo bo'ladi
  const _scrAdd = document.getElementById('bkm-scr-add');
  if (_scrAdd) _scrAdd.onclick = () => {
    const k = window.ScreenKeys.add(code, lbl);
    popup.remove();
    //  ⚠ Panelni yopamiz: tugma ekran o'rtasida paydo bo'ladi va
    //    katta klaviatura oynasi uni to'sib turardi — foydalanuvchi
    //    \"hech nima chiqmadi\" deb o'ylardi.
    const bp = document.getElementById('bkm-panel');
    if (bp) bp.remove();
    const bo = document.getElementById('bkm-overlay');
    if (bo) bo.remove();
    if (window.log) log(`🖥 [${lbl}] ekranda — ⚙️ Sozlamalar → 🖥 Ekran tugmalari`, 'lok');
    if (typeof updateInspector === 'function') updateInspector();
  };

  // 🦴 Clip tugmalari — nomni maydonga qo'yadi (data-* orqali, tirnoq muammosisiz)
  popup.querySelectorAll('.bkm-clip').forEach(b => {
    b.onclick = () => {
      const inp = document.getElementById('bkm-aname');
      if (inp) { inp.value = b.dataset.clip; inp.focus(); }
      popup.querySelectorAll('.bkm-clip').forEach(o => {
        const sel = o === b;
        o.style.background  = sel ? 'rgba(var(--accent-rgb),.25)' : 'rgba(var(--accent-rgb),.08)';
        o.style.borderColor = sel ? 'var(--accent)' : 'rgba(var(--accent-rgb),.3)';
      });
    };
  });

  // Alternativ tugma tutish
  document.getElementById('bkm-catch-btn').onclick = () => {
    const inp = document.getElementById('bkm-altkey');
    const btn = document.getElementById('bkm-catch-btn');
    inp.value = '[ bosing... ]';
    inp.style.color = '#ffaa44';
    btn.textContent = '⏳';
    const h = e => {
      e.preventDefault(); e.stopImmediatePropagation();
      inp.value = e.code;
      inp.style.color = 'var(--accent4)';
      btn.textContent = '🎯 Tutish';
      document.removeEventListener('keydown', h, { capture: true });
    };
    document.addEventListener('keydown', h, { capture: true });
  };

  // Saqlash
  document.getElementById('bkm-save-btn').onclick = () => {
    const animName = document.getElementById('bkm-aname').value.trim();
    const altKey = document.getElementById('bkm-altkey').value.trim();
    const blocked = document.getElementById('bkm-blocked').checked;
    const holdEnd = document.getElementById('bkm-holdend').checked;
    const _tbl = _kbTable();
    if (!_tbl[code]) _tbl[code] = {};
    _tbl[code].animName = animName;
    _tbl[code].altKey = (altKey && altKey !== '[ bosing... ]') ? altKey : '';
    _tbl[code].blocked = blocked;
    _tbl[code].holdEnd = holdEnd;
    // animFile ni saqlab qolish (fayl yuklangan bo'lsa o'chirmaylik)
    // (animFile file input onchange da allaqachon o'rnatilgan)
    // ── 🔢 NoScript soni ─────────────────────────────
    //  ⚠ `try` ichida: maydonlar chizilmagan bo'lsa (bo'lim
    //    ko'rsatilmagan) saqlash BUTUNLAY yiqilmasin — animatsiya
    //    va alt-klavish baribir saqlansin.
    try {
      const _v = (id) => { const e = document.getElementById(id); return e ? e.value : null; };
      const _op = _v('bkm-ns-op');
      //  ⚠ YOQISH TUGMASI ustun: o'chirilgan bo'lsa amal BUTUNLAY
      //    olib tashlanadi. Maydonlardagi qiymatlar qolib ketsa
      //    dizayner \"o'chirdim, lekin ishlayapti\" holatini ko'rardi.
      const _onEl = document.getElementById('bkm-ns-on');
      if (_onEl && !_onEl.checked) {
        if (window.KeyNoScript) window.KeyNoScript.remove(code);
      } else if (_op !== null && window.KeyNoScript) {
        const val  = parseFloat(_v('bkm-ns-val'));
        const mode = _v('bkm-ns-mode');
        //  ⚠ `0` — haqiqiy qiymat: \"raqamni nolga tenglashtir\" emas,
        //    lekin \"×0\" ma'noli. Shuning uchun `|| 10` YO'Q, faqat
        //    `NaN` tekshiruvi.
        const data = {
          op: _op, value: isFinite(val) ? val : 0, mode,
          dur:   Math.max(0, parseFloat(_v('bkm-ns-dur'))   || 0),
          every: Math.max(0.05, parseFloat(_v('bkm-ns-every')) || 1),
          step:  parseFloat(_v('bkm-ns-step')) || 0,
          once:  _v('bkm-ns-once') === '1',
          enabled: true,
        };
        //  🎰 Slot tanlovi bo'lmasa (bitta slot) — `null`, ya'ni
        //  \"faol slot\". Aynan `null` bo'lishi shart: `0` ham haqiqiy
        //  id bo'lishi mumkin va `|| null` uni yo'qotardi.
        const _sv = _v('bkm-ns-slot');
        data.slot = (_sv == null || _sv === '') ? null : (parseInt(_sv, 10) || null);
        // 🎲 Tasodifiy son
        const _rEl = document.getElementById('bkm-ns-rnd');
        data.rnd    = !!(_rEl && _rEl.checked);
        data.rndMin = parseFloat(_v('bkm-ns-rmin'));
        data.rndMax = parseFloat(_v('bkm-ns-rmax'));
        //  ⚠ `NaN` bo'lsa standartga qaytaramiz: bo'sh maydon
        //    `randOne` ga tushib, natija `NaN` bo'lardi va raqam
        //    butunlay buzilardi.
        if (!isFinite(data.rndMin)) data.rndMin = 1;
        if (!isFinite(data.rndMax)) data.rndMax = data.rndMin;
        //  ⚠ \"Hech narsa qilmaydigan\" sozlama SAQLANMAYDI: bosish
        //    rejimida qiymat nol bo'lsa, yoki oqimda davomiylik nol
        //    bo'lsa — klavish ro'yxatda turgani bilan ishlamaydi va
        //    dizayner uni \"ishlamayapti\" deb o'ylardi.
        //  ⚠ 🎲 yoqilgan bo'lsa miqdor oraliqdan keladi, ya'ni
        //    `value`/`step` nol bo'lishi NORMAL. Buni hisobga olmasak
        //    \"1…56 tasodifiy\" sozlamasi \"foydasiz\" deb o'chirilardi.
        const useless = data.rnd
          ? (mode !== 'click' && data.dur === 0)
          : ((mode === 'click') ? (data.value === 0) : (data.dur === 0 || data.step === 0));
        if (useless) window.KeyNoScript.remove(code);
        else {
          window.KeyNoScript.set(code, data);
          if (window.log) log(`⌨ [${lbl}] → 🔢 ${data.op}${data.value} (${mode})`, 'lok');
        }
      }
    } catch (e) {
      if (window.log) log(`❌ 🔢 sozlama saqlanmadi: ${e && e.message ? e.message : e}`, 'le');
    }

    popup.remove();
    onSave();
    if (animName && window.log) log(`⌨ [${lbl}] → 🎬 ${animName}`, 'lok');
  };

  // Tozalash
  document.getElementById('bkm-clear-btn').onclick = () => {
    delete _kbTable()[code];
    //  🔢 Son amali ham tozalanadi — aks holda \"tozaladim, lekin
    //    klavish hali ham raqamni o'zgartiryapti\" holati bo'lardi.
    try { if (window.KeyNoScript) window.KeyNoScript.remove(code); } catch (e) {}
    popup.remove();
    onSave();
  };

  // Tashqari bosish
  const closeOut = e => { if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('mousedown', closeOut); } };
  setTimeout(() => document.addEventListener('mousedown', closeOut), 100);
}

// ============================================================
// KEYBOARD EVENT → ANIMATION TRIGGER
// ============================================================
document.addEventListener('keydown', e => {
  // ============================================================
  //  ⚠ SINTETIK HODISALAR — IKKI XIL TURI BOR
  // ------------------------------------------------------------
  //  Ilgari shu yerda `if (e._altSynthetic) return;` turardi va u
  //  BARCHA sintetik hodisalarni to'sardi. ⌨🖥 ekran tugmalari ham
  //  `_altSynthetic` markerini qo'yadi (cheksiz tsiklga tushmaslik
  //  uchun) — natijada ekrandagi tugmani bosganda klaviatura
  //  muharriridagi HECH NARSA ishlamasdi: na 🎬 animatsiya,
  //  na 🚫 bloklash. Fizik klavishda hammasi ishlardi, ekrandagida
  //  yo'q — foydalanuvchi aynan shuni ko'rdi.
  //
  //  Farq:
  //    `_altSynthetic` + `_screenKey`  — EKRAN TUGMASI. Bu HAQIQIY
  //        manba: xuddi klavish bosilgandek to'liq ishlov berilishi
  //        kerak. Faqat 3-qadam (alt qayta tarqatish) o'tkaziladi,
  //        aks holda tsikl bo'lardi.
  //    `_altSynthetic` yolg'iz — ALT-KLAVISH qayta tarqatgani.
  //        Uni butunlay o'tkazib yuboramiz.
  // ============================================================
  if (e._altSynthetic && !e._screenKey) return;

  const anims = window._kbAnimations || {};
  //  ⚠ Ilgari bu ro'yxat bloklashdan ISTISNO edi. Endi emas —
  //    yuqoridagi `_KB_MOVE` izohiga qarang.
  const PLAYER_KEYS = _KB_MOVE;

  // ============================================================
  //  1. 🚫 BLOKLASH
  // ------------------------------------------------------------
  //  ⚠ `stopImmediatePropagation()` YETARLI EMAS edi — ikki sabab:
  //
  //    a) `camera-modes.js` `index.html` da BU FAYLDAN OLDIN
  //       yuklanadi, ya'ni uning tinglovchisi BIRINCHI ishlaydi va
  //       `fpsKeys[code] = true` allaqachon yozilib bo'lgan bo'ladi.
  //       To'xtatish kech qoladi.
  //
  //    b) Dvigateldagi ko'p tizim hodisani UMUMAN tinglamaydi — ular
  //       har kadr `fpsKeys` ni SO'RAYDI (🔊 ovoz bloki, ⌨🔢 son
  //       amallari, 🔢 qulf, ⌨🖥 ekran tugmalari). Ular uchun
  //       hodisani to'xtatishning ma'nosi yo'q.
  //
  //  Shu bois bloklangan klavish HOLATI ham tozalanadi — va u har
  //  kadr majburlanadi (`_kbEnforceBlocks`, main-loop dan).
  //  📦 Inventar qorovuli bilan bir xil dars: manbani quvish
  //  o'rniga invariantni majburlash.
  //
  //  ⚠ Harakat tugmalari HECH QACHON bloklanmaydi: o'yinchi
  //    qimirlay olmay qolsa buni xato deb o'ylardi.
  //  ⚠ `!PLAYER_KEYS.includes(...)` SHARTI OLIB TASHLANDI: dizayner
  //    🚫 katagini belgilagan bo'lsa, klavish bloklanishi kerak —
  //    harakat tugmasi bo'lsa ham. Aks holda \"bloklandi, lekin
  //    ishlayapti\" holati chiqardi.
  if (anims[e.code] && anims[e.code].blocked) {
    _kbClearKey(e.code);
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }

  // 2. Animatsiya ishga tushirish (faqat birinchi bosishda, repeat bo'lsa o'tkazib yuborish)
  if (anims[e.code] && anims[e.code].animName && !e.repeat) {
    _triggerObjAnim(anims[e.code].animName, e.code);
  }

  // 3. Alternativ tugma — har bir altKey origCode bosilgandek harakat qilsin
  //    Ikki bosqichli yondashuv:
  //    (a) fpsKeys va PlayerController.keys'ni to'g'ridan-to'g'ri yozish — tezkor yo'l
  //    (b) origCode uchun sintetik KeyboardEvent dispatch qilish — boshqa har qanday
  //        listener (car.js, weapon.js, fps-interaction.js, camera-modes.js) origCode
  //        tabiiy bosilgandek qabul qiladi
  //  ⚠ Ekran tugmasi 3-qadamdan O'TKAZILADI: u allaqachon
  //    `fpsKeys` ni to'ldirgan va hodisa tarqatgan. Bu yerda yana
  //    tarqatsak o'zini-o'zi chaqirib, cheksiz tsikl bo'lardi.
  if (e._screenKey) return;
  Object.entries(anims).forEach(([origCode, data]) => {
    if (!data.altKey || e.code !== data.altKey) return;

    // (a) To'g'ridan-to'g'ri state yozish
    if (window.fpsKeys)                fpsKeys[origCode] = true;
    if (window.PlayerController?.keys) window.PlayerController.keys[origCode] = true;

    // (b) Sintetik event dispatch — boshqa tizimlar tabiiy qabul qilsin
    try {
      const syn = new KeyboardEvent('keydown', {
        code:     origCode,
        key:      origCode,
        bubbles:  true,
        cancelable: true,
        repeat:   e.repeat,
      });
      syn._altSynthetic = true; // tsikl oldini olish uchun marker
      document.dispatchEvent(syn);
    } catch(err) { /* ba'zi eski brauzerlarda KeyboardEvent constructor cheklangan */ }

    // Action-nomli set (eski playerKeysDown — saqlab qolingan)
    if (typeof playerSettings !== 'undefined' && playerSettings.keys) {
      const action = Object.entries(playerSettings.keys).find(([,c]) => c === origCode);
      if (action && window._playerKeysDown) window._playerKeysDown.add(action[0]);
    }

    if (data.animName && !e.repeat) _triggerObjAnim(data.animName, origCode);
  });

  // 4. QO'SHMA KLAVISHLAR (kombo) — bosilgan tugma kombodagi oxirgi tugma bo'lsa
  //    va qolganlari hozir bosib turilgan bo'lsa, kombo animatsiyasini tetiklash
  _checkCombosDown(e);
}, true);

document.addEventListener('keyup', e => {
  // ============================================================
  //  ⚠ EKRAN TUGMASI — HAQIQIY manba
  // ------------------------------------------------------------
  //  Ilgari `if (e._altSynthetic) return;` BARCHA sintetik hodisani
  //  to'sardi. ⌨🖥 ekran tugmalari ham shu markerni qo'yadi —
  //  natijada ularning `keyup` i BU YERGA YETIB KELMASDI va
  //  🎬 animatsiya HECH QACHON TO'XTAMASDI: ekrandagi tugmani
  //  bosgan zahoti animatsiya cheksiz takrorlanardi.
  //  (`keydown` 58.75 da tuzatilgan, `keyup` esa qolib ketgan edi.)
  if (e._altSynthetic && !e._screenKey) return;

  const anims = window._kbAnimations || {};
  const code = e.code;

  // Tugma qo'yilganda — bog'liq animatsiyani to'xtat
  // (lekin holdEnd=true bo'lsa to'xtatmaymiz — anim oxirigacha yetib qotib qolsin)
  if (anims[code] && anims[code].animName && !anims[code].holdEnd) _stopKbAnim(code);
  if (window._kbActiveAnims && window._kbActiveAnims[code] && !(anims[code] && anims[code].holdEnd)) _stopKbAnim(code);

  // Alt klavish — bosilishi to'xtaganda origCode state'ini ham tozala + sintetik keyup
  Object.entries(anims).forEach(([origCode, data]) => {
    if (!data.altKey || code !== data.altKey) return;

    if (window.fpsKeys)                fpsKeys[origCode] = false;
    if (window.PlayerController?.keys) window.PlayerController.keys[origCode] = false;

    try {
      const syn = new KeyboardEvent('keyup', {
        code:     origCode,
        key:      origCode,
        bubbles:  true,
        cancelable: true,
      });
      syn._altSynthetic = true;
      document.dispatchEvent(syn);
    } catch(err) {}

    if (typeof playerSettings !== 'undefined' && playerSettings.keys) {
      const action = Object.entries(playerSettings.keys).find(([,c]) => c === origCode);
      if (action && window._playerKeysDown) window._playerKeysDown.delete(action[0]);
    }

    // Alt-tugma orqali ham — holdEnd bo'lsa to'xtatmaslik
    if (data.animName && !data.holdEnd) _stopKbAnim(origCode);
  });

  // Kombo tugmalaridan birortasi qo'yib yuborildi — aktiv kombolardan chiqarish
  _checkCombosUp(e);
}, true);

// Aktiv KB animatsiyalarini saqlash (loop uchun)
window._kbActiveAnims = window._kbActiveAnims || {}; // keyCode -> { rafId, stop }

function _stopKbAnim(keyCode) {
  // 1) JS keyframe sikli (APEX obyekt animatsiyasi, bounce va h.k.)
  const existing = window._kbActiveAnims[keyCode];
  if (existing) { existing.stop(); delete window._kbActiveAnims[keyCode]; }

  // 2) Mixer harakati (GLB klip / import qilingan suyak animatsiyasi)
  //    ⚠ Bu qism YO'Q edi: klavish qo'yib yuborilgach ham klip
  //      `LoopRepeat` bilan cheksiz yurib turardi.
  const c = window._kbActiveClips && window._kbActiveClips[keyCode];
  if (c) {
    try { c.act.fadeOut(0.25); } catch (e) {}
    // Avval yurayotgan animatsiyani (idle) qaytaramiz
    for (const p of (c.prev || [])) {
      try { p.reset().fadeIn(0.25).play(); } catch (e) {}
    }
    // fadeOut tugagach to'liq to'xtatamiz — aks holda harakat "0 vaznda"
    // yurib, mixer'ni bekorga yuklab turadi.
    const _a = c.act;
    setTimeout(() => { try { if (_a.getEffectiveWeight() < 0.01) _a.stop(); } catch (e) {} }, 300);
    delete window._kbActiveClips[keyCode];
  }
}
window._stopKbAnim = _stopKbAnim;

// ============================================================
// QO'SHMA KLAVISHLAR (KOMBO) — masalan W + Shift = boshqa animatsiya
// ============================================================
//   _kbCombos massivi: [{ keys:['KeyW','ShiftLeft'], animName, animJson?, animFile? }, ...]
//   Aniqlash: bosilgan tugma kombo.keys ichida bo'lsa va qolgan tugmalar fpsKeys'da
//   true bo'lsa — kombo animatsiyasi tetiklanadi. sourceCode '@combo:N' bo'lib uzatiladi.
function _checkCombosDown(e) {
  const combos = window._kbCombos;
  // fpsKeys camera-modes.js'da `let` bilan e'lon qilingan — `window.fpsKeys` undefined,
  // shuning uchun bare reference va typeof orqali tekshiramiz
  if (!combos || !combos.length || typeof fpsKeys === 'undefined') return;

  combos.forEach((combo, idx) => {
    if (!combo || !combo.keys || combo.keys.length < 2 || !combo.animName) return;
    if (!combo.keys.includes(e.code)) return;

    // Qolgan barcha tugmalar hozir bosilib turibdi?
    const allHeld = combo.keys.every(k => k === e.code || fpsKeys[k]);
    if (!allHeld) return;

    if (window._activeCombos.has(idx)) return;
    window._activeCombos.add(idx);

    combo.keys.forEach(k => _stopKbAnim(k));
    _triggerObjAnim(combo.animName, '@combo:' + idx);
  });
}

function _checkCombosUp(e) {
  const combos = window._kbCombos;
  if (!combos || !combos.length) return;

  combos.forEach((combo, idx) => {
    if (!window._activeCombos.has(idx)) return;
    if (!combo.keys || !combo.keys.includes(e.code)) return;

    window._activeCombos.delete(idx);
    _stopKbAnim('@combo:' + idx);
  });
}

// ============================================================
// AFK ANIMATSIYALAR — o'yinchi/avto idle turganda
// ============================================================
// _afkAnims: [{ animName, timer, animJson? }, ...]
// Idle = klaviaturada hech qaysi tugma bosilib turmasa.
// Sichqoncha harakati / aylanishi idle hisoblanmaydi (o'yinchi atrofiga qaray oladi).
// Animatsiya o'z-o'zidan loop bo'ladi (default _runKfLoop). Tugma bosilsa to'xtaydi.
function _afkAnyKeyHeld() {
  if (typeof fpsKeys === 'undefined') return false;
  for (const k in fpsKeys) { if (fpsKeys[k]) return true; }
  return false;
}

function _afkReset() {
  window._idleTime = 0;
  (window._afkAnims || []).forEach((a, idx) => {
    if (a._played) {
      a._played = false;
      _stopKbAnim('@afk:' + idx);
    }
  });
}

// Tugma bosilganda darhol to'xtatish (100ms polling kechikishini chetlab o'tish)
document.addEventListener('keydown', () => {
  // Faqat play modida + biror AFK ishlab turgan bo'lsa
  if (typeof isPlaying === 'undefined' || !isPlaying) return;
  const hasActive = (window._afkAnims || []).some(a => a._played);
  if (hasActive || (window._idleTime || 0) > 0) _afkReset();
}, true);

// Vaqt o'tishi — 100 ms da bir tekshirib boriladi
setInterval(() => {
  if (typeof isPlaying === 'undefined' || !isPlaying) return;
  if (document.getElementById('bkm-overlay')) return; // muharrir ochiq — pause

  // Klaviaturada biror tugma bosilib turibdimi?
  if (_afkAnyKeyHeld()) {
    // Idle emas — reset (faol AFK animatsiyalarini ham to'xtatadi)
    if ((window._idleTime || 0) > 0 || (window._afkAnims || []).some(a => a._played)) {
      _afkReset();
    }
    return;
  }

  // Tugma bosilmagan — idle vaqt o'sib boradi
  window._idleTime = (window._idleTime || 0) + 0.1;

  const afkList = window._afkAnims || [];
  afkList.forEach((a, idx) => {
    if (!a || !a.animName || !a.timer) return;
    if (a._played) return; // allaqachon loop'da — _runKfLoop o'z-o'zidan davom etadi
    if (window._idleTime >= a.timer) {
      a._played = true;
      _triggerObjAnim(a.animName, '@afk:' + idx); // loop sifatida ishga tushadi
    }
  });
}, 100);

// HTML escape — clip nomlari atributga qo'yiladi (tirnoq/burchak buzmasin)
function _kbEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// ── 🦴 GLB RIG (skeleton) yordamchilari ──────────────────────
//  Rigli model kubga import qilinganda `_mixer`/`_clips`/`_actions`
//  MAQSAD obyektda (kubda) saqlanadi, suyaklar esa uning bolasida.
//  Ba'zi import yo'llari (prefab, chuqur import, asset-importer) mixerni
//  ichki wrapper'ga qo'yadi — shuning uchun pastga ham qaraymiz.
function _kbFindRig(obj) {
  if (!obj) return null;
  const has = o => o && o.userData && o.userData._mixer &&
                   (o.userData._clips || []).length > 0;
  if (has(obj)) return obj;
  let found = null;
  if (typeof obj.traverse === 'function') {
    obj.traverse(ch => { if (!found && ch !== obj && has(ch)) found = ch; });
  }
  return found;
}

/**
 * Clip nomini solishtirish uchun soddalashtiradi.
 * Eksport dasturlari clip'ga "Armature|Walk_Cycle", "CharacterArmature|Idle",
 * "walk.001" kabi nomlar beradi — foydalanuvchi esa "walk" deb yozadi.
 *   "Armature|Walk_Cycle" → "walkcycle"
 */
function _kbNorm(s) {
  return String(s || '').toLowerCase().split('|').pop().replace(/[^a-z0-9]/g, '');
}

/** Nomga eng mos clipni topadi (aniq → ichida → teskari ichida) */
function _kbPickClip(clips, animName) {
  const want = _kbNorm(animName);
  if (!want || !clips || !clips.length) return null;
  return clips.find(c => _kbNorm(c.name) === want)
      || clips.find(c => _kbNorm(c.name).includes(want))
      || clips.find(c => want.includes(_kbNorm(c.name)))
      || null;
}

/** Clipni krossfeyd bilan ishga tushiradi */
// Klavish → ishga tushirilgan mixer harakati.
//   { act, rig, prev: [avval yurayotgan harakatlar] }
window._kbActiveClips = window._kbActiveClips || {};

/**
 * @param {THREE.Object3D} rig
 * @param {THREE.AnimationClip} clip
 * @param {string} [sourceCode]  klavish kodi — qo'yib yuborilganda to'xtatish uchun
 * @param {boolean} [holdEnd]    tugagach oxirgi kadrda qotib qolsin
 */
function _kbPlayClip(rig, clip, sourceCode, holdEnd) {
  const mixer = rig.userData._mixer;
  // ⚠ Mixer FAQAT `objects[]` dagi obyektlar uchun yangilanadi
  //   (main-loop.js: `if (ud._mixer) ud._mixer.update(delta)`), va u
  //   bolalar ichiga KIRMAYDI. Agar rig biriktirilgan modelning ichki
  //   tuguni bo'lsa, mixer hech qachon yangilanmaydi — animatsiya
  //   boshlanadi-yu, birinchi kadrda muzlab qoladi.
  //   Shuning uchun rigni ro'yxatga qo'shamiz (nusxa emas — havola).
  if (window.objects && window.objects.indexOf(rig) < 0) {
    let anc = rig.parent, host = null;
    while (anc) { if (window.objects.indexOf(anc) >= 0) { host = anc; break; } anc = anc.parent; }
    if (host && !host.userData._mixer) host.userData._mixer = mixer;   // ajdodga ulaymiz
    else if (!host) window.objects.push(rig);                          // ajdod yo'q — o'zini
  }
  // ⚠ Avval yurayotgan harakatlarni ESLAB QOLAMIZ. Klavish qo'yib
  //   yuborilganda ularni qaytaramiz — aks holda o'yinchi hech qanday
  //   animatsiyasiz "muzlab" qoladi (GLB yuklanganda `actions[0].play()`
  //   bilan boshlangan idle ham o'chib ketgan bo'ladi).
  const prev = [];
  (rig.userData._actions || []).forEach(a => {
    try {
      if (a && a !== null && a.getClip && a.getClip() === clip) return;   // o'zimiz
      if (a && a.isRunning && a.isRunning()) { prev.push(a); a.fadeOut(0.35); }
    } catch (e) {}
  });

  const act = mixer.clipAction(clip);
  // 🔒 "Tugaganda joyida qotib qolsin" — bir marta yurib, oxirgi kadrda turadi
  if (holdEnd) {
    act.setLoop(THREE.LoopOnce, 1);
    act.clampWhenFinished = true;
  } else {
    act.setLoop(THREE.LoopRepeat, Infinity);
    act.clampWhenFinished = false;
  }
  act.reset().fadeIn(0.35).play();

  // ⚠ Ro'yxatga olamiz. `_stopKbAnim()` ilgari FAQAT JS keyframe
  //   sikllarini (`_kbActiveAnims`) to'xtatardi va mixer harakatlari
  //   haqida umuman bilmasdi — shuning uchun klavishni qo'yib
  //   yuborsangiz ham animatsiya cheksiz davom etardi.
  if (sourceCode) window._kbActiveClips[sourceCode] = { act, rig, prev };
  return act;
}

/** Klavish muharriri va animatsiya tetiklari uchun MAQSAD obyekt */
/**
 * Klavish/kombo/AFK manbasiga tegishli animatsiya sozlamasi.
 *   '@combo:N' → _kbCombos[N] · '@afk:N' → _afkAnims[N] · aks holda _kbAnimations
 * ⚠ Ajratildi, chunki endi IKKI joyda kerak: rig topilmagan holatda ham,
 *   rig bor-u mos klip yo'q holatda ham (`animJson` ga yo'l berish uchun).
 */
function _kbAnimDataFor(sourceCode) {
  if (typeof sourceCode === 'string' && sourceCode.startsWith('@combo:'))
    return (window._kbCombos && window._kbCombos[parseInt(sourceCode.slice(7), 10)]) || {};
  if (typeof sourceCode === 'string' && sourceCode.startsWith('@afk:'))
    return (window._afkAnims && window._afkAnims[parseInt(sourceCode.slice(5), 10)]) || {};
  return (window._kbAnimations && window._kbAnimations[sourceCode]) || {};
}

function _kbTargetObj() {
  // Play rejimida — boshqarilayotgan obyekt
  if (window.PlayerController && window.PlayerController.obj) {
    return window.PlayerController.obj;
  }
  // ⚠ Muharrir rejimida `PlayerController.obj` NULL bo'ladi (`stop()` da
  //   tozalanadi). Shu sabab clip ro'yxati chiqmasdi. Sahnadagi doimiy
  //   "o'yinchi" belgisiga qaraymiz — u Play'dan tashqarida ham saqlanadi.
  if (window.objects) {
    const p = window.objects.find(o => o.userData && o.userData.isPlayerObj);
    if (p) return p;
  }
  return window.selectedObj || null;
}

/**
 * Nomga mos klipi BOR rigni topadi.
 *
 * ⚠ NEGA KERAK: panel va ijro har xil obyektga qarardi —
 *     panel  → `_kbTargetObj()`  (PlayerController → isPlayerObj → selectedObj)
 *     ijro   → PlayerController.obj || selectedObj   ← `isPlayerObj` YO'Q
 *   Natijada muharrirda kubni tanlab, unga biriktirilgan modelning
 *   klipini panelda KO'RASIZ, lekin O'yinda o'sha klavishni bossangiz
 *   HECH NIMA BO'LMAYDI: ijro `PlayerController.obj` ga boradi, unda
 *   esa bunday klip yo'q.
 *
 *   Endi klip KIMDA borligiga qarab qidiramiz. Tartib: asosiy nishon →
 *   o'yinchi belgisi → tanlangan → sahnadagi istalgan rigli obyekt.
 *   Shu tufayli model qaysi kubga biriktirilgan bo'lsa ham ishlaydi.
 */
function _kbFindRigWithClip(animName, primary) {
  const seen = new Set();
  const tryObj = o => {
    if (!o || seen.has(o)) return null;
    seen.add(o);
    const rig = _kbFindRig(o);
    if (!rig) return null;
    return _kbPickClip(rig.userData._clips, animName) ? rig : null;
  };

  let r = tryObj(primary);
  if (r) return r;
  r = tryObj(window.PlayerController && window.PlayerController.obj);
  if (r) return r;
  if (window.objects) {
    const p = window.objects.find(o => o.userData && o.userData.isPlayerObj);
    r = tryObj(p);
    if (r) return r;
  }
  r = tryObj(window.selectedObj);
  if (r) return r;

  // Oxirgi chora — sahnadagi har qanday rigli obyekt
  if (window.objects) {
    for (const o of window.objects) {
      const rig = tryObj(o);
      if (rig) return rig;
    }
  }
  return null;
}

function _triggerObjAnim(animName, sourceCode) {
  // ⚠ Panel bilan BIR XIL qoidadan foydalanamiz (`_kbTargetObj`) — ilgari
  //   bu yerda `isPlayerObj` tekshirilmasdi va panelda ko'ringan klip
  //   ijroda topilmasdi.
  let obj = _kbTargetObj();

  // Agar hech nima tanlanmagan bo'lsa, sahnadan birinchi non-static ob'ektni ol
  if (!obj && window.objects && window.objects.length) {
    obj = window.objects.find(o => !o.userData.isStatic && o.visible) || window.objects[0];
  }

  if (!obj) {
    if (window.log) log('⚠ Animatsiya: ob\'ekt tanlanmagan', 'lw');
    return;
  }

  // 1. GLB rig (skeleton) da clip qidirish — klip KIMDA borligiga qarab
  const rig = _kbFindRigWithClip(animName, obj) || _kbFindRig(obj);
  if (rig) {
    const clips = rig.userData._clips;
    const clip  = _kbPickClip(clips, animName);
    if (clip) {
      // sourceCode → klavish qo'yib yuborilganda to'xtatish uchun
      _kbPlayClip(rig, clip, sourceCode, !!_kbAnimDataFor(sourceCode).holdEnd);
      if (window.log) log(`🎬 [${_keyLabel(sourceCode)}] → GLB: ${clip.name}`, 'lok');
      return;
    }
    // ⚠ Rig BOR, lekin bunday nomli clip YO'Q.
    //
    //   Pastdagi 3–4 yo'llarga tushish XAVFLI: ular kubning O'ZINI
    //   buradi/siljitadi (timeline treki) yoki cho'zadi (bounce) —
    //   natijada "model aylanib ketdi, animatsiya ishlamadi" chiqadi.
    //
    //   LEKIN 2-yo'l (`animJson`) — foydalanuvchi O'ZI yuklagan
    //   animatsiya. Uni ham to'sib qo'ysak, quyidagi hol yuzaga keladi:
    //     • bo'sh kub + JSON animatsiya  → ISHLAYDI (rig yo'q, 2-yo'l)
    //     • kubga model biriktirilgach   → ISHLAMAYDI (rig paydo bo'ldi,
    //       shu yerda to'xtaydi)
    //   Ya'ni model biriktirish animatsiyani O'CHIRIB qo'yardi.
    //   Shuning uchun `animJson` bo'lsa — unga yo'l beramiz.
    const _ad = _kbAnimDataFor(sourceCode);
    if (!_ad.animJson) {
      if (window.log) {
        log(`⚠ "${animName}" — bunday animatsiya yo'q. Modelda bor: ` +
            clips.map(c => c.name).join(', '), 'lw');
      }
      return;
    }
    // animJson bor — pastdagi 2-yo'lga tushamiz
  }

  // 2. animJson (APEX JSON allaqachon parse qilingan) yoki animFile bor bo'lsa
  //    '@combo:N' → _kbCombos, '@afk:N' → _afkAnims, aks holda _kbAnimations
  const animData = _kbAnimDataFor(sourceCode);
  if (animData.animJson) {
    _playApexJsonData(obj, animData.animJson, animName, sourceCode);
    return;
  }
  if (animData.animFile) {
    // GLB yoki boshqa fayl — URL ishlatish (local server kerak bo'lsa)
    if (window.log) log('⚠ animFile fetch file:// da ishlamaydi. JSON fayl yuklang.', 'lw');
    return;
  }

  // 3. Timeline dan obyektning o'z keyframe larini ishlatish
  //
  //  ⚠ Bu blok `window.tlTracks` ni tekshirardi — u LOYIHADA UMUMAN
  //    E'LON QILINMAGAN (save-load.js da ham xuddi shu arvoh bor edi).
  //    Shart hech qachon bajarilmasdi, ya'ni timeline keyframelari
  //    klavishga hech qachon bog'lanmagan. Haqiqiy treklar
  //    `TimelineSystem.tracks` da.
  if (window.TimelineSystem && Array.isArray(TimelineSystem.tracks)) {
    const objId = obj.userData.id;
    const byId = TimelineSystem.tracks.find(tr =>
      String(tr.objId) === String(objId) && (tr.keyframes || []).length >= 2);
    if (byId) { _playTrackAnim(obj, byId.keyframes, sourceCode, animName); return; }

    const byName = TimelineSystem.tracks.find(tr =>
      tr.objName && tr.objName.toLowerCase() === String(animName).toLowerCase() &&
      (tr.keyframes || []).length >= 2);
    if (byName) { _playTrackAnim(obj, byName.keyframes, sourceCode, animName); return; }
  }

  // 4. Fallback: scale bounce
  if (window.log) log(`🎬 [${_keyLabel(sourceCode)}] → fallback bounce (animFile yo'q, tlTrack yo'q)`, 'lok');
  _stopKbAnim(sourceCode);
  const sy = obj.scale.y;
  let t = 0;
  let rafId;
  const step = () => {
    t += 0.1;
    obj.scale.y = sy + Math.sin(t * 8) * 0.07 * Math.max(0, 1 - t);
    if (t < 1.2) { rafId = requestAnimationFrame(step); }
    else { obj.scale.y = sy; delete window._kbActiveAnims[sourceCode]; }
  };
  rafId = requestAnimationFrame(step);
  window._kbActiveAnims[sourceCode] = { stop: () => { cancelAnimationFrame(rafId); obj.scale.y = sy; } };
}

// Keyframe normalizatsiyasi — ikkala formatni ham qabul qiladi:
//   YANGI (timeline v1+): { time, pos:{x,y,z}, rot:{x,y,z}, scale:{x,y,z}, ease, tangent }
//   ESKI:                 { t,  px,py,pz,      rx,ry,rz,    sx,sy,sz,     ease, tangent }
// _runKfLoop dan keyin barcha kod eski format maydonlarini (t, rx, sx ...) ishlatadi,
// shuning uchun bitta normalizatsiya nuqtasi yetarli.
function _normalizeKfs(kfs) {
  return kfs.map(kf => ({
    t:  kf.t  ?? kf.time     ?? 0,
    rx: kf.rx ?? kf.rot?.x   ?? 0,
    ry: kf.ry ?? kf.rot?.y   ?? 0,
    rz: kf.rz ?? kf.rot?.z   ?? 0,
    sx: kf.sx ?? kf.scale?.x ?? 1,
    sy: kf.sy ?? kf.scale?.y ?? 1,
    sz: kf.sz ?? kf.scale?.z ?? 1,
    ease: kf.ease, tangent: kf.tangent
  }));
}

// tlTracks keyframe laridan loop animatsiya o'ynash
function _playTrackAnim(obj, kfs, sourceCode, animName) {
  _stopKbAnim(sourceCode);
  _runKfLoop(obj, _normalizeKfs(kfs), animName, sourceCode);
}

// APEX JSON ob'ektidan (allaqachon parse qilingan) keyframe animatsiyasini o'ynash
function _playApexJsonData(obj, json, animName, sourceCode, once = false) {
  _stopKbAnim(sourceCode);

  let track = null;

  // ── YANGI FORMAT (timeline v1+): { version, duration, tracks: [{objName, keyframes}, ...] }
  if (Array.isArray(json.tracks)) {
    const found = json.tracks.find(t =>
        t.objName && t.objName.toLowerCase() === animName.toLowerCase() &&
        t.keyframes && t.keyframes.length > 1
      ) || json.tracks.find(t => t.keyframes && t.keyframes.length > 1);
    if (found) track = { keyframes: found.keyframes };
  }
  // ── ESKI FORMAT 1: { objects: [{name, track:{keyframes}}, ...] }
  else if (json.objects) {
    const found = json.objects.find(o =>
        o.name && o.name.toLowerCase() === animName.toLowerCase() &&
        o.track && o.track.keyframes && o.track.keyframes.length > 1
      ) || json.objects.find(o => o.track && o.track.keyframes && o.track.keyframes.length > 1);
    if (found) track = found.track;
  }
  // ── ESKI FORMAT 2: { track: { keyframes } } — bitta track
  else if (json.track) {
    track = json.track;
  }
  // ── ESKI FORMAT 3: { keyframes: [...] } — to'g'ridan keyframes
  else if (Array.isArray(json.keyframes)) {
    track = { keyframes: json.keyframes };
  }

  if (!track || !track.keyframes || track.keyframes.length < 2) {
    if (window.log) log(`⚠ [${animName}] JSON da keyframe topilmadi`, 'lw');
    return;
  }

  // Keyframe maydonlarini normalizatsiya qilish (yangi+eski format)
  const kfs = _normalizeKfs(track.keyframes);

  _runKfLoop(obj, kfs, animName, sourceCode, once);
}

function _runKfLoop(obj, kfs, animName, sourceCode, once = false) {
  const span = kfs[kfs.length-1].t - kfs[0].t;
  if (span <= 0) { if (window.log) log('⚠ Keyframe span = 0', 'lw'); return; }

  // FREEZE rejimi — _kbAnimations[sourceCode].holdEnd true bo'lsa, animatsiya tugagach
  // oxirgi kadrda qotib qoladi (loop'siz, asl holatga qaytmaydi). Kombolar uchun ham:
  // sourceCode '@combo:N' bo'lsa, _kbCombos[N].holdEnd dan o'qiymiz.
  let holdEnd = false;
  if (!once && typeof sourceCode === 'string') {
    if (sourceCode.startsWith('@combo:')) {
      const cIdx = parseInt(sourceCode.slice(7), 10);
      holdEnd = !!(window._kbCombos && window._kbCombos[cIdx] && window._kbCombos[cIdx].holdEnd);
    } else if (sourceCode.startsWith('@afk:')) {
      // AFK entry — mode === 'once' bo'lsa once'ni majburiy qilamiz (bir marta o'ynaydi)
      const aIdx = parseInt(sourceCode.slice(5), 10);
      const a = window._afkAnims && window._afkAnims[aIdx];
      if (a && a.mode === 'once') once = true;
    } else {
      holdEnd = !!(window._kbAnimations[sourceCode] && window._kbAnimations[sourceCode].holdEnd);
    }
  }

  const _modeStr = once ? 'bir' : (holdEnd ? 'freeze' : 'loop');
  if (window.log) log(`🎬 [${_keyLabel(sourceCode)}] → ${animName} (${kfs.length} KF, ${span.toFixed(2)}s, ${_modeStr})`, 'lok');

  // PlayerController tekshiruvi — bir marta boshida
  const isPlayerCtrl = !!(window.PlayerController && window.PlayerController.obj === obj);

  const origRot = obj.rotation.clone();
  const origSca = obj.scale.clone();
  const origPos = obj.position.clone();
  // Animatsiya bazasi: keyframe t=0 qiymatlari (joriy holatdan emas)
  const kf0 = kfs[0];
  const baseRx = kf0.rx !== undefined ? kf0.rx : origRot.x;
  const baseRy = kf0.ry !== undefined ? kf0.ry : origRot.y;
  const baseRz = kf0.rz !== undefined ? kf0.rz : origRot.z;
  const baseSx = kf0.sx !== undefined ? kf0.sx : origSca.x;
  const baseSy = kf0.sy !== undefined ? kf0.sy : origSca.y;
  const baseSz = kf0.sz !== undefined ? kf0.sz : origSca.z;
  // Pastki chegara = animatsiya boshlanishidagi Y - scaleY/2
  // Bu chegara animatsiya davomida o'zgarmaydi
  const bottomY = obj.position.y - obj.scale.y * 0.5;

  // Silliqlik parametrlari
  const FADE_IN_DUR  = 0.35; // boshlanish uchun sekund
  const FADE_OUT_DUR = 0.35; // to'xtash uchun sekund

  function ease(t) { return t * t * (3 - 2 * t); }
  // Cubic ease-in-out — yanada silliqroq
  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
  function interp(a, b, t, prop) {
    const alpha = b.t === a.t ? 1 : Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
    return a[prop] + (b[prop] - a[prop]) * ease(alpha);
  }

  let startTime = null;
  let rafId;
  let stopped = false;
  // Fade-out holati
  let fadeOutStart = null;
  let fadeOutFrom  = null; // to'xtatilgan paytdagi qiymatlar

  function frame(now) {
    if (stopped) return;
    if (!startTime) startTime = now;
    const elapsed = (now - startTime) / 1000;

    // --- Fade-out rejimi ---
    if (fadeOutStart !== null) {
      const ft = Math.min(1, (now - fadeOutStart) / (FADE_OUT_DUR * 1000));
      const blend = 1 - easeInOut(ft);
      const isPC = window.PlayerController && window.PlayerController.obj === obj;
      obj.rotation.x = origRot.x + (fadeOutFrom.rx - origRot.x) * blend;
      if (!isPC) obj.rotation.y = origRot.y + (fadeOutFrom.ry - origRot.y) * blend;
      obj.rotation.z = origRot.z + (fadeOutFrom.rz - origRot.z) * blend;
      const blendSy = origSca.y + (fadeOutFrom.sy - origSca.y) * blend;
      obj.scale.set(
        origSca.x + (fadeOutFrom.sx - origSca.x) * blend,
        blendSy,
        origSca.z + (fadeOutFrom.sz - origSca.z) * blend
      );
      if (!isPC) obj.position.y = bottomY + blendSy * 0.5;
      if (ft < 1) { rafId = requestAnimationFrame(frame); }
      else {
        if (!isPC) {
          obj.rotation.copy(origRot);
          obj.scale.copy(origSca);
          obj.position.y = origPos.y;
        } else {
          obj.rotation.x = origRot.x;
          obj.rotation.z = origRot.z;
          obj.scale.copy(origSca);
        }
      }
      return;
    }

    // --- Animatsiya frame ---
    // once=true bo'lsa — bir marta tugagach asl holatga qayt
    // holdEnd=true bo'lsa — bir marta tugagach oxirgi kadrda qotib qol
    if ((once || holdEnd) && elapsed >= span) {
      stopped = true;
      const isPC = window.PlayerController && window.PlayerController.obj === obj;
      if (holdEnd) {
        // Oxirgi kadr qiymatlarida qotirish
        const last = kfs[kfs.length - 1];
        obj.rotation.x = last.rx;
        obj.rotation.z = last.rz;
        if (!isPC) obj.rotation.y = last.ry;
        obj.scale.set(last.sx, last.sy, last.sz);
        if (!isPC) obj.position.y = bottomY + last.sy * 0.5;
      } else {
        // once: asl holatga qaytar
        obj.rotation.x = baseRx;
        obj.rotation.z = baseRz;
        if (!isPC) obj.rotation.y = baseRy;
      }
      delete window._kbActiveAnims[sourceCode];
      return;
    }
    const lt = kfs[0].t + (elapsed % span);

    let a = kfs[0], b = kfs[kfs.length-1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (lt >= kfs[i].t && lt <= kfs[i+1].t) { a = kfs[i]; b = kfs[i+1]; break; }
    }

    const tRx = interp(a,b,lt,'rx'), tRy = interp(a,b,lt,'ry'), tRz = interp(a,b,lt,'rz');
    const tSx = interp(a,b,lt,'sx') || origSca.x;
    const tSy = interp(a,b,lt,'sy') || origSca.y;
    const tSz = interp(a,b,lt,'sz') || origSca.z;

    // --- Fade-in blend ---
    // PlayerController uchun fade-in yo'q — darhol boshlansin
    const fadeBlend = isPlayerCtrl ? 1 : (elapsed < FADE_IN_DUR ? easeInOut(elapsed / FADE_IN_DUR) : 1);

    if (isPlayerCtrl) {
      obj.rotation.x = baseRx + (tRx - baseRx) * fadeBlend;
      obj.rotation.z = baseRz + (tRz - baseRz) * fadeBlend;
    } else {
      obj.rotation.x = baseRx + (tRx - baseRx) * fadeBlend;
      if (!obj.parent?.userData?._animProxy) obj.rotation.y = baseRy + (tRy - baseRy) * fadeBlend;
      obj.rotation.z = baseRz + (tRz - baseRz) * fadeBlend;
      const blendSy = baseSy + (tSy - baseSy) * fadeBlend;
      obj.scale.set(
        baseSx + (tSx - baseSx) * fadeBlend,
        blendSy,
        baseSz + (tSz - baseSz) * fadeBlend
      );
      obj.position.y = bottomY + blendSy * 0.5;
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
  window._kbActiveAnims[sourceCode] = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      obj.rotation.x = baseRx;
      obj.rotation.z = baseRz;
    }
  };
}

// APEX JSON fayldan keyframe animatsiyasini o'ynash (loop)
function _playApexJsonAnim(obj, fileUrl, animName, sourceCode) {
  // Oldingi animatsiyani to'xtat
  _stopKbAnim(sourceCode);

  fetch(fileUrl)
    .then(r => r.json())
    .then(json => {
      // JSON ichida ob'ekt track ni topish (nomi yoki birinchi track)
      let track = null;
      if (json.objects) {
        // animName bilan mos ob'ektni qidirish, yo'qsa birinchi track li ob'ektni ol
        const found = json.objects.find(o =>
          o.name && o.name.toLowerCase() === animName.toLowerCase() && o.track && o.track.keyframes && o.track.keyframes.length > 1
        ) || json.objects.find(o => o.track && o.track.keyframes && o.track.keyframes.length > 1);
        if (found) track = found.track;
      } else if (json.track) {
        track = json.track;
      }

      if (!track || !track.keyframes || track.keyframes.length < 2) {
        if (window.log) log(`⚠ [${animName}] JSON da keyframe topilmadi`, 'lw');
        return;
      }

      const kfs = track.keyframes;
      const duration = (json.duration || kfs[kfs.length-1].t || 1);
      const span = kfs[kfs.length-1].t - kfs[0].t;

      if (window.log) log(`🎬 [${_keyLabel(sourceCode)}] → APEX JSON: ${animName} (${kfs.length} KF, ${span.toFixed(2)}s, loop)`, 'lok');

      const origRot = obj.rotation.clone();
      const origSca = obj.scale.clone();
      const origPos = obj.position.clone();
      // Animatsiya bazasi: kf[0] qiymatlari
      const kf0 = kfs[0];
      const baseRx = kf0.rx !== undefined ? kf0.rx : origRot.x;
      const baseRy = kf0.ry !== undefined ? kf0.ry : origRot.y;
      const baseRz = kf0.rz !== undefined ? kf0.rz : origRot.z;
      const baseSx = kf0.sx !== undefined ? kf0.sx : origSca.x;
      const baseSy = kf0.sy !== undefined ? kf0.sy : origSca.y;
      const baseSz = kf0.sz !== undefined ? kf0.sz : origSca.z;
      // Pastki chegara sabit — ob'ekt zaminga kirmasin
      const bottomY = obj.position.y - obj.scale.y * 0.5;

      // Silliqlik parametrlari
      const FADE_IN_DUR  = 0.35;
      const FADE_OUT_DUR = 0.35;

      function easeSmooth(t) { return t * t * (3 - 2 * t); }
      function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
      function interp(a, b, t, prop) {
        const alpha = b.t === a.t ? 1 : Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
        return a[prop] + (b[prop] - a[prop]) * easeSmooth(alpha);
      }

      let startTime = null;
      let rafId;
      let stopped = false;
      let fadeOutStart = null;
      let fadeOutFrom  = null;

      function frame(now) {
        if (stopped) return;
        if (!startTime) startTime = now;
        const elapsed = (now - startTime) / 1000;

        // --- Fade-out rejimi ---
        if (fadeOutStart !== null) {
          const ft = Math.min(1, (now - fadeOutStart) / (FADE_OUT_DUR * 1000));
          const blend = 1 - easeInOut(ft);
          const isPC = window.PlayerController && window.PlayerController.obj === obj;
          obj.rotation.x = origRot.x + (fadeOutFrom.rx - origRot.x) * blend;
          if (!isPC) obj.rotation.y = origRot.y + (fadeOutFrom.ry - origRot.y) * blend;
          obj.rotation.z = origRot.z + (fadeOutFrom.rz - origRot.z) * blend;
          const blendSy = origSca.y + (fadeOutFrom.sy - origSca.y) * blend;
          obj.scale.set(
            origSca.x + (fadeOutFrom.sx - origSca.x) * blend,
            blendSy,
            origSca.z + (fadeOutFrom.sz - origSca.z) * blend
          );
          if (!isPC) obj.position.y = bottomY + blendSy * 0.5;
          if (ft < 1) { rafId = requestAnimationFrame(frame); }
          else {
            if (!isPC) { obj.rotation.copy(origRot); obj.position.y = origPos.y; }
            else { obj.rotation.x = origRot.x; obj.rotation.z = origRot.z; }
            obj.scale.copy(origSca);
          }
          return;
        }

        const lt = kfs[0].t + (span > 0 ? (elapsed % span) : 0);

        let a = kfs[0], b = kfs[kfs.length-1];
        for (let i = 0; i < kfs.length - 1; i++) {
          if (lt >= kfs[i].t && lt <= kfs[i+1].t) { a = kfs[i]; b = kfs[i+1]; break; }
        }

        const tRx = interp(a,b,lt,'rx'), tRy = interp(a,b,lt,'ry'), tRz = interp(a,b,lt,'rz');
        const tSx = interp(a,b,lt,'sx') || origSca.x;
        const tSy = interp(a,b,lt,'sy') || origSca.y;
        const tSz = interp(a,b,lt,'sz') || origSca.z;

        // --- Fade-in blend ---
        const isPlayerCtrl = window.PlayerController && window.PlayerController.obj === obj;
        const fadeBlend = isPlayerCtrl ? 1 : (elapsed < FADE_IN_DUR ? easeInOut(elapsed / FADE_IN_DUR) : 1);

        if (isPlayerCtrl) {
          obj.rotation.x = baseRx + (tRx - baseRx) * fadeBlend;
          obj.rotation.z = baseRz + (tRz - baseRz) * fadeBlend;
        } else {
          obj.rotation.x = baseRx + (tRx - baseRx) * fadeBlend;
          obj.rotation.y = baseRy + (tRy - baseRy) * fadeBlend;
          obj.rotation.z = baseRz + (tRz - baseRz) * fadeBlend;
          const blendSy = baseSy + (tSy - baseSy) * fadeBlend;
          obj.scale.set(
            baseSx + (tSx - baseSx) * fadeBlend,
            blendSy,
            baseSz + (tSz - baseSz) * fadeBlend
          );
          obj.position.y = bottomY + blendSy * 0.5;
        }

        rafId = requestAnimationFrame(frame);
      }

      rafId = requestAnimationFrame(frame);
      window._kbActiveAnims[sourceCode] = {
        stop: () => {
          if (stopped) return;
          stopped = true;
          cancelAnimationFrame(rafId);
          obj.rotation.x = baseRx;
          obj.rotation.z = baseRz;
        }
      };
    })
    .catch(err => {
      if (window.log) log(`⚠ JSON yuklashda xato: ${err.message}`, 'lw');
    });
}

// ============================================================
// SICHQONCHA HODISALARI (click / dblclick / hold / scroll)
// ============================================================
function _triggerMouseAnim(eventId) {
  const animName = (window._mouseAnimEvents || {})[eventId];
  if (!animName) return;
  // click, dblclick, wheel — bir martalik (loop emas)
  const once = (eventId === 'click' || eventId === 'dblclick' || eventId === 'wheelup' || eventId === 'wheeldown');
  const json = (window._mouseAnimJsons || {})[eventId];
  const obj = (window.PlayerController && window.PlayerController.obj)
            || window.selectedObj
            || (window.objects && window.objects.find(o => !o.userData.isStatic && o.visible))
            || null;
  if (!obj) return;
  if (json) {
    if (json.animFile) {
      _playApexJsonAnim(obj, json.animFile, animName, '🖱' + eventId);
    } else {
      _playApexJsonData(obj, json, animName, '🖱' + eventId, once);
    }
  } else {
    _triggerObjAnim(animName, '🖱' + eventId);
  }
}
window._triggerMouseAnim = _triggerMouseAnim;

(function _initMouseEvents() {
  // Canvas tayyor bo'lguncha kuting
  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { setTimeout(init, 800); return; }

    let pressTimer = null;

    canvas.addEventListener('click', () => _triggerMouseAnim('click'));
    canvas.addEventListener('dblclick', () => _triggerMouseAnim('dblclick'));

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      pressTimer = setTimeout(() => _triggerMouseAnim('presshold'), 500);
    });
    canvas.addEventListener('mouseup', () => {
      clearTimeout(pressTimer);
      _stopKbAnim('🖱presshold');
    });
    canvas.addEventListener('mouseleave', () => {
      clearTimeout(pressTimer);
      _stopKbAnim('🖱presshold');
    });

    canvas.addEventListener('wheel', e => {
      if (!window.isPlaying) return;
      const dir = e.deltaY < 0 ? 'wheelup' : 'wheeldown';
      const other = e.deltaY < 0 ? 'wheeldown' : 'wheelup';
      _stopKbAnim('🖱' + other);
      _triggerMouseAnim(dir);
    }, { passive: true });
  }
  init();
})();

// ============================================================
// SICHQONCHA YO'NALISH ANIMATSIYASI
// ============================================================
// Sichqoncha harakati yo'nalishiga qarab animatsiya trigger qiladi
(function _initMouseDirAnim() {
  let _accX = 0, _accY = 0;
  let _dirCooldown = false;
  const THRESHOLD = 80; // to'plangan harakat — shu qadar bo'lganda trigger
  const COOLDOWN  = 500; // ms

  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { setTimeout(init, 800); return; }

    canvas.addEventListener('mousemove', e => {
      if (!window.isPlaying) return;

      // movementX/Y — pointer lock yoki oddiy harakat
      const mx = e.movementX || 0;
      const my = e.movementY || 0;
      if (mx === 0 && my === 0) return;

      // Cooldown paytida ham to'planadi — kamera normal ishlaydi
      if (_dirCooldown) return;

      _accX += mx;
      _accY += my;

      if (Math.abs(_accX) < THRESHOLD && Math.abs(_accY) < THRESHOLD) return;

      let dirId;
      if (Math.abs(_accY) > Math.abs(_accX)) {
        dirId = _accY < 0 ? 'dirUp' : 'dirDown';
      } else {
        dirId = _accX < 0 ? 'dirLeft' : 'dirRight';
      }

      _accX = 0; _accY = 0;

      const animJson = (window._mouseAnimJsons || {})[dirId];
      const animName = (window._mouseAnimEvents || {})[dirId];
      if (!animJson && !animName) return;

      // Barcha yo'nalish timerlarini bekor qil
      ['dirUp','dirDown','dirLeft','dirRight'].forEach(d => {
        if (d !== dirId) _cancelDirTimer(d);
      });

      _triggerDirAnim(dirId);
      _dirCooldown = true;
      setTimeout(() => { _dirCooldown = false; }, COOLDOWN);
    });
  }
  init();
})();

function _triggerDirAnim(dirId) {
  const animName = (window._mouseAnimEvents || {})[dirId];
  if (!animName) return;
  const obj = (window.PlayerController && window.PlayerController.obj)
            || window.selectedObj
            || (window.objects && window.objects.find(o => !o.userData.isStatic && o.visible))
            || null;
  if (!obj) return;
  const json = (window._mouseAnimJsons || {})[dirId];
  if (!json) { _triggerObjAnim(animName, '🖱' + dirId); return; }

  const modes = window._mouseAnimModes || {};
  const m = modes[dirId] || { mode: 'loop', time: 3 };
  const sourceCode = '🖱' + dirId;

  // Avvalgi animatsiyani to'xtat
  _stopKbAnim(sourceCode);

  if (m.mode === 'loop') {
    // 1-rejim: loop — doim qaytarib turadi
    _playApexJsonData(obj, json, animName, sourceCode, false);

  } else if (m.mode === 'hold') {
    // 2-rejim: bir marta ishlaydi, oxirida qotib qoladi
    // Boshqa yo'nalish yoki tugma bosilganda to'xtaydi
    _playApexJsonData(obj, json, animName, sourceCode, true);
    // Qotib qolish uchun oxirgi frame ni saqlab qolamiz — stop qilmaymiz

  } else if (m.mode === 'time') {
    // 3-rejim: N sekund loop, keyin oxirgi frameda qotib qoladi
    _playApexJsonData(obj, json, animName, sourceCode, false);
    const sec = (m.time || 3) * 1000;
    const timer = setTimeout(() => {
      // Loop to'xtatiladi, qotib qoladi
      const active = window._kbActiveAnims && window._kbActiveAnims[sourceCode];
      if (active) active.stop();
      delete window._kbActiveAnims[sourceCode];
    }, sec);
    // Timer ni saqla — boshqa yo'nalishga o'tganda bekor qilinsin
    window._dirAnimTimers = window._dirAnimTimers || {};
    if (window._dirAnimTimers[sourceCode]) clearTimeout(window._dirAnimTimers[sourceCode]);
    window._dirAnimTimers[sourceCode] = timer;
  }

  if (window.log) log(`🖱 ${dirId} [${m.mode}] → ${animName}`, 'lok');
}

// Boshqa yo'nalishga o'tilganda oldingi timer bekor qilinsin
function _cancelDirTimer(dirId) {
  const sourceCode = '🖱' + dirId;
  if (window._dirAnimTimers && window._dirAnimTimers[sourceCode]) {
    clearTimeout(window._dirAnimTimers[sourceCode]);
    delete window._dirAnimTimers[sourceCode];
  }
}

window._triggerMouseAnim = _triggerMouseAnim;

(function _initMouseEvents() {
  // Canvas tayyor bo'lguncha kuting
  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { setTimeout(init, 800); return; }

    let pressTimer = null;

    canvas.addEventListener('click', () => _triggerMouseAnim('click'));
    canvas.addEventListener('dblclick', () => _triggerMouseAnim('dblclick'));

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      pressTimer = setTimeout(() => _triggerMouseAnim('presshold'), 500);
    });
    canvas.addEventListener('mouseup', () => {
      clearTimeout(pressTimer);
      _stopKbAnim('🖱presshold');
    });
    canvas.addEventListener('mouseleave', () => {
      clearTimeout(pressTimer);
      _stopKbAnim('🖱presshold');
    });

    canvas.addEventListener('wheel', e => {
      if (!window.isPlaying) return;
      const dir = e.deltaY < 0 ? 'wheelup' : 'wheeldown';
      const other = e.deltaY < 0 ? 'wheeldown' : 'wheelup';
      _stopKbAnim('🖱' + other);
      _triggerMouseAnim(dir);
    }, { passive: true });
  }
  init();
})();

// ============================================================
// O'RTA TUGMA → 4 YO'NALISH MENUSI
// ============================================================
(function _initMiddleMouseMenu() {
  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { setTimeout(init, 800); return; }

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 1) return;
      e.preventDefault();
      _showDirMenu(e.clientX, e.clientY);
    });
  }
  init();
})();

function _showDirMenu(cx, cy) {
  // Eski menuni yop
  const old = document.getElementById('dir-menu-wrap');
  if (old) { old.remove(); return; }

  // CSS inject
  if (!document.getElementById('dir-menu-style')) {
    const s = document.createElement('style');
    s.id = 'dir-menu-style';
    s.textContent = `
      @keyframes dirIn { from{opacity:0;transform:translate(-50%,-50%) scale(.7)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      .dir-btn {
        position:fixed; transform:translate(-50%,-50%);
        width:50px; height:50px; border-radius:10px;
        background:rgba(5,12,25,.92); border:1px solid rgba(var(--accent-rgb),.25);
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        cursor:pointer; z-index:99997; font-size:18px; gap:2px;
        box-shadow:0 4px 20px rgba(0,0,0,.6);
        animation:dirIn .15s ease; pointer-events:auto;
        transition:background .12s, border-color .12s, transform .12s;
        font-family:'Share Tech Mono',monospace;
      }
      .dir-btn:hover { background:rgba(var(--accent-rgb),.15); border-color:rgba(var(--accent-rgb),.7); transform:translate(-50%,-50%) scale(1.14); }
      .dir-btn span { font-size:7px; color:var(--border); }
      .dir-btn:hover span { color:var(--accent)88; }
      #dir-center {
        position:fixed; transform:translate(-50%,-50%);
        width:20px; height:20px; border-radius:50%;
        background:rgba(var(--accent-rgb),.15); border:2px solid rgba(var(--accent-rgb),.5);
        z-index:99997; pointer-events:none;
        box-shadow:0 0 16px rgba(var(--accent-rgb),.3);
        animation:dirIn .12s ease;
      }
    `;
    document.head.appendChild(s);
  }

  const wrap = document.createElement('div');
  wrap.id = 'dir-menu-wrap';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99996;pointer-events:none';
  document.body.appendChild(wrap);

  // Markaziy doira
  const center = document.createElement('div');
  center.id = 'dir-center';
  center.style.left = cx + 'px';
  center.style.top = cy + 'px';
  wrap.appendChild(center);

  const R = 90; // masofa
  const dirs = [
    { id:'dirUp',    icon:'⬆', lbl:'Tepaga', dx:0,  dy:-R },
    { id:'dirDown',  icon:'⬇', lbl:'Pastga', dx:0,  dy:+R },
    { id:'dirLeft',  icon:'⬅', lbl:'Chapga', dx:-R, dy:0  },
    { id:'dirRight', icon:'➡', lbl:"O'ngga", dx:+R, dy:0  },
  ];

  const btnEls = [];
  dirs.forEach(dir => {
    const btn = document.createElement('div');
    btn.className = 'dir-btn';
    btn.style.left = (cx + dir.dx) + 'px';
    btn.style.top  = (cy + dir.dy) + 'px';
    btn.style.pointerEvents = 'auto';

    const animName = (window._mouseAnimEvents || {})[dir.id] || '';
    btn.innerHTML = `${dir.icon}<span>${animName || dir.lbl}</span>`;

    btn.addEventListener('mouseenter', () => btn.style.borderColor = 'rgba(var(--accent-rgb),.7)');
    btn.addEventListener('mouseleave', () => btn.style.borderColor = 'rgba(var(--accent-rgb),.25)');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _execDirAnim(dir.id, animName, dir.lbl);
      wrap.remove();
    });
    wrap.appendChild(btn);
    btnEls.push(btn);
  });

  // Yopish
  const close = e => {
    if (e.button === 1 || e.type === 'keydown') { wrap.remove(); document.removeEventListener('mouseup', close); document.removeEventListener('keydown', close); return; }
    if (!btnEls.some(b => b.contains(e.target))) {
      wrap.remove(); document.removeEventListener('mouseup', close); document.removeEventListener('keydown', close);
    }
  };
  setTimeout(() => {
    document.addEventListener('mouseup', close);
    document.addEventListener('keydown', close);
  }, 50);
}

function _execDirAnim(dirId, animName, fallbackLabel) {
  // ⚠ Ilgari faqat `selectedObj` olinardi — Play rejimida hech nima
  //   tanlanmagan bo'lsa rig topilmay, pastdagi "tween" ishga tushardi
  //   va model shunchaki AYLANARDI. Endi `_triggerObjAnim` bilan bir xil.
  const obj = _kbTargetObj();
  if (!obj) { if(window.log) log('⚠ Avval obyekt tanlang', 'lw'); return; }

  // GLB animatsiya qidirish
  if (animName) {
    const rig = _kbFindRigWithClip(animName, obj) || _kbFindRig(obj);   // klip egasini topamiz
    if (rig) {
      const clip = _kbPickClip(rig.userData._clips, animName);
      if (clip) {
        _kbPlayClip(rig, clip, dirId, false);
        if(window.log) log(`🎯 ${fallbackLabel} → 🎬 ${clip.name}`, 'lok');
        return;
      }
      // Rig bor, nom mos emas — buramaymiz, ogohlantiramiz
      if(window.log) log(`⚠ "${animName}" yo'q. Modelda bor: ` +
        rig.userData._clips.map(c => c.name).join(', '), 'lw');
      return;
    }
  }

  // Fallback tween animatsiya
  const startRY = obj.rotation.y, startRX = obj.rotation.x;
  const deltaY = dirId==='dirLeft'?-0.5 : dirId==='dirRight'?0.5 : 0;
  const deltaX = dirId==='dirUp'?-0.3 : dirId==='dirDown'?0.3 : 0;
  const dur = 380, t0 = Date.now();

  function ease(t){ return t<.5?2*t*t:-1+(4-2*t)*t; }

  function goThere() {
    const t = Math.min(1,(Date.now()-t0)/dur);
    obj.rotation.y = startRY + deltaY * ease(t);
    obj.rotation.x = startRX + deltaX * ease(t);
    if(t<1) requestAnimationFrame(goThere);
    else {
      const t1 = Date.now();
      function goBack() {
        const t2 = Math.min(1,(Date.now()-t1)/dur);
        obj.rotation.y = startRY + deltaY * (1-ease(t2));
        obj.rotation.x = startRX + deltaX * (1-ease(t2));
        if(t2<1) requestAnimationFrame(goBack);
        else { obj.rotation.y = startRY; obj.rotation.x = startRX; }
      }
      requestAnimationFrame(goBack);
    }
  }
  requestAnimationFrame(goThere);
  if(window.log) log(`🎯 ${fallbackLabel} animatsiya (fallback)`, 'lok');
}

// Inspector uchun helper (fayl input onchange)
window._addKeyAnim = function(event, action, keyCode) {
  const f = event.target.files[0];
  if (!f) return;
  const nm = f.name.replace(/\.\w+$/, '');
  //  ⚠ NISHONDAN: 🎛 zona tahrirlanayotgan bo'lsa animatsiya
  //    o'sha zonaga yozilishi kerak, global sozlamaga EMAS.
  //    Bu yo'l qolib ketgan edi — shu bois muharrir \"globalga
  //    ta'sir qilyapti\" bo'lib ko'rinardi.
  const _t1 = _kbTable();
  if (!_t1[keyCode]) _t1[keyCode] = {};
  _t1[keyCode].animName = nm;
  if (window.log) log('🎬 ' + action + ' → ' + nm, 'lok');
  if (window.updateInspector) updateInspector();
};


// ============================================================
//  🦴 _bkmImportAnim — klavish popupidagi 📁 Fayl tugmasi
//
//  ⚠ ILGARI: obrabotchik HTML atributi ichiga yozilgan edi va
//    aslida hech nima qilmasdi:
//       • `.json` → xom obyekt sifatida `animJson` ga qo'yilardi
//       • `.glb` / `.fbx` → `URL.createObjectURL(f)` bilan
//         `animFile` ga yozilardi, ijro paytida esa shunchaki
//         "⚠ animFile fetch file:// da ishlamaydi" chiqib to'xtardi.
//    Ya'ni FBX qabul qilinardi, LEKIN `libs/` da FBXLoader umuman
//    yo'q edi. Animatsiyani ishlatishning yagona yo'li — uni
//    modelning O'ZIGA biriktirib, GLB qilib qayta eksport qilish.
//
//  ENDI: fayl o'qiladi, klipilar modelning MAVJUD skeletiga qayta
//  moslanadi (`AnimImport`) va `_clips` ga qo'shiladi — ya'ni
//  modeldan chiqqan animatsiyalar bilan bir xil yo'ldan ijro etiladi.
// ============================================================
window._bkmImportAnim = async function(file, code) {
  if (!file) return;
  const nm = file.name.replace(/\.\w+$/, '');
  const inp = document.getElementById('bkm-aname');

  const _t2 = _kbTable();
  if (!_t2[code]) _t2[code] = {};

  const target = _kbFindRig(_kbTargetObj()) || _kbTargetObj();
  if (!target) {
    if (window.log) log('⚠ Avval o\'yinchi modelini tanlang', 'lw');
    return;
  }

  if (!window.AnimImport) {
    if (window.log) log('❌ AnimImport yuklanmagan', 'le');
    return;
  }

  const res = await AnimImport.importToModel(file, target);

  // 📄 APEX obyekt eksporti — suyak animatsiyasi emas, obyekt
  //    keyframelari. Eski yo'l bilan ijro etiladi.
  if (!res.ok && res.reason === 'apex') {
    _t2[code].animJson = res.apex;
    _t2[code].animName = nm;
    if (inp) inp.value = nm;
    if (window.log) log('📄 APEX JSON yuklandi: ' + nm, 'lok');
    return;
  }

  if (!res.ok) return;   // sabab AnimImport tomonidan log'ga yozilgan

  // Birinchi qo'shilgan klip nomini maydonga qo'yamiz
  const first = res.names[0];
  _t2[code].animName = first;
  if (inp) inp.value = first;

  // ⚠ `animFile` ni TOZALAYMIZ — eski, ishlamaydigan yo'l qolib
  //   ketmasin (u ijroda "fetch file:// da ishlamaydi" deb to'xtatardi).
  delete _t2[code].animFile;
  delete _t2[code].animJson;

  // Popup ochiq bo'lsa — klip tugmalari ro'yxatini yangilaymiz
  const box = document.getElementById('bkm-clips');
  if (box && target.userData && Array.isArray(target.userData._clips)) {
    box.innerHTML = target.userData._clips.map(c =>
      `<button class="bkm-clip" data-clip="${_kbEsc(c.name)}"
        style="background:${c.name === first ? 'rgba(var(--accent-rgb),.25)' : 'rgba(var(--accent-rgb),.08)'};
               border:1px solid ${c.name === first ? 'var(--accent)' : 'rgba(var(--accent-rgb),.3)'};
               color:var(--accent);padding:4px 8px;border-radius:3px;cursor:pointer;
               font-family:'Share Tech Mono',monospace;font-size:9px"
        >${_kbEsc(c.name)}</button>`).join('');
    box.querySelectorAll('.bkm-clip').forEach(b => {
      b.onclick = () => { if (inp) { inp.value = b.dataset.clip; inp.focus(); } };
    });
  }
};
