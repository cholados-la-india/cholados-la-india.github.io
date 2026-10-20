// ui.js — HUD y pantallas del juego (HTML sobre el canvas). Los textos viven en textos.js.
//
// Las pantallas se pintan con plantillas; los botones llevan `data-accion="..."` y main.js decide qué hace cada acción.
import { LOCAL, T, pesos, textoCampana } from '../textos.js';
import { reloj } from '../reloj.js';
import { fechaCortaBogota, fechaDiaBogota, fechaHoraBogota, formatoRestante } from '../util.js';

/* ───────────── Iconos (SVG en línea, sin imágenes) ───────────── */
const SVG_VASO = '<svg viewBox="0 0 24 32" aria-hidden="true"><path class="s-pit" d="M15 9 L20.5 1.5"/><path class="s-vaso" d="M3.5 13h17l-2.6 17.2a1.6 1.6 0 0 1-1.6 1.3H7.7a1.6 1.6 0 0 1-1.6-1.3z"/><path class="s-baja" d="M5.2 21h13.6l-.9 6.8a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z"/><circle class="s-bola" cx="12" cy="10.5" r="7.2"/></svg>';
const SVG_FRESA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="f-cuerpo" d="M12 22.5C5.5 18 4 10.5 12 8c8 2.5 6.5 10 0 14.5z"/><path class="f-hoja" d="M7.5 8 12 3.2 16.5 8 12 9.8z"/><circle class="f-pepa" cx="9.6" cy="13.5" r=".9"/><circle class="f-pepa" cx="14.2" cy="13" r=".9"/><circle class="f-pepa" cx="12" cy="17" r=".9"/></svg>';
const SVG_PAUSA = '<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="3" y="2" width="4" height="14" rx="1.2"/><rect x="11" y="2" width="4" height="14" rx="1.2"/></svg>';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vasos = (activos, total) => Array.from({ length: total }, (_, i) => `<span class="vida${i < activos ? '' : ' perdida'}">${SVG_VASO}</span>`).join('');
const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)];

/** Deja solo dígitos y máximo 10 (si pegan "+57 312...", se quita el 57). */
export function soloDigitosCelular(texto) {
  let d = String(texto).replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('57')) d = d.slice(2);
  return d.slice(0, 10);
}

/** "3123456789" → "312 345 6789" (el formato con el que se muestra mientras se escribe). */
export function formatearCelular(digitos) {
  const d = digitos.slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(' ');
}

/** Celular colombiano: 10 dígitos que empiezan por 3 (acepta +57, espacios y guiones). */
export function normalizarCelular(texto) {
  const d = soloDigitosCelular(texto);
  return /^3\d{9}$/.test(d) ? d : null;
}

export function crearUI(raiz, cfg) {
  const $ = (id) => raiz.querySelector(id);
  const contenedor = $('#pantalla');
  const hud = $('#hud');
  const cuenta = $('#cuenta');
  const golpe = $('#golpe');
  const manejadores = {};
  let pantallaActual = null;

  /* ───────────── HUD ───────────── */
  hud.innerHTML = `
    <div class="hud-arriba">
      <div class="vidas" id="hud-vidas" aria-label="Vidas"></div>
      <div class="reloj">
        <div class="reloj-num" id="hud-reloj">1:00</div>
        <div class="progreso"><i class="progreso-barra" id="hud-barra"></i><span class="progreso-meta">${SVG_VASO}</span></div>
      </div>
      <button class="pausa" id="hud-pausa" type="button" data-accion="pausa" aria-label="Pausa">${SVG_PAUSA}</button>
    </div>
    <div class="frutas" id="hud-frutas-caja">${SVG_FRESA}<b id="hud-frutas">0</b></div>`;
  const elVidas = $('#hud-vidas');
  const elReloj = $('#hud-reloj');
  const elBarra = $('#hud-barra');
  const elFrutas = $('#hud-frutas');
  const elFrutasCaja = $('#hud-frutas-caja');
  let ultimo = { vidas: -1, vidasMax: -1, reloj: '', barra: -1, frutas: -1, minimo: -1 };

  function actualizarHUD(p, tiempoRestante, progreso) {
    if (p.vidas !== ultimo.vidas || p.cfg.partida.vidas !== ultimo.vidasMax) {
      elVidas.innerHTML = vasos(Math.max(0, p.vidas), Math.max(p.cfg.partida.vidas, p.vidas));
      ultimo.vidas = p.vidas;
      ultimo.vidasMax = p.cfg.partida.vidas;
    }
    const seg = Math.ceil(tiempoRestante);
    const reloj = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
    if (reloj !== ultimo.reloj) {
      elReloj.textContent = reloj;
      ultimo.reloj = reloj;
    }
    const barra = Math.round(progreso * 1000) / 10;
    if (barra !== ultimo.barra) {
      elBarra.style.width = barra + '%';
      ultimo.barra = barra;
    }
    const minimo = p.cfg.partida.frutasMinimas ?? 0;
    if (p.frutas !== ultimo.frutas || minimo !== ultimo.minimo) {
      elFrutas.textContent = minimo > 0 ? `${p.frutas} / ${minimo}` : p.frutas; // "8 / 25": recogidas / mínimas para ganar
      elFrutasCaja.classList.toggle('ok', minimo > 0 && p.frutas >= minimo); // se pone verde al llegar al mínimo
      ultimo.frutas = p.frutas;
      ultimo.minimo = minimo;
    }
  }
  const mostrarHUD = (si) => {
    hud.hidden = !si;
    if (si) ultimo = { vidas: -1, vidasMax: -1, reloj: '', barra: -1, frutas: -1, minimo: -1 };
  };

  /* ───────────── Cuenta atrás y golpe ───────────── */
  function mostrarCuenta(texto) {
    if (texto === null) {
      cuenta.hidden = true;
      return;
    }
    cuenta.hidden = false;
    cuenta.textContent = texto;
    cuenta.classList.remove('late');
    void cuenta.offsetWidth; // reinicia la animación
    cuenta.classList.add('late');
  }
  function destelloGolpe() {
    golpe.classList.remove('on');
    void golpe.offsetWidth;
    golpe.classList.add('on');
  }

  /* ───────────── Pantallas ───────────── */
  const campana = () => textoCampana(cfg.reglas.campana, fechaDiaBogota); // la temporada, si el servidor manda fechas
  const plantillas = {
    inicio({ estado, personaje, mostrarSelector, tieneCodigo }) {
      return `
      <section class="pantalla inicio">
        <header class="inicio-cabeza">
          <img class="logo" src="assets/marca/logo.png" alt="${esc(T.negocio)}" width="380" height="157">
          <h1 class="titulo-juego">${esc(T.nombreJuego)}</h1>
          ${mostrarSelector ? `
          <p class="selector-etiqueta">${esc(T.personajes.titulo)}</p>
          <div class="selector" role="group" aria-label="${esc(T.personajes.titulo)}">
            <button type="button" data-accion="personaje:cholado" aria-pressed="${personaje === 'cholado'}" class="${personaje === 'cholado' ? 'on' : ''}">${esc(T.personajes.cholado)}</button>
            <button type="button" data-accion="personaje:india" aria-pressed="${personaje === 'india'}" class="${personaje === 'india' ? 'on' : ''}">${esc(T.personajes.india)}</button>
          </div>` : ''}
        </header>
        <div class="panel panel-inicio">
          <div class="pastilla lima">${T.inicio.premios(estado.premiosRestantes, estado.limitadoPor === 'dia')}</div>
          ${campana() ? `<p class="campana">${campana()}</p>` : ''}
          <div class="intentos"><span class="vasos">${vasos(estado.intentosRestantes, estado.intentosPorSemana)}</span><span>${T.inicio.intentos(estado.intentosRestantes, estado.intentosPorSemana)}</span></div>
          <button type="button" class="boton grande" data-accion="jugar">${T.inicio.jugar}</button>
          <div class="enlaces">
            <button type="button" class="enlace" data-accion="ayuda">${T.inicio.comoSeJuega}</button>
            ${tieneCodigo ? `<button type="button" class="enlace" data-accion="mi-codigo">${T.inicio.miCodigo}</button>` : ''}
            <button type="button" class="enlace" data-accion="condiciones">${T.inicio.condiciones}</button>
          </div>
        </div>
      </section>`;
    },

    cargando: () => `<section class="pantalla centro"><div class="panel"><p class="mensaje">${T.inicio.cargando}</p></div></section>`,

    error: ({ mensaje }) => `
      <section class="pantalla centro"><div class="panel">
        <p class="mensaje">${esc(mensaje || T.inicio.errorConexion)}</p>
        <button type="button" class="boton" data-accion="reintentar">${T.inicio.reintentar}</button>
      </div></section>`,

    ayuda: () => `
      <section class="pantalla centro fondo"><div class="panel ayuda">
        <h2>${T.ayuda.titulo}</h2>
        <ol class="pasos">${T.ayuda.pasos(cfg.partida.frutasMinimas, cfg.partida.vidas).map((p) => `<li>${p}</li>`).join('')}</ol>
        <p class="nota">${T.ayuda.premio(cfg.reglas.compraMinima, cfg.reglas.regalos)}</p>
        <button type="button" class="boton" data-accion="cerrar-ayuda">${T.ayuda.cerrar}</button>
      </div></section>`,

    pausa: () => `
      <section class="pantalla centro fondo"><div class="panel">
        <h2>${T.juego.pausa}</h2>
        <button type="button" class="boton grande" data-accion="continuar">${T.juego.continuar}</button>
        <button type="button" class="boton secundario" data-accion="salir">${T.juego.salir}</button>
      </div></section>`,

    ganaste: ({ error }) => `
      <section class="pantalla centro fondo scroll"><form class="panel ganaste" data-accion="reclamar" novalidate>
        <h2 class="grande-titulo">${T.ganaste.titulo}</h2>
        <p class="mensaje">${T.ganaste.subtitulo}</p>
        <p class="nota">${T.ganaste.ventana(cfg.reglas.ventanaReclamoMin)}</p>
        <label class="campo"><span>${T.ganaste.nombre}</span>
          <input name="nombre" type="text" autocomplete="name" maxlength="60" autocapitalize="words" required></label>
        <label class="campo"><span>${T.ganaste.celular}</span>
          <input name="celular" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="24" placeholder="3XX XXX XXXX" required></label>
        <label class="consentimiento"><input name="consentimiento" type="checkbox">
          <span>${T.ganaste.consentimiento} <button type="button" class="enlace corto" data-accion="politica">${T.ganaste.verPolitica}</button></span></label>
        <p class="nota chico">${T.ganaste.resumen(cfg.reglas)} <button type="button" class="enlace corto" data-accion="condiciones">${T.ganaste.verCondiciones}</button></p>
        <p class="error" id="error-form" role="alert">${error ? esc(error) : ''}</p>
        <button type="submit" class="boton grande" id="btn-reclamar">${T.ganaste.boton}</button>
      </form></section>`,

    // Ganó hace poco y no alcanzó a reclamar (cerró o recargó la página): se le ofrece volver al formulario.
    'premio-pendiente': () => `
      <section class="pantalla centro fondo"><div class="panel">
        <h2 class="grande-titulo">${T.premioPendiente.titulo}</h2>
        <p class="mensaje">${T.premioPendiente.mensaje}</p>
        <button type="button" class="boton grande" data-accion="recuperar-premio">${T.premioPendiente.boton}</button>
        <button type="button" class="enlace" data-accion="ahora-no">${T.premioPendiente.luego}</button>
      </div></section>`,

    condiciones: () => `
      <section class="pantalla centro fondo scroll"><div class="panel ayuda">
        <h2>${T.condiciones.titulo}</h2>
        <ul class="condiciones">${T.condiciones.lista(cfg.reglas, fechaDiaBogota, cfg.reglas.intentosPorSemana, cfg.reglas.premiosPorSemana, cfg.partida.frutasMinimas).map((x) => `<li>${x}</li>`).join('')}</ul>
        <p class="nota">${T.condiciones.provisional}</p>
        <button type="button" class="boton" data-accion="cerrar-condiciones">${T.condiciones.cerrar}</button>
      </div></section>`,

    politica: () => `
      <section class="pantalla centro fondo"><div class="panel ayuda">
        <h2>${T.ganaste.politica.titulo}</h2>
        <p class="nota">${T.ganaste.politica.texto(LOCAL.responsableDatos, LOCAL.correoContacto)}</p>
        <button type="button" class="boton" data-accion="cerrar-politica">${T.ayuda.cerrar}</button>
      </div></section>`,

    // El ticket del premio. `estado`: activo | vencido | canjeado | desactivado. La cuenta regresiva se calcula con la hora del servidor.
    codigo: ({ codigo, venceMs, estado = 'activo', canjeadoMs, esDePrueba, puedeVolverMs }) => {
      const [prefijo, resto] = String(codigo).split(/-(.*)/s); // LAINDIA-7K3Q → "LAINDIA" y "7K3Q"
      const ultimoMinuto = venceMs - 60000; // "vale hasta las 2:50" (el código sirve hasta antes de las 2:51:00)
      const estados = {
        activo: `<p class="vale">${T.codigo.vale(esc(fechaHoraBogota(ultimoMinuto)))}</p>
                 <p class="restante">${T.codigo.restante} <b id="cuenta-regresiva" data-vence="${venceMs}"></b></p>`,
        vencido: `<p class="aviso-estado">${T.codigo.vencido(esc(fechaHoraBogota(ultimoMinuto)))}</p>`,
        canjeado: `<p class="aviso-estado">${T.codigo.canjeado(esc(canjeadoMs ? fechaHoraBogota(canjeadoMs) : '—'))}</p>`,
        desactivado: `<p class="aviso-estado">${T.codigo.desactivado}</p>`,
      };
      const puedeMas = estado !== 'activo' && puedeVolverMs
        ? `<p class="nota">${T.codigo.otroCupon(esc(fechaCortaBogota(puedeVolverMs)))}</p>` : '';
      return `
      <section class="pantalla centro fondo scroll"><div class="panel ticket ${estado !== 'activo' ? 'inactivo' : ''}">
        <h2>${T.codigo.titulo}</h2>
        <div class="codigo" id="codigo-texto"><small>${esc(prefijo)}-</small>${esc(resto ?? '')}</div>
        ${estados[estado] ?? estados.activo}
        ${estado === 'activo' ? `<ol class="pasos">${T.codigo.pasos(cfg.reglas.compraMinima, cfg.reglas.regalos).map((p) => `<li>${p}</li>`).join('')}</ol>
        <p class="local"><b>${esc(LOCAL.direccion)}</b><br>${esc(LOCAL.horario)}</p>
        <button type="button" class="enlace" data-accion="condiciones">${T.codigo.condiciones}</button>` : puedeMas}
        ${esDePrueba ? `<p class="prueba">${T.codigo.prueba}</p>` : ''}
        ${estado === 'activo' ? `<p class="nota">${T.codigo.consejo}</p>
        <button type="button" class="boton" data-accion="copiar" id="btn-copiar">${T.codigo.copiar}</button>` : ''}
        <button type="button" class="boton secundario" data-accion="salir">${T.codigo.volver}</button>
      </div></section>`;
    },

    perdiste: ({ progreso, frutas, frutasMinimas, motivo, intentosRestantes }) => `
      <section class="pantalla centro fondo"><div class="panel">
        <h2 class="grande-titulo">${esc(motivo === 'frutas' ? T.perdiste.tituloFrutas : elegir(T.perdiste.titulos))}</h2>
        <p class="mensaje">${motivo === 'frutas' ? T.perdiste.mensajeFrutas(frutas, frutasMinimas) : T.perdiste.mensaje(Math.round(progreso * 100))}</p>
        <div class="chips"><span class="chip">${SVG_FRESA}${esc(T.perdiste.frutas(frutas))}</span></div>
        <p class="mensaje">${T.perdiste.intentos(intentosRestantes)}</p>
        ${intentosRestantes > 0
          ? `<button type="button" class="boton grande" data-accion="jugar">${T.perdiste.otraVez}</button>
             <button type="button" class="boton secundario" data-accion="salir">${T.perdiste.salir}</button>`
          : `<button type="button" class="boton grande" data-accion="salir">${T.perdiste.salir}</button>`}
      </div></section>`,

    // El celular ya reclamó un cupón: se dice cuándo podrá reclamar otro (sin mostrar el código de ese número).
    'ya-tienes-cupon': ({ puedeVolverMs, dias, tieneCodigo }) => `
      <section class="pantalla centro fondo scroll"><div class="panel">
        <h2>${T.yaTienesCupon.titulo}</h2>
        <p class="mensaje">${T.yaTienesCupon.mensaje(dias, esc(fechaCortaBogota(puedeVolverMs)))}</p>
        ${tieneCodigo ? `<button type="button" class="boton" data-accion="mi-codigo">${T.inicio.miCodigo}</button>` : ''}
        <button type="button" class="boton secundario" data-accion="otro-numero">${T.yaTienesCupon.otroNumero}</button>
        <button type="button" class="enlace" data-accion="salir">${T.yaTienesCupon.volver}</button>
      </div></section>`,

    'sin-intentos': ({ reiniciaEnISO, tieneCodigo }) => `
      <section class="pantalla centro"><div class="panel">
        <h2>${T.sinIntentos.titulo}</h2>
        <p class="mensaje">${T.sinIntentos.mensaje(esc(fechaCortaBogota(Date.parse(reiniciaEnISO))))}</p>
        ${tieneCodigo ? `<button type="button" class="boton" data-accion="mi-codigo">${T.inicio.miCodigo}</button>` : ''}
        <button type="button" class="enlace" data-accion="ayuda">${T.inicio.comoSeJuega}</button>
      </div></section>`,

    // `ganaste`: ganó, pero otra persona se llevó el último premio justo antes (se avisa distinto, sin culpa).
    'sin-premios': ({ reiniciaEnISO, tieneCodigo, ganaste, limitadoPor }) => `
      <section class="pantalla centro ${ganaste ? 'fondo' : ''}"><div class="panel">
        <h2>${ganaste ? T.sinPremios.tituloGanaste : limitadoPor === 'dia' ? T.sinPremios.tituloDia : T.sinPremios.titulo}</h2>
        <p class="mensaje">${(ganaste ? T.sinPremios.mensajeGanaste : limitadoPor === 'dia' ? T.sinPremios.mensajeDia : T.sinPremios.mensaje)(esc(fechaCortaBogota(Date.parse(reiniciaEnISO))))}</p>
        ${tieneCodigo ? `<button type="button" class="boton" data-accion="mi-codigo">${T.inicio.miCodigo}</button>` : ''}
        <button type="button" class="enlace" data-accion="ayuda">${T.inicio.comoSeJuega}</button>
      </div></section>`,

    'campana-inactiva': ({ tieneCodigo }) => {
      const { inicioISO, finISO } = cfg.reglas.campana ?? {};
      const ahora = reloj.ahora();
      const cuando = inicioISO && ahora < Date.parse(inicioISO) ? T.campanaInactiva.empieza(fechaDiaBogota(Date.parse(inicioISO)))
        : finISO && ahora > Date.parse(finISO) ? T.campanaInactiva.termino(fechaDiaBogota(Date.parse(finISO))) : '';
      return `
      <section class="pantalla centro"><div class="panel">
        <h2>${T.campanaInactiva.titulo}</h2>
        ${cuando ? `<p class="mensaje">${cuando}</p>` : ''}
        <p class="mensaje">${T.campanaInactiva.mensaje}</p>
        ${tieneCodigo ? `<button type="button" class="boton" data-accion="mi-codigo">${T.inicio.miCodigo}</button>` : ''}
      </div></section>`;
    },
  };

  // Cuenta regresiva del código (con la hora del SERVIDOR, no la del celular)
  let temporizador = null;
  function detenerCuentaRegresiva() {
    clearInterval(temporizador);
    temporizador = null;
  }
  function iniciarCuentaRegresiva() {
    detenerCuentaRegresiva();
    const el = contenedor.querySelector('#cuenta-regresiva');
    if (!el) return;
    const vence = Number(el.dataset.vence);
    const pintar = () => {
      const falta = vence - reloj.ahora();
      el.textContent = formatoRestante(falta);
      if (falta <= 0) detenerCuentaRegresiva();
    };
    pintar();
    temporizador = setInterval(pintar, 1000);
  }

  function mostrar(nombre, datos = {}) {
    pantallaActual = nombre;
    contenedor.innerHTML = plantillas[nombre](datos);
    contenedor.hidden = false;
    contenedor.scrollTop = 0;
    const primero = contenedor.querySelector('.scroll');
    if (primero) primero.scrollTop = 0;
    iniciarCuentaRegresiva();
  }
  function ocultar() {
    pantallaActual = null;
    detenerCuentaRegresiva();
    contenedor.hidden = true;
    contenedor.innerHTML = '';
  }
  /** Ventana encima de la pantalla actual (ayuda, política): no borra lo que haya debajo, p. ej. el formulario a medio llenar. */
  function mostrarModal(nombre, datos = {}) {
    cerrarModal();
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = plantillas[nombre](datos);
    contenedor.hidden = false;
    contenedor.appendChild(m);
  }
  function cerrarModal() {
    contenedor.querySelector('.modal')?.remove();
    if (!contenedor.children.length) contenedor.hidden = true;
  }

  // Un solo manejador para todos los botones (delegación de eventos)
  contenedor.addEventListener('click', (e) => {
    const b = e.target.closest('[data-accion]');
    if (!b || b.tagName === 'FORM') return;
    manejadores.accion?.(b.dataset.accion, b);
  });
  hud.addEventListener('click', (e) => {
    const b = e.target.closest('[data-accion]');
    if (b) manejadores.accion?.(b.dataset.accion, b);
  });
  // Celular: solo dígitos y máximo 10, con formato "312 345 6789" mientras se escribe (también al pegar)
  contenedor.addEventListener('input', (e) => {
    const el = e.target;
    if (el.name === 'celular') el.value = formatearCelular(soloDigitosCelular(el.value));
  });
  contenedor.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.closest('form');
    if (f) manejadores.accion?.(f.dataset.accion, f);
  });

  /** Lee y valida el formulario del premio. Devuelve { valores } o { error }. */
  function leerFormulario() {
    const f = contenedor.querySelector('form.ganaste');
    const nombre = f.nombre.value.trim().replace(/\s+/g, ' ');
    const celular = normalizarCelular(f.celular.value);
    if ([...nombre].length < 2) return { error: T.ganaste.errores.nombre, campo: f.nombre }; // por caracteres, no por unidades UTF-16: un solo emoji no es un nombre
    if (!celular) return { error: T.ganaste.errores.celular, campo: f.celular };
    if (!f.consentimiento.checked) return { error: T.ganaste.errores.consentimiento, campo: f.consentimiento };
    return { valores: { nombre, celular, consentimiento: true } };
  }
  function errorFormulario(texto) {
    const el = contenedor.querySelector('#error-form');
    if (el) el.textContent = texto || '';
  }
  function enviando(si) {
    const b = contenedor.querySelector('#btn-reclamar');
    if (!b) return;
    b.disabled = si;
    b.textContent = si ? T.ganaste.enviando : T.ganaste.boton;
  }
  async function copiarCodigo(texto) {
    const b = contenedor.querySelector('#btn-copiar');
    let ok = false;
    try {
      await navigator.clipboard.writeText(texto);
      ok = true;
    } catch {
      try {
        const t = document.createElement('textarea');
        t.value = texto;
        t.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(t);
        t.select();
        ok = document.execCommand('copy');
        t.remove();
      } catch {
        /* sin portapapeles: queda la captura de pantalla */
      }
    }
    if (b && ok) {
      b.textContent = T.codigo.copiado;
      setTimeout(() => {
        if (b.isConnected) b.textContent = T.codigo.copiar;
      }, 1800);
    }
  }
  function toast(texto) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = texto;
    raiz.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  return {
    mostrar,
    ocultar,
    mostrarModal,
    cerrarModal,
    get pantalla() {
      return pantallaActual;
    },
    mostrarHUD,
    actualizarHUD,
    mostrarCuenta,
    destelloGolpe,
    leerFormulario,
    errorFormulario,
    enviando,
    copiarCodigo,
    toast,
    alAccion(fn) {
      manejadores.accion = fn;
    },
  };
}
