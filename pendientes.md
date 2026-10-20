# pendientes.md — Cosas por resolver

Lo que **NO** está decidido o falta. Mientras tanto se usan **placeholders visibles** en el código y los textos (no se inventa). Actualizar al resolver cada punto.
Última actualización: 2026-10-19 (cierre de la Etapa 5).

## Abiertos
| # | Pendiente | Placeholder actual | Se necesita en | Notas |
|---|---|---|---|---|
| 1 | **Dirección y horario de caja del local** (el usuario no los tiene a mano) | `[DIRECCIÓN DEL LOCAL]`, `[HORARIO DE CAJA]` en `web/js/textos.js` (`LOCAL`) | Antes de lanzar (Etapa 7) | Salen en la pantalla del código |
| 2 | **Datos personales (Ley 1581)**: responsable (nombre o razón social, cédula/NIT), correo o teléfono de contacto, plazo de conservación, política breve | `[RESPONSABLE DE DATOS]`, `[CORREO DE CONTACTO]` en `textos.js` | Etapa 7 (publicar) | Ver análisis abajo; confirmar con contador/abogado |
| 3 | **Nombre definitivo del juego** (Atrapa tu cholado / Corre por tu cholado / Cholado Run) | «Corre por tu cholado» provisional (`textos.js`) | Antes de lanzar | Recomendación: «Corre por tu cholado» + «¡Atrapa tu cholado!» como lema |
| 4 | **Calibrar con gente real**: dificultad, velocidad y **frutas mínimas (25)** | `config.js` y, desde la Etapa 4, **el servidor** (`select app.ajustar_juego(...)`) | Tras Etapa 6 | El bot es pesimista (Normal ~6 %); usar `?debug=1` → estadísticas; ver `documentos/calibrar-dificultad.md` y `supabase/LEEME.md`. Si casi nadie gana: bajar `frutas_minimas` o `velocidad.final` |
| 5 | **Cupo diario** del banco (tráfico esperado desconocido) | **implementado, apagado** (`cupo_diario = 0`) | cuando se vea el tráfico real | Se activa con `update app.configuracion set cupo_diario = 7 where id = 1;` |
| 6 | **Fechas de la primera campaña** y de lanzamiento | `campana_inicio` / `campana_fin` = null (siempre activa) en `app.configuracion` | Antes de lanzar | Se fijan con `update app.configuracion set campana_inicio = ..., campana_fin = ...` |
| 7 | ~~Regla de vencimiento~~ → resuelta: minuto de expedición + 7 días exactos; se muestra «vale hasta» vence − 1 min (ver `CLAUDE.md` §3). Si el usuario prefiere otra, es una línea en `app.vencimiento` | — | — | ✅ pendiente de que el usuario la vea y confirme |
| 8 | **Evitar la pausa del plan gratis** de Supabase (~1 semana sin actividad): tarea diaria de GitHub Actions que llame a `ping()` | — | Etapa 7 | Límites ya verificados (`CLAUDE.md` §5) |
| 9 | **Dispositivo del staff** y quién sabe el PIN. La caja ya funciona en cualquier navegador (`/canje/`); falta decidir en qué dispositivo del local se deja abierta y a quién se le da el PIN | — | Etapa 7 (antes de lanzar) | Guardar la dirección como acceso directo en ese dispositivo. Al cambiar de personal, cambiar el PIN (panel → Cuenta) |
| 10 | **Música y sonidos** (salsa caleña, frescura) con **licencia libre** o generados. No estaba en el Prompt 3: decidir si va como mini-etapa o después | sin audio | por decidir | |
| 11 | **Android de gama baja** para probar (hoy solo iPhone XR) | emulación en DevTools | Etapa 6 | Pedir uno prestado |
| 12 | **Probar en el navegador interno de Instagram/Facebook** (iOS y Android) y medir FPS del juego completo en el iPhone con `?debug=1` | — | Etapa 6 | El usuario ya probó el prototipo: «todo bien» |
| 13 | **Términos y condiciones** (vigencia, límite semanal, un cupón por número, compra mínima, un regalo por código, frutas mínimas) | texto provisional | Etapa 7 | |
| 14 | **Dirección (URL) del juego: personalizarla o no.** Hoy sería `https://hachescc.github.io/cholado-runner/` (lleva el usuario de GitHub). Opciones: (a) **dominio propio** apuntando a GitHub Pages (pago pequeño anual, el más duradero para los QR), (b) **organización gratuita de GitHub** con el nombre del negocio (`nombre.github.io/cholado-runner`; hay que mover el repo), (c) dejarlo como está | URL de GitHub Pages | **ANTES de imprimir los QR** (Etapa 7) | Preguntado por el usuario el 2026-10-19. Supabase no es el link. Decidir y luego no cambiar |
| 15 | **Deslizar hacia abajo** (agacharse): probar más adelante | se ignora | futuro | Puede chocar con gestos del navegador de Instagram |
| 16 | **Mejoras estéticas** (pospuestas a propósito hasta terminar todas las etapas): cholado con frutas «adentro» del vaso; bola de helado «pintada hasta la mitad»; más detalle en La India y el escenario; más elementos de escenario; cartel ¡META! poco legible a distancia; animación de choque simple; posible cambio de colores | — | después de la Etapa 7 | |
| 17 | En iPhone con **modo de bajo consumo** (30 fps) la imagen no mejora aunque baje la calidad | la calidad adaptativa vuelve atrás | — | Solo informativo |
| 18 | **Limpiar los datos de prueba antes del lanzamiento**: `supabase/sql/limpiar_pruebas.sql` (hoy hay códigos y partidas de prueba; `LAINDIA-QB9A` quedó **canjeado** en la prueba de la caja) | — | Etapa 7 (antes de abrir al público) | Nunca con clientes reales. El PIN y el administrador NO se borran con esa limpieza (están en otras tablas) |
| 20 | **Limitar partidas por IP** (un script con muchos id de dispositivo podría gastar el banco esperando 45 s por partida). Cuidado con IPs móviles compartidas | — | Etapa 6 | Antifraude bajo aceptado, pero es el hueco conocido |
| 21 | **Backups**: el plan gratis no hace copias. El botón existe (panel → Códigos → Exportar CSV y Cuenta → Respaldo); falta el **hábito**: descargarlo cada semana y guardarlo en un lugar privado (trae nombres y celulares) | — | desde el lanzamiento | |
| 22 | **Contraseña de la base de datos de Supabase**: la guarda el usuario en privado; Claude nunca la ve | — | siempre | Si se pierde se puede restablecer desde el panel |
| 24 | **Plazo de conservación de datos** (nombre y celular): decidir cuándo borrar/anonimizar (p. ej. al cerrar la campaña) | — | Etapa 7 | Ver Ley 1581 (#2) |
| 26 | **Bloqueo de la caja por terceros**: el límite de PIN es global, así que cualquiera que conozca `/canje/` puede gastar los 5 intentos y bloquearla unos minutos (no puede entrar). El dueño desbloquea o canjea desde el panel. Arreglo de fondo: límite por IP (unir con #20) | global | Etapa 6 | Compromiso aceptado |
| 27 | **Seguridad extra del administrador** (opcional): 2FA con Supabase MFA, bitácora de acciones del admin («quién cambió qué»), «olvidé mi contraseña» por correo (hoy se cambia en Supabase → Authentication → Users) | no hay | Etapa 6 o después | |
| 28 | **Un canje equivocado no se deshace desde el panel** (regla: canjeado = desactivado para siempre). Si pasa de verdad hay una consulta manual en `supabase/sql/consultas_utiles.sql` | — | informativo | Decidir si el dueño quiere un botón «anular canje» con confirmación |
| 29 | **Datos personales en el CSV y en el panel** (nombres y celulares): quién los puede ver, dónde se guardan los respaldos y cuándo se borran | — | Etapa 7 (con la política de datos, #2 y #24) | El panel solo lo ve el administrador; la caja no los ve |
| 30 | **Rotar el PIN de la caja** cuando alguien del personal se vaya, y definir quién más es administrador (otro usuario + otra fila en `app.admins`) | — | desde el lanzamiento | |

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
- FPS de los previews en el iPhone XR → ✅ ~60 (mínimo 57).

## Análisis: ¿aplica la Ley 1581 de 2012? (2026-10-19)
Conclusión: **sí aplica, pero la carga es liviana.** No soy abogado; conviene confirmarlo con el contador o un abogado antes de lanzar.
- Nombre + celular son **dato personal** (información asociada a una persona natural determinable). «No sensible» solo significa que no hay exigencias reforzadas; la ley aplica igual. La excepción de uso exclusivamente personal o doméstico no cubre un negocio.
- Aunque «no lo usemos para nada», **sí lo guardamos** (en Supabase), porque hace falta para el límite de 1 código por 7 días y para el canje. Guardar o consultar ya es «tratamiento».
- **Registro ante la SIC (RNBD): probablemente NO obligatorio.** Solo obliga a sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT (Decreto 090 de 2018, que excluye a micro y pequeñas empresas y a personas naturales). Quedar fuera de ese registro no exime de cumplir la ley.
- **Lo mínimo razonable:** (1) casilla de consentimiento sin premarcar (ya hecha); (2) texto corto con la finalidad (entregar y controlar el código, contactar por el premio); (3) quién es el responsable y cómo pedir consultar, corregir o borrar datos; (4) mencionar que se guardan en un proveedor en la nube fuera de Colombia; (5) política corta de tratamiento accesible desde el juego (hay un modal provisional); (6) plazo de conservación (ej. borrar o anonimizar al cerrar la campaña).
- Decisión del usuario: dejarlo pendiente. Se mantiene la casilla y el texto breve desde el prototipo para no rehacerlo después.

Fuentes consultadas: [Decreto 090 de 2018 (RNBD)](https://www.dmsjuridica.com/buscador_20179478954/legislacion/decretos/2023/08/18/decreto-90-de-2018/?pdf=51525), [Decreto 1377 de 2013](https://www.cchuila.org/wp-content/uploads/Decreto_1377_de_2013.pdf), [Ley 1581 de 2012](https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/ley/Ley_1581_2012.pdf).
