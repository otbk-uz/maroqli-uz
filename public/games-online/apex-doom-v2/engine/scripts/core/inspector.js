// ============================================================
// INSPECTOR (core) — updateInspector + material/transform/PBR
// Ajratilgan modullar:
//   scripts/ui/particle-inspector.js   — zarrachalar paneli
//   scripts/ui/model-orient-inspector.js — model orient paneli
//   scripts/ui/anim-inspector.js       — animatsiya paneli
// ============================================================
function updateInspector() {
  const ic = $('inspector-content');
  if (!selectedObj) { ic.innerHTML='<div style="padding:16px;font-size:11px;color:var(--muted);text-align:center">Tanlang</div>'; return; }
  // Camera object — alohida inspector
  if (selectedObj.userData && selectedObj.userData.isCamera) { buildCamObjInspector(selectedObj); return; }
  // Hitbox object — alohida inspector
  if (selectedObj.userData && selectedObj.userData.isSoundBlock &&
      typeof buildSoundBlockInspector === 'function') { buildSoundBlockInspector(selectedObj); return; }
  if (selectedObj.userData && selectedObj.userData.isMapLoader &&
      typeof buildMapLoaderInspector === 'function') { buildMapLoaderInspector(selectedObj); return; }
  if (selectedObj.userData && selectedObj.userData.isHitbox &&
      typeof buildHitboxInspector === 'function') { buildHitboxInspector(selectedObj); return; }
  // 💻 PC — alohida inspector
  
  if (selectedObj.userData && (selectedObj.userData.isPCBlock || selectedObj.userData.isPCCam) &&
      typeof buildPCBlockInspector === 'function') { buildPCBlockInspector(selectedObj); return; }
  // 🛤 Yo'l (Path) — alohida inspector
  if (selectedObj.userData && selectedObj.userData.isPath &&
      typeof buildPathInspector === 'function') { buildPathInspector(selectedObj); return; }
  // 📝 Matn bloki — alohida inspector
  if (selectedObj.userData && selectedObj.userData.isTextBlock &&
      typeof buildTextBlockInspector === 'function') { buildTextBlockInspector(selectedObj); return; }
  // 🧊 NoScript blok — alohida inspector
  if (selectedObj.userData && selectedObj.userData.isNoScript &&
      typeof buildNoScriptBlockHTML === 'function') {
    const _ic = document.getElementById('inspector-content');
    if (_ic) {
      _ic.innerHTML = buildNoScriptBlockHTML(selectedObj) +
        (window.buildMaterialInspectorHTML ? window.buildMaterialInspectorHTML(selectedObj) : '');
      return;
    }
  }
  // 🎛 AllKey zonasi — alohida inspector
  //  ⚠ Transform bo'limi HAM kerak: zona joylashuvi va o'lchami
  //    surilishi shart (timeline bilan animatsiya qilinadi ham).
  //    Shuning uchun `return` emas, `innerHTML` ga qo'shamiz.
  if (selectedObj.userData && selectedObj.userData.isAllKey &&
      typeof buildAllKeyHTML === 'function') {
    const _ak = document.getElementById('inspector-content');
    if (_ak) {
      //  ⚠ Joylashuv bo'limi `buildAllKeyHTML` NING O'ZIDA — 🔢
      //    MiniPad bilan bir xil naqsh. Umumiy `buildTransform…`
      //    yordamchisi bu loyihada YO'Q; uni chaqirsak jimgina bo'sh
      //    satr qaytib, zonani surish uchun maydonlar chiqmasdi.
      _ak.innerHTML = buildAllKeyHTML(selectedObj);
      return;
    }
  }
  // 🔢 MiniPad — alohida inspector
  if (selectedObj.userData && selectedObj.userData.isMiniPad &&
      typeof buildMiniPadInspector === 'function') { buildMiniPadInspector(selectedObj); return; }
  // Interactive Button — alohida inspector
  if (selectedObj.userData && selectedObj.userData.isInteractiveBtn &&
      typeof buildInteractiveBtnInspector === 'function') { buildInteractiveBtnInspector(selectedObj); return; }
  // Particle system — alohida inspector
  const ps = particleSystems.find(p => p.mesh === selectedObj);
  if (ps) { buildParticleInspector(ps); return; }
  const o = selectedObj;
  const p=o.position, r=o.rotation, s=o.scale;
  // material may be an array (per-face textures) — use the first slot's color
  const _matForCol = Array.isArray(o.material) ? o.material[0] : o.material;
  const col = (_matForCol && _matForCol.color) ? '#'+_matForCol.color.getHexString() : '#888888';
  const pb = physBodies.find(b=>b.mesh===o);

  ic.innerHTML=`
    <div class="comp-block">
      <div class="comp-title"><span class="tag">OBY</span>${o.userData.name}</div>
      <div class="fr"><span class="fl">Nom</span><input id="obj-name-inp" value="${o.userData.name}" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px;outline:none" oninput="window._renameObj(this.value)"></div>
      <div class="fr"><span class="fl">Tur</span><span style="font-size:10px;color:var(--accent);font-family:'Share Tech Mono',monospace">${o.userData.type||'Mesh'}</span></div>
      ${o.userData.texName?`<div class="fr"><span class="fl">Tekstura</span><span style="font-size:10px;color:var(--accent2);font-family:'Share Tech Mono',monospace">${o.userData.texName}</span></div>`:''}
    </div>
    ${(typeof _glbCarPartUI==='function')?_glbCarPartUI(o):''}

    <div class="comp-block">
      <div class="comp-title"><span class="tag">TRS</span>Transform</div>
      <div class="fl" style="margin-bottom:3px">Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" id="px" value="${p.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="py" value="${p.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="pz" value="${p.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff;">Z</div></div>
      </div>
      <div class="fl" style="margin:6px 0 3px">Aylanish (°)</div>
      <div class="xyzr">
        <div><input class="xi" id="rx" value="${(r.x*57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="ry" value="${(r.y*57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="rz" value="${(r.z*57.2958).toFixed(1)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
      <div class="fl" style="margin:6px 0 3px">O'lchov</div>
      <div class="xyzr">
        <div><input class="xi" id="sx" value="${s.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="sy" value="${s.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="sz" value="${s.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
    </div>

    ${window.buildMaterialInspectorHTML ? window.buildMaterialInspectorHTML(o) : ''}

    <!-- 🔢 NoScript — 🔘 tugma va 🎯 hitbox uchun ± amal -->
    ${window.buildNoScriptOpHTML ? window.buildNoScriptOpHTML(o) : ''}

    <!-- 🤖 AI AGENT — oddiy obyektni aqlli qiladi -->
    ${(!o.userData.isPlayerObj && !o.userData.isCamera && !o.userData.isHitbox &&
       !o.userData.isPCBlock && !o.userData.isMiniPad && window.buildAIInspectorHTML)
        ? window.buildAIInspectorHTML(o) : ''}
    ${(selectedObj?.userData?.isStartBlock || selectedObj?.userData?.isFinishBlock)
       && window.StartFinishSystem ? StartFinishSystem.inspectorHTML(selectedObj) : ''}

    ${(!pb && !_isGroundObj(o) && typeof physicsOptsFor === 'function' && physicsOptsFor(o)) ? `
    <div class="comp-block">
      <div class="comp-title"><span class="tag tag3">PHY</span>Fizika</div>
      <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 6px">
        Bu obyektda fizika tanasi yo'q — u turtilmaydi, tushmaydi va
        ko'tarilmaydi.
      </div>
      <button class="action-btn" onclick="addPhysicsToSel()"
        style="width:100%;background:rgba(var(--accent3-rgb),.08);border-color:rgba(var(--accent3-rgb),.3);color:var(--accent3)">
        ⚡ Fizikani yoqish
      </button>
    </div>` : ''}

    ${pb?`
    <div class="comp-block">
      <div class="comp-title"><span class="tag tag3">PHY</span>Fizika <span style="font-size:8px;color:${rapierWorld?'var(--accent3)':'var(--accent2)'};font-family:'Share Tech Mono',monospace;margin-left:4px">${rapierWorld?'⚡ Rapier':'⚙ Legacy'}</span></div>
      <div class="toggle-row"><span style="font-size:10px;color:var(--muted)">Aktiv</span>
        <label class="tgl"><input type="checkbox" ${pb.isStatic?'':'checked'} onchange="
          const active=this.checked;
          if(multiSelected.size>0){
            multiSelected.forEach(obj=>{
              const pb2=physBodies.find(b=>b.mesh===obj);
              if(pb2){pb2.isStatic=!active;pb2.mesh.userData.isStatic=!active;
                      if(typeof rebuildRapierBody==='function')rebuildRapierBody(obj);}
            });
          } else {
            const b=getSelectedPb();
            if(b){b.isStatic=!active;b.mesh.userData.isStatic=!active;
                  if(typeof rebuildRapierBody==='function')rebuildRapierBody(b.mesh);}
          }
          updateHierarchy(); updateInspector();
        "><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
      </div>
      <!-- ── 🧊 KOLLAYDER SHAKLI ──────────────────────── -->
      <!--  ⚠ Ilgari HAMMA obyekt to'rtburchak quti kollayder olardi:
            shar dumalamasdi, konusning uchi bo'sh joyni to'sardi.
            △ Aniq — ko'rinishning haqiqiy qirralari bo'yicha (convex
            hull); sekinroq, shuning uchun standart emas. -->
      <div class="fr" style="margin-top:4px"><span class="fl">🧊 Kollayder</span>
        <select class="fv" style="cursor:pointer" onchange="setColliderShapeSel(this.value)">
          ${[['auto','✨ Avto'],['cuboid','◻ Quti'],['sphere','⭕ Shar'],
             ['cylinder','🛢 Silindr'],['cone','🔺 Konus'],
             ['capsule','💊 Kapsula'],['convex','△ Aniq']]
            .map(([v,l])=>`<option value="${v}" ${(o.userData.colShape||'auto')===v?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:0 0 4px">
        ✨ Avto — obyekt turidan o'zi tanlaydi${pb._shapeUsed ? ` (hozir: <b>${pb._shapeUsed}</b>)` : ''}.
        △ Aniq — eng to'g'ri, lekin og'irroq.
      </div>

      <div class="fr"><span class="fl">Massa</span>
        <input class="fv" value="${pb.mass.toFixed(1)}" oninput="
          const b=getSelectedPb(); if(!b)return;
          b.mass=parseFloat(this.value)||1;
          updateRapierColliderProps(b.mesh,{mass:b.mass});
        ">
      </div>
      <div class="fr"><span class="fl">Sakrash</span>
        <input type="range" min="0" max="1" step="0.05" value="${pb.restitution}" style="flex:1"
          oninput="const b=getSelectedPb();if(!b)return;b.restitution=parseFloat(this.value);updateRapierColliderProps(b.mesh,{restitution:b.restitution})">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px">${pb.restitution.toFixed(2)}</span>
      </div>
      <div class="fr"><span class="fl">Ishqalanish</span>
        <input type="range" min="0" max="1" step="0.05" value="${pb.friction ?? 0.8}" style="flex:1"
          oninput="const b=getSelectedPb();if(!b)return;b.friction=parseFloat(this.value);updateRapierColliderProps(b.mesh,{friction:b.friction})">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px">${(pb.friction ?? 0.8).toFixed(2)}</span>
      </div>
      ${_comBlock(o)}
      <div class="fr"><span class="fl">Collider</span>
        <select onchange="const b=getSelectedPb();if(!b)return;b.shape=this.value;if(rapierBodies.has(b.mesh)){removeRapierBody(b.mesh);_addRapierBody(b);}" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px;border-radius:2px;outline:none">
          <option value="cuboid" ${(pb.shape||'cuboid')==='cuboid'?'selected':''}>📦 Cuboid</option>
          <option value="sphere" ${pb.shape==='sphere'?'selected':''}>🔮 Sphere</option>
          <option value="cylinder" ${pb.shape==='cylinder'?'selected':''}>🥫 Cylinder</option>
        </select>
      </div>
      ${rapierWorld?`<div style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;padding:3px 5px;background:rgba(var(--accent3-rgb),.06);border-radius:2px;margin-top:2px">
        ⚡ Rapier: vel=(${(pb.vel.x||0).toFixed(1)},${(pb.vel.y||0).toFixed(1)},${(pb.vel.z||0).toFixed(1)})
      </div>`:''}
      <button class="action-btn" onclick="launchObj()" style="margin-top:4px">🚀 Uloqtir!</button>
    </div>`:''}

    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(var(--accent3-rgb),.12);color:var(--accent3)">PLAYER</span>Oyinchi / Qurol / Avto</div>
      ${(o.userData.type === 'Tekislik' || o.userData.name === 'Zamin') ? `
      <div style="font-size:9px;color:var(--red);font-family:'Share Tech Mono',monospace;padding:4px 0">
        ⛔ Zamin oyinchi bo'la olmaydi
      </div>` : `

      <!-- 3 ASOSIY TUGMA -->
      <div style="display:flex;gap:4px;margin-bottom:6px">

        <!-- OYINCHI -->
        <button onclick="setPlayerObj(selectedObj)"
          style="flex:1;padding:5px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;border:1px solid;
          ${o.userData.isPlayerObj
            ? 'background:rgba(var(--accent3-rgb),.18);border-color:rgba(var(--accent3-rgb),.6);color:var(--accent3);box-shadow:0 0 8px rgba(var(--accent3-rgb),.3)'
            : 'background:rgba(var(--accent3-rgb),.05);border-color:rgba(var(--accent3-rgb),.2);color:var(--accent3)'}">
          🎮<br><span style="font-size:8px">${o.userData.isPlayerObj?'AKTIV':'Oyinchi'}</span>
        </button>

        <!-- AVTOMOBIL -->
        <button onclick="setEntityMode(selectedObj,'vehicle')"
          style="flex:1;padding:5px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;border:1px solid;
          ${o.userData._entityMode==='vehicle'
            ? 'background:rgba(0,180,255,.18);border-color:rgba(0,180,255,.6);color:#00b4ff;box-shadow:0 0 8px rgba(0,180,255,.3)'
            : 'background:rgba(0,180,255,.05);border-color:rgba(0,180,255,.2);color:#00b4ff'}">
          🚗<br><span style="font-size:8px">${o.userData._entityMode==='vehicle'?'AKTIV':'Avto'}</span>
        </button>
      </div>

      <!-- AKTIV HOLAT BELGISI VA O'CHIRISH -->
      ${o.userData.isPlayerObj ? `
      <button class="action-btn" onclick="setPlayerObj(null)"
        style="background:rgba(255,68,68,.07);border-color:rgba(255,68,68,.25);color:var(--red);font-size:9px;margin-bottom:4px">
        ✕ Oyinchini olib tashlash
      </button>
      <!-- 🎬 KAMERA PREVIEW + SOZLAMALAR — Oyinchi uchun -->
      <div style="border:1px solid rgba(var(--accent3-rgb),.2);border-radius:5px;padding:7px 8px;background:rgba(var(--accent3-rgb),.03);margin-bottom:6px">
        <div style="font-size:8px;color:var(--accent3);font-family:'Share Tech Mono',monospace;margin-bottom:7px;letter-spacing:1px">🎥 KAMERA SOZLAMALARI</div>

        <!-- Ruxsat toggle -->
        <div style="display:flex;gap:4px;margin-bottom:7px">
          <button onclick="_psCamSet('camAllow1st',!playerSettings.camAllow1st);if(!playerSettings.camAllow1st&&playerSettings.camMode==='fps')_psCamSet('camMode','third');updateInspector()"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            border:1px solid ${playerSettings.camAllow1st?'var(--accent)':'var(--red)'};
            background:${playerSettings.camAllow1st?'rgba(var(--accent-rgb),.1)':'rgba(255,68,68,.1)'};
            color:${playerSettings.camAllow1st?'var(--accent)':'var(--red)'}">
            👁 1-shaxs<br><span style="font-size:8px">${playerSettings.camAllow1st?'✓ Yoqiq':'✗ O\' chiq'}</span>
          </button>
          <button onclick="_psCamSet('camAllow3rd',!playerSettings.camAllow3rd);if(!playerSettings.camAllow3rd&&playerSettings.camMode==='third')_psCamSet('camMode','fps');updateInspector()"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            border:1px solid ${playerSettings.camAllow3rd?'var(--accent)':'var(--red)'};
            background:${playerSettings.camAllow3rd?'rgba(var(--accent-rgb),.1)':'rgba(255,68,68,.1)'};
            color:${playerSettings.camAllow3rd?'var(--accent)':'var(--red)'}">
            👥 3-shaxs<br><span style="font-size:8px">${playerSettings.camAllow3rd?'✓ Yoqiq':'✗ O\' chiq'}</span>
          </button>
        </div>

        <!-- Boshlang'ich rejim -->
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:4px">Boshlang'ich rejim:</div>
        <div style="display:flex;gap:4px;margin-bottom:8px">
          <button onclick="_psCamSet('camMode','fps');updateInspector()"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            border:1px solid ${playerSettings.camMode==='fps'?'var(--accent)':'var(--border)'};
            background:${playerSettings.camMode==='fps'?'rgba(var(--accent-rgb),.12)':'none'};
            color:${playerSettings.camMode==='fps'?'var(--accent)':'var(--muted)'};
            opacity:${playerSettings.camAllow1st===false?'0.35':'1'}">
            👁 1-shaxs
          </button>
          <button onclick="_psCamSet('camMode','third');updateInspector()"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            border:1px solid ${playerSettings.camMode==='third'?'var(--accent)':'var(--border)'};
            background:${playerSettings.camMode==='third'?'rgba(var(--accent-rgb),.12)':'none'};
            color:${playerSettings.camMode==='third'?'var(--accent)':'var(--muted)'};
            opacity:${playerSettings.camAllow3rd===false?'0.35':'1'}">
            👥 3-shaxs
          </button>
        </div>

        ${playerSettings.camAllow1st ? `
        <!-- 1-shaxs sozlamalari -->
        <div style="background:rgba(var(--accent-rgb),.04);border:1px solid rgba(var(--accent-rgb),.12);border-radius:4px;padding:6px;margin-bottom:6px">
          <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:5px">👁 1-SHAXS SOZLAMALARI</div>
          <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:4px;margin-top:2px">📐 Boshlang'ich burchak:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🧭 Obyektdan</span>
            <button onclick="_psCamSet('camYawFromObj', ${playerSettings.camYawFromObj === false});updateInspector()"
              style="padding:3px 9px;border-radius:3px;cursor:pointer;font-size:9px;font-family:'Share Tech Mono',monospace;
              border:1px solid ${playerSettings.camYawFromObj !== false ? 'var(--accent3)' : 'var(--border)'};
              background:${playerSettings.camYawFromObj !== false ? 'rgba(var(--accent3-rgb),.1)' : 'transparent'};
              color:${playerSettings.camYawFromObj !== false ? 'var(--accent3)' : 'var(--muted)'}">
              ${playerSettings.camYawFromObj !== false ? '✓ Obyekt qayerga qarasa' : '✗ Mutlaq burchak'}</button>
          </div>
          <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-bottom:5px;font-family:'Share Tech Mono',monospace">
            Yoqiq: qahramon qayerga burilgan bo'lsa, o'yin boshlanganda kamera
            ham <b style="color:var(--accent3)">o'sha yerga</b> qaraydi. Yaw esa unga
            <b>qo'shimcha</b> burchak.
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">${playerSettings.camYawFromObj !== false ? '↔ Yaw +(°)' : '↔ Yaw (°)'}</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-180" max="360" step="1" value="${playerSettings.camInitYaw??0}" style="flex:1"
                oninput="_psCamSet('camInitYaw',parseFloat(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.camInitYaw??0}°</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↕ Pitch (°)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-80" max="80" step="1" value="${playerSettings.camInitPitch??0}" style="flex:1"
                oninput="_psCamSet('camInitPitch',parseFloat(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.camInitPitch??0}°</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:3px">Kamera ofseti:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↔ Yon (X)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-2" max="2" step="0.05" value="${playerSettings.cam1stOffsetX}" style="flex:1"
                oninput="_psCamSet('cam1stOffsetX',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stOffsetX}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↕ Balandlik (Y)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-1" max="3" step="0.05" value="${playerSettings.cam1stOffsetY}" style="flex:1"
                oninput="_psCamSet('cam1stOffsetY',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stOffsetY}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↔ Oldi/orqa (Z)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-2" max="2" step="0.05" value="${playerSettings.cam1stOffsetZ}" style="flex:1"
                oninput="_psCamSet('cam1stOffsetZ',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stOffsetZ}m</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">🔄 Aylanish tezligi:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🖱 Sezgirlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.1" max="3.0" step="0.05" value="${playerSettings.cam1stRotateSpeed}" style="flex:1"
                oninput="_psCamSet('cam1stRotateSpeed',parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stRotateSpeed.toFixed(2)}x</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">🔄 Aylanish tezligi:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🖱 Sezgirlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.1" max="3.0" step="0.05" value="${playerSettings.cam1stRotateSpeed}" style="flex:1"
                oninput="_psCamSet('cam1stRotateSpeed',parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${(playerSettings.cam1stRotateSpeed||1).toFixed(2)}x</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">Vertikal chegara (daraja):</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">⬆ Tepaga max</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="10" max="89" step="1" value="${playerSettings.cam1stPitchMax}" style="flex:1"
                oninput="_psCamSet('cam1stPitchMax',parseInt(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stPitchMax}°</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">⬇ Pastga max</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-89" max="-10" step="1" value="${playerSettings.cam1stPitchMin}" style="flex:1"
                oninput="_psCamSet('cam1stPitchMin',parseInt(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stPitchMin}°</span>
            </div>
          </div>
        </div>` : ''}

        ${playerSettings.camAllow3rd ? `
        <!-- 3-shaxs sozlamalari -->
        <div style="background:rgba(var(--accent4-rgb),.04);border:1px solid rgba(var(--accent4-rgb),.12);border-radius:4px;padding:6px;margin-bottom:6px">
          <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin-bottom:5px">👥 3-SHAXS SOZLAMALARI</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">📏 Masofa</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="2" max="20" step="0.5" value="${playerSettings.cam3rdDist}" style="flex:1"
                oninput="_psCamSet('cam3rdDist',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdDist}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↕ Balandlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0" max="10" step="0.5" value="${playerSettings.cam3rdHeight}" style="flex:1"
                oninput="_psCamSet('cam3rdHeight',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdHeight}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↔ Yon siljish</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-5" max="5" step="0.1" value="${playerSettings.cam3rdOffsetX}" style="flex:1"
                oninput="_psCamSet('cam3rdOffsetX',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdOffsetX}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🎞 Silliqlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.02" max="1" step="0.02" value="${playerSettings.cam3rdSmooth ?? 0.14}" style="flex:1"
                oninput="_psCamSet('cam3rdSmooth',parseFloat(this.value));this.nextSibling.textContent=(parseFloat(this.value)>=1?'qattiq':parseFloat(this.value).toFixed(2))">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${(playerSettings.cam3rdSmooth ?? 0.14) >= 1 ? 'qattiq' : (playerSettings.cam3rdSmooth ?? 0.14).toFixed(2)}</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;line-height:1.5;margin:0 0 5px">
            Kichik — kamera yumshoq ergashadi, katta — mahkam. <b>1 = qattiq</b> (silliqlashsiz, eng barqaror tasvir).
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">🔄 Aylanish tezligi:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🖱 Sezgirlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.1" max="3.0" step="0.05" value="${playerSettings.cam3rdRotateSpeed}" style="flex:1"
                oninput="_psCamSet('cam3rdRotateSpeed',parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdRotateSpeed.toFixed(2)}x</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">🔄 Aylanish tezligi:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🖱 Sezgirlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.1" max="3.0" step="0.05" value="${playerSettings.cam3rdRotateSpeed}" style="flex:1"
                oninput="_psCamSet('cam3rdRotateSpeed',parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${(playerSettings.cam3rdRotateSpeed||1).toFixed(2)}x</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">Vertikal chegara (daraja):</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">⬆ Tepaga max</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="5" max="80" step="1" value="${playerSettings.cam3rdPitchMax}" style="flex:1"
                oninput="_psCamSet('cam3rdPitchMax',parseInt(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdPitchMax}°</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">⬇ Pastga max</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-80" max="-5" step="1" value="${playerSettings.cam3rdPitchMin}" style="flex:1"
                oninput="_psCamSet('cam3rdPitchMin',parseInt(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdPitchMin}°</span>
            </div>
          </div>
        </div>` : ''}

        <!-- ❤️ Jon sozlamalari -->
        <div style="border-top:1px solid rgba(255,68,68,.15);padding-top:6px;margin-top:2px;margin-bottom:6px">
          <div style="font-size:8px;color:#ff6b6b;font-family:'Share Tech Mono',monospace;margin-bottom:5px">❤️ Jon sozlamalari:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">💊 Max jon</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="1" max="1000" step="1" value="${playerSettings.maxHealth??100}" style="flex:1"
                oninput="_psCamSet('maxHealth',parseInt(this.value));this.nextSibling.textContent=this.value+'hp'">
              <span style="font-size:9px;color:#ff6b6b;font-family:'Share Tech Mono',monospace;min-width:42px;text-align:right">${playerSettings.maxHealth??100}hp</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">☠ O'lim xabari</span>
            <input type="text" value="${playerSettings.deathMessage??'Siz oldingiz!'}"
              style="flex:1;background:var(--panel2);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:9px;padding:3px 5px;border-radius:3px"
              oninput="_psCamSet('deathMessage',this.value)">
          </div>
        </div>

        <!-- ⚡ STAMINA + SAKRASH -->
        <div style="border-top:1px solid rgba(var(--accent3-rgb),.15);padding-top:6px;margin-top:2px;margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:8px;color:var(--accent3);font-family:'Share Tech Mono',monospace">⚡ Stamina + Sakrash</span>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:8px;color:var(--muted)">
              <input type="checkbox" ${playerSettings.staminaEnabled!==false?'checked':''} onchange="_psCamSet('staminaEnabled',this.checked);updateInspector()" style="cursor:pointer"> Stamina
            </label>
          </div>
          ${playerSettings.staminaEnabled!==false?`
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:88px;flex-shrink:0">🔋 Max stamina</span>
            <input type="range" min="10" max="500" step="5" value="${playerSettings.staminaMax??100}" style="flex:1"
              oninput="_psCamSet('staminaMax',parseInt(this.value));this.nextSibling.textContent=this.value">
            <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${playerSettings.staminaMax??100}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:88px;flex-shrink:0">⬇ Sakrash narxi</span>
            <input type="range" min="0" max="100" step="1" value="${playerSettings.staminaJumpCost??25}" style="flex:1"
              oninput="_psCamSet('staminaJumpCost',parseInt(this.value));this.nextSibling.textContent=this.value">
            <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${playerSettings.staminaJumpCost??25}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:88px;flex-shrink:0">🔄 Tiklanish/s</span>
            <input type="range" min="1" max="100" step="1" value="${playerSettings.staminaRegen??20}" style="flex:1"
              oninput="_psCamSet('staminaRegen',parseInt(this.value));this.nextSibling.textContent=this.value">
            <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${playerSettings.staminaRegen??20}</span>
          </div>`:''}
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:88px;flex-shrink:0">🦘 Sakrash kuchi</span>
            <input type="range" min="3" max="30" step="0.5" value="${playerSettings.jumpForce??10}" style="flex:1"
              oninput="_psCamSet('jumpForce',parseFloat(this.value));this.nextSibling.textContent='≈'+(this.value*this.value/50).toFixed(1)+'m'">
            <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;min-width:40px;text-align:right">≈${((playerSettings.jumpForce??10)**2/50).toFixed(1)}m</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:88px;flex-shrink:0">⏱ Qo'nish qotishi</span>
            <input type="range" min="0" max="3" step="0.1" value="${playerSettings.jumpCooldown??1.0}" style="flex:1"
              oninput="_psCamSet('jumpCooldown',parseFloat(this.value));this.nextSibling.textContent=this.value+'s'">
            <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${playerSettings.jumpCooldown??1.0}s</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:88px;flex-shrink:0">🪜 Qadam bal.</span>
            <input type="number" min="0" max="200" step="1" value="${playerSettings.stepHeightCm??30}"
              style="width:64px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none"
              oninput="_psCamSet('stepHeightCm',Math.max(0,parseInt(this.value)||0));this.nextElementSibling.textContent=(this.value>=100?(this.value/100).toFixed(2)+'m':this.value+'cm')">
            <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;min-width:44px;text-align:right">${(playerSettings.stepHeightCm??30)>=100?((playerSettings.stepHeightCm??30)/100).toFixed(2)+'m':(playerSettings.stepHeightCm??30)+'cm'}</span>
          </div>
          <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:-2px 0 6px;font-family:'Share Tech Mono',monospace">
            Shu balandlikkacha past to'siqqa yopishmasdan chiqib ketadi (1=1cm, 100=1m). 0=o'chiq.
          </div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">
          </label>
        </div>
        </div>

        <!-- 🖐 KO'TARISH / 🔫 GRAVITY GUN -->
        ${window.GravityGunSystem ? GravityGunSystem.inspectorHTML() : ''}

        <!-- ⌨🖥 EKRAN TUGMALARI -->
        <!--  ⚠ Bo'lim HAR DOIM ko'rinadi, hatto bitta ham tugma
              chiqarilmagan bo'lsa ham: aks holda foydalanuvchi
              \"ekranga chiqardim, endi qayerdan sozlayman?\" degan
              savolga javob topolmasdi. Bo'sh holatda panel yo'l
              ko'rsatadi. -->
        ${window.screenKeysPanelHTML ? `
        <div style="border-top:1px solid rgba(var(--accent3-rgb),.18);padding-top:6px;margin-top:2px;margin-bottom:6px">
          <div style="font-size:8px;color:var(--accent3);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">⌨🖥 EKRAN TUGMALARI</div>
          ${window.screenKeysPanelHTML()}
        </div>` : ''}

        <!-- 🎬 KINO KAMERA -->
        ${window.KinoCamSystem ? KinoCamSystem.inspectorHTML() : ''}

        <!-- 🎒 INVENTAR -->
        ${window.InventorySystem ? InventorySystem.inspectorHTML() : ''}

        <!-- 🏃 YUGURISH CHEKLOVI -->
        <div style="border-top:1px solid rgba(255,170,68,.15);padding-top:6px;margin-top:2px;margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:8px;color:#ffaa44;font-family:'Share Tech Mono',monospace">🏃 Yugurish cheklovi</span>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:8px;color:var(--muted)">
              <input type="checkbox" ${playerSettings.sprintLimitEnabled!==false?'checked':''} onchange="_psCamSet('sprintLimitEnabled',this.checked);updateInspector()" style="cursor:pointer"> Yoqiq
            </label>
          </div>
          ${playerSettings.sprintLimitEnabled!==false?`
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:96px;flex-shrink:0">🏃 Yugurish vaqti</span>
            <input type="range" min="1" max="30" step="0.5" value="${playerSettings.sprintDuration??5}" style="flex:1"
              oninput="_psCamSet('sprintDuration',parseFloat(this.value));this.nextSibling.textContent=this.value+'s'">
            <span style="font-size:9px;color:#ffaa44;font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${playerSettings.sprintDuration??5}s</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:96px;flex-shrink:0">⛔ Blok/dam vaqti</span>
            <input type="range" min="0.5" max="20" step="0.5" value="${playerSettings.sprintBlockTime??3}" style="flex:1"
              oninput="_psCamSet('sprintBlockTime',parseFloat(this.value));this.nextSibling.textContent=this.value+'s'">
            <span style="font-size:9px;color:#ffaa44;font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${playerSettings.sprintBlockTime??3}s</span>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;line-height:1.4;padding-top:3px">Uzoq yugursa (${playerSettings.sprintDuration??5}s) shift ${playerSettings.sprintBlockTime??3}s bloklanadi. Yugurish tugmasi: ⌨ klavishlar sozlamasida.</div>`:''}
        </div>

        <!--  OGOHLANTIRISH: eski 'Ob'ekt burilishi (Alt)' tugmasi
              OLIB TASHLANDI. U 'Erkin kamera' bilan USTMA-UST
              tushardi: ikkalasi ham Alt haqida edi va dizayner
              qaysi biri nima qilishini ajrata olmasdi - panelda
              ikkita bir xil narsa ko'rinardi. Endi Alt xulqi FAQAT
              'Erkin kamera' orqali boshqariladi.
              bodyRotate MANTIQI qoldi (standarti yoniq) - uni olib
              tashlasak 1-shaxsda gavda burilishi buzilardi. -->

        <!-- 👁 ERKIN KAMERA (\"Alt qarash\") -->
        <!--  Klavish BOSIB TURILGANDA kamera erkin aylanadi, personaj
              esa QIMIRLAMAYDI. O'yinchi yurish yo'nalishini
              yo'qotmasdan atrofga qaray oladi — MMO larda klassik
              \"free look\".
              ⚠ Qo'yib yuborilganda kamera personaj ORQASIGA qaytadi:
                aks holda o'yinchi yon tomonga qarab yurib ketardi va
                boshqaruv buzilgandek tuyulardi. -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:5px 6px;background:rgba(var(--accent3-rgb),.04);border:1px solid rgba(var(--accent3-rgb),.15);border-radius:4px">
          <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);flex:1">👁 Erkin kamera</span>
          <button onclick="_psCamSet('freeLookOn',!playerSettings.freeLookOn);updateInspector()"
            style="padding:3px 10px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
            background:${playerSettings.freeLookOn?'rgba(var(--accent3-rgb),.2)':'rgba(255,255,255,.05)'};
            border:1px solid ${playerSettings.freeLookOn?'var(--accent3)':'rgba(255,255,255,.2)'};
            color:${playerSettings.freeLookOn?'var(--accent3)':'var(--muted)'}">
            ${playerSettings.freeLookOn?'✅ YOQIQ':'⬜ O\'CHIQ'}
          </button>
        </div>
        ${playerSettings.freeLookOn ? `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:88px">⌨ Klavish</span>
          <button onclick="_psFreeLookKey(this)"
            style="flex:1;padding:3px 6px;border-radius:3px;cursor:pointer;font-size:10px;
            font-family:'Share Tech Mono',monospace;border:1px solid var(--accent3);
            background:rgba(var(--accent3-rgb),.1);color:var(--accent3)">🎯 ${(playerSettings.freeLookKey||'AltLeft').replace(/^Key/,'')}</button>
        </div>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin:-2px 0 6px;font-family:'Share Tech Mono',monospace">
          Bosib turilganda kamera erkin aylanadi, personaj qimirlamaydi.
          Qo'yib yuborilsa kamera personaj orqasiga qaytadi.
        </div>` : ''}

        <!-- 🎬 Kamera Tekshir tugmalari -->
        <div style="border-top:1px solid rgba(var(--accent3-rgb),.15);padding-top:6px;margin-top:2px">
          <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">🎬 KAMERA TEKSHIR — oyna ochmasdan</div>
          <div style="display:flex;gap:5px">
            <button onclick="window._camPreview.start('player','1st')"
              style="flex:1;padding:7px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;
              background:rgba(var(--accent-rgb),.12);border:1px solid rgba(var(--accent-rgb),.4);color:var(--accent)">
              👁 1-shaxs<br><span style="font-size:8px;opacity:.75;font-weight:400">Tekshir</span>
            </button>
            <button onclick="window._camPreview.start('player','3rd')"
              style="flex:1;padding:7px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;
              background:rgba(var(--accent4-rgb),.12);border:1px solid rgba(var(--accent4-rgb),.4);color:var(--accent4)">
              👥 3-shaxs<br><span style="font-size:8px;opacity:.75;font-weight:400">Tekshir</span>
            </button>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:5px;line-height:1.5">
            🖱 Bosing → canvas ustida sichqoncha tortib kamera buriladi
          </div>
        </div>
      </div>` : ''}
      ${o.userData._entityMode ? `
      <button class="action-btn" onclick="setEntityMode(selectedObj,null)"
        style="background:rgba(255,68,68,.07);border-color:rgba(255,68,68,.25);color:var(--red);font-size:9px;margin-bottom:4px">
        ✕ Entity rejimini olib tashlash
      </button>` : ''}

      <!-- GLB UCHUN OLDI/ORQA BELGILASH -->
      ${(o.userData.isGLB || o.userData.isGLTF) && (o.userData.isPlayerObj || o.userData._entityMode) ? `
      <div style="border:1px solid rgba(255,200,0,.2);border-radius:4px;padding:6px 8px;background:rgba(255,200,0,.04);margin-bottom:6px">
        <div style="font-size:9px;color:#ffcc00;font-family:'Share Tech Mono',monospace;margin-bottom:5px">🧭 Model yo'nalishi (OLDI qaysi tomon?)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;width:120px;margin:0 auto">
          <div></div>
          <button onclick="setModelFacing(selectedObj,0)" style="${_facingBtn(o.userData._facingY,0)}">⬆<br><span style="font-size:7px">+Z</span></button>
          <div></div>
          <button onclick="setModelFacing(selectedObj,270)" style="${_facingBtn(o.userData._facingY,270)}">⬅<br><span style="font-size:7px">-X</span></button>
          <div style="display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--muted)">👾</div>
          <button onclick="setModelFacing(selectedObj,90)" style="${_facingBtn(o.userData._facingY,90)}">➡<br><span style="font-size:7px">+X</span></button>
          <div></div>
          <button onclick="setModelFacing(selectedObj,180)" style="${_facingBtn(o.userData._facingY,180)}">⬇<br><span style="font-size:7px">-Z</span></button>
          <div></div>
        </div>
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:4px;text-align:center">
          Joriy: ${o.userData._facingY!==undefined ? ['⬆+Z','➡+X','⬇-Z','⬅-X'][o.userData._facingY/90]||'??' : 'Belgilanmagan'}
        </div>
      </div>` : ''}

      <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:2px;line-height:1.5">
        ${o.userData.isPlayerObj ? '▶ O\'YNA → WASD yuring, SPACE sakra' :
          o.userData._entityMode==='vehicle' ? '🚗 Avto — keyingi updateda minish' :
          'Tanlang → ▶ O\'YNA → WASD bilan yuring'}
      </div>`}

      <div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">

        <!-- TEZLIK -->
        <div class="fr" style="margin-bottom:4px">
          <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">🚶 Tezlik</span>
          <input type="range" min="1" max="20" step="0.5" value="${playerSettings.speed}" style="flex:1"
            oninput="playerSettings.speed=parseFloat(this.value);this.nextSibling.textContent=this.value">
          <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${playerSettings.speed}</span>
        </div>

        <!-- SPRINT TEZLIGI -->
        <div class="fr" style="margin-bottom:4px">
          <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">⚡ Sprint ×</span>
          <input type="range" min="1" max="5" step="0.1" value="${playerSettings.sprintMult}" style="flex:1"
            oninput="playerSettings.sprintMult=parseFloat(this.value);this.nextSibling.textContent=parseFloat(this.value).toFixed(1)+'x'">
          <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${playerSettings.sprintMult.toFixed(1)}x</span>
        </div>

        <!-- TO'LQIN (ACCEL) REJIMI -->
        <div style="margin-bottom:6px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:3px">🌊 Tezlashish rejimi</div>
          <div style="display:flex;gap:3px;flex-wrap:wrap">
            ${['instant','easein','easeout','wave'].map(m => `
            <button onclick="playerSettings.accelMode='${m}';updateInspector()"
              style="flex:1;min-width:48px;font-size:8px;padding:3px 4px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace;
              background:${playerSettings.accelMode===m?'rgba(var(--accent-rgb),.2)':'rgba(255,255,255,.05)'};
              border:1px solid ${playerSettings.accelMode===m?'var(--accent)':'var(--border)'};
              color:${playerSettings.accelMode===m?'var(--accent)':'var(--muted)'}">
              ${{instant:'⚡ Darhol',easein:'📈 Sekin→Tez',easeout:'📉 Tez→Sekin',wave:'🌊 Kutish'}[m]}
            </button>`).join('')}
          </div>
          ${playerSettings.accelMode !== 'instant' ? `
          <div class="fr" style="margin-top:4px">
            <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">${playerSettings.accelMode==='wave'?'⏳ Kutish':'⏱ Vaqt (s)'}</span>
            <input type="range" min="0" max="3" step="0.1"
              value="${playerSettings.accelMode==='wave'?playerSettings.waveDelay:playerSettings.accelTime}" style="flex:1"
              oninput="playerSettings.${playerSettings.accelMode==='wave'?'waveDelay':'accelTime'}=parseFloat(this.value);this.nextSibling.textContent=this.value+'s'">
            <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">
              ${(playerSettings.accelMode==='wave'?playerSettings.waveDelay:playerSettings.accelTime).toFixed(1)}s
            </span>
          </div>` : ''}
          ${playerSettings.accelMode === 'wave' ? `
          <div class="fr" style="margin-top:3px">
            <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">⏱ Tezlashish</span>
            <input type="range" min="0" max="3" step="0.1" value="${playerSettings.accelTime}" style="flex:1"
              oninput="playerSettings.accelTime=parseFloat(this.value);this.nextSibling.textContent=this.value+'s'">
            <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${playerSettings.accelTime.toFixed(1)}s</span>
          </div>` : ''}
        </div>

        <!-- TUGMA BIRIKTIRISHLAR -->
        <div>
          <div style="font-size:9px;color:var(--muted);margin-bottom:4px">⌨ Tugmalar</div>
          <div id="player-keybinds" style="display:flex;flex-direction:column;gap:2px">
            ${[
              ['forward','⬆ Oldinga'],['backward','⬇ Orqaga'],
              ['left','⬅ Chapga'],['right','➡ O\'ngga'],
              ['jump','⬆ Sakra'],['sprint','🏃 Sprint'],
            ].map(([action,label])=>{
              const kCode = playerSettings.keys[action];
              const animD = (window._kbAnimations||{})[kCode]||{};
              return `
            <div class="fr" style="gap:4px;align-items:center;margin-bottom:2px">
              <span style="flex:1;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">${label}</span>
              ${animD.animName
                ? `<span style="font-size:7px;color:#ffaa44;max-width:44px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="openBigKeyboard()">🎬${animD.animName}</span>`
                : `<label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:20px;height:18px;border-radius:2px;border:1px dashed rgba(255,170,68,.3);color:rgba(255,170,68,.5);font-size:10px;flex-shrink:0">📁<input type="file" accept=".glb,.fbx,.json,image/*" style="display:none" onchange="window._addKeyAnim(event,'${action}','${kCode}')"></label>`
              }
              <button id="kb-${action}" onclick="startRebind('${action}')"
                style="font-size:9px;padding:2px 8px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace;min-width:60px;text-align:center;
                background:${playerSettings._rebinding===action?'rgba(255,107,53,.25)':'rgba(var(--accent-rgb),.08)'};
                border:1px solid ${playerSettings._rebinding===action?'var(--accent2)':'rgba(var(--accent-rgb),.3)'};
                color:${playerSettings._rebinding===action?'var(--accent2)':'var(--accent)'}">${playerSettings._rebinding===action?'[ bosing ]':_keyLabel(playerSettings.keys[action])}
              </button>
            </div>`;
            }).join('')}
          </div>

          <!-- MINI KLAVIATURA (bosib kattalashtirish) -->
          <div id="mini-keyboard" style="margin-top:8px;user-select:none;cursor:pointer"
               onclick="openBigKeyboard()">
            ${_buildMiniKeyboard()}
          </div>
        </div>

        <!-- KAMERA SEZGIRLIGI -->
        <div class="fr" style="margin-top:6px;border-top:1px solid var(--border);padding-top:6px">
          <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">🖱 Sezgirlik</span>
          <input type="range" min="0.0005" max="0.006" step="0.0001" value="${camSensitivity}" style="flex:1"
            oninput="camSensitivity=parseFloat(this.value);this.nextSibling.textContent=(this.value*500).toFixed(1)+'%'">
          <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:36px;text-align:right">
            ${(camSensitivity*500).toFixed(1)}%
          </span>
        </div>



        <div class="fr" style="margin-top:3px">
          <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">🔲 Collider</span>
          <button onclick="toggleColliderVis()" style="flex:1;background:rgba(${colliderVis?'57,255,20':'255,255,255'},.07);border:1px solid rgba(${colliderVis?'57,255,20':'255,255,255'},.2);color:${colliderVis?'var(--accent3)':'var(--muted)'};font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer">
            ${colliderVis?'Yashir':'Ko\'rsat'} (C)
          </button>
        </div>
      </div>
    </div>



    ${(o.userData.entityType === 'car' || o.userData._entityMode === 'vehicle') ? _buildCarInspector(o) : ''}

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">QO'SH</span>Ichiga qo'shish</div>
      <button class="action-btn" onclick="addParticlesToObj()" style="background:rgba(255,150,0,.07);border-color:rgba(255,150,0,.3);color:#ffaa44">✨ Zarrachalar qo'sh</button>
      <button class="action-btn" onclick="addLightToObj()" style="background:rgba(255,255,100,.07);border-color:rgba(255,255,100,.3);color:#ffee66">💡 Yorug'lik qo'sh</button>
    </div>
    <div class="comp-block">
      <button class="action-btn" onclick="addChildToSelected()">📦 Ichiga obyekt qo'sh</button>
      <button class="action-btn" onclick="duplicateSel()">⊕ Nusxalash</button>
      <button class="action-btn" onclick="showPivotPanel()" style="background:rgba(var(--accent4-rgb),.08);border-color:rgba(var(--accent4-rgb),.3);color:var(--accent4)">◈ Pivot Markaz</button>
      <button class="action-btn" onclick="prefabSaveSelected()" style="background:rgba(255,204,0,.08);border-color:rgba(255,204,0,.3);color:#ffcc00">⭐ Prefab saqlash</button>
      ${!_isGroundObj(o)?`<button class="action-btn del-btn" onclick="deleteSel()">✕ O'chirish</button>`:''}
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag3">URILISH</span>Obyektga urilish</div>
      <div class="deform-grid" style="grid-template-columns:1fr 1fr">
        <button class="deform-btn ${(o.userData.colliderMode||'block')==='block'?'active-mode':''}" onclick="setColliderMode('block')">🧱 Block</button>
        <button class="deform-btn ${o.userData.colliderMode==='inline'?'active-mode':''}" onclick="setColliderMode('inline')">👻 Inline</button>
      </div>
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;background:rgba(var(--accent3-rgb),.04);border-radius:3px;padding:5px 7px;margin-top:5px;line-height:1.5">
        💡 <b>Block</b> — qattiq, urilsa boladi (default).<br>
        <b>Inline</b> — ko'rinish o'zgarmaydi, faqat urilish o'chadi — <u>orqasidan o'tib ketsa boladi</u>. Shaffoflikni o'zingiz nazorat qilasiz.
      </div>
    </div>

    ${(() => {
      const c = (o.userData && o.userData.headLook) || {};
      const on = !!c.enabled;
      const target = c.target || 'player';
      const mode = c.mode || 'static';
      const beh  = c.behavior || 'always';
      const lost = c.onLost || 'freeze';
      const spd  = c.speed ?? 0.15;
      const axis = c.axis || '+z';
      const IS = "flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";
      const seg = (val, cur, onClick, ic, label) =>
        `<button onclick="${onClick}" style="flex:1;text-align:center;background:${cur===val?'rgba(102,204,255,.14)':'transparent'};border:1px solid ${cur===val?'#66ccff':'var(--border)'};color:${cur===val?'#66ccff':'var(--muted)'};padding:5px 4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;line-height:1.3"><b>${ic} ${label}</b></button>`;
      const objOpts = objects.filter(x => x !== o && x.userData && x.userData.id &&
        !x.userData.isSpawn && !x.userData.isPath && !x.userData.isPathShape)
        .map(x => `<option value="obj:${x.userData.id}" ${target==='obj:'+x.userData.id?'selected':''}>▪ ${(x.userData.name||('#'+x.userData.id))}</option>`).join('');
      return `
    <div class="comp-block">
      <div class="comp-title" style="cursor:pointer" onclick="window._hlToggle()">
        <span class="tag" style="background:rgba(102,204,255,.15);color:#66ccff">LOOK</span>
        <span style="flex:1">Head-Look (Kuzatuv)</span>
        <input type="checkbox" ${on?'checked':''} onclick="event.stopPropagation();window._hlToggle()" style="cursor:pointer">
      </div>
      ${on ? `
      <div style="font-size:8px;color:var(--muted);line-height:1.6;padding:2px 0 6px;font-family:'Share Tech Mono',monospace">
        Obyekt maqsadga qarab buriladi — post, turret, kuzatuv kamerasi, dushman boshi.
      </div>
      <div class="fr" style="margin-bottom:5px">
        <span class="fl" style="min-width:52px">Kimni</span>
        <select onchange="window._hlSet('target', this.value)" style="${IS}">
          <option value="player" ${target==='player'?'selected':''}>🧍 O'yinchi</option>
          <option value="car" ${target==='car'?'selected':''}>🚗 Mashina</option>
          ${objOpts}
        </select>
      </div>

      <div class="fl" style="margin:6px 0 3px">Kuzatish usuli</div>
      <div style="display:flex;gap:4px">
        ${seg('static', mode, "window._hlSet('mode','static')", '↔', 'STATIK')}
        ${seg('realistic', mode, "window._hlSet('mode','realistic')", '↕', 'REALISTIK')}
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin:3px 0 0;font-family:'Share Tech Mono',monospace">
        ${mode==='static'
          ? 'STATIK — faqat yon-atrofga (gorizontal) buriladi. Tepa-pastda tursa qayrilmaydi.'
          : 'REALISTIK — tepa va pastga ham qaraydi (to\'liq).'}
      </div>

      <div class="fl" style="margin:8px 0 3px">Qachon kuzatadi</div>
      <div style="display:grid;gap:4px">
        ${seg('always', beh, "window._hlSet('behavior','always')", '🌐', 'DOIM (devor orqasidan ham)')}
        ${seg('ifVisible', beh, "window._hlSet('behavior','ifVisible')", '👁', 'FAQAT KO\'RINSA (devor to\'ssa yo\'q)')}
        ${seg('ifBehind', beh, "window._hlSet('behavior','ifBehind')", '🔙', 'FAQAT ORQADA BO\'LSA')}
      </div>

      <div class="fl" style="margin:8px 0 3px">Kuzatmasa nima qiladi</div>
      <div style="display:flex;gap:4px">
        ${seg('freeze', lost, "window._hlSet('onLost','freeze')", '⏸', 'TURAVERADI')}
        ${seg('reset', lost, "window._hlSet('onLost','reset')", '↺', 'BOSHIGA QAYTADI')}
      </div>

      <div class="fr" style="margin:8px 0 4px">
        <span class="fl" style="min-width:52px">Tezlik</span>
        <input type="range" min="0.02" max="1" step="0.02" value="${spd}" style="flex:1"
          oninput="window._hlSetNum('speed', this.value); this.nextElementSibling.textContent=(this.value>=0.99?'darhol':this.value)">
        <span style="font-size:9px;color:#66ccff;font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${spd>=0.99?'darhol':spd}</span>
      </div>
      <div class="fr" style="margin-bottom:4px">
        <span class="fl" style="min-width:52px">Old tomon</span>
        <select onchange="window._hlSet('axis', this.value)" style="${IS}">
          <option value="+z" ${axis==='+z'?'selected':''}>+Z (standart)</option>
          <option value="-z" ${axis==='-z'?'selected':''}>−Z (orqa)</option>
          <option value="+x" ${axis==='+x'?'selected':''}>+X (o'ng)</option>
          <option value="-x" ${axis==='-x'?'selected':''}>−X (chap)</option>
        </select>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:4px 0 0;font-family:'Share Tech Mono',monospace">
        Obyekt maqsadga to'g'ri qaramasa — "Old tomon" ni almashtiring.
      </div>` : `
      <div style="font-size:9px;color:var(--muted);padding:3px 0;line-height:1.6">
        Yoqilsa — obyekt tanlangan maqsadga (o'yinchi/mashina/obyekt) qarab buriladi.
      </div>`}
    </div>`;
    })()}

    ${(o.userData && o.userData.isLadder) ? (() => {
      const ud = o.userData;
      const kb = (k, def) => ud[k] || def;
      const IS = "flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 6px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";
      const keyRow = (label, key, def) => `
        <div class="fr" style="margin-bottom:5px">
          <span class="fl" style="min-width:60px">${label}</span>
          <div style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;color:#ffcc22;padding:3px 6px;background:rgba(0,0,0,.25);border-radius:3px">${(typeof _keyLabel==='function'?_keyLabel(kb(key,def)):kb(key,def))}</div>
          <button onclick="window._ladCatchKey('${key}', this)" style="flex-shrink:0;padding:4px 8px;border-radius:4px;background:rgba(255,204,34,.12);border:1px solid rgba(255,204,34,.4);color:#ffcc22;font-size:9px;cursor:pointer;font-family:'Share Tech Mono',monospace">🎯</button>
        </div>`;
      return `
    <div class="comp-block">
      <div class="comp-title">
        <span class="tag" style="background:rgba(255,204,34,.15);color:#ffcc22">🪜</span>
        <span style="flex:1">Narvon sozlamalari</span>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.6;padding:2px 0 8px;font-family:'Share Tech Mono',monospace">
        O'yinchi oldiga borsa avtomatik yopishadi. Uchiga yetsa o'zi qo'yvoradi.
      </div>
      ${keyRow('⬆ Tepaga', 'climbUpKey', 'KeyW')}
      ${keyRow('⬇ Pastga', 'climbDownKey', 'KeyS')}
      ${keyRow('🚪 Tushish', 'exitKey', 'KeyE')}
      <div class="fr" style="margin:8px 0 4px">
        <span class="fl" style="min-width:60px">Tezlik</span>
        <input type="range" min="1" max="8" step="0.5" value="${ud.climbSpeed ?? 3}" style="flex:1"
          oninput="window._ladSetNum('climbSpeed', this.value); this.nextElementSibling.textContent=this.value+' m/s'">
        <span style="font-size:9px;color:#ffcc22;font-family:'Share Tech Mono',monospace;min-width:44px;text-align:right">${ud.climbSpeed ?? 3} m/s</span>
      </div>
      <div class="fr" style="margin-bottom:4px">
        <span class="fl" style="min-width:60px">Yopishish</span>
        <input type="range" min="0.5" max="3" step="0.1" value="${ud.grabDist ?? 1.2}" style="flex:1"
          oninput="window._ladSetNum('grabDist', this.value); this.nextElementSibling.textContent=this.value+' m'">
        <span style="font-size:9px;color:#ffcc22;font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${ud.grabDist ?? 1.2} m</span>
      </div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:6px">
        <input type="checkbox" ${ud.autoRelease!==false?'checked':''} onchange="window._ladSet('autoRelease', this.checked)" style="cursor:pointer">
        Uchiga yetganda avtomatik qo'yvorsin
      </label>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;padding:6px 0 0;font-family:'Share Tech Mono',monospace">
        💡 Model/tekstura yuqoridagi "Material" va "Model" bo'limlaridan qo'shiladi.
      </div>
    </div>`;
    })() : ''}

    ${(() => {
      const r = (o.userData && o.userData.roll) || null;
      const on = !!(r && r.enabled);
      const md = r ? r.mode : 'damage';
      const contact = r ? r.contact : 'near';
      const fx = (r && r.fx) || {};
      const dth = (r && r.death) || {};
      const camOpts = objects.filter(x => x.userData && x.userData.isCamera)
        .map(c => `<option value="${c.userData.id}" ${String(dth.cameraId)===String(c.userData.id)?'selected':''}>#${c.userData.id} ${c.userData.name||''}</option>`).join('');
      const btn = (active, onClick, label) =>
        `<button class="deform-btn ${active?'active-mode':''}" onclick="${onClick}">${label}</button>`;
      return `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(255,68,68,.14);color:#ff6b6b">ROLL</span>Roll — Damage / Heal</div>
      <div class="toggle-row" style="align-items:center">
        <span style="font-size:10px;color:${on?'var(--accent3)':'var(--muted)'};font-family:'Share Tech Mono',monospace">🎭 Rollni yoqish</span>
        <label class="tgl"><input type="checkbox" ${on?'checked':''} onchange="window._rollToggle(this.checked)"><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.45;margin:3px 0 2px">
        Oyinchi obyektga tegib turganda belgilangan vaqt oralig'ida jon kamayadi (damage) yoki ortadi (heal).
      </div>
      ${on ? `
      <div class="deform-grid" style="grid-template-columns:1fr 1fr;margin-top:5px">
        ${btn(md==='damage', "window._rollSet('mode','damage')", '🗡 Damage (−)')}
        ${btn(md==='heal',   "window._rollSet('mode','heal')",   '💚 Heal (+)')}
      </div>
      <div class="fr" style="margin-top:5px"><span class="fl">${md==='heal'?'+hp miqdori':'−hp miqdori'}</span>
        <input class="fv" type="number" min="0" step="1" value="${r?r.amount:20}"
          oninput="window._rollSet('amount',parseFloat(this.value)||0)">
      </div>
      <div class="fr" style="margin-top:3px"><span class="fl" style="font-size:9px">Har</span>
        <input class="fv" type="number" min="0" step="0.5" value="${r?r.interval:5}" style="width:60px"
          oninput="window._rollSet('interval',parseFloat(this.value)||0)">
        <select class="fv" onchange="window._rollSet('intervalUnit',this.value)" style="width:auto;margin-left:4px">
          <option value="sec"  ${(r?r.intervalUnit:'sec')==='sec'?'selected':''}>soniya</option>
          <option value="min"  ${(r&&r.intervalUnit)==='min'?'selected':''}>daqiqa</option>
          <option value="hour" ${(r&&r.intervalUnit)==='hour'?'selected':''}>soat</option>
        </select>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.4;margin:2px 0 2px">
        Masalan: ${r?Math.abs(r.amount||20):20}hp, har ${r?(r.interval||5):5} ${({sec:'soniya',min:'daqiqa',hour:'soat'})[r?r.intervalUnit:'sec']||'soniya'}da bir marta beriladi. <b>0</b> = uzluksiz (hp/soniya).
      </div>
      <div class="fr" style="margin-top:3px"><span class="fl" style="font-size:9px">Tegish zonasi</span>
        <select class="fv" onchange="window._rollSet('contact',this.value)" style="width:auto">
          <option value="near"   ${contact!=='inside'?'selected':''}>Tanaga tegsa (tavsiya)</option>
          <option value="inside" ${contact==='inside'?'selected':''}>Faqat ichida</option>
        </select>
      </div>

      ${(typeof CameraShakeSystem!=='undefined' && CameraShakeSystem._buildRoleSection) ? CameraShakeSystem._buildRoleSection(o) : ''}

      ${md==='damage' ? `
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#ff6b6b;margin:8px 0 3px;letter-spacing:1px">JON 0 BO'LGANDA (O'LIM)</div>
      <div class="toggle-row" style="align-items:center">
        <span style="font-size:9px;color:var(--muted)">Respawn qilish</span>
        <label class="tgl"><input type="checkbox" ${dth.respawn!==false?'checked':''} onchange="window._rollSet('death.respawn',this.checked)"><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
      </div>

      ${dth.respawn!==false ? _rollSpawnUI(o, dth) : ''}

      <div class="fr" style="margin-top:3px"><span class="fl" style="font-size:9px">Oxirgi hitbox anim.</span>
        <select class="fv" onchange="window._rollSet('death.respawnHitboxAnim',this.value)" style="width:auto">
          <option value="restart"  ${dth.respawnHitboxAnim!=='continue'?'selected':''}>Qaytadan boshlansin</option>
          <option value="continue" ${dth.respawnHitboxAnim==='continue'?'selected':''}>Davom etsin</option>
        </select>
      </div>
      <div class="fr" style="margin-top:5px"><span class="fl" style="font-size:9px">Ekran</span>
        <select class="fv" onchange="window._rollSet('death.screen',this.value)" style="width:auto">
          <option value="none"   ${dth.screen==='none'?'selected':''}>Yo'q</option>
          <option value="html"   ${dth.screen==='html'?'selected':''}>HTML sahifa</option>
          <option value="image"  ${dth.screen==='image'?'selected':''}>Rasm</option>
          <option value="video"  ${dth.screen==='video'?'selected':''}>Video</option>
          <option value="camera" ${dth.screen==='camera'?'selected':''}>Kamerali animatsiya</option>
        </select>
      </div>
      ${dth.screen==='html' ? `
      <textarea oninput="window._rollSet('death.html',this.value)"
        style="width:100%;margin-top:5px;min-height:60px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:9px;padding:5px;border-radius:3px;resize:vertical"
      >${(dth.html||'').replace(/</g,'&lt;')}</textarea>
      <div style="font-size:8px;color:var(--muted);margin-top:2px">Har qanday HTML — masalan "Siz oldingiz!" matni.</div>` : ''}
      ${(dth.screen==='image'||dth.screen==='video') ? `
      <button class="action-btn" style="font-size:10px;margin-top:5px" onclick="window._rollPickMedia('${dth.screen}')">
        ${dth.mediaName ? '↺ '+dth.mediaName : '📂 '+(dth.screen==='image'?'Rasm':'Video')+' tanlash'}
      </button>` : ''}
      ${dth.screen==='camera' ? `
      <div class="fr" style="margin-top:5px"><span class="fl" style="font-size:9px">Kamera</span>
        <select class="fv" onchange="window._rollSet('death.cameraId',this.value)" style="width:auto">
          <option value="">— Joriy —</option>${camOpts}
        </select>
      </div>` : ''}
      ${dth.screen!=='none' ? `
      <div class="fr" style="margin-top:4px"><span class="fl" style="font-size:9px">Ko'rsatish</span>
        <input type="range" min="0.5" max="10" step="0.5" value="${dth.duration??3}" style="flex:1"
          oninput="window._rollSet('death.duration',parseFloat(this.value)||3);this.nextSibling.textContent=parseFloat(this.value).toFixed(1)+'s'">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:30px;text-align:right">${(dth.duration??3).toFixed(1)}s</span>
      </div>` : ''}
      <button class="action-btn" style="font-size:10px;margin-top:6px;background:rgba(255,68,68,.08);border-color:rgba(255,68,68,.3);color:#ff6b6b" onclick="window._rollTestDeath()">☠ O'limni sinash (Play'da)</button>
      ` : ''}
      ` : ''}
    </div>`;
    })()}

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag4">PHY-MOD</span>Fizika Rejimi</div>
      <div class="deform-grid">
        <button class="deform-btn ${(o.userData.physMode||'solid')==='solid'?'active-mode':''}" onclick="setPhysMode('solid')">🧱 Qattiq</button>
        <button class="deform-btn ${o.userData.physMode==='jelly'?'active-mode':''}" onclick="setPhysMode('jelly')">🟢 Jele</button>
        <button class="deform-btn ${o.userData.physMode==='liquid'?'active-mode':''}" onclick="setPhysMode('liquid')">🔵 Suyuqlik</button>
        <button class="deform-btn ${o.userData.physMode==='breakable'?'active-mode':''}" onclick="setPhysMode('breakable')">💥 Sinuvchi</button>
        <button class="deform-btn ${o.userData.physMode==='cloth'?'active-mode':''}" onclick="setPhysMode('cloth')">🟣 Mato</button>
        <button class="deform-btn" onclick="setPhysMode('solid');resetDeform()">↺ Reset</button>
      </div>
      <div class="fr" style="margin-top:5px">
        <span class="fl">🖐 Ushlash mumkin</span>
        <input type="checkbox" ${o.userData.grabbable!==false?'checked':''}
               onchange="setGrabbable(this.checked)" style="cursor:pointer">
      </div>
      <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 0">
        O'yinchi bu jismni qo'l/gravity gun bilan ko'tara oladimi.
        O'chirilsa — fizikasi ishlaydi, lekin ushlab bo'lmaydi
        (dekoratsiya, qurilma qismi, jumboq elementi).
      </div>
    </div>

    ${_pltBlock(o)}

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">DEFORM</span>Shakl o'zgartirish</div>
      <div class="deform-grid">
        <button class="deform-btn" onclick="deformOp('squish')">⬇ Ezish</button>
        <button class="deform-btn" onclick="deformOp('stretch')">↕ Cho'zish</button>
        <button class="deform-btn" onclick="deformOp('twist')">🌀 Burish</button>
        <button class="deform-btn" onclick="deformOp('inflate')">🎈 Shishirish</button>
        <button class="deform-btn" onclick="deformOp('shear')">◱ Qiyshitish</button>
        <button class="deform-btn" onclick="deformOp('break')">💢 Sindirish</button>
      </div>
      <div class="fr" style="margin-top:4px">
        <span class="fl">Kuch</span>
        <input type="range" min="0.1" max="3" step="0.05" value="1" id="deform-str" style="flex:1">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:22px" id="deform-str-v">1.0</span>
      </div>
      <div class="fr" style="margin-top:4px">
        <span class="fl">💢 Parchalar</span>
        <input type="range" min="2" max="80" step="1" value="${window._deformFrags||12}" id="deform-frags" style="flex:1">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:22px" id="deform-frags-v">${window._deformFrags||12}</span>
      </div>
      <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-top:3px">
        Parchalar bitta papkaga solinadi. Papkani surmang — fizika nol nuqtaga tayanadi.
      </div>
    </div>
  `;
  // Live deform strength label
  setTimeout(()=>{
    const ds=$('deform-str');
    if(ds) ds.oninput=function(){if($('deform-str-v'))$('deform-str-v').textContent=parseFloat(this.value).toFixed(1)};
    // 💢 Parchalar soni — tanlov ALMASHGANDA ham eslab qolinadi
    //    (`window._deformFrags`), aks holda inspektor har qayta
    //    chizilganda standartga qaytardi.
    const df=$('deform-frags');
    if(df) df.oninput=function(){
      window._deformFrags = parseInt(this.value,10) || 12;
      if($('deform-frags-v'))$('deform-frags-v').textContent=this.value;
    };
  },0);
}


// ── 📍 SPAWN NUQTASI BLOKI (Roll → o'lim → respawn) ──────────────────
//  Uch xil rejim:
//    • Standart      — checkpoint / spawn obyekti (eski xatti-harakat)
//    • Blok (ierarxiya) — sahnadagi biror blokni tanlab, uning tepasi /
//      oldi / orqasi / yoni / o'rtasidan paydo bo'lish
//    • Koordinata    — qo'lda X / Y / Z kiritish
function _rollSpawnUI(o, dth) {
  const D  = (typeof ObjectRoleSystem !== 'undefined') ? ObjectRoleSystem.defaultSpawn() : {};
  const sp = Object.assign({}, D, (dth && dth.spawn) || {});
  const off  = Object.assign({ x:0, y:0, z:0 }, sp.offset || {});
  const co   = Object.assign({ x:0, y:3, z:0 }, sp.coords || {});
  const mode = sp.mode || 'default';
  const anch = sp.anchor || 'top';

  const IS = "background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";

  // Rejim tugmasi
  const mBtn = (val, ic, label) =>
    `<button onclick="window._rollSpawnMode('${val}')" style="flex:1;text-align:center;
      background:${mode===val?'rgba(var(--accent3-rgb),.14)':'transparent'};
      border:1px solid ${mode===val?'var(--accent3)':'var(--border)'};
      color:${mode===val?'var(--accent3)':'var(--muted)'};
      padding:5px 3px;border-radius:3px;cursor:pointer;
      font-family:'Share Tech Mono',monospace;font-size:9px;line-height:1.3">
      <b>${ic}<br>${label}</b></button>`;

  // Anchor tugmasi
  const aBtn = (val, ic, label) =>
    `<button onclick="window._rollSpawnSet('anchor','${val}')" style="
      background:${anch===val?'rgba(var(--accent3-rgb),.14)':'transparent'};
      border:1px solid ${anch===val?'var(--accent3)':'var(--border)'};
      color:${anch===val?'var(--accent3)':'var(--muted)'};
      padding:5px 2px;border-radius:3px;cursor:pointer;
      font-family:'Share Tech Mono',monospace;font-size:8px;line-height:1.25;
      display:flex;flex-direction:column;align-items:center;gap:1px">
      <span style="font-size:12px">${ic}</span><span>${label}</span></button>`;

  // Ierarxiyadagi bloklar ro'yxati (Tugma → "Yopishtirish Ota-obyekt" kabi)
  const objOpts = objects.filter(x => x !== o && x.userData && x.userData.id != null &&
      !x.userData.isPath && !x.userData.isPathShape && !x.userData._pathGizmo)
    .map(x => `<option value="${x.userData.id}" ${String(sp.objectId)===String(x.userData.id)?'selected':''}>${x.userData.name || ('#'+x.userData.id)}</option>`)
    .join('');

  const num = (grp, ax, val, col) =>
    `<input type="number" step="0.1" value="${val}" style="${IS};width:100%;border-color:${col}44"
       oninput="window._rollSpawnNum('${grp}','${ax}',this.value)">`;

  const tgt = objects.find(x => x.userData && String(x.userData.id) === String(sp.objectId));

  return `
      <div style="border:1px solid rgba(var(--accent3-rgb),.22);border-radius:4px;padding:6px;margin-top:6px;background:rgba(var(--accent3-rgb),.03)">
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent3);letter-spacing:1px;margin-bottom:4px">
          📍 QAYERDAN SPAWN BO'LSIN
        </div>
        <div style="display:flex;gap:4px">
          ${mBtn('default','🏁',"Standart")}
          ${mBtn('object','🧱',"Blok")}
          ${mBtn('coords','🔢',"Koordinata")}
        </div>

        ${mode==='default' ? `
        <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-top:5px">
          Checkpoint bo'lsa — o'sha yerdan, bo'lmasa sahnadagi Player/Spawn obyektidan.
        </div>` : ''}

        ${mode==='object' ? `
        <div class="fr" style="margin-top:5px">
          <span class="fl">Blok</span>
          <select style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px"
            oninput="window._rollSpawnSet('objectId', this.value || null)">
            <option value="">— tanlanmagan —</option>
            ${objOpts}
          </select>
        </div>

        <div style="font-size:8px;color:var(--muted);margin:6px 0 3px">Blokning qaysi tomonidan:</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px">
          ${aBtn('top','⬆',"Tepasi")}
          ${aBtn('front','➡',"Oldi")}
          ${aBtn('back','⬅',"Orqasi")}
          ${aBtn('center','⊙',"O'rtasi")}
          ${aBtn('left','◀',"Chapi")}
          ${aBtn('right','▶',"O'ngi")}
          ${aBtn('bottom','⬇',"Osti")}
        </div>

        <div class="fr" style="margin-top:5px">
          <span class="fl" style="font-size:9px;min-width:34px">Bo'shliq</span>
          <input type="range" min="0" max="3" step="0.05" value="${sp.gap ?? 0.15}" style="flex:1"
            oninput="window._rollSpawnSet('gap',parseFloat(this.value)||0);this.nextElementSibling.textContent=parseFloat(this.value).toFixed(2)+' m'">
          <span style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;min-width:44px;text-align:right">${(sp.gap ?? 0.15).toFixed(2)} m</span>
        </div>

        <div class="fr" style="margin-top:4px">
          <span class="fl" style="font-size:9px;min-width:34px">Yuzi</span>
          <select onchange="window._rollSpawnSet('face',this.value)" style="${IS};flex:1">
            <option value="none" ${sp.face!=='to'&&sp.face!=='away'?'selected':''}>O'zgarmasin</option>
            <option value="to"   ${sp.face==='to'?'selected':''}>Blokka qarasin</option>
            <option value="away" ${sp.face==='away'?'selected':''}>Blokdan teskari</option>
          </select>
        </div>

        <div style="font-size:8px;color:var(--muted);margin:6px 0 2px">Qo'shimcha siljish (X / Y / Z):</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px">
          ${num('offset','x',off.x,'#ff5555')}
          ${num('offset','y',off.y,'#55ff55')}
          ${num('offset','z',off.z,'#5599ff')}
        </div>
        <div style="font-size:8px;color:var(--muted);line-height:1.5;margin-top:4px">
          ${tgt ? `Hozir: <b style="color:var(--accent3)">${(tgt.userData.name||('#'+tgt.userData.id))}</b> blokining
          <b style="color:var(--accent3)">${({top:"tepasi",bottom:"osti",front:"oldi",back:"orqasi",left:"chap tomoni",right:"o'ng tomoni",center:"o'rtasi"})[anch]||anch}</b>dan.`
          : `⚠ Blok tanlanmagan — standart nuqta ishlatiladi.`}
        </div>` : ''}

        ${mode==='coords' ? `
        <div style="font-size:8px;color:var(--muted);margin:6px 0 2px">Koordinata (X / Y / Z):</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px">
          ${num('coords','x',co.x,'#ff5555')}
          ${num('coords','y',co.y,'#55ff55')}
          ${num('coords','z',co.z,'#5599ff')}
        </div>
        <button class="action-btn" style="font-size:9px;margin-top:4px;width:100%"
          onclick="window._rollSpawnHere()">📌 Oyinchining hozirgi joyini olish</button>` : ''}

        <button class="action-btn" style="font-size:9px;margin-top:5px;width:100%;
          background:rgba(var(--accent3-rgb),.07);border-color:rgba(var(--accent3-rgb),.3);color:var(--accent3)"
          onclick="window._rollSpawnPreview()">👁 Spawn nuqtasini ko'rish / sinash</button>
      </div>`;
}

// ── 🛗 PLATFORMA REJIMI BLOKI ────────────────────────────────────────
// Ikki xil ko'rinish:
//   • Oyinchi obyekti  → oyinchining O'Z rejimi (tashqi/ichki)
//   • Boshqa obyekt    → platforma rejimi (ochiq/tashqi/ichki/o'chiq)
function _pltBtn(active, onclick, icon, label, color) {
  return `<button onclick="${onclick}" style="
      background:${active ? color + '26' : 'transparent'};
      border:1px solid ${active ? color : 'var(--border)'};
      color:${active ? color : 'var(--muted)'};
      padding:6px 3px;border-radius:3px;cursor:pointer;
      font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
      display:flex;flex-direction:column;align-items:center;gap:2px">
      <span style="font-size:14px">${icon}</span><span>${label}</span>
    </button>`;
}

function _pltBlock(o) {
  const ud = o.userData || {};

  // ── OYINCHI obyekti — o'z rejimi ──
  if (ud.isPlayerObj) {
    const pm = (ud.platformMode === 'internal' || ud.platformMode === 'off')
             ? ud.platformMode : 'external';
    return `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:var(--accent4);color:#001">PLT</span>Oyinchi Platforma Rejimi
        <span style="font-size:8px;color:var(--muted);margin-left:4px">— 🚫 O'CHIQ platformalar shundan ilhomlanadi</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:4px">
        ${_pltBtn(pm==='off',      "window._setPlayerPlatformMode('off')",      '🚫', "OCHIQ",  '#ffcc00')}
        ${_pltBtn(pm==='external', "window._setPlayerPlatformMode('external')", '📤', 'TASHQI', '#66ccff')}
        ${_pltBtn(pm==='internal', "window._setPlayerPlatformMode('internal')", '📥', 'ICHKI',  '#55ff88')}
      </div>
      <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 7px;background:rgba(0,0,0,.2);border-radius:2px">
        ${pm==='off'
          ? '🚫 <b style="color:#ffcc00">OCHIQ</b> — oyinchi platforma bilan <b>ketmaydi</b>: u joyida turadi, platforma tagidan sirg\'alib o\'tadi. Ikkalasi o\'z harakatida.'
          : pm==='internal'
            ? '📥 <b style="color:#55ff88">ICHKI</b> — 🚫 O\'CHIQ platformalar ustida to\'liq bog\'lanadi, sakrasa ham ketadi.'
            : '📤 <b style="color:#66ccff">TASHQI</b> — 🚫 O\'CHIQ platformalar ustida klassik: sakrasa uziladi.'}
        <br><span style="color:var(--border)">Platformada aniq rejim qo\'yilgan bo\'lsa — <b>platforma yutadi</b>, bu sozlama e\'tiborsiz qoladi.</span>
      </div>
    </div>`;
  }

  // ── PLATFORMA obyekti ──
  // 🚫 O'CHIQ ('off') endi = "qarorni oyinchiga qoldir". Bu standart holat ham.
  const pm = (ud.platformMode === 'external' || ud.platformMode === 'internal')
           ? ud.platformMode : 'off';
  // Hozirgi oyinchining rejimi (OCHIQ uchun oldindan ko'rsatish)
  let plm = 'external';
  try {
    const pl = (typeof objects !== 'undefined') ? objects.find(x => x.userData && x.userData.isPlayerObj) : null;
    if (pl && pl.userData.platformMode === 'internal') plm = 'internal';
    if (pl && pl.userData.platformMode === 'off')      plm = 'none';
  } catch (e) {}
  const eff = (pm === 'off') ? plm : pm;      // O'CHIQ → oyinchidan

  const effTxt = eff === 'none'     ? '🚫 KO\'TARMAYDI — ikkalasi o\'z harakatida'
               : eff === 'internal' ? '📥 ICHKI — to\'liq bog\'lanadi'
               :                      '📤 TASHQI — klassik, sakrasa uziladi';

  return `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:#66ccff;color:#001">PLT</span>Platforma Rejimi
        <span style="font-size:8px;color:var(--muted);margin-left:4px">— Oyinchi ustida turganda</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:4px">
        ${_pltBtn(pm==='off',      "window._setPlatformMode('off')",      '🚫', "O'CHIQ",  '#ffcc00')}
        ${_pltBtn(pm==='external', "window._setPlatformMode('external')", '📤', 'TASHQI',  '#66ccff')}
        ${_pltBtn(pm==='internal', "window._setPlatformMode('internal')", '📥', 'ICHKI',   '#55ff88')}
      </div>
      <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 7px;background:rgba(0,0,0,.2);border-radius:2px">
        ${pm === 'off'
          ? '🚫 <b style="color:#ffcc00">O\'CHIQ</b> — platformada aniq rejim yo\'q. Qaror <b>oyinchiga</b> qoldiriladi: oyinchi qanday bo\'lsa, platforma shunday ishlaydi.'
          : pm === 'internal'
              ? '📥 <b style="color:#55ff88">ICHKI</b> — oyinchi to\'liq bog\'lanadi. Oyinchi tashqi bo\'lsa ham — <b>platforma yutadi</b> 😈'
              : '📤 <b style="color:#66ccff">TASHQI</b> — klassik moving platform. Oyinchi ichki bo\'lsa ham — <b>platforma yutadi</b> 😈'}
      </div>
      <div style="font-size:8px;margin-top:4px;padding:4px 7px;border-radius:2px;
                  background:${pm==='off'?'rgba(255,204,0,.07)':'rgba(255,255,255,.02)'};
                  border:1px solid ${pm==='off'?'rgba(255,204,0,.25)':'var(--border)'};
                  color:var(--muted);font-family:'Share Tech Mono',monospace">
        ⚡ Hozirgi natija: <b style="color:var(--text)">${effTxt}</b>
        ${pm==='off' ? `<br><span style="color:var(--border)">(oyinchi hozir <b>${plm==='internal'?'📥 ICHKI':'📤 TASHQI'}</b>)</span>` : ''}
      </div>
    </div>`;
}

window.getSelectedPb = function() {
  if (!selectedObj) return null;
  return physBodies.find(b=>b.mesh===selectedObj)||null;
};

window._renameObj = function(name) {
  if (!selectedObj || !name.trim()) return;
  selectedObj.userData.name = name;
  // Update timeline track name too
  const id = selectedObj.userData.id;
  if (window.tlTracks && tlTracks[id]) tlTracks[id].name = name;
  updateHierarchy();
};

// ── Platform rejimini o'zgartirish (oyinchi ustida turganda xatti-harakati) ──
// ── 🎮 Oyinchining o'z platforma rejimi ──────────────────────
// 🚫 O'CHIQ platformalar aynan shundan ilhomlanadi.
window._setPlayerPlatformMode = function(mode) {
  if (!selectedObj) return;
  selectedObj.userData.platformMode = mode;
  if (window.PlayerController) {
    PlayerController._groundObj      = null;
    PlayerController._groundLastPos  = null;
    PlayerController._groundLastQuat = null;
    PlayerController._groundVel      = null;
  }
  log(`🎮 Oyinchi platforma rejimi: ${
    mode === 'off' ? "🚫 OCHIQ — platforma ko'tarmaydi"
    : mode === 'internal' ? '📥 ICHKI' : '📤 TASHQI'}`, 'lok');
  updateInspector();
};

window._setPlatformMode = function(mode) {
  if (!selectedObj) return;
  selectedObj.userData.platformMode = mode;
  // Agar hozir oyinchi shu obyekt ustida turgan bo'lsa — bog'lanishni tozalash
  if (window.PlayerController && PlayerController._groundObj === selectedObj) {
    PlayerController._groundObj      = null;
    PlayerController._groundLastPos  = null;
    PlayerController._groundLastQuat = null;
    PlayerController._groundVel      = null;
  }
  const lbl = mode === 'off' ? "🚫 O'CHIQ (oyinchidan)" : mode === 'internal' ? '📥 ICHKI' : '📤 TASHQI';
  log(`🛗 "${selectedObj.userData.name}" platforma: ${lbl}`, 'lok');
  updateInspector();
};

window.applyT = function() {
  if (!selectedObj) return;
  const o = selectedObj;
  o.position.set(parseFloat($('px')?.value)||0, parseFloat($('py')?.value)||0, parseFloat($('pz')?.value)||0);
  const D2R = Math.PI/180;
  if ($('rx')) o.rotation.set(
    (parseFloat($('rx').value)||0)*D2R,
    (parseFloat($('ry').value)||0)*D2R,
    (parseFloat($('rz').value)||0)*D2R
  );
  o.scale.set(parseFloat($('sx')?.value)||1, parseFloat($('sy')?.value)||1, parseFloat($('sz')?.value)||1);
  if (outlineMesh) { outlineMesh.position.copy(o.position); outlineMesh.rotation.copy(o.rotation); outlineMesh.scale.copy(o.scale).multiplyScalar(1.07); }
};

window.applyM = function() {
  if (!selectedObj && !multiSelected.size) return;
  const c=$('mc')?.value, r=$('mr')?.value, m=$('mm')?.value;
  const em=$('mem')?.value, emi=$('memi')?.value;
  const op=$('mop')?.value;
  const opf = op!=null ? parseFloat(op) : null;

  const applyToMat = mat => {
    if (!mat) return;
    if(c) mat.color?.set(c);
    if(r) mat.roughness=parseFloat(r);
    if(m) mat.metalness=parseFloat(m);
    if(em && mat.emissive) mat.emissive.set(em);
    if(emi) mat.emissiveIntensity=parseFloat(emi);
    if(opf!=null) {
      mat.opacity=opf;
      mat.transparent=opf<0.999;
      mat.depthWrite=opf>0.5;
      mat.needsUpdate=true;
    }
  };

  const applyToObj = obj => {
    // Per-face mode: obj.material is an array — apply to every slot
    if (Array.isArray(obj.material)) obj.material.forEach(applyToMat);
    else applyToMat(obj.material);
    obj.traverse(ch=>{
      if(ch!==obj && ch.isMesh && ch.material) {
        if(Array.isArray(ch.material)) ch.material.forEach(applyToMat);
        else applyToMat(ch.material);
      }
    });
  };

  // Agar multi-select yoki group/pack tanlangan bo'lsa — hammasiga qo'lla
  const targets = multiSelected.size > 0
    ? [...multiSelected]
    : [selectedObj];

  targets.forEach(obj => {
    applyToObj(obj);
    // Agar group/pack (papka) bo'lsa — barcha child objectlarga ham
    if (obj.userData.isGroup || obj.userData._isFolder || obj.isGroup) {
      obj.traverse(ch => { if(ch !== obj && (ch.isMesh||ch.isGroup)) applyToObj(ch); });
    }
  });

  if(opf!=null) {
    const v=$('mop-v'); if(v) v.textContent=opf.toFixed(2);
  }
  // roughness/metalness label yangilash
  const mrv=$('mr-v'); if(mrv&&$('mr')) mrv.textContent=parseFloat($('mr').value).toFixed(2);
  const mmv=$('mm-v'); if(mmv&&$('mm')) mmv.textContent=parseFloat($('mm').value).toFixed(2);
};

// ── PBR Texture Map loader ──────────────────────────────────────
window._pbrLoadMap = function(slot) {
  const obj = selectedObj; if(!obj) return;
  let mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
  if(!mat) obj.traverse(ch=>{ if(!mat&&ch.isMesh&&ch.material) mat=Array.isArray(ch.material)?ch.material[0]:ch.material; });
  if(!mat) return;
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if(!f) return;
    // ── ⚠ BAYTLARNI `userData` GA SAQLAYMIZ ──────────────────────
    //  Ilgari bu yerda faqat `URL.createObjectURL(f)` ishlatilardi.
    //  `blob:` havolasi FAQAT joriy sahifa hayoti davomida yashaydi:
    //  sahifa yangilansa u o'lik havolaga aylanadi. Va baytlar hech
    //  qayerda saqlanmagani uchun PBR xaritalari sahna qayta
    //  ochilganda BUTUNLAY yo'qolardi — konsolda ogohlantirishsiz.
    //
    //  Endi ular `ud.pbrMaps` ga `data:` ko'rinishida yoziladi.
    //  `AssetBundle` `data:` qiymatlarini o'zi tanib `texture/`
    //  papkasiga chiqaradi — ya'ni JSON shishmaydi va save-load ga
    //  alohida shox qo'shish ham shart emas.
    const fr = new FileReader();
    fr.onload = () => {
      const url = String(fr.result || '');
      if (!obj.userData.pbrMaps) obj.userData.pbrMaps = {};
      obj.userData.pbrMaps[slot] = url;
      _pbrApplyMap(obj, mat, slot, url);
      log(`🗺 ${slot}: ${f.name} → ${obj.userData.name}`, 'lok');
      updateInspector();
    };
    fr.onerror = () => log(`❌ ${f.name} o'qilmadi`, 'le');
    fr.readAsDataURL(f);
  };
  inp.click();
};

/**
 * 🗺 Bitta PBR xaritasini materialga qo'llaydi.
 * ⚠ Ajratilgan sabab: uni IKKI joy chaqiradi — foydalanuvchi fayl
 *   tanlaganda va sahna YUKLANGANDA (`PBRMaps.syncAll`). Ikkalasi
 *   bir xil natija berishi shart.
 */
window._pbrApplyMap = function(obj, mat, slot, url) {
  if (!mat || !url) return;
  new THREE.TextureLoader().load(url, tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    // Mavjud map repeat/offset ni saqlab qo'yamiz
    if(mat.map) { tex.repeat.copy(mat.map.repeat); tex.offset.copy(mat.map.offset); tex.rotation=mat.map.rotation; }
    if(slot==='map')          { mat.map=tex; mat.needsUpdate=true; }
    else if(slot==='normalMap')    { mat.normalMap=tex; mat.normalScale=mat.normalScale||new THREE.Vector2(1,1); mat.needsUpdate=true; }
    else if(slot==='roughnessMap') { mat.roughnessMap=tex; mat.needsUpdate=true; }
    else if(slot==='metalnessMap') { mat.metalnessMap=tex; mat.needsUpdate=true; }
    else if(slot==='aoMap')        { mat.aoMap=tex; mat.aoMapIntensity=mat.aoMapIntensity??1; mat.needsUpdate=true;
      // aoMap uchun uv2 kerak
      if(obj.geometry&&!obj.geometry.attributes.uv2) obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
    }
    else if(slot==='emissiveMap')  { mat.emissiveMap=tex; if(!mat.emissive||mat.emissive.r+mat.emissive.g+mat.emissive.b===0) mat.emissive=new THREE.Color(0xffffff); mat.emissiveIntensity=mat.emissiveIntensity||1; mat.needsUpdate=true; }
    if (typeof TextureLoopSystem !== 'undefined' && TextureLoopSystem.isEnabled(obj)) {
      TextureLoopSystem.refresh(obj);
    }
  });
};

// ============================================================
//  🗺 PBRMaps — sahna yuklangandan keyin xaritalarni QAYTA qo'yadi
//
//  ⚠ NEGA POLLING: obyekt sahnaga to'rt yo'l bilan tushadi
//    (`loadScene`, 📦 prefab, 🗺 Map Loader, 🧩 addon). Har biriga
//    alohida chaqiruv qo'shsak, beshinchisi qo'shilganda esdan
//    chiqardi — bu loyihada takrorlangan xato. ◈ `PivotSystem` va
//    🔨 `DeformSystem` aynan shu sababdan xuddi shunday ishlaydi.
//
//  ⚠ Arzon: `_pbrDone` bilan qo'riqlangani uchun odatdagi kadrda
//    hech qanday ish bajarilmaydi.
// ============================================================
window.PBRMaps = (() => {
  'use strict';
  const _objs = () => (typeof objects !== 'undefined' ? objects : []);

  function _matOf(o) {
    let m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m && o.traverse) o.traverse(ch => {
      if (!m && ch.isMesh && ch.material) m = Array.isArray(ch.material) ? ch.material[0] : ch.material;
    });
    return m;
  }

  /** @returns {number} nechta obyektga qo'llandi */
  function syncAll() {
    let n = 0;
    for (const o of _objs()) {
      const ud = o && o.userData;
      if (!ud || !ud.pbrMaps) continue;
      const keys = Object.keys(ud.pbrMaps).filter(k => ud.pbrMaps[k]);
      if (!keys.length) continue;
      if (ud._pbrDone === keys.length) continue;
      const mat = _matOf(o);
      if (!mat) continue;
      for (const k of keys) {
        try { window._pbrApplyMap(o, mat, k, ud.pbrMaps[k]); } catch (e) {}
      }
      ud._pbrDone = keys.length;
      n++;
    }
    return n;
  }

  let _t = 0;
  function update(delta) {
    _t += (delta || 0.016);
    if (_t < 0.5) return;
    _t = 0;
    syncAll();
  }

  return { syncAll, update };
})();

window._pbrRemoveMap = function(slot) {
  // ⚠ Saqlangan baytlarni ham o'chiramiz, aks holda keyingi
  //   yuklashda `PBRMaps.syncAll()` xaritani QAYTA qo'yardi.
  const _o = selectedObj;
  if (_o && _o.userData && _o.userData.pbrMaps) {
    delete _o.userData.pbrMaps[slot];
    _o.userData._pbrDone = undefined;
  }
  const obj = selectedObj; if(!obj) return;
  let mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
  if(!mat) obj.traverse(ch=>{ if(!mat&&ch.isMesh&&ch.material) mat=Array.isArray(ch.material)?ch.material[0]:ch.material; });
  if(!mat) return;
  if(mat[slot]) { mat[slot].dispose(); mat[slot]=null; mat.needsUpdate=true; }
  log(`🗑 ${slot} o'chirildi`, 'lok');
  updateInspector();
};

window._pbrSetUV = function(prop, val) {
  const obj = selectedObj; if(!obj) return;
  let mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
  if(!mat) obj.traverse(ch=>{ if(!mat&&ch.isMesh&&ch.material) mat=Array.isArray(ch.material)?ch.material[0]:ch.material; });
  if(!mat) return;
  const slots = ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'];
  if(prop==='reset') {
    slots.forEach(s=>{ if(mat[s]) { mat[s].repeat.set(1,1); mat[s].offset.set(0,0); mat[s].rotation=0; mat[s].needsUpdate=true; } });
    updateInspector(); return;
  }
  slots.forEach(s=>{ if(!mat[s]) return;
    if(prop==='repeatX') mat[s].repeat.x=val;
    else if(prop==='repeatY') mat[s].repeat.y=val;
    else if(prop==='offsetX') mat[s].offset.x=val;
    else if(prop==='offsetY') mat[s].offset.y=val;
    else if(prop==='rotation') mat[s].rotation=val;
    mat[s].needsUpdate=true;
  });
};

window.applyTransparency = function(opacity) {
  if(!selectedObj) return;
  const el = $('mop'); if(el) el.value=opacity;
  const vl = $('mop-v'); if(vl) vl.textContent=opacity.toFixed(2);
  const applyToMat = mat=>{
    if(!mat) return;
    mat.opacity=opacity;
    mat.transparent=opacity<0.999;
    mat.depthWrite=opacity>0.5;
    mat.needsUpdate=true;
  };
  if(Array.isArray(selectedObj.material)) selectedObj.material.forEach(applyToMat);
  else applyToMat(selectedObj.material);
  selectedObj.traverse(ch=>{
    if(ch!==selectedObj && ch.isMesh){
      if(Array.isArray(ch.material)) ch.material.forEach(applyToMat);
      else applyToMat(ch.material);
    }
  });
  log(`👁 Shaffoflik: ${opacity===0?'Ko\'rinmas':opacity===1?'Solid':(opacity*100|0)+'%'}`, 'lok');
};

window.applyTexPreset = function(i) {
  if (!selectedObj?.material) return;
  const t = TEXTURES[i];
  const applyPreset = m => {
    if (!m) return;
    if (m.color) m.color.set(t.col);
    if ('roughness' in m) m.roughness = t.rough;
    if ('metalness' in m) m.metalness = t.metal;
  };
  if (Array.isArray(selectedObj.material)) selectedObj.material.forEach(applyPreset);
  else applyPreset(selectedObj.material);
  selectedObj.userData.texName = t.name;
  captureState('Tekstura preset');
  updateInspector();
  log(`🎨 Tekstura: ${t.name}`, 'lok');
};

// ── MODEL REPLACE — entity ning standart shakli o'rniga GLB qo'yish ──
// ============================================================
//  ⚖️ _comBlock — og'irlik markazi bo'limi (Fizika ichida)
//
//  ⚠ Faqat fizikasi BOR va dinamik obyekt uchun ko'rinadi — statik
//    jismda og'irlik markazining ma'nosi yo'q (u qimirlamaydi).
// ============================================================
function _comBlock(o) {
  if (!o || !window.CenterOfMass) return '';
  const on = CenterOfMass.isOn(o);
  const c  = o.userData.com || { x: 0, y: 0, z: 0 };
  const nm = 'style="width:44px;background:var(--bg);border:1px solid var(--border);color:var(--text);' +
             'font-family:\'Share Tech Mono\',monospace;font-size:9px;padding:2px 3px;border-radius:2px;outline:none"';

  if (!on) {
    return `<div class="fr" style="margin-top:3px">
      <span class="fl">⚖ Og'irlik markazi</span>
      <button onclick="window._comToggle()" style="flex:1;font-size:9px;padding:3px;
        background:rgba(255,204,0,.08);border:1px solid rgba(255,204,0,.35);color:#ffcc00;
        border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">+ Yoqish</button>
    </div>`;
  }

  const r = CenterOfMass.combined(o);
  return `<div style="border:1px solid rgba(255,204,0,.25);border-radius:3px;padding:4px;margin:4px 0;
                      background:rgba(255,204,0,.04)">
    <div class="fr" style="margin:0 0 3px">
      <span class="fl" style="color:#ffcc00">⚖ Og'irlik markazi</span>
      <button onclick="window._comToggle()" style="font-size:9px;padding:2px 6px;background:none;
        border:1px solid var(--border);color:var(--muted);border-radius:2px;cursor:pointer">O'chirish</button>
    </div>
    <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:0 0 4px">
      Sahnadagi <b style="color:#ffcc00">sariq kubcha</b>ni gizmo bilan suring.
      O'ngga sursangiz — o'ng tomoni og'irlashadi va chekkada qiyalab tushadi.
      ▶ O'YNA da kubcha ko'rinmaydi.
    </div>
    <div class="fr" style="gap:3px">
      <span class="fl">Siljish</span>
      <input ${nm} value="${c.x.toFixed(2)}" oninput="window._comSet('x',this.value)">
      <input ${nm} value="${c.y.toFixed(2)}" oninput="window._comSet('y',this.value)">
      <input ${nm} value="${c.z.toFixed(2)}" oninput="window._comSet('z',this.value)">
      <button onclick="window._comReset()" title="Markazga qaytarish"
        style="font-size:9px;padding:2px 5px;background:none;border:1px solid var(--border);
               color:var(--muted);border-radius:2px;cursor:pointer">⌖</button>
    </div>
    ${r.extra ? `<div style="font-size:9px;color:var(--accent3);padding:3px 0 0;font-family:'Share Tech Mono',monospace">
      📦 ${r.extra} ta yuk · umumiy massa ${r.mass.toFixed(1)} ·
      markaz (${r.com.x.toFixed(2)}, ${r.com.y.toFixed(2)}, ${r.com.z.toFixed(2)})
    </div>` : ''}
  </div>`;
}

window.replaceWithGLB = function(deep) {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  const target = selectedObj;

  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.glb,.gltf';
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const name = file.name.replace(/\.(glb|gltf)$/i, '');

    // GLTFLoader
    if (!THREE.GLTFLoader) { log('❌ GLTFLoader yuklanmadi', 'le'); return; }
    const loader = getGLTFLoader();
    log('📦 Model yuklanmoqda: ' + name, 'lw');

    // ⚠ ASL BAYTLAR SAQLANADI. Ilgari bu yerda `URL.createObjectURL(file)`
    //   va `loader.load(url)` ishlatilardi, oxirida esa
    //   `URL.revokeObjectURL(url)` — ya'ni fayl baytlari BUTUNLAY
    //   tashlanardi. Natijada kubga berilgan model saqlashda hech qayerga
    //   yozilmasdi va sahna qayta ochilganda YO'Q bo'lardi.
    //
    //   (Aynan shu xato `soundLoadFile` da ham bor edi — mp3 dekod
    //    qilinib, xom baytlar tashlanardi.)
    const _fr = new FileReader();
    _fr.onerror = () => log('❌ Fayl o\'qilmadi', 'le');
    _fr.onload = _ev => {
      const _ab = _ev.target.result;
      loader.parse(_ab, '', gltf => {
      const modelScene = gltf.scene;

      // ── Auto scale ──
      const box = new THREE.Box3().setFromObject(modelScene);
      const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
      const entityType = target.userData.entityType;
      const targetSize = entityType==='car'?3.5:entityType==='animal'?1.2:(entityType==='npc'||entityType==='player')?1.8:2;
      if (maxDim > 0.01) modelScene.scale.setScalar(targetSize / maxDim);

      // ── Eski children olib tashla ──
      [...target.children].forEach(ch => target.remove(ch));
      if (target.material) { target.material.visible=false; target.material.needsUpdate=true; }

      // ── Shadow + raycast off ──
      modelScene.name = '__glb_model__';
      let hasBones = false;
      modelScene.traverse(ch => {
        if (ch.isMesh || ch.isSkinnedMesh) {
          ch.castShadow=true; ch.receiveShadow=true; ch.raycast=()=>{};
        }
        if (ch.isSkinnedMesh) hasBones = true;
      });
      target.add(modelScene);

      // ── 🔍 CHUQUR IMPORT — har bir qismni IERARXIYA'ga chiqaramiz ──
      //    Sub-mesh'larga id/nom/parentId beriladi → hierarxiyaда ochiladi,
      //    tanlanadi, nomlanadi, animatsiya yozish mumkin.
      if (deep) {
        let count = 0; const MAXP = 250;
        modelScene.userData = modelScene.userData || {};
        modelScene.userData.id = ++objIdC;
        modelScene.userData.name = name + ' (model)';
        modelScene.userData.parentId = target.userData.id;
        modelScene.userData._glbPart = true;
        modelScene.userData.colliderMode = 'inline';
        if (typeof objects !== 'undefined') objects.push(modelScene);
        modelScene.traverse(node => {
          if (node === modelScene || count >= MAXP) return;
          if (!(node.isMesh || node.isGroup || node.isObject3D)) return;
          node.userData = node.userData || {};
          if (node.userData.id) return;
          node.userData.id = ++objIdC;
          node.userData.name = node.name || ((node.isMesh ? 'Mesh' : 'Grup') + ' ' + node.userData.id);
          node.userData._glbPart = true;
          node.userData.colliderMode = 'inline';
          const par = node.parent;
          node.userData.parentId = (par && par.userData && par.userData.id) ? par.userData.id : modelScene.userData.id;
          if (node.isMesh) node.raycast = THREE.Mesh.prototype.raycast;   // tanlanadigan qilamiz
          if (typeof objects !== 'undefined') objects.push(node);
          count++;
        });
        if (count >= MAXP) log(`⚠ Model juda katta — ${MAXP} qism ko'rsatildi (qolgani birlashtirilди)`, 'lw');
        log(`🔍 Chuqur import: ${count} qism IERARXIYA'ga chiqarildi`, 'lok');
        if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
      }

      // ── Skeleton helper ──
      if (hasBones) {
        // Eski skeleton helper olib tashla
        const oldSkel = target.getObjectByName('__skel_helper__');
        if (oldSkel) target.remove(oldSkel);
        const skelHelper = new THREE.SkeletonHelper(modelScene);
        skelHelper.name = '__skel_helper__';
        skelHelper.visible = false;
        target.add(skelHelper);
        target.userData._skelHelper = skelHelper;
      }

      // ── AnimationMixer — BARCHA animatsiyalar ──
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(modelScene);
        const clips  = gltf.animations;
        // 🏷 Eksport dasturi klipga o'z REKLAMASINI yozadi ("mixamo.com",
        //    "Take 001"). Model nomiga almashtiramiz — klip nomi faqat
        //    yorliq, mixer treklar bo'yicha bog'lanadi.
        if (window.cleanClipName)
          clips.forEach((c, i) => { c.name = window.cleanClipName(c.name, name, i); });
        const actions = clips.map(clip => {
          const a = mixer.clipAction(clip);
          a.loop = THREE.LoopRepeat;
          return a;
        });

        // Birinchi animatsiyani o'ynash
        actions[0].play();
        target.userData._mixer    = mixer;
        target.userData._clips    = clips;
        target.userData._actions  = actions;
        target.userData._activeAnim = 0;

        log(`🎬 ${clips.length} ta animatsiya: ${clips.map(c=>c.name).join(', ')}`, 'lok');

        // Agar bir nechta animatsiya bo'lsa — tanlash paneli
        if (clips.length > 1) showAnimSelectPanel(target);
      }

      target.userData._hasGLB  = true;
      target.userData._glbName = name;

      // ⚠ SAQLANADIGAN BELGILAR (`_` SIZ — `_slCleanUD` ularni tashlamaydi):
      //   `attachedGLB` — kubga model berilganini bildiradi va yuklashda
      //   modelni qayta biriktirish uchun ishlatiladi.
      //   `_glbBuffer` — xom baytlar; saqlovchi ularni `models/` ga yozadi
      //   (JSON ga tushmaydi, `_SL_RUNTIME` uni chiqarib tashlaydi).
      target.userData.attachedGLB = name;
      target.userData._glbBuffer  = _ab;
      // Asos materiali yashiringani ham saqlanishi kerak — aks holda
      // yuklashda model ustidan kubning yuzi ko'rinib turardi.
      target.userData.attachedGLBHidesBase = true;

      log(`✅ ${name} yuklandi (${Math.round(_ab.byteLength/1024)} KB — sahnaga yoziladi)`, 'lok');
      showModelOrientPanel(target);
      if (typeof updateHierarchy === 'function') updateHierarchy();
      if (typeof captureState === 'function') captureState('Model: ' + name);
      updateInspector();

      }, err => {
        log('❌ Model o\'qilmadi: ' + (err && err.message ? err.message : err), 'le');
      });
    };
    _fr.readAsArrayBuffer(file);
  };
  inp.click();
};


window.uploadTexture = function() {
  if (!selectedObj?.material) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result; // data:image/...;base64,...
      const url = URL.createObjectURL(file);
      const tex = new THREE.TextureLoader().load(url, () => {
        // Per-face rejim yoqilgan bo'lsa — avval uni o'chirib, bitta
        // materialga qaytamiz (chunki "hamma yeriga" degani yagona texture)
        if (Array.isArray(selectedObj.material) &&
            typeof PerFaceTextures !== 'undefined' &&
            selectedObj.userData.perFace && selectedObj.userData.perFace.enabled) {
          PerFaceTextures.disable(selectedObj);
        }
        if (Array.isArray(selectedObj.material)) {
          selectedObj.material.forEach(m => { m.map = tex; m.needsUpdate = true; });
        } else {
          selectedObj.material.map = tex;
          selectedObj.material.needsUpdate = true;
        }
        // Texture ma'lumotini saqlash (ZIP export uchun)
        selectedObj.userData.textureBase64 = base64;
        selectedObj.userData.textureName = file.name;
        // Textura Loop yoqilgan bo'lsa — yangi teksturani darhol tile qilamiz
        if (typeof TextureLoopSystem !== 'undefined' && TextureLoopSystem.isEnabled(selectedObj)) {
          TextureLoopSystem.refresh(selectedObj);
        }
        log(`🖼 Tekstura: ${file.name}`, 'lok');
        updateInspector();
      });
    };
    reader.readAsDataURL(file);
  };
  inp.click();
};

window.launchObj = function() {
  const pb = physBodies.find(b=>b.mesh===selectedObj);
  if (!pb) return;
  pb.vel.set((Math.random()-.5)*8, 6+Math.random()*4, (Math.random()-.5)*8);
  pb.angVel.set((Math.random()-.5)*3,(Math.random()-.5)*3,(Math.random()-.5)*3);
  // Jelly bounce trigger
  if (selectedObj.userData.physMode==='jelly') {
    const jd = jellyObjects.get(selectedObj);
    if (jd) jd.amp = 0.35;
  }
  playImpactSound(0.8);
  log(`🚀 ${selectedObj.userData.name} uloqtirildi!`, 'lok');
};

window.duplicateSel = function() {
  if (!selectedObj) return;
  const clone = selectedObj.clone();
  clone.position.x += 1.5;
  clone.userData = {...selectedObj.userData, id:++objIdC, name:getCloneName(selectedObj.userData.name)};
  scene.add(clone);
  objects.push(clone);
  addPhysicsBody(clone, {radius:0.5});
  selectObject(clone);
  updateHierarchy();
  updateStats();
  // ⚠ Ilgari bu yerda `captureState` YO'Q edi — nusxa Ctrl+Z bilan
  //   yo'qolmasdi (tarix nusxadan oldingi holatni umuman bilmasdi).
  if (typeof captureState === 'function') captureState(`Nusxalandi: ${clone.userData.name}`);
  log(`Nusxalandi: ${clone.userData.name}`, 'lok');
};

window.deleteSel = function() {
  // ⚠ ILGARI: `selectedObj.userData.isStatic` — ya'ni fizikasi
  //   o'chirilgan HAR QANDAY obyektni o'chirib bo'lmasdi. Niyat
  //   ZAMINNI himoya qilish edi, lekin shart hammasini qamrardi:
  //   statik devor, platforma, dekoratsiya — hech biri o'chmasdi.
  //   Ustiga, fizikasi yo'q obyektda "Aktiv" tugmasi ham yo'q edi,
  //   ya'ni statiklikni bekor qilib ham bo'lmasdi — obyekt sahnada
  //   MANGU qolib ketardi.
  if (!selectedObj) return;
  if (_isGroundObj(selectedObj)) { log('🌍 Zamin o\'chirilmaydi', 'lw'); return; }
  const name = selectedObj.userData.name;
  const o = selectedObj;
  // Cleanup special physics
  if (jellyObjects.has(o)) jellyObjects.delete(o);
  if (liquidObjects.has(o)) { liquidObjects.get(o)?.drops?.forEach(d=>scene.remove(d.mesh)); liquidObjects.delete(o); }
  if (clothObjects.has(o)) clothObjects.delete(o);
  // ── ⚠ BOLALAR ──────────────────────────────────────────────
  //  Ilgari faqat `o` ning o'zi `objects[]` dan chiqarilardi. Bolalari
  //  sahnadan ketardi (ota bilan birga), lekin `objects[]` da QOLIB
  //  ketardi — main-loop ularni har kadr aylanaverardi, updateStats
  //  ularni sanardi, ierarxiya ularni ko'rsatishga urinardi. Ya'ni
  //  boshqarib bo'lmaydigan "arvoh" obyektlar.
  const _doomed = [o];
  o.traverse(n => { if (n !== o && n.userData && n.userData.id != null) _doomed.push(n); });

  // Remove from scene (and its children follow)
  const parent = o.parent;
  if (parent) parent.remove(o); else scene.remove(o);

  for (const d of _doomed) {
    const pi = physBodies.findIndex(b => b.mesh === d);
    if (pi > -1) physBodies.splice(pi, 1);
    const oi = objects.indexOf(d);
    if (oi > -1) objects.splice(oi, 1);
    if (jellyObjects.has(d))  jellyObjects.delete(d);
    if (clothObjects.has(d))  clothObjects.delete(d);
    if (liquidObjects.has(d)) liquidObjects.delete(d);
  }

  // ── ♻️ Dispose ─────────────────────────────────────────────
  //  ⚠ TUZATILDI: ilgari bu yerda KO'R-KO'RONA dispose turardi —
  //    har bir geometriya/material shartsiz bo'shatilardi. Lekin
  //    `obj.clone()` (Ctrl+D nusxalash) material va geometriya
  //    havolasini ULASHADI. Natijada nusxani o'chirsangiz, ASLINI
  //    ham buzardi (material GPU dan ketardi).
  //    Endi disposeMany sahnada qolganlarni tekshiradi va faqat
  //    hech kim ishlatmayotgan resursni bo'shatadi.
  //    ⚠ scene.remove() dan KEYIN chaqirilishi shart — yuqorida shunday.
  if (typeof disposeMany === 'function') disposeMany([o]);

  if (outlineMesh) { scene.remove(outlineMesh); outlineMesh=null; }
  selectedObj=null;
  // ⚠ Sahna o'zgardi — soya qayta hisoblansin (addObject da bor edi,
  //   deleteSel da yo'q edi: o'chirilgan obyektning soyasi qolib ketardi).
  if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
  updateHierarchy(); updateInspector(); updateStats();
  captureState(`O'chirildi: ${name}`);
  log(`O'chirildi: ${name}`, 'lw');
};

// ── Animatsiya tanlash paneli (bir nechta anim bo'lsa) ──

// ── 🖐 Ushlash mumkinmi ───────────────────────────────────────
//  ⚠ `userData` da turadi, ya'ni saqlashda `ud` orqali AVTOMATIK
//    yoziladi — save-load.js ga oq ro'yxat qo'shish shart emas.
//    `undefined` = ruxsat (eski sahnalar xulqi o'zgarmaydi), faqat
//    aniq `false` taqiqlaydi.
/**
 * 🌍 Dvigatelning O'Z zaminimi? (o'chirishdan himoyalangan yagona obyekt)
 * `save-load.js` dagi `_slIsGround` bilan bir xil mantiq.
 */
window._isGroundObj = function(o) {
  const u = o && o.userData;
  return !!(u && (u.isGround === true ||
    (u.type === 'Tekislik' && (u.name === 'Zamin' || u.name == null))));
};

window.setGrabbable = function(v) {
  if (!selectedObj) return;
  if (v) delete selectedObj.userData.grabbable;   // standartga qaytaramiz
  else   selectedObj.userData.grabbable = false;
  if (typeof captureState === 'function') captureState('Ushlash: ' + (v ? 'yoqildi' : "o'chirildi"));
  if (typeof log === 'function') log(`🖐 ${selectedObj.userData.name}: ushlash ${v ? 'yoqildi' : "o'chirildi"}`, 'lok');
};

// ── ⚡ Fizika tanasini QO'SHISH ───────────────────────────────
//  ⚠ NEGA KERAK: "Aktiv" tugmasi faqat tanasi BOR obyektда ko'rinardi.
//    Tanasi yo'q obyektда fizikani yoqishning YO'LI yo'q edi — va
//    o'chirish ham `isStatic` bilan bloklangani uchun obyekt sahnada
//    mangu qolib ketardi.
//
//  ⚠ Tugma faqat `physicsOptsFor(o)` NULL EMAS bo'lganда ko'rsatiladi:
//    🔘 tugma, 💻 PC, 🎯 hitbox, 📁 papka, 🛤 yo'l kabi funksional
//    bloklar tanaga ega bo'lmasligi KERAK — ular `SceneTypes` da
//    `physics: null` bilan turibdi.
/**
 * 🧊 Kollayder shaklini tanlash (bir yoki bir nechta obyektga).
 *
 * ⚠ Qiymat `userData.colShape` ga yoziladi — `_` SIZ, ya'ni sahna
 *   bilan SAQLANADI. Runtime `physBodies` yozuvi saqlanmaydi, shuning
 *   uchun tanlovni faqat unga qo'ysak, sahna qayta ochilganda
 *   jimgina "Avto" ga qaytardi.
 *
 * ⚠ Tana DARHOL qayta quriladi: kollayder faqat yaratilganda
 *   o'rnatiladi, aks holda tanlov ▶ Play gacha ta'sir qilmasdi va
 *   "ishlamayapti" bo'lib ko'rinardi.
 */
window.setColliderShapeSel = function(v) {
  const apply = (obj) => {
    if (!obj) return;
    if (v === 'auto') delete obj.userData.colShape;
    else obj.userData.colShape = v;
    const b = (typeof physBodies !== 'undefined')
      ? physBodies.find(x => x.mesh === obj) : null;
    if (b) b.shape = 'auto';        // ⚠ `userData` ustun tursin
    if (typeof rebuildRapierBody === 'function') rebuildRapierBody(obj);
  };
  if (typeof multiSelected !== 'undefined' && multiSelected.size > 0) {
    multiSelected.forEach(apply);
    log(`🧊 ${multiSelected.size} ta obyekt kollayderi: ${v}`, 'lok');
  } else {
    apply(selectedObj);
  }
  updateInspector();
};

window.addPhysicsToSel = function() {
  const o = selectedObj;
  if (!o) return;
  if (typeof physBodies !== 'undefined' && physBodies.find(b => b.mesh === o)) {
    log('⚠ Bu obyektda fizika tanasi allaqachon bor', 'lw');
    return;
  }
  const opts = (typeof physicsOptsFor === 'function') ? physicsOptsFor(o) : {};
  if (!opts) { log('⚠ Bu turdagi obyektga fizika berilmaydi', 'lw'); return; }
  try {
    addPhysicsBody(o, opts);
    if (typeof rebuildRapierBody === 'function') rebuildRapierBody(o);
    if (typeof captureState === 'function') captureState('Fizika yoqildi');
    log(`⚡ "${o.userData.name}" — fizika tanasi qo'shildi`, 'lok');
  } catch (e) {
    log('❌ Fizika qo\'shilmadi: ' + e.message, 'le');
  }
  updateInspector(); updateHierarchy();
};


// ============================================================
//  🎨 MATERIAL + PBR bloki — QAYTA ISHLATILADIGAN
// ------------------------------------------------------------
//  ⚠ NEGA AJRATILDI: bu blok ilgari `updateInspector()` ning
//    ichida, oddiy obyekt shabloni O'RTASIDA turardi. Ya'ni O'Z
//    inspektoriga ega bloklarda (🔢 MiniPad, 🔊 ovoz, 📝 matn…)
//    tekstura va model tugmalari UMUMAN yo'q edi — obyekt mesh
//    bo'la turib unga rasm ham, GLB ham kiydirib bo'lmasdi.
//
//    Nusxa ko'chirish yechim emas: PBR ro'yxati o'sganда ikki
//    joyda yangilash kerak bo'lardi va biri albatta unutilardi.
//    Endi manba BITTA.
// ============================================================
window.buildMaterialInspectorHTML = function (o) {
  if (!o) return '';
      // Asosiy material yoki birinchi child material.
      // Per-face rejimda material array bo'ladi — birinchi slotni olamiz.
      let mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if(!mat) o.traverse(ch=>{ if(!mat && ch.isMesh && ch.material) mat=Array.isArray(ch.material)?ch.material[0]:ch.material; });
      if(!mat) return '';
      const isPerFace = Array.isArray(o.material);
      const opacity = mat.opacity??1;
      const roughness = mat.roughness??0.5;
      const metalness = mat.metalness??0;
      const matCol = '#'+(mat.color?.getHexString()||'888888');
      return `
    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">MAT</span>Material</div>
      <div class="fr"><span class="fl">Rang</span><input type="color" id="mc" value="${matCol}" oninput="applyM()" style="width:22px;height:20px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none"></div>
      <div class="fr"><span class="fl">Emissiv</span><input type="color" id="mem" value="#${mat.emissive?.getHexString?.()||'000000'}" oninput="applyM()" style="width:22px;height:20px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none"> <input type="range" min="0" max="3" step="0.05" value="${mat.emissiveIntensity||0}" id="memi" style="flex:1" oninput="applyM()"></div>
      <div class="fr"><span class="fl">Qo'pol</span><input type="range" min="0" max="1" step="0.05" value="${roughness}" style="flex:1" id="mr" oninput="applyM()"><span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right" id="mr-v">${roughness.toFixed(2)}</span></div>
      <div class="fr"><span class="fl">Metal</span><input type="range" min="0" max="1" step="0.05" value="${metalness}" style="flex:1" id="mm" oninput="applyM()"><span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right" id="mm-v">${metalness.toFixed(2)}</span></div>
      <div class="fr"><span class="fl">Shaffof</span>
        <input type="range" min="0" max="1" step="0.01" value="${opacity}" style="flex:1" id="mop" oninput="applyM()">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right" id="mop-v">${opacity.toFixed(2)}</span>
      </div>
      <div class="fr" style="flex-wrap:wrap;gap:3px;margin-top:4px">
        <button onclick="applyTransparency(0)" style="background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.2);color:var(--accent);font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">Solid</button>
        <button onclick="applyTransparency(0.5)" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">50%</button>
        <button onclick="applyTransparency(0.2)" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">20%</button>
        <button onclick="applyTransparency(0)" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">Ko'rinmas</button>
      </div>
      ${window.ObjectGlowSystem ? window.ObjectGlowSystem.inspectorHTML(o) : ''}
      ${window.buildGifInspectorHTML ? window.buildGifInspectorHTML(o) : ''}
      <div class="fr" style="flex-wrap:wrap;gap:3px">
        ${TEXTURES.map((t,i)=>`<button onclick="applyTexPreset(${i})" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:2px 5px;border-radius:2px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:600">${t.name}</button>`).join('')}
      </div>
      <div style="margin-top:5px;display:flex;flex-direction:column;gap:4px">
        <button class="action-btn" onclick="replaceWithGLB()" style="font-size:10px;background:rgba(255,107,53,.08);border-color:rgba(255,107,53,.3);color:var(--accent2)">📦 Model qo'shish (GLB/GLTF)</button>
        <button class="action-btn" onclick="replaceWithGLB(true)" style="font-size:10px;background:rgba(var(--accent-rgb),.08);border-color:rgba(var(--accent-rgb),.3);color:var(--accent)">🔍 Chuqur import (qismlar alohida)</button>
        <button class="action-btn" onclick="uploadTexture()" style="font-size:10px">🖼 Hamma yeriga tekstura</button>
        <button class="action-btn" onclick="window._pfOpenModal()" style="font-size:10px;background:rgba(var(--accent-rgb),.08);border-color:rgba(var(--accent-rgb),.3);color:var(--accent)">🎨 Har yuzga alohida tekstura</button>
      </div>
    </div>

    <div class="comp-block" id="pbr-maps-block">
      <div class="comp-title"><span class="tag tag2">PBR</span>Texture Maps</div>

      ${[
        ['map',           'diffuseMap',   '🖼',  'Diffuse / Albedo Map',       mat.map],
        ['normalMap',     'normalMap',    '🗺',  'Normal Map',                 mat.normalMap],
        ['roughnessMap',  'roughnessTex', '⚙',  'Roughness Map',              mat.roughnessMap],
        ['metalnessMap',  'metalnessTex', '🔩',  'Metalness Map',              mat.metalnessMap],
        ['aoMap',         'aoMap',        '🎨',  'AO (Ambient Occlusion)',     mat.aoMap],
        ['emissiveMap',   'emissiveMap',  '💡',  'Emissive Map',               mat.emissiveMap],
      ].map(([slot, id, ico, label, hasMap]) => `
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
        <span style="font-size:10px;width:10px;text-align:center;flex-shrink:0">${ico}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${hasMap?'var(--accent3)':'var(--muted)'};flex:1">${label}</span>
        <button onclick="window._pbrLoadMap('${slot}')" style="background:rgba(var(--accent-rgb),.07);border:1px solid rgba(var(--accent-rgb),.2);color:var(--accent);font-size:9px;padding:1px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">${hasMap?'↺ Yangi':'+ Yukla'}</button>
        ${hasMap?`<button onclick="window._pbrRemoveMap('${slot}')" style="background:rgba(255,68,68,.07);border:1px solid rgba(255,68,68,.2);color:var(--red);font-size:9px;padding:1px 5px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">✕</button>`:''}
      </div>`).join('')}

      ${mat.aoMap ? `
      <div class="fr" style="margin-top:2px"><span class="fl">AO Kuch</span>
        <input type="range" min="0" max="3" step="0.05" value="${mat.aoMapIntensity??1}" style="flex:1"
          oninput="if(selectedObj&&selectedObj.material){selectedObj.material.aoMapIntensity=parseFloat(this.value);this.nextSibling.textContent=parseFloat(this.value).toFixed(2)}">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${(mat.aoMapIntensity??1).toFixed(2)}</span>
      </div>` : ''}

      ${mat.normalMap ? `
      <div class="fr" style="margin-top:2px"><span class="fl">Normal Scale</span>
        <input type="range" min="0" max="5" step="0.1" value="${mat.normalScale?.x??1}" style="flex:1"
          oninput="if(selectedObj&&selectedObj.material&&selectedObj.material.normalScale){const v=parseFloat(this.value);selectedObj.material.normalScale.set(v,v);this.nextSibling.textContent=v.toFixed(1)}">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${(mat.normalScale?.x??1).toFixed(1)}</span>
      </div>` : ''}

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent2);margin:8px 0 4px;letter-spacing:1px">UV TILING & OFFSET</div>
      <div class="fr"><span class="fl" style="font-size:9px">Repeat X</span>
        <input type="number" min="0.1" step="0.1" value="${mat.map?.repeat?.x??1}" style="width:52px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
          oninput="window._pbrSetUV('repeatX',parseFloat(this.value)||1)">
        <span class="fl" style="font-size:9px;margin-left:6px">Y</span>
        <input type="number" min="0.1" step="0.1" value="${mat.map?.repeat?.y??1}" style="width:52px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
          oninput="window._pbrSetUV('repeatY',parseFloat(this.value)||1)">
      </div>
      <div class="fr" style="margin-top:3px"><span class="fl" style="font-size:9px">Offset X</span>
        <input type="number" step="0.05" value="${mat.map?.offset?.x??0}" style="width:52px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
          oninput="window._pbrSetUV('offsetX',parseFloat(this.value)||0)">
        <span class="fl" style="font-size:9px;margin-left:6px">Y</span>
        <input type="number" step="0.05" value="${mat.map?.offset?.y??0}" style="width:52px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
          oninput="window._pbrSetUV('offsetY',parseFloat(this.value)||0)">
      </div>
      <div class="fr" style="margin-top:3px"><span class="fl" style="font-size:9px">Rotation</span>
        <input type="range" min="0" max="6.28" step="0.01" value="${mat.map?.rotation??0}" style="flex:1"
          oninput="window._pbrSetUV('rotation',parseFloat(this.value));this.nextSibling.textContent=(parseFloat(this.value)*57.3).toFixed(0)+'°'">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${((mat.map?.rotation??0)*57.3).toFixed(0)}°</span>
      </div>
      <button onclick="window._pbrSetUV('reset')" style="margin-top:5px;width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--muted);font-family:'Rajdhani',sans-serif;font-size:10px;font-weight:700;padding:4px;border-radius:3px;cursor:pointer">↺ UV Reset</button>

      ${(() => {
        const tl  = selectedObj && selectedObj.userData ? selectedObj.userData.textureLoop : null;
        const on  = !!(tl && tl.enabled);
        const dns = (tl && typeof tl.density === 'number') ? tl.density : 1;
        return `
        <div style="margin-top:8px;border-top:1px solid var(--border);padding-top:7px">
          <div class="toggle-row" style="align-items:center">
            <span style="font-size:10px;color:${on?'var(--accent3)':'var(--muted)'};font-family:'Share Tech Mono',monospace">🔁 Textura Loop</span>
            <label class="tgl"><input type="checkbox" ${on?'checked':''} onchange="window._texLoopToggle(this.checked)"><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
          </div>
          <div style="font-size:8px;color:var(--muted);line-height:1.45;margin:3px 0 2px">
            Obyekt cho'zilganda textura cho'zilmaydi — takrorlanib (tile) bo'sh joyni to'ldiradi va zichlikni saqlaydi.
          </div>
          ${on ? `
          <div class="fr" style="margin-top:4px"><span class="fl" style="font-size:9px">Zichlik</span>
            <input type="range" min="0.1" max="8" step="0.1" value="${dns}" style="flex:1"
              oninput="window._texLoopDensity(parseFloat(this.value)||1);this.nextSibling.textContent=(parseFloat(this.value)).toFixed(1)+'×'">
            <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:30px;text-align:right">${dns.toFixed(1)}×</span>
          </div>` : ''}
        </div>`;
      })()}
    </div>`;
};
