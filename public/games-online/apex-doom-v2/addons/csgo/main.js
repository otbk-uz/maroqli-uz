// ============================================================
//  🔫 CS:GO MODE — APEX addon (kirish nuqtasi)
// ------------------------------------------------------------
//  ⚠ NEGA FAYL NOMI `main.js`
//    APEX ning addon yuklovchisi (`scripts/systems/addons.js`) qattiq
//    `addons/<id>/main.js` ni qidiradi. Spetsifikatsiyadagi `addon.js`
//    saqlanib qoldi — u addonning YADROSI (boot, tick, public API).
//    Bu fayl esa faqat yuklovchi va APEX bilan bog'lovchi.
//
//  ⚠ MODULLAR KETMA-KET YUKLANADI
//    Parallel yuklasak `weapon_system.js` `WeaponData` dan oldin
//    ishga tushib, bo'sh jadvalga urilardi. Ro'yxat tartibi =
//    bog'liqlik tartibi.
//
//  ⚠ GLOBAL NOMLAR
//    Butun addon bitta `window.CSGO` ostida. Dvigatelning global
//    maydonini ifloslantirmaydi.
// ============================================================

(function () {
  'use strict';

  const BASE    = 'addons/csgo/';
  const VERSION = '1.0.0';

  // Bog'liqlik tartibida
  const MODULES = [
    'core/events.js',              // hodisa shinasi + hodisa nomlari
    'core/config.js',              // barcha sozlanadigan qiymatlar
    'core/apex_adapter.js',        // dvigatel API si ustidagi qatlam
    'core/assets.js',              // model/ovoz yuklovchi (fayllar keyin keladi)

    'weapons/weapon_data.js',      // qurol katalogi (damage: "XX")

    'multiplayer/authority.js',    // ⚖ server-authoritative qoidalar (umumiy)
    'multiplayer/network.js',      // tarmoq mijozi

    'economy/economy.js',
    'economy/rewards.js',

    'player/player.js',
    'player/inventory.js',

    'weapons/recoil.js',
    'weapons/reload.js',
    'weapons/weapon_system.js',

    'grenades/grenade_system.js',

    'bomb/bomb_sites.js',
    'bomb/c4.js',
    'bomb/bomb.js',

    'round/round_system.js',

    'shop/shop.js',
    'ui/hud.js',

    'tools/editor_tools.js',

    'addon.js',                    // ⚑ OXIRIDA: hammasini ishga tushiradi
  ];

  const CSGO = window.CSGO = window.CSGO || {
    version: VERSION,
    base:    BASE,
    _loaded: {},
    _bootP:  null,
  };

  function _log(m, t) {
    try { if (typeof log === 'function') { log(m, t || 'lok'); return; } } catch (e) {}
    console.log(m);
  }

  function loadScript(rel) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src     = BASE + rel + '?v=' + VERSION;
      s.onload  = () => { CSGO._loaded[rel] = true; resolve(); };
      s.onerror = () => reject(new Error(rel + ' yuklanmadi'));
      document.head.appendChild(s);
    });
  }

  function loadCSS(rel) {
    if (document.querySelector('link[data-csgo="' + rel + '"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = BASE + rel + '?v=' + VERSION;
    l.dataset.csgo = rel;
    document.head.appendChild(l);
  }

  /** Barcha modullarni yuklaydi. Bir marta — takroriy chaqiruv o'sha va'dani qaytaradi. */
  CSGO.ready = function () {
    if (CSGO._bootP) return CSGO._bootP;
    CSGO._bootP = (async () => {
      loadCSS('shop/shop.css');
      loadCSS('ui/hud.css');
      for (const m of MODULES) {
        try { await loadScript(m); }
        catch (e) { _log('❌ CSGO: ' + e.message, 'le'); throw e; }
      }
      // `addon.js` shu funksiyani e'lon qiladi
      if (typeof CSGO.boot === 'function') CSGO.boot();
      return CSGO;
    })();
    return CSGO._bootP;
  };

  // ── APEX asboblar paneli ────────────────────────────────────
  //  Asbob bosilganda modullar tayyor bo'lmasa — kutamiz.
  const tool = (id, icon, name, desc, fn) => ({
    id, icon, name, desc,
    run(api) {
      CSGO.ready().then(() => {
        const T = CSGO.EditorTools;
        if (!T || typeof T[fn] !== 'function') { api.log('❌ EditorTools.' + fn + ' yo\'q', 'le'); return; }
        try { T[fn](api); }
        catch (e) { api.log(`❌ ${name}: ${e.message}`, 'le'); console.error('[csgo]', e); }
      }).catch(() => api.log('❌ CSGO modullari yuklanmadi — addons/csgo/ papkasini tekshiring', 'le'));
    },
  });

  APEX.register({
    id:          'csgo',
    name:        'CS:GO Mode',
    icon:        '🔫',
    version:     VERSION,
    author:      'APEX',
    description: "1) «⚙ Rejimni yoqish» → 2) spawn va A/B zonalarni qo'ying → 3) ▶ O'YNA. Maplar va modellar keyin ulanadi.",

    tools: [
      tool('enable',   '⚙',  'Rejimni yoqish / o\'chirish',
           "O'yin boshlanganda CS:GO mantig'i ishga tushsin", 'toggleMode'),
      tool('kit',      '🗺',  'Tayyor to\'plam',
           "T/CT spawn + A/B zona + buy zona — bitta papkada", 'buildKit'),
      tool('spawn_t',  '🟠',  'T spawn nuqtasi',       "Terrorchilar tug'iladigan joy", 'spawnT'),
      tool('spawn_ct', '🔵',  'CT spawn nuqtasi',      "Counter-Terrorist spawn", 'spawnCT'),
      tool('site_a',   '🅰',  'Bomb Site A',           "A trigger zonasi", 'siteA'),
      tool('site_b',   '🅱',  'Bomb Site B',           "B trigger zonasi", 'siteB'),
      tool('buyzone',  '🛒',  'Buy zona',              "Shu zonada B do'konni ochadi", 'buyZone'),
      tool('bot',      '🤖',  'Nishon / bot',          "Jon-zirhli nishon — otib ko'rish uchun", 'addBot'),
      tool('net',      '🌐',  'Multiplayer sozlash',   "Server manzili, xona, taxallus", 'netSetup'),
      tool('cfg',      '🎛',  'Sozlamalar',            "Raund, bomba, iqtisod, damage XX", 'settings'),
      tool('assets',   '📦',  'Asset holati',          "Qaysi model/ovoz yetishmayapti", 'assetReport'),
      tool('test',     '🧪',  'O\'z-o\'zini tekshirish', "32-bo'limdagi test ro'yxatini yuritadi", 'selfTest'),
    ],
  });

  // Panel ochilishi bilan fonda yuklaymiz
  CSGO.ready().catch(() => {});
})();
