// vista-resumen.js — Pestaña "Resumen": cuántos premios quedan, cuánto se jugó, cuántos ganaron, reclamaron y canjearon.
import { el, reemplazar } from '../js/panel/dom.js';
import { fechaCorta } from '../js/panel/formato.js';

const MOTIVOS = {
  'sin-premios': 'Se acabaron los premios de la semana.',
  'campana-inactiva': 'La campaña está fuera de sus fechas.',
  'sin-intentos': 'Sin intentos.',
};

export function vistaResumen(ctx) {
  const contenedor = el('div', { class: 'vista' });

  const dato = (numero, etiqueta, { sub, clase, total } = {}) =>
    el('div', { class: 'dato' + (clase ? ' ' + clase : '') },
      el('div', { class: 'numero' }, String(numero), total != null && el('small', {}, ` / ${total}`)),
      el('div', { class: 'etiqueta' }, etiqueta),
      sub && el('div', { class: 'etiqueta' }, sub));

  function embudo(r) {
    const base = Math.max(1, r.partidas.total);
    const pasos = [
      ['Partidas jugadas', r.partidas.total],
      ['Llegaron a la meta (validadas)', r.partidas.ganadores],
      ['Reclamaron su código', r.codigos.total],
      ['Ya lo canjearon en caja', r.codigos.canjeados],
    ];
    return el('div', { class: 'embudo' },
      pasos.map(([nombre, n]) => {
        const pct = (n / base) * 100;
        const barra = el('i', {});
        barra.style.width = `${Math.min(100, pct)}%`;
        return el('div', { class: 'paso' },
          el('span', {}, nombre),
          el('b', {}, `${n.toLocaleString('es-CO')}${nombre.startsWith('Partidas') ? '' : ` · ${pct < 10 ? pct.toFixed(1) : Math.round(pct)} %`}`),
          el('div', { class: 'barra' }, barra));
      }));
  }

  function tablaDias(r) {
    return el('div', { class: 'tabla-scroll' },
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {}, ['Día', 'Partidas', 'Llegaron', 'Códigos', 'Canjes'].map((t, i) => el('th', { class: i ? 'num' : '' }, t)))),
        el('tbody', {}, r.dias.map((d) => {
          const [a, m, dia] = d.dia.split('-');
          return el('tr', {}, el('td', {}, `${dia}/${m}/${a}`), el('td', { class: 'num' }, d.partidas), el('td', { class: 'num' }, d.ganadores), el('td', { class: 'num' }, d.codigos), el('td', { class: 'num' }, d.canjes));
        }))));
  }

  function pintar(r) {
    reemplazar(
      contenedor,
      el('div', { class: 'estadisticas' },
        dato(r.premiosSemanaRestantes ?? r.premiosRestantes, 'Premios que quedan esta semana', { total: r.premiosPorSemana, clase: 'destacado', sub: `Se reinicia el lunes 00:00` }),
        r.cupoDiario > 0 && dato(r.premiosHoyRestantes ?? 0, 'Premios que quedan HOY', { total: r.cupoDiario, clase: r.premiosHoyRestantes === 0 ? 'cerrado' : '', sub: 'Cupo diario activo; se renueva a las 12:00 a. m.' }),
        dato(r.jugable ? 'Abierto' : 'Cerrado', 'Estado del juego', { clase: r.jugable ? '' : 'cerrado', sub: r.jugable ? 'La gente puede jugar por premio' : MOTIVOS[r.motivo] ?? r.motivo }),
        dato(r.partidas.semana, 'Partidas esta semana', { sub: `${r.partidas.total.toLocaleString('es-CO')} en total` }),
        dato(r.partidas.ganadoresSemana, 'Llegaron a la meta esta semana', { sub: `${r.partidas.ganadores.toLocaleString('es-CO')} en total` }),
        dato(r.codigos.semana, 'Códigos expedidos esta semana', { sub: `${r.codigos.total.toLocaleString('es-CO')} en total` }),
        dato(r.codigos.canjesSemana, 'Canjes en caja esta semana', { sub: `${r.codigos.canjeados.toLocaleString('es-CO')} en total` }),
        dato(r.codigos.activos, 'Códigos activos ahora', { sub: 'vigentes y sin canjear' }),
        dato(r.codigos.vencidos, 'Códigos vencidos sin canjear', { sub: 'no se reciclan' })),
      el('div', { class: 'tarjeta' }, el('h2', {}, 'Del juego a la caja'), embudo(r),
        r.partidas.rechazadas > 0 && el('p', { class: 'nota' }, `Victorias que el servidor rechazó: ${r.partidas.rechazadas} (llegaron muy rápido o con pocas frutas; puede ser trampa o un juego muy fácil).`),
        r.partidas.sinCupo > 0 && el('p', { class: 'nota' }, `Llegaron a la meta pero ya no había premios: ${r.partidas.sinCupo}.`)),
      el('div', { class: 'tarjeta' }, el('h2', {}, 'Últimos 14 días'), tablaDias(r),
        el('p', { class: 'nota' }, `Datos al ${fechaCorta(r.ahoraISO)} (los días van en hora de Bogotá).`)),
      el('button', { type: 'button', class: 'boton secundario', onclick: () => ctx.cargar(contenedor, cargar) }, 'Actualizar'),
    );
  }

  async function cargar() {
    pintar(await ctx.llamar('admin_resumen'));
  }

  return { elemento: contenedor, mostrar: () => ctx.cargar(contenedor, cargar) };
}
