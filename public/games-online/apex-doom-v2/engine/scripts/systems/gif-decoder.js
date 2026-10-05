// ============================================================
//  🎞 GIF DEKODER  v1.0  (build 58.39)
// ------------------------------------------------------------
//  GIF87a / GIF89a faylini KADRLARGA ajratadi.
//
//  ── ⚠ NEGA O'Z DEKODERIMIZ ──────────────────────────────────
//    Brauzer GIF ni o'zi jonlantiradi, lekin uni `<img>` sifatida
//    kanvasga chizsak faqat SHU ONDAGI kadr tushadi — ya'ni tezlikni
//    boshqarib bo'lmaydi, orqaga o'ynatib ham. Dizayner esa
//    \"kadrni to'g'rilash\" so'radi.
//
//    Shuning uchun GIF o'zimiz ochiladi: kadrlar ro'yxati + har
//    birining kechikishi qo'lga tushadi va tezlikni biz belgilaymiz.
//
//  ── ⚠ NEGA KANVASSIZ ────────────────────────────────────────
//    Dekoder faqat RGBA baytlarni qaytaradi — DOM ga tegmaydi.
//    Shu sababdan uni node ichida, brauzersiz test qilish mumkin.
//    Kanvasga aylantirish alohida qadam (`gif-texture.js`).
//
//  ── Kadrlarni birlashtirish ─────────────────────────────────
//    GIF kadrlari ko'pincha TO'LIQ rasm emas, oldingisining ustiga
//    qo'yiladigan yamoq. Shuning uchun har kadr avvalgisining
//    nusxasi ustiga chiziladi va `disposal` qoidasi bajariladi:
//      0,1 — o'sha holida qoldiriladi
//      2   — yamoq joyi FONGA tozalanadi
//      3   — oldingi holatga qaytariladi
//    Buni bajarmasak, ko'p GIF da kadrlar bir-birini yeb ketardi.
// ============================================================

window.GifDecoder = (() => {
  'use strict';

  /**
   * @param {ArrayBuffer|Uint8Array} buf
   * @returns {{width:number,height:number,frames:Array<{rgba:Uint8ClampedArray,delay:number}>}}
   */
  function decode(buf) {
    const b = (buf instanceof Uint8Array) ? buf : new Uint8Array(buf);
    let p = 0;
    const u8  = () => b[p++];
    const u16 = () => { const v = b[p] | (b[p + 1] << 8); p += 2; return v; };

    // ── Sarlavha ──
    const sig = String.fromCharCode(b[0], b[1], b[2], b[3], b[4], b[5]);
    if (sig !== 'GIF87a' && sig !== 'GIF89a') throw new Error('GIF emas: ' + sig);
    p = 6;

    const width = u16(), height = u16();
    const flags = u8();
    const bgIndex = u8();
    u8();                                    // pixel aspect ratio — kerak emas

    let gct = null;
    if (flags & 0x80) {
      const n = 2 << (flags & 7);
      gct = _palette(b, p, n);
      p += n * 3;
    }

    const frames = [];
    // Joriy holat (RGBA) — kadrlar shu ustiga chiziladi
    const canvas = new Uint8ClampedArray(width * height * 4);
    let prev = null;                         // disposal=3 uchun nusxa

    let delay = 0, transparent = -1, disposal = 0;

    for (;;) {
      if (p >= b.length) break;
      const block = u8();

      if (block === 0x3B) break;             // trailer

      // ── Kengaytma ──
      if (block === 0x21) {
        const label = u8();
        if (label === 0xF9) {                // Graphic Control
          const size = u8();                 // odatda 4
          const packed = b[p];
          disposal    = (packed >> 2) & 7;
          transparent = (packed & 1) ? b[p + 3] : -1;
          delay       = (b[p + 1] | (b[p + 2] << 8)) * 10;   // 1/100 s → ms
          p += size;
          u8();                              // block terminator
        } else {
          // Boshqa kengaytmalar (izoh, matn, dastur) — kerak emas.
          // ⚠ Ularni O'TKAZIB YUBORISH SHART: uzunligi noma'lum
          //   sub-bloklar zanjiri, o'qimasak keyingi bayt noto'g'ri
          //   joydan boshlanib butun fayl "buzuq" bo'lib ko'rinardi.
          for (;;) { const n = u8(); if (!n) break; p += n; }
        }
        continue;
      }

      // ── Rasm tavsifi ──
      if (block === 0x2C) {
        const ix = u16(), iy = u16(), iw = u16(), ih = u16();
        const ifl = u8();
        let pal = gct;
        if (ifl & 0x80) { pal = _palette(b, p, 2 << (ifl & 7)); p += (2 << (ifl & 7)) * 3; }
        const interlaced = !!(ifl & 0x40);

        const minCode = u8();
        const data = _readBlocks(b, p);
        p = data.next;
        const idx = _lzw(data.bytes, minCode, iw * ih);

        // disposal=3 — oldingi holatni eslab qolamiz
        if (disposal === 3) prev = canvas.slice();

        _paint(canvas, width, height, idx, pal, ix, iy, iw, ih, transparent, interlaced);

        frames.push({ rgba: canvas.slice(), delay: delay || 100 });

        // Keyingi kadr uchun tozalash
        if (disposal === 2) _clearRect(canvas, width, ix, iy, iw, ih);
        else if (disposal === 3 && prev) canvas.set(prev);

        delay = 0; transparent = -1; disposal = 0;
        continue;
      }

      // Notanish blok — GIF buzuq, to'xtaymiz
      break;
    }

    if (!frames.length) throw new Error('GIF da kadr topilmadi');
    return { width, height, frames };
  }

  // ── Yordamchilar ────────────────────────────────────────────
  function _palette(b, at, n) {
    const pal = new Uint8Array(n * 3);
    for (let i = 0; i < n * 3; i++) pal[i] = b[at + i];
    return pal;
  }

  /** Sub-bloklarni bittaga yig'adi. */
  function _readBlocks(b, at) {
    const parts = [];
    let total = 0;
    for (;;) {
      const n = b[at++];
      if (!n) break;
      parts.push(b.subarray(at, at + n));
      total += n;
      at += n;
    }
    const out = new Uint8Array(total);
    let o = 0;
    for (const part of parts) { out.set(part, o); o += part.length; }
    return { bytes: out, next: at };
  }

  /**
   * LZW yechish.
   * ⚠ Lug'at 4096 ga yetganda GIF spetsifikatsiyasi kodni
   *   KENGAYTIRMASLIKNI talab qiladi (`clear` kelguncha kutiladi).
   *   Buni unutsak ba'zi fayllarda kod uzunligi 13 bitga o'sib
   *   ketardi va rasm \"shovqin\" bo'lib chiqardi.
   */
  function _lzw(data, minCode, pixelCount) {
    const out = new Uint8Array(pixelCount);
    const clear = 1 << minCode;
    const eoi = clear + 1;
    let codeSize = minCode + 1;
    let dictSize = eoi + 1;

    const prefix = new Int32Array(4096);
    const suffix = new Uint8Array(4096);
    const stack  = new Uint8Array(4096);
    for (let i = 0; i < clear; i++) { prefix[i] = -1; suffix[i] = i; }

    let bitPos = 0, prevCode = -1, o = 0, sp = 0;
    const readCode = () => {
      let code = 0;
      for (let i = 0; i < codeSize; i++) {
        const byte = data[bitPos >> 3];
        if (byte === undefined) return eoi;
        code |= ((byte >> (bitPos & 7)) & 1) << i;
        bitPos++;
      }
      return code;
    };

    while (o < pixelCount) {
      const code = readCode();
      if (code === eoi) break;
      if (code === clear) {
        codeSize = minCode + 1;
        dictSize = eoi + 1;
        prevCode = -1;
        continue;
      }
      if (prevCode === -1) {
        out[o++] = suffix[code];
        prevCode = code;
        continue;
      }

      let cur = code;
      if (code >= dictSize) { stack[sp++] = suffix[prevCode]; cur = prevCode; }
      while (cur >= clear) { stack[sp++] = suffix[cur]; cur = prefix[cur]; }
      stack[sp++] = suffix[cur];

      while (sp > 0 && o < pixelCount) out[o++] = stack[--sp];
      sp = 0;

      if (dictSize < 4096) {
        prefix[dictSize] = prevCode;
        suffix[dictSize] = suffix[cur];
        dictSize++;
        if ((dictSize & (dictSize - 1)) === 0 && dictSize < 4096) codeSize++;
      }
      prevCode = code;
    }
    return out;
  }

  /** Interlaced GIF qatorlari to'g'ri tartibda. */
  function _rowOrder(ih) {
    const rows = [];
    for (let i = 0; i < ih; i += 8) rows.push(i);
    for (let i = 4; i < ih; i += 8) rows.push(i);
    for (let i = 2; i < ih; i += 4) rows.push(i);
    for (let i = 1; i < ih; i += 2) rows.push(i);
    return rows;
  }

  function _paint(canvas, W, H, idx, pal, ix, iy, iw, ih, transparent, interlaced) {
    if (!pal) return;
    const rows = interlaced ? _rowOrder(ih) : null;
    for (let y = 0; y < ih; y++) {
      const srcRow = rows ? rows[y] : y;
      const dy = iy + srcRow;
      if (dy < 0 || dy >= H) continue;
      for (let x = 0; x < iw; x++) {
        const dx = ix + x;
        if (dx < 0 || dx >= W) continue;
        const ci = idx[y * iw + x];
        if (ci === transparent) continue;    // shaffof — ostidagi qoladi
        const s = ci * 3, d = (dy * W + dx) * 4;
        canvas[d]     = pal[s];
        canvas[d + 1] = pal[s + 1];
        canvas[d + 2] = pal[s + 2];
        canvas[d + 3] = 255;
      }
    }
  }

  function _clearRect(canvas, W, ix, iy, iw, ih) {
    for (let y = 0; y < ih; y++) {
      const d0 = ((iy + y) * W + ix) * 4;
      for (let x = 0; x < iw * 4; x++) canvas[d0 + x] = 0;
    }
  }

  return { decode, _lzw };
})();
