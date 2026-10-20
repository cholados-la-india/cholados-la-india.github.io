# pendientes.md — Cosas por resolver

Lo que NO está decidido o falta. Mientras tanto se usan placeholders visibles en el código y los textos. Actualizar al resolver cada punto.
Última actualización: 2026-10-19.

| # | Pendiente | Placeholder actual | Se necesita en | Estado |
|---|---|---|---|---|
| 1 | **Dirección y horario de caja del local** (el usuario no los tiene a mano) | `[DIRECCIÓN DEL LOCAL]`, `[HORARIO DE CAJA]` | Etapa 3 (pantalla de premio) | ⏳ |
| 2 | **Datos personales (Ley 1581)**: responsable (nombre o razón social, cédula/NIT), correo o teléfono de contacto, plazo de conservación, política breve | `[RESPONSABLE DE DATOS]`, `[CORREO DE CONTACTO]` | Etapa 3 (texto) / 7 (publicar) | ⏳ ver análisis abajo |
| 3 | **Nombre del juego** (Atrapa tu cholado / Corre por tu cholado / Cholado Run) | `Cholado Runner` | Etapa 2–3 | ⏳ |
| 4 | **Personaje**: ✅ DECIDIDO (2026-10-19): el cliente elige entre Choladito y La India con un selector permanente en el inicio | selector en la pantalla de inicio | Etapa 3 | ✅ |
| 5 | **Calibrar dificultad** (vidas, velocidad, ~35 % de victoria) | 3 vidas provisional | tras Etapa 3 | ⏳ |
| 6 | **Cupo diario** del banco y tráfico esperado (desconocido) | desactivado | Etapa 4 | ⏳ |
| 7 | **Dispositivo del staff** para canjear y quién usa el PIN | PIN compartido | Etapa 5 | ⏳ |
| 8 | **Música y sonidos** (salsa caleña/fresco) con licencia libre. El Prompt 3 no lo pedía: ¿se hace ahora, como mini-etapa, o más adelante? | sin audio | Etapa 3.6 | ⏳ decidir |
| 9 | **Android de gama baja** para probar (hoy solo iPhone XR) | emulación en DevTools | Etapa 6 | ⏳ |
| 10 | **Fecha de lanzamiento** y fechas de la primera campaña | `[FECHA INICIO]`, `[FECHA FIN]` | Etapa 4 | ⏳ |
| 11 | **Términos y condiciones** (vigencia, límite semanal, compra mínima, un regalo por código) | texto provisional | Etapa 7 | ⏳ |
| 12 | Confirmar regla de vencimiento (`expedición + 7 días − 1 min`) | propuesta | Etapa 4 | ⏳ |
| 13 | Dominio propio (opcional, depende de cómo vaya) | URL de GitHub Pages | futuro | ⏳ |
| 14 | Verificar límites vigentes del plan gratis de Supabase y su pausa por inactividad | — | Etapa 4 | ⏳ |
| 15 | Instalar Node.js LTS | — | Etapa 2 (bloqueante) | ✅ instalado (v24.20.0) y política de scripts de PowerShell resuelta |
| 16 | **Medir FPS reales en el iPhone XR** con el botón "Datos" de cada preview (el navegador de la app recorta los cuadros y no sirve para medir FPS) | — | Etapa 2 | ✅ ronda 1: ~60 FPS en A, B y C (mínimo 57). Falta repetirlo con el estilo G ya dentro del juego (Etapa 3.7) |
| 17 | **Mejoras gráficas del estilo G** (no urgentes): el escenario/suelo necesita más detalle; en el cholado las frutas parecen "afuera" del vaso y no adentro; la bola de helado se ve "pintada hasta la mitad" (borde recto de la leche condensada). Más elementos de escenario a medida que avance el juego | — | cuando haya tiempo, después de Etapa 3 | ⏳ |
| 18 | Revisar la saturación/contraste de G ya con el juego completo en el celular (el usuario quiere valorar si D + F juntos quedan muy saturados) | `color.setScalar(1.15)` en `materiales.js` | Etapa 3.7 | ⏳ |
| 19 | **Probar el juego en el iPhone XR** (FPS reales, deslizar, tocar, formulario con teclado) y en el navegador interno de Instagram | — | Etapa 3.7 / 6 | ⏳ del usuario |
| 20 | **Calibrar la dificultad con gente real** (estadísticas de `?debug=1`; ver `documentos/calibrar-dificultad.md`). El bot dice Normal ~19 %; falta contrastarlo con personas | valores de `config.js` | Etapa 3.7 | ⏳ |
| 21 | Detalles visuales del juego: el cartel ¡META! se lee poco a distancia; el escenario es repetitivo (más elementos); animación de choque/caída simple; en el iPhone en modo de bajo consumo (30 fps) la imagen no mejora aunque baje la calidad | — | después de Etapa 3 | ⏳ |
| 22 | ~~Decidir si el selector de personaje se queda~~ → se queda (ver #4). "Girar" no está en el juego. | — | — | ✅ |
| 23 | **Calibrar el mínimo de frutas** (hoy 25 de ~70) y la velocidad con gente real; el bot es pesimista (persigue frutas y choca más). Si casi nadie gana: bajar `partida.frutasMinimas` o `velocidad.final` | `config.js` | Etapa 3 / 6 | ⏳ |
| 24 | **Confirmar los días de espera por número**: el usuario habló de "2 o 3 días"; se dejó 7 (la regla original) en `reglas.diasEntreCodigosPorCelular`. En la Etapa 4 el servidor real lo aplica | 7 días | Etapa 4 | ⏳ confirmar |
| 25 | **Detalles estéticos** (pospuestos a propósito hasta terminar todas las etapas): cholado con frutas "adentro" del vaso, bola de helado mejor pintada, más detalle en La India y el escenario, posible cambio de colores | — | después de la Etapa 7 | ⏳ |

## Análisis: ¿aplica la Ley 1581 de 2012? (2026-10-19)
Conclusión: **sí aplica, pero la carga es liviana.** No soy abogado; conviene confirmarlo con el contador o un abogado antes de lanzar.
- Nombre + celular son **dato personal** (información asociada a una persona natural determinable). "No sensible" solo significa que no hay exigencias reforzadas; la ley aplica igual. La excepción de uso exclusivamente personal o doméstico no cubre un negocio.
- Aunque "no lo usemos para nada", **sí lo guardamos** (en Supabase), porque hace falta para el límite de 1 código por 7 días y para el canje. Guardar o consultar ya es "tratamiento".
- **Registro ante la SIC (RNBD): probablemente NO obligatorio.** Solo obliga a sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT (Decreto 090 de 2018, que excluye a micro y pequeñas empresas y a personas naturales). Quedar fuera de ese registro no exime de cumplir la ley.
- **Lo mínimo razonable:** (1) casilla de consentimiento sin premarcar (ya prevista); (2) texto corto con la finalidad (entregar y controlar el código, contactar por el premio); (3) quién es el responsable y cómo pedir consultar, corregir o borrar datos; (4) mencionar que se guardan en un proveedor en la nube fuera de Colombia; (5) política corta de tratamiento accesible desde el juego; (6) plazo de conservación (ej. borrar o anonimizar al cerrar la campaña).
- Decisión del usuario: dejarlo pendiente. Se mantiene la casilla y el texto breve desde el prototipo para no rehacerlo después.

Fuentes consultadas: [Decreto 090 de 2018 (RNBD)](https://www.dmsjuridica.com/buscador_20179478954/legislacion/decretos/2023/08/18/decreto-90-de-2018/?pdf=51525), [Decreto 1377 de 2013](https://www.cchuila.org/wp-content/uploads/Decreto_1377_de_2013.pdf), [Ley 1581 de 2012](https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/ley/Ley_1581_2012.pdf).
