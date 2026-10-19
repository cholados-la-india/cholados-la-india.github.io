// kit.js — Escena de vista previa compartida por todos los estilos.
//
// La geometría (personajes, obstáculo, frutas, palmeras...) es IDÉNTICA en todos los estilos; cada estilo
// solo cambia materiales, luces, contorno, colores, tipografía y HUD. Así se compara únicamente "el estilo".
//
// Técnicas de rendimiento (las mismas que usaremos en el juego real):
//  - Cada personaje u objeto es UNA sola malla con color por vértice (pocas llamadas de dibujo).
//  - Lo repetido (palmeras, cajas, frutas, rayas de la calle) usa InstancedMesh.
//  - Sin sombras reales: sombras "falsas" (círculos oscuros) bajo los objetos.
//  - El cielo es un degradado CSS (gratis) y el canvas es transparente.
//  - Resolución limitada (pixel ratio máximo 1.5).
import * as THREE from '../../vendor/three/three.min.js';

const TOPE_DPR = 1.5;
const VELOCIDAD = 7; // velocidad del mundo en unidades/s (solo para la demo)
const CARRIL = 1.2; // ancho de un carril
const LARGO = 80; // vuelta completa del decorado lejano
const Z_LEJOS = -78; // donde "nace" el decorado
const LARGO_CERCA = 40; // vuelta de obstáculos y frutas
const Z_CERCA = -36;
const RAD = Math.PI / 180;

const mezcla = (a, b, t) => a + (b - a) * t;
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const suave = (t) => {
  t = limitar(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const modulo = (v, n) => ((v % n) + n) % n;
const css = (n) => '#' + n.toString(16).padStart(6, '0');
/** Aclara u oscurece un color hexadecimal multiplicando sus canales por k (cada canal queda entre 0 y 255). */
const tono = (hex, k) => {
  const c = (desp) => Math.min(255, Math.round(((hex >> desp) & 255) * k));
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

/* ───────────────────────── Geometría: piezas → una sola malla ───────────────────────── */

const _v = new THREE.Vector3();
const _n = new THREE.Matrix3();
const _c = new THREE.Color();

/** Una pieza = geometría + color + posición + rotación (radianes) + escala. */
function pieza(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...esc),
  );
  return { geo, color, m };
}

/** Mueve varias piezas como un bloque. */
function grupo(piezas, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
  const padre = pieza(null, 0, pos, rot, esc).m;
  return piezas.map((p) => ({ geo: p.geo, color: p.color, m: new THREE.Matrix4().multiplyMatrices(padre, p.m) }));
}

/** Une todas las piezas en una sola geometría con color por vértice. */
function fusionar(piezas) {
  const pos = [];
  const nor = [];
  const col = [];
  for (const p of piezas) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    const a = g.attributes.position;
    const n = g.attributes.normal;
    _n.getNormalMatrix(p.m);
    _c.set(p.color);
    for (let i = 0; i < a.count; i++) {
      _v.fromBufferAttribute(a, i).applyMatrix4(p.m);
      pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(n, i).applyMatrix3(_n).normalize();
      nor.push(_v.x, _v.y, _v.z);
      col.push(_c.r, _c.g, _c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

/* ───────────────────────── Modelos (todo por código, sin archivos) ───────────────────────── */

function crearModelos(detalle) {
  const S = (n) => Math.max(3, Math.round(n * detalle));
  const caja = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const cil = (rs, ri, h, seg = 8, abierto = false) => new THREE.CylinderGeometry(rs, ri, h, S(seg), 1, abierto);
  const medio = (r, h, seg = 10) => new THREE.CylinderGeometry(r, r, h, S(seg), 1, false, 0, Math.PI);
  const cono = (r, h, seg = 6, abierto = false) => new THREE.ConeGeometry(r, h, S(seg), 1, abierto);
  const esf = (r, a = 8, b = 6) => new THREE.SphereGeometry(r, S(a), Math.max(3, S(b)));
  // d = 0 facetado · d = 1 normal · d = 2 "fino" (solo si el estilo pide mucho detalle)
  const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d === 0 ? 0 : d === 2 && detalle >= 1.3 ? 2 : 1);
  const toro = (r, tubo, rad = 4, seg = 10, arco = Math.PI * 2) => new THREE.TorusGeometry(r, tubo, Math.max(3, S(rad)), S(seg), arco);
  const capsula = (r, largo) => new THREE.CapsuleGeometry(r, largo, 2, S(6));
  const trozo = (rTop, rBase, h, th0, thL) => new THREE.CylinderGeometry(rTop, rBase, h, Math.max(1, Math.round(detalle)), 1, true, th0, thL);

  /**
   * El choladito, fiel a las fotos de referencia. Mira hacia -z (hacia donde corre).
   *  - Vaso de plástico transparente SIN adornos por fuera: se ve lo que lleva adentro (almíbar rojo, hielo,
   *    piña, guanábana, banano, maracuyá y papaya), con un casco translúcido encima.
   *  - Arriba: una bola de helado rosada con leche condensada, uvita, wafer, manzana roja, pitillo y cuchara.
   */
  function cholado() {
    const R0 = 0.34;
    const R1 = 0.52;
    const Y0 = 0.46;
    const H = 0.9;
    const YT = Y0 + H;
    const rAt = (t) => mezcla(R0, R1, t);
    const p = [];

    // Contenido del vaso: 6 filas × 12 sectores de 30°. Cada letra es un ingrediente.
    const COL = {
      J: 0xb50f2e, // almíbar rojo oscuro
      R: 0xd92f58, // almíbar rojo claro
      r: 0xf7b6c6, // hielo teñido de almíbar
      I: 0xfff3e8, // hielo
      Y: 0xffd24a, // piña
      O: 0xff9a3c, // papaya
      C: 0xfff1a8, // banano
      P: 0xffb62e, // maracuyá
      G: 0xfffdf2, // guanábana
    };
    const filas = [0, 0.24, 0.38, 0.54, 0.7, 0.85, 1];
    const mapa = [
      'JJJJJJJJJJJJ', // base: almíbar
      'JRJRRrRRrRJR',
      'YROPIIIICORY', // sectores 4-7 = frente (hielo blanco, ahí va la carita)
      'OCPRIIIIYROP',
      'RYGOIIIIPCRG',
      'RIIGIIIIIGIR', // hielo hasta el borde, con vetas de almíbar
    ];
    const semillas = (cx, cy, cz, tx, tz, lista) => lista.forEach(([dx, dy]) => p.push(pieza(esf(0.014, 5, 4), 0x2a1a14, [cx + tx * dx, cy + dy, cz + tz * dx])));
    mapa.forEach((fila, f) => {
      const t0 = filas[f];
      const t1 = filas[f + 1];
      const h = (t1 - t0) * H;
      const y = Y0 + ((t0 + t1) / 2) * H;
      [...fila].forEach((ch, s) => {
        // Cada trozo varía un poco de tono (±7 %) para que no parezca un tablero.
        const k = 0.93 + ((f * 37 + s * 17) % 11) / 78;
        p.push(pieza(trozo(rAt(t1) * 0.985, rAt(t0) * 0.985, h, s * 30 * RAD, 30 * RAD), tono(COL[ch], k), [0, y, 0]));
        if (f >= 2 && f <= 4 && 'YOCPG'.includes(ch)) {
          // trozo de fruta pegado al vaso por dentro
          const th = (s + 0.5) * 30 * RAD;
          const rr = rAt((t0 + t1) / 2) * 0.985 - 0.006;
          const cx = Math.sin(th) * rr;
          const cz = Math.cos(th) * rr;
          const tx = Math.cos(th);
          const tz = -Math.sin(th);
          p.push(pieza(ico(0.095, 0), COL[ch], [cx, y, cz], [0, th, 0], [1.2, 1.05, 0.42]));
          p.push(pieza(ico(0.058, 0), COL[ch], [cx - tx * 0.065, y + 0.055, cz - tz * 0.065], [0, th, 0.4], [1.1, 1, 0.4]));
          if (ch === 'P') semillas(cx + Math.sin(th) * 0.04, y, cz + Math.cos(th) * 0.04, tx, tz, [[-0.04, 0.02], [0.03, 0.03], [0, -0.03], [0.05, -0.015]]);
          if (ch === 'G') semillas(cx + Math.sin(th) * 0.04, y, cz + Math.cos(th) * 0.04, tx, tz, [[-0.03, 0.01], [0.035, -0.02]]);
        }
      });
    });
    p.push(pieza(new THREE.CircleGeometry(rAt(1) * 0.985, S(12)).rotateX(-Math.PI / 2), 0xfff5ec, [0, YT - 0.01, 0]));

    // Cara (al frente, o sea hacia -z): ojos, mejillas y sonrisa sobre el hielo blanco.
    const yCara = Y0 + 0.62 * H;
    const rCara = rAt(0.62) * 0.985 + 0.02;
    for (const lado of [-1, 1]) {
      const x = lado * 0.14;
      const z = -Math.sqrt(rCara ** 2 - x ** 2);
      p.push(pieza(esf(0.085, 6, 5), 0xffffff, [x, yCara, z], [0, 0, 0], [1, 1.15, 0.55]));
      p.push(pieza(esf(0.042, 5, 4), 0x20121a, [x * 0.92, yCara - 0.005, z - 0.035], [0, 0, 0], [1, 1.1, 0.6]));
      const xm = lado * 0.27;
      p.push(pieza(esf(0.05, 5, 4), 0xff8fa8, [xm, yCara - 0.13, -Math.sqrt((rAt(0.5) * 0.985 + 0.015) ** 2 - xm ** 2)], [0, 0, 0], [1, 0.8, 0.5]));
    }
    p.push(pieza(toro(0.085, 0.018, 3, 8, Math.PI), 0x6b0f22, [0, yCara - 0.12, -(rAt(0.5) * 0.985 + 0.02)], [0, 0, Math.PI]));

    // Helado: UNA bola rosada (fresa/mora) con vetas oscuras; la leche condensada la cubre solo por arriba,
    // chorrea en lenguas planas pegadas a la bola, y encima va la uvita.
    const ey = YT + 0.17;
    const rb = 0.41;
    p.push(pieza(ico(rb, 2), 0xe59ab0, [0, ey, 0], [0, 0.4, 0], [1, 0.85, 1]));
    [[0.3, 0.0, 0.2], [-0.28, 0.02, -0.16], [0.02, -0.04, 0.36], [-0.2, 0.0, 0.3]].forEach(([x, y, z]) => p.push(pieza(ico(0.09, 0), 0xb5617f, [x, ey + y, z], [x, z, 0], [1.3, 0.8, 0.7])));
    p.push(pieza(new THREE.SphereGeometry(rb + 0.012, S(12), S(7), 0, Math.PI * 2, 0, Math.PI * 0.36), 0xeef2d2, [0, ey, 0], [0, 0.4, 0], [1, 0.85, 1]));
    const bordeY = ey + (rb + 0.012) * Math.cos(Math.PI * 0.36) * 0.85;
    const bordeR = (rb + 0.012) * Math.sin(Math.PI * 0.36);
    [[0.3, 0.2], [1.0, 0.1], [1.7, 0.24], [2.4, 0.13], [3.1, 0.2], [3.8, 0.09], [4.5, 0.22], [5.2, 0.12], [5.8, 0.17]].forEach(([a, h]) => {
      p.push(pieza(ico(0.045, 0), 0xeef2d2, [Math.cos(a) * (bordeR + 0.012 + h * 0.06), bordeY - h / 2 + 0.03, Math.sin(a) * (bordeR + 0.012 + h * 0.06)], [0, Math.PI / 2 - a, 0], [0.9, h / 0.09, 0.4]));
    });
    p.push(pieza(esf(0.088, 8, 6), 0x4a2a86, [-0.04, ey + 0.41, 0.02]));
    p.push(pieza(cil(0.012, 0.012, 0.05, 4), 0x5a3d1c, [-0.04, ey + 0.49, 0.02]));

    // Wafer (galletica cuadriculada), manzana roja, pitillo y cuchara transparente.
    p.push(...grupo([
      pieza(caja(0.3, 0.46, 0.035), 0xf2cb80),
      ...[-0.12, 0, 0.12].map((y) => pieza(caja(0.31, 0.014, 0.042), 0xd9a650, [0, y, 0])),
      ...[-0.08, 0, 0.08].map((x) => pieza(caja(0.014, 0.47, 0.042), 0xd9a650, [x, 0, 0])),
    ], [-0.36, YT + 0.34, 0.12], [0.1, 0.35, 0.55]));
    p.push(...grupo([
      pieza(medio(0.21, 0.045), 0xc9262e, [0, 0, 0], [Math.PI / 2, 0, 0]),
      pieza(medio(0.17, 0.045), 0xfff3cc, [0, 0, 0.012], [Math.PI / 2, 0, 0]),
    ], [0.46, YT + 0.12, 0.04], [0, 0.55, -0.55]));
    p.push(...grupo([
      pieza(cil(0.03, 0.03, 0.8, 6, true), 0xffb81c, [0, 0.4, 0]),
      pieza(cil(0.03, 0.03, 0.24, 6, true), 0xffb81c, [0.08, 0.84, 0], [0, 0, -0.7]),
    ], [0.14, YT - 0.02, 0.26], [0.12, 0, -0.2]));
    p.push(...grupo([
      pieza(capsula(0.018, 0.6), 0xe9f5ff, [0, 0.36, 0]),
      pieza(ico(0.07, 1), 0xe9f5ff, [0, 0.74, 0], [0, 0, 0], [1, 1.5, 0.45]),
    ], [-0.18, YT - 0.02, 0.3], [0.12, 0, 0.26]));

    // Casco de plástico translúcido (con las rayitas del vaso): lo dibuja el kit con su propio material.
    const perfil = [];
    for (let i = 0; i <= 16; i++) perfil.push(new THREE.Vector2(rAt(i / 16) * 1.035 + (i % 2 ? 0.006 : 0), Y0 + (i / 16) * H));
    perfil.push(new THREE.Vector2(rAt(1) * 1.06, YT + 0.005), new THREE.Vector2(rAt(1) * 1.06, YT - 0.02));
    const cascaron = new THREE.LatheGeometry(perfil, Math.max(12, S(16)));

    // Extremidades: cada una es su propia malla para poder animarla (pivote en el hombro / la cadera).
    const brazo = fusionar([pieza(capsula(0.05, 0.2), 0xfff1d6, [0, -0.14, 0]), pieza(esf(0.085, 6, 5), 0xffffff, [0, -0.3, 0])]);
    const pierna = fusionar([pieza(cil(0.065, 0.065, 0.36, 6), 0xfff1d6, [0, -0.18, 0]), pieza(caja(0.2, 0.11, 0.3), 0xff7a1a, [0, -0.39, -0.05])]);
    const hombro = rAt(0.55) + 0.03;
    // Silueta simplificada solo para dibujar el contorno (sin semillas, frutitas ni carita): ~5 veces menos triángulos.
    const silueta = [
      pieza(cil(R1 * 0.99, R0, H, 12), 0xc83c66, [0, Y0 + H / 2, 0]),
      pieza(ico(rb, 1), 0xe59ab0, [0, ey, 0], [0, 0.4, 0], [1, 0.85, 1]),
      pieza(esf(0.088, 5, 4), 0x4a2a86, [-0.04, ey + 0.41, 0.02]),
      ...grupo([pieza(caja(0.3, 0.46, 0.035), 0xf2cb80)], [-0.36, YT + 0.34, 0.12], [0.1, 0.35, 0.55]),
      ...grupo([pieza(cil(0.03, 0.03, 0.8, 6, true), 0xffb81c, [0, 0.4, 0])], [0.14, YT - 0.02, 0.26], [0.12, 0, -0.2]),
      ...grupo([pieza(capsula(0.018, 0.6), 0xe9f5ff, [0, 0.36, 0])], [-0.18, YT - 0.02, 0.3], [0.12, 0, 0.26]),
      ...grupo([pieza(medio(0.21, 0.045), 0xc9262e, [0, 0, 0], [Math.PI / 2, 0, 0])], [0.46, YT + 0.12, 0.04], [0, 0.55, -0.55]),
    ];
    return {
      cuerpo: fusionar(p),
      contornoCuerpo: fusionar(silueta),
      cascaron,
      brazo,
      pierna,
      escala: 1.15,
      anclas: { brazoI: [-hombro, Y0 + 0.5 * H, 0], brazoD: [hombro, Y0 + 0.5 * H, 0], piernaI: [-0.17, Y0 + 0.04, 0], piernaD: [0.17, Y0 + 0.04, 0] },
    };
  }

  /** La India vista desde atrás: penacho de plumas en abanico, falda verde con flecos. */
  function india() {
    const piel = 0xc9987f;
    const pelo = 0x16100e;
    const verde = 0x6fa83c;
    const rojo = 0xd62f2f;
    const naranja = 0xf28a1e;
    const amarillo = 0xf5d313;
    const p = [];

    p.push(pieza(cil(0.2, 0.3, 0.42, 10, true), verde, [0, 0.78, 0]));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      p.push(pieza(cono(0.045, 0.15, 4), [rojo, naranja, amarillo][i % 3], [Math.cos(a) * 0.3, 0.5, Math.sin(a) * 0.3], [Math.PI, 0, 0]));
    }
    p.push(pieza(cil(0.23, 0.2, 0.36, 10), verde, [0, 1.15, 0]));
    p.push(pieza(cil(0.2, 0.22, 0.12, 10), piel, [0, 1.39, 0]));
    p.push(pieza(cil(0.065, 0.07, 0.1, 6), piel, [0, 1.5, 0]));
    p.push(...grupo([pieza(caja(0.15, 0.2, 0.08), rojo), pieza(caja(0.07, 0.09, 0.09), amarillo, [0, 0, 0], [0, 0, Math.PI / 4])], [-0.27, 1.36, 0.02], [0, 0, 0.15]));

    p.push(pieza(esf(0.2), piel, [0, 1.66, 0]));
    p.push(pieza(esf(0.225), pelo, [0, 1.68, 0.035], [0, 0, 0], [1, 1, 0.95]));
    p.push(pieza(capsula(0.1, 0.4), pelo, [0, 1.3, 0.15]));
    p.push(pieza(toro(0.21, 0.028, 3, 12), 0x5c9a2b, [0, 1.72, 0], [Math.PI / 2, 0, 0]));
    // Rostro (visible al girarla): ojos y pintura roja en la mejilla.
    for (const lado of [-1, 1]) p.push(pieza(esf(0.025, 5, 4), 0x20121a, [lado * 0.07, 1.68, -0.185]));
    p.push(pieza(caja(0.1, 0.018, 0.02), rojo, [-0.12, 1.62, -0.165], [0, 0.5, 0.2]));

    // Penacho: barras de color alrededor de la diadema y abanico de 11 plumas.
    for (let i = 0; i < 9; i++) {
      const a = (-80 + i * 20) * RAD;
      p.push(pieza(caja(0.06, 0.13, 0.05), [rojo, naranja, amarillo][i % 3], [Math.sin(a) * 0.22, 1.8, 0.12 + Math.cos(a) * 0.12], [0, -a, 0]));
    }
    const plumas = [0x1e3fa8, rojo, amarillo, naranja, 0x4fa3e0];
    // Silueta simplificada para el contorno: falda, torso, cabeza, pelo y plumas.
    const silueta = [
      pieza(cil(0.2, 0.3, 0.42, 10, true), verde, [0, 0.78, 0]),
      pieza(cil(0.23, 0.2, 0.36, 10), verde, [0, 1.15, 0]),
      pieza(esf(0.2), piel, [0, 1.66, 0]),
      pieza(esf(0.225), pelo, [0, 1.68, 0.035], [0, 0, 0], [1, 1, 0.95]),
    ];
    for (let i = 0; i < 11; i++) {
      const a = (-75 + i * 15) * RAD;
      const largo = 0.95 - Math.abs(i - 5) * 0.045;
      const pluma = grupo([pieza(cono(0.075, largo, 4), plumas[i % 5], [0, largo / 2, 0], [0, 0, 0], [1, 1, 0.3])], [0, 1.82, 0.14], [0.5, 0, a]);
      p.push(...pluma);
      silueta.push(...pluma);
    }

    const brazo = fusionar([pieza(cil(0.05, 0.045, 0.5, 6), piel, [0, -0.25, 0]), pieza(esf(0.065, 6, 5), piel, [0, -0.52, 0])]);
    const pierna = fusionar([pieza(cil(0.075, 0.06, 0.52, 6), piel, [0, -0.26, 0]), pieza(caja(0.15, 0.09, 0.26), 0x8b5a2b, [0, -0.56, -0.05])]);
    return {
      cuerpo: fusionar(p),
      contornoCuerpo: fusionar(silueta),
      brazo,
      pierna,
      escala: 0.9,
      anclas: { brazoI: [-0.26, 1.4, 0], brazoD: [0.26, 1.4, 0], piernaI: [-0.11, 0.6, 0], piernaD: [0.11, 0.6, 0] },
    };
  }

  /** Obstáculo: caja de madera con fruta encima. */
  function cajaFruta() {
    const p = [pieza(caja(1, 0.55, 0.8), 0xc98a3f, [0, 0.275, 0])];
    [0.1, 0.275, 0.45].forEach((y) => p.push(pieza(caja(1.02, 0.06, 0.82), 0x9a6428, [0, y, 0])));
    [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]].forEach(([x, z]) => p.push(pieza(caja(0.09, 0.6, 0.09), 0x7b4b1d, [x, 0.3, z])));
    [[-0.25, -0.1], [0.2, -0.15], [0, 0.15]].forEach(([x, z]) => p.push(pieza(ico(0.2), 0xff8a1f, [x, 0.72, z])));
    p.push(pieza(ico(0.17), 0xffb21a, [0.32, 0.7, 0.18], [0, 0, 0], [1, 1.2, 0.9]));
    p.push(pieza(cono(0.09, 0.2, 4), 0x4caf3d, [-0.1, 0.92, 0.02]));
    return fusionar(p);
  }

  const fresa = () => fusionar([
    pieza(cono(0.13, 0.3, 7), 0xe5233e, [0, 0, 0], [Math.PI, 0, 0]),
    pieza(esf(0.11), 0xe5233e, [0, 0.09, 0]),
    pieza(cono(0.09, 0.1, 5), 0x4caf3d, [0, 0.21, 0], [0, 0, 0], [1, 0.6, 1]),
  ]);
  const mango = () => fusionar([
    pieza(ico(0.17), 0xffb21a, [0, 0, 0], [0, 0, 0.4], [1, 1.18, 0.88]),
    pieza(ico(0.09), 0xff6b3a, [0.06, -0.03, 0.08]),
    pieza(cono(0.07, 0.16, 4), 0x4caf3d, [0.03, 0.21, 0], [0, 0, -0.5]),
  ]);

  const palmera = () => {
    const p = [];
    for (let i = 0; i < 3; i++) p.push(pieza(cil(0.15 - i * 0.02, 0.17 - i * 0.02, 0.82, 6), 0x8f5e2e, [0.05 * i * i, 0.4 + 0.8 * i, 0], [0, 0, -0.05 * i]));
    const cx = 0.2;
    for (let k = 0; k < 8; k++) {
      p.push(...grupo([pieza(cono(0.18, 1.5, 4), k % 2 ? 0x2fa84f : 0x66bb3a, [0, 0.75, 0], [0, 0, 0], [1, 1, 0.22])], [cx, 2.45, 0], [0, (k / 8) * Math.PI * 2, 1.15]));
    }
    [[0.1, 0.05], [-0.08, 0.1], [0.02, -0.12]].forEach(([x, z]) => p.push(pieza(esf(0.1, 4, 3), 0x6b4423, [cx + x, 2.38, z])));
    return fusionar(p);
  };
  const sombrilla = () => fusionar([
    pieza(cil(0.04, 0.04, 2.0, 5), 0xeeeeee, [0, 1, 0]),
    pieza(cono(1.1, 0.55, 8, true), 0xd4287f, [0, 2.15, 0]),
    pieza(esf(0.08, 5, 4), 0xffd21f, [0, 2.47, 0]),
  ]);
  const pina = () => {
    const p = [pieza(ico(0.55, 2), 0xf2a31b, [0, 0.85, 0], [0, 0, 0], [1, 1.5, 1])];
    for (let k = 0; k < 6; k++) p.push(...grupo([pieza(cono(0.1, 0.6, 4), 0x3fa34d, [0, 0.3, 0], [0, 0, 0], [1, 1, 0.5])], [0, 1.62, 0], [0, (k / 6) * Math.PI * 2, 0.45]));
    return fusionar(p);
  };

  return { cholado: cholado(), india: india(), cajaFruta: cajaFruta(), fresa: fresa(), mango: mango(), palmera: palmera(), sombrilla: sombrilla(), pina: pina(), caja, cono };
}

/* ───────────────────────── Contorno (solo en los estilos que lo piden) ───────────────────────── */
//
// Dos modos:
//  - { color: [r,g,b], grosor }                       → contorno de un solo color (p. ej. negro).
//  - { tinte, oscuridad, grosor, alcance: 'jugables' } → contorno "tinta de color": el color de cada objeto
//    oscurecido y mezclado con un tinte (nunca negro puro). Con alcance 'jugables' solo se dibuja en
//    personajes, obstáculos y frutas, no en el decorado.

function crearContorno(cfg) {
  const resolucion = new THREE.Vector2(1, 1);
  const coloreado = cfg.tinte !== undefined;
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexColors: true,
    uniforms: {
      uRes: { value: resolucion },
      uPx: { value: cfg.grosor },
      uColor: { value: new THREE.Vector3(...(cfg.color ?? [0, 0, 0])) },
      uTinte: { value: new THREE.Vector3(...new THREE.Color(cfg.tinte ?? 0).toArray()) },
      uOsc: { value: cfg.oscuridad ?? 0.4 },
      uModo: { value: coloreado ? 1 : 0 },
    },
    vertexShader: `
      uniform vec2 uRes;
      uniform float uPx;
      varying vec3 vC;
      void main() {
        vC = color;
        vec4 pos = vec4(position, 1.0);
        vec3 nrm = normal;
        #ifdef USE_INSTANCING
          pos = instanceMatrix * pos;
          nrm = mat3(instanceMatrix) * nrm;
        #endif
        vec4 clip = projectionMatrix * modelViewMatrix * pos;
        vec3 vn = normalize(normalMatrix * nrm);
        vec2 dir = normalize((projectionMatrix * vec4(vn, 0.0)).xy * uRes);
        clip.xy += dir * (uPx * 2.0 / uRes) * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uTinte;
      uniform float uOsc;
      uniform float uModo;
      varying vec3 vC;
      void main() {
        vec3 c = uColor;
        if (uModo > 0.5) c = pow(mix(vC * uOsc, uTinte, 0.45), vec3(1.0 / 2.2));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  // Normales "suavizadas" (promedio en vértices que coinciden) para que el contorno no se rompa en las aristas.
  const cache = new WeakMap();
  const suavizada = (geo) => {
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const clave = (i) => `${Math.round(pos.getX(i) * 400)},${Math.round(pos.getY(i) * 400)},${Math.round(pos.getZ(i) * 400)}`;
    const acum = new Map();
    for (let i = 0; i < pos.count; i++) {
      const k = clave(i);
      const a = acum.get(k) ?? [0, 0, 0];
      a[0] += nor.getX(i);
      a[1] += nor.getY(i);
      a[2] += nor.getZ(i);
      acum.set(k, a);
    }
    const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const a = acum.get(clave(i));
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      out.set([a[0] / l, a[1] / l, a[2] / l], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', pos);
    g.setAttribute('color', geo.attributes.color);
    g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    return g;
  };

  return {
    material,
    todo: cfg.alcance !== 'jugables',
    geometria(geo) {
      if (!cache.has(geo)) cache.set(geo, suavizada(geo));
      return cache.get(geo);
    },
    ajustar(renderer) {
      renderer.getDrawingBufferSize(resolucion);
      material.uniforms.uPx.value = cfg.grosor * renderer.getPixelRatio();
    },
  };
}

/* ───────────────────────── HUD y controles (HTML sobre el canvas) ───────────────────────── */

const SVG_VASO = '<svg viewBox="0 0 24 32" aria-hidden="true"><path class="s-pit" d="M15 9 L20.5 1.5"/><path class="s-vaso" d="M3.5 13h17l-2.6 17.2a1.6 1.6 0 0 1-1.6 1.3H7.7a1.6 1.6 0 0 1-1.6-1.3z"/><path class="s-baja" d="M5.2 21h13.6l-.9 6.8a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z"/><circle class="s-bola" cx="12" cy="10.5" r="7.2"/></svg>';
const SVG_FRESA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="f-cuerpo" d="M12 22.5C5.5 18 4 10.5 12 8c8 2.5 6.5 10 0 14.5z"/><path class="f-hoja" d="M7.5 8 12 3.2 16.5 8 12 9.8z"/><circle class="f-pepa" cx="9.6" cy="13.5" r=".9"/><circle class="f-pepa" cx="14.2" cy="13" r=".9"/><circle class="f-pepa" cx="12" cy="17" r=".9"/></svg>';
const SVG_PAUSA = '<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="3" y="2" width="4" height="14" rx="1.2"/><rect x="11" y="2" width="4" height="14" rx="1.2"/></svg>';
const SVG_JUGAR = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M4 2.2 15.5 9 4 15.8z"/></svg>';
const vida = (perdida) => `<span class="vida${perdida ? ' perdida' : ''}">${SVG_VASO}</span>`;

function montarInterfaz(el) {
  el.insertAdjacentHTML('beforeend', `
    <div class="hud">
      <div class="hud-arriba">
        <div class="vidas" aria-label="Vidas">${vida(false)}${vida(false)}${vida(true)}</div>
        <div class="reloj">
          <div class="reloj-num">0:42</div>
          <div class="progreso"><i class="progreso-barra"></i><span class="progreso-meta">${SVG_VASO}</span></div>
        </div>
        <button class="pausa" type="button" aria-label="Pausa">${SVG_PAUSA}</button>
      </div>
      <div class="frutas">${SVG_FRESA}<b>0</b></div>
      <div class="premio">Quedan <b>37</b> premios esta semana</div>
    </div>
    <nav class="ctl" aria-label="Controles de la vista previa">
      <a class="ctl-volver" href="./">← Estilos</a>
      <span class="ctl-grupo">
        <button type="button" data-p="cholado" class="on">Choladito</button>
        <button type="button" data-p="india">La India</button>
      </span>
      <button type="button" data-a="girar">Girar</button>
      <button type="button" data-a="datos">Datos</button>
    </nav>
    <aside class="datos" hidden></aside>`);
}

/* ───────────────────────── La escena ───────────────────────── */

export function iniciarPreview(estilo) {
  const el = document.getElementById('escena');
  const pal = estilo.paleta;
  document.title = estilo.nombre;
  el.style.setProperty('--cielo-arriba', css(pal.cieloArriba));
  el.style.setProperty('--cielo-horizonte', css(pal.cieloHorizonte));
  montarInterfaz(el);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: el.querySelector('canvas'), antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) {
    el.insertAdjacentHTML('beforeend', '<p class="aviso">Este navegador no pudo iniciar WebGL.</p>');
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TOPE_DPR));

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(pal.cieloHorizonte, 14, 90);
  const camara = new THREE.PerspectiveCamera(60, 0.5, 0.1, 160);
  camara.position.set(0, 3.2, 5.6);
  camara.lookAt(0, 1.25, -3);

  estilo.luces?.(escena);
  const material = estilo.material();
  const contorno = estilo.contorno ? crearContorno(estilo.contorno) : null;
  const M = crearModelos(estilo.detalle ?? 1);

  // jugable = personaje, obstáculo o fruta (lo que se "toca"). El decorado no lleva contorno si el estilo dice 'jugables'.
  function crearMalla(geo, { instancias = 0, conContorno = true, jugable = true, geoContorno = null } = {}) {
    const m = instancias ? new THREE.InstancedMesh(geo, material, instancias) : new THREE.Mesh(geo, material);
    if (instancias) m.frustumCulled = false;
    if (contorno && conContorno && (jugable || contorno.todo)) {
      const g = contorno.geometria(geoContorno ?? geo);
      const o = instancias ? new THREE.InstancedMesh(g, contorno.material, instancias) : new THREE.Mesh(g, contorno.material);
      if (instancias) {
        o.instanceMatrix = m.instanceMatrix;
        o.frustumCulled = false;
      }
      m.add(o);
    }
    return m;
  }

  /* Decorado fijo: suelo, calle, bordillos y montañas (una sola malla). */
  const fijo = [
    pieza(new THREE.PlaneGeometry(90, 170), pal.suelo, [0, -0.02, -40], [-Math.PI / 2, 0, 0]),
    pieza(new THREE.PlaneGeometry(3.6, 170), pal.calle, [0, 0, -40], [-Math.PI / 2, 0, 0]),
    ...[-1, 1].map((lado) => pieza(M.caja(0.22, 0.12, 170), pal.bordillo, [lado * 1.91, 0.06, -40])),
  ];
  [[-26, -62, 13, 9, 0], [-10, -70, 15, 13, 1], [9, -66, 14, 8, 0], [27, -60, 13, 10, 1], [-38, -55, 10, 6, 1], [40, -52, 11, 7, 0], [0, -84, 18, 11, 0]]
    .forEach(([x, z, r, h, k]) => fijo.push(pieza(M.cono(r, h, 6), k ? pal.montanaB : pal.montanaA, [x, h / 2 - 0.02, z])));
  escena.add(crearMalla(fusionar(fijo), { conContorno: false }));

  /* Sol (sin niebla ni luces). */
  const sol = new THREE.Mesh(new THREE.CircleGeometry(9, 28), new THREE.MeshBasicMaterial({ color: pal.sol, fog: false }));
  const halo = new THREE.Mesh(new THREE.CircleGeometry(15, 28), new THREE.MeshBasicMaterial({ color: pal.halo, fog: false, transparent: true, opacity: 0.35, depthWrite: false }));
  sol.position.set(9, 18, -105);
  halo.position.set(9, 18, -106);
  escena.add(halo, sol);

  /* Objetos repetidos: todos con InstancedMesh. */
  const palmas = [[-3.6, 0], [3.8, 5], [-4.7, 20], [4.6, 25], [-3.6, 40], [3.9, 45], [-4.8, 60], [4.5, 65]];
  const sombrillas = [[-3.0, 12], [3.1, 33], [-3.2, 52], [3.0, 72]];
  const pinas = [[-4.2, 30], [4.3, 10], [-4.4, 70]];
  const cajas = [[-CARRIL, 6], [CARRIL, 18], [-CARRIL, 31]];
  const fresas = [4, 6, 8, 10, 12];
  const mangos = [24, 26, 28, 30, 32];
  const nRayas = 22;

  const iPalmas = crearMalla(M.palmera, { instancias: palmas.length, jugable: false });
  const iSombrillas = crearMalla(M.sombrilla, { instancias: sombrillas.length, jugable: false });
  const iPinas = crearMalla(M.pina, { instancias: pinas.length, jugable: false });
  const iCajas = crearMalla(M.cajaFruta, { instancias: cajas.length });
  const iFresas = crearMalla(M.fresa, { instancias: fresas.length });
  const iMangos = crearMalla(M.mango, { instancias: mangos.length });
  const iRayas = crearMalla(fusionar([pieza(M.caja(0.09, 0.02, 1.1), pal.linea)]), { instancias: nRayas * 2, conContorno: false });
  escena.add(iPalmas, iSombrillas, iPinas, iCajas, iFresas, iMangos, iRayas);

  const sombraGeo = new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2);
  const sombras = new THREE.InstancedMesh(sombraGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }), 1 + cajas.length);
  sombras.frustumCulled = false;
  escena.add(sombras);

  /* Personajes: cada uno = cuerpo + 4 extremidades (5 mallas), más el casco de plástico del vaso. */
  const plastico = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false });
  function ensamblar(modelo) {
    const g = new THREE.Group();
    const partes = { g, cuerpo: crearMalla(modelo.cuerpo, { geoContorno: modelo.contornoCuerpo }) };
    if (modelo.cascaron) partes.cuerpo.add(new THREE.Mesh(modelo.cascaron, plastico));
    g.add(partes.cuerpo);
    for (const [nombre, geo] of [['brazoI', modelo.brazo], ['brazoD', modelo.brazo], ['piernaI', modelo.pierna], ['piernaD', modelo.pierna]]) {
      const m = crearMalla(geo);
      m.position.set(...modelo.anclas[nombre]);
      g.add(m);
      partes[nombre] = m;
    }
    g.scale.setScalar(modelo.escala);
    escena.add(g);
    return partes;
  }
  const personajes = { cholado: ensamblar(M.cholado), india: ensamblar(M.india) };
  let actual = 'cholado';
  let giro = 0;
  let giroObjetivo = 0;
  personajes.india.g.visible = false;

  /* HUD y controles. */
  const q = (s) => el.querySelector(s);
  const hud = { reloj: q('.reloj-num'), barra: q('.progreso-barra'), frutas: q('.frutas b'), pausa: q('.pausa') };
  const panelDatos = q('.datos');
  let pausado = false;
  let nFrutas = 0;
  hud.pausa.addEventListener('click', () => {
    pausado = !pausado;
    hud.pausa.innerHTML = pausado ? SVG_JUGAR : SVG_PAUSA;
  });
  q('.ctl').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.p) {
      actual = b.dataset.p;
      for (const [n, p] of Object.entries(personajes)) p.g.visible = n === actual;
      q('.ctl-grupo').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    } else if (b.dataset.a === 'girar') {
      giroObjetivo = giroObjetivo ? 0 : Math.PI;
      b.classList.toggle('on', giroObjetivo > 0);
    } else if (b.dataset.a === 'datos') {
      panelDatos.hidden = !panelDatos.hidden;
      b.classList.toggle('on', !panelDatos.hidden);
    }
  });

  function ajustar() {
    const w = el.clientWidth;
    const h = el.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.fov = limitar((2 * Math.atan(Math.tan((44 * RAD) / 2) / camara.aspect)) / RAD, 50, 84);
    camara.updateProjectionMatrix();
    contorno?.ajustar(renderer);
  }
  new ResizeObserver(ajustar).observe(el);
  ajustar();

  /* Animación. */
  const d = new THREE.Object3D();
  const poner = (inst, i, x, y, z, s = 1, ry = 0) => {
    d.position.set(x, y, z);
    d.rotation.set(0, ry, 0);
    d.scale.setScalar(s);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  };
  const zLejos = (fase, t) => Z_LEJOS + modulo(fase + VELOCIDAD * t, LARGO);
  const zCerca = (fase, t) => Z_CERCA + modulo(fase + VELOCIDAD * t, LARGO_CERCA);
  const antes = new Map();
  let t = 0;

  function actualizar(dt) {
    // Decorado lejano
    palmas.forEach(([x, f], i) => poner(iPalmas, i, x, 0, zLejos(f, t), 1, i * 1.7));
    sombrillas.forEach(([x, f], i) => poner(iSombrillas, i, x, 0, zLejos(f, t), 1, i));
    pinas.forEach(([x, f], i) => poner(iPinas, i, x, 0, zLejos(f, t), 1, i));
    for (let i = 0; i < nRayas; i++) {
      const z = zLejos(i * (LARGO / nRayas), t);
      poner(iRayas, i, -CARRIL / 2, 0.012, z);
      poner(iRayas, nRayas + i, CARRIL / 2, 0.012, z);
    }
    // Obstáculos (carriles laterales) y su sombra
    cajas.forEach(([x, f], i) => {
      const z = zCerca(f, t);
      const s = suave((z - Z_CERCA) / 6) * suave((3.6 - z) / 1.2);
      poner(iCajas, i, x, 0, z, s);
      poner(sombras, 1 + i, x, 0.02, z, 1.45 * s);
    });
    // Frutas en el carril central: al llegar al personaje se "atrapan"
    const frutaLista = (inst, fases, y0) => fases.forEach((f, i) => {
      const z = zCerca(f, t);
      const clave = inst.uuid + i;
      const previo = antes.get(clave);
      if (previo !== undefined && previo < 0.3 && z >= 0.3) {
        nFrutas++;
        hud.frutas.textContent = nFrutas;
      }
      antes.set(clave, z);
      poner(inst, i, 0, y0 + Math.sin(t * 4 + i) * 0.06, z, suave((z - Z_CERCA) / 6) * suave((1.0 - z) / 0.7), t * 3 + i);
    });
    frutaLista(iFresas, fresas, 0.95);
    frutaLista(iMangos, mangos, 0.95);
    for (const inst of [iPalmas, iSombrillas, iPinas, iCajas, iFresas, iMangos, iRayas, sombras]) inst.instanceMatrix.needsUpdate = true;

    // Personaje
    const p = personajes[actual];
    const ciclo = t * 10;
    const s = Math.sin(ciclo);
    p.piernaI.rotation.x = s * 0.9;
    p.piernaD.rotation.x = -s * 0.9;
    p.brazoI.rotation.x = -s * 0.8;
    p.brazoD.rotation.x = s * 0.8;
    p.g.position.y = Math.abs(s) * 0.09;
    p.cuerpo.rotation.z = Math.sin(ciclo * 0.5) * 0.04;
    giro += (giroObjetivo - giro) * Math.min(1, dt * 10); // independiente de los FPS
    p.g.rotation.y = giro;
    poner(sombras, 0, 0, 0.02, 0, 1.2 - Math.abs(s) * 0.12);
    sombras.instanceMatrix.needsUpdate = true;
  }

  /* Cuadros por segundo y peso descargado (panel "Datos"). */
  let fps = 0;
  let cuadros = 0;
  let desde = performance.now();
  function pesoDescargado() {
    const nav = performance.getEntriesByType('navigation')[0];
    const recursos = performance.getEntriesByType('resource');
    const bytes = recursos.reduce((a, r) => a + (r.encodedBodySize || 0), nav?.encodedBodySize || 0);
    return { kb: bytes / 1024, n: recursos.length + 1 };
  }
  // HUD de demostración: reloj y barra de progreso hacia la meta (arranca en 0:42).
  function actualizarHUD() {
    const transcurrido = (t + 18) % 60;
    const resta = Math.ceil(60 - transcurrido);
    hud.reloj.textContent = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}`;
    hud.barra.style.width = `${(transcurrido / 60) * 100}%`;
  }
  actualizarHUD();
  function actualizarDatos(ahora) {
    cuadros++;
    if (ahora - desde < 500) return;
    fps = Math.round((cuadros * 1000) / (ahora - desde));
    cuadros = 0;
    desde = ahora;
    actualizarHUD();
    if (panelDatos.hidden) return;
    const i = renderer.info.render;
    const { kb, n } = pesoDescargado();
    const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
    panelDatos.innerHTML = `<b>${estilo.nombre}</b><br>FPS: ${fps}<br>Llamadas de dibujo: ${i.calls}<br>Triángulos: ${i.triangles.toLocaleString('es-CO')}<br>Resolución interna: ${sz.x}×${sz.y} (DPR ${renderer.getPixelRatio()})<br>Descargado: ${kb.toFixed(0)} KB en ${n} archivos`;
  }

  window.__preview = { renderer, escena, camara }; // gancho de depuración (medir costo de render desde la consola)

  let previo = performance.now();
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - previo) / 1000);
    previo = ahora;
    if (!pausado) t += dt;
    actualizar(dt);
    renderer.render(escena, camara);
    actualizarDatos(ahora);
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}
