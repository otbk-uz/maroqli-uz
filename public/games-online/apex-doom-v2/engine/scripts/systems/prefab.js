// ============================================================
// PREFAB TIZIMI v2 — to'liq xotira: entity (oyinchi/avto) xarakteri,
// model + texture, scale + rotation (POZITSIYA emas).
// Eksport papka ko'rinishida:
//   apex-prefab-(nom).zip / Models/ , Textures/ , apex-file.json
// ============================================================
const PrefabSystem = {
  _key: 'apex3d_prefabs',

  // ============================================================
  //  💾 SAQLASH — `prefabs/` PAPKASI
  // ------------------------------------------------------------
  //  ⚠ NEGA DISKDA, `localStorage` DA EMAS:
  //    `localStorage` ~5 MB bilan cheklangan va brauzer tarixini
  //    tozalasangiz butun kutubxona yo'qoladi. Bitta GLB model esa
  //    o'zi 10 MB bo'lishi mumkin — ikkita prefab saqlasangiz joy
  //    tugardi va "kutubxonaga sig'madi" degan xabar chiqardi.
  //
  //    Endi har prefab — `prefabs/<nom>/` papkasi: `prefab.json` +
  //    `texture/ models/ sound/ video/ html/`. Papkani do'stingizga
  //    yuborish, git ga qo'yish, qo'lda tahrirlash mumkin.
  //
  //  ⚠ NEGA XOTIRADA KESH BOR: `load()` — SINXRON funksiya va uni
  //    o'nlab joy chaqiradi (ro'yxat chizish, qo'yish, o'chirish).
  //    Uni `async` qilsak o'sha joylarning hammasini qayta yozish
  //    kerak bo'lardi. Shuning uchun disk — MANBA, kesh esa
  //    ishchi nusxa: dastur ochilganda diskdan to'ldiriladi.
  //
  //  ⚠ `localStorage` ZAXIRA bo'lib qoldi: dvigatel `file://` orqali
  //    ochilsa server yo'q — shunda eski yo'l ishlaydi.
  // ============================================================
  _cache: null,
  _diskOn: true,          // server javob bermasa `false` ga tushadi

  load() {
    if (this._cache) return this._cache;
    try { this._cache = JSON.parse(localStorage.getItem(this._key) || '[]'); }
    catch { this._cache = []; }
    return this._cache;
  },

  save(list) {
    this._cache = list;
    // Zaxira — server yo'q bo'lsa ham nimadir qolsin
    try { localStorage.setItem(this._key, JSON.stringify(list)); } catch (e) {}
    return true;
  },

  /** Prefab papkasining nomi (ikki xil prefab bir joyga tushmasin). */
  _dirOf(p) {
    const base = this._safe(p.name || 'prefab');
    const same = (this._cache || []).filter(x => this._safe(x.name || '') === base);
    return (same.length > 1 && same[0].id !== p.id) ? base + '-' + p.id : base;
  },

  /**
   * 📤 Bitta prefabni `prefabs/<nom>/` ga yozadi.
   * ⚠ Aktivlar `AssetBundle` bilan papkalarga ajratiladi — sahna va
   *   ZIP eksporti bilan AYNAN bir xil yo'l.
   */
  async saveToDisk(p) {
    if (!this._diskOn || !p) return false;
    try {
      const manifest = {
        apexPrefab: true, version: 4,
        id: p.id, name: p.name, icon: p.icon, created: p.created,
        data: JSON.parse(JSON.stringify(p.data)),
        timeline: p.timeline || null,
      };
      // ⚠ JSZip shimi: `AssetBundle` faqat `file()` ni chaqiradi.
      //   Haqiqiy ZIP yasash shart emas — bizga fayllar RO'YXATI
      //   kerak, uni to'g'ridan serverga yuboramiz.
      const files = {};
      const shim = {
        file(name, payload, opt) {
          files[name] = (opt && opt.base64)
            ? payload
            : btoa(unescape(encodeURIComponent(payload)));   // matn → base64
          return this;
        },
        folder() { return this; },
      };
      if (window.AssetBundle) { try { AssetBundle.extract(manifest, shim); } catch (e) {} }

      const r = await fetch('/api/prefab/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this._dirOf(p), prefab: manifest, files }),
      }).then(x => x.json());
      if (!r.ok) throw new Error(r.error || 'server rad etdi');
      log(`📦 "${p.name}" → ${r.path}/ (${r.files} fayl)`, 'lok');
      return true;
    } catch (e) {
      // ⚠ Bir marta uzilsa qayta-qayta urinmaymiz: `file://` da har
      //   saqlashda konsol xato bilan to'lardi.
      this._diskOn = false;
      log('⚠ Prefab papkaga yozilmadi (server yo\'qmi?) — zaxira: brauzer xotirasi', 'lw');
      return false;
    }
  },

  /** 🗑 Papkani ham o'chiradi. */
  async deleteFromDisk(p) {
    if (!this._diskOn || !p) return false;
    try {
      await fetch('/api/prefab/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this._dirOf(p) }),
      });
      return true;
    } catch (e) { return false; }
  },

  /**
   * 📥 Dastur ochilganda `prefabs/` dan o'qiydi.
   * ⚠ Disk — MANBA: brauzer xotirasidagi eski nusxa ustiga yoziladi.
   *   Aks holda boshqa kompyuterdan ko'chirib kelingan papkalar
   *   ko'rinmasdi.
   */
  async syncFromDisk() {
    try {
      const r = await fetch('/api/prefab/list').then(x => x.json());
      if (!r || !r.ok) throw new Error('ro\'yxat yo\'q');
      const out = [];
      for (const it of (r.prefabs || [])) {
        const one = await fetch('/api/prefab/load/' + encodeURIComponent(it.dir))
          .then(x => x.json()).catch(() => null);
        if (!one || !one.ok) continue;
        const man = one.prefab;
        // Aktivlarni qaytarish — fayllardan xotirada ZIP yasaymiz
        if (window.AssetBundle && typeof JSZip !== 'undefined' &&
            one.files && Object.keys(one.files).length) {
          const z = new JSZip();
          for (const rel in one.files) z.file(rel, one.files[rel], { base64: true });
          try { await AssetBundle.resolve(man, z); } catch (e) {}
        }
        out.push({
          id: man.id || Date.now() + out.length,
          name: man.name || it.dir, icon: man.icon || '🧱',
          created: man.created || '', apexPrefab: true,
          version: man.version || 4, data: man.data, timeline: man.timeline || null,
        });
      }
      this._cache = out;
      try { localStorage.setItem(this._key, JSON.stringify(out)); } catch (e) {}
      if (typeof prefabRenderList === 'function') prefabRenderList();
      if (out.length) log(`📦 ${out.length} ta prefab "prefabs/" papkasidan yuklandi`, 'lok');
      return out.length;
    } catch (e) {
      this._diskOn = false;
      return -1;                   // server yo'q — zaxira ishlaydi
    }
  },

  // ── ArrayBuffer <-> base64 ────────────────────────────────
  _ab2b64(buf) {
    let bin = '';
    const bytes = new Uint8Array(buf), chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk)
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  },
  _b642ab(b64) {
    const bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  },
  _safe(s) { return String(s || 'asset').replace(/[^a-zA-Z0-9_\-]/g, '_'); },

  // ── ⚠ TUZATILDI: FUNKSIONAL userData NI SAQLASH ────────────
  // Eski kod faqat name/type/rot/scale/material/model ni saqlardi.
  // Natijada isHitbox, actions, isCamera, camViewMode, isInteractiveBtn,
  // targetObjectId ... — HAMMASI yo'qolardi. Prefab spawn qilinganda
  // element oddiy kubga aylanib qolardi.
  //
  // Endi: runtime maydonlardan tashqari HAMMASI saqlanadi (blacklist usuli,
  // shunda kelajakda yangi xususiyat qo'shilsa avtomatik ishlaydi).
  _RUNTIME_KEYS: new Set([
    'id', 'parentId',              // spawn da qaytadan beriladi
    '_glbBuffer',                  // alohida modelB64 sifatida ketadi
    'textureBase64', 'textureName' // alohida textureB64 sifatida ketadi
  ]),

  _cleanUD(ud) {
    if (!ud) return {};
    const out = {};
    for (const k in ud) {
      if (this._RUNTIME_KEYS.has(k)) continue;
      if (k.startsWith('_')) continue;          // _mixer, _isActive, _entitiesInside, _timerT ...
      const v = ud[k];
      if (typeof v === 'function') continue;
      if (v instanceof Map || v instanceof Set) continue;
      if (v && v.isObject3D) continue;          // sahna havolalarini saqlab bo'lmaydi
      try { out[k] = JSON.parse(JSON.stringify(v)); } catch { /* seriyalanmaydi — tashlab ketamiz */ }
    }
    return out;
  },

  // Prefab ichidagi bog'lanishlarni tiklash uchun: eski id → yangi id
  // (actions.camera.camId, targetObjectId, spawnId, objId ... hammasi remap qilinadi)
  // ⚠ Faqat ODDIY obyekt/massivga kiramiz. DOM elementlari (PC block CSS3D div,
  //   iframe) va THREE obyektlarining xususiyatlariga yozib bo'lmaydi —
  //   `for..in` ular ustida yursa `outerText` kabi setter ishga tushib
  //   "Element has no parent" xatosini beradi va prefab buziladi.
  _isPlainObj(o) {
    if (typeof Node !== 'undefined' && o instanceof Node) return false;
    if (o.isObject3D || o.isMaterial || o.isTexture || o.isBufferGeometry) return false;
    const p = Object.getPrototypeOf(o);
    return p === Object.prototype || p === null;
  },
  _remapIds(val, map, depth = 0) {
    if (depth > 12 || val == null) return val;
    if (Array.isArray(val)) return val.map(v => this._remapIds(v, map, depth + 1));
    if (typeof val === 'object') {
      if (!this._isPlainObj(val)) return val;
      for (const k in val) {
        const v = val[k];
        // id ga o'xshash kalitlar: camId, targetObjectId, spawnId, objId, btnId, sourceObjId ...
        if ((typeof v === 'string' || typeof v === 'number') && /(^|[a-z])id$/i.test(k)) {
          if (map.has(String(v))) { val[k] = map.get(String(v)); continue; }
        }
        val[k] = this._remapIds(v, map, depth + 1);
      }
      return val;
    }
    return val;
  },

  // Global playerSettings ning saqlanadigan (xarakter) qismini nusxalash
  _snapshotPlayerSettings() {
    if (typeof playerSettings === 'undefined') return null;
    const out = {};
    for (const k in playerSettings) {
      if (k.startsWith('_')) continue;          // runtime maydonlarni tashlab ketamiz
      if (k === 'keys') { out.keys = { ...playerSettings.keys }; continue; }
      const v = playerSettings[k];
      if (typeof v === 'function') continue;
      out[k] = v;
    }
    return out;
  },

  // ── OBYEKTNI SERIALIZE QILISH (base64 inline) ─────────────
  _serializeObj(obj) {
    const ud  = obj.userData || {};
    const mat = obj.material;
    const isGLB = !!(ud.isGLB || ud.isGLTF);

    // Model bufferini topish (to'g'ridan import yoki asset kutubxonadan)
    let modelB64 = null, modelName = null;
    if (isGLB) {
      let buf = ud._glbBuffer;
      if (!buf && typeof loadedModels !== 'undefined') {
        const lm = loadedModels.find(m => m.name === ud.name);
        if (lm) buf = lm.buffer;
      }
      if (buf) { modelB64 = this._ab2b64(buf); modelName = this._safe(ud.name) + '.glb'; }
    }

    // Entity (oyinchi / avto) xarakteri
    const isPlayer = !!ud.isPlayerObj;
    const isCar    = ud.entityType === 'car' || ud._entityMode === 'vehicle' || !!ud.isCar;
    const carCfg   = isCar
      ? JSON.parse(JSON.stringify(
          ud._carCfg || (window._getCarCfg ? window._getCarCfg(obj) : {}) || {}))
      : null;

    const data = {
      name: ud.name || 'Object',
      type: ud.type || 'Mesh',
      // ⚠ YANGI: eski id (prefab ichidagi bog'lanishlarni remap qilish uchun)
      oldId: ud.id != null ? String(ud.id) : null,
      // ⚠ YANGI: to'liq funksional userData — hitbox actions, kamera sozlamalari,
      // tugma konfiguratsiyasi, collisionMode, colliderMode va h.k.
      ud: this._cleanUD(ud),
      // ⚠ POZITSIYA SAQLANADI — bu LOKAL koordinata (ota-onaga nisbatan).
      //   Ilgari saqlanmasdi va prefab ichidagi HAMMA element (0,0,0) ga
      //   tushib, bir joyda g'ijim bo'lib chiqardi. ILDIZ pozitsiyasi
      //   spawn paytida baribir kamera oldiga qo'yiladi (`_spawnRecord`),
      //   shuning uchun uni saqlash zarar qilmaydi.
      px: obj.position.x, py: obj.position.y, pz: obj.position.z,
      rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z,
      sx: obj.scale.x,    sy: obj.scale.y,    sz: obj.scale.z,
      physMode: ud.physMode || 'solid',
      isGroup: obj.isGroup || !!ud.isGroup || !!ud._isFolder,
      isGLB,
      script: ud.script || '',
      material: mat ? {
        color:    '#' + (mat.color    ? mat.color.getHexString()    : '88aacc'),
        emissive: '#' + (mat.emissive ? mat.emissive.getHexString() : '000000'),
        roughness: mat.roughness ?? 0.5,
        metalness: mat.metalness ?? 0.3,
        opacity:   mat.opacity   ?? 1.0,
        transparent: mat.transparent ?? false,
        emissiveIntensity: mat.emissiveIntensity ?? 0,
      } : null,
      // Model + texture (inline base64 — kutubxona / spawn uchun)
      modelB64, modelName,
      textureB64:  ud.textureBase64 || null,
      textureName: ud.textureName   || null,
      // Entity xarakteri: kamera, maks/min tezlik, rang, tugmalar, nitro ...
      entity: {
        isPlayer, isCar,
        entityMode: ud._entityMode || null,
        entityType: ud.entityType || null,
        carCfg,
        playerSettings: isPlayer ? this._snapshotPlayerSettings() : null,
      },
      children: [],
    };

    // Bolalar (GLB ichki meshlari emas — faqat userData.id bor obyektlar)
    if (!isGLB && obj.children) {
      obj.children.forEach(ch => {
        if ((ch.isMesh || ch.isGroup) && ch.userData && ch.userData.id) {
          data.children.push(this._serializeObj(ch));
        }
      });
    }
    return data;
  },

  _iconFor(obj) {
    const ud = obj.userData || {};
    if (ud.isPlayerObj) return '🎮';
    if (ud.entityType === 'car' || ud._entityMode === 'vehicle' || ud.isCar) return '🚗';
    if (ud.isGLB || ud.isGLTF) return '🧊';
    if (ud.isGroup || obj.isGroup || ud._isFolder) return '📦';
    if (ud.type === 'Tekislik') return '⬜';
    if (ud.physMode === 'jelly')  return '🟢';
    if (ud.physMode === 'liquid') return '🔵';
    return '🧱';
  },

  // ── ⏱ TIMELINE — prefab ichidagi obyektlarning treklari ────
  //  ⚠ `tlTracks` GLOBAL obyekt (obyekt id → trek), userData ICHIDA EMAS.
  //    Shu sabab `_cleanUD` uni ko'ra olmasdi va prefabda lift, eshik,
  //    ko'targich kabi TIMELINE bilan harakatlanadigan narsalar
  //    jonsiz kub bo'lib chiqardi — eng ko'p sezilgan kamchilik shu edi.
  //  `save-load.js` sahna saqlashda buni qiladi; prefab qilmasdi.
  _collectTimeline(root) {
    if (typeof tlTracks === 'undefined' || !tlTracks) return null;
    const ids = new Set();
    root.traverse(o => {
      if (o.userData && o.userData.id != null) ids.add(String(o.userData.id));
    });
    const tracks = [];
    for (const key in tlTracks) {
      if (!ids.has(String(key))) continue;      // prefabdan tashqaridagi treklar
      const tr = tlTracks[key];
      if (!tr) continue;
      const kf  = tr.keyframes    || [];
      const vkf = tr.visKeyframes || [];
      if (!kf.length && !vkf.length) continue;  // bo'sh trekni saqlamaymiz
      try {
        tracks.push({
          oldId:        String(key),
          name:         tr.name || '',
          keyframes:    JSON.parse(JSON.stringify(kf)),
          visKeyframes: JSON.parse(JSON.stringify(vkf)),
        });
      } catch (e) { /* seriyalanmaydigan trek — tashlab ketamiz */ }
    }
    if (!tracks.length) return null;
    return {
      duration: (typeof tlDuration !== 'undefined' ? tlDuration : 5),
      tracks,
    };
  },

  /**
   * Treklarni YANGI id lar bilan tiklaydi.
   * ⚠ Sahnadagi mavjud treklar O'CHIRILMAYDI — prefab sahnaga qo'shiladi,
   *   uni almashtirmaydi. `save-load.js` dagi yuklashdan farqi shu.
   */
  _restoreTimeline(tl, idMap) {
    if (!tl || !Array.isArray(tl.tracks) || !tl.tracks.length) return 0;
    if (typeof tlTracks === 'undefined' || !tlTracks) return 0;
    let n = 0;
    for (const t of tl.tracks) {
      const newId = idMap.get(String(t.oldId));
      if (newId == null) continue;
      const obj = objects.find(o => o.userData && String(o.userData.id) === String(newId));
      if (!obj) continue;
      tlTracks[newId] = {
        name:         obj.userData.name || t.name || '',
        objRef:       obj,
        keyframes:    t.keyframes    || [],
        visKeyframes: t.visKeyframes || [],
      };
      n++;
    }
    // Prefab uzunroq bo'lsa — timeline oynasini kengaytiramiz, aks holda
    // oxirgi keyframelar ko'rinmay qoladi.
    if (n && typeof tlDuration !== 'undefined' && tl.duration > tlDuration) {
      tlDuration = tl.duration;
    }
    if (n && typeof tlRender === 'function') { try { tlRender(); } catch (e) {} }
    return n;
  },

  // ── PREFAB YOZUVINI QURISH ────────────────────────────────
  _buildRecord(obj, name) {
    return {
      id: Date.now(),
      name,
      icon: this._iconFor(obj),
      created: new Date().toLocaleDateString(),
      apexPrefab: true,
      version: 3,                          // v3 — timeline qo'shildi
      data: this._serializeObj(obj),
      timeline: this._collectTimeline(obj),
    };
  },

  saveFromSelected() {
    const obj = selectedObj;
    if (!obj || !obj.userData || !obj.userData.id) { log('⚠ Avval objectni tanlang', 'lw'); return; }
    const name = prompt('Prefab nomi:', obj.userData.name || 'Prefab');
    if (!name) return;
    const rec  = this._buildRecord(obj, name);
    const list = this.load();
    list.push(rec);
    const ok = this.save(list);
    // 💾 Papkaga ham yozamiz
    this.saveToDisk(prefab);
    prefabRenderList();
    const e = rec.data.entity;
    const tag = e.isPlayer ? ' (🎮 oyinchi xarakteri bilan)'
              : e.isCar    ? ' (🚗 avto xarakteri bilan)'  : '';
    log(`⭐ "${name}" prefab saqlandi${tag}`, 'lok');
    if (!ok) log('↳ Kutubxonaga sig\'madi, lekin ⬇ZIP bilan eksport qilishingiz mumkin', 'lw');
  },

  // Tanlangan obyektni to'g'ridan ZIP qilib eksport (kutubxonaga yozmasdan)
  exportSelected() {
    const obj = selectedObj;
    if (!obj || !obj.userData || !obj.userData.id) { log('⚠ Avval objectni tanlang', 'lw'); return; }
    const name = prompt('Prefab nomi:', obj.userData.name || 'Prefab');
    if (!name) return;
    this._exportRecord(this._buildRecord(obj, name));
  },

  // ── SPAWN ─────────────────────────────────────────────────
  _restoreEntity(mesh, node) {
    const e = node.entity; if (!e) return;
    const ud = mesh.userData;

    if (e.isCar) {
      ud._entityMode = e.entityMode || 'vehicle';
      ud.entityType  = e.entityType || 'car';
      ud.isCar = true;
      if (e.carCfg) ud._carCfg = JSON.parse(JSON.stringify(e.carCfg));
      // Oldi strelkasini qo'shish (mavjud bo'lsa)
      if (window.setEntityMode) { try { setEntityMode(mesh, 'vehicle'); } catch {} }
      log(`🚗 "${node.name}" — avto xarakteri tiklandi (maks ${e.carCfg?.maxSpeed ?? '?'} km/h)`, 'lok');
    }

    if (e.isPlayer) {
      // Boshqa oyinchilarni tozalab, shuni oyinchi qilamiz
      if (typeof objects !== 'undefined') objects.forEach(o => { o.userData.isPlayerObj = false; });
      ud.isPlayerObj = true;
      // Global playerSettings ga xarakterni qaytaramiz (kamera, tezlik, tugmalar ...)
      if (e.playerSettings && typeof playerSettings !== 'undefined') {
        for (const k in e.playerSettings) {
          if (k === 'keys') Object.assign(playerSettings.keys, e.playerSettings.keys);
          else playerSettings[k] = e.playerSettings[k];
        }
      }
      log(`🎮 "${node.name}" — oyinchi xarakteri tiklandi`, 'lok');
    }
  },

  // Texture ni data URL dan yuklab, to'g'ri rang fazosi bilan qaytaradi (versiyaga moslangan)
  _makeTexture(dataUrl, onReady) {
    const tex = new THREE.TextureLoader().load(dataUrl, t => { if (onReady) onReady(t); });
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in tex && THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    return tex;
  },

  // ⚠ ASINXRON — GLTFLoader.parse callback bilan ishlaydi, shuning uchun await qilinadi.
  async _spawnNode(node, parentObj, idMap) {
    let mesh = null;

    // 1) GLB model bo'lsa — bufferdan tiklash (parse tugaguncha KUTAMIZ)
    if (node.isGLB && node.modelB64 && typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      try {
        const buf    = this._b642ab(node.modelB64);
        const loader = getGLTFLoader();
        mesh = await new Promise(resolve => {
          loader.parse(buf, '', gltf => {
            const clone   = gltf.scene;
            const wrapper = new THREE.Group();
            wrapper.add(clone);
            const box = new THREE.Box3().setFromObject(clone);
            const sz  = box.getSize(new THREE.Vector3());
            const bbox = new THREE.Mesh(
              new THREE.BoxGeometry(sz.x || 1, sz.y || 1, sz.z || 1),
              new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 }));
            bbox.position.copy(box.getCenter(new THREE.Vector3()));
            wrapper.add(bbox);
            wrapper.traverse(ch => { if (ch.isMesh || ch.isSkinnedMesh) { ch.castShadow = true; ch.receiveShadow = true; } });
            wrapper.userData._glbBuffer = buf;  // qayta eksport uchun
            // GLB ustiga qo'shimcha texture berilgan bo'lsa — meshlarga qo'llash
            if (node.textureB64) {
              const tex = this._makeTexture(node.textureB64);
              wrapper.traverse(ch => {
                if (ch.isMesh && ch.material) {
                  const apply = mt => { mt.map = tex; mt.needsUpdate = true; };
                  Array.isArray(ch.material) ? ch.material.forEach(apply) : apply(ch.material);
                }
              });
            }
            resolve(wrapper);
          }, err => { log('⚠ GLB parse xatosi: ' + (err?.message || err), 'lw'); resolve(null); });
        });
      } catch (err) { log('⚠ GLB tiklashda xato: ' + err.message, 'lw'); }
    }

    // 2) Group/folder yoki primitive
    if (!mesh) {
      if (node.isGroup || (node.children && node.children.length > 0)) {
        mesh = new THREE.Group();
      } else {
        const geoMap = {
          'Kub': ()=>new THREE.BoxGeometry(1,1,1),
          'BoxGeometry': ()=>new THREE.BoxGeometry(1,1,1),
          'Sfera': ()=>new THREE.SphereGeometry(0.5,16,16),
          'Silindr': ()=>new THREE.CylinderGeometry(0.5,0.5,1,16),
          'Konus': ()=>new THREE.ConeGeometry(0.5,1,16),
          'Tekislik': ()=>new THREE.PlaneGeometry(2,2),
          'Torus': ()=>new THREE.TorusGeometry(0.5,0.2,12,36),
        };
        const geoFn = geoMap[node.type] || geoMap['Kub'];
        const m   = node.material || {};
        const mat = new THREE.MeshStandardMaterial({
          color: m.color || '#88aacc',
          roughness: m.roughness ?? 0.5,
          metalness: m.metalness ?? 0.3,
          opacity:   m.opacity   ?? 1.0,
          transparent: m.transparent ?? false,
          emissiveIntensity: m.emissiveIntensity ?? 0,
        });
        if (m.emissive) mat.emissive.set(m.emissive);
        // Texture (rang/tekstura) tiklash — to'g'ri rang fazosi + needsUpdate
        if (node.textureB64) {
          try {
            mat.map = this._makeTexture(node.textureB64, () => { mat.needsUpdate = true; });
            mat.needsUpdate = true;
          } catch (e) { log('⚠ Texture tiklashda xato: ' + e.message, 'lw'); }
        }
        mesh = new THREE.Mesh(geoFn(), mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
      }
    }

    // 3) Transform — pozitsiya + rotation + scale
    //  ⚠ Bolalar uchun pozitsiya SHART: ota-onaga nisbatan lokal joylashuv.
    //    Ildizniki keyin `_spawnRecord` da kamera oldiga ko'chiriladi.
    mesh.position.set(node.px || 0, node.py || 0, node.pz || 0);
    mesh.rotation.set(node.rx||0, node.ry||0, node.rz||0);
    mesh.scale.set(node.sx||1, node.sy||1, node.sz||1);

    // 4) userData
    // ⚠ TUZATILDI: avval saqlangan FUNKSIONAL userData yoyiladi
    // (isHitbox, actions, isCamera, camViewMode, fov, isInteractiveBtn,
    //  hitboxSize, collisionMode, colliderMode, triggerType ...),
    // keyin ustidan tizim maydonlari yoziladi.
    mesh.userData = Object.assign(mesh.userData || {}, node.ud || {}, {
      id: ++objIdC,
      name: node.name,
      type: node.type,
      physMode: node.physMode || 'solid',
      script: node.script || '',
      isGroup: node.isGroup,
      isGLB: node.isGLB || mesh.userData?.isGLB || false,
      textureBase64: node.textureB64 || mesh.userData?.textureBase64 || null,
      textureName:   node.textureName || mesh.userData?.textureName || null,
      parentId: parentObj ? parentObj.userData.id : null,
    });

    // Eski id → yangi id (bog'lanishlarni keyin remap qilish uchun)
    if (idMap && node.oldId != null) idMap.set(String(node.oldId), mesh.userData.id);

    // ── KO'RINISHNI TIKLASH ──────────────────────────────────
    //  ⚠ Ilgari bu yerda 8 shoxli `if/else` zanjiri turardi va AYNAN
    //    o'shanday zanjir `save-load.js` da ham bor edi. Ikki nusxa
    //    bir-biridan ajralib ketgan: tugma `save-load` da yo'q edi,
    //    hitbox/sound/map-loader esa `prefab` da bor, `save-load` da yo'q.
    //    Endi ikkalasi ham `SceneTypes` ro'yxatidan o'qiydi.
    //
    //  `restore()` obyektni ALMASHTIRISHI mumkin (kub → kamera modeli,
    //  kub → ko'z ikonasi). Transform ko'chirish va eski resurslarni
    //  bo'shatish ro'yxatning o'zida bajariladi.
    const placed = window.SceneTypes ? SceneTypes.restore(mesh) : mesh;
    if (placed !== mesh) mesh = placed;

    // 5) Sahnaga qo'shish
    // ⚠ TUZATILDI: BOLA BO'LSA HAM objects[] ga qo'shiladi.
    // Eski kod bolalarni objects[] ga qo'shmagani uchun prefab ichidagi
    // hitbox/tugma/kamera hech qaysi tizimga ko'rinmasdi — o'lik element edi.
    if (parentObj) parentObj.add(mesh);
    else scene.add(mesh);
    objects.push(mesh);

    // 6) Entity xarakterini tiklash
    this._restoreEntity(mesh, node);

    // 7) Bolalar — har birini ketma-ket await qilamiz
    if (node.children) {
      for (const ch of node.children) await this._spawnNode(ch, mesh, idMap);
    }
    return mesh;
  },

  async spawn(id) {
    const prefab = this.load().find(p => p.id === id);
    if (!prefab) { log('⚠ Prefab topilmadi', 'lw'); return; }
    await this._spawnRecord(prefab);
  },

  async _spawnRecord(prefab) {
    // ⚠ ESKI PREFAB TEKSHIRUVI.
    //   v3 gacha bo'lgan prefablarda qismlarning pozitsiyasi UMUMAN
    //   saqlanmagan — spawn qilinganda hammasi (0,0,0) ga tushib g'ijim
    //   bo'ladi. Buni kod tuzata olmaydi: ma'lumotning o'zi yo'q.
    //   Shuning uchun foydalanuvchiga aniq aytamiz.
    const _kids = (prefab.data && prefab.data.children) || [];
    if (_kids.length > 1 && _kids.every(c => c.px === undefined)) {
      log(`⚠ "${prefab.name}" ESKI formatda (v${prefab.version || 2}) saqlangan — ` +
          `qismlar joylashuvi yo'q, bir joyga to'planadi.`, 'lw');
      log('↳ Tuzatish: sahnada joylashtirib, prefabni QAYTA saqlang.', 'lw');
    }

    // ⚠ YANGI: eski id → yangi id xaritasi
    const idMap = new Map();
    const root = await this._spawnNode(prefab.data, null, idMap);
    if (!root) { log('❌ Prefab spawn bo\'lmadi', 'le'); return; }

    // ⚠ YANGI: prefab ICHIDAGI bog'lanishlarni yangi id larga ko'chirish.
    // Hitbox → kamera, hitbox → hitbox, tugma → maqsad obyekt ...
    // (camId, targetObjectId, spawnId, objId, btnId, sourceObjId ...)
    const _touched = [];
    root.traverse(o => { if (o.userData && o.userData.id != null) _touched.push(o); });
    _touched.forEach(o => this._remapIds(o.userData, idMap));
    if (idMap.size > 1) log(`🔗 ${idMap.size} ta element bog'lanishi tiklandi`, 'lok');

    // ⏱ Timeline treklari — yangi id lar bilan (lift, eshik, ko'targich...)
    const tlN = this._restoreTimeline(prefab.timeline, idMap);
    if (tlN) log(`⏱ ${tlN} ta timeline treki tiklandi`, 'lok');
    // Pozitsiya saqlanmagan — kamera oldida paydo bo'ladi
    root.position.set(
      camera.position.x + Math.sin(camera.rotation.y) * -4,
      Math.max(0, (root.scale?.y || 1) * 0.5),
      camera.position.z + Math.cos(camera.rotation.y) * -4
    );
    // ⚖️ Fizika — turiga qarab. Ilgari qat'iy `{isStatic:false}` edi:
    //    tugma yoki PC blokdan iborat prefab spawn qilinsa, u yerga
    //    qulardi. `physicsOptsFor()` yaratish yo'lidagi qoidani takrorlaydi
    //    (null = fizika berilmaydi).
    if (window.addPhysicsBody) {
      const _po = window.physicsOptsFor
                    ? window.physicsOptsFor(root)
                    : { isStatic: false, radius: 0.6 };
      if (_po) addPhysicsBody(root, Object.assign({ radius: 0.6 }, _po));
    }
    if (window.selectObject) selectObject(root);
    updateHierarchy(); updateStats();
    log(`⭐ "${prefab.name}" prefab sahnaga qo'shildi`, 'lok');
  },

  delete(id) {
    if (!confirm('Bu prefabni o\'chirasizmi?')) return;
    const _gone = this.load().find(p => p.id === id);
    this.save(this.load().filter(p => p.id !== id));
    if (_gone) this.deleteFromDisk(_gone);
    prefabRenderList();
    log('🗑 Prefab o\'chirildi', 'lw');
  },

  // ── ⚠ `_extractAssets` OLIB TASHLANDI (v4) ────────────────
  //  U faqat `modelB64` va `textureB64` ni papkaga chiqarardi.
  //  PBR xaritalari, 🔊 ovoz, 🎞 GIF kadrlari, 🖼 inventar ikonkasi,
  //  yuz teksturalari, 🎬 video va 📄 HTML sahifalar manifest ICHIDA
  //  qolib ketardi — ya'ni "papka ko'rinishida eksport" faqat ikkita
  //  tur uchun rost edi va prefab fayli o'nlab MB matn bo'lardi.
  //
  //  Endi `AssetBundle.extract()` ishlatiladi: u qiymatning O'ZIGA
  //  qarab qaror qiladi (mime, `*B64` kaliti, HTML belgilari) va
  //  sahna eksporti bilan AYNAN bir xil papkalarga yozadi:
  //      texture/  models/  sound/  video/  html/  maps/
  //
  //  ⚠ `_inlineAssets` esa QOLDI — eski (v3) prefablarni ochish uchun.

  async _exportRecord(prefab) {
    if (typeof JSZip === 'undefined') {
      // Fallback: oddiy JSON
      const blob = new Blob([JSON.stringify(prefab, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'apex-prefab-' + this._safe(prefab.name) + '.json'; a.click();
      log('⚠ JSZip yo\'q — JSON eksport qilindi', 'lw');
      return;
    }
    const zip = new JSZip();
    const manifest = {
      apexPrefab: true,
      // v4 — ⚠ HAMMA aktiv turi papkaga chiqadi (`AssetBundle`).
      //      v3 da faqat `modelB64` va `textureB64` ajratilardi:
      //      PBR xaritalari, 🔊 ovoz, 🎞 GIF kadrlari, 🖼 inventar
      //      ikonkasi, yuz teksturalari va 📄 HTML sahifalar
      //      manifest ICHIDA qolib ketardi. Ya'ni "papka ko'rinishida
      //      eksport" faqat ikkita tur uchun rost edi.
      version: 4,
      name: prefab.name,
      icon: prefab.icon,
      created: prefab.created,
      exportDate: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(prefab.data)),
      // ⏱ Lift/eshik animatsiyalari ZIP bilan birga ketsin —
      //   aks holda do'stingizga yuborilgan prefab qimirlamaydi.
      timeline: prefab.timeline || null,
    };

    // ⚠ RO'YXAT YOZMAYMIZ. `AssetBundle` qiymatning O'ZIGA qarab
    //   (mime, `*B64` kaliti, HTML belgilari) qaror qiladi — sahna
    //   eksporti bilan AYNAN bir xil yo'l. Yangi aktiv turi
    //   qo'shilganda ikkala joyni yangilash kerak bo'lmaydi.
    let stat = { count: 0, files: [] };
    if (window.AssetBundle) {
      try { stat = AssetBundle.extract(manifest, zip); } catch (e) {}
    }

    zip.file('apex-file.json', JSON.stringify(manifest, null, 2));
    try {
      const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'apex-prefab-' + this._safe(prefab.name) + '.zip'; a.click();
      URL.revokeObjectURL(a.href);
      // Papkalar bo'yicha hisobot — nima chiqqani ko'rinsin
      const byDir = {};
      for (const f of (stat.files || [])) {
        const d = String(f).split('/')[0];
        byDir[d] = (byDir[d] || 0) + 1;
      }
      const parts = Object.keys(byDir).sort().map(d => `${d}/ ${byDir[d]}`);
      log(`📤 "${prefab.name}" → apex-prefab-${this._safe(prefab.name)}.zip` +
          (parts.length ? ' — ' + parts.join(', ') : ' (aktivsiz)'), 'lok');
    } catch (err) { log('❌ ZIP xatosi: ' + err.message, 'le'); }
  },

  exportOne(id) {
    const prefab = this.load().find(p => p.id === id);
    if (!prefab) return;
    this._exportRecord(prefab);
  },

  // ── IMPORT — .zip (yangi) yoki .json (eski/yangi) ─────────
  // Zip ichidagi Models//Textures/ fayllarini qayta inline base64 ga aylantiradi
  async _inlineAssets(node, zip) {
    const out = { ...node };
    if (out.modelFile) {
      const f = zip.file(out.modelFile) || zip.file(out.modelFile.replace(/^Models\//i, 'models/'));
      if (f) { out.modelB64 = this._ab2b64(await f.async('arraybuffer')); out.isGLB = true; }
      delete out.modelFile;
    }
    if (out.textureFile) {
      const f = zip.file(out.textureFile) || zip.file(out.textureFile.replace(/^Textures\//i, 'textures/'));
      if (f) {
        const b64 = await f.async('base64');
        const ext = out.textureFile.split('.').pop().toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                   : ext === 'webp' ? 'image/webp' : 'image/png';
        out.textureB64 = `data:${mime};base64,${b64}`;
      }
      delete out.textureFile;
    }
    out.children = [];
    for (const ch of (node.children || [])) out.children.push(await this._inlineAssets(ch, zip));
    return out;
  },

  import() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.zip,.json';
    inp.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        let prefab;
        if (file.name.toLowerCase().endsWith('.zip')) {
          if (typeof JSZip === 'undefined') { log('❌ JSZip yuklanmagan', 'le'); return; }
          const zip  = await JSZip.loadAsync(await file.arrayBuffer());
          const jf   = zip.file('apex-file.json') || zip.file('prefab.json');
          if (!jf) throw new Error('ZIP ichida apex-file.json topilmadi');
          const man  = JSON.parse(await jf.async('string'));
          const ver  = man.version || 3;

          // ⚠ IKKI XIL FORMAT — eskisini tashlab yubormaymiz.
          //   v4+ : `AssetBundle` havolalari (`apexasset:…`) — hamma
          //         tur papkaga chiqqan.
          //   v3- : faqat `Models/` va `Textures/` — qo'lda yozilgan
          //         ikkita maydon. Eski prefablar do'stlarda va eski
          //         loyihalarda qolgan, ular ochilishi SHART.
          let tree;
          if (ver >= 4 && window.AssetBundle) {
            await AssetBundle.resolve(man, zip);
            tree = man.data || man;
          } else {
            tree = await this._inlineAssets(man.data || man, zip);
          }

          prefab = {
            id: Date.now(),
            name: man.name || file.name.replace(/\.zip$/i, '').replace(/^apex-prefab-/i, ''),
            icon: man.icon || '🧱',
            created: man.created || new Date().toLocaleDateString(),
            apexPrefab: true, version: ver, data: tree,
            timeline: man.timeline || null,   // ⏱ animatsiyalar
          };
        } else {
          prefab = JSON.parse(await file.text());
          if (!prefab.data || !prefab.name) throw new Error('Noto\'g\'ri format');
          prefab.id = Date.now();
        }
        const list = this.load(); list.push(prefab);
        this.save(list); this.saveToDisk(prefab); prefabRenderList();
        log(`📥 "${prefab.name}" import qilindi`, 'lok');
      } catch (err) { log('❌ Prefab import xatosi: ' + err.message, 'le'); }
    };
    inp.click();
  },
};

window.PrefabSystem        = PrefabSystem;

// 📥 Dastur ochilganda `prefabs/` papkasini o'qiymiz.
//  ⚠ Kechikish bilan: `JSZip` va `AssetBundle` skript teglari
//    ketma-ket yuklanadi, darhol chaqirsak ular hali yo'q bo'lardi.
// ⚠ `typeof setTimeout` ham tekshiriladi: bu fayl testlarda
//   `vm` ichida ham yurgiziladi va u yerda taymer yo'q.
if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
  const _pfBoot = () => setTimeout(() => { try { PrefabSystem.syncFromDisk(); } catch (e) {} }, 400);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _pfBoot);
  else _pfBoot();
}
window.prefabSaveSelected  = () => PrefabSystem.saveFromSelected();
window.prefabExportSelected= () => PrefabSystem.exportSelected();
window.prefabImport        = () => PrefabSystem.import();

function prefabRenderList() {
  const container = $('prefab-list'); if (!container) return;
  const list = PrefabSystem.load();
  if (!list.length) {
    container.innerHTML = `<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);padding:12px;text-align:center;line-height:1.8">Hali prefab yo'q.<br>Objectni tanlang → 💾 Prefab saqlash</div>`;
    return;
  }
  container.innerHTML = '';
  list.forEach(p => {
    const e = p.data?.entity || {};
    const badge = e.isPlayer ? '<span style="font-size:7px;color:var(--accent);border:1px solid rgba(var(--accent-rgb),.4);border-radius:2px;padding:0 3px">OYINCHI</span>'
                : e.isCar    ? '<span style="font-size:7px;color:#00ffcc;border:1px solid rgba(0,255,204,.4);border-radius:2px;padding:0 3px">AVTO</span>' : '';
    const hasModel = !!(p.data?.modelB64);
    const hasTex   = !!(p.data?.textureB64);
    const item = document.createElement('div');
    item.classList.add('asset-lib-item');
    item.onmouseenter = () => item.style.borderColor = '#ffcc00';
    item.onmouseleave = () => item.style.borderColor = 'var(--border)';
    item.innerHTML = `
      <span style="font-size:18px;flex-shrink:0">${p.icon||'🧱'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name} ${badge}</div>
        <div style="font-size:8px;color:var(--muted)">${p.created||''} · ${(p.data?.children?.length||0)} bola${hasModel?' · 🧊model':''}${hasTex?' · 🖼tex':''}</div>
      </div>
      <div style="display:flex;gap:2px;flex-shrink:0">
        <button title="Sahnaga qo'sh" onclick="PrefabSystem.spawn(${p.id});event.stopPropagation()" style="background:rgba(255,204,0,.12);border:1px solid rgba(255,204,0,.35);color:#ffcc00;font-size:11px;padding:2px 6px;border-radius:2px;cursor:pointer;font-weight:700">+</button>
        <button title="ZIP eksport (Models/Textures/apex-file.json)" onclick="PrefabSystem.exportOne(${p.id});event.stopPropagation()" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:2px 5px;border-radius:2px;cursor:pointer">⬇</button>
        <button title="O'chirish" onclick="PrefabSystem.delete(${p.id});event.stopPropagation()" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:2px 5px;border-radius:2px;cursor:pointer">✕</button>
      </div>`;
    item.onclick = () => PrefabSystem.spawn(p.id);
    container.appendChild(item);
  });
}

// ============================================================
// ANIMATE LOOP additions — car + animal + GLB mixer
// ============================================================
const _entityAnimMixers=[]; // tracked externally via objects

initScene();
animate();
log('Ctrl+S=saqlash | Ctrl+D=nusxa | F=fokus | Del=o\'chir | Ctrl+Z=undo | Ctrl+Y=redo', 'lw');
log('📦 GLB/GLTF import: yuqoridagi Import tugmasi yoki viewport ga tashlang', 'lok');
log('🎯 Gizmo: Q=tanlash W=ko\'chirish E=aylantirish R=o\'lcham | Ctrl+P=screenshot', 'lok');
