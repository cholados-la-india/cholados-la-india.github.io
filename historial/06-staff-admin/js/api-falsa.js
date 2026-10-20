// api-falsa.js — Simulación LOCAL del servidor. Guarda todo en localStorage de este navegador.
// Con la Etapa 4 ya existe el servidor real (api-supabase.js); esta sigue sirviendo para:
//   · calibrar con  ?debug=1&api=falsa  sin gastar intentos ni premios reales (tiene intentos ilimitados, etc.),
//   · jugar si todavía no hay servidor configurado (supabase-config.js vacío).
// Imita las reglas del servidor, pero NO es seguridad real: cualquiera puede borrar su localStorage.
import { CONFIG } from './config.js';
import { idDispositivo } from './dispositivo.js';
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
const iso = (ms) => new Date(ms).toISOString();

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
  const dispositivo = idDispositivo();
  return {
    jugable: motivo === null,
    motivo,
    premiosRestantes,
    premiosPorSemana,
    intentosRestantes: s.dbg.ilimitado ? intentosPorSemana : intentosRestantes,
    intentosPorSemana,
    reiniciaEnISO: iso(s.semana + SEMANA_MS),
    ahoraISO: iso(t),
    miCodigoActivo: s.codigos.some((c) => c.device === dispositivo && c.estado === 'activo' && t < c.venceMs),
    reglas: {
      compraMinima: r.compraMinima,
      vigenciaDias: r.vigenciaDias,
      diasEntreCodigosPorCelular: r.diasEntreCodigosPorCelular,
      regalos: r.regalos,
      ventanaReclamoMin: r.ventanaReclamoMin,
    },
    juego: {}, // la API falsa no cambia la dificultad: manda config.js (y los deslizadores de ?debug=1)
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
  if (!estado.jugable) return { ok: false, motivo: estado.motivo, estado };
  if (!s.dbg.ilimitado) s.intentosUsados += 1;
  const token = Array.from({ length: 16 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('');
  s.partida = { token, inicioMs: ahora(), gano: false, reclamada: false };
  guardar(s);
  return { ok: true, token, intentosRestantes: calcular(s).intentosRestantes, ahoraISO: iso(ahora()) };
}

export async function terminarPartida({ token, gano, frutas }) {
  await latencia();
  const s = cargar();
  fallaSimulada(s);
  let puedeReclamar = false;
  let motivo = null;
  if (s.partida && s.partida.token === token && !s.partida.reclamada) {
    // Victoria válida = llegó a la meta + recogió las frutas mínimas + jugó el tiempo mínimo (como el servidor real).
    const minimo = (s.dbg.tiempoMinimoS ?? Math.min(cfg.reglas.minimoJugadoParaGanarS, 0.75 * cfg.partida.duracionS)) * 1000;
    const frutasOk = (frutas ?? 0) >= (cfg.partida.frutasMinimas ?? 0);
    puedeReclamar = Boolean(gano) && frutasOk && ahora() - s.partida.inicioMs >= minimo;
    if (gano && !puedeReclamar) motivo = 'partida-invalida';
    s.partida.gano = puedeReclamar;
    guardar(s);
  }
  return { ok: true, puedeReclamar, motivo, estado: calcular(s) };
}

function celularValido(c) {
  let d = String(c ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return /^3\d{9}$/.test(d) ? d : null;
}

function nuevoCodigo(existentes) {
  for (;;) {
    const c = 'LAINDIA-' + Array.from({ length: 4 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('');
    if (!existentes.some((x) => x.codigo === c)) return c; // un mismo código jamás se repite
  }
}

export async function reclamarPremio({ token, nombre, celular, consentimiento }) {
  await latencia();
  const s = cargar();
  fallaSimulada(s);
  if (!s.partida || s.partida.token !== token || !s.partida.gano || s.partida.reclamada) return { ok: false, motivo: 'partida-invalida' };
  if (!consentimiento) return { ok: false, motivo: 'consentimiento' };
  const n = String(nombre ?? '').trim().replace(/\s+/g, ' ');
  const cel = celularValido(celular);
  if (n.length < 2 || n.length > 60 || !cel) return { ok: false, motivo: 'datos' };

  // Un código por persona (por celular) cada N días. No se revela el código de ese número.
  const t = ahora();
  const dias = cfg.reglas.diasEntreCodigosPorCelular;
  const previo = s.codigos.find((c) => c.celular === cel && t - c.emitidoMs < dias * 86400e3);
  if (previo) return { ok: false, motivo: 'ya-tienes-codigo', dias, puedeVolverISO: iso(previo.emitidoMs + dias * 86400e3) };

  if (calcular(s).premiosRestantes <= 0) return { ok: false, motivo: 'sin-premios' };

  const emitidoMs = t;
  const venceMs = Math.floor(emitidoMs / 60000) * 60000 + cfg.reglas.vigenciaDias * 86400e3; // al minuto + 7 días exactos
  const codigo = nuevoCodigo(s.codigos);
  s.codigos.push({ codigo, nombre: n, celular: cel, device: idDispositivo(), emitidoMs, venceMs, estado: 'activo' });
  if (!s.dbg.ilimitado) s.premiosEmitidos += 1;
  s.partida.reclamada = true;
  guardar(s);
  return { ok: true, codigo, emitidoISO: iso(emitidoMs), venceISO: iso(venceMs), ahoraISO: iso(t), esDePrueba: true };
}

export async function miCodigo() {
  await latencia();
  const s = cargar();
  fallaSimulada(s);
  const t = ahora();
  const dispositivo = idDispositivo();
  const k = [...s.codigos].reverse().find((c) => c.device === dispositivo);
  if (!k) return { ok: true, hay: false, ahoraISO: iso(t) };
  const estado = k.estado !== 'activo' ? k.estado : t >= k.venceMs ? 'vencido' : 'activo';
  return {
    ok: true,
    hay: true,
    codigo: k.codigo,
    estado,
    emitidoISO: iso(k.emitidoMs),
    venceISO: iso(k.venceMs),
    canjeadoISO: null,
    segundosRestantes: estado === 'activo' ? Math.floor((k.venceMs - t) / 1000) : 0,
    puedeVolverISO: iso(k.emitidoMs + cfg.reglas.diasEntreCodigosPorCelular * 86400e3),
    ahoraISO: iso(t),
    esDePrueba: true,
  };
}

/** Ayudas para ?debug=1 (no existen en la API real). */
export const debug = {
  /** Cambia lo que el "servidor" sabe: { ilimitado, intentosPorSemana, premiosPorSemana, fallar, tiempoMinimoS }. */
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
