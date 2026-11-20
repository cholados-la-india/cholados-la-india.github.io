-- 0005_revision_noviembre.sql — Endurecimiento de la revisión de noviembre de 2026 (bloque E). Idempotente: se puede volver a correr.
--
-- 1. search_path fijo en TODAS las funciones internas de «app» (el asesor de seguridad de Supabase avisaba de 32). Hoy solo las
--    llaman funciones públicas que ya fijan el suyo, pero así ninguna depende de quién la llame. Se recorre el esquema entero:
--    cualquier función nueva que se agregue después queda cubierta al volver a pegar este archivo.
-- 2. Índice por fecha de inicio en app.partidas (el Resumen del panel y la limpieza de partidas viejas lo usan).
-- 3. La lista de regalos siempre es un arreglo (si alguien la cambia a mano con algo raro, la caja dejaba de funcionar).

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p
     where p.pronamespace = 'app'::regnamespace
       and p.prokind = 'f'
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) x where x like 'search_path=%')
  loop
    execute format('alter function %s set search_path = app, extensions, pg_temp', f.firma);
  end loop;
end $$;

create index if not exists partidas_inicio on app.partidas (inicio);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'configuracion_regalos_arreglo') then
    alter table app.configuracion add constraint configuracion_regalos_arreglo check (jsonb_typeof(regalos) = 'array');
  end if;
end $$;

-- Las funciones internas siguen cerradas al público
revoke all on all functions in schema app from public, anon, authenticated;
