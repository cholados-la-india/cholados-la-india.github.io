// probar-sql.mjs — Prueba el SQL de supabase/migrations/ en tu propio computador, SIN Supabase.
//
//   Uso:  npm run probar-sql
//
// Usa PGlite (un Postgres que corre dentro de Node) con los mismos archivos que pegarás en Supabase.
// Comprueba las reglas (intentos, semana, cupos, reservas, un código por celular, vigencia, permisos...).
// OJO: aquí no hay concurrencia real (una sola conexión); eso se prueba contra Supabase con
// `npm run probar-concurrencia`.
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let fallos = 0;
let total = 0;
const ok = (nombre, cond, detalle = '') => {
  total++;
  if (!cond) fallos++;
  console.log(`${cond ? '  ✓' : '  ✗ FALLÓ'}  ${nombre}${!cond && detalle ? '  →  ' + detalle : ''}`);
};
const seccion = (t) => console.log(`\n${t}`);

// Los roles que Supabase ya trae; aquí hay que crearlos
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;`);
const migraciones = ['0001_tablas.sql', '0002_funciones.sql'];
for (const f of migraciones) await db.exec(await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));

const FIRMAS = {
  ping: '',
  estado: '$1::uuid',
  iniciar_partida: '$1::uuid',
  terminar_partida: '$1::uuid, $2::boolean, $3::numeric, $4::int',
  reclamar_codigo: '$1::uuid, $2::text, $3::text, $4::boolean',
  mi_codigo: '$1::uuid',
};
/** Llama a una función como lo haría el juego: con el rol "anon". */
async function rpc(fn, ...args) {
  await db.exec('set role anon');
  try {
    const { rows } = await db.query(`select public.${fn}(${FIRMAS[fn]}) as r`, args);
    return rows[0].r;
  } finally {
    await db.exec('reset role');
  }
}
const sql = async (q, p = []) => (await db.query(q, p)).rows;
const uno = async (q, p = []) => Object.values((await sql(q, p))[0])[0];

/** Juega y gana: inicia, "pasa el tiempo" (retrocede el inicio) y termina ganando. */
async function ganar(device, { frutas = 30, segundos = 100 } = {}) {
  const ini = await rpc('iniciar_partida', device);
  if (!ini.ok) return { ini };
  await sql(`update app.partidas set inicio = inicio - make_interval(secs => $2) where id = $1`, [ini.token, segundos]);
  const fin = await rpc('terminar_partida', ini.token, true, 1, frutas);
  return { ini, fin, token: ini.token };
}
const CEL = (n) => '3' + String(100000000 + n).slice(0, 9); // celulares de prueba válidos
const reiniciarDatos = async () => {
  await db.exec('truncate app.codigos, app.partidas restart identity cascade');
  await db.exec(`update app.configuracion set intentos_por_semana=3, premios_por_semana=50, cupo_diario=0, vigencia_dias=7, dias_entre_codigos_por_celular=7, duracion_partida_s=60, frutas_minimas=25, minimo_jugado_s=45, ventana_reclamo_min=15, campana_inicio=null, campana_fin=null, juego='{}' where id=1`);
};

// ────────────────────────────────────────────────────────────────────────────────
seccion('1. Fechas en hora de Bogotá (Bogotá = UTC−5, sin horario de verano)');
{
  // Se muestran en UTC para comparar. Se repite con 3 zonas horarias de sesión: el resultado NO debe depender de ella.
  const utc = (expr, ts) => uno(`select to_char((${expr}($1::timestamptz)) at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')`, [ts]);
  for (const zona of ['UTC', 'America/Bogota', 'Asia/Tokyo']) {
    await db.exec(`set timezone = '${zona}'`);
    const sem = (ts) => utc('app.inicio_semana', ts);
    ok(`[${zona}] domingo 23:59:59 Bogotá sigue siendo la semana vieja`, (await sem('2026-10-26 04:59:59+00')) === '2026-10-19 05:00:00', await sem('2026-10-26 04:59:59+00'));
    ok(`[${zona}] lunes 00:00:00 Bogotá empieza la semana nueva`, (await sem('2026-10-26 05:00:00+00')) === '2026-10-26 05:00:00', await sem('2026-10-26 05:00:00+00'));
    ok(`[${zona}] semana_de devuelve el lunes`, (await uno(`select app.semana_de('2026-10-21 12:00+00'::timestamptz)::text`)) === '2026-10-19');
    ok(`[${zona}] dia_de usa la hora de Bogotá (madrugada UTC = día anterior)`, (await uno(`select app.dia_de('2026-10-21 03:00+00'::timestamptz)::text`)) === '2026-10-20');
    // Ejemplo del usuario: expedido a las 2:51 p. m. → vale hasta las 2:50 p. m. del mismo día 7 días después
    const v = await uno(`select to_char(app.vencimiento('2026-10-20 19:51:33+00'::timestamptz, 7) at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')`); // 14:51:33 Bogotá
    ok(`[${zona}] vencimiento = expedición al minuto + 7 días exactos (14:51:33 → martes siguiente 14:51:00; último minuto válido 14:50)`, v === '2026-10-27 19:51:00', v);
  }
  await db.exec(`set timezone = 'UTC'`); // como Supabase
}

seccion('2. Códigos legibles y únicos');
{
  const lista = [];
  for (let i = 0; i < 300; i++) lista.push(await uno(`select app.codigo_nuevo('LAINDIA', 4)`));
  ok('formato LAINDIA-XXXX', lista.every((c) => /^LAINDIA-[A-Z2-9]{4}$/.test(c)));
  ok('nunca lleva 0, O, 1 ni I', lista.every((c) => !/[01OI]/.test(c.slice(8))));
  ok('300 códigos casi todos distintos (no es un contador)', new Set(lista).size > 290, `${new Set(lista).size} distintos`);
}

seccion('3. Estado inicial e intentos por semana (ligados al dispositivo)');
await reiniciarDatos();
const A = randomUUID();
const B = randomUUID();
{
  const e = await rpc('estado', A);
  ok('estado: jugable, 50 premios, 3 intentos', e.jugable === true && e.premiosRestantes === 50 && e.intentosRestantes === 3 && e.motivo === null, JSON.stringify(e));
  ok('estado trae la hora del servidor y el próximo lunes', typeof e.ahoraISO === 'string' && /T05:00:00\.000Z$/.test(e.reiniciaEnISO), e.reiniciaEnISO);
  ok('la duración y las frutas mínimas llegan dentro de "juego.partida"', e.juego.partida.duracionS === 60 && e.juego.partida.frutasMinimas === 25, JSON.stringify(e.juego));
  ok('trae las reglas públicas (compra mínima, vigencia, regalos)', e.reglas.compraMinima === 30000 && e.reglas.vigenciaDias === 7 && e.reglas.regalos.length === 2);
  const p1 = await rpc('iniciar_partida', A);
  ok('iniciar_partida entrega token y descuenta un intento', p1.ok === true && /^[0-9a-f-]{36}$/.test(p1.token) && p1.intentosRestantes === 2, JSON.stringify(p1));
  await rpc('iniciar_partida', A);
  const p3 = await rpc('iniciar_partida', A);
  ok('el 3.er intento se permite y quedan 0', p3.ok === true && p3.intentosRestantes === 0);
  const p4 = await rpc('iniciar_partida', A);
  ok('el 4.º intento se rechaza (sin-intentos)', p4.ok === false && p4.motivo === 'sin-intentos', JSON.stringify(p4));
  ok('otro dispositivo sí puede jugar', (await rpc('iniciar_partida', B)).ok === true);
  ok('sin id de dispositivo no se juega', (await rpc('iniciar_partida', null)).ok === false);
  // Lunes: las partidas de la semana pasada ya no cuentan
  await sql(`update app.partidas set semana = semana - 7 where device_id = $1`, [A]);
  ok('al cambiar la semana el dispositivo recupera sus 3 intentos', (await rpc('estado', A)).intentosRestantes === 3);
}

seccion('4. terminar_partida: el servidor NO le cree al celular');
await reiniciarDatos();
{
  const D = randomUUID();
  const r0 = await rpc('terminar_partida', randomUUID(), true, 1, 30);
  ok('token inventado → partida-invalida', r0.ok === false && r0.motivo === 'partida-invalida');
  const ini = await rpc('iniciar_partida', D);
  const rapido = await rpc('terminar_partida', ini.token, true, 1, 30);
  ok('"gané" a los 0 segundos → rechazado por tiempo mínimo', rapido.ok === true && rapido.puedeReclamar === false && rapido.motivo === 'partida-invalida', JSON.stringify(rapido));
  const otra = await ganar(D, { frutas: 24 });
  ok('con 24 frutas (mínimo 25) → rechazado', otra.fin.puedeReclamar === false && otra.fin.motivo === 'partida-invalida', JSON.stringify(otra.fin));
  const buena = await ganar(D, { frutas: 25 });
  ok('con 25 frutas y tiempo suficiente → válido y apartado', buena.fin.puedeReclamar === true && typeof buena.fin.reservaHastaISO === 'string', JSON.stringify(buena.fin));
  const rep = await rpc('terminar_partida', buena.token, false, 0, 0);
  ok('repetir la llamada no cambia el resultado (idempotente)', rep.puedeReclamar === true);
  const D2 = randomUUID();
  const perdida = await rpc('iniciar_partida', D2);
  const pr = await rpc('terminar_partida', perdida.token, false, 0.4, 3);
  ok('perder se registra y devuelve el estado con los intentos', pr.ok === true && pr.puedeReclamar === false && pr.estado.intentosRestantes === 2, JSON.stringify(pr));
  // Duración corta configurada: el tiempo mínimo nunca pasa del 75 % de la duración
  await sql(`update app.configuracion set duracion_partida_s = 20, minimo_jugado_s = 45 where id=1`);
  const corta = await ganar(randomUUID(), { frutas: 25, segundos: 16 });
  ok('con duración 20 s el mínimo baja a 15 s (75 %)', corta.fin.puedeReclamar === true, JSON.stringify(corta.fin));
}

seccion('5. reclamar_codigo');
await reiniciarDatos();
{
  const D = randomUUID();
  const g = await ganar(D);
  ok('sin consentimiento → rechazado', (await rpc('reclamar_codigo', g.token, 'Marcela', CEL(1), false)).motivo === 'consentimiento');
  ok('celular de 9 dígitos → datos', (await rpc('reclamar_codigo', g.token, 'Marcela', '312345678', true)).motivo === 'datos');
  ok('celular que no empieza por 3 → datos', (await rpc('reclamar_codigo', g.token, 'Marcela', '2123456789', true)).motivo === 'datos');
  ok('nombre de 1 letra → datos', (await rpc('reclamar_codigo', g.token, 'M', CEL(1), true)).motivo === 'datos');
  ok('token inventado → partida-invalida', (await rpc('reclamar_codigo', randomUUID(), 'Marcela', CEL(1), true)).motivo === 'partida-invalida');
  const r = await rpc('reclamar_codigo', g.token, '  Marcela   Escobar ', '+57 ' + CEL(1), true);
  ok('reclamo válido → código LAINDIA-XXXX', r.ok === true && /^LAINDIA-[A-Z2-9]{4}$/.test(r.codigo), JSON.stringify(r));
  ok('vence = expedición (al minuto) + 7 días', Date.parse(r.venceISO) - Date.parse(r.emitidoISO) >= 7 * 86400e3 - 60e3 && Date.parse(r.venceISO) - Date.parse(r.emitidoISO) <= 7 * 86400e3);
  const fila = (await sql(`select * from app.codigos where codigo = $1`, [r.codigo]))[0];
  ok('se guardó limpio: nombre sin espacios dobles, +57 quitado, consentimiento, dispositivo', fila.nombre === 'Marcela Escobar' && fila.celular === CEL(1) && fila.consentimiento === true && fila.device_id === D, JSON.stringify(fila));
  const doble = await rpc('reclamar_codigo', g.token, 'Marcela', CEL(1), true);
  ok('doble toque / reintento devuelve el MISMO código', doble.ok === true && doble.codigo === r.codigo && doble.repetido === true);
  ok('solo se creó 1 código', Number(await uno('select count(*) from app.codigos')) === 1);
  // Mismo celular con otra partida ganada
  const g2 = await ganar(randomUUID());
  const mismo = await rpc('reclamar_codigo', g2.token, 'Otra Persona', CEL(1), true);
  ok('mismo celular otra vez → ya-tienes-codigo, con la fecha en que podrá volver', mismo.ok === false && mismo.motivo === 'ya-tienes-codigo' && mismo.dias === 7 && Date.parse(mismo.puedeVolverISO) - Date.parse(r.emitidoISO) >= 7 * 86400e3 - 1000, JSON.stringify(mismo));
  ok('…y NO se revela el código de ese número', !JSON.stringify(mismo).includes(r.codigo));
  ok('el premio de esa partida sigue apartado (puede corregir el número)', (await rpc('reclamar_codigo', g2.token, 'Otra Persona', CEL(2), true)).ok === true);
  // Pasan 8 días: ya se puede
  await sql(`update app.codigos set emitido_en = emitido_en - interval '8 days', vence_en = vence_en - interval '8 days' where celular = $1`, [CEL(1)]);
  const g3 = await ganar(randomUUID());
  ok('pasados los 7 días el mismo celular puede reclamar de nuevo', (await rpc('reclamar_codigo', g3.token, 'Marcela', CEL(1), true)).ok === true);
  // Una partida que perdió no puede reclamar
  const ini = await rpc('iniciar_partida', randomUUID());
  await rpc('terminar_partida', ini.token, false, 0.3, 4);
  ok('una partida perdida no puede reclamar', (await rpc('reclamar_codigo', ini.token, 'Alguien', CEL(9), true)).motivo === 'partida-invalida');
  // Sin terminar tampoco
  const sin = await rpc('iniciar_partida', randomUUID());
  ok('una partida sin terminar no puede reclamar', (await rpc('reclamar_codigo', sin.token, 'Alguien', CEL(9), true)).motivo === 'partida-invalida');
}

seccion('6. Tope semanal, reservas y cupo diario');
await reiniciarDatos();
{
  await sql(`update app.configuracion set premios_por_semana = 3 where id=1`);
  const g1 = await ganar(randomUUID());
  const g2 = await ganar(randomUUID());
  ok('2 ganadores validados apartan 2 de 3 premios', (await rpc('estado', null)).premiosRestantes === 1);
  await rpc('reclamar_codigo', g1.token, 'Uno', CEL(11), true);
  ok('reclamar no cambia el total: expedido cuenta igual que apartado', (await rpc('estado', null)).premiosRestantes === 1);
  const g3 = await ganar(randomUUID());
  ok('el 3.er ganador aparta el último premio', g3.fin.puedeReclamar === true && (await rpc('estado', null)).premiosRestantes === 0);
  const sinCupo = await ganar(randomUUID());
  ok('con 0 premios ya no se puede ni empezar a jugar (sin-premios)', sinCupo.ini.ok === false && sinCupo.ini.motivo === 'sin-premios', JSON.stringify(sinCupo.ini));
  // Alguien empezó antes de que se acabaran, y gana tarde: queda "ganó sin cupo"
  await sql(`update app.configuracion set premios_por_semana = 4 where id=1`);
  const tarde = await rpc('iniciar_partida', randomUUID());
  await sql(`update app.configuracion set premios_por_semana = 3 where id=1`);
  await sql(`update app.partidas set inicio = inicio - interval '100 seconds' where id=$1`, [tarde.token]);
  const ft = await rpc('terminar_partida', tarde.token, true, 1, 30);
  ok('si ganó pero ya no hay cupo → motivo sin-premios', ft.puedeReclamar === false && ft.motivo === 'sin-premios', JSON.stringify(ft));
  // La reserva vence a los 15 min y se libera
  await sql(`update app.partidas set reserva_hasta = now() - interval '1 minute' where id = $1`, [g2.token]);
  ok('una reserva vencida libera el premio', (await rpc('estado', null)).premiosRestantes === 1);
  // …y esa persona aún puede reclamar si quedó cupo
  ok('con la reserva vencida, si hay cupo igual puede reclamar', (await rpc('reclamar_codigo', g2.token, 'Dos', CEL(12), true)).ok === true);
  ok('y luego ya no queda ninguno', (await rpc('estado', null)).premiosRestantes === 0);
  // Reinicio del lunes
  await sql(`update app.codigos set semana = semana - 7`);
  await sql(`update app.partidas set reserva_hasta = null`);
  ok('al cambiar la semana el banco vuelve a tener premios', (await rpc('estado', null)).premiosRestantes === 3);
}
await reiniciarDatos();
{
  await sql(`update app.configuracion set cupo_diario = 1 where id=1`);
  const g = await ganar(randomUUID());
  await rpc('reclamar_codigo', g.token, 'Uno', CEL(21), true);
  const e = await rpc('estado', null);
  ok('cupo diario 1: tras un código hoy ya no hay (sin-premios)', e.jugable === false && e.motivo === 'sin-premios', JSON.stringify(e));
  ok('…y se renueva mañana a las 00:00 de Bogotá (05:00 UTC), no el lunes', /T05:00:00\.000Z$/.test(e.reiniciaEnISO) && Date.parse(e.reiniciaEnISO) - Date.parse(e.ahoraISO) <= 86400e3 + 1000, e.reiniciaEnISO);
}

seccion('7. mi_codigo (cuenta regresiva)');
await reiniciarDatos();
{
  const D = randomUUID();
  ok('sin código: hay = false', (await rpc('mi_codigo', D)).hay === false);
  const g = await ganar(D);
  const r = await rpc('reclamar_codigo', g.token, 'Marcela', CEL(31), true);
  const m = await rpc('mi_codigo', D);
  ok('devuelve el código activo con ~7 días de cuenta regresiva', m.hay === true && m.codigo === r.codigo && m.estado === 'activo' && m.segundosRestantes > 7 * 86400 - 120 && m.segundosRestantes <= 7 * 86400, JSON.stringify(m));
  ok('estado le avisa que tiene un código activo', (await rpc('estado', D)).miCodigoActivo === true);
  ok('otro dispositivo no ve ese código', (await rpc('mi_codigo', randomUUID())).hay === false);
  await sql(`update app.codigos set canjeado_en = now(), estado = 'canjeado' where id = (select id from app.codigos limit 1)`);
  ok('canjeado se refleja', (await rpc('mi_codigo', D)).estado === 'canjeado');
  await sql(`update app.codigos set estado = 'activo', canjeado_en = null, vence_en = now() - interval '1 minute'`);
  const v = await rpc('mi_codigo', D);
  ok('vencido se calcula solo (sin tarea programada) y no se recicla', v.estado === 'vencido' && v.segundosRestantes === 0 && (await rpc('estado', D)).miCodigoActivo === false);
  ok('el código vencido sigue en la tabla (no se recicla)', Number(await uno('select count(*) from app.codigos')) === 1);
}

seccion('8. Campaña, y dificultad que se ajusta desde el servidor');
await reiniciarDatos();
{
  await sql(`update app.configuracion set campana_fin = now() - interval '1 hour' where id=1`);
  const e = await rpc('estado', null);
  ok('campaña terminada → campana-inactiva', e.jugable === false && e.motivo === 'campana-inactiva');
  ok('no deja iniciar partida', (await rpc('iniciar_partida', randomUUID())).motivo === 'campana-inactiva');
  await sql(`update app.configuracion set campana_fin = null, campana_inicio = now() + interval '1 day' where id=1`);
  ok('campaña que aún no empieza → campana-inactiva', (await rpc('estado', null)).motivo === 'campana-inactiva');
  await reiniciarDatos();
  await sql(`select app.ajustar_juego('{"velocidad": {"inicial": 10}, "partida": {"frutasMinimas": 20}}'::jsonb)`);
  await sql(`select app.ajustar_juego('{"velocidad": {"final": 16}}'::jsonb)`);
  const j = (await rpc('estado', null)).juego;
  ok('ajustar_juego mezcla sin borrar (velocidad.inicial y .final conviven)', j.velocidad.inicial === 10 && j.velocidad.final === 16, JSON.stringify(j));
  ok('frutasMinimas y duracion van a su columna y el estado las entrega', j.partida.frutasMinimas === 20 && j.partida.duracionS === 60 && (await uno('select frutas_minimas from app.configuracion')) === 20);
}

seccion('9. Seguridad: lo que la clave pública (anon) NO puede hacer');
{
  const prueba = async (nombre, q) => {
    await db.exec('set role anon');
    let msg = null;
    try {
      await db.query(q);
    } catch (e) {
      msg = e.message;
    } finally {
      await db.exec('reset role');
    }
    ok(nombre, msg !== null && /permission denied|does not exist/.test(msg), msg ?? 'NO dio error');
  };
  await prueba('anon no puede leer app.codigos', 'select * from app.codigos');
  await prueba('anon no puede leer app.partidas', 'select * from app.partidas');
  await prueba('anon no puede leer app.configuracion', 'select * from app.configuracion');
  await prueba('anon no puede escribir en app.codigos', `insert into app.codigos (codigo, nombre, celular, consentimiento, device_id, partida_id, vence_en, semana, dia) values ('X','x','3000000000',true,gen_random_uuid(),gen_random_uuid(),now(),now()::date,now()::date)`);
  await prueba('anon no puede llamar a las funciones internas (app.*)', 'select app.config()');
  await prueba('anon no puede cambiar la dificultad (app.ajustar_juego)', `select app.ajustar_juego('{}'::jsonb)`);
  await prueba('anon no puede leer la vista app.v_codigos', 'select * from app.v_codigos');
  const rls = await sql(`select relname, relrowsecurity from pg_class where relnamespace = 'app'::regnamespace and relname in ('codigos','partidas','configuracion')`);
  ok('RLS activado en las 3 tablas', rls.length === 3 && rls.every((x) => x.relrowsecurity === true), JSON.stringify(rls));
  const fn = await sql(`select p.proname, p.prosecdef from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('ping','estado','iniciar_partida','terminar_partida','reclamar_codigo','mi_codigo')`);
  ok('las 6 funciones públicas son SECURITY DEFINER', fn.length === 6 && fn.every((x) => x.prosecdef), JSON.stringify(fn));
  ok('ping responde con la hora del servidor', typeof (await rpc('ping')).ahoraISO === 'string');
}

seccion('10. Volver a correr las migraciones no rompe nada');
{
  let fallo = null;
  try {
    for (const f of migraciones) await db.exec(await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  } catch (e) {
    fallo = e.message;
  }
  ok('las dos migraciones se pueden repetir (idempotentes)', fallo === null, fallo ?? '');
  ok('y la configuración conserva su única fila', Number(await uno('select count(*) from app.configuracion')) === 1);
}

console.log(`\n${fallos === 0 ? '✅ TODO BIEN' : '❌ HAY FALLOS'} — ${total - fallos} de ${total} comprobaciones correctas.\n`);
process.exit(fallos === 0 ? 0 : 1);
