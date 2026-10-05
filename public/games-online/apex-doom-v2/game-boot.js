// 🎮 O'yin ishga tushirish — redaktor dvigatelini o'yin rejimiga o'tkazadi
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
      //   generatsiya paytida ekranlash yo'qoladi: 'yo'q' → 'yo'q' →
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
      //  ⚠ Keyin so'rasak o'yinchi allaqachon xonaga "Player 123"
      //    nomi bilan kirib ulgurardi va boshqalar uni shunday
      //    ko'rardi.
      //  ⚠ Nik KUTILADI. Ilgari kutilmasdi va ▶ Play darhol
      //    bosilardi — ulanish nik BO'SH holda ketib, o'yinchi
      //    boshqalarga "Player 456" bo'lib ko'rinardi.
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
