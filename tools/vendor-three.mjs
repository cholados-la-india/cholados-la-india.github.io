// Genera web/vendor/three/three.min.js: un paquete de Three.js recortado y minificado.
//
// ¿Por qué? Desde la versión r186, Three.js ya no trae archivos minificados y completo pesa ~2 MB.
// Este script busca en web/ todo lo que se use como `THREE.Algo` y mete SOLO eso en el paquete.
// El juego NO necesita compilación: el resultado es un archivo normal que se sube al repo.
//
//   Uso:  npm run vendor
//   Cuándo repetirlo: cada vez que el código use una clase nueva de Three.js (si falta alguna, el
//   navegador mostrará "THREE.Algo is not a constructor" o similar).
import { build } from 'esbuild';
import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const WEB = join(RAIZ, 'web');
const SALIDA_DIR = join(WEB, 'vendor', 'three');
const SALIDA = join(SALIDA_DIR, 'three.min.js');

async function* archivos(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'vendor') continue;
    const ruta = join(dir, e.name);
    if (e.isDirectory()) yield* archivos(ruta);
    else if (/\.(js|mjs|html)$/.test(e.name)) yield ruta;
  }
}

const THREE = await import('three');
const version = JSON.parse(await readFile(join(RAIZ, 'node_modules', 'three', 'package.json'), 'utf8')).version;

const encontrados = new Set();
for await (const archivo of archivos(WEB)) {
  const texto = await readFile(archivo, 'utf8');
  for (const m of texto.matchAll(/\bTHREE\.([A-Za-z_]\w*)/g)) encontrados.add(m[1]);
}
const usados = [...encontrados].filter((n) => n in THREE).sort();
const desconocidos = [...encontrados].filter((n) => !(n in THREE));
if (desconocidos.length) console.warn('Ojo: estos nombres no existen en Three.js y se ignoran:', desconocidos.join(', '));

await mkdir(SALIDA_DIR, { recursive: true });
await build({
  stdin: { contents: `export { ${usados.join(', ')} } from 'three';`, resolveDir: RAIZ },
  bundle: true,
  format: 'esm',
  minify: true,
  treeShaking: true,
  target: 'es2020',
  legalComments: 'none',
  banner: { js: `/* three@${version} (MIT) - paquete recortado con tools/vendor-three.mjs. No editar a mano. */` },
  outfile: SALIDA,
  logLevel: 'warning',
});
await copyFile(join(RAIZ, 'node_modules', 'three', 'LICENSE'), join(SALIDA_DIR, 'LICENSE'));

const bytes = (await stat(SALIDA)).size;
const gz = gzipSync(await readFile(SALIDA)).length;
console.log(`three@${version}: ${usados.length} exportaciones → ${SALIDA}`);
console.log(`Tamaño: ${(bytes / 1024).toFixed(0)} KB (${(gz / 1024).toFixed(0)} KB comprimido con gzip)`);
