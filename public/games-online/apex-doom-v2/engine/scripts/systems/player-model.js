// ============================================================
// 👤 O'YINCHI MODELINI ALMASHTIRISH
// ------------------------------------------------------------
//  Hitboxga kirganda yoki tugma bosilganda o'yinchining KO'RINISHI
//  boshqa obyektnikiga almashadi (kostyum / skin).
//
//  3 xil rejim:
//    ⏱ VAQTINCHALIK — kirganda o'zgaradi, CHIQQANDA o'ziga qaytadi
//    📌 DOIMIY       — kirganda o'zgaradi va QOLADI
//                      (boshqa hitbox/tugma "qaytarish" bilan o'chiradi)
//    ↩️ QAYTARISH    — asl modelga qaytaradi (o'chirish hitboxi)
//
//  ⚠ Faqat KO'RINISH almashadi. O'yinchi obyektining o'zi
//  (scale, kolayder, fizika, boshqaruv) tegilmaydi — aks holda
//  har almashuvda to'qnashuv qutisi o'zgarib, o'yinchi yerga
//  botib yoki havoga chiqib ketardi.
// ============================================================

const PlayerModelSystem = (() => {
  'use strict';

  // Ko'rinmas material — o'yinchining asl geometriyasini yashirish uchun.
  // material.visible = false qilsak, boshqa obyektlar bilan material
  // ulashilgan bo'lsa ular ham yo'qolardi. Shuning uchun ALMASHTIRAMIZ.
  const _INVIS = new THREE.MeshBasicMaterial({ visible: false });

  function _player() {
    if (window.PlayerController && PlayerController.obj) return PlayerController.obj;
    if (typeof objects !== 'undefined') {
      const p = objects.find(o => o.userData && o.userData.isPlayerObj);
      if (p) return p;
    }
    if (typeof playerMesh !== 'undefined' && playerMesh) return playerMesh;
    return null;
  }

  // ── Asl ko'rinishni yashirish ───────────────────────────────
  function _hideOriginal(p) {
    const ud = p.userData;
    if (ud._pmHidden) return;              // allaqachon yashirilgan
    ud._pmHidden = { mat: null, kids: [] };

    if (p.isMesh && p.material) {          // oddiy shakl — materialni almashtiramiz
      ud._pmHidden.mat = p.material;
      p.material = _INVIS;
    }
    // GLB / guruh — bolalarni yashiramiz (skin va gizmodan tashqari)
    p.children.forEach(c => {
      const cu = c.userData || {};
      if (cu._pmSkin || cu.isPCCam || cu._pathGizmo) return;
      ud._pmHidden.kids.push([c, c.visible]);
      c.visible = false;
    });
  }

  function _showOriginal(p) {
    const ud = p.userData;
    if (!ud._pmHidden) return;
    if (ud._pmHidden.mat && p.isMesh) p.material = ud._pmHidden.mat;
    ud._pmHidden.kids.forEach(([c, v]) => { c.visible = v; });
    ud._pmHidden = null;
  }

  // ── Skinni olib tashlash ────────────────────────────────────
  function _dropSkin(p) {
    const ud = p.userData;
    if (!ud._pmSkin) return;
    p.remove(ud._pmSkin);
    ud._pmSkin.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    ud._pmSkin = null;
    ud._pmSrcId = null;
    ud._pmSig = null;
  }

  // ── 👤 Modelni o'rnatish ────────────────────────────────────
  function apply(srcId, opts) {
    const p = _player();
    if (!p) { log('⚠ O\'yinchi obyekti topilmadi', 'lw'); return false; }
    const src = objects.find(o => String(o.userData && o.userData.id) === String(srcId));
    if (!src) { log('⚠ Model obyekti topilmadi (id: ' + srcId + ')', 'lw'); return false; }
    if (src === p) { log('⚠ O\'yinchining o\'zini model qilib bo\'lmaydi', 'lw'); return false; }

    // ⚠ TUZATILDI: faqat modelId ni solishtirish YETARLI EMAS.
    // scale/yaw/offset o'zgarsa ham qayta qurish kerak — aks holda
    // panelda o'lchamni o'zgartirsangiz hech narsa bo'lmasdi.
    const sig = String(srcId) + '|' + ((opts && opts.scale) ?? 1) + '|' + ((opts && opts.yaw) ?? 0)
              + '|' + JSON.stringify((opts && opts.offset) || {});
    if (p.userData._pmSig === sig) return true;

    _dropSkin(p);
    _hideOriginal(p);

    const skin = src.clone(true);
    skin.traverse(o => {
      o.userData = { _pmSkin: true };
      o.castShadow = true; o.receiveShadow = false;
      o.raycast = () => {};              // skin sichqoncha/nur uchun to'siq bo'lmasin
    });
    skin.userData = { _pmSkin: true };
    skin.visible = true;

    // ⚠ O'yinchining scale'ini BEKOR qilamiz.
    // Skin o'yinchining bolasi bo'lgani uchun uning scale'ini meros
    // oladi. O'yinchi 0.8×1.8×0.8 bo'lsa, model cho'zilib ketardi.
    const ps = p.scale;
    const off = opts && opts.offset ? opts.offset : { x: 0, y: 0, z: 0 };
    const sc  = (opts && opts.scale) ? opts.scale : 1;
    skin.scale.set(
      (src.scale.x * sc) / (ps.x || 1),
      (src.scale.y * sc) / (ps.y || 1),
      (src.scale.z * sc) / (ps.z || 1)
    );
    skin.position.set(off.x / (ps.x || 1), off.y / (ps.y || 1), off.z / (ps.z || 1));
    skin.rotation.set(0, (opts && opts.yaw ? opts.yaw : 0) * Math.PI / 180, 0);

    p.add(skin);
    p.userData._pmSkin = skin;
    p.userData._pmSrcId = srcId;
    p.userData._pmSig = sig;
    log(`👤 Model: ${src.userData.name}`, 'lok');
    return true;
  }

  // ── ↩️ Asl modelga qaytarish ────────────────────────────────
  function revert() {
    const p = _player();
    if (!p) return false;
    if (!p.userData._pmSkin && !p.userData._pmHidden) return false;
    _dropSkin(p);
    _showOriginal(p);
    log('👤 Model o\'ziga qaytdi', 'lok');
    return true;
  }

  function current() {
    const p = _player();
    return p && p.userData._pmSrcId != null ? p.userData._pmSrcId : null;
  }
  function isChanged() { return current() != null; }

  // ── Hitbox / tugma shuni chaqiradi ──────────────────────────
  //  cfg: { enabled, mode, modelId, scale, yaw, offset }
  //  mode: 'temp' | 'keep' | 'revert'
  //  phase: 'enter' | 'exit'
  function fire(cfg, phase) {
    if (!cfg || !cfg.enabled) return;
    const mode = cfg.mode || 'temp';

    if (mode === 'revert') {                 // ↩️ o'chirish hitboxi
      if (phase === 'enter') revert();
      return;
    }
    if (phase === 'enter') {
      if (!cfg.modelId) { log('⚠ Model tanlanmagan', 'lw'); return; }
      apply(cfg.modelId, cfg);
      // ⏱ VAQTINCHALIK bo'lsa — qaysi hitbox qo'yganini eslab qolamiz
      const p = _player();
      if (p) p.userData._pmTemp = (mode === 'temp');
      return;
    }
    // exit — faqat vaqtinchalik rejimda qaytaramiz
    if (phase === 'exit' && mode === 'temp') revert();
  }

  // ── Play tugaganda — asl holatga ────────────────────────────
  let _wasPlaying = false;
  function update() {
    const playing = (typeof isPlaying !== 'undefined') && isPlaying;
    if (!playing && _wasPlaying) revert();   // ✏️ Editorda o'yinchi o'zi bo'lsin
    _wasPlaying = playing;
  }

  return { apply, revert, current, isChanged, fire, update };
})();

window.PlayerModelSystem = PlayerModelSystem;

// ── Umumiy Inspector bloki (hitbox VA tugma ishlatadi) ────────
//  setFn — 'window._hbSetAction("playerModel",' yoki 'window._ibtnSetPM('
window._pmBlock = function (cfg, setter) {
  cfg = cfg || {};
  const mode = cfg.mode || 'temp';
  const S = (f, v) => `${setter}('${f}', ${v})`;

  // ⚠ ALOMAT: ierarxiyadagi KO'P obyekt ro'yxatda chiqmasdi.
  //
  // ⚠ SABAB: `!u.isStatic`. Sahnadagi obyektlarning aksariyati
  //   qo'zg'almas (dekor, bino, tosh) — ular hammasi tashlab
  //   yuborilardi. Holbuki o'yinchi modeli uchun jismning qo'zg'aluvchan
  //   yoki qo'zg'almasligi UMUMAN ahamiyatsiz: undan faqat ko'rinish
  //   (geometriya + material) nusxa olinadi.
  //
  //   Aksincha, eng ko'p ishlatiladigan holat — sahnaga qo'yilgan
  //   qo'zg'almas GLB qahramon. Ya'ni filtr aynan keraklisini
  //   yashirardi.
  const cand = (typeof objects !== 'undefined' ? objects : []).filter(o => {
    const u = o.userData;
    return u && u.id != null && !u.isPlayerObj && !u.isHitbox && !u.isPath &&
           !u.isPCCam && !u.isPCBlock && !u.isCamera && !u.isInteractiveBtn &&
           !u.isMiniPad && !u.isSoundBlock && !u.isTextBlock && !u.isMapLoader &&
           !u.isStartBlock && !u.isFinishBlock &&
           !u._pathShapeHide;
  });

  const mb = (act, on, ico, lbl, col) => `
    <button onclick="${on}" style="background:${act ? col+'26' : 'transparent'};
      border:1px solid ${act ? col : 'var(--border)'};color:${act ? col : 'var(--muted)'};
      padding:6px 3px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;
      font-size:8px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:2px">
      <span style="font-size:13px">${ico}</span><span>${lbl}</span></button>`;

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:4px">
      ${mb(mode==='temp',   S('mode', "'temp'"),   '⏱', 'VAQTINCHA', '#66ccff')}
      ${mb(mode==='keep',   S('mode', "'keep'"),   '📌', 'DOIMIY',    'var(--accent3)')}
      ${mb(mode==='revert', S('mode', "'revert'"), '↩️', 'QAYTARISH', '#ff8844')}
    </div>
    ${mode !== 'revert' ? `
      <div class="fr" style="margin-top:5px"><span class="fl">Model</span>
        <select class="fv" onchange="${setter}('modelId', this.value||null)">
          <option value="">— tanlang —</option>
          ${cand.map(o => `<option value="${o.userData.id}" ${String(cfg.modelId)===String(o.userData.id)?'selected':''}>${o.userData.isGLB?'📦':'▪'} ${o.userData.name}</option>`).join('')}
        </select></div>
      ${!cand.length ? `<div style="font-size:8px;color:#ff8844;margin-top:3px;font-family:'Share Tech Mono',monospace">
        ⚠ Sahnada mos obyekt yo'q — GLB yoki shakl qo'shing.</div>` : ''}
      <div class="fr"><span class="fl">O'lcham ×</span>
        <input class="fv" type="number" step="0.1" min="0.05" value="${(cfg.scale ?? 1).toFixed(2)}"
          oninput="${setter}('scale', Math.max(0.05, parseFloat(this.value)||1))"></div>
      <div class="fr"><span class="fl">Burchak°</span>
        <input class="fv" type="number" step="15" value="${cfg.yaw ?? 0}"
          oninput="${setter}('yaw', parseFloat(this.value)||0)"></div>
      <div class="fr"><span class="fl">Y siljish</span>
        <input class="fv" type="number" step="0.1" value="${(cfg.offset?.y ?? 0).toFixed(2)}"
          oninput="${setter}('offset', {x:0, y:parseFloat(this.value)||0, z:0})"></div>
    ` : ''}
    <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 7px;background:rgba(0,0,0,.2);border-radius:2px">
      ${mode==='temp'
        ? '⏱ <b style="color:#66ccff">VAQTINCHALIK</b> — kirganda model o\'zgaradi, <b>chiqqanda o\'ziga qaytadi</b>.'
        : mode==='keep'
          ? '📌 <b style="color:var(--accent3)">DOIMIY</b> — kirganda o\'zgaradi va <b>qoladi</b>.<br><span style="color:var(--border)">Qaytarish uchun boshqa hitbox/tugmaga ↩️ QAYTARISH qo\'ying.</span>'
          : '↩️ <b style="color:#ff8844">QAYTARISH</b> — o\'yinchini <b>asl modeliga</b> qaytaradi. Model tanlash shart emas.'}
      <br><span style="color:var(--border)">Faqat ko'rinish almashadi — kolayder, fizika, boshqaruv tegilmaydi.</span>
    </div>`;
};
