// formato.js — Cómo se escriben las fechas, el dinero y el CSV en la caja y el panel. Todo en hora de Bogotá.
import { enBogota, fechaHoraBogota, horaBogota } from '../util.js';

const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const ms = (iso) => (iso ? Date.parse(iso) : null);

/** "$30.000" */
export const pesos = (n) => '$' + Number(n ?? 0).toLocaleString('es-CO');

/** "martes 27 de octubre, 2:50 p. m." */
export const fechaLarga = (iso) => fechaHoraBogota(Date.parse(iso));

/** Hasta cuándo sirve un código: un minuto antes del vencimiento exacto (igual que en el ticket del juego). */
export const valeHasta = (venceISO) => fechaHoraBogota(Date.parse(venceISO) - 60_000);

/** "27 oct, 2:50 p. m." */
export function fechaCorta(iso) {
  const t = Date.parse(iso);
  const b = enBogota(t);
  return `${b.getUTCDate()} ${MES3[b.getUTCMonth()]}, ${horaBogota(t)}`;
}

/** "2026-10-27 14:50" (para el CSV y las tablas; hora de Bogotá) */
export function fechaSql(iso, conSegundos = false) {
  if (!iso) return '';
  const s = enBogota(Date.parse(iso)).toISOString().slice(0, conSegundos ? 19 : 16);
  return s.replace('T', ' ');
}

/** Hora de pared de Bogotá para un <input type="datetime-local">: "2026-10-26T00:00" */
export const aInputFecha = (iso) => (iso ? enBogota(Date.parse(iso)).toISOString().slice(0, 16) : '');
/** Lo contrario: lo que escribió quien edita (hora de Bogotá) → ISO en UTC. Vacío → null. */
export function deInputFecha(valor) {
  if (!valor) return null;
  const t = Date.parse(`${valor}:00-05:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** "312 345 6789" */
export const celular = (c) => String(c ?? '').replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');

/** "5 min" / "1 h 20 min" */
export function duracion(segundos) {
  const m = Math.max(1, Math.ceil(segundos / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

export const ESTADOS = {
  activo: 'Activo',
  canjeado: 'Canjeado',
  vencido: 'Vencido',
  desactivado: 'Desactivado',
};

/**
 * Convierte filas en texto CSV listo para Excel: separador coma, saltos CRLF, comillas dobles escapadas.
 * ANTI-INYECCIÓN: si una celda empieza con = + - @ (o tab/enter), Excel podría ejecutarla como fórmula; los nombres los
 * escriben los jugadores, así que se les antepone una comilla simple. (El archivo lleva BOM para que Excel lea bien las tildes.)
 */
export function aCsv(columnas, filas) {
  const celda = (valor) => {
    let t = valor == null ? '' : String(valor);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const lineas = [columnas.map((c) => celda(c.titulo)).join(',')];
  for (const f of filas) lineas.push(columnas.map((c) => celda(c.valor(f))).join(','));
  return '﻿' + lineas.join('\r\n') + '\r\n';
}

/** Descarga un texto como archivo. */
export function descargar(nombre, texto, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
