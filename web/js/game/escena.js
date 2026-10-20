// escena.js — Todo lo que se dibuja con Three.js: pista, decorado, obstáculos, frutas, meta, personajes y efectos.
// No decide nada del juego: solo MUESTRA el estado que le pasa la lógica (`partida`) en cada cuadro.
//
// Rendimiento (heredado de los previews): una malla fusionada por personaje/objeto, InstancedMesh para lo repetido,
// sombras falsas, cielo en CSS, sin luces (matcap). Además hay "calidad adaptativa": si el celular no sostiene los
// FPS, baja la resolución y por último quita el contorno (nunca vuelve a subir en la misma sesión).
import * as THREE from '../../vendor/three/three.min.js';
import { crearContorno, crearMaterialEstiloG, CONTORNO_ESTILO_G } from './materiales.js';
import { crearModelos, css, fusionar, limitar, modulo, pieza, RAD, suave } from './modelos.js';
import { crearArcoMeta, crearBarraBaja, crearCartelMeta, crearPilaAlta } from './modelos-nivel.js';
import { paletaJugosa as pal } from './paleta.js';

const LARGO = 80; // vuelta completa del decorado lejano
const Z_LEJOS = -78;
const CAMARA_INICIO = { pos: [0, 2.1, 4.6], mira: [0, 0.55, 0] };
const COLORES_CONFETI = [0xd8287f, 0xb6e80a, 0x66c3e0, 0xffe86b, 0xff8a1f, 0xffffff];
const MAX = { cajaBaja: 26, pilaAlta: 18, barraBaja: 6, fresa: 40, mango: 40 };
// Festejo al llegar a la meta: [segundos desde que ganó, x, y] de cada nueva ola de confeti (además del primer chorro)
const ONDAS_META = [[0.25, -2.2, 2.0], [0.5, 2.2, 2.0], [0.8, 0, 2.8], [1.1, -1.3, 1.8], [1.35, 1.3, 1.8]];

export function crearEscena(canvas, contenedor, cfg, tema = {}) {
  // Celulares de entrada (Chrome/Android informa la memoria aproximada; el iPhone no la informa, así que nunca cae aquí):
  // sin suavizado de bordes y arrancando con menos resolución, para que la primera partida ya vaya fluida (Etapa 6).
  const gamaBaja = (navigator.deviceMemory ?? 8) <= 2;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !gamaBaja, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  contenedor.style.setProperty('--cielo-arriba', css(pal.cieloArriba));
  contenedor.style.setProperty('--cielo-horizonte', css(pal.cieloHorizonte));

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(pal.cieloHorizonte, 14, 90);
  const camara = new THREE.PerspectiveCamera(60, 0.5, 0.1, 160);

  const material = crearMaterialEstiloG();
  const contorno = crearContorno(CONTORNO_ESTILO_G);
  const M = crearModelos(1.6);
  const contornos = []; // mallas de contorno (para quitarlas si el celular va justo)

  function crearMalla(geo, { instancias = 0, conContorno = true, jugable = true, geoContorno = null } = {}) {
    const m = instancias ? new THREE.InstancedMesh(geo, material, instancias) : new THREE.Mesh(geo, material);
    if (instancias) m.frustumCulled = false;
    if (conContorno && (jugable || contorno.todo)) {
      const g = contorno.geometria(geoContorno ?? geo);
      const o = instancias ? new THREE.InstancedMesh(g, contorno.material, instancias) : new THREE.Mesh(g, contorno.material);
      if (instancias) {
        o.instanceMatrix = m.instanceMatrix;
        o.frustumCulled = false;
      }
      m.add(o);
      m.userData.contorno = o; // para igualar su `count` con el de la malla (si no, dibuja instancias fantasma)
      contornos.push(o);
    }
    return m;
  }
  /** Cuántas instancias se dibujan (en la malla y en su contorno). */
  function fijarCuenta(inst, n) {
    inst.count = n;
    if (inst.userData.contorno) inst.userData.contorno.count = n;
  }

  /* ───────────── Decorado fijo: suelo, calle, bordillos y montañas ───────────── */
  const fijo = [
    pieza(new THREE.PlaneGeometry(90, 170), pal.suelo, [0, -0.02, -40], [-Math.PI / 2, 0, 0]),
    pieza(new THREE.PlaneGeometry(3.6, 170), pal.calle, [0, 0, -40], [-Math.PI / 2, 0, 0]),
    ...[-1, 1].map((lado) => pieza(M.caja(0.22, 0.12, 170), pal.bordillo, [lado * 1.91, 0.06, -40])),
  ];
  [[-26, -62, 13, 9, 0], [-10, -70, 15, 13, 1], [9, -66, 14, 8, 0], [27, -60, 13, 10, 1], [-38, -55, 10, 6, 1], [40, -52, 11, 7, 0], [0, -84, 18, 11, 0]]
    .forEach(([x, z, r, h, k]) => fijo.push(pieza(M.cono(r, h, 6), k ? pal.montanaB : pal.montanaA, [x, h / 2 - 0.02, z])));
  escena.add(crearMalla(fusionar(fijo), { conContorno: false }));

  const sol = new THREE.Mesh(new THREE.CircleGeometry(9, 28), new THREE.MeshBasicMaterial({ color: pal.sol, fog: false }));
  const halo = new THREE.Mesh(new THREE.CircleGeometry(15, 28), new THREE.MeshBasicMaterial({ color: pal.halo, fog: false, transparent: true, opacity: 0.35, depthWrite: false }));
  sol.position.set(9, 18, -105);
  halo.position.set(9, 18, -106);
  escena.add(halo, sol);

  /* ───────────── Repetidos (InstancedMesh) ───────────── */
  const palmas = [[-3.6, 0], [3.8, 5], [-4.7, 20], [4.6, 25], [-3.6, 40], [3.9, 45], [-4.8, 60], [4.5, 65]];
  const sombrillas = [[-3.0, 12], [3.1, 33], [-3.2, 52], [3.0, 72]];
  const pinas = [[-4.2, 30], [4.3, 10], [-4.4, 70]];
  const nRayas = 22;
  const iPalmas = crearMalla(M.palmera, { instancias: palmas.length, jugable: false });
  const iSombrillas = crearMalla(M.sombrilla, { instancias: sombrillas.length, jugable: false });
  const iPinas = crearMalla(M.pina, { instancias: pinas.length, jugable: false });
  // Más ambiente (Fase B): gente animando, puestos, cuerdas de banderines y nubes de atardecer
  const gente = [[-3.5, 16], [3.5, 22], [-3.6, 36], [3.5, 49], [-3.4, 57], [3.6, 77]]; // [x, fase]
  const puestos = [[-5.3, 14], [5.3, 42], [-5.5, 66]];
  const cuerdas = [30, 70];
  const nubes = [[-34, 24, -100, 4.2], [-18, 17, -98, 3.0], [27, 21, -100, 3.6], [42, 15, -96, 2.6], [8, 31, -102, 3.0]]; // [x, y, z, escala]
  const iGente = crearMalla(M.gente, { instancias: gente.length, jugable: false });
  const iPuestos = crearMalla(M.puesto, { instancias: puestos.length, jugable: false });
  const iCuerdas = crearMalla(M.banderines, { instancias: cuerdas.length, jugable: false });
  const iNubes = new THREE.InstancedMesh(M.nube, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), nubes.length);
  iNubes.frustumCulled = false;
  const iRayas = crearMalla(fusionar([pieza(M.caja(0.09, 0.02, 1.1), pal.linea)]), { instancias: nRayas * 2, conContorno: false });
  const iCajas = crearMalla(M.cajaFruta, { instancias: MAX.cajaBaja });
  const iPilas = crearMalla(crearPilaAlta(), { instancias: MAX.pilaAlta });
  const iBarras = crearMalla(crearBarraBaja(), { instancias: MAX.barraBaja });
  const iFresas = crearMalla(M.fresa, { instancias: MAX.fresa });
  const iMangos = crearMalla(M.mango, { instancias: MAX.mango });
  const todasInstancias = [iPalmas, iSombrillas, iPinas, iRayas, iCajas, iPilas, iBarras, iFresas, iMangos];
  escena.add(...todasInstancias, iGente, iPuestos, iCuerdas, iNubes);

  const maxSombras = 1 + MAX.cajaBaja + MAX.pilaAlta;
  const sombras = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
    maxSombras,
  );
  sombras.frustumCulled = false;
  escena.add(sombras);

  /* ───────────── Meta: arco + cartel + el cholado que se "atrapa" ───────────── */
  const meta = new THREE.Group();
  meta.add(crearMalla(crearArcoMeta()));
  meta.add(crearCartelMeta(tema.textoMeta ?? '¡META!'));
  const premio = crearMalla(M.cholado.cuerpo, { geoContorno: M.cholado.contornoCuerpo });
  premio.add(new THREE.Mesh(M.cholado.cascaron, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false })));
  premio.scale.setScalar(1.55);
  premio.position.set(0, 4.65, 0);
  premio.rotation.y = Math.PI; // la carita mira hacia quien llega
  meta.add(premio);
  meta.visible = false;
  escena.add(meta);

  /* ───────────── Personajes ───────────── */
  const plastico = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false });
  function ensamblar(modelo) {
    const g = new THREE.Group();
    const partes = { g, escala: modelo.escala, cuerpo: crearMalla(modelo.cuerpo, { geoContorno: modelo.contornoCuerpo }) };
    if (modelo.cascaron) partes.cuerpo.add(new THREE.Mesh(modelo.cascaron, plastico));
    g.add(partes.cuerpo);
    for (const [nombre, geo] of [['brazoI', modelo.brazo], ['brazoD', modelo.brazo], ['piernaI', modelo.pierna], ['piernaD', modelo.pierna]]) {
      const m = crearMalla(geo);
      m.position.set(...modelo.anclas[nombre]);
      g.add(m);
      partes[nombre] = m;
    }
    g.scale.setScalar(modelo.escala);
    g.visible = false;
    escena.add(g);
    return partes;
  }
  const personajes = { cholado: ensamblar(M.cholado), india: ensamblar(M.india) };
  let actual = cfg.desarrollo.personajeInicial in personajes ? cfg.desarrollo.personajeInicial : 'india';
  personajes[actual].g.visible = true;

  /* ───────────── Restos del choque: la caja golpeada sale volando (hasta 4 a la vez) ───────────── */
  const MAX_RESTOS = 4;
  const iRestos = crearMalla(M.cajaFruta, { instancias: MAX_RESTOS });
  escena.add(iRestos);
  fijarCuenta(iRestos, 0);
  const restos = Array.from({ length: MAX_RESTOS }, () => ({ vida: 0, vidaMax: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, wx: 0, wz: 0, s: 1 }));
  function lanzarResto(o, xJugador) {
    const q = restos.find((r) => r.vida <= 0) ?? restos[0];
    const x = o.carril < 0 ? xJugador : (o.carril - 1) * cfg.carriles.ancho;
    const lado = x > xJugador + 0.05 ? 1 : x < xJugador - 0.05 ? -1 : Math.random() < 0.5 ? -1 : 1;
    Object.assign(q, {
      vida: 0.95, vidaMax: 0.95, x, y: 0.35, z: 0,
      vx: lado * (3.2 + Math.random()), vy: 5.5 + Math.random() * 1.5, vz: -3,
      rx: 0, rz: 0, wx: 5 + Math.random() * 4, wz: lado * (6 + Math.random() * 4),
      s: o.tipo === 'pilaAlta' ? 1.15 : o.tipo === 'barraBaja' ? 0.85 : 1,
    });
  }

  /* ───────────── Partículas (confeti, polvo, trozos de caja y de fruta) ───────────── */
  const NP = 220;
  const pMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), NP);
  pMesh.frustumCulled = false;
  const blanco = new THREE.Color(0xffffff);
  const particulas = Array.from({ length: NP }, (_, i) => {
    pMesh.setColorAt(i, blanco);
    return { vida: 0, vidaMax: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1, g: 9, giro: 0 };
  });
  escena.add(pMesh);
  const _col = new THREE.Color();
  function emitir(n, x, y, z, colores, { vel = 3, tam = 0.12, vida = 0.7, gravedad = 9, arriba = 2 } = {}) {
    let creadas = 0;
    for (let i = 0; i < NP && creadas < n; i++) {
      const q = particulas[i];
      if (q.vida > 0) continue;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random();
      q.vida = q.vidaMax = vida * (0.6 + Math.random() * 0.6);
      q.x = x;
      q.y = y;
      q.z = z;
      q.vx = Math.cos(a) * vel * r;
      q.vz = Math.sin(a) * vel * r * 0.25 - 0.4; // casi no vienen hacia la cámara (si no, tapan la pantalla)
      q.vy = arriba + Math.random() * vel * 0.7;
      q.s = tam * (0.6 + Math.random() * 0.8);
      q.g = gravedad;
      q.giro = Math.random() * 6;
      pMesh.setColorAt(i, _col.set(colores[Math.floor(Math.random() * colores.length)]));
      creadas++;
    }
    if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
  }

  /* ───────────── Utilidades de cuadro ───────────── */
  const d = new THREE.Object3D();
  const poner = (inst, i, x, y, z, s = 1, ry = 0) => {
    d.position.set(x, y, z);
    d.rotation.set(0, ry, 0);
    d.scale.setScalar(s);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  };
  const zLejos = (fase, D) => Z_LEJOS + modulo(fase + D, LARGO);

  let idleD = 0;
  let idleT = 0;
  let giro = Math.PI; // hacia dónde mira el personaje (π = hacia la cámara)
  let ciclo = 0; // fase de la carrera
  let xPrev = 0;
  let inclinacion = 0;
  let modoCam = 0; // 0 = pantalla de inicio · 1 = jugando
  let temblor = 0;
  let metaCelebrada = false;
  let tropiezo = 0; // segundos que le quedan al tambaleo después de un choque
  let ondaMeta = 0; // cuántas olas de confeti del festejo ya salieron
  let calidad = 0;
  let ema = 1 / 60; // tiempo medio por cuadro (promedio móvil)
  let cuadrosDesdeCambio = 0;
  let emaAntes = 0;
  let revisando = false; // acabamos de bajar la calidad y falta ver si sirvió
  let calidadBloqueada = false;
  let camaraManual = null; // { pos: [x, y, z], mira: [x, y, z] } o null
  let dprBase = Math.min(window.devicePixelRatio || 1, cfg.rendimiento.pixelRatioMax);
  renderer.setPixelRatio(dprBase);

  function ajustar() {
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.fov = limitar((2 * Math.atan(Math.tan((44 * RAD) / 2) / camara.aspect)) / RAD, 50, 84);
    camara.updateProjectionMatrix();
    contorno.ajustar(renderer);
  }
  new ResizeObserver(ajustar).observe(contenedor);
  ajustar();

  /** Baja un escalón de calidad si el celular no sostiene los FPS. Nunca vuelve a subir. */
  const NIVELES = [
    { dpr: 1.5, contorno: true },
    { dpr: 1.25, contorno: true },
    { dpr: 1.0, contorno: true },
    { dpr: 1.0, contorno: false },
    { dpr: 0.8, contorno: false },
  ];
  function aplicarCalidad(n) {
    calidad = Math.min(n, NIVELES.length - 1);
    const nv = NIVELES[calidad];
    renderer.setPixelRatio(Math.min(dprBase, nv.dpr));
    for (const o of contornos) o.visible = nv.contorno;
    ajustar();
  }
  if (gamaBaja) aplicarCalidad(2); // arranca en 1,0 de resolución (con contorno); el sistema adaptativo puede seguir bajando

  /* ───────────── El cuadro ───────────── */
  /**
   * @param dt        segundos de animación (0 si está en pausa)
   * @param dtReal    segundos reales desde el cuadro anterior (para medir rendimiento)
   * @param p         la partida (o null en la pantalla de inicio)
   * @param jugando   true mientras se muestra la partida (cuenta, juego, final)
   */
  function frame(dt, dtReal, p, jugando, medir = false) {
    const W = cfg.carriles.ancho;
    const D = p ? p.D : (idleD += 1.6 * dt);
    const vel = p ? p.vel : 1.6;
    idleT += dt;

    // --- Decorado que da la sensación de velocidad
    palmas.forEach(([x, f], i) => poner(iPalmas, i, x, 0, zLejos(f, D), 1, i * 1.7));
    sombrillas.forEach(([x, f], i) => poner(iSombrillas, i, x, 0, zLejos(f, D), 1, i));
    pinas.forEach(([x, f], i) => poner(iPinas, i, x, 0, zLejos(f, D), 1, i));
    gente.forEach(([x, f], i) => poner(iGente, i, x, Math.abs(Math.sin(idleT * 5 + i * 1.3)) * 0.18, zLejos(f, D), 1, x < 0 ? -Math.PI / 2 : Math.PI / 2)); // saltan de emoción mirando a la pista
    puestos.forEach(([x, f], i) => poner(iPuestos, i, x, 0, zLejos(f, D), 1, x < 0 ? -Math.PI / 2 : Math.PI / 2));
    cuerdas.forEach((f, i) => poner(iCuerdas, i, 0, 0, zLejos(f, D)));
    nubes.forEach(([x, y, z, s], i) => poner(iNubes, i, x + Math.sin(idleT * 0.08 + i * 2) * 2.5, y, z, s));
    for (let i = 0; i < nRayas; i++) {
      const z = zLejos(i * (LARGO / nRayas), D);
      poner(iRayas, i, -W / 2, 0.012, z);
      poner(iRayas, nRayas + i, W / 2, 0.012, z);
    }

    // --- Obstáculos, frutas, meta
    let nCaja = 0;
    let nPila = 0;
    let nBarra = 0;
    let nFresa = 0;
    let nMango = 0;
    let nSombra = 1;
    const horizonte = cfg.obstaculos.horizonte;
    if (p) {
      for (const o of p.obstaculos) {
        const dz = o.d - p.D;
        if (dz > horizonte) break;
        if (dz < -2.6 || o.golpeado || o.d > p.dMeta - 0.5) continue;
        // aparece despacio a lo lejos y, al quedar detrás del personaje, se encoge (si no, tapa la cámara)
        const s = suave((horizonte - dz) / 10) * suave((dz + 2.6) / 1.8);
        const x = o.carril < 0 ? 0 : (o.carril - 1) * W;
        if (o.tipo === 'cajaBaja' && nCaja < MAX.cajaBaja) poner(iCajas, nCaja++, x, 0, -dz, s);
        else if (o.tipo === 'pilaAlta' && nPila < MAX.pilaAlta) poner(iPilas, nPila++, x, 0, -dz, s);
        else if (o.tipo === 'barraBaja' && nBarra < MAX.barraBaja) poner(iBarras, nBarra++, x, 0, -dz, s);
        if (o.tipo !== 'barraBaja' && nSombra < maxSombras) poner(sombras, nSombra++, x, 0.02, -dz, 1.45 * s);
      }
      for (const f of p.frutasLista) {
        const dz = f.d - p.D;
        if (dz > horizonte) break;
        if (dz < -2.6 || f.recogida) continue;
        const s = suave((horizonte - dz) / 10) * suave((dz + 2.6) / 1.8);
        const y = f.y + Math.sin(idleT * 4 + f.d) * 0.06;
        if (f.tipo === 'fresa' && nFresa < MAX.fresa) poner(iFresas, nFresa++, (f.carril - 1) * W, y, -dz, s, idleT * 3 + f.d);
        else if (f.tipo === 'mango' && nMango < MAX.mango) poner(iMangos, nMango++, (f.carril - 1) * W, y, -dz, s, idleT * 3 + f.d);
      }
      const zMeta = -(p.dMeta - p.D);
      meta.visible = zMeta > -80 && zMeta < 5;
      if (meta.visible) {
        meta.position.z = zMeta;
        meta.scale.setScalar(suave((5 - zMeta) / 3)); // al pasar sobre el jugador se encoge para no tapar la cámara
        premio.rotation.y = Math.PI + Math.sin(idleT * 2.2) * 0.35;
        premio.position.y = 4.65 + Math.sin(idleT * 3) * 0.06;
      }
    } else {
      meta.visible = false;
    }
    fijarCuenta(iCajas, nCaja);
    fijarCuenta(iPilas, nPila);
    fijarCuenta(iBarras, nBarra);
    fijarCuenta(iFresas, nFresa);
    fijarCuenta(iMangos, nMango);
    sombras.count = nSombra;

    // --- Eventos de la lógica → efectos
    if (p) {
      for (const e of p.eventos) {
        if (e.tipo === 'choque') {
          const o = e.obstaculo;
          emitir(16, o.carril < 0 ? p.x : (o.carril - 1) * W, 0.6, 0, [0xc98a3f, 0x9a6428, 0xff8a1f, 0xffc21a], { vel: 4.5, tam: 0.16, vida: 0.7 });
          emitir(8, p.x, 1.7, 0, [0xffe86b, 0xffffff, 0xff8fa8], { vel: 2.2, tam: 0.1, vida: 0.7, gravedad: 3, arriba: 2.2 }); // estrellitas sobre la cabeza
          lanzarResto(o, p.x);
          tropiezo = 0.6;
          temblor = 0.45;
        } else if (e.tipo === 'fruta') {
          emitir(7, (e.fruta.carril - 1) * W, e.fruta.y, 0, e.fruta.tipo === 'mango' ? [0xffb21a, 0xff6b3a] : [0xe5233e, 0xff8fa8], { vel: 2.6, tam: 0.09, vida: 0.45, gravedad: 4 });
        } else if (e.tipo === 'aterrizo') {
          emitir(4, p.x, 0.05, 0.1, [0xffffff, 0xf7b6c6], { vel: 1.8, tam: 0.08, vida: 0.35, gravedad: 2, arriba: 0.6 });
        } else if (e.tipo === 'meta' && !metaCelebrada) {
          metaCelebrada = true;
          emitir(70, 0, 2.8, -0.5, COLORES_CONFETI, { vel: 5, tam: 0.13, vida: 1.6, gravedad: 6, arriba: 2.4 });
        }
      }
    }
    if (!p) metaCelebrada = false;
    // Festejo: varias olas de confeti a los lados del arco, una tras otra
    if (p && p.estado === 'gano') {
      while (ondaMeta < ONDAS_META.length && p.tFin >= ONDAS_META[ondaMeta][0]) {
        const [, x, y] = ONDAS_META[ondaMeta++];
        emitir(45, x, y, -0.5, COLORES_CONFETI, { vel: 4, tam: 0.13, vida: 1.5, gravedad: 6, arriba: 2.4 });
      }
    } else {
      ondaMeta = 0;
    }
    for (let i = 0; i < NP; i++) {
      const q = particulas[i];
      if (q.vida > 0) {
        q.vida -= dt;
        q.vy -= q.g * dt;
        q.x += q.vx * dt;
        q.y = Math.max(0.02, q.y + q.vy * dt);
        q.z += (q.vz + vel) * dt;
        if (q.z > 3.2) q.vida -= dt * 6; // el que pasa muy cerca de la cámara se desvanece rápido
      }
      const s = q.vida > 0 ? q.s * Math.min(1, q.vida / q.vidaMax * 2) : 0;
      d.position.set(q.x, q.y, q.z);
      d.rotation.set(q.giro + q.vida * 5, q.giro, 0);
      d.scale.setScalar(s);
      d.updateMatrix();
      pMesh.setMatrixAt(i, d.matrix);
    }
    pMesh.instanceMatrix.needsUpdate = true; // sin esto las partículas (polvo, chispas, confeti) nunca llegaban a la pantalla

    // --- Restos del choque (la caja que salió volando)
    let nResto = 0;
    for (const q of restos) {
      if (!p) q.vida = 0;
      if (q.vida <= 0) continue;
      q.vida -= dt;
      q.vy -= 14 * dt;
      q.x += q.vx * dt;
      q.y = Math.max(0.05, q.y + q.vy * dt);
      q.z += (q.vz + vel) * dt;
      q.rx += q.wx * dt;
      q.rz += q.wz * dt;
      d.position.set(q.x, q.y, q.z);
      d.rotation.set(q.rx, 0, q.rz);
      d.scale.setScalar(q.s * Math.min(1, Math.max(0, q.vida) / 0.3)); // se encoge al final
      d.updateMatrix();
      iRestos.setMatrixAt(nResto++, d.matrix);
    }
    fijarCuenta(iRestos, nResto);
    iRestos.instanceMatrix.needsUpdate = true;

    // --- Personaje
    const pj = personajes[actual];
    pj.g.visible = true;
    const estado = p ? p.estado : 'inicio';
    const px = p ? p.x : 0;
    const py = p ? p.y : 0;
    const giroObjetivo = estado === 'inicio' ? Math.PI : 0;
    giro += (giroObjetivo - giro) * Math.min(1, dt * 7);
    const vx = dt > 0 ? (px - xPrev) / dt : 0;
    xPrev = px;
    inclinacion += (limitar(-vx * 0.05, -0.35, 0.35) - inclinacion) * Math.min(1, dt * 14);

    if (estado === 'jugando' || estado === 'gano') {
      ciclo += dt * (5 + vel * 0.55);
    } else if (estado === 'inicio' || estado === 'cuenta') {
      ciclo += dt * 1.8;
    }
    const s = Math.sin(ciclo);
    const enAire = p && p.enAire;
    const corriendo = estado === 'jugando' || estado === 'gano';
    const amp = corriendo ? (enAire ? 0 : 0.9) : 0.08;
    pj.piernaI.rotation.x = enAire ? -0.7 : s * amp;
    pj.piernaD.rotation.x = enAire ? 0.5 : -s * amp;
    pj.brazoI.rotation.x = enAire || estado === 'gano' ? -2.4 : -s * amp * 0.9;
    pj.brazoD.rotation.x = enAire || estado === 'gano' ? -2.4 : s * amp * 0.9;
    let bote = corriendo && !enAire ? Math.abs(s) * 0.09 : estado === 'inicio' || estado === 'cuenta' ? Math.abs(Math.sin(idleT * 2.4)) * 0.05 : 0;
    let gira = giro + (corriendo ? -inclinacion * 0.7 : 0);
    let cae = 0;
    if (estado === 'gano') {
      bote += Math.abs(Math.sin(p.tFin * 6)) * 0.35;
      gira += p.tFin * 5;
    } else if (estado === 'perdio' && p.motivoFin !== 'frutas') {
      cae = Math.min(1.35, p.tFin * 3.5); // se cae al quedarse sin vidas; si llegó sin frutas, solo se detiene bajo el arco
    }
    tropiezo = Math.max(0, tropiezo - dt);
    const kT = tropiezo / 0.6; // 1 justo al golpearse → 0
    const bambol = Math.sin((1 - kT) * Math.PI * 4) * kT; // se tambalea de lado a lado y se calma
    pj.g.position.set(px, py + bote, kT * 0.35); // el golpe lo empuja un poco hacia atrás
    pj.g.rotation.set(-cae + kT * 0.28, gira, (corriendo ? inclinacion : 0) + bambol * 0.4);
    pj.g.scale.set(pj.escala * (1 + 0.1 * kT), pj.escala * (1 - 0.16 * kT), pj.escala * (1 + 0.1 * kT)); // se aplasta y se recupera
    pj.g.visible = !(p && estado === 'jugando' && p.t < p.invulHasta && Math.floor(p.t * 14) % 2 === 0); // parpadea tras un choque

    poner(sombras, 0, px, 0.02, 0, 1.2 - Math.abs(s) * 0.1 - py * 0.35);
    for (const m of [iCajas, iPilas, iBarras, iFresas, iMangos, iPalmas, iSombrillas, iPinas, iRayas, sombras, iGente, iPuestos, iCuerdas, iNubes]) m.instanceMatrix.needsUpdate = true;

    // --- Cámara
    const objetivoModo = jugando ? 1 : 0;
    modoCam += (objetivoModo - modoCam) * (1 - Math.exp(-(dt || 0.016) * 3.2));
    const k = modoCam;
    const seguir = p ? p.x : 0;
    const tx = (a, b) => a + (b - a) * k;
    temblor = Math.max(0, temblor - dt * 1.4);
    const sx = temblor > 0 ? Math.sin(idleT * 70) * temblor * 0.09 : 0;
    const sy = temblor > 0 ? Math.cos(idleT * 61) * temblor * 0.07 : 0;
    if (camaraManual) {
      // Solo para mirar los modelos de cerca con ?debug=1 (escena.fijarCamara); en el juego normal nunca se usa.
      camara.position.set(...camaraManual.pos);
      camara.lookAt(...camaraManual.mira);
    } else {
      camara.position.set(
        tx(CAMARA_INICIO.pos[0], seguir * 0.55) + sx,
        tx(CAMARA_INICIO.pos[1], 3.2 + py * 0.22) + sy,
        tx(CAMARA_INICIO.pos[2], 5.6),
      );
      camara.lookAt(tx(CAMARA_INICIO.mira[0], seguir * 0.35), tx(CAMARA_INICIO.mira[1], 1.25), tx(CAMARA_INICIO.mira[2], -3));
    }

    renderer.render(escena, camara);

    // --- Calidad adaptativa: solo mide mientras se juega de verdad (no en la cuenta, la pausa ni los menús) y
    // espera 2,5 s tras empezar, para no castigar los primeros cuadros (compilar shaders, cargar fuentes...).
    // Si bajar un escalón no mejora los FPS (p. ej. iPhone en modo de bajo consumo, que limita la pantalla a 30 fps),
    // se vuelve al escalón anterior y no se insiste: así no se degrada la imagen en vano.
    if (!medir || !cfg.rendimiento.adaptativo) {
      cuadrosDesdeCambio = Math.min(cuadrosDesdeCambio, 0);
    } else if (dtReal > 0 && dtReal < 0.25) {
      cuadrosDesdeCambio++;
      if (cuadrosDesdeCambio > 150) ema = ema * 0.96 + dtReal * 0.04;
      if (cuadrosDesdeCambio > 300) {
        cuadrosDesdeCambio = 0;
        if (revisando) {
          revisando = false;
          if (ema > emaAntes * 0.9) {
            aplicarCalidad(calidad - 1); // no ayudó: se deja como estaba y se deja de intentar
            calidadBloqueada = true;
          }
        } else if (!calidadBloqueada && ema > 1 / cfg.rendimiento.fpsMinimo && calidad < NIVELES.length - 1) {
          emaAntes = ema;
          revisando = true;
          aplicarCalidad(calidad + 1);
        }
      }
    }
  }

  // Precompila todos los shaders ahora (durante la carga), para que no haya un tirón la primera vez que aparece la meta,
  // un choque o una fruta. Hay que mostrar la meta un instante para que también se compile.
  meta.visible = true;
  renderer.compile(escena, camara);
  meta.visible = false;

  function usarPersonaje(nombre) {
    if (!(nombre in personajes)) return;
    actual = nombre;
    for (const [n, q] of Object.entries(personajes)) q.g.visible = n === nombre;
  }

  return {
    frame,
    ajustar,
    usarPersonaje,
    get personaje() {
      return actual;
    },
    get calidad() {
      return calidad;
    },
    fijarCalidad: aplicarCalidad,
    fijarCamara(c) {
      camaraManual = c;
    },
    info() {
      const i = renderer.info.render;
      const v = renderer.getDrawingBufferSize(new THREE.Vector2());
      return { llamadas: i.calls, triangulos: i.triangles, ancho: v.x, alto: v.y, dpr: renderer.getPixelRatio(), calidad, fpsMedio: Math.round(1 / ema) };
    },
    renderer,
    escena,
    camara,
  };
}
