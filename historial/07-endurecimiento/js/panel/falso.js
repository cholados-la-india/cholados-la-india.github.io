// falso.js — Servidor DE MENTIRA para ver y probar la caja y el panel (se activa con  ?api=falsa ).
// Nada de esto es real: vive en la memoria de la pestaña y desaparece al recargar. Imita las respuestas de
// supabase/migrations/0003_staff_admin.sql (mismos nombres y mismas formas), así que sirve para revisar cada pantalla.
//
//   PIN de la caja (demo): 1234        ·        Panel de administrador (demo): cualquier correo y la clave "demo"
//   Códigos de prueba: K7M2 y P4X9 (válidos) · R8T3 (ya canjeado) · V3N5 (vencido) · D6F2 (desactivado)
import { CONFIG } from '../config.js';
import { ErrorServidor } from './rpc.js';
import { dormir } from './dom.js';

export const PIN_DEMO = '1234';
export const CLAVE_DEMO = 'demo';
export const TOKEN_DEMO = 'token-de-mentira';

const MIN = 60e3;
const HORA = 3600e3;
const DIA = 86400e3;
const ahora = () => Date.now();
const iso = (t) => new Date(t).toISOString();
const sinTildes = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const r = CONFIG.reglas;
let cfg = {
  intentosPorSemana: r.intentosPorSemana,
  premiosPorSemana: r.premiosPorSemana,
  cupoDiario: 0,
  vigenciaDias: r.vigenciaDias,
  diasEntreCodigosPorCelular: r.diasEntreCodigosPorCelular,
  compraMinima: r.compraMinima,
  regalos: [...r.regalos],
  campanaInicioISO: null,
  campanaFinISO: null,
  duracionPartidaS: CONFIG.partida.duracionS,
  frutasMinimas: CONFIG.partida.frutasMinimas,
  minimoJugadoS: r.minimoJugadoParaGanarS,
  ventanaReclamoMin: r.ventanaReclamoMin,
  prefijoCodigo: 'LAINDIA',
  largoCodigo: 4,
  pinIntentosMax: 5,
  pinBloqueoMin: 5,
  pinIntentosMaxGlobal: 30,
  limitePartidasIpHora: 150,
  limiteCodigosIpDia: 8,
  juego: {},
  actualizadoISO: iso(ahora()),
};

// ── PIN ──
let pinActual = PIN_DEMO;
let pinCambiado = ahora() - 3 * DIA;
let fallos = 0;
let bloqueos = 0;
let bloqueadoHasta = 0;

function verificarPin(pin) {
  const t = ahora();
  if (bloqueadoHasta > t) {
    return { ok: false, resultado: 'bloqueado', hastaISO: iso(bloqueadoHasta), segundos: Math.ceil((bloqueadoHasta - t) / 1000) };
  }
  if (pin != null && String(pin) === pinActual) {
    fallos = 0;
    bloqueos = 0;
    bloqueadoHasta = 0;
    return null;
  }
  fallos += 1;
  if (fallos >= cfg.pinIntentosMax) {
    bloqueos += 1;
    fallos = 0;
    const min = Math.min(cfg.pinBloqueoMin * 2 ** Math.min(bloqueos - 1, 10), Math.max(60, cfg.pinBloqueoMin));
    bloqueadoHasta = t + min * MIN;
    return { ok: false, resultado: 'bloqueado', hastaISO: iso(bloqueadoHasta), segundos: min * 60 };
  }
  return { ok: false, resultado: 'pin-incorrecto', intentosRestantes: cfg.pinIntentosMax - fallos };
}

// ── Códigos de muestra ──
const venceDe = (emitido, dias) => Math.floor(emitido / MIN) * MIN + dias * DIA;
const codigos = [];
function agregar(sufijo, nombre, cel, haceMs, estado = 'activo', regalo = null, canjeadoHaceMs = null) {
  const emitido = ahora() - haceMs;
  codigos.push({
    codigo: `LAINDIA-${sufijo}`, nombre, celular: cel, emitido, vence: venceDe(emitido, 7), estado,
    canjeado: canjeadoHaceMs != null ? ahora() - canjeadoHaceMs : null,
    canjeadoPor: estado === 'canjeado' ? 'staff' : null, regalo,
  });
}
agregar('K7M2', 'María Fernanda Ríos', '3105550142', 2 * HORA);
agregar('P4X9', 'Juan Camilo Ortiz', '3205550177', 1 * DIA + 4 * HORA);
agregar('R8T3', 'Laura Gómez', '3015550123', 2 * DIA, 'canjeado', 'Un raspao personal', 1 * DIA);
agregar('V3N5', 'Carlos Andrés Peña', '3115550188', 9 * DIA);
agregar('D6F2', 'Sofía Valencia', '3185550111', 3 * DIA, 'desactivado');
agregar('H2W8', 'Andrés Felipe Cruz', '3125550166', 3 * DIA + 2 * HORA, 'canjeado', 'Un cholado de 10 oz', 3 * DIA);
agregar('M9Q4', 'Valentina Muñoz', '3045550199', 4 * DIA, 'canjeado', 'Un raspao personal', 3 * DIA + 5 * HORA);
agregar('T5L7', 'Diego Alejandro Ramírez', '3165550134', 5 * DIA + 3 * HORA);
agregar('X3Z6', '<img src=x onerror=alert(1)> Pedro', '3135550150', 5 * HORA); // prueba: el panel muestra el texto tal cual, no lo ejecuta
agregar('B8C2', 'Camila Restrepo', '3215550121', 11 * DIA, 'canjeado', 'Un raspao personal', 10 * DIA);
agregar('F4G9', 'Santiago Herrera', '3175550145', 12 * DIA);
agregar('J6K3', 'Isabella Torres', '3195550177', 6 * DIA + 1 * HORA, 'canjeado', 'Un cholado de 10 oz', 6 * DIA);

const efectivo = (k) => (k.estado !== 'activo' ? k.estado : ahora() >= k.vence ? 'vencido' : 'activo');

function buscar(texto) {
  const v = String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.length < 4 || v.length > 24) return null;
  return codigos.find((k) => k.codigo.replace('-', '') === v) ?? [...codigos].filter((k) => k.codigo.split('-')[1] === v).sort((a, b) => b.emitido - a.emitido)[0] ?? null;
}

function consulta(k, admin) {
  if (!k) return { ok: true, resultado: 'inexistente', ahoraISO: iso(ahora()) };
  const e = efectivo(k);
  const base = {
    ok: true, resultado: e === 'activo' ? 'valido' : e, codigo: k.codigo, emitidoISO: iso(k.emitido), venceISO: iso(k.vence),
    canjeadoISO: k.canjeado ? iso(k.canjeado) : null, regaloElegido: k.regalo, regalos: cfg.regalos, compraMinima: cfg.compraMinima, ahoraISO: iso(ahora()),
  };
  return admin ? { ...base, nombre: k.nombre, celular: k.celular, canjeadoPor: k.canjeadoPor } : base;
}

function canjear(texto, regalo, por) {
  const k = buscar(texto);
  if (!k) return { ok: false, resultado: 'inexistente' };
  const e = efectivo(k);
  if (e !== 'activo') {
    return { ok: false, resultado: e, codigo: k.codigo, venceISO: iso(k.vence), canjeadoISO: k.canjeado ? iso(k.canjeado) : null, regaloElegido: k.regalo };
  }
  let elegido = String(regalo ?? '').trim() || null;
  if (!elegido && cfg.regalos.length === 1) elegido = cfg.regalos[0];
  if (!elegido || !cfg.regalos.includes(elegido)) return { ok: false, resultado: 'regalo-invalido', regalos: cfg.regalos };
  Object.assign(k, { estado: 'canjeado', canjeado: ahora(), canjeadoPor: por, regalo: elegido });
  return { ok: true, resultado: 'canjeado-ahora', codigo: k.codigo, regaloElegido: elegido, canjeadoISO: iso(k.canjeado) };
}

// ── Listas y resumen ──
function filtrados(estado, texto) {
  const q = sinTildes(String(texto ?? '').trim());
  const dig = String(texto ?? '').replace(/\D/g, '');
  return [...codigos]
    .filter((k) => !estado || estado === 'todos' || efectivo(k) === estado)
    .filter((k) => !q || sinTildes(k.codigo).includes(q) || sinTildes(k.nombre).includes(q) || (dig.length >= 3 && k.celular.includes(dig)))
    .sort((a, b) => b.emitido - a.emitido);
}
const fila = (k) => ({
  codigo: k.codigo, nombre: k.nombre, celular: k.celular, estado: efectivo(k), emitidoISO: iso(k.emitido), venceISO: iso(k.vence),
  canjeadoISO: k.canjeado ? iso(k.canjeado) : null, canjeadoPor: k.canjeadoPor, regalo: k.regalo,
});

function inicioSemana(t) {
  const b = new Date(t - 5 * HORA);
  const dow = (b.getUTCDay() + 6) % 7;
  return Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() - dow) + 5 * HORA;
}

function resumen() {
  const t = ahora();
  const sem0 = inicioSemana(t);
  const deSem = codigos.filter((k) => k.emitido >= sem0);
  const cuenta = (e) => codigos.filter((k) => efectivo(k) === e).length;
  const dias = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(t - 5 * HORA - i * DIA).toISOString().slice(0, 10);
    const base = (i * 7 + 3) % 11;
    dias.push({ dia: d, partidas: 4 + base * 3, ganadores: Math.round(base / 3), codigos: i === 0 ? codigos.filter((k) => t - k.emitido < DIA && new Date(k.emitido - 5 * HORA).toISOString().slice(0, 10) === d).length : Math.round(base / 4), canjes: Math.round(base / 5) });
  }
  return {
    ok: true, ahoraISO: iso(t), semanaInicioISO: iso(sem0), jugable: true, motivo: null,
    premiosRestantes: Math.max(0, cfg.premiosPorSemana - deSem.length), premiosPorSemana: cfg.premiosPorSemana,
    partidas: { total: 214, semana: 63, ganadores: 41, ganadoresSemana: 12, rechazadas: 3, sinCupo: 1 },
    codigos: {
      total: codigos.length, semana: deSem.length, activos: cuenta('activo'), vencidos: cuenta('vencido'), desactivados: cuenta('desactivado'),
      canjeados: cuenta('canjeado'), canjesSemana: codigos.filter((k) => k.canjeado && k.canjeado >= sem0).length,
    },
    dias,
    pin: { configurado: true, cambiadoISO: iso(pinCambiado), bloqueadoHastaISO: bloqueadoHasta > t ? iso(bloqueadoHasta) : null, fallos },
  };
}

// ── Configuración ──
const RANGOS = {
  intentosPorSemana: [1, 50, 'Intentos por semana'], premiosPorSemana: [0, 10000, 'Premios por semana'], cupoDiario: [0, 10000, 'Cupo diario'],
  vigenciaDias: [1, 365, 'Días de vigencia'], diasEntreCodigosPorCelular: [0, 365, 'Días entre códigos por celular'], compraMinima: [0, 10000000, 'Compra mínima'],
  duracionPartidaS: [15, 300, 'Duración de la partida'], frutasMinimas: [0, 500, 'Frutas mínimas'], minimoJugadoS: [0, 300, 'Tiempo mínimo jugado'],
  ventanaReclamoMin: [1, 240, 'Minutos que se aparta el premio'], largoCodigo: [4, 10, 'Largo del código'],
  pinIntentosMax: [3, 20, 'Intentos de PIN antes del bloqueo'], pinBloqueoMin: [1, 240, 'Minutos del primer bloqueo del PIN'],
  pinIntentosMaxGlobal: [3, 1000, 'PIN malos (sumando todas las redes) antes del bloqueo general'],
  limitePartidasIpHora: [0, 100000, 'Partidas por hora desde una misma red'], limiteCodigosIpDia: [0, 10000, 'Códigos por día desde una misma red'],
};

function guardarConfig(p) {
  const nuevo = { ...cfg };
  const error = (mensaje) => ({ ok: false, motivo: 'datos', mensaje });
  for (const [k, [lo, hi, etiqueta]] of Object.entries(RANGOS)) {
    if (!(k in p)) continue;
    if (typeof p[k] !== 'number' || !Number.isInteger(p[k])) return error(`${etiqueta} debe ser un número entero.`);
    if (p[k] < lo || p[k] > hi) return error(`${etiqueta} debe estar entre ${lo} y ${hi}.`);
    nuevo[k] = p[k];
  }
  if ('regalos' in p) {
    const lista = Array.isArray(p.regalos) ? p.regalos.map((x) => String(x).trim()) : [];
    if (lista.length < 1 || lista.length > 6) return error('Debe haber entre 1 y 6 regalos.');
    if (lista.some((x) => x.length < 2 || x.length > 60)) return error('Cada regalo debe ser un texto de 2 a 60 letras.');
    if (new Set(lista).size !== lista.length) return error('Los regalos no pueden repetirse.');
    nuevo.regalos = lista;
  }
  if ('prefijoCodigo' in p) {
    const pref = String(p.prefijoCodigo ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{2,12}$/.test(pref)) return error('El prefijo del código debe tener de 2 a 12 letras o números (sin espacios).');
    nuevo.prefijoCodigo = pref;
  }
  for (const k of ['campanaInicioISO', 'campanaFinISO']) {
    if (!(k in p)) continue;
    if (p[k] == null || p[k] === '') nuevo[k] = null;
    else if (Number.isNaN(Date.parse(p[k]))) return error('Una fecha o un número no tiene el formato correcto.');
    else nuevo[k] = new Date(p[k]).toISOString();
  }
  if (nuevo.campanaInicioISO && nuevo.campanaFinISO && Date.parse(nuevo.campanaFinISO) <= Date.parse(nuevo.campanaInicioISO)) return error('La campaña debe terminar después de empezar.');
  if ('juego' in p) {
    if (!p.juego || typeof p.juego !== 'object' || Array.isArray(p.juego)) return error('La dificultad debe ser un objeto.');
    const v = p.juego.velocidad ?? {};
    if (v.inicial != null && (v.inicial < 3 || v.inicial > 30)) return error('velocidad.inicial debe estar entre 3 y 30.');
    if (v.final != null && (v.final < 3 || v.final > 40)) return error('velocidad.final debe estar entre 3 y 40.');
    nuevo.juego = structuredClone(p.juego);
  }
  nuevo.actualizadoISO = iso(ahora());
  cfg = nuevo;
  return { ok: true, config: structuredClone(cfg) };
}

function cambiarPin(p) {
  if (!/^[0-9]{4,8}$/.test(String(p ?? ''))) return { ok: false, motivo: 'pin-invalido', mensaje: 'El PIN debe tener entre 4 y 8 números (recomendado: 6).' };
  if (/^(.)\1*$/.test(p) || ['1234', '12345', '123456', '1234567', '12345678', '4321', '54321', '654321'].includes(p)) {
    return { ok: false, motivo: 'pin-facil', mensaje: 'Ese PIN es muy fácil de adivinar. Elige otro.' };
  }
  pinActual = p;
  pinCambiado = ahora();
  fallos = 0;
  bloqueos = 0;
  bloqueadoHasta = 0;
  return { ok: true };
}

/** El "servidor": mismas funciones y mismos nombres de parámetros que el SQL real. */
export async function llamar(nombre, a, token) {
  await dormir(140 + Math.random() * 200);
  if (nombre === 'canje_consultar') return verificarPin(a.p_pin) ?? consulta(buscar(a.p_codigo), false);
  if (nombre === 'canje_confirmar') return verificarPin(a.p_pin) ?? canjear(a.p_codigo, a.p_regalo, 'staff');

  if (!nombre.startsWith('admin_')) throw new ErrorServidor('faltan-funciones', 'Función desconocida en la demo.', 404);
  if (token !== TOKEN_DEMO) throw new ErrorServidor('sesion', 'La sesión venció o no es válida.', 401);
  switch (nombre) {
    case 'admin_yo': return { ok: true, esAdmin: true };
    case 'admin_resumen': return resumen();
    case 'admin_codigos': {
      const lista = filtrados(a.p_estado, a.p_buscar);
      const desde = Math.max(0, a.p_desde ?? 0);
      const lim = Math.min(Math.max(a.p_limite ?? 50, 1), 200);
      return { ok: true, total: lista.length, filas: lista.slice(desde, desde + lim).map(fila), ahoraISO: iso(ahora()) };
    }
    case 'admin_exportar': {
      const lista = filtrados(a.p_estado, a.p_buscar);
      return { ok: true, total: lista.length, filas: lista.map(fila), ahoraISO: iso(ahora()) };
    }
    case 'admin_consultar_codigo': return consulta(buscar(a.p_codigo), true);
    case 'admin_canjear': return canjear(a.p_codigo, a.p_regalo, 'admin');
    case 'admin_estado_codigo': {
      const k = buscar(a.p_codigo);
      if (!['desactivado', 'activo'].includes(a.p_estado)) return { ok: false, motivo: 'datos' };
      if (!k) return { ok: false, motivo: 'inexistente' };
      if (k.estado === 'canjeado') return { ok: false, motivo: 'canjeado' };
      if (k.estado !== a.p_estado) k.estado = a.p_estado;
      return { ok: true, codigo: k.codigo, estado: efectivo(k) };
    }
    case 'admin_config': return { ok: true, config: structuredClone(cfg), ahoraISO: iso(ahora()) };
    case 'admin_guardar_config': return guardarConfig(a.p_cambios ?? {});
    case 'admin_cambiar_pin': return cambiarPin(a.p_pin);
    case 'admin_desbloquear_pin':
      fallos = 0; bloqueos = 0; bloqueadoHasta = 0;
      return { ok: true };
    default: throw new ErrorServidor('faltan-funciones', 'Función desconocida en la demo.', 404);
  }
}
