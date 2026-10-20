# CLAUDE.md — Cholado Runner (Cholados La India, Cali, Colombia)

Fuente de verdad del proyecto. **Léelo SIEMPRE antes de trabajar.** Última actualización: 2026-10-19 (Etapa 4 —backend Supabase— hecha y probada contra el servidor real; esperando el visto bueno del usuario; siguiente: Etapa 5).

## 0. Mapa de documentos (qué hay y dónde)
| Archivo | Para qué |
|---|---|
| `CLAUDE.md` (este) | Reglas, decisiones vigentes, arquitectura, cómo probar, insumos de la Etapa 4 |
| `PLAN.md` | Estado de las 7 etapas y sus tareas |
| `pendientes.md` | Lo que falta decidir/hacer (con placeholders), y el análisis de la Ley 1581 |
| `documentos/bitacora.md` | **Registro detallado y cronológico** de todo lo hablado, decidido, probado y descubierto, con el porqué (léelo si algo aquí te parece escueto) |
| `documentos/calibrar-dificultad.md` | Cómo medir y ajustar la dificultad (simulador + estadísticas) |
| `supabase/LEEME.md` | **El servidor**: cómo se montó, las 6 funciones, cómo cambiar reglas y dificultad desde el SQL Editor, pruebas, límites del plan gratis |
| `supabase/migrations/*.sql` | El SQL real (tablas + funciones) que se pega en Supabase; `supabase/sql/` = consultas útiles y limpieza |
| `historial/` (+ `LEEME.md`) | Evidencias del proceso: copias congeladas jugables de cada hito + capturas |
| `README.md` | Cómo correrlo y comandos |

## 1. Qué es
Minijuego web (se abre desde el celular, sin instalar nada) tipo **runner vertical** (Subway Surfers / Minion Rush / Temple Run) con temática de frutas y cholado, para el negocio familiar **Cholados La India** (Cali). El jugador corre ~60 s esquivando obstáculos y recogiendo frutas hasta una meta. Si llega a la meta con las frutas mínimas, gana un código de descuento único que se canjea en el local. Objetivo: incentivar ventas. Las capturas de Temple Run / Minion Rush / Subway Surfers son referencia de **mecánicas, animaciones e interacción**, NO de estilo visual.

## 2. Cómo trabajamos (reglas de colaboración)
- **Preguntas antes que suposiciones. Cambios pequeños.** Tutear, español colombiano. El usuario habla con voseo; se le contesta en tú.
- El usuario es estudiante de ingeniería multimedia: conoce GitHub y Unity, **no** Supabase ni Node. **Explicar cada paso como si no lo supiera.**
- **Solo se trabaja en la etapa que el usuario pida.** No adelantar etapas futuras, aunque parezca fácil. El usuario entrega un prompt por etapa (diseñado antes con otro chat); cada uno empieza con: leer `CLAUDE.md` y `PLAN.md`, revisar el repo y decir **en 3 líneas** qué hay hecho (avisar si algo no coincide). **Si un prompt contradice algo ya decidido en el chat, gana lo decidido en el chat.**
- **Preview en localhost ANTES de cada commit. Los commits los hace el usuario** con GitHub Desktop (Claude no hace commit ni push). Al cerrar cada etapa: resumen de lo hecho + archivos tocados + **una frase corta para el commit** + esperar su visto bueno + actualizar `PLAN.md` y estos documentos.
- Lo que quede sin resolver va a `pendientes.md` con **placeholders visibles** (`[DIRECCIÓN DEL LOCAL]`…), **nunca se inventa**.
- **Nunca** pedir ni guardar PIN, claves, tokens ni correos personales en el chat o en archivos del repo (es público).
- **Historial (`historial/`)**: en cada hito importante correr `npm run hito -- "nombre" "Título" "Descripción" "ruta/"` y dejar capturas en `historial/NN-nombre/capturas/` anotadas en `historial/hitos.json` (editar JSON con **Node**, no con PowerShell). **Nunca borrar ni editar hitos viejos.** Hitos hechos: 01 estilos A–F, 02 estilo G, 03 prototipo v1, 04 prototipo v2 (cierre Etapa 3). Ver `http://localhost:5173/historial/`.
- Dar feedback ordenado: el usuario dicta ideas largas con autocorrecciones; convertirlas en una **lista numerada**, confirmar lo ambiguo y reportar qué se entendió.
- Quiere honestidad: avisar si algo no se puede (p. ej. 60 fps en gama baja) y no presentar estimaciones como mediciones.
- Lo **estético** se mejora **al final** (después de todas las etapas), salvo bugs.

## 3. Reglas del negocio (v1) — TODO configurable, nada quemado en el código
- **Campaña por temporada** con fecha de inicio y fin editables (aún sin definir: `reglas.campana`). Entre temporadas solo cambian fechas; premio y tema visual iguales por ahora (sujeto a cambio).
- **Premio:** compra mínima **$30.000 COP** en productos pagados (el regalo no cuenta; normalmente 2 productos). El cliente **elige al canjear en caja**: un **raspao personal** (menú $8.000) o un **cholado de 10 oz** (el normal es de 14 oz). Un regalo por código, no acumulable ($60.000 no da dos regalos).
- Una sola meta. Partida de ~60 s. Ni regalada ni imposible.
- **Para ganar NO basta llegar a la meta:** hay que haber recogido un **mínimo de frutas** (`partida.frutasMinimas`, hoy **25** de ~71 que salen; editable; decidido el 2026-10-19 para que las frutas no sean de adorno). Si llega sin ellas pierde («¡Te faltaron frutas!») y gasta el intento.
- **Banco:** 50 códigos por semana (editable). Reinicia los **lunes 00:00 hora de Bogotá**. Contador visible «Quedan X premios esta semana» (= tope − códigos expedidos − premios **apartados**). Si se agota: no se juega por premio y se muestra «vuelve el lunes». Los códigos vencidos **NO se reciclan**. **Cupo diario** (ej. 7/día) implementado en el servidor (`cupo_diario`), **apagado (0)** por defecto (tráfico esperado desconocido); si se activa y se agota, «vuelve mañana».
- **Los códigos se crean al reclamar** (decisión del usuario, 2026-10-19), no hay lista pre-hecha. Formato **`LAINDIA-7K3Q`** (prefijo configurable + 4 caracteres de un alfabeto de 32 sin `0/O/1/I`), único.
- **Premio apartado:** al ganar (y ser validada la victoria), el servidor **aparta un premio 15 min** (`ventana_reclamo_min`) para esa persona; si no reclama, se libera. Si la reserva venció pero aún hay cupo, puede reclamar (hasta 6 h después). Si ganó pero el último premio se lo llevó otra persona justo antes: «¡Llegaste, pero se acabaron!».
- **Intentos:** 3 por semana por usuario (editable; puede subir a 5).
- **Máximo 1 código por persona cada 7 días**, por número de celular (`reglas.diasEntreCodigosPorCelular` = **7, CONFIRMADO por el usuario**; si luego pide otro valor, es un solo número). Si un celular que ya reclamó vuelve a ganar: **no se le da otro**; se le dice cuándo podrá reclamar (**sin mostrar el código de ese número**, para que nadie vea el cupón de otro escribiendo su celular). Prioridad del usuario: que el cupón llegue a la mayor cantidad de clientes posible. Celular: **10 dígitos** que empiezan por 3 (acepta +57 y espacios al pegar, formato `312 345 6789`).
- **Vigencia (implementada y probada):** el servidor corta la hora de expedición **al minuto** y suma **7 días exactos**: `vence_en = date_trunc('minute', expedición) + 7 días`; el código sirve mientras `ahora < vence_en`, y la pantalla muestra «vale hasta» **vence − 1 min** (ej. expedido el martes 2:51 p. m. → «vale hasta el martes siguiente 2:50 p. m.»). Estados: se guardan `activo | canjeado | desactivado`; **`vencido` se calcula**. Los vencidos no se reciclan.
- **Sin login para jugadores.** Al ganar se piden nombre y celular (sin verificar) con casilla de consentimiento (sin premarcar) y texto breve (Ley 1581 de 2012; ver `pendientes.md`).
- **Canje en caja:** mini página para el staff, protegida con **PIN compartido** (cambiable). En ~5 s verifica que el código exista, esté vigente y no canjeado, lo marca canjeado y muestra el regalo; quien atiende elige el regalo y valida los $30.000 (el sistema no puede). Un solo local; sin Rappi.
- **Panel de administrador (solo el dueño del proyecto):** ver códigos y estado, editar toda la configuración, ver conteos (partidas, ganadores, canjes), desactivar códigos a mano, exportar CSV.
- **Distribución:** QR en mostrador y vasos + publicidad en Instagram/Facebook. Esos links abren en el **navegador interno** de las apps: **debe funcionar ahí** (iOS y Android).

## 4. Seguridad: lo innegociable
1. Un mismo código **jamás** se asigna a dos personas (asignación atómica en el servidor).
2. Un código canjeado queda desactivado.
3. Todas las fechas usan el **reloj del servidor** (nunca el del cliente).
4. **Ningún secreto** (PIN, claves de admin, `service_role`) en el cliente ni en el repo. La clave pública `anon` de Supabase sí puede estar en el cliente (es pública por diseño) SI las reglas RLS están bien.
- Antifraude general: **nivel bajo** (lo peor que pasa es que alguien consiga otro cupón y haga otra compra). Aun así: la victoria se valida en el servidor (token de partida + tiempo mínimo jugado + frutas mínimas) para que nadie vacíe el banco con un script. Intentos por **ID anónimo** del navegador contado en servidor; se acepta que Instagram (almacenamiento aparte) y Safari/Chrome den intentos separados. El servidor real solo puede confiar a medias en `frutas` (viene del celular): aceptable.

## 5. Decisiones técnicas
- Web estática con **Three.js** en **GitHub Pages** + **Supabase** (plan gratis) para códigos y configuración. **No** usar GitHub como base de datos. **No se paga nada.**
- **Supabase (Etapa 4, hecho):** proyecto `cholado-runner` en la organización «Cholados La India» (plan Free, región East US/North Virginia). **URL pública** `https://vaphorsfnfuebfjuhmof.supabase.co` y **publishable key** en `web/js/supabase-config.js` (públicas por diseño, van en el repo). **Nunca** la secret/`service_role` ni la contraseña de la base (el usuario las guarda en privado; Claude jamás las ve). Límites verificados: 2 proyectos activos, 500 MB, 5 GB de egress, **sin backups automáticos**, **pausa tras ~1 semana sin actividad** (idea: GitHub Actions que llame a `ping()` a diario, Etapa 7). El juego habla con el servidor **solo con `fetch`** al REST (`/rest/v1/rpc/<función>`), sin librerías. Detalle: `supabase/LEEME.md`.
- **JavaScript plano con módulos ES; el juego no se compila.** Three.js **0.186.1** (fijo) viaja en el repo como paquete recortado en `web/vendor/three/three.min.js` (~532 KB, 135 KB gzip), sin CDN. Desde r186 Three.js ya no trae versión minificada (~2 MB completo), así que `npm run vendor` (`tools/vendor-three.mjs`, esbuild) busca cada `THREE.Algo` usado en `web/` y empaqueta solo eso. **Repetirlo cuando el código use una clase nueva de Three.js.** Dependencias de desarrollo: `three` y `esbuild` (`node_modules/`, no se sube).
- Servidor local: `npm run dev` (`tools/dev-server.mjs`, sin dependencias, `http://localhost:5173/`, visible en la wifi para probar en el celular; sirve gzip como GitHub Pages; también `/historial/`). Node.js LTS v24.20.0.
- Fuentes autoalojadas (`web/assets/fonts/*.woff2`, OFL incluida): Fredoka 600 (HUD) y Lilita One (títulos). Nunca Google Fonts.
- Rendimiento: ligero, mobile first, **vertical**, objetivo gama baja; pixel ratio máx. 1,5; una malla fusionada con color por vértice por personaje/objeto; `InstancedMesh` para lo repetido; sombras falsas; cielo en CSS; sin postprocesado; carga inicial objetivo ≤ 3 MB (hoy ~0,26 MB).
- Fechas guardadas en UTC; semana y vencimientos en `America/Bogota` (UTC−5, sin horario de verano).
- Lógica crítica en **funciones SQL de Supabase** (hecho): tablas en el esquema **privado `app`** con RLS activado sin políticas; solo 6 funciones `SECURITY DEFINER` en `public` están abiertas a la clave pública; asignación **atómica** con un candado global (`pg_advisory_xact_lock`). PIN del staff guardado cifrado y verificado en servidor, admin con Supabase Auth (login con correo): Etapa 5.
- **Personajes y objetos generados por código** con formas básicas (el usuario no tiene tiempo de modelar; a futuro quizá modelos GLB hechos con otro chat). Fotos reales reducidas permitidas en pantallas de premio.
- Interfaz en **español colombiano caleño** (tuteo, toques suaves). Todos los textos en `web/js/textos.js`.
- **Sonido y música: sí** (ambiente fresco/caleño, salsa), pero **solo pistas con licencia libre o generadas**; aún sin hacer (ver `pendientes.md`).
- URL final: `https://hachescc.github.io/cholado-runner/` (cuenta `hachescc`, definitiva). **No renombrar usuario ni repo** una vez impresos los QR. Dominio propio: según cómo vaya, no se paga por ahora.

## 6. Controles y juego (decidido)
- Cámara detrás del personaje, **3 carriles**. **Deslizar izquierda/derecha = cambiar de carril; un deslizamiento = UN solo carril** sin importar la fuerza (como Subway Surfers; para dos carriles, dos deslizamientos; en el borde no se pasa). **Deslizar arriba = saltar; un toque (sin deslizar) también salta.** Teclado en PC: ←/→ o A/D, ↑/W/espacio, Esc o P = pausa. Deslizar hacia abajo (agacharse): **se ignora por ahora**, puede probarse después (puede chocar con gestos del navegador de Instagram).
- **3 vidas.** Un choque quita una vida y da 1,3 s de invulnerabilidad pero **no frena**.
- **Personaje: el CLIENTE ELIGE** (decidido el 2026-10-19 por el usuario y su mamá): selector permanente «Elige tu personaje · Choladito / La India» en el inicio; se recuerda en el navegador (`localStorage`); arranca con La India (`desarrollo.personajeInicial`). **Todo cambio de estilo o animación debe aplicarse a los dos.** El cholado grande aparece como **premio sobre el arco de meta**.
- **Nombre del juego: PROVISIONAL «Corre por tu cholado»** (en `textos.js`). Candidatos: *Atrapa tu cholado* (lema/llamado), *Corre por tu cholado*, *Cholado Run*. Sin decidir.
- Coleccionables: fresa y mango (en el menú hay maracuyá, guanábana, lulo, mora, piña…; ampliables).
- **Dificultad actual** (calibrable, `js/config.js`): velocidad **9,5 → 14,5** u/s (sube lineal), filas de obstáculos cada **1,5 → 0,95 s**, tolerancia de choque 0,18, 3 vidas, **25 frutas mínimas**. Meta original: «1 de cada 4 o 5 intentos» (reemplazó al ~35 % inicial). Bot (pesimista, persigue frutas): Novato ~0,5 %, Normal ~6 %, Experto ~46 %; con la config anterior eran ~2/19/92 %. El usuario probó el ajuste y dijo «todo bien». **Recalibrar con gente real** (ver `documentos/calibrar-dificultad.md`).

## 6b. Estilo gráfico — DECIDIDO: «G» = mezcla de D y F («jugoso + sombritas suaves»)
Base para trabajar, **no un cierre definitivo** (los colores o detalles pueden cambiar). Receta, igual para choladito y La India:
- Material `MeshMatcapMaterial` con color por vértice y matcap por código (`game/matcap.js`, `pasos: 3, mezcla: 0.5`: sombritas suaves con sombra **violeta**), brillo `color.setScalar(1.15)` (**no subirlo**, satura).
- Contorno «tinta de color» (`game/materiales.js`): color del objeto ×0,3 mezclado con ciruela `#3a0f33` (nunca negro), **1,5 px**, solo en personaje, cajas y frutas.
- Geometría de detalle 1,6; paleta de C (cielo magenta→durazno, suelo lima, calle ciruela, bordillos/rayas celestes, sol amarillo); HUD de C (Fredoka 600, botones de gelatina con degradado y brillo).
- **Qué NO gustó (evitar):** A (low poly facetado, «parece prototipo»); B (trazo negro grueso, «hecho por IA»); E (luz ambiente alta: sin sombras, muy saturado).
- **Cholado fiel a las referencias** (modelado en `game/modelos.js`): vaso plástico transparente **sin decoraciones por fuera**; adentro, sobre hielo y almíbar rojo: piña, guanábana, banano, maracuyá, papaya; manzana roja al costado; arriba UNA bola de helado rosada con leche condensada, uvita, wafer cuadriculado, pitillo y cuchara.
- **Mejoras estéticas pospuestas** (después de todas las etapas): frutas del cholado que parecen «afuera» del vaso, bola de helado «pintada hasta la mitad», más detalle en La India y el escenario, más elementos de escenario, cartel ¡META! poco legible a distancia, animación de choque simple.

## 7. Marca y referencias (`referencias-diseno/`, solo local, NO se sube a Git — 84 MB)
- Logo «CHOLADOS LA INDIA»: degradado amarillo→naranja con contorno y sombra negra. Eslogan: «¡Aquí Desafiamos La Sed y Castigamos El caLor!». Mascota: La India (penacho multicolor azul/rojo/amarillo/naranja, top verde). Vectores originales existen, pero el usuario prefiere que se trabaje con lo que hay.
- Pendón naranja→amarillo→verde. Menú magenta con arco verde lima y etiquetas celestes. Instagram **@cholados.laindia**, Facebook «Cholados La India».
- Paleta/tipografía: tomadas de las referencias; no rígidas, que se sientan **frutales**.
- Producto: cholado en vaso transparente con rayas, base de almíbar rojo/magenta, fruta, nieve, leche condensada, oblea, pitillo amarillo/verde. Raspao: torre de hielo rosado con leche condensada y limón.
- Menú: Raspao $8.000/$11.000; Cholado $15.000/$20.000; especiales $18.000/$21.000.

## 8. Entorno del usuario y cómo probar (leer antes de probar)
- Windows 11, PowerShell 5.1 (y Git Bash), Git 2.53, **GitHub Desktop**, Node v24.20.0/npm 11.19, sin Python. **iPhone XR** para pruebas reales (los previews dieron ~60 FPS, mínimo 57). **Sin Android de gama baja** (simular con Chrome DevTools y pedir uno prestado). Probar en el navegador interno de Instagram/Facebook (iOS y Android) en la Etapa 6.
- **Node no está en el PATH del shell de Claude:** antes de `node`/`npm` poner `$env:Path = 'C:\Program Files\nodejs;' + $env:Path`. PowerShell 5.1: sin operador `?:`; **editar JSON con Node** (`ConvertTo-Json` envuelve arreglos en `{value,Count}`); `Get-Content` muestra tildes rotas aunque el UTF-8 esté bien (verificar con Read).
- **Navegador integrado de Claude:** si el panel está oculto, la página queda `hidden` → `requestAnimationFrame` se detiene, se activa la pausa automática y las capturas pueden venir de una página recargada. **Antes de cada lote:** `mcp__ccd_view__show_pane` (`preview`) y agrupar JS + captura en `browser_batch`. Para jugar en pruebas: `?debug=1` + `window.__cholado.tick(dt)` + `cfg.desarrollo.autoPausa=false` + `invencible=true` + el bot (`/js/game/bot.js`). FPS reales **no** se miden ahí (se miden en el iPhone). Viewport móvil emulado 375×812: restablecer a *desktop* al terminar. El servidor de Claude cae a 5174 si el del usuario ocupa 5173: **detenerlo al terminar**.
- Atajos útiles: `npm run dev`, `npm run vendor`, `npm run simular [-- N clave=valor…]`, `npm run hito -- …`. Más trucos en `documentos/bitacora.md` §7.

## 9. Estructura de carpetas
```
cholado-runner/
├─ CLAUDE.md · PLAN.md · pendientes.md · README.md · .gitignore
├─ package.json · package-lock.json   (scripts: dev, vendor, hito, simular, probar-sql, probar-supabase)
├─ tools/        dev-server.mjs · vendor-three.mjs · guardar-hito.mjs · simular.mjs · probar-sql.mjs · probar-supabase.mjs
├─ documentos/   bitacora.md · calibrar-dificultad.md  (luego: aviso de privacidad, T&C, lista de lanzamiento)
├─ historial/    hitos congelados + capturas (NO se publica; nunca se borra)
├─ referencias-diseno/   (solo local, ignorada por Git)
├─ web/          ← lo único que se publica
│  ├─ index.html · css/juego.css
│  ├─ js/  main.js · config.js · textos.js · util.js · reloj.js · dispositivo.js
│  │       api.js (elige) · api-supabase.js (real) · api-falsa.js (local) · supabase-config.js (URL y clave PÚBLICAS)
│  │       game/ (logica, nivel, bot, escena, controles, modelos, modelos-nivel, materiales, matcap, paleta)
│  │       ui/   (ui.js; debug.js solo con ?debug=1)
│  ├─ vendor/three/ · assets/ (fonts, marca)
│  ├─ canje/   página del staff (Etapa 5)   ·   admin/   panel admin (Etapa 5)
├─ supabase/     LEEME.md · migrations/ (0001_tablas.sql, 0002_funciones.sql) · sql/ (consultas_utiles, limpiar_pruebas)
└─ .github/workflows/   publicar web/ en GitHub Pages (Etapa 7)
```
(Los previews de estilos A–G se borraron de `web/` el 2026-10-19: viven en `historial/01` y `02` y en el commit de la Etapa 2.)

## 10. Cómo está hecho el juego (Etapas 3 y 4)
- **Va por tiempo:** dura `partida.duracionS` (60 s) y la meta aparece al final; la velocidad sube lineal. Obstáculos en filas separadas por un tiempo que baja de `separacionInicialS` a `separacionFinalS`; **cada fila garantiza una salida**. Todo se lee de `cfg` en cada paso → los deslizadores de debug se aplican en vivo.
- **Lógica pura** (sin Three.js ni DOM; probable en Node): `game/logica.js` (estado, física, colisiones, fin: `gano`/`perdio` con `motivoFin` `'vidas'|'frutas'`), `game/nivel.js` (generación del recorrido y frutas), `game/bot.js` (jugador automático + `simular`). **Dibujo:** `game/escena.js` solo muestra el estado. Controles: `game/controles.js` (un gesto por toque). Modelos: `modelos.js` (choladito, India, caja, frutas, decorado), `modelos-nivel.js` (pila alta, barra baja, arco de meta, cartel ¡META!), `materiales.js`, `matcap.js`, `paleta.js`.
- **Obstáculos:** `cajaBaja` (se salta o esquiva), `pilaAlta` (NO se salta), `barraBaja` (3 carriles, se salta), `doble`. **Frutas** (fresa, mango): ~71 por partida en hileras; sobre cajas bajas suben en arco. HUD «8 / 25» (verde al llegar al mínimo).
- **Pantallas** (`ui/ui.js`, textos en `textos.js`): inicio (premios e intentos restantes + selector de personaje), ayuda, cuenta atrás, pausa (también automática al salir de la pestaña), ganaste (aviso «tu premio está apartado 15 min» + formulario nombre + celular + consentimiento), código (ticket `LAINDIA-XXXX`, «vale hasta», **cuenta regresiva con la hora del servidor**, estados canjeado/vencido, `[DIRECCIÓN]`/`[HORARIO]`), «este número ya tiene un cupón», perdiste (variante «te faltaron frutas»), sin intentos, sin premios (y «llegaste pero se acabaron»), campaña inactiva, error de conexión con «Reintentar». «Ver mi código» consulta al servidor por **dispositivo** (ya no usa `localStorage`).
- **Rendimiento:** shaders precompilados; **calidad adaptativa** (baja resolución y luego quita el contorno si no sostiene `rendimiento.fpsMinimo`; si no mejora vuelve atrás y no insiste, p. ej. iPhone en bajo consumo a 30 fps).
- **Modo `?debug=1`** (`ui/debug.js`, no se descarga para el público): FPS/llamadas/triángulos/calidad, deslizadores de dificultad en vivo, invencible, intentos ilimitados (activado por defecto en debug), error de red simulado, reiniciar semana, estadísticas de partidas reales con la config actual, simulador con bot y «Copiar config». `window.__cholado.tick(dt)` avanza el juego a mano.
- **Configuración** en `web/js/config.js` (secciones `partida`, `velocidad`, `carriles`, `salto`, `jugador`, `obstaculos`, `frutas`, `controles`, `reglas`, `rendimiento`, `desarrollo`).
- **Sin audio todavía.** «Girar» (de los previews) no está en el juego; «Datos» = el mini panel de `?debug=1`.

## 11. El servidor (Etapa 4, hecho y probado contra Supabase real el 2026-10-19)
Detalle completo y cómo operarlo: **`supabase/LEEME.md`**; el porqué de cada decisión: `documentos/bitacora.md` §9.
- **Esquema privado `app`** (tablas `configuracion` —una fila—, `partidas` —su `id` es el token—, `codigos`; vista `v_codigos`) + **6 funciones `SECURITY DEFINER` en `public`** que son lo único que la clave pública puede llamar: `ping()`, `estado(p_device)`, `iniciar_partida(p_device)`, `terminar_partida(p_token, p_gano, p_progreso, p_frutas)`, `reclamar_codigo(p_token, p_nombre, p_celular, p_consentimiento)`, `mi_codigo(p_device)`. Utilidades internas en `app.*` sin permisos para el público (`app.ajustar_juego` es una ayuda **solo para el SQL Editor**).
- **Contrato del cliente** (`web/js/api.js`, comentado): `obtenerEstado()` → `{jugable, motivo, premiosRestantes, premiosPorSemana, intentosRestantes, intentosPorSemana, reiniciaEnISO, ahoraISO, miCodigoActivo, reglas{compraMinima, vigenciaDias, diasEntreCodigosPorCelular, regalos, ventanaReclamoMin}, juego{…dificultad}}`; `iniciarPartida()`; `terminarPartida()` (valida y **aparta** el premio); `reclamarPremio()`; `miCodigo()` (estado + `segundosRestantes`). `api.js` usa `api-supabase.js` si `supabase-config.js` tiene URL y clave; **`?api=falsa`** fuerza la simulación local (calibrar sin gastar intentos reales).
- **Reglas que impone el servidor:** token válido; tiempo jugado ≥ `min(minimo_jugado_s=45, 0,75×duración)`; frutas ≥ `frutas_minimas` (25); intentos por semana por **id anónimo del dispositivo** (candado por dispositivo); semana lunes 00:00–domingo 23:59:59 de Bogotá; cupos = tope − expedidos − apartados (+ cupo diario opcional); **candado global** `pg_advisory_xact_lock('cholado:premios')` en `terminar_partida` (si gana) y `reclamar_codigo` (siempre antes del bloqueo de fila: sin interbloqueos); **1 código por celular cada 7 días** (la respuesta trae solo `puedeVolverISO`, nunca el código ajeno); consentimiento obligatorio; nombre 2–60 y celular colombiano de 10 dígitos revalidados; reclamo repetido devuelve el **mismo** código (idempotente); códigos únicos con reintento ante colisión.
- **Dificultad desde el servidor:** `estado.juego` (lo guardado en `app.configuracion.juego` + `duracion_partida_s` y `frutas_minimas`) se mezcla encima de `config.js` en `main.js` (`aplicarServidor`). **`config.js` queda como «valores de fábrica» y para la API falsa.** En `?debug=1` NO se mezcla (mandan los deslizadores) salvo `?debug=1&servidor=1`. Cambiar: `select app.ajustar_juego('{"velocidad":{"final":15}}');` y `update app.configuracion set …` desde el SQL Editor (ver `supabase/sql/consultas_utiles.sql`); «Copiar config» de `?debug=1` genera esa línea.
- **Pruebas (todas verdes):** `npm run probar-sql` = 86 comprobaciones en PGlite (Postgres en Node, sin Supabase); `npm run probar-supabase` = 35 comprobaciones contra el servidor real con concurrencia (8 inicios simultáneos de un dispositivo → exactamente 3; 5 reclamos con el mismo celular → exactamente 1; **100 ganadores a la vez con cupo 45 → se apartan exactamente 45 y salen 45 códigos distintos**; lectura/escritura directa de tablas → 404/406). Prueba manual completa: partida real → ganar → formulario → `LAINDIA-QB9A` → «Ver mi código».
- **Higiene de datos:** `probar-supabase` y las pruebas manuales dejan códigos/partidas falsos y gastan el banco: **antes del lanzamiento correr `supabase/sql/limpiar_pruebas.sql`** (nunca con clientes reales). Tras probar la dificultad desde el servidor se restaura con `update app.configuracion set juego = '{}'::jsonb, frutas_minimas = 25 where id = 1;`.
- **Riesgos abiertos** (ver `pendientes.md`): limitar partidas por IP (Etapa 6; ojo con IPs móviles compartidas); pausa del plan gratis (`ping()` diario por GitHub Actions, Etapa 7); backups manuales (CSV; botón en el panel admin, Etapa 5).

## 12. Insumos ya decididos para la Etapa 5 (staff y admin) — NO es trabajo hecho
**El usuario pegará el Prompt 5; hasta entonces no se avanza.**
- **Canje en caja:** una función nueva que reciba el código (acepta `LAINDIA-XXXX` o solo las 4 letras), valide **PIN compartido** (guardado cifrado en una tabla, verificado en el servidor, cambiable; NUNCA en el cliente), compruebe que existe, está activo y vigente (`ahora < vence_en`), lo marque `canjeado` (`canjeado_en`, `canjeado_por`), guarde el **`regalo_elegido`** (la persona lo elige en caja: «Un raspao personal» o «Un cholado de 10 oz», ver `app.configuracion.regalos`) y muestre el regalo; en ~5 s. Quien atiende valida los $30.000. Debe evitar el doble canje por concurrencia y limitar intentos de PIN erróneos.
- **Panel admin** (solo el dueño del proyecto): login con **Supabase Auth** (correo) y funciones/consultas que solo permitan a ese usuario; ver códigos y estado (usar `app.v_codigos`), editar **toda** la configuración (reglas y dificultad, hoy por SQL Editor), contadores (partidas, ganadores, canjes), desactivar códigos a mano (`estado = 'desactivado'`), **exportar CSV** (no hay backups automáticos en el plan gratis).
- Páginas previstas: `web/canje/` y `web/admin/` (sin librerías pesadas; mismo estilo; ligeras). El dispositivo del staff aún no está decidido (cualquiera que atienda).
- Mismas reglas de seguridad: ningún secreto en el repo; RLS y funciones `SECURITY DEFINER`; reloj del servidor.