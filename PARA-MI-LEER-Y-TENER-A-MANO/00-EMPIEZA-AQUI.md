# Empieza aquí 👋

**Esta carpeta es tuya.** Todo lo que hay aquí está escrito para ti (no para programadores): qué hacer, en qué orden y qué hacer si algo sale mal. Lo demás del proyecto (código, SQL, pruebas) lo maneja Claude; **tú no tienes que entenderlo**.

Última actualización: 2026-10-20, noche.

## Dónde estás ahora

✅ **El juego ya está publicado** y responde: <https://cholados-la-india.github.io/> (también el panel `/admin/`, la caja `/canje/` y la página de «no existe»; lo comprobé desde aquí).
⏳ **Pero todavía NO está abierto al público.** Falta probarlo bien, borrar los datos de prueba, imprimir los QR y avisar en Instagram/Facebook. **No imprimas ni anuncies nada hasta terminar los pasos de abajo.**

## Qué hacer ahora (en este orden)

Cada paso dice dónde está el detalle. Si algo no sale como aquí, **para y pregúntale a Claude** (con lo que viste en pantalla).

1. **Mira si ya pegaste el SQL nuevo** (2 minutos). Entra al panel: <https://cholados-la-india.github.io/admin/> → **Resumen** y baja hasta la tarjeta «¿De dónde vienen los jugadores?».
   - Si ves una tabla (aunque esté vacía): ya está pegado ✅.
   - Si dice **«Falta actualizar el servidor»**: en la terminal escribe `npm run sql`, abre `supabase/todo-junto.sql`, copia todo, Supabase → SQL Editor → «+» → pega → **Run**. Abajo debe decir **«✅ Todo en orden»**. Detalle: `04-guia-rapida.md` sección 5.9.
   - Después corre `npm run probar-seguridad`: debe terminar bien.
2. **Prueba el aviso diario** (1 minuto): <https://github.com/cholados-la-india/cholados-la-india.github.io/actions> → a la izquierda **«Mantener Supabase despierto»** → botón **Run workflow** → espera el ✓ verde. (Es lo que evita que Supabase se «duerma». Detalle: `05-publicacion.md` sección B.)
3. **Pon el PIN definitivo de la caja** si todavía tienes uno de prueba: panel → **Cuenta**. 6 números, que no sea `1234`. Se lo das **solo** a quien atiende. **Nunca** lo escribas en el chat ni en un archivo.
4. **Pruébalo como si fueras un cliente** (20 minutos), con **datos del celular** (no con el wifi de la casa), en tu iPhone **y** en un Android: jugar → ganar → llenar nombre y celular → sacar el código → ir a `/canje/` y canjearlo con el PIN → ver el canje en el panel. Prueba también escribir tu nombre con el teclado abierto (que no salga «Gira tu celular»). Paso a paso: `01-lista-de-lanzamiento.md`, pasos 14 a 14d.
   - **Instagram y Facebook:** mándate por mensaje directo los enlaces de `QR-para-imprimir/LEEME.md` (el de instagram y el de facebook), tócalos **desde la app** y juega una partida con cada uno. Luego mira el panel → Resumen → «¿De dónde vienen los jugadores?»: debe contar una partida en cada canal.
5. **Que tu mamá lea `06-textos-legales.md`** (las condiciones y la política de datos, tal como las ve la gente) y **decidan el cupo diario** (0 = apagado; con 50 premios por semana, 8 por día es un buen comienzo). Si cambian algo de los textos, díselo a Claude.
6. **Borra TODOS los datos de prueba** — solo cuando ya terminaste TODAS las pruebas, porque cada prueba deja datos. Está en `04-guia-rapida.md`, sección **5.1** (es una sola línea que se pega en Supabase). Después el panel debe decir 0 partidas y 0 códigos.
7. **Prueba los QR antes de imprimir:** haz doble clic en `QR-para-imprimir/imprimir.html`, imprímela al 100 % y escanéala con 2 celulares distintos (uno viejo). Si abre el juego, mándale a la imprenta los archivos `.svg` de esa carpeta (mostrador y vasos). En los vasos, mínimo 3 cm y con borde blanco.
8. **Abre al público:** pon el enlace de instagram en la biografía de @cholados.laindia, el de facebook en la página, y pega los QR en el mostrador y los vasos. Explícale a quien atiende cómo usar la caja (`04-guia-rapida.md` sección 7).

## Los primeros días

- **Cada día los primeros días:** panel → **Resumen** (partidas, códigos, canjes y de dónde vienen).
- **El primer lunes:** a las 00:00 se renuevan los premios y los intentos. Mira el Resumen esa mañana: debe decir «Quedan 50 premios esta semana» (o los que hayas puesto).
- **Cada semana:** panel → Cuenta → **Descargar todos los códigos** (tu respaldo; Supabase gratis no hace copias).
- **Cada tanto:** en la pestaña Actions de GitHub, que «Mantener Supabase despierto» tenga una fila verde por día.
- **Alarma en el calendario:** 6 meses después de que termine la campaña hay que **borrar los datos personales** (`02-operacion-corta.md`, sección 5).

## Qué leer y cuándo

| Archivo | Qué es | Léelo cuando… |
|---|---|---|
| `00-EMPIEZA-AQUI.md` | Este | Ahora |
| `01-lista-de-lanzamiento.md` | La lista completa y ordenada para abrir (29 pasos) | Vayas a abrir al público (es la versión larga de lo de arriba) |
| `02-operacion-corta.md` | **Una hoja:** cambiar reglas, cambiar el PIN, ver canjes, cerrar la temporada, borrar datos personales | Lo del día a día. **La más útil.** |
| `03-guia-del-administrador.md` | **«¿Qué hago si pasa esto?»**: código de prueba, perder un código, pausar el juego, caja bloqueada, trampa, privacidad… | Te pase algo raro o un cliente te pregunte algo |
| `04-guia-rapida.md` | Todos los comandos, todo el SQL listo para pegar, el panel, la caja, las reglas | Necesites un comando o un SQL concreto |
| `05-publicacion.md` | Cómo funciona GitHub Pages y el aviso diario; los enlaces con etiquetas y los QR | Publicar algo nuevo o si falla la publicación (es larga: léela solo cuando la necesites) |
| `06-textos-legales.md` | Todo lo que el juego dice sobre premio, datos y local | Quieras revisar o cambiar un texto |
| `QR-para-imprimir/` | Los QR (mostrador y vasos), la hoja para probarlos y los 4 enlaces | Imprimas, o quieras el enlace de Instagram/Facebook |

## Las reglas de oro

1. **Nunca** pegues el PIN, tu contraseña del panel, ni las claves de Supabase en el chat con Claude ni en ningún archivo (el repositorio es público).
2. **No imprimas ni anuncies** hasta que el paso 4 (prueba completa) y el 7 (prueba del QR) estén bien.
3. **No renombres** la organización de GitHub `cholados-la-india` ni el repositorio después de imprimir los QR: dejarían de funcionar.
4. **No borres los datos de prueba (paso 6) con clientes reales ya jugando**: borrarías sus códigos. Si ya hay clientes y quieres quitar un código de prueba, mira `03-guia-del-administrador.md` sección 2.1.
5. **Si dudas, pregunta antes de pegar un SQL.** Los que empiezan con `select` solo miran; los que dicen `delete`, `truncate` o `update` cambian o borran.

## Si algo falla (lo más común)

| Pasa esto | Haz esto |
|---|---|
| El juego dice «No pudimos conectarnos» a todo el mundo | Probablemente Supabase se pausó: supabase.com → tu proyecto → **Resume project**. (`03-guia-del-administrador.md` sección 5) |
| La caja dice «DEMASIADOS INTENTOS» | Panel → Cuenta → **Desbloquear ahora** (mientras tanto, canjea tú desde el panel → pestaña Canjear) |
| Un cliente perdió su código | Panel → Códigos → búscalo por su celular (`03-guia-del-administrador.md` sección 2.2) |
| Se acabaron los premios y quieres más | Panel → Configuración → «Premios por semana» |
| Quieres pausar el juego | `03-guia-del-administrador.md` sección 3.4 |
| Cambió la dirección o el horario | Díselo a Claude: es una frase del juego y hay que publicarla (`03-guia-del-administrador.md` sección 6) |

## Cómo pedirme ayuda

Cuéntame **qué pasó, dónde (juego, caja, panel, Supabase o GitHub), qué mensaje salió** (copia el texto o manda captura sin claves) **y cuándo**. Hay una plantilla al final de `03-guia-del-administrador.md`.
