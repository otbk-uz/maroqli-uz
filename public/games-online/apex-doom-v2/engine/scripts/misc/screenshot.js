// ============================================================
// SCREENSHOT
// ============================================================
window.takeScreenshot = function() {
  // ⚠ Canvas foni shaffof (💻 PC block CSS3D ekrani uchun). Screenshot
  //    shaffof chiqmasligi uchun fonni vaqtincha to'ldiramiz.
  renderer.setClearAlpha(1);
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  renderer.setClearAlpha(0);
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `apex3d_screenshot_${Date.now()}.png`;
  a.click();
  // Flash effect
  const fl = $('ss-flash');
  fl.style.animation = 'none';
  fl.offsetHeight; // reflow
  fl.style.animation = 'ssFlash 0.4s ease-out forwards';
  log('📸 Screenshot saqlandi!', 'lok');
};
