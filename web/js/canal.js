// canal.js — ¿De qué enlace llegó la persona? (etiquetas UTM, Etapa 7)
//
// Cada enlace que se reparte lleva etiquetas, por ejemplo:
//   https://cholados-la-india.github.io/?utm_source=mostrador&utm_medium=qr&utm_campaign=lanzamiento
//     utm_source   = el canal (mostrador, vasos, instagram, facebook…)
//     utm_medium   = el tipo (qr, social…)
//     utm_campaign = la campaña o temporada (lanzamiento…)
// Al abrir el juego se leen, se recuerdan 30 días en este navegador (por si la persona recarga o vuelve más tarde) y se quitan
// de la barra de direcciones (así, si comparte el enlace desde ahí, no arrastra «mostrador» a otra gente). Cuando EMPIEZA una
// partida, el juego se las manda al servidor (api.registrarCanal) y el panel las cuenta. No identifican a nadie.
//
// Las mismas reglas de limpieza están en el servidor (app.limpiar_utm): minúsculas, a-z 0-9 . _ -, y largo máximo.
import { almacen } from './util.js';

const CLAVE = 'cholado-canal';
const VIGENCIA_MS = 30 * 24 * 3600 * 1000;

/** Deja una etiqueta limpia o null. */
export function limpiar(valor, max) {
  const s = String(valor ?? '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_.-]*$/.test(s) && s.length <= max ? s : null;
}

/** Lee las etiquetas de un texto de búsqueda («?utm_source=…»). null si no trae una fuente válida. */
export function leerEtiquetas(search) {
  const p = new URLSearchParams(search);
  const fuente = limpiar(p.get('utm_source'), 30);
  if (!fuente) return null;
  return { fuente, medio: limpiar(p.get('utm_medium'), 30), campana: limpiar(p.get('utm_campaign'), 40) };
}

/** Quita las etiquetas utm_* de una dirección (deja el resto: ?debug=1, ?api=falsa…). */
export function sinEtiquetas(href) {
  const u = new URL(href);
  for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
  return u.pathname + (u.searchParams.size ? `?${u.searchParams}` : '') + u.hash;
}

/** Al abrir el juego: si el enlace trae etiquetas, las recuerda y las quita de la barra. Devuelve las etiquetas vigentes (o null). */
export function iniciarCanal(ventana = window, ahora = Date.now()) {
  const nuevas = leerEtiquetas(ventana.location.search);
  if (nuevas) {
    almacen.escribir(CLAVE, { ...nuevas, hasta: ahora + VIGENCIA_MS });
    try {
      ventana.history.replaceState(ventana.history.state, '', sinEtiquetas(ventana.location.href));
    } catch {
      /* si el navegador no deja cambiar la barra, no pasa nada */
    }
  }
  return canalActual(ahora);
}

/** Las etiquetas vigentes de este navegador, o null (no hay, o ya pasaron 30 días). */
export function canalActual(ahora = Date.now()) {
  const g = almacen.leer(CLAVE);
  if (!g || typeof g.fuente !== 'string' || !(g.hasta > ahora)) return null;
  const fuente = limpiar(g.fuente, 30);
  return fuente ? { fuente, medio: limpiar(g.medio, 30), campana: limpiar(g.campana, 40) } : null;
}
