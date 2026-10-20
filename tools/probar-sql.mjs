// probar-sql.mjs — Prueba el SQL de supabase/migrations/ en tu propio computador, SIN Supabase.
//
//   Uso:  npm run probar-sql
//
// Usa PGlite (un Postgres que corre dentro de Node) con los mismos archivos que pegarás en Supabase.
// Comprueba las reglas (intentos, semana, cupos, reservas, un código por celular, vigencia, permisos...) y, desde la Etapa 5,
// el PIN del staff, el canje en caja y las funciones del panel de administrador; desde la Etapa 6, los límites por red (IP),
// los casos de tiempo (vencimiento exacto, lunes 00:00) y la auditoría de permisos.
// OJO: aquí no hay concurrencia real (una sola conexión); eso se prueba contra Supabase con `npm run probar-supabase`.
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { armar } from './juntar-sql.mjs';

/** Una base vacía con lo que Supabase ya trae: roles, permisos por defecto, esquema auth y el esquema de extensiones. */
async function baseNueva() {
  const b = new PGlite({ extensions: { pgcrypto } });
  // Los roles que Supabase ya trae; aquí hay que crearlos
  await b.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;`);
  // Supabase da permiso de ejecución por defecto a anon/authenticated en las funciones nuevas de "public". Se imita para
  // que las pruebas de permisos comprueben de verdad que las migraciones se los quitan a las funciones admin.
  await b.exec(`alter default privileges in schema public grant execute on functions to anon, authenticated;`);
  // «Enable automatic RLS» de Supabase: una función + un event trigger que activa RLS en toda tabla nueva. La auditoría de la
  // Etapa 6 encontró que quedaba ejecutable por anon/authenticated; las migraciones se lo quitan (y el evento debe seguir sirviendo).
  await b.exec(`
    create function public.rls_auto_enable() returns event_trigger language plpgsql security definer set search_path = pg_catalog as $$
    declare cmd record;
    begin
      for cmd in select * from pg_event_trigger_ddl_commands() where command_tag in ('CREATE TABLE') and object_type in ('table')
      loop execute format('alter table if exists %s enable row level security', cmd.object_identity); end loop;
    end $$;
    create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE') execute function public.rls_auto_enable();
    grant create, usage on schema public to authenticated;
  `);
  // Supabase Auth (el esquema "auth" lo trae Supabase; aquí se imita lo mínimo: usuarios y auth.uid() desde el "token")
  await b.exec(`
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create schema extensions;
  `);
  return b;
}

const db = await baseNueva();
let fallos = 0;
let total = 0;
const ok = (nombre, cond, detalle = '') => {
  total++;
  if (!cond) fallos++;
  console.log(`${cond ? '  ✓' : '  ✗ FALLÓ'}  ${nombre}${!cond && detalle ? '  →  ' + detalle : ''}`);
};
const seccion = (t) => console.log(`\n${t}`);

const migraciones = ['0001_tablas.sql', '0002_funciones.sql', '0003_staff_admin.sql'];
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

// ════════════════════════════════════ ETAPA 5: caja (PIN) y panel de administrador ════════════════════════════════════
/** Llama a una función pública como la clave pública ('anon', la caja) o como un usuario con sesión ('authenticated', `sub` = su id de Auth). */
async function como(rol, sub, fn, firma, ...args) {
  await db.exec(`set role ${rol}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [sub ?? '']);
  try {
    const { rows } = await db.query(`select public.${fn}(${firma}) as r`, args);
    return rows[0].r;
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
const FIRMAS5 = {
  canje_consultar: '$1::text, $2::text', canje_confirmar: '$1::text, $2::text, $3::text',
  admin_yo: '', admin_resumen: '', admin_codigos: '$1::text, $2::text, $3::int, $4::int', admin_exportar: '$1::text, $2::text',
  admin_consultar_codigo: '$1::text', admin_canjear: '$1::text, $2::text', admin_estado_codigo: '$1::text, $2::text',
  admin_config: '', admin_guardar_config: '$1::jsonb', admin_cambiar_pin: '$1::text', admin_desbloquear_pin: '',
};
const ADMIN_ID = randomUUID();
const OTRO_ID = randomUUID();
await sql(`insert into auth.users (id, email) values ($1, 'dueno@example.com'), ($2, 'otro@example.com')`, [ADMIN_ID, OTRO_ID]);
const caja = (fn, ...a) => como('anon', null, fn, FIRMAS5[fn], ...a);
const admin = (fn, ...a) => como('authenticated', ADMIN_ID, fn, FIRMAS5[fn], ...a);
const otro = (fn, ...a) => como('authenticated', OTRO_ID, fn, FIRMAS5[fn], ...a);
const PIN = '482916';
const reiniciarStaff = () => sql(`update app.staff set fallos=0, bloqueos=0, ultimo_fallo=null, bloqueado_hasta=null where id=1`);
const reiniciarConfig5 = () =>
  sql(`update app.configuracion set premios_por_semana=50, intentos_por_semana=3, cupo_diario=0, vigencia_dias=7, compra_minima=30000, ventana_reclamo_min=15,
         regalos='["Un raspao personal","Un cholado de 10 oz"]'::jsonb, campana_inicio=null, campana_fin=null, prefijo_codigo='LAINDIA', largo_codigo=4,
         pin_intentos_max=5, pin_bloqueo_min=5, pin_intentos_max_global=30, limite_partidas_ip_hora=150, limite_codigos_ip_dia=8, juego='{}', frutas_minimas=25, duracion_partida_s=60 where id=1`);
async function nuevoCodigo(n, nombre = 'Marcela Escobar') {
  const g = await ganar(randomUUID());
  const r = await rpc('reclamar_codigo', g.token, nombre, CEL(n), true);
  return r.codigo;
}
const estadoDe = async (cod) => uno('select estado from app.codigos where codigo = $1', [cod]);

seccion('11. PIN del staff: guardado cifrado, límite de intentos y bloqueo');
await reiniciarDatos();
await reiniciarConfig5();
await sql(`delete from app.admins`);
await sql(`update app.staff set pin_hash=null, pin_cambiado_en=null where id=1`);
await reiniciarStaff();
{
  ok('sin PIN configurado la caja no puede consultar (sin-pin)', (await caja('canje_consultar', '1234', 'LAINDIA-AAAA')).resultado === 'sin-pin');
  ok('quien no está en app.admins no puede poner el PIN (no-autorizado)', (await admin('admin_cambiar_pin', PIN)).motivo === 'no-autorizado');
  await sql(`insert into app.admins (user_id) values ($1)`, [ADMIN_ID]);
  ok('admin_yo reconoce al administrador', (await admin('admin_yo')).esAdmin === true);
  ok('PIN con letras → rechazado', (await admin('admin_cambiar_pin', '12ab')).motivo === 'pin-invalido');
  ok('PIN de 3 números → rechazado', (await admin('admin_cambiar_pin', '123')).motivo === 'pin-invalido');
  ok('PIN de 9 números → rechazado', (await admin('admin_cambiar_pin', '123456789')).motivo === 'pin-invalido');
  const obvios = [];
  for (const p of ['1234', '654321', '000000', '777777']) obvios.push((await admin('admin_cambiar_pin', p)).motivo);
  ok('PIN obvio (1234, 654321, 000000, 777777) → pin-facil', obvios.every((m) => m === 'pin-facil'), JSON.stringify(obvios));
  ok('seguía sin PIN después de tantos rechazos', (await uno('select pin_hash is null from app.staff')) === true);
  ok('un PIN bueno se guarda', (await admin('admin_cambiar_pin', PIN)).ok === true);
  const h = await uno('select pin_hash from app.staff where id = 1');
  ok('el PIN se guarda CIFRADO (bcrypt), nunca en claro', /^\$2[aby]\$\d\d\$/.test(h) && !h.includes(PIN), h);

  const r1 = await caja('canje_consultar', '000111', 'LAINDIA-AAAA');
  ok('PIN malo → pin-incorrecto y dice cuántos intentos quedan (4)', r1.ok === false && r1.resultado === 'pin-incorrecto' && r1.intentosRestantes === 4, JSON.stringify(r1));
  let r = r1;
  for (let i = 0; i < 3; i++) r = await caja('canje_consultar', '000111', 'LAINDIA-AAAA');
  ok('al 4.º PIN malo queda 1 intento', r.resultado === 'pin-incorrecto' && r.intentosRestantes === 1, JSON.stringify(r));
  r = await caja('canje_consultar', '000111', 'LAINDIA-AAAA');
  ok('al 5.º PIN malo seguido → bloqueado 5 minutos', r.resultado === 'bloqueado' && r.segundos === 300 && typeof r.hastaISO === 'string', JSON.stringify(r));
  ok('bloqueado: NI el PIN correcto sirve (no se deja adivinar durante el bloqueo)', (await caja('canje_consultar', PIN, 'LAINDIA-AAAA')).resultado === 'bloqueado');
  ok('bloqueado: seguir insistiendo no cambia la cuenta', (await uno('select bloqueos from app.staff')) === 1 && (await uno('select fallos from app.staff')) === 0);
  await sql(`update app.staff set bloqueado_hasta = now() - interval '1 second'`);
  ok('pasado el bloqueo, el PIN correcto vuelve a funcionar', (await caja('canje_consultar', PIN, 'LAINDIA-AAAA')).resultado === 'inexistente');
  ok('…y un acierto borra los castigos', (await uno('select bloqueos from app.staff')) === 0 && (await uno('select bloqueado_hasta is null from app.staff')) === true);

  // Cada bloqueo seguido dura el doble, hasta 60 min
  const falla5 = async () => { let x; for (let i = 0; i < 5; i++) x = await caja('canje_consultar', '999000', 'X'); return x; };
  const esperados = [300, 600, 1200, 2400, 3600, 3600];
  const reales = [];
  for (let i = 0; i < esperados.length; i++) {
    reales.push((await falla5()).segundos);
    await sql(`update app.staff set bloqueado_hasta = now() - interval '1 second'`);
  }
  ok('cada bloqueo seguido dura el doble (5, 10, 20, 40, 60 y 60 min)', JSON.stringify(reales) === JSON.stringify(esperados), JSON.stringify(reales));
  await caja('canje_consultar', PIN, 'X'); // un acierto
  await caja('canje_consultar', '999000', 'X'); await caja('canje_consultar', '999000', 'X'); await caja('canje_consultar', '999000', 'X');
  await caja('canje_consultar', PIN, 'X');
  r = await caja('canje_consultar', '999000', 'X');
  ok('un acierto reinicia la cuenta (después de 3 fallos y un acierto, quedan 4 y no 1)', r.intentosRestantes === 4, JSON.stringify(r));
  await sql(`update app.staff set fallos = 4, bloqueos = 3, ultimo_fallo = now() - interval '25 hours' where id = 1`);
  r = await caja('canje_consultar', '999000', 'X');
  ok('tras 24 h sin fallar se olvida el castigo (queda 4 y no se bloquea)', r.resultado === 'pin-incorrecto' && r.intentosRestantes === 4, JSON.stringify(r));
  ok('un PIN vacío cuenta como PIN malo', (await caja('canje_consultar', null, 'X')).resultado === 'pin-incorrecto');

  await reiniciarStaff();
  await falla5();
  ok('(preparación) la caja quedó bloqueada', (await caja('canje_consultar', PIN, 'X')).resultado === 'bloqueado');
  ok('el administrador ve el bloqueo en el resumen', typeof (await admin('admin_resumen')).pin.bloqueadoHastaISO === 'string');
  ok('el administrador lo desbloquea y la caja vuelve a funcionar', (await admin('admin_desbloquear_pin')).ok === true && (await caja('canje_consultar', PIN, 'X')).resultado === 'inexistente');

  await sql(`update app.configuracion set pin_intentos_max = 3, pin_bloqueo_min = 1 where id = 1`);
  await reiniciarStaff();
  await caja('canje_consultar', '999000', 'X'); await caja('canje_consultar', '999000', 'X');
  r = await caja('canje_consultar', '999000', 'X');
  ok('el límite es configurable: con 3 intentos y 1 minuto, bloquea al 3.º por 60 s', r.resultado === 'bloqueado' && r.segundos === 60, JSON.stringify(r));
  await reiniciarConfig5();
  await reiniciarStaff();

  ok('cambiar el PIN: el nuevo sirve', (await admin('admin_cambiar_pin', '135790')).ok === true && (await caja('canje_consultar', '135790', 'X')).resultado === 'inexistente');
  ok('…y el viejo ya no', (await caja('canje_consultar', PIN, 'X')).resultado === 'pin-incorrecto');
  await admin('admin_cambiar_pin', PIN);
  await reiniciarStaff();
}

seccion('12. Canje en caja: consultar y confirmar');
await reiniciarDatos();
{
  const cod = await nuevoCodigo(41);
  const sufijo = cod.slice(-4);
  const dev = await uno('select device_id from app.codigos where codigo = $1', [cod]);
  let r = await caja('canje_consultar', PIN, cod);
  ok('código válido → "valido" con la lista de regalos y la compra mínima', r.ok && r.resultado === 'valido' && r.regalos.length === 2 && r.compraMinima === 30000 && r.codigo === cod, JSON.stringify(r));
  ok('la caja NO ve el nombre ni el celular del cliente', !JSON.stringify(r).includes('Marcela') && !JSON.stringify(r).includes(CEL(41)));
  const resultados = [];
  for (const v of ['laindia-' + sufijo.toLowerCase(), 'LAINDIA' + sufijo, '  laindia   ' + sufijo + ' ', sufijo, sufijo.toLowerCase()]) resultados.push((await caja('canje_consultar', PIN, v)).codigo);
  ok('se acepta en minúsculas, sin guion, con espacios o solo las 4 letras finales', resultados.every((x) => x === cod), JSON.stringify(resultados));
  ok('un código que no existe → inexistente', (await caja('canje_consultar', PIN, 'LAINDIA-ZZZZ')).resultado === 'inexistente');
  ok('basura, vacío o nulo → inexistente (sin errores)', (await caja('canje_consultar', PIN, '!!')).resultado === 'inexistente' && (await caja('canje_consultar', PIN, '')).resultado === 'inexistente' && (await caja('canje_consultar', PIN, null)).resultado === 'inexistente');
  ok('consultar NO canjea', (await estadoDe(cod)) === 'activo');

  ok('confirmar con PIN malo → no canjea', (await caja('canje_confirmar', '000111', cod, 'Un raspao personal')).resultado === 'pin-incorrecto' && (await estadoDe(cod)) === 'activo');
  ok('confirmar sin elegir regalo → regalo-invalido y NO canjea', (await caja('canje_confirmar', PIN, cod, null)).resultado === 'regalo-invalido' && (await estadoDe(cod)) === 'activo');
  ok('un regalo que no está en la lista → regalo-invalido', (await caja('canje_confirmar', PIN, cod, 'Un carro')).resultado === 'regalo-invalido');
  const c = await caja('canje_confirmar', PIN, cod, 'Un raspao personal');
  ok('confirmar con regalo → canjeado-ahora', c.ok === true && c.resultado === 'canjeado-ahora' && c.regaloElegido === 'Un raspao personal' && typeof c.canjeadoISO === 'string', JSON.stringify(c));
  const fila = (await sql('select estado, canjeado_por, canjeado_en, regalo_elegido from app.codigos where codigo = $1', [cod]))[0];
  ok('queda canjeado, por "staff", con hora y regalo guardados', fila.estado === 'canjeado' && fila.canjeado_por === 'staff' && fila.canjeado_en && fila.regalo_elegido === 'Un raspao personal', JSON.stringify(fila));
  const seg = await caja('canje_confirmar', PIN, cod, 'Un cholado de 10 oz');
  ok('segundo toque / segundo cajero → ya canjeado (con fecha y el regalo de la primera vez)', seg.ok === false && seg.resultado === 'canjeado' && typeof seg.canjeadoISO === 'string' && seg.regaloElegido === 'Un raspao personal', JSON.stringify(seg));
  ok('el regalo no se cambió con el segundo intento', (await uno('select regalo_elegido from app.codigos where codigo = $1', [cod])) === 'Un raspao personal');
  r = await caja('canje_consultar', PIN, cod);
  ok('consultar ahora dice "canjeado" con fecha y regalo', r.resultado === 'canjeado' && typeof r.canjeadoISO === 'string' && r.regaloElegido === 'Un raspao personal');
  ok('canjeado queda desactivado: ni se reactiva ni se desactiva', (await admin('admin_estado_codigo', cod, 'activo')).motivo === 'canjeado' && (await admin('admin_estado_codigo', cod, 'desactivado')).motivo === 'canjeado');
  ok('el juego (mi_codigo) también lo ve canjeado', (await rpc('mi_codigo', dev)).estado === 'canjeado');
}
{
  const cod = await nuevoCodigo(42);
  await sql(`update app.codigos set vence_en = now() - interval '1 minute' where codigo = $1`, [cod]);
  const r = await caja('canje_consultar', PIN, cod);
  ok('código vencido → "vencido" con su fecha de vencimiento', r.resultado === 'vencido' && typeof r.venceISO === 'string', JSON.stringify(r));
  const c = await caja('canje_confirmar', PIN, cod, 'Un raspao personal');
  ok('no se puede canjear un vencido (y queda como estaba)', c.ok === false && c.resultado === 'vencido' && (await estadoDe(cod)) === 'activo');
}
{
  const cod = await nuevoCodigo(43);
  ok('el administrador desactiva un código', (await admin('admin_estado_codigo', cod, 'desactivado')).estado === 'desactivado');
  ok('la caja lo ve "desactivado" y no lo puede canjear', (await caja('canje_consultar', PIN, cod)).resultado === 'desactivado' && (await caja('canje_confirmar', PIN, cod, 'Un raspao personal')).resultado === 'desactivado');
  ok('el administrador lo reactiva y vuelve a servir', (await admin('admin_estado_codigo', cod, 'activo')).estado === 'activo' && (await caja('canje_consultar', PIN, cod)).resultado === 'valido');
  ok('estado inválido o código inexistente no rompe nada', (await admin('admin_estado_codigo', cod, 'canjeado')).motivo === 'datos' && (await admin('admin_estado_codigo', 'NOEXISTE', 'desactivado')).motivo === 'inexistente');
}
{
  await sql(`update app.configuracion set regalos = '["Solo uno"]'::jsonb where id = 1`);
  const cod = await nuevoCodigo(44);
  const c = await caja('canje_confirmar', PIN, cod, null);
  ok('si solo hay un regalo configurado no hace falta elegir', c.ok === true && c.regaloElegido === 'Solo uno', JSON.stringify(c));
  await reiniciarConfig5();
}

seccion('13. Permisos: la clave pública NO entra a lo del administrador');
{
  const adminFns = [
    ['admin_yo', []], ['admin_resumen', []], ['admin_codigos', ['todos', null, 0, 10]], ['admin_exportar', ['todos', null]],
    ['admin_consultar_codigo', ['X']], ['admin_canjear', ['X', null]], ['admin_estado_codigo', ['X', 'desactivado']],
    ['admin_config', []], ['admin_guardar_config', ['{}']], ['admin_cambiar_pin', ['135790']], ['admin_desbloquear_pin', []],
  ];
  let denegadas = 0;
  for (const [fn, args] of adminFns) {
    try { await como('anon', null, fn, FIRMAS5[fn], ...args); } catch (e) { if (/permission denied/.test(e.message)) denegadas++; }
  }
  ok('la clave pública (anon) NO puede llamar ninguna de las 11 funciones admin_*', denegadas === 11, `${denegadas} de 11`);
  let respuestas = 0;
  for (const [fn, args] of adminFns.filter(([f]) => f !== 'admin_yo')) {
    const r = await como('authenticated', OTRO_ID, fn, FIRMAS5[fn], ...args);
    if (r.ok === false && r.motivo === 'no-autorizado') respuestas++;
  }
  ok('un usuario con sesión que NO es administrador recibe "no-autorizado" en las otras 10', respuestas === 10, `${respuestas} de 10`);
  ok('…y admin_yo le dice esAdmin = false', (await otro('admin_yo')).esAdmin === false);
  ok('una sesión sin usuario (sin sub) tampoco es administrador', (await como('authenticated', null, 'admin_yo', '')).esAdmin === false);
  ok('el PIN no cambió con los intentos de quien no es administrador', (await caja('canje_consultar', PIN, 'X')).resultado === 'inexistente');
  const priv = await sql(`select p.proname, has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') auth
                            from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'admin\\_%'`);
  ok('las 11 funciones admin_*: anon NO tiene permiso y authenticated SÍ', priv.length === 11 && priv.every((x) => x.anon === false && x.auth === true), JSON.stringify(priv.filter((x) => x.anon || !x.auth)));
  const cj = await sql(`select has_function_privilege('anon','public.canje_consultar(text,text)','execute') a, has_function_privilege('anon','public.canje_confirmar(text,text,text)','execute') b`);
  ok('la caja (clave pública) sí puede llamar canje_consultar y canje_confirmar', cj[0].a === true && cj[0].b === true);
  const denegar = async (rol, q) => {
    await db.exec(`set role ${rol}`);
    let msg = null;
    try { await db.query(q); } catch (e) { msg = e.message; } finally { await db.exec('reset role'); }
    return msg !== null && /permission denied|does not exist/.test(msg);
  };
  const cierres = [];
  for (const rol of ['anon', 'authenticated']) {
    for (const q of ['select * from app.admins', 'select * from app.staff', 'select * from app.codigos', `select app.verificar_pin('x')`, `select app.canjear('a','b','c')`,
                     `select app.guardar_config('{}'::jsonb)`, `select app.cambiar_pin('135790')`, 'select app.es_admin()']) {
      cierres.push(await denegar(rol, q));
    }
  }
  ok('ni anon ni authenticated tocan las tablas del PIN/admins ni las funciones internas', cierres.every(Boolean), JSON.stringify(cierres));
  const rls = await sql(`select relname, relrowsecurity from pg_class where relnamespace = 'app'::regnamespace and relname in ('admins','staff')`);
  ok('RLS activado en app.admins y app.staff', rls.length === 2 && rls.every((x) => x.relrowsecurity));
  const fn = await sql(`select p.proname, p.prosecdef from pg_proc p where p.pronamespace = 'public'::regnamespace and (p.proname like 'admin\\_%' or p.proname like 'canje\\_%')`);
  ok('las 13 funciones nuevas son SECURITY DEFINER', fn.length === 13 && fn.every((x) => x.prosecdef), JSON.stringify(fn));
}

seccion('14. Panel admin: métricas, lista, búsqueda y exportación');
await reiniciarDatos();
await reiniciarStaff();
{
  const a = await nuevoCodigo(51, 'María Pérez');
  const b = await nuevoCodigo(52, 'Juan Gómez');
  const c3 = await nuevoCodigo(53, 'Ana Ruiz');
  await caja('canje_confirmar', PIN, a, 'Un raspao personal');
  await admin('admin_estado_codigo', c3, 'desactivado');
  await sql(`update app.codigos set vence_en = now() - interval '1 minute' where codigo = $1`, [b]);
  const per = await rpc('iniciar_partida', randomUUID());
  await rpc('terminar_partida', per.token, false, 0.3, 2);
  const rap = await rpc('iniciar_partida', randomUUID());
  await rpc('terminar_partida', rap.token, true, 1, 30);
  const hoy = await uno(`select app.dia_de(now())::text`);

  const res = await admin('admin_resumen');
  ok('resumen: 3 códigos (1 canjeado, 1 vencido, 1 desactivado, 0 activos)', res.codigos.total === 3 && res.codigos.canjeados === 1 && res.codigos.vencidos === 1 && res.codigos.desactivados === 1 && res.codigos.activos === 0, JSON.stringify(res.codigos));
  ok('resumen: 5 partidas, 3 ganadoras, 1 rechazada', res.partidas.total === 5 && res.partidas.ganadores === 3 && res.partidas.rechazadas === 1, JSON.stringify(res.partidas));
  ok('resumen: quedan 47 de 50 premios y el juego está abierto', res.premiosRestantes === 47 && res.premiosPorSemana === 50 && res.jugable === true);
  ok('resumen: 14 días; el primero es hoy (hora de Bogotá) con 3 códigos, 1 canje y 5 partidas', res.dias.length === 14 && res.dias[0].dia === hoy && res.dias[0].codigos === 3 && res.dias[0].canjes === 1 && res.dias[0].partidas === 5, JSON.stringify(res.dias[0]));
  ok('resumen: dice que el PIN está configurado', res.pin.configurado === true);

  let l = await admin('admin_codigos', 'todos', null, 0, 50);
  ok('lista: 3 filas, la más nueva primero', l.ok && l.total === 3 && l.filas.length === 3 && l.filas[0].codigo === c3 && l.filas[2].codigo === a, JSON.stringify(l.filas.map((f) => f.codigo)));
  ok('lista: cada fila trae nombre, celular, estado, fechas y regalo', l.filas[2].nombre === 'María Pérez' && l.filas[2].celular === CEL(51) && l.filas[2].estado === 'canjeado' && l.filas[2].regalo === 'Un raspao personal' && l.filas[2].canjeadoPor === 'staff');
  const cuenta = async (estado, buscar = null) => (await admin('admin_codigos', estado, buscar, 0, 50)).total;
  ok('filtros: canjeado 1 · vencido 1 · desactivado 1 · activo 0', (await cuenta('canjeado')) === 1 && (await cuenta('vencido')) === 1 && (await cuenta('desactivado')) === 1 && (await cuenta('activo')) === 0);
  ok('buscar sin tilde ni mayúsculas: "maria" encuentra a María; "GOMEZ" a Juan', (await cuenta('todos', 'maria')) === 1 && (await cuenta('todos', 'GOMEZ')) === 1);
  ok('buscar por código (en minúsculas)', (await cuenta('todos', a.toLowerCase())) === 1);
  ok('buscar por celular: parte de él o completo con espacios', (await cuenta('todos', '000052')) === 1 && (await cuenta('todos', '310 000 0053')) === 1);
  ok('buscar "%" o "_" no devuelve todo (no son comodines)', (await cuenta('todos', '%')) === 0 && (await cuenta('todos', '_')) === 0);
  ok('buscar + filtrar a la vez', (await cuenta('canjeado', 'maria')) === 1 && (await cuenta('vencido', 'maria')) === 0);
  l = await admin('admin_codigos', 'todos', null, 2, 2);
  ok('paginación: desde 2, de a 2 → 1 fila (total 3)', l.total === 3 && l.filas.length === 1 && l.filas[0].codigo === a);
  ok('un límite exagerado se recorta sin romper', (await admin('admin_codigos', 'todos', null, 0, 99999)).filas.length === 3);

  const ex = await admin('admin_exportar', 'todos', null);
  ok('exportar: trae todas las filas con sus datos', ex.ok && ex.total === 3 && ex.filas.length === 3 && ex.filas.every((f) => f.nombre && f.celular && f.estado));
  const exF = await admin('admin_exportar', 'canjeado', null);
  ok('exportar respeta el filtro', exF.filas.length === 1 && exF.filas[0].codigo === a);

  const d = await admin('admin_consultar_codigo', a);
  ok('el administrador SÍ ve nombre y celular al consultar', d.resultado === 'canjeado' && d.nombre === 'María Pérez' && d.celular === CEL(51) && d.canjeadoPor === 'staff', JSON.stringify(d));
  const nuevo = await nuevoCodigo(54, 'Pedro Gil');
  const ca = await admin('admin_canjear', nuevo, 'Un cholado de 10 oz');
  ok('el administrador canjea sin PIN (queda "admin")', ca.ok === true && (await uno('select canjeado_por from app.codigos where codigo = $1', [nuevo])) === 'admin');
  ok('el administrador no canjea dos veces el mismo', (await admin('admin_canjear', nuevo, 'Un cholado de 10 oz')).resultado === 'canjeado');
}

seccion('15. Editor de configuración (todo o nada)');
await reiniciarDatos();
await reiniciarConfig5();
{
  const cfg = await admin('admin_config');
  ok('admin_config trae toda la configuración', cfg.ok && cfg.config.intentosPorSemana === 3 && cfg.config.premiosPorSemana === 50 && cfg.config.compraMinima === 30000 && cfg.config.regalos.length === 2 &&
     cfg.config.prefijoCodigo === 'LAINDIA' && cfg.config.pinIntentosMax === 5 && cfg.config.frutasMinimas === 25 && cfg.config.campanaInicioISO === null && typeof cfg.config.actualizadoISO === 'string', JSON.stringify(cfg.config));
  const guardar = (o) => admin('admin_guardar_config', JSON.stringify(o));
  let g = await guardar({ premiosPorSemana: 40, intentosPorSemana: 4, cupoDiario: 7, vigenciaDias: 10, compraMinima: 35000, regalos: ['Raspao', 'Cholado 10 oz', 'Jugo'], ventanaReclamoMin: 20 });
  ok('un cambio válido se guarda y devuelve la configuración nueva', g.ok === true && g.config.premiosPorSemana === 40 && g.config.regalos.length === 3, JSON.stringify(g));
  let e = await rpc('estado', null);
  ok('el juego (estado) ya ve los cambios', e.premiosPorSemana === 40 && e.intentosPorSemana === 4 && e.reglas.compraMinima === 35000 && e.reglas.vigenciaDias === 10 && e.reglas.regalos.length === 3 && e.reglas.ventanaReclamoMin === 20);
  ok('lo que no se mandó no cambió (duración y frutas siguen igual)', e.juego.partida.duracionS === 60 && e.juego.partida.frutasMinimas === 25);

  const malos = [
    ['intentos en 0', { intentosPorSemana: 0 }], ['premios con texto', { premiosPorSemana: 'muchos' }], ['premios decimal', { premiosPorSemana: 10.5 }],
    ['premios gigantes', { premiosPorSemana: 999999 }], ['sin regalos', { regalos: [] }], ['regalo de 1 letra', { regalos: ['x'] }],
    ['regalos repetidos', { regalos: ['Raspao', ' Raspao '] }], ['demasiados regalos', { regalos: ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7'] }],
    ['prefijo con espacio', { prefijoCodigo: 'la india' }], ['prefijo muy corto', { prefijoCodigo: 'A' }],
    ['campaña al revés', { campanaInicioISO: '2099-02-01T00:00:00Z', campanaFinISO: '2099-01-01T00:00:00Z' }], ['fecha basura', { campanaInicioISO: 'mañana' }],
    ['velocidad absurda', { juego: { velocidad: { inicial: 1000 } } }], ['grupo desconocido', { juego: { hack: { x: 1 } } }], ['valor no numérico', { juego: { velocidad: { inicial: 'rápido' } } }],
    ['juego no es objeto', { juego: [1, 2] }], ['largo de código 2', { largoCodigo: 2 }], ['duración 5 s', { duracionPartidaS: 5 }],
  ];
  const fallas = [];
  for (const [nombre, o] of malos) {
    const r = await guardar(o);
    if (!(r.ok === false && r.motivo === 'datos' && typeof r.mensaje === 'string' && r.mensaje.length > 5)) fallas.push(nombre + ': ' + JSON.stringify(r));
  }
  ok(`${malos.length} configuraciones inválidas se rechazan con un mensaje claro`, fallas.length === 0, fallas.join(' | '));
  g = await guardar({ premiosPorSemana: 10, intentosPorSemana: 0 });
  ok('TODO O NADA: si un campo es inválido, ninguno se guarda', g.ok === false && (await rpc('estado', null)).premiosPorSemana === 40);
  ok('(la configuración sigue teniendo su única fila)', Number(await uno('select count(*) from app.configuracion')) === 1);

  g = await guardar({ campanaInicioISO: '2099-01-01T05:00:00Z', campanaFinISO: '2099-03-01T04:59:59Z' });
  e = await rpc('estado', null);
  ok('fechas de campaña: antes de empezar el juego dice campana-inactiva', g.ok === true && g.config.campanaInicioISO === '2099-01-01T05:00:00.000Z' && e.jugable === false && e.motivo === 'campana-inactiva', JSON.stringify(e));
  g = await guardar({ campanaInicioISO: null, campanaFinISO: null });
  ok('se puede dejar la campaña sin fechas (siempre activa)', g.ok === true && g.config.campanaInicioISO === null && (await rpc('estado', null)).jugable === true);

  g = await guardar({ juego: { velocidad: { inicial: 11, final: 15 }, obstaculos: { separacionFinalS: 1.1 }, partida: { vidas: 4 } }, frutasMinimas: 22 });
  e = await rpc('estado', null);
  ok('dificultad: llega al juego, junto con las frutas mínimas', g.ok === true && e.juego.velocidad.inicial === 11 && e.juego.velocidad.final === 15 && e.juego.obstaculos.separacionFinalS === 1.1 && e.juego.partida.vidas === 4 && e.juego.partida.frutasMinimas === 22, JSON.stringify(e.juego));
  g = await guardar({ juego: { partida: { frutasMinimas: 3, duracionS: 7, vidas: 3 } } });
  const parte = await uno(`select juego -> 'partida' from app.configuracion`);
  ok('frutasMinimas/duracionS escritas dentro de "juego" no pisan las columnas reales', (await uno('select frutas_minimas from app.configuracion')) === 22 && (await uno('select duracion_partida_s from app.configuracion')) === 60 && !('frutasMinimas' in parte) && !('duracionS' in parte), JSON.stringify(parte));
  g = await guardar({ juego: {} });
  ok('"juego: {}" vuelve a los valores de fábrica de config.js', g.ok === true && !('velocidad' in (await rpc('estado', null)).juego));
  g = await guardar({ prefijoCodigo: ' cholado ', largoCodigo: 5 });
  const nc = await nuevoCodigo(61);
  ok('prefijo y largo nuevos se aplican a los códigos que se expidan (CHOLADO-XXXXX)', g.ok === true && /^CHOLADO-[A-Z2-9]{5}$/.test(nc), nc);
  ok('…y la caja encuentra el código por sus 5 letras finales', (await caja('canje_consultar', PIN, nc.slice(-5))).resultado === 'valido');
  await reiniciarConfig5();
  ok('un usuario que no es administrador no puede guardar configuración', (await otro('admin_guardar_config', JSON.stringify({ premiosPorSemana: 1 }))).motivo === 'no-autorizado' && (await rpc('estado', null)).premiosPorSemana === 50);
}

// ════════════════════════════════════ ETAPA 6: endurecimiento ════════════════════════════════════
FIRMAS.diag_red = '';
/** Ejecuta `fn` como si la petición viniera de esa red: así llegan los encabezados a la base (Supabase los pone en request.headers). */
const conRed = async (cab, fn) => {
  await db.query(`select set_config('request.headers', $1, false)`, [cab ? JSON.stringify(cab) : '']);
  try {
    return await fn();
  } finally {
    await db.query(`select set_config('request.headers', '', false)`);
  }
};
const red = (ip) => ({ 'cf-connecting-ip': ip, 'user-agent': 'prueba' });
const RED_A = '203.0.113.7';
const RED_B = '198.51.100.9';

seccion('16. Etapa 6 — Límites por red (IP): frenan a un script sin molestar a la gente');
await reiniciarDatos();
await reiniciarConfig5();
await sql(`truncate app.limites_red`);
{
  await sql(`update app.configuracion set limite_partidas_ip_hora = 2 where id = 1`);
  const sinIp = [];
  for (let i = 0; i < 4; i++) sinIp.push((await rpc('iniciar_partida', randomUUID())).ok);
  ok('sin IP conocida los límites por red NO se aplican (ante la duda se deja jugar)', sinIp.every(Boolean), JSON.stringify(sinIp));
  await reiniciarDatos();
  await sql(`truncate app.limites_red`);

  const devs = Array.from({ length: 4 }, () => randomUUID());
  const r = [];
  await conRed(red(RED_A), async () => { for (let i = 0; i < 3; i++) r.push(await rpc('iniciar_partida', devs[i])); });
  ok('la red A: 2 partidas bien y la 3.ª → limite-red (con la hora en que se renueva)', r[0].ok && r[1].ok && r[2].ok === false && r[2].motivo === 'limite-red' && /:00:00\.000Z$/.test(r[2].reiniciaEnISO), JSON.stringify(r[2]));
  ok('la partida bloqueada NO gastó intentos del dispositivo', (await rpc('estado', devs[2])).intentosRestantes === 3);
  ok('otra red (B) no se afecta', (await conRed(red(RED_B), () => rpc('iniciar_partida', devs[3]))).ok === true);
  const cambiaXff = await conRed({ 'cf-connecting-ip': RED_A, 'x-forwarded-for': '9.9.9.9, 8.8.8.8' }, () => rpc('iniciar_partida', randomUUID()));
  ok('cf-connecting-ip manda sobre x-forwarded-for (no se escapa inventando ese encabezado)', cambiaXff.ok === false && cambiaXff.motivo === 'limite-red');
  const soloXff = await conRed({ 'x-forwarded-for': `${RED_A}, 10.0.0.1` }, () => rpc('iniciar_partida', randomUUID()));
  ok('sin cf-connecting-ip se usa el primer valor de x-forwarded-for (misma red A → bloqueada)', soloXff.motivo === 'limite-red');
  const claves = (await sql(`select clave from app.limites_red`)).map((x) => x.clave);
  ok('la IP nunca se guarda en claro (solo una huella con sal secreta)', claves.length >= 2 && claves.every((k) => /^partidas:[0-9a-f]{24}$/.test(k)) && !claves.some((k) => k.includes('203.0.113')), JSON.stringify(claves));
  await sql(`update app.limites_red set ventana = ventana - interval '1 hour'`);
  ok('al pasar la hora la red A vuelve a poder jugar', (await conRed(red(RED_A), () => rpc('iniciar_partida', randomUUID()))).ok === true);
  await sql(`update app.configuracion set limite_partidas_ip_hora = 0 where id = 1`);
  const apagado = await conRed(red(RED_A), async () => { const x = []; for (let i = 0; i < 6; i++) x.push((await rpc('iniciar_partida', randomUUID())).ok); return x; });
  ok('con el límite en 0 queda apagado', apagado.every(Boolean));

  // Códigos por día desde una misma red
  await reiniciarDatos();
  await reiniciarConfig5();
  await sql(`truncate app.limites_red`);
  await sql(`update app.configuracion set limite_codigos_ip_dia = 2 where id = 1`);
  const gs = [];
  for (let i = 0; i < 3; i++) gs.push(await ganar(randomUUID()));
  const cl = [];
  await conRed(red(RED_A), async () => { for (let i = 0; i < 3; i++) cl.push(await rpc('reclamar_codigo', gs[i].token, 'Persona ' + i, CEL(70 + i), true)); });
  ok('desde una misma red solo salen 2 códigos al día; el 3.º → limite-red', cl[0].ok && cl[1].ok && cl[2].ok === false && cl[2].motivo === 'limite-red', JSON.stringify(cl[2]));
  ok('el premio del bloqueado sigue apartado: reclama sin problema desde otra red', (await conRed(red(RED_B), () => rpc('reclamar_codigo', gs[2].token, 'Persona 2', CEL(72), true))).ok === true);
  ok('el bloqueo no creó ningún código de más (hay exactamente 3)', Number(await uno('select count(*) from app.codigos')) === 3);
  const repetido = await conRed(red(RED_A), () => rpc('reclamar_codigo', gs[0].token, 'Persona 0', CEL(70), true));
  ok('repetir un reclamo ya hecho devuelve el mismo código y no gasta el límite', repetido.ok === true && repetido.repetido === true);

  // No se puede ir preguntando "¿este número ya ganó?" con un mismo token
  await reiniciarDatos();
  await reiniciarConfig5();
  for (let i = 0; i < 6; i++) await nuevoCodigo(80 + i);
  const gw = await ganar(randomUUID());
  const probados = [];
  for (let i = 0; i < 5; i++) probados.push((await rpc('reclamar_codigo', gw.token, 'Curioso', CEL(80 + i), true)).motivo);
  const sexto = await rpc('reclamar_codigo', gw.token, 'Curioso', CEL(99), true);
  ok('con un token ganador solo se pueden probar 5 celulares que ya tenían código', probados.every((m) => m === 'ya-tienes-codigo'), JSON.stringify(probados));
  ok('al 6.º intento el token ya no sirve (ni con un celular libre): no se puede preguntar número por número', sexto.ok === false && sexto.motivo === 'partida-invalida', JSON.stringify(sexto));

  // Diagnóstico de red
  const d0 = await rpc('diag_red');
  ok('diag_red sin encabezados: la red no se reconoce', d0.ipReconocida === false && d0.huella === null, JSON.stringify(d0));
  const d1 = await conRed({ 'cf-connecting-ip': RED_A, 'x-forwarded-for': '1.1.1.1' }, () => rpc('diag_red'));
  ok('diag_red con encabezados: los muestra, reconoce la red y devuelve solo una huella', d1.cfConnectingIp === RED_A && d1.xForwardedFor === '1.1.1.1' && d1.ipReconocida === true && /^[0-9a-f]{24}$/.test(d1.huella), JSON.stringify(d1));
  await reiniciarConfig5();
}

seccion('17. Etapa 6 — PIN: cada red tiene sus intentos (un bromista no bloquea la caja de todos)');
await reiniciarDatos();
await reiniciarConfig5();
await reiniciarStaff();
await sql(`truncate app.limites_red`);
{
  await admin('admin_cambiar_pin', PIN);
  const malos = [];
  await conRed(red(RED_A), async () => { for (let i = 0; i < 5; i++) malos.push(await caja('canje_consultar', '999000', 'X')); });
  ok('la red A: quedan 4, 3, 2, 1 intentos y al 5.º queda bloqueada hasta que termine su ventana de 15 min', [4, 3, 2, 1].every((n, i) => malos[i].intentosRestantes === n) && malos[4].resultado === 'bloqueado' && malos[4].segundos > 0 && malos[4].segundos <= 900, JSON.stringify(malos.map((m) => m.intentosRestantes ?? m.resultado)));
  ok('la red A bloqueada: ni el PIN correcto sirve', (await conRed(red(RED_A), () => caja('canje_consultar', PIN, 'X'))).resultado === 'bloqueado');
  ok('la caja de verdad (red B) NO se afecta: con el PIN correcto funciona', (await conRed(red(RED_B), () => caja('canje_consultar', PIN, 'X'))).resultado === 'inexistente');
  ok('no hubo bloqueo general (solo 5 fallos de una red)', (await uno('select bloqueado_hasta is null from app.staff')) === true);
  ok('el administrador desbloquea y la red A vuelve a poder', (await admin('admin_desbloquear_pin')).ok === true && (await conRed(red(RED_A), () => caja('canje_consultar', PIN, 'X'))).resultado === 'inexistente');

  await sql(`update app.configuracion set pin_intentos_max_global = 6 where id = 1`);
  await reiniciarStaff();
  await sql(`truncate app.limites_red`);
  let ultimo;
  for (let i = 0; i < 6; i++) ultimo = await conRed(red(`192.0.2.${i + 1}`), () => caja('canje_consultar', '999000', 'X'));
  ok('un ataque repartido en 6 redes distintas sí activa el bloqueo general (5 min)', ultimo.resultado === 'bloqueado' && ultimo.segundos === 300, JSON.stringify(ultimo));
  ok('…y durante el bloqueo general hasta una red nueva queda afuera', (await conRed(red('192.0.2.200'), () => caja('canje_consultar', PIN, 'X'))).resultado === 'bloqueado');
  await reiniciarConfig5();
  await reiniciarStaff();
  await sql(`truncate app.limites_red`);

  await conRed(red(RED_A), async () => { await caja('canje_consultar', '999000', 'X'); await caja('canje_consultar', '999000', 'X'); });
  await conRed(red(RED_A), () => caja('canje_consultar', PIN, 'X'));
  const tras = await conRed(red(RED_A), () => caja('canje_consultar', '999000', 'X'));
  ok('un acierto borra los fallos de esa red (queda 4, no 2)', tras.intentosRestantes === 4, JSON.stringify(tras));
  ok('los contadores del PIN tampoco guardan la IP en claro', !(await sql(`select clave from app.limites_red`)).some((x) => /\d+\.\d+\.\d+\.\d+/.test(x.clave)));
  await reiniciarStaff();
}

seccion('18. Etapa 6 — Casos de tiempo: vencimiento exacto, lunes 00:00 y el reloj del celular');
await reiniciarDatos();
await reiniciarConfig5();
await reiniciarStaff();
await sql(`truncate app.limites_red`);
{
  const cod = await nuevoCodigo(91);
  await sql(`update app.codigos set vence_en = now() + interval '3 seconds' where codigo = $1`, [cod]);
  ok('3 segundos antes de vencer: sigue "valido"', (await caja('canje_consultar', PIN, cod)).resultado === 'valido');
  await sql(`update app.codigos set vence_en = now() - interval '1 millisecond' where codigo = $1`, [cod]);
  ok('1 milisegundo después de vencer: "vencido" y NO se puede canjear', (await caja('canje_consultar', PIN, cod)).resultado === 'vencido' && (await caja('canje_confirmar', PIN, cod, 'Un raspao personal')).resultado === 'vencido');
  const c2 = await nuevoCodigo(92);
  ok('un código recién expedido vence EXACTAMENTE 7 días después de su minuto de expedición', (await uno(`select vence_en = date_trunc('minute', emitido_en) + interval '7 days' from app.codigos where codigo = $1`, [c2])) === true);
  await sql(`update app.codigos set vence_en = now() + interval '1 minute' where codigo = $1`, [c2]);
  ok('al minuto «vale hasta» (queda 1 minuto) todavía se canjea', (await caja('canje_confirmar', PIN, c2, 'Un raspao personal')).resultado === 'canjeado-ahora');
  const dev = await uno(`select device_id from app.codigos where codigo = $1`, [cod]);
  ok('el juego (mi_codigo) también lo ve vencido y sin segundos restantes', (await rpc('mi_codigo', dev)).estado === 'vencido' && (await rpc('mi_codigo', dev)).segundosRestantes === 0);

  const sem = (ts) => uno(`select app.semana_de($1::timestamptz)::text`, [ts]);
  ok('domingo 23:59:59 (Bogotá) = semana vieja; lunes 00:00:00 = semana nueva', (await sem('2026-10-26 04:59:59+00')) === '2026-10-19' && (await sem('2026-10-26 05:00:00+00')) === '2026-10-26');
  ok('Bogotá no cambia de hora: el lunes 00:00 es siempre 05:00 UTC (probado en julio y en marzo)',
    (await sem('2026-07-06 04:59:59+00')) === '2026-06-29' && (await sem('2026-07-06 05:00:00+00')) === '2026-07-06' &&
    (await sem('2026-03-09 04:59:59+00')) === '2026-03-02' && (await sem('2026-03-09 05:00:00+00')) === '2026-03-09');
  const estado = await rpc('estado', null);
  ok('la renovación semanal que ve el juego es un lunes a las 05:00 UTC (00:00 de Bogotá)', /T05:00:00\.000Z$/.test(estado.reiniciaEnISO) && new Date(estado.reiniciaEnISO).getUTCDay() === 1, estado.reiniciaEnISO);

  const nombres = ['ping', 'estado', 'iniciar_partida', 'terminar_partida', 'reclamar_codigo', 'mi_codigo', 'diag_red', 'canje_consultar', 'canje_confirmar',
    'admin_yo', 'admin_resumen', 'admin_codigos', 'admin_exportar', 'admin_consultar_codigo', 'admin_canjear', 'admin_estado_codigo', 'admin_config',
    'admin_guardar_config', 'admin_cambiar_pin', 'admin_desbloquear_pin'];
  const fns = await sql(`select p.proname, pg_get_function_arguments(p.oid) as args from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any($1::text[])`, [nombres]);
  const conTiempo = fns.filter((f) => /(fecha|hora|time|tiempo|ahora|now|reloj|date)/i.test(f.args));
  ok('NINGUNA de las 20 funciones públicas recibe una fecha u hora: el reloj del celular no cuenta para nada', fns.length === 20 && conTiempo.length === 0, JSON.stringify(conTiempo));
}

seccion('19. Etapa 6 — Auditoría de permisos (la misma que correrás en tu Supabase real)');
{
  const auditoria = await readFile(new URL('../supabase/sql/auditoria_permisos.sql', import.meta.url), 'utf8');
  const filas = await sql(auditoria);
  ok('la auditoría dice «Todo en orden» (0 problemas)', filas.length === 1 && /Todo en orden/.test(filas[0].problema), JSON.stringify(filas));
  await db.exec('grant select on app.codigos to anon');
  ok('si se le diera permiso a anon sobre app.codigos, la auditoría lo detecta', (await sql(auditoria)).some((x) => /permiso sobre una tabla/.test(x.problema)));
  await db.exec('revoke select on app.codigos from anon');
  await db.exec('grant execute on function app.config() to anon');
  ok('…y si se abriera una función interna', (await sql(auditoria)).some((x) => /Función interna/.test(x.problema)));
  await db.exec('revoke execute on function app.config() from anon');
  await db.exec('create table public.cosa_suelta (id int)');
  ok('…y una tabla suelta en public', (await sql(auditoria)).some((x) => /suelta en «public»/.test(x.problema)));
  await db.exec('drop table public.cosa_suelta');
  await db.exec(`create function public.sorpresa() returns int language sql as 'select 1'`);
  const conSorpresa = await sql(auditoria);
  ok('…y una función pública nueva (con el permiso por defecto de Supabase y sin security definer)', conSorpresa.some((x) => /NO prevista/.test(x.problema)) && conSorpresa.some((x) => /SIN security definer/.test(x.problema)));
  await db.exec('drop function public.sorpresa()');
  ok('queda limpia otra vez al revertir', (await sql(auditoria)).length === 1);
  // El caso real que la auditoría encontró en el Supabase del usuario: rls_auto_enable() de «Enable automatic RLS»
  const cerrada = await sql(`select has_function_privilege('anon','public.rls_auto_enable()','execute') a, has_function_privilege('authenticated','public.rls_auto_enable()','execute') b`);
  ok('rls_auto_enable() (la función de «Enable automatic RLS» de Supabase) ya NO es ejecutable por anon ni authenticated', cerrada[0].a === false && cerrada[0].b === false, JSON.stringify(cerrada));
  await db.exec(`set role authenticated; create table public.tabla_nueva_evento (id int); reset role;`);
  ok('…y el evento sigue funcionando: una tabla nueva queda con RLS activado sin que nadie lo pida', (await uno(`select relrowsecurity from pg_class where relname = 'tabla_nueva_evento'`)) === true);
  await db.exec('drop table public.tabla_nueva_evento');
  await db.exec('grant execute on function public.rls_auto_enable() to anon');
  ok('(y si se volviera a abrir, la auditoría lo detecta)', (await sql(auditoria)).some((x) => /NO prevista/.test(x.problema)));
  await db.exec('revoke execute on function public.rls_auto_enable() from anon');
}

seccion('20. Etapa 6 — Fechas de la temporada y los límites en el editor');
await reiniciarDatos();
await reiniciarConfig5();
{
  const e0 = await rpc('estado', null);
  ok('sin fechas: reglas.campana = { inicioISO: null, finISO: null }', e0.reglas.campana && e0.reglas.campana.inicioISO === null && e0.reglas.campana.finISO === null, JSON.stringify(e0.reglas));
  await sql(`update app.configuracion set campana_inicio = '2099-01-01 00:00-05', campana_fin = '2099-03-31 23:59-05' where id = 1`);
  const e1 = await rpc('estado', null);
  ok('con fechas: llegan al juego en ISO (UTC), aunque la campaña aún no empiece', e1.reglas.campana.inicioISO === '2099-01-01T05:00:00.000Z' && e1.reglas.campana.finISO === '2099-04-01T04:59:00.000Z' && e1.motivo === 'campana-inactiva', JSON.stringify(e1.reglas.campana));
  await reiniciarConfig5();
  const g = await admin('admin_guardar_config', JSON.stringify({ limitePartidasIpHora: 200, limiteCodigosIpDia: 0, pinIntentosMaxGlobal: 40 }));
  ok('el editor guarda los límites por red (0 = apagado)', g.ok === true && g.config.limitePartidasIpHora === 200 && g.config.limiteCodigosIpDia === 0 && g.config.pinIntentosMaxGlobal === 40, JSON.stringify(g));
  ok('…y rechaza valores absurdos (todo o nada)', (await admin('admin_guardar_config', JSON.stringify({ pinIntentosMaxGlobal: 1, limiteCodigosIpDia: 5 }))).ok === false && (await uno('select limite_codigos_ip_dia from app.configuracion')) === 0);
  await reiniciarConfig5();
}

seccion('21. Volver a correr las migraciones no rompe nada');
{
  let fallo = null;
  try {
    for (const f of migraciones) await db.exec(await readFile(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  } catch (e) {
    fallo = e.message;
  }
  ok('las tres migraciones se pueden repetir (idempotentes)', fallo === null, fallo ?? '');
  ok('y la configuración conserva su única fila', Number(await uno('select count(*) from app.configuracion')) === 1);
}

seccion('21a. Cupo diario opcional: el juego y el panel saben cuál tope manda (el del día o el de la semana)');
await reiniciarDatos();
await reiniciarConfig5();
await reiniciarStaff();
await sql(`truncate app.limites_red`);
{
  let e = await rpc('estado', null);
  ok('sin cupo diario manda el tope de la SEMANA (y reglas.cupoDiario = 0)', e.limitadoPor === 'semana' && e.reglas.cupoDiario === 0 && e.premiosRestantes === 50, JSON.stringify([e.limitadoPor, e.reglas.cupoDiario, e.premiosRestantes]));
  ok('el panel lo muestra apagado (premiosHoyRestantes = null)', await admin('admin_resumen').then((r) => r.cupoDiario === 0 && r.premiosHoyRestantes === null && r.limitadoPor === 'semana'));
  const g = await admin('admin_guardar_config', JSON.stringify({ cupoDiario: 3 }));
  e = await rpc('estado', null);
  ok('con cupo diario 3: hoy quedan 3 y manda el del DÍA', g.ok === true && e.premiosRestantes === 3 && e.limitadoPor === 'dia' && e.reglas.cupoDiario === 3, JSON.stringify([e.premiosRestantes, e.limitadoPor]));
  for (let i = 0; i < 3; i++) await nuevoCodigo(120 + i);
  e = await rpc('estado', null);
  ok('agotado el cupo de hoy: «sin-premios» por el DÍA y vuelve mañana (no el lunes)', e.motivo === 'sin-premios' && e.limitadoPor === 'dia' && Date.parse(e.reiniciaEnISO) - Date.parse(e.ahoraISO) <= 86400e3 + 1000, JSON.stringify([e.motivo, e.limitadoPor, e.reiniciaEnISO]));
  const r = await admin('admin_resumen');
  ok('el resumen del panel dice que hoy quedan 0 de 3 y que manda el día', r.cupoDiario === 3 && r.premiosHoyRestantes === 0 && r.limitadoPor === 'dia' && r.premiosRestantes === 0, JSON.stringify([r.cupoDiario, r.premiosHoyRestantes, r.limitadoPor]));
  await admin('admin_guardar_config', JSON.stringify({ cupoDiario: 0 }));
  e = await rpc('estado', null);
  ok('al apagar el cupo diario vuelve a mandar la semana (47 de 50) y el juego se reabre', e.limitadoPor === 'semana' && e.premiosRestantes === 47 && e.jugable === true && e.reglas.cupoDiario === 0, JSON.stringify([e.limitadoPor, e.premiosRestantes]));
  await admin('admin_guardar_config', JSON.stringify({ cupoDiario: 10, premiosPorSemana: 4 }));
  e = await rpc('estado', null);
  ok('si el tope semanal es el más chico (1 de la semana vs 10 del día), manda la SEMANA', e.limitadoPor === 'semana' && e.premiosRestantes === 1, JSON.stringify([e.limitadoPor, e.premiosRestantes]));
  await reiniciarConfig5();
}

seccion('21b. Limpieza de datos de prueba (supabase/sql/limpiar_pruebas.sql)');
{
  await sql(`insert into app.limites_red (clave, ventana, cuenta) values ('prueba:x', now(), 1) on conflict do nothing`);
  await db.exec(await readFile(new URL('../supabase/sql/limpiar_pruebas.sql', import.meta.url), 'utf8'));
  const n = async (t) => Number(await uno(`select count(*) from app.${t}`));
  ok('borra los códigos, las partidas y los contadores por red', (await n('codigos')) === 0 && (await n('partidas')) === 0 && (await n('limites_red')) === 0);
  ok('NO toca la configuración, el PIN ni los administradores', (await n('configuracion')) === 1 && (await uno('select pin_hash is not null from app.staff')) === true && (await n('admins')) === 1);
}

seccion('22. El archivo único supabase/todo-junto.sql (lo que se pega de una vez en Supabase)');
{
  let actual = '';
  try {
    actual = await readFile(new URL('../supabase/todo-junto.sql', import.meta.url), 'utf8');
  } catch {
    /* no existe todavía */
  }
  ok('supabase/todo-junto.sql está al día con las migraciones (si falla: npm run sql)', actual === (await armar()));
  const limpia = await baseNueva();
  let error = null;
  let filas = [];
  try {
    const resultados = await limpia.exec(actual); // una base NUEVA, como un proyecto recién creado
    filas = resultados[resultados.length - 1].rows;
  } catch (e) {
    error = e.message;
  }
  ok('pegado en una base NUEVA no da errores', error === null, error ?? '');
  ok('…y la tabla final (la auditoría) dice «Todo en orden»', filas.length === 1 && /Todo en orden/.test(filas[0].problema), JSON.stringify(filas));
  let otraVez = null;
  try {
    const r2 = await limpia.exec(actual);
    otraVez = r2[r2.length - 1].rows;
  } catch (e) {
    otraVez = e.message;
  }
  ok('…y vuelto a pegar encima (como lo harás tú en tu Supabase) tampoco da errores y sigue «Todo en orden»', Array.isArray(otraVez) && otraVez.length === 1 && /Todo en orden/.test(otraVez[0].problema), JSON.stringify(otraVez));
}

seccion('23. La guía rápida (guia-rapida.md): todo su SQL funciona');
{
  const guia = await readFile(new URL('../guia-rapida.md', import.meta.url), 'utf8');
  const bloques = [...guia.matchAll(/```sql\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
  ok(`la guía trae ${bloques.length} bloques de SQL (hay al menos 25)`, bloques.length >= 25);
  const errores = [];
  for (const [i, b] of bloques.entries()) {
    try {
      await db.exec(b);
    } catch (e) {
      errores.push(`bloque ${i + 1} («${b.trim().slice(0, 40)}…»): ${e.message}`);
    }
  }
  ok('todos los bloques SQL de la guía se ejecutan sin error (los nombres de tablas y columnas siguen al día)', errores.length === 0, errores.join(' | '));
}

console.log(`\n${fallos === 0 ? '✅ TODO BIEN' : '❌ HAY FALLOS'} — ${total - fallos} de ${total} comprobaciones correctas.\n`);
process.exit(fallos === 0 ? 0 : 1);
