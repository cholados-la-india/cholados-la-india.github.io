// vista-cuenta.js — Pestaña "Cuenta": el PIN de la caja (poner/cambiar/desbloquear), tu sesión y el respaldo en CSV.
import { el, reemplazar } from '../js/panel/dom.js';
import { fechaLarga } from '../js/panel/formato.js';
import { exportarCsv } from './exportar.js';

export function vistaCuenta(ctx) {
  const contenedor = el('div', { class: 'vista' });

  const campoPin = el('input', { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '8', autocomplete: 'off', 'aria-label': 'PIN nuevo' });
  const campoPin2 = el('input', { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '8', autocomplete: 'off', 'aria-label': 'Repite el PIN nuevo' });
  for (const c of [campoPin, campoPin2]) c.addEventListener('input', () => { c.value = c.value.replace(/\D/g, ''); });

  function tarjetaPin(pin) {
    const estado = !pin.configurado
      ? el('p', { class: 'resultado error' }, 'Todavía NO hay PIN: la caja no puede canjear. Pon uno abajo.')
      : el('p', { class: 'nota' }, `PIN configurado${pin.cambiadoISO ? ` (último cambio: ${fechaLarga(pin.cambiadoISO)})` : ''}. Está guardado cifrado: nadie puede verlo, solo cambiarlo.`);
    const bloqueo = pin.bloqueadoHastaISO && el('div', { class: 'resultado aviso-naranja' },
      el('p', {}, `Por demasiados PIN malos, la caja está bloqueada (hasta el ${fechaLarga(pin.bloqueadoHastaISO)}).`),
      el('button', { type: 'button', class: 'boton chico', onclick: desbloquear }, 'Desbloquear ahora'));
    return el('section', { class: 'tarjeta' },
      el('h2', {}, 'PIN de la caja'), estado, bloqueo,
      el('form', { class: 'config-seccion', novalidate: true, onsubmit: guardarPin },
        el('div', { class: 'rejilla' },
          el('label', { class: 'campo' }, el('span', {}, pin.configurado ? 'PIN nuevo' : 'PIN'), campoPin, el('span', { class: 'ayuda' }, '4 a 8 números (recomendado: 6). No uses 1234 ni números repetidos.')),
          el('label', { class: 'campo' }, el('span', {}, 'Repite el PIN'), campoPin2)),
        el('button', { type: 'submit', class: 'boton' }, pin.configurado ? 'Cambiar PIN' : 'Guardar PIN'),
        el('p', { class: 'nota' }, 'Entrégaselo al personal en persona; no lo mandes por chat. Si lo cambias, el anterior deja de servir al instante.')));
  }

  async function guardarPin(e) {
    e.preventDefault();
    if (campoPin.value !== campoPin2.value) return ctx.aviso('Los dos PIN no son iguales.', 'error');
    try {
      const r = await ctx.llamar('admin_cambiar_pin', { p_pin: campoPin.value });
      if (!r.ok) return ctx.aviso(r.mensaje ?? 'No se pudo guardar el PIN.', 'error');
      campoPin.value = '';
      campoPin2.value = '';
      ctx.aviso('PIN guardado. Ya sirve en la caja.');
      await ctx.cargar(contenedor, cargar);
    } catch (err) {
      ctx.errorDeCarga(err);
    }
  }

  async function desbloquear() {
    try {
      await ctx.llamar('admin_desbloquear_pin');
      ctx.aviso('La caja quedó desbloqueada.');
      await ctx.cargar(contenedor, cargar);
    } catch (err) {
      ctx.errorDeCarga(err);
    }
  }

  async function respaldo(boton) {
    boton.disabled = true;
    try {
      const { bajadas } = await exportarCsv(ctx.llamar, {});
      ctx.aviso(`Se descargaron ${bajadas.toLocaleString('es-CO')} códigos. Guarda el archivo en un lugar privado.`);
    } catch (err) {
      ctx.errorDeCarga(err);
    } finally {
      boton.disabled = false;
    }
  }

  function pintar(r) {
    const botonRespaldo = el('button', { type: 'button', class: 'boton secundario', onclick: () => respaldo(botonRespaldo) }, 'Descargar todos los códigos (CSV)');
    reemplazar(
      contenedor,
      tarjetaPin(r.pin),
      el('section', { class: 'tarjeta' },
        el('h2', {}, 'Respaldo'),
        el('p', { class: 'nota' }, 'El plan gratis de Supabase NO hace copias de seguridad automáticas. Descarga el CSV de vez en cuando (por ejemplo, cada semana) y guárdalo en un lugar privado: trae nombres y celulares.'),
        botonRespaldo),
      el('section', { class: 'tarjeta' },
        el('h2', {}, 'Tu sesión'),
        el('p', {}, `Sesión iniciada como ${ctx.correo()}.`),
        el('p', { class: 'nota' }, 'Para cambiar tu contraseña: Supabase → Authentication → Users → tu usuario. Si la olvidas, ahí mismo puedes ponerte una nueva.'),
        el('button', { type: 'button', class: 'boton secundario', onclick: () => ctx.salir() }, 'Cerrar sesión')),
    );
  }

  async function cargar() {
    pintar(await ctx.llamar('admin_resumen'));
  }

  return { elemento: contenedor, mostrar: () => ctx.cargar(contenedor, cargar) };
}
