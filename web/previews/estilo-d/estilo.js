// Estilo D · Jugoso + trazo fino: igual que C (tu favorito), con más detalle y un contorno fino del color
// de cada objeto (no negro), solo en lo que se "toca": personaje, cajas y frutas. Lo más cercano a C.
import * as THREE from '../../vendor/three/three.min.js';
import { iniciarPreview } from '../shared/kit.js';
import { crearMatcap } from '../shared/matcap.js';
import { paletaJugosa } from '../shared/paletas.js';

iniciarPreview({
  nombre: 'D · Jugoso + trazo fino',
  detalle: 1.6,
  paleta: paletaJugosa,
  material() {
    const m = new THREE.MeshMatcapMaterial({ vertexColors: true, matcap: crearMatcap({ pasos: 0 }) });
    m.color.setScalar(1.25); // sube el brillo: los reflejos del matcap se vuelven casi blancos
    return m;
  },
  // Tinta de color: el color del objeto oscurecido y mezclado con un morado ciruela. Grosor: 1,1 px.
  contorno: { tinte: 0x3a0f33, oscuridad: 0.3, grosor: 1.1, alcance: 'jugables' },
});
