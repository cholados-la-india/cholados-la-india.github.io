// Estilo G · ELEGIDO (mezcla de D y F). Es la referencia visual para el juego real.
//   De D: brillo de gelatina, colores limpios y un contorno fino del color de cada objeto (no negro), un pelín más grueso.
//   De F: las "sombritas" en escalones (con sombra violeta), pero suavizadas para no saturar ni subir el contraste.
//   Todo vale igual para el choladito y para La India (comparten material y contorno).
import * as THREE from '../../vendor/three/three.min.js';
import { iniciarPreview } from '../shared/kit.js';
import { crearMatcap } from '../shared/matcap.js';
import { paletaJugosa } from '../shared/paletas.js';

iniciarPreview({
  nombre: 'G · Elegido (D + F)',
  detalle: 1.6,
  paleta: paletaJugosa,
  material() {
    // pasos 3 + mezcla 0.5: sombritas suaves. El brillo general baja de 1.25 a 1.15 para no saturar.
    const m = new THREE.MeshMatcapMaterial({ vertexColors: true, matcap: crearMatcap({ pasos: 3, mezcla: 0.5 }) });
    m.color.setScalar(1.15);
    return m;
  },
  // Tinta de color: el color del objeto oscurecido y mezclado con ciruela. Grosor: 1,5 px (en D era 1,1).
  contorno: { tinte: 0x3a0f33, oscuridad: 0.3, grosor: 1.5, alcance: 'jugables' },
});
