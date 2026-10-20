# Lista de chequeo de lanzamiento (en orden)

Sigue los pasos **en este orden** y marca cada casilla. No saltes la **limpieza (paso 15)** ni la **prueba del QR (paso 17)**. Cada paso dice **dónde** se hace. Si un paso falla, no sigas: mira `03-guia-del-administrador.md` o pregúntale a Claude (con la plantilla del final de esa guía).

Última actualización: 2026-10-20, noche (Etapa 7).

## A. Antes de publicar (en tu computador)

- [ ] **1. Guardar todo en GitHub.** GitHub Desktop → escribe la frase de commit que te dio Claude → **Commit to main** → **Push origin**. *(Si ya publicaste, esto vuelve a publicar solo.)*
- [ ] **2. Revisar los textos con quien deba aprobarlos.** Abre `06-textos-legales.md` y léelo con tu mamá: condiciones, autorización de datos y política (6 meses, correo para borrar). Si cambian algo, dile a Claude qué frase y se vuelve a generar (`npm run textos-legales`).
- [ ] **3. Decidir el cupo diario** (con tu mamá). Con 50 premios por semana, 8 por día es un buen comienzo; apagado = solo manda el tope de la semana. Se pone en el panel → Configuración → «Cupo diario (opcional)».
- [ ] **4. Decidir las fechas de la campaña** (o dejarlas vacías = siempre abierta). Panel → Configuración → «Campaña (temporada)».
- [ ] **5. Confirmar los datos del local** que salen en el juego: dirección «Cholados La India, Canchas Panamericanas», canje **todos los días de 2:00 p. m. a 9:00 p. m.** ✅ (ya confirmado). *(Opcional: agregar una referencia más, como el barrio o la calle, si un cliente nuevo no encontraría el local; se cambia en `web/js/textos.js`, `LOCAL`.)*
- [ ] **6. Correr las comprobaciones** (terminal en la carpeta del proyecto): `npm run probar-sql` (debe decir ✅ TODO BIEN), `npm run probar-canal` (✅) y `npm run revisar-secretos` (✅).

## B. El servidor (Supabase)

- [ ] **7. Pegar el SQL al día.** Terminal: `npm run sql`. Abre `supabase/todo-junto.sql`, copia todo (`Ctrl + A`, `Ctrl + C`), Supabase → SQL Editor → «+» → Create a new snippet → pegar → **Run**. Abajo debe decir **«✅ Todo en orden»**. *(Esto agrega lo de «¿De dónde vienen los jugadores?». Es seguro repetirlo; no borra datos.)*
- [ ] **8. Comprobar la seguridad del servidor real.** Terminal: `npm run probar-seguridad` (≈ 3 s). Debe terminar en ✅ y decir que están las **12 funciones de administrador** cerradas al público.
- [ ] **9. PIN definitivo.** Panel de administrador (`http://localhost:5173/admin/` o ya la dirección real) → **Cuenta** → PIN de 6 números (no `1234`) → díselo **solo** a quien atiende. Anótalo en un lugar privado (no en el chat ni en el repo).
- [ ] **10. Registro público de usuarios apagado:** Supabase → Authentication → Sign In / Providers → «Allow new users to sign up» **apagado** (el comando del paso 8 lo comprueba).

## C. Publicar

- [ ] **11. Encender GitHub Pages** (una sola vez): sigue `05-publicacion.md` §A (Settings → Pages → Source = **GitHub Actions** → Actions → «Publicar el juego» → Run workflow). Espera el ✓ verde.
- [ ] **12. Abrir `https://cholados-la-india.github.io/`** en el celular y ver que carga y se puede jugar.
- [ ] **13. Probar el aviso diario:** Actions → «Mantener Supabase despierto» → Run workflow → ✓ verde (`05-publicacion.md` §B).

## D. Pruebas con el juego ya publicado (con datos móviles, no con el wifi de la casa)

- [ ] **14. Prueba completa de cliente:** jugar hasta ganar → llenar nombre y celular → sacar el código → canjearlo en `…/canje/` con el PIN → ver el canje en el panel. Probar también: perder una partida, quedarte sin intentos, recargar la página justo después de ganar («¡Tu premio te espera!»), y **abrir con el teclado** para escribir el nombre (que no salga «Gira tu celular»). **Con un iPhone y un Android** (`documentos/pruebas-en-celulares.md`).
- [ ] **14b. Por canal:** abre en el celular el enlace de `instagram` y el de `facebook` (de `QR-para-imprimir/LEEME.md`) **desde la app de Instagram y de Facebook** (mándatelos por mensaje directo y tócalos). Juega una partida con cada uno y ve al panel → Resumen → «¿De dónde vienen los jugadores?»: deben aparecer **una partida en instagram y una en facebook**.
- [ ] **14c. Vista previa del enlace:** pega la dirección en un chat de WhatsApp o Instagram: debe verse el título y la imagen (puede tardar y quedar en caché).
- [ ] **14d. Sonido** (iPhone y Android): el botón de sonido del inicio funciona (el interruptor de silencio del iPhone lo calla).

## E. Limpieza (la última antes de abrir)

- [ ] **15. Borrar TODOS los datos de prueba:** `04-guia-rapida.md` **5.1** (`truncate app.codigos, app.partidas, app.limites_red restart identity cascade;`). **Solo antes de abrir al público**; con clientes reales se borraría lo suyo. Si alguna regla quedó movida por las pruebas: 5.2.
- [ ] **16. Comprobar que quedó en cero:** panel → Resumen: 0 partidas, 0 códigos y los premios de la semana completos. (O el SQL de `03-guia-del-administrador.md` §1.2, punto 7.)

## F. Imprimir

- [ ] **17. Probar los QR antes de imprimir:** `npm run qr` (los deja en `QR-para-imprimir/`), haz doble clic en el archivo `QR-para-imprimir/imprimir.html` (se abre en el navegador), imprímela **al 100 %** y escanéala con **2 celulares distintos** (uno viejo) y con la cámara de Instagram. Debe abrir el juego (la barra de direcciones queda sin las etiquetas, es normal).
- [ ] **18. Mandar a imprimir** `QR-para-imprimir/qr-mostrador.svg` y `QR-para-imprimir/qr-vasos.svg` (vectoriales). En vasos, mínimo **3 cm**, negro sobre blanco, con borde blanco. Pide **una prueba** antes de imprimir cientos.
- [ ] **19. Capacitar a quien atiende** (5 minutos): abrir `…/canje/`, escribir PIN y código, mirar el color (verde = válido), **verificar la compra mínima de $30.000**, elegir el regalo y «Marcar como canjeado». Qué hacer si dice «YA FUE CANJEADO», «VENCIDO» o si se bloquea el PIN (`04-guia-rapida.md` §7). Dónde está el celular o computador de la caja.

## G. Abrir

- [ ] **20. Poner el enlace de Instagram en la biografía** (el de `instagram`) y el de Facebook en la página; publicar el anuncio. **No** publicar antes de los pasos 14 a 17.
- [ ] **21. Pegar los QR** en el mostrador y los vasos.
- [ ] **22. Primer día:** a media tarde y al cierre mira el panel → Resumen (partidas, códigos, canjes) y «¿De dónde vienen los jugadores?».

## H. La primera semana

- [ ] **23. Primer lunes (renovación de la semana):** a las 00:00 de Bogotá los premios vuelven a 50 y los intentos se renuevan. Mira el Resumen el lunes en la mañana: debe decir «Quedan 50 premios esta semana» (o los que hayas puesto). **Es la prueba final del reloj del servidor** y no se puede simular antes.
- [ ] **24. Ver que el aviso diario corre:** Actions → «Mantener Supabase despierto» con una fila verde por día.
- [ ] **25. Respaldo semanal:** panel → Cuenta → «Descargar todos los códigos» (guárdalo en un lugar privado).
- [ ] **26. Calibrar la dificultad con gente real** (`documentos/calibrar-dificultad.md`): si casi nadie gana, bajar «frutas mínimas»; si todos ganan, subirlas. Revisar los límites por red con el uso real (Configuración → Seguridad).

## I. Para no olvidar

- [ ] **27. Alarma en el calendario:** 6 meses después de que termine la campaña, **borrar los datos personales** (`02-operacion-corta.md` §5).
- [ ] **28. Cuando pase 1 mes sin cambios:** mira que las tareas programadas de Actions sigan activas (GitHub las apaga si pasan 60 días sin ninguna actividad).
- [ ] **29. Después de publicar** (no urgente, ya anotado en `pendientes.md`): mejorar la música, agregar aplausos reales, más variedad.

**Lo que NO debes hacer:** renombrar la organización `cholados-la-india` ni el repositorio después de imprimir los QR · pegar el PIN, tu contraseña o claves de Supabase en el chat o en archivos del proyecto · correr la limpieza total (5.1) con clientes reales ya jugando · correr `npm run probar-supabase` o `probar-canje` después de abrir (gastan premios reales; si lo haces, limpia o usa solo el modo rápido).
