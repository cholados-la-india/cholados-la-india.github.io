// Estilo E · Jugoso + sombritas: la mezcla más literal de B y C. Paleta y formas de C, sombreado en 4
// escalones como B (con sombras moradas, no grises) y contorno fino de color en lo jugable.
import * as THREE from '../../vendor/three/three.min.js';
import { iniciarPreview } from '../shared/kit.js';
import { paletaJugosa } from '../shared/paletas.js';

/** Textura de 4 píxeles: define los escalones de luz del sombreado tipo dibujo. */
function gradiente(valores) {
  const datos = new Uint8Array(valores.map((v) => Math.round(v * 255)));
  const tex = new THREE.DataTexture(datos, valores.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

iniciarPreview({
  nombre: 'E · Jugoso + sombritas',
  detalle: 1.6,
  paleta: paletaJugosa,
  luces(escena) {
    // El "suelo" de la luz hemisférica es morado: así las sombras salen de color y no grises.
    escena.add(new THREE.HemisphereLight(0xfff0e6, 0x9a3a86, 1.8));
    const sol = new THREE.DirectionalLight(0xfff4e0, 2.0);
    sol.position.set(-4, 9, 6);
    escena.add(sol);
  },
  material: () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradiente([0.5, 0.74, 0.92, 1]) }),
  contorno: { tinte: 0x3a0f33, oscuridad: 0.3, grosor: 1.3, alcance: 'jugables' },
});
