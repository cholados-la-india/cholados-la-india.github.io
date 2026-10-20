-- limpiar_pruebas.sql — BORRA TODAS las partidas y TODOS los códigos.
--
-- Úsalo SOLO antes del lanzamiento, para quitar los datos de prueba (npm run probar-supabase deja códigos de
-- "PRUEBA-AUTOMATICA" y gasta el banco de la semana). NO lo corras cuando ya haya clientes reales:
-- borraría los códigos que la gente tiene en el celular.
--
-- La configuración (reglas, dificultad) NO se toca.
truncate app.codigos, app.partidas restart identity cascade;
select 'Listo: partidas y códigos borrados. La configuración sigue igual.' as resultado;
