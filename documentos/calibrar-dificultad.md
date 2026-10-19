# Cómo calibrar la dificultad

Meta inicial: que **más o menos 1 de cada 4 o 5 intentos gane** (20–25 %). Con 3 intentos por semana, eso significa que cerca de la mitad de las personas se lleva premio en la semana si insiste.

Toda la dificultad vive en `web/js/config.js` (secciones `partida`, `velocidad`, `salto`, `obstaculos`, `frutas`, `jugador`).

## Los tres mandos principales

| Quiero... | Muevo... |
|---|---|
| Que sea **más fácil** | Subir `obstaculos.separacionInicialS` y `separacionFinalS` (más tiempo entre obstáculos), bajar `velocidad.inicial` / `final`, subir `partida.toleranciaColision` o `partida.vidas`, subir el peso de `cajaBaja` (se saltan) y bajar el de `doble` |
| Que sea **más difícil** | Lo contrario. Lo que más pesa es la **velocidad final** y la **separación final** (el último tramo) |
| Cambiar la sensación de salto | `salto.alto`, `salto.duracionS` |

## Opción A: medir con el simulador (rápido, aproximado)

Un bot juega miles de partidas en segundos. Sirve para **comparar** configuraciones, no como verdad absoluta.

- En el juego: abre `http://localhost:5173/?debug=1` → botón **Debug** → **Simular 1.000 partidas × 3 perfiles**.
- Desde la terminal: `npm run simular` (también acepta cambios: `npm run simular -- 2000 velocidad.final=14`).

Los perfiles: **Novato**, **Normal** y **Experto**. Una guía para leerlos: el perfil *Normal* debería ganar entre 15 % y 30 %, el *Novato* poquito (menos de 10 %) y el *Experto* mucho (más de 85 %).

Valores iniciales (los que están en `config.js`): Novato ~2 %, Normal ~19 %, Experto ~92 %.

## Opción B: medir jugando (lo que de verdad cuenta)

1. Abre `?debug=1` en tu celular (misma red wifi que el PC; la dirección aparece al correr `npm run dev`).
2. Juega, o pasa el celular a amigos y familia. El panel **Debug → "Tus partidas"** cuenta partidas y victorias **con la configuración actual** y calcula "1 de cada N".
3. Con 30 o más partidas de personas distintas ya se ve una tendencia; con 100 es bastante fiable.
4. Mira también: *"Al perder llegas en promedio al X %"*. Si casi todos pierden al 15 %, el arranque es muy duro; si pierden al 90 %, el final es muy duro.
5. Ajusta con los deslizadores (se aplican **en vivo**, sin recargar). Cuando te guste, pulsa **Copiar config** y pega los valores en `web/js/config.js`.

## Qué mirar al juzgar

- Pocos intentos ganados seguidos al inicio es normal: la gente aprende los controles en la primera partida.
- Ni regalada ni imposible: si toda la familia gana a la primera, subirle; si nadie llega a la meta en 10 intentos, bajarle.
- Después del lanzamiento, el panel de administrador (Etapa 5) mostrará partidas, ganadores y canjes reales para reajustar.
