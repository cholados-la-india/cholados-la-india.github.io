// textos.js — Todos los textos que ve la gente, en español colombiano. Editar aquí, no en el código.
// (Tono: cercano y alegre, con toques caleños; "tú" para que se entienda en todo el país.)
//
// VOCABULARIO (revisión de noviembre de 2026; usarlo igual en todo texto nuevo para no confundir a nadie):
//   · PREMIO = lo que hay en el banco de la semana («Quedan 50 premios»).
//   · CÓDIGO = lo que recibe quien gana y muestra en caja (LAINDIA-XXXX). Nunca «cupón».
//   · REGALO = el producto que se lleva (raspao o cholado).
//   · En el juego el código se ACTIVA (formulario); en el local se CANJEA.
//   · «celular» (no «número»), «promo» de cara al cliente (no «campaña»), «mínimo» (no «al menos»).
//
// Datos del local (llenados por el dueño, Fase B). El correo es PÚBLICO a propósito: sale en la política de datos del juego.

export const LOCAL = {
  direccion: 'Cholados La India, Canchas Panamericanas',
  // Las horas llevan espacio duro (\u00a0) para que «p. m.» nunca se parta. (El local abre más horas; esta es la franja para canjear.)
  dias: 'Todos los días',
  horas: 'de 2:00\u00a0p.\u00a0m. a 9:00\u00a0p.\u00a0m.',
  responsableDatos: 'Cholados La India',
  correoContacto: 'choladoslaindia6@gmail.com',
  instagram: 'cholados.laindia', // sin @: el enlace se arma solo
  // Enlace de Google Maps del local para el botón «Cómo llegar» del código. Mientras esté en null, el botón no sale.
  // [ENLACE DE GOOGLE MAPS]: lo pone el dueño (Google Maps → el local → Compartir → Copiar enlace).
  mapa: null,
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
  if (ini && fin) return `Promo válida del <b>${dia(ini)}</b> al <b>${dia(fin)}</b>`;
  if (fin) return `Promo válida hasta el <b>${dia(fin)}</b>`;
  if (ini) return `Promo válida desde el <b>${dia(ini)}</b>`;
  return '';
}

export const T = {
  nombreJuego: 'Corre por tu cholado', // PROVISIONAL (candidatos: Atrapa tu cholado · Corre por tu cholado · Cholado Run)
  negocio: 'Cholados La India',

  // Celular acostado (el juego es vertical)
  gira: { titulo: 'Gira tu celular', mensaje: 'Este juego es en vertical: pon el celular derecho.' },

  personajes: { titulo: 'Elige tu personaje', cholado: 'Choladito', india: 'La India' },

  inicio: {
    jugar: '¡A correr!',
    comoSeJuega: '¿Cómo se juega?',
    miCodigo: 'Ver mi código',
    condiciones: 'Ver condiciones',
    // Lo primero que ve un desconocido: QUÉ se gana y que es con compra (antes solo salía en la ayuda o al ganar)
    gancho: (regalos) => `Llega a la meta y gánate ${listaRegalos(regalos)}`,
    ganchoCompra: (compraMinima) => `con tu compra desde ${pesos(compraMinima)}`,
    premios: (n, porDia = false) => {
      const cuando = porDia ? 'hoy' : 'esta semana'; // «hoy» cuando manda el cupo diario
      return n === 1 ? `Queda <b>1</b> premio ${cuando}` : `Quedan <b>${n}</b> premios ${cuando}`;
    },
    intentos: (n) => (n === 1 ? 'Te queda <b>1</b> intento esta semana' : `Te quedan <b>${n}</b> intentos esta semana`),
    cargando: 'Cargando…',
    errorConexion: '¡Uy! No hay conexión. Revisa tu internet y vuelve a intentar.',
    errorGuardar: 'Algo falló al guardar tu partida. Vuelve a intentar.',
    reintentar: 'Reintentar',
  },

  ayuda: {
    titulo: '¿Cómo se juega?',
    pasos: (frutasMinimas, vidas) => [
      '<b>Desliza a los lados</b> para cambiar de carril. Cada deslizada te mueve un carril.',
      '<b>Desliza hacia arriba</b> (o toca la pantalla) para saltar.',
      'Esquiva las cajas y salta las barras. Las <b>pilas altas</b> no se saltan: ¡esquívalas!',
      `Recoge mínimo <b>${frutasMinimas} frutas</b> y aguanta hasta la meta (1 minuto). Tienes <b>${vidas} vidas</b>: cada choque te quita una.`,
    ],
    premio: (compraMinima, regalos) => `Si ganas, recibes un <b>código</b> para canjear en el local por ${listaRegalos(regalos)}, con una compra mínima de <b>${pesos(compraMinima)}</b> en productos (el regalo no cuenta). Un regalo por código: <b>no es acumulable</b>.`,
    cerrar: 'Entendido',
  },

  // Las condiciones de la promoción. Todo sale de lo que manda el servidor: si el dueño cambia
  // una regla en el panel, este texto cambia solo.
  condiciones: {
    titulo: 'Condiciones de la promoción',
    lista: (r, dia, intentos, premios, frutas) => [
      `Ganas si <b>llegas a la meta</b> con mínimo <b>${frutas} frutas</b>. Tienes <b>${intentos} intentos</b> por semana.`,
      `Cada código da <b>un solo regalo</b>: ${listaRegalos(r.regalos)}. <b>No es acumulable</b>: con una compra de ${pesos(r.compraMinima * 2)} también es un solo regalo.`,
      `Se necesita una compra mínima de <b>${pesos(r.compraMinima)}</b> en productos pagados; el regalo no cuenta.`,
      `El código tiene un <b>plazo máximo de ${r.vigenciaDias} días</b> desde que lo recibes (en tu código aparece hasta cuándo) y se canjea <b>una sola vez</b>.`,
      `Solo se canjea en el local: ${LOCAL.direccion}, <b>${LOCAL.dias.toLowerCase()}, ${LOCAL.horas}</b>`, // (sin punto final: la hora ya termina en «p. m.»)
      `Se entrega <b>un código por celular cada ${r.diasEntreCodigosPorCelular} días</b>.`,
      premios ? `Hay <b>${premios} premios por semana</b>; se renuevan cada lunes a la medianoche (apenas empieza el lunes). Cuando se acaban, toca esperar al lunes.` : null,
      r.cupoDiario > 0 ? `Además, cada día se entregan máximo <b>${r.cupoDiario} premios</b>; el cupo del día se renueva a la medianoche. Si ya se entregaron los de hoy, vuelve mañana.` : null,
      textoCampana(r.campana, dia) || `La promo todavía no tiene fecha de cierre: puede cambiar o terminar, y lo avisamos en Instagram (@${LOCAL.instagram}).`,
    ].filter(Boolean),
    cerrar: 'Entendido',
  },

  limiteRed: {
    partidas: 'Hay muchísima gente jugando ahora mismo. Espera un ratico y vuelve a intentar.',
    codigos: 'Desde esta conexión ya se activaron muchos códigos hoy. Intenta mañana o cambia de wifi a datos.',
  },

  juego: {
    cuenta: ['3', '2', '1', '¡Corre!'],
    pausa: 'Pausa',
    continuar: 'Seguir jugando',
    salir: 'Salir al inicio',
    salirAviso: 'Si sales, pierdes este intento.',
    meta: '¡META!',
    sonido: 'Sonido',
    sonidoSi: 'Sonido: encendido',
    sonidoNo: 'Sonido: apagado',
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
    enviando: 'Activando…',
    errores: {
      nombre: 'Escribe tu nombre.',
      celular: 'Escribe tu celular: 10 dígitos, empieza por 3.',
      datos: 'Revisa tu nombre y tu celular (10 dígitos, empieza por 3).',
      consentimiento: 'Marca la casilla de autorización para poder darte tu código.',
      sinPremios: 'Uy, justo se acabaron los premios. Toca «Reintentar» para ver cuándo vuelven.',
      sinConexionGano: '¡Llegaste a la meta! Se cayó la conexión antes de confirmarlo. Tranqui, no se perdió: cuando tengas internet, toca «Reintentar».',
      partidaInvalida: 'Algo falló al confirmar tu partida. Juega otra vez.',
      generico: 'No pudimos activar tu código. Revisa tu internet y toca otra vez.',
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
    vencioAhora: 'Tu código acaba de <b>vencer</b>.',
    canjeado: (fecha) => `Ya canjeaste este código el ${fecha}`, // (sin punto final: la hora ya termina en «a. m.»)
    desactivado: 'Este código está <b>desactivado</b>. Si crees que es un error, pregunta en el local.',
    otroCodigo: (cuando) => `Puedes ganarte otro código desde el <b>${cuando}</b>`, // (sin punto final: la hora ya termina en «a. m.»)
    pasos: (compraMinima, regalos) => [
      'Ve al local y muestra este código en la caja.',
      `Compra mínimo <b>${pesos(compraMinima)}</b> en productos (el regalo no cuenta).`,
      `Elige tu regalo: ${listaRegalos(regalos)}.`,
    ],
    // Antes era un «paso 4», pero es una condición, no algo que la persona tenga que hacer
    noAcumulable: (compraMinima) => `Un regalo por código: <b>no es acumulable</b> (aunque compres ${pesos(compraMinima * 2)}, es un solo regalo).`,
    comoLlegar: 'Cómo llegar',
    condiciones: 'Ver condiciones',
    canjeaAqui: 'Canjéalo aquí',
    copiar: 'Copiar código',
    copiado: '¡Copiado!',
    consejo: '¡Tómale captura para no perderlo!',
    // El botón atrás del celular (o cerrar Instagram) se lleva la pantalla, pero el código queda guardado en el servidor
    siCierras: 'Si cierras esta página, vuelve a abrir el juego en este mismo celular y toca «Ver mi código».',
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
    // El título va según qué tan lejos llegó (antes salía al azar: «¡Uy, casi!» con un 8 % no tenía sentido)
    titulo: (progreso) => (progreso < 0.5 ? '¡Pilas con las cajas!' : progreso < 0.8 ? '¡Uy, casi!' : '¡Ay, por poquito!'),
    mensaje: (progreso) => `Llegaste al <b>${progreso}\u00a0%</b> del camino.`,
    frutas: (n) => (n === 1 ? '1 fruta' : `${n} frutas`),
    intentos: (n) => (n === 0 ? 'Ese era tu último intento de la semana. ¡El lunes tienes más!' : n === 1 ? 'Te queda <b>1</b> intento esta semana.' : `Te quedan <b>${n}</b> intentos esta semana.`),
    quedanPremios: (n) => (n === 1 ? 'Todavía queda <b>1</b> premio esta semana.' : `Todavía quedan <b>${n}</b> premios esta semana.`),
    otraVez: 'Intentar de nuevo',
    salir: 'Volver al inicio',
    // Llegó a la meta pero sin las frutas mínimas
    tituloFrutas: '¡Te faltaron frutas!',
    mensajeFrutas: (frutas, minimo) => `Llegaste a la meta, pero con <b>${frutas} frutas</b>. Para ganar necesitas <b>${minimo}</b>.`,
    frutasDe: (n, minimo) => `${n} de ${minimo} frutas`,
  },

  yaTienesCupon: {
    titulo: '¡Este celular ya tiene un código!',
    mensaje: (dias, cuando) => `Damos <b>un código por celular cada ${dias} días</b>, para que alcance para más gente. Puedes ganarte otro desde el <b>${cuando}</b>`,
    // (Por privacidad NO se muestra el código que ya tiene ese número: solo quien lo reclamó lo ve, en su navegador.)
    otroNumero: 'Me equivoqué de celular',
    volver: 'Volver al inicio',
  },

  sinIntentos: {
    titulo: '¡Se acabaron tus intentos!',
    mensaje: (reinicio) => `Ya jugaste los de esta semana. El <b>${reinicio}</b> tienes más. ¡Aquí te esperamos!`,
  },

  sinPremios: {
    tituloGanaste: '¡Llegaste, pero ya no quedan premios!',
    mensajeGanaste: (reinicio) => `Otra persona se llevó el último premio justo antes que tú. Vuelve el <b>${reinicio}</b> y atrapa el tuyo.`,
    titulo: '¡Se acabaron los premios!',
    mensaje: (reinicio) => `Esta semana ya se entregaron todos. Vuelve el <b>${reinicio}</b> y atrapa el tuyo.`,
    // Cuando lo que se agotó fue el cupo DIARIO (la semana todavía tiene premios)
    tituloDia: '¡Se acabaron los premios de hoy!',
    mensajeDia: (reinicio) => `Ya se entregaron todos los de hoy. Vuelve el <b>${reinicio}</b> y atrapa el tuyo.`,
    volver: 'Volver al inicio',
  },

  campanaInactiva: {
    titulo: 'Por ahora no hay promo',
    mensaje: 'Pronto vuelve. ¡Síguenos en Instagram para enterarte!',
    empieza: (dia) => `La próxima promo empieza el <b>${dia}</b>.`,
    termino: (dia) => `La última promo terminó el <b>${dia}</b>.`,
  },

  // Para volver y para invitar (pantallas finales y el código)
  redes: {
    instagram: () => `Síguenos: @${LOCAL.instagram}`,
    retar: 'Reta a un amigo',
    // Lo que se manda al compartir (WhatsApp, Instagram…). `progreso` en % o null si ganó.
    mensajeRetar: (progreso) => (progreso == null
      ? '¡Me gané un regalo en el juego de Cholados La India! ¿Te le mides? Si llegas a la meta, te ganas uno tú también.'
      : `Llegué al ${progreso}\u00a0% en el juego de Cholados La India. ¿Me ganas? Si llegas a la meta, te ganas un regalo.`),
    copiadoEnlace: 'Enlace copiado: pégalo en WhatsApp.',
  },
};

/** Formatea pesos colombianos: 30000 → "$30.000". */
export function pesos(n) {
  return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
