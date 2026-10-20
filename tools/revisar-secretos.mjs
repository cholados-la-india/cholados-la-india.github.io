// revisar-secretos.mjs — Busca secretos, claves y datos personales en TODO el repo (archivos actuales Y el historial de git).
//
//   Uso:  npm run revisar-secretos
//
// El repo es PÚBLICO: cualquier cosa que se haya subido alguna vez, aunque se borrara después, sigue visible en el historial.
// Qué busca (y qué es grave):
//   GRAVE  · la «secret key» nueva de Supabase (sb_secret_…)               · una llave JWT con rol service_role / supabase_admin
//          · una dirección de conexión a la base con contraseña (postgres://usuario:clave@…) · una llave privada (-----BEGIN … PRIVATE KEY-----)
//          · un PIN, contraseña o clave puesto «a mano» en el código (con una lista de excepciones que SON de mentira, la de la demo)
//   AVISO  · correos personales (gmail, hotmail…) · la clave pública de Supabase (es pública por diseño: solo se confirma que sea esa)
// Termina con código 1 si hay algo GRAVE.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ESTE_ARCHIVO = 'tools/revisar-secretos.mjs'; // sus propios ejemplos (postgres://usuario:clave@…) no cuentan
const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 28 });

const decodificar = (parte) => {
  try {
    return JSON.parse(Buffer.from(parte.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

// Excepciones: valores de MENTIRA que viven a propósito en la demo (?api=falsa) o en las pruebas. Cada una explica por qué.
const EXCEPCIONES = [
  { archivo: /web\/js\/panel\/falso\.js$/, texto: /PIN_DEMO|CLAVE_DEMO|TOKEN_DEMO|pinActual/, por: 'PIN y clave de la demo con datos de mentira (?api=falsa)' },
  { archivo: /(^|\/)tools\/(probar-sql|probar-mutaciones)\.mjs$/, texto: /./, por: 'datos de prueba en PGlite (una base temporal en memoria)' },
  { archivo: /(^|\/)(documentos|supabase|historial|PLAN|CLAUDE|README|pendientes)/, texto: /1234|demo/, por: 'documentación: el PIN 1234 y la clave demo son los de la demo, y la caja los rechaza como PIN real' },
  { archivo: /web\/(canje|admin)\/.*\.js$|web\/js\/panel\/.*\.js$/, texto: /1234|clave demo|'demo'/, por: 'textos de ayuda de la demo' },
  { archivo: /(^|\/)historial\//, texto: /./, por: 'copia congelada de un hito (ya revisada en su versión actual)' },
];

const PATRONES = [
  { id: 'sb_secret', grave: true, re: /sb_secret_[A-Za-z0-9_-]{12,}/g, nombre: 'secret key de Supabase (sb_secret_…)' },
  { id: 'jwt', grave: false, re: /eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g, nombre: 'llave JWT' },
  { id: 'db_url', grave: true, re: /postgres(?:ql)?:\/\/[^\s:'"@/]+:[^\s'"@]{3,}@[^\s'"]+/g, nombre: 'dirección de la base con contraseña' },
  { id: 'llave_privada', grave: true, re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g, nombre: 'llave privada' },
  { id: 'clave_en_codigo', grave: true, re: /\b(?:pin|password|passwd|contrase(?:ñ|n)a|secret|token|api[_-]?key)\s*[:=]\s*['"`]([^'"`\s]{4,})['"`]/gi, nombre: 'PIN/contraseña/clave escrito en el código' },
  { id: 'correo_personal', grave: false, re: /[A-Za-z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo|icloud|live)\.[a-z.]+/gi, nombre: 'correo personal' },
];

function clasificar(linea, archivo) {
  const hallazgos = [];
  for (const p of PATRONES) {
    p.re.lastIndex = 0;
    for (const m of linea.matchAll(p.re)) {
      let grave = p.grave;
      let nombre = p.nombre;
      if (p.id === 'jwt') {
        const carga = decodificar(m[1]);
        const rol = carga?.role;
        if (rol === 'service_role' || rol === 'supabase_admin') {
          grave = true;
          nombre = `llave JWT con rol ${rol} (¡da acceso total a la base!)`;
        } else if (rol === 'anon') {
          nombre = 'llave JWT «anon» (pública por diseño)';
        } else continue;
      }
      if (p.id === 'clave_en_codigo') {
        // valores que claramente no son secretos: nombres de campos, plantillas y demás
        if (/^(string|text|null|undefined|true|false|clave|password|pin|token|\$\{.*\}|<.*>)$/i.test(m[1])) continue;
        if (/^[A-Za-z_]+$/.test(m[1]) && /(label|placeholder|aria|autocomplete|type|name|id)\s*[:=]/i.test(m[0])) continue;
      }
      const exc = EXCEPCIONES.find((e) => e.archivo.test(archivo) && e.texto.test(m[0] + ' ' + linea));
      hallazgos.push({ id: p.id, nombre, grave, exc: exc?.por, extracto: m[0].slice(0, 70) });
    }
  }
  return hallazgos;
}

const resumen = { grave: [], aviso: [], excepciones: new Map() };
function registrar(h, donde) {
  if (h.exc && h.id === 'clave_en_codigo') {
    resumen.excepciones.set(h.exc, (resumen.excepciones.get(h.exc) ?? 0) + 1);
    return;
  }
  (h.grave ? resumen.grave : resumen.aviso).push({ ...h, donde });
}

// ───────────── 1. Archivos actuales (los que git sube o subiría) ─────────────
console.log('\n1. Archivos del proyecto (lo que está o estaría en GitHub)');
const archivos = git('ls-files', '-co', '--exclude-standard', '-z').split('\0').filter(Boolean);
let revisados = 0;
const binarios = /\.(png|jpe?g|webp|woff2?|glb|mp3|ogg|ico|gif|pdf)$/i;
for (const a of archivos) {
  if (binarios.test(a) || a === ESTE_ARCHIVO || !existsSync(RAIZ + a)) continue;
  let texto;
  try {
    texto = readFileSync(RAIZ + a, 'utf8');
  } catch {
    continue;
  }
  revisados++;
  texto.split('\n').forEach((linea, i) => {
    if (linea.length > 20000) linea = linea.slice(0, 20000);
    for (const h of clasificar(linea, a)) registrar(h, `${a}:${i + 1}`);
  });
}
console.log(`   ${revisados} archivos de texto revisados.`);

// La clave de supabase-config.js debe ser la PÚBLICA
const cfg = readFileSync(RAIZ + 'web/js/supabase-config.js', 'utf8');
const clave = cfg.match(/clave:\s*'([^']+)'/)?.[1] ?? '';
const esPublica = clave.startsWith('sb_publishable_') || (clave.startsWith('eyJ') && decodificar(clave.split('.')[1])?.role === 'anon');
console.log(`   web/js/supabase-config.js usa una clave ${esPublica ? 'PÚBLICA (publishable/anon) ✓' : '¡QUE NO ES LA PÚBLICA!'}`);
if (!esPublica) resumen.grave.push({ nombre: 'supabase-config.js no tiene la clave pública', donde: 'web/js/supabase-config.js', extracto: clave.slice(0, 12) + '…' });

// ───────────── 2. Historial de git (todas las ramas y commits) ─────────────
console.log('\n2. Historial de git (todo lo que se subió alguna vez, aunque se haya borrado después)');
const commits = Number(git('rev-list', '--count', '--all').trim());
await new Promise((resolver) => {
  const p = spawn('git', ['log', '--all', '-p', '-U0', '--no-color', '--pretty=format:@@COMMIT %h'], { cwd: RAIZ });
  let resto = '';
  let commit = '';
  let archivo = '';
  const procesar = (linea) => {
    if (linea.startsWith('@@COMMIT ')) commit = linea.slice(9);
    else if (linea.startsWith('+++ b/')) archivo = linea.slice(6);
    else if (linea.startsWith('+') && !linea.startsWith('+++')) {
      if (binarios.test(archivo) || archivo === ESTE_ARCHIVO) return;
      const l = linea.length > 20000 ? linea.slice(1, 20000) : linea.slice(1);
      for (const h of clasificar(l, archivo)) registrar(h, `commit ${commit} · ${archivo}`);
    }
  };
  p.stdout.on('data', (d) => {
    const partes = (resto + d.toString('utf8')).split('\n');
    resto = partes.pop();
    partes.forEach(procesar);
  });
  p.on('close', () => {
    if (resto) procesar(resto);
    resolver();
  });
});
console.log(`   ${commits} commits revisados.`);

// ───────────── Resultado ─────────────
const unicos = (lista) => {
  const vistos = new Map();
  for (const h of lista) {
    const k = `${h.nombre}|${h.extracto}`;
    if (!vistos.has(k)) vistos.set(k, { ...h, veces: 0 });
    vistos.get(k).veces++;
  }
  return [...vistos.values()];
};
console.log('\nResultado');
if (resumen.excepciones.size) {
  for (const [por, n] of resumen.excepciones) console.log(`   (excepción permitida ×${n}: ${por})`);
}
const avisos = unicos(resumen.aviso);
for (const h of avisos) console.log(`   ⚠ AVISO  ${h.nombre}: ${h.extracto}  (${h.veces}×, p. ej. ${h.donde})`);
const graves = unicos(resumen.grave);
for (const h of graves) console.log(`   ✗ GRAVE  ${h.nombre}: ${h.extracto}  (${h.veces}×, p. ej. ${h.donde})`);
if (graves.length === 0) console.log('   ✓ Ningún secreto, contraseña, PIN ni llave privada en el repo ni en su historial.');
console.log(graves.length === 0 ? '\n✅ TODO BIEN\n' : '\n❌ HAY SECRETOS EXPUESTOS: cámbialos YA en Supabase (Project Settings → API Keys) y avísame.\n');
process.exit(graves.length === 0 ? 0 : 1);
