// util.js — Fechas en hora de Bogotá (UTC−5, sin horario de verano) y utilidades pequeñas.
// Nota: en producción las fechas las decide el reloj del SERVIDOR; aquí solo se formatean.

const BOGOTA_MS = -5 * 3600e3;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Devuelve un Date cuyos getters UTC dan la hora de pared en Bogotá. */
export const enBogota = (ms) => new Date(ms + BOGOTA_MS);

/** Lunes 00:00 (hora de Bogotá) de la semana que contiene `ms`, como milisegundos UTC. */
export function inicioSemanaBogota(ms) {
  const b = enBogota(ms);
  const dow = (b.getUTCDay() + 6) % 7; // lunes = 0
  const lunes = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() - dow);
  return lunes - BOGOTA_MS;
}

/** Hora en formato "2:51 p. m." */
export function horaBogota(ms) {
  const b = enBogota(ms);
  const h = b.getUTCHours();
  const m = String(b.getUTCMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** "martes 27 de octubre, 2:50 p. m." */
export function fechaHoraBogota(ms) {
  const b = enBogota(ms);
  return `${DIAS[b.getUTCDay()]} ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]}, ${horaBogota(ms)}`;
}

/** "lunes 26 de octubre a las 12:00 a. m." */
export function fechaCortaBogota(ms) {
  const b = enBogota(ms);
  return `${DIAS[b.getUTCDay()]} ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]} a las ${horaBogota(ms)}`;
}

/** Lee/escribe localStorage sin romper si está bloqueado (modo privado, navegadores internos de apps). */
export const almacen = {
  leer(clave, porDefecto = null) {
    try {
      const v = localStorage.getItem(clave);
      return v === null ? porDefecto : JSON.parse(v);
    } catch {
      return porDefecto;
    }
  },
  escribir(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  },
  borrar(clave) {
    try {
      localStorage.removeItem(clave);
    } catch {
      /* nada */
    }
  },
};

/** Mezcla profunda: pone en `destino` lo que diga `origen` sin borrar lo demás (para aplicar la dificultad del servidor). */
export function fusionar(destino, origen) {
  for (const [k, v] of Object.entries(origen ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && destino[k] && typeof destino[k] === 'object') fusionar(destino[k], v);
    else destino[k] = v;
  }
  return destino;
}

/** "6 d 23 h 41 min" · "5 h 12 min 09 s" · "12 min 09 s" · "Venció". */
export function formatoRestante(ms) {
  if (ms <= 0) return 'Venció';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = String(s % 60).padStart(2, '0');
  if (d > 0) return `${d} d ${h} h ${m} min`;
  if (h > 0) return `${h} h ${m} min ${seg} s`;
  return `${m} min ${seg} s`;
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
export const aleatorioEntre = (a, b) => a + Math.random() * (b - a);
