// api-supabase.js — La API REAL: habla con las funciones del servidor (Supabase, esquema "public").
// Mismo contrato que api-falsa.js (documentado en api.js). Solo usa `fetch` (sin librerías: carga más liviana).
//
// El juego NUNCA toca las tablas: solo llama a estas funciones con la clave pública. Toda regla (intentos, premios,
// vigencia, un código por celular, validar la victoria) se decide en el servidor, con su propio reloj.
import { idDispositivo } from './dispositivo.js';
import { reloj } from './reloj.js';
import { SUPABASE } from './supabase-config.js';
import { esperar } from './util.js';

export const esFalsa = false;
export const configurar = () => {}; // (la API falsa necesita la config viva; esta no)

const TIEMPO_MAX_MS = 12000;

function cabeceras() {
  const h = { 'Content-Type': 'application/json', apikey: SUPABASE.clave };
  // Las claves nuevas (sb_publishable_...) van solo en "apikey". Las antiguas (JWT, eyJ...) también como Bearer.
  if (SUPABASE.clave.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE.clave}`;
  return h;
}

/**
 * Llama a una función del servidor. `reintentos`: solo para funciones que se pueden repetir sin efecto doble
 * (estado, mi_codigo, terminar_partida y reclamar_codigo son "idempotentes"; iniciar_partida NO: gasta un intento).
 */
async function rpc(nombre, argumentos, { reintentos = 0 } = {}) {
  let ultimoError;
  for (let i = 0; i <= reintentos; i++) {
    const control = new AbortController();
    const reloj_ = setTimeout(() => control.abort(), TIEMPO_MAX_MS);
    try {
      const res = await fetch(`${SUPABASE.url}/rest/v1/rpc/${nombre}`, {
        method: 'POST',
        headers: cabeceras(),
        body: JSON.stringify(argumentos),
        signal: control.signal,
      });
      if (!res.ok) {
        const e = new Error(`Supabase ${nombre}: HTTP ${res.status}`);
        e.http = res.status;
        throw e;
      }
      const datos = await res.json();
      if (datos?.ahoraISO) reloj.ajustar(datos.ahoraISO);
      if (datos?.estado?.ahoraISO) reloj.ajustar(datos.estado.ahoraISO);
      return datos;
    } catch (e) {
      ultimoError = e;
      if (e.http && e.http < 500) break; // un 4xx no mejora reintentando
      if (i < reintentos) await esperar(500 * (i + 1));
    } finally {
      clearTimeout(reloj_);
    }
  }
  throw ultimoError;
}

export const obtenerEstado = () => rpc('estado', { p_device: idDispositivo() }, { reintentos: 2 });

export const iniciarPartida = () => rpc('iniciar_partida', { p_device: idDispositivo() });

export const terminarPartida = ({ token, gano, progreso, frutas }) =>
  rpc('terminar_partida', { p_token: token, p_gano: Boolean(gano), p_progreso: progreso ?? null, p_frutas: frutas ?? 0 }, { reintentos: 2 });

export const reclamarPremio = ({ token, nombre, celular, consentimiento }) =>
  rpc('reclamar_codigo', { p_token: token, p_nombre: nombre, p_celular: celular, p_consentimiento: Boolean(consentimiento) }, { reintentos: 2 });

/**
 * Anota de qué enlace llegó la persona (etiquetas UTM) en la partida que acaba de empezar. Es mejor esfuerzo: si falla, la partida
 * sigue igual. El servidor solo lo acepta una vez por partida y en sus primeros 15 minutos.
 */
export const registrarCanal = ({ token, fuente, medio, campana }) =>
  rpc('registrar_canal', { p_token: token, p_fuente: fuente ?? null, p_medio: medio ?? null, p_campana: campana ?? null }, { reintentos: 1 });

export const miCodigo = () => rpc('mi_codigo', { p_device: idDispositivo() }, { reintentos: 2 });

/** Despierta al servidor y devuelve su hora (la usa el aviso diario que evita que el proyecto gratis se pause). */
export const ping = () => rpc('ping', {}, { reintentos: 1 });
