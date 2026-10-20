# Guía rápida — Cholado Runner (hecha para ti)

Todo lo que conviene tener a mano para manejar el proyecto: comandos, SQL para copiar y pegar, qué se hace desde el panel y recordatorios de cómo funciona cada cosa. Si algo no está aquí y lo necesitas, pídeselo a Claude y se agrega.

Última actualización: 2026-10-20, noche (Etapa 7). **Para «¿qué hago si pasa esto?» mira [03-guia-del-administrador.md](03-guia-del-administrador.md); para lo de todos los días en una hoja, [02-operacion-corta.md](02-operacion-corta.md); para publicar, [05-publicacion.md](05-publicacion.md) y [01-lista-de-lanzamiento.md](01-lista-de-lanzamiento.md).**

> **Nota para Claude (no borrar):** cada vez que agregues una funcionalidad clave, un comando nuevo, un cambio en cómo se opera el servidor o cualquier cosa que el dueño deba recordar, **añádela a esta guía** (en la sección que le toque) y actualiza la fecha de arriba **antes de cerrar la etapa**. Todo el SQL de los bloques ` ```sql ` se ejecuta en `npm run probar-sql`: si cambias una tabla o una función, esa prueba te avisa si algún bloque quedó roto. Los bloques de ejemplo que NO deben ejecutarse se marcan con ` ```text `. Esta guía está escrita para una persona que **no es experta**: tuteo, pasos cortos, cero jerga sin explicar.

**Índice:** [1. Dónde se hace cada cosa](#1-dónde-se-hace-cada-cosa) · [2. Lo que nunca se comparte](#2-lo-que-nunca-se-comparte) · [3. Ver el juego](#3-ver-el-juego-en-tu-computador-y-en-el-celular) · [4. Todos los comandos](#4-todos-los-comandos-de-la-terminal) · [5. SQL para pegar en Supabase](#5-sql-para-pegar-en-supabase) · [6. El panel de administrador](#6-el-panel-de-administrador) · [7. La caja](#7-la-caja-lo-que-usa-quien-atiende) · [8. Reglas actuales](#8-las-reglas-del-juego-valores-de-fábrica) · [9. La página de Supabase](#9-la-página-de-supabase-dónde-está-cada-cosa) · [10. GitHub Desktop](#10-github-desktop-guardar-tu-trabajo) · [11. Si algo falla](#11-si-algo-falla) · [12. Cuando se agregue algo nuevo](#12-cuando-se-agregue-algo-nuevo-al-proyecto) · [13. Dónde está cada documento](#13-dónde-está-cada-documento)

---

## 1. Dónde se hace cada cosa

| Lugar | Para qué | Cómo se abre |
|---|---|---|
| **La terminal** (PowerShell) | Comandos `npm run …`: ver el juego, correr pruebas | Abre la carpeta del proyecto en el Explorador de archivos → clic en la barra de la dirección, escribe `powershell` y Enter. O: en Claude, la pestaña de terminal. |
| **SQL Editor de Supabase** | Pegar SQL para mirar o cambiar la base de datos | supabase.com → tu proyecto `cholado-runner` → **SQL Editor** (menú izquierdo) → **«+»** → **Create a new snippet** → pegar → **Run** |
| **El panel de administrador** | Lo cómodo: ver códigos, canjear, cambiar reglas, PIN, descargar CSV | `http://localhost:5173/admin/` (con `npm run dev` corriendo). Cuando se publique, la dirección real. |
| **La caja** | Lo que usa quien atiende para canjear | `http://localhost:5173/canje/` |
| **GitHub Desktop** | Guardar el trabajo (commit) y subirlo | La aplicación de escritorio |

**Regla de oro del SQL Editor:** pega **una cosa a la vez** y lee lo que dice abajo. «Success. No rows returned» = hecho; una tabla = es una consulta que solo mira.

---

## 2. Lo que NUNCA se comparte

El repositorio de GitHub es **público** y este chat no debe tener secretos. **Nunca** pegues ni escribas en el chat, en archivos del proyecto ni en capturas: el **PIN de la caja**, tu **contraseña de administrador**, la **contraseña de la base de datos**, la **secret key / service_role** de Supabase. Lo único de Supabase que va en el proyecto es la **clave pública** (`sb_publishable_…`), y eso está bien.
Si alguna vez crees que se filtró algo: Supabase → Project Settings → API Keys (regenerar), y cambia el PIN y la contraseña. Para revisar el repo: `npm run revisar-secretos`.

---

## 3. Ver el juego en tu computador y en el celular

1. Terminal en la carpeta del proyecto → `npm run dev`. Déjala abierta (se apaga con `Ctrl + C`).
2. Abre en el navegador:

| Qué | Dirección |
|---|---|
| El juego (con el servidor real: gasta intentos y premios reales) | `http://localhost:5173/` |
| **Juego de práctica** (intentos ilimitados, sin servidor ni premios; muestra FPS y un panel «Debug») | `http://localhost:5173/?debug=1&api=falsa` |
| Juego con panel de calibración **y** el servidor real | `http://localhost:5173/?debug=1&servidor=1` |
| Panel de administrador | `http://localhost:5173/admin/` |
| La caja | `http://localhost:5173/canje/` |
| Diagnóstico de un celular | `http://localhost:5173/diagnostico/` |
| **Demos con datos de mentira** (no tocan nada real) | `http://localhost:5173/admin/?api=falsa` (cualquier correo, clave `demo`) y `http://localhost:5173/canje/?api=falsa` (PIN `1234`; códigos `K7M2`, `R8T3`, `V3N5`, `D6F2`) |
| El historial de versiones guardadas | `http://localhost:5173/historial/` |

3. **En el celular** (misma wifi que el computador): usa la dirección que la terminal muestra como **«En tu celular: http://192.168.x.x:5173/»** y agrégale la ruta (por ejemplo `…/diagnostico/`). Si no abre: Windows pregunta si deja a *Node.js* usar la red → **Permitir**.
4. Para probar **dentro de Instagram o Facebook**: mándate esa dirección por mensaje directo y tócala desde la app. Guía completa: [documentos/pruebas-en-celulares.md](../documentos/pruebas-en-celulares.md).

---

## 4. Todos los comandos de la terminal

Siempre se escriben en la terminal, **dentro de la carpeta del proyecto**. Primero (una sola vez, o si cambias de computador): `npm install`.

| Comando | Para qué | ¿Deja datos de prueba en el servidor real? |
|---|---|---|
| `npm run dev` | Prende el servidor local para ver todo (sección 3). | No |
| `npm run sql` | Arma el archivo **`supabase/todo-junto.sql`** con TODO el SQL del servidor. Úsalo cada vez que Claude cambie algo en `supabase/migrations/`; luego se pega en Supabase (sección 5.9). | No |
| `npm run probar-sql` | Prueba todo el SQL en tu computador, sin tocar Supabase (≈ 10 s). Debe terminar en «✅ TODO BIEN». Incluye este documento: ejecuta todos sus bloques SQL. | No |
| `npm run probar-mutaciones` | Rompe el SQL a propósito y comprueba que las pruebas lo notan (≈ 2 min). | No |
| `npm run revisar-secretos` | Busca claves, contraseñas y PIN en el repo **y en su historial** (≈ 1 s). | No |
| `npm run probar-seguridad` | Comprueba en tu servidor real que lo del administrador está cerrado y que el registro de usuarios está apagado (≈ 3 s). | No |
| `npm run probar-ataques` | Te portas como atacante contra el servidor real (≈ 5 s). Con `-- --completo` (≈ 1 min) hace trampas que exigen esperar. | Solo con `--completo` |
| `npm run probar-supabase` | Prueba pesada de concurrencia contra el servidor real (≈ 2 min). **Gasta el banco de premios.** | **Sí → luego limpiar (5.1)** |
| `npm run probar-canje` | 25 cajeros simultáneos contra un mismo código (te pide el PIN **en tu terminal**). Antes: limpiar (5.1). | **Sí → luego limpiar (5.1)** |
| `npm run simular` | Un bot juega miles de partidas y dice qué tan difícil está el juego. Acepta cambios: `npm run simular -- 2000 velocidad.final=14` | No |
| `npm run hito -- "nombre" "Título" "Descripción" "ruta/"` | Guarda una copia congelada del proyecto en `historial/` (Claude la usa al cerrar cada etapa). | No |
| `npm run qr` | Genera los **QR** (mostrador y vasos) y los **4 enlaces con etiquetas** (mostrador, vasos, instagram, facebook) en la carpeta `QR-para-imprimir/`. `-- --campana=nombre` cambia la campaña. **No imprimas hasta que la dirección funcione.** | No |
| `npm run probar-canal` | Prueba (sin navegador) cómo el juego lee las etiquetas de los enlaces (≈ 1 s). | No |
| `npm run textos-legales` | Escribe `06-textos-legales.md`: lo que el juego dice sobre premio, datos y local, para revisarlo. | No |
| `npm run vendor` | Regenera Three.js recortado. **Solo** cuando el código del juego use una clase nueva de Three.js. | No |

---

## 5. SQL para pegar en Supabase

Cada bloque se pega en el **SQL Editor** (sección 1). Los que solo empiezan con `select` **solo miran**. Los que empiezan con `update`, `delete` o `truncate` **cambian o borran**: lee el comentario antes.

### 5.1 Limpiar datos de prueba (¡el más usado!)
Borra TODOS los códigos y partidas y los contadores por red; **no** toca la configuración, el PIN ni los administradores. Úsalo después de correr pruebas del servidor real y **una vez antes de lanzar**. **NUNCA cuando ya haya clientes reales**: borraría los códigos que la gente tiene en el celular.

```sql
truncate app.codigos, app.partidas, app.limites_red restart identity cascade;
```

### 5.2 Empezar de cero del todo: reglas de fábrica
Devuelve **todas las reglas** a sus valores de fábrica (los de la sección 8). No borra códigos ni toca el PIN.

```sql
update app.configuracion set
  intentos_por_semana = 3, premios_por_semana = 50, cupo_diario = 0, vigencia_dias = 7,
  dias_entre_codigos_por_celular = 7, compra_minima = 30000,
  regalos = '["Un raspao personal","Un cholado de 10 oz"]'::jsonb,
  campana_inicio = null, campana_fin = null,
  duracion_partida_s = 60, frutas_minimas = 25, minimo_jugado_s = 45, ventana_reclamo_min = 15,
  prefijo_codigo = 'LAINDIA', largo_codigo = 4, juego = '{}'::jsonb,
  pin_intentos_max = 5, pin_bloqueo_min = 5, pin_intentos_max_global = 30,
  limite_partidas_ip_hora = 150, limite_codigos_ip_dia = 8
where id = 1;
```

**«Cero absoluto» antes de lanzar** (en este orden): 5.1 (limpiar datos) → 5.2 (reglas de fábrica, si las moviste) → 5.7 (quitar el PIN de pruebas y poner el definitivo en el panel → Cuenta) → pegar `todo-junto.sql` (5.9) y comprobar «✅ Todo en orden».

### 5.3 Mirar: cómo va todo
Los últimos 50 códigos con su estado real (activo, vencido, canjeado, desactivado):

```sql
select codigo, nombre, celular, estado_efectivo, emitido_en at time zone 'America/Bogota' as emitido_bogota,
       vence_en at time zone 'America/Bogota' as vence_bogota, regalo_elegido, canjeado_en
from app.v_codigos order by emitido_en desc limit 50;
```

Cuántos premios quedan (restantes = el menor entre lo que queda de la semana y lo que queda hoy; «diario» vacío = sin cupo diario):

```sql
select * from app.cupos();
```

Números de la semana y de hoy:

```sql
select (select count(*) from app.codigos where semana = app.semana_de(now())) as codigos_esta_semana,
       (select count(*) from app.codigos where dia = app.dia_de(now())) as codigos_hoy,
       (select count(*) from app.partidas where semana = app.semana_de(now())) as partidas_esta_semana,
       (select count(*) from app.partidas where resultado = 'gano_validado' and not reclamada and reserva_hasta > now()) as premios_apartados_ahora;
```

Los canjes de hoy (quién los hizo: `staff` = la caja, `admin` = el panel):

```sql
select codigo, nombre, regalo_elegido, canjeado_por, canjeado_en at time zone 'America/Bogota' as canjeado_bogota
from app.codigos where estado = 'canjeado' and app.dia_de(canjeado_en) = app.dia_de(now()) order by canjeado_en desc;
```

Lo que ve el juego (premios, intentos, reglas, dificultad):

```sql
select public.estado(gen_random_uuid());
```

Las reglas actuales (sin la «sal» secreta de las redes):

```sql
select intentos_por_semana, premios_por_semana, cupo_diario, vigencia_dias, dias_entre_codigos_por_celular, compra_minima, regalos,
       campana_inicio, campana_fin, duracion_partida_s, frutas_minimas, minimo_jugado_s, ventana_reclamo_min, prefijo_codigo, largo_codigo,
       pin_intentos_max, pin_bloqueo_min, pin_intentos_max_global, limite_partidas_ip_hora, limite_codigos_ip_dia, juego, actualizado_en
from app.configuracion;
```

Buscar a una persona por su celular (cambia el número):

```sql
select codigo, nombre, celular, estado_efectivo, emitido_en at time zone 'America/Bogota' as emitido_bogota, canjeado_en
from app.v_codigos where celular = '3001234567' order by emitido_en desc;
```

### 5.4 Cambiar reglas (se aplican de inmediato a todo el mundo)
Todo esto también se hace **con botones** en el panel → Configuración (sección 6). Estos son los atajos en SQL:

```sql
update app.configuracion set premios_por_semana = 60 where id = 1;
```
```sql
update app.configuracion set intentos_por_semana = 5 where id = 1;
```
```sql
update app.configuracion set cupo_diario = 8 where id = 1;
```
```sql
update app.configuracion set cupo_diario = 0 where id = 1;
```
```sql
update app.configuracion set compra_minima = 35000, vigencia_dias = 10 where id = 1;
```
```sql
update app.configuracion set campana_inicio = '2026-11-01 00:00-05', campana_fin = '2026-12-31 23:59-05' where id = 1;
```
```sql
update app.configuracion set campana_inicio = null, campana_fin = null where id = 1;
```

(`cupo_diario = 0` es **apagado**. Las fechas llevan `-05` porque son hora de Bogotá. Cambiar la vigencia, el prefijo o el largo solo vale para los códigos que se expidan desde ese momento.)

### 5.5 Dificultad del juego
Mezcla lo que pongas con lo que ya hay (no borra el resto). Los nombres son los de `web/js/config.js`. Si el juego está muy fácil o muy difícil, mira primero `documentos/calibrar-dificultad.md`.

```sql
select app.ajustar_juego('{"velocidad": {"inicial": 10, "final": 15}}');
```
```sql
select app.ajustar_juego('{"partida": {"frutasMinimas": 20, "vidas": 4}}');
```

Volver a la dificultad de fábrica (la de `config.js`):

```sql
update app.configuracion set juego = '{}'::jsonb, frutas_minimas = 25 where id = 1;
```

### 5.6 Códigos a mano
Desactivar un código (alguien lo perdió o hubo un error; los vencidos y desactivados **no se reciclan**). Cambia `LAINDIA-XXXX`:

```sql
update app.codigos set estado = 'desactivado' where codigo = 'LAINDIA-XXXX' and estado = 'activo';
```

Reactivar uno que se desactivó por error:

```sql
update app.codigos set estado = 'activo' where codigo = 'LAINDIA-XXXX' and estado = 'desactivado';
```

Un canje hecho **por error** (el panel no lo permite a propósito). Revisa bien el código antes de correrlo; devuelve el código a «activo»:

```sql
update app.codigos set estado = 'activo', canjeado_en = null, canjeado_por = null, regalo_elegido = null where codigo = 'LAINDIA-XXXX' and estado = 'canjeado';
```

### 5.7 PIN de la caja y administradores
Estado del PIN (el PIN en sí **no se puede ver**: está cifrado):

```sql
select pin_hash is not null as pin_configurado, pin_cambiado_en at time zone 'America/Bogota' as cambiado_bogota,
       fallos, bloqueos, bloqueado_hasta at time zone 'America/Bogota' as bloqueado_hasta_bogota from app.staff;
```

La caja está bloqueada (muchos PIN malos): desbloquear. (También se hace con un botón: panel → Cuenta → «Desbloquear ahora».)

```sql
update app.staff set fallos = 0, bloqueos = 0, ultimo_fallo = null, bloqueado_hasta = null where id = 1;
delete from app.limites_red where clave like 'pin:%';
```

Quitar el PIN actual (la caja deja de funcionar hasta que pongas uno nuevo en el panel → Cuenta). Úsalo si crees que alguien lo supo:

```sql
update app.staff set pin_hash = null, fallos = 0, bloqueos = 0, ultimo_fallo = null, bloqueado_hasta = null where id = 1;
```

¿Quiénes son administradores?

```sql
select a.user_id, u.email, a.creado_en from app.admins a left join auth.users u on u.id = a.user_id;
```

Agregar a otro administrador (primero créale el usuario en Supabase → Authentication → Users → Add user, con «Auto Confirm User»; cambia `SU-CORREO`):

```sql
insert into app.admins (user_id) select id from auth.users where email = 'SU-CORREO' on conflict do nothing;
```

Quitar a un administrador:

```sql
delete from app.admins where user_id = (select id from auth.users where email = 'SU-CORREO');
```

### 5.8 Borrar datos personales viejos (privacidad)
Para cumplir lo que prometa la política de datos («guardamos tu nombre y celular hasta X»): deja los códigos pero **borra el nombre y el celular** de los que vencieron hace más de 6 meses (180 días). Ajusta los días si decides otro plazo. Se puede correr cada tanto (por ejemplo, al cerrar cada campaña).

```sql
update app.codigos set nombre = '(borrado)', celular = '3000000000'
where vence_en < now() - interval '180 days' and nombre <> '(borrado)';
```

### 5.9 Actualizar el servidor cuando Claude cambie algo
1. En la terminal: `npm run sql`.
2. Abre `supabase/todo-junto.sql`, selecciona todo (`Ctrl + A`) y copia (`Ctrl + C`).
3. SQL Editor → «+» → **Create a new snippet** → pegar → **Run** (si sale un aviso amarillo, «Run this query»).
4. Abajo debe aparecer **«✅ Todo en orden»**. (Ahora incluye 4 migraciones: 0001 a 0004.) Es seguro repetirlo: no borra datos, ni el PIN, ni los administradores. Si lista problemas o da un error, pásaselo a Claude.

La **auditoría de permisos** sola (solo mira, no cambia nada) es el archivo `supabase/sql/auditoria_permisos.sql`.

---

## 6. El panel de administrador

Entra con tu correo y contraseña (no marques «mantener sesión» en un dispositivo ajeno). Las 5 pestañas:

| Pestaña | Para qué |
|---|---|
| **Resumen** | **«¿De dónde vienen los jugadores?»** (por mostrador, vasos, instagram, facebook…; esta semana, 30 días o todo) y los premios que quedan (de la semana y de hoy si hay cupo diario), si el juego está abierto, partidas, quiénes llegaron a la meta, códigos y canjes de la semana, y los últimos 14 días. |
| **Códigos** | Lista con filtros (activos, canjeados, vencidos, desactivados) y buscador (código, nombre o celular). Botones: **Canjear**, **Desactivar/Reactivar**, **Exportar CSV**. |
| **Canjear** | La misma pantalla de la caja pero **sin PIN** y viendo nombre y celular del cliente. Útil si la caja está bloqueada. |
| **Configuración** | **Todas** las reglas editables: premios por semana, **cupo diario (se prende y se apaga)**, intentos, vigencia, días entre códigos por celular, compra mínima, minutos que se aparta el premio, prefijo y largo del código, regalos (1 a 6), fechas de la campaña, duración de la partida, frutas mínimas, dificultad, y los límites de seguridad. «Guardar cambios» y listo; si algún valor está mal, no se guarda nada. |
| **Cuenta** | PIN de la caja (poner, cambiar, desbloquear), descargar **todos** los códigos en CSV (tu respaldo) y cerrar sesión. |

**Tareas de todos los días:**
- **Cambiar el PIN:** Cuenta → «PIN nuevo» y «Repite el PIN» → Cambiar PIN. 4 a 8 números (mejor 6; no `1234` ni repetidos). El anterior deja de servir al instante.
- **La caja se bloqueó:** Cuenta → **Desbloquear ahora**; mientras tanto canjea tú desde la pestaña **Canjear**.
- **Subir los premios de la semana:** Configuración → «Premios por semana».
- **Activar o apagar el cupo diario:** Configuración → «Cupo diario (opcional)»: marca «Activar el cupo diario» y escribe cuántos premios por día (con 50 por semana, 8 al día es un buen comienzo). Apagado = solo manda el tope de la semana. Con el cupo activo, cuando se reparten los del día el juego dice «vuelve mañana».
- **Poner fechas a la campaña:** Configuración → «Campaña (temporada)». Vacías = siempre activa.
- **Cambiar los regalos que se pueden elegir:** Configuración → «Regalos» (el juego y la caja los toman de ahí).
- **Respaldo semanal:** Códigos → **Exportar CSV** (o Cuenta → «Descargar todos los códigos»). El plan gratis de Supabase **no** hace copias automáticas. El archivo tiene nombres y celulares: guárdalo en un lugar privado.
- **Un código no sirve / lo pierden:** búscalo en Códigos; si es un error tuyo, «Desactivar» y que la persona vuelva a jugar (no se recicla).

---

## 7. La caja (lo que usa quien atiende)

1. Abre `/canje/`, escribe el **PIN** y el **código** (completo `LAINDIA-K7M2`, en minúsculas, sin guion o solo las 4 letras finales).
2. **Verificar** y mira el color:
   - **Verde «CÓDIGO VÁLIDO»:** revisar que la compra sea de **$30.000 o más** en productos (el regalo no cuenta; el sistema no lo puede saber), elegir el regalo que escoge el cliente y **Marcar como canjeado**. Se puede una sola vez.
   - **Naranja «YA FUE CANJEADO»:** dice cuándo y qué regalo se entregó.
   - **Rojo «VENCIDO»:** dice hasta cuándo valía. · **Gris «DESACTIVADO»** · **Rojo «NO EXISTE»** (los códigos no llevan 0, O, 1 ni I).
   - **«PIN INCORRECTO»:** quedan unos intentos por red; **«DEMASIADOS INTENTOS»:** esa red queda bloqueada hasta que termine la ventana (≤ 15 min) o hasta que el dueño la desbloquee.
3. La caja **no ve** el nombre ni el celular del cliente.

---

## 8. Las reglas del juego (valores de fábrica)

| Regla | Valor |
|---|---|
| Premio | Compra mínima de **$30.000** en productos pagados (el regalo no cuenta). Un regalo por código: **un raspao personal** o **un cholado de 10 oz** (se elige al canjear). **No acumulable.** |
| Banco | **50 premios por semana** (reinicia el lunes 00:00, hora de Bogotá). Cupo diario: **apagado** por defecto. |
| Intentos | **3 por semana** por dispositivo. |
| Vigencia | **7 días** desde la expedición (el ticket dice «vale hasta» un minuto antes de cumplirse). Los vencidos no se reciclan. |
| Un código por persona | Por celular, cada **7 días**. |
| Partida | **60 s**, 3 vidas, **25 frutas mínimas** para ganar (de ~70 que salen), velocidad 9,5 → 14,5. El servidor exige jugar al menos 45 s. |
| Premio apartado | **15 min** mientras la persona llena su nombre y celular. |
| Límites por red | **150 partidas/hora** y **8 códigos/día** por internet; PIN: 5 intentos malos por red cada 15 min (30 en total para el bloqueo general). |
| Código | `LAINDIA-XXXX` (4 letras/números sin 0, O, 1, I). |

---

## 9. La página de Supabase: dónde está cada cosa

| Quiero… | Voy a… |
|---|---|
| Pegar SQL | **SQL Editor** |
| Crear o cambiar la contraseña de un usuario administrador | **Authentication → Users** (el registro público debe seguir **apagado**: Authentication → Sign In / Providers → «Allow new users to sign up» apagado) |
| Ver los datos como una hoja de cálculo | **Table Editor** → elegir el esquema **app** (códigos, partidas…). Mejor no editar ahí: usa el panel o el SQL de arriba. |
| Ver qué llamadas llegan / errores | **Logs** (menú izquierdo) |
| Copiar la URL y la clave pública | **Project Settings → API Keys** (la pública va en `web/js/supabase-config.js`; la **secret** no se comparte nunca) |
| Si el proyecto se «durmió» | El plan gratis se pausa tras ~1 semana sin actividad: entra al proyecto y pulsa **Resume project**. (En la Etapa 7 se programa una llamada diaria para evitarlo.) |

---

## 10. GitHub Desktop: guardar tu trabajo

1. Abre GitHub Desktop (repositorio `cholado-runner`). En **Changes** salen los archivos que cambiaron.
2. Abajo a la izquierda, en **Summary**, pega la **frase de commit** que te da Claude al cerrar cada etapa.
3. **Commit to main** y después **Push origin** (arriba).
Claude **nunca** hace commit ni push: lo haces tú. Las carpetas `node_modules/` y `referencias-diseno/` no se suben (están en `.gitignore`). La carpeta `historial/` **sí** se sube y nunca se borra.

---

## 11. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| «No pudimos conectarnos» en el juego | ¿Hay internet? ¿El proyecto de Supabase está pausado (sección 9)? Mira Logs. |
| La caja dice «FALTA EL PIN» | Aún no hay PIN: panel → Cuenta → ponlo. |
| «DEMASIADOS INTENTOS» en la caja | Panel → Cuenta → Desbloquear ahora (o 5.7). |
| El panel dice «Esta cuenta no es de administrador» | Falta anotar tu correo: 5.7 «Agregar a otro administrador» con tu correo. |
| El panel dice «faltan las funciones» | No se pegó el SQL: 5.9. |
| Nadie puede jugar por premio y quedan premios | Mira Resumen: ¿manda el cupo del día? ¿la campaña está fuera de fechas? ¿es lunes y se acabó la semana? |
| Salen premios agotados después de correr pruebas | 5.1 (limpiar datos de prueba). |
| `probar-canje` dice «sin-premios» | Falta 5.1 antes. |
| «Limite-red» / «hay muchas partidas desde tu red» | Las pruebas gastaron el tope de tu internet: 5.1 lo limpia (o espera a la próxima hora/día). |
| Olvidé mi contraseña de administrador | Supabase → Authentication → Users → tu usuario → cambiarla. |
| Olvidé el PIN | No se puede ver: pon uno nuevo en el panel → Cuenta (o 5.7 «Quitar el PIN» si el panel no abre). |
| `npm` no se reconoce | Instala Node.js LTS y abre una terminal nueva. |
| El celular no abre `http://192.168…` | Misma wifi, y permitir *Node.js* en el firewall de Windows (sección 3). |
| `npm run probar-sql` falla en «todo-junto.sql está al día» | Corre `npm run sql`. |
| Un cliente dice «gané y se me perdió el premio» (recargó o se cerró la página) | Ya no se pierde: al volver a abrir el juego le sale «¡Tu premio te espera!» (por 2 h y máximo 3 veces). Si le sale «no pudimos validar tu partida», pasó demasiado tiempo: que vuelva a jugar. |
| El contador baja pero «nadie reclamó» (premio apartado) | Al ganar, el servidor **aparta** un premio **15 minutos** para esa persona y **lo libera solo** si no lo reclama (panel → Configuración → «ventana de apartado»; puedes bajarla a 5-10 min). Nunca queda apartado para siempre. La persona, si volvió a entrar, ve «¡Tu premio te espera!» hasta 2 h y máximo 3 veces. |
| «No suena nada» en el celular | Abre `/diagnostico/` en ese celular y pulsa **«Probar sonido»**: dice si el navegador dejó sonar. ¿Tiene el interruptor de silencio (iPhone, el botoncito del lado)? ¿El botón de sonido del inicio/pausa está en «no»? El sonido empieza con el primer toque (en iPhone tiene que ser un toque completo, no solo apoyar el dedo). |
| En `?debug=1&api=falsa` los intentos no bajan | Es a propósito: en el cuadrito de arriba dice «INTENTOS ILIMITADOS»; desmárcalo en el botón «Debug». |

---

## 12. Cuando se agregue algo nuevo al proyecto

- **Cambió algo en `supabase/migrations/`** → `npm run sql` → pegar `todo-junto.sql` en Supabase (5.9).
- **El código del juego usa una clase nueva de Three.js** → `npm run vendor`.
- **Se agregó o renombró un archivo `.js` del juego en `web/js/`** → actualizar la lista de `modulepreload` en `web/index.html` (sin esto el juego funciona igual, solo carga un poco más lento).
- **Se cerró una etapa** → Claude guarda un hito (`npm run hito …`), actualiza los `.md` y esta guía, y te da la frase de commit.

---

## 13. Dónde está cada documento

| Archivo | Qué es |
|---|---|
| `04-guia-rapida.md` | **Esta guía.** |
| `02-operacion-corta.md` | Una hoja: cambiar configuración, cambiar el PIN, ver canjes, cerrar la temporada, borrar datos personales. |
| `05-publicacion.md` | Publicar en GitHub Pages paso a paso, verificar el aviso diario, enlaces UTM y QR. |
| `01-lista-de-lanzamiento.md` | La lista de chequeo ordenada para abrir al público. |
| `06-textos-legales.md` | Todo lo que el juego dice sobre premio, datos y local (generado). |
| `03-guia-del-administrador.md` | **Situaciones del día a día** («¿qué hago si…?»): lista para abrir al público, borrar un código de prueba, pausar el juego, caja bloqueada, trampa, privacidad… |
| `PLAN.md` | El estado de las etapas. |
| `pendientes.md` | Lo que falta decidir o hacer. |
| `CLAUDE.md` | El contexto del proyecto para Claude (reglas, decisiones, arquitectura). |
| `README.md` | Presentación corta del repositorio. |
| `supabase/LEEME.md` | Cómo funciona el servidor y su puesta en marcha. |
| `documentos/bitacora.md` | Todo lo hablado y decidido, con el porqué. |
| `documentos/reporte-etapa6.md` | Reporte de pruebas y seguridad. |
| `documentos/fase-a-paquete.md` | **El paquete de la Fase A**: todo lo que se puede ejecutar y una lista larga de qué probar para cazar bugs (PC y iPhone XR). |
| `documentos/pruebas-en-celulares.md` | Cómo probar en celulares reales. |
| `documentos/calibrar-dificultad.md` | Cómo medir y ajustar la dificultad. |
| `historial/` | Copias congeladas del proyecto en cada hito (con capturas). |
