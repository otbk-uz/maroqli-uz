// ============================================================
//  🔥 Firebase adapter (Realtime Database)
// ------------------------------------------------------------
//  Server YO'Q — Firebase o'zi rele bo'lib ishlaydi. Dizayner
//  ro'yxatdan o'tadi, `databaseURL` va `apiKey` ni kiritadi, xolos.
//
//  ── TUZILISHI ───────────────────────────────────────────────
//      rooms/<xona>/peers/<id>        { name, t }
//      rooms/<xona>/peers/<id>/s      { p:[x,y,z], r, a }   ← ~10 Hz
//      rooms/<xona>/msg/<push>        { t:'chat'|… , from, … }
//
//  ── NEGA IKKI TARMOQ ────────────────────────────────────────
//  ⚠ `peers` — HOLAT (doim yangilanadi, oxirgisi muhim).
//    `msg`   — HODISA (har biri muhim, yo'qolmasligi kerak).
//    Ularni aralashtirsak: holatni `push` qilsak baza cheksiz
//    o'sardi, hodisani `set` qilsak tez ketma-ket ikkitasi
//    bir-birini yo'q qilardi.
//
//  ── XARAJAT HAQIDA OCHIQ ────────────────────────────────────
//  ⚠ Firebase RTDB narxi TRAFIKKA bog'liq. 10 Hz × 8 o'yinchi ≈
//    sekundiga 80 yozuv. Bepul kvota (10 GB/oy) kichik sinov
//    uchun yetadi, lekin doimiy server uchun WebSocket arzonroq.
//    Shuning uchun yuborish chastotasi bu yerda PASAYTIRILGAN.
//
//  ── SDK CDN DAN ─────────────────────────────────────────────
//  ⚠ Faqat KERAK BO'LGANDA yuklanadi: dvigatel Firebase ishlatmasa
//    ham 300 KB skript tortib turishi noto'g'ri bo'lardi.
// ============================================================
(function () {
  'use strict';
  if (!window.NetAdapters) return;

  const SDK_APP = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
  const SDK_DB  = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js';

  /** Skriptni bir marta yuklaydi. */
  function _load(src) {
    return new Promise((res, rej) => {
      if (typeof document === 'undefined') return rej(new Error('DOM yo\'q'));
      //  ⚠ Ikki marta yuklanmasin: adapter qayta ulanganda SDK
      //    qaytadan tortilib, `firebase` global qayta yozilardi.
      const ex = document.querySelector('script[data-fb="' + src + '"]');
      if (ex) { if (ex._done) res(); else ex.addEventListener('load', () => res()); return; }
      const el = document.createElement('script');
      el.src = src;
      el.setAttribute('data-fb', src);
      el.onload = () => { el._done = true; res(); };
      el.onerror = () => rej(new Error('SDK yuklanmadi: ' + src));
      document.head.appendChild(el);
    });
  }

  function make() {
    let db = null, ref = null, myId = null, hooks = {}, room = 'apex';
    //  💬 CHAT ALOHIDA BAZADA bo'lishi mumkin.
    //  ⚠ NEGA: chat trafigi o'yin trafigidan butunlay boshqacha —
    //    kam, lekin saqlanadigan. Uni alohida bazaga chiqarish
    //    kvotani ajratadi va o'yin bazasi to'lganda ham chat
    //    ishlab turadi.
    //  ⚠ MAJBURIY EMAS: bo'sh qoldirilsa chat O'YIN bazasida
    //    ishlaydi — dizayner ikkinchi loyiha yasashga majbur
    //    bo'lmasin.
    let cdb = null;
    let _limit = 20;       // 🧹 nechta xabar saqlanadi (dizayner beradi)
    let _open = false;
    let _msgRef = null, _startedAt = 0;

    function _fail(e) {
      _open = false;
      if (hooks.onError) hooks.onError(e);
      if (hooks.onClose) hooks.onClose(e && e.message);
    }

    async function connect(opts, h) {
      hooks = h || {};
      room = (opts && opts.room) || 'apex';
      //  ⚠ Chegarani MIJOZ beradi: adapter `cfg` ni bilmaydi va
      //    bilmasligi ham kerak.
      if (opts && opts.chatHistory) _limit = +opts.chatHistory || 20;
      const dbUrl = opts && opts.databaseURL;
      if (!dbUrl) { _fail(new Error('`databaseURL` kiritilmagan')); return false; }

      try {
        await _load(SDK_APP);
        await _load(SDK_DB);
      } catch (e) { _fail(e); return false; }

      const fb = window.firebase;
      if (!fb || !fb.database) { _fail(new Error('Firebase SDK topilmadi')); return false; }

      try {
        //  ⚠ Nomlangan ilova: sahifada boshqa Firebase ilovasi bo'lsa
        //    (dizayner o'z kodida ishlatsa) standart ilovani qayta
        //    yozib yuborardik.
        const name = 'apex-mp';
        const app = fb.apps && fb.apps.find(a => a.name === name)
          ? fb.app(name)
          : fb.initializeApp({ databaseURL: dbUrl, apiKey: opts.apiKey || undefined }, name);
        db = fb.database(app);
      } catch (e) { _fail(e); return false; }

      //  💬 Ikkinchi baza — faqat KERAK BO'LSA.
      //  ⚠ `cdb` BO'SH qolsa hamma joyda `cdb || db` ishlaydi va
      //    kod ikkiga bo'linmaydi.
      try {
        const cUrl = opts && opts.chatDatabaseURL;
        if (cUrl && cUrl !== dbUrl) {
          const cname = 'apex-mp-chat';
          const capp = fb.apps && fb.apps.find(a => a.name === cname)
            ? fb.app(cname)
            : fb.initializeApp({ databaseURL: cUrl, apiKey: opts.apiKey || undefined }, cname);
          cdb = fb.database(capp);
        }
      } catch (e) {
        //  ⚠ Ikkinchi baza yiqilsa O'YIN ishlayversin: chat o'yin
        //    bazasiga qaytadi va sabab aytiladi.
        cdb = null;
        if (hooks.onError) hooks.onError(new Error('Chat bazasi ulanmadi — o\'yin bazasi ishlatiladi'));
      }

      try {
        const peers = db.ref('rooms/' + room + '/peers');
        ref = peers.push();
        myId = ref.key;
        _startedAt = Date.now();

        //  ⚠ `onDisconnect` — brauzer yopilsa Firebase O'ZI o'chiradi.
        //    Busiz uzilgan o'yinchi xonada MANGU qolib turardi:
        //    "uzildi" xabari kelmaydi, chunki server yo'q.
        ref.onDisconnect().remove();
        await ref.set({ name: (opts.name || 'Player'), t: _startedAt });

        //  ── Boshqa o'yinchilar ──
        peers.on('child_added', (snap) => {
          if (snap.key === myId) return;
          const v = snap.val() || {};
          if (hooks.onMessage) hooks.onMessage({ t: 'peer', id: snap.key, name: v.name });
          if (v.s && hooks.onMessage) {
            hooks.onMessage(Object.assign({ t: 'state', id: snap.key }, v.s));
          }
        });
        peers.on('child_changed', (snap) => {
          if (snap.key === myId) return;
          const v = snap.val() || {};
          if (v.s && hooks.onMessage) {
            hooks.onMessage(Object.assign({ t: 'state', id: snap.key }, v.s));
          }
        });
        peers.on('child_removed', (snap) => {
          if (snap.key === myId) return;
          if (hooks.onMessage) hooks.onMessage({ t: 'bye', id: snap.key });
        });

        //  ── Hodisalar (chat va h.k.) ──
        //  ⚠ `startAt` — ULANISHDAN OLDINGI xabarlar o'qilmaydi.
        //    Busiz yangi kirgan odamga butun tarix bir zumda
        //    quyilardi.
        //  ⚠ `ts` bo'yicha tartiblanadi — `t` protokol TURI uchun
        //    band. Ilgari ikkalasi bir nomda edi va chat buzilardi.
        _msgRef = (cdb || db).ref('rooms/' + room + '/msg')
          .orderByChild('ts').startAt(_startedAt);
        _msgRef.on('child_added', (snap) => {
          const v = snap.val();
          if (!v || v.from === myId) return;
          if (hooks.onMessage) hooks.onMessage(v);
        });

        _open = true;
        if (hooks.onOpen) hooks.onOpen();
        //  ⚠ `welcome` ni O'ZIMIZ yasaymiz: WebSocket da uni server
        //    yuboradi, Firebase da esa server yo'q. Mijoz kodi
        //    ikkala holatda ham BIR XIL ishlashi kerak.
        if (hooks.onMessage) hooks.onMessage({ t: 'welcome', id: myId, peers: [] });
        return true;
      } catch (e) { _fail(e); return false; }
    }

    function send(msg) {
      if (!_open || !ref) return false;
      try {
        //  HOLAT — ustiga yoziladi (oxirgisi muhim).
        if (msg && msg.t === 'state') {
          // ============================================================
          //  ⚠ `undefined` MAYDONLAR OLIB TASHLANADI
          // ------------------------------------------------------------
          //  XATO BOR EDI: `{ p: msg.p, r: msg.r }` yozilardi, lekin
          //  `_sendState` da `r` YO'Q — burilish `p` massivining
          //  to'rtinchi elementi. Ya'ni `r` DOIM `undefined` edi.
          //
          //  Firebase RTDB `undefined` ni QABUL QILMAYDI — u istisno
          //  tashlaydi:
          //      \"contains undefined in property 'rooms/…/s.r'\"
          //
          //  Istisno `try` ichida yutilardi va HECH QANDAY xabar
          //  chiqmasdi. Natija: holat HECH QACHON yozilmasdi va ikki
          //  o'yinchi bir-birini KO'RMASDI. Foydalanuvchi aynan
          //  shuni ko'rdi: \"hech qanday o'zgarishsiz\".
          // ============================================================
          const s = {};
          for (const k of ['p', 'r', 'a', 'c']) {
            if (msg[k] !== undefined && msg[k] !== null) s[k] = msg[k];
          }
          //  ⚠ Yozuv XATOSI endi AYTILADI: jimgina yutilsa sabab
          //    yana yashirin qolardi.
          ref.child('s').set(s).catch((e) => {
            if (hooks.onError) hooks.onError(e);
          });
          return true;
        }
        //  `join` Firebase da KERAK EMAS: biz allaqachon `peers` ga
        //  yozilganmiz. Uni yuborsak bazada keraksiz yozuv qolardi.
        if (msg && msg.t === 'join') return true;
        //  HODISA — qo'shiladi (har biri muhim).
        // ============================================================
        //  ⚠ `t` — IKKI MA'NOLI NOM va bu XATOGA olib kelgan edi
        // ------------------------------------------------------------
        //  Protokolda `t` — xabar TURI ('chat', 'state'…).
        //  Firebase da esa `orderByChild('t')` uchun `t` — VAQT kerak.
        //
        //  Ilgari tur `t2` ga ko'chirilib, `t` ga vaqt yozilardi.
        //  Mijoz esa `m.t === 'chat'` deb qidirardi — va u SON edi.
        //  Natijada chat xabarlari HECH QACHON tanilmasdi: yuborilardi,
        //  bazaga tushardi, lekin hech kim ko'rmasdi.
        //
        //  Endi vaqt ALOHIDA nomda (`ts`) va `t` TEGILMAYDI —
        //  protokol hamma backendda bir xil bo'lib qoladi.
        // ============================================================
        const ev = { from: myId };
        for (const k in msg) {
          if (msg[k] !== undefined && msg[k] !== null) ev[k] = msg[k];
        }
        ev.ts = Date.now();
        (cdb || db).ref('rooms/' + room + '/msg').push(ev).catch((e) => {
          if (hooks.onError) hooks.onError(e);
        });
        //  🧹 Eskilarini tozalash — baza cheksiz o'smasin.
        _trim();
        return true;
      } catch (e) { return false; }
    }

    // ============================================================
    //  🧹 ESKI XABARLARNI O'CHIRISH
    // ------------------------------------------------------------
    //  ⚠ Busiz `rooms/<xona>/msg` CHEKSIZ o'sardi: har xabar
    //    bazada MANGU qolardi va bir oydan keyin yangi kirgan
    //    o'yinchi o'n minglab yozuvni tortib olardi.
    //
    //  ⚠ HAR XABARDA emas, har N-chisida: tozalash ikkita so'rov
    //    talab qiladi va uni har safar qilsak trafik chat
    //    xabarining o'zidan ko'p bo'lardi.
    //
    //  ⚠ Chegaradan ZAXIRA bilan ko'proq qoldiriladi: aynan
    //    chegarada tozalasak har xabarda o'chirish kerak bo'lardi.
    let _trimN = 0;
    function _trim() {
      //  Har 10-chi xabarda.
      if ((++_trimN % 10) !== 0) return;
      try {
        const keep = Math.max(20, Math.min(500, (+_limit || 20) * 2));
        const ref2 = (cdb || db).ref('rooms/' + room + '/msg');
        ref2.orderByChild('ts').limitToLast(keep).once('value', (snap) => {
          //  ⚠ Eng ESKI qolayotgan xabarning vaqti — undan oldingilari
          //    o'chadi. `snap.forEach` TARTIB bilan yuradi, ya'ni
          //    birinchisi eng eskisi.
          let oldest = null;
          snap.forEach((c) => { if (oldest === null) oldest = (c.val() || {}).ts; });
          if (oldest == null) return;
          //  ⚠ `endAt(oldest - 1)` — QOLAYOTGANI tegilmasin.
          ref2.orderByChild('ts').endAt(oldest - 1).once('value', (old) => {
            old.forEach((c) => { try { c.ref.remove(); } catch (e) {} });
          });
        });
      } catch (e) {}
    }

    function disconnect() {
      if (!_open) return false;
      _open = false;
      try {
        if (ref) { ref.onDisconnect().cancel(); ref.remove(); }
        if (db) db.ref('rooms/' + room + '/peers').off();
        if (_msgRef) _msgRef.off();
      } catch (e) {}
      ref = null; myId = null; _msgRef = null; cdb = null;
      if (hooks.onClose) hooks.onClose('closed');
      return true;
    }

    return { name: 'firebase', connect, send, disconnect, isOpen: () => _open };
  }

  // ============================================================
  //  📋 BITTA MAYDON — nima tashlansa tushunadi
  // ------------------------------------------------------------
  //  ⚠ Ilgari IKKI maydon bor edi: `databaseURL` va `apiKey`.
  //    Dizayner Firebase konsolidan konfiguratsiyani NUSXALAYDI —
  //    u yerda esa butun blok:
  //        const firebaseConfig = { apiKey: "…", databaseURL: "…" };
  //    Uni ikki maydonga bo'lib kiritish uchun qo'lda tahrirlash
  //    kerak edi va bitta qo'shtirnoq unutilsa ulanish jimgina
  //    ishlamasdi.
  //
  //  Endi bitta maydon va u UCH XIL ko'rinishni tushunadi:
  //      1. To'liq blok    const firebaseConfig = { … };
  //      2. Sof JSON       { "databaseURL": "…" }
  //      3. Faqat manzil   https://…firebaseio.com
  //
  //  ⚠ `eval` ISHLATILMAYDI: kiritma foydalanuvchidan keladi va
  //    uni bajarish xavfli. Faqat naqsh bilan ajratamiz.
  // ============================================================
  function parseConfig(raw) {
    const out = { databaseURL: '', apiKey: '' };
    const txt = String(raw || '').trim();
    if (!txt) return out;

    //  3️⃣ Faqat manzil
    if (/^https?:\/\//i.test(txt) && txt.indexOf('{') < 0) {
      out.databaseURL = txt.replace(/[\s,;]+$/, '');
      return out;
    }

    //  1️⃣ · 2️⃣ Blok yoki JSON — kalitlarni naqsh bilan olamiz.
    //  ⚠ Qo'shtirnoqli ham, qo'shtirnoqsiz kalit ham qo'llab
    //    quvvatlanadi: Firebase konsoli qo'shtirnoqsiz beradi,
    //    JSON esa qo'shtirnoq bilan.
    const pick = (key) => {
      const m = txt.match(new RegExp('["\']?' + key + '["\']?\\s*:\\s*["\']([^"\']+)["\']'));
      return m ? m[1].trim() : '';
    };
    out.databaseURL = pick('databaseURL');
    out.apiKey      = pick('apiKey');

    //  ⚠ `databaseURL` YO'Q bo'lsa `projectId` dan QURAMIZ: ba'zi
    //    loyihalarda RTDB keyin yoqiladi va konfiguratsiyada u
    //    ko'rsatilmaydi. Dizayner \"nega ishlamadi?\" deb qidirib
    //    yurmasin.
    if (!out.databaseURL) {
      const pid = pick('projectId');
      if (pid) out.databaseURL = 'https://' + pid + '-default-rtdb.firebaseio.com';
    }
    return out;
  }
  window._fbParseConfig = parseConfig;

  window.NetAdapters.register('firebase', {
    label: '🔥 Firebase (server kerak emas)',
    fields: [
      { key: 'fbConfig', label: 'Konfiguratsiya', type: 'area',
        //  ⚠ Placeholder HAQIQIY MISOL bo'lishi kerak, ta'rif emas.
        //    \"Konsoldan nusxalang\" degan matn NIMANI nusxalashni
        //    aytmasdi — dizayner `apiKey` ni yoki butun sahifani
        //    tashlashi mumkin edi. Misol ko'rsatilsa savol
        //    tug'ilmaydi.
        placeholder: 'const firebaseConfig = {\n'
          + '  apiKey: "AIza...",\n'
          + '  databaseURL: "https://loyiha-default-rtdb.firebaseio.com"\n'
          + '};\n\nyoki faqat manzilni tashlang' },
      //  💬 Chat bazasi — ASOSIYDAN KEYIN.
      //  ⚠ Tartib MUHIM: asosiy konfiguratsiya birinchi bo'lishi
      //    kerak — dizayner panelni ochganda birinchi ko'rgan
      //    maydoniga o'yin konfiguratsiyasini tashlaydi.
      { key: 'fbChatConfig', label: '💬 Chat bazasi (ixtiyoriy)', type: 'area',
        placeholder: 'Bo\'sh qoldiring — chat o\'yin bazasida ishlaydi.\n\n'
          + 'Yoki ikkinchi loyihaning konfiguratsiyasini tashlang.' },
    ],
    //  ⚠ Ulanishdan OLDIN matn ajratiladi — adapter tayyor
    //    qiymatlarni oladi va `parse` ni bilmaydi.
    prepare(cfg) {
      const c = parseConfig(cfg.fbConfig);
      //  ⚠ Qo'lda kiritilgani USTUN: dizayner ataylab boshqacha
      //    yozgan bo'lsa uni bekor qilmaymiz.
      //  💬 Chat bazasi — bo'sh bo'lsa `undefined` va adapter
      //     o'yin bazasini ishlatadi.
      const cc = parseConfig(cfg.fbChatConfig);
      return { databaseURL: cfg.databaseURL || c.databaseURL,
               apiKey: cfg.apiKey || c.apiKey,
               chatDatabaseURL: cc.databaseURL || undefined };
    },
    make,
  });
})();
