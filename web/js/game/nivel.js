// nivel.js — Ritmo del juego y generación del recorrido (obstáculos y frutas).
// Puro: no usa Three.js ni el DOM, así se puede probar en Node y simular con un bot.
//
// Idea clave: el juego va por TIEMPO. La partida dura `partida.duracionS` y la meta aparece al final; los
// obstáculos se generan por delante en "filas", separadas por un tiempo (en segundos) que se acorta durante la
// partida. Todo se lee de la config en cada paso, así los deslizadores de ?debug=1 cambian el juego en vivo.

/** Velocidad del mundo (unidades/s) en el segundo t. Sube linealmente de `inicial` a `final`. */
export function velocidadEn(cfg, t) {
  const T = cfg.partida.duracionS;
  const k = Math.min(1, Math.max(0, t / T));
  return (cfg.velocidad.inicial + (cfg.velocidad.final - cfg.velocidad.inicial) * k) * cfg.velocidad.multiplicador;
}

/** Distancia recorrida entre los segundos t0 y t1 (la velocidad es lineal, así que es exacta). */
export function distanciaEntre(cfg, t0, t1) {
  const T = cfg.partida.duracionS;
  const a = Math.min(t0, T);
  const b = Math.min(t1, T);
  let d = ((velocidadEn(cfg, a) + velocidadEn(cfg, b)) / 2) * Math.max(0, b - a);
  if (t1 > T) d += velocidadEn(cfg, T) * (t1 - Math.max(t0, T));
  return d;
}

/** Cuántos segundos tardará en recorrerse `dist` unidades a partir del segundo t. */
export function tiempoParaDistancia(cfg, t, dist) {
  const T = cfg.partida.duracionS;
  const v0 = velocidadEn(cfg, t);
  const a = t < T ? ((cfg.velocidad.final - cfg.velocidad.inicial) * cfg.velocidad.multiplicador) / T : 0;
  if (a > 1e-9) return (-v0 + Math.sqrt(v0 * v0 + 2 * a * dist)) / a;
  return dist / Math.max(0.1, v0);
}

const lerp = (a, b, k) => a + (b - a) * k;

/**
 * Crea el generador del recorrido. Se llama `g.generar(p)` en cada paso: crea filas de obstáculos y hileras de
 * frutas hasta `horizonte` unidades por delante del jugador.
 *
 * Garantía de justicia: cada fila deja SIEMPRE una salida (un carril libre al alcance del carril anterior, o una
 * barra baja que se salta). Nunca hay combinaciones imposibles.
 */
export function crearGenerador(cfg, rng) {
  const g = { dObst: null, dFruta: null, libres: [0, 1, 2], ultimaSepS: 2, id: 0, finObst: false, finFruta: false };

  const tiposActivos = () => Object.entries(cfg.obstaculos.tipos).filter(([, v]) => v.peso > 0);
  function elegirPeso(lista) {
    const total = lista.reduce((s, [, v]) => s + v.peso, 0);
    let r = rng() * total;
    for (const e of lista) {
      r -= e[1].peso;
      if (r <= 0) return e[0];
    }
    return lista[lista.length - 1][0];
  }
  const nuevo = (tipo, carril, d) => {
    const s = cfg.obstaculos.tipos[tipo];
    return { id: ++g.id, tipo, carril, d, ancho: s.ancho, alto: s.alto, fondo: s.fondo, golpeado: false };
  };

  /** Arma los obstáculos de una fila (sin colocarlos aún en la lista). */
  function armarFila(d) {
    const activos = tiposActivos();
    const unitarios = activos.filter(([k]) => k === 'cajaBaja' || k === 'pilaAlta');
    // "doble" solo tiene sentido si hay con qué armarlo
    const candidatos = activos.filter(([k]) => k !== 'doble' || unitarios.length > 0);
    if (!candidatos.length) return [];
    const tipo = elegirPeso(candidatos);
    if (tipo === 'barraBaja') return [nuevo('barraBaja', -1, d)];
    if (tipo === 'doble') {
      const libre = Math.floor(rng() * 3);
      return [0, 1, 2].filter((c) => c !== libre).map((c) => nuevo(elegirPeso(unitarios), c, d));
    }
    return [nuevo(tipo, Math.floor(rng() * 3), d)];
  }

  function filaValida(fila) {
    if (fila.some((o) => o.carril === -1)) return true; // una barra baja se salta: no cambia por dónde se puede pasar
    const nuevosLibres = [0, 1, 2].filter((c) => !fila.some((o) => o.carril === c));
    const radio = Math.max(1, Math.floor(g.ultimaSepS / cfg.obstaculos.segundosPorCarril));
    return g.libres.some((a) => nuevosLibres.some((b) => Math.abs(a - b) <= radio));
  }

  function generarObstaculos(p) {
    const o = cfg.obstaculos;
    const T = cfg.partida.duracionS;
    if (g.dObst === null) g.dObst = distanciaEntre(cfg, 0, o.primerObstaculoS);
    while (!g.finObst && g.dObst < p.D + o.horizonte) {
      const tAt = p.t + tiempoParaDistancia(cfg, p.t, Math.max(0, g.dObst - p.D));
      if (tAt > T - o.sinObstaculosAlFinalS) {
        g.finObst = true;
        break;
      }
      let fila = armarFila(g.dObst);
      for (let i = 0; i < 8 && !filaValida(fila); i++) fila = armarFila(g.dObst);
      if (!filaValida(fila)) {
        const lejos = [0, 1, 2].filter((c) => c !== g.libres[0]);
        fila = [nuevo('cajaBaja', lejos[Math.floor(rng() * lejos.length)], g.dObst)];
      }
      for (const ob of fila) p.obstaculos.push(ob);
      if (!fila.some((x) => x.carril === -1)) g.libres = [0, 1, 2].filter((c) => !fila.some((x) => x.carril === c));
      const k = Math.min(1, tAt / T);
      let sep = lerp(o.separacionInicialS, o.separacionFinalS, k) * (1 + o.variacion * (rng() * 2 - 1));
      sep = Math.max(o.separacionMinimaS, sep);
      g.ultimaSepS = sep;
      g.dObst += sep * velocidadEn(cfg, tAt);
    }
  }

  function generarFrutas(p) {
    const f = cfg.frutas;
    const T = cfg.partida.duracionS;
    if (f.cadaS <= 0 || g.finFruta) return;
    if (g.dFruta === null) g.dFruta = distanciaEntre(cfg, 0, 1.8);
    // solo donde ya se decidieron los obstáculos (así las frutas nunca quedan dentro de una caja)
    const limite = g.finObst ? p.D + cfg.obstaculos.horizonte : (g.dObst ?? 0) - 1.7;
    while (g.dFruta < limite && g.dFruta < p.D + cfg.obstaculos.horizonte) {
      const tAt = p.t + tiempoParaDistancia(cfg, p.t, Math.max(0, g.dFruta - p.D));
      if (tAt > T - 1.2) {
        g.finFruta = true;
        break;
      }
      const largo = f.largoMin + Math.floor(rng() * (f.largoMax - f.largoMin + 1));
      const carril = Math.floor(rng() * 3);
      const tipos = f.tipos ?? ['fresa', 'mango'];
      const tipo = tipos[Math.min(tipos.length - 1, Math.floor(rng() * tipos.length))];
      const d0 = g.dFruta;
      for (let i = 0; i < largo; i++) {
        const d = d0 + i * f.separacion;
        if (d > limite) break;
        const ob = p.obstaculos.find((o) => (o.carril === carril || o.carril === -1) && Math.abs(o.d - d) < o.fondo / 2 + 0.9);
        let y = 0.95;
        if (ob) {
          if (ob.alto <= 0.9 && f.sobreCajasBajas) y = 1.75;
          else continue;
        }
        p.frutasLista.push({ tipo, carril, d, y, recogida: false });
        p.frutasGeneradas += 1;
      }
      g.dFruta = d0 + largo * f.separacion + f.cadaS * velocidadEn(cfg, tAt) * (0.7 + 0.6 * rng());
    }
  }

  g.generar = (p) => {
    generarObstaculos(p);
    generarFrutas(p);
  };
  return g;
}
