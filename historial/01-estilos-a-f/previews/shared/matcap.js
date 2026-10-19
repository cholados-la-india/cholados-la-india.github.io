// Matcap por código: una esfera iluminada pintada en un canvas de 128 px. El shader la "pega" sobre cada
// cara según hacia dónde mira. No necesita luces ni archivos de imagen.
//   pasos = 0               → degradado suave con brillo (efecto gelatina).
//   pasos = 3, mezcla = 1   → luz en escalones, con sombras de color violeta (las "sombritas" del estilo cartoon).
//   pasos = 3, mezcla = 0.5 → mitad y mitad: sombritas suaves sobre el brillo de gelatina.
import * as THREE from '../../vendor/three/three.min.js';

export function crearMatcap({ pasos = 0, mezcla = 1 } = {}) {
  const N = 128;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = N;
  const ctx = lienzo.getContext('2d');
  const img = ctx.createImageData(N, N);
  const L = [-0.45, 0.65, 0.62];
  const lon = Math.hypot(...L);
  const m = pasos > 0 ? mezcla : 0; // cuánto pesa la versión en escalones
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const nx = (x / (N - 1)) * 2 - 1;
      const ny = 1 - (y / (N - 1)) * 2;
      const r2 = Math.min(1, nx * nx + ny * ny);
      const nz = Math.sqrt(1 - r2);
      const ndl = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / lon);
      const rz = 2 * ndl * nz - L[2] / lon;

      // Versión suave (gelatina): degradado, brillo y luz de borde.
      const brilloS = Math.pow(Math.max(0, rz), 22) * 0.9;
      const bordeS = Math.pow(1 - nz, 3) * 0.22;
      const baseS = 0.58 + 0.27 * ndl;
      const sr = baseS + brilloS + bordeS;
      const sg = baseS * 0.98 + brilloS + bordeS;
      const sb = baseS * 1.03 + brilloS + bordeS;

      // Versión en escalones: la zona de sombra se tiñe hacia violeta en vez de oscurecerse a gris.
      let er = sr;
      let eg = sg;
      let eb = sb;
      if (pasos > 0) {
        const q = Math.min(pasos - 1, Math.floor(ndl * pasos)) / (pasos - 1);
        const base = 0.56 + 0.34 * q;
        const sombra = 1 - q;
        const brilloE = Math.pow(Math.max(0, rz), 26) > 0.5 ? 0.3 : 0;
        er = base + brilloE - sombra * 0.03;
        eg = base * 0.97 + brilloE - sombra * 0.05;
        eb = base * 1.04 + brilloE + sombra * 0.05;
      }

      const i = (y * N + x) * 4;
      img.data[i] = Math.min(255, (sr * (1 - m) + er * m) * 255);
      img.data[i + 1] = Math.min(255, (sg * (1 - m) + eg * m) * 255);
      img.data[i + 2] = Math.min(255, (sb * (1 - m) + eb * m) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
