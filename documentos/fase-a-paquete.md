# Fase A — Paquete para cazar bugs en localhost

Tú ejecutas todo (en el computador y en tu iPhone XR), anotas lo que no se ve o no se siente bien, y me mandas la lista; yo la ordeno, la numero y lo arreglamos. **No hace falta hacerlo todo de una vez:** marca las casillas a medida que pruebes.

- **Ronda 1 – Ruta rápida (≈ 30 min):** sección 3. Si algo falla ahí, es lo más urgente.
- **Ronda 2 – Todo lo demás (≈ 1–2 h, en varios ratos):** secciones 4 a 6.
- Cada vez que encuentres algo: **anótalo con la plantilla de la sección 8** (una línea basta) y sigue; no hace falta que lo arregles ni lo entiendas.

---

## 1. Antes de empezar

1. En la terminal, dentro de la carpeta del proyecto: `npm run dev`. Déjala abierta. Fíjate en la línea **«En tu celular: http://192.168.x.x:5173/»**: ese es el número de tu computador en la wifi (anótalo; abajo le digo `IP`).
2. **iPhone XR:** conectado a la **misma wifi**. Abre Safari y escribe `http://IP:5173/` (con los números reales). Si no abre: Windows pregunta si deja a *Node.js* usar la red → **Permitir**.
3. **Dos formas de probar, para no gastar premios de verdad:**
   - 🧪 **Modo práctica** (`api=falsa`): todo es simulado en tu navegador, intentos ilimitados, sin servidor. Úsalo para casi todo el juego. Los códigos que salen dicen «Código de PRUEBA».
   - 🌐 **Modo real** (sin `api=falsa`): habla con tu Supabase de verdad (3 intentos por dispositivo, 50 premios por semana, códigos reales `LAINDIA-XXXX`). Úsalo para las pruebas de extremo a extremo (sección 6) y **al terminar limpia** (sección 9).
4. **Truco para tener 3 intentos nuevos en modo real:** abre el juego en una **ventana privada/incógnito** (PC) o una **pestaña privada** de Safari (XR): es un «dispositivo nuevo». Alternativa: SQL de `PARA-MI-LEER-Y-TENER-A-MANO/04-guia-rapida.md` 5.1 (borra todas las partidas).
5. **Truco para reiniciar el modo práctica:** botón **Debug** (abajo a la derecha) → «Reiniciar la semana» o «Borrar datos del "servidor"».

---

## 2. Todos los «ejecutables» (cambia `localhost` por `IP` en el XR)

| Qué es | Dirección | Modo | ¿Gasta cosas reales? |
|---|---|---|---|
| **El juego** | `http://localhost:5173/` | real | **Sí** (intentos y premios) |
| **Juego de práctica + panel Debug + contador de FPS** | `http://localhost:5173/?debug=1&api=falsa` | simulado | No |
| Juego de práctica sin panel (como lo vería un cliente) | `http://localhost:5173/?api=falsa` | simulado | No |
| Juego real **con** panel Debug (invencible, estadísticas) | `http://localhost:5173/?debug=1&servidor=1` | real | **Sí** |
| **La caja** (quien atiende) | `http://localhost:5173/canje/` | real | Sí (canjea de verdad) |
| La caja con datos de mentira (PIN `1234`; códigos `K7M2` válido, `R8T3` ya canjeado, `V3N5` vencido, `D6F2` desactivado) | `http://localhost:5173/canje/?api=falsa` | simulado | No |
| **El panel de administrador** (tu correo y contraseña) | `http://localhost:5173/admin/` | real | Sí |
| Panel con datos de mentira (cualquier correo, clave `demo`) | `http://localhost:5173/admin/?api=falsa` | simulado | No |
| **Diagnóstico del celular** (mide el celular y la conexión) | `http://localhost:5173/diagnostico/` | real (solo lee) | No |
| El historial de versiones guardadas (hitos con capturas) | `http://localhost:5173/historial/` | — | No |

**Comandos que también puedes correr** (guía completa en `PARA-MI-LEER-Y-TENER-A-MANO/04-guia-rapida.md` sección 4): `npm run simular` (un bot juega miles de partidas y dice qué tan difícil está), `npm run probar-sql`, `npm run probar-seguridad`, `npm run probar-ataques`, `npm run revisar-secretos`.

**Teclado en el PC:** ← → o A D (carril), ↑ W o espacio (saltar), Esc o P (pausa). **En el XR:** deslizar izquierda/derecha (un deslizamiento = un carril), deslizar arriba o tocar (saltar).

---

## 3. Ronda 1 — Ruta rápida (≈ 30 min): ¿lo esencial funciona?

Primero en el **PC** y luego repite lo marcado con 📱 en el **XR**.

1. - [ ] Abre `/?debug=1&api=falsa`. ¿Carga rápido, se ve el logo, el título, el selector de personajes y «Quedan 50 premios esta semana»? 📱
2. - [ ] Cambia entre **Choladito** y **La India**: ¿cambia el personaje y se **acuerda** al recargar? 📱
3. - [ ] Toca **«¿Cómo se juega?»** y **«Condiciones»**: ¿se leen bien, abren y cierran? 📱
4. - [ ] **Juega una partida completa**. ¿Cuenta 3-2-1, el personaje responde a cada movimiento, los obstáculos y las frutas se ven y se sienten justos? 📱
5. - [ ] **Pausa** (botón arriba a la derecha) y vuelve. En el XR: cambia de app a mitad de partida y regresa: ¿quedó en pausa? 📱
6. - [ ] **Pierde a propósito** (chócate 3 veces): ¿sale «¡Uy, casi!» con tu progreso y las frutas?
7. - [ ] **Gana**: Debug → marca **Invencible**, recoge frutas hasta llegar a **25** y cruza la meta. ¿Sale el formulario con «Tu premio está apartado por 15 minutos»? 📱
8. - [ ] Llena el formulario (nombre, celular con **10 dígitos**, marca la casilla) → **Reclamar mi premio**. ¿Sale el ticket con el código, «vale hasta…» y la cuenta regresiva? 📱
9. - [ ] En el ticket toca **Copiar código** (¿dice «¡Copiado!»?) y **Volver al inicio**. ¿Aparece **«Ver mi código»**? ¿Lo abre bien? 📱
10. - [ ] Abre `/canje/?api=falsa`, PIN `1234`, código `K7M2` → **Verificar** → elige un regalo → **Marcar como canjeado**. Vuelve a verificar el mismo: ¿dice «YA FUE CANJEADO»? 📱
11. - [ ] Abre `/admin/?api=falsa` (cualquier correo, clave `demo`). Recorre las 5 pestañas. ¿Todo carga y se lee? 📱
12. - [ ] Abre `/diagnostico/` en el **XR** → «Probar rendimiento» → anota los **FPS** y copia el resultado.

---

## 4. Ronda 2 — Lista completa, por áreas

### A. Pantalla de inicio y textos
- [ ] Logo nítido, nada recortado ni encimado en el XR (ojo con la **muesca** de arriba y la **barra de abajo**). 📱
- [ ] El selector de personaje se entiende y se ve cuál está elegido.
- [ ] «Quedan N premios…» e intentos («Te quedan 3 intentos de 3») con los vasitos correctos.
- [ ] «¿Cómo se juega?» dice lo correcto (frutas mínimas, vidas, regalos, «no es acumulable»).
- [ ] «Condiciones»: vigencia, un código por celular, compra mínima, premios por semana, temporada. ¿Algo que no coincida con lo que quieres decir?
- [ ] Ortografía, tildes y tono («tú», caleño suave): anota todo lo que suene raro.
- [ ] En el ticket aparecen la dirección («Cholados La India, Canchas Panamericanas») y el horario de canje («de 2:00 p. m. a 9:00 p. m.»).

### B. Controles
- [ ] **PC:** teclado (flechas / A D / W / espacio / Esc / P). ¿Cada pulsación hace UNA cosa? ¿Mantener la tecla no cambia varios carriles?
- [ ] **XR:** un deslizamiento = un carril, aunque sea fuerte. 📱
- [ ] **XR:** deslizar hacia arriba salta; tocar también salta. 📱
- [ ] ¿Hay deslizamientos que no se detectan? ¿Hay carriles que se cambian solos? 📱
- [ ] La pantalla **no se mueve, no hace zoom, no se recarga** al deslizar (arriba, abajo, doble toque rápido). 📱
- [ ] Deslizar **desde el borde** de la pantalla (muy pegado al borde izquierdo/derecho): ¿funciona o el iPhone lo toma como «atrás»? 📱

### C. Jugabilidad (aquí tu opinión vale más que la mía)
- [ ] La **dificultad** al principio, a mitad y al final: ¿empieza amable y termina retadora? ¿Demasiado fácil o imposible?
- [ ] ¿Se llega a la meta con 25 frutas con facilidad, con esfuerzo, o casi nunca? (Meta del dueño: más o menos 1 de cada 4 o 5 intentos gana.)
- [ ] Choques: ¿alguna vez sientes que **te chocaron injustamente**? ¿O que pasaste por un obstáculo sin que contara?
- [ ] Tras un choque hay 1,3 s de invulnerabilidad: ¿se nota (destello rojo)? ¿Es suficiente?
- [ ] **Frutas**: ¿se ven? ¿se recogen sin esfuerzo cuando pasas por encima? ¿Algunas quedan imposibles?
- [ ] Las **pilas altas** no se pueden saltar: ¿el juego lo deja claro?
- [ ] La **meta**: ¿se ve de lejos? ¿el cartel «¡META!» se alcanza a leer? ¿la celebración al cruzar queda bien?
- [ ] El **HUD** (vidas, reloj, barra de progreso, frutas «8 / 25» que se pone verde al llegar a 25): ¿se entiende sin explicación?
- [ ] ¿Algún momento se siente «trabado», lento, o con tirones? Anota **cuándo** (inicio, mitad, final, al recoger frutas…). 📱

### D. Fin de la partida
- [ ] **Perder por vidas:** mensaje, progreso en %, frutas y «Te quedan N intentos esta semana».
- [ ] **Llegar a la meta sin las 25 frutas:** «¡Te faltaron frutas!» con «recogiste X de 25». ¿Se entiende?
- [ ] **Ganar:** el formulario aparece después de ~1,5 s de celebración.
- [ ] «Intentar de nuevo» y «Volver al inicio» llevan donde dicen.
- [ ] **Intentos agotados:** pantalla «Se acabaron tus intentos» con la fecha de renovación (en modo real, con una ventana privada: pierde 3 veces).

### E. El formulario del premio
- [ ] Nombre vacío / de 1 letra → mensaje. Nombre con tildes, ñ, emojis → ¿se acepta y se ve bien después?
- [ ] Celular: al escribir se arma `312 345 6789`; pega `+57 312 345 6789` o con guiones → ¿lo limpia bien?
- [ ] Celular con 9 dígitos, que no empiece por 3, con letras → mensaje claro.
- [ ] **Casilla de consentimiento** sin marcar → mensaje. «Ver política de datos» y «Ver condiciones» abren **encima** sin borrar lo que escribiste.
- [ ] 📱 En el XR: al tocar un campo sale el **teclado**: ¿el campo y el botón siguen a la vista? ¿el teclado del celular es el numérico?
- [ ] Botón «Reclamar mi premio»: **toca dos veces seguidas** → no debe crear dos códigos ni romperse.

### F. El ticket y «Ver mi código»
- [ ] El código se lee grande y claro (`LAINDIA-7K3Q`) y **no** se confunde 0/O ni 1/I (no existen en los códigos).
- [ ] «Vale hasta…» y la cuenta regresiva (`6 d 23 h 59 min`) avanzan solas.
- [ ] Los 4 pasos (ir al local, compra mínima $30.000, elegir regalo, «no es acumulable») se entienden.
- [ ] «Copiar código» y la **captura de pantalla** (tómala): ¿el ticket queda bien en la foto? 📱
- [ ] Cierra todo y vuelve a entrar: «Ver mi código» muestra el mismo ticket. Si la caja lo **canjeó**, dice «ya fue canjeado»; si **venció**, «venció»; si lo **desactivaste**, «desactivado».
- [ ] Un número que **ya tiene cupón**: «¡Este número ya tiene un cupón!» con la fecha en que podrá volver y el botón «Me equivoqué de número» (en modo real).

### G. Las reglas del servidor (modo real; recuerda limpiar al final)
- [ ] 3 intentos por dispositivo; el 4.º dice «sin intentos». Ventana privada = intentos nuevos.
- [ ] El **premio apartado** dura 15 min: gana, **deja el formulario abierto sin reclamar** y espera 16 minutos: si todavía hay premios en el banco, aún puedes reclamar; si otra persona se llevó el último, debe decir que se acabaron. (Mientras estaba apartado, otra persona no podía llevárselo.)
- [ ] Un **mismo celular** no puede reclamar dos veces en 7 días.
- [ ] **Banco agotado:** en el panel pon «Premios por semana» en 1 → una persona gana → otra ventana privada ve «Se acabaron los premios». Restáuralo.
- [ ] **Cupo diario:** pon 1 al día → mismo experimento: debe decir «Se acabaron los premios de hoy». Apágalo.
- [ ] **Campaña con fechas:** pon inicio en el futuro → «Por ahora no hay campaña… empieza el X»; pon fin en el pasado → «terminó el X»; quita las fechas.
- [ ] **Sin internet** (modo avión o apaga la wifi) en el menú y en medio de una partida: ¿mensaje claro y botón «Reintentar»?

### H. La caja (`/canje/`)
- [ ] Los 6 resultados con la demo (`K7M2` válido, `R8T3` ya canjeado, `V3N5` vencido, `D6F2` desactivado, uno que no existe, PIN malo).
- [ ] **Escribir el código de varias formas:** `LAINDIA-K7M2`, `laindia k7m2`, `k7m2`.
- [ ] El botón «Marcar como canjeado» está **apagado** hasta elegir regalo.
- [ ] 5 PIN malos → bloqueo («DEMASIADOS INTENTOS»); el PIN correcto no funciona mientras dure.
- [ ] En modo real con tu PIN: canjea un código de verdad y míralo en el panel (nombre, celular, regalo, «Caja»).
- [ ] 📱 En el XR: botones grandes, el teclado no tapa nada, se puede usar con una mano.
- [ ] ¿Es **rápido** (menos de 5 segundos de principio a fin)?

### I. El panel (`/admin/`)
- [ ] **Entrar:** contraseña mala → mensaje; buena → entra; «Salir» funciona; recargar la página mantiene o pide entrar (según «mantener sesión»).
- [ ] **Resumen:** los números cuadran con lo que viste jugar (premios que quedan, códigos, canjes, 14 días).
- [ ] **Códigos:** filtros (Activos/Canjeados/Vencidos/Desactivados), buscador (por código, nombre sin tildes, celular), **Canjear**, **Desactivar/Reactivar**, «Mostrar más», **Exportar CSV** (ábrelo en Excel: ¿tildes bien? ¿columnas claras?).
- [ ] **Canjear** (sin PIN): ve nombre y celular.
- [ ] **Configuración:** cambia un valor de cada sección → Guardar → comprueba en el **juego** que cambió (premios, intentos, regalos, fechas, frutas mínimas, dificultad). Pon un valor absurdo (intentos = 0): debe rechazarlo con un mensaje y **no guardar nada**. «Volver la dificultad a los valores de fábrica». Interruptor del **cupo diario**.
- [ ] **Cuenta:** cambia el PIN (el viejo deja de servir), «Desbloquear ahora», «Descargar todos los códigos (CSV)».
- [ ] 📱 El panel en el XR: ¿se puede usar? ¿las pestañas se deslizan? ¿los botones se alcanzan?
- [ ] Al terminar: restaura las reglas (`PARA-MI-LEER-Y-TENER-A-MANO/04-guia-rapida.md` 5.2) y limpia los datos de prueba (5.1).

### J. Diagnóstico y modo Debug
- [ ] `/diagnostico/` en el XR: todo ✔; anota los FPS, la «Hora del celular vs el servidor», las «Zonas seguras».
- [ ] La **prueba de gestos** del diagnóstico: izquierda, derecha, arriba, toque, y empezando desde los bordes.
- [ ] Panel **Debug**: los deslizadores de dificultad se aplican **en vivo**; «Invencible»; «Intentos ilimitados»; «Simular error de red»; «Copiar config».
- [ ] «Simular 1.000 partidas × 3 perfiles»: ¿termina y da números (Novato/Normal/Experto)?

### K. Específico del iPhone XR 📱
- [ ] **Muesca y barra de abajo:** ningún botón ni texto queda tapado (HUD arriba, botones de abajo, ticket).
- [ ] **Modo de bajo consumo** (batería amarilla): ¿cambia algo? (en ese modo va a ~30 FPS: es normal).
- [ ] **Girar el celular:** el juego es vertical; ¿se ve razonable de lado?
- [ ] **Pausa automática** al: cambiar de app, bloquear la pantalla, recibir una llamada o notificación grande.
- [ ] **Zoom:** doble toque y pellizcar no deben ampliar el juego.
- [ ] **Copiar código** funciona aunque la página sea `http` (en `https` real usa otro método; si algo falla solo aquí, avísame).
- [ ] Calentamiento y batería después de 10 minutos jugando.
- [ ] **Safari** y también **Chrome del iPhone**: ¿se ve y se juega igual?

### L. Específico del computador 💻
- [ ] Achica y agranda la ventana: el juego queda en una columna de celular centrada; nada se desborda.
- [ ] Zoom del navegador (Ctrl + / −) al 50 % y al 200 % en la caja y el panel.
- [ ] Segundo monitor / ventana pequeña / pestañas varias: ¿la **pausa automática** sirve al cambiar de pestaña?

### M. Lo estético (anótalo para la Fase B, no hace falta arreglarlo ahora)
- [ ] Colores: ¿algo muy saturado, apagado o difícil de leer?
- [ ] Personajes, cholado, frutas, escenario: ¿qué falta, qué sobra, qué te gustaría que se viera más «terminado»?
- [ ] Textos pequeños o con poco contraste (sobre todo en el XR, al sol).
- [ ] Animaciones que faltan (choque, recoger fruta, meta, pantallas).
- [ ] Sonido y música: ¿qué te imaginas?

---

## 5. Intenta romperlo (esto es lo que más bugs encuentra)

- [ ] **Doble toque** muy rápido en: «¡A correr!», «Reclamar mi premio», «Marcar como canjeado», «Guardar cambios», «Copiar código».
- [ ] **Recargar la página** (F5 / jalar hacia abajo) en cada pantalla: inicio, a mitad de partida, en el formulario, en el ticket.
- [ ] **Botón «atrás»** del navegador en el juego y en el panel.
- [ ] **Dos pestañas** del juego a la vez (¿gastan intentos de más?). **Dos pestañas del panel** y cambia la misma regla en ambas.
- [ ] Cierra la pestaña **justo después de ganar** (antes de reclamar) y vuelve a abrir el juego. **Ya está arreglado (K1):** debe salir «¡Tu premio te espera!» con el botón «Reclamar mi premio» (y «Ahora no»). Pruébalo también apagando el internet justo al llegar a la meta: debe salir el aviso «no pudimos confirmarlo… No lo perdiste» y, al volver el internet y tocar «Reintentar», el aviso del premio.
- [ ] **Nombre raro:** `<b>hola</b>`, `'; drop table`, emojis, 60 letras, un nombre larguísimo. ¿Se ve bien en el ticket, la caja, el panel y el CSV?
- [ ] **Celular raro:** con espacios, con guiones, `+57`, pegado desde WhatsApp.
- [ ] **Cambiar la hora** del celular/computador (adelantarla 3 días): la cuenta regresiva del ticket **no** debe cambiar.
- [ ] **Sin internet** a mitad de partida y al reclamar el premio. **Internet lento** (Chrome → F12 → Red → «Slow 4G»).
- [ ] **Texto del sistema muy grande** (Ajustes del iPhone → tamaño de letra): ¿se rompe algo?
- [ ] **Modo oscuro** del celular/computador: ¿la caja, el panel o el diagnóstico quedan ilegibles?
- [ ] **PIN de la caja:** pruébalo desde el panel con 4 y con 8 dígitos; con `1234`; con letras.
- [ ] **Código de otra persona:** en una ventana privada escribe en «Ver mi código»… no debería mostrar nada del código de otro dispositivo.
- [ ] Abre `/admin/`, `/canje/` y `/diagnostico/` **dentro de un iframe** (no se puede probar fácil; omitir).
- [ ] Todo lo que se te ocurra que «un cliente despistado» haría.

---

## 6. Recorridos de principio a fin (modo real, ≈ 20 min cada uno)

Siempre con el panel abierto en una pestaña para ver qué cambia. **Limpia al terminar (sección 9).**

1. **El cliente feliz:** ventana privada → juega hasta ganar (Debug → `?debug=1&servidor=1`, «Invencible» y 25 frutas) → formulario → ticket → copia el código → en `/canje/` con tu PIN: verifica, elige regalo, canjea → vuelve al juego: «Ver mi código» dice **canjeado** → panel: Resumen suma el canje, Códigos lo muestra «Canjeado · Caja · regalo», CSV lo incluye.
2. **El que pierde:** otra ventana privada → pierde 3 veces → «Se acabaron tus intentos» → panel: «Partidas» sube.
3. **El que quiere dos veces:** mismo celular, otra ventana privada → gana → «Este número ya tiene un cupón».
4. **Se acaban los premios y vuelven:** panel → Premios por semana = 1 → alguien gana → otra ventana: «Se acabaron» → sube a 5 → ya se puede jugar otra vez.
5. **Cupo diario:** panel → activa cupo 1 → alguien gana → otra ventana dice «Se acabaron los premios de hoy» (y el Resumen muestra «Premios que quedan HOY: 0») → apágalo → vuelve a haber premios. *(Para ver el «hoy» en el servidor real hay que haber pegado `todo-junto.sql` de nuevo; si no, dice «esta semana».)*
6. **Cambias las reglas y el juego lo nota:** regalos, compra mínima, vigencia, frutas mínimas, velocidad: el juego, el ticket y «Condiciones» lo muestran al recargar.
7. **Código perdido:** desactiva un código en el panel → la caja lo marca «desactivado» y «Ver mi código» también → reactívalo.
8. **Caja bloqueada:** 5 PIN malos desde el XR (en datos móviles, otra red) y luego desde el PC: cada red tiene sus intentos; desbloquea desde el panel.
9. **Respaldo:** Exportar CSV y abrirlo en Excel (tildes, celulares, fechas en hora de Bogotá).

---

## 7. Lo que ya sé (no hace falta que lo reportes)

- **K1 ✅ ARREGLADO (2026-10-20).** Se perdía el premio si cerrabas o recargabas la página justo después de ganar y antes de reclamar. Ahora la victoria se anota en el celular al llegar a la meta y, al volver, sale «¡Tu premio te espera!». El servidor decide si todavía se puede (reserva de 15 min; se puede reclamar hasta unas 6 h después si aún quedan premios). La simulación (`?api=falsa`) y el servidor real guardan su aviso por separado.
- **K2 🟡** Con `?debug=1` el contador de FPS y el botón «Debug» tapan un poco el título de algunas pantallas. Solo pasa en modo debug; los clientes no lo ven.
- **K3 ✅** Los datos del local (dirección, horario de canje, responsable y correo de contacto) ya se llenaron al empezar la Fase B.
- **K4 ℹ️** En `http://IP:5173/` (wifi) el navegador se comporta un poco distinto que en el `https` real (por ejemplo, el portapapeles). Está cubierto con alternativas; solo avísame si algo falla.

---

## 7a. Lo que Claude ya encontró y arregló buscando bugs (2026-10-20) — compruébalo cuando pruebes

Claude recorrió el código y el juego en el navegador (partida completa, perder por vidas, perder por frutas, ganar, pausa, caja con sus 6 resultados, panel con sus 5 pestañas, errores de red simulados). Encontró y arregló esto:

| # | Qué pasaba | Cómo se comprueba ahora |
|---|---|---|
| F1 | **K1:** se perdía el premio al recargar tras ganar (y si se caía el internet al terminar la partida) | Ganar → cerrar la pestaña → abrir: «¡Tu premio te espera!» |
| F2 | **Pegar un celular con +57** (`+57 312 345 6789`): el campo cortaba lo pegado (tenía un tope de 12 letras) y quedaba inválido | Pega `+57 312 345 6789` o `573123456789` en el celular: debe quedar `312 345 6789` 📱 |
| F3 | **El marco del juego era más angosto que el celular** en los 16:9 (iPhone 6/7/8/SE, Androids de 360×640): sobraban franjas negras a los lados | En el XR no cambia (ya llenaba); en un celular chico llena todo el ancho |
| F4 | **Pantallas cortadas** cuando el contenido no cabía (celular chico, letra grande o teclado abierto): no se podía deslizar | Letra grande del iPhone / ventana baja: se puede deslizar |
| F5 | **Celular acostado:** el juego quedaba en una tira de ~190 px | Gira el XR: aviso «Gira tu celular»; si estabas jugando, queda en pausa 📱 |
| F6 | Un nombre de **un solo emoji** pasaba la revisión del celular pero el servidor lo rechazaba, y el mensaje hablaba del celular | Nombre «😀»: «Escribe tu nombre.» |
| F7 | Dos textos terminaban en **«a. m..»** (doble punto): «canjeado el…» y «podrás reclamar otro a partir del…» | Ticket de un código canjeado / pantalla «Este número ya tiene un cupón» |
| F8 | En `?debug=1&api=falsa` los **intentos son ilimitados por defecto** y nada lo avisaba (por eso en tu prueba del XR no se gastaban) | El cuadrito de arriba dice «INTENTOS ILIMITADOS»; desmarca la casilla en «Debug» para probar el gasto real |
| F9 | El texto que sale al compartir el link decía «Atrapa tu cholado» (el nombre del juego es «Corre por tu cholado») | — |

**Sobre tu prueba en el XR:** con `?debug=1` los intentos ilimitados vienen activados a propósito (para poder calibrar sin gastar el banco), por eso ni perdiendo ni ganando bajaban los 3 intentos. Además, **no hace falta recoger todas las frutas**: se necesitan 25 de las ~71 que salen (si llegas a la meta con menos, pierdes con «¡Te faltaron frutas!»). Para probar el juego como lo vería un cliente: abre `http://IP:5173/` **sin** `?debug=1` (gasta intentos y premios de verdad; luego limpias con el SQL 5.1 de `PARA-MI-LEER-Y-TENER-A-MANO/04-guia-rapida.md`) o `?api=falsa` sin debug (simulado, con 3 intentos reales de mentira).

---

## 7b. Qué NO esperar todavía
- Sonido y música (Fase B). · Que se vean nombres y estilo finales (Fase B). · Las pruebas dentro de Instagram/Facebook (en pausa, con el enlace real). · La dirección real `https://…` (Etapa 7). · La dirección y el horario del local (placeholders).

---

## 8. Cómo anotar y mandarme los bugs

Una línea por cosa, con esta plantilla (puedes pegar todo junto en un solo mensaje):

```text
N. [🔴/🟠/🟡/💡] DÓNDE (pantalla/URL) · QUÉ HICE · QUÉ ESPERABA · QUÉ PASÓ · en PC / XR (Safari/Chrome)
Ej.: 3. [🟠] Juego, después de ganar · escribí mi celular con +57 · esperaba que lo limpiara · lo dejó con el 57 pegado · XR Safari
```

- 🔴 **Bloqueante** (no se puede jugar/reclamar/canjear, se pierde un premio, datos mal) · 🟠 **Molesto** (se ve mal, confunde, falla a veces) · 🟡 **Detalle** (texto, alineación, ortografía) · 💡 **Idea** (mejora, no es un error).
- Captura de pantalla cuando sea visual (en el XR: botón lateral + subir volumen). Si es de rendimiento: los FPS del contador y el celular.
- Si algo falla **solo en el XR y no en el PC**, dilo: suele ser un problema distinto (teclado, barras, `http` vs `https`).
- Mándame la lista cuando tengas 10–15 cosas o al terminar una ronda; **no esperes a tener todo**.

**Qué haré con tu lista:** la ordeno y numero, te confirmo lo que entendí de lo ambiguo, arreglo por prioridad (🔴 primero), pruebo cada arreglo y te lo devuelvo con la dirección exacta para verlo. Lo que sea estético o una idea grande pasa a la Fase B.

---

## 9. Al terminar: dejar todo limpio

1. En el panel → Configuración: devuelve cualquier valor que hayas movido (o corre el SQL de reglas de fábrica: `PARA-MI-LEER-Y-TENER-A-MANO/04-guia-rapida.md` 5.2). Apaga el cupo diario si lo probaste (a menos que lo quieras).
2. Borra los códigos y partidas de prueba: `PARA-MI-LEER-Y-TENER-A-MANO/04-guia-rapida.md` **5.1** (una sola línea de SQL).
3. Cierra la terminal con `Ctrl + C`.
4. Si cambiaste el PIN para probar, deja el que quieras usar de verdad (panel → Cuenta).
