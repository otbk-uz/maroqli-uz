// ============================================================
//  🤖 AI AGENT — YADRO  v1.0  (build 58.40)
// ------------------------------------------------------------
//  Yo'riqnomadagi tuzilma:
//
//    TUR → XULQ → IDROK → QAROR → NAVIGATSIYA → AMAL → ANIMATSIYA
//
//  Modullar ATAYLAB alohida fayllarda:
//    👁 `ai-perception.js` — ko'rish, xotira
//    🧭 `ai-navigation.js` — patrul, chetlab o'tish, tiqilish
//    🤖 shu fayl          — holat mashinasi va boshqaruvchi
//
//  ── ⚠ ASOSIY QOIDA ──────────────────────────────────────────
//    Yo'riqnomaning 27-bo'limi: **TUR butun xulqni belgilamaydi**.
//    Tur — bu faqat STANDART sozlamalar to'plami. Undan keyin
//    dizayner idrok, patrul, jang va hodisalarni alohida sozlaydi.
//    Shuning uchun `aiType` kodda deyarli tekshirilmaydi — u
//    yaratish paytida sozlamalarni to'ldiradi, xolos.
//
//  ── ⚠ NEGA HOLAT MASHINASI ──────────────────────────────────
//    Bir vaqtda BITTA asosiy holat boshqaradi. Busiz \"patrul\"
//    va \"quvish\" bir vaqtda ishlab, agentni ikki tomonga tortib
//    turardi — u joyida titrab qolardi.
//
//  Holatlar:
//    IDLE · PATROL · INVESTIGATE · CHASE · ATTACK
//    SEARCH · RETURN · FLEE · DEAD · CUSTOM
// ============================================================

window.AIAgentSystem = (() => {
  'use strict';

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _objs = () => (typeof objects !== 'undefined' ? objects : []);
  const _playing = () => (typeof isPlaying !== 'undefined' && isPlaying);

  const STATES = ['IDLE', 'PATROL', 'INVESTIGATE', 'CHASE', 'ATTACK',
                  'SEARCH', 'RETURN', 'FLEE', 'DEAD', 'CUSTOM'];

  const TYPES = {
    passive:  { nom: '😐 Passiv',   izoh: 'O\'yinchiga e\'tibor bermaydi' },
    friendly: { nom: '🤝 Do\'st',    izoh: 'O\'yinchini ittifoqchi deb biladi' },
    neutral:  { nom: '😑 Betaraf',  izoh: 'Tegilmasa tinch, tegilsa javob qaytaradi' },
    enemy:    { nom: '👹 Dushman',  izoh: 'Qidiradi, quvadi, hujum qiladi' },
    animal:   { nom: '🐺 Hayvon',   izoh: 'Sayr qiladi, qochadi yoki ov qiladi' },
    custom:   { nom: '⚙️ Maxsus',   izoh: 'Xulqni dizayner o\'zi yozadi' },
  };

  /** Har tur uchun STANDART sozlamalar. */
  function typeDefaults(type) {
    const base = {
      aiType: type || 'passive',
      // 🏃 Xulq
      speedWalk: 2, speedRun: 6, turnSpeed: 6,
      // 👁 Idrok
      seeDist: 30, fov: 100, useRay: true, seeTime: 0.5, memoryTime: 5,
      // 🚩 Patrul
      patrolMode: 'loop', waitMin: 2, waitMax: 6, walkTime: 7,
      patrol: [],
      // 🏃 Quvish
      chaseSpeed: 6, chaseMax: 60, loseDist: 35, searchTime: 8, returnSpeed: 4,
      // ⚔️ Jang
      canAttack: false, attackDist: 2, attackRate: 1.2, attackDamage: 10,
      canFlee: false, fleeHealth: 30,
      health: 100,
      // 🧱 Navigatsiya
      avoidDist: 2.5, stuckTime: 2, stuckTries: 3, arrive: 0.8,
      // 🎬 Animatsiya: holat → { klip, loop, tezlik, ovoz }
      anim: {},
    };
    if (type === 'enemy')  Object.assign(base, { canAttack: true, patrolMode: 'loop' });
    if (type === 'neutral') Object.assign(base, { canAttack: true, seeDist: 18, fov: 140 });
    if (type === 'animal') Object.assign(base, { canFlee: true, patrolMode: 'randomWalk',
                                                 seeDist: 20, fov: 200, speedRun: 8 });
    if (type === 'friendly') Object.assign(base, { seeDist: 40, fov: 360 });
    return base;
  }

  // ============================================================
  //  Yaratish
  // ============================================================
  function makeAgent(obj, type) {
    if (!obj) return null;
    const ud = obj.userData;
    ud.isAIAgent = true;
    ud.ai = Object.assign(typeDefaults(type), ud.ai || {});
    ud.ai.aiType = type || ud.ai.aiType || 'passive';
    _reset(obj);
    return ud.ai;
  }

  function removeAgent(obj) {
    if (!obj || !obj.userData.isAIAgent) return false;
    delete obj.userData.isAIAgent;
    delete obj.userData.ai;
    delete obj.userData._aiRT;
    return true;
  }

  const agents = () => _objs().filter(o => o && o.userData && o.userData.isAIAgent);

  /** Runtime holat (saqlanmaydi — `_` bilan). */
  function _rt(obj) {
    if (!obj.userData._aiRT) {
      obj.userData._aiRT = {
        state: 'IDLE', t: 0, wait: 0,
        mem: window.AIPerception ? window.AIPerception.newMemory() : {},
        patrol: { i: 0, dir: 1 },
        stuck: {}, atkT: 0, hp: obj.userData.ai ? obj.userData.ai.health : 100,
        home: obj.position.clone(),
      };
    }
    return obj.userData._aiRT;
  }
  function _reset(obj) { delete obj.userData._aiRT; _rt(obj); }

  // ============================================================
  //  Holat mashinasi
  // ============================================================
  function setState(obj, s, why) {
    const rt = _rt(obj);
    if (rt.state === s) return false;
    // ⚠ O'lgan agent boshqa holatga o'tmaydi — aks holda jasad
    //   o'rnidan turib quvishni davom ettirardi.
    if (rt.state === 'DEAD') return false;
    const prev = rt.state;
    rt.state = s;
    rt.t = 0;
    fire(obj, 'OnStateChange', { prev, next: s, why });
    return true;
  }
  const stateOf = (obj) => _rt(obj).state;

  // ============================================================
  //  📣 Hodisalar
  // ============================================================
  const EVENTS = ['OnSpawn', 'OnIdle', 'OnPlayerDetected', 'OnPlayerLost', 'OnAttack',
                  'OnDamage', 'OnDeath', 'OnReachDestination', 'OnPathBlocked',
                  'OnStuck', 'OnTimer', 'OnStateChange'];
  const _handlers = {};
  function on(name, fn) { (_handlers[name] = _handlers[name] || []).push(fn); }
  function fire(obj, name, data) {
    const list = _handlers[name];
    if (list) for (const fn of list) { try { fn(obj, data || {}); } catch (e) {} }
    // ⚙️ Maxsus JS — dizayner yozgan funksiya
    const ai = obj.userData.ai;
    if (ai && ai.script && window.AIScriptRunner) {
      try { window.AIScriptRunner.run(obj, name, data || {}); } catch (e) {}
    }
  }

  // ============================================================
  //  ⚔️ Jang
  // ============================================================
  function damage(obj, amount, from) {
    const rt = _rt(obj);
    const ai = obj.userData.ai;
    if (!ai || rt.state === 'DEAD') return false;
    rt.hp = Math.max(0, (rt.hp ?? ai.health) - (+amount || 0));
    fire(obj, 'OnDamage', { amount, from, hp: rt.hp });

    // ⚠ Betaraf agent AYNAN shu yerda dushmanga aylanadi —
    //   yo'riqnomaning 2-bo'limi.
    if (ai.aiType === 'neutral' && from) {
      rt.mem.known = true;
      rt.mem.memT = ai.memoryTime;
      if (!rt.mem.lastPos) rt.mem.lastPos = new THREE.Vector3();
      from.getWorldPosition(rt.mem.lastPos);
      setState(obj, 'CHASE', 'zarba yedi');
    }
    if (rt.hp <= 0) { setState(obj, 'DEAD', 'jon tugadi'); fire(obj, 'OnDeath', { from }); }
    else if (ai.canFlee && rt.hp <= (ai.fleeHealth ?? 30)) setState(obj, 'FLEE', 'jon kam');
    return true;
  }

  // ============================================================
  //  Har kadr
  // ============================================================
  function update(delta) {
    if (!_playing()) return;
    const dt = Math.min(0.1, delta || 0.016);
    const target = _objs().find(o => o.userData && o.userData.isPlayerObj) || null;
    for (const obj of agents()) {
      try { _step(obj, target, dt); } catch (e) {}
    }
  }

  function _step(obj, target, dt) {
    const ai = obj.userData.ai;
    if (!ai) return;
    const rt = _rt(obj);
    const N = window.AINavigation, PZ = window.AIPerception;
    rt.t += dt;
    if (rt.state === 'DEAD') return;

    // ── 👁 IDROK ──
    if (PZ && target && ai.aiType !== 'passive') {
      PZ.update(obj, target, ai, rt.mem, dt);
      if (rt.mem.justFound) { rt.mem.justFound = false; fire(obj, 'OnPlayerDetected', { target }); }
      if (rt.mem.justLost)  { rt.mem.justLost  = false; fire(obj, 'OnPlayerLost', { target }); }
    }

    // ── ⛔ Tiqilib qolish ──
    if (N && ['PATROL', 'CHASE', 'SEARCH', 'RETURN', 'FLEE'].includes(rt.state)) {
      if (N.stuckCheck(obj, rt.stuck, dt, ai)) {
        fire(obj, 'OnStuck', { tries: rt.stuck.tries });
        // ⚠ Bir necha urinishdan keyin ham qutulmasa — patrulga
        //   qaytadi. Aks holda agent mangu depsinib turardi.
        if (rt.stuck.tries >= (ai.stuckTries || 3)) {
          rt.stuck.tries = 0;
          setState(obj, 'RETURN', 'tiqilib qoldi');
        }
      }
    }

    // ── QAROR ──
    _decide(obj, ai, rt, target);
    // ── AMAL ──
    _act(obj, ai, rt, target, dt, N);
    // ── 🎬 ANIMATSIYA ──
    _anim(obj, ai, rt);
  }

  /**
   * Holatni tanlash.
   * ⚠ TUR emas, SOZLAMALAR hal qiladi (27-bo'lim). `passive` esa
   *   umuman idrok qilmaydi — u uchun qaror ham kerak emas.
   */
  function _decide(obj, ai, rt, target) {
    if (ai.aiType === 'passive') {
      if (rt.state === 'IDLE' && ai.patrol.length) setState(obj, 'PATROL', 'boshlanish');
      return;
    }
    if (rt.state === 'FLEE' || rt.state === 'CUSTOM') return;

    const m = rt.mem;
    const hostile = (ai.aiType === 'enemy') ||
                    (ai.aiType === 'neutral' && rt.state === 'CHASE') ||
                    (ai.aiType === 'animal' && ai.canAttack);

    if (m.known && hostile) {
      const d = m.dist;
      if (ai.canAttack && d <= (ai.attackDist || 2)) setState(obj, 'ATTACK', 'yaqin');
      else if (d <= (ai.chaseMax || 60))            setState(obj, 'CHASE', 'ko\'rdi');
      return;
    }
    if (ai.aiType === 'friendly' && m.known) { setState(obj, 'CHASE', 'ergashadi'); return; }

    // Nishon yo'qoldi
    if (rt.state === 'CHASE' || rt.state === 'ATTACK') {
      setState(obj, 'SEARCH', 'nishon yo\'qoldi');
      return;
    }
    if (rt.state === 'SEARCH' && rt.t >= (ai.searchTime || 8)) {
      setState(obj, 'RETURN', 'qidiruv tugadi');
      return;
    }
    if (rt.state === 'IDLE' && ai.patrol.length) setState(obj, 'PATROL', 'boshlanish');
  }

  function _act(obj, ai, rt, target, dt, N) {
    if (!N) return;
    const P = ai.patrol || [];

    switch (rt.state) {
      case 'PATROL': {
        if (!P.length) { setState(obj, 'IDLE', 'yo\'l yo\'q'); return; }
        if (rt.wait > 0) { rt.wait -= dt; return; }
        const p = P[Math.min(rt.patrol.i, P.length - 1)];
        const r = N.moveTo(obj, new THREE.Vector3(p.x, p.y, p.z), ai.speedWalk, dt, ai);
        if (r.arrived) {
          fire(obj, 'OnReachDestination', { index: rt.patrol.i });
          rt.wait = (p.wait != null) ? p.wait : N.waitTime(ai);
          rt.patrol.i = N.nextPoint(rt.patrol, P.length, ai.patrolMode);
        }
        break;
      }
      case 'CHASE': {
        const dest = rt.mem.lastPos || (target && target.position);
        if (!dest) { setState(obj, 'SEARCH', 'joy noma\'lum'); return; }
        // ⚠ Ko'rinib turgan bo'lsa — HOZIRGI joyi, ko'rinmasa —
        //   OXIRGI ko'rilgan joy. Har doim hozirgi joyni bilsa,
        //   dushman devor orqasidan ham aniq quvardi.
        const to = (rt.mem.visible && target) ? target.getWorldPosition(new THREE.Vector3()) : dest;
        N.moveTo(obj, to, ai.chaseSpeed || ai.speedRun, dt, ai);
        break;
      }
      case 'ATTACK': {
        rt.atkT -= dt;
        if (rt.atkT <= 0) {
          rt.atkT = ai.attackRate || 1.2;
          fire(obj, 'OnAttack', { target, damage: ai.attackDamage });
        }
        break;
      }
      case 'SEARCH': {
        if (rt.mem.lastPos) N.moveTo(obj, rt.mem.lastPos, ai.speedWalk, dt, ai);
        break;
      }
      case 'RETURN': {
        if (!P.length) { setState(obj, 'IDLE', 'yo\'l yo\'q'); return; }
        // 📍 Eng yaqin patrul nuqtasi — teleport emas, borib qo'shiladi
        if (rt.retIdx == null) {
          rt.retIdx = N.nearestPoint(obj.getWorldPosition(new THREE.Vector3()), P);
        }
        const p = P[rt.retIdx];
        const r = N.moveTo(obj, new THREE.Vector3(p.x, p.y, p.z), ai.returnSpeed || ai.speedWalk, dt, ai);
        if (r.arrived) { rt.patrol.i = rt.retIdx; rt.retIdx = null; setState(obj, 'PATROL', 'qaytdi'); }
        break;
      }
      case 'FLEE': {
        if (!target) { setState(obj, 'PATROL', 'xavf yo\'q'); return; }
        const away = obj.getWorldPosition(new THREE.Vector3())
          .sub(target.getWorldPosition(new THREE.Vector3())).setY(0).normalize()
          .multiplyScalar(20).add(obj.position);
        N.moveTo(obj, away, ai.speedRun, dt, ai);
        break;
      }
      default: break;   // IDLE / CUSTOM / DEAD
    }
  }

  /**
   * 🎬 Holat → animatsiya.
   * ⚠ Bu yerda faqat KERAKLI klip nomi aniqlanadi; ijro
   *   `TimelineExportSystem` ning o'z yo'lidan boradi — ikkinchi
   *   animatsiya dvigatelini yozmaymiz.
   */
  function _anim(obj, ai, rt) {
    const want = (ai.anim && ai.anim[rt.state]) || null;
    if (!want || !want.clip) return;
    if (rt.animState === rt.state) return;
    rt.animState = rt.state;
    if (window.TimelineExportSystem && window.TimelineExportSystem.playObjectKeyframes && want.keyframes) {
      try {
        window.TimelineExportSystem.playObjectKeyframes({
          target: obj, keyframes: want.keyframes, direction: 'forward',
          speed: want.speed || 1, loop: want.loop !== false,
        });
      } catch (e) {}
    }
  }

  // ============================================================
  //  💾 Saqlash — barcha sozlama `userData.ai` da, ya'ni o'zi
  //     saqlanadi. Bu yerda faqat ▶ Play boshlanishida tozalash.
  // ============================================================
  let _wasPlaying = false;
  function tick(delta) {
    const p = _playing();
    if (p !== _wasPlaying) {
      _wasPlaying = p;
      for (const o of agents()) {
        _reset(o);
        if (p) fire(o, 'OnSpawn', {});
      }
    }
    update(delta);
  }

  return {
    STATES, TYPES, EVENTS, typeDefaults,
    makeAgent, removeAgent, agents,
    setState, stateOf, on, fire, damage,
    update: tick, _rt, _decide, _act,
  };
})();
