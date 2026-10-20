// canje-ui.js — La pantalla de CANJE. La comparten dos lugares:
//   · la página de la caja (web/canje/): con el campo de PIN, para quien atiende;
//   · el panel de administrador (pestaña "Canjear"): sin PIN, porque ya hay sesión.
//
// Flujo: se escribe el código → "Verificar" (consulta, NO canjea) → si es válido, quien atiende elige el regalo que
// escoge el cliente y pulsa "Marcar como canjeado" (eso sí lo canjea, una sola vez, en el servidor).
import { el, reemplazar } from './dom.js';
import { celular as formatoCelular, duracion, fechaLarga, pesos, valeHasta } from './formato.js';
import { ErrorServidor } from './rpc.js';
import { horaBogota } from '../util.js';

/**
 * @param conPin       true en la caja (pide el PIN), false en el panel de administrador
 * @param consultar    ({pin, codigo}) → respuesta del servidor
 * @param confirmar    ({pin, codigo, regalo}) → respuesta del servidor
 * @param alTerminar   (opcional) se llama cuando se canjea con éxito (el panel actualiza sus números)
 */
export function crearCanje({ conPin, consultar, confirmar, alTerminar }) {
  let ocupado = false;

  const campoPin = conPin
    ? el('input', { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '8', autocomplete: 'off', 'aria-label': 'PIN de la caja' })
    : null;
  const campoCodigo = el('input', {
    type: 'text', class: 'mayus', autocapitalize: 'characters', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
    placeholder: 'Ej.: K7M2', 'aria-label': 'Código del cliente',
  });
  const botonVerificar = el('button', { type: 'submit', class: 'boton grande' }, 'Verificar');
  const resultado = el('section', { 'aria-live': 'polite', class: 'resultado-zona' });

  campoPin?.addEventListener('input', () => {
    campoPin.value = campoPin.value.replace(/\D/g, '');
  });
  campoCodigo.addEventListener('input', () => {
    if (!ocupado && resultado.firstChild) reemplazar(resultado); // un resultado viejo no debe quedar al lado de otro código
  });

  const formulario = el(
    'form',
    { class: 'tarjeta', novalidate: true, onsubmit: verificar },
    conPin && el('label', { class: 'campo' }, el('span', {}, 'PIN de la caja'), campoPin),
    el('label', { class: 'campo' }, el('span', {}, 'Código del cliente'), campoCodigo, el('span', { class: 'ayuda' }, 'Sirve completo (LAINDIA-K7M2) o solo las 4 letras finales.')),
    botonVerificar,
  );
  const elemento = el('div', { class: 'canje' }, formulario, resultado);

  function ocupar(si, textoBoton = 'Verificar') {
    ocupado = si;
    botonVerificar.disabled = si;
    botonVerificar.textContent = si ? 'Verificando…' : textoBoton;
  }

  function mostrar(...hijos) {
    reemplazar(resultado, ...hijos);
    resultado.scrollIntoView?.({ block: 'nearest' });
  }

  // ── paneles de resultado ──
  function panel(clase, icono, titulo, ...resto) {
    return el('div', { class: `resultado ${clase}`, role: 'status' }, el('div', { class: 'icono', 'aria-hidden': 'true' }, icono), el('h2', {}, titulo), ...resto);
  }
  const detalle = (texto) => el('p', { class: 'detalle' }, texto);
  const cliente = (r) => r.nombre && el('p', { class: 'cliente' }, `Cliente: ${r.nombre} · ${formatoCelular(r.celular)}`);

  function panelError(err) {
    if (err instanceof ErrorServidor) {
      if (err.tipo === 'red') return panel('error', '✖', 'SIN CONEXIÓN', detalle('No hay internet o el servidor no responde. Revisa la conexión y vuelve a intentar.'));
      if (err.tipo === 'sesion') return panel('error', '✖', 'SESIÓN VENCIDA', detalle('Vuelve a iniciar sesión.'));
      return panel('error', '✖', 'NO SE PUDO', detalle(err.message));
    }
    return panel('error', '✖', 'ALGO SALIÓ MAL', detalle('Intenta de nuevo. Si sigue pasando, avísale al dueño.'));
  }

  function pintar(r, contexto) {
    switch (r.resultado) {
      case 'valido':
        return mostrar(panelValido(r, contexto));
      case 'canjeado':
        return mostrar(panel('aviso-naranja', '!', 'YA FUE CANJEADO', r.codigo && el('p', { class: 'codigo-grande' }, r.codigo), cliente(r),
          detalle(`Canjeado el ${fechaLarga(r.canjeadoISO)}`), r.regaloElegido && detalle(`Se entregó: ${r.regaloElegido}`)));
      case 'vencido':
        return mostrar(panel('error', '✖', 'VENCIDO', r.codigo && el('p', { class: 'codigo-grande' }, r.codigo), cliente(r),
          detalle(`Era válido hasta el ${valeHasta(r.venceISO)}`)));
      case 'desactivado':
        return mostrar(panel('neutro', '✖', 'DESACTIVADO', r.codigo && el('p', { class: 'codigo-grande' }, r.codigo), cliente(r),
          detalle('El administrador desactivó este código. No se puede canjear.')));
      case 'inexistente':
        return mostrar(panel('error', '✖', 'NO EXISTE', detalle('No encontramos ese código. Revisa que esté bien escrito (los códigos no llevan 0, O, 1 ni I).')));
      case 'regalo-invalido':
        return mostrar(panel('aviso-naranja', '!', 'ELIGE UN REGALO', detalle('Marca el regalo que escoge el cliente y vuelve a intentar.')));
      case 'pin-incorrecto': {
        const n = r.intentosRestantes;
        campoPin?.select();
        return mostrar(panel('error', '✖', 'PIN INCORRECTO', detalle(`Te quedan ${n} intento${n === 1 ? '' : 's'} antes del bloqueo.`)));
      }
      case 'bloqueado':
        return mostrar(panel('error', '✖', 'DEMASIADOS INTENTOS',
          detalle(`Por seguridad se bloqueó. Intenta de nuevo a las ${horaBogota(Date.parse(r.hastaISO))} (en ${duracion(r.segundos)}).`),
          detalle('El dueño puede desbloquearlo desde el panel de administrador.')));
      case 'sin-pin':
        return mostrar(panel('neutro', '!', 'FALTA EL PIN', detalle('Todavía no hay un PIN configurado. El dueño debe ponerlo desde el panel de administrador.')));
      default:
        return mostrar(panel('error', '✖', 'RESPUESTA RARA', detalle('El servidor respondió algo inesperado. Avísale al dueño.')));
    }
  }

  function panelValido(r, contexto) {
    let elegido = r.regalos.length === 1 ? r.regalos[0] : null;
    const botonCanjear = el('button', { type: 'button', class: 'boton verde grande', disabled: elegido == null, onclick: canjear }, 'Marcar como canjeado');
    const cajas = r.regalos.map((nombre) => {
      const radio = el('input', { type: 'radio', name: 'regalo', value: nombre, checked: elegido === nombre });
      const caja = el('label', { class: 'opcion' + (elegido === nombre ? ' elegida' : '') }, radio, el('span', {}, nombre));
      radio.addEventListener('change', () => {
        elegido = nombre;
        botonCanjear.disabled = false;
        for (const c of cajas) c.classList.toggle('elegida', c.querySelector('input').checked);
      });
      return caja;
    });

    async function canjear() {
      if (!elegido || ocupado) return;
      ocupado = true;
      botonCanjear.disabled = true;
      botonCanjear.textContent = 'Canjeando…';
      try {
        const c = await confirmar({ pin: contexto.pin, codigo: r.codigo, regalo: elegido });
        if (c.ok && c.resultado === 'canjeado-ahora') {
          mostrar(panelExito(c));
          alTerminar?.(c);
        } else {
          pintar(c, contexto); // por ejemplo: otra persona lo canjeó justo antes ("ya canjeado")
        }
      } catch (err) {
        mostrar(panelError(err));
      } finally {
        ocupado = false;
      }
    }

    return panel('ok', '✔', 'CÓDIGO VÁLIDO',
      el('p', { class: 'codigo-grande' }, r.codigo),
      cliente(r),
      detalle(`Vale hasta el ${valeHasta(r.venceISO)}`),
      el('div', { class: 'cuerpo' },
        el('p', { class: 'regla' }, `Compra mínima de ${pesos(r.compraMinima)} en productos pagados (el regalo no cuenta).`),
        el('h3', {}, r.regalos.length === 1 ? 'Regalo a entregar' : '¿Qué regalo elige el cliente?'),
        el('div', { class: 'opciones', role: 'radiogroup' }, cajas),
        botonCanjear));
  }

  function panelExito(c) {
    return panel('ok', '✔', '¡CANJEADO!',
      el('p', { class: 'codigo-grande' }, c.codigo),
      detalle(`Entrega: ${c.regaloElegido}`),
      el('button', { type: 'button', class: 'boton grande', onclick: limpiar }, 'Siguiente código'));
  }

  function limpiar() {
    campoCodigo.value = '';
    reemplazar(resultado);
    campoCodigo.focus();
  }

  async function verificar(e) {
    e?.preventDefault();
    if (ocupado) return;
    const codigo = campoCodigo.value.trim();
    const pin = campoPin?.value ?? '';
    if (campoPin && !pin) {
      mostrar(panel('neutro', '!', 'FALTA EL PIN', detalle('Escribe el PIN de la caja.')));
      campoPin.focus();
      return;
    }
    if (!codigo) {
      mostrar(panel('neutro', '!', 'FALTA EL CÓDIGO', detalle('Escribe el código del cliente.')));
      campoCodigo.focus();
      return;
    }
    ocupar(true);
    mostrar(panel('cargando', '', 'Verificando…'));
    try {
      pintar(await consultar({ pin, codigo }), { pin, codigo });
    } catch (err) {
      mostrar(panelError(err));
    } finally {
      ocupar(false);
    }
  }

  return {
    elemento,
    enfocar: () => (campoPin && !campoPin.value ? campoPin : campoCodigo).focus(),
    /** Para el panel: llenar el código y consultar de una vez (desde la lista de códigos). */
    cargarCodigo(codigo) {
      campoCodigo.value = codigo;
      return verificar();
    },
  };
}
