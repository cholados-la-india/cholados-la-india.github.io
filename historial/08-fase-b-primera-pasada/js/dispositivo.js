// dispositivo.js — El "id anónimo del dispositivo": un número al azar que el navegador se inventa la primera vez
// y guarda. No identifica a nadie (no es el celular ni el nombre); solo sirve para contar los intentos de la semana
// y para "Ver mi código". Si la persona borra los datos del navegador, o juega desde otro navegador (por ejemplo el
// de Instagram frente a Safari), tendrá otro id: es el nivel de antifraude bajo que se aceptó.
import { almacen } from './util.js';

const CLAVE = 'cholado-device-id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let enMemoria = null; // por si el navegador no deja guardar (modo privado): vale mientras no se recargue la página

function nuevoUuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function idDispositivo() {
  const guardado = almacen.leer(CLAVE);
  if (typeof guardado === 'string' && UUID.test(guardado)) return guardado;
  enMemoria = enMemoria ?? nuevoUuid();
  almacen.escribir(CLAVE, enMemoria);
  return enMemoria;
}
