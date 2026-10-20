// textos.js — Todos los textos que ve la gente, en español colombiano. Editar aquí, no en el código.
// (Tono: cercano y alegre, con toques caleños; "tú" para que se entienda en todo el país.)
//
// Datos del local (llenados por el dueño, Fase B). El correo es PÚBLICO a propósito: sale en la política de datos del juego.

export const LOCAL = {
  direccion: 'Cholados La India, Canchas Panamericanas',
  // Las horas llevan espacio duro (\u00a0) para que «p. m.» nunca se parta. (El local abre más horas; esta es la franja para canjear.)
  dias: 'Todos los días',
  horas: 'de 2:00\u00a0p.\u00a0m. a 9:00\u00a0p.\u00a0m.',
  responsableDatos: 'Cholados La India',
  correoContacto: 'choladoslaindia6@gmail.com',
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

  // Celular acostado (el juego es vertical)
  gira: { titulo: 'Gira tu celular', mensaje: 'Este juego se juega con el celular en vertical.' },

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

  // Las condiciones de la promoción. Todo sale de lo que manda el servidor: si el dueño cambia
  // una regla en el panel, este texto cambia solo.
  condiciones: {
    titulo: 'Condiciones de la promoción',
    lista: (r, dia, intentos, premios, frutas) => [
      `Para ganar hay que <b>llegar a la meta</b> recogiendo al menos <b>${frutas} frutas</b>. Tienes <b>${intentos} intentos</b> por semana.`,
      `Cada código da <b>un solo regalo</b>: ${listaRegalos(r.regalos)}. <b>No es acumulable</b>: con una compra de ${pesos(r.compraMinima * 2)} también es un solo regalo.`,
      `Se necesita una compra mínima de <b>${pesos(r.compraMinima)}</b> en productos pagados; el regalo no cuenta.`,
      `El código tiene un <b>plazo máximo de ${r.vigenciaDias} días</b> desde que lo recibes para usarlo (en tu código aparece hasta cuándo); se canjea <b>una sola vez</b> y <b>solo en el local</b> (${LOCAL.direccion}), <b>${LOCAL.dias.toLowerCase()}, ${LOCAL.horas}</b>`, // (sin punto final: la hora ya termina en «p. m.»)
      `Se entrega <b>un código por celular cada ${r.diasEntreCodigosPorCelular} días</b>.`,
      premios ? `Hay <b>${premios} premios por semana</b>; se renuevan los lunes a las 12:00\u00a0a.\u00a0m. (hora de Bogotá). Cuando se acaban, toca esperar al lunes.` : null,
      r.cupoDiario > 0 ? `Además, cada día se reparten como máximo <b>${r.cupoDiario} premios</b>; el cupo del día se renueva a las 12:00\u00a0a.\u00a0m. (hora de Bogotá). Si ya se repartieron hoy, vuelve mañana.` : null,
      textoCampana(r.campana, dia) || 'Por ahora la campaña no tiene fechas anunciadas: puede terminar o cambiar, y lo avisaremos en nuestras redes (@cholados.laindia).',
    ].filter(Boolean),
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
    sonido: 'Sonido',
    sonidoSi: 'Sonido: sí',
    sonidoNo: 'Sonido: no',
  },

  ganaste: {
    titulo: '¡Lo lograste!',
    subtitulo: 'Atrapaste tu cholado.',
    // Ojo: no hablar de plazos (la gente podría creer que el código dura solo unos minutos): solo decir que falta un paso.
    ventana: () => 'Solo falta un paso: <b>llena tus datos para activar tu código</b>.',
    nombre: 'Tu nombre',
    celular: 'Tu celular (10 dígitos)',
    consentimiento: 'Autorizo a Cholados La India a guardar mi nombre y celular para entregarme y controlar mi premio (Ley 1581 de 2012).',
    verPolitica: 'Ver política de datos',
    resumen: (r) => `Tienes un plazo máximo de <b>${r.vigenciaDias} días</b> para usar tu código (una sola vez) · un regalo por código, <b>no acumulable</b> · compra mínima de <b>${pesos(r.compraMinima)}</b>.`,
    verCondiciones: 'Ver condiciones',
    boton: 'Activar mi código',
    enviando: 'Activando...',
    errores: {
      nombre: 'Escribe tu nombre.',
      celular: 'Escribe un celular colombiano de 10 dígitos (empieza por 3).',
      datos: 'Revisa tu nombre y tu celular (10 dígitos que empiezan por 3).',
      consentimiento: 'Necesitamos tu autorización para guardar tus datos.',
      sinPremios: 'Uy, justo se acabaron los premios. ¡Vuelve pronto!',
      sinConexionGano: '¡Llegaste a la meta! Pero no pudimos confirmarlo por la conexión. No lo perdiste: toca «Reintentar» cuando tengas internet y te devolvemos tu premio.',
      partidaInvalida: 'No pudimos validar tu partida. Intenta jugar de nuevo.',
      yaTienesCodigo: 'Este celular ya reclamó un código.',
      generico: 'No pudimos reclamar el premio. Intenta de nuevo.',
    },
    politica: {
      titulo: 'Política de datos',
      texto: (r, c) => `Guardamos tu nombre y tu celular solo para entregarte y controlar tu premio de esta campaña (incluye evitar que un mismo número reclame varias veces). Se almacenan en un servicio en la nube (Supabase, fuera de Colombia). <b>Los conservamos hasta 6 meses después de que termine la campaña y luego los borramos.</b> También guardamos, sin identificarte, desde qué enlace llegaste (por ejemplo, el QR del mostrador) para saber qué publicidad funciona. Responsable: <b>${r}</b>. <b>Si quieres que consultemos, corrijamos o borremos tus datos, escríbenos a ${c}</b> con tu nombre y tu celular y lo hacemos.`,
    },
  },

  codigo: {
    titulo: 'Tu código',
    vale: (fecha) => `Vale hasta el <b>${fecha}</b>`,
    restante: 'Te quedan',
    vencido: (fecha) => `Este código <b>venció</b> (valía hasta el ${fecha}). Los códigos vencidos no se reactivan.`,
    canjeado: (fecha) => `Este código ya fue <b>canjeado</b> el ${fecha}`, // (sin punto final: la hora ya termina en «a. m.»),
    desactivado: 'Este código fue <b>desactivado</b>.',
    otroCupon: (cuando) => `Podrás reclamar otro cupón a partir del <b>${cuando}</b>`, // (sin punto final: la hora ya termina en «a. m.»),
    pasos: (compraMinima, regalos) => [
      `Ve al local y muestra este código en caja.`,
      `Compra mínimo <b>${pesos(compraMinima)}</b> en productos (el regalo no cuenta).`,
      `Elige tu regalo: ${listaRegalos(regalos)}.`,
      `Un regalo por código: <b>no es acumulable</b> (con ${pesos(compraMinima * 2)} tampoco te dan dos).`,
    ],
    condiciones: 'Ver condiciones',
    canjeaAqui: 'Canjéalo aquí',
    copiar: 'Copiar código',
    copiado: '¡Copiado!',
    consejo: 'Tómale una captura de pantalla para no perderlo.',
    prueba: 'Código de PRUEBA: no sirve en caja.',
    volver: 'Volver al inicio',
  },

  // Ganó, cerró o recargó la página antes de reclamar y vuelve a entrar
  premioPendiente: {
    titulo: '¡Tu premio te espera!',
    mensaje: 'Llegaste a la meta hace poco y no alcanzaste a activar tu código. Si todavía queda un premio, es tuyo.',
    boton: 'Activar mi código',
    luego: 'Ahora no',
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
