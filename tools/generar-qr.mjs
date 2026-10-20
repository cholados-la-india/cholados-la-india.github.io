// generar-qr.mjs — Crea los QR (mostrador, vasos) y los enlaces con etiquetas UTM de cada canal (mostrador, vasos, instagram, facebook).
//
//   Uso:  npm run qr
//         npm run qr -- --campana=temporada-2          (cambia la campaña que llevan los enlaces; por defecto «lanzamiento»)
//         npm run qr -- --url=https://otra-direccion/  (otra dirección base; por defecto la oficial)
//
// Escribe en la carpeta PARA-MI-LEER-Y-TENER-A-MANO/QR-para-imprimir/ (NO se publica: está fuera de web/):
//   · qr-mostrador.svg / .png  y  qr-vasos.svg / .png   → los QR (el SVG es vectorial: ese es el que se manda a imprimir)
//   · imprimir.html                                      → una hoja para ver los QR a su tamaño real y probar a escanearlos
//   · LEEME.md                                           → los 4 enlaces con sus etiquetas y cómo usar cada uno
//
// Por qué etiquetas: cada enlace dice de dónde viene la persona (utm_source = mostrador, vasos, instagram, facebook). El juego se
// las manda al servidor al empezar la partida y el panel (Resumen → «¿De dónde vienen los jugadores?») las cuenta. No identifican a nadie.
//
// ⚠️ NO imprimas ni publiques nada hasta que la dirección funcione de verdad (abre el enlace en tu celular y juega una partida).
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { leerEtiquetas } from '../web/js/canal.js';

const DIRECCION_OFICIAL = 'https://cholados-la-india.github.io/';
const arg = (nombre, defecto) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? defecto;
const BASE = arg('url', DIRECCION_OFICIAL);
const CAMPANA = arg('campana', 'lanzamiento');
const SALIDA = fileURLToPath(new URL('../PARA-MI-LEER-Y-TENER-A-MANO/QR-para-imprimir/', import.meta.url));

const CANALES = [
  { fuente: 'mostrador', medio: 'qr', qr: true, donde: 'El QR que va en el mostrador del local.' },
  { fuente: 'vasos', medio: 'qr', qr: true, donde: 'El QR que va pegado en los vasos (stickers o impreso en el vaso).' },
  { fuente: 'instagram', medio: 'social', qr: false, donde: 'El enlace para la biografía (bio) de @cholados.laindia y para las historias y publicaciones de Instagram.' },
  { fuente: 'facebook', medio: 'social', qr: false, donde: 'El enlace para la página «Cholados La India» de Facebook (botón, publicaciones y anuncios).' },
];

const enlace = ({ fuente, medio }) => `${BASE}${BASE.includes('?') ? '&' : '?'}utm_source=${fuente}&utm_medium=${medio}&utm_campaign=${CAMPANA}`;

// Comprobación: el juego tiene que entender exactamente lo que escribimos en cada enlace.
for (const c of CANALES) {
  const e = leerEtiquetas(new URL(enlace(c)).search);
  if (!e || e.fuente !== c.fuente || e.medio !== c.medio || e.campana !== CAMPANA) {
    console.error(`✗ El enlace de «${c.fuente}» no lo entiende el juego (revisa --campana: solo letras minúsculas, números, punto, guion y guion bajo; máximo 40).`);
    process.exit(1);
  }
}

await mkdir(SALIDA, { recursive: true });
const OPCIONES = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#000000', light: '#ffffff' } }; // negro sobre blanco = lo que mejor escanea

const SVGS = {};
for (const c of CANALES.filter((x) => x.qr)) {
  const url = enlace(c);
  SVGS[c.fuente] = await QRCode.toString(url, { ...OPCIONES, type: 'svg' });
  await writeFile(`${SALIDA}qr-${c.fuente}.svg`, SVGS[c.fuente], 'utf8');
  await QRCode.toFile(`${SALIDA}qr-${c.fuente}.png`, url, { ...OPCIONES, width: 2400 });
  console.log(`✓ PARA-MI-LEER-Y-TENER-A-MANO/QR-para-imprimir/qr-${c.fuente}.svg y .png  →  ${url}`);
}

await writeFile(`${SALIDA}imprimir.html`, `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR para imprimir y probar</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: #222; }
  h1 { font-size: 22px; } h2 { font-size: 17px; margin: 28px 0 6px; }
  p { max-width: 62ch; line-height: 1.4; }
  .fila { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end; }
  figure { margin: 0; text-align: center; font-size: 13px; }
  img { display: block; border: 1px solid #ccc; }
  .g { width: 10cm; } .m { width: 5cm; } .p { width: 3cm; }
  @media print { p, h1 { display: none; } body { margin: 8mm; } }
</style></head><body>
<h1>QR para imprimir y probar</h1>
<p>Abre esta hoja, imprímela <b>al 100 %</b> (sin «ajustar a la página») y <b>escanea cada QR con tu celular</b> antes de mandar a hacer los stickers o los vasos. En los vasos el QR no debería medir menos de <b>3 cm</b> y tiene que ir sobre fondo <b>blanco</b>, con un borde blanco alrededor.</p>
${CANALES.filter((x) => x.qr).map((c) => `<h2>${c.fuente[0].toUpperCase() + c.fuente.slice(1)}</h2>
<div class="fila">
  <figure><img class="g" src="data:image/svg+xml;base64,${Buffer.from(SVGS[c.fuente]).toString('base64')}" alt="QR ${c.fuente}"><figcaption>10 cm</figcaption></figure>
  <figure><img class="m" src="data:image/svg+xml;base64,${Buffer.from(SVGS[c.fuente]).toString('base64')}" alt="QR ${c.fuente}"><figcaption>5 cm</figcaption></figure>
  <figure><img class="p" src="data:image/svg+xml;base64,${Buffer.from(SVGS[c.fuente]).toString('base64')}" alt="QR ${c.fuente}"><figcaption>3 cm (el mínimo en vasos)</figcaption></figure>
</div>`).join('\n')}
</body></html>
`, 'utf8');

await writeFile(`${SALIDA}LEEME.md`, `# QR y enlaces por canal

> Generado con \`npm run qr\` (no lo edites a mano: se vuelve a escribir). Dirección base: **${BASE}** · campaña: **${CAMPANA}**.

**No imprimas ni publiques nada hasta que ${BASE} abra y se pueda jugar** (pruébalo en tu celular, por el QR y por el enlace de Instagram).

## Los 4 enlaces

| Canal | Enlace (con etiquetas) | Para qué |
|---|---|---|
${CANALES.map((c) => `| **${c.fuente}** | \`${enlace(c)}\` | ${c.donde} |`).join('\n')}

Las etiquetas (\`utm_source\`, \`utm_medium\`, \`utm_campaign\`) las lee el juego al abrirse, las recuerda 30 días y se las manda al servidor cuando alguien **empieza** una partida. En el panel de administrador: **Resumen → «¿De dónde vienen los jugadores?»** (por semana, 30 días o todo). Entran los canales que aparezcan en los enlaces; si un día repartes algo nuevo (por ejemplo un volante), agrégalo en \`tools/generar-qr.mjs\` (lista \`CANALES\`) y corre \`npm run qr\`.

## Los QR

- \`qr-mostrador.svg\` y \`qr-vasos.svg\` son **vectoriales**: mándale esos al impresor (se ven nítidos a cualquier tamaño). Los \`.png\` (2400 px) son para pantallas o por si el impresor no acepta SVG.
- Son negros sobre blanco a propósito (es lo que mejor escanea; con colores de marca a veces fallan en celulares viejos). Déjales el **borde blanco** alrededor.
- Mínimo en vasos: **3 cm**. En el mostrador: **8 a 12 cm**, a la altura de los ojos o de la mano, con una frase corta al lado.
- **Antes de imprimir 500 stickers**: haz **doble clic** en el archivo \`imprimir.html\` (está en esta misma carpeta) (se abre en el navegador; no hace falta \`npm run dev\`), imprímela al 100 % y escanéala con 2 celulares distintos (uno viejo) y con la cámara de Instagram.
- El QR **no cambia aunque cambies el juego**: lleva la dirección, no el juego. Por eso la dirección no debe cambiar una vez impresos (ver \`pendientes.md\` #14).

## Instagram y Facebook

- **Instagram:** pon el enlace de \`instagram\` en la biografía (el único enlace clicable que deja). En las historias puedes usar la pegatina «Enlace» con el mismo.
- **Facebook:** botón de la página («Más información» o «Jugar») y publicaciones con el enlace de \`facebook\`. Si pagas anuncios, pega ese mismo enlace como destino.
- Los dos abren el juego dentro del navegador de la app; las etiquetas viajan igual.
`, 'utf8');

console.log('\n✓ PARA-MI-LEER-Y-TENER-A-MANO/QR-para-imprimir/imprimir.html (hoja para probar a escanear) y PARA-MI-LEER-Y-TENER-A-MANO/QR-para-imprimir/LEEME.md (los 4 enlaces)\n');
console.log('Enlaces:');
for (const c of CANALES) console.log(`  ${c.fuente.padEnd(10)} ${enlace(c)}`);
console.log('\n⚠️  No imprimas nada hasta que la dirección funcione de verdad.');
