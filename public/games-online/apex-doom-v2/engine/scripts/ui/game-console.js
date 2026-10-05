// ============================================================
// 🖥 GAME CONSOLE — o'yin ichidagi razrabotchiklar konsoli
// ------------------------------------------------------------
//  Bu fayl FAQAT eksport qilingan o'yinga (game.zip) tushadi va
//  faqat "Razrabotchiklar konsoli" belgilangan bo'lsa yuklanadi.
//  Redaktorda u kerak emas — u yerda konsol pastda turadi.
//
//  ⚠ NEGA yangi konsol yozilmadi?
//    Butun dvigatel `log()` orqali yozadi, `log()` esa `#console-body`
//    elementiga qo'shadi (`scripts/core/lang.js`). O'yin CSS'i uni
//    yashiradi, lekin element JOYIDA turadi va matn unga tushaveradi.
//    Shu bois bu yerда ikkinchi jurnal YOZILMAYDI — mavjud
//    `#console-body` uchib yuradigan oynaga KO'CHIRIB olinadi.
//    Natijada `log()` ning har bir chaqirig'i bepul ishlaydi va
//    ikki manba bir-biridan uzilib qolmaydi.
//
//  Sozlama `window.APEX_GAME_CONSOLE` orqali keladi (index.html):
//     { key: '`' }   ← ochish/yopish tugmasi
// ============================================================

(function () {
  'use strict';

  const CFG = window.APEX_GAME_CONSOLE || {};
  const KEY = CFG.key || '`';

  let panel = null, bodyBox = null, inputEl = null, open = false;
  const history = [];
  let histIdx = -1;

  // ── Komandalar reyestri ────────────────────────────────────
  //   Keyinroq qo'shiladigan komandalar shu yerga ulanadi:
  //     GameConsole.register('tp', (args) => {...}, 'teleport x y z');
  const CMDS = Object.create(null);

  //  meta: { forms: [...], hint: (args, partial) => [...] }
  //    forms — avtoto'ldirishda ko'rsatiladigan TAYYOR shakllar
  //            (masalan 'apex.start - see')
  //    hint  — argument o'rnida nima taklif qilinsin (obyekt nomlari,
  //            preset nomlari, 0/1 …)
  function register(name, fn, help, usage, meta) {
    meta = meta || {};
    CMDS[String(name).toLowerCase()] = {
      fn, help: help || '', usage: usage || '',
      forms: meta.forms || null, hint: meta.hint || null,
    };
  }

  function say(msg, type) {
    if (typeof log === 'function') log(msg, type || 'lg');
    else if (bodyBox) {
      const d = document.createElement('div');
      d.className = type || 'lg';
      d.textContent = msg;
      bodyBox.appendChild(d);
    }
  }

  // ── Bazaviy komandalar ─────────────────────────────────────
  register('help', (args) => {
    const q = String(args[0] || '').toLowerCase();
    const names = Object.keys(CMDS).sort();
    if (q && CMDS[q]) {
      const c = CMDS[q];
      say(`<b style="color:var(--accent3)">${q}</b> — ${c.help}`, 'lok');
      if (c.usage) say('   ' + c.usage.replace(/</g, '&lt;'), 'lg');
      return;
    }
    say(`<b style="color:var(--accent3)">📖 KOMANDALAR (${names.length})</b>`, 'lok');
    names.forEach(n => {
      const c = CMDS[n];
      say(`<b style="color:var(--accent)">${n}</b>` +
          (c.help ? ` <span style="color:#8899aa">— ${c.help}</span>` : ''), 'lg');
      if (c.usage) say(`   <span style="color:#4a5568">${c.usage.replace(/</g, '&lt;')}</span>`, 'lg');
    });
    say('<span style="color:#8899aa">Nom o\'rniga id ishlatsa bo\'ladi. ' +
        '~ — o\'yinchining joyi, ~5 — undan +5.</span>', 'lg');
  }, 'komandalar ro\'yxati', 'help [komanda nomi]');

  register('clear', () => { if (bodyBox) bodyBox.innerHTML = ''; }, 'konsolni tozalash');

  register('close', () => toggle(false), 'konsolni yopish');

  // ── Komanda qatorini bo'laklarga ajratish ──────────────────
  //  ⚠ Oddiy `split(/\s+/)` yetmaydi. Komandalar ikki shaklda keladi:
  //      create.object("Kub 3") ~ ~ ~
  //      object.source - Kub3 color 255 0 0
  //    Birinchisida NOM QAVS ichida va ichida BO'SHLIQ bor —
  //    bo'shliq bo'yicha bo'lsak nom ikkiga bo'linib ketardi.
  //    Ikkinchisida `-` shunchaki bezak, u argument emas.
  //
  //  Shu bois: qavs va qo'shtirnoq ichidagisi BUTUN bo'lak bo'ladi,
  //  yakka `-` esa tashlab yuboriladi.
  const _TOK = /"([^"]*)"|'([^']*)'|\(([^)]*)\)|([^\s(),]+)/g;
  function tokenize(str) {
    const out = [];
    let m;
    _TOK.lastIndex = 0;
    while ((m = _TOK.exec(str)) !== null) {
      let v;
      if (m[1] !== undefined)      v = m[1];
      else if (m[2] !== undefined) v = m[2];
      else if (m[3] !== undefined) v = m[3].trim().replace(/^["']|["']$/g, '');
      else                         v = m[4];
      if (v === '-' || v === '') continue;     // bezak chizig'i
      out.push(v);
    }
    return out;
  }
  window._apexTokenize = tokenize;

  function run(line) {
    const s = String(line || '').trim();
    if (!s) return;
    history.push(s); histIdx = history.length;
    say('<span style="color:var(--accent3)">&gt;</span> ' + s.replace(/</g, '&lt;'), 'lg');

    // Komanda nomi — birinchi bo'shliq YOKI qavsgacha
    const nm = s.match(/^([^\s(]+)/);
    const name = nm ? nm[1].toLowerCase() : '';
    const rest = nm ? s.slice(nm[1].length) : '';
    const args = tokenize(rest);
    const cmd  = CMDS[name];
    if (!cmd) {
      say("❓ Noma'lum komanda: " + name + "  (help — ro'yxat)", 'lw');
      return;
    }
    try { cmd.fn(args, rest, s); }
    catch (e) { say('❌ ' + (e && e.message ? e.message : e), 'le'); }
  }

  // ── Oyna ───────────────────────────────────────────────────
  function build() {
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'apex-game-console';
    panel.style.cssText =
      'position:fixed;left:40px;top:60px;width:520px;height:300px;z-index:100000;' +
      'display:none;flex-direction:column;background:rgba(8,11,18,.96);' +
      'border:1px solid var(--accent);border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,.8);' +
      "font-family:'Share Tech Mono','Courier New',monospace;overflow:hidden;min-width:280px;min-height:160px;resize:both";

    // Sarlavha (sudrash uchun)
    const head = document.createElement('div');
    head.style.cssText =
      'height:26px;flex-shrink:0;display:flex;align-items:center;gap:8px;padding:0 8px;' +
      'background:rgba(var(--accent-rgb),.08);border-bottom:1px solid rgba(var(--accent-rgb),.25);' +
      'color:var(--accent);font-size:11px;letter-spacing:1px;cursor:move;user-select:none';
    head.innerHTML =
      '<span style="flex:1">🖥 KONSOL</span>' +
      '<span style="color:#4a5568;font-size:9px">' + _keyLabelSafe() + ' — yopish</span>' +
      '<span id="agc-x" style="cursor:pointer;color:#4a5568;font-size:15px;line-height:1;padding:0 3px">✕</span>';
    panel.appendChild(head);

    // Jurnal joyi — `#console-body` shu yerga KO'CHIRILADI
    const wrap = document.createElement('div');
    wrap.id = 'agc-body-wrap';
    wrap.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0';
    panel.appendChild(wrap);

    // Kiritish qatori
    const row = document.createElement('div');
    row.style.cssText =
      'flex-shrink:0;display:flex;align-items:center;gap:6px;padding:5px 8px;' +
      'border-top:1px solid rgba(var(--accent-rgb),.2);background:rgba(var(--accent-rgb),.03)';
    row.innerHTML = '<span style="color:var(--accent3);font-size:12px">&gt;</span>';
    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.id = 'agc-input';
    inputEl.autocomplete = 'off';
    inputEl.spellcheck = false;
    inputEl.placeholder = "komanda… (help)";
    inputEl.style.cssText =
      'flex:1;background:transparent;border:none;outline:none;color:#e6edf3;' +
      "font-family:'Share Tech Mono','Courier New',monospace;font-size:11px;padding:2px 0";
    row.appendChild(inputEl);
    panel.appendChild(row);

    document.body.appendChild(panel);

    head.querySelector('#agc-x').onclick = () => toggle(false);
    _makeDraggable(panel, head);

    // ⚠ Bu yerда `inputEl.addEventListener('keydown', …)` YO'Q — va bo'lishi
    //   ham mumkin emas. Pastdagi hujjat darajasidagi CAPTURE tinglovchi
    //   `stopImmediatePropagation()` chaqiradi, u esa hodisani MAQSADGA
    //   TUSHIRMAYDI: input o'z tinglovchisini hech qachon eshitmasdi
    //   (Enter/Escape/strelkalar ishlamay qolgandi). Shu bois kiritish
    //   mantiqi `_handleInputKey()` ga ko'chirildi va o'sha capture
    //   tinglovchining ICHIDAN chaqiriladi.
    // Yozilgan zahoti takliflar yangilanadi.
    // ⚠ `input` hodisasi `keydown` dan KEYIN chiqadi va biz uni
    //   bloklamaymiz — shu bois qiymat allaqachon yangilangan bo'ladi.
    inputEl.addEventListener('input', refreshSuggest);
    inputEl.addEventListener('blur', () => setTimeout(hideSuggest, 120));
    window.addEventListener('resize', () => { if (sugList.length) renderSuggest(); });

    _adoptConsoleBody(wrap);
    return panel;
  }

  // ⚠ Dvigatelning jurnal elementini KO'CHIRIB olamiz. `log()` ichida
  //   element havolasi (`consoleEl`) saqlanadi — ko'chirish uni buzmaydi,
  //   chunki DOM tugunining o'zi o'zgarmaydi.
  function _adoptConsoleBody(wrap) {
    bodyBox = document.getElementById('console-body');
    if (!bodyBox) {   // topilmasa — o'zimiz yaratamiz
      bodyBox = document.createElement('div');
      bodyBox.id = 'console-body';
    }
    bodyBox.style.cssText =
      'flex:1;min-height:0;overflow-y:auto;padding:4px 8px;font-size:10px;line-height:1.65;' +
      'display:block;color:#e6edf3';
    wrap.appendChild(bodyBox);
    bodyBox.scrollTop = bodyBox.scrollHeight;
  }

  function _makeDraggable(el, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, on = false;
    handle.addEventListener('mousedown', e => {
      if (e.target && e.target.id === 'agc-x') return;
      on = true; sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!on) return;
      el.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
      el.style.top  = Math.max(0, oy + e.clientY - sy) + 'px';
      if (sugList.length) renderSuggest();   // taklif ro'yxati ergashsin
    });
    document.addEventListener('mouseup', () => { on = false; });
  }

  function _keyLabelSafe() {
    return KEY === '`' ? '~/`' : KEY.toUpperCase();
  }

  // ── ⌨ Bosilib qolgan klavishlarni tozalash ─────────────────
  //  ⚠ MUAMMO (o'yinda "oyinchi g'irilab yuradi"): W ni bosib turib
  //    konsol ochilsa, fokus kiritish qatoriga ko'chadi va W ning
  //    KEYUP hodisasi maqsad sifatida INPUT ni oladi. Dvigatel esa
  //    keyup ni eshitmay qoladi → `PlayerController.keys.KeyW` MANGU
  //    `true` bo'lib qoladi va oyinchi tugma qo'yvorilgach ham
  //    to'xtovsiz siljib yuraveradi.
  //
  //    Yechim ikki qavatli:
  //      1) keyup NI UMUMAN BLOKLAMAYMIZ — u dvigatelga yetib borsin
  //         (u faqat `keys[code] = false` qiladi, zarari yo'q);
  //      2) konsol ochilganda VA yopilganda holatni tozalaymiz.
  function _flushKeys() {
    try {
      if (window.PlayerController && PlayerController.keys) {
        for (const k in PlayerController.keys) PlayerController.keys[k] = false;
      }
    } catch (e) {}
    try {
      if (typeof fpsKeys !== 'undefined' && fpsKeys) {
        for (const k in fpsKeys) fpsKeys[k] = false;
      }
    } catch (e) {}
    // Tezlikni ham so'ndiramiz — inersiya bilan sirg'alib ketmasin
    try {
      if (window.PlayerController && PlayerController.vel) PlayerController.vel.x = PlayerController.vel.z = 0;
    } catch (e) {}
  }

  // ── Ochish / yopish ────────────────────────────────────────
  function toggle(force) {
    build();
    open = (force === undefined) ? !open : !!force;
    panel.style.display = open ? 'flex' : 'none';
    _flushKeys();
    if (open) {
      // Sichqoncha qulfini qo'yvoramiz — aks holda yozib bo'lmaydi
      try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
      if (bodyBox) bodyBox.scrollTop = bodyBox.scrollHeight;
      setTimeout(() => { try { inputEl.focus(); } catch (e) {} }, 0);
    } else {
      try { inputEl.blur(); } catch (e) {}
      hideSuggest();
    }
    return open;
  }

  // ── Klavish ushlash ────────────────────────────────────────
  //  ⚠ CAPTURE fazasida va SKRIPT YUKLANGANDA ro'yxatdan o'tamiz.
  //    `PlayerController.start()` o'z tinglovchisini Play bosilganda —
  //    ya'ni BIZDAN KEYIN qo'shadi. Bir xil tugunda capture tinglovchilar
  //    qo'shilish tartibida ishlaydi, demak biz birinchi bo'lamiz va
  //    konsolga yozilayotgan harflar o'yinchini yurgizib yubormaydi.
  function _isTyping(t) {
    return !!(t && (t === inputEl || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' ||
                    t.isContentEditable));
  }

  // ============================================================
  //  ⌨ AVTOTO'LDIRISH
  // ------------------------------------------------------------
  //  Komandalar uzun va aniq yoziladi (`object.collision-hitboks`).
  //  Har birini yoddan yozish noqulay, shuning uchun yozilgan
  //  bo'lakka mos variantlar konsol TAGIDA ro'yxat bo'lib chiqadi.
  //
  //  Boshqaruv (foydalanuvchi so'raganidek):
  //    Tab        — ro'yxat bo'ylab pastga tushish (Shift+Tab — yuqoriga)
  //    Enter      — TANLANGAN variant bo'lsa uni qo'yadi
  //    Enter      — hech narsa tanlanmagan bo'lsa komandani YUBORADI
  //    Esc        — ro'yxatni yopadi (konsolni emas)
  //
  //  ⚠ Ro'yxat `document.body` ga qo'shiladi, panelning ichiga emas:
  //    panelda `overflow:hidden` bor va ichkarida bo'lsa ro'yxat
  //    pastdan qirqilib qolardi. Shu sabab joyi har safar
  //    kiritish qatorining haqiqiy o'rniga qarab hisoblanadi.
  // ============================================================
  let sugBox = null, sugList = [], sugIdx = -1;

  function _sugEl() {
    if (sugBox) return sugBox;
    sugBox = document.createElement('div');
    sugBox.id = 'agc-suggest';
    sugBox.style.cssText =
      'position:fixed;z-index:100001;display:none;max-height:190px;overflow-y:auto;' +
      'background:rgba(8,11,18,.98);border:1px solid var(--accent);border-top:none;' +
      'border-radius:0 0 5px 5px;box-shadow:0 8px 26px rgba(0,0,0,.7);' +
      "font-family:'Share Tech Mono','Courier New',monospace;font-size:11px";
    document.body.appendChild(sugBox);
    return sugBox;
  }

  /** Qavslar muvozanati — `("Kub 3"` dan keyin `)` qo'shiladi. */
  function _balance(s) {
    let o = 0;
    for (let i = 0; i < s.length; i++) { if (s[i] === '(') o++; else if (s[i] === ')') o--; }
    return o > 0 ? s + ')'.repeat(o) : s;
  }

  function computeSuggestions(value) {
    const v = String(value || '');
    const headM = v.match(/^([^\s(]*)/);
    const head  = headM ? headM[1] : '';

    // (1) Hali komanda nomi yozilyapti — nomlar va tayyor shakllar
    if (v.length === head.length) {
      const low = head.toLowerCase();
      const out = [], seen = {};
      Object.keys(CMDS).sort().forEach(n => {
        const c = CMDS[n];
        [n].concat(c.forms || []).forEach(s => {
          if (low && s.toLowerCase().indexOf(low) < 0) return;
          if (seen[s]) return;
          seen[s] = 1;
          // Aniq boshlanish yuqoriroq turadi
          out.push({ text: s, desc: c.help, whole: true,
                     rank: s.toLowerCase().indexOf(low) === 0 ? 0 : 1 });
        });
      });
      out.sort((a, b) => (a.rank - b.rank) || (a.text.length - b.text.length));
      return out.slice(0, 14);
    }

    // (2) Argument yozilyapti — komandaning o'z maslahatchisi
    const c = CMDS[head.toLowerCase()];
    if (!c || !c.hint) return [];
    const tail = v.slice(head.length);
    const openTok = /[\s(]$/.test(v) ? '' : (tail.match(/[^\s()"']*$/) || [''])[0];
    // ⚠ Prefiksdagi YOPILMAGAN `(` yoki `"` ni tashlab yuboramiz.
    //   Aks holda `remove.object("Max` da tokenizer `"` ni ALOHIDA
    //   argument deb sanab, "birinchi argument allaqachon yozilgan"
    //   degan xulosaga kelardi va obyekt nomlari taklif qilinmasdi.
    const prefix = (openTok ? tail.slice(0, tail.length - openTok.length) : tail)
                     .replace(/["'(]+$/, '');
    const done = tokenize(prefix);
    let list = [];
    try { list = c.hint(done, openTok) || []; } catch (e) { list = []; }
    const low = openTok.toLowerCase().replace(/^["']/, '');
    return list
      .map(s => (typeof s === 'string' ? { text: s } : s))
      .filter(s => !low || s.text.toLowerCase().indexOf(low) >= 0)
      .slice(0, 14);
  }

  function renderSuggest() {
    const el = _sugEl();
    if (!open || !sugList.length) { el.style.display = 'none'; return; }
    el.innerHTML = sugList.map((s, i) => {
      const sel = (i === sugIdx);
      return `<div data-i="${i}" style="padding:4px 9px;cursor:pointer;white-space:nowrap;` +
             `display:flex;gap:10px;align-items:baseline;` +
             `background:${sel ? 'rgba(var(--accent-rgb),.16)' : 'transparent'};` +
             `color:${sel ? 'var(--accent)' : '#c9d4e0'}">` +
             `<span>${s.text.replace(/</g, '&lt;')}</span>` +
             (s.desc ? `<span style="color:#4a5568;font-size:9px;margin-left:auto">${s.desc}</span>` : '') +
             `</div>`;
    }).join('');
    // Joylashuv — kiritish qatorining ostiga
    const r = inputEl.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    el.style.left  = pr.left + 'px';
    el.style.width = pr.width + 'px';
    el.style.display = 'block';
    const below = window.innerHeight - pr.bottom;
    if (below < 90 && pr.top > 200) {          // pastda joy yo'q — tepaga
      el.style.top = 'auto';
      el.style.bottom = (window.innerHeight - pr.top) + 'px';
      el.style.borderRadius = '5px 5px 0 0';
      el.style.borderTop = '1px solid var(--accent)';
      el.style.borderBottom = 'none';
    } else {
      el.style.bottom = 'auto';
      el.style.top = pr.bottom + 'px';
      el.style.borderRadius = '0 0 5px 5px';
      el.style.borderTop = 'none';
      el.style.borderBottom = '1px solid var(--accent)';
    }
    Array.prototype.forEach.call(el.children, ch => {
      ch.onmousedown = e => { e.preventDefault(); acceptSuggest(+ch.dataset.i); };
    });
    const cur = el.children[sugIdx];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }

  function refreshSuggest() {
    sugList = open ? computeSuggestions(inputEl.value) : [];
    sugIdx = -1;                     // ⚠ boshida HECH NARSA tanlanmagan —
    renderSuggest();                 //   shu bois oddiy Enter komandani yuboradi
  }

  function hideSuggest() { sugList = []; sugIdx = -1; renderSuggest(); }

  function moveSuggest(step) {
    if (!sugList.length) { refreshSuggest(); if (!sugList.length) return; }
    sugIdx += step;
    if (sugIdx >= sugList.length) sugIdx = 0;
    if (sugIdx < 0) sugIdx = sugList.length - 1;
    renderSuggest();
  }

  function acceptSuggest(i) {
    const s = sugList[i != null ? i : sugIdx];
    if (!s) return false;
    if (s.whole) {
      inputEl.value = s.text + (/[\s-]$/.test(s.text) ? '' : ' ');
    } else {
      const v = inputEl.value;
      // ⚠ Boshlangan qo'shtirnoq ham almashtiriladigan bo'lakka kiradi.
      //   Aks holda `("Max` + `"Maxsus Devor"` = `(""Maxsus Devor"`
      //   bo'lib, qo'shtirnoq ikkilanib ketardi.
      const partial = /[\s(]$/.test(v) ? '' : (v.match(/["']?[^\s()"']*$/) || [''])[0];
      inputEl.value = _balance(v.slice(0, v.length - partial.length) + s.text) + ' ';
    }
    hideSuggest();
    try { inputEl.focus(); } catch (e) {}
    return true;
  }

  function _handleInputKey(e) {
    // ⌨ Tab — ro'yxat bo'ylab yurish. Brauzerning "keyingi elementga
    //   o'tish" xatti-harakati bekor qilinadi.
    if (e.key === 'Tab') {
      e.preventDefault();
      moveSuggest(e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === 'Enter') {
      // Variant TANLANGAN bo'lsa — uni qo'yamiz, yubormaymiz.
      // Tanlanmagan bo'lsa — oddiy Enter: komanda ketadi.
      if (sugIdx >= 0 && acceptSuggest()) return;
      const v = inputEl.value;
      inputEl.value = '';
      hideSuggest();
      run(v);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      // ⚠ Ro'yxat BOR bo'lsa ham, tanlov hali BOSHLANMAGAN bo'lsa
      //   (Tab bosilmagan) strelkalar TARIXni yuritadi — terminaldagi
      //   odatiy xatti-harakat. Bo'sh qatorda ro'yxat doim ko'rinib
      //   turadi, shu bois `sugList.length` bo'yicha qaror qilsak
      //   tarix umuman ishlamay qolardi.
      if (sugIdx >= 0) { moveSuggest(e.key === 'ArrowDown' ? 1 : -1); return; }
      if (e.key === 'ArrowUp') { if (histIdx > 0) inputEl.value = history[--histIdx] || ''; }
      else if (histIdx < history.length - 1) inputEl.value = history[++histIdx] || '';
      else { histIdx = history.length; inputEl.value = ''; }
      return;
    }
    if (e.key === 'Escape') {
      // Avval ro'yxat yopiladi, konsol emas
      if (sugList.length) { hideSuggest(); return; }
      toggle(false);
    }
  }

  function _onKeyCapture(e) {
    const isToggle = (e.key === KEY) ||
                     (KEY === '`' && (e.code === 'Backquote' || e.key === '~'));

    // Konsol ochiq va kiritish qatorida yozilyapti — o'yinga o'tkazmaymiz
    if (open && inputEl && e.target === inputEl) {
      if (isToggle) { e.preventDefault(); toggle(false); }
      else _handleInputKey(e);
      e.stopImmediatePropagation();
      return;
    }

    if (isToggle && !_isTyping(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      toggle();
    }
  }

  document.addEventListener('keydown', _onKeyCapture, true);
  // ⚠ keyup BLOKLANMAYDI — yuqoridagi `_flushKeys()` izohiga qarang.

  window.GameConsole = {
    open:   () => toggle(true),
    close:  () => toggle(false),
    toggle: () => toggle(),
    register, run, say, tokenize,
    // avtoto'ldirish (testlar va tashqi ishlatish uchun)
    suggest: computeSuggestions,
    get suggestions() { return sugList.slice(); },
    get suggestIndex() { return sugIdx; },
    get isOpen() { return open; },
    get key() { return KEY; },
  };

  // Boot tugagach bir marta xabar
  window.addEventListener('load', () => {
    setTimeout(() => say('🖥 Razrabotchiklar konsoli: ' + _keyLabelSafe() + ' tugmasi bilan ochiladi', 'lok'), 1500);
  });
})();
