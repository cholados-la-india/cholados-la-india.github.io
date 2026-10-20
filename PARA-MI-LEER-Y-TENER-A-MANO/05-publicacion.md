# Publicación — paso a paso en GitHub (Etapa 7)

Para publicar el juego en internet **no hay que programar nada**: ya está todo preparado en el repositorio (carpeta `.github/workflows/`). Lo que falta lo haces tú, **una sola vez**, en la página de GitHub. Esta guía te dice **dónde hacer clic**.

Última actualización: 2026-10-20, noche (Etapa 7).

**Resumen de lo que hay:**

| Qué | Dónde | Para qué |
|---|---|---|
| Publicar el juego | `.github/workflows/publicar.yml` | Cada vez que subes un cambio dentro de `web/`, GitHub lo publica en `https://cholados-la-india.github.io/` |
| Mantener Supabase despierto | `.github/workflows/mantener-supabase-despierto.yml` | Una vez al día llama al servidor para que el plan gratis no se pause |
| Seguimiento por canal | `web/js/canal.js` + `supabase/migrations/0004_canales.sql` | Cuenta de dónde vienen los jugadores (mostrador, vasos, instagram, facebook) |
| QR y enlaces | `npm run qr` → carpeta `QR-para-imprimir/` | Los QR para imprimir y los 4 enlaces con etiquetas |

---

## A. Poner GitHub Pages en marcha (una sola vez)

**Antes de empezar, comprueba:** (1) el repositorio se llama `cholados-la-india.github.io` y está dentro de la organización `cholados-la-india` (ya lo hiciste: mira la dirección `github.com/cholados-la-india/cholados-la-india.github.io`); (2) ya hiciste commit y push de todo lo que Claude dejó en esta etapa (si no, GitHub Desktop → «Commit to main» → «Push origin»).

1. Entra a `https://github.com/cholados-la-india/cholados-la-india.github.io`.
2. Pestaña **Settings** **del repositorio** (la que está en la fila de pestañas del repo: Code · Issues · Pull requests · Actions · … · Settings). **Ojo: no es la «Settings» de la organización** (la que sale al entrar a `github.com/cholados-la-india`, con «Verified domains», «Billing», «Member privileges»…): esa no sirve para esto. Si no ves la pestaña Settings del repo, no estás con una cuenta que sea dueña/administradora.
3. En el menú de la izquierda, sección «Code and automation» → **Pages**. (Atajo directo: `https://github.com/cholados-la-india/cholados-la-india.github.io/settings/pages`.) Ahí debe aparecer «Build and deployment» con «Source»; si en cambio ves «Verified domains» o «There are no verified domains…», estás en la Settings de la organización: vuelve al repositorio.
4. En **«Build and deployment» → «Source»** elige **GitHub Actions** (no «Deploy from a branch»). No hay botón de guardar: se guarda al elegir.
5. Menú izquierdo → **Actions → General** (también dentro de Settings). Revisa dos cosas:
   - «Actions permissions»: que diga **Allow all actions and reusable workflows** (o, si prefieres lo más estricto, «Allow actions created by GitHub»; el proyecto solo usa acciones oficiales de GitHub).
   - «Workflow permissions»: lo normal está bien (el proyecto pide por su cuenta los permisos que necesita).
6. Ve a la pestaña **Actions** (arriba, al lado de «Pull requests»). Si GitHub pregunta algo como «I understand my workflows, go ahead and enable them», acéptalo.
7. A la izquierda verás **«Publicar el juego»**. Púlsalo → botón **«Run workflow»** (a la derecha) → rama `main` → **«Run workflow»** verde.
8. Espera 1 o 2 minutos. La fila pasa de amarillo (en curso) a **verde ✓**. Si sale **rojo ✗**: abre la fila y mira qué paso falló (la sección «Si algo sale mal» de abajo lo explica).
9. Abre **`https://cholados-la-india.github.io/`**: debe cargar el juego. (Si dice 404 el primer minuto, espera y recarga.)
10. De ahora en adelante **no hay que hacer nada más**: cada push con cambios dentro de `web/` vuelve a publicar solo (aparece una fila nueva en Actions).

**Comprueba de verdad que quedó bien** (antes de imprimir nada): con tu celular, **sin wifi de la casa si puedes (con datos móviles)**:
- abre `https://cholados-la-india.github.io/` y juega una partida completa hasta ganar y sacar un código de prueba;
- abre `https://cholados-la-india.github.io/canje/` y canjea ese código con el PIN;
- entra a `https://cholados-la-india.github.io/admin/` con tu correo y contraseña;
- escribe una dirección que no existe (`.../hola`): debe salir la página «Esa página no existe»;
- pega el enlace en una conversación de WhatsApp/Instagram: debe mostrar la imagen y el título bonitos (vista previa).
Luego **borra los datos de prueba** (`03-guia-del-administrador.md` §1.1 o `04-guia-rapida.md` 5.1).

> **No renombres la organización ni el repositorio después de imprimir los QR:** GitHub no redirige esas direcciones y los QR dejarían de funcionar. (Un dominio propio, por ejemplo `cholados.co`, se puede agregar más adelante en Settings → Pages → Custom domain; hazlo y pruébalo antes de imprimir si lo quieres.)

### Si algo sale mal al publicar

| Qué ves | Qué significa | Qué hacer |
|---|---|---|
| En Actions, **«Revisar que no se haya colado ningún secreto»** en rojo | El comprobador encontró algo parecido a una clave, un PIN o un correo personal en el repositorio | Abre el paso y lee qué archivo y qué línea. **No publica nada** hasta que se arregle. Quita ese dato, haz commit y push. Si era una clave real (secret key, contraseña), cámbiala en Supabase (`04-guia-rapida.md` §2) |
| **«Comprobar que lo mínimo está en web/»** en rojo | Falta un archivo importante dentro de `web/` | Dile a Claude qué archivo dice |
| **«Preparar GitHub Pages»** o **«Publicar»** en rojo, con un mensaje como «Get Pages site failed», «Pages is not enabled» o «environment» | Falta el paso 4 (Source = **GitHub Actions**) o el entorno `github-pages` tiene una regla de ramas | Repite el paso 4 y vuelve a correr el workflow (Re-run all jobs). Si sigue: Settings → Environments → `github-pages` → «Deployment branches» = `main` |
| La página sale 404 en `https://cholados-la-india.github.io/` | Aún no termina de publicarse, o el repo no se llama exactamente `cholados-la-india.github.io` | Espera 2 min; revisa el nombre del repo (Settings → General → Repository name) |
| Publicó, pero ves la versión vieja | Caché del navegador | Recarga con `Ctrl + F5` (PC) o ábrelo en una ventana privada. En celular: cierra y vuelve a abrir. En Instagram/WhatsApp la vista previa vieja puede quedar guardada un tiempo |

---

## B. Mantener Supabase despierto (el aviso diario)

**Por qué:** el plan gratis de Supabase **pausa el proyecto** si pasa más o menos 1 semana sin actividad. Si eso pasa, el juego dice «No pudimos conectarnos» hasta que entres a Supabase y pulses **Resume project**. La tarea `mantener-supabase-despierto.yml` llama al servidor **todos los días a las 5:23 a. m. (hora de Colombia)** a las funciones `ping()` y `estado()` (las mismas que usa el juego: no gastan intentos ni premios y no guardan nada).

**Cómo comprobar que corre:**
1. GitHub → pestaña **Actions** → a la izquierda **«Mantener Supabase despierto»**.
2. **Probarla ya mismo:** botón **Run workflow** → `main` → Run workflow. En ~20 segundos debe quedar con ✓ verde. Ábrela: en «Resumen» (Summary) dice «Supabase respondió bien» con la hora de Colombia.
3. **Para confirmar que de verdad llegó a Supabase:** supabase.com → tu proyecto → **Logs** (menú izquierdo) → **API Edge Network** (o «API Gateway») → busca llamadas `POST /rest/v1/rpc/ping` de ese momento.
4. **Normalmente** verás **una fila verde por día**. Si un día la ves **roja**, GitHub te manda un correo (a quien hizo el último cambio al horario en ese archivo, o sea, a ti, **siempre que tengas activadas las notificaciones de Actions**: github.com → tu foto → Settings → Notifications → «Actions»): significa que Supabase no respondió bien. Lo más probable es que esté **pausado**: entra a Supabase y pulsa **Resume project**.

**Dos límites que debes conocer (honestos):**
- **GitHub apaga las tareas programadas de un repositorio público si pasan 60 días sin ninguna actividad** (ni un commit). Mientras sigas haciendo cambios, no pasa. Si un día ves el aviso «scheduled workflows have been disabled…», entra a Actions → «Mantener Supabase despierto» → **Enable workflow**.
- GitHub **no garantiza la hora exacta** de las tareas programadas (a veces se retrasan unos minutos u horas en horas de mucho tráfico). Con una vez al día y un margen de 7 días sobra.
- Supabase **no promete oficialmente** qué cuenta como «actividad». Una llamada diaria a la API es lo que se usa normalmente; si algún día se pausara de todas formas, la solución es **Resume project** y avisarle a Claude.

---

## C. Qué hacer cuando cambies algo después de publicar

| Cambié… | Hay que… |
|---|---|
| Un texto o el juego (todo lo que está en `web/`) | Commit + push desde GitHub Desktop. Se publica solo en 1-2 minutos (mira Actions) |
| Reglas del juego (premios, intentos, vigencia, dificultad, fechas…) | Nada de GitHub: panel de administrador → Configuración. Es inmediato |
| Algo del servidor (SQL en `supabase/migrations/`) | `npm run sql` y pegar `supabase/todo-junto.sql` en el SQL Editor (`04-guia-rapida.md` 5.9). Después, commit + push |
| Un documento (`.md`) o `QR-para-imprimir/` | Commit + push; **no** republica el juego (solo se republica con cambios dentro de `web/`) |

---

## D. Seguimiento por canal (UTM) y los QR

**Cómo funciona:** cada enlace trae tres etiquetas: `utm_source` (el canal: `mostrador`, `vasos`, `instagram`, `facebook`), `utm_medium` (`qr` o `social`) y `utm_campaign` (la campaña, hoy `lanzamiento`). El juego las lee al abrirse, las recuerda 30 días en ese celular y se las manda al servidor cuando alguien **empieza una partida**. No identifican a nadie y no hay que instalar nada.

**Los QR y enlaces:** `npm run qr` los (re)genera en la carpeta `QR-para-imprimir/`. Ahí está también `QR-para-imprimir/LEEME.md` con los 4 enlaces y consejos de impresión.

| Canal | Enlace |
|---|---|
| mostrador | `https://cholados-la-india.github.io/?utm_source=mostrador&utm_medium=qr&utm_campaign=lanzamiento` |
| vasos | `https://cholados-la-india.github.io/?utm_source=vasos&utm_medium=qr&utm_campaign=lanzamiento` |
| instagram | `https://cholados-la-india.github.io/?utm_source=instagram&utm_medium=social&utm_campaign=lanzamiento` |
| facebook | `https://cholados-la-india.github.io/?utm_source=facebook&utm_medium=social&utm_campaign=lanzamiento` |

**Dónde se ve:** panel de administrador → **Resumen** → tarjeta **«¿De dónde vienen los jugadores?»** (esta semana, últimos 30 días o todo): por canal, cuántos jugadores, partidas, llegaron a la meta, códigos y canjes. «Entró directo» = abrió el juego sin etiqueta (por ejemplo, escribiendo la dirección). **Antes de que se vea hay que pegar el SQL nuevo** (`todo-junto.sql`, ver la lista de lanzamiento); si no, la tarjeta lo avisa.

**Para una campaña nueva** (otra temporada): `npm run qr -- --campana=temporada-2`, y se vuelve a imprimir solo lo que cambie (los QR cambian porque el enlace cambia). Si solo quieres seguir con el mismo QR, no hace falta.

**Si quieres un canal nuevo** (un volante, un influencer…): agrégalo a la lista `CANALES` de `tools/generar-qr.mjs` y corre `npm run qr`. El panel lo cuenta solo.

**Pruebas (sin tocar nada real):** `npm run probar-canal` (cómo el juego lee los enlaces) y, dentro de `npm run probar-sql`, la sección 25 (el servidor).

---

## E. Probar el seguimiento de canales en tu computador

1. `npm run dev` y abre `http://localhost:5173/?api=falsa&utm_source=mostrador&utm_medium=qr&utm_campaign=lanzamiento` (la barra queda limpia en segundos: las etiquetas se guardan y se quitan de la dirección).
2. En la consola del navegador (F12): `localStorage.getItem('cholado-canal')` debe mostrar `mostrador`.
3. Con el servidor real: abre el enlace de `mostrador` (sin `?api=falsa`), empieza una partida, y en el panel → Resumen → «¿De dónde vienen los jugadores?» debe aparecer una partida más en **mostrador** (si estás en `?debug=1` los intentos son ilimitados; sin debug gastas uno real).
