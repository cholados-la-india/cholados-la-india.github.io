// controles.js — Deslizar (izquierda/derecha/arriba), tocar y teclado. Una sola API para todo.
//
//   · Deslizar a los lados  → cambiar de carril.       · Deslizar hacia arriba (o tocar) → saltar.
//   · Deslizar hacia abajo se ignora por ahora (agacharse queda fuera; ver CLAUDE.md).
//   · Teclado (para probar en el PC): ← → / A D, ↑ / W / Espacio, Esc o P para pausa.
// Funciona con la misma lógica para dedo y mouse (Pointer Events), también en el navegador interno de Instagram.

export function crearControles(elemento, cfg, { alIzquierda, alDerecha, alSaltar, alPausar, activo }) {
  let toque = null; // { id, x, y, t0, huboGesto }
  const umbral = () => cfg.controles.umbralPx;

  const abajo = (e) => {
    if (!activo()) return;
    if (e.target.closest?.('button, a, input, label, [data-no-gesto]')) return;
    toque = { id: e.pointerId, x: e.clientX, y: e.clientY, t0: performance.now(), huboGesto: false };
    try {
      elemento.setPointerCapture?.(e.pointerId);
    } catch {
      /* algunos navegadores lo rechazan; no pasa nada */
    }
  };
  const mover = (e) => {
    if (!toque || e.pointerId !== toque.id || !activo()) return;
    const dx = e.clientX - toque.x;
    const dy = e.clientY - toque.y;
    if (Math.hypot(dx, dy) < umbral()) return;
    toque.huboGesto = true;
    if (Math.abs(dx) > Math.abs(dy)) (dx < 0 ? alIzquierda : alDerecha)();
    else if (dy < 0) alSaltar();
    // dy > 0 (deslizar hacia abajo): ignorado a propósito
    toque.x = e.clientX; // se puede encadenar otro gesto sin levantar el dedo
    toque.y = e.clientY;
  };
  const arriba = (e) => {
    if (!toque || e.pointerId !== toque.id) return;
    const corto = performance.now() - toque.t0 <= cfg.controles.toqueMaxMs;
    if (!toque.huboGesto && corto && cfg.controles.toqueSalta && activo()) alSaltar();
    toque = null;
  };
  const cancelar = () => {
    toque = null;
  };

  elemento.addEventListener('pointerdown', abajo);
  elemento.addEventListener('pointermove', mover);
  elemento.addEventListener('pointerup', arriba);
  elemento.addEventListener('pointercancel', cancelar);

  const tecla = (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'Escape' || k === 'p' || k === 'P') {
      alPausar();
      return;
    }
    if (!activo()) return;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') alIzquierda();
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') alDerecha();
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') alSaltar();
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', tecla);

  // Evita el zoom por pellizco y el doble toque en iOS
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  return {
    destruir() {
      elemento.removeEventListener('pointerdown', abajo);
      elemento.removeEventListener('pointermove', mover);
      elemento.removeEventListener('pointerup', arriba);
      elemento.removeEventListener('pointercancel', cancelar);
      window.removeEventListener('keydown', tecla);
    },
  };
}
