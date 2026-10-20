# PLAN.md — Cholado Runner

Estado por etapas. **Regla:** solo se trabaja en la etapa que el usuario pida; al cerrar cada una se resume (qué se hizo, archivos tocados, frase de commit), se espera el visto bueno y se actualiza este archivo y los demás documentos.
Última actualización: 2026-10-19 (cierre de la Etapa 3; **siguiente: Etapa 4, a la espera del Prompt 4 del usuario**).
Contexto completo en `CLAUDE.md`; historia detallada en `documentos/bitacora.md`; lo abierto en `pendientes.md`.

| # | Etapa | Estado |
|---|---|---|
| 1 | Contexto y preguntas (sin código) | ✅ Hecha (2026-10-19) |
| 2 | Estilo gráfico (previews) | ✅ Hecha (2026-10-19). Elegido: **G = mezcla de D y F** |
| 3 | Prototipo jugable sin backend | ✅ Hecha y aprobada por el usuario (2026-10-19: «todo bien») |
| 4 | Backend en Supabase y conexión | ⏳ **Siguiente** — esperando el Prompt 4 |
| 5 | Página del staff (PIN) y panel admin | ⬜ |
| 6 | Pruebas, seguridad y compatibilidad | ⬜ |
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

## Etapa 4 — Backend en Supabase ⏳ (esperando el Prompt 4)
Tareas previstas (originales; el Prompt 4 puede refinarlas — gana lo que diga el usuario):
- [ ] 4.1 Crear cuenta y proyecto (**guiado**: el usuario no conoce Supabase) y verificar límites del plan gratis y la pausa por inactividad.
- [ ] 4.2 Tablas y reglas RLS.
- [ ] 4.3 Funciones SQL: iniciar intento/partida, reclamar premio (**atómico**), estado de la semana.
- [ ] 4.4 Conectar el cliente: crear `web/js/api-supabase.js` con el mismo contrato y cambiar una línea en `api.js`.
- [ ] 4.5 Prueba de concurrencia: 100 reclamos simultáneos → **cero códigos duplicados**.
- Insumos ya decididos (contrato, reglas del servidor, temas a confirmar): **`CLAUDE.md` §11**.
- Antes de empezar: decir en 3 líneas qué hay hecho (regla del prompt) y confirmar con el usuario las preguntas abiertas de §11.

## Etapa 5 — Staff y admin ⬜
- [ ] 5.1 PIN del staff verificado en servidor (PIN compartido, cambiable).
- [ ] 5.2 Página de canje (~5 s): existe, vigente, no canjeado → marcar canjeado → mostrar regalo.
- [ ] 5.3 Panel admin con login (Supabase Auth, correo).
- [ ] 5.4 Configuración editable (reglas y dificultad), métricas (partidas, ganadores, canjes), desactivar códigos, exportar CSV.

## Etapa 6 — Pruebas, seguridad y compatibilidad ⬜
- [ ] Intentos de abuso y revisión de RLS; bordes de fecha (lunes 00:00, vencimiento a 7 días, cooldown por celular).
- [ ] Navegador interno de Instagram/Facebook en iOS y Android; gama baja (Android prestado); FPS reales.

## Etapa 7 — Publicación ⬜
- [ ] GitHub Pages desde `web/` con workflow; URL permanente `https://hachescc.github.io/cholado-runner/`; QR de alta resolución (mostrador y vasos); términos y condiciones; aviso de datos (Ley 1581); plan de contingencia; lista de lanzamiento; hito final en `historial/`.

## Después de la Etapa 7 (el usuario lo pidió así)
Mejoras **estéticas**: cholado con frutas «adentro» del vaso, bola de helado, más detalle en La India y el escenario, más elementos, posibles cambios de color, sonido y música.

## Decisiones tomadas
Ver `CLAUDE.md` (§3, §5, §6, §6b) y el detalle con su porqué en `documentos/bitacora.md`.
