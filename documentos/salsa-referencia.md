# Salsa «de Cali»: qué se investigó y cómo se tradujo a código

Documento de apoyo para `web/js/audio.js`. El usuario pidió (segunda vuelta de la Fase B) que la música sonara a salsa de Cali y no «electrónica», y que se buscaran en internet descripciones detalladas para recrearla por código. Aquí queda lo que se encontró (en **dos rondas** de búsqueda), lo que es conocimiento general (sin fuente verificada) y cómo quedó implementado. **Honestidad:** la música se sintetiza con osciladores y ruido; por mucho que se afine, no va a sonar como una grabación, y **Claude no la puede oír** (solo mide niveles). Si aun así no suena a salsa, la alternativa realista es usar una pista grabada con licencia libre (ver §6 y `pendientes.md` #10).

## 1. Lo que dicen las fuentes (revisadas el 2026-10-20 y 2026-10-21)
| Dato | Fuente |
|---|---|
| **Tempo:** la salsa para bailar anda entre **160 y 220 BPM**. | [Wikipedia — Salsa music](https://en.wikipedia.org/wiki/Salsa_music) |
| **Clave de son 3-2/2-3:** cinco golpes en dos compases (3 en uno, 2 en el otro). En una rejilla de 16 pasos de corchea son los pasos 1, 4, 7, 11, 13 (`X..X..X...X.X..`); los golpes 2.º y 3.º de la parte de tres se llaman **bombo** y **ponche**. Casi todo se toca *con* la clave (congas, timbales, piano, bongós); el **bajo, las maracas, el güiro y el cencerro van independientes**. | [Wikipedia — Clave](https://en.wikipedia.org/wiki/Clave_(rhythm)), Wikipedia — Salsa music |
| **Cascarilla del timbal (3-2)** en corcheas «1 y 2 y 3 y 4 y»: compás 1 golpea 1, 4, 7; compás 2 golpea 2, 3, 5, 8. En las partes grandes (mambo, coro, montuno) el timbalero pasa de la cascarilla a la **campana**, más fuerte. | [Soundbrenner — cascara](https://www.soundbrenner.com/blogs/articles/cascara) |
| **Conga, «marcha» (tumbao):** en un ciclo de dos tiempos, en semicorcheas: talón – punta – **palmada** (en el «y») – punta – talón – punta – **abierta** (en el «y» del 2) – **abierta** (en el «a» del 2). El acento fundamental es el «y» del 2 (*ponche*). El tumbao básico suena en los tiempos 2, 3, 4 (no en el 1). | [Wikipedia — Tumbao](https://en.wikipedia.org/wiki/Tumbao), Wikipedia — Salsa music |
| **Bajo tumbao:** ostinato basado en el tresillo; el tiempo 1 va vacío o suave; suenan el **«y» del 2 (bombo)** y el **4 / «y» del 4 (ponche)**, y **la última nota se alarga y cruza el tiempo 1 del compás siguiente** (anticipa el acorde que viene). | Wikipedia — Tumbao, [Soundbrenner — tumbao](https://www.soundbrenner.com/blogs/articles/tumbao) |
| **Bongó:** repite el **martillo** y funciona como tambor guía; se oye sobre todo en los versos y en los solos de piano. En el montuno el bongocero pasa a tocar el **cencerro**, que acentúa los tiempos 1 y 3 (cuentas 1, 3, 5, 7 de 8) y se entrelaza con la campana del timbal. | Wikipedia — Salsa music |
| **Maracas y güiro:** subdivisiones constantes. | Wikipedia — Salsa music |
| **Piano (montuno / guajeo):** figura sincopada que se repite cada **8 cuentas (2 compases)** y marca el primer tiempo; dibuja el acorde y encaja con bajo y percusión. | Wikipedia — Salsa music, [Wikipedia — Montuno](https://en.wikipedia.org/wiki/Montuno) |
| **Estructura:** verso → **coro-pregón** (llamada y respuesta) → **montuno** hasta el final (a veces con el tempo subiendo). Las subsecciones del montuno se llaman *mambo*, *diablo*, *moña*, *especial*. En el montuno los metales tocan **riffs** («más rápido y más descarado», semi-improvisado). | Wikipedia — Salsa music, Wikipedia — Montuno |
| **Armonía:** I–IV–V–IV es muy común; la salsa moderna usa 9.ª, 11.ª, 13.ª. | Wikipedia — Salsa music |
| **Salsa dura / brava:** años 70, énfasis en lo instrumental (piano, bajo, **metales**, percusión) sobre la voz; el **trombón** es central; metales para puntuar y hacer riffs con deslizados y golpes secos. | [Wikipedia — Salsa dura](https://en.wikipedia.org/wiki/Salsa_dura) |
| **«Cali Pachanguero» (Grupo Niche, 1984):** la grabación empezó con una **base de timbales, congas y bongó**; después, de a uno: trompeta 1, trompeta 2, saxo alto y trombón (armonización de cuatro metales; la melodía es de trompeta). | [El Tiempo](https://www.eltiempo.com/bogota/trombonista-bogotano-revela-secretos-detras-de-la-pieza-musical-cali-pachanguero-3350824), [Wikipedia](https://en.wikipedia.org/wiki/Cali_Pachanguero) |
| **Salsa caleña (estilo):** las fuentes encontradas hablan sobre todo del **baile**: más rápido que otros estilos, con pies y caderas veloces y acrobacias; Cali se desarrolló de forma bastante independiente de Nueva York y LA. Hay un libro académico (Lise Waxer, *The City of Musical Memory: Salsa, Record Grooves and Popular Culture in Cali, Colombia*, 2002) pero **no se pudo leer**. | [Alcaldía de Cali](https://www.cali.gov.co/cultura/publicaciones/170336/la-salsa-calena-unica-en-el-mundo/), [Salsa Vida](https://www.salsavida.com/?p=24670) |
| **No se pudo leer** el estudio académico del sonido de Grupo Niche ([Revista Musical Chilena](https://ultimadecada.uchile.cl/index.php/RMCH/article/view/53301): pide verificación anti-robots). | — |

## 2. Lo que se sabe por conocimiento general (NO verificado con una fuente en esta búsqueda)
- La salsa **caleña / «salsa dura»** es **rápida y enérgica** y deja los **metales** (trompetas, trombones, saxo) muy al frente, con riffs cortos y punzantes y notas largas de remate.
- La sección rítmica es **densa y siempre en movimiento** (conga, bongó, timbal, campana, güiro) para bailar.
- Giros típicos **ii–V–I** y dominantes (por eso se eligió Re menor 7 → Sol 7 → Do mayor 7 → La 7).
- El timbre de Grupo Niche mezcla ese sonido de metales con ritmos del Pacífico (marimba, currulao). **No se imitó.**
- Al cerrar una frase el timbalero hace un **redoble («paila»)** y suele haber un platillazo en el tiempo 1 que sigue; el coro grita frases cortas («¡ay!») entre los metales.

## 3. Cómo quedó en el código (`web/js/audio.js`)
- **Tempo:** **168** negras por minuto (1 semicorchea ≈ 89 ms). Era 184; el usuario lo sintió muy rápido (tanda 3).
- **Forma:** 8 compases (128 semicorcheas). **Parte A** (1-4) y **Parte B** (5-8). Giro Re menor 7 → Sol 7 → Do mayor 7 → La 7, dos veces.
- **Dos intensidades:** `menu` (en el inicio y las pantallas: más baja, **sin metales, sin bongó, sin redobles**) y `juego` (completa). Cambian sin cortar la música.

| Instrumento | Qué hace (semicorchea dentro del compás, 0-15) | Cómo se sintetiza |
|---|---|---|
| Clave de son 3-2 | 0, 6, 12 y, en el segundo compás, 4 y 8 | dos senos agudos muy cortos |
| Cascarilla (parte A) | 0, 6, 12 / 2, 4, 8, 14 (compás par) | ruido pasa-banda a 4 kHz + seno corto |
| **Marcha de congas** | **siempre**, cada 8 semicorcheas: talón, punta, **palmada**, punta, talón, punta, **abierta**, **abierta** | seno que cae de tono (talón/abierta), ruido pasa-banda (palmada/punta) |
| Bongó, martillo (parte A, juego) | golpes alternados cada corchea (grave/agudo), más fuertes en 6 y 14 | senos cortos agudos + ruido |
| Campanas (parte B, juego) | **bongocero:** cada negra (más fuerte en 1 y 3, 560 Hz); **timbal:** sobre la cascarilla (790 Hz) | dos cuadradas desafinadas + chasquido |
| Güiro | cada corchea (más fuerte en 0 y 8) | ruido pasa-altos |
| **Bajo tumbao** | nada en 0; **6** = raíz del acorde actual; **12** = raíz del acorde **siguiente**, larga (0,5 s), cruza el compás | sierra con filtro que se cierra + seno |
| **Guajeo de piano** | 2 compases (5 y 6 golpes sincopados); cada golpe en octavas | armónicos 1-5 que se apagan a distinta velocidad + golpe de martillo |
| Metales (parte B, juego) | riffs de mambo de 4 compases (golpes cortos y notas largas); trompetas arriba, trombón abajo | tres sierras desafinadas por nota con filtro que se abre al atacar |
| Platillazo / paila | platillo en el 1 del compás 1 y 5; redoble de timbal en el último tiempo de los compases 4 y 8 (juego) | ruido pasa-altos / golpes de timbal |
| Sala | reverberación corta inventada | `ConvolverNode` con ruido que se apaga |

## 4. Mediciones (sin escuchar)
Con `audio._renderizar()` (dibuja la canción sin altavoz) se midió: modo `menu` ≈ −24,5 dBFS RMS; modo `juego` ≈ −20 dBFS RMS (pico 0,82); sin valores no numéricos. (Las mediciones con `audio._renderizar` también sirvieron para ajustar los aplausos de antes, que se quitaron: ver la sección 5.)

## 5. Efectos de ambiente de cancha — QUITADOS (2026-10-20)
Se habían hecho `aplausos()` (palmadas desordenadas), `hinchada()` (rugido de tribuna + coro de «aaah») y un coro de «¡ay!» en la música. **Se eliminaron del código**: en el celular de gama baja sonaban como **estática o distorsión** y los del iPhone nunca convencieron (el ruido sintetizado no se parece a una multitud). Quedó solo un **timbre corto de logro** (`audio.logro`: 2-3 notas que suben) al llegar a las frutas mínimas y a la mitad del camino, y el arpegio con campana de la meta. Si se quieren aplausos o gente alentando, la salida es un **archivo grabado libre de derechos** (sección 6; hay que pedirle permiso al usuario antes de descargarlo).

## 6. Si la síntesis no convence: música grabada
Opción más segura para que suene a salsa de verdad: una **pista grabada con licencia que permita uso comercial** (por ejemplo licencias Creative Commons que lo permitan o bibliotecas de música libre de regalías). Habría que: (1) buscarla y **leer su licencia**, (2) **pedirle permiso al usuario para descargarla** (diciendo nombre, fuente y tamaño), (3) añadir el archivo (≈ 1 MB en MP3) y un reproductor con el mismo botón de sonido. Costo: un archivo más que descargar y la obligación de citar al autor si la licencia lo pide. **No se ha hecho.** El usuario dijo (2026-10-20) que la música «no suena a salsa, pero está bien por ahora» y que se mejora **después de publicar**; esta sección es el plan.
