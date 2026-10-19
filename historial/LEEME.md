# historial/ — evidencias del proceso

Aquí se guardan los **hitos** del proyecto: copias congeladas de `web/` tal como estaban en momentos importantes (las primeras pruebas de estilo, el estilo elegido, el primer prototipo jugable, etc.). La idea es poder abrirlas más adelante, aunque el código haya cambiado mucho, y ver cómo empezó todo.

- **Cómo verlo:** corre `npm run dev` y abre <http://localhost:5173/historial/>.
- **Cómo guardar un hito nuevo:** `npm run hito -- "nombre-corto" "Título bonito" "Qué se ve" "ruta/de/entrada/"` (ver `tools/guardar-hito.mjs`). Luego deja capturas de pantalla en `NN-nombre/capturas/` y anótalas en `hitos.json`.
- **Cada hito es autónomo:** lleva su propia copia de Three.js y de los assets, así que sigue funcionando aunque el proyecto cambie.
- **No se publica:** vive fuera de `web/`, así que no sale en GitHub Pages (solo se ve en local o en el repo).
- **Peso:** cada hito pesa ~0,7–1 MB. No hace falta guardar uno por cada cambio, solo los que valga la pena recordar.

`hitos.json` es la lista que alimenta la página `index.html`.
