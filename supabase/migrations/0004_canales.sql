-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- 0004_canales.sql — Etapa 7: ¿de dónde vienen los jugadores? (etiquetas UTM)
--
-- Cada enlace que se reparte lleva etiquetas (por ejemplo  ?utm_source=mostrador&utm_medium=qr&utm_campaign=lanzamiento ).
-- El juego las lee al abrirse y, cuando alguien EMPIEZA una partida, las anota en esa partida. El panel (Resumen) las cuenta:
-- por canal, cuántos jugadores, partidas, llegadas a la meta, códigos y canjes.
--
-- Privacidad: las etiquetas NO identifican a nadie (son del enlace, no de la persona) y se guardan en la partida, no en el celular.
--
-- Seguro de volver a pegar (usa «if not exists» y «create or replace»; no borra datos). Pégalo DESPUÉS de 0001, 0002 y 0003
-- (o pega todo-junto.sql, que ya trae todo en orden).
--
-- Funciones nuevas:
--   · public.registrar_canal(p_token, p_fuente, p_medio, p_campana)   → la llama el juego (clave pública); fallo = no pasa nada
--   · public.admin_canales(p_periodo)                                  → la llama el panel (solo administradores)
-- ════════════════════════════════════════════════════════════════════════════════════════════════

alter table app.partidas add column if not exists utm_fuente  text;   -- de dónde viene: mostrador, vasos, instagram, facebook…
alter table app.partidas add column if not exists utm_medio   text;   -- qr, social…
alter table app.partidas add column if not exists utm_campana text;   -- la temporada o campaña: lanzamiento…
create index if not exists partidas_utm on app.partidas (utm_fuente) where utm_fuente is not null;

-- Deja una etiqueta limpia: minúsculas, solo a-z, 0-9, punto, guion y guion bajo, y no más larga que p_max. Si no cumple, NULL
-- (así nadie puede meter texto raro, HTML ni cosas larguísimas a la base).
create or replace function app.limpiar_utm(p text, p_max int) returns text language sql immutable as $$
  select case when t.v ~ '^[a-z0-9][a-z0-9_.-]*$' and length(t.v) <= p_max then t.v end
    from (select lower(btrim(coalesce(p, ''))) as v) t
$$;

-- El juego anota el canal de la partida que acaba de empezar. Solo se puede UNA vez por partida y en sus primeros 15 minutos.
-- (La partida es un token secreto que solo conoce ese celular; si alguien inventa etiquetas, solo ensucia sus propias partidas.)
create or replace function public.registrar_canal(
  p_token uuid, p_fuente text default null, p_medio text default null, p_campana text default null
) returns jsonb
language plpgsql volatile security definer set search_path = app, pg_temp as $$
declare
  v_f text := app.limpiar_utm(p_fuente, 30);
  v_m text := app.limpiar_utm(p_medio, 30);
  v_k text := app.limpiar_utm(p_campana, 40);
  v_n int;
begin
  if p_token is null or v_f is null then
    return jsonb_build_object('ok', true, 'registrado', false);
  end if;
  update app.partidas
     set utm_fuente = v_f, utm_medio = v_m, utm_campana = v_k
   where id = p_token and utm_fuente is null and inicio > now() - interval '15 minutes';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'registrado', v_n = 1);
end $$;

-- Para el panel: los números por canal. p_periodo = 'semana' (esta semana, desde el lunes) | '30d' (últimos 30 días) | 'todo'.
-- Cada fila es una combinación de fuente · medio · campaña (las partidas sin etiqueta salen con fuente en blanco = «entró directo»).
create or replace function public.admin_canales(p_periodo text default 'todo') returns jsonb
language plpgsql stable security definer set search_path = app, pg_temp as $$
declare
  v_periodo text := case when p_periodo in ('semana', '30d') then p_periodo else 'todo' end;
  v_desde timestamptz;
  v_filas jsonb;
begin
  if not app.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'no-autorizado');
  end if;
  v_desde := case v_periodo when 'semana' then app.inicio_semana(now()) when '30d' then now() - interval '30 days' end;
  select coalesce(jsonb_agg(jsonb_build_object(
           'fuente', g.fuente, 'medio', g.medio, 'campana', g.campana,
           'jugadores', g.jugadores, 'partidas', g.partidas, 'llegaron', g.llegaron, 'codigos', g.codigos, 'canjes', g.canjes)
         order by g.partidas desc, g.fuente nulls last, g.medio nulls last, g.campana nulls last), '[]'::jsonb)
    into v_filas
    from (
      select p.utm_fuente as fuente, p.utm_medio as medio, p.utm_campana as campana,
             count(distinct p.device_id) as jugadores,
             count(*) as partidas,
             count(*) filter (where p.resultado = 'gano_validado') as llegaron,
             count(k.id) as codigos,
             count(k.id) filter (where k.estado = 'canjeado') as canjes
        from app.partidas p
        left join app.codigos k on k.partida_id = p.id
       where v_desde is null or p.inicio >= v_desde
       group by p.utm_fuente, p.utm_medio, p.utm_campana
    ) g;
  return jsonb_build_object('ok', true, 'periodo', v_periodo, 'filas', v_filas, 'ahoraISO', app.iso(now()));
end $$;

-- ───────────────────────────────── permisos ─────────────────────────────────
-- Igual que en 0002 y 0003: Supabase da permiso por defecto a «anon» en las funciones nuevas de «public»; se le quita a mano
-- y se concede solo lo necesario. (Y lo interno de «app» queda cerrado.)
revoke all on all functions in schema app from public, anon, authenticated;

revoke all on function public.registrar_canal(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_canales(text) from public, anon, authenticated;
grant execute on function public.registrar_canal(uuid, text, text, text) to anon, authenticated;
grant execute on function public.admin_canales(text) to authenticated;
