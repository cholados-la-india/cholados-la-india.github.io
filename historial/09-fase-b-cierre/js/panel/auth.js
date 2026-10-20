// auth.js — Inicio de sesión del administrador con Supabase Auth (correo + contraseña, sin Google ni nada más).
//
// Se habla directo con la API de Auth de Supabase (solo `fetch`, sin librerías):
//   POST /auth/v1/token?grant_type=password        → entra con correo y contraseña
//   POST /auth/v1/token?grant_type=refresh_token   → renueva la sesión (el "token" dura ~1 hora)
//   POST /auth/v1/logout                           → cierra la sesión
// La contraseña NUNCA se guarda: solo los tokens de la sesión. Por defecto viven en sessionStorage (se borran al cerrar la
// pestaña); si marcas "mantener sesión iniciada", van a localStorage de ESE dispositivo.
// Quién es administrador lo decide el SERVIDOR (tabla app.admins): un usuario cualquiera no puede hacer nada aunque entre.
import { SUPABASE } from '../supabase-config.js';
import { DEMO } from './rpc.js';

const LLAVE = 'cholado-admin-sesion';
let sesion = null;
let renovando = null;

export class ErrorAuth extends Error {
  /** tipo: 'credenciales' | 'sin-confirmar' | 'muchos-intentos' | 'red' | 'servidor' */
  constructor(tipo, mensaje) {
    super(mensaje);
    this.tipo = tipo;
  }
}

function guardar(nueva) {
  sesion = nueva;
  if (DEMO) return; // la demo no deja nada guardado
  try {
    sessionStorage.removeItem(LLAVE);
    localStorage.removeItem(LLAVE);
    (nueva.recordar ? localStorage : sessionStorage).setItem(LLAVE, JSON.stringify(nueva));
  } catch {
    /* navegador sin almacenamiento: la sesión dura mientras no se recargue la página */
  }
}

function borrar() {
  sesion = null;
  try {
    sessionStorage.removeItem(LLAVE);
    localStorage.removeItem(LLAVE);
  } catch {
    /* nada */
  }
}

/** Recupera la sesión guardada (si hay). */
export function sesionGuardada() {
  if (sesion) return sesion;
  if (DEMO) return null;
  for (const almacen of ['sessionStorage', 'localStorage']) {
    try {
      const t = window[almacen].getItem(LLAVE);
      if (t) {
        sesion = JSON.parse(t);
        return sesion;
      }
    } catch {
      /* nada */
    }
  }
  return null;
}

const cabeceras = () => ({ 'Content-Type': 'application/json', apikey: SUPABASE.clave });

async function pedir(ruta, cuerpo) {
  let res;
  try {
    res = await fetch(`${SUPABASE.url}/auth/v1/${ruta}`, { method: 'POST', headers: cabeceras(), body: JSON.stringify(cuerpo) });
  } catch {
    throw new ErrorAuth('red', 'No hay conexión con el servidor.');
  }
  const datos = await res.json().catch(() => null);
  return { res, datos };
}

function deRespuesta(datos, recordar, correoRespaldo) {
  return {
    access_token: datos.access_token,
    refresh_token: datos.refresh_token,
    expira: Date.now() + (datos.expires_in ?? 3600) * 1000,
    correo: datos.user?.email ?? correoRespaldo,
    userId: datos.user?.id ?? null,
    recordar: Boolean(recordar),
  };
}

export async function iniciarSesion(correo, clave, recordar) {
  if (DEMO) {
    const { CLAVE_DEMO, TOKEN_DEMO } = await import('./falso.js');
    if (clave !== CLAVE_DEMO) throw new ErrorAuth('credenciales', 'Correo o contraseña incorrectos.');
    guardar({ access_token: TOKEN_DEMO, refresh_token: '', expira: Date.now() + 3600e3, correo: correo || 'demo@ejemplo.co', userId: 'demo', recordar: false });
    return sesion;
  }
  const { res, datos } = await pedir('token?grant_type=password', { email: correo, password: clave });
  if (!res.ok) {
    const codigo = datos?.error_code ?? datos?.error ?? '';
    if (res.status === 429 || codigo === 'over_request_rate_limit') throw new ErrorAuth('muchos-intentos', 'Demasiados intentos. Espera unos minutos y vuelve a probar.');
    if (codigo === 'email_not_confirmed') throw new ErrorAuth('sin-confirmar', 'Ese correo no está confirmado en Supabase. En Authentication → Users, confirma el usuario (o créalo con «Auto Confirm User»).');
    if (res.status === 400 || res.status === 401 || res.status === 422) throw new ErrorAuth('credenciales', 'Correo o contraseña incorrectos.');
    throw new ErrorAuth('servidor', `El servidor respondió con un error (${res.status}).`);
  }
  guardar(deRespuesta(datos, recordar, correo));
  return sesion;
}

/** El token de acceso vigente (lo renueva si le quedan menos de 60 s o si `forzar`). null = ya no hay sesión. */
export async function tokenFresco(forzar = false) {
  const s = sesionGuardada();
  if (!s) return null;
  if (DEMO) return s.access_token;
  if (!forzar && s.expira - Date.now() > 60_000) return s.access_token;
  if (!s.refresh_token) {
    borrar();
    return null;
  }
  renovando ??= (async () => {
    try {
      const { res, datos } = await pedir('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
      if (!res.ok) {
        borrar();
        return null;
      }
      guardar(deRespuesta(datos, s.recordar, s.correo));
      return sesion.access_token;
    } catch {
      return forzar || s.expira <= Date.now() ? null : s.access_token; // sin internet: se sigue con el token actual mientras valga
    } finally {
      renovando = null;
    }
  })();
  return renovando;
}

export async function cerrarSesion() {
  const s = sesion;
  borrar();
  if (DEMO || !s?.access_token) return;
  try {
    await fetch(`${SUPABASE.url}/auth/v1/logout`, { method: 'POST', headers: { ...cabeceras(), Authorization: `Bearer ${s.access_token}` } });
  } catch {
    /* si no hay internet, igual quedó cerrada aquí */
  }
}
