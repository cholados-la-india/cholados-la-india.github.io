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
