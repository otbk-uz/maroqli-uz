// ============================================================
//  ✨ OBYEKT YORQINLIGI  v1.0  (build 58.36)
// ------------------------------------------------------------
//  Har qanday obyektni CHIROQ qiladi: u atrofni yoritadi va o'zi
//  ham porlaydi. Sozlamalar 🎨 Material bo'limida, rang yonida.
//
//    💪 Kuch      — qanchalik kuchli yoritadi
//    📏 Masofa    — nur qayergacha yetadi
//    ✨ O'zi      — obyektning O'ZI qanchalik porlaydi
//    🌑 Soya      — o'chirilsa nur DEVOR ORQASIGA ham o'tadi
//    🎨 Rang      — bo'sh bo'lsa materialning rangi olinadi
//
//  ── ⚠ IKKI QISM, BITTA SHKALA ───────────────────────────────
//    \"Yorqinlik\" ikki xil narsadan iborat va ular butunlay boshqa
//    mexanizm:
//      1. `emissive` — materialning O'ZI porlaydi. Bu ATROFGA
//         yorug'lik BERMAYDI, faqat piksel yorqinroq chiziladi.
//      2. `PointLight` — atrofni HAQIQATAN yoritadi, lekin
//         obyektning o'zi qorong'i qolishi mumkin.
//    Ikkalasini bitta tugmaga bog'lasak, dizayner \"porlayapti-yu,
//    nega yorug'lik bermayapti?\" degan savolga tushardi. Shuning
//    uchun 💪 Kuch (chiroq) va ✨ O'zi (porlash) ALOHIDA.
//
//  ── ⚠ NEGA CHIROQ MESH NING BOLASI ──────────────────────────
//    `scene.add(light)` qilsak, obyekt ko'chganda chiroq joyida
//    qolib ketardi va uni har kadr quvib yurish kerak bo'lardi.
//    Bola sifatida qo'shilsa — ota bilan birga ko'chadi, buriladi,
//    o'chirilganda esa o'zi bilan birga yo'q bo'ladi.
//    ⚠ `userData.__noSave` qo'yiladi: u sahna obyekti emas, har
//      safar sozlamalardan qayta quriladi.
//
//  ── ⚠ SOYA ──────────────────────────────────────────────────
//    `castShadow = false` — nur to'siqlarni SEZMAYDI, ya'ni devor
//    orqasini ham yoritadi. Bu xato emas, ataylab: yashirin
//    yoritish, ichkaridan porlayotgan derazalar, sirli yorug'lik
//    uchun. Yoqilsa — haqiqiy soya (lekin qimmatroq).
//
//  ── ⏱ TIMELINE ──────────────────────────────────────────────
//    Kuch, masofa va porlash SILLIQ o'zgaradi (70 → 100 qo'ysangiz
//    orada asta ko'tariladi). Yoqiq/o'chiq esa QADAMLI — \"yarim
//    yoqilgan chiroq\" degan narsa yo'q.
//    `timeline.js` → `captureState` / `applyState` / interpolatsiya.
// ============================================================

window.ObjectGlowSystem = (() => {
  'use strict';

  const DEF = {
    glowOn:     false,
    glowPower:  2,      // 💪 kuch (intensity)
    glowDist:   8,      // 📏 masofa (metr)
    glowSelf:   0.8,    // ✨ obyektning o'z porlashi (emissiveIntensity)
    glowShadow: false,  // 🌑 soya (o'chiq = devor orqasiga o'tadi)
    glowColor:  '',     // 🎨 bo'sh = material rangi
  };

  const _log = (m, c) => { try { log(m, c); } catch (e) {} };
  const _objs = () => (typeof objects !== 'undefined' ? objects : []);
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };

  /** Obyektning amaldagi sozlamasi (standart bilan to'ldirilgan). */
  function cfgOf(o) {
    const ud = (o && o.userData) || {};
    const c = {};
    for (const k in DEF) c[k] = (ud[k] !== undefined) ? ud[k] : DEF[k];
    return c;
  }

  /** Nur rangi — berilmagan bo'lsa materialdan. */
  function colorOf(o) {
    const ud = o.userData || {};
    if (ud.glowColor) return ud.glowColor;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.color && m.color.getHexString) return '#' + m.color.getHexString();
    return '#ffffff';
  }

  /** Materiallar ro'yxati (per-face bo'lsa hammasi). */
  function _mats(o) {
    const out = [];
    const push = (m) => { if (m) (Array.isArray(m) ? m : [m]).forEach(x => x && out.push(x)); };
    push(o.material);
    o.traverse(ch => { if (ch !== o && ch.isMesh) push(ch.material); });
    return out;
  }

  /**
   * Sozlamalarni obyektga qo'llaydi: chiroqni quradi/yangilaydi/o'chiradi
   * va materialning porlashini beradi.
   */
  function apply(o) {
    if (!o || !o.userData) return;
    const ud = o.userData;
    const c  = cfgOf(o);
    const col = colorOf(o);

    // ── 💡 Chiroq ──
    if (c.glowOn && num(c.glowPower, 0) > 0) {
      let L = ud._glowLight;
      if (!L || !L.parent) {
        L = new THREE.PointLight(new THREE.Color(col), 1, 1);
        L.name = '__objGlow';
        L.userData.__noSave = true;
        // ⚠ Nur obyektning ICHIDAN chiqadi — markazda.
        L.position.set(0, 0, 0);
        o.add(L);
        ud._glowLight = L;
      }
      L.color.set(col);
      L.intensity = num(c.glowPower, DEF.glowPower);
      L.distance  = Math.max(0.01, num(c.glowDist, DEF.glowDist));
      L.decay     = 2;
      L.castShadow = !!c.glowShadow;
      if (L.castShadow && L.shadow) {
        L.shadow.mapSize.set(512, 512);
        L.shadow.camera.near = 0.1;
        L.shadow.camera.far  = L.distance;
      }
      L.visible = true;
    } else if (ud._glowLight) {
      _removeLight(o);
    }

    // ── ✨ Materialning o'z porlashi ──
    const self = c.glowOn ? num(c.glowSelf, DEF.glowSelf) : 0;
    for (const m of _mats(o)) {
      if (!m || !m.emissive) continue;
      // ⚠ Asl emissiv rangni BIR MARTA eslab qolamiz. Har chaqiriqda
      //   yozsak, ikkinchi marta \"asl\" deb porlashning o'zini
      //   saqlab qo'yardik va o'chirganda u qaytmasdi.
      if (m.userData && m.userData.__emSaved === undefined) {
        m.userData.__emSaved = '#' + m.emissive.getHexString();
      }
      if (c.glowOn && self > 0) {
        m.emissive.set(col);
        m.emissiveIntensity = self;
      } else if (m.userData && m.userData.__emSaved !== undefined) {
        m.emissive.set(m.userData.__emSaved);
        m.emissiveIntensity = 1;
      }
      m.needsUpdate = true;
    }

    if (typeof requestShadowUpdate === 'function') requestShadowUpdate();
  }

  function _removeLight(o) {
    const L = o.userData && o.userData._glowLight;
    if (!L) return;
    try { if (L.parent) L.parent.remove(L); } catch (e) {}
    try { L.dispose && L.dispose(); } catch (e) {}
    delete o.userData._glowLight;
  }

  /** Inspektordan bitta maydonni yozadi. */
  function set(o, key, val) {
    if (!o || !(key in DEF)) return false;
    o.userData[key] = (key === 'glowOn' || key === 'glowShadow') ? !!val
                    : (key === 'glowColor') ? String(val || '')
                    : num(val, DEF[key]);
    apply(o);
    return true;
  }

  /**
   * ⏱ Timeline uchun holat. Faqat SONLAR va yoqiq/o'chiq — rang va
   *   soya kabi \"qaror\" sozlamalari keyframe ga tushmaydi, aks holda
   *   har keyda ularni ham qayta tanlash kerak bo'lardi.
   */
  function captureTL(o) {
    const ud = o && o.userData;
    if (!ud || ud.glowOn === undefined) return null;
    const c = cfgOf(o);
    return { gOn: !!c.glowOn, gPow: num(c.glowPower, 0),
             gDist: num(c.glowDist, 0), gSelf: num(c.glowSelf, 0) };
  }

  function applyTL(o, kf) {
    if (!o || !o.userData) return;
    let changed = false;
    if (kf.gOn   !== undefined) { o.userData.glowOn    = !!kf.gOn;  changed = true; }
    if (typeof kf.gPow  === 'number') { o.userData.glowPower = kf.gPow;  changed = true; }
    if (typeof kf.gDist === 'number') { o.userData.glowDist  = kf.gDist; changed = true; }
    if (typeof kf.gSelf === 'number') { o.userData.glowSelf  = kf.gSelf; changed = true; }
    if (changed) apply(o);
  }

  /**
   * Sahna yuklangandan keyin chiroqlarni qayta quradi.
   * ⚠ `_glowLight` — `_` bilan, ya'ni SAQLANMAYDI (u sahna obyekti
   *   emas). Sozlamalar esa saqlanadi — shundan qayta quriladi.
   */
  function syncAll() {
    let n = 0;
    for (const o of _objs()) {
      const ud = o && o.userData;
      if (!ud) continue;
      if (ud.glowOn && !ud._glowLight) { apply(o); n++; }
      else if (!ud.glowOn && ud._glowLight) { _removeLight(o); n++; }
    }
    return n;
  }

  let _t = 0;
  function update(delta) {
    // Har kadr emas — sahna yuklanishi kabi kamdan-kam hodisalar uchun
    _t += (delta || 0.016);
    if (_t < 0.5) return;
    _t = 0;
    syncAll();
  }

  // ============================================================
  //  🎛 Inspektor — 🎨 Material bo'limining ichida
  // ============================================================
  function inspectorHTML(o) {
    if (!o) return '';
    const c = cfgOf(o);
    const on = !!c.glowOn;
    const sl = (k, min, max, step, lbl, unit) => `
      <div class="fr"><span class="fl">${lbl}</span>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${c[k]}" style="flex:1"
          oninput="_glowSet('${k}', this.value, true)">
        <span id="glow-${k}-v" style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:32px;text-align:right">${(+c[k]).toFixed(2)}${unit || ''}</span>
      </div>`;
    const tgl = (k, yes, no) => `
      <button onclick="_glowSet('${k}', ${!c[k]})" style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;
        font-family:'Share Tech Mono',monospace;border:1px solid ${c[k] ? 'var(--accent3)' : 'var(--border)'};
        background:${c[k] ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};color:${c[k] ? 'var(--accent3)' : 'var(--muted)'}">
        ${c[k] ? yes : no}</button>`;

    return `
    <div style="border-top:1px solid rgba(255,221,68,.18);margin-top:6px;padding-top:6px">
      <div class="fr"><span class="fl" style="color:#ffdd44">✨ Yorqinlik</span>${tgl('glowOn', '✓ Yoniq', "✗ O'chiq")}</div>
      ${on ? `
        ${sl('glowPower', 0, 20, 0.1, '💪 Kuch', '')}
        ${sl('glowDist',  0, 100, 0.5, '📏 Masofa', 'm')}
        ${sl('glowSelf',  0, 5,  0.05, "✨ O'zi", '')}
        <div class="fr"><span class="fl">🎨 Nur rangi</span>
          <input type="color" value="${colorOf(o)}" oninput="_glowSet('glowColor', this.value)"
            style="width:22px;height:20px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none">
          <button onclick="_glowSet('glowColor','')" style="font-size:8px;padding:2px 6px;border:1px solid var(--border);
            background:transparent;color:var(--muted);border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">
            materialdan</button>
        </div>
        <div class="fr"><span class="fl">🌑 Soya</span>${tgl('glowShadow', '✓ Bor', "✗ Yo'q")}</div>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:3px;font-family:'Share Tech Mono',monospace">
          💪 <b>Kuch</b> atrofni yoritadi · ✨ <b>O'zi</b> faqat obyektni porlatadi
          (yorug'lik bermaydi).<br>
          🌑 Soya <b>o'chiq</b> bo'lsa nur <b style="color:#ffdd44">devor orqasiga</b> ham o'tadi.<br>
          ⏱ Kuch/masofa/porlash <b>timeline</b> da silliq o'zgaradi (I bilan key qo'ying).
        </div>
      ` : `<div style="font-size:8px;color:var(--muted);line-height:1.6;font-family:'Share Tech Mono',monospace">
          Obyektni chiroqqa aylantiradi: atrofni yoritadi va o'zi porlaydi.
        </div>`}
    </div>`;
  }

  window._glowSet = function (k, v, live) {
    if (typeof selectedObj === 'undefined' || !selectedObj) return;
    set(selectedObj, k, v);
    // ⚠ Shkalani sudrayotganda `updateInspector()` chaqirsak, panel
    //   qayta chizilib input FOKUSDAN chiqardi — sudrash uzilardi.
    //   Shuning uchun jonli o'zgarishda faqat raqamni yangilaymiz.
    if (live) {
      const el = document.getElementById('glow-' + k + '-v');
      if (el) el.textContent = (+selectedObj.userData[k]).toFixed(2) + (k === 'glowDist' ? 'm' : '');
      return;
    }
    if (typeof updateInspector === 'function') updateInspector();
  };

  return { DEF, cfgOf, colorOf, apply, set, captureTL, applyTL, syncAll, update, inspectorHTML };
})();
