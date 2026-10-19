// Estilo C · Jugoso: formas más redondeadas, brillo de gelatina y colores del menú (magenta, lima, celeste).
// Sin luces: el brillo sale de una textura "matcap" generada por código (cero archivos, muy barato).
import * as THREE from '../../vendor/three/three.min.js';
import { iniciarPreview } from '../shared/kit.js';

/** Matcap: una esfera iluminada pintada en un canvas de 128 px. El shader la "pega" según hacia dónde mira cada cara. */
function crearMatcap() {
  const N = 128;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = N;
  const ctx = lienzo.getContext('2d');
  const img = ctx.createImageData(N, N);
  const L = [-0.45, 0.65, 0.62];
  const lon = Math.hypot(...L);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const nx = (x / (N - 1)) * 2 - 1;
      const ny = 1 - (y / (N - 1)) * 2;
      const r2 = Math.min(1, nx * nx + ny * ny);
      const nz = Math.sqrt(1 - r2);
      const ndl = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / lon);
      // Brillo (reflejo): pico blanco hacia arriba-izquierda.
      const rz = (2 * ndl * nz) - L[2] / lon;
      const brillo = Math.pow(Math.max(0, rz), 22) * 0.9;
      const borde = Math.pow(1 - nz, 3) * 0.22; // luz de borde: da aspecto de gelatina
      const base = 0.58 + 0.27 * ndl;
      const i = (y * N + x) * 4;
      img.data[i] = Math.min(255, (base + brillo + borde) * 255);
      img.data[i + 1] = Math.min(255, (base * 0.98 + brillo + borde) * 255);
      img.data[i + 2] = Math.min(255, (base * 1.03 + brillo + borde) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

iniciarPreview({
  nombre: 'C · Jugoso (matcap)',
  detalle: 1.4, // más segmentos = formas más redondas (a cambio de más triángulos)
  paleta: {
    cieloArriba: 0xd8287f,
    cieloHorizonte: 0xff9e5e,
    suelo: 0xb6e80a,
    calle: 0x4a1b52,
    bordillo: 0x66c3e0,
    linea: 0x66c3e0,
    montanaA: 0xa53c8a,
    montanaB: 0x8e2c79,
    sol: 0xffe86b,
    halo: 0xffb36b,
  },
  material() {
    const m = new THREE.MeshMatcapMaterial({ vertexColors: true, matcap: crearMatcap() });
    m.color.setScalar(1.25); // sube el brillo: los reflejos del matcap se vuelven casi blancos
    return m;
  },
  contorno: null,
});
