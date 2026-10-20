-- limpiar_pruebas.sql — BORRA TODAS las partidas y TODOS los códigos.
--
-- Úsalo SOLO antes del lanzamiento, para quitar los datos de prueba (npm run probar-supabase deja códigos de
-- "PRUEBA-AUTOMATICA" y gasta el banco de la semana). NO lo corras cuando ya haya clientes reales:
-- borraría los códigos que la gente tiene en el celular.
--
-- También borra los contadores por red de la Etapa 6 (app.limites_red: partidas por hora, códigos por día e intentos de PIN por red),
-- porque las pruebas los gastan y, si no, la red de quien probó queda «al tope» hasta el día siguiente.
-- La configuración (reglas, dificultad), el PIN de la caja y la lista de administradores NO se tocan.
truncate app.codigos, app.partidas, app.limites_red restart identity cascade;
select 'Listo: partidas, códigos y contadores por red borrados. La configuración, el PIN y los administradores siguen igual.' as resultado;
