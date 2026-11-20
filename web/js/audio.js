// audio.js — El sonido del juego.
//
//   · MÚSICA: una salsa ORIGINAL al estilo caleño (ver «La canción», más abajo), tocada casi toda con GRABACIONES reales del
//     banco Fluid R3 (licencia MIT; ver web/assets/sonidos/LICENCIA.txt): piano, trompetas, trombones y bajo acústico (notas
//     sueltas en MP3) + congas, tumba, bongó, timbales, campana, clave, güiro, maracas y platillo (golpes en WAV). En total ~1 MB,
//     que se descarga DESPUÉS del primer toque (no frena el inicio). Mientras carga, o si algo falla, ese instrumento suena con
//     osciladores (las versiones de antes). Cada instrumento va un poco a la izquierda o a la derecha, como en una tarima.
//   · EFECTOS (saltar, carril, aterrizar, fruta, choque, cuenta atrás, meta, perder, clic, logro): fabricados con osciladores.
//   · Los navegadores solo dejan sonar después de un TOQUE (en iPhone, el toque tiene que TERMINAR: touchend/click, no basta
//     con pointerdown). `activar()` se llama en todos los toques y teclas hasta que el audio queda en marcha.
//   · Se puede silenciar (botón de sonido en el inicio y en la pausa); se recuerda en este navegador.
import { almacen } from './util.js';

const CLAVE = 'cholado-sonido';
const AC = window.AudioContext || window.webkitAudioContext;
const BPM = 174; // negras por minuto (la salsa caleña es rápida; con 184 al usuario le pareció demasiado)
const DUR16 = 60 / BPM / 4; // duración de una semicorchea
const nota = (midi) => 440 * 2 ** ((midi - 69) / 12);
// La música de fondo: más baja en las pantallas, completa al jugar. Medido con _renderizar (canción nueva, todo grabado):
// pico ~0,76 jugando, ~0,36 en el menú, cero recortes, también con los efectos encima. No subirlo: en celulares satura.
const VOL_MUSICA = { juego: 0.5, menu: 0.36 };

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
  // Percusión latina sacada del banco completo (FluidR3_GM.sf2): un golpe por archivo, en WAV
  ...Object.fromEntries([['conga', 'conga'], ['tumba', 'tumba'], ['bongoAlto', 'bongo-alto'], ['bongoBajo', 'bongo-bajo'], ['timbalAlto', 'timbal-alto'],
    ['timbalBajo', 'timbal-bajo'], ['cencerro', 'cencerro'], ['clave', 'clave'], ['guiroLargo', 'guiro-largo'], ['guiroCorto', 'guiro-corto'],
    ['maracas', 'maracas'], ['platillo', 'platillo']].map(([inst, archivo]) => [inst, { carpeta: 'percusion', notas: [archivo], wav: true }])),
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
  cargandoMuestras = Promise.all(Object.entries(MUESTRAS).map(async ([inst, { carpeta, notas, wav }]) => {
    const lista = [];
    for (const n of notas) {
      try {
        const res = await fetch(new URL(`${carpeta}/${n}.${wav ? 'wav' : 'mp3'}`, BASE_SONIDOS));
        if (!res.ok) continue;
        const buf = await decodificar(await res.arrayBuffer());
        // Los MP3 traen un silencio al principio (del codificador): se salta para que el ritmo quede justo
        const d = buf.getChannelData(0);
        let i = 0;
        while (i < d.length && Math.abs(d[i]) < 0.004) i++;
        // Las grabaciones vienen bajitas (pico ~0,1) y cada una distinta: se normalizan a pico 1, así «vol» es el pico real
        let pico = 0;
        for (let k = i; k < d.length; k++) if (Math.abs(d[k]) > pico) pico = Math.abs(d[k]);
        lista.push({ midi: wav ? 60 : midiDe(n), buf, inicio: Math.max(0, i / buf.sampleRate - 0.002), norma: pico > 0 ? 1 / pico : 1 });
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
function tocarMuestra(t, inst, midi, { vol, dur, liberar = 0.07, destino = bMusica, pan = 0, tasa = 1 } = {}) {
  const lista = bancos[inst];
  if (!lista) return false;
  let m = lista[0];
  for (const x of lista) if (Math.abs(x.midi - midi) < Math.abs(m.midi - midi)) m = x;
  const s = ctx.createBufferSource();
  s.buffer = m.buf;
  s.playbackRate.value = tasa * 2 ** ((midi - m.midi) / 12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  const v = vol * m.norma;
  g.gain.linearRampToValueAtTime(v, t + 0.003);
  g.gain.setValueAtTime(v, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + liberar);
  s.connect(g);
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner(); // cada instrumento en su lugar de la «tarima» (izquierda/derecha)
    p.pan.value = pan;
    g.connect(p);
    p.connect(destino);
  } else {
    g.connect(destino);
  }
  s.start(t, m.inicio);
  s.stop(t + dur + liberar + 0.02);
  return true;
}
/** Un poquito de «mano humana»: ni todas las notas exactas en el tiempo ni todas igual de fuertes (lo que más delata a una máquina). */
const humano = (t, v) => [t + (Math.random() - 0.5) * 0.008, v * (0.88 + Math.random() * 0.24)];
/** Un golpe de percusión grabado (con su mano humana). Si esa grabación no ha cargado, se usa `siNo` (los osciladores). */
function golpe(t, inst, vol, { tasa = 1, dur = 0.5, pan = 0 } = {}, siNo = null) {
  const [th, vh] = humano(t, vol);
  if (!tocarMuestra(th, inst, 60, { vol: vh, dur, liberar: 0.04, pan, tasa })) siNo?.();
}

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
  tono({ t, f, dur: 0.12, tipo: 'square', vol: 0.05 * v, destino: bMusica });
  tono({ t, f: f * 1.5, dur: 0.1, tipo: 'square', vol: 0.04 * v, destino: bMusica });
  ruido({ t, dur: 0.015, vol: 0.06 * v, f: 3000, q: 1, tipo: 'highpass', destino: bMusica });
};
const clave = (t, v = 1) => {
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

/** Trompetas (grabadas): `d` en semicorcheas. Dos voces van un poco a la derecha, como en la tarima. */
function trompetas(t, midis, d, vol) {
  const dur = Math.max(0.08, d * DUR16 * 0.88);
  if (!bancos.trompeta) return metales(t, midis, dur, vol);
  midis.forEach((n, i) => {
    const [th, vh] = humano(t, vol * 3.3);
    tocarMuestra(th, 'trompeta', n, { vol: i ? vh * 0.8 : vh, dur, liberar: 0.06, pan: i ? 0.4 : 0.2 });
  });
}
/** Trombones (grabados), un poco a la izquierda. */
function trombones(t, midis, d, vol) {
  const dur = Math.max(0.08, d * DUR16 * 0.88);
  if (!bancos.trombon) return metales(t, midis, dur, vol);
  midis.forEach((n) => {
    const [th, vh] = humano(t, vol * 3.3);
    tocarMuestra(th, 'trombon', n, { vol: vh, dur, liberar: 0.07, pan: -0.3 });
  });
}
/** Conga fabricada (solo mientras cargan las grabaciones). */
const congaSintetica = (t, pos, f) => conga(t, { 0: 'talon', 4: 'palmada', 8: 'talon', 12: 'abierta', 14: 'grave' }[pos] ?? 'punta', f);

/* ───────────── La canción (noviembre de 2026): una salsa ORIGINAL al estilo caleño ─────────────
   Pedido del usuario: que suene a la salsa que se oye en Cali (Grupo Niche, Guayacán…) y con instrumentos de verdad. No copia la
   melodía de ninguna canción (tienen derechos de autor): toma la FORMA y el sabor de esas orquestas.
     · 32 compases en La menor, a 174 negras por minuto (la salsa caleña es rápida; 184 se sentía demasiado), clave de son 2-3.
     · A (1-8): tema de las trompetas en terceras, piano montuno, bajo tumbao, congas, bongó «martillo», cáscara, güiro y clave.
     · B (9-16): el «coro» lo cantan las trompetas (frase de 2 compases que se repite) y entran las maracas.
     · C (17-24): MAMBO — los trombones con un riff grave, las trompetas con golpes cortos y la campana de mambo; platillazo al entrar.
     · D (25-32): MOÑA — una contramelodía aguda de trompetas sobre notas largas de los trombones; cierra con la «paila» del timbal.
   En el menú suena solo A y B, más suave y sin golpes de metales. Casi todo son GRABACIONES (Fluid R3, MIT); si algo no ha
   cargado, ese instrumento suena con los osciladores de antes. */
const COMPASES = 32;
const ARMONIA = [ // un acorde por compás, ciclo de 8: Am · Dm · G7 · Cmaj7 · Fmaj7 · Dm7 · E7 · E7
  { raiz: 45, quinta: 52, notas: [57, 60, 64, 69] },
  { raiz: 38, quinta: 45, notas: [57, 62, 65, 69] },
  { raiz: 43, quinta: 50, notas: [55, 59, 62, 65] },
  { raiz: 36, quinta: 43, notas: [55, 59, 60, 64] },
  { raiz: 41, quinta: 48, notas: [53, 57, 60, 64] },
  { raiz: 38, quinta: 45, notas: [53, 57, 60, 62] },
  { raiz: 40, quinta: 47, notas: [56, 59, 62, 64] },
  { raiz: 40, quinta: 47, notas: [56, 59, 62, 68] },
];
// Tema de la sección A: [compás, semicorchea, nota MIDI, duración en semicorcheas] (original)
const TEMA = [
  [0, 0, 76, 2], [0, 2, 77, 2], [0, 4, 76, 3], [0, 7, 72, 3], [0, 10, 69, 2], [0, 12, 72, 4],
  [1, 2, 74, 2], [1, 4, 77, 3], [1, 7, 74, 3], [1, 10, 72, 2], [1, 12, 69, 4],
  [2, 0, 71, 2], [2, 2, 74, 2], [2, 4, 77, 3], [2, 7, 76, 3], [2, 10, 74, 2], [2, 12, 71, 4],
  [3, 2, 72, 2], [3, 4, 76, 4], [3, 8, 79, 4], [3, 12, 76, 4],
  [4, 0, 77, 3], [4, 3, 76, 3], [4, 6, 72, 2], [4, 8, 69, 4], [4, 12, 72, 2], [4, 14, 74, 2],
  [5, 0, 77, 4], [5, 4, 74, 2], [5, 6, 72, 2], [5, 8, 74, 4], [5, 12, 76, 4],
  [6, 0, 76, 2], [6, 2, 80, 2], [6, 4, 83, 4], [6, 8, 80, 2], [6, 10, 76, 2], [6, 12, 74, 4],
  [7, 0, 71, 6], [7, 8, 76, 2], [7, 10, 74, 2], [7, 12, 71, 2], [7, 14, 68, 2],
];
// El «coro» (sección B): frase de 2 compases que se repite 4 veces; la última vez sube un poco (sobre el E7)
const CORO = [[0, 0, 81, 3], [0, 3, 79, 3], [0, 6, 77, 2], [0, 8, 76, 4], [0, 12, 74, 2], [0, 14, 76, 2], [1, 0, 72, 6], [1, 8, 69, 2], [1, 10, 72, 2], [1, 12, 74, 4]];
// Mambo (sección C): golpes de las trompetas [semicorchea, duración] y riff grave de los trombones [semicorchea, salto desde la raíz, duración]
const GOLPES = [[0, 2], [3, 2], [6, 1], [7, 2], [10, 2], [12, 3]];
const RIFF = [[0, 12, 3], [3, 19, 2], [6, 12, 2], [8, 15, 2], [10, 17, 2], [12, 19, 4]];
// Moña (sección D): contramelodía aguda, un motivo por compás que sigue al acorde [semicorchea, índice de nota del acorde, duración]
const MONA = [[0, 3, 2], [2, 2, 2], [4, 3, 3], [8, 1, 2], [10, 2, 2], [12, 3, 4]];
// Clave de son 2-3 en 2 compases (32 semicorcheas): «2» = tiempos 2 y 3; «3» = 1, 2 y medio y 4
const CLAVE_23 = new Set([4, 8, 16, 22, 28]);
// Cáscara del timbal (la cascarita sobre el casco), en 2-3
const CASCARA_23 = new Set([0, 2, 4, 6, 8, 11, 12, 14, 16, 18, 20, 22, 26, 28, 30]);
// Montuno de piano (2 compases, en corcheas): [corchea, grado del acorde (0-3), con octava]
const MONTUNO = [[1, 0, true], [3, 1, false], [4, 2, true], [6, 1, false], [8, 3, true], [9, 2, false], [11, 1, true], [12, 0, false], [14, 2, true]];

/** La tercera de abajo dentro de la escala de La menor (con sol sostenido sobre el E7): para que las trompetas suenen en armonía. */
function terceraAbajo(midi, compas) {
  const escala = compas % 8 >= 6 ? [9, 11, 0, 2, 4, 5, 8] : [9, 11, 0, 2, 4, 5, 7];
  let n = midi - 1;
  let pasos = 0;
  while (n > midi - 6) {
    if (escala.includes(((n % 12) + 12) % 12)) pasos++;
    if (pasos === 2) return n;
    n--;
  }
  return midi - 3;
}

/** Una semicorchea de la canción. `s` = semicorchea desde el principio de la canción. */
function paso_(t, s) {
  const compas = Math.floor(s / 16) % COMPASES;
  const pos = s % 16;
  const ac = ARMONIA[compas % 8];
  const sig = ARMONIA[(compas + 1) % 8];
  const seccion = compas < 8 ? 'A' : compas < 16 ? 'B' : compas < 24 ? 'C' : 'D';
  const juego = modo === 'juego';
  const f = juego ? 1 : 0.7; // el menú, más suave
  const fuerte = seccion === 'C' || seccion === 'D';

  // ── Percusión ──
  if (CLAVE_23.has(s % 32)) golpe(t, 'clave', 0.32 * f, { pan: 0.1 }, () => clave(t, f));
  // Congas (tumbao): talón y punta suaves, palmada en el 2, abiertas en el 4 y su «y»
  const conga = { 0: ['tumba', 0.18, 0.9, 0.06], 2: ['conga', 0.14, 1.35, 0.04], 4: ['conga', 0.42, 1.12, 0.07], 6: ['conga', 0.14, 1.35, 0.04],
    8: ['tumba', 0.18, 0.9, 0.06], 10: ['conga', 0.14, 1.35, 0.04], 12: ['conga', 0.5, 1, 0.3], 14: ['tumba', 0.55, 1, 0.3] }[pos];
  if (conga) golpe(t, conga[0], conga[1] * f * (fuerte ? 1.1 : 1), { tasa: conga[2], dur: conga[3], pan: -0.3 }, () => congaSintetica(t, pos, f));
  if (fuerte && pos === 15) golpe(t, 'conga', 0.4 * f, { dur: 0.25, pan: -0.3 }); // en el mambo, un golpe abierto más
  if (seccion === 'A' || seccion === 'B') {
    // bongó «martillo» en corcheas (agudo; el grave al final del compás)
    if (juego && pos % 2 === 0) golpe(t, pos === 14 ? 'bongoBajo' : 'bongoAlto', (pos === 4 || pos === 12 ? 0.42 : 0.26) * f, { pan: 0.35 }, () => bongo(t, pos !== 14, 0.7));
    // cáscara del timbal sobre el casco (golpecito corto y agudo)
    if (CASCARA_23.has(s % 32)) golpe(t, 'timbalAlto', 0.12 * f, { tasa: 1.7, dur: 0.035, pan: 0.45 }, () => cascara(t, f));
  } else {
    // campana de mambo en negras (abierta en el 1 y el 3, cerrada en el 2 y el 4) + la del bongocero
    if (pos % 4 === 0) golpe(t, 'cencerro', (pos % 8 === 0 ? 0.5 : 0.34) * f, { tasa: pos % 8 === 0 ? 1 : 1.12, pan: 0.25 }, () => campana(t, 1, 560));
    if (pos % 4 === 2) golpe(t, 'cencerro', 0.18 * f, { tasa: 1.25, dur: 0.05, pan: 0.25 });
  }
  // güiro: largo en cada tiempo, cortico en el «y»
  if (pos % 4 === 0) golpe(t, 'guiroLargo', 0.16 * f, { dur: 0.13, pan: -0.45 }, () => guiro(t, 1.4));
  else if (pos % 4 === 2) golpe(t, 'guiroCorto', 0.13 * f, { dur: 0.06, pan: -0.45 }, () => guiro(t, 1));
  if (seccion === 'B' && pos % 2 === 0) golpe(t, 'maracas', (pos % 4 === 0 ? 0.16 : 0.1) * f, { pan: -0.2 });
  // platillazo al empezar el tema y el mambo; «paila» (redoble del timbal) al cerrar cada sección
  if (pos === 0 && (compas === 0 || compas === 16)) golpe(t, 'platillo', (juego ? 0.32 : 0.16), { dur: 1.1, pan: 0.3 }, () => platillo(t, juego ? 1 : 0.5));
  if (juego && compas % 8 === 7 && pos >= 8) golpe(t, pos % 2 ? 'timbalBajo' : 'timbalAlto', (0.22 + (pos - 8) * 0.04), { dur: 0.12, pan: 0.4 }, () => timbal(t, 0.7));

  // ── Bajo tumbao: en el «y» del 2 (la quinta) y en el 4, anticipando la raíz del acorde que viene ──
  if (pos === 6) bajo(t, ac.quinta, DUR16 * 5, 0.5 * f);
  if (pos === 12) bajo(t, sig.raiz, DUR16 * 9, 0.55 * f);

  // ── Piano montuno (en octavas sobre las notas del acorde) ──
  const enDos = (compas % 2) * 8; // corchea dentro de la frase de 2 compases
  if (pos % 2 === 0) {
    for (const [corchea, grado, octava] of MONTUNO) {
      if (corchea === enDos + pos / 2) {
        const n = ac.notas[grado] + 12;
        piano(t, n, (octava ? 0.11 : 0.085) * f, 0.2);
        if (octava) piano(t, n - 12, 0.07 * f, 0.2);
      }
    }
  }

  // ── Metales ──
  if (seccion === 'A' && juego) {
    for (const [c, p0, n, d] of TEMA) if (c === compas && p0 === pos) trompetas(t, [n, terceraAbajo(n, compas)], d, 0.05);
  } else if (seccion === 'A' && compas < 4) {
    for (const [c, p0, n, d] of TEMA) if (c === compas && p0 === pos) trompetas(t, [n], d, 0.032); // en el menú, solo la primera mitad del tema, suave
  }
  if (seccion === 'B' && juego) {
    const c = compas % 2;
    for (const [cc, p0, n0, d] of CORO) {
      if (cc === c && p0 === pos) {
        const n = compas >= 14 && n0 === 79 ? 80 : n0;
        trompetas(t, [n, terceraAbajo(n, compas)], d, 0.045);
      }
    }
  }
  if (seccion === 'C' && juego) {
    for (const [p0, d] of GOLPES) if (p0 === pos) trompetas(t, [ac.notas[3] + 12, ac.notas[2] + 12, ac.notas[1] + 12], d, 0.04);
    for (const [p0, salto, d] of RIFF) if (p0 === pos) trombones(t, [ac.raiz + salto], d, 0.07);
  }
  if (seccion === 'D' && juego) {
    for (const [p0, grado, d] of MONA) if (p0 === pos) trompetas(t, [ac.notas[grado] + 24 > 86 ? ac.notas[grado] + 12 : ac.notas[grado] + 24], d, 0.042);
    if (pos === 0) trombones(t, [ac.notas[1], ac.notas[0]], 14, 0.05);
  }
}

function programar() {
  if (!listo()) return;
  if (proximo < ctx.currentTime - 0.1) proximo = ctx.currentTime + 0.05; // si estuvo callado un rato, no se atropella
  while (proximo < ctx.currentTime + 0.16) {
    paso_(proximo, paso);
    proximo += DUR16;
    paso = (paso + 1) % (modo === 'juego' ? COMPASES * 16 : 256); // en el menú se repiten solo las secciones A y B
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
    if (opciones.musica !== false) for (let i = 0; i * DUR16 < segundos - 0.2; i++) paso_(0.05 + i * DUR16, i % (COMPASES * 16));
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
