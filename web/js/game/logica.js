// logica.js — Reglas y física del juego. Puro: sin Three.js ni DOM (se puede probar en Node y con el bot).
//
// El estado de una partida (`p`) lo crea `crearPartida`. En cada cuadro se llama `paso(p, dt)`; las órdenes del
// jugador entran con `moverCarril(p, ±1)` y `saltar(p)`. Lo que ocurre (choques, frutas, meta...) queda en
// `p.eventos` para que la escena y la interfaz reaccionen.
//
// Estados: 'cuenta' → 'jugando' → 'gano' | 'perdio'.   Carriles: 0 (izquierda), 1 (centro), 2 (derecha).
import { crearGenerador, distanciaEntre, velocidadEn } from './nivel.js';

/** Generador pseudoaleatorio con semilla (mulberry32): misma semilla = mismo recorrido. */
export function crearRNG(semilla) {
  let a = (semilla >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function crearPartida(cfg, { semilla = Date.now(), sinCuenta = false, invencible = false } = {}) {
  const p = {
    cfg,
    estado: sinCuenta ? 'jugando' : 'cuenta',
    tCuenta: cfg.partida.cuentaAtrasS,
    t: 0, // segundos jugados
    D: 0, // distancia recorrida
    vel: velocidadEn(cfg, 0),
    dMeta: distanciaEntre(cfg, 0, cfg.partida.duracionS), // distancia a la que está la meta (se recalcula en vivo)
    carrilObjetivo: 1,
    x: 0,
    y: 0, // altura de los pies sobre el piso
    vy: 0,
    enAire: false,
    saltoPendienteHasta: -1,
    vidas: cfg.partida.vidas,
    invulHasta: -1,
    invencible,
    mitadHecha: false, // ya se avisó que va por la mitad del camino
    frutas: 0, // frutas recogidas
    frutasGeneradas: 0, // frutas que han salido en el camino (para saber cuántas había disponibles)
    choques: 0,
    motivoFin: null, // si perdió: 'vidas' (se quedó sin vidas) o 'frutas' (llegó a la meta sin las frutas mínimas)
    tFin: 0, // segundos desde que terminó (ganó o perdió)
    obstaculos: [],
    frutasLista: [],
    eventos: [],
    semilla,
  };
  p.gen = crearGenerador(cfg, crearRNG(semilla));
  return p;
}

/** Avanza la partida `dt` segundos. */
export function paso(p, dt) {
  const cfg = p.cfg;
  p.eventos.length = 0;

  if (p.estado === 'cuenta') {
    const antes = Math.ceil(p.tCuenta);
    p.tCuenta -= dt;
    if (p.tCuenta <= 0) {
      p.estado = 'jugando';
      p.eventos.push({ tipo: 'ya' });
    } else if (Math.ceil(p.tCuenta) !== antes) {
      p.eventos.push({ tipo: 'cuenta', n: Math.ceil(p.tCuenta) });
    }
    return;
  }
  if (p.estado === 'gano' || p.estado === 'perdio') {
    terminando(p, dt);
    return;
  }

  const T = cfg.partida.duracionS;
  p.vel = velocidadEn(cfg, p.t);
  p.t += dt;
  p.D += p.vel * dt;
  if (!p.mitadHecha && p.t >= T * 0.5) {
    p.mitadHecha = true;
    p.eventos.push({ tipo: 'mitad' }); // la mitad del camino (suena un aliento de la gente)
  }

  // Movimiento lateral (a velocidad constante hacia el carril elegido)
  const objX = (p.carrilObjetivo - 1) * cfg.carriles.ancho;
  const paso = (cfg.carriles.ancho / cfg.carriles.cambioS) * dt;
  p.x = Math.abs(objX - p.x) <= paso ? objX : p.x + Math.sign(objX - p.x) * paso;

  // Salto (gravedad calculada para que alcance `alto` en `duracionS`)
  if (p.enAire) {
    const g = (8 * cfg.salto.alto) / (cfg.salto.duracionS * cfg.salto.duracionS);
    p.vy -= g * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.enAire = false;
      p.eventos.push({ tipo: 'aterrizo' });
      if (p.t <= p.saltoPendienteHasta) saltar(p);
    }
  }

  p.gen.generar(p);
  colisiones(p);
  recogerFrutas(p);
  while (p.obstaculos.length && p.obstaculos[0].d < p.D - 8) p.obstaculos.shift();
  while (p.frutasLista.length && p.frutasLista[0].d < p.D - 8) p.frutasLista.shift();

  if (p.estado === 'jugando') {
    if (p.t >= T) {
      // Llegar a la meta NO basta: también hay que haber recogido las frutas mínimas.
      p.tFin = 0;
      p.dMeta = p.D;
      if (p.frutas >= (cfg.partida.frutasMinimas ?? 0)) {
        p.estado = 'gano';
        p.eventos.push({ tipo: 'meta' });
      } else {
        p.estado = 'perdio';
        p.motivoFin = 'frutas';
        p.eventos.push({ tipo: 'perdio' });
      }
    } else {
      p.dMeta = p.D + distanciaEntre(cfg, p.t, T);
    }
  }
}

/** Tras ganar o perder el mundo frena poco a poco (el jugador sigue un momento para festejar o caer). */
function terminando(p, dt) {
  const cfg = p.cfg;
  p.tFin += dt;
  const llegoALaMeta = p.estado === 'gano' || p.motivoFin === 'frutas'; // sigue un momento y pasa bajo el arco
  const duracion = llegoALaMeta ? cfg.partida.celebracionS * 0.75 : 0.5;
  const k = Math.max(0, 1 - p.tFin / duracion);
  p.vel = velocidadEn(cfg, Math.min(p.t, cfg.partida.duracionS)) * k * (llegoALaMeta ? 0.7 : 1);
  p.D += p.vel * dt;
  p.x += (((p.carrilObjetivo - 1) * cfg.carriles.ancho) - p.x) * Math.min(1, dt * 12);
}

function colisiones(p) {
  const cfg = p.cfg;
  const tol = cfg.partida.toleranciaColision;
  const rx = cfg.jugador.radioX * (1 - tol);
  const rz = cfg.jugador.radioFondo * (1 - tol);
  const protegido = p.invencible || p.t < p.invulHasta;
  for (const o of p.obstaculos) {
    if (o.golpeado) continue;
    if (o.d > p.D + 3) break; // están ordenados por distancia
    if (o.d > p.dMeta - 0.5) continue; // por si la meta se movió en vivo
    if (Math.abs(o.d - p.D) > (o.fondo / 2) * (1 - tol) + rz) continue;
    const ox = o.carril < 0 ? 0 : (o.carril - 1) * cfg.carriles.ancho;
    if (Math.abs(p.x - ox) > (o.ancho / 2) * (1 - tol) + rx) continue;
    if (p.y >= o.alto * (1 - tol)) continue; // lo está saltando
    if (protegido) continue;
    o.golpeado = true;
    p.vidas -= 1;
    p.choques += 1;
    p.invulHasta = p.t + cfg.partida.invulnerabilidadS;
    p.eventos.push({ tipo: 'choque', obstaculo: o });
    if (p.vidas <= 0) {
      p.estado = 'perdio';
      p.motivoFin = 'vidas';
      p.tFin = 0;
      p.eventos.push({ tipo: 'perdio' });
      return;
    }
  }
}

function recogerFrutas(p) {
  const ancho = p.cfg.carriles.ancho;
  for (const f of p.frutasLista) {
    if (f.recogida) continue;
    if (f.d > p.D + 1) break;
    if (Math.abs(f.d - p.D) > 0.7) continue;
    if (Math.abs(p.x - (f.carril - 1) * ancho) > 0.62) continue;
    if (Math.abs(f.y - (p.y + 0.75)) > 0.8) continue;
    f.recogida = true;
    p.frutas += 1;
    p.eventos.push({ tipo: 'fruta', fruta: f });
    const minimo = p.cfg.partida.frutasMinimas ?? 0;
    if (minimo > 0 && p.frutas === minimo) p.eventos.push({ tipo: 'minimo' }); // ya tiene las frutas para ganar: aplausos
  }
}

/** Cambia de carril: dir = -1 (izquierda) o +1 (derecha). */
export function moverCarril(p, dir) {
  if (p.estado !== 'jugando') return;
  const n = Math.max(0, Math.min(2, p.carrilObjetivo + dir));
  if (n !== p.carrilObjetivo) {
    p.carrilObjetivo = n;
    p.eventos.push({ tipo: 'carril', dir });
  }
}

/** Salta. Si ya está en el aire, guarda la orden unos instantes (buffer) para saltar al aterrizar. */
export function saltar(p) {
  if (p.estado !== 'jugando') return;
  if (p.enAire) {
    p.saltoPendienteHasta = p.t + p.cfg.salto.bufferS;
    return;
  }
  p.enAire = true;
  p.vy = (4 * p.cfg.salto.alto) / p.cfg.salto.duracionS;
  p.saltoPendienteHasta = -1;
  p.eventos.push({ tipo: 'salto' });
}

export const progreso = (p) => Math.min(1, p.t / p.cfg.partida.duracionS);
export const tiempoRestante = (p) => Math.max(0, p.cfg.partida.duracionS - p.t);
