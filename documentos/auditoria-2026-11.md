# Revisión completa de noviembre de 2026 (auditoría)

Fecha: 2026-11-19. Pedida por el usuario: «darle una corrida a todo» antes de abrir al público, **sin cambiar el juego**, solo dejarlo más robusto y pulido. Primero se revisó todo sin tocar nada y se le presentó una lista de 40 propuestas; él aprueba por bloques. Este archivo es la memoria de esa lista: **qué se hizo y qué falta**.

**Cómo se revisó:** cinco lecturas completas en paralelo (núcleo del juego · pantallas, textos y marketing · caja y panel · SQL · herramientas, GitHub y guías), el servidor real por el conector de Supabase (avisos de seguridad y rendimiento, datos, configuración) y las pruebas que no dejan datos. Nada de lo de abajo salió de «suposiciones»: cada punto del bloque A se comprobó en el código antes de arreglarlo.

**Estado del servidor ese día:** despierto; 46 partidas y 9 códigos de prueba (falta la limpieza del paso 6); 11 MB de 500; sin tablas ni funciones abiertas de más.

## Bloque A — Antes de abrir (HECHO el 2026-11-19; falta solo el commit del usuario)

**Servidor:** el 2026-11-19 Claude lo aplicó al servidor real por el conector de Supabase, con el visto bueno del usuario (solo las 8 funciones que cambiaron; se comprobó antes en una base local que el resultado es idéntico a pegar todo `todo-junto.sql`; auditoría «✅ Todo en orden» y `probar-seguridad` 19 ✓ después). El juego nuevo funciona con el servidor viejo y al revés, así que el orden entre el commit y el SQL no importaba.

| # | Qué pasaba | Qué se hizo | Dónde |
|---|---|---|---|
| 1 | La 3.ª vez que salía «¡Tu premio te espera!», el botón borraba el premio en vez de reclamarlo (también con dos fallos de red seguidos) | El tope de 3 avisos solo decide si se MUESTRA el aviso; nunca borra ni impide reclamar. El aviso se cuenta una vez por visita. Un 429/401/403 ya no se toma como «partida inválida» | `web/js/main.js` (`victoriaPendiente`, `avisoContado`, `recuperarVictoria`) |
| 2 | Un programa podía apartar los 50 premios cada 15 min sin reclamar ninguno y dejar a todos en «se acabaron» | Una victoria que llega más de ~2 h después de empezar la partida se rechaza; tope de premios apartados por red y día (= 3 × `limite_codigos_ip_dia`; 0 = apagado) | `0002_funciones.sql` (`terminar_partida`) |
| 3 | Con IPv6 cada dirección contaba como una red distinta: los límites por red no frenaban nada | Las IPv6 se cuentan por bloque /64 (las `::ffff:` se dejan tal cual) | `0002_funciones.sql` (`app.ip_cliente`) |
| 4 | El PIN aceptaba 4 dígitos; con el PIN, se podían probar códigos al azar sin freno | PIN nuevo de 6 a 8 (el viejo sigue sirviendo hasta que se cambie); 20 consultas de códigos inexistentes por red cada 15 min y después bloqueo (el dueño desbloquea) | `0003_staff_admin.sql` (`cambiar_pin`, `canje_frenado`, `canje_anotar`) |
| 5 | `probar-supabase`, `probar-canje` y `probar-ataques --completo` escribían en el servidor real sin preguntar, y la única limpieza era borrar TODO | Exigen `--gasta-premios-reales`; limpieza selectiva `supabase/sql/limpiar_solo_pruebas.sql` (solo nombres `PRUEBA-…`) | `tools/seguro-servidor-real.mjs` y los tres scripts |
| 6 | Pasar entre dos cajas pegadas de una fila doble quitaba 2 vidas | La invulnerabilidad se mira en cada obstáculo | `web/js/game/logica.js` (`colisiones`) |
| 7 | «¡A correr!» no daba señal de carga y los otros botones seguían vivos: se podía gastar un intento con la partida corriendo debajo de otra pantalla | El botón queda en «Cargando…», los demás botones no responden mientras tanto, y las respuestas viejas no pintan encima (`navegacion`) | `web/js/main.js` |
| 8 | Si el servidor decía «sin premios» o «partida inválida», el formulario de ganador quedaba sin salida | Se va a la pantalla que corresponde; el formulario tiene «Ahora no»; «¡Llegaste, pero se acabaron!» tiene «Volver al inicio» | `web/js/main.js`, `web/js/ui/ui.js` |
| 9 | Caja: si se caía el internet al confirmar, salía «SIN CONEXIÓN» y luego «YA FUE CANJEADO» (riesgo de negarle el regalo a un cliente) | Panel «NO SABEMOS SI QUEDÓ CANJEADO» con «Verificar otra vez»; «YA FUE CANJEADO» dice «hace un momento / hace N min» | `web/js/panel/canje-ui.js` |
| 10 | El botón de desbloquear no aparecía en el bloqueo más común (el de la red de la caja) | «Desbloquear la caja» está siempre en panel → Cuenta | `web/admin/vista-cuenta.js` |
| 11 | Una falla de wifi al renovar la sesión sacaba al dueño del panel y borraba «mantener sesión» | La sesión solo se borra si el servidor la rechaza (400/401/403) | `web/js/panel/auth.js` |
| 12 | El aviso diario a Supabase se apagaría solo ~el 2026-12-19 (60 días sin commits) | La tarea se reactiva a sí misma cada día (GitHub no lo garantiza: mirar Actions de vez en cuando) | `.github/workflows/mantener-supabase-despierto.yml` |

Pruebas tras los cambios: `probar-sql` **300 ✓** (20 nuevas, sección 26 y 21b), `probar-canal` 18 ✓, `probar-mutaciones` todas detectadas, `revisar-secretos` limpio, `probar-seguridad` 19 ✓ (servidor real, solo lectura); el simulador da lo mismo de antes (Novato 0,5 % · Normal 5,7 % · Experto 44,7 %). En la demo (`?api=falsa`) se recorrió: botón «Cargando…», formulario con «Ahora no», premio pendiente reclamado con 3 avisos, panel → Cuenta → «Desbloquear la caja», caja con código válido y ya canjeado.

**No verificado:** el aviso diario reactivándose (solo se sabrá con el tiempo); los límites nuevos del servidor contra el servidor real con tráfico de verdad (solo se comprobó que quedaron instalados y cerrados al público); nada de esto se probó en un celular real.

## Bloques B–E — HECHOS el 2026-11-19 (el usuario dijo: «tú dale a los bloques que siguen»)

**Servidor:** el SQL de estos bloques (`iniciar_partida`, `admin_resumen`, `admin_estado_codigo`, `admin_canales` y la migración nueva `0005_revision_noviembre.sql`) se aplicó al servidor real por el conector el 2026-11-19 (migración `revision_noviembre_bloques_b_e`), después de comprobar en PGlite que deja las 57 funciones idénticas a pegar `todo-junto.sql`. Después: auditoría «✅ Todo en orden», los 32 avisos de `search_path` del asesor de Supabase desaparecieron, `probar-seguridad` 19 ✓, datos y PIN intactos.

### B — Experiencia de juego
| # | Hecho | Dónde |
|---|---|---|
| 13 | Saltar y cambiar de carril ya suenan (los eventos del toque entran por `p.eventosEntrada` y llegan al siguiente cuadro) | `logica.js` |
| 14 | Si termina en pleno salto, cae al piso (antes flotaba en el festejo) | `logica.js` (`terminando` → `avanzarSalto`) |
| 15 | «Seguir jugando» hace «3, 2, 1» con el juego quieto; pausar o salir de la app lo cancela | `main.js` (`alternarPausa`, `reanudando`) |
| 16 | La pausa dice «Si sales, pierdes este intento.» | `textos.js`, `ui.js` |
| 17 | Con «Reducir movimiento» se ven el «3, 2, 1» y el «¡META!» | `juego.css` |
| 18 | En pausa ningún toque prende la música (`callado`); los eventos se vacían después de dibujar (no más explosión de partículas al reanudar) | `audio.js`, `main.js` |
| 19 | Tras la meta, si el servidor tarda, sale «Cargando…»; lo que solo lee (estado, mi código) espera 8 s y 1 reintento (antes ~37 s); si falla al empezar, se recarga el inicio | `main.js`, `api-supabase.js` |
| 20 | Calidad adaptativa: salta escalones que no cambian nada en ese aparato y, si bajar la resolución no ayudó, prueba UNA vez sin contorno antes de rendirse | `escena.js` |
| 21 | Cholado: ~2.700 triángulos menos sin cambio visible (comparado lado a lado con la versión publicada con «Ver de cerca»: 25.787 → 23.120 en esa toma) | `modelos.js` |
| 22 | Música más liviana: los metales comparten filtro y ganancia por nota (mismo sonido); el piano usa 2 osciladores en vez de 5 (casi igual); sin reverberación en celulares de ≤ 2 GB | `audio.js` |
| 23 | Salto con fórmula exacta (igual a cualquier FPS); sin basura por cuadro (contadores y listas reutilizadas; las 220 partículas solo se recorren si hay alguna viva); pausa al perder el foco, al ocultar la página o si un cuadro tarda > 0,5 s. **No hecho:** el gesto «atrás» del borde (agregar historial confundía más de lo que ayudaba) | `logica.js`, `escena.js`, `main.js` |

**Dificultad:** con los arreglos 6 (doble choque) y 23 (salto exacto) el simulador pasa de Novato 0,5 % · Normal 6 % · Experto 46 % a **2 % · 14 % · 51 %**. Parte de la diferencia es del propio simulador (corre a 30 fps, donde el salto viejo quedaba 10 % más bajo); en un celular a 60 fps el salto real sube de 1,28 a 1,35 (lo que dice la configuración). Si el dueño quiere la dificultad de antes, es un número en el panel.

**Bug que apareció y se arregló en la prueba:** al saltarse el recorrido de las partículas, las 220 arrancaban en tamaño 1 y se veía un cubo blanco a los pies del personaje; ahora el primer cuadro las deja en 0.

### C — Textos y marketing
| # | Hecho | Dónde |
|---|---|---|
| 24 | El inicio dice qué se gana y con qué compra («Llega a la meta y gánate un raspao personal o un cholado de 10 oz · con tu compra desde $30.000») | `textos.js` (`gancho`), `ui.js`, `juego.css` |
| 25 | Un solo vocabulario (premio · código · regalo · activar/canjear · celular · promo), documentado arriba de `textos.js` | `textos.js` |
| 26 | ~30 textos reescritos (ayuda sin «antes de que se acabe el tiempo», «lunes 26 de noviembre» sin «12:00 a. m.», «Ese era tu último intento», título de perder según el avance, «18 de 25 frutas», errores que dicen qué hacer…). Sin cambiar el fondo legal | `textos.js`, `util.js` (`fechaCortaBogota`) |
| 27 | Ticket: código → vale hasta → **dónde canjearlo** → «¡Tómale captura!» → pasos; «no acumulable» como nota; «Si cierras esta página…». **«Cómo llegar» listo pero apagado** hasta tener `[ENLACE DE GOOGLE MAPS]` (`LOCAL.mapa`) | `ui.js`, `textos.js` |
| 28 | Botón «Síguenos: @cholados.laindia» en sin intentos, sin premios, sin promo, perdiste sin intentos y código vencido | `ui.js` |
| 29 | «Reta a un amigo» (menú de compartir del celular o WhatsApp) en perdiste, sin intentos y el ticket; su enlace lleva `utm_source=amigo` (sale en el panel). También se agregó un enlace aparte para las **historias** de Instagram | `main.js` (`retarAmigo`), `07-enlaces-para-redes.md` |
| 30 | Toques de 40–44 px (selector, enlaces), «Ver política de datos» fuera de la casilla, letra legal de 13,5–15 px, etiqueta del selector más legible, inicio deslizable en pantallas bajas, «¡Corre!» que no se corta | `juego.css`, `ui.js` |
| + | HTML: descripción nueva, `canonical`, `preconnect` al servidor, `og:image:alt/type`, aviso para navegadores sin módulos, `id` en el manifiesto; `canal.js` funciona en iOS 15–16, quita etiquetas mal escritas y recuerda el canal en memoria si el navegador no deja guardar | `index.html`, `manifest.webmanifest`, `canal.js` |
| + | `06-textos-legales.md` regenerado (con el gancho del inicio y las otras pantallas que hablan de reglas). **La mamá del usuario debe volver a leerlo.** | `tools/textos-legales.mjs` |

### D — Panel y caja
| # | Hecho | Dónde |
|---|---|---|
| 31 | Configuración: guarda solo lo que cambiaste, pide confirmación si el cambio cierra el juego, no convierte una fecha mal escrita en «sin fecha», «Descartar» pregunta, aviso al cerrar con cambios sin guardar, «Vidas» solo enteros | `vista-config.js` |
| 32 | CSV con punto y coma y todo entre comillas (Excel en español; un «;» en un nombre ya no cuela una fórmula); `*.csv` y `respaldos/` en `.gitignore` | `formato.js`, `.gitignore` |
| 33 | Caja: «Otro código» tras cada resultado, el campo se selecciona al tocarlo, el teclado se esconde al verificar, mensajes sin jerga («Al servidor le falta una actualización…», «CAMBIÓ LA LISTA DE REGALOS», «ALGO RARO PASÓ»), ayuda que no depende del largo del código | `canje-ui.js`, `rpc.js` |
| 34 | «Mostrar más» no sale antes de cargar; «Cargando…» y «Reintentar» en la lista; sin filas repetidas; desactivar/reactivar no te devuelve a la primera página; el Resumen dice «premios de hoy» cuando manda el cupo diario; `#constructor` ya no rompe el panel; «Esta cuenta ya no es de administrador»; separación entre tarjetas | `vista-codigos.js`, `vista-resumen.js`, `admin.js`, `panel.css` |

### E — Servidor y mantenimiento
| # | Hecho | Dónde |
|---|---|---|
| 35 | Tope global de 3.000 partidas por hora (todas las redes); el Resumen muestra el tamaño de la base; receta para borrar partidas viejas sin código (guía rápida 5.10) | `0002`, `0003`, `04-guia-rapida.md` |
| 36 | `search_path` fijo en todas las funciones de `app` (0005); la auditoría detecta funciones públicas duplicadas y SECURITY DEFINER sin `search_path`; el Resumen hace una pasada por tabla para los 14 días (+ índice por fecha); `admin_estado_codigo(null)` ya no da error; `admin_canales` máximo 100 filas; la lista de regalos siempre es una lista; `limpiar_pruebas.sql` sin `cascade` | `0003`, `0004`, `0005`, `auditoria_permisos.sql` |
| 37 | **PENDIENTE (decisión del dueño y su mamá):** la política promete borrar «6 meses después de que termine la campaña» y la campaña no tiene fecha de fin. Opciones: poner fecha de fin, o cambiar a «6 meses desde que vence tu código» (receta 5.8 de la guía rápida) | — |
| 38 | Acciones de GitHub al día (checkout v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5; versiones comprobadas con `gh api`) | `.github/workflows/` |
| 39 | Código muerto fuera: textos sin uso, `quiereMusica`/getters de audio, `grupo` reexportado, `alTerminar`, `ms`, medidas de `doble`, comentarios de aplausos/coro y de los previews, CSS duplicado | varios |
| 40 | `CLAUDE.md` recortado de 64 KB a ~15 KB sin perder decisiones (el completo quedó en `documentos/claude-md-historico-2026-11.md`); `PLAN.md`, `pendientes.md` y las guías al día | documentos |

**Pruebas al cerrar:** `probar-sql` **310 ✓** (sección 27 nueva), `probar-canal` 19 ✓, `probar-mutaciones` todas detectadas, `revisar-secretos` limpio, `probar-seguridad` 19 ✓ (servidor real). En la demo del navegador: inicio con el gancho, perdiste («¡Pilas con las cajas!», «0 de 25 frutas», «Todavía quedan 50 premios», «Reta a un amigo»), pausa con aviso y «3, 2, 1» con el juego quieto, ticket en el orden nuevo, caja con «Otro código», panel guardando solo lo cambiado. **No probado:** nada en un celular real (sonido, FPS, compartir, Instagram), y los topes nuevos con tráfico real.

## Dos cosas del dueño, fuera del código
- Los commits llevan un correo institucional con su nombre (visible en el repo público): GitHub → Settings → Emails → «Keep my email addresses private».
- Un solo dueño de todo (cuenta `hachescc`): conviene un segundo dueño en las organizaciones de GitHub y Supabase y un segundo administrador del panel.
