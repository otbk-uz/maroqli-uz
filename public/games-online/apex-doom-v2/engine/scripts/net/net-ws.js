// ============================================================
//  🔌 WebSocket adapter
// ------------------------------------------------------------
//  Dvigatelning O'Z serveri (`net/ws-lite.js`). Tashqi paket ham,
//  ro'yxatdan o'tish ham kerak emas — `node server.js` yetadi.
//
//  ⚠ Bu adapter ILGARI `multiplayer.js` ICHIDA yozilgan edi. Kod
//    o'zgarmadi, faqat ko'chirildi: shu bois xulq aynan o'sha
//    bo'lib qoladi va mavjud testlar buzilmaydi.
// ============================================================
(function () {
  'use strict';
  if (!window.NetAdapters) return;

  function make() {
    let ws = null;
    let hooks = {};

    /**
     * ⚠ Sahifa manzilidan QURAMIZ: dizayner qo'lda yozmasin va
     *   `https` sahifada `ws://` bilan bloklanib qolmasin.
     */
    function _url(opts) {
      if (opts && opts.url) return opts.url;
      try {
        const proto = (location.protocol === 'https:') ? 'wss:' : 'ws:';
        return proto + '//' + location.host + '/mp';
      } catch (e) { return 'ws://localhost:3000/mp'; }
    }

    return {
      name: 'ws',

      connect(opts, h) {
        hooks = h || {};
        if (typeof WebSocket === 'undefined') {
          if (hooks.onError) hooks.onError(new Error("Bu muhitda WebSocket yo'q"));
          return false;
        }
        let s;
        //  ⚠ Soket YARATILGUNCHA holat o'zgartirilmaydi. XATO BOR
        //    EDI: `connecting` oldin yozilardi va `new WebSocket`
        //    yiqilsa holat o'sha yerda QOTIB qolardi — panel
        //    "ulanmoqda…" deb turaverardi.
        try { s = new WebSocket(_url(opts)); }
        catch (e) {
          if (hooks.onError) hooks.onError(e);
          return false;
        }
        ws = s;

        s.onopen = () => { if (hooks.onOpen) hooks.onOpen(); };
        s.onmessage = (ev) => {
          let m;
          //  ⚠ Buzuq xabar butun ulanishni yiqitmasin.
          try { m = JSON.parse(ev.data); } catch (e) { return; }
          if (hooks.onMessage) hooks.onMessage(m);
        };
        s.onclose = () => { ws = null; if (hooks.onClose) hooks.onClose('closed'); };
        s.onerror = (e) => { if (hooks.onError) hooks.onError(e); };
        return true;
      },

      send(msg) {
        //  ⚠ `readyState` TEKSHIRILADI: yopilayotgan soketga yozish
        //    istisno tashlaydi va u har kadr takrorlanardi.
        if (!ws || ws.readyState !== 1) return false;
        try { ws.send(JSON.stringify(msg)); return true; } catch (e) { return false; }
      },

      disconnect() {
        if (!ws) return false;
        try { ws.close(); } catch (e) {}
        ws = null;
        return true;
      },

      isOpen: () => !!ws && ws.readyState === 1,
    };
  }

  window.NetAdapters.register('ws', {
    label: '🖥 WebSocket (o\'z serverimiz)',
    fields: [
      //  ⚠ Bo'sh qoldirish MUMKIN ekani va MISOL — ikkalasi ham
      //    ko'rinsin: dizayner \"nima yozishim kerak?\" deb
      //    to'xtab qolmasin.
      { key: 'url', label: 'Manzil',
        placeholder: 'bo\'sh qoldiring  •  yoki  ws://192.168.1.5:3000/mp' },
    ],
    make,
  });
})();
