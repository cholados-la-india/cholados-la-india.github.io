// seguro-servidor-real.mjs — Seguro para las pruebas que ESCRIBEN en el servidor real (el mismo que usan los clientes).
//
// Esas pruebas crean partidas y códigos de mentira y pueden GASTAR los premios de la semana: con el juego ya abierto,
// correrlas por descuido dejaría a los clientes en «se acabaron los premios» hasta el lunes. Por eso no arrancan a menos
// que se pida a propósito con la bandera:
//
//     npm run probar-supabase -- --gasta-premios-reales
//
// (Las pruebas que solo leen —`npm run probar-seguridad`, `npm run probar-ataques` sin `--completo`— no la necesitan.)
import { SUPABASE } from '../web/js/supabase-config.js';

export const BANDERA = '--gasta-premios-reales';

/**
 * Si falta la bandera, explica qué haría la prueba y sale con error (sin tocar el servidor).
 * @param {string} comando   cómo se llama la prueba (p. ej. 'npm run probar-supabase')
 * @param {string[]} efectos qué deja en el servidor real, en frases cortas
 */
export function exigirPermiso(comando, efectos) {
  if (process.argv.includes(BANDERA)) return;
  console.log(`
⛔ Esta prueba ESCRIBE en el servidor real (${SUPABASE.url}), el mismo de los clientes:
${efectos.map((e) => `   · ${e}`).join('\n')}

   ¿El juego ya está abierto al público? Entonces NO la corras: usa «npm run probar-sql» (no toca el servidor real).

   Si de verdad quieres correrla (antes de abrir, o en una semana sin clientes), escribe:

       ${comando} -- ${BANDERA}

   Y al terminar borra SOLO los datos de prueba con supabase/sql/limpiar_solo_pruebas.sql
   (no uses limpiar_pruebas.sql si ya hay clientes: ese borra TODO).
`);
  process.exit(1);
}
