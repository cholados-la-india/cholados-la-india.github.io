// Estilo A · Low poly facetado: caras planas con luz de mediodía, colores sólidos y limpios.
import * as THREE from '../../vendor/three/three.min.js';
import { iniciarPreview } from '../shared/kit.js';

iniciarPreview({
  nombre: 'A · Low poly facetado',
  detalle: 0.8, // menos segmentos = facetas más marcadas y menos triángulos
  paleta: {
    cieloArriba: 0x2fa9f0,
    cieloHorizonte: 0xfff0b8,
    suelo: 0x8ccb4a,
    calle: 0x6f6a78,
    bordillo: 0xe9e3d2,
    linea: 0xffffff,
    montanaA: 0x5fae86,
    montanaB: 0x3f8f78,
    sol: 0xffe066,
    halo: 0xfff3b0,
  },
  luces(escena) {
    escena.add(new THREE.HemisphereLight(0xfff4d6, 0x8a6a4c, 1.4));
    const sol = new THREE.DirectionalLight(0xffffff, 2.0);
    sol.position.set(-4, 9, 6);
    escena.add(sol);
  },
  material: () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  contorno: null,
});
