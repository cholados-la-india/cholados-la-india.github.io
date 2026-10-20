// modelos.js — Personajes y objetos del juego, construidos por código (sin archivos de modelo 3D).
// Movido tal cual desde web/previews/shared/kit.js (estilo G elegido en la Etapa 2): choladito, La India,
// caja de fruta, fresa, mango, palmera, sombrilla y piña. Cada personaje/objeto = UNA malla con color por vértice.
import * as THREE from '../../vendor/three/three.min.js';

export const RAD = Math.PI / 180;

export const mezcla = (a, b, t) => a + (b - a) * t;
export const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
export const suave = (t) => {
  t = limitar(t, 0, 1);
  return t * t * (3 - 2 * t);
};
export const modulo = (v, n) => ((v % n) + n) % n;
export const css = (n) => '#' + n.toString(16).padStart(6, '0');
/** Aclara u oscurece un color hexadecimal multiplicando sus canales por k (cada canal queda entre 0 y 255). */
export const tono = (hex, k) => {
  const c = (desp) => Math.min(255, Math.round(((hex >> desp) & 255) * k));
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

/* ───────────────────────── Geometría: piezas → una sola malla ───────────────────────── */

const _v = new THREE.Vector3();
const _n = new THREE.Matrix3();
const _c = new THREE.Color();

/** Una pieza = geometría + color + posición + rotación (radianes) + escala. */
export function pieza(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...esc),
  );
  return { geo, color, m };
}

/** Mueve varias piezas como un bloque. */
export function grupo(piezas, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) {
  const padre = pieza(null, 0, pos, rot, esc).m;
  return piezas.map((p) => ({ geo: p.geo, color: p.color, m: new THREE.Matrix4().multiplyMatrices(padre, p.m) }));
}

/** Une todas las piezas en una sola geometría con color por vértice. */
export function fusionar(piezas) {
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

export function crearModelos(detalle) {
  const S = (n) => Math.max(3, Math.round(n * detalle));
  const caja = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const cil = (rs, ri, h, seg = 8, abierto = false) => new THREE.CylinderGeometry(rs, ri, h, S(seg), 1, abierto);
  const medio = (r, h, seg = 10) => new THREE.CylinderGeometry(r, r, h, S(seg), 1, false, 0, Math.PI);
  const cono = (r, h, seg = 6, abierto = false) => new THREE.ConeGeometry(r, h, S(seg), 1, abierto);
  const esf = (r, a = 8, b = 6) => new THREE.SphereGeometry(r, S(a), Math.max(3, S(b)));
  // d = 0 facetado · d = 1 normal · d = 2 "fino" (solo si el estilo pide mucho detalle)
  const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d === 0 ? 0 : d === 2 && detalle >= 1.3 ? 2 : 1);
  // Versiones "mini" para adornos diminutos (cuentas, aretes, bandas): no crecen con el nivel de detalle y casi no cuestan triángulos.
  const esfMini = (r) => new THREE.SphereGeometry(r, 5, 3);
  const toroMini = (r, tubo, arco = Math.PI * 2) => new THREE.TorusGeometry(r, tubo, 3, 8, arco);
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
    // El contenido (hielo, almíbar) llega solo hasta el 88 % del radio del vaso: entre él y el plástico queda un huequito
    // donde van los trozos de fruta, así se ven DENTRO del vaso (antes estaban pegados al contenido y parecían por fuera).
    const NUC = 0.88;

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
        // Cada trozo varía muy poco de tono (±3 %): con más variación el hielo parecía un tablero de ajedrez.
        const k = 0.97 + ((f * 37 + s * 17) % 11) / 170;
        p.push(pieza(trozo(rAt(t1) * NUC, rAt(t0) * NUC, h, s * 30 * RAD, 30 * RAD), tono(COL[ch], k), [0, y, 0]));
        if (f >= 2 && f <= 4 && 'YOCPG'.includes(ch)) {
          // trozo de fruta pegado al plástico por dentro
          const th = (s + 0.5) * 30 * RAD;
          const rr = rAt((t0 + t1) / 2) * 0.985 - 0.04;
          const cx = Math.sin(th) * rr;
          const cz = Math.cos(th) * rr;
          const tx = Math.cos(th);
          const tz = -Math.sin(th);
          p.push(pieza(ico(0.095, 0), COL[ch], [cx, y, cz], [0, th, 0], [1.2, 1.05, 0.4]));
          p.push(pieza(ico(0.058, 0), COL[ch], [cx - tx * 0.065, y + 0.055, cz - tz * 0.065], [0, th, 0.4], [1.1, 1, 0.4]));
          if (ch === 'P') semillas(cx + Math.sin(th) * 0.04, y, cz + Math.cos(th) * 0.04, tx, tz, [[-0.04, 0.02], [0.03, 0.03], [0, -0.03], [0.05, -0.015]]);
          if (ch === 'G') semillas(cx + Math.sin(th) * 0.04, y, cz + Math.cos(th) * 0.04, tx, tz, [[-0.03, 0.01], [0.035, -0.02]]);
        }
      });
    });
    // Trozos de fruta (mango, papaya, banano, fresa, kiwi, maracuyá) contra el plástico por dentro: dos anillos completos,
    // uno sobre el almíbar y otro bajo el helado, que se ven a través del vaso (la carita queda entre los dos).
    const FRUTAS = [0xffc43d, 0xff8a3c, 0xfff1a8, 0xe5233e, 0x8bc34a, 0xffb62e];
    const anillo = (t, n, tam, desfase) => {
      const rr = rAt(t) * 0.985 - 0.04;
      for (let i = 0; i < n; i++) {
        const th = ((i + desfase) / n) * Math.PI * 2;
        const color = tono(FRUTAS[(i * 5 + Math.round(t * 10)) % FRUTAS.length], 0.95 + ((i * 29) % 7) / 60);
        const y = Y0 + t * H + (((i * 13) % 5) - 2) * 0.008;
        p.push(pieza(ico(tam * 0.8, 0), color, [Math.sin(th) * rr, y, Math.cos(th) * rr], [0.15 * (i % 3), th, i % 2 ? 0.3 : -0.25], [1.25, 1, 0.5]));
      }
    };
    anillo(0.27, 11, 0.12, 0);
    anillo(0.9, 11, 0.11, 0.5);
    p.push(pieza(new THREE.CircleGeometry(rAt(1) * 0.985, S(12)).rotateX(-Math.PI / 2), 0xfff5ec, [0, YT - 0.01, 0]));

    // Cara (al frente, o sea hacia -z): ojos, mejillas y sonrisa sobre el hielo blanco.
    const yCara = Y0 + 0.62 * H;
    const rCara = rAt(0.62) * NUC + 0.02;
    for (const lado of [-1, 1]) {
      const x = lado * 0.14;
      const z = -Math.sqrt(rCara ** 2 - x ** 2);
      p.push(pieza(esf(0.085, 6, 5), 0xffffff, [x, yCara, z], [0, 0, 0], [1, 1.15, 0.55]));
      p.push(pieza(esf(0.042, 5, 4), 0x20121a, [x * 0.92, yCara - 0.005, z - 0.035], [0, 0, 0], [1, 1.1, 0.6]));
      p.push(pieza(esfMini(0.015), 0xffffff, [x * 0.92 + 0.014, yCara + 0.016, z - 0.058])); // brillo en el ojo: lo hace ver vivo
      p.push(pieza(caja(0.11, 0.022, 0.02), 0x5a2a1a, [x, yCara + 0.14, -Math.sqrt(rCara ** 2 - x ** 2)], [0, lado * 0.3, -lado * 0.2])); // ceja
      const xm = lado * 0.27;
      p.push(pieza(esf(0.05, 5, 4), 0xff8fa8, [xm, yCara - 0.13, -Math.sqrt((rAt(0.5) * NUC + 0.015) ** 2 - xm ** 2)], [0, 0, 0], [1, 0.8, 0.5]));
    }
    p.push(pieza(toro(0.085, 0.018, 3, 8, Math.PI), 0x6b0f22, [0, yCara - 0.12, -(rAt(0.5) * NUC + 0.02)], [0, 0, Math.PI]));

    // Helado: UNA bola rosada (fresa/mora) con vetas oscuras; la leche condensada la cubre solo por arriba,
    // chorrea en lenguas planas pegadas a la bola, y encima va la uvita.
    const ey = YT + 0.17;
    const rb = 0.41;
    p.push(pieza(ico(rb, 2), 0xe59ab0, [0, ey, 0], [0, 0.4, 0], [1, 0.85, 1]));
    [[0.3, 0.0, 0.2], [-0.28, 0.02, -0.16], [0.02, -0.04, 0.36], [-0.2, 0.0, 0.3]].forEach(([x, y, z]) => p.push(pieza(ico(0.09, 0), 0xb5617f, [x, ey + y, z], [x, z, 0], [1.3, 0.8, 0.7])));
    p.push(pieza(new THREE.SphereGeometry(rb + 0.012, S(12), S(7), 0, Math.PI * 2, 0, Math.PI * 0.36), 0xeef2d2, [0, ey, 0], [0, 0.4, 0], [1, 0.85, 1]));
    const bordeY = ey + (rb + 0.012) * Math.cos(Math.PI * 0.36) * 0.85;
    const bordeR = (rb + 0.012) * Math.sin(Math.PI * 0.36);
    // Falda del helado (el borde con volumen que tienen las bolas de helado) apoyada en el borde del vaso.
    p.push(pieza(toro(0.4, 0.075, 4, 14), 0xd98aa3, [0, YT + 0.02, 0], [Math.PI / 2, 0, 0]));
    // Borde irregular de la leche condensada: ya no es una línea recta «pintada», sino una nata que se desborda en gotas.
    [0.2, 0.9, 1.5, 2.1, 2.8, 3.4, 4.0, 4.7, 5.4].forEach((a, i) => {
      const fi = 0.3 * Math.PI + (i % 3) * 0.035 * Math.PI;
      const R = rb + 0.012;
      p.push(pieza(esf(0.075 + (i % 2) * 0.02, 6, 5), 0xeef2d2, [Math.sin(fi) * Math.cos(a) * R, ey + Math.cos(fi) * R * 0.85, Math.sin(fi) * Math.sin(a) * R]));
    });
    [[0.3, 0.2], [1.0, 0.1], [1.7, 0.24], [2.4, 0.13], [3.1, 0.2], [3.8, 0.09], [4.5, 0.22], [5.2, 0.12], [5.8, 0.17]].forEach(([a, h]) => {
      const rr = bordeR + 0.012 + h * 0.08;
      p.push(pieza(capsula(0.034, h * 0.9), 0xeef2d2, [Math.cos(a) * rr, bordeY - h * 0.55 + 0.03, Math.sin(a) * rr], [0, -a, 0], [0.85, 1, 0.85]));
    });
    // Chispitas de colores sobre la leche condensada
    [[0.1, 0xd8287f], [0.9, 0xffd21f], [1.7, 0x66c3e0], [2.5, 0xd8287f], [3.3, 0x7bc043], [4.1, 0xffd21f], [4.9, 0x66c3e0], [5.7, 0xff8a1f]].forEach(([a, c], i) => {
      const fi = 0.12 * Math.PI + (i % 3) * 0.06 * Math.PI;
      const R = rb + 0.03;
      p.push(pieza(caja(0.07, 0.022, 0.022), c, [Math.sin(fi) * Math.cos(a) * R, ey + Math.cos(fi) * R * 0.85, Math.sin(fi) * Math.sin(a) * R], [i * 0.7, a, i * 0.5]));
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
    // Brazos: manga cremita con puño rojo y mano de guante blanco con pulgar. Piernas: medias de rayas y tenis con suela, puntera y cordones.
    const brazo = fusionar([
      pieza(capsula(0.05, 0.2), 0xfff1d6, [0, -0.14, 0]),
      pieza(toroMini(0.062, 0.02), 0xd92f58, [0, -0.25, 0], [Math.PI / 2, 0, 0]),
      pieza(esf(0.085, 6, 5), 0xffffff, [0, -0.3, 0]),
      pieza(ico(0.035, 0), 0xffffff, [0.07, -0.31, -0.05], [0.4, 0, 0.5], [1, 1.2, 1]),
    ]);
    const pierna = fusionar([
      pieza(cil(0.065, 0.065, 0.36, 6), 0xfff1d6, [0, -0.18, 0]),
      pieza(toroMini(0.07, 0.02), 0xd92f58, [0, -0.2, 0], [Math.PI / 2, 0, 0]),
      pieza(toroMini(0.07, 0.02), 0xd92f58, [0, -0.29, 0], [Math.PI / 2, 0, 0]),
      pieza(caja(0.2, 0.085, 0.3), 0xff7a1a, [0, -0.385, -0.05]),
      pieza(esf(0.1, 5, 4), 0xff7a1a, [0, -0.385, -0.2], [0, 0, 0], [1, 0.8, 0.9]),
      pieza(caja(0.22, 0.04, 0.36), 0xfff5ec, [0, -0.44, -0.07]),
      ...[-0.02, -0.08, -0.14].map((z) => pieza(caja(0.13, 0.014, 0.02), 0xffffff, [0, -0.335, z])),
    ]);
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

  /**
   * La India. De espaldas (como se ve casi todo el juego): penacho en dos filas de plumas, trenza con amarres de colores,
   * falda con greca y flecos. De frente (pantalla de inicio): ojos con brillo, cejas, nariz, boca, pintura en las mejillas,
   * aretes, collar de cuentas, cinturón tejido y trenzas al frente. Mira hacia -z.
   */
  function india() {
    const piel = 0xc9987f;
    const sombraPiel = tono(piel, 0.9);
    const pelo = 0x16100e;
    const verde = 0x6fa83c;
    const rojo = 0xd62f2f;
    const naranja = 0xf28a1e;
    const amarillo = 0xf5d313;
    const azul = 0x1e3fa8;
    const celeste = 0x4fa3e0;
    const colores = [rojo, amarillo, azul, naranja];
    const p = [];
    /** Una tira de piezas pequeñas alrededor de un tubo (radio r, altura y): greca, cinturón, cuentas... */
    const anilloDe = (n, r, y, hacer) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        p.push(hacer(i, a, [Math.cos(a) * r, y, Math.sin(a) * r]));
      }
    };

    // Falda verde con greca de colores sobre el borde y flecos de colores
    p.push(pieza(cil(0.2, 0.3, 0.42, 10, true), verde, [0, 0.78, 0]));
    anilloDe(16, 0.285, 0.66, (i, a, pos) => pieza(caja(0.085, 0.06, 0.03), colores[i % 4], pos, [0, -a + Math.PI / 2, 0]));
    anilloDe(16, 0.3, 0.5, (i, a, pos) => pieza(cono(0.045, 0.16, 4), [rojo, naranja, amarillo, celeste][i % 4], pos, [Math.PI, 0, 0]));

    // Torso verde con cinturón tejido
    p.push(pieza(cil(0.23, 0.2, 0.36, 10), verde, [0, 1.15, 0]));
    anilloDe(12, 0.21, 0.99, (i, a, pos) => pieza(caja(0.12, 0.075, 0.05), colores[i % 4], pos, [0, -a + Math.PI / 2, 0]));

    // Hombros, cuello, collar de cuentas con colgante y hombreras de colores (una roja, una azul)
    p.push(pieza(cil(0.2, 0.22, 0.12, 10), piel, [0, 1.39, 0]));
    p.push(pieza(cil(0.065, 0.07, 0.1, 6), piel, [0, 1.5, 0]));
    anilloDe(14, 0.205, 1.45, (i, a, pos) => pieza(esfMini(0.027), colores[i % 4], pos));
    p.push(pieza(ico(0.05, 0), celeste, [0, 1.385, -0.225], [0.3, 0, 0], [1, 1.2, 0.6]));
    for (const lado of [-1, 1]) {
      p.push(...grupo([pieza(caja(0.15, 0.2, 0.08), lado < 0 ? rojo : azul), pieza(caja(0.07, 0.09, 0.09), amarillo, [0, 0, 0], [0, 0, Math.PI / 4])], [lado * 0.27, 1.36, 0.02], [0, 0, lado * -0.15]));
    }

    // Cabeza
    const caraZ = (x, y) => -Math.sqrt(Math.max(0.0004, 0.2 * 0.2 - x * x - (y - 1.66) ** 2)); // z de la cara en (x, y)
    p.push(pieza(esf(0.2), piel, [0, 1.66, 0]));
    p.push(pieza(esf(0.225), pelo, [0, 1.68, 0.035], [0, 0, 0], [1, 1, 0.95]));
    p.push(pieza(toro(0.21, 0.028, 3, 12), 0x5c9a2b, [0, 1.75, 0], [Math.PI / 2, 0, 0])); // diadema verde
    // Trenza de atrás: cuentas de pelo que se achican, con amarres rojo, amarillo y azul y una borla
    for (let k = 0; k < 6; k++) p.push(pieza(esf(0.088 - k * 0.007, 6, 5), pelo, [k % 2 ? 0.014 : -0.014, 1.56 - k * 0.1, 0.2]));
    [[1, rojo], [3, amarillo], [5, azul]].forEach(([k, c]) => p.push(pieza(toroMini(0.074 - k * 0.005, 0.017), c, [0, 1.56 - k * 0.1 - 0.05, 0.2], [Math.PI / 2, 0, 0])));
    p.push(pieza(cono(0.05, 0.14, 5), rojo, [0, 0.93, 0.2], [Math.PI, 0, 0]));
    // Las dos trenzas del frente, con su amarre
    for (const lado of [-1, 1]) {
      p.push(pieza(capsula(0.034, 0.28), pelo, [lado * 0.215, 1.4, -0.03]));
      p.push(pieza(esfMini(0.046), lado < 0 ? rojo : amarillo, [lado * 0.215, 1.22, -0.03]));
    }
    // Rostro: ojos con brillo, cejas, nariz, boca, pintura en las mejillas, orejas con aretes
    for (const lado of [-1, 1]) {
      const x = lado * 0.078;
      const y = 1.655;
      const z = caraZ(x, y);
      p.push(pieza(esf(0.042, 6, 5), 0xffffff, [x, y, z + 0.004], [0, 0, 0], [1, 1.15, 0.5]));
      p.push(pieza(esfMini(0.027), 0x3a2418, [x, y - 0.002, z - 0.012], [0, 0, 0], [1, 1.1, 0.55]));
      p.push(pieza(esfMini(0.009), 0xffffff, [x + 0.009, y + 0.011, z - 0.021]));
      p.push(pieza(caja(0.075, 0.016, 0.014), pelo, [x, y + 0.052, caraZ(x, y + 0.052)], [0, lado * 0.25, -lado * 0.18])); // ceja
      p.push(pieza(esfMini(0.04), piel, [lado * 0.197, 1.66, 0], [0, 0, 0], [0.5, 1, 0.8])); // oreja
      p.push(pieza(toroMini(0.028, 0.008), 0xf5c518, [lado * 0.205, 1.585, 0], [0, Math.PI / 2, 0])); // arete
    }
    p.push(pieza(ico(0.032, 0), sombraPiel, [0, 1.615, caraZ(0, 1.615) - 0.012], [0.3, 0, 0], [1, 1.1, 1.1])); // nariz
    p.push(pieza(toroMini(0.045, 0.009, Math.PI), 0x8f2f2f, [0, 1.572, caraZ(0, 1.572) - 0.004], [0, 0, Math.PI])); // sonrisa
    [[-1, 0.0, rojo], [-1, -0.03, rojo], [1, 0.0, amarillo], [1, -0.03, azul]].forEach(([lado, dy, c]) =>
      p.push(pieza(caja(0.085, 0.015, 0.02), c, [lado * 0.125, 1.6 + dy, caraZ(lado * 0.125, 1.6 + dy) - 0.003], [0, lado * 0.5, lado * 0.25])));

    // Penacho: barras de color alrededor de la diadema y dos filas de plumas en abanico (la de atrás, larga; la de adelante, corta)
    for (let i = 0; i < 9; i++) {
      const a = (-80 + i * 20) * RAD;
      p.push(pieza(caja(0.06, 0.13, 0.05), colores[i % 4], [Math.sin(a) * 0.22, 1.84, 0.12 + Math.cos(a) * 0.12], [0, -a, 0]));
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
      const pluma = grupo([pieza(cono(0.075, largo, 4), plumas[i % 5], [0, largo / 2, 0], [0, 0, 0], [1, 1, 0.3])], [0, 1.86, 0.14], [0.5, 0, a]);
      p.push(...pluma);
      silueta.push(...pluma);
    }
    for (let i = 0; i < 9; i++) {
      const a = (-68 + i * 17) * RAD;
      const largo = 0.58 - Math.abs(i - 4) * 0.03;
      p.push(...grupo([pieza(cono(0.065, largo, 4), plumas[(i + 2) % 5], [0, largo / 2, 0], [0, 0, 0], [1, 1, 0.3])], [0, 1.84, 0.17], [0.9, 0, a]));
    }

    // Brazos: bandas de color en el brazo y la muñeca. Piernas: tobilleras y sandalias con correa.
    const brazo = fusionar([
      pieza(cil(0.05, 0.045, 0.5, 6), piel, [0, -0.25, 0]),
      pieza(esf(0.065, 6, 5), piel, [0, -0.52, 0]),
      pieza(toroMini(0.06, 0.017), rojo, [0, -0.1, 0], [Math.PI / 2, 0, 0]),
      pieza(toroMini(0.052, 0.014), amarillo, [0, -0.43, 0], [Math.PI / 2, 0, 0]),
    ]);
    const pierna = fusionar([
      pieza(cil(0.075, 0.06, 0.52, 6), piel, [0, -0.26, 0]),
      pieza(toroMini(0.072, 0.016), azul, [0, -0.2, 0], [Math.PI / 2, 0, 0]),
      pieza(toroMini(0.066, 0.016), naranja, [0, -0.47, 0], [Math.PI / 2, 0, 0]),
      pieza(caja(0.15, 0.09, 0.26), 0x8b5a2b, [0, -0.56, -0.05]),
      pieza(caja(0.17, 0.025, 0.28), 0x5e3a1a, [0, -0.6, -0.05]),
      pieza(caja(0.16, 0.03, 0.07), rojo, [0, -0.52, -0.06]),
    ]);
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

  /** Nube de atardecer: tres bultos de bajo polígono, rosados abajo y blancos arriba (se dibuja sin niebla, con material plano). */
  const nube = () => fusionar([
    pieza(ico(1.0, 1), 0xf3b8cf, [0, -0.25, 0], [0, 0, 0], [2.2, 0.55, 0.9]),
    pieza(ico(1.3, 1), 0xfff0f6, [0, 0.1, 0], [0, 0.3, 0], [1.3, 0.85, 0.9]),
    pieza(ico(0.95, 1), 0xffffff, [-1.5, -0.05, 0.1], [0, 0.6, 0], [1.2, 0.75, 0.85]),
    pieza(ico(1.0, 1), 0xffe3ee, [1.6, -0.1, 0], [0, 0.2, 0], [1.2, 0.7, 0.85]),
  ]);

  /** Cuerda de banderines que cruza la pista (dos postes y 13 banderas de colores colgando en curva). */
  const banderines = () => {
    const p = [];
    const mitad = 2.9;
    for (const lado of [-1, 1]) {
      p.push(pieza(cil(0.07, 0.09, 5.4, 6), 0xe9d3f0, [lado * mitad, 2.7, 0]));
      p.push(pieza(esf(0.12, 5, 4), 0xffd21f, [lado * mitad, 5.45, 0]));
    }
    const n = 13;
    const colores = [0xd8287f, 0xffd21f, 0x66c3e0, 0xb6e80a, 0xff8a1f];
    const punto = (u) => [-mitad + 2 * mitad * u, 5.2 - Math.sin(u * Math.PI) * 0.55];
    for (let i = 0; i < n; i++) {
      const [x0, y0] = punto(i / n);
      const [x1, y1] = punto((i + 1) / n);
      p.push(pieza(caja(Math.hypot(x1 - x0, y1 - y0) + 0.02, 0.035, 0.035), 0x3a0f33, [(x0 + x1) / 2, (y0 + y1) / 2, 0], [0, 0, Math.atan2(y1 - y0, x1 - x0)]));
      const [x, y] = punto((i + 0.5) / n);
      p.push(pieza(cono(0.16, 0.36, 3), colores[i % colores.length], [x, y - 0.2, 0], [Math.PI, 0, 0], [1, 1, 0.25]));
    }
    return fusionar(p);
  };

  /** Puestico de venta junto a la pista: mostrador de madera, toldo a rayas y un cholado de adorno. El frente mira hacia -z. */
  const puesto = () => {
    const p = [
      pieza(caja(2.0, 0.9, 1.0), 0xc98a3f, [0, 0.45, 0]),
      pieza(caja(2.1, 0.08, 1.15), 0x9a6428, [0, 0.93, -0.03]),
    ];
    for (const x of [-0.95, 0.95]) p.push(pieza(cil(0.05, 0.05, 2.1, 5), 0xeeeeee, [x, 1.05, -0.5]));
    for (let i = 0; i < 8; i++) p.push(pieza(caja(0.27, 0.06, 1.5), i % 2 ? 0xffffff : 0xd8287f, [-0.945 + i * 0.27, 2.12, -0.35], [-0.22, 0, 0]));
    p.push(pieza(cil(0.2, 0.13, 0.38, 8), 0xf7b6c6, [0.3, 1.16, -0.1]));
    p.push(pieza(esfMini(0.2), 0xffd0e0, [0.3, 1.42, -0.1]));
    p.push(pieza(esfMini(0.05), 0x4a2a86, [0.3, 1.62, -0.1]));
    p.push(pieza(caja(0.5, 0.35, 0.05), 0xffe86b, [-0.45, 1.2, -0.45]));
    return fusionar(p);
  };

  /** Dos personas animando (camisa y piel distintas, brazos arriba). Mira hacia -z. */
  const gente = () => {
    // Geometrías directas de pocos triángulos: se repiten 12 personas en la pista
    const tronco = new THREE.CylinderGeometry(0.16, 0.24, 0.62, 6, 1);
    const pies = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 6, 1);
    const persona = (x, camisa, piel, pelo) => [
      pieza(tronco, camisa, [x, 0.5, 0]),
      pieza(pies, 0x3a0f33, [x, 0.1, 0]),
      pieza(esfMini(0.16), piel, [x, 0.97, 0]),
      pieza(esfMini(0.175), pelo, [x, 1.02, 0.04], [0, 0, 0], [1, 0.8, 1]),
      pieza(caja(0.08, 0.34, 0.08), piel, [x - 0.27, 0.98, 0], [0, 0, 0.5]),
      pieza(caja(0.08, 0.34, 0.08), piel, [x + 0.27, 0.98, 0], [0, 0, -0.5]),
    ];
    return fusionar([...persona(-0.32, 0xd8287f, 0xc9987f, 0x16100e), ...persona(0.34, 0xffd21f, 0x8d5a3b, 0x3a2418)]);
  };

  return { cholado: cholado(), india: india(), cajaFruta: cajaFruta(), fresa: fresa(), mango: mango(), palmera: palmera(), sombrilla: sombrilla(), pina: pina(), nube: nube(), banderines: banderines(), puesto: puesto(), gente: gente(), caja, cono };
}

