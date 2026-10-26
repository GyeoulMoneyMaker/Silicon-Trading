/* ==========================================================================
   Silicon Trading — tiny event bus
   Views subscribe once; mutations announce themselves so every rendered
   surface can refresh without pages knowing about each other.
   ========================================================================== */

const listeners = new Map();

export function on(type, handler) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(handler);
  return () => listeners.get(type)?.delete(handler);
}

export function emit(type, detail) {
  listeners.get(type)?.forEach((handler) => {
    try {
      handler(detail);
    } catch (error) {
      console.error(error);
    }
  });
}
