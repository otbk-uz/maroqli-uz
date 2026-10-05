// ============================================================
// HIERARCHY
// ============================================================
const hierCollapsed = new Set(); // collapsed object ids
let hierCtxTarget = null; // object targeted by right-click
let hierDragSrc   = null; // object being dragged

function updateHierarchy() {
  const list = $('hier-list');
  list.innerHTML = '';

  // Scene root row
  const sceneRow = document.createElement('div');
  sceneRow.className = 'h-scene';
  sceneRow.innerHTML = '<span>🌐</span><span>Sahna</span>';

  // ── 🔀 "Sahna" qatori — kartadan CHIQARISH nishoni ──
  //   Karta obyektini tepaga, shu qatorga tortsangiz — u kartadan
  //   chiqadi va oddiy sahna obyektiga aylanadi (ZIP'ga saqlanmaydi).
  sceneRow.ondragover = e => {
    if (!hierDragSrc || !hierDragSrc.userData._mlPrevObj) return;   // faqat karta obyektlari
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    sceneRow.style.background = 'rgba(var(--accent-rgb),.25)';
  };
  sceneRow.ondragleave = () => { sceneRow.style.background = ''; };
  sceneRow.ondrop = e => {
    e.preventDefault();
    sceneRow.style.background = '';
    if (!hierDragSrc || !window.MapLoaderSystem) return;
    MapLoaderSystem.removeFromMap(hierDragSrc);
    hierDragSrc = null;
  };
  list.appendChild(sceneRow);

  // Build item for one object
  function renderObj(o, depth) {
    // 🦴 Suyaklar ichma-ich (papka kabi): suyak → bola suyaklar; riglangan model → ildiz suyaklar
    let visChildren;
    if (o.userData.isBone) {
      visChildren = o.children ? o.children.filter(c => c.isBone && c.userData && c.userData.id) : [];
    } else if (o.userData.isGLB && o.userData._boneExposed) {
      visChildren = [];
      o.traverse(c => { if (c.isBone && c.userData && c.userData.id && !(c.parent && c.parent.isBone)) visChildren.push(c); });
    } else {
      visChildren = o.children ? o.children.filter(c => (c.isMesh||c.isGroup) && c.userData && c.userData.id && !c.userData._pathGizmo && !c.userData._pathShapeHide) : [];
    }
    const hasChildren = visChildren.length > 0;
    const isCollapsed = hierCollapsed.has(o.userData.id);
    const isSel = selectedObj === o;

    const ico = o.userData.isBone ? '🦴'
               : o.userData.isCamera ? '🎥'
               : o.userData.isHitbox ? '📦'
               : o.userData.isInteractiveBtn ? '🔘'
               : o.userData.isTextBlock ? '📝'
               : o.userData.isPath ? '🛤'
               : o.userData.isPCBlock ? '💻'
               : o.userData.isPCCam ? '📷'
               : o.userData.type==='Tekislik' ? '⬜'
               : o.userData._isFolder ? '📁'
               : o.userData.isStatic ? '🔒'
               : o.userData.physMode==='jelly' ? '🟢'
               : o.userData.physMode==='liquid' ? '🔵'
               : o.userData.physMode==='breakable' ? '💥'
               : o.userData.physMode==='cloth' ? '🟣'
               : hasChildren ? '📦' : '▪';

    const item = document.createElement('div');
    const isMulti = multiSelected.has(o);
    item.className = 'h-item' + (isSel ? ' sel' : '') + (isMulti ? ' multi-sel' : '');
    item.style.paddingLeft = (6 + depth * 14) + 'px';
    item.dataset.objId = o.userData.id;

    const camActive = o.userData.isCamera && o.userData._isActive ? ' style="color:var(--accent4)"' : '';
    const activeLabel = o.userData._isActive ? ' <span style="color:var(--accent);font-size:8px">●</span>' : '';

    item.innerHTML = `
      <span class="h-arrow ${hasChildren ? (isCollapsed?'closed':'open') : ''}">${hasChildren ? '▾' : ''}</span>
      <span class="ico">${ico}</span>
      <span class="h-name"${camActive}>${escapeHtml(o.userData.isBone ? String(o.userData.name).split(' / ').pop() : o.userData.name)}${activeLabel}</span>
      <span class="h-actions">
        <button class="h-action-btn vis-btn" title="${o.visible?'Yashirish':'Ko\'rsatish'}">${o.visible?'👁':'🙈'}</button>
        <button class="h-action-btn del" title="O'chirish">✕</button>
      </span>`;

    // Arrow click — toggle collapse
    if (hasChildren) {
      item.querySelector('.h-arrow').onclick = e => {
        e.stopPropagation();
        if (hierCollapsed.has(o.userData.id)) hierCollapsed.delete(o.userData.id);
        else hierCollapsed.add(o.userData.id);
        updateHierarchy();
      };
    }

    // Click → select
    item.onclick = e => {
      if (e.target.classList.contains('vis-btn')) {
        e.stopPropagation();
        o.visible = !o.visible;
        updateHierarchy();
        return;
      }
      if (e.target.classList.contains('del')) {
        e.stopPropagation();
        selectObject(o);
        window.deleteSel?.();
        return;
      }
      if (e.shiftKey) {
        // SHIFT+CLICK — multi-select
        // Agar birinchi selectedObj hali multiSelected da yo'q bo'lsa — qo'sh
        if (selectedObj && selectedObj !== o && !multiSelected.has(selectedObj)) {
          multiSelected.add(selectedObj);
          addMultiOutline(selectedObj);
        }
        // Bosilgan objectni toggle
        addToMultiSelect(o);
        // outlineMeshni olib tashlash (multi outline o'z ichida boshqaradi)
        if (outlineMesh) { scene.remove(outlineMesh); outlineMesh = null; }
        selectedObj = o;
        updateHierarchy();
        updateMultiSelectBar();
      } else {
        clearMultiSelect(); selectObject(o);
      }
    };

    // Right-click → context menu
    item.oncontextmenu = e => {
      e.preventDefault(); e.stopPropagation();
      hierCtxTarget = o;
      selectObject(o);
      showHierCtx(e.clientX, e.clientY);
    };

    // Drag-drop — parent değiştirish
    item.draggable = true;
    item.ondragstart = e => {
      hierDragSrc = o;
      item.classList.add('drag-src');
      e.dataTransfer.effectAllowed = 'move';
    };
    item.ondragend = () => {
      hierDragSrc = null;
      list.querySelectorAll('.drag-src,.drag-over').forEach(el=>{el.classList.remove('drag-src','drag-over');});
    };
    item.ondragover = e => {
      if (!hierDragSrc || hierDragSrc === o) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      list.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    };
    item.ondragleave = () => item.classList.remove('drag-over');
    item.ondrop = e => {
      e.preventDefault();
      if (!hierDragSrc || hierDragSrc === o) return;
      item.classList.remove('drag-over');
      hierReparent(hierDragSrc, o);
    };

    list.appendChild(item);

    // Render children if not collapsed
    if (hasChildren && !isCollapsed) {
      visChildren.forEach(child => renderObj(child, depth + 1));
    }
  }

  // Top-level objects — original sahna, so'ng (agar karta yuklangan bo'lsa)
  // ajratuvchi chiziq va yuklangan karta elementlari.
  const _topLevel = objects.filter(o => o.userData && !o.userData.parentId && !o.userData._pathShapeHide && !o.userData.isBone);
  const _mapObjs  = _topLevel.filter(o => o.userData._mlLoaded || o.userData._mlKept || o.userData._mlPrevObj);
  const _origObjs = _topLevel.filter(o => !(o.userData._mlLoaded || o.userData._mlKept || o.userData._mlPrevObj));

  _origObjs.forEach(o => renderObj(o, 0));

  if (_mapObjs.length) {
    const sep = document.createElement('div');
    sep.className = 'h-map-sep';
    sep.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 8px;margin:4px 0;' +
      'font-size:9px;color:var(--accent3);letter-spacing:1px;font-family:\'Share Tech Mono\',monospace;' +
      'border-top:1px dashed rgba(var(--accent3-rgb),.55);border-bottom:1px dashed rgba(var(--accent3-rgb),.55);' +
      'background:rgba(var(--accent3-rgb),.06)';
    // Sarlavha — karta nomi bilan: "(nomi)-map". Preview bo'lsa boshqa rang.
    const _prev = _mapObjs.some(o => o.userData._mlPrevObj);
    const _ml   = objects.find(o => o.userData && o.userData.isMapLoader &&
                    (_prev ? o.userData._mlPreview : true) && o.userData.mapName);
    const _nm   = (_ml && _ml.userData.mapName ? _ml.userData.mapName.replace(/\.zip$/i, '') : 'karta') + '-map';
    if (_prev) {
      sep.style.color = 'var(--accent2)';
      sep.style.borderTopColor = sep.style.borderBottomColor = 'rgba(var(--accent2-rgb),.55)';
      sep.style.background = 'rgba(var(--accent2-rgb),.06)';
    }
    sep.innerHTML = '<span>' + (_prev ? '👁' : '🗺') + '</span><span>' + escapeHtml(_nm) + '</span>' +
      '<span style="flex:1"></span>' +
      (_prev ? '<span style="opacity:.55;font-size:8px">⬇ tashlang</span>' : '') +
      '<span style="opacity:.6;margin-left:6px">' + _mapObjs.length + '</span>';

    // ── 🔀 Ajratgich — DROP NISHONI ──
    //   Preview ochiq bo'lsa: sahnadagi obyektni shu chiziq ustiga
    //   tashlab kartaga qo'shasiz. Obyekt pastda, karta bo'limida paydo
    //   bo'ladi va yopganда ZIP'ga saqlanadi.
    if (_prev) {
      sep.ondragover = e => {
        if (!hierDragSrc || hierDragSrc.userData._mlPrevObj) return;   // allaqachon kartada
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        sep.style.background = 'rgba(var(--accent2-rgb),.28)';
        sep.style.borderTopColor = sep.style.borderBottomColor = 'var(--accent2)';
      };
      sep.ondragleave = () => {
        sep.style.background = 'rgba(var(--accent2-rgb),.06)';
        sep.style.borderTopColor = sep.style.borderBottomColor = 'rgba(var(--accent2-rgb),.55)';
      };
      sep.ondrop = e => {
        e.preventDefault();
        sep.style.background = 'rgba(var(--accent2-rgb),.06)';
        if (!hierDragSrc || !window.MapLoaderSystem) return;
        MapLoaderSystem.addToMap(hierDragSrc);
        hierDragSrc = null;
      };
    }
    list.appendChild(sep);
    _mapObjs.forEach(o => renderObj(o, 0));
  }

  // Lights
  lights.forEach(l => {
    const icon = l.type==='sun'?'☀️': l.type==='headlight'?'🔦':'💡';
    const item = document.createElement('div');
    item.className = 'h-item' + (selectedLight===l?' sel':'');
    item.style.paddingLeft = '6px';
    item.innerHTML = `<span class="h-arrow"></span><span class="ico">${icon}</span><span class="h-name">${escapeHtml(l.name)}${l.parent?` <span style="font-size:8px;color:var(--muted)">→${escapeHtml(l.parent.userData?.name||'')}</span>`:''}</span>`;
    item.onclick = () => selectLight(l);
    item.oncontextmenu = e => { e.preventDefault(); hierCtxTarget = null; showHierCtx(e.clientX, e.clientY); };
    list.appendChild(item);
  });

  // Particles
  particleSystems.forEach(ps => {
    const item = document.createElement('div');
    item.className = 'h-item' + (selectedObj===ps.mesh?' sel':'');
    item.style.paddingLeft = '6px';
    item.innerHTML = `<span class="h-arrow"></span><span class="ico">✨</span><span class="h-name">${ps.name}</span>`;
    item.onclick = () => selectObject(ps.mesh);
    list.appendChild(item);
  });

  // Empty area right-click
  list.oncontextmenu = e => {
    if (e.target === list || e.target.classList.contains('h-scene')) {
      e.preventDefault();
      hierCtxTarget = null;
      showHierCtx(e.clientX, e.clientY);
    }
  };
}

// ── Reparent — drag-drop orqali parent o'zgartirish ──────────
// ⚠ Karta chegarasi: sahna obyektini karta obyektiga (yoki aksincha)
//   parent qilib bo'lmaydi — aks holda bola bir fazoda, ota boshqasida
//   qolib, _writeBack koordinatalarni buzib yuborardi. Kartaga qo'shish
//   uchun ajratgich chiziq ustiga tashlang.
function hierReparent(child, newParent) {
  const a = !!(child.userData && child.userData._mlPrevObj);
  const b = !!(newParent.userData && newParent.userData._mlPrevObj);
  if (a !== b) {
    log(a ? '⚠ Karta obyektini sahnaga parent qilib bo\'lmaydi — avval "Sahna" qatoriga tortib chiqaring'
          : '⚠ Sahna obyektini kartaga parent qilib bo\'lmaydi — ajratgich chiziq ustiga tashlang', 'lw');
    return;
  }
  return _hierReparent(child, newParent);
}
function _hierReparent(child, newParent) {
  // Circular check
  let p = newParent;
  while (p) {
    if (p === child) { log('⚠ Circular parent!', 'lw'); return; }
    p = p.parent && p.parent.userData && p.parent.userData.id ? p.parent : null;
  }

  // attach() — THREE.js world transform ni to'liq saqlaydi (pozitsiya, rotatsiya, scale BUZILINMAYDI)
  newParent.attach(child);
  child.userData.parentId = newParent.userData.id;

  // ⚠ TUZATILDI: child objects[] da QOLADI.
  // Eski izoh "aks holda ikki marta render bo'ladi" — noto'g'ri edi:
  // updateHierarchy() allaqachon `objects.filter(o => !o.userData.parentId)`
  // bilan faqat top-level ni oladi, shuning uchun dublikat chiqmaydi.
  // Splice qilish esa hitbox/tugma/kamera bog'lanishlarini uzib qo'yardi.

  if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
  log(`📦 "${child.userData.name}" → "${newParent.userData.name}" ichiga qo'shildi`, 'lok');
  updateHierarchy();
  // ⚠ Ilgari parent almashtirish tarixga TUSHMASDI. `attach()` world
  //   transformni saqlab lokal transformni qayta hisoblaydi, ya'ni
  //   amal qaytarilmasa obyekt papka ichida noto'g'ri joyda qolardi.
  if (typeof captureState === 'function') captureState(`Parent: ${child.userData.name}`);
}

// ── Context menu ──────────────────────────────────────────────
function showHierCtx(x, y) {
  const ctx = $('hier-ctx');
  ctx.style.display = 'block';
  const mw = ctx.offsetWidth || 190, mh = ctx.offsetHeight || 200;
  ctx.style.left = Math.min(x, window.innerWidth - mw - 8) + 'px';
  ctx.style.top  = Math.min(y, window.innerHeight - mh - 8) + 'px';
}
document.addEventListener('click', () => { const c=$('hier-ctx'); if(c) c.style.display='none'; });
document.addEventListener('keydown', e => {
  if(e.key==='Escape'){
    const c=$('hier-ctx'); if(c) c.style.display='none';
    const s=$('hier-search'); if(s&&s.value){ s.value=''; hierFilter(''); }
    closeHamMenu();
  }
});

// Hamburger menu
function toggleHamMenu(){
  const btn=document.getElementById('ham-btn');
  const menu=document.getElementById('ham-menu');
  if(!btn||!menu) return;
  const isOpen=menu.classList.contains('open');
  if(isOpen){ closeHamMenu(); } else { btn.classList.add('open'); menu.classList.add('open'); }
}
function closeHamMenu(){
  const btn=document.getElementById('ham-btn');
  const menu=document.getElementById('ham-menu');
  if(btn) btn.classList.remove('open');
  if(menu) menu.classList.remove('open');
}
document.addEventListener('click', e => {
  const wrap=document.getElementById('ham-wrap');
  if(wrap && !wrap.contains(e.target)) closeHamMenu();
});

// Ierarxiya filtrlash (qidiruv)
let _hierFilterVal = '';
window.hierFilter = function(val) {
  _hierFilterVal = (val||'').trim().toLowerCase();
  const items = document.querySelectorAll('#hier-list .h-item');
  items.forEach(item => {
    const nameEl = item.querySelector('.h-name');
    const name = nameEl ? nameEl.textContent.toLowerCase() : '';
    if (!_hierFilterVal || name.includes(_hierFilterVal)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
  // Agar hech narsa topilmasa — xabar
  const visible = [...items].filter(i=>i.style.display!=='none').length;
  let noRes = document.getElementById('hier-no-results');
  if (!_hierFilterVal || visible > 0) { if(noRes) noRes.remove(); }
  else {
    if (!noRes) {
      noRes = document.createElement('div');
      noRes.id = 'hier-no-results';
      noRes.style.cssText='text-align:center;color:var(--muted);font-size:9px;padding:12px 6px';
      noRes.textContent = '🔍 Topilmadi';
      document.getElementById('hier-list')?.appendChild(noRes);
    }
  }
};

window.hierCtxAction = function(action) {
  const c = $('hier-ctx'); if(c) c.style.display='none';
  const o = hierCtxTarget || selectedObj;
  switch(action) {
    case 'folder': {
      const grp = new THREE.Group();
      grp.position.set(0, 0, 0);
      // ⚠ `isGroup` — `_` SIZ. `_slCleanUD` `_` bilan boshlanadigan
      //   kalitlarni tashlaydi, ya'ni `_isFolder` saqlashda YO'QOLARDI.
      //   Natijada yuklashda papka `PRIMITIVES` da topilmay KUB bo'lardi
      //   va unga fizika tanasi berilardi — papka "fizik blok"ka aylanardi.
      //   `scene-objects.js` dagi `multiGroup()` da `isGroup` allaqachon bor edi.
      grp.userData = { id: ++objIdC, name: 'Papka', type: 'Group',
                       isGroup: true, _isFolder: true,
                       // 👻 papka — idish, o'yinchi undan o'tib ketadi
                       colliderMode: 'inline' };
      scene.add(grp);
      objects.push(grp);

      // Agar multi-select yoki bitta object tanlangan bo'lsa — papkaga qo'sh
      const toAdd = multiSelected.size > 0 ? [...multiSelected] : (selectedObj && !selectedObj.userData._isFolder ? [selectedObj] : []);
      toAdd.forEach(obj => {
        grp.attach(obj); // world transform SAQLANADI
        obj.userData.parentId = grp.userData.id;
        // ⚠ TUZATILDI: objects[] dan olib tashlanmaydi (global reyestr saqlanadi)
      });
      if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();

      clearMultiSelect();
      selectObject(grp);
      updateHierarchy(); updateStats();
      if (typeof captureState === 'function') captureState(`Papka: ${grp.userData.name}`);
      log(`📁 "${grp.userData.name}" papkasi yaratildi${toAdd.length ? ` (${toAdd.length} object)` : ''}`, 'lok');
      break;
    }
    case 'duplicate': if(selectedObj) { window.duplicateSelected?.() || (() => {
      const clone = selectedObj.clone();
      clone.userData = {...selectedObj.userData, id:++objIdC, name:getCloneName(selectedObj.userData.name)};
      clone.position.x += 0.5;
      scene.add(clone); objects.push(clone);
      selectObject(clone); updateHierarchy(); updateStats();
      if (typeof captureState === 'function') captureState(`Nusxalandi: ${clone.userData.name}`);
      log(`Nusxalandi: ${clone.userData.name}`, 'lok');
    })(); } break;
    case 'delete': {
      const delTarget = hierCtxTarget || selectedObj;
      if (delTarget) {
        // hierCtxTarget ni tanlab, so'ng o'chirish
        if (selectedObj !== delTarget) selectObject(delTarget);
        window.deleteSel?.();
      }
      break;
    }
    case 'select-all': objects.forEach(obj => obj); clearMultiSelect(); objects.forEach(obj => multiSelected.add(obj)); updateHierarchy(); break;
    case 'expand': if(o) { hierCollapsed.delete(o.userData.id); updateHierarchy(); } break;
    case 'collapse': if(o) { hierCollapsed.add(o.userData.id); updateHierarchy(); } break;
    case 'expand-all': hierCollapsed.clear(); updateHierarchy(); break;
    case 'collapse-all': objects.forEach(obj => { if(obj.children?.some(c=>c.userData?.id)) hierCollapsed.add(obj.userData.id); }); updateHierarchy(); break;
    case 'select-kf': if(o) { log(`◆ ${o.userData.name} keyframe'lari tanlandi`, 'lok'); } break;
  }
};

window.applyLightPos = function() {
  if (!selectedLight || !selectedLight.light.position) return;
  selectedLight.light.position.set(
    parseFloat($('lpx')?.value)||0,
    parseFloat($('lpy')?.value)||0,
    parseFloat($('lpz')?.value)||0
  );
  if (selectedLight.helper) selectedLight.helper.update?.();
};

function selectLight(l) {
  if (outlineMesh) { scene.remove(outlineMesh); outlineMesh=null; }
  selectedObj = null;
  // ⚠ `window.selectedObj` ni ham tozalash SHART. selectObject() uni
  //   sinxronlaydi, bu yer esa yo'q edi — natijada yorug'lik tanlanganда
  //   `window.selectedObj` ESKI obyektда qotib qolardi va unga tayangan
  //   kod (Timeline, keybindings) noto'g'ri nishonga ishlardi.
  window.selectedObj = null;
  if (typeof AppState !== 'undefined') AppState.selectedObj = null;
  selectedLight = l;
  updateGizmo();
  const ic = $('inspector-content');
  const col = '#'+l.light.color.getHexString();
  const lp = l.light.position || new THREE.Vector3(0,5,0);

  const isSun = l.type==='sun';
  const isHL  = l.type==='headlight';
  const hasRot = isSun || isHL;

  const typeLabel = isSun ? '☀️ SUN' : isHL ? '🔦 HEADLIGHT' : l.type.toUpperCase();
  const typeColor = isSun ? 'var(--accent2)' : isHL ? 'var(--accent)' : 'var(--accent4)';

  ic.innerHTML=`
    <div class="comp-block">
      <div class="comp-title"><span class="tag tag3">${typeLabel}</span>${l.name}</div>
      ${isSun?`<div style="font-size:9px;color:#ffdd44;font-family:'Share Tech Mono',monospace;margin-top:4px;padding:3px 6px;background:rgba(255,221,68,.07);border-radius:2px">☀ Quyosh nuri — rotatsiya bilan yo'nalish boshqarish</div>`:''}
      ${isHL?`<div style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-top:4px;padding:3px 6px;background:rgba(var(--accent-rgb),.07);border-radius:2px">🔦 Mashina farasi / fonar — tor konusli spotlight</div>`:''}
    </div>

    ${hasRot?`
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(255,107,53,.1);color:var(--accent2)">ROTATSIYA</span>Nur yo'nalishi</div>
      <div class="fr">
        <span class="fl" style="color:#ff9955">↑↓ Baland</span>
        <input type="range" min="-89" max="89" step="1" value="${(l.rotX||0).toFixed(0)}" style="flex:1;accent-color:var(--accent2)"
          oninput="selectedLight.rotX=parseFloat(this.value);$('sl-rx-v').textContent=this.value+'°';applyLightRotation(selectedLight)">
        <span id="sl-rx-v" style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:32px">${(l.rotX||0).toFixed(0)}°</span>
      </div>
      <div class="fr">
        <span class="fl" style="color:#55aaff">⟳ Gorizontal</span>
        <input type="range" min="-180" max="180" step="1" value="${(l.rotY||0).toFixed(0)}" style="flex:1;accent-color:var(--accent)"
          oninput="selectedLight.rotY=parseFloat(this.value);$('sl-ry-v').textContent=this.value+'°';applyLightRotation(selectedLight)">
        <span id="sl-ry-v" style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:32px">${(l.rotY||0).toFixed(0)}°</span>
      </div>
      ${isSun?`
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px">
        <button onclick="selectedLight.rotX=45;selectedLight.rotY=30;applyLightRotation(selectedLight);selectLight(selectedLight)" style="flex:1;min-width:50px;background:rgba(255,221,68,.08);border:1px solid rgba(255,221,68,.2);color:#ffdd44;font-size:9px;padding:3px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">Tong 🌅</button>
        <button onclick="selectedLight.rotX=80;selectedLight.rotY=0;applyLightRotation(selectedLight);selectLight(selectedLight)" style="flex:1;min-width:50px;background:rgba(255,221,68,.08);border:1px solid rgba(255,221,68,.2);color:#ffdd44;font-size:9px;padding:3px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">Tush ☀️</button>
        <button onclick="selectedLight.rotX=15;selectedLight.rotY=-60;applyLightRotation(selectedLight);selectLight(selectedLight)" style="flex:1;min-width:50px;background:rgba(255,221,68,.08);border:1px solid rgba(255,221,68,.2);color:#ffdd44;font-size:9px;padding:3px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">Kech 🌇</button>
      </div>`:''}
      ${isHL?`
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px">
        <button onclick="selectedLight.rotX=0;selectedLight.rotY=0;applyLightRotation(selectedLight);selectLight(selectedLight)" style="flex:1;background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.2);color:var(--accent);font-size:9px;padding:3px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">↑ To'g'ri</button>
        <button onclick="selectedLight.rotX=-15;selectedLight.rotY=0;applyLightRotation(selectedLight);selectLight(selectedLight)" style="flex:1;background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.2);color:var(--accent);font-size:9px;padding:3px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">↗ Pastga</button>
      </div>`:''}
    </div>
    `:''}

    <div class="comp-block">
      <div class="comp-title"><span class="tag">POZITSIYA</span>Joylashuv</div>
      <div class="xyzr">
        <div><input class="xi" id="lpx" value="${lp.x.toFixed(2)}" oninput="applyLightPos()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="lpy" value="${lp.y.toFixed(2)}" oninput="applyLightPos()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="lpz" value="${lp.z.toFixed(2)}" oninput="applyLightPos()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
    </div>
    <div class="comp-block">
      <div class="comp-title"><span class="tag">PARAM</span>Parametrlar</div>
      <div class="fr"><span class="fl">Rang</span><input type="color" style="width:24px;height:20px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none" value="${col}" oninput="selectedLight&&(selectedLight.light.color.set(this.value));${isSun?'if(selectedLight.marker)selectedLight.marker.material.color.set(this.value);':''}" ></div>
      <div class="fr"><span class="fl">Kuch</span><input type="range" min="0" max="${isSun?30:isHL?20:20}" step="0.1" value="${l.light.intensity}" style="flex:1;accent-color:${isSun?'#ffdd44':isHL?'var(--accent)':'var(--accent4)'}" oninput="selectedLight&&(selectedLight.light.intensity=parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(1)"><span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px">${l.light.intensity.toFixed(1)}</span></div>
      ${(l.type==='point'||isHL)?`<div class="fr"><span class="fl">Masofa</span><input type="range" min="1" max="100" step="1" value="${l.light.distance||20}" style="flex:1" oninput="selectedLight&&(selectedLight.light.distance=parseFloat(this.value))"></div>`:''}
      ${isHL?`<div class="fr"><span class="fl">Burchak</span><input type="range" min="1" max="45" step="1" value="${Math.round((l.light.angle||Math.PI/10)*180/Math.PI)}" style="flex:1;accent-color:var(--accent)" oninput="selectedLight&&(selectedLight.light.angle=parseFloat(this.value)*Math.PI/180);this.nextSibling.textContent=this.value+'°'"><span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px">${Math.round((l.light.angle||Math.PI/10)*180/Math.PI)}°</span></div>`:''}
      <div class="fr"><span class="fl">Soya</span><label class="tgl"><input type="checkbox" ${l.light.castShadow?'checked':''} onchange="selectedLight&&(selectedLight.light.castShadow=this.checked)"><div class="tgl-track"></div><div class="tgl-thumb"></div></label></div>
    </div>
    <div class="comp-block">
      <button class="action-btn del-btn" onclick="deleteLight(${l.id})">✕ Yorug'lik o'chir</button>
    </div>
  `;
}

window.deleteLight = function(id) {
  const idx = lights.findIndex(l=>l.id===id);
  if (idx<0) return;
  const l = lights[idx];
  if (l.parent) l.parent.remove(l.light);
  else scene.remove(l.light);
  if (l.helper) scene.remove(l.helper);
  if (l.marker) { if(l.parent) l.parent.remove(l.marker); else scene.remove(l.marker); }
  if (l.light.target) { if(l.parent) l.parent.remove(l.light.target); else scene.remove(l.light.target); }
  lights.splice(idx,1);
  selectedLight = null;
  updateHierarchy();
  $('inspector-content').innerHTML='';
  // ⚠ Chiroqlar `objects[]` da emas, alohida `lights[]` da — shu sababdan
  //   ular undo tizimidan BUTUNLAY tashqarida qolgan edi. Endi
  //   `undo.js` `lights[]` ni ham suratga oladi.
  if (typeof captureState === 'function') captureState(`Yorug'lik o'chirildi: ${l.name}`);
  log(`💡 ${l.name} o'chirildi`, 'lw');
};
