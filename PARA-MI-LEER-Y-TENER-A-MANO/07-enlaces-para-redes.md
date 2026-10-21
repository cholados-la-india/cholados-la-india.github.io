# Enlaces para poner en cada red (copiar y pegar)

Cada red tiene **su propio enlace**. Todos abren el mismo juego (`https://cholados-la-india.github.io/`), pero llevan una etiqueta que le dice al panel de dónde llegó cada jugador: panel → **Resumen** → «¿De dónde vienen los jugadores?». **Usa siempre el enlace de su red tal cual**, sin acortarlo ni quitarle lo que va después del `?`.

Última actualización: 2026-10-20, noche.

---

## 1. Los 4 principales

**Instagram: biografía de @cholados.laindia** (en la bio de Instagram usa este; si pones varios enlaces, que el del juego sea este), y también para la pegatina «Enlace» de las historias:
```text
https://cholados-la-india.github.io/?utm_source=instagram&utm_medium=social&utm_campaign=lanzamiento
```

**Facebook: página «Cholados La India»** (botón de la página, campo «Sitio web» y publicaciones normales):
```text
https://cholados-la-india.github.io/?utm_source=facebook&utm_medium=social&utm_campaign=lanzamiento
```

**Mostrador** (este enlace es el que lleva el QR del mostrador, que está en `QR-para-imprimir/qr-mostrador.svg`):
```text
https://cholados-la-india.github.io/?utm_source=mostrador&utm_medium=qr&utm_campaign=lanzamiento
```

**Vasos** (el que lleva el QR de los vasos, en `QR-para-imprimir/qr-vasos.svg`):
```text
https://cholados-la-india.github.io/?utm_source=vasos&utm_medium=qr&utm_campaign=lanzamiento
```

---

## 2. Si pagan anuncios (para no mezclarlos con lo que es gratis)

Así el panel separa «llegaron por el anuncio» de «llegaron por la bio o la página» y sabes si la plata del anuncio valió la pena.

**Anuncios de Instagram** (en el Administrador de anuncios de Meta, campo «URL del sitio web»):
```text
https://cholados-la-india.github.io/?utm_source=instagram&utm_medium=ads&utm_campaign=lanzamiento
```

**Anuncios de Facebook** (mismo campo):
```text
https://cholados-la-india.github.io/?utm_source=facebook&utm_medium=ads&utm_campaign=lanzamiento
```

*(Meta le agrega por su cuenta cosas como `fbclid=…` al final del enlace. No estorba: el juego solo mira las etiquetas `utm_`.)*

---

## 3. Otras redes (por si las usan)

**WhatsApp** (estados, grupos, listas de difusión, mensajes a clientes):
```text
https://cholados-la-india.github.io/?utm_source=whatsapp&utm_medium=social&utm_campaign=lanzamiento
```

**TikTok** (biografía o videos):
```text
https://cholados-la-india.github.io/?utm_source=tiktok&utm_medium=social&utm_campaign=lanzamiento
```

---

## 4. Cómo hacer un enlace nuevo (una campaña, un video, un volante…)

Tomas el enlace base y cambias las tres etiquetas:

```text
https://cholados-la-india.github.io/?utm_source=QUIEN&utm_medium=COMO&utm_campaign=CUAL
```

| Etiqueta | Qué pones | Ejemplos |
|---|---|---|
| `utm_source` | **De dónde** viene la gente | `instagram`, `facebook`, `whatsapp`, `tiktok`, `mostrador`, `vasos`, `volante`, `influencer-ana` |
| `utm_medium` | **De qué tipo** es | `social` (publicación normal o bio), `ads` (anuncio pagado), `qr`, `impreso` |
| `utm_campaign` | **Qué campaña** o pieza | `lanzamiento`, `diciembre`, `reel-1`, `historias-sabado` |

**Reglas** (si no las cumples, el juego ignora la etiqueta y la persona sale como «entró directo»):
- Solo **letras minúsculas sin tildes**, **números**, guion `-`, guion bajo `_` y punto `.`. **Sin espacios, sin ñ, sin tildes.**
- `utm_source` y `utm_medium` hasta **30** caracteres; `utm_campaign` hasta **40**.
- Un canal nuevo **no necesita nada más**: aparece solo en el panel la primera vez que alguien juegue con ese enlace.
- Mantén **siempre el mismo nombre** para lo mismo (por ejemplo, siempre `instagram`, no a veces `insta`): así las cuentas no se parten en dos filas.

**Para probar un enlace nuevo** antes de publicarlo: ábrelo en el celular, empieza una partida, y mira que en el panel → Resumen → «¿De dónde vienen los jugadores?» aparezca la fila nueva.

**Si necesitas un QR para un canal nuevo** (un volante, un afiche…): pídeselo a Claude con el enlace; no hace falta que lo hagas tú.

---

## 5. Dónde se pega cada enlace (resumen)

| Red | Dónde | Enlace |
|---|---|---|
| Instagram | Biografía → «Editar perfil» → «Enlaces»; historias con la pegatina «Enlace» | `instagram` (sección 1) |
| Facebook | Página → «Editar información» → «Sitio web»; botón de la página; publicaciones | `facebook` (sección 1) |
| Anuncios de Instagram / Facebook | Administrador de anuncios → creativo del anuncio → «URL del sitio web» | `ads` (sección 2) |
| Mostrador y vasos | El QR impreso (no se escribe a mano) | `QR-para-imprimir/` |

**Ojo con lo que ve la gente al compartir el enlace:** WhatsApp, Instagram y Facebook muestran una tarjeta con el título «Corre por tu cholado · Cholados La India» y la imagen del Choladito y La India. Si alguna red te sigue mostrando la imagen vieja, es que guardó la anterior: en Facebook/Instagram se actualiza en <https://developers.facebook.com/tools/debug/> pegando el enlace y pulsando «Scrape Again».
