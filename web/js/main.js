// main.js — Orquesta el juego: pantallas, partida, servidor (Supabase, o la API falsa) y el bucle de cuadros.
//
//   ?debug=1  →  panel con FPS, deslizadores de dificultad en vivo, estadísticas y simulador (js/ui/debug.js).
//   ?api=falsa →  usa la simulación local en vez del servidor real (para calibrar sin gastar intentos).
import { api } from './api.js';
import { CONFIG } from './config.js';
import { crearControles } from './game/controles.js';
import { crearEscena } from './game/escena.js';
import { crearPartida, moverCarril, paso, progreso, saltar, tiempoRestante } from './game/logica.js';
import { audio } from './audio.js';
import { canalActual, iniciarCanal } from './canal.js';
import { reloj } from './reloj.js';
import { T } from './textos.js';
import { crearUI } from './ui/ui.js';
import { almacen, fusionar } from './util.js';

const PARAMS = new URLSearchParams(location.search);
const DEBUG = PARAMS.get('debug') === '1';
// La dificultad y las reglas del servidor se aplican siempre, salvo en ?debug=1 (ahí mandan config.js y los deslizadores);
// con ?debug=1&servidor=1 el modo debug también las aplica (sirve para comprobar lo que cambió el servidor).
const APLICAR_SERVIDOR = !DEBUG || PARAMS.get('servidor') === '1';
const cfg = JSON.parse(JSON.stringify(CONFIG)); // config "viva": ?debug=1 la modifica sin tocar config.js
const raiz = document.getElementById('escena');
api.configurar?.(cfg);
iniciarCanal(); // ¿llegó por el QR del mostrador, de los vasos, de Instagram…? (etiquetas UTM del enlace; ver canal.js)

const ui = crearUI(raiz, cfg);
ui.marcarSonido(audio.encendido);
// Los navegadores solo dejan sonar después de un toque o una tecla: se desbloquea con el primero
// En iPhone el audio solo se desbloquea cuando el toque TERMINA (touchend/click), no con pointerdown: se prueba en todos.
for (const evento of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) document.addEventListener(evento, () => audio.activar(), { capture: true });

/** Qué suena con cada cosa que pasa en la partida (los eventos los genera la lógica). */
function sonar(e) {
  if (e.tipo === 'cuenta') audio.cuenta();
  else if (e.tipo === 'ya') audio.ya();
  else if (e.tipo === 'salto') audio.salto();
  else if (e.tipo === 'carril') audio.carril();
  else if (e.tipo === 'aterrizo') audio.aterrizo();
  else if (e.tipo === 'fruta') audio.fruta();
  else if (e.tipo === 'choque') audio.choque();
  else if (e.tipo === 'meta') audio.meta();
  else if (e.tipo === 'minimo') audio.logro(true); // ya tiene las frutas para ganar
  else if (e.tipo === 'mitad') audio.logro(false);
}
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

/* ───────────── Victoria pendiente (K1) ─────────────
   Al llegar a la meta se anota en este navegador el token de la partida. Si la persona cierra o recarga la página antes de
   reclamar (o se cae el internet justo al terminar), al volver se le ofrece reclamar. Es solo una ayuda: el servidor decide
   si todavía se puede (el servidor aparta el premio 15 min y deja reclamar hasta unas 6 h después, mientras queden premios).
   Para que la pantalla «¡Tu premio te espera!» no se quede pegada: el aviso vale 2 h, sale máximo 3 veces y se borra si el
   servidor dice que ya no vale, que ya reclamó o que ese celular ya tiene cupón. */
const CLAVE_VICTORIA = 'cholado-victoria-pendiente' + (api.esFalsa ? '-falsa' : ''); // la simulación y el servidor real NO se mezclan
const VICTORIA_MAX_MS = 2 * 3600e3; // (el servidor aguanta hasta 6 h, pero el aviso no se queda tanto)
const VICTORIA_MAX_AVISOS = 3;
let pendienteDescartado = false; // «Ahora no»: no se vuelve a ofrecer hasta recargar la página
const guardarVictoria = (v) => almacen.escribir(CLAVE_VICTORIA, { ...v, guardadoMs: Date.now() });
const olvidarVictoria = () => almacen.borrar(CLAVE_VICTORIA);
const marcarVictoria = (parche) => {
  const v = almacen.leer(CLAVE_VICTORIA);
  if (v) almacen.escribir(CLAVE_VICTORIA, { ...v, ...parche });
};
function victoriaPendiente() {
  const v = almacen.leer(CLAVE_VICTORIA);
  if (!v) return null;
  const edad = Date.now() - v.guardadoMs;
  if (typeof v.token !== 'string' || v.yaTiene || (v.avisos ?? 0) >= VICTORIA_MAX_AVISOS || !(edad >= -60000 && edad <= VICTORIA_MAX_MS)) {
    olvidarVictoria();
    return null;
  }
  return v;
}

/** Lo que manda el servidor (dificultad y reglas) se mezcla encima de config.js; su hora es la que vale para las cuentas regresivas. */
function aplicarServidor(estado) {
  if (estado.ahoraISO) reloj.ajustar(estado.ahoraISO);
  if (!APLICAR_SERVIDOR) return; // con ?debug=1 mandan config.js y los deslizadores
  if (estado.juego) fusionar(cfg, estado.juego);
  if (estado.reglas) fusionar(cfg.reglas, estado.reglas);
  // Para el texto de las condiciones (premios e intentos por semana vienen en el estado, no en "reglas")
  if (estado.premiosPorSemana != null) cfg.reglas.premiosPorSemana = estado.premiosPorSemana;
  if (estado.intentosPorSemana != null) cfg.reglas.intentosPorSemana = estado.intentosPorSemana;
}

/** ¿Este dispositivo tiene un código vigente? (lo dice el servidor, no el navegador). */
const tieneCodigoActivo = () => Boolean(estadoServidor?.miCodigoActivo);

/** Muestra el ticket del último código de este dispositivo (cuenta regresiva y estado, ambos del servidor). */
async function verMiCodigo() {
  ui.mostrar('cargando');
  let m;
  try {
    m = await api.miCodigo();
  } catch {
    ui.mostrar('error', { mensaje: T.inicio.errorConexion });
    return;
  }
  if (!m.hay) {
    irInicio(false);
    return;
  }
  ultimoCodigo = m.codigo;
  ui.mostrar('codigo', {
    codigo: m.codigo,
    venceMs: Date.parse(m.venceISO),
    estado: m.estado,
    canjeadoMs: m.canjeadoISO ? Date.parse(m.canjeadoISO) : null,
    puedeVolverMs: m.puedeVolverISO ? Date.parse(m.puedeVolverISO) : null,
    esDePrueba: m.esDePrueba,
  });
}

/* ───────────── Pantallas ───────────── */
async function irInicio(recargar = true) {
  partida = null;
  token = null;
  pausado = false;
  terminada = false;
  ui.mostrarHUD(false);
  ui.mostrarCuenta(null);
  audio.musica('menu'); // en el inicio y las pantallas suena la salsa suave (desde el primer toque)
  if (recargar || !estadoServidor) {
    ui.mostrar('cargando');
    try {
      estadoServidor = await api.obtenerEstado();
      aplicarServidor(estadoServidor);
    } catch {
      ui.mostrar('error', { mensaje: T.inicio.errorConexion });
      return;
    }
  }
  const tieneCodigo = tieneCodigoActivo();
  const pendiente = recargar && !pendienteDescartado ? victoriaPendiente() : null;
  if (pendiente) {
    marcarVictoria({ avisos: (pendiente.avisos ?? 0) + 1 }); // cuenta las veces que se le avisa (máximo 3)
    ui.mostrar('premio-pendiente', {});
    return;
  }
  if (!estadoServidor.jugable) {
    ui.mostrar(estadoServidor.motivo, { ...estadoServidor, tieneCodigo });
    return;
  }
  // El selector Choladito / La India es PERMANENTE: cada cliente elige con quién juega (se recuerda en su navegador).
  ui.mostrar('inicio', { estado: estadoServidor, personaje: escena.personaje, mostrarSelector: true, tieneCodigo });
}

async function iniciarJuego() {
  if (iniciando) return;
  iniciando = true;
  try {
    const r = await api.iniciarPartida();
    if (!r.ok && r.motivo === 'limite-red') {
      ui.toast(T.limiteRed.partidas); // demasiadas partidas desde esta red: no se gastó ningún intento
      return;
    }
    if (!r.ok) {
      estadoServidor = null;
      await irInicio(true); // el estado dirá por qué no se puede (sin intentos, sin premios...)
      return;
    }
    token = r.token;
    const canal = canalActual();
    if (canal) api.registrarCanal?.({ token, ...canal }).catch(() => {}); // sin esperar: si falla, la partida sigue igual
    estadoServidor = { ...estadoServidor, intentosRestantes: r.intentosRestantes };
    partida = crearPartida(cfg, { semilla: (Math.random() * 2 ** 31) >>> 0, invencible: cfg.desarrollo.invencible });
    terminada = false;
    pausado = false;
    ui.ocultar();
    ui.mostrarHUD(true);
    ui.mostrarCuenta(T.juego.cuenta[0]);
    audio.activar();
    audio.musica('juego'); // la misma salsa, ahora completa y con metales
    audio.cuenta();
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
  if (pausado) {
    ui.mostrar('pausa');
    audio.pausar();
  } else {
    ui.ocultar();
    audio.reanudar();
  }
}
// Celular acostado: se tapa con un aviso (CSS, .gira) y se pausa, para no perder la partida al girarlo sin querer.
// OJO: se mira la orientación del APARATO, no el tamaño de la ventana. En iPhone, al abrir el teclado (p. ej. para escribir el
// nombre) la ventana queda más ancha que alta aunque el celular siga vertical, y el aviso salía por error.
document.getElementById('gira').innerHTML = `<b>${T.gira.titulo}</b><span>${T.gira.mensaje}</span>`;
const tactil = window.matchMedia('(pointer: coarse)');
function celularAcostado() {
  if (!tactil.matches || Math.min(screen.width, screen.height) > 500) return false; // solo celulares (no tabletas ni computadores)
  const tipo = screen.orientation?.type;
  if (tipo) return tipo.startsWith('landscape');
  if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90; // iPhone viejo
  return false; // sin datos: no se tapa nada
}
function revisarGiro() {
  const acostado = celularAcostado();
  document.documentElement.classList.toggle('apaisado', acostado);
  if (acostado) alternarPausa(true);
}
screen.orientation?.addEventListener?.('change', () => setTimeout(revisarGiro, 60));
window.addEventListener('orientationchange', () => setTimeout(revisarGiro, 150));
revisarGiro();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.pausar(); // el sonido se calla en cuanto se sale de la página
  else if (!pausado) audio.reanudar();
  if (document.hidden && cfg.desarrollo.autoPausa) alternarPausa(true); // al cambiar de app o apagar la pantalla, se pausa
});

/* ───────────── Fin de la partida ───────────── */
function alTerminarPartida(p) {
  terminada = true;
  audio.musica('menu');
  if (p.estado === 'perdio' && p.motivoFin !== 'frutas') audio.perdio();
  const resumen = {
    gano: p.estado === 'gano',
    motivo: p.motivoFin, // 'vidas' | 'frutas' | null
    progreso: progreso(p),
    frutas: p.frutas,
    frutasMinimas: cfg.partida.frutasMinimas,
    choques: p.choques,
    segundos: p.t,
  };
  if (resumen.gano) guardarVictoria({ token, progreso: resumen.progreso, frutas: resumen.frutas }); // por si recarga antes de reclamar (K1)
  const pedido = api.terminarPartida({ token, gano: resumen.gano, progreso: resumen.progreso, frutas: resumen.frutas }).catch((error) => ({ error }));
  hooks.alTerminar.forEach((f) => f(resumen));
  const espera = resumen.gano ? cfg.partida.festejoS * 1000 : resumen.motivo === 'frutas' ? cfg.partida.celebracionS * 1000 : 900; // si llegó a la meta, pasa bajo el arco
  setTimeout(async () => {
    const r = await pedido;
    mostrarResultado(resumen, r);
  }, espera);
}

function mostrarResultado(resumen, r) {
  ui.mostrarHUD(false);
  if (r.error) {
    // Si había ganado, la victoria queda anotada: al reintentar se le ofrece reclamar (no la pierde por una mala señal)
    ui.mostrar('error', { mensaje: resumen.gano ? T.ganaste.errores.sinConexionGano : T.inicio.errorConexion });
    return;
  }
  if (!r.estado) {
    // El servidor contestó que esa partida no existe o no vale (p. ej. ya pasó mucho tiempo): no hay nada que recuperar
    olvidarVictoria();
    ui.mostrar('error', { mensaje: resumen.gano ? T.ganaste.errores.partidaInvalida : T.inicio.errorConexion });
    return;
  }
  estadoServidor = r.estado;
  aplicarServidor(estadoServidor);
  if (resumen.gano && r.puedeReclamar) {
    ui.mostrar('ganaste', {});
  } else if (resumen.gano && r.motivo === 'sin-premios') {
    // Ganó, pero otra persona se llevó el último premio justo antes (no se alcanzó a apartar el suyo)
    olvidarVictoria();
    ui.mostrar('sin-premios', { ...estadoServidor, ganaste: true, tieneCodigo: tieneCodigoActivo() });
  } else if (resumen.gano) {
    olvidarVictoria();
    ui.mostrar('error', { mensaje: T.ganaste.errores.partidaInvalida }); // el servidor no validó la victoria (token, tiempo o frutas)
  } else {
    ui.mostrar('perdiste', {
      progreso: resumen.progreso,
      frutas: resumen.frutas,
      frutasMinimas: resumen.frutasMinimas,
      motivo: resumen.motivo,
      intentosRestantes: estadoServidor.intentosRestantes,
    });
  }
}

/** «Reclamar mi premio» desde el aviso de victoria pendiente: se le pregunta al servidor si todavía vale y se abre el formulario. */
async function recuperarVictoria() {
  const v = victoriaPendiente();
  if (!v) {
    irInicio(true);
    return;
  }
  ui.mostrar('cargando');
  let r;
  try {
    r = await api.terminarPartida({ token: v.token, gano: true, progreso: v.progreso, frutas: v.frutas }); // repetirla no cambia nada
  } catch (error) {
    r = error?.http && error.http < 500 ? { ok: false, motivo: 'partida-invalida' } : { error }; // 4xx: el servidor la rechaza, no es mala señal
  }
  if (r && !r.error && r.estado && !r.puedeReclamar && !r.motivo && r.estado.miCodigoActivo) {
    // el servidor dice que esa victoria ya se reclamó (la respuesta se perdió por mala señal): se le muestra el código que ya tiene
    olvidarVictoria();
    verMiCodigo();
    return;
  }
  token = v.token;
  mostrarResultado({ gano: true, motivo: null, progreso: v.progreso ?? 1, frutas: v.frutas ?? 0, frutasMinimas: cfg.partida.frutasMinimas }, r);
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
    if (r.ahoraISO) reloj.ajustar(r.ahoraISO);
    ultimoCodigo = r.codigo;
    olvidarVictoria();
    estadoServidor = null; // el banco cambió: se recarga al volver al inicio
    ui.mostrar('codigo', { codigo: r.codigo, venceMs: Date.parse(r.venceISO), estado: 'activo', esDePrueba: r.esDePrueba });
    return;
  }
  ui.enviando(false);
  if (r.motivo === 'ya-tienes-codigo') {
    let tiene = false;
    try {
      tiene = (await api.miCodigo()).estado === 'activo'; // ¿este dispositivo tiene un código vigente de otro número?
    } catch {
      /* si falla, simplemente no se ofrece el botón */
    }
    marcarVictoria({ yaTiene: true }); // ese celular no puede reclamar: si cierra aquí, no se le vuelve a ofrecer
    ui.mostrar('ya-tienes-cupon', { puedeVolverMs: Date.parse(r.puedeVolverISO), dias: r.dias, tieneCodigo: tiene });
  } else if (r.motivo === 'limite-red') {
    ui.errorFormulario(T.limiteRed.codigos);
  } else if (r.motivo === 'sin-premios') {
    olvidarVictoria();
    ui.errorFormulario(T.ganaste.errores.sinPremios);
  } else if (r.motivo === 'partida-invalida') {
    olvidarVictoria();
    ui.errorFormulario(T.ganaste.errores.partidaInvalida);
  } else if (r.motivo === 'consentimiento') {
    ui.errorFormulario(T.ganaste.errores.consentimiento);
  } else if (r.motivo === 'datos') {
    ui.errorFormulario(T.ganaste.errores.datos); // el servidor no dice cuál campo falló
  } else {
    ui.errorFormulario(T.ganaste.errores.generico);
  }
}

/* ───────────── Acciones de los botones ───────────── */
ui.alAccion((accion, el) => {
  if (accion !== 'sonido' && accion !== 'pausa') audio.click();
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
    case 'cerrar-condiciones':
      ui.cerrarModal();
      break;
    case 'condiciones':
      ui.mostrarModal('condiciones');
      break;
    case 'politica':
      ui.mostrarModal('politica');
      break;
    case 'mi-codigo':
      verMiCodigo();
      break;
    case 'copiar':
      ui.copiarCodigo(ultimoCodigo ?? '');
      break;
    case 'pausa':
      alternarPausa(true);
      break;
    case 'continuar':
      alternarPausa(false);
      break;
    case 'sonido':
      ui.marcarSonido(audio.alternar());
      break;
    case 'salir':
      if (ui.pantalla === 'ya-tienes-cupon') olvidarVictoria(); // ese celular no puede reclamar otro: ya no hay nada pendiente
      irInicio(true);
      break;
    case 'recuperar-premio':
      recuperarVictoria();
      break;
    case 'ahora-no':
      pendienteDescartado = true;
      irInicio(true);
      break;
    case 'reintentar':
      irInicio(true);
      break;
    case 'reclamar':
      reclamar();
      break;
    case 'otro-numero':
      ui.mostrar('ganaste', {}); // se equivocó de número: vuelve al formulario (la partida sigue siendo válida)
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
      } else if (e.tipo === 'meta') {
        ui.mostrarCuenta(T.juego.meta); // «¡META!» grande, con la misma animación de la cuenta atrás
        setTimeout(() => ui.mostrarCuenta(null), 1100);
        if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([60, 40, 60, 40, 140]);
      } else if (e.tipo === 'choque') {
        ui.destelloGolpe();
        if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(70); // vibra solo si hay un toque previo (Android; iOS no vibra)
      }
    }
    for (const e of partida.eventos) sonar(e);
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
  window.__cholado = { cfg, escena, api, audio, tick, pausar: alternarPausa, jugar: iniciarJuego, inicio: irInicio, get partida() { return partida; } };
  import('./ui/debug.js').then((m) => m.iniciarDebug({ cfg, escena, api, hooks, reiniciar: () => irInicio(true), obtenerPartida: () => partida }));
}
