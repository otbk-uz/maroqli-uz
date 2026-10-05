// ============================================================
//  BONE SYSTEM v2  —  Blenderда riglangan GLB suyaklari
//  • INSPEKTOR ичida yig'iladigan daraxt (suzmaydi)
//  • Viewport'да nuqtани bosib tanlash
//  • Toolbar'да 🦴 tugma — hamma suyakni berkitish/ko'rsatish
//  • O'ynaганда suyaklar avtomatik ko'rinmaydi
// ============================================================
(() => {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('[BoneRig] THREE yo\'q'); return; }
  const _log = (m, t) => { try { (window.log || console.log)(m, t || 'lok'); } catch (e) { console.log(m); } };

  const COL_BONE = 0x33ddff, COL_SEL = 0xff9a3c;
  let _hlStarted = false, _inspHooked = false, _clickHooked = false;
  let _bonesHidden = false, _lastHide = null, _swallowClick = false;
  const _boneMap = {};                 // id -> bone
  const _hitTargets = [];              // bosib tanlash uchun (ko'rinmas katta sferalar)
  const _rigs = [];                    // riglangan modellar (skeleton helper uchun)
  const _ray = new THREE.Raycaster();

  const _playing = () => (document.body.classList.contains('play-mode')) ||
    (typeof isPlaying !== 'undefined' && isPlaying) || window.isPlaying;
  const _canvas = () => (typeof renderer !== 'undefined' && renderer && renderer.domElement)
    ? renderer.domElement : document.querySelector('#viewport canvas, canvas');
  const _cam = () => (typeof camera !== 'undefined' && camera) ? camera : window.camera;

  function _collectBones(model) { const b = []; if (model) model.traverse(o => { if (o.isBone) b.push(o); }); return b; }
  function _topModel(o) { let p = o; while (p && !(p.userData && p.userData.isGLB) && p.parent) p = p.parent; return p || o; }
  function _modelOf(sel) {
    if (!sel) return null;
    if (sel.isBone) { let p = sel; while (p && !(p.userData && p.userData.isGLB)) p = p.parent; return p; }
    if (sel.userData && sel.userData.isGLB && sel.userData._boneExposed) return sel;
    return null;
  }

  function _register(bone, model, i, markerR) {
    if (!(bone.userData && bone.userData._rigged)) {
      bone.userData = Object.assign(bone.userData || {}, {
        id: (typeof objIdC !== 'undefined') ? ++objIdC : (Date.now() + i),
        name: ((model.userData && model.userData.name) || 'Model') + ' / ' + (bone.name || ('Bone' + i)),
        isBone: true, _rigged: true, _noSave: true,
      });
    }
    _boneMap[bone.userData.id] = bone;
    // objects[] ga qaytaramiz — timeline/tugma/hitbox target'ni shu yerdan topadi.
    // (Ierarxiyada isBone bilan yashiriladi — ro'yxatni to'ldirmaydi.)
    if (typeof objects !== 'undefined' && objects.indexOf(bone) < 0) objects.push(bone);
    let mk = bone.getObjectByName('__bm__');
    if (!mk) {
      mk = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8),
        new THREE.MeshBasicMaterial({ color: COL_BONE, depthTest: false, transparent: true, opacity: 0.95 }));
      mk.name = '__bm__'; mk.renderOrder = 999; mk.raycast = () => {}; mk.userData.__noSave = true;
      mk.visible = !(_bonesHidden || _playing());   // o'yin paytida yaratilsa — ko'rinmasin
      bone.add(mk);
      // ko'rinmas KATTA hit-sfera (bosib tanlash oson bo'lsin)
      const hit = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6),
        new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
      hit.name = '__bh__'; hit.userData.__noSave = true; hit.userData._bone = bone;
      bone.add(hit); _hitTargets.push(hit);
      bone.userData._hit = hit;
    }
    const ws = bone.getWorldScale(new THREE.Vector3());
    const s = markerR / Math.max(1e-4, (ws.x + ws.y + ws.z) / 3);
    mk.scale.setScalar(s);
    if (bone.userData._hit) bone.userData._hit.scale.setScalar(s);
    bone.userData._marker = mk; bone.userData._mkBase = s;
  }

  function _showSkeleton(group, model) {
    let h = group.userData._skelHelper || (model.userData && model.userData._skelHelper);
    if (!h) { h = new THREE.SkeletonHelper(model); group.add(h); }
    // ⚠ HAVOLA IKKALASIGA HAM YOZILADI.
    //   Model KUBGA biriktirilgan bo'lsa `group` (kub) ≠ `model` (ichki GLB).
    //   Helper `group` ga qo'yilardi, `_rigs` esa `model` ni saqlardi va
    //   `_applyVisibility()` uni `model.userData._skelHelper` da qidirardi —
    //   topmasdi. Natijada o'yin boshlanganda skelet "simlari" ekranda
    //   QOLIB KETARDI (muharrir gizmosi o'yinda ko'rinib turardi).
    group.userData._skelHelper = h;
    if (model.userData) model.userData._skelHelper = h;
    // ⚠ QAT'IY `true` EMAS. `_applyVisibility()` faqat holat O'ZGARGANDA
    //   ishlaydi (`_lastHide` keshi). Agar rig O'YIN PAYTIDA ochilsa
    //   (masalan karta GLB model olib kelsa), bu yer helperni yoqar,
    //   kesh esa uni qayta yashirishga yo'l qo'ymasdi — skelet "simlari"
    //   o'yinda ko'rinib turardi.
    h.visible = !(_bonesHidden || _playing());
    if (h.material) { h.material.depthTest = false; h.material.transparent = true; h.material.opacity = 0.9; }
    h.renderOrder = 998; return h;
  }

  function autoExpose(group) {
    if (!group) return;
    const model = group.userData && group.userData.isGLB ? group : _topModel(group);
    const bones = _collectBones(model);
    if (!bones.length) return;
    model.userData._boneExposed = true;
    model.traverse(o => { if (o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const markerR = Math.max(0.01, Math.max(size.x, size.y, size.z) * 0.012);
    bones.forEach((b, i) => _register(b, model, i, markerR));
    _showSkeleton(group, model);
    if (_rigs.indexOf(model) < 0) _rigs.push(model);
    if (group !== model && _rigs.indexOf(group) < 0) _rigs.push(group);   // kubga biriktirilgan holat
    // ⚠ Keshni BEKOR QILAMIZ: yangi rig qo'shildi, `_applyVisibility()`
    //   uni ham qamrab olishi kerak. Aks holda `hide` qiymati o'zgarmagani
    //   uchun funksiya darhol qaytib ketardi.
    _lastHide = null;
    // Import qilinganda model ierarxiyada YIG'ILGAN tursin (46 suyak to'lib ketmasin)
    try { if (typeof hierCollapsed !== 'undefined' && model.userData.id != null) hierCollapsed.add(model.userData.id); } catch (e) {}
    if (typeof updateHierarchy === 'function') updateHierarchy();
    _startHighlight(); _hookInspector(); _hookClick(); _ensureToolbarBtn(); _hookHierarchy();
    if (typeof updateInspector === 'function') { try { updateInspector(); } catch (e) {} }
    setTimeout(_buildHierBones, 60);   // render tugagach nested daraxt
    _log(`🦴 "${model.userData && model.userData.name}" — ${bones.length} suyak. Nuqtani bosib yoki INSPEKTORдан tanlang.`, 'lok');
  }

  function exposeSelected() {
    const sel = (typeof selectedObj !== 'undefined') ? selectedObj : window.selectedObj;
    if (!sel) { _log('⚠ Riglangan modelni tanlang', 'lw'); return; }
    const model = _topModel(sel);
    if (!_collectBones(model).length) { _log('⚠ Bu modelда suyak yo\'q', 'lw'); return; }
    autoExpose(model);
  }

  // ── Berkitish/ko'rsatish (toolbar tugma + o'ynash) ──
  function _applyVisibility() {
    // F rejimida suyaklar KO'RINADI — faqat gizmo yashirinadi (gizmo.js hal qiladi).
    // Suyaklar faqat 🦴 tugma yoki o'ynash paytida yashiriladi.
    const hide = _bonesHidden || _playing();
    if (hide === _lastHide) return;
    _lastHide = hide;
    for (const id in _boneMap) { const b = _boneMap[id]; if (b.userData._marker) b.userData._marker.visible = !hide; }
    for (const m of _rigs) { if (m.userData._skelHelper) m.userData._skelHelper.visible = !hide; }
    const btn = document.getElementById('bone-hide-btn');
    if (btn) btn.style.opacity = _bonesHidden ? '0.45' : '1';
  }
  function toggleHidden() { _bonesHidden = !_bonesHidden; _lastHide = null; _applyVisibility(); }

  function _startHighlight() {
    if (_hlStarted) return; _hlStarted = true;
    let last = null;
    const tick = () => {
      _applyVisibility();
      const sel = (typeof selectedObj !== 'undefined') ? selectedObj : window.selectedObj;
      if (sel !== last) {
        if (last && last.userData && last.userData._marker) {
          last.userData._marker.material.color.setHex(COL_BONE);
          last.userData._marker.scale.setScalar(last.userData._mkBase || 1);
        }
        if (sel && sel.isBone && sel.userData && sel.userData._marker) {
          sel.userData._marker.material.color.setHex(COL_SEL);
          sel.userData._marker.scale.setScalar((sel.userData._mkBase || 1) * 1.8);
        }
        last = sel;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── Viewport'да nuqtани bosib tanlash ──
  function _hookClick() {
    if (_clickHooked) return;
    const cv = _canvas();
    if (!cv) { setTimeout(_hookClick, 500); return; }
    _clickHooked = true;
    const down = e => {
      if (_bonesHidden || _playing() || !_hitTargets.length) return;
      const cam = _cam(); if (!cam) return;
      const rect = cv.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _ray.setFromCamera({ x: nx, y: ny }, cam);
      const hits = _ray.intersectObjects(_hitTargets, false);
      if (hits.length) {
        const bone = hits[0].object.userData._bone;
        if (bone && typeof selectObject === 'function') {
          selectObject(bone);
          _swallowClick = true;
          e.stopPropagation(); e.preventDefault();
        }
      }
    };
    const swallow = e => { if (_swallowClick) { _swallowClick = false; e.stopPropagation(); e.preventDefault(); } };
    cv.addEventListener('pointerdown', down, true);
    cv.addEventListener('mousedown', down, true);
    cv.addEventListener('click', swallow, true);
  }

  // ── Toolbar'даги tugmalar ──
  function _ensureToolbarBtn() {
    const bar = document.getElementById('topbar');
    if (!bar) { setTimeout(_ensureToolbarBtn, 500); return; }
    if (!document.getElementById('bone-hide-btn')) {
      const b = document.createElement('button');
      b.id = 'bone-hide-btn'; b.className = 'menu-btn';
      b.innerHTML = '🦴'; b.title = 'Suyaklarni berkitish/ko\'rsatish';
      b.onclick = toggleHidden;
      bar.appendChild(b);
    }
    // 🎯 — F rejimida (edit mode) gizmo + suyaklarni ko'rsatish/yashirish
    if (!document.getElementById('edit-helpers-btn')) {
      const g = document.createElement('button');
      g.id = 'edit-helpers-btn'; g.className = 'menu-btn';
      g.innerHTML = '🎯'; g.title = 'F rejimida gizmoni ko\'rsatish/yashirish';
      g.style.opacity = window.editHelpers ? '1' : '0.45';   // default: yashirin
      g.onclick = () => { window.editHelpers = !window.editHelpers; g.style.opacity = window.editHelpers ? '1' : '0.45'; _lastHide = null; };
      bar.appendChild(g);
    }
  }

  // ── Bone daraxti HTMLи (INSPEKTOR ичida) ──
  function _treeHTML(group, bones) {
    const roots = bones.filter(b => !(b.parent && b.parent.isBone));
    const out = [];
    out.push(`<div id="bone-insp-section" style="margin-top:10px;border:1px solid #2f3947;border-radius:8px;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 9px;background:linear-gradient(90deg,rgba(51,221,255,.15),rgba(51,221,255,.03));font-weight:700;font-size:11px;letter-spacing:.4px">
        <span>🦴 SUYAKLAR (${bones.length})</span>
        <span id="bn-eye" title="Skeletonni ko'rsat/yashir" style="cursor:pointer">👁</span>
      </div>`);
    if (group.userData && group.userData._mixer)
      out.push(`<div id="bn-stopmix" style="margin:7px 9px;padding:6px;text-align:center;background:#3a2f2f;border:1px solid #5a3a3a;border-radius:6px;cursor:pointer;font-size:11px">⏸ Baked animatsiyani to'xtatish</div>`);
    out.push(`<div style="max-height:34vh;overflow:auto;padding:6px 4px 8px">`);
    const walk = (b, depth) => {
      const kids = b.children.filter(c => c.isBone);
      const kid = 'bnk_' + b.userData.id;
      out.push(`<div class="bn-row" data-id="${b.userData.id}" style="padding:3px 4px;padding-left:${6 + depth*13}px;border-radius:5px;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:12px">
        ${kids.length ? `<span class="bn-tog" data-t="${kid}" style="width:12px;text-align:center;color:#7bd">▾</span>` : '<span style="width:12px"></span>'}
        <span style="overflow:hidden;text-overflow:ellipsis">🦴 ${b.name || 'bone'}</span></div>`);
      if (kids.length) { out.push(`<div id="${kid}">`); kids.forEach(k => walk(k, depth + 1)); out.push('</div>'); }
    };
    roots.forEach(r => walk(r, 0));
    out.push(`</div></div>`);
    return out.join('');
  }

  function _injectInspectorBones() {
    const insp = document.getElementById('inspector-content');
    if (!insp || insp.querySelector('#bone-insp-section')) return;
    const sel = (typeof selectedObj !== 'undefined') ? selectedObj : window.selectedObj;
    const model = _modelOf(sel);
    if (!model) return;
    const bones = _collectBones(model);
    if (!bones.length) return;
    const wrap = document.createElement('div'); wrap.innerHTML = _treeHTML(model, bones); insp.appendChild(wrap);
    const selId = sel && sel.isBone ? sel.userData.id : null;
    insp.querySelectorAll('.bn-row').forEach(el => {
      if (selId != null && +el.dataset.id === selId) el.style.background = '#2a4a63';
      el.onmouseenter = () => { if (+el.dataset.id !== selId) el.style.background = 'rgba(255,255,255,.05)'; };
      el.onmouseleave = () => { if (+el.dataset.id !== selId) el.style.background = 'none'; };
      el.onclick = e => { if (e.target.classList.contains('bn-tog')) return; const b = _boneMap[+el.dataset.id]; if (b && typeof selectObject === 'function') selectObject(b); };
    });
    insp.querySelectorAll('.bn-tog').forEach(t => {
      t.onclick = e => { e.stopPropagation(); const k = document.getElementById(t.dataset.t); if (k) { const hid = k.style.display === 'none'; k.style.display = hid ? '' : 'none'; t.textContent = hid ? '▾' : '▸'; } };
    });
    const eye = insp.querySelector('#bn-eye');
    if (eye) eye.onclick = () => { const h = model.userData._skelHelper; if (h) { h.visible = !h.visible; eye.style.opacity = h.visible ? '1' : '0.4'; } };
    const sm = insp.querySelector('#bn-stopmix');
    if (sm) sm.onclick = () => { const mx = model.userData._mixer; if (mx) mx.stopAllAction(); _log('⏸ Baked animatsiya to\'xtatildi', 'lok'); sm.style.display = 'none'; };
  }

  function _hookInspector() {
    if (_inspHooked) return;
    const insp = document.getElementById('inspector-content');
    if (!insp) { setTimeout(_hookInspector, 500); return; }
    _inspHooked = true;
    new MutationObserver(() => { if (!insp.querySelector('#bone-insp-section')) _injectInspectorBones(); }).observe(insp, { childList: true });
    _injectInspectorBones();
  }

  /**
   * Ko'rinishni MAJBURAN qayta hisoblash.
   * ⚠ `_applyVisibility()` faqat holat O'ZGARGANDA ishlaydi (`_lastHide`
   *   keshi) va u RAF siklida yuradi. Play/Stop bosilganda keshni
   *   bekor qilib, darhol qo'llaymiz — bir kadr ham kechikmasin va
   *   sikl umuman ishga tushmagan bo'lsa ham to'g'ri holat bo'lsin.
   */
  function refresh() { _lastHide = null; _applyVisibility(); }

  window.BoneRig = { autoExpose, exposeSelected, collect: _collectBones, toggleHidden, refresh };
  window.exposeSelected = exposeSelected;

  // ── CHAP IERARXIYADA suyaklarni NESTED daraxt qilib ko'rsatish ──
  //    (hierarchy.js ni o'zgartirmasdan — bone-system o'zi quradi)
  let _hierHooked = false, _obs = null, _bhBusy = false;
  const _bhCollapsed = new Set();   // yig'ilgan id lar
  const _bhSeen = new Set();        // birinchi marta ko'rilган modellar
  const _bhName = b => String(b.userData.name).split(' / ').pop();

  function _buildHierBones() {
    const list = document.getElementById('hier-list');
    if (!list || _bhBusy) return;
    _bhBusy = true;
    if (_obs) _obs.disconnect();
    try {
      list.querySelectorAll('.bh-row').forEach(r => r.remove());   // eski inject qatorlar
      for (const model of _rigs) {
        const id = model.userData && model.userData.id;
        if (id == null) continue;
        const modelRow = list.querySelector(`.h-item[data-obj-id="${id}"]`);
        if (!modelRow) continue;

        // birinchi marta — default YIG'ILGAN (toza tursin)
        if (!_bhSeen.has(id)) { _bhSeen.add(id); _bhCollapsed.add(id); }

        // flat suyak qatorlarini yashiramiz
        for (const bid in _boneMap) {
          const fr = list.querySelector(`.h-item[data-obj-id="${bid}"]:not(.bh-row)`);
          if (fr) fr.style.display = 'none';
        }

        // model qatoriga collapse o'q
        const arrow = modelRow.querySelector('.h-arrow');
        const mCol = _bhCollapsed.has(id);
        if (arrow) {
          arrow.textContent = mCol ? '▸' : '▾';
          arrow.style.cursor = 'pointer';
          arrow.onclick = e => { e.stopPropagation(); mCol ? _bhCollapsed.delete(id) : _bhCollapsed.add(id); _buildHierBones(); };
        }
        if (mCol) continue;   // yig'ilgan — suyaklar chizilmaydi

        // nested qatorlarni tuzamiz
        const roots = _collectBones(model).filter(b => !(b.parent && b.parent.isBone));
        const flat = [];
        const walk = (b, depth) => {
          const kids = b.children.filter(c => c.isBone && c.userData && c.userData.id);
          const col = _bhCollapsed.has(b.userData.id);
          flat.push({ b, depth, hasKids: kids.length > 0, col });
          if (!col) kids.forEach(k => walk(k, depth + 1));
        };
        roots.forEach(r => walk(r, 1));

        let anchor = modelRow;
        for (const { b, depth, hasKids, col } of flat) {
          const div = document.createElement('div');
          div.className = 'h-item bh-row' + (selectedObj === b ? ' sel' : '');
          div.dataset.objId = b.userData.id;
          div.style.paddingLeft = (6 + depth * 14) + 'px';
          div.style.display = 'flex'; div.style.alignItems = 'center';
          div.innerHTML =
            `<span class="h-arrow" style="cursor:${hasKids ? 'pointer' : 'default'}">${hasKids ? (col ? '▸' : '▾') : ''}</span>` +
            `<span class="ico">🦴</span><span class="h-name">${_bhName(b)}</span>`;
          if (hasKids) {
            div.querySelector('.h-arrow').onclick = e => {
              e.stopPropagation();
              _bhCollapsed.has(b.userData.id) ? _bhCollapsed.delete(b.userData.id) : _bhCollapsed.add(b.userData.id);
              _buildHierBones();
            };
          }
          div.onclick = () => { if (typeof selectObject === 'function') selectObject(b); };
          anchor.after(div);
          anchor = div;
        }
      }
    } catch (e) {}
    if (_obs) _obs.observe(list, { childList: true });
    _bhBusy = false;
  }

  function _hookHierarchy() {
    if (_hierHooked) return;
    const list = document.getElementById('hier-list');
    if (!list) { setTimeout(_hookHierarchy, 500); return; }
    _hierHooked = true;
    _obs = new MutationObserver(() => _buildHierBones());
    _obs.observe(list, { childList: true });
    _buildHierBones();
  }

  function _watch() {
    try {
      if (typeof objects !== 'undefined') {
        for (const o of objects) {
          if (!o || o.isBone) continue;
          const ud = o.userData;
          if (!ud || ud._boneExposed) continue;
          if (ud.isGLB || o.type === 'Group') { if (_collectBones(o).length) autoExpose(o); }
        }
      }
    } catch (e) {}
    setTimeout(_watch, 1000);
  }
  setTimeout(_watch, 1200);
  _hookInspector(); _ensureToolbarBtn();
  console.log('[BoneRig] tayyor — suyagi bor GLB importни kutmoqda');
})();
