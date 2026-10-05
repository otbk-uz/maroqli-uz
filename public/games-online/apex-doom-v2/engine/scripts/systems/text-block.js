// ============================================================
// 📝 TEXT BLOCK — 3D matn bloki
// ------------------------------------------------------------
//  Kub kabi obyekt, lekin ichida matn turadi. 2 xil rejim:
//
//   👁 FACE   — doim kameraga qaraydi. Pastdan/tepadan/yonidan —
//               farqi yo'q, yozuv har doim to'g'ri o'qiladi (billboard).
//   📌 O'ZBOSHIMCHA — qayerga qaratilgan bo'lsa o'sha yerda turadi.
//               Kamera qancha burilmasin — u joyidan qimirlamaydi.
//
//  Timeline: pos/rot/scale + MATN keyframe. "Salom" qo'yib, boshqa
//  keyga o'tib "O'yinchi" desangiz — o'sha keyga kelganda almashadi.
//  O'zgarish turi: ⚡ Oddiy / 🔲 Qattiq / 🌊 Silliq.
//
//  Matn Canvas orqali chiziladi (TextGeometry emas) — shuning uchun
//  o'zbek harflari (o', g', ʻ), kirill va emoji ham muammosiz ishlaydi,
//  matnni runtime'da almashtirish esa bir zumda bo'ladi.
// ============================================================

const TextBlockSystem = (() => {

  const MAXW = 2048;          // canvas maksimal kengligi
  const PAD  = 24;            // matn atrofidagi bo'shliq (px)

  // ── Standart sozlamalar ─────────────────────────────────────
  function defaults() {
    return {
      isTextBlock: true,
      text:        'Salom',
      faceMode:    'face',      // 'face' (billboard) | 'fixed' (o'zboshimcha)
      fontSize:    110,
      bold:        true,
      color:       'var(--accent)',
      bgColor:     '#000814',
      bgOpacity:   0.0,
      outline:     true,
      align:       'center',
      textEase:    'smooth',    // 'instant' | 'hard' | 'smooth'
      textFade:    0.4,         // o'zgarish davomiyligi (soniya)
      colliderMode:'inline',    // matn bloki to'siq bo'lmasin
      platformMode:'off',
    };
  }

  // ── Canvas'ga matn chizish → tekstura ───────────────────────
  function redraw(mesh) {
    if (!mesh || !mesh.userData || !mesh.userData.isTextBlock) return;
    const ud = mesh.userData;

    // 🔤 `{random}` — 🔢 MiniPad paroli bilan almashadi.
    //  ⚠ `ud.text` NING O'ZI o'zgartirilmaydi: u dizayner yozgan
    //    shablon bo'lib qolishi kerak. Almashtirish faqat chizishda —
    //    aks holda birinchi chizishdayoq shablon yo'qolib, keyingi
    //    parol yangilanishida yozuv qotib qolardi.
    const _raw = String(ud.text ?? '');
    const lines = (window.MiniPadSystem ? MiniPadSystem.resolve(_raw) : _raw).split('\n');
    const fs     = Math.max(8, ud.fontSize || 110);
    const weight = ud.bold ? '700' : '400';
    const font   = `${weight} ${fs}px "Share Tech Mono", "Courier New", monospace`;

    // 1) O'lchash
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font;
    let w = 0;
    lines.forEach(l => { w = Math.max(w, meas.measureText(l || ' ').width); });
    const lineH = fs * 1.25;
    let cw = Math.ceil(w + PAD * 2);
    let ch = Math.ceil(lineH * lines.length + PAD * 2);

    // Juda keng bo'lsa — proporsional kichraytirish
    let sc = 1;
    if (cw > MAXW) { sc = MAXW / cw; cw = MAXW; ch = Math.ceil(ch * sc); }

    // 2) Chizish
    const cv = document.createElement('canvas');
    cv.width = Math.max(4, cw); cv.height = Math.max(4, ch);
    const g = cv.getContext('2d');
    g.scale(sc, sc);

    if ((ud.bgOpacity ?? 0) > 0) {
      g.globalAlpha = ud.bgOpacity;
      g.fillStyle = ud.bgColor || '#000814';
      g.fillRect(0, 0, cw / sc, ch / sc);
      g.globalAlpha = 1;
    }

    g.font = font;
    g.textBaseline = 'middle';
    g.textAlign = ud.align || 'center';
    const xPos = ud.align === 'left'  ? PAD
               : ud.align === 'right' ? (cw / sc - PAD)
               : (cw / sc) / 2;

    lines.forEach((l, i) => {
      const y = PAD + lineH * (i + 0.5);
      if (ud.outline) {
        g.lineWidth   = Math.max(2, fs * 0.08);
        g.strokeStyle = 'rgba(0,0,0,.85)';
        g.lineJoin    = 'round';
        g.strokeText(l, xPos, y);
      }
      g.fillStyle = ud.color || 'var(--accent)';
      g.fillText(l, xPos, y);
    });

    // 3) Tekstura
    const tex = new THREE.CanvasTexture(cv);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in tex && THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    tex.needsUpdate = true;

    const old = mesh.material.map;
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
    if (old && old.dispose) old.dispose();

    // 4) Geometriyani matn nisbatiga moslash (balandlik = 1 birlik).
    //    scale.y = 1 → matn 1 metr balandlikda. Timeline scale'i shu ustidan ishlaydi.
    const aspect = cv.width / cv.height;
    if (Math.abs((ud._aspect ?? 0) - aspect) > 0.001) {
      const og = mesh.geometry;
      mesh.geometry = new THREE.PlaneGeometry(aspect, 1);
      if (og && og.dispose) og.dispose();
      ud._aspect = aspect;
    }
  }

  // ── Yaratish ────────────────────────────────────────────────
  function create(pos) {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true, side: THREE.DoubleSide,
      depthWrite: false, toneMapped: false, opacity: 1,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), mat);
    mesh.userData = Object.assign({ id: ++objIdC, name: 'Matn ' + objIdC, type: 'TextBlock' }, defaults());
    mesh.castShadow = false; mesh.receiveShadow = false;

    mesh.position.copy(pos || new THREE.Vector3(0, 2, 0));
    redraw(mesh);

    scene.add(mesh);
    objects.push(mesh);
    if (typeof _markLoopCacheDirty === 'function') _markLoopCacheDirty();
    updateHierarchy(); updateStats(); selectObject(mesh);
    log(`📝 "${mesh.userData.name}" qo'shildi — 👁 Face rejimi`, 'lok');
    return mesh;
  }

  // ── Matnni o'rnatish (o'zgarish effekti bilan) ──────────────
  //  mode: 'instant' | 'hard' | 'smooth' (berilmasa — blokning o'z sozlamasi)
  function setText(mesh, txt, mode) {
    if (!mesh || !mesh.userData || !mesh.userData.isTextBlock) return;
    const ud = mesh.userData;
    txt = String(txt ?? '');
    if (ud.text === txt) return;

    const m = mode || ud.textEase || 'smooth';
    if (m === 'instant') { ud.text = txt; redraw(mesh); return; }

    // Qattiq/Silliq — o'chib, almashib, yonadi
    ud._fade = {
      t: 0,
      dur: Math.max(0.05, ud.textFade ?? 0.4),
      next: txt,
      swapped: false,
      linear: (m === 'hard'),
    };
  }

  // ── Har frame ───────────────────────────────────────────────
  const _q = new THREE.Quaternion();

  function update(delta) {
    if (typeof objects === 'undefined' || typeof camera === 'undefined') return;

    for (let i = 0; i < objects.length; i++) {
      const o  = objects[i];
      const ud = o.userData;
      if (!ud || !ud.isTextBlock) continue;

      // ── 👁 FACE — doim kameraga qaraydi (billboard) ──
      // Papka/prefab ichida bo'lsa ham to'g'ri ishlashi uchun ona
      // aylanishini teskari ko'paytiramiz (world → local).
      if (ud.faceMode !== 'fixed') {
        o.quaternion.copy(camera.quaternion);
        if (o.parent && o.parent.isObject3D && o.parent !== scene) {
          o.parent.getWorldQuaternion(_q);
          o.quaternion.premultiply(_q.invert());
        }
      }
      // 📌 O'ZBOSHIMCHA — hech narsa qilmaymiz, o'z rotation'ida qoladi.

      // ── Matn o'zgarish animatsiyasi ──
      const f = ud._fade;
      if (f) {
        f.t += delta;
        const p = Math.min(1, f.t / f.dur);
        if (!f.swapped && p >= 0.5) { ud.text = f.next; redraw(o); f.swapped = true; }
        // 0 → 0.5: o'chadi | 0.5 → 1: yonadi
        let a = p < 0.5 ? (1 - p * 2) : ((p - 0.5) * 2);
        if (!f.linear) a = a < .5 ? 2*a*a : -1 + (4 - 2*a) * a;   // silliq
        o.material.opacity = Math.max(0, Math.min(1, a));
        if (p >= 1) { ud._fade = null; o.material.opacity = 1; }
      }
    }
  }

  // ── Timeline yordamchisi: kfs ichidagi matn o'zgarishlari ───
  //  Qaytaradi: {txt, op} — berilgan vaqtdagi matn va shaffoflik.
  function textStateAt(kfs, t, mode, fade) {
    const chs = [];
    let last;
    for (const k of kfs) {
      if (k.txt === undefined) continue;
      if (k.txt !== last) { chs.push({ t: k.time, txt: k.txt }); last = k.txt; }
    }
    if (!chs.length) return null;

    let idx = 0;
    for (let i = 0; i < chs.length; i++) if (t >= chs[i].t) idx = i;
    const cur  = chs[idx];
    const next = chs[idx + 1];

    if (mode === 'instant') return { txt: cur.txt, op: 1 };

    const half = Math.max(0.02, (fade ?? 0.4) / 2);
    const ez   = mode === 'hard' ? (x => x) : (x => x < .5 ? 2*x*x : -1 + (4 - 2*x) * x);

    // Keyingi o'zgarishdan oldin — o'chadi
    if (next && t > next.t - half) {
      const p = Math.max(0, Math.min(1, (t - (next.t - half)) / half));
      return { txt: cur.txt, op: 1 - ez(p) };
    }
    // Joriy o'zgarishdan keyin — yonadi
    if (idx > 0 && t < cur.t + half) {
      const p = Math.max(0, Math.min(1, (t - cur.t) / half));
      return { txt: cur.txt, op: ez(p) };
    }
    return { txt: cur.txt, op: 1 };
  }

  // ── Tiklash — saqlangan sahna / prefab dan yuklanganda ──────
  //  Yuklovchi oddiy kub geometriya + Standard material yaratadi.
  //  Bu yerda uni matn plane'iga aylantiramiz.
  function restore(mesh) {
    const ud = mesh && mesh.userData;
    if (!ud || !ud.isTextBlock) return;
    const om = mesh.material;
    mesh.material = new THREE.MeshBasicMaterial({
      transparent: true, side: THREE.DoubleSide,
      depthWrite: false, toneMapped: false, opacity: 1,
    });
    if (om && om.dispose) om.dispose();
    mesh.castShadow = false; mesh.receiveShadow = false;
    // Standart qiymatlarni to'ldirish (eski fayllar uchun)
    const d = defaults();
    for (const k in d) if (ud[k] === undefined) ud[k] = d[k];
    ud._aspect = 0;          // geometriyani majburan qayta qurish
    ud._fade   = null;
    redraw(mesh);
    return mesh;
  }

  return { create, redraw, restore, setText, update, defaults, textStateAt };
})();

window.TextBlockSystem = TextBlockSystem;
window.addTextBlock = function () {
  // Kamera oldida paydo bo'lsin
  const p = new THREE.Vector3(0, 2, 0);
  if (typeof camera !== 'undefined' && camera) {
    p.set(camera.position.x + Math.sin(camera.rotation.y) * -4,
          Math.max(1, camera.position.y),
          camera.position.z + Math.cos(camera.rotation.y) * -4);
  }
  return TextBlockSystem.create(p);
};

// ── Inspector sozlagichlari ───────────────────────────────────
window._tbSet = function (key, val) {
  if (!selectedObj || !selectedObj.userData.isTextBlock) return;
  selectedObj.userData[key] = val;
  TextBlockSystem.redraw(selectedObj);
  if (key === 'faceMode' || key === 'textEase') updateInspector();
};

window._tbSetText = function (val) {
  if (!selectedObj || !selectedObj.userData.isTextBlock) return;
  selectedObj.userData.text = String(val);
  TextBlockSystem.redraw(selectedObj);
};

window._tbPreview = function () {
  if (!selectedObj || !selectedObj.userData.isTextBlock) return;
  const ud = selectedObj.userData;
  const cur = ud.text;
  TextBlockSystem.setText(selectedObj, cur + ' ✓', ud.textEase);
  setTimeout(() => TextBlockSystem.setText(selectedObj, cur, ud.textEase), 900);
};

// ── INSPECTOR ─────────────────────────────────────────────────
function buildTextBlockInspector(o) {
  const ic = document.getElementById('inspector-content');
  if (!ic) return;
  const ud = o.userData;
  const p = o.position, r = o.rotation, s = o.scale;
  const isFace = ud.faceMode !== 'fixed';

  const modeBtn = (active, on, ico, lbl, col) => `
    <button onclick="${on}" style="background:${active ? col + '26' : 'transparent'};
      border:1px solid ${active ? col : 'var(--border)'};color:${active ? col : 'var(--muted)'};
      padding:7px 3px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;
      font-size:9px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:2px">
      <span style="font-size:15px">${ico}</span><span>${lbl}</span></button>`;

  const num = (lbl, val, step, key, min, max) => `
    <div class="fr"><span class="fl">${lbl}</span>
      <input class="fv" type="number" step="${step}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''}
        value="${val}" oninput="window._tbSet('${key}', parseFloat(this.value)||0)"></div>`;

  ic.innerHTML = `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:#ffcc00;color:#001">TXT</span>Matn Bloki</div>
      <div class="fr"><span class="fl">Nom</span>
        <input class="fv" value="${ud.name || ''}" oninput="window._renameObj(this.value)"></div>
      <div style="font-size:9px;color:var(--muted);margin:6px 0 3px;font-family:'Share Tech Mono',monospace">MATN <span style="color:var(--border)">(Enter = yangi qator)</span></div>
      <textarea id="tb-text" oninput="window._tbSetText(this.value)" spellcheck="false" style="
        width:100%;min-height:56px;background:rgba(0,0,0,.35);border:1px solid var(--border);
        color:var(--text);border-radius:3px;padding:6px 8px;font-family:'Share Tech Mono',monospace;
        font-size:12px;resize:vertical;outline:none">${(ud.text ?? '').replace(/</g, '&lt;')}</textarea>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">MODE</span>Qarash Rejimi</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:4px">
        ${modeBtn(isFace,  "window._tbSet('faceMode','face')",  '👁', 'FACE',        'var(--accent)')}
        ${modeBtn(!isFace, "window._tbSet('faceMode','fixed')", '📌', "O'ZBOSHIMCHA", '#ffcc00')}
      </div>
      <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 7px;background:rgba(0,0,0,.2);border-radius:2px">
        ${isFace
          ? '👁 <b style="color:var(--accent)">FACE</b> — doim kameraga qaraydi. Pastdan, tepadan, yonidan — yozuv har doim to\'g\'ri o\'qiladi.'
          : '📌 <b style="color:#ffcc00">O\'ZBOSHIMCHA</b> — qayerga qaratsangiz o\'sha yerda turadi. Kamera burilsa ham joyidan qimirlamaydi.<br><span style="color:var(--border)">Rotatsiyani pastdagi Transform dan bering.</span>'}
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">STYLE</span>Ko'rinish</div>
      <div class="fr"><span class="fl">Rang</span>
        <input type="color" value="${ud.color || 'var(--accent)'}" oninput="window._tbSet('color', this.value)"
          style="width:100%;height:22px;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer"></div>
      ${num('Shrift o\'lchami', ud.fontSize ?? 110, 2, 'fontSize', 8)}
      <div class="fr"><span class="fl">Qalin</span>
        <input type="checkbox" ${ud.bold ? 'checked' : ''} onchange="window._tbSet('bold', this.checked)"></div>
      <div class="fr"><span class="fl">Qora kontur</span>
        <input type="checkbox" ${ud.outline ? 'checked' : ''} onchange="window._tbSet('outline', this.checked)"></div>
      <div class="fr"><span class="fl">Tekislash</span>
        <select class="fv" onchange="window._tbSet('align', this.value)">
          <option value="left"   ${ud.align === 'left'   ? 'selected' : ''}>Chapga</option>
          <option value="center" ${(ud.align ?? 'center') === 'center' ? 'selected' : ''}>Markazga</option>
          <option value="right"  ${ud.align === 'right'  ? 'selected' : ''}>O'ngga</option>
        </select></div>
      <div class="fr"><span class="fl">Fon rangi</span>
        <input type="color" value="${ud.bgColor || '#000814'}" oninput="window._tbSet('bgColor', this.value)"
          style="width:100%;height:22px;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer"></div>
      <div class="fr"><span class="fl">Fon shaffofligi</span>
        <input type="range" min="0" max="1" step="0.05" value="${ud.bgOpacity ?? 0}" style="flex:1"
          oninput="window._tbSet('bgOpacity', parseFloat(this.value))"></div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:var(--accent4);color:#001">ANIM</span>Matn O'zgarish Turi
        <span style="font-size:8px;color:var(--muted);margin-left:4px">— Timeline / hitbox / tugma uchun</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:4px">
        ${modeBtn(ud.textEase === 'instant', "window._tbSet('textEase','instant')", '⚡', 'ODDIY',  '#66ccff')}
        ${modeBtn(ud.textEase === 'hard',    "window._tbSet('textEase','hard')",    '🔲', 'QATTIQ', '#ff8844')}
        ${modeBtn((ud.textEase ?? 'smooth') === 'smooth', "window._tbSet('textEase','smooth')", '🌊', 'SILLIQ', '#55ff88')}
      </div>
      <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;font-family:'Share Tech Mono',monospace;padding:5px 7px;background:rgba(0,0,0,.2);border-radius:2px">
        ${ud.textEase === 'instant'
          ? '⚡ <b style="color:#66ccff">ODDIY</b> — keyga yetganda matn <b>darhol</b> almashadi. Effekt yo\'q.'
          : ud.textEase === 'hard'
            ? '🔲 <b style="color:#ff8844">QATTIQ</b> — chiziqli o\'chib-yonish. Keskin, mexanik.'
            : '🌊 <b style="color:#55ff88">SILLIQ</b> — yumshoq so\'nib, yumshoq paydo bo\'ladi (ease-in-out).'}
      </div>
      ${ud.textEase === 'instant' ? '' : `
      <div class="fr" style="margin-top:5px"><span class="fl">Davomiyligi (s)</span>
        <input class="fv" type="number" step="0.05" min="0.05" value="${(ud.textFade ?? 0.4).toFixed(2)}"
          oninput="window._tbSet('textFade', Math.max(0.05, parseFloat(this.value)||0.4))"></div>`}
      <button onclick="window._tbPreview()" style="width:100%;margin-top:6px;padding:7px;
        background:rgba(var(--accent4-rgb),.12);border:1px solid rgba(var(--accent4-rgb),.4);color:var(--accent4);
        font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;border-radius:3px;cursor:pointer">
        ▶ O'zgarishni ko'rish</button>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">XFORM</span>Transform</div>
      <div class="fr"><span class="fl">Poz</span>
        <input class="fv" id="px" type="number" step="0.1" value="${p.x.toFixed(2)}" oninput="applyT()">
        <input class="fv" id="py" type="number" step="0.1" value="${p.y.toFixed(2)}" oninput="applyT()">
        <input class="fv" id="pz" type="number" step="0.1" value="${p.z.toFixed(2)}" oninput="applyT()"></div>
      <div class="fr"><span class="fl">O'lcham</span>
        <input class="fv" id="sx" type="number" step="0.1" value="${s.x.toFixed(2)}" oninput="applyT()">
        <input class="fv" id="sy" type="number" step="0.1" value="${s.y.toFixed(2)}" oninput="applyT()">
        <input class="fv" id="sz" type="number" step="0.1" value="${s.z.toFixed(2)}" oninput="applyT()"></div>
      ${isFace ? `<div style="font-size:8px;color:var(--border);margin-top:4px;font-family:'Share Tech Mono',monospace">
        ⓘ Face rejimida rotatsiya kamera tomonidan boshqariladi.</div>`
      : `<div class="fr"><span class="fl">Burchak°</span>
        <input class="fv" type="number" step="5" value="${(r.x*180/Math.PI).toFixed(0)}" oninput="selectedObj.rotation.x=this.value*Math.PI/180">
        <input class="fv" type="number" step="5" value="${(r.y*180/Math.PI).toFixed(0)}" oninput="selectedObj.rotation.y=this.value*Math.PI/180">
        <input class="fv" type="number" step="5" value="${(r.z*180/Math.PI).toFixed(0)}" oninput="selectedObj.rotation.z=this.value*Math.PI/180"></div>`}
      <div style="font-size:8px;color:var(--muted);margin-top:5px;line-height:1.5;font-family:'Share Tech Mono',monospace">
        ⏱ Timeline'da <b style="color:var(--accent)">◆ Key</b> bosing — pozitsiya, o'lcham <b>va matn</b> birga yoziladi.
      </div>
    </div>`;
}
window.buildTextBlockInspector = buildTextBlockInspector;
