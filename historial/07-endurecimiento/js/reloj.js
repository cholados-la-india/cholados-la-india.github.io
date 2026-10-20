// reloj.js — La hora del SERVIDOR. Todo lo que dependa de la fecha (cuenta regresiva de un código, "vence el...")
// usa esta hora y no la del celular, porque el reloj de un celular puede estar mal puesto (o adelantado a propósito).
// Cada respuesta del servidor trae `ahoraISO`; aquí se guarda la diferencia con el reloj del dispositivo.
let desfaseMs = 0; // hora del servidor − hora del dispositivo

export const reloj = {
  ajustar(isoServidor) {
    const t = Date.parse(isoServidor);
    if (!Number.isNaN(t)) desfaseMs = t - Date.now();
  },
  /** Milisegundos desde 1970, según el servidor. */
  ahora() {
    return Date.now() + desfaseMs;
  },
};
