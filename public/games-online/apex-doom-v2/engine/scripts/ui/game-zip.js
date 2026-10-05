// ============================================================
// 🎮 GAME.ZIP — TO'LIQ O'YIN EKSPORTI
// ------------------------------------------------------------
//  Nega bunday?
//  ------------
//  Eski `game-export.js` alohida MINI-RUNTIME generatsiya qilardi
//  (~500 satr). Redaktorda esa 35 000 satr tizim bor. Natijada
//  eksport qilingan o'yinda yorug'lik, hitbox, kamera animatsiyasi,
//  PC block, Map Loader, ovoz, fizika — HECH BIRI ishlamasdi.
//  Har yangi funksiya ikki joyda yozilishi kerak edi.
//
//  Bu yerda boshqa yo'l: HAQIQIY DVIGATEL ZIP ichiga solinadi.
//  O'yin xuddi redaktor kabi ishga tushadi, faqat UI yashiriladi
//  va darrov Play bosiladi. Hamma funksiya bepul ishlaydi.
//
//  Tuzilishi:
//     game.zip/
//     ├── index.html          ← o'yin (yangi, redaktornikidan boshqa)
//     ├── engine/
//     │   ├── scripts/        ← APEX dvigateli (91 fayl)
//     │   └── libs/           ← three.js, JSZip, GLTFLoader…
//     ├── jsons/scene.zip     ← SAHNA (o'yin FAQAT shuni o'qiydi)
//     ├── sound/ video/ texture/ models/ html/ maps/
//     │                       ← aktivlar (ko'rish/tahrirlash uchun)
//     └── game-boot.js        ← UI ni yashiradi, sahnani yuklaydi, Play bosadi
//
//  ⚠ `file://` da ISHLAMAYDI: brauzer o'z manba fayllarini o'qish
//    uchun `fetch()` ni CORS bilan bloklaydi. `node server.js` orqali
//    oching. Pastda buni aniqlab, aniq yo'l ko'rsatamiz.
// ============================================================

//  ⚙️ opts (saqlash menyusidan keladi):
//     { title: "O'yin nomi", devConsole: true/false, consoleKey: "`" }
async function exportGameZip(filename, opts) {
  opts = opts || {};
  filename = filename || 'game';
  const gameTitle  = (opts.title && String(opts.title).trim()) || filename;
  const devConsole = !!opts.devConsole;
  const consoleKey = opts.consoleKey || '`';
  //  ⏸ Pauza menyusi sozlamalari — eksport oynasida to'ldiriladi.
  //  ⚠ `PauseMenu.cfg` ga YOZAMIZ: u `SystemRegistry` orqali sahna
  //    holatiga tushadi va o'yinda o'sha holatdan tiklanadi. Alohida
  //    yo'l qursak sozlama ikki joyda yashab, biri eskirib qolardi.
  try {
    if (window.PauseMenu && opts.pause) Object.assign(PauseMenu.cfg, opts.pause);
  } catch (e) {}
  if (typeof JSZip === 'undefined') { log('❌ JSZip yuklanmagan', 'le'); return; }

  const prog = document.createElement('div');
  // ⚠ id SHART: `_gameIndex()` `document.body.innerHTML` ni oladi, va bu
  //   oyna o'sha paytda body'da turadi → o'yin index.html'iga pishib
  //   qolardi ("🚀 index.html..." ekranда osilib turardi).
  prog.id = 'gz-prog';
  prog.style.cssText = "position:fixed;bottom:20px;right:20px;background:var(--panel);" +
    "border:1px solid var(--accent2);border-radius:6px;padding:10px 14px;z-index:10001;" +
    "font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);min-width:300px";
  document.body.appendChild(prog);
  const L = t => { prog.textContent = t; log(t, 'lw'); };

  try {
    // ── 0) file:// tekshiruvi ────────────────────────────────
    if (location.protocol === 'file:') {
      prog.style.borderColor = '#ff4444'; prog.style.color = '#ff8844';
      prog.innerHTML = "❌ <b>file:// da ishlamaydi</b><br><br>" +
        "Brauzer CORS tufayli dvigatel fayllarini o'qishga ruxsat bermaydi.<br><br>" +
        "<b style='color:var(--accent3)'>Yechim:</b> loyiha papkasida terminal oching:<br>" +
        "<code style='color:var(--accent)'>node server.js</code><br>" +
        "so'ng <code style='color:var(--accent)'>http://localhost:8080</code> ni oching<br>" +
        "va shu tugmani qaytadan bosing.";
      log('❌ game.zip: file:// da eksport qilib bo\'lmaydi — node server.js orqali oching', 'le');
      setTimeout(() => prog.remove(), 15000);
      return;
    }

    const zip = new JSZip();

    // ── 1) Dvigatel → engine/ ───────────────────────────────
    //   Skript ro'yxatini index.html dan o'qiymiz — TARTIB muhim,
    //   bu loyihada fayllar bir-biriga global scope orqali bog'langan.
    L('⚙️ Dvigatel yig\'ilmoqda...');
    const srcs = [...document.querySelectorAll('script[src]')]
      .map(s => s.getAttribute('src'))
      .filter(s => s && !/^https?:|^\/\//.test(s));      // faqat lokal
    const css = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map(l => l.getAttribute('href'))
      .filter(h => h && !/^https?:|^\/\//.test(h));

    // ── 📂 BUTUN `scripts/` va `libs/` PAPKASI ────────────────
    //  ⚠ `script[src]` ro'yxati faqat `index.html` ga ULANGAN
    //    fayllarni beradi. Dinamik `import()` bilan yuklanadigan,
    //    loader ichidan olinadigan yoki hali ulanmagan fayllar
    //    JIMGINA tushib qolardi va o'yin "nimadir yo'q" bo'lib
    //    chiqardi (Rapier bilan aynan shunday bo'lgan).
    //
    //  ⚠ Brauzer papkani O'ZI sanay olmaydi — serverdan so'raymiz.
    //    Server bo'lmasa (masalan `file://`) eski yo'lga qaytamiz:
    //    o'yin baribir yig'iladi, faqat ulanmagan fayllarsiz.
    const wanted = new Set([...srcs, ...css]);
    let listedOk = false;
    for (const d of ['scripts', 'libs']) {
      try {
        const r = await fetch('/api/files?dir=' + d);
        const j = await r.json();
        if (j && j.ok && Array.isArray(j.files)) {
          j.files.forEach(f => wanted.add(f));
          listedOk = true;
        }
      } catch (e) { /* server yo'q — pastda ogohlantiramiz */ }
    }
    if (!listedOk) {
      L('⚠ Fayl ro\'yxati olinmadi (server yo\'qmi?) — faqat ulangan skriptlar ketadi');
    }

    const all = [...wanted];
    let done = 0;
    const grab = async (path) => {
      const r = await fetch(path);
      if (!r.ok) throw new Error(path + ' → ' + r.status);
      zip.file('engine/' + path, await r.arrayBuffer());
      L(`⚙️ Dvigatel: ${++done}/${all.length} — ${path.split('/').pop()}`);
    };
    for (const p of all) {
      // ⚠ Bitta fayl olinmasa BUTUN eksport to'xtamasin: ro'yxatda
      //   bo'lgan-u, o'chirilgan fayl bo'lishi mumkin.
      try { await grab(p); }
      catch (e) { L('⚠ Olinmadi: ' + p); }
    }

    // ── ⚠ `script[src]` DA BO'LMAGAN, LEKIN KERAK BO'LGAN FAYLLAR ──
    //  Yuqoridagi ro'yxat `document.querySelectorAll('script[src]')` dan
    //  yig'iladi. Dinamik `import()` yoki loader ichidan olinadigan
    //  fayllar unga TUSHMAYDI va jimgina qolib ketadi.
    //
    //  ⚠ RAPIER — aynan shu tuzoqqa tushgan edi. U `index.html` dagi
    //    inline skriptda `import('./libs/rapier3d-compat.es.js')` bilan
    //    yuklanadi, ya'ni `src` atributi yo'q. Natijada eksport
    //    qilingan o'yinda fizika dvigateli UMUMAN bo'lmasdi:
    //    `rapier-ready` hodisasi chiqmasdi → `initRapierWorld()`
    //    chaqirilmasdi → `rapierWorld` null qolardi → `updatePhysics()`
    //    birinchi qatorida chiqib ketardi. Sahna butunlay qotib
    //    qolardi — "O'YNA bosilmaganday".
    const _extraLibs = [
      'libs/rapier3d-compat.es.js',                 // ⚡ fizika dvigateli (1.9 MB)
      'libs/draco/draco_decoder.js',                // siqilgan GLB uchun
      'libs/draco/draco_decoder.wasm',
      'libs/draco/draco_wasm_wrapper.js',
    ];
    for (const d of _extraLibs) {
      try {
        const r = await fetch(d);
        if (r.ok) zip.file('engine/' + d, await r.arrayBuffer());
        else if (d.indexOf('rapier') >= 0) L('⚠ ' + d + ' olinmadi — fizika ishlamaydi!');
      } catch (e) {
        if (d.indexOf('rapier') >= 0) L('⚠ rapier olinmadi — fizika ishlamaydi!');
      }
    }

    // ── 1b) 🖥 Razrabotchiklar konsoli ──────────────────────
    //  ⚠ `scripts/ui/game-console.js` REDAKTORNING `index.html` iga
    //    QO'SHILMAGAN (u yerда konsol pastda turadi, kerak emas).
    //    Shu bois `srcs` ro'yxatiga tushmaydi va uni ALOHIDA olamiz —
    //    xuddi rapier kabi. Faqat belgilangan bo'lsa.
    //  ⚠ IKKI FAYL: `game-console.js` — oyna va kiritish qatori,
    //    `game-commands.js` — komandalarning o'zi. Ikkinchisi
    //    birinchisisiz ishlamaydi (u `GameConsole.register` ga
    //    ulanadi), shuning uchun TARTIB muhim.
    if (devConsole) {
      for (const f of ['scripts/ui/game-console.js', 'scripts/ui/game-commands.js']) {
        try {
          const r = await fetch(f);
          if (r.ok) zip.file('engine/' + f, await r.arrayBuffer());
          else L('⚠ ' + f + ' olinmadi — konsol to\'liq ishlamasligi mumkin');
        } catch (e) { L('⚠ ' + f + ' olinmadi — konsol to\'liq ishlamasligi mumkin'); }
      }
    }

    // ── 2) Sahna → jsons/scene.zip ──────────────────────────
    //   ⚠ `saveScene(true)` — dvigatelning O'Z serializatsiyasi.
    //     Ikkinchi format yozmaymiz: bitta manba, bitta xato joyi.
    //     Ichida models/ + textures/ + apex-file.json bor.
    L('💾 Sahna saqlanmoqda...');
    // ⚠ `saveScene` EMAS! U game-export.js da menyu ochuvchi bilan
    //   almashtirilgan (va camera-preview.js uni yana o'ragan).
    //   Haqiqiy, to'liq saqlovchi — `_realSaveScene` (save-load.js).
    const _save = window._realSaveScene || window._originalSaveScene;
    if (typeof _save !== 'function') throw new Error('_realSaveScene topilmadi (save-load.js yuklanmagan?)');
    const sceneZip = await _save(true);
    if (!sceneZip) throw new Error('saqlovchi ZIP qaytarmadi');
    zip.file('jsons/scene.zip', await sceneZip.generateAsync({ type: 'arraybuffer' }));

    // ── 3) AKTIVLAR → sound/ video/ texture/ models/ html/ maps/ ──
    //
    //  ⚠ Ilgari bu yerda UCHTA qo'lda yozilgan yig'uvchi turardi:
    //      • `map/`   — `objects` ni kezib `ud.mapB64` izlardi
    //      • `music/` — `ud.soundUrl`, `ud.slots[]`, `ud.actions[]`
    //      • `html/`  — `ud.html`, `actions.htmlPage.content`,
    //                   `spawnRedirect.preAnimHtml` (5 ta joy)
    //
    //    Har biri "aktiv qayerda yotishi mumkin" degan RO'YXAT edi va
    //    ular haqiqatdan orqada qolardi: yangi tizim yangi maydon
    //    qo'shsa, fayl jimgina tushmay qolardi. Bu loyihada takrorlanган
    //    xato (`_slMergeRest`, `SceneTypes`, `AssetBundle` izohlariga
    //    qarang).
    //
    //    ENDI: sahna ZIP i (`jsons/scene.zip`) allaqachon `AssetBundle`
    //    tomonidan to'liq ajratilgan — u butun daraxtni kezib, kalit
    //    nomlariga qaramasdan aktivni QIYMATIDAN topadi. Shu papkalarni
    //    o'sha yerdan KO'CHIRAMIZ. Yagona manba, ro'yxat yo'q.
    L('📦 Aktivlar...');
    const ASSET_DIRS = /^(sound|video|texture|models|html|maps|addons)\//;
    let nAsset = 0;
    for (const path of Object.keys(sceneZip.files)) {
      if (!ASSET_DIRS.test(path)) continue;
      const f = sceneZip.files[path];
      if (!f || f.dir) continue;
      try { zip.file(path, await f.async('arraybuffer')); nAsset++; } catch (e) {}
    }
    if (nAsset) zip.file('O-QING-aktivlar.txt',
      "Bu papkalar KO'RISH/TAHRIRLASH uchun ochib qo'yilgan:\n\n" +
      "  sound/    ovozlar (mp3, wav, ogg…)\n" +
      "  video/    videolar (mp4, webm)\n" +
      "  texture/  rasmlar (png, jpg, webp…)\n" +
      "  models/   3D modellar (glb, gltf)\n" +
      "  html/     PC blok, tugma sahifalari, teleport pre-anim\n" +
      "  maps/     ichma-ich kartalar (.zip)\n" +
      "  addons/   kengaytmalar (addon.json + main.js)\n\n" +
      "O'YIN ULARNI O'QIMAYDI — hammasi jsons/scene.zip ichida.\n" +
      "Ikki manba bo'lsa ular bir-biridan uzilib ketardi.\n" +
      "O'zgartirmoqchi bo'lsangiz — redaktorda tahrirlab, qayta eksport qiling.\n");

    // ── 5) Timeline → timeline/tracks.json ──────────────────
    L('🎬 Timeline...');
    let nTrk = 0;
    if (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) {
      const tracks = TimelineSystem.tracks.map(t => ({
        objId: t.objId, objName: t.objName, loop: !!t.loop,
        isFilter: !!t.isFilter, isWeather: !!t.isWeather, isZoom: !!t.isZoom,
        keyframes: t.keyframes || [],
      }));
      nTrk = tracks.length;
      zip.file('timeline/tracks.json', JSON.stringify({
        duration: TimelineSystem.duration, tracks,
      }, null, 2));
    }

    // ── 6) Yorug'lik / triggerlar → jsons/ ──────────────────
    //   ⚠ Bu fayllar KO'RISH/TAHRIRLASH uchun. O'yin ularni O'QIMAYDI —
    //     hamma narsa jsons/scene.zip da. Ikki manba bo'lsa, ular
    //     bir-biridan uzilib ketardi.
    L('📋 JSON ma\'lumotlar...');
    if (typeof lights !== 'undefined') {
      zip.file('jsons/lights.json', JSON.stringify(lights.map(l => ({
        id: l.id, type: l.type, name: l.name,
        color: l.light && l.light.color ? '#' + l.light.color.getHexString() : null,
        intensity: l.light ? l.light.intensity : 0,
        position: l.light ? { x: l.light.position.x, y: l.light.position.y, z: l.light.position.z } : null,
        distance: l.light ? l.light.distance : undefined,
        angle: l.light ? l.light.angle : undefined,
      })), null, 2));
    }
    const trig = objects.filter(o => o.userData && (o.userData.isHitbox || o.userData.isInteractiveBtn))
      .map(o => ({ id: o.userData.id, name: o.userData.name,
        kind: o.userData.isHitbox ? 'hitbox' : 'button',
        triggerType: o.userData.triggerType, btnMode: o.userData.btnMode,
        actions: o.userData.actions || null }));
    zip.file('jsons/triggers.json', JSON.stringify(trig, null, 2));
    zip.file('jsons/README.txt',
      "Bu papkadagi fayllar KO'RISH uchun.\n" +
      "O'yin ularni o'qimaydi — hamma ma'lumot jsons/scene.zip da.\n" +
      "Ikki manba bo'lsa ular bir-biridan uzilib ketardi.\n");

    // ── 7) Boot + index.html + server ───────────────────────
    L('🚀 index.html...');
    zip.file('game-boot.js', _bootJS());
    // ⚠ TOZA index.html — diskdan. Ilgari `document.body.innerHTML`
    //   olinardi, ya'ni eksport paytida OCHIQ turgan har qanday panel
    //   o'yinga QOTIB qolardi: 💾 "KARTANI SAQLASH" dialogi, kontekst
    //   menyu, tanlov qobig'i, PC blokning iframe'i…
    //   Foydalanuvchi o'yinni ochsa — ustida redaktor dialogi turardi
    //   va uni yopib bo'lmasdi (tugmalari `GameLock` bilan jim qilingan).
    //
    //   Ro'yxat bilan tuzatib bo'lmaydi: bugun 4 ta oyna ma'lum, ertaga
    //   yangi panel qo'shiladi va yana esdan chiqadi. Manbadan o'qish —
    //   ta'rifan to'liq: u yerda RUNTIME oynalari umuman yo'q.
    let _pristineBody = null;
    try {
      const _r = await fetch('index.html');
      if (_r.ok) {
        const _txt = await _r.text();
        const _m = _txt.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (_m) _pristineBody = _m[1];
      }
    } catch (e) { /* fallback — pastda */ }
    if (!_pristineBody) L('⚠ index.html o\'qilmadi — jonli DOM ishlatiladi');
    zip.file('index.html', _gameIndex(srcs, css, gameTitle, _pristineBody,
                                      { devConsole, consoleKey }));
    // ⚠ `server.js` SHART: o'yin `fetch('jsons/scene.zip')` qiladi, bu esa
    //   `file://` da CORS bilan bloklanadi. Ilgari ZIP'ga solinmagan edi —
    //   foydalanuvchi `node server.js` desa "Cannot find module" olardi.
    zip.file('server.js', _serverJS(gameTitle));
    //  🌐 MULTIPLAYER — WebSocket relesi.
    //  ⚠ Fayllar DISKDAN o'qiladi, nusxa ko'chirilmaydi: ikki nusxa
    //    bo'lsa biri tuzatilib, ikkinchisi eskirib qolardi.
    //  ⚠ `try` ichida: fayl topilmasa o'yin BARIBIR yig'ilsin —
    //    multiplayer qo'shimcha imkoniyat, majburiy emas.
    try {
      for (const f of ['net/ws-lite.js', 'net/mp-room.js']) {
        const r = await fetch(f);
        if (r.ok) zip.file(f, await r.text());
      }
    } catch (e) { log('⚠ Multiplayer fayllari qo\'shilmadi', 'lw'); }
    zip.file('O-QING.txt', _readme(gameTitle, devConsole, consoleKey));

    // ── 8) Yuklash ──────────────────────────────────────────
    L('🗜 Siqilmoqda...');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename + '.zip'; a.click();
    URL.revokeObjectURL(url);

    // ⚠ `blob.size` bo'lmasligi mumkin (`generateAsync` turi
    //   `blob` emas — masalan sinov muhitida `nodebuffer`).
    //   Ilgari bunda `NaN MB` chiqardi va foydalanuvchi "eksport
    //   buzildimi?" deb o'ylardi.
    const _sz = (blob && (blob.size != null ? blob.size : blob.length)) || 0;
    const mb = _sz ? (_sz / 1048576).toFixed(1) : '?';
    L(`✅ ${filename}.zip (${mb} MB)`);
    log(`🎮 ${gameTitle}.zip tayyor — ${srcs.length} skript, ${nAsset} aktiv fayl (sound/video/texture/models/html/maps), ${nTrk} timeline trek`, 'lok');
    if (devConsole) log(`   🖥 Razrabotchiklar konsoli yoqilgan — o'yinda "${consoleKey}" tugmasi`, 'lok');
    log('   Ochish: ZIP ni yechib, papkada `node server.js` (yoki istalgan web-server)', 'lok');
    setTimeout(() => prog.remove(), 6000);

  } catch (e) {
    prog.style.borderColor = '#ff4444'; prog.style.color = '#ff8844';
    prog.textContent = '❌ ' + e.message;
    log('❌ game.zip: ' + e.message, 'le');
    setTimeout(() => prog.remove(), 8000);
  }
}

// ── O'yin index.html ─────────────────────────────────────────
//  ⚠ Redaktor DOM'i TO'LIQ saqlanadi, faqat CSS bilan yashiriladi.
//    Sabab: dvigatel butun boshi `$('inspector-content')`, `$('fps-d')`,
//    `$('tl-dur-inp')` kabi elementlarga murojaat qiladi. Ularni
//    o'chirsak, `$()` null qaytarib, o'nlab joyda TypeError bo'lardi.
//    Yashirish — xavfsiz va ishonchli.
function _gameIndex(srcs, css, title, pristineBody, opts) {
  opts = opts || {};
  // ⚠ body ning ICHINI olamiz, <body> tegining o'zini emas — aks holda
  //   yangi hujjatda <body> ichida <body> bo'lib qolardi.
  //   <script> teglarini tashlaymiz: ular pastda `engine/` yo'li bilan
  //   qaytadan qo'shiladi.
  //
  //  ⚠ MANBA: diskdagi TOZA `index.html` (chaqiruvchi olib beradi).
  //    Jonli DOM — faqat ZAXIRA yo'l (fetch ishlamasa, masalan
  //    `file://` da ochilgan bo'lsa). Zaxira yo'lda ma'lum oynalarni
  //    qo'lda olib tashlaymiz — to'liq emas, lekin hech yo'qdan yaxshi.
  const tmp = document.createElement('div');
  tmp.innerHTML = (typeof pristineBody === 'string' && pristineBody)
    ? pristineBody
    : document.body.innerHTML;

  // ⚠ FAQAT `src` li skriptlar olib tashlanadi — ular pastda
  //   `engine/` yo'li bilan qaytadan qo'shiladi.
  //
  //   INLINE skriptlar QOLADI. Ilgari `querySelectorAll('script')`
  //   bilan HAMMASI o'chirilardi va ular bilan birga eng muhimi —
  //   `index.html` dagi RAPIER YUKLOVCHISI ham ketardi. Natijada
  //   o'yinda fizika umuman ishlamasdi (`rapier-ready` chiqmasdi).
  //   Boshqa ikkitasi: ikon yordamchisi va `_keyLabel`.
  tmp.querySelectorAll('script[src]').forEach(n => n.remove());

  // ⚠ Yo'llarni tuzatamiz: redaktorda kutubxonalar `./libs/` da,
  //   o'yinda esa `./engine/libs/` da turadi. Inline skript ichidagi
  //   `import('./libs/…')` aks holda 404 berardi.
  tmp.querySelectorAll('script').forEach(n => {
    if (n.textContent && n.textContent.indexOf('./libs/') >= 0) {
      n.textContent = n.textContent.split('./libs/').join('./engine/libs/');
    }
  });
  if (!pristineBody) {
    ['#game-load', '#gz-prog', '#save-choice-menu', '#game-export-menu',
     '#map-lib-panel', '#hier-ctx', '#sound-panel', '#fog-panel']
      .forEach(sel => { const n = tmp.querySelector(sel); if (n) n.remove(); });
  }
  const body = tmp.innerHTML;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
${css.map(h => `<link rel="stylesheet" href="engine/${h}">`).join('\n')}
<style>
  /* ⚠ Redaktor UI YASHIRILADI, DOM O'CHIRILMAYDI. Dvigatel butun boshi
     $('inspector-content'), $('fps-d'), $('tl-dur-inp') kabi elementlarga
     murojaat qiladi — o'chirsak $() null qaytarib, o'nlab joyda TypeError
     bo'lardi.

     HAQIQIY tuzilish (tekshirilgan):
        <body>
        ├── #topbar
        └── #main
            ├── #left-col  #left-resizer
            ├── #center-col          ← #cvp SHU YERDA
            │   ├── #toolbar
            │   ├── #cvp             ← viewport
            │   ├── #console-resize-handle
            │   └── #console-wrap
            └── #right-col …

     ⚠ #cvp — #main ning BEVOSITA bolasi EMAS. Ilgari "#main > *:not(#cvp)"
       yozgandim — u #center-col ni yashirib, viewport'ni ham yo'q qilardi.
       Shuning uchun ikki bosqichda: #main dan faqat #center-col qoladi,
       #center-col dan faqat #cvp. Bu qo'shni elementlar id'siga bog'liq
       emas — kelajakda panel qo'shilsa ham ishlayveradi. */
  html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#080b12}
  #topbar{display:none!important}
  #main{position:fixed!important;inset:0!important;margin:0!important;padding:0!important;display:flex!important}
  #main > *:not(#center-col){display:none!important}
  #center-col{flex:1!important;width:100vw!important;height:100vh!important;display:flex!important;flex-direction:column!important}
  #center-col > *:not(#cvp){display:none!important}
  #cvp{flex:1!important;width:100%!important;height:100%!important}
  #three-canvas{width:100%!important;height:100%!important}
  /* ── Redaktor artefaktlari — o'yinda kerak emas ──────────────
     ⚠ Bular #cvp ICHIDA turadi, ya'ni yuqoridagi
       "#center-col > *:not(#cvp)" qoidasi ularni YASHIRMAYDI —
       har birini alohida aytish kerak.

       #fps-ov   — FPS / Obj / Tri / Vaqt hisoblagichi
       #mode-ov  — CAM: Perspektiv, RMB+Sichq: Aylantir …
       #gizmo-svg, #multi-sel-bar, #gltf-drop — tanlov/tortish asboblari

     ⚠ TEGILMAYDI (bular O'YINNIKI, redaktorniki emas):
       #crosshair, #ibtn-prompt, #gaze-timer-hud,
       #fps-grab-hint, #fps-held-lbl */
  #gizmo-svg,#multi-sel-bar,#gltf-drop,#fps-ov,#mode-ov{display:none!important}
  /* ── 🎮 PC yordamchi paneli — o'yinda KERAK EMAS ──────────────
     "👁 1-SHAXS | WASD yur | Space sakra | V kamera | Shift tez"
     Bu PlayerController._createHUD() (scripts/entities/player.js)
     tomonidan Play bosilganda document.body ga qo'shiladi, ya'ni
     #main dan TASHQARIDA — yuqoridagi qoidalar uni yashirmaydi.
     ⚠ Faylning o'zidan olib tashlamaymiz: redaktorda u foydali
       (kamera almashtirish tugmasi). Faqat eksportda yashiriladi.
       Kamera baribir V tugmasi bilan almashadi. */
  #pc-hud{display:none!important}
  /* 🐞 Ishlab chiquvchi uchun: manzilga ?fps=1 qo'shilsa hisoblagich qaytadi */
  body.apex-dbg #fps-ov{display:block!important}
  /* Kanvasда matn tanlanmasin (ikki marta bosganда ko'k belgilanish) */
  #cvp{user-select:none;-webkit-user-select:none}
  #game-load{position:fixed;inset:0;background:#080b12;color:var(--accent);z-index:99999;
    display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;
    font-family:'Share Tech Mono',monospace}
  #game-load .b{width:220px;height:3px;background:rgba(var(--accent-rgb),.15);border-radius:2px;overflow:hidden}
  #game-load .b i{display:block;height:100%;width:30%;background:var(--accent);animation:gl 1s infinite}
  @keyframes gl{0%{margin-left:-30%}100%{margin-left:100%}}
</style>
</head>
<body>
<div id="game-load"><div style="font-size:15px;letter-spacing:2px">${title.toUpperCase()}</div>
  <div class="b"><i></i></div><div id="game-load-t" style="font-size:10px;opacity:.6">yuklanmoqda…</div></div>

${body}

<!--  ⚠ EKSPORT QILINGAN O'YIN BELGISI. Skriptlardan OLDIN, chunki
      ⏸ pauza menyusi yuklanishida shu bayroqni o'qiydi.
      Muharrirda u YO'Q — shu bois ESC u yerda o'z ishini qiladi
      (⏹ Stop, kamera rejimidan chiqish) va menyu aralashmaydi. -->
<script>window.__APEX_GAME__ = true;
//  ⚠ QURILISH BELGISI — \"eski arxivmi?\" degan savolga javob.
//    Foydalanuvchi \"o'yin bor, lekin ulanish yo'q\" deganda
//    birinchi savol shu bo'ladi va uni tekshirishning yo'li
//    YO'Q edi. Endi konsolda ko'rinadi.
window.__APEX_BUILD__ = ${JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' '))};
window.__APEX_HAS_MP__ = true;
console.log('%c🎮 APEX GAME — qurilgan: ' + window.__APEX_BUILD__,
            'color:#4de2c8;font-weight:700');
console.log('   🌐 Multiplayer: bor (net-adapter · net-ws · net-firebase)');
</script>
<!--  👤 NIK SO'RASH — o'yin boshlanishidan oldin.
      ⚠ O'yinda 🌐 multiplayer paneli YO'Q va o'yinchi nikini
        kirita olmasdi — hamma \"Player 123\" bo'lib ko'rinardi.
      ⚠ So'ralgan nik va UID brauzerда SAQLANADI: o'yinchi har
        kirganda qayta yozishi shart emas va UID o'zgarmaydi. -->
<script>
(function () {
  'use strict';
  //  ⚠ Multiplayer O'CHIQ bo'lsa so'ramaymiz — yakka o'yinda
  //    keraksiz oyna chiqib turardi.
  //  ⚠ PROMISE qaytaradi: chaqiruvchi javobni KUTISHI shart.
  //    XATO BOR EDI: oyna ochilardi-yu, ▶ Play DARHOL bosilardi va
  //    ulanish nik BO'SH holda ketardi. O'yinchi nomini yozsa ham
  //    boshqalar uni \"Player 456\" deb ko'rardi.
  window.__APEX_ASK_NICK__ = function () {
    return new Promise(function (done) {
    try {
      var S = window.MultiplayerSystem;
      if (!S || !S.cfg || S.cfg.autoJoin !== true) { done(); return; }

      var KEY = 'apex.mp.id';
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      //  ⚠ UID BIR MARTA yasaladi va SAQLANADI: u o'yinchini
      //    xonada tanitadi. Har kirganda yangisini bersak
      //    ballari va mulki begona bo'lib qolardi.
      if (saved && saved.uid && saved.name) {
        S.cfg.name = saved.name;
        S.cfg.uid = saved.uid;
        done();
        return;
      }

      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;' +
        'align-items:center;justify-content:center;background:#04070c;' +
        "font-family:'Share Tech Mono',monospace";
      ov.innerHTML =
        '<div style="min-width:280px;max-width:90%;background:rgba(10,15,22,.97);' +
        'border:1px solid rgba(0,255,190,.3);border-radius:8px;padding:22px 24px">' +
        '<div style="font-size:14px;letter-spacing:3px;color:#4de2c8;text-align:center;' +
        'margin-bottom:14px">NIKINGIZ</div>' +
        '<input id="apex-nick" maxlength="20" placeholder="Ismingiz…" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 11px;border-radius:5px;' +
        'border:1px solid rgba(0,255,190,.3);background:#0a0f16;color:#e8f0ee;' +
        //  ⚠ BIR TIRNOQLI satr: ichida QO'SHTIRNOQ bor va uni
        //    qochirish SHART EMAS. Ilgari qo'shtirnoqli satr ichida
        //    qochirilgan qo'shtirnoq yozilgandi — lekin bu blok
        //    SHABLON SATRI ichida yaratiladi va u qochirishni
        //    YEB QO'YARDI. Natijada chiqarilgan faylda satr o'sha
        //    yerda UZILARDI:
        //        SyntaxError: string literal contains an
        //        unescaped line break
        //    va o'yin UMUMAN ishga tushmasdi.
        'font-family:inherit;font-size:13px;outline:none">' +
        '<button id="apex-nick-ok" style="width:100%;margin-top:12px;padding:10px;' +
        'border-radius:5px;cursor:pointer;font-family:inherit;font-size:13px;' +
        'border:1px solid #4de2c8;background:rgba(0,255,190,.1);color:#4de2c8">' +
        'BOSHLASH</button></div>';
      document.body.appendChild(ov);

      var inp = ov.querySelector('#apex-nick');
      var go = function () {
        var v = (inp.value || '').trim().slice(0, 20);
        //  ⚠ Bo'sh nik ham QABUL qilinadi — o'yinchi shoshayotgan
        //    bo'lishi mumkin. Unga avtomatik nom beriladi.
        if (!v) v = 'Player ' + Math.floor(Math.random() * 900 + 100);
        //  UID: vaqt + tasodif. Kriptografik emas — maqsad
        //  o'yinchini ajratish, himoya emas.
        var uid = (saved && saved.uid) ||
          (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
        try { localStorage.setItem(KEY, JSON.stringify({ name: v, uid: uid })); } catch (e) {}
        S.cfg.name = v;
        S.cfg.uid = uid;
        ov.remove();
        //  ⚠ SHU YERDA — nom qo'yilgandan KEYIN. Oldin chaqirsak
        //    ulanish yana bo'sh nom bilan ketardi.
        done();
      };
      ov.querySelector('#apex-nick-ok').onclick = go;
      //  ⚠ Hodisa PASTGA O'TMAYDI: busiz har harf o'yinga tushib
      //    personaj yurib ketardi.
      inp.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') go();
      }, true);
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 0);
    } catch (e) { done(); }
    });
  };
})();
</script>
${srcs.map(s => `<script src="engine/${s}"></script>`).join('\n')}
${opts.devConsole ? `<script>window.APEX_GAME_CONSOLE = { key: ${JSON.stringify(opts.consoleKey || '`')} };</script>
<script src="engine/scripts/ui/game-console.js"></script>
<script src="engine/scripts/ui/game-commands.js"></script>` : ''}
<script src="game-boot.js"></script>
</body>
</html>`;
}

// ── Boot skripti ─────────────────────────────────────────────
function _bootJS() {
  return `// 🎮 O'yin ishga tushirish — redaktor dvigatelini o'yin rejimiga o'tkazadi
(function () {
  'use strict';
  const T = document.getElementById('game-load-t');
  const say = m => { if (T) T.textContent = m; };

  window.addEventListener('load', async () => {
    try {
      // Dvigatel init() lari DOMContentLoaded'da ishlaydi — bir kadr kutamiz
      await new Promise(r => setTimeout(r, 120));

      say('sahna yuklanmoqda…');
      const res = await fetch('jsons/scene.zip');
      if (!res.ok) throw new Error('jsons/scene.zip topilmadi (' + res.status + ')');
      const zip = await JSZip.loadAsync(await res.arrayBuffer());

      const jf = zip.file('apex-file.json') || zip.file('scene.json');
      // ⚠ Apostrof ISHLATMANG! Bu matn template literal ichida turadi va
      //   generatsiya paytida ekranlash yo'qoladi: 'yo\'q' → 'yo'q' →
      //   satr erta yopilib, boot butunlay sintaksis xatosi bilan yiqiladi.
      if (!jf) throw new Error('scene.zip ichida apex-file.json topilmadi');
      const data = JSON.parse(await jf.async('string'));

      // ⚠ Dvigatelning O'Z yuklovchisi — 2-parametr ZIP.
      //   Tekstura/modellar shu ZIP ichidan olinadi. Alohida yuklovchi
      //   yozmaymiz: u redaktordan uzilib qolardi.
      if (typeof loadScene !== 'function') throw new Error('loadScene topilmadi (save-load.js yuklanmadi?)');
      await loadScene(data, zip);

      say('boshlanmoqda…');
      await new Promise(r => setTimeout(r, 250));

      //  👤 Nik so'raladi — ▶ Play DAN OLDIN.
      //  ⚠ Keyin so'rasak o'yinchi allaqachon xonaga \"Player 123\"
      //    nomi bilan kirib ulgurardi va boshqalar uni shunday
      //    ko'rardi.
      //  ⚠ Nik KUTILADI. Ilgari kutilmasdi va ▶ Play darhol
      //    bosilardi — ulanish nik BO'SH holda ketib, o'yinchi
      //    boshqalarga \"Player 456\" bo'lib ko'rinardi.
      const _startPlay = function () {
        // Play — dvigatelning o'z tugmasi orqali (mantiq ikkilanmasin)
        const pb = document.getElementById('play-btn');
        if (pb) pb.click();
        else if (typeof isPlaying !== 'undefined') { isPlaying = true; window.isPlaying = true; }
      };

      //  OGOHLANTIRISH: Promise qaytmasa ham ishlaydi — eski eksportlarda
      //    so'rovchi oddiy funksiya bo'lishi mumkin.
      try {
        const _p = window.__APEX_ASK_NICK__ ? window.__APEX_ASK_NICK__() : null;
        if (_p && typeof _p.then === 'function') _p.then(_startPlay);
        else _startPlay();
      } catch (e) { _startPlay(); }

      const gl = document.getElementById('game-load');
      if (gl) { gl.style.transition = 'opacity .4s'; gl.style.opacity = '0';
                setTimeout(() => gl.remove(), 450); }

      // ══════════════════════════════════════════════════════
      //  🔒 REDAKTORNI QULFLAYMIZ
      // ------------------------------------------------------
      //  ⚠ Ilgari bu yerда ~30 qatorlik qo'lbola qulf turardi:
      //    kanvas click'ini to'xtatish + selectObject'ni noop qilish.
      //    U ikki sababdan yetarli emas edi:
      //      1. Esc — "play-btn".click() ga borib o'yinni TO'XTATARDI
      //         (ekranда yashirin redaktor qolardi);
      //      2. kod GENERATSIYA QILINGAN MATN ichida yashardi — uni
      //         test qilib bo'lmasdi va redaktordagi o'zgarishlardan
      //         xabarsiz qolardi.
      //
      //    Endi mantiq "scripts/gameplay/game-lock.js" da — dvigatel
      //    bilan birga ko'chadi va "test-game-lock.js" bilan sinaladi.
      // 🐞 ?fps=1 — hisoblagichni qaytarish (o'yin unumdorligini
      //    tekshirish uchun). Standart holatda hamma yordamchi qatlam
      //    yashirin.
      try {
        if (/[?&]fps=1/.test(location.search)) {
          document.body.classList.add('apex-dbg');
          say('debug: FPS yoqildi');
        }
      } catch (e) {}

      if (window.GameLock && typeof GameLock.enable === 'function') {
        GameLock.enable();
      } else {
        // Zaxira: game-lock.js yuklanmagan bo'lsa ham o'yin buzilmasin
        say('ogohlantirish: qulf yuklanmadi');
        console.warn('[APEX boot] GameLock topilmadi — redaktor boshqaruvi ochiq qoladi');
      }

      window.dispatchEvent(new Event('resize'));
    } catch (e) {
      const gl = document.getElementById('game-load');
      if (gl) gl.innerHTML = '<div style="color:#ff8844;font-family:monospace;text-align:center;padding:20px">' +
        '❌ ' + e.message + '<br><br><span style="font-size:10px;opacity:.7">' +
        'ZIP ni yechib, papkada web-server ishga tushiring:<br><code>node server.js</code></span></div>';
      console.error('[APEX boot]', e);
    }
  });
})();
`;
}

// ── O'yin uchun web-server ───────────────────────────────────
//  ⚠ Loyihadagi `server.js` dan NUSXA EMAS — u path traversal'ga
//    ochiq (`path.join(__dirname, req.url)` — `GET /../../../etc/passwd`
//    ishlaydi) va query string'ni (`?v=1`) fayl nomiga qo'shib yuboradi.
//    Bu yerда o'sha ikkala xato tuzatilgan versiya beriladi.
function _serverJS(title) {
  return `// ${title} — o'yin serveri
//  Ishga tushirish:  node server.js    →  http://localhost:8080
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8080;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.zip':'application/zip', '.wasm':'application/wasm', '.glb':'model/gltf-binary',
  '.gltf':'model/gltf+json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.webp':'image/webp', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.wav':'audio/wav',
  '.ogg':'audio/ogg', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf' };

const srv = http.createServer((req, res) => {
  // ⚠ Query string'ni tashlaymiz — aks holda "app.js?v=1" fayl nomiga
  //   aylanib, 404 berardi.
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); }
  catch { res.writeHead(400); return res.end('Bad request'); }

  // ⚠ Path traversal himoyasi: normalize + __dirname ichida ekanini
  //   TEKSHIRAMIZ. Busiz "GET /../../../etc/passwd" ishlab ketardi.
  const rel  = path.normalize(url).replace(/^(\.\.[\/\\\\])+/, '');
  const file = path.join(__dirname, rel === '/' || rel === '\\\\' ? 'index.html' : rel);
  const root = path.resolve(__dirname);
  if (!path.resolve(file).startsWith(root + path.sep) && path.resolve(file) !== root) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
               return res.end('404 — ' + rel); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
                         'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// 🌐 MULTIPLAYER — WebSocket xona relesi
//  ⚠ \`try\` ichida: \`net/\` papkasi bo'lmasa o'yin BARIBIR ochilsin.
//    Multiplayer qo'shimcha imkoniyat, majburiy emas.
let MP = null;
try { MP = require('./net/mp-room'); } catch (e) {}

//  ⚠ FAQAT \`/mp\`: boshqa yo'ldagi upgrade so'rovi rad etiladi.
srv.on('upgrade', (req, socket) => {
  const u = String(req.url || '').split('?')[0];
  if (MP && u === '/mp') { MP.handle(req, socket); return; }
  try { socket.destroy(); } catch (e) {}
});

srv.listen(PORT, () => {
  console.log('🎮 ${title} → http://localhost:' + PORT);
  console.log(MP ? '🌐 Multiplayer tayyor — ws://…/mp'
                 : '⚠ Multiplayer ishlamaydi (net/ papkasi topilmadi)');
});
`;
}

function _readme(title, devConsole, consoleKey) {
  //  ⚠ QURILISH SANASI: \"eski arxivmi?\" degan savolga javob.
  //    Foydalanuvchi \"o'yin bor, lekin ulanish yo'q\" deganda
  //    birinchi tekshiriladigan narsa shu.
  const _built = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${title}
${'='.repeat(title.length)}
Qurilgan: ${_built}

ISHGA TUSHIRISH
---------------
  1. Shu papkada terminal oching
  2. node server.js
  3. Brauzerda: http://localhost:8080

MULTIPLAYER
-----------
  Bu arxivda multiplayer BOR. Tekshirish uchun brauzer
  konsolini oching (F12) — u yerda shunday yozuv turadi:

      🎮 APEX o'yin — qurilgan: ${_built}
         🌐 Multiplayer: bor

  Agar bu yozuv KO'RINMASA — arxiv eski, qaytadan eksport qiling.

  Ulanish uchun eksportdan OLDIN muharrirda:
    • 🌐 Multiplayer panelini oching
    • backend va sozlamalarni kiriting
    • \"▶ Play bosilganda o'zi ulansin\" ni YOQING

  Busiz o'yin ulanmaydi: o'yinda multiplayer paneli YO'Q va
  o'yinchi manzilni qo'lda kirita olmaydi.

NEGA server kerak?
------------------
  O'yin sahnani fetch('jsons/scene.zip') orqali yuklaydi.
  Brauzer file:// protokolida fetch'ni CORS bilan bloklaydi.
  Istalgan web-server bo'ladi (python3 -m http.server 8080 ham).

TUZILISHI
---------
  index.html        o'yin
  engine/           APEX dvigateli (scripts/ + libs/)
  jsons/scene.zip   sahna — O'YIN SHUNI O'QIYDI
  jsons/*.json      yorug'lik/triggerlar — faqat KO'RISH uchun
  map/              Map Loader kartalari
  sound/ video/ texture/ models/ html/ maps/
                    aktivlar — ko'rish/tahrirlash uchun (o'yin ularni o'qimaydi)
  timeline/         animatsiya treklari
  game-boot.js      UI ni yashiradi, sahnani yuklaydi, Play bosadi
${devConsole ? `
RAZRABOTCHIKLAR KONSOLI
-----------------------
  O'yinda "${consoleKey}" tugmasi bosilsa uchib yuradigan konsol ochiladi.
  Sarlavhasidan ushlab surish mumkin, burchagidan cho'zish mumkin.
  Pastdagi qatorga komanda yoziladi ("help" — ro'yxat).
  Fayli: engine/scripts/ui/game-console.js
` : ''}`;
}

window.exportGameZip = exportGameZip;
