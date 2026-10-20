-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- 0002_funciones.sql — Etapa 4 (backend): toda la lógica del juego vive AQUÍ, en el servidor
--
-- CÓMO USARLO: DESPUÉS de 0001_tablas.sql → SQL Editor → New query → pega TODO este archivo → Run.
-- Es seguro volver a correrlo ("create or replace"): sirve para actualizar las funciones.
--
-- LAS 6 FUNCIONES QUE USA EL JUEGO (esquema "public", llamadas por la clave pública = rol anon):
--   ping()                                          → hora del servidor (también sirve para que Supabase no se duerma)
--   estado(p_device)                                → premios e intentos restantes, reglas y dificultad
--   iniciar_partida(p_device)                       → gasta un intento y entrega el token de la partida
--   terminar_partida(p_token, gano, progreso, frutas) → valida la partida (token, tiempo mínimo, frutas) y aparta el premio
--   reclamar_codigo(p_token, nombre, celular, consentimiento) → crea el código (atómico)
--   mi_codigo(p_device)                             → el último código de ese dispositivo y su cuenta regresiva
--
-- REGLAS QUE IMPONE (todas con el reloj del SERVIDOR, hora de Bogotá):
--   · Semana = de lunes 00:00 a domingo 23:59:59 (America/Bogota). Los intentos y los premios se reinician el lunes.
--   · Un código jamás se asigna a dos personas ni se supera el tope: todos los reclamos pasan por un candado global.
--   · Un código por celular cada N días (configuración). Los vencidos no se reciclan.
--   · Vigencia: expedición (truncada al minuto) + N días exactos. Ej.: 2:51 p. m. → vale hasta las 2:50 p. m. del día N.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────── utilidades internas (esquema app; el juego no las ve) ─────────────────────────────────

create or replace function app.iso(p_ts timestamptz) returns text language sql stable as $$
  select to_char(p_ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

-- Lunes 00:00 (hora de Bogotá) de la semana que contiene p_ts, y su fecha
create or replace function app.inicio_semana(p_ts timestamptz) returns timestamptz language sql stable as $$
  select date_trunc('week', p_ts at time zone 'America/Bogota') at time zone 'America/Bogota'
$$;
create or replace function app.semana_de(p_ts timestamptz) returns date language sql stable as $$
  select (date_trunc('week', p_ts at time zone 'America/Bogota'))::date
$$;
-- 00:00 (hora de Bogotá) del día que contiene p_ts, y su fecha
create or replace function app.inicio_dia(p_ts timestamptz) returns timestamptz language sql stable as $$
  select date_trunc('day', p_ts at time zone 'America/Bogota') at time zone 'America/Bogota'
$$;
create or replace function app.dia_de(p_ts timestamptz) returns date language sql stable as $$
  select (date_trunc('day', p_ts at time zone 'America/Bogota'))::date
$$;

-- Hora hasta la que sirve un código: la expedición truncada al minuto + N días exactos (86.400 s cada uno)
create or replace function app.vencimiento(p_emitido timestamptz, p_dias int) returns timestamptz language sql immutable as $$
  select date_trunc('minute', p_emitido) + make_interval(secs => p_dias::double precision * 86400)
$$;

-- La fila de configuración
create or replace function app.config() returns app.configuracion language sql stable as $$
  select * from app.configuracion where id = 1
$$;

-- ── Límites por red (Etapa 6) ──
-- La IP de quien llama, tal como la ve el servidor (Supabase pasa los encabezados a la base). Prioridad: el encabezado
-- que pone Cloudflare (cf-connecting-ip: el cliente no lo puede falsear porque Cloudflare lo sobrescribe), luego el primer
-- valor de x-forwarded-for y luego x-real-ip. Si no se puede saber (null) los límites por red simplemente NO se aplican:
-- ante la duda se deja jugar, nunca se bloquea a una persona real.
create or replace function app.ip_cliente() returns text language plpgsql stable as $$
declare
  h json;
  v text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  if h is null then
    return null;
  end if;
  v := coalesce(nullif(btrim(h ->> 'cf-connecting-ip'), ''),
                nullif(btrim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''),
                nullif(btrim(h ->> 'x-real-ip'), ''));
  if v is null or length(v) > 64 then
    return null;
  end if;
  return v;
end $$;

-- La "huella" de la IP: un hash con una sal secreta. Así se cuentan las acciones por red sin guardar la IP de nadie.
create or replace function app.huella_red() returns text language plpgsql stable as $$
declare
  ip text := app.ip_cliente();
begin
  if ip is null then
    return null;
  end if;
  return left(encode(sha256(convert_to(ip || '|' || (select sal_red from app.configuracion where id = 1), 'UTF8')), 'hex'), 24);
end $$;

-- Suma 1 a una acción de esta red en la ventana dada y devuelve el total (null si no se conoce la red).
-- Es atómico: llamadas simultáneas suman bien.
create or replace function app.sumar_red(p_accion text, p_ventana timestamptz) returns int language plpgsql volatile as $$
declare
  h text := app.huella_red();
  n int;
begin
  if h is null then
    return null;
  end if;
  insert into app.limites_red as l (clave, ventana, cuenta) values (p_accion || ':' || h, p_ventana, 1)
  on conflict (clave, ventana) do update set cuenta = l.cuenta + 1
  returning l.cuenta into n;
  if random() < 0.02 then   -- de vez en cuando se borran los contadores viejos (sin tareas programadas)
    delete from app.limites_red where ventana < now() - interval '3 days';
  end if;
  return n;
end $$;

-- Cuenta una acción de esta red y dice si TODAVÍA está dentro del máximo (p_max <= 0 = apagado; sin IP conocida = permitido).
create or replace function app.limitar(p_accion text, p_ventana timestamptz, p_max int) returns boolean language plpgsql volatile as $$
declare
  n int;
begin
  if p_max is null or p_max <= 0 then
    return true;
  end if;
  n := app.sumar_red(p_accion, p_ventana);
  return n is null or n <= p_max;
end $$;

-- Cuántas veces ha contado esta red una acción en esa ventana (sin sumar). null = no se conoce la red.
create or replace function app.contar_red(p_accion text, p_ventana timestamptz) returns int language plpgsql stable as $$
declare
  h text := app.huella_red();
begin
  if h is null then
    return null;
  end if;
  return coalesce((select cuenta from app.limites_red where clave = p_accion || ':' || h and ventana = p_ventana), 0);
end $$;

-- Un código nuevo: PREFIJO-XXXX con un alfabeto SIN 0/O/1/I (32 símbolos). Aleatorio criptográfico (uuid v4).
create or replace function app.codigo_nuevo(p_prefijo text, p_largo int) returns text language plpgsql volatile as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  v_txt text := '';
  i int;
begin
  for i in 0 .. p_largo - 1 loop
    v_txt := v_txt || substr(v_alfabeto, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return p_prefijo || '-' || v_txt;
end $$;

-- Cupos: cuántos premios quedan = tope − expedidos − apartados (reservas vigentes de otras partidas)
create or replace function app.cupos(p_excluir uuid default null)
returns table (restantes int, semanal int, diario int)
language plpgsql stable as $$
declare
  c app.configuracion := app.config();
  v_now timestamptz := now();
  v_emit_sem int;
  v_emit_dia int;
  v_res int;
begin
  select count(*) into v_emit_sem from app.codigos where semana = app.semana_de(v_now);
  select count(*) into v_emit_dia from app.codigos where dia = app.dia_de(v_now);
  select count(*) into v_res from app.partidas p
   where p.resultado = 'gano_validado' and not p.reclamada and p.reserva_hasta > v_now
     and (p_excluir is null or p.id <> p_excluir);
  semanal   := greatest(0, c.premios_por_semana - v_emit_sem - v_res);
  diario    := case when c.cupo_diario > 0 then greatest(0, c.cupo_diario - v_emit_dia - v_res) end;
  restantes := least(semanal, coalesce(diario, semanal));
  return next;
end $$;

-- El "estado" completo que ve el juego (premios, intentos, reglas, dificultad, hora del servidor)
create or replace function app.estado_json(p_device uuid) returns jsonb language plpgsql stable as $$
declare
  c app.configuracion := app.config();
  v_now timestamptz := now();
  v_sem date := app.semana_de(v_now);
  v_usados int := 0;
  v_int_rest int;
  cu record;
  v_activa boolean;
  v_motivo text;
  v_reinicia timestamptz;
  v_tiene boolean := false;
  v_juego jsonb;
begin
  if p_device is not null then
    select count(*) into v_usados from app.partidas where device_id = p_device and semana = v_sem;
    select exists (select 1 from app.codigos where device_id = p_device and estado = 'activo' and vence_en > v_now) into v_tiene;
  end if;
  v_int_rest := greatest(0, c.intentos_por_semana - v_usados);
  select * into cu from app.cupos();
  v_activa := (c.campana_inicio is null or v_now >= c.campana_inicio) and (c.campana_fin is null or v_now <= c.campana_fin);
  v_motivo := case
                when not v_activa then 'campana-inactiva'
                when cu.restantes <= 0 then 'sin-premios'
                when v_int_rest <= 0 then 'sin-intentos'
              end;
  -- Cuándo se renueva: el lunes 00:00; o mañana 00:00 si lo que se acabó fue el cupo DIARIO
  v_reinicia := app.inicio_semana(v_now) + make_interval(secs => 7 * 86400);
  if v_motivo = 'sin-premios' and cu.semanal > 0 then
    v_reinicia := app.inicio_dia(v_now) + make_interval(secs => 86400);
  end if;
  -- La dificultad = lo que haya en "juego" + la duración y las frutas mínimas (que el servidor también valida)
  v_juego := jsonb_set(
    c.juego, '{partida}',
    coalesce(c.juego -> 'partida', '{}'::jsonb) || jsonb_build_object('duracionS', c.duracion_partida_s, 'frutasMinimas', c.frutas_minimas),
    true);
  return jsonb_build_object(
    'jugable', (v_motivo is null),
    'motivo', v_motivo,
    'premiosRestantes', cu.restantes,
    'premiosPorSemana', c.premios_por_semana,
    -- Qué tope es el que manda ahora: el del DÍA (cupo diario) o el de la SEMANA. Así el juego dice «hoy» o «esta semana» como toca.
    'limitadoPor', case when cu.diario is not null and cu.diario < cu.semanal then 'dia' else 'semana' end,
    'intentosRestantes', v_int_rest,
    'intentosPorSemana', c.intentos_por_semana,
    'reiniciaEnISO', app.iso(v_reinicia),
    'ahoraISO', app.iso(v_now),
    'miCodigoActivo', v_tiene,
    'reglas', jsonb_build_object(
      'compraMinima', c.compra_minima,
      'vigenciaDias', c.vigencia_dias,
      'diasEntreCodigosPorCelular', c.dias_entre_codigos_por_celular,
      'regalos', c.regalos,
      'ventanaReclamoMin', c.ventana_reclamo_min,
      'cupoDiario', c.cupo_diario,   -- 0 = sin cupo diario
      -- Fechas de la temporada (null = sin fechas, siempre activa): el juego las muestra en las condiciones
      'campana', jsonb_build_object(
        'inicioISO', case when c.campana_inicio is not null then app.iso(c.campana_inicio) end,
        'finISO', case when c.campana_fin is not null then app.iso(c.campana_fin) end)),
    'juego', v_juego);
end $$;

-- Mezcla profunda de JSON (b manda sobre a, sin borrar lo que b no menciona)
create or replace function app.fusionar_json(a jsonb, b jsonb) returns jsonb language plpgsql immutable as $$
declare
  k text;
  r jsonb;
begin
  if jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then
    r := a;
    for k in select jsonb_object_keys(b) loop
      r := jsonb_set(r, array[k], case when r ? k then app.fusionar_json(r -> k, b -> k) else b -> k end, true);
    end loop;
    return r;
  end if;
  return b;
end $$;

-- AYUDA PARA TI (solo desde el SQL Editor; el juego NO puede llamarla): cambia la dificultad sin borrar el resto.
--   select app.ajustar_juego('{"velocidad": {"inicial": 10, "final": 15}, "partida": {"frutasMinimas": 20}}');
-- "duracionS" y "frutasMinimas" (de "partida") se guardan en sus columnas propias, que son las que valida el servidor.
create or replace function app.ajustar_juego(p jsonb) returns jsonb language plpgsql volatile as $$
declare
  v jsonb := coalesce(p, '{}'::jsonb);
begin
  if v #> '{partida,duracionS}' is not null then
    update app.configuracion set duracion_partida_s = (v #>> '{partida,duracionS}')::int where id = 1;
    v := v #- '{partida,duracionS}';
  end if;
  if v #> '{partida,frutasMinimas}' is not null then
    update app.configuracion set frutas_minimas = (v #>> '{partida,frutasMinimas}')::int where id = 1;
    v := v #- '{partida,frutasMinimas}';
  end if;
  update app.configuracion set juego = app.fusionar_json(juego, v) where id = 1;
  return (select juego from app.configuracion where id = 1);
end $$;

-- ───────────────────────────────── funciones públicas (las que llama el juego) ─────────────────────────────────

create or replace function public.ping() returns jsonb
language sql stable security definer set search_path = app, pg_temp as $$
  select jsonb_build_object('ok', true, 'ahoraISO', app.iso(now()))
$$;

create or replace function public.estado(p_device uuid default null) returns jsonb
language sql stable security definer set search_path = app, pg_temp as $$
  select app.estado_json(p_device)
$$;

-- Gasta un intento y entrega el token. Un candado por dispositivo evita que dos llamadas a la vez saquen un 4.º intento.
create or replace function public.iniciar_partida(p_device uuid) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
declare
  c app.configuracion := app.config();
  e jsonb;
  v_id uuid;
  v_hora timestamptz := date_trunc('hour', now());
begin
  if p_device is null then
    return jsonb_build_object('ok', false, 'motivo', 'dispositivo');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('dispositivo:' || p_device::text, 0));
  e := app.estado_json(p_device);
  if not (e ->> 'jugable')::boolean then
    return jsonb_build_object('ok', false, 'motivo', e ->> 'motivo', 'estado', e);
  end if;
  -- Límite por red: tope de partidas por hora desde un mismo internet (frena a quien invente miles de dispositivos)
  if not app.limitar('partidas', v_hora, c.limite_partidas_ip_hora) then
    return jsonb_build_object('ok', false, 'motivo', 'limite-red', 'reiniciaEnISO', app.iso(v_hora + interval '1 hour'));
  end if;
  insert into app.partidas (device_id, semana) values (p_device, app.semana_de(now())) returning id into v_id;
  return jsonb_build_object(
    'ok', true,
    'token', v_id,
    'intentosRestantes', (e ->> 'intentosRestantes')::int - 1,
    'ahoraISO', app.iso(now()));
end $$;

-- Cierra la partida. Si dice que ganó, el servidor NO le cree: exige token válido, tiempo mínimo jugado y las frutas
-- mínimas; y si todo está bien, aparta un premio para esa persona durante "ventana_reclamo_min" minutos.
create or replace function public.terminar_partida(
  p_token uuid, p_gano boolean, p_progreso numeric default null, p_frutas int default null
) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
declare
  c app.configuracion := app.config();
  pa app.partidas;
  v_now timestamptz;
  v_elapsed numeric;
  v_min numeric;
  v_res text;
  v_motivo text;
  v_puede boolean := false;
  v_reserva timestamptz;
begin
  if p_token is null then
    return jsonb_build_object('ok', false, 'motivo', 'partida-invalida');
  end if;
  -- Orden de candados SIEMPRE igual (primero el global, luego la fila) para que nunca se bloqueen entre sí
  if coalesce(p_gano, false) then
    perform pg_advisory_xact_lock(hashtextextended('cholado:premios', 0));
  end if;
  select * into pa from app.partidas where id = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'partida-invalida');
  end if;
  -- Repetir la llamada no cambia nada: devuelve lo mismo
  if pa.resultado is not null then
    v_puede := pa.resultado = 'gano_validado' and not pa.reclamada;
    return jsonb_build_object(
      'ok', true, 'puedeReclamar', v_puede,
      'motivo', case pa.resultado when 'gano_rechazado' then 'partida-invalida' when 'gano_sin_cupo' then 'sin-premios' end,
      'reservaHastaISO', case when v_puede then app.iso(pa.reserva_hasta) end,
      'estado', app.estado_json(pa.device_id));
  end if;

  v_now := clock_timestamp();
  v_elapsed := extract(epoch from (v_now - pa.inicio));
  v_min := least(c.minimo_jugado_s, 0.75 * c.duracion_partida_s);

  if not coalesce(p_gano, false) then
    v_res := 'perdio';
  elsif v_elapsed < v_min or coalesce(p_frutas, 0) < c.frutas_minimas or coalesce(p_frutas, 0) > 1000 then
    v_res := 'gano_rechazado';
    v_motivo := 'partida-invalida';
  elsif (select restantes from app.cupos(pa.id)) <= 0 then
    v_res := 'gano_sin_cupo';
    v_motivo := 'sin-premios';
  else
    v_res := 'gano_validado';
    v_puede := true;
    v_reserva := v_now + make_interval(mins => c.ventana_reclamo_min);
  end if;

  update app.partidas
     set fin = v_now, resultado = v_res, frutas = p_frutas,
         progreso = case when p_progreso is null then null else least(1, greatest(0, p_progreso)) end,
         reserva_hasta = v_reserva
   where id = pa.id;

  return jsonb_build_object(
    'ok', true, 'puedeReclamar', v_puede, 'motivo', v_motivo,
    'reservaHastaISO', case when v_puede then app.iso(v_reserva) end,
    'estado', app.estado_json(pa.device_id));
end $$;

-- Crea el código. ATÓMICO: todos los reclamos del mundo pasan, de uno en uno, por el mismo candado.
-- Así dos reclamos simultáneos jamás reciben el mismo código ni superan el tope.
create or replace function public.reclamar_codigo(
  p_token uuid, p_nombre text, p_celular text, p_consentimiento boolean
) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
declare
  c app.configuracion := app.config();
  pa app.partidas;
  v_now timestamptz;
  v_nombre text;
  v_cel text;
  v_prev app.codigos;
  v_codigo text;
  v_vence timestamptz;
  v_intentos int := 0;
  v_restr text;
begin
  perform pg_advisory_xact_lock(hashtextextended('cholado:premios', 0));
  v_now := clock_timestamp();

  select * into pa from app.partidas where id = p_token for update;   -- si p_token es null no encuentra nada
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'partida-invalida');
  end if;

  -- Si ya reclamó (doble toque o reintento por mala señal), se le devuelve el MISMO código
  if pa.reclamada then
    select * into v_prev from app.codigos where partida_id = pa.id;
    return jsonb_build_object(
      'ok', true, 'repetido', true, 'codigo', v_prev.codigo,
      'emitidoISO', app.iso(v_prev.emitido_en), 'venceISO', app.iso(v_prev.vence_en), 'ahoraISO', app.iso(v_now));
  end if;

  -- (reclamos_fallidos: con un mismo token solo se pueden probar 5 celulares que ya tenían código; si no, alguien con un
  --  token ganador podría ir preguntando número por número "¿este ya ganó?")
  if pa.resultado is distinct from 'gano_validado' or v_now > pa.fin + interval '6 hours' or pa.reclamos_fallidos >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'partida-invalida');
  end if;
  if not coalesce(p_consentimiento, false) then
    return jsonb_build_object('ok', false, 'motivo', 'consentimiento');
  end if;

  -- Datos: se limpian y se vuelven a validar aquí (nunca se confía en el celular del jugador)
  v_nombre := btrim(regexp_replace(regexp_replace(coalesce(p_nombre, ''), '[[:cntrl:]]', '', 'g'), '\s+', ' ', 'g'));
  v_cel := regexp_replace(coalesce(p_celular, ''), '\D', '', 'g');
  if length(v_cel) = 12 and left(v_cel, 2) = '57' then
    v_cel := substr(v_cel, 3);
  end if;
  if char_length(v_nombre) not between 2 and 60 or v_cel !~ '^3[0-9]{9}$' then
    return jsonb_build_object('ok', false, 'motivo', 'datos');
  end if;

  -- Un código por celular cada N días. NO se revela el código de ese número (solo cuándo podrá volver).
  select * into v_prev from app.codigos
   where celular = v_cel and emitido_en > v_now - make_interval(days => c.dias_entre_codigos_por_celular)
   order by emitido_en desc limit 1;
  if found then
    update app.partidas set reclamos_fallidos = reclamos_fallidos + 1 where id = pa.id;
    return jsonb_build_object(
      'ok', false, 'motivo', 'ya-tienes-codigo',
      'dias', c.dias_entre_codigos_por_celular,
      'puedeVolverISO', app.iso(v_prev.emitido_en + make_interval(days => c.dias_entre_codigos_por_celular)));
  end if;

  -- Cupo: si el premio sigue apartado para esta persona, listo; si la reserva venció, se revisa que aún quede cupo
  if pa.reserva_hasta is null or pa.reserva_hasta < v_now then
    if (select restantes from app.cupos(pa.id)) <= 0 then
      return jsonb_build_object('ok', false, 'motivo', 'sin-premios');
    end if;
  end if;

  -- Límite por red: tope de códigos por día desde un mismo internet (se cuenta justo antes de crear, así solo suman los que sí salen)
  if not app.limitar('codigos', app.inicio_dia(v_now), c.limite_codigos_ip_dia) then
    return jsonb_build_object('ok', false, 'motivo', 'limite-red');
  end if;

  -- Crear el código (si por casualidad ya existe uno igual, la restricción UNIQUE lo rechaza y se inventa otro)
  v_vence := app.vencimiento(v_now, c.vigencia_dias);
  loop
    v_codigo := app.codigo_nuevo(c.prefijo_codigo, c.largo_codigo);
    begin
      insert into app.codigos (codigo, nombre, celular, consentimiento, consentimiento_en, device_id, partida_id,
                               emitido_en, vence_en, semana, dia)
      values (v_codigo, v_nombre, v_cel, true, v_now, pa.device_id, pa.id,
              v_now, v_vence, app.semana_de(v_now), app.dia_de(v_now));
      exit;
    exception when unique_violation then
      get stacked diagnostics v_restr = constraint_name;
      v_intentos := v_intentos + 1;
      if v_restr is distinct from 'codigos_codigo_key' or v_intentos > 30 then
        raise;
      end if;
    end;
  end loop;

  update app.partidas set reclamada = true where id = pa.id;
  return jsonb_build_object(
    'ok', true, 'codigo', v_codigo,
    'emitidoISO', app.iso(v_now), 'venceISO', app.iso(v_vence), 'ahoraISO', app.iso(v_now));
end $$;

-- El último código de este dispositivo, con su estado real y los segundos que le quedan
create or replace function public.mi_codigo(p_device uuid) returns jsonb
language plpgsql stable security definer set search_path = app, pg_temp as $$
declare
  c app.configuracion := app.config();
  k app.codigos;
  v_now timestamptz := now();
  v_estado text;
begin
  if p_device is null then
    return jsonb_build_object('ok', true, 'hay', false, 'ahoraISO', app.iso(v_now));
  end if;
  select * into k from app.codigos where device_id = p_device order by emitido_en desc limit 1;
  if not found then
    return jsonb_build_object('ok', true, 'hay', false, 'ahoraISO', app.iso(v_now));
  end if;
  v_estado := case when k.estado <> 'activo' then k.estado when v_now >= k.vence_en then 'vencido' else 'activo' end;
  return jsonb_build_object(
    'ok', true, 'hay', true,
    'codigo', k.codigo,
    'estado', v_estado,                       -- activo | vencido | canjeado | desactivado
    'emitidoISO', app.iso(k.emitido_en),
    'venceISO', app.iso(k.vence_en),
    'canjeadoISO', case when k.canjeado_en is not null then app.iso(k.canjeado_en) end,
    'segundosRestantes', case when v_estado = 'activo' then greatest(0, floor(extract(epoch from (k.vence_en - v_now))))::int else 0 end,
    'puedeVolverISO', app.iso(k.emitido_en + make_interval(days => c.dias_entre_codigos_por_celular)),
    'ahoraISO', app.iso(v_now));
end $$;

-- Diagnóstico de red (Etapa 6): le devuelve a QUIEN LLAMA los encabezados de red que ve el servidor (solo los suyos) y si
-- el servidor logra reconocer su red. Sirve para comprobar que los límites por IP funcionan con los encabezados de Supabase.
create or replace function public.diag_red() returns jsonb
language plpgsql stable security definer set search_path = app, pg_temp as $$
declare
  h json;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;
  return jsonb_build_object(
    'cfConnectingIp', h ->> 'cf-connecting-ip',
    'xForwardedFor', h ->> 'x-forwarded-for',
    'xRealIp', h ->> 'x-real-ip',
    'ipReconocida', app.ip_cliente() is not null,
    'huella', app.huella_red(),
    'ahoraISO', app.iso(now()));
end $$;

-- ───────────────────────────────── permisos ─────────────────────────────────
-- Solo las funciones del juego (y las 2 de la caja, de 0003) se pueden llamar con la clave pública. Todo lo demás queda cerrado.
revoke all on all functions in schema app from public, anon, authenticated;

-- Supabase crea public.rls_auto_enable() (un «event trigger» que activa RLS en toda tabla nueva) cuando al crear el proyecto se
-- deja marcado «Enable automatic RLS», y la deja ejecutable por anon/authenticated. Desde afuera no sirve para nada (solo funciona
-- dentro del evento de Supabase), pero no tiene por qué ser pública (la auditoría de la Etapa 6 la marcó). El evento SIGUE funcionando:
-- un event trigger no revisa el permiso de ejecución de quien crea la tabla (probado).
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

revoke all on function public.ping() from public;
revoke all on function public.estado(uuid) from public;
revoke all on function public.iniciar_partida(uuid) from public;
revoke all on function public.terminar_partida(uuid, boolean, numeric, int) from public;
revoke all on function public.reclamar_codigo(uuid, text, text, boolean) from public;
revoke all on function public.mi_codigo(uuid) from public;
revoke all on function public.diag_red() from public;

grant execute on function public.ping() to anon, authenticated;
grant execute on function public.estado(uuid) to anon, authenticated;
grant execute on function public.iniciar_partida(uuid) to anon, authenticated;
grant execute on function public.terminar_partida(uuid, boolean, numeric, int) to anon, authenticated;
grant execute on function public.reclamar_codigo(uuid, text, text, boolean) to anon, authenticated;
grant execute on function public.mi_codigo(uuid) to anon, authenticated;
grant execute on function public.diag_red() to anon, authenticated;
