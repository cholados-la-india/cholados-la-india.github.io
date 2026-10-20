// probar-mutaciones.mjs — "Pruebas de las pruebas": rompe el SQL a propósito (un límite, un permiso, una regla) y comprueba que
// `npm run probar-sql` lo detecta. Si alguna mutación NO se detecta, falta una prueba. Siempre restaura los archivos.
//
//   Uso:  npm run probar-mutaciones      (~1 min)
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const MUTACIONES = [
  ['quitar el límite de partidas por red', 'supabase/migrations/0002_funciones.sql', "if not app.limitar('partidas', v_hora, c.limite_partidas_ip_hora) then", "if false and not app.limitar('partidas', v_hora, c.limite_partidas_ip_hora) then"],
  ['quitar el límite de códigos por red', 'supabase/migrations/0002_funciones.sql', "if not app.limitar('codigos', app.inicio_dia(v_now), c.limite_codigos_ip_dia) then", "if false and not app.limitar('codigos', app.inicio_dia(v_now), c.limite_codigos_ip_dia) then"],
  ['quitar el tope de celulares probados por token', 'supabase/migrations/0002_funciones.sql', ' or pa.reclamos_fallidos >= 5 then', ' then'],
  ['quitar el bloqueo del PIN por red', 'supabase/migrations/0003_staff_admin.sql', "app.contar_red('pin', v_ventana) >= c.pin_intentos_max then", "false and app.contar_red('pin', v_ventana) >= c.pin_intentos_max then"],
  ['usar x-forwarded-for antes que cf-connecting-ip', 'supabase/migrations/0002_funciones.sql', "v := coalesce(nullif(btrim(h ->> 'cf-connecting-ip'), ''),\n                nullif(btrim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''),", "v := coalesce(nullif(btrim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''),\n                nullif(btrim(h ->> 'cf-connecting-ip'), ''),"],
  ['guardar la IP en claro', 'supabase/migrations/0002_funciones.sql', "return left(encode(sha256(convert_to(ip || '|' || (select sal_red from app.configuracion where id = 1), 'UTF8')), 'hex'), 24);", 'return ip;'],
  ['dejar la tabla de límites sin RLS', 'supabase/migrations/0001_tablas.sql', 'alter table app.limites_red   enable row level security;', ''],
  ['dejar rls_auto_enable() abierta al público', 'supabase/migrations/0002_funciones.sql', "revoke all on function public.rls_auto_enable() from public, anon, authenticated;", 'null;'],
  ['no mostrar las fechas de campaña', 'supabase/migrations/0002_funciones.sql', "'campana', jsonb_build_object(", "'campana_', jsonb_build_object("],
];

let sinDetectar = 0;
for (const [nombre, archivo, de, a] of MUTACIONES) {
  const original = readFileSync(archivo, 'utf8');
  if (!original.includes(de)) { console.log(`?  NO ENCONTRÉ el texto de «${nombre}»`); sinDetectar++; continue; }
  try {
    writeFileSync(archivo, original.replace(de, () => a));
    const r = spawnSync(process.execPath, ['tools/probar-sql.mjs'], { encoding: 'utf8' });
    const falla = r.status !== 0;
    const cuales = (r.stdout.match(/✗ FALLÓ\s+(.*?)(?:\s+→|\n)/g) ?? []).slice(0, 2).map((x) => x.replace(/✗ FALLÓ\s+/, '').replace(/\s+→.*$/, '').trim());
    console.log(`${falla ? '✓ detectada' : '✗ NO DETECTADA'}  ${nombre}${falla && cuales.length ? '  →  ' + cuales.join(' | ') : ''}`);
    if (!falla) sinDetectar++;
  } finally {
    writeFileSync(archivo, original);
  }
}
console.log(sinDetectar === 0 ? '\nTodas las mutaciones fueron detectadas.' : `\n${sinDetectar} mutaciones SIN detectar.`);
