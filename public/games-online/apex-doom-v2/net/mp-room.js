// ============================================================
//  🌐 mp-room.js — multiplayer xona relesi
// ------------------------------------------------------------
//  Server o'yin MANTIG'INI yuritmaydi — u RELE (relay): kim nima
//  yuborsa, o'sha xonadagi qolganlarga uzatadi.
//
//  ⚠ NEGA RELE, NEGA VAKOLATLI (authoritative) SERVER:
//    vakolatli server fizikani, to'qnashuvni va qoidalarni O'ZI
//    hisoblashi kerak — ya'ni butun dvigatelni Node'da qayta
//    yozish. Bu APEX uchun oylik ish va u brauzerdagi Rapier
//    natijasi bilan aslo bir xil chiqmasdi.
//    Rele esa bugun ishlaydi va dizaynerga kerakli narsani beradi:
//    do'stlar bir sahnada birga yurishi.
//
//  ⚠ CHEGARA OCHIQ AYTILADI: rele aldovga qarshi himoya BERMAYDI.
//    Mijoz istalgan joyni yuborishi mumkin. Raqobatli o'yin uchun
//    vakolatli server kerak; bu esa hamkorlikdagi o'yin uchun.
// ============================================================
'use strict';

const WS = require('./ws-lite');

//  ⚠ Chegaralar: ochiq serverni yiqitib bo'lmasin.
const MAX_ROOMS        = 64;
const MAX_PER_ROOM     = 16;
const MAX_MSG_LEN      = 16 * 1024;
const MAX_MSG_PER_SEC  = 60;      // bitta mijozdan

const rooms = new Map();          // nom → Map(id → ws)
let _idSeq = 0;

const stats = () => ({
  rooms: rooms.size,
  players: [...rooms.values()].reduce((n, m) => n + m.size, 0),
});

function _room(name) {
  let r = rooms.get(name);
  if (!r) {
    if (rooms.size >= MAX_ROOMS) return null;
    r = new Map();
    rooms.set(name, r);
  }
  return r;
}

/** Xonadagi qolganlarga uzatadi. */
function _broadcast(roomName, fromId, payload) {
  const r = rooms.get(roomName);
  if (!r) return;
  for (const [id, ws] of r) {
    if (id === fromId || !ws.alive) continue;
    ws.send(payload);
  }
}

/** Xonadagi o'yinchilar ro'yxati. */
function _roster(roomName) {
  const r = rooms.get(roomName);
  if (!r) return [];
  return [...r.values()].map(w => ({ id: w.data.id, name: w.data.name }));
}

function _sendRoster(roomName) {
  const r = rooms.get(roomName);
  if (!r) return;
  const msg = JSON.stringify({ t: 'roster', list: _roster(roomName) });
  for (const ws of r.values()) if (ws.alive) ws.send(msg);
}

function handle(req, socket) {
  const ws = WS.upgrade(req, socket);
  if (!ws) return;

  ws.data.id = ++_idSeq;
  ws.data.room = null;
  ws.data.name = 'Player ' + ws.data.id;
  //  ⚠ Tezlik chegarasi: cheksiz xabar yuboradigan mijoz qolganlarni
  //    ham sekinlashtirardi.
  let _cnt = 0;
  let _sec = Math.floor(Date.now() / 1000);

  ws.onmessage = (raw) => {
    if (raw.length > MAX_MSG_LEN) return;
    const now = Math.floor(Date.now() / 1000);
    if (now !== _sec) { _sec = now; _cnt = 0; }
    if (++_cnt > MAX_MSG_PER_SEC) return;

    let m;
    //  ⚠ Buzuq JSON butun serverni yiqitmasin.
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    // ── Xonaga qo'shilish ──
    if (m.t === 'join') {
      const name = String(m.room || 'apex').slice(0, 40);
      const r = _room(name);
      if (!r) { ws.send(JSON.stringify({ t: 'err', m: 'xonalar to\'lgan' })); return; }
      if (r.size >= MAX_PER_ROOM) {
        ws.send(JSON.stringify({ t: 'err', m: 'xona to\'lgan (' + MAX_PER_ROOM + ')' }));
        return;
      }
      //  ⚠ Eski xonadan CHIQARAMIZ: aks holda o'yinchi ikki xonada
      //    bir vaqtda ko'rinib qolardi.
      _leave(ws);
      ws.data.room = name;
      ws.data.name = String(m.name || ws.data.name).slice(0, 24);
      r.set(ws.data.id, ws);
      ws.send(JSON.stringify({ t: 'joined', id: ws.data.id, room: name }));
      _sendRoster(name);
      return;
    }

    if (!ws.data.room) return;     // xonasiz hech narsa uzatilmaydi

    // ── Holat va hodisalar ──
    //  ⚠ Server mazmunni TEKSHIRMAYDI \u2014 u rele. Faqat KIMDAN
    //    kelganini qo'shadi, aks holda mijoz o'zini boshqa o'yinchi
    //    deb ko'rsatishi mumkin edi.
    if (m.t === 'state' || m.t === 'ev') {
      m.id = ws.data.id;
      _broadcast(ws.data.room, ws.data.id, JSON.stringify(m));
    }
  };

  ws.onclose = () => _leave(ws);
}

function _leave(ws) {
  const name = ws.data.room;
  if (!name) return;
  const r = rooms.get(name);
  ws.data.room = null;
  if (!r) return;
  r.delete(ws.data.id);
  //  ⚠ Bo'sh xona O'CHIRILADI: aks holda ular yig'ilib borardi va
  //    `MAX_ROOMS` chegarasi bekorga to'lardi.
  if (!r.size) { rooms.delete(name); return; }
  _broadcast(name, ws.data.id, JSON.stringify({ t: 'left', id: ws.data.id }));
  _sendRoster(name);
}

module.exports = { handle, stats, rooms };
