# supabase/ — El servidor de Cholado Runner

Todo el "cerebro" del juego (intentos, premios, códigos, vigencia, un código por celular, validar la victoria) vive en **Supabase**: una base de datos en internet, gratis, que se maneja con un panel web. El juego (que se publica en GitHub Pages) **solo llama a 6 funciones** con una clave pública; no puede leer ni escribir las tablas directamente.

> Resumen de seguridad: las tablas están en un esquema privado (`app`) que Supabase no expone, además tienen *Row Level Security* sin políticas (cerradas), y solo las 6 funciones `SECURITY DEFINER` del esquema `public` las tocan. Un mismo código jamás se asigna a dos personas porque todos los reclamos pasan, de uno en uno, por un candado del servidor (`pg_advisory_xact_lock`).

## Qué hay en esta carpeta

| Archivo | Para qué |
|---|---|
| `migrations/0001_tablas.sql` | Crea las tablas (`configuracion`, `partidas`, `codigos`), la vista `v_codigos` y los permisos |
| `migrations/0002_funciones.sql` | Crea la lógica: las 6 funciones del juego y las ayudas internas |
| `migrations/0003_staff_admin.sql` | **Etapa 5:** el PIN de la caja, el canje, la lista de administradores y las 13 funciones de la caja y del panel |
| `sql/consultas_utiles.sql` | Consultas para **mirar** y **cambiar** reglas desde el SQL Editor |
| `sql/limpiar_pruebas.sql` | Borra partidas y códigos (solo antes del lanzamiento) |

Las migraciones se pueden volver a correr sin riesgo (no borran datos). Para **actualizar** la lógica en el futuro, se cambia `0002_funciones.sql` y se vuelve a pegar.

## Paso a paso: dejar el servidor listo

1. **Crea la cuenta y el proyecto** (ver la guía en el chat o en `documentos/bitacora.md` §9): `supabase.com` → entrar con GitHub → organización "Cholados La India" → proyecto `cholado-runner`, región **East US (North Virginia)**, plan **Free**. Guarda la contraseña de la base de datos en un lugar seguro: **no hace falta compartirla con nadie**.
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
- Desde la Etapa 5 esto también se hace con botones: panel de administrador → pestaña **Configuración** (ver la sección «Etapa 5» más abajo).

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
- **Regalo**: se elige **al canjear en caja** (Etapa 5, hecho): la caja pide elegirlo y lo guarda en `regalo_elegido`.
- **Intentos** ligados al **id anónimo del dispositivo** (lo inventa el navegador). Quien borre los datos del navegador o juegue desde otro navegador tendrá otros intentos: nivel de antifraude bajo, aceptado.

## Pruebas

- `npm run probar-sql` — prueba **todo el SQL en tu computador** (con PGlite, un Postgres dentro de Node), sin Supabase: reglas, fechas, cupos, reservas, cooldown por celular y permisos. Debe terminar en `✅ TODO BIEN` (181 comprobaciones desde la Etapa 5: incluyen PIN, bloqueo, canje, permisos de administrador y el editor de configuración).
- `npm run probar-seguridad` — **3 segundos, no deja datos**: comprueba contra el servidor real que las funciones del administrador no responden a la clave pública ni a un token inventado, y que `app.admins`/`app.staff` no se leen. Si dice que falta la migración 0003, pégala (ver «Etapa 5»).
- `npm run probar-supabase` — prueba el servidor **real** como un celular y lo somete a concurrencia (100 ganadores a la vez, 5 reclamos con el mismo celular, 8 inicios simultáneos del mismo dispositivo). Deja datos de prueba: corre después `sql/limpiar_pruebas.sql`.

## Plan gratis de Supabase: lo que hay que saber

(Verificado el 2026-10-19 en la [página de precios](https://supabase.com/pricing) y la [guía de pausa](https://supabase.com/docs/guides/platform/free-project-pausing).)

- **2 proyectos activos, 500 MB de base de datos, 5 GB de egress**: para este juego sobra por mucho (miles de códigos pesan KB).
- **Se pausa si pasa ~1 semana sin actividad** (Supabase avisa por correo ~1 semana antes). Se reactiva a mano en el panel (*Resume project*). **Solución prevista:** una tarea gratis de GitHub Actions que llame a `ping()` cada día (se deja lista en la Etapa 7).
- **Sin backups automáticos**: exportar los códigos a CSV de vez en cuando (el panel de administrador trae el botón: pestaña **Códigos** → Exportar CSV).
- Las claves nuevas (`sb_publishable_…` / `sb_secret_…`) reemplazan a `anon` / `service_role` (las viejas dejan de existir a fines de 2026). El juego acepta ambas.


---

## Etapa 5 — La caja (con PIN) y el panel de administrador

### Qué es cada cosa
| Página | Quién la usa | Dirección en tu computador (con `npm run dev` corriendo) |
|---|---|---|
| **Caja** (`web/canje/`) | quien atiende en el local | <http://localhost:5173/canje/> |
| **Panel** (`web/admin/`) | tú, el dueño | <http://localhost:5173/admin/> |

Cuando el juego se publique serán `…/canje/` y `…/admin/` al lado del juego (la dirección exacta depende de cómo se publique; ver `pendientes.md` #14). Ninguna de las dos está enlazada desde el juego.

**Para verlas sin tocar nada real** agrega `?api=falsa` a la dirección (por ejemplo <http://localhost:5173/canje/?api=falsa>): usa datos de mentira en la memoria de la pestaña. En la caja de mentira el PIN es `1234` y hay códigos `K7M2` (válido), `R8T3` (ya canjeado), `V3N5` (vencido) y `D6F2` (desactivado); en el panel de mentira entras con cualquier correo y la clave `demo`.

### Paso a paso para dejarlas funcionando DE VERDAD (una sola vez)
1. **Pega la parte nueva del servidor.** Supabase → **SQL Editor** → **«+»** → **Create a new snippet** → abre `supabase/migrations/0003_staff_admin.sql`, copia **todo**, pégalo y pulsa **Run**. Debe decir *Success. No rows returned*. (Se puede volver a correr sin riesgo.)
2. **Crea tu usuario.** Supabase → **Authentication** → **Users** → **Add user** → **Create new user**: tu correo, una contraseña larga que solo tú sepas (mejor en un gestor de contraseñas) y marca **Auto Confirm User**. Pulsa **Create user**.
3. **Apaga el registro público.** Authentication → **Sign In / Providers** (en algunas versiones, *Settings*) → apaga **Allow new users to sign up**. Así nadie más puede crearse una cuenta. (Aunque lo lograra, el servidor solo deja actuar a quien esté en la lista de administradores del paso 4.)
4. **Anótate como administrador.** SQL Editor → nuevo snippet → pega esto **cambiando `TU-CORREO` por el correo del paso 2** → Run:
   ```sql
   insert into app.admins (user_id)
   select id from auth.users where email = 'TU-CORREO'
   on conflict do nothing;

   select count(*) as administradores from app.admins;   -- debe decir 1
   ```
5. **Entra al panel y pon el PIN.** Abre `/admin/` → correo y contraseña → pestaña **Cuenta** → «PIN de la caja»: elige 6 números (no `1234` ni repetidos) y **Guardar PIN**. **No existe un PIN por defecto**: hasta que lo pongas, la caja responde «FALTA EL PIN».
6. **Prueba la caja.** Abre `/canje/` → PIN → un código real (sirve uno de prueba, como `LAINDIA-QB9A`) → **Verificar** → elige el regalo → **Marcar como canjeado**. Intenta canjearlo otra vez: debe decir «YA FUE CANJEADO».
7. **Comprueba la seguridad.** En la terminal: `npm run probar-seguridad` (≈ 3 s, no deja datos). Debe terminar en `✅ TODO BIEN`.

### Cómo se usa cada día
- **La caja:** PIN + código → «Verificar». El código sirve completo (`LAINDIA-K7M2`), en minúsculas, sin guion o solo con las 4 letras finales. Resultados: **válido** (se elige el regalo y se marca canjeado), **ya canjeado** (con fecha y hora), **vencido** (con la fecha hasta la que valía), **desactivado** o **no existe**. La caja **no ve el nombre ni el celular** del cliente. Quien atiende valida que la compra sea de $30.000 o más: el sistema no lo puede saber.
- **Cambiar el PIN:** panel → **Cuenta** → «PIN de la caja». El anterior deja de servir al instante. Dáselo al personal en persona, no por chat.
- **Si la caja se bloquea** (5 PIN malos seguidos → 5 min; cada bloqueo seguido dura el doble, hasta 60 min): panel → **Cuenta** → **Desbloquear ahora**. Mientras tanto puedes canjear tú desde la pestaña **Canjear** del panel (no pide PIN).
- **Cambiar reglas** (premios por semana, intentos, vigencia, fechas de campaña, regalos, dificultad…): panel → **Configuración** → **Guardar cambios**. Se aplican de inmediato. El servidor revisa los valores y guarda **todo o nada**.
- **Respaldo:** el plan gratis no hace copias automáticas. Descarga el CSV (pestaña **Códigos** → Exportar CSV, o **Cuenta** → Respaldo) cada semana y guárdalo en un lugar privado: trae nombres y celulares.
- **Olvidaste tu contraseña:** Supabase → Authentication → Users → tu usuario → cámbiala ahí.
- **Otro administrador:** crea su usuario como en el paso 2 y repite el paso 4 con su correo. **Quitar uno:** `delete from app.admins where user_id = (select id from auth.users where email = 'SU-CORREO');`
- **Un canje hecho por error no se puede deshacer desde el panel** (regla de seguridad: canjeado = desactivado para siempre). Si pasa de verdad, está la consulta manual en `sql/consultas_utiles.sql`.

### Las 13 funciones nuevas (`0003_staff_admin.sql`)
| Función | Quién la puede llamar | Qué hace |
|---|---|---|
| `canje_consultar(p_pin, p_codigo)` | la caja (clave pública + PIN) | Dice si el código es válido, canjeado, vencido, desactivado o no existe. No canjea. |
| `canje_confirmar(p_pin, p_codigo, p_regalo)` | la caja (clave pública + PIN) | Lo marca canjeado (una sola vez, atómico) y guarda el regalo entregado. |
| `admin_yo()` | sesión de Auth | ¿Esta sesión es de administrador? |
| `admin_resumen()` | solo administrador | Métricas: premios restantes, partidas, ganadores, códigos, canjes, 14 días, estado del PIN. |
| `admin_codigos(estado, buscar, desde, límite)` | solo administrador | Lista con filtro y búsqueda (sin tildes) por código, nombre o celular. |
| `admin_exportar(estado, buscar)` | solo administrador | Hasta 20.000 filas para el CSV. |
| `admin_consultar_codigo(código)` · `admin_canjear(código, regalo)` | solo administrador | Lo mismo que la caja, sin PIN y viendo nombre y celular. |
| `admin_estado_codigo(código, estado)` | solo administrador | Desactivar o reactivar (nunca un canjeado). |
| `admin_config()` · `admin_guardar_config(cambios)` | solo administrador | Leer y guardar toda la configuración (validada, todo o nada). |
| `admin_cambiar_pin(pin)` · `admin_desbloquear_pin()` | solo administrador | Poner o cambiar el PIN; quitar el bloqueo. |

Tablas nuevas (privadas, como las otras): `app.admins` (quién es administrador) y `app.staff` (el PIN cifrado con bcrypt y el conteo de intentos malos). La configuración gana dos columnas: `pin_intentos_max` (5) y `pin_bloqueo_min` (5).

### Por qué es seguro (resumen)
- El PIN **nunca** está en el código del juego ni en el repo: se guarda **cifrado** en el servidor y se verifica allá. No hay PIN por defecto.
- Las funciones de administrador no responden a la clave pública (`anon`): hace falta una **sesión de Supabase Auth** *y además* estar en `app.admins`. Supabase da permiso a `anon` en las funciones nuevas por defecto; `0003` se lo quita explícitamente a las 11 (y `probar-sql` lo comprueba imitando ese permiso por defecto).
- Los nombres y celulares los escriben los jugadores: el panel solo los muestra como **texto** (nunca como HTML) y el CSV neutraliza celdas que empiecen por `=`, `+`, `-` o `@` (para que Excel no ejecute fórmulas).
- Compromiso conocido: como la dirección `/canje/` es pública, cualquiera podría gastar los 5 intentos de PIN y bloquear la caja unos minutos. No puede entrar, pero sí molestar; tú desbloqueas desde el panel. Limitar por IP queda para la Etapa 6.
