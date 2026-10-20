# PLAN.md — Cholado Runner

Estado por etapas. Regla: solo se trabaja en la etapa que el usuario pida; al cerrar cada una se resume, se espera visto bueno y se actualiza este archivo.
Última actualización: 2026-10-19 (cierre de Etapa 2; siguiente: Etapa 3).

| # | Etapa | Estado |
|---|---|---|
| 1 | Contexto y preguntas (sin código) | ✅ Hecha (2026-10-19) |
| 2 | Estilo gráfico (previews) | ✅ Hecha (2026-10-19). Elegido: **G = mezcla de D y F** |
| 3 | Prototipo jugable sin backend | 🔄 Ajustado tras el primer feedback (2026-10-19); esperando que el usuario lo pruebe de nuevo y dé el visto bueno |
| 4 | Backend en Supabase y conexión | ⬜ |
| 5 | Página del staff (PIN) y panel admin | ⬜ |
| 6 | Pruebas, seguridad y compatibilidad | ⬜ |
| 7 | Publicación, QR y lista de lanzamiento | ⬜ |

## Etapa 1 — Contexto y preguntas ✅
Hecho: revisión de las 19 referencias y el menú; 10 preguntas respondidas por el usuario; análisis de la Ley 1581; creación de `CLAUDE.md`, `PLAN.md`, `pendientes.md`; `referencias-diseno/` agregada a `.gitignore`.
Archivos tocados: `CLAUDE.md`, `PLAN.md`, `pendientes.md`, `.gitignore`.

## Etapa 2 — Estilo gráfico (SIN implementar el juego)
- [x] 2.0 Instalar Node.js LTS (v24.20.0) y política de scripts de PowerShell.
- [x] 2.1 Extraer paleta y tipografía de las referencias.
- [x] 2.2 Servidor local (`npm run dev`) + Three.js recortado dentro del repo (`npm run vendor`).
- [x] 2.3 Ronda 1: previews A, B, C en `web/previews/` (choladito y La India, obstáculo, fondo y HUD).
- [x] 2.4 Ficha por opción y prueba en iPhone XR: ~60 FPS en los tres (mínimo 57). A descartado, C favorito, B demasiado cartoon (ver `CLAUDE.md` 6b).
- [x] 2.5 Ronda 2: cholado fiel a las referencias + previews D, E, F (C con toques de B), probados por el usuario en el iPhone XR. Le gustaron D y F; E se descartó (luz mal calibrada: sin sombras, muy saturada).
- [x] 2.6 Decisión: **estilo G = mezcla de D y F** (sombritas suaves + brillo de gelatina + contorno fino de color un pelín más grueso), aplicado al choladito y a La India. Receta completa en `CLAUDE.md` sección 6b. Cambios gráficos futuros bienvenidos.

**Qué quedó:** `web/previews/` con las opciones A–G (G = referencia), Three.js recortado (`npm run vendor`), servidor local (`npm run dev`) y el código compartido de modelos por código (`shared/kit.js`, `matcap.js`, `paletas.js`) listo para moverse a `web/js/game/` en la Etapa 3.
**Archivos tocados en la etapa:** `package.json`, `package-lock.json`, `tools/`, `web/previews/`, `web/assets/` (fuentes y logo), `web/vendor/three/`, `.gitignore`, `CLAUDE.md`, `PLAN.md`, `pendientes.md`.
**Sigue sin decidir:** personaje (choladito o La India; ambos intercambiables) y nombre del juego. Se resuelven durante la Etapa 3.

## Etapa 3 — Prototipo sin backend
- [x] 3.0 Carpeta `historial/` con evidencias (hitos 01 y 02) + `npm run hito`.
- [x] 3.1 Bucle de juego, cámara y pista de 3 carriles.
- [x] 3.2 Controles táctiles (deslizar, tocar) y teclado para probar en PC.
- [x] 3.3 Obstáculos (4 tipos), frutas opcionales, colisión con tolerancia y vidas.
- [x] 3.4 Meta con el cholado de premio, cronómetro de 60 s y dificultad toda en `config.js`.
- [x] 3.5 Pantallas (inicio, ayuda, pausa, ganaste con formulario, código, perdiste, sin intentos, sin premios) con API falsa (`api-falsa.js`) fácil de reemplazar.
- [x] 3.6b Modo `?debug=1` (FPS, deslizadores en vivo, estadísticas, simulador con bot) y guía `documentos/calibrar-dificultad.md`.
- [ ] 3.6 Sonido y música (pistas libres de licencia). **Aplazado**: el Prompt 3 no lo incluía; decidir con el usuario.
- [ ] 3.7 Prueba en iPhone XR (por IP local, misma red wifi): FPS reales, controles táctiles, navegador de Instagram. **Pendiente del usuario.**
- [ ] 3.8 Con el visto bueno final del usuario: guardar hito 04 (prototipo v2 con capturas) y marcar la etapa ✅.

### Etapa 3 — ajustes antes de pasar a la Etapa 4 (Supabase / backend)
Lista del feedback del usuario tras probar el prototipo (2026-10-19). El usuario lo volverá a probar y dirá si hay más; **no se pasa a la Etapa 4 hasta que dé el visto bueno**. Lo estético (detalles del cholado, La India y el escenario) queda para después de que todas las etapas estén completas.
- [x] A1 Deslizar: **un gesto = un carril**, sin importar la fuerza (no saltarse el carril del medio).
- [x] A2 **Selector Choladito / La India permanente** (decisión del usuario y su mamá: el cliente elige personaje).
- [x] A3 **Mínimo de frutas para ganar** (hoy 25 de ~70; editable) además de llegar a la meta; HUD "x / 25"; pantalla "¡Te faltaron frutas!".
- [x] A4 **Dificultad un poco mayor y velocidad creciente** (9,5 → 14,5; antes 9 → 13,5). Todo sigue editable.
- [x] A5 **Celular limitado a 10 dígitos**, con formato "312 345 6789" y tolerante a pegar "+57".
- [x] A6 **Un cupón por número** (cooldown `diasEntreCodigosPorCelular`, hoy 7): nueva pantalla que dice cuándo podrá reclamar otro, sin revelar el código. *(El servidor real lo hará de verdad en la Etapa 4.)*
- [x] A7 **Historial protegido**: regla `!historial/**` en `.gitignore`, aviso en `npm run hito`, `web/previews/` borrado (vive en `historial/`).
- [ ] A8 Pendiente del usuario: probar de nuevo (PC + iPhone XR) y reportar más detalles.

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
