// ============================================================
//  APEX3D — UNDO / REDO  v2   (to'liq qamrov)
//
//  ⚠ NEGA QAYTA YOZILDI: v1 (`engine.js` ichida turardi) sahnadan
//    FAQAT `position / rotation / scale` va materialning BIRINCHI
//    slotini o'qirdi. Ya'ni Ctrl+Z quyidagilarni QAYTARMASDI:
//
//      • obyekt o'chirilishi   — o'chgan narsa umuman qaytmasdi
//      • obyekt qo'shilishi    — qo'shilgan narsa yo'qolmasdi
//      • nusxalash (Ctrl+D)    — nusxa joyida qolardi
//      • iyerarxiya            — papkaga tortilgan obyekt chiqmasdi
//      • userData              — hitbox sozlamalari, tugma ulanishlari,
//                                matn, ovoz, timeline — HAMMASI
//      • ko'rinish / nom       — visible, name, castShadow
//      • 2-, 3-material        — per-face teksturalar (`material[]`)
//      • fizika                — massa, ishqalanish, static/dinamik
//      • yorug'lik             — quvvat, rang, o'chirilishi
//
//    Foydalanuvchi uchun bu "undo buzuq" degan taassurot berardi:
//    tugma bosiladi, toast chiqadi ("↩ Bekor qilindi"), lekin sahnada
//    hech nima o'zgarmaydi.
//
//    Bundan tashqari v1 da IKKI JIDDIY xato bor edi:
//
//    1️⃣ `applySnapshot` ichida `updateInspector()` chaqirilardi, u esa
//       ba'zi shoxlarda `captureState()` ga borib qolardi → BEKOR
//       QILISH o'zi yangi qadam yozib, tarixni buzardi. Endi
//       `_applying` bayrog'i bor: tiklash paytida yozuv bloklanadi.
//
//    2️⃣ `deleteSel` obyektni `disposeMany` bilan GPU dan bo'shatardi.
//       Tarixda havola qolganida ham geometriya/material allaqachon
//       o'lgan bo'lardi → qaytarilgan obyekt KO'RINMASDI. Endi
//       `disposeMany` o'ralgan: tarixda havolasi turgan obyekt
//       bo'shatilmaydi, u tarixdan CHIQQANDA bo'shatiladi.
//
//  ── MODEL: "amallar" emas, "HOLATLAR" ────────────────────────
//  Har bir `captureState()` sahnaning to'liq tasvirini yozadi;
//  `undo()` bir qadam orqadagi tasvirni qayta o'rnatadi.
//
//  Nega shunday: bu loyihada obyektni o'zgartiradigan yuzlab joy bor
//  va ularning hech biri bitta markazdan o'tmaydi. "Amal" (command)
//  modeli har bir o'zgartirish joyini qo'lda ro'yxatga olishni talab
//  qiladi — bittasi esdan chiqsa, undo JIMGINA buziladi. Holat modeli
//  esa haqiqatni sahnadan O'ZI o'qiydi: yangi xususiyat qo'shilsa,
//  u avtomatik qamrovga tushadi. Aynan shu sababdan mavjud 20 ta
//  `captureState()` chaqiruvi o'zgarishsiz ishlashda davom etadi.
//
//  ── NARXI: xotira. Uch chora ushlab turadi ───────────────────
//   1. O'ZGARMAGAN OBYEKT QAYTA ISHLATILADI. Har bir obyekt uchun
//      imzo (signature) hisoblanadi; imzo o'zgarmasa — oldingi
//      snapshotdagi AYNAN O'SHA yozuv obyekti ulashiladi. Odatda bir
//      qadamda 1 obyekt o'zgaradi, ya'ni 50 qadamlik tarix 50×N emas,
//      N + 50 ta yozuv saqlaydi.
//   2. `_` bilan boshlanadigan kalitlar (jonli havolalar: DOM tugun,
//      render target, THREE obyektlari, `_lentry`) KLONLANMAYDI —
//      havola sifatida olinadi. Bu ham xotirani, ham tsikl (circular)
//      muammosini hal qiladi: `light.userData._lentry.light.userData`
//      o'ziga qaytadi, JSON esa bunda yiqiladi.
//   3. Tarix `MAX_UNDO` qadamda kesiladi va chiqib ketgan obyektlar
//      shu payt GPU dan bo'shatiladi.
//
//  ⚠ CHEGARA (ataylab): `_` li maydonlar havola bo'lgani uchun ular
//    ICHIDAGI o'zgarish bekor qilinmaydi (masalan `ud._shape` ning
//    geometriyasi). Bu "jonli tutqich" chizig'i — `save-load.js` dagi
//    `_slCleanUD` bilan bir xil falsafa.
// ============================================================

const UndoSystem = (() => {
  'use strict';

  const MAX_UNDO = 50;

  let _stack     = [];            // holatlar; oxirgisi = JORIY holat
  let _redo      = [];
  let _applying  = false;         // tiklash davom etyapti → yozmaymiz
  let _recCache  = new WeakMap(); // Object3D -> {sig, rec}  (yozuvni ulashish)
  let _retained  = new Set();     // tarix ushlab turgan Object3D lar
  let _pendingFree = [];          // bo'shatish kutilyapti (tarixda turgani uchun)

  // ── Global holatga EHTIYOTKOR murojaat ──────────────────────
  //  `objects`, `lights`, `physBodies` — boshqa fayllardagi top-level
  //  `let/const`. Ular `window` da EMAS (faqat global leksik muhitda),
  //  shuning uchun `window.objects` ba'zan `undefined` bo'ladi.
  //  Bevosita nom bilan o'qiymiz, lekin TDZ/yo'qlik holatida
  //  yiqilmaslik uchun try/catch ichida.
  const _objs   = () => { try { return Array.isArray(objects)    ? objects    : []; } catch (e) { return []; } };
  const _lts    = () => { try { return Array.isArray(lights)     ? lights     : []; } catch (e) { return []; } };
  const _phys   = () => { try { return Array.isArray(physBodies) ? physBodies : []; } catch (e) { return []; } };
  const _scene  = () => { try { return (scene && scene.isObject3D) ? scene : null; } catch (e) { return null; } };
  const _jelly  = () => { try { return jellyObjects  instanceof Map ? jellyObjects  : null; } catch (e) { return null; } };
  const _cloth  = () => { try { return clothObjects  instanceof Map ? clothObjects  : null; } catch (e) { return null; } };
  const _liquid = () => { try { return liquidObjects instanceof Map ? liquidObjects : null; } catch (e) { return null; } };

  /** Global funksiyani xavfsiz chaqirish (test muhitida yo'q bo'lishi mumkin). */
  function _call(name) {
    const a = Array.prototype.slice.call(arguments, 1);
    try {
      const f = (typeof window !== 'undefined') ? window[name] : undefined;
      if (typeof f === 'function') return f.apply(null, a);
    } catch (e) { /* jim */ }
    return undefined;
  }

  // ============================================================
  //  KLONLASH — nimani nusxalash, nimani havola qoldirish
  // ============================================================

  /** `Vector3 / Euler / Color / Quaternion` — QIYMAT, klonlanadi. */
  function _isValueThree(v) {
    return !!(v && (v.isVector2 || v.isVector3 || v.isVector4 ||
                    v.isEuler   || v.isColor   || v.isQuaternion) &&
              typeof v.clone === 'function');
  }

  /** Faqat oddiy `{}` obyektga kiramiz. DOM / THREE / Map / Set / klass — yo'q. */
  function _isPlain(v) {
    if (typeof Node !== 'undefined' && v instanceof Node) return false;
    const p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }

  function _clone(v, depth, seen) {
    if (v === null || typeof v !== 'object') return v;   // primitiv
    if (depth > 12) return v;                            // juda chuqur — havola
    if (_isValueThree(v)) return v.clone();
    if (Array.isArray(v)) {
      if (seen.has(v)) return v;                         // tsikl
      seen.add(v);
      const out = new Array(v.length);
      for (let i = 0; i < v.length; i++) out[i] = _clone(v[i], depth + 1, seen);
      seen.delete(v);
      return out;
    }
    if (!_isPlain(v)) return v;                          // jonli obyekt — HAVOLA
    if (seen.has(v)) return v;
    seen.add(v);
    const out = {};
    for (const k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      if (k.charAt(0) === '_') { out[k] = v[k]; continue; }   // jonli tutqich
      const x = v[k];
      out[k] = (typeof x === 'function') ? x : _clone(x, depth + 1, seen);
    }
    seen.delete(v);
    return out;
  }

  /**
   * `userData` imzosi. `null` qaytsa — imzo hisoblab bo'lmadi, ya'ni
   * "har doim o'zgargan deb hisobla" (xavfsiz tomon).
   */
  function _udSig(ud) {
    if (!ud) return '{}';
    const seen = new Set();
    try {
      return JSON.stringify(ud, function (k, v) {
        if (k && k.charAt(0) === '_') return 0;              // jonli tutqich
        if (typeof v === 'function') return 0;
        if (v && typeof v === 'object') {
          if (_isValueThree(v)) return v.toArray ? v.toArray() : 1;
          if (!Array.isArray(v) && !_isPlain(v)) return 0;   // DOM / THREE / Map
          if (seen.has(v)) return 0;                         // tsikl
          seen.add(v);
        }
        return v;
      });
    } catch (e) { return null; }
  }

  // ============================================================
  //  MATERIAL — qiymatlar yozib olinadi, tiklashda AYNAN O'SHA
  //  material obyektiga qaytariladi.
  //
  //  ⚠ Nega yangi material yaratilmaydi: `obj.clone()` (Ctrl+D)
  //    materialni ULASHADI. Yangi material bersak, nusxa asl bilan
  //    aloqasini uzardi va `disposeMany` mantig'i chalkashardi.
  // ============================================================
  const _mats = o => Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);

  function _matRec(m) {
    if (!m) return null;
    return {
      ref: m,
      color:    m.color    ? m.color.clone()    : null,
      emissive: m.emissive ? m.emissive.clone() : null,
      emissiveIntensity: m.emissiveIntensity,
      roughness: m.roughness, metalness: m.metalness,
      opacity: m.opacity, transparent: m.transparent,
      wireframe: m.wireframe, visible: m.visible,
      side: m.side, depthWrite: m.depthWrite, flatShading: m.flatShading,
      map: m.map || null,
    };
  }

  function _matApply(r) {
    const m = r && r.ref; if (!m) return;
    if (r.color    && m.color)    m.color.copy(r.color);
    if (r.emissive && m.emissive) m.emissive.copy(r.emissive);
    if (r.emissiveIntensity !== undefined) m.emissiveIntensity = r.emissiveIntensity;
    if (r.roughness   !== undefined) m.roughness   = r.roughness;
    if (r.metalness   !== undefined) m.metalness   = r.metalness;
    if (r.opacity     !== undefined) m.opacity     = r.opacity;
    if (r.transparent !== undefined) m.transparent = r.transparent;
    if (r.wireframe   !== undefined) m.wireframe   = r.wireframe;
    if (r.visible     !== undefined) m.visible     = r.visible;
    if (r.side        !== undefined) m.side        = r.side;
    if (r.depthWrite  !== undefined) m.depthWrite  = r.depthWrite;
    if (r.flatShading !== undefined) m.flatShading = r.flatShading;
    m.map = r.map || null;
    m.needsUpdate = true;
  }

  const _matSig = r => r ? [
    r.color ? r.color.getHexString() : '',
    r.emissive ? r.emissive.getHexString() : '', r.emissiveIntensity,
    r.roughness, r.metalness, r.opacity, r.transparent ? 1 : 0,
    r.wireframe ? 1 : 0, r.visible ? 1 : 0, r.side, r.depthWrite ? 1 : 0,
    r.flatShading ? 1 : 0, r.map ? (r.map.uuid || 1) : '',
  ].join(':') : '-';

  // ============================================================
  //  FIZIKA — `physBodies` yozuvining sozlamalari
  //  (`vel` / `angVel` ATAYLAB olinmaydi: ular runtime holati,
  //   muharrirda ma'nosi yo'q va har kadr o'zgaradi.)
  // ============================================================
  function _physRec(o) {
    const b = _phys().find(x => x.mesh === o);
    if (!b) return null;
    return { mass: b.mass, restitution: b.restitution, friction: b.friction,
             isStatic: b.isStatic, radius: b.radius, shape: b.shape };
  }
  const _physSig = p => p ? [p.mass, p.restitution, p.friction,
                             p.isStatic ? 1 : 0, p.radius, p.shape].join(':') : '-';

  function _physRemove(o) {
    // `removeRapierBody` `physBodies` dan HAM chiqaradi (Rapier bo'lmasa ham).
    if (_call('removeRapierBody', o) !== undefined) return;
    const arr = _phys();
    const i = arr.findIndex(b => b.mesh === o);
    if (i > -1) arr.splice(i, 1);
  }

  // ============================================================
  //  OBYEKT YOZUVI
  // ============================================================
  const _n = v => Math.round(v * 1e4) / 1e4;   // imzo uchun yaxlitlash

  function _objRec(o) {
    const par      = o.parent || null;
    const childIdx = par ? par.children.indexOf(o) : -1;
    const udSig    = _udSig(o.userData);
    const mats     = _mats(o).map(_matRec);
    const phys     = _physRec(o);
    const j = _jelly(), c = _cloth(), l = _liquid();
    const inJ = !!(j && j.has(o)), inC = !!(c && c.has(o)), inL = !!(l && l.has(o));

    const sig = [
      par ? 1 : 0, childIdx, par ? (par.uuid || '') : '',
      _n(o.position.x), _n(o.position.y), _n(o.position.z),
      _n(o.rotation.x), _n(o.rotation.y), _n(o.rotation.z),
      _n(o.scale.x), _n(o.scale.y), _n(o.scale.z),
      o.visible ? 1 : 0, o.name || '', o.renderOrder,
      o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0,
      mats.map(_matSig).join('|'), _physSig(phys),
      inJ ? 1 : 0, inC ? 1 : 0, inL ? 1 : 0,
      udSig === null ? '?' : udSig,
    ].join(',');

    // ── Yozuvni QAYTA ISHLATISH (asosiy xotira tejamkorligi) ──
    //  ⚠ Imzo `null` bo'lsa (userData ni serializatsiya qilib
    //    bo'lmadi) — kesh ishlatilmaydi, har safar yangi yozuv.
    const cached = _recCache.get(o);
    if (cached && udSig !== null && cached.sig === sig) return cached.rec;

    const rec = {
      sig, ref: o, parentRef: par, childIdx, inScene: !!par,
      pos: o.position.clone(), rot: o.rotation.clone(), sca: o.scale.clone(),
      visible: o.visible, name: o.name, renderOrder: o.renderOrder,
      castShadow: o.castShadow, receiveShadow: o.receiveShadow,
      mats, phys,
      ud: _clone(o.userData || {}, 0, new Set()),
      jelly:  inJ ? j.get(o) : undefined,
      cloth:  inC ? c.get(o) : undefined,
      liquid: inL ? l.get(o) : undefined,
    };
    _recCache.set(o, { sig, rec });
    return rec;
  }

  // ============================================================
  //  YORUG'LIK YOZUVI
  //  ⚠ Chiroqlar `objects[]` da EMAS — alohida `lights[]` da.
  //    `deleteLight()` esa ilgari `captureState` ni umuman
  //    chaqirmasdi, ya'ni chiroq o'chirilishi bekor qilinmasdi.
  // ============================================================
  function _lightRec(e) {
    const L = e && e.light;
    return {
      ref: e, light: L || null, helper: e.helper || null, marker: e.marker || null,
      parent: e.parent || null, name: e.name, id: e.id, type: e.type,
      inScene: !!(L && L.parent),
      pos: (L && L.position) ? L.position.clone() : null,
      rot: (L && L.rotation) ? L.rotation.clone() : null,
      color: (L && L.color) ? L.color.clone() : null,
      intensity: L ? L.intensity : undefined,
      distance:  L ? L.distance  : undefined,
      angle:     L ? L.angle     : undefined,
      penumbra:  L ? L.penumbra  : undefined,
      visible:   L ? L.visible   : undefined,
      castShadow: L ? L.castShadow : undefined,
      ud: L ? _clone(L.userData || {}, 0, new Set()) : {},
    };
  }

  const _lightSig = r => [
    'L' + r.id, r.inScene ? 1 : 0, r.name || '', r.intensity,
    r.color ? r.color.getHexString() : '', r.visible ? 1 : 0,
    r.castShadow ? 1 : 0, r.distance, r.angle, r.penumbra,
    r.pos ? [_n(r.pos.x), _n(r.pos.y), _n(r.pos.z)].join(':') : '',
  ].join(',');

  function _restoreLight(r) {
    const L = r.light; if (!L) return;
    const par = r.parent || _scene();
    const sc  = _scene();
    if (r.inScene) {
      if (!L.parent && par) par.add(L);
      if (r.helper && !r.helper.parent && sc) sc.add(r.helper);
      if (r.marker && !r.marker.parent && par) par.add(r.marker);
      if (L.target && !L.target.parent && par) par.add(L.target);
    } else {
      if (L.parent) L.parent.remove(L);
      if (r.helper && r.helper.parent) r.helper.parent.remove(r.helper);
      if (r.marker && r.marker.parent) r.marker.parent.remove(r.marker);
      if (L.target && L.target.parent) L.target.parent.remove(L.target);
    }
    if (r.pos && L.position) L.position.copy(r.pos);
    if (r.rot && L.rotation) L.rotation.copy(r.rot);
    if (r.color && L.color)  L.color.copy(r.color);
    if (r.intensity  !== undefined) L.intensity = r.intensity;
    if (r.distance   !== undefined && 'distance' in L) L.distance = r.distance;
    if (r.angle      !== undefined && 'angle'    in L) L.angle    = r.angle;
    if (r.penumbra   !== undefined && 'penumbra' in L) L.penumbra = r.penumbra;
    if (r.visible    !== undefined) L.visible    = r.visible;
    if (r.castShadow !== undefined) L.castShadow = r.castShadow;
    _udApply(L, r.ud);
    if (r.ref) r.ref.name = r.name;
  }

  // ============================================================
  //  TIKLASH
  // ============================================================

  /**
   * `userData` ni snapshot holatiga keltiradi.
   *  • snapshotdan KEYIN qo'shilgan kalitlar o'chiriladi
   *  • `_` li kalitlarga TEGILMAYDI (jonli tutqichlar)
   *  • qiymatlar QAYTA KLONLANADI — aks holda keyingi tahrir
   *    tarixdagi nusxani buzardi va undo "yopishib" qolardi
   */
  function _udApply(o, snapUd) {
    if (!o) return;
    const ud = o.userData || (o.userData = {});
    for (const k of Object.keys(ud)) {
      if (k.charAt(0) === '_') continue;
      if (!Object.prototype.hasOwnProperty.call(snapUd, k)) delete ud[k];
    }
    const seen = new Set();
    for (const k in snapUd) {
      if (!Object.prototype.hasOwnProperty.call(snapUd, k)) continue;
      if (k.charAt(0) === '_') { ud[k] = snapUd[k]; continue; }
      ud[k] = _clone(snapUd[k], 0, seen);
    }
  }

  /** Sahnadan chiqarish. HAVOLA yo'qotilmaydi — tarix ushlab turadi. */
  function _detach(o) {
    if (!o) return;
    if (o.parent) o.parent.remove(o);
    _physRemove(o);
    const j = _jelly(), c = _cloth(), l = _liquid();
    if (j) j.delete(o);
    if (c) c.delete(o);
    if (l) l.delete(o);
  }

  function _restoreObj(r) {
    const o = r.ref; if (!o) return;

    // ── 1) Sahna grafi (o'chirilgan obyekt shu yerda QAYTADI) ──
    if (r.inScene) {
      const par = r.parentRef || _scene();
      if (o.parent !== par) {
        if (o.parent) o.parent.remove(o);
        if (par) par.add(o);
      }
      // Aka-uka tartibini ham tiklaymiz (render tartibi/iyerarxiya ko'rinishi)
      if (par && r.childIdx >= 0) {
        const cur = par.children.indexOf(o);
        if (cur >= 0 && cur !== r.childIdx) {
          par.children.splice(cur, 1);
          par.children.splice(Math.min(r.childIdx, par.children.length), 0, o);
        }
      }
    } else if (o.parent) {
      _detach(o);
    }

    // ── 2) Transform va ko'rinish ──
    o.position.copy(r.pos);
    o.rotation.copy(r.rot);
    o.scale.copy(r.sca);
    o.visible       = r.visible;
    o.name          = r.name;
    o.castShadow    = r.castShadow;
    o.receiveShadow = r.receiveShadow;
    if (r.renderOrder !== undefined) o.renderOrder = r.renderOrder;
    if (typeof o.updateMatrixWorld === 'function') o.updateMatrixWorld(true);

    // ── 3) userData ──
    _udApply(o, r.ud);

    // ── 4) Materiallar (BARCHA slotlar) ──
    for (const m of r.mats) _matApply(m);

    // ── 5) Fizika ──
    //  ⚠ Faqat sahnada bo'lsa. Sahnadan chiqarilgan obyektga tana
    //    qaytarsak, `updatePhysics` uni har kadr aylanardi.
    if (r.inScene) {
      const cur = _phys().find(b => b.mesh === o);
      if (r.phys) {
        if (!cur) {
          _call('addPhysicsBody', o, r.phys);
        } else {
          cur.mass = r.phys.mass; cur.restitution = r.phys.restitution;
          cur.friction = r.phys.friction; cur.isStatic = r.phys.isStatic;
          cur.radius = r.phys.radius; cur.shape = r.phys.shape;
        }
        // Rapier tanasini mesh ning JORIY holatiga keltiramiz — aks holda
        // tiklangan obyekt eski joyda, eski o'lchamda kollayder bilan qoladi.
        _call('rebuildRapierBody', o);
      } else if (cur) {
        _physRemove(o);
      }
    }

    // ── 6) Maxsus fizika a'zoligi (jelly / cloth / liquid) ──
    const j = _jelly(), c = _cloth(), l = _liquid();
    if (j) { if (r.jelly  !== undefined) j.set(o, r.jelly);  else j.delete(o); }
    if (c) { if (r.cloth  !== undefined) c.set(o, r.cloth);  else c.delete(o); }
    if (l) { if (r.liquid !== undefined) l.set(o, r.liquid); else l.delete(o); }
  }

  function _refresh() {
    _call('_markLoopCacheDirty');
    _call('updateHierarchy');
    _call('updateInspector');
    _call('updateStats');
  }

  function applySnapshot(s) {
    if (!s) return false;
    _applying = true;
    try {
      const wanted = new Set(s.objects.map(r => r.ref));

      // 1) Snapshotda YO'Q obyektlar sahnadan chiqadi
      //    (qo'shilishni bekor qilish / o'chirishni qaytarish)
      for (const o of _objs().slice()) if (!wanted.has(o)) _detach(o);

      // 2) Snapshotdagilar tiklanadi
      for (const r of s.objects) {
        try { _restoreObj(r); }
        catch (e) { try { console.error('[undo] obyekt tiklanmadi:', e); } catch (_) {} }
      }

      // 3) `objects[]` — AYNAN snapshotdagi tartib.
      //    ⚠ Massiv O'RNIDA o'zgartiriladi: `AppState.objects`,
      //      `window.objects` va boshqa fayllardagi `let objects` —
      //      hammasi BITTA massivga ishora qiladi. Yangi massiv
      //      berish o'sha aliaslarni uzib qo'yardi.
      const arr = _objs();
      arr.length = 0;
      for (const r of s.objects) arr.push(r.ref);

      // 4) Yorug'liklar
      for (const r of s.lights) {
        try { _restoreLight(r); }
        catch (e) { try { console.error('[undo] chiroq tiklanmadi:', e); } catch (_) {} }
      }
      const la = _lts();
      la.length = 0;
      for (const r of s.lights) la.push(r.ref);

      // 5) id hisoblagichlari — qaytarilgandan keyin yangi obyektlar
      //    o'chirilganning id sini QAYTA ishlatmasin. `id` butun
      //    dvigatel bo'ylab havola sifatida ishlatiladi (tugma → PC,
      //    hitbox → kamera), dublikat id jimgina noto'g'ri obyektga
      //    ulanishga olib keladi.
      if (s.objIdC !== undefined) {
        try { objIdC = s.objIdC; } catch (e) {}
        try { if (typeof AppState !== 'undefined') AppState.objIdC = s.objIdC; } catch (e) {}
      }

      // 6) Tanlov
      const sel = (s.sel && s.sel.parent) ? s.sel : null;
      _call('selectObject', sel);

      // 7) UI — bayroq HALI ko'tarilgan holda. `updateInspector` ba'zi
      //    shoxlarda `captureState()` ga boradi; shu yerda chaqirilsa
      //    u bloklanadi. (v1 dagi asosiy xato aynan shu edi.)
      _refresh();
    } finally {
      _applying = false;
    }
    return true;
  }

  // ============================================================
  //  disposeMany O'RAMI — tarixda turgan obyekt bo'shatilmaydi
  //
  //  ⚠ Bu — "o'chirishni bekor qilish" ishlashining SHARTI.
  //    `deleteSel` obyektni sahnadan olib, `disposeMany([o])` ni
  //    chaqiradi. Bo'shatilsa geometriya/material GPU dan ketadi va
  //    havola qolgan bo'lsa ham obyekt ko'rinmaydi.
  //
  //    Bo'shatish YO'Q qilinmaydi, KECHIKTIRILADI: obyekt tarixdan
  //    chiqqanda (`MAX_UNDO` dan oshgan yoki `reset()`) bo'shatiladi.
  // ============================================================
  let _origDisposeMany = null;
  function _installDisposeGuard() {
    if (typeof window === 'undefined') return false;
    if (typeof window.disposeMany !== 'function') return false;
    if (window.disposeMany.__undoWrapped) return true;
    _origDisposeMany = window.disposeMany;
    const wrapped = function (roots) {
      if (!Array.isArray(roots) || !roots.length) return _origDisposeMany(roots);
      const free = [], keep = [];
      for (const r of roots) (_retainedTree(r) ? keep : free).push(r);
      for (const r of keep) if (_pendingFree.indexOf(r) < 0) _pendingFree.push(r);
      if (!free.length) {
        return { geometries: 0, materials: 0, textures: 0, renderTargets: 0,
                 kept: keep.length, deferred: keep.length };
      }
      const st = _origDisposeMany(free);
      if (st) st.deferred = keep.length;
      return st;
    };
    wrapped.__undoWrapped = true;
    window.disposeMany = wrapped;
    // `disposeDeep` o'rami orqali o'tsin (u `window.disposeMany` ni
    // yozib olgan bo'lishi mumkin — qayta bog'laymiz).
    window.disposeDeep = function (root) { return window.disposeMany([root]); };
    return true;
  }

  /** Obyekt YOKI uning bolalaridan biri tarixda ushlanganmi? */
  function _retainedTree(r) {
    if (!r) return false;
    if (_retained.has(r)) return true;
    let hit = false;
    try { r.traverse(n => { if (_retained.has(n)) hit = true; }); } catch (e) {}
    return hit;
  }

  /** Tarix o'zgargach: ushlanganlar ro'yxatini qayta qurish + kechiktirilgan bo'shatish. */
  function _sync() {
    _retained = new Set();
    const add = s => {
      for (const r of s.objects) if (r.ref) _retained.add(r.ref);
      for (const l of s.lights)  if (l.light) _retained.add(l.light);
    };
    for (const s of _stack) add(s);
    for (const s of _redo)  add(s);

    if (_pendingFree.length) {
      const now  = [];
      const rest = [];
      for (const o of _pendingFree) {
        // ⚠ SAHNAGA QAYTGAN obyekt navbatdan BUTUNLAY chiqadi
        //   (o'chirish bekor qilindi). Ilgari u `rest` da qolardi va
        //   ro'yxat o'sib boraverardi: har "o'chir → bekor qil" jufti
        //   bitta abadiy yozuv qo'shardi. Yana o'chirilsa `disposeMany`
        //   o'zi qayta ro'yxatga qo'yadi — yo'qotadigan narsa yo'q.
        if (o && o.parent) continue;
        // Tarixdan ham chiqdi → endi haqiqatan bo'shatish mumkin
        (!_retainedTree(o)) ? now.push(o) : rest.push(o);
      }
      _pendingFree = rest;
      if (now.length && _origDisposeMany) {
        try { _origDisposeMany(now); } catch (e) {}
      }
    }
  }

  // ============================================================
  //  OMMAVIY API
  // ============================================================

  function _snapshot(label) {
    const s = {
      label: label || '',
      t: Date.now(),
      objects: _objs().map(_objRec),
      lights:  _lts().map(_lightRec),
      objIdC:  (() => { try { return objIdC; } catch (e) { return undefined; } })(),
      sel:     (() => { try { return selectedObj || null; } catch (e) { return null; } })(),
    };
    s.sig = s.objects.map(r => r.sig).join(';') + '#' +
            s.lights.map(_lightSig).join(';') + '#' +
            (s.sel ? (s.sel.uuid || '') : '-');
    return s;
  }

  function captureState(label) {
    if (_applying) return false;                 // ⛔ tiklash paytida yozmaymiz
    if (!_scene()) return false;                 // sahna hali qurilmagan
    _installDisposeGuard();                      // dispose.js yuklangan bo'lsa — o'raymiz

    let s;
    try { s = _snapshot(label); }
    catch (e) { try { console.error('[undo] snapshot olinmadi:', e); } catch (_) {} return false; }

    // ── Hech nima o'zgarmagan bo'lsa — tarixni ifloslantirmaymiz.
    //    (Gizmo ni bosib, surmasdan qo'yib yuborish ham `captureState`
    //     chaqiradi; ilgari har bir bosish bitta "qadam" yozardi va
    //     Ctrl+Z hech narsa qilmaganday ko'rinardi.)
    const top = _stack[_stack.length - 1];
    if (top && top.sig === s.sig) {
      if (label) top.label = label;
      return false;
    }

    _stack.push(s);
    if (_stack.length > MAX_UNDO) _stack.shift();
    _redo.length = 0;
    _sync();
    return true;
  }

  function undo() {
    if (_stack.length < 2) { _toast("⚠ Bekor qilinadigan narsa yo'q"); return false; }
    const cur  = _stack.pop();
    _redo.push(cur);
    const prev = _stack[_stack.length - 1];
    _sync();                       // ikkisi ham tarixda — hech nima bo'shatilmaydi
    applySnapshot(prev);
    _toast('↩ Bekor qilindi: ' + (cur.label || 'amal'));
    return true;
  }

  function redo() {
    if (!_redo.length) { _toast('⚠ Qayta qilinadigan narsa yo\'q'); return false; }
    const next = _redo.pop();
    _stack.push(next);
    _sync();
    applySnapshot(next);
    _toast('↪ Qaytarildi: ' + (next.label || 'amal'));
    return true;
  }

  /**
   * Tarixni tozalash. Sahna BUTUNLAY almashganda chaqiriladi
   * (fayldan yuklash, kartalar kutubxonasi, yangi sahna).
   *
   * ⚠ Nega shart: eski sahnaning obyektlari tarixda ushlangani uchun
   *   `disposeMany` ularni bo'shatmaydi. Tarix tozalanmasa, yuklangan
   *   har bir sahna xotirada qolib ketardi.
   */
  function reset(label) {
    _stack.length = 0;
    _redo.length  = 0;
    _recCache     = new WeakMap();
    _retained     = new Set();
    const pf = _pendingFree.slice();
    _pendingFree.length = 0;
    const free = pf.filter(o => o && !o.parent);
    if (free.length && _origDisposeMany) { try { _origDisposeMany(free); } catch (e) {} }
    if (label !== undefined) captureState(label || 'Sahna yuklandi');
  }

  function _toast(msg) {
    try {
      const el = (typeof document !== 'undefined' && document.getElementById)
        ? document.getElementById('undo-toast') : null;
      if (!el) return;
      // ⚠ Ilgari `textContent = msg` yozilardi — bu toast ichidagi
      //   SVG ikonkani ham o'chirib tashlardi (birinchi undo dan keyin
      //   ikonka boshqa qaytmasdi). Ikonkani saqlab qolamiz.
      const ic = el.querySelector ? el.querySelector('svg') : null;
      el.textContent = '';
      if (ic) el.appendChild(ic);
      el.appendChild(document.createTextNode(' ' + msg));
      el.style.opacity = '1';
      clearTimeout(el._tmr);
      el._tmr = setTimeout(() => { el.style.opacity = '0'; }, 1600);
    } catch (e) { /* jim */ }
  }

  return {
    captureState, undo, redo, applySnapshot, reset,
    canUndo: () => _stack.length > 1,
    canRedo: () => _redo.length > 0,
    labels:  () => _stack.map(s => s.label),
    /** Diagnostika: `undoStats()` konsolda. */
    stats: () => ({
      steps: _stack.length, redo: _redo.length, max: MAX_UNDO,
      retained: _retained.size, pendingFree: _pendingFree.length,
      guarded: !!(typeof window !== 'undefined' && window.disposeMany &&
                  window.disposeMany.__undoWrapped),
    }),
    _installDisposeGuard,
  };
})();

// ── Global API (eski chaqiruvlar o'zgarishsiz ishlaydi) ────────
//  ⚠ Quyidagi qator AYNAN shu ko'rinishda (chekinishsiz) bo'lishi
//    kerak: `test-prefab-visual.js` da qorovul bor — IIFE ichida
//    yashagan tizim `window` ga chiqarilmasa, uni boshqa fayllar
//    (`typeof X !== 'undefined'` bilan tekshiruvchilar) ko'rmaydi.
window.UndoSystem = UndoSystem;
if (typeof window !== 'undefined') {
  window.captureState  = UndoSystem.captureState;
  window.undo          = UndoSystem.undo;
  window.redo          = UndoSystem.redo;
  window.applySnapshot = UndoSystem.applySnapshot;
  window.undoReset     = UndoSystem.reset;
  window.undoStats     = UndoSystem.stats;
}
