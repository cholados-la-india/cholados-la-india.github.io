// probar-canal.mjs — Prueba (sin navegador) cómo el juego lee las etiquetas UTM de los enlaces (web/js/canal.js).
//
//   Uso:  npm run probar-canal      (≈ 1 s, no toca nada)
//
// Simula un navegador mínimo (localStorage y barra de direcciones) para comprobar que: se leen las etiquetas, se limpian
// (minúsculas, sin HTML), se recuerdan 30 días, se quitan de la barra sin perder ?debug=1, y que algo raro no pasa.
import { fileURLToPath } from 'node:url';

let fallos = 0;
let total = 0;
const ok = (nombre, cond, detalle = '') => {
  total++;
  if (!cond) fallos++;
  console.log(`${cond ? '  ✓' : '  ✗ FALLÓ'}  ${nombre}${!cond && detalle ? '  →  ' + detalle : ''}`);
};

// Un localStorage de mentira, antes de importar el módulo
const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
};
const { leerEtiquetas, limpiar, sinEtiquetas, iniciarCanal, canalActual } = await import(new URL('../web/js/canal.js', import.meta.url).href);
const ventana = (url) => {
  const u = new URL(url);
  const v = { location: { search: u.search, href: u.href }, history: { state: null, replaceState: (_s, _t, nueva) => { v.barra = nueva; } }, barra: null };
  return v;
};

console.log('\n1. Leer las etiquetas del enlace');
ok('enlace del mostrador', JSON.stringify(leerEtiquetas('?utm_source=mostrador&utm_medium=qr&utm_campaign=lanzamiento')) === '{"fuente":"mostrador","medio":"qr","campana":"lanzamiento"}');
ok('mayúsculas y espacios se limpian', leerEtiquetas('?utm_source=%20Instagram%20&utm_medium=Social')?.fuente === 'instagram');
ok('sin utm_source no hay canal', leerEtiquetas('?utm_medium=qr') === null && leerEtiquetas('') === null);
ok('HTML o texto raro en la fuente → no hay canal', leerEtiquetas('?utm_source=%3Cscript%3Ealert(1)%3C/script%3E') === null && leerEtiquetas('?utm_source=con%20espacios') === null);
ok('fuente demasiado larga (31) → no hay canal; 30 sí', leerEtiquetas('?utm_source=' + 'a'.repeat(31)) === null && leerEtiquetas('?utm_source=' + 'a'.repeat(30)) !== null);
ok('un medio o campaña inválidos se ignoran pero la fuente se queda', JSON.stringify(leerEtiquetas('?utm_source=vasos&utm_medium=%3Cb%3E&utm_campaign=' + 'k'.repeat(41))) === '{"fuente":"vasos","medio":null,"campana":null}');
ok('limpiar acepta punto, guion y guion bajo', limpiar('temporada-1_a.b', 40) === 'temporada-1_a.b' && limpiar('-malo', 40) === null);

console.log('\n2. Quitar las etiquetas de la barra');
ok('se quitan las utm_* y se queda lo demás', sinEtiquetas('https://x.github.io/?utm_source=a&debug=1&utm_medium=b&api=falsa#hola') === '/?debug=1&api=falsa#hola');
ok('si solo había etiquetas, queda la raíz', sinEtiquetas('https://x.github.io/?utm_source=a&utm_medium=b') === '/');

console.log('\n3. Recordarlas al abrir el juego');
const t0 = Date.parse('2026-11-02T15:00:00Z');
const v1 = ventana('https://cholados-la-india.github.io/?utm_source=Mostrador&utm_medium=qr&utm_campaign=lanzamiento&debug=1');
const c1 = iniciarCanal(v1, t0);
ok('al abrir con etiquetas devuelve el canal', c1?.fuente === 'mostrador' && c1?.medio === 'qr' && c1?.campana === 'lanzamiento', JSON.stringify(c1));
ok('y quita las etiquetas de la barra sin perder ?debug=1', v1.barra === '/?debug=1', String(v1.barra));
const v2 = ventana('https://cholados-la-india.github.io/');
ok('al recargar SIN etiquetas se acuerda del canal', iniciarCanal(v2, t0 + 3600e3)?.fuente === 'mostrador' && v2.barra === null);
ok('a los 29 días todavía se acuerda', canalActual(t0 + 29 * 86400e3)?.fuente === 'mostrador');
ok('a los 31 días se olvida', canalActual(t0 + 31 * 86400e3) === null);
const v3 = ventana('https://cholados-la-india.github.io/?utm_source=instagram&utm_medium=social');
ok('un enlace nuevo reemplaza al anterior (cuenta el último)', iniciarCanal(v3, t0 + 86400e3)?.fuente === 'instagram' && canalActual(t0 + 86400e3 + 1000)?.fuente === 'instagram');
memoria.set('cholado-canal', '{esto no es json');
ok('un valor guardado dañado no rompe nada', canalActual(t0) === null);
memoria.set('cholado-canal', JSON.stringify({ fuente: '<img onerror=x>', hasta: t0 + 1e9 }));
ok('un valor guardado con HTML se descarta', canalActual(t0) === null);
globalThis.localStorage = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
ok('con el almacenamiento bloqueado (navegadores internos) no rompe y no hay canal', iniciarCanal(ventana('https://x.github.io/?utm_source=vasos'), t0) === null);

console.log(`\n${fallos === 0 ? '✅ TODO BIEN' : '❌ HAY FALLOS'} — ${total - fallos} de ${total} comprobaciones correctas.\n`);
process.exit(fallos === 0 ? 0 : 1);
void fileURLToPath;
