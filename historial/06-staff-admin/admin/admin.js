// admin.js — Panel de administrador (solo para el dueño). Inicio de sesión con Supabase Auth + 5 pestañas.
//
// Qué puede hacer cada quien:
//   · Cualquiera puede ABRIR esta página (es pública, como todo el sitio), pero sin iniciar sesión no ve nada.
//   · Alguien con sesión que NO está en la tabla app.admins tampoco puede nada: el servidor le contesta "no autorizado".
//   · Solo el administrador ve códigos, nombres y celulares, cambia la configuración y el PIN.
import { crearCanje } from '../js/panel/canje-ui.js';
import { el, reemplazar } from '../js/panel/dom.js';
import { DEMO, ErrorServidor, rpc } from '../js/panel/rpc.js';
import { ErrorAuth, cerrarSesion, iniciarSesion, sesionGuardada, tokenFresco } from '../js/panel/auth.js';
import { vistaCodigos } from './vista-codigos.js';
import { vistaConfig } from './vista-config.js';
import { vistaCuenta } from './vista-cuenta.js';
import { vistaResumen } from './vista-resumen.js';

const raiz = document.querySelector('#app');
const barraPestanas = document.querySelector('#pestanas');
const quien = document.querySelector('#quien');
let temporizadorAviso;

// ───────────────────────── ayudas generales ─────────────────────────

function aviso(texto, tipo = 'ok') {
  document.querySelector('.aviso')?.remove();
  const nodo = el('div', { class: 'aviso' + (tipo === 'error' ? ' error' : ''), role: tipo === 'error' ? 'alert' : 'status' }, texto);
  document.body.append(nodo);
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => nodo.remove(), tipo === 'error' ? 8000 : 5000);
}

const mensajeError = (e) =>
  e instanceof ErrorServidor ? (e.tipo === 'red' ? 'No hay conexión con el servidor. Revisa el internet.' : e.message) : 'Algo salió mal. Intenta de nuevo.';

/** Llama a una función de administrador con el token de la sesión; si venció, lo renueva una vez y reintenta. */
async function llamar(nombre, argumentos = {}) {
  let token = await tokenFresco();
  if (!token) throw new ErrorServidor('sesion', 'No hay sesión.');
  try {
    return await rpc(nombre, argumentos, { token });
  } catch (e) {
    if (e instanceof ErrorServidor && e.tipo === 'sesion') {
      token = await tokenFresco(true);
      if (token) return rpc(nombre, argumentos, { token });
    }
    throw e;
  }
}

/** Muestra "Cargando…", corre `fn` y, si falla, deja un cuadro con «Reintentar». */
async function cargar(contenedor, fn) {
  if (!contenedor.firstChild) reemplazar(contenedor, el('p', { class: 'vacio' }, el('span', { class: 'punto' }), 'Cargando…'));
  try {
    await fn();
  } catch (e) {
    if (e instanceof ErrorServidor && e.tipo === 'sesion') return salir('La sesión venció. Entra de nuevo.');
    reemplazar(contenedor, el('div', { class: 'tarjeta' }, el('h2', {}, 'No se pudo cargar'), el('p', {}, mensajeError(e)),
      el('button', { type: 'button', class: 'boton', onclick: () => cargar(contenedor, fn) }, 'Reintentar')));
  }
}

function errorDeCarga(e) {
  if (e instanceof ErrorServidor && e.tipo === 'sesion') return salir('La sesión venció. Entra de nuevo.');
  aviso(mensajeError(e), 'error');
}

async function salir(mensaje) {
  await cerrarSesion();
  pantallaLogin(mensaje);
}

// ───────────────────────── pantallas ─────────────────────────

function ocultarPanel() {
  quien.hidden = true;
  barraPestanas.hidden = true;
  reemplazar(barraPestanas);
}

function pantallaLogin(mensaje) {
  ocultarPanel();
  const correo = el('input', { type: 'email', autocomplete: 'username', 'aria-label': 'Correo' });
  const clave = el('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Contraseña' });
  const recordar = el('input', { type: 'checkbox' });
  const error = el('p', { class: 'resultado error', role: 'alert', hidden: !mensaje }, mensaje ?? '');
  const boton = el('button', { type: 'submit', class: 'boton grande' }, 'Entrar');

  const formulario = el('form', { class: 'tarjeta entrada', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      if (!correo.value.trim() || !clave.value) {
        error.textContent = 'Escribe tu correo y tu contraseña.';
        error.hidden = false;
        return;
      }
      boton.disabled = true;
      boton.textContent = 'Entrando…';
      error.hidden = true;
      try {
        await iniciarSesion(correo.value.trim(), clave.value, recordar.checked);
        clave.value = '';
        await arrancar();
      } catch (err) {
        error.textContent = err instanceof ErrorAuth ? err.message : 'No se pudo entrar. Intenta de nuevo.';
        error.hidden = false;
        boton.disabled = false;
        boton.textContent = 'Entrar';
        clave.select();
      }
    } },
    el('h2', {}, 'Entrar'),
    error,
    el('label', { class: 'campo' }, el('span', {}, 'Correo'), correo),
    el('label', { class: 'campo' }, el('span', {}, 'Contraseña'), clave),
    el('label', { class: 'opcion' }, recordar, el('span', {}, 'Mantener la sesión iniciada en este dispositivo')),
    boton,
    el('p', { class: 'nota' }, 'Tu usuario se crea en Supabase (Authentication → Users). En un computador o celular de otra persona, deja la casilla sin marcar.'),
  );
  reemplazar(raiz, formulario);
  correo.focus();
}

function pantallaMensaje(titulo, texto, ...botones) {
  ocultarPanel();
  reemplazar(raiz, el('div', { class: 'tarjeta entrada' }, el('h2', {}, titulo), el('p', {}, texto), el('div', { class: 'fila-botones' }, botones)));
}

async function arrancar() {
  const s = sesionGuardada();
  if (!s) return pantallaLogin();
  reemplazar(raiz, el('p', { class: 'vacio' }, el('span', { class: 'punto' }), 'Entrando…'));
  try {
    const yo = await llamar('admin_yo');
    if (!yo.esAdmin) {
      return pantallaMensaje('Esta cuenta no es de administrador',
        `Entraste como ${s.correo}, pero esa cuenta no está en la lista de administradores del servidor. Falta anotarla (ver supabase/LEEME.md, «Etapa 5»).`,
        el('button', { type: 'button', class: 'boton secundario', onclick: () => salir() }, 'Salir'));
    }
    construirPanel(s);
  } catch (e) {
    if (e instanceof ErrorServidor && e.tipo === 'sesion') return pantallaLogin('La sesión venció. Entra de nuevo.');
    pantallaMensaje('No se pudo abrir el panel', mensajeError(e),
      el('button', { type: 'button', class: 'boton', onclick: arrancar }, 'Reintentar'),
      el('button', { type: 'button', class: 'boton secundario', onclick: () => salir() }, 'Salir'));
  }
}

// ───────────────────────── el panel ─────────────────────────

const PESTANAS = [['resumen', 'Resumen'], ['codigos', 'Códigos'], ['canje', 'Canjear'], ['config', 'Configuración'], ['cuenta', 'Cuenta']];

function construirPanel(sesion) {
  const ctx = { llamar, aviso, cargar, errorDeCarga, irA, salir: () => salir(), correo: () => sesion.correo };

  const canje = crearCanje({
    conPin: false,
    consultar: ({ codigo }) => llamar('admin_consultar_codigo', { p_codigo: codigo }),
    confirmar: ({ codigo, regalo }) => llamar('admin_canjear', { p_codigo: codigo, p_regalo: regalo }),
  });
  const vistas = {
    resumen: vistaResumen(ctx),
    codigos: vistaCodigos(ctx),
    canje: { elemento: canje.elemento, mostrar: (codigo) => (codigo ? canje.cargarCodigo(codigo) : canje.enfocar()) },
    config: vistaConfig(ctx),
    cuenta: vistaCuenta(ctx),
  };

  reemplazar(quien, el('div', {}, sesion.correo), el('button', { type: 'button', class: 'boton secundario chico', onclick: () => salir() }, 'Salir'));
  quien.hidden = false;

  const botones = {};
  const paneles = {};
  for (const [clave, nombre] of PESTANAS) {
    botones[clave] = el('button', { type: 'button', role: 'tab', class: 'pestana', 'aria-selected': 'false', id: `tab-${clave}`, 'aria-controls': `panel-${clave}`, onclick: () => irA(clave) }, nombre);
    paneles[clave] = el('section', { role: 'tabpanel', id: `panel-${clave}`, 'aria-labelledby': `tab-${clave}`, hidden: true }, vistas[clave].elemento);
  }
  reemplazar(barraPestanas, Object.values(botones));
  barraPestanas.hidden = false;
  reemplazar(raiz, Object.values(paneles));

  function irA(clave, dato) {
    if (!vistas[clave]) clave = 'resumen';
    for (const [k] of PESTANAS) {
      botones[k].setAttribute('aria-selected', String(k === clave));
      paneles[k].hidden = k !== clave;
    }
    try { history.replaceState(null, '', `#${clave}`); } catch { /* nada */ }
    botones[clave].scrollIntoView?.({ inline: 'center', block: 'nearest' });
    return vistas[clave].mostrar(dato);
  }
  ctx.irA = irA;

  irA(location.hash.slice(1) || 'resumen');
}

// ───────────────────────── arranque ─────────────────────────

if (DEMO) {
  const demo = document.querySelector('#demo');
  demo.hidden = false;
  reemplazar(demo, el('b', {}, 'MODO DEMO · datos de mentira. '), 'Entra con cualquier correo y la clave ', el('b', {}, 'demo'), ' · PIN de la caja: ', el('b', {}, '1234'), ' · Lo que cambies se pierde al recargar.');
}
arrancar();
