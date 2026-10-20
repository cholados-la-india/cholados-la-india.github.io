# QR y enlaces por canal

> Generado con `npm run qr` (no lo edites a mano: se vuelve a escribir). Dirección base: **https://cholados-la-india.github.io/** · campaña: **lanzamiento**.

**No imprimas ni publiques nada hasta que https://cholados-la-india.github.io/ abra y se pueda jugar** (pruébalo en tu celular, por el QR y por el enlace de Instagram).

## Los 4 enlaces

| Canal | Enlace (con etiquetas) | Para qué |
|---|---|---|
| **mostrador** | `https://cholados-la-india.github.io/?utm_source=mostrador&utm_medium=qr&utm_campaign=lanzamiento` | El QR que va en el mostrador del local. |
| **vasos** | `https://cholados-la-india.github.io/?utm_source=vasos&utm_medium=qr&utm_campaign=lanzamiento` | El QR que va pegado en los vasos (stickers o impreso en el vaso). |
| **instagram** | `https://cholados-la-india.github.io/?utm_source=instagram&utm_medium=social&utm_campaign=lanzamiento` | El enlace para la biografía (bio) de @cholados.laindia y para las historias y publicaciones de Instagram. |
| **facebook** | `https://cholados-la-india.github.io/?utm_source=facebook&utm_medium=social&utm_campaign=lanzamiento` | El enlace para la página «Cholados La India» de Facebook (botón, publicaciones y anuncios). |

Las etiquetas (`utm_source`, `utm_medium`, `utm_campaign`) las lee el juego al abrirse, las recuerda 30 días y se las manda al servidor cuando alguien **empieza** una partida. En el panel de administrador: **Resumen → «¿De dónde vienen los jugadores?»** (por semana, 30 días o todo). Entran los canales que aparezcan en los enlaces; si un día repartes algo nuevo (por ejemplo un volante), agrégalo en `tools/generar-qr.mjs` (lista `CANALES`) y corre `npm run qr`.

## Los QR

- `qr-mostrador.svg` y `qr-vasos.svg` son **vectoriales**: mándale esos al impresor (se ven nítidos a cualquier tamaño). Los `.png` (2400 px) son para pantallas o por si el impresor no acepta SVG.
- Son negros sobre blanco a propósito (es lo que mejor escanea; con colores de marca a veces fallan en celulares viejos). Déjales el **borde blanco** alrededor.
- Mínimo en vasos: **3 cm**. En el mostrador: **8 a 12 cm**, a la altura de los ojos o de la mano, con una frase corta al lado.
- **Antes de imprimir 500 stickers**: haz **doble clic** en el archivo `imprimir.html` (está en esta misma carpeta) (se abre en el navegador; no hace falta `npm run dev`), imprímela al 100 % y escanéala con 2 celulares distintos (uno viejo) y con la cámara de Instagram.
- El QR **no cambia aunque cambies el juego**: lleva la dirección, no el juego. Por eso la dirección no debe cambiar una vez impresos (ver `pendientes.md` #14).

## Instagram y Facebook

- **Instagram:** pon el enlace de `instagram` en la biografía (el único enlace clicable que deja). En las historias puedes usar la pegatina «Enlace» con el mismo.
- **Facebook:** botón de la página («Más información» o «Jugar») y publicaciones con el enlace de `facebook`. Si pagas anuncios, pega ese mismo enlace como destino.
- Los dos abren el juego dentro del navegador de la app; las etiquetas viajan igual.
