# supabase/ — El servidor de Cholado Runner

Todo el "cerebro" del juego (intentos, premios, códigos, vigencia, un código por celular, validar la victoria) vive en **Supabase**: una base de datos en internet, gratis, que se maneja con un panel web. El juego (que se publica en GitHub Pages) **solo llama a 6 funciones** con una clave pública; no puede leer ni escribir las tablas directamente.

> Resumen de seguridad: las tablas están en un esquema privado (`app`) que Supabase no expone, además tienen *Row Level Security* sin políticas (cerradas), y solo las 6 funciones `SECURITY DEFINER` del esquema `public` las tocan. Un mismo código jamás se asigna a dos personas porque todos los reclamos pasan, de uno en uno, por un candado del servidor (`pg_advisory_xact_lock`).

## Qué hay en esta carpeta

| Archivo | Para qué |
|---|---|
| `migrations/0001_tablas.sql` | Crea las tablas (`configuracion`, `partidas`, `codigos`), la vista `v_codigos` y los permisos |
| `migrations/0002_funciones.sql` | Crea la lógica: las 6 funciones del juego y las ayudas internas |
| `sql/consultas_utiles.sql` | Consultas para **mirar** y **cambiar** reglas desde el SQL Editor |
| `sql/limpiar_pruebas.sql` | Borra partidas y códigos (solo antes del lanzamiento) |

Las migraciones se pueden volver a correr sin riesgo (no borran datos). Para **actualizar** la lógica en el futuro, se cambia `0002_funciones.sql` y se vuelve a pegar.

## Paso a paso: dejar el servidor listo

1. **Crea la cuenta y el proyecto** (ver la guía en el chat o en `documentos/bitacora.md` §9): `supabase.com` → entrar con GitHub → organización "Cholados La India" → proyecto `cholado-runner`, región **South America (São Paulo)**, plan **Free**. Guarda la contraseña de la base de datos en un lugar seguro: **no hace falta compartirla con nadie**.
2. **Pega la estructura.** Panel de Supabase → menú izquierdo **SQL Editor** → **New query** → abre `migrations/0001_tablas.sql`, copia **todo** (Ctrl+A, Ctrl+C), pégalo y pulsa **Run**. Debe decir *Success. No rows returned*.
3. **Pega la lógica.** Otra **New query** con todo `migrations/0002_funciones.sql` → **Run** → *Success*.
4. **Comprueba.** Nueva query: `select public.estado(gen_random_uuid());` → **Run**. Debe devolver un texto largo con `"jugable": true`, `"premiosRestantes": 50`...
5. **Conecta el juego.** Copia la *Project URL* y la *Publishable key* (Project Settings → API Keys) en `web/js/supabase-config.js`. Son públicas (van dentro del juego). **Nunca** pegues la *secret key* ni la `service_role`.
6. **Prueba.** En la terminal, `npm run probar-supabase` (dura ~1 min, ver abajo). Luego `npm run dev` y juega.
7. **Antes del lanzamiento:** corre `sql/limpiar_pruebas.sql` para borrar los datos de prueba.

## Cómo se cambian las reglas (sin tocar el juego)

Desde el **SQL Editor**, con `sql/consultas_utiles.sql` como guía. Los cambios se aplican de inmediato a todos los jugadores:

- **Reglas del negocio** (`update app.configuracion set ...`): `premios_por_semana` (50), `intentos_por_semana` (3), `cupo_diario` (0 = apagado), `vigencia_dias` (7), `dias_entre_codigos_por_celular` (7), `compra_minima` (30000), `ventana_reclamo_min` (15), `campana_inicio`/`campana_fin`, `prefijo_codigo` (LAINDIA), `frutas_minimas` (25), `duracion_partida_s` (60), `minimo_jugado_s` (45).
- **Dificultad** (`select app.ajustar_juego('{"velocidad": {"final": 15}}');`): los mismos nombres de `web/js/config.js`. Lo que **no** cambies sigue valiendo lo de `config.js` (que son los "valores de fábrica"). Volver a fábrica: `update app.configuracion set juego = '{}' where id = 1;`.
- En `?debug=1` el botón **Copiar config** ya te arma esa línea de SQL con lo que cambiaste con los deslizadores.
- El panel admin de la Etapa 5 hará esto con botones.

## Las 6 funciones (el contrato con el juego)

| Función | Qué hace |
|---|---|
| `ping()` | Devuelve la hora del servidor. Sirve para que el proyecto gratis no se "duerma" (ver abajo). |
| `estado(p_device)` | Premios e intentos restantes, reglas, dificultad, hora del servidor. |
| `iniciar_partida(p_device)` | Gasta un intento y entrega el **token** de la partida. |
| `terminar_partida(p_token, p_gano, p_progreso, p_frutas)` | Valida la victoria (token, tiempo mínimo, frutas mínimas) y **aparta el premio** 15 min. |
| `reclamar_codigo(p_token, p_nombre, p_celular, p_consentimiento)` | Crea el código `LAINDIA-XXXX` (atómico). |
| `mi_codigo(p_device)` | El último código de ese dispositivo con su estado y cuenta regresiva. |

Detalle de cada respuesta: comentarios de `web/js/api.js` y `0002_funciones.sql`.

## Reglas importantes (por qué funciona así)

- **Semana**: de lunes 00:00 a domingo 23:59:59, hora de **Bogotá** (UTC−5, sin cambio de hora). Intentos y premios se reinician el lunes.
- **Códigos al reclamar**: no hay una lista pre-hecha de 50; al reclamar el servidor inventa un código único. El "banco de 50" es un tope que cuenta los códigos expedidos y los **premios apartados**.
- **Premio apartado**: al ganar (y ser validado) se aparta un premio 15 minutos para esa persona. Si no reclama, se libera.
- **Vigencia**: la hora de expedición se corta al minuto y se suman **7 días exactos**. Un código expedido el martes 2:51 p. m. sirve hasta antes de las 2:51 p. m. del martes siguiente; el juego muestra «vale hasta las 2:50 p. m.».
- **Vencido**: no se guarda, se calcula (`activo` y ya pasó la hora). Los vencidos no se reciclan: quedan en la tabla.
- **Un código por celular** cada 7 días. Si el número ya reclamó, el servidor solo dice cuándo podrá volver (**no** revela el código de ese número).
- **Regalo**: se elige **al canjear en caja** (Etapa 5); la columna `regalo_elegido` queda vacía hasta entonces.
- **Intentos** ligados al **id anónimo del dispositivo** (lo inventa el navegador). Quien borre los datos del navegador o juegue desde otro navegador tendrá otros intentos: nivel de antifraude bajo, aceptado.

## Pruebas

- `npm run probar-sql` — prueba **todo el SQL en tu computador** (con PGlite, un Postgres dentro de Node), sin Supabase: reglas, fechas, cupos, reservas, cooldown por celular y permisos. Debe terminar en `✅ TODO BIEN`.
- `npm run probar-supabase` — prueba el servidor **real** como un celular y lo somete a concurrencia (100 ganadores a la vez, 5 reclamos con el mismo celular, 8 inicios simultáneos del mismo dispositivo). Deja datos de prueba: corre después `sql/limpiar_pruebas.sql`.

## Plan gratis de Supabase: lo que hay que saber

(Verificado el 2026-10-19 en la [página de precios](https://supabase.com/pricing) y la [guía de pausa](https://supabase.com/docs/guides/platform/free-project-pausing).)

- **2 proyectos activos, 500 MB de base de datos, 5 GB de egress**: para este juego sobra por mucho (miles de códigos pesan KB).
- **Se pausa si pasa ~1 semana sin actividad** (Supabase avisa por correo ~1 semana antes). Se reactiva a mano en el panel (*Resume project*). **Solución prevista:** una tarea gratis de GitHub Actions que llame a `ping()` cada día (se deja lista en la Etapa 7).
- **Sin backups automáticos**: exportar los códigos a CSV de vez en cuando (el panel admin de la Etapa 5 traerá el botón; mientras tanto, *Table Editor → app → codigos → Export*).
- Las claves nuevas (`sb_publishable_…` / `sb_secret_…`) reemplazan a `anon` / `service_role` (las viejas dejan de existir a fines de 2026). El juego acepta ambas.
