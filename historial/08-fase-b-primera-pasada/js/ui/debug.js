// debug.js — Panel de calibración (solo se carga con ?debug=1; los jugadores normales nunca lo descargan).
//
//   · FPS, llamadas de dibujo y triángulos, siempre visibles arriba a la izquierda.
//   · Deslizadores de dificultad: se aplican EN VIVO (los obstáculos ya generados no cambian; los nuevos sí).
//   · Estadísticas de tus partidas reales con la configuración actual (para medir cuánta gente gana).
//   · Simulador: un bot juega miles de partidas en segundos con la config actual.
//   · "Copiar config": te da lo que cambiaste para pegarlo en web/js/config.js.
import { CONFIG } from '../config.js';
import { PERFILES, simular } from '../game/bot.js';
import { almacen, esperar } from '../util.js';

const SLIDERS = [
  ['Partida', null],
  ['Duración (s)', 'partida.duracionS', 15, 120, 1],
  ['Vidas', 'partida.vidas', 1, 6, 1],
  ['Frutas mínimas para ganar (0 = no se exige)', 'partida.frutasMinimas', 0, 60, 1],
  ['Tolerancia de colisión', 'partida.toleranciaColision', 0, 0.4, 0.01],
  ['Invulnerabilidad tras choque (s)', 'partida.invulnerabilidadS', 0.3, 3, 0.1],
  ['Velocidad', null],
  ['Velocidad inicial (u/s)', 'velocidad.inicial', 4, 16, 0.1],
  ['Velocidad final (u/s)', 'velocidad.final', 4, 20, 0.1],
  ['Multiplicador de velocidad', 'velocidad.multiplicador', 0.4, 2, 0.05],
  ['Obstáculos', null],
  ['Separación inicial (s)', 'obstaculos.separacionInicialS', 0.6, 3, 0.05],
  ['Separación final (s)', 'obstaculos.separacionFinalS', 0.6, 3, 0.05],
  ['Separación mínima (s)', 'obstaculos.separacionMinimaS', 0.5, 2, 0.05],
  ['Peso: caja baja', 'obstaculos.tipos.cajaBaja.peso', 0, 10, 0.5],
  ['Peso: pila alta', 'obstaculos.tipos.pilaAlta.peso', 0, 10, 0.5],
  ['Peso: barra baja', 'obstaculos.tipos.barraBaja.peso', 0, 10, 0.5],
  ['Peso: dobles', 'obstaculos.tipos.doble.peso', 0, 10, 0.5],
  ['Movimiento', null],
  ['Salto: altura', 'salto.alto', 0.8, 2.2, 0.05],
  ['Salto: duración (s)', 'salto.duracionS', 0.4, 1, 0.02],
  ['Cambio de carril (s)', 'carriles.cambioS', 0.06, 0.3, 0.01],
  ['Frutas', null],
  ['Una hilera cada (s, 0 = ninguna)', 'frutas.cadaS', 0, 8, 0.2],
];

const leer = (o, ruta) => ruta.split('.').reduce((a, k) => a[k], o);
function escribir(o, ruta, valor) {
  const k = ruta.split('.');
  const ultimo = k.pop();
  k.reduce((a, c) => a[c], o)[ultimo] = valor;
}
const r2 = (n) => Math.round(n * 100) / 100;

export function iniciarDebug({ cfg, escena, api, hooks, reiniciar, obtenerPartida }) {
  const raiz = document.getElementById('escena');
  const estilo = document.createElement('style');
  estilo.textContent = `
    .dbg-mini{position:absolute;z-index:30;left:6px;top:calc(env(safe-area-inset-top,0px) + 70px);font:11px/1.35 ui-monospace,Consolas,monospace;color:#fff;background:rgba(0,0,0,.55);padding:4px 6px;border-radius:8px;pointer-events:none;white-space:pre}
    .dbg-boton{position:absolute;z-index:31;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);padding:9px 14px;border-radius:99px;background:#3a0f33;color:#fff;font:700 13px system-ui;border:2px solid #b6e80a}
    .dbg-panel{position:absolute;z-index:30;left:0;right:0;bottom:0;max-height:72%;overflow-y:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;background:rgba(18,6,26,.94);color:#fff;font:12px/1.4 system-ui;padding:10px 12px 64px;border-radius:18px 18px 0 0}
    .dbg-panel h3{font-size:13px;margin:12px 0 4px;color:#b6e80a}
    .dbg-panel label.s{display:block;margin:5px 0}.dbg-panel label.s span{display:flex;justify-content:space-between}
    .dbg-panel input[type=range]{width:100%;accent-color:#b6e80a}
    .dbg-panel button.b{margin:3px 4px 3px 0;padding:7px 10px;border-radius:10px;background:#d8287f;color:#fff;font:600 12px system-ui;border:0}
    .dbg-panel .caja{background:rgba(255,255,255,.08);border-radius:10px;padding:7px 9px;margin:4px 0;font-family:ui-monospace,Consolas,monospace;font-size:11px;white-space:pre-wrap}
    .dbg-panel textarea{width:100%;height:92px;background:#000;color:#b6e80a;border:0;border-radius:8px;font:11px ui-monospace,Consolas,monospace;-webkit-user-select:text;user-select:text}
    .dbg-panel input[type=number]{width:70px;background:#000;color:#fff;border:1px solid #666;border-radius:6px;padding:3px}
    .dbg-panel label.c{display:flex;gap:8px;align-items:center;margin:6px 0}
  `;
  document.head.appendChild(estilo);

  const mini = document.createElement('div');
  mini.className = 'dbg-mini';
  mini.setAttribute('data-no-gesto', '');
  raiz.appendChild(mini);

  const boton = document.createElement('button');
  boton.className = 'dbg-boton';
  boton.textContent = 'Debug';
  raiz.appendChild(boton);

  const panel = document.createElement('div');
  panel.className = 'dbg-panel';
  panel.setAttribute('data-no-gesto', '');
  panel.hidden = true;
  raiz.appendChild(panel);
  boton.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    boton.textContent = panel.hidden ? 'Debug' : 'Cerrar';
  });

  /* ───────────── Estadísticas de partidas reales ───────────── */
  const CLAVE_STATS = 'cholado-debug-stats';
  const firma = () => JSON.stringify([cfg.partida.duracionS, cfg.partida.vidas, cfg.partida.frutasMinimas, r2(cfg.partida.toleranciaColision), r2(cfg.velocidad.inicial), r2(cfg.velocidad.final), cfg.velocidad.multiplicador, r2(cfg.obstaculos.separacionInicialS), r2(cfg.obstaculos.separacionFinalS), Object.values(cfg.obstaculos.tipos).map((t) => t.peso)]);
  hooks.alTerminar.push((res) => {
    const lista = almacen.leer(CLAVE_STATS, []);
    lista.push({ ts: Date.now(), firma: firma(), gano: res.gano, progreso: res.progreso, choques: res.choques, frutas: res.frutas });
    almacen.escribir(CLAVE_STATS, lista.slice(-400));
    pintarStats();
  });

  /* ───────────── Panel ───────────── */
  let html = '<h3>Qué es esto</h3><div class="caja">Mueve los deslizadores y juega: se aplican en vivo. Mira las estadísticas y el simulador. Cuando te guste, pulsa "Copiar config" y pégalo en web/js/config.js.</div>';
  for (const [etq, ruta, min, max, paso] of SLIDERS) {
    if (!ruta) html += `<h3>${etq}</h3>`;
    else html += `<label class="s"><span>${etq}<b data-v="${ruta}"></b></span><input type="range" data-r="${ruta}" min="${min}" max="${max}" step="${paso}"></label>`;
  }
  html += api.debug
    ? ''
    : '<h3>API real (Supabase)</h3><div class="caja" style="white-space:normal">Estás hablando con el servidor real: no existen los interruptores de intentos ilimitados ni de error de red, y la dificultad NO se mezcla con la del servidor mientras uses ?debug=1. Para calibrar sin gastar intentos reales abre <b>?debug=1&amp;api=falsa</b>.</div>';
  html += `
    <h3>Pruebas</h3>
    <label class="c"><input type="checkbox" id="dbg-inv"> Invencible (no pierdo vidas)</label>
    <label class="c"><input type="checkbox" id="dbg-ilim" checked> Intentos ilimitados (no gasta intentos ni premios)</label>
    <label class="c"><input type="checkbox" id="dbg-red"> Simular error de red</label>
    <div>Premios por semana <input type="number" id="dbg-premios" min="0" max="999" style="margin-right:8px"> Intentos por semana <input type="number" id="dbg-intentos" min="0" max="99"></div>
    <button class="b" id="dbg-semana">Reiniciar la semana</button><button class="b" id="dbg-borrar-api">Borrar datos del "servidor"</button>
    <h3>Tus partidas (con esta configuración)</h3>
    <div class="caja" id="dbg-stats"></div>
    <button class="b" id="dbg-stats-borrar">Borrar estadísticas</button>
    <h3>Simulador (bot)</h3>
    <div class="caja" style="white-space:normal">Un bot con tres niveles de habilidad juega con la config actual. Sirve para comparar cambios; la verdad la dan tus partidas reales.</div>
    <button class="b" id="dbg-sim">Simular 1.000 partidas × 3 perfiles</button>
    <div class="caja" id="dbg-sim-res">—</div>
    <h3>Ver de cerca (modelos)</h3>
    <div class="caja" style="white-space:normal">Acerca la cámara para revisar los personajes (se ve mejor en el inicio, donde miran hacia ti). Esconde las pantallas hasta que pulses «Cámara normal».</div>
    <button class="b" data-cam="cholado:frente">Choladito: frente</button><button class="b" data-cam="cholado:espalda">Choladito: espalda</button>
    <button class="b" data-cam="india:frente">La India: frente</button><button class="b" data-cam="india:espalda">La India: espalda</button>
    <button class="b" data-cam="normal">Cámara normal</button>
    <h3>Config</h3>
    <button class="b" id="dbg-copiar">Copiar config (solo lo que cambiaste)</button><button class="b" id="dbg-restablecer">Restablecer valores de config.js</button>
    <textarea id="dbg-texto" readonly placeholder="Aquí aparece lo que cambiaste"></textarea>`;
  panel.innerHTML = html;
  const $ = (s) => panel.querySelector(s);

  const sincronizarSliders = () => {
    for (const inp of panel.querySelectorAll('input[data-r]')) {
      const v = leer(cfg, inp.dataset.r);
      inp.value = v;
      panel.querySelector(`b[data-v="${inp.dataset.r}"]`).textContent = ' ' + r2(v);
    }
  };
  panel.addEventListener('input', (e) => {
    const inp = e.target;
    if (!inp.dataset?.r) return;
    escribir(cfg, inp.dataset.r, Number(inp.value));
    panel.querySelector(`b[data-v="${inp.dataset.r}"]`).textContent = ' ' + r2(Number(inp.value));
    pintarStats();
  });
  sincronizarSliders();

  /* Interruptores */
  const ajustes = api.debug?.leerAjustes() ?? {};
  $('#dbg-ilim').checked = ajustes.ilimitado ?? true;
  api.debug?.fijar({ ilimitado: $('#dbg-ilim').checked });
  $('#dbg-red').checked = Boolean(ajustes.fallar);
  $('#dbg-premios').value = ajustes.premiosPorSemana ?? cfg.reglas.premiosPorSemana;
  $('#dbg-intentos').value = ajustes.intentosPorSemana ?? cfg.reglas.intentosPorSemana;
  $('#dbg-inv').checked = cfg.desarrollo.invencible;
  $('#dbg-inv').addEventListener('change', (e) => (cfg.desarrollo.invencible = e.target.checked));
  $('#dbg-ilim').addEventListener('change', (e) => api.debug?.fijar({ ilimitado: e.target.checked }));
  $('#dbg-red').addEventListener('change', (e) => api.debug?.fijar({ fallar: e.target.checked }));
  $('#dbg-premios').addEventListener('change', (e) => { api.debug?.fijar({ premiosPorSemana: Number(e.target.value) }); reiniciar(); });
  $('#dbg-intentos').addEventListener('change', (e) => { api.debug?.fijar({ intentosPorSemana: Number(e.target.value) }); reiniciar(); });
  $('#dbg-semana').addEventListener('click', () => { api.debug?.reiniciarSemana(); reiniciar(); });
  $('#dbg-borrar-api').addEventListener('click', () => { api.debug?.borrarTodo(); localStorage.removeItem('cholado-mi-codigo'); location.reload(); });

  /* Ver los modelos de cerca (Fase B) */
  const CAMARAS = {
    cholado: { y: 1.5, mira: 1.25, d: 3.0 },
    india: { y: 1.7, mira: 1.3, d: 3.8 },
  };
  for (const b of panel.querySelectorAll('[data-cam]')) {
    b.addEventListener('click', () => {
      const [quien, lado] = b.dataset.cam.split(':');
      const capa = document.getElementById('pantalla');
      if (quien === 'normal') {
        escena.fijarCamara(null);
        capa.style.visibility = '';
        return;
      }
      const c = CAMARAS[quien];
      escena.usarPersonaje(quien);
      escena.fijarCamara({ pos: [0, c.y, lado === 'frente' ? c.d : -c.d], mira: [0, c.mira, 0] });
      capa.style.visibility = 'hidden';
    });
  }

  /* Estadísticas */
  function pintarStats() {
    const todas = almacen.leer(CLAVE_STATS, []);
    const f = firma();
    const mias = todas.filter((x) => x.firma === f);
    const resumen = (l) => {
      const g = l.filter((x) => x.gano).length;
      return l.length ? `${l.length} partidas · ${g} ganadas · ${((g / l.length) * 100).toFixed(0)} % (1 de cada ${g ? (l.length / g).toFixed(1) : '—'})` : 'sin partidas todavía';
    };
    const perdidas = mias.filter((x) => !x.gano);
    const prog = perdidas.length ? Math.round((perdidas.reduce((s, x) => s + x.progreso, 0) / perdidas.length) * 100) : null;
    const ultimas = mias.slice(-10);
    $('#dbg-stats').textContent = `Esta config:  ${resumen(mias)}\nÚltimas 10:   ${resumen(ultimas)}\nAl perder llegas en promedio al ${prog ?? '—'} %\nChoques por partida: ${mias.length ? r2(mias.reduce((s, x) => s + x.choques, 0) / mias.length) : '—'}\nTodas (cualquier config): ${resumen(todas)}`;
  }
  $('#dbg-stats-borrar').addEventListener('click', () => { almacen.borrar(CLAVE_STATS); pintarStats(); });
  pintarStats();

  /* Simulador */
  $('#dbg-sim').addEventListener('click', async () => {
    const res = $('#dbg-sim-res');
    const b = $('#dbg-sim');
    b.disabled = true;
    res.textContent = 'Simulando...';
    let texto = '';
    for (const perfil of Object.values(PERFILES)) {
      await esperar(30); // deja pintar la pantalla entre perfil y perfil
      const r = simular(cfg, perfil, 1000, { semillaBase: 777 });
      texto += `${perfil.nombre.padEnd(8)} gana ${(r.tasa * 100).toFixed(1).padStart(5)} %  (1 de cada ${r.ganadas ? (1 / r.tasa).toFixed(1) : '—'})  choques ${r.choquesPorPartida.toFixed(1)}\n         frutas ${r.frutasPorPartida.toFixed(0)}/${r.frutasGeneradasPorPartida.toFixed(0)} · pierde por frutas ${(r.derrotasPorFrutas * 100).toFixed(1)} %\n`;
      res.textContent = texto + '...';
    }
    res.textContent = texto.trim();
    b.disabled = false;
  });

  /* Copiar config */
  function diferencias(actual, base, ruta = '', salida = {}) {
    for (const k of Object.keys(actual)) {
      const a = actual[k];
      const b = base[k];
      if (a && typeof a === 'object' && !Array.isArray(a)) diferencias(a, b ?? {}, ruta + k + '.', salida);
      else if (JSON.stringify(a) !== JSON.stringify(b)) salida[ruta + k] = a;
    }
    return salida;
  }
  // Convierte {"velocidad.inicial": 10} en {"velocidad": {"inicial": 10}} (solo las secciones de dificultad)
  const SECCIONES_DIFICULTAD = ['partida', 'velocidad', 'carriles', 'salto', 'jugador', 'obstaculos', 'frutas', 'controles'];
  function anidarDificultad(dif) {
    const salida = {};
    for (const [ruta, valor] of Object.entries(dif)) {
      const partes = ruta.split('.');
      if (!SECCIONES_DIFICULTAD.includes(partes[0])) continue;
      let o = salida;
      for (const p of partes.slice(0, -1)) o = o[p] ??= {};
      o[partes.at(-1)] = valor;
    }
    return salida;
  }
  $('#dbg-copiar').addEventListener('click', async () => {
    const dif = diferencias(cfg, CONFIG);
    const servidor = anidarDificultad(dif);
    const texto = Object.keys(dif).length
      ? '// 1) Para el SERVIDOR (Supabase → SQL Editor). Cambia la dificultad que ven todos los jugadores:\n' +
        (Object.keys(servidor).length ? `select app.ajustar_juego('${JSON.stringify(servidor)}'::jsonb);\n` : '-- (nada de dificultad cambió)\n') +
        '\n// 2) Para config.js (valores de respaldo / API falsa):\n' + Object.entries(dif).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join('\n')
      : '// No cambiaste nada respecto a config.js';
    $('#dbg-texto').value = texto;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      $('#dbg-texto').select();
    }
  });
  $('#dbg-restablecer').addEventListener('click', () => {
    Object.assign(cfg, JSON.parse(JSON.stringify(CONFIG)));
    sincronizarSliders();
    pintarStats();
  });

  /* FPS y datos de la escena (cada 0,5 s) */
  let cuadros = 0;
  let desde = performance.now();
  const NIVELES = ['0 (completa)', '1 (-resol.)', '2 (-resol.)', '3 (sin contorno)', '4 (mínima)'];
  (function medir(ahora) {
    cuadros++;
    if (ahora - desde >= 500) {
      const fps = Math.round((cuadros * 1000) / (ahora - desde));
      cuadros = 0;
      desde = ahora;
      const i = escena.info();
      const p = obtenerPartida();
      mini.textContent = `API ${api.esFalsa ? 'falsa (local)' : 'REAL (Supabase)'}${api.esFalsa && api.debug?.leerAjustes().ilimitado ? ' · INTENTOS ILIMITADOS' : ''}\n${fps} fps · ${i.llamadas} llamadas · ${(i.triangulos / 1000).toFixed(1)}k tri\n${i.ancho}×${i.alto} (DPR ${i.dpr.toFixed(2)}) · calidad ${NIVELES[i.calidad]}${p ? `\nt ${p.t.toFixed(1)} s · v ${p.vel.toFixed(1)} · vidas ${p.vidas} · frutas ${p.frutas}/${p.frutasGeneradas} (mín ${cfg.partida.frutasMinimas})` : ''}`;
    }
    requestAnimationFrame(medir);
  })(performance.now());
}
