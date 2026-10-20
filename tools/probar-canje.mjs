// probar-canje.mjs — Prueba el CANJE DOBLE contra el servidor real: 25 cajeros «a la vez» intentan canjear el MISMO código.
//
//   Uso:  npm run probar-canje        (dura ~1 min: respeta el tiempo mínimo de juego para crear un código de prueba)
//
// Te pide el PIN de la caja EN TU TERMINAL (no se ve al escribirlo, no se guarda, no sale de tu computador más que hacia tu
// propio servidor). NUNCA lo escribas en el chat. Crea 1 código de prueba, lo intenta canjear 25 veces simultáneas y comprueba
// que exactamente UNA lo logra y las otras 24 reciben «ya canjeado». Deja ese código de prueba (corre limpiar_pruebas.sql antes
// del lanzamiento). Si escribes mal el PIN, cuenta como un intento fallido de tu red (5 → bloqueo de 15 min).
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { SUPABASE } from '../web/js/supabase-config.js';

const cab = { 'Content-Type': 'application/json', apikey: SUPABASE.clave, ...(SUPABASE.clave.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE.clave}` } : {}) };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
let total = 0;
const ok = (nombre, cond, detalle = '') => {
  total++;
  if (!cond) fallos++;
  console.log(`${cond ? '  ✓' : '  ✗ FALLÓ'}  ${nombre}${!cond && detalle ? '  →  ' + detalle : ''}`);
};
async function rpc(fn, args) {
  const res = await fetch(`${SUPABASE.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: cab, body: JSON.stringify(args) });
  const texto = await res.text();
  try {
    return JSON.parse(texto);
  } catch {
    return { __http: res.status, __texto: texto.slice(0, 160) };
  }
}

function pedirPin() {
  if (process.env.PIN_CAJA) return Promise.resolve(process.env.PIN_CAJA);
  return new Promise((resolver) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const original = rl._writeToOutput.bind(rl);
    let pidiendo = false;
    rl._writeToOutput = (s) => (pidiendo ? rl.output.write(s.replace(/[^\r\n]/g, '*')) : original(s)); // lo escrito se ve como ****
    rl.question('PIN de la caja (no se ve al escribirlo): ', (v) => {
      rl.close();
      console.log('');
      resolver(v.trim());
    });
    pidiendo = true;
  });
}

const PIN = await pedirPin();
if (!PIN) {
  console.log('No escribiste ningún PIN. Cancelado.');
  process.exit(1);
}

console.log('\nCreando un código de prueba (hay que jugar el tiempo mínimo, ~47 s)...');
const device = randomUUID();
const ini = await rpc('iniciar_partida', { p_device: device });
if (!ini.ok) {
  console.log('No se pudo iniciar la partida de prueba:', JSON.stringify(ini).slice(0, 200));
  if (ini.motivo === 'sin-premios' || ini.motivo === 'limite-red') {
    console.log('\n→ El banco de la semana (o el tope de tu red) está gastado por las pruebas anteriores. Corre PRIMERO supabase/sql/limpiar_pruebas.sql');
    console.log('  en el SQL Editor de Supabase (borra datos de prueba y los contadores por red) y vuelve a correr npm run probar-canje.');
  }
  process.exit(1);
}
await esperar(47000);
const fin = await rpc('terminar_partida', { p_token: ini.token, p_gano: true, p_progreso: 1, p_frutas: 40 });
if (!fin.puedeReclamar) {
  console.log('La partida de prueba no quedó validada:', JSON.stringify(fin).slice(0, 200));
  process.exit(1);
}
const cel = '3' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
const rec = await rpc('reclamar_codigo', { p_token: ini.token, p_nombre: 'PRUEBA-CANJE-DOBLE', p_celular: cel, p_consentimiento: true });
if (!rec.ok) {
  console.log('No se pudo crear el código de prueba:', JSON.stringify(rec).slice(0, 200));
  process.exit(1);
}
console.log(`Código de prueba: ${rec.codigo}`);

const antes = await rpc('canje_consultar', { p_pin: PIN, p_codigo: rec.codigo });
if (antes.resultado === 'pin-incorrecto' || antes.resultado === 'bloqueado' || antes.resultado === 'sin-pin') {
  console.log(`\nLa caja respondió «${antes.resultado}». Revisa el PIN (o desbloquea la caja en el panel → Cuenta) y vuelve a intentar.`);
  process.exit(1);
}
ok('el PIN es correcto y el código de prueba está «valido»', antes.resultado === 'valido', JSON.stringify(antes));
const regalo = antes.regalos?.[0];

const N = 25;
console.log(`\nLanzando ${N} canjes simultáneos del MISMO código...`);
const resultados = await Promise.all(Array.from({ length: N }, () => rpc('canje_confirmar', { p_pin: PIN, p_codigo: rec.codigo, p_regalo: regalo })));
const buenos = resultados.filter((r) => r.resultado === 'canjeado-ahora');
const yaCanjeados = resultados.filter((r) => r.resultado === 'canjeado');
const raros = resultados.filter((r) => r.resultado !== 'canjeado-ahora' && r.resultado !== 'canjeado');
ok(`EXACTAMENTE 1 de los ${N} canjes simultáneos se hace (el regalo se entrega una sola vez)`, buenos.length === 1, `se hicieron ${buenos.length}`);
ok(`los otros ${N - 1} reciben «ya canjeado»`, yaCanjeados.length === N - 1, `${yaCanjeados.length} ya-canjeado, ${raros.length} otros: ${JSON.stringify(raros[0] ?? '')}`);
ok('todos los «ya canjeado» muestran el mismo regalo y la misma hora', new Set(yaCanjeados.map((r) => `${r.regaloElegido}|${r.canjeadoISO}`)).size === 1 && yaCanjeados[0]?.regaloElegido === regalo);
const despues = await rpc('canje_consultar', { p_pin: PIN, p_codigo: rec.codigo });
ok('al consultar de nuevo, el código figura «canjeado»', despues.resultado === 'canjeado' && despues.regaloElegido === regalo, JSON.stringify(despues));

console.log(`\n${fallos === 0 ? '✅ TODO BIEN' : '❌ HAY FALLOS'} — ${total - fallos} de ${total} comprobaciones correctas.`);
console.log('Quedó 1 código de prueba canjeado: límpialo con supabase/sql/limpiar_pruebas.sql antes del lanzamiento.\n');
process.exit(fallos === 0 ? 0 : 1);
