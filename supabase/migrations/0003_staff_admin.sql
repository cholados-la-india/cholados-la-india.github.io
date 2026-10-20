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
