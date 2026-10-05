// KEYBOARD SHORTCUTS
document.addEventListener('keydown', e=>{
  if (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;

  // ── PLAY MODE — faqat F5/Esc ishlaydi, WASD ni PlayerController ga o'tkazamiz ──
  if (isPlaying) {
    // ⚠ EKSPORT QILINGAN O'YINDA — o'yinni to'xtatib bo'lmaydi.
    //   Ilgari Esc `play-btn` ni bosib o'yinni to'xtatardi va ekranda
    //   yashirin redaktor qolardi (orbit kamera, o'yinchi yo'q) —
    //   foydalanuvchi uchun bu "o'yin buzildi" degani.
    //   ⚠ Esc KLAVISHI yutilmaydi: u pastdagi tizimlarga o'tishi kerak
    //     (PC blokdan chiqish, intro rolikni o'tkazish). Faqat
    //     TO'XTATISH yo'li berk. `GameLock` `play-btn` ni ham o'raydi —
    //     bu ikkinchi qavat, biri buzilsa ikkinchisi ushlab qoladi.
    if (!window.APEX_GAME) {
      if (e.key === 'F5') { e.preventDefault(); $('play-btn')?.click(); return; }
      if (e.key === 'Escape') { $('play-btn')?.click(); return; }
    }
    // Boshqa barcha tugmalar PlayerController._onKey ga o'tsin (stopImmediatePropagation YO'Q!)
    return;
  }

  // ── EDIT MODE (ob'ektga yopishgan holat) ──────────────────
  if (editMode.active) {
    editModeKeyDown(e);
    return;
  }

  // FPS rejimda — faqat Escape ishlaydi
  if (camMode==='fps') {
    if (e.key==='Escape') { setCamMode('orbit'); document.exitPointerLock?.(); }
    return;
  }

  // Quyidagilar faqat ORBIT/normal rejimda ishlaydi:
  if (e.key==='Delete'||e.key==='Backspace') {
    if (multiSelected.size > 0) window.multiDelete?.();
    else window.deleteSel?.();
  }
  if ((e.key==='f'||e.key==='F') && !e.ctrlKey) {
    // ⚠ Yorug'lik tanlanganda `selectedObj` NULL bo'ladi
    //   (`selectLight()` uni ataylab tozalaydi). Ilgari shart faqat
    //   `selectedObj` ga qarardi — shuning uchun F yorug'liklarga
    //   umuman ishlamasdi.
    //
    //   Tanlovni `enterEditMode()` ning O'ZI qiladi: obyekt bormi —
    //   obyekt, yo'qmi — yorug'lik. Shart ikki joyda turmasin.
    if (selectedObj || (typeof selectedLight !== 'undefined' && selectedLight)) enterEditMode();
  }
  if (e.ctrlKey && (e.key==='d'||e.key==='D')) {
    e.preventDefault();
    if (multiSelected.size > 1) window.multiDuplicate?.();
    else window.duplicateSel?.();
  }
  if (e.ctrlKey && (e.key==='f'||e.key==='F')) {
    e.preventDefault();
    if (multiSelected.size > 1) window.multiGroup?.();
    else if (selectedObj) log('⚠ Ctrl+F: kamida 2 ta obyektni Shift+click bilan tanlang', 'lw');
  }
  // ── 💾 Ctrl+S ────────────────────────────────────────────
  //  ⚠ Loyiha OCHIQ bo'lsa — o'sha papkaga yozadi, ZIP yuklamaydi.
  //    Ilgari u har safar `apex-file.zip` ni yuklab olardi: to'liq
  //    dvigatelda bu noqulay — dizayner Ctrl+S bosib ishlashda
  //    davom etmoqchi, brauzer esa har safar fayl so'raydi va
  //    Downloads o'nlab nusxa bilan to'lardi.
  //
  //  ⚠ Loyiha ochilmagan bo'lsa PANEL ochiladi — nom so'ralishi
  //    kerak. Jimgina ZIP yuklab qo'ysak dizayner "saqlandi" deb
  //    o'ylab, loyiha papkasi esa yaratilmagan bo'lardi.
  if (e.ctrlKey && (e.key==='s'||e.key==='S')) {
    e.preventDefault();
    const PS = window.ProjectSystem;
    if (PS && PS.cfg.name) PS.save(PS.cfg.name, false);
    else if (window.showProjectPanel) window.showProjectPanel();
    else window.saveScene?.();
  }
  // Ctrl+Shift+S — eski xulq: ZIP faylni yuklab olish
  if (e.ctrlKey && e.shiftKey && (e.key==='s'||e.key==='S')) {
    e.preventDefault(); window.saveScene?.();
  }
  if (e.ctrlKey && (e.key==='z'||e.key==='Z') && !e.shiftKey) { e.preventDefault(); window.undo?.(); }
  if (e.ctrlKey && (e.key==='y'||e.key==='Y' || (e.key==='z'&&e.shiftKey))) { e.preventDefault(); window.redo?.(); }
  if (e.ctrlKey && (e.key==='p'||e.key==='P')) { e.preventDefault(); window.takeScreenshot?.(); }
  // F5 — O'yna/To'xtat
  if (e.key==='F5') { e.preventDefault(); $('play-btn')?.click(); }
  // F11 — Fullscreen
  if (e.key==='F11') { e.preventDefault(); window.toggleFullscreen?.(); }
  // C — Collider viz toggle
  if (!e.ctrlKey && (e.key==='c'||e.key==='C') && !isPlaying) { window.toggleColliderVis?.(); }
  // G — Grid snap toggle
  if (!e.ctrlKey && (e.key==='g'||e.key==='G') && !isPlaying) { EditorTools.toggleSnap(); }
  if (!e.ctrlKey) {
    // Editor modeda gizmo shortcuts: 1=select 2=move 3=rotate 4=scale
    if (e.key==='1') setGizmoMode('select');
    if (e.key==='2') setGizmoMode('move');
    if (e.key==='3') setGizmoMode('rotate');
    if (e.key==='4') setGizmoMode('scale');
    // I — Timeline keyframe qo'shish
    if (e.key==='i'||e.key==='I') {
      window.tlAddKeyframe?.();
    }
    if (e.code==='Space') e.preventDefault();
  }
});
