// ============================================================
// ASSET CATEGORY SYSTEM
// ============================================================
const loadedModels = [];

window.assetShowCat = function(cat, btn) {
  document.querySelectorAll('.asset-cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['primitives','entities','prefabs','models','buttons','addons'].forEach(c => {
    const el = $('asset-cat-' + c);
    if (el) el.style.display = c === cat ? '' : 'none';
  });
  if (cat === 'prefabs') prefabRenderList();
  if (cat === 'addons' && typeof addonRenderList === 'function') addonRenderList();
  //  ⌨🖥 Ekran tugmalari shablonlari
  if (cat === 'buttons' && typeof btnTplRenderList === 'function') btnTplRenderList();
};
