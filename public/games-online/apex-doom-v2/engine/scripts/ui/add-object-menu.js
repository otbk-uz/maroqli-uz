// ============================================================
// ADD OBJECT MENU
// ============================================================
$('add-obj-btn').onclick = function() {
  const m = document.createElement('div');
  m.classList.add('ui-popup');
m.style.cssText='min-width:160px;display:grid;grid-template-columns:1fr 1fr';
  const rect = this.getBoundingClientRect();
  m.style.left=rect.left+'px';
  m.style.top=(rect.top-320)+'px';
  // Camera option
  const camBtn=document.createElement('button');
  camBtn.textContent='🎥 Kamera';
  camBtn.style.cssText='grid-column:1/-1;background:rgba(var(--accent4-rgb),.08);border:none;border-bottom:1px solid var(--border);color:var(--accent4);padding:7px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;text-align:left';
  camBtn.onclick=()=>{addCameraObject();document.body.removeChild(m)};
  m.appendChild(camBtn);
  // Hitbox option
  if (typeof addHitboxObject === 'function') {
    const hbBtn=document.createElement('button');
    hbBtn.textContent='📦 Hitbox (trigger zonasi)';
    hbBtn.style.cssText='grid-column:1/-1;background:rgba(var(--accent2-rgb),.08);border:none;border-bottom:1px solid var(--border);color:var(--accent2);padding:7px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;text-align:left';
    hbBtn.onclick=()=>{addHitboxObject();document.body.removeChild(m)};
    m.appendChild(hbBtn);
  }
  // Interactive Button option
  if (typeof addInteractiveButton === 'function') {
    const ibBtn=document.createElement('button');
    ibBtn.textContent='🔘 Interactive Tugma';
    ibBtn.style.cssText='grid-column:1/-1;background:rgba(var(--accent-rgb),.08);border:none;border-bottom:1px solid var(--border);color:var(--accent);padding:7px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;text-align:left';
    ibBtn.onclick=()=>{addInteractiveButton();document.body.removeChild(m)};
    m.appendChild(ibBtn);
  }
  PRIMITIVES.forEach((p,i)=>{
    const b=document.createElement('button');
    b.textContent=p.name;
    b.classList.add('ui-menu-item');b.style.padding='7px 12px';
    b.onmouseover=()=>b.style.background='var(--hover)';
    b.onmouseout=()=>b.style.background='none';
    b.onclick=()=>{
      const tex = p.fixedTex !== undefined ? p.fixedTex : Math.floor(Math.random()*TEXTURES.length);
      addObject(i, tex);
      document.body.removeChild(m);
    };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener('click',function rm(){if(m.parentNode)m.parentNode.removeChild(m);document.removeEventListener('click',rm)},100));
};

// ASSETS TAB
// Primitives grid
const assetGrid = $('asset-cat-primitives') || $('asset-grid');
PRIMITIVES.forEach((p,i)=>{
  const a=document.createElement('div');
  a.className='asset-item';
  const icons=['⬛','⚫','🔵','🔺','🔻','⭕','💎','✨','⬜','▭','🔻'];
  a.innerHTML=`<span class="ai">${icons[i]||'▪'}</span>${p.name}`;
  a.onclick=()=>{
    const tex = p.fixedTex !== undefined ? p.fixedTex : Math.floor(Math.random()*TEXTURES.length);
    addObject(i, tex);
  };
  assetGrid.appendChild(a);
});

// 💻 PC — Shakl bo'limiga qo'shamiz (oddiy shakl kabi)
(function () {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag || typeof addPCBlock !== 'function') return;
  const it = document.createElement('div');
  it.className = 'asset-item';
  it.innerHTML = `<span class="ai">💻</span>PC`;
  it.onclick = () => addPCBlock();
  ag.appendChild(it);
})();

// Camera asset — primitives ga qo'shamiz
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  const camItem = document.createElement('div');
  camItem.className = 'asset-item';
  camItem.innerHTML = '<span class="ai">🎥</span>Kamera';
  camItem.style.borderColor = 'rgba(var(--accent4-rgb),.3)';
  camItem.style.color = 'var(--accent4)';
  camItem.onclick = () => addCameraObject();
  ag.appendChild(camItem);
})();

// Hitbox asset — primitives ga qo'shamiz
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  if (typeof addHitboxObject !== 'function') return;
  const hbItem = document.createElement('div');
  hbItem.className = 'asset-item';
  hbItem.innerHTML = '<span class="ai">📦</span>Hitbox';
  hbItem.style.borderColor = 'rgba(var(--accent2-rgb),.35)';
  hbItem.style.color = 'var(--accent2)';
  hbItem.title = 'Trigger zonasi — kirganda amal ishlaydi';
  hbItem.onclick = () => addHitboxObject();
  ag.appendChild(hbItem);
})();

// Interactive Button asset — pritsel + ketma-ket animatsiyalar
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  if (typeof addInteractiveButton !== 'function') return;
  const btnItem = document.createElement('div');
  btnItem.className = 'asset-item';
  btnItem.innerHTML = '<span class="ai">🔘</span>Tugma';
  btnItem.style.borderColor = 'rgba(var(--accent-rgb),.35)';
  btnItem.style.color = 'var(--accent)';
  btnItem.title = 'Interactive Tugma — pritsel, ketma-ket animatsiyalar';
  btnItem.onclick = () => addInteractiveButton();
  ag.appendChild(btnItem);
})();

// 👁 Qarash bloki asset — qaralganda ishga tushadi
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  if (typeof addGazeTrigger !== 'function') return;
  const gzItem = document.createElement('div');
  gzItem.className = 'asset-item';
  gzItem.innerHTML = '<span class="ai">👁</span>Qarash';
  gzItem.style.borderColor = 'rgba(var(--accent-rgb),.35)';
  gzItem.style.color = 'var(--accent)';
  gzItem.title = 'Qarash bloki — o\'yinchi qaraganda (yoki qaramay qo\'yganda) animatsiya/sound/PC ishga tushadi';
  gzItem.onclick = () => addGazeTrigger();
  ag.appendChild(gzItem);
})();

// Map Loader asset — karta almashtirish trigger zonasi
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  if (typeof addMapLoader !== 'function') return;
  const mlItem = document.createElement('div');
  mlItem.className = 'asset-item';
  mlItem.innerHTML = '<span class="ai">🗺</span>Map Loader';
  mlItem.style.borderColor = 'rgba(var(--accent3-rgb),.35)';
  mlItem.style.color = 'var(--accent3)';
  mlItem.title = 'Karta almashtirish zonasi — kirganda yangi karta yuklanadi';
  mlItem.onclick = () => addMapLoader();
  ag.appendChild(mlItem);
})();

// Sound Block asset — ovoz zonasi
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  if (typeof addSoundBlock !== 'function') return;
  const sbItem = document.createElement('div');
  sbItem.className = 'asset-item';
  sbItem.innerHTML = '<span class="ai">🔊</span>Sound Block';
  sbItem.style.borderColor = 'rgba(var(--accent2-rgb),.35)';
  sbItem.style.color = 'var(--accent2)';
  sbItem.title = 'Ovoz zonasi — kirganda ovoz chiqadi';
  sbItem.onclick = () => addSoundBlock();
  ag.appendChild(sbItem);
})();

// 🏁 Start / Finish bloklari
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  const mk = (fn, icon, label, col, tip) => {
    if (typeof window[fn] !== 'function') return;
    const it = document.createElement('div');
    it.className = 'asset-item';
    it.innerHTML = `<span class="ai">${icon}</span>${label}`;
    it.style.borderColor = col + '77';
    it.style.color = col;
    it.title = tip;
    it.onclick = () => window[fn]();
    ag.appendChild(it);
  };
  mk('addStartBlock',  '🟢', 'Start',  'var(--accent3)',
     "O'yin boshlanganda animatsiya / rasm / video / HTML ko'rsatadi");
  mk('addFinishBlock', '🔴', 'Finish', '#ff3355',
     "O'yin tugaganda ko'rsatadi va boshqa sahifaga o'tkazadi");
})();

// 🔫 Gravity Gun asset — yerda yotadigan qurol, o'yinchi olib ishlatadi
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  if (typeof addGravityGun !== 'function') return;
  const ggItem = document.createElement('div');
  ggItem.className = 'asset-item';
  ggItem.innerHTML = '<span class="ai">🔫</span>Gravity Gun';
  ggItem.style.borderColor = 'rgba(var(--accent-rgb),.45)';
  ggItem.style.color = 'var(--accent)';
  ggItem.title = 'Gravity Gun — yaqinlashib tugmani bossa qo\'lga oladi, fizik jismlarni ko\'taradi/otadi';
  ggItem.onclick = () => addGravityGun();
  ag.appendChild(ggItem);
})();

// 🪜 Narvon asset — o'yinchi yopishib tepaga/pastga chiqadi
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  if (typeof addLadder !== 'function') return;
  const ldItem = document.createElement('div');
  ldItem.className = 'asset-item';
  ldItem.innerHTML = '<span class="ai">🪜</span>Narvon';
  ldItem.style.borderColor = 'rgba(255,204,34,.4)';
  ldItem.style.color = '#ffcc22';
  ldItem.title = 'Narvon — o\'yinchi oldiga borsa yopishadi, W tepaga S pastga, E tushish';
  ldItem.onclick = () => addLadder();
  ag.appendChild(ldItem);
})();

window.switchLeftTab = function(tab, el) {
  document.querySelectorAll('#left-col .ptab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  $('tab-hier').style.display   = tab==='hier'   ? 'flex' : 'none';
  $('tab-assets').style.display = tab==='assets' ? 'flex' : 'none';
};


// 🔢 MiniPad — kombinatsiyali qulf
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  if (typeof addMiniPad !== 'function') return;
  const it = document.createElement('div');
  it.className = 'asset-item';
  it.innerHTML = '<span class="ai">🔢</span>MiniPad';
  it.style.borderColor = 'rgba(var(--accent-rgb),.35)';
  it.style.color = 'var(--accent)';
  it.title = 'MiniPad — kombinatsiyali qulf: parol to\'g\'ri bo\'lsa animatsiya/ovoz ishga tushadi';
  it.onclick = () => addMiniPad();
  ag.appendChild(it);
})();


// 🎛 AllKey zonasi — ASSETLAR → Shakl
//  ⚠ 🎯 Hitbox yonida turadi: ikkalasi ham TRIGGER hudud va
//    dizayner ularni birga qidiradi.
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag || typeof addAllKeyZone !== 'function') return;
  const it = document.createElement('div');
  it.className = 'asset-item';
  it.innerHTML = '<span class="ai">🎛</span>AllKey';
  it.style.borderColor = 'rgba(122,92,255,.45)';
  it.style.color = '#9b86ff';
  it.title = "AllKey — o'yinchi shu hududga kirsa klaviatura boshqacha ishlaydi: " +
             "klavish bloklash, ovoz/animatsiya almashtirish, 🔢 son miqdori, " +
             "🖥 ekran tugmalari, kapsula, sichqoncha, kamera";
  it.onclick = () => addAllKeyZone();
  ag.appendChild(it);
})();

// 🧊 NoScript blok — ASSETLAR → Primitivlar
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag || typeof addNoScriptBlock !== 'function') return;
  const it = document.createElement('div');
  it.className = 'asset-item';
  it.innerHTML = '<span class="ai">🧊</span>NoScript';
  it.style.borderColor = 'rgba(var(--accent3-rgb),.35)';
  it.style.color = 'var(--accent3)';
  it.title = "NoScript blok — raqam nishonga yetganda animatsiya va musiqa ishga tushadi";
  it.onclick = () => addNoScriptBlock();
  ag.appendChild(it);
})();
