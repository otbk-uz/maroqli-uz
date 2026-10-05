// ============================================================
// ⌨️ GAME COMMANDS — o'yin konsoli komandalari
// ------------------------------------------------------------
//  `game-console.js` faqat OYNA va kiritish qatorini beradi.
//  Komandalarning o'zi shu yerда — dvigatelning mavjud tizimlariga
//  ulanadi (`addObject`, `HitboxSystem`, `RainSystem`, `PrefabSystem`…).
//
//  ⚠ MUHIM TAMOYIL: bu fayl HECH QANDAY o'yin mantig'ini qaytadan
//    yozmaydi. Har bir komanda dvigatelning o'z funksiyasini
//    chaqiradi. Aks holda konsol orqali yaratilgan obyekt redaktor
//    orqali yaratilganidan farq qilib qolardi (id, fizika, ierarxiya,
//    saqlash — hammasi buzilardi).
//
//  Har joyda NOM O'RNIGA ID ishlatish mumkin: `remove.object(7)`.
//
//  Koordinatalar Minecraft uslubida:
//     5      — aniq koordinata
//     ~      — o'yinchining joriy koordinatasi
//     ~3     — o'yinchidan +3
// ============================================================

(function () {
  'use strict';

  if (typeof window.GameConsole === 'undefined') return;   // konsolsiz kerak emas
  const GC  = window.GameConsole;
  const say = GC.say;

  const OK   = m => say('✅ ' + m, 'lok');
  const WARN = m => say('⚠ '  + m, 'lw');
  const ERR  = m => say('❌ ' + m, 'le');
  const INFO = m => say('   ' + m, 'lg');

  // ══════════════════════════════════════════════════════════
  //  YORDAMCHILAR
  // ══════════════════════════════════════════════════════════

  /** O'yinchi (yoki kamera) pozitsiyasi — `~` uchun tayanch. */
  function selfPos() {
    try {
      if (window.PlayerController && PlayerController.obj && PlayerController.obj.parent)
        return PlayerController.obj.position;
      if (typeof playerMesh !== 'undefined' && playerMesh && playerMesh.parent)
        return playerMesh.position;
      if (typeof camera !== 'undefined' && camera) return camera.position;
    } catch (e) {}
    return new THREE.Vector3();
  }

  /** `~`, `~5`, `12` → son. */
  function coord(tok, base) {
    if (tok == null) return base;
    const s = String(tok);
    if (s.charAt(0) === '~') {
      const r = s.slice(1);
      return base + (r === '' ? 0 : (parseFloat(r) || 0));
    }
    const v = parseFloat(s);
    return isFinite(v) ? v : base;
  }

  /** args[i..i+2] dan pozitsiya. Berilmasa — o'yinchining joyi. */
  function readPos(args, i) {
    const p = selfPos();
    return new THREE.Vector3(
      coord(args[i],     p.x),
      coord(args[i + 1], p.y),
      coord(args[i + 2], p.z));
  }

  function num(tok, def) {
    const v = parseFloat(tok);
    return isFinite(v) ? v : def;
  }
  /** `1`, `0`, `on`, `off`, `true`, `yoq`, `ochir` */
  function bool(tok, def) {
    if (tok == null) return def;
    const s = String(tok).toLowerCase();
    if (s === '1' || s === 'on'  || s === 'true'  || s === 'yoq' || s === 'ha')  return true;
    if (s === '0' || s === 'off' || s === 'false' || s === 'ochir' || s === "yo'q") return false;
    return def;
  }

  /** Sahnadagi obyektni NOM yoki ID bo'yicha topadi. */
  function findObj(tok, quiet) {
    if (tok == null) { if (!quiet) ERR('Obyekt nomi yoki id kerak'); return null; }
    const s = String(tok).trim();
    if (/^\d+$/.test(s)) {
      const byId = objects.find(o => o.userData && String(o.userData.id) === s);
      if (byId) return byId;
    }
    const low  = s.toLowerCase();
    const nm   = o => String((o.userData && o.userData.name) || '').toLowerCase();
    let c = objects.filter(o => nm(o) === low);
    if (!c.length) c = objects.filter(o => nm(o).indexOf(low) === 0);
    if (!c.length) c = objects.filter(o => nm(o).indexOf(low) >= 0);
    if (!c.length) {
      if (!quiet) ERR(`"${s}" topilmadi. \`list\` bilan ro'yxatni ko'ring.`);
      return null;
    }
    if (c.length > 1 && !quiet) {
      WARN(`"${s}" ga ${c.length} ta mos keldi — birinchisi olindi: ` +
           c.slice(0, 4).map(o => `${o.userData.name} (id ${o.userData.id})`).join(', '));
    }
    return c[0];
  }

  /** Rang: `255 0 0`, `#ff0000`, `red` */
  function readColor(args, i) {
    const a = args[i];
    if (a == null) return null;
    if (String(a).charAt(0) === '#') return new THREE.Color(String(a));
    if (/^[a-z]+$/i.test(String(a)) && !/^\d/.test(String(a))) {
      try { return new THREE.Color(String(a).toLowerCase()); } catch (e) { return null; }
    }
    const r = num(args[i], 255), g = num(args[i + 1], 255), b = num(args[i + 2], 255);
    // 0..255 ham, 0..1 ham qabul qilinsin
    const mx = Math.max(r, g, b);
    const k = (mx > 1) ? 255 : 1;
    return new THREE.Color(r / k, g / k, b / k);
  }

  function refreshUI() {
    try { if (typeof updateHierarchy === 'function') updateHierarchy(); } catch (e) {}
    try { if (typeof updateStats     === 'function') updateStats();     } catch (e) {}
  }

  /** Yangi qo'shilgan ildiz obyektni topadi (yaratuvchilar turlicha qaytaradi). */
  function newestSince(beforeSet) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      if (!beforeSet.has(o)) {
        let root = o;
        while (root.parent && beforeSet.has(root.parent) === false &&
               root.parent.userData && root.parent.userData.id != null) root = root.parent;
        return root;
      }
    }
    return null;
  }


  // ══════════════════════════════════════════════════════════
  //  AVTOTO'LDIRISH UCHUN MASLAHATCHILAR
  // ══════════════════════════════════════════════════════════
  //  Har bir komanda `hint(done, partial)` beradi: `done` — allaqachon
  //  yozilgan argumentlar, `partial` — yozilayotgan bo'lak.
  //  Qaytadigan matn AYNAN kiritish qatoriga qo'yiladi, shuning uchun
  //  bo'shliqli nomlar qo'shtirnoq bilan beriladi.

  /** Sahnadagi obyektlar: `"Nom"` va id. */
  function objHints(filter) {
    const out = [];
    (typeof objects !== 'undefined' ? objects : []).forEach(o => {
      const u = o.userData; if (!u || u.id == null) return;
      if (filter && !filter(o)) return;
      const nm = u.name || ('#' + u.id);
      out.push({ text: '"' + nm + '"', desc: 'id ' + u.id + (u.type ? ' · ' + u.type : '') });
    });
    return out.slice(0, 30);
  }

  const BOOL_HINTS = [{ text: '1', desc: 'yoqish' }, { text: '0', desc: "o'chirish" }];

  /** Nechanchi argument yozilayotganini beradi. */
  const argN = done => done.length;

  // ══════════════════════════════════════════════════════════
  //  create.object
  // ══════════════════════════════════════════════════════════

  // Ierarxiyaga qo'shiladigan HAMMA narsa: primitivlar + entity bloklar
  const ENTITY_MAKERS = {
    pc: 'addPCBlock', kompyuter: 'addPCBlock', computer: 'addPCBlock',
    kamera: 'addCameraObject', camera: 'addCameraObject',
    hitbox: 'addHitboxObject', hitboks: 'addHitboxObject', zona: 'addHitboxObject',
    tugma: 'addInteractiveButton', button: 'addInteractiveButton', knopka: 'addInteractiveButton',
    qarash: 'addGazeTrigger', gaze: 'addGazeTrigger', see: 'addGazeTrigger',
    maploader: 'addMapLoader', map: 'addMapLoader', karta: 'addMapLoader',
    sound: 'addSoundBlock', ovoz: 'addSoundBlock', soundblock: 'addSoundBlock',
    gravitygun: 'addGravityGun', gun: 'addGravityGun', qurol: 'addGravityGun',
    narvon: 'addLadder', ladder: 'addLadder',
    start: 'addStartBlock', finish: 'addFinishBlock',
    matn: 'addTextBlock', text: 'addTextBlock',
    yol: 'addPath', path: 'addPath',
    yulduz: 'addStars', stars: 'addStars',
  };

  function primIndex(name) {
    if (typeof PRIMITIVES === 'undefined') return -1;
    const low = String(name).toLowerCase();
    let i = PRIMITIVES.findIndex(p => p.name.toLowerCase() === low);
    if (i < 0) i = PRIMITIVES.findIndex(p => p.name.toLowerCase().indexOf(low) === 0);
    return i;
  }

  GC.register('create.object', (args) => {
    const what = args[0];
    if (!what) { ERR('Nima yaratilsin? Masalan: create.object("Kub") ~ ~ ~'); return; }
    const pos = readPos(args, 1);
    const before = new Set(objects);
    let obj = null;

    const pi = primIndex(what);
    if (pi >= 0) {
      obj = addObject(pi);                       // ⚠ dvigatelning o'z funksiyasi
    } else {
      const key = String(what).toLowerCase().replace(/[\s_-]/g, '');
      const fn  = ENTITY_MAKERS[key];
      if (!fn || typeof window[fn] !== 'function') {
        ERR(`"${what}" — bunday obyekt yo'q.`);
        INFO('Primitivlar: ' + (typeof PRIMITIVES !== 'undefined'
          ? PRIMITIVES.map(p => p.name).join(', ') : '—'));
        INFO('Entity: ' + Object.keys(ENTITY_MAKERS).join(', '));
        return;
      }
      window[fn]();
      obj = newestSince(before);
    }

    if (!obj) { ERR('Yaratildi, lekin obyekt topilmadi'); return; }
    obj.position.copy(pos);
    obj.updateMatrixWorld(true);
    refreshUI();
    OK(`${obj.userData.name} (id ${obj.userData.id}) → ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}`);
  }, 'obyekt yaratadi', 'create.object("Kub") ~ ~ ~', {
    forms: ['create.object("Kub") ~ ~ ~', 'create.object("Sfera") ~ ~ ~', 'create.object("hitbox") ~ ~ ~'],
    hint: (done) => argN(done) === 0
      ? (typeof PRIMITIVES !== 'undefined' ? PRIMITIVES.map(pr => ({ text: '"' + pr.name + '"', desc: 'primitiv' })) : [])
          .concat(Object.keys(ENTITY_MAKERS).map(k => ({ text: '"' + k + '"', desc: 'entity' })))
      : [{ text: '~', desc: "o'yinchi joyi" }, { text: '~5', desc: 'undan +5' }, { text: '0', desc: 'aniq' }],
  });

  // ══════════════════════════════════════════════════════════
  //  remove.object
  // ══════════════════════════════════════════════════════════
  GC.register('remove.object', (args) => {
    const o = findObj(args[0]);
    if (!o) return;
    if (typeof _isGroundObj === 'function' && _isGroundObj(o)) { ERR('Zaminni o\'chirib bo\'lmaydi'); return; }
    const nm = o.userData.name;
    // ⚠ O'zimiz o'chirmaymiz: `multiDelete()` fizika tanasi, bolalar,
    //   outline va GPU xotirasini ham tozalaydi. Qo'lda o'chirsak
    //   "arvoh" elementlar qolib ketardi.
    if (typeof clearMultiSelect === 'function') clearMultiSelect();
    if (typeof addToMultiSelect === 'function' && typeof multiDelete === 'function') {
      addToMultiSelect(o);
      multiDelete();
    } else {
      if (o.parent) o.parent.remove(o);
      const i = objects.indexOf(o); if (i > -1) objects.splice(i, 1);
      refreshUI();
    }
    OK(`${nm} o'chirildi`);
  }, 'obyektni o\'chiradi', 'remove.object("Kub 3")', {
    forms: ['remove.object("nom")'],
    hint: (done) => argN(done) === 0 ? objHints() : [],
  });

  // ══════════════════════════════════════════════════════════
  //  object.source — obyekt xossalari
  // ══════════════════════════════════════════════════════════
  GC.register('object.source', (args) => {
    const o = findObj(args[0]);
    if (!o) return;
    const sub = String(args[1] || '').toLowerCase();
    const a = args.slice(2);

    if (sub === 'color' || sub === 'rang') {
      const c = readColor(a, 0);
      if (!c) { ERR('Rang kerak: 255 0 0 yoki #ff0000'); return; }
      let n = 0;
      o.traverse(ch => {
        if (!ch.isMesh || !ch.material) return;
        const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
        mats.forEach(m => { if (m.color) { m.color.copy(c); m.needsUpdate = true; n++; } });
      });
      OK(`${o.userData.name} rangi o'zgardi (${n} material)`);
      return;
    }

    if (sub === 'collision' || sub === 'coliziya' || sub === 'kolliziya') {
      const on = bool(a[0], true);
      o.userData.colliderMode = on ? 'block' : 'inline';
      OK(`${o.userData.name} to'qnashuvi: ${on ? '🧱 block (qattiq)' : '👻 inline (o\'tib ketiladi)'}`);
      return;
    }

    if (sub === 'damage' || sub === 'health' || sub === 'heal' || sub === 'jon') {
      if (typeof ObjectRoleSystem === 'undefined') { ERR('ObjectRoleSystem yo\'q'); return; }
      const r = ObjectRoleSystem.ensure(o);
      r.type    = 'health';
      r.enabled = true;
      r.mode    = (sub === 'heal' || sub === 'health') ? 'heal' : 'damage';
      r.interval = num(a[0], r.interval);
      r.amount   = num(a[1], r.amount);
      r.intervalUnit = 'sec';
      OK(`${o.userData.name}: ${r.mode === 'heal' ? '💚 davolash' : '💥 zarar'} ` +
         `${r.amount} hp / ${r.interval === 0 ? 'uzluksiz' : r.interval + ' sek'}`);
      return;
    }

    if (sub === 'physic' || sub === 'physics' || sub === 'fizika') {
      const on = bool(a[0], true);
      const rest = num(a[1], null), fric = num(a[2], null);
      let body = (typeof physBodies !== 'undefined') ? physBodies.find(b => b.mesh === o) : null;
      if (on && !body && typeof addPhysicsBody === 'function') {
        addPhysicsBody(o, {});
        body = physBodies.find(b => b.mesh === o);
      }
      if (!body) {
        if (!on) { OK(`${o.userData.name}: fizika allaqachon o'chiq`); return; }
        ERR('Fizika tanasi qo\'shilmadi'); return;
      }
      body.isStatic = !on;
      if (rest !== null) body.restitution = Math.max(0, Math.min(1, rest));
      if (fric !== null) body.friction    = Math.max(0, Math.min(1, fric));
      OK(`${o.userData.name}: fizika ${on ? 'yoniq' : "o'chiq"}` +
         `, sapchish ${body.restitution.toFixed(2)}, ishqalanish ${body.friction.toFixed(2)}`);
      return;
    }

    ERR('Xossa noma\'lum: ' + (sub || '—'));
    INFO('color | collision | damage | heal | physic');
  }, 'obyekt xossalari', 'object.source - Kub3 color 255 0 0', {
    forms: ['object.source - <obyekt> color 255 0 0',
            'object.source - <obyekt> collision 0',
            'object.source - <obyekt> damage 5 20',
            'object.source - <obyekt> heal 5 20',
            'object.source - <obyekt> physic 1 0.5 0.8'],
    hint: (done) => {
      if (argN(done) === 0) return objHints();
      if (argN(done) === 1) return [
        { text: 'color',     desc: 'R G B yoki #hex' },
        { text: 'collision', desc: '1 qattiq / 0 o\'tib ketiladi' },
        { text: 'damage',    desc: 'interval miqdor' },
        { text: 'heal',      desc: 'interval miqdor' },
        { text: 'physic',    desc: '1 sapchish ishqalanish' },
      ];
      const sub = String(done[1]).toLowerCase();
      if (sub === 'collision') return BOOL_HINTS;
      if (sub === 'physic' && argN(done) === 2) return BOOL_HINTS;
      return [];
    },
  });

  // ══════════════════════════════════════════════════════════
  //  object.collision-hitboks — to'qnashuv halqalarini ko'rsatish
  // ══════════════════════════════════════════════════════════
  //  ⚠ Bunday vizualizatsiya dvigatelda YO'Q edi. Bu yerда u
  //    to'qnashuv MATEMATIKASINI aynan takrorlaydi: sim quti
  //    obyektning O'ZIGA bola qilib qo'shiladi, shuning uchun
  //    burilish va masshtabni avtomatik meros oladi — ya'ni
  //    ko'rinayotgan halqa haqiqiy kolayder bilan bir xil bo'ladi.
  const CollisionDebug = {
    on: false,
    _wires: [],
    _colorFor(o) {
      const u = o.userData || {};
      if (u.isHitbox)          return 0x00e5ff;   // hitbox
      if (u.isGazeTrigger)     return 0xffaa00;   // qarash tetigi
      if (u.isButton || u.btnMode) return 0xff44aa;
      if (u.colliderMode === 'inline') return 0x445566;  // o'tib ketiladi
      return 0x39ff14;                            // oddiy devor
    },
    show() {
      this.hide();
      objects.forEach(o => {
        const u = o.userData || {};
        if (!o.parent || u.isPlayerObj) return;
        if (typeof _isGroundObj === 'function' && _isGroundObj(o)) return;
        const cs = u.colliderSize;
        const g = new THREE.BoxGeometry(cs ? cs.x : 1, cs ? cs.y : 1, cs ? cs.z : 1);
        const w = new THREE.LineSegments(
          new THREE.EdgesGeometry(g),
          new THREE.LineBasicMaterial({ color: this._colorFor(o), transparent: true,
                                        opacity: 0.85, depthTest: false }));
        w.renderOrder = 998;
        w.userData._noSave = true;
        w.name = '__collision_debug__';
        o.add(w);                 // ⬅ bola: burilish/masshtab meros oladi
        this._wires.push(w);
        g.dispose();
      });
      this.on = true;
      return this._wires.length;
    },
    hide() {
      this._wires.forEach(w => {
        if (w.parent) w.parent.remove(w);
        if (w.geometry) w.geometry.dispose();
        if (w.material) w.material.dispose();
      });
      this._wires = [];
      this.on = false;
    },
  };
  window.CollisionDebug = CollisionDebug;

  GC.register('object.collision-hitboks', (args) => {
    const on = bool(args[0], !CollisionDebug.on);
    if (on) {
      const n = CollisionDebug.show();
      OK(`To'qnashuv halqalari yoqildi — ${n} ta`);
      INFO('🟢 devor  🔵 hitbox  🟠 qarash  🩷 tugma  ⚫ inline (o\'tib ketiladi)');
    } else {
      CollisionDebug.hide();
      OK("To'qnashuv halqalari o'chirildi");
    }
  }, 'kolayderlarni ko\'rsatadi', 'object.collision-hitboks 1', {
    forms: ['object.collision-hitboks 1', 'object.collision-hitboks 0'],
    hint: () => BOOL_HINTS,
  });

  // ══════════════════════════════════════════════════════════
  //  sp.head — head look
  // ══════════════════════════════════════════════════════════
  GC.register('sp.head', (args) => {
    // sp.head 1 ("Kub 3")   yoki   sp.head ("Kub 3") 1
    let on, target;
    if (/^[01]$/.test(String(args[0]))) { on = bool(args[0], true); target = args[1]; }
    else { target = args[0]; on = bool(args[1], true); }
    const o = findObj(target);
    if (!o) return;
    if (!o.userData.headLook) o.userData.headLook = {};
    const c = o.userData.headLook;
    c.enabled  = on;
    if (c.target === undefined)   c.target   = 'player';
    if (c.mode === undefined)     c.mode     = 'static';
    if (c.behavior === undefined) c.behavior = 'always';
    if (c.onLost === undefined)   c.onLost   = 'freeze';
    if (c.speed === undefined)    c.speed    = 0.15;
    if (c.axis === undefined)     c.axis     = '+z';
    OK(`${o.userData.name}: o'yinchiga qarash ${on ? 'yoqildi 👁' : "o'chirildi"}`);
  }, 'obyekt o\'yinchiga qarab tursin', 'sp.head 1 ("Kub 3")', {
    forms: ['sp.head 1 ("nom")', 'sp.head 0 ("nom")'],
    hint: (done) => argN(done) === 0 ? BOOL_HINTS : objHints(),
  });

  // ══════════════════════════════════════════════════════════
  //  create.particles / create.lights
  // ══════════════════════════════════════════════════════════
  const PARTICLE_PRESETS = {
    olov:     { color: 0xff4400, speed: 0.06, size: 0.10, count: 400, spread: 0.04, mode: 'up', gravity: -0.001 },
    sehrli:   { color: 0x88aaff, speed: 0.04, size: 0.07, count: 300, spread: 0.08, mode: 'up' },
    qor:      { color: 0xccddff, speed: 0.02, size: 0.06, count: 500, spread: 0.12, mode: 'down', gravity: 0.001 },
    neon:     { color: 0x00ffaa, speed: 0.05, size: 0.08, count: 350, spread: 0.05, mode: 'up' },
    portlash: { color: 0xff8800, speed: 0.12, size: 0.12, count: 500, spread: 0.10, mode: 'explode' },
    vortex:   { color: 0xcc88ff, speed: 0.06, size: 0.08, count: 400, spread: 0.06, mode: 'vortex' },
    tornado:  { color: 0xaaddff, speed: 0.05, size: 0.07, count: 600, spread: 0.05, mode: 'tornado' },
    orbit:    { color: 0xffee00, speed: 0.06, size: 0.08, count: 300, spread: 0.04, mode: 'orbit' },
  };

  GC.register('create.particles', (args) => {
    if (typeof createParticleSystem !== 'function') { ERR('Zarrachalar tizimi yo\'q'); return; }
    const key = String(args[0] || 'olov').toLowerCase().replace(/[^a-z]/g, '');
    const preset = PARTICLE_PRESETS[key];
    if (!preset) {
      ERR(`"${args[0]}" — bunday zarracha yo'q`);
      INFO('Mavjud: ' + Object.keys(PARTICLE_PRESETS).join(', '));
      return;
    }
    const power = num(args[1], null);
    const rotY  = num(args[2], 0);
    const rotX  = num(args[3], 0);
    const pos   = readPos(args, 4);

    const opts = Object.assign({}, preset, { pos });
    if (power !== null) opts.speed = power;
    const ps = createParticleSystem(opts);
    if (ps && ps.mesh) {
      ps.mesh.rotation.y = rotY * Math.PI / 180;
      ps.mesh.rotation.x = rotX * Math.PI / 180;
    }
    refreshUI();
    OK(`✨ ${key} — kuch ${opts.speed}, ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}`);
  }, 'zarrachalar yaratadi', 'create.particles("olov") 0.06 0 0 ~ ~2 ~', {
    forms: ['create.particles("olov") 0.06 0 0 ~ ~2 ~'],
    hint: (done) => argN(done) === 0
      ? Object.keys(PARTICLE_PRESETS).map(k => ({ text: '"' + k + '"', desc: PARTICLE_PRESETS[k].mode }))
      : [{ text: '~', desc: "o'yinchi joyi" }],
  });

  GC.register('create.lights', (args) => {
    const type = String(args[0] || 'point').toLowerCase();
    const power = num(args[1], null);
    const rotY  = num(args[2], 0);
    const rotX  = num(args[3], 0);
    const pos   = readPos(args, 4);
    let L = null;

    if (type === 'sun' || type === 'quyosh') {
      if (typeof createSunLight !== 'function') { ERR('createSunLight yo\'q'); return; }
      L = createSunLight({ pos, intensity: power === null ? 6 : power });
    } else if (type === 'headlight' || type === 'fanar') {
      if (typeof createHeadlight !== 'function') { ERR('createHeadlight yo\'q'); return; }
      L = createHeadlight({ pos, intensity: power === null ? 2 : power });
    } else if (['point', 'spot', 'directional', 'ambient'].indexOf(type) >= 0) {
      if (typeof createLight !== 'function') { ERR('createLight yo\'q'); return; }
      L = createLight(type, { pos, intensity: power === null ? 1.5 : power, color: 0xffffff });
    } else {
      ERR(`"${args[0]}" — bunday yorug'lik yo'q`);
      INFO('Mavjud: sun, headlight, point, spot, directional, ambient');
      return;
    }
    if (L && L.light) {
      L.light.rotation.y = rotY * Math.PI / 180;
      L.light.rotation.x = rotX * Math.PI / 180;
    }
    refreshUI();
    OK(`💡 ${type} — kuch ${power === null ? 'standart' : power}, ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}`);
  }, 'yorug\'lik yaratadi', 'create.lights("point") 2 0 0 ~ ~3 ~', {
    forms: ['create.lights("point") 2 0 0 ~ ~3 ~', 'create.lights("sun") 6'],
    hint: (done) => argN(done) === 0
      ? ['point', 'spot', 'directional', 'ambient', 'sun', 'headlight'].map(k => ({ text: '"' + k + '"', desc: 'yorug\'lik turi' }))
      : [{ text: '~', desc: "o'yinchi joyi" }],
  });

  // ══════════════════════════════════════════════════════════
  //  apex.rain
  // ══════════════════════════════════════════════════════════
  GC.register('apex.rain', (args) => {
    if (typeof RainSystem === 'undefined') { ERR('Yomg\'ir tizimi yo\'q'); return; }
    const on = bool(args[0], !RainSystem.active);
    const intensity = num(args[1], null);
    const size      = num(args[2], null);
    if (intensity !== null && typeof rainCfg === 'function') rainCfg('intensity', Math.max(0.05, Math.min(1, intensity)));
    if (size      !== null && typeof rainCfg === 'function') rainCfg('size',      Math.max(0.01, Math.min(0.4, size)));
    if (on) RainSystem.start(); else RainSystem.stop();
    const c = RainSystem._cfg || {};
    OK(`🌧 Yomg'ir ${on ? 'yoqildi' : "o'chirildi"}` +
       (on ? ` — kuch ${(c.intensity ?? 0).toFixed(2)}, tomchi ${(c.size ?? 0).toFixed(2)}` : ''));
  }, 'yomg\'ir', 'apex.rain 1 0.8 0.09', {
    forms: ['apex.rain 1 0.8 0.09', 'apex.rain 0'],
    hint: (done) => argN(done) === 0 ? BOOL_HINTS
      : [{ text: '0.8', desc: 'kuch 0..1' }, { text: '0.09', desc: 'tomchi kattaligi' }],
  });

  // ══════════════════════════════════════════════════════════
  //  📊 fps_show / show_coordinats
  // ══════════════════════════════════════════════════════════
  const POS_HINTS = [
    { text: 'top-left',     desc: 'yuqori chap' },
    { text: 'top-right',    desc: "yuqori o'ng" },
    { text: 'bottom-left',  desc: 'quyi chap' },
    { text: 'bottom-right', desc: "quyi o'ng" },
    { text: 'top',          desc: 'yuqori markaz' },
    { text: 'bottom',       desc: 'quyi markaz' },
    { text: 'left',         desc: 'chap markaz' },
    { text: 'right',        desc: "o'ng markaz" },
  ];

  GC.register('fps_show', (args) => {
    if (typeof GameHUD === 'undefined') { ERR('GameHUD yuklanmagan'); return; }
    const on    = bool(args[0], !GameHUD.fps.on);
    const pos   = args[1] || null;
    const scale = num(args[2], null);
    // ⚠ Noto'g'ri joy nomida JIMGINA standartga tushmaymiz —
    //   foydalanuvchi "yozdim, ishlamadi" deb qolardi.
    if (pos && !GameHUD.normPos(pos)) {
      ERR(`Noma'lum joy: "${pos}"`);
      INFO('Mumkin: ' + Object.keys(GameHUD.POS).join(', '));
      return;
    }
    GameHUD.setFps(on, pos, scale);
    const f = GameHUD.fps;
    OK(`📊 FPS ${on ? 'yoqildi' : "o'chirildi"}` +
       (on ? ` — ${f.pos}, kattaligi ${f.scale.toFixed(2)}` : ''));
  }, 'FPS ko\'rsatkichi', 'fps_show 1 top-left 1.0', {
    forms: ['fps_show 1 top-left 1.0', 'fps_show 0'],
    hint: (done) => argN(done) === 0 ? BOOL_HINTS
      : argN(done) === 1 ? POS_HINTS
      : [{ text: '1.0', desc: 'kattaligi (0.3…6)' }],
  });

  GC.register('show_coordinats', (args) => {
    if (typeof GameHUD === 'undefined') { ERR('GameHUD yuklanmagan'); return; }
    const on    = bool(args[0], !GameHUD.crd.on);
    const pos   = args[1] || null;
    const scale = num(args[2], null);
    if (pos && !GameHUD.normPos(pos)) {
      ERR(`Noma'lum joy: "${pos}"`);
      INFO('Mumkin: ' + Object.keys(GameHUD.POS).join(', '));
      return;
    }
    GameHUD.setCoords(on, pos, scale);
    const c = GameHUD.crd;
    OK(`📍 Koordinatalar ${on ? 'yoqildi' : "o'chirildi"}` +
       (on ? ` — ${c.pos}, kattaligi ${c.scale.toFixed(2)}` : ''));
  }, 'X Y Z koordinatalari', 'show_coordinats 1 bottom-left 1.0', {
    forms: ['show_coordinats 1 bottom-left 1.0', 'show_coordinats 0'],
    hint: (done) => argN(done) === 0 ? BOOL_HINTS
      : argN(done) === 1 ? POS_HINTS
      : [{ text: '1.0', desc: 'kattaligi (0.3…6)' }],
  });

  // ══════════════════════════════════════════════════════════
  //  ⚡ optimize
  // ══════════════════════════════════════════════════════════
  GC.register('optimize', (args) => {
    if (typeof OptimizeSystem === 'undefined') { ERR('OptimizeSystem yuklanmagan'); return; }
    const O = OptimizeSystem;
    if (!args.length) {
      const s = O.stats();
      OK(`⚡ Optimizatsiya ${s.cfg.enabled ? 'YOQIQ' : "O'CHIQ"}`);
      INFO(`👁 ko'rinmasni chizmaslik: ${s.cfg.cull ? 'ha' : "yo'q"}`);
      INFO(`📉 sifat pasayadi: ${s.cfg.lodDist} m dan uzoqda`);
      INFO(`🚫 umuman chizilmaydi: ${s.cfg.hideDist} m dan uzoqda`);
      INFO(`🌑 soya: ${s.cfg.shadowDist} m gacha`);
      INFO(`hozir yashirilgan: ${s.hidden} / ${s.total}`);
      return;
    }
    const on = bool(args[0], true);
    O.set('enabled', on);
    // ⚠ Masofalar ARGUMENT bilan ham beriladi: `optimize 1 80 250`
    if (args[1] !== undefined) O.set('lodDist',  num(args[1], O.cfg.lodDist));
    if (args[2] !== undefined) O.set('hideDist', num(args[2], O.cfg.hideDist));
    OK(`⚡ Optimizatsiya ${on ? 'yoqildi' : "o'chirildi"}` +
       (on ? ` — sifat ${O.cfg.lodDist} m, yo'q ${O.cfg.hideDist} m` : ''));
  }, 'ko\'rinmasni chizmaslik va uzoqni soddalashtirish', 'optimize 1 60 180', {
    forms: ['optimize', 'optimize 1 60 180', 'optimize 0'],
    hint: (done) => argN(done) === 0 ? BOOL_HINTS
      : argN(done) === 1 ? [{ text: '60', desc: 'sifat pasayadigan masofa (m)' }]
      : [{ text: '180', desc: 'umuman chizilmaydigan masofa (m)' }],
  });

  // ══════════════════════════════════════════════════════════
  //  noclip
  // ══════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════
  //  tldiag — ⏱ TIMELINE zanjirini ko'rsatadi
  // ──────────────────────────────────────────────────────────
  //  ⚠ NEGA KERAK: treklar uch bosqichdan o'tadi va HAR BIRIDA
  //    jimgina yiqilishi mumkin edi:
  //        1. trek bormi va turi to'g'ri qo'yilganmi?
  //        2. `timeline-export` uni maxsus deb tanidimi?
  //        3. egasi (PC / canvas) topildimi?
  //    "Ishlamayapti" degan xabar bu uch bosqichning QAYSI birida
  //    uzilganini AYTMASDI — va sababni topish uchun taxmin qilishga
  //    to'g'ri kelardi. Bu buyruq javobni bir qatorda beradi.
  // ══════════════════════════════════════════════════════════
  GC.register('tldiag', () => {
    const T = (typeof TimelineSystem !== 'undefined' && TimelineSystem.tracks) || [];
    if (!T.length) { ERR("Timeline'da trek yo'q — avval I bilan key qo'ying"); return; }

    const EXP = (typeof TimelineExportSystem !== 'undefined');
    const KIND = t => t.isFilter ? 'filter' : t.isWeather ? 'weather'
               : t.isSkybox ? 'skybox' : t.isKino ? 'kino' : t.isZoom ? 'zoom'
               : t.isPCCam ? 'pccam' : t.isPCFx ? 'pcfx' : null;

    OK(`⏱ ${T.length} ta trek:`);
    for (const t of T) {
      const k = KIND(t);
      const nm = t.objName || t.objId || '?';
      const kfs = (t.keyframes || []).length;
      if (!kfs) { INFO(`  ⚪ ${nm} — key YO'Q`); continue; }

      if (!k) {
        //  Oddiy obyekt treki — nishoni bormi?
        const has = !!(t.objRef || (typeof getObjById === 'function' && getObjById(t.objId)));
        INFO(`  ${has ? '✅' : '❌'} ${nm} — obyekt treki, ${kfs} key` +
             (has ? '' : `  ← obyekt #${t.objId} TOPILMADI`));
        continue;
      }

      //  Maxsus trek — egasi bormi?
      let owner = 'sahna';
      let ok = true;
      if (t.isPCCam || t.isPCFx) {
        const pc = (typeof objects !== 'undefined' ? objects : [])
          .find(o => o && o.userData && o.userData.isPCBlock && o.userData.id === t.pcId);
        ok = !!pc;
        owner = pc ? `PC #${t.pcId}` : `PC #${t.pcId} TOPILMADI`;
      }
      INFO(`  ${ok ? '✅' : '❌'} ${nm} — ${k}, ${kfs} key, ${owner}`);
    }

    INFO(EXP ? '✅ TimelineExportSystem bor (tugma/hitbox yo\'li ochiq)'
             : '❌ TimelineExportSystem YO\'Q — tugma va hitbox ishlamaydi');
    INFO("Slotlarda ishlamasa: 🎯 hitbox slotida `trackKind` va egasining");
    INFO("id si saqlanganini tekshiring — `apex.start` bilan sinang.");
  }, "⏱ timeline zanjirini tekshirish", 'tldiag');

  GC.register('noclip', (args) => {
    if (typeof PlayerController === 'undefined' || !PlayerController.obj) {
      ERR('O\'yinchi yo\'q (Play rejimida ishlaydi)'); return;
    }
    const on = bool(args[0], !PlayerController.noclip);
    PlayerController.noclip = on;
    if (!on && PlayerController.vel) PlayerController.vel.set(0, 0, 0);
    OK(`👻 Noclip ${on ? 'yoqildi' : "o'chirildi"}`);
    if (on) INFO('WASD — uchish, Space — yuqoriga, Ctrl/C — pastga');
  }, 'devorlardan o\'tib uchish', 'noclip 1', { forms: ['noclip 1', 'noclip 0'], hint: () => BOOL_HINTS });

  // ══════════════════════════════════════════════════════════
  //  apex.start — hitbox / button / gaze ni QO'LDA ishga tushirish
  // ══════════════════════════════════════════════════════════
  function fakeEntity() {
    const ref = (window.PlayerController && PlayerController.obj) ||
                (typeof playerMesh !== 'undefined' ? playerMesh : null);
    return { ref, kind: 'player' };
  }

  GC.register('apex.start', (args) => {
    const kind = String(args[0] || '').toLowerCase();
    // oxiridagi `start` so'zi ixtiyoriy bezak
    const rest = args.slice(1).filter(a => String(a).toLowerCase() !== 'start');
    const nameTok = rest[0];

    const fireHitbox = (o) => {
      if (!o.userData || !o.userData.isHitbox) { ERR(`${o.userData.name} — hitbox emas`); return false; }
      HitboxSystem._fireActions(o, fakeEntity(), 'enter', 'forward', 1);
      OK(`▶ ${o.userData.name} ishga tushdi`);
      return true;
    };

    if (kind === 'hitboks' || kind === 'hitbox' || kind === 'zona') {
      if (typeof HitboxSystem === 'undefined') { ERR('HitboxSystem yo\'q'); return; }
      if (nameTok) { const o = findObj(nameTok); if (o) fireHitbox(o); return; }
      const all = objects.filter(o => o.userData && o.userData.isHitbox);
      if (!all.length) { WARN('Sahnada hitbox yo\'q'); return; }
      all.forEach(fireHitbox);
      return;
    }

    if (kind === 'button' || kind === 'tugma') {
      if (typeof InteractiveButtonSystem === 'undefined' || !InteractiveButtonSystem.fire) {
        ERR('Tugma tizimi yo\'q'); return;
      }
      const list = nameTok ? [findObj(nameTok)].filter(Boolean)
                           : objects.filter(o => o.userData && o.userData.isButton && !o.userData.isGazeTrigger);
      if (!list.length) { WARN('Tugma topilmadi'); return; }
      list.forEach(o => { InteractiveButtonSystem.fire(o); OK(`▶ ${o.userData.name} bosildi`); });
      return;
    }

    if (kind === 'see' || kind === 'qarash' || kind === 'gaze') {
      if (typeof InteractiveButtonSystem === 'undefined' || !InteractiveButtonSystem.fire) {
        ERR('Tugma tizimi yo\'q'); return;
      }
      const list = nameTok ? [findObj(nameTok)].filter(Boolean)
                           : objects.filter(o => o.userData && o.userData.isGazeTrigger);
      if (!list.length) { WARN('Qarash tetigi topilmadi'); return; }
      list.forEach(o => { InteractiveButtonSystem.fire(o); OK(`▶ ${o.userData.name} qaraldi`); });
      return;
    }

    ERR('apex.start - hitboks | button | see');
  }, 'tetikni qo\'lda ishga tushiradi', 'apex.start - hitboks ("Zona 1") start', {
    forms: ['apex.start - hitboks ("nom") start',
            'apex.start - button ("nom")',
            'apex.start - see ("nom")'],
    hint: (done) => {
      if (argN(done) === 0) return [
        { text: 'hitboks', desc: 'zona tetigi' },
        { text: 'button',  desc: 'tugma' },
        { text: 'see',     desc: 'qarash tetigi' },
      ];
      const k = String(done[0]).toLowerCase();
      if (k === 'hitboks' || k === 'hitbox') return objHints(o => o.userData.isHitbox);
      if (k === 'see' || k === 'qarash')     return objHints(o => o.userData.isGazeTrigger);
      if (k === 'button' || k === 'tugma')   return objHints(o => o.userData.isButton && !o.userData.isGazeTrigger);
      return [];
    },
  });

  // ══════════════════════════════════════════════════════════
  //  apex — finish (hammasini to'xtatadi)
  // ══════════════════════════════════════════════════════════
  GC.register('apex', (args) => {
    const sub = String(args[0] || '').toLowerCase();
    if (sub !== 'finish' && sub !== 'stop' && sub !== 'toxtat') {
      ERR('apex - finish'); return;
    }
    const done = [];
    try { if (window.TimelineSystem && TimelineSystem.stop) { TimelineSystem.stop(); done.push('timeline'); } } catch (e) {}
    try { if (window.HitboxSystem && HitboxSystem.clearAllRuntime) { HitboxSystem.clearAllRuntime(); done.push('hitbox'); } } catch (e) {}
    try { if (window.RainSystem && RainSystem.active) { RainSystem.stop(); done.push('yomg\'ir'); } } catch (e) {}
    try {
      if (window.PlayerController && PlayerController.noclip) { PlayerController.noclip = false; done.push('noclip'); }
    } catch (e) {}
    try { if (CollisionDebug.on) { CollisionDebug.hide(); done.push('halqalar'); } } catch (e) {}
    try {
      if (Array.isArray(window._canvases) && typeof _hideCanvas === 'function') {
        let n = 0;
        window._canvases.forEach(c => { if (c.visible) { _hideCanvas(c); n++; } });
        if (n) done.push(n + ' canvas');
      }
    } catch (e) {}
    OK('⏹ To\'xtatildi: ' + (done.length ? done.join(', ') : 'to\'xtatadigan narsa yo\'q edi'));
  }, 'hammasini to\'xtatadi', 'apex - finish', {
    forms: ['apex - finish'],
    hint: () => [{ text: 'finish', desc: 'hammasini to\'xtatadi' }],
  });

  // ══════════════════════════════════════════════════════════
  //  open.addons
  // ══════════════════════════════════════════════════════════
  // ============================================================
  //  ⚠ `AddonSystem._reg` — `Map`, MASSIV EMAS
  // ------------------------------------------------------------
  //  XATO BOR EDI (rejada topilgan): bu yerda `_reg` massiv deb
  //  ishlatilardi — `.length`, `.map`, `.find`. `Map` da ular
  //  BOSHQACHA ishlaydi yoki umuman yo'q:
  //      _reg.length  → undefined  → "Addon yo'q" deb aytardi
  //      _reg.map     → TypeError  → buyruq yiqilardi
  //
  //  Natijada `open.addons` HECH QACHON ishlamagan.
  //
  //  ⚠ Bitta joyda massivga aylantiramiz: har chaqiruvda
  //    takrorlash o'rniga yordamchi — kelajakda `_reg` turi
  //    yana o'zgarsa BITTA joy tuzatiladi.
  function _addonList() {
    try {
      const r = (typeof AddonSystem !== 'undefined') && AddonSystem._reg;
      if (!r) return [];
      //  `Map` → qiymatlar massivi. Massiv bo'lsa o'zi qaytadi.
      if (typeof r.values === 'function') return [...r.values()];
      return Array.isArray(r) ? r : [];
    } catch (e) { return []; }
  }

  GC.register('open.addons', (args) => {
    if (typeof AddonSystem === 'undefined') { ERR('AddonSystem yo\'q'); return; }
    const nameTok = args.filter(a => String(a).toLowerCase() !== 'start')[0];
    const reg = _addonList();
    if (!nameTok) {
      if (!reg.length) { WARN('Addon yo\'q'); return; }
      OK('Addonlar: ' + reg.map(a => a.name || a.id).join(', '));
      return;
    }
    const low = String(nameTok).toLowerCase();
    const ad = reg.find(a => String(a.id || '').toLowerCase() === low) ||
               reg.find(a => String(a.name || '').toLowerCase().indexOf(low) >= 0);
    if (!ad) { ERR(`Addon "${nameTok}" topilmadi`); return; }
    const tool = (ad.tools && ad.tools[0]) || null;
    if (tool && typeof AddonSystem.runTool === 'function') {
      AddonSystem.runTool(ad.id, tool.id != null ? tool.id : 0);
      OK(`🧩 ${ad.name || ad.id} → ${tool.name || 'tool'} ishga tushdi`);
    } else if (typeof AddonSystem.open === 'function') {
      AddonSystem.open(ad.id);
      OK(`🧩 ${ad.name || ad.id} ochildi`);
    } else ERR('Addonni ishga tushirib bo\'lmadi');
  }, 'addonni ishga tushiradi', 'open.addons - ("nomi") start', {
    forms: ['open.addons - ("nomi") start'],
    hint: () => {
      if (typeof AddonSystem === 'undefined') return [];
      return _addonList().map(a => ({ text: '"' + (a.id || a.name) + '"', desc: a.name || '' }));
    },
  });

  // ══════════════════════════════════════════════════════════
  //  open.prefab
  // ══════════════════════════════════════════════════════════
  GC.register('open.prefab', (args) => {
    if (typeof PrefabSystem === 'undefined') { ERR('PrefabSystem yo\'q'); return; }
    const list = PrefabSystem.load() || [];
    const a0 = String(args[0] || '').toLowerCase();
    const isCreate = (a0 === 'create' || a0 === 'spawn');
    const rest = isCreate ? args.slice(1) : args;

    if (!list.length) { WARN('Prefab yo\'q'); return; }
    // Nom berilgan bo'lsa — o'shani, aks holda birinchisini
    let pf = null, coordStart = 0;
    if (rest.length && !/^[~\-0-9.]/.test(String(rest[0]))) {
      const low = String(rest[0]).toLowerCase();
      pf = list.find(p => String(p.id) === low) ||
           list.find(p => String(p.name || '').toLowerCase().indexOf(low) >= 0);
      coordStart = 1;
      if (!pf) { ERR(`Prefab "${rest[0]}" topilmadi`); INFO('Bor: ' + list.map(p => p.name).join(', ')); return; }
    } else pf = list[0];

    const pos = readPos(rest, coordStart);
    const before = new Set(objects);
    Promise.resolve(PrefabSystem.spawn(pf.id)).then(() => {
      const o = newestSince(before);
      if (o) { o.position.copy(pos); o.updateMatrixWorld(true); }
      refreshUI();
      OK(`📦 ${pf.name} → ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}`);
    }).catch(e => ERR('Prefab: ' + (e && e.message ? e.message : e)));
  }, 'prefabni sahnaga qo\'yadi', 'open.prefab - create ~ ~ ~', {
    forms: ['open.prefab - create ~ ~ ~'],
    hint: (done) => {
      if (argN(done) === 0) return [{ text: 'create', desc: 'sahnaga qo\'yish' }];
      if (argN(done) === 1 && typeof PrefabSystem !== 'undefined')
        return (PrefabSystem.load() || []).map(pf => ({ text: '"' + pf.name + '"', desc: 'id ' + pf.id }));
      return [{ text: '~', desc: "o'yinchi joyi" }];
    },
  });

  // ══════════════════════════════════════════════════════════
  //  the.create-canvas / the.delete-canvas
  // ══════════════════════════════════════════════════════════
  GC.register('the.create-canvas', (args) => {
    if (!Array.isArray(window._canvases)) window._canvases = [];
    let on = true, bindKey = '', mode = 'hold', html = null, css = null;

    args.forEach(a => {
      const s = String(a);
      const low = s.toLowerCase();
      if (/^[01]$/.test(s))                       { on = (s === '1'); return; }
      if (low.indexOf('bind-') === 0)             { bindKey = s.slice(5); return; }
      if (low === 'click' || low === 'press')     { mode = 'toggle'; return; }
      if (low === 'pressing' || low === 'hold')   { mode = 'hold';   return; }
      if (html === null)                          { html = s; return; }
      if (css === null)                           { css = s; return; }
    });

    // `bind-ahkey` kabi qisqartma → KeyA / KeyH …
    if (bindKey && !/^(Key|Digit|Arrow|F\d)/.test(bindKey)) {
      const k = bindKey.replace(/key$/i, '');
      bindKey = /^\d$/.test(k) ? 'Digit' + k : 'Key' + k.charAt(0).toUpperCase();
    }

    const id = (window._canvases.reduce((m, c) => Math.max(m, c.id || 0), 0) || 0) + 1;
    const c = {
      id, name: 'Canvas ' + id,
      triggerKey: bindKey,
      corner: 'top-left', width: 280, height: 180,
      mode,                      // 'hold' — bosib tursa, 'toggle' — bir marta bosса
      scope: 'player',
      // ⚠ Tugma berilmagan bo'lsa doimiy ko'rinsin — foydalanuvchi
      //   "majburiy emas, tashlab ketilsa ishlayveradi" degan edi.
      alwaysVisible: !bindKey,
      html: html != null ? html : '<div class="hud">Salom!</div>',
      css:  css  != null ? css  : '.hud{color:var(--accent3);font-family:monospace;padding:10px;background:rgba(0,0,0,.6);border:1px solid var(--accent3);border-radius:6px}',
      js: '',
      visible: false,
    };
    window._canvases.push(c);
    try { if (typeof _refreshAlwaysVisible === 'function') _refreshAlwaysVisible(); } catch (e) {}
    if (on && !bindKey && typeof _showCanvas === 'function') { try { _showCanvas(c); } catch (e) {} }
    OK(`🖼 ${c.name} yaratildi` + (bindKey ? ` — tugma: ${bindKey} (${mode})` : ' — doimiy ko\'rinadi'));
  }, 'ekran ustiga HUD qo\'yadi', 'the.create-canvas 1 bind-H click "<b>Salom</b>" "b{color:red}"', {
    forms: ['the.create-canvas 1', 'the.create-canvas 1 bind-H click "matn" "style"'],
    hint: (done) => argN(done) === 0 ? BOOL_HINTS : [
      { text: 'bind-H',   desc: 'ochish tugmasi' },
      { text: 'click',    desc: 'bosса almashadi' },
      { text: 'pressing', desc: 'bosib tursa' },
    ],
  });

  GC.register('the.delete-canvas', (args) => {
    if (!Array.isArray(window._canvases) || !window._canvases.length) { WARN('Canvas yo\'q'); return; }
    const s = String(args[0] || '').toLowerCase();
    if (!s) { ERR('Canvas nomi yoki id kerak'); return; }
    const i = window._canvases.findIndex(c =>
      String(c.id) === s || String(c.name || '').toLowerCase().indexOf(s) >= 0);
    if (i < 0) { ERR(`Canvas "${args[0]}" topilmadi`); return; }
    const c = window._canvases[i];
    try { if (typeof _hideCanvas === 'function') _hideCanvas(c); } catch (e) {}
    window._canvases.splice(i, 1);
    try { if (typeof _refreshAlwaysVisible === 'function') _refreshAlwaysVisible(); } catch (e) {}
    OK(`🖼 ${c.name} o'chirildi`);
  }, 'canvasni o\'chiradi', 'the.delete-canvas("Canvas 1")', {
    forms: ['the.delete-canvas("Canvas 1")'],
    hint: () => (window._canvases || []).map(c => ({ text: '"' + c.name + '"', desc: 'id ' + c.id })),
  });

  // ══════════════════════════════════════════════════════════
  //  list — kartadagi hamma narsa (id bilan)
  // ══════════════════════════════════════════════════════════
  GC.register('list', (args) => {
    const filter = String(args[0] || '').toLowerCase();
    const show = k => !filter || k.indexOf(filter) >= 0;

    if (show('object') || show('obyekt')) {
      const roots = objects.filter(o => o.parent && !(o.parent.userData && o.parent.userData.id != null));
      say(`<b style="color:var(--accent3)">🧱 OBYEKTLAR (${objects.length})</b>`, 'lok');
      roots.slice(0, 60).forEach(o => {
        const u = o.userData || {};
        const tags = [];
        if (u.isHitbox) tags.push('hitbox');
        if (u.isGazeTrigger) tags.push('qarash');
        if (u.isButton) tags.push('tugma');
        if (u.colliderMode === 'inline') tags.push('👻');
        if (u.roll && u.roll.enabled) tags.push(u.roll.mode === 'heal' ? '💚' : '💥');
        if (u.headLook && u.headLook.enabled) tags.push('👁');
        const kids = (u.children && u.children.length) ? ` +${u.children.length}` : '';
        INFO(`[${u.id}] ${u.name || '—'}  (${u.type || 'obyekt'})${kids}` +
             (tags.length ? '  ' + tags.join(' ') : ''));
      });
      if (roots.length > 60) INFO(`… yana ${roots.length - 60} ta`);
    }

    if ((show('light') || show('yorug')) && typeof lights !== 'undefined' && lights.length) {
      say(`<b style="color:#ffcc00">💡 YORUG'LIKLAR (${lights.length})</b>`, 'lok');
      lights.forEach(l => INFO(`[${l.id}] ${l.name || l.type} (${l.type})`));
    }

    if ((show('particle') || show('zarra')) &&
        typeof particleSystems !== 'undefined' && particleSystems.length) {
      say(`<b style="color:var(--accent4)">✨ ZARRACHALAR (${particleSystems.length})</b>`, 'lok');
      particleSystems.forEach(p => INFO(`[${p.id}] ${p.name} (${p.mode}, ${p.count})`));
    }

    if (show('canvas') && Array.isArray(window._canvases) && window._canvases.length) {
      say(`<b style="color:var(--accent)">🖼 CANVAS (${window._canvases.length})</b>`, 'lok');
      window._canvases.forEach(c => INFO(
        `[${c.id}] ${c.name}` + (c.triggerKey ? ` — ${c.triggerKey} (${c.mode})` : ' — doimiy')));
    }

    if (show('prefab') && typeof PrefabSystem !== 'undefined') {
      const l = PrefabSystem.load() || [];
      if (l.length) {
        say(`<b style="color:#ffcc00">📦 PREFABLAR (${l.length})</b>`, 'lok');
        l.forEach(p => INFO(`[${p.id}] ${p.name}`));
      }
    }

    if (show('addon') && typeof AddonSystem !== 'undefined') {
      const r = _addonList();
      if (r.length) {
        say(`<b style="color:var(--accent3)">🧩 ADDONLAR (${r.length})</b>`, 'lok');
        r.forEach(a => INFO(`[${a.id}] ${a.name || a.id}`));
      }
    }
  }, 'kartadagi hamma element (id bilan)', 'list [object|light|canvas|prefab]', {
    forms: ['list', 'list object', 'list canvas', 'list prefab'],
    hint: () => ['object', 'light', 'particle', 'canvas', 'prefab', 'addon']
      .map(k => ({ text: k, desc: 'filtr' })),
  });

  // Konsol ochilganda bir marta eslatma
  setTimeout(() => {
    try { say("⌨️ Komandalar yuklandi — <b>help</b> deb yozing", 'lok'); } catch (e) {}
  }, 1800);
})();
