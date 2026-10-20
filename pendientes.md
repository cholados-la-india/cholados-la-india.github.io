# pendientes.md — Cosas por resolver

Lo que **NO** está decidido o falta. Mientras tanto se usan **placeholders visibles** en el código y los textos (no se inventa). Actualizar al resolver cada punto.
Última actualización: 2026-10-20 (cierre de la Etapa 6).

## Abiertos
| # | Pendiente | Placeholder actual | Se necesita en | Notas |
|---|---|---|---|---|
| 1 | **Dirección y horario de caja del local** (el usuario no los tiene a mano) | `[DIRECCIÓN DEL LOCAL]`, `[HORARIO DE CAJA]` en `web/js/textos.js` (`LOCAL`) | Antes de lanzar (Etapa 7) | Salen en la pantalla del código |
| 2 | **Datos personales (Ley 1581)**: responsable (nombre o razón social, cédula/NIT), correo o teléfono de contacto, plazo de conservación, política breve | `[RESPONSABLE DE DATOS]`, `[CORREO DE CONTACTO]` en `textos.js` | Etapa 7 (publicar) | Ver análisis abajo; confirmar con contador/abogado |
| 3 | **Nombre definitivo del juego** (Atrapa tu cholado / Corre por tu cholado / Cholado Run) | «Corre por tu cholado» provisional (`textos.js`) | Antes de lanzar | Recomendación: «Corre por tu cholado» + «¡Atrapa tu cholado!» como lema |
| 4 | **Calibrar la dificultad con gente real**: velocidad, obstáculos y **frutas mínimas (25)**. El juego ya se ve bien en el iPhone XR del usuario; falta ver cuántas personas ganan | `config.js` y **el servidor** (panel → Configuración → «Partida y dificultad», o `select app.ajustar_juego(...)`) | Fase bonus A y, sobre todo, después de lanzar | El bot es pesimista (Normal ~6 %); `?debug=1` → estadísticas; ver `documentos/calibrar-dificultad.md`. Si casi nadie gana: bajar las frutas mínimas o `velocidad.final` |
| 5 | **Cupo diario** (tope de premios por día): **opcional**, ya está en el panel → Configuración → «Cupo diario» (se prende/apaga y se elige cuántos por día; hoy **apagado**). Lo decide el usuario con su mamá; recomendación: activarlo antes de lanzar (p. ej. 8 al día) para que un programa solo pueda agotar los de un día | apagado | decidir antes de la Etapa 7 | También: `update app.configuracion set cupo_diario = 8 where id = 1;` |
| 6 | **Fechas de la primera campaña** y de lanzamiento | `campana_inicio` / `campana_fin` = null (siempre activa) en `app.configuracion` | Antes de lanzar | Se fijan con `update app.configuracion set campana_inicio = ..., campana_fin = ...` |
| 8 | **Evitar la pausa del plan gratis** de Supabase (~1 semana sin actividad): tarea diaria de GitHub Actions que llame a `ping()` | — | Etapa 7 | Límites ya verificados (`CLAUDE.md` §5) |
| 9 | **Dispositivo del staff** y quién sabe el PIN. La caja ya funciona en cualquier navegador (`/canje/`); falta decidir en qué dispositivo del local se deja abierta y a quién se le da el PIN | — | Etapa 7 (antes de lanzar) | Guardar la dirección como acceso directo en ese dispositivo. Al cambiar de personal, cambiar el PIN (panel → Cuenta) |
| 10 | **Música y sonidos** (salsa caleña, frescura) con **licencia libre** o generados (hoy el juego no tiene audio) | sin audio | **Fase bonus B** (estética) | Investigar pistas libres o generarlas |
| 13 | **Términos y condiciones** (vigencia, límite semanal, un cupón por número, compra mínima, un regalo por código, frutas mínimas) | texto provisional | Etapa 7 | |
| 14 | **Dirección (URL) del juego: personalizarla o no.** Hoy sería `https://hachescc.github.io/cholado-runner/` (lleva el usuario de GitHub). Opciones: (a) **dominio propio** apuntando a GitHub Pages (pago pequeño anual, el más duradero para los QR), (b) **organización gratuita de GitHub** con el nombre del negocio (`nombre.github.io/cholado-runner`; hay que mover el repo), (c) dejarlo como está | URL de GitHub Pages | **ANTES de imprimir los QR** (Etapa 7) | Preguntado por el usuario el 2026-10-19. Supabase no es el link. Decidir y luego no cambiar |
| 15 | **Deslizar hacia abajo** (agacharse): probar más adelante | se ignora | futuro | Puede chocar con gestos del navegador de Instagram |
| 16 | **Mejoras estéticas** (el usuario las quiere ANTES de publicar: **Fase bonus B**): cholado con frutas «adentro» del vaso; bola de helado «pintada hasta la mitad»; más detalle en La India y el escenario; más elementos de escenario; cartel ¡META! poco legible a distancia; animación de choque simple; posible cambio de colores; sonido y música (#10) | — | **Fase bonus B** (antes de la Etapa 7) | |
| 17 | En iPhone con **modo de bajo consumo** (30 fps) la imagen no mejora aunque baje la calidad | la calidad adaptativa vuelve atrás | — | Solo informativo |
| 18 | **Limpiar los datos de prueba antes de abrir al público**: `supabase/sql/limpiar_pruebas.sql` (hoy solo queda el código de prueba de `probar-canje`; pero cada prueba nueva del servidor real deja datos) | — | Etapa 7 (antes de abrir al público) | **Nunca** con clientes reales. El PIN, los administradores y las reglas NO se borran. Guía: `guia-rapida.md` 5.1 |
| 21 | **Backups**: el plan gratis no hace copias. El botón existe (panel → Códigos → Exportar CSV y Cuenta → Respaldo); falta el **hábito**: descargarlo cada semana y guardarlo en un lugar privado (trae nombres y celulares) | — | desde el lanzamiento | |
| 22 | **Contraseña de la base de datos de Supabase**: la guarda el usuario en privado; Claude nunca la ve | — | siempre | Si se pierde se puede restablecer desde el panel |
| 24 | **Plazo de conservación de datos** (nombre y celular): decidir cuándo borrar/anonimizar (p. ej. al cerrar la campaña) | — | Etapa 7 | Ver Ley 1581 (#2) |
| 27 | **Seguridad extra del administrador** (opcional): 2FA con Supabase MFA, bitácora de acciones del admin («quién cambió qué»), «olvidé mi contraseña» por correo (hoy se cambia en Supabase → Authentication → Users) | no hay | Etapa 6 o después | |
| 28 | **Un canje equivocado no se deshace desde el panel** (regla: canjeado = desactivado para siempre). Si pasa de verdad hay una consulta manual en `supabase/sql/consultas_utiles.sql` | — | informativo | Decidir si el dueño quiere un botón «anular canje» con confirmación |
| 29 | **Datos personales en el CSV y en el panel** (nombres y celulares): quién los puede ver, dónde se guardan los respaldos y cuándo se borran | — | Etapa 7 (con la política de datos, #2 y #24) | El panel solo lo ve el administrador; la caja no los ve |
| 30 | **Rotar el PIN de la caja** cuando alguien del personal se vaya, y definir quién más es administrador (otro usuario + otra fila en `app.admins`) | — | desde el lanzamiento | |
| 33 | **Pruebas en celulares reales** (**en pausa por decisión del usuario**; en su iPhone XR ya funciona): Instagram y Facebook (iPhone y Android), Safari, Chrome, un Android de gama baja. Guía: `documentos/pruebas-en-celulares.md` (usa `/diagnostico/`). Riesgos: deslizar desde el borde en el navegador interno de iPhone, barras de la app que recortan la pantalla, FPS en gama baja | — | retomar antes de la Etapa 7 y repetir con la URL `https://` real | |
| 34 | **Afinar los límites por red** con el uso real (150 partidas/hora y 8 códigos/día por internet) y revisar el **primer lunes** (premios en 50 y 3 intentos de nuevo) | — | después de lanzar | Panel → Configuración → Seguridad |
| 35 | **Volver a pegar `supabase/todo-junto.sql`** cuando el usuario quiera ver el cupo diario en el juego («Quedan N premios hoy») y en el Resumen del panel; sin pegarlo todo sigue funcionando (el juego dice «esta semana») | — | cuando quiera usar el cupo diario | Guía: `guia-rapida.md` 5.8 |
| 36 | **Fase bonus A**: el usuario prueba el juego, la caja y el panel en localhost, anota bugs y mejoras (Claude las ordena en una lista numerada y las corrige) | — | **Siguiente** | |

## Resueltos (para memoria)
- **Instalar Node.js** (v24.20.0) y política de scripts de PowerShell → ✅ (Etapa 2).
- **Estilo gráfico** → ✅ «G = D + F» (Etapa 2).
- **Personaje**: ✅ **el cliente elige** entre Choladito y La India (selector permanente), decidido el 2026-10-19 por el usuario y su mamá.
- **Días de espera por celular**: ✅ **7** (la regla original). El usuario dudó entre 2 y 3 días y luego dijo «deja los 7 como está; si algo luego te pido cambiarlo, no es grave» (`reglas.diasEntreCodigosPorCelular`).
- **Mínimo de frutas para ganar** → ✅ implementado (25, editable).
- **Saturación/contraste del estilo G** en el juego completo → ✅ el usuario lo vio y dijo «todo bien».
- **Selector «Choladito / La India», «Girar» y «Datos»**: el selector es permanente; «Girar» no está en el juego; «Datos» = mini panel de `?debug=1`.
- **Celular limitado a 10 dígitos**, **un deslizamiento = un carril**, **cupón único por número** (mensaje, sin revelar el código) → ✅.
- **Historial protegido** (`!historial/**` en `.gitignore` + aviso del script) → ✅.
- **Etapa 4 (2026-10-19)**: cuenta y proyecto de Supabase creados; SQL pegado y probado; códigos al reclamar; premio apartado 15 min; dificultad editable desde el servidor; códigos `LAINDIA-XXXX`; cupo diario implementado (apagado); `ping()` listo; regalo elegido al canjear (columna lista).
- **Restaurar la dificultad del servidor** tras la prueba de la Etapa 4 → ✅ el usuario corrió la línea y Claude verificó (25 frutas, sin cambios de velocidad).
- **Regalo elegido al canjear** → ✅ la caja lo pide y lo guarda en `regalo_elegido` (Etapa 5).
- **Etapa 5 (2026-10-19)**: caja con PIN (bcrypt, bloqueo), panel de administrador con login de Supabase Auth, editor de configuración, CSV, métricas, canje desde el panel; el PIN no tiene valor por defecto ni está en el repo.
- **Probar la caja y el panel contra el servidor real** → ✅ (2026-10-19): el usuario pegó 0003, creó su usuario, apagó el registro público, se anotó como administrador, puso el PIN y probó el canje real; `npm run probar-seguridad` 17/17 ✓.
- **Limitar partidas y PIN por red (IP)** → ✅ Etapa 6: 150 partidas/hora y 8 códigos/día por internet; el PIN cuenta los intentos por red; comprobado en el servidor real que `cf-connecting-ip` (Cloudflare) no se puede falsear.
- **Bloqueo de la caja por terceros** → ✅ Etapa 6 (cada red tiene sus intentos; el bloqueo general solo con 30 fallos sumando todas).
- **Textos legales visibles** (no acumulable, vigencia, compra mínima, fechas de la temporada, consentimiento) → ✅ Etapa 6 («Condiciones»).
- **Secretos/PIN en el repo y en su historial** → ✅ revisado (`npm run revisar-secretos`); registro público de Supabase apagado.
- **Etapa 6 (2026-10-20):** pegar `todo-junto.sql` y auditoría «✅ Todo en orden»; `probar-canje` (canje doble simultáneo) y limpieza de datos de prueba hechos por el usuario («todo bien»); `guia-rapida.md` creada.
- FPS de los previews en el iPhone XR → ✅ ~60 (mínimo 57).

## Análisis: ¿aplica la Ley 1581 de 2012? (2026-10-19)
Conclusión: **sí aplica, pero la carga es liviana.** No soy abogado; conviene confirmarlo con el contador o un abogado antes de lanzar.
- Nombre + celular son **dato personal** (información asociada a una persona natural determinable). «No sensible» solo significa que no hay exigencias reforzadas; la ley aplica igual. La excepción de uso exclusivamente personal o doméstico no cubre un negocio.
- Aunque «no lo usemos para nada», **sí lo guardamos** (en Supabase), porque hace falta para el límite de 1 código por 7 días y para el canje. Guardar o consultar ya es «tratamiento».
- **Registro ante la SIC (RNBD): probablemente NO obligatorio.** Solo obliga a sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT (Decreto 090 de 2018, que excluye a micro y pequeñas empresas y a personas naturales). Quedar fuera de ese registro no exime de cumplir la ley.
- **Lo mínimo razonable:** (1) casilla de consentimiento sin premarcar (ya hecha); (2) texto corto con la finalidad (entregar y controlar el código, contactar por el premio); (3) quién es el responsable y cómo pedir consultar, corregir o borrar datos; (4) mencionar que se guardan en un proveedor en la nube fuera de Colombia; (5) política corta de tratamiento accesible desde el juego (hay un modal provisional); (6) plazo de conservación (ej. borrar o anonimizar al cerrar la campaña).
- Decisión del usuario: dejarlo pendiente. Se mantiene la casilla y el texto breve desde el prototipo para no rehacerlo después.

Fuentes consultadas: [Decreto 090 de 2018 (RNBD)](https://www.dmsjuridica.com/buscador_20179478954/legislacion/decretos/2023/08/18/decreto-90-de-2018/?pdf=51525), [Decreto 1377 de 2013](https://www.cchuila.org/wp-content/uploads/Decreto_1377_de_2013.pdf), [Ley 1581 de 2012](https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/ley/Ley_1581_2012.pdf).
