// ============================================================
//  🔊⌨ KEY-SOUND — klaviatura tugmalariga ovoz biriktirish
//
//  Har bir tugmaga (W, A, S, D, E, R, T… istalgan klavisha) mp3/wav
//  biriktiriladi. Ikki rejim:
//
//    • LOOP (bosib turilganda):
//        tugma bosilsa ovoz boshlanadi va TUGMA BOSILIB TURGANDA
//        takrorlanaveradi (walk.mp3 kabi). Tugma qo'yib yuborilganda
//        DARHOL to'xtaydi. Musiqa o'rtada tugasa — o'zi qaytadan
//        boshlanadi (loop), tugma hali bosilib tursa.
//
//    • ONCE (bir marta):
//        tugma bosilganda ovoz BOSHIDAN ijro etiladi va OXIRIGACHA
//        yetib to'xtaydi. Tugma bosib turilsa ham qayta boshlanmaydi
//        (faqat qo'yib qayta bosilganda). Zarba, otish, sakrash ovozi.
//
//  ⚠ NEGA ALOHIDA MODUL: keybinding animatsiyalari (`_kbAnimations`)
//    allaqachon murakkab. Sound'ni o'sha tuzilmaga tiqishtirish uni
//    yanada chalkashtirardi. Bu modul mustaqil `_kbSounds` xaritasini
//    tutadi va o'z keydown/keyup ushlagichlarini o'rnatadi.
// ============================================================
(function () {
  'use strict';

  // keyCode → { soundName, mode: 'loop'|'once', volume }
  window._kbSounds = window._kbSounds || {};

  // ============================================================
  //  🎯 TAHRIRLASH NISHONI — global yoki 🎛 AllKey zonasi
  // ------------------------------------------------------------
  //  ⚠ `keybindings.js` dagi `_kbEditTarget` bilan BIR XIL naqsh.
  //    Ovozlar alohida xaritada yotgani uchun bu yerda ham kerak —
  //    aks holda zona tahrirlanayotganda ovoz GLOBAL sozlamaga
  //    yozilib, hamma sahnaga ta'sir qilardi.
  function _sndTable() {
    const z = window._kbEditTarget;
    if (z && z.userData) {
      if (!z.userData.sounds) z.userData.sounds = {};
      return z.userData.sounds;
    }
    return window._kbSounds;
  }
  window._kbSoundTable = _sndTable;
  // keyCode → aktiv audio handle (loop rejimida to'xtatish uchun)
  const _active = {};
  // ONCE rejimida takror bosishda qayta boshlash uchun: keyCode bosilganmi
  const _downHeld = {};

  function _play(name, opts) {
    if (typeof SoundSystem === 'undefined' || !SoundSystem.play) return null;
    try { return SoundSystem.play(name, null, opts); } catch (e) { return null; }
  }
  function _stopHandle(h) {
    if (!h) return;
    try { if (h.isPlaying) h.stop(); } catch (e) {}
  }

  // ============================================================
  //  🔇 PIYODALIK OVOZI — mashinada CHALINMAYDI
  // ------------------------------------------------------------
  //  ⚠ ALOMAT (foydalanuvchi topgan): `W` ga qo'yilgan qadam ovozi
  //    MASHINADA HAM chalinardi. Mantiqan noto'g'ri: haydayotgan
  //    odam piyoda yurmaydi.
  //
  //  ⚠ Sabab dizaynda edi: 🚗 mashina profili global jadval USTIGA
  //    qo'yiladi (bu to'g'ri — busiz `E` kabi klavishlar o'lik
  //    bo'lardi). Lekin OVOZ boshqacha: mashinada belgilanmagan
  //    klavishning PIYODALIK ovozi chalinmasligi kerak.
  //
  //  ⚠ NEGA BUTUNLAY O'CHIRMAYMIZ: ba'zi ovozlar (masalan `Tab` —
  //    menyu ochilishi) ikkala holatda ham kerak. Shuning uchun bu
  //    MASHINA SOZLAMASI (`muteFootSounds`), standarti YONIQ.
  function _footMuted(code) {
    const P = window.CarKeyProfile;
    const car = P && P.owner();
    if (!car || !car.userData) return false;
    //  Mashina SHU klavishni o'zi belgilagan bo'lsa — chalinadi.
    if (car.userData.sounds && car.userData.sounds[code]) return false;
    //  Sozlama o'chirilgan bo'lsa piyodalik ovozi qoladi.
    return car.userData.muteFootSounds !== false;
  }

  //  ⚠ Testda chaqirish uchun ochamiz: tinglovchilar `document` ga
  //    ulangan va ularni sinovda ishga tushirish uchun to'liq DOM
  //    kerak bo'lardi. Mantiqni to'g'ridan tekshirish ancha aniq.
  window._kbSoundOnDown = (code) => _onDown(code);
  window._kbSoundFootMuted = (code) => _footMuted(code);

  function _onDown(code) {
    const cfg = window._kbSounds[code];
    if (!cfg || !cfg.soundName) return;
    if (_footMuted(code)) return;
    if (_downHeld[code]) return;            // repeat event — bir marta
    _downHeld[code] = true;

    const opts = { volume: cfg.volume ?? 0.7 };

    if (cfg.mode === 'loop') {
      // Bosib turilganda takrorlanadi. THREE.Audio loop=true bir o'zi
      // yetarli, lekin ba'zi brauzerlarda loop uzilishi mumkin —
      // shuning uchun `_active` da saqlab, keyup da aniq to'xtatamiz.
      _stopHandle(_active[code]);
      _active[code] = _play(cfg.soundName, { volume: opts.volume, loop: true });
    } else {
      // ONCE — boshidan oxirigacha, bir marta. Har bosishda yangi ijro.
      _play(cfg.soundName, { volume: opts.volume, loop: false });
    }
  }

  function _onUp(code) {
    _downHeld[code] = false;
    const cfg = window._kbSounds[code];
    if (!cfg) return;
    if (cfg.mode === 'loop') {
      // Qo'yib yuborilganda DARHOL to'xtaydi.
      _stopHandle(_active[code]);
      _active[code] = null;
    }
    // ONCE — qo'yib yuborilsa hech nima qilmaymiz, o'zi oxirigacha ketadi.
  }

  // ============================================================
  //  ⚠ EKRAN TUGMASI — HAQIQIY manba
  // ------------------------------------------------------------
  //  Ilgari `if (e._altSynthetic) return;` BARCHA sintetik hodisani
  //  to'sardi. ⌨🖥 ekran tugmalari ham shu markerni qo'yadi (cheksiz
  //  tsikldan saqlanish uchun) — natijada ekrandagi tugmani bosganda
  //  🔊 OVOZ UMUMAN CHIQMASDI. Fizik klavishda ishlardi, ekrandagida
  //  yo'q.
  //
  //  Farq: `_screenKey` — HAQIQIY manba (o'yinchi bosdi), yolg'iz
  //  `_altSynthetic` esa alt-klavish qayta tarqatgani (uni o'tkazamiz,
  //  aks holda ovoz ikki marta chalinardi).
  const _synOk = (e) => !e._altSynthetic || e._screenKey;

  document.addEventListener('keydown', (e) => {
    if (!_synOk(e)) return;
    if (typeof isPlaying !== 'undefined' && !isPlaying) return;  // faqat o'yinda
    _onDown(e.code);
  }, true);

  document.addEventListener('keyup', (e) => {
    if (!_synOk(e)) return;
    _onUp(e.code);
  }, true);

  // O'yin to'xtaganda barcha loop ovozlarni o'chiramiz (aks holda
  // Stop bosilganда walk.mp3 g'ing'illab qolardi).
  window._kbSoundsStopAll = function () {
    for (const code in _active) { _stopHandle(_active[code]); _active[code] = null; }
    for (const code in _downHeld) _downHeld[code] = false;
  };

  // ── Inspektor/panel sozlagichlari ───────────────────────────
  window._kbSoundSet = function (code, key, val) {
    const _t = _sndTable();
    if (!_t[code]) _t[code] = { soundName: '', mode: 'loop', volume: 0.7 };
    _t[code][key] = val;
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._kbSoundClear = function (code) {
    _stopHandle(_active[code]); _active[code] = null;
    //  ⚠ NISHONDAN o'chiriladi: 🎛 zona tahrirlanayotgan bo'lsa
    //    global sozlamaga tegmasligimiz kerak.
    delete _sndTable()[code];
    if (typeof log === 'function') log(`🔇 ${code} — ovoz olib tashlandi`, 'lw');
    if (typeof updateInspector === 'function') updateInspector();
  };

  // Tugmaga mp3/wav import qilish → SoundSystem ga ro'yxatlash → biriktirish
  window._kbSoundImport = function (code) {
    if (typeof SoundSystem === 'undefined') { if (typeof log === 'function') log('⚠ Ovoz tizimi topilmadi', 'lw'); return; }
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'audio/*,.mp3,.wav,.ogg'; inp.style.display = 'none';
    inp.onchange = (e) => {
      const f = e.target && e.target.files && e.target.files[0];
      if (f) {
        const name = f.name.replace(/\.\w+$/, '');
        const reader = new FileReader();
        reader.onload = (ev) => {
          // ⚠ Audio kontekstni MAJBURAN tayyorlaymiz. `SoundSystem.listener`
          //   faqat `init()` dan keyin mavjud — foydalanuvchi hali Play
          //   bosmagan bo'lsa null bo'ladi va ovoz yuklanmasdi. `_ensure()`
          //   init qiladi (kerak bo'lsa) va suspended kontekstni resume qiladi.
          try { if (SoundSystem._ensure) SoundSystem._ensure(); } catch (e0) {}
          const ctx = (SoundSystem.listener && SoundSystem.listener.context)
            ? SoundSystem.listener.context : null;
          if (!ctx) {
            if (typeof log === 'function') log("⚠ Audio hali tayyor emas — avval ▶ o'yinni bir marta boshlang (yoki 🔊 tovushni yoqing), keyin qayta yuklang", 'lw');
            return;
          }
          // ⚠ ASL BAYTLAR — busiz klaviaturaga bog'langan musiqa sahnaga
          //   YOZILMASDI: `SoundSystem.serialize()` `src`siz ovozni
          //   o'tkazib yuboradi (`if (!s.src) continue`). Sahna boshqa
          //   brauzerda/o'yinda ochilganda klavish bosilardi-yu, jimjit.
          //   (Bu ovoz import qilinadigan TO'RTINCHI yo'l — panel,
          //    Sound Block va hitbox paketi bilan bir xil tuzatish.)
          let _src = null;
          try {
            if (typeof window._abToDataUrl === 'function')
              _src = window._abToDataUrl(ev.target.result.slice(0), f.type || 'audio/mpeg');
          } catch (e1) { if (typeof log === 'function') log('⚠ Ovoz baytlari saqlanmadi', 'lw'); }
          try {
            ctx.decodeAudioData(ev.target.result.slice(0), (buf) => {
              try { SoundSystem._reg(name, buf, { volume: 0.7, src: _src, fileName: f.name, builtin: false }); } catch (e2) {}
              window._kbSoundSet(code, 'soundName', name);
              if (typeof log === 'function') log(`🔊 ${code} ← ${name}` + (_src ? '' : ' ⚠ sahnaga yozilmaydi'), 'lok');
            }, () => { if (typeof log === 'function') log("⚠ Ovozni dekod qilib bo'lmadi (fayl buzuq yoki qo'llab-quvvatlanmaydi)", 'lw'); });
          } catch (e2) { if (typeof log === 'function') log('⚠ Ovoz xato: ' + e2.message, 'lw'); }
        };
        reader.readAsArrayBuffer(f);
      }
      if (inp.parentNode) inp.parentNode.removeChild(inp);
    };
    document.body.appendChild(inp); inp.click();
    setTimeout(() => { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
  };
})();
