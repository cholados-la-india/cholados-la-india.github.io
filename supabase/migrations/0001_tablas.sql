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
