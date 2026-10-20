// audio.js — Todo el sonido del juego se FABRICA con Web Audio (osciladores y ruido): no hay archivos de audio.
// Ventajas: cero descargas, cero problemas de licencias (nada de pistas ajenas) y cabe en unos pocos KB.
//
//   · Efectos: saltar, cambiar de carril, aterrizar, fruta (suben de tono como una escala), choque, cuenta atrás, meta, perder, clic.
//   · Música: un loop de 4 compases de salsa alegre (clave 3-2, campana, congas, bajo tumbao y montuno de piano) en Re menor →
//     Sol 7 → Do mayor 7 → La 7. Suena solo mientras se juega (cuenta atrás incluida).
//   · Los navegadores solo dejan sonar después de un toque: `activar()` se llama en el primer toque de la persona.
//   · Se puede silenciar (botón de sonido en el inicio y en la pausa); se recuerda en este navegador.
import { almacen } from './util.js';

const CLAVE = 'cholado-sonido';
const AC = window.AudioContext || window.webkitAudioContext;
const BPM = 124;
const DUR16 = 60 / BPM / 4; // duración de una semicorchea
const nota = (midi) => 440 * 2 ** ((midi - 69) / 12);

let ctx = null;
let maestro = null;
let bMusica = null;
let bEfectos = null;
let ruidoBuf = null;
let encendido = almacen.leer(CLAVE, true) !== false; // el usuario puede apagar todo el sonido
let sonando = false; // la música
let proximo = 0;
let paso = 0;
let reloj = null;
let seguidas = 0; // frutas seguidas (sube el tono)

function crear() {
  if (ctx || !AC) return;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
    return;
  }
  const comp = ctx.createDynamicsCompressor(); // para que varios sonidos juntos no saturen
  maestro = ctx.createGain();
  maestro.gain.value = encendido ? 0.9 : 0;
  maestro.connect(comp);
  comp.connect(ctx.destination);
  bMusica = ctx.createGain();
  bMusica.gain.value = 0.3;
  bMusica.connect(maestro);
  bEfectos = ctx.createGain();
  bEfectos.gain.value = 0.7;
  bEfectos.connect(maestro);
}

const listo = () => Boolean(ctx) && encendido && ctx.state === 'running';

/** Un tono con envolvente (sube rápido, baja suave). f2 = frecuencia final (glissando). */
function tono({ t = ctx.currentTime, f, f2, dur, tipo = 'sine', vol = 0.3, ataque = 0.005, destino = bEfectos }) {
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

/** Un soplido de ruido filtrado (golpes, chasquidos, platillos). */
function ruido({ t = ctx.currentTime, dur, vol = 0.3, f = 1200, q = 1, tipo = 'lowpass', destino = bEfectos }) {
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
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl);
  fl.connect(g);
  g.connect(destino);
  s.start(t);
  s.stop(t + dur + 0.03);
}

/* ───────────── Música: loop de 4 compases (64 semicorcheas) ───────────── */
const ACORDES = [
  { raiz: 38, notas: [62, 65, 69, 72] }, // Re menor 7
  { raiz: 43, notas: [59, 62, 65, 67] }, // Sol 7
  { raiz: 36, notas: [60, 64, 67, 71] }, // Do mayor 7
  { raiz: 45, notas: [61, 64, 67, 69] }, // La 7
];
const CLAVE_SON = new Set([0, 6, 12, 20, 24]); // clave de son 3-2, en 2 compases (32 semicorcheas)
const MONTUNO = { 2: 1, 5: 2, 8: 3, 11: 2, 14: 1 }; // semicorchea → nota del acorde

function paso_(t, s) {
  const compas = Math.floor(s / 16);
  const pos = s % 16;
  const ac = ACORDES[compas];
  const m = bMusica;
  if (CLAVE_SON.has(s % 32)) {
    tono({ t, f: 1850, dur: 0.05, vol: 0.22, destino: m });
    tono({ t, f: 2500, dur: 0.03, vol: 0.1, destino: m });
  }
  if (pos % 4 === 0) {
    // campana: dos cuadradas desafinadas, más fuerte en el primer tiempo
    const v = pos === 0 ? 0.075 : 0.045;
    tono({ t, f: 540, dur: 0.11, tipo: 'square', vol: v, destino: m });
    tono({ t, f: 812, dur: 0.09, tipo: 'square', vol: v * 0.8, destino: m });
  }
  if (pos % 2 === 0) ruido({ t, dur: 0.035, vol: 0.05, f: 7000, tipo: 'highpass', destino: m }); // guiro / maraca
  // congas: graves, abiertas y palmadas
  if (pos === 0 || pos === 8 || pos === 10) tono({ t, f: 135, f2: 100, dur: 0.14, vol: 0.34, destino: m });
  if (pos === 6 || pos === 14) tono({ t, f: 235, f2: 195, dur: 0.12, vol: 0.28, destino: m });
  if (pos === 4 || pos === 12) {
    ruido({ t, dur: 0.05, vol: 0.2, f: 1800, q: 2, tipo: 'bandpass', destino: m });
    tono({ t, f: 320, dur: 0.04, vol: 0.12, destino: m });
  }
  // bajo tumbao: en el «y» del 2 y en el 4
  if (pos === 6) {
    tono({ t, f: nota(ac.raiz), dur: 0.26, tipo: 'triangle', vol: 0.55, destino: m });
    tono({ t, f: nota(ac.raiz), dur: 0.2, vol: 0.3, destino: m });
  }
  if (pos === 12) tono({ t, f: nota(ac.raiz + 7), dur: 0.26, tipo: 'triangle', vol: 0.5, destino: m });
  // montuno de piano
  if (MONTUNO[pos] !== undefined) {
    const f = nota(ac.notas[MONTUNO[pos]] + (pos === 8 ? 12 : 0));
    tono({ t, f, dur: 0.24, tipo: 'triangle', vol: 0.17, destino: m });
    tono({ t, f: f * 2, dur: 0.12, vol: 0.05, destino: m });
  }
}

function programar() {
  if (!listo()) return;
  while (proximo < ctx.currentTime + 0.16) {
    paso_(proximo, paso);
    proximo += DUR16;
    paso = (paso + 1) % 64;
  }
}

/* ───────────── API pública ───────────── */
export const audio = {
  /** Llamar en cada toque de la persona (los navegadores solo dejan sonar tras un toque). */
  activar() {
    crear();
    if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume?.();
  },
  get encendido() {
    return encendido;
  },
  /** Para el modo debug y el diagnóstico: 'sin-contexto' | 'suspended' | 'running'... */
  get estado() {
    return ctx ? ctx.state : 'sin-contexto';
  },
  get musicaSonando() {
    return sonando;
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
  musicaOn() {
    crear();
    if (!ctx || sonando) return;
    sonando = true;
    paso = 0;
    proximo = ctx.currentTime + 0.1;
    bMusica.gain.cancelScheduledValues(ctx.currentTime);
    bMusica.gain.setTargetAtTime(0.3, ctx.currentTime, 0.05);
    reloj = setInterval(programar, 40);
  },
  musicaOff() {
    if (!ctx || !sonando) return;
    sonando = false;
    clearInterval(reloj);
    bMusica.gain.setTargetAtTime(0, ctx.currentTime, 0.25); // se apaga suave
  },
  /** Pausa todo el audio (pausa del juego, o pantalla apagada / otra app). */
  pausar() {
    if (ctx && ctx.state === 'running') ctx.suspend?.();
  },
  reanudar() {
    if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume?.();
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
