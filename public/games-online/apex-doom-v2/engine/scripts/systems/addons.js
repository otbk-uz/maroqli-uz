// ============================================================
//  🧩 ADDONS — kengaytma tizimi
//
//  Addon = APEX ni kengaytiruvchi kichik modul. Foydalanuvchi o'zi
//  yozadi, do'stiga ZIP qilib yuboradi, u import qiladi va tayyor
//  asboblardan (trigger, obyekt, sozlama) foydalanadi.
//
//  Addon papkasi:
//     addons/<id>/addon.json   — pasporti (nom, ikona, tavsif)
//     addons/<id>/main.js      — kodi, APEX.register(...) chaqiradi
//
//  `addons/index.json` — mavjud addonlar ro'yxati. Statik saytda
//  papka ichini o'qib bo'lmaydi, shuning uchun ro'yxat qo'lda yuritiladi.
//
//  ⚠ XAVFSIZLIK: addon — ODDIY JS KOD, u APEX ichida to'liq huquq bilan
//    ishlaydi. Faqat ishonchli manbadan olingan addonni o'rnating.
// ============================================================

const AddonSystem = (() => {
  'use strict';

  const LS_KEY   = 'apex_addons_imported';
  const DIR      = 'addons/';
  const API_VER  = 1;

  // id → { meta, tools, loaded, source: 'folder'|'imported', code }
  const _reg = new Map();
  let _openId = null;          // hozir ochiq addon
  let _scanned = false;
  let _scanErr = null;

  // ── localStorage: import qilingan addonlar ──────────────────
  function _loadImported() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function _saveImported(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; }
    catch (e) {
      log('⚠ Addon saqlanmadi — brauzer xotirasi to\'lgan', 'lw');
      return false;
    }
  }

  // ── Addon uchun beriladigan API ────────────────────────────
  //  Addon SAHNAGA shu orqali ta'sir qiladi. Ichki funksiyalarga
  //  to'g'ridan-to'g'ri tegmasligi uchun yupqa qatlam.
  function _makeApi(addonId) {
    const front = (dist = 4) => {
      const c = camera;
      return new THREE.Vector3(
        c.position.x + Math.sin(c.rotation.y) * -dist,
        Math.max(0.5, c.position.y - 0.5),
        c.position.z + Math.cos(c.rotation.y) * -dist);
    };

    const named = (obj, name) => {
      if (obj && obj.userData && name) obj.userData.name = name;
      return obj;
    };

    return {
      apiVersion: API_VER,
      addonId,

      // — Sahna havolalari (o'qish uchun) —
      get THREE()   { return THREE; },
      get scene()   { return scene; },
      get objects() { return objects; },
      get camera()  { return camera; },

      // — Joylashuv —
      frontOfCamera: front,
      place(obj, p) {
        if (!obj) return obj;
        if (p) obj.position.set(p.x || 0, p.y || 0, p.z || 0);
        else   obj.position.copy(front());
        return obj;
      },

      // — Yaratish —
      spawn: {
        /** Oddiy shakl: 'Kub' | 'Sfera' | 'Silindr' | 'Konus' | 'Uchburchak' ... */
        primitive(typeName, name) {
          const idx = (typeof PRIMITIVES !== 'undefined')
            ? PRIMITIVES.findIndex(p => p.name === typeName) : -1;
          const o = addObject(idx >= 0 ? idx : 0, 0, null);
          return named(o, name);
        },
        group(name) {
          const g = new THREE.Group();
          g.userData = { id: ++objIdC, name: name || 'Guruh', type: 'Group',
                         isGroup: true,          // ⚠ `_` siz — saqlashda yo'qolmasin
                         _isFolder: true, colliderMode: 'inline', children: [] };
          scene.add(g); objects.push(g);
          if (typeof updateHierarchy === 'function') updateHierarchy();
          return g;
        },
        hitbox(name) {
          if (!window.HitboxSystem) { log('⚠ Hitbox tizimi yo\'q', 'lw'); return null; }
          return named(HitboxSystem.create(front()), name);
        },
        button(name) {
          if (!window.InteractiveButtonSystem) { log('⚠ Tugma tizimi yo\'q', 'lw'); return null; }
          return named(InteractiveButtonSystem.create(front()), name);
        },
        gazeTrigger(name) {
          if (!window.InteractiveButtonSystem) return null;
          return named(InteractiveButtonSystem.createGaze(front()), name);
        },
        soundBlock(name) {
          if (!window.SoundBlockSystem) { log('⚠ Sound Block tizimi yo\'q', 'lw'); return null; }
          return named(SoundBlockSystem.create(front()), name);
        },
      },

      // — Ma'lumot —
      /** userData ga maydonlarni chuqur qo'shadi (mavjudini buzmaydi) */
      setData(obj, data) {
        if (!obj || !data) return obj;
        const merge = (dst, src) => {
          for (const k in src) {
            const v = src[k];
            if (v && typeof v === 'object' && !Array.isArray(v) &&
                dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) {
              merge(dst[k], v);
            } else {
              dst[k] = v;
            }
          }
        };
        merge(obj.userData, data);
        return obj;
      },
      color(obj, hex) {
        if (obj && obj.material && obj.material.color) {
          obj.material.color.set(hex);
          obj.material.needsUpdate = true;
        }
        return obj;
      },
      scale(obj, x, y, z) {
        if (obj) obj.scale.set(x, y ?? x, z ?? x);
        return obj;
      },

      // — Yordamchi —
      select(obj) { if (obj && typeof selectObject === 'function') selectObject(obj); return obj; },
      refresh() {
        if (typeof updateHierarchy === 'function') updateHierarchy();
        if (typeof updateStats === 'function') updateStats();
        if (typeof updateInspector === 'function') updateInspector();
      },
      log(msg, type) { log(`🧩 ${msg}`, type || 'lok'); },
      ask(question, def) { return prompt(question, def == null ? '' : def); },
    };
  }

  // ── Addon o'zini ro'yxatdan o'tkazadi ──────────────────────
  //  main.js ichida chaqiriladi: APEX.register({ id, name, tools:[...] })
  function register(manifest) {
    if (!manifest || !manifest.id) {
      log('❌ Addon: `id` ko\'rsatilmagan', 'le');
      return false;
    }
    const prev = _reg.get(manifest.id) || {};
    _reg.set(manifest.id, {
      meta: Object.assign({}, prev.meta, {
        id:          manifest.id,
        name:        manifest.name || manifest.id,
        icon:        manifest.icon || '🧩',
        version:     manifest.version || '1.0',
        author:      manifest.author || '',
        description: manifest.description || '',
      }),
      tools:  Array.isArray(manifest.tools) ? manifest.tools : [],
      loaded: true,
      source: prev.source || 'folder',
      code:   prev.code || null,
    });
    if (_openId === manifest.id) render();
    return true;
  }

  // ── Papkadagi addonlarni topish ────────────────────────────
  async function scan() {
    if (_scanned) return;
    _scanned = true;

    // 1) Papkadagilar
    try {
      const res = await fetch(DIR + 'index.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ids = await res.json();
      for (const id of (Array.isArray(ids) ? ids : [])) {
        try {
          const m = await (await fetch(`${DIR}${id}/addon.json`, { cache: 'no-store' })).json();
          _reg.set(id, {
            meta: Object.assign({ id, name: id, icon: '🧩', version: '1.0' }, m),
            tools: [], loaded: false, source: 'folder', code: null,
          });
        } catch (e) {
          log(`⚠ Addon o'qilmadi: ${id} (${e.message})`, 'lw');
        }
      }
    } catch (e) {
      // ⚠ `file://` da fetch ishlamaydi — bu eng ko'p uchraydigan sabab.
      _scanErr = (location.protocol === 'file:')
        ? 'file'
        : e.message;
    }

    // 2) Import qilinganlar (localStorage)
    for (const a of _loadImported()) {
      if (!a || !a.meta || !a.meta.id) continue;
      _reg.set(a.meta.id, {
        meta: a.meta, tools: [], loaded: false, source: 'imported', code: a.code || '',
      });
    }
    render();
  }

  // ── Addon kodini yuklash ───────────────────────────────────
  function _loadCode(entry) {
    return new Promise((resolve, reject) => {
      if (entry.loaded) return resolve(true);
      const s = document.createElement('script');
      s.onload  = () => resolve(true);
      s.onerror = () => reject(new Error('main.js yuklanmadi'));
      if (entry.source === 'imported') {
        // Import qilingan addon localStorage da matn sifatida yotadi
        const blob = new Blob([entry.code || ''], { type: 'text/javascript' });
        s.src = URL.createObjectURL(blob);
        s.onload = () => { URL.revokeObjectURL(s.src); resolve(true); };
      } else {
        s.src = `${DIR}${entry.meta.id}/main.js`;
      }
      document.head.appendChild(s);
    });
  }

  async function open(id) {
    const e = _reg.get(id);
    if (!e) return;
    _openId = id;
    render();                                  // "yuklanmoqda" holati
    if (!e.loaded) {
      try {
        await _loadCode(e);
        if (!_reg.get(id).loaded) {
          log(`⚠ "${e.meta.name}" APEX.register(...) chaqirmadi`, 'lw');
        }
      } catch (err) {
        log(`❌ Addon yuklanmadi: ${err.message}`, 'le');
      }
    }
    render();
  }

  function back() { _openId = null; render(); }

  function runTool(addonId, toolId) {
    const e = _reg.get(addonId);
    if (!e) return;
    const t = e.tools.find(x => x.id === toolId);
    if (!t || typeof t.run !== 'function') { log('⚠ Asbob topilmadi', 'lw'); return; }
    try {
      t.run(_makeApi(addonId));
      if (typeof captureState === 'function') captureState(`${e.meta.name}: ${t.name}`);
    } catch (err) {
      log(`❌ "${t.name}" xatosi: ${err.message}`, 'le');
      console.error('[addon:' + addonId + ']', err);
    }
  }

  // ── Import / o'chirish ─────────────────────────────────────
  async function importAddon() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.zip,.js';
    inp.onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        let meta, code;
        if (f.name.toLowerCase().endsWith('.zip')) {
          if (typeof JSZip === 'undefined') { log('❌ JSZip yuklanmagan', 'le'); return; }
          const zip = await JSZip.loadAsync(await f.arrayBuffer());
          // addon.json va main.js — ildizda yoki bitta papka ichida
          const jf = zip.file(/(^|\/)addon\.json$/)[0];
          const mf = zip.file(/(^|\/)main\.js$/)[0];
          if (!jf || !mf) throw new Error('ZIP ichida addon.json yoki main.js yo\'q');
          meta = JSON.parse(await jf.async('string'));
          code = await mf.async('string');
        } else {
          code = await f.text();
          const id = f.name.replace(/\.js$/i, '');
          meta = { id, name: id, icon: '🧩', version: '1.0' };
        }
        if (!meta.id) throw new Error('addon.json ichida `id` yo\'q');

        if (!confirm(
          `"${meta.name || meta.id}" addonini o'rnatasizmi?\n\n` +
          `⚠ Addon — oddiy JS kod va APEX ichida to'liq huquq bilan ishlaydi.\n` +
          `Faqat ishonchli manbadan olingan bo'lsa o'rnating.`)) return;

        const list = _loadImported().filter(a => a.meta.id !== meta.id);
        list.push({ meta, code });
        if (!_saveImported(list)) return;
        _reg.set(meta.id, { meta, tools: [], loaded: false, source: 'imported', code });
        render();
        log(`🧩 "${meta.name || meta.id}" addoni o'rnatildi`, 'lok');
      } catch (err) {
        log('❌ Addon import xatosi: ' + err.message, 'le');
      }
    };
    inp.click();
  }

  function remove(id) {
    const e = _reg.get(id);
    if (!e) return;
    if (e.source !== 'imported') {
      log('⚠ Papkadagi addon o\'chirilmaydi — addons/index.json dan olib tashlang', 'lw');
      return;
    }
    if (!confirm(`"${e.meta.name}" addonini o'chirasizmi?`)) return;
    _saveImported(_loadImported().filter(a => a.meta.id !== id));
    _reg.delete(id);
    if (_openId === id) _openId = null;
    render();
    log('🗑 Addon o\'chirildi', 'lw');
  }

  // ── UI ─────────────────────────────────────────────────────
  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function render() {
    const box = document.getElementById('addon-body');
    if (!box) return;

    // ── Ochiq addon: asboblari ──
    if (_openId) {
      const e = _reg.get(_openId);
      if (!e) { _openId = null; return render(); }
      const m = e.meta;
      box.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <button onclick="AddonSystem.back()" style="background:none;border:1px solid var(--border);
            color:var(--muted);font-size:11px;padding:3px 8px;border-radius:3px;cursor:pointer">← Orqaga</button>
          <span style="font-size:16px">${_esc(m.icon)}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:var(--text);font-weight:700;white-space:nowrap;
                        overflow:hidden;text-overflow:ellipsis">${_esc(m.name)}</div>
            <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">
              v${_esc(m.version)}${m.author ? ' · ' + _esc(m.author) : ''}</div>
          </div>
        </div>
        ${m.description ? `<div style="font-size:9px;color:var(--muted);line-height:1.6;
          margin-bottom:8px;padding:6px 8px;background:rgba(0,0,0,.2);border-radius:3px">
          ${_esc(m.description)}</div>` : ''}
        ${!e.loaded
          ? `<div style="font-size:10px;color:var(--muted);padding:10px;text-align:center">Yuklanmoqda…</div>`
          : (e.tools.length
              ? `<div style="display:flex;flex-direction:column;gap:3px">${e.tools.map(t => `
                  <div class="asset-entity-item" onclick="AddonSystem.runTool('${_esc(_openId)}','${_esc(t.id)}')">
                    <span class="ae-icon">${_esc(t.icon || '🔧')}</span>
                    <div class="ae-info">
                      <div class="ae-name">${_esc(t.name || t.id)}</div>
                      <div class="ae-desc">${_esc(t.desc || '')}</div>
                    </div>
                  </div>`).join('')}</div>`
              : `<div style="font-size:10px;color:#ffaa44;padding:10px;text-align:center;line-height:1.6">
                   Bu addon hech qanday asbob bermadi.<br>
                   <span style="font-size:8px;color:var(--muted)">main.js ichida
                   APEX.register({ tools:[…] }) chaqirilganini tekshiring.</span></div>`)}`;
      return;
    }

    // ── Ro'yxat ──
    const items = [..._reg.values()];
    let html = `
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <button onclick="AddonSystem.importAddon()" style="flex:1;background:rgba(160,120,255,.1);
          border:1px solid rgba(160,120,255,.35);color:#a078ff;font-family:'Rajdhani','Segoe UI',Arial,sans-serif;
          font-size:11px;font-weight:700;padding:6px;border-radius:3px;cursor:pointer">📥 Addon o'rnatish</button>
      </div>
      <div style="font-family:'Share Tech Mono','Courier New',monospace;font-size:8px;color:var(--muted);
                  margin-bottom:6px;line-height:1.6">
        Kengaytmalar — qo'shimcha asbob va triggerlar.<br>
        Papka: <span style="color:#a078ff">addons/&lt;id&gt;/</span> · ZIP yoki .js import qilinadi.
      </div>`;

    if (_scanErr === 'file') {
      html += `<div style="font-size:9px;color:#ffaa44;background:rgba(255,170,68,.07);
        border:1px solid rgba(255,170,68,.25);border-radius:3px;padding:7px 9px;
        margin-bottom:6px;line-height:1.7">
        ⚠ Papkadagi addonlar o'qilmadi — sahifa <b>file://</b> orqali ochilgan.<br>
        Terminalda <b style="color:#a078ff">node server.js</b> ni ishga tushiring.<br>
        <span style="color:var(--muted)">Import qilingan addonlar baribir ishlaydi.</span>
      </div>`;
    }

    if (!items.length) {
      html += `<div style="font-size:10px;color:var(--muted);padding:14px;text-align:center;line-height:1.7">
        Hali addon yo'q.<br><span style="font-size:8px">📥 tugmasi orqali o'rnating yoki
        <b>addons/</b> papkasiga qo'shing.</span></div>`;
    } else {
      html += `<div style="display:flex;flex-direction:column;gap:3px">${items.map(e => {
        const m = e.meta;
        return `<div class="asset-entity-item" onclick="AddonSystem.open('${_esc(m.id)}')">
          <span class="ae-icon">${_esc(m.icon)}</span>
          <div class="ae-info">
            <div class="ae-name">${_esc(m.name)}</div>
            <div class="ae-desc">v${_esc(m.version)}${m.author ? ' · ' + _esc(m.author) : ''}${
              e.source === 'imported' ? ' · o\'rnatilgan' : ''}</div>
          </div>
          ${e.source === 'imported'
            ? `<button title="O'chirish" onclick="AddonSystem.remove('${_esc(m.id)}');event.stopPropagation()"
                 style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;
                        padding:2px 5px;border-radius:2px;cursor:pointer">✕</button>` : ''}
        </div>`;
      }).join('')}</div>`;
    }
    box.innerHTML = html;
  }

  // ============================================================
  //  💾 SAHNA BILAN BIRGA SAQLASH
  //
  //  ⚠ Ilgari addonlar FAQAT `localStorage` da yashardi. Ya'ni siz
  //    yasagan karta do'stingizga borsa, addonlar KELMASDI: kartada
  //    addon asbobi bilan qo'yilgan obyekt bor, lekin addonning o'zi
  //    yo'q — hech nima ishlamasdi.
  //
  //    Endi ular sahna ZIP idagi `addons/` papkasiga chiqadi.
  //  ⚠ Faqat IMPORT QILINGANLAR. `addons/` papkasidagi standart
  //    addonlar dvigatel bilan birga keladi — ularni ikkilantirish
  //    shart emas.
  // ============================================================
  function serialize() {
    const list = _loadImported();
    return {
      version: API_VER,
      addons: list.map(a => ({ meta: a.meta, code: a.code || '' })),
    };
  }

  /**
   * ZIP dan kelgan addonlarni o'rnatadi.
   * ⚠ MAVJUDLARI USTIGA YOZILMAYDI — foydalanuvchining o'z addoni
   *   kartadagi eski nusxa bilan almashib ketmasin.
   * @returns {number} yangi o'rnatilganlar soni
   */
  function restore(data) {
    if (!data) return 0;
    const incoming = Array.isArray(data) ? data : (data.addons || []);
    if (!incoming.length) return 0;
    const list = _loadImported();
    const have = new Set(list.map(a => a.meta && a.meta.id));
    let n = 0;
    for (const a of incoming) {
      if (!a || !a.meta || !a.meta.id) continue;
      if (have.has(a.meta.id)) continue;          // bizda bor — tegmaymiz
      list.push({ meta: a.meta, code: a.code || '' });
      _reg.set(a.meta.id, { meta: a.meta, tools: [], loaded: false,
                            source: 'imported', code: a.code || '' });
      have.add(a.meta.id);
      n++;
    }
    if (n) {
      _saveImported(list);
      try { if (typeof log === 'function') log(`🧩 ${n} ta addon kartadan o'rnatildi`, 'lok'); } catch (e) {}
      try { render(); } catch (e) {}
    }
    return n;
  }

  return { scan, render, open, back, runTool, register, importAddon, remove,
           serialize, restore,
           _reg, _makeApi };
})();

window.AddonSystem = AddonSystem;

// ── Addon mualliflari uchun ommaviy API ──────────────────────
//  main.js ichida: APEX.register({ id, name, icon, tools: [...] })
window.APEX = {
  version: 1,
  register: m => AddonSystem.register(m),
};

// Assets paneli ochilganda ro'yxat tayyor bo'lsin
window.addonRenderList = function() {
  AddonSystem.scan();      // bir marta skanerlaydi, keyin render qiladi
  AddonSystem.render();
};
