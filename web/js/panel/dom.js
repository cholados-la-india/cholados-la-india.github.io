// dom.js — Ayudas para armar las páginas de la caja y del administrador (web/canje/ y web/admin/).
//
// REGLA DE SEGURIDAD: aquí NUNCA se usa innerHTML con datos. Los nombres y celulares los escriben los jugadores
// (cualquiera puede ponerse de nombre "<img onerror=...>"), así que todo texto entra como TEXTO (textContent), jamás
// como HTML. Por eso todo se construye con `el()`.

/**
 * Crea un elemento. atributos: `class`, `texto`, `dataset`, `onclick`/`oninput`... (solo funciones) y cualquier atributo normal.
 * hijos: textos, elementos, arreglos (se aplanan) o null/false (se ignoran).
 */
export function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') nodo.className = v;
    else if (k === 'texto') nodo.textContent = v;
    else if (k === 'dataset') Object.assign(nodo.dataset, v);
    else if (k.startsWith('on')) {
      if (typeof v === 'function') nodo.addEventListener(k.slice(2).toLowerCase(), v); // nunca "onclick" como texto
    } else if (v === true) nodo.setAttribute(k, '');
    else nodo.setAttribute(k, String(v));
  }
  const poner = (h) => {
    if (h == null || h === false) return;
    if (Array.isArray(h)) h.forEach(poner);
    else nodo.append(h instanceof Node ? h : document.createTextNode(String(h)));
  };
  hijos.forEach(poner);
  return nodo;
}

/** Vacía un elemento y le pone hijos nuevos. */
export function reemplazar(contenedor, ...hijos) {
  contenedor.replaceChildren();
  for (const h of hijos.flat()) if (h != null && h !== false) contenedor.append(h instanceof Node ? h : document.createTextNode(String(h)));
  return contenedor;
}

/** Espera `ms` milisegundos sin tocar el hilo principal. */
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Retrasa una función hasta que pasen `ms` sin que la vuelvan a llamar (para el buscador). */
export function retrasar(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
