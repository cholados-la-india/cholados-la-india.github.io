// Estilo B · Cartoon con contorno: sombreado en 3 tonos (cel shading) y borde negro grueso,
// como el logo y la ilustración de La India. Look de "calcomanía".
import * as THREE from '../../vendor/three/three.min.js';
import { iniciarPreview } from '../shared/kit.js';

/** Textura de 3 píxeles: define los 3 escalones de luz del sombreado cartoon. */
function gradiente(valores) {
  const datos = new Uint8Array(valores.map((v) => Math.round(v * 255)));
  const tex = new THREE.DataTexture(datos, valores.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

iniciarPreview({
  nombre: 'B · Cartoon con contorno',
  detalle: 1,
  paleta: {
    cieloArriba: 0xf2692b,
    cieloHorizonte: 0xffe24a,
    suelo: 0x62b02f,
    calle: 0x4b3a52,
    bordillo: 0xfbe822,
    linea: 0xfbe822,
    montanaA: 0x3e8e2f,
    montanaB: 0x2f7a3a,
    sol: 0xff7a1a,
    halo: 0xffc53a,
  },
  luces(escena) {
    escena.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.position.set(-4, 9, 6);
    escena.add(sol);
  },
  material: () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradiente([0.25, 0.65, 1]) }),
  // Contorno negro de ~2.4 px que se dibuja detrás de cada personaje y objeto.
  contorno: { color: [0.07, 0.03, 0.04], grosor: 2.4 },
});
