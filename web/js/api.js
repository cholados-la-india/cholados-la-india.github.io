// api.js — La ÚNICA puerta entre el juego y el "servidor". Todo el juego habla con `api`, nunca con la implementación.
//
// Hay dos implementaciones con el MISMO contrato:
//   · api-supabase.js → el servidor real (Supabase). Se usa cuando supabase-config.js tiene `url` y `clave`.
//   · api-falsa.js    → simulación local (localStorage): sirve para calibrar con ?debug=1&api=falsa sin gastar
//                       intentos ni premios reales, y es el respaldo si todavía no hay servidor.
// Para forzar la falsa: añade  ?api=falsa  a la dirección.
//
// Contrato (todas devuelven una promesa; las fechas viajan como texto ISO en UTC; el reloj lo pone el servidor):
//
//   configurar(cfg)      Solo la API falsa lo necesita (le pasa la config viva).
//
//   obtenerEstado()  →  {
//       jugable, motivo,                    motivo: null | 'sin-intentos' | 'sin-premios' | 'campana-inactiva'
//       premiosRestantes, premiosPorSemana, // "Quedan X premios esta semana"
//       intentosRestantes, intentosPorSemana,
//       reiniciaEnISO,                      // cuándo se renueva (lunes 00:00 Bogotá, o mañana 00:00 si es el cupo diario)
//       ahoraISO,                           // hora del servidor
//       miCodigoActivo,                     // este dispositivo tiene un código vigente
//       reglas:  { compraMinima, vigenciaDias, diasEntreCodigosPorCelular, regalos[], ventanaReclamoMin },
//       juego:   { ...dificultad que se mezcla encima de config.js, incluye partida.duracionS y partida.frutasMinimas },
//   }
//
//   iniciarPartida()  →  { ok:true, token, intentosRestantes, ahoraISO }  |  { ok:false, motivo, estado }
//       Gasta un intento y entrega un token. La victoria SOLO se acepta con un token válido, tiempo mínimo y frutas mínimas.
//
//   terminarPartida({ token, gano, progreso, frutas })  →  { ok, puedeReclamar, motivo, reservaHastaISO, estado }
//       El servidor NO confía en `gano`: lo verifica. Si es válida, APARTA un premio para esta persona (ventanaReclamoMin).
//       motivo (si no puede reclamar): 'partida-invalida' | 'sin-premios'
//
//   reclamarPremio({ token, nombre, celular, consentimiento })  →
//       { ok:true, codigo, emitidoISO, venceISO, ahoraISO }          (el código es del tipo LAINDIA-7K3Q)
//       { ok:false, motivo }  motivo: 'partida-invalida' | 'sin-premios' | 'consentimiento' | 'datos'
//                                      | 'ya-tienes-codigo' (+ dias, puedeVolverISO: cuándo podrá reclamar otro ese celular;
//                                        el servidor NO devuelve el código que ya tiene ese número)
//       Repetir la llamada con la misma partida devuelve el MISMO código (doble toque / mala señal).
//
//   registrarCanal({ token, fuente, medio, campana })  →  { ok:true, registrado:boolean }
//       Etiquetas UTM del enlace por el que llegó la persona (mostrador, vasos, instagram…). Mejor esfuerzo, una vez por partida.
//
//   miCodigo()  →  { ok:true, hay:false }
//               |  { ok:true, hay:true, codigo, estado:'activo'|'vencido'|'canjeado'|'desactivado',
//                    emitidoISO, venceISO, canjeadoISO, segundosRestantes, puedeVolverISO, ahoraISO }
//
// Para el panel de pruebas existe `api.debug` (solo en la API falsa).
import * as falsa from './api-falsa.js';
import * as supabase from './api-supabase.js';
import { SUPABASE } from './supabase-config.js';

const forzarFalsa = new URLSearchParams(location.search).get('api') === 'falsa';
const hayServidor = Boolean(SUPABASE.url && SUPABASE.clave);

export const api = hayServidor && !forzarFalsa ? supabase : falsa;
