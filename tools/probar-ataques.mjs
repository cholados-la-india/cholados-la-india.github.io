// probar-ataques.mjs — Se porta como un ATACANTE: llama al servidor real directamente, sin pasar por el juego.
//
//   Uso:  npm run probar-ataques             (rápido, ~5 s, casi no deja datos)
//         npm run probar-ataques -- --completo   (además prueba trampas que exigen esperar el tiempo mínimo de juego: ~1 min)
//
// Usa solo la clave pública (la misma que cualquiera puede sacar del juego). Comprueba que:
//   · un token inventado, tipos raros, textos gigantes o intentos de inyección SQL no rompen nada ni se aceptan;
//   · una función que gasta algo (iniciar_partida) no se puede llamar con GET (así no se dispara desde un enlace o una imagen);
//   · las respuestas públicas no traen nombres, celulares ni códigos de otras personas;
//   · el servidor NO se deja engañar con encabezados de red falsos (para los límites por IP);
//   · (--completo) perder y luego «ganar» con el mismo token no funciona, un nombre con comillas/SQL no daña nada y no se puede
//     ir preguntando número por número «¿este celular ya ganó?».
// El modo --completo deja 1 o 2 códigos de prueba: corre después supabase/sql/limpiar_pruebas.sql (solo antes del lanzamiento).
import { randomUUID } from 'node:crypto';
import { SUPABASE } from '../web/js/supabase-config.js';

const COMPLETO = process.argv.includes('--completo');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
let total = 0;
const ok = (nombre, cond, detalle = '') => {
  total++;
  if (!cond) fallos++;
  console.log(`${cond ? '  ✓' : '  ✗ FALLÓ'}  ${nombre}${!cond && detalle ? '  →  ' + detalle : ''}`);
};
const seccion = (t) => console.log(`\n${t}`);
const cab = { 'Content-Type': 'application/json', apikey: SUPABASE.clave, ...(SUPABASE.clave.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE.clave}` } : {}) };

/** POST a una función. Devuelve { status, json, texto } sin lanzar errores por códigos HTTP. */
async function llamar(fn, args = {}, extra = {}, cuerpoCrudo = null) {
  const res = await fetch(`${SUPABASE.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { ...cab, ...extra }, body: cuerpoCrudo ?? JSON.stringify(args) });
  const texto = await res.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    /* no era JSON */
  }
  return { status: res.status, json, texto: texto.slice(0, 200) };
}
const celular = () => '3' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');

console.log(`\nProbando como atacante contra ${SUPABASE.url}`);

seccion('A. Tokens inventados, tipos raros y textos gigantes');
{
  const falso = randomUUID();
  const t = await llamar('terminar_partida', { p_token: falso, p_gano: true, p_progreso: 1, p_frutas: 99 });
  ok('terminar_partida con un token inventado → partida-invalida', t.json?.ok === false && t.json?.motivo === 'partida-invalida', t.texto);
  const r = await llamar('reclamar_codigo', { p_token: falso, p_nombre: 'Atacante', p_celular: celular(), p_consentimiento: true });
  ok('reclamar_codigo con un token inventado → partida-invalida (no crea código)', r.json?.ok === false && r.json?.motivo === 'partida-invalida', r.texto);
  for (const [nombre, fn, args] of [
    ['token que no es un UUID', 'terminar_partida', { p_token: 'no-es-uuid', p_gano: true }],
    ['dispositivo con inyección SQL', 'estado', { p_device: "1'; drop table app.codigos; --" }],
    ['gano como texto', 'terminar_partida', { p_token: falso, p_gano: 'si' }],
    ['parámetro que no existe', 'estado', { p_device: falso, p_hack: 1 }],
    ['frutas como objeto', 'terminar_partida', { p_token: falso, p_gano: true, p_frutas: { a: 1 } }],
  ]) {
    const x = await llamar(fn, args);
    ok(`${nombre} → error 4xx (no 5xx, no se acepta)`, x.status >= 400 && x.status < 500, `HTTP ${x.status} ${x.texto}`);
  }
  const gigante = await llamar('reclamar_codigo', { p_token: falso, p_nombre: 'A'.repeat(1_000_000), p_celular: celular(), p_consentimiento: true });
  ok('un nombre de 1 MB no tumba el servidor (respuesta rápida y sin error 5xx)', gigante.status < 500, `HTTP ${gigante.status}`);
  const basura = await llamar('estado', {}, {}, '{"p_device": ');
  ok('un JSON roto → error 4xx', basura.status >= 400 && basura.status < 500, `HTTP ${basura.status}`);
  const nulos = await llamar('terminar_partida', { p_token: null, p_gano: null, p_progreso: null, p_frutas: null });
  ok('todo en null → partida-invalida (sin error)', nulos.json?.ok === false, nulos.texto);
  const nan = await llamar('terminar_partida', { p_token: falso, p_gano: true, p_progreso: 1e308, p_frutas: -5 });
  ok('números extremos o negativos → partida-invalida (sin error)', nan.json?.ok === false, nan.texto);
}

seccion('B. Funciones que gastan algo no se pueden disparar con GET (un enlace o una imagen)');
{
  const dev = randomUUID();
  const get = await fetch(`${SUPABASE.url}/rest/v1/rpc/iniciar_partida?p_device=${dev}`, { headers: cab });
  ok(`GET /rpc/iniciar_partida es rechazado (HTTP ${get.status})`, get.status === 405 || get.status === 404 || get.status === 400, await get.text());
  const e = await llamar('estado', { p_device: dev });
  ok('…y no gastó ningún intento de ese dispositivo (siguen todos)', e.json?.intentosRestantes === e.json?.intentosPorSemana, e.texto);
  for (const fn of ['terminar_partida', 'reclamar_codigo']) {
    const g = await fetch(`${SUPABASE.url}/rest/v1/rpc/${fn}?p_token=${dev}`, { headers: cab });
    ok(`GET /rpc/${fn} es rechazado (HTTP ${g.status})`, g.status >= 400 && g.status < 500, '');
  }
}

seccion('C. Lo público no deja ver datos de otras personas');
{
  const e = await llamar('estado', {});
  const m = await llamar('mi_codigo', { p_device: randomUUID() });
  const lleno = JSON.stringify([e.json, m.json]);
  ok('estado() y mi_codigo() de un desconocido no traen nombres, celulares ni códigos', !/"(nombre|celular|codigo)"\s*:|[A-Z0-9]{4,}-[A-Z2-9]{4}|\b3\d{9}\b/.test(lleno) && m.json?.hay === false, lleno.slice(0, 160));
  const tablas = [];
  for (const t of ['codigos', 'partidas', 'configuracion', 'admins', 'staff', 'limites_red', 'v_codigos']) {
    const r = await fetch(`${SUPABASE.url}/rest/v1/${t}?select=*&limit=1`, { headers: { ...cab, 'Accept-Profile': 'app' } });
    if (r.status < 400) tablas.push(`${t}: HTTP ${r.status}`);
  }
  ok('ninguna tabla del esquema app se puede leer por la API (7 probadas, incluida la vista de códigos)', tablas.length === 0, tablas.join(', '));
  const raiz = await fetch(`${SUPABASE.url}/rest/v1/`, { headers: cab });
  const txt = await raiz.text();
  ok('el índice de la API (OpenAPI) no lista tablas con datos de personas', !/"\/codigos"|"\/partidas"|"\/staff"|"\/admins"/.test(txt), `HTTP ${raiz.status}`);
}

seccion('D. Los encabezados de red falsos no engañan a los límites por IP');
{
  const limpio = await llamar('diag_red', {});
  if (limpio.status === 404) {
    ok('el servidor tiene diag_red (Etapa 6): pega supabase/todo-junto.sql (npm run sql)', false, 'falta aplicar el SQL de la Etapa 6');
  } else {
    ok('diag_red responde y el servidor reconoce la red de quien llama', limpio.json?.ipReconocida === true, limpio.texto);
    const oculta = (ip) => String(ip ?? '—').replace(/^(\d+\.\d+)\.\d+\.\d+$/, '$1.x.x'); // no se imprime tu IP completa
    // 1) x-forwarded-for y x-real-ip falsos: el servidor los recibe, pero la red se decide por cf-connecting-ip (que pone Cloudflare)
    const trampa = await llamar('diag_red', {}, { 'X-Forwarded-For': '1.2.3.4, 9.9.9.9', 'X-Real-IP': '4.3.2.1' });
    console.log(`      (sin trampa: cf-connecting-ip = ${oculta(limpio.json?.cfConnectingIp)} · x-forwarded-for = ${oculta(limpio.json?.xForwardedFor)})`);
    console.log(`      (con x-forwarded-for falso: llega «${String(trampa.json?.xForwardedFor).replace(/(d+.d+).d+.d+/g, '$1.x.x')}», pero cf-connecting-ip sigue siendo ${oculta(trampa.json?.cfConnectingIp)})`);
    ok('x-forwarded-for / x-real-ip inventados NO cambian la red que reconoce el servidor (misma huella)', trampa.status === 200 && trampa.json?.huella === limpio.json?.huella, `huellas: ${limpio.json?.huella} vs ${trampa.json?.huella}`);
    // 2) cf-connecting-ip falso: Cloudflare (el que está delante de Supabase) lo rechaza o lo ignora; en ningún caso engaña
    const cf = await llamar('diag_red', {}, { 'CF-Connecting-IP': '5.6.7.8' });
    ok(`cf-connecting-ip inventado: Cloudflare lo rechaza (HTTP ${cf.status}) o lo ignora; nunca cambia la red reconocida`, cf.status === 403 || (cf.status === 200 && cf.json?.huella === limpio.json?.huella), cf.texto);
  }
}

if (COMPLETO) {
  seccion('E. Trampas que exigen esperar el tiempo mínimo de juego (~50 s)');
  const dev = randomUUID();
  const dev2 = randomUUID();
  const ini1 = await llamar('iniciar_partida', { p_device: dev });
  const ini2 = await llamar('iniciar_partida', { p_device: dev });
  const ini3 = await llamar('iniciar_partida', { p_device: dev2 });
  if (!ini1.json?.ok || !ini2.json?.ok || !ini3.json?.ok) {
    ok('se pudieron iniciar las partidas de prueba', false, `${ini1.texto} | ${ini2.texto} | ${ini3.texto}`);
  } else {
    const perdida = ini1.json.token;
    const buena = ini2.json.token;
    const otra = ini3.json.token;
    const p0 = await llamar('terminar_partida', { p_token: perdida, p_gano: false, p_progreso: 0.2, p_frutas: 3 });
    ok('(preparación) la partida 1 se cierra como perdida', p0.json?.ok === true && p0.json?.puedeReclamar === false, p0.texto);
    console.log('\n   ⏳ Esperando 47 s (el tiempo mínimo de juego)...');
    await esperar(47000);
    const trampa = await llamar('terminar_partida', { p_token: perdida, p_gano: true, p_progreso: 1, p_frutas: 60 });
    ok('perder y luego «ganar» con el MISMO token no sirve (sigue perdida)', trampa.json?.puedeReclamar === false, trampa.texto);
    const reclamoPerdida = await llamar('reclamar_codigo', { p_token: perdida, p_nombre: 'Tramposo', p_celular: celular(), p_consentimiento: true });
    ok('…y tampoco se puede reclamar con ese token', reclamoPerdida.json?.ok === false && reclamoPerdida.json?.motivo === 'partida-invalida', reclamoPerdida.texto);

    const v = await llamar('terminar_partida', { p_token: buena, p_gano: true, p_progreso: 1, p_frutas: 40 });
    const quedaba = v.json?.puedeReclamar === true;
    ok('(preparación) la partida 2 gana de verdad (47 s y 40 frutas)', quedaba, v.texto);
    if (quedaba) {
      const v2 = await llamar('terminar_partida', { p_token: buena, p_gano: false, p_progreso: 0, p_frutas: 0 });
      ok('repetir terminar_partida con «perdí» NO le quita el premio apartado (idempotente)', v2.json?.puedeReclamar === true, v2.texto);
      const nombreRaro = "Robert'); DROP TABLE app.codigos;--<b>x</b>";   // (≤ 60 letras: el servidor rechaza nombres más largos)
      const cel = celular();
      const r = await llamar('reclamar_codigo', { p_token: buena, p_nombre: nombreRaro, p_celular: cel, p_consentimiento: true });
      ok('un nombre con comillas, SQL y HTML se guarda como texto y el reclamo funciona', r.json?.ok === true && /^[A-Z0-9]+-[A-Z2-9]+$/.test(r.json?.codigo ?? ''), r.texto);
      const sigue = await llamar('mi_codigo', { p_device: dev });
      ok('…y la tabla de códigos sigue viva (mi_codigo devuelve el código)', sigue.json?.hay === true && sigue.json?.codigo === r.json?.codigo, sigue.texto);

      // ¿Se puede preguntar número por número "¿este ya ganó?" con un mismo token ganador?
      const v3 = await llamar('terminar_partida', { p_token: otra, p_gano: true, p_progreso: 1, p_frutas: 40 });
      if (v3.json?.puedeReclamar === true) {
        const respuestas = [];
        for (let i = 0; i < 6; i++) respuestas.push((await llamar('reclamar_codigo', { p_token: otra, p_nombre: 'Curioso', p_celular: cel, p_consentimiento: true })).json?.motivo);
        const reveloCodigo = JSON.stringify(respuestas).includes(r.json.codigo);
        ok('con otro token ganador, preguntar si ese celular ya ganó solo funciona 5 veces; la 6.ª ya no responde nada útil', respuestas.slice(0, 5).every((m) => m === 'ya-tienes-codigo') && respuestas[5] === 'partida-invalida', JSON.stringify(respuestas));
        ok('…y en ningún caso se revela el código de ese número', !reveloCodigo);
      } else {
        ok('(preparación) la partida 3 también ganó', false, v3.texto);
      }
    }
  }
} else {
  console.log('\n(Para las trampas que exigen esperar el tiempo mínimo: npm run probar-ataques -- --completo)');
}

console.log(`\n${fallos === 0 ? '✅ TODO BIEN' : '❌ HAY FALLOS'} — ${total - fallos} de ${total} comprobaciones correctas.\n`);
if (COMPLETO) console.log('Limpieza: corre supabase/sql/limpiar_pruebas.sql en el SQL Editor antes del lanzamiento (borra partidas y códigos de prueba).\n');
process.exit(fallos === 0 ? 0 : 1);
