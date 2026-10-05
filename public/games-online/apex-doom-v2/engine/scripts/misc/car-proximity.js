// ============================================================
// MASHINA YAQINLIGI — isPlaying bo'lsa doim ishlaydi
// (updatePlayer dan mustaqil, camMode farqi yo'q)
// ============================================================
function updateCarProximity() {
  if (!isPlaying || carInside) {
    // Mashina ichida bo'lsa yoki o'yin to'xtagan bo'lsa — promptni o'chir
    const p = document.getElementById('_car-enter-prompt');
    if (p) p.remove();
    _carPrev['_enterPrev'] = false;
    return;
  }

  // Oyinchi pozitsiyasini aniqlash — zamonaviy PlayerController birinchi navbatda,
  // keyin eski playerMesh, eng oxir variant — kamera
  const playerObj = (window.PlayerController && PlayerController.obj) ? PlayerController.obj : null;
  const refPos = playerObj
    ? playerObj.position
    : (playerMesh ? playerMesh.position : camera.position);

  // Eng yaqin mashinani topish
  let nearCar = null, nearCarDist = 999;
  objects.forEach(o => {
    if (o.userData.entityType !== 'car' && o.userData._entityMode !== 'vehicle') return;
    const cfg = window._getCarCfg ? window._getCarCfg(o) : null;
    const maxD = cfg ? cfg.enterDistance : 3.5;
    const d = refPos.distanceTo(o.position);
    if (d < maxD && d < nearCarDist) { nearCarDist = d; nearCar = o; }
  });

  let prompt = document.getElementById('_car-enter-prompt');

  if (nearCar) {
    // Prompt yaratish yoki yangilash
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = '_car-enter-prompt';
      prompt.style.cssText = [
        'position:fixed',
        'background:rgba(0,0,0,.82)',
        'border:1px solid rgba(0,180,255,.6)',
        'border-radius:8px',
        'padding:7px 11px',
        'font-family:\'Share Tech Mono\',monospace',
        'color:#00b4ff',
        'font-size:11px',
        'font-weight:700',
        'letter-spacing:1.5px',
        'pointer-events:none',
        'z-index:9995',
        'box-shadow:0 0 18px rgba(0,180,255,.25)',
        'white-space:nowrap',
        'transform:translate(-50%,-50%)',
        'display:inline-flex',
        'gap:6px',
        'align-items:center',
      ].join(';');
      document.body.appendChild(prompt);
    }

    const cfg = window._getCarCfg ? window._getCarCfg(nearCar) : null;
    const capacity = cfg ? (cfg.capacity || 4) : 4;
    const occ = nearCar.userData._occupants || 0;
    const isFull = occ >= capacity;

    if (isFull) {
      // To'la — prompt yashir (xabar shart emas)
      prompt.style.display = 'none';
      _carPrev['_enterPrev'] = false;
      _carPrev['_passPrev']  = false;
    } else {
      const enterKey = cfg ? _carKeyLabel(cfg.enterKey || 'Enter') : 'Enter';
      const passKey  = cfg ? _carKeyLabel(cfg.passengerKey || 'KeyG') : 'G';
      const keyStyle = "color:#fff;background:rgba(0,180,255,.25);padding:2px 9px;border-radius:4px;font-weight:700;letter-spacing:1px;border:1px solid rgba(0,180,255,.5);box-shadow:0 0 6px rgba(0,180,255,.2)";
      prompt.innerHTML = `
        <span style="${keyStyle}">${enterKey}</span>
        <span style="${keyStyle}">${passKey}</span>
      `;
      prompt.style.display = '';
    }

    // ── Eshik pozitsiyasini 3D dan ekranga proyeksiya qilish ─────
    // Kamera matritsalarini bu frame uchun yangilash (aks holda proyeksiya
    // bir frame orqada qoladi — ayniqsa 3-shaxs lerp lash sababli buziladi)
    camera.updateMatrixWorld(true);

    // Mashinaning chap tomoni (driver eshigi) — ~1.2m markazdan, ~1.1m balandlikda
    const ry = nearCar.rotation.y;
    const leftX = -Math.cos(ry); const leftZ = Math.sin(ry);
    const doorPos = new THREE.Vector3(
      nearCar.position.x + leftX * 1.2,
      nearCar.position.y + 1.1,
      nearCar.position.z + leftZ * 1.2
    );
    const ndc = doorPos.project(camera);
    const cvp = document.getElementById('cvp');
    const rect = cvp ? cvp.getBoundingClientRect() : { left:0, top:0, width:window.innerWidth, height:window.innerHeight };

    // Kamera orqasida bo'lsa yashir
    if (ndc.z > 1 || ndc.z < -1) {
      prompt.style.display = 'none';
    } else {
      prompt.style.display = '';
      const sx = rect.left + (ndc.x * 0.5 + 0.5) * rect.width;
      const sy = rect.top  + (1 - (ndc.y * 0.5 + 0.5)) * rect.height;
      // Ekran chegaralarida ushlash
      const margin = 60;
      const cx = Math.max(rect.left + margin, Math.min(rect.left + rect.width - margin, sx));
      const cy = Math.max(rect.top  + margin, Math.min(rect.top  + rect.height - margin, sy));
      prompt.style.left = cx + 'px';
      prompt.style.top  = cy + 'px';
    }

    // Kirish tugmalari — haydovchi va yo'lovchi (to'la bo'lmasa)
    if (!isFull) {
      const enterCode = (cfg && cfg.enterKey)     ? cfg.enterKey     : 'Enter';
      const passCode  = (cfg && cfg.passengerKey) ? cfg.passengerKey : 'KeyG';
      const enterPressed = fpsKeys[enterCode];
      const passPressed  = fpsKeys[passCode];
      if (enterPressed && !_carPrev['_enterPrev']) tryEnterCar(nearCar, 'driver');
      if (passPressed  && !_carPrev['_passPrev'])  tryEnterCar(nearCar, 'passenger');
      _carPrev['_enterPrev'] = enterPressed;
      _carPrev['_passPrev']  = passPressed;
    }

  } else {
    // Hech qanday mashina yaqin emas — promptni o'chir
    if (prompt) { prompt.remove(); }
    _carPrev['_enterPrev'] = false;
  }
}

// Game HUD overlay
function buildGameHUD() {
  let hud = $('game-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.style.cssText='position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:20;display:none';
    // ============================================================
    //  ⚠ O'RNATILGAN ❤️ JON SHKALASI VA 🏆 HISOB OLIB TASHLANDI
    // ------------------------------------------------------------
    //  Ilgari ekran tepasida qattiq yozilgan jon chizig'i va hisob
    //  turardi. Dizayner ularni o'zgartira olmasdi: rang, joylashuv,
    //  shakl — hammasi kodga yozilgan edi.
    //
    //  Endi buni 🎨 CANVAS qiladi: HTML va CSS bilan, o'rin
    //  tutuvchilar orqali (`{hp}` `{hpMax}` `{score}` …). Ya'ni
    //  ko'rinish to'liq dizaynerning ixtiyorida.
    //
    //  ⚠ `game-message` QOLDI — u HUD emas, XABAR (\"Siz oldingiz!\").
    //    Uni ham olib tashlasak o'lim xabari yo'qolardi.
    //  ⚠ `#game-health` / `#game-score` id lari endi YO'Q, lekin
    //    `updateGameHUD()` ularni `$()` bilan izlaydi va topmasa
    //    JIM o'tadi — shu bois u yerda o'zgartirish kerak emas.
    hud.innerHTML=`
      <div id="game-message" style="position:absolute;top:50px;left:50%;transform:translateX(-50%);font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:700;opacity:0;transition:opacity .3s;text-shadow:0 0 8px currentColor"></div>
    `;
    $('cvp').appendChild(hud);
  }
  return hud;
}

function _onPlayerDeath() {
  const msg = playerSettings.deathMessage || "Siz oldingiz!";
  showGameMessage(msg, '#ff4444');
  // O'yin to'xtamaydi, faqat xabar chiqadi — kerak bo'lsa stop qilish mumkin
  log('☠ Oyinchi oldi: ' + msg, 'le');
}
window._onPlayerDeath = _onPlayerDeath;

function updateGameHUD() {
  const hBar=$('game-health'), hNum=$('game-health-num'), sEl=$('game-score');
  const maxHp = playerSettings.maxHealth || 100;
  const hp    = Math.max(0, Math.min(maxHp, gameState.health));
  const pct   = (hp / maxHp * 100).toFixed(1);
  if(hBar) {
    hBar.style.width = pct + '%';
    // Rang: yashil → sariq → qizil
    const r = hp < maxHp*0.5 ? 255 : Math.round(255 * (2 - hp/maxHp*2));
    const g = hp > maxHp*0.5 ? 180 : Math.round(180 * (hp/maxHp*2));
    hBar.style.background = `linear-gradient(90deg, rgb(${r},${g},40), rgb(${Math.min(255,r+60)},${Math.min(g+40,200)},60))`;
  }
  if(hNum) hNum.textContent = Math.ceil(hp) + '/' + maxHp;
  if(sEl)  sEl.textContent  = gameState.score;
  // O'lim tekshiruvi
  if(hp <= 0 && gameState.health > 0) {
    gameState.health = 0;
    _onPlayerDeath();
  }
}

let _msgTimer = null;
function showGameMessage(msg, color) {
  const el=$('game-message'); if(!el) return;
  el.textContent=msg; el.style.color=color||'#fff'; el.style.opacity=1;
  clearTimeout(_msgTimer);
  _msgTimer=setTimeout(()=>{ if(el) el.style.opacity=0; },2000);
}

// Override play/stop to add player

