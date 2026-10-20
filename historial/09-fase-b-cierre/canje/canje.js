// canje.js — Página de la caja: un campo de PIN, un campo de código y el resultado. Todo se decide en el servidor.
import { crearCanje } from '../js/panel/canje-ui.js';
import { el, reemplazar } from '../js/panel/dom.js';
import { DEMO, rpc } from '../js/panel/rpc.js';

// Anti «clickjacking»: esta página no debe poder abrirse DENTRO de otra (con una capa invisible encima para que la gente toque sin querer).
// (GitHub Pages no permite poner el encabezado X-Frame-Options, así que se hace así.)
if (window.top !== window.self) {
  document.body.replaceChildren(document.createTextNode('Esta página no se puede abrir dentro de otra. Ábrela directamente.'));
  throw new Error('página embebida');
}

const canje = crearCanje({
  conPin: true,
  consultar: ({ pin, codigo }) => rpc('canje_consultar', { p_pin: pin, p_codigo: codigo }),
  confirmar: ({ pin, codigo, regalo }) => rpc('canje_confirmar', { p_pin: pin, p_codigo: codigo, p_regalo: regalo }),
});

reemplazar(
  document.querySelector('#app'),
  canje.elemento,
  el('p', { class: 'nota' }, 'Si el PIN no funciona o un código parece raro, avísale al dueño. Un código solo se puede canjear una vez.'),
);

if (DEMO) {
  const demo = document.querySelector('#demo');
  demo.hidden = false;
  reemplazar(
    demo,
    el('b', {}, 'MODO DEMO · datos de mentira. '),
    'PIN: ', el('b', {}, '1234'), ' · Códigos: K7M2 (válido) · R8T3 (ya canjeado) · V3N5 (vencido) · D6F2 (desactivado)',
  );
}

canje.enfocar();
