# CLAUDE.md — Cholado Runner (Cholados La India, Cali, Colombia)

Fuente de verdad del proyecto. **Léelo SIEMPRE antes de trabajar.** Recortado el 2026-11-19 (pesaba 64 KB): la versión completa con toda la historia por etapas quedó en `documentos/claude-md-historico-2026-11.md` y el porqué de cada cosa en `documentos/bitacora.md`. **Aquí solo va lo vigente.**

## 0. Estado actual (2026-11-19)
- **Publicado y funcionando:** <https://cholados-la-india.github.io/> (juego), `/canje/` (caja), `/admin/` (panel), `/diagnostico/`. Repo `cholados-la-india/cholados-la-india.github.io` (el remoto de git ya apunta ahí). GitHub Pages publica `web/` con cada push a `main`.
- **Todavía NO está abierto al público** (sin anunciar). De `PARA-MI-LEER-Y-TENER-A-MANO/00-EMPIEZA-AQUI.md` faltan: **6 limpiar los datos de prueba** (justo antes de abrir), **7 imprimir los QR** (ya probados) y **8 abrir** (poner los enlaces en cada red). Apertura prevista desde mediados de noviembre de 2026. Cupo diario APAGADO, campaña SIN fechas (decidido con su mamá).
- **Revisión completa de noviembre (auditoría, 40 puntos):** los 5 bloques están hechos en el repo y el SQL de todos ya está aplicado al servidor real (2026-11-19). Lista y estado: `documentos/auditoria-2026-11.md`. Quedan solo decisiones del dueño: `[ENLACE DE GOOGLE MAPS]` del local (punto 27) y el plazo de los datos personales (punto 37). **Su mamá debe volver a leer `06-textos-legales.md`** (cambió la redacción, no el fondo).
- Después de abrir seguirán cambios pequeños: música más «de salsa» y aplausos reales (`pendientes.md` #10; pedir permiso antes de descargar nada).

## 1. Mapa de documentos
| Archivo | Para qué |
|---|---|
| `PARA-MI-LEER-Y-TENER-A-MANO/` | **La carpeta del dueño**: `00-EMPIEZA-AQUI.md` (qué hacer ahora) + `01-lista-de-lanzamiento` · `02-operacion-corta` · `03-guia-del-administrador` («¿qué hago si…?») · `04-guia-rapida` (comandos y TODO el SQL para pegar) · `05-publicacion` · `06-textos-legales` (GENERADO: `npm run textos-legales`) · `07-enlaces-para-redes` + `QR-para-imprimir/` (GENERADO: `npm run qr`). **Todo lo que el usuario deba leer va ahí, numerado y enlazado desde `00`.** |
| `PLAN.md` · `pendientes.md` | Estado de las etapas · lo que falta decidir (con placeholders) y el análisis de la Ley 1581 |
| `documentos/bitacora.md` | Registro cronológico con el porqué (§15 = revisión de noviembre) |
| `documentos/auditoria-2026-11.md` | La revisión de noviembre: los 40 puntos, qué se hizo y dónde |
| `documentos/claude-md-historico-2026-11.md` | El CLAUDE.md completo anterior (historia de cada etapa) |
| `documentos/calibrar-dificultad.md` · `pruebas-en-celulares.md` · `reporte-etapa6.md` · `fase-a-paquete.md` · `salsa-referencia.md` | Referencias técnicas (las escritas antes de abrir hablan de borrar TODO: con clientes reales se usa `limpiar_solo_pruebas.sql`) |
| `supabase/LEEME.md` · `supabase/migrations/*.sql` · `supabase/sql/` | El servidor: cómo está hecho, las migraciones (0001–0005) y las consultas útiles/limpieza/auditoría |
| `historial/` | Hitos congelados + capturas. **Nunca se borran ni se editan.** |

## 2. Cómo trabajamos
- **Tutear, español colombiano** (el usuario usa voseo; se le contesta en tú). Es estudiante de ingeniería multimedia: sabe GitHub y Unity, **no** Supabase ni Node → **explicar cada paso como si no lo supiera** y en simple (primero qué había, qué hay y cómo se sabe que funciona; el detalle va en los `.md`).
- **Preguntas antes que suposiciones; cambios pequeños.** Si un prompt viejo contradice lo decidido en el chat, gana el chat. Feedback largo → convertirlo en **lista numerada** y confirmar lo ambiguo.
- **Revisiones grandes: primero revisar TODO sin cambiar nada y presentar la lista; él aprueba por bloques** (así se hizo la auditoría de noviembre). Ante una corrección de diseño ambigua: **3 interpretaciones** para que elija.
- **No tocar el arte de los modelos ni cambiar el juego** sin que lo pida; robustez y pulido sí. Comprobar todo cambio de modelo con `?debug=1` → «Ver de cerca».
- **Siempre decir cómo ver lo hecho:** `npm run dev` → `http://localhost:5173/…` (y la IP de la wifi para el celular); demo sin tocar nada real con `?api=falsa`. **Preview en localhost antes de cada commit.**
- **Los commits los hace el usuario** con GitHub Desktop (Claude no hace commit ni push). Al cerrar: resumen + archivos + **una frase corta para el commit**.
- **Honestidad:** no presentar estimaciones como mediciones; avisar lo que no se probó (celular real, servidor real).
- Lo sin resolver va a `pendientes.md` con **placeholders visibles** (`[ENLACE DE GOOGLE MAPS]`…); **nunca se inventa**.
- **Nunca** pedir ni guardar PIN, claves, tokens ni correos personales (el repo es **público**).
- **Mantener al día** `04-guia-rapida.md` (comandos y SQL; `probar-sql` ejecuta todos sus bloques) y `03-guia-del-administrador.md` (cada situación nueva).
- **Historial:** en hitos importantes `npm run hito -- "nombre" "Título" "Descripción" "ruta/"` + capturas en `historial/NN-nombre/capturas/` anotadas en `historial/hitos.json` (editar JSON con **Node**).
- **Supabase por el conector de Claude:** el usuario alterna dos cuentas. Antes de usarlo, `list_projects` debe mostrar `cholado-runner` (`vaphorsfnfuebfjuhmof`, cuenta `hachescc`); si salen otros proyectos es la cuenta de su trabajo → **no ejecutar nada y avisar**. Todo cambio de SQL: primero `npm run sql` + `npm run probar-sql`, y **solo se aplica al servidor real con su visto bueno** (o él pega `supabase/todo-junto.sql`). Al aplicarlo por el conector, comprobar antes en PGlite que el SQL parcial deja el servidor idéntico a pegar todo.

## 3. Reglas del negocio — TODO configurable desde el panel, nada quemado en el código
- **Premio:** compra mínima **$30.000** en productos pagados (el regalo no cuenta). Quien atiende elige con el cliente: **un raspao personal** o **un cholado de 10 oz** (lista editable, 1–6). Un regalo por código, **no acumulable**.
- **Para ganar:** llegar a la meta (~60 s) con **mínimo 25 frutas** (de ~71). 3 vidas.
- **Banco:** 50 premios por semana; la semana va de **lunes 00:00 a domingo 23:59 (Bogotá)**. Contador = tope − expedidos − **apartados**. Agotado → «vuelve el lunes». Vencidos NO se reciclan. **Cupo diario** opcional (hoy apagado).
- **Intentos:** 3 por semana por navegador (id anónimo contado en el servidor; Instagram y Safari cuentan aparte: aceptado).
- **Códigos:** se crean al reclamar, formato `LAINDIA-7K3Q` (alfabeto de 32 sin 0/O/1/I), únicos. **Plazo máximo 7 días** exactos desde la expedición cortada al minuto; el ticket dice «vale hasta» = vence − 1 min. Estados `activo | canjeado | desactivado`; `vencido` se calcula.
- **Un código por celular cada 7 días** (10 dígitos, empieza por 3; acepta +57). Si ya tiene, se dice desde cuándo puede volver, **sin mostrar el código ajeno**.
- **Premio apartado 15 min** al validar la victoria; se puede reclamar hasta 6 h después si queda cupo. Si se acabó justo antes: «¡Llegaste, pero ya no quedan premios!».
- **Sin login para jugadores.** Nombre + celular + casilla de autorización sin premarcar (Ley 1581). **Datos hasta 6 meses después de que termine la campaña** (ojo: la campaña no tiene fecha de fin → punto 37 de la auditoría, pendiente de decidir).
- **Canje solo en el local**, todos los días de **2:00 p. m. a 9:00 p. m.** (`LOCAL` en `textos.js`). Caja con **PIN** (6 a 8 dígitos al cambiarlo; el del usuario ya es de 6); el sistema no valida los $30.000 (lo valida quien atiende).
- **Distribución:** QR (mostrador y vasos) + Instagram/Facebook (abren en su navegador interno: debe funcionar ahí) + «Reta a un amigo» (`utm_source=amigo`).

## 4. Seguridad: lo innegociable
1. Un código **jamás** se asigna a dos personas (asignación atómica, candado global `pg_advisory_xact_lock('cholado:premios')`).
2. Un código canjeado no se reactiva ni se canjea dos veces (`for update`).
3. Todas las fechas con el **reloj del servidor**; ninguna función pública recibe fecha u hora.
4. **Ningún secreto** en el cliente ni en el repo; solo la clave pública (publishable) en `web/js/supabase-config.js`.
- Antifraude **nivel bajo** aceptado: la victoria se valida en el servidor (token + tiempo mínimo 45 s + frutas mínimas, que informa el celular). Aceptado: reclamar sin jugar esperando 45 s.
- **Límites por red** (huella sha256 con sal, nunca la IP; IPv6 por bloque /64): 150 partidas/hora, 8 códigos/día, **24 premios apartados/día** (3 × el de códigos), 5 PIN malos por red cada 15 min (30 global), **20 códigos inexistentes por red cada 15 min en la caja**, **3.000 partidas/hora en total** (todas las redes). Sin IP conocida no se aplica ningún límite. Una victoria que llega más de ~2 h después de empezar se rechaza.
- **Trampa de Supabase en migraciones:** toda función nueva en `public` queda con EXECUTE para anon/authenticated; revocar también a esos dos y conceder solo lo necesario. Cambiar la firma de una función pública deja viva la vieja (la auditoría de permisos ahora lo detecta).

## 5. Decisiones técnicas
- **Web estática** (Three.js **0.186.1** recortado en `web/vendor/three/three.min.js` con `npm run vendor`; repetirlo si se usa una clase nueva) en **GitHub Pages** + **Supabase** plan gratis. **JavaScript plano con módulos ES, sin compilar.** No se paga nada. Sin CDN; fuentes autoalojadas (Fredoka 600, Lilita One).
- **Supabase:** proyecto `cholado-runner` (`https://vaphorsfnfuebfjuhmof.supabase.co`, East US). Tablas en el esquema privado **`app`** con RLS y sin políticas; el público solo llama **22 funciones** `SECURITY DEFINER` de `public` (10 abiertas a anon + 12 `admin_*` solo para administradores en `app.admins`). Todas las funciones internas tienen `search_path` fijo (0005). El juego habla solo con `fetch` a `/rest/v1/rpc/…`. Plan gratis: 500 MB (hoy ~11 MB; el Resumen lo muestra), **sin backups** (CSV semanal desde el panel), **pausa tras ~1 semana sin actividad** (lo evita el aviso diario de GitHub Actions, que además se reactiva solo).
- **Migraciones:** `0001_tablas` · `0002_funciones` · `0003_staff_admin` · `0004_canales` · `0005_revision_noviembre`. `npm run sql` las junta en `supabase/todo-junto.sql` (idempotente; `probar-sql` falla si está desactualizado).
- **Arranque:** `main.js` pide el estado al servidor ANTES de armar la escena (las dos cosas a la vez) y el HTML ya trae el logo + «Cargando…» (se ve sin esperar al JavaScript). Servidor medido: ~230 ms por llamada (la primera ~1 s por el saludo TLS).
- **Personajes con más detalle** (`crearModelos(2.4, { soloPersonajes: true })` en `escena.js`): cholado y La India se ven redondos; ~3–7 mil triángulos más en juego (≈ 33–39 mil en total). En celulares con ≤ 2 GB (`gamaBaja`) se quedan en 1,6.
- **Rendimiento:** mobile first, vertical, pixel ratio máx. 1,5; una malla fusionada por objeto con color por vértice; `InstancedMesh`; sombras falsas; cielo en CSS; **calidad adaptativa** (baja resolución, luego quita el contorno; salta escalones que no cambian nada y vuelve atrás si no ayuda); sin basura por cuadro; carga ~0,27 MB comprimidos.
- **Sonido:** `web/js/audio.js`. **Música = una salsa ORIGINAL al estilo caleño** (pedido del usuario: no copiar la vieja ni una canción con derechos): 32 compases en La menor a 174 BPM, clave 2-3; A tema de trompetas en terceras · B «coro» de trompetas + maracas · C mambo (riff de trombones, golpes de trompetas, campana) · D moña (contramelodía aguda) con «paila» de timbal; el menú repite solo A y B, suave. **Casi todo GRABADO** (Fluid R3, MIT, `web/assets/sonidos/` + `LICENCIA.txt`, ~1 MB que se baja tras el primer toque): piano, trompetas, trombones, bajo (MP3 de gleitz/midi-js-soundfonts) y conga, tumba, bongó, timbales, campana, clave, güiro, maracas y platillo (WAV sacados del `FluidR3_GM.sf2` del paquete Debian `fluid-soundfont-gm`). Paneo de tarima, «mano humana» y respaldo con osciladores si algo no carga. Niveles medidos con `_renderizar`: pico ~0,76, cero recortes (`VOL_MUSICA` juego 0,5 — no subirlo). Los efectos siguen siendo osciladores. Claude no puede oír: el usuario juzga cómo suena.
- **Interfaz** en español colombiano caleño; **todos los textos en `web/js/textos.js`** con un solo vocabulario: PREMIO (banco) · CÓDIGO (lo que recibe; nunca «cupón») · REGALO (el producto) · se ACTIVA en el juego y se CANJEA en el local · «celular» · «promo».

## 6. El juego (decidido)
- Runner vertical, cámara detrás, **3 carriles**. Deslizar izquierda/derecha = un carril por gesto; deslizar arriba o tocar = saltar. Teclado: ←/→/A/D, ↑/W/espacio, Esc/P pausa. Agacharse: no.
- **3 vidas**; un choque quita una vida y da 1,3 s de invulnerabilidad (evaluada por obstáculo: una fila doble quita UNA vida). Salto con fórmula exacta (igual a cualquier FPS).
- **Personaje a elección** (Choladito / La India), recordado en el navegador; todo cambio de estilo o animación se aplica a los dos. Nombre provisional **«Corre por tu cholado»**.
- **6 frutas** para recoger (fresa, mango, lulo, piña, papaya, manzana; `TIPOS_FRUTA` en `nivel.js`) y 3 variantes de caja. Obstáculos: caja baja, pila alta (no se salta), barra baja (se salta), doble.
- **Dificultad** (calibrable en `config.js` y desde el panel): velocidad 9,5 → 14,5, filas cada 1,5 → 0,95 s, tolerancia 0,18. Tras los arreglos de noviembre (salto exacto y doble choque) el bot da Novato ~2 % · Normal ~14 % · Experto ~51 % (antes 0,5 / 6 / 46 %; en parte porque el bot simula a 30 fps). **Recalibrar con gente real** (`documentos/calibrar-dificultad.md`).
- **Pausa:** «Seguir jugando» hace «3, 2, 1» antes de arrancar; también se pausa al perder el foco, al ocultar la página y si un cuadro tarda más de 0,5 s (iPhone congelado).

## 6a. Decorado de la pista (noviembre de 2026, el usuario eligió «mezcla de las tres»)
- **Negocio:** vallas con el logo de Cholados La India, canastas con las 8 frutas del local (lulo, maracuyá, piña, guanábana, papaya, banano, mango, limón; 4 variantes), (textura `assets/marca/logo.png`), vasos gigantes de cholado, puestos con toldo. **Cali** (ideas de la mamá del usuario): banderas de Cali (azul, rojo, blanco, rojo, verde; 3-1-3-1-3), las Tres Cruces y Cristo Rey en las montañas, La Ermita al fondo, el Gato del Río de Tejada, las gatas del río y carretas de chontaduro. **Fiesta:** parejas bailando salsa (giran), una tarima con la orquesta, gente animando, banderines. Todo es `InstancedMesh` con pocos triángulos que se repite en el ciclo de 80 m (`zLejos`); en juego ≈ 42–45 mil triángulos y ~42 llamadas de dibujo. Si se agrega una clase de Three.js (p. ej. `TextureLoader`), correr `npm run vendor`.

## 6b. Estilo gráfico «G» (base, no cierre definitivo)
- `MeshMatcapMaterial` con color por vértice y matcap por código (`matcap.js`, `pasos: 3, mezcla: 0.5`, sombra violeta), brillo ×1,15 (**no subirlo**). Contorno «tinta de color» (color ×0,3 + ciruela `#3a0f33`, nunca negro), 1,5 px, solo personaje, cajas y frutas. Paleta: cielo magenta→durazno, suelo lima, calle ciruela, celestes, sol amarillo.
- **Evitar:** low poly facetado (A), trazo negro grueso (B), luz ambiente alta sin sombras (E).
- **Cholado final «Mermelada»** (`modelos.js`, `cholado()`): vaso transparente sin nada por fuera, almíbar rojo fuerte con frutas reconocibles pegadas al plástico por dentro, morro de piña tapado con mermelada de mora, leche condensada cálida (`0xfce4a8`, `phiCrema` 0,24 π) con gotas, uvita en la punta con leche condensada centrada, wafer, manzana, pitillo y cuchara con el mango hacia afuera. **Sin bola de helado.** En noviembre se le quitaron ~2.700 triángulos que no se veían (piña y mermelada tapadas, semillas, gotas) sin cambiar el aspecto.

## 7. Marca y referencias
`referencias-diseno/` (solo local, 84 MB, no se sube). Logo amarillo→naranja con contorno negro; eslogan «¡Aquí Desafiamos La Sed y Castigamos El caLor!»; Instagram **@cholados.laindia**. Menú: raspao $8.000/$11.000, cholado $15.000/$20.000.

## 8. Entorno y cómo probar
- Windows 11, PowerShell 5.1 y Git Bash, GitHub Desktop, Node v24.20.0 (**no está en el PATH del shell de Claude**: `$env:Path = 'C:\Program Files\nodejs;' + $env:Path`). Editar JSON con Node. Probado por el usuario en iPhone XR, iPhone 13 Pro y un Android de gama baja.
- **Navegador integrado de Claude:** mostrar el panel antes de probar (si está oculto, la página se pausa). Para jugar en pruebas: `?debug=1&api=falsa` + `window.__cholado` (`tick(dt)`, `jugar()`, `pausar()`, `escena.fijarCamara`, `api.debug.fijar({tiempoMinimoS:0})`) + `cfg.desarrollo.autoPausa=false` + `invencible=true`. FPS reales solo en el celular. Restablecer el tamaño a *desktop* y detener el servidor al terminar.
- **Pruebas:** `npm run probar-sql` (**310 ✓**, PGlite, no toca nada real) · `probar-canal` (19 ✓) · `probar-mutaciones` · `revisar-secretos` · `simular` · contra el servidor real, solo lectura: `probar-seguridad` (19 ✓), `probar-ataques`. **Las que escriben en el servidor real** (`probar-supabase`, `probar-canje`, `probar-ataques -- --completo`) exigen `--gasta-premios-reales` y se limpian con `supabase/sql/limpiar_solo_pruebas.sql` (borra solo los `PRUEBA-…`). `limpiar_pruebas.sql` borra TODO: solo antes de abrir.

## 9. Estructura
```
web/            ← lo único que se publica
  index.html · 404.html · manifest.webmanifest · css/ (juego, panel)
  js/ main · config · textos · util · reloj · dispositivo · audio · canal · api(-supabase, -falsa) · supabase-config
      game/ (logica, nivel, bot, escena, controles, modelos, modelos-nivel, materiales, matcap, paleta) · ui/ (ui, debug)
      panel/ (dom, formato, rpc, auth, canje-ui, falso)
  canje/ · admin/ · diagnostico/ · vendor/three/ · assets/ (fonts, marca)
supabase/       LEEME · todo-junto.sql (GENERADO) · migrations/0001…0005 · sql/ (consultas_utiles, limpiar_pruebas, limpiar_solo_pruebas, auditoria_permisos)
tools/          dev-server · vendor-three · guardar-hito · simular · juntar-sql · probar-* · seguro-servidor-real · revisar-secretos · generar-qr · textos-legales · generar-imagenes-marca.browser.js
.github/workflows/  publicar.yml (Pages, revisa secretos antes) · mantener-supabase-despierto.yml (ping diario + se reactiva solo)
PARA-MI-LEER-Y-TENER-A-MANO/ · documentos/ · historial/ · referencias-diseno/ (local)
```

## 10. Lo que hay que saber al tocar cada parte
- **Lógica pura** (`logica.js`, `nivel.js`, `bot.js`; sin Three.js ni DOM). Lo que pasa por un toque entra por `p.eventosEntrada` y llega a `p.eventos` en el siguiente `paso()`; `main.js` vacía `p.eventos` después de dibujar. La escena solo muestra el estado.
- **Flujo (`main.js`):** `navegacion` descarta respuestas viejas; mientras `iniciando` solo responde el botón de sonido. **Victoria pendiente:** al llegar a la meta se guarda `{token, progreso, frutas}` en `localStorage` (`cholado-victoria-pendiente`, `-falsa` para la demo); vale 2 h; el aviso sale en máximo 3 visitas pero **el tope nunca borra ni impide reclamar**; solo HTTP 400/404/422 = partida inválida.
- **Pantallas (`ui/ui.js`):** inicio con el gancho (qué se gana y con qué compra); ticket en orden código → vale hasta → **dónde canjearlo** (con «Cómo llegar» si `LOCAL.mapa` existe) → captura → pasos; perdiste con título según el avance; pantallas finales con Instagram y «Reta a un amigo» (`navigator.share`; si no hay, WhatsApp).
- **Servidor:** la dificultad del servidor (`app.configuracion.juego`) se mezcla sobre `config.js` (salvo en `?debug=1`). `app.ajustar_juego` es solo para el SQL Editor.
- **Caja y panel:** nunca `innerHTML` con datos (`panel/dom.js`). CSV con **punto y coma**, todo entre comillas y antiinyección de fórmulas; `*.csv` está en `.gitignore`. La sesión del panel solo se borra si Supabase la rechaza (400/401/403). «Desbloquear la caja» siempre visible. La configuración guarda **solo lo que cambió** y pide confirmación si el cambio cierra el juego.
- **Canales (UTM):** `canal.js` los lee, recuerda 30 días (o en memoria si el navegador no deja guardar) y los quita de la barra; `registrar_canal` los anota por partida; el panel los muestra en Resumen.
