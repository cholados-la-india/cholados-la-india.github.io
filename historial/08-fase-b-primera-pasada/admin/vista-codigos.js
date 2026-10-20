// vista-codigos.js — Pestaña "Códigos": lista con filtros por estado, buscador (código, nombre o celular), canjear,
// desactivar/reactivar a mano y exportar a CSV. Nombres y celulares los escriben los jugadores: aquí solo entran como texto.
import { el, reemplazar, retrasar } from '../js/panel/dom.js';
import { ESTADOS, celular, fechaCorta } from '../js/panel/formato.js';
import { exportarCsv } from './exportar.js';

const FILTROS = [['todos', 'Todos'], ['activo', 'Activos'], ['canjeado', 'Canjeados'], ['vencido', 'Vencidos'], ['desactivado', 'Desactivados']];
const POR_PAGINA = 50;

export function vistaCodigos(ctx) {
  let estado = 'todos';
  let texto = '';
  let filas = [];
  let total = 0;
  let pedido = 0; // para ignorar respuestas viejas si se escribe rápido

  const buscador = el('input', { type: 'search', placeholder: 'Buscar por código, nombre o celular', 'aria-label': 'Buscar códigos', autocomplete: 'off' });
  const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por estado' },
    FILTROS.map(([clave, nombre]) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(clave === estado), dataset: { clave }, onclick: () => cambiarFiltro(clave) }, nombre)));
  const botonCsv = el('button', { type: 'button', class: 'boton secundario', onclick: exportar }, 'Exportar CSV');
  const cuenta = el('p', { class: 'nota', 'aria-live': 'polite' });
  const lista = el('div', { class: 'lista' });
  const masBoton = el('button', { type: 'button', class: 'boton secundario', onclick: () => cargarPagina(true) }, 'Mostrar más');

  buscador.addEventListener('input', retrasar(() => {
    texto = buscador.value.trim();
    cargarPagina(false);
  }, 350));

  const elemento = el('div', { class: 'vista' },
    el('div', { class: 'tarjeta herramientas' }, buscador, chips, el('div', { class: 'fila-botones' }, botonCsv)),
    cuenta, lista, masBoton);

  function cambiarFiltro(clave) {
    estado = clave;
    for (const c of chips.children) c.setAttribute('aria-pressed', String(c.dataset.clave === clave));
    cargarPagina(false);
  }

  function filaCodigo(f) {
    const botones = [];
    if (f.estado === 'activo') {
      botones.push(el('button', { type: 'button', class: 'boton chico', onclick: () => ctx.irA('canje', f.codigo) }, 'Canjear'));
      botones.push(el('button', { type: 'button', class: 'boton peligro chico', onclick: () => cambiarEstado(f, 'desactivado') }, 'Desactivar'));
    } else if (f.estado === 'desactivado') {
      botones.push(el('button', { type: 'button', class: 'boton secundario chico', onclick: () => cambiarEstado(f, 'activo') }, 'Reactivar'));
    }
    const fechas = [`Expedido ${fechaCorta(f.emitidoISO)}`, `vale hasta ${fechaCorta(new Date(Date.parse(f.venceISO) - 60_000).toISOString())}`];
    if (f.canjeadoISO) fechas.push(`canjeado ${fechaCorta(f.canjeadoISO)} (${f.canjeadoPor === 'admin' ? 'administrador' : 'caja'})${f.regalo ? ` · ${f.regalo}` : ''}`);
    return el('article', { class: 'fila-codigo' },
      el('div', { class: 'arriba' }, el('span', { class: 'cod' }, f.codigo), el('span', { class: `pildora ${f.estado}` }, ESTADOS[f.estado] ?? f.estado)),
      el('div', {}, el('div', { class: 'persona' }, `${f.nombre} · ${celular(f.celular)}`), el('div', { class: 'fechas' }, fechas.join(' · '))),
      el('div', { class: 'fila-botones botones' }, botones));
  }

  function pintarLista() {
    reemplazar(lista, filas.length ? filas.map(filaCodigo) : el('p', { class: 'vacio' }, texto || estado !== 'todos' ? 'No hay códigos con ese filtro.' : 'Todavía no se ha expedido ningún código.'));
    cuenta.textContent = total ? `Mostrando ${filas.length} de ${total.toLocaleString('es-CO')} código${total === 1 ? '' : 's'}.` : '';
    masBoton.hidden = filas.length >= total;
  }

  async function cargarPagina(siguiente) {
    const mio = ++pedido;
    const desde = siguiente ? filas.length : 0;
    try {
      const r = await ctx.llamar('admin_codigos', { p_estado: estado, p_buscar: texto || null, p_desde: desde, p_limite: POR_PAGINA });
      if (mio !== pedido) return;
      filas = siguiente ? filas.concat(r.filas) : r.filas;
      total = r.total;
      pintarLista();
    } catch (e) {
      if (mio === pedido) ctx.errorDeCarga(e);
    }
  }

  async function cambiarEstado(f, nuevo) {
    const pregunta = nuevo === 'desactivado'
      ? `¿Desactivar el código ${f.codigo} de ${f.nombre}?\n\nLa persona ya no podrá canjearlo. Puedes reactivarlo después.`
      : `¿Reactivar el código ${f.codigo}?`;
    if (!window.confirm(pregunta)) return;
    try {
      const r = await ctx.llamar('admin_estado_codigo', { p_codigo: f.codigo, p_estado: nuevo });
      if (!r.ok) {
        ctx.aviso(r.motivo === 'canjeado' ? 'Ese código ya fue canjeado: no se puede cambiar.' : 'No se pudo cambiar el código.', 'error');
      } else {
        ctx.aviso(nuevo === 'desactivado' ? `Código ${f.codigo} desactivado.` : `Código ${f.codigo} reactivado.`);
      }
      await cargarPagina(false);
    } catch (e) {
      ctx.errorDeCarga(e);
    }
  }

  async function exportar() {
    botonCsv.disabled = true;
    try {
      const { bajadas, total: todos } = await exportarCsv(ctx.llamar, { estado, buscar: texto });
      ctx.aviso(`Se descargaron ${bajadas.toLocaleString('es-CO')} códigos${bajadas < todos ? ` de ${todos.toLocaleString('es-CO')} (el archivo tiene un tope de 20.000)` : ''}. Tiene nombres y celulares: guárdalo con cuidado.`);
    } catch (e) {
      ctx.errorDeCarga(e);
    } finally {
      botonCsv.disabled = false;
    }
  }

  return { elemento, mostrar: () => cargarPagina(false) };
}
