// diagnostico.js — Revisa un celular/navegador y dice si el juego va a funcionar (y qué tan bien). No guarda nada ni lo envía a ningún lado
// (solo llama a `ping` del servidor para medir la conexión y la diferencia de hora).
//
// Cómo usarla: abre /diagnostico/ en el celular (sobre todo DENTRO de Instagram o Facebook: mándate el enlace por mensaje directo y tócalo),
// espera, pulsa «Probar rendimiento», y al final «Copiar resultado» (o tómale una captura de pantalla).
import { SUPABASE } from '../js/supabase-config.js';
import { el, reemplazar } from '../js/panel/dom.js';
import { audio } from '../js/audio.js';

const ua = navigator.userAgent;
const filas = []; // { grupo, nombre, estado: 'si'|'no'|'quiza'|'info', valor }
const agregar = (grupo, nombre, estado, valor) => filas.push({ grupo, nombre, estado, valor: String(valor) });
const raiz = document.querySelector('#app');

/* ───────────── 1. Navegador ───────────── */
const esIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esAndroid = /Android/.test(ua);
const app =
  /Instagram/i.test(ua) ? 'Instagram (navegador interno)'
  : /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua) ? 'Facebook (navegador interno)'
  : /Messenger/i.test(ua) ? 'Messenger (navegador interno)'
  : /TikTok|musical_ly|Bytedance/i.test(ua) ? 'TikTok (navegador interno)'
  : /Line\//i.test(ua) ? 'Line (navegador interno)'
  : /; wv\)/.test(ua) ? 'WebView de Android (navegador interno de una app)'
  : /CriOS/.test(ua) ? 'Chrome en iPhone'
  : /FxiOS/.test(ua) ? 'Firefox en iPhone'
  : /EdgiOS|EdgA/.test(ua) ? 'Edge'
  : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
  : /Chrome\//.test(ua) ? 'Chrome'
  : /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari'
  : 'No reconocido';
const versionIOS = Number((ua.match(/OS (\d+)[._]/) ?? [])[1] ?? 0);
const versionAndroid = Number((ua.match(/Android (\d+)/) ?? [])[1] ?? 0);
const versionChrome = Number((ua.match(/Chrome\/(\d+)/) ?? [])[1] ?? 0);
agregar('Navegador', 'Sistema', 'info', esIOS ? `iPhone/iPad (iOS ${versionIOS || '?'})` : esAndroid ? `Android ${versionAndroid || '?'}` : 'Computador u otro');
agregar('Navegador', 'Aplicación', 'info', app);
agregar('Navegador', 'Navegador interno de una app', /interno|WebView/.test(app) ? 'quiza' : 'si', /interno|WebView/.test(app) ? 'sí (el juego debe funcionar aquí: es por donde llegará la gente)' : 'no (es un navegador normal)');
if (esIOS) agregar('Navegador', 'Versión mínima (iOS 15)', versionIOS >= 15 ? 'si' : versionIOS ? 'no' : 'quiza', versionIOS ? `iOS ${versionIOS}` : 'no se pudo leer la versión');
if (esAndroid || versionChrome) agregar('Navegador', 'Motor mínimo (Chrome/WebView 90)', versionChrome >= 90 ? 'si' : versionChrome ? 'no' : 'quiza', versionChrome ? `Chrome ${versionChrome}` : 'no se pudo leer');
agregar('Navegador', 'Identificador (user agent)', 'info', ua);

/* ───────────── 2. Pantalla ───────────── */
const sonda = el('div', { class: 'sonda-seguro' });
document.body.append(sonda);
const cs = getComputedStyle(sonda);
const seguro = ['top', 'bottom'].map((l) => parseFloat(cs.getPropertyValue(`padding-${l}`)) || 0);
sonda.remove();
agregar('Pantalla', 'Tamaño de la ventana', innerWidth >= 280 && innerWidth <= 480 ? 'si' : 'info', `${innerWidth} × ${innerHeight} px (pantalla ${screen.width} × ${screen.height}, densidad ${Math.round(devicePixelRatio * 100) / 100})`);
agregar('Pantalla', 'Zonas seguras (notch / barra inferior)', 'info', `arriba ${seguro[0]} px · abajo ${seguro[1]} px`);
agregar('Pantalla', 'Gestos táctiles', navigator.maxTouchPoints > 0 || 'ontouchstart' in window ? 'si' : 'quiza', `${navigator.maxTouchPoints} puntos táctiles · PointerEvent: ${'PointerEvent' in window ? 'sí' : 'no'}`);

/* ───────────── 3. Almacenamiento ───────────── */
function probarAlmacen(nombre) {
  try {
    const a = window[nombre];
    a.setItem('cholado-diag', '1');
    const v = a.getItem('cholado-diag') === '1';
    a.removeItem('cholado-diag');
    return v;
  } catch {
    return false;
  }
}
agregar('Almacenamiento', 'localStorage (recuerda tu id de dispositivo y tu personaje)', probarAlmacen('localStorage') ? 'si' : 'quiza', probarAlmacen('localStorage') ? 'funciona' : 'bloqueado: el juego igual funciona, pero te olvida entre visitas y los intentos podrían contarse distinto');
agregar('Almacenamiento', 'sessionStorage', probarAlmacen('sessionStorage') ? 'si' : 'info', probarAlmacen('sessionStorage') ? 'funciona' : 'bloqueado');
agregar('Almacenamiento', 'Cookies', navigator.cookieEnabled ? 'si' : 'info', navigator.cookieEnabled ? 'activas (el juego no las usa)' : 'desactivadas (el juego no las usa)');

/* ───────────── 4. WebGL (lo que dibuja el juego) ───────────── */
let gl2 = null;
try {
  const lienzo = document.createElement('canvas');
  gl2 = lienzo.getContext('webgl2', { antialias: true, powerPreference: 'default' });
} catch {
  gl2 = null;
}
agregar('Gráficos', 'WebGL 2 (obligatorio: lo exige Three.js)', gl2 ? 'si' : 'no', gl2 ? 'disponible' : 'NO disponible: el juego mostrará «Este navegador no puede mostrar el juego»');
if (gl2) {
  const info = gl2.getExtension('WEBGL_debug_renderer_info');
  agregar('Gráficos', 'Tarjeta gráfica', 'info', info ? gl2.getParameter(info.UNMASKED_RENDERER_WEBGL) : '(el navegador no la revela)');
  agregar('Gráficos', 'Textura máxima', gl2.getParameter(gl2.MAX_TEXTURE_SIZE) >= 4096 ? 'si' : 'quiza', `${gl2.getParameter(gl2.MAX_TEXTURE_SIZE)} px`);
  gl2.clearColor(1, 0, 0.5, 1);
  gl2.clear(gl2.COLOR_BUFFER_BIT);
  const px = new Uint8Array(4);
  gl2.readPixels(0, 0, 1, 1, gl2.RGBA, gl2.UNSIGNED_BYTE, px);
  agregar('Gráficos', 'Dibuja de verdad (prueba de píxeles)', px[0] === 255 && px[2] > 100 ? 'si' : 'no', px[0] === 255 ? 'sí' : `respuesta rara: ${[...px]}`);
}

/* ───────────── 5. Funciones del lenguaje que usa el juego ───────────── */
// (Esta página es un módulo que usa ?. y ??: si el navegador no los entendiera, ni siquiera habría cargado. La política de seguridad
//  de la página tampoco permite probarlos con eval.)
const juntas = [
  ['Módulos ES, ?. y ?? (el juego es JavaScript moderno sin compilar)', true],
  ['fetch + AbortController (hablar con el servidor)', typeof fetch === 'function' && typeof AbortController === 'function'],
  ['ResizeObserver (ajustar el lienzo)', typeof ResizeObserver === 'function'],
  ['crypto.getRandomValues (id de dispositivo)', Boolean(globalThis.crypto?.getRandomValues)],
  ['CSS: env() / dvh / inset / gap', Boolean(globalThis.CSS?.supports?.('padding-top: env(safe-area-inset-top)') && CSS.supports('height: 100dvh') && CSS.supports('inset: 0') && CSS.supports('gap: 1px'))],
  ['Portapapeles (botón «Copiar código»)', Boolean(navigator.clipboard?.writeText)],
  ['Vibración (golpes; iPhone no la tiene)', typeof navigator.vibrate === 'function'],
];
for (const [nombre, valor] of juntas) agregar('Funciones', nombre, valor ? 'si' : /Portapapeles|Vibración/.test(nombre) ? 'info' : 'no', valor ? 'sí' : /Portapapeles/.test(nombre) ? 'no: el juego usa un método alternativo' : /Vibración/.test(nombre) ? 'no (no pasa nada)' : 'NO');

/* ───────────── Pintar ───────────── */
const simbolo = { si: '✔', no: '✖', quiza: '!', info: '•' };
const caja = el('div', { class: 'tarjeta' });
function pintar() {
  const grupos = [...new Set(filas.map((f) => f.grupo))];
  const malos = filas.filter((f) => f.estado === 'no').length;
  const dudosos = filas.filter((f) => f.estado === 'quiza').length;
  const veredicto = malos
    ? el('p', { class: 'resultado error' }, `✖ Hay ${malos} problema${malos === 1 ? '' : 's'}: el juego puede NO funcionar aquí. Mira las líneas con ✖.`)
    : dudosos
      ? el('p', { class: 'resultado aviso-naranja' }, `! Debería funcionar, con ${dudosos} detalle${dudosos === 1 ? '' : 's'} para revisar (líneas con !).`)
      : el('p', { class: 'resultado ok' }, '✔ Todo lo que necesita el juego está disponible aquí.');
  reemplazar(caja, veredicto, ...grupos.map((g) => el('section', { class: 'grupo-diag' }, el('h3', {}, g),
    filas.filter((f) => f.grupo === g).map((f) => el('div', { class: 'fila-diag' }, el('span', { class: `marca-diag ${f.estado}`, 'aria-hidden': 'true' }, simbolo[f.estado]), el('span', {}, el('b', {}, f.nombre), ' — ', f.valor))))));
}

/* ───────────── 6. Servidor (conexión y hora) ───────────── */
async function probarServidor() {
  const tiempos = [];
  let hora = null;
  let error = null;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    const t0Reloj = Date.now();
    try {
      const res = await fetch(`${SUPABASE.url}/rest/v1/rpc/ping`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE.clave }, body: '{}' });
      const j = await res.json();
      const ms = performance.now() - t0;
      tiempos.push(ms);
      hora = Date.parse(j.ahoraISO) - (t0Reloj + ms / 2); // hora del servidor − hora del celular (a mitad del viaje)
    } catch (e) {
      error = e.message;
      break;
    }
  }
  if (error || !tiempos.length) {
    agregar('Servidor', 'Conexión con el servidor', 'no', `falló: ${error ?? 'sin respuesta'} (¿hay internet? ¿el navegador bloquea la conexión?)`);
    return;
  }
  const prom = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
  agregar('Servidor', 'Conexión con el servidor (3 pruebas)', prom < 1500 ? 'si' : 'quiza', `${Math.round(Math.min(...tiempos))}–${Math.round(Math.max(...tiempos))} ms`);
  const seg = Math.round(hora / 1000);
  agregar('Servidor', 'Hora del celular vs la del servidor', Math.abs(seg) < 120 ? 'si' : 'quiza', Math.abs(seg) < 2 ? 'igual' : `${seg > 0 ? 'atrasada' : 'adelantada'} ${Math.abs(seg)} s (el juego usa SIEMPRE la hora del servidor)`);
  try {
    const r = await fetch(`${SUPABASE.url}/rest/v1/rpc/diag_red`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE.clave }, body: '{}' });
    if (r.ok) {
      const j = await r.json();
      agregar('Servidor', 'Red reconocida por el servidor (límites por IP)', j.ipReconocida ? 'si' : 'quiza', j.ipReconocida ? `sí (huella ${String(j.huella).slice(0, 6)}…; tu IP no se guarda)` : 'no: los límites por red no se aplicarían a esta conexión');
    }
  } catch {
    /* sin diag_red (SQL de la Etapa 6 sin pegar): se omite */
  }
}

/* ───────────── 7. Gestos: prueba de deslizar ───────────── */
function cajaGestos() {
  const registro = el('p', { class: 'nota', 'aria-live': 'polite' }, 'Aún no has deslizado.');
  const area = el('div', { class: 'area-gestos', tabindex: '0', role: 'application', 'aria-label': 'Zona para probar deslizar' }, el('span', {}, 'Desliza aquí: ← → ↑ y toca'));
  const cuentas = { izquierda: 0, derecha: 0, arriba: 0, toque: 0, abajo: 0 };
  let inicio = null;
  area.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    inicio = { x: t.clientX, y: t.clientY, t: performance.now(), borde: t.clientX < 24 ? 'izquierdo' : t.clientX > innerWidth - 24 ? 'derecho' : null };
  }, { passive: true });
  area.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  area.addEventListener('touchend', (e) => {
    if (!inicio) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    let g = 'toque';
    if (Math.abs(dx) > 26 || Math.abs(dy) > 26) g = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'izquierda' : 'derecha') : dy < 0 ? 'arriba' : 'abajo';
    cuentas[g]++;
    registro.textContent = `Último: ${g}${inicio.borde ? ` (empezó en el borde ${inicio.borde} de la pantalla)` : ''} · ← ${cuentas.izquierda} · → ${cuentas.derecha} · ↑ ${cuentas.arriba} · toques ${cuentas.toque} · ↓ ${cuentas.abajo}`;
    inicio = null;
  });
  return el('section', { class: 'tarjeta' }, el('h2', {}, 'Prueba de gestos'),
    el('p', { class: 'nota' }, 'Desliza en el cuadro como en el juego (izquierda, derecha, arriba) y toca. Prueba también empezando MUY pegado al borde izquierdo y derecho de la pantalla: si el navegador interno «te saca» de la página o vuelve atrás, anótalo.'),
    area, registro);
}

/* ───────────── 8. Rendimiento ───────────── */
function pruebaRendimiento(boton, salida) {
  boton.disabled = true;
  boton.textContent = 'Midiendo (4 s)…';
  const lienzo = el('canvas', { width: '360', height: '640', class: 'lienzo-diag' });
  salida.replaceChildren(lienzo);
  const gl = lienzo.getContext('webgl2', { antialias: true });
  if (!gl) {
    salida.textContent = 'Sin WebGL 2: no se puede medir.';
    boton.disabled = false;
    boton.textContent = 'Probar rendimiento';
    return;
  }
  const compilar = (tipo, fuente) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, fuente);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compilar(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p; uniform float t; void main(){ float c=cos(t), s=sin(t); gl_Position = vec4(p.x*c-p.y*s, p.x*s+p.y*c, 0.0, 1.0); }'));
  gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, '#version 300 es\nprecision mediump float; uniform vec4 col; out vec4 o; void main(){ o = col; }'));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  // ~12.000 triángulos en 16 llamadas de dibujo, más 3 capas que cubren toda la pantalla (como el piso, el camino y el cielo del juego)
  const triangulos = 12000;
  const datos = new Float32Array(triangulos * 6);
  for (let i = 0; i < datos.length; i += 6) {
    const cx = Math.random() * 2 - 1;
    const cy = Math.random() * 2 - 1;
    for (let k = 0; k < 3; k++) {
      datos[i + k * 2] = cx + (Math.random() - 0.5) * 0.12;
      datos[i + k * 2 + 1] = cy + (Math.random() - 0.5) * 0.12;
    }
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, datos, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const cuadro = gl.createBuffer();
  const pantalla = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  const uT = gl.getUniformLocation(prog, 't');
  const uC = gl.getUniformLocation(prog, 'col');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const duraciones = [];
  let anterior = performance.now();
  const inicio = anterior;
  function cuadroSiguiente(ahora) {
    duraciones.push(ahora - anterior);
    anterior = ahora;
    const t = (ahora - inicio) / 1000;
    gl.viewport(0, 0, lienzo.width, lienzo.height);
    gl.clearColor(0.2, 0.05, 0.2, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cuadro);
    gl.bufferData(gl.ARRAY_BUFFER, pantalla, gl.STREAM_DRAW);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (let capa = 0; capa < 3; capa++) {
      gl.uniform4f(uC, 0.3 + capa * 0.2, 0.5, 0.8 - capa * 0.2, 0.55);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uT, t * 0.5);
    for (let d = 0; d < 16; d++) {
      gl.uniform4f(uC, (d % 4) / 4, (d % 3) / 3, 0.6, 0.8);
      gl.drawArrays(gl.TRIANGLES, d * (triangulos / 16) * 3, (triangulos / 16) * 3);
    }
    if (ahora - inicio < 4000) requestAnimationFrame(cuadroSiguiente);
    else terminar();
  }
  function terminar() {
    const v = duraciones.slice(5).sort((a, b) => a - b); // se descartan los primeros cuadros
    const prom = v.reduce((a, b) => a + b, 0) / v.length;
    const p95 = v[Math.floor(v.length * 0.95)];
    const fps = 1000 / prom;
    const limitado30 = fps > 26 && fps < 34 && p95 < 45;
    const nivel = fps >= 55 ? 'si' : fps >= 40 ? 'quiza' : 'no';
    const texto = `${fps.toFixed(0)} FPS de promedio · el 5 % de los cuadros más lentos tarda ${p95.toFixed(0)} ms (a 60 FPS cada cuadro dura 16,7 ms)`;
    const lectura = limitado30
      ? 'Parece limitado a ~30 FPS: en iPhone suele ser el «modo de bajo consumo»; en Android, el ahorro de batería. Apágalo y repite.'
      : nivel === 'si' ? 'Fluido: el juego debería ir a 60 FPS.' : nivel === 'quiza' ? 'Aceptable pero justo: el juego bajará la resolución por sí solo si no llega a 50 FPS.' : 'Lento: el juego bajará la resolución y quitará el contorno; si aun así va mal, avísanos qué celular es.';
    agregar('Rendimiento', 'Prueba de carga parecida al juego (12.000 triángulos, 16 llamadas, 3 capas a pantalla completa)', nivel, `${texto}. ${lectura}`);
    pintar();
    salida.replaceChildren(el('p', { class: nivel === 'si' ? 'resultado ok' : nivel === 'quiza' ? 'resultado aviso-naranja' : 'resultado error' }, `${fps.toFixed(0)} FPS — ${lectura}`));
    boton.disabled = false;
    boton.textContent = 'Repetir la prueba';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  requestAnimationFrame(cuadroSiguiente);
}

/* ───────────── Armado de la página ───────────── */
function reporte() {
  return [`Diagnóstico Cholado Runner · ${new Date().toISOString()}`, ...filas.map((f) => `[${f.estado.toUpperCase()}] ${f.grupo} · ${f.nombre}: ${f.valor}`)].join('\n');
}
async function copiar(boton) {
  const texto = reporte();
  let listo = false;
  try {
    await navigator.clipboard.writeText(texto);
    listo = true;
  } catch {
    const t = el('textarea', { class: 'oculto-diag', 'aria-hidden': 'true' });
    t.value = texto;
    document.body.append(t);
    t.select();
    try {
      listo = document.execCommand('copy');
    } catch {
      listo = false;
    }
    t.remove();
  }
  boton.textContent = listo ? '¡Copiado! Pégalo en un mensaje' : 'No se pudo copiar: tómale una captura a la pantalla';
  setTimeout(() => { boton.textContent = 'Copiar resultado'; }, 3500);
}

// Sonido: se prueba el mismo módulo que usa el juego (en iPhone el audio solo se desbloquea con un toque que termina)
const salidaSonido = el('div', { class: 'nota' }, '');
const botonSonido = el('button', { type: 'button', class: 'boton', onclick: () => pruebaSonido() }, 'Probar sonido');
function pruebaSonido() {
  const antes = audio.estado;
  audio.prueba();
  salidaSonido.textContent = `Probando… (el audio estaba «${antes}»)`;
  setTimeout(() => {
    const ahora = audio.estado;
    salidaSonido.textContent = ahora === 'running'
      ? `El navegador dejó sonar (el audio pasó de «${antes}» a «${ahora}»). ¿Oíste dos pitidos? Si no: sube el volumen y revisa el interruptor de silencio (el botoncito al lado del iPhone) y que el sonido de Safari/Instagram no esté silenciado.`
      : `El navegador NO dejó sonar: el audio sigue «${ahora}». Cierra y vuelve a abrir esta página, toca el botón otra vez y cuéntanos qué app y qué iPhone es.`;
  }, 700);
}
const salidaRendimiento = el('div', {});
const botonRendimiento = el('button', { type: 'button', class: 'boton', onclick: () => pruebaRendimiento(botonRendimiento, salidaRendimiento) }, 'Probar rendimiento');
const botonCopiar = el('button', { type: 'button', class: 'boton secundario', onclick: () => copiar(botonCopiar) }, 'Copiar resultado');
reemplazar(raiz,
  el('p', { class: 'nota' }, 'Esta página solo mira tu celular y mide la conexión con el servidor; no guarda ni envía nada más. Abre el enlace dentro de la app que quieras probar (Instagram, Facebook, Safari, Chrome…).'),
  caja,
  cajaGestos(),
  el('section', { class: 'tarjeta' }, el('h2', {}, 'Sonido'), el('p', { class: 'nota' }, `Pulsa y escucha: deben sonar dos pitidos. Modo de audio del navegador: ${navigator.audioSession ? navigator.audioSession.type : 'no disponible'}.`), botonSonido, salidaSonido),
  el('section', { class: 'tarjeta' }, el('h2', {}, 'Rendimiento'), el('p', { class: 'nota' }, 'Dibuja durante 4 segundos una escena parecida a la del juego y mide los cuadros por segundo. Mejor con la pila al 100 % o cargando y sin «ahorro de batería».'), botonRendimiento, salidaRendimiento),
  el('div', { class: 'fila-botones' }, botonCopiar));
pintar();
await probarServidor();
pintar();
