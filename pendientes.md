# pendientes.md — Cosas por resolver

Lo que **NO** está decidido o falta. Mientras tanto se usan **placeholders visibles** en el código y los textos (no se inventa). Actualizar al resolver cada punto.
Última actualización: 2026-10-19 (cierre de la Etapa 4).

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
| 9 | **Dispositivo del staff** para canjear y quién usa el PIN (PIN compartido, cambiable) | — | Etapa 5 | Cualquiera que atienda |
| 10 | **Música y sonidos** (salsa caleña, frescura) con **licencia libre** o generados. No estaba en el Prompt 3: decidir si va como mini-etapa o después | sin audio | por decidir | |
| 11 | **Android de gama baja** para probar (hoy solo iPhone XR) | emulación en DevTools | Etapa 6 | Pedir uno prestado |
| 12 | **Probar en el navegador interno de Instagram/Facebook** (iOS y Android) y medir FPS del juego completo en el iPhone con `?debug=1` | — | Etapa 6 | El usuario ya probó el prototipo: «todo bien» |
| 13 | **Términos y condiciones** (vigencia, límite semanal, un cupón por número, compra mínima, un regalo por código, frutas mínimas) | texto provisional | Etapa 7 | |
| 14 | **Dominio propio** (opcional; «depende de qué nos vaya») | URL de GitHub Pages | futuro | |
| 15 | **Deslizar hacia abajo** (agacharse): probar más adelante | se ignora | futuro | Puede chocar con gestos del navegador de Instagram |
| 16 | **Mejoras estéticas** (pospuestas a propósito hasta terminar todas las etapas): cholado con frutas «adentro» del vaso; bola de helado «pintada hasta la mitad»; más detalle en La India y el escenario; más elementos de escenario; cartel ¡META! poco legible a distancia; animación de choque simple; posible cambio de colores | — | después de la Etapa 7 | |
| 17 | En iPhone con **modo de bajo consumo** (30 fps) la imagen no mejora aunque baje la calidad | la calidad adaptativa vuelve atrás | — | Solo informativo |
| 18 | **Limpiar los datos de prueba antes del lanzamiento**: `supabase/sql/limpiar_pruebas.sql` (hoy hay códigos y partidas de prueba, p. ej. `LAINDIA-QB9A`) | — | Etapa 7 (antes de abrir al público) | Nunca con clientes reales |
| 19 | **Restaurar la dificultad del servidor** tras la prueba (se dejó `velocidad.inicial = 11` y `frutas_minimas = 24`): `update app.configuracion set juego = '{}'::jsonb, frutas_minimas = 25 where id = 1;` | — | **Ya** | El usuario debe correrlo; Claude lo verifica |
| 20 | **Limitar partidas por IP** (un script con muchos id de dispositivo podría gastar el banco esperando 45 s por partida). Cuidado con IPs móviles compartidas | — | Etapa 6 | Antifraude bajo aceptado, pero es el hueco conocido |
| 21 | **Backups**: el plan gratis no hace; exportar CSV de `codigos` de vez en cuando (botón en el panel admin) | — | Etapa 5 | |
| 22 | **Contraseña de la base de datos de Supabase**: la guarda el usuario en privado; Claude nunca la ve | — | siempre | Si se pierde se puede restablecer desde el panel |
| 23 | **Regalo elegido al canjear**: la columna `regalo_elegido` ya existe; se llena en la Etapa 5 | NULL | Etapa 5 | |
| 24 | **Plazo de conservación de datos** (nombre y celular): decidir cuándo borrar/anonimizar (p. ej. al cerrar la campaña) | — | Etapa 7 | Ver Ley 1581 (#2) |

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
- FPS de los previews en el iPhone XR → ✅ ~60 (mínimo 57).

## Análisis: ¿aplica la Ley 1581 de 2012? (2026-10-19)
Conclusión: **sí aplica, pero la carga es liviana.** No soy abogado; conviene confirmarlo con el contador o un abogado antes de lanzar.
- Nombre + celular son **dato personal** (información asociada a una persona natural determinable). «No sensible» solo significa que no hay exigencias reforzadas; la ley aplica igual. La excepción de uso exclusivamente personal o doméstico no cubre un negocio.
- Aunque «no lo usemos para nada», **sí lo guardamos** (en Supabase), porque hace falta para el límite de 1 código por 7 días y para el canje. Guardar o consultar ya es «tratamiento».
- **Registro ante la SIC (RNBD): probablemente NO obligatorio.** Solo obliga a sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT (Decreto 090 de 2018, que excluye a micro y pequeñas empresas y a personas naturales). Quedar fuera de ese registro no exime de cumplir la ley.
- **Lo mínimo razonable:** (1) casilla de consentimiento sin premarcar (ya hecha); (2) texto corto con la finalidad (entregar y controlar el código, contactar por el premio); (3) quién es el responsable y cómo pedir consultar, corregir o borrar datos; (4) mencionar que se guardan en un proveedor en la nube fuera de Colombia; (5) política corta de tratamiento accesible desde el juego (hay un modal provisional); (6) plazo de conservación (ej. borrar o anonimizar al cerrar la campaña).
- Decisión del usuario: dejarlo pendiente. Se mantiene la casilla y el texto breve desde el prototipo para no rehacerlo después.

Fuentes consultadas: [Decreto 090 de 2018 (RNBD)](https://www.dmsjuridica.com/buscador_20179478954/legislacion/decretos/2023/08/18/decreto-90-de-2018/?pdf=51525), [Decreto 1377 de 2013](https://www.cchuila.org/wp-content/uploads/Decreto_1377_de_2013.pdf), [Ley 1581 de 2012](https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/ley/Ley_1581_2012.pdf).
