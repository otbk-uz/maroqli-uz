// ============================================================
//  🔫 TURRET KIT — APEX addon
//
//  Bu addon TURRETNI YASAYDI va SOZLAYDI. Otish mantiqi bu yerda
//  EMAS — u `scripts/systems/turret.js` da.
//
//  ── ⚠ NEGA IKKIGA BO'LINGAN ──────────────────────────────────
//    Addon kodi FAQAT muharrirda, o'sha ham addon paneli ochilganda
//    yuklanadi (`addons/README.md` ga qarang). `game.zip` ichida
//    addonlar `addons/` papkasiga ko'chadi, lekin O'YIN ULARNI
//    ISHGA TUSHIRMAYDI.
//
//    Ya'ni otish sikli shu faylda tursa: muharrirda ishlaydi,
//    eksport qilingan o'yinda esa turret jim turgan kub bo'lib
//    qolardi — va buni faqat o'yinchi sezardi.
//
//    Shuning uchun: har kadr ishlaydigan mantiq — dvigatelda
//    (`scripts/` butunligicha `engine/` ga ko'chadi), addon esa
//    faqat `userData.turret` ni to'ldiradi. Sozlama `userData` da
//    yotgani uchun sahna bilan O'ZI saqlanadi va o'yinga tushadi.
// ============================================================

APEX.register({
  id:          'turret',
  name:        'Turret Kit',
  icon:        '🔫',
  version:     '1.0.0',
  author:      'APEX',
  description: "O'yinchini ko'rsa o't ochadigan post.",

  tools: [
    // ── 🗿 STATIK TURRET ───────────────────────────────────
    {
      id: 'static', icon: '🗿', name: 'Statik turret',
      desc: "Qimirlamaydi — faqat oldidagi konusga kirgan o'yinchiga otadi",
      run(api) {
        const t = _mkTurret(api, 'Statik turret', '#5a6470');
        api.setData(t, {
          turret: Object.assign(_base(), {
            mode:    'static',
            fov:     60,        // oldidagi konus
            seeDist: 25,
            damage:  6,
            fireRate: 2,
            aim:     'none',    // hech qachon burilmaydi
          }),
        });
        _finish(api, t, "🗿 Statik turret — konusiga kirsangiz otadi. Yon tomondan aylanib o'tsangiz ko'rmaydi.");
      },
    },

    // ── 🎯 FUNKSIONAL TURRET ───────────────────────────────
    {
      id: 'tracking', icon: '🎯', name: 'Funksional turret',
      desc: "O'yinchiga qarab buriladi, ko'rish masofasidan chiqmaguncha otadi",
      run(api) {
        const t = _mkTurret(api, 'Funksional turret', '#8a2f2f');
        api.setData(t, {
          turret: Object.assign(_base(), {
            mode:      'tracking',
            fov:       80,       // payqash konusi — kengroq
            seeDist:   35,
            damage:    5,
            fireRate:  3,
            aim:       'auto',
            aimMode:   'realistic',
            turnSpeed: 0.1,
            onLost:    'reset',
          }),
        });
        _finish(api, t, "🎯 Funksional turret — payqasa qarab turadi va 35 m dan uzoqlashmaguncha otadi.");
      },
    },

    // ── 👁 HEAD-LOOK BILAN JUFTLIK ─────────────────────────
    //  Turret ko'radi va otadi, burilishni head-look bajaradi.
    {
      id: 'headlook', icon: '👁', name: "Turret + Head-look",
      desc: "Burilishni head-look bajaradi, turret faqat ko'radi va otadi",
      run(api) {
        const t = _mkTurret(api, 'Kuzatuv turreti', '#2f5a8a');
        api.setData(t, {
          // 👁 Burilish — head-look zimmasida
          headLook: {
            enabled: true, target: 'player', mode: 'realistic',
            behavior: 'ifVisible', onLost: 'reset', speed: 0.12, axis: '+z',
          },
          // 🔫 Otish — turret zimmasida
          //  ⚠ `aim:'none'` SHART EMAS: `TurretSystem.canRotate()` head-look
          //    yoqilganini o'zi ko'radi va rotatsiyaga TEGMAYDI. Ikkalasi
          //    bir kadrda `quaternion` ga yozsa obyekt titrardi.
          turret: Object.assign(_base(), {
            mode: 'tracking', fov: 90, seeDist: 30,
            damage: 5, fireRate: 2.5,
          }),
        });
        _finish(api, t, "👁 Head-look qaratadi, turret otadi — rotatsiya uchun kurash yo'q.");
      },
    },

    // ── ⚙️ TANLANGAN OBYEKTGA BIRIKTIRISH ──────────────────
    {
      id: 'attach', icon: '⚙️', name: "Tanlanganga biriktirish",
      desc: "Istalgan obyektni (model, bochka, minora) turretga aylantiradi",
      run(api) {
        const o = window.selectedObj;
        if (!o) { api.log('Avval obyektni tanlang', 'lw'); return; }

        const m = (api.ask("Rejim — 1: 🗿 statik · 2: 🎯 funksional", '2') || '').trim();
        if (m !== '1' && m !== '2') { api.log('Bekor qilindi', 'lw'); return; }
        const tracking = (m === '2');

        const dist = parseFloat(api.ask("Ko'rish masofasi (metr):", '30'));
        const fov  = parseFloat(api.ask("Ko'rish burchagi (gradus):", tracking ? '80' : '60'));
        const dmg  = parseFloat(api.ask('Bir o'.concat("'q zarari (hp):"), '6'));
        const rate = parseFloat(api.ask("O'q tezligi (o'q/sek):", '2.5'));

        api.setData(o, {
          turret: Object.assign(_base(), {
            mode:     tracking ? 'tracking' : 'static',
            seeDist:  isNaN(dist) ? 30 : Math.max(1, dist),
            fov:      isNaN(fov)  ? 60 : Math.max(5, Math.min(360, fov)),
            damage:   isNaN(dmg)  ? 6  : Math.max(0, dmg),
            fireRate: isNaN(rate) ? 2.5 : Math.max(0.05, rate),
            aim:      tracking ? 'auto' : 'none',
            aimMode:  'realistic',
            onLost:   tracking ? 'reset' : 'freeze',
          }),
        });

        // ⚠ Animatsiya ogohlantirishi — bu jimgina o'tib ketmasligi kerak.
        //   Obyektda timeline treki bo'lsa, turret unga QAYRILMAYDI
        //   (animatsiya buzilmasin), lekin OTAVERADI. Foydalanuvchi buni
        //   oldindan bilsin, keyin \"nega qayrilmayapti\" deb izlamasin.
        if (_hasTrack(o)) {
          api.log("🎬 Bu obyektda animatsiya bor — turret unga QAYRILMAYDI (animatsiya buzilmasin), lekin ko'rsa OTADI.", 'lw');
        }
        api.refresh();
        api.select(o);
        api.log(`🔫 "${o.userData.name}" turretga aylandi — ${tracking ? '🎯 funksional' : '🗿 statik'}, ${dmg} hp/o'q`);
      },
    },

    // ── 🧪 SOZLAMANI KO'RSATISH ────────────────────────────
    {
      id: 'info', icon: '🧪', name: 'Turretni tekshirish',
      desc: "Tanlangan turret nima qilyapti — sozlama va holat",
      run(api) {
        const o = window.selectedObj;
        if (!o) { api.log('Avval obyektni tanlang', 'lw'); return; }
        const c = o.userData && o.userData.turret;
        if (!c) { api.log("Bu obyekt turret emas", 'lw'); return; }

        const rot = (window.TurretSystem && TurretSystem.canRotate(o, c));
        let why = 'buriladi';
        if (!rot) {
          if (c.mode !== 'tracking')                        why = '🗿 statik rejim';
          else if (c.aim === 'none')                        why = "aim: 'none'";
          else if (o.userData._animDriven)                  why = '🎬 animatsiya haydayapti';
          else if (o.userData.headLook && o.userData.headLook.enabled) why = '👁 head-look qaratyapti';
          else if (_hasTrack(o))                            why = '🎬 timeline treki bor';
        }

        api.log(`🔫 ${o.userData.name}: ${c.enabled ? 'yoqilgan' : "O'CHIQ"} · ` +
                `${c.mode === 'tracking' ? '🎯 funksional' : '🗿 statik'} · ` +
                `${c.seeDist} m · ${c.fov}° · ${c.damage} hp × ${c.fireRate}/sek`);
        api.log(`   burilish: ${rot ? '✅ ' : '⛔ '}${why}`);

        const st = o.userData._tr;
        if (st) api.log(`   holat: ${st.locked ? '🔴 qulflangan' : '⚪ bo\'sh'} · masofa ${(st.dist || 0).toFixed(1)} m · ${st.reason || ''}`);
        else    api.log("   holat: ▶ O'YNA bosilmagan");
      },
    },

    // ── 🏗 TAYYOR KORIDOR ──────────────────────────────────
    {
      id: 'kit', icon: '🏗', name: "Tayyor to'plam",
      desc: "Ikki turret + o'rtada devor — farqi darrov ko'rinadi",
      run(api) {
        const folder = api.spawn.group('Turret sinovi');
        const base = api.frontOfCamera(8);

        const s = _mkTurret(api, '🗿 Statik', '#5a6470');
        api.setData(s, { turret: Object.assign(_base(), {
          mode: 'static', fov: 60, seeDist: 25, damage: 6, fireRate: 2, aim: 'none' }) });

        const t = _mkTurret(api, '🎯 Funksional', '#8a2f2f');
        api.setData(t, { turret: Object.assign(_base(), {
          mode: 'tracking', fov: 80, seeDist: 25, damage: 5, fireRate: 3,
          aim: 'auto', aimMode: 'realistic', turnSpeed: 0.1, onLost: 'reset' }) });

        // 🧱 To'siq — devor ortiga o'tsangiz ikkalasi ham to'xtaydi
        const wall = api.spawn.primitive('Kub', "To'siq");
        api.scale(wall, 4, 3, 0.4);
        api.color(wall, '#3a3a44');

        folder.position.copy(base);
        s.position.set(base.x - 4, base.y, base.z);
        t.position.set(base.x + 4, base.y, base.z);
        wall.position.set(base.x, base.y + 1, base.z + 6);

        [s, t, wall].forEach(o => {
          folder.attach(o);                       // dunyo joylashuvi saqlanadi
          o.userData.parentId = folder.userData.id;
        });

        api.refresh();
        api.select(folder);
        api.log("🏗 To'plam tayyor. ▶ O'YNA: chapdagi faqat oldiga kelsangiz otadi, o'ngdagi ergashadi. To'siq ortiga o'ting — ikkalasi ham to'xtaydi.");
      },
    },
  ],
});

// ── Yordamchilar ────────────────────────────────────────────
//  ⚠ `APEX.register` dan KEYIN e'lon qilingan `function` lar hoisting
//    tufayli ishlaydi — `run()` faqat tugma bosilganda chaqiriladi.

/** Turret sozlamasining bo'sh nusxasi (dvigatel standartlari ustiga). */
function _base() {
  const D = (window.TurretSystem && window.TurretSystem.DEFAULTS) || {};
  const c = JSON.parse(JSON.stringify(D));
  c.enabled = true;
  return c;
}

/** Korpus + stvol — stvol +Z ga qaraydi (dvigatelning \"old\" standarti). */
function _mkTurret(api, name, hex) {
  const body = api.spawn.primitive('Silindr', name);
  api.scale(body, 0.5, 0.7, 0.5);
  api.color(body, hex);

  // 🔫 Stvol — ko'rinish uchun. `_glbPart` EMAS, oddiy bola obyekt:
  //   turret burilganda u ham buriladi.
  try {
    const g = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 10);
    g.rotateX(Math.PI / 2);                     // +Z ga yotqizamiz
    const barrel = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x222228 }));
    barrel.position.set(0, 0.25, 0.7);
    barrel.name = '__turret_barrel__';
    barrel.userData._noSave = true;             // sahna faylini shishirmasin
    body.add(barrel);
  } catch (e) {}

  api.place(body);
  return body;
}

function _hasTrack(o) {
  try {
    if (typeof TimelineSystem === 'undefined') return false;
    const id = o.userData && o.userData.id;
    return (TimelineSystem.tracks || []).some(
      t => String(t.objId) === String(id) && (t.keyframes || []).length);
  } catch (e) { return false; }
}

function _finish(api, t, msg) {
  // ☠ O'lim/respawn sozlamasi — 🎲 Roll tizimining O'ZINIKI.
  //   `enabled:false` bo'lgani uchun Roll ning O'Z kontakt zarari
  //   ishlamaydi; turret esa hp tugaganda shu blokdagi respawn
  //   nuqtasi va o'lim ekranidan foydalanadi. Ya'ni dizayner buni
  //   Inspektordagi tanish UI bilan sozlaydi.
  try { if (window.ObjectRoleSystem) ObjectRoleSystem.ensure(t); } catch (e) {}
  api.refresh();
  api.select(t);
  api.log(msg);
}
