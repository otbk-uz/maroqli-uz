// doom-2v — o'yin serveri
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
  const rel  = path.normalize(url).replace(/^(..[/\\])+/, '');
  const file = path.join(__dirname, rel === '/' || rel === '\\' ? 'index.html' : rel);
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
//  ⚠ `try` ichida: `net/` papkasi bo'lmasa o'yin BARIBIR ochilsin.
//    Multiplayer qo'shimcha imkoniyat, majburiy emas.
let MP = null;
try { MP = require('./net/mp-room'); } catch (e) {}

//  ⚠ FAQAT `/mp`: boshqa yo'ldagi upgrade so'rovi rad etiladi.
srv.on('upgrade', (req, socket) => {
  const u = String(req.url || '').split('?')[0];
  if (MP && u === '/mp') { MP.handle(req, socket); return; }
  try { socket.destroy(); } catch (e) {}
});

srv.listen(PORT, () => {
  console.log('🎮 doom-2v → http://localhost:' + PORT);
  console.log(MP ? '🌐 Multiplayer tayyor — ws://…/mp'
                 : '⚠ Multiplayer ishlamaydi (net/ papkasi topilmadi)');
});
