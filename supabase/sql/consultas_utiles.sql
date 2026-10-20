-- consultas_utiles.sql — Cosas que puedes pegar en el SQL Editor de Supabase para MIRAR o CAMBIAR cosas.
-- Pega UNA consulta a la vez (o selecciónala con el mouse y pulsa Run: ejecuta solo lo seleccionado).
-- Las que empiezan con "select" solo miran; las que empiezan con "update"/"select app.ajustar_juego" cambian algo.

-- ═══════════════ MIRAR ═══════════════

-- Los últimos códigos expedidos, con su estado REAL (activo / vencido / canjeado / desactivado)
select codigo, nombre, celular, estado_efectivo, emitido_en at time zone 'America/Bogota' as emitido_bogota,
       vence_en at time zone 'America/Bogota' as vence_bogota, regalo_elegido, canjeado_en
from app.v_codigos order by emitido_en desc limit 50;

-- Cuántos códigos van esta semana y hoy (hora de Bogotá)
select (select count(*) from app.codigos where semana = app.semana_de(now())) as codigos_esta_semana,
       (select count(*) from app.codigos where dia = app.dia_de(now())) as codigos_hoy,
       (select count(*) from app.partidas where semana = app.semana_de(now())) as partidas_esta_semana,
       (select count(*) from app.partidas where resultado = 'gano_validado' and not reclamada and reserva_hasta > now()) as premios_apartados_ahora;

-- Lo que ve el juego (premios restantes, intentos, reglas...). Con un dispositivo cualquiera:
select public.estado(gen_random_uuid());

-- La configuración actual
select * from app.configuracion;

-- ═══════════════ CAMBIAR (reglas del negocio) ═══════════════
-- Ejemplos; cambia el número y pulsa Run. Se aplican de inmediato a todos los jugadores.

-- update app.configuracion set premios_por_semana = 60 where id = 1;            -- banco semanal
-- update app.configuracion set intentos_por_semana = 5 where id = 1;            -- intentos por persona
-- update app.configuracion set cupo_diario = 7 where id = 1;                    -- 0 = sin cupo diario
-- update app.configuracion set dias_entre_codigos_por_celular = 7 where id = 1; -- espera para volver a reclamar con el mismo celular
-- update app.configuracion set compra_minima = 30000 where id = 1;
-- update app.configuracion set ventana_reclamo_min = 15 where id = 1;           -- minutos que se aparta el premio al ganar
-- update app.configuracion set campana_inicio = '2026-11-01 00:00-05', campana_fin = '2026-12-31 23:59-05' where id = 1;  -- fechas de la campaña (null = siempre)
-- update app.configuracion set frutas_minimas = 25, duracion_partida_s = 60 where id = 1;

-- ═══════════════ CAMBIAR (dificultad del juego) ═══════════════
-- Mezcla lo que pongas con lo que ya hay (no borra el resto). Los nombres son los de web/js/config.js.
-- select app.ajustar_juego('{"velocidad": {"inicial": 10, "final": 15}}');
-- select app.ajustar_juego('{"obstaculos": {"separacionInicialS": 1.4, "separacionFinalS": 0.9}, "partida": {"frutasMinimas": 20}}');
-- Volver a los valores de fábrica (los de config.js):  update app.configuracion set juego = '{}' where id = 1;

-- ═══════════════ CÓDIGOS A MANO ═══════════════
-- Desactivar un código (alguien lo perdió o hubo un error); NO se recicla:
-- update app.codigos set estado = 'desactivado' where codigo = 'LAINDIA-XXXX';
