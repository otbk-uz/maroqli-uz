// ============================================================
//  🌌 SKYBOX SYSTEM  v2
// ------------------------------------------------------------
//  Rejimlar:
//    gradient  — tayyor ranglar (eski xatti-harakat)
//    color     — bitta tekis rang (o'zingiz tanlaysiz)
//    sphere    — RASM sferaga o'raladi (equirect / panorama)
//    box       — RASM kubning ichki 6 tomoniga qo'yiladi
//    facing    — RASM doim KAMERAGA QARAB turadi (billboard)
//
//  ⚠ PC BLOK bilan bog'liq: canvas alpha 0 bo'lib qolishi SHART
//    (renderer.js:103). Fon rangi canvas KONTEYNERINING CSS foniga
//    yoziladi, `renderer.setClearColor(..., 1)` EMAS — aks holda
//    HTML rejimidagi PC ekrani o'ladi.
//
//  ⚠ Sky gavdasi `__noSave` bilan belgilanadi va `objects` ga
//    QO'SHILMAYDI — u sahna obyekti emas, fon. Aks holda iyerarxiyada
//    paydo bo'lib, saqlanib, gizmo bilan surilib ketardi.
// ============================================================
let skyboxOn = false;
let skyMesh  = null;

const SKIES = [
  {name:'Kosmik',   top:0x000010, bot:0x050520, fog:0x000010},
  {name:'Qorong\'u', top:0x050810, bot:0x080c18, fog:0x050810},
  {name:'Tong',     top:0x1a1a3a, bot:0x3a1a10, fog:0x1a1a3a},
  {name:'Okean',    top:0x000820, bot:0x001828, fog:0x000820},
];
let skyIdx = 0;

window.SkyboxSystem = (() => {

  const DEF = {
    mode:      'gradient',   // gradient | color | sphere | box | facing
    color:     '#0a0f1a',    // tekis rang / gradient tepasi
    color2:    '#1a2030',    // gradient pastki rangi
    fogColor:  '#0a0f1a',
    fogOn:     true,
    fogDensity: 0.016,
    image:     null,         // dataURL (sphere / box / facing uchun)
    imageName: '',
    rotation:  0,            // gradus — rasmni aylantirish
    size:      480,          // sfera/kub radiusi
    stars:     false,
    intensity: 1,            // rasm yorqinligi
  };
  const cfg = Object.assign({}, DEF);

  let _mesh = null, _tex = null, _customColors = [];

  const _hex = v => (typeof v === 'number')
    ? '#' + v.toString(16).padStart(6, '0') : String(v || '#000000');

  // ── Canvas fonini yangilash (PC blok teshigi saqlanadi) ─────
  function _paintBackdrop(hex) {
    if (typeof renderer !== 'undefined' && renderer.setClearAlpha) renderer.setClearAlpha(0);
    const cvp = document.getElementById('cvp');
    if (cvp) cvp.style.background = hex;
  }

  function _disposeMesh() {
    if (!_mesh) return;
    try { scene.remove(_mesh); } catch (e) {}
    try { _mesh.geometry?.dispose(); } catch (e) {}
    const m = _mesh.material;
    (Array.isArray(m) ? m : [m]).forEach(x => { try { x?.dispose(); } catch (e) {} });
    _mesh = null;
  }

  /**
   * Rasmni yuklaydi (keshlanadi).
   *
   * ⚠ ALOMAT: "skyboxga rasm qo'yib bo'lmayapti" — rasm tanlanadi,
   *   lekin fon o'zgarmaydi va HECH QANDAY xabar chiqmaydi.
   *
   * ⚠ SABAB: xato yo'li JIM edi — `() => cb(null)`. Yuklash muvaffaqiyatsiz
   *   bo'lsa (buzuq fayl, qo'llab-quvvatlanmaydigan format, brauzer
   *   xotirasiga sig'maydigan ulkan panorama) foydalanuvchi buni
   *   bilmasdi: hech nima o'zgarmagandek ko'rinardi.
   *
   *   Ikkinchi jimgina yo'l — GPU chegarasi: 8192 px dan katta
   *   tomonli rasm ko'p videokartada QORA chiqadi. Bu ham xato emas,
   *   shuning uchun hech kim ogohlantirmasdi.
   */
  function _texture(cb) {
    if (!cfg.image) { cb(null); return; }
    if (_tex && _tex.__src === cfg.image) { cb(_tex); return; }
    const loader = new THREE.TextureLoader();
    loader.load(cfg.image, tx => {
      tx.__src = cfg.image;
      if (THREE.SRGBColorSpace) tx.colorSpace = THREE.SRGBColorSpace;
      else if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding;
      const w = tx.image && tx.image.width, h = tx.image && tx.image.height;
      if (w && h) {
        const max = _maxTexSize();
        if (w > max || h > max) {
          log(`⚠ Skybox rasmi juda katta: ${w}×${h}. Videokarta chegarasi ${max}px — ` +
              `rasm qora chiqishi mumkin. Kichraytiring.`, 'lw');
        }
      }
      if (_tex && _tex !== tx) { try { _tex.dispose(); } catch (e) {} }
      _tex = tx; cb(tx);
    }, undefined, () => {
      log('⚠ Skybox rasmi yuklanmadi — fayl buzuq yoki format qo\'llab-quvvatlanmaydi ' +
          '(JPG / PNG / WEBP ishlatib ko\'ring)', 'lw');
      cb(null);
    });
  }

  /** Videokartaning eng katta tekstura o'lchami. */
  function _maxTexSize() {
    try {
      if (typeof renderer !== 'undefined' && renderer && renderer.capabilities) {
        return renderer.capabilities.maxTextureSize || 4096;
      }
    } catch (e) {}
    return 4096;
  }

  // ── Asosiy: rejimni qo'llash ────────────────────────────────
  function apply() {
    if (typeof scene === 'undefined' || !scene) return;
    _disposeMesh();

    // Tuman — barcha rejimlar uchun umumiy
    if (cfg.fogOn && cfg.fogDensity > 0.0005) {
      scene.fog = new THREE.FogExp2(new THREE.Color(cfg.fogColor), cfg.fogDensity);
    } else scene.fog = null;

    const R = Math.max(20, cfg.size);

    if (cfg.mode === 'color') {
      scene.background = new THREE.Color(cfg.color);
      _paintBackdrop(cfg.color);

    } else if (cfg.mode === 'gradient') {
      // Vertikal gradient — sferaning ichki tomoniga shader bilan
      scene.background = null;
      _paintBackdrop(cfg.color2);
      const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
        uniforms: {
          cTop: { value: new THREE.Color(cfg.color) },
          cBot: { value: new THREE.Color(cfg.color2) },
        },
        vertexShader: 'varying float vH; void main(){ vH = normalize(position).y; ' +
          'gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 cTop; uniform vec3 cBot; varying float vH; ' +
          'void main(){ gl_FragColor = vec4(mix(cBot, cTop, smoothstep(-0.25, 0.6, vH)), 1.0); }',
      });
      _mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), mat);
      _finishMesh();

    } else if (cfg.mode === 'facing') {
      // Kameraga qaragan tekislik — har kadr `update()` da buriladi
      scene.background = new THREE.Color(cfg.color);
      _paintBackdrop(cfg.color);
      _texture(tx => {
        if (!tx || cfg.mode !== 'facing') return;
        const mat = new THREE.MeshBasicMaterial({
          map: tx, depthWrite: false, depthTest: true, fog: false, toneMapped: false });
        mat.color.setScalar(cfg.intensity);
        _mesh = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.6, R * 1.5), mat);
        _mesh.userData.__facing = true;
        _finishMesh();
      });

    } else {
      // sphere | box — rasm
      scene.background = new THREE.Color(cfg.color);
      _paintBackdrop(cfg.color);
      _texture(tx => {
        if (!tx || (cfg.mode !== 'sphere' && cfg.mode !== 'box')) return;
        const mat = new THREE.MeshBasicMaterial({
          map: tx, side: THREE.BackSide, depthWrite: false, depthTest: true,
          fog: false, toneMapped: false });
        mat.color.setScalar(cfg.intensity);
        const geo = cfg.mode === 'box'
          ? new THREE.BoxGeometry(R * 2, R * 2, R * 2)
          : new THREE.SphereGeometry(R, 48, 32);
        _mesh = new THREE.Mesh(geo, mat);
        _mesh.rotation.y = cfg.rotation * Math.PI / 180;
        _finishMesh();
      });
    }

    if (cfg.stars) addStars(); else removeStars();
    skyboxOn = cfg.mode !== 'gradient' || true;
    skyMesh = _mesh;
  }

  function _finishMesh() {
    if (!_mesh) return;
    // 🔑 PC blok teshigi: ekran (renderOrder -10) faqat DEPTH yozadi.
    //    Osmon undan KEYIN chizilishi shart, aks holda rangi teshik
    //    joyiga yozilib qolardi (pc-block.js dagi izohga qarang).
    //
    // ⚠ Tartib SHU IKKI FAYL O'RTASIDAGI SHARTNOMA:
    //      -10   💻 PC ekrani (faqat depth)
    //      -9.5  💻 PC fon sferasi (r=496)
    //      -9    🌌 SHU sfera (r=480)  ← RASM shu yerda
    //       0    oddiy obyektlar
    //    Ikkalasi ham `depthWrite:false`, ya'ni bir-birini depth bilan
    //    to'sa olmaydi — faqat tartib hal qiladi. Bu qiymatlarni
    //    o'zgartirsangiz, `pc-block.js` dagisini ham qarang: teng
    //    bo'lib qolsa PC fon sferasi rasmni bo'yab tashlaydi (58.33).
    _mesh.renderOrder = -9;
    _mesh.frustumCulled = false;
    _mesh.userData.__noSave = true;
    _mesh.userData._noSave  = true;
    _mesh.name = '__skybox';
    _mesh.raycast = () => {};          // gizmo/tanlash uni ko'rmasin
    scene.add(_mesh);
    skyMesh = _mesh;
  }

  /** Har kadr — faqat `facing` rejimida kerak. */
  function update() {
    if (!_mesh || !_mesh.userData.__facing) return;
    if (typeof camera === 'undefined' || !camera) return;
    camera.getWorldPosition(_mesh.position);
    _mesh.quaternion.copy(camera.quaternion);
    _mesh.translateZ(-Math.max(20, cfg.size) * 0.95);
    _mesh.rotateZ(cfg.rotation * Math.PI / 180);
  }

  // ── ⏱ TIMELINE uchun: holatni olish / qo'llash / aralashtirish ──
  //  Timeline `isSkybox` trekida shu uchtasini ishlatadi. Rang
  //  KEYFRAMELAR ORASIDA SILLIQ o'zgaradi (oq → qora bosqichma-bosqich).
  function capture() {
    return {
      mode: cfg.mode, color: cfg.color, color2: cfg.color2,
      fogColor: cfg.fogColor, fogOn: cfg.fogOn, fogDensity: cfg.fogDensity,
      rotation: cfg.rotation, intensity: cfg.intensity, stars: cfg.stars,
      image: cfg.image, imageName: cfg.imageName, size: cfg.size,
    };
  }

  const _cA = new THREE.Color(), _cB = new THREE.Color();
  function _mixHex(a, b, t) {
    _cA.set(a || '#000000'); _cB.set(b || '#000000');
    return '#' + _cA.lerp(_cB, Math.max(0, Math.min(1, t))).getHexString();
  }

  /**
   * Ikki keyframe orasini aralashtiradi.
   * ⚠ Rang/son SILLIQ, rejim va rasm esa QADAMLI (b ga o'tadi) — ular
   *   uzluksiz qiymat emas, ularni "yarim" qilib bo'lmaydi.
   */
  function lerp(a, b, t) {
    if (!a) return b; if (!b) return a;
    const k = Math.max(0, Math.min(1, t));
    return {
      mode:      k < 1 ? a.mode : b.mode,
      image:     k < 1 ? a.image : b.image,
      imageName: k < 1 ? a.imageName : b.imageName,
      stars:     k < 0.5 ? a.stars : b.stars,
      fogOn:     k < 0.5 ? a.fogOn : b.fogOn,
      color:     _mixHex(a.color,    b.color,    k),
      color2:    _mixHex(a.color2,   b.color2,   k),
      fogColor:  _mixHex(a.fogColor, b.fogColor, k),
      fogDensity: (a.fogDensity ?? 0) + ((b.fogDensity ?? 0) - (a.fogDensity ?? 0)) * k,
      rotation:   (a.rotation   ?? 0) + ((b.rotation   ?? 0) - (a.rotation   ?? 0)) * k,
      intensity:  (a.intensity  ?? 1) + ((b.intensity  ?? 1) - (a.intensity  ?? 1)) * k,
      size:       (a.size       ?? 480) + ((b.size     ?? 480) - (a.size     ?? 480)) * k,
    };
  }

  /**
   * Holatni qo'llaydi.
   * ⚠ OPTIMIZATSIYA: faqat RANG o'zgargan bo'lsa geometriya qayta
   *   qurilmaydi — uniform yangilanadi. Aks holda timeline o'ynaganda
   *   har kadrda sfera qayta yaratilib, FPS yerga urilardi.
   */
  function applyState(st) {
    if (!st) return;
    const structural = st.mode !== cfg.mode || st.image !== cfg.image ||
                       st.stars !== cfg.stars || Math.abs((st.size ?? 480) - cfg.size) > 0.5;
    Object.assign(cfg, st);
    if (structural || !_mesh) { apply(); return; }

    // Yengil yo'l — mavjud gavdani yangilaymiz
    if (cfg.mode === 'gradient' && _mesh.material?.uniforms) {
      _mesh.material.uniforms.cTop.value.set(cfg.color);
      _mesh.material.uniforms.cBot.value.set(cfg.color2);
      _paintBackdrop(cfg.color2);
    } else {
      if (scene.background?.isColor) scene.background.set(cfg.color);
      _paintBackdrop(cfg.color);
      if (_mesh.material?.color) _mesh.material.color.setScalar(cfg.intensity);
      if (cfg.mode === 'sphere' || cfg.mode === 'box') _mesh.rotation.y = cfg.rotation * Math.PI / 180;
    }
    if (cfg.fogOn && cfg.fogDensity > 0.0005) {
      if (scene.fog?.isFogExp2) { scene.fog.color.set(cfg.fogColor); scene.fog.density = cfg.fogDensity; }
      else scene.fog = new THREE.FogExp2(new THREE.Color(cfg.fogColor), cfg.fogDensity);
    } else scene.fog = null;
  }

  // ── Saqlash / yuklash ───────────────────────────────────────
  function serialize() { return Object.assign(capture(), { customColors: _customColors.slice() }); }
  function restore(d) {
    if (!d) return;
    if (Array.isArray(d.customColors)) _customColors = d.customColors.slice();
    for (const k of Object.keys(DEF)) if (d[k] !== undefined) cfg[k] = d[k];
    apply();
  }
  function reset() { Object.assign(cfg, DEF); _customColors = []; apply(); }

  // ── Sozlagichlar ────────────────────────────────────────────
  window._skySet = function (k, v) {
    if (!(k in cfg)) return;
    cfg[k] = v; apply();
    if (document.getElementById('skybox-panel')) showPanel(true);
  };
  window._skyNum = function (k, v, min, max) {
    if (!(k in cfg)) return;
    let n = parseFloat(v); if (!isFinite(n)) n = 0;
    cfg[k] = Math.max(min, Math.min(max, n)); apply();
  };
  window._skyPreset = function (i) {
    const s = SKIES[i]; if (!s) return;
    skyIdx = i;
    cfg.mode = 'gradient';
    cfg.color = _hex(s.top); cfg.color2 = _hex(s.bot); cfg.fogColor = _hex(s.fog);
    cfg.stars = (i === 0);
    apply(); showPanel(true);
    log(`🌌 Skybox: ${s.name}`, 'lok');
  };
  window._skyAddCustom = function () {
    const c = cfg.color;
    if (!_customColors.includes(c)) { _customColors.unshift(c); _customColors = _customColors.slice(0, 12); }
    showPanel(true);
    log(`🎨 Rang saqlandi: ${c}`, 'lok');
  };
  window._skyDelCustom = function (i) { _customColors.splice(i, 1); showPanel(true); };
  window._skyImage = function (input) {
    const f = input.files && input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      cfg.image = e.target.result;
      cfg.imageName = f.name;
      if (cfg.mode === 'gradient' || cfg.mode === 'color') cfg.mode = 'sphere';
      apply(); showPanel(true);
      log(`🖼 Skybox rasmi: ${f.name}`, 'lok');
    };
    r.readAsDataURL(f);
  };
  window._skyClearImage = function () {
    cfg.image = null; cfg.imageName = '';
    if (['sphere','box','facing'].includes(cfg.mode)) cfg.mode = 'gradient';
    apply(); showPanel(true);
  };

  // ── 🎛 PANEL ────────────────────────────────────────────────
  function showPanel(keepOpen) {
    const old = document.getElementById('skybox-panel');
    if (old) { old.remove(); if (!keepOpen) return; }

    const p = document.createElement('div');
    p.id = 'skybox-panel';
    p.classList.add('ui-modal-scroll');
    p.style.cssText = 'border:1px solid var(--accent);min-width:340px;max-height:84vh;padding:0';

    const MODES = [
      ['gradient', '🌈', 'Gradient'],
      ['color',    '🌈', 'Tekis rang'],
      ['sphere',   '🌐', 'Rasm — sfera'],
      ['box',      '📦', 'Rasm — kub'],
      ['facing',   '🎥', 'Rasm — kameraga'],
    ];
    const needsImg = ['sphere','box','facing'].includes(cfg.mode);

    const row = (lbl, inner) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:78px;flex-shrink:0">${lbl}</span>
        ${inner}</div>`;
    const colorIn = (k) =>
      `<input type="color" value="${cfg[k]}" oninput="_skySet('${k}',this.value)"
        style="width:38px;height:22px;border:1px solid var(--border);background:none;cursor:pointer;border-radius:3px;padding:0">
       <input value="${cfg[k]}" oninput="_skySet('${k}',this.value)"
        style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;
        font-family:'Share Tech Mono',monospace;font-size:10px;border-radius:2px;outline:none">`;
    const rng = (k, min, max, step) =>
      `<input type="range" min="${min}" max="${max}" step="${step}" value="${cfg[k]}"
        oninput="_skyNum('${k}',this.value,${min},${max});this.nextElementSibling.textContent=(+this.value).toFixed(${step<1?3:0})"
        style="flex:1;accent-color:var(--accent)">
       <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:40px;text-align:right">${(+cfg[k]).toFixed(step<1?3:0)}</span>`;

    p.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(0,40,60,.7),rgba(10,20,40,.9));padding:11px 14px;
      display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);cursor:move">
      <span style="font-size:11px;color:var(--accent);letter-spacing:2px">🌌 SKYBOX</span>
      <button onclick="document.getElementById('skybox-panel').remove()"
        style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px">✕</button>
    </div>
    <div style="padding:12px 14px;display:flex;flex-direction:column;gap:12px">

      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px">REJIM</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          ${MODES.map(([m,ic,nm])=>`
          <button onclick="_skySet('mode','${m}')" style="padding:6px 7px;border-radius:3px;cursor:pointer;
            font-size:9px;font-family:'Share Tech Mono',monospace;text-align:left;
            border:1px solid ${cfg.mode===m?'var(--accent)':'var(--border)'};
            background:${cfg.mode===m?'rgba(var(--accent-rgb),.12)':'none'};
            color:${cfg.mode===m?'var(--accent)':'var(--muted)'}">${ic} ${nm}</button>`).join('')}
        </div>
      </div>

      <div style="height:1px;background:var(--border)"></div>

      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px">🖼 RASM</div>
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:5px">
          <input type="file" accept="image/*" onchange="_skyImage(this)"
            style="flex:1;font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">
          ${cfg.image?`<button onclick="_skyClearImage()" style="padding:3px 8px;border:1px solid var(--red);
            background:none;color:var(--red);font-size:9px;border-radius:3px;cursor:pointer">✕</button>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          ${cfg.image ? `<img src="${cfg.image}" alt=""
            style="width:66px;height:36px;object-fit:cover;border:1px solid var(--border);border-radius:3px;flex-shrink:0">` : ''}
          <div style="font-size:8px;color:${cfg.image?'var(--accent3)':'var(--muted)'};font-family:'Share Tech Mono',monospace;line-height:1.5">
            ${cfg.image ? '✓ ' + (cfg.imageName||'rasm') : 'rasm tanlanmagan'}
            ${cfg.image ? `<br><span style="color:var(--muted)">rejim: ${cfg.mode}</span>` : ''}
          </div>
        </div>
        ${needsImg && !cfg.image ? `<div style="font-size:8px;color:#ffcc44;margin-top:4px;line-height:1.5">
          ⚠ Bu rejim uchun rasm kerak — tanlanmaguncha fon tekis rang bo'lib turadi.</div>`:''}
        ${needsImg ? row('🔄 Burilish', rng('rotation', 0, 360, 1)) +
                     row('☀ Yorqinlik', rng('intensity', 0, 2, 0.05)) +
                     row("📐 O'lcham", rng("size", 60, 900, 10)) : ''}
      </div>

      <div style="height:1px;background:var(--border)"></div>

      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px">
          🌈 RANG ${cfg.mode==='gradient'?'(tepa / past)':''}</div>
        ${row(cfg.mode==='gradient'?'Tepa':'Fon', colorIn('color'))}
        ${cfg.mode==='gradient' ? row('Past', colorIn('color2')) : ''}
        <div style="display:flex;gap:5px;align-items:center;margin-top:6px;flex-wrap:wrap">
          <button onclick="_skyAddCustom()" style="padding:3px 8px;border:1px solid var(--accent3);
            background:rgba(var(--accent3-rgb),.08);color:var(--accent3);font-size:9px;border-radius:3px;cursor:pointer;
            font-family:'Share Tech Mono',monospace">+ Saqlash</button>
          ${_customColors.map((c,i)=>`
          <span style="position:relative;display:inline-block">
            <button onclick="_skySet('color','${c}')" title="${c}"
              style="width:22px;height:22px;border:1px solid var(--border);border-radius:3px;cursor:pointer;background:${c}"></button>
            <button onclick="_skyDelCustom(${i})" title="o'chirish"
              style="position:absolute;top:-6px;right:-6px;width:13px;height:13px;line-height:11px;padding:0;
              border:none;border-radius:50%;background:var(--red);color:#fff;font-size:9px;cursor:pointer">×</button>
          </span>`).join('')}
        </div>
      </div>

      <div style="height:1px;background:var(--border)"></div>

      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px">TAYYOR</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          ${SKIES.map((s,i)=>`
          <button onclick="_skyPreset(${i})" style="padding:4px 8px;border-radius:3px;cursor:pointer;font-size:9px;
            font-family:'Share Tech Mono',monospace;border:1px solid var(--border);color:var(--muted);
            background:linear-gradient(180deg,${_hex(s.top)},${_hex(s.bot)})">${s.name}</button>`).join('')}
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:9px;color:var(--muted);
          font-family:'Share Tech Mono',monospace;margin-bottom:6px">
          <input type="checkbox" ${cfg.stars?'checked':''} onchange="_skySet('stars',this.checked)" style="cursor:pointer"> ✨ Yulduzlar
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:9px;color:var(--muted);
          font-family:'Share Tech Mono',monospace">
          <input type="checkbox" ${cfg.fogOn?'checked':''} onchange="_skySet('fogOn',this.checked)" style="cursor:pointer"> 🌫 Tuman
        </label>
        ${cfg.fogOn ? row('Tuman rangi', colorIn('fogColor')) + row('Quyuqlik', rng('fogDensity', 0, 0.08, 0.001)) : ''}
      </div>

      <div style="height:1px;background:var(--border)"></div>

      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px">⏱ TIMELINE</div>
        <button onclick="if(window.TimelineSystem&&TimelineSystem.addSkyboxKey)TimelineSystem.addSkyboxKey();else log('⚠ Timeline tayyor emas','lw')"
          style="width:100%;padding:6px;border:1px solid var(--accent);background:rgba(var(--accent-rgb),.08);
          color:var(--accent);font-size:9px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">
          🔑 Shu holatni keyframe qilish</button>
        <div style="font-size:8px;color:var(--muted);line-height:1.6;margin-top:5px;font-family:'Share Tech Mono',monospace">
          Bir keyda oq, keyingisida qora qo'ysangiz — rang oradagi vaqtda
          <b style="color:var(--accent3)">silliq</b> o'zgaradi.<br>
          Rejim va rasm esa qadamli almashadi (ularni "yarim" qilib bo'lmaydi).
        </div>
      </div>
    </div>`;

    document.body.appendChild(p);
    if (typeof makeDraggable === 'function') { try { makeDraggable(p, p.firstElementChild); } catch (e) {} }
  }

  return {
    cfg, DEF, SKIES,
    apply, update, showPanel,
    capture, applyState, lerp,
    serialize, restore, reset,
    customColors: () => _customColors.slice(),
  };
})();

// ── Eski API bilan moslik ─────────────────────────────────────
//  ⚠ `toggleSkybox()` ⚙ menyudan va eski sahnalardan chaqiriladi.
//    Endi u rangni aylantirmaydi — TO'LIQ PANELNI ochadi.
window.toggleSkybox = function () { SkyboxSystem.showPanel(); };
window.showSkyboxPanel = window.toggleSkybox;


let starsMesh = null;
function addStars() {
  if (starsMesh) return;
  const geo = new THREE.BufferGeometry();
  const pos = [];
  for (let i=0;i<2000;i++) {
    const r = 200 + Math.random()*100;
    const t = Math.random()*Math.PI*2, p = Math.random()*Math.PI;
    pos.push(r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t));
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  starsMesh = new THREE.Points(geo, new THREE.PointsMaterial({color:0xffffff,size:0.4,transparent:true,opacity:0.8}));
  scene.add(starsMesh);
}
function removeStars() {
  if (starsMesh) { scene.remove(starsMesh); starsMesh=null; }
}
