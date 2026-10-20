# Guía del administrador — «¿Qué hago si pasa esto?»

Esta guía es para ti, como dueña o dueño del juego. Está hecha **por situaciones**: buscas lo que te pasó, sigues los pasos y listo. Si algo no está aquí, cuéntale a Claude qué pasó (hay una plantilla al final) y se agrega.

Última actualización: 2026-10-20 (cierre de la Fase B).

> **Nota para Claude (no borrar):** cada vez que aparezca una situación nueva de operación (algo que el dueño tuvo que resolver o preguntó), **agrégala aquí** y actualiza la fecha. Todo el SQL de los bloques ` ```sql ` se ejecuta en `npm run probar-sql` (sección 24): si cambias una tabla o una función, esa prueba avisa si algún bloque quedó roto. Los ejemplos que no deben ejecutarse van en ` ```text `. Texto simple, tuteo, cero jerga sin explicar. Esta guía **no repite** lo que ya está en `guia-rapida.md` (comandos, todo el SQL de uso diario, reglas de fábrica): la completa y la apunta con «(guía rápida 5.x)».

**Índice:** [Las 3 herramientas](#las-3-herramientas) · [1. Antes de abrir al público](#1-antes-de-abrir-al-público) · [2. Códigos](#2-códigos) · [3. Premios, intentos y pausar el juego](#3-premios-intentos-y-pausar-el-juego) · [4. La caja y el PIN](#4-la-caja-y-el-pin) · [5. No puedo entrar / algo no carga](#5-no-puedo-entrar--algo-no-carga) · [6. Cambiar textos del juego](#6-cambiar-textos-del-juego-dirección-horario-nombre) · [7. Datos personales](#7-datos-personales-y-privacidad) · [8. Alguien está haciendo trampa](#8-alguien-está-haciendo-trampa) · [9. Cómo pedirle ayuda a Claude](#9-cómo-pedirle-ayuda-a-claude)

---

## Las 3 herramientas

| Herramienta | Para qué | Regla |
|---|---|---|
| **El panel** (`/admin/`) | Casi todo: ver códigos, canjear, desactivar, cambiar reglas, PIN, CSV | **Siempre pruébalo primero.** Es lo más seguro: valida lo que escribes. |
| **El SQL Editor de Supabase** | Lo que el panel no hace a propósito (borrar un código de prueba, extender un código, pausar rápido) | Pega **un bloque a la vez**, lee lo que dice abajo. Los que dicen `delete`, `truncate` o `update` **cambian o borran**. Antes de correr uno que borra, **mira primero** lo que va a borrar (cada receta trae su «mirar»). |
| **GitHub Desktop** | Cambiar textos del juego (dirección, horario…) | Solo cuando lo que quieres cambiar es una frase del juego (sección 6). |

Cómo abrir el SQL Editor y todo el SQL de uso diario: `guia-rapida.md` (secciones 1 y 5). **Nunca** escribas el PIN, tu contraseña ni las claves de Supabase en el chat con Claude ni en un archivo del proyecto.

---

## 1. Antes de abrir al público

### 1.1 «Sin querer generamos un código de prueba. ¿Cómo lo borro y dejo todo limpio?»

Depende de si **ya hay clientes reales**. Míralo así:

```sql
select count(*) as codigos_en_total,
       count(*) filter (where emitido_en > now() - interval '1 day') as ultimas_24_horas
from app.codigos;
```

- **Si todavía NO hay clientes reales** (todo lo que hay son pruebas tuyas): **limpia todo** con la receta 5.1 de la guía rápida. Borra todos los códigos, las partidas y los contadores por red; **no** toca las reglas, el PIN ni los administradores. Los premios del banco vuelven a estar completos.
- **Si YA hay clientes reales:** **no uses la limpieza total**: borraría los códigos que la gente tiene en el celular. Borra **solo** el código de prueba (receta 2.1) y deja lo demás.

### 1.2 Lista para «abrir la puerta» (en este orden)

Hazla cuando termines **todas** tus pruebas: la limpieza va de **último**, porque cada prueba deja datos.

1. **Reglas:** panel → **Configuración**: revisa premios por semana, intentos, vigencia, compra mínima, regalos y fechas de la campaña. Si moviste cosas y quieres volver a los valores de fábrica: guía rápida 5.2.
2. **Cupo diario:** decide con tu mamá si lo prendes (Configuración → «Cupo diario»). Con 50 premios por semana, 8 por día es un buen comienzo; apagado = solo manda el tope de la semana.
3. **PIN definitivo de la caja:** panel → **Cuenta** → pon un PIN de 6 números (no `1234`) y díselo **solo** a quien atiende. Si dejaste uno de prueba, cámbialo ahora.
4. **Servidor al día:** si Claude te dijo que cambió algo en el servidor, corre `npm run sql` y pega `supabase/todo-junto.sql` (guía rápida 5.9). Abajo debe salir **«✅ Todo en orden»**.
5. **Última prueba como cliente** (una sola, desde tu celular): juega, gana, saca tu código, **canjéalo en la caja** con el PIN definitivo. Todo bien → sigue.
6. **Limpieza final:** guía rápida 5.1 (borra esa última prueba también).
7. **Comprueba que quedó en cero:**

```sql
select (select count(*) from app.codigos) as codigos, (select count(*) from app.partidas) as partidas, app.cupos() as cupos;
```

Debe decir 0 códigos, 0 partidas y los premios completos.

8. **Después de abrir:** mira el panel → **Resumen** el primer día y el **primer lunes** (ahí se reinicia la semana).

---

## 2. Códigos

### 2.1 Borrar un código de prueba (con clientes reales ya jugando)

Borra **un** código y la partida con la que se ganó. **El premio vuelve al banco** de la semana (porque los códigos expedidos son los que lo gastan). Primero **mira** de quién es:

```sql
select codigo, nombre, celular, estado_efectivo, emitido_en at time zone 'America/Bogota' as emitido_bogota
from app.v_codigos where codigo = 'LAINDIA-XXXX';
```

Cambia `LAINDIA-XXXX` por el código y corre esto:

```sql
with borrado as (delete from app.codigos where codigo = 'LAINDIA-XXXX' returning partida_id)
delete from app.partidas where id in (select partida_id from borrado);
```

Si sabes el **celular de prueba** y quieres borrar **todos** sus códigos y también los intentos que gastó ese celular (cambia el número; es el que usaste para probar):

```sql
with mios as (select device_id from app.codigos where celular = '3001234567'),
     borrado as (delete from app.codigos where celular = '3001234567' returning partida_id)
delete from app.partidas p
where p.id in (select partida_id from borrado)
   or (p.device_id in (select device_id from mios)
       and not exists (select 1 from app.codigos c where c.partida_id = p.id and c.celular <> '3001234567'));
```

> **Borrar ≠ desactivar.** *Desactivar* (panel → Códigos) deja el código guardado pero inservible, y **sigue gastando un premio** del banco. *Borrar* lo elimina y devuelve el premio. Para un **cliente real**, casi siempre es mejor **desactivar** (queda registro de lo que pasó). Borrar es para pruebas.

### 2.2 Un cliente perdió su código

1. Pídele su **celular** y búscalo: panel → **Códigos** → buscador (o el SQL de la guía rápida 5.3 «Buscar a una persona por su celular»).
2. Díctale el código (confirma antes que el celular sea el suyo).
3. El cliente también puede recuperarlo solo: en el juego, **«Ver mi código»** (solo en el mismo navegador donde ganó).

### 2.3 Se equivocó escribiendo su nombre o su celular

Cambia `LAINDIA-XXXX`, el nombre y el celular (10 números que empiezan por 3):

```sql
update app.codigos set nombre = 'Nombre Correcto', celular = '3001234567' where codigo = 'LAINDIA-XXXX';
```

Ojo: el celular decide cuándo esa persona puede volver a reclamar (cada 7 días); si lo corriges, la regla se cuenta con el nuevo número.

### 2.4 Se canjeó un código por error

El panel **no** deshace canjes a propósito (para que no se use como puerta falsa). Revisa bien el código y usa la receta de la guía rápida **5.6** («Un canje hecho por error»). Si ya se entregó el regalo, lo mejor suele ser **no** revivir el código.

### 2.5 Darle más días a un código (o revivir uno que venció hace poco)

Un código vencido **no** se recicla solo, pero tú puedes decidir una excepción. Esto lo deja válido **3 días más desde ahora** (cambia los días y el código; funciona también con uno vencido, siempre que no esté canjeado ni desactivado):

```sql
update app.codigos set vence_en = now() + interval '3 days' where codigo = 'LAINDIA-XXXX' and estado = 'activo';
```

### 2.6 Desactivé un código por error

Panel → Códigos → **Reactivar** (o guía rápida 5.6). Un código **canjeado** no se reactiva.

### 2.7 Un cliente dice «gané pero no me salió el código»

1. Si **recargó** la página: al volver a entrar le sale «¡Tu premio te espera!» (dura 2 horas y sale máximo 3 veces).
2. Si ya pasó más tiempo, **no hay forma de recuperar** esa victoria: el premio apartado se libera solo. Que vuelva a jugar (si le quedan intentos).
3. Por si acaso, mira si sí se creó: busca por su celular (guía rápida 5.3). Si **sí** existe, díctale el código.

### 2.8 «¿De quién es este código?» / «¿Ya lo canjearon?»

Panel → **Códigos** → buscador. Verás nombre, celular, estado real (activo, canjeado, vencido, desactivado), cuándo y qué regalo se entregó. En la caja **no** se ven nombre ni celular (a propósito).

---

## 3. Premios, intentos y pausar el juego

### 3.1 «Se acabaron los premios de la semana y quiero que haya más»

Panel → **Configuración** → **«Premios por semana»** → sube el número → **Guardar cambios**. Aplica **al instante**. (Guía rápida 5.4 si prefieres SQL.) Ver cuántos quedan: panel → **Resumen**.

### 3.2 «Un cliente se quedó sin intentos y quiere más»

El juego cuenta los intentos por **dispositivo anónimo** (no por persona), así que **no se le puede dar uno solo a una persona concreta**. Tus opciones:

- **Para todos:** Configuración → «Intentos por semana» (sube de 3 a 4 o 5). Aplica al instante a todo el mundo.
- **Para tus pruebas con tu propio celular:** usa el juego de práctica (`/?debug=1&api=falsa`: intentos ilimitados y sin gastar premios), o la receta 2.1 con tu celular de prueba.
- **Devolver los intentos de esta semana a todo el mundo** (solo antes de abrir, o en una emergencia; también cancela los premios que alguien había ganado y todavía no reclamaba). No toca códigos ya expedidos:

```sql
delete from app.partidas p
where p.semana = app.semana_de(now()) and not exists (select 1 from app.codigos c where c.partida_id = p.id);
```

### 3.3 Prender o apagar el cupo diario

Panel → Configuración → «Cupo diario»: marca «Activar el cupo diario» y escribe cuántos por día (o desmárcalo para apagarlo). Con el cupo activo, cuando se reparten los del día, el juego dice «vuelve mañana».

### 3.4 Pausar el juego (y volver a abrirlo)

Sirve si el local cierra por un tiempo, si hay un problema, o si quieres que nadie gane mientras revisas algo. Hace que **nadie pueda empezar partidas nuevas** (el juego dice que por ahora no hay campaña). **No** afecta a los códigos que ya existen ni a la caja: se siguen canjeando.

- **Con el panel:** Configuración → «Campaña (temporada)» → pon la **fecha de fin** (por ejemplo, ahora) → Guardar. Para reabrir: borra las dos fechas.
- **Con SQL (más rápido).** Pausar ahora mismo:

```sql
update app.configuracion set campana_inicio = null, campana_fin = now() where id = 1;
```

Volver a abrir (sin fechas = siempre abierta):

```sql
update app.configuracion set campana_inicio = null, campana_fin = null where id = 1;
```

Para una temporada con fechas (hora de Bogotá, por eso el `-05`):

```sql
update app.configuracion set campana_inicio = '2026-12-01 00:00-05', campana_fin = '2026-12-31 23:59-05' where id = 1;
```

### 3.5 El juego está muy fácil o muy difícil

Panel → Configuración → **«Partida y dificultad»** (frutas mínimas, velocidad, tiempo…). Cómo medirlo y qué mover: `documentos/calibrar-dificultad.md`. Regla práctica: si casi nadie gana, baja las **frutas mínimas** (de 25 a 20, por ejemplo); si todos ganan, súbelas. Para volver a la dificultad de fábrica: guía rápida 5.5.

### 3.6 Cambiar el premio (los regalos o la compra mínima)

Panel → Configuración → «Regalos» y «Compra mínima». Los textos del juego, del formulario y del ticket **cambian para todos al instante** (también para quienes ya tienen un código), así que si cambias algo importante, avísale a la gente que ya tiene cupón.

---

## 4. La caja y el PIN

| Situación | Qué hacer |
|---|---|
| **«FALTA EL PIN»** | Todavía no hay uno: panel → **Cuenta** → ponlo. |
| **«DEMASIADOS INTENTOS»** (alguien se equivocó varias veces) | Panel → Cuenta → **Desbloquear ahora**. Mientras tanto, canjea tú desde el panel → pestaña **Canjear** (es la misma pantalla, sin PIN). |
| **Se fue un empleado** o crees que alguien supo el PIN | Panel → Cuenta → PIN nuevo (4 a 8 números, mejor 6) → **Cambiar PIN**. El anterior deja de servir al instante. |
| **Olvidé el PIN** | No se puede ver (está cifrado). Pon uno nuevo en el panel → Cuenta. Si el panel no abre: guía rápida 5.7 («Quitar el PIN»). |
| **El cajero dice «NO EXISTE»** | Probablemente lo escribió mal (los códigos no llevan 0, O, 1 ni I). Que lo reescriba o dicte el código completo. |
| **«VENCIDO»** pero el cliente reclama | Mira la fecha que dice la caja; si quieres hacer una excepción: receta 2.5. |
| **Dos cajeros canjearon el mismo código a la vez** | No pasa: el segundo recibe «ya fue canjeado». |
| El cliente dice que **no llegó a $30.000** | El sistema **no** puede verificarlo: lo valida quien atiende. Si no llega a la compra mínima, no se entrega el regalo (el código sigue sirviendo hasta que venza). |

---

## 5. No puedo entrar / algo no carga

| Síntoma | Qué mirar |
|---|---|
| El juego dice **«No pudimos conectarnos»** | ¿El celular tiene internet? Si es de todos: puede ser que Supabase se pausó (plan gratis, ~1 semana sin actividad). Entra a supabase.com → tu proyecto → **Resume project**. |
| **El panel dice «Esta cuenta no es de administrador»** | Falta anotar tu correo como administrador: guía rápida 5.7 («Agregar a otro administrador»). |
| **Olvidé mi contraseña del panel** | supabase.com → proyecto → **Authentication → Users** → tu usuario → cambiar la contraseña. |
| **Quiero que otra persona sea administradora** | Guía rápida 5.7 (primero se le crea el usuario en Authentication → Users). **Nunca** la contraseña por el chat. |
| El panel dice **«faltan las funciones»** | No se pegó el SQL: guía rápida 5.9. |
| **Nadie puede jugar** y quedan premios | Panel → Resumen: ¿la campaña tiene fechas? ¿el cupo del día se acabó? ¿es lunes y apenas empieza la semana? (receta 3.4 para reabrir). |
| Después de probar, **dice que no hay premios** o «hay muchas partidas desde tu red» | Las pruebas gastaron el banco o el límite de tu internet: limpieza (guía rápida 5.1). |
| Una página **en blanco** o con un error raro | Recarga con `Ctrl + F5`. Si sigue, abre el diagnóstico `/diagnostico/` en ese celular y pulsa «Copiar resultado» para mandárselo a Claude. |

---

## 6. Cambiar textos del juego (dirección, horario, nombre)

Estas frases **no** están en Supabase: están en el código del juego, en `web/js/textos.js`:

- **Dirección, horario y contacto del local:** la parte `LOCAL` (arriba del archivo).
- **Nombre del juego y demás frases:** el resto del archivo.

Pasos: pídele a Claude el cambio (o edítalo tú) → mira cómo quedó con `npm run dev` → en **GitHub Desktop** haz el commit y el push. **Cuando el juego esté publicado, el cambio le llega al público después del push** (cuánto demora y cómo verificarlo se deja escrito en la Etapa 7).

---

## 7. Datos personales y privacidad

- **Respaldo:** panel → Cuenta → «Descargar todos los códigos» (CSV con nombres y celulares: guárdalo en un lugar privado). El plan gratis **no** hace copias automáticas: hazlo cada semana.
- **Una persona pide que borres sus datos:** deja su código pero **anonimiza** su nombre y celular (cambia el celular):

```sql
update app.codigos set nombre = '(borrado)', celular = '3000000000' where celular = '3001234567';
```

- **Borrar los datos viejos de todos** (más de 6 meses desde que vencieron): guía rápida **5.8**. La política dice cuánto se guardan los datos: cuando la fijes, usa ese mismo plazo.

---

## 8. Alguien está haciendo trampa

Lo normal es que no pase, pero si ves **muchísimos códigos en pocos minutos** o varios con nombres raros:

1. Mira lo reciente (últimas 2 horas):

```sql
select codigo, nombre, celular, estado_efectivo, emitido_en at time zone 'America/Bogota' as emitido_bogota
from app.v_codigos where emitido_en > now() - interval '2 hours' order by emitido_en desc;
```

2. **Desactiva** los sospechosos (panel → Códigos → Desactivar). Quedan guardados como evidencia.
3. **Reduce el daño:** prende el **cupo diario** (3.3) y baja el límite «códigos por internet al día» (Configuración → Seguridad).
4. Si es grave, **pausa el juego** (3.4) mientras lo revisas, y cuéntale a Claude lo que viste.
5. Recuerda que no se puede evitar todo: el premio solo se canjea con una compra de $30.000 en el local, así que lo peor que pasa es que alguien consiga un cupón extra.

---

## 9. Cómo pedirle ayuda a Claude

Cuéntale **qué viste y qué esperabas**. Cuanto más concreto, más rápido se resuelve. Una plantilla:

```text
Qué pasó:        (ej. «un cliente dice que ganó pero no le salió el código»)
Dónde:           (el juego / la caja / el panel / Supabase)
Qué mensaje salió:  (copia el texto tal cual, o manda captura SIN claves ni PIN)
Cuándo:          (hora aproximada, para buscarlo en los datos)
Qué intentaste:  (ej. «probé desbloquear la caja y no funcionó»)
Datos del caso:  (el celular del cliente o el código si lo tienes; NUNCA el PIN ni contraseñas)
```

**Nunca** pegues en el chat: el PIN de la caja, tu contraseña del panel, la contraseña de la base de datos ni la *secret key* de Supabase. Para revisar que no se haya colado nada en el proyecto: `npm run revisar-secretos`.
