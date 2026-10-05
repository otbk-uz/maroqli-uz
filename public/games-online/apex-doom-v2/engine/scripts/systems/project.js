// ============================================================
//  💾 LOYIHA PAPKASI  v1.0  (build 58.44)
// ------------------------------------------------------------
//  Sahnani ZIP fayl emas, PAPKA ko'rinishida saqlaydi:
//
//    projects/<nom>/
//      ├── project.json          — sahna
//      ├── texture/ models/ sound/ video/ html/ maps/
//      └── autosave/             — oxirgi 5 nusxa
//
//  ── ⚠ NEGA SERVER ORQALI ────────────────────────────────────
//    Brauzer o'zi diskka PAPKA yoza olmaydi. `<a download>` faqat
//    bitta fayl beradi va uni foydalanuvchi qo'lda joylashtiradi.
//    Shuning uchun yozish `server.js` dagi `/api/project/*` orqali.
//
//  ── ⚠ NEGA `saveScene(true)` DAN FOYDALANAMIZ ───────────────
//    Sahnani JSON ga aylantirish — 1000 qatorlik ish (obyektlar,
//    yorug'lik, zarrachalar, timeline, tizim holatlari, aktivlar).
//    Uni ikkinchi marta yozsak, yangi xususiyat qo'shilganda biri
//    yangilanib ikkinchisi unutilardi. Shuning uchun MAVJUD
//    saqlash yo'li chaqiriladi va uning ZIP i papkaga yoyiladi.
//
//  ── ⚠ NEGA AVTOSAQLASH ESKI NUSXANI KO'CHIRADI ──────────────
//    Avtosaqlash yangi holatni yozishdan OLDIN eskisini
//    `autosave/` ga ko'chiradi. Ya'ni saqlangan nusxa — bu
//    sizning HOZIRGI holatingiz emas, OLDINGI ishonchli holat.
//    Aks holda buzilgan sahna avtomatik saqlanib, tuzuk nusxa
//    ustiga yozilib ketardi.
// ============================================================

window.ProjectSystem = (() => {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };

  const cfg = {
    name: '',              // joriy loyiha nomi
    autosave: true,
    every: 5 * 60,         // ⏱ soniya (5 daqiqa)
  };

  let _t = 0;
  let _busy = false;
  let _lastSave = 0;

  const api = (p) => fetch(p).then(r => r.json());

  // ============================================================
  //  Saqlash
  // ============================================================
  /**
   * @param {string} name
   * @param {boolean} isAuto  avtosaqlashmi (eski nusxa ko'chiriladi)
   */
  async function save(name, isAuto) {
    if (_busy) { _log('⏳ Saqlash davom etmoqda…', 'lw'); return null; }
    const nm = String(name || cfg.name || '').trim();
    if (!nm) { _log('⚠ Loyiha nomi kerak', 'lw'); return null; }
    _busy = true;
    try {
      // ── 1) HAQIQIY saqlovchini chaqiramiz ────────────────────
      //  ⚠ `window.saveScene` — TUZOQ. `game-export.js` uni MENYU
      //    ochuvchi bilan almashtiradi: u argumentni e'tiborsiz
      //    qoldiradi va `undefined` qaytaradi. Shu sababdan
      //    "saqlash yo'li ZIP bermadi" xatosi chiqardi.
      //
      //    Asl funksiya `_realSaveScene` da saqlanadi —
      //    `game-zip.js` ham aynan shuni chaqiradi.
      const _save = window._realSaveScene || window._originalSaveScene || window.saveScene;
      if (typeof _save !== 'function') throw new Error('saqlash yo\'li topilmadi');
      const zip = await _save(true);
      if (!zip || typeof zip.files !== 'object') {
        throw new Error('saqlash yo\'li ZIP bermadi — `_realSaveScene` almashtirilganmi?');
      }

      // 2) ZIP ni papka daraxtiga yoyamiz
      const files = {};
      let project = null;
      const names = Object.keys(zip.files);
      for (const rel of names) {
        const f = zip.files[rel];
        if (!f || f.dir) continue;
        if (rel === 'apex-file.json') {
          project = JSON.parse(await f.async('string'));
          continue;                        // u alohida `project.json` bo'ladi
        }
        files[rel] = await f.async('base64');
      }
      if (!project) throw new Error('apex-file.json topilmadi');

      project.meta = Object.assign({}, project.meta, {
        name: nm,
        savedAt: new Date().toISOString(),
        objects: (project.objects || []).length,
        engine: 'APEX3D',
      });

      // 3) Serverga
      const r = await fetch('/api/project/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nm, autosave: !!isAuto, project, files }),
      }).then(x => x.json());

      if (!r.ok) throw new Error(r.error || 'server rad etdi');
      cfg.name = r.name;
      _lastSave = Date.now();
      const mb = (r.bytes / 1048576);
      _log(`${isAuto ? '⏱ Avtosaqlandi' : '💾 Saqlandi'} → ${r.path}/ ` +
           `(${r.files} fayl, ${mb < 0.1 ? '<0.1' : mb.toFixed(1)} MB)`, 'lok');
      return r;
    } catch (e) {
      // ⚠ Avtosaqlash xatosi JIM qolmasin: foydalanuvchi \"saqlanyapti\"
      //   deb ishonib ishlayveradi va hammasini yo'qotadi.
      _log('❌ Saqlash xatosi: ' + (e && e.message || e), 'le');
      return null;
    } finally { _busy = false; }
  }

  // ============================================================
  //  Yuklash
  // ============================================================
  async function open(name, autoFile) {
    if (_busy) return null;
    _busy = true;
    try {
      const url = autoFile
        ? '/api/project/autoload/' + encodeURIComponent(name) + '/' + encodeURIComponent(autoFile)
        : '/api/project/load/' + encodeURIComponent(name);
      const r = await api(url);
      if (!r.ok) throw new Error(r.error || 'topilmadi');

      // ⚠ Yuklash yo'li ham MAVJUD: `loadScene(data, zip)`. Papkadagi
      //   fayllardan xotirada ZIP yasab beramiz — shunda aktivlarni
      //   qaytarish (`AssetBundle.resolve`) o'zgarishsiz ishlaydi.
      let zip = null;
      if (typeof JSZip !== 'undefined' && r.files && Object.keys(r.files).length) {
        zip = new JSZip();
        for (const rel in r.files) zip.file(rel, r.files[rel], { base64: true });
      }
      await window.loadScene(r.project, zip);
      cfg.name = r.name;
      _lastSave = Date.now();
      _log(`📂 "${r.name}" ochildi` + (autoFile ? ` (${autoFile})` : ''), 'lok');
      return r;
    } catch (e) {
      _log('❌ Ochish xatosi: ' + (e && e.message || e), 'le');
      return null;
    } finally { _busy = false; }
  }

  const list      = () => api('/api/project/list').catch(() => ({ ok: false, projects: [] }));
  const autosaves = (n) => api('/api/project/autosaves/' + encodeURIComponent(n))
                             .catch(() => ({ ok: false, autosaves: [] }));

  async function remove(name) {
    const r = await fetch('/api/project/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(x => x.json()).catch(() => ({ ok: false }));
    if (r.ok && cfg.name === name) cfg.name = '';
    return r.ok;
  }

  // ============================================================
  //  ⏱ Avtosaqlash
  // ============================================================
  function update(delta) {
    if (!cfg.autosave || !cfg.name || _busy) return;
    // ⚠ ▶ Play davomida saqlamaymiz: o'yin holati (o'chgan dushmanlar,
    //   ochilgan eshiklar) muharrir sahnasi emas. Uni saqlasak
    //   dizaynerning ishi o'yin qoldig'i bilan almashib qolardi.
    if (typeof isPlaying !== 'undefined' && isPlaying) return;
    _t += (delta || 0.016);
    if (_t < cfg.every) return;
    _t = 0;
    save(cfg.name, true);
  }

  const sinceSave = () => (_lastSave ? Math.round((Date.now() - _lastSave) / 1000) : -1);

  // 💾 Sozlamalar sahna bilan saqlanadi (loyiha nomi ham)
  function serialize() { return { name: cfg.name, autosave: cfg.autosave, every: cfg.every }; }
  function restore(d) {
    if (!d) return;
    if (typeof d.name === 'string') cfg.name = d.name;
    if (typeof d.autosave === 'boolean') cfg.autosave = d.autosave;
    if (typeof d.every === 'number') cfg.every = Math.max(30, d.every);
  }

  return { cfg, save, open, list, autosaves, remove, update, sinceSave,
           serialize, restore, isBusy: () => _busy };
})();
