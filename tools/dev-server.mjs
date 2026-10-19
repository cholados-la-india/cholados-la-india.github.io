// Servidor local mínimo para ver el juego en el navegador (sin dependencias).
//   Uso:  npm run dev   →   http://localhost:5173/
// Sirve la carpeta web/. También queda visible en tu red wifi (para probar en el celular).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { gzipSync } from 'node:zlib';

const RAIZ = resolve(fileURLToPath(new URL('../web', import.meta.url)));
const PUERTO = Number(process.env.PORT) || 5173;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
};
// Se comprimen solo los archivos de texto, igual que hace GitHub Pages: así el "peso" que mide el
// navegador en local se parece al peso real de producción.
const COMPRIMIBLES = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt']);

function direccionesRed() {
  const lista = [];
  for (const redes of Object.values(networkInterfaces())) {
    for (const r of redes ?? []) if (r.family === 'IPv4' && !r.internal) lista.push(r.address);
  }
  return lista;
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    // Ruta interna: la página de previews la usa para mostrar la IP del PC (para abrirla en el celular).
    if (url.pathname === '/__info') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ puerto: PUERTO, ips: direccionesRed() }));
    }

    let archivo = resolve(join(RAIZ, normalize(decodeURIComponent(url.pathname))));
    if (archivo !== RAIZ && !archivo.startsWith(RAIZ + sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Prohibido');
    }

    let info = await stat(archivo).catch(() => null);
    if (info?.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' });
        return res.end();
      }
      archivo = join(archivo, 'index.html');
      info = await stat(archivo).catch(() => null);
    }
    if (!info) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado: ' + url.pathname);
    }

    const ext = extname(archivo).toLowerCase();
    let datos = await readFile(archivo);
    const cabeceras = { 'Content-Type': TIPOS[ext] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (COMPRIMIBLES.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      datos = gzipSync(datos);
      cabeceras['Content-Encoding'] = 'gzip';
    }
    res.writeHead(200, cabeceras);
    res.end(datos);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Error: ' + error.message);
  }
});

servidor.listen(PUERTO, '0.0.0.0', () => {
  console.log(`\n  Servidor listo. Sirviendo la carpeta web/\n`);
  console.log(`  En tu PC:      http://localhost:${PUERTO}/`);
  for (const ip of direccionesRed()) console.log(`  En tu celular: http://${ip}:${PUERTO}/   (misma red wifi)`);
  console.log(`\n  Para detenerlo: Ctrl + C\n`);
});
