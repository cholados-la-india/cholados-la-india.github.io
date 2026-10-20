// config.js — TODA la configuración del juego en un solo lugar (nada de esto está "quemado" en el resto del código).
//
// Estructura:
//   · dificultad (partida, velocidad, salto, obstaculos, frutas, jugador, controles): lo que calibras con ?debug=1.
//   · reglas del negocio (reglas): lo que en producción decide el servidor; la API falsa de esta etapa las imita.
//   · rendimiento y desarrollo.
//
// Cómo calibrar: abre el juego con ?debug=1, mueve los deslizadores (se aplican en vivo), juega, mira las
// estadísticas y, cuando te guste, pulsa "Copiar config" y pega aquí los valores nuevos.
//
// Unidades: distancias en "unidades" del mundo (un carril mide 1,2; el choladito ~1,3 de alto); tiempos en segundos.

export const CONFIG = {
  /* ───────────── Partida ───────────── */
  partida: {
    duracionS: 60, // duración de la partida; la meta aparece al terminar este tiempo
    vidas: 3, // choques que aguanta antes de perder
    frutasMinimas: 25, // para ganar NO basta llegar a la meta: hay que haber recogido al menos tantas frutas (salen ~70 por partida; 0 = no se exige)
    cuentaAtrasS: 3, // 3, 2, 1... ¡a correr!
    invulnerabilidadS: 1.3, // tras un choque no te pueden quitar otra vida durante este tiempo
    toleranciaColision: 0.18, // 0 = hitbox exacta · 0.18 = se perdona un 18 % del borde · 0.4 = muy permisivo
    celebracionS: 1.4, // lo que se queda corriendo y festejando tras cruzar la meta, antes de la pantalla "ganaste"
  },

  /* ───────────── Velocidad del mundo (unidades por segundo) ───────────── */
  velocidad: {
    inicial: 9.5,
    final: 14.5, // sube linealmente de la inicial a la final durante la partida (era 9 → 13,5; se subió un poco)
    multiplicador: 1, // multiplica ambas (para probar rápido con el deslizador de debug)
  },

  /* ───────────── Carriles y salto ───────────── */
  carriles: {
    ancho: 1.2, // distancia entre el centro de un carril y el siguiente
    cambioS: 0.13, // lo que tarda en pasar de un carril al de al lado
  },
  salto: {
    alto: 1.35, // altura máxima del salto
    duracionS: 0.62, // tiempo en el aire
    bufferS: 0.12, // si tocas "saltar" justo antes de aterrizar, el salto se guarda y sale al tocar el piso
  },

  /* ───────────── Jugador (cuerpo para choques) ───────────── */
  jugador: {
    radioX: 0.4, // media anchura
    radioFondo: 0.35, // media profundidad (hacia adelante)
  },

  /* ───────────── Obstáculos ───────────── */
  obstaculos: {
    primerObstaculoS: 3.0, // no sale ningún obstáculo antes de este segundo
    sinObstaculosAlFinalS: 2.2, // los últimos segundos hasta la meta van despejados
    separacionInicialS: 1.5, // segundos entre filas de obstáculos al empezar (más = más fácil)
    separacionFinalS: 0.95, // ...y al terminar la partida (baja linealmente)
    variacion: 0.22, // aleatoriedad de la separación (0.22 = ±22 %)
    separacionMinimaS: 0.75, // nunca menos que esto entre dos filas
    segundosPorCarril: 0.5, // tiempo que se supone que tarda una persona en cambiar de carril (para garantizar que siempre se puede pasar)
    // Peso de cada tipo (probabilidad relativa; 0 lo desactiva).
    tipos: {
      cajaBaja: { peso: 4, ancho: 0.95, alto: 0.85, fondo: 0.8 }, // un carril; se salta o se esquiva
      pilaAlta: { peso: 3, ancho: 0.95, alto: 2.0, fondo: 0.8 }, // un carril; NO se salta, se esquiva
      barraBaja: { peso: 1.4, ancho: 3.6, alto: 0.6, fondo: 0.55 }, // atraviesa los 3 carriles; se salta
      doble: { peso: 3, ancho: 0.95, alto: 0, fondo: 0.8 }, // dos obstáculos a la vez (cajas o pilas) dejando un carril libre
    },
    horizonte: 74, // hasta qué distancia por delante se generan y se dibujan
  },

  /* ───────────── Frutas (opcionales: no afectan la meta) ───────────── */
  frutas: {
    cadaS: 2.6, // cada cuántos segundos aparece una hilera de frutas
    largoMin: 3,
    largoMax: 6,
    separacion: 1.25, // distancia entre frutas de una misma hilera
    sobreCajasBajas: true, // si una hilera cruza una caja baja, sube en arco (hay que saltar para cogerlas)
    probMango: 0.4, // el resto son fresas
  },

  /* ───────────── Controles ───────────── */
  controles: {
    umbralPx: 26, // cuántos píxeles hay que deslizar para que cuente como gesto
    toqueSalta: true, // un toque (sin deslizar) también salta
    toqueMaxMs: 280, // duración máxima de un "toque"
  },

  /* ───────────── Reglas del negocio (las decide el servidor real; la API falsa las imita) ───────────── */
  reglas: {
    intentosPorSemana: 3,
    premiosPorSemana: 50,
    vigenciaDias: 7, // el código vale 7 días desde su hora de expedición, menos 1 minuto
    compraMinima: 30000, // pesos colombianos
    minimoJugadoParaGanarS: 45, // el servidor no acepta un premio si la partida duró menos que esto (frena scripts)
    diasEntreCodigosPorCelular: 7,
    regalos: ['Un raspao personal', 'Un cholado de 10 oz'],
    campana: { inicioISO: null, finISO: null }, // [FECHA INICIO] [FECHA FIN] — aún sin definir (null = siempre activa)
  },

  /* ───────────── Rendimiento ───────────── */
  rendimiento: {
    pixelRatioMax: 1.5,
    adaptativo: true, // si el celular no sostiene los FPS, baja la resolución y luego quita el contorno
    fpsMinimo: 50, // por debajo de esto (promediado) se baja un nivel de calidad
  },

  /* ───────────── Solo para desarrollo ───────────── */
  desarrollo: {
    // (El selector Choladito / La India ya es permanente: cada cliente elige su personaje.)
    personajeInicial: 'india', // con quién arranca quien entra por primera vez: 'india' | 'cholado'
    latenciaApiMs: [120, 320], // la API falsa simula esta demora
    invencible: false, // para probar el recorrido sin perder vidas (también se activa desde ?debug=1)
    autoPausa: true, // pausar solo al salir de la pestaña/app (dejarlo en true; solo se apaga para pruebas automáticas)
  },
};
