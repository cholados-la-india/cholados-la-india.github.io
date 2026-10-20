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

export const T = {
  nombreJuego: 'Corre por tu cholado', // PROVISIONAL (candidatos: Atrapa tu cholado · Corre por tu cholado · Cholado Run)
  lema: '¡Atrapa tu cholado!',
  negocio: 'Cholados La India',

  personajes: { titulo: 'Elige tu personaje', cholado: 'Choladito', india: 'La India' },

  inicio: {
    jugar: '¡A correr!',
    comoSeJuega: '¿Cómo se juega?',
    miCodigo: 'Ver mi código',
    premios: (n) => (n === 1 ? 'Queda <b>1</b> premio esta semana' : `Quedan <b>${n}</b> premios esta semana`),
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
    premio: (compraMinima) => `Si llegas a la meta ganas un código para reclamar un regalo en el local: un <b>raspao personal</b> o un <b>cholado de 10 oz</b>, con una compra mínima de <b>${pesos(compraMinima)}</b> en productos (el regalo no cuenta).`,
    cerrar: 'Entendido',
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
    nombre: 'Tu nombre',
    celular: 'Tu celular (10 dígitos)',
    consentimiento: 'Autorizo a Cholados La India a guardar mi nombre y celular para entregarme y controlar mi premio (Ley 1581 de 2012).',
    verPolitica: 'Ver política de datos',
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
      texto: (r, c) => `Guardamos tu nombre y tu celular solo para entregarte y controlar tu premio de esta campaña. Responsable: <b>${r}</b>. Para consultar, corregir o borrar tus datos escribe a <b>${c}</b>. <i>(Texto provisional: pendiente de revisión.)</i>`,
    },
  },

  codigo: {
    titulo: 'Tu código',
    vale: (fecha) => `Vale hasta el <b>${fecha}</b>`,
    pasos: (compraMinima) => [
      `Ve al local y muestra este código en caja.`,
      `Compra mínimo <b>${pesos(compraMinima)}</b> en productos (el regalo no cuenta).`,
      `Elige tu regalo: <b>un raspao personal</b> o <b>un cholado de 10 oz</b>.`,
    ],
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
    titulo: '¡Se acabaron los premios!',
    mensaje: (reinicio) => `Esta semana ya se entregaron todos. Vuelve el <b>${reinicio}</b> y atrapa el tuyo.`,
    volver: 'Volver al inicio',
  },

  campanaInactiva: {
    titulo: 'Por ahora no hay campaña',
    mensaje: 'Pronto abrimos una nueva. ¡Síguenos en Instagram para enterarte!',
  },
};

/** Formatea pesos colombianos: 30000 → "$30.000". */
export function pesos(n) {
  return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
