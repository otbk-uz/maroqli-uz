// ============================================================
//  🪜 LADDER (Narvon) — o'yinchi yopishib tepaga/pastga chiqadi
//
//  Assetlar bo'limidan qo'shiladi. O'yin paytida:
//    • o'yinchi narvon oldiga borsa — AVTOMATIK yopishadi
//    • W = tepaga, S = pastga (tugmalar almashtiriladigan)
//    • E = narvondan tushish (almashtiriladigan)
//    • narvon MAKS tepasiga yetsa — avtomatik qo'yvoradi (tepaga chiqadi)
//    • narvon MAKS pastiga yetsa — avtomatik qo'yvoradi
//
//  Modelga GLB/tekstura biriktirish mumkin (inspektorдан).
//
//  ⚠ NEGA player.js GA INTEGRATSIYA: narvonда o'yinchi mantiqi butunlay
//    o'zgaradi (gravitatsiya o'chadi, W/S vertikal bo'ladi). Buni
//    player.update() boshida `carInside` kabi maxsus tarmoq bilan
//    ushlash eng toza — LadderSystem holatni beradi, player unga
//    bo'ysunadi.
// ============================================================
(function () {
  'use strict';

  let _ladIdC = 0;

  const DEFAULTS = {
    isLadder:   true,
    climbUpKey:   'KeyW',       // tepaga
    climbDownKey: 'KeyS',       // pastga
    exitKey:      'KeyE',       // tushish
    climbSpeed:   3.0,          // m/s
    autoRelease:  true,         // uchiga yetsa avtomatik qo'yvorish
    grabDist:     1.2,          // shu masofada oldiga borsa yopishadi
    colliderMode: 'inline',     // o'zi to'smaydi (o'yinchi ichiga kiradi)
  };

  function _defaultData() { return Object.assign({}, DEFAULTS); }

  // ── Ko'rinish: oddiy cho'zilgan kub ─────────────────────────
  //  ⚠ NEGA KUB (sim/pog'ona emas): foydalanuvchi tekstura o'rnatganda,
  //    kubning tekis yuzasi bo'lgani uchun tekstura LOOP (takror) qilib
  //    oson ko'rinadi. Sim/pog'onalarda tekstura yopishmasdi.
  //    Geometriya oddiy BoxGeometry — o'yinchi uni cho'zib (scale Y)
  //    balandligini belgilaydi, tekstura yuzasiga to'g'ri tushadi.
  function _buildVisual(mesh) {
    // Eski bolalarni tozalaymiz (sim/pog'ona qoldig'i bo'lsa)
    [...mesh.children].forEach(c => {
      if (c && (c.name === '__ladRungs' || c.name === '__ladFill')) {
        mesh.remove(c);
        try { c.geometry && c.geometry.dispose(); c.material && c.material.dispose(); } catch (e) {}
      }
    });
    // Geometriya oddiy kub — material/tekstura tashqaridan (inspektor).
    // Bu yerda qo'shimcha bola yaratmaymiz; mesh o'zi kub.
  }

  // Narvon balandligi (world) — colliderSize yoki scale dan
  function _ladderExtent(mesh) {
    const ud = mesh.userData;
    const sc = new THREE.Vector3();
    mesh.getWorldScale(sc);
    const localH = (ud.colliderSize && ud.colliderSize.y) ? ud.colliderSize.y : 4;
    const worldH = localH * sc.y;
    const cy = mesh.position.y;
    return { top: cy + worldH / 2, bottom: cy - worldH / 2, height: worldH };
  }

  function create(pos) {
    // Oddiy to'ldirilgan material — tekstura yuzasiga to'g'ri tushsin.
    const mat = new THREE.MeshStandardMaterial({ color: 0xffcc22, roughness: 0.85, metalness: 0.05 });
    // Cho'zilgan kub — grab zonasi ham shu. Balandligini scale bilan cho'zadi.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4, 0.3), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;

    mesh.position.copy(pos || new THREE.Vector3(0, 2, 0));
    mesh.userData = Object.assign(
      { id: (typeof objIdC !== 'undefined' ? ++objIdC : ++_ladIdC), name: 'Narvon ' + (++_ladIdC) },
      _defaultData());
    mesh.userData.colliderSize = { x: 0.7, y: 4, z: 0.3 };

    _buildVisual(mesh);

    scene.add(mesh);
    objects.push(mesh);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    if (typeof updateHierarchy === 'function') updateHierarchy();
    if (typeof selectObject === 'function') selectObject(mesh);
    if (typeof updateStats === 'function') updateStats();
    if (typeof captureState === 'function') captureState('Narvon qo\'shildi');
    if (typeof log === 'function') log('🪜 <span style="color:#ffcc22">' + mesh.userData.name + '</span> qo\'shildi', 'lok');
    return mesh;
  }

  // Prefab/sahna yuklashda ko'rinishni tiklaydi (sahnaga qo'shmaydi)
  function restoreVisual(mesh) {
    if (!mesh || !mesh.isMesh) return mesh;
    // colliderMode inline — o'yinchi ichiga kirsin (narvon to'smaydi).
    mesh.userData.colliderMode = 'inline';
    _buildVisual(mesh);
    return mesh;
  }

  // ── O'yinchi holati (player.js o'qiydi) ─────────────────────
  //  _state = { ladder, } — hozir qaysi narvonда
  let _state = null;

  /** Player.update() boshida chaqiriladi. Narvonда bo'lsa TRUE qaytaradi
   *  va o'yinchi harakatini o'zi boshqaradi. */
  // ⚠ QO'YVORISHDAN KEYINGI QULF.
  //
  //  XATO: o'yinchi narvon tepasiga chiqib, W ni ushlab tursa —
  //    tepaga yetdi → `_release('tepa')` → `y = ext.top + 0.1`
  //    → keyingi kadrда `_findGrabbable()` uni YANA ushlaydi (chunki
  //    u `ext.top + 1` oralig'ida) → yana W → yana qo'yvorish…
  //
  //    Natijada konsol bitta soniyada o'nlab marta
  //    "yopishdi / tushdi (tepa)" bilan to'lardi va o'yinchi
  //    narvon tepasida qaltirab turardi.
  //
  //  Yechim: qo'yvorilgan narvon VAQTINCHA qulflanadi. Qulf ochiladi
  //  agar o'yinchi: uzoqlashsa (gisterezis bilan), teskari tugmani
  //  bossa (tepada — pastga, pastda — tepaga), yoki chegaradan
  //  chiqib ketsa.
  let _lock = null;          // { ladder, dir: 'top' | 'bottom' }

  function _lockClear(o, K) {
    if (!_lock) return;
    const L = _lock.ladder;
    if (!L || !L.parent) { _lock = null; return; }
    const ud = L.userData || {};
    const dx = L.position.x - o.position.x;
    const dz = L.position.z - o.position.z;
    const d  = Math.sqrt(dx * dx + dz * dz);
    // Gisterezis: qulf ochilishi uchun biroz KENGROQ masofa kerak —
    // aks holda chegarada turib qaltirash qaytadi.
    const far = d > (ud.grabDist ?? 1.2) * 1.25;
    const ext = _ladderExtent(L);
    const wants = (_lock.dir === 'top')
      ? !!K[ud.climbDownKey || 'KeyS']       // tepada — pastga tushmoqchi
      : !!K[ud.climbUpKey   || 'KeyW'];      // pastda — tepaga chiqmoqchi
    const past = (_lock.dir === 'top')
      ? o.position.y < ext.top - 0.35        // tepadan tushib ketdi
      : o.position.y > ext.bottom + 0.35;
    if (far || wants || past) _lock = null;
  }

  function updatePlayer(pc, delta) {
    if (typeof isPlaying === 'undefined' || !isPlaying) { _state = null; return false; }
    if (!pc || !pc.obj) { _state = null; return false; }
    const o = pc.obj;
    const K = (typeof fpsKeys !== 'undefined') ? fpsKeys : {};

    // ── Narvonда emas — yaqin narvonni qidiramiz (avtomatik yopishish) ──
    if (!_state) {
      _lockClear(o, K);
      const lad = _findGrabbable(o.position, K);
      if (!lad) return false;
      _state = { ladder: lad };
      pc.vel && pc.vel.set(0, 0, 0);
      if (typeof log === 'function') log('🪜 Narvonga yopishdi (W↑ S↓, E chiqish)', 'lok');
    }

    const lad = _state.ladder;
    // Narvon sahnadan o'chgan bo'lsa — chiqamiz
    if (!lad.parent) { _state = null; return false; }

    const cfg = lad.userData;
    const ext = _ladderExtent(lad);

    // ── E (yoki belgilangan tugma) — tushish ──
    if (K[cfg.exitKey || 'KeyE']) { _release(pc, 'qo\'lda', lad); return false; }

    // ── W/S — tepaga/pastga ──
    const upK   = cfg.climbUpKey   || 'KeyW';
    const downK = cfg.climbDownKey || 'KeyS';
    let vy = 0;
    if (K[upK])   vy += (cfg.climbSpeed ?? 3);
    if (K[downK]) vy -= (cfg.climbSpeed ?? 3);

    // O'yinchini narvon markaziga (X/Z) yopishtiramiz — sirg'anmasin
    o.position.x += (lad.position.x - o.position.x) * Math.min(1, delta * 10);
    o.position.z += (lad.position.z - o.position.z) * Math.min(1, delta * 10);
    o.position.y += vy * delta;

    if (pc.vel) { pc.vel.set(0, 0, 0); }
    pc.onGround = false;

    // ── Avtomatik qo'yvorish: uchiga yetganda ──
    const foot = o.position.y - _playerHalf(pc);
    const head = o.position.y + _playerHalf(pc);
    if (cfg.autoRelease !== false) {
      if (head >= ext.top && vy > 0) {
        // Tepaga yetdi — biroz oldinga surib, tepaga qo'yamiz
        _release(pc, 'tepa', lad);
        o.position.y = ext.top + 0.1;
        return false;
      }
      if (foot <= ext.bottom && vy < 0) {
        _release(pc, 'past', lad);
        return false;
      }
    }
    // Chegaradan chiqib ketmasin (autoRelease o'chiq bo'lsa)
    if (head > ext.top)    o.position.y = ext.top - _playerHalf(pc);
    if (foot < ext.bottom) o.position.y = ext.bottom + _playerHalf(pc);

    return true;   // narvonда — player.js qolgan mantiqni o'tkazib yuboradi
  }

  function _playerHalf(pc) {
    // O'yinchi yarim balandligi (taxminiy)
    const cs = pc.obj.userData && pc.obj.userData.colliderSize;
    if (cs && cs.y) { const s = new THREE.Vector3(); pc.obj.getWorldScale(s); return cs.y * s.y * 0.5; }
    return 0.9;
  }

  function _release(pc, reason, lad) {
    // Avtomatik qo'yvorishda (tepa/past) narvonni qulflaymiz — darhol
    // qayta yopishib, cheksiz halqa yasamasin. Qo'lda chiqishda
    // (E tugmasi) ham qulflaymiz: o'yinchi ataylab chiqdi, bir qadam
    // yurmasdan yana yopishib qolmasin.
    if (lad) {
      _lock = { ladder: lad, dir: (reason === 'past') ? 'bottom' : 'top' };
    }
    _state = null;
    if (pc && pc.vel) pc.vel.set(0, 0, 0);
    if (typeof log === 'function') log('🪜 Narvondan tushdi (' + reason + ')', 'lw');
  }

  /** O'yinchi pozitsiyasiga eng yaqin, grab masofasidagi narvon. */
  function _findGrabbable(playerPos, K) {
    K = K || {};
    if (typeof objects === 'undefined') return null;
    let best = null, bestD = Infinity;
    for (const o of objects) {
      const ud = o.userData;
      if (!ud || !ud.isLadder) continue;
      if (!o.parent) continue;
      // 🚫 Map Loader yashirgan narvon — funksional jihatdan YO'Q.
      //   Busiz karta yopilgandan keyin o'yinchi BO'SH JOYDA ko'rinmas
      //   narvonga yopishib qolardi.
      if (ud._mlOff) continue;
      if (_lock && _lock.ladder === o) continue;      // ⛔ qulflangan
      const dx = o.position.x - playerPos.x;
      const dz = o.position.z - playerPos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const grab = ud.grabDist ?? 1.2;
      if (d > grab) continue;
      // Vertikal jihatdan narvon oralig'ida bo'lsin
      const ext = _ladderExtent(o);
      if (playerPos.y < ext.bottom - 1 || playerPos.y > ext.top + 1) continue;
      // ⚠ TEPASIDA TURSA — o'zi yopishmaydi. Narvon tepasida shunchaki
      //   turgan o'yinchini ushlab olish noto'g'ri: u yurmoqchi bo'ladi,
      //   tizim esa uni joyida ushlab turardi. Yopishish uchun PASTGA
      //   tushish tugmasi bosilishi kerak — bu aniq niyat.
      if (playerPos.y > ext.top - 0.05 && !K[ud.climbDownKey || 'KeyS']) continue;
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  window.LadderSystem = {
    create, restoreVisual, updatePlayer, DEFAULTS,
    isOnLadder: () => !!_state,
    forceRelease: () => { _state = null; },
    rebuildVisual: _buildVisual,
  };
  window.addLadder = (pos) => create(pos);

  // ── Inspektor sozlagichlari ─────────────────────────────────
  window._ladSet = function (key, val) {
    if (!selectedObj || !selectedObj.userData || !selectedObj.userData.isLadder) return;
    selectedObj.userData[key] = val;
    if (typeof updateInspector === 'function') updateInspector();
  };
  window._ladSetNum = function (key, val) {
    if (!selectedObj || !selectedObj.userData || !selectedObj.userData.isLadder) return;
    selectedObj.userData[key] = parseFloat(val) || 0;
  };
  // Tugmani "tutish" — bosilgan klavishani yozib oladi
  window._ladCatchKey = function (key, btnEl) {
    if (!selectedObj || !selectedObj.userData || !selectedObj.userData.isLadder) return;
    const orig = btnEl ? btnEl.textContent : '';
    if (btnEl) btnEl.textContent = '⏳ bosing...';
    const h = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      selectedObj.userData[key] = e.code;
      document.removeEventListener('keydown', h, { capture: true });
      if (typeof updateInspector === 'function') updateInspector();
    };
    document.addEventListener('keydown', h, { capture: true });
  };
})();
