# PLAN.md — Cholado Runner

Estado por etapas. **Regla:** solo se trabaja en la etapa que el usuario pida; al cerrar cada una se resume (qué se hizo, archivos tocados, frase de commit), se espera el visto bueno y se actualiza este archivo y los demás documentos.
Última actualización: 2026-10-19 (Etapa 5 hecha, probada contra el servidor real y aprobada por el usuario; **siguiente: Etapa 6, a la espera del Prompt 6**).
Contexto completo en `CLAUDE.md`; historia detallada en `documentos/bitacora.md`; lo abierto en `pendientes.md`.

| # | Etapa | Estado |
|---|---|---|
| 1 | Contexto y preguntas (sin código) | ✅ Hecha (2026-10-19) |
| 2 | Estilo gráfico (previews) | ✅ Hecha (2026-10-19). Elegido: **G = mezcla de D y F** |
| 3 | Prototipo jugable sin backend | ✅ Hecha y aprobada por el usuario (2026-10-19: «todo bien») |
| 4 | Backend en Supabase y conexión | ✅ Hecha, probada contra el servidor real y commiteada (`39f0e17`, 2026-10-19) |
| 5 | Página del staff (PIN) y panel admin | ✅ Hecha, probada contra el servidor real y aprobada por el usuario (2026-10-19) |
| 6 | Pruebas, seguridad y compatibilidad | ⏳ **Siguiente** — esperando el Prompt 6 (insumos en `CLAUDE.md` §13) |
| 7 | Publicación, QR y lista de lanzamiento | ⬜ |

## Etapa 1 — Contexto y preguntas ✅
Revisión de las 19 referencias y el menú; 10 preguntas respondidas por el usuario; análisis de la Ley 1581; creación de `CLAUDE.md`, `PLAN.md`, `pendientes.md`; `referencias-diseno/` agregada a `.gitignore`.

## Etapa 2 — Estilo gráfico ✅ (SIN implementar el juego)
- [x] 2.0 Node.js LTS (v24.20.0) y política de scripts de PowerShell.
- [x] 2.1 Paleta y tipografía extraídas de las referencias.
- [x] 2.2 Servidor local (`npm run dev`) + Three.js recortado en el repo (`npm run vendor`).
- [x] 2.3–2.5 Ronda 1 (A, B, C) y ronda 2 (D, E, F) probadas en el iPhone XR (~60 FPS, mínimo 57); cholado rehecho fiel a las referencias.
- [x] 2.6 **Decisión: estilo G = D + F** (sombritas suaves + brillo de gelatina + contorno fino de color), para el choladito y para La India. Receta en `CLAUDE.md` §6b.

## Etapa 3 — Prototipo jugable sin backend ✅
- [x] 3.0 `historial/` con evidencias + `npm run hito` (hitos 01–04).
- [x] 3.1 Bucle de juego, cámara y pista de 3 carriles.
- [x] 3.2 Controles: deslizar (**un gesto = un carril**), tocar para saltar, teclado.
- [x] 3.3 Obstáculos (4 tipos), frutas, colisión con tolerancia, 3 vidas.
- [x] 3.4 Meta con el cholado de premio, 60 s, **frutas mínimas (25) para ganar**, toda la dificultad en `config.js`.
- [x] 3.5 Pantallas: inicio (premios, intentos, **selector de personaje permanente**), ayuda, pausa, ganaste (formulario con celular de 10 dígitos), código, «este número ya tiene un cupón», perdiste (+ «te faltaron frutas»), sin intentos, sin premios, error.
- [x] 3.6 API falsa (`api-falsa.js`) detrás de `api.js` (contrato documentado), fácil de reemplazar.
- [x] 3.7 Modo `?debug=1` (FPS, deslizadores en vivo, estadísticas, simulador con bot) + `documentos/calibrar-dificultad.md`.
- [x] 3.8 Ajustes del primer feedback (A1–A7 abajo) y **visto bueno final del usuario**.
- [x] 3.9 Documentación completa: `CLAUDE.md` reescrito, `documentos/bitacora.md`, `pendientes.md` depurado.
- **Sin hacer (aplazado, ver `pendientes.md`):** sonido y música; medir FPS con el juego completo en el iPhone; probar en el navegador interno de Instagram/Facebook (Etapa 6).

Ajustes tras el primer feedback (todos hechos): A1 un gesto = un carril · A2 selector Choladito/La India permanente · A3 mínimo de frutas para ganar · A4 más velocidad (9,5→14,5) · A5 celular de 10 dígitos con formato · A6 un cupón por número (7 días **confirmados**) · A7 historial protegido y `web/previews/` borrado.

Archivos principales de la etapa: `web/index.html`, `web/css/juego.css`, `web/js/**`, `tools/{simular,guardar-hito}.mjs`, `historial/**`, `documentos/{bitacora,calibrar-dificultad}.md`, y los `.md` de la raíz.

## Etapa 4 — Backend en Supabase ✅ (hecha y aprobada; commit `39f0e17`)
- [x] 4.1 Cuenta y proyecto creados por el usuario (guiado): `cholado-runner`, plan Free, región East US (North Virginia). Límites del plan gratis verificados (ver `CLAUDE.md` §5).
- [x] 4.2 Tablas en el esquema privado `app` + RLS sin políticas (`supabase/migrations/0001_tablas.sql`).
- [x] 4.3 Las 6 funciones `SECURITY DEFINER` (`0002_funciones.sql`): `ping`, `estado`, `iniciar_partida`, `terminar_partida`, `reclamar_codigo`, `mi_codigo`. Atómico con candado global; códigos `LAINDIA-XXXX`; vigencia 7 días exactos; un código por celular cada 7 días; premio apartado 15 min; cupo diario opcional.
- [x] 4.4 Cliente conectado: `api-supabase.js` (solo `fetch`), `reloj.js` (hora del servidor), `dispositivo.js` (id anónimo), `api.js` elige real/falsa, dificultad y reglas desde el servidor, ticket con cuenta regresiva y «Ver mi código» del servidor.
- [x] 4.5 Pruebas: `npm run probar-sql` (86 ✓), `npm run probar-supabase` (35 ✓ contra el servidor real, incluida la concurrencia: 100 ganadores → exactamente el cupo, códigos todos distintos), partida completa manual, error de conexión, dificultad cambiada desde el servidor y recibida por el juego.
- [x] 4.6 Documentación: `supabase/LEEME.md`, `documentos/bitacora.md` §9, `CLAUDE.md` §11–12, historial hito 05.
- [x] 4.7 Visto bueno del usuario (corrió la restauración de la dificultad, dijo «todo bien» y hizo el commit).
- **Recordatorio antes del lanzamiento:** correr `supabase/sql/limpiar_pruebas.sql` (borra códigos y partidas de prueba). La dificultad del servidor ya se restauró y se verificó (25 frutas, sin cambios de velocidad).
- **Decisiones del usuario en esta etapa:** códigos al reclamar · premio apartado 15 min · dificultad editable desde el servidor · 7 días por celular (sin cambio). Contradicciones del prompt resueltas a favor del chat: regalo se elige al canjear; código `LAINDIA-XXXX`.
## Etapa 5 — Caja con PIN y panel de administrador ✅ (hecha, probada contra el servidor real y aprobada el 2026-10-19)
- [x] 5.1 `0003_staff_admin.sql`: PIN en bcrypt verificado en el servidor, sin PIN por defecto; 5 PIN malos → bloqueo que se duplica (5, 10, 20, 40, 60 min); lista `app.admins`; 13 funciones nuevas.
- [x] 5.2 Página de la caja `web/canje/`: PIN + código → válido / ya canjeado / vencido / desactivado / inexistente; elegir regalo; canje atómico (una sola vez); no muestra datos personales.
- [x] 5.3 Panel `web/admin/`: login con Supabase Auth (correo y contraseña); Resumen · Códigos (filtros, buscador sin tildes, canjear, desactivar/reactivar, CSV) · Canjear (sin PIN) · Configuración (TODO editable, todo-o-nada) · Cuenta (PIN, desbloqueo, respaldo, salir).
- [x] 5.4 Pruebas: `probar-sql` 181 ✓; prueba de mutación de permisos; `probar-seguridad` (contra el servidor real, ~3 s); demo `?api=falsa` recorrida en el navegador; hito `historial/06-staff-admin/`.
- [x] 5.5 Documentación: `supabase/LEEME.md` (sección «Etapa 5»: crear usuario, anotarse admin, poner/cambiar PIN, desbloquear), `CLAUDE.md` §12–13, `documentos/bitacora.md` §10, `pendientes.md`.
- [x] 5.6 El usuario pegó 0003 en Supabase, creó su usuario (Auto Confirm), apagó el registro público, se anotó en `app.admins`, puso el PIN y probó `/canje/` y `/admin/` con datos reales: PIN malo → «PIN INCORRECTO», código válido → elegir regalo → «¡CANJEADO!», segundo intento → «YA FUE CANJEADO», y el panel lo mostró como canjeado. Claude verificó con `npm run probar-seguridad` (17/17 ✓).
- [x] 5.7 Visto bueno del usuario («todo salió acorde a lo esperado»).
- **Para ver el diseño sin tocar nada real:** <http://localhost:5173/canje/?api=falsa> (PIN 1234) y <http://localhost:5173/admin/?api=falsa> (cualquier correo, clave `demo`).
- **Decisiones de esta etapa:** el regalo se elige en la caja (el prompt decía «mostrar el regalo»); el PIN no tiene valor por defecto; el límite de PIN es global (compromiso: se puede bloquear la caja, el dueño desbloquea; límite por IP → Etapa 6); un canje no se deshace desde el panel; la caja no ve nombre ni celular.

## Etapa 6 — Pruebas, seguridad y compatibilidad ⬜
- [ ] Intentos de abuso y revisión de RLS; bordes de fecha (lunes 00:00, vencimiento a 7 días, cooldown por celular).
- [ ] Navegador interno de Instagram/Facebook en iOS y Android; gama baja (Android prestado); FPS reales.

## Etapa 7 — Publicación ⬜
- [ ] GitHub Pages desde `web/` con workflow; URL permanente `https://hachescc.github.io/cholado-runner/`; QR de alta resolución (mostrador y vasos); términos y condiciones; aviso de datos (Ley 1581); plan de contingencia; lista de lanzamiento; hito final en `historial/`.

## Después de la Etapa 7 (el usuario lo pidió así)
Mejoras **estéticas**: cholado con frutas «adentro» del vaso, bola de helado, más detalle en La India y el escenario, más elementos, posibles cambios de color, sonido y música.

## Decisiones tomadas
Ver `CLAUDE.md` (§3, §5, §6, §6b) y el detalle con su porqué en `documentos/bitacora.md`.
