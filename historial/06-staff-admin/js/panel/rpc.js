// rpc.js — Cómo la caja y el panel hablan con el servidor (Supabase): llaman a las funciones de 0003_staff_admin.sql.
//
//   · La caja usa solo la clave pública (+ el PIN, que se verifica en el servidor).
//   · El panel de administrador agrega la sesión de Supabase Auth (el token de quien inició sesión): `token`.
//   · Con  ?api=falsa  todo es una simulación local (falso.js): sirve para ver y probar las pantallas sin tocar nada real.
import { SUPABASE } from '../supabase-config.js';

export const DEMO = new URLSearchParams(location.search).get('api') === 'falsa';

const TIEMPO_MAX_MS = 12000;

export class ErrorServidor extends Error {
  /** tipo: 'red' (sin conexión), 'sesion' (token vencido o inválido), 'faltan-funciones' (no se corrió 0003), 'servidor' */
  constructor(tipo, mensaje, http) {
    super(mensaje);
    this.tipo = tipo;
    this.http = http;
  }
}

let falso = null;

/** Llama a una función del servidor y devuelve su JSON. Lanza ErrorServidor si algo falla (no si el servidor responde "no"). */
export async function rpc(nombre, argumentos = {}, { token } = {}) {
  if (DEMO) {
    falso ??= await import('./falso.js');
    return falso.llamar(nombre, argumentos, token);
  }
  const cabeceras = { 'Content-Type': 'application/json', apikey: SUPABASE.clave };
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_MAX_MS);
  let res;
  try {
    res = await fetch(`${SUPABASE.url}/rest/v1/rpc/${nombre}`, {
      method: 'POST',
      headers: cabeceras,
      body: JSON.stringify(argumentos),
      signal: control.signal,
    });
  } catch {
    throw new ErrorServidor('red', 'No hay conexión con el servidor.');
  } finally {
    clearTimeout(reloj);
  }
  if (res.ok) return res.json();

  let cuerpo = null;
  try {
    cuerpo = await res.json();
  } catch {
    /* sin cuerpo */
  }
  const texto = `${cuerpo?.message ?? ''} ${cuerpo?.code ?? ''} ${cuerpo?.hint ?? ''}`;
  if (res.status === 401 || /JWT|PGRST30/i.test(texto)) throw new ErrorServidor('sesion', 'La sesión venció o no es válida.', res.status);
  if (res.status === 404 || /PGRST202|Could not find the function/i.test(texto)) {
    throw new ErrorServidor('faltan-funciones', 'El servidor todavía no tiene las funciones de la Etapa 5 (falta correr 0003_staff_admin.sql).', res.status);
  }
  throw new ErrorServidor('servidor', `El servidor respondió con un error (${res.status}).`, res.status);
}
