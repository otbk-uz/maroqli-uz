// ============================================================
// REVERSE PLAYBACK API
// Generic forward/reverse alternator for triggers and buttons.
//
// Usage:
//   ReversePlaybackAPI.register('hb_42', { resetOnLoad: true });
//   const dir = ReversePlaybackAPI.nextDirection('hb_42');
//     → 1st call: 'forward'
//     → 2nd call: 'reverse'
//     → 3rd call: 'forward'
//     …
//
// Future modules (ActionFlow, CutsceneTrigger, FunctionalCone,
// TPBlock, ALTInputBlock) call the same three functions:
//   nextDirection(key)  → returns current direction and advances counter
//   setDirection(key, dir)  → force direction
//   reset(key)          → clear counter (next call returns 'forward')
//
// Reset-on-scene-reload behaviour is handled centrally in
// _resetAllOnLoad(), which loadScene() should call.
// ============================================================

const ReversePlaybackAPI = (() => {
  'use strict';

  // key → { count, resetOnLoad, lastDir }
  const _state = new Map();

  function register(key, opts) {
    if (!key) return;
    opts = opts || {};
    if (!_state.has(key)) {
      _state.set(key, {
        count: 0,
        resetOnLoad: opts.resetOnLoad !== false,   // default true
        lastDir: null,
      });
    } else {
      // Update resetOnLoad flag if re-registered
      const st = _state.get(key);
      if (opts.resetOnLoad !== undefined) st.resetOnLoad = opts.resetOnLoad;
    }
  }

  // Advance the counter and return the direction that should play NOW.
  function nextDirection(key) {
    register(key);
    const st = _state.get(key);
    const dir = (st.count % 2 === 0) ? 'forward' : 'reverse';
    st.count++;
    st.lastDir = dir;
    return dir;
  }

  // Peek at what the next call would return WITHOUT advancing.
  function peekDirection(key) {
    if (!_state.has(key)) return 'forward';
    const st = _state.get(key);
    return (st.count % 2 === 0) ? 'forward' : 'reverse';
  }

  function setDirection(key, dir) {
    register(key);
    const st = _state.get(key);
    // Set counter so the NEXT nextDirection() returns `dir`.
    st.count = (dir === 'reverse') ? 1 : 0;
    st.lastDir = null;
  }

  function reset(key) {
    if (_state.has(key)) {
      const st = _state.get(key);
      st.count = 0;
      st.lastDir = null;
    }
  }

  // Called when a new scene is loaded — clears counters for
  // any entry with resetOnLoad === true.
  function _resetAllOnLoad() {
    _state.forEach(st => {
      if (st.resetOnLoad) { st.count = 0; st.lastDir = null; }
    });
  }

  // Clear a key entirely (used when an object is deleted).
  function unregister(key) {
    _state.delete(key);
  }

  // Debug snapshot
  function _dump() {
    const out = {};
    _state.forEach((v, k) => { out[k] = { count: v.count, lastDir: v.lastDir, resetOnLoad: v.resetOnLoad }; });
    return out;
  }

  return {
    register,
    nextDirection,
    peekDirection,
    setDirection,
    reset,
    unregister,
    _resetAllOnLoad,
    _dump,
  };
})();

window.ReversePlaybackAPI = ReversePlaybackAPI;
