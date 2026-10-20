# Reporte de la Etapa 6 — Pruebas y endurecimiento

Fecha: 2026-10-20 · **ETAPA CERRADA el mismo día** (decisiones del usuario en la sección 9) · Servidor probado: el Supabase real del proyecto (no una copia) · Repetir todo: ver la sección 10.

## Resumen en pocas líneas

| Área | Estado | En una frase |
|---|---|---|
| Concurrencia (cupo casi agotado) | 🟢 | 100 ganadores a la vez con 40 premios: se apartaron **exactamente 40**, 0 códigos repetidos, el banco quedó en 0 y nunca se superó el tope. |
| Casos pedidos (7 días exactos, canje doble, lunes 00:00, hora del celular, intentos, banco, llamadas directas) | 🟢 | Todo probado; el canje doble simultáneo real lo corriste tú con `probar-canje` («todo bien»). |
| Secretos y RLS | 🟢 | Ningún secreto en el repo ni en su historial; registro público de Supabase apagado; ninguna tabla se lee desde afuera. La auditoría encontró **1 función abierta de más** (inofensiva) y quedó corregida; el usuario pegó el SQL y la auditoría dice «✅ Todo en orden». |
| Textos legales | 🟢 | Consentimiento, vigencia, «no acumulable», compra mínima y fechas de la temporada ya se ven en el juego (inicio, formulario, ticket y «Condiciones»). Siguen los placeholders que dependen de ti (dirección, horario, responsable de datos). |
| Peso de carga | 🟢 | **272 KB** comprimidos (el objetivo era 3 MB); 21 archivos del juego ahora se piden a la vez. |
| Rendimiento en gama baja | 🟡 | Estimado, **no medido** en un celular de gama baja real (no hay uno a mano). Hay prueba lista para hacerlo. |
| Navegadores internos de Instagram y Facebook | 🟡 | **No se puede probar desde el computador.** Hay guía paso a paso y una página de diagnóstico para hacerlo tú. |

**El hallazgo principal:** cualquiera con conocimientos técnicos puede hablarle al servidor directamente, sin jugar. Antes, un programa podía quedarse con **todos** los premios de la semana en un minuto (ya lo habíamos visto en las pruebas). No cuesta dinero, porque cada código igual se canjea en el local con una compra de $30.000, pero **le quita el premio a la gente real**. Ahora hay límites por red y se recomienda activar el cupo diario (sección 7).

---

## 1. Concurrencia con el cupo casi agotado (servidor real)

Prueba: `npm run probar-supabase` (≈ 2 min). Se lanzaron 107 partidas a la vez, se esperó el tiempo mínimo real (47 s) y 100 «ganadores» intentaron apartar premio al mismo instante, cuando quedaban 40.

| Qué se midió | Resultado |
|---|---|
| 8 inicios simultáneos de un mismo dispositivo (3 intentos por semana) | **exactamente 3** aceptados |
| 100 ganadores simultáneos con 40 premios disponibles | **exactamente 40** apartados; los otros 60 recibieron «sin-premios» |
| 5 reclamos simultáneos con el MISMO celular | **1** código; los otros 4: «ya-tienes-codigo» sin ver el código ajeno |
| 40 reclamos simultáneos desde una misma red (tope: 8 códigos al día) | **5** pasaron (el cupo que le quedaba a esa red ese día), **35** recibieron «límite por red»; **0 duplicados**; el contador del límite quedó **exacto**: ese día ya se habían creado 3 códigos desde esa red (2 de las pruebas de ataques y 1 de la sección D) y 3 + 5 = 8, aunque los 40 llegaron a la vez |
| Banco al final | **0** restantes, no se superó el tope; ya nadie puede empezar a jugar por premio |
| Doble toque en «Reclamar» | devuelve el **mismo** código |
| **43 de 43** comprobaciones ✓ | |

Canje doble **simultáneo** (25 cajeros a la vez): la prueba está escrita (`npm run probar-canje`) pero necesita tu PIN, que se escribe en TU terminal y no en el chat. El canje usa `select … for update` sobre la fila del código; en la base de pruebas local el segundo toque recibe «ya canjeado» y a mano en tu servidor real también (probado en la Etapa 5).

## 2. Los casos que pediste

| Caso | Cómo se probó | Resultado |
|---|---|---|
| **Código vencido a los 7 días exactos** | 3 s antes del vencimiento «válido»; 1 milisegundo después «vencido» y no se canjea. Un código nuevo vence exactamente `minuto de expedición + 7 días`. Con 1 minuto de sobra («vale hasta») todavía se canjea. | ✓ |
| **Canje doble** | Secuencial: el segundo recibe «ya canjeado» con fecha y el regalo de la primera vez. Simultáneo real: `probar-canje` (pendiente: necesita tu PIN). | ✓ / pendiente tu PIN |
| **Semana que cambia el lunes 00:00 (Bogotá)** | Domingo 23:59:59 = semana vieja; lunes 00:00:00 = semana nueva, en 3 husos horarios de la sesión, y en julio y marzo (Bogotá no cambia de hora). La renovación que ve el juego es siempre lunes 05:00 UTC. | ✓ (*) |
| **Manipulación de la hora del celular** | El servidor ni recibe ni acepta horas: **ninguna** de las 20 funciones públicas tiene un parámetro de fecha u hora. La cuenta regresiva del ticket usa la hora que manda el servidor: con el celular adelantado 3 días, atrasado 5 horas o en el año 2031 marca igual «6 d 23 h 59 min» (error ≤ 6 ms). | ✓ |
| **Intentos agotados** | 8 inicios simultáneos → 3; el estado pasa a «sin-intentos». | ✓ |
| **Banco agotado** | Tras el 100-a-la-vez queda en 0 y «sin-premios»; los códigos vencidos no se reciclan. | ✓ |
| **Llamar a las funciones directamente** | `npm run probar-ataques -- --completo`: **30 de 30** (sección 3). | ✓ |

(*) El reloj del servidor no se puede «adelantar» para simular un lunes de verdad; lo probado son los límites exactos de la fecha y los datos corridos una semana. El lunes real del servidor es una prueba que ocurrirá sola: **revisa el primer lunes que pase** (premios en 50 y 3 intentos de nuevo).

## 3. Atacando el servidor directamente (sin pasar por el juego)

`npm run probar-ataques` (rápido) y `-- --completo` (con la espera de 47 s). 30 pruebas, todas ✓:

- Tokens inventados, no-UUID, parámetros que no existen, tipos equivocados, JSON roto, todo en `null`, números extremos o negativos → error 4xx limpio o «partida-invalida»; **ninguno** da error 5xx.
- Un **nombre de 1 MB** no tumba el servidor.
- Inyección SQL (`1'; drop table …`) en el dispositivo → rechazada. Un nombre con comillas, `DROP TABLE` y HTML se guarda como texto, el reclamo funciona y **la tabla sigue viva**.
- **GET** a las funciones que gastan algo → 405/404: no se pueden disparar con un enlace o una imagen.
- **Perder y luego «ganar» con el mismo token** → sigue perdida y no se puede reclamar.
- Repetir `terminar_partida` con «perdí» **no** le quita el premio a quien ya ganó.
- `estado()` y `mi_codigo()` de un desconocido **no traen** nombres, celulares ni códigos; las 7 tablas del esquema `app` (incluida la vista de códigos) y el índice de la API no muestran datos de personas.
- **Preguntar «¿este celular ya ganó?»:** con un mismo token solo se puede probar **5 veces**; a la 6.ª el token ya no responde nada útil, y en ningún caso se muestra el código de otra persona.
- **Encabezados de red falsos** (para los límites por IP): `X-Forwarded-For` y `X-Real-IP` inventados no cambian la red reconocida (se decide por `cf-connecting-ip`, que pone Cloudflare delante de Supabase); un `CF-Connecting-IP` inventado lo rechaza Cloudflare (HTTP 403).

Limitación que **no se puede arreglar sin un cambio grande** (y que se acepta, como decidimos desde la Etapa 1): quien sepa programar puede reclamar un premio **sin jugar**: solo tiene que esperar el tiempo mínimo (45 s) y decir que recogió 25 frutas, porque las frutas las informa el celular. Lo que lo frena: los límites por red, el máximo de un código por celular cada 7 días, el cupo por semana (y por día si lo activas), y que hay que ir al local y comprar $30.000 para canjearlo.

## 4. Secretos, PIN y permisos (RLS)

- `npm run revisar-secretos`: revisa **unos 250 archivos y todos los commits** del historial (8 al momento de la prueba). Busca la «secret key» de Supabase, llaves JWT con rol `service_role`, direcciones de la base con contraseña, llaves privadas, PIN/contraseñas escritos en el código y correos personales. **Resultado: limpio.** (Se probó con secretos falsos plantados a propósito y detecta todos los tipos.) El único dato de Supabase en el repo es la clave **pública** (`sb_publishable_…`), que debe estar ahí.
- **Ningún PIN en el repo ni en el JavaScript del navegador.** El PIN de la caja vive cifrado (bcrypt) en la base; la comparación ocurre solo en el servidor. En el código solo existen el PIN y la contraseña **de mentira** de la demo (`?api=falsa`), que no abren nada real.
- **Supabase Auth:** registro de usuarios **apagado** y el único medio de entrada es correo con contraseña (verificado desde afuera con `npm run probar-seguridad`).
- **RLS y permisos:** las tablas viven en un esquema privado (`app`) con RLS activado y sin políticas; solo hay 20 funciones públicas (6 del juego, `diag_red`, 2 de la caja y 11 del administrador). La nueva **auditoría** (`supabase/sql/auditoria_permisos.sql`, se pega en el SQL Editor) revisa todo eso en tu servidor real y dice «✅ Todo en orden» o lista lo que esté abierto.
  - **Hallazgo real de la auditoría:** `public.rls_auto_enable()`, una función que **Supabase** crea sola cuando al crear el proyecto se deja marcado «Enable automatic RLS», quedó ejecutable por `anon` y `authenticated`. Desde afuera no sirve para nada (solo funciona dentro de un evento de Supabase; llamarla da error), pero no tiene por qué ser pública. El SQL ahora se la quita **sin romper el evento** (probado: una tabla nueva sigue quedando con RLS activado). Hay que **volver a pegar** `supabase/todo-junto.sql`.
- **Clickjacking:** la caja y el panel ya no se pueden abrir dentro de otra página (una capa invisible que te haga tocar «Desactivar» sin querer).
- **Privacidad de la IP:** los límites por red guardan solo una **huella** (hash con una sal secreta) y los contadores se borran a los 3 días; la IP nunca se guarda en claro.

## 5. Compatibilidad: Instagram, Facebook, Safari y Chrome móvil

**Lo que se pudo verificar sin celular** (en el navegador del computador, emulando un Android):
- Todo lo que el juego necesita está disponible: WebGL 2, módulos, `fetch`, `ResizeObserver`, CSS `env()/dvh/inset/gap`; el almacenamiento falla con gracia si el navegador lo bloquea; el portapapeles y la vibración tienen alternativa; no hay desbordes horizontales en 375 px.
- **Mínimo real:** iOS 15 y Chrome/WebView 90. Lo dicta Three.js (necesita WebGL 2). En un celular más viejo el juego muestra «Este navegador no puede mostrar el juego»; no se rompe.

**Lo que NO se puede verificar desde el computador (y es lo más importante):**
- Cómo se comporta el **navegador interno de Instagram y de Facebook** en iPhone y Android: gestos, barras que recortan la pantalla, deslizar desde el borde («volver atrás»), almacenamiento separado. Un riesgo conocido: en iPhone, un deslizamiento que empieza en el borde izquierdo puede disparar «atrás» del navegador interno.
- Cómo anda en **Safari y Chrome móvil** reales.

**Cómo probarlo tú:** [pruebas-en-celulares.md](pruebas-en-celulares.md). Resumen: `npm run dev`, abre `http://<IP de tu PC>:5173/diagnostico/` en el celular (¡dentro de Instagram o Facebook: mándate el enlace por mensaje directo!), toca «Probar rendimiento» y «Copiar resultado», prueba los gestos en el cuadro, juega una partida de práctica (`/?debug=1&api=falsa`) y mándame lo que salga. La **prueba definitiva** será con el enlace real `https://` después de publicar (Etapa 7).

## 6. Rendimiento y peso

**Peso de carga** (comprimido, como lo sirve GitHub Pages):

| Parte | KB |
|---|---|
| Three.js recortado | 134,6 |
| Logo (PNG) | 53,5 |
| Código del juego (JS) | 50,7 |
| Fuentes (2) | 26,5 |
| CSS | 3,7 |
| HTML | 0,6 |
| Consulta al servidor | 2,0 |
| **Total** | **≈ 272 KB** (objetivo ≤ 3 MB: usa el 9 %) |

**Arranque:** los 21 archivos del juego se descubrían en cascada (4 niveles). Con `modulepreload` se piden **todos a la vez** (en el computador la cascada pasó de 66 ms a 3 ms; en 4G se ahorra del orden de un segundo).

**Gama baja:** en el computador, un cuadro cuesta **1,8 ms** de promedio (95 % de los cuadros: ≤ 3,9 ms; el peor, 15 ms) de los 16,7 ms que dan 60 FPS. Un celular de gama baja es varias veces más lento, así que **la estimación es que anda justo**: por eso existe el sistema adaptativo (baja la resolución y luego quita el contorno si no llega a 50 FPS) y ahora los celulares que informan **≤ 2 GB de memoria** (Android) arrancan directamente con menos resolución y sin suavizado de bordes. **Esto no está medido en un celular real**: falta la prueba de la guía (sección 3 de `pruebas-en-celulares.md`).

Otros detalles: se eliminó una fuente que ya no se usaba (Luckiest Guy, 28 KB en el repo).

## 7. Textos legales visibles

| Debe verse | Dónde está |
|---|---|
| Consentimiento de datos | Formulario del premio (casilla sin premarcar, texto de la Ley 1581 y «Ver política de datos»); la política dice ahora que los datos se guardan en un servicio en la nube fuera de Colombia |
| Vigencia | Ticket («Vale hasta…» + cuenta regresiva), formulario («Tu código vale 7 días») y «Condiciones» |
| «No acumulable» | Ayuda («Un regalo por código: no es acumulable»), formulario, paso 4 del ticket («con $60.000 tampoco te dan dos») y «Condiciones» |
| Compra mínima | Ayuda, ticket, formulario y «Condiciones» ($30.000, «el regalo no cuenta») |
| Fechas de la temporada | Pantalla de inicio («Campaña: del X al Y»), «Condiciones» y la pantalla «Por ahora no hay campaña» («empieza el…» / «terminó el…»). Salen de las fechas que pongas en el panel; si no hay fechas, «Condiciones» dice que se avisará en las redes. |
| Regalos | Ya no están escritos a mano: salen de la lista que configures en el panel |

Lo que sigue pendiente porque depende de ti: `[DIRECCIÓN DEL LOCAL]`, `[HORARIO DE CAJA]`, `[RESPONSABLE DE DATOS]`, `[CORREO DE CONTACTO]` (siguen como placeholders visibles) y el texto definitivo de términos y condiciones (provisional, Etapa 7).

## 8. Qué se corrigió (lista completa)

| # | Hallazgo | Gravedad | Qué se hizo |
|---|---|---|---|
| 1 | Un script con miles de «dispositivos» podía vaciar el banco semanal | Media | Límites por red: 150 partidas/hora y 8 códigos/día por internet (editables en el panel; 0 = apagado). Probado atómico con concurrencia real. **Recomendado además: activar el cupo diario** (sección 9). |
| 2 | Cualquiera que conociera `/canje/` podía bloquear la caja para todos con 5 PIN malos | Media | Cada red tiene sus 5 intentos (bloqueo de 15 min solo para ella); el bloqueo general solo salta con 30 fallos sumando todas las redes. Desbloquear desde el panel también limpia esto. |
| 3 | Con un token ganador se podía ir preguntando número por número «¿este ya ganó?» | Baja | Máximo 5 celulares probados por token. |
| 4 | `rls_auto_enable()` (de Supabase) abierta a `anon`/`authenticated` | Baja (no se puede usar) | Revocada en el SQL, sin afectar el evento. **Falta que vuelvas a pegar el SQL.** |
| 5 | El juego no decía «no acumulable» ni mostraba las fechas de la temporada, y los regalos estaban escritos a mano | Media (legal/producto) | Textos y pantalla «Condiciones»; regalos y fechas vienen del servidor. |
| 6 | La caja y el panel se podían meter dentro de otra página (clickjacking) | Baja | Se niegan a abrirse dentro de otra página. |
| 7 | Arranque en cascada de 4 niveles; celulares de entrada sin ajuste inicial | Baja | `modulepreload`; ≤ 2 GB arrancan con menos resolución. |
| 8 | Fuente sin uso en el repo | Mínima | Eliminada. |

## 9. Lo que queda pendiente y decisiones tuyas

**Al cerrar la etapa (2026-10-20):** ✅ el SQL se volvió a pegar y la auditoría dice «Todo en orden»; ✅ `probar-canje` y la limpieza de datos de prueba hechos («todo bien»); **cupo diario:** queda como **opción en el panel** (se prende y se apaga, y se elige cuántos por día; lo decidirá con su mamá); **celulares reales:** en pausa (en el iPhone XR ya funciona; se retoma antes de publicar). Lo que sigue pendiente de verdad está en `pendientes.md`.

*(Lo que sigue es la lista original de esa sección, ya resuelta en su mayoría.)*

1. **Volver a pegar `supabase/todo-junto.sql`** (cierra el hallazgo 4). Debe terminar en «✅ Todo en orden».
2. **Decisión: ¿activar el cupo diario?** (por ejemplo 8 al día = 56 por semana; en el panel → Configuración → «Cupo diario»). Si algún programa agota los premios, solo agota **los de ese día**, no los de toda la semana. Si no lo activas, sigue siendo posible vaciar la semana usando varias redes distintas. Mi recomendación: activarlo en cuanto lances. (Es una decisión de producto: con 50 por semana y poco tráfico puede dejar días sin premios; en las primeras semanas se ajusta mirando el panel.)
3. **Limpiar los datos de prueba PRIMERO** con `supabase/sql/limpiar_pruebas.sql` (sin esto `probar-canje` dice «sin-premios»: las pruebas dejaron el banco en 0 y el tope por red agotado), luego **correr `npm run probar-canje`** (te pide el PIN en tu terminal) y **volver a limpiar** (deja 1 código de prueba canjeado). Detalle de lo que dejan las pruebas: las pruebas de hoy dejaron unas 130 partidas y unos 9 códigos falsos y el banco de esta semana está gastado hasta que se limpie.
5. **Pruebas en celulares reales** (sección 5) y, ojalá, un Android de gama baja.
6. **Después de lanzar:** mirar si 150 partidas/hora y 8 códigos/día por red son los números correctos (el panel Resumen y las pruebas muestran el uso); revisar el primer lunes que pase; repetir la prueba de Instagram/Facebook con la URL `https://` real; decidir la URL/dominio **antes de imprimir los QR** (pendientes #14).
7. Opcionales: 2FA para el administrador, bitácora de acciones del admin, plazo de conservación de datos.

## 10. Cómo repetir todo

```
npm run probar-sql          # 235 pruebas del SQL en tu computador (~10 s)
npm run probar-mutaciones   # rompe el SQL a propósito y comprueba que las pruebas lo notan (~2 min)
npm run revisar-secretos    # secretos en el repo y su historial (~1 s)
npm run probar-seguridad    # servidor real: lo del administrador, registro de usuarios (~3 s)
npm run probar-ataques      # servidor real: ataques directos (~5 s); con -- --completo, ~1 min
npm run probar-supabase     # servidor real: concurrencia (~2 min; deja datos de prueba)
npm run probar-canje        # servidor real: canje doble simultáneo (pide tu PIN; ~1 min)
npm run sql                 # regenera supabase/todo-junto.sql (el SQL único que se pega en Supabase)
```
Después de las pruebas del servidor real, corre `supabase/sql/limpiar_pruebas.sql` (solo antes del lanzamiento).
