// ============================================================
//  🛰 PROTON MULTIPLAYER — 1-bosqich (o'yinchilar)
//
//  Har bir o'yinchining brauzeri O'SHA sahnani to'liq yuklaydi va
//  yakka o'yindagidek ishga tushiradi. Addon faqat tarmoqni qo'shadi:
//  o'z holatini yuboradi, boshqalarni "qo'g'irchoq" qilib ko'rsatadi.
//  Dizayner sozlagan hamma narsa (kamera, klavishlar, filtr, HUD…)
//  shu sabab hamma o'yinchida bir xil ishlaydi.
//
//  Sozlamalar: sahnadagi "🌐 Proton Server" obyektining
//  `userData.protonMP` maydonida — sahna bilan saqlanadi, game.zip
//  ga ketadi. Obyekt havolalari `modelIds` / `spawnIds` da: yuklashda
//  id qayta raqamlansa, dvigatel (`_slRemapIds`) ularni o'zi ko'chiradi.
//
//  Server: tools/proton-server (Node.js + ws).
// ============================================================
(function () {
  'use strict';

  const ID = 'proton-multiplayer';
  const PROTO = 1;
  const SEND_HZ = 15;
  const INTERP_MS = 100;          // qo'g'irchoqlar shuncha orqada ko'rsatiladi
  const LS_NICK = 'proton.nick';

  // ── Standart sozlamalar ─────────────────────────────────────
  const DEF = {
    v: 1, enabled: true,
    backend: 'ws', url: 'ws://localhost:8090', room: 'apex',
    maxPlayers: 8,
    login: { title: "O'yinga kirish", nickMin: 2, nickMax: 16, css: '' },
    profileMode: 'single', modelIds: [],
    spawnMode: 'random', spawnIds: [], spawnXYZ: [],
    collidePlayers: 'block',
    chat: { enabled: true, key: 't', maxLen: 200, joinLeave: true },
    tags: { mode: 'always', dist: 25, hp: true, throughWalls: false, selfBadge: true },
    admins: [], bans: [],
  };

  // Keyingi bosqichlarda ulanadigan backendlar ro'yxatda turadi,
  // lekin tanlab bo'lmaydi — dizayner nima kelayotganini ko'radi.
  const BACKENDS = {
    ws:       { name: 'Node.js + WebSocket', ready: true,  make: c => WSTransport(c.url) },
    socketio: { name: 'Socket.IO',           ready: false },
    colyseus: { name: 'Colyseus',            ready: false },
    nakama:   { name: 'Nakama',              ready: false },
    firebase: { name: 'Firebase',            ready: false },
  };

  // ── Yordamchilar ────────────────────────────────────────────
  const objs = () => (typeof objects !== 'undefined' ? objects : (window.objects || []));
  const byId = id => objs().find(o => o.userData && String(o.userData.id) === String(id));
  const mgr  = () => objs().find(o => o.userData && o.userData.protonMP);
  const now  = () => (window.performance && performance.now) ? performance.now() : Date.now();
  const esc  = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const say = (m, t) => { try { log('🛰 ' + m, t || 'lok'); } catch (e) {} };

  function merge(base, over) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    if (!over || typeof over !== 'object') return out;
    for (const k in over) {
      const b = base ? base[k] : undefined, v = over[k];
      out[k] = (b && typeof b === 'object' && !Array.isArray(b) && v && typeof v === 'object' && !Array.isArray(v))
        ? merge(b, v) : v;
    }
    return out;
  }
  const cfg = () => { const m = mgr(); return merge(DEF, m ? m.userData.protonMP : null); };

  function nickError(nick, c) {
    const n = String(nick || '').trim();
    const L = c.login || DEF.login;
    if (n.length < L.nickMin) return `Nik kamida ${L.nickMin} ta belgi bo'lsin`;
    if (n.length > L.nickMax) return `Nik ko'pi bilan ${L.nickMax} ta belgi`;
    if (!/^[\p{L}\p{N}_\-. ]+$/u.test(n)) return "Nikda faqat harf, raqam, _ - . va probel bo'lishi mumkin";
    return null;
  }

  // cyrb53 — tez, barqaror xesh (xavfsizlik uchun emas, versiya solishtirish uchun)
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  /**
   * Sahna barmoq izi. Id lar KIRMAYDI — yuklashda qayta raqamlanadi.
   * Nomlar, turlar, boshlang'ich pozitsiyalar va addon sozlamasi kiradi:
   * brauzer keshida eski game.zip qolgan o'yinchi boshqa sozlamada
   * o'ynab yurmasin.
   */
  function sceneHash() {
    const r = v => Math.round((v || 0) * 100) / 100;
    const parts = [];
    objs().forEach(o => {
      const u = o.userData || {};
      if (u.__noSave || u._mpPuppet) return;
      parts.push([u.name || '', u.type || '', r(o.position.x), r(o.position.y), r(o.position.z)].join('|'));
    });
    const c = cfg();
    parts.push(JSON.stringify([c.maxPlayers, c.profileMode, c.modelIds.length, c.spawnMode,
      c.spawnIds.length, c.spawnXYZ.length, c.collidePlayers, PROTO]));
    return hash(parts.join('\n'));
  }

  function player() {
    if (window.PlayerController && PlayerController.obj) return PlayerController.obj;
    return objs().find(o => o.userData && o.userData.isPlayerObj) || null;
  }

  // Spawn nuqtalari: avval koordinatalar, keyin obyektlar
  function spawnList(c) {
    const out = [];
    (c.spawnXYZ || []).forEach(p => out.push({ kind: 'xyz', x: +p.x || 0, y: +p.y || 0, z: +p.z || 0 }));
    (c.spawnIds || []).forEach(id => out.push({ kind: 'obj', id }));
    return out;
  }
  /** Nuqtaning dunyo koordinatasi. Obyekt bo'lsa — tepasiga, o'yinchi yarim bo'yi bilan */
  function spawnPos(pt, halfH) {
    if (!pt) return null;
    if (pt.kind === 'xyz') return new THREE.Vector3(pt.x, pt.y + (halfH || 0), pt.z);
    const o = byId(pt.id);
    if (!o) return null;
    const box = new THREE.Box3().setFromObject(o);
    if (box.isEmpty()) { const w = new THREE.Vector3(); o.getWorldPosition(w); return w.setY(w.y + (halfH || 1)); }
    const c = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(c.x, box.max.y + 0.05 + (halfH || 1), c.z);
  }

  // ============================================================
  //  🔌 TRANSPORT — Node.js + WebSocket
  //  Hamma backend uchun bir xil shakl: connect / send / onMessage /
  //  onClose / close. Protokol mantig'i transportni bilmaydi.
  // ============================================================
  function WSTransport(url) {
    let ws = null;
    const L = { msg: null, close: null };
    return {
      connect() {
        return new Promise((res, rej) => {
          try { ws = new WebSocket(url); } catch (e) { return rej(new Error("Manzil noto'g'ri: " + url)); }
          const to = setTimeout(() => { rej(new Error('Server javob bermadi: ' + url)); try { ws.close(); } catch (e) {} }, 8000);
          ws.onopen = () => { clearTimeout(to); res(); };
          ws.onerror = () => { clearTimeout(to); rej(new Error("Serverga ulanib bo'lmadi: " + url)); };
          ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } if (L.msg) L.msg(m); };
          ws.onclose = () => { if (L.close) L.close(); };
        });
      },
      send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); },
      onMessage(f) { L.msg = f; },
      onClose(f) { L.close = f; },
      close() { if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} ws = null; } },
    };
  }

  // ============================================================
  //  🎨 UI — uslublar (dizayner `login.css` bilan ustidan yozadi)
  // ============================================================
  const BASE_CSS = `
#pmp-login{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;
  background:rgba(6,8,14,.82);font-family:'Rajdhani','Segoe UI',Arial,sans-serif}
#pmp-login .pmp-card{width:min(340px,90vw);background:#12151f;border:1px solid #2a3350;border-radius:8px;
  padding:22px;box-shadow:0 12px 40px rgba(0,0,0,.5);color:#e6ebff}
#pmp-login .pmp-title{font-size:20px;font-weight:700;margin-bottom:14px;text-align:center}
#pmp-login input{width:100%;box-sizing:border-box;padding:10px 12px;font-size:16px;border-radius:5px;
  border:1px solid #33406a;background:#0b0e16;color:#fff;outline:none}
#pmp-login input:focus{border-color:#7aa2ff}
#pmp-error{min-height:18px;font-size:13px;color:#ff7b7b;margin:8px 0 4px}
#pmp-login .pmp-row{display:flex;gap:8px;margin-top:6px}
#pmp-login button{flex:1;padding:10px;font-size:15px;font-weight:700;border-radius:5px;cursor:pointer;border:0}
#pmp-join{background:#4c7dff;color:#fff}#pmp-join:disabled{opacity:.5;cursor:wait}
#pmp-cancel{background:#232a3d;color:#aab4d4}
#pmp-login .pmp-foot{margin-top:12px;font-size:11px;color:#6d7899;text-align:center;word-break:break-all}
#pmp-chat{position:fixed;left:12px;bottom:46px;width:min(380px,70vw);z-index:9000;pointer-events:none;
  font:14px 'Rajdhani','Segoe UI',Arial,sans-serif;color:#fff}
#pmp-chat .pmp-log div{background:rgba(0,0,0,.45);padding:3px 8px;border-radius:3px;margin-top:2px;
  text-shadow:0 1px 2px #000;transition:opacity .6s;word-wrap:break-word}
#pmp-chat .pmp-log div.old{opacity:0}
#pmp-chat.open .pmp-log div.old{opacity:1}
#pmp-chat .pmp-sys{color:#9fb4ff;font-style:italic}
#pmp-chat b.adm{color:#ffd54a}
#pmp-chat input{display:none;width:100%;box-sizing:border-box;margin-top:4px;padding:7px 9px;font-size:14px;
  border-radius:4px;border:1px solid #4c7dff;background:rgba(8,10,18,.9);color:#fff;outline:none;pointer-events:auto}
#pmp-chat.open input{display:block}
#pmp-chat.open .pmp-log{max-height:40vh;overflow-y:auto;pointer-events:auto}
#pmp-chatbtn{position:fixed;left:12px;bottom:10px;z-index:9001;font-size:18px;background:rgba(0,0,0,.5);
  border:1px solid #33406a;color:#fff;border-radius:5px;padding:3px 8px}
#pmp-badge{position:fixed;left:12px;bottom:12px;z-index:9000;font:13px 'Share Tech Mono',monospace;color:#dfe6ff;
  background:rgba(0,0,0,.45);padding:4px 9px;border-radius:4px;pointer-events:none;display:flex;gap:10px;align-items:center}
#pmp-badge .hp{display:inline-block;width:70px;height:6px;background:#333;border-radius:3px;overflow:hidden;vertical-align:middle}
#pmp-badge .hp i{display:block;height:100%;background:#4cd964}
#pmp-block{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;
  background:rgba(10,0,0,.85);color:#fff;font:20px 'Rajdhani','Segoe UI',Arial,sans-serif;text-align:center;padding:20px}`;

  function ensureStyle(c) {
    let st = document.getElementById('pmp-style');
    if (!st) { st = document.createElement('style'); st.id = 'pmp-style'; document.head.appendChild(st); }
    st.textContent = BASE_CSS + '\n' + ((c && c.login && c.login.css) || '');
  }
  const rm = id => { const e = document.getElementById(id); if (e) e.remove(); };

  // ============================================================
  //  🔑 KIRISH OYNASI (beforePlay) — nik → ulanish → welcome
  // ============================================================
  let S = null;          // faol sessiya
  let _pending = null;   // welcome keldi, ▶ hali boshlanmadi

  function loginFlow(c) {
    return new Promise(resolve => {
      ensureStyle(c);
      rm('pmp-login');
      const root = document.createElement('div');
      root.id = 'pmp-login';
      let saved = '';
      try { saved = localStorage.getItem(LS_NICK) || ''; } catch (e) {}
      root.innerHTML = `<div class="pmp-card">
        <div class="pmp-title">${esc(c.login.title)}</div>
        <input id="pmp-nick" placeholder="Nikingiz" maxlength="${+c.login.nickMax || 16}" value="${esc(saved)}" autocomplete="off">
        <div id="pmp-error"></div>
        <div class="pmp-row"><button id="pmp-cancel">Bekor</button><button id="pmp-join">Kirish</button></div>
        <div class="pmp-foot">${esc(BACKENDS[c.backend].name)} · ${esc(c.url)} · ${esc(c.room)}</div></div>`;
      document.body.appendChild(root);
      const inp = root.querySelector('#pmp-nick'), btn = root.querySelector('#pmp-join');
      const err = root.querySelector('#pmp-error');
      let busy = false, done = false;

      // ⌨ Yozayotganda o'yin/redaktor tugmalari ishlamasin. `window`
      //   capture — dvigatelning `document` capture tinglovchilaridan OLDIN.
      const guard = e => {
        if (!root.isConnected) return;
        if (e.key === 'Enter' && e.type === 'keydown') { e.preventDefault(); go(); }
        if (e.key === 'Escape' && e.type === 'keydown') { e.preventDefault(); finish(false); }
        e.stopImmediatePropagation();
      };
      window.addEventListener('keydown', guard, true);

      function finish(ok) {
        if (done) return;
        done = true;
        window.removeEventListener('keydown', guard, true);
        root.remove();
        resolve(ok);
      }
      async function go() {
        if (busy) return;
        const nick = inp.value.trim();
        const bad = nickError(nick, c);
        if (bad) { err.textContent = bad; return; }
        busy = true; btn.disabled = true; err.textContent = 'Ulanmoqda…';
        try {
          const w = await connectAndJoin(c, nick);
          try { localStorage.setItem(LS_NICK, nick); } catch (e) {}
          _pending = w;
          finish(true);
        } catch (e) {
          err.textContent = e.message;
          busy = false; btn.disabled = false;
        }
      }
      btn.onclick = go;
      root.querySelector('#pmp-cancel').onclick = () => finish(false);
      setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 30);
    });
  }

  const ERRORS = {
    FULL: "Server to'la — keyinroq urinib ko'ring",
    BANNED: "Bu nik bilan kirish taqiqlangan",
    NICK_TAKEN: 'Bu nik band — boshqasini tanlang',
    BAD_NICK: "Nik yaroqsiz",
    VERSION_MISMATCH: "O'yin yangilangan — sahifani yangilang",
    PROTO: 'Server boshqa versiyada',
  };

  async function connectAndJoin(c, nick) {
    const B = BACKENDS[c.backend];
    const tr = B.make(c);
    await tr.connect();
    const spawns = spawnList(c).map(pt => { const p = spawnPos(pt, 0); return p ? [p.x, p.y, p.z] : [0, 0, 0]; });
    return new Promise((res, rej) => {
      const to = setTimeout(() => { tr.close(); rej(new Error('Server javob bermadi')); }, 8000);
      tr.onMessage(m => {
        if (m.t === 'welcome') { clearTimeout(to); res({ tr, welcome: m, nick, early: [] }); }
        else if (m.t === 'error') { clearTimeout(to); tr.close(); rej(new Error(ERRORS[m.code] || m.msg || m.code)); }
      });
      tr.onClose(() => { clearTimeout(to); rej(new Error('Aloqa uzildi')); });
      tr.send({ t: 'join', v: PROTO, room: String(c.room || 'apex'), nick, hash: sceneHash(),
        max: clamp(+c.maxPlayers || 8, 2, 64),
        prof: { n: c.modelIds.length, mode: c.profileMode },
        spawn: { mode: c.spawnMode, pts: spawns } });
    });
  }

  // ============================================================
  //  🧍 QO'G'IRCHOQLAR — boshqa o'yinchilar
  //  `objects` ga QO'SHILMAYDI: saqlanmasin, tanlanmasin, hitbox
  //  tetiklamasin. Alohida guruhda yashaydi.
  // ============================================================
  function stripClone(src) {
    const v = src.clone(true);
    // ⚠ TARTIB MUHIM: avval PlayerModelSystem skinini topib olib
    //   tashlaymiz (belgisi `userData._pmSkin`), keyin userData ni
    //   tozalaymiz — aks holda belgi o'chib, skin qo'g'irchoqqa tushardi.
    const junk = [];
    v.traverse(o => {
      if (o === v) return;
      const u = o.userData || {};
      if (u._pmSkin || o.name === '__vehicle_arrow__') junk.push(o);
    });
    junk.forEach(o => o.parent && o.parent.remove(o));
    v.traverse(o => {
      o.userData = { _mpPuppet: true };
      o.raycast = () => {};
      if (o.isMesh) o.castShadow = true;
    });
    v.visible = true;
    return v;
  }

  function tagTexture(pl) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 72;
    const tex = new THREE.CanvasTexture(cv);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return { cv, tex };
  }
  function drawTag(pl) {
    const t = pl.tag; if (!t) return;
    const g = t.cv.getContext && t.cv.getContext('2d');
    if (!g) return;
    const showHp = S && S.cfg.tags.hp;
    g.clearRect(0, 0, 256, 72);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(8, 6, 240, showHp ? 60 : 40);
    g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = pl.admin ? '#ffd54a' : '#ffffff';
    g.fillText((pl.admin ? '★ ' : '') + pl.nick, 128, 26);
    if (showHp) {
      const r = clamp((pl.hp == null ? 100 : pl.hp) / (pl.mh || 100), 0, 1);
      g.fillStyle = '#333'; g.fillRect(28, 50, 200, 8);
      g.fillStyle = r > 0.5 ? '#4cd964' : r > 0.25 ? '#ffcc00' : '#ff3b30';
      g.fillRect(28, 50, 200 * r, 8);
    }
    t.tex.needsUpdate = true;
    t.sig = pl.nick + '|' + pl.hp + '|' + pl.mh + '|' + pl.admin;
  }

  function buildPuppet(pl) {
    const c = S.cfg;
    const g = new THREE.Group();
    g.name = 'mp:' + pl.nick;
    g.userData = { _mpPuppet: true };
    let vis = null;
    const srcId = pl.prof >= 0 ? c.modelIds[pl.prof] : null;
    const src = srcId != null ? byId(srcId) : null;
    if (src) {
      vis = stripClone(src);
      vis.position.set(0, 0, 0); vis.rotation.set(0, 0, 0);
      vis.scale.copy(src.scale);
    } else if (S.template) {
      vis = S.template.clone(true);
      vis.visible = true;
    }
    if (vis) g.add(vis);

    // Nik + jon (sprite)
    if (c.tags.mode !== 'hidden') {
      const { cv, tex } = tagTexture(pl);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: !c.tags.throughWalls });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(1.6, 0.45, 1);
      if (c.tags.throughWalls) sp.renderOrder = 999;
      let top = S.half.y;
      if (vis) { const b = new THREE.Box3().setFromObject(vis); if (!b.isEmpty()) top = b.max.y; }
      sp.position.set(0, top + 0.35, 0);
      sp.raycast = () => {};
      g.add(sp);
      pl.tag = { sp, cv, tex, sig: '' };
      drawTag(pl);
    }

    // 🧱 To'qnashuv — o'yinchi o'lchamidagi ko'rinmas quti.
    //   player.js uni APEX.net.colliders orqali ko'radi.
    if (c.collidePlayers === 'block') {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(S.half.x * 2, S.half.y * 2, S.half.z * 2),
        new THREE.MeshBasicMaterial({ visible: false }));
      box.userData = { name: 'mp:' + pl.nick, colliderMode: 'block', _mpCollider: true };
      box.raycast = () => {};
      g.add(box);
      pl.col = box;
      APEX.net.colliders.push(box);
    }

    S.group.add(g);
    pl.obj = g;
    if (pl.buf.length) { const l = pl.buf[pl.buf.length - 1]; g.position.set(l.p[0], l.p[1], l.p[2]); g.rotation.y = l.r; }
    else g.visible = false;           // birinchi holat kelguncha ko'rinmasin
  }

  function dropPuppet(pl) {
    if (pl.col) {
      const i = APEX.net.colliders.indexOf(pl.col);
      if (i >= 0) APEX.net.colliders.splice(i, 1);
    }
    if (pl.obj && pl.obj.parent) pl.obj.parent.remove(pl.obj);
    if (pl.tag) { try { pl.tag.tex.dispose(); pl.tag.sp.material.dispose(); } catch (e) {} }
    pl.obj = null; pl.tag = null; pl.col = null;
  }

  function addPlayer(p) {
    if (!S || p.id === S.self.id || S.players.has(p.id)) return;
    const pl = { id: p.id, nick: p.nick, admin: !!p.admin, prof: p.prof == null ? -1 : p.prof,
                 hp: p.hp, mh: p.mh, buf: [], obj: null, tag: null, col: null };
    if (p.p) pl.buf.push({ t: now(), p: p.p, r: p.r || 0 });
    S.players.set(p.id, pl);
    if (S.group) buildPuppet(pl);
  }

  const lerpAng = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };

  function updatePuppets() {
    const rt = now() - INTERP_MS;
    const me = player();
    const c = S.cfg;
    for (const pl of S.players.values()) {
      const g = pl.obj; if (!g || !pl.buf.length) continue;
      const b = pl.buf;
      while (b.length > 2 && b[1].t <= rt) b.shift();      // eskilar
      let p, r;
      if (b.length >= 2 && b[0].t <= rt && rt <= b[1].t) {
        const k = (rt - b[0].t) / Math.max(1, b[1].t - b[0].t);
        p = [0, 1, 2].map(i => b[0].p[i] + (b[1].p[i] - b[0].p[i]) * k);
        r = lerpAng(b[0].r, b[1].r, k);
      } else {
        const l = b[b.length - 1]; p = l.p; r = l.r;       // ushlab turamiz, bashorat qilmaymiz
      }
      g.position.set(p[0], p[1], p[2]);
      g.rotation.y = r;
      g.visible = true;
      if (pl.tag) {
        if (c.tags.mode === 'near' && me) pl.tag.sp.visible = me.position.distanceTo(g.position) <= (+c.tags.dist || 25);
        else pl.tag.sp.visible = true;
        const sig = pl.nick + '|' + pl.hp + '|' + pl.mh + '|' + pl.admin;
        if (sig !== pl.tag.sig) drawTag(pl);
      }
    }
  }

  // ============================================================
  //  💬 CHAT va 👤 O'Z NISHONI
  // ============================================================
  function buildUI() {
    const c = S.cfg;
    ensureStyle(c);
    if (c.chat.enabled) {
      const box = document.createElement('div');
      box.id = 'pmp-chat';
      box.innerHTML = `<div class="pmp-log"></div><input maxlength="${+c.chat.maxLen || 200}" placeholder="Xabar… (Enter — yuborish, Esc — yopish)">`;
      document.body.appendChild(box);
      S.ui.chat = box;
      S.ui.log = box.querySelector('.pmp-log');
      S.ui.input = box.querySelector('input');
      if ('ontouchstart' in window) {
        const b = document.createElement('button');
        b.id = 'pmp-chatbtn'; b.textContent = '💬';
        b.onclick = () => (S && S.ui.open ? closeChat() : openChat());
        document.body.appendChild(b);
      }
    }
    if (c.tags.selfBadge) {
      const bd = document.createElement('div');
      bd.id = 'pmp-badge';
      document.body.appendChild(bd);
      S.ui.badge = bd;
      if (S.ui.chat) S.ui.chat.style.bottom = '46px';
    } else if (S.ui.chat) S.ui.chat.style.bottom = '12px';

    // ⌨ `window` capture — dvigatelning `document` capture
    //   tinglovchilaridan OLDIN ishlaydi. Chat yozilayotganda W/A/S/D
    //   o'yinchini yurgizmasin (keybindings.js input fokusini tekshirmaydi).
    //   ⚠ keyup TO'SILMAYDI — aks holda chat ochilganda bosib turilgan
    //     tugma "yopishib" qolardi.
    S.ui.onKey = e => {
      if (!S) return;
      if (S.ui.open) {
        if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeChat(); }
        e.stopImmediatePropagation();
        return;
      }
      if (!S.cfg.chat.enabled || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
      if (String(e.key).toLowerCase() === String(S.cfg.chat.key || 't').toLowerCase()) {
        e.preventDefault(); e.stopImmediatePropagation();
        openChat();
      }
    };
    window.addEventListener('keydown', S.ui.onKey, true);
  }

  function openChat() {
    if (!S || !S.ui.chat) return;
    S.ui.open = true;
    S.ui.hadLock = !!document.pointerLockElement;
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
    S.ui.chat.classList.add('open');
    setTimeout(() => { try { S && S.ui.input.focus(); } catch (e) {} }, 0);
  }
  function closeChat() {
    if (!S || !S.ui.chat) return;
    S.ui.open = false;
    S.ui.chat.classList.remove('open');
    S.ui.input.value = '';
    try { S.ui.input.blur(); } catch (e) {}
    if (S.ui.hadLock) {
      const cv = document.getElementById('three-canvas') || (typeof canvas !== 'undefined' ? canvas : null);
      try { cv && cv.requestPointerLock && cv.requestPointerLock(); } catch (e) {}
    }
  }
  function sendChat() {
    const text = S.ui.input.value.trim();
    if (text) {
      if (text[0] === '/') S.tr.send({ t: 'cmd', text });
      else S.tr.send({ t: 'chat', text: text.slice(0, +S.cfg.chat.maxLen || 200) });
    }
    closeChat();
  }
  function chatLine(html, sys) {
    if (!S || !S.ui.log) return;
    const d = document.createElement('div');
    if (sys) d.className = 'pmp-sys';
    d.innerHTML = html;
    S.ui.log.appendChild(d);
    while (S.ui.log.children.length > 50) S.ui.log.firstChild.remove();
    S.ui.log.scrollTop = 1e9;
    setTimeout(() => d.classList.add('old'), 12000);
  }
  function badge() {
    const bd = S && S.ui.badge; if (!bd) return;
    const hp = (window.gameState && gameState.health != null) ? Math.round(gameState.health) : null;
    const mh = (typeof playerSettings !== 'undefined' && playerSettings.maxHealth) || 100;
    const sig = [S.self.nick, hp, S.players.size, S.max, S.ping].join('|');
    if (sig === S.ui.badgeSig) return;
    S.ui.badgeSig = sig;
    bd.innerHTML = `<span>${S.self.admin ? '★ ' : '👤 '}${esc(S.self.nick)}</span>` +
      (hp != null ? `<span>❤ <span class="hp"><i style="width:${clamp(hp / mh, 0, 1) * 100}%"></i></span></span>` : '') +
      `<span>👥 ${S.players.size + 1}/${S.max}</span><span>${S.ping != null ? S.ping + 'ms' : ''}</span>`;
  }
  function blockScreen(text) {
    rm('pmp-block');
    const d = document.createElement('div');
    d.id = 'pmp-block';
    d.textContent = text;
    document.body.appendChild(d);
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
  }

  // ============================================================
  //  📨 SERVER XABARLARI (o'yin paytida)
  // ============================================================
  function onMsg(m) {
    if (!S) return;
    switch (m.t) {
      case 's': {
        const pl = S.players.get(m.id);
        if (!pl || !Array.isArray(m.p)) return;
        pl.buf.push({ t: now(), p: m.p, r: +m.r || 0 });
        if (pl.buf.length > 20) pl.buf.shift();
        if (m.hp != null) pl.hp = m.hp;
        if (m.mh != null) pl.mh = m.mh;
        break;
      }
      case 'join':
        addPlayer(m.player);
        if (S.cfg.chat.joinLeave) chatLine(`➕ <b>${esc(m.player.nick)}</b> o'yinga kirdi`, true);
        break;
      case 'leave': {
        const pl = S.players.get(m.id);
        if (!pl) return;
        dropPuppet(pl);
        S.players.delete(m.id);
        if (S.cfg.chat.joinLeave) chatLine(`➖ <b>${esc(pl.nick)}</b> chiqib ketdi`, true);
        break;
      }
      case 'chat':
        chatLine(`<b class="${m.admin ? 'adm' : ''}">${m.admin ? '★ ' : ''}${esc(m.nick)}:</b> ${esc(m.text)}`);
        break;
      case 'sys':
        chatLine(esc(m.text), true);
        break;
      case 'admin':
        S.self.admin = !!m.on;
        chatLine(m.on ? '★ Siz endi adminsiz' : 'Admin huquqi olindi', true);
        break;
      case 'ev':
        try { APEX.net._dispatch(m.n, m.d, { local: false, from: m.id }); } catch (e) {}
        break;
      case 'pong':
        S.ping = Math.round(now() - m.c);
        break;
      case 'kicked':
        S.kicked = true;
        blockScreen(m.reason === 'ban' ? "⛔ Siz o'yindan chetlatildingiz (ban)" : "⛔ Siz o'yindan chiqarildingiz");
        S.tr.close();
        break;
    }
  }

  // ============================================================
  //  ▶ ISH VAQTI
  // ============================================================
  const runtime = {
    async beforePlay() {
      const m = mgr();
      if (!m) return true;
      const c = cfg();
      if (!c.enabled) return true;
      const B = BACKENDS[c.backend];
      if (!B || !B.ready) {
        say(`⚠ "${B ? B.name : c.backend}" hali ulanmagan — Node.js + WebSocket ni tanlang`, 'lw');
        return false;
      }
      if (S) runtime.onPlayStop();
      return loginFlow(c);
    },

    onPlayStart() {
      if (!_pending) return;
      const c = cfg();
      const { tr, welcome: w, nick } = _pending;
      _pending = null;
      const me = player();

      S = { tr, cfg: c, self: { id: w.id, nick: w.nick || nick, admin: !!w.admin, prof: w.prof, spawn: w.spawn },
            players: new Map(), max: w.max || c.maxPlayers, ping: null,
            ui: {}, sendAcc: 0, pingAcc: 0, hidden: [], group: null, template: null,
            half: new THREE.Vector3(0.4, 0.9, 0.4) };

      // O'yinchi o'lchami va standart ko'rinish (skin qo'yilishidan OLDIN)
      if (me) {
        const b = new THREE.Box3().setFromObject(me);
        if (!b.isEmpty()) { b.getSize(S.half); S.half.multiplyScalar(0.5); }
        S.template = stripClone(me);
        S.template.position.set(0, 0, 0); S.template.rotation.set(0, 0, 0);
      }

      // Model manbalari va server obyekti o'yinda ko'rinmasin, to'sib turmasin
      const hide = o => {
        if (!o) return;
        S.hidden.push({ o, vis: o.visible, cm: o.userData.colliderMode });
        o.visible = false;
        o.userData.colliderMode = 'inline';
      };
      hide(mgr());
      c.modelIds.forEach(id => hide(byId(id)));

      // O'z modelim
      if (w.prof >= 0 && c.modelIds[w.prof] != null && window.PlayerModelSystem) {
        try { PlayerModelSystem.apply(c.modelIds[w.prof], {}); } catch (e) { console.error(e); }
      }
      // O'z spawn nuqtam
      if (me && w.spawn >= 0) {
        const p = spawnPos(spawnList(c)[w.spawn], S.half.y);
        if (p) {
          me.position.copy(p);
          if (window.PlayerController && PlayerController.vel) PlayerController.vel.set(0, 0, 0);
        }
      }

      S.group = new THREE.Group();
      S.group.name = '__proton_players__';
      S.group.userData = { _mpPuppet: true };
      scene.add(S.group);

      // 🌐 APEX.net — tarmoq versiyasi. Boshqa addonlar hodisalarni
      //   shu orqali yuboradi; mahalliy ishlovchilar ham chaqiriladi.
      APEX.net.provide({
        provider: ID,
        emit(name, data) {
          APEX.net._dispatch(name, data, { local: true, from: S ? S.self.id : null });
          if (S) S.tr.send({ t: 'ev', n: String(name), d: data });
        },
        players: () => (S ? [...S.players.values()].map(p => ({ id: p.id, nick: p.nick, admin: p.admin })) : []),
        self: () => (S ? Object.assign({}, S.self) : null),
      });

      (w.players || []).forEach(addPlayer);
      buildUI();
      tr.onMessage(onMsg);
      tr.onClose(() => {
        if (!S || S.kicked) return;
        S.lost = true;
        chatLine('⚠ Server bilan aloqa uzildi', true);
        for (const pl of S.players.values()) dropPuppet(pl);
        S.players.clear();
        say('⚠ Server bilan aloqa uzildi', 'lw');
      });
      chatLine(`🛰 ${esc(S.self.nick)} — xush kelibsiz! ${c.chat.enabled ? `Chat: <b>${esc(String(c.chat.key).toUpperCase())}</b>` : ''}`, true);
      say(`${S.self.nick} sifatida kirildi (${S.players.size + 1}/${S.max})`);
    },

    onUpdate(api, dt) {
      if (!S || S.lost) return;
      const me = player();
      S.sendAcc += dt;
      if (me && S.sendAcc >= 1 / SEND_HZ) {
        S.sendAcc = 0;
        const r3 = v => Math.round(v * 1000) / 1000;
        const hp = (window.gameState && gameState.health != null) ? Math.round(gameState.health) : null;
        const mh = (typeof playerSettings !== 'undefined' && playerSettings.maxHealth) || 100;
        S.tr.send({ t: 's', p: [r3(me.position.x), r3(me.position.y), r3(me.position.z)],
                    r: r3(me.rotation.y), hp, mh });
      }
      S.pingAcc += dt;
      if (S.pingAcc >= 2) { S.pingAcc = 0; S.tr.send({ t: 'ping', c: now() }); }
      updatePuppets();
      badge();
    },

    onPlayStop() {
      if (_pending) { try { _pending.tr.close(); } catch (e) {} _pending = null; }
      if (!S) return;
      try { S.tr.send({ t: 'leave' }); } catch (e) {}
      S.tr.close();
      for (const pl of S.players.values()) dropPuppet(pl);
      if (S.group && S.group.parent) S.group.parent.remove(S.group);
      if (S.ui.onKey) window.removeEventListener('keydown', S.ui.onKey, true);
      ['pmp-chat', 'pmp-chatbtn', 'pmp-badge', 'pmp-block'].forEach(rm);
      S.hidden.forEach(h => { h.o.visible = h.vis; h.o.userData.colliderMode = h.cm; });
      S = null;
    },
  };

  // ============================================================
  //  🧰 REDAKTOR — asboblar va panel
  // ============================================================
  function ensureMgr(api) {
    let m = mgr();
    if (m) return m;
    m = api.spawn.primitive('Kub', '🌐 Proton Server');
    api.place(m, api.frontOfCamera(3));
    m.scale.set(0.5, 0.5, 0.5);
    m.userData.colliderMode = 'inline';
    m.userData.protonMP = JSON.parse(JSON.stringify(DEF));
    api.markUse(m);
    return m;
  }
  function edit(fn, label) {
    const m = mgr(); if (!m) return;
    const c = merge(DEF, m.userData.protonMP);
    fn(c);
    m.userData.protonMP = c;
    if (!m.userData.addonUse || !m.userData.addonUse.includes(ID)) {
      m.userData.addonUse = (m.userData.addonUse || []).concat(ID);
    }
    if (label && typeof captureState === 'function') { try { captureState('🛰 ' + label); } catch (e) {} }
  }
  const sel = () => (typeof selectedObj !== 'undefined' ? selectedObj : window.selectedObj) || null;

  const tools = [
    { id: 'server', icon: '🌐', name: "Proton Server qo'yish",
      desc: "Sahnaga sozlamalar obyektini qo'yadi (bitta bo'ladi)",
      run(api) { const had = !!mgr(); const m = ensureMgr(api); api.select && api.select(m); api.refresh();
                 api.log(had ? 'Proton Server allaqachon bor — tanlandi' : "Proton Server qo'yildi"); } },
    { id: 'spawn-cam', icon: '📍', name: "Spawn: kamera oldiga",
      desc: "Kamera oldidagi nuqtani spawn ro'yxatiga qo'shadi",
      run(api) { ensureMgr(api); const p = api.frontOfCamera(4);
                 edit(c => c.spawnXYZ.push({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }));
                 api.refresh(); api.log('📍 Spawn nuqta qo\'shildi'); rerender(); } },
    { id: 'spawn-sel', icon: '🎯', name: 'Spawn: tanlangan obyekt',
      desc: "O'yinchi shu obyekt tepasida paydo bo'ladi",
      run(api) { const o = sel(); if (!o || o.userData.protonMP) return api.log('⚠ Avval obyektni tanlang', 'lw');
                 ensureMgr(api); edit(c => { if (!c.spawnIds.map(String).includes(String(o.userData.id))) c.spawnIds.push(o.userData.id); });
                 api.log('🎯 Spawn: ' + o.userData.name); rerender(); } },
    { id: 'model-sel', icon: '🧍', name: 'Model: tanlangan obyekt',
      desc: "O'yinchilar shu ko'rinishda paydo bo'ladi",
      run(api) { const o = sel(); if (!o || o.userData.protonMP) return api.log('⚠ Avval model obyektini tanlang', 'lw');
                 if (o.userData.isPlayerObj) return api.log("⚠ O'yinchining o'zini model qilib bo'lmaydi", 'lw');
                 ensureMgr(api); edit(c => { if (!c.modelIds.map(String).includes(String(o.userData.id))) c.modelIds.push(o.userData.id); });
                 api.log('🧍 Model: ' + o.userData.name); rerender(); } },
  ];

  let _panelBox = null, _panelApi = null;
  function rerender() { if (_panelBox && _panelBox.isConnected) panel(_panelBox, _panelApi); }

  // Panel tugmalari uchun global kirish nuqtasi
  window.__pmp = {
    set(path, val, label) {
      edit(c => {
        const ks = path.split('.'); let o = c;
        for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] = Object.assign({}, o[ks[i]]);
        o[ks[ks.length - 1]] = val;
      }, label || path);
    },
    del(list, i) { edit(c => { c[list].splice(i, 1); }, 'o\'chirish'); rerender(); },
    lines(path, text) { this.set(path, String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean)); },
    tool(id) {
      const t = tools.find(x => x.id === id);
      if (!t || !_panelApi) return;
      t.run(_panelApi);
      if (typeof captureState === 'function') { try { captureState('🛰 ' + t.name); } catch (e) {} }
    },
    async test() {
      const out = document.getElementById('pmp-test'); const c = cfg();
      if (out) out.textContent = 'Tekshirilmoqda…';
      const B = BACKENDS[c.backend];
      if (!B || !B.ready) { if (out) out.textContent = '⚠ Bu backend hali ulanmagan'; return; }
      const tr = B.make(c); const t0 = now();
      try {
        await tr.connect();
        const info = await new Promise((res, rej) => {
          const to = setTimeout(() => rej(new Error('javob yo\'q')), 5000);
          tr.onMessage(m => { if (m.t === 'hello') { clearTimeout(to); res(m); } });
          tr.send({ t: 'hello', v: PROTO });
        });
        if (out) out.textContent = `✅ Ulandi · ${Math.round(now() - t0)}ms · ${info.name || 'server'} v${info.v} · xonalar: ${info.rooms}`;
      } catch (e) { if (out) out.textContent = '❌ ' + e.message; }
      tr.close();
    },
    copyServerConfig() {
      const c = cfg();
      const txt = JSON.stringify({ port: 8090, maxPlayersCap: 64, adminKey: '', admins: c.admins, bans: c.bans }, null, 2);
      const done = () => say('📋 proton.config.json nusxalandi — serverdagi faylga qo\'ying');
      try { navigator.clipboard.writeText(txt).then(done, () => prompt('proton.config.json:', txt)); }
      catch (e) { prompt('proton.config.json:', txt); }
    },
  };

  function panel(box, api) {
    _panelBox = box; _panelApi = api;
    if (!(window.APEX && APEX.version >= 2 && APEX.net)) {
      box.innerHTML = `<div style="font-size:10px;color:#ff6b6b;line-height:1.6;padding:6px 8px;border:1px solid rgba(255,107,107,.4);border-radius:3px">
        ⚠ Dvigatel eski — addon API v2 yo'q. Sozlash mumkin, lekin ▶ da multiplayer
        <b>ishlamaydi</b>. APEX 58.101 yoki yangisini oling.</div>`;
      return;
    }
    const m = mgr();
    const S_ = 'font-size:10px;color:var(--muted);margin:10px 0 4px;font-weight:700;letter-spacing:.5px';
    const I_ = 'width:100%;box-sizing:border-box;background:rgba(0,0,0,.25);border:1px solid var(--border);color:var(--text);font-size:11px;padding:4px 6px;border-radius:3px';
    const R_ = 'display:flex;gap:6px;align-items:center;margin:3px 0;font-size:10px;color:var(--text)';
    const B_ = 'background:rgba(160,120,255,.1);border:1px solid rgba(160,120,255,.35);color:#a078ff;font-size:10px;padding:4px 7px;border-radius:3px;cursor:pointer';
    if (!m) {
      box.innerHTML = `<div style="font-size:10px;color:var(--muted);line-height:1.6;padding:6px 0">
        Sahnada hali <b>🌐 Proton Server</b> yo'q. Sozlamalar shu obyektda saqlanadi.</div>
        <button style="${B_}" onclick="__pmp.tool('server')">🌐 Proton Server qo'yish</button>`;
      return;
    }
    const c = cfg();
    const sel_ = (path, val, opts) => `<select style="${I_}" onchange="__pmp.set('${path}', this.value)">${
      opts.map(([v, n, dis]) => `<option value="${v}" ${v === val ? 'selected' : ''} ${dis ? 'disabled' : ''}>${esc(n)}</option>`).join('')}</select>`;
    const chk = (path, val, label) => `<label style="${R_}"><input type="checkbox" ${val ? 'checked' : ''}
      onchange="__pmp.set('${path}', this.checked)"> ${label}</label>`;
    const txt = (path, val, ph, type) => `<input style="${I_}" type="${type || 'text'}" value="${esc(val)}" placeholder="${esc(ph || '')}"
      onchange="__pmp.set('${path}', ${type === 'number' ? '+this.value' : 'this.value'})">`;
    const nameOf = id => { const o = byId(id); return o ? o.userData.name : `⚠ topilmadi (${id})`; };
    const row = (label, list, i) => `<div style="${R_};justify-content:space-between;background:rgba(0,0,0,.18);padding:3px 6px;border-radius:3px">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</span>
      <button style="${B_};padding:1px 5px" onclick="__pmp.del('${list}', ${i})">✕</button></div>`;

    box.innerHTML = `
      <div style="${S_}">🌐 ULANISH</div>
      ${chk('enabled', c.enabled, 'Multiplayer yoqilgan')}
      ${sel_('backend', c.backend, Object.entries(BACKENDS).map(([k, b]) => [k, b.name + (b.ready ? '' : ' — 3-bosqich'), !b.ready]))}
      <div style="margin-top:4px">${txt('url', c.url, 'ws://localhost:8090')}</div>
      <div style="${R_}"><span style="min-width:48px">Xona</span>${txt('room', c.room, 'apex')}</div>
      <div style="${R_}"><button style="${B_}" onclick="__pmp.test()">🔌 Tekshirish</button>
        <span id="pmp-test" style="font-size:9px;color:var(--muted)"></span></div>

      <div style="${S_}">👥 O'YINCHILAR</div>
      <div style="${R_}"><span style="min-width:90px">Maks. o'yinchi</span>
        <input style="${I_}" type="number" min="2" max="64" value="${c.maxPlayers}"
          onchange="__pmp.set('maxPlayers', Math.max(2, Math.min(64, +this.value || 2)))"></div>
      <div style="${R_}"><span style="min-width:90px">Model tanlash</span>${sel_('profileMode', c.profileMode,
        [['single', 'Bitta (birinchisi)'], ['random', 'Tasodifiy'], ['sequential', 'Navbat bilan']])}</div>
      ${c.modelIds.length ? c.modelIds.map((id, i) => row('🧍 ' + nameOf(id), 'modelIds', i)).join('')
        : `<div style="font-size:9px;color:var(--muted)">Model yo'q — o'yinchi o'z ko'rinishida.</div>`}
      <button style="${B_};margin-top:3px" onclick="__pmp.tool('model-sel')">➕ Tanlangan obyekt — model</button>

      <div style="${R_};margin-top:8px"><span style="min-width:90px">Spawn tanlash</span>${sel_('spawnMode', c.spawnMode,
        [['random', 'Tasodifiy'], ['sequential', 'Navbat bilan'], ['farthest', 'Boshqalardan eng uzoq']])}</div>
      ${c.spawnXYZ.map((p, i) => row(`📍 ${p.x}, ${p.y}, ${p.z}`, 'spawnXYZ', i)).join('')}
      ${c.spawnIds.map((id, i) => row('🎯 ' + nameOf(id), 'spawnIds', i)).join('')}
      ${!c.spawnXYZ.length && !c.spawnIds.length ? `<div style="font-size:9px;color:var(--muted)">Spawn nuqta yo'q — dvigatelning odatiy spawni.</div>` : ''}
      <div style="display:flex;gap:4px;margin-top:3px">
        <button style="${B_}" onclick="__pmp.tool('spawn-cam')">➕ Kamera oldi</button>
        <button style="${B_}" onclick="__pmp.tool('spawn-sel')">➕ Tanlangan obyekt</button></div>

      <div style="${S_}">🧱 TO'QNASHUV</div>
      <div style="${R_}"><span style="min-width:90px">O'yinchi ↔ o'yinchi</span>${sel_('collidePlayers', c.collidePlayers,
        [['block', 'block — to\'qnashadi'], ['inline', 'inline — o\'tib ketadi']])}</div>

      <div style="${S_}">💬 CHAT</div>
      ${chk('chat.enabled', c.chat.enabled, 'Chat yoqilgan')}
      ${c.chat.enabled ? `
        <div style="${R_}"><span style="min-width:90px">Ochish tugmasi</span>
          <input style="${I_}" maxlength="1" value="${esc(c.chat.key)}" onchange="__pmp.set('chat.key', (this.value||'t').toLowerCase())"></div>
        <div style="${R_}"><span style="min-width:90px">Xabar uzunligi</span>${txt('chat.maxLen', c.chat.maxLen, '200', 'number')}</div>
        ${chk('chat.joinLeave', c.chat.joinLeave, 'Kirdi / chiqdi xabarlari')}` : ''}

      <div style="${S_}">🏷 NIK VA JON</div>
      <div style="${R_}"><span style="min-width:90px">Nik ko'rinishi</span>${sel_('tags.mode', c.tags.mode,
        [['always', 'Har doim'], ['near', 'Faqat yaqinda'], ['hidden', 'Yashirin']])}</div>
      ${c.tags.mode === 'near' ? `<div style="${R_}"><span style="min-width:90px">Masofa (m)</span>${txt('tags.dist', c.tags.dist, '25', 'number')}</div>` : ''}
      ${chk('tags.hp', c.tags.hp, 'Tepada jon shkalasi')}
      ${chk('tags.throughWalls', c.tags.throughWalls, 'Devor orqali ko\'rinsin')}
      ${chk('tags.selfBadge', c.tags.selfBadge, "O'z nikim va jonim (pastda)")}

      <div style="${S_}">🔑 KIRISH OYNASI</div>
      <div style="${R_}"><span style="min-width:90px">Sarlavha</span>${txt('login.title', c.login.title)}</div>
      <div style="${R_}"><span style="min-width:90px">Nik uzunligi</span>
        <input style="${I_}" type="number" value="${c.login.nickMin}" onchange="__pmp.set('login.nickMin', +this.value)">
        <input style="${I_}" type="number" value="${c.login.nickMax}" onchange="__pmp.set('login.nickMax', +this.value)"></div>
      <div style="font-size:9px;color:var(--muted);margin:4px 0 2px">CSS (#pmp-login, #pmp-nick, #pmp-join, #pmp-error…)</div>
      <textarea style="${I_};height:60px;font-family:monospace" onchange="__pmp.set('login.css', this.value)">${esc(c.login.css)}</textarea>

      <div style="${S_}">🛡 ADMIN VA BAN</div>
      <div style="font-size:9px;color:#ffaa44;line-height:1.5;margin-bottom:4px">⚠ Bu ro'yxatlarni SERVER tekshiradi — o'yin faylidagisi
        o'zi yetarli emas. Nusxalab, serverdagi proton.config.json ga qo'ying.</div>
      <div style="font-size:9px;color:var(--muted)">Adminlar (har qatorda bitta nik)</div>
      <textarea style="${I_};height:44px" onchange="__pmp.lines('admins', this.value)">${esc(c.admins.join('\n'))}</textarea>
      <div style="font-size:9px;color:var(--muted);margin-top:4px">Bloklangan niklar</div>
      <textarea style="${I_};height:44px" onchange="__pmp.lines('bans', this.value)">${esc(c.bans.join('\n'))}</textarea>
      <button style="${B_};margin-top:4px" onclick="__pmp.copyServerConfig()">📋 proton.config.json nusxalash</button>`;
  }

  // ── Testlar va debug uchun ──────────────────────────────────
  window.ProtonMP = { DEF, BACKENDS, cfg, sceneHash, nickError, spawnList, spawnPos, merge, stripClone,
                      session: () => S, runtime };

  // ⚠ Addon dvigatelning API v2 siga tayanadi (runtime hook'lar, APEX.net,
  //   o'yinchi to'qnashuvi uchun APEX.net.colliders). Eski dvigatelda
  //   asboblar ishlaydi, lekin ▶ da multiplayer ishga TUSHMASDI — jimgina.
  //   Shuning uchun ochiq ogohlantiramiz.
  const API_OK = (window.APEX && APEX.version >= 2 && APEX.net && Array.isArray(APEX.net.colliders));
  if (!API_OK) {
    say("⚠ Bu dvigatel eski (addon API v2 yo'q) — multiplayer o'yinda ishlamaydi. APEX 58.101 yoki yangisini oling.", 'lw');
  }

  APEX.register({
    id: ID, name: 'Proton Multiplayer', icon: '🛰', version: '0.1.0', author: 'APEX',
    description: "Ko'p o'yinchi: nik, spawn, model, qo'g'irchoqlar, nik va jon, chat, to'qnashuv.",
    netAware: true,
    tools, panel, runtime,
  });
})();
