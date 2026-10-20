-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- todo-junto.sql — TODO el SQL del servidor de Cholado Runner en un solo archivo (GENERADO: no lo edites a mano)
--
-- CÓMO USARLO: Supabase → SQL Editor → «+» → Create a new snippet → pega TODO este archivo → Run.
-- Es seguro volver a pegarlo (no borra datos). Al final aparece una tabla: debe decir «✅ Todo en orden».
-- Si Supabase muestra un aviso amarillo («Potential issue», RLS…), elige «Run this query»: las tablas sí quedan protegidas.
-- Para regenerarlo después de cambiar algo en supabase/migrations/:  npm run sql
-- ════════════════════════════════════════════════════════════════════════════════════════════════


-- ┌───────────────────────────── migrations/0001_tablas.sql ─────────────────────────────
-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- 0001_tablas.sql — Etapa 4 (backend): tablas de Cholado Runner
--
-- CÓMO USARLO: Supabase → SQL Editor → New query → pega TODO este archivo → Run.
-- Es seguro volver a correrlo (no borra datos): usa "if not exists".
--
-- DISEÑO DE SEGURIDAD
--   · Las tablas viven en el esquema PRIVADO "app", que Supabase NO expone por internet.
--   · Además tienen Row Level Security (RLS) activado y SIN políticas: nadie con la clave pública
--     (anon) puede leerlas ni escribirlas, ni siquiera si encontrara una forma de llegar a ellas.
--   · El juego solo habla con las funciones del archivo 0002 (esquema "public"), que son las únicas
--     que pueden tocar estas tablas.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

create schema if not exists app;
comment on schema app is 'Cholado Runner: tablas privadas. Solo las funciones SECURITY DEFINER de "public" las tocan.';

-- ───────────────────────────────── configuracion (una sola fila) ─────────────────────────────────
-- Todas las reglas del negocio. Se editan desde el SQL Editor hoy y desde el panel admin (Etapa 5) después.
create table if not exists app.configuracion (
  id                              int primary key default 1 check (id = 1),   -- una sola fila
  -- Reglas del negocio
  intentos_por_semana             int  not null default 3     check (intentos_por_semana between 1 and 50),
  premios_por_semana              int  not null default 50    check (premios_por_semana between 0 and 10000),
  cupo_diario                     int  not null default 0     check (cupo_diario >= 0),            -- 0 = sin cupo diario
  vigencia_dias                   int  not null default 7     check (vigencia_dias between 1 and 365),
  dias_entre_codigos_por_celular  int  not null default 7     check (dias_entre_codigos_por_celular between 0 and 365),
  compra_minima                   int  not null default 30000 check (compra_minima >= 0),         -- pesos colombianos
  regalos                         jsonb not null default '["Un raspao personal","Un cholado de 10 oz"]'::jsonb,
  campana_inicio                  timestamptz,                                                    -- null = siempre activa
  campana_fin                     timestamptz,
  check (campana_inicio is null or campana_fin is null or campana_fin > campana_inicio),
  -- Partida (el servidor valida con estos mismos valores)
  duracion_partida_s              int  not null default 60    check (duracion_partida_s between 15 and 300),
  frutas_minimas                  int  not null default 25    check (frutas_minimas between 0 and 500),
  minimo_jugado_s                 int  not null default 45    check (minimo_jugado_s between 0 and 300),
  ventana_reclamo_min             int  not null default 15    check (ventana_reclamo_min between 1 and 240), -- minutos que se aparta el premio
  -- Formato del código: PREFIJO-XXXX
  prefijo_codigo                  text not null default 'LAINDIA' check (prefijo_codigo ~ '^[A-Z0-9]{2,12}$'),
  largo_codigo                    int  not null default 4     check (largo_codigo between 4 and 10),
  -- Dificultad del juego (velocidad, obstáculos, frutas...). Solo lo que se quiera CAMBIAR respecto a web/js/config.js.
  juego                           jsonb not null default '{}'::jsonb check (jsonb_typeof(juego) = 'object'),
  actualizado_en                  timestamptz not null default now()
);
insert into app.configuracion (id) values (1) on conflict (id) do nothing;

-- Etapa 6 — límites por red (IP). Frenan a un script que, desde un mismo internet, invente miles de "dispositivos".
-- Se aplican por la "huella" de la IP (nunca se guarda la IP en claro) y 0 = apagado. Generosos a propósito: muchas
-- personas comparten la misma IP (wifi del local, datos móviles), así que NO deben molestar a la gente de verdad.
alter table app.configuracion add column if not exists limite_partidas_ip_hora int not null default 150 check (limite_partidas_ip_hora between 0 and 100000);
alter table app.configuracion add column if not exists limite_codigos_ip_dia   int not null default 8   check (limite_codigos_ip_dia between 0 and 10000);
alter table app.configuracion add column if not exists sal_red                 text not null default gen_random_uuid()::text;  -- "sal" secreta para la huella de la IP

-- ───────────────────────────────── partidas ─────────────────────────────────
-- Una fila por partida iniciada. Su id ES el "token" que el juego usa para terminar y reclamar.
-- Los intentos de la semana = partidas de ese dispositivo en esa semana.
create table if not exists app.partidas (
  id             uuid primary key default gen_random_uuid(),
  device_id      uuid not null,                       -- id anónimo del dispositivo (lo inventa el navegador)
  semana         date not null,                       -- lunes (hora de Bogotá) de la semana en que empezó
  inicio         timestamptz not null default now(),  -- hora del SERVIDOR
  fin            timestamptz,
  resultado      text check (resultado in ('perdio', 'gano_validado', 'gano_rechazado', 'gano_sin_cupo')),
  frutas         int,
  progreso       numeric,
  reserva_hasta  timestamptz,                         -- premio apartado hasta esta hora (solo 'gano_validado')
  reclamada      boolean not null default false
);
create index if not exists partidas_device_semana on app.partidas (device_id, semana);
create index if not exists partidas_reservas on app.partidas (reserva_hasta) where resultado = 'gano_validado' and not reclamada;
-- Etapa 6 — cuántas veces se intentó reclamar con celulares que ya tenían código (frena el "¿este número ya ganó?" a la fuerza bruta)
alter table app.partidas add column if not exists reclamos_fallidos int not null default 0;

-- ───────────────────────────────── codigos ─────────────────────────────────
-- Solo existen los códigos YA EXPEDIDOS (se crean al reclamar). Los vencidos NO se reciclan: se quedan aquí.
create table if not exists app.codigos (
  id                 bigint generated always as identity primary key,
  codigo             text   not null unique,                                  -- LAINDIA-7K3Q
  nombre             text   not null,
  celular            text   not null check (celular ~ '^3[0-9]{9}$'),
  consentimiento     boolean not null check (consentimiento),                 -- sin consentimiento no hay código
  consentimiento_en  timestamptz not null default now(),
  device_id          uuid   not null,                                         -- para "Ver mi código"
  partida_id         uuid   not null unique references app.partidas (id),
  regalo_elegido     text,                                                    -- se llena al CANJEAR en caja (Etapa 5)
  emitido_en         timestamptz not null default now(),
  vence_en           timestamptz not null,                                    -- el código sirve mientras ahora < vence_en
  semana             date   not null,                                         -- semana de la expedición (hora de Bogotá)
  dia                date   not null,                                         -- día de la expedición (hora de Bogotá)
  estado             text   not null default 'activo' check (estado in ('activo', 'canjeado', 'desactivado')),
  canjeado_en        timestamptz,
  canjeado_por       text
);
create index if not exists codigos_celular on app.codigos (celular, emitido_en desc);
create index if not exists codigos_device on app.codigos (device_id, emitido_en desc);
create index if not exists codigos_semana on app.codigos (semana);
create index if not exists codigos_dia on app.codigos (dia);

comment on column app.codigos.estado is 'Guardado: activo | canjeado | desactivado. El estado "vencido" NO se guarda: se calcula (activo y ahora >= vence_en) en la vista app.v_codigos, así nunca queda desactualizado.';

-- ───────────────────────────────── limites_red (Etapa 6) ─────────────────────────────────
-- Contadores por red: "clave" = acción + huella de la IP; "ventana" = la hora o el día al que pertenece el conteo.
-- Se limpian solos (cada tanto se borran los de hace más de 3 días).
create table if not exists app.limites_red (
  clave    text        not null,
  ventana  timestamptz not null,
  cuenta   int         not null default 0,
  primary key (clave, ventana)
);
create index if not exists limites_red_ventana on app.limites_red (ventana);

-- Vista de ayuda para ver los códigos con su estado real (la usará el panel admin).
create or replace view app.v_codigos as
select c.*,
       case when c.estado <> 'activo' then c.estado
            when now() >= c.vence_en  then 'vencido'
            else 'activo' end as estado_efectivo
from app.codigos c;

-- Mantiene al día "actualizado_en" de la configuración
create or replace function app.tocar_configuracion() returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;
drop trigger if exists configuracion_tocar on app.configuracion;
create trigger configuracion_tocar before update on app.configuracion for each row execute function app.tocar_configuracion();

-- ───────────────────────────────── permisos: nadie de afuera toca las tablas ─────────────────────────────────
alter table app.configuracion enable row level security;
alter table app.partidas      enable row level security;
alter table app.codigos       enable row level security;
alter table app.limites_red   enable row level security;
-- (Sin políticas = cerrado para anon y authenticated. El dueño "postgres" y las funciones SECURITY DEFINER sí pueden.)

revoke all on schema app from public, anon, authenticated;
revoke all on all tables in schema app from public, anon, authenticated;
revoke all on all sequences in schema app from public, anon, authenticated;


-- ┌───────────────────────────── migrations/0002_funciones.sql ─────────────────────────────
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


-- ┌───────────────────────────── migrations/0003_staff_admin.sql ─────────────────────────────
-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- 0003_staff_admin.sql — Etapa 5: canje en caja (PIN) y panel de administrador
--
-- CÓMO USARLO: DESPUÉS de 0001 y 0002 → SQL Editor → "+" → Create a new snippet → pega TODO este archivo → Run.
-- Es seguro volver a correrlo (no borra datos ni el PIN ya guardado).
--
-- DOS PUERTAS DISTINTAS AL MISMO CANJE
--   · STAFF (la caja): la llama CUALQUIERA con la clave pública (anon), pero exige el PIN. El PIN se guarda
--     CIFRADO (bcrypt) y se verifica AQUÍ, en el servidor. Tras 5 PIN malos seguidos, se bloquea un rato
--     (cada bloqueo seguido dura el doble, hasta 60 min). Mientras está bloqueado ni se mira el PIN.
--         canje_consultar(p_pin, p_codigo)            → ¿el código sirve? (valido | canjeado | vencido | desactivado | inexistente)
--         canje_confirmar(p_pin, p_codigo, p_regalo)  → lo marca CANJEADO y guarda qué regalo se entregó
--   · ADMIN (tú): solo funciona con una sesión de Supabase Auth (correo + contraseña) cuyo usuario esté en la
--     lista app.admins. Con la clave pública sola (anon) NO se puede ni llamar. Son las funciones admin_*:
--         admin_yo · admin_resumen · admin_codigos · admin_exportar · admin_consultar_codigo · admin_canjear
--         admin_estado_codigo · admin_config · admin_guardar_config · admin_cambiar_pin · admin_desbloquear_pin
--
-- DESPUÉS DE CORRER ESTE ARCHIVO hay que (ver supabase/LEEME.md, sección "Etapa 5"):
--   1. Crear tu usuario en Authentication → Users y APAGAR el registro público ("Allow new users to sign up").
--   2. Anotarte como administrador:   insert into app.admins (user_id) select id from auth.users where email = 'TU-CORREO';
--   3. Entrar al panel (web/admin/) y poner el PIN del staff. No hay PIN por defecto: así ningún PIN queda en el repo.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;   -- bcrypt para el PIN (en Supabase ya viene instalada)

-- ───────────────────────────────── tablas ─────────────────────────────────

-- Quién es administrador: ids de usuarios de Supabase Auth. Solo se llena a mano desde el SQL Editor.
create table if not exists app.admins (
  user_id    uuid primary key,
  creado_en  timestamptz not null default now()
);

-- El PIN del staff (una sola fila) y su contador de intentos malos
create table if not exists app.staff (
  id               int primary key default 1 check (id = 1),
  pin_hash         text,                       -- bcrypt. null = todavía no hay PIN (la caja no puede canjear)
  pin_cambiado_en  timestamptz,
  fallos           int not null default 0,     -- PIN malos seguidos desde el último acierto o bloqueo
  bloqueos         int not null default 0,     -- bloqueos seguidos (cada uno dura el doble que el anterior)
  ultimo_fallo     timestamptz,
  bloqueado_hasta  timestamptz
);
insert into app.staff (id) values (1) on conflict (id) do nothing;

-- Límites del PIN: configurables desde el panel, como todo lo demás
alter table app.configuracion add column if not exists pin_intentos_max int not null default 5 check (pin_intentos_max between 3 and 20);
alter table app.configuracion add column if not exists pin_bloqueo_min  int not null default 5 check (pin_bloqueo_min between 1 and 240);
-- Etapa 6: cada RED (IP) tiene sus propios 5 intentos por ventana de 15 min (así un bromista no bloquea la caja de todos);
-- el bloqueo GLOBAL (el que escala) solo salta con muchos fallos en total, o si no se logra reconocer la red.
alter table app.configuracion add column if not exists pin_intentos_max_global int not null default 30 check (pin_intentos_max_global between 3 and 1000);

alter table app.admins enable row level security;
alter table app.staff  enable row level security;
revoke all on all tables in schema app from public, anon, authenticated;

-- ───────────────────────────────── utilidades internas ─────────────────────────────────

-- ¿El usuario que llama (por su sesión de Supabase Auth) es administrador?
create or replace function app.es_admin() returns boolean
language sql stable security definer set search_path = app, pg_temp as $$
  select exists (select 1 from app.admins where user_id = auth.uid())
$$;

-- Minúsculas y sin tildes (para buscar "maria" y encontrar "María")
create or replace function app.sin_tildes(p text) returns text language sql immutable as $$
  select translate(lower(coalesce(p, '')), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun')
$$;

-- Verifica el PIN del staff. Devuelve NULL si es correcto, o un JSON con el motivo.
-- Importante: NUNCA hace "raise" después de anotar un fallo (eso deshace el conteo); siempre devuelve el JSON.
--
-- Dos candados (Etapa 6):
--   1. POR RED (IP): cada red tiene 5 intentos malos por ventana de 15 min. Al 5.º, ESA red queda bloqueada hasta que termine
--      la ventana (aunque acierte el PIN). Así un bromista que escriba mal el PIN a propósito solo se bloquea a sí mismo.
--   2. GLOBAL (el que escala 5, 10, 20, 40, 60 min): salta con `pin_intentos_max_global` fallos seguidos sumando todas las redes
--      (frena un ataque repartido en muchas redes). Si el servidor NO logra reconocer la red, el global usa `pin_intentos_max`
--      (el comportamiento de la Etapa 5).
create or replace function app.verificar_pin(p_pin text) returns jsonb
language plpgsql volatile as $$
declare
  c app.configuracion := app.config();
  s app.staff;
  v_now timestamptz := clock_timestamp();
  v_espera int;
  v_red text := app.huella_red();                                                        -- null = no se conoce la red
  v_ventana timestamptz := to_timestamp(floor(extract(epoch from clock_timestamp()) / 900) * 900);   -- ventanas de 15 min
  v_fallos_red int;
  v_max_global int;
begin
  select * into s from app.staff where id = 1 for update;   -- los intentos de PIN se atienden de uno en uno
  if s.pin_hash is null then
    return jsonb_build_object('ok', false, 'resultado', 'sin-pin');
  end if;
  if s.bloqueado_hasta is not null and s.bloqueado_hasta > v_now then
    return jsonb_build_object('ok', false, 'resultado', 'bloqueado', 'hastaISO', app.iso(s.bloqueado_hasta),
                              'segundos', ceil(extract(epoch from (s.bloqueado_hasta - v_now)))::int);
  end if;
  -- Esta red ya gastó sus intentos en la ventana actual: bloqueada hasta que termine (ni se mira el PIN)
  if v_red is not null and app.contar_red('pin', v_ventana) >= c.pin_intentos_max then
    return jsonb_build_object('ok', false, 'resultado', 'bloqueado', 'hastaISO', app.iso(v_ventana + interval '15 minutes'),
                              'segundos', ceil(extract(epoch from (v_ventana + interval '15 minutes' - v_now)))::int);
  end if;
  -- Si hace más de 24 h del último fallo, se olvida el castigo acumulado
  if s.ultimo_fallo is not null and v_now - s.ultimo_fallo > interval '24 hours' then
    s.fallos := 0;
    s.bloqueos := 0;
  end if;

  if p_pin is not null and extensions.crypt(p_pin, s.pin_hash) = s.pin_hash then
    if s.fallos > 0 or s.bloqueos > 0 or s.bloqueado_hasta is not null then
      update app.staff set fallos = 0, bloqueos = 0, bloqueado_hasta = null, ultimo_fallo = null where id = 1;
    end if;
    if v_red is not null then
      delete from app.limites_red where clave = 'pin:' || v_red;   -- acertó: se le perdonan los fallos de esta red
    end if;
    return null;
  end if;

  -- PIN malo
  s.fallos := s.fallos + 1;
  v_fallos_red := app.sumar_red('pin', v_ventana);              -- null si no se conoce la red
  v_max_global := case when v_red is null then c.pin_intentos_max else c.pin_intentos_max_global end;
  if s.fallos >= v_max_global then
    s.bloqueos := s.bloqueos + 1;
    v_espera := least(c.pin_bloqueo_min * (2 ^ least(s.bloqueos - 1, 10))::int, greatest(60, c.pin_bloqueo_min));
    update app.staff
       set fallos = 0, bloqueos = s.bloqueos, ultimo_fallo = v_now, bloqueado_hasta = v_now + make_interval(mins => v_espera)
     where id = 1;
    return jsonb_build_object('ok', false, 'resultado', 'bloqueado', 'hastaISO', app.iso(v_now + make_interval(mins => v_espera)),
                              'segundos', v_espera * 60);
  end if;
  update app.staff set fallos = s.fallos, bloqueos = s.bloqueos, ultimo_fallo = v_now where id = 1;
  if v_fallos_red is not null and v_fallos_red >= c.pin_intentos_max then
    return jsonb_build_object('ok', false, 'resultado', 'bloqueado', 'hastaISO', app.iso(v_ventana + interval '15 minutes'),
                              'segundos', ceil(extract(epoch from (v_ventana + interval '15 minutes' - v_now)))::int);
  end if;
  return jsonb_build_object('ok', false, 'resultado', 'pin-incorrecto',
                            'intentosRestantes', case when v_fallos_red is not null then c.pin_intentos_max - v_fallos_red else c.pin_intentos_max - s.fallos end);
end $$;

-- Busca un código escrito de cualquier manera: LAINDIA-QB9A, laindia qb9a, LAINDIAQB9A o solo QB9A
create or replace function app.buscar_codigo(p_texto text) returns app.codigos
language plpgsql stable as $$
declare
  v text := upper(regexp_replace(coalesce(p_texto, ''), '[^A-Za-z0-9]', '', 'g'));
  k app.codigos;
begin
  if length(v) < 4 or length(v) > 24 then
    return null;
  end if;
  select * into k from app.codigos where replace(codigo, '-', '') = v;
  if not found then
    select * into k from app.codigos where split_part(codigo, '-', 2) = v order by emitido_en desc limit 1;
  end if;
  if not found then
    return null;
  end if;
  return k;
end $$;

-- Estado real de un código: activo | vencido | canjeado | desactivado
create or replace function app.estado_de(k app.codigos) returns text language sql stable as $$
  select case when k.estado <> 'activo' then k.estado when now() >= k.vence_en then 'vencido' else 'activo' end
$$;

-- La consulta de un código. p_admin = true agrega nombre y celular (la caja NO los necesita ni los ve).
create or replace function app.consultar_codigo(p_codigo text, p_admin boolean) returns jsonb
language plpgsql stable as $$
declare
  c app.configuracion := app.config();
  k app.codigos := app.buscar_codigo(p_codigo);
  v_estado text;
begin
  if k.id is null then
    return jsonb_build_object('ok', true, 'resultado', 'inexistente', 'ahoraISO', app.iso(now()));
  end if;
  v_estado := app.estado_de(k);
  return jsonb_build_object(
    'ok', true,
    'resultado', case v_estado when 'activo' then 'valido' else v_estado end,   -- valido | vencido | canjeado | desactivado
    'codigo', k.codigo,
    'emitidoISO', app.iso(k.emitido_en),
    'venceISO', app.iso(k.vence_en),
    'canjeadoISO', case when k.canjeado_en is not null then app.iso(k.canjeado_en) end,
    'regaloElegido', k.regalo_elegido,
    'regalos', c.regalos,
    'compraMinima', c.compra_minima,
    'ahoraISO', app.iso(now())
  ) || case when p_admin then jsonb_build_object('nombre', k.nombre, 'celular', k.celular, 'canjeadoPor', k.canjeado_por) else '{}'::jsonb end;
end $$;

-- Canjear. ATÓMICO: bloquea la fila del código, así dos cajeros (o un doble toque) jamás lo canjean dos veces.
create or replace function app.canjear(p_codigo text, p_regalo text, p_por text) returns jsonb
language plpgsql volatile as $$
declare
  c app.configuracion := app.config();
  k app.codigos := app.buscar_codigo(p_codigo);
  v_regalo text := nullif(btrim(coalesce(p_regalo, '')), '');
  v_estado text;
begin
  if k.id is null then
    return jsonb_build_object('ok', false, 'resultado', 'inexistente');
  end if;
  select * into k from app.codigos where id = k.id for update;   -- ← el candado
  v_estado := app.estado_de(k);
  if v_estado <> 'activo' then
    return jsonb_build_object('ok', false, 'resultado', v_estado, 'codigo', k.codigo,
                              'venceISO', app.iso(k.vence_en), 'canjeadoISO', case when k.canjeado_en is not null then app.iso(k.canjeado_en) end,
                              'regaloElegido', k.regalo_elegido);
  end if;
  if v_regalo is null and jsonb_array_length(c.regalos) = 1 then
    v_regalo := c.regalos ->> 0;                                 -- si solo hay un regalo, no hace falta elegir
  end if;
  if v_regalo is null or not (c.regalos ? v_regalo) then
    return jsonb_build_object('ok', false, 'resultado', 'regalo-invalido', 'regalos', c.regalos);
  end if;
  update app.codigos
     set estado = 'canjeado', canjeado_en = clock_timestamp(), canjeado_por = p_por, regalo_elegido = v_regalo
   where id = k.id
   returning * into k;
  return jsonb_build_object('ok', true, 'resultado', 'canjeado-ahora', 'codigo', k.codigo,
                            'regaloElegido', k.regalo_elegido, 'canjeadoISO', app.iso(k.canjeado_en));
end $$;

-- Filas de códigos para el panel: filtro por estado real y búsqueda por código, nombre o celular
create or replace function app.buscar_codigos(p_estado text, p_buscar text) returns setof app.v_codigos
language sql stable as $$
  select v.* from app.v_codigos v
   where (coalesce(p_estado, 'todos') = 'todos' or v.estado_efectivo = p_estado)
     and (nullif(btrim(coalesce(p_buscar, '')), '') is null
          or strpos(app.sin_tildes(v.codigo), app.sin_tildes(btrim(p_buscar))) > 0
          or strpos(app.sin_tildes(v.nombre), app.sin_tildes(btrim(p_buscar))) > 0
          or (length(regexp_replace(p_buscar, '\D', '', 'g')) >= 3
              and strpos(v.celular, regexp_replace(p_buscar, '\D', '', 'g')) > 0))
   order by v.emitido_en desc, v.id desc
$$;

create or replace function app.codigos_json(p_estado text, p_buscar text, p_desde int, p_limite int) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'codigo', t.codigo, 'nombre', t.nombre, 'celular', t.celular, 'estado', t.estado_efectivo,
           'emitidoISO', app.iso(t.emitido_en), 'venceISO', app.iso(t.vence_en),
           'canjeadoISO', case when t.canjeado_en is not null then app.iso(t.canjeado_en) end,
           'canjeadoPor', t.canjeado_por, 'regalo', t.regalo_elegido)
         order by t.emitido_en desc, t.id desc), '[]'::jsonb)
  from (select * from app.buscar_codigos(p_estado, p_buscar) offset greatest(0, p_desde) limit p_limite) t
$$;

-- La configuración completa, con los nombres que usa el panel
create or replace function app.config_json() returns jsonb language sql stable as $$
  select jsonb_build_object(
    'intentosPorSemana', c.intentos_por_semana,
    'premiosPorSemana', c.premios_por_semana,
    'cupoDiario', c.cupo_diario,
    'vigenciaDias', c.vigencia_dias,
    'diasEntreCodigosPorCelular', c.dias_entre_codigos_por_celular,
    'compraMinima', c.compra_minima,
    'regalos', c.regalos,
    'campanaInicioISO', case when c.campana_inicio is not null then app.iso(c.campana_inicio) end,
    'campanaFinISO', case when c.campana_fin is not null then app.iso(c.campana_fin) end,
    'duracionPartidaS', c.duracion_partida_s,
    'frutasMinimas', c.frutas_minimas,
    'minimoJugadoS', c.minimo_jugado_s,
    'ventanaReclamoMin', c.ventana_reclamo_min,
    'prefijoCodigo', c.prefijo_codigo,
    'largoCodigo', c.largo_codigo,
    'pinIntentosMax', c.pin_intentos_max,
    'pinBloqueoMin', c.pin_bloqueo_min,
    'pinIntentosMaxGlobal', c.pin_intentos_max_global,
    'limitePartidasIpHora', c.limite_partidas_ip_hora,
    'limiteCodigosIpDia', c.limite_codigos_ip_dia,
    'juego', c.juego,
    'actualizadoISO', app.iso(c.actualizado_en))
  from app.config() c
$$;

-- Validación de la dificultad que llega del panel. Devuelve el mensaje de error, o NULL si todo está bien.
-- Solo números y verdadero/falso, solo los grupos conocidos de web/js/config.js, y rangos sensatos en lo importante
-- (para que un "10000" por error no deje el juego injugable para todo el mundo).
create or replace function app.validar_juego(j jsonb) returns text language plpgsql immutable as $$
declare
  g text; k text; v jsonb; r record;
  rangos constant jsonb := '{
    "velocidad.inicial":[3,30], "velocidad.final":[3,40], "velocidad.multiplicador":[0.3,3],
    "obstaculos.separacionInicialS":[0.4,6], "obstaculos.separacionFinalS":[0.4,6], "obstaculos.separacionMinimaS":[0.3,4],
    "partida.vidas":[1,9], "partida.toleranciaColision":[0,0.45], "partida.invulnerabilidadS":[0,5],
    "frutas.cadaS":[0.5,8], "salto.alto":[0.5,3], "salto.duracionS":[0.3,1.5]}'::jsonb;
  v_ruta text;
begin
  if jsonb_typeof(j) <> 'object' then return 'La dificultad debe ser un objeto.'; end if;
  if length(j::text) > 4000 then return 'La dificultad es demasiado grande.'; end if;
  for g in select jsonb_object_keys(j) loop
    if g not in ('partida', 'velocidad', 'carriles', 'salto', 'jugador', 'obstaculos', 'frutas', 'controles') then
      return 'Grupo de dificultad desconocido: ' || g;
    end if;
    if jsonb_typeof(j -> g) <> 'object' then return 'El grupo ' || g || ' debe ser un objeto.'; end if;
    for k, v in select * from jsonb_each(j -> g) loop
      v_ruta := g || '.' || k;
      if jsonb_typeof(v) = 'boolean' then continue; end if;
      if jsonb_typeof(v) = 'object' and g = 'obstaculos' and k = 'tipos' then continue; end if;   -- los "tipos" de obstáculo solo se tocan a mano: se aceptan tal cual
      if jsonb_typeof(v) <> 'number' then return v_ruta || ' debe ser un número.'; end if;
      if rangos ? v_ruta and ((v #>> '{}')::numeric < (rangos -> v_ruta ->> 0)::numeric or (v #>> '{}')::numeric > (rangos -> v_ruta ->> 1)::numeric) then
        return v_ruta || ' debe estar entre ' || (rangos -> v_ruta ->> 0) || ' y ' || (rangos -> v_ruta ->> 1) || '.';
      end if;
      if abs((v #>> '{}')::numeric) > 1000 then return v_ruta || ' es demasiado grande.'; end if;
    end loop;
  end loop;
  if j #> '{obstaculos,tipos}' is not null and jsonb_typeof(j #> '{obstaculos,tipos}') <> 'object' then
    return 'obstaculos.tipos debe ser un objeto.';
  end if;
  return null;
end $$;

-- Un entero dentro de un rango. Si la clave no viene en `p`, devuelve el valor actual (no cambia nada).
create or replace function app.entero_en_rango(p jsonb, k text, lo numeric, hi numeric, etiqueta text, actual int) returns int
language plpgsql immutable as $$
begin
  if not (p ? k) then
    return actual;
  end if;
  if jsonb_typeof(p -> k) <> 'number' or (p ->> k)::numeric <> trunc((p ->> k)::numeric) then
    raise exception '% debe ser un número entero.', etiqueta;
  end if;
  if (p ->> k)::numeric < lo or (p ->> k)::numeric > hi then
    raise exception '% debe estar entre % y %.', etiqueta, lo, hi;
  end if;
  return (p ->> k)::int;
end $$;

-- Guarda cambios de configuración. `p` trae SOLO lo que se quiere cambiar. TODO O NADA: si algo es inválido no se guarda nada.
create or replace function app.guardar_config(p jsonb) returns jsonb language plpgsql volatile as $$
declare
  c app.configuracion := app.config();
  v_ini timestamptz := c.campana_inicio;
  v_fin timestamptz := c.campana_fin;
  v_regalos jsonb := c.regalos;
  v_prefijo text := c.prefijo_codigo;
  v_juego jsonb := c.juego;
  v_err text;
begin
  if jsonb_typeof(p) is distinct from 'object' then
    return jsonb_build_object('ok', false, 'motivo', 'datos', 'mensaje', 'Datos inválidos.');
  end if;

  if p ? 'campanaInicioISO' then v_ini := nullif(btrim(coalesce(p ->> 'campanaInicioISO', '')), '')::timestamptz; end if;
  if p ? 'campanaFinISO'    then v_fin := nullif(btrim(coalesce(p ->> 'campanaFinISO', '')), '')::timestamptz; end if;
  if v_ini is not null and v_fin is not null and v_fin <= v_ini then
    raise exception 'La campaña debe terminar después de empezar.';
  end if;

  if p ? 'regalos' then
    if jsonb_typeof(p -> 'regalos') <> 'array' or jsonb_array_length(p -> 'regalos') not between 1 and 6 then
      raise exception 'Debe haber entre 1 y 6 regalos.';
    end if;
    if exists (select 1 from jsonb_array_elements(p -> 'regalos') e
                where jsonb_typeof(e) <> 'string' or char_length(btrim(e #>> '{}')) not between 2 and 60) then
      raise exception 'Cada regalo debe ser un texto de 2 a 60 letras.';
    end if;
    select jsonb_agg(btrim(x)) into v_regalos from jsonb_array_elements_text(p -> 'regalos') x;
    if (select count(distinct x) from jsonb_array_elements_text(v_regalos) x) <> jsonb_array_length(v_regalos) then
      raise exception 'Los regalos no pueden repetirse.';
    end if;
  end if;

  if p ? 'prefijoCodigo' then
    v_prefijo := upper(btrim(coalesce(p ->> 'prefijoCodigo', '')));
    if v_prefijo !~ '^[A-Z0-9]{2,12}$' then
      raise exception 'El prefijo del código debe tener de 2 a 12 letras o números (sin espacios).';
    end if;
  end if;

  if p ? 'juego' then
    v_err := app.validar_juego(p -> 'juego');
    if v_err is not null then raise exception '%', v_err; end if;
    -- La duración y las frutas mínimas viven en sus columnas propias (las que valida el servidor)
    v_juego := (p -> 'juego') #- '{partida,duracionS}' #- '{partida,frutasMinimas}';
  end if;

  update app.configuracion set
    intentos_por_semana            = app.entero_en_rango(p, 'intentosPorSemana', 1, 50, 'Intentos por semana', intentos_por_semana),
    premios_por_semana             = app.entero_en_rango(p, 'premiosPorSemana', 0, 10000, 'Premios por semana', premios_por_semana),
    cupo_diario                    = app.entero_en_rango(p, 'cupoDiario', 0, 10000, 'Cupo diario', cupo_diario),
    vigencia_dias                  = app.entero_en_rango(p, 'vigenciaDias', 1, 365, 'Días de vigencia', vigencia_dias),
    dias_entre_codigos_por_celular = app.entero_en_rango(p, 'diasEntreCodigosPorCelular', 0, 365, 'Días entre códigos por celular', dias_entre_codigos_por_celular),
    compra_minima                  = app.entero_en_rango(p, 'compraMinima', 0, 10000000, 'Compra mínima', compra_minima),
    duracion_partida_s             = app.entero_en_rango(p, 'duracionPartidaS', 15, 300, 'Duración de la partida', duracion_partida_s),
    frutas_minimas                 = app.entero_en_rango(p, 'frutasMinimas', 0, 500, 'Frutas mínimas', frutas_minimas),
    minimo_jugado_s                = app.entero_en_rango(p, 'minimoJugadoS', 0, 300, 'Tiempo mínimo jugado', minimo_jugado_s),
    ventana_reclamo_min            = app.entero_en_rango(p, 'ventanaReclamoMin', 1, 240, 'Minutos que se aparta el premio', ventana_reclamo_min),
    largo_codigo                   = app.entero_en_rango(p, 'largoCodigo', 4, 10, 'Largo del código', largo_codigo),
    pin_intentos_max               = app.entero_en_rango(p, 'pinIntentosMax', 3, 20, 'Intentos de PIN antes del bloqueo', pin_intentos_max),
    pin_bloqueo_min                = app.entero_en_rango(p, 'pinBloqueoMin', 1, 240, 'Minutos del primer bloqueo del PIN', pin_bloqueo_min),
    pin_intentos_max_global        = app.entero_en_rango(p, 'pinIntentosMaxGlobal', 3, 1000, 'PIN malos (sumando todas las redes) antes del bloqueo general', pin_intentos_max_global),
    limite_partidas_ip_hora        = app.entero_en_rango(p, 'limitePartidasIpHora', 0, 100000, 'Partidas por hora desde una misma red', limite_partidas_ip_hora),
    limite_codigos_ip_dia          = app.entero_en_rango(p, 'limiteCodigosIpDia', 0, 10000, 'Códigos por día desde una misma red', limite_codigos_ip_dia),
    regalos = v_regalos, campana_inicio = v_ini, campana_fin = v_fin, prefijo_codigo = v_prefijo, juego = v_juego
  where id = 1;

  return jsonb_build_object('ok', true, 'config', app.config_json());
exception
  when raise_exception then
    return jsonb_build_object('ok', false, 'motivo', 'datos', 'mensaje', sqlerrm);
  when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
    return jsonb_build_object('ok', false, 'motivo', 'datos', 'mensaje', 'Una fecha o un número no tiene el formato correcto.');
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'datos', 'mensaje', 'Algún valor está fuera del rango permitido.');
end $$;

-- Cambia el PIN del staff (4 a 8 números, no demasiado obvio) y borra los bloqueos.
create or replace function app.cambiar_pin(p_pin text) returns jsonb language plpgsql volatile as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then
    return jsonb_build_object('ok', false, 'motivo', 'pin-invalido', 'mensaje', 'El PIN debe tener entre 4 y 8 números (recomendado: 6).');
  end if;
  if p_pin ~ '^(.)\1*$' or p_pin in ('1234', '12345', '123456', '1234567', '12345678', '4321', '54321', '654321', '7654321', '87654321',
                                      '0123', '01234', '012345', '0123456', '01234567') then
    return jsonb_build_object('ok', false, 'motivo', 'pin-facil', 'mensaje', 'Ese PIN es muy fácil de adivinar. Elige otro.');
  end if;
  update app.staff
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), pin_cambiado_en = now(),
         fallos = 0, bloqueos = 0, ultimo_fallo = null, bloqueado_hasta = null
   where id = 1;
  delete from app.limites_red where clave like 'pin:%';
  return jsonb_build_object('ok', true);
end $$;

-- ───────────────────────────────── funciones públicas: STAFF (la caja; con la clave pública + PIN) ─────────────────────────────────

create or replace function public.canje_consultar(p_pin text, p_codigo text) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
declare
  v jsonb := app.verificar_pin(p_pin);
begin
  if v is not null then
    return v;
  end if;
  return app.consultar_codigo(p_codigo, false);
end $$;

create or replace function public.canje_confirmar(p_pin text, p_codigo text, p_regalo text default null) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
declare
  v jsonb := app.verificar_pin(p_pin);
begin
  if v is not null then
    return v;
  end if;
  return app.canjear(p_codigo, p_regalo, 'staff');
end $$;

-- ───────────────────────────────── funciones públicas: ADMIN (solo con sesión de Supabase Auth + estar en app.admins) ─────────────────────────────────

-- ¿Esta sesión es de un administrador? (el panel lo pregunta justo después de iniciar sesión)
create or replace function public.admin_yo() returns jsonb
language sql stable security definer set search_path = app, pg_temp as $$
  select jsonb_build_object('ok', true, 'esAdmin', app.es_admin())
$$;

-- Métricas: partidas, ganadores, códigos, canjes, premios restantes y los últimos 14 días
create or replace function public.admin_resumen() returns jsonb
language plpgsql stable security definer set search_path = app, pg_temp as $$
declare
  c app.configuracion := app.config();
  v_now timestamptz := now();
  v_sem date := app.semana_de(v_now);
  cu record;
  pt record;
  cd record;
  s app.staff;
  e jsonb := app.estado_json(null);
  v_dias jsonb;
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  select * into cu from app.cupos();
  select count(*) as total,
         count(*) filter (where semana = v_sem) as sem,
         count(*) filter (where resultado = 'gano_validado') as gan,
         count(*) filter (where resultado = 'gano_validado' and semana = v_sem) as gan_sem,
         count(*) filter (where resultado = 'gano_rechazado') as rech,
         count(*) filter (where resultado = 'gano_sin_cupo') as sin_cupo
    into pt from app.partidas;
  select count(*) as total,
         count(*) filter (where semana = v_sem) as sem,
         count(*) filter (where estado_efectivo = 'activo') as activos,
         count(*) filter (where estado_efectivo = 'vencido') as vencidos,
         count(*) filter (where estado_efectivo = 'desactivado') as desactivados,
         count(*) filter (where estado_efectivo = 'canjeado') as canjeados,
         count(*) filter (where estado_efectivo = 'canjeado' and app.semana_de(canjeado_en) = v_sem) as canjes_sem
    into cd from app.v_codigos;
  select * into s from app.staff where id = 1;
  select coalesce(jsonb_agg(jsonb_build_object(
           'dia', x.d::text,
           'partidas', (select count(*) from app.partidas where app.dia_de(inicio) = x.d),
           'ganadores', (select count(*) from app.partidas where resultado = 'gano_validado' and app.dia_de(inicio) = x.d),
           'codigos', (select count(*) from app.codigos where dia = x.d),
           'canjes', (select count(*) from app.codigos where estado = 'canjeado' and app.dia_de(canjeado_en) = x.d))
         order by x.d desc), '[]'::jsonb)
    into v_dias
    from (select app.dia_de(v_now) - g as d from generate_series(0, 13) g) x;

  return jsonb_build_object(
    'ok', true,
    'ahoraISO', app.iso(v_now),
    'semanaInicioISO', app.iso(app.inicio_semana(v_now)),
    'jugable', (e ->> 'jugable')::boolean,
    'motivo', e ->> 'motivo',
    'premiosRestantes', cu.restantes,
    'premiosPorSemana', c.premios_por_semana,
    'cupoDiario', c.cupo_diario,                 -- 0 = apagado
    'premiosHoyRestantes', cu.diario,            -- null si no hay cupo diario
    'premiosSemanaRestantes', cu.semanal,        -- lo que queda de la semana (premiosRestantes es el menor entre este y el de hoy)
    'limitadoPor', case when cu.diario is not null and cu.diario < cu.semanal then 'dia' else 'semana' end,
    'partidas', jsonb_build_object('total', pt.total, 'semana', pt.sem, 'ganadores', pt.gan, 'ganadoresSemana', pt.gan_sem,
                                   'rechazadas', pt.rech, 'sinCupo', pt.sin_cupo),
    'codigos', jsonb_build_object('total', cd.total, 'semana', cd.sem, 'activos', cd.activos, 'vencidos', cd.vencidos,
                                  'desactivados', cd.desactivados, 'canjeados', cd.canjeados, 'canjesSemana', cd.canjes_sem),
    'dias', v_dias,
    'pin', jsonb_build_object(
      'configurado', s.pin_hash is not null,
      'cambiadoISO', case when s.pin_cambiado_en is not null then app.iso(s.pin_cambiado_en) end,
      'bloqueadoHastaISO', case when s.bloqueado_hasta > v_now then app.iso(s.bloqueado_hasta) end,
      'fallos', s.fallos));
end $$;

-- Lista de códigos con filtro (todos | activo | canjeado | vencido | desactivado) y búsqueda por código, nombre o celular
create or replace function public.admin_codigos(
  p_estado text default 'todos', p_buscar text default null, p_desde int default 0, p_limite int default 50
) returns jsonb
language plpgsql stable security definer set search_path = app, pg_temp as $$
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  return jsonb_build_object(
    'ok', true,
    'total', (select count(*) from app.buscar_codigos(p_estado, p_buscar)),
    'filas', app.codigos_json(p_estado, p_buscar, coalesce(p_desde, 0), least(greatest(coalesce(p_limite, 50), 1), 200)),
    'ahoraISO', app.iso(now()));
end $$;

-- Para el CSV: lo mismo, hasta 20.000 filas de una vez
create or replace function public.admin_exportar(p_estado text default 'todos', p_buscar text default null) returns jsonb
language plpgsql stable security definer set search_path = app, pg_temp as $$
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  return jsonb_build_object(
    'ok', true,
    'total', (select count(*) from app.buscar_codigos(p_estado, p_buscar)),
    'filas', app.codigos_json(p_estado, p_buscar, 0, 20000),
    'ahoraISO', app.iso(now()));
end $$;

-- La función del staff, pero para ti (sin PIN; muestra además nombre y celular)
create or replace function public.admin_consultar_codigo(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = app, pg_temp as $$
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  return app.consultar_codigo(p_codigo, true);
end $$;

create or replace function public.admin_canjear(p_codigo text, p_regalo text default null) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  return app.canjear(p_codigo, p_regalo, 'admin');
end $$;

-- Desactivar a mano un código activo (p_estado = 'desactivado') o volver a activarlo (p_estado = 'activo').
-- Un código CANJEADO no se toca nunca más (regla de seguridad: canjeado = desactivado para siempre).
create or replace function public.admin_estado_codigo(p_codigo text, p_estado text) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
declare
  k app.codigos := app.buscar_codigo(p_codigo);
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  if p_estado not in ('desactivado', 'activo') then
    return jsonb_build_object('ok', false, 'motivo', 'datos');
  end if;
  if k.id is null then
    return jsonb_build_object('ok', false, 'motivo', 'inexistente');
  end if;
  select * into k from app.codigos where id = k.id for update;
  if k.estado = 'canjeado' then
    return jsonb_build_object('ok', false, 'motivo', 'canjeado');
  end if;
  if k.estado = p_estado then
    return jsonb_build_object('ok', true, 'codigo', k.codigo, 'estado', app.estado_de(k), 'sinCambio', true);
  end if;
  update app.codigos set estado = p_estado where id = k.id returning * into k;
  return jsonb_build_object('ok', true, 'codigo', k.codigo, 'estado', app.estado_de(k));
end $$;

create or replace function public.admin_config() returns jsonb
language plpgsql stable security definer set search_path = app, pg_temp as $$
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  return jsonb_build_object('ok', true, 'config', app.config_json(), 'ahoraISO', app.iso(now()));
end $$;

create or replace function public.admin_guardar_config(p_cambios jsonb) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  return app.guardar_config(p_cambios);
end $$;

create or replace function public.admin_cambiar_pin(p_pin text) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  return app.cambiar_pin(p_pin);
end $$;

-- Quita el bloqueo del PIN (por si en la caja se equivocaron muchas veces)
create or replace function public.admin_desbloquear_pin() returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  update app.staff set fallos = 0, bloqueos = 0, ultimo_fallo = null, bloqueado_hasta = null where id = 1;
  delete from app.limites_red where clave like 'pin:%';   -- también los intentos de cada red
  return jsonb_build_object('ok', true);
end $$;

-- ───────────────────────────────── permisos ─────────────────────────────────
-- Todo lo interno (app.*) cerrado. Las de la caja se abren a la clave pública (el PIN las protege); las de admin
-- SOLO al rol "authenticated" (alguien con sesión) y además cada una comprueba app.es_admin().
-- OJO: Supabase da permiso por defecto a "anon" en las funciones nuevas de "public"; por eso se le quita a mano.
revoke all on all functions in schema app from public, anon, authenticated;

revoke all on function public.canje_consultar(text, text) from public, anon, authenticated;
revoke all on function public.canje_confirmar(text, text, text) from public, anon, authenticated;
grant execute on function public.canje_consultar(text, text) to anon, authenticated;
grant execute on function public.canje_confirmar(text, text, text) to anon, authenticated;

revoke all on function public.admin_yo() from public, anon, authenticated;
revoke all on function public.admin_resumen() from public, anon, authenticated;
revoke all on function public.admin_codigos(text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_exportar(text, text) from public, anon, authenticated;
revoke all on function public.admin_consultar_codigo(text) from public, anon, authenticated;
revoke all on function public.admin_canjear(text, text) from public, anon, authenticated;
revoke all on function public.admin_estado_codigo(text, text) from public, anon, authenticated;
revoke all on function public.admin_config() from public, anon, authenticated;
revoke all on function public.admin_guardar_config(jsonb) from public, anon, authenticated;
revoke all on function public.admin_cambiar_pin(text) from public, anon, authenticated;
revoke all on function public.admin_desbloquear_pin() from public, anon, authenticated;

grant execute on function public.admin_yo() to authenticated;
grant execute on function public.admin_resumen() to authenticated;
grant execute on function public.admin_codigos(text, text, int, int) to authenticated;
grant execute on function public.admin_exportar(text, text) to authenticated;
grant execute on function public.admin_consultar_codigo(text) to authenticated;
grant execute on function public.admin_canjear(text, text) to authenticated;
grant execute on function public.admin_estado_codigo(text, text) to authenticated;
grant execute on function public.admin_config() to authenticated;
grant execute on function public.admin_guardar_config(jsonb) to authenticated;
grant execute on function public.admin_cambiar_pin(text) to authenticated;
grant execute on function public.admin_desbloquear_pin() to authenticated;

-- ───────────────────────────────── autocomprobación ─────────────────────────────────
-- Si pgcrypto no estuviera disponible, que falle AQUÍ (a la vista) y no más tarde, cuando pongas el PIN.
do $$ begin perform extensions.crypt('prueba', extensions.gen_salt('bf', 4)); end $$;


-- ┌───────────────────────────── sql/auditoria_permisos.sql ─────────────────────────────
-- auditoria_permisos.sql — Revisa en tu Supabase REAL que nada quedó abierto de más para el público.
-- Es de SOLO LECTURA (no cambia nada). Pégalo en el SQL Editor y pulsa Run.
--
-- Qué debe salir: UNA sola fila que dice «✅ Todo en orden». Si salen filas con problemas, cada una dice qué está abierto.
--
-- Qué revisa (todo lo que la clave pública «anon» y las sesiones «authenticated» podrían tocar):
--   · que las tablas del esquema privado «app» tengan RLS activado y ningún permiso para anon/authenticated;
--   · que no haya tablas ni vistas sueltas en «public» (Supabase expone ese esquema por internet);
--   · que anon/authenticated no puedan ni entrar al esquema «app» ni ejecutar sus funciones internas;
--   · que anon solo pueda ejecutar las 9 funciones del juego y de la caja, y «authenticated» esas 9 + las 11 del administrador;
--   · que todas las funciones públicas sean SECURITY DEFINER (corren con permisos del dueño, no del que llama);
--   · que no falte ninguna función prevista.
with permitidas_anon (nombre) as (
  values ('ping'), ('estado'), ('iniciar_partida'), ('terminar_partida'), ('reclamar_codigo'), ('mi_codigo'),
         ('canje_consultar'), ('canje_confirmar'), ('diag_red')
),
permitidas_auth (nombre) as (
  select nombre from permitidas_anon
  union all
  values ('admin_yo'), ('admin_resumen'), ('admin_codigos'), ('admin_exportar'), ('admin_consultar_codigo'), ('admin_canjear'),
         ('admin_estado_codigo'), ('admin_config'), ('admin_guardar_config'), ('admin_cambiar_pin'), ('admin_desbloquear_pin')
),
funciones_publicas as (
  select p.oid, p.proname, p.prosecdef, p.oid::regprocedure::text as firma
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')   -- las que traen las extensiones no cuentan
),
problemas as (
  select 'Tabla de «app» SIN RLS' as problema, c.relname::text as detalle
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relkind in ('r', 'p') and not c.relrowsecurity
  union all
  select 'anon/authenticated tienen permiso sobre una tabla o vista de «app»', c.relname::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relkind in ('r', 'p', 'v', 'm')
     and (has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
          or has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'))
  union all
  select 'Tabla o vista suelta en «public» (queda expuesta por internet)', c.relname::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  union all
  select 'anon o authenticated pueden usar el esquema «app»', 'USAGE sobre app'
   where has_schema_privilege('anon', 'app', 'USAGE') or has_schema_privilege('authenticated', 'app', 'USAGE')
  union all
  select 'Función interna de «app» ejecutable por anon/authenticated', p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
     and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  union all
  select 'anon puede ejecutar una función pública NO prevista', firma
    from funciones_publicas
   where has_function_privilege('anon', oid, 'EXECUTE') and proname not in (select nombre from permitidas_anon)
  union all
  select 'authenticated puede ejecutar una función pública NO prevista', firma
    from funciones_publicas
   where has_function_privilege('authenticated', oid, 'EXECUTE') and proname not in (select nombre from permitidas_auth)
  union all
  select 'Función pública SIN security definer', firma from funciones_publicas where not prosecdef
  union all
  select 'Falta una función prevista (¿se pegaron las 3 migraciones?)', nombre
    from permitidas_auth pa
   where not exists (select 1 from funciones_publicas f where f.proname = pa.nombre)
  union all
  select 'anon puede ejecutar una función admin_*', firma
    from funciones_publicas where proname like 'admin\_%' and has_function_privilege('anon', oid, 'EXECUTE')
)
select problema, detalle from problemas
union all
select '✅ Todo en orden', 'ninguna tabla ni función abierta de más (0 problemas)'
 where not exists (select 1 from problemas);
