// audio.js — El sonido del juego.
//
//   · INSTRUMENTOS GRABADOS (desde noviembre de 2026, autorizado por el usuario): piano, trompetas, trombón, bajo acústico,
//     campana (agogó) y clave (bloque de madera) suenan con grabaciones reales del banco Fluid R3 (licencia MIT; ver
//     web/assets/sonidos/LICENCIA.txt). Son 32 notas sueltas (~740 KB) que se descargan DESPUÉS del primer toque (no frenan el
//     inicio); para las notas que faltan se cambia la velocidad de la grabación más cercana (máximo ±1 semitono y medio).
//     Mientras cargan, o si fallan, suenan las versiones fabricadas con osciladores (las de antes).
//   · Lo demás se FABRICA con Web Audio (osciladores y ruido): congas, bongó, timbal, güiro, platillo y todos los efectos.
//
//   · Efectos: saltar, carril, aterrizar, fruta (suben de tono), choque, cuenta atrás, meta, perder, clic y una campanita de logro.
//     (Se probaron aplausos y gente alentando sintetizados, pero sonaban a estática: se quitaron. Si se quieren, usar un audio real con licencia.)
//   · Música: una salsa «de Cali»: rápida (168 negras por minuto), con la sección rítmica DENSA que la caracteriza —clave de son 3-2,
//     marcha de las congas en semicorcheas, bongó (martillo), cascarilla y campana del timbal, güiro—, bajo tumbao con la nota
//     anticipada que cruza el compás, montuno (guajeo) de piano en octavas, metales (trompetas y trombón) con riffs de mambo, platillazo
//     y «paila» (redoble) del timbal al cerrar la frase. Dos intensidades: «menu» (suave, sin metales; suena en el
//     inicio y las pantallas) y «juego» (completa). Detalle y fuentes: documentos/salsa-referencia.md
//   · Los navegadores solo dejan sonar después de un TOQUE (en iPhone, el toque tiene que TERMINAR: touchend/click, no basta
//     con pointerdown). `activar()` se llama en todos los toques y teclas hasta que el audio queda en marcha.
//   · Se puede silenciar (botón de sonido en el inicio y en la pausa); se recuerda en este navegador.
import { almacen } from './util.js';

const CLAVE = 'cholado-sonido';
const AC = window.AudioContext || window.webkitAudioContext;
const BPM = 168; // negras por minuto (la salsa bailable anda entre 160 y 220; con 184 al usuario le pareció demasiado rápida)
const DUR16 = 60 / BPM / 4; // duración de una semicorchea
const nota = (midi) => 440 * 2 ** ((midi - 69) / 12);
// La música de fondo: más baja en las pantallas, completa al jugar. (Con las grabaciones llena más: se bajó para dejar aire a
// los efectos. Medido con _renderizar: pico 0,77 jugando, 0,49 en el menú, cero recortes, también con los efectos encima.)
const VOL_MUSICA = { juego: 0.55, menu: 0.36 };

let ctx = null;
let maestro = null;
let bMusica = null;
let bEfectos = null;
let ruidoBuf = null;
let encendido = almacen.leer(CLAVE, true) !== false; // la persona puede apagar todo el sonido
let sonando = false; // el programador de la música está corriendo
let callado = false; // el juego pidió silencio (pausa): ningún toque lo vuelve a prender hasta reanudar()
let modo = 'menu'; // 'menu' (suave) | 'juego' (completa, con metales)
let proximo = 0;
let paso = 0;
let reloj = null;
let seguidas = 0; // frutas seguidas (sube el tono)
let forzarListo = false; // solo para pruebas sin altavoz (_renderizar)

/** Una «sala» pequeña inventada (ruido que se apaga): pega los instrumentos entre sí y le quita lo seco a lo electrónico. */
function respuestaSala() {
  const largo = Math.floor(ctx.sampleRate * 0.55);
  const buf = ctx.createBuffer(2, largo, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / largo) ** 2.6;
  }
  return buf;
}

/* ───────────── Grabaciones de instrumentos (banco Fluid R3, MIT) ───────────── */
const MUESTRAS = {
  piano: { carpeta: 'acoustic_grand_piano', notas: ['B3', 'D4', 'F4', 'Ab4', 'B4', 'D5', 'F5', 'Ab5', 'B5', 'D6'] },
  trompeta: { carpeta: 'trumpet', notas: ['Bb4', 'Db5', 'E5', 'G5', 'Bb5'] },
  trombon: { carpeta: 'trombone', notas: ['Bb3', 'Db4', 'E4', 'G4', 'Bb4'] },
  bajo: { carpeta: 'acoustic_bass', notas: ['C2', 'Eb2', 'Gb2', 'A2', 'C3', 'Eb3', 'Gb3', 'A3'] },
  agogo: { carpeta: 'agogo', notas: ['C5', 'G5'] },
  bloque: { carpeta: 'woodblock', notas: ['C5', 'G5'] },
};
const BASE_SONIDOS = new URL('../assets/sonidos/', import.meta.url);
const bancos = {}; // instrumento → [{ midi, buf, inicio }] (solo cuando ya cargó)
let cargandoMuestras = null;
/** «Ab4» → 68 */
function midiDe(nombre) {
  const [, letra, alt, oct] = /^([A-G])(b?)(-?\d)$/.exec(nombre);
  return 12 * (Number(oct) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letra] - (alt ? 1 : 0);
}
const decodificar = (datos) => new Promise((ok, mal) => {
  const p = ctx.decodeAudioData(datos, ok, mal); // (forma con callbacks: la entienden también los Safari viejos)
  if (p?.then) p.then(ok, mal);
});
/** Descarga y prepara las grabaciones (una sola vez, en segundo plano). */
function cargarMuestras() {
  if (cargandoMuestras || !ctx || typeof fetch !== 'function') return cargandoMuestras;
  cargandoMuestras = Promise.all(Object.entries(MUESTRAS).map(async ([inst, { carpeta, notas }]) => {
    const lista = [];
    for (const n of notas) {
      try {
        const res = await fetch(new URL(`${carpeta}/${n}.mp3`, BASE_SONIDOS));
        if (!res.ok) continue;
        const buf = await decodificar(await res.arrayBuffer());
        // Los MP3 traen un silencio al principio (del codificador): se salta para que el ritmo quede justo
        const d = buf.getChannelData(0);
        let i = 0;
        while (i < d.length && Math.abs(d[i]) < 0.004) i++;
        // Las grabaciones vienen bajitas (pico ~0,1) y cada una distinta: se normalizan a pico 1, así «vol» es el pico real
        let pico = 0;
        for (let k = i; k < d.length; k++) if (Math.abs(d[k]) > pico) pico = Math.abs(d[k]);
        lista.push({ midi: midiDe(n), buf, inicio: Math.max(0, i / buf.sampleRate - 0.002), norma: pico > 0 ? 1 / pico : 1 });
      } catch {
        /* esa nota no cargó: se usa la más cercana (o los osciladores) */
      }
    }
    if (lista.length) bancos[inst] = lista;
  }));
  return cargandoMuestras;
}
/**
 * Toca una grabación: la nota más cercana del banco, con la velocidad ajustada al tono pedido, un ataque cortico y una
 * caída suave al final (para cortar notas largas sin «clic»). Devuelve false si ese instrumento todavía no cargó.
 */
function tocarMuestra(t, inst, midi, { vol, dur, liberar = 0.07, destino = bMusica } = {}) {
  const lista = bancos[inst];
  if (!lista) return false;
  let m = lista[0];
  for (const x of lista) if (Math.abs(x.midi - midi) < Math.abs(m.midi - midi)) m = x;
  const s = ctx.createBufferSource();
  s.buffer = m.buf;
  s.playbackRate.value = 2 ** ((midi - m.midi) / 12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  const v = vol * m.norma;
  g.gain.linearRampToValueAtTime(v, t + 0.003);
  g.gain.setValueAtTime(v, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + liberar);
  s.connect(g);
  g.connect(destino);
  s.start(t, m.inicio);
  s.stop(t + dur + liberar + 0.02);
  return true;
}
/** Un poquito de «mano humana»: ni todas las notas exactas en el tiempo ni todas igual de fuertes (lo que más delata a una máquina). */
const humano = (t, v) => [t + (Math.random() - 0.5) * 0.008, v * (0.88 + Math.random() * 0.24)];

function crear(forzado) {
  if (ctx || !AC) return;
  try {
    ctx = forzado ?? new AC();
  } catch {
    ctx = null;
    return;
  }
  const comp = ctx.createDynamicsCompressor(); // para que varios sonidos juntos no saturen (suave: no aplasta la música)
  comp.threshold.value = -14;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;
  maestro = ctx.createGain();
  maestro.gain.value = encendido ? 0.9 : 0;
  maestro.connect(comp);
  comp.connect(ctx.destination);
  bMusica = ctx.createGain();
  bMusica.gain.value = VOL_MUSICA.menu;
  bMusica.connect(maestro);
  try {
    // La «sala» (reverberación) es lo más pesado de toda la música: en celulares de poca memoria se omite (suena más seca).
    if ((navigator.deviceMemory ?? 8) <= 2) throw new Error('celular de gama baja');
    const conv = ctx.createConvolver();
    conv.buffer = respuestaSala();
    const mojado = ctx.createGain();
    mojado.gain.value = 0.2;
    bMusica.connect(conv);
    conv.connect(mojado);
    mojado.connect(maestro);
  } catch {
    /* sin reverberación: la música suena igual, solo más seca */
  }
  bEfectos = ctx.createGain();
  bEfectos.gain.value = 0.8;
  bEfectos.connect(maestro);
}

const listo = () => forzarListo || (Boolean(ctx) && encendido && ctx.state === 'running');

/** Un tono con envolvente (sube rápido, baja suave). f2 = frecuencia final (glissando). */
function tono({ t = ctx.currentTime, f, f2, dur, tipo = 'sine', vol = 0.3, ataque = 0.004, destino = bEfectos }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(destino);
  o.start(t);
  o.stop(t + dur + 0.03);
}

/** Un soplido de ruido filtrado (golpes, chasquidos, platillos). `ataque` > 0 = sube poco a poco. */
function ruido({ t = ctx.currentTime, dur, vol = 0.3, f = 1200, q = 1, tipo = 'lowpass', ataque = 0, destino = bEfectos }) {
  if (!ruidoBuf) {
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = ruidoBuf;
  s.loop = true;
  const fl = ctx.createBiquadFilter();
  fl.type = tipo;
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = ctx.createGain();
  if (ataque > 0) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + ataque);
  } else {
    g.gain.setValueAtTime(vol, t);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl);
  fl.connect(g);
  g.connect(destino);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.03);
}

/* ───────────── Instrumentos de la salsa (cada uno va a la mezcla de música) ───────────── */
/** Conga: talón (suave y grave), punta (golpecito seco), palmada (cachetada), abierta (tono con cuerpo), grave (golpe fuerte). */
const conga = (t, tipo, v = 1) => {
  const m = bMusica;
  if (tipo === 'grave') {
    tono({ t, f: 150, f2: 96, dur: 0.22, vol: 0.4 * v, destino: m });
    ruido({ t, dur: 0.03, vol: 0.1 * v, f: 900, q: 1, tipo: 'bandpass', destino: m });
  } else if (tipo === 'abierta') {
    tono({ t, f: 275, f2: 225, dur: 0.18, vol: 0.34 * v, destino: m });
    tono({ t, f: 540, f2: 450, dur: 0.08, vol: 0.09 * v, destino: m });
    ruido({ t, dur: 0.02, vol: 0.09 * v, f: 2400, q: 1, tipo: 'bandpass', destino: m });
  } else if (tipo === 'palmada') {
    ruido({ t, dur: 0.07, vol: 0.3 * v, f: 2200, q: 1.5, tipo: 'bandpass', destino: m });
    tono({ t, f: 330, f2: 260, dur: 0.05, vol: 0.15 * v, destino: m });
  } else if (tipo === 'talon') {
    tono({ t, f: 125, f2: 92, dur: 0.1, vol: 0.2 * v, destino: m });
  } else {
    tono({ t, f: 235, f2: 195, dur: 0.035, vol: 0.09 * v, destino: m }); // punta
    ruido({ t, dur: 0.012, vol: 0.05 * v, f: 2600, q: 1, tipo: 'bandpass', destino: m });
  }
};
const bongo = (t, agudo, v = 1) => {
  tono({ t, f: agudo ? 540 : 390, f2: agudo ? 480 : 345, dur: 0.075, vol: 0.2 * v, destino: bMusica });
  ruido({ t, dur: 0.02, vol: 0.09 * v, f: 3200, q: 1, tipo: 'bandpass', destino: bMusica });
};
const cascara = (t, v = 1) => {
  ruido({ t, dur: 0.05, vol: 0.13 * v, f: 4200, q: 2, tipo: 'bandpass', destino: bMusica });
  tono({ t, f: 1480, dur: 0.035, vol: 0.05 * v, destino: bMusica });
};
/** Cencerro: dos cuadradas desafinadas (el «tin-tin» de la campana); `f` = más agudo (campana del timbal) o más grave (la del bongocero). */
const campana = (t, v = 1, f = 562) => {
  const [th, vh] = humano(t, 0.16 * v);
  if (tocarMuestra(th, 'agogo', 69 + 12 * Math.log2(f / 440), { vol: vh, dur: 0.12 })) return; // agogó afinado a la campana pedida
  tono({ t, f, dur: 0.12, tipo: 'square', vol: 0.05 * v, destino: bMusica });
  tono({ t, f: f * 1.5, dur: 0.1, tipo: 'square', vol: 0.04 * v, destino: bMusica });
  ruido({ t, dur: 0.015, vol: 0.06 * v, f: 3000, q: 1, tipo: 'highpass', destino: bMusica });
};
const clave = (t, v = 1) => {
  if (tocarMuestra(t, 'bloque', 81, { vol: 0.3 * v, dur: 0.09 })) return; // (el bloque de madera, un poco más agudo: suena a claves)
  tono({ t, f: 1850, dur: 0.05, vol: 0.2 * v, destino: bMusica });
  tono({ t, f: 2500, dur: 0.03, vol: 0.08 * v, destino: bMusica });
};
const guiro = (t, v = 1) => ruido({ t, dur: 0.045, vol: 0.05 * v, f: 6500, q: 1, tipo: 'highpass', destino: bMusica });
/** Golpe de timbal (para los redobles o «paila» del cierre de frase). */
const timbal = (t, v = 1) => {
  tono({ t, f: 330, f2: 270, dur: 0.07, vol: 0.28 * v, destino: bMusica });
  ruido({ t, dur: 0.035, vol: 0.14 * v, f: 1700, q: 1, tipo: 'bandpass', destino: bMusica });
};
/** Platillazo al empezar la frase. */
const platillo = (t, v = 1) => ruido({ t, dur: 0.7, vol: 0.12 * v, f: 5200, q: 0.5, tipo: 'highpass', destino: bMusica });
/** Bajo eléctrico: sierra con filtro que se cierra + una onda grave debajo. */
const bajo = (t, midi, dur, vol) => {
  if (tocarMuestra(t, 'bajo', midi, { vol: vol * 1.1, dur, liberar: 0.05 })) return;
  const f = nota(midi);
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f, t);
  const fl = ctx.createBiquadFilter();
  fl.type = 'lowpass';
  fl.Q.value = 2;
  fl.frequency.setValueAtTime(900, t);
  fl.frequency.exponentialRampToValueAtTime(260, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl);
  fl.connect(g);
  g.connect(bMusica);
  o.start(t);
  o.stop(t + dur + 0.04);
  tono({ t, f, dur, vol: vol * 0.7, destino: bMusica });
};
/** Los armónicos 2.º a 5.º del piano en UNA sola onda (antes eran 4 osciladores por nota: el guajeo en octavas creaba ~10 por golpe). */
let ondaPiano = null;
const armonicosPiano = () => {
  if (!ondaPiano) {
    const real = new Float32Array([0, 0, 0.5, 0.26, 0.14, 0.07]);
    ondaPiano = ctx.createPeriodicWave(real.map(() => 0), real, { disableNormalization: true });
  }
  return ondaPiano;
};
/** Piano: la nota + sus armónicos (que se apagan antes) + el golpe del martillo. */
const piano = (t, midi, vol = 0.14, dur = 0.3) => {
  const [th, vh] = humano(t, vol);
  if (tocarMuestra(th, 'piano', midi, { vol: vh * 1.6, dur: dur * 1.15, liberar: 0.12 })) return;
  const f = nota(midi);
  tono({ t, f, dur, vol, ataque: 0.002, destino: bMusica });
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.setPeriodicWave(armonicosPiano());
  o.frequency.setValueAtTime(f, t);
  const durA = dur / 1.8; // en promedio, los armónicos duraban ~la mitad de la nota
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durA);
  o.connect(g);
  g.connect(bMusica);
  o.start(t);
  o.stop(t + durA + 0.03);
  ruido({ t, dur: 0.02, vol: 0.04, f: 2600, q: 0.7, tipo: 'highpass', destino: bMusica });
};
/**
 * Metales: tres sierras desafinadas por nota, con un filtro que se abre al atacar (el «¡bláaa!» de la trompeta).
 * Las tres sierras de una nota comparten UN filtro y UNA ganancia (antes cada una tenía los suyos): suena igual y crea
 * la mitad de piezas, que es lo que más pesa en un celular de gama baja.
 */
const metales = (t, midis, dur, vol) => {
  // Con grabaciones: trompetas arriba y trombón en las notas graves (como en una orquesta de salsa caleña)
  if (bancos.trompeta && bancos.trombon) {
    for (const midi of midis) {
      const [th, vh] = humano(t, vol);
      tocarMuestra(th, midi >= 70 ? 'trompeta' : 'trombon', midi, { vol: vh * 3.3, dur: Math.max(0.09, dur * 0.85), liberar: 0.06 });
    }
    return;
  }
  for (const midi of midis) {
    const f = nota(midi);
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.Q.value = 1.2;
    fl.frequency.setValueAtTime(700, t);
    fl.frequency.linearRampToValueAtTime(3300, t + 0.04);
    fl.frequency.exponentialRampToValueAtTime(1500, t + Math.max(0.1, dur));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.014);
    g.gain.setValueAtTime(vol, t + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    fl.connect(g);
    g.connect(bMusica);
    for (const det of [-7, 0, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.detune.value = det;
      o.connect(fl);
      o.start(t);
      o.stop(t + dur + 0.08);
    }
  }
};

/* ───────────── La canción: 8 compases (128 semicorcheas) ─────────────
   Parte A (compases 1-4): clave, cascarilla, marcha de congas, martillo del bongó, güiro, bajo tumbao y guajeo de piano.
   Parte B (compases 5-8): la cascarilla pasa a la campana y entran los metales con riffs de mambo (solo en «juego»).
   Armonía: Re menor 7 → Sol 7 → Do mayor 7 → La 7 (el giro típico), dos veces.
   Lo que cada instrumento toca sale de las descripciones de documentos/salsa-referencia.md. */
const ACORDES = [
  { raiz: 38, notas: [62, 65, 69, 72] }, // Re menor 7
  { raiz: 43, notas: [59, 62, 65, 67] }, // Sol 7
  { raiz: 36, notas: [60, 64, 67, 71] }, // Do mayor 7
  { raiz: 45, notas: [61, 64, 67, 69] }, // La 7
];
const CLAVE_SON = new Set([0, 6, 12, 20, 24]); // clave de son 3-2 en 2 compases (32 semicorcheas)
const CASCARA = new Set([0, 6, 12, 18, 20, 24, 30]); // cascarilla del timbal que sigue la clave 3-2
// Marcha de las congas (se repite cada 2 tiempos = 8 semicorcheas): talón, punta, palmada en el «y», punta, talón, punta, abiertas en el «y» y el «a» del 2
const MARCHA = ['talon', 'punta', 'palmada', 'punta', 'talon', 'punta', 'abierta', 'abierta'];
// Guajeo de piano de 2 compases: [semicorchea, nota del acorde (0-3)]; se toca en octavas
const GUAJEO = [
  [[2, 2], [5, 0], [8, 3], [10, 1], [13, 0]],
  [[0, 2], [3, 1], [6, 0], [8, 1], [11, 2], [14, 3]],
];
// Metales de la parte B: [semicorchea dentro del compás, duración en semicorcheas]
const RIFFS = [
  [[0, 3], [3, 2], [6, 2], [10, 2], [14, 2]],
  [[0, 6], [8, 2], [12, 2], [14, 2]],
  [[0, 3], [3, 2], [6, 2], [10, 2], [14, 2]],
  [[0, 4], [6, 2], [10, 2], [12, 4]],
];

function paso_(t, s) {
  const compas = Math.floor(s / 16) % 8;
  const pos = s % 16;
  const ac = ACORDES[compas % 4];
  const siguiente = ACORDES[(compas + 1) % 4]; // el bajo anticipa el acorde que viene
  const B = compas >= 4;
  const juego = modo === 'juego';
  const fuerte = juego ? 1 : 0.75;

  if (CLAVE_SON.has(s % 32)) clave(t, juego ? 1 : 0.6);
  if (B && juego) {
    if (pos % 4 === 0) campana(t, pos % 8 === 0 ? 1.3 : 0.7, 560); // la campana del bongocero: acentúa el 1 y el 3
    if (CASCARA.has(s % 32)) campana(t, 0.9, 790); // la campana del timbal sigue la clave
  } else if (CASCARA.has(s % 32)) {
    cascara(t, fuerte);
  }
  if (pos % 2 === 0) guiro(t, pos % 8 === 0 ? 1.6 : 1);
  conga(t, MARCHA[pos % 8], fuerte); // las congas nunca paran
  if (juego && !B && pos % 2 === 0) bongo(t, pos % 4 === 2, pos === 6 || pos === 14 ? 1.2 : 0.7); // martillo del bongó
  // bajo tumbao: sin golpe en el 1; «y» del 2 (bombo) y el 4 (ponche), que se alarga cruzando el compás y ya es el acorde siguiente
  if (pos === 6) bajo(t, ac.raiz, 0.28, 0.5);
  if (pos === 12) bajo(t, siguiente.raiz + 12, 0.5, 0.5);
  // guajeo de piano en octavas
  for (const [p0, idx] of GUAJEO[compas % 2]) {
    if (p0 === pos) {
      piano(t, ac.notas[idx], 0.11, 0.22);
      piano(t, ac.notas[idx] + 12, 0.08, 0.2);
    }
  }
  // metales (solo parte B del juego): riff de mambo, trompetas arriba y trombón abajo; platillazo y redoble de cierre
  if (B && juego) {
    for (const [p0, largo] of RIFFS[compas - 4]) {
      if (p0 === pos) {
        const durS = largo * DUR16 * 0.9;
        metales(t, [ac.notas[0] + 12, ac.notas[1] + 12, ac.notas[2] + 12], durS, 0.045);
        metales(t, [ac.raiz + 24], durS, 0.05);
      }
    }
  }
  if (pos === 0 && (compas === 0 || compas === 4)) platillo(t, juego ? 1 : 0.5);
  if (juego && (compas === 3 || compas === 7) && pos >= 12) timbal(t, 0.7 + (pos - 12) * 0.2); // la «paila»: redoble de timbal al cerrar la frase
}

function programar() {
  if (!listo()) return;
  if (proximo < ctx.currentTime - 0.1) proximo = ctx.currentTime + 0.05; // si estuvo callado un rato, no se atropella
  while (proximo < ctx.currentTime + 0.16) {
    paso_(proximo, paso);
    proximo += DUR16;
    paso = (paso + 1) % 128;
  }
}

function iniciarMusica() {
  if (!ctx || sonando) return;
  sonando = true;
  paso = 0;
  proximo = ctx.currentTime + 0.1;
  bMusica.gain.cancelScheduledValues(ctx.currentTime);
  bMusica.gain.setTargetAtTime(VOL_MUSICA[modo], ctx.currentTime, 0.05);
  reloj = setInterval(programar, 40);
}

/* ───────────── API pública ───────────── */
export const audio = {
  /** Llamar en cada toque (touchend, click, pointerup, pointerdown, tecla) hasta que el audio esté en marcha. */
  activar() {
    crear();
    if (!ctx) return;
    // En pausa NO se vuelve a prender con cualquier toque (antes, tocar el botón de sonido en la pausa reanudaba la música)
    if (ctx.state !== 'running' && !document.hidden && !callado) {
      try {
        ctx.resume?.()?.catch?.(() => {});
        // truco de iPhone: reproducir un instante de silencio DENTRO del toque termina de desbloquear el audio
        const b = ctx.createBuffer(1, 1, 22050);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(ctx.destination);
        s.start(0);
      } catch {
        /* se reintenta en el próximo toque */
      }
    }
    iniciarMusica();
    if (ctx.state === 'running') cargarMuestras(); // en segundo plano, ya con el audio desbloqueado
  },
  /** Para las pruebas y el diagnóstico: ¿qué instrumentos grabados ya cargaron? */
  get grabaciones() {
    return Object.keys(bancos);
  },
  get encendido() {
    return encendido;
  },
  /** Para el modo debug y el diagnóstico: 'sin-contexto' | 'suspended' | 'running' | 'interrupted'... */
  get estado() {
    return ctx ? ctx.state : 'sin-contexto';
  },
  /** Prende o apaga todo el sonido; devuelve el nuevo estado. */
  alternar() {
    encendido = !encendido;
    almacen.escribir(CLAVE, encendido);
    crear();
    if (maestro) maestro.gain.setTargetAtTime(encendido ? 0.9 : 0, ctx.currentTime, 0.05);
    if (encendido) this.click();
    return encendido;
  },
  /** La música cambia de intensidad sin cortarse: 'menu' (suave) o 'juego' (completa, con metales). */
  musica(nuevoModo) {
    modo = nuevoModo === 'juego' ? 'juego' : 'menu';
    if (ctx && bMusica) bMusica.gain.setTargetAtTime(VOL_MUSICA[modo], ctx.currentTime, 0.4);
    if (ctx && !sonando) iniciarMusica();
  },
  /** Pausa todo el audio (pausa del juego, o pantalla apagada / otra app). */
  pausar() {
    callado = true;
    try {
      if (ctx && ctx.state === 'running') ctx.suspend?.()?.catch?.(() => {});
    } catch {
      /* contexto de prueba o navegador raro: no pasa nada */
    }
  },
  reanudar() {
    callado = false;
    try {
      if (ctx && ctx.state !== 'running' && !document.hidden) ctx.resume?.()?.catch?.(() => {});
    } catch {
      /* igual */
    }
  },
  /**
   * SOLO PARA PRUEBAS: dibuja la canción (y los efectos que se pidan) sin altavoz y devuelve el audio, para medir niveles y revisar
   * que no haya errores. `opciones`: { musica: true, efectos: ['meta', 'logro'] }.
   */
  async _renderizar(segundos = 12, modoPrueba = 'juego', opciones = {}) {
    if (ctx) await cargarMuestras(); // (las grabaciones se decodifican con el contexto real y sirven en cualquier otro)
    const antes = { ctx, maestro, bMusica, bEfectos, ruidoBuf, modo };
    ctx = null;
    ruidoBuf = null;
    crear(new OfflineAudioContext(2, Math.ceil(44100 * segundos), 44100));
    modo = modoPrueba;
    forzarListo = true;
    bMusica.gain.value = VOL_MUSICA[modo];
    if (opciones.musica !== false) for (let i = 0; i * DUR16 < segundos - 0.2; i++) paso_(0.05 + i * DUR16, i % 128);
    for (const e of opciones.efectos ?? []) audio[e]();
    const buf = await ctx.startRendering();
    forzarListo = false;
    ({ ctx, maestro, bMusica, bEfectos, ruidoBuf, modo } = antes);
    return buf;
  },
  /** Un pitido de prueba (la página /diagnostico/ lo usa para ver si el celular deja sonar). */
  prueba() {
    crear();
    if (!ctx) return false;
    this.activar();
    tono({ f: 660, dur: 0.25, tipo: 'triangle', vol: 0.4 });
    tono({ t: ctx.currentTime + 0.18, f: 880, dur: 0.3, tipo: 'triangle', vol: 0.4 });
    return true;
  },

  click() {
    if (!listo()) return;
    tono({ f: 720, f2: 560, dur: 0.06, vol: 0.12 });
  },
  salto() {
    if (!listo()) return;
    tono({ f: 330, f2: 780, dur: 0.15, vol: 0.2 });
  },
  carril() {
    if (!listo()) return;
    ruido({ dur: 0.07, vol: 0.07, f: 2600, q: 0.7, tipo: 'bandpass' });
  },
  aterrizo() {
    if (!listo()) return;
    tono({ f: 120, f2: 60, dur: 0.1, vol: 0.22 });
  },
  /** Cada fruta seguida suena más aguda (escala pentatónica); si pasa un rato sin recoger, vuelve a empezar. */
  fruta() {
    if (!listo()) return;
    const escala = [0, 2, 4, 7, 9, 12, 14, 16];
    const grado = escala[Math.min(seguidas, escala.length - 1)];
    seguidas++;
    clearTimeout(audio._olvido);
    audio._olvido = setTimeout(() => (seguidas = 0), 900);
    const f = nota(79 + grado);
    tono({ f, dur: 0.18, vol: 0.2 });
    tono({ f: f * 2, dur: 0.1, vol: 0.07 });
  },
  choque() {
    if (!listo()) return;
    ruido({ dur: 0.32, vol: 0.5, f: 900 });
    tono({ f: 170, f2: 45, dur: 0.3, tipo: 'triangle', vol: 0.5 });
    seguidas = 0;
  },
  cuenta() {
    if (!listo()) return;
    tono({ f: 520, dur: 0.16, tipo: 'triangle', vol: 0.25 });
  },
  ya() {
    if (!listo()) return;
    tono({ f: 780, dur: 0.4, tipo: 'triangle', vol: 0.28 });
    tono({ f: 1040, dur: 0.4, tipo: 'triangle', vol: 0.2 });
  },
  /** Llegaste a las frutas mínimas (o a la mitad del camino): dos o tres notitas que suben, como una campanita de logro. */
  logro(grande = true) {
    if (!listo()) return;
    const t0 = ctx.currentTime;
    (grande ? [79, 84, 88] : [79, 84]).forEach((m, i) => {
      tono({ t: t0 + i * 0.09, f: nota(m), dur: 0.3, tipo: 'triangle', vol: 0.22 });
      tono({ t: t0 + i * 0.09, f: nota(m + 12), dur: 0.16, vol: 0.06 });
    });
  },
  /** Llegó a la meta: arpegio ascendente con campana. */
  meta() {
    if (!listo()) return;
    const t0 = ctx.currentTime;
    [72, 76, 79, 84, 88, 91].forEach((m, i) => {
      tono({ t: t0 + i * 0.09, f: nota(m), dur: 0.35, tipo: 'triangle', vol: 0.24 });
      tono({ t: t0 + i * 0.09, f: nota(m + 12), dur: 0.2, vol: 0.06 });
    });
    tono({ t: t0 + 0.55, f: 540, dur: 0.25, tipo: 'square', vol: 0.07 });
    tono({ t: t0 + 0.55, f: 812, dur: 0.22, tipo: 'square', vol: 0.06 });
  },
  perdio() {
    if (!listo()) return;
    const t0 = ctx.currentTime;
    [[392, 330, 0], [330, 262, 0.27], [262, 196, 0.56]].forEach(([a, b, d]) => tono({ t: t0 + d, f: a, f2: b, dur: d > 0.5 ? 0.6 : 0.26, tipo: 'triangle', vol: 0.3 }));
  },
};
