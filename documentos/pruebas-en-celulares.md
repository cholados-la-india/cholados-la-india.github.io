# Pruebas en celulares reales (Etapa 6)

Lo que **solo se puede probar con un celular de verdad**: el navegador interno de Instagram y de Facebook (iPhone y Android), Safari y Chrome móvil, y un Android de gama baja. Desde el computador (y desde Claude) se probó todo lo demás; esto es lo que falta, con el paso a paso.

> **Idea:** no hace falta probar todo de una vez. Haz primero el **«Plan mínimo»** (≈ 15 min con tu iPhone). Lo demás, cuando tengas otro celular a mano.

---

## 0. Preparación (una sola vez)

1. En el computador, en la carpeta del proyecto: `npm run dev`. Anota la dirección que dice **«En tu celular: http://192.168.x.x:5173/»** (la que tiene números, no `localhost`).
2. El celular y el computador deben estar en **la misma wifi**.
3. Si el celular no abre la dirección: Windows pregunta si permite a *Node.js* usar la red → **Permitir** (red privada). Si no preguntó, en «Seguridad de Windows → Firewall → Permitir una aplicación» marca *Node.js JavaScript Runtime*. También puede ser una wifi de invitados o «aislamiento de clientes» en el router.
4. **Para probar dentro de Instagram o Facebook**, mándate la dirección por mensaje directo (a otra cuenta tuya, a tu mamá o a un amigo) y tócala **desde la app**: así se abre en el navegador interno, igual que lo hará la gente que llegue por el QR o por un anuncio.
   - Si la app **se niega a abrir** un enlace `http://` de la wifi (puede pasar), avísame: armamos un enlace `https` temporal y gratuito para probar. Igual, **la prueba definitiva** será con el enlace real `https://` cuando publiquemos (Etapa 7).

Las páginas que vas a usar (cambia `192.168.x.x` por tu dirección):

| Qué | Dirección |
|---|---|
| **Diagnóstico** del celular (¡empieza por aquí!) | `http://192.168.x.x:5173/diagnostico/` |
| El **juego** con el servidor real (gasta intentos reales) | `http://192.168.x.x:5173/` |
| El juego **de práctica** (intentos ilimitados, sin servidor ni premios reales) + contador de FPS | `http://192.168.x.x:5173/?debug=1&api=falsa` |

---

## 1. Plan mínimo (tu iPhone XR, ≈ 15 min)

Repite estos pasos primero en **Safari**, y después **dentro de Instagram** (y si puedes, dentro de Facebook/Messenger):

1. **Diagnóstico.** Abre `/diagnostico/`. Espera unos segundos. Arriba debe decir **«✔ Todo lo que necesita el juego está disponible aquí»**.
   - Toca **«Probar rendimiento»** y espera 4 segundos: anota los **FPS**.
   - Mira la línea **«Zonas seguras»** y la de **«Hora del celular vs servidor»**.
   - Toca **«Copiar resultado»** y pégalo en una nota (o hazle una captura).
2. **Prueba de gestos** (en esa misma página): desliza izquierda, derecha y arriba, y toca. Prueba también **empezando muy pegado al borde** izquierdo y derecho de la pantalla. *Anota si el navegador te saca de la página o «vuelve atrás» al deslizar desde un borde* (en Instagram/Facebook de iPhone puede pasar).
3. **Una partida de práctica** en `/?debug=1&api=falsa` (arriba a la izquierda sale el contador de FPS):
   - ¿Los deslizamientos responden bien? ¿La pantalla **no se mueve, no hace zoom** ni se recarga al deslizar hacia arriba/abajo?
   - ¿Se ve todo (vidas, tiempo, frutas) y **no queda tapado** por la muesca (notch) ni por la barra de la app?
   - Cambia de app a mitad de partida y vuelve: debe quedar en **pausa**.
4. **Ganar y reclamar** (en la práctica puedes ganar fácil: abre el panel *Debug* y activa «invencible»): en el formulario, ¿el **teclado numérico** sale al tocar el celular? ¿se sigue viendo el botón *Reclamar mi premio* con el teclado abierto? Pulsa **Ver condiciones** y **Ver política de datos**: ¿abren y cierran bien?
5. **El ticket:** ¿se lee bien el código, el «Vale hasta…» y la cuenta regresiva? Toca **Copiar código** (¿dice «¡Copiado!»?). Cierra y vuelve a abrir el juego: ¿se acuerda de tu personaje?

**Qué mandarme:** el resultado copiado del diagnóstico de cada app (Safari, Instagram…), los FPS, y una línea por cada cosa rara (ej. «en Instagram, al deslizar desde el borde izquierdo me devolvió a los mensajes»). Una captura vale más que mil palabras.

---

## 2. Matriz completa (marca cada casilla)

Hazlo en los celulares que tengas. Cada fila = repetir los pasos 1 a 5 de arriba.

| Celular / sistema | Safari | Chrome | Instagram | Facebook | Messenger | Notas |
|---|---|---|---|---|---|---|
| iPhone XR (iOS) | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Otro iPhone (si hay) | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Android gama media | — | ☐ | ☐ | ☐ | ☐ | |
| **Android gama baja** | — | ☐ | ☐ | ☐ | — | Ver sección 3 |
| Samsung (Samsung Internet) | — | ☐ (Samsung Internet) | ☐ | ☐ | — | |

**Qué se espera:** iOS 15 o más y Chrome/WebView 90 o más. En un celular más viejo el juego mostrará «Este navegador no puede mostrar el juego» (es lo normal: necesita WebGL 2).

**Cosas específicas de las apps (anótalas aparte):**
- El botón *Atrás* / la flecha del navegador interno: ¿te saca del juego sin avisar? (con 1 sola página en el historial es normal que cierre la ventana).
- Menú «…» de la app → **Abrir en Safari / Chrome**: ¿el juego abre igual?
- Instagram a veces **recorta la parte de abajo** de la pantalla con su propia barra: ¿se tapa algún botón?
- Girar el celular de lado: el juego es **vertical**; ¿se ve razonable o queda raro? (no es crítico).

---

## 3. Gama baja (el Android más viejo y sencillo que consigas)

1. Pide prestado uno (idealmente con **2 GB de RAM o menos**, Android 9–11). Anota **modelo, Android y RAM** (Ajustes → Acerca del teléfono).
2. Abre `/diagnostico/` → **Probar rendimiento** → anota los FPS. Interpretación:
   - **≥ 55 FPS:** fluido. · **40–55:** aceptable (el juego baja la resolución solo). · **< 40:** lento. · **≈ 30 fijos:** probablemente el «ahorro de batería» limitando la pantalla; apágalo y repite.
3. Juega una partida en `/?debug=1&api=falsa` y mira el contador de arriba a la izquierda: los **FPS** y la **«calidad N»** (0 = completa; sube a 1, 2, 3, 4 si el celular no aguanta; si llega a 4 y aun así va lento, avísame).
4. En celulares con **≤ 2 GB** el juego arranca directo con menos resolución y sin suavizado de bordes (es un ajuste de la Etapa 6).

**Si no consigues un Android viejo:** simula uno en el computador con Chrome → abre el juego → `F12` → pestaña **Rendimiento** (*Performance*) → engranaje de ajustes → **CPU: 6× slowdown** → recarga `/?debug=1&api=falsa` y mira los FPS. No es lo mismo que un celular real (la GPU no se frena), pero sirve de aviso.

---

## 4. Después de publicar (Etapa 7)

Repetir lo esencial (plan mínimo) **con el enlace real `https://…`**, entrando por el **QR** y por un **anuncio/enlace de Instagram y Facebook**: es la prueba que de verdad importa.

---

## 5. Formato para enviarme los resultados

```
Celular: (modelo)  ·  Sistema: (iOS 17 / Android 12)  ·  RAM: (si la sabes)
App: (Safari / Chrome / Instagram / Facebook…)
Diagnóstico: (pegar el resultado copiado)
FPS jugando: (número)  ·  Calidad que marcó: (0–4)
Gestos: (bien / pasó algo raro: …)
Formulario y teclado: (bien / …)
Otras cosas raras: (…)
```
