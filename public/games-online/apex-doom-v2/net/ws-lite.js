// ============================================================
//  🔌 ws-lite.js — bog'liqliksiz WebSocket serveri
// ------------------------------------------------------------
//  ⚠ NEGA O'ZIMIZ YOZAMIZ, NEGA `ws` PAKETI EMAS:
//    eksport qilingan o'yin `node server.js` bilan, `npm install`
//    SIZ ishlashi kerak. O'yinchi arxivni ochadi va yurgizadi —
//    unda `node_modules` bo'lmaydi. Tashqi paketga tayansak
//    o'yin ochilmasdi.
//
//  ⚠ NEGA BITTA MANBA: bu fayl HAM dvigatel serveri, HAM eksport
//    qilingan o'yin serveri tomonidan ishlatiladi (`game-zip.js`
//    uni o'qib, yasalgan serverga QO'SHADI). Ikki nusxa bo'lsa
//    biri tuzatilib, ikkinchisi eskirib qolardi.
//
//  Qo'llab-quvvatlanadi: matnli kadrlar, ping/pong, yopilish.
//  Qo'llab-quvvatlanmaydi: binar kadrlar, kengaytmalar (siqish),
//  bo'lingan (fragmented) kadrlar — o'yin holati uchun keraksiz.
// ============================================================
'use strict';

const crypto = require('crypto');

//  RFC 6455 da belgilangan qat'iy qiymat — o'zgartirilmaydi.
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

//  ⚠ Kadr chegarasi: buzuq yoki yomon niyatli mijoz gigabaytlik
//    kadr yuborib serverni yiqitishi mumkin edi.
const MAX_FRAME = 1 << 20;   // 1 MB

/**
 * HTTP so'rovini WebSocket ga ko'taradi.
 * @returns {object|null} soket sarmoyasi yoki `null` (agar WS emas)
 */
function upgrade(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) { try { socket.destroy(); } catch (e) {} return null; }

  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  //  ⚠ Nagle algoritmi O'CHIRILADI: u kichik paketlarni yig'ib
  //    yuboradi va o'yin holati 40 ms gacha kechikardi.
  try { socket.setNoDelay(true); } catch (e) {}

  const ws = {
    socket,
    alive: true,
    data: {},                 // chaqiruvchi uchun (id, xona, nom…)
    onmessage: null,
    onclose: null,
    send(str) { return sendText(socket, str); },
    close() { try { socket.end(); } catch (e) {} },
  };

  let buf = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    //  ⚠ Bir `data` hodisasida BIR NECHTA kadr kelishi mumkin —
    //    halqa bo'lmasa ikkinchisi buferda qolib ketardi va o'yinchi
    //    harakati kechikib borardi.
    for (;;) {
      const f = readFrame(buf);
      if (!f) break;
      buf = buf.slice(f.total);
      if (f.opcode === 0x8) { ws.alive = false; ws.close(); return; }   // close
      if (f.opcode === 0x9) { sendPong(socket, f.payload); continue; }  // ping
      if (f.opcode === 0xA) { ws.alive = true; continue; }              // pong
      if (f.opcode === 0x1 && ws.onmessage) {
        try { ws.onmessage(f.payload.toString('utf8')); } catch (e) {}
      }
    }
    //  ⚠ Bufer o'smasin: chegaradan oshsa mijoz buzuq.
    if (buf.length > MAX_FRAME) { ws.alive = false; ws.close(); }
  });

  const done = () => {
    if (!ws.alive && ws._closed) return;
    ws._closed = true;
    ws.alive = false;
    if (ws.onclose) { try { ws.onclose(); } catch (e) {} }
  };
  socket.on('close', done);
  socket.on('end', done);
  //  ⚠ `error` HAM ushlanadi: ishlov berilmagan soket xatosi butun
  //    Node jarayonini yiqitardi va server o'chib qolardi.
  socket.on('error', done);

  //  ⚠ OQIM REJIMINI MAJBURAN YOQAMIZ.
  //    XATO BOR EDI: `http.Server` ning `upgrade` hodisasidagi soket
  //    TO'XTATILGAN holatda keladi. Biz `data` tinglovchisini
  //    qo'shamiz — lekin agar mijoz hech nima yubormasa soket
  //    hech qachon oqishni boshlamaydi va `close` hodisasi HAM
  //    kelmaydi. Natijada uzilgan o'yinchi xonada MANGU qolardi
  //    (test aynan shuni ko'rsatdi: uzilgach ham 1 o'yinchi).
  try { socket.resume(); } catch (e) {}

  return ws;
}

/** @returns {{opcode:number,payload:Buffer,total:number}|null} */
function readFrame(b) {
  if (b.length < 2) return null;
  const opcode = b[0] & 0x0f;
  const masked = (b[1] & 0x80) !== 0;
  let len = b[1] & 0x7f;
  let off = 2;

  if (len === 126) {
    if (b.length < 4) return null;
    len = b.readUInt16BE(2); off = 4;
  } else if (len === 127) {
    if (b.length < 10) return null;
    //  ⚠ Yuqori 32 bit E'TIBORSIZ: 4 GB dan katta kadr bo'lmaydi va
    //    `readUInt32BE` xavfsizroq (`BigInt` ga o'tish shart emas).
    if (b.readUInt32BE(2) !== 0) return null;
    len = b.readUInt32BE(6); off = 10;
  }
  if (len > MAX_FRAME) return null;

  const need = off + (masked ? 4 : 0) + len;
  if (b.length < need) return null;

  let payload;
  if (masked) {
    const mask = b.slice(off, off + 4);
    payload = Buffer.allocUnsafe(len);
    const start = off + 4;
    for (let i = 0; i < len; i++) payload[i] = b[start + i] ^ mask[i & 3];
  } else {
    payload = b.slice(off, off + len);
  }
  return { opcode, payload, total: need };
}

/** Matnli kadr yuboradi (server → mijoz, niqobsiz). */
function sendText(socket, str) {
  const data = Buffer.from(String(str), 'utf8');
  const len = data.length;
  let head;
  if (len < 126) {
    head = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    head = Buffer.allocUnsafe(4);
    head[0] = 0x81; head[1] = 126; head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.allocUnsafe(10);
    head[0] = 0x81; head[1] = 127;
    head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6);
  }
  try { return socket.write(Buffer.concat([head, data])); }
  catch (e) { return false; }
}

function sendPong(socket, payload) {
  const len = Math.min(payload.length, 125);
  const head = Buffer.from([0x8A, len]);
  try { socket.write(Buffer.concat([head, payload.slice(0, len)])); } catch (e) {}
}

module.exports = { upgrade, sendText, readFrame, MAX_FRAME };
