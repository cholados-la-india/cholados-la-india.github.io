// vista-config.js — Pestaña "Configuración": TODAS las reglas del juego editables sin tocar código ni volver a publicar.
// Lo que guardas se aplica de inmediato en el servidor (tabla app.configuracion); el juego lo lee al abrirse.
// El servidor revisa cada valor (rangos, fechas, regalos) y guarda TODO O NADA: si algo está mal, no cambia nada.
import { CONFIG } from '../js/config.js';
import { el, reemplazar } from '../js/panel/dom.js';
import { aInputFecha, deInputFecha, fechaCorta } from '../js/panel/formato.js';

const MAX_REGALOS = 6;

export function vistaConfig(ctx) {
  const contenedor = el('div', { class: 'vista' });
  let actual = null;
  let campos = null;
  let sucio = false;

  const estadoGuardado = el('span', { class: 'estado' });
  const botonGuardar = el('button', { type: 'button', class: 'boton', onclick: guardar }, 'Guardar cambios');
  const botonDescartar = el('button', { type: 'button', class: 'boton secundario', onclick: () => ctx.cargar(contenedor, cargar) }, 'Descartar cambios');

  function marcar(si = true) {
    sucio = si;
    estadoGuardado.textContent = si ? 'Hay cambios sin guardar.' : `Todo guardado (último cambio: ${fechaCorta(actual.actualizadoISO)}).`;
  }

  // ── piezas del formulario ──
  function numero(clave, etiqueta, ayuda, { min, max, paso = 1 } = {}) {
    const input = el('input', { type: 'number', inputmode: paso < 1 ? 'decimal' : 'numeric', min, max, step: paso, value: actual[clave] });
    campos.numeros[clave] = { input, etiqueta };
    return el('label', { class: 'campo' }, el('span', {}, etiqueta), input, ayuda && el('span', { class: 'ayuda' }, ayuda));
  }

  function dificultad(ruta, etiqueta, ayuda) {
    const [grupo, clave] = ruta.split('.');
    const valor = actual.juego?.[grupo]?.[clave];
    const input = el('input', { type: 'number', step: 'any', inputmode: 'decimal', placeholder: `Fábrica: ${CONFIG[grupo][clave]}`, value: valor ?? '' });
    campos.dificultad[ruta] = { input, etiqueta };
    return el('label', { class: 'campo' }, el('span', {}, etiqueta), input, el('span', { class: 'ayuda' }, ayuda));
  }

  function filaRegalo(texto) {
    const input = el('input', { type: 'text', maxlength: '60', value: texto, 'aria-label': 'Nombre del regalo' });
    const fila = el('div', { class: 'regalo-fila' }, input,
      el('button', { type: 'button', class: 'boton peligro chico', 'aria-label': 'Quitar este regalo', onclick: () => { fila.remove(); actualizarAgregar(); marcar(); } }, 'Quitar'));
    return fila;
  }
  function actualizarAgregar() {
    campos.agregar.hidden = campos.regalos.children.length >= MAX_REGALOS;
  }

  function pintar() {
    campos = { numeros: {}, dificultad: {}, regalos: el('div', { class: 'regalos-lista' }), agregar: null, prefijo: null, inicio: null, fin: null };
    campos.agregar = el('button', { type: 'button', class: 'boton secundario chico', onclick: () => { campos.regalos.append(filaRegalo('')); actualizarAgregar(); marcar(); } }, 'Agregar regalo');
    for (const r of actual.regalos) campos.regalos.append(filaRegalo(r));
    actualizarAgregar();

    campos.prefijo = el('input', { type: 'text', class: 'mayus', maxlength: '12', value: actual.prefijoCodigo, autocomplete: 'off' });
    campos.inicio = el('input', { type: 'datetime-local', value: aInputFecha(actual.campanaInicioISO) });
    campos.fin = el('input', { type: 'datetime-local', value: aInputFecha(actual.campanaFinISO) });

    const seccion = (titulo, nota, ...hijos) =>
      el('section', { class: 'tarjeta config-seccion' }, el('h2', {}, titulo), nota && el('p', { class: 'nota' }, nota), ...hijos);

    reemplazar(
      contenedor,
      el('p', { class: 'nota' }, 'Lo que guardes aquí se aplica en cuanto se guarda: el juego lo lee cada vez que alguien lo abre. Nada de esto toca el código del juego.'),
      seccion('Premios y banco semanal', 'La semana va de lunes 00:00 a domingo 23:59 (hora de Bogotá).',
        el('div', { class: 'rejilla' },
          numero('premiosPorSemana', 'Premios por semana', 'El banco. Cuenta los códigos expedidos y los premios apartados.', { min: 0, max: 10000 }),
          numero('cupoDiario', 'Cupo diario (0 = apagado)', 'Tope de premios por día, para repartirlos en la semana (ej. 7).', { min: 0, max: 10000 }),
          numero('intentosPorSemana', 'Intentos por semana', 'Partidas por premio que tiene cada persona (cada navegador).', { min: 1, max: 50 }))),
      seccion('Códigos', 'Los cambios de días, prefijo y largo valen para los códigos que se expidan desde ahora; los ya expedidos no cambian.',
        el('div', { class: 'rejilla' },
          numero('vigenciaDias', 'Días que vale un código', 'Se cuentan desde la hora de expedición.', { min: 1, max: 365 }),
          numero('diasEntreCodigosPorCelular', 'Días entre códigos por celular', 'Un celular reclama 1 código cada N días. 0 = sin límite.', { min: 0, max: 365 }),
          numero('compraMinima', 'Compra mínima (pesos COP)', 'Lo que debe comprar para recibir el regalo.', { min: 0, max: 10000000, paso: 1000 }),
          numero('ventanaReclamoMin', 'Minutos que se aparta el premio', 'Mientras la persona llena su nombre y celular.', { min: 1, max: 240 }),
          el('label', { class: 'campo' }, el('span', {}, 'Prefijo del código'), campos.prefijo, el('span', { class: 'ayuda' }, 'Ej.: LAINDIA → LAINDIA-7K3Q (2 a 12 letras o números).')),
          numero('largoCodigo', 'Letras del código', 'Después del guion (4 a 10).', { min: 4, max: 10 }))),
      seccion('Regalos que se pueden elegir en caja', `De 1 a ${MAX_REGALOS}. Es lo que aparece en la pantalla de canje.`, campos.regalos, campos.agregar),
      seccion('Campaña (temporada)', 'Fuera de estas fechas el juego dice que no hay campaña. Hora de Bogotá. Déjalas vacías para que siempre esté activa.',
        el('div', { class: 'rejilla' },
          el('label', { class: 'campo' }, el('span', {}, 'Empieza'), campos.inicio),
          el('label', { class: 'campo' }, el('span', {}, 'Termina'), campos.fin)),
        el('button', { type: 'button', class: 'boton secundario chico', onclick: () => { campos.inicio.value = ''; campos.fin.value = ''; marcar(); } }, 'Quitar las fechas (siempre activa)')),
      seccion('Partida y dificultad', 'Los campos de dificultad vacíos usan los valores de fábrica del juego (se ven grises). Si pruebas con poca gente, mejor cambiar de a poco.',
        el('div', { class: 'rejilla' },
          numero('duracionPartidaS', 'Duración (segundos)', 'La meta aparece cuando se cumple este tiempo.', { min: 15, max: 300 }),
          numero('frutasMinimas', 'Frutas mínimas para ganar', 'De unas 70 que salen por partida. 0 = no se exige.', { min: 0, max: 500 }),
          numero('minimoJugadoS', 'Tiempo mínimo jugado (s)', 'Antitrampa: el servidor rechaza una victoria más rápida que esto (nunca más del 75 % de la duración).', { min: 0, max: 300 }),
          dificultad('velocidad.inicial', 'Velocidad al empezar', 'Más alto = más difícil.'),
          dificultad('velocidad.final', 'Velocidad al final', 'La velocidad sube de la inicial a esta.'),
          dificultad('obstaculos.separacionInicialS', 'Segundos entre obstáculos (inicio)', 'Más alto = más fácil.'),
          dificultad('obstaculos.separacionFinalS', 'Segundos entre obstáculos (final)', 'Más bajo = más difícil.'),
          dificultad('partida.vidas', 'Vidas', 'Choques que aguanta antes de perder.'),
          dificultad('partida.toleranciaColision', 'Perdón en los choques', '0 = exacto; 0,18 = se perdona un 18 %.'),
          dificultad('frutas.cadaS', 'Segundos entre hileras de frutas', 'Más bajo = más frutas (más fácil llegar al mínimo).')),
        el('button', { type: 'button', class: 'boton secundario chico', onclick: () => { for (const { input } of Object.values(campos.dificultad)) input.value = ''; marcar(); } }, 'Volver la dificultad a los valores de fábrica')),
      seccion('Seguridad del PIN de la caja', 'Tras tantos PIN malos seguidos, la caja se bloquea; cada bloqueo seguido dura el doble (hasta 60 min). Tú puedes desbloquearla en la pestaña Cuenta.',
        el('div', { class: 'rejilla' },
          numero('pinIntentosMax', 'PIN malos antes del bloqueo', null, { min: 3, max: 20 }),
          numero('pinBloqueoMin', 'Minutos del primer bloqueo', null, { min: 1, max: 240 }))),
      el('div', { class: 'barra-guardar' }, botonGuardar, botonDescartar, estadoGuardado),
    );
    contenedor.oninput = () => marcar();
    marcar(false);
  }

  function recolectar() {
    const cambios = {};
    for (const [clave, { input, etiqueta }] of Object.entries(campos.numeros)) {
      if (input.value.trim() === '') throw new Error(`Falta llenar «${etiqueta}».`);
      cambios[clave] = Number(input.value);
    }
    cambios.regalos = [...campos.regalos.querySelectorAll('input')].map((i) => i.value.trim()).filter(Boolean);
    cambios.prefijoCodigo = campos.prefijo.value.trim();
    cambios.campanaInicioISO = deInputFecha(campos.inicio.value);
    cambios.campanaFinISO = deInputFecha(campos.fin.value);
    // La dificultad se arma sobre lo que ya hay guardado, para no borrar ajustes que no tienen casilla aquí.
    const juego = structuredClone(actual.juego ?? {});
    for (const [ruta, { input }] of Object.entries(campos.dificultad)) {
      const [grupo, clave] = ruta.split('.');
      if (input.value.trim() === '') {
        if (juego[grupo]) delete juego[grupo][clave];
        if (juego[grupo] && !Object.keys(juego[grupo]).length) delete juego[grupo];
      } else {
        (juego[grupo] ??= {})[clave] = Number(input.value);
      }
    }
    cambios.juego = juego;
    return cambios;
  }

  async function guardar() {
    let cambios;
    try {
      cambios = recolectar();
    } catch (e) {
      ctx.aviso(e.message, 'error');
      return;
    }
    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Guardando…';
    try {
      const r = await ctx.llamar('admin_guardar_config', { p_cambios: cambios });
      if (!r.ok) {
        ctx.aviso(r.mensaje ?? 'No se pudo guardar. No se cambió nada.', 'error');
        return;
      }
      actual = r.config;
      pintar();
      ctx.aviso('Guardado. Los jugadores ya ven los cambios.');
    } catch (e) {
      ctx.errorDeCarga(e);
    } finally {
      botonGuardar.disabled = false;
      botonGuardar.textContent = 'Guardar cambios';
    }
  }

  async function cargar() {
    const r = await ctx.llamar('admin_config');
    actual = r.config;
    pintar();
  }

  return { elemento: contenedor, mostrar: () => (sucio ? Promise.resolve() : ctx.cargar(contenedor, cargar)) };
}
