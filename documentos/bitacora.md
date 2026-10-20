# Bitácora del proyecto — Cholado Runner

Registro detallado y cronológico de **todo lo que se pensó, se habló, se decidió, se probó y se descubrió**. Está escrito para que Claude (o cualquier persona) pueda retomar el proyecto sin haber leído la conversación original. Si algo aquí contradice un documento más viejo, **manda lo más reciente**.

- Resumen ejecutivo y reglas vigentes: [`CLAUDE.md`](../CLAUDE.md) · Estado de etapas: [`PLAN.md`](../PLAN.md) · Lo que falta: [`pendientes.md`](../pendientes.md)
- Cómo calibrar la dificultad: [`calibrar-dificultad.md`](calibrar-dificultad.md) · Evidencias visuales: [`historial/`](../historial/LEEME.md)

> Fechas: las Etapas 1 a 5 ocurrieron el **2026-10-19** (un solo día de trabajo intenso; la 5 se cerró pasada la medianoche del 20). Las comillas «…» son palabras textuales del usuario (a veces recortadas).

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

---

## 9. Etapa 4 — Backend con Supabase (2026-10-19)

### 9.1 Encargo (Prompt 4) y cómo se resolvieron las contradicciones (gana el chat)
Backend en Supabase gratis; el usuario no conoce Supabase → guiar paso a paso. Tablas de configuración, partidas y códigos; **toda la lógica en funciones RPC con RLS** (el cliente solo usa la clave pública y esas funciones); reclamo **atómico**; semana desde el lunes 00:00 de Bogotá; reloj del servidor; vigencia exacta de 7 días; un código por celular cada 7 días; intentos por semana ligados a un **id anónimo del dispositivo**; conectar el juego.
- **Regalo**: el prompt decía que `reclamar` recibe el regalo elegido. Contradice lo decidido (el cliente elige **al canjear en caja**). → la columna `regalo_elegido` existe pero se llena en la Etapa 5; `reclamar_codigo` NO la recibe.
- **Código**: formato `LAINDIA-7K3Q` (prefijo + 4 caracteres de un alfabeto de 32 sin `0/O/1/I`), único (restricción UNIQUE + reintento). El prototipo mostraba 6 caracteres; se cambió. Prefijo y largo son configurables.
- **Vigencia («exacta de 7 días»)**: el ejemplo del usuario era «martes 2:51 p. m. vale hasta el martes siguiente 2:50 p. m.». Se resolvió así: `vence_en = date_trunc('minute', expedición) + 7 días exactos` (el código sirve mientras `ahora < vence_en`) y la pantalla muestra «vale hasta» **vence − 1 minuto** (la última hora completa válida). Cumple ambas frases. (Reemplaza mi propuesta anterior `expedición + 7 d − 1 min`; si el usuario prefiere otra cosa, es una línea en `app.vencimiento`.)
- **7 días por celular**: confirmados por el usuario.

### 9.2 Dudas de diseño que se le preguntaron al usuario y sus respuestas
1. **¿Cuándo se crea el código?** → **Al reclamar** (recomendado). No hay lista pre-hecha de 50; el tope semanal es un contador de códigos expedidos + premios apartados. Más simple y sin tareas programadas.
2. **¿Qué pasa con el premio mientras se llena el formulario?** → **Apartarlo 15 min** al ganar (editable: `ventana_reclamo_min`). Evita ganar y que justo se acaben. Si no se reclama, se libera; si la reserva venció pero aún hay cupo, igual puede reclamar (hasta 6 h después).
3. **¿Dificultad editable desde el servidor?** → **Sí**. Se guarda en `app.configuracion` (columna `juego` jsonb, más columnas propias `duracion_partida_s` y `frutas_minimas` que el servidor también valida). El juego la lee con `estado()` y la mezcla encima de `config.js` (que queda como «valores de fábrica» y para la API falsa). Se cambia desde el SQL Editor con `select app.ajustar_juego('{...}')`; el panel admin (Etapa 5) lo hará con botones.

### 9.3 Arquitectura del servidor (`supabase/migrations/`)
- **Esquema privado `app`** (no expuesto por la API): tablas `configuracion` (1 fila), `partidas` (su `id` es el token) y `codigos`; vista `v_codigos` con `estado_efectivo`. RLS activado **sin políticas** y permisos revocados a `anon/authenticated`. Defensa doble.
- **6 funciones `SECURITY DEFINER` en `public`**, las únicas con `EXECUTE` para `anon`: `ping`, `estado`, `iniciar_partida`, `terminar_partida`, `reclamar_codigo`, `mi_codigo`. Utilidades internas en `app.*` (sin permisos para el público).
- **Atomicidad**: `terminar_partida` (si gana) y `reclamar_codigo` toman el **mismo candado global** `pg_advisory_xact_lock('cholado:premios')`, **siempre antes** del bloqueo de fila (mismo orden → sin interbloqueos). `iniciar_partida` usa un candado por dispositivo (nadie saca un 4.º intento con llamadas simultáneas). La capacidad se comprueba al **apartar** (terminar) y, si la reserva venció, al reclamar.
- **Cupos**: `restantes = tope − códigos de la semana − reservas vigentes` (y, si `cupo_diario > 0`, también el del día; entonces «reinicia» = mañana 00:00).
- **Estados de un código**: se guardan `activo | canjeado | desactivado`; **`vencido` se calcula** (`activo` y `now() >= vence_en`), así nunca está desactualizado y no hace falta una tarea programada. Los vencidos **no se reciclan** (quedan en la tabla).
- **Idempotencia**: repetir `terminar_partida` o `reclamar_codigo` (doble toque, mala señal) devuelve el mismo resultado/código; por eso el cliente puede reintentar.
- **Privacidad**: si el celular ya reclamó, la respuesta trae `puedeVolverISO` y **no** el código. «Ver mi código» busca por **dispositivo**, no por celular.
- **Validación del servidor** (no le cree al celular): token existente, tiempo jugado ≥ `min(minimo_jugado_s, 0,75×duración)`, `frutas ≥ frutas_minimas`, nombre 2–60 sin caracteres de control, celular colombiano de 10 dígitos (acepta +57), consentimiento obligatorio.
- **Hora**: semana y día en `America/Bogota` con funciones puras (`app.inicio_semana`, `app.semana_de`, `app.dia_de`, `app.vencimiento`) probadas con 3 zonas horarias de sesión; no dependen de la zona de la sesión.

### 9.4 Cliente (`web/js/`)
- `api.js` elige entre `api-supabase.js` (si `supabase-config.js` tiene `url` y `clave`) y `api-falsa.js`; **`?api=falsa`** fuerza la falsa (calibrar sin gastar intentos reales; en `?debug=1` mandan `config.js` y los deslizadores, no la dificultad del servidor).
- `api-supabase.js` usa solo `fetch` al REST de Supabase (`/rest/v1/rpc/<función>`), sin librerías (carga más liviana), con tiempo máximo de 12 s y reintentos solo en las funciones idempotentes. La clave `sb_publishable_…` va en la cabecera `apikey` (las `eyJ…` también como `Bearer`).
- `dispositivo.js` (id anónimo en `localStorage`; respaldo en memoria), `reloj.js` (diferencia con la hora del servidor, para las cuentas regresivas), `util.js` (`fusionar`, `formatoRestante`).
- `main.js`: aplica `estado.juego` y `estado.reglas` sobre `cfg`; «Ver mi código» consulta `mi_codigo` (ya no usa `localStorage`); nuevas pantallas/estados: ticket con cuenta regresiva y estados canjeado/vencido, «¡Llegaste, pero se acabaron!» (ganó pero otra persona tomó el último premio), aviso «tu premio está apartado por 15 minutos».
- `api.js` documenta el contrato nuevo (`miCodigo`, `ahoraISO`, `reglas`, `juego`, `miCodigoActivo`).

### 9.5 Pruebas
- `npm run probar-sql` (PGlite = Postgres dentro de Node, `tools/probar-sql.mjs`): **86 comprobaciones** (fechas en 3 zonas horarias, formato de códigos, intentos, validaciones, reservas, cupo semanal y diario, cooldown por celular, `mi_codigo`, campaña, dificultad, permisos de `anon`, idempotencia de las migraciones). No cubre concurrencia real (una sola conexión).
- `npm run probar-supabase` (`tools/probar-supabase.mjs`): contra el servidor real; concurrencia de verdad (ver `supabase/LEEME.md`). Deja datos de prueba → `supabase/sql/limpiar_pruebas.sql`.

### 9.6 Plan gratis de Supabase (verificado el 2026-10-19)
2 proyectos activos, 500 MB de base de datos, 5 GB de egress, **sin backups automáticos**; los proyectos **se pausan tras ~1 semana sin actividad** (se reactivan a mano; dos versiones de la documentación dan 90 días o 1 año como plazo de restauración). Fuentes: `supabase.com/pricing` y `supabase.com/docs/guides/platform/free-project-pausing`. Mitigación prevista (Etapa 7): tarea gratis de GitHub Actions que llame a `ping()` cada día. Claves nuevas: `sb_publishable_…` (segura en el navegador) y `sb_secret_…` (nunca); las viejas `anon`/`service_role` se retiran a fines de 2026.

### 9.7 Guía que se le dio al usuario para crear la cuenta (por si hay que repetirla)
1. `supabase.com` → **Start your project** → **Continue with GitHub** (cuenta `hachescc`). 2. Organización **Cholados La India**, tipo Personal, plan Free. 3. **New project**: nombre `cholado-runner`, **contraseña de la base** generada y guardada en un lugar seguro (**no se comparte ni se pega en archivos**), región **South America (São Paulo)**, plan Free. 4. Esperar ~2 min. 5. Copiar la **Project URL** y la **Publishable key** (Project Settings → API Keys; o la `anon` `eyJ…`) y pasarlas por el chat: son públicas. **Nunca** la secret/`service_role` ni la contraseña de la base. 6. Pegar `0001_tablas.sql` y luego `0002_funciones.sql` en SQL Editor (ver `supabase/LEEME.md`).

### 9.7b Resultados reales (contra el servidor de Supabase del usuario, 2026-10-19)
- Proyecto: `cholado-runner`, organización «Cholados La India», plan Free, región **East US (North Virginia)**. *(Claude había recomendado São Paulo «por estar más cerca»; se corrigió: desde Colombia el tráfico sale hacia EE. UU., Virginia queda más cerca en latencia y Supabase la marca como recomendada.)* Formulario de creación: Data API **activada**, «Automatically expose new tables» **desmarcada**, «Enable automatic RLS» marcada (inofensiva: nuestras tablas están en `app`).
- **URL pública** `https://vaphorsfnfuebfjuhmof.supabase.co` (SIN `/rest/v1`: el cliente lo agrega) y **publishable key** `sb_publishable_…` quedaron en `web/js/supabase-config.js`. Funcionan con solo la cabecera `apikey` (no hace falta `Authorization`). Son públicas por diseño.
- El SQL se pegó en **SQL Editor → «+» → Create a new snippet** (primero `0001`, luego `0002`), sin errores a la primera; comprobación `select public.estado(gen_random_uuid());` devolvió `jugable: true`, 50 premios.
- **`npm run probar-supabase`: 35/35 ✓.** Seguridad (tablas 404/406, funciones internas inaccesibles), 8 inicios simultáneos de un dispositivo → exactamente 3, victoria falsa a los segundos → rechazada, 3 frutas → rechazada, 5 reclamos con el mismo celular → exactamente 1 código y 4 `ya-tienes-codigo` sin revelar el código, `mi_codigo` con ~7 días, **100 ganadores a la vez con cupo 45 → se apartaron exactamente 45, los otros 55 `sin-premios`, 45 reclamos simultáneos → 45 códigos todos distintos, banco en 0**, reclamo repetido → mismo código. La hora del servidor coincidió con la del computador (0 s).
- **Partida manual completa** (con el bot jugando en el navegador contra el servidor real, esperando los 45 s reales exigidos): `Quedan 50 premios` → ganó con 57 frutas → pantalla «Tu premio está apartado por 15 minutos» → celular `+57 300 123 4567 99` se limitó a `300 123 4567` → código **`LAINDIA-QB9A`**, «vale hasta el lunes 26 de octubre, 8:50 p. m.» (expedido ~8:51 p. m.), cuenta regresiva «6 d 23 h 59 min» → inicio con «Quedan 49 premios / Te quedan 2 intentos de 3» → «Ver mi código» trajo el ticket desde el servidor.
- **Sin conexión**: si `fetch` falla, el juego reintenta unos 3 s y muestra «No pudimos conectarnos… Reintentar»; al volver la conexión, el botón recupera.
- **Dificultad desde el servidor**: el usuario corrió `select app.ajustar_juego('{"velocidad":{"inicial":11},"partida":{"frutasMinimas":24}}')`; `estado.juego` devolvió `{"partida":{"duracionS":60,"frutasMinimas":24},"velocidad":{"inicial":11}}`; el juego con `?debug=1&servidor=1` mostró `velocidad.inicial = 11` (final siguió en 14,5: la mezcla no borra) y la ayuda dijo «al menos 24 frutas»; con `?debug=1` solo, siguió en 9,5 y 25. **Quedó pendiente restaurar** (`update app.configuracion set juego = '{}'::jsonb, frutas_minimas = 25 where id = 1;`).
- Datos de prueba que quedaron en la base: los de `probar-supabase` (se borraron con `limpiar_pruebas.sql` antes de la partida manual) y el código `LAINDIA-QB9A` + 1 partida de la prueba manual.
- Nota de pruebas: el servidor real exige tiempo real (45 s) entre `iniciar_partida` y `terminar_partida`; en el navegador de Claude se adelanta el juego con `tick` y luego se espera de verdad (dos llamadas JS de ~30 s).

### 9.8 Riesgos y notas abiertas de esta etapa
- **Antifraude**: un script con muchos id de dispositivo podría gastar el banco esperando 45 s por partida; limitar partidas por IP (con cuidado: muchas personas comparten IP móvil) queda para la **Etapa 6**. El servidor no puede verificar `frutas` (viene del celular).
- Tarea diaria `ping()` para que el proyecto gratis no se pause: Etapa 7. Backups: exportar CSV (botón del panel admin, Etapa 5).
- Si el usuario cambia `config.js` esperando que cambie el juego real: con servidor, **mandan** `duracion_partida_s`, `frutas_minimas` y las reglas de la tabla; `config.js` solo es el respaldo.


## 10. Etapa 5 — Caja con PIN y panel de administrador (2026-10-19)

### 10.1 Encargo (Prompt 5), lo que dijo el usuario al empezar y cómo se resolvió
- **Prompt 5:** (1) página de la caja con solo PIN + código, resultados válido/ya canjeado/vencido/inexistente en <5 s, PIN hasheado verificado en el servidor, límite de intentos; (2) panel solo para el dueño con login propio (correo y contraseña de Supabase Auth, sin Google): lista y filtros por estado, buscador por código/nombre/celular, editor de TODA la configuración, métricas, desactivar a mano, exportar CSV, y poder usar la función de la caja desde ahí. Explicar cómo cambiar el PIN y cómo crear el usuario administrador. Mostrar ambas páginas en localhost antes del commit.
- **Ajustes por lo ya decidido en el chat (gana el chat):** el regalo **se elige al canjear** (el prompt decía «muestra el regalo»): la pantalla pide elegir entre los regalos configurados y recién ahí habilita «Marcar como canjeado»; el código es `LAINDIA-XXXX` y se acepta escrito de varias formas.
- **Lo que reclamó el usuario al abrir la etapa:** «antes me hacías probar en localhost, ahora no me dices dónde puedo probar el juego… ¿hay una URL? ¿se podrá personalizar y que no lleve mi usuario de GitHub? ¿el link será de Supabase?». **Respuesta dada:** hoy solo se ve en local (`npm run dev` → <http://localhost:5173/>, y por la wifi desde el celular); la URL pública llegará en la Etapa 7 con GitHub Pages (`https://hachescc.github.io/cholado-runner/`, lleva el usuario de GitHub); **Supabase NO es el link** (es el servidor de atrás que el jugador nunca ve). Se puede personalizar **antes de imprimir los QR**: (a) dominio propio apuntando a GitHub Pages (cuesta unos pocos dólares al año; es lo más duradero porque el QR no depende de dónde se aloje); (b) una organización gratuita de GitHub con el nombre del negocio, donde quedaría `nombre-del-negocio.github.io/cholado-runner` (gratis, pero hay que mover el repositorio **antes** de imprimir); (c) quedarse con `hachescc.github.io`. Pendiente de decidir (`pendientes.md` #14). **Regla nueva (CLAUDE.md §2): al terminar cualquier cambio visible, decir SIEMPRE la dirección exacta para verlo.**
- También dijo: «la verdad no entiendo mucho de lo que pasó en esta etapa 4… lo importante es que tú sepas que todo va acorde a lo planeado y que funcione». Se le explicó en simple (antes/ahora/cómo sé que funciona) y el detalle quedó en `supabase/LEEME.md` y aquí. Esta etapa se cierra igual: resumen simple primero, detalle en los `.md`.
- Estado al empezar: dificultad del servidor restaurada y verificada (25 frutas, sin cambios de velocidad); Etapa 4 commiteada (`39f0e17`).

### 10.2 Servidor: `supabase/migrations/0003_staff_admin.sql`
- **Tablas privadas** (esquema `app`, RLS sin políticas, sin permisos): `app.admins(user_id)` = lista de usuarios de Supabase Auth que son administradores (se llena a mano desde el SQL Editor) y `app.staff(pin_hash, fallos, bloqueos, ultimo_fallo, bloqueado_hasta…)` = una fila con el PIN cifrado. `app.configuracion` gana `pin_intentos_max` (5) y `pin_bloqueo_min` (5).
- **13 funciones públicas** (todas `SECURITY DEFINER`): la caja `canje_consultar` y `canje_confirmar` (clave pública + PIN) y 11 `admin_*` (solo rol `authenticated` **y** `app.es_admin()`): `yo, resumen, codigos, exportar, consultar_codigo, canjear, estado_codigo, config, guardar_config, cambiar_pin, desbloquear_pin`. Internas en `app.*`: `verificar_pin`, `buscar_codigo`, `consultar_codigo`, `canjear`, `buscar_codigos`, `codigos_json`, `config_json`, `validar_juego`, `guardar_config`, `entero_en_rango`, `cambiar_pin`, `es_admin`, `sin_tildes`, `estado_de`.
- **PIN:** 4–8 dígitos, rechaza los obvios (`1234`, `000000`, `654321`…), **bcrypt** (`extensions.crypt` + `gen_salt('bf', 10)`; pgcrypto ya viene en Supabase, la migración lo comprueba al final y falla a la vista si faltara). **No existe PIN por defecto**: lo pone el dueño desde el panel (así ningún PIN queda en el repo público ni en el chat).
- **Límite de intentos:** 5 PIN malos seguidos → bloqueo de 5 min; cada bloqueo seguido dura el doble (5, 10, 20, 40, 60 y se queda en 60); durante el bloqueo **ni se mira el PIN** (si no, se podría adivinar mientras está bloqueado); un acierto o 24 h sin fallar borran el castigo; el dueño desbloquea desde el panel. `verificar_pin` toma la fila de `app.staff` con `for update` (los intentos se atienden de uno en uno, así no se adivina en paralelo) y **devuelve** el error en vez de lanzarlo (un `raise` deshacería el conteo del fallo).
- **Compromiso aceptado (importante):** el límite es **global** (no hay identidad en la caja). Cualquiera que conozca `/canje/` (el repo es público) puede gastar los 5 intentos y bloquear la caja; **no puede entrar**, pero sí molestar. Mitigación: el dueño canjea desde el panel (sin PIN) y desbloquea. Arreglo de fondo: limitar por IP (los encabezados de la petición llegan a la función), Etapa 6.
- **Canje:** `consultar` no canjea. `canjear` hace `select … for update` sobre la fila del código (por eso un doble toque o dos cajeros nunca lo canjean dos veces; el segundo recibe «ya canjeado» con fecha y regalo), comprueba que esté `activo` y no vencido, valida que el regalo esté en la lista configurada (si solo hay uno, no hace falta elegir) y guarda `canjeado_en`, `canjeado_por` (`staff` o `admin`) y `regalo_elegido`. Un canjeado no vuelve a activarse ni se puede desactivar. La caja **no recibe nombre ni celular** (mínima exposición de datos personales); el administrador sí.
- **Búsqueda del código:** acepta `LAINDIA-QB9A`, `laindia qb9a`, `LAINDIAQB9A` o solo `QB9A`/`qb9a` (aunque cambie el prefijo después, las letras finales siguen sirviendo).
- **Panel:** `admin_resumen` (premios restantes, juego abierto/cerrado y por qué, partidas/ganadores/códigos/canjes de la semana y totales, victorias rechazadas, sin cupo, 14 días en hora de Bogotá, estado del PIN); `admin_codigos` filtra por estado **real** (usa `app.v_codigos.estado_efectivo`), busca sin tildes ni mayúsculas con `strpos` (no `ilike`, así `%` y `_` no son comodines) y pagina; `admin_exportar` hasta 20.000 filas.
- **Configuración todo-o-nada:** `guardar_config` valida cada campo con mensajes en español (enteros y rangos, 1–6 regalos de 2–60 letras sin repetir, prefijo `[A-Z0-9]{2,12}`, fechas con `fin > inicio`, dificultad solo con los grupos conocidos de `config.js`, números/booleanos y rangos sensatos en lo importante) dentro de un bloque con `exception`, que deshace todo si algo falla. `duracionS` y `frutasMinimas` escritos dentro de `juego` se descartan: mandan sus columnas propias.
- **Trampa de Supabase que se cerró:** en el esquema `public`, Supabase da `EXECUTE` por defecto a `anon` y `authenticated` en toda función nueva. `revoke … from public` NO lo quita. Por eso las 11 funciones admin llevan `revoke … from public, anon, authenticated` y luego `grant … to authenticated`. `probar-sql` ahora **imita ese permiso por defecto** (`alter default privileges`) y una prueba de mutación confirmó que quitar un `revoke` rompe 2 pruebas.

### 10.3 Cliente: `web/canje/`, `web/admin/`, `web/js/panel/`, `web/css/panel.css`
- Páginas estáticas sin librerías (solo `fetch`), `noindex`, con **CSP** por `<meta>` (`script-src 'self'`, `connect-src 'self' https://*.supabase.co`, sin estilos ni scripts en línea). No hay ningún enlace desde el juego; la protección es el PIN/login, no el secreto de la dirección.
- `js/panel/`: `dom.js` (`el()`: **nada de `innerHTML` con datos**; los nombres y celulares los escriben los jugadores, así que entran siempre como texto), `formato.js` (fechas en hora de Bogotá, pesos, CSV con antiinyección de fórmulas y BOM para Excel), `rpc.js` (llamadas a `/rest/v1/rpc/<fn>`; con token solo en las de admin; errores `red`/`sesion`/`faltan-funciones`), `auth.js` (Supabase Auth con `fetch`: `/auth/v1/token?grant_type=password` y `refresh_token`; tokens en `sessionStorage`, o `localStorage` si marca «mantener sesión»; la contraseña no se guarda), `canje-ui.js` (la pantalla de canje compartida por la caja y el panel), `falso.js` (servidor de mentira para `?api=falsa`).
- **Caja:** PIN + código → Verificar → panel grande y de color **con texto** (válido ✔, ya canjeado !, vencido ✖, desactivado, no existe, PIN incorrecto con intentos restantes, bloqueado con hora, falta PIN, sin conexión) → elegir regalo → «Marcar como canjeado» (deshabilitado hasta elegir) → «¡CANJEADO!» + «Siguiente código». Botones de 54–66 px; el PIN se queda escrito para el siguiente cliente.
- **Panel (5 pestañas, a pantalla completa en celular):** Resumen · Códigos · Canjear · Configuración · Cuenta. Entrada con `#pestaña` en la dirección. Si la sesión vence, se renueva una vez; si no se puede, vuelve al login. Si la cuenta no está en `app.admins`, dice qué falta.
- Los 7 campos de dificultad muestran el valor de fábrica (de `config.js`) como texto gris; vacío = fábrica. El panel arma el `juego` sobre lo que ya hay guardado para no borrar ajustes sin casilla.

### 10.4 Pruebas
- **`npm run probar-sql`: 181 ✓** (eran 86): +PIN (cifrado bcrypt, longitud/obvios, bloqueo y escalado 5-10-20-40-60-60, acierto reinicia, 24 h, desbloqueo, límite configurable, cambio de PIN), +canje (variantes del código, la caja no ve datos personales, doble canje, vencido, desactivado, regalo inválido/único), +permisos (anon sin las 11 `admin_*`; usuario sin permiso → `no-autorizado`; tablas e internas cerradas; RLS; `SECURITY DEFINER`), +panel (métricas, filtros, búsqueda sin tildes y sin comodines, paginación, exportación, canje de admin), +configuración (18 entradas inválidas rechazadas, todo o nada, fechas, dificultad, prefijo). Dura ~9 s (PGlite con pgcrypto).
- **`npm run probar-seguridad`** (nuevo, ~3 s, no deja datos): contra el servidor real comprueba que las 11 `admin_*` no responden a la clave pública ni a un token inventado (401/403) y que `app.admins`/`app.staff` no se leen. **Mientras el usuario no pegue 0003 en Supabase falla a propósito** («el servidor ya tiene la migración 0003») — así se sabe.
- **Demo `?api=falsa`** (misma forma de respuestas que el SQL): se recorrieron en el navegador de Claude el login (clave mala → mensaje, clave buena → panel), los 6 resultados de la caja, el canje completo, el bloqueo tras 5 PIN malos, las 5 pestañas del panel, buscar/filtrar, canjear desde la lista, desactivar/reactivar, guardar configuración válida e inválida, cambiar PIN (no coinciden / fácil / corto / bueno) y el CSV (comillas, comas, `=HYPERLINK`, `+57`). Un nombre `<img src=x onerror=alert(1)> Pedro` se muestra como texto y no ejecuta nada. Sin desbordes horizontales en 375 px en ninguna pestaña. Sin errores en consola (la CSP no bloqueó nada).
- **Contra el servidor real** el login, el token y el canje se probaron con el usuario después (ver §10.8). Hito: `historial/06-staff-admin/` (demo con capturas).

### 10.5 Decisiones de producto tomadas (y por qué)
- El administrador **no puede deshacer un canje** (regla de seguridad del proyecto: canjeado = desactivado). Si pasa de verdad hay una consulta manual en `sql/consultas_utiles.sql`.
- Sin bitácora de acciones del admin, sin 2FA y sin «olvidé mi contraseña» por correo (la contraseña se cambia en Supabase → Authentication → Users): son cambios pequeños para después (`pendientes.md`).
- Una sola contraseña de administrador y varios administradores posibles (cada uno con su usuario y su fila en `app.admins`).

### 10.6 Lecciones nuevas del entorno
- El `screenshot` del navegador de Claude falla con frecuencia la **primera** vez tras un cambio de pantalla («did not finish rendering»): llamar `show_pane` y repetir la captura. Las capturas a escala < 1 y las que incluyen elementos `sticky` con scroll salen recortadas o con huecos que **no existen en la página real**: confirmar con medidas del DOM (`scrollWidth`, `getBoundingClientRect`) y capturar a escala 1.
- `navigate` a la misma URL cambiando solo el `#hash` **no recarga** la página (se queda con el JS viejo): usar `location.reload()`.
- `String.prototype.replace(texto, reemplazo)` interpreta `$$` y `$1` del reemplazo: al insertar SQL con `$$ … $$` por Node, usar `replace(a, () => b)`.
- PGlite trae `pgcrypto`: `import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'` y `new PGlite({ extensions: { pgcrypto } })`. El esquema `auth` de Supabase se imita con `auth.users` y `auth.uid()` leyendo `request.jwt.claim.sub`.

### 10.7 Qué sigue (Etapa 6) y qué hace falta del usuario
- ✅ Hecho por el usuario el 2026-10-19 (ver §10.8).
- Etapa 6 (cuando pegue el Prompt 6): intentos de abuso, límite por IP (partidas y PIN), bordes de fecha, Instagram/Facebook en iOS y Android, gama baja.

### 10.8 Puesta en marcha contra el servidor real y cierre (2026-10-19, guiada paso a paso por el chat)
- **Paso 1 — migración:** el usuario pegó `0003_staff_admin.sql` (SQL Editor → «+» → Create a new snippet). Claude lo verificó sin esperar capturas: `npm run probar-seguridad` pasó de «falta la migración» a **17/17 ✓** (las 11 `admin_*` existen y no responden a la clave pública ni a un token inventado; `app.admins` y `app.staff` no se leen).
- **Paso 2 — usuario:** Authentication → Users → Add user → Create new user (correo propio, contraseña larga guardada en privado —**nunca** compartida en el chat—, «Auto Confirm User» marcada). **Paso 3:** apagó «Allow new users to sign up». **Paso 4:** `insert into app.admins … where email = '<su correo>'` → `administradores = 1` (el correo lo escribió él en su propio SQL Editor; no queda en el repo). **Paso 5:** entró a `http://localhost:5173/admin/` (sin `?api=falsa`) y puso el PIN de la caja desde Cuenta (no se lo dijo a Claude). **Paso 6:** probó `/canje/` con el código de prueba `LAINDIA-QB9A`.
- **Resultado dicho por el usuario:** «todo salió acorde a lo esperado» en los 6 puntos de la prueba: PIN malo → «PIN INCORRECTO» con intentos restantes; PIN bueno + código → «CÓDIGO VÁLIDO» con regalos; elegir regalo + «Marcar como canjeado» → «¡CANJEADO!»; segundo intento → «YA FUE CANJEADO» con fecha y regalo; en el panel el código figura como Canjeado por la caja y el Resumen suma el canje.
- **Datos de prueba que quedan:** `LAINDIA-QB9A` canjeado. Se limpian con `sql/limpiar_pruebas.sql` antes del lanzamiento (no borra el PIN ni los administradores).
- **Comprobación final de Claude:** `probar-seguridad` 17/17 ✓ contra el servidor real; `probar-sql` 181/181 ✓ en local.
- **Estado:** Etapa 5 cerrada y aprobada. Frase de commit entregada. **Siguiente: Etapa 6**; no se avanza hasta que el usuario pegue el Prompt 6.
