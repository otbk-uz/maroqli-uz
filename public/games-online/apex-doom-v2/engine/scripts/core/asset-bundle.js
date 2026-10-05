// ============================================================
//  APEX3D — ASSET BUNDLE
//  Sahna JSON ichidagi og'ir aktivlarni ZIP papkalariga chiqaradi
//  va yuklashda joyiga qaytaradi.
//
//  ⚠ MUAMMO: sahna saqlanganda `apex-file.json` ichida BAZ64 matnlar
//    qolib ketardi. Qayerlarda:
//
//      🗺 Map Loader     `ud.mapB64`      — butun karta ZIP i (10–50 MB!)
//      🔊 Sound Block    `ud.soundUrl`    — mp3 data URL
//      🔘 Tugma          `ud.actions.*.soundUrl`
//      ⌨ Key-Sound      `ud.slots[].soundUrl`
//      🖼 Path / PC      `ud.imageB64`, `ud.shapeTexB64`
//      🏁 Start/Finish   `ud.image`, `ud.video`  — rasm/VIDEO data URL
//      🎭 Object role    `ud.image`, `ud.video`
//
//    Nima yomon:
//      1. base64 xom baytdan **+33%** kattaroq, ustiga JSON ichida
//         siqilmaydi (JSZip matn ichidagi base64 ni yaxshi siqmaydi).
//         50 MB karta → ~67 MB JSON qatori.
//      2. `JSON.parse` / `JSON.stringify` shu qatorni BUTUNLAY xotiraga
//         oladi. Bir necha karta bo'lsa brauzer yiqiladi.
//      3. Foydalanuvchi ZIP ni ochib, ovoz yoki rasmni ALMASHTIRA
//         olmaydi — hammasi bitta uzun matn ichida.
//
//  ⚠ NEGA RO'YXAT EMAS: yuqoridagi 7 ta joyni qo'lda sanash — loyihada
//    ALLAQACHON ikki marta boshdan kechirilgan xato (`_slMergeRest` va
//    `SceneTypes` izohlariga qarang). Yangi tizim yangi kalit qo'shsa,
//    ro'yxatni yangilash esdan chiqadi va aktiv jimgina JSON ichida
//    qolib ketadi.
//
//    Shuning uchun bu modul KALIT NOMLARINI bilmaydi. U butun daraxtni
//    kezib, QIYMATNING O'ZIGA qaraydi:
//       • `data:<mime>;base64,...` bilan boshlansa → aktiv
//       • kalit `B64` / `Base64` ga tugasa va uzun base64 bo'lsa → aktiv
//    Yangi maydon qo'shilsa — o'zi qamrovga tushadi.
//
//  ── Papkalar (foydalanuvchi ko'radigan tuzilma) ──────────────
//      sound/     mp3, wav, ogg, m4a
//      video/     mp4, webm
//      texture/   png, jpg, webp, svg   (perFace ham shu yerga tushadi)
//      models/    glb, gltf             (saqlovchi o'zi to'ldiradi)
//      html/      💻 PC blok, 🔘 tugma sahifasi, 🌀 teleport pre-anim…
//      maps/      ichma-ich karta ZIP lari
//      assets/    aniqlanmagan turlar
//
//  ── Havola ko'rinishi ────────────────────────────────────────
//    Aktiv o'rniga JSON da qator qoladi:
//        "@apexasset:audio/portlash.mp3|audio/mpeg"
//        "@apexasset:maps/qishloq.zip|"          ← bo'sh mime = XOM base64
//    Mime havolaning O'ZIDA turadi, chunki `data:` URL ni AYNAN
//    qaytarish kerak: `AudioContext.decodeAudioData` va
//    `THREE.TextureLoader` mime ga qarab ishlaydi.
//
//    Eski dvigatel bu qatorni ko'rsa — aktivni ko'rsatmaydi, lekin
//    YIQILMAYDI. Ataylab: format oldinga moslikni buzmaydi.
// ============================================================

const AssetBundle = (() => {
  'use strict';

  // Bundan qisqa qatorlar joyida qoladi — kichik ikonkalarni fayl
  // qilib chiqarish foyda bermaydi, faqat ZIP ni chalkashtiradi.
  const MIN_LEN = 512;
  const MARK    = '@apexasset:';
  const MAX_DEPTH = 14;

  // mime → [papka, kengaytma]
  const MIME_MAP = {
    'audio/mpeg': ['sound', 'mp3'],   'audio/mp3':  ['sound', 'mp3'],
    'audio/wav':  ['sound', 'wav'],   'audio/x-wav':['sound', 'wav'],
    'audio/ogg':  ['sound', 'ogg'],   'audio/mp4':  ['sound', 'm4a'],
    'audio/webm': ['sound', 'weba'],  'audio/aac':  ['sound', 'aac'],
    'video/mp4':  ['video', 'mp4'],   'video/webm': ['video', 'webm'],
    'video/ogg':  ['video', 'ogv'],   'video/quicktime': ['video', 'mov'],
    'image/png':  ['texture', 'png'], 'image/jpeg': ['texture', 'jpg'],
    'image/jpg':  ['texture', 'jpg'], 'image/webp': ['texture', 'webp'],
    'image/gif':  ['texture', 'gif'], 'image/svg+xml': ['texture', 'svg'],
    'image/bmp':  ['texture', 'bmp'],
    'text/html':  ['html', 'html'],   'text/plain': ['html', 'txt'],
    'application/zip': ['maps', 'zip'],
    'model/gltf-binary': ['models', 'glb'],
    'model/gltf+json':   ['models', 'gltf'],
  };

  // XOM base64 (`data:` prefiksi yo'q) kalitlari uchun taxmin.
  // ⚠ Bu ro'yxat QAMROV uchun emas — qamrov kalit nomiga bog'liq emas.
  //   Faqat FAYL NOMINI chiroyli qilish uchun. Ro'yxatda bo'lmagan
  //   kalit ham ajratiladi, shunchaki `assets/*.bin` bo'lib.
  const RAW_HINT = {
    mapb64:      ['maps', 'zip'],
    shapetexb64: ['texture', 'png'],
    texb64:      ['texture', 'png'],
    imageb64:    ['texture', 'png'],
    imgb64:      ['texture', 'png'],
    soundb64:    ['sound', 'mp3'],
    audiob64:    ['sound', 'mp3'],
    // ⚠ 📦 Prefab GLB modelni XOM base64 da saqlaydi (`modelB64`) —
    //   `data:` sarlavhasi yo'q, ya'ni mime bo'yicha topib bo'lmaydi.
    //   Bu yerda ro'yxatga qo'shilmasa u `assets/*.bin` bo'lib
    //   chiqardi: papka ko'rinishida ochgan odam modelni topolmasdi.
    modelb64:    ['models', 'glb'],
    glbb64:      ['models', 'glb'],
    gltfb64:     ['models', 'gltf'],
  };

  // 📄 HTML — MATN aktivi (base64 emas). Loyihada HTML yoziladigan
  //  joylar: 💻 PC blok (`ud.html`), 🔘 tugma sahifasi
  //  (`actions.htmlPage.content`), 🌀 teleport pre-anim
  //  (`spawnRedirect.preAnimHtml`), 🎭 object role, 🖼 canvas overlay.
  //
  //  ⚠ Yana RO'YXAT YOZMAYMIZ — `game-zip.js` da aynan shunday 5 ta
  //    joyli ro'yxat bor edi va u yangi joy qo'shilganda eskirardi.
  //    Bu yerda ham qiymatning O'ZIGA qaraymiz: yopiluvchi teg yoki
  //    tanish HTML tegi bo'lsa — HTML.
  //
  //  ⚠ Chegara pastroq (HTML sahifalar qisqa bo'lishi mumkin), lekin
  //    nolga tushirilmaydi: matn blokidagi `<b>qalin</b>` kabi qisqa
  //    parchalar joyida qolsin.
  const MIN_HTML = 200;
  const _looksHTML = s =>
    /<\/[a-z][\w-]*\s*>/i.test(s) ||
    /<(!doctype|html|meta|link|br|hr|img|input)\b/i.test(s);

  const _safe = s => String(s || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 48);
  const _isB64Key = k => /(b64|base64)$/i.test(k);
  // Xom base64 ekanini tekshirish. `data:` bo'lmagan uzun matn HTML
  // yoki skript bo'lishi mumkin — ularni fayl qilib chiqarmaymiz.
  const _looksB64 = s => /^[A-Za-z0-9+/\r\n]+={0,2}$/.test(s);

  function _isPlain(v) {
    if (typeof Node !== 'undefined' && v instanceof Node) return false;
    const p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }

  // ============================================================
  //  EXTRACT — JSON dan ZIP ga
  // ============================================================
  /**
   * @param {object} root  sahna ma'lumoti (o'RNIDA o'zgartiriladi)
   * @param {JSZip}  zip
   * @returns {{count:number, bytes:number, files:string[]}}
   */
  function extract(root, zip) {
    const stat = { count: 0, bytes: 0, files: [] };
    if (!root || !zip) return stat;
    // Bir xil aktiv (masalan bitta mp3 o'nta blokda) BIR MARTA yoziladi.
    const dedupe = new Map();   // payload qatori → havola
    const used   = new Set();   // band fayl nomlari
    let counter  = 0;

    function fileName(folder, ext, hint) {
      let base = _safe(hint) || ('asset_' + (++counter));
      // Kengaytma nomda allaqachon bo'lsa takrorlamaymiz
      base = base.replace(new RegExp('_' + ext + '$', 'i'), '');
      let p = folder + '/' + base + '.' + ext, n = 2;
      // ⚠ ZIP da ALLAQACHON turgan faylni bosib ketmaymiz: `perFace`
      //   teksturalari (`_pfToFiles`) va modellar bizdan OLDIN
      //   `textures/`, `models/` ga yozilgan. Bir xil nom chiqsa
      //   JSZip jimgina ustiga yozardi va tekstura yo'qolardi.
      const taken = q => used.has(q) || !!(zip.file && zip.file(q));
      while (taken(p)) p = folder + '/' + base + '_' + (n++) + '.' + ext;
      used.add(p);
      return p;
    }

    /**
     * @param {boolean} isText  `true` — payload XOM MATN (HTML), ZIP ga
     *   matn sifatida yoziladi va havolaga `|txt` qo'shiladi. Shu bayroq
     *   bo'lmasa tiklashda HTML `data:text/html;base64,…` bo'lib qaytardi
     *   va PC blok uni sahifa emas, URL deb qabul qilardi.
     */
    function put(payload, folder, ext, hint, mime, isText) {
      const key = mime + (isText ? '|t' : '|b') + '\u0000' + payload;
      const hit = dedupe.get(key);
      if (hit) return hit;
      const path = fileName(folder, ext, hint);
      try {
        if (isText) zip.file(path, payload);
        else        zip.file(path, payload, { base64: true });
      } catch (e) {
        return null;                       // yozilmadi — joyida qoldiramiz
      }
      stat.bytes += isText ? payload.length : Math.floor(payload.length * 3 / 4);
      stat.count++;
      stat.files.push(path);
      const ref = MARK + path + '|' + mime + (isText ? '|txt' : '');
      dedupe.set(key, ref);
      return ref;
    }

    /** Qiymatni tekshirib, aktiv bo'lsa havola qaytaradi; aks holda `null`. */
    function tryValue(val, key, siblingHint) {
      if (typeof val !== 'string') return null;
      // HTML uchun chegara pastroq — shuning uchun eng kichigi bilan solishtiramiz
      if (val.length < Math.min(MIN_LEN, MIN_HTML)) return null;
      if (val.lastIndexOf(MARK, 0) === 0) return null;      // allaqachon havola

      // 1) data URL
      if (val.lastIndexOf('data:', 0) === 0 && val.length >= MIN_LEN) {
        const ci = val.indexOf(',');
        if (ci < 0) return null;
        const head = val.slice(5, ci);                       // "audio/mpeg;base64"
        if (!/base64/i.test(head)) return null;              // faqat base64 ni ajratamiz
        const mime = head.split(';')[0].toLowerCase();
        const m = MIME_MAP[mime] || ['assets', (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/g, '')];
        return put(val.slice(ci + 1), m[0], m[1] || 'bin', siblingHint || key, mime, false);
      }

      // 2) XOM base64, faqat `*B64` kalitlarda
      if (_isB64Key(key) && _looksB64(val) && val.length >= MIN_LEN) {
        const h = RAW_HINT[String(key).toLowerCase()] || ['assets', 'bin'];
        return put(val, h[0], h[1], siblingHint || key, '', false);   // '' = xom base64
      }

      // 3) 📄 HTML — matn sifatida `html/` papkaga
      if (val.length >= MIN_HTML && _looksHTML(val)) {
        return put(val, 'html', 'html', siblingHint || key, 'text/html', true);
      }
      return null;
    }

    /** Yaqin atrofdagi nom maydonlaridan fayl nomi uchun ishora. */
    function hintOf(obj, key) {
      if (!obj || typeof obj !== 'object') return key;
      const k = String(key).toLowerCase();
      const cand = k.indexOf('sound') >= 0 || k.indexOf('audio') >= 0
        ? ['soundName', 'audioName', 'name', 'label']
        : k.indexOf('map') >= 0
          ? ['mapName', 'name', 'label']
          : ['textureName', 'imageName', 'fileName', 'name', 'label'];
      for (const c of cand) if (typeof obj[c] === 'string' && obj[c].trim()) return obj[c];
      return key;
    }

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return;
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          const v = node[i];
          if (typeof v === 'string') {
            const r = tryValue(v, 'item', null);
            if (r) node[i] = r;
          } else walk(v, depth + 1);
        }
        return;
      }
      if (!_isPlain(node)) return;
      for (const k in node) {
        if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
        if (k.charAt(0) === '_') continue;          // jonli tutqichlar
        const v = node[k];
        if (typeof v === 'string') {
          const r = tryValue(v, k, hintOf(node, k));
          if (r) node[k] = r;
        } else walk(v, depth + 1);
      }
    }

    walk(root, 0);
    return stat;
  }

  // ============================================================
  //  RESOLVE — ZIP dan JSON ga
  // ============================================================
  /**
   * Havolalarni ZIP ichidagi fayllardan qayta tiklaydi.
   * `zip` bo'lmasa yoki fayl topilmasa — havola O'RNIDA qoladi
   * (tizimlar `data:` kutadi, ya'ni aktiv ko'rinmaydi, lekin
   *  yuklash to'xtamaydi va qolgan hammasi ishlaydi).
   *
   * @returns {Promise<{count:number, missing:string[]}>}
   */
  async function resolve(root, zip) {
    const out = { count: 0, missing: [] };
    if (!root) return out;

    // 1) Havolalarni yig'amiz (bitta fayl bir necha joyda bo'lishi mumkin)
    const spots = [];                        // {obj, key, path, mime, isText}
    const paths = new Set();
    const textPaths = Object.create(null);   // yo'l → matnmi

    function scan(node, depth) {
      if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return;
      const keys = Array.isArray(node) ? node.keys() : Object.keys(node);
      for (const k of keys) {
        const v = node[k];
        if (typeof v === 'string') {
          if (v.lastIndexOf(MARK, 0) !== 0) continue;
          // Havola shakli: `<yo'l>|<mime>[|txt]`
          //   mime bo'sh   → XOM base64 (masalan `mapB64`)
          //   `|txt`       → XOM MATN (HTML) — data URL QILINMAYDI
          //   aks holda    → `data:<mime>;base64,…`
          const parts = v.slice(MARK.length).split('|');
          const path  = parts[0];
          const mime  = parts[1] || '';
          const isText = parts[2] === 'txt';
          spots.push({ obj: node, key: k, path, mime, isText });
          paths.add(path);
          textPaths[path] = isText;
        } else if (v && typeof v === 'object') {
          if (Array.isArray(v) || _isPlain(v)) scan(v, depth + 1);
        }
      }
    }
    scan(root, 0);
    if (!spots.length) return out;

    // 2) Har bir faylni BIR MARTA o'qiymiz
    const cache = new Map();
    for (const p of paths) {
      let data = null;
      try {
        const f = zip && zip.file ? zip.file(p) : null;
        // ⚠ Matn aktivi `string` bo'lib o'qiladi: base64 dan o'tkazsak
        //   HTML `data:` URL bo'lib qaytardi va PC blok uni sahifa emas,
        //   manzil deb qabul qilardi.
        if (f) data = await f.async(textPaths[p] ? 'string' : 'base64');
      } catch (e) { data = null; }
      if (data == null) out.missing.push(p);
      cache.set(p, data);
    }

    // 3) Joyiga qo'yamiz
    for (const s of spots) {
      const data = cache.get(s.path);
      if (data == null) continue;            // havola o'rnida qoladi
      s.obj[s.key] = s.isText ? data
                   : (s.mime ? ('data:' + s.mime + ';base64,' + data) : data);
      out.count++;
    }
    return out;
  }

  /** Havola qatorimi? (tizimlar tekshirishi uchun) */
  function isRef(v) { return typeof v === 'string' && v.lastIndexOf(MARK, 0) === 0; }

  return { extract, resolve, isRef, MARK, MIN_LEN, _mimeMap: MIME_MAP };
})();

window.AssetBundle = AssetBundle;
