# cholado-runner

Minijuego web de **Cholados La India** (Cali, Colombia): un runner vertical para celular; si llegas a la meta ganas un código para reclamar un regalo en el local.

## Documentación

| Archivo | Qué contiene |
|---|---|
| [guia-rapida.md](guia-rapida.md) | **La guía del dueño:** todos los comandos, el SQL para pegar en Supabase, el panel, la caja y qué hacer si algo falla |
| [CLAUDE.md](CLAUDE.md) | Reglas, decisiones vigentes, arquitectura y cómo probar (fuente de verdad) |
| [PLAN.md](PLAN.md) | Estado de las 7 etapas |
| [pendientes.md](pendientes.md) | Lo que falta decidir o hacer |
| [supabase/LEEME.md](supabase/LEEME.md) | El servidor (Supabase): cómo funciona, cómo cambiar reglas y dificultad |
| [documentos/bitacora.md](documentos/bitacora.md) | Registro detallado de todo lo hablado, decidido y descubierto |
| [documentos/fase-a-paquete.md](documentos/fase-a-paquete.md) | Paquete de la Fase A: qué ejecutar y qué probar para cazar bugs |
| [documentos/reporte-etapa6.md](documentos/reporte-etapa6.md) | Reporte de pruebas y endurecimiento (Etapa 6) |
| [documentos/pruebas-en-celulares.md](documentos/pruebas-en-celulares.md) | Cómo probar en celulares reales (Instagram, Facebook, Safari, Chrome, gama baja) |
| [documentos/calibrar-dificultad.md](documentos/calibrar-dificultad.md) | Cómo medir y ajustar la dificultad |
| [historial/](historial/LEEME.md) | Evidencias del proceso (hitos jugables congelados) |

## Cómo verlo en tu computador

1. Instala Node.js LTS (una sola vez).
2. En la carpeta del proyecto: `npm run dev`
3. Abre <http://localhost:5173/> (el juego, hablando con el servidor real) o <http://localhost:5173/?debug=1> (con panel de calibración). Con `&api=falsa` usa una simulación local (no gasta intentos ni premios reales).
4. Para probarlo en el celular: misma red wifi y la dirección `http://192.168.x.x:5173/` que aparece en la terminal.
5. **Probar un celular:** <http://localhost:5173/diagnostico/> (¡ábrelo dentro de Instagram o Facebook!). Guía completa: [documentos/pruebas-en-celulares.md](documentos/pruebas-en-celulares.md).
6. **La caja** (para quien atiende): <http://localhost:5173/canje/> · **el panel del dueño**: <http://localhost:5173/admin/>. Con `?api=falsa` se ven con datos de mentira (caja: PIN `1234`; panel: cualquier correo y la clave `demo`). Para usarlos de verdad hay que preparar el servidor una vez: ver [supabase/LEEME.md](supabase/LEEME.md), sección «Etapa 5».

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor local para ver el juego |
| `npm run vendor` | Regenera Three.js recortado (hacer si el código usa una clase nueva de Three.js) |
| `npm run simular` | Un bot juega miles de partidas y dice qué tan difícil está la config |
| `npm run probar-sql` | Prueba todo el SQL del servidor en tu computador (sin Supabase) |
| `npm run sql` | Genera `supabase/todo-junto.sql`: todo el SQL del servidor en un archivo, para pegarlo de una vez en Supabase |
| `npm run probar-ataques` | Te portas como atacante contra el servidor real (rápido; con `-- --completo`, ~1 min) |
| `npm run probar-canje` | 25 cajeros simultáneos intentan canjear el mismo código (te pide el PIN en tu terminal) |
| `npm run revisar-secretos` | Busca secretos, claves y PIN en el repo y en su historial de git |
| `npm run probar-mutaciones` | Rompe el SQL a propósito y comprueba que `probar-sql` lo detecta |
| `npm run probar-seguridad` | Comprueba en 3 s, contra el servidor real, que lo del administrador está cerrado para el público (no deja datos) |
| `npm run probar-supabase` | Prueba el servidor REAL (seguridad y concurrencia). Deja datos de prueba: luego `supabase/sql/limpiar_pruebas.sql` |
| `npm run hito -- "nombre" "Título" "Descripción" "ruta/"` | Guarda una copia congelada del proyecto en `historial/` |

El historial del proceso (cómo empezó todo) se ve en <http://localhost:5173/historial/>.
