# CLAUDE.md — Cholado Runner (Cholados La India, Cali, Colombia)

Contexto y decisiones del proyecto. Léelo SIEMPRE antes de trabajar. El estado de las etapas está en `PLAN.md`; lo que falta por resolver está en `pendientes.md`.
Última actualización: 2026-10-19 (cierre de Etapa 1).

## 1. Qué es
Minijuego web (se abre desde el celular, sin instalar nada) tipo runner vertical (Subway Surfers / Minion Rush / Temple Run) con temática de frutas y cholado, para el negocio familiar Cholados La India (Cali). El jugador corre ~60 s esquivando obstáculos hasta una meta. Si llega, gana un código de descuento único que se canjea en el local. Objetivo: incentivar ventas.
Las capturas de Temple Run / Minion Rush / Subway Surfers son referencia de **mecánicas, animaciones e interacción**, NO de estilo visual.

## 2. Cómo trabajamos (reglas de colaboración)
- Preguntas antes que suposiciones. Cambios pequeños.
- El usuario es estudiante de ingeniería multimedia: conoce GitHub y Unity, NO conoce Supabase ni Node. Explicar cada paso como si no lo supiera. Tutear, español colombiano.
- **Solo se trabaja en la etapa que el usuario pida.** No adelantar etapas futuras, aunque parezca fácil.
- Al terminar cada etapa: resumir qué se hizo y qué archivos se tocaron, esperar el visto bueno del usuario y actualizar `PLAN.md` (y este archivo si algo cambió).
- Mostrar preview en localhost ANTES de cada commit. **Los commits los hace el usuario** con GitHub Desktop (Claude no hace commit ni push).
- El usuario entrega prompts por etapa (diseñados antes con otro chat). Cada uno empieza con: leer `CLAUDE.md` y `PLAN.md`, revisar el repo y decir en 3 líneas qué hay hecho. **Si un prompt contradice algo ya decidido en el chat, gana lo decidido en el chat.**
- Nunca pedir ni guardar PIN, claves o tokens en el chat ni en archivos del repo (el repo es público).
- Lo que quede sin resolver va a `pendientes.md` con placeholders visibles (ej. `[DIRECCIÓN DEL LOCAL]`), no se inventa.

## 3. Reglas del negocio (v1) — TODO configurable, nada quemado en el código
- **Campaña por temporada** con fecha de inicio y fin editables (fechas aún sin definir). Entre temporadas solo cambian las fechas; premio y tema visual iguales por ahora (sujeto a cambio).
- **Premio:** compra mínima de **$30.000 COP** en productos pagados (el regalo no cuenta; normalmente 2 productos). El cliente elige **al canjear en caja**: un **raspao personal** (en menú $8.000) o un **cholado de 10 oz** (el cholado normal es de 14 oz; el regalo es de 10 oz). Un regalo por código, no acumulable ($60.000 no da dos regalos).
- Una sola meta. Partida de ~60 s. Ni regalada ni imposible.
- **Banco:** 50 códigos por semana (editable). Reinicia los **lunes 00:00 hora de Bogotá**. Contador visible: "Quedan X premios esta semana". Si se agota: no se juega por premio y se muestra "vuelve el lunes". Los códigos vencidos NO se reciclan. Parámetro opcional de **cupo diario** (ej. 7/día) previsto en la configuración, apagado por defecto (tráfico esperado desconocido).
- **Intentos:** 3 por semana por usuario (editable, puede subir a 5).
- **Máximo 1 código por persona cada 7 días**, controlado por número de celular (editable).
- **Vigencia:** el código vale exactamente 7 días desde su hora de expedición (ej. martes 2:51 p. m. → hasta el martes siguiente 2:50 p. m.). Propuesta: `vence = expedición + 7 días − 1 minuto` (confirmar en Etapa 4).
- **Sin login para jugadores.** Al ganar se piden nombre y celular (sin verificar), con casilla de consentimiento de tratamiento de datos y texto breve (Ley 1581 de 2012; ver `pendientes.md`).
- **Canje en caja:** mini página para el staff protegida con PIN (PIN compartido, cambiable). En ~5 s verifica que el código exista, esté vigente y no canjeado, lo marca como canjeado y muestra el regalo; quien atiende elige el regalo y valida los $30.000 (el sistema no puede). Un solo local; no hay Rappi por ahora → solo canje en el local.
- **Panel de administrador (solo el dueño del proyecto):** ver códigos y estado, editar toda la configuración, ver conteos (partidas, ganadores, canjes), desactivar códigos a mano, exportar CSV.
- **Distribución:** QR en mostrador y vasos + publicidad en Instagram/Facebook. Esos links abren en el navegador interno de las apps: **debe funcionar ahí** (iOS y Android).

## 4. Seguridad: lo innegociable
1. Un mismo código **jamás** se asigna a dos personas (asignación atómica en el servidor).
2. Un código canjeado queda desactivado.
3. Todas las fechas usan el **reloj del servidor** (nunca el del cliente).
4. Ningún secreto (PIN, claves de admin, `service_role`) en el cliente ni en el repo. La clave pública `anon` de Supabase sí puede estar en el cliente (es pública por diseño) SI las reglas RLS están bien.
- Antifraude general: nivel bajo (lo peor que pasa es que alguien consiga otro cupón y haga otra compra). Aun así: la victoria se valida en el servidor (token de partida emitido por el servidor + tiempo mínimo jugado) para que nadie vacíe el banco con un script. Intentos: ID anónimo del navegador contado en servidor; se acepta que Instagram (almacenamiento aparte) y Safari/Chrome den intentos separados.

## 5. Decisiones técnicas
- Web estática con **Three.js** en **GitHub Pages** + **Supabase** (plan gratis) para códigos y configuración. No usar GitHub como base de datos. No se paga nada. (Verificar límites vigentes del plan gratis y la pausa por inactividad antes de crear la cuenta, Etapa 4.)
- JavaScript plano con módulos ES, **sin paso de build**. Three.js copiado dentro del repo (`web/vendor/three/`), sin CDN. Servidor local de preview con Node.js LTS (se instala en Etapa 2).
- Lógica crítica en funciones SQL de Supabase (asignación atómica con bloqueo de fila). PIN del staff guardado cifrado en la base y verificado en el servidor. Admin con Supabase Auth (login con correo).
- Fechas guardadas en UTC; semana y vencimientos calculados en `America/Bogota` (UTC−5, sin horario de verano).
- Ligero, mobile first, **vertical**, que corra bien en gama baja: pixel ratio máx. ~1.5, sin sombras reales (sombras falsas), objetos reutilizados (pooling), materiales planos, sin postprocesado, carga inicial objetivo ≈ 3 MB.
- Estilo: casi low poly con detalle decente, no pesado. **Personaje y objetos generados por código con formas básicas** (el usuario no tiene tiempo de modelar; a futuro puede haber modelos GLB). Fotos reales reducidas permitidas en pantallas de premio. Libertad creativa de Claude.
- Interfaz en **español colombiano caleño**.
- Sonido y música: sí; ambiente fresco/caleño (salsa), pero **solo pistas con licencia libre** (o generadas); investigar en la etapa de audio.
- URL final: `https://hachescc.github.io/cholado-runner/` (cuenta personal definitiva `hachescc`). **No renombrar usuario ni repo** una vez impresos los QR. Dominio propio: depende de cómo vaya, no se paga por ahora.

## 6. Controles y juego (decidido en Etapa 1)
- Runner vertical, cámara detrás del personaje, **3 carriles**, deslizar izquierda/derecha para cambiar de carril y arriba para saltar.
- Deslizar hacia abajo (agacharse): fuera por ahora; se puede probar después (puede chocar con gestos del navegador interno de Instagram).
- Dificultad inicial **provisional**: 3 vidas por partida y ~35 % de las partidas llegando a la meta; todo calibrable por configuración. Si resulta muy fácil: pasar a "un choque elimina" o subir velocidad/densidad. "Ganar" = llegar a la meta.
- Coleccionables posibles: frutas del menú (maracuyá, mango, guanábana, lulo, mora, fresa, piña).
- **Personaje sin decidir** (choladito vs. La India). En Etapa 2 se muestran ambos. Idea candidata: La India persigue a su cholado que se escapó corriendo ("Atrapa tu cholado").
- **Nombre sin decidir.** Candidatos que le gustan al usuario: *Atrapa tu cholado*, *Corre por tu cholado*, *Cholado Run*. Recomendación: "Corre por tu cholado" como nombre y "Atrapa tu cholado" como llamado a la acción.

## 7. Marca y referencias (`referencias-diseno/`, solo local, NO se sube a Git — 84 MB)
- Logo tipográfico "CHOLADOS LA INDIA": degradado amarillo→naranja con contorno y sombra negra. Eslogan: "¡Aquí Desafiamos La Sed y Castigamos El caLor!". Mascota: La India (perfil con penacho multicolor azul/rojo/amarillo/naranja, top verde). Los vectores originales existen, pero el usuario prefiere que Claude trabaje con lo que hay (vectorizar si hace falta).
- Pendón: degradado naranja→amarillo→verde. Menú: fondo magenta, arco verde lima, etiquetas celestes. Redes: Instagram @cholados.laindia, Facebook "Cholados La India".
- Paleta y tipografía: tomarlas de las referencias; no son rígidas, solo que se sientan **frutales**.
- Producto: cholado en vaso transparente con rayas horizontales, base de almíbar rojo/magenta, fruta, nieve, leche condensada, oblea cuadriculada, pitillo amarillo/verde. Raspao: torre de hielo rosado con leche condensada, base roja, limón.
- Menú (precios de referencia): Raspao $8.000/$11.000; Cholado $15.000/$20.000; especiales $18.000/$21.000.

## 8. Pruebas
- Dispositivo real: **iPhone XR** del usuario (iOS). No hay Android de gama baja a mano: simular con Chrome DevTools (límite de CPU) y pedir uno prestado si se puede. Probar en el navegador interno de Instagram/Facebook en iOS y Android (Etapa 6).

## 9. Estructura de carpetas (objetivo; se crea por etapas)
```
cholado-runner/
├─ CLAUDE.md · PLAN.md · pendientes.md · README.md · .gitignore
├─ referencias-diseno/     (solo local, ignorada por Git)
├─ web/                    ← lo único que se publica
│  ├─ index.html           juego
│  ├─ canje/               página del staff
│  ├─ admin/               panel admin
│  ├─ css/ · js/ (game/, ui/, api.js, config.js) · vendor/three/ · assets/
│  └─ previews/            solo Etapa 2 (se borra después)
├─ supabase/ (migrations/, seed/)
├─ documentos/             aviso de privacidad, TyC, lista de lanzamiento
└─ .github/workflows/      publicar web/ en GitHub Pages (Etapa 7)
```
