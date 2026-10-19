// Guarda un "hito": una copia congelada de web/ dentro de historial/NN-nombre/, para poder abrirla
// después tal como estaba ese día (el historial del proceso, de las primeras pruebas al juego final).
//
//   Uso:     npm run hito -- "nombre-corto" "Título bonito" "Qué se ve en este momento" "ruta/de/entrada/"
//   Ejemplo: npm run hito -- "estilos-a-f" "Estilos A a F" "Las seis opciones de estilo" "previews/"
//
// Después se puede ver en http://localhost:5173/historial/ (con `npm run dev` corriendo).
// Las capturas de pantalla van en historial/NN-nombre/capturas/ y se anotan en historial/hitos.json.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const WEB = join(RAIZ, 'web');
const HISTORIAL = join(RAIZ, 'historial');
const MANIFIESTO = join(HISTORIAL, 'hitos.json');

const [nombre, titulo, descripcion = '', entrada = ''] = process.argv.slice(2);
if (!nombre || !titulo) {
  console.log('Uso: npm run hito -- "nombre-corto" "Título bonito" "Qué se ve en este momento" "ruta/de/entrada/"');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(nombre)) {
  console.log('El nombre corto solo puede llevar minúsculas, números y guiones (ej. "prototipo-v1").');
  process.exit(1);
}

await mkdir(HISTORIAL, { recursive: true });
const hitos = existsSync(MANIFIESTO) ? JSON.parse(await readFile(MANIFIESTO, 'utf8')) : [];
const id = `${String(hitos.length + 1).padStart(2, '0')}-${nombre}`;
const destino = join(HISTORIAL, id);
if (existsSync(destino)) {
  console.log(`Ya existe ${destino}. Borra esa carpeta o usa otro nombre.`);
  process.exit(1);
}

await cp(WEB, destino, { recursive: true });
await mkdir(join(destino, 'capturas'), { recursive: true });
const fecha = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); // fecha en Bogotá (UTC-5)
hitos.push({ id, titulo, descripcion, fecha, entrada, capturas: [] });
await writeFile(MANIFIESTO, JSON.stringify(hitos, null, 2) + '\n', 'utf8');

console.log(`Hito guardado: historial/${id}/`);
console.log(`Ábrelo en:     http://localhost:5173/historial/${id}/${entrada}`);
console.log('Tip: deja capturas en historial/' + id + '/capturas/ y anótalas en historial/hitos.json ("capturas": ["archivo.jpg"]).');
