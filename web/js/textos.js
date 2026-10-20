// textos.js — Todos los textos que ve la gente, en español colombiano. Editar aquí, no en el código.
// (Tono: cercano y alegre, con toques caleños; "tú" para que se entienda en todo el país.)
//
// Placeholders pendientes (ver pendientes.md): [DIRECCIÓN DEL LOCAL], [HORARIO DE CAJA], [RESPONSABLE DE DATOS], [CORREO DE CONTACTO].

export const LOCAL = {
  direccion: '[DIRECCIÓN DEL LOCAL]',
  horario: '[HORARIO DE CAJA]',
  responsableDatos: '[RESPONSABLE DE DATOS]',
  correoContacto: '[CORREO DE CONTACTO]',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** ["Un raspao personal", "Un cholado de 10 oz"] → "<b>un raspao personal</b> o <b>un cholado de 10 oz</b>" (los regalos los define el dueño en el panel). */
export function listaRegalos(regalos) {
  const nombres = (regalos?.length ? regalos : ['un regalo']).map((r) => `<b>${esc(r.charAt(0).toLowerCase() + r.slice(1))}</b>`);
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} o ${nombres[nombres.length - 1]}`;
}

/** La temporada, en una frase corta, según las fechas que mande el servidor ('' si no hay fechas). `dia` = (ms) => "26 de octubre". */
export function textoCampana(campana, dia) {
  const ini = campana?.inicioISO ? Date.parse(campana.inicioISO) : null;
  const fin = campana?.finISO ? Date.parse(campana.finISO) : null;
  if (ini && fin) return `Campaña: del <b>${dia(ini)}</b> al <b>${dia(fin)}</b>`;
  if (fin) return `Campaña: hasta el <b>${dia(fin)}</b>`;
  if (ini) return `Campaña: desde el <b>${dia(ini)}</b>`;
  return '';
}

export const T = {
  nombreJuego: 'Corre por tu cholado', // PROVISIONAL (candidatos: Atrapa tu cholado · Corre por tu cholado · Cholado Run)
  lema: '¡Atrapa tu cholado!',
  negocio: 'Cholados La India',

  personajes: { titulo: 'Elige tu personaje', cholado: 'Choladito', india: 'La India' },

  inicio: {
    jugar: '¡A correr!',
    comoSeJuega: '¿Cómo se juega?',
    miCodigo: 'Ver mi código',
    condiciones: 'Condiciones',
    premios: (n, porDia = false) => {
      const cuando = porDia ? 'hoy' : 'esta semana'; // «hoy» cuando manda el cupo diario
      return n === 1 ? `Queda <b>1</b> premio ${cuando}` : `Quedan <b>${n}</b> premios ${cuando}`;
    },
    intentos: (n, max) => (n === 1 ? `Te queda <b>1</b> intento de ${max}` : `Te quedan <b>${n}</b> intentos de ${max}`),
    cargando: 'Cargando...',
    errorConexion: 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.',
    reintentar: 'Reintentar',
  },

  ayuda: {
    titulo: '¿Cómo se juega?',
    pasos: (frutasMinimas, vidas) => [
      '<b>Desliza a los lados</b> para cambiar de carril (un deslizamiento = un carril).',
      '<b>Desliza hacia arriba</b> (o toca la pantalla) para saltar.',
      'Esquiva las cajas y salta las barras. Las <b>pilas altas</b> no se saltan: ¡esquívalas!',
      `Recoge al menos <b>${frutasMinimas} frutas</b> por el camino y llega a tu cholado antes de que se acabe el tiempo. Tienes <b>${vidas} vidas</b>.`,
    ],
    premio: (compraMinima, regalos) => `Si llegas a la meta ganas un código para reclamar un regalo en el local: ${listaRegalos(regalos)}, con una compra mínima de <b>${pesos(compraMinima)}</b> en productos (el regalo no cuenta). Un regalo por código: <b>no es acumulable</b>.`,
    cerrar: 'Entendido',
  },

  // Las condiciones de la promoción (provisionales hasta la Etapa 7). Todo sale de lo que manda el servidor: si el dueño cambia
  // una regla en el panel, este texto cambia solo.
  condiciones: {
    titulo: 'Condiciones de la promoción',
    lista: (r, dia, intentos, premios, frutas) => [
      `Para ganar hay que <b>llegar a la meta</b> recogiendo al menos <b>${frutas} frutas</b>. Tienes <b>${intentos} intentos</b> por semana.`,
      `Cada código da <b>un solo regalo</b>: ${listaRegalos(r.regalos)}. <b>No es acumulable</b>: con una compra de ${pesos(r.compraMinima * 2)} también es un solo regalo.`,
      `Se necesita una compra mínima de <b>${pesos(r.compraMinima)}</b> en productos pagados; el regalo no cuenta.`,
      `El código vale <b>${r.vigenciaDias} días</b> desde que lo recibes (en tu código aparece hasta cuándo), se canjea <b>una sola vez</b> y <b>solo en el local</b>.`,
      `Se entrega <b>un código por celular cada ${r.diasEntreCodigosPorCelular} días</b>.`,
      premios ? `Hay <b>${premios} premios por semana</b>; se renuevan los lunes a las 12:00 a. m. (hora de Bogotá). Cuando se acaban, toca esperar al lunes.` : null,
      r.cupoDiario > 0 ? `Además, cada día se reparten como máximo <b>${r.cupoDiario} premios</b>; el cupo del día se renueva a las 12:00 a. m. (hora de Bogotá). Si ya se repartieron hoy, vuelve mañana.` : null,
      textoCampana(r.campana, dia) || 'Por ahora la campaña no tiene fechas anunciadas: puede terminar o cambiar, y lo avisaremos en nuestras redes (@cholados.laindia).',
    ].filter(Boolean),
    provisional: '<i>Condiciones provisionales: el texto definitivo se publicará antes del lanzamiento.</i>',
    cerrar: 'Entendido',
  },

  limiteRed: {
    partidas: 'Hay muchas partidas desde tu red ahora mismo. Espera un rato e intenta de nuevo.',
    codigos: 'Desde tu red ya se reclamaron muchos premios hoy. Intenta más tarde o desde otra red.',
  },

  juego: {
    cuenta: ['3', '2', '1', '¡Corre!'],
    pausa: 'Pausa',
    continuar: 'Seguir jugando',
    salir: 'Salir al inicio',
    meta: '¡META!',
  },

  ganaste: {
    titulo: '¡Lo lograste!',
    subtitulo: 'Atrapaste tu cholado. Ahora solo falta reclamar tu premio.',
    ventana: (min) => `Tu premio está apartado por <b>${min} minutos</b>: llena tus datos y ¡listo!`,
    nombre: 'Tu nombre',
    celular: 'Tu celular (10 dígitos)',
    consentimiento: 'Autorizo a Cholados La India a guardar mi nombre y celular para entregarme y controlar mi premio (Ley 1581 de 2012).',
    verPolitica: 'Ver política de datos',
    resumen: (r) => `Tu código vale <b>${r.vigenciaDias} días</b> · un regalo por código, <b>no acumulable</b> · compra mínima de <b>${pesos(r.compraMinima)}</b>.`,
    verCondiciones: 'Ver condiciones',
    boton: 'Reclamar mi premio',
    enviando: 'Reclamando...',
    errores: {
      nombre: 'Escribe tu nombre.',
      celular: 'Escribe un celular colombiano de 10 dígitos (empieza por 3).',
      consentimiento: 'Necesitamos tu autorización para guardar tus datos.',
      sinPremios: 'Uy, justo se acabaron los premios de esta semana. ¡Vuelve el lunes!',
      partidaInvalida: 'No pudimos validar tu partida. Intenta jugar de nuevo.',
      yaTienesCodigo: 'Este celular ya reclamó un código.',
      generico: 'No pudimos reclamar el premio. Intenta de nuevo.',
    },
    politica: {
      titulo: 'Política de datos',
      texto: (r, c) => `Guardamos tu nombre y tu celular solo para entregarte y controlar tu premio de esta campaña (incluye evitar que un mismo número reclame varias veces). Se almacenan en un servicio en la nube (Supabase, fuera de Colombia). Responsable: <b>${r}</b>. Para consultar, corregir o borrar tus datos escribe a <b>${c}</b>. <i>(Texto provisional: pendiente de revisión.)</i>`,
    },
  },

  codigo: {
    titulo: 'Tu código',
    vale: (fecha) => `Vale hasta el <b>${fecha}</b>`,
    restante: 'Te quedan',
    vencido: (fecha) => `Este código <b>venció</b> (valía hasta el ${fecha}). Los códigos vencidos no se reactivan.`,
    canjeado: (fecha) => `Este código ya fue <b>canjeado</b> el ${fecha}.`,
    desactivado: 'Este código fue <b>desactivado</b>.',
    otroCupon: (cuando) => `Podrás reclamar otro cupón a partir del <b>${cuando}</b>.`,
    pasos: (compraMinima, regalos) => [
      `Ve al local y muestra este código en caja.`,
      `Compra mínimo <b>${pesos(compraMinima)}</b> en productos (el regalo no cuenta).`,
      `Elige tu regalo: ${listaRegalos(regalos)}.`,
      `Un regalo por código: <b>no es acumulable</b> (con ${pesos(compraMinima * 2)} tampoco te dan dos).`,
    ],
    condiciones: 'Ver condiciones',
    copiar: 'Copiar código',
    copiado: '¡Copiado!',
    consejo: 'Tómale una captura de pantalla para no perderlo.',
    prueba: 'Código de PRUEBA: no sirve en caja.',
    volver: 'Volver al inicio',
  },

  perdiste: {
    titulos: ['¡Uy, casi!', '¡Ay, por poquito!', '¡Pilas con las cajas!'],
    mensaje: (progreso) => `Llegaste al <b>${progreso} %</b> del camino.`,
    frutas: (n) => (n === 1 ? '1 fruta' : `${n} frutas`),
    intentos: (n) => (n === 1 ? 'Te queda <b>1</b> intento esta semana.' : `Te quedan <b>${n}</b> intentos esta semana.`),
    otraVez: 'Intentar de nuevo',
    salir: 'Volver al inicio',
    // Llegó a la meta pero sin las frutas mínimas
    tituloFrutas: '¡Te faltaron frutas!',
    mensajeFrutas: (frutas, minimo) => `Llegaste a tu cholado, pero recogiste <b>${frutas} de ${minimo}</b> frutas. Necesitas mínimo <b>${minimo}</b> para ganar.`,
  },

  yaTienesCupon: {
    titulo: '¡Este número ya tiene un cupón!',
    mensaje: (dias, cuando) => `Solo se puede reclamar <b>un cupón por número cada ${dias} días</b>, para que más gente conozca el local. Podrás reclamar otro a partir del <b>${cuando}</b>`,
    // (Por privacidad NO se muestra el código que ya tiene ese número: solo quien lo reclamó lo ve, en su navegador.)
    otroNumero: 'Me equivoqué de número',
    volver: 'Volver al inicio',
  },

  sinIntentos: {
    titulo: 'Se acabaron tus intentos',
    mensaje: (reinicio) => `Ya usaste los de esta semana. Se renuevan el <b>${reinicio}</b> (hora de Bogotá).`,
    volver: 'Volver al inicio',
  },

  sinPremios: {
    tituloGanaste: '¡Llegaste, pero se acabaron!',
    mensajeGanaste: (reinicio) => `Otra persona se llevó el último premio justo antes que tú. Vuelve el <b>${reinicio}</b> y atrapa el tuyo.`,
    titulo: '¡Se acabaron los premios!',
    mensaje: (reinicio) => `Esta semana ya se entregaron todos. Vuelve el <b>${reinicio}</b> y atrapa el tuyo.`,
    // Cuando lo que se agotó fue el cupo DIARIO (la semana todavía tiene premios)
    tituloDia: '¡Se acabaron los premios de hoy!',
    mensajeDia: (reinicio) => `Hoy ya se repartieron todos los del día. Vuelve el <b>${reinicio}</b> y atrapa el tuyo.`,
    volver: 'Volver al inicio',
  },

  campanaInactiva: {
    titulo: 'Por ahora no hay campaña',
    mensaje: 'Pronto abrimos una nueva. ¡Síguenos en Instagram para enterarte!',
    empieza: (dia) => `La próxima campaña empieza el <b>${dia}</b>.`,
    termino: (dia) => `La última campaña terminó el <b>${dia}</b>.`,
  },
};

/** Formatea pesos colombianos: 30000 → "$30.000". */
export function pesos(n) {
  return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
