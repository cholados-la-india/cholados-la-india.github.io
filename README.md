# cholado-runner

Minijuego web de **Cholados La India** (Cali, Colombia): un runner vertical para celular; si llegas a la meta ganas un código para reclamar un regalo en el local.

## Documentación

| Archivo | Qué contiene |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Reglas, decisiones vigentes, arquitectura y cómo probar (fuente de verdad) |
| [PLAN.md](PLAN.md) | Estado de las 7 etapas |
| [pendientes.md](pendientes.md) | Lo que falta decidir o hacer |
| [documentos/bitacora.md](documentos/bitacora.md) | Registro detallado de todo lo hablado, decidido y descubierto |
| [documentos/calibrar-dificultad.md](documentos/calibrar-dificultad.md) | Cómo medir y ajustar la dificultad |
| [historial/](historial/LEEME.md) | Evidencias del proceso (hitos jugables congelados) |

## Cómo verlo en tu computador

1. Instala Node.js LTS (una sola vez).
2. En la carpeta del proyecto: `npm run dev`
3. Abre <http://localhost:5173/> (el juego) o <http://localhost:5173/?debug=1> (con panel de calibración).
4. Para probarlo en el celular: misma red wifi y la dirección `http://192.168.x.x:5173/` que aparece en la terminal.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor local para ver el juego |
| `npm run vendor` | Regenera Three.js recortado (hacer si el código usa una clase nueva de Three.js) |
| `npm run simular` | Un bot juega miles de partidas y dice qué tan difícil está la config |
| `npm run hito -- "nombre" "Título" "Descripción" "ruta/"` | Guarda una copia congelada del proyecto en `historial/` |

El historial del proceso (cómo empezó todo) se ve en <http://localhost:5173/historial/>.
