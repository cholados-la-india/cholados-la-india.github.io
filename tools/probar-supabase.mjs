// probar-supabase.mjs — Prueba el servidor REAL (Supabase) como lo haría un celular, y lo somete a concurrencia.
//
//   Uso:  npm run probar-supabase               (completo, ~1 min, deja datos de prueba)
//         npm run probar-seguridad              (solo la parte de seguridad, ~3 s, NO deja datos)
//
// Antes: pegar las migraciones en Supabase y rellenar web/js/supabase-config.js (URL y clave pública).
// Dura ~1 minuto porque respeta el tiempo mínimo de juego (45 s): así prueba también las reglas reales.
//
// ⚠️ DEJA DATOS DE PRUEBA en la base (códigos y partidas de "PRUEBA-AUTOMATICA"), y gasta el banco de la semana.
//    Al terminar, corre supabase/sql/limpiar_pruebas.sql en el SQL Editor (solo ANTES del lanzamiento).
//
// Qué comprueba:
//   A. Que desde afuera NO se pueden leer ni escribir las tablas, y que solo existen las 6 funciones del juego.
//   B. Intentos: 8 llamadas simultáneas de un mismo dispositivo → como máximo 3 partidas.
//   C. El servidor no le cree al celular: "gané" a los 0 s, o con pocas frutas, se rechaza.
//   D. Un código por celular: 5 reclamos simultáneos con el MISMO número → exactamente 1 código.
//   E. Tope semanal: 100 ganadores a la vez → solo se aparta el cupo que queda; luego los reclamos simultáneos
//      dan códigos TODOS DISTINTOS y nunca más que el tope.
//   F. Ver mi código: cuenta regresiva de ~7 días, con la hora del servidor.
//   G. (Etapa 5) Que las 11 funciones del administrador NO se pueden llamar con la clave pública ni con un token falso.
import { SUPABASE } from '../web/js/supabase-config.js';

if (!SUPABASE.url || !SUPABASE.clave) {
  console.log('Falta rellenar web/js/supabase-config.js (url y clave). Mira supabase/LEEME.md.');
  process.exit(1);
}

const { randomUUID } = await import('node:crypto');
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

/** Llama a una función; reintenta si la red falla (estas funciones aguantan repetirse, y las de prueba también). */
async function rpc(fn, args = {}, reintentos = 3) {
  let ultimo;
  for (let i = 0; i <= reintentos; i++) {
    try {
      const res = await fetch(`${SUPABASE.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: cab, body: JSON.stringify(args) });
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return { __http: res.status, __texto: await res.text() };
      return await res.json();
    } catch (e) {
      ultimo = e;
      await esperar(300 * (i + 1));
    }
  }
  throw ultimo;
}
/** Ejecuta `fn` sobre todos los elementos con como máximo `n` a la vez. */
async function enParalelo(lista, n, fn) {
  const salida = new Array(lista.length);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, lista.length) }, async () => {
      while (siguiente < lista.length) {
        const i = siguiente++;
        salida[i] = await fn(lista[i], i);
      }
    }),
  );
  return salida;
}
const celular = (n) => '30' + String(10000000 + n).slice(0, 8); // 10 dígitos que empiezan por 3: 3010000000...
const NOMBRE = 'PRUEBA-AUTOMATICA';
const CONCURRENCIA = 60;

console.log(`\nProbando contra ${SUPABASE.url}`);

// ─────────────────────────────────────────────────────────────────────────────
seccion('A. Seguridad: desde afuera no se llega a las tablas');
{
  const get = async (ruta, extra = {}) => {
    const res = await fetch(`${SUPABASE.url}/rest/v1/${ruta}`, { headers: { ...cab, ...extra } });
    return { status: res.status, texto: (await res.text()).slice(0, 160) };
  };
  for (const t of ['codigos', 'partidas', 'configuracion']) {
    const r = await get(`${t}?select=*&limit=1`);
    ok(`GET /${t} no devuelve datos (HTTP ${r.status})`, r.status >= 400 || /^\[\]$/.test(r.texto), r.texto);
    const r2 = await get(`${t}?select=*&limit=1`, { 'Accept-Profile': 'app' });
    ok(`GET /${t} pidiendo el esquema privado "app" (HTTP ${r2.status})`, r2.status >= 400, r2.texto);
  }
  const post = await fetch(`${SUPABASE.url}/rest/v1/codigos`, { method: 'POST', headers: cab, body: JSON.stringify({ codigo: 'HACK-0000' }) });
  ok(`POST /codigos (escribir directo) es rechazado (HTTP ${post.status})`, post.status >= 400);
  for (const f of ['ajustar_juego', 'config', 'cupos', 'estado_json']) {
    const r = await rpc(f, {}, 0);
    ok(`la función interna "${f}" NO se puede llamar desde afuera`, r.__http >= 400, JSON.stringify(r).slice(0, 120));
  }
  const p = await rpc('ping');
  ok('ping responde con la hora del servidor', typeof p.ahoraISO === 'string', JSON.stringify(p));
  const dif = Math.abs(Date.parse(p.ahoraISO) - Date.now());
  console.log(`      (hora del servidor vs la de este computador: ${Math.round(dif / 1000)} s de diferencia)`);
}

// ─────────────────────────────────────────────────────────────────────────────
seccion('G. Etapa 5: las funciones del administrador están cerradas para la clave pública');
{
  // (con los nombres de parámetros reales: si no, PostgREST diría "no existe" aunque la función esté)
  const ARGS = {
    admin_yo: {}, admin_resumen: {}, admin_codigos: {}, admin_exportar: {}, admin_consultar_codigo: { p_codigo: 'X' },
    admin_canjear: { p_codigo: 'X' }, admin_estado_codigo: { p_codigo: 'X', p_estado: 'desactivado' }, admin_config: {},
    admin_guardar_config: { p_cambios: {} }, admin_cambiar_pin: { p_pin: '0' }, admin_desbloquear_pin: {}, admin_canales: { p_periodo: 'todo' },
  };
  const ADMIN = Object.keys(ARGS);
  const llamarCon = async (fn, extra = {}) => {
    const res = await fetch(`${SUPABASE.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { ...cab, ...extra }, body: JSON.stringify(ARGS[fn]) });
    return { status: res.status, texto: (await res.text()).slice(0, 140) };
  };
  const faltan = [];
  const abiertas = [];
  const conTokenFalso = [];
  for (const f of ADMIN) {
    const r = await llamarCon(f);
    if (r.status === 404 && /PGRST202|Could not find/.test(r.texto)) faltan.push(f);
    else if (!(r.status === 401 || r.status === 403)) abiertas.push(`${f}: HTTP ${r.status} ${r.texto}`);
    const r2 = await llamarCon(f, { Authorization: 'Bearer esto.no.es-un-token' });
    if (!(r2.status === 401 || r2.status === 403)) conTokenFalso.push(`${f}: HTTP ${r2.status}`);
  }
  if (faltan.length === ADMIN.length) {
    ok('el servidor ya tiene la migración 0003_staff_admin.sql', false, 'NO está: pégala en el SQL Editor (ver supabase/LEEME.md, «Etapa 5»)');
  } else {
    ok('el servidor tiene las 12 funciones de administrador (0003 y 0004 aplicadas; si falta admin_canales: pega supabase/todo-junto.sql)', faltan.length === 0, 'faltan: ' + faltan.join(', '));
    ok('con la clave pública NINGUNA función de administrador responde (401/403)', abiertas.length === 0, abiertas.join(' | '));
    ok('con un token inventado tampoco', conTokenFalso.length === 0, conTokenFalso.join(' | '));
  }
  for (const t of ['admins', 'staff']) {
    const res = await fetch(`${SUPABASE.url}/rest/v1/${t}?select=*&limit=1`, { headers: { ...cab, 'Accept-Profile': 'app' } });
    ok(`GET app.${t} (PIN y administradores) no se puede leer (HTTP ${res.status})`, res.status >= 400, (await res.text()).slice(0, 120));
  }
  // Ajustes públicos de Supabase Auth (los que cualquiera puede leer): el registro de usuarios debe estar APAGADO
  const aj = await fetch(`${SUPABASE.url}/auth/v1/settings`, { headers: { apikey: SUPABASE.clave } });
  const ajustes = aj.ok ? await aj.json() : null;
  ok('el registro público de usuarios está APAGADO (nadie puede crearse una cuenta)', ajustes?.disable_signup === true, ajustes ? `disable_signup = ${ajustes.disable_signup}` : `HTTP ${aj.status}`);
  const proveedores = Object.entries(ajustes?.external ?? {}).filter(([, v]) => v === true).map(([k]) => k);
  ok('el único medio de entrada activo es el correo con contraseña (sin Google ni otros)', proveedores.length === 1 && proveedores[0] === 'email', `activos: ${proveedores.join(', ') || '(ninguno)'}`);
}
if (process.argv.includes('--rapido')) {
  console.log(`
${fallos === 0 ? '✅ TODO BIEN' : '❌ HAY FALLOS'} — ${total - fallos} de ${total} comprobaciones correctas.
`);
  process.exit(fallos === 0 ? 0 : 1);
}

// ─────────────────────────────────────────────────────────────────────────────
seccion('B. Intentos por dispositivo (8 llamadas a la vez)');
let inicioEstado;
{
  const D = randomUUID();
  inicioEstado = await rpc('estado', { p_device: randomUUID() });
  ok('estado inicial legible', typeof inicioEstado.premiosRestantes === 'number', JSON.stringify(inicioEstado).slice(0, 200));
  console.log(`      (premios restantes ahora: ${inicioEstado.premiosRestantes} de ${inicioEstado.premiosPorSemana} · intentos por semana: ${inicioEstado.intentosPorSemana})`);
  const rs = await Promise.all(Array.from({ length: 8 }, () => rpc('iniciar_partida', { p_device: D }, 0).catch((e) => ({ error: e.message }))));
  const buenas = rs.filter((r) => r.ok === true).length;
  ok(`de 8 llamadas simultáneas se aceptan exactamente ${inicioEstado.intentosPorSemana} (aceptadas: ${buenas})`, buenas === inicioEstado.intentosPorSemana, JSON.stringify(rs.map((r) => r.ok ?? r.error)));
  const e = await rpc('estado', { p_device: D });
  ok('y entonces el estado dice "sin-intentos"', e.motivo === 'sin-intentos' && e.intentosRestantes === 0, JSON.stringify(e).slice(0, 160));
}

// ─────────────────────────────────────────────────────────────────────────────
// Se arrancan TODAS las partidas ahora y se espera una sola vez el tiempo mínimo.
const N_MISMO = 5; // reclamos con el mismo celular
const N_TOPE = 100; // ganadores simultáneos
const lote = Array.from({ length: N_MISMO + N_TOPE + 2 }, () => ({ device: randomUUID() }));
seccion(`C–E. Preparando ${lote.length} partidas simultáneas...`);
await enParalelo(lote, CONCURRENCIA, async (x) => {
  const r = await rpc('iniciar_partida', { p_device: x.device }, 3);
  x.token = r.token;
  x.iniciada = r.ok === true;
});
ok(`${lote.filter((x) => x.iniciada).length} de ${lote.length} partidas iniciadas`, lote.every((x) => x.iniciada), lote.filter((x) => !x.iniciada).length + ' no iniciaron (¿sin premios, campaña inactiva o límite por red?)');
if (!lote.every((x) => x.iniciada)) {
  console.log('\nNo se pudieron iniciar todas las partidas; revisa el estado (¿premios agotados?). Ejecuta supabase/sql/limpiar_pruebas.sql y repite.');
  console.log('Si el motivo fue «limite-red»: este internet ya hizo muchas partidas esta hora (el límite por defecto es 150 por hora). Espera a la próxima hora, o pon');
  console.log('«Partidas por hora desde una red» en 0 (panel → Configuración → Seguridad) mientras pruebas, y vuelve a poner 150 después.');
  process.exit(1);
}
const tarde = lote[0];
const sinFrutas = lote[1];

seccion('C. El servidor no le cree al celular');
{
  const r = await rpc('terminar_partida', { p_token: tarde.token, p_gano: true, p_progreso: 1, p_frutas: 40 });
  ok('"gané" a los segundos de empezar → rechazado (tiempo mínimo)', r.ok === true && r.puedeReclamar === false && r.motivo === 'partida-invalida', JSON.stringify(r).slice(0, 200));
  ok('un token inventado → partida-invalida', (await rpc('terminar_partida', { p_token: randomUUID(), p_gano: true, p_progreso: 1, p_frutas: 40 })).motivo === 'partida-invalida');
  const rr = await rpc('reclamar_codigo', { p_token: tarde.token, p_nombre: NOMBRE, p_celular: celular(999), p_consentimiento: true });
  ok('y con esa partida rechazada no se puede reclamar', rr.ok === false, JSON.stringify(rr));
}

const espera = 47;
console.log(`\n   ⏳ Esperando ${espera} s (el tiempo mínimo de juego) para que las victorias sean creíbles...`);
await esperar(espera * 1000);

{
  const r = await rpc('terminar_partida', { p_token: sinFrutas.token, p_gano: true, p_progreso: 1, p_frutas: 3 });
  ok('con tiempo suficiente pero solo 3 frutas → rechazado', r.puedeReclamar === false && r.motivo === 'partida-invalida', JSON.stringify(r).slice(0, 200));
}

seccion('D. Un código por celular (5 reclamos simultáneos con el MISMO número)');
const grupoMismo = lote.slice(2, 2 + N_MISMO);
{
  const fin = await enParalelo(grupoMismo, CONCURRENCIA, (x) => rpc('terminar_partida', { p_token: x.token, p_gano: true, p_progreso: 1, p_frutas: 40 }));
  ok('las 5 victorias se validan y se apartan', fin.every((f) => f.puedeReclamar === true), JSON.stringify(fin.map((f) => f.puedeReclamar)));
  const rs = await Promise.all(grupoMismo.map((x) => rpc('reclamar_codigo', { p_token: x.token, p_nombre: NOMBRE, p_celular: celular(1), p_consentimiento: true })));
  const buenos = rs.filter((r) => r.ok === true);
  ok(`exactamente 1 reclamo recibe código (recibieron ${buenos.length})`, buenos.length === 1, JSON.stringify(rs.map((r) => r.ok ? r.codigo : r.motivo)));
  ok('los otros 4 reciben "ya-tienes-codigo" con la fecha en que podrán volver', rs.filter((r) => r.motivo === 'ya-tienes-codigo' && r.puedeVolverISO && r.dias).length === 4);
  ok('…y ninguno de esos 4 ve el código del número', !JSON.stringify(rs.filter((r) => r.ok === false)).includes('LAINDIA'));
  grupoMismo.forEach((x, i) => (x.codigo = rs[i].ok ? rs[i].codigo : null));
  const ganador = grupoMismo.find((x) => x.codigo);
  const m = await rpc('mi_codigo', { p_device: ganador.device });
  seccionF(m);
}

function seccionF(m) {
  seccion('F. Ver mi código (cuenta regresiva)');
  ok('mi_codigo devuelve el código activo', m.hay === true && m.estado === 'activo' && /^LAINDIA-[A-Z2-9]{4}$/.test(m.codigo), JSON.stringify(m));
  ok('con cerca de 7 días por delante', m.segundosRestantes > 7 * 86400 - 300 && m.segundosRestantes <= 7 * 86400, String(m.segundosRestantes));
  ok('y el vencimiento es el minuto de expedición + 7 días exactos', (Date.parse(m.venceISO) - Date.parse(m.emitidoISO)) <= 7 * 86400e3 && (Date.parse(m.venceISO) - Date.parse(m.emitidoISO)) > 7 * 86400e3 - 60e3, `${m.emitidoISO} → ${m.venceISO}`);
}

seccion(`E. Tope semanal: ${N_TOPE} ganadores a la vez`);
{
  const antes = await rpc('estado', { p_device: randomUUID() });
  const cupo = antes.premiosRestantes;
  console.log(`      (cupo disponible justo antes: ${cupo})`);
  const grupo = lote.slice(2 + N_MISMO);
  const fin = await enParalelo(grupo, CONCURRENCIA, (x) => rpc('terminar_partida', { p_token: x.token, p_gano: true, p_progreso: 1, p_frutas: 40 }));
  const apartados = fin.filter((f) => f.puedeReclamar === true).length;
  const sinCupo = fin.filter((f) => f.puedeReclamar === false && f.motivo === 'sin-premios').length;
  ok(`se apartan EXACTAMENTE ${cupo} premios (se apartaron ${apartados}) aunque lleguen a la vez`, apartados === cupo, `apartados=${apartados} sinCupo=${sinCupo}`);
  ok(`los demás (${grupo.length - apartados}) reciben "sin-premios"`, sinCupo === grupo.length - apartados);
  const conReserva = grupo.filter((_, i) => fin[i].puedeReclamar === true);
  const rs = await enParalelo(conReserva, CONCURRENCIA, (x, i) => rpc('reclamar_codigo', { p_token: x.token, p_nombre: NOMBRE, p_celular: celular(100 + i), p_consentimiento: true }));
  const codigos = rs.filter((r) => r.ok === true).map((r) => r.codigo);
  // Desde la Etapa 6 hay un tope de códigos por día desde una misma red (por defecto 8): una prueba que reclama 45 códigos
  // desde un solo computador choca con él. Es lo esperado: lo que importa es que NADA se pierda ni se duplique.
  const porRed = rs.filter((r) => r.motivo === 'limite-red').length;
  if (porRed > 0) {
    console.log(`      ⚠ El límite por red cortó ${porRed} reclamos (dejó pasar ${codigos.length}). Para probar los ${conReserva.length} reclamos SIN ese límite: panel → Configuración → Seguridad →`);
    console.log('        «Códigos por día desde una red» = 0 mientras pruebas, y vuelve a poner 8 después.');
  }
  ok(`los ${conReserva.length} reclamos simultáneos: ${codigos.length} reciben código${porRed ? ` y ${porRed} el aviso de límite por red` : ''} (ninguno se pierde)`, codigos.length + porRed === conReserva.length, JSON.stringify(rs.filter((r) => !r.ok && r.motivo !== 'limite-red').slice(0, 3)));
  if (porRed > 0) ok('el límite por red es ATÓMICO bajo concurrencia: dejó pasar al menos 1 y nunca más que el tope por defecto (8 por día)', codigos.length >= 1 && codigos.length + 1 <= 8, `pasaron ${codigos.length} (+1 de la sección D)`);
  ok('TODOS los códigos son distintos (cero duplicados)', new Set(codigos).size === codigos.length, `${new Set(codigos).size} distintos de ${codigos.length}`);
  ok('todos con el formato LAINDIA-XXXX sin caracteres ambiguos', codigos.every((c) => /^LAINDIA-[A-HJ-NP-Z2-9]{4}$/.test(c)));
  const tarde2 = await rpc('estado', { p_device: randomUUID() });
  ok(`el banco queda en 0 y no se supera el tope (restantes: ${tarde2.premiosRestantes})`, tarde2.premiosRestantes === 0 && tarde2.jugable === false && tarde2.motivo === 'sin-premios', JSON.stringify(tarde2).slice(0, 200));
  const ultimaPartida = await rpc('iniciar_partida', { p_device: randomUUID() }, 0);
  ok('y ya nadie puede empezar a jugar (sin-premios)', ultimaPartida.ok === false && ultimaPartida.motivo === 'sin-premios', JSON.stringify(ultimaPartida).slice(0, 160));
  const iBueno = rs.findIndex((r) => r.ok === true);
  if (iBueno >= 0) {
    const repetido = await rpc('reclamar_codigo', { p_token: conReserva[iBueno].token, p_nombre: NOMBRE, p_celular: celular(100 + iBueno), p_consentimiento: true });
    ok('repetir un reclamo (doble toque) devuelve el MISMO código, sin crear otro', repetido.ok === true && repetido.codigo === rs[iBueno].codigo);
  }
}

console.log(`\n${fallos === 0 ? '✅ TODO BIEN' : '❌ HAY FALLOS'} — ${total - fallos} de ${total} comprobaciones correctas.`);
console.log('\nLimpieza: corre supabase/sql/limpiar_pruebas.sql en el SQL Editor antes del lanzamiento (borra partidas y códigos de prueba).\n');
process.exit(fallos === 0 ? 0 : 1);
