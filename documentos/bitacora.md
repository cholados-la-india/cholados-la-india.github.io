# Bitácora del proyecto — Cholado Runner

Registro detallado y cronológico de **todo lo que se pensó, se habló, se decidió, se probó y se descubrió**. Está escrito para que Claude (o cualquier persona) pueda retomar el proyecto sin haber leído la conversación original. Si algo aquí contradice un documento más viejo, **manda lo más reciente**.

- Resumen ejecutivo y reglas vigentes: [`CLAUDE.md`](../CLAUDE.md) · Estado de etapas: [`PLAN.md`](../PLAN.md) · Lo que falta: [`pendientes.md`](../pendientes.md)
- Cómo calibrar la dificultad: [`calibrar-dificultad.md`](calibrar-dificultad.md) · Evidencias visuales: [`historial/`](../historial/LEEME.md)

> Fechas: las Etapas 1, 2 y 3 ocurrieron el **2026-10-19** (un solo día de trabajo intenso). Las comillas «…» son palabras textuales del usuario (a veces recortadas).

---

## 0. Quién y con qué

- **El usuario**: estudiante de ingeniería multimedia; conoce GitHub y Unity; **no** conocía Supabase ni Node. Cuenta de GitHub **`hachescc`** (personal y definitiva). El negocio es familiar (**Cholados La India**, Cali, un solo local, sin Rappi por ahora); **su mamá** participa: a ambos les gustó la idea de que el cliente elija personaje. La idea del juego, dice, «se me ocurrió en la ducha»: no hay datos de tráfico esperado.
- **Habla** con voseo informal («tenés», «vos»); a él se le contesta en **tú**, español colombiano. En el juego los textos usan tú y toques caleños suaves.
- **Equipo**: Windows 11 Home, PowerShell 5.1 (también Git Bash), Git 2.53, **GitHub Desktop para los commits** (Claude no hace commit ni push), Node.js LTS **v24.20.0** / npm 11.19 instalados en la Etapa 2, sin Python (no hace falta). **iPhone XR** para probar (iOS); **no tiene Android** de gama baja.
- **Claude** corre en la app de escritorio de Claude (pestaña Code) con un navegador integrado (ver §7 sobre sus mañas).
- El repo es **público** → nunca secretos (PIN, claves, `service_role`) ni correos personales en archivos.

## 1. Etapa 1 — Contexto y preguntas (sin código)

### 1.1 Encargo original (resumen)
Minijuego web para celular (sin instalar nada), runner vertical tipo Geometry Dash/Subway Surfers, con frutas y cholado. Si llegas a la meta ganas un código de descuento único que se canjea en el local. Objetivo: incentivar ventas. Reglas del negocio configurables (banco de 50 códigos por semana que se reinicia el lunes 00:00 Bogotá, 3 intentos por semana, 1 código por celular cada 7 días, vigencia de 7 días desde la expedición, sin login, consentimiento de datos, canje en caja con PIN, panel admin). Stack propuesto: web estática con Three.js en GitHub Pages + Supabase gratis. Ver todas las reglas en `CLAUDE.md` §3–4.

El usuario dio un **plan de 7 etapas** con la regla: *solo se trabaja la etapa pedida; al terminar se resume, se espera visto bueno y se actualiza `PLAN.md`/`CLAUDE.md`*. Y una regla que repitió: **si un prompt viejo contradice algo ya aclarado en el chat, gana el chat.**

### 1.2 Lo que se encontró en `referencias-diseno/` (solo local, 84 MB, fuera de Git)
- **Cholado (5 fotos)**: vaso plástico transparente con rayas horizontales; base de almíbar rojo/magenta; hielo; fruta (kiwi, mango, maracuyá, manzana); leche condensada; oblea cuadriculada; a veces bola de helado con mora/uva; pitillos amarillos o verde lima. Fotos 4 y 5 son reales de noche sobre mesa naranja. `cholado2` tiene halos sucios en el recorte.
- **Raspado (3 fotos)**: torre de hielo rosado con chorreones de leche condensada y rodaja de limón.
- **Marca**: «india vectorizada» (busto de perfil con penacho azul/rojo/amarillo/naranja, top verde, pintura roja en la mejilla; PNG transparente, **sin cuerpo**); logo tipográfico «CHOLADOS LA INDIA» (degradado amarillo→naranja con contorno y sombra negra); eslogan «¡Aquí Desafiamos La Sed y Castigamos El caLor!» y la silueta de vaso; pendón (degradado naranja→amarillo→verde, dos Indias espejadas); **menú** en PDF (magenta, arco verde lima, etiquetas celestes; @cholados.laindia en Instagram, «Cholados La India» en Facebook).
- **Precios del menú**: Raspao $8.000 (personal) / $11.000 (grande); Cholado $15.000 / $20.000; especiales $18.000 / $21.000 (Maracuyazo, Mangazo, Maluma, Maracumango, Maracululo, Mataguayabo, Guanabanazo). El menú habla de «Personal/Grande», no de «10 oz».
- **Juegos de referencia** (Temple Run, Minion Rush, Subway Surfers): el usuario aclaró que son para **mecánicas, animaciones e interacción**, **no** para copiar el estilo visual.

### 1.3 Las 10 preguntas y las respuestas del usuario
| # | Tema | Respuesta |
|---|---|---|
| 1 | Controles | Runner **vertical** estilo Subway/Minion Rush/Temple Run: **3 carriles**, deslizar el dedo. Deslizar hacia abajo no se descarta pero **queda fuera por ahora**. |
| 2 | Choque / dificultad | Elegir yo (Claude) y calibrar después. Quien gane debe llegar a la meta. → provisional **3 vidas**. |
| 3 | Personaje y nombre | Sin decidir. Nombres que le gustan: *Corre por tu cholado*, *Cholado Run*, *Atrapa tu cholado*. (Personaje: ver §3.8 — se resolvió: el cliente elige.) |
| 4 | Banco / tráfico | No sabe cuánta gente; «ya luego vamos viéndolo». |
| 5 | Premio | El cholado normal es de **14 oz**; el regalo es de **10 oz**. Con **≥ $30.000** en productos pagados el cliente **elige en caja** entre **raspao personal** o **cholado de 10 oz**. Un solo local, sin Rappi. |
| 6 | Staff | Cualquiera que atienda; **un PIN compartido** (cambiable). El sistema no puede verificar los $30.000: lo valida quien atiende. |
| 7 | Legal | Analizar si la Ley 1581 aplica; si no, descartar; si sí, dejar pendiente. → ver `pendientes.md` (aplica, carga liviana). |
| 8 | URL | **hachescc** es la cuenta definitiva. Dominio propio: «depende de qué nos vaya». |
| 9 | Assets | **Todo por código** (no tiene tiempo de modelar). Fotos reales reducidas permitidas. A futuro quizá pida modelos «bien producidos» a otro chat. Libertad creativa a Claude. |
| 10 | Temporada | **Sonido y música: sí** (salsa, caleño, frescura). Entre temporadas solo cambian fechas; premio y tema visual no cambian (sujeto a cambio). |

Otras respuestas: vectores originales existen pero «hacelo con lo que tenés»; paleta y tipografía «de lo que veas por ahí», «sea frutal»; dirección y horario del local **no los tiene a mano** → placeholders y `pendientes.md`; `referencias-diseno/` **fuera de Git**; la leyenda de `indialogo2` es irrelevante.

### 1.4 Decisiones técnicas propuestas (y por qué)
- **Supabase** (Postgres + funciones SQL + RLS + Auth) sobre alternativas: Firebase (lógica de servidor exige plan de pago), Google Sheets (sin transacciones reales → riesgo de códigos duplicados), Cloudflare Workers + D1 (gratis y serio, pero más código). Lo decisivo: la **asignación atómica** de códigos sale casi de fábrica con una función SQL, y no pide tarjeta. **Verificar límites vigentes y la pausa por inactividad en la Etapa 4.**
- **Validar la victoria en el servidor** (token de partida + tiempo mínimo jugado) para que nadie vacíe el banco con un script.
- **Intentos por ID anónimo** del navegador contado en servidor; se acepta que Instagram (almacenamiento aparte) y Safari/Chrome den intentos separados (antifraude bajo).
- Semana y vencimientos en **hora de Bogotá (UTC−5, sin horario de verano)**; fechas guardadas en UTC.
- **JS plano sin build** + Three.js copiado al repo (sin CDN: más fiable en los navegadores de Instagram/Facebook).
- **GitHub Pages publica todo el repo** si se despliega desde la raíz → el juego vive en `web/` y se publicará solo esa carpeta (workflow, Etapa 7).
- Vencimiento: se propuso `expedición + 7 días − 1 minuto` para el ejemplo «martes 2:51 p. m. vale hasta el martes siguiente 2:50 p. m.»

### 1.5 Ley 1581 de 2012 (resumen; detalle en `pendientes.md`)
Nombre + celular **sí son dato personal**; el negocio no cae en la excepción doméstica; al guardarlos (necesario para el límite por celular y el canje) hay «tratamiento». **El registro ante la SIC (RNBD) probablemente no es obligatorio** (solo para sociedades con activos > 100.000 UVT; Decreto 090 de 2018) pero eso no exime de cumplir la ley. Mínimo razonable: casilla de consentimiento sin premarcar, texto con la finalidad, quién es el responsable y cómo corregir/borrar, aviso de proveedor en la nube, política corta, plazo de conservación. **No soy abogado; conviene confirmarlo.**

### 1.6 Instalación de Node
`winget install OpenJS.NodeJS.LTS` → Node v24.20.0. Surgió el error de PowerShell *«la ejecución de scripts está deshabilitada»* al correr `npm`: se resolvió con `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. (Ver §7 para el PATH en el shell de Claude.)

## 2. Etapa 2 — Estilo gráfico (previews)

### 2.1 Infraestructura creada
- `npm run dev` (`tools/dev-server.mjs`): servidor estático sin dependencias, puerto 5173, visible en la red wifi (`http://192.168.x.x:5173`) para probar en el celular; sirve gzip como lo haría GitHub Pages; ruta `/__info` (IP) y `/historial/`.
- **Three.js 0.186.1** copiado recortado: desde r186 ya **no trae versión minificada** (completo ≈ 2 MB). `npm run vendor` (`tools/vendor-three.mjs`, esbuild) busca cada `THREE.Algo` usado en `web/` y empaqueta solo eso (≈ 532 KB, 135 KB gzip). **Repetir el comando cuando el código use una clase nueva de Three.js.**
- Fuentes autoalojadas (OFL): **Fredoka 600** (HUD), **Lilita One** (títulos), Luckiest Guy (solo se usó en el preview B). Logo optimizado a 380 px.

### 2.2 Ronda 1 (A, B, C) — probada en el iPhone XR: ~60 FPS en las tres (mínimo 57)
- **A · low poly facetado**: **descartado** — «parece un prototipo, literalmente un juego que no está terminado».
- **B · cartoon con contorno negro grueso**: **no** — «parece el típico diseño hecho por IA… mucha predominancia en negro». Gustaron las **sombritas** y la **definición** del contorno.
- **C · jugoso (matcap, colores del menú)**: **favorito**, «un A súper mejorado»; «se ve un poco low poly pero eso no es malo, el hecho es que sea ligero». Le gustó que La India tuviera más detalle.
- Dijo que el cholado «le falta color» y que **no lleva decoraciones por fuera**; adentro del vaso hay piña, guanábana, banano, maracuyá, papaya; manzana roja al costado; arriba helado, uvita, wafer, pitillo y **cuchara**.

### 2.3 Ronda 2 (D, E, F) + resultado
- **D** jugoso + trazo fino de color; **E** sombreado en 4 escalones + trazo; **F** escalones pintados en el matcap sin contorno (Lilita One).
- Al usuario le gustaron **D y F**. **E se descartó**: la luz ambiente quedó mal calibrada (sin sombras visibles, muy saturada, mucho brillo y contraste) — error de Claude.
- **Elegido: G = mezcla D + F**: matcap con `pasos: 3, mezcla: 0.5` (sombritas suaves, sombras violeta), brillo del material `1.15` (no subirlo: satura), **contorno fino de color** (color del objeto × 0,3 mezclado con ciruela `#3a0f33`, nunca negro) de **1,5 px** («un poquitico más grueso, muy leve») solo en lo jugable. Vale **igual para el choladito y para La India** (el usuario pidió explícitamente aplicar todo a los dos). Reacción: «me encantó, captaste exactamente lo que quería».
- Costos medidos: ~19.400 triángulos (choladito) / ~15.100 (India), 24–25 llamadas de dibujo, ~0,16 MB comprimido.
- El usuario avisó que **faltan detalles gráficos** (frutas del cholado que parecen «afuera» del vaso, bola de helado «pintada hasta la mitad», más detalle en La India y el entorno) pero **se hacen después de todas las etapas**. Los colores podrían cambiar en el futuro.

## 3. Etapa 3 — Prototipo jugable (sin backend)

### 3.1 Encargo (Prompt 3) y desviaciones decididas
Runner vertical, obstáculos, frutas opcionales, barra de progreso, pantallas (inicio con premios e intentos restantes, jugar, ganaste, perdiste con intentos restantes, sin intentos), partida de ~60 s con meta única, **toda la dificultad en un archivo de configuración**, modo `?debug=1` con FPS y deslizadores en vivo, dificultad inicial «1 de cada 4 o 5», rendimiento a 60 fps en gama baja (avisar si no se puede), API del servidor **simulada** y fácil de reemplazar.
- El prompt decía «control de un solo toque»; el chat había decidido **3 carriles con deslizar** → se hicieron ambos (un toque también salta).
- La cifra «1 de cada 4 o 5 (20–25 %)» **reemplazó** al ~35 % que Claude había propuesto en la Etapa 1.

### 3.2 La idea del historial
El usuario pidió una carpeta con **evidencias del proceso** («si la idea termina siendo un éxito, ver cómo empezó»). Se creó `historial/` (hitos congelados de `web/` + capturas + `hitos.json` + página `/historial/`) y `npm run hito`. Hitos: `01-estilos-a-f`, `02-estilo-g-elegido`, `03-prototipo-v1`, `04-prototipo-v2`. **No se borran ni se editan hitos viejos.** Se protegió con `!historial/**` en `.gitignore` y un aviso del script si Git ignorara algo.

### 3.3 Diseño del juego (decisiones de arquitectura)
- **El juego va por tiempo**: dura 60 s y la meta aparece al final; la velocidad sube linealmente; un choque quita vida y da 1,3 s de invulnerabilidad pero **no frena** (así siempre dura ~60 s). Por eso los deslizadores de debug se aplican en vivo.
- **Lógica pura** (sin Three.js ni DOM) para poder probar en Node y simular con un bot: `logica.js`, `nivel.js`, `bot.js`. `escena.js` solo dibuja.
- **Obstáculos**: caja baja, pila alta (no se salta), barra baja (3 carriles), doble. Cada fila garantiza **siempre una salida** (control de alcanzabilidad entre filas).
- **Frutas** en hileras (~70 por partida), opcionales al inicio; luego se volvieron obligatorias en parte (§3.7).
- **API falsa** (`api-falsa.js`, localStorage) que imita al servidor: intentos por semana, banco que se reinicia el lunes 00:00 Bogotá, token de partida, tiempo mínimo jugado, 1 código por celular, vigencia, códigos con alfabeto sin `0/O/1/I`. `api.js` es la **única puerta**; el contrato está documentado ahí y en `CLAUDE.md` §11.
- **Rendimiento**: carga inicial ≈ **0,26 MB** comprimida; shaders precompilados al cargar (`renderer.compile`) para evitar un tirón al primer choque; **calidad adaptativa** (baja resolución y luego quita el contorno si no sostiene `fpsMinimo`; si bajar no mejora —p. ej. iPhone en modo de bajo consumo a 30 fps— vuelve atrás y no insiste).
- **Escena**: una malla fusionada por personaje/objeto, `InstancedMesh` para lo repetido, sombras falsas, cielo en CSS. Objetos que ya pasaron se encogen y desaparecen (si no, tapan la cámara); el arco de meta se encoge al pasar sobre el jugador.

### 3.4 El simulador con bot — cómo evolucionó (importante para entender los números)
1. **Bot v1** (decide cada fila por separado, perfecto): con la config de arranque ganaba 90 % → no servía; velocidad y densidad casi no lo afectaban.
2. **Bot v2** (atención secuencial: una fila a la vez, tarda `reaccionS`; se atrasa si las filas llegan muy seguidas): algo más sensible.
3. **Bot v3** (sus errores —distracción y error de salto— **crecen con la velocidad**): ahora sí responde a los deslizadores. Tres perfiles: **Novato / Normal / Experto**.
4. Con la config «1 de cada 4 o 5» el bot daba: Novato ~2 %, **Normal ~19 %**, Experto ~92 %. Estimación para una mezcla de jugadores ≈ 23 %.
5. **Bot v4**: persigue frutas (`ambicionFrutas`) → choca más → números más bajos (ver §3.7). **Es pesimista**: solo una guía para comparar ajustes; la verdad se mide jugando (`?debug=1` → estadísticas).
- `npm run simular` y el botón «Simular» de `?debug=1` usan el mismo código (1.000 partidas ≈ 0,5–1 s).

### 3.5 Bugs que Claude encontró y arregló durante las pruebas
- Contorno de los objetos repetidos se dibujaba con `count` completo → bultos fantasma en el origen (fix: igualar `count` de la malla y de su contorno).
- Selector de personaje tapaba al personaje (se movió a la cabecera).
- Cajas ya pasadas se quedaban entre la cámara y el personaje (se encogen y desaparecen).
- Calidad adaptativa medía cuadros del arranque/pausa y bajaba sin necesidad; y degradaba en vano con 30 fps forzados → se agregó espera de 2,5 s, medición solo mientras se juega y «volver atrás si no mejora».
- Victoria rechazada por «tiempo mínimo» al acelerar el reloj en pruebas → es la API falsa haciendo su trabajo; se mostró un mensaje claro en vez de «¡Casi!».
- Doble punto («p. m..») en el mensaje de espera de cupón.

### 3.6 Primer feedback del usuario tras probar (2026-10-19) y qué se hizo
Dijo: «Todo está perfecto, me encantó todo», y pidió:
1. **Deslizar muy fuerte se pasaba dos carriles** → debe ser como Subway Surfers: *un deslizamiento = un carril*. Causa: se reiniciaba el punto de partida para «encadenar» gestos. Fix: **un gesto por toque**.
2. **Selector Choladito / La India permanente** («a mí y a mi mamá nos gusta… se ve más completo, más divertido»). Hecho; se recuerda en el navegador.
3. **Mínimo de frutas** para ganar, además de llegar a la meta (antes se podía ganar sin recoger ninguna).
4. **Un poco más difícil y más rápido progresivamente**, todo editable («vos sabés cómo es calibrar un juego»).
5. **Celular limitado a 10 dígitos** (se podía escribir cualquier cantidad).
6. **Un cupón por número**: «si no, una persona se lleva todos los cupones… el hecho es que llegue a la mayor cantidad de clientes posible»; cooldown. Dijo «3 días» y luego «2 días», confundido; Claude dejó **7** (la regla original). **El usuario confirmó después: «deja lo de los 7 días como está… si algo en un futuro te digo que lo cambies, no es nada grave».**
7. Que **el historial no se pierda**.
8. Una **lista de cosas por corregir antes de la Etapa 4**, y pidió reconfirmar que la Etapa 4 es el backend (sí: Supabase).
- Lo estético se deja para después de todas las etapas.
- Decisión de seguridad tomada por Claude: la pantalla de «este número ya tiene un cupón» **no muestra el código** de ese número (si no, cualquiera vería el cupón de otra persona escribiendo su celular). Quien lo reclamó lo ve con «Ver mi código» en su propio navegador.

### 3.7 Números de la dificultad actual
- Salen **~71 frutas** por partida. Quien **ignora** las frutas recoge **~24 por casualidad** (P10 13, P90 36); quien las **busca** recoge ~30–34. Por eso un mínimo de 15 no obligaba a nada; se dejó **25**.
- Velocidad **9 → 13,5** pasó a **9,5 → 14,5** u/s; separación entre filas 1,5 → 0,95 s (sin cambio); tolerancia 0,18; 3 vidas.
- Resultados del bot (2.000 partidas por perfil):

| Ajuste | Velocidad | Frutas mín. | Novato | Normal | Experto |
|---|---|---|---|---|---|
| Antes (sin mínimo de frutas) | 9 → 13,5 | 0 | ~2 % | ~19 % | ~92 % |
| Suave | 9 → 13,5 | 18 | 1,7 % | 12,6 % | 58,9 % |
| **Actual** | 9,5 → 14,5 | **25** | 0,5 % | 6,2 % | 46,1 % |
| Difícil | 10 → 15,5 | 32 | 0,7 % | 4,2 % | 26,0 % |

- Claude advirtió que el juego quedó **bastante más duro** que antes y que el bot es pesimista. El usuario lo probó y respondió **«la prueba: todo bien»** → se queda así por ahora; recalibrar con gente real.

### 3.8 Decisión de personaje (cerrada)
**El cliente elige** entre Choladito y La India (selector permanente en el inicio). Arranca con La India. Claude había recomendado La India corriendo y el cholado como meta; el usuario prefirió dejar elegir. (El cholado grande sí aparece como **premio sobre el arco de meta**.)

### 3.9 Métricas de referencia (PC de desarrollo; no extrapolar a celulares)
- Por cuadro: 19–29 llamadas de dibujo, ≤ ~22.000 triángulos; costo medio ~6 ms (p95 ~16 ms) con sincronización de GPU forzada.
- Carga inicial: 261 KB comprimido (Three.js 135 KB, código del juego ~45 KB, fuentes + logo ~80 KB). `?debug=1` agrega ~7 KB (`debug.js` + `bot.js`) solo para quien lo abre.
- **No** se midieron FPS reales en celular dentro de esta sesión (el navegador de Claude no sirve para eso). El usuario probó los previews en su iPhone XR (60 FPS) y el prototipo («todo bien»).

## 4. Cómo le gusta trabajar al usuario (para seguir igual)
- Quiere **preguntas antes que suposiciones**, **cambios pequeños**, y que se le **explique cada paso como si no supiera** (Node, Supabase…).
- **Preview en localhost antes de cada commit; los commits los hace él** con GitHub Desktop. Al cerrar cada etapa: resumen de lo hecho + archivos tocados + **una frase corta para el commit** + esperar su visto bueno.
- Le gusta el proceso: pidió las evidencias (`historial/`), una **lista de cosas por corregir** antes de pasar de etapa, y que todo quede en `.md` para sobrevivir a compactaciones.
- Detesta lo «hecho por IA» (trazo grueso negro), lo que «parece prototipo», y los colores muy saturados/brillantes. Valora lo limpio, lo ligero y lo bonito.
- Da mucho feedback hablado/largo, con ideas a medias y autocorrecciones («no, sí, es que…»): conviene **ordenarlo en una lista numerada**, confirmar lo ambiguo y reportar qué entendí.
- Quiere que lo estético se mejore **al final**, no ahora. Quiere honestidad: «avísame si no se puede» (p. ej. 60 fps en gama baja).
- Cuando algo no está resuelto: **placeholders visibles + `pendientes.md`**, nunca inventar (dirección, horario, responsable de datos, fechas de campaña).

## 5. Cosas que el usuario dijo sobre el futuro (para no olvidarlas)
- Más elementos de escenario a medida que avance; que la velocidad aumente progresivamente (hecho); colores cambiables más adelante.
- Modelos mejor producidos del cholado/La India quizá con otro chat.
- Música/sonidos caleños, frescos (pendiente de decidir cuándo; solo pistas con licencia libre o generadas).
- Dominio propio: según cómo vaya el negocio. Un Android de gama baja: no tiene.
- Calibrar la dificultad cuando la pruebe más gente; el panel admin (Etapa 5) mostrará partidas/ganadores/canjes reales.
- Una persona no debe llevarse varios cupones: prioridad = que llegue a más clientes.

## 6. Referencias técnicas que Claude consultó
- Ley 1581 de 2012, Decreto 1377 de 2013, Decreto 090 de 2018 (RNBD) — enlaces en `pendientes.md`.
- Three.js r186 (sin build minificado), `WebGLRenderer.compile`, `InstancedMesh`, `MeshMatcapMaterial`, `MeshToonMaterial`.

## 7. Lecciones del entorno de herramientas (gotchas) — leer antes de probar
- **Node no está en el PATH del shell de Claude** (se instaló después de abrir la sesión): anteponer `$env:Path = 'C:\Program Files\nodejs;' + $env:Path` en PowerShell antes de `node`/`npm`.
- **PowerShell 5.1**: no existe el operador ternario `?:`; `ConvertTo-Json $arreglo` (como parámetro) envuelve el arreglo en `{value, Count}` → **editar JSON con Node, no con PowerShell** (así se dañó `hitos.json` una vez); `Get-Content` muestra tildes rotas aunque el archivo esté bien en UTF-8 (usar la herramienta Read para verificar).
- **Navegador integrado de Claude (panel Browser)**:
  - Si el panel está **oculto**, la página se marca `hidden`: **`requestAnimationFrame` se detiene**, salta la **pausa automática** (`visibilitychange`) y a veces la captura sale de una **página recargada** (se pierde el estado). Solución: llamar a `mcp__ccd_view__show_pane` (`preview`) antes de cada lote y agrupar JS + captura en un `browser_batch`.
  - Para probar sin depender de `rAF`: con `?debug=1` existe `window.__cholado.tick(dt)`; poner `cfg.desarrollo.autoPausa = false` y `invencible = true`, y usar el bot (`/js/game/bot.js`) para jugar. Las capturas se guardan en `…\.claude\projects\…\tool-results\` (fuera del repo): copiarlas a `historial/NN/capturas/`.
  - Mide FPS **no** es fiable ahí. Los FPS reales se miden en el iPhone con `?debug=1`.
  - El viewport móvil emulado es 375×812; hay que **restablecer a desktop** al terminar.
- **Servidores**: el usuario corre su propio `npm run dev` en 5173; el de Claude (`preview_start`) cae a 5174 si está ocupado → **detener el de Claude al terminar**.
- Las rutas `…/tool-results/…jpg` cambian de nombre en cada captura; copiar enseguida.
- Los 2 «404» de consola al cargar en el panel de Claude **no son archivos del juego** (todos los recursos responden 200); suelen ser peticiones del propio navegador de desarrollo.
- `navigator.vibrate` solo funciona tras un toque del usuario (Android; iOS no vibra): ya hay guarda.

## 8. Estado al cierre de la Etapa 3
Prototipo jugable completo con API falsa, historial con 4 hitos, documentación al día, previews borrados de `web/` (viven en `historial/01` y `02` y en el commit de la Etapa 2). **Siguiente: Etapa 4 (Supabase / backend)**; el usuario pegará el prompt correspondiente. Ver `CLAUDE.md` §11 («Insumos ya decididos para la Etapa 4»).
