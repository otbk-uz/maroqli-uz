
// ============================================================
//  APEX3D ENGINE v2 — Full Featured
// ============================================================
const $ = id => document.getElementById(id);
const consoleEl = $('console-body');

// ============================================================
// UNDO / REDO — `scripts/core/undo.js` ga KO'CHIRILDI
//
//  ⚠ Ilgari bu yerda 60 qatorlik tizim turardi va u sahnadan faqat
//    `position/rotation/scale` + `material[0]` ni o'qirdi. O'chirish,
//    qo'shish, iyerarxiya, `userData`, fizika, yorug'lik — hech biri
//    bekor qilinmasdi. Batafsil sabab va yangi model: `undo.js` boshi.
//
//  Ommaviy API o'zgarmadi: `captureState(label)`, `undo()`, `redo()`.
// ============================================================
