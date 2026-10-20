# Cómo calibrar la dificultad

Meta inicial: que **más o menos 1 de cada 4 o 5 intentos gane** (20–25 %). Con 3 intentos por semana, eso significa que cerca de la mitad de las personas se lleva premio en la semana si insiste.

Toda la dificultad vive en `web/js/config.js` (secciones `partida`, `velocidad`, `salto`, `obstaculos`, `frutas`, `jugador`).

## Los tres mandos principales

| Quiero... | Muevo... |
|---|---|
| Que sea **más fácil** | Subir `obstaculos.separacionInicialS` y `separacionFinalS` (más tiempo entre obstáculos), bajar `velocidad.inicial` / `final`, subir `partida.toleranciaColision` o `partida.vidas`, subir el peso de `cajaBaja` (se saltan) y bajar el de `doble` |
| Que sea **más difícil** | Lo contrario. Lo que más pesa es la **velocidad final** y la **separación final** (el último tramo) |
| Que las frutas pesen más o menos | `partida.frutasMinimas` (cuántas hay que recoger) y `frutas.cadaS` (cada cuántos segundos sale una hilera; menos segundos = más frutas) |
| Cambiar la sensación de salto | `salto.alto`, `salto.duracionS` |

## Opción A: medir con el simulador (rápido, aproximado)

Un bot juega miles de partidas en segundos. Sirve para **comparar** configuraciones, no como verdad absoluta.

- En el juego: abre `http://localhost:5173/?debug=1` → botón **Debug** → **Simular 1.000 partidas × 3 perfiles**.
- Desde la terminal: `npm run simular` (también acepta cambios: `npm run simular -- 2000 velocidad.final=14`).

Los perfiles: **Novato**, **Normal** y **Experto** (los tres también persiguen frutas, cada uno con distinta ambición). Una guía para leerlos: el *Novato* casi nunca gana, el *Normal* gana poquito y el *Experto* gana cerca de la mitad. Si tú, jugando, ganas bastante más que el Experto, el juego está fácil para ti; lo importante es cómo les va a las demás personas.

### Referencias (simulador, 2.000 partidas por perfil)

Desde el 2026-10-19 para ganar hay que **llegar a la meta Y recoger un mínimo de frutas** (`partida.frutasMinimas`). Salen unas 70 frutas por partida; quien las ignora recoge ~24 de casualidad (por eso un mínimo bajo, como 15, no obligaba a nada) y quien las busca ~32. Tres puntos de referencia:

| Ajuste | Velocidad | Frutas mín. | Novato | Normal | Experto |
|---|---|---|---|---|---|
| **Suave** | 9 → 13,5 | 18 | 1,7 % | 12,6 % | 58,9 % |
| **Actual** (`config.js`) | 9,5 → 14,5 | 25 | 0,5 % | 6,2 % | 46,1 % |
| **Difícil** | 10 → 15,5 | 32 | 0,7 % | 4,2 % | 26,0 % |

(Antes de pedir frutas mínimas y subir la velocidad, el juego daba Novato ~2 %, Normal ~19 %, Experto ~92 %.)

⚠️ El bot, ahora que persigue frutas, **choca más de lo que chocaría una persona atenta**: sus números son una guía pesimista. Úsalos para comparar ajustes entre sí, no para predecir el porcentaje real. Si al probar con familia y amigos casi nadie gana, baja `partida.frutasMinimas` y/o `velocidad.final`; si casi todos ganan, súbelos.

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
