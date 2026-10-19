// Estilo F · Jugoso con sombritas, sin línea: las sombras en escalones salen de la textura matcap (3 tonos
// con sombra violeta), así que no hay luces ni segundo dibujo del contorno. La opción más barata de las 3.
import * as THREE from '../../vendor/three/three.min.js';
import { iniciarPreview } from '../shared/kit.js';
import { crearMatcap } from '../shared/matcap.js';
import { paletaJugosa } from '../shared/paletas.js';

iniciarPreview({
  nombre: 'F · Sombritas sin línea',
  detalle: 1.6,
  paleta: paletaJugosa,
  material() {
    const m = new THREE.MeshMatcapMaterial({ vertexColors: true, matcap: crearMatcap({ pasos: 3 }) });
    m.color.setScalar(1.2);
    return m;
  },
  contorno: null,
});
