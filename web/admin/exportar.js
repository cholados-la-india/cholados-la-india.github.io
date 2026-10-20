// exportar.js — Descarga los códigos como CSV (se abre en Excel o Google Sheets). Lo usan la pestaña Códigos y la de Cuenta.
import { aCsv, descargar, fechaSql, ESTADOS } from '../js/panel/formato.js';

const COLUMNAS = [
  { titulo: 'Código', valor: (f) => f.codigo },
  { titulo: 'Nombre', valor: (f) => f.nombre },
  { titulo: 'Celular', valor: (f) => f.celular },
  { titulo: 'Estado', valor: (f) => ESTADOS[f.estado] ?? f.estado },
  { titulo: 'Expedido (hora de Bogotá)', valor: (f) => fechaSql(f.emitidoISO) },
  { titulo: 'Vale hasta (hora de Bogotá)', valor: (f) => fechaSql(new Date(Date.parse(f.venceISO) - 60_000).toISOString()) },
  { titulo: 'Canjeado (hora de Bogotá)', valor: (f) => fechaSql(f.canjeadoISO) },
  { titulo: 'Canjeado por', valor: (f) => (f.canjeadoPor === 'staff' ? 'Caja' : f.canjeadoPor === 'admin' ? 'Administrador' : '') },
  { titulo: 'Regalo entregado', valor: (f) => f.regalo ?? '' },
];

/** Pide al servidor las filas (con el mismo filtro y búsqueda de la pantalla) y descarga el archivo. Devuelve cuántas filas bajó. */
export async function exportarCsv(llamar, { estado = 'todos', buscar = '' } = {}) {
  const r = await llamar('admin_exportar', { p_estado: estado, p_buscar: buscar || null });
  if (!r.ok) throw new Error('El servidor no permitió exportar.');
  const hoy = fechaSql(new Date().toISOString()).slice(0, 10);
  descargar(`codigos-cholados-la-india-${hoy}.csv`, aCsv(COLUMNAS, r.filas));
  return { bajadas: r.filas.length, total: r.total };
}
