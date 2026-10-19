// main.js — Orquesta el juego: pantallas, partida, servidor (falso por ahora) y el bucle de cuadros.
//
//   ?debug=1  →  panel con FPS, deslizadores de dificultad en vivo, estadísticas y simulador (js/ui/debug.js).
import { api } from './api.js';
import { CONFIG } from './config.js';
import { crearControles } from './game/controles.js';
import { crearEscena } from './game/escena.js';
import { crearPartida, moverCarril, paso, progreso, saltar, tiempoRestante } from './game/logica.js';
import { T } from './textos.js';
import { crearUI } from './ui/ui.js';
import { almacen } from './util.js';

const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
const cfg = JSON.parse(JSON.stringify(CONFIG)); // config "viva": ?debug=1 la modifica sin tocar config.js
const raiz = document.getElementById('escena');
api.configurar?.(cfg);

const ui = crearUI(raiz, cfg);
let escena;
try {
  escena = crearEscena(document.getElementById('lienzo'), raiz, cfg, { textoMeta: T.juego.meta });
} catch (error) {
  console.error(error);
  document.getElementById('sin-webgl').hidden = false;
  throw error;
}
const guardado = almacen.leer('cholado-personaje');
if (guardado) escena.usarPersonaje(guardado);

/* ───────────── Estado del flujo ───────────── */
let partida = null; // la partida en curso (o la que acaba de terminar, mientras se muestra el resultado)
let token = null; // token que entregó el "servidor" al empezar
let estadoServidor = null; // último estado conocido (intentos, premios...)
let pausado = false;
let iniciando = false;
let terminada = false;
let ultimoCodigo = null;
const hooks = { alTerminar: [] }; // el panel de debug se engancha aquí

const leerCodigoGuardado = () => {
  const c = almacen.leer('cholado-mi-codigo');
  return c && Date.parse(c.venceISO) > Date.now() ? c : null;
};

/* ───────────── Pantallas ───────────── */
async function irInicio(recargar = true) {
  partida = null;
  token = null;
  pausado = false;
  terminada = false;
  ui.mostrarHUD(false);
  ui.mostrarCuenta(null);
  if (recargar || !estadoServidor) {
    ui.mostrar('cargando');
    try {
      estadoServidor = await api.obtenerEstado();
    } catch {
      ui.mostrar('error', { mensaje: T.inicio.errorConexion });
      return;
    }
  }
  const tieneCodigo = Boolean(leerCodigoGuardado());
  if (!estadoServidor.jugable) {
    ui.mostrar(estadoServidor.motivo, { ...estadoServidor, tieneCodigo });
    return;
  }
  ui.mostrar('inicio', { estado: estadoServidor, personaje: escena.personaje, mostrarSelector: cfg.desarrollo.selectorPersonaje, tieneCodigo });
}

async function iniciarJuego() {
  if (iniciando) return;
  iniciando = true;
  try {
    const r = await api.iniciarPartida();
    if (!r.ok) {
      estadoServidor = null;
      await irInicio(true); // el estado dirá por qué no se puede (sin intentos, sin premios...)
      return;
    }
    token = r.token;
    estadoServidor = { ...estadoServidor, intentosRestantes: r.intentosRestantes };
    partida = crearPartida(cfg, { semilla: (Math.random() * 2 ** 31) >>> 0, invencible: cfg.desarrollo.invencible });
    terminada = false;
    pausado = false;
    ui.ocultar();
    ui.mostrarHUD(true);
    ui.mostrarCuenta(T.juego.cuenta[0]);
  } catch {
    ui.toast(T.inicio.errorConexion);
  } finally {
    iniciando = false;
  }
}

function alternarPausa(forzar) {
  if (!partida || terminada || !['cuenta', 'jugando'].includes(partida.estado)) return;
  const quiere = forzar ?? !pausado;
  if (quiere === pausado) return;
  pausado = quiere;
  if (pausado) ui.mostrar('pausa');
  else ui.ocultar();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && cfg.desarrollo.autoPausa) alternarPausa(true); // al cambiar de app o apagar la pantalla, se pausa
});

/* ───────────── Fin de la partida ───────────── */
function alTerminarPartida(p) {
  terminada = true;
  const resumen = { gano: p.estado === 'gano', progreso: progreso(p), frutas: p.frutas, choques: p.choques, segundos: p.t };
  const pedido = api.terminarPartida({ token, gano: resumen.gano, progreso: resumen.progreso, frutas: resumen.frutas }).catch((error) => ({ error }));
  hooks.alTerminar.forEach((f) => f(resumen));
  const espera = resumen.gano ? cfg.partida.celebracionS * 1000 : 900;
  setTimeout(async () => {
    const r = await pedido;
    mostrarResultado(resumen, r);
  }, espera);
}

function mostrarResultado(resumen, r) {
  ui.mostrarHUD(false);
  if (r.error) {
    ui.mostrar('error', { mensaje: T.inicio.errorConexion });
    return;
  }
  estadoServidor = r.estado;
  if (resumen.gano && r.puedeReclamar) {
    ui.mostrar('ganaste', {});
  } else if (resumen.gano) {
    ui.mostrar('error', { mensaje: T.ganaste.errores.partidaInvalida }); // el servidor no validó la victoria (token o tiempo jugado)
  } else {
    ui.mostrar('perdiste', { progreso: resumen.progreso, frutas: resumen.frutas, intentosRestantes: estadoServidor.intentosRestantes });
  }
}

async function reclamar() {
  const lectura = ui.leerFormulario();
  if (lectura.error) {
    ui.errorFormulario(lectura.error);
    lectura.campo?.focus();
    return;
  }
  ui.errorFormulario('');
  ui.enviando(true);
  let r;
  try {
    r = await api.reclamarPremio({ token, ...lectura.valores });
  } catch {
    ui.enviando(false);
    ui.errorFormulario(T.ganaste.errores.generico);
    return;
  }
  if (r.ok) {
    ultimoCodigo = r.codigo;
    almacen.escribir('cholado-mi-codigo', { codigo: r.codigo, venceISO: r.venceISO, esDePrueba: r.esDePrueba });
    estadoServidor = null; // el banco cambió: se recarga al volver al inicio
    ui.mostrar('codigo', { codigo: r.codigo, venceMs: Date.parse(r.venceISO), esDePrueba: r.esDePrueba });
    return;
  }
  ui.enviando(false);
  if (r.motivo === 'ya-tienes-codigo') {
    ultimoCodigo = r.codigo;
    almacen.escribir('cholado-mi-codigo', { codigo: r.codigo, venceISO: r.venceISO, esDePrueba: true });
    ui.errorFormulario(T.ganaste.errores.yaTienesCodigo);
    ui.mostrar('codigo', { codigo: r.codigo, venceMs: Date.parse(r.venceISO), esDePrueba: true });
  } else if (r.motivo === 'sin-premios') {
    ui.errorFormulario(T.ganaste.errores.sinPremios);
  } else if (r.motivo === 'partida-invalida') {
    ui.errorFormulario(T.ganaste.errores.partidaInvalida);
  } else if (r.motivo === 'consentimiento') {
    ui.errorFormulario(T.ganaste.errores.consentimiento);
  } else if (r.motivo === 'datos') {
    ui.errorFormulario(T.ganaste.errores.celular);
  } else {
    ui.errorFormulario(T.ganaste.errores.generico);
  }
}

/* ───────────── Acciones de los botones ───────────── */
ui.alAccion((accion, el) => {
  if (accion.startsWith('personaje:')) {
    const p = accion.split(':')[1];
    escena.usarPersonaje(p);
    almacen.escribir('cholado-personaje', p);
    irInicio(false);
    return;
  }
  switch (accion) {
    case 'jugar':
      iniciarJuego();
      break;
    case 'ayuda':
      ui.mostrarModal('ayuda');
      break;
    case 'cerrar-ayuda':
    case 'cerrar-politica':
      ui.cerrarModal();
      break;
    case 'politica':
      ui.mostrarModal('politica');
      break;
    case 'mi-codigo': {
      const c = leerCodigoGuardado();
      if (c) {
        ultimoCodigo = c.codigo;
        ui.mostrar('codigo', { codigo: c.codigo, venceMs: Date.parse(c.venceISO), esDePrueba: c.esDePrueba });
      }
      break;
    }
    case 'copiar':
      ui.copiarCodigo(ultimoCodigo ?? '');
      break;
    case 'pausa':
      alternarPausa(true);
      break;
    case 'continuar':
      alternarPausa(false);
      break;
    case 'salir':
      irInicio(true);
      break;
    case 'reintentar':
      irInicio(true);
      break;
    case 'reclamar':
      reclamar();
      break;
    default:
      break;
  }
});

/* ───────────── Controles ───────────── */
crearControles(raiz, cfg, {
  alIzquierda: () => partida && moverCarril(partida, -1),
  alDerecha: () => partida && moverCarril(partida, 1),
  alSaltar: () => partida && saltar(partida),
  alPausar: () => alternarPausa(),
  activo: () => Boolean(partida) && partida.estado === 'jugando' && !pausado,
});

/* ───────────── Bucle de cuadros ───────────── */
let anterior = performance.now();
function bucle(ahora) {
  requestAnimationFrame(bucle);
  const dtReal = (ahora - anterior) / 1000;
  anterior = ahora;
  tick(dtReal);
}

/** Un cuadro del juego: avanza la lógica, reacciona a los eventos y dibuja. (En ?debug=1 se puede llamar a mano.) */
function tick(dtReal) {
  const dt = Math.min(0.05, dtReal);

  if (partida && !pausado) {
    partida.invencible = cfg.desarrollo.invencible;
    const antes = partida.estado;
    paso(partida, dt);
    for (const e of partida.eventos) {
      if (e.tipo === 'cuenta') ui.mostrarCuenta(T.juego.cuenta[3 - e.n]);
      else if (e.tipo === 'ya') {
        ui.mostrarCuenta(T.juego.cuenta[3]);
        setTimeout(() => partida && partida.estado === 'jugando' && ui.mostrarCuenta(null), 700);
      } else if (e.tipo === 'choque') {
        ui.destelloGolpe();
        if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(70); // vibra solo si hay un toque previo (Android; iOS no vibra)
      }
    }
    if (partida.estado !== antes && (partida.estado === 'gano' || partida.estado === 'perdio')) alTerminarPartida(partida);
    if (!hudOculto()) ui.actualizarHUD(partida, tiempoRestante(partida), progreso(partida));
  }
  const midiendo = Boolean(partida) && partida.estado === 'jugando' && !pausado && !document.hidden;
  escena.frame(pausado ? 0 : dt, dtReal, partida, Boolean(partida), midiendo);
}
const hudOculto = () => document.getElementById('hud').hidden;

/* ───────────── Arranque ───────────── */
irInicio(true);
requestAnimationFrame((t) => {
  anterior = t;
  requestAnimationFrame(bucle);
});

if (DEBUG) {
  window.__cholado = { cfg, escena, api, tick, pausar: alternarPausa, jugar: iniciarJuego, inicio: irInicio, get partida() { return partida; } };
  import('./ui/debug.js').then((m) => m.iniciarDebug({ cfg, escena, api, hooks, reiniciar: () => irInicio(true), obtenerPartida: () => partida }));
}
