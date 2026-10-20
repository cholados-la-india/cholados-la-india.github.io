// modelos-nivel.js — Obstáculos nuevos de la Etapa 3 y la meta, construidos por código con el mismo estilo (G).
// (La caja de fruta, las frutas y el decorado están en modelos.js.) Cada objeto = UNA malla con color por vértice.
import * as THREE from '../../vendor/three/three.min.js';
import { fusionar, grupo, pieza } from './modelos.js';

const caja = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cil = (rs, ri, h, seg = 8) => new THREE.CylinderGeometry(rs, ri, h, seg, 1);
const esf = (r, a = 8, b = 6) => new THREE.SphereGeometry(r, a, b);
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);

/** Pila alta de 3 cajas con fruta encima: NO se salta, hay que esquivarla (alto 2,0). */
export function crearPilaAlta() {
  const p = [];
  const cajaConTablas = (y, ancho, color) => {
    p.push(pieza(caja(ancho, 0.64, 0.8), color, [0, y, 0]));
    [-0.2, 0.0, 0.2].forEach((dy) => p.push(pieza(caja(ancho + 0.03, 0.05, 0.83), 0x8a5722, [0, y + dy, 0])));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => p.push(pieza(caja(0.08, 0.68, 0.08), 0x6a3f15, [sx * (ancho / 2 - 0.02), y, sz * 0.38])));
  };
  cajaConTablas(0.32, 1.0, 0xc98a3f);
  cajaConTablas(0.96, 0.96, 0xd49a4a);
  cajaConTablas(1.6, 0.92, 0xc98a3f);
  [[-0.2, 0.0], [0.18, -0.1], [0.0, 0.2]].forEach(([x, z]) => p.push(pieza(ico(0.17), 0xff8a1f, [x, 2.02, z])));
  p.push(pieza(ico(0.15), 0xffc21a, [0.3, 1.98, 0.18], [0, 0, 0], [1, 1.2, 0.9]));
  p.push(pieza(new THREE.ConeGeometry(0.08, 0.2, 4), 0x4caf3d, [-0.05, 2.22, 0.02]));
  return fusionar(p);
}

/** Barra baja que cruza los 3 carriles (se salta): vara a rayas magenta/lima sobre dos postes con bola (alto 0,6). */
export function crearBarraBaja() {
  const p = [];
  const largo = 3.6;
  const franjas = 9;
  for (let i = 0; i < franjas; i++) {
    const w = largo / franjas;
    p.push(pieza(caja(w * 0.98, 0.17, 0.2), i % 2 ? 0xb6e80a : 0xd8287f, [-largo / 2 + w * (i + 0.5), 0.46, 0]));
  }
  for (const lado of [-1, 1]) {
    p.push(pieza(cil(0.08, 0.1, 0.56, 8), 0xfff4db, [lado * (largo / 2 + 0.05), 0.28, 0]));
    p.push(pieza(esf(0.13), 0xffd21f, [lado * (largo / 2 + 0.05), 0.62, 0]));
  }
  // Banderines de tela colgando de la vara
  for (let i = 0; i < 6; i++) {
    const x = -largo / 2 + largo * ((i + 0.5) / 6);
    p.push(pieza(new THREE.ConeGeometry(0.1, 0.22, 3), [0xffd21f, 0x66c3e0, 0xff8a1f][i % 3], [x, 0.26, 0], [Math.PI, 0, 0]));
  }
  return fusionar(p);
}

/** Pared del cartel ¡META! (una malla con colores por vértice). El texto va aparte, en un plano con textura. */
export function crearArcoMeta() {
  const p = [];
  const mitad = 2.55; // los postes quedan fuera de los bordillos (±2,0)
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      p.push(pieza(cil(0.2, 0.22, 0.5, 10), i % 2 ? 0xb6e80a : 0xd8287f, [lado * mitad, 0.25 + i * 0.5, 0]));
    }
    p.push(pieza(esf(0.3, 10, 8), 0xffd21f, [lado * mitad, 5.15, 0]));
  }
  // viga a franjas y, encima, el tablero del cartel (ciruela con marco amarillo): el cartel grande se lee desde lejos
  const franjas = 11;
  const ancho = mitad * 2 + 0.6;
  for (let i = 0; i < franjas; i++) {
    const w = ancho / franjas;
    p.push(pieza(caja(w, 0.55, 0.45), i % 2 ? 0xb6e80a : 0xd8287f, [-ancho / 2 + w * (i + 0.5), 3.55, 0]));
  }
  p.push(pieza(caja(4.95, 1.5, 0.12), 0xffd21f, [0, 4.6, -0.04]));
  p.push(pieza(caja(4.7, 1.3, 0.2), 0x3a0f33, [0, 4.6, 0]));
  // banderines colgando de la viga
  [0xd8287f, 0xffd21f, 0x66c3e0, 0xb6e80a, 0xff8a1f].forEach((c, k) => {
    for (let i = 0; i < 3; i++) p.push(pieza(new THREE.ConeGeometry(0.17, 0.4, 3), c, [-2.2 + (k * 3 + i) * 0.3143, 3.05, 0.2], [Math.PI, 0, 0], [1, 1, 0.25]));
  });
  // Línea de meta sobre el piso: tablero de ajedrez
  const n = 12;
  const c = (mitad * 2) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2; j++) {
      p.push(pieza(caja(c, 0.03, 0.34), (i + j) % 2 ? 0xfff4db : 0x3a0f33, [-mitad + c * (i + 0.5), 0.02, -0.17 + j * 0.34]));
    }
  }
  return fusionar(p);
}

/** Cartel "¡META!" como plano con textura de canvas (se dibuja con la fuente del juego). */
export function crearCartelMeta(texto) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 1024;
  lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  const dibujar = () => {
    ctx.clearRect(0, 0, 1024, 256);
    ctx.font = '190px "Lilita One", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#d8287f';
    ctx.strokeText(texto, 512, 138);
    ctx.fillStyle = '#ffe86b';
    ctx.fillText(texto, 512, 138);
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  dibujar();
  // Si la fuente aún no cargó, se vuelve a dibujar cuando esté lista
  document.fonts?.load('190px "Lilita One"').then(dibujar).catch(() => {});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.125), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));
  m.position.set(0, 4.6, 0.12);
  return m;
}

export { grupo };
