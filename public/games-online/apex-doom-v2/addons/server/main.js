#!/usr/bin/env node
// ============================================================
//  🛰 PROTON SERVER — Proton Multiplayer addoni uchun tayyor server
//
//  Ishga tushirish:
//      cd tools/proton-server
//      npm install
//      node server.js            (standart port 8090)
//
//  Sozlama: shu papkadagi proton.config.json (yo'q bo'lsa standart).
//
//  ⚠ Admin, ban, maxPlayers, nik bandligi — HAMMASI SHU YERDA
//    tekshiriladi. O'yin faylidagi ro'yxatlar faqat qulaylik uchun:
//    brauzerdagi kodni har kim o'zgartira oladi, serverni esa yo'q.
// ============================================================
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROTO = 1;
const DEFAULTS = {
  port: 8090,
  maxPlayersCap: 64,      // xona yaratuvchi so'ragan son shundan oshmaydi
  adminKey: '',           // bo'sh bo'lmasa: admin nik + `/admin <kalit>`
  admins: [],
  bans: [],
  nick: { min: 2, max: 16 },
  chat: { maxLen: 200, perWindow: 5, windowMs: 5000 },
  maxMessageBytes: 16 * 1024,
};

function loadConfig(file) {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
  return Object.assign({}, DEFAULTS, c,
    { nick: Object.assign({}, DEFAULTS.nick, c.nick), chat: Object.assign({}, DEFAULTS.chat, c.chat) });
}

const lc = s => String(s || '').trim().toLowerCase();
const num = v => (typeof v === 'number' && isFinite(v)) ? v : 0;
const NICK_RE = /^[\p{L}\p{N}_\-. ]+$/u;

/**
 * Transportdan mustaqil xona mantig'i. Keyinchalik Socket.IO ham
 * aynan shuni ishlatadi — faqat `connect(send, close)` o'zgaradi.
 */
function createHub(config, saveConfig) {
  const rooms = new Map();
  let nextId = 1;

  const isAdminNick = n => config.admins.map(lc).includes(lc(n));
  const isBanned = n => config.bans.map(lc).includes(lc(n));
  const pub = p => ({ id: p.id, nick: p.nick, admin: p.admin, prof: p.prof,
                      p: p.state.p, r: p.state.r, hp: p.state.hp, mh: p.state.mh });

  function broadcast(room, msg, exceptId) {
    const s = JSON.stringify(msg);
    for (const p of room.players.values()) if (p.id !== exceptId) p.sendRaw(s);
  }

  function pickSpawn(room) {
    const n = room.spawns.length;
    if (!n) return -1;
    if (room.spawnMode === 'sequential') return (room.spawnSeq++) % n;
    if (room.spawnMode === 'farthest') {
      const others = [...room.players.values()].map(p => p.state.p).filter(Boolean);
      if (!others.length) return Math.floor(Math.random() * n);
      let best = 0, bestD = -1;
      room.spawns.forEach((s, i) => {
        const d = Math.min(...others.map(o => (o[0] - s[0]) ** 2 + (o[1] - s[1]) ** 2 + (o[2] - s[2]) ** 2));
        if (d > bestD) { bestD = d; best = i; }
      });
      return best;
    }
    return Math.floor(Math.random() * n);
  }

  function pickProfile(room) {
    const n = room.profN;
    if (!n) return -1;
    if (room.profMode === 'random') return Math.floor(Math.random() * n);
    if (room.profMode === 'sequential') {
      // Eng kam ishlatilgani — takrorlanmasin, hamma band bo'lsa qaytadan
      const used = new Array(n).fill(0);
      for (const p of room.players.values()) if (p.prof >= 0 && p.prof < n) used[p.prof]++;
      return used.indexOf(Math.min(...used));
    }
    return 0;
  }

  function kick(room, p, reason) {
    p.sendRaw(JSON.stringify({ t: 'kicked', reason }));
    setTimeout(() => p.close(), 50);
  }

  function command(p, text) {
    const room = p.room;
    const [cmd, ...rest] = String(text).trim().split(/\s+/);
    const arg = rest.join(' ');
    const reply = t => p.sendRaw(JSON.stringify({ t: 'sys', text: t }));
    const find = n => [...room.players.values()].find(x => lc(x.nick) === lc(n));

    if (cmd === '/list') return reply('👥 ' + [...room.players.values()].map(x => (x.admin ? '★' : '') + x.nick).join(', '));
    if (cmd === '/admin') {
      if (!config.adminKey) return reply("Admin kaliti serverda o'rnatilmagan");
      if (arg !== config.adminKey || !isAdminNick(p.nick)) return reply("⛔ Noto'g'ri kalit");
      p.admin = true;
      p.sendRaw(JSON.stringify({ t: 'admin', on: true }));
      return;
    }
    if (!p.admin) return reply('⛔ Bu buyruq faqat admin uchun');
    if (cmd === '/kick' || cmd === '/ban') {
      const target = find(arg);
      if (cmd === '/ban' && !config.bans.map(lc).includes(lc(arg))) {
        config.bans.push(arg);
        saveConfig();
      }
      if (target === p) return reply("O'zingizni chiqara olmaysiz");
      if (!target && cmd === '/kick') return reply(`"${arg}" xonada yo'q`);
      if (target) kick(room, target, cmd === '/ban' ? 'ban' : 'kick');
      broadcast(room, { t: 'sys', text: `🛡 ${arg} ${cmd === '/ban' ? 'bloklandi' : 'chiqarildi'}` });
      return;
    }
    if (cmd === '/unban') {
      config.bans = config.bans.filter(b => lc(b) !== lc(arg));
      saveConfig();
      return reply(`✅ ${arg} blokdan chiqarildi`);
    }
    reply('Buyruqlar: /list, /kick <nik>, /ban <nik>, /unban <nik>, /admin <kalit>');
  }

  function join(p, m) {
    const fail = (code, msg) => { p.sendRaw(JSON.stringify({ t: 'error', code, msg })); setTimeout(() => p.close(), 50); };
    if (m.v !== PROTO) return fail('PROTO');
    const nick = String(m.nick || '').trim();
    if (nick.length < config.nick.min || nick.length > config.nick.max || !NICK_RE.test(nick)) return fail('BAD_NICK');
    if (isBanned(nick)) return fail('BANNED');

    const name = String(m.room || 'apex').slice(0, 64);
    let room = rooms.get(name);
    if (!room) {
      // Xonani birinchi kirgan o'yinchi yaratadi — uning sahnasi "asl"
      const sp = m.spawn || {}, pr = m.prof || {};
      room = {
        name, players: new Map(),
        max: Math.max(2, Math.min(config.maxPlayersCap, Math.floor(num(m.max)) || 8)),
        hash: String(m.hash || ''),
        spawns: Array.isArray(sp.pts) ? sp.pts.slice(0, 256).map(a => [num(a[0]), num(a[1]), num(a[2])]) : [],
        spawnMode: ['random', 'sequential', 'farthest'].includes(sp.mode) ? sp.mode : 'random',
        spawnSeq: 0,
        profN: Math.max(0, Math.min(256, Math.floor(num(pr.n)))),
        profMode: ['single', 'random', 'sequential'].includes(pr.mode) ? pr.mode : 'single',
      };
      rooms.set(name, room);
    } else {
      if (room.hash && String(m.hash || '') !== room.hash) return fail('VERSION_MISMATCH');
      if (room.players.size >= room.max) return fail('FULL');
      if ([...room.players.values()].some(x => lc(x.nick) === lc(nick))) return fail('NICK_TAKEN');
    }

    p.id = nextId++;
    p.nick = nick;
    p.room = room;
    // ⚠ Kalit o'rnatilgan bo'lsa admin nik YETARLI EMAS — `/admin <kalit>` kerak
    p.admin = isAdminNick(nick) && !config.adminKey;
    p.prof = pickProfile(room);
    p.spawn = pickSpawn(room);
    const others = [...room.players.values()].map(pub);
    room.players.set(p.id, p);
    p.sendRaw(JSON.stringify({ t: 'welcome', id: p.id, nick, admin: p.admin, prof: p.prof,
                               spawn: p.spawn, max: room.max, players: others }));
    broadcast(room, { t: 'join', player: pub(p) }, p.id);
  }

  function leave(p) {
    const room = p.room;
    if (!room || !room.players.has(p.id)) return;
    room.players.delete(p.id);
    broadcast(room, { t: 'leave', id: p.id });
    if (!room.players.size) rooms.delete(room.name);
    p.room = null;
  }

  /** Yangi ulanish. sendRaw(string), close() — transport beradi. */
  function connect(sendRaw, close) {
    const p = { id: 0, nick: '', admin: false, room: null, prof: -1, spawn: -1,
                state: { p: null, r: 0, hp: null, mh: null }, lastState: 0, chatTimes: [],
                sendRaw, close };
    return {
      message(raw) {
        if (raw.length > config.maxMessageBytes) return;
        let m; try { m = JSON.parse(raw); } catch (e) { return; }
        if (!m || typeof m.t !== 'string') return;
        if (m.t === 'hello') return sendRaw(JSON.stringify({ t: 'hello', name: 'proton-server', v: PROTO, rooms: rooms.size }));
        if (m.t === 'ping') return sendRaw(JSON.stringify({ t: 'pong', c: m.c }));
        if (m.t === 'join') { if (!p.room) join(p, m); return; }
        if (!p.room) return;
        const room = p.room;
        switch (m.t) {
          case 's': {
            const t = Date.now();
            if (t - p.lastState < 25) return;             // >40 Hz — tashlaymiz
            p.lastState = t;
            if (!Array.isArray(m.p) || m.p.length !== 3) return;
            p.state = { p: m.p.map(num), r: num(m.r),
                        hp: m.hp == null ? null : num(m.hp), mh: m.mh == null ? null : num(m.mh) };
            broadcast(room, Object.assign({ t: 's', id: p.id }, p.state), p.id);
            break;
          }
          case 'chat': {
            const t = Date.now();
            p.chatTimes = p.chatTimes.filter(x => t - x < config.chat.windowMs);
            if (p.chatTimes.length >= config.chat.perWindow) {
              return sendRaw(JSON.stringify({ t: 'sys', text: '⏳ Juda tez — biroz kuting' }));
            }
            p.chatTimes.push(t);
            const text = String(m.text || '').trim().slice(0, config.chat.maxLen);
            if (text) broadcast(room, { t: 'chat', id: p.id, nick: p.nick, admin: p.admin, text });
            break;
          }
          case 'cmd': command(p, m.text); break;
          case 'ev': broadcast(room, { t: 'ev', id: p.id, n: String(m.n || '').slice(0, 64), d: m.d }, p.id); break;
          case 'leave': leave(p); close(); break;
        }
      },
      closed() { leave(p); },
    };
  }

  return { connect, rooms, config };
}

/** HTTP + WebSocket serverni ishga tushiradi. @returns {Promise<{port, close}>} */
function start(opts = {}) {
  let WebSocketServer;
  try { ({ WebSocketServer } = require('ws')); }
  catch (e) { throw new Error("`ws` paketi yo'q — shu papkada `npm install` qiling"); }

  const cfgFile = opts.configFile || path.join(__dirname, 'proton.config.json');
  const config = opts.config || loadConfig(cfgFile);
  const save = () => { if (opts.config) return; try { fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2)); } catch (e) {} };
  const hub = createHub(config, save);

  const srv = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`🛰 Proton server ishlayapti · xonalar: ${hub.rooms.size}\n`);
  });
  const wss = new WebSocketServer({ server: srv, maxPayload: config.maxMessageBytes });
  wss.on('connection', ws => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    const c = hub.connect(s => { if (ws.readyState === 1) ws.send(s); }, () => ws.close());
    ws.on('message', d => c.message(String(d)));
    ws.on('close', () => c.closed());
    ws.on('error', () => {});
  });
  // O'lik ulanishlarni tozalash (internet uzilib, `close` kelmagan)
  const hb = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch (e) {}
    });
  }, 15000);

  return new Promise(resolve => {
    srv.listen(opts.port != null ? opts.port : config.port, () => {
      resolve({ port: srv.address().port, hub,
        close: () => new Promise(r => { clearInterval(hb); wss.clients.forEach(c => c.terminate()); wss.close(); srv.close(() => r()); }) });
    });
  });
}

module.exports = { start, createHub, loadConfig, DEFAULTS, PROTO };

if (require.main === module) {
  start().then(({ port, hub }) => {
    console.log(`🛰 Proton server: ws://localhost:${port}`);
    if (hub.config.admins.length && !hub.config.adminKey) {
      console.log("⚠ adminKey bo'sh — admin nikini yozgan HAR KIM admin bo'ladi. Kalit qo'yish tavsiya etiladi.");
    }
  }).catch(e => { console.error('❌ ' + e.message); process.exit(1); });
}
