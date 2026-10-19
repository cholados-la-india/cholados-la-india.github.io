// api-falsa.js — Simulación local del servidor (Etapa 3). Guarda todo en localStorage de este navegador.
// Imita las reglas del negocio para poder probar todas las pantallas: intentos por semana, banco de premios que se
// reinicia el lunes 00:00 (hora de Bogotá), token de partida, tiempo mínimo jugado, un código por celular cada 7 días
// y vigencia de 7 días menos 1 minuto. NO es seguridad real: cualquiera puede borrar su localStorage.
import { CONFIG } from './config.js';
import { aleatorioEntre, almacen, esperar, inicioSemanaBogota } from './util.js';

const CLAVE = 'cholado-api-falsa-v1';
const SEMANA_MS = 7 * 24 * 3600e3;
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para no confundir al leerlo en caja

let cfg = CONFIG;
export const esFalsa = true;
export const configurar = (c) => {
  cfg = c;
};

const ahora = () => Date.now(); // en producción el reloj lo pone el servidor, nunca el celular

function cargar() {
  const semana = inicioSemanaBogota(ahora());
  const s = almacen.leer(CLAVE, null) ?? {};
  const base = { codigos: [], dbg: {}, partida: null, ...s };
  if (s.semana !== semana) return { ...base, semana, intentosUsados: 0, premiosEmitidos: 0 }; // lunes: se reinician intentos y banco
  return base;
}
const guardar = (s) => almacen.escribir(CLAVE, s);
const latencia = () => esperar(aleatorioEntre(...cfg.desarrollo.latenciaApiMs));

function calcular(s) {
  const r = cfg.reglas;
  const intentosPorSemana = s.dbg.intentosPorSemana ?? r.intentosPorSemana;
  const premiosPorSemana = s.dbg.premiosPorSemana ?? r.premiosPorSemana;
  const intentosRestantes = Math.max(0, intentosPorSemana - s.intentosUsados);
  const premiosRestantes = Math.max(0, premiosPorSemana - s.premiosEmitidos);
  const t = ahora();
  const { inicioISO, finISO } = r.campana;
  const campanaActiva = (!inicioISO || t >= Date.parse(inicioISO)) && (!finISO || t <= Date.parse(finISO));
  let motivo = null;
  if (!campanaActiva) motivo = 'campana-inactiva';
  else if (premiosRestantes <= 0) motivo = 'sin-premios';
  else if (intentosRestantes <= 0 && !s.dbg.ilimitado) motivo = 'sin-intentos';
  return {
    jugable: motivo === null,
    motivo,
    premiosRestantes,
    premiosPorSemana,
    intentosRestantes: s.dbg.ilimitado ? intentosPorSemana : intentosRestantes,
    intentosPorSemana,
    reiniciaEnISO: new Date(s.semana + SEMANA_MS).toISOString(),
  };
}

function fallaSimulada(s) {
  if (s.dbg.fallar) throw new Error('Error de red simulado');
}

export async function obtenerEstado() {
  await latencia();
  const s = cargar();
  fallaSimulada(s);
  return calcular(s);
}

export async function iniciarPartida() {
  await latencia();
  const s = cargar();
  fallaSimulada(s);
  const estado = calcular(s);
  if (!estado.jugable) return { ok: false, motivo: estado.motivo };
  if (!s.dbg.ilimitado) s.intentosUsados += 1;
  const token = Array.from({ length: 16 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('');
  s.partida = { token, inicioMs: ahora(), gano: false, reclamada: false };
  guardar(s);
  return { ok: true, token, intentosRestantes: calcular(s).intentosRestantes };
}

export async function terminarPartida({ token, gano }) {
  await latencia();
  const s = cargar();
  fallaSimulada(s);
  let puedeReclamar = false;
  if (s.partida && s.partida.token === token && !s.partida.reclamada) {
    // Tiempo mínimo jugado: el servidor conoce la duración configurada y exige haber jugado casi toda.
    const minimo = (s.dbg.tiempoMinimoS ?? Math.min(cfg.reglas.minimoJugadoParaGanarS, 0.75 * cfg.partida.duracionS)) * 1000;
    puedeReclamar = Boolean(gano) && ahora() - s.partida.inicioMs >= minimo;
    s.partida.gano = puedeReclamar;
    guardar(s);
  }
  return { ok: true, puedeReclamar, estado: calcular(s) };
}

const textoLimpio = (t) => String(t ?? '').trim().replace(/\s+/g, ' ');
function celularValido(c) {
  let d = String(c ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return /^3\d{9}$/.test(d) ? d : null;
}

function nuevoCodigo(existentes) {
  for (;;) {
    const c = Array.from({ length: 6 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('');
    if (!existentes.some((x) => x.codigo === c)) return c; // un mismo código jamás se repite
  }
}

export async function reclamarPremio({ token, nombre, celular, consentimiento }) {
  await latencia();
  const s = cargar();
  fallaSimulada(s);
  if (!s.partida || s.partida.token !== token || !s.partida.gano || s.partida.reclamada) return { ok: false, motivo: 'partida-invalida' };
  if (!consentimiento) return { ok: false, motivo: 'consentimiento' };
  const n = textoLimpio(nombre);
  const cel = celularValido(celular);
  if (n.length < 2 || n.length > 60 || !cel) return { ok: false, motivo: 'datos' };

  // Un código por persona (por celular) cada 7 días
  const t = ahora();
  const previo = s.codigos.find((c) => c.celular === cel && t - c.emitidoMs < cfg.reglas.diasEntreCodigosPorCelular * 86400e3);
  if (previo) return { ok: false, motivo: 'ya-tienes-codigo', codigo: previo.codigo, venceISO: new Date(previo.venceMs).toISOString() };

  if (calcular(s).premiosRestantes <= 0) return { ok: false, motivo: 'sin-premios' };

  const emitidoMs = t;
  const venceMs = emitidoMs + cfg.reglas.vigenciaDias * 86400e3 - 60e3; // 7 días desde la expedición, menos 1 minuto
  const codigo = nuevoCodigo(s.codigos);
  s.codigos.push({ codigo, nombre: n, celular: cel, emitidoMs, venceMs, canjeado: false });
  if (!s.dbg.ilimitado) s.premiosEmitidos += 1;
  s.partida.reclamada = true;
  guardar(s);
  return { ok: true, codigo, emitidoISO: new Date(emitidoMs).toISOString(), venceISO: new Date(venceMs).toISOString(), esDePrueba: true };
}

/** Ayudas para ?debug=1 (no existen en la API real). */
export const debug = {
  /** Cambia lo que el "servidor" sabe: { ilimitado, intentosPorSemana, premiosPorSemana, fallar }. */
  fijar(valores) {
    const s = cargar();
    s.dbg = { ...s.dbg, ...valores };
    guardar(s);
    return calcular(s);
  },
  leerAjustes: () => cargar().dbg,
  /** Como si fuera lunes: intentos y banco de premios a cero (los códigos emitidos se conservan). */
  reiniciarSemana() {
    const s = cargar();
    s.intentosUsados = 0;
    s.premiosEmitidos = 0;
    s.partida = null;
    guardar(s);
  },
  borrarTodo: () => almacen.borrar(CLAVE),
  codigos: () => cargar().codigos,
};
