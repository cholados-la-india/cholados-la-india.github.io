# PLAN.md — Cholado Runner

Estado por etapas. Regla: solo se trabaja en la etapa que el usuario pida; al cerrar cada una se resume, se espera visto bueno y se actualiza este archivo.
Última actualización: 2026-10-19.

| # | Etapa | Estado |
|---|---|---|
| 1 | Contexto y preguntas (sin código) | ✅ Hecha (2026-10-19) |
| 2 | 3 opciones de estilo gráfico (previews) | ⏳ Siguiente. Bloqueada hasta instalar Node.js LTS |
| 3 | Prototipo jugable sin backend | ⬜ |
| 4 | Backend en Supabase y conexión | ⬜ |
| 5 | Página del staff (PIN) y panel admin | ⬜ |
| 6 | Pruebas, seguridad y compatibilidad | ⬜ |
| 7 | Publicación, QR y lista de lanzamiento | ⬜ |

## Etapa 1 — Contexto y preguntas ✅
Hecho: revisión de las 19 referencias y el menú; 10 preguntas respondidas por el usuario; análisis de la Ley 1581; creación de `CLAUDE.md`, `PLAN.md`, `pendientes.md`; `referencias-diseno/` agregada a `.gitignore`.
Archivos tocados: `CLAUDE.md`, `PLAN.md`, `pendientes.md`, `.gitignore`.

## Etapa 2 — Estilo gráfico (SIN implementar el juego)
- [ ] 2.0 Instalar Node.js LTS (guía en el chat) y comprobar `node -v` / `npm -v`.
- [ ] 2.1 Extraer paleta y tipografía de las referencias.
- [ ] 2.2 Servidor local de preview + Three.js dentro del repo (`web/vendor/three/`).
- [ ] 2.3 Tres páginas de preview en `web/previews/` (choladito y La India, un obstáculo, fondo y HUD).
- [ ] 2.4 Ficha por opción: paleta, tipografía, cómo se ve el personaje, peso estimado en MB, pros y contras en gama baja.
- [ ] 2.5 El usuario elige → se documenta la decisión en `CLAUDE.md`.

## Etapa 3 — Prototipo sin backend
- [ ] 3.1 Bucle de juego, cámara y pista de 3 carriles.
- [ ] 3.2 Controles táctiles (deslizar) y teclado para probar en PC.
- [ ] 3.3 Obstáculos, coleccionables, colisión y vidas.
- [ ] 3.4 Meta, cronómetro de ~60 s y dificultad calibrable por config.
- [ ] 3.5 Pantallas (inicio, resultado, formulario simulado) con `config.js` simulado, textos en español caleño.
- [ ] 3.6 Sonido y música (pistas libres de licencia).
- [ ] 3.7 Optimización y prueba en iPhone XR (por IP local, misma red wifi).

## Etapa 4 — Supabase
- [ ] 4.1 Crear cuenta y proyecto (guiado) y verificar límites del plan gratis.
- [ ] 4.2 Tablas y reglas RLS.
- [ ] 4.3 Funciones SQL: iniciar intento, reclamar premio (atómico), estado de la semana.
- [ ] 4.4 Conectar el cliente (`api.js`).
- [ ] 4.5 Prueba de concurrencia: 100 reclamos simultáneos → cero códigos duplicados.

## Etapa 5 — Staff y admin
- [ ] 5.1 PIN del staff verificado en servidor.
- [ ] 5.2 Página de canje (~5 s).
- [ ] 5.3 Panel admin con login (Supabase Auth).
- [ ] 5.4 Configuración editable, métricas, desactivar códigos, exportar CSV.

## Etapa 6 — Pruebas, seguridad y compatibilidad
- [ ] Intentos de abuso y revisión de RLS; bordes de fecha (lunes 00:00, vencimiento a 7 días).
- [ ] Navegador interno de Instagram/Facebook en iOS y Android; gama baja.

## Etapa 7 — Publicación
- [ ] GitHub Pages desde `web/` con workflow; URL permanente; QR de alta resolución; términos y condiciones; plan de contingencia; lista de lanzamiento.

## Decisiones tomadas
Ver `CLAUDE.md` (secciones 3, 5 y 6). Resumen de lo decidido en Etapa 1: runner vertical de 3 carriles con deslizar; 3 vidas provisional; personaje y nombre sin decidir; regalo a elegir en caja (raspao personal o cholado 10 oz); PIN compartido; un solo local sin Rappi; assets por código; sonido sí; `referencias-diseno/` fuera de Git; cuenta GitHub `hachescc`.

## Pendientes
Ver `pendientes.md`.
