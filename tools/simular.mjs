// simular.mjs — Mide la dificultad sin jugar a mano: un bot juega miles de partidas con la config actual.
//
//   Uso:    npm run simular                       (1.000 partidas por perfil, con web/js/config.js)
//           npm run simular -- 3000               (3.000 partidas por perfil)
//           npm run simular -- 1000 velocidad.inicial=8 obstaculos.separacionFinalS=1.0   (prueba valores distintos)
//
// Los tres perfiles (novato / normal / experto) imitan a una persona con distinta puntería y reacción. Sirve para
// COMPARAR configuraciones; la verdad se mide jugando (estadísticas de ?debug=1).
import { CONFIG } from '../web/js/config.js';
import { PERFILES, simular } from '../web/js/game/bot.js';

const args = process.argv.slice(2);
const n = Number(args.find((a) => /^\d+$/.test(a))) || 1000;
const cfg = structuredClone(CONFIG);
for (const a of args.filter((x) => x.includes('='))) {
  const [ruta, valor] = a.split('=');
  const partes = ruta.split('.');
  let o = cfg;
  for (const k of partes.slice(0, -1)) o = o[k];
  o[partes.at(-1)] = Number(valor);
  console.log(`  (override) ${ruta} = ${valor}`);
}

console.log(`\nDificultad con la config actual · ${n} partidas por perfil\n`);
console.log(`Frutas mínimas para ganar: ${cfg.partida.frutasMinimas}\n`);
console.log('Perfil     Ganan   1 de cada   Choques   Progreso al perder   Frutas (de las que salen)   Perdidas por frutas');
for (const [clave, perfil] of Object.entries(PERFILES)) {
  const t0 = performance.now();
  const r = simular(cfg, perfil, n, { semillaBase: 12345 });
  const cada = r.tasa > 0 ? (1 / r.tasa).toFixed(1) : '—';
  console.log(
    `${perfil.nombre.padEnd(9)}  ${(r.tasa * 100).toFixed(1).padStart(5)} %   ${String(cada).padStart(8)}   ${r.choquesPorPartida.toFixed(2).padStart(7)}   ${(r.progresoMedioEnDerrotas * 100).toFixed(0).padStart(15)} %   ${r.frutasPorPartida.toFixed(1).padStart(8)} de ${r.frutasGeneradasPorPartida.toFixed(0).padEnd(4)}          ${(r.derrotasPorFrutas * 100).toFixed(1).padStart(8)} %   (${(performance.now() - t0).toFixed(0)} ms)`,
  );
}
console.log('');
