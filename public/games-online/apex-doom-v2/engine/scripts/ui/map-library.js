// ============================================================
//  🗺 KARTALAR KUTUBXONASI — map-library.js
//
//  Muammo: `saveScene()` ZIP ni brauzerdan YUKLAB OLARDI, `loadScene()`
//  esa uni fayl dialogidan qayta so'rardi. Ya'ni foydalanuvchi o'z
//  kartasini davom ettirish uchun har safar diskdan qidirishi kerak edi,
//  va dvigatel ichida "mening kartalarim" degan tushuncha YO'Q edi.
//
//  Bu modul shuni qo'shadi:
//     💾 SAQLASH bo'limi  — joriy sahnani nom bilan kutubxonaga yozadi
//     📂 YUKLASH bo'limi  — saqlanganlar ro'yxati, bir bosishda tiklanadi
//
//  ⚠ NEGA localStorage EMAS, IndexedDB:
//    Karta ZIP i GLB model va teksturalarni o'z ichiga oladi — bitta
//    o'rtacha sahna 10–50 MB bo'lishi mumkin. localStorage limiti ~5 MB
//    va faqat matn saqlaydi (binary → base64 = +33% hajm). IndexedDB
//    Blob ni O'ZI SAQLAYDI va limiti disk hajmiga bog'liq (odatda GB lar).
//
//  ⚠ Format o'zgarmagan: kutubxonadagi yozuv — AYNAN `saveScene()`
//    chiqaradigan ZIP. Shuning uchun kartani fayl qilib chiqarish va
//    do'stdan kelgan faylni kutubxonaga qo'shish — ikkalasi ham tekin.
// ============================================================

const MapLibrary = (() => {
  'use strict';

  const DB_NAME  = 'apex-maps';
  const DB_VER   = 1;
  const STORE    = 'maps';
  const THUMB_W  = 256;

  let _db      = null;
  let _openTab = 'load';   // 'save' | 'load'

  const esc = s => (typeof escapeHtml === 'function')
                    ? escapeHtml(String(s ?? ''))
                    : String(s ?? '').replace(/[&<>"']/g, c =>
                        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const say = (msg, lvl) => { if (typeof log === 'function') log(msg, lvl); };

  // ── IndexedDB ochish ────────────────────────────────────────
  function _open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((res, rej) => {
      let req;
      try { req = indexedDB.open(DB_NAME, DB_VER); }
      catch (e) { return rej(new Error('IndexedDB mavjud emas: ' + e.message)); }

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const st = db.createObjectStore(STORE, { keyPath: 'id' });
          st.createIndex('date', 'date');
        }
      };
      req.onsuccess = () => {
        _db = req.result;
        // Boshqa tabda baza yangilansa — ulanishni yopamiz, aks holda
        // o'sha tab `onblocked` da muzlab qoladi.
        _db.onversionchange = () => { _db.close(); _db = null; };
        res(_db);
      };
      req.onerror = () => rej(req.error || new Error('IndexedDB ochilmadi'));
    });
  }

  function _tx(mode, fn) {
    return _open().then(db => new Promise((res, rej) => {
      const tx = db.transaction(STORE, mode);
      const st = tx.objectStore(STORE);
      let out;
      try { out = fn(st); } catch (e) { return rej(e); }
      // ⚠ `out.result !== undefined` TEKSHIRISH BO'LMAYDI: `get()` topmagan
      //    kalitda `result === undefined` bo'ladi va u holda IDBRequest
      //    obyektining O'ZI qaytarilib, chaqiruvchi uni "topildi" deb
      //    o'ylardi. `'result' in out` — so'rovmi yoki yo'qmi, shuni aniqlaydi.
      tx.oncomplete = () => res(
        (out && typeof out === 'object' && 'result' in out) ? out.result : out);
      tx.onerror    = () => rej(tx.error);
      tx.onabort    = () => rej(tx.error || new Error('Tranzaksiya bekor qilindi'));
    }));
  }

  // ── Yordamchilar ────────────────────────────────────────────
  const _id = () => 'map_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

  function _fmtSize(b) {
    if (!b) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function _fmtDate(iso) {
    try {
      const d = new Date(iso);
      const p = n => String(n).padStart(2, '0');
      return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch (e) { return '—'; }
  }

  /**
   * Sahnaning kichik suratini oladi (ro'yxatda ko'rinadi).
   * ⚠ `preserveDrawingBuffer:true` renderer.js da yoqilgan — busiz
   *   `toDataURL()` bo'sh rasm qaytarardi.
   * Xato bo'lsa `null` — kutubxona baribir ishlaydi, faqat surat bo'lmaydi.
   */
  function _thumb() {
    try {
      if (typeof renderer === 'undefined' || !renderer || !renderer.domElement) return null;
      renderer.setClearAlpha(1);
      renderer.render(scene, camera);
      const src = renderer.domElement;
      renderer.setClearAlpha(0);

      const h = Math.max(1, Math.round(THUMB_W * (src.height / src.width || 0.56)));
      const c = document.createElement('canvas');
      c.width = THUMB_W; c.height = h;
      c.getContext('2d').drawImage(src, 0, 0, THUMB_W, h);
      return c.toDataURL('image/jpeg', 0.6);
    } catch (e) { return null; }
  }

  // ============================================================
  //  API
  // ============================================================

  /** Joriy sahnani kutubxonaga yozadi. `overwriteId` berilsa — ustiga. */
  async function saveCurrent(name, overwriteId) {
    name = String(name || '').trim();
    if (!name) { say('⚠ Karta nomini kiriting', 'lw'); return null; }
    if (typeof saveScene !== 'function') { say('❌ saveScene topilmadi', 'le'); return null; }

    say('📦 Karta tayyorlanmoqda...', 'lw');
    try {
      // `saveScene(true)` — ZIP ni YUKLAB OLMAYDI, obyektning o'zini beradi.
      const zip = await saveScene(true);
      if (!zip) { say('❌ ZIP yaratilmadi (JSZip yo\'qmi?)', 'le'); return null; }

      const blob = await zip.generateAsync({
        type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 },
      });

      const rec = {
        id:       overwriteId || _id(),
        name,
        date:     new Date().toISOString(),
        size:     blob.size,
        objCount: (typeof objects !== 'undefined' && objects)
                    ? objects.filter(o => !(o.userData && (o.userData._glbPart || o.userData.isStatic))).length
                    : 0,
        thumb:    _thumb(),
        blob,
      };

      await _tx('readwrite', st => st.put(rec));
      say(`💾 Kutubxonaga saqlandi: "${name}" (${_fmtSize(blob.size)})`, 'lok');
      // Saqlash — yakunlangan amal. Panelni ochiq qoldirsak foydalanuvchi
      // "yana nima qilishim kerak?" deb turadi, va Enter ni ikki bosib
      // xuddi shu kartani ikki marta yozib qo'yishi mumkin.
      if (_openTab === 'save') close(); else _render();
      return rec.id;
    } catch (err) {
      if (err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''))) {
        say('❌ Brauzer xotirasi to\'ldi — eski kartalarni o\'chiring', 'le');
      } else {
        say('❌ Saqlanmadi: ' + (err.message || err), 'le');
      }
      return null;
    }
  }

  /** Metama'lumotlar ro'yxati (Blob'siz — ro'yxat chizishda og'irlik qilmasin). */
  async function list() {
    try {
      const all = await _tx('readonly', st => st.getAll());
      return (all || [])
        .map(r => ({ id: r.id, name: r.name, date: r.date, size: r.size, objCount: r.objCount, thumb: r.thumb }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    } catch (err) { say('❌ Ro\'yxat o\'qilmadi: ' + err.message, 'le'); return []; }
  }

  async function get(id) {
    return _tx('readonly', st => st.get(id));
  }

  /** Kartani sahnaga tiklaydi. */
  async function load(id) {
    try {
      const rec = await get(id);
      if (!rec) { say('❌ Karta topilmadi', 'le'); return false; }
      if (typeof window.loadSceneFromZip !== 'function') {
        say('❌ loadSceneFromZip topilmadi (save-load.js eski)', 'le'); return false;
      }
      say(`📂 "${rec.name}" yuklanmoqda...`, 'lw');
      const ok = await window.loadSceneFromZip(await rec.blob.arrayBuffer());
      if (ok) { say(`✅ "${rec.name}" yuklandi`, 'lok'); close(); }
      return ok;
    } catch (err) { say('❌ Yuklanmadi: ' + err.message, 'le'); return false; }
  }

  async function rename(id, newName) {
    newName = String(newName || '').trim();
    if (!newName) return false;
    const rec = await get(id);
    if (!rec) return false;
    rec.name = newName;
    await _tx('readwrite', st => st.put(rec));
    _render();
    return true;
  }

  async function remove(id) {
    await _tx('readwrite', st => st.delete(id));
    _render();
    return true;
  }

  /** Kutubxonadagi kartani `.zip` fayl qilib diskka chiqaradi (do'stga yuborish uchun). */
  async function download(id) {
    const rec = await get(id);
    if (!rec) return;
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rec.name.replace(/[^a-zA-Z0-9_\-]/g, '_') + '.zip';
    a.click();
    // ⚠ Darhol revoke qilinsa Firefox da yuklash uzilib qolishi mumkin.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    say(`⬇ "${rec.name}" yuklab olindi`, 'lok');
  }

  /** Diskdagi `.zip` ni kutubxonaga qo'shadi (sahnani O'ZGARTIRMAYDI). */
  function importFile() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.zip';
    inp.onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        // ZIP haqiqatan APEX karta ekanini TEKSHIRAMIZ — aks holda
        // kutubxonaga ochilmaydigan fayl tushib qoladi.
        if (typeof JSZip === 'undefined') { say('❌ JSZip yuklanmagan', 'le'); return; }
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        if (!zip.file('apex-file.json') && !zip.file('scene.json') && !zip.file('timeline.json')) {
          say('❌ Bu APEX kartasi emas (apex-file.json / timeline.json yo\'q)', 'le');
          return;
        }
        const rec = {
          id: _id(),
          name: f.name.replace(/\.zip$/i, ''),
          date: new Date().toISOString(),
          size: f.size,
          objCount: 0,
          thumb: null,
          blob: f,
        };
        await _tx('readwrite', st => st.put(rec));
        say(`📥 Import qilindi: "${rec.name}"`, 'lok');
        _render();
      } catch (err) { say('❌ Import xatosi: ' + err.message, 'le'); }
    };
    inp.click();
  }

  // ============================================================
  //  UI
  // ============================================================

  function _panel() {
    let p = document.getElementById('maplib-panel');
    if (p) return p;

    p = document.createElement('div');
    p.id = 'maplib-panel';
    p.style.cssText =
      'position:fixed;inset:0;z-index:10000;display:none;' +
      'background:rgba(4,6,10,.72);backdrop-filter:blur(3px);' +
      'align-items:center;justify-content:center;font-family:var(--font-ui,sans-serif)';
    p.innerHTML =
      '<div id="maplib-box" style="width:min(720px,92vw);max-height:86vh;display:flex;flex-direction:column;' +
      'background:var(--panel,#0f1318);border:1px solid var(--border,#1e2530);border-radius:6px;' +
      'box-shadow:0 20px 60px rgba(0,0,0,.7);overflow:hidden">' +

        '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;' +
        'border-bottom:1px solid var(--border,#1e2530);background:var(--panel2,#111620)">' +
          '<span id="maplib-title" style="font-size:13px;font-weight:700;color:var(--accent,var(--accent));letter-spacing:1px"></span>' +
          '<div style="flex:1"></div>' +
          '<button id="maplib-x" style="background:none;border:none;color:var(--muted,#4a5568);' +
          'font-size:18px;cursor:pointer;line-height:1;padding:0 4px">✕</button>' +
        '</div>' +

        '<div id="maplib-body" style="flex:1;overflow-y:auto;padding:12px 14px"></div>' +
      '</div>';

    document.body.appendChild(p);

    // Fon bosilsa yopiladi (ichki quti bosilganda emas)
    p.addEventListener('click', e => { if (e.target === p) close(); });
    p.querySelector('#maplib-x').onclick = close;
    return p;
  }

  function _renderSaveTab(body) {
    const cur = (typeof objects !== 'undefined' && objects)
                  ? objects.filter(o => !(o.userData && (o.userData._glbPart || o.userData.isStatic))).length
                  : 0;
    const dflt = 'Karta ' + new Date().toLocaleDateString('uz-UZ');

    body.innerHTML =
      '<div style="font-size:11px;color:var(--muted,#4a5568);margin-bottom:10px;line-height:1.6">' +
        'Joriy sahna (' + cur + ' ta obyekt) brauzer xotirasiga yoziladi. ' +
        'Keyin yuqoridagi <b style="color:var(--text,#c8d4e0)">📂 Yuklash</b> tugmasi orqali qayta ochasiz.' +
      '</div>' +
      '<input id="maplib-name" placeholder="Karta nomi" value="' + esc(dflt) + '" ' +
      'style="width:100%;box-sizing:border-box;padding:9px 10px;background:var(--panel2,#111620);' +
      'border:1px solid var(--border,#1e2530);border-radius:4px;color:var(--text,#c8d4e0);' +
      'font-family:var(--font-mono,monospace);font-size:12px;outline:none;margin-bottom:10px">' +
      '<button id="maplib-do-save" style="width:100%;padding:11px;background:rgba(var(--accent3-rgb),.1);' +
      'border:1px solid var(--accent3,var(--accent3));color:var(--accent3,var(--accent3));border-radius:4px;' +
      'font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">💾 Kutubxonaga saqlash</button>' +
      '<div style="height:1px;background:var(--border,#1e2530);margin:16px 0"></div>' +
      '<button id="maplib-do-file" style="width:100%;padding:9px;background:none;' +
      'border:1px dashed var(--border,#1e2530);color:var(--muted,#4a5568);border-radius:4px;' +
      'font-family:inherit;font-size:11px;cursor:pointer">⬇ Yoki .zip fayl qilib yuklab olish</button>';

    const nameEl = body.querySelector('#maplib-name');
    const go = () => saveCurrent(nameEl.value);
    body.querySelector('#maplib-do-save').onclick = go;
    nameEl.onkeydown = e => { if (e.key === 'Enter') go(); };
    body.querySelector('#maplib-do-file').onclick = () => {
      if (typeof saveScene === 'function') saveScene();
    };
    setTimeout(() => { nameEl.focus(); nameEl.select(); }, 30);
  }

  async function _renderLoadTab(body) {
    body.innerHTML = '<div style="color:var(--muted,#4a5568);font-size:11px;padding:20px;text-align:center">yuklanmoqda...</div>';
    const maps = await list();

    let html =
      '<button id="maplib-import" style="width:100%;padding:9px;background:rgba(var(--accent-rgb),.06);' +
      'border:1px dashed var(--accent,var(--accent));color:var(--accent,var(--accent));border-radius:4px;' +
      'font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;margin-bottom:12px">' +
      '📥 Fayldan import qilish (.zip)</button>';

    if (!maps.length) {
      html += '<div style="color:var(--muted,#4a5568);font-size:11px;text-align:center;padding:26px 10px;line-height:1.7">' +
              'Hali saqlangan karta yo\'q.<br>💾 <b>Saqlash</b> tugmasi bilan birinchisini qo\'shing,<br>' +
              'yoki tepadagi 📥 orqali fayldan import qiling.</div>';
    } else {
      for (const m of maps) {
        html +=
          '<div class="maplib-row" data-id="' + esc(m.id) + '" style="display:flex;gap:10px;align-items:center;' +
          'padding:8px;margin-bottom:6px;background:var(--panel2,#111620);border:1px solid var(--border,#1e2530);' +
          'border-radius:4px">' +
            (m.thumb
              ? '<img src="' + esc(m.thumb) + '" style="width:72px;height:41px;object-fit:cover;border-radius:3px;' +
                'flex-shrink:0;background:#080b12">'
              : '<div style="width:72px;height:41px;border-radius:3px;flex-shrink:0;background:#080b12;' +
                'display:flex;align-items:center;justify-content:center;font-size:16px">🗺</div>') +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:12px;font-weight:700;color:var(--text,#c8d4e0);white-space:nowrap;' +
              'overflow:hidden;text-overflow:ellipsis">' + esc(m.name) + '</div>' +
              '<div style="font-size:10px;color:var(--muted,#4a5568);font-family:var(--font-mono,monospace)">' +
                esc(_fmtDate(m.date)) + ' · ' + esc(_fmtSize(m.size)) +
                (m.objCount ? ' · ' + esc(m.objCount) + ' obyekt' : '') +
              '</div>' +
            '</div>' +
            '<button data-act="load" style="padding:6px 11px;background:rgba(var(--accent3-rgb),.1);' +
            'border:1px solid var(--accent3,var(--accent3));color:var(--accent3,var(--accent3));border-radius:3px;' +
            'font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">Yuklash</button>' +
            '<button data-act="rename" title="Nomini o\'zgartirish" style="padding:6px 8px;background:none;' +
            'border:1px solid var(--border,#1e2530);color:var(--muted,#4a5568);border-radius:3px;' +
            'font-size:11px;cursor:pointer">✏</button>' +
            '<button data-act="download" title="ZIP yuklab olish" style="padding:6px 8px;background:none;' +
            'border:1px solid var(--border,#1e2530);color:var(--muted,#4a5568);border-radius:3px;' +
            'font-size:11px;cursor:pointer">⬇</button>' +
            '<button data-act="delete" title="O\'chirish" style="padding:6px 8px;background:none;' +
            'border:1px solid var(--border,#1e2530);color:var(--red,#ff4444);border-radius:3px;' +
            'font-size:11px;cursor:pointer">🗑</button>' +
          '</div>';
      }
    }
    body.innerHTML = html;

    body.querySelector('#maplib-import').onclick = importFile;

    body.querySelectorAll('.maplib-row').forEach(row => {
      const id   = row.dataset.id;
      const name = maps.find(m => m.id === id)?.name || '';
      row.querySelectorAll('button[data-act]').forEach(b => {
        b.onclick = async () => {
          const act = b.dataset.act;
          if (act === 'load') {
            // ⚠ Yuklash JORIY sahnani almashtiradi — saqlanmagan ish yo'qoladi.
            if (!confirm(`"${name}" yuklansinmi?\n\nJoriy sahna almashtiriladi — saqlanmagan o'zgarishlar yo'qoladi.`)) return;
            await load(id);
          } else if (act === 'rename') {
            const nn = prompt('Yangi nom:', name);
            if (nn) await rename(id, nn);
          } else if (act === 'download') {
            await download(id);
          } else if (act === 'delete') {
            if (confirm(`"${name}" o'chirilsinmi? Bu amal qaytarilmaydi.`)) await remove(id);
          }
        };
      });
    });
  }

  function _render() {
    const p = document.getElementById('maplib-panel');
    if (!p || p.style.display === 'none') return;

    const ttl = p.querySelector('#maplib-title');
    if (ttl) ttl.textContent = (_openTab === 'save') ? '💾 KARTANI SAQLASH' : '📂 KARTANI YUKLASH';

    const body = p.querySelector('#maplib-body');
    if (_openTab === 'save') _renderSaveTab(body);
    else                     _renderLoadTab(body);
  }

  function open(tab) {
    _openTab = (tab === 'save') ? 'save' : 'load';
    const p = _panel();
    p.style.display = 'flex';
    _render();
  }

  function close() {
    const p = document.getElementById('maplib-panel');
    if (p) p.style.display = 'none';
  }

  // Esc — yopish
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const p = document.getElementById('maplib-panel');
    if (p && p.style.display === 'flex') { e.stopPropagation(); close(); }
  }, true);

  return {
    open, close, list, get, load, saveCurrent, rename, remove, download, importFile,
    _fmtSize, _fmtDate,   // testlar uchun
  };
})();

window.MapLibrary = MapLibrary;

// index.html tugmalari shu ikkisini chaqiradi
window.openMapSave = () => MapLibrary.open('save');
window.openMapLoad = () => MapLibrary.open('load');
