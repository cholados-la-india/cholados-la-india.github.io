// bot.js — Jugador automático para MEDIR la dificultad sin jugar a mano.
//
// Imita a una persona con tres rasgos:
//  1. VE cada fila de obstáculos a cierta distancia (`visionDist`): cuanto más rápido va el juego, menos tiempo le queda.
//  2. ATIENDE UNA FILA A LA VEZ: decidir le cuesta `reaccionS` segundos y no puede decidir otra fila mientras tanto.
//     Si las filas llegan más seguidas de lo que tarda en reaccionar, se atrasa y choca. (Por eso la separación
//     entre filas y la velocidad sí afectan el resultado.)
//  3. Se EQUIVOCA un poco: a veces se distrae (no ve la fila) y calcula el salto con algo de error (`jitterSaltoS`).
//
// OJO: es una guía para COMPARAR configuraciones, no una verdad. La medición real es jugar con gente
// (estadísticas de ?debug=1) y ajustar. Los perfiles se pueden retocar aquí.
import { crearPartida, crearRNG, moverCarril, paso, saltar } from './logica.js';

export const PERFILES = {
  // (distraccion = probabilidad de no ver una fila a 9 u/s; jitterSaltoS = error al calcular el salto a 9 u/s)
  // (ambicionFrutas = qué tan seguido se mueve a buscar frutas cuando no hay peligro cerca)
  novato: { nombre: 'Novato', reaccionS: 0.62, sigmaS: 0.15, visionDist: 18, jitterSaltoS: 0.15, distraccion: 0.13, prefiereSaltar: 0.5, ambicionFrutas: 0.3 },
  normal: { nombre: 'Normal', reaccionS: 0.46, sigmaS: 0.1, visionDist: 22, jitterSaltoS: 0.1, distraccion: 0.07, prefiereSaltar: 0.5, ambicionFrutas: 0.6 },
  experto: { nombre: 'Experto', reaccionS: 0.3, sigmaS: 0.06, visionDist: 26, jitterSaltoS: 0.05, distraccion: 0.02, prefiereSaltar: 0.5, ambicionFrutas: 0.9 },
};

export function crearBot(perfil, rng) {
  const memoria = new Map(); // fila (por su distancia) → lo que el bot pensó de ella
  let libreDesde = 0; // segundo de la partida en que el bot termina de pensar en la fila anterior
  let ultimaRevisionFrutas = -1; // última vez que miró si convenía cambiar de carril por frutas
  const gauss = (media, sigma) => media + sigma * Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

  return function actuar(p) {
    if (p.estado !== 'jugando') return;
    const cfg = p.cfg;
    const v = Math.max(0.1, p.vel);

    // Filas por delante dentro del alcance de la vista, de la más cercana a la más lejana
    const filas = [];
    for (const o of p.obstaculos) {
      if (o.golpeado || o.d <= p.D - 0.2) continue;
      if (o.d - p.D > perfil.visionDist) break;
      const ultima = filas[filas.length - 1];
      if (ultima && Math.abs(ultima.d - o.d) < 0.01) ultima.obs.push(o);
      else filas.push({ d: o.d, obs: [o] });
    }

    filas.forEach((fila, idx) => {
      const clave = fila.d.toFixed(2);
      let m = memoria.get(clave);
      if (!m) {
        // Las equivocaciones crecen con la velocidad: a 9 u/s valen lo que dice el perfil; más rápido, más errores.
        const escala = Math.pow(v / 9, 1.5);
        m = { decidida: false, accion: null, hecho: false, distraido: rng() < perfil.distraccion * escala };
        m.tSalto = Math.max(0.12, cfg.salto.duracionS / 2 + gauss(0, perfil.jitterSaltoS * escala));
        if (!m.distraido) {
          m.tDecision = Math.max(p.t, libreDesde) + Math.max(0.12, gauss(perfil.reaccionS, perfil.sigmaS));
          libreDesde = m.tDecision;
        }
        memoria.set(clave, m);
      }
      if (m.distraido) return;

      if (!m.decidida && p.t >= m.tDecision) {
        m.decidida = true;
        // Decide según el carril en el que estará al llegar (el objetivo actual)
        const c = p.carrilObjetivo;
        const enMiCarril = fila.obs.find((o) => o.carril === c || o.carril === -1);
        if (!enMiCarril) return;
        if (enMiCarril.carril === -1) {
          m.accion = { tipo: 'saltar' };
        } else {
          const libres = [0, 1, 2].filter((l) => !fila.obs.some((o) => o.carril === l));
          const saltable = enMiCarril.alto < cfg.salto.alto * 0.7;
          if (saltable && (rng() < perfil.prefiereSaltar || !libres.length)) {
            m.accion = { tipo: 'saltar' };
          } else if (libres.length) {
            libres.sort((a, b) => Math.abs(a - c) - Math.abs(b - c));
            m.accion = { tipo: 'carril', objetivo: libres[0] };
          }
        }
      }

      // Ejecuta solo la fila más cercana (las anteriores ya pasaron): una persona no cambia de carril por la
      // fila siguiente mientras todavía está esquivando la actual.
      if (idx === 0 && m.decidida && m.accion && !m.hecho) {
        const tau = (fila.d - p.D) / v;
        if (m.accion.tipo === 'carril') {
          while (p.carrilObjetivo !== m.accion.objetivo) moverCarril(p, Math.sign(m.accion.objetivo - p.carrilObjetivo));
          m.hecho = true;
        } else if (tau <= m.tSalto) {
          saltar(p);
          m.hecho = true;
        }
      }
    });

    // Cuando no hay nada urgente, va a buscar frutas: se mueve (un carril a la vez) hacia el carril libre con más frutas por delante.
    if (perfil.ambicionFrutas > 0 && !p.enAire && p.t - ultimaRevisionFrutas >= 0.4) {
      const primera = filas[0];
      const m0 = primera && memoria.get(primera.d.toFixed(2));
      const urgente = primera && (primera.d - p.D) / v < 0.9;
      const pendiente = m0 && m0.decidida && m0.accion && !m0.hecho;
      if (!urgente && !pendiente) {
        ultimaRevisionFrutas = p.t;
        const cuenta = [0, 0, 0];
        const bloqueado = [false, false, false];
        for (const f of p.frutasLista) {
          const dd = f.d - p.D;
          if (dd < 0) continue;
          if (dd > 14) break;
          if (!f.recogida && f.y < 1.3) cuenta[f.carril]++;
        }
        for (const o of p.obstaculos) {
          const dd = o.d - p.D;
          if (dd < -0.5) continue;
          if (dd > 14) break;
          if (!o.golpeado && o.carril >= 0) bloqueado[o.carril] = true;
        }
        const c = p.carrilObjetivo;
        let mejor = c;
        for (let l = 0; l < 3; l++) if (!bloqueado[l] && cuenta[l] > cuenta[mejor]) mejor = l;
        if (mejor !== c && cuenta[mejor] >= cuenta[c] + 1 && rng() < perfil.ambicionFrutas) {
          const dir = Math.sign(mejor - c);
          if (!bloqueado[c + dir]) moverCarril(p, dir);
        }
      }
    }
  };
}

/**
 * Juega `n` partidas con un perfil y devuelve las estadísticas. `dt` = 1/30 (rápido y suficientemente fino).
 */
export function simular(cfg, perfil, n, { semillaBase = 1, dt = 1 / 30 } = {}) {
  let ganadas = 0;
  let choques = 0;
  let sumaProgresoDerrotas = 0;
  let derrotas = 0;
  let sumaFrutas = 0;
  let sumaGeneradas = 0;
  let porFrutas = 0; // derrotas por llegar a la meta sin las frutas mínimas
  for (let i = 0; i < n; i++) {
    const p = crearPartida(cfg, { semilla: semillaBase + i * 7919, sinCuenta: true });
    const bot = crearBot(perfil, crearRNG(semillaBase * 31 + i * 104729));
    const limite = Math.ceil((cfg.partida.duracionS + 8) / dt);
    for (let k = 0; k < limite && p.estado === 'jugando'; k++) {
      bot(p);
      paso(p, dt);
    }
    if (p.estado === 'gano') ganadas++;
    else {
      derrotas++;
      sumaProgresoDerrotas += Math.min(1, p.t / cfg.partida.duracionS);
    }
    if (p.motivoFin === 'frutas') porFrutas++;
    choques += p.choques;
    sumaFrutas += p.frutas;
    sumaGeneradas += p.frutasGeneradas;
  }
  return {
    partidas: n,
    ganadas,
    tasa: ganadas / n,
    choquesPorPartida: choques / n,
    progresoMedioEnDerrotas: derrotas ? sumaProgresoDerrotas / derrotas : 1,
    frutasPorPartida: sumaFrutas / n,
    frutasGeneradasPorPartida: sumaGeneradas / n,
    derrotasPorFrutas: porFrutas / n, // % de partidas perdidas por llegar sin las frutas mínimas
  };
}
