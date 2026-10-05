// ============================================================
//  🌐 MULTIPLAYER — mijoz
// ------------------------------------------------------------
//  Bir nechta o'yinchi bitta sahnada birga yuradi. Server RELE:
//  kim nima yuborsa o'shani qolganlarga uzatadi.
//
//  ── NIMA SINXRONLANADI (v1) ─────────────────────────────────
//      • o'yinchi joylashuvi va burilishi
//      • qaysi animatsiya ketayotgani
//      • mashinada ekanmi (va qaysi mashinada)
//
//  ── NIMA SINXRONLANMAYDI ────────────────────────────────────
//  ⚠ OCHIQ AYTILADI: fizika, 🔢 sonlar, 🚪 eshiklar, inventar —
//    hali yo'q. Ular HODISA sinxronizatsiyasini talab qiladi va
//    har biri alohida qaror: kim vakolatli? to'qnashuvda kim
//    yutadi? Ularni v1 ga tiqsak yarim ishlaydigan narsa chiqardi.
//    Hozircha: do'stlar bir sahnada birga yuradi va bir-birini
//    ko'radi.
//
//  ── NEGA SERVER VAKOLATLI EMAS ──────────────────────────────
//  ⚠ Vakolatli server fizikani Node'da qayta hisoblashi kerak —
//    brauzerdagi Rapier natijasi bilan aslo bir xil chiqmasdi.
//    Rele esa aldovga qarshi himoya bermaydi: raqobatli o'yin
//    uchun emas, HAMKORLIKDAGI o'yin uchun.
// ============================================================
window.MultiplayerSystem = (function () {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);

  /** Sozlama — sahna bilan saqlanadi. */
  const cfg = {
    //  🔌 Qaysi backend. Adapterlar `scripts/net/` da ro'yxatdan
    //  o'tadi — o'yin mantig'i qaysisi ishlayotganini BILMAYDI.
    backend: 'ws',         // 'ws' | 'firebase' | …
    url:  '',              // bo'sh = shu sahifaning serveri (ws)
    fbConfig: '',          // 🔥 Firebase — yopishtirilgan konfiguratsiya
    //  💬 Chat uchun ALOHIDA baza — ixtiyoriy.
    //  ⚠ Bo'sh bo'lsa chat o'yin bazasida ishlaydi.
    fbChatConfig: '',
    databaseURL: '',       // 🔥 (ajratilgan yoki qo'lda)
    apiKey: '',            // 🔥 Firebase (ixtiyoriy)
    room: 'apex',
    name: '',              // bo'sh = avtomatik
    //  🆔 O'yinchi belgisi — brauzerda saqlanadi va o'zgarmaydi.
    //  ⚠ Kriptografik EMAS: maqsad o'yinchini ajratish, himoya
    //    emas. Haqiqiy autentifikatsiya serverda bo'lishi kerak.
    uid: '',
    //  ⚠ Yuborish chastotasi: 15/s yetarli va tarmoqni
    //    bo'g'maydi. 60/s da farq ko'rinmaydi, lekin trafik
    //    to'rt barobar oshardi.
    rate: 15,
    autoJoin: false,       // ▶ Play bosilganda o'zi ulansinmi

    // ── 🧱 TO'QNASHUV ─────────────────────────────────
    //  ⚠ Standart YONIQ: o'yinchilar bir-biridan o'tib ketsa
    //    multiplayer \"arvohlar dunyosi\" bo'lib tuyulardi.
    solid: true,
    ghostRadius: 0.45,     // arvoh silindri radiusi (m)

    // ── 👥 XONA ───────────────────────────────────
    //  ⚠ 0 = cheksiz. Cheklov MIJOZDA — u maslahat, himoya emas:
    //    haqiqiy cheklash serverda bo'lishi kerak va u 2-bosqichda.
    //    Shuning uchun panel buni OCHIQ aytadi.
    maxPlayers: 0,

    // ── 📍 SPAWN ──────────────────────────────────
    //  ⚠ Hammasi (0,0,0) da paydo bo'lsa bir-birining ichida
    //    turardi va birinchi kadrda uloqtirib yuborardi.
    //    'none'   — dvigatelning o'z spawn nuqtasi
    //    'ring'   — markaz atrofida doira bo'ylab taqsimlanadi
    //    'points' — sahnadagi 🧍 spawn nuqtalari bo'ylab
    spawnMode: 'ring',
    spawnRadius: 4,
    //  📍 Qo'lda yozilgan nuqtalar — [{x,y,z}, …]
    //  ⚠ O'yinchilar ular bo'ylab NAVBAT bilan taqsimlanadi. Nuqta
    //    sondan kam bo'lsa aylanib qaytadi (4 o'yinchi, 2 nuqta →
    //    1,2,1,2). Aks holda ortiqchasi (0,0,0) ga tushardi.
    spawnPoints: [],

    // ── 💬 CHAT ───────────────────────────────────
    chat: true,
    chatKey: 'KeyT',
    chatFade: 12,          // soniya, 0 = o'chmasin

    //  ⚠ IKKI ALOHIDA CHEKLOV — ular BOSHQA-BOSHQA masalani hal
    //    qiladi va ularni bitta songa birlashtirib bo'lmaydi:
    //
    //    `chatVisible` — O'YIN VAQTIDA ekranda nechta qator turadi.
    //      Ko'p bo'lsa ekranni to'sadi va o'yinchi jangni ko'rmaydi.
    //
    //    `chatHistory` — `T` bosilganda nechta xabar ko'rinadi va
    //      xotirada nechtasi saqlanadi. Bu KO'PROQ bo'lishi kerak:
    //      o'yinchi tarixni o'qish uchun ataylab ochadi.
    chatVisible: 5,        // o'yin vaqtida ekranda
    chatHistory: 20,       // \"T\" bosilganda va xotirada

    //  🎨 Ko'rinish — dizayner xohlaganicha.
    chatFontSize: 11,      // px
    chatCss: '',           // qo'shimcha CSS (`.mp-chat-row` va h.k.)

    //  🏷 Tepadagi nik — o'chirish mumkin.
    //  ⚠ Sprite arzon, lekin ko'p o'yinchida ular ham yig'iladi.
    tags: true,

    // ── 🔢 BALL ───────────────────────────────────
    //  ⚠ Standart YONIQ, lekin FAQAT ulanish bor bo'lganda
    //    ishlaydi — yakka o'yin tarmoqqa bog'lanib qolmasin.
    scoreSync: true,
    scoreSlot: '',         // 🔢 NoScript slot nomi (bo'sh = faol)

    // ── 💤 AFK ─────────────────────────────────────
    //  ⚠ Standart 5 daqiqa. 0 = avtomatik AFK YO'Q (faqat
    //    `/afk` buyrug'i bilan).
    afkMinutes: 5,
  };

  let _net = null;      // faol adapter
  let _myId = null;
  let _roster = [];
  let _status = 'off';     // off | connecting | on | error
  let _placed = false;     // 📍 spawn nuqtasiga ko'chirilganmi
  const _peers = new Map();  // id → { obj, last, name, target, fresh }

  //  ⚠ Shu masofadan uzoq sakrash SILLIQ EMAS, darhol qo'yiladi.
  //    15 m — oddiy yurishda bir kadrda bosib o'tib bo'lmaydigan,
  //    lekin teleport uchun kichik masofa.
  const SNAP_DIST = 15;

  const status  = () => _status;
  const myId    = () => _myId;
  const roster  = () => _roster.slice();
  const peers   = () => _peers;
  const isOn    = () => _status === 'on';

  // ============================================================
  //  🔗 Ulanish
  // ============================================================
  // ============================================================
  //  🔗 Ulanish — ADAPTER orqali
  // ------------------------------------------------------------
  //  ⚠ Ilgari bu yerda `new WebSocket(...)` to'g'ridan-to'g'ri
  //    yozilgan edi. Firebase qo'shish uchun har bir `ws.send`,
  //    `ws.onclose` ni qidirib topish kerak bo'lardi — va bir
  //    joyni o'tkazib yuborsak, backend almashtirilganda o'sha
  //    yo'l eski soketga gapirib turardi.
  //
  //  ⚠ PROTOKOL O'ZGARMADI: adapter faqat TASHISH usulini
  //    almashtiradi, xabarlar aynan o'sha.
  // ============================================================
  function connect() {
    if (_net) return false;
    const A = window.NetAdapters;
    if (!A) { _log("\u26a0 Adapter qatlami yuklanmagan", 'lw'); return false; }

    const ad = A.create(cfg.backend || 'ws');
    //  ⚠ Topilmasa OCHIQ aytamiz: jimgina `ws` ga o'tib ketsak
    //    dizayner Firebase tanlagan deb o'ylab, nega ishlamayotganini
    //    tushunmasdi.
    if (!ad) {
      _status = 'error';
      _log('\u274c Backend topilmadi: ' + cfg.backend, 'le');
      _paint();
      return false;
    }

    _status = 'connecting';
    _paint();
    _net = ad;

    const opts = {
      url: cfg.url, room: cfg.room || 'apex',
      name: cfg.name || ('Player ' + Math.floor(Math.random() * 900 + 100)),
      uid: cfg.uid || '',
      databaseURL: cfg.databaseURL, apiKey: cfg.apiKey,
      fbConfig: cfg.fbConfig,
      fbChatConfig: cfg.fbChatConfig,
      //  🧹 Adapter eskilarini o'chirish uchun chegarani biladi.
      chatHistory: cfg.chatHistory,
    };

    //  ⚠ Adapter o'z sozlamasini TAYYORLAB olishi mumkin — masalan
    //    🔥 Firebase yopishtirilgan konfiguratsiya matnidan
    //    `databaseURL` ni ajratadi. Buni mijozda qilsak har backend
    //    uchun shu yerda shoxlanib ketardi.
    try {
      const def = A.get(cfg.backend || 'ws');
      if (def && typeof def.prepare === 'function') Object.assign(opts, def.prepare(cfg));
    } catch (e) {}

    const ok = ad.connect(opts, {
      onOpen: () => {
        _status = 'on';
        //  ⚠ `join` HAMMA backendga yuboriladi. Firebase uni
        //    o'zi e'tiborsiz qoldiradi (u yerda yozuv allaqachon
        //    qo'yilgan) — lekin mijoz kodi bir xil bo'lib qoladi.
        ad.send({ t: 'join', room: opts.room, name: opts.name,
                  uid: cfg.uid || '', fp: sceneHash() });
        _log('\ud83c\udf10 Ulandi — xona: ' + opts.room + '  (' + ad.name + ')', 'lok');
        _paint();
      },
      onMessage: (m) => _onMsg(m),
      onClose: () => {
        _net = null;
        _myId = null;
        _roster = [];
        //  ⚠ Barcha arvohlar TOZALANADI: aks holda uzilgandan keyin
        //    boshqa o'yinchilar joyida qotib turardi.
        _clearPeers();
        _placed = false;
        //  ⚠ Yuborilgan oxirgi holat TOZALANADI: qayta ulanganda
        //    birinchi holat DARHOL ketishi kerak, aks holda boshqa
        //    o'yinchilar bizni 2 soniya ko'rmasdi.
        _lastSent = null; _lastSentAt = 0;
        _scores.clear();
        _lastScore = null;
        _afkSet.clear();
        _iAmAfk = false; _afkManual = false;
        _channel = null; _invites.clear();
        //  ⚠ Uzilganda HAMMA egalik tozalanadi: aks holda
        //    mashinalar band holatda qotib qolardi.
        for (const id of [..._own.car.keys(), ..._own.held.keys()]) _clearOwn(id);
        //  ⚠ Chat maydoni ham YOPILADI: ochiq qolsa `_htmlKeyLock`
        //    yoniq turib, o'yinchi butunlay harakatsiz qolardi.
        chatToggle(false);
        if (_status !== 'error') _status = 'off';
        _log('\ud83c\udf10 Ulanish uzildi', 'lw');
        _paint();
      },
      onError: (e) => {
        _status = 'error';
        _log('\u274c Tarmoq xatosi: ' + (e && e.message ? e.message : e), 'le');
        _paint();
      },
    });

    //  ⚠ Adapter `false` qaytarsa holat tozalanadi. Busiz panel
    //    "ulanmoqda…" da QOTIB qolardi va tugma qaytmasdi.
    if (ok === false) { _net = null; if (_status === 'connecting') _status = 'error'; _paint(); }
    return ok !== false;
  }

  function disconnect() {
    if (!_net) return false;
    try { _net.disconnect(); } catch (e) {}
    _net = null;
    _status = 'off';
    _clearPeers();
    _paint();
    return true;
  }

  function _onMsg(m) {
    if (m.t === 'joined') { _myId = m.id; _paint(); return; }
    if (m.t === 'roster') {
      _roster = m.list || [];

      //  👥 CHEKLOV — xona to'lganini AYTAMIZ.
      //  ⚠ Bu MASLAHAT, himoya emas: haqiqiy cheklash serverda
      //    bo'lishi kerak. Mijozdagi tekshiruvni chetlab o'tish
      //    oson — panel buni ochiq aytadi.
      if (cfg.maxPlayers > 0 && _roster.length > cfg.maxPlayers) {
        const mine = _roster.findIndex(x => x.id === _myId);
        //  ⚠ KEYIN kelgan chiqadi, oldingilari qoladi — aks holda
        //    xonadagi odamlar yangi kelgani uchun uzilardi.
        if (mine >= cfg.maxPlayers) {
          _log('⚠ Xona to\'la (' + cfg.maxPlayers + ') — uzildi', 'lw');
          disconnect();
          return;
        }
      }

      //  📍 O'z joyimizga BIR MARTA ko'chamiz: har ro'yxatda
      //    ko'chsak o'yinchi har yangi odam kirganda spawn nuqtasiga
      //    qaytib tashlanardi.
      if (!_placed) { _placed = _placeSelf(); }
      //  ⚠ Yorliqlar RO'YXAT kelganda yangilanadi. Arvoh ism
      //    kelishidan OLDIN yaratilishi mumkin (birinchi holat
      //    xabari ro'yxatdan oldin kelsa) — u holda yorliqda
      //    \"Player 3\" turib qolardi va kim kimligi bilinmasdi.
      _syncTags();
      _paint();
      return;
    }
    //  🔥 Firebase adapteri `peer` yuboradi (server yo'q, ro'yxat
    //  ham yo'q) — uni ro'yxatga O'ZIMIZ qo'shamiz. Busiz Firebase
    //  da hamma \"Player -1\" bo'lib ko'rinardi.
    if (m.t === 'peer') {
      _checkFp(m);
      if (m.id != null && !_roster.some(x => x.id === m.id)) {
        _roster = _roster.concat([{ id: m.id, name: m.name || ('Player ' + m.id) }]);
      }
      _syncTags();
      _paint();
      return;
    }
    if (m.t === 'bye') { _removePeer(m.id); return; }
    if (m.t === 'err')    { _log('⚠ Server: ' + m.m, 'lw'); return; }
    if (m.t === 'left')   { _removePeer(m.id); return; }
    if (m.t === 'state')  { _onState(m); return; }
    //  💬 Chat — 🖥 WebSocket va 🔥 Firebase da bir xil.
    // 💤 AFK holati.
    if (m.t === 'afk') {
      if (m.v) _afkSet.add(m.id); else _afkSet.delete(m.id);
      //  ⚠ Arvoh YASHIRILADI, o'chirilmaydi: o'yinchi qaytganda
      //    uni qaytadan yasash kerak bo'lardi va u sahna
      //    markazidan uchib kelardi.
      const p = _peers.get(m.id);
      if (p && p.obj) p.obj.visible = !m.v;
      _syncTags();
      return;
    }

    // 📡 Dunyo hodisasi — boshqa o'yinchi bajardi.
    if (m.t === 'ev') { _replay(m); return; }

    // 🔢 Ball — boshqa o'yinchi e'lon qildi.
    if (m.t === 'score') {
      if (m.id != null) _scores.set(m.id, { name: m.name || _peerName(m.id), score: +m.v || 0 });
      return;
    }
    //  ⚠ Faqat MENGA yuborilgani qo'llanadi: `to` boshqa o'yinchi
    //    bo'lsa xabar bizga ham keladi (rele hammaga tarqatadi) va
    //    tekshirmasak HAMMASINING balli o'zgarib ketardi.
    if (m.t === 'score.set' || m.t === 'score.add') {
      if (m.to !== _myId) return;
      _applyScore(+m.v || 0, m.t === 'score.add');
      //  ⚠ Darhol e'lon qilamiz: `_pubScore` keyingi kadrda ishga
      //    tushadi, lekin o'zgartirgan odam natijani KUTIB turadi.
      _lastScore = null;
      _pubScore();
      return;
    }
    if (m.t === 'chat') {
      //  ⚠ MAXFIY xabar faqat A'ZOLARGA ko'rsatiladi.
      //    `/chat` (maxfiy EMAS) esa hammaga ko'rinadi — shu bois
      //    `pv` bayrog'i alohida.
      if (m.pv && Array.isArray(m.ch) && m.ch.indexOf(_myId) < 0) return;
      const tag = (m.pv ? '🔒 ' : (Array.isArray(m.ch) ? '📨 ' : ''));
      _chatAdd(tag + (m.name || _peerName(m.id) || '?'),
               String(m.text || '').slice(0, 200));
      return;
    }
    //  ✉ Guruhga taklif.
    if (m.t === 'invite') {
      if (!Array.isArray(m.to) || m.to.indexOf(_myId) < 0) return;
      _invites.set(m.id, m.to.slice());
      _chatAdd('⚙', (m.name || '?') + ' sizni guruhga taklif qildi — /join');
      return;
    }
    //  🎬 Hodisalar \u2014 kelajakda (eshik, son, otish). Hozircha
    //  o'tkazib yuboriladi, lekin protokol joyi band qilingan.
  }

  // ============================================================
  //  👥 Boshqa o'yinchilar
  // ============================================================
  // ============================================================
  //  🧬 SAHNA BARMOQ IZI
  // ------------------------------------------------------------
  //  ⚠ MUAMMO: ikki dizayner BOSHQA-BOSHQA sahnada turib bitta
  //    xonaga ulanishi mumkin. U holda arvohlar mavjud bo'lmagan
  //    joylarda paydo bo'ladi, devorlardan o'tadi, yerga botadi —
  //    va sabab hech qayerdan ko'rinmaydi. Har ikkalasi ham
  //    \"multiplayer buzuq\" deb o'ylaydi.
  //
  //  Barmoq izi buni OCHIQ aytadi.
  //
  //  ⚠ Hisob YENGIL bo'lishi shart — u har ulanishda chaqiriladi.
  //    Butun sahnani JSON qilish o'nlab megabayt bo'lardi. Shuning
  //    uchun faqat OBYEKT SONI va nomlari yig'indisi.
  //
  //  ⚠ KRIPTOGRAFIK emas: maqsad — tasodifiy mos kelmaslikni
  //    ushlash, hujumdan himoya emas.
  // ============================================================
  function sceneHash() {
    try {
      const list = (typeof objects !== 'undefined' && objects) ? objects : [];
      //  ⚠ Arvohlar HISOBGA OLINMAYDI: ular ulanishdan keyin
      //    qo'shiladi va ikki tomonda har xil bo'ladi — barmoq izi
      //    doim mos kelmasdi.
      const names = list
        .filter(o => o && o.userData && !o.userData._mpGhost)
        .map(o => String(o.userData.name || o.userData.type || '?'))
        .sort();
      let h = 2166136261;
      const src = names.length + '|' + names.join(',');
      for (let i = 0; i < src.length; i++) {
        h ^= src.charCodeAt(i);
        h = (h * 16777619) >>> 0;
      }
      return h.toString(36);
    } catch (e) { return ''; }
  }

  function _peerName(id) {
    const r = _roster.find(x => x.id === id);
    return (r && r.name) || ('Player ' + id);
  }

  /**
   * Arvoh gavda — boshqa o'yinchi ko'rinishi.
   * ⚠ O'yinchi modelini KLONLAMAYMIZ: u og'ir bo'lishi mumkin
   *   (skinlangan GLB, animatsiyalar) va har ulangan odam uchun
   *   nusxa olsak xotira va FPS cho'kardi. Oddiy kapsula yetarli
   *   va u har doim ko'rinadi.
   */
  // ============================================================
  //  🏷 NIK YORLIG'I
  // ------------------------------------------------------------
  //  ⚠ Kanvasda chizib, tekstura qilamiz. Shrift o'lchami KATTA
  //    olinadi (64px) va sprite kichraytiriladi — aks holda
  //    yaqindan qaralganda harflar xira bo'lardi.
  //
  //  ⚠ `sizeAttenuation: false` YO'Q: yorliq masofaga qarab
  //    kichrayishi KERAK. Aks holda uzoqdagi o'yinchining nomi
  //    butun ekranni egallardi.
  // ============================================================
  function _makeTag(text) {
    if (typeof document === 'undefined' || typeof THREE === 'undefined') return null;
    try {
      const cv = document.createElement('canvas');
      const ctx = cv.getContext('2d');
      if (!ctx) return null;
      const F = 64;
      ctx.font = '600 ' + F + "px 'Share Tech Mono', monospace";
      const w = Math.min(512, Math.ceil(ctx.measureText(text).width) + 32);
      cv.width = w; cv.height = 96;
      //  ⚠ O'lcham o'zgargach kontekst TIKLANADI — shrift yo'qoladi.
      ctx.font = '600 ' + F + "px 'Share Tech Mono', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      //  Fon: qora sahnada oq matn, oq sahnada ham o'qilsin.
      ctx.fillStyle = 'rgba(4,8,14,.72)';
      ctx.fillRect(0, 16, w, 64);
      ctx.fillStyle = '#4de2c8';
      ctx.fillText(text, w / 2, 48);

      const tex = new THREE.CanvasTexture(cv);
      tex.minFilter = THREE.LinearFilter;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthTest: true,
      }));
      //  Kapsula balandligi 1.8 — yorliq uning tepasida.
      sp.position.set(0, 1.35, 0);
      sp.scale.set(w / 96 * 0.55, 0.55, 1);
      //  ⚠ Nur bilan tanlashga XALAQIT BERMASIN: dizayner arvoh
      //    ortidagi obyektni bosolmay qolardi.
      sp.raycast = () => {};
      sp.userData = { _mpTag: true };
      return sp;
    } catch (e) { return null; }
  }

  // ============================================================
  //  🧍 ARVOH — O'YINCHINING HAQIQIY MODELI
  // ------------------------------------------------------------
  //  ⚠ Ilgari HAR DOIM kapsula+konus chizilardi. Lekin dizayner
  //    o'yinchiga model bergan bo'lsa, boshqa o'yinchi uni KUB
  //    ko'rinishida ko'rardi — ya'ni o'yin o'z ko'rinishini
  //    yo'qotardi.
  //
  //    Endi O'YINCHI OBYEKTI nusxalanadi: kub bo'lsa kub, model
  //    bo'lsa model.
  //
  //  ── ⚡ FPS ──────────────────────────────────────────────────
  //  ⚠ `castShadow` O'CHIQ. Soya tashlovchi har bir obyekt soya
  //    xaritasiga QAYTA chiziladi — ya'ni har kadr ikki marta.
  //    Bitta o'yinchi qo'shilganda FPS 30 dan pastga tushishining
  //    asosiy sababi shu edi.
  //
  //  ⚠ Materiallar BAHAM ko'riladi (`clone` shunday qiladi):
  //    har arvoh o'z materiali bilan kelsa shader qayta
  //    kompilyatsiya qilinardi — bu bir necha kadrlik muzlash.
  // ============================================================
  function _playerTemplate() {
    try {
      return (typeof playerMesh !== 'undefined' && playerMesh) ||
             (window.PlayerController && window.PlayerController.obj) || null;
    } catch (e) { return null; }
  }

  function _makeGhost(id) {
    let g = null;

    //  1️⃣ O'yinchi modelidan nusxa
    const src = _playerTemplate();
    if (src) {
      try {
        g = src.clone(true);
        //  ⚠ `userData` NUSXALANMAYDI, YANGIDAN yoziladi: aks holda
        //    arvoh `isPlayerObj` bo'lib qolardi va dvigatel uni
        //    ikkinchi o'yinchi deb hisoblardi.
        g.userData = {};
        g.visible = true;
        g.traverse((c) => {
          //  ⚡ Soya O'CHIQ — FPS ning asosiy sababi.
          c.castShadow = false;
          c.receiveShadow = false;
          //  ⚠ Bolalarning `userData` si ham tozalanadi: u yerda
          //    fizika yoki kollayder havolalari bo'lishi mumkin va
          //    ular arvohga tegishli emas.
          if (c !== g) c.userData = {};
        });
      } catch (e) { g = null; }
    }

    //  2️⃣ Zaxira: o'yinchi topilmasa oddiy kapsula.
    //  ⚠ Bu YO'Q bo'lsa arvoh umuman ko'rinmasdi — masalan
    //    o'yinchi hali yaratilmagan paytda ulanish bo'lsa.
    if (!g) {
      g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x4de2c8, roughness: 0.6 })
      );
      g.add(body);
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.3, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      nose.rotation.x = -Math.PI / 2;
      nose.position.set(0, 0.35, -0.45);
      g.add(nose);
    }

    //  🏷 Tepadagi nik.
    //  ⚠ SPRITE, DOM emas: DOM yorlig'ini har kadr ekranga
    //    proyeksiyalash kerak bo'lardi va u devor ortidan ham
    //    ko'rinib turardi.
    if (cfg.tags !== false) {
      const tag = _makeTag(_peerName(id));
      if (tag) {
        //  ⚠ Yorliq balandligi MODELGA moslanadi: qat'iy 1.35
        //    qo'ysak baland modelda yorliq ko'krakda turardi.
        try {
          const b = new THREE.Box3().setFromObject(g);
          const sz = new THREE.Vector3();
          b.getSize(sz);
          if (isFinite(sz.y) && sz.y > 0.1) tag.position.y = sz.y * 0.6 + 0.25;
        } catch (e) {}
        g.add(tag);
      }
    }

    //  ⚠ `_mpGhost` — `_` bilan: sahna bilan SAQLANMAYDI. Arvohlar
    //    ulanish holati, sahna mazmuni emas.
    g.userData = { _mpGhost: true, name: _peerName(id), id: -1 };
    g.name = '🌐 ' + _peerName(id);
    try { scene.add(g); } catch (e) {}
    return g;
  }

  // ============================================================
  //  📡 HODISA KO'PRIGI — hamma tizim uchun BITTA mexanizm
  // ------------------------------------------------------------
  //  Mahalliy o'yinchi amalni bajaradi va HODISANI e'lon qiladi,
  //  qolganlar uni takrorlaydi.
  //
  //  ⚠ NEGA BITTA MEXANIZM: 🎯 hitbox, 🔘 tugma, 👁 qarash,
  //    🗺 map loader, 🔊 sound blok — oltitasi uchun oltita
  //    alohida yo'l yozsak, ularning har biri o'z halqa
  //    qorovuli, o'z tozalash mantig'i bilan kelardi va biri
  //    tuzatilganda qolganlari eskirib qolardi.
  //
  //  ── 🔄 HALQA QOROVULI ─────────────────────────────
  //  ⚠ Kelgan hodisani takrorlayotganda tizim uni QAYTA e'lon
  //    qilmasligi kerak. Aks holda: A yuboradi → B takrorlaydi →
  //    B yuboradi → A takrorlaydi → … cheksiz.
  //    `replaying()` shu uchun — tizimlar uni so'raydi.
  //
  //  ── 👤 DUNYO / SHAXSIY ─────────────────────────
  //  ⚠ Hamma amal ham TARQATILMAYDI. 🎛 AllKey — SHAXSIY: u
  //    o'yinchining KLAVIATURASINI o'zgartiradi. Uni tarqatsak
  //    bir odam zonaga kirganda HAMMANING boshqaruvi buzilardi.
  //    Shuning uchun ro'yxat ATAYLAB aniq.
  // ============================================================
  const WORLD_EVENTS = {
    hitbox: true,      // 🎯 zona tetigi — eshik ochildi, platforma yurdi
    button: true,      // 🔘 tugma bosildi
    gaze:   true,      // 👁 qaraldi
    sound:  true,      // 🔊 ovoz bloki
    map:    true,      // 🗺 karta almashdi
    //  ⚠ SHAXSIY — tarqatilmaydi:
    //    allkey  — o'yinchining klaviaturasi
    //    hud     — o'yinchining ekrani
    //    camera  — o'yinchining kamerasi
  };

  let _replaying = false;
  const replaying = () => _replaying;

  /**
   * 📡 Hodisani boshqalarga e'lon qiladi.
   * @param {string} kind  'hitbox' | 'button' | 'gaze' | 'sound' | 'map'
   * @param {object} data  obyekt id va kerakli qo'shimchalar
   * @returns {boolean} yuborildimi
   */
  function fire(kind, data) {
    //  ⚠ TAKRORLAYOTGANDA jim — halqa qorovuli.
    if (_replaying) return false;
    //  ⚠ Ulanmagan bo'lsa jimgina `false` — yakka o'yin tarmoqqa
    //    bog'lanib qolmasin va chaqiruvchi shart yozishi shart emas.
    if (!isOn()) return false;
    if (!WORLD_EVENTS[kind]) return false;
    try { _net.send(Object.assign({ t: 'ev', k: kind }, data || {})); return true; }
    catch (e) { return false; }
  }

  /** Kelgan hodisani mahalliy takrorlaydi. */
  function _replay(m) {
    const kind = m && m.k;
    if (!kind || !WORLD_EVENTS[kind]) return;
    const o = (m.o != null) ? _byId(m.o) : null;
    //  ⚠ Obyekt topilmasa JIM o'tamiz, lekin SABABINI aytamiz:
    //    ikki o'yinchi boshqa sahnada bo'lsa aynan shu bo'ladi va
    //    sabab ko'rinmasa \"tugma ishlamayapti\" deb o'ylanardi.
    if (m.o != null && !o) {
      _log('⚠ Hodisa takrorlanmadi — obyekt #' + m.o + ' topilmadi (boshqa sahna?)', 'lw');
      return;
    }

    _replaying = true;
    try {
      if (kind === 'hitbox' && o && window.HitboxSystem && HitboxSystem.mpReplay) {
        HitboxSystem.mpReplay(o, m);
      } else if ((kind === 'button' || kind === 'gaze') && o &&
                 window.InteractiveButtonSystem && InteractiveButtonSystem.mpReplay) {
        InteractiveButtonSystem.mpReplay(o, m);
      } else if (kind === 'sound' && o &&
                 window.SoundBlockSystem && SoundBlockSystem.mpReplay) {
        SoundBlockSystem.mpReplay(o, m);
      } else if (kind === 'map' && o &&
                 window.MapLoaderSystem && MapLoaderSystem.mpReplay) {
        MapLoaderSystem.mpReplay(o, m);
      }
    } catch (e) {
      //  ⚠ Bir hodisadagi xato butun ulanishni yiqitmasin, lekin
      //    JIM ham qolmasin.
      _log('⚠ Hodisa xatosi (' + kind + '): ' + (e && e.message), 'lw');
    }
    //  ⚠ Bayroq `finally` EMAS, shu yerda: `try` ichida `return`
    //    yo'q va shunday aniqroq.
    _replaying = false;
  }

  // ============================================================
  //  🌍 DUNYO HOLATI — kim nimada, kim nimani ko'targan
  // ------------------------------------------------------------
  //  ⚠ NEGA OBYEKTNI KO'CHIRMAYMIZ: mashina va predmet
  //    DVIGATELNING fizikasi bilan yuradi. Ularni tarmoqdan
  //    kelgan joyga majburan qo'ysak fizika bilan urishib,
  //    titrab qolardi.
  //
  //    Shu bois FAQAT EGALIK sinxronlanadi: kim qaysi mashinada
  //    o'tirgan, kim nimani ko'targan. Mahalliy o'yinchi shu
  //    ma'lumotga qarab QARShI HARAKAT qiladi — masalan band
  //    mashinaga o'tirmaydi.
  //
  //  ⚠ EGALIK `_` bilan: sahna bilan saqlanmaydi. Bu o'yin
  //    borishi — saqlansak keyingi ochilishda mashina \"band\"
  //    bo'lib turardi.
  // ============================================================
  function _applyWorld(id, m) {
    try {
      // 🚗 Mashina egaligi
      const car = (m.c != null) ? _byId(m.c) : null;
      const prevCar = _own.car.get(id);
      if (prevCar && (!car || prevCar !== car)) {
        //  ⚠ Faqat O'ZIMIZNIKINI tozalaymiz: boshqa o'yinchi
        //    o'sha mashinaga o'tirgan bo'lsa belgini olib
        //    tashlamaymiz.
        if (prevCar.userData._mpOwner === id) delete prevCar.userData._mpOwner;
        _own.car.delete(id);
      }
      if (car) {
        car.userData._mpOwner = id;
        _own.car.set(id, car);
      }

      // ✋ Ko'tarib yurgan predmet
      const held = (m.h != null) ? _byId(m.h) : null;
      const prevHeld = _own.held.get(id);
      if (prevHeld && (!held || prevHeld !== held)) {
        if (prevHeld.userData._mpHeldBy === id) delete prevHeld.userData._mpHeldBy;
        _own.held.delete(id);
      }
      if (held) {
        held.userData._mpHeldBy = id;
        _own.held.set(id, held);
      }
    } catch (e) {}
  }

  function _byId(oid) {
    try {
      const list = (typeof objects !== 'undefined' && objects) ? objects : [];
      return list.find(o => o && o.userData && o.userData.id === oid) || null;
    } catch (e) { return null; }
  }

  /** Egalik belgilarini tozalaydi (uzilganda / o'yinchi chiqqanda). */
  function _clearOwn(id) {
    try {
      for (const map of [_own.car, _own.held]) {
        const o = map.get(id);
        if (o && o.userData) {
          if (o.userData._mpOwner === id) delete o.userData._mpOwner;
          if (o.userData._mpHeldBy === id) delete o.userData._mpHeldBy;
        }
        map.delete(id);
      }
    } catch (e) {}
  }

  const _own = { car: new Map(), held: new Map() };

  /**
   * 🚫 Obyekt BOSHQA o'yinchida bandmi.
   * ⚠ Dvigatel shu funksiyani so'raydi va band bo'lsa amalni
   *   bajarmaydi. Busiz ikki o'yinchi bitta rulga o'tirardi va
   *   mashina ikki tomonga tortilardi.
   */
  function busy(o) {
    if (!o || !o.userData) return false;
    if (!isOn()) return false;      // yakka o'yinda hech nima band emas
    const by = o.userData._mpOwner || o.userData._mpHeldBy;
    //  ⚠ O'ZIMIZNIKI band HISOBLANMAYDI — aks holda o'yinchi o'z
    //    mashinasidan chiqib, qayta o'tirolmasdi.
    return !!by && by !== _myId;
  }

  function _onState(m) {
    if (!m.id || m.id === _myId) return;
    let p = _peers.get(m.id);
    if (!p) {
      p = { obj: _makeGhost(m.id), name: _peerName(m.id),
            target: { x: 0, y: 0, z: 0, ry: 0 },
            //  ⚠ BIRINCHI holat SAKRAB qo'yiladi, silliq emas.
            //    Arvoh (0,0,0) da yaratiladi va birinchi xabar
            //    kelguncha o'sha yerda turadi. Silliq yetkazsak u
            //    SAHNA MARKAZIDAN o'yinchi tomon UCHIB borardi —
            //    har yangi o'yinchi kirganda ko'rinadigan g'alati
            //    harakat.
            fresh: true };
      _peers.set(m.id, p);
      _log('👤 ' + p.name + ' qo\'shildi', 'lok');
    }
    p.last = Date.now();
    const a = m.p || [];
    //  ⚠ NISHON saqlanadi, joylashuv TO'G'RIDAN yozilmaydi:
    //    tarmoq sekundiga 15 marta keladi, ekran esa 60 \u2014
    //    to'g'ridan yozsak arvoh sakrab yurardi. `update()` da
    //    silliq yetkaziladi.
    //  🌍 Egalik — har holat xabarida yangilanadi.
    _applyWorld(m.id, m);

    if (a.length >= 4) {
      //  ⚠ UZOQ SAKRASH ham silliq emas. Teleport, qayta tug'ilish
      //    yoki tarmoq uzilib-ulanganda nishon 50 m nariga ketadi.
      //    Silliq yetkazsak arvoh butun xarita bo'ylab bir soniya
      //    suzib borardi — o'yinchi esa allaqachon u yerda.
      const dx = a[0] - p.target.x, dy = a[1] - p.target.y, dz = a[2] - p.target.z;
      const far = (dx * dx + dy * dy + dz * dz) > (SNAP_DIST * SNAP_DIST);

      p.target.x = a[0]; p.target.y = a[1]; p.target.z = a[2]; p.target.ry = a[3];
      //  ⚡ Yangi nishon keldi — arvoh yana harakatlanishi kerak.
      p.snapped = false;

      if ((p.fresh || far) && p.obj) {
        p.obj.position.set(a[0], a[1], a[2]);
        p.obj.rotation.y = a[3];
        p.fresh = false;
      }
    }
    if (m.a !== undefined) p.anim = m.a;
  }

  /**
   * 🏷 Yorliqlarni ro'yxatdagi ismlarga moslaydi.
   * ⚠ Faqat O'ZGARGANLARI qayta chiziladi: har safar hammasini
   *   qayta yasasak kanvas va tekstura sekundiga bir necha marta
   *   yaratilib, xotira oqib ketardi.
   */
  /**
   * 🧬 Boshqa o'yinchining sahnasi bizникi bilan mos keladimi.
   * ⚠ Faqat BIR MARTA aytiladi: har holat xabarida tekshirsak
   *   konsol bir soniyada to'lib ketardi.
   */
  const _fpWarned = {};
  function _checkFp(m) {
    if (!m || !m.fp || m.id == null) return;
    const mine = sceneHash();
    if (!mine || m.fp === mine) return;
    if (_fpWarned[m.id]) return;
    _fpWarned[m.id] = 1;
    _log('⚠ "' + (m.name || m.id) + '" BOSHQA sahnada — joylashuvlar mos kelmaydi', 'lw');
  }

  function _syncTags() {
    for (const [id, p] of _peers) {
      //  💤 AFK yorliqda ko'rinadi — boshqalar tushunsin.
      const nm = _peerName(id) + (_afkSet.has(id) ? '  💤 AFK' : '');
      if (p.name === nm || !p.obj) continue;
      p.name = nm;
      p.obj.name = '🌐 ' + nm;
      if (p.obj.userData) p.obj.userData.name = nm;
      //  ⚠ Eski yorliq OLIB TASHLANADI va resursi bo'shatiladi —
      //    aks holda har ism o'zgarganda sahnada yangi sprite
      //    qo'shilib borardi.
      const old = p.obj.children.find(c => c.userData && c.userData._mpTag);
      if (old) {
        p.obj.remove(old);
        try { if (old.material.map) old.material.map.dispose(); old.material.dispose(); } catch (e) {}
      }
      const tag = _makeTag(nm);
      if (tag) p.obj.add(tag);
    }
  }

  function _removePeer(id) {
    const p = _peers.get(id);
    if (!p) return;
    //  ⚠ Egalik belgilari TOZALANADI: o'yinchi chiqib ketsa
    //    mashinasi MANGU band bo'lib qolardi va hech kim o'tira
    //    olmasdi.
    _clearOwn(id);
    try { if (p.obj && p.obj.parent) p.obj.parent.remove(p.obj); } catch (e) {}
    //  ⚠ GPU resursi bo'shatiladi: geometriya, material va yorliq
    //    teksturasi. Busiz uzoq sessiyada kirib-chiqqan har o'yinchi
    //    xotirada qolib ketardi — o'nlab kanvas va tekstura.
    try {
      p.obj.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (c.material.map) c.material.map.dispose();
          c.material.dispose();
        }
      });
    } catch (e) {}
    _peers.delete(id);
    _log('👤 ' + p.name + ' chiqdi', 'lw');
  }

  function _clearPeers() {
    for (const id of [..._peers.keys()]) _removePeer(id);
  }

  // ============================================================
  //  🔢 BALL — xonada umumiy
  // ------------------------------------------------------------
  //  ⚠ KIM HISOBLAYDI: o'yinchining BALLINI O'ZINING mijozi
  //    hisoblaydi (🎯 hitbox, 🔢 NoScript — hammasi joyida
  //    qoladi), keyin NATIJANI e'lon qiladi. Boshqalar uni FAQAT
  //    O'QIYDI.
  //
  //    Boshqacha qilib bo'lmasdi: ball dvigatelning o'nlab
  //    joyidan o'zgaradi (hitbox, tugma, qarash, predmet olish).
  //    Ularning hammasini serverga ko'chirish butun dvigatelni
  //    qayta yozish degani edi.
  //
  //  ⚠ Bu ALDOVGA QARSHI HIMOYA EMAS va shunday deb aytiladi:
  //    o'yinchi o'z ballini istagancha yozishi mumkin. Haqiqiy
  //    himoya vakolatli server talab qiladi.
  //
  //  ⚠ MULTIPLAYER O'CHIQ bo'lsa hech nima o'zgarmaydi — o'yin
  //    o'zi hisoblaydi va hech qayerga yozmaydi. Yakka o'yin
  //    tarmoqqa bog'lanib qolmasligi kerak.
  // ============================================================
  const _scores = new Map();      // id → { name, score }
  let _lastScore = null;

  const scores = () => [..._scores.entries()]
    .map(([id, v]) => ({ id, name: v.name, score: v.score }))
    .sort((a, b) => b.score - a.score);

  const scoreOf = (id) => {
    const v = _scores.get(id);
    return v ? v.score : null;
  };

  /** O'z ballimizni o'qish — 🔢 NoScript yoki `gameState`. */
  function _myScore() {
    try {
      const N = window.NoScriptSystem;
      if (N) {
        const nm = cfg.scoreSlot;
        if (nm) {
          const sl = N.slots().find(x =>
            String(x.name).toLowerCase() === String(nm).toLowerCase());
          if (sl) return +N.value(sl.id);
        }
        const v = +N.value();
        if (isFinite(v)) return v;
      }
      if (typeof gameState !== 'undefined' && gameState && isFinite(+gameState.score)) {
        return +gameState.score;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Boshqa o'yinchining ballini O'ZGARTIRISH.
   * ⚠ Xabar EGASIGA yuboriladi, u o'zida qo'llaydi va qayta e'lon
   *   qiladi. To'g'ridan yozsak ikki manba bo'lib, keyingi e'lon
   *   o'zgarishni bekor qilardi.
   */
  function scoreSet(id, value) {
    if (!isOn()) return false;
    _net.send({ t: 'score.set', to: id, v: +value || 0 });
    return true;
  }
  function scoreAdd(id, delta) {
    if (!isOn()) return false;
    _net.send({ t: 'score.add', to: id, v: +delta || 0 });
    return true;
  }

  /** O'z ballimizga qo'llash — 🔢 NoScript orqali. */
  function _applyScore(v, add) {
    try {
      const N = window.NoScriptSystem;
      if (N && N.set) {
        const nm = cfg.scoreSlot;
        let sid = null;
        if (nm) {
          const sl = N.slots().find(x =>
            String(x.name).toLowerCase() === String(nm).toLowerCase());
          if (sl) sid = sl.id;
        }
        const cur = (sid != null) ? +N.value(sid) : +N.value();
        const next = add ? (cur + v) : v;
        //  ⚠ `set` imzosi slotli va slotsiz — ikkalasi ham
        //    qo'llanadi, chunki dizayner slot ishlatmasligi mumkin.
        if (sid != null) N.set(sid, next); else N.set(next);
        return true;
      }
      if (typeof gameState !== 'undefined' && gameState) {
        gameState.score = add ? ((+gameState.score || 0) + v) : v;
        return true;
      }
    } catch (e) {}
    return false;
  }

  /** Har kadr: ball o'zgargan bo'lsa e'lon qilamiz. */
  function _pubScore() {
    //  ⚠ MULTIPLAYER O'CHIQ bo'lsa umuman tegmaymiz.
    if (!isOn() || cfg.scoreSync === false) return;
    const v = _myScore();
    if (v === null || v === _lastScore) return;
    _lastScore = v;
    _scores.set(_myId, { name: cfg.name || 'Player', score: v });
    try { _net.send({ t: 'score', v, name: cfg.name || 'Player' }); } catch (e) {}
  }

  // ============================================================
  //  💬 CHAT
  // ------------------------------------------------------------
  //  ⚠ KLAVIATURA MUAMMOSI (rejaning 9-bo'limi): chat maydoni
  //    ochilganda o'yinchi klavishlari BLOKLANISHI shart. Busiz
  //    \"salom\" deb yozayotganda `S` orqaga yurish, `L` esa
  //    boshqa amalni ishga tushirardi.
  //
  //    Dvigatelda buning MAVJUD mexanizmi bor — `_htmlKeyLock`.
  //    Yangi bayroq yasasak ikkisi bir-biriga xalaqit berardi.
  //
  //  ⚠ Xabarlar ADAPTER orqali ketadi, ya'ni 🖥 WebSocket va
  //    🔥 Firebase da bir xil ishlaydi.
  // ============================================================
  const _chatLog = [];       // { name, text, t }
  let _chatEl = null, _chatInp = null, _chatOpen = false;

  // ============================================================
  //  💤 AFK — harakatsiz o'yinchi
  // ------------------------------------------------------------
  //  ⚠ MAQSAD — TEJASH, ko'rinish emas: AFK o'yinchi hech kimga
  //    ta'sir qilmaydi, shu bois uni har kadr hisoblash bekor
  //    ish. Ko'p odamli xonada bu sezilarli farq beradi.
  //
  //  ⚠ IKKI TOMONLAMA:
  //    • AFK o'yinchini boshqalar render QILMAYDI
  //    • AFK o'yinchining o'zi boshqalarni render qilmaydi
  //
  //  ⚠ PERSONAJ JOYIDA QOLADI — yo'qolmaydi. O'yinchi qaytganda
  //    o'sha yerda turadi, aks holda u \"o'ldim\" deb o'ylardi.
  //
  //  ⚠ QIMIRLASHI BILAN qaytadi — buyruq yozishi shart emas.
  //    Klaviatura yoki sichqonchani kutish noto'g'ri bo'lardi:
  //    o'yinchi mashinada ketayotgan bo'lishi mumkin.
  // ============================================================
  const _afkSet = new Set();     // AFK dagi o'yinchilar (id)
  let _iAmAfk = false;
  let _lastMove = Date.now();
  let _afkManual = false;        // buyruq bilan qo'yilganmi

  const isAfk = (id) => (id == null ? _iAmAfk : _afkSet.has(id));

  /**
   * @param {boolean} on
   * @param {boolean} manual  buyruq bilanmi (avtomatik chiqmaydi)
   */
  function afk(on, manual) {
    on = !!on;
    if (_iAmAfk === on && _afkManual === !!manual) return false;
    _iAmAfk = on;
    _afkManual = on ? !!manual : false;
    if (!on) _lastMove = Date.now();
    //  ⚠ E'LON QILINADI: boshqalar bizni render qilmasligi va
    //    tepamizda 💤 ko'rishi uchun.
    try { if (isOn()) _net.send({ t: 'afk', v: on }); } catch (e) {}
    _syncTags();
    return true;
  }

  /** Har kadr: harakatni kuzatadi va vaqti kelsa AFK qo'yadi. */
  function _afkTick() {
    if (!isOn() || cfg.afkMinutes <= 0) return;
    const o = (typeof playerMesh !== 'undefined' && playerMesh) ||
              (window.PlayerController && window.PlayerController.obj);
    if (!o) return;

    //  ⚠ `_lastSent` dan foydalanamiz: u ALLAQACHON \"qimirladimi\"
    //    ni bilади. Ikkinchi tekshiruv yozsak ikkisi bir-biridan
    //    farq qilib qolardi.
    const moved = !_lastSent ||
      Math.abs(o.position.x - _lastSent[0]) > MOVE_EPS ||
      Math.abs(o.position.z - _lastSent[2]) > MOVE_EPS ||
      Math.abs(o.rotation.y - _lastSent[3]) > TURN_EPS;

    if (moved) {
      _lastMove = Date.now();
      //  ⚠ QO'LDA qo'yilgan AFK avtomatik CHIQMAYDI: o'yinchi
      //    ataylab qo'ygan va tasodifiy qimirlash uni bekor
      //    qilmasligi kerak.
      if (_iAmAfk && !_afkManual) afk(false, false);
      return;
    }
    if (!_iAmAfk && (Date.now() - _lastMove) > cfg.afkMinutes * 60000) {
      afk(true, false);
      _chatAdd('⚙', 'AFK rejimiga o\'tdingiz (' + cfg.afkMinutes + ' daq harakatsiz)');
    }
  }

  // ============================================================
  //  ⌨ CHAT BUYRUQLARI
  // ------------------------------------------------------------
  //  ⚠ Buyruq YUBORILMAYDI, MAHALLIY bajariladi. Faqat NATIJASI
  //    (xabar) tarmoqqa ketadi. Buyruqning o'zini yuborsak har
  //    mijoz uni qayta bajarib, `/leave` hammani chiqarib
  //    yuborardi.
  //
  //  ⚠ KANAL xabar bilan BIRGA ketadi (`ch`), ro'yxat sifatida
  //    emas. Server rele — u kimga yuborishni bilmaydi va
  //    filtrlash MIJOZDA bo'ladi.
  //
  //    ⚠ Bu SIR EMAS: xabar hamma mijozga yetadi, faqat
  //      ko'rsatilmaydi. Haqiqiy maxfiylik vakolatli server
  //      talab qiladi va buni panel ochiq aytadi.
  // ============================================================
  //  Kanal: null = global, {to:[id…]} = tanlanganlar
  let _channel = null;
  let _invites = new Map();      // taklif qilgan id → a'zolar

  const CMDS = [
    ['/help', 'buyruqlar ro\'yxati'],
    ['/list', 'o\'yinchilar ro\'yxati'],
    ['/top', 'eng balandi 10 ta'],
    ['/chat <nik>', 'ikkalangiz ko\'rasiz, boshqalar KO\'RADI lekin siz ularni ko\'rmaysiz'],
    ['/private-chat <nik>', 'faqat ikkalangiz ko\'rasiz'],
    ['/private-group <nik> …', 'guruh yasab taklif qiladi'],
    ['/join', 'taklifni qabul qilish'],
    ['/leave', 'global chatga qaytish'],
    ['/afk', 'afk rejimi — sizni render qilmaydi'],
    ['/afk leave', 'afk dan chiqish'],
    ['/engine', 'APEX versiyasi'],
  ];

  function _findByNick(nick) {
    const n = String(nick || '').toLowerCase();
    const r = _roster.find(x => String(x.name).toLowerCase() === n);
    return r ? r.id : null;
  }

  /** @returns {boolean} buyruq edimi (ha → xabar yuborilmaydi) */
  function _command(raw) {
    const parts = String(raw).trim().split(/\s+/);
    const c = parts[0].toLowerCase();
    if (c[0] !== '/') return false;
    const sys = (txt) => _chatAdd('⚙', txt);

    if (c === '/help') {
      sys('Buyruqlar:');
      for (const [k, d] of CMDS) sys('  ' + k + ' — ' + d);
      return true;
    }
    if (c === '/engine') {
      sys('APEX3D — ' + (window.__APEX_BUILD__ || 'muharrir') +
          ' · multiplayer: ' + (isOn() ? 'ulangan' : 'ulanmagan'));
      return true;
    }
    if (c === '/list') {
      //  ⚠ O'ZIMIZ ham ro'yxatda: dizayner \"men qayerdaman?\" deb
      //    o'ylamasin.
      sys('Xonada ' + _roster.length + ' ta:');
      for (const r of _roster) {
        sys('  ' + r.name + (r.id === _myId ? '  ← siz' : '') +
            (_afkSet.has(r.id) ? '  💤' : ''));
      }
      return true;
    }
    if (c === '/top') {
      const rows = scores().slice(0, 10);
      if (!rows.length) { sys('Ball yo\'q'); return true; }
      sys('Eng balandi:');
      rows.forEach((r, i) => sys('  ' + (i + 1) + '. ' + r.name + ' — ' + r.score));
      return true;
    }
    if (c === '/afk') {
      if ((parts[1] || '').toLowerCase() === 'leave') { afk(false, true); sys('AFK dan chiqdingiz'); }
      else { afk(true, true); sys('AFK rejimi — chiqish uchun /afk leave'); }
      return true;
    }
    if (c === '/leave') {
      _channel = null;
      sys('Global chatga qaytdingiz');
      return true;
    }
    if (c === '/join') {
      //  ⚠ ENG OXIRGI taklif qabul qilinadi: bir nechta taklif
      //    kelsa qaysi biri degan savol tug'ilardi.
      const last = [..._invites.entries()].pop();
      if (!last) { sys('Taklif yo\'q'); return true; }
      _channel = { to: last[1].slice(), priv: true };
      sys('Guruhga qo\'shildingiz (' + last[1].length + ' a\'zo)');
      return true;
    }
    if (c === '/chat' || c === '/private-chat') {
      const id = _findByNick(parts[1]);
      if (!id) { sys('O\'yinchi topilmadi: ' + (parts[1] || '')); return true; }
      _channel = { to: [id, _myId], priv: (c === '/private-chat') };
      sys((c === '/private-chat' ? 'Maxfiy suhbat: ' : 'Suhbat: ') + parts[1] +
          '  — chiqish uchun /leave');
      return true;
    }
    if (c === '/private-group') {
      const ids = [_myId];
      const bad = [];
      for (const nk of parts.slice(1)) {
        const id = _findByNick(nk);
        if (id) ids.push(id); else bad.push(nk);
      }
      if (ids.length < 2) { sys('Hech kim topilmadi'); return true; }
      if (bad.length) sys('Topilmadi: ' + bad.join(', '));
      _channel = { to: ids, priv: true };
      //  ⚠ Taklif XABAR sifatida ketadi: qabul qiluvchi `/join`
      //    yozguncha kanalga KIRMAYDI. Majburan qo'shsak o'yinchi
      //    o'zi bilmagan suhbatga tushib qolardi.
      try {
        _net.send({ t: 'invite', to: ids, name: cfg.name || 'Player' });
      } catch (e) {}
      sys('Guruh yasaldi (' + ids.length + ') — ular /join yozishi kerak');
      return true;
    }
    sys('Noma\'lum buyruq: ' + c + '  — /help');
    return true;
  }

  /**
   * 👤 Nikni xonaga e'lon qiladi.
   * ⚠ `join` QAYTA YUBORILADI: server/Firebase nomni o'sha
   *   xabardan oladi va boshqa yo'l yo'q. Qayta ULANISH esa
   *   ortiqcha bo'lardi — arvohlar yo'qolib, qaytadan paydo
   *   bo'lardi.
   */
  function renameSelf(name) {
    const v = String(name || '').trim().slice(0, 20);
    if (!v || !isOn()) return false;
    cfg.name = v;
    //  ⚠ O'z yozuvimizni ham yangilaymiz: ro'yxatda eski nom
    //    turib qolardi.
    const me = _roster.find(x => x.id === _myId);
    if (me) me.name = v;
    const sc = _scores.get(_myId);
    if (sc) sc.name = v;
    try { _net.send({ t: 'join', room: cfg.room || 'apex', name: v,
                      uid: cfg.uid || '', fp: sceneHash() }); } catch (e) {}
    _syncTags();
    _paint();
    return true;
  }

  function chatSend(text) {
    const t = String(text || '').trim();
    if (!t) return false;
    //  ⌨ Buyruqmi — mahalliy bajariladi, yuborilmaydi.
    if (t[0] === '/') return _command(t);
    //  ⚠ UZUNLIK CHEKLANADI: uzun xabar ekranni to'ldirardi va
    //    Firebase da trafikni bekorga oshirardi.
    const msg = t.slice(0, 200);
    if (!_net || !_net.isOpen()) { _log('⚠ Ulanmagansiz', 'lw'); return false; }
    const out = { t: 'chat', text: msg, name: cfg.name || 'Player' };
    //  ⚠ KANAL xabar bilan BIRGA: server rele va u kimga
    //    yuborishni bilmaydi.
    if (_channel) { out.ch = _channel.to.slice(); out.pv = !!_channel.priv; }
    _net.send(out);
    //  ⚠ O'Z xabarimizni O'ZIMIZ ko'rsatamiz: server uni bizga
    //    qaytarmaydi (🔥 Firebase da ham `from === myId` tashlanadi)
    //    va yozgan odam o'z xabarini ko'rmasdi.
    _chatAdd(cfg.name || 'Siz', msg);
    return true;
  }

  function _chatAdd(name, text) {
    _chatLog.push({ name, text, t: Date.now() });
    //  ⚠ Tarix CHEKLANADI: uzoq sessiyada ro'yxat cheksiz o'sardi.
    //  ⚠ Chegara DIZAYNERNIKI, lekin pastki va yuqori chek bor:
    //    0 qo'yilsa chat butunlay ishlamasdi, 100000 qo'yilsa
    //    xotira to'lardi.
    const lim = Math.max(1, Math.min(500, +cfg.chatHistory || 20));
    if (_chatLog.length > lim) _chatLog.splice(0, _chatLog.length - lim);
    _chatPaint();
  }

  /** ⏹ Stop da chat panelini yashiradi (o'chirmaydi — tarix qoladi). */
  function _hideChat() {
    if (_chatEl) _chatEl.style.display = 'none';
  }

  /**
   * 💬 Chat KO'RINADIMI.
   * ⚠ Ikki alohida bayroq:
   *   `cfg.chat`            — DIZAYNER yoqqanmi (sahna bilan saqlanadi)
   *   `window._mpChatMuted` — O'YINCHI o'chirganmi (⏸ pauza menyusi)
   * Bittasiga birlashtirsak: o'yinchi chatni o'chirganda dizaynerning
   * sahnasi ham o'zgarib ketardi va eksportda chat butunlay yo'qolardi.
   */
  function _chatOn() {
    if (!cfg.chat) return false;
    try { if (window._mpChatMuted) return false; } catch (e) {}
    return true;
  }

  function _chatPaint() {
    if (!_chatOn()) { _hideChat(); return; }
    if (_chatEl) _chatEl.style.display = '';
    if (typeof document === 'undefined') return;
    if (!_chatEl) {
      _chatEl = document.createElement('div');
      _chatEl.id = 'mp-chat';
      //  ⚠ `pointer-events:none` — chat sichqonchani to'smasin.
      //    Maydon ochilganda unga alohida ruxsat beriladi.
      _chatEl.style.cssText =
        'position:absolute;left:14px;bottom:96px;z-index:59;pointer-events:none;' +
        "font-family:'Share Tech Mono',monospace;font-size:11px;line-height:1.6;" +
        'max-width:min(420px,42%)';
      (document.getElementById('cvp') || document.body).appendChild(_chatEl);
    }
    const now = Date.now();
    const fade = (+cfg.chatFade > 0) ? +cfg.chatFade * 1000 : 0;
    const esc = (v) => String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    //  ⚠ IKKI XIL CHEGARA:
    //    ochiq  → `chatHistory` (o'yinchi tarixni o'qiyapti)
    //    yopiq  → `chatVisible` (ekranni to'smasin)
    //  Bittasini ishlatsak: ko'p bo'lsa o'yin ko'rinmasdi, kam
    //  bo'lsa tarix o'qib bo'lmasdi.
    const nMax = _chatOpen
      ? Math.max(1, Math.min(500, +cfg.chatHistory || 20))
      : Math.max(1, Math.min(50, +cfg.chatVisible || 5));

    //  ⚠ Eskilari SO'NADI, lekin maydon OCHIQ bo'lsa so'nish
    //    ishlamaydi — o'yinchi ataylab tarixni o'qiyapti.
    const rows = _chatLog.filter(m => _chatOpen || !fade || (now - m.t) < fade);
    const fs = Math.max(7, Math.min(28, +cfg.chatFontSize || 11));
    _chatEl.style.fontSize = fs + 'px';

    //  🎨 Dizayner CSS i BIR MARTA qo'shiladi: har chizishda
    //  ⚠ qo'shsak `<style>` teglari yig'ilib borardi.
    if (cfg.chatCss && !document.getElementById('mp-chat-css')) {
      const st = document.createElement('style');
      st.id = 'mp-chat-css';
      st.textContent = cfg.chatCss;
      document.head.appendChild(st);
    }

    _chatEl.innerHTML = rows.slice(-nMax).map(m =>
      `<div class="mp-chat-row" style="text-shadow:0 1px 3px #000">
         <span class="mp-chat-name" style="color:#4de2c8">${esc(m.name)}:</span>
         <span class="mp-chat-text" style="color:#e8f0ee">${esc(m.text)}</span></div>`).join('');
  }

  function chatToggle(open) {
    if (typeof document === 'undefined') return;
    //  ⚠ O'CHIRILGAN bo'lsa faqat YOPISH ruxsat etiladi — aks
    //    holda `T` bosilganda maydon baribir ochilardi.
    if (!_chatOn() && open !== false) return;
    const want = (open === undefined) ? !_chatOpen : !!open;
    if (want === _chatOpen) return;
    _chatOpen = want;

    if (!want) {
      if (_chatInp) { _chatInp.remove(); _chatInp = null; }
      //  ⚠ Qulf OCHILADI — aks holda o'yinchi butunlay harakatsiz
      //    qolardi va sababini topolmasdi.
      window._htmlKeyLock = false;
      _chatPaint();
      return;
    }

    _chatPaint();
    window._htmlKeyLock = true;
    _chatInp = document.createElement('input');
    _chatInp.id = 'mp-chat-input';
    _chatInp.maxLength = 200;
    _chatInp.placeholder = 'Xabar…  (Enter — yuborish, Esc — bekor)';
    _chatInp.style.cssText =
      'position:absolute;left:14px;bottom:64px;z-index:60;width:min(420px,42%);' +
      "font-family:'Share Tech Mono',monospace;font-size:12px;padding:7px 10px;" +
      'border-radius:4px;border:1px solid rgba(0,255,190,.4);' +
      'background:rgba(6,10,16,.94);color:#e8f0ee;outline:none';
    //  ⚠ Hodisa PASTGA O'TMAYDI: busiz har harf o'yinga ham
    //    tushib, personaj yurib ketardi.
    _chatInp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Enter' || e.key === 'Enter') {
        const v = _chatInp.value;
        chatToggle(false);
        chatSend(v);
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        chatToggle(false);
      }
    }, true);
    (document.getElementById('cvp') || document.body).appendChild(_chatInp);
    //  ⚠ Fokus KEYINGI kadrda: darhol bersak ochgan klavish
    //    (`T`) maydonga tushib qolardi.
    setTimeout(() => { try { _chatInp && _chatInp.focus(); } catch (e) {} }, 0);
  }

  /** Klavish — o'yinchi tinglovchisidan chaqiriladi. */
  function onKey(code) {
    if (!_playing() || !_chatOn() || !isOn()) return false;
    if (_chatOpen) return false;               // maydon o'zi hal qiladi
    if (code !== (cfg.chatKey || 'KeyT')) return false;
    chatToggle(true);
    return true;
  }

  // ============================================================
  //  🧱 TO'QNASHUV — arvohlar qattiq
  // ------------------------------------------------------------
  //  ⚠ Arvohlar `objects` GA QO'SHILMAYDI (reja, 4-bo'lim): u yerga
  //    qo'shsak ular 🗂 ierarxiyada ko'rinardi, saqlashga tushardi
  //    va dizayner ularni o'chirishga urinib ko'rardi.
  //
  //    Shu bois dvigatelning o'z kollayder tizimi ularni ko'rmaydi
  //    va biz to'qnashuvni O'ZIMIZ hisoblaymiz.
  //
  //  ⚠ SILINDR-SILINDR itarish — to'liq fizika emas. Sabab: arvoh
  //    HAQIQIY jism emas, u tarmoqdan kelgan joylashuv. Unga kuch
  //    qo'llasak keyingi tarmoq xabari uni baribir orqaga tortardi
  //    va o'yinchi titrab qolardi. Faqat O'YINCHINI itaramiz.
  //
  //  ⚠ Y bo'yicha tekshirilmaydi: o'yinchi arvoh USTIGA chiqa
  //    olsin (mashina tepasiga, tomga). Faqat gorizontal.
  // ============================================================
  function _solve() {
    if (!cfg.solid || !_peers.size) return;
    const o = (typeof playerMesh !== 'undefined' && playerMesh) ||
              (window.PlayerController && window.PlayerController.obj);
    if (!o) return;

    //  ⚠ O'yinchi radiusi ham hisobga olinadi — qat'iy son qo'ysak
    //    katta personaj arvohga kirib ketardi.
    const pr = _playerRadius(o);
    const gr = (+cfg.ghostRadius > 0) ? +cfg.ghostRadius : 0.45;
    const minD = pr + gr;
    const minD2 = minD * minD;

    for (const [, p] of _peers) {
      if (!p.obj) continue;
      const dx = o.position.x - p.obj.position.x;
      const dz = o.position.z - p.obj.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= minD2) continue;

      //  ⚠ AYNAN USTMA-UST tushsa yo'nalish yo'q (0/0 = NaN).
      //    Bunday holat ikki o'yinchi bir vaqtda spawn bo'lganda
      //    bo'ladi — tasodifiy tomonga itaramiz.
      let d = Math.sqrt(d2);
      let nx, nz;
      if (d < 1e-4) {
        const a = Math.random() * Math.PI * 2;
        nx = Math.cos(a); nz = Math.sin(a); d = 0;
      } else {
        nx = dx / d; nz = dz / d;
      }
      const push = minD - d;
      o.position.x += nx * push;
      o.position.z += nz * push;

      //  ⚠ Tezlik ham to'xtatiladi: busiz o'yinchi devorga
      //    bosilgandek titrab turardi — har kadr itarilib, keyin
      //    tezlik uni qaytadan ichkariga tortardi.
      try {
        const pc = window.PlayerController;
        if (pc && pc.vel) {
          const dot = pc.vel.x * nx + pc.vel.z * nz;
          if (dot < 0) { pc.vel.x -= nx * dot; pc.vel.z -= nz * dot; }
        }
      } catch (e) {}
    }
  }

  function _playerRadius(o) {
    try {
      //  Cache: har kadr `Box3` hisoblash qimmat.
      if (o.__mpR != null) return o.__mpR;
      const b = new THREE.Box3().setFromObject(o);
      const sz = new THREE.Vector3();
      b.getSize(sz);
      o.__mpR = Math.max(0.2, Math.min(1.5, Math.max(sz.x, sz.z) / 2));
      return o.__mpR;
    } catch (e) { return 0.4; }
  }

  // ============================================================
  //  📍 SPAWN — hamma bir joyda paydo bo'lmasin
  // ------------------------------------------------------------
  //  ⚠ Hammasi (0,0,0) da paydo bo'lsa bir-birining ichida turardi
  //    va to'qnashuv ularni birinchi kadrda uloqtirib yuborardi.
  //
  //  ⚠ Joy INDEKS bo'yicha, tasodifiy EMAS: tasodif bilan ikki
  //    o'yinchi baribir bir joyga tushishi mumkin edi.
  // ============================================================
  function spawnFor(idx) {
    const mode = cfg.spawnMode || 'ring';
    if (mode === 'none') return null;

    if (mode === 'points') {
      //  📍 1️⃣ QO'LDA yozilgan nuqtalar — ular USTUN.
      //  ⚠ Dizayner ataylab koordinata yozgan bo'lsa, sahnadagi
      //    🧍 bloklar uni bekor qilmasligi kerak.
      try {
        const pts = Array.isArray(cfg.spawnPoints) ? cfg.spawnPoints : [];
        const ok = pts.filter(p => p && isFinite(+p.x) && isFinite(+p.z));
        if (ok.length) {
          const p = ok[idx % ok.length];
          return { x: +p.x, y: +p.y || 0, z: +p.z };
        }
      } catch (e) {}

      //  🧍 2️⃣ Sahnadagi spawn bloklari.
      try {
        const pts = (typeof objects !== 'undefined' ? objects : [])
          .filter(o => o && o.userData &&
            (o.userData.isPlayerSpawn || o.userData.type === 'Player'));
        if (pts.length) {
          const p = pts[idx % pts.length];
          return { x: p.position.x, y: p.position.y, z: p.position.z };
        }
      } catch (e) {}
      //  ⚠ Nuqta YO'Q bo'lsa doiraga tushamiz — dizayner nuqta
      //    qo'yishni unutsa o'yin buzilmasin.
    }

    // ⭕ Doira bo'ylab
    const r = (+cfg.spawnRadius > 0) ? +cfg.spawnRadius : 4;
    const n = Math.max(1, _roster.length || 1);
    const a = (idx % Math.max(n, 4)) * (Math.PI * 2 / Math.max(n, 4));
    return { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r };
  }

  /** O'yinchini o'z joyiga qo'yadi (ulanish paytida bir marta). */
  function _placeSelf() {
    if ((cfg.spawnMode || 'ring') === 'none') return false;
    const o = (typeof playerMesh !== 'undefined' && playerMesh) ||
              (window.PlayerController && window.PlayerController.obj);
    if (!o) return false;
    //  ⚠ Indeks RO'YXATDAN: server bergan tartib hammada bir xil,
    //    ya'ni ikki o'yinchi bir nuqtaga tushmaydi.
    const idx = Math.max(0, _roster.findIndex(x => x.id === _myId));
    const p = spawnFor(idx < 0 ? 0 : idx);
    if (!p) return false;
    //  ⚠ `y` TEGILMAYDI: dvigatel o'yinchini yerga qo'ygan va biz
    //    uni havoga ko'tarsak yoki yerga botirsak fizika buzilardi.
    o.position.x = p.x;
    o.position.z = p.z;
    return true;
  }

  // ============================================================
  //  🔁 Kadr
  // ============================================================
  let _acc = 0;
  let _was = false;

  function update(delta) {
    const p = _playing();
    if (p !== _was) {
      _was = p;
      // ============================================================
      //  ⚠ ⏹ Stop da UZILMAYDI — faqat ARVOHLAR yashiriladi
      // ------------------------------------------------------------
      //  Ilgari ⏹ Stop bosilganda ulanish UZILARDI. Natijada:
      //    • dizayner sinov uchun ⏹/▶ bosganda har safar qaytadan
      //      ulanardi — va 🔥 Firebase da har ulanish yangi `push`
      //      kaliti, ya'ni xonada \"arvoh o'yinchilar\" to'planardi;
      //    • chat tarixi yo'qolardi;
      //    • boshqa o'yinchi uchun siz kirib-chiqib turardingiz.
      //
      //  Endi ulanish TIRIK qoladi. Uzilish faqat:
      //    • 🌐 Multiplayer menyusida \"Uzish\" bosilsa
      //    • sahifa yopilsa (🔥 Firebase `onDisconnect` o'zi tozalaydi)
      //
      //  ⚠ Arvohlar MUHARRIRDA yashiriladi: ular sahna obyekti emas
      //    va dizayner ularni tanlashga urinib ko'rardi.
      // ============================================================
      if (!p) {
        for (const [, pr] of _peers) if (pr.obj) pr.obj.visible = false;
        //  ⚠ Chat maydoni ham yopiladi — ochiq qolsa `_htmlKeyLock`
        //    yoniq turib muharrirda klavishlar ishlamasdi.
        chatToggle(false);
        _hideChat();
      } else {
        for (const [, pr] of _peers) if (pr.obj) pr.obj.visible = true;
        _chatPaint();
        if (cfg.autoJoin && !isOn() && _status !== 'connecting') connect();
      }
      return;
    }
    if (!p || !isOn()) return;

    //  🧱 To'qnashuv — arvohlar silliq yetkazilgandan KEYIN
    //  hisoblanadi (pastda), aks holda o'yinchi bir kadr eski
    //  joyga nisbatan itarilardi.

    // ── O'z holatimizni yuborish ──
    _acc += (delta || 0.016);
    const step = 1 / Math.max(1, cfg.rate);
    if (_acc >= step) {
      _acc = 0;
      _sendState();
    }

    // ── Arvohlarni silliq yetkazish ──
    //  ⚠ `delta` ga bog'liq koeffitsient: qat'iy 0.2 qo'ysak
    //    FPS o'zgarganda silliqlik ham o'zgarardi (60 da boshqa,
    //    144 da boshqa).
    const k = Math.min(1, (delta || 0.016) * 12);
    const now = Date.now();
    for (const [id, pr] of _peers) {
      if (!pr.obj) continue;
      //  💤 AFK o'yinchi HISOBLANMAYDI — na o'zi, na boshqalar.
      //  ⚠ Personaj JOYIDA qoladi: `continue` faqat hisobni
      //    o'tkazib yuboradi, obyektni o'chirmaydi.
      if (_iAmAfk || _afkSet.has(id)) {
        if (pr.last && now - pr.last > 60000) _removePeer(id);
        continue;
      }

      // ============================================================
      //  ⚡ YETGAN ARVOHGA TEGMAYMIZ
      // ------------------------------------------------------------
      //  ⚠ Ilgari HAR KADR `position` va `rotation` yozilardi —
      //    o'yinchi qimirlamay tursa ham. Har yozuv three.js da
      //    obyektning matritsasini \"iflos\" deb belgilaydi va u
      //    keyingi kadrda QAYTA hisoblanadi (bolalari bilan birga).
      //
      //    Bitta arvoh uchun bu ko'p emas, lekin model murakkab
      //    bo'lsa (o'nlab bo'g'in) har kadr butun ierarxiya qayta
      //    yuriladi — FPS aynan shu yerda tushardi.
      //
      //  ⚠ Chegara KO'Z ILG'AMAYDIGAN darajada kichik: 1 mm va
      //    0.1°. Kattaroq qo'ysak arvoh sakrab-sakrab yurardi.
      const dx = pr.target.x - pr.obj.position.x;
      const dy = pr.target.y - pr.obj.position.y;
      const dz = pr.target.z - pr.obj.position.z;
      let dr = pr.target.ry - pr.obj.rotation.y;
      while (dr >  Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;

      const still = Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001 &&
                    Math.abs(dz) < 0.001 && Math.abs(dr) < 0.002;

      if (still) {
        //  ⚠ YETGAN deb hisoblaymiz va AYNAN nishonga qo'yamiz —
        //    bir marta. Busiz qoldiq masofa mangu qolib, har kadr
        //    kichik yozuv bo'laverardi.
        if (!pr.snapped) {
          pr.obj.position.set(pr.target.x, pr.target.y, pr.target.z);
          pr.obj.rotation.y = pr.target.ry;
          pr.snapped = true;
        }
        //  ⚠ Jim qolgan o'yinchi tekshiruvi SHU YERDA ham kerak —
        //    aks holda qimirlamay turgan arvoh hech qachon
        //    tozalanmasdi.
        if (pr.last && now - pr.last > 10000) _removePeer(id);
        continue;
      }
      pr.snapped = false;

      pr.obj.position.x += dx * k;
      pr.obj.position.y += dy * k;
      pr.obj.position.z += dz * k;
      //  ⚠ Burchak QISQA yo'ldan: to'g'ridan interpolatsiya qilsak
      //    179° → −179° o'tishda arvoh butun doira aylanardi.
      //    (`dr` yuqorida allaqachon qisqartirilgan.)
      pr.obj.rotation.y += dr * k;
      //  ⚠ Jim qolgan o'yinchi TOZALANADI: brauzer yopilib
      //    `close` yetib kelmasligi mumkin va arvoh mangu qolardi.
      if (pr.last && now - pr.last > 10000) _removePeer(id);
    }

    //  🧱 Endi itaramiz — arvohlar YANGI joyida.
    _solve();

    //  💤 AFK kuzatuvi.
    _afkTick();

    //  🔢 Ball o'zgargan bo'lsa e'lon qilamiz.
    //  ⚠ Har kadr TEKSHIRILADI, lekin faqat O'ZGARGANDA yuboriladi —
    //    tekshiruv arzon (bitta son), yuborish esa qimmat.
    _pubScore();
  }

  //  ⚡ O'zgarish CHEGARALARI.
  //  ⚠ `0.02` m — ko'z ilg'amaydigan siljish, lekin suzuvchi son
  //    xatosidan katta. Kichikroq qo'ysak o'yinchi turganda ham
  //    \"qimirladi\" deb hisoblanardi.
  //  ⚠ Burchak uchun alohida chegara: 0.01 rad ≈ 0.6°.
  const MOVE_EPS = 0.02;
  const TURN_EPS = 0.01;
  const HEARTBEAT = 2000;     // ms — qimirlamasa ham shuncha vaqtda bir marta

  let _lastSent = null, _lastSentAt = 0, _lastCar, _lastAnim;

  function _sendState() {
    const o = (typeof playerMesh !== 'undefined' && playerMesh) ||
              (window.PlayerController && window.PlayerController.obj);
    if (!o || !_net || !_net.isOpen()) return;
    const msg = {
      t: 'state',
      //  ⚠ Massiv, obyekt EMAS: `{x:..,y:..}` uch barobar ko'p joy
      //    egallaydi va sekundiga 15 marta yuboriladi.
      p: [ +o.position.x.toFixed(2), +o.position.y.toFixed(2),
           +o.position.z.toFixed(2), +o.rotation.y.toFixed(2) ],
    };
    try {
      const car = (typeof carInside !== 'undefined' && carInside &&
                   typeof activeCar !== 'undefined' && activeCar);
      if (car) msg.c = activeCar.userData.id;
    } catch (e) {}

    //  ✋ Ko'tarib yurgan predmet — busiz boshqa o'yinchi uni
    //  ⚠ yerda yotgan holda ko'rardi va olishga urinardi.
    try {
      const held = (window.GravityGunSystem && GravityGunSystem.held &&
                    GravityGunSystem.held()) ||
                   (window.InventorySystem && InventorySystem.carried &&
                    InventorySystem.carried()) || null;
      if (held && held.userData && held.userData.id != null) msg.h = held.userData.id;
    } catch (e) {}
    // ============================================================
    //  ⚡ FAQAT O'ZGARGANDA YUBORAMIZ
    // ------------------------------------------------------------
    //  ⚠ Ilgari holat SEKUNDIGA 15 MARTA yuborilardi — o'yinchi
    //    qimirlamay tursa ham. Ikkala tomonda ham:
    //      • 🔥 Firebase ga bekorga yozuv (narx TRAFIKKA bog'liq)
    //      • qabul qiluvchida har xabar → `_onState` → arvoh
    //        matritsasi qayta hisoblanardi
    //
    //  ⚠ YURAK URISHI qoladi: 2 soniyada bir marta baribir
    //    yuboriladi. Busiz KEYIN kirgan o'yinchi qimirlamay turgan
    //    odamni UMUMAN ko'rmasdi — uning holati hech qachon
    //    kelmasdi.
    // ============================================================
    const now = Date.now();
    const moved = !_lastSent ||
      Math.abs(msg.p[0] - _lastSent[0]) > MOVE_EPS ||
      Math.abs(msg.p[1] - _lastSent[1]) > MOVE_EPS ||
      Math.abs(msg.p[2] - _lastSent[2]) > MOVE_EPS ||
      Math.abs(msg.p[3] - _lastSent[3]) > TURN_EPS ||
      msg.c !== _lastCar ||
      msg.a !== _lastAnim;

    if (!moved && (now - _lastSentAt) < HEARTBEAT) return;

    _lastSent = msg.p.slice();
    _lastCar = msg.c;
    _lastAnim = msg.a;
    _lastSentAt = now;
    try { _net.send(msg); } catch (e) {}
  }

  function _paint() {
    try { if (window._mpPaint) window._mpPaint(); } catch (e) {}
  }

  // ============================================================
  //  💾 Saqlash
  // ------------------------------------------------------------
  //  ⚠ Faqat SOZLAMA saqlanadi. Ulanish holati, arvohlar va
  //    ro'yxat — o'yin borishi.
  // ============================================================
  function serialize() { return { cfg: JSON.parse(JSON.stringify(cfg)) }; }
  function restore(d) {
    if (d && d.cfg) Object.assign(cfg, d.cfg);
  }

  // ============================================================
  //  🚪 SAHIFA YOPILGANDA — toza uzilish
  // ------------------------------------------------------------
  //  ⚠ 🔥 Firebase da `onDisconnect` SERVERDA ishlaydi va bir necha
  //    soniya kechikishi mumkin. Sahifa yopilishidan oldin O'ZIMIZ
  //    uzsak boshqa o'yinchilar bizni DARHOL ko'rmay qoladi.
  //
  //  ⚠ `pagehide` ISHLATILADI, `beforeunload` emas: mobil
  //    brauzerlarda ikkinchisi ko'pincha umuman chaqirilmaydi.
  try {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', () => {
        try { if (_net) _net.disconnect(); } catch (e) {}
      });
    }
  } catch (e) {}

  return { cfg, connect, disconnect, update, status, myId, roster, peers,
           isOn, serialize, restore, sceneHash,
           spawnFor, _solve, _placeSelf,
           chatSend, chatToggle, onKey, chatLog: () => _chatLog.slice(),
           scores, scoreOf, scoreSet, scoreAdd, _myScore, _applyScore, _pubScore,
           busy, _applyWorld, _clearOwn, owners: () => _own,
           fire, replaying, WORLD_EVENTS, _replay,
           afk, isAfk, CMDS, _command, _afkTick, channel: () => _channel,
           renameSelf };
})();
