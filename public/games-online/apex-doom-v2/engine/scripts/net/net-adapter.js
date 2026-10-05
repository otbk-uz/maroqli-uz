// ============================================================
//  🔌 NET ADAPTER — backend bilan gaplashadigan yagona qatlam
// ------------------------------------------------------------
//  O'yin mantig'i qaysi backend ishlayotganini BILMAYDI. U faqat
//  shu qatlamga gapiradi:
//
//      connect(opts, hooks)   ulanadi va xonaga kiradi
//      send(msg)              xabar yuboradi
//      disconnect()           uziladi
//
//  Hooks (adapter chaqiradi):
//      onOpen()               ulandi
//      onMessage(m)           xabar keldi
//      onClose(reason)        uzildi
//      onError(err)           xato
//
//  ── NEGA HOZIR, NEGA KEYIN EMAS ─────────────────────────────
//  ⚠ Mijoz kodida `new WebSocket(...)`, `ws.send(...)`, `ws.onclose`
//    to'g'ridan-to'g'ri yozilgan edi. Firebase qo'shish uchun
//    ularning HAR BIRINI qidirib topish kerak bo'lardi — va bir
//    joyni o'tkazib yuborsak, backend almashtirilganda o'sha yo'l
//    eski soketga gapirib turardi.
//
//    Adapter qatlamini KEYIN qo'shish har doim qimmatroq: kod
//    allaqachon backendga bog'lanib ulgurgan bo'ladi.
//
//  ── PROTOKOL BIR XIL ────────────────────────────────────────
//  ⚠ Hamma backend AYNAN bir xil xabarlarni yuboradi va qabul
//    qiladi (`join`, `welcome`, `peer`, `state`, `bye`, `chat`…).
//    Adapter faqat TASHISH usulini almashtiradi. Shu bois
//    backendni almashtirish o'yin mantig'iga umuman tegmaydi.
// ============================================================
window.NetAdapters = (function () {
  'use strict';

  const _reg = new Map();       // nom → { label, make, fields }

  /**
   * Adapter ro'yxatdan o'tkazadi.
   * @param {string} name    ichki nom ('ws', 'firebase' …)
   * @param {object} def     { label, fields, make }
   *   label  — panelda ko'rinadigan nom
   *   fields — sozlama maydonlari: [{ key, label, placeholder, type }]
   *   make   — () => adapter nusxasi
   */
  function register(name, def) {
    if (!name || !def || typeof def.make !== 'function') return false;
    _reg.set(name, Object.assign({ label: name, fields: [] }, def));
    return true;
  }

  const list  = () => [..._reg.entries()].map(([k, v]) =>
    ({ name: k, label: v.label, fields: v.fields || [] }));
  const get   = (name) => _reg.get(name) || null;
  const has   = (name) => _reg.has(name);

  /**
   * Nomi bo'yicha yangi adapter yasaydi.
   * ⚠ Topilmasa `null` — CHAQIRUVCHI buni tekshirishi shart.
   *   Ilgari bunday joylarda jimgina `undefined` qaytardi va
   *   xato butunlay boshqa joyda chiqardi.
   */
  function create(name) {
    const d = _reg.get(name);
    if (!d) return null;
    try { return d.make(); } catch (e) {
      try { log('❌ Adapter yaratilmadi (' + name + '): ' + (e && e.message), 'le'); } catch (x) {}
      return null;
    }
  }

  return { register, list, get, has, create };
})();
