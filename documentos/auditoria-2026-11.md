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

## Bloque B — Experiencia de juego (PENDIENTE de aprobación)
13. Saltar y cambiar de carril casi nunca suenan (el evento se borra antes de sonar: `logica.js` vacía `p.eventos` al empezar `paso()`).
14. El personaje queda flotando si la partida termina en pleno salto (`terminando()` no aplica gravedad).
15. «Seguir jugando» reanuda en seco → «3, 2, 1» antes de continuar.
16. «Salir al inicio» en la pausa gasta el intento sin avisar → una línea de aviso.
17. Con «Reducir movimiento» la cuenta «3, 2, 1» y «¡META!» no se ven (`juego.css`, `.cuenta.late`).
18. Cualquier toque en la pausa reanuda la música; pausar justo en un evento repite partículas.
19. Pantalla congelada tras la meta con mala señal (hasta ~37 s) → «Cargando…» y esperas más cortas.
20. La calidad adaptativa se bloquea sin probar «sin contorno» cuando el escalón de resolución no cambia nada.
21. Modelos más livianos sin cambiar el arte (semillas, gotas, tapa de crema, piña tapada): ~2,5–3 mil triángulos menos (estimado a mano).
22. Música más liviana en gama baja (menos nodos por nota, mismo sonido). No medido.
23. Menores: salto que varía con los FPS, basura por cuadro en `escena.js`, pausa cuando iOS congela la página, gesto «atrás» del borde.

## Bloque C — Textos y marketing (PENDIENTE)
24. La pantalla de inicio no dice qué se gana ni la compra mínima.
25. Un solo vocabulario: premio (banco) · código (lo que recibes) · regalo (el producto); «activar» en el juego, «canjear» en el local; «celular», no «número»; sin «cupón».
26. ~30 reescrituras de textos (ayuda «antes de que se acabe el tiempo», «12:00 a. m. del lunes», «0 intentos», títulos de perder al azar…).
27. Ticket: dirección y horario arriba + «Cómo llegar» (falta `[ENLACE DE GOOGLE MAPS]`, lo da el dueño).
28. Enlace a Instagram en las pantallas finales.
29. Botón «Reta a un amigo» (WhatsApp / compartir) con su etiqueta UTM.
30. Zonas de toque pequeñas y letra legal de 12,5 px.
(Todo cambio en condiciones, ayuda del premio o ticket obliga a `npm run textos-legales` y a que la mamá del usuario lo vuelva a leer.)

## Bloque D — Panel y caja (PENDIENTE)
31. Configuración: guardar solo lo cambiado, avisar si el cambio cierra el juego, no convertir una fecha mal escrita en «sin fecha».
32. CSV: una celda con `;` puede colar una fórmula en un Excel en español; `*.csv` al `.gitignore`.
33. Caja: botón «Otro código» tras cada resultado; errores sin jerga.
34. Detalles: «Mostrar más» antes de cargar, Resumen confunde cupo del día con el de la semana, falta `.vista, .canje { display: grid; gap: 16px }`, `#constructor` en la dirección rompe el panel.

## Bloque E — Servidor y mantenimiento (PENDIENTE)
35. `app.partidas` nunca se limpia: tope global por hora, tamaño de la base en el Resumen, receta de limpieza.
36. 32 funciones internas sin `search_path` fijo; la auditoría de permisos no detecta sobrecargas viejas; `admin_resumen` recorre `partidas` ~30 veces; `admin_estado_codigo(null)` revienta.
37. Política de datos: «6 meses después de que termine la campaña» y la campaña no tiene fecha de fin (decisión del usuario y su mamá).
38. Acciones de GitHub: checkout v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5 (después de abrir).
39. Código muerto: textos sin usar (`lema`, `errores.yaTienesCodigo`, `sinIntentos.volver`), funciones sin llamadas, CSS duplicado, comentarios de aplausos/coro.
40. Documentos: recortar `CLAUDE.md` (60 KB, con contradicciones), actualizar `PLAN.md`, `pendientes.md` y las guías.

## Dos cosas del dueño, fuera del código
- Los commits llevan un correo institucional con su nombre (visible en el repo público): GitHub → Settings → Emails → «Keep my email addresses private».
- Un solo dueño de todo (cuenta `hachescc`): conviene un segundo dueño en las organizaciones de GitHub y Supabase y un segundo administrador del panel.
