-- limpiar_solo_pruebas.sql — Borra SOLO lo que dejan las pruebas automáticas. NO toca los códigos de los clientes.
--
-- Úsalo después de correr `npm run probar-supabase`, `npm run probar-canje` o `npm run probar-ataques -- --completo`
-- cuando el juego YA está abierto (o cuando no estés seguro de si hay clientes). Para dejar todo en cero ANTES de abrir,
-- el que sirve es limpiar_pruebas.sql (ese borra todo).
--
-- Qué borra:
--   · los códigos cuyo «nombre» empieza por PRUEBA- (así se llaman todos los que crean las pruebas) y sus partidas;
--   · los contadores por red (para que la red desde donde probaste no quede «al tope» hasta mañana).
-- (Los premios que las pruebas dejaron «apartados» sin reclamar vuelven solos al banco a los 15 minutos.)
-- Qué NO borra: los códigos y partidas de clientes, la configuración, el PIN ni los administradores.
-- OJO: las partidas de prueba que NO llegaron a tener código se quedan (no se pueden distinguir de las de un cliente);
--      no estorban: solo cuentan en las estadísticas del panel.
do $$
declare
  ids uuid[];
begin
  with borrados as (
    delete from app.codigos where nombre like 'PRUEBA-%' returning partida_id
  )
  select array_agg(partida_id) into ids from borrados;
  delete from app.partidas where id = any (coalesce(ids, '{}'));
end $$;

truncate app.limites_red;

select 'Listo: se borraron los códigos de prueba (nombre PRUEBA-…) y los contadores por red. Los códigos de los clientes siguen igual.' as resultado,
       (select count(*) from app.codigos) as codigos_que_quedan;
