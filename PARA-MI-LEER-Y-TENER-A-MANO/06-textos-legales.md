# Textos legales y del premio — para revisar

> Generado con `npm run textos-legales` a partir de `web/js/textos.js` (**no lo edites a mano**: si quieres cambiar algo, dile a Claude qué frase, o edita `web/js/textos.js` y vuelve a correr el comando). Los números salen de los valores de fábrica; en el juego real los manda el servidor (panel → Configuración).
>
> **Para quien revisa (la dueña, su mamá, un abogado si quieren):** lee cada bloque tal como lo verá la gente y marca lo que cambiarías. Esto es un texto razonable para un juego promocional pequeño, **no es asesoría legal**: si el negocio crece, vale la pena que un abogado lo mire una vez. Marco de referencia: Ley 1581 de 2012 (protección de datos personales, Colombia).

## 0. Lo primero que se ve (pantalla de inicio)

Llega a la meta y gánate **un raspao personal** o **un cholado de 10 oz** — con tu compra desde $30.000

## 1. Datos del local (salen en el código del cliente)

- Dirección: **Cholados La India, Canchas Panamericanas**
- Todos los días, de 2:00 p. m. a 9:00 p. m.
- Responsable de los datos: **Cholados La India**
- Correo para consultar, corregir o borrar datos: **choladoslaindia6@gmail.com**

## 2. «Condiciones de la promoción» (botón «Ver condiciones», en el inicio, en el formulario y en el ticket)

1. Ganas si **llegas a la meta** con mínimo **25 frutas**. Tienes **3 intentos** por semana.
2. Cada código da **un solo regalo**: **un raspao personal** o **un cholado de 10 oz**. **No es acumulable**: con una compra de $60.000 también es un solo regalo.
3. Se necesita una compra mínima de **$30.000** en productos pagados; el regalo no cuenta.
4. El código tiene un **plazo máximo de 7 días** desde que lo recibes (en tu código aparece hasta cuándo) y se canjea **una sola vez**.
5. Solo se canjea en el local: Cholados La India, Canchas Panamericanas, **todos los días, de 2:00 p. m. a 9:00 p. m.**
6. Se entrega **un código por celular cada 7 días**.
7. Hay **50 premios por semana**; se renuevan cada lunes a la medianoche (apenas empieza el lunes). Cuando se acaban, toca esperar al lunes.
8. La promo todavía no tiene fecha de cierre: puede cambiar o terminar, y lo avisamos en Instagram (@cholados.laindia).

## 3. Al ganar: el formulario

- Texto de arriba: Solo falta un paso: **llena tus datos para activar tu código**.
- Casilla (sin premarcar, obligatoria): «Autorizo a Cholados La India a guardar mi nombre y celular para entregarme y controlar mi premio (Ley 1581 de 2012).»
- Resumen bajo la casilla: Tienes un plazo máximo de **7 días** para usar tu código (una sola vez) · un regalo por código, **no acumulable** · compra mínima de **$30.000**.
- Botón: «Activar mi código»

### Política de datos (botón «Ver política de datos»)

Guardamos tu nombre y tu celular solo para entregarte y controlar tu premio de esta campaña (incluye evitar que un mismo número reclame varias veces). Se almacenan en un servicio en la nube (Supabase, fuera de Colombia). **Los conservamos hasta 6 meses después de que termine la campaña y luego los borramos.** También guardamos, sin identificarte, desde qué enlace llegaste (por ejemplo, el QR del mostrador) para saber qué publicidad funciona. Responsable: **Cholados La India**. **Si quieres que consultemos, corrijamos o borremos tus datos, escríbenos a choladoslaindia6@gmail.com** con tu nombre y tu celular y lo hacemos.

## 4. «¿Cómo se juega?» — la parte del premio

Si ganas, recibes un **código** para canjear en el local por **un raspao personal** o **un cholado de 10 oz**, con una compra mínima de **$30.000** en productos (el regalo no cuenta). Un regalo por código: **no es acumulable**.

## 5. El ticket del código

1. Ve al local y muestra este código en la caja.
2. Compra mínimo **$30.000** en productos (el regalo no cuenta).
3. Elige tu regalo: **un raspao personal** o **un cholado de 10 oz**.

Un regalo por código: **no es acumulable** (aunque compres $60.000, es un solo regalo).

Cuadro «Canjéalo aquí»: **CHOLADOS LA INDIA, CANCHAS PANAMERICANAS** · Todos los días · **de 2:00 p. m. a 9:00 p. m.**

## 5b. Otras pantallas que hablan de las reglas

- **Este celular ya tiene un código:** Damos **un código por celular cada 7 días**, para que alcance para más gente. Puedes ganarte otro desde el **[fecha]**
- **Sin intentos:** Ya jugaste los de esta semana. El **[lunes]** tienes más. ¡Aquí te esperamos!
- **Sin premios:** Esta semana ya se entregaron todos. Vuelve el **[lunes]** y atrapa el tuyo.
- **Ganó, pero ya no quedaban premios:** Otra persona se llevó el último premio justo antes que tú. Vuelve el **[lunes]** y atrapa el tuyo.

## 6. Lo que debe cumplirse en la práctica (no está en el texto del juego)

- **Los datos se guardan hasta 6 meses después de que termine la campaña** y luego se borran. Cómo: `02-operacion-corta.md` («Borrar los datos personales»). **Anótalo en el calendario** el día que cierres la campaña.
- Si alguien escribe a **choladoslaindia6@gmail.com** pidiendo consultar, corregir o borrar sus datos, hay que responderle y hacerlo (receta en `03-guia-del-administrador.md`, sección 7). La Ley 1581 (arts. 14 y 15) da **10 días hábiles** para atender una consulta y **15 días hábiles** para un reclamo.
- Los datos viven en Supabase (servidores fuera de Colombia): la política lo dice.
- El nombre y el celular **solo** se piden al ganar, con casilla de autorización sin premarcar; sin autorización no hay código.
- La caja **no ve** el nombre ni el celular del cliente; solo el administrador los ve.
