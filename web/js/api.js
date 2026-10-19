// api.js — La ÚNICA puerta entre el juego y el "servidor". Todo el juego habla con `api`, nunca con la implementación.
//
// Ahora (Etapa 3) `api` es una simulación local (api-falsa.js) que imita al servidor real.
// En la Etapa 4 se crea `api-supabase.js` con las MISMAS funciones y aquí solo se cambia la línea de abajo.
//
// Contrato (todas devuelven una promesa; las fechas viajan como texto ISO en UTC; el reloj lo pone el servidor):
//
//   configurar(cfg)
//       Solo en la API falsa: le pasa la config viva (reglas) para poder tocarla desde ?debug=1.
//
//   obtenerEstado()  →  {
//       jugable, motivo,                    motivo: null | 'sin-intentos' | 'sin-premios' | 'campana-inactiva'
//       premiosRestantes, premiosPorSemana, // "Quedan X premios esta semana"
//       intentosRestantes, intentosPorSemana,
//       reiniciaEnISO,                      // próximo lunes 00:00 hora de Bogotá
//   }
//
//   iniciarPartida()  →  { ok:true, token, intentosRestantes }  |  { ok:false, motivo }
//       Gasta un intento y entrega un token. La victoria SOLO se acepta con un token válido y un tiempo jugado mínimo.
//
//   terminarPartida({ token, gano, progreso, frutas })  →  { ok, puedeReclamar, estado }
//       Registra cómo terminó. El servidor NO confía en `gano`: lo verifica con el token y el tiempo.
//
//   reclamarPremio({ token, nombre, celular, consentimiento })  →
//       { ok:true, codigo, emitidoISO, venceISO, esDePrueba }
//       { ok:false, motivo }  motivo: 'partida-invalida' | 'sin-premios' | 'consentimiento' | 'datos'
//                                      | 'ya-tienes-codigo' (+ codigo, venceISO)
//
// Para el panel de pruebas existe `api.debug` (solo en la API falsa).
import * as falsa from './api-falsa.js';

export const api = falsa;
