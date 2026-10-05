// ============================================================
//  CAMERA STATE SYSTEM (Locomotion FX)  v1.0
// ------------------------------------------------------------
//  O'yinchi harakat holati → kamera effekti. Holat KLAVISH orqali
//  avtomatik aniqlanadi (kombo tizimi bilan) yoki HITBOX/API majburlaydi.
//
//  Holatlar:
//    Idle Walk Run Sprint Jump Fall Land Crouch Prone Climb
//    Vault Slide Swim Vehicle Combat Damage Death
//
//  Kombo namunasi:  W (yurish)  →  W+Shift (sprint)
//
//  Har holat kameraga profil beradi (bob, FOV, balandlik, roll, sway).
//  Holatlar orasida silliq blend bo'ladi. Impuls holatlar (Jump/Land/
//  Slide/Vault/Damage) bir martalik so'nuvchi turtki qo'shadi.
//
//  Qo'llash: renderer.render() patch (pos+rot+fov) — CameraRig,
//  MotionFX, CameraShake bilan qatlamlanadi.
// ============================================================

window.CameraStateSystem = (() => {

  const STATES = ['Idle','Walk','Run','Sprint','Jump','Fall','Land','Crouch',
                  'Prone','Climb','Vault','Slide','Swim','Vehicle','Combat','Damage','Death'];
  const LABEL = {
    Idle:'Turish', Walk:'Yurish', Run:'Yugurish', Sprint:'Sprint', Jump:'Sakrash',
    Fall:'Tushish', Land:'Qo\'nish', Crouch:'Cho\'nqayish', Prone:'Yotish', Climb:'Tirmashish',
    Vault:'Sakrab o\'tish', Slide:'Sirg\'anish', Swim:'Suzish', Vehicle:'Transport',
    Combat:'Jang', Damage:'Zarba', Death:'O\'lim',
  };

  // ── Holat profillari ─────────────────────────────────────────
  //  bobAmp/bobFreq: yurish tebranishi | fov: qo'shiladigan gradus
  //  height: kamera vertikal siljish (m) | roll: doimiy qiyalik (rad)
  //  sway: turg'un tebranish kuchi | impulse: bir martalik turtki nomi
  const _DEFAULT_PROFILE = {
    Idle:    { bobAmp:0.00, bobFreq:0,  fov:0,   height:0,     roll:0,     sway:0.5 },
    Walk:    { bobAmp:0.10, bobFreq:9,  fov:0,   height:0,     roll:0,     sway:0   },
    Run:     { bobAmp:0.15, bobFreq:12, fov:5,   height:0,     roll:0,     sway:0   },
    Sprint:  { bobAmp:0.20, bobFreq:15, fov:12,  height:-0.03, roll:0.02,  sway:0   },
    Crouch:  { bobAmp:0.03, bobFreq:6,  fov:-2,  height:-0.55, roll:0,     sway:0.2 },
    Prone:   { bobAmp:0.02, bobFreq:4,  fov:-4,  height:-1.05, roll:0,     sway:0.1 },
    Climb:   { bobAmp:0.045,bobFreq:6,  fov:0,   height:0,     roll:0,     sway:0.3 },
    Swim:    { bobAmp:0.04, bobFreq:3,  fov:2,   height:0,     roll:0.02,  sway:0.6 },
    Vehicle: { bobAmp:0.02, bobFreq:5,  fov:6,   height:0,     roll:0,     sway:0.2 },
    Combat:  { bobAmp:0.04, bobFreq:7,  fov:-3,  height:0,     roll:0,     sway:0.3 },
    Fall:    { bobAmp:0.00, bobFreq:0,  fov:5,   height:-0.05, roll:0,     sway:0.1 },
    // Impuls holatlar (bir martalik turtki)
    Jump:    { impulse:'jump' },
    Land:    { impulse:'land' },
    Vault:   { impulse:'vault' },
    Slide:   { impulse:'slide', height:-0.4, fov:8, roll:0.04 },
    Damage:  { impulse:'damage' },
    Death:   { impulse:'death' },
  };

  // Sozlanadigan profillar — foydalanuvchi o'zgartira oladi
  function _cloneProf(src){ const o={}; for(const k in src) o[k]=Object.assign({},src[k]); return o; }
  window._camStateProfiles = window._camStateProfiles || _cloneProf(_DEFAULT_PROFILE);
  const PROFILE = new Proxy({}, {
    get: (_, k) => window._camStateProfiles[k],
    has: (_, k) => k in window._camStateProfiles,
  });
  function resetProfile(state){
    if(_DEFAULT_PROFILE[state]) window._camStateProfiles[state] = Object.assign({}, _DEFAULT_PROFILE[state]);
  }
  function resetAllProfiles(){ window._camStateProfiles = _cloneProf(_DEFAULT_PROFILE); }

  // ── Klavish sozlamalari (global) ─────────────────────────────
  window._camStateCfg = window._camStateCfg || {
    enabled:   true,
    intensity: 1.0,
  };

  // ── Runtime ──────────────────────────────────────────────────
  let _forced = null;         // hitbox/API majburlagan holat (nom) yoki null
  let _bobPhase = 0;
  const _cur = { bobAmp:0, bobFreq:0, fov:0, height:0, roll:0, sway:0 };  // silliq (blend)
  let _swayT = 0;
  // impuls: {t, dur} + tur
  let _imp = null;

  const _pos = { x:0, y:0, z:0 };
  const _rot = { pitch:0, yaw:0, roll:0 };
  let   _fovOff = 0;
  let   _vign = 0;

  // ── Klavish holati ───────────────────────────────────────────
  function _kd(code) { return !!(typeof fpsKeys !== 'undefined' && fpsKeys && fpsKeys[code]); }
  function _held(code) {
    if (code === 'ShiftLeft')   return _kd('ShiftLeft')   || _kd('ShiftRight');
    if (code === 'ControlLeft') return _kd('ControlLeft') || _kd('ControlRight');
    return _kd(code);
  }
  function _moving() {
    return _kd('KeyW')||_kd('KeyA')||_kd('KeyS')||_kd('KeyD')||
           _kd('ArrowUp')||_kd('ArrowDown')||_kd('ArrowLeft')||_kd('ArrowRight');
  }

  // Avtomatik aniqlash YO'Q — holatni faqat klaviatura muxarriri
  // (KeyboardFX) yoki hitbox majburlaydi.

  // ── Impuls turtkilar ─────────────────────────────────────────
  function _startImpulse(kind) {
    const dur = kind==='death' ? 1.4 : kind==='slide' ? 0.7 : kind==='damage' ? 0.5 : 0.45;
    _imp = { kind, t: 0, dur };
  }
  function _sampleImpulse(delta) {
    if (!_imp) return { y:0, fov:0, roll:0, pitch:0, vign:0 };
    _imp.t += delta;
    const x = Math.min(1, _imp.t / _imp.dur);
    if (x >= 1) { const k=_imp.kind; _imp = null; if (k==='death') _forced='Death'; return { y:0, fov:0, roll:0, pitch:0, vign:0 }; }
    const I = window._camStateCfg.intensity || 1;
    // yumshoq "ping" egri chizig'i
    const ping = Math.sin(x * Math.PI) * (1 - x);
    switch (_imp.kind) {
      case 'jump':   return { y: ping*0.10*I,  fov:-ping*3*I, roll:0, pitch:-ping*0.02*I, vign:0 };
      case 'land':   return { y:-ping*0.14*I,  fov: ping*2*I, roll:0, pitch: ping*0.03*I, vign:0 };
      case 'vault':  return { y: ping*0.12*I,  fov: ping*4*I, roll: ping*0.05*I, pitch:-ping*0.03*I, vign:0 };
      case 'slide':  return { y:-ping*0.10*I,  fov: ping*8*I, roll: ping*0.05*I, pitch: ping*0.02*I, vign:0 };
      case 'damage': return { y: 0,            fov:-ping*4*I, roll: (Math.random()-0.5)*ping*0.12*I, pitch:0, vign: ping*0.45*I };
      case 'death':  return { y:-x*0.6*I,      fov:-x*6*I,    roll: x*0.5*I, pitch: x*0.3*I, vign: x*0.7*I };
      default:       return { y:0, fov:0, roll:0, pitch:0, vign:0 };
    }
  }

  // ── UPDATE ───────────────────────────────────────────────────
  function update(delta) {
    if (!delta || delta < 0) delta = 0;
    _pos.x=_pos.y=_pos.z=0; _rot.pitch=_rot.yaw=_rot.roll=0; _fovOff=0; _vign=0;

    const cfg = window._camStateCfg;
    const cam = (typeof camera !== 'undefined') ? camera : null;
    const playing = (typeof isPlaying !== 'undefined' && isPlaying);
    if (!cfg.enabled || !cam) { _applyVign(0); return; }

    // ── 🚗 MASHINADA — HECH QANDAY LOKOMOTSIYA EFFEKTI YO'Q ─────
    //   O'yinchi mashinaga o'tirganda Walk / Run / Sprint / Idle va
    //   boshqa BARCHA holat effektlari o'chadi. Sabab: mashinaning O'Z
    //   kamera effektlari bor (car.js — tezlik FOV, nitro, silkinish);
    //   ustiga yurish tebranishi qo'shilsa ikkalasi urishib ketadi va
    //   o'yinchi mashinada "piyoda yurayotganday" tebranadi.
    //
    //   ⚠ Offsetlar yuqorida allaqachon nolga tushirilgan — bu yerda
    //     faqat MAJBURLANGAN holatni ham bo'shatamiz, aks holda mashinaga
    //     kirishdan oldin bosib turilgan W (Walk) `_forced` da qolib,
    //     mashinadan chiqqanda darhol qaytib kelardi.
    //     `_cur` (silliqlangan qiymatlar) ham tozalanadi — chiqqanda
    //     effekt noldan boshlansin.
    if (typeof carInside !== 'undefined' && carInside) {
      _forced = null; _imp = null; _bobPhase = 0;
      _cur.bobAmp = _cur.bobFreq = _cur.fov = _cur.height = _cur.roll = _cur.sway = 0;
      _applyVign(0);
      return;
    }

    // Aktiv holat: FAQAT majburlangan (klaviatura muxarriri / hitbox)
    const stateName = _forced;
    if (!stateName) {
      // hech narsa biriktirilmagan — effektlarni silliq nolga qaytaramiz
      const lf0 = Math.min(1, delta * 6);
      _cur.bobAmp += (0 - _cur.bobAmp) * lf0;
      _cur.fov    += (0 - _cur.fov)    * lf0;
      _cur.height += (0 - _cur.height) * lf0;
      _cur.roll   += (0 - _cur.roll)   * lf0;
      _cur.sway   += (0 - _cur.sway)   * lf0;
      _pos.y += _cur.height; _fovOff += _cur.fov; _rot.roll += _cur.roll;
      const im0 = _sampleImpulse(delta);
      _pos.y += im0.y; _fovOff += im0.fov; _rot.roll += im0.roll; _rot.pitch += im0.pitch; _vign += im0.vign;
      _applyVign(_vign);
      return;
    }
    const p = PROFILE[stateName] || {};

    // Impuls holat bo'lsa (Jump/Land/...) — profil bo'sh, faqat turtki
    if (p.impulse && !_imp) _startImpulse(p.impulse);

    // Maqsad profil (impuls holatining doimiy qismi ham qo'shiladi)
    const I = cfg.intensity || 1;
    const tBob   = (p.bobAmp||0) * I;
    const tFreq  =  p.bobFreq||0;
    const tFov   = (p.fov||0)  * I;
    const tHeight= (p.height||0)* I;
    const tRoll  = (p.roll||0) * I;
    const tSway  = (p.sway||0);

    // Silliq blend
    const lf = Math.min(1, delta * 6);
    _cur.bobAmp  += (tBob   - _cur.bobAmp)  * lf;
    _cur.bobFreq += (tFreq  - _cur.bobFreq) * lf;
    _cur.fov     += (tFov   - _cur.fov)     * lf;
    _cur.height  += (tHeight- _cur.height)  * lf;
    _cur.roll    += (tRoll  - _cur.roll)    * lf;
    _cur.sway    += (tSway  - _cur.sway)    * lf;

    // Bob (harakatda)
    const active = true;   // holat majburlangan — effekt ishlaydi
    if (_cur.bobFreq > 0.1 && _cur.bobAmp > 0.0005 && active && playing) {
      _bobPhase += delta * _cur.bobFreq;
      _pos.y += Math.sin(_bobPhase) * _cur.bobAmp;
      const r = _camRight(cam);
      const side = Math.cos(_bobPhase * 0.5) * _cur.bobAmp * 0.6;
      _pos.x += r.x * side; _pos.z += r.z * side;
      _rot.roll += Math.sin(_bobPhase * 0.5) * 0.012;
    }

    // Turg'un sway (idle/suzish va h.k.)
    if (_cur.sway > 0.01) {
      _swayT += delta;
      _rot.yaw   += Math.sin(_swayT*0.55)       * 0.018 * _cur.sway;
      _rot.pitch += Math.sin(_swayT*0.80 + 1.0) * 0.012 * _cur.sway;
      _rot.roll  += Math.sin(_swayT*0.42 + 0.5) * 0.008 * _cur.sway;
    }

    // Doimiy profil qiymatlari
    _pos.y   += _cur.height;
    _fovOff  += _cur.fov;
    _rot.roll+= _cur.roll;

    // Impuls turtkilar
    const im = _sampleImpulse(delta);
    _pos.y   += im.y;
    _fovOff  += im.fov;
    _rot.roll+= im.roll;
    _rot.pitch += im.pitch;
    _vign    += im.vign;

    _applyVign(_vign);
  }

  const _rt = new THREE.Vector3();
  function _camRight(cam) {
    _rt.set(1,0,0).applyQuaternion(cam.quaternion); _rt.y=0;
    if (_rt.lengthSq()>1e-6) _rt.normalize();
    return _rt;
  }

  // ── vignette overlay (damage/death) ──────────────────────────
  let _vEl=null;
  function _applyVign(a){
    if(!_vEl){ const cvp=document.getElementById('cvp'); if(!cvp) return;
      _vEl=document.createElement('div'); _vEl.id='camstate-vignette';
      _vEl.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:6;opacity:0;'
        +'background:radial-gradient(ellipse at center,rgba(80,0,0,0) 35%,rgba(90,0,0,0.92) 100%)';
      cvp.appendChild(_vEl);
    }
    const o=Math.min(1,Math.max(0,a));
    if(o>0.001) _vEl.style.opacity=o.toFixed(3); else if(_vEl.style.opacity!=='0') _vEl.style.opacity='0';
  }

  // ── PUBLIC API ───────────────────────────────────────────────
  function force(state) { if (STATES.includes(state)) _forced = state; }
  function clearForce() { _forced = null; }
  function impulse(state) { const p = PROFILE[state]; if (p && p.impulse) _startImpulse(p.impulse); }
  function current() { return _forced; }

  // ── RENDER PATCH ─────────────────────────────────────────────
  const _q0=new THREE.Quaternion(), _qo=new THREE.Quaternion(), _e=new THREE.Euler();
  function _hookRenderer(){
    if(typeof renderer==='undefined'||!renderer.render){ setTimeout(_hookRenderer,100); return; }
    if(renderer.render.__cstPatched) return;
    const orig=renderer.render.bind(renderer);
    renderer.render=function(scn,cam){
      const c=cam||(typeof camera!=='undefined'?camera:null);
      const need=c&&(_pos.x||_pos.y||_pos.z||_rot.pitch||_rot.yaw||_rot.roll||Math.abs(_fovOff)>0.001);
      if(need){
        c.position.x+=_pos.x; c.position.y+=_pos.y; c.position.z+=_pos.z;
        _q0.copy(c.quaternion);
        _e.set(_rot.pitch,_rot.yaw,_rot.roll,'YXZ'); _qo.setFromEuler(_e);
        c.quaternion.multiply(_qo);
        let f0;
        if(Math.abs(_fovOff)>0.001&&c.isPerspectiveCamera){ f0=c.fov; c.fov=Math.max(1,Math.min(179,c.fov+_fovOff)); c.updateProjectionMatrix(); }
        c.updateMatrixWorld(true);
        try{ orig(scn,cam); } finally {
          c.position.x-=_pos.x; c.position.y-=_pos.y; c.position.z-=_pos.z;
          c.quaternion.copy(_q0);
          if(f0!==undefined){ c.fov=f0; c.updateProjectionMatrix(); }
          c.updateMatrixWorld(true);
        }
      } else orig(scn,cam);
    };
    renderer.render.__cstPatched=true;
  }

  function _hookMainLoop(){
    if(typeof camModuleUpdate!=='function'){ setTimeout(_hookMainLoop,100); return; }
    if(camModuleUpdate.__cstPatched) return;
    const orig=camModuleUpdate;
    window.camModuleUpdate=function(delta){ orig(delta); try{ update(delta); }catch(e){ if(typeof log==='function') log('❌ CameraState: '+e.message,'le'); } };
    window.camModuleUpdate.__cstPatched=true;
  }

  function _hookPlayMode(){
    const pb=document.getElementById('play-btn');
    if(pb&&!pb.__cstHooked){
      pb.addEventListener('click',()=>setTimeout(()=>{
        if(typeof isPlaying!=='undefined'&&!isPlaying){ _forced=null; _imp=null; _bobPhase=0; _applyVign(0); }
      },30));
      pb.__cstHooked=true;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  HITBOX — holatni majburlash (hold) yoki impuls (enter/exit)
  //  Config: hb.userData.actions.camState = { enabled, state, mode }
  // ══════════════════════════════════════════════════════════════
  const _hbPrev = new WeakMap();
  const _holders = new Set();   // hozir 'hold' majbur qilayotgan hitboxlar

  function _getHbCfg(hb){
    if(!hb.userData) hb.userData={};
    if(!hb.userData.actions) hb.userData.actions={};
    if(!hb.userData.actions.camState)
      hb.userData.actions.camState={ enabled:false, state:'Swim', mode:'hold' };
    return hb.userData.actions.camState;
  }

  function _processHitbox(delta){
    if(typeof isPlaying==='undefined'||!isPlaying) return;
    if(typeof objects==='undefined') return;
    let anyHold=false, holdState=null;
    for(let i=0;i<objects.length;i++){
      const hb=objects[i];
      if(!hb||!hb.userData||!hb.userData.isHitbox) continue;
      const cfg=hb.userData.actions&&hb.userData.actions.camState;
      if(!cfg||!cfg.enabled) continue;
      const cur=hb.userData._entitiesInside; if(!cur) continue;
      let prev=_hbPrev.get(hb); if(!prev){ prev=new Set(); _hbPrev.set(hb,prev); }

      const inside = cur.size>0;
      if(cfg.mode==='hold' && inside){ anyHold=true; holdState=cfg.state; }

      cur.forEach(ent=>{ if(!prev.has(ent) && cfg.mode==='enter') impulse(cfg.state); });
      prev.forEach(ent=>{ if(!cur.has(ent) && cfg.mode==='exit') impulse(cfg.state); });

      const snap=new Set(); cur.forEach(e=>snap.add(e)); _hbPrev.set(hb,snap);
    }
    // 'hold' majburlash: birorta zona ichida bo'lsa — o'sha holat, aks holda bo'shatamiz
    if(anyHold) _forced=holdState;
    else if(_forced && !_imp && !anyHold && _wasHold) _forced=null;
    _wasHold=anyHold;
  }
  let _wasHold=false;

  function _hookHitbox(){
    if(typeof HitboxSystem==='undefined'||!HitboxSystem.update){ setTimeout(_hookHitbox,100); return; }
    if(HitboxSystem.update.__cstPatched) return;
    const orig=HitboxSystem.update;
    HitboxSystem.update=function(delta){ orig.call(this,delta); try{ _processHitbox(delta||0); }catch(e){ if(typeof log==='function') log('❌ CameraState hitbox: '+e.message,'le'); } };
    HitboxSystem.update.__cstPatched=true;
  }

  // ══════════════════════════════════════════════════════════════
  //  INSPECTOR — hitbox bloki + global sozlama (hamburger)
  // ══════════════════════════════════════════════════════════════
  const INP="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none";

  function _stateOpts(sel){ return STATES.map(s=>`<option value="${s}" ${sel===s?'selected':''}>${LABEL[s]} (${s})</option>`).join(''); }

  function _buildHitboxSection(hb){
    const cfg=_getHbCfg(hb); const en=!!cfg.enabled;
    return `
      <div class="comp-block">
        <div class="comp-title" style="cursor:pointer" onclick="CameraStateSystem._toggleHb()">
          <span class="tag" style="background:rgba(120,220,120,.16);color:#7fd97f">LOC</span>
          <span style="flex:1">Locomotion State on Trigger</span>
          <input type="checkbox" ${en?'checked':''} onclick="event.stopPropagation();CameraStateSystem._toggleHb();" style="cursor:pointer">
        </div>
        ${en?`
          <div class="fr"><span class="fl">Holat</span>
            <select id="cst-hb-state" style="${INP}">${_stateOpts(cfg.state)}</select></div>
          <div class="fr"><span class="fl">Rejim</span>
            <select id="cst-hb-mode" style="${INP}">
              <option value="hold" ${cfg.mode==='hold'?'selected':''}>Ichida turганда (hold)</option>
              <option value="enter" ${cfg.mode==='enter'?'selected':''}>Kirishda (impuls)</option>
              <option value="exit" ${cfg.mode==='exit'?'selected':''}>Chiqishda (impuls)</option>
            </select></div>
          <div style="font-size:9px;color:var(--muted);margin-top:2px">
            ${cfg.mode==='hold'?"zona ichida shu holat majburlanadi (masalan suv → Swim), chiqsa bo'shaydi":"bir martalik turtki"}
          </div>
          <button class="action-btn" onclick="CameraStateSystem._testHb()"
            style="background:rgba(120,220,120,.1);border-color:rgba(120,220,120,.4);color:#7fd97f;margin-top:6px;width:100%">▶ TEST</button>
        `:`<div style="font-size:10px;color:var(--muted);padding:4px 0;text-align:center">Yoqish uchun ✓</div>`}
      </div>`;
  }
  function _wireHitboxSection(hb){
    const cfg=_getHbCfg(hb); if(!cfg.enabled) return;
    const on=(id,key)=>{ const el=document.getElementById(id); if(!el) return;
      el.addEventListener('change',()=>{ cfg[key]=el.value; if(key==='mode'&&typeof updateInspector==='function') updateInspector(); }); };
    on('cst-hb-state','state'); on('cst-hb-mode','mode');
  }
  function _toggleHb(){
    if(typeof selectedObj==='undefined'||!selectedObj||!selectedObj.userData||!selectedObj.userData.isHitbox) return;
    const cfg=_getHbCfg(selectedObj); cfg.enabled=!cfg.enabled;
    if(typeof updateInspector==='function') updateInspector();
  }
  function _testHb(){
    if(typeof selectedObj==='undefined'||!selectedObj) return;
    const cfg=_getHbCfg(selectedObj);
    if(cfg.mode==='hold'){ force(cfg.state); setTimeout(clearForce,2500); }
    else impulse(cfg.state);
  }

  function _appendToInspector(){
    if(typeof selectedObj==='undefined'||!selectedObj) return;
    const ud=selectedObj.userData; if(!ud||!ud.isHitbox) return;
    const ic=document.getElementById('inspector-content'); if(!ic) return;
    ic.insertAdjacentHTML('beforeend',_buildHitboxSection(selectedObj));
    _wireHitboxSection(selectedObj);
  }
  function _hookInspector(){
    if(typeof updateInspector!=='function'){ setTimeout(_hookInspector,100); return; }
    if(updateInspector.__cstPatched) return;
    const orig=updateInspector;
    window.updateInspector=function(){ orig.apply(this,arguments); try{ _appendToInspector(); }catch(e){} };
    window.updateInspector.__cstPatched=true;
  }

  // ── Global sozlama paneli (hamburger "🏃 Locomotion FX") ──────
  function editGlobal(){
    if(typeof switchInsTab==='function'){ try{ switchInsTab('inspector'); }catch(e){} }
    const ic=document.getElementById('inspector-content'); if(!ic) return;
    const cfg=window._camStateCfg;
    ic.innerHTML=`
      <div class="comp-block">
        <div class="comp-title"><span class="tag" style="background:rgba(120,220,120,.16);color:#7fd97f">LOC</span>
          <span style="flex:1">Locomotion FX (Global)</span>
          <input type="checkbox" ${cfg.enabled?'checked':''} onchange="window._camStateCfg.enabled=this.checked">
        </div>
        <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 6px">
          Effektlar avtomatik ishlamaydi — ularni <b style="color:#7fd97f">klaviatura muxarridan</b>
          klavish/komboga o'zingiz biriktirasiz (yoki hitboxdan).
        </div>
        <div class="fr"><span class="fl">Umumiy kuch</span>
          <input type="range" min="0" max="2" step="0.05" value="${cfg.intensity}" oninput="window._camStateCfg.intensity=parseFloat(this.value)" style="flex:1"></div>
        <div style="font-size:9px;color:var(--muted);margin-top:6px">
          Hitboxdagi holatlar (Swim, Vehicle, Combat...) alohida — hitboxni tanlab «Locomotion State on Trigger» dan sozlanadi.
        </div>
      </div>

      <div class="comp-block">
        <div class="comp-title">
          <span class="tag" style="background:rgba(255,170,68,.16);color:#ffaa44">FX</span>
          <span style="flex:1">Har holat effekti</span>
          <button onclick="CameraStateSystem.resetAllProfiles();CameraStateSystem.editGlobal()"
            style="background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.4);color:#ff6666;border-radius:3px;font-size:9px;padding:2px 7px;cursor:pointer">↺ Hammasi</button>
        </div>
        <div style="font-size:9px;color:var(--muted);line-height:1.5;padding:2px 0 6px">
          Har holat uchun tebranishni o'zingiz sozlang.
        </div>
        <div id="cst-prof-list"></div>
      </div>`;
    _renderProfiles();
  }

  // ── Har holat uchun sozlash kartochkalari ────────────────────
  const _EDITABLE = ['Idle','Walk','Run','Sprint','Crouch','Prone','Climb','Swim','Vehicle','Combat','Fall'];
  let _openProf = 'Walk';

  function _renderProfiles() {
    const box = document.getElementById('cst-prof-list'); if (!box) return;
    box.innerHTML = _EDITABLE.map(st => {
      const p = window._camStateProfiles[st] || {};
      const open = (_openProf === st);
      return `
        <div style="border:1px solid var(--border);border-radius:4px;margin-bottom:4px;overflow:hidden">
          <div onclick="CameraStateSystem._openProf('${st}')"
               style="display:flex;align-items:center;gap:6px;padding:5px 7px;cursor:pointer;background:${open?'rgba(255,170,68,.08)':'transparent'}">
            <span style="flex:1;font-size:10px;color:${open?'#ffaa44':'var(--text)'}">${LABEL[st]} <span style="color:var(--muted)">(${st})</span></span>
            <button onclick="event.stopPropagation();CameraStateSystem._testProf('${st}')"
              style="background:rgba(120,220,120,.1);border:1px solid rgba(120,220,120,.35);color:#7fd97f;border-radius:3px;font-size:9px;padding:1px 6px;cursor:pointer">▶</button>
            <span style="font-size:9px;color:var(--muted)">${open?'▾':'▸'}</span>
          </div>
          ${open ? `
          <div style="padding:6px 8px;border-top:1px solid var(--border)">
            ${_pRow(st,'bobAmp','Tebranish kuchi',0,0.4,0.005)}
            ${_pRow(st,'bobFreq','Tebranish tezligi',0,20,0.5)}
            ${_pRow(st,'fov','FOV (+/−°)',-15,25,0.5)}
            ${_pRow(st,'height','Balandlik (m)',-1.5,0.5,0.01)}
            ${_pRow(st,'roll','Qiyalik (roll)',-0.15,0.15,0.005)}
            ${_pRow(st,'sway','Turgun sway',0,2,0.05)}
            <button onclick="CameraStateSystem.resetProfile('${st}');CameraStateSystem._openProf('${st}')"
              style="background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.3);color:#ff6666;border-radius:3px;font-size:9px;padding:3px 8px;cursor:pointer;width:100%;margin-top:4px">↺ Standart holatga</button>
          </div>` : ''}
        </div>`;
    }).join('');
  }

  function _pRow(state, key, label, min, max, step) {
    const p = window._camStateProfiles[state] || {};
    const v = p[key] != null ? p[key] : 0;
    return `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        <span style="flex:1;font-size:9px;color:var(--muted)">${label}</span>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${v}"
          oninput="CameraStateSystem._setProf('${state}','${key}',parseFloat(this.value),this)"
          style="flex:1.4">
        <span id="cst-v-${state}-${key}" style="width:44px;text-align:right;font-size:9px;color:#ffaa44">${(+v).toFixed(3)}</span>
      </div>`;
  }

  function _setProf(state, key, val, el) {
    if (!window._camStateProfiles[state]) window._camStateProfiles[state] = {};
    window._camStateProfiles[state][key] = val;
    const lbl = document.getElementById(`cst-v-${state}-${key}`);
    if (lbl) lbl.textContent = (+val).toFixed(3);
  }
  function _openProfFn(st) { _openProf = (_openProf === st) ? '' : st; _renderProfiles(); }
  function _testProf(st) {
    force(st);
    setTimeout(() => { if (_forced === st) clearForce(); }, 2500);
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init(){
    _hookRenderer(); _hookMainLoop(); _hookPlayMode(); _hookHitbox(); _hookInspector();
    if(typeof log==='function') log('🏃 CameraStateSystem ishga tushdi','lok');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else setTimeout(init,80);

  // ── 📤 Joriy kamera offseti (CSS3D sinxroni uchun) ───────────
  //   Bu tizim kamerani FAQAT `renderer.render()` patch ichida siljitadi
  //   va darhol qaytarib oladi. Lekin 💻 PC blokning HTML ekrani ALOHIDA
  //   renderer bilan chiziladi (CSS3DRenderer) — u patch'ni ko'rmaydi.
  //   Natijada WebGL "teshigi" tebranadi, iframe esa qimirlamaydi va
  //   HTML ekran ichida SILKINIB turganday ko'rinadi.
  //   Shu getter orqali pc-block.js aynan shu offsetni o'z kamerasiga
  //   qo'llaydi — ikkala renderer bir xil kamerani ko'radi.
  function getCamFx() {
    return { pos: _pos, rot: _rot, fov: _fovOff };
  }

  // ── 💾 SystemRegistry shartnomasi ────────────────────────────
  //  ⚠ `PROFILE` — foydalanuvchi sozlagan kamera profillari (bob, fov,
  //    sway, roll). Modul ichida yopiq turardi, ya'ni sahna bilan
  //    KO'CHMASDI: o'yinda kamera standart holatga qaytardi.
  //    Runtime holati (`_bobPhase`, `_swayT`, `_imp`) SAQLANMAYDI —
  //    u har kadr qayta hisoblanadi.
  function serialize() {
    try {
      return { version: 1, profiles: JSON.parse(JSON.stringify(PROFILE)) };
    } catch (e) { return null; }
  }
  function restore(d) {
    if (!d) return 0;
    const src = d.profiles || d;
    let n = 0;
    for (const k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      PROFILE[k] = Object.assign({}, PROFILE[k] || {}, src[k]);
      n++;
    }
    return n;
  }

  return {
    serialize, restore,
    STATES, LABEL, PROFILE,
    force, clearForce, impulse, current, update,
    getCamFx,
    editGlobal,
    resetProfile, resetAllProfiles,
    _openProf: _openProfFn, _setProf, _testProf,
    _toggleHb, _testHb,
  };
})();

window.CameraState = window.CameraStateSystem;
// ============================================================