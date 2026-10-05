// ============================================================
//  ⌨🖥 BUTTON TEMPLATES — ekran tugmalari SHABLONLARI
// ------------------------------------------------------------
//  Bir marta yig'ilgan tugma joylashuvini saqlab qo'yib, keyingi
//  loyihalarda qayta ishlatish uchun. IERARXIYA → 🎮 Buttons.
//
//  ── QAYERDA SAQLANADI ────────────────────────────────────────
//  Shablonlar SERVERDA — `projects/button-templates.json`. Ya'ni
//  ular SAHNAGA emas, DASTURCHIGA tegishli: bitta shablon o'nta
//  loyihada ishlatiladi.
//
//  ⚠ NEGA SAHNAGA EMAS: sahna bilan saqlasak har yangi loyihada
//    shablonlar yo'q bo'lardi va ularning butun ma'nosi yo'qolardi.
//
//  ⚠ NEGA `localStorage` EMAS: brauzer tozalansa yo'qoladi va
//    boshqa kompyuterga ko'chmaydi. Loyihada allaqachon server bor.
//
//  ── game.zip GA NIMA TUSHADI ────────────────────────────────
//  Faqat TANLANGAN bitta shablon — o'yinchiga bittasi kerak.
//  Hammasi tushsa o'yin qaysi birini ko'rsatishni bilmasdi.
//  Tanlangan shablon `ScreenKeys` holatiga YOZILADI, ya'ni
//  eksportga tizim holati sifatida tabiiy ravishda tushadi.
// ============================================================
window.ButtonTemplates = (function () {
  'use strict';

  //  ⚠ Serverda `projects/button-templates.json` — alohida endpoint
  //    orqali (`/api/buttons`). Loyiha API si papka asosida ishlaydi
  //    va u yerga yozsak `projects/` da soxta loyiha paydo bo'lardi.
  const _log = (m, c) => { try { log(m, c); } catch (e) {} };

  let _list = [];        // [{ id, name, keys: [...] }]
  let _idC  = 0;
  let _loaded = false;

  const list = () => _list;
  const find = (id) => _list.find(t => t.id === id) || null;

  /** Ayni paytdagi ekran tugmalaridan shablon yasaydi. */
  function captureCurrent(name) {
    const SK = window.ScreenKeys;
    if (!SK) return null;
    const data = SK.serialize();
    if (!data.keys.length) {
      _log('⚠ Ekranda tugma yo\'q — avval ⌨ muharrirdan chiqaring', 'lw');
      return null;
    }
    const tpl = { id: ++_idC, name: name || ('Shablon ' + (_list.length + 1)),
                  keys: JSON.parse(JSON.stringify(data.keys)) };
    _list.push(tpl);
    save();
    _log(`⌨🖥 "${tpl.name}" shabloni saqlandi (${tpl.keys.length} tugma)`, 'lok');
    return tpl;
  }

  /**
   * Shablonni sahnaga QO'LLAYDI — ayni paytdagi tugmalar o'rniga.
   * ⚠ Almashtiradi, USTIGA QO'SHMAYDI: qo'shsak ikki nusxa ustma-ust
   *   tushib, dizayner qaysi biri qaysiligini ajratolmasdi.
   */
  function apply(id) {
    const tpl = find(id);
    const SK = window.ScreenKeys;
    if (!tpl || !SK) return false;
    SK.restore({ keys: JSON.parse(JSON.stringify(tpl.keys)) });
    _log(`⌨🖥 "${tpl.name}" qo'llandi (${tpl.keys.length} tugma)`, 'lok');
    if (typeof updateInspector === 'function') updateInspector();
    render();
    return true;
  }

  function remove(id) {
    const i = _list.findIndex(t => t.id === id);
    if (i < 0) return false;
    const nm = _list[i].name;
    _list.splice(i, 1);
    save();
    _log(`⌨🖥 "${nm}" shabloni o'chirildi`, 'lok');
    render();
    return true;
  }

  function rename(id, name) {
    const tpl = find(id);
    if (!tpl) return false;
    tpl.name = String(name || '').slice(0, 60) || tpl.name;
    save();
    return true;
  }

  // ============================================================
  //  💾 Server bilan
  // ------------------------------------------------------------
  //  ⚠ HAMMA yo'l `try` ichida: server yo'q bo'lsa (fayl:// dan
  //    ochilgan, yoki eksport qilingan o'yin) muharrir baribir
  //    ishlashi kerak. Shablonlar shunchaki bo'sh bo'ladi.
  // ============================================================
  async function load() {
    if (_loaded) return _list;
    _loaded = true;
    try {
      const r = await fetch('/api/buttons');
      const j = await r.json();
      if (j && j.ok && j.data && Array.isArray(j.data.templates)) {
        _list = j.data.templates;
        _idC = _list.reduce((m, t) => Math.max(m, t.id || 0), 0);
      }
    } catch (e) { /* server yo'q — bo'sh ro'yxat */ }
    render();
    return _list;
  }

  async function save() {
    try {
      await fetch('/api/buttons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: _list }),
      });
    } catch (e) {
      _log('⚠ Shablon serverga saqlanmadi (server ishlayaptimi?)', 'lw');
    }
  }

  // ============================================================
  //  🎨 Ro'yxat
  // ============================================================
  function render() {
    if (typeof document === 'undefined') return;
    const box = document.getElementById('asset-cat-buttons');
    if (!box) return;
    const SK = window.ScreenKeys;
    const cur = SK ? SK.list().length : 0;
    const esc = (x) => String(x == null ? '' : x).replace(/[<>&"]/g, '');

    box.innerHTML = `
      <div class="asset-section-label">⌨🖥 EKRAN TUGMALARI SHABLONLARI</div>
      <div style="font-size:9px;color:var(--muted);line-height:1.6;padding:2px 4px 7px">
        ⌨ Klaviatura muharririda tugmalarni ekranga chiqaring va joylashtiring,
        so'ng shu yerdan shablon qilib saqlang. <b>game.zip ga faqat
        ayni paytda sahnadagi tugmalar tushadi</b> — shablonni avval
        <b>Qo'llash</b> kerak.
      </div>
      <button onclick="_btnTplNew()" style="width:100%;padding:6px;border-radius:3px;cursor:pointer;
        font-size:10px;font-family:'Share Tech Mono',monospace;margin-bottom:7px;
        border:1px dashed var(--accent3);background:rgba(var(--accent3-rgb),.06);color:var(--accent3)">
        ➕ Hozirgi ${cur} ta tugmani shablon qilib saqlash</button>

      ${_list.length ? _list.map(tpl => `
        <div style="border:1px solid var(--border);border-radius:3px;padding:6px 7px;margin-bottom:5px;
          background:var(--panel2)">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <input value="${esc(tpl.name)}" onchange="ButtonTemplates.rename(${tpl.id}, this.value)"
              style="flex:1;background:transparent;border:none;color:var(--text);outline:none;
              font-family:'Share Tech Mono',monospace;font-size:10px">
            <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">
              ${tpl.keys.length} tugma</span>
            <button onclick="_btnTplDel(${tpl.id})" title="O'chirish"
              style="background:none;border:none;color:var(--red);cursor:pointer;font-size:12px">🗑</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px">
            ${tpl.keys.slice(0, 12).map(k => `<span style="padding:1px 5px;border-radius:2px;
              font-size:8px;font-family:'Share Tech Mono',monospace;
              border:1px solid var(--border);color:var(--muted)">${esc(k.label || k.code)}</span>`).join('')}
            ${tpl.keys.length > 12 ? `<span style="font-size:8px;color:var(--muted)">+${tpl.keys.length - 12}</span>` : ''}
          </div>
          <button onclick="ButtonTemplates.apply(${tpl.id})" style="width:100%;padding:4px;border-radius:3px;
            cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
            border:1px solid var(--accent3);background:rgba(var(--accent3-rgb),.1);color:var(--accent3)">
            ✅ Qo'llash — sahnadagi tugmalar shu bilan almashadi</button>
        </div>`).join('')
      : `<div style="font-size:9px;color:var(--border);padding:8px;line-height:1.7">
           Hali shablon yo'q.<br><br>
           1. ⌨ Klaviatura muharririni oching<br>
           2. Tugmani bosib → 🖥 Ekranga chiqarish<br>
           3. ⚙️ Sozlamalar → 🖥 Ekran tugmalari dan joylashtiring<br>
           4. Shu yerga qaytib "Shablon qilib saqlash" bosing
         </div>`}`;
  }

  return { list, find, captureCurrent, apply, remove, rename, load, save, render };
})();

// ── Ro'yxatni chizish (asset-category chaqiradi) ──────────────
window.btnTplRenderList = function () {
  //  ⚠ Birinchi ochilishda serverdan YUKLAYMIZ. Dvigatel yuklanishida
  //    qilsak har sahifa ochilishida keraksiz so'rov bo'lardi —
  //    shablonlar ko'pchilikka umuman kerak emas.
  if (window.ButtonTemplates) ButtonTemplates.load();
};

window._btnTplNew = function () {
  if (!window.ButtonTemplates) return;
  const n = prompt('Shablon nomi:', 'Shablon ' + (ButtonTemplates.list().length + 1));
  if (n === null) return;              // ⚠ bekor qilindi — bo'sh nom EMAS
  ButtonTemplates.captureCurrent(n);
  ButtonTemplates.render();
};

window._btnTplDel = function (id) {
  if (!window.ButtonTemplates) return;
  const tpl = ButtonTemplates.find(id);
  if (!tpl) return;
  if (!confirm(`"${tpl.name}" shabloni o'chirilsinmi?`)) return;
  ButtonTemplates.remove(id);
};
