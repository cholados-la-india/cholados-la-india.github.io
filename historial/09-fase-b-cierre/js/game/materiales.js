// materiales.js — Material del estilo G y contorno fino de color.
// El contorno se movió tal cual desde web/previews/shared/kit.js. El material (matcap con sombritas suaves) es el de estilo-g.
import * as THREE from '../../vendor/three/three.min.js';
import { crearMatcap } from './matcap.js';

/* ───────────────────────── Contorno (solo en los estilos que lo piden) ───────────────────────── */
//
// Dos modos:
//  - { color: [r,g,b], grosor }                       → contorno de un solo color (p. ej. negro).
//  - { tinte, oscuridad, grosor, alcance: 'jugables' } → contorno "tinta de color": el color de cada objeto
//    oscurecido y mezclado con un tinte (nunca negro puro). Con alcance 'jugables' solo se dibuja en
//    personajes, obstáculos y frutas, no en el decorado.

export function crearContorno(cfg) {
  const resolucion = new THREE.Vector2(1, 1);
  const coloreado = cfg.tinte !== undefined;
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexColors: true,
    uniforms: {
      uRes: { value: resolucion },
      uPx: { value: cfg.grosor },
      uColor: { value: new THREE.Vector3(...(cfg.color ?? [0, 0, 0])) },
      uTinte: { value: new THREE.Vector3(...new THREE.Color(cfg.tinte ?? 0).toArray()) },
      uOsc: { value: cfg.oscuridad ?? 0.4 },
      uModo: { value: coloreado ? 1 : 0 },
    },
    vertexShader: `
      uniform vec2 uRes;
      uniform float uPx;
      varying vec3 vC;
      void main() {
        vC = color;
        vec4 pos = vec4(position, 1.0);
        vec3 nrm = normal;
        #ifdef USE_INSTANCING
          pos = instanceMatrix * pos;
          nrm = mat3(instanceMatrix) * nrm;
        #endif
        vec4 clip = projectionMatrix * modelViewMatrix * pos;
        vec3 vn = normalize(normalMatrix * nrm);
        vec2 dir = normalize((projectionMatrix * vec4(vn, 0.0)).xy * uRes);
        clip.xy += dir * (uPx * 2.0 / uRes) * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uTinte;
      uniform float uOsc;
      uniform float uModo;
      varying vec3 vC;
      void main() {
        vec3 c = uColor;
        if (uModo > 0.5) c = pow(mix(vC * uOsc, uTinte, 0.45), vec3(1.0 / 2.2));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  // Normales "suavizadas" (promedio en vértices que coinciden) para que el contorno no se rompa en las aristas.
  const cache = new WeakMap();
  const suavizada = (geo) => {
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const clave = (i) => `${Math.round(pos.getX(i) * 400)},${Math.round(pos.getY(i) * 400)},${Math.round(pos.getZ(i) * 400)}`;
    const acum = new Map();
    for (let i = 0; i < pos.count; i++) {
      const k = clave(i);
      const a = acum.get(k) ?? [0, 0, 0];
      a[0] += nor.getX(i);
      a[1] += nor.getY(i);
      a[2] += nor.getZ(i);
      acum.set(k, a);
    }
    const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const a = acum.get(clave(i));
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      out.set([a[0] / l, a[1] / l, a[2] / l], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', pos);
    g.setAttribute('color', geo.attributes.color);
    g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    return g;
  };

  return {
    material,
    todo: cfg.alcance !== 'jugables',
    geometria(geo) {
      if (!cache.has(geo)) cache.set(geo, suavizada(geo));
      return cache.get(geo);
    },
    ajustar(renderer) {
      renderer.getDrawingBufferSize(resolucion);
      material.uniforms.uPx.value = cfg.grosor * renderer.getPixelRatio();
    },
  };
}


/** Material del estilo G: matcap con sombritas suaves (pasos 3, mezcla 0.5) sobre color por vértice. Brillo 1.15 (no subirlo: satura). */
export function crearMaterialEstiloG() {
  const m = new THREE.MeshMatcapMaterial({ vertexColors: true, matcap: crearMatcap({ pasos: 3, mezcla: 0.5 }) });
  m.color.setScalar(1.15);
  return m;
}

/** Contorno del estilo G: tinta de color (color del objeto × 0,3 mezclado con ciruela), 1,5 px, solo en lo jugable. */
export const CONTORNO_ESTILO_G = { tinte: 0x3a0f33, oscuridad: 0.3, grosor: 1.5, alcance: 'jugables' };
